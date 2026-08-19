import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const decisionFlow = [
  "Raw data",
  "Evidence",
  "Insight",
  "Business impact",
  "Recommended action",
  "Traceability",
] as const;

const decisionQuestions = [
  {
    index: "01",
    title: "What happened?",
    description:
      "Lead with a plain-language observation supported by validated evidence.",
  },
  {
    index: "02",
    title: "Why does it matter?",
    description:
      "Translate the evidence into a clear, merchant-relevant business implication.",
  },
  {
    index: "03",
    title: "What should I do?",
    description:
      "End with an actionable recommendation and make its limitations visible.",
  },
] as const;

const evidenceFields = [
  "Metric and formula",
  "Filters and date range",
  "Sample size",
  "Compared groups",
  "Missing-data handling",
  "Limitations",
] as const;

export function MerchantIntelligencePage() {
  return (
    <>
      <section className="hero-grid overflow-hidden border-b border-border/70">
        <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-center lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-6 bg-background/70">
              Zarinpal Challenge · Product foundation
            </Badge>
            <h1 className="text-balance text-4xl leading-[1.04] font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">
              Turn payment evidence into confident merchant actions.
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              A decision intelligence product designed to explain what happened,
              why it matters, and what to do next—while keeping every important
              claim traceable.
            </p>
          </div>

          <Card className="relative overflow-hidden border-primary/15 bg-card/85 shadow-[0_24px_80px_rgba(45,45,120,0.12)] backdrop-blur">
            <div
              className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,var(--color-primary),var(--color-accent))]"
              aria-hidden="true"
            />
            <CardHeader>
              <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
                Product principle
              </p>
              <CardTitle className="text-2xl">
                A complete decision path
              </CardTitle>
              <CardDescription>
                Charts and metrics only earn space when they help a merchant
                make a better decision.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ol
                className="grid gap-3"
                aria-label="Decision intelligence flow"
              >
                {decisionFlow.map((step, index) => (
                  <li key={step} className="flex items-center gap-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/8 text-xs font-bold text-primary">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-sm font-medium">{step}</span>
                    {index < decisionFlow.length - 1 ? (
                      <span
                        className="ml-auto text-muted-foreground"
                        aria-hidden="true"
                      >
                        ↓
                      </span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
              Decision anatomy
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight">
              Insight first. Detail on demand.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-right">
            The product is structured for non-technical merchants, with
            analytical evidence available through progressive disclosure.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {decisionQuestions.map((item) => (
            <Card key={item.index} className="gap-0 rounded-2xl shadow-sm">
              <CardHeader className="pb-4">
                <span className="text-xs font-bold tracking-[0.18em] text-muted-foreground">
                  {item.index}
                </span>
                <CardTitle>{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section
        id="workspace"
        className="border-y border-border/70 bg-muted/45 scroll-mt-24"
      >
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:px-8">
          <Card className="overflow-hidden">
            <CardHeader>
              <Badge variant="secondary" className="mb-2">
                Demo / Placeholder
              </Badge>
              <CardTitle className="text-2xl sm:text-3xl">
                Merchant intelligence workspace
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                This shell is ready for teammate-approved API contracts. It does
                not contain merchant metrics, generated insights, or analytical
                calculations.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-7">
              <div className="rounded-2xl border border-dashed border-primary/25 bg-primary/[0.035] p-5 sm:p-6">
                <p className="font-semibold">Integration boundary</p>
                <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    The analytical service will calculate and validate evidence.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    The frontend will explain impact, action, and traceability.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    Shared contracts remain drafts until teammate approval.
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="gap-0 rounded-2xl shadow-sm">
            <CardHeader className="pb-5">
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Future evidence detail</CardTitle>
                <Badge variant="outline">Demo / Placeholder</Badge>
              </div>
              <CardDescription>
                The traceability experience will expose methodology without
                overwhelming the primary insight.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul
                className="divide-y divide-border"
                aria-label="Planned evidence fields"
              >
                {evidenceFields.map((field) => (
                  <li
                    key={field}
                    className="flex min-h-11 items-center justify-between gap-4 py-2.5 text-sm"
                  >
                    <span>{field}</span>
                    <span className="text-muted-foreground" aria-hidden="true">
                      —
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 ring-1 ring-amber-200">
                Analytical limitations and missing-data handling must remain
                visible wherever they affect a claim.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}
