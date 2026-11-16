import { ChevronLeft, ChevronRight, ClipboardList, ListOrdered, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { homePath } from '../app/pages'
import { applyBeat, beatMs, storiesOf } from '../features/presenter/story'
import { S } from '../features/presenter/strings'
import { useT } from '../i18n'
import { prefersReducedMotion } from './ui'
import { useDemo } from '../store'

function Spotlight({ testid }: { testid?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    setRect(null)
    if (!testid) return
    let raf = 0
    let last = ''
    let shown = false
    const poll = () => {
      const el = document.querySelector(`[data-testid="${testid}"]`)
      const r = el?.getBoundingClientRect()
      if (el && r && r.width > 0 && !shown) {
        shown = true
        if (r.top < 0 || r.bottom > innerHeight - 120) el.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      }
      const key = r ? `${r.x},${r.y},${r.width},${r.height}` : ''
      if (key !== last) {
        last = key
        setRect(r && r.width > 0 ? r : null)
      }
      raf = requestAnimationFrame(poll)
    }
    const start = setTimeout(() => (raf = requestAnimationFrame(poll)), 300)
    return () => {
      clearTimeout(start)
      cancelAnimationFrame(raf)
    }
  }, [testid])
  if (!rect) return null
  const pad = 8
  return createPortal(
    <div className="spotlight pointer-events-none fixed z-[76] rounded-[20px]" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} data-testid="presenter-spotlight" />,
    document.body,
  )
}

const typing = (el: EventTarget | null) => {
  const e = el as HTMLElement | null
  return !!e && (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.tagName) || e.isContentEditable)
}

