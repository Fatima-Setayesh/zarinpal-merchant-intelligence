import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import type { Evidence, Insight } from "../api/types";
import {
  analysisUnitLabel,
  formatMetricValue,
  metricLabel,
  numberFormatter,
} from "../model/formatters";

export function InsightCard({
  insight,
  isPrimary,
  onOpen,
}: {
  insight: Insight;
  isPrimary: boolean;
  onOpen: (evidence: Evidence) => void;
}) {
  const evidence = insight.evidence[0];
  return (
    <article
      className={
        isPrimary
          ? "border-r-4 border-primary bg-card py-6 pr-5 sm:py-7 sm:pr-7"
          : "border-t border-border py-6"
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        {isPrimary ? <Badge variant="info">بینش اولویت‌دار</Badge> : null}
        {insight.priority ? (
          <Badge variant="outline">
            اولویت API: <bdi dir="auto">{insight.priority}</bdi>
          </Badge>
        ) : null}
      </div>
      <h2 className="mt-3 max-w-4xl text-xl leading-9 font-bold" dir="auto">
        {insight.title}
      </h2>
      <section className="mt-4">
        <h3 className="preview-eyebrow">مشاهده</h3>
        <p className="mt-2 text-sm leading-7 text-muted-foreground" dir="auto">
          {insight.observation}
        </p>
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section>
          <h3 className="preview-eyebrow">شواهد</h3>
          {evidence ? (
            <p className="mt-2 text-sm leading-7 font-semibold">
              {metricLabel(evidence.metric)}:{" "}
              <bdi>{formatMetricValue(evidence.metric)}</bdi>
              <span className="mt-1 block text-xs font-normal text-muted-foreground">
                {numberFormatter.format(evidence.sample.size)}{" "}
                {analysisUnitLabel(evidence.sample.analysisUnit)}
              </span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              شواهدی بازگردانده نشده است.
            </p>
          )}
        </section>
        <section>
          <h3 className="preview-eyebrow">اثر کسب‌وکار</h3>
          <p className="mt-2 text-sm leading-7" dir="auto">
            {insight.businessImpact}
          </p>
        </section>
        <section>
          <h3 className="preview-eyebrow">اقدام پیشنهادی</h3>
          {insight.recommendations.length > 0 ? (
            <div className="mt-2 space-y-4">
              {insight.recommendations.map((recommendation) => (
                <div key={recommendation.recommendationId}>
                  <p className="text-sm leading-7 font-semibold" dir="auto">
                    {recommendation.action}
                  </p>
                  <details className="mt-1 text-xs leading-6 text-muted-foreground">
                    <summary className="cursor-pointer">
                      منطق و ملاحظات اقدام
                    </summary>
                    <p className="mt-2" dir="auto">
                      {recommendation.rationale}
                    </p>
                    {recommendation.caveats.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pr-5">
                        {recommendation.caveats.map((caveat) => (
                          <li key={caveat} dir="auto">
                            {caveat}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </details>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              اقدام پیشنهادی بازگردانده نشده است.
            </p>
          )}
        </section>
      </div>

      <section className="mt-5 border-t border-border pt-4">
        <h3 className="preview-eyebrow">محدودیت‌ها</h3>
        {insight.limitations.length > 0 ? (
          <ul className="mt-2 space-y-1 text-xs leading-6 text-muted-foreground">
            {insight.limitations.map((limitation) => (
              <li key={limitation} dir="auto">
                {limitation}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            محدودیتی در پاسخ ثبت نشده است؛ این به معنی نبود محدودیت نیست.
          </p>
        )}
      </section>
      {evidence ? (
        <Button
          variant="secondary"
          className="mt-5"
          onClick={() => onOpen(evidence)}
        >
          ردیابی شواهد
        </Button>
      ) : null}
      <p className="mt-3 text-xs text-muted-foreground">
        متن مشاهده، اثر و اقدام بدون بازنویسی تحلیلی از پاسخ API نمایش داده شده
        است.
      </p>
    </article>
  );
}
