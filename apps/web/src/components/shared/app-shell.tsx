import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#main-content"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 w-full max-w-[92rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <a
            href="/"
            className="group flex min-w-0 items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4"
            aria-label="Zarinpal Merchant Intelligence home"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground shadow-sm transition-transform group-hover:-rotate-2"
              aria-hidden="true"
            >
              ZI
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight sm:text-base">
                Merchant Intelligence
              </span>
              <span className="hidden text-xs text-muted-foreground sm:block">
                Decisions backed by evidence
              </span>
            </span>
          </a>

          <div className="flex items-center gap-3">
            <nav aria-label="Primary navigation" className="hidden md:block">
              <div className="flex items-center gap-1 rounded-full border border-border bg-muted/45 p-1">
                <a
                  href="#main-content"
                  aria-current="page"
                  className="inline-flex min-h-9 items-center rounded-full bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Overview
                </a>
                <a
                  href="#insight-feed-title"
                  className="inline-flex min-h-9 items-center rounded-full px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Insights
                </a>
              </div>
            </nav>
            <Badge variant="warning">Frontend preview</Badge>
          </div>
        </div>
      </header>

      <main id="main-content">{children}</main>

      <footer className="border-t border-border/80 bg-card/60">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-2 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Zarinpal Challenge · Merchant Decision Intelligence</p>
          <p>Demo / Placeholder · No verified merchant analysis is loaded.</p>
        </div>
      </footer>
    </div>
  );
}
