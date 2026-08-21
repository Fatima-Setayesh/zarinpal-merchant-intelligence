import { Badge } from "@/components/ui/badge";

import type { TraceabilityRecordView } from "../dashboard/dashboard-view-model";

interface EvidenceSummaryProps {
  record: TraceabilityRecordView;
}

export function EvidenceSummary({ record }: EvidenceSummaryProps) {
  const summaryItems = [
    { label: "Date range", value: record.dateRange },
    { label: "Sample size", value: record.sampleSize },
    { label: "Unit of analysis", value: record.analysisUnit },
    { label: "Freshness", value: record.freshness },
  ];

  return (
    <section aria-labelledby="evidence-summary-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Evidence summary</p>
          <h3
            id="evidence-summary-title"
            className="mt-1.5 text-lg font-bold tracking-tight"
          >
            {record.metricLabel}
          </h3>
        </div>
        <Badge variant="warning">{record.statusLabel}</Badge>
      </div>

      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {record.metricDefinition}
      </p>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        {summaryItems.map((item) => (
          <div key={item.label} className="bg-card p-4">
            <dt className="text-xs font-semibold text-muted-foreground">
              {item.label}
            </dt>
            <dd className="mt-1.5 text-sm leading-5 font-medium">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
