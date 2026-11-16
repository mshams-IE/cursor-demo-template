import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react'
import { memo } from 'react'
import { FLOW_COLOR, type FlowKind } from './model'

export type FlowEdgeData = { kind: FlowKind; bidirectional?: boolean; active: boolean; dim: boolean; animate: boolean }

const PARTICLES: Record<FlowKind, number> = { stream: 4, event: 2, batch: 2, ai: 3, governance: 0 }
const ACTIVE = '#ff550d'

export const FlowEdge = memo(function FlowEdge(props: EdgeProps<Edge<FlowEdgeData>>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data } = props
  const [path] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature: 0.35 })
  const kind = data?.kind ?? 'batch'
  const active = !!data?.active
  const color = active ? ACTIVE : FLOW_COLOR[kind]
  const n = active ? Math.max(4, PARTICLES[kind] + 2) : PARTICLES[kind]
  const dur = active ? 1.1 : kind === 'stream' ? 2.4 : 3.4
  return (
    <g style={{ opacity: data?.dim ? 0.16 : 1, transition: 'opacity 400ms' }} data-testid={`arch-edge-${id}`} data-active={active}>
      {active && <path d={path} fill="none" stroke={color} strokeOpacity={0.18} strokeWidth={10} strokeLinecap="round" />}
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeOpacity: kind === 'governance' ? 0.5 : active ? 1 : 0.55,
          strokeWidth: active ? 3 : 1.6,
          strokeDasharray: kind === 'governance' ? '5 5' : undefined,
        }}
      />
      {data?.animate &&
        Array.from({ length: n }, (_, i) => (
          <circle key={i} r={active ? 4.2 : 3} fill={color} opacity={0.95}>
            <animateMotion dur={`${dur}s`} repeatCount="indefinite" begin={`${(i * dur) / n}s`} path={path} keyPoints={data.bidirectional && i % 2 === 1 ? '1;0' : '0;1'} keyTimes="0;1" calcMode="linear" />
          </circle>
        ))}
    </g>
  )
})
