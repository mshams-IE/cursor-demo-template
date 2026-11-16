import type { DemoSpec, HistorySeries } from '../types'
import { kpiAt } from './live'
import type { Pack } from '../pack'
import { DAY, HOUR, displayCalendar, displayDayStart } from './time'

/**
 * Twelve months of daily reference history behind the demo day, generated from a fixed seed
 * per series and calendar date, so every load shows the same numbers. Day 0 is the day of the
 * clock and reads from its KPI when `todayFromKpi` is set, so history and the tiles agree.
 */
export const HISTORY_DAYS = 365

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface HistoryDay {
  day: number
  startMs: number
  value: number
  parts?: Record<string, number>
}

export const dayStartMs = (clockMs: number, d: number) => displayDayStart(clockMs) - d * DAY
export const calendarOf = (clockMs: number, d: number) => displayCalendar(dayStartMs(clockMs, d) + 12 * HOUR)

const round = (v: number, d: number) => Math.round(v * 10 ** d) / 10 ** d

export function generateSeries(pack: Pack, s: HistorySeries, clockMs: number, days = HISTORY_DAYS): HistoryDay[] {
  const spec: DemoSpec = pack.spec
  const decimals = s.decimals ?? 0
  const today = s.todayFromKpi ? pack.kpis.find((k) => k.kpi.id === s.todayFromKpi) : undefined
  const out: HistoryDay[] = []
  for (let d = 0; d < days; d++) {
    const startMs = dayStartMs(clockMs, d)
    const cal = displayCalendar(startMs + 12 * HOUR)
    const r = rng(hash(`${spec.id}:${s.id}:${cal.year}-${cal.month}-${cal.date}`))
    const phase = ((cal.month + 1 - (s.peakMonth ?? 8)) / 12) * 2 * Math.PI
    const seasonal = 1 + (s.seasonal ?? 0) * Math.cos(phase)
    const noise = 1 + (s.noise ?? 0.1) * (r() * 2 - 1)
    let value = Math.max(0, s.base * seasonal * noise)
    if (d === 0 && today) value = kpiAt(spec, today, clockMs).value
    value = round(value, decimals)
    const parts = s.breakdown ? splitParts(value, s.breakdown.parts, r, decimals) : undefined
    out.push({ day: d, startMs, value, parts })
  }
  return out
}

function splitParts(total: number, parts: { id: string; weight: number }[], r: () => number, decimals: number) {
  const w = parts.map((p) => p.weight * (0.75 + r() * 0.5))
  const sum = w.reduce((a, b) => a + b, 0) || 1
  const out: Record<string, number> = {}
  let left = total
  parts.forEach((p, i) => {
    const v = i === parts.length - 1 ? round(left, decimals) : round((total * w[i]) / sum, decimals)
    out[p.id] = v
    left -= v
  })
  return out
}

export interface MonthBucket {
  key: string
  year: number
  month: number
  startMs: number
  total: number
  average: number
  days: number
  parts?: Record<string, number>
}

/** Calendar months, oldest first; the current month is month-to-date. */
export function monthly(days: HistoryDay[]): MonthBucket[] {
  const map = new Map<string, MonthBucket>()
  for (const d of days) {
    const cal = displayCalendar(d.startMs + 12 * HOUR)
    const key = `${cal.year}-${String(cal.month + 1).padStart(2, '0')}`
    let b = map.get(key)
    if (!b) {
      b = { key, year: cal.year, month: cal.month, startMs: d.startMs, total: 0, average: 0, days: 0, parts: d.parts ? {} : undefined }
      map.set(key, b)
    }
    b.total += d.value
    b.days += 1
    b.startMs = Math.min(b.startMs, d.startMs)
    if (d.parts && b.parts) for (const [k, v] of Object.entries(d.parts)) b.parts[k] = (b.parts[k] ?? 0) + v
  }
  return [...map.values()].map((b) => ({ ...b, average: b.total / b.days })).sort((a, b) => a.startMs - b.startMs)
}

export function windowTotal(days: HistoryDay[], from: number, to: number) {
  const slice = days.filter((d) => d.day >= from && d.day <= to)
  const total = slice.reduce((a, d) => a + d.value, 0)
  return { total, average: slice.length ? total / slice.length : 0, days: slice.length, peak: slice.reduce<HistoryDay | undefined>((p, d) => (!p || d.value > p.value ? d : p), undefined) }
}
