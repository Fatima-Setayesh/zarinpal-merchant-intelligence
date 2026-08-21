export type AnalysisUnit = "payment_session" | "payment_attempt";

export type PaymentAttemptStatus = "succeeded" | "failed" | "pending";

export type ChallengeSessionStatus =
  | "Failed"
  | "Verified"
  | "Paid"
  | "Reversed";
export type ChallengeAttemptStatus =
  "Failed" | "InBank" | "Verified" | "NoAttempt" | "Paid" | "Reversed";

export const CHALLENGE_DATA_COLUMNS = [
  "session_key",
  "try_seq",
  "terminal_key",
  "merchant_key",
  "category_id",
  "category_title",
  "amount",
  "adjusted_fee",
  "session_status",
  "try_status",
  "switch_response_code",
  "psp_code",
  "issuer_bank_code",
  "payer_card_key",
  "verify_type",
  "init_time_ms",
  "verify_time_ms",
  "created_at",
  "try_created_at",
  "verified_at",
  "settled_at",
  "expire_in",
] as const;

const RFC3339_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-](\d{2}):(\d{2}))$/u;

export const parseRfc3339Timestamp = (value: string): number | null => {
  const match = RFC3339_TIMESTAMP_PATTERN.exec(value);
  if (match === null) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const offsetHour = match[7] === undefined ? undefined : Number(match[7]);
  const offsetMinute = match[8] === undefined ? undefined : Number(match[8]);
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    hour > 23 ||
    minute > 59 ||
    second > 59 ||
    (offsetHour !== undefined && offsetHour > 23) ||
    (offsetMinute !== undefined && offsetMinute > 59)
  ) {
    return null;
  }
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  calendar.setUTCHours(hour, minute, second, 0);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

export interface MerchantCategory {
  id: string;
  label: string;
}

export interface PaymentAttempt {
  attemptId: string;
  sessionId: string;
  merchantId: string;
  occurredAt: string;
  amount: number;
  currency: string;
  status: PaymentAttemptStatus;
  /** Confidentially transformed; never Zarinpal's real fee or an absolute pricing value. */
  adjustedFee?: number | null;
  terminalId?: string;
  issuer?: string;
  merchantDisplayName?: string;
  merchantCategory?: MerchantCategory;
  attemptSequence?: number;
  sourceSessionStatus?: ChallengeSessionStatus;
  sourceAttemptStatus?: ChallengeAttemptStatus;
  switchResponseCode?: string;
  pspCode?: string;
  payerCardKey?: string;
  verifyType?: string;
  initTimeMs?: number;
  verifyTimeMs?: number;
  sessionCreatedAt?: string;
  verifiedAt?: string;
  settledAt?: string;
  expiresAt?: string;
}

export interface PaymentSession {
  sessionId: string;
  merchantId: string;
  observedAt: string;
  firstAttemptAt?: string;
  lastAttemptAt?: string;
  representativeAmount: number;
  currency: string;
  outcome: PaymentAttemptStatus;
  attempts: PaymentAttempt[];
  /** Confidentially transformed; never Zarinpal's real fee or an absolute pricing value. */
  adjustedFee?: number | null;
  terminalId?: string;
  issuer?: string;
  merchantCategory?: MerchantCategory;
  sourceSessionStatus?: ChallengeSessionStatus;
  sourceAttemptStatus?: "NoAttempt";
}

export interface DateRange {
  from: string;
  to: string;
  timezone: string;
}

export interface FilterDimension {
  key: string;
  operator: "include" | "exclude";
  values: string[];
}

export interface FilterState {
  dateRange?: DateRange;
  merchantIds?: string[];
  segmentIds?: string[];
  analysisUnit?: AnalysisUnit;
  dimensions?: FilterDimension[];
}

export interface PageRequest {
  cursor?: string;
  limit?: number;
}

export interface PageResult<T> {
  items: T[];
  nextCursor: string | null;
  totalCount?: number;
}

export interface InsightQuery {
  filters: FilterState;
  page: PageRequest;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  };
}

export interface FilteredResult<T> {
  appliedFilters: FilterState;
  page: PageResult<T>;
  warnings: string[];
}

