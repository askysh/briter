# Briter v1: Ship It As A Standalone Installable App

## Context

Briter exists today as an admin surface inside `/Users/mamac/Dev/personal-site` — a battle-tested markdown blogging tool (bcrypt+TOTP auth, two-pane editor, image variant pipeline, disk-backed git-sync queue, preview tokens, storage budget, RSS, ISR revalidation). It powers akashmishra.com/notes and works.

In parallel, `/Users/mamac/Dev/briter` is a clean Next.js 16 + Bun + Tailwind 4 scaffold with a better architecture (adapter pattern, theme system, queue, worker boundary) but only ~30% of the features. No auth, no public reader, no RSS, no SEO, no scroll-sync, no autosave, no preview tokens, no second adapter. Worker defaults to dry-run.

The goal: take the briter scaffold to a **polished v1** that anyone can install via either `bunx create-briter-app my-blog` **or** `docker compose up`. Single user per instance. Briter renders its own public blog by default; an adapter lets power users push content into a separate static site instead. Personal-site is the proving ground — it migrates to consume Briter via the adapter as the final validation milestone.

User-confirmed decisions:
- **Install:** CLI scaffolder + Docker compose (both).
- **Publish target:** Self-hosted by default; adapter for external static sites.
- **Auth:** Setup wizard on first boot. Config in `storage/config.json`, secrets in `storage/secrets.json`. No env-var fumbling.
- **Scope:** Polished v1 — setup wizard, editor (with autosave, scroll-sync, paste-image), dashboard with filters, image pipeline (EXIF strip, variants), public reader, themes, draft→publish, second adapter, hardened worker, **optional** TOTP, scheduled posts, preview tokens, storage budget UI, RSS, basic SEO.
- **Release:** Single repo (Bun workspace) on GitHub + `/docs` route inside the app rendering MDX from `/docs` folder.
- **Migration:** Personal-site migrates onto Briter via the `git-target` adapter as part of v1 (proves the adapter).

## Plan

Nine milestones (M0–M8). Each is independently shippable with a demo. Recommended PR-per-milestone so each is reviewable. Personal-site migration sits at M7 — late on purpose so the adapter is exercised before the docs go out.

---

### M0 — Foundations: runtime config + storage layout

Replace `lib/config/env.ts`'s env-only resolution with a layered config: built-in defaults → `BRITER_*` env → `storage/config.json` → `storage/secrets.json` (chmod 600). No user-visible changes; every later milestone depends on this seam.

**New files:**
- `lib/config/paths.ts` — single source of truth for `appRoot`, `storageRoot`, `configFile`, `secretsFile`, `contentRoot`, `uploadRoot`, `queueRoot`.
- `lib/config/runtime-config.ts` — `loadRuntimeConfig()`, `saveRuntimeConfig(patch)`, `isFirstBoot()`.
- `lib/config/secrets.ts` — read/write `storage/secrets.json` with 0600 perms on POSIX.
- `storage/.gitignore` — ignore everything in `storage/`.
- `app/api/health/route.ts` — `{ ok, version, configured, hasAuth }` for Docker healthcheck + CLI smoke test.

**Modify:**
- `lib/config/env.ts` — keep as thin shim delegating to `runtime-config.ts` for back-compat.
- `lib/app/services.ts` — async factory that reads runtime config; chooses adapter from config.

**Verify:** `bun run dev` → `curl localhost:3075/api/health` returns `configured: false`. Delete `storage/config.json` → defaults still work.

---

### M1 — Setup wizard + auth gate

First boot lands on `/setup`. Wizard collects: site identity → admin password → optional TOTP (QR + secret) → adapter choice → optional git settings. Subsequent boots require login for editor/admin/settings; public reader stays open.

**New files:**
- `middleware.ts` (project root) — gates all non-public routes. `/setup/*`, `/api/setup/*`, `/api/health`, `/`, `/posts/*`, `/feed.xml`, `/uploads/*` stay open. Everything else requires session cookie (presence only at edge; real verification in handlers).
- `lib/auth/password.ts`, `lib/auth/session.ts`, `lib/auth/rate-limit.ts`, `lib/auth/session-secret.ts`, `lib/auth/require-admin.ts` — port from `personal-site/lib/{auth,admin-session,login-limiter,session-secret,require-admin}.ts`. Use `bcryptjs` (pure JS, easier Docker).
- `app/setup/page.tsx` + `app/setup/components/wizard.tsx` — multi-step wizard. Use `qrcode` for TOTP QR.
- `app/api/setup/route.ts` — idempotent only while `configured=false`. Writes config + secrets.
- `app/login/page.tsx` + `app/api/login/route.ts` + `app/api/logout/route.ts` — port from `personal-site/app/admin/api/login/route.ts`. TOTP field shown only if a secret was set.
- `scripts/reset-admin.mjs` — port `personal-site/scripts/reset-admin-password.mjs` for recovery.

