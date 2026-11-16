import { incidentsAt, type LiveIncident } from '../../model/live'
import { HOUR, toMs, windowStart, type TimeWindow } from '../../model/time'
import type { DemoSpec, LocalTime } from '../../types'

/** Incidents at the clock that are active or were restored inside the time window. */
export function incidentsInWindow(spec: DemoSpec, clockMs: number, window: TimeWindow): LiveIncident[] {
  const from = windowStart(clockMs, window)
  return incidentsAt(spec, clockMs).filter((i) => i.phase === 'active' || (i.resolvedMs ?? i.startedMs) >= from)
}

export function inWindow<T extends { at: LocalTime }>(items: T[] | undefined, clockMs: number, window: TimeWindow): T[] {
  const from = windowStart(clockMs, window)
  return (items ?? []).filter((x) => {
    const at = toMs(x.at)
    return at <= clockMs && at >= from
  })
}

export type RestorePhase = 'before' | 'open' | 'past'

/** Where the clock sits against the estimated restoration window, counted from the incident start. */
export function restoration(i: LiveIncident, clockMs: number) {
  const hours = i.incident.restoreHours
  if (!hours) return undefined
  const open = i.startedMs + hours[0] * HOUR
  const close = i.startedMs + hours[1] * HOUR
  const phase: RestorePhase = clockMs < open ? 'before' : clockMs < close ? 'open' : 'past'
  const pct = Math.min(100, Math.max(0, ((clockMs - i.startedMs) / (close - i.startedMs)) * 100))
  return { open, close, phase, pct, hours }
}
