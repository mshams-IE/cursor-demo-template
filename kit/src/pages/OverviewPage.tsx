import { Card } from '../components/ui'
import { SiteMap } from '../features/map/SiteMap'
import { AlertBanners } from '../features/overview/AlertBanners'
import { LiveKpiRow } from '../features/overview/KpiTiles'
import { OVERVIEW } from '../features/overview/strings'
import { WatchList } from '../features/overview/WatchList'
import { ReportOverview } from '../features/report/ReportOverview'
import { IncidentCards, useWindowIncidents } from '../features/sites/IncidentCards'
import { SiteInvestigation } from '../features/sites/SiteInvestigation'
import { useT } from '../i18n'
import { formatTime } from '../model/time'
import { useDemo } from '../store'

function snapshotId(observedAt: string) {
  return observedAt.replace(/[-:]/g, '').replace('T', '-')
}

function ExpertsOverview() {
  const { pack, t, p, locale } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const regionId = useDemo((s) => s.regionId)
  const incidents = useWindowIncidents()
  const { clock, customer } = pack.spec
  const scope = regionId ? pack.regionName(regionId, locale) : p(customer.name)
  const scoped = regionId ? incidents.filter((i) => pack.site(i.incident.siteId)?.regionId === regionId) : incidents
  return (
    <div className="space-y-5 p-6" data-testid="page-overview">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,2.3vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink">{t('navOverview')}</h1>
          <p className="num mt-1 text-[1rem] text-muted" data-testid="overview-subline">
            {scope} · {formatTime(clockMs, locale, p(clock.zone))} · {p(clock.snapshotLabel) || t('snapshot')} {snapshotId(clock.observedAt)}
          </p>
        </div>
        <AlertBanners />
      </div>
      <LiveKpiRow />
      <SiteMap height="max(34rem, calc(100vh - 30rem))" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]" data-testid="overview-row">
        <Card title={p(OVERVIEW.priorityInsights)} className="flex min-h-0 flex-col">
          <div className="scroll-thin max-h-[36rem] min-h-[12rem] overflow-y-auto pe-1" data-testid="priority-insights">
            <IncidentCards list={scoped} limit={5} />
          </div>
        </Card>
        <Card title={`${p(OVERVIEW.watchList)} · ${t('sites')}`}>
          <WatchList />
        </Card>
      </div>
      <SiteInvestigation />
    </div>
  )
}

export function OverviewPage() {
  const mode = useDemo((s) => s.mode)
  return mode === 'report' ? <ReportOverview /> : <ExpertsOverview />
}