**Reuse:** `components/app-shell.tsx` for admin chrome.

**Dependencies to add:** `bcryptjs`, `otpauth`, `qrcode`.

**Verify:** Fresh clone → `bun run dev` → land on `/setup` → complete wizard → redirect home. Restart server, try `/write/new` logged out → bounced to `/login`. `node scripts/reset-admin.mjs` resets password.

---

### M2 — Public reader (default mode) + RSS + SEO

Briter renders its own blog out of the box. Move the current dashboard to `/admin`; reuse `/` as the public landing. Two route groups: `(public)` and `(admin)`.

**New files:**
- `app/(public)/page.tsx` — public landing (configurable via wizard).
- `app/(public)/posts/page.tsx` — paginated published posts list.
- `app/(public)/posts/[slug]/page.tsx` — replaces current stub; add `generateMetadata` (OpenGraph, Twitter card, canonical, JSON-LD `BlogPosting`).
- `app/(public)/layout.tsx` — public reader chrome (theme tokens applied, no admin header).
- `app/feed.xml/route.ts` — port `personal-site/lib/rss.ts`. RSS 2.0 from `repository.listPosts()` filtered to `status === "published"`.
- `app/sitemap.ts`, `app/robots.ts` — derive from `repository.listPosts()`.
- `lib/public/site-identity.ts` — read `name`, `description`, `author`, `baseUrl` from runtime config.

**Modify:**
- `app/page.tsx` → move dashboard into `(admin)` route group at `/admin`.
- `lib/adapters/site-adapter.ts` — extend with `publicReader: "self" | "external" | "off"` and `getReaderHref(slug)`.

**Reuse:** `lib/preview/markdown-preview.ts` (same pipeline for public render), `lib/theme/*`, `components/theme-runtime.tsx`.

**Verify:** Publish a post → `/`, `/posts`, `/posts/[slug]`, `/feed.xml`, `/sitemap.xml`, `/robots.txt` all render correctly logged out. View source → OpenGraph + JSON-LD present.

---

### M3 — Editor polish: autosave, scroll-sync, preview tokens, status filters

The editor finally feels like a writing surface.

**New files:**
- `lib/preview/preview-token.ts` — port `personal-site/lib/preview-token.ts` (HMAC `slug.expiresAt.sig`, 24h TTL).
- `app/api/preview/share/route.ts` — POST `{ slug }` → 24h share URL.
- `components/admin/dashboard.tsx` — tabbed dashboard (Drafts / Scheduled / Published / Failed-sync) + search.
- `components/admin/sync-queue-badge.tsx` — port from `personal-site/components/admin/sync-queue-badge.tsx`.
- `components/admin/storage-usage-bar.tsx` — port `personal-site/components/admin/usage-bar.tsx`.
- `app/api/uploads/usage/route.ts` — `{ usedBytes, capBytes }`.

**Modify in place:**
- `components/post-editor.tsx` — port `useHeadingScrollSync` from `personal-site/components/admin/editor.tsx`; add 1.5s debounced autosave calling `/api/publish` with `action: "save-draft"`; add "Share preview" button.
- `app/preview/[slug]/page.tsx` — accept `?token=`; if valid → render even when draft; else require session.
- `app/api/publish/route.ts` — return preview share URL alongside existing response.
- `components/dashboard.tsx` → moves under `components/admin/dashboard.tsx`.

**Reuse:** `lib/content/file-content-repository.ts`, `lib/content/post-document.ts` (`derivePostStatus` already returns draft/scheduled/published).

**Verify:** Type in editor → "Saved" indicator within 1.5s. Scroll markdown → preview follows headings. Click "Share preview" → URL renders the draft for logged-out users for 24h, expires after.

---

### M4 — Worker hardening + image pipeline upgrade

Production-grade worker (path validator, exponential backoff, branch guard, single-flight lock) and image pipeline (EXIF strip, dimension caps, magic-byte probe, AVIF+WebP variants).

