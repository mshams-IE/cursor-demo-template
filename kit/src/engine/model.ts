import type { Pack } from '../pack'
import { formatDate, formatTime } from '../model/time'
import type { Expert, Locale } from '../types'
import { ungroundedNumbers } from './grounding'
import { runTool, toolDefs } from './tools'
import { terms, type EngineContext } from './words'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: { id: string; type: 'function'; function: { name: string; arguments: string } }[]
  tool_call_id?: string
}

export interface ModelStatus {
  enabled: boolean
  model?: string
}

export interface ModelRun {
  text: string
  tools: string[]
  verified: boolean
  unverified: string[]
}

export interface ModelOptions {
  pack: Pack
  expert: Expert
  question: string
  ctx: EngineContext
  locale: Locale
  /** Earlier turns in this conversation, oldest first. */
  history?: { question: string; answer: string }[]
  fetchImpl?: typeof fetch
  endpoint?: string
  timeoutMs?: number
  maxRounds?: number
  /** Text written so far in the current round; called with '' when a round turns into tool calls. */
  onText?: (text: string) => void
  onTool?: (name: string) => void
}

export function expertEndpoint(path = ''): string {
  if (typeof document === 'undefined') return `/api/expert${path}`
  return new URL(`api/expert${path}`, document.baseURI).toString()
}

/** Whether the server has a model configured. Static and offline builds have no endpoint and read as off. */
export async function probeStatus(fetchImpl: typeof fetch = fetch, endpoint = expertEndpoint('/status'), timeoutMs = 2500): Promise<ModelStatus> {
  if (typeof location !== 'undefined' && location.protocol === 'file:') return { enabled: false }
  try {
    const res = await fetchImpl(endpoint, { signal: AbortSignal.timeout(timeoutMs) })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return { enabled: false }
    const j = (await res.json()) as Partial<ModelStatus>
    return { enabled: j.enabled === true, model: typeof j.model === 'string' ? j.model : undefined }
  } catch {
    return { enabled: false }
  }
}

export function systemPrompt(pack: Pack, expert: Expert, ctx: EngineContext, locale: Locale): string {
  const s = pack.spec
  const w = terms(pack, 'en')
  const lang = locale === 'ar' ? 'Arabic (Modern Standard, formal)' : 'English'
  const region = ctx.regionId ? pack.regionName(ctx.regionId, 'en') : undefined
  const site = ctx.siteId ? pack.site(ctx.siteId) : undefined
  return [
    `You are ${expert.name.en}, ${expert.role.en}, one of the Digital Experts advising executives of ${s.customer.name.en}. Focus: ${expert.focus.en}${expert.intro ? ` ${expert.intro.en}` : ''}`,
    `The workspace calls its ${w.sites} "${w.sites}" and groups them by ${w.region}. ${w.regions.replace(/^./, (c) => c.toUpperCase())}: ${s.regions.map((r) => `${r.id} (${r.name.en})`).join(', ')}.`,
    `Reply only in ${lang}, in a short executive style: answer directly in the first sentence, then two or three short supporting facts. No headings, tables or markdown.`,
    'Answer only from tool results in this conversation. Call the most specific tool first. Quote every number exactly as a tool returned it; never estimate, extrapolate or invent figures, names, sites or options. If the tools do not cover the question, say so plainly and offer what you can answer.',
    'Describe a cause as a suspected driver unless the tool says it is confirmed. You cannot operate equipment, dispatch crews or contact anyone; suggest assigning an action for review instead.',
    'History tools hold 12 months of reference data; never claim more. The app draws any chart itself, so do not describe one. Do not refer the user to another expert.',
    `Clock: ${formatDate(ctx.clockMs, 'en')} ${formatTime(ctx.clockMs, 'en')} ${s.clock.zone.en}.${region ? ` Selected ${w.region}: ${region}.` : ''}${site ? ` Selected ${w.site}: ${site.id} ${site.name.en}.` : ''}`,
  ].join('\n')
}

interface Completion {
  content: string
  toolCalls: NonNullable<ChatMessage['tool_calls']>
}

