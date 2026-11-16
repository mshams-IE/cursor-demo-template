import { fmtNumber, kpiPhrase, pick, type Pack } from '../../pack'
import { formatTime, toMs } from '../../model/time'
import type { Incident, Text } from '../../types'
import { appFeed, sourceFlow, type ArchGraph } from './model'
import { L } from './strings'

export interface TraceHop {
  nodes: string[]
  edges: string[]
  title: Text
  detail: Text
  code?: string
  ms: number
}

export interface Trace {
  id: 'incident' | 'question' | 'lineage'
  title: Text
  hops: TraceHop[]
  finale?: { label: Text; value: number; decimals?: number }
}

const e = (a: string, b: string) => `${a}--${b}`

export function heroIncident(pack: Pack): Incident | undefined {
  const list = pack.spec.incidents
  return list.find((i) => i.role === 'hero') ?? list.find((i) => i.severity === 'critical') ?? list[0]
}

const incidentMs = (i: Incident) => toMs(i.started)

function streamSource(g: ArchGraph, pack: Pack) {
  const sources = pack.spec.architecture?.sources
  const stream = sources?.find((s) => sourceFlow(s.kind) === 'stream')
  return stream ? `src-${stream.id}` : g.sourceIds[0]
}

const firstExpert = (g: ArchGraph) => g.expertIds.find((id) => id.startsWith('exp-') && id !== 'exp-more') ?? g.expertIds[0]

function finalApp(g: ArchGraph, prefer: string[]) {
  return prefer.map((id) => `app-${id}`).find((id) => g.appIds.includes(id)) ?? g.appIds[g.appIds.length - 1]
}

function specialistsLine(pack: Pack, locale: 'en' | 'ar') {
  const list = (pack.spec.specialists ?? []).filter((s) => s.stage !== 'lead').slice(0, 3)
  return list.map((s) => pick(s.name, locale)).join(locale === 'ar' ? '، ' : ', ')
}

