import type { Pack } from '../pack'
import type { Expert, Specialist } from '../types'
import type { Intent } from './nlu'

type Stage = Specialist['stage']

const ALL: Stage[] = ['lead', 'analysis', 'planning', 'validation', 'briefing']

/** Stages of the team each kind of question needs; empty means the expert answers alone. */
export const INTENT_STAGES: Record<Intent, Stage[]> = {
  status: ['lead', 'analysis'],
  incident: ['lead', 'analysis'],
  site: ['lead', 'analysis'],
  kpi: ['lead', 'analysis'],
  rank: ['lead', 'analysis'],
  history: ['lead'],
  planning: ['lead', 'planning', 'validation'],
  brief: ALL,
  report: [],
  unknown: ['lead'],
}

/** Specialist ids from the expert's team that work on this kind of question, in team order. */
export function pickTeam(pack: Pack, expert: Expert, intent: Intent): string[] {
  const stages = INTENT_STAGES[intent]
  const byId = new Map((pack.spec.specialists ?? []).map((s) => [s.id, s]))
  return (expert.team ?? []).filter((id) => {
    const s = byId.get(id)
    return !!s && stages.includes(s.stage)
  })
}
