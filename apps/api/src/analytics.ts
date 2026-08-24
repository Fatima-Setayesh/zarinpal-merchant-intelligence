import {
  buildPaymentSessions,
  DomainValidationError,
  parsePaymentAttempts,
  parseRfc3339Timestamp,
  type AnalysisProvenance,
  type ChartSeries,
  type DateRange,
  type Evidence,
  type FilterDimension,
  type FilterState,
  type Insight,
  type MerchantCategory,
  type MerchantSummary,
  type Metric,
  type PaymentAttempt,
  type PaymentSession,
  type Segment,
} from "./domain.js";

export const SUPPORTED_FILTER_DIMENSIONS = [
  "status",
  "category",
  "terminal",
  "issuer",
  "amount_min",
  "amount_max",
  "attempt_count_min",
  "attempt_count_max",
] as const;

type SupportedFilterDimension = (typeof SUPPORTED_FILTER_DIMENSIONS)[number];

const SUPPORTED_FILTER_DIMENSION_SET: ReadonlySet<string> = new Set(
  SUPPORTED_FILTER_DIMENSIONS,
);

const ADJUSTED_FEE_DISCLOSURE = {
  code: "CONFIDENTIALLY_TRANSFORMED_ADJUSTED_FEE",
  message:
    "Adjusted fee is confidentially transformed and is not Zarinpal's real fee. Do not use it for absolute real-pricing claims; relative comparisons require separate analytical justification.",
};

const DESCRIPTIVE_LIMITATION =
  "This analysis is descriptive and observational. It identifies associations in the selected records and does not establish causation.";

const SESSION_LIMITATION =
  "Payment sessions are grouped by sessionId; repeated payment attempts remain attempts, while source NoAttempt rows, when present, remain zero-attempt sessions.";

const filterSemanticsLimitation = (filters: FilterState): string =>
  (filters.analysisUnit ?? "payment_session") === "payment_session"
    ? "Payment-session filters preserve every attempt in a selected session. Date scope uses the session observation time (the first observed attempt, or source creation time for a NoAttempt session); status uses its derived outcome; terminal and issuer match source session fields or any attempt in the session."
    : "Payment-attempt filters apply to individual attempts. Attempt-count boundaries still use the full session's attempt count.";

const CONFOUNDING_LIMITATION =
  "Category, amount, attempt distribution, time, terminal, issuer, and merchant characteristics may confound comparisons; no controlled or causal comparison is claimed.";

const unique = (values: readonly string[]): string[] => [...new Set(values)];

const round = (value: number, digits = 4): number => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const percentage = (numerator: number, denominator: number): number | null =>
  denominator === 0 ? null : round((numerator / denominator) * 100);

const robustMedian = (values: readonly number[]): number => {
  if (values.length === 0) {
    throw new DomainValidationError("Cannot calculate median", [
      { path: "values", message: "must contain at least one value" },
    ]);
  }
  const ordered = [...values].sort((left, right) => left - right);
  const midpoint = Math.floor(ordered.length / 2);
  if (ordered.length % 2 === 1) {
    return ordered[midpoint] ?? 0;
  }
  const left = ordered[midpoint - 1];
  const right = ordered[midpoint];
  return left === undefined || right === undefined ? 0 : (left + right) / 2;
};

const safeIntegerSum = (values: Iterable<number>, path: string): number => {
  let total = 0;
  for (const value of values) {
    const next = total + value;
    if (!Number.isSafeInteger(next)) {
      throw new DomainValidationError("Unsafe analytical aggregate", [
        {
          path,
          message: "exceeds JavaScript's safe integer range",
        },
      ]);
    }
    total = next;
  }
  return total;
};

const displayPercentage = (value: number | null): string =>
  value === null ? "unavailable" : `${round(value, 1).toFixed(1)}%`;

const sanitizeIdPart = (value: string): string =>
  encodeURIComponent(value).replaceAll("%", "_");

const validateTimezone = (timezone: string): void => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: "dateRange.timezone",
        message: "must be a supported IANA timezone",
      },
    ]);
  }
};

const parseBoundary = (value: string, path: string): number => {
  const parsed = parseRfc3339Timestamp(value);
  if (parsed === null) {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path,
        message:
          "must be an RFC3339 date-time with Z or an explicit UTC offset",
      },
    ]);
  }
  return parsed;
};

const readNumericDimension = (
  dimension: FilterDimension,
  integer: boolean,
): number => {
  if (dimension.operator !== "include") {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: `dimensions.${dimension.key}.operator`,
        message: "numeric boundary dimensions only support include",
      },
    ]);
  }
  if (dimension.values.length !== 1) {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: `dimensions.${dimension.key}.values`,
        message: "must contain exactly one numeric boundary",
      },
    ]);
  }
  const raw = dimension.values[0];
  const parsed = raw === undefined ? Number.NaN : Number(raw);
  if (!Number.isFinite(parsed) || (integer && !Number.isInteger(parsed))) {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: `dimensions.${dimension.key}.values[0]`,
        message: integer
          ? "must be a non-negative integer"
          : "must be a number",
      },
    ]);
  }
  if (parsed < 0) {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: `dimensions.${dimension.key}.values[0]`,
        message: "must be non-negative",
      },
    ]);
  }
  return parsed;
};

const validateFilters = (filters: FilterState): void => {
  if (
    filters.analysisUnit !== undefined &&
    filters.analysisUnit !== "payment_session" &&
    filters.analysisUnit !== "payment_attempt"
  ) {
    throw new DomainValidationError("Invalid analytical filters", [
      {
        path: "analysisUnit",
        message: "must be payment_session or payment_attempt",
      },
    ]);
  }
  if (filters.dateRange !== undefined) {
    const from = parseBoundary(filters.dateRange.from, "dateRange.from");
    const to = parseBoundary(filters.dateRange.to, "dateRange.to");
    if (from > to) {
      throw new DomainValidationError("Invalid analytical filters", [
        { path: "dateRange.from", message: "must not be after dateRange.to" },
      ]);
    }
    validateTimezone(filters.dateRange.timezone);
  }
  if (filters.segmentIds !== undefined && filters.segmentIds.length > 0) {
    throw new DomainValidationError("Unsupported analytical filter", [
      {
        path: "segmentIds",
        message: "segment membership cannot be applied to raw payment attempts",
      },
    ]);
  }
  if (
    filters.merchantIds?.some(
      (merchantId) =>
        typeof merchantId !== "string" || merchantId.trim().length === 0,
    )
  ) {
    throw new DomainValidationError("Invalid analytical filters", [
      { path: "merchantIds", message: "must contain only non-empty strings" },
    ]);
  }

  for (const dimension of filters.dimensions ?? []) {
    if (!SUPPORTED_FILTER_DIMENSION_SET.has(dimension.key)) {
      throw new DomainValidationError("Unsupported analytical filter", [
        {
          path: `dimensions.${dimension.key}`,
          message: `supported keys are ${SUPPORTED_FILTER_DIMENSIONS.join(", ")}`,
        },
      ]);
    }
    if (dimension.operator !== "include" && dimension.operator !== "exclude") {
      throw new DomainValidationError("Invalid analytical filters", [
        {
          path: `dimensions.${dimension.key}.operator`,
          message: "must be include or exclude",
        },
      ]);
    }
    if (dimension.values.length === 0) {
      throw new DomainValidationError("Invalid analytical filters", [
        {
          path: `dimensions.${dimension.key}.values`,
          message: "must contain at least one value",
        },
      ]);
    }
    if (
      dimension.values.some(
        (value) => typeof value !== "string" || value.trim().length === 0,
      )
    ) {
      throw new DomainValidationError("Invalid analytical filters", [
        {
          path: `dimensions.${dimension.key}.values`,
          message: "must contain only non-empty strings",
        },
      ]);
    }
    if (
      dimension.key === "amount_min" ||
      dimension.key === "amount_max" ||
      dimension.key === "attempt_count_min" ||
      dimension.key === "attempt_count_max"
    ) {
      readNumericDimension(
        dimension,
        dimension.key === "attempt_count_min" ||
          dimension.key === "attempt_count_max",
      );
    }
    if (dimension.key === "status") {
      const allowed = new Set(["succeeded", "failed", "pending"]);
      if (dimension.values.some((value) => !allowed.has(value))) {
        throw new DomainValidationError("Invalid analytical filters", [
          {
            path: "dimensions.status.values",
            message: "must contain only succeeded, failed, or pending",
          },
        ]);
      }
    }
  }
};

const matchesCategoricalDimension = (
  attempt: PaymentAttempt,
  dimension: FilterDimension,
): boolean => {
  const values = new Set(dimension.values);
  let candidate: string | undefined;
  switch (dimension.key as SupportedFilterDimension) {
    case "status":
      candidate = attempt.status;
      break;
    case "category":
      candidate = attempt.merchantCategory?.id;
      break;
    case "terminal":
      candidate = attempt.terminalId;
      break;
    case "issuer":
      candidate = attempt.issuer;
      break;
    default:
      return true;
  }
  const matches = candidate !== undefined && values.has(candidate);
  return dimension.operator === "include" ? matches : !matches;
};

const matchesSessionCategoricalDimension = (
  session: PaymentSession,
  dimension: FilterDimension,
): boolean => {
  const values = new Set(dimension.values);
  let candidates: string[];
  switch (dimension.key as SupportedFilterDimension) {
    case "status":
      candidates = [session.outcome];
      break;
    case "category":
      candidates = session.attempts.flatMap((attempt) =>
        attempt.merchantCategory === undefined
          ? []
          : [attempt.merchantCategory.id],
      );
      if (session.merchantCategory !== undefined) {
        candidates.push(session.merchantCategory.id);
      }
      break;
    case "terminal":
      candidates = session.attempts.flatMap((attempt) =>
        attempt.terminalId === undefined ? [] : [attempt.terminalId],
      );
      if (session.terminalId !== undefined) {
        candidates.push(session.terminalId);
      }
      break;
    case "issuer":
      candidates = session.attempts.flatMap((attempt) =>
        attempt.issuer === undefined ? [] : [attempt.issuer],
      );
      if (session.issuer !== undefined) {
        candidates.push(session.issuer);
      }
      break;
    default:
      return true;
  }
  const matches = candidates.some((candidate) => values.has(candidate));
  return dimension.operator === "include" ? matches : !matches;
};

