import { Clock } from 'lucide-react'
import { Card, StatusChip } from '../components/ui'
import { ActionsList } from '../features/planning/ActionsList'
import { OptionRow } from '../features/planning/OptionRow'
import { BudgetCurve, RestorationCurve } from '../features/planning/PlanCharts'
import { PlanCard } from '../features/planning/PlanCard'
import { PlanControls } from '../features/planning/PlanControls'
import { S } from '../features/planning/strings'
import { usePlan } from '../features/planning/usePlan'
import { WhatIfCard } from '../features/planning/WhatIfCard'
import { useT } from '../i18n'
import { formatTime } from '../model/time'
import { fmtNumber } from '../pack'

export function PlanningPage() {
  const { pack, t, p, locale } = useT()
  const view = usePlan()
  const planning = pack.spec.planning
  const { ev, incidents } = view
  const header = (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[2rem] font-bold tracking-tight text-ink">{t('navPlanning')}</h1>
        {ev && incidents.length > 0 && (
          <p className="mt-0.5 text-[0.92rem] text-muted" data-testid="plan-subtitle">
            {incidents.map((i) => p(i.incident.title)).join(' · ')} — <span className="num">{fmtNumber(ev.total, locale)}</span> {p(planning?.benefit.unit)}
          </p>
        )}
      </div>
      {incidents.length > 0 && (
        <ul className="flex flex-wrap gap-2" data-testid="plan-incidents">
          {incidents.map((i) => {
            const site = pack.site(i.incident.siteId)
            return (
              <li key={i.incident.id} className="flex items-center gap-2.5 rounded-2xl border border-line bg-white px-3.5 py-2 text-[0.84rem] shadow-sm" data-testid={`plan-incident-${i.incident.id}`}>
                <StatusChip status={i.incident.severity} />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{site ? p(site.name) : p(i.incident.title)}</span>
                  <span className="flex flex-wrap gap-x-2 text-[0.76rem] text-muted">
                    {i.incident.affected && (
                      <span className="num">
                        {fmtNumber(i.incident.affected.value, locale)} {p(i.incident.affected.unit)}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <Clock size={11} /> {t('since')} <span className="num">{formatTime(i.startedMs, locale)}</span>
                    </span>
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </header>
  )

  if (!planning || !ev || !ev.options.length)
    return (
      <div className="space-y-5 p-6" data-testid="planning-page">
        {header}
        <p className="text-muted">{p(S.noIncidents)}</p>
      </div>
    )

  const excluded = ev.excluded.map((e) => ({ ...e, option: view.byId.get(e.optionId)! })).filter((e) => e.option)
  return (
    <div className="space-y-5 p-6" data-testid="planning-page">
      {header}
      <div className="grid items-start gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-4">
          <PlanControls planning={planning} />
        </div>
        <div className="min-w-0 space-y-5">
          <PlanCard view={view} />
          <WhatIfCard planning={planning} />
          <div className="grid gap-5 2xl:grid-cols-2">
            <RestorationCurve ev={ev} />
            <BudgetCurve ev={ev} />
          </div>
          <Card title={p(S.excludedTitle)} testid="plan-excluded">
            {excluded.length ? (
              <ul className="space-y-2">
                {excluded.map((e) => (
                  <OptionRow key={e.optionId} option={e.option} benefit={Math.round(ev.effective[e.optionId] ?? 0)} reason={e.reason} />
                ))}
              </ul>
            ) : (
              <p className="text-[0.88rem] text-muted">{p(S.noExcluded)}</p>
            )}
          </Card>
          <Card title={p(S.actions)}>
            <ActionsList />
          </Card>
        </div>
      </div>
    </div>
  )
}
