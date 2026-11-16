import { describe, expect, it } from 'vitest'
import banking from '../../samples/banking/demo-spec.json'
import telecom from '../../samples/telecom/demo-spec.json'
import water from '../../samples/water/demo-spec.json'
import { ask } from '../src/engine'
import { vocabularyTerms } from '../src/terms'
import { definePack, render } from '../src/pack'
import type { DemoSpec } from '../src/types'
import { checkSpec, nameKey, type GateId } from './validate'

const clone = (): DemoSpec => structuredClone(water) as DemoSpec
const errorsIn = (spec: unknown, gate: GateId, opts?: { upToStep?: number }) => checkSpec(spec, opts).issues.filter((i) => i.gate === gate && i.level === 'error')

describe('gates on the water sample', () => {
  it('passes every gate', () => {
    expect(checkSpec(water).issues.filter((i) => i.level === 'error')).toEqual([])
  })

  it('lists the assumed values', () => {
    expect(checkSpec(water).assumptions.map((a) => a.path)).toEqual(['sites.KHJ-D1', 'kpis.supply', 'facts.night-flow-rise', 'incidents.night-flow'])
  })
})

describe('gates on the other samples', () => {
  it.each([
    ['telecom', telecom],
    ['banking (no map)', banking],
  ])('%s passes every gate', (_, spec) => {
    expect(checkSpec(spec).issues.filter((i) => i.level === 'error')).toEqual([])
  })
})

