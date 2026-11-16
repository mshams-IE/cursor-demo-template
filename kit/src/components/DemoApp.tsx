import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react'
import { PackContext, useT } from '../i18n'
import { definePack, type Pack } from '../pack'
import { useDemo } from '../store'
import type { DemoSpec } from '../types'
import { ExpertsView } from './ExpertsView'
import { IncidentList } from './IncidentList'
import { KpiRow } from './KpiRow'
import { PresenterBar } from './PresenterBar'
import { RegionMap } from './RegionMap'
import { ReportView } from './ReportView'
import { TopBar } from './TopBar'

export function OverviewView() {
  const { pack } = useT()
  return (
    <div className="space-y-4">
      <KpiRow />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <RegionMap sites={pack.spec.sites} height="30rem" />
        <IncidentList />
      </div>
    </div>
  )
}

function Footer() {
  const { t, pack } = useT()
  return (
    <footer className="no-print flex flex-wrap items-center justify-between gap-2 px-6 pb-24 pt-2 text-[0.76rem] text-muted">
      <span>{t('illustrative')}</span>
      <span className="font-semibold text-ink" data-testid="powered-by">
        {pack.spec.brand.coBrand ? t('poweredBy') : ''}
      </span>
    </footer>
  )
}

function Shell({ extra }: { extra?: ReactNode }) {
  const view = useDemo((s) => s.view)
  return (
    <div className="flex min-h-full flex-col">
      <TopBar />
      <main className="mx-auto w-full max-w-[110rem] flex-1 p-4 sm:p-6" data-testid={`view-${view}`}>
        {view === 'overview' && <OverviewView />}
        {view === 'report' && <ReportView />}
        {view === 'experts' && <ExpertsView />}
        {extra}
      </main>
      <Footer />
      <PresenterBar />
    </div>
  )
}

/** The whole standard demo. A demo repository renders this with its pack and nothing else. */
export function DemoApp({ spec, children }: { spec: DemoSpec | Pack; children?: ReactNode }) {
  const pack = useMemo(() => ('spec' in spec ? spec : definePack(spec)), [spec])
  const locale = useDemo((s) => s.locale)
  const scale = useDemo((s) => s.scale)
  const reduced = useDemo((s) => s.reducedMotion)
  useEffect(() => {
    const el = document.documentElement
    el.lang = locale
    el.dir = locale === 'ar' ? 'rtl' : 'ltr'
    el.dataset.reducedMotion = String(reduced)
    el.style.setProperty('--scale', String(scale))
    document.title = pack.spec.title[locale] ?? pack.spec.title.en
  }, [locale, reduced, scale, pack])
  useEffect(() => {
    if (!pack.bilingual && locale === 'ar') useDemo.getState().setLocale('en')
  }, [pack.bilingual, locale])
  const accent = pack.spec.brand.coBrand && pack.spec.customer.accent ? ({ '--brand-accent': pack.spec.customer.accent } as CSSProperties) : undefined
  return (
    <PackContext.Provider value={pack}>
      <div className="h-full" style={accent} data-testid="demo-app">
        <Shell extra={children} />
      </div>
    </PackContext.Provider>
  )
}
