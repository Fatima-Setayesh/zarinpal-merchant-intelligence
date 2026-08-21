import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { InsightView } from "../dashboard/dashboard-view-model";
import {
  getToneDotClass,
  getToneSurfaceClass,
} from "../dashboard/status-styles";

interface InsightCardProps {
  insight: InsightView;
  onOpenTraceability: (traceabilityId: string) => void;
  onAction?: (insight: InsightView) => void;
}

export function InsightCard({
  insight,
  onOpenTraceability,
  onAction,
}: InsightCardProps) {
  return (
    <Card className="insight-card gap-0 overflow-hidden rounded-[1.4rem] border-primary/15 bg-card shadow-[0_22px_70px_rgba(32,26,74,0.09)]">
      <div className="h-1 bg-[linear-gradient(90deg,var(--primary),color-mix(in_oklab,var(--accent)_80%,white))]" />
      <div className="p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "size-2.5 rounded-full ring-4",
                getToneDotClass(insight.priorityTone),
              )}
              aria-hidden="true"
            />
            <Badge
              variant={
                insight.priorityTone === "critical"
                  ? "critical"
                  : insight.priorityTone === "warning"
                    ? "warning"
                    : "positive"
              }
            >
              {insight.priorityLabel}
            </Badge>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            Decision insight
          </span>
        </div>

        <h3 className="mt-5 max-w-3xl text-xl leading-tight font-bold tracking-[-0.025em] sm:text-2xl">
          {insight.title}
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
          {insight.observation}
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
          <section
            className={cn(
              "rounded-2xl border p-4 sm:p-5",
              getToneSurfaceClass(insight.priorityTone),
            )}
            aria-label="Supporting evidence"
          >
            <p className="text-xs font-bold tracking-[0.14em] uppercase opacity-70">
              Evidence
            </p>
            <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
              {insight.evidence.displayValue}
            </p>
            <p className="mt-1 text-sm font-semibold">
              {insight.evidence.label}
            </p>
            <p className="mt-3 text-xs leading-5 opacity-75">
              {insight.evidence.comparison}
            </p>
            <Badge variant="outline" className="mt-4 bg-white/50">
              {insight.evidence.analysisUnit}
            </Badge>
          </section>

          <div className="grid gap-3">
            <section className="rounded-2xl border border-border bg-muted/35 p-4 sm:p-5">
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                Business impact
              </p>
              <p className="mt-2 text-sm leading-6">{insight.businessImpact}</p>
            </section>
            <section className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-4 sm:p-5">
              <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
                Recommended first action
              </p>
              <p className="mt-2 text-sm leading-6">
                {insight.recommendedAction}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="primary"
                  className="sm:min-w-48"
                  onClick={() => onAction?.(insight)}
                >
                  {insight.actionLabel}
                  <span aria-hidden="true">→</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenTraceability(insight.traceabilityId)}
                >
                  Trace calculation
                </Button>
              </div>
            </section>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-950">
          <strong>Decision note:</strong> {insight.limitations[0]}
        </div>
      </div>
    </Card>
  );
}