export function incidentTrace(pack: Pack, g: ArchGraph): Trace | undefined {
  const inc = heroIncident(pack)
  if (!inc) return undefined
  const site = pack.site(inc.siteId)
  const name = (l: 'en' | 'ar') => pick(site?.name, l) || inc.siteId
  const region = (l: 'en' | 'ar') => (site ? pack.regionName(site.regionId, l) : '')
  const at = (l: 'en' | 'ar') => formatTime(incidentMs(inc), l)
  const src = streamSource(g, pack)
  const expert = firstExpert(g)
  const app = finalApp(g, ['briefs', 'overview'])
  const team = (l: 'en' | 'ar') => specialistsLine(pack, l)
  const expertName = (l: 'en' | 'ar') => {
    const x = pack.spec.experts.find((x) => `exp-${x.id}` === expert)
    return x ? `${pick(x.name, l)} · ${pick(x.role, l)}` : ''
  }
  const hops: TraceHop[] = [
    {
      nodes: [src],
      edges: [],
      title: L(`Event at ${name('en')}`, `حدث في ${name('ar')}`),
      detail: L(`${inc.title.en} at ${at('en')}.`, `${pick(inc.title, 'ar')} الساعة ${at('ar')}.`),
      code: `${inc.siteId} · ${at('en')}`,
      ms: 1500,
    },
    {
      nodes: ['nifi'],
      edges: [e(src, 'nifi')],
      title: L('Ingested with provenance', 'استيعاب مع تتبع المصدر'),
      detail: L('The flow normalises the event and stamps its source and time.', 'يوحد التدفق الحدث ويختمه بمصدره ووقته.'),
      code: 'Cloudera DataFlow · NiFi',
      ms: 1300,
    },
    {
      nodes: ['kafka'],
      edges: [e('nifi', 'kafka')],
      title: L('Published to the event stream', 'نشر إلى تدفق الأحداث'),
      detail: L('Ordered and durable, so the investigation can replay it exactly.', 'مرتب ومتين لتتمكن عملية التحقيق من إعادة تشغيله بدقة.'),
      code: `topic: ${pack.spec.id}.events`,
      ms: 1300,
    },
    {
      nodes: ['opdb', 'iceberg'],
      edges: [e('kafka', 'opdb'), e('kafka', 'iceberg')],
      title: L('Incident opened and stored', 'فتح الحادث وتخزينه'),
      detail: L(`${name('en')}${region('en') ? `, ${region('en')}` : ''}: live state updated and the incident written once to the lakehouse.`, `${name('ar')}${region('ar') ? `، ${region('ar')}` : ''}: تحديث الحالة الحية وتسجيل الحادث مرة واحدة في المستودع.`),
      code: 'ops.incidents',
      ms: 1500,
    },
    {
      nodes: ['cdw'],
      edges: [e('iceberg', 'cdw')],
      title: L('Impact counted', 'حساب الأثر'),
      detail: inc.affected
        ? L(`${fmtNumber(inc.affected.value, 'en')} ${inc.affected.unit.en}, counted once each.`, `${fmtNumber(inc.affected.value, 'ar')} ${pick(inc.affected.unit, 'ar')}، تُحسب مرة واحدة.`)
        : L(`${inc.impact.en}`, pick(inc.impact, 'ar')),
      code: 'view: impact',
      ms: 1500,
    },
    {
      nodes: ['agents', 'serving', ...(g.expertIds.includes('specialists') ? ['specialists'] : [])],
      edges: [e('cdw', 'agents'), e('opdb', 'agents'), e('serving', 'agents'), ...(g.expertIds.includes('specialists') ? [e('agents', 'specialists')] : [])],
      title: L('Specialists investigate', 'المتخصصون يحققون'),
      detail: team('en')
        ? L(`${team('en')} work in parallel on governed data.`, `${team('ar')} يعملون بالتوازي على بيانات محكومة.`)
        : L('Specialist agents work in parallel on governed data.', 'يعمل الوكلاء المتخصصون بالتوازي على بيانات محكومة.'),
      ms: 1800,
    },
    {
      nodes: ['inference', expert],
      edges: [e('agents', 'inference'), e('agents', expert)],
      title: L('The expert is ready to answer', 'الخبير جاهز للإجابة'),
      detail: L(`${expertName('en') || 'The digital expert'} answers from tool results only.`, `${expertName('ar') || 'الخبير الرقمي'} يجيب من نتائج الأدوات فقط.`),
      ms: 1600,
    },
  ]
  if (app)
    hops.push({
      nodes: [app],
      edges: [appFeed(g, app)].filter((x): x is string => !!x),
      title: L('Executive brief and screens update', 'تحديث الملخص والشاشات'),
      detail: L('The incident, key figures and map update; the brief is ready to share.', 'تتحدث بيانات الحادث والمؤشرات والخريطة؛ والملخص جاهز للمشاركة.'),
      ms: 1600,
    })
  return {
    id: 'incident',
    title: L(`Trace the ${at('en')} incident`, `تتبع حادث ${at('ar')}`),
    hops,
    finale: inc.affected ? { label: inc.affected.unit, value: inc.affected.value } : undefined,
  }
}

