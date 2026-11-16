import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { featureBBox, unionBBox, type BBox } from '../../geo'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import { countBy, shade, shadeSteps, type ReportRow } from './data'

const W = 1400
const H = 620

function projector([x0, y0, x1, y1]: BBox) {
  const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const s = Math.min(W / ((x1 - x0) * kx), H / (y1 - y0)) * 0.92
  const ox = (W - (x1 - x0) * kx * s) / 2
  const oy = (H - (y1 - y0) * s) / 2
  return ([lng, lat]: number[]) => [ox + (lng - x0) * kx * s, oy + (y1 - lat) * s] as [number, number]
}

/** Area centroid of the largest ring, so labels sit inside the region. */
function anchor(rings: number[][][]): [number, number] {
  let best: [number, number] = [0, 0]
  let bestA = 0
  for (const r of rings) {
    let a = 0
    let cx = 0
    let cy = 0
    for (let i = 0; i < r.length - 1; i++) {
      const k = r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1]
      a += k
      cx += (r[i][0] + r[i + 1][0]) * k
      cy += (r[i][1] + r[i + 1][1]) * k
    }
    if (Math.abs(a) > bestA) {
      bestA = Math.abs(a)
      best = [cx / (3 * a), cy / (3 * a)]
    }
  }
  return best
}

interface Props {
  rows: ReportRow[]
  listTitle: string
  legend: string
}

