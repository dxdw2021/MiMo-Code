import http from "http"

const PORT = 18080
const HOST = "127.0.0.1"
const UPSTREAM = "https://token-plan-cn.xiaomimimo.com/v1"
const API_KEY = "tp-ccth56e9yfa5tk453uslcd5i7an49lhxj4ajrftw1op9xzwn"
const DEFAULT_MODEL = "mimo-v2.5-pro"

function log(level: string, msg: string) {
  console.log(`[${new Date().toISOString()}] ${level.toUpperCase()} ${msg}`)
}

async function fetchWithRetry(url: string, opts: any, maxRetries = 2) {
  let lastErr: any
  for (let i = 0; i <= maxRetries; i++) {
    try {
      if (i > 0) {
        const delay = Math.min(1000 * 2 ** (i - 1), 4000)
        log("warn", `retry ${i}/${maxRetries} after ${delay}ms`)
        await new Promise((r) => setTimeout(r, delay))
      }
      return await fetch(url, opts)
    } catch (err: any) {
      lastErr = err
      log("error", `fetch attempt ${i + 1} failed: ${err.message}`)
    }
  }
  throw lastErr
}

function overrideModel(body: string) {
  try {
    const parsed = JSON.parse(body)
    if (parsed.model === "mimo-auto") parsed.model = DEFAULT_MODEL
    return JSON.stringify(parsed)
  } catch {
    return body
  }
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks).toString()
}

function writeCors(res: http.ServerResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

const MODELS = {
  object: "list",
  data: [
    { id: "mimo-v2.5-pro", object: "model", created: 0, owned_by: "xiaomi" },
    { id: "mimo-v2.5", object: "model", created: 0, owned_by: "xiaomi" },
    { id: "mimo-v2-pro", object: "model", created: 0, owned_by: "xiaomi" },
    { id: "mimo-v2-omni", object: "model", created: 0, owned_by: "xiaomi" },
    { id: "mimo-auto", object: "model", created: 0, owned_by: "xiaomi" },
  ],
}

async function proxyRequest(req: http.IncomingMessage, res: http.ServerResponse, upstreamPath: string) {
  const start = Date.now()
  const method = req.method
  const url = req.url!

  log("info", `${method} ${url}`)
  const body = overrideModel(await readBody(req))

  const upstream = await fetchWithRetry(`${UPSTREAM}${upstreamPath}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body,
  })

  log("info", `${method} ${url} ${upstream.status} ${Date.now() - start}ms`)

  const contentType = upstream.headers.get("content-type") ?? "application/json"
  writeCors(res)
  res.writeHead(upstream.status, { "Content-Type": contentType })

  if (upstream.body) {
    const reader = upstream.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    res.end()
  } else {
    res.end()
  }
}

const server = http.createServer(async (req, res) => {
  const method = req.method
  const url = req.url!

  if (method === "OPTIONS") {
    writeCors(res)
    res.writeHead(204)
    return res.end()
  }

  try {
    if (url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }))
    }

    if (method === "GET" && (url === "/v1/models" || url === "/models")) {
      writeCors(res)
      res.writeHead(200, { "Content-Type": "application/json" })
      return res.end(JSON.stringify(MODELS))
    }

    if (method === "POST") {
      if (url === "/v1/chat/completions" || url === "/chat/completions") {
        return await proxyRequest(req, res, "/chat/completions")
      }
      if (url === "/v1/completions" || url === "/completions") {
        return await proxyRequest(req, res, "/completions")
      }
      if (url === "/v1/embeddings" || url === "/embeddings") {
        return await proxyRequest(req, res, "/embeddings")
      }
    }

    res.writeHead(404, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ error: { message: "not found" } }))
  } catch (err: any) {
    log("error", `${method} ${url} failed: ${err.message}`)
    if (!res.headersSent) {
      res.writeHead(502, { "Content-Type": "application/json" })
    }
    res.end(JSON.stringify({ error: { message: err.message } }))
  } finally {
    if (!res.writableEnded) res.end()
  }
})

server.listen(PORT, HOST, () => {
  log("info", `Mimo proxy running at http://${HOST}:${PORT}`)
  log("info", `Upstream: ${UPSTREAM}`)
  log("info", `Endpoints:`)
  log("info", `  GET  /health`)
  log("info", `  GET  /v1/models`)
  log("info", `  POST /v1/chat/completions`)
  log("info", `  POST /v1/completions`)
  log("info", `  POST /v1/embeddings`)
  log("info", `Cursor/OpenAI config:`)
  log("info", `  API Base URL: http://${HOST}:${PORT}/v1`)
  log("info", `  Model: mimo-auto (auto-remapped to ${DEFAULT_MODEL})`)
})
