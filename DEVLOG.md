# MiMo Code 开发日志

> **版本范围**: `0fc4675` → `e96727a` (Initial open-source release → Merge PR #149)  
> **日期**: 2026-06-11  
> **总计变更**: 111 文件, +4,328 / -5,036 行

---

## 一、变更总览

| 模块 | 文件数 | 新增行 | 删除行 | 说明 |
|------|--------|--------|--------|------|
| `.mimocode/` 配置与定制 | 34 | +3,109 | 0 | 全新目录，含 agent/command/glossary/plugins/skills/themes |
| `.github/` CI 工作流 | 34 | +1 | -3,084 | 大规模裁剪，仅保留 typecheck |
| `packages/opencode/` 核心 | 20 | +286 | -259 | TUI 兼容、安装/卸载、checkpoint 注释清理 |
| `github/` Action 包 | 整目录删除 | 0 | -1,052 | 完全移除 opencode GitHub Action |
| `script/` 发布脚本 | 3 | +90 | -77 | 精简 publish、新增 release.ts |
| `docs/` 文档 | 1 | +109 | 0 | 新增 build-release.md |
| 根目录 & 资源 | 5 | +768 | -6 | 包名/banner/lock/bun.lock |

---

## 二、详细修改内容

### 1. 品牌与身份重塑

#### 包名与仓库迁移

| 旧值 | 新值 | 涉及文件 |
|------|------|----------|
| `opencode` | `mimocode` | `package.json` |
| `https://github.com/anomalyco/opencode` | `https://github.com/XiaomiMiMo/MiMo-Code` | `package.json`, `README.md`, `README.zh.md` |
| `@mimocode/cli-ai` | `@mimo-ai/cli` | `packages/opencode/src/installation/index.ts`, `packages/opencode/src/cli/cmd/uninstall.ts` |
| 小米内部 npm registry `pkgs.d.xiaomi.net` | npmjs.org 公共 registry | `packages/opencode/src/installation/index.ts` |
| `https://opencode.ai/install` | `https://mimo.xiaomi.com/install` | `packages/opencode/src/installation/index.ts` |

**为什么要改**: 开源发布不能使用小米内部制品库，需要切到 npmjs.org 公共 registry；包名需统一到 `@mimo-ai` scope 以符合公开品牌。

#### README 与 Banner

- 英文/中文 README 新增 **官网 + 博客** 链接行
  - EN: `Website | Blog` → `https://mimo.xiaomi.com/en/mimocode`
  - ZH: `官网 | 博客` → `https://mimo.xiaomi.com/zh/mimocode`
- Banner 图片格式 `.jpg` → `.png`（更高清）
- 社区二维码 `community-qrcode.jpg` 更新

**为什么要改**: 开源后用户需要能快速找到官网和社区入口；旧二维码过期需要更新。

---

### 2. `.mimocode/` 定制系统（全新，+3,109 行）

| 子目录 | 内容 | 行数 |
|--------|------|------|
| `agent/translator.md` | 多语言翻译 Agent 指令 | 899 |
| `command/*.md` | AI 辅助命令 (ai-deps, changelog, commit, issues, learn, rmslop, spellcheck) | 192 |
| `glossary/*.md` | 17 种语言的术语表 (ar/br/bs/da/de/es/fr/ja/ko/no/pl/ru/th/tr/zh-cn/zh-tw) | 536 |
| `plugins/tui-smoke.tsx` | Smoke 主题 TUI 插件 | 937 |
| `plugins/smoke-theme.json` | Smoke 主题 JSON 定义 | 223 |
| `skills/effect/SKILL.md` | Effect 技能定义 | 21 |
| `themes/mytheme.json` | 自定义主题模板 | 223 |
| `mimocode.jsonc` | MiMoCode 项目配置 | 10 |
| `tui.json` | TUI 布局配置 | 18 |
| `env.d.ts` | 类型声明 | 4 |

**为什么要改**: 这是 MiMo Code 区别于上游 OpenCode 的核心差异化配置目录，承载了品牌化主题、多语言术语、AI 命令、Agent 人设等。每个项目可以有自己的 `.mimocode/` 实现深度定制。

---

### 3. TUI 纯终端兼容模式（Plain Terminal Mode）

#### 问题背景

macOS 自带的 **Apple_Terminal** 不支持 Kitty 键盘协议、鼠标事件、高级渲染特性，导致 TUI 体验极差（花屏/卡顿/无交互）。

#### 解决方案

新增 `isPlainTerminal()` / `isMacNativeTerminal()` 检测函数，自动降级：

| 特性 | 正常终端 | Plain Terminal |
|------|----------|----------------|
| FPS | 60 | 10 (max 15) |
| Kitty 键盘 | 启用 | 禁用 |
| 鼠标 | 启用 | 禁用 |
| 背景 | 主题色 | 透明 |
| 启动动画 | Spinner | 纯文本 |
| Plugin Slot | 渲染 | 隐藏 |
| 提示 | 无 | "推荐使用 iTerm 或 VS Code 终端" |

**涉及文件**:

| 文件 | 变更 |
|------|------|
| `tui/util/terminal.ts` | 新增 `isMacNativeTerminal()`, `isPlainTerminal()` |
| `tui/app.tsx` | `rendererConfig` 接受 `plainTerminal` 参数，降级渲染 |
| `tui/component/startup-loading.tsx` | Plain 模式用文本替代 Spinner |
| `tui/context/theme.tsx` | 新增 `PLAIN_TERMINAL_THEME`，背景全透明 |
| `tui/routes/home.tsx` | Plain 模式隐藏 plugin slot，显示终端提示 |
| `tui/i18n/*.ts` (7 语言) | 新增 `tui.tips.plain_terminal` 翻译 |

**环境变量控制**: `MIMOCODE_TUI_PLAIN=true/1` 强制启用, `false/0` 强制禁用, 未设置则自动检测 Apple_Terminal。

**为什么要改**: macOS 原生终端用户是真实存在的群体，不做降级直接无法使用，属于 P0 兼容性问题。处理耗时是因为涉及渲染层（FPS/键盘/鼠标/主题/组件）全链路改造 + 7 种语言 i18n 同步。

---

### 4. 安装/升级系统重构

#### 核心变更

| 项目 | 旧 | 新 |
|------|----|----|
| npm 包名 | `@mimocode/cli-ai` | `@mimo-ai/cli` |
| Registry | 硬编码 `pkgs.d.xiaomi.net` | 动态检测 `npm config get registry` |
| Channel | 硬编码 `latest` | 使用 `InstallationChannel`（支持 latest/beta） |
| curl 安装 | 注释掉 (TODO) | 启用，指向 `mimo.xiaomi.com/install` |
| 安装方式检测 | 注释掉 curl 路径检测 | 启用 `.mimocode/bin` / `.local/bin` 检测 |
| npm 升级命令 | 带 `--registry=pkgs.d.xiaomi.net` | 不指定 registry（使用用户默认） |
| 卸载命令 | `@mimocode/cli-ai` | `@mimo-ai/cli` |

**为什么要改**: 开源后不能硬编码内部 registry；需要恢复 curl 安装检测逻辑以支持官方安装脚本；动态 registry 检测让企业用户可以用私有 mirror。

---

### 5. CI/CD 大规模裁剪（-3,084 行）

#### 删除的工作流

| 工作流 | 用途 | 删除原因 |
|--------|------|----------|
| `publish.yml` (479行) | npm + GitHub Release 发布 | 不再使用 GitHub CI 发布 |
| `pr-standards.yml` (351行) | PR 规范检查 | 内部流程，开源不需要 |
| `close-stale-prs.yml` (235行) | 自动关闭过期 PR | 内部管理工具 |
| `duplicate-issues.yml` (177行) | 合并重复 Issue | 内部管理工具 |
| `daily-issues-recap.yml` (170行) | 每日 Issue 摘要 | 内部管理工具 |
| `daily-pr-recap.yml` (173行) | 每日 PR 摘要 | 内部管理工具 |
| `nix-hashes.yml` (152行) | Nix 哈希更新 | 内部构建链 |
| `vouch-check-issue.yml` (116行) | Issue 担保检查 | 内部治理流程 |
| `vouch-check-pr.yml` (114行) | PR 担保检查 | 内部治理流程 |
| `pr-management.yml` / `review.yml` / `compliance-close.yml` 等 | PR 管理/审查/合规 | 内部治理流程 |
| `test.yml` (161行) | CI 测试 | 改为本地执行 |
| `deploy.yml` / `beta.yml` / `generate.yml` 等 | 部署/预览/生成 | 内部发布流程 |

#### 删除的其他文件

| 文件 | 原因 |
|------|------|
| `.github/CODEOWNERS` | 内部团队 CODEOWNER |
| `.github/TEAM_MEMBERS` | 内部团队成员列表 |
| `.github/VOUCHED.td` | 内部担保机制 |
| `.github/actions/setup-git-comitter/` | 内部 Git 提交者配置 |
| `.github/publish-python-sdk.yml` | 内部 Python SDK 发布 |

#### 保留

仅保留 `typecheck.yml` 作为 PR 门控。

#### 删除 `github/` 目录（-1,052 行）

整个 OpenCode GitHub Action 包（`github/index.ts` 1052行）被完全移除，包括：
- GitHub Action 入口 (`action.yml`, `index.ts`)
- SST 部署配置
- 发布/构建脚本

**为什么要改**: 这是开源裁剪的核心工作。内部 CI 依赖小米 GitLab Runner、内部 npm registry、SST 部署、团队治理流程——这些在 GitHub 公开仓库无意义。裁剪后只保留类型检查作为开源协作的基本质量门控。

---

### 6. 发布脚本重构

#### `script/publish.ts` 精简

| 删除项 | 行数 | 原因 |
|--------|------|------|
| `prepareReleaseFiles()` 函数 (zed extension.toml 更新) | ~20 | 不再发布 Zed 扩展 |
| git tag/push/switch 流程 | ~25 | 不在 publish 脚本中操作 git |
| `gh release edit` 发布 | ~5 | 移到 release.ts |

#### 新增 `script/release.ts`（37行）

一站式发布流程：`version → build → publish npm → finalize release`

#### `script/version.ts` 容错

- `gh release create` / `bun script/changelog.ts` 添加 `.nothrow()` 防止非关键步骤失败阻断流程

#### `packages/script/src/index.ts`

- 移除 `team` 属性（依赖已删除的 `.github/TEAM_MEMBERS`）
- Channel 推断：`git branch --show-current` 空值时默认 `"latest"` 而非空字符串
- Version bump：无 `OPENCODE_BUMP` 时直接返回原版本，不再提前 split

**为什么要改**: 原发布脚本混合了版本管理、git 操作、GitHub Release、Zed 扩展发布——开源后只需 npm + GitHub Release 两条线。拆分为 `release.ts`（编排）+ `publish.ts`（上传）更清晰。`.nothrow()` 是实际发布中遇到 changelog 为空或 Release 已存在时容错。

---

### 7. 新增 Node.js 构建 (`packages/opencode/script/build-node.ts`)

```ts
// Bun.build → Node ESM
// 关键 define:
//   OPENCODE_MIGRATIONS = 内联迁移 SQL
//   OPENCODE_CHANNEL   = 发布 channel
```

- 自动加载 `migration/` 目录下所有迁移 SQL
- 输出到 `dist/node/`
- 排除 `jsonc-parser`, `@lydell/node-pty` 为 external

**为什么要改**: MiMo Code 需要同时支持 Bun 和 Node.js 运行时，新增 Node 构建目标扩大用户覆盖面。

---

### 8. Session/Checkpoint 注释清理

| 文件 | 变更 |
|------|------|
| `checkpoint-templates.ts` | `cc-haha tail max` → `tail max` |
| `checkpoint.ts` | 移除 6 处 `cc-haha` 引用（算法描述、compact 模式说明、seam framing 注释） |
| `llm.ts` | `mirroring cc-haha PERSISTENT_MAX_BACKOFF_MS` → `with exponential backoff` |

**为什么要改**: `cc-haha` 是上游内部代号，开源后不应暴露内部项目名。注释改为通用描述，逻辑完全不变。

---

### 9. 开发体验文件

| 新增文件 | 用途 |
|----------|------|
| `.vscode/launch.example.json` | Bun attach 调试配置模板 |
| `.vscode/settings.example.json` | 推荐 Bun 扩展 |
| `docs/build-release.md` | 构建与发布完整文档（109行） |

---

## 三、为什么处理这么久

### 时间拆解

| 阶段 | 预估耗时 | 原因 |
|------|----------|------|
| 品牌重塑 & 包名迁移 | 中 | 涉及 installation/uninstall/publish/README 等 **10+ 文件**交叉引用，漏改一个就发布失败 |
| CI 裁剪 | 高 | 删除 **34 个文件 / 3,084 行**，需逐一确认哪些保留、哪些裁剪，避免误删 typecheck 等必要 CI |
| Plain Terminal 兼容 | 高 | **全链路改造**：检测 → 渲染配置 → 主题系统 → 组件层 → 路由层 → 7 种语言 i18n，6 个文件联动 |
| `.mimocode/` 定制系统 | 中 | 新增 **34 文件 / 3,109 行**，含 17 种语言术语表、937 行 TUI 插件、899 行 Agent 指令 |
| 安装/升级重构 | 中 | registry 从硬编码改为动态检测，curl 安装从 TODO 注释恢复为可用代码，需验证多包管理器路径 |
| 发布脚本拆分 | 低 | 逻辑清晰但需确保 `release.ts` → `publish.ts` → `version.ts` 链路完整 |
| Checkpoint 注释脱敏 | 低 | 6 处 `cc-haha` 替换，纯文本替换 |

### 核心瓶颈

1. **跨模块联动验证**: Plain Terminal 模式影响 renderer → theme → component → route → i18n 全栈，每层都要适配降级逻辑，且不能影响正常终端体验
2. **开源裁剪的边界判断**: CI 工作流哪些是内部专用（删）、哪些是开源协作必需（留），需要逐个 review 34 个 workflow 文件
3. **安装链路安全**: npm registry 从内网切到公网 + curl 安装恢复，涉及用户机器上的代码执行，必须确保 URL 正确、fallback 合理
4. **品牌一致性**: 包名、仓库 URL、安装脚本 URL、README 链接——散布在 ~10 个文件中，任何一处不一致都会导致用户安装失败或文档指向错误

---

## 四、Commit 时间线

| Hash | 日期 | 作者 | 说明 |
|------|------|------|------|
| `7233b71` | 2026-06-11 | qiaozongming | Initial open-source release of MiMo Code（主体变更） |
| `4ef01a4` | 2026-06-11 | — | readme |
| `251e207` | 2026-06-11 | zhangchuanfeng | docs: correct OpenCode repository URL in README files |
| `6ce77f0` | 2026-06-11 | shenbowen1 | Update README |
| `9753077` | 2026-06-11 | bwshen-mi | Merge PR #20 |
| `bc9546e` | 2026-06-11 | — | docs: update community group chat QR code |
| `e96727a` | 2026-06-11 | — | Merge PR #149 |

---

## 五、未提交的本地变更（工作区）

以下文件在工作区但未入库（`git status` 显示 `??`）：

| 路径 | 推测用途 |
|------|----------|
| `packages/opencode/tmp-distill.mjs` | Distill 临时输出 |

---

## 六、对话循环 Bug 分析：项目对话进入无限循环无法退出

### 问题现象

用户发起对话后，AI 在完成回答后不会返回空闲状态，而是不断重新进入 LLM 调用循环，TUI 界面始终显示"运行中"，用户无法输入新消息。

### 涉及的三个循环层级

MiMo Code 的对话执行路径由 **三层嵌套的 `while(true)` 循环** 组成，任何一层的退出条件失效都会导致无限循环：

#### 层级 1：主 Session 循环 (`session/prompt.ts` `runLoop`)

```
位置: packages/opencode/src/session/prompt.ts, 行 ~2050-2932
```

这是最外层循环。每次用户发消息后进入，负责：

1. 读取消息历史 (`msgs`)
2. 分类上一步 assistant 输出 (`classifyAssistantStep`)
3. 检查是否需要继续（有 tool call → continue，final → break）
4. 处理 overflow/compaction
5. 调用 LLM (`handle.process`)
6. 根据返回结果决定 `continue` 或 `break`

**退出条件**（任一满足即 break）：

| 条件 | 代码位置 | 说明 |
|------|----------|------|
| `classification.type === "final"` | L2236-2240 | assistant 输出了文本且 finish=stop |
| `classification.type === "filtered"` | L2218-2221 | 内容被安全过滤器拦截 |
| `classification.type === "failed"` | L2223-2226 | 模型返回错误 |
| `classification.type === "think-only"/"invalid"` | L2228-2232 | 只有思考没有输出，且 autoContinue 拒绝 |
| `taskGate` 不要求 re-entry | L2927 | 任务门检查通过 |
| `goalGate` 不要求 re-entry | L2928 | 目标门检查通过 |

**可能导致无限循环的路径**：

- `classification.type === "continue"` 且 tool call 永远不完成（例如 tool 执行超时但 state 没变成 `error`）
- `taskGate` 不断返回 `needReentry: true`（未完成任务列表未清空，且未达到 `MAX_TASK_GATE_MAIN_REACT` 上限）
- `goalGate` 不断返回 `!verdict.ok`（目标评估模型反复认为目标未达成，且未达到 `MAX_GOAL_REACT` 上限）
- `overflow` → `compaction.create()` → `continue`，但 compaction 失败后 context 仍然溢出

#### 层级 2：Actor preStop ReAct 循环 (`actor/spawn.ts` `forkWork`)

```
位置: packages/opencode/src/actor/spawn.ts, 行 321-388
```

当子 agent（subagent/peer）完成一个 turn 后，`plugin.triggerActorPreStop` 检查是否需要重新执行：

```ts
while (true) {
  // ... runTurn ...
  iteration++
  if (iteration > MAX_PRE_REACT) break    // 硬上限
  const decision = yield* plugin.triggerActorPreStop({...})
  if (!decision.continue) break
  if (!decision.reason) break              // defense-in-depth
  // ... 重新执行 ...
}
```

**退出条件**：

| 条件 | 说明 |
|------|------|
| `iteration > MAX_PRE_REACT` | 硬上限保护 |
| `!decision.continue` | 插件决定不再继续 |
| `!decision.reason` | 防御性检查 |

**可能无限循环**：如果 `MAX_PRE_REACT` 值过大，且插件始终返回 `continue: true`。

#### 层级 3：Actor postStop ReAct 循环 (`actor/spawn.ts` `forkWork`)

```
位置: packages/opencode/src/actor/spawn.ts, 行 488-567
```

与 preStop 结构类似，但在 actor 完成并交付结果后运行：

```ts
while (true) {
  const decision = yield* plugin.triggerActorPostStop({...})
  if (!decision.continue) break
  if (!decision.reason) break
  if (postIter >= MAX_POST_REACT) break    // 硬上限
  // ... runTurn ...
  if (newTurn.finalText === undefined) break
}
```

**退出条件**：

| 条件 | 说明 |
|------|------|
| `postIter >= MAX_POST_REACT` | 硬上限保护 |
| `!decision.continue` | 插件决定不再继续 |
| `!decision.reason` | 防御性检查 |
| `newTurn.finalText === undefined` | runTurn 失败或无输出 |

### 循环退出的安全网机制

代码中已实现多层安全网防止真正的无限循环：

| 安全网 | 位置 | 说明 |
|--------|------|------|
| `MAX_PRE_REACT` | spawn.ts L344 | preStop 循环硬上限 |
| `MAX_POST_REACT` | spawn.ts L508 | postStop 循环硬上限 |
| `MAX_TASK_GATE_MAIN_REACT` | prompt.ts L1830 | taskGate 重入上限 |
| `MAX_GOAL_REACT` | prompt.ts L1926 | goalGate 重入上限 |
| `agent.steps` | prompt.ts L2512 | agent 配置的步数上限 |
| `REPEATED_STEP_THRESHOLD = 3` | prompt.ts L109 | 重复步骤检测 |
| `overflow → compaction` | prompt.ts L2420-2500 | 上下文溢出时压缩 |
| `classifyAssistantStep` | classify.ts L31-92 | 统一的步骤分类器 |

### 核心分类逻辑 (`classify.ts`)

```ts
// 优先级从高到低：
// 1. 有待处理的 tool call → continue（必须重入以发送 tool 结果）
// 2. assistant 未完成 → continue
// 3. finish = "tool-calls" → continue
// 4. 过时的 assistant → continue
// 5. error → failed
// 6. structured output / summary → final
// 7. content-filter → filtered
// 8. 有非空文本 → final
// 9. 只有推理 → think-only
// 10. 空输出 → invalid
```

**关键陷阱**：步骤 1 中 `part.state.status !== "error"` 的检查——如果 tool 执行超时但 state 仍为 `running` 而非 `error`，分类器会一直返回 `continue`，导致循环永不退出。

### TUI 层面的交互控制

```
位置: packages/opencode/src/cli/cmd/tui/routes/session/index.tsx
```

| 信号 | 作用 |
|------|------|
| `visible()` (L139-144) | 控制 Prompt 输入框是否显示：`!session().parentID && currentAgentID() === "main" && permissions().length === 0 && questions().length === 0` |
| `disabled()` (L146) | 控制输入框是否禁用：`permissions().length > 0 || questions().length > 0` |
| `pending()` (L148-150) | 最后一条未完成的 assistant 消息 ID |

**用户体验**：当后端循环持续运行时，`pending()` 始终有值，TUI 持续显示 spinner/进度。Prompt 输入框虽然 `visible` 且非 `disabled`，但用户发的新消息会被排入队列，直到当前循环结束才会被处理——这给用户"不能退出"的感觉。

### 所有安全网常量汇总

| 常量 | 值 | 位置 | 说明 |
|------|-----|------|------|
| `MAX_PRE_REACT` | 3 | `actor/spawn.ts` L32 | subagent preStop 循环硬上限 |
| `MAX_POST_REACT` | 3 | `actor/spawn.ts` L34 | subagent postStop 循环硬上限 |
| `MAX_TASK_GATE_MAIN_REACT` | 3 | `task/gate.ts` L20 | 主循环 taskGate 重入上限 |
| `MAX_GOAL_REACT` | 12 | `session/prompt.ts` L102 | 主循环 goalGate 重入上限 |
| `OUTPUT_LENGTH_CONTINUATION_LIMIT` | 3 | `flag/flag.ts` L63 | 输出截断后自动继续上限（可环境变量覆盖） |
| `INVALID_OUTPUT_CONTINUATION_LIMIT` | 2 | `flag/flag.ts` L64 | 空/仅推理输出自动继续上限（可环境变量覆盖） |
| `REPEATED_STEP_THRESHOLD` | 3 | `session/prompt.ts` L109 | 连续相同步骤检测阈值 |
| `agent.steps` | 配置值 | `session/prompt.ts` L2512 | agent 配置的步数上限 |

**关键发现**：每个安全网**独立计数**，不共享。一个循环中可能先触发 `OUTPUT_LENGTH_CONTINUATION_LIMIT`(3次) → 然后 `taskGate`(3次) → 然后 `goalGate`(12次) → 再触发 `INVALID_OUTPUT_CONTINUATION_LIMIT`(2次)，**总计最多 3+3+12+2 = 20 轮额外循环**，加上正常的多步 tool call，用户实际等待时间可能极长。

### 根因分析

**Bug 不是"无限循环"而是"超长循环"**——代码中确实不存在数学意义上的无限循环（每个 `while(true)` 都有硬上限 break），但用户体验等价于无限循环：

1. **各安全网上限累加**：`taskGate`(3) + `goalGate`(12) + `autoContinueInvalidOutput`(2) + `autoContinueOutputLength`(3) = 最多 **20 轮重入**，每轮都包含 LLM API 调用（数秒到数十秒），总等待可达 **5-20 分钟**
2. **tool call 超时未转 error**：`classifyAssistantStep` 的第一条规则是"有待处理 tool call → continue"，检查条件是 `part.state.status !== "error"`。如果 tool 执行卡住但 state 仍为 `running`（而非 `error`），分类器永远返回 `continue`，**无硬上限保护**——只有 `agent.steps` 配置值能兜底，但默认值可能很大
3. **goalGate 的 judge 模型失败是 fail-open**：`goal.evaluate` 出错时返回 `{ ok: true }`（允许停止），但正常评估反复返回 `{ ok: false }` 时，judge 本身可能给出不一致结论（同一段对话，judge 先说"未完成"再说"未完成"），12 次重入全部消耗
4. **TUI 中断传播链路完整但用户不知道**：按两次 Escape → `sdk.client.session.abort()` → HTTP POST `/:sessionID/abort` → `SessionPrompt.Service.cancel()` → `SessionRunState.cancel()` → `Runner.cancel()` → `Fiber.interrupt(run.fiber)`。链路完整，但 TUI 只显示 `esc interrupt` / `esc again to interrupt` 小字，用户不知道需要按两次

### Runner 中断传播机制

```
文件: packages/opencode/src/effect/runner.ts
```

`Runner` 是 Effect 的 Fiber 管理器，核心状态机：

| 状态 | 含义 |
|------|------|
| `Idle` | 无运行中的任务 |
| `Running` | 有一个 fiber 正在执行 |
| `Shell` | 有一个 shell fiber 正在执行 |
| `ShellThenRun` | shell 执行中，有 pending 任务等待 shell 完成后执行 |

**`cancel()` 实现**（L166-197）：

```ts
cancel = SynchronizedRef.modify(ref, (st) => {
  switch (st._tag) {
    case "Idle":     return [Effect.void, st]
    case "Running":  return [Fiber.interrupt(st.run.fiber) ... , { _tag: "Idle" }]
    case "Shell":    return [stopShell(st.shell) ... , { _tag: "Idle" }]
    case "ShellThenRun": return [
      Deferred.fail(st.run.done, new Cancelled())  // 取消 pending 任务
      stopShell(st.shell)                           // 中断 shell
      idleIfCurrent()
    , { _tag: "Idle" }]
  }
})
```

**关键**：`cancel` → `Fiber.interrupt` 会向 Effect fiber 发送中断信号，fiber 中的 `Effect.gen` 会在下一个 yield 点检查中断标志并退出。这意味着如果 `runLoop` 正在 `yield* handle.process()`（等待 LLM API 响应），中断会在 API 调用返回后的下一个 yield 点生效。

**但**：如果 LLM API 调用本身阻塞了 60 秒，用户在这 60 秒内按 Escape 的 `cancel` 只能等 API 返回后才能中断——这 60 秒内用户看到的是"按了 Escape 但没反应"。

### TUI Escape 中断代码路径

```
文件: packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx, 行 560-581
```

```ts
// 第一次按 Escape
setStore("interrupt", store.interrupt + 1)
setTimeout(() => {
  setStore("interrupt", 0)    // 5 秒超时重置
}, 5000)

// 第二次按 Escape（5 秒内）
if (store.interrupt >= 2) {
  void sdk.client.session.abort({
    sessionID: props.sessionID,
  })
  setStore("interrupt", 0)
}
```

**UI 显示**（L1756-1761）：

```tsx
<text fg={store.interrupt > 0 ? theme.primary : theme.text}>
  esc{" "}
  <span style={{ fg: store.interrupt > 0 ? theme.primary : theme.textMuted }}>
    {store.interrupt > 0 ? "again to interrupt" : "interrupt"}
  </span>
</text>
```

**问题**：
1. 提示太小（仅小字 `esc interrupt`），用户可能没注意到
2. 5 秒超时太短——如果用户第一次按 Escape 后 5 秒内没按第二次，计数器重置
3. `sdk.client.session.abort()` 是异步 HTTP 调用，如果后端正在处理 LLM 响应，abort 请求可能因为 Fiber 中断延迟而无法立即生效

### 完整的中断传播链路

```
用户按 Escape (第1次)
  → store.interrupt = 1, 5秒超时计时器启动
  → UI 显示 "esc again to interrupt"

用户按 Escape (第2次, 5秒内)
  → store.interrupt >= 2
  → sdk.client.session.abort({ sessionID })
  → HTTP POST /sessions/:sessionID/abort
  → SessionRoutes.abort handler
  → SessionPrompt.Service.cancel(sessionID)
  → SessionRunState.cancel(sessionID)
  → Runner.cancel()
  → Fiber.interrupt(run.fiber)
  → Effect fiber 在下一个 yield 点退出
  → Runner 状态变为 Idle
  → status.set(sessionID, { type: "idle" })
  → TUI 显示 idle 状态
```

### 修复建议（优先级排序）

| 优先级 | 修复 | 涉及文件 | 改动量 | 说明 |
|--------|------|----------|--------|------|
| P0 | tool call 超时强制设为 `error` | `tool/` 执行层 | 小 | 消除 `classifyAssistantStep` 的"永远 continue"路径 |
| P0 | runLoop 增加全局步数硬上限 | `prompt.ts` runLoop | 小 | 如 `MAX_TOTAL_STEPS = 50`，无论什么路径触发，总步数超限强制 break |
| P1 | TUI 中断提示增强 | `prompt/index.tsx` | 小 | 将 `esc interrupt` 改为更醒目的提示，增加超时到 10 秒 |
| P1 | abort 后立即设 `status: idle` | `run-state.ts` | 小 | 防止 Fiber.interrupt 延迟导致 UI 仍显示 busy |
| P2 | `MAX_GOAL_REACT` 降至 5 | `prompt.ts` | 一行 | 12 次重入太多，5 次足够覆盖正常场景 |
| P2 | goalGate 失败计数器持久化 | `prompt.ts` goalGate | 中 | 当前 react 计数器在 session 重启后重置 |

### 为什么分析这么久

1. **三层循环嵌套**：runLoop → preStop loop → postStop loop，退出逻辑分散在 3 个文件、1000+ 行代码中
2. **隐式状态依赖**：退出条件依赖 DB 中的 task 状态、goal 评估模型返回、tool part 的 state 字段——不是简单的布尔判断
3. **安全网看似完备但累加过大**：每个循环都有硬上限，但各上限独立计数、可累加（3+3+12+2=20轮），且 tool call 超时路径无硬上限——用户等不到上限触发就强制关闭了
4. **中断传播链路完整但隐蔽**：从 TUI Escape → HTTP abort → Fiber.interrupt 的链路是完整的，但用户不知道需要按两次 Escape，5 秒超时后计数器又重置，且 LLM API 阻塞期间中断无法立即生效

---

## 七、对话循环 Bug 修复实施

> **日期**: 2026-06-11  
> **状态**: 已实施，待验证

### 修复概览

基于第六节的根因分析和修复建议，已实施三项 P0/P2 级别代码修复：

| # | 优先级 | 修复内容 | 文件 | 改动 |
|---|--------|----------|------|------|
| 1 | P0 | `runLoop` 全局步数硬上限 `MAX_TOTAL_STEPS = 50` | `prompt.ts` | +12 行 |
| 2 | P0 | `classifyAssistantStep` 陈旧 tool call 兜底 | `classify.ts` | +17 行 |
| 3 | P2 | `MAX_GOAL_REACT` 从 12 降至 5 | `prompt.ts` | 1 行 |

### 修复 1：runLoop 全局步数硬上限

**问题**：`runLoop` 的 `while(true)` 无全局步数上限。各路径（taskGate/goalGate/autoContinue/overflow）的计数器独立运作，累加后可达 20+ 轮重入。每轮涉及一次 LLM API 调用（耗时数秒），用户感知为"无限循环"。

**修改**：

```ts
// prompt.ts，新增常量（L111-121）
const MAX_TOTAL_STEPS = 50

// prompt.ts，runLoop 循环入口（L2132-2139）
while (true) {
  if (step >= MAX_TOTAL_STEPS) {
    yield* slog.warn("runLoop hit MAX_TOTAL_STEPS; forcing break", { step, MAX_TOTAL_STEPS })
    break
  }
  // ... 原有逻辑
}
```

**设计决策**：
- 上限设为 50：足够覆盖合法的长时间 agent 任务（典型 5-15 步），但保证最坏情况下约 2-3 分钟内终止
- 检查放在循环最顶部，确保无论进入路径如何都会被拦截
- `slog.warn` 记录便于事后诊断

### 修复 2：classifyAssistantStep 陈旧 tool call 兜底

**问题**：`classifyAssistantStep` 规则 #1 对 `state.status !== "error"` 的 tool part 返回 `continue`，但 `running` 状态的 tool part 如果执行器已崩溃/超时/被杀，永远不会转为 `error`，导致 classify 永远返回 `continue`，runLoop 永远无法退出。

**修改**：

```ts
// classify.ts，新增参数（L38-44）
staleToolCallMs?: number  // 默认 5 分钟 = 300_000 ms

// classify.ts，规则 #1 的 .some() 增加陈旧检查（L64-70）
input.parts.some(
  (part) =>
    part.type === "tool" &&
    !part.metadata?.providerExecuted &&
    part.state.status !== "error" &&
    // P0 fix: 排除陈旧的 running tool part
    !(part.state.status === "running" && staleMs > 0 &&
      assistant.time?.created && now - assistant.time.created > staleMs),
)
```

**设计决策**：
- 默认超时 5 分钟：覆盖 LLM API 调用、工具执行、网络波动的正常时长，但不让用户等太久
- 向后兼容：`staleToolCallMs` 为可选参数，不传则使用默认值
- 检查 `assistant.time?.created`：确保有时间戳可比较，无时间戳时不触发（保守策略）

### 修复 3：MAX_GOAL_REACT 降低

**问题**：`MAX_GOAL_REACT = 12` 允许 goalGate 驱动 12 次重入，每次重入可能触发 LLM API 调用 + 工具执行，12 轮总计可能 2-3 分钟，且 goalGate 评估本身也有 token 消耗。

**修改**：

```ts
// prompt.ts L102
const MAX_GOAL_REACT = 5  // 原值 12
```

**设计决策**：
- 5 次足够覆盖正常场景（通常 2-3 次 goalGate 重入即可完成目标）
- 配合修复 1 的全局上限，即使 goalGate 计数器异常，也会被 MAX_TOTAL_STEPS 拦截

### 修复效果预估

| 场景 | 修复前 | 修复后 |
|------|--------|--------|
| tool call 挂起（executor 崩溃） | 无限循环 | 5 分钟后 classify 跳过 stale part，或 50 步后 runLoop break |
| goalGate 反复不满足 | 最多 12 轮重入 | 最多 5 轮重入 |
| 多路径累加（taskGate + goalGate + autoContinue + overflow） | 累加可达 20+ 轮 | 全局上限 50 步强制终止 |
| 用户按 Escape 中断 | Fiber.interrupt 延迟可能无效 | 即使中断延迟，runLoop 也会在 50 步内自行终止 |

### 未实施的修复（后续跟进）

| 优先级 | 修复 | 原因 |
|--------|------|------|
| P1 | TUI 中断提示增强 | 需 UI 设计确认，非逻辑修复 |
| P1 | abort 后立即设 `status: idle` | 需评估对其他状态的影响 |
| P2 | goalGate 失败计数器持久化 | 涉及 DB schema 变更 |

---

## 八、对话耗时显示功能

> **日期**: 2026-06-11  
> **状态**: 已实施，类型检查通过

### 问题背景

用户在 TUI 中发起对话后，状态栏只显示一个 spinner + "busy" 文本（可选 `message`）。用户无法直观判断：

1. 对话是否还在进行中（spinner 动画可能在某些终端上不明显）
2. 已经等了多久（是否需要中断重试）
3. 对话是否"卡住了"（耗时异常长说明可能有无限循环）

### 解决方案

在 TUI prompt 组件的 busy 状态指示器旁，显示自进入 busy 以来的经过时间（如 `12s`、`1m 30s`、`2h 15m`）。

### 修改的文件

| # | 文件 | 变更 | 说明 |
|---|------|------|------|
| 1 | `packages/opencode/src/session/status.ts` | +7 行 | `busy` 类型新增 `startedAt?: number` 字段；`set()` 方法在转入 busy 时自动打时间戳 |
| 2 | `packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx` | +20 行 | 读取 `startedAt`，每秒计算 elapsed 并用 `formatDuration()` 渲染 |
| 3 | `packages/sdk/js/src/gen/types.gen.ts` | +1 行 | v1 SDK `SessionStatus.busy` 类型新增 `startedAt?: number` |
| 4 | `packages/sdk/js/src/v2/gen/types.gen.ts` | +1 行 | v2 SDK `SessionStatus.busy` 类型新增 `startedAt?: number` |
| 5 | `packages/sdk/openapi.json` | +3 行 | OpenAPI schema `SessionStatus.busy` 新增 `startedAt` 字段 |

### 详细修改

#### 1. `status.ts` — 自动记录 `startedAt` 时间戳

```ts
// Zod schema 变更
z.object({
  type: z.literal("busy"),
  message: z.string().optional(),
  startedAt: z.number().optional(),  // ← 新增
}),

// set() 方法中自动打时间戳
const set = Effect.fn("SessionStatus.set")(function* (sessionID, status) {
  const data = yield* InstanceState.get(state)
  // When transitioning to busy, stamp startedAt so the TUI can show elapsed time.
  // Preserve the existing startedAt if the caller is re-setting busy (e.g. runLoop
  // sets busy on each iteration) so the timer doesn't reset mid-turn.
  if (status.type === "busy" && status.startedAt === undefined) {
    const existing = data.get(sessionID)
    status = {
      ...status,
      startedAt: existing?.type === "busy" && existing.startedAt
        ? existing.startedAt
        : Date.now(),
    }
  }
  // ... 原有逻辑
})
```

**设计决策**：

- **自动打时间戳**：调用方不需要手动传 `startedAt`，`set()` 方法在首次进入 busy 时自动用 `Date.now()` 赋值
- **保留已有值**：`runLoop` 每次迭代都会 `set({ type: "busy" })`，如果每次都重置 `startedAt`，计时器会在每一轮循环重置，用户看到的时间会不断归零。通过检查已有状态，只在首次 idle→busy 转换时设置
- **可选字段**：`startedAt` 是 `optional`，保证向后兼容——旧版客户端不传此字段也不影响

#### 2. `index.tsx` — TUI 渲染耗时

```tsx
// 从 status 中提取 startedAt
const busyStartedAt = createMemo(() => {
  const s = status()
  return s.type === "busy" ? s.startedAt : undefined
})

// 每秒更新 elapsed
const [elapsed, setElapsed] = createSignal(0)
onMount(() => {
  const timer = setInterval(() => {
    const started = busyStartedAt()
    if (started) setElapsed(Math.floor((Date.now() - started) / 1000))
  }, 1000)
  onCleanup(() => clearInterval(timer))
})

// 渲染：在 spinner 和 message 后追加耗时
<Show when={busyStartedAt() && elapsed() > 0}>
  <text fg={theme.textMuted}>{formatDuration(elapsed())}</text>
</Show>
```

**UI 效果**：

| 状态 | 修复前 | 修复后 |
|------|--------|--------|
| 刚开始处理 | `⠋ thinking…` | `⠋ thinking…` |
| 12 秒后 | `⠋ thinking…` | `⠋ thinking… 12s` |
| 1 分 30 秒后 | `⠋ thinking…` | `⠋ thinking… 1m 30s` |
| 2 小时后 | `⠋ thinking…` | `⠋ thinking… 2h 0m` |

**复用已有函数**：`formatDuration()` 已在 `@/util/format` 中存在，用于 retry 倒计时显示，无需新增任何格式化逻辑。

#### 3. SDK 类型同步

`SessionStatus` 类型定义在三处：

| 位置 | 用途 |
|------|------|
| `packages/opencode/src/session/status.ts` | 后端 Zod schema（真实来源） |
| `packages/sdk/js/src/gen/types.gen.ts` | v1 SDK TypeScript 类型 |
| `packages/sdk/js/src/v2/gen/types.gen.ts` | v2 SDK TypeScript 类型 |
| `packages/sdk/openapi.json` | OpenAPI 3.1 schema（SDK 生成源头） |

三处都需要添加 `startedAt?: number`，否则前端 SDK 消费时会报类型错误。

### 为什么处理这么久

| 阶段 | 耗时 | 原因 |
|------|------|------|
| 探索 TUI 状态管理 | 中 | 需要理解 `sync.data.session_status` → `status` memo → 渲染的完整数据流 |
| 确定 `startedAt` 注入位置 | 中 | 需要找到"状态转入 busy"的确切位置（`status.ts` 的 `set()` 方法），并处理 runLoop 重复 set busy 的时间戳保留问题 |
| SDK 类型同步 | 低 | 三处类型文件 + OpenAPI schema 需要手动同步，遗漏任何一处都会编译失败 |
| 类型检查验证 | 低 | `bun typecheck` 通过，仅有无关的临时测试文件报错 |

**核心难点**：不是"加一个计时器"这么简单——需要确保：

1. **时间戳不重置**：`runLoop` 的 `while(true)` 每轮迭代都会 `set({ type: "busy" })`，如果每次都重新 `Date.now()`，用户看到的耗时会在每一轮 LLM 调用后归零
2. **状态转换正确**：idle→busy 打时间戳，busy→busy 保留原值，busy→idle 清除
3. **跨 SDK 版本一致**：v1/v2 SDK + OpenAPI schema 三处类型必须同步