/** Regions shaded by record counts in the slice; clicking one narrows the report to it, and its sites with records are listed beside it. */
export function ReportMap({ rows, listTitle, legend }: Props) {
  const { pack, p, t, rtl, locale } = useT()
  const focus = useDemo((s) => s.reportFocus)
  const setFocus = useDemo((s) => s.setReportFocus)
  const { spec, boundaries } = pack
  const byRegion = useMemo(() => countBy(rows, (r) => r.regionId), [rows])
  const bySite = useMemo(() => countBy(rows, (r) => r.siteId), [rows])
  const steps = shadeSteps(Math.max(1, ...byRegion.values()))
  const regionOf = useMemo(() => new Map(spec.regions.filter((r) => r.geoId).map((r) => [r.geoId!, r])), [spec.regions])
  const focused = spec.regions.find((r) => r.id === focus.regionId)

  const features = useMemo(() => boundaries?.features ?? [], [boundaries])
  const view = useMemo<BBox>(() => {
    const placed = focused ? spec.sites.filter((s) => s.regionId === focused.id && s.coordinates && bySite.get(s.id)) : []
    if (placed.length) {
      const u = unionBBox(placed.map((s) => [...s.coordinates!, ...s.coordinates!] as BBox))
      const cx = (u[0] + u[2]) / 2
      const cy = (u[1] + u[3]) / 2
      const w = Math.max(u[2] - u[0], 2.4) * 0.7
      const h = Math.max(u[3] - u[1], 1.2) * 0.7
      return [cx - w, cy - h, cx + w, cy + h]
    }
    const ids = focused?.geoId ? [focused.geoId] : [...regionOf.keys()]
    const feats = features.filter((f) => ids.includes(f.properties.id))
    const u = unionBBox((feats.length ? feats : features).map(featureBBox))
    const k = focused ? [0.45, 0.25] : [0.04, 0.04]
    const dx = (u[2] - u[0]) * k[0]
    const dy = (u[3] - u[1]) * k[1]
    return [u[0] - dx, u[1] - dy, u[2] + dx, u[3] + dy]
  }, [features, focused, regionOf, spec.sites, bySite])
  const proj = useMemo(() => projector(view), [view])
  const shapes = useMemo(
    () =>
      features.map((f) => {
        const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
        const d = polys.map((poly) => poly.map((ring) => 'M' + ring.map((pt) => proj(pt).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')).join('')
        return { geoId: f.properties.id, d, at: proj(anchor(polys.map((poly) => poly[0]))) }
      }),
    [features, proj],
  )

  const list = focused
    ? [...bySite.entries()].filter(([id]) => pack.site(id)?.regionId === focused.id).map(([id, n]) => ({ id, name: p(pack.site(id)?.name), n, kind: 'site' as const }))
    : spec.regions.map((r) => ({ id: r.id, name: p(r.name), n: byRegion.get(r.id) ?? 0, kind: 'region' as const }))
  list.sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
  const max = Math.max(1, ...list.map((x) => x.n))
  const sitesShown = focused ? spec.sites.filter((s) => s.regionId === focused.id && s.coordinates && bySite.get(s.id)) : []
  const Back = rtl ? ArrowRight : ArrowLeft

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[inherit] bg-[#e7ecf5]" data-testid="report-map" data-level={focus.siteId ? 'site' : focused ? 'region' : 'all'}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet" role="img" aria-label={listTitle}>
        {shapes.map((sh) => {
          const region = regionOf.get(sh.geoId)
          if (!region) return <path key={sh.geoId} d={sh.d} fill="#f4f5f9" stroke="#cdd3e1" strokeWidth={0.8} />
          const n = byRegion.get(region.id) ?? 0
          const on = region.id === focused?.id
          return (
            <path
              key={sh.geoId}
              d={sh.d}
              fill={shade(n, steps)}
              opacity={focused && !on ? 0.45 : 1}
              stroke={on ? 'var(--brand-secondary)' : '#a9b1cc'}
              strokeWidth={on ? 2.5 : 1}
              className="cursor-pointer hover:brightness-95"
              onClick={() => setFocus(on ? {} : { regionId: region.id })}
              data-testid={`report-map-region-${region.id}`}
            >
              <title>{`${p(region.name)}: ${n}`}</title>
            </path>
          )
        })}
        {!focused &&
          shapes.map((sh) => {
            const region = regionOf.get(sh.geoId)
            const n = region ? (byRegion.get(region.id) ?? 0) : 0
            if (!region || !n) return null
            return (
              <g key={sh.geoId} transform={`translate(${sh.at[0]},${sh.at[1]})`} className="pointer-events-none" data-testid="report-map-bubble">
                <circle r={20} fill="#fff" stroke="var(--brand-primary)" strokeWidth={2.5} />
                <text textAnchor="middle" dy="0.35em" fontSize={18} fontWeight={700} fill="var(--brand-primary)">
                  {fmtNumber(n, locale)}
                </text>
                <text textAnchor="middle" y={38} fontSize={15} fontWeight={600} fill="#1f1a3d" stroke="#fff" strokeWidth={3.5} paintOrder="stroke">
                  {p(region.name)}
                </text>
              </g>
            )
          })}
        {sitesShown.map((s) => {
          const [x, y] = proj(s.coordinates!)
          const n = bySite.get(s.id) ?? 0
          const on = focus.siteId === s.id
          return (
            <g key={s.id} transform={`translate(${x},${y})`} className="cursor-pointer" onClick={() => setFocus({ regionId: s.regionId, siteId: on ? undefined : s.id })} data-testid={`report-map-site-${s.id}`}>
              <circle r={12 + Math.min(10, n * 2)} fill={on ? 'var(--brand-accent)' : '#fff'} stroke="var(--brand-primary)" strokeWidth={2.5} />
              <text textAnchor="middle" dy="0.35em" fontSize={16} fontWeight={700} fill={on ? '#fff' : 'var(--brand-primary)'}>
                {fmtNumber(n, locale)}
              </text>
              <text textAnchor="middle" y={-26 - Math.min(10, n * 2)} fontSize={14} fontWeight={600} fill="#1f1a3d" stroke="#fff" strokeWidth={3.5} paintOrder="stroke">
                {p(s.name)}
              </text>
            </g>
          )
        })}
      </svg>
      {focused && (
        <button type="button" className="btn btn-ghost absolute start-3 top-3 !bg-white !px-3 !py-1.5 text-[0.85rem] shadow-sm" onClick={() => setFocus({})} data-testid="report-map-back">
          <Back size={15} /> {t('back')}
        </button>
      )}
      {list.length > 0 && (
        <div className="absolute end-3 top-3 w-[19rem] rounded-xl bg-white/95 px-3 py-2.5 shadow-sm" data-testid="report-map-list">
          <div className="eyebrow mb-1.5">{listTitle}</div>
          <ul className="scroll-thin max-h-[19rem] space-y-0.5 overflow-y-auto">
            {list.slice(0, 14).map((k) => (
              <li key={k.id}>
                <button
                  type="button"
                  onClick={() => setFocus(k.kind === 'region' ? { regionId: k.id } : { regionId: focused?.id, siteId: k.id })}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_5rem_2rem] items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-surface ${focus.siteId === k.id ? 'bg-surface' : ''}`}
                  data-testid="report-map-row"
                  data-place={k.id}
                >
                  <span className="truncate text-[0.84rem] font-medium text-ink">{k.name}</span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-secondary/70" style={{ width: `${k.n ? Math.max(4, (k.n / max) * 100) : 0}%` }} />
                  </span>
                  <span className="num text-end text-[0.88rem] font-semibold text-ink">{fmtNumber(k.n, locale)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="absolute bottom-3 start-3 max-w-[24rem] rounded-xl bg-white/95 px-3 py-2 text-[0.72rem] leading-snug text-muted shadow-sm" data-testid="report-map-legend">
        <div className="mb-1 flex items-center gap-3 font-semibold text-ink">
          {steps.map((n, i) => (
            <span key={i} className="inline-flex items-center gap-1">
              <span className="inline-block h-3 w-3 rounded-sm border border-[#a9b1cc]" style={{ background: shade(n, steps) }} />
              <span className="num">{i === 2 ? `${n}+` : `${n}–${Math.max(n, steps[i + 1] - 1)}`}</span>
            </span>
          ))}
        </div>
        {legend}
        {boundaries && (
          <div className="mt-0.5 text-[0.62rem]" dir="ltr">
            {boundaries.attribution.split(',')[0]}
          </div>
        )}
      </div>
    </div>
  )
}

/** The map's stand-in for packs without geography: one tile per region with its record count. */
export function ReportGroups({ rows }: { rows: ReportRow[] }) {
  const { pack, p, locale } = useT()
  const focus = useDemo((s) => s.reportFocus)
  const setFocus = useDemo((s) => s.setReportFocus)
  const byRegion = useMemo(() => countBy(rows, (r) => r.regionId), [rows])
  const bySite = useMemo(() => countBy(rows, (r) => r.siteId), [rows])
  const steps = shadeSteps(Math.max(1, ...byRegion.values()))
  return (
    <div className="grid h-full auto-rows-fr gap-3 overflow-y-auto p-4 sm:grid-cols-2 2xl:grid-cols-4" data-testid="report-map" data-level={focus.regionId ? 'region' : 'all'}>
      {pack.spec.regions.map((r) => {
        const n = byRegion.get(r.id) ?? 0
        const on = focus.regionId === r.id
        const top = pack.spec.sites
          .filter((s) => s.regionId === r.id && bySite.get(s.id))
          .sort((a, b) => (bySite.get(b.id) ?? 0) - (bySite.get(a.id) ?? 0))
          .slice(0, 3)
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => setFocus(on ? {} : { regionId: r.id })}
            aria-pressed={on}
            className="flex flex-col gap-2 rounded-xl border p-4 text-start"
            style={{ background: shade(n, steps), borderColor: on ? 'var(--brand-secondary)' : 'var(--line)', borderWidth: on ? 2 : 1, opacity: focus.regionId && !on ? 0.55 : 1 }}
            data-testid={`report-group-${r.id}`}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-ink">{p(r.name)}</span>
              <span className="num text-[1.4rem] font-semibold leading-none text-brand">{fmtNumber(n, locale)}</span>
            </div>
            {top.length > 0 && (
              <ul className="space-y-0.5 text-[0.82rem] text-body">
                {top.map((s) => (
                  <li key={s.id} className="flex justify-between gap-2">
                    <span className="truncate">{p(s.name)}</span>
                    <span className="num font-semibold">{fmtNumber(bySite.get(s.id) ?? 0, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </button>
        )
      })}
    </div>
  )
}
