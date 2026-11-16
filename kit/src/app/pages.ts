import { ClipboardList, FileText, LayoutDashboard, Layers, Sparkles, Zap, type LucideIcon } from 'lucide-react'
import type { Pack } from '../pack'
import type { UiKey } from '../terms'
import type { PageId } from '../types'

export interface PageDef {
  id: PageId
  path: string
  label: UiKey
  icon: LucideIcon
  /** Only with the digital experts; "Today's report" has nothing to show on it. */
  experts?: boolean
  /** Whether the pack has the data this page needs. */
  has: (pack: Pack) => boolean
}

export const PAGES: PageDef[] = [
  { id: 'experts', path: '/', label: 'navExperts', icon: Sparkles, has: (p) => p.spec.experts.length > 0 },
  { id: 'overview', path: '/overview', label: 'navOverview', icon: LayoutDashboard, has: () => true },
  { id: 'sites', path: '/sites', label: 'navSites', icon: Zap, experts: true, has: (p) => p.spec.sites.length > 0 },
  { id: 'planning', path: '/planning', label: 'navPlanning', icon: ClipboardList, experts: true, has: (p) => !!p.spec.planning?.options.length },
  { id: 'briefs', path: '/briefs', label: 'navBriefs', icon: FileText, experts: true, has: (p) => p.spec.experts.length > 0 },
  { id: 'architecture', path: '/architecture', label: 'navArchitecture', icon: Layers, has: () => true },
]

/** Full-screen pages outside the shell, reached from the top bar. */
export const FULLSCREEN = ['/wall', '/pack']

export function visiblePages(pack: Pack, mode: 'report' | 'experts'): PageDef[] {
  const hidden = pack.spec.hidePages ?? []
  return PAGES.filter((p) => p.has(pack) && !hidden.includes(p.id) && !(mode === 'report' && p.experts))
}

/** Where the app opens: the experts home when there are experts, otherwise the overview. */
export const homePath = (pack: Pack) => (pack.spec.experts.length ? '/' : '/overview')
