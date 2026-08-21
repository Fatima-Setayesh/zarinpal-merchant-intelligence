import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardLoadingState() {
  return (
    <div aria-live="polite" aria-busy="true" className="grid gap-5">
      <p className="sr-only">Loading merchant intelligence</p>
      <Card className="gap-0 rounded-2xl p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="mt-4 h-9 w-3/5" />
        <Skeleton className="mt-3 h-4 w-4/5" />
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Card key={item} className="gap-0 rounded-2xl p-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-6 h-9 w-24" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

interface DashboardMessageStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function DashboardMessageState({
  title,
  description,
  actionLabel,
  onAction,
}: DashboardMessageStateProps) {
  return (
    <Card className="mx-auto max-w-2xl gap-0 rounded-2xl border-dashed p-7 text-center sm:p-10">
      <span
        className="mx-auto grid size-11 place-items-center rounded-full bg-primary/8 text-lg font-bold text-primary"
        aria-hidden="true"
      >
        i
      </span>
      <h2 className="mt-5 text-xl font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {actionLabel && onAction ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </Card>
  );
}
