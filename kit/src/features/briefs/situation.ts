import { activeIncidents, alertsAt, kpisAt } from '../../model/live'
import { formatDate, formatTime } from '../../model/time'
import { kpiPhrase, pick, render, type Pack } from '../../pack'
import type { Action } from '../../store'
import type { Locale } from '../../types'
import { incidentLine, planHeadline, planOutcomeLine } from '../planning/planBrief'
import { S } from '../planning/strings'
import { evaluateAt, money } from '../planning/usePlan'
import type { BriefDoc } from './briefDoc'
import { B } from './strings'

export interface SituationInputs {
  clockMs: number
  budget: number
  windowHours: number
  scenario: number
  actions: Action[]
}

/** The situation at the clock as a brief: incidents, key figures, alerts, the plan and assigned actions. */
export function situationBrief(pack: Pack, s: SituationInputs, locale: Locale): BriefDoc {
  const L = (t: { en: string; ar?: string }) => pick(t, locale)
  const { spec } = pack
  const active = activeIncidents(spec, s.clockMs)
  const zone = pick(spec.clock.zone, locale)
  const view = spec.planning ? evaluateAt(pack, s) : undefined
  const ev = view?.ev
  const status = (a: Action) => L(S[`status-${a.status}`])
  return {
    title: `${L(B.situationBrief)} — ${formatTime(s.clockMs, locale, zone)}`,
    meta: `${formatDate(s.clockMs, locale)} · ${L(spec.customer.name)}`,
    sections: [
      {
        heading: L(B.situation),
        lines: active.length ? active.map((i) => `${incidentLine(pack, i, locale)}. ${render(pack, L(i.incident.impact), locale)}`) : [L(B.noIncidents)],
        list: active.length > 0,
      },
      { heading: L(B.keyFigures), lines: kpisAt(pack, s.clockMs).map((k) => `${L(k.kpi.label)}: ${kpiPhrase(k, locale)}`), list: true },
      { heading: L(B.alerts), lines: alertsAt(spec, s.clockMs).map((a) => `${L(a.title)} — ${render(pack, L(a.text), locale)}`), list: true },
      {
        heading: L(B.plan),
        lines:
          view && ev?.plan.optionIds.length
            ? [planHeadline(view, locale), planOutcomeLine(pack, view, locale), `${L(S.cost)}: ${money(pack, ev.plan.cost, locale)} ${L(S.ofBudget)} ${money(pack, ev.inputs.budget, locale)}`]
            : [],
        list: true,
      },
      { heading: L(B.actions), lines: s.actions.map((a) => `${a.title} — ${a.owner}, ${L(S.due).toLowerCase()} ${formatTime(a.dueMs, locale)} (${status(a)})`), list: true },
      { heading: L(B.note), lines: [spec.planning?.note ? L(spec.planning.note) : L(B.illustrative)] },
    ].filter((x) => x.lines.length),
  }
}
