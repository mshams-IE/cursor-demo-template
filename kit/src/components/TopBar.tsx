import { Clapperboard, Maximize, Type, Wind } from 'lucide-react'
import clouderaLogo from '../../assets/cloudera-logo.png'
import { useT } from '../i18n'
import { useDemo } from '../store'
import type { ViewId } from '../types'
import { Segmented } from './ui'

const SCALES = [1, 1.12, 1.25]

export function TopBar() {
  const { pack, t, p, locale } = useT()
  const s = useDemo()
  const { customer, brand, languages, clock } = pack.spec
  const coBrand = brand.coBrand && customer.logo
  return (
    <header className="no-print flex h-[5rem] shrink-0 items-center gap-3 border-b border-line bg-white px-4 sm:gap-5 sm:px-6" data-testid="top-bar">
      <img src={coBrand ? customer.logo : clouderaLogo} alt={coBrand ? p(customer.name) : 'Cloudera'} className={coBrand ? 'h-11 w-auto' : 'h-[1.35rem] w-auto'} data-testid="brand-logo" />
      <div className="me-auto hidden min-w-0 border-s border-line ps-4 leading-tight md:block">
        <h1 className="truncate text-[1.3rem] font-bold tracking-tight text-ink">{p(pack.spec.title)}</h1>
        <div className="truncate text-[0.84rem] text-muted">{p(pack.spec.subtitle)}</div>
      </div>
      <Segmented<ViewId>
        ariaLabel="view"
        value={s.view}
        onChange={s.setView}
        testid="view-switch"
        options={[
          { value: 'overview', label: t('overview') },
          { value: 'report', label: t('report') },
          { value: 'experts', label: t('experts') },
        ]}
      />
      <div className="hidden text-end leading-tight lg:block" data-testid="observed">
        <div className="num text-[1.15rem] font-bold text-ink">{clock.observedAt.slice(11, 16)}</div>
        <div className="text-[0.72rem] text-muted">
          {t('observed')} · {p(clock.zone)}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {languages.length > 1 && (
          <button type="button" className="btn btn-ghost !px-3" onClick={() => s.setLocale(locale === 'ar' ? 'en' : 'ar')} data-testid="lang-toggle" aria-label={t('language')}>
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
        )}
        <button type="button" className="btn btn-ghost hidden !px-3 md:inline-flex" onClick={() => s.setScale(SCALES[(SCALES.indexOf(s.scale) + 1) % SCALES.length])} title={t('textSize')} aria-label={t('textSize')}>
          <Type size={16} />
        </button>
        <button type="button" className="btn btn-ghost hidden !px-3 md:inline-flex" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())} title={t('fullscreen')} aria-label={t('fullscreen')}>
          <Maximize size={16} />
        </button>
        <button type="button" className={`btn hidden !px-3 md:inline-flex ${s.reducedMotion ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={s.reducedMotion} onClick={() => s.setReducedMotion(!s.reducedMotion)} title={t('reduceMotion')} aria-label={t('reduceMotion')}>
          <Wind size={16} />
        </button>
        <button type="button" className={`btn !px-3 ${s.presenterOpen ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={s.presenterOpen} onClick={() => s.setPresenterOpen(!s.presenterOpen)} title={t('presenter')} aria-label={t('presenter')} data-testid="presenter-toggle">
          <Clapperboard size={16} />
        </button>
      </div>
    </header>
  )
}
