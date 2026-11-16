/**
 * Digital Expert model proxy. Reads OPENAI_API_KEY, OPENAI_MODEL and OPENAI_BASE_URL from the
 * server environment only; the key never reaches the browser and is never logged. The browser
 * sends chat messages and tool definitions, runs the tools itself over the pack, and gets the
 * OpenAI chat-completions stream back unchanged.
 *
 *   GET  /api/expert/status  → { enabled, model }
 *   POST /api/expert         → text/event-stream from POST {base}/chat/completions
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

export const DEFAULT_MODEL = 'gpt-4.1-mini'
export const DEFAULT_BASE_URL = 'https://api.openai.com/v1'

const MAX_MESSAGES = 40
const MAX_CHARS = 80_000
const MAX_TOOLS = 24
const ANSWER_TOKENS = 1200
const UPSTREAM_TIMEOUT_MS = 60_000
const ROLES = new Set(['system', 'user', 'assistant', 'tool'])

const GUARD = [
  'Operate strictly as a Digital Expert in an executive demo workspace.',
  'Decline anything unrelated to the organisation, its operations, its data or how this solution works.',
  'Never claim to operate equipment, dispatch crews or contact anyone.',
].join(' ')

type Env = Record<string, string | undefined>

export function config(env: Env = process.env) {
  const key = (env.OPENAI_API_KEY ?? '').trim()
  const model = (env.OPENAI_MODEL ?? '').trim() || DEFAULT_MODEL
  const base = ((env.OPENAI_BASE_URL ?? '').trim() || DEFAULT_BASE_URL).replace(/\/+$/, '')
  return { key, model, base, enabled: key.length > 0 }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export function status(env: Env = process.env): Response {
  const c = config(env)
  return json({ enabled: c.enabled, model: c.enabled ? c.model : undefined })
}

interface Msg {
  role: string
  content: unknown
  tool_calls?: unknown
  tool_call_id?: unknown
}

export async function chat(request: Request, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const c = config(env)
  if (!c.enabled) return json({ error: 'The expert model is not configured' }, 503)
  let body: { messages?: Msg[]; tools?: unknown[]; stream?: boolean }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }
  const messages = Array.isArray(body.messages) ? body.messages : []
  if (!messages.length || messages.length > MAX_MESSAGES) return json({ error: 'Invalid messages' }, 400)
  if (JSON.stringify(messages).length > MAX_CHARS) return json({ error: 'Request too large' }, 413)
  if (!messages.every((m) => m && ROLES.has(m.role) && (typeof m.content === 'string' || m.content === null))) return json({ error: 'Invalid message' }, 400)
  const tools = Array.isArray(body.tools) && body.tools.length ? body.tools.slice(0, MAX_TOOLS) : undefined
  let upstream: Response
  try {
    upstream = await fetchImpl(`${c.base}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${c.key}` },
      body: JSON.stringify({
        model: c.model,
        messages: [{ role: 'system', content: GUARD }, ...messages.map((m) => ({ role: m.role, content: m.content, tool_calls: m.tool_calls, tool_call_id: m.tool_call_id }))],
        tools,
        tool_choice: tools ? 'auto' : undefined,
        temperature: 0.2,
        max_completion_tokens: ANSWER_TOKENS,
        stream: body.stream !== false,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    })
  } catch {
    return json({ error: 'Model endpoint unreachable' }, 502)
  }
  if (!upstream.ok) return json({ error: `Model endpoint returned ${upstream.status}` }, 502)
  return new Response(upstream.body, { status: 200, headers: { 'content-type': upstream.headers.get('content-type') ?? 'text/event-stream', 'cache-control': 'no-store' } })
}

/** Routes a request under /api/expert: `path` is what follows that prefix. */
export async function handle(request: Request, path: string, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const p = path.split('?')[0].replace(/\/+$/, '')
  if (request.method === 'GET' && (p === '/status' || p === '')) return status(env)
  if (request.method === 'POST' && p === '') return chat(request, env, fetchImpl)
  return json({ error: 'Not found' }, 404)
}

/** Node http / Connect middleware form, mounted at /api/expert. */
export async function nodeHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const headers = new Headers()
    for (const [k, v] of Object.entries(req.headers)) if (typeof v === 'string') headers.set(k, v)
    const request = new Request('http://localhost/api/expert', { method: req.method, headers, body: req.method === 'POST' ? Buffer.concat(chunks) : undefined })
    const r = await handle(request, req.url ?? '')
    res.statusCode = r.status
    r.headers.forEach((v, k) => res.setHeader(k, v))
    if (r.body) for await (const chunk of r.body as unknown as AsyncIterable<Uint8Array>) res.write(chunk)
    res.end()
  } catch {
    if (!res.headersSent) {
      res.statusCode = 500
      res.setHeader('content-type', 'application/json')
    }
    res.end(JSON.stringify({ error: 'Expert proxy failed' }))
  }
}
