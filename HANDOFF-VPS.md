# VPS Deployment & Integration Handoff

> Prompt for a Claude Code session running ON the VPS that hosts akashmishra.com.
> Goal: deploy Briter as a service and wire it to the live personal site via the
> git-target adapter, without breaking the live site.

## Context

- **Briter** (https://github.com/askysh/briter, branch `main`, current at `6ce187e`)
  is a self-hosted, single-user, git-backed blog editor: Next.js 16 + Bun, no
  database. Posts are MDX files; a worker commits/pushes them. Read
  `CONSTITUTION.md` (product boundaries), `docs/adapters.mdx`, `docs/docker.mdx`.
- **Personal site**: https://github.com/askysh/personal-site.git — the live site
  at https://akashmishra.com, already deployed on this VPS. Its stack must be
  inspected, not assumed.
- **Owner**: Akash (GitHub `askysh`). All commits in BOTH repos are authored as
  askysh. Claude adds its standard Co-Authored-By trailer.
- Recent state: full editor toolbar/UX redesign shipped; login simplified
  (password only, TOTP optional); fixed: queue crash on legacy job files,
  config-merge NaN, YAML crash on draft save. `bun run lint`, 191 unit tests,
  `bun run build`, and e2e all pass as of handoff.

## Mission (in order)

1. **Survey the VPS first — read-only.** Identify: how akashmishra.com is
   served (nginx/caddy/traefik? docker? systemd? static files?), where the
   personal-site repo/checkout lives, how it deploys (CI? git pull? rebuild
   command?), available RAM/disk, whether Docker + Compose exist. Do not change
   anything in this step; write findings down.
2. **Deploy Briter as its own service** (decision already made: Briter runs
   standalone next to the site, NOT inside it):
   - Clone askysh/briter to e.g. `/opt/briter`, `docker compose up -d`
     (services `web` on port 3075 + `worker`; volumes `./storage`, `./content`).
   - Reverse-proxy a subdomain (suggest `write.akashmishra.com`) to port 3075
     with TLS, using whatever proxy the site already uses.
   - Complete the setup wizard (Akash sets the password himself — do not choose
     one for him; the API field is `password`, min 10 chars).
3. **Wire the git-target adapter** (Briter Settings → Adapter, or
   `storage/config.json`):
   - Ensure a checkout of personal-site exists on the same filesystem and is
     mounted into BOTH Briter containers (add a volume to compose, e.g.
     `/opt/personal-site:/repos/personal-site`).
   - Configure: worktree path, content subpath, upload subpath, content
     extension, frontmatter preset (`next-mdx` / `astro` / `hugo` — match the
     site's actual stack), published URL template
     (`https://akashmishra.com/<blog-path>/{slug}`), optional revalidate webhook.
   - Git auth for pushes: a dedicated SSH deploy key (write access to
     personal-site only) or a fine-grained PAT scoped to that repo. Set
     `BRITER_GIT_AUTHOR_NAME/EMAIL` to Akash's identity.
   - Note: worker defaults to DRY RUN (`BRITER_WORKER_DRY_RUN=1`). Keep dry run
     on until an end-to-end test passes; only then set it to `0`.
4. **Migrate existing blog posts** so Briter can edit them:
   - Find existing posts in personal-site. Map their frontmatter to Briter's
     schema (`title`, `summary`, `tags`, `draft`, `publishedAt`). Write a small
     migration script; keep slugs and URLs IDENTICAL — no broken links.
   - Copy (don't move) posts into Briter's `content/posts/` first; verify they
     round-trip (open in editor, save, diff output vs original). Only after
     verification decide whether the site reads from the adapter-pushed copies.
   - Back up both `content/` and the personal-site checkout before any bulk
     operation.
5. **End-to-end dogfood test**: create a throwaway post in Briter → publish →
   confirm the worker commits/pushes to a `briter-integration` BRANCH of
   personal-site first → open a preview/staging build of the site → only after
   Akash approves, allow pushes to the production branch.

## Hard safety rules

- **The live site must never break.** Never push directly to personal-site's
  production branch until the branch-based test above has passed and Akash has
  explicitly approved. Never force-push anywhere. Never delete or rewrite
  existing site content/history.
- Before changing nginx/proxy config, snapshot the current config; reload, not
  restart, where possible; verify akashmishra.com still serves 200 after every
  proxy change.
- Backups before migration: tar both repos' working trees (and any site data
  dir) to a timestamped file in `/root/backups` or similar.
- Commit scope discipline: Briter code/config changes → askysh/briter repo;
  site content/code changes → askysh/personal-site repo. Never commit files of
  one repo into the other. Briter's `storage/secrets.json` and any keys must
  never be committed anywhere.
- Briter is single-user by design; do not add multi-user/team features
  (see CONSTITUTION.md).

## Known open items (fix opportunistically, don't block deploy)

- No in-app password change or CLI reset; recovery = edit
  `storage/secrets.json` (bcrypt hash via `bun -e` + bcryptjs).
- GitHub reports ~26 Dependabot vulnerabilities (14 high) — triage before or
  shortly after go-live.
- Two stale May-era queue jobs may exist in local dev storage only; fresh VPS
  install won't have them.
- Next.js 16 middleware deprecation warning (documented ADR; cosmetic).

## Verification commands (Briter repo)

```bash
bun run lint
bun test --path-ignore-patterns 'e2e/**'
bun run build
bun run test:e2e   # needs fresh storage/, see HANDOFF-FOUNDATION.md
```