**New files:**
- `lib/uploads/image-pipeline.ts` — port `personal-site/lib/images.ts`. Variants 400/800/1200/1600 in AVIF + WebP. EXIF strip via `withMetadata({})`. Dimension caps 8000px / 24M pixels. Magic-byte probe via sharp metadata.
- `lib/uploads/budget.ts` — port `personal-site/lib/storage-budget.ts`. Cached `computeDirectorySize`, 95% soft cap.
- `lib/worker/path-validator.ts` — adapter-driven path allowlist. Each adapter exposes `getAllowedPaths(): RegExp[]`.
- `scripts/run-git-sync-worker.mjs` — port `personal-site/scripts/run-git-sync-worker.mjs`. Backoff [1m, 5m, 30m], branch guard, lockfile. Replaces `worker/index.ts` for Docker.

**Modify:**
- `lib/uploads/image-upload-service.ts` — swap internal sharp pipeline for `image-pipeline.ts`. Hook `budget.ts` soft-cap check.
- `lib/worker/git-sync-worker.ts` — run jobs through `path-validator` before staging.
- `lib/queue/job.ts` — extend schema with `nextRunAt`, `lastError`, validated `paths`.
- `lib/adapters/site-adapter.ts` — add `getAllowedPaths(): RegExp[]`.

**Verify:** Upload a JPEG with EXIF GPS → `exiftool` on variant files shows no GPS. Enqueue a job with a malicious path → worker rejects with explanatory error in `lastError`. Simulate a push failure → backoff sequence visible in `storage/queue/*.json`.

---

### M5 — `GitTargetSiteAdapter`: push to external static sites

A second adapter that writes posts + uploads into a separate git worktree (a sibling Next/Astro/Hugo site). This is what powers Briter's claim to be "an editor for your existing site."

**New files:**
- `lib/adapters/git-target-site-adapter.ts` — implements `SiteAdapter`. Config: `contentSubpath`, `uploadSubpath`, `contentExtension`, `frontmatterShape`, `publishedHrefTemplate`, `revalidateHook?`.
- `lib/adapters/adapter-registry.ts` — central lookup (`local-mdx`, `git-target`, future presets).
- `lib/config/adapter-config.ts` — config validator + types.
- `lib/worker/external-revalidate.ts` — POST configured revalidate webhook after successful push.

**Modify:**
- `lib/app/services.ts` — read adapter key from runtime config, dispatch via `adapter-registry`.
- `lib/config/paths.ts` — when adapter is `git-target`, `contentRoot`/`uploadRoot` resolve under the external worktree.
- `app/setup/page.tsx` — adapter step offers "Self-hosted reader" vs "External site". External collects worktree path, subpaths, frontmatter preset (presets for `next-mdx`, `astro`, `hugo`).
- `app/settings/page.tsx` — add "Adapter" panel for post-setup edits.
- Public reader from M2 — when `publicReader: "external"`, `/posts*` 308s to `publishedHrefTemplate`; `/feed.xml` 404s.

**Reuse:** Existing `lib/worker/git-sync-worker.ts` is adapter-agnostic; it just stages whatever the queue tells it to.

**Verify:** Point Briter at a sibling test repo. Publish a post → file appears at `<sibling>/content/notes/<slug>.mdx`. Worker commits and pushes. Webhook fires → mock receiver sees the POST.

---

### M6 — Docker compose + CLI scaffolder

Two installable paths from the same repo. Bun workspace: `packages/create-briter-app` is generated from a template snapshot of the scaffold.

**New files:**
- `Dockerfile` — multi-stage; copy `personal-site/Dockerfile` shape but drop the wide CSP (Briter has its own in `next.config.ts`). Stay on `bcryptjs` to avoid Alpine/musl native deps.
- `compose.yaml` — two services (`web`, `worker`) sharing the same image, different `command:`. Volumes: `./storage`, `./content`, optional `./.ssh:/run/secrets:ro`.
- `compose.dev.yaml` — dev overlay.
- `.dockerignore`.
- `packages/create-briter-app/{package.json,index.mjs}` — published as `create-briter-app` on npm. Node-only deps, no `inquirer` — just `node:readline` for prompts. Flags: `--with-docker`, `--adapter local-mdx|git-target`.
- `packages/create-briter-app/template/` — generated at publish time by `scripts/build-template.mjs`. Excludes `node_modules`, `.next`, `storage/`.
- `scripts/build-template.mjs` — produces the template snapshot.
- Root `package.json` becomes a workspace (`workspaces: ["packages/*"]`).

