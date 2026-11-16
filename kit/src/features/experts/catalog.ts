import man1 from '../../../assets/experts/man-1.jpg'
import man2 from '../../../assets/experts/man-2.jpg'
import man3 from '../../../assets/experts/man-3.jpg'
import woman1 from '../../../assets/experts/woman-1.jpg'
import woman2 from '../../../assets/experts/woman-2.jpg'
import woman3 from '../../../assets/experts/woman-3.jpg'
import type { Pack } from '../../pack'
import type { Answer, DemoSpec, Expert, Locale, Specialist } from '../../types'

const KIT_PORTRAITS: Record<string, string> = { 'man-1': man1, 'man-2': man2, 'man-3': man3, 'woman-1': woman1, 'woman-2': woman2, 'woman-3': woman3 }

/** `kit:man-1` and friends resolve to the kit's portraits; anything else is used as a URL. */
export function portraitUrl(portrait?: string): string | undefined {
  if (!portrait) return undefined
  if (portrait.startsWith('kit:')) return KIT_PORTRAITS[portrait.slice(4)]
  return portrait
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export const isAvailable = (e: Expert) => e.available !== false

export function availableExperts(spec: DemoSpec): Expert[] {
  return spec.experts.filter(isAvailable)
}

export function expertById(spec: DemoSpec, id?: string): Expert | undefined {
  return spec.experts.find((e) => e.id === id)
}

/** The expert the dock and panels follow: the selected one, else the first available. */
export function currentExpert(spec: DemoSpec, id?: string): Expert | undefined {
  const e = expertById(spec, id)
  return e && isAvailable(e) ? e : (availableExperts(spec)[0] ?? spec.experts[0])
}

const ARABIC = /[\u0600-\u06FF]/

/** The answer's first phrasing in the locale; English when the pack has no Arabic phrasing. */
export function phrasing(a: Answer, locale: Locale): string {
  const ar = a.questions.find((q) => ARABIC.test(q))
  if (locale === 'ar' && ar) return ar
  return a.questions.find((q) => !ARABIC.test(q)) ?? a.questions[0] ?? ''
}

export function starters(e: Expert, locale: Locale, n = 6): { id: string; text: string }[] {
  return e.answers.slice(0, n).map((a) => ({ id: a.id, text: phrasing(a, locale) }))
}

/** Specialists the expert calls; the whole roster when the expert names no team. */
export function teamOf(spec: DemoSpec, e?: Expert): Specialist[] {
  const all = spec.specialists ?? []
  if (!e?.team) return all
  return e.team.map((id) => all.find((s) => s.id === id)).filter((s): s is Specialist => !!s)
}

export function specialistsByIds(spec: DemoSpec, ids?: string[]): Specialist[] {
  const all = spec.specialists ?? []
  return (ids ?? []).map((id) => all.find((s) => s.id === id)).filter((s): s is Specialist => !!s)
}

/** Position among specialists of the same stage, so robots of one stage look different. */
export function stageIndex(spec: DemoSpec, id: string): number {
  const all = spec.specialists ?? []
  const s = all.find((x) => x.id === id)
  if (!s) return 0
  return all.filter((x) => x.stage === s.stage).findIndex((x) => x.id === id)
}

export function matchesQuery(pack: Pack, e: Expert, q: string): boolean {
  if (!q) return true
  const t = (x?: { en: string; ar?: string }) => (x ? [x.en, x.ar ?? ''] : [])
  const hay = [...t(e.name), ...t(e.role), ...t(e.focus), ...(e.tags ?? []).flatMap(t), ...e.answers.flatMap((a) => a.questions), pack.spec.expertCategories?.find((c) => c.id === e.category)?.label.en ?? '']
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w))
}
