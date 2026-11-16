import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom'
import { PresenterBar } from '../components/PresenterBar'
import { SideDock } from '../features/dock/SideDock'
import { useT } from '../i18n'
import { useDemo } from '../store'
import { FULLSCREEN, homePath, visiblePages } from './pages'
import { TopBar } from './TopBar'

function useClockTicker() {
  const playing = useDemo((s) => s.clockPlaying)
  const speed = useDemo((s) => s.clockSpeed)
  const live = useDemo((s) => s.clockLive)
  useEffect(() => {
    if (!live) return
    useDemo.getState().tickLive()
    const id = setInterval(() => useDemo.getState().tickLive(), 1000)
    return () => clearInterval(id)
  }, [live])
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const id = setInterval(() => {
      const now = performance.now()
      const s = useDemo.getState()
      const next = s.clockMs + (now - last) * speed
      last = now
      if (next >= s.replay.end) {
        s.setClock(s.replay.end)
        s.setClockPlaying(false)
      } else s.setClock(next)
    }, 200)
    return () => clearInterval(id)
  }, [playing, speed])
}

export function Toast() {
  const toast = useDemo((s) => s.toast)
  const { p } = useT()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!toast) return
    setVisible(true)
    const id = setTimeout(() => setVisible(false), 3600)
    return () => clearTimeout(id)
  }, [toast])
  if (!toast || !visible) return null
  return (
    <div role="status" className="fade-up fixed top-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-brand px-6 py-3 text-[0.95rem] font-medium text-white shadow-xl" data-testid="toast">
      {p(toast.text)}
    </div>
  )
}

/** Pages that have their own full-width layout and no expert dock beside them. */
const NO_DOCK = ['/', '/overview', '/architecture']

export function Shell() {
  const { t, pack } = useT()
  const location = useLocation()
  const mode = useDemo((s) => s.mode)
  const pages = visiblePages(pack, mode)
  const path = location.pathname
  useClockTicker()

  const allowed = path.startsWith('/experts/') ? pack.spec.experts.length > 0 : FULLSCREEN.includes(path) || pages.some((p) => p.path === path)
  if (!allowed)
    return (
      <>
        <Navigate to={{ pathname: homePath(pack), search: location.search }} replace />
        <PresenterBar />
      </>
    )

  if (FULLSCREEN.includes(path))
    return (
      <div className="h-full">
        <Outlet />
        <PresenterBar />
        <Toast />
      </div>
    )

  const dock = mode === 'experts' && pack.spec.experts.length > 0 && !NO_DOCK.includes(path) && !path.startsWith('/experts')
  return (
    <div className="flex h-full flex-col bg-surface text-ink">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <nav className="no-print hidden w-[7rem] shrink-0 flex-col items-stretch gap-1 bg-brand px-2 py-4 text-white lg:flex" aria-label="primary" data-testid="side-nav">
          {pages.map(({ path: to, label, icon: Icon, id }) => (
            <NavLink
              key={to}
              to={{ pathname: to, search: location.search }}
              end={to === '/'}
              data-testid={`nav-${id}`}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1.5 rounded-xl px-1 py-3 text-center text-[0.74rem] font-medium leading-tight transition-colors ${isActive || (id === 'experts' && path.startsWith('/experts')) ? 'bg-white/14 text-white shadow-inner' : 'text-white/70 hover:bg-white/8 hover:text-white'}`
              }
            >
              <Icon size={24} strokeWidth={1.8} />
              {t(label)}
            </NavLink>
          ))}
          <div className="mt-auto px-1 text-center text-[0.62rem] leading-tight text-white/55" dir="ltr" data-testid="powered-by">
            {t('poweredBy')}
          </div>
        </nav>
        <main className="scroll-thin min-w-0 flex-1 overflow-y-auto pb-20 lg:pb-0" id="main" data-testid={`page-${pages.find((p) => p.path === path)?.id ?? (path.startsWith('/experts') ? 'expert' : 'other')}`}>
          <Outlet />
        </main>
        {dock && <SideDock />}
      </div>
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex justify-around border-t border-line bg-white py-1.5 lg:hidden" aria-label="primary mobile">
        {pages.map(({ path: to, label, icon: Icon }) => (
          <NavLink key={to} to={{ pathname: to, search: location.search }} end={to === '/'} className={({ isActive }) => `flex flex-col items-center gap-0.5 px-2 py-1 text-[0.65rem] ${isActive ? 'text-secondary' : 'text-muted'}`}>
            <Icon size={20} />
            {t(label)}
          </NavLink>
        ))}
      </nav>
      <PresenterBar />
      <Toast />
    </div>
  )
}
