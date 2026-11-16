import { ArrowUp, ChevronDown, Loader2, Mic, ShieldAlert, ShieldCheck, Square, Volume2, Wrench } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { prefersReducedMotion } from '../../components/ui'
import { sendToExpert } from '../../conversation'
import { useT } from '../../i18n'
import { useDemo, type ChatTurn } from '../../store'
import type { Expert, Specialist } from '../../types'
import { useAgents } from '../agents/agentStore'
import { useTeamProgress } from '../agents/progress'
import { RobotAvatar } from '../agents/RobotAvatar'
import { ROBOT_STATUS } from '../agents/strings'
import { canListen, canSpeak, listen, speak, stopSpeaking } from '../voice/voice'
import { AnswerVisual } from './AnswerVisual'
import { expertById, phrasing, specialistsByIds, stageIndex, starters } from './catalog'
import { ExpertAvatar } from './ExpertAvatar'
import { fill, S } from './strings'

const NO_TURNS: ChatTurn[] = []

export function useChat(expertId?: string): ChatTurn[] {
  return useDemo((s) => (expertId ? s.chats[expertId] : undefined)) ?? NO_TURNS
}

/** Whether the expert is still working on a reply. */
export function useBusy(expertId?: string) {
  const turns = useChat(expertId)
  const busy = useDemo((s) => !!expertId && s.busyExpertId === expertId)
  return busy || turns.some((t) => t.pending)
}

/** Sends a question; `onHandoff` runs when another expert ends up answering. */
export function useSend(expertId: string, onHandoff?: (id: string) => void) {
  const { pack } = useT()
  return async (text: string) => {
    const q = text.trim()
    if (!q) return
    stopSpeaking()
    const res = (await sendToExpert(pack, expertId, q)) as unknown
    if (res && typeof res === 'object' && 'expertId' in res && typeof res.expertId === 'string' && res.expertId !== expertId) {
      useDemo.getState().openExpert(res.expertId)
      onHandoff?.(res.expertId)
    }
  }
}

const andList = (names: string[], and: string, ar: boolean) => {
  if (names.length <= 1) return names.join('')
  return ar ? names.join(and) : `${names.slice(0, -1).join(', ')}${and}${names[names.length - 1]}`
}

/** Specialists working on one answer: one after another while pending, then a one-line summary. */
export function TeamStrip({ turn, large }: { turn: ChatTurn; large?: boolean }) {
  const { pack, p, locale } = useT()
  const team = specialistsByIds(pack.spec, turn.team)
  const { working, stateOf, current, activityOf } = useTeamProgress(turn, team)
  const [open, setOpen] = useState(false)
  const showTeam = useAgents((s) => s.show)
  if (!team.length) return null
  const ar = locale === 'ar'
  const specialists = team.filter((s) => s.stage !== 'lead')
  const named = specialists.length ? specialists : team
  const whole = specialists.length >= 5
  const names = whole ? fill(p(S.fullTeam), { n: specialists.length }) : andList(named.map((s) => p(s.name)), p(S.and), ar)
  const line = working ? fill(p(S.calling), { names }) : fill(p(S.workedOn), { names: whole ? p(S.fullTeamDone) : names })
  const activity = current && activityOf(current.id)
  const expanded = working || open
  return (
    <div className={`mb-3 rounded-2xl border border-line bg-surface/70 ${large ? 'px-4 py-3' : 'px-3 py-2'}`} data-testid="turn-team" data-state={working ? 'working' : 'done'} data-steps={team.map((s) => s.id).join(',')}>
      <div className="flex items-center gap-2">
        {!expanded && (
          <span className="flex -space-x-1.5 rtl:space-x-reverse">
            {team.map((s) => (
              <RobotAvatar key={s.id} specialist={s} index={stageIndex(pack.spec, s.id)} state={stateOf(s.id)} size={large ? 26 : 22} />
            ))}
          </span>
        )}
        <span className={`min-w-0 flex-1 truncate font-semibold text-ink ${large ? 'text-[0.9rem]' : 'text-[0.78rem]'}`} data-testid="plan-line">
          {working && <Loader2 size={14} className="me-1.5 inline animate-spin text-secondary" aria-hidden />}
          {line}
        </span>
        {!working && (
          <button type="button" onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-0.5 text-[0.75rem] font-semibold text-secondary hover:underline" aria-expanded={open} data-testid="toggle-team">
            <ChevronDown size={14} className={open ? 'rotate-180' : ''} aria-hidden />
            {open ? p(S.hide) : p(S.details)}
          </button>
        )}
        <button type="button" onClick={() => showTeam({ expertId: turn.expertId, turnId: turn.id })} className="text-[0.75rem] font-semibold text-secondary hover:underline" data-testid="show-team">
          {p(S.showTeam)}
        </button>
      </div>
      {expanded && (
        <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2">
          {team.map((s) => {
            const st = stateOf(s.id)
            return (
              <li key={s.id} className="flex items-center gap-2" data-testid={`team-member-${s.id}`} data-state={st}>
                <RobotAvatar specialist={s} index={stageIndex(pack.spec, s.id)} state={st} size={large ? 38 : 30} />
                <span className={`leading-tight ${large ? 'text-[0.8rem]' : 'text-[0.72rem]'}`}>
                  <span className="block font-semibold text-ink">{p(s.name)}</span>
                  <span className="text-muted">{p(ROBOT_STATUS[st])}</span>
                </span>
              </li>
            )
          })}
        </ul>
      )}
      {activity && (
        <p className="mt-2 truncate text-[0.75rem] text-muted" data-testid="team-activity">
          {activity}
        </p>
      )}
    </div>
  )
}

