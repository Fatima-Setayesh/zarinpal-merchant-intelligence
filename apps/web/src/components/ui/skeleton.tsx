import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "skeleton-sheen rounded-lg bg-[linear-gradient(100deg,var(--muted)_25%,color-mix(in_oklab,var(--primary)_8%,var(--card))_45%,var(--muted)_65%)] bg-[length:220%_100%]",
        className,
      )}
      aria-hidden="true"
      {...props}
    />
  );
}

export { Skeleton };
