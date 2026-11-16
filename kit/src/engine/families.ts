import { kpiPhrase, type Pack } from '../pack'
import { activeIncidents, incidentAt, kpiAt, metricAt, prioritySites, siteAt, sitesAt } from '../model/live'
import { evaluatePlan, planOptions, type ExclusionReason } from '../model/planning'
import { formatHoursRange, formatTime, toMs } from '../model/time'
import type { Incident, Kpi, Locale, Site } from '../types'
import type { Parsed } from './nlu'
import { cap, dec, L, num, sevWord, SOURCE, terms, tx, type EngineContext, type Generated } from './words'

type Family = (pack: Pack, p: Parsed, ctx: EngineContext) => Generated | undefined

const at = (ctx: EngineContext, locale: Locale) => formatTime(ctx.clockMs, locale)

function siteLine(pack: Pack, s: Site, ctx: EngineContext, locale: Locale): string {
  const live = siteAt(s, ctx.clockMs)
  const note = tx(pack, live.note, locale)
  return `${tx(pack, s.name, locale)} (${pack.regionName(s.regionId, locale)}): ${sevWord(live.status, locale)}${note ? ` — ${note}` : ''}`
}

function incidentLine(pack: Pack, i: Incident, locale: Locale): string {
  const site = pack.site(i.siteId)
  const affected = i.affected ? `, ${num(i.affected.value, locale)} ${tx(pack, i.affected.unit, locale)}` : ''
  return `${tx(pack, i.title, locale)}${site ? ` (${tx(pack, site.name, locale)})` : ''}${affected}`
}

export const status: Family = (pack, p, ctx) => {
  const { locale } = p
  const w = terms(pack, locale)
  const scope = p.regions[0]
  const all = sitesAt(pack.spec, ctx.clockMs).filter((l) => !scope || l.site.regionId === scope.id)
  const need = prioritySites(pack.spec, ctx.clockMs).filter((l) => !scope || l.site.regionId === scope.id)
  const crit = need.filter((l) => l.status === 'critical').length
  const incidents = activeIncidents(pack.spec, ctx.clockMs).filter((i) => !scope || pack.site(i.incident.siteId)?.regionId === scope.id)
  const where = scope ? L(locale, ` in ${tx(pack, scope.name, locale)}`, ` في ${tx(pack, scope.name, locale)}`) : ''
  const lead = need.length
    ? L(
        locale,
        `${num(need.length, locale)} of ${num(all.length, locale)} ${w.sites}${where} need attention at ${at(ctx, locale)}: ${num(crit, locale)} critical and ${num(need.length - crit, locale)} on watch.`,
        `${num(need.length, locale)} من ${num(all.length, locale)} من ${w.sites}${where} تتطلب الانتباه عند ${at(ctx, locale)}: ${num(crit, locale)} حرجة و${num(need.length - crit, locale)} تحت المراقبة.`,
      )
    : L(locale, `All ${num(all.length, locale)} ${w.sites}${where} are normal at ${at(ctx, locale)}.`, `جميع ${w.sites}${where} (${num(all.length, locale)}) في وضع طبيعي عند ${at(ctx, locale)}.`)
  const points = need.slice(0, 3).map((l) => siteLine(pack, l.site, ctx, locale))
  if (incidents.length)
    points.push(
      L(locale, `${num(incidents.length, locale)} of ${num(pack.spec.incidents.length, locale)} incidents ${incidents.length === 1 ? 'is' : 'are'} active; the most severe is ${incidentLine(pack, incidents[0].incident, locale)}.`, `${num(incidents.length, locale)} من ${num(pack.spec.incidents.length, locale)} حوادث نشطة؛ أشدها ${incidentLine(pack, incidents[0].incident, locale)}.`),
    )
  return { intent: 'status', locale, lead, points, sources: [tx(pack, SOURCE.sites, locale), tx(pack, SOURCE.incidents, locale)] }
}

