import { create } from 'zustand'
import type { Locale, Severity, ViewId } from './types'

export interface ChatTurn {
  id: number
  role: 'user' | 'expert'
  text?: string
  answerId?: string
  kind?: 'answer' | 'refusal' | 'fallback'
  suggestions?: string[]
}

export interface DemoState {
  locale: Locale
  view: ViewId
  regionId?: string
  statusFilter?: Severity
  typeFilter?: string
  search: string
  expertId?: string
  chats: Record<string, ChatTurn[]>
  presenterOpen: boolean
  reducedMotion: boolean
  scale: number
  setLocale: (l: Locale) => void
  setView: (v: ViewId) => void
  selectRegion: (id?: string) => void
  setStatusFilter: (s?: Severity) => void
  setTypeFilter: (t?: string) => void
  setSearch: (s: string) => void
  openExpert: (id?: string) => void
  pushTurn: (expertId: string, turn: Omit<ChatTurn, 'id'>) => void
  setPresenterOpen: (o: boolean) => void
  setReducedMotion: (r: boolean) => void
  setScale: (s: number) => void
  reset: () => void
}

let seq = 0

const initial = { view: 'overview' as ViewId, regionId: undefined, statusFilter: undefined, typeFilter: undefined, search: '', expertId: undefined, chats: {} }

function fromUrl(): Partial<DemoState> {
  if (typeof location === 'undefined') return {}
  const q = new URLSearchParams(location.hash.split('?')[1] ?? location.search)
  const out: Partial<DemoState> = {}
  if (q.get('lang') === 'ar' || q.get('lang') === 'en') out.locale = q.get('lang') as Locale
  if (['overview', 'report', 'experts'].includes(q.get('view') ?? '')) out.view = q.get('view') as ViewId
  if (q.get('motion') === 'reduced') out.reducedMotion = true
  return out
}

export const useDemo = create<DemoState>((set) => ({
  locale: 'en',
  presenterOpen: false,
  reducedMotion: false,
  scale: 1,
  ...initial,
  ...fromUrl(),
  setLocale: (locale) => set({ locale }),
  setView: (view) => set({ view }),
  selectRegion: (regionId) => set({ regionId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSearch: (search) => set({ search }),
  openExpert: (expertId) => set({ expertId }),
  pushTurn: (expertId, turn) => set((s) => ({ chats: { ...s.chats, [expertId]: [...(s.chats[expertId] ?? []), { ...turn, id: ++seq }] } })),
  setPresenterOpen: (presenterOpen) => set({ presenterOpen }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setScale: (scale) => set({ scale }),
  reset: () => set({ ...initial }),
}))
