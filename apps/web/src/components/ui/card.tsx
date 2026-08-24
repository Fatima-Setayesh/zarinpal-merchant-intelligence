import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      data-slot="card"
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card text-card-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: ComponentProps<"header">) {
  return (
    <header
      data-slot="card-header"
      className={cn("grid gap-2 px-6 pt-6 sm:px-8 sm:pt-8", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      data-slot="card-title"
      className={cn("text-xl font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm leading-6 text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6 pb-6 sm:px-8 sm:pb-8", className)}
      {...props}
    />
  );
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle };
