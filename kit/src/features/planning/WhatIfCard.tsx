import { AlertTriangle, Gauge as GaugeIcon, SlidersHorizontal } from 'lucide-react'
import { useDeferredValue, useMemo } from 'react'
import { CountUp } from '../../components/ui'
import { useT } from '../../i18n'
import { whatIfAt } from '../../model/planning'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import type { Planning, WhatIf } from '../../types'
import { S } from './strings'

type State = 'ok' | 'alarm' | 'trip'
const TONE: Record<State, string> = { ok: 'var(--status-normal)', alarm: 'var(--status-watch)', trip: 'var(--status-critical)' }
const STATE_LABEL: Record<State, keyof typeof S> = { ok: 'ok', alarm: 'alarm', trip: 'tripState' }

function Reading({ r, value, state }: { r: WhatIf['readings'][number]; value: number; state: State }) {
  const { p, locale } = useT()
  const d = r.decimals ?? 1
  const top = Math.max(r.trip ?? 0, r.limit ?? 0, r.base) * 1.15
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / top) * 100))}%`
  const marks = [
    ...(r.limit !== undefined ? [{ at: r.limit, label: `${p(S.limit)} ${fmtNumber(r.limit, locale, d % 1 ? d : 0)}` }] : []),
    ...(r.trip !== undefined ? [{ at: r.trip, label: `${p(S.trip)} ${fmtNumber(r.trip, locale, d % 1 ? d : 0)}` }] : []),
  ]
  return (
    <div className="min-w-0" data-testid="whatif-reading" data-state={state}>
      <div className="flex items-baseline justify-between gap-2 text-[0.84rem]">
        <span className="flex min-w-0 items-center gap-1.5 font-medium leading-tight text-ink">
          <GaugeIcon size={14} className="shrink-0 text-muted" />
          {p(r.label)}
        </span>
        <span className="num whitespace-nowrap text-[1.25rem] font-bold" style={{ color: TONE[state] }}>
          <CountUp value={value} durationMs={600} format={(n) => fmtNumber(n, locale, d)} /> {p(r.unit)}
        </span>
      </div>
      <div className="relative mt-2 h-3 rounded-full bg-surface-2" dir="ltr">
        <div className="h-full rounded-full transition-[width] duration-500" style={{ width: pct(value), background: TONE[state] }} />
        {marks.map((m) => (
          <div key={m.label} className="absolute -top-1 h-5 w-0.5 bg-ink/70" style={{ left: pct(m.at) }} />
        ))}
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[0.72rem] text-muted">
        {marks.map((m) => (
          <span key={m.label} className="num flex items-center gap-1">
            <span className="inline-block h-2.5 w-0.5 bg-ink/70" />
            {m.label}
          </span>
        ))}
        <span className="ms-auto font-semibold" style={{ color: TONE[state] }}>
          {p(S[STATE_LABEL[state]])}
        </span>
      </div>
    </div>
  )
}

export function WhatIfCard({ planning }: { planning: Planning }) {
  const { p, locale } = useT()
  const input = useDemo((s) => s.whatIfInput)
  const setPlanning = useDemo((s) => s.setPlanning)
  const deferred = useDeferredValue(input)
  const w = planning.whatIf
  const out = useMemo(() => whatIfAt(planning, deferred), [planning, deferred])
  if (!w || !out) return null
  const tripped = out.readings.some((r) => r.state === 'trip')
  const moved = input !== w.input.min
  const unit = p(w.impact.unit)
  return (
    <section className={`card @container overflow-hidden transition-shadow ${tripped ? 'ring-2 ring-critical/40' : ''}`} data-testid="whatif-card">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="eyebrow">{p(S.whatIf)}</span>
          <span className="chip bg-surface-2 text-secondary" data-testid="whatif-trigger">
            {p(S.trigger)}: {p(w.trigger)}
          </span>
        </div>
        <h3 className="mt-1 text-[1.15rem] font-bold text-ink">{p(w.title)}</h3>
        <p className="mt-0.5 text-[0.84rem] text-muted">{p(w.description)}</p>
      </div>
      <div className="grid gap-6 px-5 py-5 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="grid content-start gap-5">
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="whatif-input" className="flex items-center gap-1.5 font-medium text-ink">
                <SlidersHorizontal size={15} className="text-watch" />
                {p(w.input.label)}
              </label>
              <span className="num whitespace-nowrap text-[1.2rem] font-bold" style={{ color: moved ? '#8a6100' : 'var(--ink)' }} data-testid="whatif-value">
                {input > 0 ? '+' : ''}
                {fmtNumber(input, locale, w.input.step % 1 ? 1 : 0)} {p(w.input.unit)}
              </span>
            </div>
            <input id="whatif-input" type="range" min={w.input.min} max={w.input.max} step={w.input.step} value={input} onChange={(e) => setPlanning({ whatIfInput: Number(e.target.value) })} className="mt-2 w-full accent-[var(--status-watch)]" dir="ltr" data-testid="whatif-slider" />
          </div>
          {out.readings.map((r) => (
            <Reading key={r.reading.label.en} r={r.reading} value={r.value} state={r.state} />
          ))}
          {tripped && (
            <div className="flex gap-2 rounded-xl bg-critical-soft px-3 py-2.5 text-[0.84rem] text-critical" data-testid="whatif-warning">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {p(S.atTrip)}
            </div>
          )}
        </div>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className={`rounded-2xl border-2 p-4 transition-all duration-500 ${moved ? 'opacity-50' : ''}`} style={{ borderColor: moved ? 'var(--line)' : 'var(--brand-secondary)' }}>
              <div className="eyebrow !text-secondary">{p(S.current)}</div>
              <div className="num mt-2 text-[1.9rem] font-bold leading-tight text-ink">{fmtNumber(w.impact.current, locale)}</div>
              <div className="text-[0.76rem] text-muted">{unit}</div>
            </div>
            <div className={`rounded-2xl border-2 p-4 transition-all duration-500 ${moved ? '' : 'opacity-50'}`} style={{ borderColor: moved ? 'var(--status-critical)' : 'var(--line)' }}>
              <div className="eyebrow !text-critical">{p(S.withScenario)}</div>
              <div className="num mt-2 text-[1.9rem] font-bold leading-tight text-ink" data-testid="whatif-impact">
                <CountUp value={out.impact} durationMs={900} format={(n) => fmtNumber(n, locale)} />
              </div>
              <div className="text-[0.76rem] text-muted">{unit}</div>
            </div>
          </div>
          <p className="rounded-2xl bg-surface p-3.5 text-[0.88rem] text-ink" data-testid="whatif-impact-line">
            {p(w.impact.label)}: <span className="num font-semibold">{fmtNumber(out.impact, locale)}</span> {unit}
            {out.impact !== w.impact.current && (
              <span className="num ms-2 font-semibold" style={{ color: out.impact > w.impact.current ? 'var(--status-critical)' : 'var(--status-normal)' }}>
                ({out.impact > w.impact.current ? '+' : '−'}
                {fmtNumber(Math.abs(out.impact - w.impact.current), locale)})
              </span>
            )}
          </p>
          <p className="text-[0.74rem] leading-relaxed text-muted">{p(S.screening)}</p>
        </div>
      </div>
    </section>
  )
}
