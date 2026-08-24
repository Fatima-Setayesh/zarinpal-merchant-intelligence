import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";

import { useMerchantBootstrap, useMerchantIntelligence } from "./api/queries";
import type {
  ChartSeries,
  Evidence,
  FilterState,
  Insight,
  Metric,
} from "./api/types";
import { ActiveScope } from "./components/active-scope";
import {
  EmptyState,
  SectionError,
  SectionLoading,
} from "./components/async-state";
import { DashboardTabs, type DashboardTab } from "./components/dashboard-tabs";
import { DecisionBrief } from "./components/decision-brief";
import { FilterDrawer } from "./components/filter-drawer";
import { InsightCard } from "./components/insight-card";
import { KpiCard } from "./components/kpi-card";
import { SegmentSummary } from "./components/segment-summary";
import { TraceabilityDrawer } from "./components/traceability-drawer";
import { TrendChart } from "./components/trend-chart";
import {
  createInitialDraft,
  toFilterState,
  type FilterDraft,
} from "./model/filters";
import {
  applyTheme,
  initialTheme,
  writeStoredTheme,
  type ThemeChoice,
} from "./model/theme";

type Drawer = "filters" | "trace" | null;

const metricById = (
  metrics: readonly Metric[],
  matcher: string | RegExp,
): Metric | undefined =>
  metrics.find((metric) =>
    typeof matcher === "string"
      ? metric.metricId === matcher
      : matcher.test(metric.metricId),
  );

const trendMetric = (series: ChartSeries): Metric | null => {
  if (!series.traceability) return null;
  return {
    metricId: series.metricId,
    label: series.label,
    definition: series.traceability.formula.explanation,
    value: null,
    unit: series.unit,
    analysisUnit:
      series.analysisUnit === "merchant"
        ? "payment_session"
        : series.analysisUnit,
    period: series.traceability.dateRange,
    sampleSize: series.traceability.sample.size,
    traceability: series.traceability,
    limitations: series.limitations,
  };
};

