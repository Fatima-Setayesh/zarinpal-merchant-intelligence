# Product Roadmap

## Purpose

This roadmap records the implemented local core and the work still required for an approved, production-ready submission. Status describes repository evidence, not analytical approval, production readiness, or a transfer of ownership.

[`SPEC.md`](../../SPEC.md) remains canonical for requirements and boundaries. Roadmap placement is not authorization for Fatima or frontend agents to implement teammate-owned data, analytics, backend, or database work.

## Ownership legend

- **Fatima:** Product governance, product documentation, frontend, UI, UX, responsive behavior, accessibility, visualization, traceability UX, frontend tests, and frontend API integration
- **Teammate:** Dataset engineering, analytical definitions and calculations, statistics, segmentation and confounder logic, insight generation, backend, storage, data-serving APIs, numerical tests, and backend performance
- **Shared:** Coordinated outcome with an explicit split; each person retains ownership of their layer

All shared integration shapes remain:

```text
DRAFT — REQUIRES TEAMMATE APPROVAL
```

until explicitly approved.

## Roadmap at a glance

| Phase | Name                      | Primary ownership | Status                              | Outcome                                                                                       |
| ----: | ------------------------- | ----------------- | ----------------------------------- | --------------------------------------------------------------------------------------------- |
|     1 | Project Foundation        | Fatima            | Complete locally                    | Governance, specification, workspace, and documented ownership boundaries                     |
|     2 | Dataset Engineering       | Teammate          | Partial; approval needed            | Strict JSON and challenge `.csv.gz` ingestion exists; production operations remain open       |
|     3 | Analytical Definitions    | Teammate          | Implemented draft; approval needed  | Units, metrics, peer rules, and caveats exist with tests; semantics remain teammate-owned     |
|     4 | Backend Data Layer        | Teammate          | Local core                          | Read-only file repository and API exist; persistence, tenancy, and production controls remain |
|     5 | Merchant Overview         | Shared            | Complete locally                    | API summary is runtime-validated and presented with scope and limitations                     |
|     6 | Insight Engine            | Teammate          | Implemented draft; approval needed  | Ranked traceable insights are served; analytical approval remains open                        |
|     7 | Traceability Engine       | Teammate          | Implemented draft; approval needed  | Evidence/formula/scope/provenance payloads exist under the draft contract                     |
|     8 | Merchant Dashboard        | Fatima            | Complete locally                    | Decision-first overview and insight journey consume live API output                           |
|     9 | Segmentation              | Shared            | Implemented draft; approval needed  | Backend descriptive segments are displayed without browser-derived labels or membership       |
|    10 | Advanced Analysis         | Shared            | Partial; approval needed            | Retry, temporal, peer, and transformed-fee outputs exist; broader validation remains          |
|    11 | Traceability UX           | Fatima            | Complete locally                    | Accessible drawer preserves context and backend evidence order                                |
|    12 | Advanced Filters          | Shared            | Complete locally; contract draft    | Capability-driven controls and canonical applied scope are visible                            |
|    13 | Mobile Optimization       | Fatima            | Complete locally; device QA pending | Responsive hierarchy, drawers, charts, tables, and touch targets implemented                  |
|    14 | Performance               | Shared            | Open                                | Local measurement is recorded; representative-scale budgets/load tests remain                 |
|    15 | Testing & Correctness     | Shared            | Substantial; E2E gap                | API numerical/integration tests and frontend contract/interaction tests exist with CI         |
|    16 | Demo Preparation          | Shared            | Open                                | Production-like fixture, deployment candidate, and rehearsal remain                           |
|    17 | Advanced / Bonus Features | Shared by feature | Deferred                            | Core approval and production controls take priority                                           |
|    18 | Final UX Polish           | Fatima            | Hardened locally                    | Visual restraint, RTL accessibility, truthful states, and responsive polish completed         |

## Phase details

### 1. Project Foundation

**Owner:** Fatima  
**Teammate involvement:** Review ownership boundaries and approve shared contracts when ready

**Deliverables**

- Root governance through `SPEC.md`, `AGENTS.md`, README, repository conventions, and Git workflow
- Product vision, exact judging-rubric mapping, insight principles, roadmap, and data-correctness constraints
- Frontend architecture, design-system strategy, responsive strategy, UX principles, traceability UX, and demo checklist
- Documented frontend/backend responsibilities and draft MerchantSummary, Insight, Evidence, Recommendation, Metric, Segment, ChartSeries, and FilterState contracts
- Minimal React/Vite/strict TypeScript frontend shell using the agreed frontend foundation
- Format, lint, typecheck, frontend smoke/component test, and production-build setup

