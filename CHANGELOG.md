# Changelog

## Unreleased

- Uploads: serve images under a nested `BRITER_UPLOAD_ROUTE_BASE` (e.g. `/uploads/notes`). Before, the editor preview showed a broken image for every upload when the route base was nested.
- Uploads: images narrower than 1600px keep a full-width variant (a 768px image gets 400 and 768, not only 400). The editor links the largest WebP variant when no 800px variant exists.
- Git sync: a save or publish now stages the variants and manifest of each upload the post references, so images are committed with the post.
- Editor: a network failure or a non-JSON error response now shows "Save failed" and no longer leaves the editor stuck.
- Security: upgrade Next.js to 16.3.8 (critical RCE advisories), sharp to 0.35.5 (libvips/libheif advisories), and transitive deps; `bun audit` is clean.

## 2.0.0 - 2026-06-13

- Sections: JSON-defined `highlight`/`list` content config bound to site routes, replacing the single `_featured.json` pointer. Publishing a section syncs `content/sections/<id>.json` through the normal queue.
- Editorial lifecycle: draft → scheduled → published → archived, with future-dated posts held out of git until their publish instant and archive as a reversible hide (the `.mdx` stays in the repo).
- Hardened git-sync worker: per-slug dedup, single-flight stale-lock runner, exponential backoff, and max-attempt dead-lettering.
- Disk-aware storage provisioning: sensed free disk, provisioned upload cap, and dashboard storage readout.
- Same-origin (CSRF) checks on all mutating admin routes (ADR 002).
- `git-target` adapter proven end-to-end against a live external site (personal-site dogfood).
- Stepped onboarding wizard: site identity, admin password, optional TOTP, adapter selection.
- In-app documentation browser at `/docs`.
- Theme & layout settings: host CSS + editor layout, applied live.
- Admin UI: rebuilt the Sections manager on the shared design system and fixed the Docs navigation link.

## 0.1.0 - 2026-05-22

- Standalone repo initialization and first public scaffold release.
- Runtime config + secrets storage foundations.
- Setup/login/logout auth flow with optional TOTP support.
- Middleware auth gate and admin route split.
- Public reader pages, RSS, sitemap, robots.
- Adapter registry with local and git-target adapters.
- Docker/compose install path and create-briter-app workspace scaffolding.
- Release workflow skeleton and docs route support.
