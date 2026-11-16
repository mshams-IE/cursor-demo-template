import { Check, ChevronDown, Info, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useT } from '../../i18n'
import type { ExclusionReason } from '../../model/planning'
import { formatHoursRange } from '../../model/time'
import { fmtNumber } from '../../pack'
import type { PlanOption } from '../../types'
import { S } from './strings'
import { money } from './usePlan'

const REASON: Record<ExclusionReason, keyof typeof S> = { over_budget: 'over_budget', outside_window: 'outside_window', no_benefit: 'no_benefit', review: 'review_reason' }

export function OptionRow({ option, benefit, reason, defaultOpen = false }: { option: PlanOption; benefit: number; reason?: ExclusionReason; defaultOpen?: boolean }) {
  const { pack, p, locale } = useT()
  const [open, setOpen] = useState(defaultOpen)
  const inPlan = !reason
  const unit = p(pack.spec.planning?.benefit.unit)
  const status = inPlan
    ? { label: p(S.selected), bg: 'var(--status-normal-soft)', fg: '#0a7a55' }
    : reason === 'no_benefit'
      ? { label: p(S[REASON[reason]]), bg: 'var(--surface-2)', fg: 'var(--muted)' }
      : { label: p(S[REASON[reason]]), bg: 'var(--status-watch-soft)', fg: '#8a6100' }
  const hasDetail = !!(option.measures?.length || option.constraints?.length)
  return (
    <li className={`rounded-2xl border ${inPlan ? 'border-ok/50 bg-[color-mix(in_srgb,var(--status-normal)_5%,white)]' : 'border-line bg-white'}`} data-testid={`plan-option-${option.id}`} data-in-plan={inPlan}>
      <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-start" onClick={() => setOpen((o) => !o)} aria-expanded={open} disabled={!hasDetail}>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: status.bg, color: status.fg }}>
          {inPlan ? <Check size={15} /> : <Info size={15} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.95rem] font-semibold leading-snug text-ink">{p(option.title)}</span>
          <span className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.78rem] text-muted">
            <span className="num">{money(pack, option.cost, locale)}</span>
            <span className="num">{formatHoursRange(option.hours, locale)}</span>
            {benefit > 0 && (
              <span className="num">
                {fmtNumber(benefit, locale)} {unit}
              </span>
            )}
            {option.requiresReview && (
              <span className="inline-flex items-center gap-1 font-semibold text-secondary" data-testid="requires-review">
                <ShieldAlert size={12} /> {p(S.review)}
              </span>
            )}
          </span>
        </span>
        <span className="chip shrink-0" style={{ background: status.bg, color: status.fg }}>
          {status.label}
        </span>
        {hasDetail && <ChevronDown size={16} className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && hasDetail && (
        <div className="grid gap-4 border-t border-line px-4 py-3 text-[0.84rem] md:grid-cols-2">
          {!!option.measures?.length && (
            <div>
              <div className="eyebrow mb-1">{p(S.measures)}</div>
              <ul className="list-disc space-y-0.5 ps-5 text-body">
                {option.measures.map((m, i) => (
                  <li key={i}>{p(m)}</li>
                ))}
              </ul>
            </div>
          )}
          {!!option.constraints?.length && (
            <div>
              <div className="eyebrow mb-1">{p(S.constraints)}</div>
              <ul className="list-disc space-y-0.5 ps-5 text-muted">
                {option.constraints.map((m, i) => (
                  <li key={i}>{p(m)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  )
}
