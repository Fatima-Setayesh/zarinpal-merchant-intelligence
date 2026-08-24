import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchJson, resolveApiBase } from "./client";
import { ApiClientError } from "./errors";
import { SchemaValidationError } from "./schemas";

afterEach(() => vi.unstubAllGlobals());

describe("API client", () => {
  it("uses a same-origin production default and rejects unsafe protocols", () => {
    expect(resolveApiBase(undefined, false)).toBe("/api/v1");
    expect(resolveApiBase(undefined, true)).toBe(
      "http://localhost:3000/api/v1",
    );
    expect(() => resolveApiBase("javascript:alert(1)", false)).toThrow();
  });

  it("fails closed when a successful response violates the runtime schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ value: "not-a-number" }), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "x-request-id": "request-schema",
            },
          }),
      ),
    );
    const request = fetchJson("/test", () => {
      throw new SchemaValidationError("$.value", "Expected a number.");
    });
    await expect(request).rejects.toMatchObject({
      kind: "invalid_response",
      requestId: "request-schema",
    } satisfies Partial<ApiClientError>);
  });

  it("preserves structured API errors and request IDs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: "DATA_UNAVAILABLE",
                message: "Dataset unavailable.",
              },
              requestId: "request-503",
            }),
            { status: 503, headers: { "content-type": "application/json" } },
          ),
      ),
    );
    await expect(fetchJson("/test", (value) => value)).rejects.toMatchObject({
      kind: "unavailable",
      code: "DATA_UNAVAILABLE",
      requestId: "request-503",
    } satisfies Partial<ApiClientError>);
  });
});
