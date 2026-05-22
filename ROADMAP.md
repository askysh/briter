# Briter Roadmap

## Stable (shipped in v0.1.0)

- Runtime config with layered resolution (defaults → env → config file)
- Setup wizard with site identity, admin password, optional TOTP
- Two-pane editor with autosave, scroll-sync, paste-to-upload
- Public reader with RSS, sitemap, SEO metadata (OpenGraph, JSON-LD)
- Image pipeline: AVIF/WebP variants, EXIF stripping, storage budget
- Preview tokens for draft sharing (24h TTL)
- Git-sync worker with exponential backoff, path validation, lock runner
- Adapter system: `local-mdx` (built-in reader) and `git-target` (push to external site)
- Docker Compose + CLI scaffolder install paths

## Building now

- Personal-site migration dogfood (proving git-target adapter end-to-end)
- Media storage abstraction (disk + S3-compatible providers)
- Markdown (.md) format support alongside MDX
- Editorial workflow: draft → scheduled → published → archived lifecycle
- Analytics integrations: Plausible, Umami, Google Analytics
- One-click deploy configs for Railway, Render, Fly.io
- Agent-installable spec for automated setup

## Exploring

- Theme contract with swappable themes and custom CSS
- Revision history with git-backed timeline
- Guided install script (`curl | bash`)
- In-app docs exported to GitHub Pages
- Additional content formats beyond MDX/Markdown (based on adapter demand)
