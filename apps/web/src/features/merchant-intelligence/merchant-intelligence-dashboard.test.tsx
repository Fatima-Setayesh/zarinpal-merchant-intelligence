import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { App } from "@/app/app";
import { AppProviders } from "@/app/providers";

const mockState = vi.hoisted(() => ({
  emptyInsights: false,
  insightsError: null as unknown,
  segmentsError: null as unknown,
}));

const period = {
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-01-03T23:59:59.999Z",
  timezone: "Asia/Tehran",
};

const traceability = {
  analysisUnit: "payment_session",
  formula: {
    label: "Total volume",
    explanation: "Sum amount once per session.",
  },
  sourceMetricIds: ["payment-session-representative-amount"],
  filters: { merchantIds: ["merchant-1"], dateRange: period },
  dateRange: period,
  sample: { size: 3, analysisUnit: "payment_session" },
  missingDataHandling: "Required values are validated; no value is imputed.",
  assumptions: ["NoAttempt remains a zero-attempt failed session."],
  limitations: ["Descriptive analysis does not establish causation."],
  provenance: {
    datasetId: "dataset-test",
    sourceReference: "dataset:dataset-test",
  },
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
  traceability: {
    ...traceability,
    formula: { ...traceability.formula, label },
  },
  limitations: traceability.limitations,
});

const readyQuery = {
  isPending: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
};

const responseMeta = {
  appliedFilters: {
    merchantIds: ["merchant-1"],
    dateRange: period,
    analysisUnit: "payment_session",
    dimensions: [
      { key: "category", operator: "include", values: ["retail"] },
      { key: "status", operator: "include", values: ["failed"] },
      { key: "issuer", operator: "include", values: ["issuer-1"] },
      { key: "terminal", operator: "include", values: ["terminal-1"] },
      { key: "attempt_count_min", operator: "include", values: ["0"] },
      { key: "attempt_count_max", operator: "include", values: ["3"] },
      { key: "amount_min", operator: "include", values: ["0"] },
      { key: "amount_max", operator: "include", values: ["600000"] },
    ],
  },
  warnings: [],
  provenance: {
    datasetId: "dataset-test",
    sourceReference: "dataset:dataset-test",
    loadedAt: "2026-01-04T00:00:00.000Z",
  },
};

