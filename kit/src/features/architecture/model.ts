import {
  Activity, Bell, Bot, Boxes, Building2, Cloud, CloudSun, Cog, CreditCard, Cpu, Database, Droplet, Factory, FileText, FlaskConical, Gauge, Globe, HeartPulse,
  LayoutDashboard, Layers, Map as MapIcon, MessageSquare, Phone, Plane, Radio, Satellite, Server, ShieldCheck, ShoppingCart, Sparkles, Table2, Thermometer,
  Truck, Users, Wifi, Workflow, Wrench, Zap, type LucideIcon,
} from 'lucide-react'
import { PAGES, visiblePages } from '../../app/pages'
import { pick, type Pack } from '../../pack'
import { UI, vocabularyTerms } from '../../terms'
import type { Industry, Text } from '../../types'
import { L } from './strings'

export type LaneId = 'sources' | 'ingest' | 'store' | 'process' | 'ai' | 'experts' | 'apps'
export type FlowKind = 'stream' | 'event' | 'batch' | 'ai' | 'governance'
export type Deployment = 'public' | 'private' | 'hybrid'
export type BuildStatus = 'target' | 'reference' | 'inBuild'
export type Place = 'private' | 'public' | 'site'

export interface ArchNode {
  id: string
  lane: LaneId | 'sdx'
  icon: LucideIcon
  /** Vendor or system name, always shown left-to-right. */
  product: string
  tag: Text
  name: Text
  role: Text
  inSolution: Text
  data: Text[]
  status: BuildStatus
  route?: string
}

export interface ArchFlow {
  id: string
  source: string
  target: string
  kind: FlowKind
  bidirectional?: boolean
}

export interface ArchLane {
  id: LaneId
  title: Text
  family: string
}

export const LANES: ArchLane[] = [
  { id: 'sources', title: L('Operational & enterprise sources', 'المصادر التشغيلية والمؤسسية'), family: '' },
  { id: 'ingest', title: L('Ingest & stream', 'الاستيعاب والتدفق'), family: 'Cloudera DataFlow' },
  { id: 'store', title: L('Store & govern', 'التخزين والحوكمة'), family: 'Cloudera Lakehouse' },
  { id: 'process', title: L('Process & analyse', 'المعالجة والتحليل'), family: 'Cloudera Data Services' },
  { id: 'ai', title: L('Grounded AI', 'ذكاء اصطناعي مُسند'), family: 'Cloudera AI' },
  { id: 'experts', title: L('Digital experts', 'الخبراء الرقميون'), family: '' },
  { id: 'apps', title: L('Executive experience', 'التجربة التنفيذية'), family: '' },
]

export const LANE_W = 214
export const LANE_GAP = 40
export const NODE_W = 190
export const NODE_STEP = 74
const HEAD = 66
const FOOT = 58

export const TOTAL_W = LANES.length * LANE_W + (LANES.length - 1) * LANE_GAP

export function laneX(index: number, rtl: boolean) {
  const i = rtl ? LANES.length - 1 - index : index
  return i * (LANE_W + LANE_GAP)
}

export const FLOW_COLOR: Record<FlowKind, string> = {
  stream: '#00a7e1',
  event: '#00a3af',
  batch: '#8b87c9',
  ai: '#413cc3',
  governance: '#120046',
}

export const FLOW_LABEL: Record<FlowKind, Text> = {
  stream: L('Real-time stream', 'تدفق لحظي'),
  event: L('Events & alarms', 'الأحداث والإنذارات'),
  batch: L('Curated & reference data', 'بيانات مجهزة ومرجعية'),
  ai: L('AI requests & answers', 'طلبات الذكاء الاصطناعي وإجاباته'),
  governance: L('Policy & lineage', 'السياسات وتتبع الأصل'),
}

export const STATUS_LABEL: Record<BuildStatus, Text> = {
  target: L('Target integration', 'تكامل مستهدف'),
  reference: L('Reference production design', 'تصميم الإنتاج المرجعي'),
  inBuild: L('Running in this demo', 'يعمل في هذا العرض'),
}

