import { pick, type Pack } from '../pack'
import { calendarOf, generateSeries, HISTORY_DAYS, monthly, windowTotal, type HistoryDay } from '../model/history'
import { formatMonthYear, formatShortDate, HOUR } from '../model/time'
import type { Visual } from '../store'
import type { HistorySeries, Locale } from '../types'
import type { HistWindow, Parsed } from './nlu'
import { L, num, SOURCE, type EngineContext, type Generated } from './words'

/** The series a history question is about: named in it, owned by the expert, or the first one. */
export function seriesFor(pack: Pack, p: Pick<Parsed, 'series'>, expertId?: string): HistorySeries | undefined {
  const all = pack.spec.history ?? []
  return p.series ?? all.find((s) => s.expertId === expertId) ?? all[0]
}

const LAST_30: HistWindow = { from: 29, to: 0, label: { en: 'the last 30 days', ar: 'آخر 30 يوماً' } }
const LAST_12M: HistWindow = { from: HISTORY_DAYS - 1, to: 0, label: { en: 'the last 12 months', ar: 'آخر 12 شهراً' } }

const perDay = (s: HistorySeries) => /a day|per day|daily|\/day|يومي/i.test(`${s.unit.en} ${s.unit.ar ?? ''}`)
const dayLabel = (d: HistoryDay, locale: Locale) => formatShortDate(d.startMs + 12 * HOUR, locale)

function dailyVisual(s: HistorySeries, slice: HistoryDay[], title: string, unit: string, locale: Locale): Visual {
  const ordered = [...slice].sort((a, b) => a.startMs - b.startMs)
  const peak = ordered.reduce((bi, d, i, a) => (d.value > a[bi].value ? i : bi), 0)
  if (ordered.length <= 92) return { kind: 'line', title, unit, points: ordered.map((d) => ({ label: dayLabel(d, locale), value: d.value })), highlight: peak }
  const months = monthly(ordered)
  const dp = s.decimals ?? 0
  const value = (total: number, days: number) => Number((perDay(s) ? total : total / days).toFixed(dp))
  return { kind: 'bar', title, unit, points: months.map((m) => ({ label: formatMonthYear(m.startMs + 12 * HOUR, locale), value: value(m.total, m.days) })) }
}

