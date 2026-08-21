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
  "Payment sessions are grouped by sessionId; repeated payment attempts are retained as attempts and are not counted as additional sessions.";

const filterSemanticsLimitation = (filters: FilterState): string =>
  (filters.analysisUnit ?? "payment_session") === "payment_session"
    ? "Payment-session filters preserve every attempt in a selected session. Date scope uses the session's first observed attempt; status uses its derived outcome; terminal and issuer match when any attempt in the session matches."
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

const stableMean = (values: readonly number[], path: string): number => {
  let mean = 0;
  values.forEach((value, index) => {
    mean += (value - mean) / (index + 1);
  });
  if (!Number.isFinite(mean)) {
    throw new DomainValidationError("Unsafe analytical aggregate", [
      { path, message: "must produce a finite mean" },
    ]);
  }
  return mean;
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
      break;
    case "terminal":
      candidates = session.attempts.flatMap((attempt) =>
        attempt.terminalId === undefined ? [] : [attempt.terminalId],
      );
      break;
    case "issuer":
      candidates = session.attempts.flatMap((attempt) =>
        attempt.issuer === undefined ? [] : [attempt.issuer],
      );
      break;
    default:
      return true;
  }
  const matches = candidates.some((candidate) => values.has(candidate));
  return dimension.operator === "include" ? matches : !matches;
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
      fullSessions
        .filter((session) => {
          const firstAttemptAt = Date.parse(session.firstAttemptAt);
          return (
            (merchantIds === undefined ||
              merchantIds.has(session.merchantId)) &&
            (from === undefined || firstAttemptAt >= from) &&
            (to === undefined || firstAttemptAt <= to) &&
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
        })
        .map((session) => session.sessionId),
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

const resolvePeriod = (
  attempts: readonly PaymentAttempt[],
  filters: FilterState,
  provenance: AnalysisProvenance,
): DateRange => {
  if (filters.dateRange !== undefined) {
    return { ...filters.dateRange };
  }
  if (attempts.length === 0) {
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
  const timezone = provenance.timezone ?? "UTC";
  validateTimezone(timezone);
  return {
    from: new Date(earliest).toISOString(),
    to: new Date(latest).toISOString(),
    timezone,
  };
};

const evidenceFilters = (
  filters: FilterState,
  merchantId: string,
): FilterState => ({
  ...filters,
  merchantIds: [merchantId],
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

const countAvailableInsights = (
  sessions: readonly PaymentSession[],
): number => {
  const failed = sessions.some((session) => session.outcome === "failed");
  const initiallyUnsuccessful = sessions.some(isInitiallyUnsuccessfulRetry);
  return Number(failed) + Number(initiallyUnsuccessful);
};

export const buildMerchantSummary = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
): MerchantSummary => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const period = resolvePeriod(scoped, filters, provenance);
  const sessions = buildPaymentSessions(scoped);
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
  const limitations = [
    ...summaryLimitations(scoped, sessions),
    filterSemanticsLimitation(filters),
  ];
  const identity = merchantIdentity(scoped, merchantId);

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
        limitations: [SESSION_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "successful-session-rate",
        label: "Successful payment-session rate",
        definition:
          "Payment sessions with at least one successful attempt divided by all payment sessions in scope.",
        value: percentage(succeededSessionCount, sessions.length),
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
        limitations: [SESSION_LIMITATION, DESCRIPTIVE_LIMITATION],
      },
      period,
    ),
    metric(
      {
        metricId: "failed-session-count",
        label: "Failed payment sessions",
        definition: "Payment sessions whose observed attempts are all failed.",
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
          "Payment sessions whose observed attempts are all failed, divided by all payment sessions in scope.",
        value: percentage(failedSessionCount, sessions.length),
        unit: "percent",
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
        value: percentage(retrySessions.length, sessions.length),
        unit: "percent",
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

  const currencies = unique(scoped.map((attempt) => attempt.currency)).sort();
  for (const currency of currencies) {
    const currencySessions = sessions.filter(
      (session) => session.currency === currency,
    );
    const successfulSessions = currencySessions.filter(
      (session) => session.outcome === "succeeded",
    );
    headlineMetrics.push(
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
    );

    const feeValues = successfulSessions.flatMap((session) => {
      const fee = successfulAttempt(session)?.adjustedFee;
      return typeof fee === "number" ? [fee] : [];
    });
    if (feeValues.length > 0) {
      headlineMetrics.push(
        metric(
          {
            metricId: `average-adjusted-fee-${sanitizeIdPart(currency)}`,
            label: `Average confidentially transformed adjusted fee (${currency})`,
            definition:
              "Mean available adjusted_fee value across successful payment sessions, counted once per session.",
            value: round(stableMean(feeValues, "headlineMetrics.adjustedFee")),
            unit: `transformed_${currency}`,
            analysisUnit: "payment_session",
            sampleSize: feeValues.length,
            disclosure: ADJUSTED_FEE_DISCLOSURE,
            limitations: [
              ADJUSTED_FEE_DISCLOSURE.message,
              DESCRIPTIVE_LIMITATION,
            ],
          },
          period,
        ),
      );
    }
  }

  return {
    merchantId,
    displayName: identity.displayName,
    ...(identity.category !== undefined ? { category: identity.category } : {}),
    reportingPeriod: period,
    analysisUnit: "payment_session",
    headlineMetrics,
    availableInsightCount: countAvailableInsights(sessions),
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
): Evidence => ({
  evidenceId,
  metric: evidenceMetric,
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
  limitations,
  sourceReference: sourceReference(provenance),
});

export const buildMerchantInsights = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
): Insight[] => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const period = resolvePeriod(scoped, filters, provenance);
  const sessions = buildPaymentSessions(scoped);
  const canonicalFilters = evidenceFilters(filters, merchantId);
  const insightLimitations = [
    DESCRIPTIVE_LIMITATION,
    SESSION_LIMITATION,
    CONFOUNDING_LIMITATION,
    filterSemanticsLimitation(filters),
  ];
  const insights: Insight[] = [];

  const failedSessions = sessions.filter(
    (session) => session.outcome === "failed",
  );
  if (failedSessions.length > 0) {
    const failureRate = percentage(failedSessions.length, sessions.length);
    const evidenceId = `evidence:${sanitizeIdPart(merchantId)}:failed-sessions`;
    const failureMetric = metric(
      {
        metricId: "failed-session-rate",
        label: "Payment sessions without a successful outcome",
        definition:
          "Payment sessions whose observed attempts are all failed, divided by all payment sessions in scope.",
        value: failureRate,
        unit: "percent",
        analysisUnit: "payment_session",
        sampleSize: sessions.length,
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
      "Count sessions with only failed attempts, divide by all distinct sessions in scope, then multiply by 100.",
      "Required attempt, session, merchant, timestamp, amount, currency, and status fields are runtime-validated. Pending sessions remain in the denominator and are not counted as failed.",
      insightLimitations,
      provenance,
    );
    insights.push({
      insightId: `insight:${sanitizeIdPart(merchantId)}:failed-sessions`,
      merchantId,
      title: "Some payment sessions ended without a recorded success",
      observation: `${failedSessions.length} of ${sessions.length} payment sessions (${displayPercentage(failureRate)}) contained only failed attempts in the selected scope.`,
      businessImpact:
        "These observed checkout journeys did not record a successful outcome, so reviewing their operational failure context may reveal avoidable friction.",
      evidence: [evidence],
      recommendations: [
        {
          recommendationId: `recommendation:${sanitizeIdPart(merchantId)}:review-failures`,
          action:
            "Review operational logs for the affected failed sessions and group failure reasons by time, terminal, and issuer before changing the payment flow.",
          rationale:
            "The records establish where success was absent, but not why; inspecting source failure context is the next evidence-building step.",
          supportingEvidenceIds: [evidenceId],
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
    insights.push({
      insightId: `insight:${sanitizeIdPart(merchantId)}:retry-recovery`,
      merchantId,
      title: "Retries recovered some initially unsuccessful payment sessions",
      observation: `${recovered.length} of ${initiallyUnsuccessful.length} initially unsuccessful multi-attempt sessions (${displayPercentage(recoveryRate)}) later recorded a successful attempt.`,
      businessImpact:
        "Retry behavior is associated with recovered payments in the observed records, while the data does not show that retrying itself caused the recovery.",
      evidence: [evidence],
      recommendations: [
        {
          recommendationId: `recommendation:${sanitizeIdPart(merchantId)}:monitor-retries`,
          action:
            "Preserve a clear retry path and monitor recovery by failure reason, terminal, issuer, and attempt number before testing any retry-policy change.",
          rationale:
            "Observed recoveries make retry journeys worth monitoring, but subgroup evidence is needed to determine where an intervention is appropriate.",
          supportingEvidenceIds: [evidenceId],
          caveats: [
            "This is an observed association, not proof that retries caused successful outcomes.",
          ],
        },
      ],
      limitations: retryLimitations,
    });
  }

  return insights;
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

export const buildDailyTrends = (
  attempts: readonly PaymentAttempt[],
  merchantId: string,
  filters: FilterState,
  provenance: AnalysisProvenance,
): ChartSeries[] => {
  const scoped = scopeMerchant(attempts, merchantId, filters);
  const period = resolvePeriod(scoped, filters, provenance);
  const timezone = period.timezone;
  validateTimezone(timezone);
  const sessions = buildPaymentSessions(scoped);
  const attemptCounts = new Map<string, number>();
  for (const attempt of scoped) {
    const day = dayInTimezone(attempt.occurredAt, timezone);
    attemptCounts.set(day, (attemptCounts.get(day) ?? 0) + 1);
  }
  const sessionsByDay = new Map<string, PaymentSession[]>();
  for (const session of sessions) {
    const day = dayInTimezone(session.firstAttemptAt, timezone);
    const current = sessionsByDay.get(day);
    if (current === undefined) {
      sessionsByDay.set(day, [session]);
    } else {
      current.push(session);
    }
  }
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
    points: [...attemptCounts.keys()]
      .sort()
      .map((day) => ({ x: day, y: attemptCounts.get(day) ?? 0 })),
    limitations: commonLimitations,
  };

  if (filters.analysisUnit === "payment_attempt") {
    return [attemptSeries];
  }

  return [
    {
      seriesId: `daily-payment-sessions:${sanitizeIdPart(merchantId)}`,
      label: "Daily payment sessions",
      metricId: "payment-session-count",
      unit: "count",
      analysisUnit: "payment_session",
      points: sessionDays.map((day) => ({
        x: day,
        y: sessionsByDay.get(day)?.length ?? 0,
      })),
      limitations: [
        SESSION_LIMITATION,
        ...commonLimitations,
        "Each payment session is assigned to the calendar day of its first observed attempt.",
      ],
    },
    {
      seriesId: `daily-successful-session-rate:${sanitizeIdPart(merchantId)}`,
      label: "Daily successful payment-session rate",
      metricId: "successful-session-rate",
      unit: "percent",
      analysisUnit: "payment_session",
      points: sessionDays.map((day) => {
        const daySessions = sessionsByDay.get(day) ?? [];
        return {
          x: day,
          y: percentage(
            daySessions.filter((session) => session.outcome === "succeeded")
              .length,
            daySessions.length,
          ),
        };
      }),
      limitations: [
        SESSION_LIMITATION,
        ...commonLimitations,
        "Each payment session is assigned to the calendar day of its first observed attempt.",
      ],
    },
  ];
};

const median = (values: readonly number[]): number => {
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

export const buildMerchantSegments = (
  attempts: readonly PaymentAttempt[],
  filters: FilterState,
  provenance: AnalysisProvenance,
): Segment[] => {
  const scoped = applyPaymentAttemptFilters(attempts, filters);
  if (scoped.length === 0) {
    return [];
  }
  const period = resolvePeriod(scoped, filters, provenance);
  const attemptsByMerchant = new Map<string, PaymentAttempt[]>();
  for (const attempt of scoped) {
    const current = attemptsByMerchant.get(attempt.merchantId);
    if (current === undefined) {
      attemptsByMerchant.set(attempt.merchantId, [attempt]);
    } else {
      current.push(attempt);
    }
  }
  const observations: MerchantSegmentObservation[] = [];
  for (const [merchantId, merchantAttempts] of attemptsByMerchant) {
    const sessions = buildPaymentSessions(merchantAttempts);
    const successfulSessionCount = sessions.filter(
      (session) => session.outcome === "succeeded",
    ).length;
    observations.push({
      merchantId,
      sessionCount: sessions.length,
      successfulSessionCount,
      successRate: percentage(successfulSessionCount, sessions.length) ?? 0,
    });
  }
  const frequencyMedian = median(
    observations.map((observation) => observation.sessionCount),
  );
  const successMedian = median(
    observations.map((observation) => observation.successRate),
  );
  const sharedLimitations = [
    "These are descriptive median splits, not merchant scores, predictions, causal groups, or recommendations.",
    CONFOUNDING_LIMITATION,
    "Median thresholds depend on the selected merchant population and period; membership can change when filters change.",
    "Segment rate metrics are session-weighted and can be influenced by merchants with more sessions; merchant concentration is not adjusted away.",
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
      ],
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