**Exit gate**

- The repository is reproducible and the minimal shell is verified on desktop and mobile.
- Implemented versus planned scope is truthful.
- All proposed contracts say `DRAFT — REQUIRES TEAMMATE APPROVAL`.
- No data pipeline, analytics, backend business logic, database schema, or fabricated merchant output has been implemented.

### 2. Dataset Engineering

**Owner:** Teammate  
**Fatima involvement:** None beyond communicating presentation and traceability needs

**Intended outcome**

- Teammate-owned cleaning, preprocessing, validation, and reproducibility work
- Explicit treatment of missing fields and repeated attempts
- A documented distinction between Payment Session and Payment Attempt
- Dataset-quality and concentration information suitable for later evidence disclosures

**Exit gate**

- The teammate confirms that prepared inputs, quality limitations, missingness treatment, and unit definitions are ready for analytical use.
- No frontend code independently processes the production dataset.

### 3. Analytical Definitions

**Owner:** Teammate  
**Fatima involvement:** Describe the definitions and context the frontend needs to display

**Intended outcome**

- Approved metric and unit definitions
- Rules for session-based versus attempt-based calculation
- Approved comparison semantics, date behavior, and filter semantics
- Correct confidentiality and interpretation rules for `adjusted_fee`
- Documented limitations, merchant-concentration concerns, and relevant confounding considerations

**Exit gate**

- Definitions are testable and ready to be served through coordinated contracts.
- Frontend copy can explain each exposed metric without redefining it.

### 4. Backend Data Layer

**Owner:** Teammate  
**Fatima involvement:** Consume approved data-serving contracts later

**Intended outcome**

- Teammate-selected backend, storage, and data-serving architecture
- Correct pagination, filtering, aggregation, and freshness behavior for a large dataset
- Stable error and availability semantics needed by frontend states
- Reproducible backend setup and performance baseline

**Exit gate**

- Approved endpoints or equivalent data-serving interfaces provide validated output and traceability metadata.
- Backend framework, ORM, database, and schema choices remain entirely teammate-owned.

### 5. Merchant Overview

**Owner:** Shared — teammate owns summary definitions, values, and serving; Fatima owns overview UX and presentation

**Intended outcome**

- Merchant and date scope are immediately clear.
- Approved summaries establish orientation without overwhelming the user.
- Loading, empty, error, stale, and unavailable states are honest.
- Responsive information hierarchy works on desktop and mobile.

**Exit gate**

- Every displayed value comes from an approved definition and contract.
- No summary business metric is computed in UI components.
- Important values expose traceability or a clear path to it.

### 6. Insight Engine

**Owner:** Teammate  
**Fatima involvement:** Define presentation requirements and later render approved outputs

**Intended outcome**

- Validated insight-generation logic
- Outputs supporting Title, Observation, Evidence, Impact, Recommended Action, Traceability, and Limitations
- Evidence-backed prioritization information where analytically justified
- Analytical tests covering important numerical and logical behavior

**Exit gate**

- Each served insight connects a concrete number, business implication, and actionable recommendation.
- Claims and recommendations remain proportional to the validated evidence.
- The frontend is not expected to reconstruct or fill gaps in an insight.

### 7. Traceability Engine

**Owner:** Teammate  
**Fatima involvement:** Specify the evidence fields and user questions the UI must support

**Intended outcome**

- Claim-level evidence with metric, formula or calculation, filters, date range, sample size, compared groups, missing-data handling, and limitations
- Provenance or version identifiers needed to reproduce important results
- Clear unit-of-analysis and `adjusted_fee` context
- Reliable associations between insight, evidence, recommendation, and analytical scope

**Exit gate**

- An important claim can be traced to a complete, validated evidence payload.
- Missing traceability is represented explicitly rather than inferred or invented.

### 8. Merchant Dashboard

**Owner:** Fatima  
**Teammate involvement:** Supply approved outputs and resolve contract questions

**Intended outcome**

- A decision-first merchant journey connecting overview, priority insights, impact, action, and evidence
- Purposeful visualization and readable information hierarchy
- Integrated loading, empty, error, stale, unavailable, and limited states
- Accessible navigation and responsive layout

**Exit gate**

- A merchant can answer what happened, why it matters, and what to do next before opening advanced detail.
- The interface contains no chart without a clear analytical purpose and no fabricated production content.

### 9. Segmentation

**Owner:** Shared — teammate owns segmentation logic, validation, membership, and analytical labels; Fatima owns visualization and explanation

**Intended outcome**

- Validated segments with definitions, evidence, scope, and limitations
- Merchant-friendly descriptions that preserve analytical meaning
- Comparisons that disclose relevant concentration, confounding, and sample context
- Responsive segment views that remain understandable without relying on color alone

