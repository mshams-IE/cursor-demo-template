import { Background, Handle, Position, ReactFlow, type Edge, type Node, type NodeProps, type ReactFlowInstance } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Bot, Maximize2, X } from 'lucide-react'
import { memo, useEffect, useRef } from 'react'
import { useT } from '../../i18n'
import { useDemo, type ChatTurn } from '../../store'
import type { Specialist } from '../../types'
import { currentExpert, specialistsByIds, stageIndex, teamOf } from '../experts/catalog'
import { useAgents } from './agentStore'
import { useTeamProgress, type TeamProgress } from './progress'
import { RobotAvatar, type RobotState } from './RobotAvatar'
import { A, ROBOT_STATUS } from './strings'

const STAGES: Specialist['stage'][] = ['lead', 'analysis', 'planning', 'validation', 'briefing']

const STATE_STYLE: Record<RobotState, { fg: string; bg: string }> = {
  idle: { fg: '#5f6b76', bg: '#ebf1f4' },
  queued: { fg: '#5f6b76', bg: '#ebf1f4' },
  working: { fg: '#413cc3', bg: '#ecebfa' },
  done: { fg: '#0a7a55', bg: '#e3f5ee' },
}

type NodeData = { specialist: Specialist; index: number; label: string; state: RobotState; activity?: string; compact: boolean; rtl: boolean; selected: boolean; statusLabel: string }