export const PLACE: Record<Place, { icon: LucideIcon; label: Text; color: string; bg: string }> = {
  private: { icon: Server, label: L('Private cloud', 'سحابة خاصة'), color: '#120046', bg: '#ecebfa' },
  public: { icon: Cloud, label: L('Public cloud region', 'منطقة سحابة عامة'), color: '#006b74', bg: '#e0f5f6' },
  site: { icon: Building2, label: L('Operational systems', 'الأنظمة التشغيلية'), color: '#5b5f7a', bg: '#f3f3f7' },
}

export const DEPLOYMENTS: Deployment[] = ['private', 'public', 'hybrid']

export const DEPLOYMENT: Record<Deployment, { title: Text; lanes: Record<LaneId, Place>; note: Text; llm: Text }> = {
  private: {
    title: L('Private cloud', 'سحابة خاصة'),
    lanes: { sources: 'site', ingest: 'private', store: 'private', process: 'private', ai: 'private', experts: 'private', apps: 'private' },
    note: L(
      'Every engine, including the language model, runs on Cloudera Private Cloud in your own data centres. No data leaves your environment.',
      'تعمل جميع المحركات، بما فيها النموذج اللغوي، على سحابة Cloudera الخاصة في مراكز بياناتكم. لا تغادر البيانات بيئتكم.',
    ),
    llm: L('Private LLM endpoint', 'نموذج لغوي خاص'),
  },
  public: {
    title: L('Public cloud', 'سحابة عامة'),
    lanes: { sources: 'site', ingest: 'public', store: 'public', process: 'public', ai: 'public', experts: 'public', apps: 'public' },
    note: L(
      'The same stack on Cloudera on cloud in the cloud region you choose, with identical SDX security and governance policies.',
      'المنظومة نفسها على Cloudera السحابية في المنطقة السحابية التي تختارونها، بسياسات أمن وحوكمة SDX مطابقة.',
    ),
    llm: L('LLM endpoint in your region', 'نموذج لغوي في منطقتكم السحابية'),
  },
  hybrid: {
    title: L('Hybrid, one control plane', 'هجين بلوحة تحكم واحدة'),
    lanes: { sources: 'site', ingest: 'private', store: 'private', process: 'private', ai: 'public', experts: 'public', apps: 'public' },
    note: L(
      'Operational data stays on private cloud; elastic AI and analytics capacity bursts to a public cloud region under the same policies and lineage.',
      'تبقى البيانات التشغيلية على السحابة الخاصة؛ وتتوسع قدرة الذكاء الاصطناعي والتحليلات إلى منطقة سحابية عامة بالسياسات وتتبع الأصل نفسيهما.',
    ),
    llm: L('Elastic LLM endpoint', 'نموذج لغوي مرن'),
  },
}

const ICON_BY_NAME: Record<string, LucideIcon> = {
  Activity, Bell, Bot, Boxes, Building2, Cloud, CloudSun, Cog, CreditCard, Cpu, Database, Droplet, Factory, FileText, FlaskConical, Gauge, Globe, HeartPulse,
  Layers, Map: MapIcon, MessageSquare, Phone, Plane, Radio, Satellite, Server, ShieldCheck, ShoppingCart, Sparkles, Table2, Thermometer, Truck, Users, Wifi,
  Workflow, Wrench, Zap,
}

const KIND_ICON: Record<string, LucideIcon> = { stream: Activity, events: Bell, event: Bell, reference: MapIcon, batch: Database }

/** Flow kind for a pack source kind such as "stream", "events", "reference" or "batch". */
export function sourceFlow(kind: string): FlowKind {
  const k = kind.toLowerCase()
  if (k.startsWith('stream') || k.includes('telemetry') || k.includes('real')) return 'stream'
  if (k.startsWith('event') || k.includes('alarm')) return 'event'
  return 'batch'
}

type SourceDef = { id: string; label: Text; kind: string; icon?: string }

const S = (id: string, en: string, ar: string, kind: string, icon: string): SourceDef => ({ id, label: L(en, ar), kind, icon })

