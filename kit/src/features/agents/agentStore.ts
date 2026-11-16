import { create } from 'zustand'

/** Which answer's team the expanded view shows; no turn means the expert's latest. */
export interface TeamView {
  expertId?: string
  turnId?: number
}

interface AgentsState {
  open?: TeamView
  selected?: string
  show: (v: TeamView) => void
  close: () => void
  select: (id?: string) => void
}

export const useAgents = create<AgentsState>((set) => ({
  show: (open) => set({ open, selected: undefined }),
  close: () => set({ open: undefined }),
  select: (selected) => set({ selected }),
}))
