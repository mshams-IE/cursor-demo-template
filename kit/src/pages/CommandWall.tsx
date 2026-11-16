import { Pause, Play, Radio, Route, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clouderaLogo from '../../assets/cloudera-logo.png'
import { GroupGrid } from '../components/GroupGrid'
import { RegionMap } from '../components/RegionMap'
import { W } from '../features/wall/strings'
import { Ticker, WallAlerts, WallIncidents, WallKpi } from '../features/wall/WallParts'
import '../features/wall/wall.css'
import { useT } from '../i18n'
import { activeIncidents, kpisAt, sitesAt } from '../model/live'
import { formatDate, formatTime, MINUTE } from '../model/time'
import { useDemo } from '../store'

const TOUR_MS = 14_000

function useTour(on: boolean, minute: number) {
  const { pack } = useT()
  const bucket = Math.floor(minute / (10 * MINUTE))
  const stops = useMemo(() => {
    const regions = activeIncidents(pack.spec, bucket * 10 * MINUTE)
      .map((i) => pack.site(i.incident.siteId)?.regionId)
      .filter((r): r is string => !!r)
    return [undefined, ...new Set(regions)]
  }, [pack, bucket])
  const [i, setI] = useState(0)
  useEffect(() => {
    if (!on) return
    const id = setInterval(() => setI((x) => x + 1), TOUR_MS)
    return () => clearInterval(id)
  }, [on])
  const stop = stops[i % stops.length]
  useEffect(() => {
    if (on) useDemo.getState().selectRegion(stop)
  }, [stop, on])
  return on ? stop : undefined
}

export function CommandWall() {
  const { pack, t, p, locale } = useT()
  const navigate = useNavigate()
  const clockMs = useDemo((s) => s.clockMs)
  const playing = useDemo((s) => s.clockPlaying)
  const live = useDemo((s) => s.clockLive)
  const setPlaying = useDemo((s) => s.setClockPlaying)
  const [tour, setTour] = useState(true)
  const minute = Math.floor(clockMs / MINUTE) * MINUTE
  const focus = useTour(tour, minute)
  const { spec } = pack
  const kpis = useMemo(() => kpisAt(pack, minute), [pack, minute])
  const sites = useMemo(() => sitesAt(spec, minute).map((l) => ({ ...l.site, status: l.status, note: l.note })), [spec, minute])
  const coBrand = spec.brand.coBrand && spec.customer.logo

  const exit = () => {
    useDemo.getState().selectRegion(undefined)
    navigate({ pathname: '/overview', search: globalThis.location.hash.split('?')[1] ?? '' })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && exit()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="wall flex h-full flex-col overflow-hidden text-white" data-testid="command-wall">
      <header className="flex items-center gap-5 px-8 pb-4 pt-5">
        <div className="flex h-14 items-center gap-3 rounded-2xl bg-white px-4">
          <img src={clouderaLogo} alt="Cloudera" className="h-5 w-auto" />
          {coBrand && <img src={spec.customer.logo} alt={p(spec.customer.name)} className="h-9 w-auto border-s border-line ps-3" />}
        </div>
        <div className="me-auto min-w-0">
          <div className="text-[0.85rem] font-semibold uppercase tracking-[0.18em] text-cyan">{p(W.commandView)}</div>
          <h1 className="truncate text-[1.9rem] font-bold leading-tight">{p(spec.title)}</h1>
        </div>
        {focus && (
          <div key={focus} className="fade-up hidden items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[1rem] lg:flex" data-testid="wall-focus">
            <Radio size={16} className="text-[#ff7a6e]" />
            {pack.regionName(focus, locale)}
          </div>
        )}
        <div className="text-end">
          <div className="num text-[2.6rem] font-bold leading-none tracking-tight" data-testid="wall-clock">
            {formatTime(clockMs, locale)}
          </div>
          <div className="mt-1 text-[0.82rem] text-white/60">
            {formatDate(clockMs, locale)} · {p(spec.clock.zone)}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!live && (
            <button type="button" onClick={() => setPlaying(!playing)} className="wall-btn" aria-label={p(playing ? W.pause : W.play)} aria-pressed={playing} data-testid="wall-play">
              {playing ? <Pause size={18} /> : <Play size={18} />}
            </button>
          )}
          <button type="button" onClick={() => setTour(!tour)} className="wall-btn" aria-pressed={tour} aria-label={p(W.tour)} title={p(W.tour)} data-testid="wall-tour">
            <Route size={18} />
          </button>
          <button type="button" onClick={exit} className="wall-btn" aria-label={p(W.exit)} title={p(W.exit)} data-testid="wall-exit">
            <X size={18} />
          </button>
        </div>
      </header>

      <div className="grid gap-4 px-8" style={{ gridTemplateColumns: `repeat(${Math.min(4, Math.max(1, kpis.length))}, minmax(0, 1fr))` }}>
        {kpis.slice(0, 4).map((k) => (
          <WallKpi key={k.kpi.id} k={k} />
        ))}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_30rem] gap-4 px-8 py-4">
        <div className="min-h-0 overflow-hidden rounded-[22px] border border-white/10 bg-white text-ink shadow-2xl" data-testid="wall-map">
          {pack.boundaries ? <RegionMap sites={sites} height="100%" testid="wall-region-map" /> : <div className="scroll-thin h-full overflow-y-auto p-4"><GroupGrid sites={sites} height="100%" testid="wall-group-grid" /></div>}
        </div>
        <div className="flex min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[22px] bg-white p-4 text-ink">
            <div className="eyebrow mb-3">{t('priorityIncidents')}</div>
            <div className="scroll-thin min-h-0 flex-1 overflow-y-auto pe-1">
              <WallIncidents minute={minute} />
            </div>
          </div>
          <div className="max-h-[40%] overflow-y-auto rounded-[22px] bg-white p-4 text-ink scroll-thin">
            <div className="eyebrow mb-3">{p(W.alerts)}</div>
            <WallAlerts minute={minute} />
          </div>
        </div>
      </div>
      <Ticker minute={minute} />
    </div>
  )
}