export function questionTrace(g: ArchGraph, question: string, expertId: string): Trace {
  const expert = g.expertIds.includes(`exp-${expertId}`) ? `exp-${expertId}` : firstExpert(g)
  const app = finalApp(g, ['experts', 'briefs'])
  const appEdge = [app && appFeed(g, app)].filter((x): x is string => !!x)
  return {
    id: 'question',
    title: L('Trace a question', 'تتبع سؤال'),
    hops: [
      {
        nodes: [expert],
        edges: [],
        title: L('Question asked', 'طرح السؤال'),
        detail: L(`“${question}” with the current screen scope.`, `«${question}» مع نطاق الشاشة الحالي.`),
        ms: 1300,
      },
      {
        nodes: ['agents', 'inference'],
        edges: [e('agents', expert), e('agents', 'inference')],
        title: L('Understood and planned', 'الفهم والتخطيط'),
        detail: L('The model chooses which tools to call; it does not produce numbers itself.', 'يختار النموذج الأدوات المطلوبة ولا ينتج الأرقام بنفسه.'),
        ms: 1500,
      },
      {
        nodes: ['agents', 'opdb', 'cdw', 'iceberg'],
        edges: [e('opdb', 'agents'), e('cdw', 'agents'), e('iceberg', 'cdw')],
        title: L('Governed data queried', 'الاستعلام عن البيانات المحكومة'),
        detail: L('Live state, key figures and history come from the governed tables.', 'الحالة الحية والمؤشرات والتاريخ من الجداول المحكومة.'),
        ms: 1600,
      },
      {
        nodes: ['agents', 'serving', ...(g.expertIds.includes('specialists') ? ['specialists'] : [])],
        edges: [e('serving', 'agents'), ...(g.expertIds.includes('specialists') ? [e('agents', 'specialists')] : [])],
        title: L('Specialists in parallel', 'المتخصصون بالتوازي'),
        detail: L('Models and specialist agents add their part, each with its inputs and evidence.', 'تضيف النماذج والوكلاء المتخصصون جزءهم، كلٌّ بمدخلاته وأدلته.'),
        ms: 1700,
      },
      {
        nodes: ['agents', 'sdx'],
        edges: [e('sdx', 'agents')],
        title: L('Checked against policy', 'التحقق مقابل السياسة'),
        detail: L('Access policies and lineage are applied before anything is shown.', 'تُطبق سياسات الوصول وتتبع الأصل قبل عرض أي شيء.'),
        ms: 1400,
      },
      {
        nodes: ['inference', expert, ...(app ? [app] : [])],
        edges: [e('agents', 'inference'), e('agents', expert), ...appEdge],
        title: L('Answer composed from tool results', 'صياغة الإجابة من نتائج الأدوات'),
        detail: L('Every number in the answer is checked against the data, with its source.', 'يُطابق كل رقم في الإجابة مع البيانات مع ذكر مصدره.'),
        ms: 1600,
      },
    ],
  }
}

export interface LineageItem {
  node: string
  label: Text
  detail: Text
}

/** Where the first key figure on the overview comes from, back to its source system. */
export function lineageChain(pack: Pack, g: ArchGraph): LineageItem[] {
  const k = pack.kpis[0]
  if (!k) return []
  const app = finalApp(g, ['overview']) ?? g.appIds[0]
  const src = streamSource(g, pack)
  const srcNode = pack.spec.architecture?.sources.find((s) => `src-${s.id}` === src)
  return [
    ...(app ? [{ node: app, label: L(`${k.kpi.label.en}: ${kpiPhrase(k, 'en')}`, `${pick(k.kpi.label, 'ar')}: ${kpiPhrase(k, 'ar')}`), detail: L('Key figure on the overview', 'مؤشر في النظرة التنفيذية') }] : []),
    { node: 'cdw', label: L(`view kpi_${k.kpi.id}`, `العرض kpi_${k.kpi.id}`), detail: L('Counted once, with its definition', 'محسوب مرة واحدة مع تعريفه') },
    { node: 'iceberg', label: L('ops.sites · ops.incidents', 'ops.sites · ops.incidents'), detail: L('Governed tables, as of the clock', 'جداول محكومة حسب الوقت') },
    { node: 'nifi', label: L('Ingest flow', 'تدفق الاستيعاب'), detail: L('Provenance stamped on every record', 'تتبع المصدر مختوم على كل سجل') },
    { node: src, label: srcNode?.label ?? L('Source system', 'النظام المصدر'), detail: L('Original record', 'السجل الأصلي') },
  ]
}

export function lineageTrace(pack: Pack, g: ArchGraph): Trace {
  return {
    id: 'lineage',
    title: L('Lineage of one figure', 'تتبع أصل رقم'),
    hops: lineageChain(pack, g).map((l) => ({ nodes: [l.node, 'sdx'], edges: [], title: l.label, detail: l.detail, ms: 1200 })),
  }
}
