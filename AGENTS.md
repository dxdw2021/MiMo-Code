- 全程使用中文进行交流，所有对话、解释和注释一律使用中文。
- Always use superpowers skill instead of builtin plan mode.
- To regenerate the JavaScript SDK, run `./packages/sdk/js/script/build.ts`.
- To regenerate the full SDK (JS + OpenAPI), run `./script/generate.ts`.
- ALWAYS USE PARALLEL TOOLS WHEN APPLICABLE.
- The default branch in this repo is `dev`.
- Local `main` ref may not exist; use `dev` or `origin/dev` for diffs.
- Prefer automation: execute requested actions without confirmation unless blocked by missing info or safety/irreversibility.

## Repo structure

- `packages/opencode`: Core CLI, server, and all business logic. Entry: `src/index.ts` (yargs CLI, script name `mimo`).
- `packages/app`: Web UI, SolidJS + Vite.
- `packages/desktop`: Native desktop app, Electron (wraps `packages/app`).
- `packages/ui`: Shared UI components, SolidJS.
- `packages/shared`: `@mimo-ai/shared` — utilities shared across packages.
- `packages/sdk/js`: `@mimo-ai/sdk` — generated JS client from OpenAPI.
- `packages/console`: Console sub-app (multi-service under `packages/console/*`).
- `packages/plugin`, `packages/script`, `packages/function`, `packages/identity`: Internal workspace packages.
- `infra/`: SST infrastructure (Cloudflare + Stripe + PlanetScale).
- `script/`: Repo-level scripts (generate, release, changelog, etc.).

## Commands

### From repo root

```bash
bun install                  # Install deps (postinstall runs fix-node-pty)
bun dev                      # Run opencode CLI in dev mode (from packages/opencode)
bun dev <directory>          # Run against a specific directory
bun lint                     # oxlint (repo-wide)
bun typecheck                # turbo typecheck (all packages)
```

### From packages/opencode

```bash
bun run build                # Build standalone executable
bun run build:dev            # Build single-platform prod binary
bun test                     # Run tests (bun test --timeout 30000)
bun typecheck                # tsgo --noEmit (NOT tsc)
bun run db generate --name <slug>  # Generate Drizzle migration
```

### From packages/app

```bash
bun run dev                  # Vite dev server
bun run test:unit            # bun test --preload ./happydom.ts ./src
bun run test:e2e             # Playwright tests
```

### From packages/desktop

```bash
bun run dev                  # Electron dev (web only)
```

**Never run `tsc` directly.** Always use `bun typecheck` from a package directory.
**Never run tests from repo root** (guard: `do-not-run-tests-from-root`).

## Testing

- Tests live in `packages/opencode/test/` mirroring `src/` structure.
- **Test fixtures**: Use `tmpdir()` from `test/fixture/fixture.ts` for temp dirs with auto-cleanup.
- **Effect tests**: Use `testEffect(...)` from `test/lib/effect.ts`. Use `it.live(...)` for tests needing real OS behavior (most integration tests).
- `test/preload.ts` sets up isolated env (in-memory SQLite, temp XDG dirs, clean API keys). Import order matters — env vars must be set before any `src/` imports.
- Avoid mocks. Test actual implementation.
- Effect test fixtures: `provideTmpdirInstance(...)` for single temp instance, `tmpdirScoped()` + `provideInstance(...)` for multi-directory tests.

## SDK generation

When you change the API or SDK (e.g. `packages/opencode/src/server/server.ts`):

```bash
./script/generate.ts
```

This regenerates `packages/sdk/js` from OpenAPI and reformats.

## Key architecture notes

### Effect v4 beta

This codebase uses **Effect v4 beta** (`effect@4.0.0-beta.48`). Key differences from v3:

- `Effect.fork` / `Effect.forkDaemon` do not exist. Use `Effect.forkIn(scope)`.
- Use `Effect.gen(function* () { ... })` for composition.
- Use `Effect.fn("Domain.method")` for named/traced effects.

### Instance vs global state

- `Instance` (ALS-based) provides per-project context: `Instance.directory`, `Instance.worktree`, `Instance.project`.
- `InstanceState` (from `src/effect/instance-state.ts`) for per-directory service state that needs cleanup. Uses `ScopedCache` keyed by directory.
- `makeRuntime` (from `src/effect/run-service.ts`) for all services — returns `{ runPromise, runFork, runCallback }`.

