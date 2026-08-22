import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactNode,
} from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import {
  type ChartSeries,
  type Evidence,
  type FilterOptions,
  type FilterState,
  type Insight,
  type MerchantListItem,
  type Metric,
  useMerchantIntelligence,
  useMerchantBootstrap,
} from "./api";
import { fa } from "./copy";

type Drawer = "filters" | "trace" | null;
type ThemeChoice = "light" | "dark";
type DashboardTab = "overview" | "insights";

interface FilterDraft {
  merchantId: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  attempts: string;
  issuer: string;
  terminal: string;
}

const numberFormatter = new Intl.NumberFormat("fa-IR", {
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
  year: "numeric",
  month: "long",
  day: "numeric",
});

const formatDate = (value: string): string =>
  Number.isNaN(Date.parse(value)) ? value : dateFormatter.format(new Date(value));

const formatMetricValue = (metric: Metric | undefined): string => {
  if (metric?.value === null || metric?.value === undefined) return "—";
  const value = numberFormatter.format(metric.value);
  if (metric.unit === "IRR") return `${value} ریال`;
  if (metric.unit === "percent") return `${value}٪`;
  return value;
};

const metricFaLabel = (metric: Metric): string => {
  if (metric.metricId === "payment-session-count") return "تعداد نشست‌های پرداخت";
  if (metric.metricId === "successful-session-count") return fa.successfulSessions;
  if (metric.metricId === "failed-session-count") return fa.failedSessions;
  if (metric.metricId === "successful-session-rate") return "نرخ نشست موفق";
  if (metric.metricId === "failed-session-rate") return fa.failedSessionRate;
  if (metric.metricId === "retry-session-rate") return "نرخ نشست‌های چندتلاشی";
  if (metric.metricId === "observed-retry-recovery-rate") return fa.retryRecovery;
  if (metric.metricId.startsWith("total-payment-volume-")) return fa.paymentVolume;
  if (metric.metricId.includes("adjusted-fee")) return fa.relativeAdjustedFee;
  if (metric.metricId.includes("amount")) return "مبلغ نشست‌های واجد شرایط";
  return metric.label;
};

const metricFaDefinition = (metric: Metric): string => {
  if (metric.metricId === "failed-session-rate") {
    return "سهم نشست‌هایی که بدون نتیجه موفق پایان یافته‌اند از همه نشست‌های پرداخت در دامنه انتخاب‌شده.";
  }
  if (metric.metricId === "observed-retry-recovery-rate") {
    return "سهم نشست‌های چندتلاشی با شروع ناموفق که در تلاش بعدی نتیجه موفق ثبت کرده‌اند.";
  }
  if (metric.metricId.startsWith("total-payment-volume-")) {
    return "جمع مبلغ درخواستی هر نشست، فقط یک‌بار و مستقل از تعداد تلاش‌ها؛ این مقدار حجم تسویه‌شده نیست.";
  }
  if (metric.metricId.includes("adjusted-fee")) return fa.adjustedFeeWarning;
  if (metric.metricId.includes("successful-session")) {
    return "نشست‌های پرداختی که دست‌کم یک تلاش موفق ثبت کرده‌اند.";
  }
  if (metric.metricId.includes("failed-session")) {
    return "نشست‌های پرداختی که نتیجه موفق ثبت نکرده‌اند؛ نشست‌های NoAttempt نیز در این واحد حفظ می‌شوند.";
  }
  return metric.definition;
};

interface LocalizedInsight {
  title: string;
  observation: string;
  impact: string;
  action: string;
}

