import { ask, fold } from '../src/engine'
import { BOUNDARIES, featureBBox, pointInBBox } from '../src/geo'
import { collectAssumptions, definePack, type Pack } from '../src/pack'
import { KNOWN_TESTIDS } from '../src/testids'
import type { Beat, DemoSpec, Kpi, Locale, SeriesPoint, Sourced, Text } from '../src/types'
import { KIT_VERSION } from '../src/version'

export type GateId = 'wizard' | 'structure' | 'languages' | 'names' | 'units' | 'numbers' | 'sources' | 'status' | 'presenter' | 'brand'

export const GATES: Record<GateId, string> = {
  wizard: 'Wizard steps complete',
  structure: 'Ids and references resolve',
  languages: 'Every text is in every pack language',
  names: 'One spelling per name',
  units: 'Every key figure states its unit and basis',
  numbers: 'Numbers in answers and narration come from the data',
  sources: 'Every value says where it came from',
  status: 'Every flagged site says why',
  presenter: 'Presenter questions give the scripted answers',
  brand: 'Brand stays within the kit rules',
}

export interface Issue {
  gate: GateId
  level: 'error' | 'warn'
  path: string
  message: string
}

export interface Report {
  issues: Issue[]
  assumptions: Pack['assumptions']
  stepsChecked: number[]
}

/** Which wizard step fills which part of the spec. */
export const STEPS: Record<number, string> = {
  1: 'Customer',
  2: 'Brand',
  3: 'Organisation',
  4: 'Assets and sites',
  5: 'Key figures',
  6: 'Story',
  7: 'Experts',
  8: 'Presenter',
  9: 'Review',
}

const STATUS_HEX = ['#0E9F6E', '#E3A008', '#D92D20']

