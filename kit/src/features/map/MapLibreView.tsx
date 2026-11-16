import * as maplibregl from 'maplibre-gl'
import type { ExpressionSpecification, GeoJSONSource, LngLatBoundsLike } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { FeatureCollection, Point, Polygon } from 'geojson'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { prefersReducedMotion, STATUS_VAR } from '../../components/ui'
import type { BBox } from '../../geo'
import { useT } from '../../i18n'
import { fmtNumber, SEVERITY_RANK, worst } from '../../pack'
import { useDemo } from '../../store'
import type { Severity } from '../../types'
import { allBounds, cssColor, metricLayers, regionAnchor, regionBounds, shortNumber, tint, useLayerData, type MapData, type MapRegion, type MapSite } from './mapModel'
import { BackButton, Breadcrumb, LayerSwitch, Legend, Map3dToggle, NO_READING, ZoomControls } from './MapOverlays'
import { MAP } from './strings'
import { useMapView, type MapLayer } from './useMapView'
import './map.css'

function resolveWorkerUrl(url: string) {
  if (!url.startsWith('data:')) return url
  const [, meta, body] = url.match(/^data:([^,]*),(.*)$/s) ?? []
  const isB64 = meta?.includes('base64')
  const text = isB64 ? atob(body) : decodeURIComponent(body)
  const bytes = isB64 ? Uint8Array.from(text, (c) => c.charCodeAt(0)) : new TextEncoder().encode(text)
  return URL.createObjectURL(new Blob([bytes], { type: 'text/javascript' }))
}
maplibregl.setWorkerUrl(resolveWorkerUrl(workerUrl))

const PAD = { top: 70, bottom: 40, left: 40, right: 40 }
const SEA = '#e4edf3'
const OUTLINE = '#9fb0bf'
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

interface Palette {
  status: Record<Severity, string>
  soft: Record<Severity, string>
  secondary: string
  surface: string
  line: string
}

function palette(): Palette {
  return {
    status: {
      normal: cssColor('--status-normal', '#0e9f6e'),
      watch: cssColor('--status-watch', '#e3a008'),
      critical: cssColor('--status-critical', '#d92d20'),
    },
    soft: {
      normal: '#ffffff',
      watch: cssColor('--status-watch-soft', '#fdf3d7'),
      critical: cssColor('--status-critical-soft', '#fde8e6'),
    },
    secondary: cssColor('--brand-secondary', '#413cc3'),
    surface: cssColor('--surface', '#f5f8fa'),
    line: cssColor('--line', '#cedbe4'),
  }
}

const LEVEL: ExpressionSpecification = ['coalesce', ['feature-state', 'level'], -1]

function fillExpr(layer: MapLayer, c: Palette): ExpressionSpecification {
  if (layer === 'incidents') return ['match', LEVEL, 3, tint(c.secondary, 0.45), 2, tint(c.secondary, 0.68), 1, tint(c.secondary, 0.86), 0, '#ffffff', c.surface]
  return ['match', LEVEL, 2, c.soft.critical, 1, c.soft.watch, 0, '#ffffff', c.surface]
}

function extrudeExpr(layer: MapLayer, c: Palette): ExpressionSpecification {
  if (layer === 'incidents') return ['match', LEVEL, 3, c.secondary, 2, tint(c.secondary, 0.35), 1, tint(c.secondary, 0.6), tint(c.line, 0.3)]
  return ['match', LEVEL, 2, c.status.critical, 1, c.status.watch, tint(c.line, 0.3)]
}

function siteTone(s: MapSite, layer: MapLayer): Severity | undefined {
  if (layer === 'incidents') return s.incidents.length ? worst(s.incidents.map((i) => i.incident.severity)) : undefined
  if (layer.startsWith('metric:')) return s.metric?.tone
  return s.live.status
}

function regionLevel(r: MapRegion, layer: MapLayer, maxAffected: number): number {
  if (layer === 'incidents') {
    if (!r.affected) return 0
    const k = r.affected / Math.max(1, maxAffected)
    return k >= 0.66 ? 3 : k >= 0.33 ? 2 : 1
  }
  return SEVERITY_RANK[layer.startsWith('metric:') ? r.metricTone : r.status]
}

