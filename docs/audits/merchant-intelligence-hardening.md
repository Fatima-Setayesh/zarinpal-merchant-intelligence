# Merchant Intelligence hardening audit

**Audit date:** 2026-08-24

**Audited revision:** `325f5e9868e8dd76019a3356b298e0cbb0d3d69d` (`origin/main`)

**Local branch:** `fix/merchant-intelligence-hardening`

**Scope:** repository, product/docs, reachable frontend, complete API source and tests, local build/security/performance evidence

## Executive result

The local product has a credible, well-tested analytical API and a now-hardened
decision-first frontend. The critical frontend ownership violations, fake
anomaly/stability semantics, production localhost fallback, unchecked JSON
boundary, canonical-scope drift, stale-scope presentation, accessibility gaps,
and duplicate prototype code were corrected without changing teammate-owned
analytical behavior.

This is not production-ready. Contract and analytical approval, tenant
authorization, a trusted browser/API gateway, representative-scale load tests,
operational monitoring, and real browser/device acceptance remain release
gates.

## Confirmed findings and disposition

| Severity | Finding                                                                         | Evidence                                                                            | Disposition                                                                                             |
| -------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| P0       | Browser rewrote backend observations, impact, and actions for known insight IDs | former `apps/web/src/features/merchant-intelligence/api.ts` and `localizeInsight()` | Removed; backend prose and recommendation fields are authoritative                                      |
| P0       | Production could silently call localhost and had no safe auth topology          | former client fallback; API requires token off loopback                             | Same-origin `/api/v1` default, validated config, browser-safe `.env.example`, deployment decision added |
| P1       | Successful API JSON was trusted through TypeScript assertions                   | former `response.json() as T`                                                       | Complete runtime shape validation and fail-closed client errors added                                   |
| P1       | The chart presented the minimum as an anomaly                                   | former trend styling/copy                                                           | Removed; neutral observed min/max and honest axes added                                                 |
| P1       | No insight implied stability and every insight implied highest opportunity      | former decision/insight presentation                                                | Replaced with neutral absence language and backend/position-aware priority                              |
| P1       | UTC day boundaries were labeled as Tehran calendar days                         | former filter serializer                                                            | IANA timezone conversion and boundary/round-trip tests added                                            |
| P1       | Old claims could coexist with a newly applied scope                             | combined query/page state                                                           | New-key summary blocks the old surface; independent section states and updating announcement added      |
| P1       | Active scope omitted canonical dimensions                                       | request-derived chips                                                               | Server `appliedFilters`, warnings, provenance, all dimensions, and compact overflow detail now render   |
| P1       | Two older UI generations and their CSS/tests were unreachable                   | entry graph from `App`                                                              | Verified dead modules and selectors removed                                                             |
| P2       | Theme storage exceptions could break initialization                             | unguarded inline/React storage                                                      | Reads/writes/bootstrap guarded; query preference is consistent                                          |
| P2       | Tabs and drawers lacked complete keyboard/focus semantics                       | roles without full relationships/navigation                                         | IDs, tabpanels, RTL arrows, Home/End, modal labels, focus entry/return added                            |
| P2       | One large feature mixed transport, presentation, serialization, and interaction | 45 kB dashboard module                                                              | Split into `api/`, `model/`, and cohesive product components                                            |

## Findings rejected after verification

- The API does bound JSON bodies to 64 KiB, validates declared and streamed
  length, limits headers and pagination, and rejects unsupported keys.
- Non-loopback startup fails closed without a 32-character service token;
  token comparison hashes both values before constant-length comparison.
- Error envelopes do not expose stack traces or repository details; request IDs
  are stable and client-safe.
- Server header/request/socket/keep-alive timeouts and graceful/forced shutdown
  are configured and tested.
- Cursor payloads are dataset/query/limit-bound and range-checked. They are not
  signatures, but pagination position is not an authorization boundary.
- Session/attempt separation, multi-currency isolation, safe-integer rejection,
  NoAttempt preservation, transformed-fee disclosure, and missing-fee
  denominator rules have direct tests.
- No production payment dataset, environment secret, private key, or frontend
  service token is tracked.

## Backend / analytical review findings — REQUIRES TEAMMATE APPROVAL

No item below was changed except mechanical Prettier output.

### 1. Expensive requests have no admission control — high

- **File/function:** `apps/api/src/app.ts:createApp`; analytical routes in
  `apps/api/src/service.ts:queryMerchantSummary/queryInsights/queryTrends/querySegments`.
- **Current behavior:** payload/page bounds constrain transport output, but each
  accepted request may scan, group, sort, benchmark, and segment the in-memory
  dataset. There is no per-instance concurrency, rate, or request-cost limit.
- **Risk:** a small number of parallel authenticated requests can saturate the
  single Node event loop; public wildcard CORS plus a leaked service token would
  increase the abuse surface.
- **Proposed test:** parallel mixed endpoint load at representative dataset size,
  recording event-loop delay, latency percentiles, memory, rejected work, and
  recovery after the burst.
- **Possible direction:** a small in-process semaphore/queue with bounded wait,
  per-principal/edge rate policy, and `429`/`503` semantics. Deployment gateway
  limits should complement, not replace, service protection.

