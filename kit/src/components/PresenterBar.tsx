import { ChevronLeft, ChevronRight, ClipboardList, Pause, Play, RotateCcw, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n'
import { useDemo } from '../store'
import { sendQuestion } from './ExpertsView'

const BEAT_MS = 9000

function Spotlight({ testid }: { testid?: string }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  useEffect(() => {
    setRect(null)
    if (!testid) return
    let raf = 0
    let last = ''
    const poll = () => {
      const r = document.querySelector(`[data-testid="${testid}"]`)?.getBoundingClientRect()
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
    <div className="spotlight pointer-events-none fixed z-[70] rounded-[20px]" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} data-testid="presenter-spotlight" />,
    document.body,
  )
}

export function PresenterBar() {
  const { pack, p, r, t, rtl } = useT()
  const open = useDemo((s) => s.presenterOpen)
  const beats = pack.spec.presenter.beats
  const [step, setStep] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [notes, setNotes] = useState(false)

  const enter = useCallback(
    (i: number) => {
      const n = Math.max(0, Math.min(beats.length - 1, i))
      const b = beats[n]
      const st = useDemo.getState()
      setStep(n)
      st.setView(b.view)
      st.selectRegion(b.regionId)
      if (b.ask) {
        st.openExpert(b.ask.expertId)
        const asked = (st.chats[b.ask.expertId] ?? []).some((x) => x.role === 'expert' && x.answerId === b.ask!.answerId)
        if (!asked) sendQuestion(pack, b.ask.expertId, p(b.ask.question))
      }
    },
    [beats, pack, p],
  )

  useEffect(() => {
    if (!playing) return
    if (step >= beats.length - 1) {
      setPlaying(false)
      return
    }
    const id = setTimeout(() => enter(step + 1), BEAT_MS)
    return () => clearTimeout(id)
  }, [playing, step, beats.length, enter])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const fwd = rtl ? 'ArrowLeft' : 'ArrowRight'
      const back = rtl ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === fwd || e.key === 'PageDown') enter(step + 1)
      if (e.key === back || e.key === 'PageUp') enter(step - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, step, enter, rtl])

  if (!open) return null
  const cur = step >= 0 ? beats[step] : undefined
  const Prev = rtl ? ChevronRight : ChevronLeft
  const Next = rtl ? ChevronLeft : ChevronRight
  return (
    <>
      {cur && <Spotlight testid={cur.spotlight} />}
      {notes && (
        <div className="no-print card fade-up fixed bottom-[7.5rem] end-6 z-[73] max-h-[50vh] w-[26rem] overflow-auto p-4 text-[0.84rem]" data-testid="assumptions-note">
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
      <div className="no-print fixed bottom-5 left-1/2 z-[72] w-[min(62rem,calc(100vw-2rem))] -translate-x-1/2" data-testid="presenter-bar">
        <div className="hero-band flex items-center gap-4 rounded-3xl px-5 py-3.5 text-white shadow-2xl">
          <div className="flex shrink-0 items-center gap-1.5">
            <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-40" onClick={() => enter(step - 1)} disabled={step <= 0} aria-label={t('previous')} data-testid="presenter-prev">
              <Prev size={20} />
            </button>
            <button
              type="button"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-white hover:brightness-105"
              onClick={() => {
                if (step < 0) enter(0)
                setPlaying((x) => !x)
              }}
              aria-label={playing ? t('pause') : t('start')}
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
              <span className="num">{`${Math.max(0, step + 1)} / ${beats.length}`}</span>
              <div className="flex gap-1" dir="ltr">
                {beats.map((b, i) => (
                  <button key={b.id} type="button" onClick={() => enter(i)} className="h-1.5 rounded-full transition-all" style={{ width: i === step ? 22 : 10, background: i <= step ? 'var(--brand-accent)' : 'rgba(255,255,255,0.25)' }} aria-label={`${i + 1}`} />
                ))}
              </div>
            </div>
            <div className="mt-0.5 truncate text-[1.02rem] font-bold" data-testid="presenter-title">
              {cur ? p(cur.title) : t('presenter')}
            </div>
            <div className="line-clamp-2 text-[0.82rem] leading-snug text-white/80" data-testid="presenter-narration">
              {cur ? r(cur.narration) : `${beats.length} ${t('steps')} · ${p(pack.spec.audience)}`}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
            >
              <X size={17} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
