# Local Development

## Prerequisites

- Bun 1.3+
- a writable local checkout

## Install and run

```bash
bun install
bun run dev
```

Run the worker in another terminal:

```bash
bun run worker
```

By default the worker is dry-run only. It will process queue jobs without
committing or pushing.

## Useful environment variables

- `BRITER_APP_ROOT`
- `BRITER_CONTENT_ROOT`
- `BRITER_UPLOAD_ROOT`
- `BRITER_QUEUE_ROOT`
- `BRITER_GIT_WORKTREE`
- `BRITER_GIT_BRANCH`
- `BRITER_GIT_REMOTE`
- `BRITER_GIT_AUTHOR_NAME`
- `BRITER_GIT_AUTHOR_EMAIL`
- `BRITER_WORKER_DRY_RUN`
- `BRITER_UPLOAD_STORAGE_LIMIT_BYTES`

## Recommended first steps after scaffolding

1. Point `BRITER_CONTENT_ROOT` and `BRITER_UPLOAD_ROOT` at the real target repo.
2. Replace dry-run git worker mode with a container or sidecar that has repo
   write access.
3. Swap the local site adapter for a target-site adapter that knows the real
   publish URL and revalidation strategy.
