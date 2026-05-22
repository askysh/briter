# Architecture

## High-level split

### Web app

- owns the writer UI, preview UI, dashboard, and upload endpoint
- reads and writes canonical content files
- enqueues git-sync work instead of pushing directly
- serves uploaded assets through a narrow route handler because standalone
  Next.js does not automatically expose runtime-written files

### Content storage

- canonical source is Markdown or MDX under `content/posts`
- frontmatter carries title, summary, draft flag, publish date, and tags
- uploaded assets live outside `public/` in `storage/uploads/posts`
- each upload gets a content hash and a manifest of responsive variants

### Preview/rendering

- uses a shared markdown pipeline built from `unified`, `remark`, and `rehype`
- powers the dedicated preview route and the editor’s live preview
- stays decoupled from git and deploy concerns

### Queue + worker

- disk-backed queue stores JSON jobs in `storage/queue`
- web app only writes queue files
- worker owns git branch checks, staging, commit, push, retries, and backoff
- dry-run mode is enabled by default for local scaffolding

### Site adapter

- hides target-site conventions from the editor core
- decides URL shapes, content extension, commit message format, and revalidate
  targets
- current scaffold ships with a local MDX adapter but keeps the interface small

## Data flow

1. Writer edits a post in the UI.
2. Save, schedule, or publish persists a file through `FileContentRepository`.
3. The publish service enqueues a `git-sync` job with affected paths.
4. The worker later stages, commits, and pushes from its own git-capable
   worktree.
5. Preview and published views read the file directly; no database mirror exists.

## Security posture in this scaffold

- worker secrets and git push capability are isolated from the editor surface
- upload serving validates filenames instead of exposing directory reads
- auth is intentionally left minimal and local-first for the scaffold; the
  architecture leaves room for tightening it without reworking the content model
