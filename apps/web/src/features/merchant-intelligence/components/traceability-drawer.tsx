import { Badge } from "@/components/ui/badge";

import type { Evidence, FilterState, Metric } from "../api/types";
import {
  analysisUnitLabel,
  formatDate,
  formatMetricValue,
  metricLabel,
  numberFormatter,
  unitLabel,
} from "../model/formatters";
import { DashboardDrawer } from "./dashboard-drawer";

function Block({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="preview-eyebrow">{title}</h3>
      <div className="mt-2 text-sm leading-7" dir="auto">
        {children}
      </div>
    </section>
  );
}

function FilterList({ filters }: { filters: FilterState }) {
  return (
    <div className="flex flex-wrap gap-2">
      {(filters.merchantIds ?? []).map((merchantId) => (
        <Badge key={merchantId} variant="secondary">
          پذیرنده: <bdi dir="ltr">{merchantId}</bdi>
        </Badge>
      ))}
      {filters.analysisUnit ? (
        <Badge variant="outline">
          واحد: {analysisUnitLabel(filters.analysisUnit)}
        </Badge>
      ) : null}
      {(filters.dimensions ?? []).map((dimension) => (
        <Badge key={`${dimension.key}-${dimension.operator}`} variant="outline">
          <bdi dir="ltr">
            {dimension.key} {dimension.operator}: {dimension.values.join(", ")}
          </bdi>
        </Badge>
      ))}
      {(filters.segmentIds ?? []).map((segmentId) => (
        <Badge key={segmentId} variant="outline">
          segment: <bdi dir="ltr">{segmentId}</bdi>
        </Badge>
      ))}
    </div>
  );
}

export function TraceabilityDrawer({
  open,
  metric,
  evidence,
  onClose,
}: {
  open: boolean;
  metric: Metric | null;
  evidence: Evidence | null;
  onClose: () => void;
}) {
  const trace = metric?.traceability;
  const filters = trace?.filters ?? evidence?.filters ?? {};
  const range = trace?.dateRange ?? evidence?.dateRange ?? metric?.period;
  const sampleSize =
    trace?.sample.size ?? evidence?.sample.size ?? metric?.sampleSize;
  const sampleUnit =
    trace?.sample.analysisUnit ??
    evidence?.sample.analysisUnit ??
    metric?.analysisUnit;
  const formula = trace?.formula ?? evidence?.formula;
  const limitations =
    trace?.limitations ?? evidence?.limitations ?? metric?.limitations ?? [];
  const provenance = trace?.provenance;
  return (
    <DashboardDrawer
      open={open}
      side="left"
      title="ردیابی محاسبه"
      description={metric ? metricLabel(metric) : "شاخصی انتخاب نشده است"}
      onClose={onClose}
    >
      {metric ? (
        <div className="space-y-7 p-5 pb-10 sm:p-6">
          <Block title="۱. این شاخص چیست؟">
            <h4 className="font-bold">{metricLabel(metric)}</h4>
            <p className="mt-1 text-muted-foreground">{metric.definition}</p>
          </Block>
          <Block title="۲. مقدار و واحد">
            <p className="text-2xl font-black">
              <bdi>{formatMetricValue(metric)}</bdi>
            </p>
            <p className="text-xs text-muted-foreground">
              واحد: {unitLabel(metric.unit)}
            </p>
            {metric.disclosure ? (
              <p
                className="mt-3 border-r-2 border-warning pr-3 text-xs"
                dir="auto"
              >
                {metric.disclosure.message}
              </p>
            ) : null}
          </Block>
          <Block title="۳. دامنه و فیلترها">
            <FilterList filters={filters} />
          </Block>
          <Block title="۴. بازه زمانی">
            {range
              ? `${formatDate(range.from, range.timezone)} تا ${formatDate(
                  range.to,
                  range.timezone,
                )} (${range.timezone})`
              : "در پاسخ موجود نیست"}
          </Block>
          <Block title="۵. نمونه و واحد تحلیل">
            {sampleSize === undefined
              ? "اندازه نمونه در پاسخ موجود نیست"
              : numberFormatter.format(sampleSize)}{" "}
            {sampleUnit ? analysisUnitLabel(sampleUnit) : ""}
          </Block>
          <Block title="۶. فرمول و توضیح محاسبه">
            {formula ? (
              <>
                <p className="font-semibold" dir="auto">
                  {formula.label}
                </p>
                <p className="mt-1 text-muted-foreground" dir="auto">
                  {formula.explanation}
                </p>
              </>
            ) : (
              "در پاسخ موجود نیست"
            )}
          </Block>
          <Block title="۷. گروه‌های مقایسه و جمعیت مبنا">
            {evidence?.comparedGroups?.length ? (
              <ul className="space-y-1">
                {evidence.comparedGroups.map((group) => (
                  <li key={group.groupId}>
                    <span dir="auto">{group.label}</span>
                    {group.sampleSize === undefined
                      ? ""
                      : ` — ${numberFormatter.format(group.sampleSize)} نمونه`}
                  </li>
                ))}
              </ul>
            ) : trace?.referencePopulation ? (
              <>
                <p dir="auto">{trace.referencePopulation.label}</p>
                <p className="text-xs text-muted-foreground" dir="auto">
                  {trace.referencePopulation.method}
                </p>
              </>
            ) : (
              "گروه مقایسه‌ای در پاسخ ثبت نشده است."
            )}
          </Block>
          <Block title="۸. نحوه برخورد با داده‌های خالی">
            {trace?.missingDataHandling ??
              evidence?.missingDataHandling ??
              "در پاسخ موجود نیست"}
          </Block>
          <Block title="۹. فرض‌ها">
            {trace?.assumptions.length ? (
              <ul className="list-disc space-y-1 pr-5">
                {trace.assumptions.map((assumption) => (
                  <li key={assumption} dir="auto">
                    {assumption}
                  </li>
                ))}
              </ul>
            ) : (
              "فرض صریحی در پاسخ ثبت نشده است."
            )}
          </Block>
          <Block title="۱۰. محدودیت‌ها">
            {limitations.length ? (
              <ul className="list-disc space-y-1 pr-5">
                {limitations.map((limitation) => (
                  <li key={limitation} dir="auto">
                    {limitation}
                  </li>
                ))}
              </ul>
            ) : (
              "محدودیتی در پاسخ ثبت نشده است؛ این به معنی نبود محدودیت نیست."
            )}
          </Block>
          <Block title="۱۱. مرجع دیتاست و منشأ">
            <dl className="space-y-2 text-xs">
              <div>
                <dt className="text-muted-foreground">شناسه دیتاست</dt>
                <dd>
                  <bdi dir="ltr">{provenance?.datasetId ?? "—"}</bdi>
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">مرجع منبع</dt>
                <dd>
                  <bdi dir="ltr">
                    {provenance?.sourceReference ??
                      evidence?.sourceReference ??
                      "—"}
                  </bdi>
                </dd>
              </div>
              {trace?.sourceMetricIds.length ? (
                <div>
                  <dt className="text-muted-foreground">سنجه‌های مبنا</dt>
                  <dd>
                    <bdi dir="ltr">{trace.sourceMetricIds.join(" + ")}</bdi>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Block>
          <p className="text-xs leading-6 text-muted-foreground">
            این API فقط داده تجمیعی ارائه می‌کند؛ ردیف خام برای مرورگر در دسترس
            نیست.
          </p>
        </div>
      ) : (
        <p className="p-6 text-sm text-muted-foreground">
          شاخصی انتخاب نشده است.
        </p>
      )}
    </DashboardDrawer>
  );
}
