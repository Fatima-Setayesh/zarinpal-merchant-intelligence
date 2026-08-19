# Insight Principles

## Purpose

This document defines how validated analytical output becomes a merchant-facing insight. It governs content structure, evidence disclosure, recommendation quality, limitations, and visualization intent. It does not define calculations, statistical methods, segmentation logic, or merchant scoring; those are teammate-owned.

The canonical requirements and ownership boundaries are in [`SPEC.md`](../../SPEC.md).

## An insight is a decision unit

An insight is not a metric, chart, alert, or observation in isolation. It is a complete path from evidence to an informed next step:

```text
Evidence → Insight → Business Impact → Action
```

It must also remain connected to the full product chain:

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

## Required insight anatomy

Every production insight should eventually support:

```text
Title
Observation
Evidence
Impact
Recommended Action
Traceability
Limitations
```

### Title

State the decision-relevant takeaway, not the chart type or analytical technique.

- Prefer plain merchant language.
- Preserve the direction and qualification of the validated claim.
- Avoid sensational wording and unsupported certainty.
- Do not put a recommendation in the title when the evidence does not yet support one.

### Observation

Explain what the teammate-validated analysis found.

- Name the relevant subject, period, scope, or comparison when omission would mislead.
- Use a concrete number supplied by the analytical output for an important claim.
- Distinguish a change, difference, relationship, and causal effect accurately.
- State whether the unit is Payment Session or Payment Attempt whenever ambiguity could cause double counting.

### Evidence

Show the minimum supporting measure needed to understand why the observation is credible.

- Preserve the approved metric definition, value, unit, comparison basis, and direction.
- Use formatting and rounding consistently without implying false precision.
- Pair a chart with interpretive text; never require a merchant to discover the conclusion unaided.
- Do not calculate a missing business metric in the frontend.

### Impact

Connect the observation to a merchant concern.

- Explain why the finding deserves attention.
- Keep the consequence proportional to the evidence.
- Distinguish a demonstrated effect from a potential business implication.
- Avoid translating `adjusted_fee` into claims about actual Zarinpal pricing.

### Recommended Action

Give a clear, practical next step supported by the finding.

- Make the action specific enough to execute or investigate.
- Explain its connection to the observation.
- Avoid guaranteeing an outcome or implying unsupported causality.
- State validation or monitoring needs when the action is exploratory.
- Do not invent a priority score, expected return, or confidence value in the frontend.

### Traceability

Give the user an accessible way to inspect how the claim was produced. A complete traceability view should be able to expose:

- Metric and unit of analysis
- Formula or calculation description
- Data subset
- Applied filters
- Date range
- Sample size
- Compared groups
- Missing-data handling
- Limitations
- Approved provenance or version identifiers when available

Use progressive disclosure such as “How was this calculated?” so evidence depth is available without overwhelming the primary message.

### Limitations

State the qualifications a merchant needs in order to interpret or act responsibly.

- Missing or incomplete fields
- Small or uneven sample context
- Merchant concentration
- Potential confounding
- Scope and date restrictions
- Session-versus-attempt implications
- Whether a relationship is non-causal
- Any teammate-supplied analytical warning

Limitations must appear where they affect interpretation. They must not be buried solely in project documentation or softened into misleading confidence.

## Reading order

The default insight experience should answer questions in this order:

1. **What happened?** Title and Observation
2. **Why does it matter?** Impact
3. **What should I do?** Recommended Action
4. **What supports this?** Evidence
5. **How was this calculated?** Traceability
6. **What should make me cautious?** Limitations

Responsive layouts may reposition elements, but they must preserve this meaning and keep evidence access available on mobile.

## Traceability model

The future experience should support the following relationship:

```text
Insight
├── Observation
├── Business Impact
├── Recommendation
└── Evidence
    ├── Metric
    ├── Formula
    ├── Filters
    ├── Date Range
    ├── Sample Size
    ├── Compared Groups
    ├── Missing Data Handling
    └── Limitations
```

Potential interface patterns include an expandable evidence panel, drawer, modal, evidence card, formula breakdown, or source-data summary. Pattern choice is frontend-owned; the analytical content is not.

### Ownership within traceability

| Teammate supplies and validates       | Fatima presents and explains                  |
| ------------------------------------- | --------------------------------------------- |
| Metric definition and value           | Visual hierarchy and formatting               |
| Formula or calculation description    | Progressive-disclosure interaction            |
| Applied filters and data scope        | Readable scope summary                        |
| Date range and sample size            | Accessible labels and descriptions            |
| Compared groups                       | Comparison presentation                       |
| Missing-data handling                 | Limitation placement and emphasis             |
| Analytical limitations and provenance | Responsive and keyboard-accessible experience |

