import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { ChartSeries } from "../api/types";
import {
  analysisUnitLabel,
  formatDate,
  numberFormatter,
  trendLabel,
  unitLabel,
} from "../model/formatters";

const displayValue = (value: number, unit: string): string => {
  const formatted = numberFormatter.format(value);
  if (unit === "percent") return `${formatted}٪`;
  if (unit === "IRR") return `${formatted} ریال`;
  return `${formatted} ${unit === "count" ? "" : unit}`.trim();
};

export function TrendChart({
  series,
  onOpenTrace,
}: {
  series: ChartSeries | undefined;
  onOpenTrace: (series: ChartSeries) => void;
}) {
  const points = series?.points.filter(
    (point): point is typeof point & { y: number } => point.y !== null,
  );
  if (!series || !points || points.length === 0) {
    return (
      <section className="border-t border-border py-7 text-sm text-muted-foreground">
        برای دامنه تأییدشده روندی در دسترس نیست.
      </section>
    );
  }

  const values = points.map((point) => point.y);
  const observedMinimum = Math.min(...values);
  const observedMaximum = Math.max(...values);
  const domainMinimum =
    series.unit === "percent" ? 0 : Math.min(0, observedMinimum);
  const domainMaximum =
    series.unit === "percent"
      ? 100
      : Math.max(0, observedMaximum) === domainMinimum
        ? domainMinimum + 1
        : Math.max(0, observedMaximum);
  const width = 860;
  const height = 280;
  const left = 92;
  const right = 820;
  const top = 28;
  const bottom = 215;
  const coordinates = points.map((point, index) => ({
    ...point,
    cx: left + (index / Math.max(points.length - 1, 1)) * (right - left),
    cy:
      top +
      ((domainMaximum - point.y) / Math.max(domainMaximum - domainMinimum, 1)) *
        (bottom - top),
  }));
  const line = coordinates.map((point) => `${point.cx},${point.cy}`).join(" ");
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return {
      y: top + ratio * (bottom - top),
      value: domainMaximum - ratio * (domainMaximum - domainMinimum),
    };
  });
  const xStep = Math.max(1, Math.ceil(points.length / 5));
  const shownX = new Set(
    points.flatMap((_, index) =>
      index === 0 || index === points.length - 1 || index % xStep === 0
        ? [index]
        : [],
    ),
  );

  return (
    <section
      className="preview-chart border-t border-border py-7"
      aria-labelledby="trend-title"
    >
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="preview-eyebrow">روند عملکرد</p>
          <h2 id="trend-title" className="mt-2 text-xl font-bold">
            {trendLabel(series)}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            واحد: {unitLabel(series.unit)} · واحد تحلیل:{" "}
            {analysisUnitLabel(series.analysisUnit)}
          </p>
        </div>
        {series.traceability ? (
          <Button variant="quiet" onClick={() => onOpenTrace(series)}>
            ردیابی محاسبه
          </Button>
        ) : null}
      </header>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge variant="secondary">
          کمینه مشاهده‌شده: {displayValue(observedMinimum, series.unit)}
        </Badge>
        <Badge variant="secondary">
          بیشینه مشاهده‌شده: {displayValue(observedMaximum, series.unit)}
        </Badge>
      </div>

      <div className="mt-4 overflow-hidden" dir="ltr">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={`${trendLabel(series)}؛ ${points.length} نقطه؛ واحد ${unitLabel(series.unit)}`}
          className="h-auto min-h-56 w-full overflow-visible"
        >
          {yTicks.map((tick) => (
            <g key={tick.y}>
              <line
                x1={left}
                x2={right}
                y1={tick.y}
                y2={tick.y}
                stroke="var(--border)"
                strokeDasharray="4 7"
              />
              <text
                x={left - 12}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {numberFormatter.format(tick.value)}
              </text>
            </g>
          ))}
          <polyline
            points={line}
            fill="none"
            stroke="var(--brand)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="preview-chart-line"
          />
          {coordinates.map((point, index) => (
            <g key={`${String(point.x)}-${index}`} tabIndex={0}>
              <circle
                cx={point.cx}
                cy={point.cy}
                r="5"
                fill="var(--surface)"
                stroke="var(--brand)"
                strokeWidth="3"
              />
              {shownX.has(index) ? (
                <text
                  x={point.cx}
                  y="250"
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatDate(
                    String(point.x),
                    series.traceability?.dateRange.timezone,
                  ).replace(/\s+\d{4}$/u, "")}
                </text>
              ) : null}
              <title>
                {formatDate(
                  String(point.x),
                  series.traceability?.dateRange.timezone,
                )}
                : {displayValue(point.y, series.unit)}
              </title>
            </g>
          ))}
        </svg>
      </div>

      {series.limitations[0] ? (
        <p
          className="mt-3 border-r-2 border-muted-foreground/40 pr-3 text-xs leading-6 text-muted-foreground"
          dir="auto"
        >
          {series.limitations[0]}
        </p>
      ) : null}

      <details className="mt-5 rounded-xl border border-border p-4">
        <summary className="cursor-pointer text-sm font-bold">
          جدول دسترس‌پذیر داده‌ها
        </summary>
        <div className="mt-4 overflow-x-auto" tabIndex={0}>
          <table className="w-full min-w-96 text-sm">
            <caption className="sr-only">داده‌های {trendLabel(series)}</caption>
            <thead>
              <tr className="text-muted-foreground">
                <th scope="col" className="py-2 text-start">
                  تاریخ
                </th>
                <th scope="col" className="py-2 text-end">
                  مقدار ({unitLabel(series.unit)})
                </th>
                <th scope="col" className="py-2 text-end">
                  نمونه
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr
                  key={`${String(point.x)}-${index}`}
                  className="border-t border-border"
                >
                  <td className="py-2">
                    {formatDate(
                      String(point.x),
                      series.traceability?.dateRange.timezone,
                    )}
                  </td>
                  <td className="py-2 text-end">
                    {displayValue(point.y, series.unit)}
                  </td>
                  <td className="py-2 text-end">
                    {point.sampleSize === undefined
                      ? "—"
                      : numberFormatter.format(point.sampleSize)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
