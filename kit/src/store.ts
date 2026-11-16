import { create } from 'zustand'
import { HOUR, setDisplayOffset, toMs, type TimeWindow } from './model/time'
import type { DemoSpec, Locale, Severity, Text, ViewId } from './types'

export type Visual =
  | { kind: 'line' | 'bar'; title: string; unit: string; points: { label: string; value: number }[]; highlight?: number }
  | { kind: 'stacked'; title: string; unit: string; series: { id: string; label: string }[]; rows: ({ label: string } & Record<string, number | string>)[] }
  | { kind: 'table'; title: string; columns: string[]; rows: (string | number)[][] }

export interface ChatTurn {
  id: number
  role: 'user' | 'expert' | 'note'
  text?: string
  answerId?: string
  kind?: 'answer' | 'refusal' | 'fallback' | 'model'
  suggestions?: string[]
  /** System line, e.g. who a question was handed to. */
  note?: Text
  /** Answer written by the connected model, already checked against the data. */
  modelText?: string
  /** Live model output while the answer is being written. */
  stream?: { text: string; tools: string[] }
  /** Tools the model called, shown under the answer. */
  tools?: string[]
  /** Specialists who worked on this answer. */
  team?: string[]
  /** The team is still working. */
  pending?: boolean
  /** Answer the engine composed from the data (history, rankings, planning) or the model wrote, in the locale it was asked in. */
  generated?: { lead: string; points: string[]; sources?: string[] }
  /** Chart or table attached to the answer. */
  visual?: Visual
  expertId?: string
  /** Expert the question was handed to (set on handoff notes). */
  handoffTo?: string
}

/** "Today's report" shows counts only; "experts" adds the digital experts and the investigation pages. */
export type Mode = 'report' | 'experts'
export type ReportDay = 'today' | 'yesterday' | 'both'

export interface ReportFocus {
  regionId?: string
  category?: string
  siteId?: string
}

export interface Brief {
  id: string
  title: string
  body: string
  createdMs: number
  expertId?: string
}

export interface Action {
  id: string
  title: string
  owner: string
  dueMs: number
  status: 'assigned' | 'in-progress' | 'done'
  optionId?: string
}

export type MapCommand = { kind: 'all' | 'region' | 'site'; id?: string; nonce: number }

export interface DemoState {
  locale: Locale
  view: ViewId
  mode: Mode
  regionId?: string
  siteId?: string
  incidentId?: string
  statusFilter?: Severity
  typeFilter?: string
  search: string
  expertId?: string
  chats: Record<string, ChatTurn[]>
  busyExpertId?: string
  presenterOpen: boolean
  reducedMotion: boolean
  scale: number

  clockMs: number
  /** The clock follows the viewer's own clock, starting from the pack's observed moment. */
  clockLive: boolean
  clockPlaying: boolean
  clockSpeed: number
  window: TimeWindow
  replay: { start: number; end: number }

  budget: number
  windowHours: number
  scenario: number
  whatIfInput: number

  reportFocus: ReportFocus
  reportDay: ReportDay
  briefs: Brief[]
  actions: Action[]
  mapCommand?: MapCommand
  toast?: { text: Text; nonce: number }
  /** Whether answers come from the local engine or the connected OpenAI model. */
  expertMode: { kind: 'local' | 'model'; model?: string }
  contextOpen: boolean

  setLocale: (l: Locale) => void
  setView: (v: ViewId) => void
  setMode: (m: Mode) => void
  selectRegion: (id?: string) => void
  selectSite: (id?: string) => void
  selectIncident: (id?: string) => void
  setStatusFilter: (s?: Severity) => void
  setTypeFilter: (t?: string) => void
  setSearch: (s: string) => void
  openExpert: (id?: string) => void
  pushTurn: (expertId: string, turn: Omit<ChatTurn, 'id'>) => number
  updateTurn: (expertId: string, id: number, patch: Partial<ChatTurn>) => void
  clearChat: (expertId: string) => void
  setBusyExpert: (id?: string) => void
  setPresenterOpen: (o: boolean) => void
  setReducedMotion: (r: boolean) => void
  setScale: (s: number) => void

  initPack: (spec: DemoSpec) => void
  setClock: (ms: number) => void
  setClockLive: (live: boolean) => void
  tickLive: () => void
  setClockPlaying: (p: boolean) => void
  setClockSpeed: (s: number) => void
  setWindow: (w: TimeWindow) => void
  setPlanning: (p: Partial<Pick<DemoState, 'budget' | 'windowHours' | 'scenario' | 'whatIfInput'>>) => void
  setReportFocus: (f: ReportFocus) => void
  setReportDay: (d: ReportDay) => void
  saveBrief: (b: Omit<Brief, 'id' | 'createdMs'>) => void
  addAction: (a: Omit<Action, 'id'>) => void
  updateAction: (id: string, patch: Partial<Action>) => void
  commandMap: (kind: MapCommand['kind'], id?: string) => void
  showToast: (text: Text) => void
  setExpertMode: (m: DemoState['expertMode']) => void
  setContextOpen: (o: boolean) => void
  reset: () => void
}

let seq = 0
let packDefaults = { clockMs: 0, budget: 0, windowHours: 0, scenario: 0, whatIfInput: 0 }
/** Viewer's wall clock and the demo moment it is anchored to, for real-time mode. */
let liveAnchor = { wall: 0, demo: 0 }

const initial = {
  view: 'overview' as ViewId,
  regionId: undefined,
  siteId: undefined,
  incidentId: undefined,
  statusFilter: undefined,
  typeFilter: undefined,
  search: '',
  expertId: undefined,
  chats: {},
  busyExpertId: undefined,
  reportFocus: {},
  reportDay: 'today' as ReportDay,
  briefs: [],
  actions: [],
  toast: undefined,
  contextOpen: true,
}

