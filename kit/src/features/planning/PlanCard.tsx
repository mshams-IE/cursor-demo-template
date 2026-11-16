import { AlertTriangle, FileText, Info } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import { docToBody } from '../briefs/briefDoc'
import { AssignButton } from './AssignDialog'
import { OptionRow } from './OptionRow'
import { planBriefSections, planHeadline, planOutcomeLine } from './planBrief'
import { S } from './strings'
import { fullBy, hoursLabel, money, type PlanView } from './usePlan'

function Tile({ label, value, base, good, foot, testid }: { label: string; value: string; base?: string; good?: boolean; foot: string; testid: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3.5" data-testid={testid}>
      <div className="text-[0.78rem] text-muted">{label}</div>
      <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="num whitespace-nowrap text-[1.55rem] font-bold" style={{ color: good ? 'var(--status-normal)' : 'var(--ink)' }}>
          {value}
        </span>
        {base && <span className="num whitespace-nowrap text-[0.8rem] text-muted line-through decoration-muted/40">{base}</span>}
      </div>
      <div className="text-[0.7rem] text-muted">{foot}</div>
    </div>
  )
}

export function PlanCard({ view }: { view: PlanView }) {
  const { pack, p, locale } = useT()
  const navigate = useNavigate()
  const ev = view.ev!
  const planning = pack.spec.planning!
  const chosen = ev.plan.optionIds.map((id) => view.byId.get(id)!).filter(Boolean)
  const vs = p(S.planVsBaseline)
  const createBrief = () => {
    const s = useDemo.getState()
    const site = view.incidents[0] && pack.site(view.incidents[0].incident.siteId)
    s.saveBrief({ title: `${p(S.briefTitle)}${site ? ` — ${p(site.name)}` : ''}`, body: docToBody(planBriefSections(pack, view, locale)) })
    s.showToast(S.briefSaved)
    navigate({ pathname: '/briefs', search: globalThis.location.hash.split('?')[1] ?? '' })
  }
  return (
    <section className="card p-5" data-testid="plan-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-[52rem]">
          <div className="eyebrow">{p(S.recommended)}</div>
          <p className="mt-1 text-[1.2rem] font-bold leading-snug text-ink" data-testid="plan-headline">
            {planHeadline(view, locale)}
          </p>
          {chosen.length > 0 && <p className="num mt-1 text-[0.88rem] text-muted">{planOutcomeLine(pack, view, locale)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <AssignButton options={chosen} />
          <button type="button" className="btn btn-ghost" onClick={createBrief} data-testid="create-brief">
            <FileText size={16} /> {p(S.createBrief)}
          </button>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile testid="plan-delivered" label={p(S.deliveredWithin)} value={fmtNumber(ev.plan.delivered, locale)} base={fmtNumber(ev.baseline.delivered, locale)} good={ev.plan.delivered > ev.baseline.delivered} foot={`${vs} · ${p(planning.benefit.unit)}`} />
        <Tile testid="plan-remaining" label={p(S.remaining)} value={fmtNumber(ev.plan.remaining, locale)} base={fmtNumber(ev.baseline.remaining, locale)} good={ev.plan.remaining < ev.baseline.remaining} foot={`${vs} · ${locale === 'ar' ? 'من' : 'of'} ${fmtNumber(ev.total, locale)}`} />
        <Tile testid="plan-cost" label={p(S.cost)} value={money(pack, ev.plan.cost, locale)} foot={`${p(S.ofBudget)} ${money(pack, ev.inputs.budget, locale)}`} />
        <Tile testid="plan-full-by" label={p(S.fullBy)} value={chosen.length ? hoursLabel(fullBy(ev, view.byId), locale) : '—'} foot={`${p(S.window)}: ${hoursLabel(ev.inputs.windowHours, locale)}`} />
      </div>
      {chosen.length > 0 && (
        <ul className="mt-4 space-y-2">
          {chosen.map((o, i) => (
            <OptionRow key={o.id} option={o} benefit={Math.round(ev.effective[o.id] ?? 0)} defaultOpen={i === 0} />
          ))}
        </ul>
      )}
      {ev.budgetUnused && (
        <div className="mt-4 flex gap-2 rounded-xl bg-surface-2 px-4 py-3 text-[0.88rem] text-ink" data-testid="budget-unused">
          <Info size={18} className="mt-0.5 shrink-0 text-secondary" />
          {p(S.budgetUnused)} ({money(pack, ev.inputs.budget - ev.plan.cost, locale)})
        </div>
      )}
      {planning.note && (
        <div className="mt-3 flex gap-2 rounded-xl border border-watch/40 bg-watch-soft px-4 py-2.5 text-[0.82rem] text-[#7a4d00]" data-testid="plan-note">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {p(planning.note)}
        </div>
      )}
    </section>
  )
}
