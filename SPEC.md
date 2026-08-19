# Merchant Decision Intelligence Platform

## Product specification

**Challenge:** Zarinpal Challenge  
**Specification status:** Foundation baseline  
**Current delivery phase:** Project Foundation + Product Specification + Frontend Foundation  
**Product owner for this phase:** Fatima  
**Canonical scope:** This document defines the product promise, judging alignment, requirements, ownership boundaries, constraints, and definition of done. Supporting documents expand these rules without replacing them.

## 1. Product definition

### Problem

Payment data can describe what occurred without helping a merchant decide what to do next. A generic analytics dashboard leaves a non-technical merchant to interpret charts, judge evidence quality, and infer an action. That is not the intended product.

### Target user

The primary user is a merchant who needs trustworthy business guidance but may not have analytics or statistics expertise. The experience must also give reviewers and advanced users enough evidence to validate important claims without forcing that complexity into the primary reading path.

### Product vision

Build a **Merchant Decision Intelligence Platform** that turns payment evidence into understandable, defensible, and actionable business guidance. The application is a **Decision Intelligence Product**, not a collection of charts.

The central product rule is:

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

Every major experience must preserve the shorter outcome path:

```text
Evidence → Insight → Business Impact → Action
```

### Expected user outcome

A merchant should be able to answer, in plain language:

1. What happened?
2. Why does it matter to my business?
3. What should I do next?
4. How was this calculated?
5. What limitations should affect my confidence in the conclusion?

The merchant should not need to inspect raw records or reverse-engineer a chart to reach those answers.

## 2. Scope and ownership

This is a two-person project. Product quality depends on maintaining a clear line between analytical correctness and frontend communication.

### Fatima-owned scope

- Repository bootstrap and project governance
- `SPEC.md`, `AGENTS.md`, project conventions, and Git workflow documentation
- Frontend architecture and implementation
- UI, UX, responsive behavior, and accessibility
- Data storytelling and visualization presentation
- User-facing traceability experience
- Product documentation and design-system decisions
- Frontend tests and frontend API integration

### Teammate-owned scope

- Dataset engineering, cleaning, preprocessing, and production transformations
- Payment-session versus payment-attempt modeling
- Analytical definitions, calculations, statistics, and hypothesis testing
- Segmentation logic, confounder control, and insight-generation logic
- Backend, storage strategy, database design, and data-serving APIs
- Numerical correctness, analytical tests, and backend performance

### Non-negotiable boundary

The frontend and product-documentation work must not implement or select the teammate's internal solution. This phase therefore excludes:

- Analytical algorithms, merchant scoring, and final segmentation algorithms
- Statistical tests or choices of statistical methodology
- Data-cleaning pipelines, CSV processing, aggregation engines, and dataset transformations
- Backend business logic, API implementation, backend framework selection, and storage implementation
- Database schemas, ORM selection, and analytical-database selection
- Insight-calculation code, numerical metrics, and production calculations in UI components

Documentation may describe the outputs and guarantees the frontend needs. Proposed integration interfaces must be labeled exactly:

```text
DRAFT — REQUIRES TEAMMATE APPROVAL
```

A proposed contract is not final until the teammate explicitly approves it. Shared Insight, Evidence, Metric, Segment, Chart data, pagination, and filtering contracts must never be changed silently.

## 3. Challenge judging criteria

The specification preserves all 300 available points.

| Judging dimension              |  Points | Product obligation                                                                                                                                                                                                                   |
| ------------------------------ | ------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Actionability and Novelty      |      90 | Each meaningful insight connects a concrete number to a clear business implication and an actionable recommendation. Charts alone do not satisfy this dimension.                                                                     |
| Accuracy and Traceability      |      75 | Every important number or claim can be traced to its data subset, filters, date range, sample size, formula or calculation, compared groups, missing-data handling, and limitations.                                                 |
| Analytical Depth               |      60 | The future teammate-owned analytical engine may cover hypotheses, tests, segmentation, relationship and temporal analysis, retry analysis, and confounder control. This specification defines presentation needs, not those methods. |
| UX for Non-Technical Merchants |      45 | Important findings are immediately understandable in merchant language, with advanced evidence available through progressive disclosure.                                                                                             |
| Technical Quality              |      30 | The delivered product runs, is maintainable and reproducible, has a clear structure, includes useful documentation and tests, and supports a professional demo.                                                                      |
| **Total**                      | **300** |                                                                                                                                                                                                                                      |

Detailed judging evidence is maintained in [`docs/product/judging-rubric.md`](docs/product/judging-rubric.md).

## 4. Core product experiences

### Merchant overview

Give the merchant an immediately understandable orientation to the selected scope and period. Summary values must come from approved backend contracts; the frontend owns hierarchy, formatting, explanation, state handling, and visual presentation, not calculation.