function ring([lng, lat]: [number, number], km: number): [number, number][] {
  const dLat = km / 111
  const dLng = km / (111 * Math.cos((lat * Math.PI) / 180))
  return Array.from({ length: 25 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)] as [number, number]
  })
}

function columnGeo(data: MapData, layer: MapLayer, c: Palette, zoomedIn: boolean): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: data.sites.map((s) => {
      const tone = siteTone(s, layer)
      const height = layer === 'incidents' ? 3_000 + s.affected * 6 : 3_000 + (tone ? SEVERITY_RANK[tone] : 0) * 30_000
      return {
        type: 'Feature',
        properties: {
          id: s.site.id,
          height,
          color: tone ? c.status[tone] : NO_READING,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [ring(s.site.coordinates, zoomedIn ? 1.6 : 6)],
        },
      }
    }),
  }
}

function haloGeo(data: MapData): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: data.sites
      .filter((s) => s.incidents.length)
      .map((s) => ({
        type: 'Feature',
        properties: {
          id: s.site.id,
          w: Math.min(1, 0.45 + s.affected / 20_000),
        },
        geometry: { type: 'Point', coordinates: s.site.coordinates },
      })),
  }
}

interface Els {
  regions: { el: HTMLDivElement; id: string }[]
  sites: { el: HTMLDivElement; id: string }[]
  callout: { el: HTMLDivElement; marker: maplibregl.Marker }
}

const duration = (ms: number) => (prefersReducedMotion() ? 0 : ms)

