import type { Pack } from './pack'
import type { Answer, Expert } from './types'

export type Reply =
  | { kind: 'answer'; expert: Expert; answer: Answer; score: number }
  | { kind: 'refusal'; expert: Expert; topic: string }
  | { kind: 'fallback'; expert: Expert; suggestions: Answer[] }

const STOP = new Set(
  'a an the is are was were be been of to in on at for and or what whats how why which who when where do does did can could should would will me my our us we you your it its this that these there about tell show give please now today right any some with from by than then so much many'
    .split(' ')
    .concat('ما ماذا كيف لماذا من في على عن الى إلى هل هذا هذه هناك الآن اليوم لي لنا أي و او أو كم'.split(' ')),
)

/** Lower-cases, strips Arabic diacritics and tatweel, normalises alef/yaa/taa marbuta, and drops a leading "al"/"ال". */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0640\u0300-\u036f]/g, '')
    .replace(/[\u0622\u0623\u0625\u0627]/g, '\u0627')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
}

export function tokens(s: string): string[] {
  return fold(s)
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => (t.length > 3 && t.startsWith('ال') ? t.slice(2) : t))
    .filter((t) => t && !STOP.has(t))
}

function score(question: string, phrasing: string): number {
  const q = new Set(tokens(question))
  const p = tokens(phrasing)
  if (!p.length || !q.size) return 0
  if (fold(question).trim() === fold(phrasing).trim()) return 1
  const hits = p.filter((t) => q.has(t) || [...q].some((x) => x.length > 4 && (x.startsWith(t) || t.startsWith(x)))).length
  return hits / Math.max(p.length, Math.min(q.size, p.length + 2))
}

export const MATCH_THRESHOLD = 0.5

export function ask(pack: Pack, expertId: string, question: string): Reply {
  const expert = pack.spec.experts.find((e) => e.id === expertId) ?? pack.spec.experts[0]
  const q = fold(question)
  for (const t of pack.spec.refusals.topics)
    if (t.keywords.some((k) => q.includes(fold(k)))) return { kind: 'refusal', expert, topic: t.label.en }
  let best: { answer: Answer; score: number } | undefined
  for (const answer of expert.answers)
    for (const phrasing of answer.questions) {
      const s = score(question, phrasing)
      if (!best || s > best.score) best = { answer, score: s }
    }
  if (best && best.score >= MATCH_THRESHOLD) return { kind: 'answer', expert, answer: best.answer, score: best.score }
  return { kind: 'fallback', expert, suggestions: expert.answers.slice(0, 3) }
}
