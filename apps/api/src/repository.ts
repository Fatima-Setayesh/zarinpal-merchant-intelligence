import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

import {
  buildPaymentSessions,
  DomainValidationError,
  parsePaymentAttemptsJson,
  parseRfc3339Timestamp,
  type PaymentAttempt,
  type PaymentAttemptStatus,
} from "./domain.js";

export interface RepositorySnapshot {
  readonly attempts: readonly PaymentAttempt[];
  readonly datasetId: string;
  readonly loadedAt: string;
}

export interface PaymentAttemptQuery {
  readonly merchantIds?: readonly string[];
  readonly from?: string;
  readonly to?: string;
  readonly statuses?: readonly PaymentAttemptStatus[];
}

export interface PaymentAttemptRepository {
  getSnapshot(): Promise<RepositorySnapshot>;
  list(query?: PaymentAttemptQuery): Promise<PaymentAttempt[]>;
}

export class RepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RepositoryError";
  }
}

export class UnavailablePaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #reason: string;

  constructor(
    reason = "Payment data is unavailable because no data source is configured",
  ) {
    this.#reason = reason;
  }

  async getSnapshot(): Promise<RepositorySnapshot> {
    throw new RepositoryError(this.#reason);
  }

  async list(): Promise<PaymentAttempt[]> {
    throw new RepositoryError(this.#reason);
  }
}

const cloneAttempt = (attempt: PaymentAttempt): PaymentAttempt => ({
  ...attempt,
  ...(attempt.merchantCategory !== undefined
    ? { merchantCategory: { ...attempt.merchantCategory } }
    : {}),
});

const freezeSnapshot = (
  attempts: readonly PaymentAttempt[],
  datasetId: string,
  loadedAt: string,
): RepositorySnapshot =>
  Object.freeze({
    attempts: Object.freeze(
      attempts.map((attempt) => {
        const cloned = cloneAttempt(attempt);
        if (cloned.merchantCategory !== undefined) {
          Object.freeze(cloned.merchantCategory);
        }
        return Object.freeze(cloned);
      }),
    ),
    datasetId,
    loadedAt,
  });

const validateCurrencyAmountRanges = (
  attempts: readonly PaymentAttempt[],
): void => {
  const totals = new Map<string, number>();
  for (const attempt of attempts) {
    const next = (totals.get(attempt.currency) ?? 0) + attempt.amount;
    if (!Number.isSafeInteger(next)) {
      throw new DomainValidationError("Unsafe payment amount aggregate", [
        {
          path: `currency.${attempt.currency}.amount`,
          message: "exceeds JavaScript's safe integer range",
        },
      ]);
    }
    totals.set(attempt.currency, next);
  }
};

const validateQueryDate = (value: string | undefined, field: string): void => {
  if (value !== undefined && parseRfc3339Timestamp(value) === null) {
    throw new DomainValidationError("Invalid payment-attempt query", [
      {
        path: field,
        message:
          "must be an RFC3339 date-time with Z or an explicit UTC offset",
      },
    ]);
  }
};

const applyQuery = (
  attempts: readonly PaymentAttempt[],
  query: PaymentAttemptQuery,
): PaymentAttempt[] => {
  validateQueryDate(query.from, "from");
  validateQueryDate(query.to, "to");
  if (
    query.from !== undefined &&
    query.to !== undefined &&
    Date.parse(query.from) > Date.parse(query.to)
  ) {
    throw new DomainValidationError("Invalid payment-attempt query", [
      { path: "from", message: "must not be after to" },
    ]);
  }

  const merchantIds =
    query.merchantIds === undefined ? undefined : new Set(query.merchantIds);
  const statuses =
    query.statuses === undefined ? undefined : new Set(query.statuses);
  const from = query.from === undefined ? undefined : Date.parse(query.from);
  const to = query.to === undefined ? undefined : Date.parse(query.to);

  return attempts
    .filter((attempt) => {
      const occurredAt = Date.parse(attempt.occurredAt);
      return (
        (merchantIds === undefined || merchantIds.has(attempt.merchantId)) &&
        (statuses === undefined || statuses.has(attempt.status)) &&
        (from === undefined || occurredAt >= from) &&
        (to === undefined || occurredAt <= to)
      );
    })
    .map(cloneAttempt);
};

export interface InMemoryPaymentAttemptRepositoryOptions {
  datasetId?: string;
  loadedAt?: string;
}

export class InMemoryPaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #snapshot: RepositorySnapshot;

  constructor(
    attempts: readonly PaymentAttempt[],
    options: InMemoryPaymentAttemptRepositoryOptions = {},
  ) {
    const validated = parsePaymentAttempts(attempts);
    buildPaymentSessions(validated);
    validateCurrencyAmountRanges(validated);
    const loadedAt = options.loadedAt ?? new Date().toISOString();
    if (parseRfc3339Timestamp(loadedAt) === null) {
      throw new DomainValidationError("Invalid repository metadata", [
        {
          path: "loadedAt",
          message:
            "must be an RFC3339 date-time with Z or an explicit UTC offset",
        },
      ]);
    }
    const digest = createHash("sha256")
      .update(JSON.stringify(validated))
      .digest("hex");
    this.#snapshot = freezeSnapshot(
      validated,
      options.datasetId ?? `memory-sha256:${digest}`,
      loadedAt,
    );
  }

  async getSnapshot(): Promise<RepositorySnapshot> {
    return this.#snapshot;
  }

  async list(query: PaymentAttemptQuery = {}): Promise<PaymentAttempt[]> {
    return applyQuery(this.#snapshot.attempts, query);
  }
}

