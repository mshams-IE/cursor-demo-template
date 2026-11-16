// Tiny OpenAI-compatible chat-completions server for local checks of the expert proxy.
//   node scripts/mock-llm.mjs            (port 5190, or MOCK_LLM_PORT)
//   OPENAI_BASE_URL=http://127.0.0.1:5190/v1 OPENAI_API_KEY=mock npm run dev
// Round one calls one tool picked from the question; round two streams a short answer built
// from that tool's result. A question containing "invent" gets a figure that is in no tool result,
// to exercise the grounding check. GET /__last reports the shape of the last request, never the key.
import http from 'node:http'

const port = Number(process.env.MOCK_LLM_PORT ?? 5190)
let last = null

function pickTool(q, tools) {
  const has = (name) => tools.includes(name)
  if (has('get_history') && /chart|graph|trend|history|last \d+|past \d+|month|week|رسم|بياني|آخر|الشهر/i.test(q)) return ['get_history', { days: Number(q.match(/(\d+)\s*(?:days?|يوم)/i)?.[1] ?? 30) }]
  if (has('plan_options') && /budget|plan|option|what if|ميزاني|خطة|خيار/i.test(q)) return ['plan_options', {}]
  if (/incident|why|cause|حادث|سبب|لماذا/i.test(q)) return ['list_incidents', { phase: 'active' }]
  if (has('report_counts') && /how many|count|كم|عدد/i.test(q)) return ['report_counts', {}]
  return ['get_kpis', {}]
}

function answer(name, out, ar, q) {
  if (/invent|اختلق/i.test(q)) return ar ? 'الرقم الأهم اليوم هو 98,765.' : 'The headline figure today is 98,765.'
  try {
    if (name === 'get_history') return ar ? `بلغ متوسط ${out.label} ${out.average} خلال ${out.window}، والذروة ${out.peak.value} في ${out.peak.date}.` : `${out.label} averaged ${out.average} over ${out.window}, peaking at ${out.peak.value} on ${out.peak.date}.`
    if (name === 'plan_options') return ar ? `أفضل خطة تحقق ${out.delivered} ${out.benefit_unit} بتكلفة ${out.plan_cost} ${out.budget_unit}.` : `The best plan delivers ${out.delivered} ${out.benefit_unit} for ${out.plan_cost} ${out.budget_unit}.`
    if (name === 'list_incidents') {
      const i = out.incidents[0]
      return ar ? `هناك ${out.incidents.length} حوادث نشطة؛ أبرزها ${i.title} منذ ${i.started}.` : `${out.incidents.length} incidents are active; the main one is ${i.title}, since ${i.started}.`
    }
    if (name === 'report_counts') return ar ? `سُجّل ${out.total} اليوم.` : `${out.total} were recorded today.`
    const k = out.kpis[0]
    return ar ? `${k.label}: ${k.value.toLocaleString('en-US')} ${k.unit}.` : `${k.label} is ${k.value.toLocaleString('en-US')} ${k.unit} at ${out.clock}.`
  } catch {
    return ar ? 'لا تغطي الأدوات هذا السؤال.' : 'The tools do not cover that question.'
  }
}

function send(res, chunks) {
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  let i = 0
  const tick = () => {
    if (i < chunks.length) {
      res.write(`data: ${JSON.stringify(chunks[i++])}\n\n`)
      setTimeout(tick, 10)
    } else res.end('data: [DONE]\n\n')
  }
  tick()
}

http
  .createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0]
    if (req.method === 'GET' && path === '/__last') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(last))
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      if (req.method !== 'POST' || !path.endsWith('/chat/completions')) return res.writeHead(404).end()
      if (!(req.headers.authorization ?? '').startsWith('Bearer ')) return res.writeHead(401).end()
      const body = JSON.parse(raw)
      const { messages } = body
      const tools = (body.tools ?? []).map((t) => t.function?.name)
      last = { path, model: body.model, stream: body.stream, tools: tools.length, messages: messages.length, maxCompletionTokens: body.max_completion_tokens }
      const user = [...messages].reverse().find((m) => m.role === 'user')?.content ?? ''
      const tool = messages.filter((m) => m.role === 'tool').at(-1)
      if (!tool) {
        const [name, args] = pickTool(user, tools)
        return send(res, [{ choices: [{ delta: { tool_calls: [{ index: 0, id: 'call_1', type: 'function', function: { name, arguments: '' } }] } }] }, { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: JSON.stringify(args) } }] } }] }])
      }
      const call = messages.filter((m) => m.role === 'assistant' && m.tool_calls).at(-1)?.tool_calls?.[0]
      let out = {}
      try {
        out = JSON.parse(tool.content)
      } catch {
        /* truncated tool output */
      }
      const text = answer(call?.function?.name, out, /[\u0600-\u06FF]/.test(user), user)
      send(res, text.match(/.{1,8}/gsu).map((t) => ({ choices: [{ delta: { content: t } }] })))
    })
  })
  .listen(port, '127.0.0.1', () => console.log(`mock llm on ${port}`))