export function MapLibreView({ height, compact = false, onFail }: { height: string; compact?: boolean; onFail: () => void }) {
  const { pack, p, sev, locale } = useT()
  const layer = useMapView((s) => s.layer)
  const map3d = useMapView((s) => s.map3d)
  const data = useLayerData(layer)
  const regionId = useDemo((s) => s.regionId)
  const siteId = useDemo((s) => s.siteId)
  const mapCommand = useDemo((s) => s.mapCommand)
  const metrics = useMemo(() => metricLayers(pack), [pack])
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const fitZoom = useRef(4)
  const colors = useRef<Palette | null>(null)
  const [els, setEls] = useState<Els | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [zoom, setZoom] = useState(4)
  const [hover, setHover] = useState<{
    id: string
    x: number
    y: number
  } | null>(null)
  const [hoverSite, setHoverSite] = useState<string>()
  const [focusSite, setFocusSite] = useState<string>()
  const tilted = useRef(false)

  useEffect(() => {
    const el = container.current
    const boundaries = pack.boundaries
    const all = allBounds(pack)
    if (!el || !boundaries || !all) return
    const c = palette()
    colors.current = c
    const geoToRegion = new Map(pack.spec.regions.filter((r) => r.geoId).map((r) => [r.geoId!, r.id]))
    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: el,
        style: {
          version: 8,
          sources: {
            regions: {
              type: 'geojson',
              data: boundaries,
              promoteId: 'id',
              attribution: boundaries.attribution,
            },
            halo: { type: 'geojson', data: EMPTY },
            columns: { type: 'geojson', data: EMPTY },
          },
          layers: [
            {
              id: 'bg',
              type: 'background',
              paint: { 'background-color': SEA },
            },
            {
              id: 'region-fill',
              type: 'fill',
              source: 'regions',
              paint: {
                'fill-color': fillExpr('status', c),
                'fill-opacity': ['case', ['boolean', ['feature-state', 'dim'], false], 0.55, 1],
              },
            },
            {
              id: 'region-line',
              type: 'line',
              source: 'regions',
              paint: { 'line-color': OUTLINE, 'line-width': 1 },
            },
            {
              id: 'halo',
              type: 'circle',
              source: 'halo',
              paint: {
                'circle-color': c.status.critical,
                'circle-radius': ['interpolate', ['exponential', 1.6], ['zoom'], 3, ['*', 10, ['get', 'w']], 5, ['*', 26, ['get', 'w']], 8, ['*', 48, ['get', 'w']], 11, ['*', 80, ['get', 'w']]],
                'circle-blur': 0.85,
                'circle-opacity': 0.4,
              },
            },
            {
              id: 'region-hover',
              type: 'line',
              source: 'regions',
              paint: {
                'line-color': c.secondary,
                'line-width': ['case', ['boolean', ['feature-state', 'selected'], false], 3, ['boolean', ['feature-state', 'hover'], false], 2, 0],
              },
            },
            {
              id: 'region-extrude',
              type: 'fill-extrusion',
              source: 'regions',
              layout: { visibility: 'none' },
              paint: {
                'fill-extrusion-color': extrudeExpr('status', c),
                'fill-extrusion-height': ['coalesce', ['feature-state', 'h'], 0],
                'fill-extrusion-opacity': 0.82,
              },
            },
            {
              id: 'columns',
              type: 'fill-extrusion',
              source: 'columns',
              layout: { visibility: 'none' },
              paint: {
                'fill-extrusion-color': ['get', 'color'],
                'fill-extrusion-height': ['get', 'height'],
                'fill-extrusion-opacity': 0.9,
              },
            },
          ],
        },
        bounds: all as LngLatBoundsLike,
        fitBoundsOptions: { padding: PAD },
        minZoom: 1.5,
        maxZoom: 14,
        renderWorldCopies: false,
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      onFail()
      return
    }
    mapRef.current = map
    map.touchZoomRotate.disableRotation()
    map.on('error', (e) => {
      if (
        String(e.error?.message ?? '')
          .toLowerCase()
          .includes('webgl')
      )
        onFail()
    })

    let raf = 0
    map.on('move', () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => setZoom(map.getZoom()))
    })
    let hoverGeo: string | undefined
    const setHoverGeo = (id?: string) => {
      if (hoverGeo && hoverGeo !== id) map.setFeatureState({ source: 'regions', id: hoverGeo }, { hover: false })
      if (id) map.setFeatureState({ source: 'regions', id }, { hover: true })
      hoverGeo = id
    }
    map.on('mousemove', 'region-fill', (e) => {
      const geo = e.features?.[0]?.id as string | undefined
      const rid = geo ? geoToRegion.get(geo) : undefined
      setHoverGeo(rid ? geo : undefined)
      setHover(rid ? { id: rid, x: e.point.x, y: e.point.y } : null)
      map.getCanvas().style.cursor = rid ? 'pointer' : ''
    })
    map.on('mouseleave', 'region-fill', () => {
      setHoverGeo(undefined)
      setHover(null)
      map.getCanvas().style.cursor = ''
    })
    map.on('click', 'region-fill', (e) => {
      const geo = e.features?.[0]?.id as string | undefined
      const rid = geo ? geoToRegion.get(geo) : undefined
      const st = useDemo.getState()
      if (rid && st.regionId !== rid) st.selectRegion(rid)
    })

    let anim = 0
    let userMoved = false
    map.on('dragstart', () => (userMoved = true))
    map.on('wheel', () => (userMoved = true))
    map.on('load', () => {
      fitZoom.current = map.getZoom()
      setZoom(map.getZoom())
      el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show')
      const marker = (at: [number, number], opts: maplibregl.MarkerOptions = {}) => {
        const node = document.createElement('div')
        const m = new maplibregl.Marker({ element: node, ...opts }).setLngLat(at).addTo(map)
        return { node, m }
      }
      const regions = pack.spec.regions.flatMap((r) => {
        const at = regionAnchor(pack, r.id)
        return at ? [{ el: marker(at).node, id: r.id }] : []
      })
      const sites = pack.spec.sites.flatMap((s) => (s.coordinates ? [{ el: marker(s.coordinates).node, id: s.id }] : []))
      const co = marker(all.slice(0, 2) as [number, number], {
        anchor: 'left',
        offset: [26, 0],
      })
      setEls({ regions, sites, callout: { el: co.node, marker: co.m } })
      setLoaded(true)
      let last = 0
      const pulse = (t: number) => {
        anim = requestAnimationFrame(pulse)
        if (prefersReducedMotion() || t - last < 80) return
        last = t
        map.setPaintProperty('halo', 'circle-opacity', 0.2 + 0.28 * Math.abs(Math.sin(t / 700)))
      }
      anim = requestAnimationFrame(pulse)
    })
    const ro = new ResizeObserver(() => {
      map.resize()
      const st = useDemo.getState()
      if (!userMoved && !st.regionId) {
        map.fitBounds(all as LngLatBoundsLike, { padding: PAD, duration: 0 })
        fitZoom.current = map.getZoom()
      }
    })
    ro.observe(el)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(raf)
      cancelAnimationFrame(anim)
      map.remove()
      mapRef.current = null
      setEls(null)
      setLoaded(false)
    }
  }, [pack, onFail])

  useEffect(() => {
    const map = mapRef.current
    const c = colors.current
    if (!map || !loaded || !c) return
    const maxAffected = Math.max(0, ...data.regions.map((r) => r.affected))
    map.setPaintProperty('region-fill', 'fill-color', fillExpr(layer, c))
    map.setPaintProperty('region-extrude', 'fill-extrusion-color', extrudeExpr(layer, c))
    for (const r of data.regions) {
      if (!r.region.geoId) continue
      const level = regionLevel(r, layer, maxAffected)
      const h = regionId ? 0 : layer === 'incidents' ? 6_000 + (r.affected / Math.max(1, maxAffected)) * 140_000 : 6_000 + level * 45_000
      map.setFeatureState(
        { source: 'regions', id: r.region.geoId },
        {
          level,
          selected: r.region.id === regionId,
          dim: !!regionId && r.region.id !== regionId,
          h,
        },
      )
    }
    ;(map.getSource('halo') as GeoJSONSource).setData(haloGeo(data))
    ;(map.getSource('columns') as GeoJSONSource).setData(columnGeo(data, layer, c, !!regionId))
    map.setLayoutProperty('halo', 'visibility', layer.startsWith('metric:') ? 'none' : 'visible')
  }, [data, layer, regionId, loaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    map.setLayoutProperty('columns', 'visibility', map3d ? 'visible' : 'none')
    map.setLayoutProperty('region-extrude', 'visibility', map3d && !regionId ? 'visible' : 'none')
    if (tilted.current === map3d) return
    tilted.current = map3d
    map.easeTo({
      pitch: map3d ? 52 : 0,
      bearing: map3d ? (locale === 'ar' ? 14 : -14) : 0,
      duration: duration(1200),
    })
  }, [map3d, loaded, locale, regionId])

  const fitAll = (ms = 900) => {
    const all = allBounds(pack)
    if (mapRef.current && all)
      mapRef.current.fitBounds(all as LngLatBoundsLike, {
        padding: PAD,
        duration: duration(ms),
      })
  }
  const fitRegion = (id: string) => {
    const bb: BBox | undefined = regionBounds(pack, id)
    if (mapRef.current && bb)
      mapRef.current.fitBounds(bb as LngLatBoundsLike, {
        padding: { ...PAD, top: 90 },
        duration: duration(1200),
        maxZoom: 10,
      })
  }

  const shownRegion = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!loaded || shownRegion.current === regionId) return
    shownRegion.current = regionId
    if (regionId) fitRegion(regionId)
    else fitAll(1100)
    // fitRegion/fitAll only read the pack and the map instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionId, loaded])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded || !mapCommand) return
    if (mapCommand.kind === 'all') {
      useDemo.getState().selectRegion(undefined)
      fitAll()
    } else if (mapCommand.kind === 'region' && mapCommand.id) {
      if (useDemo.getState().regionId !== mapCommand.id) useDemo.getState().selectRegion(mapCommand.id)
      else fitRegion(mapCommand.id)
    } else if (mapCommand.kind === 'site' && mapCommand.id) {
      const s = pack.site(mapCommand.id)
      if (s?.coordinates) {
        map.flyTo({
          center: s.coordinates,
          zoom: Math.max(fitZoom.current + 3, 8),
          duration: duration(1600),
          essential: true,
        })
        setFocusSite(s.id)
      }
    }
    // Commands run once each, keyed by their nonce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapCommand, loaded])

  const hero = data.hero
  useEffect(() => {
    if (!els || !hero) return
    const r = data.regions.find((x) => x.region.id === hero.site.regionId)
    els.callout.marker.setLngLat(r?.anchor ?? hero.site.coordinates)
  }, [els, hero, data.regions])

  const national = zoom < fitZoom.current + 1.3
  const showLabels = zoom >= fitZoom.current + 2.6
  const metricMode = layer.startsWith('metric:')
  const hovered = hover ? data.regions.find((r) => r.region.id === hover.id) : undefined
  const select = (id: string) => useDemo.getState().selectSite(id)

  return (
    <div className="site-map relative w-full overflow-hidden rounded-[var(--radius-card)] border border-line" style={{ height, background: SEA }} data-testid="region-map" data-zoom={zoom.toFixed(2)} data-engine="maplibre">
      <div ref={container} dir="ltr" style={{ position: 'absolute', inset: 0 }} />
      {els &&
        els.regions.map(({ el, id }) => {
          const r = data.regions.find((x) => x.region.id === id)
          if (!r) return null
          const visible = national && !regionId && r.total > 0
          const incidents = layer === 'incidents'
          const color = incidents ? 'var(--brand-secondary)' : STATUS_VAR[metricMode ? r.metricTone : r.status]
          const size = incidents ? 34 + Math.min(40, Math.sqrt(r.affected) / 3) : 38
          const label = incidents ? (r.affected ? shortNumber(r.affected, locale) : '0') : fmtNumber(metricMode ? r.flagged : r.attention, locale)
          return createPortal(
            <button
              type="button"
              aria-label={p(r.region.name)}
              title={p(r.region.name)}
              onClick={(e) => {
                e.stopPropagation()
                useDemo.getState().selectRegion(id)
              }}
              className="relative flex items-center justify-center rounded-full border-[3px] bg-white font-bold text-ink shadow-md transition-transform hover:scale-110"
              style={{
                display: visible ? 'flex' : 'none',
                width: size,
                height: size,
                borderColor: color,
                fontSize: '0.85rem',
              }}
              data-testid={`region-${id}`}
            >
              {r.status === 'critical' && layer === 'status' && <span className="pulse-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${color}` }} />}
              <span className={`num whitespace-nowrap ${incidents && locale === 'ar' ? 'text-[0.68rem]' : ''}`}>{label}</span>
              {r.activeIncidents > 0 && !incidents && (
                <span className="num absolute -end-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-critical px-1 text-[0.68rem] text-white">{fmtNumber(r.activeIncidents, locale)}</span>
              )}
            </button>,
            el,
            `region-${id}`,
          )
        })}
      {els &&
        els.sites.map(({ el, id }) => {
          const s = data.sites.find((x) => x.site.id === id)
          if (!s) return null
          const visible = !national || !!regionId
          const tone = siteTone(s, layer)
          const color = tone ? STATUS_VAR[tone] : NO_READING
          const selected = siteId === id || focusSite === id
          const sz = layer === 'incidents' && s.affected ? 14 + Math.min(26, Math.sqrt(s.affected) / 4) : selected ? 22 : 16
          el.style.zIndex = String(10 + (tone ? SEVERITY_RANK[tone] : 0) + (selected ? 5 : 0))
          const labelled = showLabels || selected || hoverSite === id || (!!regionId && s.site.regionId === regionId)
          return createPortal(
            <div className="relative flex flex-col items-center" style={{ display: visible ? 'flex' : 'none' }}>
              <button
                type="button"
                aria-label={p(s.site.name)}
                onClick={(e) => {
                  e.stopPropagation()
                  select(id)
                }}
                onMouseEnter={() => setHoverSite(id)}
                onMouseLeave={() => setHoverSite(undefined)}
                className="relative rounded-full border-[3px] border-white shadow-md transition-transform hover:scale-125"
                style={{
                  width: sz,
                  height: sz,
                  background: color,
                  outline: selected ? '3px solid var(--brand-primary)' : 'none',
                }}
                data-testid={`site-${id}`}
              >
                {tone === 'critical' && <span className="pulse-ring absolute -inset-1 rounded-full" style={{ border: `2px solid ${color}` }} />}
              </button>
              {labelled && (
                <div className="site-map-label absolute top-full mt-1 text-[0.74rem]">
                  {p(s.site.name)}
                  {s.affected > 0 && <span className="num ms-1 text-critical">· {fmtNumber(s.affected, locale)}</span>}
                  {metricMode && s.metric && (
                    <span className="num ms-1" style={{ color: STATUS_VAR[s.metric.tone] }}>
                      · {fmtNumber(s.metric.value, locale, s.metric.m.decimals ?? 0)}
                      {p(s.metric.m.unit)}
                    </span>
                  )}
                </div>
              )}
            </div>,
            el,
            `site-${id}`,
          )
        })}
      {els &&
        createPortal(
          hero ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                select(hero.site.id)
              }}
              className="items-center gap-2 whitespace-nowrap rounded-xl border border-critical/40 bg-white/95 px-2.5 py-1.5 text-start shadow-md hover:border-critical"
              style={{
                display: national && !regionId && !metricMode ? 'flex' : 'none',
              }}
              dir={locale === 'ar' ? 'rtl' : 'ltr'}
              data-testid="map-callout"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="pulse-ring absolute inset-0 rounded-full" style={{ border: `2px solid ${STATUS_VAR.critical}` }} />
                <span className="h-2.5 w-2.5 rounded-full bg-critical" />
              </span>
              <span className="leading-tight">
                <span className="block text-[0.78rem] font-semibold text-ink">{p(hero.site.name)}</span>
                <span className="num block text-[0.72rem] font-semibold text-critical">
                  {hero.affected > 0 ? `${fmtNumber(hero.affected, locale)} ${p(hero.incidents.find((i) => i.incident.affected)?.incident.affected?.unit)} ${p(MAP.affected)}` : p(hero.incidents[0]?.incident.title)}
                </span>
              </span>
            </button>
          ) : (
            <span />
          ),
          els.callout.el,
          'callout',
        )}

      <div className="pointer-events-none absolute inset-x-4 top-4 z-10 flex flex-wrap items-start justify-between gap-2">
        <div className="pointer-events-auto flex items-center gap-2">
          <Breadcrumb />
          <BackButton />
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <LayerSwitch metrics={metrics} incidents={pack.spec.incidents.length > 0} />
          <Map3dToggle />
        </div>
      </div>
      <div className="absolute bottom-9 start-3 z-10">
        <ZoomControls onIn={() => mapRef.current?.zoomIn()} onOut={() => mapRef.current?.zoomOut()} onFit={() => (regionId ? useDemo.getState().selectRegion(undefined) : fitAll())} />
      </div>
      <div className="absolute bottom-9 end-3 z-10">
        <Legend metrics={metrics} initiallyOpen={!compact} />
      </div>
      {hover && hovered && (
        <div className="pointer-events-none absolute z-20 w-60 rounded-xl border border-line bg-white/95 px-3 py-2 text-[0.78rem] shadow-md" style={{ left: hover.x + 16, top: hover.y + 16 }} data-testid="map-hover">
          <div className="mb-1 flex items-center justify-between gap-2 font-semibold text-ink">
            {p(hovered.region.name)}
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_VAR[hovered.status] }} title={sev(hovered.status)} />
          </div>
          {[
            {
              label: MAP.activeIncidents,
              value: hovered.activeIncidents,
              red: hovered.activeIncidents > 0,
            },
            {
              label: MAP.impact,
              value: hovered.affected,
              red: hovered.affected > 0,
            },
            {
              label: MAP.attention,
              value: hovered.attention,
              of: hovered.total,
              red: false,
            },
          ].map((row) => (
            <div key={row.label.en} className="flex items-center justify-between gap-3">
              <span className="text-muted">{p(row.label)}</span>
              <span className={`num font-semibold ${row.red ? 'text-critical' : 'text-ink'}`}>
                {fmtNumber(row.value, locale)}
                {row.of !== undefined && ` / ${fmtNumber(row.of, locale)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
