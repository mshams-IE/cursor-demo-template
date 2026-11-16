import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useT } from '../i18n'
import { fmtNumber, SEVERITY_RANK, worst } from '../pack'
import { useDemo } from '../store'
import type { Site } from '../types'
import { RegionMap } from './RegionMap'
import { STATUS_SOFT, STATUS_VAR, StatusChip } from './ui'

/** The map's stand-in for packs without geography: one tile per group, shaded by its worst status. */
export function GroupGrid({ sites, height = '26rem', testid = 'group-grid' }: { sites: Site[]; height?: string; testid?: string }) {
  const { pack, p, t, rtl, locale } = useT()
  const regionId = useDemo((s) => s.regionId)
  const selectRegion = useDemo((s) => s.selectRegion)
  const { spec } = pack
  const Back = rtl ? ArrowRight : ArrowLeft

  const byRegion = useMemo(() => {
    const m = new Map<string, Site[]>()
    for (const s of sites) m.set(s.regionId, [...(m.get(s.regionId) ?? []), s])
    return m
  }, [sites])

  if (!spec.regions.length)
    return (
      <div className="flex w-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-white text-[0.9rem] text-muted" style={{ height }} data-testid={testid}>
        {t('groupsPending')}
      </div>
    )

  return (
    <section className="card flex w-full flex-col p-5" style={{ minHeight: height }} data-testid={testid}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <h2 className="section-title">{t('groupsTitle')}</h2>
        {regionId && (
          <button type="button" className="btn btn-ghost !px-3 !py-1.5 text-[0.85rem]" onClick={() => selectRegion(undefined)} data-testid="map-back">
            <Back size={15} /> {t('back')}
          </button>
        )}
      </header>
      <div className="grid flex-1 auto-rows-fr gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {spec.regions.map((r) => {
          const list = byRegion.get(r.id) ?? []
          const flagged = list.filter((s) => s.status !== 'normal').sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status])
          const w = worst(list.map((s) => s.status))
          const selected = r.id === regionId
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => selectRegion(selected ? undefined : r.id)}
              aria-pressed={selected}
              className="flex flex-col gap-2 rounded-xl border p-4 text-start transition-opacity"
              style={{
                background: w === 'normal' ? '#ffffff' : STATUS_SOFT[w],
                borderColor: selected ? 'var(--brand-secondary)' : 'var(--line)',
                borderWidth: selected ? 2 : 1,
                opacity: regionId && !selected ? 0.55 : 1,
              }}
              data-testid={`group-${r.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-ink">{p(r.name)}</span>
                <StatusChip status={w} />
              </div>
              <div className="text-[0.86rem] text-muted" data-testid={`group-count-${r.id}`}>
                <span className="num font-semibold text-ink">{fmtNumber(flagged.length, locale)}</span> {t('ofTotal')} <span className="num font-semibold text-ink">{fmtNumber(list.length, locale)}</span> {t('needAttention')}
              </div>
              {flagged.length > 0 && (
                <ul className="space-y-1 text-[0.84rem] text-body">
                  {flagged.slice(0, 3).map((s) => (
                    <li key={s.id} className="flex items-center gap-2" data-testid={`group-site-${s.id}`}>
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STATUS_VAR[s.status] }} />
                      <span className="truncate">{p(s.name)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/** The map when the pack has one, otherwise the group tiles. Both drive the same region filter. */
export function OrganisationView({ sites, height }: { sites: Site[]; height?: string }) {
  const { pack } = useT()
  return pack.boundaries ? <RegionMap sites={sites} height={height} /> : <GroupGrid sites={sites} height={height} />
}