### Actionable insights

Lead with the most decision-relevant findings. Each insight must connect observation, supporting evidence, business meaning, and a specific recommended action. Importance and ordering may rely only on teammate-owned, validated analytical outputs.

### Evidence exploration

Let a merchant move from a simple explanation to supporting detail without losing context. Evidence should be readable rather than merely exposed as raw output.

### Traceability

Provide a clear route from every important claim to the analytical context needed to assess it. A future drawer, expandable panel, modal, evidence card, formula breakdown, or source-data summary may provide this progressive disclosure.

### Segmentation presentation

Explain teammate-defined segments in merchant language, show how they differ, and communicate implications and limitations. The frontend must not derive membership, thresholds, labels that imply unsupported meaning, or segmentation logic.

### Filters

Offer comprehensible filter controls and make active scope visible. Fatima owns filter UX; the teammate owns filter semantics, computation, and correctness. A changed filter must not leave stale claims appearing valid.

### Analytical comparison

Present validated comparisons with explicit groups, scope, period, sample sizes, and caveats. Avoid suggesting causation or fairness when the analytical output supports only association or when confounding remains material.

### Mobile experience

Support the challenge demo on mobile as well as desktop. Preserve decision hierarchy and evidence access on narrow screens rather than shrinking a desktop dashboard until it becomes unreadable.

## 5. Insight anatomy

Every production insight should eventually support this exact anatomy:

```text
Title
Observation
Evidence
Impact
Recommended Action
Traceability
Limitations
```

| Part               | Purpose                                                                             | Ownership rule                                                               |
| ------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Title              | States the decision-relevant takeaway in plain language.                            | Frontend may edit presentation language without changing analytical meaning. |
| Observation        | Describes what the validated analysis found.                                        | Analytical claim is teammate-owned; frontend explains it.                    |
| Evidence           | Supplies the concrete measure and comparison supporting the observation.            | Values, definitions, and validity are teammate-owned.                        |
| Impact             | Explains why the finding matters to the merchant.                                   | Product language must remain proportional to the evidence.                   |
| Recommended Action | Gives a practical next step connected to the finding.                               | Must not promise an outcome unsupported by evidence.                         |
| Traceability       | Reveals calculation context and provenance.                                         | Backend supplies facts; frontend supplies the experience.                    |
| Limitations        | Communicates missingness, uncertainty, scope, confounding, or other qualifications. | Must be visible and must not be softened into misleading certainty.          |

An item is not a completed insight if it is only a chart, a metric without business meaning, a recommendation without evidence, or a claim without limitations and traceability.

## 6. Traceability requirements

Every important number or claim must be able to expose:

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

Traceability is a product experience, not a footnote. At minimum:

- The user can see which data subset and date range support a claim.
- Active filters and compared groups are explicit.
- Sample size and the relevant unit of analysis are stated.
- Formula or calculation descriptions are understandable and supplied by the analytical layer.
- Missing-data handling and limitations are not hidden.
- The UI preserves the identity or version information needed to reproduce a result when that information becomes available from the backend.
- Formatting, rounding, or localization never changes the analytical meaning.

The teammate owns calculation, evidence, filter application, formula, sample size, and analytical limitations. Fatima owns the user-facing traceability structure, progressive disclosure, accessibility, and explanation.

## 7. Product requirements

These levels describe the intended product, not permission to implement teammate-owned analytical work during the foundation phase.

### Must Have

- **MUST-01 — Decision-first overview:** Present the selected merchant scope and the highest-value validated outputs in an understandable hierarchy.
- **MUST-02 — Complete insight anatomy:** Production insights support Title, Observation, Evidence, Impact, Recommended Action, Traceability, and Limitations.
- **MUST-03 — Actionability:** Each important insight contains a concrete number, clear business implication, and actionable recommendation.
- **MUST-04 — Claim traceability:** Every important number or claim exposes data subset, filters, date range, sample size, formula or calculation, compared groups, missing-data handling, and limitations.
- **MUST-05 — Honest analytical language:** Clearly distinguish association, comparison, and causal claims; never exceed the evidence supplied by the teammate-owned engine.
- **MUST-06 — Visible scope:** Make merchant, date, filter, comparison, and unit-of-analysis context visible wherever a result could otherwise be misunderstood.
- **MUST-07 — Session/attempt safety:** Label and present Payment Session and Payment Attempt as distinct concepts and never encourage accidental double counting.
- **MUST-08 — Confidential fee language:** Apply the `adjusted_fee` wording rules in Section 8 everywhere it appears.
- **MUST-09 — Limitations:** Communicate missingness, concentration, confounding, weak evidence, and other supplied limitations at the point where they affect interpretation.
- **MUST-10 — Responsive demo:** Support complete, readable desktop and mobile demonstration without horizontal page overflow.
- **MUST-11 — Accessibility:** Use semantic structure, keyboard-operable controls, visible focus, accessible labels, sufficient contrast, reasonable touch targets, and reduced-motion consideration.
- **MUST-12 — Reliable states:** Provide accessible loading, empty, error, unavailable, and stale-data states without inventing fallback analytical values.
- **MUST-13 — Reproducibility:** Document setup and preserve the analytical provenance identifiers supplied by approved contracts.
- **MUST-14 — Truthful demo content:** Never present fabricated data, metrics, or insights as real analytical output. Any temporary demonstration content is visibly labeled `Demo / Placeholder`.

