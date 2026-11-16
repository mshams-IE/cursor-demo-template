import { Search } from 'lucide-react'
import { useMemo } from 'react'
import { fold } from '../engine'
import { useT } from '../i18n'
import { SEVERITY_RANK } from '../pack'
import { useDemo } from '../store'
import type { Severity } from '../types'
import { RegionMap } from './RegionMap'
import { Card, Segmented, StatusChip } from './ui'

/** Full-width map above a filterable site table. Filters drive both, so the map and table always agree. */
export function ReportView() {
  const { pack, p, t, sev, locale } = useT()
  const { regionId, statusFilter, typeFilter, search } = useDemo()
  const st = useDemo.getState()
  const sites = useMemo(() => {
    const q = fold(search.trim())
    return pack.spec.sites
      .filter((s) => (!regionId || s.regionId === regionId) && (!statusFilter || s.status === statusFilter) && (!typeFilter || s.type === typeFilter))
      .filter((s) => !q || fold(`${s.name.en} ${s.name.ar ?? ''}`).includes(q))
      .sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status] || a.name.en.localeCompare(b.name.en))
  }, [pack, regionId, statusFilter, typeFilter, search])
  const attention = sites.filter((s) => s.status !== 'normal').length

  return (
    <div className="space-y-4">
      <RegionMap sites={sites} height="24rem" />
      <Card testid="report-table">
        <div className="mb-4 flex flex-wrap items-center gap-3" data-testid="report-filters">
          <select className="rounded-full border border-line bg-white px-3 py-2 text-[0.88rem]" value={regionId ?? ''} onChange={(e) => st.selectRegion(e.target.value || undefined)} aria-label={t('region')} data-testid="filter-region">
            <option value="">{t('allRegions')}</option>
            {pack.spec.regions.map((r) => (
              <option key={r.id} value={r.id}>
                {p(r.name)}
              </option>
            ))}
          </select>
          <select className="rounded-full border border-line bg-white px-3 py-2 text-[0.88rem]" value={typeFilter ?? ''} onChange={(e) => st.setTypeFilter(e.target.value || undefined)} aria-label={t('type')} data-testid="filter-type">
            <option value="">{t('allTypes')}</option>
            {pack.spec.assetTypes.map((a) => (
              <option key={a.id} value={a.id}>
                {p(a.plural)}
              </option>
            ))}
          </select>
          <Segmented<'all' | Severity>
            ariaLabel={t('status')}
            value={statusFilter ?? 'all'}
            onChange={(v) => st.setStatusFilter(v === 'all' ? undefined : v)}
            options={[{ value: 'all', label: t('allStatus') }, ...(['critical', 'watch', 'normal'] as Severity[]).map((s) => ({ value: s, label: sev(s) }))]}
            testid="filter-status"
          />
          <label className="relative ms-auto">
            <Search size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" />
            <input value={search} onChange={(e) => st.setSearch(e.target.value)} placeholder={t('search')} className="w-56 rounded-full border border-line bg-white py-2 ps-9 pe-3 text-[0.88rem]" data-testid="filter-search" />
          </label>
        </div>
        <div className="mb-2 text-[0.88rem] text-muted" data-testid="report-count">
          <span className="num font-semibold text-ink">{sites.length}</span> {t('sitesShown')} · <span className="num font-semibold text-ink">{attention}</span> {t('needAttention')}
        </div>
        <div className="scroll-thin max-h-[28rem] overflow-auto">
          <table className="w-full text-start text-[0.88rem]">
            <thead className="sticky top-0 bg-white text-muted">
              <tr className="border-b border-line text-start">
                {(['site', 'region', 'type', 'status', 'note'] as const).map((k) => (
                  <th key={k} className="py-2 pe-4 text-start font-semibold">
                    {t(k)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id} className="border-b border-line/60 hover:bg-surface" data-testid={`row-${s.id}`}>
                  <td className="py-2.5 pe-4 font-semibold text-ink">{p(s.name)}</td>
                  <td className="py-2.5 pe-4">{pack.regionName(s.regionId, locale)}</td>
                  <td className="py-2.5 pe-4">{pack.typeName(s.type, locale)}</td>
                  <td className="py-2.5 pe-4">
                    <StatusChip status={s.status} />
                  </td>
                  <td className="py-2.5 pe-4 text-body">{p(s.note)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