**Exit gate**

- The frontend consumes segment membership and series rather than deriving them.
- Segment explanations do not imply causal or value judgments unsupported by analysis.

### 10. Advanced Analysis

**Owner:** Shared — teammate owns analysis; Fatima owns communication and visualization

**Intended outcome**

- Selected hypothesis, relationship, temporal, retry, or confounder-aware findings that materially improve merchant decisions
- Explanations that distinguish association, comparison, and causation
- Appropriate visual forms paired with a plain-language takeaway and limitations
- Retry analysis that preserves the Payment Session versus Payment Attempt distinction

**Exit gate**

- Each advanced finding is validated, traceable, understandable, and connected to a business implication or action.
- Complexity is justified by decision value, not novelty alone.

### 11. Traceability UX

**Owner:** Fatima  
**Teammate involvement:** Supply and validate all analytical evidence content

**Intended outcome**

- A progressive-disclosure experience such as “How was this calculated?”
- A coherent evidence hierarchy spanning metric, formula, filters, date, sample, compared groups, missingness, and limitations
- Accessible drawer, panel, modal, evidence card, or other pattern selected for the user context
- Mobile access to the same material evidence available on desktop

**Exit gate**

- A user can move from claim to complete evidence and back without losing context.
- Keyboard, focus, labels, touch targets, and responsive reading order are verified.

### 12. Advanced Filters

**Owner:** Shared — Fatima owns filtering UX; teammate owns filter definitions, computation, validation, and backend behavior

**Intended outcome**

- Clear advanced scope selection without exposing implementation detail
- Active filters summarized near affected claims
- Coordinated pagination, query, cache, and stale-result behavior
- Responsive controls using mobile drawers or other appropriate patterns

**Exit gate**

- Filter changes cannot leave old claims appearing current.
- URLs or saved state preserve only supported semantics.
- The frontend sends approved filter inputs and never reproduces backend filtering logic.

### 13. Mobile Optimization

**Owner:** Fatima  
**Teammate involvement:** Ensure serving behavior supports mobile network and payload needs

**Intended outcome**

- Responsive insight cards, filters, tables, charts, evidence interactions, and navigation
- Touch-friendly controls, readable typography, and no horizontal page overflow
- Deliberate alternatives for wide comparisons or dense tables
- Reduced-motion and constrained-network consideration

**Exit gate**

- The complete core journey works at agreed mobile and desktop viewports.
- Mobile retains the action, limitation, and traceability content necessary for a responsible decision.

### 14. Performance

**Owner:** Shared — Fatima owns frontend performance; teammate owns backend, data, and analytical performance

**Intended outcome**

- Efficient query and payload use appropriate to a high-volume dataset
- Responsive route, interaction, chart, and evidence rendering
- Backend pagination, filtering, aggregation, and caching chosen and measured by the teammate
- No full production-dataset processing or business aggregation in the browser

**Exit gate**

- Agreed representative scenarios meet jointly documented performance expectations.
- Optimizations preserve accuracy, traceability, accessibility, and freshness semantics.

### 15. Testing & Correctness

**Owner:** Shared — each owner tests their layer

**Intended outcome**

- Teammate-owned numerical, analytical, data-quality, API, and backend performance tests
- Fatima-owned component, interaction, accessibility, responsive, contract-consumption, and frontend smoke tests
- End-to-end checks for scope changes, insight rendering, traceability, and failure states
- Verified format, lint, typecheck, tests, and production builds

**Exit gate**

- Important numerical outputs pass teammate validation.
- Frontend tests prove that approved values and limitations are presented faithfully.
- No verification claim is made without executing the corresponding command or check.

### 16. Demo Preparation

**Owner:** Shared — Fatima owns product narrative and frontend readiness; teammate owns data and analytical readiness

**Intended outcome**

- A rubric-aligned story covering actionability, traceability, analytical depth, merchant UX, and technical quality
- Stable, approved demo scope and realistic execution path
- Desktop and mobile rehearsals
- Honest handling of unavailable services, data limitations, and any remaining planned work
- Reproducible setup and a concise recovery plan for demo risks

**Exit gate**

- The demo proves a full evidence-to-action journey and opens complete traceability for an important claim.
- All shown analytical output is approved; no `Demo / Placeholder` content is mistaken for a real result.

### 17. Advanced / Bonus Features

**Owner:** Shared by feature; see the bonus backlog below

**Intended outcome**

- Add only differentiators that strengthen a real merchant decision, evidence understanding, or workflow.
- Evaluate complexity, analytical dependency, accessibility, performance, and demo value before implementation.
- Keep AI optional and purposeful.

