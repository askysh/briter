# ADR 001: Middleware vs Next.js 16 Routing Conventions

## Status

Accepted

## Context

Next.js 16 (v16.2.3) does not introduce a stable "proxy" or routing convention that replaces `middleware.ts` for auth gating. The `instrumentation.ts` file introduced in Next.js 15+ is for observability (OpenTelemetry tracing), not request-level auth. `middleware.ts` remains the recommended approach for authentication and route protection.

Briter uses `middleware.ts` to protect admin routes with a session cookie check. The matcher covers all routes except a list of explicitly open paths.

## Decision

Keep `middleware.ts` as-is. No migration to an alternative convention.

The auth gating logic (open-route list + session cookie check + redirect to `/login`) is straightforward and well-suited to the middleware layer. Migrating to an instrumentation-based approach would require either duplicating auth logic into route handlers or using a pattern that Next.js does not officially support for auth.

## Consequences

- `middleware.ts` will need to be updated when new public routes are added.
- If a future Next.js version deprecates `middleware.ts` in favor of a stable replacement, this decision should be revisited.
- No immediate action required.
