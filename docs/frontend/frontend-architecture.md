# Frontend Architecture

## Purpose and status

This document defines the frontend foundation for the Merchant Decision Intelligence Platform. It is an implementation guide for the initial `apps/web` scaffold and future frontend work; it does not define backend, data, or analytical internals.

The product flow is the governing architectural rule:

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

The frontend presents and explains this flow. It must not calculate the analytical results that power it.

## Scope boundaries

The frontend owns:

- application composition, navigation, and responsive layout;
- accessible presentation of merchant summaries, insights, evidence, segments, filters, and charts;
- interaction state, display formatting, progressive disclosure, and traceability UX;
- frontend API integration, loading/error/empty states, and frontend tests.

The teammate-owned analytical and backend systems own:

- cleaning, aggregation, statistical analysis, metric definitions, and numerical correctness;
- session-versus-attempt modeling, segmentation, confounder control, and insight generation;
- database choices, backend business logic, filtering computation, and chart series generation.

Shared data contracts remain drafts until both owners approve them. Frontend code must not compensate for a missing contract by quietly recreating analytics in the browser.

## Foundation decisions

| Concern            | Decision                                              | Reason                                                                                            |
| ------------------ | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Repository layout  | A small pnpm workspace with the web app at `apps/web` | Leaves a clear team boundary without creating premature shared packages                           |
| Runtime            | Client-side React application built by Vite           | Fast feedback and a small operational surface for the hackathon                                   |
| Language           | TypeScript in strict mode                             | Makes integration assumptions visible and reduces unsafe UI states                                |
| Styling            | Tailwind CSS v4 with semantic CSS-variable tokens     | Supports responsive composition while keeping theme decisions centralized                         |
| Components         | shadcn/ui source components, added only when used     | Accessible primitives remain inspectable and adaptable without a second component system          |
| Server state       | TanStack Query                                        | Gives API state explicit caching, cancellation, loading, and error behavior                       |
| Local state        | React state and reducers close to their consumers     | Avoids a global state library before a demonstrated need exists                                   |
| Routing            | No router in the one-page foundation                  | React Router should be added only when multiple navigable views create a real routing requirement |
| Package management | pnpm with one root lockfile                           | Reproducible installs and simple workspace scripts                                                |

No charting library, form framework, global state manager, AI SDK, or HTTP wrapper belongs in the foundation without an implemented use case. Native `fetch` is sufficient behind a typed query function when an approved API exists. Vercel AI SDK and AI Elements remain optional bonus-roadmap tools, not decorative dependencies.

## Runtime composition

```text
main.tsx
└── application providers
    ├── TanStack Query provider
    └── application shell
        └── current page or route
            └── feature composition
                ├── shared presentation components
                ├── shadcn/ui primitives
                └── typed integration functions
```

Providers must be few and purposeful. New cross-cutting providers require a documented consumer and lifecycle; they must not become a substitute for ordinary component composition.

## Source organization

The initial scaffold should create only directories that contain working code:

```text
apps/web/src/
├── app/                 # root component and application providers
├── components/
│   ├── shared/          # product-aware reusable presentation
│   └── ui/              # shadcn/ui source components
├── lib/                 # framework utilities and query-client setup
├── routes/              # current page-level composition
├── styles/              # global Tailwind import and design tokens
└── test/                # test environment setup
```

Create a `features/<feature-name>` directory only when a real feature has components, hooks, queries, or tests to colocate. Likely future feature boundaries include merchant overview, insights, traceability, segments, and filters, but empty folders do not establish architecture.

Create shared `types` only after a contract has been reviewed. Until then, proposed interfaces belong in `docs/integration/draft-contracts.md` and must be marked **DRAFT — REQUIRES TEAMMATE APPROVAL**.

## Component and dependency rules

- Keep page components focused on composition; move reusable behavior to a feature or shared component.
- Keep shadcn/ui files close to their generated structure. Product-specific policy belongs in wrappers or feature components rather than broad edits to every primitive.
- Prefer composition over large configurable components and avoid files that combine data access, analytical interpretation, layout, and interaction.
- Do not use `any`. At an untrusted boundary, accept `unknown` and validate or narrow it deliberately.
- Do not duplicate query keys, formatting rules, state labels, or accessibility behavior.
- Do not add a dependency for behavior available clearly through React, the platform, or an existing dependency.
- Never hide analytics or metric calculations inside JSX, hooks, formatters, or chart adapters.

## Data and state flow

Once an API contract is approved, the expected flow is:

1. The user changes a frontend-owned control such as a date range or merchant filter.
2. The frontend validates the interaction state and maps it to approved request parameters.
3. A feature query creates a stable query key and calls the typed integration function.
4. The backend performs filtering and analytical computation and returns approved display data plus traceability metadata.
5. The frontend renders success, loading, empty, partial, or error states without inventing missing values.
6. Evidence and limitations remain reachable from the insight that they support.

TanStack Query conventions:

- define query keys in the owning feature, not inline throughout the component tree;
- pass the query `AbortSignal` to network requests so obsolete requests can be cancelled;
- set cache and retry behavior intentionally according to endpoint behavior;
- keep network calls outside presentation components;
- treat loading, background refresh, empty results, partial evidence, and failures as different UI states;
- do not seed the production cache with fabricated analytical data.

Local ephemeral state—open panels, selected tabs, and disclosure state—stays near the UI. Share state only when multiple distant consumers actually require it. When routing is introduced, durable navigation state such as shareable filters should be considered for the URL, subject to the approved filtering contract.

## Integration behavior

The frontend may format backend-owned values for locale, readability, and visual hierarchy, but it may not redefine them. In particular:

- a payment session and a payment attempt must remain explicitly distinguishable;
- `adjusted_fee` must never be described as Zarinpal's real fee;
- missing-data handling and limitations supplied by the analytical layer must remain visible;
- comparisons must not imply causation or fairness beyond the supplied methodology;
- charts consume backend-approved series and do not derive business metrics in the browser.

Contract changes to insights, evidence, metrics, segments, chart data, pagination, or filtering require an explicit proposal and teammate approval before incompatible code is introduced.

## Routing decision

The foundation has one product surface, so a router would add lifecycle and test surface without user value. Add React Router when there are at least two genuinely navigable views, deep links are required, or browser history must represent product state. At that point, document route ownership, not-found behavior, error boundaries, and which filter state is safe to encode in URLs.

## Quality gates

The web package must expose scripts for:

- linting with zero warnings;
- strict TypeScript checking;
- deterministic unit/component tests with Vitest and Testing Library;
- a production Vite build.

The workspace must also expose Prettier write and check scripts. The initial smoke test should render the application through its real providers and assert the application identity and explicit `Demo / Placeholder` state. It must not require an API or assert invented merchant metrics.

Future feature tests should prioritize user-observable behavior, keyboard interaction, state transitions, contract mapping, and traceability access. Numerical correctness remains covered by teammate-owned analytical tests.

## Accessibility, resilience, and performance

- Use semantic landmarks and heading order before adding ARIA.
- Preserve visible focus, keyboard operation, accessible names, adequate contrast, and touch targets.
- Honor reduced-motion preferences and never make animation necessary to understand a result.
- Reserve space for loading content to reduce layout shifts.
- Keep the initial bundle small; lazy-load genuinely heavy secondary experiences after routing or evidence exploration warrants it.
- Show recoverable errors with context and a safe retry path. Do not silently swallow failures.
- Keep confidential values, secrets, and privileged logic out of the client bundle.

Responsive and traceability-specific rules are defined in [responsive-strategy.md](./responsive-strategy.md) and [traceability-ux.md](./traceability-ux.md).