### Module shape

Do NOT use `export namespace Foo { ... }`. Use flat top-level exports + self-reexport:

```ts
// src/foo/foo.ts
export const thing = ...
export * as Foo from "./foo"
```

Consumers: `import { Foo } from "@/foo/foo"`.

### Config modules

In `src/config`, follow the self-export pattern in `index.ts` when adding a new config module.

### Database

- Schema: `src/**/*.sql.ts` (snake_case field names, `<entity>_id` joins).
- Migrations: `bun run db generate --name <slug>` → `migration/<timestamp>_<slug>/`.
- Drizzle config: `packages/opencode/drizzle.config.ts`.

### CLI entry

`packages/opencode/src/index.ts` — yargs CLI with script name `mimo`. Commands: `run`, `serve`, `web`, `generate`, `models`, `providers`, `agent`, `upgrade`, `debug`, `stats`, `mcp`, `github`, `export`, `import`, `session`, `db`, `plug`, `acp`, `pr`.

## Style Guide

### General Principles

- Keep things in one function unless composable or reusable
- Avoid `try`/`catch` where possible
- Avoid using the `any` type
- Use Bun APIs when possible, like `Bun.file()`
- Rely on type inference when possible; avoid explicit type annotations or interfaces unless necessary for exports or clarity
- Prefer functional array methods (flatMap, filter, map) over for loops; use type guards on filter to maintain type inference downstream
- In `src/config`, follow the existing self-export pattern at the top of the file (for example `export * as ConfigAgent from "./agent"`) when adding a new config module.

Reduce total variable count by inlining when a value is only used once.

```ts
// Good
const journal = await Bun.file(path.join(dir, "journal.json")).json()

// Bad
const journalPath = path.join(dir, "journal.json")
const journal = await Bun.file(journalPath).json()
```

### Destructuring

Avoid unnecessary destructuring. Use dot notation to preserve context.

```ts
// Good
obj.a
obj.b

// Bad
const { a, b } = obj
```

### Variables

Prefer `const` over `let`. Use ternaries or early returns instead of reassignment.

```ts
// Good
const foo = condition ? 1 : 2

// Bad
let foo
if (condition) foo = 1
else foo = 2
```

### Control Flow

Avoid `else` statements. Prefer early returns.

```ts
// Good
function foo() {
  if (condition) return 1
  return 2
}

// Bad
function foo() {
  if (condition) return 1
  else return 2
}
```

### Schema Definitions (Drizzle)

Use snake_case for field names so column names don't need to be redefined as strings.

```ts
// Good
const table = sqliteTable("session", {
  id: text().primaryKey(),
  project_id: text().notNull(),
  created_at: integer().notNull(),
})

// Bad
const table = sqliteTable("session", {
  id: text("id").primaryKey(),
  projectID: text("project_id").notNull(),
  createdAt: integer("created_at").notNull(),
})
```

## Effect code conventions

- Use `Schema.Class` for multi-field data, `Schema.brand` for single-value types, `Schema.TaggedErrorClass` for typed errors.
- Prefer `yield* new MyError(...)` over `yield* Effect.fail(new MyError(...))` for direct early-failure.
- Use `Effect.callback` for callback-based APIs.
- Prefer `DateTime.nowAsDate` over `new Date(yield* Clock.currentTimeMillis)`.
- For background loops: `Effect.repeat` / `Effect.schedule` with `Effect.forkScoped`.
- Use `Effect.cached` for deduplication of concurrent computations.
- `Instance.bind(fn)` for native addon callbacks that need Instance context. Not needed for `setTimeout`, `Promise.then`, or Effect fibers.
- Prefer Effect services over raw platform APIs: `FileSystem`, `HttpClient`, `Path`, `ChildProcessSpawner`, etc.

## Lint

- Linter: oxlint with type-aware rules (`oxlint-tsgolint`).
- Config: `.oxlintrc.json` at repo root.
- Key disabled rules: `require-yield` (Effect generators), `no-shadow` (Effect closures), `no-new` (intentional side-effectful constructors).
- Formatter: Prettier (semi: false, printWidth: 120).

## CI

- Typecheck workflow: `.github/workflows/typecheck.yml` — runs `bun typecheck` on push/PR to `dev`.
- Pre-push hook: `.husky/pre-push` — validates bun version + runs `bun typecheck`.
