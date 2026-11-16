import { useMemo } from 'react'
import { Card } from '../components/ui'
import { SiteMap } from '../features/map/SiteMap'
import { IncidentCards, useWindowIncidents } from '../features/sites/IncidentCards'
import { SiteFilters } from '../features/sites/SiteFilters'
import { SiteInvestigation } from '../features/sites/SiteInvestigation'
import { useFilteredSites, SiteTable } from '../features/sites/SiteTable'
import { SITES } from '../features/sites/strings'
import { useT } from '../i18n'
import { fmtNumber } from '../pack'

export function SitesPage() {
  const { t, p, locale, pack } = useT()
  const rows = useFilteredSites()
  const incidents = useWindowIncidents()
  const shown = useMemo(() => new Set(rows.map((l) => l.site.id)), [rows])
  const scoped = incidents.filter((i) => shown.has(i.incident.siteId))
  return (
    <div className="space-y-5 p-6" data-testid="sites-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.9rem,2.3vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink">{t('navSites')}</h1>
          <p className="mt-1 text-[1rem] text-muted">{p(SITES.pickHint)}</p>
        </div>
      </div>
      <SiteFilters />
      <div className="grid gap-5 2xl:grid-cols-[22rem_minmax(0,1fr)]">
        <Card
          title={
            <h2 className="section-title">
              {p(SITES.incidentsTitle)} <span className="num ms-1 text-[0.85rem] font-medium text-muted">{fmtNumber(scoped.length, locale)}</span>
            </h2>
          }
          className="flex min-h-0 flex-col 2xl:h-[36rem]"
        >
          <div className="scroll-thin max-h-[30rem] min-h-0 flex-1 overflow-y-auto pe-1 2xl:max-h-none">
            <IncidentCards list={scoped} />
          </div>
        </Card>
        <SiteMap height="36rem" compact />
      </div>
      <Card
        title={
          <h2 className="section-title">
            {p(SITES.register)}{' '}
            <span className="num ms-1 text-[0.85rem] font-medium text-muted">
              {fmtNumber(rows.length, locale)} {t('ofTotal')} {fmtNumber(pack.spec.sites.length, locale)} {t('sitesShown')}
            </span>
          </h2>
        }
      >
        <SiteTable rows={rows} />
      </Card>
      <SiteInvestigation />
    </div>
  )
}
