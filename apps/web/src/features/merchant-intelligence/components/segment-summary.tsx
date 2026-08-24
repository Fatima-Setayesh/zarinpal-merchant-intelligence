import { Badge } from "@/components/ui/badge";

import type { Segment } from "../api/types";
import { numberFormatter } from "../model/formatters";

export function SegmentSummary({ segments }: { segments: Segment[] }) {
  if (segments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        گروه توصیفی بازگردانده نشد.
      </p>
    );
  }
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {segments.map((segment) => (
        <article
          key={segment.segmentId}
          className="border-t border-border pt-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-bold" dir="auto">
              {segment.label}
            </h3>
            <Badge variant="outline">
              {numberFormatter.format(segment.memberCount)} پذیرنده
            </Badge>
          </div>
          <p
            className="mt-2 text-sm leading-7 text-muted-foreground"
            dir="auto"
          >
            {segment.description}
          </p>
          {segment.definingCharacteristics.length > 0 ? (
            <ul className="mt-3 list-disc space-y-1 pr-5 text-xs leading-6 text-muted-foreground">
              {segment.definingCharacteristics.map((characteristic) => (
                <li key={characteristic} dir="auto">
                  {characteristic}
                </li>
              ))}
            </ul>
          ) : null}
          {segment.limitations[0] ? (
            <p
              className="mt-3 border-r-2 border-muted-foreground/40 pr-3 text-xs leading-6"
              dir="auto"
            >
              {segment.limitations[0]}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