function query() {
  if (typeof location === 'undefined') return new URLSearchParams()
  return new URLSearchParams(location.hash.split('?')[1] ?? location.search)
}

function fromUrl(): Partial<DemoState> {
  const q = query()
  const out: Partial<DemoState> = {}
  if (q.get('lang') === 'ar' || q.get('lang') === 'en') out.locale = q.get('lang') as Locale
  if (['overview', 'report', 'experts'].includes(q.get('view') ?? '')) out.view = q.get('view') as ViewId
  if (q.get('mode') === 'report' || q.get('mode') === 'experts') out.mode = q.get('mode') as Mode
  if (q.get('motion') === 'reduced') out.reducedMotion = true
  return out
}

export const useDemo = create<DemoState>((set, get) => ({
  locale: 'en',
  mode: 'experts',
  presenterOpen: false,
  reducedMotion: false,
  scale: 1,
  clockMs: 0,
  clockLive: false,
  clockPlaying: false,
  clockSpeed: 120,
  window: 'today',
  replay: { start: 0, end: 0 },
  budget: 0,
  windowHours: 0,
  scenario: 0,
  whatIfInput: 0,
  expertMode: { kind: 'local' },
  ...initial,
  ...fromUrl(),
  setLocale: (locale) => set({ locale }),
  setView: (view) => set({ view }),
  setMode: (mode) => set({ mode }),
  selectRegion: (regionId) => set({ regionId, siteId: regionId === get().regionId ? get().siteId : undefined }),
  selectSite: (siteId) => set({ siteId }),
  selectIncident: (incidentId) => set({ incidentId }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  setTypeFilter: (typeFilter) => set({ typeFilter }),
  setSearch: (search) => set({ search }),
  openExpert: (expertId) => set({ expertId }),
  pushTurn: (expertId, turn) => {
    const id = ++seq
    set((s) => ({ chats: { ...s.chats, [expertId]: [...(s.chats[expertId] ?? []), { ...turn, id, expertId: turn.expertId ?? expertId }] } }))
    return id
  },
  updateTurn: (expertId, id, patch) => set((s) => ({ chats: { ...s.chats, [expertId]: (s.chats[expertId] ?? []).map((t) => (t.id === id ? { ...t, ...patch } : t)) } })),
  clearChat: (expertId) => set((s) => ({ chats: { ...s.chats, [expertId]: [] } })),
  setBusyExpert: (busyExpertId) => set({ busyExpertId }),
  setPresenterOpen: (presenterOpen) => set({ presenterOpen }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setScale: (scale) => set({ scale }),

  initPack: (spec) => {
    const clockMs = toMs(spec.clock.observedAt)
    const replay = spec.clock.replay ? { start: toMs(spec.clock.replay.start), end: toMs(spec.clock.replay.end) } : { start: clockMs - 6 * HOUR, end: clockMs + 2 * HOUR }
    const p = spec.planning
    packDefaults = { clockMs, budget: p?.budget.default ?? 0, windowHours: p?.windows[0] ?? 0, scenario: p?.scenario?.min ?? 0, whatIfInput: p?.whatIf?.input.min ?? 0 }
    const q = query()
    const at = q.get('at')
    const clockLive = q.get('clock') === 'live'
    const start = at && /^\d{2}:\d{2}$/.test(at) ? toMs(at) : clockMs
    liveAnchor = { wall: Date.now(), demo: start }
    setDisplayOffset(clockLive ? Date.now() - start : 0)
    set({ ...packDefaults, clockMs: start, replay, clockLive })
  },
  setClock: (ms) => {
    const { start, end } = get().replay
    set({ clockMs: Math.min(end, Math.max(start, ms)) })
  },
  setClockLive: (clockLive) => {
    if (clockLive) {
      liveAnchor = { wall: Date.now(), demo: packDefaults.clockMs }
      setDisplayOffset(liveAnchor.wall - liveAnchor.demo)
      set({ clockLive, clockPlaying: false, clockMs: packDefaults.clockMs })
    } else {
      setDisplayOffset(0)
      set({ clockLive })
    }
  },
  tickLive: () => {
    if (!get().clockLive) return
    set({ clockMs: liveAnchor.demo + (Date.now() - liveAnchor.wall) })
  },
  setClockPlaying: (clockPlaying) => set({ clockPlaying }),
  setClockSpeed: (clockSpeed) => set({ clockSpeed }),
  setWindow: (window) => set({ window }),
  setPlanning: (p) => set(p),
  setReportFocus: (reportFocus) => set({ reportFocus }),
  setReportDay: (reportDay) => set({ reportDay }),
  saveBrief: (b) => set((s) => ({ briefs: [{ ...b, id: `brief-${++seq}`, createdMs: s.clockMs }, ...s.briefs] })),
  addAction: (a) => set((s) => ({ actions: [...s.actions, { ...a, id: `act-${++seq}` }] })),
  updateAction: (id, patch) => set((s) => ({ actions: s.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),
  commandMap: (kind, id) => set({ mapCommand: { kind, id, nonce: ++seq } }),
  showToast: (text) => set({ toast: { text, nonce: ++seq } }),
  setExpertMode: (expertMode) => set({ expertMode }),
  setContextOpen: (contextOpen) => set({ contextOpen }),
  reset: () => {
    setDisplayOffset(0)
    set({ ...initial, ...packDefaults, clockLive: false, clockPlaying: false })
  },
}))