### 2. File ingestion retains the analytical dataset in memory — high

- **File/function:** `apps/api/src/repository.ts:loadChallengeCsvGzip` and
  `FilePaymentAttemptRepository.getSnapshot` (lines around 329 and 431).
- **Current behavior:** gzip CSV input streams bytes but accumulates validated
  attempts and sessions; JSON is fully `readFile`-loaded, parsed, validated,
  sessionized, cloned/frozen, and retained.
- **Risk:** peak memory is a multiple of source size and a production file can
  cause process pressure or termination. Pagination does not bound computation.
- **Proposed test:** cold/reload memory profile for realistic and worst-case
  datasets, including malformed late rows and concurrent queries.
- **Possible direction:** approve a maximum source size/startup check, ingest to
  an indexed store, or build a versioned snapshot outside the serving process.
  Preserve validation, provenance, session semantics, and numerical tests.

### 3. Concurrent cold/reload calls can duplicate ingestion — medium

- **File/function:** `apps/api/src/repository.ts:FilePaymentAttemptRepository.getSnapshot`.
- **Current behavior:** the cache is populated only after load completes; there
  is no in-flight promise keyed by file identity.
- **Risk:** simultaneous first requests or reloads can parse/sessionize the same
  file multiple times, multiplying latency and memory.
- **Proposed test:** issue many concurrent `getSnapshot()` calls while
  instrumenting load count, then repeat during a file-version change/failure.
- **Possible direction:** coalesce an in-flight load per cache key and publish a
  fully validated immutable snapshot atomically. Define whether a failed reload
  serves the last known good snapshot or fails closed.

### 4. HTTP timeouts do not cancel synchronous analytical CPU work — medium

- **File/function:** `apps/api/src/server.ts` timeout constants and analytical
  functions in `apps/api/src/analytics.ts`.
- **Current behavior:** 30-second request/socket timeouts bound I/O lifecycle,
  but synchronous CPU work cannot observe abort and can delay timeout handling.
- **Risk:** an overloaded calculation can block all requests and graceful
  shutdown even though timeout values look bounded.
- **Proposed test:** representative worst-case calculation with event-loop delay
  and client disconnect/timeout; assert when work actually stops.
- **Possible direction:** first bound/admit work; if measurements justify it,
  move immutable-snapshot computation to workers or precomputation. Do not split
  formulas merely for asynchronous appearance.

### 5. Naive challenge timestamps use a fixed default offset — medium

- **File/function:** `apps/api/src/config.ts:DEFAULT_PAYMENTS_DATA_UTC_OFFSET`
  and challenge ingestion.
- **Current behavior:** naive source timestamps default to `+03:30`; operators
  can override the offset explicitly.
- **Why review is needed:** a fixed offset is correct only if the dataset’s
  documented timestamp convention says so. It does not model historical IANA
  timezone rules and may shift dates for differently defined sources.
- **Proposed test:** source-owner fixtures around date boundaries and any period
  affected by the dataset’s actual convention.
- **Possible direction:** make source timestamp semantics mandatory deployment
  metadata or accept already offset-qualified timestamps. This is a data
  transformation semantic and requires approval.

### 6. CORS and operational logging should be deployment-reviewed — medium

- **File/function:** `apps/api/src/app.ts:setCommonHeaders` and
  `apps/api/src/server.ts:logOperationalError`.
- **Current behavior:** the configured origin is emitted without comparing the
  incoming `Origin`; `*` is allowed. Server logs include nested error messages,
  which can include local source-path detail, although responses remain safe.
- **Risk:** current behavior is workable for one controlled origin but is not a
  tenant/user security model; logs need access/redaction policy.
- **Proposed test:** allowed/disallowed/no-Origin matrix and representative
  storage failures through the production log sink.
- **Possible direction:** emit CORS headers only for exact allowed origins, avoid
  wildcard on credential-bearing deployments, and define structured log
  redaction/retention. Prefer same-origin gateway deployment.

## Analytics modularization plan — REQUIRES TEAMMATE APPROVAL

`analytics.ts` is roughly 2,700 lines and couples shared scoping/provenance with
summary, peer, insight, trend, and segment construction. A semantics-preserving
extraction should follow dependency direction, with characterization tests
before every move:

```text
analytics/
  scope.ts                 filter application + session/attempt selection
  evidence.ts              metric/evidence/traceability constructors
  summary.ts               headline metric composition
  retry.ts                 attempt ordering and recovery analysis
  peers.ts                 equal-merchant category benchmarks
  adjusted-fee.ts          transformed relative-only calculations/disclosures
  insights.ts              evidence-backed generation and ranking
  trends.ts                timezone buckets and series construction
  segments.ts              descriptive population segmentation
```

Low-level domain/session validation stays in `domain.ts`; HTTP canonicalization
and pagination stay in `service.ts`. Avoid circular imports by having feature
modules depend on scope/evidence primitives, never on one another. Snapshot
fixtures should assert byte-for-byte-equivalent public outputs before/after.

## Analytical test coverage and gaps — REQUIRES TEAMMATE APPROVAL