const filterPaymentSessions = (
  sessions: readonly PaymentSession[],
  filters: FilterState,
): PaymentSession[] => {
  validateFilters(filters);
  const merchantIds =
    filters.merchantIds === undefined
      ? undefined
      : new Set(filters.merchantIds.map((merchantId) => merchantId.trim()));
  const from =
    filters.dateRange === undefined
      ? undefined
      : Date.parse(filters.dateRange.from);
  const to =
    filters.dateRange === undefined
      ? undefined
      : Date.parse(filters.dateRange.to);
  const categoricalDimensions = (filters.dimensions ?? []).filter(
    (dimension) =>
      dimension.key === "status" ||
      dimension.key === "category" ||
      dimension.key === "terminal" ||
      dimension.key === "issuer",
  );
  const amountMinimums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "amount_min")
    .map((dimension) => readNumericDimension(dimension, false));
  const amountMaximums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "amount_max")
    .map((dimension) => readNumericDimension(dimension, false));
  const attemptCountMinimums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "attempt_count_min")
    .map((dimension) => readNumericDimension(dimension, true));
  const attemptCountMaximums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "attempt_count_max")
    .map((dimension) => readNumericDimension(dimension, true));

  return sessions.filter((session) => {
    const observedAt = Date.parse(session.observedAt);
    return (
      (merchantIds === undefined || merchantIds.has(session.merchantId)) &&
      (from === undefined || observedAt >= from) &&
      (to === undefined || observedAt <= to) &&
      categoricalDimensions.every((dimension) =>
        matchesSessionCategoricalDimension(session, dimension),
      ) &&
      amountMinimums.every(
        (minimum) => session.representativeAmount >= minimum,
      ) &&
      amountMaximums.every(
        (maximum) => session.representativeAmount <= maximum,
      ) &&
      attemptCountMinimums.every(
        (minimum) => session.attempts.length >= minimum,
      ) &&
      attemptCountMaximums.every(
        (maximum) => session.attempts.length <= maximum,
      )
    );
  });
};

export const applyPaymentAttemptFilters = (
  attempts: readonly PaymentAttempt[],
  filters: FilterState = {},
): PaymentAttempt[] => {
  validateFilters(filters);
  const validatedAttempts = parsePaymentAttempts(attempts);
  const merchantIds =
    filters.merchantIds === undefined
      ? undefined
      : new Set(filters.merchantIds.map((merchantId) => merchantId.trim()));
  const from =
    filters.dateRange === undefined
      ? undefined
      : Date.parse(filters.dateRange.from);
  const to =
    filters.dateRange === undefined
      ? undefined
      : Date.parse(filters.dateRange.to);

  const categoricalDimensions = (filters.dimensions ?? []).filter(
    (dimension) =>
      dimension.key === "status" ||
      dimension.key === "category" ||
      dimension.key === "terminal" ||
      dimension.key === "issuer",
  );
  const amountMinimums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "amount_min")
    .map((dimension) => readNumericDimension(dimension, false));
  const amountMaximums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "amount_max")
    .map((dimension) => readNumericDimension(dimension, false));
  const attemptCountMinimums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "attempt_count_min")
    .map((dimension) => readNumericDimension(dimension, true));
  const attemptCountMaximums = (filters.dimensions ?? [])
    .filter((dimension) => dimension.key === "attempt_count_max")
    .map((dimension) => readNumericDimension(dimension, true));

  const fullSessions = buildPaymentSessions(validatedAttempts);
  if ((filters.analysisUnit ?? "payment_session") === "payment_session") {
    const selectedSessionIds = new Set(
      filterPaymentSessions(fullSessions, filters).map(
        (session) => session.sessionId,
      ),
    );
    return validatedAttempts.filter((attempt) =>
      selectedSessionIds.has(attempt.sessionId),
    );
  }

  const attemptCountBySession = new Map(
    fullSessions.map((session) => [session.sessionId, session.attempts.length]),
  );
  return validatedAttempts.filter((attempt) => {
    const occurredAt = Date.parse(attempt.occurredAt);
    const attemptCount = attemptCountBySession.get(attempt.sessionId) ?? 0;
    return (
      (merchantIds === undefined || merchantIds.has(attempt.merchantId)) &&
      (from === undefined || occurredAt >= from) &&
      (to === undefined || occurredAt <= to) &&
      categoricalDimensions.every((dimension) =>
        matchesCategoricalDimension(attempt, dimension),
      ) &&
      amountMinimums.every((minimum) => attempt.amount >= minimum) &&
      amountMaximums.every((maximum) => attempt.amount <= maximum) &&
      attemptCountMinimums.every((minimum) => attemptCount >= minimum) &&
      attemptCountMaximums.every((maximum) => attemptCount <= maximum)
    );
  });
};

const scopeMerchant = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
): PaymentAttempt[] => {
  if (merchantId.trim().length === 0) {
    throw new DomainValidationError("Invalid merchant scope", [
      { path: "merchantId", message: "must be a non-empty string" },
    ]);
  }
  const filtered = applyPaymentAttemptFilters(attempts, filters);
  return filtered.filter((attempt) => attempt.merchantId === merchantId);
};

const scopeMerchantSessions = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  sourceSessions?: readonly PaymentSession[],
): PaymentSession[] => {
  if (merchantId.trim().length === 0) {
    throw new DomainValidationError("Invalid merchant scope", [
      { path: "merchantId", message: "must be a non-empty string" },
    ]);
  }
  return filterPaymentSessions(
    sourceSessions ?? buildPaymentSessions(attempts),
    filters,
  ).filter((session) => session.merchantId === merchantId);
};

const resolvePeriod = (
  attempts: readonly PaymentAttempt[],
  filters: FilterState,
  provenance: AnalysisProvenance,
  sessions: readonly PaymentSession[] = [],
): DateRange => {
  if (filters.dateRange !== undefined) {
    return { ...filters.dateRange };
  }
  if (attempts.length === 0 && sessions.length === 0) {
    throw new DomainValidationError("No records in analytical scope", [
      {
        path: "paymentAttempts",
        message: "cannot infer a reporting period from an empty record set",
      },
    ]);
  }
  let earliest = Number.POSITIVE_INFINITY;
  let latest = Number.NEGATIVE_INFINITY;
  for (const attempt of attempts) {
    const timestamp = Date.parse(attempt.occurredAt);
    earliest = Math.min(earliest, timestamp);
    latest = Math.max(latest, timestamp);
  }
  for (const session of sessions) {
    const timestamp = Date.parse(session.observedAt);
    earliest = Math.min(earliest, timestamp);
    latest = Math.max(latest, timestamp);
  }
  const timezone = provenance.timezone ?? "UTC";
  validateTimezone(timezone);
  return {
    from: new Date(earliest).toISOString(),
    to: new Date(latest).toISOString(),
    timezone,
  };
};

const traceFilters = (filters: FilterState): FilterState => ({
  ...filters,
  ...(filters.merchantIds === undefined
    ? {}
    : { merchantIds: [...filters.merchantIds] }),
  ...(filters.dateRange !== undefined
    ? { dateRange: { ...filters.dateRange } }
    : {}),
  ...(filters.dimensions !== undefined
    ? {
        dimensions: filters.dimensions.map((dimension) => ({
          ...dimension,
          values: [...dimension.values],
        })),
      }
    : {}),
});

const evidenceFilters = (
  filters: FilterState,
  merchantId: string,
): FilterState => ({
  ...traceFilters(filters),
  merchantIds: [merchantId],
});

const sourceReference = (provenance: AnalysisProvenance): string =>
  provenance.sourceReference ?? `dataset:${provenance.datasetId}`;

const metric = (
  fields: Omit<Metric, "period" | "limitations"> & {
    limitations?: string[];
  },
  period: DateRange,
): Metric => ({
  ...fields,
  period,
  limitations: fields.limitations ?? [],
});

const metricSourceIds = (metricId: string): string[] => {
  const normalized = metricId.slice(metricId.lastIndexOf(":") + 1);
  if (
    normalized === "successful-payment-attempt-rate" ||
    normalized === "failed-payment-attempt-rate"
  ) {
    return [normalized.replace("-rate", "-count"), "payment-attempt-count"];
  }
  if (normalized.includes("payment-attempt-count")) {
    return ["payment-attempt-records"];
  }
  if (normalized === "successful-session-rate") {
    return ["successful-session-count", "payment-session-count"];
  }
  if (normalized === "failed-session-rate") {
    return ["failed-session-count", "payment-session-count"];
  }
  if (normalized === "retry-session-rate") {
    return ["retry-session-count", "payment-session-count"];
  }
  if (normalized === "observed-retry-recovery-rate") {
    return [
      "observed-recovered-retry-session-count",
      "initially-unsuccessful-retry-session-count",
    ];
  }
  if (normalized === "average-attempts-per-session") {
    return ["payment-attempt-count", "payment-session-count"];
  }
  if (normalized.startsWith("relative-adjusted-fee-to-amount-ratio-")) {
    return [
      "transformed-adjusted-fee-sum",
      normalized.replace(
        "relative-adjusted-fee-to-amount-ratio-",
        "successful-session-amount-",
      ),
    ];
  }
  if (normalized.startsWith("total-payment-volume-")) {
    return ["payment-session-count", "payment-session-representative-amount"];
  }
  if (normalized.startsWith("successful-session-amount-")) {
    return [
      "successful-session-count",
      "payment-session-representative-amount",
    ];
  }
  if (
    normalized.startsWith("failed-session-amount-") ||
    normalized.startsWith("failed-session-requested-amount-")
  ) {
    return ["failed-session-count", "payment-session-representative-amount"];
  }
  if (normalized.includes("retry-session-requested-amount-")) {
    return [
      "initially-unsuccessful-retry-session-count",
      "payment-session-representative-amount",
    ];
  }
  if (normalized.includes("session-count")) {
    return ["payment-session-records"];
  }
  return ["validated-payment-session-records"];
};

const traceDenominator = (
  item: Metric,
):
  | NonNullable<NonNullable<Metric["traceability"]>["sample"]["denominator"]>
  | undefined => {
  if (item.metricId.includes("relative-adjusted-fee-to-amount-ratio-")) {
    return {
      unit: "corresponding_payment_amount",
      description:
        "Sum of corresponding successful payment amounts for records with a numeric transformed adjusted_fee value.",
    };
  }
  if (item.metricId.endsWith("-rate")) {
    return {
      value: item.sampleSize ?? 0,
      unit: item.analysisUnit,
      description: `Eligible ${item.analysisUnit} records in the selected scope.`,
    };
  }
  if (item.metricId.endsWith("average-attempts-per-session")) {
    return {
      value: item.sampleSize ?? 0,
      unit: "payment_session",
      description: "All payment sessions in the selected scope.",
    };
  }
  return undefined;
};

const traceMetric = (
  item: Metric,
  filters: FilterState,
  provenance: AnalysisProvenance,
  overrides: {
    formulaLabel?: string;
    formulaExplanation?: string;
    missingDataHandling?: string;
    assumptions?: string[];
    denominator?: NonNullable<
      NonNullable<Metric["traceability"]>["sample"]["denominator"]
    >;
    referencePopulation?: NonNullable<
      NonNullable<Metric["traceability"]>["referencePopulation"]
    >;
  } = {},
): Metric => {
  const isAdjustedFee = item.metricId.includes("adjusted-fee");
  const assumptions =
    item.analysisUnit === "payment_session"
      ? [
          "Sessions are grouped by source sessionId; repeated attempts are not counted as separate sessions.",
          "Source NoAttempt rows remain zero-attempt failed sessions, and source Reversed statuses are normalized as failed while original statuses remain preserved.",
        ]
      : [
          "Each validated payment-attempt record is counted once; source NoAttempt rows do not become fabricated attempts.",
          "Source Reversed statuses are normalized as failed while original statuses remain preserved.",
        ];
  const denominator = overrides.denominator ?? traceDenominator(item);
  const referencePopulation =
    overrides.referencePopulation ?? item.comparison?.population;
  return {
    ...item,
    traceability: {
      analysisUnit: item.analysisUnit,
      formula: {
        label: overrides.formulaLabel ?? item.label,
        explanation: overrides.formulaExplanation ?? item.definition,
        ...(provenance.methodologyReference === undefined
          ? {}
          : { methodologyReference: provenance.methodologyReference }),
      },
      sourceMetricIds: metricSourceIds(item.metricId),
      filters: traceFilters(filters),
      dateRange: { ...item.period },
      sample: {
        size: item.sampleSize ?? 0,
        analysisUnit: item.analysisUnit,
        ...(denominator === undefined ? {} : { denominator }),
      },
      ...(referencePopulation === undefined ? {} : { referencePopulation }),
      missingDataHandling:
        overrides.missingDataHandling ??
        (isAdjustedFee
          ? "Records without a numeric transformed adjusted_fee or corresponding successful amount are excluded from both numerator and denominator; no value is imputed."
          : "Required source fields are runtime-validated; malformed required values are rejected and no missing value is silently imputed."),
      assumptions: unique([
        ...assumptions,
        ...(isAdjustedFee ? [ADJUSTED_FEE_DISCLOSURE.message] : []),
        ...(overrides.assumptions ?? []),
      ]),
      limitations: [...item.limitations],
      provenance: {
        ...provenance,
        sourceReference: sourceReference(provenance),
      },
    },
  };
};