const INDUSTRY_SOURCES: Partial<Record<Industry, SourceDef[]>> = {
  power: [
    S('scada', 'SCADA / EMS', 'سكادا / إدارة الطاقة', 'stream', 'Radio'),
    S('oms', 'Outage management', 'إدارة الانقطاعات', 'events', 'Zap'),
    S('gis', 'GIS network model', 'نموذج الشبكة الجغرافي', 'reference', 'Map'),
    S('ami', 'Smart meters', 'العدادات الذكية', 'events', 'Gauge'),
    S('eam', 'Asset & maintenance', 'الأصول والصيانة', 'batch', 'Wrench'),
    S('weather', 'Weather & demand forecast', 'الطقس وتوقع الطلب', 'batch', 'CloudSun'),
  ],
  water: [
    S('scada', 'SCADA telemetry', 'قياسات سكادا', 'stream', 'Radio'),
    S('meters', 'Meter data', 'بيانات العدادات', 'events', 'Gauge'),
    S('gis', 'GIS network model', 'نموذج الشبكة الجغرافي', 'reference', 'Map'),
    S('lims', 'Water quality lab', 'مختبر جودة المياه', 'batch', 'FlaskConical'),
    S('eam', 'Asset & maintenance', 'الأصول والصيانة', 'batch', 'Wrench'),
  ],
  telecom: [
    S('oss', 'Network telemetry (OSS)', 'قياسات الشبكة', 'stream', 'Wifi'),
    S('faults', 'Fault management', 'إدارة الأعطال', 'events', 'Bell'),
    S('cdr', 'Call & data records', 'سجلات المكالمات والبيانات', 'batch', 'Phone'),
    S('inventory', 'Network inventory', 'جرد الشبكة', 'reference', 'Map'),
    S('crm', 'Customer care (CRM)', 'خدمة العملاء', 'batch', 'Users'),
  ],
  banking: [
    S('core', 'Core banking', 'النظام المصرفي الأساسي', 'stream', 'Database'),
    S('payments', 'Payments & cards', 'المدفوعات والبطاقات', 'events', 'CreditCard'),
    S('channels', 'Digital channels', 'القنوات الرقمية', 'events', 'Globe'),
    S('crm', 'Customer records (CRM)', 'سجلات العملاء', 'reference', 'Users'),
    S('risk', 'Risk & compliance', 'المخاطر والامتثال', 'batch', 'ShieldCheck'),
  ],
  aviation: [
    S('ops', 'Flight operations', 'عمليات الطيران', 'stream', 'Plane'),
    S('aodb', 'Airport operational database', 'قاعدة بيانات تشغيل المطار', 'events', 'Database'),
    S('baggage', 'Baggage & passenger flow', 'الأمتعة وتدفق المسافرين', 'events', 'Users'),
    S('mro', 'Maintenance (MRO)', 'الصيانة', 'batch', 'Wrench'),
    S('weather', 'Weather', 'الطقس', 'batch', 'CloudSun'),
  ],
  'oil-gas': [
    S('scada', 'SCADA / DCS', 'سكادا / التحكم الموزع', 'stream', 'Radio'),
    S('historian', 'Process historian', 'سجل العمليات', 'stream', 'Activity'),
    S('alarms', 'Alarms & events', 'الإنذارات والأحداث', 'events', 'Bell'),
    S('eam', 'Asset & maintenance', 'الأصول والصيانة', 'batch', 'Wrench'),
    S('hse', 'HSE records', 'سجلات الصحة والسلامة', 'batch', 'ShieldCheck'),
  ],
}

const GENERIC_SOURCES: SourceDef[] = [
  S('ops', 'Operational systems', 'الأنظمة التشغيلية', 'stream', 'Activity'),
  S('events', 'Events & alarms', 'الأحداث والإنذارات', 'events', 'Bell'),
  S('register', 'Asset & site register', 'سجل الأصول والمواقع', 'reference', 'Map'),
  S('erp', 'Enterprise systems (ERP / CRM)', 'أنظمة المؤسسة', 'batch', 'Database'),
  S('external', 'External data', 'بيانات خارجية', 'batch', 'Globe'),
]

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function vocab(pack: Pack) {
  const v = pack.spec.vocabulary ? vocabularyTerms(pack.spec.vocabulary) : {}
  const term = (k: 'site' | 'sites' | 'region') => v[k] ?? UI[k]
  return { site: term('site'), sites: term('sites'), region: term('region'), terms: v }
}

export interface ArchGraph {
  nodes: ArchNode[]
  flows: ArchFlow[]
  laneCounts: Record<LaneId, number>
  laneH: number
  sdxY: number
  sourceIds: string[]
  expertIds: string[]
  /** Expert-lane nodes that feed the applications. */
  people: string[]
  appIds: string[]
}