function ToolChips({ names, live }: { names: string[]; live?: boolean }) {
  if (!names.length) return null
  return (
    <div className="mb-2 flex flex-wrap gap-1.5" data-testid="tool-chips">
      {names.map((n, i) => (
        <span key={i} className={`inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[0.7rem] font-medium text-secondary ${live && i === names.length - 1 ? 'animate-pulse' : ''}`} dir="ltr">
          <Wrench size={11} aria-hidden />
          {n.replace(/_/g, ' ')}
        </span>
      ))}
    </div>
  )
}

function SpeakButton({ text }: { text: string }) {
  const { p, locale } = useT()
  const [on, setOn] = useState(false)
  if (!canSpeak() || !text) return null
  const toggle = () => {
    if (on) {
      stopSpeaking()
      setOn(false)
      return
    }
    setOn(true)
    void speak(text, locale).then(() => setOn(false))
  }
  return (
    <button type="button" onClick={toggle} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.72rem] font-semibold ${on ? 'bg-secondary text-white' : 'text-secondary hover:bg-secondary/10'}`} data-testid="speak-answer" aria-pressed={on}>
      {on ? <Square size={11} aria-hidden /> : <Volume2 size={13} aria-hidden />}
      {on ? p(S.stop) : p(S.listen)}
    </button>
  )
}

const revealed = new Set<number>()

/** Reveals text progressively the first time a turn is shown, like a streamed reply. */
function useReveal(turnId: number, full: string, active: boolean) {
  const [animate] = useState(() => active && !revealed.has(turnId) && !prefersReducedMotion())
  const [n, setN] = useState(animate ? 0 : full.length)
  useEffect(() => {
    revealed.add(turnId)
    if (!animate) {
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
  }, [animate, full, turnId])
  return n
}

const VISIBLE_POINTS = 4

function Points({ points, large, caretAt }: { points: string[]; large?: boolean; caretAt?: number }) {
  const { p } = useT()
  const [more, setMore] = useState(false)
  if (!points.length) return null
  const shown = more || caretAt !== undefined ? points : points.slice(0, VISIBLE_POINTS)
  return (
    <>
      <ul className={`mt-2 space-y-1 text-body ${large ? 'text-[0.97rem]' : 'text-[0.84rem]'}`}>
        {shown.map((pt, i) =>
          pt ? (
            <li key={i} className="flex gap-2">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-secondary" />
              <span className={caretAt === i ? 'stream-caret' : ''}>{pt}</span>
            </li>
          ) : null,
        )}
      </ul>
      {caretAt === undefined && points.length > VISIBLE_POINTS && (
        <button type="button" className="mt-1 text-[0.75rem] font-semibold text-secondary hover:underline" onClick={() => setMore((v) => !v)} aria-expanded={more} data-testid="tell-me-more">
          {more ? p(S.showLess) : fill(p(S.showMore), { n: points.length - VISIBLE_POINTS })}
        </button>
      )}
    </>
  )
}

function FollowUps({ items, expertId, onSend, large }: { items: string[]; expertId: string; onSend: (q: string) => void; large?: boolean }) {
  const { p } = useT()
  const busy = useBusy(expertId)
  if (!items.length) return null
  return (
    <div className="mt-3" data-testid="follow-ups">
      <div className="mb-1 text-[0.7rem] font-semibold text-muted">{p(S.youCouldAlsoAsk)}</div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((q, i) => (
          <button key={i} type="button" disabled={busy} onClick={() => onSend(q)} className={`rounded-full border border-secondary/30 bg-secondary/5 text-secondary hover:bg-secondary/10 disabled:opacity-50 ${large ? 'px-3 py-1 text-[0.84rem]' : 'px-2.5 py-0.5 text-[0.74rem]'}`} data-testid={`followup-${i}`}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}

function ScriptedBody({ turn, expert, latest, large, onSend }: { turn: ChatTurn; expert: Expert; latest: boolean; large?: boolean; onSend: (q: string) => void }) {
  const { r, locale } = useT()
  const a = expert.answers.find((x) => x.id === turn.answerId)
  const lead = a ? r(a.lead) : ''
  const points = a ? a.points.map((pt) => r(pt)) : []
  const parts = [lead, ...points]
  const full = parts.join('\n')
  const n = useReveal(turn.id, full, latest)
  if (!a) return null
  const done = n >= full.length
  const starts = parts.map((_, i) => parts.slice(0, i).reduce((acc, s) => acc + s.length + 1, 0))
  const [leadShown, ...pointsShown] = parts.map((s, i) => s.slice(0, Math.max(0, n - starts[i])))
  const lastPoint = pointsShown.findLastIndex(Boolean)
  const followUps = (a.followUps ?? []).map((id) => expert.answers.find((x) => x.id === id)).filter((x) => !!x).map((x) => phrasing(x, locale))
  return (
    <>
      <p className={`font-semibold text-ink ${!done && lastPoint < 0 ? 'stream-caret' : ''}`} data-testid="answer-lead">
        {leadShown}
      </p>
      <Points points={done ? points : pointsShown} large={large} caretAt={done ? undefined : lastPoint >= 0 ? lastPoint : undefined} />
      {done && turn.visual && <AnswerVisual visual={turn.visual} large={large} />}
      {done && latest && <FollowUps items={followUps} expertId={expert.id} onSend={onSend} large={large} />}
      {done && <Footer text={[lead, ...points.slice(0, 3)].join('. ')} />}
    </>
  )
}

function Footer({ text, checked }: { text: string; checked?: boolean }) {
  const { p } = useT()
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      {checked ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-ok-soft px-2.5 py-1 text-[0.72rem] font-semibold text-[#0a7a55]" data-testid="grounding-chip">
          <ShieldCheck size={13} aria-hidden />
          {p(S.checked)}
        </span>
      ) : (
        <span className="text-[0.7rem] text-muted">{p(S.grounded)}</span>
      )}
      <SpeakButton text={text} />
    </div>
  )
}

function Sources({ sources }: { sources?: string[] }) {
  const { p } = useT()
  if (!sources?.length) return null
  return (
    <div className="mt-2 text-[0.72rem] text-muted" data-testid="answer-sources">
      <span className="font-semibold">{p(S.sources)}:</span> {sources.join(' · ')}
    </div>
  )
}

function ModelBody({ turn, large }: { turn: ChatTurn; large?: boolean }) {
  const { p } = useT()
  const s = turn.stream
  const streaming = !turn.modelText && !turn.generated
  const tools = turn.tools ?? s?.tools ?? []
  if (streaming)
    return (
      <>
        <ToolChips names={tools} live />
        {s?.text ? (
          <p className="stream-caret whitespace-pre-wrap font-medium text-ink" data-testid="answer-stream">
            {s.text}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-[0.82rem] text-muted">
            <Loader2 size={14} className="animate-spin" aria-hidden />
            {tools.length ? p(S.querying) : p(S.analysing)}
          </p>
        )}
      </>
    )
  const g = turn.generated
  const text = turn.modelText ?? g?.lead ?? ''
  return (
    <>
      <ToolChips names={tools} />
      <p className="whitespace-pre-wrap font-medium text-ink" data-testid="answer-lead">
        {text}
      </p>
      {turn.modelText && g?.points.length ? <Points points={g.points} large={large} /> : !turn.modelText && g ? <Points points={g.points} large={large} /> : null}
      {turn.visual && <AnswerVisual visual={turn.visual} large={large} />}
      <Sources sources={g?.sources} />
      <Footer text={[text, ...(g?.points.slice(0, 3) ?? [])].join('. ')} checked />
    </>
  )
}

function GeneratedBody({ turn, large }: { turn: ChatTurn; large?: boolean }) {
  const g = turn.generated!
  return (
    <>
      {turn.tools && <ToolChips names={turn.tools} />}
      <p className="font-semibold text-ink" data-testid="answer-lead">
        {g.lead}
      </p>
      <Points points={g.points} large={large} />
      {turn.visual && <AnswerVisual visual={turn.visual} large={large} />}
      <Sources sources={g.sources} />
      <Footer text={[g.lead, ...g.points.slice(0, 3)].join('. ')} />
    </>
  )
}

function FallbackBody({ turn, expert, onSend }: { turn: ChatTurn; expert: Expert; onSend: (q: string) => void }) {
  const { p, locale } = useT()
  const busy = useBusy(expert.id)
  const suggestions = (turn.suggestions ?? []).map((id) => expert.answers.find((a) => a.id === id)).filter((a) => !!a)
  return (
    <div data-testid="chat-fallback">
      <p>{p(S.fallback)}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {suggestions.map((a, i) => (
          <button key={a.id} type="button" disabled={busy} className="rounded-full border border-secondary/30 bg-secondary/5 px-3 py-1 text-[0.82rem] text-secondary hover:bg-secondary/10 disabled:opacity-50" onClick={() => onSend(phrasing(a, locale))} data-testid={`suggestion-${i}`}>
            {phrasing(a, locale)}
          </button>
        ))}
      </div>
    </div>
  )
}

function ExpertTurn({ turn, fallbackExpert, latest, large, onSend }: { turn: ChatTurn; fallbackExpert: Expert; latest: boolean; large?: boolean; onSend: (q: string) => void }) {
  const { pack, p, r } = useT()
  const report = useDemo((s) => s.mode === 'report')
  const expert = expertById(pack.spec, turn.expertId) ?? fallbackExpert
  const isModel = turn.kind === 'model' || turn.modelText !== undefined || turn.stream !== undefined
  const hasBody = turn.kind === 'refusal' || turn.kind === 'fallback' || isModel || !!turn.generated || !!turn.answerId
  let body: ReactNode = null
  if (turn.kind === 'refusal')
    body = (
      <div className="flex items-start gap-2" data-testid="chat-refusal">
        <ShieldAlert size={18} className="mt-0.5 shrink-0 text-secondary" aria-hidden />
        <span>{r(pack.spec.refusals.reply)}</span>
      </div>
    )
  else if (turn.kind === 'fallback') body = <FallbackBody turn={turn} expert={expert} onSend={onSend} />
  else if (isModel) body = <ModelBody turn={turn} large={large} />
  else if (turn.generated) body = <GeneratedBody turn={turn} large={large} />
  else if (turn.answerId) body = <ScriptedBody turn={turn} expert={expert} latest={latest} large={large} onSend={onSend} />
  return (
    <div className="fade-up flex gap-3" data-expert={expert.id} data-kind={turn.kind ?? (turn.generated ? 'generated' : 'answer')}>
      <ExpertAvatar expert={expert} size={large ? 40 : 30} />
      <div
        className={`min-w-0 flex-1 leading-relaxed ${large ? 'text-[1.02rem]' : 'rounded-2xl rounded-ss-sm border border-line bg-white p-3.5 text-[0.9rem] shadow-sm'}`}
        data-testid={hasBody && !turn.pending ? 'chat-answer' : 'chat-pending'}
      >
        {large && <div className="mb-1 text-[0.82rem] font-semibold text-muted">{p(expert.name)}</div>}
        {!report && turn.team && turn.team.length > 0 && <TeamStrip turn={turn} large={large} />}
        {body ??
          (turn.pending ? (
            <p className="flex items-center gap-2 text-[0.85rem] text-muted">
              <Loader2 size={14} className="animate-spin" aria-hidden />
              {p(S.analysing)}
            </p>
          ) : null)}
      </div>
    </div>
  )
}

export function ChatThread({ expert, large, welcome, onSend }: { expert: Expert; large?: boolean; welcome?: ReactNode; onSend: (q: string) => void }) {
  const { p } = useT()
  const turns = useChat(expert.id)
  const scroller = useRef<HTMLDivElement>(null)
  const last = turns.at(-1)
  useEffect(() => {
    const el = scroller.current
    if (el) el.scrollTo?.({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [turns.length, last?.pending, last?.stream?.text])
  const lastExpert = [...turns].reverse().find((t) => t.role === 'expert')?.id
  return (
    <div ref={scroller} className="scroll-thin min-h-0 flex-1 overflow-y-auto" aria-live="polite" data-testid="chat-thread">
      <div className={large ? 'mx-auto w-full max-w-[56rem] space-y-6 px-6 py-8' : 'space-y-3 px-4 py-2'}>
        {!turns.some((t) => t.role !== 'note') && welcome}
        {turns.map((turn) =>
          turn.role === 'user' ? (
            <div key={turn.id} className="fade-up flex justify-end">
              <div className={`max-w-[85%] rounded-2xl rounded-se-sm bg-secondary text-white ${large ? 'px-4 py-2.5 text-[1.02rem]' : 'px-3.5 py-2 text-[0.9rem]'}`} data-testid="chat-question">
                {turn.text}
              </div>
            </div>
          ) : turn.role === 'note' ? (
            <div key={turn.id} className="fade-up flex items-center gap-3 text-[0.75rem] text-muted" data-testid="chat-note">
              <span className="h-px flex-1 bg-line" />
              {turn.note ? p(turn.note) : turn.text}
              <span className="h-px flex-1 bg-line" />
            </div>
          ) : (
            <ExpertTurn key={turn.id} turn={turn} fallbackExpert={expert} large={large} latest={turn.id === lastExpert} onSend={onSend} />
          ),
        )}
      </div>
    </div>
  )
}

/** Starters the user has not asked yet. */
export function useOpenStarters(expert: Expert, n = 6) {
  const { locale } = useT()
  const turns = useChat(expert.id)
  const asked = new Set(turns.filter((t) => t.role === 'user').map((t) => t.text))
  return starters(expert, locale, n).filter((s) => !asked.has(s.text))
}

export function Composer({ expert, large, prompts = [], placeholder, onSend }: { expert: Expert; large?: boolean; prompts?: string[]; placeholder?: string; onSend: (q: string) => void }) {
  const { p, locale } = useT()
  const busy = useBusy(expert.id)
  const [input, setInput] = useState('')
  const [listening, setListening] = useState(false)
  const stopListening = useRef<(() => void) | undefined>(undefined)
  useEffect(() => () => stopListening.current?.(), [])
  const submit = (q: string) => {
    if (!q.trim() || busy) return
    setInput('')
    onSend(q)
  }
  const toggleMic = () => {
    if (listening) return stopListening.current?.()
    stopSpeaking()
    setListening(true)
    stopListening.current = listen(
      locale,
      (text, final) => {
        setInput(text)
        if (final) submit(text)
      },
      () => setListening(false),
    )
  }
  const btn = large ? 'h-11 w-11' : 'h-8 w-8'
  return (
    <div className={large ? 'mx-auto w-full max-w-[56rem] px-6 pb-6 pt-2' : 'border-t border-line px-4 pb-4 pt-2'}>
      {prompts.length > 0 && (
        <div className={`scroll-thin -mx-1 mb-2 flex flex-wrap gap-1.5 overflow-y-auto px-1 ${large ? 'max-h-[5rem]' : 'max-h-[6.2rem]'}`} aria-label={p(S.suggested)}>
          {prompts.map((q, i) => (
            <button key={i} type="button" onClick={() => submit(q)} disabled={busy} className={`rounded-full border border-line bg-white text-body hover:border-secondary hover:text-secondary disabled:opacity-50 ${large ? 'px-3 py-1.5 text-[0.85rem]' : 'px-2.5 py-1 text-[0.74rem]'}`} data-testid={`starter-${i}`}>
              {q}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className={`flex items-center gap-2 border border-line focus-within:border-secondary ${large ? 'rounded-[1.6rem] bg-white px-3 py-2.5 shadow-[0_10px_30px_-18px_rgb(18_0_70/0.35)]' : 'rounded-2xl bg-surface px-3 py-1.5'}`}
      >
        {canListen() && (
          <button type="button" onClick={toggleMic} disabled={busy} className={`relative flex ${btn} shrink-0 items-center justify-center rounded-full ${listening ? 'mic-live bg-critical text-white' : 'text-secondary hover:bg-secondary/10'} disabled:opacity-40`} aria-label={p(S.speak)} aria-pressed={listening} data-testid="chat-mic">
            <Mic size={large ? 20 : 16} />
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={listening ? p(S.listening) : (placeholder ?? fill(p(S.askName), { name: p(expert.name) }))}
          className={`min-w-0 flex-1 bg-transparent !outline-none ${large ? 'py-2 text-[1.08rem]' : 'py-1.5 text-[0.92rem]'}`}
          aria-label={placeholder ?? fill(p(S.askName), { name: p(expert.name) })}
          data-testid="chat-input"
        />
        <button type="submit" disabled={!input.trim() || busy} className={`flex ${btn} shrink-0 items-center justify-center rounded-full bg-secondary text-white hover:bg-secondary-bright disabled:opacity-40`} aria-label={p(S.send)} data-testid="chat-send">
          <ArrowUp size={large ? 20 : 16} />
        </button>
      </form>
    </div>
  )
}

/** Robots of an expert's team in a row, each showing whether it is working on the latest reply. */
export function TeamRow({ team, size = 30, expertId }: { team: Specialist[]; size?: number; expertId?: string }) {
  const { pack, p } = useT()
  const turns = useChat(expertId)
  const pending = turns.findLast((t) => t.pending)
  const progress = useTeamProgress(pending, team)
  const stateOf = (id: string) => (pending?.team?.includes(id) ? progress.stateOf(id) : 'idle')
  return (
    <ul className="flex items-center gap-1.5" aria-label={p(S.team)} data-testid="team-strip" data-state={pending ? 'working' : 'idle'}>
      {team.map((s) => (
        <li key={s.id} title={`${p(s.name)} · ${p(s.role)}`}>
          <RobotAvatar specialist={s} index={stageIndex(pack.spec, s.id)} state={stateOf(s.id)} size={size} />
        </li>
      ))}
    </ul>
  )
}
