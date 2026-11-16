// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ask } from '../engine'
import { definePack, type Pack } from '../pack'
import { useDemo } from '../store'
import { sendToExpert } from '../conversation'
import { toMs } from '../model/time'
import { ungroundedNumbers } from './grounding'
import { answerLocal, generate, parseQuestion } from './local'
import { route } from './routing'
import { pickTeam } from './team'
import { runTool } from './tools'
import type { EngineContext, Generated } from './words'

const root = join(__dirname, '../../..')
const load = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8')) as unknown
const PACKS = ['pack/demo-spec.json', ...readdirSync(join(root, 'samples')).map((d) => `samples/${d}/demo-spec.json`)]

function setup(path: string): { pack: Pack; ctx: EngineContext } {
  const pack = definePack(load(path))
  const p = pack.spec.planning
  return { pack, ctx: { clockMs: toMs(pack.spec.clock.observedAt), mode: 'experts', budget: p?.budget.default, windowHours: p?.windows[0], scenario: p?.scenario?.min } }
}

const textOf = (g: Generated) => [g.lead, ...g.points].join('\n')

describe.each(PACKS)('scripted routing — %s', (path) => {
  it('every phrasing still reaches its scripted answer and stays with its expert', () => {
    const { pack, ctx } = setup(path)
    for (const e of pack.spec.experts)
      for (const a of e.answers)
        for (const q of a.questions) {
          const expected = ask(pack, e.id, q)
          if (expected.kind !== 'answer') continue
          const got = answerLocal(pack, e.id, q, ctx)
          expect(got.kind === 'answer' ? got.answerId : got.kind, `${e.id}: "${q}"`).toBe(expected.answer.id)
          const p = parseQuestion(pack, q, ctx)
          expect(route(pack, e.id, q, p, false).expertId, `${e.id}: "${q}"`).toBe(e.id)
        }
  })

  it('every presenter question gets its scripted answer in every language', () => {
    const { pack, ctx } = setup(path)
    const beats = [...pack.spec.presenter.beats, ...(pack.spec.presenter.stories ?? []).flatMap((s) => s.beats)]
    for (const b of beats) {
      if (!b.ask) continue
      for (const q of [b.ask.question.en, b.ask.question.ar].filter((x): x is string => !!x)) {
        const got = answerLocal(pack, b.ask.expertId, q, ctx)
        expect(got.kind === 'answer' ? got.answerId : got.kind, `"${q}"`).toBe(b.ask.answerId)
      }
    }
  })

  it('composes status and ranking answers whose numbers come from the data', () => {
    const { pack, ctx } = setup(path)
    const sources = [JSON.stringify(runTool(pack, 'list_sites', { status: 'attention', limit: 50 }, ctx, 'en')), JSON.stringify(runTool(pack, 'list_incidents', {}, ctx, 'en')), JSON.stringify(pack.spec)]
    const live = sources[0]
    for (const q of ['What is the overall situation?', 'Rank the regions by sites needing attention', 'ما هو الوضع العام؟']) {
      const p = { ...parseQuestion(pack, q, ctx), intent: q.startsWith('Rank') ? ('rank' as const) : ('status' as const) }
      const g = generate(pack, p, ctx)!
      expect(g, q).toBeTruthy()
      expect(ungroundedNumbers(textOf(g), [...sources, String(pack.spec.sites.length), JSON.stringify(pack.spec.regions.map((r) => pack.spec.sites.filter((s) => s.regionId === r.id).length)), live]), q).toEqual([])
    }
  })
})

