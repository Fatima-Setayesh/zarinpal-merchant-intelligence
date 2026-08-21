import { Badge } from "@/components/ui/badge";

import type { FilterDraft } from "./advanced-filters";

interface ActiveFilterSummaryProps {
  filters: FilterDraft | null;
}

export function ActiveFilterSummary({ filters }: ActiveFilterSummaryProps) {
  if (!filters) {
    return (
      <div
        className="flex flex-wrap items-center gap-2"
        aria-label="Active scope"
      >
        <span className="text-xs font-semibold text-muted-foreground">
          Active scope
        </span>
        <Badge variant="secondary">Demo merchant</Badge>
        <Badge variant="secondary">30 days</Badge>
        <Badge variant="secondary">All statuses</Badge>
      </div>
    );
  }

  const statusLabel =
    filters.paymentStatus === "all"
      ? "All statuses"
      : filters.paymentStatus === "success"
        ? "Successful"
        : "Failed";
  const attemptLabel =
    filters.attemptCount === "all"
      ? "Any attempt count"
      : filters.attemptCount === "1"
        ? "One attempt"
        : "Two or more attempts";
  const labels = [
    "Demo merchant",
    `${filters.dateFrom} → ${filters.dateTo}`,
    statusLabel,
    attemptLabel,
  ];

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      aria-label="Active scope"
    >
      <span className="text-xs font-semibold text-muted-foreground">
        Active scope
      </span>
      {labels.map((label) => (
        <Badge key={label} variant="secondary">
          {label}
        </Badge>
      ))}
    </div>
  );
}