export function historyAnswer(pack: Pack, p: Parsed, ctx: EngineContext, expertId?: string): Generated | undefined {
  const s = seriesFor(pack, p, expertId)
  if (!s) return undefined
  const { locale } = p
  const days = generateSeries(pack, s, ctx.clockMs)
  const dp = s.decimals ?? 0
  const unit = pick(s.unit, locale)
  const label = pick(s.label, locale)
  const v = (n: number) => num(n, locale, dp)
  const sources = [pick(SOURCE.history, locale)]
  const win = p.hist.windows[0] ?? (p.hist.by || p.hist.compare === 'year' ? LAST_12M : p.hist.peak ? LAST_12M : LAST_30)
  const wl = pick(win.label, locale)
  const slice = days.filter((d) => d.day >= win.to && d.day <= win.from)
  const w = windowTotal(days, win.to, win.from)
  const today = days[0]

  if (p.hist.compare === 'year') {
    const months = monthly(days)
    const cur = win.month !== undefined ? months.filter((m) => m.month === win.month).at(-1) : months.at(-1)
    const prev = cur && months.find((m) => m.month === cur.month && m.year === cur.year - 1)
    if (cur && prev) {
      const mName = formatMonthYear(cur.startMs + 12 * HOUR, locale)
      const pName = formatMonthYear(prev.startMs + 12 * HOUR, locale)
      const change = prev.average ? ((cur.average - prev.average) / prev.average) * 100 : 0
      return {
        intent: 'history',
        locale,
        lead: L(
          locale,
          `${label} averaged ${v(cur.average)} ${unit} in ${mName}, against ${v(prev.average)} in ${pName} (${change >= 0 ? '+' : ''}${num(change, locale, 1)}%).`,
          `بلغ متوسط ${label} ${v(cur.average)} ${unit} في ${mName}، مقابل ${v(prev.average)} في ${pName} (${change >= 0 ? '+' : ''}${num(change, locale, 1)}%).`,
        ),
        points: [L(locale, `${mName}: ${num(cur.days, locale)} days of data; ${pName}: ${num(prev.days, locale)} days.`, `${mName}: ${num(cur.days, locale)} يوماً من البيانات؛ ${pName}: ${num(prev.days, locale)} يوماً.`), L(locale, 'The reference history holds 12 months.', 'يغطي السجل المرجعي 12 شهراً.')],
        sources,
        visual: { kind: 'table', title: label, columns: [L(locale, 'Month', 'الشهر'), L(locale, 'Daily average', 'المتوسط اليومي'), L(locale, 'Days', 'الأيام')], rows: [[pName, Number(prev.average.toFixed(dp)), prev.days], [mName, Number(cur.average.toFixed(dp)), cur.days]] },
      }
    }
  }

  if (p.hist.compare === 'previous' && win.from + 1 + (win.from - win.to) < HISTORY_DAYS) {
    const len = win.from - win.to + 1
    const before = windowTotal(days, win.from + 1, win.from + len)
    const change = before.average ? ((w.average - before.average) / before.average) * 100 : 0
    return {
      intent: 'history',
      locale,
      lead: L(
        locale,
        `${label} averaged ${v(w.average)} ${unit} over ${wl}, against ${v(before.average)} in the ${num(len, locale)} days before (${change >= 0 ? '+' : ''}${num(change, locale, 1)}%).`,
        `بلغ متوسط ${label} ${v(w.average)} ${unit} خلال ${wl}، مقابل ${v(before.average)} في الـ ${num(len, locale)} يوماً السابقة (${change >= 0 ? '+' : ''}${num(change, locale, 1)}%).`,
      ),
      points: [],
      sources,
      visual: { kind: 'table', title: label, columns: [L(locale, 'Period', 'الفترة'), L(locale, 'Daily average', 'المتوسط اليومي')], rows: [[L(locale, 'Before', 'قبلها'), Number(before.average.toFixed(dp))], [wl, Number(w.average.toFixed(dp))]] },
    }
  }

  if (p.hist.by && s.breakdown) {
    const parts = s.breakdown.parts
    const totals = parts.map((pt) => ({ pt, total: slice.reduce((a, d) => a + (d.parts?.[pt.id] ?? 0), 0) })).sort((a, b) => b.total - a.total)
    const sum = totals.reduce((a, x) => a + x.total, 0) || 1
    const share = (t: number) => num((t / sum) * 100, locale, 0)
    const top = totals[0]
    const series = parts.map((pt) => ({ id: pt.id, label: pick(pt.label, locale) }))
    const visual: Visual =
      slice.length > 60
        ? {
            kind: 'stacked',
            title: `${label} — ${pick(s.breakdown.label, locale)}`,
            unit,
            series,
            rows: monthly(slice).map((m) => ({ label: formatMonthYear(m.startMs + 12 * HOUR, locale), ...Object.fromEntries(parts.map((pt) => [pt.id, Number((m.parts?.[pt.id] ?? 0).toFixed(dp))])) })),
          }
        : { kind: 'bar', title: `${label} — ${pick(s.breakdown.label, locale)}`, unit, points: totals.map((x) => ({ label: pick(x.pt.label, locale), value: Number(x.total.toFixed(dp)) })) }
    return {
      intent: 'history',
      locale,
      lead: L(locale, `Over ${wl}, ${pick(top.pt.label, locale)} accounts for the largest share of ${label.toLowerCase()}: ${share(top.total)}%.`, `خلال ${wl}، يمثل ${pick(top.pt.label, locale)} الحصة الأكبر من ${label}: ${share(top.total)}%.`),
      points: totals.slice(0, 4).map((x) => `${pick(x.pt.label, locale)}: ${share(x.total)}%`),
      sources,
      visual,
    }
  }

  if (!w.peak) return undefined
  const peakDate = dayLabel(w.peak, locale)
  const points: string[] = []
  if (perDay(s)) points.push(L(locale, `Total over ${wl}: ${v(w.total)}.`, `الإجمالي خلال ${wl}: ${v(w.total)}.`))
  if (p.hist.peak) points.push(L(locale, `Daily average over ${wl}: ${v(w.average)} ${unit}.`, `المتوسط اليومي خلال ${wl}: ${v(w.average)} ${unit}.`))
  else points.push(L(locale, `Peak: ${v(w.peak.value)} on ${peakDate}.`, `الذروة: ${v(w.peak.value)} في ${peakDate}.`))
  if (win.to === 0) points.push(L(locale, `Today so far: ${v(today.value)} ${unit}.`, `اليوم حتى الآن: ${v(today.value)} ${unit}.`))
  const lead = p.hist.peak
    ? L(locale, `The peak day for ${label.toLowerCase()} in ${wl} was ${peakDate}, at ${v(w.peak.value)} ${unit}.`, `كان يوم الذروة لـ ${label} خلال ${wl} هو ${peakDate}، عند ${v(w.peak.value)} ${unit}.`)
    : L(locale, `${label} averaged ${v(w.average)} ${unit} over ${wl}.`, `بلغ متوسط ${label} ${v(w.average)} ${unit} خلال ${wl}.`)
  return { intent: 'history', locale, lead, points, sources, visual: dailyVisual(s, slice, `${label} — ${wl}`, unit, locale) }
}

/** Day index → calendar month, for reading month names against the history. */
export const monthOfDay = (clockMs: number) => (d: number) => calendarOf(clockMs, d).month