describe('generated families on the flagship pack', () => {
  let pack: Pack
  let ctx: EngineContext
  beforeEach(() => ({ pack, ctx } = setup('pack/demo-spec.json')))

  const tools = () => [
    JSON.stringify(runTool(pack, 'get_kpis', {}, ctx, 'en')),
    JSON.stringify(runTool(pack, 'get_kpis', {}, { ...ctx, clockMs: ctx.clockMs - 3_600_000 }, 'en')),
    JSON.stringify(runTool(pack, 'list_sites', { limit: 50 }, ctx, 'en')),
    JSON.stringify(pack.spec.incidents),
    JSON.stringify(pack.spec.facts),
    JSON.stringify(pack.spec.sites),
  ]

  it.each([
    ['incident', 'Tell me about the incident at Jeddah North 133, what is the evidence?'],
    ['site', 'How is Olaya 118 doing?'],
    ['kpi', 'interrupted connections now'],
    ['status', 'status in Makkah'],
  ])('%s answers cite only figures from the data', (intent, q) => {
    const r = answerLocal(pack, 'grid', q, ctx)
    const g = r.kind === 'generated' ? r.generated : generate(pack, parseQuestion(pack, q, ctx), ctx)!
    expect(g.intent).toBe(intent)
    expect(ungroundedNumbers(textOf(g), tools())).toEqual([])
  })

  it('history answers are deterministic and match the history tool', () => {
    const q = 'chart feeder outages over the last 14 days'
    const a = answerLocal(pack, 'grid', q, ctx)
    const b = answerLocal(pack, 'grid', q, ctx)
    expect(a).toEqual(b)
    expect(a.kind).toBe('generated')
    if (a.kind !== 'generated') return
    expect(a.generated.visual?.kind).toBe('line')
    if (a.generated.visual?.kind === 'line') expect(a.generated.visual.points).toHaveLength(14)
    const tool = JSON.stringify(runTool(pack, 'get_history', { series_id: 'feeder-outages', days: 14 }, ctx, 'en'))
    expect(ungroundedNumbers(textOf(a.generated), [tool])).toEqual([])
  })

  it('history breakdowns, peaks, months and year comparisons produce charts', () => {
    const by = answerLocal(pack, 'grid', 'feeder outages by cause over the last 6 months', ctx)
    expect(by.kind === 'generated' && by.generated.visual?.kind).toBe('stacked')
    const shares = JSON.stringify(runTool(pack, 'get_history', { series_id: 'feeder-outages', days: 180, breakdown: true }, ctx, 'en'))
    if (by.kind === 'generated') expect(ungroundedNumbers(textOf(by.generated), [shares])).toEqual([])
    const peak = answerLocal(pack, 'planning', 'what was the peak demand day in the last 12 months', ctx)
    expect(peak.kind === 'generated' && peak.generated.visual?.kind).toBe('bar')
    const cmp = answerLocal(pack, 'grid', 'compare feeder outages in August with last year', ctx)
    expect(cmp.kind === 'generated' && cmp.generated.visual?.kind).toBe('table')
    const ar = answerLocal(pack, 'grid', 'ارسم انقطاعات المغذيات آخر 30 يوما', ctx)
    expect(ar.kind === 'generated' && ar.generated.locale).toBe('ar')
  })

  it('planning reads budget and scenario from the question and matches the planner', () => {
    const r = answerLocal(pack, 'planning', 'what if budget is 4 and window 12 hours', ctx)
    expect(r.kind).toBe('generated')
    if (r.kind !== 'generated') return
    const tool = JSON.stringify(runTool(pack, 'plan_options', { budget: 4, window_hours: 12 }, ctx, 'en'))
    expect(ungroundedNumbers(textOf(r.generated), [tool, JSON.stringify(pack.spec.planning)])).toEqual([])
    expect(r.generated.lead).toContain('4 SAR M')
  })

  it('report mode answers with counts only', () => {
    const r = answerLocal(pack, 'grid', 'how many outages in Riyadh today, and why?', { ...ctx, mode: 'report' })
    expect(r.kind).toBe('generated')
    if (r.kind !== 'generated') return
    expect(r.generated.intent).toBe('report')
    const today = JSON.stringify(runTool(pack, 'report_counts', { region_id: 'riyadh' }, ctx, 'en'))
    const all = JSON.stringify(runTool(pack, 'report_counts', {}, ctx, 'en'))
    const yday = JSON.stringify(runTool(pack, 'report_counts', { day: 'yesterday', region_id: 'riyadh' }, ctx, 'en'))
    expect(ungroundedNumbers(textOf(r.generated), [today, all, yday])).toEqual([])
    expect(textOf(r.generated)).toMatch(/counts only/)
  })

  it('hands a question to the expert whose topic it is', () => {
    const q = 'How many customers are still affected?'
    const p = parseQuestion(pack, q, ctx)
    expect(route(pack, 'planning', q, p)).toEqual({ expertId: 'customer', reason: 'better' })
    const t = 'Is the transformer temperature rising?'
    expect(route(pack, 'customer', t, parseQuestion(pack, t, ctx))).toEqual({ expertId: 'asset', reason: 'topic' })
    expect(route(pack, 'grid', 'chart feeder outages over the last 14 days', parseQuestion(pack, 'chart feeder outages over the last 14 days', ctx), true).expertId).toBe('grid')
  })

  it('picks specialists from the expert team by question type', () => {
    const grid = pack.spec.experts.find((e) => e.id === 'grid')!
    expect(pickTeam(pack, grid, 'planning')).toEqual(['orchestrator', 'planning', 'validation'])
    expect(pickTeam(pack, grid, 'brief')).toEqual(grid.team)
    expect(pickTeam(pack, grid, 'report')).toEqual([])
  })
})