const localizeInsight = (insight: Insight): LocalizedInsight => {
  const primary = insight.evidence[0]?.metric;
  const amount = insight.evidence.find((item) => item.metric.unit === "IRR")?.metric;
  if (insight.insightId.endsWith("failed-sessions")) {
    return {
      title: "نرخ نشست‌های ناموفق نیازمند بررسی عملیاتی است",
      observation: primary
        ? `${formatMetricValue(primary)} از نشست‌های این دامنه بدون نتیجه موفق پایان یافته‌اند؛ مخرج محاسبه ${numberFormatter.format(primary.sampleSize ?? 0)} نشست است.`
        : "نشست‌های ناموفق در دامنه انتخاب‌شده مشاهده شده‌اند.",
      impact: amount
        ? `${formatMetricValue(amount)} حجم درخواستی با این نشست‌ها مرتبط است؛ این مقدار زیان قطعی یا درآمد قابل‌بازیابی اثبات‌شده نیست.`
        : "این الگو یک صف بررسی عملیاتی را مشخص می‌کند و به‌تنهایی نشان‌دهنده زیان قطعی نیست.",
      action:
        "دلایل خطا را بر اساس زمان، پایانه و صادرکننده گروه‌بندی کنید و پیش از تغییر جریان پرداخت، الگوی پرتکرار را اعتبارسنجی کنید.",
    };
  }
  if (insight.insightId.endsWith("retry-recovery")) {
    return {
      title: "نشست‌هایی با تلاش اول ناموفق، فرصت بازیابی قابل‌اندازه‌گیری نشان می‌دهند",
      observation: primary
        ? `در ${numberFormatter.format(primary.sampleSize ?? 0)} نشست واجد شرایط، نرخ بازیابی مشاهده‌شده ${formatMetricValue(primary)} بوده است.`
        : "بخشی از نشست‌های چندتلاشی پس از شروع ناموفق به نتیجه موفق رسیده‌اند.",
      impact: amount
        ? `${formatMetricValue(amount)} حجم درخواستی با بازیابی مشاهده‌شده مرتبط است؛ داده رابطه را نشان می‌دهد، نه اثر علّی تلاش مجدد را.`
        : "بازیابی مشاهده‌شده ارزش بررسی مسیر تلاش مجدد را دارد، اما اثر علّی را اثبات نمی‌کند.",
      action:
        "مسیر تلاش مجدد را حفظ کنید و بازیابی را به تفکیک دلیل خطا، پایانه، صادرکننده و شماره تلاش پایش کنید.",
    };
  }
  if (insight.insightId.includes("relative-adjusted-fee")) {
    return {
      title: "شاخص نسبی کارمزد تعدیل‌شده با گروه همتا تفاوت دارد",
      observation: primary
        ? `نسبت مشاهده‌شده ${formatMetricValue(primary)} است و فقط برای مقایسه نسبی با پذیرندگان هم‌دسته استفاده می‌شود.`
        : fa.adjustedFeeWarning,
      impact: fa.adjustedFeeWarning,
      action:
        "پوشش adjusted_fee را بررسی کنید و نسبت نسبی را پیش از هر تصمیم عملیاتی به تفکیک زمان، پایانه و بازه مبلغ مقایسه کنید.",
    };
  }
  return {
    title: "یک الگوی قابل بررسی در دامنه انتخاب‌شده مشاهده شد",
    observation: primary
      ? `${metricFaLabel(primary)} برابر ${formatMetricValue(primary)} است.`
      : "جزئیات این الگو در شواهد محاسباتی ثبت شده است.",
    impact: "این نتیجه توصیفی است و برای تصمیم‌گیری نیاز به بررسی شواهد و محدودیت‌های همراه دارد.",
    action: "شواهد، پوشش داده و زیرگروه‌های مرتبط را پیش از اقدام بررسی کنید.",
  };
};

const trendFaLabel = (series: ChartSeries): string => {
  if (series.metricId === "successful-session-rate") return "روند روزانه نرخ نشست موفق";
  if (series.metricId === "failed-session-rate") return "روند روزانه نرخ نشست ناموفق";
  if (series.metricId.startsWith("total-payment-volume-")) return "روند روزانه حجم پرداخت";
  return series.label;
};

const segmentFaLabel = (segmentId: string, fallback: string): string => {
  const labels: Record<string, string> = {
    "frequency-above-success-above": "فراوانی و موفقیت در سطح میانه یا بالاتر",
    "frequency-above-success-below": "فراوانی بالا و موفقیت پایین‌تر از میانه",
    "frequency-below-success-above": "فراوانی پایین و موفقیت در سطح میانه یا بالاتر",
    "frequency-below-success-below": "فراوانی و موفقیت پایین‌تر از میانه",
  };
  return labels[segmentId] ?? fallback;
};

const metricById = (
  metrics: readonly Metric[],
  matcher: string | RegExp,
): Metric | undefined =>
  metrics.find((metric) =>
    typeof matcher === "string"
      ? metric.metricId === matcher
      : matcher.test(metric.metricId),
  );

const toInputDate = (value: string): string => value.slice(0, 10);

const toFilterState = (draft: FilterDraft): FilterState => {
  const dimensions: NonNullable<FilterState["dimensions"]> = [];
  if (draft.category !== "all") {
    dimensions.push({ key: "category", operator: "include", values: [draft.category] });
  }
  if (draft.status !== "all") {
    dimensions.push({ key: "status", operator: "include", values: [draft.status] });
  }
  if (draft.attempts !== "all") {
    dimensions.push({
      key: "attempt_count_min",
      operator: "include",
      values: [draft.attempts],
    });
    dimensions.push({
      key: "attempt_count_max",
      operator: "include",
      values: [draft.attempts],
    });
  }
  if (draft.issuer !== "all") {
    dimensions.push({ key: "issuer", operator: "include", values: [draft.issuer] });
  }
  if (draft.terminal !== "all") {
    dimensions.push({ key: "terminal", operator: "include", values: [draft.terminal] });
  }
  return {
    merchantIds: [draft.merchantId],
    analysisUnit: "payment_session",
    dateRange: {
      from: `${draft.dateFrom}T00:00:00.000Z`,
      to: `${draft.dateTo}T23:59:59.999Z`,
      timezone: "Asia/Tehran",
    },
    ...(dimensions.length === 0 ? {} : { dimensions }),
  };
};

function Icon({ name, className }: { name: "filter" | "sun" | "moon" | "close" | "trace" | "check" | "trend"; className?: string }) {
  const paths = {
    filter: <path d="M4 5h16M7 12h10M10 19h4" />,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" /></>,
    moon: <path d="M20.3 15.4A8.5 8.5 0 0 1 8.6 3.7 8.5 8.5 0 1 0 20.3 15.4Z" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    trace: <><path d="M5 19V9M12 19V5M19 19v-7" /><path d="m4 7 7-4 8 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    trend: <path d="m4 17 5-5 4 3 7-8M15 7h5v5" />,
  } as const;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      {paths[name]}
    </svg>
  );
}

