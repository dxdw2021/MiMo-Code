# AGENTS.md

## Quick reference

| Action | Command |
|---|---|
| Install deps | `bun install` (root) |
| Dev server (TUI) | `bun dev` (root) |
| Lint | `bun lint` (root, runs oxlint) |
| Typecheck all packages | `bun typecheck` (root, runs Turborepo) |
| Typecheck one package | `bun typecheck` (from package dir, runs `tsgo --noEmit`) |
| Run tests | `bun test` (from `packages/opencode`) |
| Run single test file | `bun test path/to/file.test.ts` (from `packages/opencode`) |
| Run tests with JUnit | `bun run test:ci` (from `packages/opencode`) |
| Build standalone binary | `bun run build` (from `packages/opencode`) |
| Regenerate JS SDK | `./packages/sdk/js/script/build.ts` |
| Generate config schemas | `bun run script/schema.ts` (from `packages/opencode`) |

## Monorepo structure

Bun workspaces + Turborepo. `packageManager: bun@1.3.14`.

| Package | Path | Purpose |
|---|---|---|
| `@mimo-ai/cli` | `packages/opencode` | Core CLI, server, TUI, agents, tools, storage — the main package |
| `@mimo-ai/shared` | `packages/shared` | Shared utilities (error types, filesystem, config helpers) |
| `@mimo-ai/sdk` | `packages/sdk/js` | TypeScript SDK for the MiMoCode API |
| `@mimo-ai/plugin` | `packages/plugin` | Plugin SDK for extending MiMoCode |
| `@mimo-ai/ui` | `packages/ui` | Shared SolidJS UI components + i18n |
| `packages/app` | `packages/app` | Web UI (SolidJS) |
| `packages/desktop` | `packages/desktop` | Electron desktop app |
| `packages/console` | `packages/console` | Console sub-workspace |
| `packages/script` | `packages/script` | Build/publish scripts |

Workspace globs: `packages/*`, `packages/console/*`, `packages/sdk/js`, `packages/slack`.

## Core focus

The **TUI** (terminal UI) at `packages/opencode/src/cli/cmd/tui/` is the primary interface. It's built with SolidJS + [opentui](https://github.com/sst/opentui). Web and desktop interfaces exist but are secondary.

## Architecture highlights

- **Entry**: `packages/opencode/src/index.ts` — yargs CLI with 22+ commands. `TuiThreadCommand` is the `$0` default (launches TUI).
- **Framework**: Effect v4 beta (`4.0.0-beta.48`) for dependency injection, error handling, and service composition. `Effect.fork`/`forkDaemon` don't exist — use `Effect.forkIn(scope)`.
- **Database**: SQLite via `bun:sqlite` + Drizzle ORM. Schema files at `src/**/*.sql.ts`. Conditional imports: `#db` resolves to `db.bun.ts` or `db.node.ts` depending on runtime.
- **Conditional imports**: `#db`, `#pty`, `#hono` use Bun's `imports` field in package.json. Resolved differently for `bun` vs `node` runtimes.
- **Path aliases** (opencode package): `@/*` → `./src/*`, `@tui/*` → `./src/cli/cmd/tui/*`, `@test/*` → `./test/*`.
- **CLI framework**: yargs with `cmd()` helper from `src/cli/cmd/cmd.ts`.
- **`--conditions=browser`**: Used in `bun dev` and TUI dev scripts for conditional import resolution.

## Testing

- **Tests MUST run from `packages/opencode`**, never from repo root (`bunfig.toml` guards this with `root = "./do-not-run-tests-from-root"`).
- CI shards tests 4 ways: `bun run test:ci --shard 1/4`.
- Tests require git identity in CI: `git config --global user.email "ci@mimo.ai"` / `user.name "mimo-ci"`.
- Test preload (`test/preload.ts`) sets XDG env vars before any src imports and creates temp dirs.
- Test fixtures: use `tmpdir()` from `test/fixture/fixture.ts` with `await using` for automatic cleanup.
- Effect tests: use `testEffect(Layer)` from `test/lib/effect.ts`. Prefer `it.live(...)` for integration tests, `it.effect(...)` for pure Effect tests.
- Avoid mocks. Test actual implementation.
- Timeout: 30s per test.

## Linting

- **oxlint** (not ESLint). Config: `.oxlintrc.json` with `typeAware: true`.
- Several Effect/SolidJS-specific rule overrides (e.g., `require-yield: off`, `no-unassigned-vars: off`).
- Ignores: `**/node_modules`, `**/dist`, `**/.build`, `**/.sst`, `**/*.d.ts`, `**/sdk.gen.ts`.

## CI

Workflows in `.github/workflows/`:
- `lint.yml` — runs `bun lint` on push/PR to `main`/`dev`.
- `typecheck.yml` — runs `bun typecheck` on push/PR to `main`/`dev`.
- `test.yml` — runs `bun run test:ci` from `packages/opencode` (4 shards, 8min timeout).

## Git hooks

- **Pre-push**: validates Bun version matches `packageManager` in root `package.json`, then runs `bun typecheck` (full Turborepo across all packages).
- Untracked `.ts` files in `packages/opencode/` get picked up by typecheck — remove test artifacts before pushing.

## Code style

- **Prettier**: `semi: false`, `printWidth: 120` (root package.json). Ignores: `sst-env.d.ts`, `packages/desktop/src/bindings.ts`.
- **EditorConfig**: UTF-8, LF line endings, 2-space indent, 80 char line length.
- Keep logic in one function unless composable/reusable.
- Avoid `try`/`catch` — prefer `.catch(...)` or early returns.
- Avoid `any` type.
- Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.
- Avoid `else` statements — prefer early returns.
- Avoid unnecessary destructuring — use dot notation to preserve context.
- Prefer functional array methods (`flatMap`, `filter`, `map`) over `for` loops.
- Inline variables only used once.
- Use Bun APIs when possible (`Bun.file()`, etc.).
- Rely on type inference; avoid explicit type annotations unless needed for exports/clarity.

### Drizzle schema conventions

Use snake_case for field names so column names don't need string redefinition:

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
})
```

### Config module pattern

In `src/config`, follow the existing self-export pattern at the top of the file when adding new config modules:

```ts
export * as ConfigAgent from "./agent"
```

## PR conventions

- PRs must reference an existing issue (`Fixes #123`).
- PR titles follow conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`. Optional scope: `feat(app):`.
- UI changes require screenshots/videos.
- No AI-generated walls of text.
