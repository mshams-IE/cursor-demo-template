// @vitest-environment node
import { spawn, type ChildProcess } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { definePack } from '../src/pack'
import { toMs } from '../src/model/time'
import { readCompletion, runModel } from '../src/engine/model'
import { sendToExpert } from '../src/conversation'
import { useDemo } from '../src/store'
import { config, handle } from './expert'

const ENV = { OPENAI_API_KEY: 'sk-test-secret', OPENAI_MODEL: 'test-model' }
const post = (body: unknown) => new Request('http://localhost/api/expert', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
const sse = (chunks: unknown[]) => new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n', { headers: { 'content-type': 'text/event-stream' } })

describe('expert proxy', () => {
  it('reads the OpenAI settings with defaults', () => {
    expect(config({})).toMatchObject({ enabled: false, model: 'gpt-4.1-mini', base: 'https://api.openai.com/v1' })
    expect(config({ ...ENV, OPENAI_BASE_URL: 'http://127.0.0.1:5190/v1/' })).toMatchObject({ enabled: true, model: 'test-model', base: 'http://127.0.0.1:5190/v1' })
  })

  it('reports status without the key', async () => {
    const off = await (await handle(new Request('http://localhost/api/expert/status'), '/status', {})).json()
    expect(off).toEqual({ enabled: false })
    const res = await handle(new Request('http://localhost/api/expert/status'), '/status', ENV)
    const text = await res.text()
    expect(JSON.parse(text)).toEqual({ enabled: true, model: 'test-model' })
    expect(text).not.toContain('sk-test')
  })

  it('refuses when not configured and validates messages', async () => {
    expect((await handle(post({ messages: [{ role: 'user', content: 'hi' }] }), '', {})).status).toBe(503)
    expect((await handle(post({ messages: [] }), '', ENV)).status).toBe(400)
    expect((await handle(post({ messages: [{ role: 'admin', content: 'x' }] }), '', ENV)).status).toBe(400)
    expect((await handle(new Request('http://localhost/api/expert/nope'), '/nope', ENV)).status).toBe(404)
  })

  it('forwards to chat completions with the key server-side and streams the reply back', async () => {
    const fetchImpl = vi.fn(async () => sse([{ choices: [{ delta: { content: 'Hello' } }] }, { choices: [{ delta: { content: ' there' } }] }]))
    const res = await handle(post({ messages: [{ role: 'user', content: 'hi' }], tools: [{ type: 'function', function: { name: 'get_kpis' } }] }), '', ENV, fetchImpl as unknown as typeof fetch)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('event-stream')
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.openai.com/v1/chat/completions')
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test-secret')
    const body = JSON.parse(String(init.body))
    expect(body).toMatchObject({ model: 'test-model', stream: true, tool_choice: 'auto' })
    expect(body.messages[0].role).toBe('system')
    expect((await readCompletion(res)).content).toBe('Hello there')
  })

  it('hides upstream errors and never echoes the key', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"error":"bad key sk-test-secret"}', { status: 401 }))
    const res = await handle(post({ messages: [{ role: 'user', content: 'hi' }] }), '', ENV, fetchImpl as unknown as typeof fetch)
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('sk-test')
    const down = await handle(post({ messages: [{ role: 'user', content: 'hi' }] }), '', ENV, (async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch)
    expect(down.status).toBe(502)
  })
})

describe('model round trip through the proxy and the mock server', () => {
  const port = 5290 + Math.floor(Math.random() * 50)
  let child: ChildProcess
  const realFetch = globalThis.fetch
  const env = { OPENAI_API_KEY: 'mock', OPENAI_BASE_URL: `http://127.0.0.1:${port}/v1` }
  const viaProxy = (async (url: string, init: RequestInit) => handle(new Request(`http://localhost${url}`, init), '', env, realFetch)) as unknown as typeof fetch
  const pack = definePack(JSON.parse(readFileSync(join(__dirname, '../../pack/demo-spec.json'), 'utf8')))
  const ctx = { clockMs: toMs(pack.spec.clock.observedAt), mode: 'experts' as const }
  const expert = pack.spec.experts[0]

  beforeAll(async () => {
    child = spawn(process.execPath, [join(__dirname, '../../scripts/mock-llm.mjs')], { env: { ...process.env, MOCK_LLM_PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] })
    await new Promise<void>((resolve, reject) => {
      child.stdout!.on('data', (d: Buffer) => d.toString().includes('mock llm') && resolve())
      child.on('error', reject)
      setTimeout(() => reject(new Error('mock did not start')), 5000)
    })
  })
  afterAll(() => child?.kill())

  it('runs a tool in the browser, streams text and passes the grounding check', async () => {
    const texts: string[] = []
    const tools: string[] = []
    const run = await runModel({ pack, expert, question: 'What are the key figures now?', ctx, locale: 'en', fetchImpl: viaProxy, endpoint: '/api/expert', onText: (t) => texts.push(t), onTool: (n) => tools.push(n) })
    expect(run.tools).toEqual(['get_kpis'])
    expect(tools).toEqual(['get_kpis'])
    expect(run.verified).toBe(true)
    expect(run.text).toContain(pack.spec.kpis[0].label.en)
    expect(texts.length).toBeGreaterThan(1)
  })

  it('answers history questions from the history tool', async () => {
    const run = await runModel({ pack, expert, question: 'Chart outages over the last 14 days', ctx, locale: 'en', fetchImpl: viaProxy, endpoint: '/api/expert' })
    expect(run.tools).toEqual(['get_history'])
    expect(run.verified).toBe(true)
  })

  it('flags invented figures', async () => {
    const run = await runModel({ pack, expert, question: 'invent a number', ctx, locale: 'en', fetchImpl: viaProxy, endpoint: '/api/expert' })
    expect(run.verified).toBe(false)
    expect(run.unverified).toContain('98765')
  })

  it('sendToExpert writes a model turn, and falls back to the local answer when figures do not check out', async () => {
    vi.stubGlobal('fetch', viaProxy)
    try {
      useDemo.setState({ chats: {}, mode: 'experts', clockMs: ctx.clockMs, expertMode: { kind: 'model', model: 'mock' } })
      await sendToExpert(pack, expert.id, 'What are the key figures now?')
      expect(useDemo.getState().chats[expert.id].at(-1)).toMatchObject({ role: 'expert', kind: 'model', tools: ['get_kpis'], pending: false, stream: undefined })
      await sendToExpert(pack, expert.id, 'invent a number')
      const turns = useDemo.getState().chats[expert.id]
      expect(turns.at(-1)?.role).toBe('note')
      expect(turns.at(-2)).toMatchObject({ role: 'expert', pending: false, tools: ['get_kpis'] })
      expect(turns.at(-2)?.kind).not.toBe('model')
    } finally {
      vi.unstubAllGlobals()
      useDemo.setState({ chats: {}, expertMode: { kind: 'local' } })
    }
  })

  it('throws on timeout so the caller can fall back to the local engine', async () => {
    const hang = (() => new Promise(() => {})) as unknown as typeof fetch
    await expect(runModel({ pack, expert, question: 'x', ctx, locale: 'en', fetchImpl: hang, endpoint: '/api/expert', timeoutMs: 50 })).rejects.toThrow()
  })
})
