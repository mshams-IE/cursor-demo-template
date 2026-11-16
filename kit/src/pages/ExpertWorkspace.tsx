import { ArrowLeft, ArrowRight, PanelRightClose, PanelRightOpen, RotateCcw } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Segmented } from '../components/ui'
import { AgentExpanded } from '../features/agents/AgentPanel'
import { expertById, isAvailable, phrasing, teamOf } from '../features/experts/catalog'
import { ChatThread, Composer, TeamRow, useBusy, useChat, useOpenStarters, useSend } from '../features/experts/chat'
import { ContextPanel } from '../features/experts/ContextPanel'
import { ExpertAvatar } from '../features/experts/ExpertAvatar'
import { ModelPill } from '../features/experts/ModelPill'
import { S } from '../features/experts/strings'
import { useT } from '../i18n'
import { useDemo } from '../store'
import type { Expert } from '../types'

function Welcome({ expert, onSend }: { expert: Expert; onSend: (q: string) => void }) {
  const { p } = useT()
  const busy = useBusy(expert.id)
  const open = useOpenStarters(expert, 6)
  return (
    <div className="flex flex-col items-center pt-6 text-center" data-testid="workspace-welcome">
      <ExpertAvatar expert={expert} size={96} online />
      <h2 className="mt-4 text-[1.6rem] font-semibold text-ink">{p(expert.greeting ?? expert.focus)}</h2>
      {expert.greeting && <p className="mt-1 max-w-[40rem] text-[1rem] text-muted">{p(expert.focus)}</p>}
      <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
        {open.map((q, i) => (
          <button key={q.id} type="button" disabled={busy} onClick={() => onSend(q.text)} className="card px-5 py-4 text-start text-[1rem] font-medium text-ink transition hover:-translate-y-0.5 hover:border-secondary disabled:opacity-50" data-testid={`starter-${i}`}>
            {q.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ExpertWorkspace() {
  const { expertId } = useParams()
  const { pack, p, locale, rtl } = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const setLocale = useDemo((s) => s.setLocale)
  const openExpert = useDemo((s) => s.openExpert)
  const contextOpen = useDemo((s) => s.contextOpen)
  const setContextOpen = useDemo((s) => s.setContextOpen)
  const clearChat = useDemo((s) => s.clearChat)
  const report = useDemo((s) => s.mode === 'report')
  const found = expertById(pack.spec, expertId)
  const e = found && isAvailable(found) ? found : undefined
  const turns = useChat(e?.id)
  const send = useSend(e?.id ?? '', (id) => navigate({ pathname: `/experts/${id}/chat`, search: location.search }))
  const open = useOpenStarters(e ?? pack.spec.experts[0], 6)
  const asked = useRef(false)
  useEffect(() => {
    if (e) openExpert(e.id)
  }, [e, openExpert])
  const pending = (location.state as { ask?: string } | null)?.ask
  useEffect(() => {
    if (!e || !pending || asked.current) return
    asked.current = true
    navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null })
    void send(pending)
  }, [e, pending, navigate, location.pathname, location.search, send])
  if (!e) return <Navigate to={{ pathname: '/', search: location.search }} replace />

  const Back = rtl ? ArrowRight : ArrowLeft
  const team = report ? [] : teamOf(pack.spec, e)
  const onSend = (q: string) => void send(q)
  const last = turns.findLast((t) => t.role === 'expert' && t.answerId)
  const followed = new Set((e.answers.find((a) => a.id === last?.answerId)?.followUps ?? []).map((id) => e.answers.find((a) => a.id === id)).filter((a) => !!a).map((a) => phrasing(a, locale)))
  const prompts = turns.some((t) => t.role !== 'note') ? open.map((s) => s.text).filter((q) => !followed.has(q)).slice(0, 6) : []

  return (
    <div className="flex h-full min-h-0" data-testid="expert-workspace" data-expert={e.id}>
      <section className="flex min-w-0 flex-1 flex-col bg-surface" data-testid="expert-chat">
        <header className="flex flex-wrap items-center gap-4 border-b border-line bg-white px-6 py-3">
          <Link to={{ pathname: `/experts/${e.id}`, search: location.search }} className="text-muted hover:text-secondary" aria-label={p(S.allExperts)} data-testid="workspace-back">
            <Back size={20} />
          </Link>
          <ExpertAvatar expert={e} size={48} online />
          <div className="min-w-0">
            <h1 className="truncate text-[1.2rem] font-semibold text-ink" data-testid="workspace-name">
              {p(e.name)} · {p(e.role)}
            </h1>
            <div className="text-[0.8rem] text-muted">{p(team.length ? S.online : S.onlineSolo)}</div>
          </div>
          {team.length > 0 && <TeamRow team={team} expertId={e.id} />}
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <ModelPill />
            {turns.length > 0 && (
              <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.85rem]" onClick={() => clearChat(e.id)} data-testid="new-conversation">
                <RotateCcw size={15} aria-hidden />
                {p(S.newConversation)}
              </button>
            )}
            {pack.bilingual && (
              <Segmented
                value={locale}
                ariaLabel={p(S.language)}
                options={[
                  { value: 'en', label: 'English' },
                  { value: 'ar', label: 'العربية' },
                ]}
                onChange={setLocale}
                testid="workspace-lang"
              />
            )}
            <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.85rem]" onClick={() => setContextOpen(!contextOpen)} aria-pressed={contextOpen} data-testid="context-toggle">
              {contextOpen === !rtl ? <PanelRightClose size={16} aria-hidden /> : <PanelRightOpen size={16} aria-hidden />}
              {p(S.context)}
            </button>
          </div>
        </header>
        <ChatThread expert={e} large onSend={onSend} welcome={<Welcome expert={e} onSend={onSend} />} />
        <Composer expert={e} large prompts={prompts} onSend={onSend} />
      </section>
      {contextOpen && <ContextPanel expert={e} />}
      <AgentExpanded />
    </div>
  )
}