export interface Metric {
  metricId: string;
  label: string;
  definition: string;
  value: number | null;
  unit: string;
  analysisUnit: AnalysisUnit;
  period: DateRange;
  sampleSize?: number;
  comparison?: {
    referenceLabel: string;
    referenceValue: number | null;
    delta: number | null;
  };
  disclosure?: {
    code: string;
    message: string;
  };
  limitations: string[];
}

export interface Evidence {
  evidenceId: string;
  metric: Metric;
  filters: FilterState;
  dateRange: DateRange;
  sample: {
    size: number;
    analysisUnit: AnalysisUnit;
  };
  formula: {
    label: string;
    explanation: string;
    methodologyReference?: string;
  };
  comparedGroups?: Array<{
    groupId: string;
    label: string;
    sampleSize?: number;
  }>;
  missingDataHandling: string;
  limitations: string[];
  sourceReference?: string;
}

export interface Recommendation {
  recommendationId: string;
  action: string;
  rationale: string;
  expectedImpact?: {
    statement: string;
    metricId?: string;
  };
  supportingEvidenceIds: string[];
  caveats: string[];
}

export interface Insight {
  insightId: string;
  merchantId: string;
  title: string;
  observation: string;
  businessImpact: string;
  priority?: string;
  evidence: Evidence[];
  recommendations: Recommendation[];
  limitations: string[];
  generatedAt?: string;
}

export interface MerchantSummary {
  merchantId: string;
  displayName: string;
  category?: MerchantCategory;
  reportingPeriod: DateRange;
  analysisUnit: AnalysisUnit;
  headlineMetrics: Metric[];
  availableInsightCount?: number;
  limitations: string[];
}

export interface Segment {
  segmentId: string;
  label: string;
  description: string;
  memberCount: number;
  analysisUnit: "merchant";
  definingCharacteristics: string[];
  metrics: Metric[];
  supportingEvidenceIds: string[];
  limitations: string[];
}

export interface ChartSeries {
  seriesId: string;
  label: string;
  metricId: string;
  unit: string;
  analysisUnit: AnalysisUnit | "merchant";
  group?: { id: string; label: string };
  points: Array<{
    x: string | number;
    y: number | null;
    evidenceId?: string;
  }>;
  limitations: string[];
}

export interface AnalysisProvenance {
  datasetId: string;
  sourceReference?: string;
  methodologyReference?: string;
  timezone?: string;
}

export interface ValidationIssue {
  path: string;
  message: string;
}

export class DomainValidationError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[]) {
    super(message);
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}

export interface ChallengeRowMappingResult {
  readonly attempt: PaymentAttempt | null;
  readonly session: PaymentSession | null;
  readonly exclusionReason: "no_attempt" | null;
  readonly missingAdjustedFee: boolean;
  readonly missingIssuer: boolean;
}

const CHALLENGE_TIMESTAMP_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?$/u;
const CHALLENGE_OFFSET_PATTERN = /^([+-])(\d{2}):(\d{2})$/u;

export const normalizeChallengeDataUtcOffset = (value: string): string => {
  const normalized = value.trim().toUpperCase();
  if (normalized === "Z") {
    return normalized;
  }
  const match = CHALLENGE_OFFSET_PATTERN.exec(normalized);
  const hours = Number(match?.[2]);
  const minutes = Number(match?.[3]);
  if (
    match === null ||
    hours > 14 ||
    minutes > 59 ||
    (hours === 14 && minutes !== 0)
  ) {
    throw new DomainValidationError("Invalid challenge-data UTC offset", [
      {
        path: "challengeDataUtcOffset",
        message: "must be Z or a UTC offset from -14:00 through +14:00",
      },
    ]);
  }
  return normalized;
};

export const validateChallengeCsvHeader = (fields: readonly string[]): void => {
  const normalized = fields.map((field, index) =>
    index === 0 ? field.replace(/^\uFEFF/u, "") : field,
  );
  if (
    normalized.length !== CHALLENGE_DATA_COLUMNS.length ||
    normalized.some((field, index) => field !== CHALLENGE_DATA_COLUMNS[index])
  ) {
    throw new DomainValidationError("Invalid challenge CSV schema", [
      {
        path: "challengeData.header",
        message: `must exactly match: ${CHALLENGE_DATA_COLUMNS.join(",")}`,
      },
    ]);
  }
};