describe('sendToExpert', () => {
  beforeEach(() => useDemo.setState({ chats: {}, mode: 'experts', expertMode: { kind: 'local' }, busyExpertId: undefined }))

  it('fills a pending turn with the team and the scripted answer', async () => {
    const { pack, ctx } = setup('pack/demo-spec.json')
    useDemo.setState({ clockMs: ctx.clockMs })
    const out = await sendToExpert(pack, 'grid', 'What needs attention right now?')
    expect(out.expertId).toBe('grid')
    const turns = useDemo.getState().chats.grid
    expect(turns.map((t) => t.role)).toEqual(['user', 'expert'])
    expect(turns[1]).toMatchObject({ kind: 'answer', answerId: 'now', pending: false })
    expect(turns[1].team?.length).toBeGreaterThan(0)
    expect(useDemo.getState().busyExpertId).toBeUndefined()
  })

  it('hands off with a note in both threads and answers in the target', async () => {
    const { pack, ctx } = setup('pack/demo-spec.json')
    useDemo.setState({ clockMs: ctx.clockMs })
    const out = await sendToExpert(pack, 'planning', 'How many customers are still affected?')
    expect(out.expertId).toBe('customer')
    const s = useDemo.getState()
    expect(s.chats.planning.map((t) => t.role)).toEqual(['user', 'note'])
    expect(s.chats.customer.map((t) => t.role)).toEqual(['note', 'user', 'expert'])
    expect(s.chats.customer[0].note?.en).toMatch(/^Handed to /)
  })

  it('refuses out-of-scope topics', async () => {
    const { pack } = setup('pack/demo-spec.json')
    const kw = pack.spec.refusals.topics[0].keywords[0]
    await sendToExpert(pack, 'grid', `Tell me about ${kw}`)
    expect(useDemo.getState().chats.grid.at(-1)).toMatchObject({ kind: 'refusal', team: [] })
  })
})

describe('grounding', () => {
  const sources = [JSON.stringify({ affected: 13032, share: 0.245, loading: 92.37, at: '14:30', demand: 71923 })]
  it('accepts figures written with separators, rounding, scaling and Arabic digits', () => {
    expect(ungroundedNumbers('13,032 connections are off; loading 92.4% at 14:30, about 24.5% share, peak 71.9k MW.', sources)).toEqual([])
    expect(ungroundedNumbers('١٣٬٠٣٢ توصيلة منقطعة عند 14:30', sources)).toEqual([])
    expect(ungroundedNumbers('Substation SS-RYD-247 in 2026 with 3 crews', sources)).toEqual([])
  })
  it('rejects invented figures and times', () => {
    expect(ungroundedNumbers('The headline figure today is 98,765.', sources)).toEqual(['98765'])
    expect(ungroundedNumbers('Restored at 16:45.', sources)).toEqual(['16:45'])
  })
})
