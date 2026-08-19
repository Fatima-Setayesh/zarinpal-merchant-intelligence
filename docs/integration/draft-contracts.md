# Draft Frontend–Backend Contracts

## Status and intent

> DRAFT — REQUIRES TEAMMATE APPROVAL

Everything in this document is a negotiation aid. It does not define a final API, select a backend framework, or authorize frontend analytics. The TypeScript-shaped examples show the information the product experience needs; teammate approval is required before they become shared types or endpoint behavior.

Ownership labels used below:

- **Backend-owned analytical field:** the teammate defines, calculates, validates, and serves its meaning and value.
- **Presentation need:** the frontend needs the field to render the experience, but does not calculate or reinterpret it.
- **Frontend-owned presentation:** formatting, component choice, layout, interaction, localization, and accessibility stay outside the analytical payload unless explicitly agreed.

General decisions still requiring approval include nullability, identifier format, timestamps/timezones, localization, schema versioning, and error envelopes.

## MerchantSummary

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** The overview needs a compact, traceable merchant snapshot without downloading transactions or deriving headline metrics in the browser.

```ts
interface MerchantSummary {
  merchantId: string; // Presentation need; stable source/backend identity.
  displayName: string; // Presentation need; source-backed value served by backend.
  category?: { id: string; label: string }; // Presentation need; source/backend-owned classification.
  reportingPeriod: {
    from: string;
    to: string;
    timezone: string;
  }; // Backend-owned scope applied to all summary values.
  analysisUnit: "payment_session" | "payment_attempt"; // Backend-owned analytical meaning.
  headlineMetrics: Metric[]; // Backend-owned values and definitions.
  availableInsightCount?: number; // Backend-owned derived count, if supported.
  limitations: string[]; // Backend-owned analytical/data caveats; presentation need.
}
```

**Ownership:** The teammate owns identity/source mapping, category meaning, period, analysis unit, all values, counts, and limitations. Fatima owns card hierarchy, number formatting, responsive layout, and how limitations are disclosed. UI-only concerns such as color and icon choice should not be encoded here.

## Insight

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** The product must communicate evidence → insight → business impact → action, with every important claim linked to traceability.

```ts
interface Insight {
  insightId: string; // Presentation need; backend-issued stable identity.
  merchantId: string; // Backend-owned scope link.
  title: string; // Presentation need; analytical meaning must be teammate-approved.
  observation: string; // Backend-owned analytical claim in display-ready language.
  businessImpact: string; // Backend-owned justified implication; must not be inferred by UI.
  priority?: string; // Backend-owned taxonomy and value, if supported.
  evidence: Evidence[]; // Backend-generated and validated support.
  recommendations: Recommendation[]; // Backend/analytical output, not UI-generated.
  limitations: string[]; // Backend-owned caveats.
  generatedAt?: string; // Backend-owned provenance timestamp, if meaningful.
}
```

**Ownership:** The teammate owns whether an insight is valid, the observation, analytical implication, priority semantics, supporting evidence, and recommendation logic. Fatima owns hierarchy, progressive disclosure, visualization, and accessibility. Editorial simplification must not change the approved analytical meaning.

## Evidence

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** Evidence is the traceability bridge that lets a merchant understand the population, method, comparison, missingness, and limitations behind a claim.

```ts
interface Evidence {
  evidenceId: string; // Presentation need; backend-issued stable identity.
  metric: Metric; // Backend-owned calculated result.
  filters: FilterState; // Canonical state actually applied by backend.
  dateRange: {
    from: string;
    to: string;
    timezone: string;
  }; // Backend-owned analytical scope.
  sample: {
    size: number;
    analysisUnit: "payment_session" | "payment_attempt";
  }; // Backend-owned population and unit.
  formula: {
    label: string;
    explanation: string;
    methodologyReference?: string;
  }; // Backend-owned method description; documentation, not executable UI logic.
  comparedGroups?: Array<{
    groupId: string;
    label: string;
    sampleSize?: number;
  }>; // Backend-owned comparison context.
  missingDataHandling: string; // Backend-owned treatment description.
  limitations: string[]; // Backend-owned caveats.
  sourceReference?: string; // Backend-owned safe provenance reference, not raw credentials/data.
}
```

