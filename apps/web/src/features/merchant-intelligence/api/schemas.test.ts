import { describe, expect, it } from "vitest";

import { parseMerchantSummaryResponse, SchemaValidationError } from "./schemas";

describe("API response schemas", () => {
  it("rejects a corrupt analytical metric instead of trusting partial data", () => {
    expect(() =>
      parseMerchantSummaryResponse({
        data: {
          merchantId: "merchant-1",
          displayName: "Merchant",
          reportingPeriod: {
            from: "2026-01-01T00:00:00.000Z",
            to: "2026-01-02T00:00:00.000Z",
            timezone: "UTC",
          },
          analysisUnit: "payment_session",
          headlineMetrics: [
            {
              metricId: "failed-session-rate",
              label: "Failed rate",
              definition: "Definition",
              value: "33.3",
              unit: "percent",
              analysisUnit: "payment_session",
              period: {
                from: "2026-01-01T00:00:00.000Z",
                to: "2026-01-02T00:00:00.000Z",
                timezone: "UTC",
              },
              limitations: [],
            },
          ],
          limitations: [],
        },
        appliedFilters: {},
        warnings: [],
        provenance: {
          datasetId: "dataset-1",
          loadedAt: "2026-01-02T00:00:00.000Z",
        },
      }),
    ).toThrow(SchemaValidationError);
  });
});
