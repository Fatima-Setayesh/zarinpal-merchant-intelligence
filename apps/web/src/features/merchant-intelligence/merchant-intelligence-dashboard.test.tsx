import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers";

const period = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-01-03T23:59:59.999Z",
  timezone: "Asia/Tehran",
};

const traceability = {
  analysisUnit: "payment_session",
  formula: { label: "Total volume", explanation: "Sum amount once per session." },
  sourceMetricIds: ["payment-session-representative-amount"],
  filters: { merchantIds: ["merchant-1"], dateRange: period },
  dateRange: period,
  sample: { size: 3, analysisUnit: "payment_session" },
  missingDataHandling: "Required values are validated; no value is imputed.",
  assumptions: ["NoAttempt remains a zero-attempt failed session."],
  limitations: ["Descriptive analysis does not establish causation."],
  provenance: { datasetId: "dataset-test", sourceReference: "dataset:dataset-test" },
};

const metric = (
  metricId: string,
  label: string,
  value: number,
  unit = "count",
) => ({
  metricId,
  label,
  definition: `${label} derived from validated sessions.`,
  value,
  unit,
  analysisUnit: "payment_session",
  period,
  sampleSize: 3,
  traceability: { ...traceability, formula: { ...traceability.formula, label } },
  limitations: traceability.limitations,
});

vi.mock("./api", () => ({
  useMerchantBootstrap: () => ({
    merchants: {
      data: {
        page: {
          items: [
            {
              merchantId: "merchant-1",
              displayName: "پذیرنده آزمون",
              category: { id: "retail", label: "خرده‌فروشی" },
            },
          ],
        },
      },
      isLoading: false,
      isError: false,
    },
    filterOptions: {
      data: {
        data: {
          dateRange: period,
          categories: [{ id: "retail", value: "retail", label: "خرده‌فروشی" }],
          statuses: [],
          terminals: [{ value: "terminal-1", label: "terminal-1" }],
          issuers: [{ value: "issuer-1", label: "issuer-1" }],
          attemptCountRange: { minimum: 0, maximum: 3 },
        },
      },
      isLoading: false,
      isError: false,
    },
  }),
  useMerchantIntelligence: () => {
    const volume = metric("total-payment-volume-IRR", "حجم پرداخت", 600_000, "IRR");
    const failedRate = metric("failed-session-rate", "نرخ نشست ناموفق", 33.3, "percent");
    const evidence = {
      evidenceId: "evidence-1",
      metric: failedRate,
      filters: traceability.filters,
      dateRange: period,
      sample: { size: 3, analysisUnit: "payment_session" },
      formula: traceability.formula,
      missingDataHandling: traceability.missingDataHandling,
      limitations: traceability.limitations,
      sourceReference: "dataset:dataset-test",
    };
    return {
      summary: {
        data: {
          data: {
            merchantId: "merchant-1",
            displayName: "پذیرنده آزمون",
            category: { id: "retail", label: "خرده‌فروشی" },
            reportingPeriod: period,
            headlineMetrics: [
              volume,
              metric("successful-session-count", "نشست موفق", 2),
              metric("failed-session-count", "نشست ناموفق", 1),
              metric("successful-session-rate", "نرخ موفقیت", 66.7, "percent"),
              failedRate,
              metric("observed-retry-recovery-rate", "بازیابی تلاش مجدد", 50, "percent"),
              metric("relative-adjusted-fee-to-amount-ratio-IRR", "نسبت تعدیل‌شده", 2, "percent"),
            ],
            limitations: traceability.limitations,
          },
        },
        isLoading: false,
        isError: false,
      },
      insights: {
        data: {
          page: {
            items: [
              {
                insightId: "insight-1",
                merchantId: "merchant-1",
                title: "نشست‌های ناموفق نیازمند بررسی‌اند",
                observation: "یک نشست از سه نشست بدون موفقیت پایان یافته است.",
                businessImpact: "این حجم مشاهده‌شده می‌تواند صف بررسی عملیاتی را مشخص کند.",
                priority: "high",
                evidence: [evidence],
                recommendations: [
                  {
                    recommendationId: "recommendation-1",
                    action: "دلایل خطا را بر اساس پایانه و صادرکننده بررسی کنید.",
                    rationale: "این کار دامنه بررسی را محدود می‌کند.",
                    caveats: [],
                  },
                ],
                limitations: traceability.limitations,
              },
            ],
          },
        },
        isError: false,
      },
      trends: {
        data: {
          page: {
            items: [
              {
                seriesId: "trend-1",
                label: "روند نرخ موفقیت",
                metricId: "successful-session-rate",
                unit: "percent",
                analysisUnit: "payment_session",
                points: [
                  { x: "2026-01-01", y: 50, sampleSize: 1 },
                  { x: "2026-01-02", y: 100, sampleSize: 2 },
                ],
                traceability,
                limitations: traceability.limitations,
              },
            ],
          },
        },
        isError: false,
      },
      segments: { data: { page: { items: [] } }, isError: false },
    };
  },
}));

vi.stubGlobal(
  "matchMedia",
  vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
);

afterEach(() => {
  window.history.replaceState({}, "", "/");
  localStorage.clear();
});

describe("MerchantIntelligenceDashboard", () => {
  it("supports theme, filter, tab, and trace interactions on the main experience", async () => {
    window.history.replaceState({}, "", "/");
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getAllByText("پذیرنده آزمون").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Demo|Placeholder|Illustrative/u)).not.toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "fa");
    expect(document.documentElement).toHaveAttribute("dir", "rtl");

    fireEvent.click(screen.getByRole("button", { name: "تم تاریک" }));
    expect(localStorage.getItem("merchant-intelligence-theme")).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "فیلترها" }));
    expect(screen.getByRole("dialog", { name: "فیلترها" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));

    fireEvent.click(screen.getByRole("button", { name: /حجم پرداخت/u }));
    expect(screen.getByRole("dialog", { name: "ردیابی محاسبه" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));

    fireEvent.click(screen.getByRole("tab", { name: "بینش‌ها" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "بینش‌های اولویت‌بندی‌شده" })).toBeInTheDocument(),
    );
  });
});
