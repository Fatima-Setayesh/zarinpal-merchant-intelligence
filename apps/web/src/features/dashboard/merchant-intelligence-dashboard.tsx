import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sheet } from "@/components/ui/sheet";
import { ActiveFilterSummary } from "@/features/filters/active-filter-summary";
import {
  AdvancedFilters,
  type FilterDraft,
} from "@/features/filters/advanced-filters";
import { InsightFeed } from "@/features/insights/insight-feed";
import { MerchantOverview } from "@/features/overview/merchant-overview";
import { SegmentComparison } from "@/features/segmentation/segment-comparison";
import { TraceabilityPanel } from "@/features/traceability/traceability-panel";
import { PerformanceTrendChart } from "@/features/visualization/performance-trend-chart";

import type { MerchantDashboardViewModel } from "./dashboard-view-model";
import {
  DashboardLoadingState,
  DashboardMessageState,
} from "./dashboard-states";

interface MerchantIntelligenceDashboardProps {
  dashboard: MerchantDashboardViewModel;
  state?: "ready" | "loading" | "empty" | "error" | "unavailable";
}

export function MerchantIntelligenceDashboard({
  dashboard,
  state = "ready",
}: MerchantIntelligenceDashboardProps) {
  const [traceabilityId, setTraceabilityId] = useState<string | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterDraft | null>(
    null,
  );
  const [scopeNotice, setScopeNotice] = useState<string | null>(null);

  const activeTraceability = useMemo(
    () =>
      dashboard.traceability.find((record) => record.id === traceabilityId) ??
      null,
    [dashboard.traceability, traceabilityId],
  );

  function openTraceability(id: string) {
    setTraceabilityId(id);
  }

  function applyFilters(filters: FilterDraft) {
    setAppliedFilters(filters);
    setFilterSheetOpen(false);
    setScopeNotice(
      "Demo scope updated. No analytical query was run; production results will refresh from the approved backend contract.",
    );
  }

  function resetFilters() {
    setAppliedFilters(null);
    setScopeNotice(
      "Demo scope reset. Visible values remain presentation-only placeholders.",
    );
  }

  const decisionItems = [
    {
      index: "01",
      label: "Current status",
      value: dashboard.decisionBrief.currentStatus,
      tone: "status",
    },
    {
      index: "02",
      label: "Main problem",
      value: dashboard.decisionBrief.mainProblem,
      tone: "problem",
    },
    {
      index: "03",
      label: "Opportunity",
      value: dashboard.decisionBrief.opportunity,
      tone: "opportunity",
    },
    {
      index: "04",
      label: "Recommended first action",
      value: dashboard.decisionBrief.firstAction,
      tone: "action",
    },
  ] as const;

  if (state === "loading") {
    return (
      <div className="dashboard-canvas min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[92rem]">
          <DashboardLoadingState />
        </div>
      </div>
    );
  }

  if (state !== "ready") {
    const stateCopy = {
      empty: {
        title: "No merchant intelligence matched this scope",
        description:
          "Adjust the selected merchant, period, or filters. The frontend will not broaden the scope or invent replacement values.",
      },
      error: {
        title: "Merchant intelligence could not be loaded",
        description:
          "Your selected scope is preserved. Retry after the analytical service becomes available.",
      },
      unavailable: {
        title: "Verified analytical output is unavailable",
        description:
          "This state remains intentionally empty until approved evidence and calculations are supplied.",
      },
    }[state];

    return (
      <div className="dashboard-canvas min-h-[calc(100vh-4rem)] px-4 py-14 sm:px-6 lg:px-8">
        <DashboardMessageState
          title={stateCopy.title}
          description={stateCopy.description}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-canvas min-h-[calc(100vh-4rem)]">
      <section className="border-b border-border/80 bg-card/70">
        <div className="mx-auto w-full max-w-[92rem] px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="warning">Demo / Placeholder</Badge>
              <ActiveFilterSummary filters={appliedFilters} />
            </div>
            <div className="flex items-center gap-2">
              <p className="hidden text-xs text-muted-foreground md:block">
                Session and attempt units remain explicitly separated
              </p>
              <Button
                variant="secondary"
                className="lg:hidden"
                onClick={() => setFilterSheetOpen(true)}
              >
                <span aria-hidden="true">≡</span>
                Filters
              </Button>
            </div>
          </div>

          {scopeNotice ? (
            <div
              className="mt-4 flex items-start justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-5 text-sky-950"
              role="status"
            >
              <p>{scopeNotice}</p>
              <button
                type="button"
                className="shrink-0 rounded-md px-1 font-bold hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                onClick={() => setScopeNotice(null)}
                aria-label="Dismiss scope notice"
              >
                ×
              </button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[92rem] gap-7 px-4 py-7 sm:px-6 sm:py-9 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="hidden lg:block" aria-label="Dashboard filters">
          <Card className="sticky top-24 gap-0 rounded-2xl bg-card/90 shadow-sm backdrop-blur">
            <div className="border-b border-border px-5 py-5">
              <p className="eyebrow">Scope controls</p>
              <h2 className="mt-1.5 font-bold">Advanced filters</h2>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Controls express user intent. Analytics and filtering remain
                backend-owned.
              </p>
            </div>
            <div className="max-h-[calc(100vh-13rem)] overflow-y-auto p-5">
              <AdvancedFilters
                options={dashboard.filterOptions}
                onApply={applyFilters}
                onReset={resetFilters}
                compact
              />
            </div>
          </Card>
        </aside>

        <main className="min-w-0 space-y-12 sm:space-y-14">
          <section aria-labelledby="decision-brief-title">
            <Card className="decision-brief relative gap-0 overflow-hidden rounded-[1.65rem] border-primary/15 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_8%,var(--card)),var(--card)_48%,color-mix(in_oklab,var(--accent)_7%,var(--card)))] shadow-[0_25px_90px_rgba(40,31,94,0.12)]">
              <div
                className="absolute inset-y-0 left-0 w-1.5 bg-[linear-gradient(180deg,var(--primary),var(--accent))]"
                aria-hidden="true"
              />
              <div className="p-5 pl-7 sm:p-7 sm:pl-9 xl:p-9 xl:pl-11">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="eyebrow">Merchant decision brief</p>
                      <Badge variant="critical">
                        {dashboard.merchant.statusLabel}
                      </Badge>
                    </div>
                    <h1
                      id="decision-brief-title"
                      className="mt-3 text-3xl leading-[1.08] font-bold tracking-[-0.04em] text-balance sm:text-4xl xl:text-[2.8rem]"
                    >
                      Know what matters before opening a chart.
                    </h1>
                    <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
                      {dashboard.merchant.statusSummary}
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => openTraceability("trace-retry")}
                  >
                    Inspect priority evidence
                    <span aria-hidden="true">↗</span>
                  </Button>
                </div>

                <ol className="mt-8 grid overflow-hidden rounded-2xl border border-border/90 bg-card/75 sm:grid-cols-2 xl:grid-cols-4">
                  {decisionItems.map((item, index) => (
                    <li
                      key={item.label}
                      className="decision-step relative p-4 sm:p-5"
                      data-tone={item.tone}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-7 place-items-center rounded-full border border-current/15 bg-white/55 text-[0.65rem] font-bold">
                          {item.index}
                        </span>
                        <span className="text-xs font-bold tracking-[0.11em] uppercase">
                          {item.label}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 font-medium text-foreground">
                        {item.value}
                      </p>
                      {index < decisionItems.length - 1 ? (
                        <span
                          className="absolute top-1/2 right-0 hidden -translate-y-1/2 text-muted-foreground/45 xl:block"
                          aria-hidden="true"
                        >
                          →
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            </Card>
          </section>

          <MerchantOverview
            merchant={dashboard.merchant}
            metrics={dashboard.metrics}
            onOpenTraceability={openTraceability}
          />

          <InsightFeed
            insights={dashboard.insights}
            onOpenTraceability={openTraceability}
            onAction={(insight) =>
              setScopeNotice(
                `${insight.actionLabel} is a frontend action preview. Execution and expected impact require an approved merchant workflow and analytical output.`,
              )
            }
          />

          <section aria-labelledby="evidence-story-title">
            <div className="mb-5">
              <p className="eyebrow">Evidence story</p>
              <h2
                id="evidence-story-title"
                className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                A chart with one job: explain the decision
              </h2>
            </div>
            <PerformanceTrendChart
              trend={dashboard.trend}
              onOpenTraceability={openTraceability}
            />
          </section>

          <SegmentComparison segments={dashboard.segments} />

          <section
            className="rounded-2xl border border-border bg-card/80 p-5 sm:p-7"
            aria-labelledby="fee-disclosure-title"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="eyebrow">Correctness guardrail</p>
                <h2
                  id="fee-disclosure-title"
                  className="mt-2 text-lg font-bold"
                >
                  Adjusted fee is not Zarinpal’s real fee
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The field is confidentially transformed. This frontend will
                  only present teammate-approved relative comparisons and will
                  never make absolute real-pricing claims.
                </p>
              </div>
              <Badge variant="info">Disclosure preserved</Badge>
            </div>
          </section>
        </main>
      </div>

      <Sheet
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        title="Advanced filters"
        description="Select the analytical scope. Production values will come from the approved backend contract."
        className="max-w-lg"
      >
        <div className="p-5 pb-10 sm:p-7">
          <AdvancedFilters
            options={dashboard.filterOptions}
            onApply={applyFilters}
            onReset={resetFilters}
          />
        </div>
      </Sheet>

      <TraceabilityPanel
        record={activeTraceability}
        open={Boolean(activeTraceability)}
        onOpenChange={(open) => {
          if (!open) setTraceabilityId(null);
        }}
      />
    </div>
  );
}
