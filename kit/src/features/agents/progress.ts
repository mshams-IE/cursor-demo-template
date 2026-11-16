import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import type { ChatTurn } from '../../store'
import type { Specialist } from '../../types'
import type { RobotState } from './RobotAvatar'

function useTicker(active: boolean, ms: number) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) return
    setN(0)
    const id = setInterval(() => setN((x) => x + 1), ms)
    return () => clearInterval(id)
  }, [active, ms])
  return n
}

/** About the local engine's pause per specialist, so the walk finishes as the answer lands. */
const STEP_MS = 550

export interface TeamProgress {
  working: boolean
  stateOf: (id: string) => RobotState
  /** What the specialist is doing right now, while it works. */
  activityOf: (id: string) => string | undefined
  current?: Specialist
}

/** Walks the answer's specialists one after another while the reply is pending. */
export function useTeamProgress(turn: ChatTurn | undefined, specialists: Specialist[]): TeamProgress {
  const { p } = useT()
  const ids = turn?.team ?? []
  const working = !!turn?.pending
  const tick = useTicker(working, STEP_MS)
  const order = ids.filter((id) => specialists.some((s) => s.id === id))
  const at = Math.min(tick, Math.max(0, order.length - 1))
  const current = working ? specialists.find((s) => s.id === order[at]) : undefined
  return {
    working,
    current,
    stateOf: (id) => {
      const i = order.indexOf(id)
      if (!turn || i < 0) return turn ? 'queued' : 'idle'
      if (!working) return 'done'
      return i < at ? 'done' : i === at ? 'working' : 'queued'
    },
    activityOf: (id) => {
      if (!current || current.id !== id || !current.activities.length) return undefined
      return p(current.activities[tick % current.activities.length])
    },
  }
}