const SpecialistNode = memo(function SpecialistNode({ data }: NodeProps<Node<NodeData>>) {
  const { specialist, index, label, state, activity, compact, rtl, selected, statusLabel } = data
  const st = STATE_STYLE[state]
  const side = { in: rtl ? Position.Right : Position.Left, out: rtl ? Position.Left : Position.Right }
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-2 bg-white text-start shadow-sm transition-colors ${state === 'working' ? 'agent-live' : ''}`}
      style={{ borderColor: selected ? 'var(--brand-primary)' : state === 'idle' || state === 'queued' ? 'var(--line)' : st.fg, width: compact ? 150 : 236, padding: compact ? '6px 8px' : '10px 12px' }}
      data-testid={`agent-node-${specialist.id}`}
      data-state={state}
    >
      <Handle id="top" type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle id="in" type="target" position={side.in} style={{ opacity: 0 }} />
      <div className="flex items-center gap-2">
        <RobotAvatar specialist={specialist} index={index} state={state} size={compact ? 32 : 48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-ink" style={{ fontSize: compact ? 11.5 : 14 }}>
            {label}
          </div>
          <span className="mt-0.5 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-px font-semibold" style={{ background: st.bg, color: st.fg, fontSize: compact ? 9.5 : 11 }}>
            {state === 'working' && <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: st.fg }} />}
            {statusLabel}
          </span>
        </div>
      </div>
      {!compact && (
        <div className="mt-1.5 truncate text-[11.5px] text-muted" style={{ minHeight: 17 }} data-testid={`agent-activity-${specialist.id}`}>
          {activity ?? ''}
        </div>
      )}
      {state === 'working' && <div className="running-bar absolute inset-x-0 bottom-0 h-1" />}
      <Handle id="bottom" type="source" position={Position.Bottom} style={{ opacity: 0 }} />
      <Handle id="out" type="source" position={side.out} style={{ opacity: 0 }} />
    </div>
  )
})

const nodeTypes = { specialist: SpecialistNode }

function layout(team: Specialist[], compact: boolean, rtl: boolean) {
  const groups = STAGES.map((stage) => team.filter((s) => s.stage === stage)).filter((g) => g.length)
  const pos: Record<string, { x: number; y: number; row: number }> = {}
  const m = rtl ? -1 : 1
  if (compact) {
    const dx = 168
    const rows: Specialist[][] = []
    groups.forEach((g, i) => (i < 2 ? rows.push(g) : rows.length === 2 ? rows.push([...g]) : rows[2].push(...g)))
    rows.flatMap((r) => (r.length > 3 ? [r.slice(0, 3), r.slice(3)] : [r])).forEach((row, y) => {
      row.forEach((s, x) => (pos[s.id] = { x: (x - (row.length - 1) / 2) * dx * m, y: y * 92, row: y }))
    })
  } else {
    const maxH = Math.max(...groups.map((g) => g.length))
    groups.forEach((g, col) => {
      g.forEach((s, i) => (pos[s.id] = { x: (rtl ? groups.length - 1 - col : col) * 290, y: (i - (g.length - 1) / 2) * 130 + ((maxH - 1) / 2) * 130, row: col }))
    })
  }
  const edges: [string, string][] = []
  for (let i = 0; i + 1 < groups.length; i++) for (const a of groups[i]) for (const b of groups[i + 1]) edges.push([a.id, b.id])
  return { pos, edges }
}

export function AgentGraph({ team, progress, compact, interactive }: { team: Specialist[]; progress: TeamProgress; compact: boolean; interactive?: boolean }) {
  const { pack, p, locale } = useT()
  const selected = useAgents((s) => s.selected)
  const select = useAgents((s) => s.select)
  const rtl = locale === 'ar'
  const { pos, edges } = layout(team, compact, rtl)
  const wrap = useRef<HTMLDivElement>(null)
  const flow = useRef<ReactFlowInstance<Node<NodeData>> | null>(null)
  useEffect(() => {
    const el = wrap.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => void flow.current?.fitView({ padding: compact ? '7%' : '6%' }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [compact])
  const nodes: Node<NodeData>[] = team.map((s) => {
    const state = progress.stateOf(s.id)
    return {
      id: s.id,
      type: 'specialist',
      position: { x: pos[s.id].x, y: pos[s.id].y },
      data: { specialist: s, index: stageIndex(pack.spec, s.id), label: p(s.name), state, activity: progress.activityOf(s.id) ?? (compact ? undefined : p(s.role)), compact, rtl, selected: selected === s.id, statusLabel: p(ROBOT_STATUS[state]) },
      draggable: false,
    }
  })
  const flowEdges: Edge[] = edges.map(([a, b]) => {
    const sameRow = pos[a].row === pos[b].row
    const done = progress.stateOf(a) === 'done'
    return {
      id: `${a}-${b}`,
      source: a,
      target: b,
      type: 'smoothstep',
      animated: progress.stateOf(b) === 'working',
      sourceHandle: compact && !sameRow ? 'bottom' : 'out',
      targetHandle: compact && !sameRow ? 'top' : 'in',
      style: { stroke: done ? '#413cc3' : '#c3cfd9', strokeWidth: done ? 2 : 1.5 },
    }
  })
  return (
    <div ref={wrap} className="absolute inset-0" data-testid="agent-graph">
      <ReactFlow
        key={`${compact}-${locale}-${team.length}`}
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: compact ? '7%' : '6%' }}
        onInit={(i) => {
          flow.current = i
          requestAnimationFrame(() => void i.fitView({ padding: compact ? '7%' : '6%' }))
        }}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={!!interactive}
        zoomOnScroll={!!interactive}
        zoomOnPinch={!!interactive}
        zoomOnDoubleClick={false}
        preventScrolling={!!interactive}
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, n) => select(n.id)}
      >
        <Background gap={18} size={1} color="#e1e8ee" />
      </ReactFlow>
    </div>
  )
}

/** The expert's latest answer that called specialists, or a specific one. */
function useRun(expertId?: string, turnId?: number): ChatTurn | undefined {
  return useDemo((s) => {
    const turns = expertId ? (s.chats[expertId] ?? []) : []
    if (turnId !== undefined) return turns.find((t) => t.id === turnId)
    return turns.findLast((t) => t.role === 'expert' && !!t.team?.length)
  })
}

/** Compact team panel for the side dock: the current expert's specialists as a live graph. */
export function TeamDock({ fill }: { fill?: boolean }) {
  const { pack, p } = useT()
  const expert = currentExpert(pack.spec, useDemo((s) => s.expertId))
  const team = teamOf(pack.spec, expert)
  const run = useRun(expert?.id)
  const progress = useTeamProgress(run, team)
  const show = useAgents((s) => s.show)
  if (!team.length) return null
  const called = run ? team.filter((s) => run.team?.includes(s.id)).length : 0
  const status = progress.working ? p(A.working) : run ? fillText(p(A.lastRun), { n: called, m: team.length }) : p(A.ready)
  const activity = progress.current && progress.activityOf(progress.current.id)
  return (
    <section className={`flex flex-col gap-2 border-b border-line p-4 ${fill ? 'min-h-0 flex-1' : 'h-[48%] shrink-0'}`} data-testid="agent-dock">
      <div className="flex items-center gap-2">
        <div className="me-auto min-w-0">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-secondary" aria-hidden />
            <h2 className="truncate text-[1.02rem] font-semibold text-ink">{p(A.team)}</h2>
          </div>
          <div className="truncate text-[0.72rem] text-muted" data-testid="run-meta">
            {status}
          </div>
        </div>
        <button type="button" className="btn btn-ghost !px-2.5 !py-1.5" onClick={() => show({ expertId: expert?.id, turnId: run?.id })} aria-label={p(A.expand)} title={p(A.expand)} data-testid="expand-agents">
          <Maximize2 size={14} />
        </button>
      </div>
      <div className="relative min-h-[9rem] flex-1 overflow-hidden rounded-xl border border-line bg-surface/60">
        <AgentGraph team={team} progress={progress} compact />
      </div>
      <p className="truncate text-[0.75rem] text-muted" data-testid="team-activity">
        {activity ? `${p(progress.current?.name)} · ${activity}` : p(A.hint)}
      </p>
    </section>
  )
}

const fillText = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (w, k: string) => (k in vars ? String(vars[k]) : w))

/** Full-screen view of an expert's team: the graph, each specialist's job and the steps of the latest answer. */
export function AgentExpanded() {
  const { pack, p, rtl } = useT()
  const open = useAgents((s) => s.open)
  const close = useAgents((s) => s.close)
  const selected = useAgents((s) => s.selected)
  const storeExpert = useDemo((s) => s.expertId)
  const expert = currentExpert(pack.spec, open?.expertId ?? storeExpert)
  const team = teamOf(pack.spec, expert)
  const run = useRun(expert?.id, open?.turnId)
  const progress = useTeamProgress(run, team)
  const question = useDemo((s) => {
    if (!run || !expert) return undefined
    const turns = s.chats[expert.id] ?? []
    const i = turns.findIndex((t) => t.id === run.id)
    return turns.slice(0, i).findLast((t) => t.role === 'user')?.text
  })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, close])
  if (!open) return null
  const focus = team.find((s) => s.id === selected) ?? progress.current ?? team[0]
  const steps = run ? specialistsByIds(pack.spec, run.team) : []
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-surface/95 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={p(A.team)} data-testid="agents-expanded" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="card flex min-h-0 flex-1 flex-col p-5">
        <div className="mb-3 flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Bot size={20} className="text-secondary" aria-hidden />
              <h2 className="truncate text-[1.25rem] font-semibold text-ink">{p(A.team)}</h2>
              {expert && <span className="truncate text-[0.95rem] text-muted">· {p(expert.name)} · {p(expert.role)}</span>}
            </div>
            <div className="mt-1 truncate text-[0.85rem] text-muted">
              {question ? (
                <>
                  <span className="font-semibold">{p(A.question)}:</span> {question}
                </>
              ) : (
                p(A.hint)
              )}
            </div>
          </div>
          <button type="button" className="btn btn-ghost" onClick={close} data-testid="close-agents">
            <X size={16} /> {p(A.collapse)}
          </button>
        </div>
        {team.length === 0 ? (
          <p className="text-muted">{p(A.noSpecialists)}</p>
        ) : (
          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[1fr_26rem]">
            <div className="relative min-h-[20rem] rounded-xl border border-line bg-surface/60">
              <AgentGraph team={team} progress={progress} compact={false} interactive />
            </div>
            <div className="scroll-thin min-h-0 space-y-5 overflow-y-auto rounded-xl border border-line p-4 text-[0.88rem]">
              {focus && (
                <div data-testid="step-detail">
                  <div className="flex items-center gap-3">
                    <RobotAvatar specialist={focus} index={stageIndex(pack.spec, focus.id)} state={progress.stateOf(focus.id)} size={52} />
                    <div className="min-w-0">
                      <div className="font-semibold text-ink">{p(focus.name)}</div>
                      <div className="text-[0.78rem] text-muted">
                        {p(A.stage)}: {p(A[focus.stage])}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 leading-relaxed">{p(focus.role)}</p>
                  {focus.activities.length > 0 && (
                    <>
                      <div className="eyebrow mt-3 mb-1">{p(A.activities)}</div>
                      <ul className="list-disc space-y-0.5 ps-5 text-body">
                        {focus.activities.map((a, i) => (
                          <li key={i}>{p(a)}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
              <div className="border-t border-line pt-4" data-testid="run-steps">
                <div className="eyebrow mb-2">{p(A.steps)}</div>
                {steps.length === 0 ? (
                  <p className="text-muted">{p(A.noRun)}</p>
                ) : (
                  <ol className="space-y-2">
                    {steps.map((s, i) => {
                      const st = progress.stateOf(s.id)
                      const style = STATE_STYLE[st]
                      return (
                        <li key={s.id} className="flex items-start gap-2">
                          <span className="num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.68rem] font-bold text-white">{i + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-ink">{p(s.name)}</span>
                              <span className="rounded-full px-2 py-px text-[0.7rem] font-semibold" style={{ background: style.bg, color: style.fg }}>
                                {p(ROBOT_STATUS[st])}
                              </span>
                            </div>
                            <div className="text-[0.78rem] text-muted">{progress.activityOf(s.id) ?? p(s.activities.at(-1) ?? s.role)}</div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
