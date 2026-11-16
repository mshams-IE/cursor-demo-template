import type { DemoSpec, PlanOption, Planning } from '../types'
import { activeIncidents } from './live'

export interface PlanInputs {
  budget: number
  windowHours: number
  scenario: number
  clockMs: number
}

export type ExclusionReason = 'over_budget' | 'outside_window' | 'no_benefit' | 'review'

export interface PlanOutcome {
  optionIds: string[]
  cost: number
  /** Benefit delivered within the window. */
  delivered: number
  remaining: number
  /** Cumulative benefit by hour, for the restoration curve. */
  curve: { hour: number; delivered: number }[]
}

export interface PlanEvaluation {
  inputs: PlanInputs
  options: PlanOption[]
  /** Benefit of each option after the scenario is applied. */
  effective: Record<string, number>
  total: number
  baseline: PlanOutcome
  plan: PlanOutcome
  excluded: { optionId: string; reason: ExclusionReason }[]
  budgetCurve: { budget: number; delivered: number; cost: number }[]
  /** True when the plan leaves budget unused because nothing else helps. */
  budgetUnused: boolean
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d

export function planOptions(spec: DemoSpec, clockMs: number): PlanOption[] {
  const p = spec.planning
  if (!p) return []
  const ids = p.incidentIds ?? activeIncidents(spec, clockMs).map((i) => i.incident.id)
  return p.options.filter((o) => !o.incidentId || ids.includes(o.incidentId))
}

export function totalAffected(spec: DemoSpec, p: Planning, clockMs: number): number {
  if (p.baseline !== undefined) return p.baseline
  const ids = p.incidentIds ?? activeIncidents(spec, clockMs).map((i) => i.incident.id)
  return spec.incidents.filter((i) => ids.includes(i.id)).reduce((a, i) => a + (i.affected?.value ?? 0), 0)
}

function outcome(chosen: PlanOption[], effective: Record<string, number>, total: number, windowHours: number, curveHours: number[]): PlanOutcome {
  const deliveredBy = (h: number) => Math.min(total || Infinity, chosen.filter((o) => o.hours[1] <= h).reduce((a, o) => a + effective[o.id], 0))
  const delivered = deliveredBy(windowHours)
  return {
    optionIds: chosen.map((o) => o.id),
    cost: round(chosen.reduce((a, o) => a + o.cost, 0)),
    delivered: Math.round(delivered),
    remaining: Math.max(0, Math.round(total - delivered)),
    curve: curveHours.map((hour) => ({ hour, delivered: Math.round(deliveredBy(hour)) })),
  }
}

function better(a: PlanOutcome, b: PlanOutcome) {
  if (a.delivered !== b.delivered) return a.delivered > b.delivered
  return a.cost < b.cost
}

function optimise(options: PlanOption[], effective: Record<string, number>, total: number, windowHours: number, budget: number, curveHours: number[]) {
  const usable = options.filter((o) => effective[o.id] > 0 && o.hours[1] <= windowHours).slice(0, 16)
  let best = outcome([], effective, total, windowHours, curveHours)
  for (let mask = 1; mask < 1 << usable.length; mask++) {
    const chosen = usable.filter((_, i) => mask & (1 << i))
    if (chosen.reduce((a, o) => a + o.cost, 0) > budget + 1e-9) continue
    const out = outcome(chosen, effective, total, windowHours, curveHours)
    if (better(out, best)) best = out
  }
  return best
}

export function evaluatePlan(spec: DemoSpec, inputs: PlanInputs): PlanEvaluation | undefined {
  const p = spec.planning
  if (!p) return undefined
  const options = planOptions(spec, inputs.clockMs)
  const effective = Object.fromEntries(options.map((o) => [o.id, Math.max(0, o.benefit * (1 - (o.sensitivity ?? 0) * inputs.scenario))]))
  const total = totalAffected(spec, p, inputs.clockMs)
  const maxHours = Math.max(inputs.windowHours, ...p.windows, ...options.map((o) => o.hours[1]))
  const curveHours = [...new Set([0, 1, 2, 3, 4, 6, 8, 12, 16, 24, 36, 48, 72].filter((h) => h <= maxHours).concat(inputs.windowHours, ...options.map((o) => o.hours[1]).filter((h) => h <= 72)))].sort((a, b) => a - b)
  const plan = optimise(options, effective, total, inputs.windowHours, inputs.budget, curveHours)
  const baseline = outcome([], effective, total, inputs.windowHours, curveHours)
  const left = inputs.budget - plan.cost
  const excluded: PlanEvaluation['excluded'] = options
    .filter((o) => !plan.optionIds.includes(o.id))
    .map((o) => ({
      optionId: o.id,
      reason: o.hours[1] > inputs.windowHours ? 'outside_window' : effective[o.id] <= 0 ? 'no_benefit' : o.cost > left + 1e-9 ? 'over_budget' : 'no_benefit',
    }))
  const steps = 8
  const budgetCurve = Array.from({ length: steps + 1 }, (_, i) => {
    const b = round(p.budget.min + ((p.budget.max - p.budget.min) * i) / steps)
    const o = optimise(options, effective, total, inputs.windowHours, b, curveHours)
    return { budget: b, delivered: o.delivered, cost: o.cost }
  })
  return { inputs, options, effective, total, baseline, plan, excluded, budgetCurve, budgetUnused: left > (p.budget.max - p.budget.min) / 20 && excluded.every((e) => e.reason !== 'over_budget') }
}

export function whatIfAt(p: Planning, input: number) {
  const w = p.whatIf
  if (!w) return undefined
  const readings = w.readings.map((r) => {
    const value = round(r.base + r.perUnit * input, r.decimals ?? 1)
    const state = r.trip !== undefined && value >= r.trip ? 'trip' : r.limit !== undefined && value >= r.limit ? 'alarm' : 'ok'
    return { reading: r, value, state: state as 'ok' | 'alarm' | 'trip' }
  })
  const share = w.input.max === w.input.min ? 1 : (input - w.input.min) / (w.input.max - w.input.min)
  const impact = Math.round(w.impact.current + (w.impact.after - w.impact.current) * share)
  return { readings, impact }
}
