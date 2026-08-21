import { createHash } from "node:crypto";

import {
  SUPPORTED_FILTER_DIMENSIONS,
  buildDailyTrends,
  buildMerchantInsights,
  buildMerchantSegments,
  buildMerchantSummary,
} from "./analytics.js";
import type {
  AnalysisProvenance,
  AnalysisUnit,
  ChartSeries,
  FilterDimension,
  FilterState,
  Insight,
  MerchantCategory,
  MerchantSummary,
  PageRequest,
  PageResult,
  PaymentAttempt,
  PaymentSession,
  Segment,
} from "./domain.js";
import { buildPaymentSessions, parseRfc3339Timestamp } from "./domain.js";
import {
  DataUnavailableError,
  NotFoundError,
  ValidationError,
} from "./errors.js";
import type {
  PaymentAttemptRepository,
  RepositorySnapshot,
} from "./repository.js";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 100;
const MAX_FILTER_OPTIONS = 100;
const MAX_FILTER_VALUES = 100;
const MAX_FILTER_VALUE_LENGTH = 256;
const SUPPORTED_DIMENSIONS = new Set<string>(SUPPORTED_FILTER_DIMENSIONS);
const CATEGORICAL_DIMENSIONS = new Set([
  "status",
  "category",
  "terminal",
  "issuer",
]);
const NUMERIC_DIMENSIONS = new Set([
  "amount_min",
  "amount_max",
  "attempt_count_min",
  "attempt_count_max",
]);
const STATUS_VALUES = new Set(["succeeded", "failed", "pending"]);

type UnknownRecord = Record<string, unknown>;

export interface DatasetProvenance extends AnalysisProvenance {
  loadedAt: string;
}

export interface ScopedResult<T> {
  data: T;
  appliedFilters: FilterState;
  warnings: string[];
  provenance: DatasetProvenance;
}

export interface PagedResult<T> {
  appliedFilters: FilterState;
  page: PageResult<T>;
  warnings: string[];
  provenance: DatasetProvenance;
}

export interface MerchantListItem {
  merchantId: string;
  displayName: string;
  category?: MerchantCategory;
}

export interface MerchantListResult {
  page: PageResult<MerchantListItem>;
  provenance: DatasetProvenance;
}

export interface FilterOption<Value extends string = string> {
  value: Value;
  label: string;
}

export type AnalysisEndpoint = "summary" | "insights" | "trends" | "segments";

export interface AnalysisUnitOption extends FilterOption<AnalysisUnit> {
  supportedEndpoints: readonly AnalysisEndpoint[];
}

export interface FilterOptions {
  dateRange: { from: string; to: string; timezone: string };
  categories: Array<FilterOption & { id: string }>;
  statuses: Array<FilterOption<"succeeded" | "failed" | "pending">>;
  terminals: FilterOption[];
  issuers: FilterOption[];
  amountRange: { minimum: number | null; maximum: number | null };
  attemptCountRange: { minimum: number | null; maximum: number | null };
  analysisUnits: AnalysisUnitOption[];
  supportedDimensions: readonly string[];
  optionLimit: number;
  truncated: {
    categories: boolean;
    terminals: boolean;
    issuers: boolean;
  };
}

export interface FilterOptionsResult {
  data: FilterOptions;
  warnings: string[];
  provenance: DatasetProvenance;
}

export interface HealthResult {
  status: "ok" | "degraded";
  data: {
    paymentDataAvailable: boolean;
  };
  warnings: string[];
}

export interface MerchantIntelligenceService {
  getHealth(): Promise<HealthResult>;
  listMerchants(parameters: URLSearchParams): Promise<MerchantListResult>;
  getFilterOptions(): Promise<FilterOptionsResult>;
  queryMerchantSummary(
    merchantId: string,
    body: unknown,
  ): Promise<ScopedResult<MerchantSummary>>;
  queryInsights(body: unknown): Promise<PagedResult<Insight>>;
  queryTrends(body: unknown): Promise<PagedResult<ChartSeries>>;
  querySegments(body: unknown): Promise<PagedResult<Segment>>;
}