const sessionAmountInconsistencyCount = (
  sessions: readonly PaymentSession[],
): number =>
  sessions.filter((session) => {
    const amounts = new Set(session.attempts.map((attempt) => attempt.amount));
    return amounts.size > 1;
  }).length;

const hasAmbiguousInitialAttemptOrder = (session: PaymentSession): boolean =>
  session.attempts.length > 1 &&
  Date.parse(session.attempts[0]?.occurredAt ?? "") ===
    Date.parse(session.attempts[1]?.occurredAt ?? "");

const isInitiallyUnsuccessfulRetry = (session: PaymentSession): boolean =>
  session.attempts.length > 1 &&
  !hasAmbiguousInitialAttemptOrder(session) &&
  session.attempts[0]?.status !== "succeeded";

const summaryLimitations = (
  attempts: readonly PaymentAttempt[],
  sessions: readonly PaymentSession[],
): string[] => {
  const limitations = [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION];
  const missingAdjustedFee = attempts.filter(
    (attempt) =>
      attempt.adjustedFee === undefined || attempt.adjustedFee === null,
  ).length;
  const hasAdjustedFeeField = attempts.some(
    (attempt) => attempt.adjustedFee !== undefined,
  );
  if (hasAdjustedFeeField) {
    limitations.push(ADJUSTED_FEE_DISCLOSURE.message);
    if (missingAdjustedFee > 0) {
      limitations.push(
        `${missingAdjustedFee} of ${attempts.length} payment attempts have no adjusted-fee value; adjusted-fee metrics use available values only.`,
      );
    }
  } else if (attempts.length > 0) {
    limitations.push(
      "No adjusted_fee values are available in the selected records; no adjusted-fee metric is reported.",
    );
  }
  const inconsistent = sessionAmountInconsistencyCount(sessions);
  if (inconsistent > 0) {
    limitations.push(
      `${inconsistent} payment sessions contain differing attempt amounts; session-level amount uses the successful attempt, or the first attempt when no attempt succeeded.`,
    );
  }
  const pending = sessions.filter(
    (session) => session.outcome === "pending",
  ).length;
  if (pending > 0) {
    limitations.push(
      `${pending} payment sessions remain pending and are included in rate denominators but are not classified as failed.`,
    );
  }
  const ambiguousInitialOrder = sessions.filter(
    hasAmbiguousInitialAttemptOrder,
  ).length;
  if (ambiguousInitialOrder > 0) {
    limitations.push(
      `${ambiguousInitialOrder} payment sessions have tied earliest attempt timestamps and are excluded from order-dependent retry-recovery metrics because no source sequence is available.`,
    );
  }
  return limitations;
};

const merchantIdentity = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  sessions: readonly PaymentSession[] = [],
): {
  displayName: string;
  category?: MerchantCategory;
  limitations: string[];
} => {
  const names = unique(
    attempts.flatMap((attempt) =>
      attempt.merchantDisplayName === undefined
        ? []
        : [attempt.merchantDisplayName],
    ),
  );
  const categoryMap = new Map<string, MerchantCategory>();
  for (const attempt of attempts) {
    if (attempt.merchantCategory !== undefined) {
      categoryMap.set(attempt.merchantCategory.id, attempt.merchantCategory);
    }
  }
  for (const session of sessions) {
    if (session.merchantCategory !== undefined) {
      categoryMap.set(session.merchantCategory.id, session.merchantCategory);
    }
  }
  const categories = [...categoryMap.values()];
  const limitations: string[] = [];
  if (names.length > 1) {
    limitations.push(
      "Multiple display names occur in the selected records; the first source-backed name is shown.",
    );
  }
  if (categories.length > 1) {
    limitations.push(
      "Multiple merchant categories occur in the selected records; no single category is shown.",
    );
  }
  return {
    displayName: names[0] ?? merchantId,
    ...(categories.length === 1 ? { category: categories[0] } : {}),
    limitations,
  };
};

const successfulAttempt = (
  session: PaymentSession,
): PaymentAttempt | undefined =>
  session.attempts.find((attempt) => attempt.status === "succeeded");

const relativeAdjustedFeeRatio = (
  sessions: readonly PaymentSession[],
  path: string,
): { value: number | null; sampleSize: number } => {
  const pairs = sessions.flatMap((session) => {
    const attempt = successfulAttempt(session);
    return attempt !== undefined && typeof attempt.adjustedFee === "number"
      ? [{ amount: attempt.amount, adjustedFee: attempt.adjustedFee }]
      : [];
  });
  return {
    value: percentage(
      safeIntegerSum(
        pairs.map((pair) => pair.adjustedFee),
        `${path}.adjustedFee`,
      ),
      safeIntegerSum(
        pairs.map((pair) => pair.amount),
        `${path}.amount`,
      ),
    ),
    sampleSize: pairs.length,
  };
};

interface MerchantPeerObservation {
  merchantId: string;
  categoryIds: Set<string>;
  sessionCount: number;
  successfulSessionCount: number;
  failedSessionCount: number;
  retrySessionCount: number;
  volumeByCurrency: Map<string, number>;
  adjustedFeeByCurrency: Map<string, number>;
  adjustedFeeAmountByCurrency: Map<string, number>;
}

interface PeerBenchmark {
  categoryId: string;
  peerCount: number;
  sessionCount: number;
  successRate: number;
  failureRate: number;
  retryRate: number;
  volumeByCurrency: Map<string, { value: number; peerCount: number }>;
  adjustedFeeRatioByCurrency: Map<string, { value: number; peerCount: number }>;
}

const addSafeMapValue = (
  values: Map<string, number>,
  key: string,
  value: number,
  path: string,
): void => {
  values.set(key, safeIntegerSum([values.get(key) ?? 0, value], path));
};

const buildMerchantPeerObservations = (
  sessions: readonly PaymentSession[],
): MerchantPeerObservation[] => {
  const observations = new Map<string, MerchantPeerObservation>();
  for (const session of sessions) {
    let observation = observations.get(session.merchantId);
    if (observation === undefined) {
      observation = {
        merchantId: session.merchantId,
        categoryIds: new Set<string>(),
        sessionCount: 0,
        successfulSessionCount: 0,
        failedSessionCount: 0,
        retrySessionCount: 0,
        volumeByCurrency: new Map<string, number>(),
        adjustedFeeByCurrency: new Map<string, number>(),
        adjustedFeeAmountByCurrency: new Map<string, number>(),
      };
      observations.set(session.merchantId, observation);
    }
    observation.sessionCount += 1;
    observation.successfulSessionCount += Number(
      session.outcome === "succeeded",
    );
    observation.failedSessionCount += Number(session.outcome === "failed");
    observation.retrySessionCount += Number(session.attempts.length > 1);
    for (const categoryId of unique([
      ...(session.merchantCategory === undefined
        ? []
        : [session.merchantCategory.id]),
      ...session.attempts.flatMap((attempt) =>
        attempt.merchantCategory === undefined
          ? []
          : [attempt.merchantCategory.id],
      ),
    ])) {
      observation.categoryIds.add(categoryId);
    }
    addSafeMapValue(
      observation.volumeByCurrency,
      session.currency,
      session.representativeAmount,
      `peers.${session.merchantId}.volume.${session.currency}`,
    );
    const successful = successfulAttempt(session);
    if (
      successful !== undefined &&
      typeof successful.adjustedFee === "number"
    ) {
      addSafeMapValue(
        observation.adjustedFeeByCurrency,
        session.currency,
        successful.adjustedFee,
        `peers.${session.merchantId}.adjustedFee.${session.currency}`,
      );
      addSafeMapValue(
        observation.adjustedFeeAmountByCurrency,
        session.currency,
        successful.amount,
        `peers.${session.merchantId}.adjustedFeeAmount.${session.currency}`,
      );
    }
  }
  return [...observations.values()];
};

const buildPeerBenchmark = (
  attempts: readonly PaymentAttempt[],
  sourceSessions: readonly PaymentSession[] | undefined,
  merchantId: string,
  filters: FilterState,
): PeerBenchmark | undefined => {
  const populationFilters: FilterState = { ...filters };
  delete populationFilters.merchantIds;
  const populationSessions = filterPaymentSessions(
    sourceSessions ?? buildPaymentSessions(attempts),
    populationFilters,
  );
  const observations = buildMerchantPeerObservations(populationSessions);
  const target = observations.find(
    (observation) => observation.merchantId === merchantId,
  );
  if (target === undefined || target.categoryIds.size !== 1) {
    return undefined;
  }
  const categoryId = [...target.categoryIds][0];
  if (categoryId === undefined) {
    return undefined;
  }
  const peers = observations.filter(
    (observation) =>
      observation.merchantId !== merchantId &&
      observation.categoryIds.size === 1 &&
      observation.categoryIds.has(categoryId),
  );
  if (peers.length < 2) {
    return undefined;
  }
  const medianRate = (
    numerator: (observation: MerchantPeerObservation) => number,
  ): number =>
    round(
      robustMedian(
        peers.map(
          (observation) =>
            percentage(numerator(observation), observation.sessionCount) ?? 0,
        ),
      ),
    );
  const volumeByCurrency = new Map<
    string,
    { value: number; peerCount: number }
  >();
  const adjustedFeeRatioByCurrency = new Map<
    string,
    { value: number; peerCount: number }
  >();
  for (const currency of unique(
    peers.flatMap((peer) => [...peer.volumeByCurrency.keys()]),
  ).sort()) {
    const volumes = peers.flatMap((peer) => {
      const value = peer.volumeByCurrency.get(currency);
      return value === undefined ? [] : [value];
    });
    volumeByCurrency.set(currency, {
      value: robustMedian(volumes),
      peerCount: volumes.length,
    });
    const feeRatios = peers.flatMap((peer) => {
      const adjustedFee = peer.adjustedFeeByCurrency.get(currency);
      const amount = peer.adjustedFeeAmountByCurrency.get(currency);
      const value =
        adjustedFee === undefined || amount === undefined
          ? null
          : percentage(adjustedFee, amount);
      return value === null ? [] : [value];
    });
    if (feeRatios.length >= 2) {
      adjustedFeeRatioByCurrency.set(currency, {
        value: round(robustMedian(feeRatios)),
        peerCount: feeRatios.length,
      });
    }
  }
  return {
    categoryId,
    peerCount: peers.length,
    sessionCount: robustMedian(peers.map((peer) => peer.sessionCount)),
    successRate: medianRate((peer) => peer.successfulSessionCount),
    failureRate: medianRate((peer) => peer.failedSessionCount),
    retryRate: medianRate((peer) => peer.retrySessionCount),
    volumeByCurrency,
    adjustedFeeRatioByCurrency,
  };
};