export interface FilePaymentAttemptRepositoryOptions {
  datasetId?: string;
}

export class FilePaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #filePath: string;
  readonly #datasetId: string | undefined;
  #cache:
    | {
        key: string;
        snapshot: RepositorySnapshot;
      }
    | undefined;

  constructor(
    filePath: string,
    options: FilePaymentAttemptRepositoryOptions = {},
  ) {
    if (filePath.trim().length === 0) {
      throw new RepositoryError("Payment-attempt file path must not be empty");
    }
    this.#filePath = filePath;
    this.#datasetId = options.datasetId;
  }

  async getSnapshot(): Promise<RepositorySnapshot> {
    try {
      const fileStats = await stat(this.#filePath, { bigint: true });
      const cacheKey = [
        fileStats.dev,
        fileStats.ino,
        fileStats.ctimeNs,
        fileStats.mtimeNs,
        fileStats.size,
      ].join(":");
      if (this.#cache?.key === cacheKey) {
        return this.#cache.snapshot;
      }

      const json = await readFile(this.#filePath, "utf8");
      const attempts = parsePaymentAttemptsJson(json);
      buildPaymentSessions(attempts);
      validateCurrencyAmountRanges(attempts);
      const digest = createHash("sha256").update(json).digest("hex");
      const snapshot = freezeSnapshot(
        attempts,
        this.#datasetId ?? `sha256:${digest}`,
        new Date(Number(fileStats.mtimeNs / 1_000_000n)).toISOString(),
      );
      this.#cache = { key: cacheKey, snapshot };
      return snapshot;
    } catch (error: unknown) {
      if (error instanceof DomainValidationError) {
        throw error;
      }
      const detail =
        error instanceof Error ? error.message : "unknown file error";
      throw new RepositoryError(`Unable to load payment attempts: ${detail}`);
    }
  }

  async list(query: PaymentAttemptQuery = {}): Promise<PaymentAttempt[]> {
    const snapshot = await this.getSnapshot();
    return applyQuery(snapshot.attempts, query);
  }
}

// Re-parse typed test fixtures so in-memory storage and file storage apply the
// same runtime validation rules.
const parsePaymentAttempts = (
  attempts: readonly PaymentAttempt[],
): PaymentAttempt[] => parsePaymentAttemptsJson(JSON.stringify(attempts));
