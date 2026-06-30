# mimo-v2.5-free 模型用量追踪分析

> **分析日期**: 2026-06-28  
> **代码仓库**: MiMo-Code (packages/opencode)  
> **分析范围**: `mimo-v2.5-free` 的认证机制、跨 IP 用量追踪、请求携带的身份信息

---

## 一、mimo-v2.5-free 是什么

`mimo-v2.5-free` 是 **`mimo-auto` 模型的实际 ID**。用户在界面中选择 `mimo/mimo-auto` 时，客户端实际发送给上游 API 的 `model` 字段值为 `mimo-v2.5-free`。

### 定义位置

`packages/opencode/src/plugin/mimo.ts:96-116`

```ts
mimo.models["mimo-auto"] = {
  id: "mimo-v2.5-free",
  name: "MiMo Auto",
  cost: { input: 0, output: 0, cache_read: 0, cache_write: 0 },
  limit: { context: 1000000, output: 32000 },
  // ...
}
```

### 与其它 MiMo 模型的区别

| 维度 | `mimo` (mimo-v2.5-free) | `xiaomi` (mimo-v2.5-pro) | `mimo-proxy` 脚本 |
|------|--------------------------|--------------------------|-------------------|
| API 端点 | `https://opencode.ai/zen/v1` | `https://api.xiaomimimo.com/v1` | `https://token-plan-cn.xiaomimimo.com/v1` |
| 认证方式 | 匿名，无需 Key | OAuth 浏览器登录 | 硬编码 API Key |
| 费用 | 免费 (cost: 0) | 付费 | Token Plan |
| 超限行为 | FreeUsageLimitError / 429 | 付费续用 | Token 耗尽 |

---

## 二、请求结构

### 请求目标

```
POST https://opencode.ai/zen/v1/chat/completions
```

### 请求头

| 头部 | 值 | 说明 |
|------|-----|------|
| `Content-Type` | `application/json` | 标准 |
| `User-Agent` | `mimocode/{版本号}` | 所有客户端相同，无法区分用户 |
| `x-session-affinity` | `{sessionID}` | 每次会话随机 UUID，跨会话无效 |
| `x-parent-session-id` | `{parentUUID}` | 仅子代理请求时携带，无法追踪主用户 |

**不携带的常见标识：**

| 头部 | 状态 | 原因 |
|------|------|------|
| `Authorization: Bearer xxxx` | ❌ 不携带 | `mimo` provider `env: []`，无需 API Key |
| `X-Mimo-Source` | ❌ 不携带 | 仅 `xiaomi` provider 使用（`mimo.ts:217`） |
| `Cookie` | 可能携带 | 如果登录过 `opencode.ai`，浏览器 cookie 自动附加 |
| 计算机指纹 | ❌ 不携带 | 代码中无任何指纹采集逻辑 |

### 请求体

```json
{
  "model": "mimo-v2.5-free",
  "messages": [...],
  "stream": true,
  ...
}
```

---

## 三、认证机制

### mimo provider 注册

`packages/opencode/src/plugin/mimo.ts:95-100`

```ts
input.provider.mimo ??= {}
mimo.name ??= "MiMo"
mimo.api ??= "https://opencode.ai/zen/v1"
mimo.env ??= []       // ← 无环境变量要求 → 无 API Key
```

### 自动加载，无认证门槛

`packages/opencode/src/provider/provider.ts:166-170`

```ts
mimo: () => Effect.succeed({
  autoload: true,   // 无条件加载，不检查 auth
  options: {},      // 无自定义 headers/fetch/options
})
```

### chat.headers 钩子不适用于 mimo

`packages/opencode/src/plugin/mimo.ts:216-219`

```ts
"chat.headers": async (input, output) => {
  if (input.model.providerID !== "xiaomi") return  // ← mimo 不走这里
  output.headers["X-Mimo-Source"] = "mimocode-cli"
},
```

### xiaomi provider 的认证流程（对比参考）

- 通过 `packages/opencode/src/plugin/mimo.ts:118-214` 的 OAuth 流程
- 浏览器登录 `https://platform.xiaomimimo.com/authorize`
- 回调解密后获得 `sk`（API Key），存入本地 auth 文件
- 需要 `X-Mimo-Source: mimocode-cli` 请求头

---

## 四、用量追踪机制

### 服务端 IP 计数（默认，控制额度）

```
客户端 → https://opencode.ai/zen/v1 → 服务端按 IP 计数
                                        ↓
                        超限时返回 FreeUsageLimitError 或 429
```

- **默认方式**: 匿名请求，服务端从 TCP 连接获取 IP 地址进行计数。
- **超限处理** (`packages/opencode/src/session/retry.ts:115-116`):
  - `FreeUsageLimitError` → TUI 弹出 "Free usage exceeded, subscribe to Go" 升级提示
  - HTTP 429 → TUI 弹出 Token Plan 对话框（每 24h 最多一次）

### 换 IP 后仍被追踪的可能原因

由于客户端默认不携带任何跨 IP 的身份标识，服务端在用户换 IP 后仍能累计用量的原因可能是以下之一：

#### 1. OpenCode 账号远程配置注入凭证（最可能）

`packages/opencode/src/config/config.ts:840-864`

如果用户登录了 OpenCode 账号，客户端会从账号服务器拉取 `/api/config` 并合并到全局 provider 配置。这个远程配置可以给 `mimo` provider 注入 `apiKey` 或自定义 `headers`，让服务端用 token 而不是 IP 来识别用户。

```ts
// 代码片段
const [configOpt, tokenOpt] = yield* Effect.all(
  [accountSvc.config(accountID, orgID), accountSvc.token(accountID)],
  { concurrency: 2 },
)
// ...合并到全局配置
```

