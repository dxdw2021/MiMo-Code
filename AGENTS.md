# AGENTS.md for MiMo-Code

## 项目记忆规则（自动执行）

**每次完成开发任务后，必须执行以下操作：**

1. 读取 `.mimocode/memory/MEMORY.md` 获取项目概况
2. 读取 `.mimocode/memory/username_YYYY-MM-DD.md`（今日日志，username 为当前用户名）
3. 在今日日志末尾追加记录：

```markdown
## [活动标题] (HH:MM:SS)

**类型**: 新增/修改/删除/修复/重构

**文件**:
- `path/to/file1`

**内容**:
变更描述...

---
```

4. 如有重大变更（新增模块、技术栈变更等），更新 `MEMORY.md`

**日志文件格式**：`username_YYYY-MM-DD.md`（如 `Administrator_2026-07-01.md`）

## Repository Structure

- **Monorepo**: Turborepo with 5 workspaces (`packages/opencode`, `packages/ui`, `packages/sdk/js`, `packages/console/*`, `packages/slack`)
- **Default branch**: `main` (CI runs on both `main` and `dev`)
- **Core package**: `packages/opencode` — TUI CLI entry point (`src/index.ts` with yargs commands)
- **UI package**: `packages/ui` — SolidJS component library
- **SDK**: `packages/sdk/js` — Generated JS SDK (regenerate with `./packages/sdk/js/script/build.ts`)

## Development Commands

```bash
# Run TUI CLI
cd packages/opencode && bun run dev

# Typecheck (runs entire monorepo)
bun turbo typecheck

# Lint
bun lint

# Run tests (from package directory only — root is guarded)
cd packages/opencode && bun test

# CI test with sharding
cd packages/opencode && bun run test:ci --shard <n>/4
```

## Core Focus

- **Primary implementation target**: TUI in `packages/opencode/src/cli/cmd/tui/`
- **Do NOT implement Web/App interfaces** — only TUI is supported

## Testing Constraints

- Tests cannot run from repo root (guard: `root = "./do-not-run-tests-from-root"` in bunfig.toml)
- Always run from package directories like `packages/opencode`
- Use `tmpdir` fixture from `test/fixture/fixture.ts` for temp directories with automatic cleanup
- Use `testEffect()` helpers from `test/lib/effect.ts` for Effect-based tests
- Use `it.effect()` for tests with TestClock/TestConsole; `it.live()` for real-time/fs/Git tests

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

- **Lint**: `bun lint` (oxlint)
- **Typecheck**: `bun turbo typecheck` (runs entire monorepo) or `cd packages/opencode && bun typecheck`
- **Format**: `prettier` (no semicolons, 120 char width)
- **Package Manager**: Bun with exact dependency versioning (`install.exact = true` in bunfig.toml)
- **Test Framework**: Bun's native test runner with Effect support

## Dev Workflow

- Dev launcher (`packages/opencode/script/dev.ts`) automatically injects local extensions from `../../mimoapi/packages/opencode/src/ext` before starting dev server
- Build command (`bun run build`) runs migrations and generates SolidJS code
- Command structure: `packages/opencode/src/cli/cmd/<category>/<command>.ts`
