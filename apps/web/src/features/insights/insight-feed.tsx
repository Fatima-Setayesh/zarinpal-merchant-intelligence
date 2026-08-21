import type { InsightView } from "../dashboard/dashboard-view-model";
import { InsightCard } from "./insight-card";

interface InsightFeedProps {
  insights: InsightView[];
  onOpenTraceability: (traceabilityId: string) => void;
  onAction?: (insight: InsightView) => void;
}

export function InsightFeed({
  insights,
  onOpenTraceability,
  onAction,
}: InsightFeedProps) {
  return (
    <section aria-labelledby="insight-feed-title">
      <div className="mb-5">
        <p className="eyebrow">Priority insights</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h2
            id="insight-feed-title"
            className="text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Evidence translated into next actions
          </h2>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-right">
            Every insight keeps its evidence, impact, action, and limitations in
            one decision path.
          </p>
        </div>
      </div>

      <div className="grid gap-5">
        {insights.map((insight) => (
          <InsightCard
            key={insight.id}
            insight={insight}
            onOpenTraceability={onOpenTraceability}
            {...(onAction ? { onAction } : {})}
          />
        ))}
      </div>
    </section>
  );
}
