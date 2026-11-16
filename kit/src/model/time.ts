import type { Clock, Locale, LocalTime } from '../types'

export const MINUTE = 60_000
export const HOUR = 3_600_000
export const DAY = 86_400_000

export type TimeWindow = 'today' | '6h' | '24h'

/** Minutes east of UTC for the pack's zone. Set once by definePack. */
let offsetMin = 180
let anchorDay = '1970-01-01'
/** Shift applied to every displayed time; in real-time mode the demo's moment is shown as the viewer's now. */
let displayOffsetMs = 0

export function configureClock(clock: Clock) {
  offsetMin = clock.utcOffsetMinutes ?? 180
  anchorDay = clock.observedAt.slice(0, 10)
}

export const utcOffsetMs = () => offsetMin * MINUTE
export const setDisplayOffset = (ms: number) => {
  displayOffsetMs = ms
}
export const displayOffset = () => displayOffsetMs

/** Epoch ms of a pack local time ("YYYY-MM-DDTHH:MM" or "HH:MM" on the observed day). */
export function toMs(t: LocalTime): number {
  const full = /^\d{2}:\d{2}$/.test(t) ? `${anchorDay}T${t}` : t
  return Date.parse(`${full.length === 16 ? `${full}:00` : full}Z`) - offsetMin * MINUTE
}

export function startOfLocalDay(ms: number): number {
  const local = ms + offsetMin * MINUTE
  return Math.floor(local / DAY) * DAY - offsetMin * MINUTE
}

/** Start of the displayed day, in demo time. */
export const displayDayStart = (ms: number) => startOfLocalDay(ms + displayOffsetMs) - displayOffsetMs

export function windowStart(clockMs: number, w: TimeWindow): number {
  if (w === 'today') return startOfLocalDay(clockMs)
  return clockMs - (w === '6h' ? 6 : 24) * HOUR
}

export function localHour(ms: number): number {
  return ((ms + offsetMin * MINUTE) % DAY) / HOUR
}

const cache = new Map<string, Intl.DateTimeFormat>()
function fmt(locale: Locale, opts: Intl.DateTimeFormatOptions) {
  const key = locale + JSON.stringify(opts)
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA-u-nu-latn-ca-gregory' : 'en-GB', { timeZone: 'UTC', ...opts })
    cache.set(key, f)
  }
  return f
}
const shown = (ms: number) => ms + displayOffsetMs + offsetMin * MINUTE

export function formatTime(ms: number, locale: Locale, zone?: string): string {
  const s = fmt(locale, { hour: '2-digit', minute: '2-digit', hour12: false }).format(shown(ms))
  return zone ? `${s} ${zone}` : s
}

export function formatDate(ms: number, locale: Locale): string {
  return fmt(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(shown(ms))
}

export function formatShortDate(ms: number, locale: Locale): string {
  return fmt(locale, { day: 'numeric', month: 'short' }).format(shown(ms))
}

export function formatMonthYear(ms: number, locale: Locale): string {
  return fmt(locale, { month: 'short', year: 'numeric' }).format(shown(ms))
}

export function formatMonthName(ms: number, locale: Locale): string {
  return fmt(locale, { month: 'long' }).format(shown(ms))
}

export function formatDuration(ms: number, locale: Locale): string {
  const total = Math.max(0, Math.round(ms / MINUTE))
  const h = Math.floor(total / 60)
  const m = total % 60
  if (locale === 'ar') return h > 0 ? `${h} س ${m} د` : `${m} د`
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export function formatHoursRange([a, b]: [number, number], locale: Locale): string {
  return locale === 'ar' ? `${a}–${b} ساعة` : `${a}–${b} h`
}

/** Displayed calendar fields (month 0–11). */
export function displayCalendar(ms: number) {
  const d = new Date(shown(ms))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), date: d.getUTCDate(), weekday: d.getUTCDay() }
}