### Should Have

- **SHOULD-01 — Merchant-friendly segmentation:** Explain teammate-produced segments, their relevant differences, and limitations without exposing algorithmic complexity by default.
- **SHOULD-02 — Purposeful comparisons:** Support validated time, group, or benchmark comparisons with clear bases and sample context.
- **SHOULD-03 — Persistent filter context:** Keep active scope understandable while the user moves between overview, insights, and evidence.
- **SHOULD-04 — Evidence progression:** Provide a simple insight first and an accessible “How was this calculated?” path to advanced detail.
- **SHOULD-05 — Appropriate visualization:** Select tables, charts, and text based on the decision they support; do not include decorative charts.
- **SHOULD-06 — Confidence communication:** Present teammate-supplied evidence strength or uncertainty in language a merchant can understand, without inventing a score.
- **SHOULD-07 — Share-ready explanation:** Structure insights so a merchant can later share or export a faithful explanation with its scope and caveats intact.

### Advanced

- **ADV-01 — Interactive evidence explorer:** Let advanced users inspect filters, formula descriptions, comparison groups, missingness, and limitations together.
- **ADV-02 — Merchant benchmarking:** Present analytically justified peer or cohort comparisons with concentration and confounding safeguards.
- **ADV-03 — Anomaly surfacing:** Explain teammate-validated unusual behavior and its decision relevance without treating novelty alone as importance.
- **ADV-04 — Scenario analysis:** Present clearly bounded, teammate-produced scenarios without implying forecasts are observed facts.
- **ADV-05 — Opportunity prioritization:** Visualize a validated ordering of potential actions with transparent criteria and evidence.
- **ADV-06 — Rich temporal and retry narratives:** Explain validated temporal or retry findings while preserving the Payment Session versus Payment Attempt distinction.

### Bonus

- Saved views
- Downloadable reports
- Shareable insight reports
- Confidence indicators based only on approved analytical output
- Advanced data-storytelling transitions that preserve accessibility and comprehension
- Justified dark mode
- A useful command palette
- An optional AI explanation layer only if it materially improves actionable analysis or explanation

Vercel AI SDK and AI Elements remain future options. They must not be installed or implemented merely for decoration, and the product must not add a generic chatbot simply to claim AI usage.

## 8. Data and analytical constraints

These are requirements for product correctness. They do not authorize frontend calculations or prescribe the teammate's methodology.

### Payment Session versus Payment Attempt

The dataset includes repeated payment attempts. The product and future analytical layer must explicitly distinguish:

```text
Payment Session
```

from:

```text
Payment Attempt
```

Every metric and comparison must identify its unit of analysis where ambiguity could cause accidental double counting. The teammate owns the modeling and definitions; the frontend consumes and communicates them.

### `adjusted_fee`

`adjusted_fee` is **not Zarinpal's real fee**. A constant confidential transformation has been applied.

Therefore:

- Never label `adjusted_fee` as the real Zarinpal fee.
- Absolute claims about real pricing are prohibited.
- Relative comparisons may remain meaningful only where the teammate has established that they are analytically justified.
- Labels, tooltips, exports, insight prose, and traceability views must preserve this limitation.

### Missing data

Some fields contain significant missing values. The future analytical layer must explicitly document and handle missingness. The product must show supplied missingness information and limitations where they affect interpretation; it must not silently imply complete data.

### Merchant concentration

Transaction volume is concentrated among some merchants. Future comparisons and global metrics must account for this where relevant. The UI must surface teammate-supplied concentration caveats instead of presenting a global aggregate as automatically representative.

### Confounding variables

Naive merchant-to-merchant comparisons may mislead. Future teammate-owned analysis may need to control for category, amount, attempt distribution, time, merchant characteristics, and other relevant variables. The frontend must not assert that a comparison is fair, causal, or controlled unless the approved analytical output says so.

### Dataset size and serving

The dataset may be large. The frontend must not assume it can download or process the full dataset in the browser. Pagination, filtering, aggregation, caching, and chart-series shapes require coordinated draft contracts; their backend design and computation remain teammate-owned.