No frontend fallback may manufacture missing evidence. If required traceability data is unavailable, show an honest unavailable or incomplete state.

## Data-language rules

### Payment Session and Payment Attempt

Use the exact concepts **Payment Session** and **Payment Attempt**. A repeated attempt must not silently become an additional session. Metric labels, evidence summaries, chart axes, tooltips, and comparisons must make the relevant unit clear.

The teammate owns session-versus-attempt modeling and definitions. The frontend owns faithful terminology and explanation.

### `adjusted_fee`

`adjusted_fee` is **not Zarinpal's real fee**. A constant confidential transformation has been applied.

- Never label it as the real Zarinpal fee.
- Never make an absolute claim about real pricing from it.
- A relative comparison may be shown only when the teammate has established that it is analytically justified.
- Preserve the caveat in insight copy, charts, tooltips, tables, reports, and traceability.

### Missing data

Do not treat absent values as zero, complete, or analytically irrelevant unless an approved definition explicitly says so. Present the teammate-supplied handling and limitation in language appropriate to its impact.

### Merchant concentration

Do not imply that a global result describes a typical merchant when a small number of merchants dominate volume. Surface approved concentration context near affected comparisons or claims.

### Confounding and causality

Category, amount, attempt distribution, time, merchant characteristics, and other variables may make naive merchant comparisons misleading. Use controlled, adjusted, causal, or explanatory language only when the teammate-owned analysis explicitly supports it.

## Recommendation quality

A recommendation is acceptable when it is:

- **Connected:** The supporting observation and evidence are identifiable.
- **Concrete:** The merchant understands the next step.
- **Proportional:** The language reflects the strength and scope of the evidence.
- **Bounded:** Relevant conditions, audience, period, and limitations are apparent.
- **Observable:** Where appropriate, the merchant can later inspect whether the intended condition changed.
- **Honest:** It does not fabricate expected benefit, certainty, or causality.

A recommendation is not acceptable when it is generic advice, detached from evidence, based on a frontend calculation, or framed as a guaranteed outcome.

## Visualization principles

- Begin with the question or decision, then choose the visual form.
- Use a chart only when a relationship, distribution, trend, or repeated comparison is materially easier to understand visually.
- Prefer direct labels and concise explanation over reliance on legends or hover-only content.
- Keep scales, units, comparison bases, and date ranges explicit.
- Do not truncate or encode axes in a way that exaggerates a difference.
- Preserve meaning without color alone and ensure keyboard and touch access to relevant information.
- Resize or replace visuals responsibly on mobile; do not create horizontal page overflow.
- Keep limitations and traceability reachable from the visual's context.

## Insight states

The UI must distinguish these states without inventing data:

- **Ready:** Approved insight and required supporting context are available.
- **Loading:** The request is in progress; do not show stale content as current without a label.
- **Empty:** No applicable result exists for the current scope; explain what scope produced the state.
- **Unavailable:** Required analytical output or evidence is missing; identify what cannot be shown.
- **Error:** The result could not be loaded; preserve the user's context and provide a useful retry path when possible.
- **Stale:** Previously loaded output may no longer match current filters or freshness expectations; label it clearly.
- **Limited:** A finding exists but its supplied limitations materially constrain interpretation.

## Demonstration and placeholder policy

No fabricated merchant result may look like real analytical output. Foundation-stage examples must be visibly labeled:

```text
Demo / Placeholder
```

Placeholder copy should demonstrate layout or state behavior without inventing a plausible merchant metric, performance claim, or analytical conclusion.

## Insight review checklist

Before treating an insight as production-ready, verify:

- [ ] It includes all seven anatomy fields or explicitly explains an unavailable field.
- [ ] Its important claim uses a validated concrete number.
- [ ] The observation, impact, and recommended action form a coherent chain.
- [ ] The recommendation does not promise more than the evidence supports.
- [ ] Payment Session and Payment Attempt terminology is unambiguous.
- [ ] `adjusted_fee` wording follows the confidentiality rule wherever relevant.
- [ ] Data subset, filters, date range, sample size, formula or calculation, compared groups, missing-data handling, and limitations are accessible.
- [ ] Missingness, merchant concentration, confounding, and other supplied qualifications are visible where material.
- [ ] Any chart has a clear analytical purpose and an accessible interpretation.
- [ ] Desktop and mobile preserve meaning and evidence access.
- [ ] No analytical value, score, segment, or conclusion is computed in the frontend.
- [ ] Any temporary content says `Demo / Placeholder`.
