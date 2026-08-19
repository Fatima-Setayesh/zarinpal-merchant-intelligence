# Traceability UX

## Purpose

Traceability makes every important number and claim inspectable without forcing every merchant to read analytical methodology first. It is the final step of the product narrative and a trust requirement, not an optional technical appendix.

This document specifies presentation and interaction only. Evidence generation, calculations, formulas, samples, filters, missing-data handling, limitations, and numerical validation are teammate-owned.

## Traceability model

```text
Insight
├── Observation
├── Business Impact
├── Recommended Action
└── Evidence
    ├── Metric and definition
    ├── Formula or method summary
    ├── Data subset and filters
    ├── Date range and freshness
    ├── Sample size and unit of analysis
    ├── Compared groups
    ├── Missing-data handling
    ├── Limitations
    └── Provenance or method version
```

These fields describe frontend presentation needs, not a finalized API. Their contract must remain marked **DRAFT — REQUIRES TEAMMATE APPROVAL** until reviewed.

## Entry points

Every material claim should have a nearby, consistently named affordance such as **How was this calculated?** Secondary entry points may appear on a metric, chart, comparison, or recommendation, but all should open the evidence for the exact item that invoked them.

Do not use a tooltip as the only path to traceability. Tooltips are unsuitable for complete methodology, keyboard/touch exploration, and material limitations.

## Disclosure pattern

Use progressive disclosure:

1. The insight surface shows the observation, business impact, recommended action, key evidence, and any critical limitation.
2. An evidence summary shows scope, period, sample size, unit of analysis, and comparison at a glance.
3. Detailed sections reveal formula/method, filters, missingness, provenance, and full limitations.

On wider screens, a side sheet or anchored evidence panel can preserve the insight context. On narrow screens, use a full-height sheet or page-like disclosure with a visible title and close/back control. Deep evidence may use expandable sections, but critical limitations must not default to hidden.

## Evidence content requirements

### Context

- the claim or value being explained;
- active merchant or comparison scope;
- date range, timezone where relevant, and data freshness;
- whether the result is final, partial, delayed, or unavailable.

### Measurement

- metric name and plain-language definition;
- displayed value and unit;
- unit of analysis, explicitly **payment session** or **payment attempt** where applicable;
- formula or approved method summary;
- sample size and exclusions.

### Comparison

- baseline and comparison groups;
- comparison period and direction;
- relevant normalization or control summary supplied by the analytical layer;
- warnings when merchant concentration or confounding affects interpretation.

### Data handling and provenance

- applied filters and data subset;
- missing-data treatment;
- source or dataset version identifier that is safe to display;
- calculation or methodology version when supplied;
- limitations and assumptions.

The UI must not infer absent metadata. If evidence is incomplete, say which field is unavailable and whether the headline result remains usable.

## Ownership contract

| Concern           | Teammate-owned                       | Frontend-owned                         |
| ----------------- | ------------------------------------ | -------------------------------------- |
| Metric            | Definition, value, unit, correctness | Formatting, hierarchy, explanation     |
| Formula/method    | Calculation and approved description | Readable layout and disclosure         |
| Filters           | Computation and analytical scope     | Controls and active-filter summary     |
| Sample and groups | Membership, exclusions, counts       | Labels and comparison presentation     |
| Missing data      | Detection and treatment              | Visibility and understandable wording  |
| Limitations       | Analytical substance                 | Placement, severity, and accessibility |
| Provenance        | Valid identifiers and freshness      | Consistent presentation and navigation |

The frontend must not repair a missing evidence field by recalculating it, parsing a raw dataset, or guessing a definition.

## Special correctness rules

### Session versus attempt

Show the unit beside every relevant count or rate. When both are present, explain their relationship without merging them. Avoid the standalone label “transactions” if it could conceal repeated attempts.

### Adjusted fee

When evidence includes `adjusted_fee`, label it as an adjusted, confidentially transformed value using teammate-approved copy. State that it is not Zarinpal's real fee and does not support absolute real-pricing claims. Show relative comparisons only when the analytical response explicitly supports them.

### Missingness, concentration, and confounding

Give material limitations visual weight proportional to their effect on interpretation. Do not reduce them to an info icon. If a comparison is not adjusted for relevant confounders, the wording must avoid causal or universal claims.

## States and failure behavior

- **Complete:** all required evidence is present and internally linked.
- **Partial evidence:** show available content and a prominent list of unavailable fields.
- **Evidence unavailable:** keep the claim state honest and explain whether the user should rely on it.
- **Loading:** identify the evidence being loaded and preserve the originating context.
- **Error:** state that evidence failed to load, retain the insight, and provide a safe retry.
- **Stale:** display freshness and avoid implying that an older result reflects the current filters.

A production insight must not appear fully verified if its required traceability payload is missing.

## Accessibility

- Move focus into an opened modal or sheet and return it to the invoking control on close.
- Give the disclosure an accessible name matching the explained claim.
- Preserve a logical heading structure and native list/table semantics.
- Do not encode evidence status or comparison direction by color alone.
- Make formulas readable as text; provide a plain-language description rather than relying on notation alone.
- Ensure scrollable evidence regions work with keyboard, touch, zoom, and screen readers.

## Acceptance criteria

- A user can open evidence from every important insight or metric.
- The opened evidence unambiguously corresponds to the invoking claim.
- Scope, filters, date range, sample size, unit of analysis, comparison groups, missingness, and limitations are represented or explicitly unavailable.
- Critical caveats remain visible before the user acts.
- Session and attempt terminology is unambiguous.
- Adjusted-fee wording is confidentiality-safe.
- Desktop and mobile disclosure paths are keyboard- and touch-complete.
- No frontend analytical calculation is required to render the evidence.