export function MerchantIntelligenceDashboard() {
  const bootstrap = useMerchantBootstrap();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [theme, setTheme] = useState<ThemeChoice>(initialTheme);
  const [draft, setDraft] = useState<FilterDraft | null>(null);
  const [applied, setApplied] = useState<FilterState | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(
    null,
  );
  const drawerTrigger = useRef<HTMLElement | null>(null);

  const merchants = useMemo(
    () => bootstrap.merchants.data?.page.items ?? [],
    [bootstrap.merchants.data?.page.items],
  );
  const optionsResponse = bootstrap.filterOptions.data;
  const options = optionsResponse?.data;

  useEffect(() => {
    applyTheme(theme);
    writeStoredTheme(window.localStorage, theme);
  }, [theme]);

  useEffect(() => {
    const firstMerchant = merchants[0];
    if (!draft && firstMerchant && options) {
      const initial = createInitialDraft(firstMerchant.merchantId, options);
      setDraft(initial);
      setApplied(toFilterState(initial, options));
    }
  }, [draft, merchants, options]);

  const intelligence = useMerchantIntelligence(
    applied?.merchantIds?.[0] ?? null,
    applied,
  );
  const summaryResponse = intelligence.summary.data;
  const summary = summaryResponse?.data;
  const insights = intelligence.insights.data?.page.items ?? [];
  const trends = intelligence.trends.data?.page.items ?? [];
  const segments = intelligence.segments.data?.page.items ?? [];
  const primaryInsight = insights[0];
  const metrics = summary?.headlineMetrics ?? [];
  const volume = metricById(metrics, /^total-payment-volume-/u);
  const successful = metricById(metrics, "successful-session-count");
  const failed = metricById(metrics, "failed-session-count");
  const retryRecovery = metricById(metrics, "observed-retry-recovery-rate");
  const failedRate = metricById(metrics, "failed-session-rate");
  const feeRatio = metricById(
    metrics,
    /relative-adjusted-fee-to-amount-ratio/u,
  );
  const trend =
    trends.find((series) => series.metricId === "successful-session-rate") ??
    trends.find((series) =>
      series.metricId.startsWith("total-payment-volume-"),
    ) ??
    trends[0];
  const updating = [
    intelligence.summary,
    intelligence.insights,
    intelligence.trends,
    intelligence.segments,
  ].some((query) => query.isFetching);

  const rememberTrigger = (): void => {
    drawerTrigger.current = document.activeElement as HTMLElement | null;
  };
  const closeDrawer = (): void => {
    const trigger = drawerTrigger.current;
    setDrawer(null);
    window.setTimeout(() => trigger?.focus(), 0);
  };
  const openMetric = (
    metric: Metric,
    evidence: Evidence | null = null,
  ): void => {
    rememberTrigger();
    setSelectedMetric(metric);
    setSelectedEvidence(evidence);
    setDrawer("trace");
  };
  const openInsightEvidence = (insight: Insight): void => {
    const evidence = insight.evidence[0];
    if (evidence) openMetric(evidence.metric, evidence);
  };
  const openTrendTrace = (series: ChartSeries): void => {
    const metric = trendMetric(series);
    if (metric) openMetric(metric);
  };
  const openFilters = (): void => {
    rememberTrigger();
    setDrawer("filters");
  };
  const applyFilters = (): void => {
    if (!draft || !options) return;
    try {
      setApplied(toFilterState(draft, options));
      setFilterError(null);
      closeDrawer();
    } catch (error: unknown) {
      setFilterError(
        error instanceof Error ? error.message : "دامنه انتخاب‌شده معتبر نیست.",
      );
    }
  };
  const resetFilters = (): void => {
    const firstMerchant = merchants[0];
    if (!firstMerchant || !options) return;
    const reset = createInitialDraft(firstMerchant.merchantId, options);
    setDraft(reset);
    setApplied(toFilterState(reset, options));
    setFilterError(null);
    closeDrawer();
  };

  const bootstrapLoading =
    bootstrap.merchants.isPending || bootstrap.filterOptions.isPending;
  const bootstrapError =
    bootstrap.merchants.error ?? bootstrap.filterOptions.error;

  return (
    <div className="preview-root min-h-dvh bg-background text-foreground">
      <a
        href="#dashboard-main"
        className="sr-only focus:fixed focus:top-4 focus:right-4 focus:z-50 focus:not-sr-only focus:rounded-lg focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground"
      >
        رفتن به محتوای اصلی
      </a>
      <header className="preview-header sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="هوشمندی پذیرنده"
          >
            <span className="preview-logo" aria-hidden="true">
              زر
            </span>
            <span className="hidden min-w-0 sm:block">
              <strong className="block truncate text-sm">
                هوشمندی پذیرنده
              </strong>
              <span className="block text-[11px] text-muted-foreground">
                تصمیم بهتر، بر پایه شواهد
              </span>
            </span>
          </a>
          <nav className="mx-auto" aria-label="ناوبری اصلی">
            <DashboardTabs selected={tab} onChange={setTab} />
          </nav>
          <div className="flex items-center gap-2">
            <div
              className="preview-theme-toggle"
              role="group"
              aria-label="پوسته"
            >
              <button
                type="button"
                aria-label="تم روشن"
                aria-pressed={theme === "light"}
                data-active={theme === "light"}
                onClick={() => setTheme("light")}
              >
                <span>روشن</span>
              </button>
              <button
                type="button"
                aria-label="تم تاریک"
                aria-pressed={theme === "dark"}
                data-active={theme === "dark"}
                onClick={() => setTheme("dark")}
              >
                <span>تاریک</span>
              </button>
            </div>
            <Button
              variant="secondary"
              className="px-3 sm:px-4"
              onClick={openFilters}
            >
              فیلترها
            </Button>
          </div>
        </div>
      </header>

      <main id="dashboard-main" className="preview-canvas pb-16">
        {bootstrapLoading ? (
          <SectionLoading label="در حال دریافت فهرست پذیرندگان و قابلیت‌های فیلتر…" />
        ) : bootstrapError ? (
          <div className="mx-auto max-w-3xl px-4 py-16">
            <SectionError
              title="راه‌اندازی داشبورد کامل نشد"
              error={bootstrapError}
              onRetry={() => {
                void bootstrap.merchants.refetch();
                void bootstrap.filterOptions.refetch();
              }}
            />
          </div>
        ) : merchants.length === 0 ? (
          <div className="mx-auto max-w-3xl px-4 py-16">
            <EmptyState>
              دیتاست در دسترس است، اما پذیرنده‌ای برای نمایش ندارد.
            </EmptyState>
          </div>
        ) : intelligence.summary.isPending ||
          !summary ||
          !summaryResponse ||
          !options ? (
          intelligence.summary.error ? (
            <div className="mx-auto max-w-3xl px-4 py-16">
              <SectionError
                title="خلاصه پذیرنده دریافت نشد"
                error={intelligence.summary.error}
                onRetry={() => void intelligence.summary.refetch()}
              />
            </div>
          ) : (
            <SectionLoading label="در حال اعتبارسنجی و اعمال دامنه تحلیل…" />
          )
        ) : (
          <div className="mx-auto max-w-[92rem] px-4 sm:px-6 lg:px-8">
            <ActiveScope
              merchantName={summary.displayName}
              filters={summaryResponse.appliedFilters}
              options={options}
              warnings={[
                ...summaryResponse.warnings,
                ...(optionsResponse?.warnings ?? []),
              ]}
              provenance={summaryResponse.provenance}
              updating={updating}
            />
            <p className="sr-only" role="status" aria-live="polite">
              {updating
                ? "دامنه تحلیل در حال به‌روزرسانی است."
                : "دامنه تحلیل به‌روز است."}
            </p>

            <section
              id="dashboard-panel-overview"
              role="tabpanel"
              aria-labelledby="dashboard-tab-overview"
              hidden={tab !== "overview"}
              className="space-y-8"
            >
              <DecisionBrief
                summary={summary}
                insight={primaryInsight}
                onOpenEvidence={openInsightEvidence}
              />

              <section aria-labelledby="kpi-title">
                <div className="mb-4">
                  <p className="preview-eyebrow">زمینه تصمیم</p>
                  <h2 id="kpi-title" className="mt-1 text-xl font-bold">
                    شاخص‌های پشتیبان
                  </h2>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <KpiCard metric={volume} prominent onOpen={openMetric} />
                  <KpiCard metric={successful} onOpen={openMetric} />
                  <KpiCard metric={failed} onOpen={openMetric} />
                </div>
                <details className="mt-4 border-t border-border py-4">
                  <summary className="cursor-pointer font-bold">
                    شاخص‌های تکمیلی
                  </summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <KpiCard metric={retryRecovery} onOpen={openMetric} />
                    <KpiCard metric={failedRate} onOpen={openMetric} />
                    <KpiCard metric={feeRatio} onOpen={openMetric} />
                  </div>
                </details>
              </section>

              {intelligence.trends.error ? (
                <SectionError
                  title="روندها دریافت نشدند"
                  error={intelligence.trends.error}
                  onRetry={() => void intelligence.trends.refetch()}
                />
              ) : intelligence.trends.isPending ? (
                <SectionLoading label="در حال دریافت روندها…" />
              ) : (
                <TrendChart series={trend} onOpenTrace={openTrendTrace} />
              )}

              <section aria-labelledby="primary-insight-title">
                <p className="preview-eyebrow" id="primary-insight-title">
                  بینش اولویت‌دار
                </p>
                {intelligence.insights.error ? (
                  <div className="mt-3">
                    <SectionError
                      title="بینش‌ها دریافت نشدند"
                      error={intelligence.insights.error}
                      onRetry={() => void intelligence.insights.refetch()}
                    />
                  </div>
                ) : intelligence.insights.isPending ? (
                  <SectionLoading label="در حال دریافت بینش‌ها…" />
                ) : primaryInsight ? (
                  <InsightCard
                    insight={primaryInsight}
                    isPrimary
                    onOpen={(evidence) => openMetric(evidence.metric, evidence)}
                  />
                ) : (
                  <EmptyState>
                    برای این دامنه بینش اولویت‌داری بازگردانده نشد. این نتیجه
                    ادعای پایداری نیست.
                  </EmptyState>
                )}
              </section>

              <section
                className="border-t border-border py-7"
                aria-labelledby="segments-title"
              >
                <p className="preview-eyebrow">توصیف جمعیت</p>
                <h2 id="segments-title" className="mt-2 text-xl font-bold">
                  گروه‌های توصیفی پذیرندگان
                </h2>
                <div className="mt-4">
                  {intelligence.segments.error ? (
                    <SectionError
                      title="گروه‌های توصیفی دریافت نشدند"
                      error={intelligence.segments.error}
                      onRetry={() => void intelligence.segments.refetch()}
                    />
                  ) : intelligence.segments.isPending ? (
                    <SectionLoading label="در حال دریافت گروه‌های توصیفی…" />
                  ) : (
                    <SegmentSummary segments={segments} />
                  )}
                </div>
              </section>
            </section>

            <section
              id="dashboard-panel-insights"
              role="tabpanel"
              aria-labelledby="dashboard-tab-insights"
              hidden={tab !== "insights"}
              className="py-8"
            >
              <p className="preview-eyebrow">بینش‌ها</p>
              <h1 className="mt-2 text-3xl font-black">
                بینش‌های بازگردانده‌شده API
              </h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                مشاهده، اثر کسب‌وکار و اقدام پیشنهادی هر مورد بدون بازتفسیر
                تحلیلی مرورگر نمایش داده می‌شود.
              </p>
              <div className="mt-6">
                {intelligence.insights.error ? (
                  <SectionError
                    title="بینش‌ها دریافت نشدند"
                    error={intelligence.insights.error}
                    onRetry={() => void intelligence.insights.refetch()}
                  />
                ) : intelligence.insights.isPending ? (
                  <SectionLoading label="در حال دریافت بینش‌ها…" />
                ) : insights.length > 0 ? (
                  insights.map((insight, index) => (
                    <InsightCard
                      key={insight.insightId}
                      insight={insight}
                      isPrimary={index === 0}
                      onOpen={(evidence) =>
                        openMetric(evidence.metric, evidence)
                      }
                    />
                  ))
                ) : (
                  <EmptyState>
                    برای دامنه تأییدشده بینشی بازگردانده نشد.
                  </EmptyState>
                )}
              </div>
            </section>
          </div>
        )}
      </main>

      {draft && options ? (
        <FilterDrawer
          open={drawer === "filters"}
          draft={draft}
          merchants={merchants}
          options={options}
          warnings={[
            ...(optionsResponse?.warnings ?? []),
            ...(filterError ? [filterError] : []),
          ]}
          onChange={setDraft}
          onApply={applyFilters}
          onReset={resetFilters}
          onClose={closeDrawer}
        />
      ) : null}
      <TraceabilityDrawer
        open={drawer === "trace"}
        metric={selectedMetric}
        evidence={selectedEvidence}
        onClose={closeDrawer}
      />
    </div>
  );
}
