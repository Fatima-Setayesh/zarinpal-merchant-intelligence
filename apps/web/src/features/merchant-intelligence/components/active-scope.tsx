import { Badge } from "@/components/ui/badge";

import type {
  DatasetProvenance,
  FilterOptions,
  FilterState,
} from "../api/types";
import { analysisUnitLabel, formatDate } from "../model/formatters";

const dimensionLabels: Record<string, string> = {
  status: "وضعیت",
  category: "دسته‌بندی",
  terminal: "پایانه",
  issuer: "صادرکننده",
  amount_min: "حداقل مبلغ",
  amount_max: "حداکثر مبلغ",
  attempt_count_min: "حداقل تلاش",
  attempt_count_max: "حداکثر تلاش",
};

const statusLabels: Record<string, string> = {
  succeeded: "موفق",
  failed: "ناموفق",
  pending: "در انتظار",
};

const displayValue = (
  key: string,
  value: string,
  options: FilterOptions,
): string => {
  if (key === "status") return statusLabels[value] ?? value;
  const source =
    key === "category"
      ? options.categories
      : key === "terminal"
        ? options.terminals
        : key === "issuer"
          ? options.issuers
          : [];
  return source.find((option) => option.value === value)?.label ?? value;
};

const scopeItems = (
  merchantName: string,
  filters: FilterState,
  options: FilterOptions,
): string[] => {
  const dateRange = filters.dateRange;
  return [
    `پذیرنده: ${merchantName}`,
    ...(dateRange
      ? [
          `بازه: ${formatDate(dateRange.from, dateRange.timezone)} تا ${formatDate(
            dateRange.to,
            dateRange.timezone,
          )}`,
        ]
      : []),
    ...(filters.analysisUnit
      ? [`واحد تحلیل: ${analysisUnitLabel(filters.analysisUnit)}`]
      : []),
    ...(filters.dimensions ?? []).map((dimension) => {
      const operation = dimension.operator === "exclude" ? "به‌جز" : "";
      const values = dimension.values
        .map((value) => displayValue(dimension.key, value, options))
        .join("، ");
      return `${dimensionLabels[dimension.key] ?? dimension.key}: ${operation} ${values}`.trim();
    }),
  ];
};

export function ActiveScope({
  merchantName,
  filters,
  options,
  warnings,
  provenance,
  updating,
}: {
  merchantName: string;
  filters: FilterState;
  options: FilterOptions;
  warnings: string[];
  provenance: DatasetProvenance;
  updating: boolean;
}) {
  const items = scopeItems(merchantName, filters, options);
  const primary = items.slice(0, 4);
  const remaining = items.slice(4);
  return (
    <section
      className="border-b border-border/70 py-4"
      aria-labelledby="active-scope-title"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id="active-scope-title" className="sr-only">
          دامنه تأییدشده تحلیل
        </h2>
        {primary.map((item) => (
          <span key={item} className="preview-chip">
            {item}
          </span>
        ))}
        {remaining.length > 0 ? (
          <details className="relative">
            <summary className="preview-chip cursor-pointer">
              {remaining.length} فیلتر دیگر
            </summary>
            <ul className="absolute top-full right-0 z-30 mt-2 min-w-72 rounded-xl border border-border bg-card p-3 text-xs leading-6 shadow-xl">
              {remaining.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </details>
        ) : null}
        {updating ? (
          <Badge variant="info" role="status" aria-live="polite">
            در حال به‌روزرسانی دامنه
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        آخرین داده:{" "}
        {formatDate(provenance.loadedAt, filters.dateRange?.timezone)} · شناسه
        دیتاست: <bdi dir="ltr">{provenance.datasetId}</bdi>
      </p>
      {warnings.length > 0 ? (
        <ul className="mt-3 space-y-1 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs leading-6">
          {warnings.map((warning) => (
            <li key={warning} dir="auto">
              {warning}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
