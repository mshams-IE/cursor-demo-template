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

/**
 * All times in a pack are local wall-clock times in the demo's zone, written YYYY-MM-DDTHH:MM.
 * A bare HH:MM means that time on the day of `clock.observedAt`.
 */
export type LocalTime = string

export interface Clock {
  /** Local date and time the demo's "today" is observed at, e.g. 2026-11-15T10:30. */
  observedAt: LocalTime
  zone: Text
  /** Minutes east of UTC for the zone, e.g. 180 for Riyadh. Defaults to 180. */
  utcOffsetMinutes?: number
  /** Window the Replay clock can scrub; defaults to six hours before to two hours after observedAt. */
  replay?: { start: LocalTime; end: LocalTime }
  /** Label for the data shown, e.g. "Operating snapshot". */
  snapshotLabel?: Text
}

export interface SeriesPoint {
  at: LocalTime
  value: number
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
  /** Status changes during the day, oldest first. `status` and `note` hold the state before the first change. */
  timeline?: SiteChange[]
  /** Readings shown in the site popover and investigation, e.g. loading or queue length. */
  metrics?: SiteMetric[]
  /** Short labelled facts for the site report, e.g. "Commissioned: 2009". */
  details?: { label: Text; value: Text }[]
}

export interface SiteChange {
  at: LocalTime
  status: Severity
  note?: Text
}

export interface SiteMetric {
  id: string
  label: Text
  unit: Text
  value: number
  decimals?: number
  /** Policy or alarm limit; readings above it are flagged. */
  limit?: number
  /** Higher is worse (default true). */
  worseWhenUp?: boolean
  /** Readings through the day, oldest first; the value at the clock is the latest point at or before it. */
  series?: SeriesPoint[]
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
  /** Values through the day. When present, the tile, sparkline and change against one hour earlier follow the clock. */
  series?: SeriesPoint[]
  /** lucide-react icon name for the tile, e.g. "Activity", "Users", "Gauge", "TrendingUp". */
  icon?: string
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
  /** When it was detected and resolved (HH:MM or full local time). Before `started` it is not shown; after `resolved` it shows as restored. */
  resolved?: LocalTime
  /** Size of the impact for tiles and ranking, e.g. 13032 connections. */
  affected?: { value: number; unit: Text }
  /** Suspected cause and whether it is confirmed. */
  cause?: Text
  causeConfirmed?: boolean
  evidence?: Text[]
  /** Estimated hours to restore, from detection. */
  restoreHours?: [number, number]
  timeline?: IncidentStep[]
}

export interface IncidentStep {
  at: LocalTime
  kind: 'observation' | 'detection' | 'investigation' | 'recommendation' | 'response'
  text: Text
}

/** A banner for a condition that is not an incident, e.g. "Demand 220 MW above forecast in Riyadh". */
export interface Alert extends Sourced {
  id: string
  regionId?: string
  from: LocalTime
  to?: LocalTime
  severity: Severity
  title: Text
  text: Text
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
  /** Image in public/ (e.g. "./experts/ops.jpg") or a kit portrait id ("kit:man-1" … "kit:woman-3"). Initials when omitted. */
  portrait?: string
  /** false lists the expert as "Available on request"; they cannot be opened. */
  available?: boolean
  /** Category id from `expertCategories`, for the filter chips on the experts home. */
  category?: string
  tags?: Text[]
  /** Intro paragraph on the expert's introduction page. Falls back to `focus`. */
  intro?: Text
  /** First message in a new conversation. */
  greeting?: Text
  /** Specialist ids from `specialists` this expert calls. */
  team?: string[]
  /** Words that route a question to this expert from another one, e.g. ["budget", "cost", "ميزانية"]. */
  topics?: string[]
}

export interface ExpertCategory {
  id: string
  label: Text
}

/** An AI specialist an expert brings in; shown as a robot in the team strip and graph. */
export interface Specialist {
  id: string
  name: Text
  /** What it does, one line. */
  role: Text
  /** Lines shown while it works, e.g. "Comparing loading with alarm settings". */
  activities: Text[]
  /** Which stage of an investigation it runs in. */
  stage: 'lead' | 'analysis' | 'planning' | 'validation' | 'briefing'
  /** Robot colour (theme hex). */
  color?: string
}

export interface Refusals {
  topics: { label: Text; keywords: string[] }[]
  reply: Text
}

export type ViewId = 'overview' | 'report' | 'experts'

