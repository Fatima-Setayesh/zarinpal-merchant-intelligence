import { mkdtemp, rm, stat, utimes, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  applyPaymentAttemptFilters,
  buildDailyTrends,
  buildMerchantInsights,
  buildMerchantSegments,
  buildMerchantSummary,
} from "../src/analytics.js";
import {
  buildPaymentSessions,
  DomainValidationError,
  parsePaymentAttempts,
  parsePaymentAttemptsJson,
  type AnalysisProvenance,
  type Metric,
  type PaymentAttempt,
} from "../src/domain.js";
import {
  FilePaymentAttemptRepository,
  InMemoryPaymentAttemptRepository,
  RepositoryError,
  UnavailablePaymentAttemptRepository,
} from "../src/repository.js";

const provenance: AnalysisProvenance = {
  datasetId: "test-dataset",
  sourceReference: "test-fixture:validated-attempts",
  timezone: "UTC",
};

const attempts = parsePaymentAttempts([
  {
    attemptId: "a1",
    sessionId: "s1",
    merchantId: "m1",
    occurredAt: "2026-01-01T08:00:00.000Z",
    amount: 100,
    currency: "irr",
    status: "failed",
    adjusted_fee: null,
    terminal_id: "t1",
    bank: "issuer-a",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "a2",
    sessionId: "s1",
    merchantId: "m1",
    occurredAt: "2026-01-01T08:02:00.000Z",
    amount: 100,
    currency: "IRR",
    status: "succeeded",
    adjustedFee: 5,
    terminalId: "t1",
    issuer: "issuer-a",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "a3",
    sessionId: "s2",
    merchantId: "m1",
    occurredAt: "2026-01-02T09:00:00.000Z",
    amount: 200,
    currency: "IRR",
    status: "succeeded",
    adjustedFee: 7,
    terminalId: "t2",
    issuer: "issuer-b",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "a4",
    sessionId: "s3",
    merchantId: "m1",
    occurredAt: "2026-01-02T10:00:00.000Z",
    amount: 300,
    currency: "IRR",
    status: "failed",
    adjustedFee: 8,
    terminalId: "t2",
    issuer: "issuer-b",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
]);

const metricById = (metrics: readonly Metric[], metricId: string): Metric => {
  const found = metrics.find((item) => item.metricId === metricId);
  if (found === undefined) {
    throw new Error(`Missing test metric ${metricId}`);
  }
  return found;
};

describe("payment-attempt validation and session modeling", () => {
  it("validates JSON, normalizes aliases, and keeps attempts separate from sessions", () => {
    const parsed = parsePaymentAttemptsJson(JSON.stringify(attempts));
    expect(parsed).toHaveLength(4);
    expect(parsed[0]?.currency).toBe("IRR");

    const sessions = buildPaymentSessions(parsed);
    expect(sessions).toHaveLength(3);
    expect(sessions[0]?.attempts).toHaveLength(2);
    expect(sessions[0]?.outcome).toBe("succeeded");
  });

  it("rejects missing currency, duplicate attempts, and cross-currency sessions", () => {
    expect(() =>
      parsePaymentAttempts([
        {
          attemptId: "missing-currency",
          sessionId: "session",
          merchantId: "merchant",
          occurredAt: "2026-01-01T00:00:00Z",
          amount: 1,
          status: "succeeded",
        },
      ]),
    ).toThrow(DomainValidationError);

    expect(() => parsePaymentAttempts([...attempts, attempts[0]])).toThrow(
      DomainValidationError,
    );

    const crossCurrency = parsePaymentAttempts([
      {
        attemptId: "cross-1",
        sessionId: "cross-session",
        merchantId: "merchant",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 1,
        currency: "IRR",
        status: "failed",
      },
      {
        attemptId: "cross-2",
        sessionId: "cross-session",
        merchantId: "merchant",
        occurredAt: "2026-01-01T00:01:00Z",
        amount: 1,
        currency: "USD",
        status: "succeeded",
      },
    ]);
    expect(() => buildPaymentSessions(crossCurrency)).toThrow(
      DomainValidationError,
    );
    expect(() =>
      parsePaymentAttempts([
        {
          attemptId: "offsetless",
          sessionId: "offsetless-session",
          merchantId: "m1",
          occurredAt: "2026-01-01T12:00:00",
          amount: 10,
          currency: "IRR",
          status: "failed",
        },
      ]),
    ).toThrow(DomainValidationError);
  });

  it("rejects unsafe source numbers before analysis", () => {
    expect(() =>
      parsePaymentAttempts([
        {
          attemptId: "unsafe-amount",
          sessionId: "unsafe-session",
          merchantId: "m1",
          occurredAt: "2026-01-01T00:00:00Z",
          amount: Number.MAX_SAFE_INTEGER + 1,
          currency: "IRR",
          status: "succeeded",
        },
      ]),
    ).toThrow(DomainValidationError);
  });

  it("rejects order-dependent values on tied representative attempts", () => {
    const tiedAmount = parsePaymentAttempts([
      {
        attemptId: "tied-a",
        sessionId: "tied-session",
        merchantId: "m1",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 10,
        currency: "IRR",
        status: "succeeded",
      },
      {
        attemptId: "tied-b",
        sessionId: "tied-session",
        merchantId: "m1",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 20,
        currency: "IRR",
        status: "succeeded",
      },
    ]);
    expect(() => buildPaymentSessions(tiedAmount)).toThrow(
      /ambiguous representative amount/u,
    );

    const tiedFee = parsePaymentAttempts([
      {
        attemptId: "fee-a",
        sessionId: "fee-session",
        merchantId: "m1",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 10,
        adjustedFee: 1,
        currency: "IRR",
        status: "succeeded",
      },
      {
        attemptId: "fee-b",
        sessionId: "fee-session",
        merchantId: "m1",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 10,
        adjustedFee: 2,
        currency: "IRR",
        status: "succeeded",
      },
    ]);
    expect(() => buildPaymentSessions(tiedFee)).toThrow(
      /ambiguous successful adjusted fee/u,
    );
  });
});

describe("merchant analytics", () => {
  it("builds a session-consistent summary and discloses transformed fees", () => {
    const summary = buildMerchantSummary(attempts, "m1", {}, provenance);

    expect(summary.analysisUnit).toBe("payment_session");
    expect(
      metricById(summary.headlineMetrics, "payment-session-count").value,
    ).toBe(3);
    expect(
      metricById(summary.headlineMetrics, "successful-session-rate").value,
    ).toBeCloseTo(66.6667, 4);
    expect(
      metricById(summary.headlineMetrics, "failed-session-count").value,
    ).toBe(1);
    expect(
      metricById(summary.headlineMetrics, "retry-session-rate").value,
    ).toBeCloseTo(33.3333, 4);
    expect(
      metricById(summary.headlineMetrics, "successful-session-amount-IRR")
        .value,
    ).toBe(300);
    const feeMetric = metricById(
      summary.headlineMetrics,
      "average-adjusted-fee-IRR",
    );
    expect(feeMetric.value).toBe(6);
    expect(feeMetric.disclosure?.message).toContain("not Zarinpal's real fee");
    expect(
      summary.headlineMetrics.every(
        (item) => item.analysisUnit === summary.analysisUnit,
      ),
    ).toBe(true);
    expect(summary.limitations.join(" ")).toContain("first observed attempt");
  });

  it("emits source amounts separately for each currency", () => {
    const usdAttempt = parsePaymentAttempts([
      {
        attemptId: "usd-a1",
        sessionId: "usd-s1",
        merchantId: "m1",
        occurredAt: "2026-01-03T08:00:00Z",
        amount: 12,
        currency_code: "USD",
        status: "succeeded",
      },
    ]);
    const summary = buildMerchantSummary(
      [...attempts, ...usdAttempt],
      "m1",
      {},
      provenance,
    );

    expect(
      metricById(summary.headlineMetrics, "successful-session-amount-IRR")
        .value,
    ).toBe(300);
    expect(
      metricById(summary.headlineMetrics, "successful-session-amount-USD")
        .value,
    ).toBe(12);
    expect(
      summary.headlineMetrics.filter((item) =>
        item.metricId.startsWith("successful-session-amount-"),
      ),
    ).toHaveLength(2);
  });

  it("generates actionable insights with complete traceability and causal caveats", () => {
    const insights = buildMerchantInsights(attempts, "m1", {}, provenance);

    expect(insights).toHaveLength(2);
    const retryInsight = insights.find((insight) =>
      insight.insightId.endsWith("retry-recovery"),
    );
    expect(retryInsight?.observation).toContain("1 of 1");
    expect(retryInsight?.recommendations[0]?.supportingEvidenceIds).toEqual([
      retryInsight?.evidence[0]?.evidenceId,
    ]);
    expect(retryInsight?.evidence[0]?.filters.merchantIds).toEqual(["m1"]);
    expect(retryInsight?.evidence[0]?.sample.analysisUnit).toBe(
      "payment_session",
    );
    expect(retryInsight?.limitations.join(" ")).toContain(
      "does not establish causation",
    );
    expect(retryInsight?.evidence[0]?.sourceReference).toBe(
      provenance.sourceReference,
    );
  });

  it("excludes tied initial timestamps from order-dependent retry recovery", () => {
    const tied = parsePaymentAttempts([
      {
        attemptId: "tied-failure",
        sessionId: "tied-session",
        merchantId: "m-tied",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 10,
        currency: "IRR",
        status: "failed",
      },
      {
        attemptId: "tied-success",
        sessionId: "tied-session",
        merchantId: "m-tied",
        occurredAt: "2026-01-01T00:00:00Z",
        amount: 10,
        currency: "IRR",
        status: "succeeded",
      },
    ]);
    const summary = buildMerchantSummary(tied, "m-tied", {}, provenance);

    expect(
      summary.headlineMetrics.some(
        (metric) => metric.metricId === "observed-retry-recovery-rate",
      ),
    ).toBe(false);
    expect(summary.limitations.join(" ")).toContain(
      "tied earliest attempt timestamps",
    );
    expect(buildMerchantInsights(tied, "m-tied", {}, provenance)).toHaveLength(
      0,
    );
  });

  it("builds backend-shaped daily session series without mixing units", () => {
    const series = buildDailyTrends(attempts, "m1", {}, provenance);
    const sessionSeries = series.find(
      (item) => item.metricId === "payment-session-count",
    );

    expect(
      series.every((item) => item.analysisUnit === "payment_session"),
    ).toBe(true);
    expect(sessionSeries?.points).toEqual([
      { x: "2026-01-01", y: 1 },
      { x: "2026-01-02", y: 2 },
    ]);
    expect(sessionSeries?.limitations.join(" ")).toContain(
      "first observed attempt",
    );
  });

  it("does not derive session trends from an attempt-filtered subset", () => {
    const series = buildDailyTrends(
      attempts,
      "m1",
      {
        analysisUnit: "payment_attempt",
        dimensions: [
          { key: "status", operator: "include", values: ["failed"] },
        ],
      },
      provenance,
    );

    expect(series).toHaveLength(1);
    expect(series[0]?.analysisUnit).toBe("payment_attempt");
    expect(series[0]?.points).toEqual([
      { x: "2026-01-01", y: 1 },
      { x: "2026-01-02", y: 1 },
    ]);
  });

  it("keeps session trend points inside the session-start reporting period", () => {
    const spanningSession = parsePaymentAttempts([
      {
        attemptId: "span-1",
        sessionId: "span-session",
        merchantId: "m-span",
        occurredAt: "2026-01-01T23:59:00Z",
        amount: 10,
        currency: "IRR",
        status: "failed",
      },
      {
        attemptId: "span-2",
        sessionId: "span-session",
        merchantId: "m-span",
        occurredAt: "2026-01-02T00:01:00Z",
        amount: 10,
        currency: "IRR",
        status: "succeeded",
      },
    ]);
    const series = buildDailyTrends(
      spanningSession,
      "m-span",
      {
        dateRange: {
          from: "2026-01-01T00:00:00Z",
          to: "2026-01-01T23:59:59Z",
          timezone: "UTC",
        },
      },
      provenance,
    );

    expect(
      series
        .flatMap((item) => item.points)
        .every((point) => point.x === "2026-01-01"),
    ).toBe(true);
  });
});

describe("filtering", () => {
  it("uses complete-session semantics by default and direct-attempt semantics explicitly", () => {
    const recoveredSession = applyPaymentAttemptFilters(attempts, {
      dimensions: [
        { key: "status", operator: "include", values: ["succeeded"] },
        { key: "attempt_count_min", operator: "include", values: ["2"] },
      ],
    });
    expect(recoveredSession.map((attempt) => attempt.attemptId)).toEqual([
      "a1",
      "a2",
    ]);

    const directAttempts = applyPaymentAttemptFilters(attempts, {
      analysisUnit: "payment_attempt",
      dimensions: [
        { key: "status", operator: "include", values: ["succeeded"] },
        { key: "attempt_count_min", operator: "include", values: ["2"] },
      ],
    });
    expect(directAttempts.map((attempt) => attempt.attemptId)).toEqual(["a2"]);
  });

  it("applies date boundaries to session start without truncating retries", () => {
    const sessionScoped = applyPaymentAttemptFilters(attempts, {
      dateRange: {
        from: "2026-01-01T08:01:00.000Z",
        to: "2026-01-01T08:03:00.000Z",
        timezone: "UTC",
      },
    });
    expect(sessionScoped).toEqual([]);

    const attemptScoped = applyPaymentAttemptFilters(attempts, {
      analysisUnit: "payment_attempt",
      dateRange: {
        from: "2026-01-01T08:01:00.000Z",
        to: "2026-01-01T08:03:00.000Z",
        timezone: "UTC",
      },
    });
    expect(attemptScoped.map((attempt) => attempt.attemptId)).toEqual(["a2"]);
  });

  it("supports the allowlisted dimensions and rejects unsupported scope", () => {
    const filtered = applyPaymentAttemptFilters(attempts, {
      analysisUnit: "payment_attempt",
      dimensions: [
        { key: "status", operator: "include", values: ["succeeded"] },
        { key: "category", operator: "include", values: ["retail"] },
        { key: "terminal", operator: "include", values: ["t1"] },
        { key: "issuer", operator: "include", values: ["issuer-a"] },
        { key: "amount_min", operator: "include", values: ["100"] },
        { key: "amount_max", operator: "include", values: ["100"] },
        { key: "attempt_count_min", operator: "include", values: ["2"] },
        { key: "attempt_count_max", operator: "include", values: ["2"] },
      ],
    });
    expect(filtered.map((attempt) => attempt.attemptId)).toEqual(["a2"]);

    expect(() =>
      applyPaymentAttemptFilters(attempts, {
        dimensions: [
          { key: "unapproved", operator: "include", values: ["value"] },
        ],
      }),
    ).toThrow(DomainValidationError);
  });
});

describe("descriptive merchant segments", () => {
  it("uses median splits and exposes concentration and confounding limits", () => {
    const otherAttempts = parsePaymentAttempts([
      {
        attemptId: "m2-a1",
        sessionId: "m2-s1",
        merchantId: "m2",
        occurredAt: "2026-01-01T12:00:00Z",
        amount: 10,
        currency: "USD",
        status: "failed",
      },
      {
        attemptId: "m3-a1",
        sessionId: "m3-s1",
        merchantId: "m3",
        occurredAt: "2026-01-01T13:00:00Z",
        amount: 20,
        currency: "USD",
        status: "succeeded",
      },
      {
        attemptId: "m3-a2",
        sessionId: "m3-s2",
        merchantId: "m3",
        occurredAt: "2026-01-02T13:00:00Z",
        amount: 25,
        currency: "USD",
        status: "succeeded",
      },
    ]);
    const segments = buildMerchantSegments(
      [...attempts, ...otherAttempts],
      {},
      provenance,
    );

    expect(
      segments.reduce((total, segment) => total + segment.memberCount, 0),
    ).toBe(3);
    expect(
      segments.every((segment) => segment.analysisUnit === "merchant"),
    ).toBe(true);
    expect(
      segments.map((segment) => segment.limitations.join(" ")).join(" "),
    ).toContain("merchant concentration");
    expect(segments[0]?.definingCharacteristics.join(" ")).toContain(
      "population median",
    );
  });
});

describe("repositories", () => {
  it("rejects currency aggregates that cannot be represented exactly", () => {
    expect(
      () =>
        new InMemoryPaymentAttemptRepository([
          {
            attemptId: "large-a1",
            sessionId: "large-s1",
            merchantId: "m1",
            occurredAt: "2026-01-01T00:00:00Z",
            amount: Number.MAX_SAFE_INTEGER,
            currency: "IRR",
            status: "succeeded",
          },
          {
            attemptId: "large-a2",
            sessionId: "large-s2",
            merchantId: "m1",
            occurredAt: "2026-01-01T00:01:00Z",
            amount: 1,
            currency: "IRR",
            status: "succeeded",
          },
        ]),
    ).toThrow(DomainValidationError);
  });

  it("rejects cross-merchant session corruption before a snapshot is healthy", () => {
    expect(
      () =>
        new InMemoryPaymentAttemptRepository([
          {
            attemptId: "invalid-a1",
            sessionId: "shared-session",
            merchantId: "m1",
            occurredAt: "2026-01-01T00:00:00Z",
            amount: 10,
            currency: "IRR",
            status: "failed",
          },
          {
            attemptId: "invalid-a2",
            sessionId: "shared-session",
            merchantId: "m2",
            occurredAt: "2026-01-01T00:01:00Z",
            amount: 10,
            currency: "IRR",
            status: "succeeded",
          },
        ]),
    ).toThrow(DomainValidationError);
  });

  it("provides immutable in-memory snapshots and honest unavailable errors", async () => {
    const repository = new InMemoryPaymentAttemptRepository(attempts, {
      datasetId: "test-data",
      loadedAt: "2026-01-03T00:00:00Z",
    });
    const snapshot = await repository.getSnapshot();
    expect(await repository.getSnapshot()).toBe(snapshot);
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.attempts)).toBe(true);
    expect(Object.isFrozen(snapshot.attempts[0])).toBe(true);
    expect(Object.isFrozen(snapshot.attempts[0]?.merchantCategory)).toBe(true);
    expect(() => {
      (snapshot.attempts as PaymentAttempt[]).splice(0, 1);
    }).toThrow(TypeError);
    expect(await repository.list({ statuses: ["failed"] })).toHaveLength(2);

    const unavailable = new UnavailablePaymentAttemptRepository(
      "not configured",
    );
    await expect(unavailable.getSnapshot()).rejects.toBeInstanceOf(
      RepositoryError,
    );
    await expect(unavailable.list()).rejects.toThrow("not configured");
  });

  it("loads an immutable cached file snapshot and reloads changes", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "merchant-intelligence-test-"),
    );
    const filePath = join(directory, "attempts.json");
    try {
      await writeFile(filePath, JSON.stringify(attempts), "utf8");
      const repository = new FilePaymentAttemptRepository(filePath);
      const first = await repository.getSnapshot();
      const cached = await repository.getSnapshot();
      expect(cached).toBe(first);
      expect(Object.isFrozen(cached)).toBe(true);
      expect(Object.isFrozen(cached.attempts)).toBe(true);
      expect(cached.datasetId).toBe(first.datasetId);

      const additional = parsePaymentAttempts([
        {
          attemptId: "file-added",
          sessionId: "file-added-session",
          merchantId: "m1",
          occurredAt: "2026-01-03T00:00:00Z",
          amount: 50,
          currency: "IRR",
          status: "succeeded",
        },
      ]);
      await writeFile(
        filePath,
        JSON.stringify([...attempts, ...additional]),
        "utf8",
      );
      const reloaded = await repository.getSnapshot();
      expect(reloaded.attempts).toHaveLength(5);
      expect(reloaded.datasetId).not.toBe(first.datasetId);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("reloads a same-size rewrite when mtime is preserved and ctime is reliable", async () => {
    const directory = await mkdtemp(
      join(tmpdir(), "merchant-intelligence-freshness-test-"),
    );
    const filePath = join(directory, "attempts.json");
    try {
      const initialJson = JSON.stringify(attempts);
      const rewrittenJson = initialJson.replace(
        '"attemptId":"a1"',
        '"attemptId":"z1"',
      );
      expect(rewrittenJson).not.toBe(initialJson);
      expect(rewrittenJson.length).toBe(initialJson.length);

      const fixedTimestamp = new Date("2026-01-10T00:00:00.000Z");
      await writeFile(filePath, initialJson, "utf8");
      await utimes(filePath, fixedTimestamp, fixedTimestamp);
      const repository = new FilePaymentAttemptRepository(filePath);
      const first = await repository.getSnapshot();
      const beforeRewrite = await stat(filePath, { bigint: true });

      await writeFile(filePath, rewrittenJson, "utf8");
      await utimes(filePath, fixedTimestamp, fixedTimestamp);
      const afterRewrite = await stat(filePath, { bigint: true });

      expect(afterRewrite.size).toBe(beforeRewrite.size);
      expect(afterRewrite.mtimeNs).toBe(beforeRewrite.mtimeNs);
      if (afterRewrite.ctimeNs === beforeRewrite.ctimeNs) {
        return;
      }

      const reloaded = await repository.getSnapshot();
      expect(reloaded.datasetId).not.toBe(first.datasetId);
      expect(reloaded.attempts[0]?.attemptId).toBe("z1");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