const peerComparison = (
  value: number | null,
  referenceValue: number,
  referenceLabel: string,
  peerBenchmark: PeerBenchmark,
  peerCount = peerBenchmark.peerCount,
): NonNullable<Metric["comparison"]> => ({
  referenceLabel,
  referenceValue,
  delta: value === null ? null : round(value - referenceValue),
  population: {
    populationId: `category:${peerBenchmark.categoryId}:peers`,
    label: referenceLabel,
    sampleSize: peerCount,
    analysisUnit: "merchant",
    method:
      "Equal-merchant median among other eligible same-category merchants; the target merchant is excluded.",
  },
});

interface RelativeFeeDeviation {
  currency: string;
  value: number;
  sampleSize: number;
  peerValue: number;
  peerCount: number;
  delta: number;
}

const relativeFeeDeviations = (
  sessions: readonly PaymentSession[],
  peerBenchmark: PeerBenchmark | undefined,
): RelativeFeeDeviation[] => {
  if (peerBenchmark === undefined) {
    return [];
  }
  const deviations: RelativeFeeDeviation[] = [];
  for (const [
    currency,
    peerRatio,
  ] of peerBenchmark.adjustedFeeRatioByCurrency) {
    const target = relativeAdjustedFeeRatio(
      sessions.filter((session) => session.currency === currency),
      `insights.relative-adjusted-fee-${currency}`,
    );
    if (target.value === null || target.sampleSize < 2) {
      continue;
    }
    const delta = round(target.value - peerRatio.value);
    if (Math.abs(delta) < 0.5) {
      continue;
    }
    deviations.push({
      currency,
      value: target.value,
      sampleSize: target.sampleSize,
      peerValue: peerRatio.value,
      peerCount: peerRatio.peerCount,
      delta,
    });
  }
  return deviations.sort(
    (left, right) =>
      Math.abs(right.delta) - Math.abs(left.delta) ||
      left.currency.localeCompare(right.currency),
  );
};

const countAvailableInsights = (
  sessions: readonly PaymentSession[],
  peerBenchmark?: PeerBenchmark,
): number => {
  const failed = sessions.some((session) => session.outcome === "failed");
  const initiallyUnsuccessful = sessions.some(isInitiallyUnsuccessfulRetry);
  const feeDeviation =
    relativeFeeDeviations(sessions, peerBenchmark).length > 0;
  return Number(failed) + Number(initiallyUnsuccessful) + Number(feeDeviation);
};