/** Pages of the full app. The nav shows a page only when the pack has the data it needs. */
export type PageId = 'experts' | 'overview' | 'sites' | 'planning' | 'briefs' | 'architecture'

export interface Beat {
  id: string
  title: Text
  narration: Text
  view: ViewId
  /** data-testid of the element to spotlight. */
  spotlight?: string
  regionId?: string
  ask?: { expertId: string; question: Text; answerId: string }
  /** Page to open for this beat; overrides `view`. */
  page?: PageId
  /** Move the clock (Replay) to this local time. */
  clock?: LocalTime
  siteId?: string
}

export interface Story {
  id: string
  title: Text
  beats: Beat[]
}

/** Options and assumptions for the Response Planning page. */
export interface Planning {
  /** Incidents the planner works on; defaults to every active incident. */
  incidentIds?: string[]
  budget: { unit: Text; min: number; max: number; step: number; default: number; presets: number[]; decimals?: number }
  /** Restoration windows offered, in hours. The first is the default. */
  windows: number[]
  /** Optional scenario slider, e.g. demand above forecast. Each option's benefit falls by `sensitivity` × the value. */
  scenario?: { label: Text; unit: Text; min: number; max: number; step: number; presets: number[] }
  /** What an option delivers, e.g. "connections restored". */
  benefit: { label: Text; unit: Text }
  /** What is left when the plan runs, e.g. "connections still interrupted"; defaults to the incidents' affected total minus the benefit. */
  baseline?: number
  options: PlanOption[]
  whatIf?: WhatIf
  /** Caveat shown under the plan, e.g. "Indicative calculation, not a switching plan". */
  note?: Text
}

export interface PlanOption extends Sourced {
  id: string
  incidentId?: string
  title: Text
  measures?: Text[]
  constraints?: Text[]
  cost: number
  benefit: number
  /** Hours to deliver, [fastest, slowest]. The option counts in a window only if the slowest fits. */
  hours: [number, number]
  /** Share of benefit lost per scenario unit, e.g. 0.02 loses 2% per percentage point of demand. */
  sensitivity?: number
  requiresReview?: boolean
}

/** A single what-if: one input slider and readings that move with it, compared with limits. */
export interface WhatIf {
  title: Text
  description: Text
  trigger: Text
  input: { label: Text; unit: Text; min: number; max: number; step: number }
  readings: { label: Text; unit: Text; base: number; perUnit: number; limit?: number; trip?: number; decimals?: number }[]
  impact: { label: Text; unit: Text; current: number; after: number }
}

/** Twelve months of daily history the experts can chart, generated deterministically from these settings. */
export interface HistorySeries {
  id: string
  label: Text
  unit: Text
  /** Expert who owns this series in answers. */
  expertId?: string
  /** Typical daily value. */
  base: number
  /** Seasonal swing as a share of base, peaking in `peakMonth` (1–12). */
  seasonal?: number
  peakMonth?: number
  /** Day-to-day noise as a share of base. */
  noise?: number
  decimals?: number
  /** Today's value comes from this KPI, so history and tiles agree. */
  todayFromKpi?: string
  /** Optional split, e.g. by cause or by region id, with weights that sum to 1. */
  breakdown?: { label: Text; parts: { id: string; label: Text; weight: number }[] }
  /** Words that point a question at this series, e.g. ["outages", "انقطاعات"]. */
  keywords?: string[]
}

/** Records the counts-only "Today's report" view is built from: one row per event, yesterday and today. */
export interface ReportRecords {
  label: Text
  plural: Text
  categories?: { id: string; label: Text }[]
  records: { siteId: string; at: LocalTime; category?: string }[]
}

/** Customer-specific labels for the Technology Architecture page. The Cloudera platform layers are fixed by the kit. */
export interface Architecture {
  sources: { id: string; label: Text; kind: string; icon?: string }[]
  apps?: { id: string; label: Text; kind?: Text }[]
  /** Where it runs, e.g. "In-Kingdom private cloud". */
  residency?: Text
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
  presenter: { beats: Beat[]; stories?: Story[] }
  /** Owner line under each expert's name, e.g. "Coastal Water · Operations". */
  org?: Text
  alerts?: Alert[]
  expertCategories?: ExpertCategory[]
  specialists?: Specialist[]
  planning?: Planning
  history?: HistorySeries[]
  report?: ReportRecords
  architecture?: Architecture
  /** Pages to hide even when the pack has their data. */
  hidePages?: PageId[]
}
