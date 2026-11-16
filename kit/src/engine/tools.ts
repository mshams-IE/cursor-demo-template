import { fold } from '../engine'
import type { Pack } from '../pack'
import { generateSeries, monthly, windowTotal, HISTORY_DAYS } from '../model/history'
import { incidentAt, incidentsAt, kpisAt, metricAt, siteAt, sitesAt } from '../model/live'
import { evaluatePlan } from '../model/planning'
import { formatMonthYear, formatShortDate, formatTime, HOUR, toMs } from '../model/time'
import type { Locale, Severity } from '../types'
import { monthOfDay } from './history'
import { parseHist } from './nlu'
import { countRows, reportRows, type ReportDayKey } from './report'
import { tx, type EngineContext } from './words'

export interface ToolDef {
  type: 'function'
  function: { name: string; description: string; parameters: { type: 'object'; properties: Record<string, unknown>; required?: string[] } }
}

const str = (description: string, values?: string[]) => ({ type: 'string', description, ...(values?.length ? { enum: values } : {}) })
const numP = (description: string) => ({ type: 'number', description })
const tool = (name: string, description: string, properties: Record<string, unknown> = {}, required?: string[]): ToolDef => ({ type: 'function', function: { name, description, parameters: { type: 'object', properties, ...(required ? { required } : {}) } } })

/** Tools offered to the model for this pack; data-dependent ones only when the pack has the data. */
export function toolDefs(pack: Pack): ToolDef[] {
  const s = pack.spec
  const regions = s.regions.map((r) => r.id)
  const out = [
    tool('get_kpis', 'Key figures at the clock with their change against one hour earlier.'),
    tool('list_sites', 'Sites with their status at the clock, worst first. Filter by status or region.', { status: str('Only this status', ['critical', 'watch', 'normal', 'attention']), region_id: str('Only this region', regions), limit: numP('Maximum rows, default 10') }),
    tool('get_site', 'One site: status, note, readings against limits, active incidents and details.', { site_id: str('Site id or name') }, ['site_id']),
    tool('list_incidents', 'Incidents visible at the clock (active and restored).', { phase: str('Only this phase', ['active', 'restored']) }),
    tool('get_incident', 'One incident: impact, suspected or confirmed cause, evidence, affected, restoration estimate and timeline up to the clock.', { incident_id: str('Incident id', s.incidents.map((i) => i.id)) }, ['incident_id']),
    tool('get_fact', 'Reference figures used in answers. Without an id, lists every figure.', { fact_id: str('Figure id', s.facts.map((f) => f.id)) }),
  ]
  if (s.history?.length)
    out.push(
      tool('get_history', 'Daily reference history (12 months) for one series: window total, average, peak day, today, monthly averages and an optional breakdown.', {
        series_id: str('Series id', s.history.map((h) => h.id)),
        days: numP('Last N days (1 to 365); default 30'),
        month: str('A month name instead of days, e.g. "June"'),
        breakdown: { type: 'boolean', description: 'Include the split by part' },
      }),
    )
  if (s.planning)
    out.push(
      tool('plan_options', 'Best response plan for a budget, restoration window and scenario, with options left out and why.', {
        budget: numP(`Budget in ${s.planning.budget.unit.en} (${s.planning.budget.min} to ${s.planning.budget.max})`),
        window_hours: numP(`Restoration window in hours; offered: ${s.planning.windows.join(', ')}`),
        ...(s.planning.scenario ? { scenario: numP(`${s.planning.scenario.label.en} in ${s.planning.scenario.unit.en}`) } : {}),
      }),
    )
  if (s.report)
    out.push(
      tool('report_counts', `Counts of ${s.report.plural.en.toLowerCase()} today (up to the clock) or yesterday, by region and category. Counts only, no causes.`, {
        day: str('Which day', ['today', 'yesterday']),
        region_id: str('Only this region', regions),
        category: str('Only this category', s.report.categories?.map((c) => c.id)),
      }),
    )
  return out
}

/** Tool name → the kind of specialist work it stands for, for the team strip. */
export const TOOL_STAGE: Record<string, 'analysis' | 'planning' | 'lead'> = {
  get_kpis: 'lead',
  list_sites: 'analysis',
  get_site: 'analysis',
  list_incidents: 'analysis',
  get_incident: 'analysis',
  get_fact: 'lead',
  get_history: 'lead',
  plan_options: 'planning',
  report_counts: 'lead',
}

type Args = Record<string, unknown>
const s = (v: unknown) => (typeof v === 'string' ? v : undefined)
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : undefined)

