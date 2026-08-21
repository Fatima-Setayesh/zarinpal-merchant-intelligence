import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { MerchantMetricView } from "../dashboard/dashboard-view-model";
import { getToneDotClass } from "../dashboard/status-styles";

interface MetricCardProps {
  metric: MerchantMetricView;
  onOpenTraceability: (traceabilityId: string) => void;
}

export function MetricCard({ metric, onOpenTraceability }: MetricCardProps) {
  const tone = metric.tone ?? "neutral";

  return (
    <Card className="group gap-0 rounded-2xl bg-card/92 shadow-[0_1px_2px_rgba(15,23,42,0.03),0_12px_36px_rgba(32,26,74,0.05)] transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-[0_18px_44px_rgba(32,26,74,0.09)]">
      <div className="flex h-full flex-col px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span
              className={cn(
                "size-2.5 rounded-full ring-4",
                getToneDotClass(tone),
              )}
              aria-hidden="true"
            />
            <h3 className="text-sm font-semibold text-muted-foreground">
              {metric.label}
            </h3>
          </div>
          <Badge variant="outline" className="text-[0.65rem]">
            {metric.analysisUnit}
          </Badge>
        </div>

        <p className="mt-5 text-3xl font-bold tracking-[-0.035em] tabular-nums sm:text-[2rem]">
          {metric.displayValue}
        </p>
        {metric.changeLabel ? (
          <p className="mt-2 text-xs font-semibold text-primary">
            {metric.changeLabel}
          </p>
        ) : null}
        <p className="mt-3 flex-1 text-xs leading-5 text-muted-foreground">
          {metric.supportingText}
        </p>

        <Button
          variant="ghost"
          className="mt-4 min-h-10 justify-between px-0 text-xs text-muted-foreground hover:bg-transparent hover:text-primary"
          onClick={() => onOpenTraceability(metric.traceabilityId)}
          aria-label={`How ${metric.label} was calculated`}
        >
          How was this calculated?
          <span aria-hidden="true">↗</span>
        </Button>
      </div>
    </Card>
  );
}