export const buildMerchantSummary = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
  sourceSessions?: readonly PaymentSession[],
): MerchantSummary => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const sessions = scopeMerchantSessions(
    attempts,
    merchantId,
    filters,
    sourceSessions,
  );
  const period = resolvePeriod(scoped, filters, provenance, sessions);
  const succeededSessionCount = sessions.filter(
    (session) => session.outcome === "succeeded",
  ).length;
  const failedSessionCount = sessions.filter(
    (session) => session.outcome === "failed",
  ).length;
  const retrySessions = sessions.filter(
    (session) => session.attempts.length > 1,
  );
  const initiallyUnsuccessfulRetrySessions = retrySessions.filter(
    isInitiallyUnsuccessfulRetry,
  );
  const recoveredRetrySessions = initiallyUnsuccessfulRetrySessions.filter(
    (session) => session.outcome === "succeeded",
  );
  const paymentAttemptCount = safeIntegerSum(
    sessions.map((session) => session.attempts.length),
    "headlineMetrics.payment-attempt-count",
  );
  const successfulSessionRate = percentage(
    succeededSessionCount,
    sessions.length,
  );
  const failedSessionRate = percentage(failedSessionCount, sessions.length);
  const retrySessionRate = percentage(retrySessions.length, sessions.length);
  const identity = merchantIdentity(scoped, merchantId, sessions);
  const peerBenchmark = buildPeerBenchmark(
    attempts,
    sourceSessions,
    merchantId,
    filters,
  );
  const peerLabel =
    peerBenchmark === undefined
      ? undefined
      : `Median of ${peerBenchmark.peerCount} same-category peer merchants (${peerBenchmark.categoryId})`;
  const limitations = [
    ...summaryLimitations(scoped, sessions),
    filterSemanticsLimitation(filters),
    ...(peerBenchmark === undefined
      ? [
          "Peer comparison is unavailable unless at least two other single-category merchants share the merchant's category in the selected scope.",
        ]
      : [
          `Peer comparisons use equal-merchant medians across ${peerBenchmark.peerCount} other merchants in category ${peerBenchmark.categoryId}; high-volume merchants do not receive extra benchmark weight.`,
        ]),
  ];

  const headlineMetrics: Metric[] = [
    metric(
      {
        metricId: "payment-session-count",
        label: "Payment sessions",
        definition: "Distinct payment sessions grouped by sessionId.",
        value: sessions.length,
        unit: "count",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        ...(peerLabel === undefined || peerBenchmark === undefined
          ? {}
          : {
              comparison: peerComparison(
                sessions.length,
                peerBenchmark.sessionCount,
                peerLabel,
                peerBenchmark,
              ),
            }),
        limitations: [SESSION_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "successful-session-count",
        label: "Successful payment sessions",
        definition:
          "Distinct payment sessions with at least one successful attempt.",
        value: succeededSessionCount,
        unit: "count",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "successful-session-rate",
        label: "Successful payment-session rate",
        definition:
          "Payment sessions with at least one successful attempt divided by all payment sessions in scope.",
        value: successfulSessionRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        ...(peerLabel === undefined || peerBenchmark === undefined
          ? {}
          : {
              comparison: peerComparison(
                successfulSessionRate,
                peerBenchmark.successRate,
                peerLabel,
                peerBenchmark,
              ),
            }),
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "failed-session-count",
        label: "Failed payment sessions",
        definition:
          "Sessions whose observed attempts are all failed, plus source NoAttempt sessions recorded as failed.",
        value: failedSessionCount,
        unit: "count",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "failed-session-rate",
        label: "Failed payment-session rate",
        definition:
          "Failed sessions, including source NoAttempt sessions, divided by all payment sessions in scope.",
        value: failedSessionRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        ...(peerLabel === undefined || peerBenchmark === undefined
          ? {}
          : {
              comparison: peerComparison(
                failedSessionRate,
                peerBenchmark.failureRate,
                peerLabel,
                peerBenchmark,
              ),
            }),
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "retry-session-count",
        label: "Multi-attempt payment sessions",
        definition: "Payment sessions containing more than one attempt.",
        value: retrySessions.length,
        unit: "count",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "retry-session-rate",
        label: "Multi-attempt payment-session rate",
        definition:
          "Payment sessions with more than one attempt, divided by all payment sessions in scope.",
        value: retrySessionRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        ...(peerLabel === undefined || peerBenchmark === undefined
          ? {}
          : {
              comparison: peerComparison(
                retrySessionRate,
                peerBenchmark.retryRate,
                peerLabel,
                peerBenchmark,
              ),
            }),
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "average-attempts-per-session",
        label: "Average attempts per payment session",
        definition:
          "Observed payment-attempt count divided by all payment sessions in scope; NoAttempt sessions contribute zero attempts.",
        value:
          sessions.length === 0
            ? null
            : round(paymentAttemptCount / sessions.length),
        unit: "attempts_per_session",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
  ];

  if (initiallyUnsuccessfulRetrySessions.length > 0) {
    headlineMetrics.push(
      metric(
        {
          metricId: "observed-recovered-retry-session-count",
          label: "Recovered retry sessions",
          definition:
            "Initially unsuccessful multi-attempt sessions that later recorded a successful attempt.",
          value: recoveredRetrySessions.length,
          unit: "count",
          analysisUnit: "payment_session",
          sampleSize: initiallyUnsuccessfulRetrySessions.length,
          limitations: [
            SESSION_LIMITATION,
            DESCRIPTIVE_LIMITATION,
            "Observed recovery does not establish that retrying caused success.",
          ],
        },
        period,
      ),
      metric(
        {
          metricId: "observed-retry-recovery-rate",
          label: "Observed retry recovery rate",
          definition:
            "Initially unsuccessful multi-attempt sessions that later recorded success, divided by all initially unsuccessful multi-attempt sessions.",
          value: percentage(
            recoveredRetrySessions.length,
            initiallyUnsuccessfulRetrySessions.length,
          ),
          unit: "percent",
          analysisUnit: "payment_session",
          sampleSize: initiallyUnsuccessfulRetrySessions.length,
          limitations: [
            SESSION_LIMITATION,
            DESCRIPTIVE_LIMITATION,
            "Observed recovery does not establish that retrying caused success.",
          ],
        },
        period,
      ),
    );
  }

  const currencies = unique(sessions.map((session) => session.currency)).sort();
  for (const currency of currencies) {
    const currencySessions = sessions.filter(
      (session) => session.currency === currency,
    );
    const successfulSessions = currencySessions.filter(
      (session) => session.outcome === "succeeded",
    );
    const failedSessions = currencySessions.filter(
      (session) => session.outcome === "failed",
    );
    const totalVolume = safeIntegerSum(
      currencySessions.map((session) => session.representativeAmount),
      `headlineMetrics.total-payment-volume-${currency}`,
    );
    const peerVolume = peerBenchmark?.volumeByCurrency.get(currency);
    headlineMetrics.push(
      metric(
        {
          metricId: `total-payment-volume-${sanitizeIdPart(currency)}`,
          label: `Total observed payment volume (${currency})`,
          definition:
            "Source amount summed once per payment session regardless of outcome; this is observed requested volume, not successful or settled volume.",
          value: totalVolume,
          unit: currency,
          analysisUnit: "payment_session",
          sampleSize: currencySessions.length,
          disclosure: {
            code: "NO_CURRENCY_CONVERSION",
            message: `This amount includes only ${currency}; no currency conversion was applied.`,
          },
          ...(peerVolume === undefined || peerBenchmark === undefined
            ? {}
            : {
                comparison: peerComparison(
                  totalVolume,
                  peerVolume.value,
                  `Median of ${peerVolume.peerCount} same-category peer merchants (${peerBenchmark.categoryId})`,
                  peerBenchmark,
                  peerVolume.peerCount,
                ),
              }),
          limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
        },
        period,
      ),
      metric(
        {
          metricId: `successful-session-amount-${sanitizeIdPart(currency)}`,
          label: `Successful payment-session amount (${currency})`,
          definition:
            "Source amount summed once per successful payment session. Currencies are never combined or converted.",
          value: safeIntegerSum(
            successfulSessions.map((session) => session.representativeAmount),
            `headlineMetrics.successful-session-amount-${currency}`,
          ),
          unit: currency,
          analysisUnit: "payment_session",
          sampleSize: successfulSessions.length,
          disclosure: {
            code: "NO_CURRENCY_CONVERSION",
            message: `This amount includes only ${currency}; no currency conversion was applied.`,
          },
          limitations: [SESSION_LIMITATION],
        },
        period,
      ),
      metric(
        {
          metricId: `failed-session-amount-${sanitizeIdPart(currency)}`,
          label: `Failed payment-session amount (${currency})`,
          definition:
            "Source amount summed once per failed payment session, including failed NoAttempt sessions. Successful and pending sessions are excluded.",
          value: safeIntegerSum(
            failedSessions.map((session) => session.representativeAmount),
            `headlineMetrics.failed-session-amount-${currency}`,
          ),
          unit: currency,
          analysisUnit: "payment_session",
          sampleSize: failedSessions.length,
          disclosure: {
            code: "NO_CURRENCY_CONVERSION",
            message: `This amount includes only ${currency}; no currency conversion was applied.`,
          },
          limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
        },
        period,
      ),
    );

    const adjustedFeeRatio = relativeAdjustedFeeRatio(
      successfulSessions,
      `headlineMetrics.relative-adjusted-fee-${currency}`,
    );
    if (adjustedFeeRatio.sampleSize > 0) {
      const peerAdjustedFeeRatio =
        peerBenchmark?.adjustedFeeRatioByCurrency.get(currency);
      headlineMetrics.push(
        metric(
          {
            metricId: `relative-adjusted-fee-to-amount-ratio-${sanitizeIdPart(currency)}`,
            label: `Relative adjusted-fee-to-amount ratio (${currency})`,
            definition:
              "Sum of available confidentially transformed adjusted_fee values divided by the corresponding successful payment amounts.",
            value: adjustedFeeRatio.value,
            unit: "percent",
            analysisUnit: "payment_session",
            sampleSize: adjustedFeeRatio.sampleSize,
            disclosure: ADJUSTED_FEE_DISCLOSURE,
            ...(peerAdjustedFeeRatio === undefined ||
            peerBenchmark === undefined
              ? {}
              : {
                  comparison: peerComparison(
                    adjustedFeeRatio.value,
                    peerAdjustedFeeRatio.value,
                    `Median of ${peerAdjustedFeeRatio.peerCount} same-category peer merchants with available adjusted_fee (${peerBenchmark.categoryId})`,
                    peerBenchmark,
                    peerAdjustedFeeRatio.peerCount,
                  ),
                }),
            limitations: [
              ADJUSTED_FEE_DISCLOSURE.message,
              DESCRIPTIVE_LIMITATION,
              "Only successful sessions with a non-null adjusted_fee are included; missing values are excluded from both numerator and denominator.",
            ],
          },
          period,
        ),
      );
    }
  }

  const tracedHeadlineMetrics = headlineMetrics.map((item) =>
    traceMetric(item, evidenceFilters(filters, merchantId), provenance),
  );

  return {
    merchantId,
    displayName: identity.displayName,
    ...(identity.category !== undefined ? { category: identity.category } : {}),
    reportingPeriod: period,
    analysisUnit: "payment_session",
    headlineMetrics: tracedHeadlineMetrics,
    availableInsightCount: countAvailableInsights(sessions, peerBenchmark),
    limitations: unique([...limitations, ...identity.limitations]),
  };
};

const makeEvidence = (
  evidenceId: string,
  evidenceMetric: Metric,
  filters: FilterState,
  period: DateRange,
  formulaLabel: string,
  formulaExplanation: string,
  missingDataHandling: string,
  limitations: string[],
  provenance: AnalysisProvenance,
  comparedGroups?: Evidence["comparedGroups"],
): Evidence => ({
  evidenceId,
  metric: traceMetric(evidenceMetric, filters, provenance, {
    formulaLabel,
    formulaExplanation,
    missingDataHandling,
  }),
  filters,
  dateRange: period,
  sample: {
    size: evidenceMetric.sampleSize ?? 0,
    analysisUnit: evidenceMetric.analysisUnit,
  },
  formula: {
    label: formulaLabel,
    explanation: formulaExplanation,
    ...(provenance.methodologyReference !== undefined
      ? { methodologyReference: provenance.methodologyReference }
      : {}),
  },
  missingDataHandling,
  ...(comparedGroups === undefined ? {} : { comparedGroups }),
  limitations,
  sourceReference: sourceReference(provenance),
});

const buildSessionAmountEvidence = (
  sessions: readonly PaymentSession[],
  merchantId: string,
  metricPrefix: string,
  labelPrefix: string,
  definition: string,
  filters: FilterState,
  period: DateRange,
  limitations: string[],
  provenance: AnalysisProvenance,
): Evidence[] =>
  unique(sessions.map((session) => session.currency))
    .sort()
    .map((currency) => {
      const currencySessions = sessions.filter(
        (session) => session.currency === currency,
      );
      const amountMetric = metric(
        {
          metricId: `${metricPrefix}-${sanitizeIdPart(currency)}`,
          label: `${labelPrefix} (${currency})`,
          definition,
          value: safeIntegerSum(
            currencySessions.map((session) => session.representativeAmount),
            `insights.${metricPrefix}.${currency}`,
          ),
          unit: currency,
          analysisUnit: "payment_session",
          sampleSize: currencySessions.length,
          limitations,
        },
        period,
      );
      return makeEvidence(
        `evidence:${sanitizeIdPart(merchantId)}:${metricPrefix}-${sanitizeIdPart(currency)}`,
        amountMetric,
        filters,
        period,
        `${labelPrefix} (${currency})`,
        "Sum the source amount once for each qualifying payment session; currencies are never converted or combined.",
        "Session amount is required and runtime-validated. No missing amount is imputed, and repeated attempts are not counted again.",
        limitations,
        provenance,
      );
    });

const evidenceAmountText = (evidence: readonly Evidence[]): string =>
  evidence
    .map((item) => `${String(item.metric.value)} ${item.metric.unit}`)
    .join(", ");

const rankInsights = (insights: Insight[]): Insight[] => {
  const priorityRank = new Map([
    ["high", 0],
    ["medium", 1],
    ["low", 2],
  ]);
  return insights.sort(
    (left, right) =>
      (priorityRank.get(left.priority ?? "low") ?? 3) -
        (priorityRank.get(right.priority ?? "low") ?? 3) ||
      left.insightId.localeCompare(right.insightId),
  );
};

export const buildMerchantInsights = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
  sourceSessions?: readonly PaymentSession[],
): Insight[] => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const sessions = scopeMerchantSessions(
    attempts,
    merchantId,
    filters,
    sourceSessions,
  );
  const period = resolvePeriod(scoped, filters, provenance, sessions);
  const canonicalFilters = evidenceFilters(filters, merchantId);
  const peerBenchmark = buildPeerBenchmark(
    attempts,
    sourceSessions,
    merchantId,
    filters,
  );
  const peerLabel =
    peerBenchmark === undefined
      ? undefined
      : `Median of ${peerBenchmark.peerCount} same-category peer merchants`;
  const comparedGroups =
    peerBenchmark === undefined
      ? undefined
      : [
          {
            groupId: merchantId,
            label: "Selected merchant payment sessions",
            sampleSize: sessions.length,
          },
          {
            groupId: `category:${peerBenchmark.categoryId}:peers`,
            label: `Same-category peer merchants (${peerBenchmark.categoryId})`,
            sampleSize: peerBenchmark.peerCount,
          },
        ];
  const insightLimitations = [
    DESCRIPTIVE_LIMITATION,
    SESSION_LIMITATION,
    CONFOUNDING_LIMITATION,
    filterSemanticsLimitation(filters),
    ...(sessions.length < 30
      ? [
          `Only ${sessions.length} payment sessions are in scope; rates and opportunity estimates may be unstable at this sample size.`,
        ]
      : []),
    ...(peerBenchmark === undefined
      ? [
          "No robust same-category comparison is shown because the target has no single category or fewer than two eligible peer merchants are available.",
        ]
      : [
          `Peer references are equal-merchant medians across ${peerBenchmark.peerCount} same-category merchants, so the largest merchants do not dominate the comparison.`,
        ]),
  ];
  const insights: Insight[] = [];

  const failedSessions = sessions.filter(
    (session) => session.outcome === "failed",
  );
  if (failedSessions.length > 0) {
    const failureRate = percentage(failedSessions.length, sessions.length);
    const peerGap =
      peerBenchmark === undefined || failureRate === null
        ? null
        : round(failureRate - peerBenchmark.failureRate);
    const evidenceId = `evidence:${sanitizeIdPart(merchantId)}:failed-sessions`;
    const failureMetric = metric(
      {
        metricId: "failed-session-rate",
        label: "Payment sessions without a successful outcome",
        definition:
          "Failed sessions, including source NoAttempt sessions, divided by all payment sessions in scope.",
        value: failureRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        ...(peerBenchmark === undefined || peerLabel === undefined
          ? {}
          : {
              comparison: peerComparison(
                failureRate,
                peerBenchmark.failureRate,
                peerLabel,
                peerBenchmark,
              ),
            }),
        limitations: insightLimitations,
      },
      period,
    );
    const evidence = makeEvidence(
      evidenceId,
      failureMetric,
      canonicalFilters,
      period,
      "Failed-session rate",
      "Count failed sessions, including source NoAttempt sessions, divide by all distinct sessions in scope, then multiply by 100.",
      "Required attempt and preserved-session fields are runtime-validated. NoAttempt rows remain zero-attempt sessions. Pending sessions remain in the denominator and are not counted as failed.",
      insightLimitations,
      provenance,
      comparedGroups,
    );
    const amountEvidence = buildSessionAmountEvidence(
      failedSessions,
      merchantId,
      "failed-session-requested-amount",
      "Requested amount of failed payment sessions",
      "Source-requested payment amount associated with failed sessions; this is not realized loss or recoverable revenue.",
      canonicalFilters,
      period,
      insightLimitations,
      provenance,
    );
    const opportunitySessions =
      peerGap !== null && peerGap > 0
        ? Math.round((peerGap / 100) * sessions.length)
        : 0;
    const peerObservation =
      peerGap === null
        ? ""
        : ` This is ${Math.abs(peerGap).toFixed(1)} percentage points ${peerGap > 0 ? "above" : "below"} the equal-merchant same-category peer median.`;
    const opportunityText =
      opportunitySessions > 0
        ? ` At the current session count, closing the observed peer gap corresponds to approximately ${opportunitySessions} fewer failed sessions; this is a descriptive scenario, not a causal forecast.`
        : "";
    insights.push({
      insightId: `insight:${sanitizeIdPart(merchantId)}:failed-sessions`,
      merchantId,
      title:
        peerGap !== null && peerGap >= 5
          ? "Failed-session rate is above same-category peers"
          : "Failed sessions form a measurable operational review queue",
      observation: `${failedSessions.length} of ${sessions.length} payment sessions (${displayPercentage(failureRate)}) ended failed without a recorded success.${peerObservation}`,
      businessImpact: `${evidenceAmountText(amountEvidence)} in requested payment amount is associated with these failed sessions. This is observed checkout volume, not proven loss or recoverable revenue.${opportunityText}`,
      priority:
        (peerGap !== null && peerGap >= 10) ||
        (failureRate !== null && failureRate >= 25)
          ? "high"
          : "medium",
      evidence: [evidence, ...amountEvidence],
      recommendations: [
        {
          recommendationId: `recommendation:${sanitizeIdPart(merchantId)}:review-failures`,
          action:
            "Review operational logs for the affected failed sessions and group failure reasons by time, terminal, and issuer before changing the payment flow.",
          rationale:
            "The records establish where success was absent, but not why; inspecting source failure context is the next evidence-building step.",
          supportingEvidenceIds: [
            evidenceId,
            ...amountEvidence.map((item) => item.evidenceId),
          ],
          caveats: [
            "Do not attribute the failures to a terminal, issuer, customer, or product change without controlled supporting evidence.",
          ],
        },
      ],
      limitations: insightLimitations,
    });
  }

  const initiallyUnsuccessful = sessions.filter(isInitiallyUnsuccessfulRetry);
  if (initiallyUnsuccessful.length > 0) {
    const ambiguousInitialOrder = sessions.filter(
      hasAmbiguousInitialAttemptOrder,
    ).length;
    const retryLimitations = [
      ...insightLimitations,
      ...(ambiguousInitialOrder > 0
        ? [
            `${ambiguousInitialOrder} multi-attempt payment sessions with tied earliest timestamps are excluded because no source sequence is available.`,
          ]
        : []),
    ];
    const recovered = initiallyUnsuccessful.filter(
      (session) => session.outcome === "succeeded",
    );
    const unrecovered = initiallyUnsuccessful.filter(
      (session) => session.outcome !== "succeeded",
    );
    const recoveryRate = percentage(
      recovered.length,
      initiallyUnsuccessful.length,
    );
    const evidenceId = `evidence:${sanitizeIdPart(merchantId)}:retry-recovery`;
    const recoveryMetric = metric(
      {
        metricId: "observed-retry-recovery-rate",
        label: "Observed retry recovery rate",
        definition:
          "Initially unsuccessful multi-attempt sessions that later recorded success, divided by all initially unsuccessful multi-attempt sessions.",
        value: recoveryRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: initiallyUnsuccessful.length,
        limitations: retryLimitations,
      },
      period,
    );
    const evidence = makeEvidence(
      evidenceId,
      recoveryMetric,
      canonicalFilters,
      period,
      "Observed retry recovery rate",
      "Among sessions with more than one attempt whose first attempt was not successful, count sessions with any later successful attempt, divide by all such sessions, then multiply by 100.",
      "Only validated attempt order and status are used. Missing operational failure reasons are not inferred.",
      retryLimitations,
      provenance,
    );
    const recoveredAmountEvidence = buildSessionAmountEvidence(
      recovered,
      merchantId,
      "recovered-retry-session-requested-amount",
      "Requested amount of recovered retry sessions",
      "Source-requested amount associated with initially unsuccessful sessions that later recorded success.",
      canonicalFilters,
      period,
      retryLimitations,
      provenance,
    );
    const unrecoveredAmountEvidence = buildSessionAmountEvidence(
      unrecovered,
      merchantId,
      "unrecovered-retry-session-requested-amount",
      "Requested amount of unrecovered retry sessions",
      "Source-requested amount associated with initially unsuccessful multi-attempt sessions without a later recorded success.",
      canonicalFilters,
      period,
      retryLimitations,
      provenance,
    );
    const retryRate = percentage(
      sessions.filter((session) => session.attempts.length > 1).length,
      sessions.length,
    );
    const retryRateEvidence =
      peerBenchmark === undefined || peerLabel === undefined
        ? []
        : [
            makeEvidence(
              `evidence:${sanitizeIdPart(merchantId)}:retry-session-rate`,
              metric(
                {
                  metricId: "retry-session-rate",
                  label: "Payment sessions with multiple attempts",
                  definition:
                    "Payment sessions with more than one attempt divided by all payment sessions in scope.",
                  value: retryRate,
                  unit: "percent",
                  analysisUnit: "payment_session",
                  sampleSize: sessions.length,
                  comparison: peerComparison(
                    retryRate,
                    peerBenchmark.retryRate,
                    peerLabel,
                    peerBenchmark,
                  ),
                  limitations: retryLimitations,
                },
                period,
              ),
              canonicalFilters,
              period,
              "Retry-session rate",
              "Count payment sessions with more than one attempt, divide by all payment sessions in scope, then multiply by 100.",
              "Zero-attempt NoAttempt sessions remain in the session denominator and are not treated as retry sessions.",
              retryLimitations,
              provenance,
              comparedGroups,
            ),
          ];
    const recoveredAmountText =
      recoveredAmountEvidence.length === 0
        ? "No recovered requested amount"
        : `${evidenceAmountText(recoveredAmountEvidence)} in requested amount`;
    const unrecoveredAmountText =
      unrecoveredAmountEvidence.length === 0
        ? "no unrecovered requested amount"
        : `${evidenceAmountText(unrecoveredAmountEvidence)} in requested amount`;
    insights.push({
      insightId: `insight:${sanitizeIdPart(merchantId)}:retry-recovery`,
      merchantId,
      title: "Retries recovered some initially unsuccessful payment sessions",
      observation: `${recovered.length} of ${initiallyUnsuccessful.length} initially unsuccessful multi-attempt sessions (${displayPercentage(recoveryRate)}) later recorded a successful attempt.`,
      businessImpact: `${recoveredAmountText} is associated with observed recovery, while ${unrecoveredAmountText} remained without a recorded success. These are observed associations, not proof that retrying caused recovery or a revenue forecast.`,
      priority:
        unrecovered.length > recovered.length ||
        (peerBenchmark !== undefined &&
          retryRate !== null &&
          retryRate - peerBenchmark.retryRate >= 10)
          ? "high"
          : "medium",
      evidence: [
        evidence,
        ...retryRateEvidence,
        ...recoveredAmountEvidence,
        ...unrecoveredAmountEvidence,
      ],
      recommendations: [
        {
          recommendationId: `recommendation:${sanitizeIdPart(merchantId)}:monitor-retries`,
          action:
            "Preserve a clear retry path and monitor recovery by failure reason, terminal, issuer, and attempt number before testing any retry-policy change.",
          rationale:
            "Observed recoveries make retry journeys worth monitoring, but subgroup evidence is needed to determine where an intervention is appropriate.",
          supportingEvidenceIds: [
            evidenceId,
            ...retryRateEvidence.map((item) => item.evidenceId),
            ...recoveredAmountEvidence.map((item) => item.evidenceId),
            ...unrecoveredAmountEvidence.map((item) => item.evidenceId),
          ],
          caveats: [
            "This is an observed association, not proof that retries caused successful outcomes.",
          ],
        },
      ],
      limitations: retryLimitations,
    });
  }

  const feeDeviation = relativeFeeDeviations(sessions, peerBenchmark)[0];
  if (
    feeDeviation !== undefined &&
    peerBenchmark !== undefined &&
    peerLabel !== undefined
  ) {
    const feeLimitations = unique([
      ...insightLimitations,
      ADJUSTED_FEE_DISCLOSURE.message,
      "The ratio includes only successful sessions with a numeric transformed adjusted_fee value; excluded sessions do not enter either side of the ratio.",
    ]);
    const evidenceId = `evidence:${sanitizeIdPart(merchantId)}:relative-adjusted-fee-${sanitizeIdPart(feeDeviation.currency)}`;
    const feeEvidence = makeEvidence(
      evidenceId,
      metric(
        {
          metricId: `relative-adjusted-fee-to-amount-ratio-${sanitizeIdPart(feeDeviation.currency)}`,
          label: `Relative transformed adjusted-fee-to-amount ratio (${feeDeviation.currency})`,
          definition:
            "Sum of confidentially transformed adjusted_fee divided by the corresponding successful payment amounts; valid only for relative comparison.",
          value: feeDeviation.value,
          unit: "percent",
          analysisUnit: "payment_session",
          sampleSize: feeDeviation.sampleSize,
          comparison: peerComparison(
            feeDeviation.value,
            feeDeviation.peerValue,
            `Median of ${feeDeviation.peerCount} same-category peer merchants with usable ${feeDeviation.currency} pairs`,
            peerBenchmark,
            feeDeviation.peerCount,
          ),
          disclosure: ADJUSTED_FEE_DISCLOSURE,
          limitations: feeLimitations,
        },
        period,
      ),
      canonicalFilters,
      period,
      "Relative transformed adjusted-fee-to-amount ratio",
      "For successful sessions with numeric adjusted_fee, divide the sum of transformed adjusted_fee by the sum of corresponding payment amounts, then multiply by 100; compare equal-merchant ratios using their median.",
      "Sessions without a numeric transformed adjusted_fee or a corresponding successful amount are excluded from both numerator and denominator; no value is imputed.",
      feeLimitations,
      provenance,
      comparedGroups,
    );
    insights.push({
      insightId: `insight:${sanitizeIdPart(merchantId)}:relative-adjusted-fee-${sanitizeIdPart(feeDeviation.currency)}`,
      merchantId,
      title: "Relative transformed fee ratio differs from same-category peers",
      observation: `The transformed adjusted-fee-to-amount ratio is ${displayPercentage(feeDeviation.value)}, ${Math.abs(feeDeviation.delta).toFixed(1)} percentage points ${feeDeviation.delta > 0 ? "above" : "below"} the equal-merchant same-category peer median of ${displayPercentage(feeDeviation.peerValue)} for ${feeDeviation.currency}.`,
      businessImpact:
        "This deviation is a relative operational review signal only. The transformed field cannot support an estimate of Zarinpal's real fee, pricing, merchant cost, or revenue impact.",
      priority: Math.abs(feeDeviation.delta) >= 2 ? "medium" : "low",
      evidence: [feeEvidence],
      recommendations: [
        {
          recommendationId: `recommendation:${sanitizeIdPart(merchantId)}:review-relative-adjusted-fee`,
          action:
            "Validate transformed adjusted_fee coverage, then compare the relative ratio by time, terminal, and amount band before deciding whether an operational investigation is warranted.",
          rationale:
            "The same-category median limits concentration bias, but subgroup checks are needed to identify whether the deviation is stable or compositional.",
          supportingEvidenceIds: [evidenceId],
          caveats: [ADJUSTED_FEE_DISCLOSURE.message],
        },
      ],
      limitations: feeLimitations,
    });
  }

  return rankInsights(insights);
};

