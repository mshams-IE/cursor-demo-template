import { Copy, Download, FileText, Presentation, Printer, Sparkles, Square, Volume2 } from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui'
import { bodyToSections, docToText, type BriefDoc } from '../features/briefs/briefDoc'
import { useBriefLogos, BriefDocument } from '../features/briefs/BriefDocument'
import { downloadBrief } from '../features/briefs/briefHtml'
import '../features/briefs/briefs.css'
import { situationBrief } from '../features/briefs/situation'
import { B } from '../features/briefs/strings'
import { ActionsList } from '../features/planning/ActionsList'
import { S } from '../features/planning/strings'
import { useT } from '../i18n'
import { formatDate, formatTime, MINUTE } from '../model/time'
import { pick } from '../pack'
import { useDemo } from '../store'

const SITUATION = 'situation'

function useSpeech(text: string, locale: string) {
  const [speaking, setSpeaking] = useState(false)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  useEffect(() => () => void (supported && window.speechSynthesis.cancel()), [supported])
  useEffect(() => {
    if (!supported) return
    window.speechSynthesis.cancel()
    setSpeaking(false)
  }, [text, supported])
  const toggle = () => {
    if (!supported) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = locale === 'ar' ? 'ar-SA' : 'en-GB'
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(u)
    setSpeaking(true)
  }
  return { speaking, toggle, supported }
}

export function BriefsPage() {
  const { pack, t, p, locale } = useT()
  const navigate = useNavigate()
  const briefs = useDemo((s) => s.briefs)
  const actions = useDemo((s) => s.actions)
  const budget = useDemo((s) => s.budget)
  const windowHours = useDemo((s) => s.windowHours)
  const scenario = useDemo((s) => s.scenario)
  const minute = Math.floor(useDemo((s) => s.clockMs) / MINUTE) * MINUTE
  const [selected, setSelected] = useState(briefs[0]?.id ?? SITUATION)
  const logos = useBriefLogos()

  const situation = useMemo(() => situationBrief(pack, { clockMs: minute, budget, windowHours, scenario, actions }, locale), [pack, minute, budget, windowHours, scenario, actions, locale])
  const saved = briefs.find((b) => b.id === selected)
  const doc: BriefDoc = saved
    ? {
        title: saved.title,
        meta: [formatDate(saved.createdMs, locale), formatTime(saved.createdMs, locale, pick(pack.spec.clock.zone, locale)), saved.expertId && pick(pack.spec.experts.find((e) => e.id === saved.expertId)?.name, locale)].filter(Boolean).join(' · '),
        sections: bodyToSections(saved.body),
      }
    : situation
  const text = docToText(doc)
  const speech = useSpeech(text, locale)
  const go = (path: string) => navigate({ pathname: path, search: globalThis.location.hash.split('?')[1] ?? '' })

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      useDemo.getState().showToast(B.copied)
    } catch {
      /* clipboard refused; nothing to report in a demo */
    }
  }
  const download = () => downloadBrief(doc, locale, { eyebrow: p(B.executiveBrief), footer: p(B.footer), logos }, saved?.id ?? `situation-${formatTime(minute, 'en').replace(':', '')}`)

  const item = (id: string, title: string, sub: string, icon: ReactNode) => (
    <li key={id}>
      <button
        type="button"
        onClick={() => setSelected(id)}
        aria-current={selected === id || undefined}
        className={`flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-start text-[0.86rem] transition-colors ${selected === id ? 'bg-surface-2 ring-1 ring-secondary/30' : 'hover:bg-surface'}`}
        data-testid={`brief-item-${id}`}
      >
        <span className="mt-0.5 shrink-0 text-secondary">{icon}</span>
        <span className="min-w-0">
          <span className="block font-semibold leading-snug text-ink">{title}</span>
          <span className="block text-[0.74rem] text-muted">{sub}</span>
        </span>
      </button>
    </li>
  )

  return (
    <div className="space-y-5 p-6" data-testid="briefs-page">
      <header className="no-print flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-[2rem] font-bold tracking-tight text-ink">{t('navBriefs')}</h1>
        <button type="button" className="btn btn-primary" onClick={() => go('/pack')} data-testid="open-pack">
          <Presentation size={16} /> {p(B.presentPack)}
        </button>
      </header>
      <div className="grid items-start gap-5 xl:grid-cols-[19rem_minmax(0,1fr)]">
        <div className="no-print space-y-5">
          <Card title={p(B.executiveBrief)} testid="brief-list">
            <ul className="space-y-1">{item(SITUATION, p(B.situationBrief), `${formatTime(minute, locale)} · ${p(B.auto)}`, <Sparkles size={16} />)}</ul>
            <div className="eyebrow mb-1.5 mt-4">{p(B.saved)}</div>
            {briefs.length ? (
              <ul className="space-y-1">{briefs.map((b) => item(b.id, b.title, `${formatDate(b.createdMs, locale)} · ${formatTime(b.createdMs, locale)}`, <FileText size={16} />))}</ul>
            ) : (
              <p className="text-[0.82rem] leading-relaxed text-muted">{p(B.noSaved)}</p>
            )}
          </Card>
        </div>
        <div className="min-w-0 space-y-3">
          <div className="no-print flex flex-wrap justify-end gap-2" data-testid="brief-actions">
            <button type="button" className="btn btn-ghost" onClick={copy} data-testid="brief-copy">
              <Copy size={16} /> {p(B.copy)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => window.print()} data-testid="brief-print">
              <Printer size={16} /> {p(B.print)}
            </button>
            <button type="button" className="btn btn-ghost" onClick={download} data-testid="brief-download">
              <Download size={16} /> {p(B.download)}
            </button>
            {speech.supported && (
              <button type="button" className={`btn ${speech.speaking ? 'btn-primary' : 'btn-ghost'}`} onClick={speech.toggle} aria-pressed={speech.speaking} data-testid="brief-read">
                {speech.speaking ? <Square size={16} /> : <Volume2 size={16} />} {p(speech.speaking ? B.stop : B.readAloud)}
              </button>
            )}
          </div>
          <BriefDocument doc={doc} />
        </div>
      </div>
      <div className="no-print">
        <Card title={p(S.actions)}>
          <ActionsList />
        </Card>
      </div>
    </div>
  )
}
