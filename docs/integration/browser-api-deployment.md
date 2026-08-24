# Browser/API deployment decision

## Status

Accepted for the current frontend hardening; production infrastructure remains
unimplemented.

## Decision

The production browser defaults to the same-origin path `/api/v1`. The browser
never receives `API_AUTH_TOKEN`, and no `VITE_*` variable may contain a service
credential.

```text
Browser
  │ authenticated application request
  ▼
Same-origin gateway or backend-for-frontend
  │ server-side service credential
  ▼
Merchant Intelligence API
```

Local development may use `http://localhost:3000/api/v1` because the API is
loopback-bound and is allowed to run tokenless. A deliberately different local
origin can be configured with `VITE_API_BASE_URL` and the API’s `CORS_ORIGIN`.

## Rationale

Vite exposes `VITE_*` values to every user of the built application. Embedding
a shared bearer token would disclose it and would not provide merchant or
tenant authorization. The API correctly requires a token when bound away from
loopback, but that token is service-level protection, not a browser session
model.

Same-origin deployment also avoids a fragile production localhost fallback and
keeps CORS out of the primary hosted path. The gateway is responsible for user
authentication, tenant-to-merchant authorization, request limits, safe token
rotation, and forwarding request IDs.

## Required production controls

- TLS at the public edge and secure, server-side secret storage;
- authenticated user sessions and tenant/merchant authorization;
- rate, concurrency, request-cost, and upstream timeout limits;
- exact origin policy if cross-origin access is enabled;
- structured logs, metrics, alerting, and redaction review;
- health/readiness checks that distinguish process health from dataset readiness;
- documented token rotation and incident response.

Direct browser-to-API access is out of scope until a short-lived, user-bound
token protocol and tenant authorization model are designed and reviewed.