const dayInTimezone = (dateTime: string, timezone: string): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date(dateTime));
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (year === undefined || month === undefined || day === undefined) {
    throw new DomainValidationError("Unable to bucket analytical date", [
      { path: "occurredAt", message: "could not derive a local calendar day" },
    ]);
  }
  return `${year}-${month}-${day}`;
};

const statusMetricPrefix = (
  status: "succeeded" | "failed",
): "successful" | "failed" =>
  status === "succeeded" ? "successful" : "failed";

const traceDailySeries = (
  series: ChartSeries,
  filters: FilterState,
  provenance: AnalysisProvenance,
  period: DateRange,
  sampleSize: number,
): ChartSeries => {
  if (series.analysisUnit === "merchant") {
    return series;
  }
  const formulaExplanation = series.metricId.includes(
    "relative-adjusted-fee-to-amount-ratio-",
  )
    ? "For each calendar day, divide the sum of numeric transformed adjusted_fee values by the sum of corresponding successful payment amounts; a day with no usable pair is null."
    : series.metricId.endsWith("-rate")
      ? `For each calendar day, divide the qualifying ${series.analysisUnit} count by all ${series.analysisUnit} records assigned to that day, then multiply by 100.`
      : series.metricId.includes("amount-") ||
          series.metricId.includes("volume-")
        ? "For each calendar day, sum the source amount once for every qualifying payment session in that currency; currencies are not converted or combined."
        : `For each calendar day, count qualifying ${series.analysisUnit} records once.`;
  const traced = traceMetric(
    metric(
      {
        metricId: series.metricId,
        label: series.label,
        definition: formulaExplanation,
        value: null,
        unit: series.unit,
        analysisUnit: series.analysisUnit,
        sampleSize,
        limitations: series.limitations,
      },
      period,
    ),
    filters,
    provenance,
    {
      formulaExplanation,
      missingDataHandling: series.metricId.includes("adjusted-fee")
        ? "Daily points exclude sessions without a numeric transformed adjusted_fee and corresponding successful amount; a day with no usable pair is null, never zero."
        : "Required source fields are runtime-validated. Days without records are omitted, and values are neither imputed nor interpolated.",
      ...(series.metricId.endsWith("-rate")
        ? {
            denominator: {
              unit: series.analysisUnit,
              description:
                "The eligible records assigned to each calendar day; the exact denominator is exposed as that point's sampleSize.",
            },
          }
        : {}),
      assumptions: [
        `Calendar-day assignment uses ${period.timezone}.`,
        "Each point exposes its own eligible sample size because daily denominators can differ.",
      ],
    },
  ).traceability;
  return traced === undefined ? series : { ...series, traceability: traced };
};