**Exit gate**

- Core insight, traceability, responsive, testing, and demo journeys are already sound.
- Each selected bonus has an explicit user benefit and an owner for both analytical truth and presentation.

### 18. Final UX Polish

**Owner:** Fatima  
**Teammate involvement:** Reconfirm that copy and formatting preserve approved analytical meaning

**Intended outcome**

- Consistent hierarchy, spacing, typography, states, terminology, and interaction behavior
- Final accessibility, keyboard, focus, contrast, touch, motion, and responsive review
- Concise merchant language with no unsupported claims or hidden limitations
- Polished chart annotation and traceability transitions where they improve comprehension

**Exit gate**

- Desktop and mobile feel coherent and demo-ready.
- Final copy respects Payment Session versus Payment Attempt, `adjusted_fee`, missingness, concentration, confounding, and causal-language constraints.
- Polish has not introduced analytical drift, inaccessible interaction, or decorative complexity.

## Complete bonus backlog

These ideas must remain visible even when they are not selected for the first implementation.

| Idea                                   | Merchant value                                                    | Ownership split                                                                                    | Adoption guardrail                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Saved views                            | Return to a useful filter and comparison context                  | Fatima owns UX; teammate owns any persisted backend semantics                                      | Save only approved filter state and make stale or changed definitions visible                                                                         |
| Merchant benchmarking                  | Understand performance relative to a meaningful peer group        | Teammate owns cohort definition and comparison validity; Fatima owns explanation and visualization | Use only analytically justified peers and disclose concentration, confounding, sample, and scope                                                      |
| Anomaly surfacing                      | Bring unusual behavior to attention sooner                        | Teammate owns detection and validation; Fatima owns prioritization presentation                    | Unusual must not automatically mean important, causal, or actionable                                                                                  |
| Downloadable reports                   | Support offline review and operational follow-through             | Shared: teammate supplies correct export data; Fatima owns report structure and UX                 | Preserve filters, date, units, provenance, `adjusted_fee` caveat, and limitations                                                                     |
| Shareable insight reports              | Communicate a finding and recommendation with context intact      | Shared: teammate supplies evidence; Fatima owns share experience                                   | Never separate a claim from its scope, traceability, and limitations                                                                                  |
| Interactive evidence explorer          | Let advanced users inspect how a finding was produced             | Teammate supplies complete evidence; Fatima owns interaction                                       | Progressive disclosure must remain accessible and must not expose misleading raw fragments                                                            |
| Scenario analysis                      | Explore bounded possibilities and decisions                       | Teammate owns scenario model and assumptions; Fatima owns controls and explanation                 | Label scenarios as modeled, not observed facts or guarantees                                                                                          |
| Opportunity prioritization             | Focus attention on the actions with the strongest validated case  | Teammate owns criteria and calculation; Fatima owns hierarchy and explanation                      | No frontend-created score, expected value, or confidence                                                                                              |
| Confidence indicators                  | Help merchants calibrate attention and caution                    | Teammate owns definition and value; Fatima owns understandable presentation                        | Avoid invented percentages, false precision, or color-only encoding                                                                                   |
| Accessibility improvements             | Extend usability beyond the required baseline                     | Fatima, with feedback from users and automated/manual testing                                      | Baseline semantic, keyboard, focus, label, contrast, touch, and reduced-motion support is not deferred to bonus                                       |
| Dark mode if justified                 | Improve comfort in relevant use contexts                          | Fatima                                                                                             | Add only with adequate contrast, chart parity, test coverage, and no distraction from core work                                                       |
| Command palette if useful              | Speed navigation and repeated actions for experienced users       | Fatima                                                                                             | Add only when real commands exist; preserve discoverability and keyboard accessibility                                                                |
| Advanced data-storytelling transitions | Clarify state, scope, or comparison changes                       | Fatima                                                                                             | Motion must communicate meaning, respect reduced-motion preferences, and never conceal loading or data changes                                        |
| Optional AI explanation layer          | Improve explanation or guided interpretation of validated results | Shared: teammate safeguards analytical grounding; Fatima owns experience                           | Consider Vercel AI SDK or AI Elements only for a proven use case; no generic chatbot, decorative AI, invented claims, or replacement for traceability |

## Prioritization rule

Select roadmap work in this order:

1. Correctness and ownership safety
2. Actionable merchant value
3. Traceability and honest limitations
4. Non-technical comprehension and accessibility
5. Responsive, reliable execution
6. Technical maintainability and performance
7. Differentiation and bonus value

An advanced feature should not displace an incomplete core insight, traceability gap, mobile failure, or correctness risk.