const challengePath = (rowNumber: number, column: string): string =>
  `challengeData.rows[${rowNumber}].${column}`;

const isMissingChallengeValue = (value: string | undefined): boolean => {
  const normalized = value?.trim();
  return (
    normalized === undefined ||
    normalized.length === 0 ||
    normalized.toLowerCase() === "null" ||
    normalized === "\\N"
  );
};

const readChallengeRequiredString = (
  value: string | undefined,
  rowNumber: number,
  column: string,
): string => {
  if (isMissingChallengeValue(value)) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must be a non-empty value",
      },
    ]);
  }
  return value?.trim() ?? "";
};

const readChallengeOptionalString = (
  value: string | undefined,
): string | undefined =>
  isMissingChallengeValue(value) ? undefined : value?.trim();

const readChallengeInteger = (
  value: string | undefined,
  rowNumber: number,
  column: string,
  required: boolean,
): number | undefined => {
  if (isMissingChallengeValue(value)) {
    if (!required) {
      return undefined;
    }
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must be a non-negative safe integer",
      },
    ]);
  }
  const normalized = value?.trim() ?? "";
  const parsed = Number(normalized);
  if (!/^\d+$/u.test(normalized) || !Number.isSafeInteger(parsed)) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must be a non-negative safe integer",
      },
    ]);
  }
  return parsed;
};

const readChallengeTimestamp = (
  value: string | undefined,
  rowNumber: number,
  column: string,
  utcOffset: string,
  required: boolean,
): string | undefined => {
  if (isMissingChallengeValue(value)) {
    if (!required) {
      return undefined;
    }
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must contain a challenge timestamp",
      },
    ]);
  }
  const normalized = value?.trim() ?? "";
  if (!CHALLENGE_TIMESTAMP_PATTERN.test(normalized)) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must use YYYY-MM-DD HH:mm:ss with optional milliseconds",
      },
    ]);
  }
  const timestamp = `${normalized.replace(" ", "T")}${utcOffset}`;
  const parsed = parseRfc3339Timestamp(timestamp);
  if (parsed === null) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, column),
        message: "must contain a valid calendar date and time",
      },
    ]);
  }
  return new Date(parsed).toISOString();
};