export const buildDailyTrends = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
  sourceSessions?: readonly PaymentSession[],
): ChartSeries[] => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const sessions =
    filters.analysisUnit === "payment_attempt"
      ? []
      : scopeMerchantSessions(attempts, merchantId, filters, sourceSessions);
  const period = resolvePeriod(scoped, filters, provenance, sessions);
  const timezone = period.timezone;
  validateTimezone(timezone);
  const attemptsByDay = new Map<string, PaymentAttempt[]>();
  for (const attempt of scoped) {
    const day = dayInTimezone(attempt.occurredAt, timezone);
    const current = attemptsByDay.get(day);
    if (current === undefined) {
      attemptsByDay.set(day, [attempt]);
    } else {
      current.push(attempt);
    }
  }
  const sessionsByDay = new Map<string, PaymentSession[]>();
  for (const session of sessions) {
    const day = dayInTimezone(session.observedAt, timezone);
    const current = sessionsByDay.get(day);
    if (current === undefined) {
      sessionsByDay.set(day, [session]);
    } else {
      current.push(session);
    }
  }
  const attemptDays = [...attemptsByDay.keys()].sort();
  const sessionDays = [...sessionsByDay.keys()].sort();
  const commonLimitations = [
    DESCRIPTIVE_LIMITATION,
    `Calendar days use ${timezone}. Days without records are omitted; values are not interpolated or smoothed.`,
    filterSemanticsLimitation(filters),
    `Source dataset ${provenance.datasetId}; reporting period ${period.from} through ${period.to}.`,
  ];

  const attemptSeries: ChartSeries = {
    seriesId: `daily-payment-attempts:${sanitizeIdPart(merchantId)}`,
    label: "Daily payment attempts",
    metricId: "payment-attempt-count",
    unit: "count",
    analysisUnit: "payment_attempt",
    points: attemptDays.map((day) => ({
      x: day,
      y: attemptsByDay.get(day)?.length ?? 0,
      sampleSize: attemptsByDay.get(day)?.length ?? 0,
    })),
    limitations: commonLimitations,
  };

  if (filters.analysisUnit === "payment_attempt") {
    const attemptStatusSeries = (
      status: "succeeded" | "failed",
    ): ChartSeries => ({
      seriesId: `daily-${statusMetricPrefix(status)}-payment-attempts:${sanitizeIdPart(merchantId)}`,
      label: `Daily ${statusMetricPrefix(status)} payment attempts`,
      metricId: `${statusMetricPrefix(status)}-payment-attempt-count`,
      unit: "count",
      analysisUnit: "payment_attempt",
      points: attemptDays.map((day) => ({
        x: day,
        y:
          attemptsByDay.get(day)?.filter((attempt) => attempt.status === status)
            .length ?? 0,
        sampleSize: attemptsByDay.get(day)?.length ?? 0,
      })),
      limitations: commonLimitations,
    });
    const attemptRateSeries = (
      status: "succeeded" | "failed",
    ): ChartSeries => ({
      seriesId: `daily-${statusMetricPrefix(status)}-payment-attempt-rate:${sanitizeIdPart(merchantId)}`,
      label: `Daily ${statusMetricPrefix(status)} payment-attempt rate`,
      metricId: `${statusMetricPrefix(status)}-payment-attempt-rate`,
      unit: "percent",
      analysisUnit: "payment_attempt",
      points: attemptDays.map((day) => {
        const dayAttempts = attemptsByDay.get(day) ?? [];
        return {
          x: day,
          y: percentage(
            dayAttempts.filter((attempt) => attempt.status === status).length,
            dayAttempts.length,
          ),
          sampleSize: dayAttempts.length,
        };
      }),
      limitations: [
        ...commonLimitations,
        "Pending attempts remain in rate denominators and are neither successful nor failed.",
      ],
    });
    return [
      attemptSeries,
      attemptStatusSeries("succeeded"),
      attemptStatusSeries("failed"),
      attemptRateSeries("succeeded"),
      attemptRateSeries("failed"),
    ].map((series) =>
      traceDailySeries(
        series,
        evidenceFilters(filters, merchantId),
        provenance,
        period,
        scoped.length,
      ),
    );
  }

  const sessionLimitations = [
    SESSION_LIMITATION,
    ...commonLimitations,
    "Each payment session is assigned to its observation day: the first observed attempt day, or source creation day for a NoAttempt session.",
  ];
  const sessionStatusCountSeries = (
    status: "succeeded" | "failed",
  ): ChartSeries => ({
    seriesId: `daily-${statusMetricPrefix(status)}-payment-sessions:${sanitizeIdPart(merchantId)}`,
    label: `Daily ${statusMetricPrefix(status)} payment sessions`,
    metricId: `${statusMetricPrefix(status)}-session-count`,
    unit: "count",
    analysisUnit: "payment_session",
    points: sessionDays.map((day) => ({
      x: day,
      y:
        sessionsByDay.get(day)?.filter((session) => session.outcome === status)
          .length ?? 0,
      sampleSize: sessionsByDay.get(day)?.length ?? 0,
    })),
    limitations: sessionLimitations,
  });
  const sessionRateSeries = (status: "succeeded" | "failed"): ChartSeries => ({
    seriesId: `daily-${statusMetricPrefix(status)}-session-rate:${sanitizeIdPart(merchantId)}`,
    label: `Daily ${statusMetricPrefix(status)} payment-session rate`,
    metricId: `${statusMetricPrefix(status)}-session-rate`,
    unit: "percent",
    analysisUnit: "payment_session",
    points: sessionDays.map((day) => {
      const daySessions = sessionsByDay.get(day) ?? [];
      return {
        x: day,
        y: percentage(
          daySessions.filter((session) => session.outcome === status).length,
          daySessions.length,
        ),
        sampleSize: daySessions.length,
      };
    }),
    limitations: [
      ...sessionLimitations,
      "Pending sessions remain in rate denominators and are neither successful nor failed.",
    ],
  });
  const sessionSeries: ChartSeries[] = [
    {
      seriesId: `daily-payment-sessions:${sanitizeIdPart(merchantId)}`,
      label: "Daily payment sessions",
      metricId: "payment-session-count",
      unit: "count",
      analysisUnit: "payment_session",
      points: sessionDays.map((day) => ({
        x: day,
        y: sessionsByDay.get(day)?.length ?? 0,
        sampleSize: sessionsByDay.get(day)?.length ?? 0,
      })),
      limitations: sessionLimitations,
    },
    sessionStatusCountSeries("succeeded"),
    sessionStatusCountSeries("failed"),
    sessionRateSeries("succeeded"),
    sessionRateSeries("failed"),
    {
      seriesId: `daily-retry-session-count:${sanitizeIdPart(merchantId)}`,
      label: "Daily multi-attempt payment sessions",
      metricId: "retry-session-count",
      unit: "count",
      analysisUnit: "payment_session",
      points: sessionDays.map((day) => ({
        x: day,
        y:
          sessionsByDay
            .get(day)
            ?.filter((session) => session.attempts.length > 1).length ?? 0,
        sampleSize: sessionsByDay.get(day)?.length ?? 0,
      })),
      limitations: sessionLimitations,
    },
    {
      seriesId: `daily-retry-session-rate:${sanitizeIdPart(merchantId)}`,
      label: "Daily multi-attempt payment-session rate",
      metricId: "retry-session-rate",
      unit: "percent",
      analysisUnit: "payment_session",
      points: sessionDays.map((day) => {
        const daySessions = sessionsByDay.get(day) ?? [];
        return {
          x: day,
          y: percentage(
            daySessions.filter((session) => session.attempts.length > 1).length,
            daySessions.length,
          ),
          sampleSize: daySessions.length,
        };
      }),
      limitations: sessionLimitations,
    },
  ];

  for (const currency of unique(
    sessions.map((session) => session.currency),
  ).sort()) {
    const currencySessions = sessions.filter(
      (session) => session.currency === currency,
    );
    sessionSeries.push(
      {
        seriesId: `daily-total-payment-volume-${sanitizeIdPart(currency)}:${sanitizeIdPart(merchantId)}`,
        label: `Daily total observed payment volume (${currency})`,
        metricId: `total-payment-volume-${sanitizeIdPart(currency)}`,
        unit: currency,
        analysisUnit: "payment_session",
        points: sessionDays.map((day) => {
          const daySessions = (sessionsByDay.get(day) ?? []).filter(
            (session) => session.currency === currency,
          );
          return {
            x: day,
            y: safeIntegerSum(
              daySessions.map((session) => session.representativeAmount),
              `trends.${day}.total-payment-volume-${currency}`,
            ),
            sampleSize: daySessions.length,
          };
        }),
        limitations: [
          ...sessionLimitations,
          "Amounts are summed once per session regardless of outcome and are not successful or settled volume.",
        ],
      },
      {
        seriesId: `daily-successful-payment-volume-${sanitizeIdPart(currency)}:${sanitizeIdPart(merchantId)}`,
        label: `Daily successful payment volume (${currency})`,
        metricId: `successful-session-amount-${sanitizeIdPart(currency)}`,
        unit: currency,
        analysisUnit: "payment_session",
        points: sessionDays.map((day) => {
          const daySessions = (sessionsByDay.get(day) ?? []).filter(
            (session) =>
              session.currency === currency && session.outcome === "succeeded",
          );
          return {
            x: day,
            y: safeIntegerSum(
              daySessions.map((session) => session.representativeAmount),
              `trends.${day}.successful-payment-volume-${currency}`,
            ),
            sampleSize: daySessions.length,
          };
        }),
        limitations: [
          ...sessionLimitations,
          "Failed, reversed, pending, and NoAttempt sessions are excluded from successful volume.",
        ],
      },
    );

    const adjustedFeeRatio = relativeAdjustedFeeRatio(
      currencySessions,
      `trends.relative-adjusted-fee-${currency}`,
    );
    if (adjustedFeeRatio.sampleSize > 0) {
      sessionSeries.push({
        seriesId: `daily-relative-adjusted-fee-ratio-${sanitizeIdPart(currency)}:${sanitizeIdPart(merchantId)}`,
        label: `Daily relative adjusted-fee-to-amount ratio (${currency})`,
        metricId: `relative-adjusted-fee-to-amount-ratio-${sanitizeIdPart(currency)}`,
        unit: "percent",
        analysisUnit: "payment_session",
        points: sessionDays.map((day) => {
          const dailyRatio = relativeAdjustedFeeRatio(
            (sessionsByDay.get(day) ?? []).filter(
              (session) => session.currency === currency,
            ),
            `trends.${day}.relative-adjusted-fee-${currency}`,
          );
          return {
            x: day,
            y: dailyRatio.value,
            sampleSize: dailyRatio.sampleSize,
          };
        }),
        limitations: [
          ...sessionLimitations,
          ADJUSTED_FEE_DISCLOSURE.message,
          "Only successful sessions with a non-null adjusted_fee contribute; missing values produce null rather than zero.",
        ],
      });
    }
  }

  return sessionSeries.map((series) =>
    traceDailySeries(
      series,
      evidenceFilters(filters, merchantId),
      provenance,
      period,
      sessions.length,
    ),
  );
};

