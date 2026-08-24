import { describe, expect, it } from "vitest";

import type { FilterOptions } from "../api/types";
import {
  calendarDateInTimezone,
  serializeCalendarDayRange,
  toFilterState,
  type FilterDraft,
} from "./filters";

const options: FilterOptions = {
  dateRange: {
    from: "2025-12-31T20:30:00.000Z",
    to: "2026-01-03T20:29:59.999Z",
    timezone: "UTC",
  },
  categories: [],
  statuses: [{ value: "failed", label: "Failed" }],
  terminals: [],
  issuers: [],
  amountRange: { minimum: 100, maximum: 1_000 },
  attemptCountRange: { minimum: 0, maximum: 25 },
  analysisUnits: [
    {
      value: "payment_session",
      label: "Payment session",
      supportedEndpoints: ["summary", "insights", "trends", "segments"],
    },
  ],
  supportedDimensions: [
    "status",
    "attempt_count_min",
    "attempt_count_max",
    "amount_min",
    "amount_max",
  ],
  optionLimit: 100,
  truncated: { categories: false, terminals: false, issuers: false },
};

const draft: FilterDraft = {
  merchantId: "merchant-1",
  category: "ignored-category",
  dateFrom: "2026-01-01",
  dateTo: "2026-01-03",
  status: "failed",
  attemptMin: "2",
  attemptMax: "25",
  amountMin: "100",
  amountMax: "900",
  issuer: "ignored-issuer",
  terminal: "ignored-terminal",
};

describe("Tehran calendar filter serialization", () => {
  it("converts inclusive calendar-day boundaries with platform timezone rules", () => {
    expect(serializeCalendarDayRange("2026-01-01", "2026-01-03")).toEqual({
      from: "2025-12-31T20:30:00.000Z",
      to: "2026-01-03T20:29:59.999Z",
      timezone: "Asia/Tehran",
    });
  });

  it("round trips canonical instants to the selected Tehran dates", () => {
    const range = serializeCalendarDayRange("2026-01-01", "2026-01-03");
    expect(calendarDateInTimezone(range.from, range.timezone)).toBe(
      "2026-01-01",
    );
    expect(calendarDateInTimezone(range.to, range.timezone)).toBe("2026-01-03");
  });

  it("serializes only API-supported filters and preserves the full attempt range", () => {
    const result = toFilterState(draft, options);
    expect(result.dimensions).toEqual([
      { key: "status", operator: "include", values: ["failed"] },
      { key: "attempt_count_min", operator: "include", values: ["2"] },
      { key: "attempt_count_max", operator: "include", values: ["25"] },
      { key: "amount_min", operator: "include", values: ["100"] },
      { key: "amount_max", operator: "include", values: ["900"] },
    ]);
  });
});
