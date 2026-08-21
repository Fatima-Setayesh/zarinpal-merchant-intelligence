import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/sheet";

import type { TraceabilityRecordView } from "../dashboard/dashboard-view-model";
import { EvidenceSummary } from "./evidence-summary";

interface TraceabilityPanelProps {
  record: TraceabilityRecordView | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TraceabilityPanel({
  record,
  open,
  onOpenChange,
}: TraceabilityPanelProps) {
  if (!record) {
    return null;
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="How was this calculated?"
      description={record.claimTitle}
    >
      <div className="space-y-7 p-5 pb-10 sm:p-7 sm:pb-12">
        <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-4">
          <div className="flex items-start gap-3">
            <span
              className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary"
              aria-hidden="true"
            >
              i
            </span>
            <div>
              <p className="text-sm font-semibold">Traceability preview</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This frontend surface displays supplied evidence. Current values
                are explicitly illustrative until the analytical contract is
                approved and connected.
              </p>
            </div>
          </div>
        </div>

        <EvidenceSummary record={record} />

        <section aria-labelledby="method-title">
          <p className="eyebrow">Method</p>
          <h3 id="method-title" className="mt-1.5 text-lg font-bold">
            {record.formulaLabel}
          </h3>
          <div className="mt-3 rounded-2xl border border-border bg-muted/45 p-4 font-mono text-[0.8rem] leading-6 text-foreground sm:p-5">
            {record.formulaExplanation}
          </div>
        </section>

        <section aria-labelledby="scope-title">
          <p className="eyebrow">Scope and filters</p>
          <h3 id="scope-title" className="mt-1.5 text-lg font-bold">
            {record.dataSubset}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {record.appliedFilters.map((filter) => (
              <Badge key={filter} variant="secondary">
                {filter}
              </Badge>
            ))}
          </div>
        </section>

        <details className="trace-disclosure" open>
          <summary>Comparison segments</summary>
          <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
            {record.comparedGroups.map((group) => (
              <li key={group} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                {group}
              </li>
            ))}
          </ul>
        </details>

        <details className="trace-disclosure">
          <summary>Missing-data handling</summary>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            {record.missingDataHandling}
          </p>
        </details>

        <section
          aria-labelledby="limitations-title"
          className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-950 sm:p-5"
        >
          <p className="text-xs font-bold tracking-[0.14em] uppercase">
            Important limitations
          </p>
          <h3 id="limitations-title" className="sr-only">
            Important limitations
          </h3>
          <ul className="mt-3 grid gap-2 text-sm leading-6">
            {record.limitations.map((limitation) => (
              <li key={limitation} className="flex gap-3">
                <span aria-hidden="true">!</span>
                {limitation}
              </li>
            ))}
          </ul>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-xs text-muted-foreground">
          <span>Provenance</span>
          <code className="rounded-md bg-muted px-2 py-1 text-foreground">
            {record.provenance}
          </code>
        </footer>
      </div>
    </Sheet>
  );
}