/** Runs one model tool over the pack at the clock. Results name things in the reply's language. */
export function runTool(pack: Pack, name: string, args: Args, ctx: EngineContext, locale: Locale): unknown {
  const spec = pack.spec
  const time = (ms: number) => formatTime(ms, 'en')
  const siteRow = (id: string) => {
    const site = pack.site(id)
    if (!site) return undefined
    const live = siteAt(site, ctx.clockMs)
    return { id, name: tx(pack, site.name, locale), region: pack.regionName(site.regionId, locale), region_id: site.regionId, type: pack.typeName(site.type, locale), status: live.status, note: tx(pack, live.note, locale) || undefined }
  }
  const findSite = (q: string) => {
    const f = q.trim().toLowerCase()
    return spec.sites.find((x) => x.id.toLowerCase() === f || x.name.en.toLowerCase() === f || x.name.ar === q.trim()) ?? spec.sites.find((x) => x.id.toLowerCase().includes(f) || x.name.en.toLowerCase().includes(f) || (!!x.name.ar && x.name.ar.includes(q.trim())))
  }
  switch (name) {
    case 'get_kpis':
      return {
        clock: time(ctx.clockMs),
        kpis: kpisAt(pack, ctx.clockMs).map((k) => ({ id: k.kpi.id, label: tx(pack, k.kpi.label, locale), kind: k.kpi.kind, value: k.value, of: k.of, unit: tx(pack, k.kpi.unit, locale), change_vs_1h: k.change, definition: tx(pack, k.kpi.definition, locale) })),
      }
    case 'list_sites': {
      const st = s(args.status)
      const region = s(args.region_id)
      const rank: Record<Severity, number> = { critical: 2, watch: 1, normal: 0 }
      const rows = sitesAt(spec, ctx.clockMs)
        .filter((l) => (!st || (st === 'attention' ? l.status !== 'normal' : l.status === st)) && (!region || l.site.regionId === region))
        .sort((a, b) => rank[b.status] - rank[a.status])
      return { clock: time(ctx.clockMs), total: rows.length, of: spec.sites.length, sites: rows.slice(0, Math.min(50, n(args.limit) ?? 10)).map((l) => siteRow(l.site.id)) }
    }
    case 'get_site': {
      const site = findSite(s(args.site_id) ?? '')
      if (!site) return { error: 'No such site', known: spec.sites.slice(0, 30).map((x) => x.id) }
      return {
        ...siteRow(site.id),
        readings: (site.metrics ?? []).map((m) => ({ label: tx(pack, m.label, locale), value: metricAt(m, ctx.clockMs), unit: tx(pack, m.unit, locale), limit: m.limit })),
        active_incidents: incidentsAt(spec, ctx.clockMs).filter((i) => i.phase === 'active' && i.incident.siteId === site.id).map((i) => i.incident.id),
        details: site.details?.map((d) => `${tx(pack, d.label, locale)}: ${tx(pack, d.value, locale)}`),
      }
    }
    case 'list_incidents': {
      const phase = s(args.phase)
      return {
        clock: time(ctx.clockMs),
        incidents: incidentsAt(spec, ctx.clockMs)
          .filter((i) => !phase || i.phase === phase)
          .map((i) => ({ id: i.incident.id, title: tx(pack, i.incident.title, locale), site: tx(pack, pack.site(i.incident.siteId)?.name, locale), region: pack.regionName(pack.site(i.incident.siteId)?.regionId ?? '', locale), severity: i.incident.severity, phase: i.phase, started: time(i.startedMs), resolved: i.resolvedMs ? time(i.resolvedMs) : undefined, affected: i.incident.affected ? { value: i.incident.affected.value, unit: tx(pack, i.incident.affected.unit, locale) } : undefined })),
      }
    }
    case 'get_incident': {
      const inc = spec.incidents.find((i) => i.id === s(args.incident_id))
      if (!inc) return { error: 'No such incident', known: spec.incidents.map((i) => i.id) }
      const live = incidentAt(inc, ctx.clockMs)
      return {
        id: inc.id,
        title: tx(pack, inc.title, locale),
        site: siteRow(inc.siteId),
        severity: inc.severity,
        phase: live.phase,
        started: time(live.startedMs),
        resolved: live.resolvedMs ? time(live.resolvedMs) : undefined,
        impact: tx(pack, inc.impact, locale),
        cause: tx(pack, inc.cause, locale) || undefined,
        cause_confirmed: inc.causeConfirmed ?? false,
        evidence: inc.evidence?.map((e) => tx(pack, e, locale)),
        affected: inc.affected ? { value: inc.affected.value, unit: tx(pack, inc.affected.unit, locale) } : undefined,
        restore_hours: inc.restoreHours,
        timeline: inc.timeline?.filter((t) => toMs(t.at) <= ctx.clockMs).map((t) => ({ at: time(toMs(t.at)), kind: t.kind, text: tx(pack, t.text, locale) })),
      }
    }
    case 'get_fact': {
      const id = s(args.fact_id)
      const rows = spec.facts.filter((f) => !id || f.id === id).map((f) => ({ id: f.id, value: f.value, unit: tx(pack, f.unit, locale) }))
      return rows.length ? { facts: rows } : { error: 'No such figure', known: spec.facts.map((f) => f.id) }
    }
    case 'get_history': {
      const series = spec.history?.find((h) => h.id === s(args.series_id)) ?? spec.history?.[0]
      if (!series) return { error: 'No history in this pack' }
      const days = generateSeries(pack, series, ctx.clockMs)
      const month = s(args.month)
      const hist = month ? parseHist(fold(month), monthOfDay(ctx.clockMs), HISTORY_DAYS) : undefined
      const want = Math.max(1, Math.min(HISTORY_DAYS, Math.round(n(args.days) ?? 30)))
      const win = hist?.windows[0] ?? { from: want - 1, to: 0, label: { en: `the last ${want} days`, ar: `آخر ${want} يوماً` } }
      const w = windowTotal(days, win.to, win.from)
      const dp = series.decimals ?? 0
      const r = (v: number) => Number(v.toFixed(dp))
      const slice = days.filter((d) => d.day >= win.to && d.day <= win.from)
      const sum = slice.reduce((a, d) => a + d.value, 0) || 1
      const parts = args.breakdown && series.breakdown
        ? series.breakdown.parts.map((p) => {
            const total = slice.reduce((a, d) => a + (d.parts?.[p.id] ?? 0), 0)
            return { id: p.id, label: tx(pack, p.label, locale), total: r(total), share_pct: Math.round((total / sum) * 100) }
          })
        : undefined
      return {
        series: series.id,
        label: tx(pack, series.label, locale),
        unit: tx(pack, series.unit, locale),
        window: tx(pack, win.label, locale),
        days: w.days,
        total: r(w.total),
        average: r(w.average),
        peak: w.peak ? { date: formatShortDate(w.peak.startMs + 12 * HOUR, locale), value: w.peak.value } : undefined,
        today: days[0].value,
        months: w.days > 45 ? monthly(slice).map((m) => ({ month: formatMonthYear(m.startMs + 12 * HOUR, locale), average: r(m.average), total: r(m.total), days: m.days })) : undefined,
        breakdown: parts,
      }
    }
    case 'plan_options': {
      const p = spec.planning
      if (!p) return { error: 'No planning in this pack' }
      const inputs = { budget: n(args.budget) ?? ctx.budget ?? p.budget.default, windowHours: n(args.window_hours) ?? ctx.windowHours ?? p.windows[0], scenario: n(args.scenario) ?? ctx.scenario ?? p.scenario?.min ?? 0, clockMs: ctx.clockMs }
      const ev = evaluatePlan(spec, inputs)!
      const title = (id: string) => tx(pack, ev.options.find((o) => o.id === id)?.title, locale)
      return {
        budget: inputs.budget,
        budget_unit: tx(pack, p.budget.unit, locale),
        window_hours: inputs.windowHours,
        scenario: p.scenario ? { label: tx(pack, p.scenario.label, locale), value: inputs.scenario, unit: tx(pack, p.scenario.unit, locale) } : undefined,
        benefit_unit: tx(pack, p.benefit.unit, locale),
        chosen: ev.plan.optionIds.map((id) => {
          const o = ev.options.find((x) => x.id === id)!
          return { id, title: title(id), cost: o.cost, benefit: Math.round(ev.effective[id]), hours: o.hours, requires_review: o.requiresReview ?? false }
        }),
        plan_cost: ev.plan.cost,
        delivered: ev.plan.delivered,
        remaining: ev.plan.remaining,
        total_affected: ev.total,
        left_out: ev.excluded.map((x) => ({ id: x.optionId, title: title(x.optionId), reason: x.reason })),
        budget_curve: ev.budgetCurve,
        note: tx(pack, p.note, locale) || undefined,
      }
    }
    case 'report_counts': {
      const day = (s(args.day) === 'yesterday' ? 'yesterday' : 'today') as ReportDayKey
      const region = s(args.region_id)
      const cat = s(args.category)
      const rows = reportRows(pack, ctx.clockMs).filter((r) => r.day === day && (!region || r.regionId === region) && (!cat || r.category === cat))
      const c = countRows(rows)
      return {
        day,
        up_to: day === 'today' ? time(ctx.clockMs) : undefined,
        label: tx(pack, spec.report?.plural, locale),
        total: c.total,
        by_region: c.byRegion.map((x) => ({ region: pack.regionName(x.id, locale), count: x.count })),
        by_category: c.byCategory.map((x) => ({ category: tx(pack, spec.report?.categories?.find((k) => k.id === x.id)?.label, locale) || x.id, count: x.count })),
      }
    }
    default:
      return { error: `Unknown tool ${name}` }
  }
}
