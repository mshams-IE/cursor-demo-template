import type { Specialist } from '../../types'
import './agents.css'

export type RobotState = 'idle' | 'queued' | 'working' | 'done'

type Antenna = 'ball' | 'fork' | 'dish' | 'twin'
type Glyph = 'lead' | 'network' | 'gauge' | 'person' | 'planning' | 'validation' | 'briefing'

const STAGE_COLOR: Record<Specialist['stage'], string> = {
  lead: '#120046',
  analysis: '#413cc3',
  planning: '#00828c',
  validation: '#00a7e1',
  briefing: '#5555f9',
}

const ANTENNAS: Antenna[] = ['ball', 'fork', 'dish', 'twin']
const RADII = [6, 9, 11, 13, 15, 4, 7]
const ANALYSIS_GLYPHS: Glyph[] = ['network', 'gauge', 'person']

function hash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

/** Mixes a hex colour towards white, for the robot's eyes and antenna. */
function tint(hex: string, k: number) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex)
  if (!m) return '#c9d6ff'
  const n = parseInt(m[1], 16)
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => Math.round(c + (255 - c) * k))
  return `#${ch.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

function look(s: Pick<Specialist, 'id' | 'stage' | 'color'>, index: number) {
  const h = hash(s.id)
  const body = s.color ?? STAGE_COLOR[s.stage] ?? STAGE_COLOR.analysis
  const glyph: Glyph = s.stage === 'analysis' ? ANALYSIS_GLYPHS[index % ANALYSIS_GLYPHS.length] : s.stage
  return {
    body,
    accent: s.stage === 'lead' ? '#00e5a0' : tint(body, 0.62),
    headRadius: s.stage === 'lead' ? 9 : RADII[h % RADII.length],
    antenna: s.stage === 'lead' ? 'twin' : ANTENNAS[h % ANTENNAS.length],
    glyph,
  }
}

function AntennaShape({ kind, color }: { kind: Antenna; color: string }) {
  switch (kind) {
    case 'fork':
      return (
        <g stroke="#5B6B8C" strokeWidth="2" strokeLinecap="round" fill="none">
          <path d="M32 13 V8 M32 8 L26 4 M32 8 L38 4" />
          <circle className="robot-tip" cx="26" cy="4" r="2.4" fill={color} stroke="none" />
          <circle className="robot-tip" cx="38" cy="4" r="2.4" fill={color} stroke="none" />
        </g>
      )
    case 'dish':
      return (
        <g>
          <path d="M32 13 V8" stroke="#5B6B8C" strokeWidth="2" />
          <path d="M25 7 Q32 1 39 7 Z" fill={color} className="robot-tip" />
        </g>
      )
    case 'twin':
      return (
        <g stroke="#5B6B8C" strokeWidth="2" strokeLinecap="round">
          <path d="M24 13 L21 6 M40 13 L43 6" />
          <circle className="robot-tip" cx="21" cy="5" r="2.6" fill={color} stroke="none" />
          <circle className="robot-tip" cx="43" cy="5" r="2.6" fill={color} stroke="none" />
        </g>
      )
    default:
      return (
        <g>
          <path d="M32 13 V8" stroke="#5B6B8C" strokeWidth="2" />
          <circle className="robot-tip" cx="32" cy="5" r="3" fill={color} />
        </g>
      )
  }
}

function Emblem({ glyph, color }: { glyph: Glyph; color: string }) {
  const s = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (glyph) {
    case 'lead':
      return (
        <g {...s}>
          <circle cx="32" cy="48" r="2" fill={color} />
          <circle cx="25" cy="54" r="1.6" fill={color} />
          <circle cx="32" cy="55" r="1.6" fill={color} />
          <circle cx="39" cy="54" r="1.6" fill={color} />
          <path d="M32 50 L25 53 M32 50 V53.5 M32 50 L39 53" />
        </g>
      )
    case 'network':
      return <path {...s} d="M24 54 H29 V48 H35 V54 H40 M32 48 V45" />
    case 'gauge':
      return (
        <g {...s}>
          <path d="M25 55 A7 7 0 0 1 39 55" />
          <path d="M32 55 L36 50" />
        </g>
      )
    case 'person':
      return (
        <g {...s}>
          <circle cx="32" cy="48" r="2.6" />
          <path d="M26.5 56 Q32 50 37.5 56" />
        </g>
      )
    case 'planning':
      return (
        <g {...s}>
          <rect x="27" y="46" width="10" height="11" rx="1.5" />
          <path d="M29.5 50 H34.5 M29.5 53 H33" />
        </g>
      )
    case 'validation':
      return <path {...s} d="M32 45.5 L38 48 V52 Q38 56 32 57.5 Q26 56 26 52 V48 Z M29.5 51.5 L31.5 53.5 L35 50" />
    case 'briefing':
      return (
        <g {...s}>
          <path d="M28 45.5 H34 L37 48.5 V57 H28 Z" />
          <path d="M30 51 H35 M30 54 H35" />
        </g>
      )
  }
}

/** An AI specialist as a small robot. `index` varies the look among specialists of the same stage. */
export function RobotAvatar({ specialist, index = 0, state = 'idle', size = 48 }: { specialist: Pick<Specialist, 'id' | 'stage' | 'color'>; index?: number; state?: RobotState; size?: number }) {
  const l = look(specialist, index)
  const working = state === 'working'
  return (
    <span className={`robot robot-${state}`} style={{ width: size, height: size }} data-testid={`robot-${specialist.id}`} data-state={state} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size} height={size}>
        <g className="robot-figure">
          <AntennaShape kind={l.antenna} color={working ? l.accent : '#9FB3D1'} />
          <rect x="6" y="20" width="5" height="10" rx="2" fill={l.body} opacity="0.75" />
          <rect x="53" y="20" width="5" height="10" rx="2" fill={l.body} opacity="0.75" />
          <rect x="10" y="12" width="44" height="28" rx={l.headRadius} fill={l.body} />
          <rect x="15" y="17" width="34" height="16" rx="8" fill="#0B1A3A" />
          {l.glyph === 'gauge' ? (
            <g>
              <circle className="robot-eye" cx="32" cy="25" r="5.5" fill="none" stroke={l.accent} strokeWidth="2" />
              <path className="robot-needle" d="M32 25 L35.5 21.5" stroke={l.accent} strokeWidth="2" strokeLinecap="round" />
            </g>
          ) : (
            <g className="robot-eye">
              <rect x="21" y="21.5" width="7" height="7" rx="3.5" fill={l.accent} />
              <rect x="36" y="21.5" width="7" height="7" rx="3.5" fill={l.accent} />
            </g>
          )}
          {working && <rect className="robot-scan" x="15" y="17" width="4" height="16" rx="2" fill={l.accent} opacity="0.55" />}
          <rect x="17" y="42" width="30" height="18" rx="7" fill="#fff" stroke={l.body} strokeWidth="2.5" />
          <Emblem glyph={l.glyph} color={l.body} />
        </g>
        {state === 'done' && (
          <g className="robot-badge" data-badge="done">
            <circle cx="52" cy="13" r="8.5" fill="var(--status-normal)" stroke="#fff" strokeWidth="2" />
            <path d="M48 13 L51 16 L56.5 10" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
    </span>
  )
}