export const mapChallengeCsvRow = (
  fields: readonly string[],
  rowNumber: number,
  sourceUtcOffset: string,
): ChallengeRowMappingResult => {
  if (fields.length !== CHALLENGE_DATA_COLUMNS.length) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: `challengeData.rows[${rowNumber}]`,
        message: `must contain exactly ${CHALLENGE_DATA_COLUMNS.length} columns`,
      },
    ]);
  }
  const utcOffset = normalizeChallengeDataUtcOffset(sourceUtcOffset);
  const sessionKey = readChallengeRequiredString(
    fields[0],
    rowNumber,
    "session_key",
  );
  const attemptSequence = readChallengeInteger(
    fields[1],
    rowNumber,
    "try_seq",
    true,
  );
  const terminalId = readChallengeOptionalString(fields[2]);
  const merchantId = readChallengeRequiredString(
    fields[3],
    rowNumber,
    "merchant_key",
  );
  const categoryId = readChallengeOptionalString(fields[4]);
  const categoryLabel = readChallengeOptionalString(fields[5]);
  if ((categoryId === undefined) !== (categoryLabel === undefined)) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, "category_id"),
        message: "category_id and category_title must be present together",
      },
    ]);
  }
  const amount = readChallengeInteger(fields[6], rowNumber, "amount", true);
  const adjustedFee = readChallengeInteger(
    fields[7],
    rowNumber,
    "adjusted_fee",
    false,
  );
  const rawSessionStatus = readChallengeRequiredString(
    fields[8],
    rowNumber,
    "session_status",
  );
  if (
    rawSessionStatus !== "Failed" &&
    rawSessionStatus !== "Verified" &&
    rawSessionStatus !== "Paid" &&
    rawSessionStatus !== "Reversed"
  ) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, "session_status"),
        message: "must be Failed, Verified, Paid, or Reversed",
      },
    ]);
  }
  const sourceSessionStatus: ChallengeSessionStatus = rawSessionStatus;
  const rawAttemptStatus = readChallengeRequiredString(
    fields[9],
    rowNumber,
    "try_status",
  );
  if (
    rawAttemptStatus !== "Failed" &&
    rawAttemptStatus !== "InBank" &&
    rawAttemptStatus !== "Verified" &&
    rawAttemptStatus !== "NoAttempt" &&
    rawAttemptStatus !== "Paid" &&
    rawAttemptStatus !== "Reversed"
  ) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, "try_status"),
        message:
          "must be Failed, InBank, Verified, NoAttempt, Paid, or Reversed",
      },
    ]);
  }
  const sourceAttemptStatus: ChallengeAttemptStatus = rawAttemptStatus;
  const switchResponseCode = readChallengeOptionalString(fields[10]);
  const pspCode = readChallengeOptionalString(fields[11]);
  const issuer = readChallengeOptionalString(fields[12]);
  const payerCardKey = readChallengeOptionalString(fields[13]);
  const verifyType = readChallengeOptionalString(fields[14]);
  const initTimeMs = readChallengeInteger(
    fields[15],
    rowNumber,
    "init_time_ms",
    false,
  );
  const verifyTimeMs = readChallengeInteger(
    fields[16],
    rowNumber,
    "verify_time_ms",
    false,
  );
  const sessionCreatedAt = readChallengeTimestamp(
    fields[17],
    rowNumber,
    "created_at",
    utcOffset,
    true,
  );
  const attemptCreatedAt = readChallengeTimestamp(
    fields[18],
    rowNumber,
    "try_created_at",
    utcOffset,
    false,
  );
  const verifiedAt = readChallengeTimestamp(
    fields[19],
    rowNumber,
    "verified_at",
    utcOffset,
    false,
  );
  const settledAt = readChallengeTimestamp(
    fields[20],
    rowNumber,
    "settled_at",
    utcOffset,
    false,
  );
  const expiresAt = readChallengeTimestamp(
    fields[21],
    rowNumber,
    "expire_in",
    utcOffset,
    false,
  );

  if (sourceAttemptStatus === "NoAttempt") {
    if (
      attemptSequence !== 0 ||
      attemptCreatedAt !== undefined ||
      sourceSessionStatus !== "Failed"
    ) {
      throw new DomainValidationError("Invalid challenge dataset row", [
        {
          path: challengePath(rowNumber, "try_status"),
          message:
            "NoAttempt rows must be failed sessions with try_seq 0 and no try_created_at value",
        },
      ]);
    }
    if (amount === undefined || sessionCreatedAt === undefined) {
      throw new DomainValidationError("Invalid challenge dataset row", [
        {
          path: `challengeData.rows[${rowNumber}]`,
          message: "is missing required session values",
        },
      ]);
    }
    return {
      attempt: null,
      session: {
        sessionId: sessionKey,
        merchantId,
        observedAt: sessionCreatedAt,
        representativeAmount: amount,
        currency: "IRR",
        outcome: "failed",
        attempts: [],
        adjustedFee: adjustedFee ?? null,
        sourceSessionStatus,
        sourceAttemptStatus,
        ...(terminalId !== undefined ? { terminalId } : {}),
        ...(issuer !== undefined ? { issuer } : {}),
        ...(categoryId !== undefined && categoryLabel !== undefined
          ? { merchantCategory: { id: categoryId, label: categoryLabel } }
          : {}),
      },
      exclusionReason: "no_attempt",
      missingAdjustedFee: adjustedFee === undefined,
      missingIssuer: issuer === undefined,
    };
  }
  if (attemptSequence === undefined || attemptSequence < 1) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, "try_seq"),
        message: "must be at least 1 for a payment-attempt row",
      },
    ]);
  }
  if (attemptCreatedAt === undefined) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: challengePath(rowNumber, "try_created_at"),
        message: "is required for a payment-attempt row",
      },
    ]);
  }
  if (amount === undefined || sessionCreatedAt === undefined) {
    throw new DomainValidationError("Invalid challenge dataset row", [
      {
        path: `challengeData.rows[${rowNumber}]`,
        message: "is missing required mapped values",
      },
    ]);
  }

  const status: PaymentAttemptStatus =
    sourceAttemptStatus === "Verified" || sourceAttemptStatus === "Paid"
      ? "succeeded"
      : sourceAttemptStatus === "Failed" || sourceAttemptStatus === "Reversed"
        ? "failed"
        : "pending";
  return {
    attempt: {
      attemptId: `challenge:${sessionKey}:try:${attemptSequence}`,
      sessionId: sessionKey,
      merchantId,
      occurredAt: attemptCreatedAt,
      amount,
      currency: "IRR",
      status,
      adjustedFee: adjustedFee ?? null,
      attemptSequence,
      sourceSessionStatus,
      sourceAttemptStatus,
      sessionCreatedAt,
      ...(terminalId !== undefined ? { terminalId } : {}),
      ...(issuer !== undefined ? { issuer } : {}),
      ...(categoryId !== undefined && categoryLabel !== undefined
        ? { merchantCategory: { id: categoryId, label: categoryLabel } }
        : {}),
      ...(switchResponseCode !== undefined ? { switchResponseCode } : {}),
      ...(pspCode !== undefined ? { pspCode } : {}),
      ...(payerCardKey !== undefined ? { payerCardKey } : {}),
      ...(verifyType !== undefined ? { verifyType } : {}),
      ...(initTimeMs !== undefined ? { initTimeMs } : {}),
      ...(verifyTimeMs !== undefined ? { verifyTimeMs } : {}),
      ...(verifiedAt !== undefined ? { verifiedAt } : {}),
      ...(settledAt !== undefined ? { settledAt } : {}),
      ...(expiresAt !== undefined ? { expiresAt } : {}),
    },
    session: null,
    exclusionReason: null,
    missingAdjustedFee: adjustedFee === undefined,
    missingIssuer: issuer === undefined,
  };
};

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readAlias = (
  record: UnknownRecord,
  names: readonly string[],
): unknown => {
  for (const name of names) {
    if (Object.prototype.hasOwnProperty.call(record, name)) {
      return record[name];
    }
  }

  return undefined;
};

