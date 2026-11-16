import { ArrowUp, ShieldAlert, Sparkles } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ask } from '../engine'
import { useT } from '../i18n'
import type { Pack } from '../pack'
import { useDemo, type ChatTurn } from '../store'
import type { Expert } from '../types'
import { prefersReducedMotion } from './ui'

export function sendQuestion(pack: Pack, expertId: string, question: string) {
  const st = useDemo.getState()
  st.pushTurn(expertId, { role: 'user', text: question })
  const reply = ask(pack, expertId, question)
  if (reply.kind === 'answer') st.pushTurn(expertId, { role: 'expert', kind: 'answer', answerId: reply.answer.id })
  else if (reply.kind === 'refusal') st.pushTurn(expertId, { role: 'expert', kind: 'refusal' })
  else st.pushTurn(expertId, { role: 'expert', kind: 'fallback', suggestions: reply.suggestions.map((a) => a.id) })
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function Avatar({ expert, size = 44 }: { expert: Expert; size?: number }) {
  const { p } = useT()
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full font-bold text-white" style={{ width: size, height: size, background: 'linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))', fontSize: size * 0.36 }} aria-hidden>
      {initials(p(expert.name))}
    </div>
  )
}

/** Reveals the text progressively, like a streamed reply. */
function useReveal(full: string, active: boolean) {
  const [n, setN] = useState(active && !prefersReducedMotion() ? 0 : full.length)
  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setN(full.length)
      return
    }
    let i = 0
    const id = setInterval(() => {
      i = Math.min(full.length, i + 4)
      setN(i)
      if (i >= full.length) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [full, active])
  return n
}

function ExpertTurn({ turn, expert, latest }: { turn: ChatTurn; expert: Expert; latest: boolean }) {
  const { pack, r, t, locale } = useT()
  if (turn.kind === 'refusal')
    return (
      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface p-4 text-[0.92rem]" data-testid="chat-refusal">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-secondary" />
        <span>{r(pack.spec.refusals.reply)}</span>
      </div>
    )
  if (turn.kind === 'fallback')
    return (
      <div className="rounded-2xl border border-line bg-white p-4 text-[0.92rem]" data-testid="chat-fallback">
        <p>{t('fallback')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {turn.suggestions?.map((id) => {
            const a = expert.answers.find((x) => x.id === id)!
            return (
              <button key={id} type="button" className="chip border border-line bg-surface text-ink hover:bg-surface-2" onClick={() => sendQuestion(pack, expert.id, phrasingFor(a.questions, locale))}>
                {phrasingFor(a.questions, locale)}
              </button>
            )
          })}
        </div>
      </div>
    )
  const a = expert.answers.find((x) => x.id === turn.answerId)!
  return <AnswerBody pack={pack} expert={expert} lead={r(a.lead)} points={a.points.map((pt) => r(pt))} followUps={(a.followUps ?? []).map((id) => expert.answers.find((x) => x.id === id)!).filter(Boolean)} latest={latest} t={t} locale={locale} />
}

function AnswerBody({ pack, expert, lead, points, followUps, latest, t, locale }: { pack: Pack; expert: Expert; lead: string; points: string[]; followUps: Expert['answers']; latest: boolean; t: ReturnType<typeof useT>['t']; locale: string }) {
  const full = [lead, ...points].join('\n')
  const n = useReveal(full, latest)
  const done = n >= full.length
  const parts = [lead, ...points]
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((a, s) => a + s.length + 1, 0))
  const [leadShown, ...pointsShown] = parts.map((s, i) => s.slice(0, Math.max(0, n - starts[i])))
  return (
    <div className="rounded-2xl border border-line bg-white p-4 text-[0.95rem] leading-relaxed" data-testid="chat-answer">
      <p className={`font-semibold text-ink ${!done && pointsShown.every((x) => !x) ? 'stream-caret' : ''}`}>{leadShown}</p>
      {pointsShown.some(Boolean) && (
        <ul className="mt-2 space-y-1.5">
          {pointsShown.map((x, i) =>
            x ? (
              <li key={i} className="flex gap-2">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span className={!done && i === pointsShown.findLastIndex(Boolean) ? 'stream-caret' : ''}>{x}</span>
              </li>
            ) : null,
          )}
        </ul>
      )}
      {done && followUps.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-[0.78rem] font-semibold text-muted">{t('tellMeMore')}</span>
          {followUps.map((f) => (
            <button key={f.id} type="button" className="chip border border-line bg-surface text-ink hover:bg-surface-2" onClick={() => sendQuestion(pack, expert.id, phrasingFor(f.questions, locale))} data-testid={`followup-${f.id}`}>
              {phrasingFor(f.questions, locale)}
            </button>
          ))}
        </div>
      )}
      {done && <div className="mt-2 text-[0.72rem] text-muted">{t('grounded')}</div>}
    </div>
  )
}