export const incident: Family = (pack, p, ctx) => {
  const { locale } = p
  const active = activeIncidents(pack.spec, ctx.clockMs).map((i) => i.incident)
  const chosen = p.incidents.find((i) => incidentAt(i, ctx.clockMs).phase !== 'upcoming') ?? pack.spec.incidents.find((i) => i.id === ctx.incidentId) ?? active.find((i) => i.role === 'hero') ?? active[0]
  if (!chosen) return undefined
  const live = incidentAt(chosen, ctx.clockMs)
  const site = pack.site(chosen.siteId)
  const started = formatTime(live.startedMs, locale)
  const phase =
    live.phase === 'restored'
      ? L(locale, `restored at ${formatTime(live.resolvedMs!, locale)}`, `استُعيدت الخدمة عند ${formatTime(live.resolvedMs!, locale)}`)
      : live.phase === 'upcoming'
        ? L(locale, `not yet started at ${at(ctx, locale)}`, `لم تبدأ بعد عند ${at(ctx, locale)}`)
        : L(locale, `active since ${started}`, `نشطة منذ ${started}`)
  const lead = `${tx(pack, chosen.title, locale)}${site ? ` — ${tx(pack, site.name, locale)}, ${pack.regionName(site.regionId, locale)}` : ''}: ${sevWord(chosen.severity, locale)}, ${phase}.`
  const points: string[] = [tx(pack, chosen.impact, locale)]
  if (chosen.cause)
    points.push(chosen.causeConfirmed ? L(locale, `Confirmed cause: ${tx(pack, chosen.cause, locale)}`, `السبب المؤكد: ${tx(pack, chosen.cause, locale)}`) : L(locale, `Suspected driver: ${tx(pack, chosen.cause, locale)}`, `السبب المرجّح: ${tx(pack, chosen.cause, locale)}`))
  for (const e of chosen.evidence?.slice(0, 2) ?? []) points.push(tx(pack, e, locale))
  if (chosen.affected) points.push(L(locale, `Affected: ${num(chosen.affected.value, locale)} ${tx(pack, chosen.affected.unit, locale)}`, `المتأثرون: ${num(chosen.affected.value, locale)} ${tx(pack, chosen.affected.unit, locale)}`))
  if (chosen.restoreHours && live.phase === 'active') points.push(L(locale, `Estimated restoration: ${formatHoursRange(chosen.restoreHours, locale)} from detection`, `الاستعادة المقدّرة: ${formatHoursRange(chosen.restoreHours, locale)} من الاكتشاف`))
  for (const s of (chosen.timeline ?? []).filter((s) => toMs(s.at) <= ctx.clockMs).slice(-2)) points.push(`${formatTime(toMs(s.at), locale)} — ${tx(pack, s.text, locale)}`)
  return { intent: 'incident', locale, lead, points: points.filter(Boolean), sources: [tx(pack, SOURCE.incidents, locale)] }
}

function kpiValue(k: Kpi, value: number, locale: Locale) {
  return num(value, locale, k.kind === 'count' ? 0 : (k.decimals ?? 0))
}

export const kpi: Family = (pack, p, ctx) => {
  const { locale } = p
  const k = p.kpis[0]
  const base = k && pack.kpis.find((r) => r.kpi.id === k.id)
  if (!base) return undefined
  const live = kpiAt(pack.spec, base, ctx.clockMs)
  const lead = L(locale, `${tx(pack, k.label, locale)} is ${kpiPhrase(live, locale)} at ${at(ctx, locale)}.`, `${tx(pack, k.label, locale)}: ${kpiPhrase(live, locale)} عند ${at(ctx, locale)}.`)
  const points = [tx(pack, k.definition, locale)]
  if (live.change !== undefined) {
    const d = kpiValue(k, Math.abs(live.change), locale)
    points.push(
      live.change === 0
        ? L(locale, 'Unchanged on an hour earlier.', 'دون تغيير عن الساعة السابقة.')
        : L(locale, `${live.change > 0 ? 'Up' : 'Down'} ${d} on an hour earlier.`, `${live.change > 0 ? 'ارتفع' : 'انخفض'} بمقدار ${d} عن الساعة السابقة.`),
    )
  } else if (k.delta) points.push(`${k.delta.value > 0 ? '+' : ''}${num(k.delta.value, locale, dec(k.delta.value))} ${tx(pack, k.delta.period, locale)}`)
  return { intent: 'kpi', locale, lead, points, sources: [tx(pack, SOURCE.kpis, locale)] }
}

export const rank: Family = (pack, p, ctx) => {
  const { locale } = p
  const w = terms(pack, locale)
  const live = sitesAt(pack.spec, ctx.clockMs)
  const rows = pack.spec.regions
    .map((r) => {
      const in_ = live.filter((l) => l.site.regionId === r.id)
      return { r, of: in_.length, need: in_.filter((l) => l.status !== 'normal').length, crit: in_.filter((l) => l.status === 'critical').length }
    })
    .filter((x) => x.of > 0)
    .sort((a, b) => b.need - a.need || b.crit - a.crit || a.r.id.localeCompare(b.r.id))
  if (!rows.length) return undefined
  const top = rows[0]
  const lead = top.need
    ? L(locale, `${tx(pack, top.r.name, locale)} has the most ${w.sites} needing attention: ${num(top.need, locale)} of ${num(top.of, locale)}.`, `${tx(pack, top.r.name, locale)} لديها أكبر عدد من ${w.sites} التي تتطلب الانتباه: ${num(top.need, locale)} من ${num(top.of, locale)}.`)
    : L(locale, `No ${w.sites} need attention in any ${w.region} at ${at(ctx, locale)}.`, `لا توجد ${w.sites} تتطلب الانتباه في أي ${w.region} عند ${at(ctx, locale)}.`)
  const points = rows
    .filter((x) => x.need)
    .slice(0, 5)
    .map((x) => L(locale, `${tx(pack, x.r.name, locale)}: ${num(x.need, locale)} of ${num(x.of, locale)} (${num(x.crit, locale)} critical)`, `${tx(pack, x.r.name, locale)}: ${num(x.need, locale)} من ${num(x.of, locale)} (${num(x.crit, locale)} حرجة)`))
  const shown = rows.filter((x) => x.need).slice(0, 8)
  return {
    intent: 'rank',
    locale,
    lead,
    points,
    sources: [tx(pack, SOURCE.sites, locale)],
    visual: shown.length > 1 ? { kind: 'bar', title: L(locale, `${cap(w.sites)} needing attention by ${w.region}`, `${w.sites} التي تتطلب الانتباه حسب ${w.region}`), unit: w.sites, points: shown.map((x) => ({ label: tx(pack, x.r.name, locale), value: x.need })) } : undefined,
  }
}

