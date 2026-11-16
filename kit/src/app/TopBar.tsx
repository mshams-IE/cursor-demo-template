import { Clapperboard, FileStack, Maximize, Minimize, MonitorPlay, Pause, Play, RotateCcw, Type, Wind } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import clouderaLogo from '../../assets/cloudera-logo.png'
import { Segmented } from '../components/ui'
import { useT } from '../i18n'
import { formatDate, formatTime, toMs, type TimeWindow } from '../model/time'
import { useDemo, type Mode } from '../store'

const SCALES = [1, 1.12, 1.25]

function ClockControl() {
  const { t, p, locale, pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const playing = useDemo((s) => s.clockPlaying)
  const speed = useDemo((s) => s.clockSpeed)
  const live = useDemo((s) => s.clockLive)
  const { start, end } = useDemo((s) => s.replay)
  const s = useDemo.getState()
  const snapshotMs = toMs(pack.spec.clock.observedAt)
  const atSnapshot = Math.abs(clockMs - snapshotMs) < 60_000
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-line bg-surface px-2 py-1.5 sm:gap-3 sm:px-3" data-testid="clock">
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary-bright disabled:opacity-40"
        aria-label={playing ? t('pause') : t('play')}
        disabled={live}
        onClick={() => {
          if (!playing && clockMs >= end) s.setClock(start)
          s.setClockPlaying(!playing)
        }}
        data-testid="clock-play"
      >
        {playing ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <div className="whitespace-nowrap leading-tight">
        <div className="num text-[1.35rem] font-semibold tracking-tight text-ink" data-testid="clock-time">
          {formatTime(clockMs, locale)} <span className="text-[0.8rem] font-medium text-muted">{p(pack.spec.clock.zone)}</span>
        </div>
        <div className="hidden whitespace-nowrap text-[0.72rem] text-muted sm:block" data-testid="observed">
          <span className="hidden min-[2200px]:inline">{formatDate(clockMs, locale)} · </span>{live ? t('realTime') : playing ? t('replay') : pack.spec.clock.snapshotLabel ? p(pack.spec.clock.snapshotLabel) : t('snapshot')}
        </div>
      </div>
      <input
        type="range"
        min={start}
        max={end}
        step={60_000}
        value={clockMs}
        disabled={live}
        onChange={(e) => s.setClock(Number(e.target.value))}
        aria-label={t('replay')}
        className="hidden w-36 accent-[var(--brand-secondary)] min-[2200px]:block"
        dir="ltr"
        data-testid="clock-slider"
      />
      <select value={speed} onChange={(e) => s.setClockSpeed(Number(e.target.value))} className="hidden rounded-md bg-transparent text-[0.8rem] text-muted min-[2200px]:block" aria-label={t('speed')} disabled={live}>
        {[60, 120, 300, 600].map((v) => (
          <option key={v} value={v}>
            ×{v}
          </option>
        ))}
      </select>
      <div className="seg hidden !text-[0.72rem] lg:flex" role="group" aria-label={t('realTimeHint')} title={t('realTimeHint')}>
        <button type="button" aria-pressed={live} onClick={() => !live && s.setClockLive(true)} data-testid="clock-live">
          {t('realTime')}
        </button>
        <button type="button" aria-pressed={!live} onClick={() => live && s.setClockLive(false)} data-testid="clock-replay">
          {t('replay')}
        </button>
      </div>
      {!atSnapshot && !live && (
        <button
          type="button"
          onClick={() => {
            s.setClockPlaying(false)
            s.setClock(snapshotMs)
          }}
          className="text-muted hover:text-secondary"
          aria-label={t('resetClock')}
          title={t('resetClock')}
          data-testid="clock-reset"
        >
          <RotateCcw size={16} />
        </button>
      )}
    </div>
  )
}

export function TopBar() {
  const { pack, t, p, locale } = useT()
  const s = useDemo()
  const navigate = useNavigate()
  const [fs, setFs] = useState(false)
  useEffect(() => {
    const on = () => setFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const { customer, brand, languages } = pack.spec
  const coBrand = brand.coBrand && customer.logo
  const report = s.mode === 'report'
  const hasExperts = pack.spec.experts.length > 0
  const go = (path: string) => navigate({ pathname: path, search: globalThis.location.hash.split('?')[1] ?? '' })
  return (
    <header className="no-print flex h-[5.2rem] shrink-0 items-center gap-2 border-b border-line bg-white px-3 sm:gap-4 sm:px-5" data-testid="top-bar">
      <img src={coBrand ? customer.logo : clouderaLogo} alt={coBrand ? p(customer.name) : 'Cloudera'} className={coBrand ? 'h-[2.6rem] w-auto sm:h-[3.2rem]' : 'h-[1.1rem] w-auto'} data-testid="brand-logo" />
      <div className="me-auto hidden min-w-[9rem] flex-1 border-s border-line ps-4 leading-tight sm:block">
        <h1 className="truncate text-[1.4rem] font-bold tracking-tight text-ink">{p(pack.spec.title)}</h1>
        <div className="truncate text-[0.85rem] text-muted">{p(pack.spec.subtitle)}</div>
      </div>
      {hasExperts && (
        <Segmented<Mode>
          ariaLabel={t('mode')}
          value={s.mode}
          onChange={s.setMode}
          testid="mode-switch"
          options={[
            { value: 'report', label: t('modeReport') },
            { value: 'experts', label: t('modeExperts') },
          ]}
        />
      )}
      <div className={report ? 'hidden' : 'hidden lg:block'}>
        <Segmented<TimeWindow>
          ariaLabel={t('timeWindow')}
          value={s.window}
          onChange={s.setWindow}
          testid="window-switch"
          options={[
            { value: 'today', label: t('windowToday') },
            { value: '6h', label: t('window6h') },
            { value: '24h', label: t('window24h') },
          ]}
        />
      </div>
      <ClockControl />
      <div className="flex items-center gap-1.5">
        {languages.length > 1 && (
          <button type="button" className="btn btn-ghost !px-3" onClick={() => s.setLocale(locale === 'ar' ? 'en' : 'ar')} data-testid="lang-toggle" aria-label={t('language')}>
            {locale === 'ar' ? 'EN' : 'ع'}
          </button>
        )}
        <button type="button" className="btn btn-ghost hidden !px-3 md:inline-flex" onClick={() => s.setScale(SCALES[(SCALES.indexOf(s.scale) + 1) % SCALES.length])} title={t('textSize')} aria-label={t('textSize')}>
          <Type size={16} />
          <span className="num hidden text-[0.75rem] min-[2200px]:inline">{Math.round(s.scale * 100)}%</span>
        </button>
        <button type="button" className="btn btn-ghost hidden !px-3 md:inline-flex" title={t('fullscreen')} aria-label={t('fullscreen')} onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>
          {fs ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
        <button type="button" className={`btn hidden !px-3 md:inline-flex ${s.reducedMotion ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={s.reducedMotion} onClick={() => s.setReducedMotion(!s.reducedMotion)} title={t('reduceMotion')} aria-label={t('reduceMotion')} data-testid="motion-toggle">
          <Wind size={16} />
        </button>
        <button type="button" className={`btn btn-ghost hidden !px-3 ${report ? '' : 'md:inline-flex'}`} title={t('commandWall')} aria-label={t('commandWall')} onClick={() => go('/wall')} data-testid="wall-toggle">
          <MonitorPlay size={16} />
        </button>
        <button type="button" className={`btn btn-ghost hidden !px-3 ${report ? '' : 'xl:inline-flex'}`} title={t('executivePack')} aria-label={t('executivePack')} onClick={() => go('/pack')} data-testid="pack-toggle">
          <FileStack size={16} />
        </button>
        <button type="button" className={`btn !px-3 ${s.presenterOpen ? 'btn-primary' : 'btn-ghost'}`} aria-pressed={s.presenterOpen} onClick={() => s.setPresenterOpen(!s.presenterOpen)} title={t('presenter')} aria-label={t('presenter')} data-testid="presenter-toggle">
          <Clapperboard size={16} />
        </button>
      </div>
    </header>
  )
}
