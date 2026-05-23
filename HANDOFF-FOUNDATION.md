# Foundation Milestone Handoff

**Branch:** `foundation/stabilize-and-docs`  
**Milestone:** Foundation Stabilization and Docs  
**Status:** Complete after verification and follow-up fixes on 2026-05-23. No PR was opened and no tag was pushed.

---

## Verified Ground Truth

- The working branch is `foundation/stabilize-and-docs`.
- `git log --oneline main..foundation/stabilize-and-docs` is linear. The live history contains one `docs: add ROADMAP.md` commit (`006d2e3`); the earlier duplicate ROADMAP claim is not present in the current branch history.
- The prior untracked `HANDOFF-M0-M6-2026-05-22.html` artifact is now ignored in `.gitignore`.
- Every artifact in the prior file-existence table exists:
  - `CONSTITUTION.md`, `README.md`, `ROADMAP.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `LICENSE`, `CHANGELOG.md`
  - 10 root docs MDX files under `docs/*.mdx`
  - `lib/docs/docs-loader.ts`, `app/docs/page.tsx`, `app/docs/[slug]/page.tsx`
  - issue templates, PR template, release workflow, middleware ADR, E2E smoke test, and package version `0.1.0`
- `EXECUTION-PLAN.md` does not exist at the repository root. The execution plan used for verification is `briter-v1-ship-it-as-a-standalone-installable-app.md`.

---

## Verification Evidence

| Check | Result |
| --- | --- |
| `bun run lint` | exit 0 |
| `bun run test` | exit 0, 162 pass, 0 fail, 24 files |
| `bun run build` | exit 0; routes compiled. Existing Next.js middleware deprecation warning remains. |
| `bun run build:template` | exit 0; regenerated `packages/create-briter-app/template` |
| Release workflow YAML parse | exit 0 via Ruby `YAML.load_file` |
| `bun run test:e2e` | exit 0, 5 passed in 4.9s against a live dev server |

The Playwright run used temporary fresh `storage/` and `content/` folders, then restored the local runtime folders afterward. The dev server emitted React dev-mode CSP `eval()` warnings and the existing Next middleware deprecation warning; these did not fail the run.

---

## Completed Follow-Up Work

- Replaced the placeholder release workflow with real publish steps:
  - `bun publish --access public` from `packages/create-briter-app`, using `secrets.NPM_TOKEN`
  - GHCR login with `secrets.GITHUB_TOKEN`
  - Docker build and push to `ghcr.io/${{ github.repository }}:latest` and `ghcr.io/${{ github.repository }}:${{ github.ref_name }}`
- Added workflow permissions for `contents: read` and `packages: write`.
- Regenerated the CLI template snapshot so publish-time template contents match the current scaffold, docs, tests, and security fixes.
- Fixed first-boot routing discovered by Playwright: `/admin` redirects to `/login`, and `/login` now server-redirects unconfigured instances to `/setup`.
- Added `/test-results` to `.gitignore` for Playwright artifacts.

---

## Security Review

Reviewed auth/session handling, bcrypt/TOTP setup, file uploads, upload serving, git-sync worker path staging, preview-token HMAC, markdown/docs rendering, CSP/security headers, and secret storage.

### Fixed

- **Medium: git-sync worker path traversal.** `lib/worker/path-validator.ts` previously accepted adapter-allowed prefixes such as `content/../scripts/deploy.sh`. It now rejects absolute paths, backslashes, empty segments, `.`, and `..` before applying adapter allowlists. Regression coverage added in `lib/worker/path-validator.test.ts`.
- **Medium: session tokens had no server-side expiry enforcement.** `lib/auth/session.ts` now rejects signed session tokens older than seven days, matching the cookie lifetime. Regression coverage added in `lib/auth/auth.test.ts`.

### Reviewed, No Code Change

- Markdown rendering uses `remark-rehype` without raw HTML support, so post and docs HTML insertion does not render arbitrary raw HTML from Markdown by default.
- Upload serving validates hash-shaped image filenames with `isSafeUploadPath` and uses `basename` before reading from `env.uploadRoot`.
- Preview tokens use HMAC-SHA256, slug binding, expiry checks, and timing-safe signature comparison.
- Secrets are stored in `storage/secrets.json` with chmod `0600` on POSIX and are excluded by `storage/.gitignore`.

### Flagged For Human Decision

- State-changing API routes rely on the session cookie's `SameSite=Lax` posture and do not implement explicit CSRF origin/token checks. This may be acceptable for a single-user self-hosted app, but should be revisited before wider hosted or multi-user deployment.
- `middleware.ts` remains in place with a documented ADR, but Next.js 16 emits a deprecation warning recommending the newer proxy convention. This is not a security issue, but it is a future maintenance item.

---

## Not Done

- No PR opened.
- No `v0.1.0` tag created or pushed.
- The release workflow was validated syntactically but not triggered.
- M7 dogfood migration and product-expansion work were not started.