function hexToRgb(hex: string): [number, number, number] | undefined {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return undefined
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function colourDistance(a: string, b: string) {
  const x = hexToRgb(a)!
  const y = hexToRgb(b)!
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

function isText(v: unknown): v is Text {
  return !!v && typeof v === 'object' && typeof (v as Text).en === 'string' && Object.keys(v as object).every((k) => k === 'en' || k === 'ar')
}

function walkTexts(v: unknown, path: string, out: { path: string; text: Text }[]) {
  if (isText(v)) out.push({ path, text: v })
  else if (Array.isArray(v)) v.forEach((x, i) => walkTexts(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkTexts(x, path ? `${path}.${k}` : k, out)
}

function levenshtein(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}

/** Spelling-insensitive key: "Al Khobar", "Al-Khobar" and "Alkhobar" share one key. */
export function nameKey(s: string) {
  return fold(s)
    .replace(/^(al|el)[\s-]?(?=\p{L}{3})/u, '')
    .replace(/^ال/, '')
    .replace(/[\s\-'’.]/g, '')
}

const PLACEHOLDER = /\{(kpi|fact|site|region)\.([A-Za-z0-9_-]+)(\.value)?\}/g
/** HH:MM on the observed day, or a full local YYYY-MM-DDTHH:MM. */
const LOCAL_TIME = /^(\d{4}-\d{2}-\d{2}T)?\d{2}:\d{2}$/
const SEVERITIES = ['normal', 'watch', 'critical']
const PAGE_IDS = ['experts', 'overview', 'sites', 'planning', 'briefs', 'architecture']
const VIEW_IDS = ['overview', 'report', 'experts']
const STAGES = ['lead', 'analysis', 'planning', 'validation', 'briefing']

/** Sort key for local times, so "HH:MM" on the observed day orders against full dates. */
const timeKey = (t: string, day: string) => (t.length === 5 ? `${day}T${t}` : t)

/** Every beat in the pack: the default run and each story, with the path to report against. */
function allBeats(spec: DemoSpec): { beat: Beat; path: string }[] {
  const out = (spec.presenter?.beats ?? []).map((beat) => ({ beat, path: `presenter.beats.${beat.id}` }))
  for (const s of spec.presenter?.stories ?? []) for (const beat of s.beats ?? []) out.push({ beat, path: `presenter.stories.${s.id}.beats.${beat.id}` })
  return out
}

/**
 * Pass `upToStep` to check only what the wizard has filled so far.
 * Pass `assetExists` (paths as written in the spec, relative to `public/`) to check that logo files exist.
 */
export function checkSpec(raw: unknown, opts: { upToStep?: number; assetExists?: (path: string) => boolean } = {}): Report {
  const spec = raw as DemoSpec
  const issues: Issue[] = []
  const err = (gate: GateId, path: string, message: string) => issues.push({ gate, level: 'error', path, message })
  const warn = (gate: GateId, path: string, message: string) => issues.push({ gate, level: 'warn', path, message })
  const partial = opts.upToStep !== undefined
  const done = new Set(partial ? (spec.wizard?.completed ?? []).filter((s) => s <= opts.upToStep!) : [1, 2, 3, 4, 5, 6, 7, 8, 9])
  const has = (step: number) => done.has(step)
  const languages: Locale[] = spec.languages ?? ['en']
  const day = spec.clock?.observedAt?.slice(0, 10) ?? ''

  if (!partial) {
    const missing = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((s) => !spec.wizard?.completed?.includes(s))
    if (missing.length) err('wizard', 'wizard.completed', `Steps not finished: ${missing.map((s) => `${s} ${STEPS[s]}`).join(', ')}`)
  }

  const unique = (list: { id: string }[] | undefined, path: string) => {
    const seen = new Set<string>()
    for (const x of list ?? []) {
      if (seen.has(x.id)) err('structure', `${path}.${x.id}`, `Duplicate id "${x.id}"`)
      seen.add(x.id)
    }
  }

  if (has(1)) {
    if (!spec.customer?.name?.en) err('structure', 'customer.name', 'Customer name is missing')
    if (!spec.title?.en) err('structure', 'title', 'Demo title is missing')
    if (!languages.includes('en')) err('languages', 'languages', 'English is always required')
  }

  const mapped = !!spec.geo
  const boundaries = spec.geo ? BOUNDARIES[spec.geo] : undefined
  if (has(3)) {
    if (mapped && !boundaries) err('structure', 'geo', `Unknown boundary set "${spec.geo}". Known: ${Object.keys(BOUNDARIES).join(', ')}. Add one with scripts/add-geo.mjs, or remove geo for a demo without a map`)
    unique(spec.regions, 'regions')
    for (const r of spec.regions ?? []) {
      if (!mapped) continue
      if (!r.geoId) err('structure', `regions.${r.id}.geoId`, `${r.name.en} has no geoId, which the map needs`)
      else if (boundaries && !boundaries.features.some((f) => f.properties.id === r.geoId)) err('structure', `regions.${r.id}.geoId`, `No boundary "${r.geoId}" in ${spec.geo}`)
    }
    const v = spec.vocabulary
    if (v) for (const k of ['entity', 'entityPlural', 'group', 'groupPlural'] as const) if (!v[k]?.en?.trim()) err('structure', `vocabulary.${k}`, `Vocabulary needs "${k}"`)
    if (v && !v.type !== !v.typePlural) err('structure', 'vocabulary', 'Give both "type" and "typePlural", or neither')
  }

  if (has(4)) {
    unique(spec.assetTypes, 'assetTypes')
    unique(spec.sites, 'sites')
    const regionIds = new Set((spec.regions ?? []).map((r) => r.id))
    const typeIds = new Set((spec.assetTypes ?? []).map((t) => t.id))
    for (const s of spec.sites ?? []) {
      if (!regionIds.has(s.regionId)) err('structure', `sites.${s.id}.regionId`, `Unknown region "${s.regionId}"`)
      if (!typeIds.has(s.type)) err('structure', `sites.${s.id}.type`, `Unknown asset type "${s.type}"`)
      if (mapped) {
        const region = spec.regions.find((r) => r.id === s.regionId)
        const feature = boundaries?.features.find((f) => f.properties.id === region?.geoId)
        if (!s.coordinates) err('structure', `sites.${s.id}.coordinates`, `${s.name.en} has no coordinates, which the map needs`)
        else if (feature && !pointInBBox(s.coordinates, featureBBox(feature), 0.3)) warn('structure', `sites.${s.id}.coordinates`, `${s.name.en} sits outside ${region?.name.en}`)
      }
      if (!SEVERITIES.includes(s.status)) err('status', `sites.${s.id}.status`, `Unknown status "${s.status}". Use normal, watch or critical`)
      if (s.status !== 'normal' && !s.note?.en) err('status', `sites.${s.id}.note`, `${s.name.en} is ${s.status} but has no note saying why`)
      let note = s.note
      let last = ''
      for (const c of s.timeline ?? []) {
        const p = `sites.${s.id}.timeline.${c.at}`
        if (!LOCAL_TIME.test(c.at)) err('structure', p, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
        else if (timeKey(c.at, day) < last) err('structure', p, 'Timeline changes must be oldest first')
        else last = timeKey(c.at, day)
        if (!SEVERITIES.includes(c.status)) err('status', p, `Unknown status "${c.status}". Use normal, watch or critical`)
        note = c.note ?? (c.status === 'normal' ? undefined : note)
        if (c.status !== 'normal' && !note?.en) err('status', p, `${s.name.en} turns ${c.status} at ${c.at} with no note saying why`)
      }
      for (const m of s.metrics ?? []) checkSeries(m.series, `sites.${s.id}.metrics.${m.id}.series`, day, err)
    }
  }

  if (has(4) && spec.report) {
    const siteIds = new Set((spec.sites ?? []).map((s) => s.id))
    const cats = spec.report.categories ? new Set(spec.report.categories.map((c) => c.id)) : undefined
    unique(spec.report.categories, 'report.categories')
    spec.report.records.forEach((r, i) => {
      const p = `report.records[${i}]`
      if (!siteIds.has(r.siteId)) err('structure', `${p}.siteId`, `Unknown site "${r.siteId}"`)
      if (!LOCAL_TIME.test(r.at)) err('structure', `${p}.at`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
      if (r.category !== undefined && cats && !cats.has(r.category)) err('structure', `${p}.category`, `Unknown category "${r.category}"`)
    })
  }

  if (has(5)) {
    unique(spec.kpis, 'kpis')
    unique(spec.facts, 'facts')
    for (const k of spec.kpis ?? []) {
      checkKpi(k, err, warn)
      checkSeries(k.series, `kpis.${k.id}.series`, day, err)
    }
    unique(spec.history, 'history')
    const kpiIds = new Set((spec.kpis ?? []).map((k) => k.id))
    for (const h of spec.history ?? []) {
      const p = `history.${h.id}`
      if (h.todayFromKpi && !kpiIds.has(h.todayFromKpi)) err('structure', `${p}.todayFromKpi`, `Unknown KPI "${h.todayFromKpi}"`)
      if (h.expertId && has(7) && !spec.experts?.some((e) => e.id === h.expertId)) err('structure', `${p}.expertId`, `Unknown expert "${h.expertId}"`)
      if (h.peakMonth !== undefined && (h.peakMonth < 1 || h.peakMonth > 12)) err('structure', `${p}.peakMonth`, 'peakMonth is a calendar month, 1 to 12')
      if (!h.unit?.en?.trim()) err('units', `${p}.unit`, `${h.label.en} has no unit`)
      const sum = (h.breakdown?.parts ?? []).reduce((a, x) => a + x.weight, 0)
      if (h.breakdown && Math.abs(sum - 1) > 0.02) warn('structure', `${p}.breakdown`, `Breakdown weights add up to ${sum.toFixed(2)}, not 1`)
    }
  }

  if (has(6)) {
    unique(spec.incidents, 'incidents')
    for (const i of spec.incidents ?? []) {
      const p = `incidents.${i.id}`
      if (has(4) && !spec.sites.some((s) => s.id === i.siteId)) err('structure', `${p}.siteId`, `Unknown site "${i.siteId}"`)
      if (!LOCAL_TIME.test(i.started)) err('structure', `${p}.started`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
      if (i.resolved !== undefined) {
        if (!LOCAL_TIME.test(i.resolved)) err('structure', `${p}.resolved`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
        else if (LOCAL_TIME.test(i.started) && timeKey(i.resolved, day) < timeKey(i.started, day)) err('structure', `${p}.resolved`, 'Resolved before it started')
      }
      for (const st of i.timeline ?? []) if (!LOCAL_TIME.test(st.at)) err('structure', `${p}.timeline.${st.at}`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
      if (i.restoreHours && i.restoreHours[0] > i.restoreHours[1]) err('structure', `${p}.restoreHours`, 'Give restoreHours as [fastest, slowest]')
      if (i.affected && !i.affected.unit?.en?.trim()) err('units', `${p}.affected.unit`, `${i.title.en}: affected has no unit`)
    }
    if (!spec.incidents?.some((i) => i.role === 'hero')) warn('structure', 'incidents', 'No hero incident is marked (role: "hero")')

    unique(spec.alerts, 'alerts')
    for (const a of spec.alerts ?? []) {
      const p = `alerts.${a.id}`
      if (a.regionId && has(3) && !spec.regions?.some((r) => r.id === a.regionId)) err('structure', `${p}.regionId`, `Unknown region "${a.regionId}"`)
      if (!SEVERITIES.includes(a.severity)) err('status', `${p}.severity`, `Unknown severity "${a.severity}"`)
      for (const k of ['from', 'to'] as const) if (a[k] !== undefined && !LOCAL_TIME.test(a[k]!)) err('structure', `${p}.${k}`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
    }

    const plan = spec.planning
    if (plan) {
      const incidentIds = new Set((spec.incidents ?? []).map((i) => i.id))
      unique(plan.options, 'planning.options')
      for (const id of plan.incidentIds ?? []) if (!incidentIds.has(id)) err('structure', 'planning.incidentIds', `Unknown incident "${id}"`)
      const b = plan.budget
      if (b && (b.default < b.min || b.default > b.max)) err('structure', 'planning.budget.default', `Default budget ${b.default} is outside ${b.min} to ${b.max}`)
      if (!plan.windows?.length) err('structure', 'planning.windows', 'Give at least one restoration window in hours')
      for (const o of plan.options ?? []) {
        const p = `planning.options.${o.id}`
        if (o.incidentId && !incidentIds.has(o.incidentId)) err('structure', `${p}.incidentId`, `Unknown incident "${o.incidentId}"`)
        if (o.hours?.[0] > o.hours?.[1]) err('structure', `${p}.hours`, 'Give hours as [fastest, slowest]')
        if (o.cost < 0 || o.benefit < 0) err('structure', p, 'Cost and benefit cannot be negative')
      }
      const used = new Set(plan.incidentIds ?? [...incidentIds])
      if ((plan.options ?? []).length && !(plan.options ?? []).some((o) => !o.incidentId || used.has(o.incidentId))) warn('structure', 'planning.options', 'No option belongs to the incidents the planner works on')
    }
  }

  if (has(7)) {
    unique(spec.expertCategories, 'expertCategories')
    unique(spec.specialists, 'specialists')
    const categories = new Set((spec.expertCategories ?? []).map((c) => c.id))
    const specialists = new Set((spec.specialists ?? []).map((s) => s.id))
    for (const s of spec.specialists ?? []) {
      if (!STAGES.includes(s.stage)) err('structure', `specialists.${s.id}.stage`, `Unknown stage "${s.stage}". Use ${STAGES.join(', ')}`)
      if (s.color && !hexToRgb(s.color)) err('brand', `specialists.${s.id}.color`, 'Colour must be a #RRGGBB theme hex')
    }
    unique(spec.experts, 'experts')
    for (const e of spec.experts ?? []) {
      if (e.category && !categories.has(e.category)) err('structure', `experts.${e.id}.category`, `Unknown expert category "${e.category}"`)
      for (const t of e.team ?? []) if (!specialists.has(t)) err('structure', `experts.${e.id}.team`, `Unknown specialist "${t}"`)
      if (e.available !== false && !e.answers.length) warn('structure', `experts.${e.id}.answers`, `${e.name.en} can be opened but has no answers`)
      const ids = new Set(e.answers.map((a) => a.id))
      for (const a of e.answers) {
        if (!a.questions.length) err('structure', `experts.${e.id}.answers.${a.id}`, 'Answer has no question phrasings')
        for (const f of a.followUps ?? []) if (!ids.has(f)) err('structure', `experts.${e.id}.answers.${a.id}.followUps`, `Unknown follow-up "${f}"`)
        if (languages.includes('ar') && !a.questions.some((q) => /[\u0600-\u06FF]/.test(q))) warn('languages', `experts.${e.id}.answers.${a.id}.questions`, 'No Arabic phrasing, so Arabic questions may not route here')
      }
    }
    if (!spec.refusals?.topics?.length) warn('structure', 'refusals', 'No refusal topics')
  }

  if (has(8)) {
    unique(spec.presenter?.beats, 'presenter.beats')
    unique(spec.presenter?.stories, 'presenter.stories')
    for (const s of spec.presenter?.stories ?? []) unique(s.beats, `presenter.stories.${s.id}.beats`)
    for (const { beat: b, path } of allBeats(spec)) {
      if (b.spotlight && !KNOWN_TESTIDS.some((t) => b.spotlight === t || b.spotlight!.startsWith(`${t}-`))) warn('presenter', `${path}.spotlight`, `"${b.spotlight}" is not a kit element`)
      if (!VIEW_IDS.includes(b.view)) err('presenter', `${path}.view`, `Unknown view "${b.view}". Use ${VIEW_IDS.join(', ')}`)
      if (b.page && !PAGE_IDS.includes(b.page)) err('presenter', `${path}.page`, `Unknown page "${b.page}". Use ${PAGE_IDS.join(', ')}`)
      if (b.page && spec.hidePages?.includes(b.page)) err('presenter', `${path}.page`, `Page "${b.page}" is hidden by hidePages`)
      if (b.siteId && has(4) && !spec.sites?.some((s) => s.id === b.siteId)) err('presenter', `${path}.siteId`, `Unknown site "${b.siteId}"`)
      if (b.regionId && has(3) && !spec.regions?.some((r) => r.id === b.regionId)) err('presenter', `${path}.regionId`, `Unknown region "${b.regionId}"`)
      if (b.clock && !LOCAL_TIME.test(b.clock)) err('presenter', `${path}.clock`, 'Use HH:MM or YYYY-MM-DDTHH:MM local time')
    }
  }
  for (const p of spec.hidePages ?? []) if (!PAGE_IDS.includes(p)) err('structure', 'hidePages', `Unknown page "${p}". Use ${PAGE_IDS.join(', ')}`)

  if (has(2) && spec.brand?.coBrand) {
    const logo = spec.customer?.logo
    if (!logo) err('brand', 'customer.logo', 'Co-branding is on but there is no customer logo')
    else if (/^(https?:)?\/\//.test(logo)) err('brand', 'customer.logo', 'Logo must be a file in public/, so the demo works offline')
    else if (opts.assetExists && !opts.assetExists(logo)) err('brand', 'customer.logo', `No file at public/${logo.replace(/^\.?\//, '')}`)
  }
  if (has(2) && spec.customer?.accent) {
    if (!hexToRgb(spec.customer.accent)) err('brand', 'customer.accent', 'Accent must be a #RRGGBB colour')
    else if (STATUS_HEX.some((h) => colourDistance(h, spec.customer.accent!) < 60)) warn('brand', 'customer.accent', 'Accent is close to a status colour, so branded tiles may read as alerts')
  }
  if (!partial && spec.kitVersion !== KIT_VERSION) warn('brand', 'kitVersion', `Built for kit ${spec.kitVersion}, this kit is ${KIT_VERSION}. Run the update-from-template skill.`)

  checkLanguages(spec, languages, has, err)
  checkSources(spec, has, err)
  const names = has(3) || has(4) ? checkNames(spec, languages, err) : undefined

  const pack = !partial || (has(3) && has(4) && has(5)) ? safePack(spec) : undefined
  if (pack) checkNumbers(spec, names, languages, has, err)
  if (pack && has(7) && has(8)) checkPresenter(spec, pack, languages, err)

  return { issues, assumptions: collectAssumptions(spec), stepsChecked: [...done].sort((a, b) => a - b) }
}

function safePack(spec: DemoSpec) {
  try {
    return definePack(spec)
  } catch {
    return undefined
  }
}

type Flag = (gate: GateId, path: string, message: string) => void

function checkKpi(k: Kpi, err: Flag, warn: Flag) {
  const p = `kpis.${k.id}`
  if (!k.unit?.en?.trim()) err('units', `${p}.unit`, `${k.label.en} has no unit`)
  if (!k.definition?.en) warn('units', `${p}.definition`, `${k.label.en} has no definition`)
  if (k.kind === 'count' && !k.derive && (k.value === undefined || k.of === undefined)) err('units', p, `${k.label.en} is a count without an "of N" basis. Set value and of, or derive it from the sites`)
  if (k.kind === 'percent' && (k.value < 0 || k.value > 100)) err('units', `${p}.value`, 'Percent outside 0 to 100')
  if ((k.trend?.length ?? 0) > 25) warn('units', `${p}.trend`, 'Trend is capped at 25 points')
}

function checkSeries(series: SeriesPoint[] | undefined, path: string, day: string, err: Flag) {
  let last = ''
  for (const p of series ?? []) {
    if (!LOCAL_TIME.test(p.at) || typeof p.value !== 'number') return err('structure', path, `Series point "${p.at}" needs a HH:MM or YYYY-MM-DDTHH:MM time and a number`)
    if (timeKey(p.at, day) < last) return err('structure', path, `Series points must be oldest first ("${p.at}" is out of order)`)
    last = timeKey(p.at, day)
  }
}

function checkLanguages(spec: DemoSpec, languages: Locale[], has: (n: number) => boolean, err: Flag) {
  if (!languages.includes('ar')) return
  const sections: [number, keyof DemoSpec][] = [
    [1, 'customer'], [1, 'title'], [1, 'subtitle'], [1, 'audience'], [3, 'regions'], [3, 'vocabulary'], [4, 'assetTypes'], [4, 'sites'], [4, 'report'],
    [5, 'kpis'], [5, 'facts'], [5, 'history'], [6, 'incidents'], [6, 'clock'], [6, 'alerts'], [6, 'planning'], [7, 'experts'], [7, 'refusals'],
    [7, 'org'], [7, 'expertCategories'], [7, 'specialists'], [8, 'presenter'], [9, 'architecture'],
  ]
  for (const [step, key] of sections) {
    if (!has(step)) continue
    const texts: { path: string; text: Text }[] = []
    walkTexts(spec[key], key, texts)
    for (const t of texts) if (t.text.en && !t.text.ar?.trim()) err('languages', t.path, `Missing Arabic for "${t.text.en.slice(0, 60)}"`)
  }
}

function checkSources(spec: DemoSpec, has: (n: number) => boolean, err: Flag) {
  const check = (path: string, item: Sourced | undefined) => {
    if (!item) return
    if (!['customer', 'starter', 'assumed'].includes(item.source)) err('sources', path, 'source must be customer, starter or assumed')
    if (item.source === 'assumed' && !item.why?.trim()) err('sources', path, 'Assumed value has no reason (why)')
  }
  if (has(1)) {
    check('customer', spec.customer)
    if (spec.customer?.source === 'assumed' && spec.customer.name.en !== 'Customer') err('sources', 'customer.name', 'The customer name is never assumed. Use "Customer" until it is given')
  }
  const lists: [number, string, Sourced[] | undefined][] = [
    [3, 'regions', spec.regions], [4, 'assetTypes', spec.assetTypes], [4, 'sites', spec.sites], [5, 'kpis', spec.kpis],
    [5, 'facts', spec.facts], [6, 'incidents', spec.incidents], [6, 'alerts', spec.alerts], [6, 'planning.options', spec.planning?.options], [7, 'experts', spec.experts],
  ]
  for (const [step, key, list] of lists) if (has(step)) (list ?? []).forEach((x, i) => check(`${key}[${i}]`, x))
}

interface NameEntry {
  kind: string
  id: string
  name: Text
}

function checkNames(spec: DemoSpec, languages: Locale[], err: Flag): NameEntry[] {
  const entries: NameEntry[] = [
    ...(spec.regions ?? []).map((r) => ({ kind: 'region', id: r.id, name: r.name })),
    ...(spec.sites ?? []).map((s) => ({ kind: 'site', id: s.id, name: s.name })),
  ]
  for (const locale of languages) {
    const keyed = entries.map((e) => ({ e, raw: (locale === 'ar' ? e.name.ar : e.name.en) ?? '', key: nameKey((locale === 'ar' ? e.name.ar : e.name.en) ?? '') })).filter((x) => x.key)
    for (let i = 0; i < keyed.length; i++)
      for (let j = i + 1; j < keyed.length; j++) {
        const a = keyed[i]
        const b = keyed[j]
        if (a.e.kind === 'region' && b.e.kind === 'site') continue
        if (a.key === b.key) err('names', `${b.e.kind}s.${b.e.id}.name`, `"${b.raw}" is the same name as ${a.e.kind} "${a.raw}" spelled ${a.raw === b.raw ? 'identically' : 'differently'}`)
        else if (a.key.replace(/\d/g, '') !== b.key.replace(/\d/g, '') && Math.min(a.key.length, b.key.length) >= 5 && levenshtein(a.key, b.key) <= 1)
          err('names', `${b.e.kind}s.${b.e.id}.name`, `"${b.raw}" and "${a.raw}" look like two spellings of one name`)
      }
  }
  return entries
}

function textFields(spec: DemoSpec, has: (n: number) => boolean): { path: string; text: Text }[] {
  const out: { path: string; text: Text }[] = []
  const add = (path: string, text: Text | undefined) => text && out.push({ path, text })
  if (has(4))
    for (const s of spec.sites ?? []) {
      add(`sites.${s.id}.note`, s.note)
      for (const c of s.timeline ?? []) add(`sites.${s.id}.timeline.${c.at}.note`, c.note)
    }
  if (has(6)) {
    for (const i of spec.incidents ?? []) {
      add(`incidents.${i.id}.impact`, i.impact)
      add(`incidents.${i.id}.title`, i.title)
      add(`incidents.${i.id}.cause`, i.cause)
      i.evidence?.forEach((t, n) => add(`incidents.${i.id}.evidence[${n}]`, t))
      for (const st of i.timeline ?? []) add(`incidents.${i.id}.timeline.${st.at}`, st.text)
    }
    for (const a of spec.alerts ?? []) {
      add(`alerts.${a.id}.title`, a.title)
      add(`alerts.${a.id}.text`, a.text)
    }
  }
  if (has(7))
    for (const e of spec.experts ?? []) {
      add(`experts.${e.id}.intro`, e.intro)
      add(`experts.${e.id}.greeting`, e.greeting)
      for (const a of e.answers) {
        add(`experts.${e.id}.answers.${a.id}.lead`, a.lead)
        a.points.forEach((p, n) => add(`experts.${e.id}.answers.${a.id}.points[${n}]`, p))
      }
    }
  if (has(8)) for (const { beat, path } of allBeats(spec)) add(`${path}.narration`, beat.narration)
  return out
}

function checkNumbers(spec: DemoSpec, entries: NameEntry[] | undefined, languages: Locale[], has: (n: number) => boolean, err: Flag) {
  const known = { kpi: new Set(spec.kpis.map((k) => k.id)), fact: new Set(spec.facts.map((f) => f.id)), site: new Set(spec.sites.map((s) => s.id)), region: new Set(spec.regions.map((r) => r.id)) }
  const names = entries
  // Longest first, so "Riyadh North 247" is taken out whole before the region "Riyadh" can split it.
  const spellings = Object.fromEntries(
    languages.map((locale) => [locale, (entries ?? []).map((n) => (locale === 'ar' ? n.name.ar : n.name.en) ?? '').filter(Boolean).sort((a, b) => b.length - a.length)]),
  ) as Record<Locale, string[]>
  for (const { path, text } of textFields(spec, has))
    for (const locale of languages) {
      const s = (locale === 'ar' ? text.ar : text.en) ?? ''
      for (const m of s.matchAll(PLACEHOLDER)) if (!known[m[1] as keyof typeof known].has(m[2])) err('numbers', path, `${m[0]} does not match any ${m[1]}`)
      let rest = s.replace(PLACEHOLDER, ' ').replace(/\b\d{1,2}:\d{2}\b/g, ' ').replace(/\b(19|20)\d{2}\b/g, ' ')
      for (const raw of spellings[locale]) rest = rest.split(raw).join(' ')
      const stray = rest.match(/[0-9\u0660-\u0669]+([.,][0-9]+)?%?/)
      if (stray) err('numbers', `${path}.${locale}`, `"${stray[0]}" is typed in. Use {kpi.ID}, {fact.ID} or {site.ID} so it always matches the data`)
      if (names) {
        for (const n of names) {
          const raw = locale === 'ar' ? n.name.ar : n.name.en
          if (!raw) continue
          const key = nameKey(raw)
          const width = raw.trim().split(/\s+/).length
          const words = s.replace(PLACEHOLDER, ' ').split(/\s+/)
          for (let w = Math.max(1, width - 1); w <= width + 1; w++)
            for (let i = 0; i + w <= words.length; i++) {
              const window = words.slice(i, i + w).join(' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
              if (window !== raw && nameKey(window) === key) err('names', `${path}.${locale}`, `"${window}" should be spelled "${raw}" (or use {${n.kind}.${n.id}})`)
            }
        }
      }
    }
}

function checkPresenter(spec: DemoSpec, pack: Pack, languages: Locale[], err: Flag) {
  for (const { beat: b, path } of allBeats(spec)) {
    if (!b.ask) continue
    const expert = spec.experts.find((e) => e.id === b.ask!.expertId)
    if (!expert) {
      err('presenter', `${path}.ask.expertId`, `Unknown expert "${b.ask.expertId}"`)
      continue
    }
    if (expert.available === false) err('presenter', `${path}.ask.expertId`, `${expert.name.en} is only available on request and cannot be asked`)
    if (!expert.answers.some((a) => a.id === b.ask!.answerId)) {
      err('presenter', `${path}.ask.answerId`, `${expert.name.en} has no answer "${b.ask.answerId}"`)
      continue
    }
    for (const locale of languages) {
      const q = locale === 'ar' ? b.ask.question.ar : b.ask.question.en
      if (!q) continue
      const reply = ask(pack, expert.id, q)
      const got = reply.kind === 'answer' ? reply.answer.id : reply.kind
      if (got !== b.ask.answerId) err('presenter', `${path}.ask.${locale}`, `"${q}" gets "${got}" instead of "${b.ask.answerId}". Add this phrasing to the answer's questions`)
    }
  }
}
