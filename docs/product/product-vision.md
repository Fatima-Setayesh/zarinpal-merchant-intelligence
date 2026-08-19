# Product Vision

## Purpose

This document defines the product promise and the lens used to make product decisions. [`SPEC.md`](../../SPEC.md) remains the canonical source for scope, requirements, ownership, and definition of done.

## Vision statement

The Zarinpal Challenge project is a **Merchant Decision Intelligence Platform** that helps a merchant move from payment evidence to a defensible business decision.

It is not a generic analytics dashboard. It is a **Decision Intelligence Product**, not a collection of charts.

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

The product promise is concise:

```text
Evidence → Insight → Business Impact → Action
```

## The problem worth solving

Payment data may contain useful patterns while still being difficult for a merchant to act on. Raw tables and dashboard charts often shift the hardest work onto the user: deciding which change matters, whether a comparison is trustworthy, what the business consequence might be, and what action follows.

This product should close that gap. It should present important, validated findings in merchant language while keeping the underlying evidence, calculation context, and limitations available for inspection.

## Primary user

The primary user is a merchant who:

- Wants to improve business outcomes using payment data
- May not know analytical terminology or statistical methods
- Needs the important finding before the analytical detail
- Needs a practical next step, not merely a description of past behavior
- Must be able to judge whether evidence applies to the selected merchant, period, and scope

Reviewers and analytically experienced users are secondary users. Their need for rigor is met through traceability and progressive disclosure rather than by making the primary experience more technical.

## Desired user outcome

For every material insight, the merchant can answer:

1. **What happened?** A plain-language observation identifies the relevant change, difference, or pattern.
2. **Why does it matter?** The business impact connects evidence to a merchant concern without overstating certainty.
3. **What should I do?** A practical recommendation follows from the evidence.
4. **How was this calculated?** Traceability reveals the supporting scope and methodology supplied by the analytical layer.
5. **What should make me cautious?** Limitations, missingness, sample context, and other qualifications remain visible.

## Product principles

### Non-Technical First

The merchant should not need analytical knowledge to understand the primary result. Use plain language, recognizable business concepts, and a clear reading order.

### Insight First

Lead with what happened, why it matters, and what action is recommended. Raw detail is supporting evidence, not the product's opening move.

### Evidence Before Confidence

Every important number or claim must be backed by the relevant data subset, filters, date range, sample size, formula or calculation, compared groups, missing-data handling, and limitations.

### Progressive Disclosure

Keep the first layer simple. Make advanced evidence available through “How was this calculated?” or an equivalent accessible interaction.

### Action over Decoration

Charts exist to support decisions. A visualization without an analytical purpose, business implication, or interpretive context does not satisfy the product vision.

### Honest Limitations

Incomplete, weak, concentrated, missing, or potentially confounded evidence must be communicated where it changes interpretation. Product polish must never be used to conceal uncertainty.

### One Meaning Across Layers

Frontend wording, formatting, visualization, and responsive transformations must preserve the meaning of teammate-validated analytical output. The frontend may explain; it may not silently recalculate or strengthen a claim.

## Value proposition

### For merchants

- Less time interpreting raw payment information
- Clearer prioritization of findings that may deserve attention
- Recommendations connected to evidence rather than generic advice
- An understandable way to inspect how a claim was produced
- Visible caveats that support better-calibrated decisions

### For challenge reviewers

- Direct evidence of actionability rather than dashboard volume
- A traceable path from each material claim to its analytical basis
- Clear separation between numerical correctness and presentation responsibilities
- A maintainable, responsive, and reproducible product foundation

## Product language guardrails

- Use **Payment Session** and **Payment Attempt** as distinct terms. Do not collapse them into an ambiguous “transaction” label where the unit matters.
- `adjusted_fee` is **not Zarinpal's real fee**. Never label it as the real fee or use it for absolute claims about real pricing. Relative language is allowed only when the teammate has established that the comparison is analytically justified.
- Do not use causal wording when the approved output supports only a relationship or comparison.
- Do not describe a global aggregate as representative when merchant concentration materially limits that interpretation.
- Do not hide missing-data handling or limitations.
- Any temporary demonstration content must be labeled `Demo / Placeholder` and must not resemble a verified merchant finding.

## Ownership model

The teammate owns the analytical truth: data preparation, definitions, calculations, statistical work, segment logic, evidence generation, backend serving, numerical tests, and analytical limitations.

Fatima owns how that truth becomes a product: product governance, frontend architecture, interface design, UX, data storytelling, visualization, responsive behavior, accessibility, traceability experience, frontend tests, and API consumption.

Shared integration shapes are proposals until both owners coordinate. They must be marked:

```text
DRAFT — REQUIRES TEAMMATE APPROVAL
```

## Explicit non-goals

The product is not intended to become:

- A chart catalog with no recommended action
- A raw-data explorer that requires merchants to perform their own analysis
- A frontend analytics engine
- A place to invent merchant scores, metrics, segment definitions, or statistical conclusions
- A generic chatbot added only to claim AI usage
- A vehicle for exposing confidential fee meaning through `adjusted_fee`
- A backend, database, or data-pipeline architecture selected on the teammate's behalf

## Vision test

A feature belongs in the product when it materially improves at least one step in the decision chain and does not weaken another. Before adding it, ask:

1. What merchant decision does this support?
2. Which validated evidence makes it trustworthy?
3. Is the business implication understandable without analytical expertise?
4. Is the proposed action proportional to the evidence?
5. Can the user inspect scope, calculation context, and limitations?
6. Does it respect the frontend/analytics ownership boundary?

If those questions cannot be answered, the feature needs refinement before implementation.
