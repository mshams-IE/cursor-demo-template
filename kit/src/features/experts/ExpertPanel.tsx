import { Maximize2 } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useT } from '../../i18n'
import { useDemo } from '../../store'
import { currentExpert, phrasing } from './catalog'
import { ChatThread, Composer, useChat, useOpenStarters, useSend } from './chat'
import { ExpertAvatar } from './ExpertAvatar'
import { ModelPill } from './ModelPill'
import { S } from './strings'

/** Compact chat with the current expert, beside the investigation pages. */
export function ExpertPanel() {
  const { pack, p, locale } = useT()
  const navigate = useNavigate()
  const { search } = useLocation()
  const expert = currentExpert(pack.spec, useDemo((s) => s.expertId))
  const regionId = useDemo((s) => s.regionId)
  const siteId = useDemo((s) => s.siteId)
  const report = useDemo((s) => s.mode === 'report')
  const turns = useChat(expert?.id)
  const send = useSend(expert?.id ?? '')
  const open = useOpenStarters(expert ?? pack.spec.experts[0], 8)
  if (!expert) return null
  const last = turns.findLast((t) => t.role === 'expert' && t.answerId)
  const answer = last ? expert.answers.find((a) => a.id === last.answerId) : undefined
  const follow = (answer?.followUps ?? []).map((id) => expert.answers.find((a) => a.id === id)).filter((a) => !!a).map((a) => phrasing(a, locale))
  const prompts = [...follow, ...open.map((s) => s.text)].filter((q, i, all) => all.indexOf(q) === i).slice(0, 6)
  const site = siteId ? pack.site(siteId) : undefined
  return (
    <section className="flex min-h-0 flex-1 flex-col" data-testid="expert-panel" data-expert={expert.id}>
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <ExpertAvatar expert={expert} size={40} online />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[1.02rem] font-semibold text-ink" data-testid="panel-expert-name">
            {p(expert.name)} · {p(expert.role)}
          </h2>
          <div className="flex items-center gap-1.5 text-[0.72rem] text-muted">
            <span className="truncate">
              {p(S.scope)}: {report ? p(S.todaysReport) : site ? p(site.name) : regionId ? pack.regionName(regionId, locale) : p(S.whole)}
            </span>
            <ModelPill compact />
          </div>
        </div>
        <button type="button" className="btn btn-ghost !px-3 !py-1.5 !text-[0.8rem]" onClick={() => navigate({ pathname: `/experts/${expert.id}/chat`, search })} data-testid="panel-open-chat">
          <Maximize2 size={14} aria-hidden />
          {p(S.openChat)}
        </button>
      </header>
      <ChatThread expert={expert} onSend={(q) => void send(q)} welcome={<div className="rounded-2xl bg-surface p-4 text-[0.88rem] leading-relaxed text-body">{p(expert.intro ?? expert.greeting ?? expert.focus)}</div>} />
      <Composer expert={expert} prompts={prompts} placeholder={p(S.askExpert)} onSend={(q) => void send(q)} />
    </section>
  )
}
