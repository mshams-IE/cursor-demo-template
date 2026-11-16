import { fmtNumber, pick, type Assumption, type Pack } from '../../pack'
import type { Locale, Text } from '../../types'

const KIND: Record<string, Text> = {
  customer: { en: 'Customer', ar: 'العميل' },
  kpis: { en: 'Key figure', ar: 'رقم رئيسي' },
  facts: { en: 'Figure', ar: 'رقم' },
  incidents: { en: 'Incident', ar: 'حادث' },
  experts: { en: 'Expert', ar: 'خبير' },
  alerts: { en: 'Alert', ar: 'تنبيه' },
  'planning.options': { en: 'Response option', ar: 'خيار استجابة' },
}

/** The assumption's label in the current locale, naming the item the way the pack spells it. */
export function assumptionLabel(pack: Pack, a: Assumption, locale: Locale): string {
  if (locale === 'en') return a.label
  const { spec } = pack
  const id = a.path.split('.').pop() ?? ''
  const kind = a.path.startsWith('planning.options.') ? 'planning.options' : a.path.split('.')[0]
  const name = ((): string | undefined => {
    switch (kind) {
      case 'customer':
        return pick(spec.customer.name, locale)
      case 'regions':
        return pack.regionName(id, locale)
      case 'assetTypes':
        return pack.typeName(id, locale)
      case 'sites':
        return pick(pack.site(id)?.name, locale)
      case 'kpis':
        return pick(spec.kpis.find((k) => k.id === id)?.label, locale)
      case 'facts': {
        const f = spec.facts.find((x) => x.id === id)
        return f && `${fmtNumber(f.value, locale, f.decimals ?? 0)} ${pick(f.unit, locale)}`
      }
      case 'incidents':
        return pick(spec.incidents.find((x) => x.id === id)?.title, locale)
      case 'experts':
        return pick(spec.experts.find((x) => x.id === id)?.name, locale)
      case 'alerts':
        return pick(spec.alerts?.find((x) => x.id === id)?.title, locale)
      case 'planning.options':
        return pick(spec.planning?.options.find((x) => x.id === id)?.title, locale)
    }
  })()
  if (!name) return a.label
  const prefix = kind === 'regions' ? spec.vocabulary?.group : kind === 'sites' ? spec.vocabulary?.entity : kind === 'assetTypes' ? spec.vocabulary?.type : KIND[kind]
  return prefix ? `${pick(prefix, locale)}: ${name}` : name
}
