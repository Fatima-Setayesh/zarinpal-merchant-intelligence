import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "min-h-11 w-full appearance-none rounded-xl border border-border bg-[linear-gradient(45deg,transparent_50%,var(--muted-foreground)_50%),linear-gradient(135deg,var(--muted-foreground)_50%,transparent_50%)] bg-[length:5px_5px,5px_5px] bg-[position:calc(100%-17px)_calc(50%-2px),calc(100%-12px)_calc(50%-2px)] bg-no-repeat px-3.5 pr-10 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.45)] outline-none transition-[border-color,box-shadow] hover:border-primary/25 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { Select };
