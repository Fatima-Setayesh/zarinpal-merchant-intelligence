import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createGunzip } from "node:zlib";

import {
  buildPaymentSessions,
  DomainValidationError,
  mapChallengeCsvRow,
  normalizeChallengeDataUtcOffset,
  parsePaymentAttemptsJson,
  parseRfc3339Timestamp,
  validateChallengeCsvHeader,
  type PaymentAttempt,
  type PaymentAttemptStatus,
  type PaymentSession,
} from "./domain.js";

export interface RepositorySnapshot {
  readonly attempts: readonly PaymentAttempt[];
  readonly sessions?: readonly PaymentSession[];
  readonly datasetId: string;
  readonly loadedAt: string;
  readonly ingestion?: RepositoryIngestionMetadata;
}

export interface RepositoryIngestionMetadata {
  readonly sourceFormat: "memory_json" | "json" | "challenge_csv_gzip";
  readonly sourceRowCount: number;
  readonly acceptedAttemptCount: number;
  readonly excludedNoAttemptCount: number;
  readonly preservedNoAttemptSessionCount: number;
  readonly missingAdjustedFeeCount: number;
  readonly missingIssuerCount: number;
  readonly sourceUtcOffset?: string;
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
  sessions: readonly PaymentSession[],
  datasetId: string,
  loadedAt: string,
  ingestion: RepositoryIngestionMetadata,
): RepositorySnapshot => {
  for (const attempt of attempts) {
    if (attempt.merchantCategory !== undefined) {
      Object.freeze(attempt.merchantCategory);
    }
    Object.freeze(attempt);
  }
  Object.freeze(attempts);
  for (const session of sessions) {
    Object.freeze(session.attempts);
    if (session.merchantCategory !== undefined) {
      Object.freeze(session.merchantCategory);
    }
    Object.freeze(session);
  }
  Object.freeze(sessions);
  return Object.freeze({
    attempts,
    sessions,
    datasetId,
    loadedAt,
    ingestion: Object.freeze({ ...ingestion }),
  });
};

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

const ingestionMetadataForAttempts = (
  attempts: readonly PaymentAttempt[],
  sourceFormat: "memory_json" | "json",
): RepositoryIngestionMetadata => ({
  sourceFormat,
  sourceRowCount: attempts.length,
  acceptedAttemptCount: attempts.length,
  excludedNoAttemptCount: 0,
  preservedNoAttemptSessionCount: 0,
  missingAdjustedFeeCount: attempts.filter(
    (attempt) =>
      attempt.adjustedFee === undefined || attempt.adjustedFee === null,
  ).length,
  missingIssuerCount: attempts.filter((attempt) => attempt.issuer === undefined)
    .length,
});

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
    const sessions = buildPaymentSessions(validated);
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
      sessions,
      options.datasetId ?? `memory-sha256:${digest}`,
      loadedAt,
      ingestionMetadataForAttempts(validated, "memory_json"),
    );
  }

  async getSnapshot(): Promise<RepositorySnapshot> {
    return this.#snapshot;
  }

  async list(query: PaymentAttemptQuery = {}): Promise<PaymentAttempt[]> {
    return applyQuery(this.#snapshot.attempts, query);
  }
}

const invalidCsv = (message: string): DomainValidationError =>
  new DomainValidationError("Invalid challenge CSV document", [
    { path: "challengeData.csv", message },
  ]);

const parseCsvRecords = async function* (
  chunks: AsyncIterable<unknown>,
): AsyncGenerator<string[]> {
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let quoteClosed = false;
  let skipLineFeed = false;

  for await (const rawChunk of chunks) {
    const chunk =
      typeof rawChunk === "string"
        ? rawChunk
        : Buffer.isBuffer(rawChunk)
          ? rawChunk.toString("utf8")
          : String(rawChunk);
    for (const character of chunk) {
      if (skipLineFeed) {
        skipLineFeed = false;
        if (character === "\n") {
          continue;
        }
      }
      if (inQuotes) {
        if (character === '"') {
          inQuotes = false;
          quoteClosed = true;
        } else {
          field += character;
        }
        continue;
      }
      if (quoteClosed) {
        if (character === '"') {
          field += '"';
          inQuotes = true;
          quoteClosed = false;
          continue;
        }
        if (character !== "," && character !== "\n" && character !== "\r") {
          throw invalidCsv("contains characters after a closing quote");
        }
        quoteClosed = false;
      } else if (character === '"') {
        if (field.length > 0) {
          throw invalidCsv("contains a quote inside an unquoted field");
        }
        inQuotes = true;
        continue;
      }

      if (character === ",") {
        record.push(field);
        field = "";
      } else if (character === "\n" || character === "\r") {
        record.push(field);
        yield record;
        field = "";
        record = [];
        skipLineFeed = character === "\r";
      } else {
        field += character;
      }
    }
  }

  if (inQuotes) {
    throw invalidCsv("ends inside a quoted field");
  }
  if (field.length > 0 || record.length > 0 || quoteClosed) {
    record.push(field);
    yield record;
  }
};