/** Reads an OpenAI chat-completions response, streamed (SSE) or whole. */
export async function readCompletion(res: Response, onToken?: (t: string) => void): Promise<Completion> {
  const type = res.headers.get('content-type') ?? ''
  if (!type.includes('event-stream') || !res.body) {
    const j = (await res.json()) as { choices?: { message?: { content?: string; tool_calls?: Completion['toolCalls'] } }[] }
    const m = j.choices?.[0]?.message ?? {}
    if (m.content) onToken?.(m.content)
    return { content: m.content ?? '', toolCalls: m.tool_calls ?? [] }
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let content = ''
  const calls: { id: string; name: string; args: string }[] = []
  const line = (raw: string) => {
    const l = raw.trim()
    if (!l.startsWith('data:')) return
    const data = l.slice(5).trim()
    if (!data || data === '[DONE]') return
    let j: { choices?: { delta?: { content?: string; tool_calls?: { index: number; id?: string; function?: { name?: string; arguments?: string } }[] } }[] }
    try {
      j = JSON.parse(data)
    } catch {
      return
    }
    const d = j.choices?.[0]?.delta
    if (!d) return
    if (d.content) {
      content += d.content
      onToken?.(d.content)
    }
    for (const tc of d.tool_calls ?? []) {
      const slot = (calls[tc.index] ??= { id: '', name: '', args: '' })
      if (tc.id) slot.id = tc.id
      if (tc.function?.name) slot.name += tc.function.name
      if (tc.function?.arguments) slot.args += tc.function.arguments
    }
  }
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i: number
    while ((i = buf.indexOf('\n')) >= 0) {
      line(buf.slice(0, i))
      buf = buf.slice(i + 1)
    }
  }
  if (buf) line(buf)
  return { content, toolCalls: calls.filter(Boolean).map((c, k) => ({ id: c.id || `call_${k}`, type: 'function' as const, function: { name: c.name, arguments: c.args || '{}' } })) }
}

/**
 * Asks the connected model through the server proxy. Tools run here in the browser over the pack;
 * the answer is checked so every figure appears in a tool result or the pack's key figures.
 * Throws on errors, timeouts and when the model never settles on an answer.
 */
export async function runModel(o: ModelOptions): Promise<ModelRun> {
  const ctl = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      ctl.abort()
      reject(new Error('timeout'))
    }, o.timeoutMs ?? 30_000)
  })
  try {
    return await Promise.race([converse(o, ctl.signal), timeout])
  } finally {
    clearTimeout(timer)
  }
}

async function converse(o: ModelOptions, signal: AbortSignal): Promise<ModelRun> {
  const f = o.fetchImpl ?? fetch
  const endpoint = o.endpoint ?? expertEndpoint()
  const system = systemPrompt(o.pack, o.expert, o.ctx, o.locale)
  const messages: ChatMessage[] = [{ role: 'system', content: system }]
  for (const h of (o.history ?? []).slice(-6)) messages.push({ role: 'user', content: h.question }, { role: 'assistant', content: h.answer.slice(0, 800) })
  messages.push({ role: 'user', content: o.question })
  const sources = [o.question, system, JSON.stringify(runTool(o.pack, 'get_kpis', {}, o.ctx, o.locale)), JSON.stringify(runTool(o.pack, 'get_fact', {}, o.ctx, o.locale))]
  const tools: string[] = []
  const defs = toolDefs(o.pack)
  for (let round = 0; round < (o.maxRounds ?? 4); round++) {
    let streamed = ''
    const res = await f(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ messages, tools: defs, stream: true }), signal })
    if (!res.ok) throw new Error(`expert endpoint ${res.status}`)
    const out = await readCompletion(res, (t) => {
      streamed += t
      o.onText?.(streamed)
    })
    if (!out.toolCalls.length) {
      const text = out.content.trim()
      if (!text) throw new Error('empty answer')
      const unverified = ungroundedNumbers(text, sources)
      return { text, tools, verified: unverified.length === 0, unverified }
    }
    if (streamed) o.onText?.('')
    messages.push({ role: 'assistant', content: out.content || null, tool_calls: out.toolCalls })
    for (const tc of out.toolCalls) {
      o.onTool?.(tc.function.name)
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(tc.function.arguments || '{}') as Record<string, unknown>
      } catch {
        args = {}
      }
      let result: unknown
      try {
        result = runTool(o.pack, tc.function.name, args, o.ctx, o.locale)
      } catch (e) {
        result = { error: String((e as Error).message ?? e) }
      }
      const json = JSON.stringify(result)
      sources.push(json)
      tools.push(tc.function.name)
      messages.push({ role: 'tool', tool_call_id: tc.id, content: json.slice(0, 12_000) })
    }
  }
  throw new Error('too many tool rounds')
}