export interface MerchantIntelligenceServiceOptions {
  readonly onHealthError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const assertRecord = (value: unknown, path: string): UnknownRecord => {
  if (!isRecord(value)) {
    throw new ValidationError("Request validation failed.", {
      issues: [{ path, message: "must be an object" }],
    });
  }
  return value;
};

const assertAllowedKeys = (
  record: UnknownRecord,
  keys: readonly string[],
  path: string,
): void => {
  const allowed = new Set(keys);
  const unsupported = Object.keys(record).filter((key) => !allowed.has(key));
  if (unsupported.length > 0) {
    throw new ValidationError("Request contains unsupported fields.", {
      issues: unsupported.map((key) => ({
        path: path.length === 0 ? key : `${path}.${key}`,
        message: "is not supported",
      })),
    });
  }
};

const readString = (
  value: unknown,
  path: string,
  maximumLength = MAX_FILTER_VALUE_LENGTH,
): string => {
  if (typeof value !== "string") {
    throw new ValidationError("Request validation failed.", {
      issues: [{ path, message: "must be a string" }],
    });
  }
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximumLength) {
    throw new ValidationError("Request validation failed.", {
      issues: [
        {
          path,
          message: `must contain between 1 and ${maximumLength} characters`,
        },
      ],
    });
  }
  return normalized;
};

const readStringArray = (value: unknown, path: string): string[] => {
  if (!Array.isArray(value)) {
    throw new ValidationError("Request validation failed.", {
      issues: [{ path, message: "must be an array" }],
    });
  }
  if (value.length > MAX_FILTER_VALUES) {
    throw new ValidationError("Request validation failed.", {
      issues: [
        {
          path,
          message: `must contain at most ${MAX_FILTER_VALUES} values`,
        },
      ],
    });
  }
  return [
    ...new Set(
      value.map((entry, index) => readString(entry, `${path}[${index}]`)),
    ),
  ];
};

const canonicalDate = (value: unknown, path: string): string => {
  const input = readString(value, path);
  const timestamp = parseRfc3339Timestamp(input);
  if (timestamp === null) {
    throw new ValidationError("Request validation failed.", {
      issues: [
        {
          path,
          message:
            "must be an RFC3339 date-time with Z or an explicit UTC offset",
        },
      ],
    });
  }
  return new Date(timestamp).toISOString();
};

const validateTimezone = (value: unknown): string => {
  const timezone = readString(value, "filters.dateRange.timezone", 100);
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(0);
  } catch {
    throw new ValidationError("Request validation failed.", {
      issues: [
        {
          path: "filters.dateRange.timezone",
          message: "must be a supported IANA timezone",
        },
      ],
    });
  }
  return timezone;
};

const canonicalDimension = (value: unknown, index: number): FilterDimension => {
  const path = `filters.dimensions[${index}]`;
  const record = assertRecord(value, path);
  assertAllowedKeys(record, ["key", "operator", "values"], path);
  const key = readString(record.key, `${path}.key`, 64);
  if (!SUPPORTED_DIMENSIONS.has(key)) {
    throw new ValidationError(
      "Request contains an unsupported filter dimension.",
      {
        issues: [
          {
            path: `${path}.key`,
            message: `must be one of ${SUPPORTED_FILTER_DIMENSIONS.join(", ")}`,
          },
        ],
      },
    );
  }
  if (record.operator !== "include" && record.operator !== "exclude") {
    throw new ValidationError("Request validation failed.", {
      issues: [
        {
          path: `${path}.operator`,
          message: "must be include or exclude",
        },
      ],
    });
  }
  const values = readStringArray(record.values, `${path}.values`);
  if (values.length === 0) {
    throw new ValidationError("Request validation failed.", {
      issues: [{ path: `${path}.values`, message: "must not be empty" }],
    });
  }

  if (NUMERIC_DIMENSIONS.has(key)) {
    if (record.operator !== "include" || values.length !== 1) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path,
            message:
              "numeric boundary dimensions require include with exactly one value",
          },
        ],
      });
    }
    const numericValue = Number(values[0]);
    const requiresInteger = key.startsWith("attempt_count_");
    if (
      !Number.isFinite(numericValue) ||
      numericValue < 0 ||
      (requiresInteger && !Number.isInteger(numericValue))
    ) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path: `${path}.values[0]`,
            message: requiresInteger
              ? "must be a non-negative integer"
              : "must be a non-negative number",
          },
        ],
      });
    }
  } else if (key === "status") {
    if (values.some((entry) => !STATUS_VALUES.has(entry))) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path: `${path}.values`,
            message: "must contain only succeeded, failed, or pending",
          },
        ],
      });
    }
  } else if (!CATEGORICAL_DIMENSIONS.has(key)) {
    throw new ValidationError(
      "Request contains an unsupported filter dimension.",
    );
  }

  return { key, operator: record.operator, values };
};