**Ownership:** The teammate owns the population, calculation, comparison, missing-data treatment, provenance, and limitations. Fatima owns the drawer/panel/card experience, content hierarchy, and accessible explanation. The frontend does not rebuild evidence from raw records.

## Recommendation

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** An insight must lead to a concrete next step while keeping the rationale and evidence link visible.

```ts
interface Recommendation {
  recommendationId: string; // Presentation need; backend-issued identity.
  action: string; // Backend/analytical recommendation content.
  rationale: string; // Backend-owned link from evidence to proposed action.
  expectedImpact?: {
    statement: string;
    metricId?: string;
  }; // Backend-owned; included only when analytically justified.
  supportingEvidenceIds: string[]; // Backend-owned traceability links.
  caveats: string[]; // Backend-owned constraints and uncertainty.
}
```

**Ownership:** The teammate owns recommendation generation, analytical rationale, any impact claim, evidence linkage, and caveats. Fatima owns action-card presentation and interaction. CTA labels, placement, and visual urgency are frontend concerns and must not create an unsupported promise.

## Metric

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** A reusable metric payload prevents UI components from embedding formulas and ensures every value carries scope, unit, and disclosure information.

```ts
interface Metric {
  metricId: string; // Backend-owned definition identity.
  label: string; // Presentation need; teammate-approved analytical terminology.
  definition: string; // Backend-owned meaning.
  value: number | null; // Backend-calculated value; null is not zero.
  unit: string; // Backend-owned semantic unit; frontend formats it.
  analysisUnit: "payment_session" | "payment_attempt"; // Backend-owned basis.
  period: {
    from: string;
    to: string;
    timezone: string;
  }; // Backend-owned scope.
  sampleSize?: number; // Backend-owned, when applicable.
  comparison?: {
    referenceLabel: string;
    referenceValue: number | null;
    delta: number | null;
  }; // Entirely backend-calculated, if supported.
  disclosure?: {
    code: string;
    message: string;
  }; // Backend-owned classification/copy; required for transformed adjusted_fee outputs.
  limitations: string[]; // Backend-owned caveats.
}
```

**Ownership:** The teammate owns definition, value, unit semantics, analysis unit, scope, comparison, sample size, disclosure classification, and numerical correctness. Fatima owns locale-aware formatting, hierarchy, and explanation. The frontend must never compute `comparison.delta`, replace null with zero, or label `adjusted_fee` as Zarinpal's real fee.

## Segment

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** Segment views need stable, explainable results without exposing or recreating the segmentation algorithm in frontend code.

```ts
interface Segment {
  segmentId: string; // Backend-issued stable identity.
  label: string; // Presentation need; analytical meaning teammate-approved.
  description: string; // Backend-owned explanation of the result.
  memberCount: number; // Backend-calculated population.
  analysisUnit: "merchant"; // Backend-owned meaning; other units require approval.
  definingCharacteristics: string[]; // Backend-owned descriptive output, not UI-inferred rules.
  metrics: Metric[]; // Backend-calculated segment metrics.
  supportingEvidenceIds: string[]; // Backend-owned traceability links.
  limitations: string[]; // Backend-owned caveats/confounders.
}
```

**Ownership:** The teammate owns segment creation, assignment, descriptions, characteristics, counts, metrics, and limitations. Fatima owns visual comparison, explanation, responsive layout, and accessible encodings. Color, icon, and screen order are intentionally absent; presentation must not imply an unapproved ranking.

## ChartSeries

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** Charts need analytically correct, already-shaped series so the browser only performs lossless presentation work.

```ts
interface ChartSeries {
  seriesId: string; // Backend-issued stable identity.
  label: string; // Presentation need; backend/source meaning.
  metricId: string; // Backend-owned metric link.
  unit: string; // Backend-owned semantic unit.
  analysisUnit: "payment_session" | "payment_attempt" | "merchant"; // Backend-owned basis.
  group?: { id: string; label: string }; // Backend-owned grouping result.
  points: Array<{
    x: string | number;
    y: number | null;
    evidenceId?: string;
  }>; // Backend-produced values, ordering, nulls, aggregation, and evidence links.
  limitations: string[]; // Backend-owned series caveats.
}
```