**Modify:**
- `next.config.ts` — `output: "standalone"`.
- `package.json` scripts — add `build:template`, `start:standalone`.

**Verify:**
- `bunx create-briter-app /tmp/test-blog --with-docker` → directory exists, `bun install` ran, README is correct.
- From `/tmp/test-blog`: `bun run dev` → wizard reachable.
- `docker compose up --build` → both services pass `/api/health`. Restart compose → state persists in `storage/`.

---

### M7 — Migrate personal-site onto Briter (the dogfood milestone)

Personal-site continues to render at akashmishra.com, but its admin surface is replaced by a Briter instance using the `git-target` adapter pointed at the personal-site repo.

**Steps:**
1. Stand up a Briter instance (Docker on the same VPS as personal-site).
2. Configure adapter:
   - `contentSubpath: content/notes`
   - `uploadSubpath: public/uploads/notes`
   - `contentExtension: .mdx`
   - `frontmatterShape: { title, publishedAt, summary, tags, draft }`
   - `publishedHrefTemplate: https://akashmishra.com/notes/{slug}`
   - `revalidateHook: https://akashmishra.com/api/revalidate?secret=...`
3. Disable `personal-site/app/admin/*` behind a feature flag (it stays in the codebase for rollback, but middleware 404s the routes).
4. Capture the existing personal-site `ALLOWED_PATHS` regex set as the `personal-site-mdx` preset in `lib/adapters/adapter-registry.ts`.
5. Existing `personal-site/app/api/revalidate/route.ts` keeps working; Briter's `external-revalidate.ts` calls it.
6. `_featured.json` stays a personal-site concern (not portable; site-specific feature).

**Verify:** From Briter UI, publish a new note → personal-site repo gets the commit → revalidate webhook fires → akashmishra.com renders the note within 10s.

---

### M8 — Docs at `/docs` + release plumbing

**New files:**
- `docs/` (project root) — MDX source: `getting-started.mdx`, `setup-wizard.mdx`, `editor.mdx`, `adapters.mdx`, `external-site-guide.mdx`, `docker.mdx`, `cli.mdx`, `security.mdx`, `architecture.mdx`.
- `lib/docs/docs-loader.ts` — reads from `docs/`, renders via existing markdown pipeline. Sidebar from frontmatter `order` + `category`.
- `app/docs/page.tsx`, `app/docs/[slug]/page.tsx` — replaces current stub.
- `.github/workflows/release.yml` — on tag, publish `create-briter-app` to npm and `briter:latest` to GHCR.
- `CHANGELOG.md`, rewritten `README.md`, `LICENSE` (MIT recommended).

**Reuse:** `lib/preview/markdown-preview.ts`, Tailwind 4 prose styles.

**Verify:** `/docs/getting-started` renders fully; sidebar lists all docs. Tag `v0.1.0` locally → workflow dry-run succeeds.

---

## Critical files to be modified or referenced

**Briter scaffold (extend):**
- `lib/config/env.ts` — becomes a thin shim over `runtime-config.ts` (M0).
- `lib/config/paths.ts` (new, M0) — central path resolution.
- `lib/app/services.ts` — async DI root; adapter dispatch (M5).
- `lib/adapters/site-adapter.ts` — contract extends in M2 and M4.
- `lib/adapters/local-mdx-site-adapter.ts` — gains `getAllowedPaths`, `getReaderHref`.
- `lib/content/file-content-repository.ts` — no changes needed; already does the right thing.
- `lib/uploads/image-upload-service.ts` — internal pipeline swapped (M4).
- `lib/worker/git-sync-worker.ts` — uses path-validator (M4).
- `lib/queue/disk-job-queue.ts`, `lib/queue/job.ts` — schema gains `nextRunAt`, `lastError` (M4).
- `components/post-editor.tsx` — autosave, scroll-sync, preview-token UI (M3).
- `components/dashboard.tsx` → `components/admin/dashboard.tsx` (M3).
- `app/layout.tsx` — admin chrome only; `(public)/layout.tsx` is separate (M2).

