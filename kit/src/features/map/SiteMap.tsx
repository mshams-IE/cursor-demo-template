import { Component, lazy, Suspense, useCallback, useMemo, useState, type ReactNode } from 'react'
import { GroupGrid } from '../../components/GroupGrid'
import { RegionMap } from '../../components/RegionMap'
import { useT } from '../../i18n'
import { sitesAt } from '../../model/live'
import { useDemo } from '../../store'

const MapLibreView = lazy(() => import('./MapLibreView').then((m) => ({ default: m.MapLibreView })))

class MapBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.warn('Map fell back to the drawn map:', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

function hasWebgl() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** Live statuses on the drawn map, for when WebGL is unavailable. */
function DrawnMap({ height }: { height: string }) {
  const { pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const sites = useMemo(
    () =>
      sitesAt(pack.spec, clockMs).map((l) => ({
        ...l.site,
        status: l.status,
        note: l.note,
      })),
    [pack, clockMs],
  )
  return <RegionMap sites={sites} height={height} />
}

function LiveGroups({ height }: { height: string }) {
  const { pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const sites = useMemo(
    () =>
      sitesAt(pack.spec, clockMs).map((l) => ({
        ...l.site,
        status: l.status,
        note: l.note,
      })),
    [pack, clockMs],
  )
  return <GroupGrid sites={sites} height={height} />
}

/** The pack's map on MapLibre with no tile server; the drawn map without WebGL; group tiles without geography. */
export function SiteMap({ height = '34rem', compact = false }: { height?: string; compact?: boolean }) {
  const { pack } = useT()
  const [webgl] = useState(hasWebgl)
  const [failed, setFailed] = useState(false)
  const onFail = useCallback(() => setFailed(true), [])
  if (!pack.boundaries || !pack.spec.regions.length) return <LiveGroups height={height} />
  const fallback = <DrawnMap height={height} />
  if (!webgl || failed) return fallback
  return (
    <MapBoundary fallback={fallback}>
      <Suspense fallback={<div className="w-full animate-pulse rounded-[var(--radius-card)] border border-line bg-[#e4edf3]" style={{ height }} data-testid="region-map" />}>
        <MapLibreView height={height} compact={compact} onFail={onFail} />
      </Suspense>
    </MapBoundary>
  )
}
