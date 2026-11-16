import { useMemo } from 'react'
import type { Pack } from '../../pack'
import { DAY, startOfLocalDay, toMs } from '../../model/time'
import { useDemo, type ReportDay, type ReportFocus } from '../../store'
import type { ReportRecords } from '../../types'

export interface ReportRow {
  key: string
  siteId: string
  regionId: string
  at: number
  day: 'today' | 'yesterday'
  category?: string
}

export interface ReportData {
  report: ReportRecords
  dayStart: number
  clockMs: number
  /** Every record of yesterday and today up to the clock. */
  rows: ReportRow[]
}

export function useReportData(pack: Pack): ReportData | undefined {
  const minute = useDemo((s) => Math.floor(s.clockMs / 60_000) * 60_000)
  const report = pack.spec.report
  return useMemo(() => {
    if (!report) return undefined
    const dayStart = startOfLocalDay(minute)
    const rows: ReportRow[] = []
    report.records.forEach((r, i) => {
      const at = toMs(r.at)
      if (at < dayStart - DAY || at > minute) return
      const site = pack.site(r.siteId)
      if (!site) return
      rows.push({ key: `${i}`, siteId: r.siteId, regionId: site.regionId, at, day: at >= dayStart ? 'today' : 'yesterday', category: r.category })
    })
    rows.sort((a, b) => b.at - a.at)
    return { report, dayStart, clockMs: minute, rows }
  }, [report, pack, minute])
}

export const inDay = (day: ReportDay) => (r: ReportRow) => day === 'both' || r.day === day

/** Rows in the slice; `skip` leaves one focus field out, e.g. so category tiles show every category. */
export function slice(rows: ReportRow[], focus: ReportFocus, skip?: keyof ReportFocus) {
  return rows.filter(
    (r) => (skip === 'regionId' || !focus.regionId || r.regionId === focus.regionId) && (skip === 'siteId' || !focus.siteId || r.siteId === focus.siteId) && (skip === 'category' || !focus.category || r.category === focus.category),
  )
}

export function countBy<K extends string>(rows: ReportRow[], key: (r: ReportRow) => K | undefined) {
  const m = new Map<K, number>()
  for (const r of rows) {
    const k = key(r)
    if (k !== undefined) m.set(k, (m.get(k) ?? 0) + 1)
  }
  return m
}

/** Three shade steps from the largest count, so any pack's numbers spread over the scale. */
export function shadeSteps(max: number): [number, number, number] {
  const b = Math.max(2, Math.round(max * 0.34))
  const c = Math.max(b + 1, Math.round(max * 0.67))
  return [1, b, c]
}

export function shade(n: number, steps: [number, number, number]) {
  if (n >= steps[2]) return 'rgb(255 85 13 / 0.55)'
  if (n >= steps[1]) return 'rgb(255 85 13 / 0.32)'
  if (n >= steps[0]) return 'rgb(255 85 13 / 0.14)'
  return '#ffffff'
}