const validateDimensionConsistency = (
  dimensions: readonly FilterDimension[],
): void => {
  const seen = new Set<string>();
  for (const dimension of dimensions) {
    const identity = NUMERIC_DIMENSIONS.has(dimension.key)
      ? dimension.key
      : `${dimension.key}:${dimension.operator}`;
    if (seen.has(identity)) {
      throw new ValidationError("Filter dimensions must not be duplicated.", {
        issues: [
          {
            path: "filters.dimensions",
            message: NUMERIC_DIMENSIONS.has(dimension.key)
              ? `must contain at most one ${dimension.key} boundary`
              : `must contain at most one ${dimension.operator} ${dimension.key} filter`,
          },
        ],
      });
    }
    seen.add(identity);
  }

  const boundary = (key: string): number | undefined => {
    const value = dimensions.find((dimension) => dimension.key === key)
      ?.values[0];
    return value === undefined ? undefined : Number(value);
  };
  const amountMinimum = boundary("amount_min");
  const amountMaximum = boundary("amount_max");
  if (
    amountMinimum !== undefined &&
    amountMaximum !== undefined &&
    amountMinimum > amountMaximum
  ) {
    throw new ValidationError("Amount filter boundaries are inconsistent.", {
      issues: [
        {
          path: "filters.dimensions",
          message: "amount_min must not be greater than amount_max",
        },
      ],
    });
  }
  const attemptMinimum = boundary("attempt_count_min");
  const attemptMaximum = boundary("attempt_count_max");
  if (
    attemptMinimum !== undefined &&
    attemptMaximum !== undefined &&
    attemptMinimum > attemptMaximum
  ) {
    throw new ValidationError(
      "Attempt-count filter boundaries are inconsistent.",
      {
        issues: [
          {
            path: "filters.dimensions",
            message:
              "attempt_count_min must not be greater than attempt_count_max",
          },
        ],
      },
    );
  }
};

const snapshotSessions = (
  snapshot: RepositorySnapshot,
): readonly PaymentSession[] =>
  snapshot.sessions ?? buildPaymentSessions(snapshot.attempts);

const datasetDateRange = (
  snapshot: RepositorySnapshot,
): { from: string; to: string; timezone: string } => {
  const sessions = snapshotSessions(snapshot);
  if (snapshot.attempts.length === 0 && sessions.length === 0) {
    return {
      from: new Date(snapshot.loadedAt).toISOString(),
      to: new Date(snapshot.loadedAt).toISOString(),
      timezone: "UTC",
    };
  }
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (const attempt of snapshot.attempts) {
    const timestamp = Date.parse(attempt.occurredAt);
    minimum = Math.min(minimum, timestamp);
    maximum = Math.max(maximum, timestamp);
  }
  for (const session of sessions) {
    const timestamp = Date.parse(session.observedAt);
    minimum = Math.min(minimum, timestamp);
    maximum = Math.max(maximum, timestamp);
  }
  return {
    from: new Date(minimum).toISOString(),
    to: new Date(maximum).toISOString(),
    timezone: "UTC",
  };
};

