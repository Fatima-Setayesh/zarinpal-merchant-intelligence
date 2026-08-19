# Frontend–Backend Boundaries

## Purpose

This document defines the collaboration seam between Fatima's product/frontend work and the teammate-owned backend, data, and analytical work. It describes required inputs and outputs, not the teammate's internal implementation.

The product's shared flow is:

```text
Raw Data
   ↓
Evidence
   ↓
Insight
   ↓
Business Impact
   ↓
Recommended Action
   ↓
Traceability
```

The frontend must never calculate business metrics, reproduce analytical logic, infer segments, or silently reinterpret a backend result. The backend must not prescribe component structure, visual hierarchy, responsive behavior, or interaction design.

All schemas in [draft-contracts.md](./draft-contracts.md) remain proposals until both owners approve them.

## Ownership at a glance

| Area        | Teammate-owned analytical/backend responsibility                                                   | Fatima-owned product/frontend responsibility                                              |
| ----------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Data        | Cleaning, preprocessing, attempt/session modeling, missing-data treatment, storage and serving     | Communicating scope, data quality, and limitations supplied by the backend                |
| Analysis    | Definitions, calculations, statistics, hypotheses, confounder control, numerical correctness       | Information hierarchy, plain-language presentation, interaction and visual explanation    |
| Integration | API behavior, validation, stable identifiers, analytical payloads, error semantics and performance | Typed client boundary, request state, loading/empty/error states and accessible rendering |
| Quality     | Analytical and backend tests                                                                       | Frontend, interaction, responsive and accessibility tests                                 |

## Six critical dependencies

### 1. Insight contract

**Teammate provides**

- Calculated and validated observations.
- Evidence and limitations supporting every important claim.
- Business-impact and recommendation content only when analytically justified.
- Stable identifiers linking an insight to its evidence.

**Fatima provides**

- Insight cards and detail experiences.
- Plain-language hierarchy: what happened, why it matters, and what to do.
- Progressive disclosure, responsive layout, accessibility, and visual emphasis.

**Boundary rule:** The frontend may format or arrange approved content, but it must not generate a claim, priority, impact estimate, or recommendation from raw values. Any wording change that could alter analytical meaning requires teammate review.

### 2. Traceability

**Teammate provides**

- The calculation or methodology description.
- Exact filters and date range applied.
- Sample size and the unit of analysis (payment session or payment attempt).
- Compared groups, missing-data handling, and known limitations.
- Evidence-to-insight linkage and source references that are safe to expose.

**Fatima provides**

- The user-facing traceability experience, such as an evidence drawer, expandable panel, or evidence card.
- Formula and source summaries that preserve the supplied meaning.
- Navigation between an insight, supporting metrics, and limitations.
- Clear disclosure when evidence is incomplete or constrained.

**Boundary rule:** The frontend displays the traceability record it receives. It does not reconstruct formulas, sample populations, exclusions, or confidence from transaction data.

### 3. Filters

**Teammate provides**

- Supported filter dimensions, valid options, validation rules, and defaults that affect analytical meaning.
- Application of filters to data and all resulting calculations.
- A canonical echo of the applied filter state when it differs from the request.

**Fatima provides**

- Filter controls, responsive/mobile presentation, discoverability, clear/reset behavior, and URL or local UI-state synchronization where appropriate.
- Request serialization against an approved contract.
- A visible summary of the filters actually applied.

**Boundary rule:** The frontend owns filtering UX, not filtering computation. It must not locally filter an analytical result and imply the derived result is authoritative. Unsupported or ambiguous filter combinations must be rejected or clarified by the backend contract.

### 4. Segmentation

**Teammate provides**

- Segment definitions, assignment logic, membership, counts, validation, limitations, and any comparison calculations.
- Stable segment identifiers and approved explanatory text or characteristics.

**Fatima provides**

- Segment visualization, navigation, comparison layout, labels in context, and accessible explanations.
- Responsive behavior and presentation choices such as color, iconography, and chart form.

**Boundary rule:** The frontend must not assign merchants to segments, reverse-engineer criteria, or calculate segment-level statistics. Display colors or ordering must never imply an unsupported rank.

### 5. Charts

**Teammate provides**

- Correct series, points, grouping, units, time basis, ordering requirements, null/missing semantics, and links to evidence.
- Any aggregation, bucketing, comparison, or downsampling that can change analytical meaning.

**Fatima provides**

- Chart selection, visual encoding, axes and tooltip presentation, responsive sizing, keyboard/screen-reader alternatives, and empty/loading/error states.
- Guardrails against misleading scales, clipped labels, or decorative charts without a decision purpose.

**Boundary rule:** The frontend may transform data only for lossless presentation (for example, locale formatting). It may not aggregate, smooth, interpolate, calculate trends, or replace missing values unless that exact operation is part of an approved backend contract.

### 6. Metrics

**Teammate provides**

- Metric definition, formula, calculated value, unit, denominator or population, time scope, analysis unit, data-quality caveats, and numerical tests.
- A disclosure flag and approved semantics for confidentially transformed values such as `adjusted_fee`.

**Fatima provides**

- Number formatting, label hierarchy, explanatory copy layout, comparison affordances, and accessible presentation.
- Consistent display of units, limitations, and required confidentiality language.

**Boundary rule:** The frontend must not calculate a metric or delta from raw data. It must never call `adjusted_fee` Zarinpal's real fee or make absolute real-pricing claims. Relative comparisons may be shown only when supplied as analytically justified backend output.

## Cross-cutting correctness requirements

Every approved integration must preserve the following context:

- **Payment session versus payment attempt:** metrics, evidence, filters, and chart series must state which unit is used so repeated attempts are not silently double counted.
- **`adjusted_fee`:** this field is confidentially transformed and is not the real Zarinpal fee. The backend identifies affected outputs; the frontend displays the required disclosure.
- **Missing data:** the backend supplies handling and limitations; the frontend keeps them discoverable and does not render missing values as zero.
- **Merchant concentration:** the teammate decides how concentration affects analysis. The frontend presents the supplied scope or caveat without inventing a correction.
- **Confounding variables:** category, amount, attempt distribution, time, merchant characteristics, and other confounders are analytical concerns. The frontend never presents an uncontrolled comparison as controlled.

## Integration handshake

Before the frontend treats an endpoint as integrated, both owners should agree on:

1. The relevant draft schema and version/change policy.
2. Which fields are required, nullable, or omitted.
3. Stable identifiers and evidence links.
4. Date, timezone, numeric-unit, null, and ordering semantics.
5. Filter validation and the canonical applied-filter echo.
6. Pagination behavior and limits.
7. Loading, empty, partial, and error behavior.
8. A small, explicitly labeled development fixture or contract example that is never presented as real merchant analysis.

Shared contract changes must be proposed and reviewed; neither side should silently introduce an incompatible change.