Confirmed coverage includes session versus attempt, retries, tied ordering,
NoAttempt, currencies, safe integers, missing adjusted fee/issuer, malformed
input, cross-merchant/cross-currency sessions, date/session boundaries, all
allowlisted dimension classes and numeric boundaries, equal-merchant peer
medians, concentration/confounding disclosure, transformed-fee safety, cursor
binding, auth/CORS/errors, degraded health, storage reload, and timeouts.

High-value gaps:

1. non-UTC IANA trend bucketing around Tehran calendar boundaries;
2. explicit empty-dataset results for every analytical builder/endpoint;
3. explicit category ambiguity fixtures and expected directory/peer behavior;
4. direct proof that the selected merchant never enters its peer population;
5. below-floor peer populations and comparison-null behavior;
6. zero-denominator cases for every rate/ratio family;
7. explicit small-sample limitation thresholds at `n-1`, `n`, and `n+1`;
8. concurrent cold/reload coalescing and last-known-good policy;
9. representative-scale latency, memory, concurrency, and event-loop tests;
10. a lexical/structured guard against accidental causal or absolute-fee claims
    across every generated insight, not only selected fixtures.

Changing any expected threshold, formula, population, missingness rule,
segmentation output, or analytical prose requires teammate approval.

## Security evidence

- `git grep` secret/private-key/token patterns: no match.
- tracked `.env`, key, certificate, or payment data files: none.
- `.gitignore` covers root and package `.env` files.
- browser config contains only `VITE_API_BASE_URL`; no server credential path.
- `pnpm audit --json`: 0 known advisories across 357 resolved dependencies.
- API preserves body/header/pagination bounds, fail-closed exposed-host auth,
  no-store/security headers, safe errors, and request correlation.

## Performance evidence

Environment: Windows workspace, Node `24.18.0`; synthetic local fixture only.
Single smoke run, 19,999 attempts / 10,000 sessions:

| Operation                                        |      Time |
| ------------------------------------------------ | --------: |
| Cold JSON dataset load/validation/sessionization | 143.92 ms |
| Cached snapshot access (includes file stat)      |   0.59 ms |
| Merchant summary                                 | 136.54 ms |
| Insights                                         | 102.57 ms |
| Trends                                           | 114.82 ms |
| Segments                                         | 102.55 ms |

Frontend production output: 319.50 kB JS / 97.30 kB gzip; 42.34 kB CSS /
8.69 kB gzip; local Vazirmatn WOFF2 is preloaded. These numbers are useful for
regression comparison only. They are not production SLOs and do not substitute
for representative data, repeated percentiles, constrained hardware, or load.

## Browser and accessibility evidence limit

The controlled fixture API and local Vite app started successfully. The in-app
browser then failed to initialize because its Windows sandbox could not apply
read-deny ACLs. Per the browser/audit workflow, no substitute screenshot source
was used and no pixel-level, viewport, zoom, dark-theme, or reduced-motion claim
is made. Automated DOM/interaction coverage verifies semantic tabs, keyboard
navigation, modal labeling, focus return, safe states, chart table access, and
theme-storage failure; manual browser/device acceptance remains open.

## Repository and branch hygiene

All named remote feature/integration branches are ancestors of `origin/main`:

| Branch                         | Unique commits vs main | Main commits ahead | Classification                                                            |
| ------------------------------ | ---------------------: | -----------------: | ------------------------------------------------------------------------- |
| `feat/analytics-engine`        |                      0 |                  7 | merged; deletion candidate after owner confirmation                       |
| `feat/backend-finalization`    |                      0 |                  3 | merged; deletion candidate after owner confirmation                       |
| `feat/data-pipeline`           |                      0 |                  8 | merged; deletion candidate after owner confirmation                       |
| `feat/frontend-completion`     |                      0 |                  0 | same tip as main; deletion candidate                                      |
| `feat/frontend-dashboard`      |                      0 |                 10 | merged; deletion candidate after preserving any external context          |
| `feat/insight-engine`          |                      0 |                  5 | merged; deletion candidate after owner confirmation                       |
| `feat/merchant-segmentation`   |                      0 |                  6 | merged; deletion candidate after owner confirmation                       |
| `feat/project-foundation`      |                      0 |                  9 | merged; deletion candidate after owner confirmation                       |
| `feat/traceability-engine`     |                      0 |                  4 | merged; deletion candidate after owner confirmation                       |
| `integration/frontend-backend` |                      0 |                  1 | merged and one commit behind; deletion candidate after owner confirmation |

No branch was deleted. GitHub metadata could not be authenticated through the
available CLI, so no remote metadata mutation or unsupported factual claim was
made. The repository has no root license file.

Proposed description: **Traceable Persian merchant decision intelligence from
validated payment sessions, evidence, and actionable backend insights.**

Proposed topics: `merchant-intelligence`, `decision-intelligence`, `fintech`,
`payments`, `zarinpal`, `react`, `typescript`, `nodejs`, `rtl`, `persian`,
`data-visualization`, `traceability`.

Add a homepage only after a real deployment exists. The team should explicitly
choose a license; none was added by this audit.
