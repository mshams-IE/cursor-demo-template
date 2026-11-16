export type Locale = 'en' | 'ar'

/** Bilingual text. `ar` is required when the pack's languages include Arabic (enforced by the gates). */
export interface Text {
  en: string
  ar?: string
}

/**
 * Where a value came from. `assumed` values are allowed but always listed at review,
 * in the gates report and in the presenter's assumptions note.
 */
export type Source = 'customer' | 'starter' | 'assumed'

export interface Sourced {
  source: Source
  /** Required when source is `assumed`: one line on why this guess is plausible. */
  why?: string
}

export type Industry =
  | 'power'
  | 'water'
  | 'telecom'
  | 'aviation'
  | 'oil-gas'
  | 'banking'
  | 'retail'
  | 'healthcare'
  | 'government'
  | 'manufacturing'
  | 'logistics'
  | 'other'

/**
 * What this demo calls its sites, regions and asset types, e.g. "Branch" and "Business line" for a bank.
 * English is a label ("Business line"); lists use it lower-cased ("All business lines").
 * Arabic is written with the definite article ("الفرع", "الفروع") so it reads in "كل الفروع" and "حالة الفرع".
 * Omit to keep "Site", "Region" and "Asset type".
 */
export interface Vocabulary {
  entity: Text
  entityPlural: Text
  group: Text
  groupPlural: Text
  type?: Text
  typePlural?: Text
}

/** Status colours are fixed by the kit and never re-branded. */
export type Severity = 'normal' | 'watch' | 'critical'

export interface Customer extends Sourced {
  name: Text
  /** Path or URL of the customer logo for co-branding; omit to keep the Cloudera logo. */
  logo?: string
  /** Customer accent colour (hex). Replaces the Cloudera accent only. */
  accent?: string
}

export interface Clock {
  /** Local date and time the demo's "today" is observed at, e.g. 2026-11-15T10:30. */
  observedAt: string
  zone: Text
}

export interface Region extends Sourced {
  id: string
  /** Feature id in the boundary set named by `geo`. Required when the pack has a map. */
  geoId?: string
  name: Text
}

export interface AssetType extends Sourced {
  id: string
  name: Text
  /** Plural form used in units, e.g. "pumping stations". */
  plural: Text
}

export interface Site extends Sourced {
  id: string
  name: Text
  regionId: string
  type: string
  /** [longitude, latitude]. Required when the pack has a map. */
  coordinates?: [number, number]
  status: Severity
  /** Why the site is not normal. Required for watch and critical. */
  note?: Text
}

export interface SiteFilter {
  status?: Severity[]
  type?: string[]
  regionId?: string[]
}

interface KpiBase extends Sourced {
  id: string
  label: Text
  definition: Text
  /** Up to 25 points, oldest first, for the sparkline. */
  trend?: number[]
  delta?: { value: number; period: Text; worseWhenUp: boolean }
}

/** A count is always shown with its basis: "4 of 312 districts". */
export interface CountKpi extends KpiBase {
  kind: 'count'
  /** Noun for the basis, e.g. "districts", "monitored sites". */
  unit: Text
  /** Either fixed numbers, or derived from the site register so the map and report always agree. */
  value?: number
  of?: number
  derive?: { count: SiteFilter; of?: SiteFilter }
}

export interface PercentKpi extends KpiBase {
  kind: 'percent'
  value: number
  /** What the percentage is of, e.g. "of water supplied". */
  unit: Text
  decimals?: number
}

export interface MeasureKpi extends KpiBase {
  kind: 'measure'
  value: number
  unit: Text
  decimals?: number
}

export type Kpi = CountKpi | PercentKpi | MeasureKpi

/** A number used in answers or narration that is not a KPI tile. */
export interface Fact extends Sourced {
  id: string
  value: number
  unit: Text
  decimals?: number
}

export interface Incident extends Sourced {
  id: string
  title: Text
  siteId: string
  severity: Severity
  /** Local time HH:MM. */
  started: string
  impact: Text
  role?: 'hero' | 'chronic'
}

export interface Answer {
  id: string
  /** Phrasings that should route here. English first; Arabic phrasings when the pack is bilingual. */
  questions: string[]
  lead: Text
  points: Text[]
  followUps?: string[]
}

export interface Expert extends Sourced {
  id: string
  /** Fictional or role-based names only. */
  name: Text
  role: Text
  focus: Text
  answers: Answer[]
}

export interface Refusals {
  topics: { label: Text; keywords: string[] }[]
  reply: Text
}

export type ViewId = 'overview' | 'report' | 'experts'

export interface Beat {
  id: string
  title: Text
  narration: Text
  view: ViewId
  /** data-testid of the element to spotlight. */
  spotlight?: string
  regionId?: string
  ask?: { expertId: string; question: Text; answerId: string }
}

export interface WizardState {
  /** Next step to ask (1 to 9); 10 when the review is accepted. */
  step: number
  completed: number[]
  status: 'in-progress' | 'reviewed' | 'built'
}

export interface DemoSpec {
  specVersion: 1
  kitVersion: string
  wizard: WizardState
  id: string
  industry: Industry
  languages: Locale[]
  customer: Customer
  title: Text
  subtitle: Text
  audience: Text
  brand: { theme: 'cloudera'; coBrand: boolean }
  /** Boundary set for the map, e.g. "sa-adm1". Omit when the organisation does not map to geography; groups then show as tiles. */
  geo?: string
  vocabulary?: Vocabulary
  clock: Clock
  regions: Region[]
  assetTypes: AssetType[]
  sites: Site[]
  kpis: Kpi[]
  facts: Fact[]
  incidents: Incident[]
  experts: Expert[]
  refusals: Refusals
  presenter: { beats: Beat[] }
}
