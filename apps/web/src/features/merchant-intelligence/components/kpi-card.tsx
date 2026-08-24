import type { Metric } from "../api/types";
import {
  analysisUnitLabel,
  formatMetricValue,
  metricLabel,
  numberFormatter,
} from "../model/formatters";

export function KpiCard({
  metric,
  onOpen,
  prominent = false,
}: {
  metric: Metric | undefined;
  onOpen: (metric: Metric) => void;
  prominent?: boolean;
}) {
  if (!metric) {
    return (
      <div className="preview-kpi text-start" aria-label="شاخص در دسترس نیست">
        <span className="text-sm font-semibold text-muted-foreground">
          شاخص در دسترس نیست
        </span>
        <strong className="mt-4 block text-2xl">—</strong>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="preview-kpi text-start"
      data-prominent={prominent}
      data-metric={metric.metricId}
      onClick={() => onOpen(metric)}
      aria-label={`${metricLabel(metric)}؛ ${formatMetricValue(metric)}؛ مشاهده ردیابی`}
    >
      <span className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-muted-foreground">
          {metricLabel(metric)}
        </span>
        <span className="text-primary" aria-hidden="true">
          ↗
        </span>
      </span>
      <strong className="mt-4 block text-2xl font-black tracking-tight sm:text-3xl">
        <bdi>{formatMetricValue(metric)}</bdi>
      </strong>
      <span className="mt-3 block text-xs leading-6 text-muted-foreground">
        {metric.sampleSize === undefined
          ? `واحد تحلیل: ${analysisUnitLabel(metric.analysisUnit)}`
          : `${numberFormatter.format(metric.sampleSize)} ${analysisUnitLabel(metric.analysisUnit)} در نمونه`}
      </span>
      <span
        className="mt-2 block text-xs leading-6 text-muted-foreground"
        dir="auto"
      >
        {metric.definition}
      </span>
      {metric.disclosure ? (
        <span
          className="mt-3 block border-r-2 border-warning pr-3 text-xs leading-6"
          dir="auto"
        >
          {metric.disclosure.message}
        </span>
      ) : null}
    </button>
  );
}
