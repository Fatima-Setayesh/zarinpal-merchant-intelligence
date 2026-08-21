import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-[background-color,border-color,color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:translate-y-px",
  {
    variants: {
      variant: {
        primary:
          "border border-primary bg-primary text-primary-foreground shadow-[0_10px_30px_color-mix(in_oklab,var(--primary)_24%,transparent)] hover:bg-primary/92 hover:shadow-[0_14px_34px_color-mix(in_oklab,var(--primary)_30%,transparent)]",
        secondary:
          "border border-border bg-card text-foreground shadow-sm hover:border-primary/25 hover:bg-primary/[0.045]",
        ghost: "border border-transparent text-foreground hover:bg-muted",
        quiet:
          "min-h-9 rounded-lg border border-border/80 bg-background/70 px-3 text-xs text-muted-foreground hover:border-primary/25 hover:text-foreground",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Button };