interface ChallengeCsvLoadResult {
  readonly attempts: PaymentAttempt[];
  readonly preservedSessions: PaymentSession[];
  readonly digest: string;
  readonly ingestion: RepositoryIngestionMetadata;
}

const loadChallengeCsvGzip = async (
  filePath: string,
  sourceUtcOffset: string,
): Promise<ChallengeCsvLoadResult> => {
  const digest = createHash("sha256");
  const source = createReadStream(filePath);
  const decompressed = createGunzip();
  source.on("data", (chunk: string | Buffer) => {
    digest.update(chunk);
  });
  source.on("error", (error) => decompressed.destroy(error));
  source.pipe(decompressed);
  decompressed.setEncoding("utf8");

  const attempts: PaymentAttempt[] = [];
  const preservedSessions: PaymentSession[] = [];
  let headerSeen = false;
  let sourceRowCount = 0;
  let excludedNoAttemptCount = 0;
  let missingAdjustedFeeCount = 0;
  let missingIssuerCount = 0;
  for await (const fields of parseCsvRecords(
    decompressed as AsyncIterable<unknown>,
  )) {
    if (!headerSeen) {
      validateChallengeCsvHeader(fields);
      headerSeen = true;
      continue;
    }
    sourceRowCount += 1;
    const mapped = mapChallengeCsvRow(
      fields,
      sourceRowCount + 1,
      sourceUtcOffset,
    );
    if (mapped.attempt === null) {
      excludedNoAttemptCount += 1;
      if (mapped.session === null) {
        throw invalidCsv("lost a NoAttempt session during row mapping");
      }
      preservedSessions.push(mapped.session);
      continue;
    }
    attempts.push(mapped.attempt);
    if (mapped.missingAdjustedFee) {
      missingAdjustedFeeCount += 1;
    }
    if (mapped.missingIssuer) {
      missingIssuerCount += 1;
    }
  }
  if (!headerSeen) {
    throw invalidCsv("does not contain a header row");
  }

  return {
    attempts,
    preservedSessions,
    digest: digest.digest("hex"),
    ingestion: {
      sourceFormat: "challenge_csv_gzip",
      sourceRowCount,
      acceptedAttemptCount: attempts.length,
      excludedNoAttemptCount,
      preservedNoAttemptSessionCount: preservedSessions.length,
      missingAdjustedFeeCount,
      missingIssuerCount,
      sourceUtcOffset,
    },
  };
};

export interface FilePaymentAttemptRepositoryOptions {
  datasetId?: string;
  challengeDataUtcOffset?: string;
}

export class FilePaymentAttemptRepository implements PaymentAttemptRepository {
  readonly #filePath: string;
  readonly #datasetId: string | undefined;
  readonly #challengeDataUtcOffset: string;
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
    this.#challengeDataUtcOffset = normalizeChallengeDataUtcOffset(
      options.challengeDataUtcOffset ?? "+03:30",
    );
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

      let attempts: PaymentAttempt[];
      let preservedSessions: PaymentSession[] = [];
      let digest: string;
      let ingestion: RepositoryIngestionMetadata;
      if (this.#filePath.toLowerCase().endsWith(".csv.gz")) {
        const loaded = await loadChallengeCsvGzip(
          this.#filePath,
          this.#challengeDataUtcOffset,
        );
        attempts = loaded.attempts;
        preservedSessions = loaded.preservedSessions;
        digest = loaded.digest;
        ingestion = loaded.ingestion;
      } else {
        const json = await readFile(this.#filePath, "utf8");
        attempts = parsePaymentAttemptsJson(json);
        digest = createHash("sha256").update(json).digest("hex");
        ingestion = ingestionMetadataForAttempts(attempts, "json");
      }
      const sessions = buildPaymentSessions(attempts, preservedSessions);
      validateCurrencyAmountRanges(attempts);
      const snapshot = freezeSnapshot(
        attempts,
        sessions,
        this.#datasetId ?? `sha256:${digest}`,
        new Date(Number(fileStats.mtimeNs / 1_000_000n)).toISOString(),
        ingestion,
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
