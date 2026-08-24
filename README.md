<div align="center">

# Zarinpal Merchant Intelligence

### Payment evidence, translated into confident merchant decisions.

[![React](https://img.shields.io/badge/React-19-20232a?style=for-the-badge&logo=react&logoColor=61DAFB)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev/)
[![pnpm](https://img.shields.io/badge/pnpm-11-F69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)

![Merchant intelligence hero](docs/assets/readme-hero.png)

**[Product vision](docs/product/product-vision.md) · [Architecture](docs/frontend/frontend-architecture.md) · [Roadmap](docs/product/roadmap.md) · [Specification](SPEC.md)**

</div>

A decision-intelligence product that turns validated payment evidence into merchant-facing observations, business impact, recommended actions, and traceability.

```text
Payment data → Evidence → Insight → Business impact → Action → Traceability
```

The browser is a presentation layer. Session construction, metrics, ranking, recommendations, segmentation, filtering semantics, and analytical prose come from the API; the UI validates and displays those outputs without recomputing or silently rewriting them.

![Evidence to action product loop](docs/assets/decision-loop.svg)

## Current status

Implemented locally:

- a strict, dependency-light Node.js API for validated JSON and challenge `.csv.gz` ingestion;
- explicit Payment Session and Payment Attempt models;
- merchant summaries, backend-ranked insights, daily trends, descriptive segments, filter capabilities, canonical applied filters, and traceability metadata;
- a responsive Persian/RTL React dashboard with independent loading/error states, accessible tabs and drawers, safe theme persistence, and mobile layouts;
- runtime validation at the untrusted API boundary; invalid success payloads fail closed;
- truthful null, missing-data, transformed-fee, limitation, provenance, and analysis-unit presentation;
- strict TypeScript, ESLint, Prettier, Vitest, production builds, and a least-privilege CI workflow.

Still required before a production deployment:

- teammate approval of the shared contracts and every teammate-owned analytical semantic;
- production dataset operating procedures, persistence/streaming decisions, tenant authorization, rate/concurrency controls, monitoring, and deployment ownership;
- a server-side or gateway authentication topology—never a long-lived bearer token in the Vite bundle;
- representative-scale performance targets and load tests;
- final browser/device and assistive-technology acceptance testing against the deployment candidate.

No production dataset or fabricated merchant output is bundled. Without `PAYMENTS_DATA_PATH`, the API reports a degraded state and data endpoints return `503 DATA_UNAVAILABLE`.

## Product tour

![Dashboard feature tour](docs/assets/product-tour.svg)

| Experience              | What the merchant gets                                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| **Decision brief**      | The current status, highest-priority problem, opportunity, and first action before any chart. |
| **Merchant overview**   | Session-safe KPIs with explicit analytical units and direct evidence access.                  |
| **Actionable insights** | Observation → evidence → business impact → recommended action → limitations.                  |
| **Evidence story**      | One purposeful, keyboard-readable trend instead of decorative visualization.                  |
| **Segment comparison**  | Merchant-friendly comparisons that keep sample context and caveats visible.                   |
| **Traceability drawer** | Formula, scope, filters, period, sample size, missingness, provenance, and limitations.       |
| **Advanced filters**    | Clear scope controls on desktop and a touch-friendly drawer on smaller screens.               |

## Product guardrails

- A Payment Session and Payment Attempt are different analysis units. Repeated attempts must not inflate session metrics.
- `adjusted_fee` is confidentially transformed and is not Zarinpal’s real fee. Absolute fee, pricing, cost, or revenue claims are prohibited.
- Missingness, concentration, comparison populations, and possible confounders remain visible when the API supplies them.
- An absent insight is not evidence of stability, health, confidence, or lack of opportunity.
- Chart minima/maxima are descriptive points, not anomalies unless the backend explicitly supplies anomaly semantics.
- Shared contracts remain `DRAFT — REQUIRES TEAMMATE APPROVAL` until explicitly approved.

## Architecture

```text
apps/web
  React 19 + Vite + strict TypeScript + Tailwind CSS
  TanStack Query → validated fetch boundary → same-origin /api/v1 by default

apps/api
  Node.js HTTP server + strict TypeScript
  read-only file repository → validated sessions → analytical service → JSON API
```

There is one meaningful web surface, so no router or global state library is used. Charts use accessible native SVG plus a data table; no chart dependency is needed. The production API default is same-origin `/api/v1`; local development defaults to `http://localhost:3000/api/v1`.

See [frontend architecture](docs/frontend/frontend-architecture.md), [integration boundaries](docs/integration/frontend-backend-boundaries.md), and the [browser/API deployment decision](docs/integration/browser-api-deployment.md).

## Repository structure

```text
.
├── apps/
│   ├── api/                    # storage, domain, analytics, HTTP API, tests
│   └── web/
│       └── src/
│           ├── app/            # providers and product error boundary
│           ├── components/ui/  # small source-owned primitives
│           └── features/merchant-intelligence/
│               ├── api/        # types, runtime schemas, client, queries
│               ├── components/ # dashboard presentation and interactions
│               └── model/      # display formatting, scope serialization, theme
├── docs/                       # product, frontend, integration, workflow, audits
├── AGENTS.md                   # ownership and agent rules
└── SPEC.md                     # canonical product specification
```

## Local setup

Prerequisites: Node.js 22+ and pnpm 11+.

```bash
pnpm install --frozen-lockfile
```

Configure and start the API:

```bash
cp apps/api/.env.example apps/api/.env
pnpm dev:api
```

`PAYMENTS_DATA_PATH` must point to a supported JSON or challenge `.csv.gz` source. Environment files are not loaded by the development script automatically; export the values in your shell or use Node’s `--env-file` with a built server. See [apps/api/README.md](apps/api/README.md).

Start the web app in a second terminal:

```bash
pnpm dev
```

For ordinary local development, no web environment variable is required. Set `VITE_API_BASE_URL` only when the API is intentionally at a different HTTP(S) origin or path. Never put `API_AUTH_TOKEN` or another secret in a `VITE_*` variable. On Windows systems that block PowerShell shims, use `pnpm.cmd`.

## Verification

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
# or all gates in order
pnpm check
```

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `pnpm dev`          | Start the Vite development server.        |
| `pnpm dev:api`      | Start the API in watch mode.              |
| `pnpm format`       | Apply repository formatting.              |
| `pnpm format:check` | Check formatting without writes.          |
| `pnpm lint`         | Lint both packages with zero warnings.    |
| `pnpm typecheck`    | Typecheck production and test TypeScript. |
| `pnpm test`         | Run API and frontend suites once.         |
| `pnpm build`        | Build API and frontend artifacts.         |
| `pnpm check`        | Run every required local quality gate.    |

CI runs the frozen install and `pnpm check` on pull requests and pushes to `main`.

## Ownership

Fatima owns product governance and docs, frontend architecture and implementation, UI/UX, responsive/accessibility behavior, visualization presentation, traceability UX, frontend tests, and frontend/API integration.

The teammate owns dataset engineering, session/attempt semantics, analytical definitions and formulas, statistics, segmentation/confounder logic, insight generation, backend/storage choices, numerical tests, and backend performance. This hardening pass does not change those semantics; backend audit findings are proposals marked for teammate approval.

## Documentation

- [Product specification](SPEC.md)
- [Product roadmap](docs/product/roadmap.md)
- [Judging rubric](docs/product/judging-rubric.md)
- [Frontend architecture](docs/frontend/frontend-architecture.md)
- [Traceability UX](docs/frontend/traceability-ux.md)
- [Draft contracts](docs/integration/draft-contracts.md)
- [Browser/API deployment decision](docs/integration/browser-api-deployment.md)
- [Hardening audit](docs/audits/merchant-intelligence-hardening.md)
- [Git workflow](docs/workflow/git-workflow.md)
