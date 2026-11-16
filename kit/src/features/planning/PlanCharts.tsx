import { Area, Bar, CartesianGrid, Cell, ComposedChart, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card } from '../../components/ui'
import { useT } from '../../i18n'
import type { PlanEvaluation } from '../../model/planning'
import { fmtNumber } from '../../pack'
import { S } from './strings'
import { compact, hoursLabel, money } from './usePlan'

const AXIS = { fontSize: 11, fill: 'var(--muted)' }

export function RestorationCurve({ ev }: { ev: PlanEvaluation }) {
  const { p, locale } = useT()
  const all = ev.plan.curve.map((pt, i) => ({ hour: pt.hour, plan: pt.delivered, baseline: ev.baseline.curve[i]?.delivered ?? 0 }))
  const maxHour = Math.min(all[all.length - 1]?.hour ?? ev.inputs.windowHours, Math.max(24, ev.inputs.windowHours * 2))
  const data = all.filter((d) => d.hour <= maxHour)
  return (
    <Card title={p(S.restorationCurve)} testid="restoration-curve">
      <div className="h-64" dir="ltr">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--surface-2)" vertical={false} />
            <XAxis dataKey="hour" type="number" domain={[0, maxHour]} tick={AXIS} tickFormatter={(v: number) => hoursLabel(v, locale)} />
            <YAxis tick={AXIS} tickFormatter={(v: number) => compact(v)} domain={[0, Math.max(ev.total, 1)]} width={44} />
            <Tooltip formatter={(v) => fmtNumber(Number(v), locale)} labelFormatter={(v) => hoursLabel(Number(v), locale)} />
            <ReferenceLine x={ev.inputs.windowHours} stroke="var(--brand-accent)" strokeDasharray="4 4" label={{ value: p(S.windowMark), fontSize: 10, fill: 'var(--brand-accent)', position: 'insideTopRight' }} />
            <ReferenceLine y={ev.total} stroke="var(--line)" />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="stepAfter" dataKey="baseline" name={p(S.baseline)} stroke="var(--muted)" strokeDasharray="5 4" fill="transparent" strokeWidth={2} isAnimationActive={false} />
            <Area type="stepAfter" dataKey="plan" name={p(S.plan)} stroke="var(--brand-secondary)" fill="var(--brand-secondary)" fillOpacity={0.14} strokeWidth={3} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

export function BudgetCurve({ ev }: { ev: PlanEvaluation }) {
  const { pack, p, locale } = useT()
  const decimals = pack.spec.planning?.budget.decimals ?? 0
  const near = ev.budgetCurve.reduce((best, pt) => (Math.abs(pt.budget - ev.inputs.budget) < Math.abs(best.budget - ev.inputs.budget) ? pt : best), ev.budgetCurve[0])
  return (
    <Card title={p(S.budgetCurve)} testid="budget-curve">
      <div className="h-64" dir="ltr">
        <ResponsiveContainer>
          <ComposedChart data={ev.budgetCurve} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--surface-2)" vertical={false} />
            <XAxis dataKey="budget" tick={AXIS} tickFormatter={(v: number) => fmtNumber(v, locale, decimals)} />
            <YAxis tick={AXIS} tickFormatter={(v: number) => compact(v)} width={44} />
            <Tooltip formatter={(v) => fmtNumber(Number(v), locale)} labelFormatter={(v) => money(pack, Number(v), locale)} />
            <ReferenceLine x={near?.budget} stroke="var(--brand-accent)" strokeDasharray="4 4" label={{ value: p(S.currentBudget), fontSize: 10, fill: 'var(--brand-accent)', position: 'insideTopRight' }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="delivered" name={p(S.deliveredWithin)} radius={[4, 4, 0, 0]} isAnimationActive={false} fill="var(--brand-secondary)">
              {ev.budgetCurve.map((pt) => (
                <Cell key={pt.budget} fill="var(--brand-secondary)" fillOpacity={pt.budget <= ev.inputs.budget + 1e-9 ? 1 : 0.35} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}