const canonicalFilters = (
  value: unknown,
  snapshot: RepositorySnapshot,
): FilterState => {
  const record = assertRecord(value, "filters");
  assertAllowedKeys(
    record,
    ["dateRange", "merchantIds", "segmentIds", "analysisUnit", "dimensions"],
    "filters",
  );

  let dateRange = datasetDateRange(snapshot);
  if (record.dateRange !== undefined) {
    const requested = assertRecord(record.dateRange, "filters.dateRange");
    assertAllowedKeys(
      requested,
      ["from", "to", "timezone"],
      "filters.dateRange",
    );
    dateRange = {
      from: canonicalDate(requested.from, "filters.dateRange.from"),
      to: canonicalDate(requested.to, "filters.dateRange.to"),
      timezone: validateTimezone(requested.timezone),
    };
    if (Date.parse(dateRange.from) > Date.parse(dateRange.to)) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path: "filters.dateRange.from",
            message: "must not be after filters.dateRange.to",
          },
        ],
      });
    }
  }

  let analysisUnit: AnalysisUnit = "payment_session";
  if (record.analysisUnit !== undefined) {
    if (
      record.analysisUnit !== "payment_session" &&
      record.analysisUnit !== "payment_attempt"
    ) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path: "filters.analysisUnit",
            message: "must be payment_session or payment_attempt",
          },
        ],
      });
    }
    analysisUnit = record.analysisUnit;
  }

  let merchantIds: string[] | undefined;
  if (record.merchantIds !== undefined) {
    merchantIds = readStringArray(record.merchantIds, "filters.merchantIds");
  }

  if (record.segmentIds !== undefined) {
    const segmentIds = readStringArray(record.segmentIds, "filters.segmentIds");
    if (segmentIds.length > 0) {
      throw new ValidationError(
        "Segment filters are not supported for raw payment data.",
        {
          issues: [
            {
              path: "filters.segmentIds",
              message: "must be omitted or empty",
            },
          ],
        },
      );
    }
  }

  let dimensions: FilterDimension[] | undefined;
  if (record.dimensions !== undefined) {
    if (!Array.isArray(record.dimensions)) {
      throw new ValidationError("Request validation failed.", {
        issues: [{ path: "filters.dimensions", message: "must be an array" }],
      });
    }
    dimensions = record.dimensions.map(canonicalDimension);
    validateDimensionConsistency(dimensions);
  }

  return {
    dateRange,
    analysisUnit,
    ...(merchantIds !== undefined ? { merchantIds } : {}),
    ...(dimensions !== undefined ? { dimensions } : {}),
  };
};

const canonicalPage = (
  value: unknown,
): Required<Pick<PageRequest, "limit">> & PageRequest => {
  const record = assertRecord(value, "page");
  assertAllowedKeys(record, ["cursor", "limit"], "page");
  let limit = DEFAULT_PAGE_LIMIT;
  if (record.limit !== undefined) {
    if (
      typeof record.limit !== "number" ||
      !Number.isInteger(record.limit) ||
      record.limit < 1 ||
      record.limit > MAX_PAGE_LIMIT
    ) {
      throw new ValidationError("Request validation failed.", {
        issues: [
          {
            path: "page.limit",
            message: `must be an integer from 1 to ${MAX_PAGE_LIMIT}`,
          },
        ],
      });
    }
    limit = record.limit;
  }
  let cursor: string | undefined;
  if (record.cursor !== undefined) {
    cursor = readString(record.cursor, "page.cursor", 2048);
  }
  return { limit, ...(cursor !== undefined ? { cursor } : {}) };
};

interface ParsedQuery {
  filters: FilterState;
  page: Required<Pick<PageRequest, "limit">> & PageRequest;
}

const parseQuery = (
  body: unknown,
  snapshot: RepositorySnapshot,
): ParsedQuery => {
  const record = assertRecord(body, "$body");
  assertAllowedKeys(record, ["filters", "page", "sort"], "$body");
  if (record.sort !== undefined) {
    throw new ValidationError("Sorting is not supported by this API version.", {
      issues: [{ path: "sort", message: "must be omitted" }],
    });
  }
  if (record.filters === undefined || record.page === undefined) {
    throw new ValidationError("Request validation failed.", {
      issues: [
        ...(record.filters === undefined
          ? [{ path: "filters", message: "is required" }]
          : []),
        ...(record.page === undefined
          ? [{ path: "page", message: "is required" }]
          : []),
      ],
    });
  }
  return {
    filters: canonicalFilters(record.filters, snapshot),
    page: canonicalPage(record.page),
  };
};

const provenanceFor = (
  snapshot: RepositorySnapshot,
  filters?: FilterState,
): DatasetProvenance => ({
  datasetId: snapshot.datasetId,
  loadedAt: snapshot.loadedAt,
  sourceReference: `dataset:${snapshot.datasetId}`,
  timezone: filters?.dateRange?.timezone ?? "UTC",
});

const stableValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(stableValue);
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
};

const fingerprint = (value: unknown): string =>
  createHash("sha256")
    .update(JSON.stringify(stableValue(value)))
    .digest("base64url");

interface CursorPayload {
  version: 1;
  offset: number;
  dataset: string;
  query: string;
}

const encodeCursor = (
  offset: number,
  datasetId: string,
  query: unknown,
): string =>
  Buffer.from(
    JSON.stringify({
      version: 1,
      offset,
      dataset: fingerprint(datasetId),
      query: fingerprint(query),
    } satisfies CursorPayload),
    "utf8",
  ).toString("base64url");

