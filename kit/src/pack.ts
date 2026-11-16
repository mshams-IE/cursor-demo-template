import { BOUNDARIES, type Boundaries } from './geo'
import type { DemoSpec, Kpi, Locale, Severity, Site, SiteFilter, Sourced, Text } from './types'

export interface ResolvedKpi {
  kpi: Kpi
  value: number
  of?: number
  tone: 'critical' | 'watch' | 'positive' | 'neutral'
}

export interface Assumption {
  path: string
  label: string
  why: string
}

export interface Pack {
  spec: DemoSpec
  boundaries: Boundaries
  bilingual: boolean
  site: (id: string) => Site | undefined
  regionName: (id: string, locale: Locale) => string
  typeName: (id: string, locale: Locale) => string
  kpis: ResolvedKpi[]
  assumptions: Assumption[]
}

export function pick(t: Text | undefined, locale: Locale): string {
  if (!t) return ''
  return (locale === 'ar' ? t.ar : t.en) || t.en
}

export function matchSites(sites: Site[], f: SiteFilter = {}): Site[] {
  return sites.filter((s) => (!f.status || f.status.includes(s.status)) && (!f.type || f.type.includes(s.type)) && (!f.regionId || f.regionId.includes(s.regionId)))
}

export const SEVERITY_RANK: Record<Severity, number> = { normal: 0, watch: 1, critical: 2 }

export function worst(statuses: Severity[]): Severity {
  return statuses.reduce<Severity>((w, s) => (SEVERITY_RANK[s] > SEVERITY_RANK[w] ? s : w), 'normal')
}

export function resolveKpi(spec: DemoSpec, kpi: Kpi): ResolvedKpi {
  if (kpi.kind === 'count') {
    if (!kpi.derive) return { kpi, value: kpi.value ?? 0, of: kpi.of, tone: 'neutral' }
    const matched = matchSites(spec.sites, kpi.derive.count)
    const of = matchSites(spec.sites, kpi.derive.of ?? { type: kpi.derive.count.type }).length
    const tone = !matched.length ? 'positive' : matched.some((s) => s.status === 'critical') ? 'critical' : matched.some((s) => s.status === 'watch') ? 'watch' : 'neutral'
    return { kpi, value: matched.length, of, tone }
  }
  if (kpi.kind === 'percent') return { kpi, value: kpi.value, tone: kpi.delta ? ((kpi.delta.value > 0) === kpi.delta.worseWhenUp ? 'watch' : 'positive') : 'neutral' }
  return { kpi, value: kpi.value, tone: 'neutral' }
}

const NUM = { en: 'en-US', ar: 'ar-SA-u-nu-latn' } as const

export function fmtNumber(n: number, locale: Locale, decimals = 0) {
  return n.toLocaleString(NUM[locale], { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** How a KPI reads in a sentence: "4 of 312 districts", "24% of water supplied", "412 ML/day". */
export function kpiPhrase(r: ResolvedKpi, locale: Locale): string {
  const unit = pick(r.kpi.unit, locale)
  if (r.kpi.kind === 'count') return locale === 'ar' ? `${fmtNumber(r.value, locale)} من ${fmtNumber(r.of ?? 0, locale)} ${unit}` : `${fmtNumber(r.value, locale)} of ${fmtNumber(r.of ?? 0, locale)} ${unit}`
  if (r.kpi.kind === 'percent') return `${fmtNumber(r.value, locale, r.kpi.decimals ?? 0)}% ${unit}`
  return `${fmtNumber(r.value, locale, r.kpi.decimals ?? 0)} ${unit}`
}

/**
 * Replaces {kpi.ID}, {kpi.ID.value}, {fact.ID}, {fact.ID.value}, {site.ID} and {region.ID}
 * so every number and name in answers and narration comes from the pack data.
 */
export function render(pack: Pack, text: string, locale: Locale): string {
  return text.replace(/\{(kpi|fact|site|region)\.([A-Za-z0-9_-]+)(\.value)?\}/g, (whole, kind: string, id: string, bare?: string) => {
    if (kind === 'kpi') {
      const r = pack.kpis.find((k) => k.kpi.id === id)
      if (!r) return whole
      return bare ? fmtNumber(r.value, locale, r.kpi.kind === 'count' ? 0 : (r.kpi.decimals ?? 0)) : kpiPhrase(r, locale)
    }
    if (kind === 'fact') {
      const f = pack.spec.facts.find((x) => x.id === id)
      if (!f) return whole
      const v = fmtNumber(f.value, locale, f.decimals ?? 0)
      return bare ? v : `${v} ${pick(f.unit, locale)}`
    }
    if (kind === 'site') return pick(pack.site(id)?.name, locale) || whole
    return pack.regionName(id, locale) || whole
  })
}

function collectAssumptions(spec: DemoSpec): Assumption[] {
  const out: Assumption[] = []
  const add = (path: string, item: Sourced, label: string) => {
    if (item.source === 'assumed') out.push({ path, label, why: item.why ?? '' })
  }
  add('customer', spec.customer, `Customer: ${spec.customer.name.en}`)
  spec.regions.forEach((r) => add(`regions.${r.id}`, r, `Region: ${r.name.en}`))
  spec.assetTypes.forEach((a) => add(`assetTypes.${a.id}`, a, `Asset type: ${a.name.en}`))
  spec.sites.forEach((s) => add(`sites.${s.id}`, s, `Site: ${s.name.en}`))
  spec.kpis.forEach((k) => add(`kpis.${k.id}`, k, `Key figure: ${k.label.en}`))
  spec.facts.forEach((f) => add(`facts.${f.id}`, f, `Figure: ${fmtNumber(f.value, 'en', f.decimals ?? 0)} ${f.unit.en}`))
  spec.incidents.forEach((i) => add(`incidents.${i.id}`, i, `Incident: ${i.title.en}`))
  spec.experts.forEach((e) => add(`experts.${e.id}`, e, `Expert: ${e.name.en}`))
  return out
}

export function definePack(raw: unknown): Pack {
  const spec = raw as DemoSpec
  const boundaries = BOUNDARIES[spec.geo]
  const sites = new Map(spec.sites.map((s) => [s.id, s]))
  const regions = new Map(spec.regions.map((r) => [r.id, r]))
  const types = new Map(spec.assetTypes.map((t) => [t.id, t]))
  return {
    spec,
    boundaries,
    bilingual: spec.languages.includes('ar'),
    site: (id) => sites.get(id),
    regionName: (id, locale) => pick(regions.get(id)?.name, locale),
    typeName: (id, locale) => pick(types.get(id)?.name, locale),
    kpis: spec.kpis.map((k) => resolveKpi(spec, k)),
    assumptions: collectAssumptions(spec),
  }
}
