import { ArrowLeft, ArrowRight, Box, ChevronDown, ChevronUp, Crosshair, Minus, Plus } from 'lucide-react'
import { useState } from 'react'
import { STATUS_VAR, Segmented } from '../../components/ui'
import { useT } from '../../i18n'
import { useDemo } from '../../store'
import type { Severity } from '../../types'
import type { MetricLayer } from './mapModel'
import { MAP } from './strings'
import { useMapView, type MapLayer } from './useMapView'

export const NO_READING = '#9fb0bf'
const SEVERITIES: Severity[] = ['critical', 'watch', 'normal']

export function LayerSwitch({ metrics, incidents }: { metrics: MetricLayer[]; incidents: boolean }) {
  const { p } = useT()
  const layer = useMapView((s) => s.layer)
  const setLayer = useMapView((s) => s.setLayer)
  const options: { value: MapLayer; label: string }[] = [
    { value: 'status', label: p(MAP.layerStatus) },
    ...(incidents ? [{ value: 'incidents' as MapLayer, label: p(MAP.layerIncidents) }] : []),
    ...metrics.map((m) => ({
      value: `metric:${m.id}` as MapLayer,
      label: p(m.label),
    })),
  ]
  if (options.length < 2) return null
  return (
    <div className="rounded-full bg-white/95 shadow-sm">
      <Segmented<MapLayer> ariaLabel={p(MAP.mapLayer)} value={layer} onChange={setLayer} options={options} testid="map-layer" />
    </div>
  )
}

export function Map3dToggle() {
  const { p } = useT()
  const on = useMapView((s) => s.map3d)
  const set = useMapView((s) => s.setMap3d)
  return (
    <button
      type="button"
      onClick={() => set(!on)}
      aria-pressed={on}
      title={p(MAP.view3d)}
      className={`flex h-9 items-center gap-1.5 rounded-xl border px-3 text-[0.8rem] font-semibold shadow-sm transition-colors ${on ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink hover:border-secondary'}`}
      data-testid="map-3d-toggle"
    >
      <Box size={15} />
      3D
    </button>
  )
}

export function Breadcrumb() {
  const { t, p, pack } = useT()
  const regionId = useDemo((s) => s.regionId)
  const selectRegion = useDemo((s) => s.selectRegion)
  const region = pack.spec.regions.find((r) => r.id === regionId)
  return (
    <nav className="card flex items-center gap-2 !rounded-xl px-3 py-1.5 text-[0.85rem]" aria-label="scope" data-testid="map-breadcrumb">
      <button type="button" onClick={() => selectRegion(undefined)} className={region ? 'text-secondary hover:underline' : 'font-semibold text-ink'}>
        {t('allRegions')}
      </button>
      {region && (
        <>
          <span className="text-muted">/</span>
          <span className="font-semibold text-ink">{p(region.name)}</span>
        </>
      )}
    </nav>
  )
}

export function BackButton() {
  const { t, rtl } = useT()
  const regionId = useDemo((s) => s.regionId)
  const selectRegion = useDemo((s) => s.selectRegion)
  const Back = rtl ? ArrowRight : ArrowLeft
  if (!regionId) return null
  return (
    <button type="button" className="btn btn-ghost !bg-white !px-3 !py-1.5 text-[0.85rem] shadow-sm" onClick={() => selectRegion(undefined)} data-testid="map-back">
      <Back size={15} /> {t('back')}
    </button>
  )
}

export function ZoomControls({ onIn, onOut, onFit }: { onIn: () => void; onOut: () => void; onFit: () => void }) {
  const { p } = useT()
  const buttons = [
    { id: 'in', icon: <Plus size={16} />, label: MAP.zoomIn, run: onIn },
    { id: 'out', icon: <Minus size={16} />, label: MAP.zoomOut, run: onOut },
    { id: 'fit', icon: <Crosshair size={16} />, label: MAP.fitAll, run: onFit },
  ]
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-sm" role="group" aria-label={p(MAP.mapZoom)}>
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={b.run}
          title={p(b.label)}
          aria-label={p(b.label)}
          className="flex h-9 w-9 items-center justify-center border-b border-line text-ink last:border-b-0 hover:bg-surface-2"
          data-testid={`map-zoom-${b.id}`}
        >
          {b.icon}
        </button>
      ))}
    </div>
  )
}

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
      <span>{label}</span>
    </div>
  )
}

export function Legend({ metrics, initiallyOpen = true }: { metrics: MetricLayer[]; initiallyOpen?: boolean }) {
  const { t, p, sev } = useT()
  const [open, setOpen] = useState(initiallyOpen)
  const layer = useMapView((s) => s.layer)
  const map3d = useMapView((s) => s.map3d)
  const metric = layer.startsWith('metric:') ? metrics.find((m) => `metric:${m.id}` === layer) : undefined
  return (
    <div className="card max-w-[16rem] !rounded-xl px-4 py-3 text-[0.78rem] text-body" data-testid="map-legend">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className={`eyebrow flex w-full items-center justify-between gap-3 ${open ? 'mb-2' : ''}`} data-testid="map-legend-toggle">
        {p(MAP.legend)}
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {!open ? null : layer === 'incidents' ? (
        <div className="space-y-1.5">
          {SEVERITIES.filter((s) => s !== 'normal').map((s) => (
            <Swatch key={s} color={STATUS_VAR[s]} label={sev(s)} />
          ))}
          <Swatch color={NO_READING} label={p(MAP.noIncident)} />
          <div className="flex items-center gap-2 pt-1">
            <span
              className="inline-block h-3 w-14 shrink-0 rounded"
              style={{
                background: 'linear-gradient(90deg,#ffffff,var(--brand-secondary))',
              }}
            />
            <span>{p(MAP.incidentShade)}</span>
          </div>
          <div className="text-muted">{p(MAP.incidentSize)}</div>
        </div>
      ) : metric ? (
        <div className="space-y-1.5">
          <div className="font-semibold text-ink">{p(metric.label)}</div>
          <Swatch color={STATUS_VAR.critical} label={p(metric.hasLimit ? MAP.overLimit : MAP.worstThird)} />
          <Swatch color={STATUS_VAR.watch} label={p(metric.hasLimit ? MAP.nearLimit : MAP.middleThird)} />
          <Swatch color={STATUS_VAR.normal} label={p(metric.hasLimit ? MAP.withinLimit : MAP.bestThird)} />
          <Swatch color={NO_READING} label={p(MAP.noReading)} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="font-semibold text-ink">{t('legendSites')}</div>
          {SEVERITIES.map((s) => (
            <Swatch key={s} color={STATUS_VAR[s]} label={sev(s)} />
          ))}
        </div>
      )}
      {open && (
        <div className="mt-2 flex items-start gap-2 border-t border-line pt-2 text-muted" data-testid="legend-bubble">
          <span
            className="num mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 bg-white text-[0.6rem] font-bold text-ink"
            style={{
              borderColor: layer === 'incidents' ? 'var(--brand-secondary)' : STATUS_VAR.watch,
            }}
          >
            2
          </span>
          <span>{layer === 'incidents' ? p(MAP.incidentBubble) : metric ? p(MAP.metricBubble) : t('legendRegions')}</span>
        </div>
      )}
      {open && map3d && (
        <div className="mt-1.5 flex items-start gap-2 text-muted" data-testid="legend-3d">
          <Box size={14} className="mt-0.5 shrink-0 text-ink" />
          <span>{p(MAP.height3d)}</span>
        </div>
      )}
    </div>
  )
}
