import '@xyflow/react/dist/style.css'
import '../features/architecture/architecture.css'
import { Handle, Position, ReactFlow, type Edge, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import { CheckCircle2, Pause, Play, Route, ShieldCheck, Waypoints, X, Zap } from 'lucide-react'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { visiblePages } from '../app/pages'
import { CountUp, prefersReducedMotion } from '../components/ui'
import { FlowEdge, type FlowEdgeData } from '../features/architecture/FlowEdge'
import {
  DEPLOYMENT, DEPLOYMENTS, FLOW_COLOR, FLOW_LABEL, LANES, LANE_W, NODE_W, PLACE, STATUS_LABEL, TOTAL_W, buildGraph, laneX, nodeY,
  type ArchNode, type FlowKind, type Place,
} from '../features/architecture/model'
import { useArch } from '../features/architecture/store'
import { S } from '../features/architecture/strings'
import { heroIncident, incidentTrace, lineageChain, lineageTrace, questionTrace, type Trace } from '../features/architecture/traces'
import { useT } from '../i18n'
import { fmtNumber, pick } from '../pack'
import { useDemo } from '../store'
import { formatTime, toMs } from '../model/time'
import type { Locale, Text } from '../types'

type CompData = { c: ArchNode; rtl: boolean; locale: Locale; lit: boolean; done: boolean; dim: boolean; selected: boolean }
type LaneData = { title: string; family: string; place: Place; locale: Locale; index: number; height: number }

const CompNode = memo(function CompNode({ data }: NodeProps<Node<CompData>>) {
  const { c, rtl, locale, lit, done, dim, selected } = data
  const Icon = c.icon
  const isSdx = c.lane === 'sdx'
  const target = c.status === 'target'
  const iconBg = lit ? 'var(--brand-accent)' : isSdx ? 'var(--brand-primary)' : c.status === 'inBuild' ? '#e0f5f6' : '#ecebfa'
  const iconFg = lit || isSdx ? '#fff' : c.status === 'inBuild' ? '#00838c' : 'var(--brand-secondary)'
  return (
    <div
      className={`arch-node relative flex items-center gap-3 rounded-2xl bg-white px-3 py-2 text-start shadow-sm ${lit ? 'arch-lit' : ''}`}
      style={{
        width: isSdx ? TOTAL_W - 40 : NODE_W,
        minHeight: 58,
        border: `2px ${target ? 'dashed' : 'solid'} ${lit ? 'var(--brand-accent)' : selected ? 'var(--brand-secondary)' : 'var(--line)'}`,
        opacity: dim ? 0.3 : 1,
        transform: lit ? 'scale(1.06)' : 'scale(1)',
        cursor: 'pointer',
        direction: rtl ? 'rtl' : 'ltr',
        justifyContent: isSdx ? 'center' : undefined,
      }}
      data-testid={`arch-node-${c.id}`}
      data-lit={lit}
    >
      <Handle id="in" type="target" position={rtl ? Position.Right : Position.Left} />
      <Handle id="top" type="target" position={Position.Bottom} />
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: iconBg, color: iconFg, transition: 'background 300ms' }}>
        {done && !lit ? <CheckCircle2 size={19} /> : <Icon size={19} />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{pick(c.tag, locale)}</span>
        <span className="line-clamp-2 text-[14px] font-semibold leading-tight text-ink">{pick(c.name, locale)}</span>
      </span>
      <Handle id="out" type="source" position={rtl ? Position.Left : Position.Right} />
      <Handle id="bottom" type="source" position={Position.Top} />
    </div>
  )
})

