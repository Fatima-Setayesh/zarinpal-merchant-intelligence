# Judging Rubric

## Purpose

This document converts the Zarinpal Challenge's 300-point rubric into product obligations and demonstrable evidence. It does not define analytical methods; those remain teammate-owned. [`SPEC.md`](../../SPEC.md) is the canonical product specification.

## Score map

| Judging dimension              |  Points | Share of total | Core question                                                                                            |
| ------------------------------ | ------: | -------------: | -------------------------------------------------------------------------------------------------------- |
| Actionability and Novelty      |      90 |            30% | Does the product turn a validated finding into a concrete business decision and next action?             |
| Accuracy and Traceability      |      75 |            25% | Can every important number and claim be inspected and understood in its analytical context?              |
| Analytical Depth               |      60 |            20% | Does the teammate-owned analysis go beyond surface summaries while remaining correct and well-qualified? |
| UX for Non-Technical Merchants |      45 |            15% | Can a merchant understand and use the finding without analytical expertise?                              |
| Technical Quality              |      30 |            10% | Is the implementation maintainable, reproducible, tested, performant, and demonstrably real?             |
| **Total**                      | **300** |       **100%** |                                                                                                          |

## 1. Actionability and Novelty — 90 points

### Product obligation

An important insight must include:

1. A concrete number from validated analytical output
2. A clear business implication
3. An actionable recommendation

A chart, metric grid, or descriptive statement alone is insufficient. Novelty should come from a useful connection between evidence and a merchant decision, not from decorative complexity.

### What the product should demonstrate

- The overview prioritizes findings by merchant relevance rather than chart type.
- The first reading layer answers “What happened?”, “Why does it matter?”, and “What should I do?”
- Each recommendation is visibly tied to the evidence that motivated it.
- The recommended action is specific enough to be useful but does not promise an unsupported outcome.
- Visualizations clarify the decision, comparison, or evidence; they are not included merely to fill a dashboard.
- Advanced and bonus features improve prioritization, explanation, or action rather than distracting from the core journey.

### Ownership and guardrails

- **Teammate:** Calculates, validates, and supplies the observation, evidence, analytical qualification, and any approved prioritization inputs.
- **Fatima:** Establishes content hierarchy, merchant language, visualization, business explanation, recommended-action presentation, and responsive behavior.
- **Guardrail:** The frontend must not manufacture a number, calculate an opportunity score, or elevate a claim beyond the approved evidence.

### Demo evidence

- A complete insight with Title, Observation, Evidence, Impact, Recommended Action, Traceability, and Limitations
- A visible relationship between the evidence and recommended action
- A purposeful chart or comparison only where it improves comprehension
- A clear next step a merchant can explain after viewing the insight

## 2. Accuracy and Traceability — 75 points

### Product obligation

Every important number or claim must be traceable. The experience should reveal:

- Data subset
- Filters
- Date range
- Sample size
- Formula or calculation
- Compared groups
- Missing-data handling
- Limitations

Where available from approved contracts, the product should also preserve the metric definition, unit of analysis, evidence or calculation identifier, version, and update time needed for reproduction.

### What the product should demonstrate

- An accessible path such as “How was this calculated?” opens supporting evidence without removing the user from the insight context.
- Active filters, date range, merchant scope, comparison basis, and unit of analysis are visible where ambiguity would mislead.
- Payment Session and Payment Attempt are explicitly distinguished.
- `adjusted_fee` is never presented as Zarinpal's real fee; its confidential transformation and interpretive limits are clear.
- Missingness and analytical limitations appear where they affect a conclusion.
- Formatting and rounding do not contradict the supplied value or imply false precision.
- Error, unavailable, and stale states do not substitute fabricated values.

### Ownership and guardrails

- **Teammate:** Owns calculation, evidence, metric definitions, applied filters, formula, sample size, comparison groups, missing-data handling, limitations, and numerical tests.
- **Fatima:** Owns the traceability interaction, evidence hierarchy, explanation, formatting, accessible disclosure, and preservation of provenance fields.
- **Guardrail:** All proposed shared schemas must say `DRAFT — REQUIRES TEAMMATE APPROVAL`; the frontend must not silently repair, reinterpret, or recalculate analytical output.

### Demo evidence

- One material claim opened into its complete traceability view
- Explicit formula or calculation description and sample context supplied by the analytical layer
- Visible filter, date, group, missingness, and limitation information
- Correct session/attempt terminology and `adjusted_fee` wording
- A reproducible path from displayed claim to approved evidence metadata

## 3. Analytical Depth — 60 points

### Product obligation

The final product should communicate the value of deep, teammate-owned analysis without implementing analytical logic in the frontend. Potential analytical work includes:

- Hypothesis creation and testing
- Segmentation
- Relationship analysis
- Temporal analysis
- Retry analysis
- Confounder control

This list expresses relevant analytical territory, not a mandated methodology or permission for frontend implementation.

### What the product should demonstrate

