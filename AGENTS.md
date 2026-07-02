# AGENTS.md for MiMo-Code

## 项目记忆规则（自动执行）

**每次完成开发任务后，必须自动执行 dev-memory 技能，记录开发活动到 `.mimocode/memory/` 目录。**

### 触发条件

完成以下任一操作时自动触发：
- 创建新文件 / 修改现有文件 / 删除文件
- 修复 Bug / 添加新功能
- 重构代码 / 更新配置
- 完成文档更新

### 执行步骤

1. 读取 `.mimocode/memory/MEMORY.md` 获取项目概况
2. 读取 `.mimocode/memory/username_YYYY-MM-DD.md`（今日日志，username 为当前用户名）
3. 如果文件不存在，创建并初始化基本结构
4. 在今日日志末尾追加记录：

```markdown
## 开发活动标题 (HH:MM:SS)

**类型**: 新增/修改/删除/修复/重构

**文件**:
- `path/to/file1`

**内容**:
变更描述...

---
```

5. 如有重大变更（新增模块、技术栈变更等），更新 `MEMORY.md` 的 `## 最后更新` 部分

**日志文件格式**：`username_YYYY-MM-DD.md`（如 `Administrator_2026-07-01.md`）

## Repository Structure

- **Monorepo**: Turborepo with 17 package directories, but only 5 are registered workspaces: `packages/opencode`, `packages/ui`, `packages/sdk/js`, `packages/console/*`, `packages/slack`
- **Default branch**: `main` (CI runs on both `main` and `dev`)
- **Core package**: `packages/opencode` — CLI entry point (`src/index.ts` with yargs commands)
- **UI package**: `packages/ui` — SolidJS component library
- **SDK**: `packages/sdk/js` — Generated JS SDK (regenerate with `./packages/sdk/js/script/build.ts`)
- **Other packages** (not all registered as Bun workspaces): `app` (web UI), `desktop` (Tauri native), `plugin` (`@mimo-ai/plugin`), `web` (Astro+Starlight docs), `shared`, `script`, `storybook`, `extensions`, `console/*`, `containers`, `enterprise`, `function`, `identity`

## Development Commands

```bash
# Run TUI CLI
cd packages/opencode && bun run dev

# Run against a specific directory
bun dev <directory>
bun dev .  # run in repo root

# Typecheck (runs entire monorepo via Turbo)
bun turbo typecheck

# Lint (oxlint, from repo root)
bun lint

# Run tests (from package directory ONLY — root is guarded)
cd packages/opencode && bun test

# CI test with sharding
cd packages/opencode && bun run test:ci --shard <n>/4

# Additional dev commands
bun dev:desktop    # Run Tauri desktop app
bun dev:web        # Run web app
bun dev:console    # Run console app
bun dev:storybook  # Run Storybook
```

**Critical**: `bun run dev` from root invokes `packages/opencode/script/dev.ts` which uses `--conditions=browser`. If running the TUI directly without the dev launcher, you must pass `--conditions=browser` yourself. Dev launcher sets `MIMOCODE_HOME` to `.dev-home/` for isolated dev state.

## CI/CD

- **Branches**: CI runs on `main` and `dev` branches
- **Workflows**: `lint.yml`, `test.yml`, `typecheck.yml`
- **Test sharding**: Tests run in 4 parallel shards
- **Git identity**: CI uses `ci@mimo.ai` / `mimo-ci`
- **Timeout**: Tests have 8-minute timeout per shard

## Core Focus

- **Primary implementation target**: TUI in `packages/opencode/src/cli/cmd/tui/`
- **Do NOT implement Web/App interfaces** — only TUI is supported
- The TUI is built with SolidJS via `@opentui/solid` (NOT React)

## Testing Constraints

- Tests cannot run from repo root (guard: `root = "./do-not-run-tests-from-root"` in `bunfig.toml`)
- Always run from package directories like `packages/opencode`
- Test preload: `@opentui/solid/preload` + `./test/preload.ts` are auto-loaded by `bunfig.toml`
- Use `tmpdir` fixture from `test/fixture/fixture.ts` for temp directories with automatic cleanup
- Use `testEffect()` helpers from `test/lib/effect.ts` for Effect-based tests
- Use `it.effect()` for tests with TestClock/TestConsole; `it.live()` for real-time/fs/Git tests
- Effect test helpers: `provideTmpdirInstance()`, `tmpdirScoped()`, `provideInstance()` — use these instead of manual runtimes
- Test helpers also include `llm-server.ts`, `mock-llm.ts`, `scripted-llm-server.ts` in `test/lib/`

## Style Guide

### General Principles

