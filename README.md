# Briter

**Start a blog you own.**

Briter is a self-hosted blog editor. Install it, point a domain at it, write.
Your posts are Markdown files backed by git. No database, no vendor lock-in, no monthly fee.

<!-- TODO: Record and add GIF after dogfood phase -->
<!-- [15-second GIF of setup wizard → writing a post → seeing it published] -->

## Get started

### Docker (recommended)

```bash
git clone https://github.com/askysh/briter.git
cd briter
docker compose up -d
```

Open http://localhost:3075, complete the setup wizard, and start writing.

### CLI

```bash
bunx create-briter-app my-blog
cd my-blog
bun run dev
```

### One-click deploy

<!-- TODO: Add deploy buttons after platform configs are tested -->
Deploy to Railway · Deploy to Render · Deploy to Fly.io

## What you get

- **Setup wizard** — site name, password, done. No config files to edit.
- **Two-pane editor** — Markdown on the left, live preview on the right. Autosave, scroll-sync, paste-to-upload images.
- **Built-in public reader** — your blog renders out of the box with RSS, sitemap, and SEO metadata. Or use an adapter to push content to your existing site.
- **Image pipeline** — drag-and-drop upload with automatic AVIF/WebP variants, EXIF stripping, and storage budget.
- **Git-backed** — every publish is a git commit. Full history, full portability.
- **Docker or bare metal** — `docker compose up` or `bun run dev`. Your choice.
- **Single user, single instance** — no team features, no user management. Just you and your words.

## Docs

[Getting started](docs/getting-started.mdx) · [Setup wizard](docs/setup-wizard.mdx) · [Writing & publishing](docs/editor.mdx) · [Adapters](docs/adapters.mdx) · [Docker deployment](docs/docker.mdx) · [Security](docs/security.mdx) · [Architecture](docs/architecture.mdx)

## Built with

Next.js 16 · Bun · Tailwind 4 · MDX · Sharp

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Read [CONSTITUTION.md](CONSTITUTION.md) first — it defines what Briter is and what it isn't.

## License

MIT