describe('gates catch seeded failures', () => {
  it('brand: co-branding needs a local logo file', () => {
    const s = clone()
    s.brand.coBrand = true
    expect(errorsIn(s, 'brand').map((e) => e.message)).toEqual(['Co-branding is on but there is no customer logo'])
    s.customer.logo = 'https://example.com/logo.png'
    expect(errorsIn(s, 'brand').map((e) => e.message)).toEqual([expect.stringContaining('works offline')])
    s.customer.logo = './brand/missing.svg'
    expect(checkSpec(s, { assetExists: () => false }).issues.filter((i) => i.gate === 'brand' && i.level === 'error').map((e) => e.message)).toEqual(['No file at public/brand/missing.svg'])
  })

  it('one spelling per name: catches two spellings of one site', () => {
    const s = clone()
    s.sites.push({ ...s.sites.find((x) => x.id === 'KHB-PS1')!, id: 'KHB-PS9', name: { en: 'Alkhobar Pumping Station', ar: 'محطة ضخ الخبر 9' } })
    expect(errorsIn(s, 'names').map((e) => e.message)).toEqual([expect.stringContaining('"Alkhobar Pumping Station" is the same name as site "Al Khobar Pumping Station"')])
  })

  it('one spelling per name: catches a misspelled name typed into an answer', () => {
    const s = clone()
    s.experts[0].answers[0].points[0].en = 'Crews are heading to Alkhobar North District now.'
    expect(errorsIn(s, 'names')[0].message).toContain('"Alkhobar North District" should be spelled "Al Khobar North District"')
  })

  it('one spelling per name: allows numbered sites that differ only by number', () => {
    expect(nameKey('Ad Dammam Pumping Station 1')).not.toEqual(nameKey('Ad Dammam Pumping Station 2'))
    expect(errorsIn(water, 'names')).toEqual([])
  })

  it('units: catches a count with no "of N" basis', () => {
    const s = clone()
    s.kpis.push({ id: 'crews', kind: 'count', label: { en: 'Crews deployed', ar: 'الفرق المنتشرة' }, unit: { en: 'crews', ar: 'فرق' }, value: 12, definition: { en: 'Crews out now.', ar: 'الفرق الآن.' }, source: 'customer' })
    expect(errorsIn(s, 'units')[0].message).toContain('is a count without an "of N" basis')
  })

  it('units: catches a key figure without a unit', () => {
    const s = clone()
    s.kpis[2].unit = { en: '', ar: '' }
    expect(errorsIn(s, 'units')[0].message).toContain('has no unit')
  })

  it('numbers: catches a number typed into an answer instead of a placeholder', () => {
    const s = clone()
    s.experts[0].answers[0].lead.en = 'About 18,000 customers are affected.'
    expect(errorsIn(s, 'numbers')[0].message).toContain('"18,000" is typed in')
  })

  it('numbers: catches a placeholder that points at nothing', () => {
    const s = clone()
    s.presenter.beats[0].narration.en = 'We have {kpi.does-not-exist} today.'
    expect(errorsIn(s, 'numbers')[0].message).toContain('{kpi.does-not-exist} does not match any kpi')
  })

  it('numbers: allows times and years', () => {
    expect(errorsIn(water, 'numbers')).toEqual([])
  })

  it('languages: catches missing Arabic in a bilingual pack', () => {
    const s = clone()
    delete s.sites[0].name.ar
    expect(errorsIn(s, 'languages')[0].path).toBe('sites[0].name')
  })

  it('languages: an English-only pack needs no Arabic', () => {
    const s = clone()
    s.languages = ['en']
    delete s.sites[0].name.ar
    expect(errorsIn(s, 'languages')).toEqual([])
  })

  it('sources: catches an assumed value with no reason', () => {
    const s = clone()
    s.kpis[3].why = ''
    expect(errorsIn(s, 'sources')[0].message).toContain('no reason')
  })

  it('sources: never lets the customer name be assumed', () => {
    const s = clone()
    s.customer = { ...s.customer, source: 'assumed', why: 'guess' }
    expect(errorsIn(s, 'sources')[0].message).toContain('never assumed')
    s.customer.name = { en: 'Customer', ar: 'العميل' }
    expect(errorsIn(s, 'sources')).toEqual([])
  })

  it('status: catches a critical site with no reason', () => {
    const s = clone()
    delete s.sites.find((x) => x.id === 'DMM-PS1')!.note
    expect(errorsIn(s, 'status')[0].message).toContain('has no note')
  })

  it('presenter: catches a hero question that no longer reaches its scripted answer', () => {
    const s = clone()
    s.experts[0].answers[0].questions = ['Give me the situation']
    const e = errorsIn(s, 'presenter')
    expect(e.length).toBeGreaterThan(0)
    expect(e[0].message).toContain('instead of "now"')
  })

  it('structure: catches a site in an unknown region', () => {
    const s = clone()
    s.sites[0].regionId = 'mars'
    expect(errorsIn(s, 'structure')[0].message).toContain('Unknown region "mars"')
  })

  it('structure: a pack without a map needs no geoId or coordinates', () => {
    const s = clone()
    delete s.geo
    for (const r of s.regions) delete r.geoId
    for (const x of s.sites) delete x.coordinates
    expect(errorsIn(s, 'structure')).toEqual([])
    expect(definePack(s).boundaries).toBeUndefined()
  })

  it('structure: a pack with a map needs coordinates and geoIds', () => {
    const s = clone()
    delete s.sites[0].coordinates
    delete s.regions[0].geoId
    expect(errorsIn(s, 'structure').map((e) => e.path)).toEqual([`regions.${s.regions[0].id}.geoId`, `sites.${s.sites[0].id}.coordinates`])
  })

  it('structure: catches an unknown boundary set', () => {
    const s = clone()
    s.geo = 'xx-adm1'
    expect(errorsIn(s, 'structure')[0].message).toContain('Unknown boundary set "xx-adm1"')
  })

  it('structure: catches an incomplete vocabulary', () => {
    const s = clone()
    s.vocabulary = { entity: { en: 'Branch', ar: 'الفرع' }, entityPlural: { en: 'Branches', ar: 'الفروع' }, group: { en: 'Business line', ar: 'قطاع الأعمال' }, groupPlural: { en: '', ar: '' }, type: { en: 'Channel', ar: 'القناة' } }
    expect(errorsIn(s, 'structure').map((e) => e.path)).toEqual(['vocabulary.groupPlural', 'vocabulary'])
  })

  it('languages: catches missing Arabic in the vocabulary', () => {
    const s = clone()
    s.vocabulary = { entity: { en: 'Branch' }, entityPlural: { en: 'Branches', ar: 'الفروع' }, group: { en: 'Business line', ar: 'قطاع الأعمال' }, groupPlural: { en: 'Business lines', ar: 'قطاعات الأعمال' } }
    expect(errorsIn(s, 'languages').map((e) => e.path)).toEqual(['vocabulary.entity'])
  })

  it('wizard: a full check fails while steps are unfinished', () => {
    const s = clone()
    s.wizard.completed = [1, 2, 3]
    expect(errorsIn(s, 'wizard')[0].message).toContain('4 Assets and sites')
  })

  it('wizard mode checks only finished steps', () => {
    const s = clone()
    s.wizard.completed = [1, 2, 3]
    s.kpis = []
    s.experts = []
    const report = checkSpec(s, { upToStep: 9 })
    expect(report.stepsChecked).toEqual([1, 2, 3])
    expect(report.issues.filter((i) => i.level === 'error')).toEqual([])
  })

  it('wizard mode still catches a duplicate spelling in the organisation step', () => {
    const s = clone()
    s.wizard.completed = [1, 2, 3]
    s.regions.push({ id: 'east2', geoId: 'eastern', name: { en: 'Eastern-Province', ar: 'المنطقة الشرقية 2' }, source: 'customer' })
    expect(errorsIn(s, 'names', { upToStep: 9 })[0].message).toContain('spelled differently')
  })
})

