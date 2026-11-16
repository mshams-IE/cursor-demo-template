import { describe, expect, it } from 'vitest'
import { definePack } from '../pack'
import type { DemoSpec } from '../types'
import water from '../../../samples/water/demo-spec.json'
import { HOUR, formatTime, startOfLocalDay, toMs } from './time'
import { incidentAt, kpiAt, seriesAt, siteAt } from './live'
import { evaluatePlan, whatIfAt } from './planning'
import { generateSeries, monthly } from './history'

const spec = structuredClone(water) as unknown as DemoSpec
const pack = definePack(spec)

describe('time', () => {
  it('reads pack local times in the pack zone', () => {
    const ms = toMs('2026-11-15T10:30')
    expect(formatTime(ms, 'en')).toBe('10:30')
    expect(toMs('10:30')).toBe(toMs(`${spec.clock.observedAt.slice(0, 10)}T10:30`))
    expect(formatTime(startOfLocalDay(ms), 'en')).toBe('00:00')
  })
})

describe('live state', () => {
  it('follows a site timeline', () => {
    const site = { ...spec.sites[0], status: 'normal' as const, timeline: [{ at: '09:00', status: 'critical' as const, note: { en: 'Trip', ar: 'فصل' } }] }
    expect(siteAt(site, toMs('08:59')).status).toBe('normal')
    expect(siteAt(site, toMs('09:00')).status).toBe('critical')
  })

  it('phases incidents by start and resolution', () => {
    const inc = { ...spec.incidents[0], started: '09:00', resolved: '11:00' }
    expect(incidentAt(inc, toMs('08:00')).phase).toBe('upcoming')
    expect(incidentAt(inc, toMs('10:00')).phase).toBe('active')
    expect(incidentAt(inc, toMs('11:00')).phase).toBe('restored')
  })

  it('reads KPI series at the clock with change against one hour earlier', () => {
    const series = [
      { at: '08:00', value: 10 },
      { at: '09:00', value: 12 },
      { at: '10:00', value: 15 },
    ]
    expect(seriesAt(series, toMs('09:30'))).toBe(12)
    const base = pack.kpis.find((k) => k.kpi.kind !== 'count')!
    const live = kpiAt(spec, { ...base, kpi: { ...base.kpi, series } as typeof base.kpi }, toMs('10:00'))
    expect(live.value).toBe(15)
    expect(live.change).toBe(3)
    expect(live.spark).toEqual([10, 12, 15])
  })
})

describe('planning', () => {
  const planned: DemoSpec = {
    ...spec,
    incidents: spec.incidents.map((i, n) => (n === 0 ? { ...i, affected: { value: 1000, unit: { en: 'customers', ar: 'عملاء' } } } : i)),
    planning: {
      incidentIds: [spec.incidents[0].id],
      budget: { unit: { en: 'M', ar: 'م' }, min: 1, max: 10, step: 1, default: 5, presets: [3, 5, 8] },
      windows: [12, 24],
      benefit: { label: { en: 'restored', ar: 'مستعاد' }, unit: { en: 'customers', ar: 'عملاء' } },
      options: [
        { id: 'a', title: { en: 'A', ar: 'أ' }, cost: 3, benefit: 600, hours: [2, 4], source: 'assumed', why: 't' },
        { id: 'b', title: { en: 'B', ar: 'ب' }, cost: 4, benefit: 500, hours: [6, 10], sensitivity: 0.05, source: 'assumed', why: 't' },
        { id: 'c', title: { en: 'C', ar: 'ج' }, cost: 1, benefit: 300, hours: [20, 30], source: 'assumed', why: 't' },
      ],
      whatIf: {
        title: { en: 'W', ar: 'و' },
        description: { en: 'W', ar: 'و' },
        trigger: { en: 'W', ar: 'و' },
        input: { label: { en: 'x', ar: 'س' }, unit: { en: '°C', ar: '°م' }, min: 0, max: 10, step: 1 },
        readings: [{ label: { en: 'load', ar: 'حمل' }, unit: { en: '%', ar: '%' }, base: 90, perUnit: 2, limit: 100, trip: 110 }],
        impact: { label: { en: 'at risk', ar: 'معرض' }, unit: { en: 'customers', ar: 'عملاء' }, current: 0, after: 1000 },
      },
    },
  }

  it('picks the best set within budget and window, capped at the affected total', () => {
    const e = evaluatePlan(planned, { budget: 8, windowHours: 12, scenario: 0, clockMs: toMs(spec.clock.observedAt) })!
    expect(e.total).toBe(1000)
    expect(e.plan.optionIds.sort()).toEqual(['a', 'b'])
    expect(e.plan.delivered).toBe(1000)
    expect(e.excluded.find((x) => x.optionId === 'c')?.reason).toBe('outside_window')
  })

  it('applies the scenario and the budget', () => {
    const e = evaluatePlan(planned, { budget: 5, windowHours: 12, scenario: 10, clockMs: toMs(spec.clock.observedAt) })!
    expect(e.plan.optionIds).toEqual(['a'])
    expect(e.effective.b).toBe(250)
  })

  it('moves what-if readings past alarm and trip', () => {
    const w = whatIfAt(planned.planning!, 0)!
    expect(w.readings[0].state).toBe('ok')
    expect(whatIfAt(planned.planning!, 6)!.readings[0].state).toBe('alarm')
    expect(whatIfAt(planned.planning!, 10)!.readings[0].state).toBe('trip')
  })
})

describe('history', () => {
  it('is deterministic and covers twelve months', () => {
    const s = { id: 'x', label: { en: 'x', ar: 'س' }, unit: { en: 'u', ar: 'و' }, base: 100, seasonal: 0.3, noise: 0.1 }
    const clock = toMs(spec.clock.observedAt)
    const a = generateSeries(pack, s, clock)
    const b = generateSeries(pack, s, clock)
    expect(a).toEqual(b)
    expect(a).toHaveLength(365)
    expect(monthly(a).length).toBeGreaterThanOrEqual(12)
    expect(a[1].startMs).toBe(a[0].startMs - 24 * HOUR)
  })
})
