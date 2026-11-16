import { AlertTriangle, Clock } from 'lucide-react'
import { useMemo } from 'react'
import { CountUp, StatusChip, STATUS_VAR } from '../../components/ui'
import { useT } from '../../i18n'
import { activeIncidents, alertsAt, type LiveKpi } from '../../model/live'
import { formatDuration, formatHoursRange, formatTime, HOUR, toMs } from '../../model/time'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import { W } from './strings'

const TONE: Record<LiveKpi['tone'], string> = {
  critical: '#ff7a6e',
  watch: 'var(--status-watch)',
  positive: 'var(--status-normal)',
  neutral: '#ffffff',
}

export function WallKpi({ k }: { k: LiveKpi }) {
  const { p, locale } = useT()
  const kpi = k.kpi
  const decimals = kpi.kind === 'count' ? 0 : (kpi.decimals ?? 0)
  const suffix = kpi.kind === 'percent' ? '%' : ''
  const sub = kpi.kind === 'count' ? `${locale === 'ar' ? 'من' : 'of'} ${fmtNumber(k.of ?? 0, locale)} ${p(kpi.unit)}` : p(kpi.unit)
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4" data-testid="wall-kpi">
      <div className="truncate text-[0.95rem] text-white/70">{p(kpi.label)}</div>
      <div className="num mt-1 text-[3.2rem] font-bold leading-none tracking-tight" style={{ color: TONE[k.tone] }}>
        <CountUp value={k.value} format={(n) => `${fmtNumber(n, locale, decimals)}${suffix}`} />
      </div>
      <div className="mt-1.5 truncate text-[0.88rem] text-white/60">{sub}</div>
    </div>
  )
}

export function WallIncidents({ minute }: { minute: number }) {
  const { pack, p, r, locale } = useT()
  const selectRegion = useDemo((s) => s.selectRegion)
  const list = activeIncidents(pack.spec, minute)
  if (!list.length) return <p className="text-[0.9rem] text-muted">{p(W.noIncidents)}</p>
  return (
    <ul className="space-y-2.5" data-testid="wall-incidents">
      {list.map(({ incident: i, startedMs }) => {
        const site = pack.site(i.siteId)
        const elapsed = minute - startedMs
        const est = i.restoreHours
        const progress = est ? Math.min(1, elapsed / (est[1] * HOUR)) : undefined
        return (
          <li key={i.id}>
            <button type="button" onClick={() => site && selectRegion(site.regionId)} className="w-full rounded-2xl border border-line p-3.5 text-start transition-colors hover:bg-surface" data-testid={`wall-incident-${i.id}`}>
              <div className="flex items-center gap-2">
                <StatusChip status={i.severity} />
                <span className="chip bg-surface-2 text-secondary">{p(W.active)}</span>
              </div>
              <div className="mt-1.5 font-bold leading-snug text-ink">{p(i.title)}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2.5 text-[0.8rem] text-muted">
                {site && <span>{pack.regionName(site.regionId, locale)}</span>}
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} /> <span className="num">{formatTime(startedMs, locale)}</span> · {formatDuration(elapsed, locale)}
                </span>
                {i.affected && (
                  <span className="num font-semibold text-critical">
                    {fmtNumber(i.affected.value, locale)} {p(i.affected.unit)}
                  </span>
                )}
              </div>
              {!i.affected && <div className="mt-1 line-clamp-2 text-[0.8rem] text-body">{r(i.impact)}</div>}
              {est && (
                <>
                  <div className="mt-1.5 text-[0.74rem] font-medium text-ink">
                    {p(W.restoreIn)}: <span className="num">{formatHoursRange(est, locale)}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2" dir="ltr">
                    <div className="h-full rounded-full bg-secondary" style={{ width: `${Math.max(3, (progress ?? 0) * 100)}%` }} />
                  </div>
                </>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function WallAlerts({ minute }: { minute: number }) {
  const { pack, p, r, locale } = useT()
  const list = alertsAt(pack.spec, minute)
  if (!list.length) return <p className="text-[0.88rem] text-muted">{p(W.noAlerts)}</p>
  return (
    <ul className="space-y-2.5" data-testid="wall-alerts">
      {list.map((a) => (
        <li key={a.id} className="flex gap-2.5 text-[0.84rem]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" style={{ color: STATUS_VAR[a.severity] }} />
          <div className="min-w-0">
            <div className="font-semibold text-ink">{p(a.title)}</div>
            <div className="line-clamp-2 text-muted">{r(a.text)}</div>
            <div className="num text-[0.72rem] text-muted">
              {formatTime(toMs(a.from), locale)}
              {a.to ? ` – ${formatTime(toMs(a.to), locale)}` : ''}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export function Ticker({ minute }: { minute: number }) {
  const { pack, p, r, locale } = useT()
  const items = useMemo(
    () =>
      pack.spec.incidents
        .flatMap((inc) => [{ at: toMs(inc.started), text: inc.title, inc }, ...(inc.timeline ?? []).map((s) => ({ at: toMs(s.at), text: s.text, inc }))])
        .filter((x) => x.at <= minute && x.at > minute - 24 * HOUR)
        .sort((a, b) => b.at - a.at)
        .slice(0, 10),
    [pack, minute],
  )
  if (!items.length) return null
  const row = (copy: number) =>
    items.map((x, k) => (
      <span key={`${copy}-${x.inc.id}-${k}`} className="inline-flex items-center gap-2 pe-12" aria-hidden={copy > 0 || undefined}>
        <span className="num font-semibold text-cyan">{formatTime(x.at, locale)}</span>
        <span className="font-medium text-white/90">{p(pack.site(x.inc.siteId)?.name)}</span>
        <span className="text-white/65">{r(x.text)}</span>
      </span>
    ))
  return (
    <div className="overflow-hidden whitespace-nowrap border-t border-white/10 bg-black/25 py-3 text-[1rem]" data-testid="wall-ticker">
      <div className={`ticker inline-flex ${locale === 'ar' ? 'ticker-rtl' : ''}`}>
        {row(0)}
        {row(1)}
      </div>
    </div>
  )
}
