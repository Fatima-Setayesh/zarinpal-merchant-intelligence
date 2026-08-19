# Repository Agent Guide

This file is the operational contract for Codex and other coding agents working in this repository. The product specification in [`SPEC.md`](SPEC.md) is the canonical source for product intent and acceptance criteria.

## Ownership boundaries

### Fatima-owned scope

- Root project governance and project-level conventions
- Frontend architecture and implementation
- UI, UX, responsive behavior, and accessibility
- Data storytelling and visualization presentation
- User-facing traceability experience
- Product documentation and design-system decisions
- Frontend tests and frontend API integration

### Teammate-owned scope

- Backend and data-serving API implementation
- Dataset engineering, cleaning, and preprocessing
- Payment Session versus Payment Attempt modeling
- Analytical definitions, calculations, statistics, and hypothesis testing
- Segmentation, confounder control, and insight-generation logic
- Database and storage strategy
- Numerical correctness, analytical tests, and backend performance

Codex must not cross these boundaries unless the relevant owner explicitly instructs it to do so. Describing a frontend dependency is allowed; implementing teammate-owned internals is not.

## Required workflow for every task

1. Inspect repository and working-tree state.
2. Read this `AGENTS.md` completely.
3. Read the relevant sections of `SPEC.md` completely.
4. Confirm the current branch and understand any existing changes.
5. Inspect every file relevant to the requested change.
6. Make the smallest coherent change that satisfies the request.
7. Preserve unrelated work and do not modify files outside the task.
8. Run the checks proportional to the change.
9. Report the exact files modified and checks actually run.

Never commit, push, rewrite history, change `origin`, or create releases unless the user explicitly asks.

## Product guardrails

- This is a Merchant Decision Intelligence Platform, not a generic analytics dashboard.
- Preserve the product path: **Raw Data → Evidence → Insight → Business Impact → Recommended Action → Traceability**.
- Every important claim must ultimately be traceable to its data subset, filters, date range, sample size, calculation or formula, compared groups, missing-data handling, and limitations.
- Never present fake data as real analytical output. Demonstration-only content must be visibly labeled `Demo / Placeholder`.
- Do not calculate business metrics in the frontend or hide analytics logic in UI components.
- Distinguish a **Payment Session** from a **Payment Attempt**; never imply they are interchangeable.
- `adjusted_fee` is a confidentially transformed field, **not Zarinpal's real fee**. Do not use it for absolute real-pricing claims. Relative comparisons require analytical justification from the teammate-owned layer.
- Missing data, merchant concentration, and confounding limitations must remain visible when relevant.

## Architecture rules

- Keep TypeScript strict and avoid `any`.
- Prefer small, cohesive modules over giant files.
- Do not duplicate logic or introduce dependencies without a current, explainable need.
- Do not add placeholder production functionality, silent error swallowing, or hardcoded secrets.
- Keep server-state access behind TanStack Query and feature-level integration functions when APIs exist.
- Keep business calculations and analytical transformations outside UI components and outside the frontend.
- Use semantic HTML, keyboard-accessible interactions, visible focus, sufficient contrast, useful labels, touch-safe targets, and reduced-motion behavior.
- Use shadcn/ui source components as the implementation foundation. Ant Design, IBM Carbon, Material Design, and Fluent 2 are design references only; do not mix their component libraries into the application.
- Add React Router only when the product has more than one meaningful route. Add a state-management library only when demonstrated state complexity justifies it.
- Do not add Vercel AI SDK, AI Elements, or a chatbot unless a future approved feature clearly improves actionable analysis or explanation.

## Shared contract rules

All contracts in [`docs/integration/draft-contracts.md`](docs/integration/draft-contracts.md) are proposals and must remain marked:

> **DRAFT — REQUIRES TEAMMATE APPROVAL**

Codex must not silently change any shared:

- Insight schema
- Evidence schema
- Metric schema
- Segment schema
- Chart data schema
- Pagination contract
- Filtering contract

If a contract change is needed:

1. Explain the frontend need and compatibility impact.
2. Propose the change in the draft contract documentation.
3. Identify presentation-owned and analytical/backend-owned fields.
4. Obtain teammate approval before treating it as final or implementing an incompatible integration.

## Verification expectations

For frontend changes, run the relevant subset of:

```text
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Run the full set before a demo-ready merge. Report failures or environment constraints honestly; never claim a check passed unless it ran successfully.