**Personal-site (port from):**
- `lib/auth.ts`, `lib/admin-session.ts`, `lib/login-limiter.ts`, `lib/session-secret.ts`, `lib/require-admin.ts`, `lib/preview-token.ts` (M1, M3).
- `lib/images.ts`, `lib/storage-budget.ts`, `lib/rss.ts` (M2, M4).
- `scripts/run-git-sync-worker.mjs`, `scripts/reset-admin-password.mjs` (M1, M4).
- `components/admin/editor.tsx` (scroll-sync hook, M3), `components/admin/sync-queue-badge.tsx`, `components/admin/usage-bar.tsx` (M3).
- `app/admin/api/login/route.ts`, `app/admin/api/notes/route.ts` patterns (M1).

## Cross-cutting architecture notes

1. **Two layouts, two route groups.** `(public)` and `(admin)`. Middleware gates `(admin)`; `(public)` is always open. Reader and writer chromes never collide.
2. **Adapter dictates mode.** `local-mdx` → Briter is the blog. `git-target` → Briter pushes; `/posts*` 308s out. Wizard picks; settings allows change.
3. **Secrets isolation.** `storage/secrets.json` is 0600 and never logged. `storage/config.json` is safe-to-read (no password hash, no TOTP secret, no session secret).
4. **Worker shares filesystem with web.** In Docker, both services mount `./storage` and `./content` at identical paths so queue file paths resolve from both sides.
5. **Optional TOTP.** Default off in wizard (single-user spirit). Personal-site is paranoid by design; Briter relaxes the default but keeps the path.
6. **bcryptjs over bcrypt.** Pure JS; smaller Docker image; slower hash is fine for single-user.
7. **CLI template is built at publish-time.** `scripts/build-template.mjs` snapshots the scaffold into `packages/create-briter-app/template/`. Avoids runtime symlink fragility.

## Risks and decisions to revisit before/during execution

- **External worktree must be local.** v1 requires the external git repo to live on the same filesystem (mounted in Docker). HTTP-based commit via the GitHub API is v1.1.
- **Wizard re-onboarding.** No in-app "reset everything" — users delete `storage/config.json` + `storage/secrets.json` and restart. `scripts/reset-admin.mjs` covers password-only.
- **Theme system already exists** in the scaffold and is more polished than personal-site's. Don't port personal-site styling — keep Briter's theme tokens.
- **Personal-site `_featured.json` does not port.** Briter stays generic; personal-site keeps that feature in its own code (rendered separately, outside Briter's admin).
- **Docs in-app vs static export.** Recommend also exporting `/docs` to a GitHub Pages site post-M8 so docs are reachable without running Briter. Cheap.

## Verification end-to-end

After all milestones, this sequence must work:

```bash
# Path A — CLI scaffold
bunx create-briter-app /tmp/blog-a
cd /tmp/blog-a
bun run dev
# → browser to localhost:3075 → setup wizard → write a post → publish → see it at /posts/<slug>

# Path B — Docker
git clone https://github.com/<user>/briter /tmp/blog-b
cd /tmp/blog-b && docker compose up -d
curl localhost:3075/api/health   # → ok
# → browser to localhost:3075 → setup → write → publish

# Path C — Personal-site dogfood
# Briter container configured with git-target adapter pointed at personal-site repo.
# Write a note in Briter → file lands in personal-site/content/notes → revalidate webhook → akashmishra.com shows it.
```

Tests required:
- Existing scaffold tests (`bun test`) must continue passing throughout.
- New unit tests per milestone: `lib/config/runtime-config.test.ts` (M0), `lib/auth/*.test.ts` (M1), `app/feed.xml/route.test.ts` (M2), `lib/preview/preview-token.test.ts` (M3), `lib/uploads/image-pipeline.test.ts` (M4), `lib/adapters/git-target-site-adapter.test.ts` (M5).
- One Playwright smoke per milestone (setup wizard, autosave, share-preview, adapter publish).

## Suggested branching for the executing agent

One branch per milestone, opened as a PR, reviewed, merged. Milestone names map to branch names:

```
main
├── m0/runtime-config
├── m1/setup-wizard-and-auth
├── m2/public-reader-rss-seo
├── m3/editor-polish-preview-tokens
├── m4/worker-and-image-hardening
├── m5/git-target-adapter
├── m6/cli-and-docker
├── m7/personal-site-migration   (touches both repos; bring up alongside m6)
└── m8/docs-and-release
```

M0–M6 are linear (each depends on the previous). M7 depends on M5 + M6. M8 can begin in parallel with M7 since docs reference completed features.