export const site: Family = (pack, p, ctx) => {
  const { locale } = p
  const s = p.sites[0] ?? pack.site(ctx.siteId ?? '')
  if (!s) return undefined
  const live = siteAt(s, ctx.clockMs)
  const note = tx(pack, live.note, locale)
  const lead = L(
    locale,
    `${tx(pack, s.name, locale)} (${pack.regionName(s.regionId, locale)}, ${pack.typeName(s.type, locale)}) is ${sevWord(live.status, locale)} at ${at(ctx, locale)}${note ? `: ${note}` : '.'}`,
    `${tx(pack, s.name, locale)} (${pack.regionName(s.regionId, locale)}، ${pack.typeName(s.type, locale)}) ${sevWord(live.status, locale)} عند ${at(ctx, locale)}${note ? `: ${note}` : '.'}`,
  )
  const points: string[] = []
  for (const m of s.metrics ?? []) {
    const v = metricAt(m, ctx.clockMs)
    const d = m.decimals ?? 0
    const unit = tx(pack, m.unit, locale)
    const withUnit = (x: number) => `${num(x, locale, d)}${/^[%/°]/.test(unit) ? unit : ` ${unit}`}`
    const value = withUnit(v)
    if (m.limit === undefined) points.push(`${tx(pack, m.label, locale)}: ${value}`)
    else {
      const over = (m.worseWhenUp ?? true) ? v > m.limit : v < m.limit
      const limit = withUnit(m.limit)
      points.push(over ? L(locale, `${tx(pack, m.label, locale)}: ${value}, beyond the ${limit} limit`, `${tx(pack, m.label, locale)}: ${value}، متجاوزاً حد ${limit}`) : L(locale, `${tx(pack, m.label, locale)}: ${value}, within the ${limit} limit`, `${tx(pack, m.label, locale)}: ${value}، ضمن حد ${limit}`))
    }
  }
  for (const i of activeIncidents(pack.spec, ctx.clockMs).filter((i) => i.incident.siteId === s.id)) points.push(L(locale, `Active incident: ${incidentLine(pack, i.incident, locale)}`, `حادثة نشطة: ${incidentLine(pack, i.incident, locale)}`))
  for (const d of s.details?.slice(0, 2) ?? []) points.push(`${tx(pack, d.label, locale)}: ${tx(pack, d.value, locale)}`)
  return { intent: 'site', locale, lead, points, sources: [tx(pack, SOURCE.sites, locale)] }
}

const REASON: Record<ExclusionReason, { en: string; ar: string }> = {
  over_budget: { en: 'over the budget', ar: 'يتجاوز الميزانية' },
  outside_window: { en: 'too slow for the window', ar: 'أبطأ من النافذة' },
  no_benefit: { en: 'adds nothing within the plan', ar: 'لا يضيف شيئاً ضمن الخطة' },
  review: { en: 'needs review', ar: 'يتطلب مراجعة' },
}

/** Budget, window and scenario read from the question, falling back to the workspace settings. */
export function planInputs(pack: Pack, p: Parsed, ctx: EngineContext) {
  const pl = pack.spec.planning!
  let budget = ctx.budget || pl.budget.default
  let windowHours = ctx.windowHours || pl.windows[0]
  let scenario = ctx.scenario ?? pl.scenario?.min ?? 0
  const q = p.q
  const pct = q.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|per cent|بالمئه|بالمائه|في المئه)/)
  if (pct && pl.scenario) scenario = Math.min(pl.scenario.max, Math.max(pl.scenario.min, Number(pct[1])))
  const hours = q.match(/(\d+(?:\.\d+)?)\s*(?:h\b|hours?|hrs?|ساعه|ساعات)/)
  if (hours) windowHours = Number(hours[1])
  const rest = p.numbers.filter((n) => n !== (pct ? Number(pct[1]) : NaN) && n !== (hours ? Number(hours[1]) : NaN))
  const b = rest.find((n) => n >= pl.budget.min && n <= pl.budget.max)
  if (b !== undefined) budget = b
  return { budget, windowHours, scenario, clockMs: ctx.clockMs }
}