**验证方法**: 检查 `~/.mimocode/data/auth.json` 是否有 `opencode.ai` 账号数据。

#### 2. 服务端按 IP 子网/ASN 统计

服务端可能不是按单一公网 IP 统计，而是按 `/24` 子网（相同 C 段）、运营商 ASN、或 IP 地理位置段统计。如果你换的是同一运营商的不同 IP，出口段没变，计数就不会重置。

**验证方法**: 换 IP 前后各访问 `https://ip.sb` 确认 IP 真的不同。

#### 3. Electron Cookie 未清理

Desktop 版本的 Chromium 网络栈会保留 `opencode.ai` 域名的 cookie。后续 `fetch` 到 `https://opencode.ai/zen/v1` 时，这些 cookie 自动带上，实现跨 IP 识别。

**验证方法**: 清除 `opencode.ai` 的 cookie 或使用新用户数据目录启动。

#### 4. 服务端被动指纹

- TLS 握手指纹（JA3）
- HTTP/2 指纹（用户代理 + 请求特征）
- 请求时序模式（session 间隔、高频模式等）

这些信号不如 IP 或账号准确，但可作为辅助识别。

### 客户端遥测（统计分析，不控制额度）

`packages/opencode/src/metrics/subscriber.ts`

```
客户端 → https://tracking.miui.com/track/v4/o
         POST body:
         [{
           H: { event: "model_call", ...,
                instance_id: "随机UUID",   ← 每次新生成
                uid: "sessionID" }
           B: { model_id: "mimo-v2.5-free", ... }
         }]
```

- **开关**: `MIMOCODE_ENABLE_ANALYSIS` 环境变量（默认 `true`）
- **用途**: 统计分析，**不参与额度控制**
- **注意**: `installation_id` 明确**不发送到线上**（`subscriber.ts:15`），`instance_id` 每次随机生成

---

## 五、完整路由链路

```
用户选择 mimo/mimo-auto
        ↓
plugin/mimo.ts config 钩子注册 provider
  注册: provider.mimo.api = "https://opencode.ai/zen/v1"
  注册: provider.mimo.env = []                ← 无 API Key
  注册: provider.mimo.models["mimo-auto"]     ← 用户可见名
        .id = "mimo-v2.5-free"                ← 实际发送 upstream 的 model ID
        ↓
provider.ts: mimo provider autoload=true       ← 无条件加载
        ↓
AI SDK 构造请求:
  → provider.mimo.api.url = "https://opencode.ai/zen/v1"
  → model.api.npm = "@ai-sdk/openai-compatible"  ← 默认 SDK
  → 若已登录 OpenCode 账号，远程配置可能注入 apiKey/headers
        ↓
POST https://opencode.ai/zen/v1/chat/completions
  Headers:
    Content-Type: application/json
    User-Agent: mimocode/{version}
    x-session-affinity: {sessionUUID}
  Body:
    { "model": "mimo-v2.5-free", ... }
```

---

## 六、关键代码文件索引

| 文件 | 作用 |
|------|------|
| `packages/opencode/src/plugin/mimo.ts:85-219` | mimo/xiaomi provider 注册、OAuth、chat.headers 钩子 |
| `packages/opencode/src/provider/provider.ts:140-171` | provider 列表注册，mimo autoload=true |
| `packages/opencode/src/provider/provider.ts:1150-1180` | model 解析，api.url/api.npm 组装 |
| `packages/opencode/src/provider/provider.ts:1497-1558` | AI SDK 载入、fetch 定制、请求发送 |
| `packages/opencode/src/provider/transform.ts:303,1126` | providerOptions 构造、maxOutputTokens 计算 |
| `packages/opencode/src/session/llm.ts:600-640` | streamText 请求参数、headers 设置 |
| `packages/opencode/src/session/retry.ts:10-116` | 免费额度超限检测、429 重试策略 |
| `packages/opencode/src/config/config.ts:840-864` | OpenCode 账号远程配置注入（可能的追踪来源） |
| `packages/opencode/src/id/id.ts:29-77` | SessionID 生成（每次会话随机，无追踪能力） |
| `packages/opencode/src/metrics/subscriber.ts:14-17` | 遥测（installation_id 故意不发送） |

---

## 七、验证步骤建议

1. **确认公网 IP 真的变化了**
   ```bash
   curl -s https://ip.sb
   ```
   换 IP 前后各跑一次。

2. **查看实际请求头**
   - Desktop: DevTools → Network → 筛选 `zen/v1` → 查看 Request Headers
   - CLI: 在 `provider.ts:1497` 加 `console.log` 输出 fetch 参数

3. **检查是否登录了 OpenCode 账号**
   - 查看 `~/.mimocode/data/auth.json`
   - 查看 `~/.mimocode/account*` 文件
   - 退出账号后重试

4. **清除 Cookie 后重试**
   - Desktop: 清除 `opencode.ai` 的 cookie/缓存
   - 或用新用户数据目录启动

5. **使用完全不同的网络**
   - 手机热点、不同 WiFi、不同运营商

---

## 八、结论

- `mimo-v2.5-free` 的**默认配置是匿名请求**，客户端不携带任何 API Key、计算机指纹或 installation_id。
- 服务端默认按 **IP 地址** 计数来控制免费额度。
- 如果换 IP 后用量仍被累计，服务端大概率不是按单一 IP 统计，而是结合了 **账号凭证、Cookie、子网/ASN** 或**被动指纹**中的一种或多种信号。
- **最可能的原因**: 你登录了 OpenCode 账号，远程配置自动给 `mimo` provider 注入了识别凭证。