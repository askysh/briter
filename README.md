# Briter

> A self-hosted writing studio with a built-in public reader, git-native sync, and zero SaaS ceremony.

![Version](https://img.shields.io/badge/version-0.1.0-black)
![Runtime](https://img.shields.io/badge/runtime-bun-ff6b2c)
![Framework](https://img.shields.io/badge/framework-next.js_16-111)
![License](https://img.shields.io/badge/license-MIT-2ea44f)

## Why Briter Exists

Briter is designed for people who want:

- Markdown/MDX as source of truth.
- Their own infra and repos.
- A polished editor with preview and media flow.
- A worker that handles git sync outside the request path.

No dashboard theater. No multi-tenant abstraction tax. Just writing and shipping.

## Core Capabilities

| Surface | What you get |
|---|---|
| Setup | First-boot wizard (`/setup`) writing runtime config + secrets |
| Auth | Password login + optional TOTP |
| Admin | Editor, theme settings, queue-aware dashboard at `/admin` |
| Reader | Public landing + `/posts` + `/posts/[slug]` |
| Publishing | Draft / schedule / publish through file-backed repository |
| Sync | Disk queue + worker commit/push pipeline |
| SEO | `feed.xml`, `sitemap.xml`, `robots.txt` |
| Extensibility | Adapter registry (`local-mdx`, `git-target`) |

## 60-Second Start

```bash
bun install
bun run dev
```

Open:

- `http://localhost:3075/setup` (first boot)
- `http://localhost:3075/admin` (after login)
- `http://localhost:3075/posts` (public reader)

In another terminal:

```bash
bun run worker
```

## Install Modes

### 1. Local

```bash
bun install
bun run dev
```

### 2. Docker

```bash
docker compose up --build
```

### 3. Scaffolder

```bash
bun run build:template
bunx create-briter-app my-blog --with-docker --adapter=local-mdx
```

## Architecture Snapshot

```text
Writer UI  --->  /api/publish  --->  FileContentRepository  --->  content/*.mdx
    |                    |                    |
    |                    v                    v
    |               DiskJobQueue  --->  worker/index.ts  --->  git commit/push
    |
    +-- /api/uploads ---> sharp pipeline ---> storage/uploads/*
```

## Scripts

```bash
bun run dev
bun run build
bun run test
bun run lint
bun run worker
bun run worker:once
bun run build:template
```

## Project Map

```text
app/        routes + APIs
components/ UI
lib/        auth, config, adapters, queue, uploads, worker internals
worker/     runtime worker entry
docs/       markdown docs rendered at /docs
packages/   create-briter-app workspace package
```

## Security Notes

- Secrets are file-backed under `storage/secrets.json`.
- Session cookies are `httpOnly`.
- Sensitive admin APIs enforce authenticated session checks.
- Upload path guards prevent traversal and unsafe extensions.

## Release Notes

`CHANGELOG.md` tracks release deltas.  
`release.yml` is scaffolded for tag-driven publishing flows.

---

If writing is your product loop, Briter is your control plane.
