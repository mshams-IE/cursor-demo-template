import type { BriefSection } from '../briefs/briefDoc'
import { formatHoursRange, formatTime } from '../../model/time'
import { fmtNumber, pick, render, type Pack } from '../../pack'
import type { Locale } from '../../types'
import { S } from './strings'
import { fullBy, hoursLabel, money, type PlanView } from './usePlan'

export function incidentLine(pack: Pack, i: PlanView['incidents'][number], locale: Locale) {
  const title = pick(i.incident.title, locale)
  const site = pack.site(i.incident.siteId)
  const name = site ? pick(site.name, locale) : ''
  const where = site ? (title.includes(name) ? ` (${pack.regionName(site.regionId, locale)})` : ` — ${name}, ${pack.regionName(site.regionId, locale)}`) : ''
  return `${title}${where} · ${locale === 'ar' ? 'منذ' : 'since'} ${formatTime(i.startedMs, locale)}`
}

export function planHeadline(view: PlanView, locale: Locale) {
  const ev = view.ev
  if (!ev?.plan.optionIds.length) return pick(S.nothingFits, locale)
  return ev.plan.optionIds.map((id) => pick(view.byId.get(id)?.title, locale)).join(' + ')
}

export function planOutcomeLine(pack: Pack, view: PlanView, locale: Locale) {
  const ev = view.ev!
  const unit = pick(pack.spec.planning?.benefit.unit, locale)
  const w = hoursLabel(ev.inputs.windowHours, locale)
  const by = hoursLabel(fullBy(ev, view.byId), locale)
  const d = fmtNumber(ev.plan.delivered, locale)
  const t = fmtNumber(ev.total, locale)
  return locale === 'ar' ? `تحقق ${d} من ${t} ${unit} خلال ${w} · الاكتمال بحلول نحو ${by}` : `Delivers ${d} of ${t} ${unit} within ${w} · fully delivered by about ${by}`
}

/** A brief of the current plan in one locale, for Executive Briefs. */
export function planBriefSections(pack: Pack, view: PlanView, locale: Locale): BriefSection[] {
  const ev = view.ev
  const planning = pack.spec.planning
  if (!ev || !planning) return []
  const L = (t: { en: string; ar?: string }) => pick(t, locale)
  const chosen = ev.plan.optionIds.map((id) => view.byId.get(id)!).filter(Boolean)
  const unit = L(planning.benefit.unit)
  const scenario = planning.scenario && ev.inputs.scenario !== planning.scenario.min ? `${L(planning.scenario.label)}: ${fmtNumber(ev.inputs.scenario, locale)}${L(planning.scenario.unit)}` : undefined
  return [
    { heading: L(S.situation), lines: view.incidents.map((i) => `${incidentLine(pack, i, locale)}. ${render(pack, L(i.incident.impact), locale)}`), list: true },
    {
      heading: L(S.recommendation),
      lines: chosen.length
        ? chosen.map((o) => `${L(o.title)} (${money(pack, o.cost, locale)}, ${formatHoursRange(o.hours, locale)}${o.requiresReview ? `, ${L(S.review).toLowerCase()}` : ''})`)
        : [L(S.nothingFits)],
      list: true,
    },
    {
      heading: L(S.outcome),
      lines: [
        planOutcomeLine(pack, view, locale),
        `${L(S.cost)}: ${money(pack, ev.plan.cost, locale)} ${L(S.ofBudget)} ${money(pack, ev.inputs.budget, locale)}`,
        `${L(S.remaining)}: ${fmtNumber(ev.plan.remaining, locale)} ${unit}`,
        ...(scenario ? [scenario] : []),
      ],
      list: true,
    },
    { heading: L(S.measures), lines: chosen.flatMap((o) => (o.measures ?? []).map(L)), list: true },
    { heading: L(S.constraints), lines: [...new Set(chosen.flatMap((o) => (o.constraints ?? []).map(L)))], list: true },
    { heading: L(S.caveat), lines: planning.note ? [L(planning.note)] : [] },
  ]
}