const LaneNode = memo(function LaneNode({ data }: NodeProps<Node<LaneData>>) {
  const place = PLACE[data.place]
  const Icon = place.icon
  return (
    <div
      className="arch-lane relative rounded-[22px] border border-line"
      style={{ width: LANE_W, height: data.height, background: 'linear-gradient(180deg, #ffffff 0%, #f7f7fb 100%)', animationDelay: `${data.index * 110}ms`, direction: data.locale === 'ar' ? 'rtl' : 'ltr' }}
    >
      <div className="px-4 pt-3">
        <div className="text-[12px] font-semibold text-secondary" dir="ltr" style={{ textAlign: data.locale === 'ar' ? 'right' : 'left' }}>
          {data.family || '\u00a0'}
        </div>
        <div className="text-[15px] font-semibold leading-tight text-ink">{data.title}</div>
      </div>
      <div className="absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[12.5px] font-semibold" style={{ background: place.bg, color: place.color, transition: 'background 400ms, color 400ms' }} data-testid="lane-place">
        <Icon size={15} /> {pick(place.label, data.locale)}
      </div>
    </div>
  )
})

const nodeTypes = { comp: CompNode, lane: LaneNode }
const edgeTypes = { flow: FlowEdge }

function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[clamp(1.9rem,2.3vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[1rem] text-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function Legend() {
  const { p } = useT()
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[0.8rem] text-body" data-testid="arch-legend">
      {(Object.keys(FLOW_LABEL) as FlowKind[]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: FLOW_COLOR[k] }} />
          {p(FLOW_LABEL[k])}
        </span>
      ))}
      <span className="flex items-center gap-1.5 text-muted">
        <span className="inline-block h-3 w-5 rounded border-2 border-dashed border-line" />
        {p(STATUS_LABEL.target)}
      </span>
      <span className="flex items-center gap-1.5 text-muted">
        <span className="inline-block h-3 w-3 rounded bg-[#e0f5f6] ring-1 ring-teal/40" />
        {p(STATUS_LABEL.inBuild)}
      </span>
    </div>
  )
}

function ModelConnection() {
  const { p } = useT()
  const mode = useDemo((s) => s.expertMode)
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[0.82rem]" data-testid="arch-model">
      {mode.kind === 'model' ? (
        <>
          <div className="eyebrow mb-0.5">{p(S.connectedModel)}</div>
          <code dir="ltr" className="font-semibold text-ink">
            {mode.model}
          </code>
        </>
      ) : (
        p(S.localEngine)
      )}
    </div>
  )
}

function Drawer({ c, layer, lineage, reachable, onClose, onLineage }: { c: ArchNode; layer: Text; reachable: Set<string>; lineage: { label: Text; detail: Text }[]; onClose: () => void; onLineage: () => void }) {
  const { p, locale } = useT()
  const go = useGo()
  const Icon = c.icon
  return (
    <div className="card fade-up flex max-h-full min-h-0 w-full flex-col p-5" data-testid="arch-drawer">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ecebfa] text-secondary">
          <Icon size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[0.74rem] font-semibold uppercase tracking-wide text-muted" dir="ltr" style={{ textAlign: locale === 'ar' ? 'right' : 'left' }}>
            {c.product}
          </div>
          <div className="text-[1.15rem] font-semibold leading-tight text-ink">{p(c.name)}</div>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1 text-muted hover:bg-surface" aria-label={p(S.close)} data-testid="arch-drawer-close">
          <X size={18} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className={`chip ${c.status === 'inBuild' ? 'bg-[#e0f5f6] text-[#006b74]' : c.status === 'target' ? 'bg-surface text-muted' : 'bg-[#ecebfa] text-brand'}`} data-testid="arch-status">
          {p(STATUS_LABEL[c.status])}
        </span>
        <span className="text-[0.78rem] text-muted">
          {p(S.layer)}: {p(layer)}
        </span>
      </div>
      <div className="scroll-thin mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto text-[0.9rem] leading-relaxed">
        <p className="text-ink">{p(c.role)}</p>
        {(c.id === 'inference' || c.id.startsWith('exp-')) && <ModelConnection />}
        <div>
          <div className="eyebrow mb-1">{p(S.inSolution)}</div>
          <p>{p(c.inSolution)}</p>
        </div>
        {c.data.length > 0 && (
          <div>
            <div className="eyebrow mb-1">{p(S.data)}</div>
            <div className="flex flex-wrap gap-1.5">
              {c.data.map((d, i) => (
                <code key={i} className="rounded-md bg-surface px-2 py-0.5 text-[0.78rem] text-ink">
                  {p(d)}
                </code>
              ))}
            </div>
          </div>
        )}
        {c.status === 'target' && c.lane === 'sources' && <p className="rounded-xl bg-surface px-3 py-2 text-[0.8rem] text-muted">{p(S.notConnected)}</p>}
        {c.id === 'sdx' && lineage.length > 0 && (
          <div data-testid="lineage">
            <div className="eyebrow mb-1.5">{p(S.lineage)}</div>
            <ol className="relative space-y-2 border-s-2 border-line ps-4">
              {lineage.map((l, i) => (
                <li key={i} className="relative">
                  <span className="absolute -start-[1.42rem] top-1.5 h-2.5 w-2.5 rounded-full bg-secondary ring-4 ring-white" />
                  <div className="font-semibold text-ink">{p(l.label)}</div>
                  <div className="text-[0.8rem] text-muted">{p(l.detail)}</div>
                </li>
              ))}
            </ol>
            <button type="button" className="btn btn-ghost mt-3 !py-1.5 !text-[0.82rem]" onClick={onLineage} data-testid="arch-play-lineage">
              <Route size={15} /> {p(S.showPath)}
            </button>
          </div>
        )}
      </div>
      {c.route && reachable.has(c.route.startsWith('/experts/') ? '/' : c.route) && (
        <button type="button" className="btn mt-4 self-start bg-secondary text-white hover:bg-secondary-bright" onClick={() => go(c.route!)} data-testid="arch-open-screen">
          {p(S.open)} {p(c.name)}
        </button>
      )}
    </div>
  )
}

