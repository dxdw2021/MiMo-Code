---
> **/init 规范管控生效中** — 以下规则由 `/init` 命令加载，所有交互强制遵守。
> 语言配置：`zh.ts` — 全程中文模式
---

## 0. 语言强制约束（/init 激活，永久生效）

1. **所有自然语言输出必须使用简体中文**。包括但不限于：需求分析、方案描述、代码解释、报错分析、总结汇报、对话问答。
2. **允许保留英文的例外**：编程语言关键字、函数名/类名、开源项目原名、通用专业缩写（API/SDK/CLI/CI等）、代码内标识符、技术术语（如 lint/typecheck/debug）。
3. **禁止**：整段英文回复、英文总结、默认英文解释需求。
4. **代码注释优先中文**，长说明必须中文，单行注释可用中文简要说明逻辑。
5. **报错提示、指引文案**统一中文展示。
6. 若检测到语言异常，自动切换纯中文模式并提示：
   > 语言配置校验触发，已启用强制中文回复模式，遵循 AGENTS.md 约束执行交互。

## 0.1 开发编码规范

1. **需求分析**：中文梳理需求边界、业务逻辑。
2. **设计文档**：接口说明、数据表设计、流程图文案全部中文。
3. **交付产物**：README、使用说明、部署文档统一中文撰写。
4. **对话回复结构**：
   - 先结论总述
   - 分点展开细节
   - 必要补充注意事项/落地步骤
   - 使用 Markdown 排版，代码块注释使用中文说明逻辑

## 0.2 命令说明

- **`/init`**：重载 AGENTS.md 全部规则，绑定 zh.ts 中文语言配置，重置会话上下文约束。
- **`/review`**：审查未提交更改、commit、branch 或 PR，从近期工作中提取重复工作流封装为可复用 skills。
- **`/distill`**：设定明确停止条件目标，持续运行直到评估机制判定目标达成，达成后自动清理目标（goal clear）。

## Repo structure

- `packages/opencode`: Core CLI, server, and all business logic. Entry: `src/index.ts` (yargs CLI, script name `mimo`).子包内有独立 `AGENTS.md` 提供更详细的 Effect/模块约定。
- `packages/app`: Web UI, SolidJS + Vite。子包内有独立 `AGENTS.md`。
- `packages/desktop`: Native desktop app, Electron (wraps `packages/app`)。子包内有独立 `AGENTS.md`。
- `packages/ui`: Shared UI components, SolidJS。
- `packages/shared`: `@mimo-ai/shared` — utilities shared across packages。
- `packages/sdk/js`: `@mimo-ai/sdk` — generated JS client from OpenAPI。
- `packages/console`: Console sub-app (multi-service: `console/app`, `console/core`, `console/function`, `console/mail`, `console/resource`)。
- `packages/plugin`: `@mimo-ai/plugin` — plugin API definitions (tool/tui)。
- `packages/script`: `@mimo-ai/script` — build/release scripts。
- `packages/function`: `@mimo-ai/function` — Cloudflare Workers functions (GitHub integration)。
- `packages/storybook`: UI 组件 Storybook。
- `packages/slack`: Slack 集成。
- `packages/identity`: Logo 资源（非代码包）。
- `packages/enterprise`: 企业版功能。
- `packages/extensions`: 扩展功能。
- `infra/`: SST infrastructure (Cloudflare + Stripe + PlanetScale)。
- `script/`: Repo-level scripts (generate, release, changelog, etc.)。

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

## 子包 AGENTS.md

各子包内有独立 `AGENTS.md`，提供更细粒度的约束。关键约束摘录：

- **app** (`packages/app/AGENTS.md`)：永远不要尝试重启 app 或 server 进程。本地开发时 backend 跑 4096 端口、app 跑 4444 端口，通过 `http://localhost:4444` 验证 UI 改动。
- **desktop** (`packages/desktop/AGENTS.md`)：渲染进程只能调用 `src/preload` 导出的 `window.api`；主进程在 `src/main/ipc.ts` 注册 IPC handler。
- **opencode** (`packages/opencode/AGENTS.md`)：详细的 Effect/InstanceState/Runtime 约束、模块 shape、数据库 schema 规范。

修改子包代码时，务必阅读对应子包的 `AGENTS.md`。