const readRequiredString = (
  record: UnknownRecord,
  names: readonly string[],
  path: string,
  issues: ValidationIssue[],
): string | undefined => {
  const value = readAlias(record, names);
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "must be a non-empty string" });
    return undefined;
  }

  return value.trim();
};

const readOptionalString = (
  record: UnknownRecord,
  names: readonly string[],
  path: string,
  issues: ValidationIssue[],
): string | undefined => {
  const value = readAlias(record, names);
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({ path, message: "must be a non-empty string when provided" });
    return undefined;
  }

  return value.trim();
};

const readFiniteNumber = (
  record: UnknownRecord,
  names: readonly string[],
  path: string,
  issues: ValidationIssue[],
  nullable = false,
): number | null | undefined => {
  const value = readAlias(record, names);
  if (value === undefined) {
    return undefined;
  }
  if (value === null && nullable) {
    return null;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    issues.push({ path, message: "must be a finite number" });
    return undefined;
  }

  return value;
};

const normalizeStatus = (
  value: unknown,
  path: string,
  issues: ValidationIssue[],
): PaymentAttemptStatus | undefined => {
  if (typeof value !== "string") {
    issues.push({ path, message: "must be succeeded, failed, or pending" });
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (
    normalized === "succeeded" ||
    normalized === "success" ||
    normalized === "successful" ||
    normalized === "paid"
  ) {
    return "succeeded";
  }
  if (normalized === "failed" || normalized === "failure") {
    return "failed";
  }
  if (normalized === "pending") {
    return "pending";
  }

  issues.push({ path, message: "must be succeeded, failed, or pending" });
  return undefined;
};

const parseCategory = (
  record: UnknownRecord,
  basePath: string,
  issues: ValidationIssue[],
): MerchantCategory | undefined => {
  const value = readAlias(record, ["merchantCategory", "merchant_category"]);
  if (value !== undefined) {
    if (!isRecord(value)) {
      issues.push({
        path: `${basePath}.merchantCategory`,
        message: "must be an object with id and label",
      });
      return undefined;
    }
    const id = readRequiredString(
      value,
      ["id"],
      `${basePath}.merchantCategory.id`,
      issues,
    );
    const label = readRequiredString(
      value,
      ["label"],
      `${basePath}.merchantCategory.label`,
      issues,
    );
    return id !== undefined && label !== undefined ? { id, label } : undefined;
  }

  const categoryId = readOptionalString(
    record,
    ["merchantCategoryId", "merchant_category_id"],
    `${basePath}.merchantCategoryId`,
    issues,
  );
  const categoryLabel = readOptionalString(
    record,
    ["merchantCategoryLabel", "merchant_category_label"],
    `${basePath}.merchantCategoryLabel`,
    issues,
  );
  if ((categoryId === undefined) !== (categoryLabel === undefined)) {
    issues.push({
      path: `${basePath}.merchantCategory`,
      message: "category id and label must be provided together",
    });
    return undefined;
  }

  return categoryId !== undefined && categoryLabel !== undefined
    ? { id: categoryId, label: categoryLabel }
    : undefined;
};

const parseAttempt = (
  value: unknown,
  index: number,
  issues: ValidationIssue[],
): PaymentAttempt | undefined => {
  const basePath = `paymentAttempts[${index}]`;
  if (!isRecord(value)) {
    issues.push({ path: basePath, message: "must be an object" });
    return undefined;
  }

  const issueCount = issues.length;
  const attemptId = readRequiredString(
    value,
    ["attemptId", "attempt_id"],
    `${basePath}.attemptId`,
    issues,
  );
  const sessionId = readRequiredString(
    value,
    ["sessionId", "session_id", "paymentSessionId", "payment_session_id"],
    `${basePath}.sessionId`,
    issues,
  );
  const merchantId = readRequiredString(
    value,
    ["merchantId", "merchant_id"],
    `${basePath}.merchantId`,
    issues,
  );
  const occurredAt = readRequiredString(
    value,
    ["occurredAt", "occurred_at", "createdAt", "created_at"],
    `${basePath}.occurredAt`,
    issues,
  );
  if (occurredAt !== undefined && parseRfc3339Timestamp(occurredAt) === null) {
    issues.push({
      path: `${basePath}.occurredAt`,
      message: "must be an RFC3339 date-time with Z or an explicit UTC offset",
    });
  }
  const amount = readFiniteNumber(
    value,
    ["amount"],
    `${basePath}.amount`,
    issues,
  );
  if (
    amount !== undefined &&
    amount !== null &&
    (!Number.isSafeInteger(amount) || amount < 0)
  ) {
    issues.push({
      path: `${basePath}.amount`,
      message:
        "must be a non-negative safe integer in the currency's smallest unit",
    });
  }
  const currency = readRequiredString(
    value,
    ["currency", "currency_code"],
    `${basePath}.currency`,
    issues,
  );
  const status = normalizeStatus(
    readAlias(value, ["status"]),
    `${basePath}.status`,
    issues,
  );
  const adjustedFee = readFiniteNumber(
    value,
    ["adjustedFee", "adjusted_fee"],
    `${basePath}.adjustedFee`,
    issues,
    true,
  );
  if (
    typeof adjustedFee === "number" &&
    Math.abs(adjustedFee) > Number.MAX_SAFE_INTEGER
  ) {
    issues.push({
      path: `${basePath}.adjustedFee`,
      message: "must be within JavaScript's safe numeric range",
    });
  }
  const merchantDisplayName = readOptionalString(
    value,
    ["merchantDisplayName", "merchant_display_name"],
    `${basePath}.merchantDisplayName`,
    issues,
  );
  const terminalId = readOptionalString(
    value,
    ["terminalId", "terminal_id"],
    `${basePath}.terminalId`,
    issues,
  );
  const issuer = readOptionalString(
    value,
    ["issuer", "bank"],
    `${basePath}.issuer`,
    issues,
  );
  const merchantCategory = parseCategory(value, basePath, issues);

  if (
    issues.length !== issueCount ||
    attemptId === undefined ||
    sessionId === undefined ||
    merchantId === undefined ||
    occurredAt === undefined ||
    amount === undefined ||
    amount === null ||
    currency === undefined ||
    status === undefined
  ) {
    return undefined;
  }

  return {
    attemptId,
    sessionId,
    merchantId,
    occurredAt,
    amount,
    currency: currency.toUpperCase(),
    status,
    ...(adjustedFee !== undefined ? { adjustedFee } : {}),
    ...(terminalId !== undefined ? { terminalId } : {}),
    ...(issuer !== undefined ? { issuer } : {}),
    ...(merchantDisplayName !== undefined ? { merchantDisplayName } : {}),
    ...(merchantCategory !== undefined ? { merchantCategory } : {}),
  };
};

export const parsePaymentAttempts = (value: unknown): PaymentAttempt[] => {
  const document = isRecord(value) ? value : undefined;
  const entries = Array.isArray(value)
    ? value
    : readAlias(document ?? {}, [
        "paymentAttempts",
        "payment_attempts",
        "attempts",
      ]);
  if (!Array.isArray(entries)) {
    throw new DomainValidationError("Invalid payment-attempt document", [
      {
        path: "paymentAttempts",
        message: "must be an array or an array-valued document field",
      },
    ]);
  }

  const issues: ValidationIssue[] = [];
  const attempts: PaymentAttempt[] = [];
  const attemptIds = new Set<string>();
  for (let index = 0; index < entries.length; index += 1) {
    const attempt = parseAttempt(entries[index], index, issues);
    if (attempt === undefined) {
      continue;
    }
    if (attemptIds.has(attempt.attemptId)) {
      issues.push({
        path: `paymentAttempts[${index}].attemptId`,
        message: `duplicates attempt id ${attempt.attemptId}`,
      });
      continue;
    }
    attemptIds.add(attempt.attemptId);
    attempts.push(attempt);
  }

  if (issues.length > 0) {
    throw new DomainValidationError("Invalid payment attempts", issues);
  }

  return attempts;
};

export const parsePaymentAttemptsJson = (json: string): PaymentAttempt[] => {
  let value: unknown;
  try {
    value = JSON.parse(json) as unknown;
  } catch {
    throw new DomainValidationError("Invalid JSON payment-attempt document", [
      { path: "$", message: "must contain valid JSON" },
    ]);
  }

  return parsePaymentAttempts(value);
};

export const buildPaymentSessions = (
  attempts: readonly PaymentAttempt[],
  preservedSessions: readonly PaymentSession[] = [],
): PaymentSession[] => {
  const grouped = new Map<string, PaymentAttempt[]>();
  const seenAttemptIds = new Set<string>();

  for (const attempt of attempts) {
    if (seenAttemptIds.has(attempt.attemptId)) {
      throw new DomainValidationError("Duplicate payment attempt", [
        {
          path: "attemptId",
          message: `duplicates attempt id ${attempt.attemptId}`,
        },
      ]);
    }
    seenAttemptIds.add(attempt.attemptId);
    const existing = grouped.get(attempt.sessionId);
    if (existing === undefined) {
      grouped.set(attempt.sessionId, [attempt]);
    } else {
      existing.push(attempt);
    }
  }

  const sessions: PaymentSession[] = [];
  for (const [sessionId, sessionAttempts] of grouped) {
    sessionAttempts.sort((left, right) => {
      const timeDelta =
        Date.parse(left.occurredAt) - Date.parse(right.occurredAt);
      return timeDelta !== 0
        ? timeDelta
        : left.attemptId.localeCompare(right.attemptId);
    });
    const first = sessionAttempts[0];
    const last = sessionAttempts[sessionAttempts.length - 1];
    if (first === undefined || last === undefined) {
      continue;
    }
    if (
      sessionAttempts.some((attempt) => attempt.merchantId !== first.merchantId)
    ) {
      throw new DomainValidationError("A payment session spans merchants", [
        {
          path: `session.${sessionId}.merchantId`,
          message: "all attempts in a session must belong to one merchant",
        },
      ]);
    }
    if (
      sessionAttempts.some((attempt) => attempt.currency !== first.currency)
    ) {
      throw new DomainValidationError("A payment session spans currencies", [
        {
          path: `session.${sessionId}.currency`,
          message: "all attempts in a session must use one currency",
        },
      ]);
    }

    const successfulAttempts = sessionAttempts.filter(
      (attempt) => attempt.status === "succeeded",
    );
    const successfulAttempt = successfulAttempts[0];
    const representativeCandidates =
      successfulAttempt !== undefined
        ? successfulAttempts.filter(
            (attempt) =>
              Date.parse(attempt.occurredAt) ===
              Date.parse(successfulAttempt.occurredAt),
          )
        : sessionAttempts.filter(
            (attempt) =>
              Date.parse(attempt.occurredAt) === Date.parse(first.occurredAt),
          );
    if (
      representativeCandidates.length > 1 &&
      new Set(representativeCandidates.map((attempt) => attempt.amount)).size >
        1
    ) {
      throw new DomainValidationError(
        "A payment session has an ambiguous representative amount",
        [
          {
            path: `session.${sessionId}.occurredAt`,
            message:
              "tied candidate attempts must have the same amount when no source sequence is available",
          },
        ],
      );
    }
    if (
      successfulAttempt !== undefined &&
      representativeCandidates.length > 1 &&
      new Set(
        representativeCandidates.map((attempt) =>
          typeof attempt.adjustedFee === "number"
            ? `number:${attempt.adjustedFee}`
            : "missing",
        ),
      ).size > 1
    ) {
      throw new DomainValidationError(
        "A payment session has an ambiguous successful adjusted fee",
        [
          {
            path: `session.${sessionId}.occurredAt`,
            message:
              "tied successful attempts must have the same adjusted fee or missingness when no source sequence is available",
          },
        ],
      );
    }
    const outcome: PaymentAttemptStatus =
      successfulAttempt !== undefined
        ? "succeeded"
        : sessionAttempts.some((attempt) => attempt.status === "pending")
          ? "pending"
          : "failed";

    sessions.push({
      sessionId,
      merchantId: first.merchantId,
      observedAt: first.occurredAt,
      firstAttemptAt: first.occurredAt,
      lastAttemptAt: last.occurredAt,
      representativeAmount: (successfulAttempt ?? first).amount,
      currency: first.currency,
      outcome,
      attempts: [...sessionAttempts],
    });
  }

  const sessionIds = new Set(sessions.map((session) => session.sessionId));
  for (const session of preservedSessions) {
    if (
      session.sessionId.trim().length === 0 ||
      session.merchantId.trim().length === 0 ||
      session.attempts.length !== 0 ||
      session.sourceAttemptStatus !== "NoAttempt" ||
      session.sourceSessionStatus !== "Failed" ||
      session.outcome !== "failed" ||
      session.currency !== "IRR" ||
      !Number.isSafeInteger(session.representativeAmount) ||
      session.representativeAmount < 0 ||
      session.firstAttemptAt !== undefined ||
      session.lastAttemptAt !== undefined ||
      parseRfc3339Timestamp(session.observedAt) === null
    ) {
      throw new DomainValidationError("Invalid preserved payment session", [
        {
          path: `session.${session.sessionId}`,
          message:
            "a preserved NoAttempt session must use its real identifiers, IRR amount and source creation time, be failed, and contain no attempts or attempt timestamps",
        },
      ]);
    }
    if (sessionIds.has(session.sessionId)) {
      throw new DomainValidationError("Duplicate payment session", [
        {
          path: `session.${session.sessionId}`,
          message: "duplicates a payment session identifier",
        },
      ]);
    }
    sessionIds.add(session.sessionId);
    sessions.push({
      ...session,
      attempts: [],
      ...(session.merchantCategory !== undefined
        ? { merchantCategory: { ...session.merchantCategory } }
        : {}),
    });
  }

  return sessions.sort((left, right) => {
    const timeDelta = Date.parse(left.observedAt) - Date.parse(right.observedAt);
    return timeDelta !== 0
      ? timeDelta
      : left.sessionId.localeCompare(right.sessionId);
  });
};
