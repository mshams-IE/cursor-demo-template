import { ArrowLeft, ArrowRight, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { featureBBox, unionBBox, type BBox } from '../geo'
import { useT } from '../i18n'
import { SEVERITY_RANK, worst } from '../pack'
import { useDemo } from '../store'
import type { Severity, Site } from '../types'
import { STATUS_SOFT, STATUS_VAR, StatusChip } from './ui'

const W = 1000
const H = 620

function projector(bb: BBox) {
  const [x0, y0, x1, y1] = bb
  const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const s = Math.min(W / ((x1 - x0) * kx), H / (y1 - y0)) * 0.9
  const ox = (W - (x1 - x0) * kx * s) / 2
  const oy = (H - (y1 - y0) * s) / 2
  return ([lng, lat]: number[]) => [ox + (lng - x0) * kx * s, oy + (y1 - lat) * s] as [number, number]
}

function minSpan([a, b, c, d]: BBox, span: number): BBox {
  const cx = (a + c) / 2
  const cy = (b + d) / 2
  const w = Math.max(c - a, span) / 2
  const h = Math.max(d - b, span * 0.62) / 2
  return [cx - w, cy - h, cx + w, cy + h]
}

function padBox([a, b, c, d]: BBox, k: number): BBox {
  const dx = (c - a) * k
  const dy = (d - b) * k
  return [a - dx, b - dy, c + dx, d + dy]
}

/** Region shading by worst site status, site dots by status, and a bubble per region counting sites that need attention. */
export function RegionMap({ sites, height = '26rem', testid = 'region-map' }: { sites: Site[]; height?: string; testid?: string }) {
  const { pack, p, t, sev, rtl, locale } = useT()
  const regionId = useDemo((s) => s.regionId)
  const selectRegion = useDemo((s) => s.selectRegion)
  const [popup, setPopup] = useState<string>()
  const [hover, setHover] = useState<string>()
  const { spec, boundaries } = pack

  const packFeatures = useMemo(() => new Map(spec.regions.map((r) => [r.geoId, r])), [spec.regions])
  const view = useMemo<BBox>(() => {
    const sel = spec.regions.find((r) => r.id === regionId)
    const inView = spec.sites.filter((s) => !sel || s.regionId === sel.id)
    if (!inView.length) {
      const feats = boundaries.features.filter((f) => (sel ? f.properties.id === sel.geoId : packFeatures.has(f.properties.id)))
      return padBox(unionBBox(feats.map(featureBBox)), 0.06)
    }
    return minSpan(padBox(unionBBox(inView.map((s) => [...s.coordinates, ...s.coordinates] as BBox)), 0.2), sel ? 1.4 : 4)
  }, [regionId, spec.regions, spec.sites, boundaries, packFeatures])
  const proj = useMemo(() => projector(view), [view])

  const paths = useMemo(
    () =>
      boundaries.features.map((f) => {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        const d = polys.map((poly) => poly.map((ring) => 'M' + ring.map((pt) => proj(pt).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('')
        return { geoId: f.properties.id, d, bbox: featureBBox(f) }
      }),
    [proj, boundaries],
  )

  const byRegion = useMemo(() => {
    const m = new Map<string, Site[]>()
    for (const s of sites) m.set(s.regionId, [...(m.get(s.regionId) ?? []), s])
    return m
  }, [sites])

  const regionBox = (rid: string) => paths.find((x) => x.geoId === spec.regions.find((r) => r.id === rid)?.geoId)?.bbox
  /** Bubble sits on the region's sites; the label sits in the visible part of the region, away from the dots. */
  const bubbleAt = (rid: string): [number, number] => {
    const list = spec.sites.filter((s) => s.regionId === rid)
    if (!list.length) return labelAt(rid)
    const [x, y] = proj([Math.max(...list.map((s) => s.coordinates[0])), Math.max(...list.map((s) => s.coordinates[1]))])
    return [x + 22, y - 18]
  }
  const labelAt = (rid: string): [number, number] => {
    const bb = regionBox(rid)
    if (!bb) return [W / 2, H / 2]
    const clip: BBox = [Math.max(bb[0], view[0]), Math.max(bb[1], view[1]), Math.min(bb[2], view[2]), Math.min(bb[3], view[3])]
    return proj([(clip[0] + clip[2]) / 2, (clip[1] + clip[3]) / 2])
  }

  const zoomed = !!regionId
  const showSiteLabels = zoomed
  const popupSite = popup ? pack.site(popup) : undefined
  const Back = rtl ? ArrowRight : ArrowLeft
  const ordered = [...sites].sort((a, b) => SEVERITY_RANK[a.status] - SEVERITY_RANK[b.status])

  return (
    <div className="relative w-full overflow-hidden rounded-[var(--radius-card)] border border-line bg-[#e4edf3]" style={{ height }} data-testid={testid}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label="map">
        {paths.map(({ geoId, d }) => {
          const region = packFeatures.get(geoId)
          if (!region) return <path key={geoId} d={d} fill="#f4f7f9" stroke="#c9d6df" strokeWidth={0.8} />
          const list = byRegion.get(region.id) ?? []
          const w: Severity = worst(list.map((s) => s.status))
          const selected = region.id === regionId
          return (
            <path
              key={geoId}
              d={d}
              fill={w === 'normal' ? '#ffffff' : STATUS_SOFT[w]}
              opacity={regionId && !selected ? 0.55 : 1}
              stroke={selected ? 'var(--brand-secondary)' : '#9fb0bf'}
              strokeWidth={selected ? 2.5 : 1}
              className="cursor-pointer transition-opacity"
              onClick={() => selectRegion(selected ? undefined : region.id)}
              data-testid={`map-region-${region.id}`}
            />
          )
        })}
        {!zoomed &&
          spec.regions.map((r) => {
            const [x, y] = labelAt(r.id)
            const [bx, by] = bubbleAt(r.id)
            const n = (byRegion.get(r.id) ?? []).filter((s) => s.status !== 'normal').length
            return (
              <g key={r.id} style={{ pointerEvents: 'none' }}>
                <text x={x} y={y} textAnchor="middle" fontSize={22} fontWeight={700} fill="#8090a6" opacity={0.75} letterSpacing={rtl ? 0 : 1}>
                  {p(r.name)}
                </text>
                {n > 0 && (
                  <g data-testid={`map-bubble-${r.id}`}>
                    <circle cx={bx} cy={by} r={15} fill="var(--brand-primary)" stroke="#fff" strokeWidth={2.5} />
                    <text x={bx} y={by + 5} textAnchor="middle" fontSize={14} fontWeight={700} fill="#fff">
                      {n}
                    </text>
                  </g>
                )}
              </g>
            )
          })}
        {ordered.map((s) => {
          const [x, y] = proj(s.coordinates)
          const color = STATUS_VAR[s.status]
          const r = s.status === 'normal' ? 6.5 : 8.5
          return (
            <g key={s.id} className="cursor-pointer" onClick={() => setPopup(s.id)} onMouseEnter={() => setHover(s.id)} onMouseLeave={() => setHover(undefined)} data-testid={`map-site-${s.id}`}>
              {s.status === 'critical' && <circle cx={x} cy={y} r={r} fill={color} className="pulse-ring" />}
              <circle cx={x} cy={y} r={r} fill={color} stroke={popup === s.id ? 'var(--brand-primary)' : '#fff'} strokeWidth={2.5} />
              {(showSiteLabels || hover === s.id) && (
                <text x={x} y={y - r - 6} textAnchor="middle" fontSize={13} fontWeight={600} fill="#120046" stroke="#fff" strokeWidth={3.5} paintOrder="stroke" style={{ pointerEvents: 'none' }}>
                  {p(s.name)}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {zoomed && (
        <button type="button" className="btn btn-ghost absolute start-3 top-3 !bg-white !px-3 !py-1.5 text-[0.85rem] shadow-sm" onClick={() => selectRegion(undefined)} data-testid="map-back">
          <Back size={15} /> {t('back')}
        </button>
      )}

      {popupSite && (
        <div className="card fade-up absolute end-3 top-3 z-10 w-[19rem] p-4 text-[0.86rem]" data-testid="map-popup">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-bold text-ink">{p(popupSite.name)}</div>
              <div className="text-muted">
                {pack.typeName(popupSite.type, locale)} · {pack.regionName(popupSite.regionId, locale)}
              </div>
            </div>
            <button type="button" onClick={() => setPopup(undefined)} aria-label={t('close')} className="text-muted hover:text-ink">
              <X size={15} />
            </button>
          </div>
          <div className="mt-2">
            <StatusChip status={popupSite.status} />
          </div>
          {popupSite.note && <p className="mt-2 leading-relaxed text-body">{p(popupSite.note)}</p>}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 start-3 max-w-[22rem] rounded-xl bg-white/92 px-3 py-2 text-[0.76rem] shadow-sm" data-testid="map-legend">
        <div className="mb-1 flex flex-wrap items-center gap-3 font-semibold text-ink">
          {t('legendSites')}:
          {(['normal', 'watch', 'critical'] as Severity[]).map((s) => (
            <span key={s} className="inline-flex items-center gap-1 font-medium text-body">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_VAR[s] }} />
              {sev(s)}
            </span>
          ))}
        </div>
        <div className="text-muted">{t('legendRegions')}</div>
      </div>
      <div className="absolute bottom-1 end-2 text-[10px] text-muted">{boundaries.attribution.split(',')[0]}</div>
    </div>
  )
}
