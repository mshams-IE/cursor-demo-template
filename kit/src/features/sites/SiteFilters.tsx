import { Search } from 'lucide-react'
import { Segmented } from '../../components/ui'
import { useT } from '../../i18n'
import { useDemo } from '../../store'
import type { Severity } from '../../types'

export function SiteFilters() {
  const { pack, t, p, sev } = useT()
  const status = useDemo((s) => s.statusFilter)
  const type = useDemo((s) => s.typeFilter)
  const regionId = useDemo((s) => s.regionId)
  const search = useDemo((s) => s.search)
  const st = useDemo.getState()
  const select = 'h-9 rounded-full border border-line bg-white px-3 text-[0.85rem] text-ink outline-none hover:border-secondary focus:border-secondary'
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="site-filters">
      <Segmented<'all' | Severity>
        ariaLabel={t('status')}
        value={status ?? 'all'}
        onChange={(v) => st.setStatusFilter(v === 'all' ? undefined : v)}
        options={[
          { value: 'all', label: t('allStatus') },
          ...(['critical', 'watch', 'normal'] as Severity[]).map((s) => ({
            value: s,
            label: sev(s),
          })),
        ]}
        testid="filter-status"
      />
      <select className={select} value={regionId ?? ''} onChange={(e) => st.selectRegion(e.target.value || undefined)} aria-label={t('region')} data-testid="filter-region">
        <option value="">{t('allRegions')}</option>
        {pack.spec.regions.map((r) => (
          <option key={r.id} value={r.id}>
            {p(r.name)}
          </option>
        ))}
      </select>
      {pack.spec.assetTypes.length > 1 && (
        <select className={select} value={type ?? ''} onChange={(e) => st.setTypeFilter(e.target.value || undefined)} aria-label={t('type')} data-testid="filter-type">
          <option value="">{t('allTypes')}</option>
          {pack.spec.assetTypes.map((a) => (
            <option key={a.id} value={a.id}>
              {p(a.name)}
            </option>
          ))}
        </select>
      )}
      <label className="flex h-9 min-w-[12rem] flex-1 items-center gap-1.5 rounded-full border border-line bg-white px-3 focus-within:border-secondary">
        <Search size={14} className="text-muted" />
        <input value={search} onChange={(e) => st.setSearch(e.target.value)} placeholder={t('search')} className="min-w-0 flex-1 bg-transparent text-[0.85rem] outline-none" aria-label={t('search')} data-testid="filter-search" />
      </label>
    </div>
  )
}