## 9. UX, responsive, and accessibility principles

### Non-Technical First

Use merchant language and clear hierarchy. Do not require analytical knowledge to understand the primary takeaway.

### Insight First

Present “What happened?”, “Why does it matter?”, and “What should I do?” before raw analytical detail.

### Progressive Disclosure

Show the simple explanation first, with advanced evidence behind “How was this calculated?” or an equivalent accessible control.

### Action over Decoration

Every chart must support a decision, comparison, or explanation. If text or a compact table communicates the point more clearly, prefer it.

### Explain Limitations

Weak, incomplete, missing, concentrated, or confounded evidence must be communicated in proportion to its effect on the conclusion.

### Responsive behavior

The design must account for responsive analytics cards, responsive filters, mobile drawers, mobile-safe tables, chart resizing, touch interaction, readable typography, and no horizontal page overflow. Mobile must retain access to traceability rather than hiding it.

## 10. Technical and integration constraints

- Use React, Vite, strict TypeScript, Tailwind CSS, shadcn/ui, and TanStack Query unless a documented repository decision later requires otherwise.
- Use React Router only when routing is needed.
- Do not add a large state-management library without an evidenced need.
- Use shadcn/ui as the implementation foundation. Ant Design, IBM Carbon, Material Design, and Fluent 2 are design references, not additional component libraries.
- Avoid unnecessary dependencies, giant files, duplicated logic, `any`, silent error swallowing, and hardcoded secrets.
- Keep analytical logic and frontend rendering separate. The frontend may format, localize, explain, and visualize approved values; it must not compute business metrics owned by the analytical engine.
- Do not hide analytics logic inside UI components.
- Do not load a full high-volume dataset into the browser when a served summary or paginated contract is required.
- Treat MerchantSummary, Insight, Evidence, Recommendation, Metric, Segment, ChartSeries, and FilterState interfaces as proposals until teammate approval.
- Any contract change must explain why it is needed, identify compatibility effects, and be coordinated rather than silently implemented.
- Maintain reproducible setup, format checks, linting, typechecking, component or smoke tests, and a production build.

## 11. Current foundation phase

This phase delivers professional governance, product requirements, judging alignment, frontend architecture and design guidance, Git workflow, integration boundaries, a clean frontend scaffold, and a minimal polished application shell.

The shell may contain global layout, navigation, the application name, a placeholder merchant-intelligence route, theme tokens, responsive typography, and one representative state. It must not contain a fabricated dashboard or fake merchant findings. Temporary content must say `Demo / Placeholder`.

No backend, data pipeline, database schema, numerical calculations, or production analytics are part of this phase.

## 12. Definition of Done

### Foundation phase

The foundation is complete when:

- Repository governance and ownership boundaries are explicit and usable by future contributors and agents.
- Product vision, all five judging dimensions, insight principles, data constraints, roadmap, frontend architecture, design system, responsive approach, traceability UX, integration boundaries, and Git workflow are documented.
- All proposed shared interfaces are visibly marked `DRAFT — REQUIRES TEAMMATE APPROVAL`.
- The frontend scaffold uses strict TypeScript and contains only a minimal, polished, responsive shell with truthful placeholder labeling.
- Setup is reproducible, dependencies are explainable, and the actual install, format check, lint, typecheck, tests, and production build have been run or any environmental blocker is reported accurately.
- No teammate-owned backend, database, pipeline, analytics, calculations, or numerical tests have been implemented.

### Polished challenge submission

The submission is done when:

- A non-technical merchant can understand the most important validated finding, why it matters, and what to do next without interpreting raw data.
- Every important number and claim has accessible traceability covering subset, filters, date range, sample size, formula or calculation, compared groups, missing-data handling, and limitations.
- Payment Session and Payment Attempt are consistently distinguished, and `adjusted_fee` is never represented as the real Zarinpal fee.
- The analytical output is validated by the teammate-owned test suite and is not recomputed or contradicted by the frontend.
- Desktop and mobile demonstrations complete the core journey without overflow, blocked interactions, or missing evidence access.
- Loading, empty, error, stale, and limitation states are honest and usable.
- Accessibility expectations for semantics, keyboard use, focus, labels, contrast, touch targets, and reduced motion are met.
- Code is maintainable, tested, documented, reproducible, production-buildable, and free of hardcoded secrets or fabricated analytical claims.
- The demonstrated product visibly supports the challenge's actionability, traceability, analytical-depth, merchant-UX, and technical-quality criteria.

## 13. Supporting documents

- [Product vision](docs/product/product-vision.md)
- [Judging rubric](docs/product/judging-rubric.md)
- [Insight principles](docs/product/insight-principles.md)
- [Product roadmap](docs/product/roadmap.md)
