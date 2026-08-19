# Zarinpal Merchant Intelligence

A **Merchant Decision Intelligence Platform** for the Zarinpal Challenge. The product is designed to turn payment evidence into understandable business implications and recommended actions while keeping every important claim traceable.

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

This is not a generic analytics dashboard. A chart only belongs in the product when it helps a merchant understand or act on validated evidence.

## Current status

### Implemented

- Project governance through `SPEC.md` and `AGENTS.md`
- Product, judging, frontend, integration, responsive, and workflow documentation
- A pnpm workspace with one React frontend in `apps/web`
- Vite, strict TypeScript, Tailwind CSS, shadcn/ui-compatible tokens/components, and TanStack Query foundations
- A responsive, accessible application shell and clearly labeled `Demo / Placeholder` state
- ESLint, Prettier, Vitest, Testing Library, type-check, and production-build scripts
- An ownership-only `apps/api/README.md`; it contains no backend implementation

### Planned

- Teammate-owned dataset engineering, analytical definitions, backend, and data-serving APIs
- Merchant overview and actionable insight experiences
- Teammate-validated evidence, metrics, filters, comparisons, and segment data
- Traceability drawers or evidence panels backed by approved contracts
- Purposeful visualizations, advanced filters, mobile optimization, and demo polish
- Advanced and bonus work documented in the [product roadmap](docs/product/roadmap.md)

No data pipeline, backend, database, analytical calculation, merchant metric, or generated insight is implemented in this foundation.

## Challenge priorities

The 300-point judging model drives the product architecture:

| Dimension                      | Points | Product response                                                          |
| ------------------------------ | -----: | ------------------------------------------------------------------------- |
| Actionability and Novelty      |     90 | Pair a concrete, validated number with a business implication and action. |
| Accuracy and Traceability      |     75 | Expose methodology, scope, sample, missingness, and limitations.          |
| Analytical Depth               |     60 | Reserve rigorous analysis for the teammate-owned analytical layer.        |
| UX for Non-Technical Merchants |     45 | Explain what happened, why it matters, and what to do next first.         |
| Technical Quality              |     30 | Keep setup reproducible, code maintainable, and ownership explicit.       |

See [`SPEC.md`](SPEC.md) for the complete requirements and definition of done.

## Architecture and stack

The repository uses a deliberately small pnpm workspace. It leaves room for teammate-owned backend work without choosing that architecture on their behalf.

- React 19 for the UI
- Vite for local development and production bundling
- Strict TypeScript for application and configuration code
- Tailwind CSS v4 for semantic, responsive styling
- shadcn/ui-compatible source components and CSS-variable design tokens
- TanStack Query for the future server-state boundary
- ESLint and Prettier for static quality and formatting
- Vitest, Testing Library, and jsdom for frontend tests

React Router is intentionally absent because the current shell has one meaningful page. No general-purpose client state library, charting library, AI SDK, or backend dependency has been added.

## Repository structure

```text
.
├── AGENTS.md
├── SPEC.md
├── README.md
├── apps/
│   ├── api/
│   │   └── README.md
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   ├── components/
│       │   │   ├── shared/
│       │   │   └── ui/
│       │   ├── lib/
│       │   ├── routes/
│       │   ├── styles/
│       │   └── test/
│       └── components.json
└── docs/
    ├── frontend/
    ├── integration/
    ├── product/
    └── workflow/
```

Only useful files are present; empty feature directories are deferred until real implementation work begins.

## Setup

Prerequisites:

- Node.js 22 or newer
- pnpm 11 or newer

Install and start the frontend:

```bash
pnpm install
pnpm dev
```

On Windows systems that block PowerShell script shims, use `pnpm.cmd` in the same commands.

The Vite development server prints its local URL after startup.

## Scripts

| Command             | Purpose                                                     |
| ------------------- | ----------------------------------------------------------- |
| `pnpm dev`          | Run the web development server.                             |
| `pnpm format`       | Format supported repository files.                          |
| `pnpm format:check` | Verify formatting without writing.                          |
| `pnpm lint`         | Run frontend ESLint checks.                                 |
| `pnpm typecheck`    | Run strict TypeScript checks.                               |
| `pnpm test`         | Run frontend tests once.                                    |
| `pnpm build`        | Type-check and create the production bundle.                |
| `pnpm check`        | Run format, lint, type-check, tests, and build in sequence. |

## Team ownership

### Fatima

Owns project governance, product documentation, frontend architecture and implementation, UI/UX, responsive and accessible behavior, design system, data storytelling, visualization presentation, traceability UX, frontend tests, and frontend API integration.

### Teammate

Owns dataset engineering and cleaning, Payment Session versus Payment Attempt modeling, analytical calculations and statistics, hypothesis testing, segmentation and confounder control, insight generation, backend and APIs, database/storage choices, numerical tests, and backend performance.

Draft contracts describe what the frontend needs; they do not define or implement teammate-owned analytical behavior.

## Correctness guardrails

- A **Payment Session** and a **Payment Attempt** are distinct analytical units. Future integrations must avoid accidental double counting.
- `adjusted_fee` is **not Zarinpal's real fee**. A confidential constant transformation has been applied, so absolute real-pricing claims are prohibited. Relative comparisons are only suitable when analytically justified.
- Missingness, merchant concentration, and potential confounders must be handled in the teammate-owned analysis and disclosed in the frontend.
- Every important number or claim must eventually expose its subset, filters, date range, sample size, formula, compared groups, missing-data handling, and limitations.

## Development workflow

- `main` is stable and demo-ready.
- `integration` is the combined frontend/backend integration branch.
- Focused feature branches merge into `integration`; validated integration later merges into `main`.

Read the [Git workflow](docs/workflow/git-workflow.md) before branching. Agents must also read [`AGENTS.md`](AGENTS.md) before changing the repository.

## Documentation map

- [Product specification](SPEC.md)
- [Product vision](docs/product/product-vision.md)
- [Judging rubric](docs/product/judging-rubric.md)
- [Insight principles](docs/product/insight-principles.md)
- [Product roadmap](docs/product/roadmap.md)
- [Frontend architecture](docs/frontend/frontend-architecture.md)
- [Design system](docs/frontend/design-system.md)
- [UX principles](docs/frontend/ux-principles.md)
- [Traceability UX](docs/frontend/traceability-ux.md)
- [Responsive strategy](docs/frontend/responsive-strategy.md)
- [Demo checklist](docs/frontend/demo-checklist.md)
- [Frontend/backend boundaries](docs/integration/frontend-backend-boundaries.md)
- [Draft contracts](docs/integration/draft-contracts.md)
- [Git workflow](docs/workflow/git-workflow.md)

## Roadmap

The roadmap preserves foundation, data and analytical work, backend integration, merchant experiences, traceability, segmentation, advanced analysis, filters, mobile optimization, performance, correctness, demo preparation, bonus capabilities, and final UX polish. Ownership and exit gates are documented in the [roadmap](docs/product/roadmap.md).
