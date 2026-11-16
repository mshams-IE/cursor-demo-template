import { fold, tokens } from '../engine'
import { pick, type Pack } from '../pack'
import { DAY, formatTime, startOfLocalDay, toMs } from '../model/time'
import { has, type Parsed } from './nlu'
import { L, num, SOURCE, terms, type EngineContext, type Generated } from './words'

export type ReportDayKey = 'today' | 'yesterday'

export interface ReportRow {
  siteId: string
  regionId?: string
  category?: string
  day: ReportDayKey
}

/** Report records up to the clock, tagged with their day. */
export function reportRows(pack: Pack, clockMs: number): ReportRow[] {
  const r = pack.spec.report
  if (!r) return []
  const start = startOfLocalDay(clockMs)
  const out: ReportRow[] = []
  for (const rec of r.records) {
    const t = toMs(rec.at)
    if (t > clockMs || t < start - DAY) continue
    out.push({ siteId: rec.siteId, regionId: pack.site(rec.siteId)?.regionId, category: rec.category, day: t >= start ? 'today' : 'yesterday' })
  }
  return out
}

export interface ReportCounts {
  total: number
  byRegion: { id: string; count: number }[]
  byCategory: { id: string; count: number }[]
}

export function countRows(rows: ReportRow[]): ReportCounts {
  const tally = (key: (r: ReportRow) => string | undefined) => {
    const m = new Map<string, number>()
    for (const r of rows) {
      const k = key(r)
      if (k) m.set(k, (m.get(k) ?? 0) + 1)
    }
    return [...m.entries()].map(([id, count]) => ({ id, count })).sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
  }
  return { total: rows.length, byRegion: tally((r) => r.regionId), byCategory: tally((r) => r.category) }
}

export function reportAnswer(pack: Pack, p: Parsed, ctx: EngineContext): Generated | undefined {
  const rep = pack.spec.report
  if (!rep) return undefined
  const { locale } = p
  const w = terms(pack, locale)
  const plural = pick(rep.plural, locale)
  const lower = locale === 'en' ? plural.toLowerCase() : plural
  const qt = tokens(p.q)
  const cat = rep.categories?.find((c) => [c.label.en, c.label.ar ?? ''].some((l) => l && tokens(l).every((t) => qt.some((x) => x === t || (t.length > 4 && x.startsWith(t.slice(0, 5)))))) || p.q.includes(fold(c.id)))
  const region = p.regions[0]
  const day: ReportDayKey = has(p.q, ['yesterday', 'امس', 'البارحه']) && !has(p.q, ['today', 'اليوم', 'compare', 'versus', 'vs', 'قارن', 'مقارنه']) ? 'yesterday' : 'today'
  const all = reportRows(pack, ctx.clockMs)
  const inScope = all.filter((r) => (!region || r.regionId === region.id) && (!cat || r.category === cat.id))
  const now = countRows(inScope.filter((r) => r.day === day))
  const other = countRows(inScope.filter((r) => r.day !== day))
  const dayTotal = all.filter((r) => r.day === day).length
  const time = formatTime(ctx.clockMs, locale)
  const dayWord = (d: ReportDayKey) => (d === 'today' ? L(locale, 'today', 'اليوم') : L(locale, 'yesterday', 'أمس'))
  const scope = [region ? pick(region.name, locale) : '', cat ? pick(cat.label, locale) : ''].filter(Boolean).join(' · ')
  const lead =
    region || cat
      ? L(locale, `${scope}: ${num(now.total, locale)} of ${num(dayTotal, locale)} ${lower} ${dayWord(day)}${day === 'today' ? ` up to ${time}` : ''}, against ${num(other.total, locale)} ${dayWord(day === 'today' ? 'yesterday' : 'today')}.`, `${scope}: ${num(now.total, locale)} من ${num(dayTotal, locale)} من ${plural} ${dayWord(day)}${day === 'today' ? ` حتى ${time}` : ''}، مقابل ${num(other.total, locale)} ${dayWord(day === 'today' ? 'yesterday' : 'today')}.`)
      : L(locale, `${num(now.total, locale)} ${lower} recorded ${dayWord(day)}${day === 'today' ? ` up to ${time}` : ''}, against ${num(other.total, locale)} ${dayWord(day === 'today' ? 'yesterday' : 'today')}.`, `سُجّل ${num(now.total, locale)} من ${plural} ${dayWord(day)}${day === 'today' ? ` حتى ${time}` : ''}، مقابل ${num(other.total, locale)} ${dayWord(day === 'today' ? 'yesterday' : 'today')}.`)
  const byCat = has(p.q, ['cause', 'causes', 'category', 'categories', 'type', 'reason', 'سبب', 'اسباب', 'فئه', 'نوع']) && !!rep.categories?.length && !cat
  const rows = byCat || region ? now.byCategory.map((x) => ({ label: pick(rep.categories?.find((c) => c.id === x.id)?.label, locale) || x.id, count: x.count })) : now.byRegion.map((x) => ({ label: pack.regionName(x.id, locale), count: x.count }))
  const points = rows.slice(0, 4).map((x) => L(locale, `${x.label}: ${num(x.count, locale)} of ${num(now.total, locale)}`, `${x.label}: ${num(x.count, locale)} من ${num(now.total, locale)}`))
  if (has(p.q, ['why', 'diagnos', 'root cause', 'لماذا', 'تشخيص'])) points.push(L(locale, "Today's report shows counts only; switch to the digital experts for causes.", 'يعرض تقرير اليوم الأعداد فقط؛ انتقل إلى الخبراء الرقميين لمعرفة الأسباب.'))
  const groupedBy = byCat || region ? L(locale, 'category', 'الفئة') : w.region
  return {
    intent: 'report',
    locale,
    lead,
    points,
    sources: [pick(SOURCE.report, locale)],
    visual: rows.length > 1 ? { kind: 'bar', title: L(locale, `${plural} ${dayWord(day)} by ${groupedBy}`, `${plural} ${dayWord(day)} حسب ${groupedBy}`), unit: lower, points: rows.slice(0, 10).map((x) => ({ label: x.label, value: x.count })) } : undefined,
  }
}