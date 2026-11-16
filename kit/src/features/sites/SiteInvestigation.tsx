import { Bell, Eye, FileSearch, Lightbulb, MessageSquare, Search, Wrench, X, type LucideIcon } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Card, STATUS_VAR, StatusChip } from '../../components/ui'
import { useT } from '../../i18n'
import { incidentAt, siteAt } from '../../model/live'
import { formatHoursRange, formatTime, toMs } from '../../model/time'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import type { IncidentStep, Site } from '../../types'
import { PhaseChip, RestorationBar } from './IncidentCards'
import { MetricCard, MetricChart } from './MetricCharts'
import { inWindow } from './siteModel'
import { SITES } from './strings'

const STEP_ICON: Record<IncidentStep['kind'], LucideIcon> = {
  observation: Eye,
  detection: Bell,
  investigation: Search,
  recommendation: Lightbulb,
  response: Wrench,
}
const STEP_COLOR: Record<IncidentStep['kind'], string> = {
  observation: 'var(--muted)',
  detection: 'var(--status-critical)',
  investigation: 'var(--brand-secondary)',
  recommendation: 'var(--status-normal)',
  response: 'var(--brand-primary)',
}

/** The site report, opened whenever a site is selected on the map, in a list or by the presenter. */
export function SiteInvestigation() {
  const siteId = useDemo((s) => s.siteId)
  const { pack } = useT()
  const site = siteId ? pack.site(siteId) : undefined
  if (!site) return null
  return <InvestigationDialog key={site.id} site={site} />
}

