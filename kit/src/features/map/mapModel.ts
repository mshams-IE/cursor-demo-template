import { useMemo } from 'react'
import { featureBBox, unionBBox, type BBox } from '../../geo'
import { usePack } from '../../i18n'
import { activeIncidents, metricAt, sitesAt, type LiveIncident, type LiveSite } from '../../model/live'
import { worst, type Pack } from '../../pack'
import { useDemo } from '../../store'
import type { Region, Severity, Site, SiteMetric, Text } from '../../types'
import type { MapLayer } from './useMapView'

export type PlacedSite = Site & { coordinates: [number, number] }

export interface MapSite {
  site: PlacedSite
  live: LiveSite
  incidents: LiveIncident[]
  affected: number
  /** Reading for the selected metric layer. */
  metric?: { m: SiteMetric; value: number; tone: Severity }
}

export interface MapRegion {
  region: Region
  status: Severity
  total: number
  attention: number
  activeIncidents: number
  affected: number
  flagged: number
  metricTone: Severity
  anchor: [number, number]
}

export interface MetricLayer {
  id: string
  label: Text
  hasLimit: boolean
}

export interface MapData {
  sites: MapSite[]
  regions: MapRegion[]
  /** The site whose incident has the largest impact, for the callout. */
  hero?: MapSite
  maxAffected: number
}

/** Metrics most placed sites report; each gets a layer chip. */
export function metricLayers(pack: Pack): MetricLayer[] {
  const placed = pack.spec.sites.filter((s) => s.coordinates)
  const seen = new Map<string, { m: SiteMetric; n: number; limit: boolean }>()
  for (const s of placed)
    for (const m of s.metrics ?? []) {
      const e = seen.get(m.id)
      seen.set(m.id, {
        m: e?.m ?? m,
        n: (e?.n ?? 0) + 1,
        limit: (e?.limit ?? false) || m.limit !== undefined,
      })
    }
  return [...seen.entries()].filter(([, e]) => placed.length > 0 && e.n >= Math.max(2, placed.length / 2)).map(([id, e]) => ({ id, label: e.m.label, hasLimit: e.limit }))
}

/** Reading against its limit, or against the spread of readings when there is no limit. */
export function metricTone(m: SiteMetric, value: number, range?: [number, number]): Severity {
  const up = m.worseWhenUp !== false
  if (m.limit !== undefined) {
    const over = up ? value >= m.limit : value <= m.limit
    if (over) return 'critical'
    const near = up ? value >= m.limit * 0.9 : value <= m.limit * 1.1
    return near ? 'watch' : 'normal'
  }
  if (!range || range[1] <= range[0]) return 'normal'
  const bad = (up ? value - range[0] : range[1] - value) / (range[1] - range[0])
  return bad >= 0.66 ? 'critical' : bad >= 0.33 ? 'watch' : 'normal'
}

function featureBoxes(pack: Pack): Map<string, BBox> {
  return new Map((pack.boundaries?.features ?? []).map((f) => [f.properties.id, featureBBox(f)]))
}

function padBox([a, b, c, d]: BBox, k: number, minSpan = 0): BBox {
  const w = Math.max(c - a, minSpan)
  const h = Math.max(d - b, minSpan * 0.62)
  const cx = (a + c) / 2
  const cy = (b + d) / 2
  return [cx - (w / 2) * (1 + k), cy - (h / 2) * (1 + k), cx + (w / 2) * (1 + k), cy + (h / 2) * (1 + k)]
}

/** Every region in the pack. */
export function allBounds(pack: Pack): BBox | undefined {
  const boxes = featureBoxes(pack)
  const list = pack.spec.regions.map((r) => (r.geoId ? boxes.get(r.geoId) : undefined)).filter((b): b is BBox => !!b)
  if (!list.length) {
    const pts = pack.spec.sites.flatMap((s) => (s.coordinates ? [[...s.coordinates, ...s.coordinates] as BBox] : []))
    return pts.length ? padBox(unionBBox(pts), 0.2, 2) : undefined
  }
  return unionBBox(list)
}