function phrasingFor(questions: string[], locale: string) {
  const ar = questions.find((q) => /[\u0600-\u06FF]/.test(q))
  return locale === 'ar' && ar ? ar : questions.find((q) => !/[\u0600-\u06FF]/.test(q)) ?? questions[0]
}

export function ExpertChat({ expert }: { expert: Expert }) {
  const { pack, p, t, locale } = useT()
  const turns = useDemo((s) => s.chats[expert.id]) ?? []
  const [q, setQ] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView?.({ block: 'end', behavior: 'smooth' })
  }, [turns.length])
  const submit = () => {
    if (!q.trim()) return
    sendQuestion(pack, expert.id, q.trim())
    setQ('')
  }
  return (
    <section className="card flex h-[38rem] flex-col overflow-hidden" data-testid="expert-chat">
      <header className="hero-band flex items-center gap-3 px-5 py-4 text-white">
        <Avatar expert={expert} />
        <div className="min-w-0">
          <div className="text-[1.05rem] font-bold">{p(expert.name)}</div>
          <div className="truncate text-[0.82rem] text-white/75">{p(expert.role)}</div>
        </div>
      </header>
      <div className="scroll-thin flex-1 space-y-3 overflow-auto bg-surface p-4">
        {!turns.length && (
          <div className="rounded-2xl border border-dashed border-line bg-white p-4">
            <div className="mb-2 flex items-center gap-2 text-[0.85rem] font-semibold text-muted">
              <Sparkles size={15} className="text-accent" /> {t('tryAsking')}
            </div>
            <div className="flex flex-wrap gap-2">
              {expert.answers.slice(0, 4).map((a) => (
                <button key={a.id} type="button" className="chip border border-line bg-surface text-ink hover:bg-surface-2" onClick={() => sendQuestion(pack, expert.id, phrasingFor(a.questions, locale))} data-testid={`starter-${a.id}`}>
                  {phrasingFor(a.questions, locale)}
                </button>
              ))}
            </div>
          </div>
        )}
        {turns.map((turn, i) =>
          turn.role === 'user' ? (
            <div key={turn.id} className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-brand px-4 py-2.5 text-[0.93rem] text-white" data-testid="chat-question">
                {turn.text}
              </div>
            </div>
          ) : (
            <ExpertTurn key={turn.id} turn={turn} expert={expert} latest={i === turns.length - 1} />
          ),
        )}
        <div ref={end} />
      </div>
      <form
        className="flex items-center gap-2 border-t border-line bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('askPlaceholder')} className="flex-1 rounded-full border border-line px-4 py-2.5 text-[0.93rem]" data-testid="chat-input" />
        <button type="submit" className="btn btn-primary !px-3" aria-label={t('send')} data-testid="chat-send">
          <ArrowUp size={18} />
        </button>
      </form>
    </section>
  )
}

export function ExpertsView() {
  const { pack, p } = useT()
  const expertId = useDemo((s) => s.expertId) ?? pack.spec.experts[0]?.id
  const openExpert = useDemo((s) => s.openExpert)
  const expert = pack.spec.experts.find((e) => e.id === expertId)
  return (
    <div className="grid gap-4 lg:grid-cols-[22rem_1fr]">
      <div className="space-y-3" data-testid="expert-cards">
        {pack.spec.experts.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => openExpert(e.id)}
            aria-pressed={e.id === expertId}
            className={`card flex w-full items-start gap-3 p-4 text-start transition-shadow hover:shadow-md ${e.id === expertId ? '!border-accent ring-2 ring-accent/25' : ''}`}
            data-testid={`expert-card-${e.id}`}
          >
            <Avatar expert={e} />
            <div className="min-w-0">
              <div className="font-bold text-ink">{p(e.name)}</div>
              <div className="text-[0.84rem] font-medium text-secondary">{p(e.role)}</div>
              <div className="mt-1 text-[0.82rem] leading-snug text-muted">{p(e.focus)}</div>
            </div>
          </button>
        ))}
      </div>
      {expert && <ExpertChat key={expert.id} expert={expert} />}
    </div>
  )
}
