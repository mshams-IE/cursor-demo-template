import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from '../app/Shell'
import { PackContext, useT } from '../i18n'
import { definePack, type Pack } from '../pack'
import { ArchitecturePage } from '../pages/ArchitecturePage'
import { BriefsPage } from '../pages/BriefsPage'
import { CommandWall } from '../pages/CommandWall'
import { ExecutivePack } from '../pages/ExecutivePack'
import { ExpertIntro } from '../pages/ExpertIntro'
import { ExpertsHome } from '../pages/ExpertsHome'
import { ExpertWorkspace } from '../pages/ExpertWorkspace'
import { OverviewPage } from '../pages/OverviewPage'
import { PlanningPage } from '../pages/PlanningPage'
import { SitesPage } from '../pages/SitesPage'
import { useDemo } from '../store'
import type { DemoSpec } from '../types'
import { IncidentList } from './IncidentList'
import { KpiRow } from './KpiRow'
import { OrganisationView } from './GroupGrid'

export function OverviewView() {
  const { pack } = useT()
  return (
    <div className="space-y-4">
      <KpiRow />
      <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
        <OrganisationView sites={pack.spec.sites} height="30rem" />
        <IncidentList />
      </div>
    </div>
  )
}

/** Old ?view= links open the matching page. */
function legacyPath() {
  const q = new URLSearchParams(globalThis.location?.hash.split('?')[1] ?? globalThis.location?.search ?? '')
  const view = q.get('view')
  if (view === 'report') useDemo.getState().setMode('report')
  return view === 'experts' ? '/' : view === 'overview' || view === 'report' ? '/overview' : undefined
}

function Routed() {
  const [legacy] = useState(legacyPath)
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={legacy && legacy !== '/' ? <Navigate to={legacy} replace /> : <ExpertsHome />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="experts/:expertId" element={<ExpertIntro />} />
          <Route path="experts/:expertId/chat" element={<ExpertWorkspace />} />
          <Route path="sites" element={<SitesPage />} />
          <Route path="planning" element={<PlanningPage />} />
          <Route path="briefs" element={<BriefsPage />} />
          <Route path="architecture" element={<ArchitecturePage />} />
          <Route path="wall" element={<CommandWall />} />
          <Route path="pack" element={<ExecutivePack />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

/** The whole standard demo. A demo repository renders this with its pack and nothing else. */
export function DemoApp({ spec }: { spec: DemoSpec | Pack }) {
  const pack = useMemo(() => ('spec' in spec ? spec : definePack(spec)), [spec])
  const [ready, setReady] = useState(false)
  const locale = useDemo((s) => s.locale)
  const scale = useDemo((s) => s.scale)
  const reduced = useDemo((s) => s.reducedMotion)
  useEffect(() => {
    useDemo.getState().initPack(pack.spec)
    setReady(true)
  }, [pack])
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
        {ready && <Routed />}
      </div>
    </PackContext.Provider>
  )
}