**Ownership:** The teammate owns data correctness, aggregation/bucketing, grouping, ordering semantics, nulls, units, and evidence links. Fatima owns chart type, scales that do not mislead, colors, labels, tooltips, responsive behavior, and accessible alternatives. Smoothing, interpolation, aggregation, and trend calculation are not frontend presentation operations.

## FilterState

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** A canonical filter representation lets the frontend express merchant intent and lets evidence repeat the exact scope the backend actually analyzed.

```ts
interface FilterState {
  dateRange?: {
    from: string;
    to: string;
    timezone: string;
  }; // Frontend-selected; backend validates, applies, and canonically echoes.
  merchantIds?: string[]; // Frontend selection; backend-owned identity and computation.
  segmentIds?: string[]; // Frontend selection; backend-owned segment semantics.
  analysisUnit?: "payment_session" | "payment_attempt"; // Explicit user/context choice; backend validates.
  dimensions?: Array<{
    key: string;
    operator: "include" | "exclude";
    values: string[];
  }>; // Keys/options/operator semantics must come from a backend allowlist.
}
```

**Ownership:** Fatima owns controls, client state, serialization, reset behavior, and the visible applied-filter summary. The teammate owns supported dimensions/options, validation, defaults with analytical impact, and all filtering computation. Production requests must not accept arbitrary dimension keys without an approved capability/allowlist contract.

## Pagination envelope

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** Merchant, insight, and evidence collections may be large. Cursor pagination is proposed to avoid unstable client-side slicing and offset drift, but the teammate must confirm it suits backend ordering and storage.

```ts
interface PageRequest {
  cursor?: string; // Opaque backend-issued token; frontend stores but never parses it.
  limit?: number; // Frontend preference; backend validates and caps it.
}

interface PageResult<T> {
  items: T[]; // Backend-ordered page.
  nextCursor: string | null; // Backend-issued continuation token.
  totalCount?: number; // Backend-calculated and optional when expensive or misleading.
}
```

**Ownership:** The teammate owns stable ordering, cursor semantics, maximum/default limits, total-count correctness, and behavior when data changes between requests. Fatima owns next/load-more controls, request state, focus behavior, and loading/error presentation. Cursor values are opaque and must not contain sensitive data.

Open approval questions: cursor versus offset, default/max page size, whether totals are available, sort allowlists, and reset behavior when filters change.

## Filtering request and response

> DRAFT — REQUIRES TEAMMATE APPROVAL

**Rationale:** The backend should return the canonical filter state it actually applied so displayed results and traceability cannot drift from the user's request.

```ts
interface InsightQuery {
  filters: FilterState;
  page: PageRequest;
  sort?: {
    field: string;
    direction: "asc" | "desc";
  }; // Field/direction combinations require a backend allowlist.
}

interface FilteredResult<T> {
  appliedFilters: FilterState; // Backend-validated canonical state.
  page: PageResult<T>;
  warnings: string[]; // Backend-owned scope/data-quality warnings.
}
```

**Ownership:** The frontend proposes selections and renders the canonical echo. The backend validates and applies filters, owns sorting semantics, and emits warnings for unsupported, coerced, partial, or analytically risky scopes. Whether this becomes query parameters, a request body, or multiple endpoints is intentionally undecided.

## Approval checklist

Before implementation, both owners should resolve:

- Required versus optional fields and null versus omitted behavior.
- Identifier stability and evidence-link lifecycle.
- Date format, inclusive/exclusive boundaries, and timezone semantics.
- Units, decimal precision, localization inputs, and `adjusted_fee` disclosure copy.
- Session-versus-attempt defaults and whether users may switch the unit.
- Missing-data, partial-result, and warning representation.
- Segment taxonomy and whether labels are backend content or jointly maintained copy.
- Chart x-value typing, point ordering, and downsampling ownership.
- Filter capability discovery, validation errors, canonical echoes, and URL serialization.
- Pagination model, sort allowlists, page sizes, and total counts.
- Contract versioning and backward-compatible change process.