interface MerchantSegmentObservation {
  merchantId: string;
  sessionCount: number;
  successfulSessionCount: number;
  successRate: number;
}

interface SegmentDefinition {
  id: string;
  label: string;
  description: string;
  frequencyAtOrAboveMedian: boolean;
  successAtOrAboveMedian: boolean;
}

const SEGMENT_DEFINITIONS: readonly SegmentDefinition[] = [
  {
    id: "frequency-above-success-above",
    label: "At/above median frequency and observed success",
    description:
      "Merchants at or above the selected population medians for payment-session frequency and observed successful-session rate.",
    frequencyAtOrAboveMedian: true,
    successAtOrAboveMedian: true,
  },
  {
    id: "frequency-above-success-below",
    label: "At/above median frequency, below median observed success",
    description:
      "Merchants at or above the payment-session frequency median and below the observed successful-session-rate median.",
    frequencyAtOrAboveMedian: true,
    successAtOrAboveMedian: false,
  },
  {
    id: "frequency-below-success-above",
    label: "Below median frequency, at/above median observed success",
    description:
      "Merchants below the payment-session frequency median and at or above the observed successful-session-rate median.",
    frequencyAtOrAboveMedian: false,
    successAtOrAboveMedian: true,
  },
  {
    id: "frequency-below-success-below",
    label: "Below median frequency and observed success",
    description:
      "Merchants below the selected population medians for payment-session frequency and observed successful-session rate.",
    frequencyAtOrAboveMedian: false,
    successAtOrAboveMedian: false,
  },
];

const buildSegmentOperationalMetrics = (
  segmentId: string,
  sessions: readonly PaymentSession[],
  period: DateRange,
  limitations: string[],
): Metric[] => {
  const failedSessions = sessions.filter(
    (session) => session.outcome === "failed",
  );
  const retrySessions = sessions.filter(
    (session) => session.attempts.length > 1,
  );
  const metrics: Metric[] = [
    metric(
      {
        metricId: `${segmentId}:failed-session-rate`,
        label: "Failed payment-session rate",
        definition:
          "Failed payment sessions divided by all sessions represented in this segment.",
        value: percentage(failedSessions.length, sessions.length),
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations,
      },
      period,
    ),
    metric(
      {
        metricId: `${segmentId}:retry-session-rate`,
        label: "Multi-attempt payment-session rate",
        definition:
          "Sessions with more than one attempt divided by all sessions represented in this segment.",
        value: percentage(retrySessions.length, sessions.length),
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations,
      },
      period,
    ),
  ];
  for (const currency of unique(
    sessions.map((session) => session.currency),
  ).sort()) {
    const currencySessions = sessions.filter(
      (session) => session.currency === currency,
    );
    metrics.push(
      metric(
        {
          metricId: `${segmentId}:total-payment-volume-${sanitizeIdPart(currency)}`,
          label: `Total observed payment volume (${currency})`,
          definition:
            "Source amount summed once per represented payment session regardless of outcome.",
          value: safeIntegerSum(
            currencySessions.map((session) => session.representativeAmount),
            `segments.${segmentId}.total-payment-volume-${currency}`,
          ),
          unit: currency,
          analysisUnit: "payment_session",
          sampleSize: currencySessions.length,
          limitations: [
            ...limitations,
            "Observed volume is requested session amount, not successful or settled volume.",
          ],
        },
        period,
      ),
    );
    const adjustedFeeRatio = relativeAdjustedFeeRatio(
      currencySessions,
      `segments.${segmentId}.relative-adjusted-fee-${currency}`,
    );
    if (adjustedFeeRatio.sampleSize > 0) {
      metrics.push(
        metric(
          {
            metricId: `${segmentId}:relative-adjusted-fee-to-amount-ratio-${sanitizeIdPart(currency)}`,
            label: `Relative adjusted-fee-to-amount ratio (${currency})`,
            definition:
              "Sum of available transformed adjusted_fee divided by corresponding successful payment amounts.",
            value: adjustedFeeRatio.value,
            unit: "percent",
            analysisUnit: "payment_session",
            sampleSize: adjustedFeeRatio.sampleSize,
            disclosure: ADJUSTED_FEE_DISCLOSURE,
            limitations: [
              ...limitations,
              ADJUSTED_FEE_DISCLOSURE.message,
              "Missing adjusted_fee values are excluded from both numerator and denominator.",
            ],
          },
          period,
        ),
      );
    }
  }
  return metrics;
};

export const buildMerchantSegments = (
  attempts: readonly PaymentAttempt[],
  filters: FilterState,
  provenance: AnalysisProvenance,
  sourceSessions?: readonly PaymentSession[],
): Segment[] => {
  const scoped = applyPaymentAttemptFilters(attempts, filters);
  const sessions =
    filters.analysisUnit === "payment_attempt"
      ? buildPaymentSessions(scoped)
      : filterPaymentSessions(
          sourceSessions ?? buildPaymentSessions(attempts),
          filters,
        );
  if (sessions.length === 0) {
    return [];
  }
  const period = resolvePeriod(scoped, filters, provenance, sessions);
  const sessionsByMerchant = new Map<string, PaymentSession[]>();
  for (const session of sessions) {
    const current = sessionsByMerchant.get(session.merchantId);
    if (current === undefined) {
      sessionsByMerchant.set(session.merchantId, [session]);
    } else {
      current.push(session);
    }
  }
  const observations: MerchantSegmentObservation[] = [];
  for (const [merchantId, merchantSessions] of sessionsByMerchant) {
    const successfulSessionCount = merchantSessions.filter(
      (session) => session.outcome === "succeeded",
    ).length;
    observations.push({
      merchantId,
      sessionCount: merchantSessions.length,
      successfulSessionCount,
      successRate:
        percentage(successfulSessionCount, merchantSessions.length) ?? 0,
    });
  }
  const frequencyMedian = robustMedian(
    observations.map((observation) => observation.sessionCount),
  );
  const successMedian = robustMedian(
    observations.map((observation) => observation.successRate),
  );
  const sharedLimitations = [
    "These are descriptive median splits, not merchant scores, predictions, causal groups, or recommendations.",
    CONFOUNDING_LIMITATION,
    "Median thresholds depend on the selected merchant population and period; membership can change when filters change.",
    "Peer thresholds use equal-merchant medians so high-volume merchants do not dominate classification; segment-wide session-weighted rates can still reflect merchant concentration.",
    filterSemanticsLimitation(filters),
  ];

  const segments: Segment[] = [];
  for (const definition of SEGMENT_DEFINITIONS) {
    const members = observations.filter(
      (observation) =>
        observation.sessionCount >= frequencyMedian ===
          definition.frequencyAtOrAboveMedian &&
        observation.successRate >= successMedian ===
          definition.successAtOrAboveMedian,
    );
    if (members.length === 0) {
      continue;
    }
    const representedSessions = members.reduce(
      (total, member) => total + member.sessionCount,
      0,
    );
    const representedSuccessfulSessions = members.reduce(
      (total, member) => total + member.successfulSessionCount,
      0,
    );
    const memberSessions = members.flatMap(
      (member) => sessionsByMerchant.get(member.merchantId) ?? [],
    );
    segments.push({
      segmentId: definition.id,
      label: definition.label,
      description: definition.description,
      memberCount: members.length,
      analysisUnit: "merchant",
      definingCharacteristics: [
        `Payment-session frequency threshold: ${round(frequencyMedian)} sessions (population median).`,
        `Observed successful-session-rate threshold: ${displayPercentage(successMedian)} (population median).`,
      ],
      metrics: [
        metric(
          {
            metricId: `${definition.id}:represented-session-count`,
            label: "Payment sessions represented",
            definition:
              "Distinct payment sessions belonging to merchants in this descriptive segment.",
            value: representedSessions,
            unit: "count",
            analysisUnit: "payment_session",
            sampleSize: representedSessions,
            limitations: [SESSION_LIMITATION],
          },
          period,
        ),
        metric(
          {
            metricId: `${definition.id}:successful-session-rate`,
            label: "Observed successful payment-session rate",
            definition:
              "Successful payment sessions divided by all payment sessions represented in this descriptive segment.",
            value: percentage(
              representedSuccessfulSessions,
              representedSessions,
            ),
            unit: "percent",
            analysisUnit: "payment_session",
            sampleSize: representedSessions,
            limitations: sharedLimitations,
          },
          period,
        ),
        ...buildSegmentOperationalMetrics(
          definition.id,
          memberSessions,
          period,
          sharedLimitations,
        ),
      ].map((item) =>
        traceMetric(item, traceFilters(filters), provenance, {
          referencePopulation: {
            populationId: `segment:${definition.id}`,
            label: definition.label,
            sampleSize: members.length,
            analysisUnit: "merchant",
            method: `Descriptive equal-merchant median split using ${round(frequencyMedian)} sessions and ${displayPercentage(successMedian)} successful-session rate as thresholds.`,
          },
        }),
      ),
      supportingEvidenceIds: [],
      limitations: [
        ...sharedLimitations,
        ...(members.length < 5
          ? [
              `This segment contains only ${members.length} merchants; interpret its descriptive aggregate cautiously.`,
            ]
          : []),
        `Source dataset: ${provenance.datasetId}.`,
      ],
    });
  }

  return segments;
};
