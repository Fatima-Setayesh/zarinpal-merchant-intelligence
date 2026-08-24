import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { connect, type AddressInfo } from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { createApp } from "../src/app.js";
import { ConfigurationError, loadConfig } from "../src/config.js";
import type { PaymentAttempt } from "../src/domain.js";
import {
  InMemoryPaymentAttemptRepository,
  UnavailablePaymentAttemptRepository,
  type PaymentAttemptRepository,
} from "../src/repository.js";
import { closeServerGracefully, startServer } from "../src/server.js";
import { createMerchantIntelligenceService } from "../src/service.js";

const servers: Server[] = [];

const attempts: PaymentAttempt[] = [
  {
    attemptId: "attempt-1",
    sessionId: "session-1",
    merchantId: "merchant-1",
    occurredAt: "2026-01-01T08:00:00.000Z",
    amount: 100,
    currency: "IRR",
    status: "failed",
    adjustedFee: 2,
    terminalId: "terminal-1",
    issuer: "issuer-1",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "attempt-2",
    sessionId: "session-1",
    merchantId: "merchant-1",
    occurredAt: "2026-01-01T08:01:00.000Z",
    amount: 100,
    currency: "IRR",
    status: "succeeded",
    adjustedFee: 2,
    terminalId: "terminal-1",
    issuer: "issuer-1",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "attempt-3",
    sessionId: "session-2",
    merchantId: "merchant-1",
    occurredAt: "2026-01-02T09:00:00.000Z",
    amount: 200,
    currency: "IRR",
    status: "failed",
    terminalId: "terminal-2",
    issuer: "issuer-2",
    merchantDisplayName: "Merchant One",
    merchantCategory: { id: "retail", label: "Retail" },
  },
  {
    attemptId: "attempt-4",
    sessionId: "session-3",
    merchantId: "merchant-2",
    occurredAt: "2026-01-03T10:00:00.000Z",
    amount: 300,
    currency: "IRR",
    status: "succeeded",
    terminalId: "terminal-3",
    issuer: "issuer-2",
    merchantDisplayName: "Merchant Two",
    merchantCategory: { id: "services", label: "Services" },
  },
];

const startApi = async (
  repository: PaymentAttemptRepository,
  corsOrigin = "https://merchant.example",
  authToken?: string,
): Promise<string> => {
  const service = createMerchantIntelligenceService(repository);
  const server = createServer(
    createApp({
      service,
      corsOrigin,
      ...(authToken !== undefined ? { authToken } : {}),
      requestIdFactory: () => "generated-request-id",
    }),
  );
  servers.push(server);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
};

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error === undefined) {
        resolve();
      } else {
        reject(error);
      }
    });
  });
};

const sendRawRequest = async (
  baseUrl: string,
  request: string,
): Promise<string> => {
  const port = Number(new URL(baseUrl).port);
  return new Promise<string>((resolve, reject) => {
    const socket = connect({ host: "127.0.0.1", port });
    let response = "";
    socket.setEncoding("utf8");
    socket.on("connect", () => socket.end(request));
    socket.on("data", (chunk: string) => {
      response += chunk;
    });
    socket.on("end", () => resolve(response));
    socket.on("error", reject);
  });
};

afterEach(async () => {
  await Promise.all(servers.splice(0).map(closeServer));
});

