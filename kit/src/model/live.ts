import { matchSites, SEVERITY_RANK, worst, type Pack, type ResolvedKpi } from '../pack'
import type { Alert, DemoSpec, Incident, Kpi, SeriesPoint, Severity, Site, SiteMetric, Text } from '../types'
import { HOUR, toMs } from './time'

/** A site as it stands at the clock. */
export interface LiveSite {
  site: Site
  status: Severity
  note?: Text
  /** When it last changed status, if during the day. */
  since?: number
}

export type IncidentPhase = 'upcoming' | 'active' | 'restored'

export interface LiveIncident {
  incident: Incident
  phase: IncidentPhase
  startedMs: number
  resolvedMs?: number
}

export function siteAt(site: Site, clockMs: number): LiveSite {
  let live: LiveSite = { site, status: site.status, note: site.note }
  for (const c of site.timeline ?? []) {
    const at = toMs(c.at)
    if (at > clockMs) break
    live = { site, status: c.status, note: c.note ?? live.note, since: at }
  }
  return live
}

export function sitesAt(spec: DemoSpec, clockMs: number): LiveSite[] {
  return spec.sites.map((s) => siteAt(s, clockMs))
}

export function incidentAt(incident: Incident, clockMs: number): LiveIncident {
  const startedMs = toMs(incident.started)
  const resolvedMs = incident.resolved ? toMs(incident.resolved) : undefined
  const phase: IncidentPhase = clockMs < startedMs ? 'upcoming' : resolvedMs !== undefined && clockMs >= resolvedMs ? 'restored' : 'active'
  return { incident, phase, startedMs, resolvedMs }
}

/** Incidents visible at the clock (active and restored), most severe and most recent first. */
export function incidentsAt(spec: DemoSpec, clockMs: number): LiveIncident[] {
  return spec.incidents
    .map((i) => incidentAt(i, clockMs))
    .filter((i) => i.phase !== 'upcoming')
    .sort((a, b) => (a.phase === b.phase ? 0 : a.phase === 'active' ? -1 : 1) || SEVERITY_RANK[b.incident.severity] - SEVERITY_RANK[a.incident.severity] || b.startedMs - a.startedMs)
}

export const activeIncidents = (spec: DemoSpec, clockMs: number) => incidentsAt(spec, clockMs).filter((i) => i.phase === 'active')

export function alertsAt(spec: DemoSpec, clockMs: number): Alert[] {
  return (spec.alerts ?? []).filter((a) => toMs(a.from) <= clockMs && (!a.to || clockMs < toMs(a.to)))
}

/** Latest series value at or before the clock; the first value before the series starts. */
export function seriesAt(series: SeriesPoint[] | undefined, clockMs: number): number | undefined {
  if (!series?.length) return undefined
  let v = series[0].value
  for (const p of series) {
    if (toMs(p.at) > clockMs) break
    v = p.value
  }
  return v
}

export function seriesUntil(series: SeriesPoint[] | undefined, clockMs: number): SeriesPoint[] {
  return (series ?? []).filter((p) => toMs(p.at) <= clockMs)
}

export function metricAt(m: SiteMetric, clockMs: number): number {
  return seriesAt(m.series, clockMs) ?? m.value
}

export interface LiveKpi extends ResolvedKpi {
  /** Values up to the clock for the sparkline. */
  spark: number[]
  /** Change against one hour earlier, when the KPI has a series or is derived from sites. */
  change?: number
}

function countAt(spec: DemoSpec, kpi: Kpi, clockMs: number): { value: number; of?: number; tone: ResolvedKpi['tone'] } | undefined {
  if (kpi.kind !== 'count' || !kpi.derive) return undefined
  const live = sitesAt(spec, clockMs).map((l) => ({ ...l.site, status: l.status }))
  const matched = matchSites(live, kpi.derive.count)
  const of = matchSites(live, kpi.derive.of ?? { type: kpi.derive.count.type }).length
  const w = worst(matched.map((s) => s.status))
  return { value: matched.length, of, tone: !matched.length ? 'positive' : w === 'critical' ? 'critical' : w === 'watch' ? 'watch' : 'neutral' }
}

export function kpiAt(spec: DemoSpec, base: ResolvedKpi, clockMs: number): LiveKpi {
  const { kpi } = base
  const derived = countAt(spec, kpi, clockMs)
  if (derived) {
    const before = countAt(spec, kpi, clockMs - HOUR)
    const spark = Array.from({ length: 13 }, (_, i) => countAt(spec, kpi, clockMs - (12 - i) * HOUR / 2)?.value ?? 0)
    return { ...base, ...derived, spark, change: before ? derived.value - before.value : undefined }
  }
  const v = seriesAt(kpi.series, clockMs)
  if (v === undefined) return { ...base, spark: kpi.trend ?? [] }
  const before = seriesAt(kpi.series, clockMs - HOUR)
  const spark = seriesUntil(kpi.series, clockMs).map((p) => p.value).slice(-25)
  return { ...base, value: v, spark, change: before === undefined ? undefined : v - before }
}

export function kpisAt(pack: Pack, clockMs: number): LiveKpi[] {
  return pack.kpis.map((k) => kpiAt(pack.spec, k, clockMs))
}

/** Status of each region from the sites in it. */
export function regionStatusAt(spec: DemoSpec, clockMs: number): Record<string, Severity> {
  const out: Record<string, Severity> = {}
  const live = sitesAt(spec, clockMs)
  for (const r of spec.regions) out[r.id] = worst(live.filter((l) => l.site.regionId === r.id).map((l) => l.status))
  return out
}

/** Sites that need attention at the clock, worst first. */
export function prioritySites(spec: DemoSpec, clockMs: number): LiveSite[] {
  return sitesAt(spec, clockMs)
    .filter((l) => l.status !== 'normal')
    .sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status] || (b.since ?? 0) - (a.since ?? 0))
}
