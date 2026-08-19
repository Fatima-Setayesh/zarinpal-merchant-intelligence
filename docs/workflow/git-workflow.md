# Git Workflow

## Branch roles

### `main`

`main` contains stable, reviewed, demo-ready code only. It is the source for a hackathon submission or live demonstration. Direct feature work should not happen on `main`.

### `integration`

`integration` is the shared branch where reviewed frontend and teammate-owned backend/data work are combined and exercised together. Feature branches merge into `integration`. Once the combined result is stable and demo-ready, `integration` merges into `main`.

```text
feature/fix/docs branch
          ↓
     integration
          ↓
        main
```

The arrows describe pull-request flow; they do not authorize automatic pushes or merges.

## Working branches

- Start a coherent task from the latest appropriate shared base, normally `integration` after it exists.
- Keep a branch focused on one owned concern and make the smallest coherent change.
- Reconcile integration conflicts on the feature branch; do not rewrite shared branch history.
- Open a pull request into `integration`, run the relevant checks, and request review from the affected owner.
- Promote `integration` to `main` only after combined frontend/backend verification and a demo-readiness review.
- Do not force-push shared branches, rewrite shared history, change `origin`, or commit/push on someone else's behalf without explicit instruction.

For the initial clean repository bootstrap, `feat/project-foundation` is the single foundation branch. The branch examples below are guidance only and should be created only when that work begins.

## Recommended Fatima-owned branches

```text
feat/project-foundation
docs/spec-agent-rules
feat/frontend-app-shell
feat/merchant-dashboard
feat/insight-cards
feat/traceability-ui
feat/merchant-filters
feat/segment-visualization
feat/mobile-dashboard
feat/frontend-polish
fix/frontend-responsive
```

These branches cover project governance, product documentation, frontend architecture and implementation, UI/UX, responsive behavior, traceability presentation, visualization, and frontend tests.

## Recommended teammate-owned branches

```text
feat/data-pipeline
feat/analytics-engine
feat/merchant-segmentation
feat/insight-engine
feat/traceability-engine
feat/backend-api
fix/analytics-correctness
```

These are collaboration guidance only. Fatima or Codex must not create or implement them on the teammate's behalf unless explicitly instructed by the teammate/owner.

## Pull request expectations

Each pull request should state:

- The owned problem and scope.
- Exact files and user-visible behavior changed.
- Checks actually run and their results.
- Any contract, data, analytical, responsive, or accessibility impact.
- Known limitations and follow-up work.

Reviews should be proportional to ownership:

- Fatima reviews product, UI/UX, frontend architecture, responsive behavior, accessibility, and frontend tests.
- The teammate reviews backend, data, analytics, statistics, calculations, storage, numerical correctness, and analytical tests.
- Both owners review shared contracts and end-to-end integration behavior.

## Shared contract changes

The `Insight`, `Evidence`, `Metric`, `Segment`, chart-series, pagination, and filtering contracts are shared seams. A change to one must:

1. Explain the need and compatibility impact.
2. Update the draft/approved contract documentation.
3. Receive both owners' review before either side relies on it.
4. Include coordinated tests or fixtures that are clearly labeled as development data.
5. Land through `integration` before promotion to `main`.

Do not silently implement an incompatible contract change or present a draft as final.

## Commit guidance

Use concise Conventional Commit messages whose scope matches the branch, for example:

```text
chore: bootstrap zarinpal product and frontend foundation
docs: clarify frontend backend contract boundaries
feat: add responsive insight card shell
fix: prevent mobile filter overflow
```

Do not mix unrelated frontend, backend, data, and documentation changes into one commit merely for convenience.

## Before merging

Run only commands that exist in the repository and report their real results. For frontend changes, the normal gate is install consistency, formatting, lint, strict typecheck, tests, and production build. For integration promotion, also confirm:

- No demo uses fabricated analytical results as real data.
- Session and attempt semantics are explicit.
- `adjusted_fee` is never described as the real Zarinpal fee.
- Traceability and limitations remain linked to important claims.
- Desktop and mobile paths work.
- Ownership boundaries and contract approvals were respected.