vi.mock("./api/queries", () => ({
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
      ...readyQuery,
    },
    filterOptions: {
      data: {
        data: {
          dateRange: period,
          categories: [{ id: "retail", value: "retail", label: "خرده‌فروشی" }],
          statuses: [
            { value: "succeeded", label: "Succeeded" },
            { value: "failed", label: "Failed" },
            { value: "pending", label: "Pending" },
          ],
          terminals: [{ value: "terminal-1", label: "terminal-1" }],
          issuers: [{ value: "issuer-1", label: "issuer-1" }],
          attemptCountRange: { minimum: 0, maximum: 3 },
          amountRange: { minimum: 0, maximum: 600_000 },
          supportedDimensions: [
            "category",
            "status",
            "issuer",
            "terminal",
            "attempt_count_min",
            "attempt_count_max",
            "amount_min",
            "amount_max",
          ],
          analysisUnits: [{ value: "payment_session", label: "نشست پرداخت" }],
        },
        warnings: [],
        provenance: responseMeta.provenance,
      },
      isLoading: false,
      isError: false,
      ...readyQuery,
    },
  }),
  useMerchantIntelligence: (
    _merchantId: string | null,
    filters: { dimensions?: Array<{ key: string }> } | null,
  ) => {
    const scopePending =
      filters?.dimensions?.some((dimension) => dimension.key === "status") ??
      false;
    const volume = metric(
      "total-payment-volume-IRR",
      "حجم پرداخت",
      600_000,
      "IRR",
    );
    const failedRate = metric(
      "failed-session-rate",
      "نرخ نشست ناموفق",
      33.3,
      "percent",
    );
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
    const feeMetric = {
      ...metric(
        "relative-adjusted-fee-to-amount-ratio-IRR",
        "نسبت تعدیل‌شده",
        2,
        "percent",
      ),
      disclosure: {
        code: "TRANSFORMED_ADJUSTED_FEE",
        message:
          "Adjusted fee is confidentially transformed and is not the real fee.",
      },
    };
    return {
      summary: {
        ...readyQuery,
        data: scopePending
          ? undefined
          : {
              data: {
                merchantId: "merchant-1",
                displayName: "پذیرنده آزمون",
                category: { id: "retail", label: "خرده‌فروشی" },
                reportingPeriod: period,
                analysisUnit: "payment_session",
                headlineMetrics: [
                  volume,
                  metric("successful-session-count", "نشست موفق", 2),
                  metric("failed-session-count", "نشست ناموفق", 1),
                  metric(
                    "successful-session-rate",
                    "نرخ موفقیت",
                    66.7,
                    "percent",
                  ),
                  failedRate,
                  metric(
                    "observed-retry-recovery-rate",
                    "بازیابی تلاش مجدد",
                    50,
                    "percent",
                  ),
                  feeMetric,
                ],
                limitations: traceability.limitations,
              },
              ...responseMeta,
            },
        isPending: scopePending,
        isFetching: scopePending,
        isLoading: false,
        isError: false,
      },
      insights: {
        ...readyQuery,
        data: {
          page: {
            items: mockState.emptyInsights
              ? []
              : [
                  {
                    insightId: "insight-1",
                    merchantId: "merchant-1",
                    title: "نشست‌های ناموفق نیازمند بررسی‌اند",
                    observation:
                      "یک نشست از سه نشست بدون موفقیت پایان یافته است.",
                    businessImpact:
                      "این حجم مشاهده‌شده می‌تواند صف بررسی عملیاتی را مشخص کند.",
                    priority: "high",
                    evidence: [evidence],
                    recommendations: [
                      {
                        recommendationId: "recommendation-1",
                        action:
                          "دلایل خطا را بر اساس پایانه و صادرکننده بررسی کنید.",
                        rationale: "این کار دامنه بررسی را محدود می‌کند.",
                        supportingEvidenceIds: ["evidence-1"],
                        caveats: [],
                      },
                    ],
                    limitations: traceability.limitations,
                  },
                ],
          },
        },
        ...responseMeta,
        error: mockState.insightsError,
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
        ...responseMeta,
        isError: false,
        ...readyQuery,
      },
      segments: {
        ...readyQuery,
        data: { page: { items: [] } },
        error: mockState.segmentsError,
        isError: false,
      },
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
  mockState.emptyInsights = false;
  mockState.insightsError = null;
  mockState.segmentsError = null;
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
    expect(
      screen.getAllByText("یک نشست از سه نشست بدون موفقیت پایان یافته است.")
        .length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText("دلایل خطا را بر اساس پایانه و صادرکننده بررسی کنید.")
        .length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(/بیشترین فرصت/u)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Demo|Placeholder|Illustrative/u),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText("۳ نشست پرداخت در نمونه").length,
    ).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("شاخص‌های تکمیلی"));
    expect(
      screen.getByText(
        "Adjusted fee is confidentially transformed and is not the real fee.",
      ),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "تم تاریک" }));
    expect(localStorage.getItem("merchant-intelligence-theme")).toBe("dark");

    const filterTrigger = screen.getByRole("button", { name: "فیلترها" });
    fireEvent.click(screen.getByText(/فیلتر دیگر/u));
    expect(screen.getByText(/وضعیت: ناموفق/u)).toBeInTheDocument();
    expect(screen.getByText(/صادرکننده: issuer-1/u)).toBeInTheDocument();
    expect(screen.getByText(/پایانه: terminal-1/u)).toBeInTheDocument();

    filterTrigger.focus();
    fireEvent.click(filterTrigger);
    expect(screen.getByRole("dialog", { name: "فیلترها" })).toBeInTheDocument();
    expect(screen.getByLabelText("حداقل تعداد تلاش")).toHaveAttribute(
      "max",
      "3",
    );
    expect(screen.getByRole("option", { name: "ناموفق" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));
    await waitFor(() => expect(filterTrigger).toHaveFocus());

    const volumeTrigger = screen.getByRole("button", { name: /حجم پرداخت/u });
    volumeTrigger.focus();
    fireEvent.click(volumeTrigger);
    expect(
      screen.getByRole("dialog", { name: "ردیابی محاسبه" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "بستن" }));
    await waitFor(() => expect(volumeTrigger).toHaveFocus());

    fireEvent.click(screen.getByRole("tab", { name: "بینش‌ها" }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "بینش‌های بازگردانده‌شده API" }),
      ).toBeInTheDocument(),
    );
  });

  it("removes previous-scope claims while an applied filter scope is pending", async () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    fireEvent.click(screen.getByRole("button", { name: "فیلترها" }));
    fireEvent.change(screen.getByLabelText("وضعیت پرداخت"), {
      target: { value: "failed" },
    });
    fireEvent.click(screen.getByRole("button", { name: "اعمال فیلترها" }));
    expect(
      await screen.findByText("در حال اعتبارسنجی و اعمال دامنه تحلیل…"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("یک نشست از سه نشست بدون موفقیت پایان یافته است."),
    ).not.toBeInTheDocument();
  });

  it("keeps healthy sections usable when insights and segments fail independently", () => {
    mockState.insightsError = new Error("insights failed");
    mockState.segmentsError = new Error("segments failed");
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    expect(screen.getAllByText("بینش‌ها دریافت نشدند").length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getByText("گروه‌های توصیفی دریافت نشدند"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /روند روزانه نرخ نشست موفق/u }),
    ).toBeInTheDocument();
  });

  it("does not turn an empty insight response into a stability claim", () => {
    mockState.emptyInsights = true;
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );
    expect(
      screen.getByRole("heading", {
        name: "برای این دامنه بینش اولویت‌داری بازگردانده نشد.",
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("وضعیت پایدار است")).not.toBeInTheDocument();
    expect(
      screen.getByText(/به‌تنهایی پایداری یا نبود مسئله را اثبات نمی‌کند/u),
    ).toBeInTheDocument();
  });
});
