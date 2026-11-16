import { bestAnswer, MATCH_THRESHOLD, STRONG_MATCH } from '../engine'
import type { Pack } from '../pack'
import type { Expert } from '../types'
import { has, type Parsed } from './nlu'

/** How much better another expert's scripted answer must score before the question moves. */
export const HANDOFF_MARGIN = 0.25

export interface Route {
  expertId: string
  reason?: 'better' | 'topic' | 'history'
}

const topicHits = (e: Expert, q: string) => (e.topics ?? []).filter((t) => has(q, [t])).length

/**
 * The available expert best placed to answer: the one asked, unless another clearly owns the question.
 * `composed` says the asked expert can already answer from the data, which raises the bar for a handoff.
 */
export function route(pack: Pack, currentId: string, question: string, p: Parsed, composed = false): Route {
  const others = pack.spec.experts.filter((e) => e.available !== false && e.id !== currentId)
  const current = pack.spec.experts.find((e) => e.id === currentId)
  if (!current || !others.length) return { expertId: currentId }
  const own = bestAnswer(current, question)?.score ?? 0
  if (own >= MATCH_THRESHOLD) return { expertId: currentId }
  const bar = composed ? STRONG_MATCH : MATCH_THRESHOLD
  let better: { e: Expert; score: number } | undefined
  for (const e of others) {
    const raw = bestAnswer(e, question)?.score ?? 0
    const s = raw + topicHits(e, p.q) / 100
    if (raw >= bar && raw >= own + HANDOFF_MARGIN && (!better || s > better.score)) better = { e, score: s }
  }
  if (better) return { expertId: better.e.id, reason: 'better' }
  const owner = p.intent === 'history' ? p.series?.expertId : undefined
  if (owner && owner !== currentId && others.some((e) => e.id === owner)) return { expertId: owner, reason: 'history' }
  const mine = topicHits(current, p.q)
  let topic: { e: Expert; hits: number } | undefined
  for (const e of others) {
    const hits = topicHits(e, p.q)
    if (hits > mine && (!topic || hits > topic.hits)) topic = { e, hits }
  }
  if (topic && !(owner === currentId)) return { expertId: topic.e.id, reason: 'topic' }
  return { expertId: currentId }
}