const decodeCursor = (
  cursor: string | undefined,
  datasetId: string,
  query: unknown,
): number => {
  if (cursor === undefined) {
    return 0;
  }
  try {
    const parsed = JSON.parse(
      Buffer.from(cursor, "base64url").toString("utf8"),
    ) as unknown;
    if (!isRecord(parsed)) {
      throw new Error("not an object");
    }
    if (
      parsed.version !== 1 ||
      typeof parsed.offset !== "number" ||
      !Number.isSafeInteger(parsed.offset) ||
      parsed.offset < 0 ||
      parsed.dataset !== fingerprint(datasetId) ||
      parsed.query !== fingerprint(query)
    ) {
      throw new Error("cursor binding mismatch");
    }
    return parsed.offset;
  } catch {
    throw new ValidationError(
      "Pagination cursor is invalid or no longer applicable.",
      {
        issues: [
          {
            path: "page.cursor",
            message:
              "must be an opaque cursor issued for this dataset and query",
          },
        ],
      },
    );
  }
};

const paginate = <T>(
  values: readonly T[],
  page: Required<Pick<PageRequest, "limit">> & PageRequest,
  datasetId: string,
  query: unknown,
): PageResult<T> => {
  const binding = { ...assertRecord(query, "query"), limit: page.limit };
  const offset = decodeCursor(page.cursor, datasetId, binding);
  if (offset > values.length) {
    throw new ValidationError(
      "Pagination cursor is outside the available result set.",
      {
        issues: [{ path: "page.cursor", message: "is out of range" }],
      },
    );
  }
  const items = values.slice(offset, offset + page.limit);
  const nextOffset = offset + items.length;
  return {
    items,
    nextCursor:
      nextOffset < values.length
        ? encodeCursor(nextOffset, datasetId, binding)
        : null,
    totalCount: values.length,
  };
};

const merchantDirectory = (
  attempts: readonly PaymentAttempt[],
  sessions: readonly PaymentSession[] = [],
): MerchantListItem[] => {
  const merchants = new Map<string, MerchantListItem>();
  const ambiguousCategories = new Set<string>();
  for (const attempt of attempts) {
    const existing = merchants.get(attempt.merchantId);
    if (existing === undefined) {
      merchants.set(attempt.merchantId, {
        merchantId: attempt.merchantId,
        displayName: attempt.merchantDisplayName ?? attempt.merchantId,
        ...(attempt.merchantCategory !== undefined
          ? { category: { ...attempt.merchantCategory } }
          : {}),
      });
      continue;
    }
    if (
      existing.category !== undefined &&
      attempt.merchantCategory !== undefined &&
      existing.category.id !== attempt.merchantCategory.id
    ) {
      ambiguousCategories.add(attempt.merchantId);
    } else if (
      existing.category === undefined &&
      attempt.merchantCategory !== undefined
    ) {
      existing.category = { ...attempt.merchantCategory };
    }
    if (
      existing.displayName === existing.merchantId &&
      attempt.merchantDisplayName !== undefined
    ) {
      existing.displayName = attempt.merchantDisplayName;
    }
  }
  for (const session of sessions) {
    const existing = merchants.get(session.merchantId);
    if (existing === undefined) {
      merchants.set(session.merchantId, {
        merchantId: session.merchantId,
        displayName: session.merchantId,
        ...(session.merchantCategory !== undefined
          ? { category: { ...session.merchantCategory } }
          : {}),
      });
      continue;
    }
    if (
      existing.category !== undefined &&
      session.merchantCategory !== undefined &&
      existing.category.id !== session.merchantCategory.id
    ) {
      ambiguousCategories.add(session.merchantId);
    } else if (
      existing.category === undefined &&
      session.merchantCategory !== undefined
    ) {
      existing.category = { ...session.merchantCategory };
    }
  }
  for (const merchantId of ambiguousCategories) {
    const merchant = merchants.get(merchantId);
    if (merchant !== undefined) {
      delete merchant.category;
    }
  }
  return [...merchants.values()].sort(
    (left, right) =>
      left.displayName.localeCompare(right.displayName) ||
      left.merchantId.localeCompare(right.merchantId),
  );
};

const warningsFor = (snapshot: RepositorySnapshot): string[] =>
  snapshot.attempts.length === 0
    ? ["The dataset is available but contains no payment attempts."]
    : [];

