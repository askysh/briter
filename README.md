# Briter

Briter is a small, opinionated writer app for people who self-host their own
sites and keep content in plain files.

This scaffold keeps the core shape explicit from day one:

- writer-first UI with a plain textarea and live preview
- content stored as Markdown or MDX in a git repo
- image uploads treated as first-class input
- a disk-backed git-sync queue
- a separate worker boundary for commit and push
- a site adapter seam so the editor core is not welded to one site forever

## Stack

- Next.js App Router
- TypeScript
- Bun for scripts and tests
- Tailwind CSS 4
- `gray-matter` for frontmatter
- `unified` + `remark` + `rehype` for preview rendering
- `sharp` for image variants

## Local setup

```bash
bun install
bun run dev
```

Run the worker separately:

```bash
bun run worker
```

## Important directories

- `app/` — routes, API handlers, and upload streaming route
- `components/` — dashboard, editor, and preview UI
- `lib/content/` — file-backed post model and repository
- `lib/uploads/` — upload service and manifest types
- `lib/queue/` — disk-backed queue model
- `lib/worker/` — git worker client and runner
- `docs/` — product philosophy, architecture, local development, scope, roadmap

## Notes on scope

This scaffold is single-user first and intentionally avoids multi-tenant SaaS
machinery. The canonical source of truth is still the content repo, not a
database.
