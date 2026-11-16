import { fold, tokens } from '../engine'
import type { DemoSpec, HistorySeries, Incident, Kpi, Locale, Region, Site } from '../types'

export type Intent = 'status' | 'incident' | 'kpi' | 'rank' | 'site' | 'history' | 'planning' | 'report' | 'brief' | 'unknown'

export interface HistWindow {
  /** Days back from the clock's day, inclusive (0 is today). */
  from: number
  to: number
  label: { en: string; ar: string }
  /** Calendar month 0–11 when the question named a month. */
  month?: number
}

export interface HistAsk {
  windows: HistWindow[]
  compare?: 'year' | 'previous'
  peak: boolean
  by: boolean
  explicit: boolean
}

export interface Parsed {
  locale: Locale
  q: string
  sites: Site[]
  regions: Region[]
  incidents: Incident[]
  kpis: Kpi[]
  series?: HistorySeries
  numbers: number[]
  hist: HistAsk
  intent: Intent
}

export const isArabic = (s: string) => /[\u0600-\u06FF]/.test(s)

/** True when any of the words appears at a word start in the folded question. */
export function has(q: string, words: string[]): boolean {
  return words.some((w) => {
    const f = fold(w)
    return new RegExp(`(^|[^\\p{L}\\p{N}])(ال|و|ب|ل)?${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'u').test(q)
  })
}

const near = (a: string, b: string) => a === b || (a.length > 4 && b.length > 4 && (a.startsWith(b) || b.startsWith(a)))

/** Share of the name's distinctive tokens found in the question. */
function coverage(qt: string[], name: string, generic: Set<string>): number {
  const nt = tokens(name).filter((t) => !generic.has(t) && (t.length > 2 || /\d/.test(t)))
  if (!nt.length) return 0
  return nt.filter((t) => qt.some((x) => near(x, t))).length / nt.length
}

function genericWords(spec: DemoSpec): Set<string> {
  const v = spec.vocabulary
  const words = ['region', 'province', 'site', 'station', 'area', 'منطقه', 'محطه', 'موقع']
  for (const t of [v?.entity, v?.entityPlural, v?.group, v?.groupPlural]) if (t) words.push(t.en, t.ar ?? '')
  return new Set(words.flatMap((w) => tokens(w)))
}

const STATUS_WORDS = ['attention', 'status', 'situation', 'happening', 'overview', 'summary', 'priority', 'priorities', 'concern', 'worry', 'wrong', 'going on', 'انتباه', 'اهتمام', 'الوضع', 'حاله', 'يحدث', 'ملخص', 'اولويه', 'اولويات', 'يقلق', 'يجري']
const INCIDENT_WORDS = ['incident', 'why', 'cause', 'caused', 'root', 'evidence', 'timeline', 'restore', 'restoration', 'how long', 'when will', 'eta', 'حادث', 'حادثه', 'لماذا', 'سبب', 'اسباب', 'دليل', 'ادله', 'الجدول الزمني', 'استعاده', 'متى']
const RANK_WORDS = ['rank', 'ranking', 'most', 'worst', 'top', 'highest', 'which', 'compare regions', 'ترتيب', 'رتب', 'اكثر', 'اسوا', 'اعلى', 'اي']
const HISTORY_WORDS = ['chart', 'graph', 'plot', 'trend', 'history', 'historical', 'last year', 'past year', 'over time', 'daily', 'monthly', 'peak day', 'رسم', 'بياني', 'مخطط', 'اتجاه', 'تاريخ', 'السجل', 'العام الماضي', 'يوميا', 'شهريا']
const PLAN_WORDS = ['budget', 'plan', 'option', 'options', 'what if', 'scenario', 'spend', 'invest', 'ميزانيه', 'خطه', 'خيار', 'خيارات', 'ماذا لو', 'سيناريو', 'انفاق']
const BRIEF_WORDS = ['brief', 'briefing', 'board', 'ministry', 'موجز', 'احاطه', 'ملخص تنفيذي']
const COUNT_WORDS = ['how many', 'count', 'number of', 'total', 'كم', 'عدد', 'اجمالي']

const MONTHS = [
  ['january', 'jan', 'يناير'],
  ['february', 'feb', 'فبراير'],
  ['march', 'mar', 'مارس'],
  ['april', 'apr', 'ابريل'],
  ['may', 'مايو'],
  ['june', 'jun', 'يونيو'],
  ['july', 'jul', 'يوليو'],
  ['august', 'aug', 'اغسطس'],
  ['september', 'sep', 'sept', 'سبتمبر'],
  ['october', 'oct', 'اكتوبر'],
  ['november', 'nov', 'نوفمبر'],
  ['december', 'dec', 'ديسمبر'],
]

const UNIT_DAYS: [RegExp, number][] = [
  [/^(day|days|يوم|يوما|ايام)$/, 1],
  [/^(week|weeks|اسبوع|اسبوعا|اسابيع)$/, 7],
  [/^(month|months|شهر|شهرا|اشهر|شهور)$/, 30],
  [/^(year|years|سنه|عام)$/, 365],
]

const unitLabel = (n: number, unit: number) => {
  const en = unit === 1 ? 'days' : unit === 7 ? 'weeks' : unit === 30 ? 'months' : 'years'
  const ar = unit === 1 ? 'يوماً' : unit === 7 ? 'أسابيع' : unit === 30 ? 'أشهر' : 'سنوات'
  return { en: `the last ${n} ${en}`, ar: `آخر ${n} ${ar}` }
}

/** Calendar month index of a month name in the question, if any. */
export function monthIn(q: string): number | undefined {
  const words = q.split(/[^\p{L}]+/u)
  const i = MONTHS.findIndex((names) => names.some((n) => words.includes(fold(n))))
  return i < 0 ? undefined : i
}

export function parseHist(q: string, monthOf: (d: number) => number, maxDays: number): HistAsk {
  const windows: HistWindow[] = []
  const m = q.match(/(?:last|past|previous|اخر|الماضيه?|السابقه?)\s+(\d+)\s+(\p{L}+)/u) ?? q.match(/(\d+)\s+(\p{L}+)\s+(?:الماضيه?|الاخيره?|ago)/u)
  if (m) {
    const unit = UNIT_DAYS.find(([re]) => re.test(m[2]))?.[1]
    if (unit) {
      const n = Number(m[1])
      windows.push({ from: Math.min(maxDays - 1, n * unit - 1), to: 0, label: unitLabel(n, unit) })
    }
  }
  if (!windows.length) {
    if (has(q, ['last week', 'past week', 'الاسبوع الماضي', 'اخر اسبوع'])) windows.push({ from: 6, to: 0, label: { en: 'the last 7 days', ar: 'آخر 7 أيام' } })
    else if (has(q, ['last month', 'past month', 'الشهر الماضي', 'اخر شهر'])) windows.push({ from: 29, to: 0, label: { en: 'the last 30 days', ar: 'آخر 30 يوماً' } })
    else if (has(q, ['last year', 'past year', '12 months', 'twelve months', 'this year', 'العام الماضي', 'السنه الماضيه', '12 شهرا', 'هذا العام'])) windows.push({ from: maxDays - 1, to: 0, label: { en: 'the last 12 months', ar: 'آخر 12 شهراً' } })
  }
  const month = monthIn(q)
  if (month !== undefined) {
    let to = -1
    for (let d = 0; d < maxDays; d++) if (monthOf(d) === month) {
      to = d
      break
    }
    if (to >= 0) {
      let from = to
      while (from + 1 < maxDays && monthOf(from + 1) === month) from++
      windows.push({ from, to, month, label: { en: MONTHS[month][0].replace(/^./, (c) => c.toUpperCase()), ar: MONTHS[month].at(-1)! } })
    }
  }
  const compare = has(q, ['last year', 'same month last year', 'a year ago', 'year on year', 'العام الماضي', 'السنه الماضيه']) && has(q, ['compare', 'versus', 'vs', 'than', 'against', 'قارن', 'مقارنه', 'مقابل']) ? 'year' : has(q, ['compare', 'versus', 'vs', 'قارن', 'مقارنه']) && windows.length === 1 ? 'previous' : undefined
  return {
    windows,
    compare,
    peak: has(q, ['peak', 'highest day', 'worst day', 'busiest', 'maximum', 'record', 'ذروه', 'اعلى يوم', 'اسوا يوم', 'اقصى']),
    by: has(q, ['by cause', 'breakdown', 'break down', 'split', 'by region', 'by type', 'per ', 'حسب', 'توزيع', 'تفصيل']),
    explicit: windows.length > 0,
  }
}

/** Numbers written in the question, with Arabic-Indic digits read as Latin. */
export function numbersIn(question: string): number[] {
  const latin = question.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
  return (latin.match(/\d+(?:\.\d+)?/g) ?? []).map(Number)
}

export function parse(spec: DemoSpec, question: string, opts: { monthOf: (d: number) => number; maxDays: number; mode?: 'report' | 'experts' }): Parsed {
  const q = fold(question)
  const qt = tokens(question)
  const generic = genericWords(spec)
  const sites = spec.sites.filter((s) => q.includes(fold(s.id)) || coverage(qt, s.name.en, generic) === 1 || (!!s.name.ar && coverage(qt, s.name.ar, generic) === 1))
  const regions = spec.regions.filter((r) => q.includes(fold(r.id)) || coverage(qt, r.name.en, generic) === 1 || (!!r.name.ar && coverage(qt, r.name.ar, generic) === 1))
  const named = spec.incidents.filter((i) => q.includes(fold(i.id)) || coverage(qt, i.title.en, generic) >= 0.75 || (!!i.title.ar && coverage(qt, i.title.ar, generic) >= 0.75))
  const incidents = named.length ? named : spec.incidents.filter((i) => sites.some((s) => s.id === i.siteId) || regions.some((r) => spec.sites.find((s) => s.id === i.siteId)?.regionId === r.id))
  const kpis = spec.kpis.filter(
    (k) =>
      Math.max(coverage(qt, k.label.en, generic), k.label.ar ? coverage(qt, k.label.ar, generic) : 0) >= 0.66 ||
      Math.max(coverage(qt, `${k.label.en} ${k.unit.en}`, generic), k.label.ar ? coverage(qt, `${k.label.ar} ${k.unit.ar ?? ''}`, generic) : 0) >= 0.5,
  )
  const series = bestSeries(spec, q, qt, generic)
  const hist = parseHist(q, opts.monthOf, opts.maxDays)
  const numbers = numbersIn(question)
  const ctxWords = { sites: sites.length > 0, incidents: named.length > 0 || has(q, INCIDENT_WORDS) }
  let intent: Intent = 'unknown'
  if (opts.mode === 'report' && spec.report) intent = 'report'
  else if (has(q, BRIEF_WORDS)) intent = 'brief'
  else if (spec.planning && has(q, PLAN_WORDS)) intent = 'planning'
  else if (spec.history?.length && (hist.explicit || has(q, HISTORY_WORDS) || (hist.peak && !!series))) intent = 'history'
  else if (ctxWords.incidents && (incidents.length || spec.incidents.length)) intent = 'incident'
  else if (ctxWords.sites) intent = 'site'
  else if (has(q, RANK_WORDS) && (has(q, ['region', 'regions', 'منطقه', 'مناطق']) || has(q, groupWords(spec)))) intent = 'rank'
  else if (kpis.length) intent = 'kpi'
  else if (regions.length) intent = 'status'
  else if (has(q, STATUS_WORDS) || has(q, COUNT_WORDS)) intent = 'status'
  return { locale: isArabic(question) ? 'ar' : 'en', q, sites, regions, incidents, kpis, series, numbers, hist, intent }
}

function groupWords(spec: DemoSpec): string[] {
  const v = spec.vocabulary
  return v ? [v.group.en, v.groupPlural.en, v.group.ar ?? '', v.groupPlural.ar ?? ''].filter(Boolean) : []
}

function bestSeries(spec: DemoSpec, q: string, qt: string[], generic: Set<string>): HistorySeries | undefined {
  let best: { s: HistorySeries; score: number } | undefined
  for (const s of spec.history ?? []) {
    const kw = (s.keywords ?? []).filter((k) => has(q, [k])).reduce((a, k) => Math.max(a, tokens(k).length), 0)
    const score = Math.max(kw, coverage(qt, s.label.en, generic) * 2, s.label.ar ? coverage(qt, s.label.ar, generic) * 2 : 0)
    if (score > 0 && (!best || score > best.score)) best = { s, score }
  }
  return best?.s
}

export const COUNT_QUESTION = COUNT_WORDS
