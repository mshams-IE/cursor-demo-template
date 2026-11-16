import { create } from 'zustand'
import type { Deployment } from './model'

interface ArchState {
  deployment: Deployment
  /** Set by the presenter to play the incident trace when the page opens. */
  traceRequest?: { kind: 'incident'; nonce: number }
  setDeployment: (d: Deployment) => void
  requestTrace: (kind: 'incident') => void
  clearTraceRequest: () => void
}

let nonce = 0

export const useArch = create<ArchState>((set) => ({
  deployment: 'private',
  setDeployment: (deployment) => set({ deployment }),
  requestTrace: (kind) => set({ traceRequest: { kind, nonce: ++nonce } }),
  clearTraceRequest: () => set({ traceRequest: undefined }),
}))