- Keep things in one function unless composable/reusable
- Avoid `try`/`catch`; use early returns instead
- Avoid `any` type
- Use Bun APIs (e.g., `Bun.file()`) when possible
- Prefer functional array methods (`flatMap`, `filter`, `map`) over for loops; use type guards on filter
- In `src/config`, use self-export pattern: `export * as ConfigAgent from "./agent"`
- Inline variables when only used once; avoid unnecessary destructuring
- Use dot notation (`obj.a`) instead of destructuring to preserve context
- Prefer `const` over `let`; use ternaries or early returns instead of reassignment

### Schema (Drizzle)

- Use `snake_case` for field names (no redefinition needed in column definitions)

## Tooling

- **Lint**: `bun lint` (oxlint). Type-aware rules enabled. See `.oxlintrc.json` for disabled rules (many Effect/SolidJS-specific suppressions).
- **Typecheck**: `bun turbo typecheck` (monorepo-wide) or `cd packages/opencode && bun typecheck` (single package). Uses `tsgo --noEmit` (TypeScript native preview).
- **Format**: `prettier` (no semicolons, 120 char width)
- **Package Manager**: Bun 1.3+ with exact dependency versioning (`install.exact = true` in `bunfig.toml`)
- **Test Framework**: Bun's native test runner with Effect support
- **Pre-push hook**: Runs bun version check + `bun typecheck` before every push

## Dev Workflow

- Dev launcher (`packages/opencode/script/dev.ts`) automatically injects local extensions from `../../mimoapi/packages/opencode/src/ext` before starting dev server
- Build command (`bun run build`) runs migrations and generates SolidJS code
- Command structure: `packages/opencode/src/cli/cmd/<category>/<command>.ts`
- CLI entry: `packages/opencode/src/index.ts` (yargs with ~20 commands)
- Default command (`$0`): `TuiThreadCommand` in `cli/cmd/tui/thread.ts`

## i18n

- Two layers: TUI (`packages/opencode/src/cli/cmd/tui/i18n/`) and shared UI (`packages/ui/src/i18n/`)
- Merge at runtime by `merge()` in `context/language.tsx`
- Locale files: `en.ts`, `zh.ts`, `zht.ts`, `es.ts`, `fr.ts`, `ja.ts`, `ru.ts`
- Key pattern: `tui.<component>.<description>`
- Append new keys at END of locale files to minimize merge conflicts
- `zh.ts` uses `satisfies Partial<Record<Keys, string>>` — subsets are valid
- `zht.ts` is NOT auto-synced from `zh.ts` — update manually
- Missing keys render as raw key string (no error thrown)
- `useLanguage()` is safe to add to any component — earlier freezes were from structural changes, not i18n

## Path Aliases

Defined in `packages/opencode/tsconfig.json`:
- `@/*` → `./src/*`
- `@tui/*` → `./src/cli/cmd/tui/*`
- `@test/*` → `./test/*`

The `#imports` in `package.json` provide conditional imports for `#db`, `#read-sqlite`, `#pty`, `#hono` (Bun vs Node variants).

## Architecture

- **Effect v4 beta (4.0.0-beta.48)**: `Effect.fork` / `Effect.forkDaemon` don't exist — use `Effect.forkIn(scope)`
- **`Instance.bind(fn)`** required for native addon callbacks (`@parcel/watcher`, `node-pty`, `fs.watch`); not needed for `setTimeout`, `Promise.then`, or Effect fibers
- **VCS detection**: `project.ts` walks up looking for `.git`, falls back to `fakeVcs` if git unavailable
- **Plan file path**: Git repos → `<worktree>/.mimocode/plans/`, non-git → global `XDG` data path
- **MCP config**: Project-level goes in `mimocode.json` at project root (also accepts Claude-style `mcpServers` via `fromClaude()` parser)

## PR Requirements

- **Issue first**: All PRs must reference an existing issue
- **Conventional commits**: PR titles must follow `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:` format
- **Scope optional**: e.g., `feat(app):`, `fix(desktop):`, `chore(opencode):`
- **No AI-generated walls of text**: Keep descriptions short and focused
- **UI changes**: Include screenshots/recordings showing before and after
- **Verification**: Explain how you verified the code works

## SDK Generation

- SDK is generated from API server code
- After API/SDK changes, run: `./script/generate.ts`
- SDK location: `packages/sdk/js`

## Important Notes

- **Voice input**: Requires `sox` (install via `brew install sox` on macOS)
- **WSL clipboard**: Install `xsel` if experiencing garbled text: `sudo apt install xsel`
- **Bun 1.3+ required**: Check with `bun --version`
- **Exact dependency versioning**: `install.exact = true` in `bunfig.toml`
