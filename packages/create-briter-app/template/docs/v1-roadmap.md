# Pragmatic V1 Roadmap

## Phase 1: Make the scaffold executable

- finish auth for the writer surface
- add stronger validation on frontmatter and publish actions
- verify the upload pipeline against real screenshots
- add end-to-end tests around write, upload, preview, and queue status

## Phase 2: Make worker boundaries production-safe

- run the worker in a separate process or container with git credentials
- point worker git operations at a full worktree instead of the web runtime dir
- add structured job logs and queue inspection tooling
- implement real retry visibility in the dashboard

## Phase 3: Make publishing fast for real sites

- add site-specific revalidation hooks
- implement content-only fast-path deploy triggering
- support external site preview and publish URLs through adapters

## Phase 4: Make the adapter seam reusable

- extract a more formal site adapter contract
- add a second adapter to prove the core is not overfit
- package the editor core and worker pieces for reuse