describe("merchant intelligence HTTP API", () => {
  it("requires a valid Bearer token for data routes when configured", async () => {
    const authToken = "a-secure-api-token-with-32-characters";
    const url = await startApi(
      new InMemoryPaymentAttemptRepository(attempts),
      "https://merchant.example",
      authToken,
    );

    const health = await fetch(`${url}/api/v1/health`);
    expect(health.status).toBe(200);

    const preflight = await fetch(`${url}/api/v1/filter-options`, {
      method: "OPTIONS",
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-headers")).toContain(
      "authorization",
    );

    const unauthenticated = await fetch(`${url}/api/v1/filter-options`, {
      headers: { "x-request-id": "auth-request" },
    });
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.headers.get("www-authenticate")).toBe(
      'Bearer realm="merchant-intelligence-api"',
    );
    await expect(unauthenticated.json()).resolves.toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid Bearer token is required.",
      },
      requestId: "auth-request",
    });

    const invalid = await fetch(`${url}/api/v1/filter-options`, {
      headers: { authorization: "Bearer incorrect-token" },
    });
    expect(invalid.status).toBe(401);

    const authenticated = await fetch(`${url}/api/v1/filter-options`, {
      headers: { authorization: `Bearer ${authToken}` },
    });
    expect(authenticated.status).toBe(200);
  });

  it("reports ready and degraded health without exposing repository errors", async () => {
    const readyUrl = await startApi(
      new InMemoryPaymentAttemptRepository(attempts, {
        datasetId: "dataset-test",
        loadedAt: "2026-01-04T00:00:00.000Z",
      }),
    );
    const ready = await fetch(`${readyUrl}/api/v1/health`);
    expect(ready.status).toBe(200);
    const readyBody = await ready.json();
    expect(readyBody).toMatchObject({
      status: "ok",
      data: { paymentDataAvailable: true },
    });
    expect(JSON.stringify(readyBody)).not.toContain("dataset-test");

    const degradedUrl = await startApi(
      new UnavailablePaymentAttemptRepository("secret storage failure"),
    );
    const degraded = await fetch(`${degradedUrl}/api/v1/health`);
    expect(degraded.status).toBe(503);
    const degradedText = await degraded.text();
    expect(degradedText).toContain('"status":"degraded"');
    expect(degradedText).not.toContain("secret storage failure");
  });

  it("serves a summary with a canonical payment-session scope", async () => {
    const url = await startApi(
      new InMemoryPaymentAttemptRepository(attempts, {
        datasetId: "dataset-test",
        loadedAt: "2026-01-04T00:00:00.000Z",
      }),
    );
    const response = await fetch(
      `${url}/api/v1/merchants/merchant-1/summary/query`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filters: {} }),
      },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        analysisUnit: string;
        headlineMetrics: Array<{
          metricId: string;
          value: number | null;
          analysisUnit: string;
          traceability?: {
            filters: { merchantIds?: string[] };
            provenance: { datasetId: string; sourceReference: string };
          };
        }>;
      };
      appliedFilters: {
        analysisUnit: string;
        merchantIds: string[];
        dateRange: { from: string; to: string; timezone: string };
      };
      provenance: { datasetId: string; loadedAt: string };
    };

    expect(body.appliedFilters).toEqual({
      dateRange: {
        from: "2026-01-01T08:00:00.000Z",
        to: "2026-01-03T10:00:00.000Z",
        timezone: "UTC",
      },
      analysisUnit: "payment_session",
      merchantIds: ["merchant-1"],
    });
    expect(body.provenance).toMatchObject({
      datasetId: "dataset-test",
      loadedAt: "2026-01-04T00:00:00.000Z",
    });
    expect(body.data.analysisUnit).toBe("payment_session");
    expect(body.data.headlineMetrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          metricId: "payment-session-count",
          value: 2,
          analysisUnit: "payment_session",
        }),
      ]),
    );
    expect(body.data.headlineMetrics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ metricId: "payment-attempt-count" }),
      ]),
    );
    expect(
      body.data.headlineMetrics.every(
        (metric) => metric.analysisUnit === "payment_session",
      ),
    ).toBe(true);
    expect(
      body.data.headlineMetrics.find(
        (metric) => metric.metricId === "payment-session-count",
      )?.traceability,
    ).toMatchObject({
      filters: { merchantIds: ["merchant-1"] },
      provenance: {
        datasetId: "dataset-test",
        sourceReference: "dataset:dataset-test",
      },
    });
  });

  it("advertises endpoint-specific analysis-unit support", async () => {
    const url = await startApi(new InMemoryPaymentAttemptRepository(attempts));
    const response = await fetch(`${url}/api/v1/filter-options`);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      data: {
        dateRange: { from: string; to: string; timezone: string };
        analysisUnits: Array<{
          value: string;
          supportedEndpoints: string[];
        }>;
      };
    };

    expect(body.data.analysisUnits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          value: "payment_session",
          supportedEndpoints: ["summary", "insights", "trends", "segments"],
        }),
        expect.objectContaining({
          value: "payment_attempt",
          supportedEndpoints: ["trends"],
        }),
      ]),
    );
    expect(body.data.dateRange).toEqual({
      from: "2026-01-01T08:00:00.000Z",
      to: "2026-01-03T10:00:00.000Z",
      timezone: "UTC",
    });
  });

  it("exposes aggregate insights, traces, trends, and segments through the API", async () => {
    const url = await startApi(
      new InMemoryPaymentAttemptRepository(attempts, {
        datasetId: "dataset-test",
      }),
    );
    const post = (path: string, filters: Record<string, unknown>) =>
      fetch(`${url}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filters, page: { limit: 20 } }),
      });
    const [insightsResponse, trendsResponse, segmentsResponse] =
      await Promise.all([
        post("/api/v1/insights/query", { merchantIds: ["merchant-1"] }),
        post("/api/v1/trends/query", { merchantIds: ["merchant-1"] }),
        post("/api/v1/segments/query", {}),
      ]);

    expect([
      insightsResponse.status,
      trendsResponse.status,
      segmentsResponse.status,
    ]).toEqual([200, 200, 200]);
    const insights = (await insightsResponse.json()) as {
      page: {
        items: Array<{
          evidence: Array<{ metric: { traceability?: unknown } }>;
        }>;
      };
    };
    const trends = (await trendsResponse.json()) as {
      page: {
        items: Array<{
          traceability?: unknown;
          points: Array<{ sampleSize?: number }>;
        }>;
      };
    };
    const segments = (await segmentsResponse.json()) as {
      page: {
        items: Array<{
          metrics: Array<{ traceability?: { referencePopulation?: unknown } }>;
        }>;
      };
    };

    expect(insights.page.items.length).toBeGreaterThan(0);
    expect(trends.page.items.length).toBeGreaterThan(0);
    expect(segments.page.items.length).toBeGreaterThan(0);
    expect(
      insights.page.items.every((insight) =>
        insight.evidence.every(
          (evidence) => evidence.metric.traceability !== undefined,
        ),
      ),
    ).toBe(true);
    expect(
      trends.page.items.every(
        (series) =>
          series.traceability !== undefined &&
          series.points.every((point) => point.sampleSize !== undefined),
      ),
    ).toBe(true);
    expect(
      segments.page.items.every((segment) =>
        segment.metrics.every(
          (metric) => metric.traceability?.referencePopulation !== undefined,
        ),
      ),
    ).toBe(true);
    expect(JSON.stringify([insights, trends, segments])).not.toContain(
      '"attemptId"',
    );
  });

  it("serves paged insights and binds cursors to the dataset and query", async () => {
    const url = await startApi(
      new InMemoryPaymentAttemptRepository(attempts, {
        datasetId: "dataset-test",
      }),
    );
    const first = await fetch(`${url}/api/v1/insights/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filters: { merchantIds: ["merchant-1"] },
        page: { limit: 1 },
      }),
    });
    expect(first.status).toBe(200);
    const firstBody = (await first.json()) as {
      page: { items: unknown[]; nextCursor: string | null; totalCount: number };
    };
    expect(firstBody.page.items).toHaveLength(1);
    expect(firstBody.page.totalCount).toBe(2);
    expect(firstBody.page.nextCursor).toEqual(expect.any(String));

    const mismatched = await fetch(`${url}/api/v1/insights/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filters: { merchantIds: ["merchant-2"] },
        page: { limit: 1, cursor: firstBody.page.nextCursor },
      }),
    });
    expect(mismatched.status).toBe(400);
  });

  it("rejects unsupported or ambiguous input instead of ignoring it", async () => {
    const url = await startApi(new InMemoryPaymentAttemptRepository(attempts));
    const response = await fetch(`${url}/api/v1/trends/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filters: {
          merchantIds: ["merchant-1"],
          dimensions: [
            { key: "unknown", operator: "include", values: ["value"] },
          ],
        },
        page: {},
      }),
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "VALIDATION_ERROR" },
      requestId: "generated-request-id",
    });

    const missingMerchant = await fetch(`${url}/api/v1/insights/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ filters: {}, page: {} }),
    });
    expect(missingMerchant.status).toBe(400);

    const ambiguousDate = await fetch(`${url}/api/v1/trends/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        filters: {
          merchantIds: ["merchant-1"],
          dateRange: {
            from: "2026-01-01T00:00:00",
            to: "2026-01-02T00:00:00Z",
            timezone: "UTC",
          },
        },
        page: {},
      }),
    });
    expect(ambiguousDate.status).toBe(400);
  });

  it("handles CORS preflight and returns hardened 404/405 errors", async () => {
    const url = await startApi(new InMemoryPaymentAttemptRepository(attempts));
    const preflight = await fetch(`${url}/api/v1/insights/query`, {
      method: "OPTIONS",
      headers: { origin: "https://merchant.example" },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe(
      "https://merchant.example",
    );
    expect(preflight.headers.get("vary")).toBe("origin");
    expect(preflight.headers.get("x-content-type-options")).toBe("nosniff");

    const notFound = await fetch(`${url}/api/v1/not-a-route`, {
      headers: { "x-request-id": "client-request-id" },
    });
    expect(notFound.status).toBe(404);
    await expect(notFound.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
      requestId: "client-request-id",
    });

    const wrongMethod = await fetch(`${url}/api/v1/health`, {
      method: "POST",
    });
    expect(wrongMethod.status).toBe(405);
    expect(wrongMethod.headers.get("allow")).toBe("GET");
    const wrongMethodText = await wrongMethod.text();
    expect(wrongMethodText).not.toContain("stack");
  });

  it("rejects a malformed raw preflight target without crashing", async () => {
    const url = await startApi(new InMemoryPaymentAttemptRepository(attempts));
    const response = await sendRawRequest(
      url,
      "OPTIONS http://[ HTTP/1.1\r\nHost: api.local\r\nConnection: close\r\n\r\n",
    );

    expect(response).toContain(" 400 ");
    expect(response).toContain('"code":"VALIDATION_ERROR"');
    expect((await fetch(`${url}/api/v1/health`)).status).toBe(200);
  });

  it("returns 503 for data endpoints when storage is unavailable", async () => {
    const url = await startApi(
      new UnavailablePaymentAttemptRepository("private database host"),
    );
    const response = await fetch(`${url}/api/v1/filter-options`);
    expect(response.status).toBe(503);
    const text = await response.text();
    expect(text).toContain('"code":"DATA_UNAVAILABLE"');
    expect(text).not.toContain("private database host");
  });

  it("enforces the JSON request-size limit", async () => {
    const url = await startApi(new InMemoryPaymentAttemptRepository(attempts));
    const response = await fetch(`${url}/api/v1/segments/query`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(64 * 1024) }),
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "PAYLOAD_TOO_LARGE" },
    });
  });
});

