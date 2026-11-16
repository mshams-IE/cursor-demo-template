import { fmtNumber, pick, render, type Pack } from '../pack'
import type { Mode } from '../store'
import type { Locale, Severity, Text } from '../types'
import type { Visual } from '../store'
import type { Intent } from './nlu'

/** What the engine reads from the workspace when it answers. */
export interface EngineContext {
  clockMs: number
  mode?: Mode
  budget?: number
  windowHours?: number
  scenario?: number
  regionId?: string
  siteId?: string
  incidentId?: string
}

/** An answer composed from the data, in the language the question was asked in. */
export interface Generated {
  intent: Intent
  locale: Locale
  lead: string
  points: string[]
  sources: string[]
  visual?: Visual
}

export const L = (locale: Locale, en: string, ar: string) => (locale === 'ar' ? ar : en)

/** A pack text in the locale, with {kpi.x}, {fact.x}, {site.x} and {region.x} filled from the data. */
export const tx = (pack: Pack, t: Text | undefined, locale: Locale) => render(pack, pick(t, locale), locale)

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const num = (n: number, locale: Locale, decimals = 0) => fmtNumber(n, locale, decimals)

/** Decimals needed to show a value without inventing precision. */
export const dec = (n: number, max = 1) => (Number.isInteger(n) ? 0 : Math.min(max, (String(n).split('.')[1] ?? '').length))

const SEV: Record<Severity, Text> = { normal: { en: 'normal', ar: 'طبيعي' }, watch: { en: 'on watch', ar: 'تحت المراقبة' }, critical: { en: 'critical', ar: 'حرج' } }
export const sevWord = (s: Severity, locale: Locale) => pick(SEV[s], locale)

/** The pack's names for sites and regions, lower-cased in English for use mid-sentence. */
export function terms(pack: Pack, locale: Locale) {
  const v = pack.spec.vocabulary
  const en = (t: Text | undefined, d: string) => (t?.en ?? d).toLowerCase()
  if (locale === 'ar')
    return { site: v?.entity.ar ?? 'الموقع', sites: v?.entityPlural.ar ?? 'المواقع', region: v?.group.ar ?? 'المنطقة', regions: v?.groupPlural.ar ?? 'المناطق' }
  return { site: en(v?.entity, 'site'), sites: en(v?.entityPlural, 'sites'), region: en(v?.group, 'region'), regions: en(v?.groupPlural, 'regions') }
}

export const SOURCE = {
  sites: { en: 'Site register at the clock', ar: 'سجل المواقع عند وقت الرصد' },
  incidents: { en: 'Incident log', ar: 'سجل الحوادث' },
  kpis: { en: 'Key figures', ar: 'المؤشرات الرئيسية' },
  history: { en: '12-month reference history', ar: 'السجل المرجعي لـ 12 شهراً' },
  planning: { en: 'Response options and cost model', ar: 'خيارات الاستجابة ونموذج التكلفة' },
  report: { en: "Today's report records", ar: 'سجلات تقرير اليوم' },
} satisfies Record<string, Text>