const requireMerchant = (
  snapshot: RepositorySnapshot,
  merchantId: string,
): string => {
  const normalized = readString(merchantId, "merchantId");
  if (
    !snapshot.attempts.some((attempt) => attempt.merchantId === normalized) &&
    !snapshotSessions(snapshot).some(
      (session) => session.merchantId === normalized,
    )
  ) {
    throw new NotFoundError("Merchant was not found in the current dataset.", {
      merchantId: normalized,
    });
  }
  return normalized;
};

const requireSingleMerchant = (
  filters: FilterState,
  snapshot: RepositorySnapshot,
): string => {
  if (filters.merchantIds?.length !== 1) {
    throw new ValidationError(
      "Exactly one merchant is required for this query.",
      {
        issues: [
          {
            path: "filters.merchantIds",
            message: "must contain exactly one merchant identifier",
          },
        ],
      },
    );
  }
  const merchantId = filters.merchantIds[0];
  if (merchantId === undefined) {
    throw new ValidationError(
      "Exactly one merchant is required for this query.",
    );
  }
  return requireMerchant(snapshot, merchantId);
};

const requireSessionAnalysis = (filters: FilterState): void => {
  if (filters.analysisUnit !== "payment_session") {
    throw new ValidationError(
      "This endpoint supports payment-session analysis only.",
      {
        issues: [
          {
            path: "filters.analysisUnit",
            message: "must be payment_session",
          },
        ],
      },
    );
  }
};

const numericRange = (
  values: Iterable<number>,
): { minimum: number | null; maximum: number | null } => {
  let minimum: number | null = null;
  let maximum: number | null = null;
  for (const value of values) {
    minimum = minimum === null ? value : Math.min(minimum, value);
    maximum = maximum === null ? value : Math.max(maximum, value);
  }
  return { minimum, maximum };
};

class DefaultMerchantIntelligenceService implements MerchantIntelligenceService {
  readonly #repository: PaymentAttemptRepository;
  readonly #onHealthError: ((error: unknown) => void) | undefined;

  constructor(
    repository: PaymentAttemptRepository,
    options: MerchantIntelligenceServiceOptions,
  ) {
    this.#repository = repository;
    this.#onHealthError = options.onHealthError;
  }