describe("API authentication configuration", () => {
  it("keeps loopback tokenless but fails closed for exposed hosts", () => {
    expect(loadConfig({}).authToken).toBeUndefined();
    expect(() => loadConfig({ API_AUTH_TOKEN: "short" })).toThrowError(
      ConfigurationError,
    );
    expect(() => loadConfig({ API_HOST: "0.0.0.0" })).toThrowError(
      /API_AUTH_TOKEN/u,
    );

    const token = "x".repeat(32);
    expect(
      loadConfig({ API_HOST: "0.0.0.0", API_AUTH_TOKEN: token }).authToken,
    ).toBe(token);
  });
});

describe("API server lifecycle", () => {
  it("uses bounded HTTP timeouts and force-closes a slow request", async () => {
    const server = await startServer({
      host: "127.0.0.1",
      port: 0,
      paymentsDataPath: undefined,
      corsOrigin: "http://localhost:5173",
      authToken: undefined,
    });
    servers.push(server);
    expect(server.headersTimeout).toBe(10_000);
    expect(server.requestTimeout).toBe(30_000);
    expect(server.keepAliveTimeout).toBe(5_000);

    const address = server.address() as AddressInfo;
    const socket = connect({ host: "127.0.0.1", port: address.port });
    await once(socket, "connect");
    socket.write("POST /api/v1/insights/query HTTP/1.1\r\nHost: api.local\r\n");

    await closeServerGracefully(server, 25);
    socket.destroy();
    servers.splice(servers.indexOf(server), 1);
    expect(server.listening).toBe(false);
    await expect(closeServerGracefully(server, 25)).resolves.toBeUndefined();
  });
});
