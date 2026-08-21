import type { StatusTone } from "./dashboard-view-model";

const toneSurfaceClasses: Record<StatusTone, string> = {
  positive: "border-emerald-200/80 bg-emerald-50/70 text-emerald-900",
  warning: "border-amber-200/80 bg-amber-50/70 text-amber-950",
  critical: "border-rose-200/80 bg-rose-50/70 text-rose-950",
  neutral: "border-border bg-muted/55 text-foreground",
};

const toneDotClasses: Record<StatusTone, string> = {
  positive: "bg-emerald-500 ring-emerald-500/15",
  warning: "bg-amber-500 ring-amber-500/15",
  critical: "bg-rose-500 ring-rose-500/15",
  neutral: "bg-muted-foreground ring-muted-foreground/15",
};

export function getToneSurfaceClass(tone: StatusTone) {
  return toneSurfaceClasses[tone];
}

export function getToneDotClass(tone: StatusTone) {
  return toneDotClasses[tone];
}