function InvestigationDialog({ site }: { site: Site }) {
  const { pack, p, r, t, locale } = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const clockMs = useDemo((s) => s.clockMs)
  const timeWindow = useDemo((s) => s.window)
  const incidentId = useDemo((s) => s.incidentId)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  const live = siteAt(site, minute)
  const close = () => useDemo.getState().selectSite(undefined)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && useDemo.getState().selectSite(undefined)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const incidents = useMemo(
    () =>
      pack.spec.incidents
        .filter((i) => i.siteId === site.id)
        .map((i) => incidentAt(i, minute))
        .filter((i) => i.phase !== 'upcoming')
        .sort((a, b) => (a.phase === b.phase ? b.startedMs - a.startedMs : a.phase === 'active' ? -1 : 1)),
    [pack, site.id, minute],
  )
  const inc = incidents.find((i) => i.incident.id === incidentId) ?? incidents[0]
  const steps = inc ? inWindow(inc.incident.timeline, minute, timeWindow).sort((a, b) => toMs(a.at) - toMs(b.at)) : []
  const changes = inWindow(site.timeline, minute, timeWindow)
  const metrics = site.metrics ?? []
  const charted = metrics.filter((m) => (m.series?.length ?? 0) > 1)
  const expert = pack.spec.experts.find((e) => e.available !== false)

  const ask = () => {
    if (!expert) return
    close()
    navigate({
      pathname: `/experts/${expert.id}/chat`,
      search: location.search,
    })
  }

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-brand/40 p-4 backdrop-blur-[2px] md:p-8" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p(site.name)}
        className="fade-up flex h-full max-h-[min(60rem,94vh)] w-full max-w-[86rem] flex-col overflow-hidden rounded-[24px] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        data-testid="site-investigation"
      >
        <header className="flex flex-wrap items-start gap-3 border-b border-line px-6 py-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary to-brand text-white">
            <FileSearch size={22} />
          </div>
          <div className="me-auto min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-[1.5rem] font-semibold leading-tight tracking-tight text-ink">{p(site.name)}</h2>
              <StatusChip status={live.status} />
              {inc && inc.phase === 'active' && <PhaseChip phase="active" />}
            </div>
            <div className="num mt-0.5 flex flex-wrap gap-x-3 text-[0.82rem] text-muted">
              <span dir="ltr">{site.id}</span>
              <span>{pack.regionName(site.regionId, locale)}</span>
              <span>{pack.typeName(site.type, locale)}</span>
              {live.since && (
                <span>
                  {t('since')} {formatTime(live.since, locale)}
                </span>
              )}
              <span>
                {p(SITES.observed)} {formatTime(minute, locale)}
              </span>
              {inc && <span dir="ltr">{inc.incident.id}</span>}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {expert && (
              <button type="button" className="btn btn-primary" onClick={ask} data-testid="ask-about-site">
                <MessageSquare size={16} /> {p(SITES.askExpert)}
              </button>
            )}
            <button type="button" className="btn btn-ghost !px-2.5" onClick={close} aria-label={t('close')} data-testid="investigation-close">
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="scroll-thin min-h-0 flex-1 space-y-5 overflow-y-auto bg-surface/60 px-6 py-5">
          {live.note && (
            <div
              className="flex items-start gap-3 rounded-2xl border px-4 py-3 text-[0.92rem] leading-relaxed"
              style={{
                borderColor: STATUS_VAR[live.status],
                background: live.status === 'normal' ? '#fff' : `var(--status-${live.status}-soft)`,
              }}
              data-testid="investigation-note"
            >
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_VAR[live.status] }} />
              <span className="text-body">{r(live.note)}</span>
            </div>
          )}

          {metrics.length > 0 && (
            <Card title={p(SITES.readings)}>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-testid="investigation-metrics">
                {metrics.map((m) => (
                  <MetricCard key={m.id} m={m} clockMs={minute} />
                ))}
              </div>
            </Card>
          )}

          {inc ? (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card title={p(SITES.assessment)}>
                <div className="space-y-3 text-[0.92rem] leading-relaxed" data-testid="investigation-assessment">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusChip status={inc.incident.severity} />
                    <PhaseChip phase={inc.phase} />
                    <span className="font-semibold text-ink">{p(inc.incident.title)}</span>
                  </div>
                  <p className="text-body">{r(inc.incident.impact)}</p>
                  {inc.incident.affected && (
                    <div
                      className="num text-[1.6rem] font-semibold leading-tight"
                      style={{
                        color: inc.phase === 'active' ? STATUS_VAR.critical : 'var(--muted)',
                      }}
                      data-testid="investigation-affected"
                    >
                      {fmtNumber(inc.incident.affected.value, locale)} <span className="text-[0.95rem] font-medium">{p(inc.incident.affected.unit)}</span>
                    </div>
                  )}
                  {inc.incident.cause && (
                    <div>
                      <div
                        className="eyebrow mb-1"
                        style={{
                          color: inc.incident.causeConfirmed ? '#0a7a55' : '#8a6100',
                        }}
                      >
                        {p(inc.incident.causeConfirmed ? SITES.confirmed : SITES.suspected)}
                      </div>
                      <p className="font-medium text-ink">{r(inc.incident.cause)}</p>
                    </div>
                  )}
                  {(inc.incident.evidence?.length ?? 0) > 0 && (
                    <div>
                      <div className="eyebrow mb-1">{p(SITES.evidence)}</div>
                      <ul className="space-y-1" data-testid="investigation-evidence">
                        {inc.incident.evidence!.map((e, i) => (
                          <li key={i} className="flex gap-2 text-[0.86rem] text-body">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                            {r(e)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {inc.incident.restoreHours && (
                    <p className="text-[0.85rem] text-muted">
                      {p(SITES.restoreEstimate)}: <span className="num font-semibold text-ink">{formatHoursRange(inc.incident.restoreHours, locale)}</span> {p(SITES.fromDetection)}
                      {inc.phase === 'restored' && inc.resolvedMs && (
                        <>
                          {' · '}
                          {p(SITES.restoredAt)} <span className="num font-semibold text-ink">{formatTime(inc.resolvedMs, locale)}</span>
                        </>
                      )}
                    </p>
                  )}
                  <RestorationBar live={inc} clockMs={minute} />
                </div>
              </Card>
              <Card title={p(SITES.incidentTimeline)}>
                {steps.length ? (
                  <ol className="relative space-y-3 border-s-2 border-line ps-5" data-testid="investigation-steps">
                    {steps.map((e, i) => {
                      const Icon = STEP_ICON[e.kind]
                      return (
                        <li key={i} className="relative">
                          <span className="absolute -start-[2.05rem] top-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-white" style={{ background: STEP_COLOR[e.kind] }}>
                            <Icon size={12} />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-2 text-[0.75rem]">
                            <span className="eyebrow !text-[0.7rem]">{p(SITES[e.kind])}</span>
                            <span className="num text-muted">{formatTime(toMs(e.at), locale)}</span>
                          </div>
                          <div className="text-[0.9rem] text-body">{r(e.text)}</div>
                        </li>
                      )
                    })}
                  </ol>
                ) : (
                  <p className="text-[0.85rem] text-muted">{p(SITES.noChanges)}</p>
                )}
              </Card>
            </div>
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-3 text-[0.88rem] text-muted">{p(SITES.noIncidentHere)}</p>
          )}

          {charted.length > 0 && (
            <Card title={p(SITES.trends)}>
              <div className="grid gap-5 lg:grid-cols-2" data-testid="investigation-charts">
                {charted.map((m) => (
                  <MetricChart key={m.id} m={m} clockMs={minute} />
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-5 xl:grid-cols-2">
            {(site.details?.length ?? 0) > 0 && (
              <Card title={p(SITES.details)}>
                <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[0.88rem] sm:grid-cols-2" data-testid="investigation-details">
                  {site.details!.map((d, i) => (
                    <div key={i} className="flex justify-between gap-3 border-b border-line/60 py-1.5">
                      <dt className="text-muted">{p(d.label)}</dt>
                      <dd className="text-end font-medium text-ink">{p(d.value)}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}
            <Card title={p(SITES.statusTimeline)}>
              <ol className="space-y-2.5" data-testid="investigation-timeline">
                <li className="flex items-start gap-3 text-[0.86rem]">
                  <span
                    className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      background: STATUS_VAR[changes.length ? siteBefore(site, changes[0].at) : live.status],
                    }}
                  />
                  <div>
                    <div className="num text-[0.75rem] text-muted">{p(SITES.dayStart)}</div>
                    <div className="text-body">{r(changes.length ? noteBefore(site, changes[0].at) : live.note) || <StatusChip status={live.status} />}</div>
                  </div>
                </li>
                {changes.map((c, i) => (
                  <li key={i} className="flex items-start gap-3 text-[0.86rem]">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_VAR[c.status] }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="num text-[0.75rem] text-muted">{formatTime(toMs(c.at), locale)}</span>
                        <StatusChip status={c.status} />
                      </div>
                      {c.note && <div className="mt-0.5 text-body">{r(c.note)}</div>}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function siteBefore(site: Site, at: string) {
  return siteAt(site, toMs(at) - 1).status
}
function noteBefore(site: Site, at: string) {
  return siteAt(site, toMs(at) - 1).note
}