function useGo() {
  const navigate = useNavigate()
  const { search } = useLocation()
  return (pathname: string) => navigate({ pathname, search })
}

function TraceLog({ trace, hop, playing, finale, onToggle, onClose }: { trace: Trace; hop: number; playing: boolean; finale: boolean; onToggle: () => void; onClose: () => void }) {
  const { p, locale } = useT()
  return (
    <div className="card fade-up scroll-thin max-h-full w-full overflow-y-auto p-4" data-testid="arch-trace-log">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-semibold text-ink">{p(trace.title)}</div>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-1.5 text-muted hover:bg-surface" onClick={onToggle} aria-label={p(playing ? S.pause : S.play)} data-testid="arch-trace-play">
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button type="button" className="rounded-full p-1.5 text-muted hover:bg-surface" onClick={onClose} aria-label={p(S.close)} data-testid="arch-trace-close">
            <X size={16} />
          </button>
        </div>
      </div>
      <ol className="space-y-1.5">
        {trace.hops.map((h, i) => (
          <li key={i} className={`rounded-xl px-3 py-2 transition-colors ${i === hop ? 'bg-[#fff1ea]' : ''} ${i > hop ? 'opacity-40' : ''}`} data-testid={`arch-trace-hop-${i}`} data-state={i < hop ? 'done' : i === hop ? 'active' : 'pending'}>
            <div className="flex items-center gap-2 text-[0.86rem] font-semibold text-ink">
              <span className={`num flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.68rem] ${i === hop ? 'bg-accent text-white' : i < hop ? 'bg-secondary text-white' : 'bg-surface text-muted'}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">{p(h.title)}</span>
            </div>
            {i === hop && (
              <div className="fade-up mt-1 ps-7 text-[0.8rem] leading-snug text-body">
                {p(h.detail)}
                {h.code && (
                  <code className="mt-1 block truncate rounded bg-white px-1.5 py-0.5 text-[0.72rem] text-secondary" dir="ltr">
                    {h.code}
                  </code>
                )}
              </div>
            )}
          </li>
        ))}
      </ol>
      {finale && trace.finale && (
        <div className="hero-band fade-up mt-3 rounded-2xl px-4 py-3 text-white" data-testid="arch-trace-finale">
          <div className="num text-[2rem] font-semibold leading-none text-accent">
            <CountUp value={trace.finale.value} format={(n) => fmtNumber(Math.round(n), locale)} />
          </div>
          <div className="mt-1 text-[0.82rem] text-white/80">{p(trace.finale.label)}</div>
        </div>
      )}
    </div>
  )
}

const VALUES: { title: Text; body: Text; route: string }[] = [
  { title: { en: 'One governed copy of the data', ar: 'نسخة واحدة محكومة من البيانات' }, body: { en: 'Every source joined once, in open Iceberg tables.', ar: 'كل المصادر مدمجة مرة واحدة في جداول Iceberg المفتوحة.' }, route: '/overview' },
  { title: { en: 'Detection in seconds', ar: 'اكتشاف خلال ثوانٍ' }, body: { en: 'Streaming flows open the incident as the event happens.', ar: 'تدفقات البيانات تفتح الحادث لحظة وقوعه.' }, route: '/sites' },
  { title: { en: 'AI grounded in governed data', ar: 'ذكاء اصطناعي مُسند إلى بيانات محكومة' }, body: { en: 'Experts answer only from audited tool results, never from guesswork.', ar: 'يجيب الخبراء من نتائج أدوات مدققة فقط، وليس من التخمين.' }, route: '/' },
  { title: { en: 'Runs where the data must stay', ar: 'يعمل حيث يجب أن تبقى البيانات' }, body: { en: 'Private, public or hybrid — under one set of policies.', ar: 'خاص أو عام أو هجين — بمجموعة سياسات واحدة.' }, route: '/briefs' },
]

function questionOptions(spec: ReturnType<typeof useT>['pack']['spec'], locale: Locale) {
  const arabic = /[\u0600-\u06FF]/
  return spec.experts
    .filter((e) => e.available !== false)
    .flatMap((e) => e.answers.slice(0, 2).map((a) => ({ expertId: e.id, q: (locale === 'ar' ? a.questions.find((q) => arabic.test(q)) : a.questions.find((q) => !arabic.test(q))) ?? a.questions[0] })))
    .filter((x) => x.q)
    .slice(0, 6)
}

export function ArchitecturePage() {
  const { pack, p, locale, rtl } = useT()
  const go = useGo()
  const mode = useDemo((s) => s.mode)
  const reachable = new Set(['/', ...visiblePages(pack, mode).map((x) => x.path)])
  const deployment = useArch((s) => s.deployment)
  const setDeployment = useArch((s) => s.setDeployment)
  const traceRequest = useArch((s) => s.traceRequest)
  const graph = useMemo(() => buildGraph(pack), [pack])
  const lineage = useMemo(() => lineageChain(pack, graph), [pack, graph])
  const questions = useMemo(() => questionOptions(pack.spec, locale), [pack.spec, locale])
  const hero = heroIncident(pack)
  const [flowOn, setFlowOn] = useState(() => !prefersReducedMotion())
  const [selected, setSelected] = useState<string | undefined>()
  const [trace, setTrace] = useState<Trace | null>(null)
  const [hop, setHop] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const [finale, setFinale] = useState(false)
  const [question, setQuestion] = useState(0)
  const inst = useRef<ReactFlowInstance<Node, Edge<FlowEdgeData>> | null>(null)
  const box = useRef<HTMLDivElement>(null)

  const start = (t: Trace | undefined) => {
    if (!t?.hops.length) return
    setSelected(undefined)
    setFinale(false)
    setTrace(t)
    setHop(0)
    setPlaying(true)
  }
  const stop = () => {
    setTrace(null)
    setHop(-1)
    setPlaying(false)
    setFinale(false)
  }

  useEffect(() => {
    if (!traceRequest) return
    const id = setTimeout(() => {
      useArch.getState().clearTraceRequest()
      start(incidentTrace(pack, graph))
    }, 500)
    return () => clearTimeout(id)
  }, [traceRequest, pack, graph])

  useEffect(() => {
    if (!trace || !playing || hop < 0) return
    const h = trace.hops[hop]
    const id = setTimeout(
      () => {
        if (hop >= trace.hops.length - 1) {
          setPlaying(false)
          if (trace.finale) setFinale(true)
        } else setHop(hop + 1)
      },
      prefersReducedMotion() ? Math.min(900, h.ms) : h.ms,
    )
    return () => clearTimeout(id)
  }, [trace, hop, playing])

  useEffect(() => {
    if (!box.current) return
    const ro = new ResizeObserver(() => inst.current?.fitView({ padding: 0.03, duration: 0 }))
    ro.observe(box.current)
    return () => ro.disconnect()
  }, [])

  const lit = useMemo(() => new Set(trace && hop >= 0 ? trace.hops[hop].nodes : []), [trace, hop])
  const litEdges = useMemo(() => new Set(trace && hop >= 0 ? trace.hops[hop].edges : []), [trace, hop])
  const done = useMemo(() => new Set(trace ? trace.hops.slice(0, Math.max(0, hop)).flatMap((h) => h.nodes) : []), [trace, hop])
  const tracing = !!trace && hop >= 0
  const dep = DEPLOYMENT[deployment]

  const comps = useMemo(() => graph.nodes.map((c) => (c.id === 'inference' ? { ...c, name: dep.llm } : c)), [graph, dep])

  const nodes: Node[] = useMemo(() => {
    const lanes: Node<LaneData>[] = LANES.map((l, index) => ({
      id: `lane-${l.id}`,
      type: 'lane',
      position: { x: laneX(index, rtl), y: 0 },
      data: { title: p(l.title), family: l.family, place: dep.lanes[l.id], locale, index, height: graph.laneH },
      draggable: false,
      selectable: false,
      zIndex: 0,
    }))
    const seen: Record<string, number> = {}
    const items: Node<CompData>[] = comps.map((c) => {
      const data = { c, rtl, locale, lit: lit.has(c.id), done: done.has(c.id), dim: tracing && !lit.has(c.id) && !done.has(c.id), selected: selected === c.id }
      if (c.lane === 'sdx') return { id: c.id, type: 'comp', position: { x: 20, y: graph.sdxY }, data, draggable: false, zIndex: 2 }
      const index = LANES.findIndex((l) => l.id === c.lane)
      const i = (seen[c.lane] = (seen[c.lane] ?? -1) + 1)
      return { id: c.id, type: 'comp', position: { x: laneX(index, rtl) + (LANE_W - NODE_W) / 2, y: nodeY(i, graph.laneCounts[c.lane as keyof typeof graph.laneCounts], graph.laneH) }, data, draggable: false, zIndex: 2 }
    })
    return [...lanes, ...items]
  }, [comps, graph, rtl, locale, p, dep, lit, done, tracing, selected])

  const edges: Edge<FlowEdgeData>[] = useMemo(
    () =>
      graph.flows.map((f) => ({
        id: f.id,
        source: f.source,
        target: f.target,
        sourceHandle: f.kind === 'governance' ? 'bottom' : 'out',
        targetHandle: f.kind === 'governance' ? 'top' : 'in',
        type: 'flow',
        zIndex: 1,
        data: { kind: f.kind, bidirectional: f.bidirectional, active: litEdges.has(f.id), dim: tracing && !litEdges.has(f.id), animate: flowOn },
      })),
    [graph, litEdges, tracing, flowOn],
  )

  const selectedComp = comps.find((c) => c.id === selected)
  const layerOf = (c: ArchNode): Text => (c.lane === 'sdx' ? LANES[2].title : (LANES.find((l) => l.id === c.lane)?.title ?? LANES[0].title))
  const residency = pack.spec.architecture?.residency
  const heroTime = hero ? formatTime(toMs(hero.started), locale) : ''

  return (
    <div className="flex min-h-full flex-col gap-4 p-6" data-testid="architecture-page">
      <PageHeader title={p(S.title)} subtitle={p(S.subtitle)}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg" role="group" aria-label={p(S.deployment)} data-testid="arch-deployment">
            {DEPLOYMENTS.map((d) => (
              <button key={d} type="button" aria-pressed={deployment === d} onClick={() => setDeployment(d)} data-testid={`arch-deployment-${d}`}>
                {p(DEPLOYMENT[d].title)}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-ghost !px-3" onClick={() => setFlowOn(!flowOn)} aria-pressed={flowOn} data-testid="arch-flow-toggle" title={p(S.dataFlow)}>
            {flowOn ? <Pause size={16} /> : <Play size={16} />}
            <span className="text-[0.82rem]">{p(S.dataFlow)}</span>
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2" data-testid="arch-controls">
        {hero && (
          <button type="button" className="btn btn-primary" onClick={() => start(incidentTrace(pack, graph))} data-testid="arch-trace">
            <Zap size={16} /> {p(S.traceIncidentAt).replace('{time}', heroTime)}
          </button>
        )}
        {questions.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-full border border-line bg-white p-1 ps-3">
            <Waypoints size={16} className="text-secondary" />
            <select className="max-w-[22rem] bg-transparent text-[0.88rem] outline-none" value={question} onChange={(e) => setQuestion(Number(e.target.value))} aria-label={p(S.questionToTrace)} data-testid="arch-trace-question-select">
              {questions.map((q, i) => (
                <option key={i} value={i}>
                  {q.q}
                </option>
              ))}
            </select>
            <button type="button" className="btn !py-1.5 bg-secondary text-white hover:bg-secondary-bright" onClick={() => start(questionTrace(graph, questions[question].q, questions[question].expertId))} data-testid="arch-trace-question">
              {p(S.traceQuestion)}
            </button>
          </div>
        )}
        <div className="ms-auto max-w-[40rem] text-[0.82rem] text-muted" data-testid="arch-deployment-note">
          <p>{p(dep.note)}</p>
          {residency && (
            <p className="mt-1 flex items-center gap-1.5 font-medium text-ink" data-testid="arch-residency">
              <ShieldCheck size={14} className="shrink-0 text-teal" />
              {p(S.residency)}: {p(residency)}
            </p>
          )}
        </div>
      </div>

      <div className={`grid min-h-0 gap-4 transition-[grid-template-columns] duration-500 ${selectedComp || trace ? 'xl:grid-cols-[minmax(0,1fr)_24rem]' : 'xl:grid-cols-[minmax(0,1fr)_0rem]'}`}>
        <div ref={box} className="arch-flow arch-canvas card relative h-[max(34rem,calc(100vh-21rem))] overflow-hidden !rounded-[22px]" dir="ltr" role="img" aria-label={p(S.diagram)} data-testid="arch-diagram">
          <ReactFlow
            key={`${rtl}-${graph.nodes.length}`}
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onInit={(i) => {
              inst.current = i
              i.fitView({ padding: 0.03 })
            }}
            fitView
            fitViewOptions={{ padding: 0.03 }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={false}
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            onNodeClick={(_, n) => {
              if (n.type !== 'comp') return
              stop()
              setSelected(n.id)
            }}
            minZoom={0.2}
            proOptions={{ hideAttribution: true }}
          />
        </div>
        <div className="flex min-h-0 flex-col xl:h-[max(34rem,calc(100vh-21rem))]">
          {selectedComp && <Drawer c={selectedComp} layer={layerOf(selectedComp)} lineage={lineage} reachable={reachable} onClose={() => setSelected(undefined)} onLineage={() => start(lineageTrace(pack, graph))} />}
          {trace && <TraceLog trace={trace} hop={hop} playing={playing} finale={finale} onToggle={() => (hop >= trace.hops.length - 1 && !playing ? start(trace) : setPlaying(!playing))} onClose={stop} />}
        </div>
      </div>

      <Legend />

      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4" data-testid="arch-values">
        {VALUES.map((v, i) => (
          <button key={i} type="button" disabled={!reachable.has(v.route)} onClick={() => go(v.route)} className="card arch-lane group p-4 text-start transition-shadow hover:shadow-lg" style={{ animationDelay: `${300 + i * 120}ms` }}>
            <div className="flex items-center gap-2 text-[1rem] font-semibold text-ink">
              <span className="h-2 w-2 rounded-full bg-accent" />
              {p(v.title)}
            </div>
            <p className="mt-1 text-[0.85rem] text-muted">{p(v.body)}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
