import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

import type { SegmentView } from "../dashboard/dashboard-view-model";

interface SegmentComparisonProps {
  segments: SegmentView[];
}

function getBadgeVariant(tone: SegmentView["badgeTone"]) {
  if (tone === "positive") return "positive" as const;
  if (tone === "warning") return "warning" as const;
  if (tone === "critical") return "critical" as const;
  return "secondary" as const;
}

export function SegmentComparison({ segments }: SegmentComparisonProps) {
  return (
    <section aria-labelledby="segment-comparison-title">
      <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Merchant segmentation</p>
          <h2
            id="segment-comparison-title"
            className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Compare context, not just outcomes
          </h2>
        </div>
        <p className="max-w-lg text-sm leading-6 text-muted-foreground sm:text-right">
          Labels, membership, and values remain analytical-layer outputs; the
          frontend only explains and compares them.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {segments.map((segment) => (
          <Card
            key={segment.id}
            className="gap-0 rounded-2xl transition-[border-color,box-shadow] duration-300 hover:border-primary/20 hover:shadow-[0_18px_44px_rgba(32,26,74,0.08)]"
          >
            <div className="flex h-full flex-col p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-bold">{segment.label}</h3>
                <Badge variant={getBadgeVariant(segment.badgeTone)}>
                  {segment.badgeLabel}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {segment.description}
              </p>
              <div className="mt-5 rounded-xl bg-muted/55 p-4">
                <p className="text-2xl font-bold tracking-tight tabular-nums">
                  {segment.displayValue}
                </p>
                <p className="mt-1 text-xs font-semibold">
                  {segment.metricLabel}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {segment.comparison}
                </p>
              </div>
              <div className="mt-4 flex-1 border-t border-border pt-4 text-xs leading-5 text-muted-foreground">
                <p>{segment.sampleLabel}</p>
                <p className="mt-2 text-amber-800">{segment.limitations[0]}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