function DashboardDrawer({
  open,
  side,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  side: "right" | "left";
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-side={side}
      className="preview-drawer"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="flex h-full min-h-0 flex-col bg-card text-card-foreground">
        <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-6">
          <div>
            <h2 id={titleId} className="text-xl font-bold">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p> : null}
          </div>
          <button type="button" className="preview-icon-button" onClick={onClose} aria-label={fa.close}>
            <Icon name="close" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? <footer className="border-t border-border bg-card p-4 sm:p-5">{footer}</footer> : null}
      </div>
    </dialog>
  );
}

function FilterForm({
  draft,
  merchants,
  options,
  onChange,
}: {
  draft: FilterDraft;
  merchants: MerchantListItem[];
  options: FilterOptions;
  onChange: (next: FilterDraft) => void;
}) {
  const update = <Key extends keyof FilterDraft>(key: Key, value: FilterDraft[Key]) =>
    onChange({ ...draft, [key]: value });
  const attempts = Array.from(
    { length: Math.max(0, (options.attemptCountRange.maximum ?? 1) - 1) + 1 },
    (_, index) => String(index + 1),
  ).slice(0, 8);
  return (
    <div className="grid gap-5 p-5 sm:p-6">
      <DashboardField label={fa.merchant}>
        <Select value={draft.merchantId} onChange={(event) => update("merchantId", event.target.value)}>
          {merchants.map((merchant) => <option key={merchant.merchantId} value={merchant.merchantId}>{merchant.displayName}</option>)}
        </Select>
      </DashboardField>
      <DashboardField label={fa.category}>
        <Select value={draft.category} onChange={(event) => update("category", event.target.value)}>
          <option value="all">{fa.all}</option>
          {options.categories.map((option) => <option key={option.id} value={option.value}>{option.label}</option>)}
        </Select>
      </DashboardField>
      <fieldset>
        <legend className="preview-field-label">{fa.dateRange}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="grid gap-1.5 text-xs text-muted-foreground">{fa.from}<Input type="date" value={draft.dateFrom} onChange={(event) => update("dateFrom", event.target.value)} /></label>
          <label className="grid gap-1.5 text-xs text-muted-foreground">{fa.to}<Input type="date" value={draft.dateTo} onChange={(event) => update("dateTo", event.target.value)} /></label>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{formatDate(draft.dateFrom)} تا {formatDate(draft.dateTo)}</p>
      </fieldset>
      <DashboardField label={fa.paymentStatus}>
        <Select value={draft.status} onChange={(event) => update("status", event.target.value)}>
          <option value="all">{fa.all}</option>
          <option value="succeeded">موفق</option>
          <option value="failed">ناموفق</option>
          <option value="pending">در انتظار</option>
        </Select>
      </DashboardField>
      <DashboardField label={fa.attemptCount}>
        <Select value={draft.attempts} onChange={(event) => update("attempts", event.target.value)}>
          <option value="all">{fa.all}</option>
          {attempts.map((value) => <option key={value} value={value}>{numberFormatter.format(Number(value))} تلاش</option>)}
        </Select>
      </DashboardField>
      <DashboardField label={fa.issuer}>
        <Select value={draft.issuer} onChange={(event) => update("issuer", event.target.value)}>
          <option value="all">{fa.all}</option>
          {options.issuers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </DashboardField>
      <DashboardField label={fa.terminal}>
        <Select value={draft.terminal} onChange={(event) => update("terminal", event.target.value)}>
          <option value="all">{fa.all}</option>
          {options.terminals.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
      </DashboardField>
    </div>
  );
}

function DashboardField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="grid gap-2"><span className="preview-field-label">{label}</span>{children}</label>;
}

function TracePanel({ metric, evidence }: { metric: Metric | null; evidence: Evidence | null }) {
  if (!metric) return <p className="p-6 text-sm text-muted-foreground">شاخصی انتخاب نشده است.</p>;
  const trace = metric.traceability;
  const filters = trace?.filters.dimensions ?? [];
  const denominator = trace?.sample.denominator;
  return (
    <div className="space-y-7 p-5 pb-10 sm:p-6">
      <section>
        <p className="preview-eyebrow">{fa.metricDefinition}</p>
        <h3 className="mt-2 text-lg font-bold">{metricFaLabel(metric)}</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">{metricFaDefinition(metric)}</p>
      </section>
      {metric.metricId.includes("adjusted-fee") ? (
        <section className="rounded-2xl border border-warning/30 bg-warning/10 p-4">
          <h3 className="font-bold">{fa.relativeAdjustedFee}</h3>
          <p className="mt-2 text-sm leading-7">{fa.adjustedFeeWarning}</p>
        </section>
      ) : null}
      <TraceBlock title={fa.formula} ltr>
        {trace?.formula.explanation ?? evidence?.formula.explanation ?? metric.definition}
      </TraceBlock>
      <div className="grid gap-3 sm:grid-cols-2">
        <TraceStat label={fa.analysisUnit} value={trace?.analysisUnit ?? metric.analysisUnit} ltr />
        <TraceStat label={fa.usedRows} value={numberFormatter.format(trace?.sample.size ?? evidence?.sample.size ?? metric.sampleSize ?? 0)} />
        <TraceStat label={fa.inputRows} value={denominator?.value === undefined ? "در API تفکیک نشده" : numberFormatter.format(denominator.value)} />
        <TraceStat label={fa.datasetVersion} value={trace?.provenance.datasetId ?? evidence?.sourceReference ?? "—"} ltr />
      </div>
      <TraceBlock title={fa.numeratorDenominator} ltr>{denominator?.description ?? "این شاخص مخرج مستقل ندارد؛ مقدار از شمارش یا مجموع رکوردهای واجد شرایط به‌دست آمده است."}</TraceBlock>
      <TraceBlock title={fa.sourceMetrics} ltr>{(trace?.sourceMetricIds ?? [metric.metricId]).join(" + ")}</TraceBlock>
      <section>
        <p className="preview-eyebrow">{fa.activeFilters}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="secondary">merchant: {trace?.filters.merchantIds?.join(", ") ?? "all"}</Badge>
          {filters.map((filter) => <Badge key={`${filter.key}-${filter.values.join()}`} variant="outline"><span dir="ltr">{filter.key}: {filter.values.join(", ")}</span></Badge>)}
        </div>
      </section>
      <TraceBlock title={fa.dateRange}>{formatDate(trace?.dateRange.from ?? metric.period.from)} تا {formatDate(trace?.dateRange.to ?? metric.period.to)}</TraceBlock>
      <TraceBlock title={fa.missingRows}>{trace?.missingDataHandling ?? evidence?.missingDataHandling ?? "مقادیر الزامی اعتبارسنجی شده‌اند و مقدار خالی جای‌گذاری نشده است."}</TraceBlock>
      <section className="rounded-2xl border border-border bg-muted/45 p-4">
        <p className="preview-eyebrow">{fa.confidence}</p>
        <p className="mt-2 text-sm leading-7">{fa.confidenceText}</p>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">{(trace?.limitations ?? metric.limitations)[0]}</p>
      </section>
      <Button type="button" variant="secondary" className="w-full" disabled title={fa.aggregateOnly}>{fa.inspectRows}</Button>
      <p className="text-xs leading-6 text-muted-foreground">{fa.aggregateOnly}</p>
    </div>
  );
}

function TraceBlock({ title, children, ltr = false }: { title: string; children: ReactNode; ltr?: boolean }) {
  return <section><p className="preview-eyebrow">{title}</p><div dir={ltr ? "ltr" : undefined} className={cn("mt-3 rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-7", ltr && "text-left font-mono text-xs")}>{children}</div></section>;
}

function TraceStat({ label, value, ltr = false }: { label: string; value: string; ltr?: boolean }) {
  return <div className="min-w-0 rounded-2xl border border-border p-4"><p className="text-xs text-muted-foreground">{label}</p><p dir={ltr ? "ltr" : undefined} className={cn("mt-1.5 break-all text-sm font-bold", ltr && "text-left font-mono text-xs")}>{value}</p></div>;
}

function KpiCard({ metric, title, onOpen }: { metric: Metric | undefined; title: string; onOpen: (metric: Metric) => void }) {
  return (
    <button type="button" disabled={!metric} className="preview-kpi text-start" data-metric={metric?.metricId} onClick={() => metric && onOpen(metric)}>
      <span className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-muted-foreground">{title}</span><Icon name="trace" className="size-4 text-primary" /></span>
      <strong className="mt-5 block text-2xl font-black tracking-tight sm:text-3xl" title={metric?.value === null ? undefined : String(metric?.value)}>{formatMetricValue(metric)}</strong>
      <span className="mt-3 block text-xs leading-6 text-muted-foreground">{metric?.sampleSize === undefined ? "—" : `${numberFormatter.format(metric.sampleSize)} نشست در محاسبه`}</span>
    </button>
  );
}

function TrendChart({ series, onOpen }: { series: ChartSeries | undefined; onOpen: () => void }) {
  if (!series || series.points.length === 0) return <Card className="p-6 text-sm text-muted-foreground">{fa.noTrend}</Card>;
  const points = series.points.filter((point): point is typeof point & { y: number } => point.y !== null);
  if (points.length === 0) return <Card className="p-6 text-sm text-muted-foreground">{fa.noTrend}</Card>;
  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 840;
  const height = 260;
  const coordinates = points.map((point, index) => ({
    ...point,
    cx: 42 + (index / Math.max(points.length - 1, 1)) * 756,
    cy: 28 + ((max - point.y) / Math.max(max - min, 1)) * 168,
  }));
  const line = coordinates.map((point) => `${point.cx},${point.cy}`).join(" ");
  const anomaly = coordinates.reduce((current, point) => point.y < current.y ? point : current, coordinates[0] ?? { y: 0, cx: 0, cy: 0, x: "" });
  return (
    <Card className="preview-chart overflow-hidden rounded-[1.6rem]">
      <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-5 sm:px-7">
        <div><p className="preview-eyebrow">{fa.trend}</p><h2 className="mt-2 text-xl font-bold">{trendFaLabel(series)}</h2><p className="mt-2 text-sm text-muted-foreground">ترتیب زمانی از قدیمی به جدید حفظ شده است.</p></div>
        <Button variant="quiet" onClick={onOpen}><Icon name="trace" />{fa.calculationTrace}</Button>
      </header>
      <div className="px-3 py-5 sm:px-6" dir="ltr">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${trendFaLabel(series)}؛ ${points.length} نقطه زمانی`} className="h-auto min-h-56 w-full overflow-visible">
          {[0, 1, 2, 3].map((index) => <line key={index} x1="42" x2="798" y1={28 + index * 56} y2={28 + index * 56} stroke="var(--border)" strokeDasharray="4 7" />)}
          <polyline points={line} fill="none" stroke="var(--brand)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="preview-chart-line" />
          {coordinates.map((point) => <g key={String(point.x)}><circle cx={point.cx} cy={point.cy} r={point === anomaly ? 9 : 5} fill={point === anomaly ? "var(--warning)" : "var(--surface)"} stroke="var(--brand)" strokeWidth="3" className={point === anomaly ? "preview-anomaly" : undefined} /><text x={point.cx} y="232" textAnchor="middle" className="fill-muted-foreground text-[10px]">{formatDate(String(point.x)).replace(/\s+\d{4}$/u, "")}</text><title>{formatDate(String(point.x))}: {numberFormatter.format(point.y)}</title></g>)}
        </svg>
      </div>
      <details className="mx-5 mb-5 rounded-xl border border-border p-4 sm:mx-7">
        <summary className="cursor-pointer text-sm font-bold">خلاصه متنی و جدول داده</summary>
        <div className="mt-4 overflow-x-auto"><table className="w-full min-w-96 text-sm"><thead><tr className="text-muted-foreground"><th className="py-2 text-start">تاریخ</th><th className="py-2 text-end">مقدار</th><th className="py-2 text-end">نمونه</th></tr></thead><tbody>{points.map((point) => <tr key={String(point.x)} className="border-t border-border"><td className="py-2">{formatDate(String(point.x))}</td><td className="py-2 text-end">{numberFormatter.format(point.y)}</td><td className="py-2 text-end">{numberFormatter.format(point.sampleSize ?? 0)}</td></tr>)}</tbody></table></div>
      </details>
    </Card>
  );
}

function InsightCard({ insight, onOpen }: { insight: Insight; onOpen: (evidence: Evidence) => void }) {
  const evidence = insight.evidence[0];
  const localized = localizeInsight(insight);
  return (
    <Card className="preview-insight overflow-hidden rounded-[1.6rem] border-primary/20">
      <div className="h-1 bg-[linear-gradient(90deg,var(--brand),var(--warning))]" />
      <div className="p-5 sm:p-7">
        <Badge variant="warning">{fa.highestOpportunity}</Badge>
        <h2 className="mt-4 max-w-4xl text-xl leading-9 font-black sm:text-2xl">{localized.title}</h2>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{localized.observation}</p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <section><p className="preview-eyebrow">{fa.evidence}</p><p className="mt-2 text-sm leading-7 font-semibold">{evidence ? `${metricFaLabel(evidence.metric)}: ${formatMetricValue(evidence.metric)}` : "—"}</p></section>
          <section><p className="preview-eyebrow">{fa.whyItMatters}</p><p className="mt-2 text-sm leading-7">{localized.impact}</p></section>
          <section><p className="preview-eyebrow">{fa.recommendedAction}</p><p className="mt-2 text-sm leading-7">{localized.action}</p></section>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-5">
          <Badge variant="outline">{fa.confidence}: توصیفی</Badge>
          <Badge variant="outline">{fa.coverage}: {numberFormatter.format(evidence?.sample.size ?? 0)} نشست</Badge>
          {evidence ? <Button variant="secondary" className="me-auto" onClick={() => onOpen(evidence)}>{fa.inspectEvidence}<Icon name="trace" /></Button> : null}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">{fa.confidenceText}</p>
      </div>
    </Card>
  );
}

function LoadingView() {
  return <div className="mx-auto grid min-h-[70dvh] max-w-7xl place-items-center px-5"><div className="text-center"><span className="preview-loader mx-auto block" /><p className="mt-5 text-sm text-muted-foreground">در حال دریافت تحلیل معتبر از API…</p></div></div>;
}

export function MerchantIntelligenceDashboard() {
  const bootstrap = useMerchantBootstrap();
  const [tab, setTab] = useState<DashboardTab>("overview");
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [theme, setTheme] = useState<ThemeChoice>(() => {
    const requested = new URLSearchParams(window.location.search).get("theme");
    if (requested === "light" || requested === "dark") {
      return requested;
    }
    const saved = localStorage.getItem("merchant-intelligence-theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const [draft, setDraft] = useState<FilterDraft | null>(null);
  const [applied, setApplied] = useState<FilterState | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reviewStateApplied = useRef(false);
  const merchants = useMemo(
    () => bootstrap.merchants.data?.page.items ?? [],
    [bootstrap.merchants.data?.page.items],
  );
  const options = bootstrap.filterOptions.data?.data;

  useEffect(() => {
    const previous = {
      lang: document.documentElement.lang,
      dir: document.documentElement.dir,
      theme: document.documentElement.dataset.previewTheme,
      dark: document.documentElement.classList.contains("dark"),
    };
    document.documentElement.lang = "fa";
    document.documentElement.dir = "rtl";
    return () => {
      document.documentElement.lang = previous.lang;
      document.documentElement.dir = previous.dir;
      if (previous.theme === undefined) {
        delete document.documentElement.dataset.previewTheme;
      } else {
        document.documentElement.dataset.previewTheme = previous.theme;
      }
      document.documentElement.classList.toggle("dark", previous.dark);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("merchant-intelligence-theme", theme);
    document.documentElement.dataset.previewTheme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0d0f14" : "#f4f5f7");
  }, [theme]);

  useEffect(() => {
    const firstMerchant = merchants[0];
    if (!draft && firstMerchant && options) {
      const initial: FilterDraft = {
        merchantId: firstMerchant.merchantId,
        category: "all",
        dateFrom: toInputDate(options.dateRange.from),
        dateTo: toInputDate(options.dateRange.to),
        status: "all",
        attempts: "all",
        issuer: "all",
        terminal: "all",
      };
      setDraft(initial);
      setApplied(toFilterState(initial));
    }
  }, [draft, merchants, options]);

  const intelligence = useMerchantIntelligence(
    applied?.merchantIds?.[0] ?? null,
    applied,
  );
  const summary = intelligence.summary.data?.data;
  const insights = intelligence.insights.data?.page.items ?? [];
  const trends = intelligence.trends.data?.page.items ?? [];
  const segments = intelligence.segments.data?.page.items ?? [];
  const metrics = summary?.headlineMetrics ?? [];
  const primaryInsight = insights[0];
  const localizedPrimaryInsight = primaryInsight
    ? localizeInsight(primaryInsight)
    : null;
  const volume = metricById(metrics, /^total-payment-volume-IRR$/u);
  const successful = metricById(metrics, "successful-session-count");
  const failed = metricById(metrics, "failed-session-count");
  const retryRecovery = metricById(metrics, "observed-retry-recovery-rate");
  const failedRate = metricById(metrics, "failed-session-rate");
  const feeRatio = metricById(metrics, /^relative-adjusted-fee-to-amount-ratio-IRR$/u);
  const trend = trends.find((series) => series.metricId === "successful-session-rate") ?? trends.find((series) => series.metricId === "total-payment-volume-IRR");
  const isLoading = bootstrap.merchants.isLoading || bootstrap.filterOptions.isLoading || intelligence.summary.isLoading;
  const hasError = bootstrap.merchants.isError || bootstrap.filterOptions.isError || intelligence.summary.isError || intelligence.insights.isError || intelligence.trends.isError;

  const chips = useMemo(() => {
    if (!draft || !summary) return [];
    return [
      summary.displayName,
      `${formatDate(draft.dateFrom)} تا ${formatDate(draft.dateTo)}`,
      ...(draft.status === "all" ? [] : [draft.status === "succeeded" ? "پرداخت موفق" : draft.status === "failed" ? "پرداخت ناموفق" : "در انتظار"]),
      ...(draft.attempts === "all" ? [] : [`${numberFormatter.format(Number(draft.attempts))} تلاش`]),
    ];
  }, [draft, summary]);

  useEffect(() => {
    if (reviewStateApplied.current || !draft || !summary) return;
    const requestedPanel = new URLSearchParams(window.location.search).get("panel");
    if (requestedPanel === "filters") {
      setDrawer("filters");
    } else if (requestedPanel === "trace" && volume) {
      setSelectedMetric(volume);
      setDrawer("trace");
    }
    reviewStateApplied.current = true;
  }, [draft, summary, volume]);

  function openMetric(metric: Metric, evidence: Evidence | null = null) {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setSelectedMetric(metric);
    setSelectedEvidence(evidence);
    setDrawer("trace");
  }

  function closeDrawer() {
    const restore = triggerRef.current;
    setDrawer(null);
    window.setTimeout(() => restore?.focus(), 0);
  }

  function openFilters() {
    triggerRef.current = document.activeElement as HTMLElement | null;
    setDrawer("filters");
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setApplied(toFilterState(draft));
    closeDrawer();
  }

  function resetFilters() {
    const firstMerchant = merchants[0];
    if (!firstMerchant || !options) return;
    const reset: FilterDraft = {
      merchantId: firstMerchant.merchantId,
      category: "all",
      dateFrom: toInputDate(options.dateRange.from),
      dateTo: toInputDate(options.dateRange.to),
      status: "all",
      attempts: "all",
      issuer: "all",
      terminal: "all",
    };
    setDraft(reset);
    setApplied(toFilterState(reset));
    closeDrawer();
  }

  return (
    <div className="preview-root min-h-dvh bg-background text-foreground">
      <a href="#preview-main" className="sr-only focus:fixed focus:inset-inline-start-4 focus:top-4 focus:z-50 focus:not-sr-only focus:rounded-xl focus:bg-primary focus:px-4 focus:py-3 focus:text-primary-foreground">رفتن به محتوای اصلی</a>
      <header className="preview-header sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[92rem] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <a href="/" className="flex min-w-0 items-center gap-3 rounded-xl focus-visible:ring-2 focus-visible:ring-ring" aria-label={fa.productName}>
            <span className="preview-logo" aria-hidden="true">زر</span>
            <span className="hidden min-w-0 sm:block"><strong className="block truncate text-sm">{fa.productName}</strong><span className="block text-[11px] text-muted-foreground">{fa.productTagline}</span></span>
          </a>
          <nav className="mx-auto" aria-label="ناوبری اصلی"><div className="preview-tabs" role="tablist"><button role="tab" aria-selected={tab === "overview"} data-active={tab === "overview"} onClick={() => setTab("overview")}>{fa.overview}</button><button role="tab" aria-selected={tab === "insights"} data-active={tab === "insights"} onClick={() => setTab("insights")}>{fa.insights}</button></div></nav>
          <div className="flex items-center gap-2">
            <span className={cn("hidden items-center gap-2 text-xs lg:flex", hasError ? "text-critical" : "text-success")}><span className="size-2 rounded-full bg-current" />{hasError ? fa.datasetDisconnected : isLoading ? fa.datasetLoading : fa.datasetConnected}</span>
            <div className="preview-theme-toggle" role="group" aria-label={fa.theme}>
              <button type="button" aria-label="تم روشن" aria-pressed={theme === "light"} data-active={theme === "light"} onClick={() => setTheme("light")}><Icon name="sun" /><span>{fa.light}</span></button>
              <button type="button" aria-label="تم تاریک" aria-pressed={theme === "dark"} data-active={theme === "dark"} onClick={() => setTheme("dark")}><Icon name="moon" /><span>{fa.dark}</span></button>
            </div>
            <Button variant="secondary" className="px-3 sm:px-4" onClick={openFilters}><Icon name="filter" /><span className="hidden sm:inline">{fa.filters}</span></Button>
          </div>
        </div>
      </header>

      {isLoading ? <LoadingView /> : hasError ? (
        <main id="preview-main" className="mx-auto grid min-h-[70dvh] max-w-3xl place-items-center px-5"><Card className="p-8 text-center"><h1 className="text-xl font-bold">{fa.datasetDisconnected}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">API را روی نشانی تنظیم‌شده اجرا کنید؛ هیچ داده جایگزین یا ساختگی نمایش داده نمی‌شود.</p><Button className="mx-auto mt-6" onClick={() => window.location.reload()}>{fa.retry}</Button></Card></main>
      ) : !summary || !draft || !options ? (
        <main id="preview-main" className="mx-auto grid min-h-[70dvh] place-items-center px-5"><p className="text-sm text-muted-foreground">داده‌ای برای نمایش در این دامنه وجود ندارد.</p></main>
      ) : (
        <main id="preview-main" className="preview-canvas pb-16">
          <div className="mx-auto max-w-[92rem] px-4 pt-5 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center gap-2" aria-label="فیلترهای فعال">{chips.map((chip) => <span key={chip} className="preview-chip"><Icon name="check" className="size-3.5" />{chip}</span>)}</div>
          </div>
          {tab === "overview" ? (
            <div className="mx-auto max-w-[92rem] space-y-8 px-4 py-7 sm:px-6 lg:px-8">
              <Card className="preview-decision overflow-hidden rounded-[1.7rem]">
                <div className="flex flex-col gap-5 p-5 sm:p-7 lg:flex-row lg:items-center lg:justify-between"><div><p className="preview-eyebrow">{fa.decisionBrief}</p><h1 className="mt-2 text-3xl font-black sm:text-4xl">{summary.displayName}</h1><p className="mt-2 text-sm text-muted-foreground">{summary.category?.label ?? "دسته‌بندی ثبت نشده"} · {formatDate(summary.reportingPeriod.from)} تا {formatDate(summary.reportingPeriod.to)}</p></div><div className="flex items-center gap-4"><Badge variant={failedRate?.value !== null && (failedRate?.value ?? 0) >= 25 ? "critical" : "positive"}>{primaryInsight ? "نیازمند بررسی" : "وضعیت پایدار"}</Badge><div className="preview-signal-visual" aria-hidden="true"><span /><span /><span /></div></div></div>
                <ol className="preview-decision-path">
                  {[
                    [fa.currentStatus, localizedPrimaryInsight?.observation ?? `نرخ موفقیت ثبت‌شده ${formatMetricValue(metricById(metrics, "successful-session-rate"))} است.`],
                    [fa.mainProblem, localizedPrimaryInsight?.title ?? "مسئله برجسته‌ای در دامنه فعلی شناسایی نشده است."],
                    [fa.opportunity, localizedPrimaryInsight?.impact ?? "با تغییر فیلترها می‌توانید دامنه‌های دیگر را بررسی کنید."],
                    [fa.recommendedAction, localizedPrimaryInsight?.action ?? "همین دامنه را در بازه بعدی پایش کنید."],
                  ].map(([label, value], index) => <li key={label} className="preview-decision-step" style={{ "--step-index": index } as CSSProperties}><span>{numberFormatter.format(index + 1)}</span><div><p>{label}</p><strong>{value}</strong></div></li>)}
                </ol>
              </Card>

              <section aria-labelledby="kpi-title"><div className="mb-4 flex items-end justify-between"><div><p className="preview-eyebrow">{fa.currentStatus}</p><h2 id="kpi-title" className="mt-1 text-xl font-bold">سه شاخص اصلی</h2></div><p className="hidden text-xs text-muted-foreground sm:block">مبالغ فقط به ریال نمایش داده می‌شوند</p></div><div className="grid gap-4 md:grid-cols-3"><KpiCard metric={volume} title={fa.paymentVolume} onOpen={openMetric} /><KpiCard metric={successful} title={fa.successfulSessions} onOpen={openMetric} /><KpiCard metric={failed} title={fa.failedSessions} onOpen={openMetric} /></div></section>

              <TrendChart series={trend} onOpen={() => { if (trend?.traceability) { const pseudoMetric: Metric = { metricId: trend.metricId, label: trendFaLabel(trend), definition: trend.traceability.formula.explanation, value: null, unit: trend.unit, analysisUnit: trend.analysisUnit, period: trend.traceability.dateRange, sampleSize: trend.traceability.sample.size, traceability: trend.traceability, limitations: trend.limitations }; openMetric(pseudoMetric); } }} />

              {primaryInsight ? <section aria-labelledby="priority-insight"><p className="preview-eyebrow mb-3" id="priority-insight">{fa.priorityInsight}</p><InsightCard insight={primaryInsight} onOpen={(evidence) => openMetric(evidence.metric, evidence)} /></section> : <Card className="p-6 text-sm text-muted-foreground">{fa.noInsight}</Card>}

              <details className="preview-more rounded-[1.5rem] border border-border bg-card">
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-5 font-bold sm:px-7"><span>{fa.moreMetrics}</span><span className="text-sm font-normal text-muted-foreground">سه شاخص تکمیلی و جایگاه گروهی</span></summary>
                <div className="grid gap-4 border-t border-border p-5 sm:grid-cols-3 sm:p-7"><KpiCard metric={retryRecovery} title={fa.retryRecovery} onOpen={openMetric} /><KpiCard metric={failedRate} title={fa.failedSessionRate} onOpen={openMetric} /><KpiCard metric={feeRatio} title={fa.relativeAdjustedFee} onOpen={openMetric} /></div>
                {feeRatio ? <p className="mx-5 mb-5 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm leading-7 sm:mx-7">{fa.adjustedFeeWarning}</p> : null}
                {segments.length > 0 ? <div className="border-t border-border p-5 sm:p-7"><h3 className="font-bold">جایگاه پذیرندگان در گروه‌های توصیفی</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{segments.slice(0, 4).map((segment) => <article key={segment.segmentId} className="rounded-2xl border border-border bg-muted/35 p-4"><div className="flex items-start justify-between gap-3"><strong>{segmentFaLabel(segment.segmentId, segment.label)}</strong><Badge variant="outline">{numberFormatter.format(segment.memberCount)} پذیرنده</Badge></div><p className="mt-2 text-xs leading-6 text-muted-foreground">تقسیم‌بندی توصیفی بر پایه میانه فراوانی نشست و نرخ موفقیت مشاهده‌شده.</p></article>)}</div></div> : null}
              </details>
            </div>
          ) : (
            <div className="mx-auto max-w-[92rem] px-4 py-8 sm:px-6 lg:px-8"><div className="mb-6"><p className="preview-eyebrow">{fa.insights}</p><h1 className="mt-2 text-3xl font-black">بینش‌های اولویت‌بندی‌شده</h1><p className="mt-2 text-sm text-muted-foreground">هر بینش به شواهد، اثر کسب‌وکار، اقدام و محدودیت تحلیل متصل است.</p></div><div className="grid gap-5">{insights.length > 0 ? insights.map((insight) => <InsightCard key={insight.insightId} insight={insight} onOpen={(evidence) => openMetric(evidence.metric, evidence)} />) : <Card className="p-6 text-sm text-muted-foreground">{fa.noInsight}</Card>}</div></div>
          )}
        </main>
      )}

      <form onSubmit={applyFilters}>
        <DashboardDrawer open={drawer === "filters"} side="right" title={fa.filters} description="دامنه تحلیل را بدون تغییر در منطق محاسباتی backend انتخاب کنید." onClose={closeDrawer} footer={<div className="grid grid-cols-2 gap-3"><Button type="button" variant="secondary" onClick={resetFilters}>{fa.resetFilters}</Button><Button type="submit">{fa.applyFilters}</Button></div>}>
          {draft && options ? <FilterForm draft={draft} merchants={merchants} options={options} onChange={setDraft} /> : null}
        </DashboardDrawer>
      </form>
      <DashboardDrawer
        open={drawer === "trace"}
        side="left"
        title={fa.calculationTrace}
        {...(selectedMetric === null ? {} : { description: metricFaLabel(selectedMetric) })}
        onClose={closeDrawer}
      >
        <TracePanel metric={selectedMetric} evidence={selectedEvidence} />
      </DashboardDrawer>
    </div>
  );
}
