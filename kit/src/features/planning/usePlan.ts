import { useDeferredValue, useMemo } from 'react'
import { useT } from '../../i18n'
import { activeIncidents, incidentAt, type LiveIncident } from '../../model/live'
import { evaluatePlan, type PlanEvaluation } from '../../model/planning'
import { MINUTE } from '../../model/time'
import { fmtNumber, pick, type Pack } from '../../pack'
import { useDemo } from '../../store'
import type { Locale, PlanOption } from '../../types'

export interface PlanView {
  ev?: PlanEvaluation
  incidents: LiveIncident[]
  byId: Map<string, PlanOption>
  minute: number
}

export function plannedIncidents(pack: Pack, clockMs: number): LiveIncident[] {
  const ids = pack.spec.planning?.incidentIds
  if (!ids) return activeIncidents(pack.spec, clockMs)
  return pack.spec.incidents.filter((i) => ids.includes(i.id)).map((i) => incidentAt(i, clockMs))
}

export function evaluateAt(pack: Pack, s: { budget: number; windowHours: number; scenario: number; clockMs: number }): PlanView {
  const minute = Math.floor(s.clockMs / MINUTE) * MINUTE
  const ev = evaluatePlan(pack.spec, { budget: s.budget, windowHours: s.windowHours, scenario: s.scenario, clockMs: minute })
  return { ev, incidents: plannedIncidents(pack, minute), byId: new Map((pack.spec.planning?.options ?? []).map((o) => [o.id, o])), minute }
}

export function usePlan(): PlanView {
  const { pack } = useT()
  const budget = useDeferredValue(useDemo((s) => s.budget))
  const scenario = useDeferredValue(useDemo((s) => s.scenario))
  const windowHours = useDemo((s) => s.windowHours)
  const minute = Math.floor(useDemo((s) => s.clockMs) / MINUTE) * MINUTE
  return useMemo(() => evaluateAt(pack, { budget, windowHours, scenario, clockMs: minute }), [pack, budget, windowHours, scenario, minute])
}

export function money(pack: Pack, value: number, locale: Locale) {
  const b = pack.spec.planning?.budget
  const unit = pick(b?.unit, locale)
  return `${fmtNumber(value, locale, b?.decimals ?? 0)} ${unit}`
}

export function hoursLabel(h: number, locale: Locale) {
  return locale === 'ar' ? `${fmtNumber(h, locale, h % 1 ? 1 : 0)} ساعة` : `${fmtNumber(h, locale, h % 1 ? 1 : 0)} h`
}

/** Chart axes stay in Latin compact form ("12K") in both languages; the SVG axis is laid out left to right. */
export const compact = (n: number) => n.toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 })

/** Hour by which every chosen option has delivered. */
export const fullBy = (ev: PlanEvaluation, byId: Map<string, PlanOption>) => Math.max(0, ...ev.plan.optionIds.map((id) => byId.get(id)?.hours[1] ?? 0))
