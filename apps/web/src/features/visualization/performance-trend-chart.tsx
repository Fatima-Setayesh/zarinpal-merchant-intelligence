import { useId } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { TrendView } from "../dashboard/dashboard-view-model";

interface PerformanceTrendChartProps {
  trend: TrendView;
  onOpenTraceability: (traceabilityId: string) => void;
}

const chartWidth = 720;
const chartHeight = 260;
const padding = { top: 32, right: 28, bottom: 52, left: 48 };

export function PerformanceTrendChart({
  trend,
  onOpenTraceability,
}: PerformanceTrendChartProps) {
  const titleId = useId();
  const descriptionId = useId();
  const values = trend.points.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const visualPadding = Math.max((maximum - minimum) * 0.3, 1);
  const visualMin = minimum - visualPadding;
  const visualMax = maximum + visualPadding;
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;

  const coordinates = trend.points.map((point, index) => {
    const x =
      padding.left + (index / Math.max(trend.points.length - 1, 1)) * plotWidth;
    const y =
      padding.top +
      ((visualMax - point.value) / Math.max(visualMax - visualMin, 1)) *
        plotHeight;

    return { point, x, y };
  });

  const polylinePoints = coordinates.map(({ x, y }) => `${x},${y}`).join(" ");

  return (
    <Card className="gap-0 overflow-hidden rounded-[1.4rem]">
      <div className="flex flex-col gap-4 border-b border-border px-5 py-5 sm:flex-row sm:items-start sm:justify-between sm:px-7">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <p className="eyebrow">Performance trend</p>
            <Badge variant="warning">Demo series</Badge>
          </div>
          <h3 id={titleId} className="mt-2 text-xl font-bold tracking-tight">
            {trend.title}
          </h3>
          <p
            id={descriptionId}
            className="mt-2 text-sm leading-6 text-muted-foreground"
          >
            {trend.takeaway}
          </p>
        </div>
        <Button
          variant="quiet"
          className="shrink-0"
          onClick={() => onOpenTraceability(trend.traceabilityId)}
        >
          View evidence
          <span aria-hidden="true">↗</span>
        </Button>
      </div>

      <div className="px-3 pt-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_4%,var(--card)),var(--card))]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="h-auto min-h-56 w-full"
            role="img"
            aria-labelledby={`${titleId} ${descriptionId}`}
          >
            <defs>
              <linearGradient
                id={`${titleId}-area`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop
                  offset="0%"
                  stopColor="var(--primary)"
                  stopOpacity="0.18"
                />
                <stop
                  offset="100%"
                  stopColor="var(--primary)"
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[0, 1, 2, 3].map((line) => {
              const y = padding.top + (line / 3) * plotHeight;
              return (
                <line
                  key={line}
                  x1={padding.left}
                  x2={chartWidth - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="4 7"
                />
              );
            })}

            <polygon
              points={`${padding.left},${chartHeight - padding.bottom} ${polylinePoints} ${chartWidth - padding.right},${chartHeight - padding.bottom}`}
              fill={`url(#${titleId}-area)`}
            />
            <polyline
              points={polylinePoints}
              fill="none"
              stroke="var(--primary)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {coordinates.map(({ point, x, y }) => {
              const isOutlier = point.emphasis === "outlier";
              const isChange = point.emphasis === "change";
              return (
                <g
                  key={point.id}
                  className="chart-point outline-none"
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${point.label}: ${point.displayValue}${point.annotation ? `. ${point.annotation}` : ""}`}
                >
                  {(isOutlier || isChange) && (
                    <circle
                      cx={x}
                      cy={y}
                      r="13"
                      fill={
                        isOutlier
                          ? "var(--critical-soft)"
                          : "var(--success-soft)"
                      }
                      stroke={isOutlier ? "var(--critical)" : "var(--success)"}
                      strokeWidth="1.5"
                      strokeDasharray={isOutlier ? "3 3" : undefined}
                    />
                  )}
                  <circle
                    cx={x}
                    cy={y}
                    r="5.5"
                    fill={
                      isOutlier
                        ? "var(--critical)"
                        : isChange
                          ? "var(--success)"
                          : "var(--card)"
                    }
                    stroke="var(--primary)"
                    strokeWidth="3"
                  />
                  <text
                    x={x}
                    y={chartHeight - 23}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {point.label}
                  </text>
                  <title>
                    {point.label}: {point.displayValue}
                    {point.annotation ? ` — ${point.annotation}` : ""}
                  </title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:px-7">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            Accessible data summary · {trend.unit}
          </p>
          <ol className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground">
            {trend.points.map((point) => (
              <li key={point.id}>
                <span className="text-muted-foreground">{point.label}</span>{" "}
                <strong className="tabular-nums">{point.displayValue}</strong>
                {point.emphasis ? (
                  <span className="ml-1 text-primary">●</span>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
        <div className="text-xs leading-5 text-muted-foreground sm:max-w-64 sm:text-right">
          {trend.limitations[0]}
        </div>
      </div>
    </Card>
  );
}
