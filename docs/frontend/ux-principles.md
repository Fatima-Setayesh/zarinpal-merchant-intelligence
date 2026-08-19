# UX Principles

## Product promise

The interface helps a merchant move from evidence to a defensible decision. It should answer, in order:

1. What happened?
2. Why does it matter to my business?
3. What should I do next?
4. How was this conclusion reached?

A successful experience does not require the merchant to interpret raw tables or reverse-engineer a chart.

## Core principles

### Non-technical first

Use plain business language, explain unfamiliar terms in context, and lead with the practical meaning. Technical methodology remains available for verification without dominating the first view.

### Insight first

Start with the highest-value supported finding, its impact, and its recommended action. Supporting metrics and charts exist to strengthen that narrative rather than replace it.

### Progressive disclosure

Keep the first layer concise. Offer a clear control such as **How was this calculated?** to reveal evidence, formula, filters, sample size, missing-data handling, compared groups, and limitations.

### Action over decoration

An action must be specific enough for the merchant to evaluate and connected to the evidence that motivates it. Avoid generic advice, ornamental charts, and calls to action that the product cannot support.

### Honest limitations

Use direct language when evidence is incomplete, a sample is small, values are missing, a comparison may be confounded, or a result is unavailable. Do not bury a material caveat in a tooltip.

### Merchant control

Preserve filter context, make changes reversible, explain disabled actions, and avoid surprising navigation or data refreshes. The user should always know which merchant scope and period they are viewing.

## Anatomy of an insight

Every production insight should support the following anatomy, even if later layers are collapsed initially:

1. **Title** — a plain-language, specific finding.
2. **Observation** — what changed or differs.
3. **Evidence** — the value, comparison, scope, and period supporting the claim.
4. **Impact** — why the observation matters to the business.
5. **Recommended action** — a concrete next step justified by the evidence.
6. **Traceability** — methodology, filters, sample size, groups, missingness, and provenance.
7. **Limitations** — conditions that constrain interpretation.

The teammate-owned analytical layer supplies and validates the finding, evidence, impact inputs, recommendation inputs, and limitations. The frontend owns hierarchy, explanation, interaction, and visualization.

## Key experiences

### Merchant overview

Orient the merchant before presenting details. Show the active merchant, date range, data status, and the most important supported outcome. Distinguish sessions from attempts wherever a count could be ambiguous.

### Actionable insights

Prioritize by a teammate-approved ordering; the frontend must not invent a scoring model. Each insight should expose its action and traceability without requiring navigation through unrelated charts.

### Evidence exploration

Let a user move from a claim to supporting detail while preserving context. Evidence should answer the natural questions “Compared with what?”, “Over which period?”, and “Based on how many observations?”

### Filters

The frontend owns discoverable, accessible filtering controls and the visible summary of active filters. The backend owns filter execution and resulting calculations. Applying filters must produce clear loading and no-results behavior; it must not silently broaden the scope.

### Analytical comparison

State the compared groups, comparison basis, period, and important limitations. Avoid implying causation. Merchant-to-merchant comparisons require special care because category, amount, attempt distribution, time, merchant characteristics, and concentration may confound results.

### Segments

Explain what a teammate-approved segment means for the merchant before showing its visualization. The UI must not derive, rename, or reassign analytical segments without coordination.

### Mobile experience

Preserve the same decision path on mobile. Move secondary evidence into an accessible full-height disclosure surface, keep actions reachable, and replace or adapt dense comparisons rather than shrinking them until unreadable.

## Correctness-sensitive language

- Say **payment session** or **payment attempt**, not an ambiguous “transactions” count when repeated attempts matter.
- Never describe `adjusted_fee` as Zarinpal's real fee. Explain that it is confidentially transformed and supports only analytically justified relative comparisons.
- Do not turn missing values into zero or omit a material missing-data limitation.
- Do not label association as cause.
- Do not present demo copy or placeholder states as measured merchant performance.
- Keep units, comparison direction, time range, and data freshness close to important values.

## Interaction and feedback

- Give every user action immediate, proportionate feedback.
- Preserve the last trustworthy result during a background refresh and communicate that refresh separately.
- Use skeletons only when the final shape is predictable; use concise status text otherwise.
- Make empty, filtered-empty, partial-data, permission, offline, and server-error states distinct.
- Offer safe retry where it can help, without triggering duplicate consequential actions.
- Keep evidence and limitations accessible by keyboard and touch.

## Accessibility and inclusive comprehension

Accessibility is part of comprehension, not a final QA pass. Use semantic headings and landmarks, explicit control labels, visible focus, sufficient contrast, keyboard-complete interaction, readable line lengths, and non-color status cues. Avoid jargon, idioms, and icon-only actions without accessible names. Content must reflow at zoom and remain understandable when motion is reduced.

## UX acceptance questions

Before a feature is complete, answer yes to each applicable question:

- Can a merchant identify what happened without interpreting a chart?
- Is the business implication stated without overstating the evidence?
- Is the recommended action concrete and evidence-linked?
- Can the user reach calculation context and limitations from the claim?
- Are session and attempt counts unambiguous?
- Is adjusted-fee language accurate?
- Are loading, empty, partial, error, desktop, and mobile states designed?
- Can the primary path be completed with keyboard and touch?
