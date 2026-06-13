# ADR 002: CSRF Posture for Mutating Admin Routes

## Status

Accepted

## Context

Briter authenticates the admin with an HMAC-signed session cookie
(`briter_session`, see `lib/auth/session.ts`). The cookie is set with
`SameSite=Lax` and `HttpOnly`. Auth on API routes is enforced by
`requireAdmin()`, which only checks that a *valid session cookie is present* —
it does not check *where the request came from*.

Because the browser attaches the session cookie automatically on cross-site
requests, this leaves state-changing routes exposed to Cross-Site Request
Forgery (CSRF): a malicious page the logged-in admin visits could POST to
`/api/publish`, `/api/settings/*`, `/api/uploads`, etc. and have the browser
attach the session cookie. This gap was explicitly flagged in
`HANDOFF-FOUNDATION.md:69` ("State-changing API routes rely on the session
cookie's `SameSite=Lax` posture and do not implement explicit CSRF origin/token
checks").

`SameSite=Lax` already blocks the most common CSRF vector — cross-site *form*
POSTs and cross-site `fetch`/XHR — but it is not a complete defense:

- `Lax` permits cross-site top-level navigations, so a `GET`-triggered state
  change would still carry the cookie. (Briter's mutations are POST, which is
  good, but this is not enforced anywhere.)
- `SameSite` enforcement varies across browser versions and is weakened by
  some proxy/embedding scenarios. Relying on it alone is implicit, not
  asserted by Briter's own code.

We want an explicit, asserted CSRF defense before milestones M3–M5 add new
mutating endpoints, so that "new route is CSRF-safe" is the default rather than
something each route author must remember.

## Decision

**Enforce a same-origin check (Origin / Referer header validation) on every
mutating admin request, layered on top of the existing `SameSite=Lax` cookie.**

A shared helper, `enforceSameOrigin(request)` in
`lib/auth/csrf.ts`, runs at the top of each state-changing route handler. It:

1. Applies only to unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`). Safe
   methods (`GET`, `HEAD`, `OPTIONS`) pass through untouched.
2. Reads the request `Origin` header (falling back to `Referer`'s origin).
3. Compares it against the set of trusted origins: the request's own `Host`
   (derived from forwarded headers / the request URL) and the configured
   `BRITER_PUBLIC_BASE_URL`.
4. Rejects mismatches — and requests that send *no* `Origin`/`Referer` on an
   unsafe method — with `403 { "error": "Cross-origin request blocked" }`.

A second helper, `requireAdminMutation(request)`, composes
`enforceSameOrigin` with the existing `requireAdmin()` so a new mutating route
opts into both session auth and CSRF protection in **one line**.

### Why origin/referer over double-submit token

- **Least churn, fits the existing cookie model.** The double-submit pattern
  requires issuing a CSRF token (a second cookie + a value the client must echo
  in a header), threading it through every admin form and `fetch`, and a
  bootstrapping step for the cookie. The origin check requires no client
  changes, no new cookie, and no token lifecycle — it reads headers the browser
  already sends and the server already trusts.
- **Stateless and self-hosted-friendly.** Briter is a single-user, self-hosted
  app behind a reverse proxy. The trusted origin is known
  (`BRITER_PUBLIC_BASE_URL`) and stable. There is no multi-tenant origin
  ambiguity to manage.
- **Works for the headless/bootstrap flows.** `/api/setup` and `/api/login`
  run before a session (and thus before any CSRF token) exists. An origin
  check protects them without a chicken-and-egg token-issuance problem.
- **Forward-compatible with token auth.** A future token-authenticated client
  (sending `Authorization` rather than a cookie) is not subject to CSRF and is
  unaffected by the origin check when it sends a matching/absent browser
  origin; the routes still return clean JSON. This does not deepen the
  cookie-only assumption.

The browser's automatic, unforgeable `Origin` header (scripts cannot set it to
a forged value on a cross-origin request) makes this a sound defense for a
cookie-session app.

## Rejected alternatives

### 1. Double-submit CSRF token

Issue a random token in a non-`HttpOnly` cookie and require the client to echo
it in a request header; the server compares the two.

Rejected because: it adds a token lifecycle (issue, rotate, expire), a second
cookie, and client plumbing in every form/`fetch`, for no security gain over
the origin check in Briter's single-origin, single-user model. It also
complicates the pre-session `setup`/`login` flows. This is the right tool when
you cannot trust `Origin`/`Referer` (e.g. legacy browsers) or have many
dynamic origins — neither applies here.

### 2. Rely on `SameSite=Strict` (or the existing `Lax`) alone, no server check

Tighten the session cookie to `SameSite=Strict` and treat that as the whole
CSRF defense, adding no server-side validation.

Rejected because: it is implicit rather than asserted — nothing in Briter's
code *verifies* the protection, so a regression (a future `GET` mutation, a
cookie attribute change, a browser that under-enforces `SameSite`) would
silently reopen the hole. `Strict` also breaks legitimate top-level
navigations from external links (e.g. clicking a preview-share link into the
admin), degrading UX. We keep `SameSite=Lax` as defense-in-depth but do not
make it the *only* line of defense.

## Consequences

- Every existing mutating admin route (`/api/publish`, `/api/settings/runtime`,
  `/api/settings/theme`, `/api/settings/theme/preview`, `/api/uploads`,
  `/api/setup`, `/api/login`, `/api/logout`, `/api/preview`,
  `/api/preview/share`) calls `enforceSameOrigin` / `requireAdminMutation` and
  rejects forged cross-origin requests with `403`.
- New mutating routes (M3–M5) opt in with a single call:
  `const blocked = await requireAdminMutation(request); if (blocked) return blocked;`
- Read-only routes (`GET`) are unaffected.
- The trusted origin is `BRITER_PUBLIC_BASE_URL` plus the request's own host.
  Deployments behind a reverse proxy must set `BRITER_PUBLIC_BASE_URL` to the
  public URL (already required for preview links), so no new configuration is
  introduced.
- No move off cookie sessions, no new auth system, no token-auth — consistent
  with the milestone non-goals and the constitution (Briter is not API-first;
  this hardens the existing admin, it does not build a content backend).
