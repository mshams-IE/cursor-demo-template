import { Clock } from 'lucide-react'
import { OrganisationView } from '../../components/GroupGrid'
import { STATUS_SOFT, STATUS_VAR } from '../../components/ui'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import { activeIncidents, kpisAt, type LiveKpi } from '../../model/live'
import { formatTime } from '../../model/time'
import { useDemo } from '../../store'
import type { Expert } from '../../types'
import { teamOf } from './catalog'
import { S } from './strings'

const TONE: Record<LiveKpi['tone'], string> = { critical: 'var(--status-critical)', watch: '#8a6100', positive: 'var(--status-normal)', neutral: 'var(--ink)' }

/** What the expert is looking at: key figures, the active incidents and the scope at the clock. */
export function ContextPanel({ expert }: { expert: Expert }) {
  const { pack, p, sev, t, locale } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const regionId = useDemo((s) => s.regionId)
  const siteId = useDemo((s) => s.siteId)
  const selectSite = useDemo((s) => s.selectSite)
  const selectIncident = useDemo((s) => s.selectIncident)
  const report = useDemo((s) => s.mode === 'report')
  const kpis = kpisAt(pack, clockMs).slice(0, 3)
  const incidents = activeIncidents(pack.spec, clockMs).slice(0, 4)
  const site = siteId ? pack.site(siteId) : undefined
  const team = teamOf(pack.spec, expert)
  return (
    <aside className="scroll-thin hidden w-[26rem] shrink-0 flex-col gap-4 overflow-y-auto border-s border-line bg-white p-5 lg:flex" data-testid="context-panel" aria-label={p(S.context)}>
      {kpis.length > 0 && (
        <div data-testid="context-kpis">
          <div className="eyebrow mb-2">{p(S.keyFigures)}</div>
          <div className="grid grid-cols-3 gap-2">
            {kpis.map((k) => (
              <div key={k.kpi.id} className="rounded-2xl bg-surface px-3 py-2.5" title={p(k.kpi.definition)}>
                <div className="num text-[1.35rem] font-semibold" style={{ color: TONE[k.tone] }}>
                  {fmtNumber(k.value, locale, k.kpi.kind === 'count' ? 0 : (k.kpi.decimals ?? 0))}
                  {k.kpi.kind === 'percent' ? '%' : ''}
                </div>
                <div className="text-[0.72rem] leading-tight text-muted">
                  {p(k.kpi.label)}
                  {k.kpi.kind === 'count' && k.of !== undefined && (
                    <span className="num">
                      {' '}
                      · {t('ofTotal')} {fmtNumber(k.of, locale)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!report && pack.spec.sites.length > 0 && (
        <div className="shrink-0 overflow-hidden rounded-2xl [&_[data-testid=map-legend]]:hidden" data-testid="context-map">
          <OrganisationView sites={pack.spec.sites} height="14rem" />
        </div>
      )}
      <div data-testid="context-incidents">
        <div className="eyebrow mb-2">{p(S.activeIncidents)}</div>
        {incidents.length === 0 && <p className="text-[0.85rem] text-muted">{p(S.noIncidents)}</p>}
        <ul className="space-y-2">
          {incidents.map(({ incident: i, startedMs }) => {
            const s = pack.site(i.siteId)
            return (
              <li key={i.id}>
                <button
                  type="button"
                  className="w-full rounded-2xl border border-line bg-white p-3 text-start transition hover:border-secondary"
                  onClick={() => {
                    selectIncident(i.id)
                    selectSite(i.siteId)
                  }}
                  data-testid={`context-incident-${i.id}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="chip" style={{ background: STATUS_SOFT[i.severity], color: i.severity === 'watch' ? '#8a6100' : STATUS_VAR[i.severity] }}>
                      {sev(i.severity)}
                    </span>
                    <span className="num text-[0.7rem] text-muted">{i.id}</span>
                  </div>
                  <div className="mt-1.5 text-[0.9rem] font-semibold leading-snug text-ink">{p(i.title)}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-muted">
                    {s && <span>{pack.regionName(s.regionId, locale)}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} aria-hidden />
                      <span className="num">{formatTime(startedMs, locale)}</span>
                    </span>
                    {i.affected && (
                      <span className="font-semibold text-critical">
                        <span className="num">{fmtNumber(i.affected.value, locale)}</span> {p(i.affected.unit)}
                      </span>
                    )}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
      <div className="rounded-2xl bg-surface p-4 text-[0.85rem]" data-testid="context-scope">
        <div className="eyebrow mb-2">{p(S.scope)}</div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted">{p(S.location)}</dt>
          <dd className="font-medium">{site ? p(site.name) : regionId ? pack.regionName(regionId, locale) : p(S.whole)}</dd>
          <dt className="text-muted">{p(S.time)}</dt>
          <dd className="num font-medium">{formatTime(clockMs, locale)}</dd>
          <dt className="text-muted">{p(S.expert)}</dt>
          <dd className="font-medium">
            {p(expert.name)} · {p(expert.role)}
          </dd>
          {!report && team.length > 0 && (
            <>
              <dt className="text-muted">{p(S.team)}</dt>
              <dd className="font-medium">{team.map((s) => p(s.name)).join(locale === 'ar' ? '، ' : ', ')}</dd>
            </>
          )}
        </dl>
      </div>
    </aside>
  )
}