- Findings go beyond surface totals where validated analysis supports deeper interpretation.
- Comparisons name their groups, unit, period, scope, and relevant caveats.
- Retry narratives preserve the difference between Payment Session and Payment Attempt.
- Segment explanations reflect teammate-provided definitions and limitations.
- Merchant concentration and relevant confounding variables are acknowledged where they affect interpretation.
- The product distinguishes observed relationships from causal conclusions.

### Ownership and guardrails

- **Teammate:** Exclusively owns analytical definitions, tests, calculations, segment logic, confounder choices, numerical validation, and insight generation.
- **Fatima:** Owns explanation and visual presentation of approved analytical output.
- **Guardrail:** Product documentation may state frontend evidence needs but must not choose statistical tests, scoring logic, thresholds, control strategies, or calculation formulas for the teammate.

### Demo evidence

- At least one validated deeper finding communicated in merchant language
- Supporting comparison and limitation context
- A traceability path that makes analytical depth inspectable rather than merely asserted
- No business metric recomputed in the browser

## 4. UX for Non-Technical Merchants — 45 points

### Product obligation

Important findings must be immediately understandable to a merchant who is not a data analyst. Complexity should be disclosed progressively, never simply removed.

### What the product should demonstrate

- Plain-language titles and observations lead the reading order.
- Business impact and next action appear before formulas or raw detail.
- “How was this calculated?” or an equivalent control reveals advanced evidence.
- Terms such as sample size, missingness, and comparison group are explained in context where needed.
- Desktop and mobile retain the same core meaning and access to evidence.
- Loading, empty, error, stale, and limitation states tell the merchant what happened and what can be done next.
- Controls use semantic HTML, accessible labels, visible focus, keyboard interaction, sufficient contrast, reasonable touch targets, and reduced-motion consideration.

### Ownership and guardrails

- **Teammate:** Supplies accurate definitions, outputs, and caveats needed for explanation.
- **Fatima:** Owns information architecture, copy hierarchy, interaction, responsive behavior, accessibility, and usability testing.
- **Guardrail:** Simplification must not erase analytical qualifications or change a metric's meaning.

### Demo evidence

- A merchant can summarize the finding, impact, and action without interpreting a raw chart
- A complete mobile journey with no horizontal page overflow
- Keyboard access and visible focus through the main insight and traceability interaction
- Readable limitation and error communication

## 5. Technical Quality — 30 points

### Product obligation

The final product must have maintainable architecture, clean code, clear structure, reproducible setup, useful documentation, real execution, and professional implementation.

### What the product should demonstrate

- React, Vite, strict TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query are used coherently unless a later documented decision supersedes them.
- Frontend presentation is separated from teammate-owned calculations and backend logic.
- No unnecessary dependencies, giant files, duplicated logic, hardcoded secrets, silent error swallowing, or fake production functionality exist.
- The repository documents setup, scripts, ownership, architecture, integration boundaries, and workflow.
- Formatting, linting, typechecking, tests, and production build run successfully in the documented environment.
- Large-data handling relies on coordinated serving contracts rather than full-dataset browser processing.
- The demo is responsive, accessible, resilient, and uses only real approved output or content visibly marked `Demo / Placeholder`.

### Ownership and guardrails

- **Fatima:** Owns frontend code quality, frontend tests, build reproducibility, product documentation, and API integration behavior.
- **Teammate:** Owns backend and data performance, analytical tests, numerical correctness, and backend reproducibility.
- **Shared:** Coordinate contracts and end-to-end integration; neither owner silently changes a shared shape.

### Demo evidence

- Documented clean setup and scripts
- Passing format check, lint, typecheck, frontend tests, and production build
- Truthful implemented-versus-planned status
- A functioning desktop and mobile product journey
- Clear ownership and contract documentation

## Cross-cutting acceptance gates

The following failures weaken more than one rubric dimension and should block a polished submission:

- A material claim without evidence, business impact, recommended action, or limitations
- A chart that requires the merchant to infer its purpose unaided
- An important number without complete traceability context
- Ambiguous use of Payment Session and Payment Attempt
- Describing `adjusted_fee` as a real Zarinpal fee or making absolute real-pricing claims
- Hiding missingness, merchant concentration, or supplied confounding limitations
- Fabricated metrics or insights presented as real
- Frontend-computed business metrics that belong to the analytical engine
- A contract treated as final without teammate approval
- A desktop-only experience or a mobile layout that loses evidence access
- Claims of test, build, skill, analytics, backend, or pipeline completion without actual verification

## Demo narrative aligned to the rubric

A concise final demo should:

1. Establish the selected merchant, period, and active scope.
2. Show a validated, concrete observation and explain its business impact.
3. Present the recommended action and why the evidence supports it.
4. Open traceability to show formula or calculation description, filters, date range, sample size, compared groups, missing-data handling, and limitations.
5. Show an analytically deeper comparison or segment explanation without exposing unnecessary complexity.
6. Repeat the core journey on mobile and demonstrate accessible interaction.
7. Close with the implementation's reproducibility, test status, and honest current limitations.
