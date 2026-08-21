# Merchant Intelligence API

This package serves validated payment data as merchant summaries, actionable
insights, trends, and descriptive merchant segments. Analytical calculations
run only in this backend; the frontend receives display-ready values and their
traceability metadata.

The shared shapes in `docs/integration/draft-contracts.md` remain **DRAFT —
REQUIRES TEAMMATE APPROVAL**. The API keeps those shapes intact and wraps scoped
responses with canonical filters, warnings, and dataset provenance.

## Run locally

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm dev:api
```

Copy `.env.example` values into the process environment. Environment files are
not loaded implicitly, so secrets never become a runtime dependency. With Node
22+, an environment file can be supplied when starting the built server:

```bash
node --env-file=apps/api/.env apps/api/dist/server.js
```

If `PAYMENTS_DATA_PATH` is absent, the server starts in a degraded state and
data endpoints return `503 DATA_UNAVAILABLE`; it never substitutes demo data.

## Access control

Loopback development (`API_HOST=127.0.0.1`) may run without a token. Binding to
any non-loopback host fails closed unless `API_AUTH_TOKEN` is configured with at
least 32 non-whitespace characters. When a token is configured, all data routes
require `Authorization: Bearer <token>`; `/api/v1/health` and CORS preflight
requests remain unauthenticated. Keep the token out of source control and use a
deployment secret manager in hosted environments.

## Input data

`PAYMENTS_DATA_PATH` points to UTF-8 JSON containing either an array or an
object with `paymentAttempts`, `payment_attempts`, or `attempts`. Every attempt
requires:

- `attemptId`, `sessionId`, `merchantId`
- `occurredAt` as an RFC3339 date-time with `Z` or an explicit UTC offset
- non-negative safe-integer `amount` in the currency's smallest source unit,
  plus a `currency` code
- `status`: `succeeded`, `failed`, or `pending` (documented aliases are
  normalized by validation)

Optional source-backed fields are `adjustedFee`, `merchantDisplayName`,
`merchantCategory`, `terminalId`, and `issuer`. Snake-case aliases are accepted.
Duplicate attempts, invalid values, and sessions spanning merchants are
rejected. Sessions spanning currencies and currency totals outside JavaScript's
safe-integer range are also rejected rather than rounded. A SHA-256 identifier
of the source document is attached to analytical provenance.

Payment Sessions are reconstructed by `sessionId`. A session succeeds when an
attempt succeeds; successful volume counts the first successful attempt once.
Attempt counts remain available for retry analysis and are never treated as
session counts. `adjustedFee` is always labeled as confidentially transformed,
never as Zarinpal's real fee.

## API

All routes are under `/api/v1`:

- `GET /health`
- `GET /merchants?search=&categoryId=&cursor=&limit=`
- `GET /filter-options`
- `POST /merchants/:merchantId/summary/query`
- `POST /insights/query`
- `POST /trends/query`
- `POST /segments/query`

Query requests use the draft `FilterState` and pagination shapes. Supported
dimension keys are `status`, `category`, `terminal`, `issuer`, `amount_min`,
`amount_max`, `attempt_count_min`, and `attempt_count_max`. Unsupported filters
are rejected rather than ignored. Collection cursors are opaque and bound to
the normalized query and dataset version.

Summary, insight, and segment queries use `payment_session`. Trend queries
support either `payment_session` or `payment_attempt`; `/filter-options` returns
the supported endpoints for each analysis unit. Date boundaries are inclusive
RFC3339 instants, while the supplied IANA timezone controls calendar-day trend
bucketing.

Errors use a stable envelope:

```json
{
  "error": { "code": "VALIDATION_ERROR", "message": "..." },
  "requestId": "..."
}
```

## Checks

```bash
pnpm --filter @zarinpal/api lint
pnpm --filter @zarinpal/api typecheck
pnpm --filter @zarinpal/api test
pnpm --filter @zarinpal/api build
```

The current storage adapter intentionally uses a configured read-only JSON
source. A database, ingestion pipeline, tenant-level merchant authorization,
token lifecycle/rotation policy, and deployment topology still require the real
dataset and production operating constraints.
