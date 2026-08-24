import { Badge } from "@/components/ui/badge";

import type { Insight, MerchantSummary } from "../api/types";
import { analysisUnitLabel, formatDate } from "../model/formatters";

export function DecisionBrief({
  summary,
  insight,
  onOpenEvidence,
}: {
  summary: MerchantSummary;
  insight: Insight | undefined;
  onOpenEvidence: (insight: Insight) => void;
}) {
  const recommendation = insight?.recommendations[0];
  return (
    <section
      className="preview-decision border-b border-border py-6 sm:py-8"
      aria-labelledby="decision-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="preview-eyebrow">خلاصه تصمیم پذیرنده</p>
          <h1
            id="decision-title"
            className="mt-2 text-3xl font-black sm:text-4xl"
          >
            {summary.displayName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {summary.category?.label ?? "دسته‌بندی ثبت نشده"} ·{" "}
            {formatDate(
              summary.reportingPeriod.from,
              summary.reportingPeriod.timezone,
            )}{" "}
            تا{" "}
            {formatDate(
              summary.reportingPeriod.to,
              summary.reportingPeriod.timezone,
            )}{" "}
            · {analysisUnitLabel(summary.analysisUnit)}
          </p>
        </div>
        {insight ? (
          <Badge variant="info">
            {insight.priority
              ? `اولویت API: ${insight.priority}`
              : "بینش اولویت‌دار"}
          </Badge>
        ) : (
          <Badge variant="secondary">بدون بینش اولویت‌دار</Badge>
        )}
      </div>

      {insight ? (
        <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div>
            <p className="preview-eyebrow">یافته معتبر</p>
            <h2 className="mt-2 text-xl leading-9 font-bold" dir="auto">
              {insight.title}
            </h2>
            <p
              className="mt-3 text-sm leading-7 text-muted-foreground"
              dir="auto"
            >
              {insight.observation}
            </p>
            <div className="mt-5">
              <p className="preview-eyebrow">چرا مهم است؟</p>
              <p className="mt-2 text-sm leading-7" dir="auto">
                {insight.businessImpact}
              </p>
            </div>
          </div>
          <aside className="border-r-2 border-primary/30 pr-5">
            <p className="preview-eyebrow">اقدام پیشنهادی API</p>
            {recommendation ? (
              <>
                <p
                  className="mt-2 text-base leading-8 font-semibold"
                  dir="auto"
                >
                  {recommendation.action}
                </p>
                <p
                  className="mt-2 text-xs leading-6 text-muted-foreground"
                  dir="auto"
                >
                  {recommendation.rationale}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                برای این یافته اقدام پیشنهادی بازگردانده نشده است.
              </p>
            )}
            {insight.evidence[0] ? (
              <button
                type="button"
                className="mt-5 text-sm font-bold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => onOpenEvidence(insight)}
              >
                بررسی شواهد و محدودیت‌ها
              </button>
            ) : null}
          </aside>
        </div>
      ) : (
        <div className="mt-6 max-w-3xl border-r-2 border-muted-foreground/30 pr-5">
          <h2 className="font-bold">
            برای این دامنه بینش اولویت‌داری بازگردانده نشد.
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted-foreground">
            این وضعیت به‌تنهایی پایداری یا نبود مسئله را اثبات نمی‌کند؛ فقط
            نتیجه فعلی موتور تحلیل را توصیف می‌کند.
          </p>
        </div>
      )}
    </section>
  );
}