export function buildGraph(pack: Pack): ArchGraph {
  const { spec } = pack
  const v = vocab(pack)
  const sources = (spec.architecture?.sources?.length ? spec.architecture.sources : (INDUSTRY_SOURCES[spec.industry] ?? GENERIC_SOURCES)).slice(0, 9)
  const names = (list: { label: Text }[], locale: 'en' | 'ar') => list.map((s) => pick(s.label, locale)).join(locale === 'ar' ? '، ' : ', ')
  const langs = spec.languages.includes('ar') ? L('Arabic and English', 'العربية والإنجليزية') : L('English', 'الإنجليزية')

  const sourceNodes: ArchNode[] = sources.map((s) => ({
    id: `src-${s.id}`,
    lane: 'sources',
    icon: (s.icon && ICON_BY_NAME[s.icon]) || KIND_ICON[s.kind] || Database,
    product: s.label.en,
    tag: L(s.kind.charAt(0).toUpperCase() + s.kind.slice(1), { stream: 'تدفق', events: 'أحداث', event: 'أحداث', reference: 'مرجعي', batch: 'دفعات' }[s.kind] ?? s.kind),
    name: s.label,
    role: L(`Source system feeding the platform as ${sourceFlow(s.kind) === 'stream' ? 'a real-time stream' : sourceFlow(s.kind) === 'event' ? 'events' : 'reference and batch data'}.`, `نظام مصدر يغذي المنصة ${sourceFlow(s.kind) === 'stream' ? 'بتدفق لحظي' : sourceFlow(s.kind) === 'event' ? 'بالأحداث' : 'ببيانات مرجعية ودفعات'}.`),
    inSolution: L(`Feeds ${lower(pick(v.sites, 'en'))} status, incidents and key figures across every screen.`, `يغذي حالة ${pick(v.sites, 'ar')} والحوادث والمؤشرات في كل الشاشات.`),
    data: [s.label],
    status: 'target',
  }))

  const kpiCount = spec.kpis.length
  const cloudera: ArchNode[] = [
    {
      id: 'nifi', lane: 'ingest', icon: Workflow, product: 'Cloudera DataFlow', tag: L('NiFi', 'NiFi'),
      name: L('Apache NiFi flows', 'تدفقات Apache NiFi'),
      role: L('Collects, normalises and routes every source with full provenance.', 'يجمع كل مصدر ويوحده ويوجهه مع تتبع كامل للمصدر.'),
      inSolution: L(`One flow for each of the ${sources.length} source systems (${names(sources, 'en')}); real-time events go to Kafka, reference data to the lakehouse.`, `تدفق لكل نظام من الأنظمة المصدرية الـ ${sources.length} (${names(sources, 'ar')})؛ الأحداث اللحظية إلى Kafka والبيانات المرجعية إلى المستودع.`),
      data: [L('Protocol adapters', 'محولات البروتوكولات'), L('Provenance for every record', 'تتبع مصدر كل سجل')],
      status: 'reference',
    },
    {
      id: 'kafka', lane: 'ingest', icon: Layers, product: 'Cloudera Streams Messaging', tag: L('Kafka', 'Kafka'),
      name: L('Apache Kafka streams', 'تدفقات Apache Kafka'),
      role: L('Durable, ordered event backbone.', 'عمود فقري متين ومرتب للأحداث.'),
      inSolution: L(`Topics for ${lower(pick(v.site, 'en'))} events and readings, replayable for investigation.`, `مواضيع لأحداث وقراءات ${pick(v.site, 'ar')} قابلة لإعادة التشغيل للتحقيق.`),
      data: [L(`${spec.id}.events`, `${spec.id}.events`), L(`${spec.id}.readings`, `${spec.id}.readings`)],
      status: 'reference',
    },
    {
      id: 'iceberg', lane: 'store', icon: Database, product: 'Apache Iceberg', tag: L('Iceberg', 'Iceberg'),
      name: L('Open data lakehouse', 'مستودع البيانات المفتوح'),
      role: L('One open, governed copy of the data with time travel.', 'نسخة واحدة مفتوحة ومحكومة من البيانات مع إمكانية الرجوع الزمني.'),
      inSolution: L(`${spec.sites.length} ${lower(pick(v.sites, 'en'))}, ${spec.incidents.length} incidents and ${kpiCount} key figures as of any moment, used by every screen.`, `${spec.sites.length} من ${pick(v.sites, 'ar')} و${spec.incidents.length} حوادث و${kpiCount} مؤشرات في أي لحظة، تستخدمها كل الشاشات.`),
      data: [L('ops.sites', 'ops.sites'), L('ops.incidents', 'ops.incidents'), L('ops.history', 'ops.history')],
      status: 'reference',
      route: PAGES.find((p) => p.id === 'sites')?.path,
    },
    {
      id: 'cde', lane: 'process', icon: Cog, product: 'Cloudera Data Engineering', tag: L('Spark', 'Spark'),
      name: L('Spark pipelines', 'خطوط Spark'),
      role: L('Curates history, reference and asset data.', 'يجهز البيانات التاريخية والمرجعية وبيانات الأصول.'),
      inSolution: spec.history?.length
        ? L(`Builds the ${spec.history.length} daily history series the experts chart.`, `يبني ${spec.history.length} سلاسل تاريخية يومية يرسمها الخبراء.`)
        : L('Builds the governed reference model and the history the experts use.', 'يبني النموذج المرجعي المحكوم والتاريخ الذي يستخدمه الخبراء.'),
      data: [L('Reference build', 'بناء المرجع'), L('Daily history', 'التاريخ اليومي')],
      status: 'reference',
    },
    {
      id: 'cdw', lane: 'process', icon: Table2, product: 'Cloudera Data Warehouse', tag: L('Impala · Hive', 'Impala · Hive'),
      name: L('Data Warehouse analytics', 'تحليلات مستودع البيانات'),
      role: L('Interactive SQL for key figures and impact.', 'استعلامات تفاعلية للمؤشرات والأثر.'),
      inSolution: L(`Computes the ${kpiCount} key figures on the overview, counted once each.`, `يحسب المؤشرات الـ ${kpiCount} في النظرة التنفيذية، كل منها مرة واحدة.`),
      data: [L('KPI views', 'عروض المؤشرات'), L('Impact views', 'عروض الأثر')],
      status: 'reference',
      route: '/overview',
    },
    {
      id: 'opdb', lane: 'process', icon: Server, product: 'Cloudera Operational Database', tag: L('OpDB', 'OpDB'),
      name: L('Operational database', 'قاعدة البيانات التشغيلية'),
      role: L('Low-latency current state for live screens.', 'حالة آنية منخفضة الكمون للشاشات الحية.'),
      inSolution: L(`Current status of every ${lower(pick(v.site, 'en'))} for the map and the live tiles.`, `الحالة الحالية لكل ${pick(v.site, 'ar')} للخريطة والمؤشرات الحية.`),
      data: [L(`${pick(v.site, 'en')} state`, `حالة ${pick(v.site, 'ar')}`), L('Open incidents', 'الحوادث المفتوحة')],
      status: 'reference',
    },
    {
      id: 'serving', lane: 'ai', icon: Cpu, product: 'Cloudera AI', tag: L('Model serving', 'خدمة النماذج'),
      name: L('Model serving', 'خدمة النماذج'),
      role: L('Deploys engineering and forecasting models as governed endpoints.', 'ينشر النماذج الهندسية والتنبؤية كنقاط خدمة محكومة.'),
      inSolution: spec.planning
        ? L('Scores the response options and what-ifs on Response Planning.', 'يقيّم خيارات الاستجابة وسيناريوهات ماذا لو في تخطيط الاستجابة.')
        : L('Scores forecasts and risk for the experts.', 'يقيّم التوقعات والمخاطر للخبراء.'),
      data: [L('Forecast model', 'نموذج التوقع'), L('Option scoring', 'تقييم الخيارات')],
      status: 'reference',
      route: spec.planning ? '/planning' : undefined,
    },
    {
      id: 'agents', lane: 'ai', icon: Bot, product: 'Cloudera AI', tag: L('AI agents · RAG', 'وكلاء · RAG'),
      name: L('AI agents & retrieval', 'الوكلاء الأذكياء والاسترجاع'),
      role: L('Orchestrates specialist agents that call typed, audited tools, grounded in documents by retrieval.', 'ينسق وكلاء متخصصين يستدعون أدوات محددة وخاضعة للتدقيق، ويسند الإجابات إلى الوثائق بالاسترجاع.'),
      inSolution: L(`${spec.specialists?.length ?? 0} AI specialists support ${spec.experts.length} digital experts; every answer is checked against the data.`, `${spec.specialists?.length ?? 0} متخصصين أذكياء يدعمون ${spec.experts.length} خبراء رقميين؛ ويُطابق كل جواب مع البيانات.`),
      data: [L('Typed tools', 'أدوات محددة'), L('Procedures & manuals', 'الإجراءات والأدلة')],
      status: 'inBuild',
    },
    {
      id: 'inference', lane: 'ai', icon: Sparkles, product: 'Cloudera AI Inference', tag: L('AI Inference', 'AI Inference'),
      name: DEPLOYMENT.private.llm,
      role: L('Hosts the language model inside the governed environment.', 'يستضيف النموذج اللغوي داخل البيئة المحكومة.'),
      inSolution: L(`Understands questions in ${langs.en} and drafts answers from tool results only.`, `يفهم الأسئلة بـ${langs.ar} ويصوغ الإجابات من نتائج الأدوات فقط.`),
      data: [L('Prompts and tool results', 'الطلبات ونتائج الأدوات')],
      status: 'reference',
    },
  ]

  const available = spec.experts.filter((e) => e.available !== false)
  const onRequest = spec.experts.length - available.length
  const expertNodes: ArchNode[] = available.slice(0, 5).map((e) => ({
    id: `exp-${e.id}`,
    lane: 'experts',
    icon: MessageSquare,
    product: 'Digital expert',
    tag: e.role,
    name: e.name,
    role: e.focus,
    inSolution: e.intro ?? e.focus,
    data: [L(`${e.answers.length} grounded answers`, `${e.answers.length} إجابات مسندة`), ...(e.tags ?? []).slice(0, 3)],
    status: 'inBuild',
    route: `/experts/${e.id}`,
  }))
  if (spec.specialists?.length)
    expertNodes.push({
      id: 'specialists', lane: 'experts', icon: Bot, product: 'AI specialists', tag: L('AI specialists', 'المتخصصون الأذكياء'),
      name: L(`AI specialist team (${spec.specialists.length})`, `فريق المتخصصين (${spec.specialists.length})`),
      role: L('Specialist agents each expert calls on for one part of an investigation.', 'وكلاء متخصصون يستعين بهم كل خبير لجزء من التحقيق.'),
      inSolution: L(names(spec.specialists.map((s) => ({ label: s.name })), 'en'), names(spec.specialists.map((s) => ({ label: s.name })), 'ar')),
      data: spec.specialists.map((s) => s.role).slice(0, 4),
      status: 'inBuild',
    })
  if (onRequest > 0)
    expertNodes.push({
      id: 'exp-more', lane: 'experts', icon: Users, product: 'Digital expert', tag: L('On request', 'عند الطلب'),
      name: L(`${onRequest} more on request`, `${onRequest} آخرون عند الطلب`),
      role: L('Further experts that can be added on the same platform.', 'خبراء إضافيون يمكن إضافتهم على المنصة نفسها.'),
      inSolution: L(names(spec.experts.filter((e) => e.available === false).map((e) => ({ label: e.role })), 'en'), names(spec.experts.filter((e) => e.available === false).map((e) => ({ label: e.role })), 'ar')),
      data: [],
      status: 'target',
    })
  if (!expertNodes.length)
    expertNodes.push({
      id: 'exp-generic', lane: 'experts', icon: MessageSquare, product: 'Digital expert', tag: L('Digital expert', 'خبير رقمي'),
      name: L('Digital expert', 'الخبير الرقمي'),
      role: L('One conversational expert for executives.', 'خبير محادثة واحد للمسؤولين.'),
      inSolution: L('Answers questions about today’s data in plain language.', 'يجيب عن الأسئلة حول بيانات اليوم بلغة واضحة.'),
      data: [],
      status: 'target',
    })

  const pageApps = visiblePages(pack, 'experts').filter((p) => p.id !== 'architecture')
  const appNodes: ArchNode[] = (spec.architecture?.apps?.length
    ? spec.architecture.apps.map((a) => ({ id: a.id, label: a.label, kind: a.kind, route: PAGES.find((p) => p.id === a.id)?.path }))
    : pageApps.map((p) => ({ id: p.id, label: v.terms[p.label] ?? UI[p.label], kind: undefined, route: p.path }))
  )
    .slice(0, 7)
    .map((a) => ({
      id: `app-${a.id}`,
      lane: 'apps' as const,
      icon: a.id === 'briefs' ? FileText : a.id === 'experts' ? Sparkles : a.id === 'overview' ? LayoutDashboard : a.id === 'planning' ? Boxes : a.id.includes('site') || a.id.includes('station') ? Zap : LayoutDashboard,
      product: 'Application',
      tag: a.kind ?? L('Application', 'تطبيق'),
      name: a.label,
      role: L('Part of this executive application.', 'جزء من هذا التطبيق التنفيذي.'),
      inSolution: a.kind ?? a.label,
      data: [],
      status: 'inBuild' as const,
      route: a.route,
    }))

  const sdx: ArchNode = {
    id: 'sdx', lane: 'sdx', icon: ShieldCheck, product: 'Cloudera SDX', tag: L('SDX · Ranger · Atlas', 'SDX · Ranger · Atlas'),
    name: L('Security, governance & lineage', 'الأمن والحوكمة وتتبع الأصل'),
    role: L('One set of security policies, audit and lineage across every engine.', 'مجموعة واحدة من سياسات الأمن والتدقيق وتتبع الأصل عبر كل المحركات.'),
    inSolution: L('Every figure on screen traces back to its source records; AI tools see only what policy allows.', 'يمكن تتبع كل رقم على الشاشة حتى سجلاته المصدرية؛ ولا ترى أدوات الذكاء الاصطناعي إلا ما تسمح به السياسة.'),
    data: [L('Ranger policies', 'سياسات Ranger'), L('Atlas lineage', 'تتبع Atlas'), L('Audit trail', 'سجل التدقيق')],
    status: 'reference',
  }

  const nodes = [...sourceNodes, ...cloudera, ...expertNodes, ...appNodes, sdx]
  const f = (source: string, target: string, kind: FlowKind, bidirectional?: boolean): ArchFlow => ({ id: `${source}--${target}`, source, target, kind, bidirectional })
  const people = expertNodes.filter((n) => n.status !== 'target' || n.id === 'exp-generic')
  const flows: ArchFlow[] = [
    ...sources.map((s) => f(`src-${s.id}`, 'nifi', sourceFlow(s.kind))),
    f('nifi', 'kafka', 'stream'),
    f('nifi', 'iceberg', 'batch'),
    f('kafka', 'iceberg', 'stream'),
    f('kafka', 'opdb', 'event'),
    f('iceberg', 'cde', 'batch'),
    f('iceberg', 'cdw', 'batch'),
    f('cde', 'serving', 'batch'),
    f('cdw', 'agents', 'batch'),
    f('opdb', 'agents', 'event'),
    f('serving', 'agents', 'ai'),
    f('agents', 'inference', 'ai', true),
    ...people.map((n) => f('agents', n.id, 'ai', true)),
    ...appNodes.map((a, i) => f(people[i % people.length].id, a.id, 'ai')),
    f('sdx', 'nifi', 'governance'),
    f('sdx', 'iceberg', 'governance'),
    f('sdx', 'cdw', 'governance'),
    f('sdx', 'agents', 'governance'),
  ]

  const laneCounts = Object.fromEntries(LANES.map((l) => [l.id, nodes.filter((n) => n.lane === l.id).length])) as Record<LaneId, number>
  const maxN = Math.max(5, ...Object.values(laneCounts))
  const laneH = HEAD + maxN * NODE_STEP + FOOT
  return {
    nodes,
    flows,
    laneCounts,
    laneH,
    sdxY: laneH + 34,
    sourceIds: sourceNodes.map((n) => n.id),
    expertIds: expertNodes.map((n) => n.id),
    people: people.map((n) => n.id),
    appIds: appNodes.map((n) => n.id),
  }
}

/** The flow that feeds an application node from the experts lane. */
export function appFeed(g: ArchGraph, appId: string): string | undefined {
  const i = g.appIds.indexOf(appId)
  return i < 0 || !g.people.length ? undefined : `${g.people[i % g.people.length]}--${appId}`
}

/** Vertical position of the i-th of n nodes, centred in the lane body. */
export function nodeY(i: number, n: number, laneH: number) {
  const body = laneH - HEAD - FOOT
  return HEAD + (body - n * NODE_STEP) / 2 + i * NODE_STEP + 6
}
