import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { useMemo } from 'react'
import { StatusChip } from '../../components/ui'
import { useT } from '../../i18n'
import type { LiveIncident } from '../../model/live'
import { formatDuration, formatTime } from '../../model/time'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import { incidentsInWindow, restoration } from './siteModel'
import { SITES } from './strings'

export function useWindowIncidents(): LiveIncident[] {
  const { pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const window = useDemo((s) => s.window)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  return useMemo(() => incidentsInWindow(pack.spec, minute, window), [pack, minute, window])
}

export function PhaseChip({ phase }: { phase: LiveIncident['phase'] }) {
  const { p } = useT()
  return <span className={`chip ${phase === 'active' ? 'bg-surface-2 text-ink' : 'bg-ok-soft text-[#0a7a55]'}`}>{p(phase === 'active' ? SITES.active : SITES.restored)}</span>
}

export function RestorationBar({ live, clockMs }: { live: LiveIncident; clockMs: number }) {
  const { p, locale } = useT()
  const r = restoration(live, clockMs)
  if (!r || live.phase !== 'active') return null
  const text =
    r.phase === 'before'
      ? `${p(SITES.restoreIn)} ${formatDuration(r.open - clockMs, locale)} – ${formatDuration(r.close - clockMs, locale)}`
      : r.phase === 'open'
        ? `${p(SITES.restoreOpen)} ${formatDuration(r.close - clockMs, locale)}`
        : p(SITES.restorePast)
  return (
    <div className="mt-2" data-testid="etr-countdown">
      <div className="num text-[0.74rem] font-medium text-ink">{text}</div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full transition-[width] duration-700"
          style={{
            width: `${r.pct}%`,
            background: r.phase === 'past' ? 'var(--status-watch)' : 'var(--brand-secondary)',
          }}
        />
      </div>
    </div>
  )
}

export function IncidentCard({ live, selected, onSelect }: { live: LiveIncident; selected?: boolean; onSelect: () => void }) {
  const { pack, p, r, locale, rtl } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const inc = live.incident
  const site = pack.site(inc.siteId)
  const Chevron = rtl ? ChevronLeft : ChevronRight
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full rounded-2xl border p-3.5 text-start transition-colors hover:border-secondary hover:bg-surface ${selected ? 'border-secondary bg-surface' : 'border-line bg-white'}`}
      data-testid={`incident-${inc.id}`}
    >
      <div className="flex items-center gap-2">
        <StatusChip status={inc.severity} />
        <PhaseChip phase={live.phase} />
        <span className="num ms-auto truncate text-[0.72rem] text-muted" dir="ltr">
          {inc.id}
        </span>
      </div>
      <div className="mt-2 text-[0.98rem] font-semibold leading-snug text-ink">{p(inc.title)}</div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.8rem] text-muted">
        {site && <span>{pack.regionName(site.regionId, locale)}</span>}
        <span className="flex items-center gap-1">
          <Clock size={12} /> <span className="num">{formatTime(live.startedMs, locale)}</span>
          {live.phase === 'active' && <span className="num">· {formatDuration(clockMs - live.startedMs, locale)}</span>}
          {live.phase === 'restored' && live.resolvedMs && <span className="num">→ {formatTime(live.resolvedMs, locale)}</span>}
        </span>
        {inc.affected && inc.affected.value > 0 && (
          <span className={`num font-semibold ${live.phase === 'active' ? 'text-critical' : 'text-muted'}`}>
            {fmtNumber(inc.affected.value, locale)} {p(inc.affected.unit)}
          </span>
        )}
        <Chevron size={16} className="ms-auto text-muted group-hover:text-secondary" />
      </div>
      {inc.cause && (
        <div className="mt-1.5 line-clamp-2 text-[0.8rem] text-body">
          <span className="font-semibold" style={{ color: inc.causeConfirmed ? '#0a7a55' : '#8a6100' }}>
            {p(inc.causeConfirmed ? SITES.confirmed : SITES.suspected)}:{' '}
          </span>
          {r(inc.cause)}
        </div>
      )}
      <RestorationBar live={live} clockMs={clockMs} />
    </button>
  )
}

export function IncidentCards({ list, limit }: { list: LiveIncident[]; limit?: number }) {
  const { p } = useT()
  const selected = useDemo((s) => s.incidentId)
  if (!list.length) return <p className="py-6 text-center text-[0.9rem] text-muted">{p(SITES.noIncidents)}</p>
  const open = (l: LiveIncident) => {
    const st = useDemo.getState()
    st.selectIncident(l.incident.id)
    st.selectSite(l.incident.siteId)
  }
  return (
    <ul className="space-y-2.5" data-testid="incident-list">
      {list.slice(0, limit).map((l) => (
        <li key={l.incident.id}>
          <IncidentCard live={l} selected={selected === l.incident.id} onSelect={() => open(l)} />
        </li>
      ))}
    </ul>
  )
}
