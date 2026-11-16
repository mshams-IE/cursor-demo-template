import { ArrowLeft, ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { useEffect } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { RobotAvatar } from '../features/agents/RobotAvatar'
import { expertById, isAvailable, stageIndex, starters, teamOf } from '../features/experts/catalog'
import { ExpertAvatar } from '../features/experts/ExpertAvatar'
import { S } from '../features/experts/strings'
import { useT } from '../i18n'
import { useDemo } from '../store'

export function ExpertIntro() {
  const { expertId } = useParams()
  const { pack, p, locale, rtl } = useT()
  const navigate = useNavigate()
  const { search } = useLocation()
  const report = useDemo((s) => s.mode === 'report')
  const openExpert = useDemo((s) => s.openExpert)
  const e = expertById(pack.spec, expertId)
  useEffect(() => {
    if (e && isAvailable(e)) openExpert(e.id)
  }, [e, openExpert])
  if (!e || !isAvailable(e)) return <Navigate to={{ pathname: '/', search }} replace />
  const Back = rtl ? ArrowRight : ArrowLeft
  const Next = rtl ? ArrowLeft : ArrowRight
  const team = report ? [] : teamOf(pack.spec, e)
  const questions = starters(e, locale, 4)
  const chat = `/experts/${e.id}/chat`
  const ask = (q: string) => {
    navigate({ pathname: chat, search }, { state: { ask: q } })
  }

  return (
    <div className="flex min-h-full flex-col items-center px-6 py-6" data-testid="expert-intro">
      <Link to={{ pathname: '/', search }} className="self-start text-[0.95rem] font-semibold text-secondary hover:underline" data-testid="intro-back">
        <Back size={16} className="me-1 inline" aria-hidden />
        {p(S.allExperts)}
      </Link>
      <div className="mt-2 flex w-full max-w-[60rem] flex-col items-center text-center">
        <div className="relative">
          <span className="block rounded-full shadow-[0_18px_40px_-18px_rgb(18_0_70/0.45)] ring-4 ring-white">
            <ExpertAvatar expert={e} size={144} />
          </span>
          <span className="absolute bottom-3 end-3 h-5 w-5 rounded-full bg-ok ring-4 ring-white" aria-label={p(S.available)} data-testid="intro-online" />
        </div>
        <div className="eyebrow mt-4 !text-secondary">{p(S.digitalExpert)}</div>
        <h1 className="mt-1 text-[clamp(2rem,2.6vw,2.7rem)] font-semibold leading-tight tracking-tight text-ink" data-testid="intro-name">
          {p(e.name)} · {p(e.role)}
        </h1>
        {pack.spec.org && <div className="mt-1 text-[0.95rem] text-muted">{p(pack.spec.org)}</div>}
        <p className="mt-3 max-w-[46rem] text-[1.1rem] leading-relaxed text-body">{p(e.intro ?? e.focus)}</p>

        {team.length > 0 && (
          <div className="card mt-6 w-full p-5" data-testid="intro-team">
            <div className="eyebrow">{p(S.myTeam)}</div>
            <ul className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-4">
              {team.map((s) => (
                <li key={s.id} className="flex w-28 flex-col items-center gap-2 text-center" title={p(s.role)}>
                  <RobotAvatar specialist={s} index={stageIndex(pack.spec, s.id)} size={52} />
                  <span className="text-[0.8rem] font-semibold leading-tight text-ink">{p(s.name)}</span>
                  <span className="line-clamp-3 text-[0.72rem] leading-snug text-muted">{p(s.role)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.88rem] text-muted">{p(S.teamHint)}</p>
          </div>
        )}

        {questions.length > 0 && (
          <div className="mt-6 w-full text-start" data-testid="intro-starters">
            <div className="eyebrow mb-2 text-center">{p(S.youCanAsk)}</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {questions.map((q, i) => (
                <button key={q.id} type="button" onClick={() => ask(q.text)} className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3 text-start text-[0.95rem] font-medium text-ink transition hover:border-secondary hover:text-secondary" data-testid={`intro-starter-${i}`}>
                  <MessageCircleQuestion size={16} className="shrink-0 text-secondary" aria-hidden />
                  {q.text}
                </button>
              ))}
            </div>
          </div>
        )}

        <Link to={{ pathname: chat, search }} className="btn btn-primary mt-6 !px-8 !py-3 !text-[1.05rem]" data-testid="start-conversation">
          {p(S.start)}
          <Next size={18} aria-hidden />
        </Link>
        <p className="mt-4 text-[0.85rem] text-muted">{p(pack.bilingual ? S.bilingual : S.english)}</p>
      </div>
    </div>
  )
}
