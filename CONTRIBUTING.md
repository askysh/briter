# Contributing to Briter

Thanks for considering a contribution. Read [CONSTITUTION.md](CONSTITUTION.md) first — it defines what Briter is and what it explicitly is not. Changes that conflict with the constitution don't merge regardless of quality.

## Before you open a PR

- **Bug fixes and small improvements** — open an issue or just send a PR. If it's clearly in scope, it will be reviewed.
- **New features** — open an issue first and describe what you want to add. Wait for a maintainer to confirm it's in scope before writing code. This saves you from building something that won't merge.
- **Docs improvements** — always welcome. No issue required.

## Setting up

```bash
git clone https://github.com/askysh/briter.git
cd briter
bun install
bun run dev
```

Run the full test suite:

```bash
bun run test
bun run lint
```

Run end-to-end tests (requires a running dev server):

```bash
bun run test:e2e
```

## Code standards

- **TypeScript everywhere.** No `any` without a comment explaining why.
- **Zero lint warnings.** `bun run lint` must exit clean. Fix dependency arrays properly; don't suppress with `eslint-disable` unless it's a documented false positive.
- **Tests for new logic.** New library modules (`lib/`) need unit tests. Use Bun's built-in test runner. The coverage threshold is enforced — don't lower it.
- **Follow the existing patterns.** Look at how similar code is written before introducing new patterns. Consistency matters more than novelty.
- **No new dependencies without justification.** Briter's install footprint matters. Comment in the PR why the dependency is necessary.

## Commit style

Use the conventional commit format:

```
type(scope): short description

Longer explanation if needed.
```

Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `build`.

Examples:
- `feat(editor): add word count to toolbar`
- `fix(worker): handle missing queue dir on first run`
- `docs: add CLI scaffolder guide`

## Pull request checklist

Before opening a PR, verify:

- [ ] `bun run lint` exits with zero warnings
- [ ] `bun run test` passes
- [ ] New public functions have JSDoc comments
- [ ] If you added a new lib module, there is a corresponding `*.test.ts`
- [ ] CHANGELOG.md has an entry under `[Unreleased]`

## What will not be merged

- Features that conflict with [CONSTITUTION.md](CONSTITUTION.md)
- Multi-user, team, or SaaS features
- New dependencies that duplicate existing functionality
- Code that lowers the test coverage threshold
- PRs without a matching issue for non-trivial features

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

By contributing, you agree your contributions will be licensed under the MIT License.
