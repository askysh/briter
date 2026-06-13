# Briter Roadmap

## Stable (shipped in v2.0.0)

- Runtime config with layered resolution (defaults → env → config file)
- Setup wizard with site identity, admin password, optional TOTP, and adapter selection
- Two-pane editor with autosave, scroll-sync, paste-to-upload
- Public reader with RSS, sitemap, SEO metadata (OpenGraph, JSON-LD)
- Image pipeline: AVIF/WebP variants, EXIF stripping, storage budget
- Preview tokens for draft sharing (24h TTL)
- Git-sync worker with exponential backoff, path validation, single-flight stale-lock runner, per-slug dedup, and max-attempt dead-lettering
- Editorial workflow: draft → scheduled → published → archived lifecycle, with future-dated posts held out of git until the publish instant and archive as a reversible hide
- Sections: JSON-defined `highlight`/`list` content config bound to site routes (supersedes the single `_featured.json` pointer)
- Disk-aware storage provisioning: sensed free disk, provisioned upload cap, dashboard reporting
- Same-origin (CSRF) checks on all mutating admin routes
- Adapter system: `local-mdx` (built-in reader) and `git-target` (push to external site), proven end-to-end against a live site
- Theme & layout settings with live-applied host CSS
- In-app documentation browser at `/docs`
- Docker Compose + CLI scaffolder install paths

## Building now

- Media storage abstraction (disk + S3-compatible providers)
- Markdown (.md) format support alongside MDX
- Analytics integrations: Plausible, Umami, Google Analytics
- One-click deploy configs for Railway, Render, Fly.io
- Agent-installable spec for automated setup

## Exploring

- Swappable themes on top of the theme contract
- Revision history with git-backed timeline
- Guided install script (`curl | bash`)
- In-app docs exported to GitHub Pages
- Additional content formats beyond MDX/Markdown (based on adapter demand)
