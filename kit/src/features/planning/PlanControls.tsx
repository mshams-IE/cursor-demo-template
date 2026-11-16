import { Card, Segmented } from '../../components/ui'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import type { Planning } from '../../types'
import { S } from './strings'
import { hoursLabel, money } from './usePlan'

function Slider({ id, label, value, display, min, max, step, onChange, testid, tone }: { id: string; label: string; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void; testid: string; tone?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="font-medium text-ink">
          {label}
        </label>
        <span className="num text-[1.7rem] font-bold leading-none" style={{ color: tone ?? 'var(--brand-secondary)' }} data-testid={`${testid}-value`}>
          {display}
        </span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-3 w-full accent-[var(--brand-secondary)]" dir="ltr" data-testid={testid} />
    </div>
  )
}

function Presets({ values, value, label, onPick, testid }: { values: number[]; value: number; label: (v: number) => string; onPick: (v: number) => void; testid: string }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {values.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={v === value}
          className={`chip num cursor-pointer border !px-3 !py-1 ${v === value ? 'border-secondary bg-secondary text-white' : 'border-line bg-white text-ink hover:bg-surface-2'}`}
          onClick={() => onPick(v)}
          data-testid={`${testid}-${v}`}
        >
          {label(v)}
        </button>
      ))}
    </div>
  )
}

export function PlanControls({ planning }: { planning: Planning }) {
  const { pack, p, locale } = useT()
  const budget = useDemo((s) => s.budget)
  const windowHours = useDemo((s) => s.windowHours)
  const scenario = useDemo((s) => s.scenario)
  const setPlanning = useDemo((s) => s.setPlanning)
  const b = planning.budget
  const sc = planning.scenario
  const scenarioText = (v: number) => `${v > 0 ? '+' : ''}${fmtNumber(v, locale)}${p(sc?.unit)}`
  return (
    <Card title={p(S.assumptions)} testid="plan-controls">
      <div className="space-y-6">
        <div>
          <Slider id="plan-budget" label={p(S.budget)} value={budget} display={money(pack, budget, locale)} min={b.min} max={b.max} step={b.step} onChange={(v) => setPlanning({ budget: v })} testid="budget-slider" />
          <div className="num mt-1 flex justify-between text-[0.72rem] text-muted" dir="ltr">
            <span>{fmtNumber(b.min, locale, b.decimals ?? 0)}</span>
            <span>{fmtNumber(b.max, locale, b.decimals ?? 0)}</span>
          </div>
          <Presets values={b.presets} value={budget} label={(v) => money(pack, v, locale)} onPick={(v) => setPlanning({ budget: v })} testid="budget-preset" />
        </div>
        <div>
          <div className="mb-2 font-medium text-ink">{p(S.window)}</div>
          <Segmented ariaLabel={p(S.window)} value={String(windowHours)} onChange={(v) => setPlanning({ windowHours: Number(v) })} options={planning.windows.map((h) => ({ value: String(h), label: hoursLabel(h, locale) }))} testid="window" />
        </div>
        {sc && (
          <div>
            <Slider id="plan-scenario" label={p(sc.label)} value={scenario} display={scenarioText(scenario)} min={sc.min} max={sc.max} step={sc.step} onChange={(v) => setPlanning({ scenario: v })} testid="scenario-slider" tone={scenario > sc.min ? 'var(--status-watch)' : 'var(--ink)'} />
            <Presets values={sc.presets} value={scenario} label={scenarioText} onPick={(v) => setPlanning({ scenario: v })} testid="scenario-preset" />
          </div>
        )}
      </div>
    </Card>
  )
}