/** The sites of a region, or its boundary when it has none placed. */
export function regionBounds(pack: Pack, regionId: string): BBox | undefined {
  const pts = pack.spec.sites.filter((s) => s.regionId === regionId && s.coordinates).map((s) => [...s.coordinates!, ...s.coordinates!] as BBox)
  if (pts.length) return padBox(unionBBox(pts), 0.25, 0.5)
  const geoId = pack.spec.regions.find((r) => r.id === regionId)?.geoId
  return geoId ? featureBoxes(pack).get(geoId) : undefined
}

export function regionAnchor(pack: Pack, regionId: string): [number, number] | undefined {
  const pts = pack.spec.sites.filter((s) => s.regionId === regionId && s.coordinates).map((s) => s.coordinates!)
  if (pts.length) return [pts.reduce((a, p) => a + p[0], 0) / pts.length, pts.reduce((a, p) => a + p[1], 0) / pts.length]
  const geoId = pack.spec.regions.find((r) => r.id === regionId)?.geoId
  const bb = geoId ? featureBoxes(pack).get(geoId) : undefined
  return bb ? [(bb[0] + bb[2]) / 2, (bb[1] + bb[3]) / 2] : undefined
}

export function buildMapData(pack: Pack, clockMs: number, layer: MapLayer): MapData {
  const { spec } = pack
  const live = new Map(sitesAt(spec, clockMs).map((l) => [l.site.id, l]))
  const active = activeIncidents(spec, clockMs)
  const metricId = layer.startsWith('metric:') ? layer.slice(7) : undefined
  const readings = metricId ? spec.sites.flatMap((s) => s.metrics?.filter((m) => m.id === metricId).map((m) => metricAt(m, clockMs)) ?? []) : []
  const range: [number, number] | undefined = readings.length ? [Math.min(...readings), Math.max(...readings)] : undefined

  const sites: MapSite[] = spec.sites
    .filter((s): s is PlacedSite => !!s.coordinates)
    .map((site) => {
      const incidents = active.filter((i) => i.incident.siteId === site.id)
      const m = metricId ? site.metrics?.find((x) => x.id === metricId) : undefined
      const value = m ? metricAt(m, clockMs) : 0
      return {
        site,
        live: live.get(site.id)!,
        incidents,
        affected: incidents.reduce((a, i) => a + (i.incident.affected?.value ?? 0), 0),
        metric: m ? { m, value, tone: metricTone(m, value, range) } : undefined,
      }
    })

  const regions: MapRegion[] = spec.regions.flatMap((region) => {
    const anchor = regionAnchor(pack, region.id)
    if (!anchor) return []
    const all = spec.sites.filter((s) => s.regionId === region.id).map((s) => live.get(s.id)!)
    const mine = sites.filter((s) => s.site.regionId === region.id)
    const incs = active.filter((i) => pack.site(i.incident.siteId)?.regionId === region.id)
    const tones = mine.flatMap((s) => (s.metric ? [s.metric.tone] : []))
    return [
      {
        region,
        anchor,
        status: worst(all.map((l) => l.status)),
        total: all.length,
        attention: all.filter((l) => l.status !== 'normal').length,
        activeIncidents: incs.length,
        affected: incs.reduce((a, i) => a + (i.incident.affected?.value ?? 0), 0),
        flagged: tones.filter((t) => t !== 'normal').length,
        metricTone: worst(tones),
      },
    ]
  })

  const withImpact = sites.filter((s) => s.incidents.length)
  const hero = withImpact.find((s) => s.incidents.some((i) => i.incident.role === 'hero')) ?? [...withImpact].sort((a, b) => b.affected - a.affected)[0]
  return {
    sites,
    regions,
    hero,
    maxAffected: Math.max(0, ...sites.map((s) => s.affected)),
  }
}

export function useLayerData(layer: MapLayer): MapData {
  const pack = usePack()
  const clockMs = useDemo((s) => s.clockMs)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  return useMemo(() => buildMapData(pack, minute, layer), [pack, minute, layer])
}

export function shortNumber(n: number, locale: 'en' | 'ar'): string {
  if (n < 1000) return String(Math.round(n))
  const k = n / 1000
  const s = k >= 100 ? Math.round(k).toString() : (Math.round(k * 10) / 10).toString()
  return locale === 'ar' ? `${s} ألف` : `${s}k`
}

/** Theme colour from a CSS variable, for map paint properties that cannot read CSS. */
export function cssColor(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

/** Mixes a hex colour with white: 0 keeps it, 1 is white. */
export function tint(hex: string, k: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * k))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
