import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type {
  MerchantDashboardViewModel,
  MerchantMetricView,
} from "../dashboard/dashboard-view-model";
import { MetricCard } from "./metric-card";

interface MerchantOverviewProps {
  merchant: MerchantDashboardViewModel["merchant"];
  metrics: MerchantMetricView[];
  onOpenTraceability: (traceabilityId: string) => void;
}

export function MerchantOverview({
  merchant,
  metrics,
  onOpenTraceability,
}: MerchantOverviewProps) {
  return (
    <section aria-labelledby="merchant-overview-title">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Merchant overview</p>
            <Badge variant="warning">Demo / Placeholder</Badge>
          </div>
          <h2
            id="merchant-overview-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            {merchant.displayName}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {merchant.category}
          </p>
        </div>

        <Card className="gap-0 rounded-2xl border-primary/15 bg-primary/[0.035] shadow-none">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-xs sm:px-5">
            <span>
              <strong className="font-semibold text-foreground">Period:</strong>{" "}
              <span className="text-muted-foreground">
                {merchant.reportingPeriod}
              </span>
            </span>
            <span className="hidden h-4 w-px bg-border sm:block" />
            <span className="text-muted-foreground">{merchant.freshness}</span>
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {metrics.map((metric) => (
          <MetricCard
            key={metric.id}
            metric={metric}
            onOpenTraceability={onOpenTraceability}
          />
        ))}
      </div>
    </section>
  );
}
