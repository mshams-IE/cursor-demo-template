import { bestAnswer, MATCH_THRESHOLD, refusalTopic, STRONG_MATCH, tokens } from '../engine'
import type { Pack } from '../pack'
import { HISTORY_DAYS } from '../model/history'
import type { Expert } from '../types'
import { brief, incident, kpi, planning, rank, site, status } from './families'
import { historyAnswer, monthOfDay } from './history'
import { monthIn, numbersIn, parse, type Intent, type Parsed } from './nlu'
import { reportAnswer } from './report'
import type { EngineContext, Generated } from './words'

export type LocalReply =
  | { kind: 'answer'; answerId: string; intent: Intent; score: number }
  | { kind: 'generated'; generated: Generated; intent: Intent; suggestions: string[] }
  | { kind: 'refusal'; topic: string }
  | { kind: 'fallback'; suggestions: string[] }

export function parseQuestion(pack: Pack, question: string, ctx: EngineContext): Parsed {
  return parse(pack.spec, question, { monthOf: monthOfDay(ctx.clockMs), maxDays: HISTORY_DAYS, mode: ctx.mode })
}

export function generate(pack: Pack, p: Parsed, ctx: EngineContext, expertId?: string): Generated | undefined {
  switch (p.intent) {
    case 'report':
      return reportAnswer(pack, p, ctx)
    case 'history':
      return historyAnswer(pack, p, ctx, expertId)
    case 'planning':
      return planning(pack, p, ctx)
    case 'incident':
      return incident(pack, p, ctx)
    case 'site':
      return site(pack, p, ctx)
    case 'rank':
      return rank(pack, p, ctx)
    case 'kpi':
      return kpi(pack, p, ctx)
    case 'status':
      return status(pack, p, ctx)
    case 'brief':
      return brief(pack, p, ctx)
    default:
      return undefined
  }
}

/** The question names a figure, period or place the closest scripted phrasing does not. */
function asksSomethingElse(question: string, phrasing: string, p: Parsed): boolean {
  if (!['history', 'planning', 'site', 'incident', 'report'].includes(p.intent)) return false
  const nums = numbersIn(phrasing)
  if (numbersIn(question).some((n) => !nums.includes(n))) return true
  const pt = new Set(tokens(phrasing))
  if (monthIn(p.q) !== undefined && monthIn(tokens(phrasing).join(' ')) !== monthIn(p.q)) return true
  return [...p.sites, ...p.regions].some((x) => !tokens(x.name.en).some((t) => pt.has(t)) && !tokens(x.name.ar ?? '').some((t) => pt.has(t)))
}

function suggestionsFor(expert: Expert, question: string): string[] {
  const scored = expert.answers.map((a) => ({ id: a.id, s: bestAnswer({ ...expert, answers: [a] }, question)?.score ?? 0 })).sort((a, b) => b.s - a.s)
  return scored.slice(0, 3).map((x) => x.id)
}

/** Answers a question with the local engine: scripted answers first, then families composed from the data. */
export function answerLocal(pack: Pack, expertId: string, question: string, ctx: EngineContext): LocalReply {
  const expert = pack.spec.experts.find((e) => e.id === expertId) ?? pack.spec.experts[0]
  const topic = refusalTopic(pack, question)
  if (topic) return { kind: 'refusal', topic }
  const p = parseQuestion(pack, question, ctx)
  const best = bestAnswer(expert, question)
  const scripted = best && best.score >= MATCH_THRESHOLD && p.intent !== 'report'
  if (scripted && best.score >= STRONG_MATCH) return { kind: 'answer', answerId: best.answer.id, intent: p.intent, score: best.score }
  const generated = generate(pack, p, ctx, expert.id)
  if (scripted && (!generated || !asksSomethingElse(question, best.phrasing, p))) return { kind: 'answer', answerId: best.answer.id, intent: p.intent, score: best.score }
  if (generated) return { kind: 'generated', generated, intent: p.intent, suggestions: suggestionsFor(expert, question) }
  return { kind: 'fallback', suggestions: expert.answers.slice(0, 3).map((a) => a.id) }
}