export const planning: Family = (pack, p, ctx) => {
  const pl = pack.spec.planning
  if (!pl || !planOptions(pack.spec, ctx.clockMs).length) return undefined
  const { locale } = p
  const inputs = planInputs(pack, p, ctx)
  const ev = evaluatePlan(pack.spec, inputs)
  if (!ev) return undefined
  const bd = pl.budget.decimals ?? 1
  const unit = tx(pack, pl.budget.unit, locale)
  const benefit = tx(pack, pl.benefit.unit, locale)
  const money = (v: number) => `${num(v, locale, dec(v, 2))} ${unit}`
  const scen = pl.scenario && inputs.scenario ? L(locale, ` and ${tx(pack, pl.scenario.label, locale).toLowerCase()} at ${num(inputs.scenario, locale)}${tx(pack, pl.scenario.unit, locale)}`, ` و${tx(pack, pl.scenario.label, locale)} عند ${num(inputs.scenario, locale)}${tx(pack, pl.scenario.unit, locale)}`) : ''
  const lead = ev.plan.optionIds.length
    ? L(
        locale,
        `With a budget of ${money(inputs.budget)} and a ${num(inputs.windowHours, locale)} h window${scen}, the best plan delivers ${num(ev.plan.delivered, locale)} ${benefit} for ${money(ev.plan.cost)}.`,
        `بميزانية ${money(inputs.budget)} ونافذة ${num(inputs.windowHours, locale)} ساعة${scen}، تحقق أفضل خطة ${num(ev.plan.delivered, locale)} ${benefit} بتكلفة ${money(ev.plan.cost)}.`,
      )
    : L(locale, `No option fits a budget of ${money(inputs.budget)} within ${num(inputs.windowHours, locale)} h${scen}.`, `لا يوجد خيار ضمن ميزانية ${money(inputs.budget)} خلال ${num(inputs.windowHours, locale)} ساعة${scen}.`)
  const byId = new Map(ev.options.map((o) => [o.id, o]))
  const points = ev.plan.optionIds.map((id) => {
    const o = byId.get(id)!
    const sep = L(locale, ', ', '، ')
    return `${tx(pack, o.title, locale)} — ${money(o.cost)}${sep}${num(Math.round(ev.effective[id]), locale)} ${benefit}${sep}${formatHoursRange(o.hours, locale)}`
  })
  if (ev.total) points.push(L(locale, `${num(ev.plan.remaining, locale)} of ${num(ev.total, locale)} ${benefit} remain after the plan.`, `يتبقى ${num(ev.plan.remaining, locale)} من ${num(ev.total, locale)} ${benefit} بعد الخطة.`))
  for (const x of ev.excluded.slice(0, 2)) points.push(L(locale, `Left out: ${tx(pack, byId.get(x.optionId)?.title, locale)} (${REASON[x.reason].en})`, `مستبعد: ${tx(pack, byId.get(x.optionId)?.title, locale)} (${REASON[x.reason].ar})`))
  if (pl.note) points.push(tx(pack, pl.note, locale))
  return {
    intent: 'planning',
    locale,
    lead,
    points,
    sources: [tx(pack, SOURCE.planning, locale)],
    visual: {
      kind: 'bar',
      title: L(locale, `${tx(pack, pl.benefit.label, locale)} by budget (${unit})`, `${tx(pack, pl.benefit.label, locale)} حسب الميزانية (${unit})`),
      unit: benefit,
      points: ev.budgetCurve.map((c) => ({ label: num(c.budget, locale, dec(c.budget, bd)), value: c.delivered })),
      highlight: ev.budgetCurve.reduce((bi, c, i, a) => (Math.abs(c.budget - inputs.budget) < Math.abs(a[bi].budget - inputs.budget) ? i : bi), 0),
    },
  }
}

export const brief: Family = (pack, p, ctx) => {
  const s = status(pack, p, ctx)!
  const i = incident(pack, p, ctx)
  const pl = pack.spec.planning ? planning(pack, p, ctx) : undefined
  const { locale } = p
  return {
    intent: 'brief',
    locale,
    lead: s.lead,
    points: [i?.lead, i?.points[1], pl?.lead].filter((x): x is string => !!x),
    sources: [...new Set([...s.sources, ...(i?.sources ?? []), ...(pl?.sources ?? [])])],
  }
}