/** Teleprompter: story picker, beats with narration, auto-advance and a spotlight on what each beat talks about. */
export function PresenterBar() {
  const { pack, p, r, t, rtl, locale } = useT()
  const open = useDemo((s) => s.presenterOpen)
  const navigate = useNavigate()
  const { search, pathname } = useLocation()
  const pendingReport = useRef<string | undefined>(undefined)
  const stories = useMemo(() => storiesOf(pack.spec), [pack.spec])
  const [storyId, setStoryId] = useState(stories[0]?.id)
  const story = stories.find((s) => s.id === storyId) ?? stories[0]
  const beats = useMemo(() => story?.beats ?? [], [story])
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [notes, setNotes] = useState(false)
  const [list, setList] = useState(false)
  const [picking, setPicking] = useState(false)

  const go = useCallback((to: string) => navigate({ pathname: to, search }), [navigate, search])
  const goThenReport = useCallback(
    (to: string) => {
      if (to === pathname) useDemo.getState().setMode('report')
      else {
        pendingReport.current = to
        go(to)
      }
    },
    [go, pathname],
  )

  useEffect(() => {
    if (pendingReport.current !== pathname) return
    pendingReport.current = undefined
    useDemo.getState().setMode('report')
  }, [pathname])

  const enter = useCallback(
    (i: number) => {
      if (!beats.length) return
      const n = Math.max(0, Math.min(beats.length - 1, i))
      setStep(n)
      setPicking(false)
      applyBeat(beats[n], pack, locale, go, goThenReport)
    },
    [beats, pack, locale, go, goThenReport],
  )

  const choose = (id: string) => {
    setStoryId(id)
    setStep(-1)
    setPlaying(false)
  }

  useEffect(() => {
    if (!playing || step < 0) return
    if (step >= beats.length - 1) {
      setPlaying(false)
      return
    }
    const started = Date.now()
    const due = beatMs(beats[step])
    let id: ReturnType<typeof setTimeout>
    const tick = () => {
      if (Date.now() - started >= due && !useDemo.getState().busyExpertId) enter(step + 1)
      else id = setTimeout(tick, 400)
    }
    id = setTimeout(tick, 400)
    return () => clearTimeout(id)
  }, [playing, step, beats, enter])

  useEffect(() => {
    if (!open) setPlaying(false)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target)) return
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight'
      const back = rtl ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === fwd || e.key === 'PageDown') enter(step + 1)
      else if (e.key === back || e.key === 'PageUp') enter(step - 1)
      else if (e.key === ' ' && (e.target as HTMLElement)?.tagName !== 'BUTTON') {
        e.preventDefault()
        if (step < 0) enter(0)
        setPlaying((x) => !x)
      } else if (e.key === 'Escape') {
        if (notes || list || picking) {
          setNotes(false)
          setList(false)
          setPicking(false)
        } else if (playing) setPlaying(false)
        else useDemo.getState().setPresenterOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, enter, rtl, notes, list, picking, playing])

  if (!open) return null
  const cur = step >= 0 ? beats[step] : undefined
  const Prev = rtl ? ChevronRight : ChevronLeft
  const Next = rtl ? ChevronLeft : ChevronRight
  const showPicker = stories.length > 0 && (step < 0 || picking)
  return (
    <>
      {cur && <Spotlight testid={cur.spotlight} />}
      {notes && (
        <div className="no-print card fade-up fixed bottom-[7.5rem] end-6 z-[79] max-h-[50vh] w-[26rem] overflow-auto p-4 text-[0.84rem]" data-testid="assumptions-note">
          <div className="mb-1 font-bold text-ink">
            {t('assumptions')} ({pack.assumptions.length})
          </div>
          <p className="mb-2 text-muted">{t('assumptionsHint')}</p>
          {pack.assumptions.length ? (
            <ul className="space-y-1.5">
              {pack.assumptions.map((a) => (
                <li key={a.path}>
                  <span className="font-semibold text-ink">{a.label}</span>
                  {a.why && <span className="text-muted"> — {a.why}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p>{t('noAssumptions')}</p>
          )}
        </div>
      )}
      {list && beats.length > 0 && (
        <div className="no-print card fade-up fixed bottom-[7.5rem] start-6 z-[79] max-h-[55vh] w-[24rem] overflow-auto p-3 text-[0.86rem]" data-testid="presenter-beats">
          <div className="eyebrow mb-1.5 px-1">
            {p(S.beats)} · {p(story?.title)}
          </div>
          <ol className="space-y-0.5">
            {beats.map((b, i) => (
              <li key={b.id}>
                <button type="button" onClick={() => enter(i)} className={`flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-start hover:bg-surface ${i === step ? 'bg-[#ecebfa] font-semibold text-ink' : 'text-body'}`} data-testid={`presenter-beat-${b.id}`}>
                  <span className={`num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] ${i <= step ? 'bg-accent text-white' : 'bg-surface text-muted'}`}>{i + 1}</span>
                  <span className="min-w-0">{p(b.title)}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
      <div className="no-print fixed bottom-5 left-1/2 z-[78] w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2" data-testid="presenter-bar">
        {showPicker && (
          <div className="mb-2" data-testid="presenter-story">
            <div className={`grid gap-2 ${stories.length === 1 ? 'grid-cols-1' : stories.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {stories.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => choose(s.id)}
                  aria-pressed={story?.id === s.id}
                  className={`rounded-2xl border px-4 py-3 text-start text-white shadow-xl transition-colors ${story?.id === s.id ? 'border-accent bg-brand' : 'border-white/20 bg-brand/85 text-white/80 hover:bg-brand'}`}
                  data-testid={`presenter-story-${s.id}`}
                >
                  <div className="text-[0.95rem] font-semibold">{p(s.title)}</div>
                  <div className="mt-0.5 line-clamp-2 text-[0.76rem] text-white/65">{s.beats.map((b) => p(b.title)).join(' · ')}</div>
                  <div className="num mt-1 text-[0.7rem] text-accent">
                    {s.beats.length} {t('steps')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="hero-band flex items-center gap-4 rounded-3xl px-5 py-3.5 text-white shadow-2xl">
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40" onClick={() => enter(step - 1)} disabled={step <= 0} aria-label={t('previous')} data-testid="presenter-prev">
              <Prev size={20} />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white hover:brightness-105 disabled:opacity-40"
              onClick={() => {
                if (step < 0) enter(0)
                setPlaying((x) => !x)
              }}
              disabled={!beats.length}
              aria-label={playing ? t('pause') : t('start')}
              aria-pressed={playing}
              data-testid="presenter-play"
            >
              {playing ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40" onClick={() => enter(step + 1)} disabled={step >= beats.length - 1} aria-label={t('next')} data-testid="presenter-next">
              <Next size={20} />
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[0.72rem] text-white/60">
              {stories.length > 1 && (
                <button type="button" className="max-w-[12rem] truncate rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white/85 hover:bg-white/20" onClick={() => setPicking(!picking)} aria-expanded={showPicker} title={p(S.chooseStory)} data-testid="presenter-story-toggle">
                  {p(story?.title)}
                </button>
              )}
              <span className="num">{`${Math.max(0, step + 1)} / ${beats.length}`}</span>
              <div className="flex gap-1" dir="ltr">
                {beats.map((b, i) => (
                  <button key={b.id} type="button" onClick={() => enter(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 22 : 10, background: i <= step ? 'var(--brand-accent)' : 'rgba(255,255,255,0.25)' }} title={p(b.title)} aria-label={`${i + 1}. ${p(b.title)}`} />
                ))}
              </div>
            </div>
            <div className="mt-0.5 truncate text-[1.02rem] font-bold" data-testid="presenter-title">
              {cur ? p(cur.title) : t('presenter')}
            </div>
            <div className="line-clamp-2 text-[0.82rem] leading-snug text-white/80" data-testid="presenter-narration">
              {cur ? r(cur.narration) : beats.length ? `${p(story?.title)} · ${beats.length} ${t('steps')} · ${p(S.keys)}` : p(S.noBeats)}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {step < 0 && beats.length > 0 && (
              <button type="button" className="btn btn-primary !px-3.5 !py-1.5 text-[0.85rem]" onClick={() => enter(0)} data-testid="presenter-start">
                {p(S.startStory)}
              </button>
            )}
            <button type="button" className={`flex h-9 w-9 items-center justify-center rounded-full ${list ? 'bg-white/20' : 'hover:bg-white/10'}`} onClick={() => setList(!list)} aria-pressed={list} aria-label={p(S.beats)} title={p(S.beats)} data-testid="presenter-beats-toggle">
              <ListOrdered size={17} />
            </button>
            <button type="button" className={`relative flex h-9 w-9 items-center justify-center rounded-full ${notes ? 'bg-white/20' : 'hover:bg-white/10'}`} onClick={() => setNotes(!notes)} aria-pressed={notes} aria-label={t('assumptions')} title={t('assumptions')} data-testid="assumptions-toggle">
              <ClipboardList size={17} />
              {pack.assumptions.length > 0 && <span className="num absolute -end-0.5 -top-0.5 rounded-full bg-accent px-1 text-[0.6rem] font-bold">{pack.assumptions.length}</span>}
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
              onClick={() => {
                setPlaying(false)
                setStep(-1)
                useDemo.getState().reset()
                go(homePath(pack))
              }}
              aria-label={t('reset')}
              title={t('reset')}
              data-testid="presenter-reset"
            >
              <RotateCcw size={17} />
            </button>
            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-white/10"
              onClick={() => {
                setPlaying(false)
                useDemo.getState().setPresenterOpen(false)
              }}
              aria-label={t('close')}
              data-testid="presenter-close"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