describe('answers and rendering', () => {
  const pack = definePack(water)

  it('renders placeholders from the data, so answers and tiles agree', () => {
    expect(render(pack, '{kpi.sites-attention} need attention; NRW {kpi.nrw}', 'en')).toBe('8 of 17 monitored sites need attention; NRW 24.3% of water supplied')
    expect(render(pack, '{kpi.sites-attention}', 'ar')).toBe('8 من 17 موقعاً مراقباً')
    expect(render(pack, '{fact.customers-affected} in {site.KHB-D1}', 'en')).toBe('18,400 customers in Al Khobar North District')
  })

  it('routes English and Arabic questions to the same answer', () => {
    const en = ask(pack, 'ops', 'what needs attention right now')
    const ar = ask(pack, 'ops', 'ما الذي يتطلب انتباهي الآن')
    expect(en.kind === 'answer' && en.answer.id).toBe('now')
    expect(ar.kind === 'answer' && ar.answer.id).toBe('now')
  })

  it('refuses out-of-scope topics', () => {
    expect(ask(pack, 'ops', 'Should we raise the tariff next year?').kind).toBe('refusal')
  })

  it('falls back with suggestions when nothing matches', () => {
    const r = ask(pack, 'ops', 'Who won the football?')
    expect(r.kind).toBe('fallback')
  })
})

describe('vocabulary', () => {
  const v = {
    entity: { en: 'Branch', ar: 'الفرع' },
    entityPlural: { en: 'Branches', ar: 'الفروع' },
    group: { en: 'Business line', ar: 'قطاع الأعمال' },
    groupPlural: { en: 'Business lines', ar: 'قطاعات الأعمال' },
  }

  it('rebuilds the UI wording from the pack', () => {
    const t = vocabularyTerms(v)
    expect(t.allRegions).toEqual({ en: 'All business lines', ar: 'كل قطاعات الأعمال' })
    expect(t.search).toEqual({ en: 'Search branches', ar: 'ابحث في الفروع' })
    expect(t.site).toEqual(v.entity)
    expect(t.type).toEqual({ en: 'Asset type', ar: 'نوع الأصل' })
  })

  it('labels assumptions with the pack wording', () => {
    const s = clone()
    s.vocabulary = v
    expect(definePack(s).assumptions.find((a) => a.path === 'sites.KHJ-D1')?.label).toMatch(/^Branch: /)
  })
})
