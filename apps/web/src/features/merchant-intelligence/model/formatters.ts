import type { AnalysisUnit, ChartSeries, Metric } from "../api/types";

export const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});

const dateFormatterFor = (timezone: string) =>
  new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });

export const formatDate = (value: string, timezone = "Asia/Tehran"): string =>
  Number.isNaN(Date.parse(value))
    ? value
    : dateFormatterFor(timezone).format(new Date(value));

export const formatMetricValue = (metric: Metric | undefined): string => {
  if (metric?.value === null || metric?.value === undefined)
    return "در دسترس نیست";
  const value = numberFormatter.format(metric.value);
  if (metric.unit === "IRR") return `${value} ریال`;
  if (metric.unit === "percent") return `${value}٪`;
  return `${value} ${metric.unit === "count" ? "" : metric.unit}`.trim();
};

export const analysisUnitLabel = (
  unit: AnalysisUnit | "merchant" | string,
): string => {
  if (unit === "payment_session") return "نشست پرداخت";
  if (unit === "payment_attempt") return "تلاش پرداخت";
  if (unit === "merchant") return "پذیرنده";
  return unit;
};

export const metricLabel = (metric: Metric): string => {
  const labels: Record<string, string> = {
    "payment-session-count": "تعداد نشست‌های پرداخت",
    "successful-session-count": "نشست‌های موفق",
    "failed-session-count": "نشست‌های ناموفق",
    "successful-session-rate": "نرخ نشست موفق",
    "failed-session-rate": "نرخ نشست ناموفق",
    "retry-session-rate": "نرخ نشست‌های چندتلاشی",
    "observed-retry-recovery-rate": "بازیابی مشاهده‌شده پس از تلاش مجدد",
  };
  const localized = labels[metric.metricId];
  if (localized !== undefined) return localized;
  if (metric.metricId.startsWith("total-payment-volume-"))
    return "حجم پرداخت مشاهده‌شده";
  if (metric.metricId.includes("adjusted-fee"))
    return "نسبت نسبی کارمزد تعدیل‌شده";
  return metric.label;
};

export const trendLabel = (series: ChartSeries): string => {
  if (series.metricId === "successful-session-rate")
    return "روند روزانه نرخ نشست موفق";
  if (series.metricId === "failed-session-rate")
    return "روند روزانه نرخ نشست ناموفق";
  if (series.metricId.startsWith("total-payment-volume-")) {
    return "روند روزانه حجم پرداخت مشاهده‌شده";
  }
  return series.label;
};

export const unitLabel = (unit: string): string => {
  if (unit === "IRR") return "ریال";
  if (unit === "percent") return "درصد";
  if (unit === "count") return "تعداد";
  return unit;
};