  async #getSnapshot(): Promise<RepositorySnapshot> {
    try {
      return await this.#repository.getSnapshot();
    } catch (error: unknown) {
      throw new DataUnavailableError(
        "Payment data is currently unavailable.",
        undefined,
        error,
      );
    }
  }

  async getHealth(): Promise<HealthResult> {
    try {
      const snapshot = await this.#repository.getSnapshot();
      return {
        status: "ok",
        data: { paymentDataAvailable: true },
        warnings:
          snapshot.attempts.length === 0
            ? ["The dataset is available but contains no payment attempts."]
            : [],
      };
    } catch (error: unknown) {
      this.#onHealthError?.(error);
      return {
        status: "degraded",
        data: { paymentDataAvailable: false },
        warnings: ["Payment data is currently unavailable."],
      };
    }
  }

  async listMerchants(
    parameters: URLSearchParams,
  ): Promise<MerchantListResult> {
    const allowed = new Set(["search", "categoryId", "cursor", "limit"]);
    for (const key of parameters.keys()) {
      if (!allowed.has(key)) {
        throw new ValidationError(
          "Request contains an unsupported query parameter.",
          {
            issues: [{ path: key, message: "is not supported" }],
          },
        );
      }
      if (parameters.getAll(key).length > 1) {
        throw new ValidationError("Query parameters must not be repeated.", {
          issues: [{ path: key, message: "must occur at most once" }],
        });
      }
    }
    const searchValue = parameters.get("search");
    const categoryValue = parameters.get("categoryId");
    const cursorValue = parameters.get("cursor");
    const limitValue = parameters.get("limit");
    const search =
      searchValue === null ? undefined : readString(searchValue, "search", 100);
    const categoryId =
      categoryValue === null
        ? undefined
        : readString(categoryValue, "categoryId");
    const cursor =
      cursorValue === null
        ? undefined
        : readString(cursorValue, "page.cursor", 2048);
    let limit = DEFAULT_PAGE_LIMIT;
    if (limitValue !== null) {
      const parsed = Number(limitValue);
      if (!/^\d+$/u.test(limitValue) || parsed < 1 || parsed > MAX_PAGE_LIMIT) {
        throw new ValidationError("Request validation failed.", {
          issues: [
            {
              path: "limit",
              message: `must be an integer from 1 to ${MAX_PAGE_LIMIT}`,
            },
          ],
        });
      }
      limit = parsed;
    }

    const snapshot = await this.#getSnapshot();
    const normalizedSearch = search?.toLocaleLowerCase("en");
    const values = merchantDirectory(
      snapshot.attempts,
      snapshotSessions(snapshot),
    ).filter(
      (merchant) =>
        (normalizedSearch === undefined ||
          merchant.merchantId
            .toLocaleLowerCase("en")
            .includes(normalizedSearch) ||
          merchant.displayName
            .toLocaleLowerCase("en")
            .includes(normalizedSearch)) &&
        (categoryId === undefined || merchant.category?.id === categoryId),
    );
    const page = paginate(
      values,
      { limit, ...(cursor !== undefined ? { cursor } : {}) },
      snapshot.datasetId,
      {
        endpoint: "merchants",
        search: search ?? null,
        categoryId: categoryId ?? null,
      },
    );
    return { page, provenance: provenanceFor(snapshot) };
  }

  async getFilterOptions(): Promise<FilterOptionsResult> {
    const snapshot = await this.#getSnapshot();
    const categories = new Map<string, string>();
    const terminals = new Set<string>();
    const issuers = new Set<string>();
    const attemptsBySession = new Map<string, number>();
    const sessions = snapshotSessions(snapshot);
    for (const attempt of snapshot.attempts) {
      if (attempt.merchantCategory !== undefined) {
        categories.set(
          attempt.merchantCategory.id,
          attempt.merchantCategory.label,
        );
      }
      if (attempt.terminalId !== undefined) {
        terminals.add(attempt.terminalId);
      }
      if (attempt.issuer !== undefined) {
        issuers.add(attempt.issuer);
      }
      attemptsBySession.set(
        attempt.sessionId,
        (attemptsBySession.get(attempt.sessionId) ?? 0) + 1,
      );
    }
    for (const session of sessions) {
      if (session.merchantCategory !== undefined) {
        categories.set(
          session.merchantCategory.id,
          session.merchantCategory.label,
        );
      }
      if (session.terminalId !== undefined) {
        terminals.add(session.terminalId);
      }
      if (session.issuer !== undefined) {
        issuers.add(session.issuer);
      }
      attemptsBySession.set(session.sessionId, session.attempts.length);
    }
    const categoryOptions = [...categories]
      .map(([id, label]) => ({ id, value: id, label }))
      .sort((left, right) => left.label.localeCompare(right.label));
    const terminalOptions = [...terminals].sort();
    const issuerOptions = [...issuers].sort();
    const truncated = {
      categories: categoryOptions.length > MAX_FILTER_OPTIONS,
      terminals: terminalOptions.length > MAX_FILTER_OPTIONS,
      issuers: issuerOptions.length > MAX_FILTER_OPTIONS,
    };
    const warnings = Object.entries(truncated)
      .filter(([, isTruncated]) => isTruncated)
      .map(
        ([name]) =>
          `${name} filter options are limited to the first ${MAX_FILTER_OPTIONS} sorted values.`,
      );
    return {
      data: {
        dateRange: datasetDateRange(snapshot),
        categories: categoryOptions.slice(0, MAX_FILTER_OPTIONS),
        statuses: [
          { value: "succeeded", label: "Succeeded" },
          { value: "failed", label: "Failed" },
          { value: "pending", label: "Pending" },
        ],
        terminals: terminalOptions
          .slice(0, MAX_FILTER_OPTIONS)
          .map((value) => ({ value, label: value })),
        issuers: issuerOptions
          .slice(0, MAX_FILTER_OPTIONS)
          .map((value) => ({ value, label: value })),
        amountRange: numericRange(
          [
            ...snapshot.attempts.map((attempt) => attempt.amount),
            ...sessions.map((session) => session.representativeAmount),
          ],
        ),
        attemptCountRange: numericRange(attemptsBySession.values()),
        analysisUnits: [
          {
            value: "payment_session",
            label: "Payment session",
            supportedEndpoints: ["summary", "insights", "trends", "segments"],
          },
          {
            value: "payment_attempt",
            label: "Payment attempt",
            supportedEndpoints: ["trends"],
          },
        ],
        supportedDimensions: SUPPORTED_FILTER_DIMENSIONS,
        optionLimit: MAX_FILTER_OPTIONS,
        truncated,
      },
      warnings,
      provenance: provenanceFor(snapshot),
    };
  }

  async queryMerchantSummary(
    merchantId: string,
    body: unknown,
  ): Promise<ScopedResult<MerchantSummary>> {
    const snapshot = await this.#getSnapshot();
    const record = assertRecord(body, "$body");
    assertAllowedKeys(record, ["filters"], "$body");
    if (record.filters === undefined) {
      throw new ValidationError("Request validation failed.", {
        issues: [{ path: "filters", message: "is required" }],
      });
    }
    const scopedMerchantId = requireMerchant(snapshot, merchantId);
    const filters = canonicalFilters(record.filters, snapshot);
    if (
      filters.merchantIds !== undefined &&
      filters.merchantIds.length > 0 &&
      (filters.merchantIds.length !== 1 ||
        filters.merchantIds[0] !== scopedMerchantId)
    ) {
      throw new ValidationError(
        "The request merchant scope must match the path merchant.",
        {
          issues: [
            {
              path: "filters.merchantIds",
              message: `must contain only ${scopedMerchantId}`,
            },
          ],
        },
      );
    }
    requireSessionAnalysis(filters);
    const appliedFilters: FilterState = {
      ...filters,
      merchantIds: [scopedMerchantId],
    };
    const provenance = provenanceFor(snapshot, appliedFilters);
    return {
      data: buildMerchantSummary(
        snapshot.attempts,
        scopedMerchantId,
        appliedFilters,
        provenance,
        snapshotSessions(snapshot),
      ),
      appliedFilters,
      warnings: warningsFor(snapshot),
      provenance,
    };
  }

  async queryInsights(body: unknown): Promise<PagedResult<Insight>> {
    const snapshot = await this.#getSnapshot();
    const query = parseQuery(body, snapshot);
    requireSessionAnalysis(query.filters);
    const merchantId = requireSingleMerchant(query.filters, snapshot);
    const provenance = provenanceFor(snapshot, query.filters);
    const values = buildMerchantInsights(
      snapshot.attempts,
      merchantId,
      query.filters,
      provenance,
      snapshotSessions(snapshot),
    );
    return {
      appliedFilters: query.filters,
      page: paginate(values, query.page, snapshot.datasetId, {
        endpoint: "insights",
        filters: query.filters,
      }),
      warnings: warningsFor(snapshot),
      provenance,
    };
  }

  async queryTrends(body: unknown): Promise<PagedResult<ChartSeries>> {
    const snapshot = await this.#getSnapshot();
    const query = parseQuery(body, snapshot);
    const merchantId = requireSingleMerchant(query.filters, snapshot);
    const provenance = provenanceFor(snapshot, query.filters);
    const values = buildDailyTrends(
      snapshot.attempts,
      merchantId,
      query.filters,
      provenance,
      snapshotSessions(snapshot),
    );
    return {
      appliedFilters: query.filters,
      page: paginate(values, query.page, snapshot.datasetId, {
        endpoint: "trends",
        filters: query.filters,
      }),
      warnings: warningsFor(snapshot),
      provenance,
    };
  }

  async querySegments(body: unknown): Promise<PagedResult<Segment>> {
    const snapshot = await this.#getSnapshot();
    const query = parseQuery(body, snapshot);
    requireSessionAnalysis(query.filters);
    for (const merchantId of query.filters.merchantIds ?? []) {
      requireMerchant(snapshot, merchantId);
    }
    const provenance = provenanceFor(snapshot, query.filters);
    const values = buildMerchantSegments(
      snapshot.attempts,
      query.filters,
      provenance,
      snapshotSessions(snapshot),
    );
    return {
      appliedFilters: query.filters,
      page: paginate(values, query.page, snapshot.datasetId, {
        endpoint: "segments",
        filters: query.filters,
      }),
      warnings: warningsFor(snapshot),
      provenance,
    };
  }
}

export const createMerchantIntelligenceService = (
  repository: PaymentAttemptRepository,
  options: MerchantIntelligenceServiceOptions = {},
): MerchantIntelligenceService =>
  new DefaultMerchantIntelligenceService(repository, options);
