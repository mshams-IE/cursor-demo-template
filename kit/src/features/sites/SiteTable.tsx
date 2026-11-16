import { useMemo } from 'react'
import { STATUS_VAR, StatusChip } from '../../components/ui'
import { useT } from '../../i18n'
import { metricAt, sitesAt, type LiveSite } from '../../model/live'
import { formatTime } from '../../model/time'
import { fmtNumber, SEVERITY_RANK } from '../../pack'
import { useDemo } from '../../store'
import { metricTone } from '../map/mapModel'
import { SITES } from './strings'

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, '')
    .replace(/[إأآ]/g, 'ا')

/** Sites at the clock that match the page filters, worst and most recently changed first. */
export function useFilteredSites(): LiveSite[] {
  const { pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const status = useDemo((s) => s.statusFilter)
  const type = useDemo((s) => s.typeFilter)
  const regionId = useDemo((s) => s.regionId)
  const search = useDemo((s) => s.search)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  return useMemo(() => {
    const q = norm(search.trim())
    return sitesAt(pack.spec, minute)
      .filter((l) => (!status || l.status === status) && (!type || l.site.type === type) && (!regionId || l.site.regionId === regionId))
      .filter((l) => !q || norm(`${l.site.name.en} ${l.site.name.ar ?? ''} ${l.site.id}`).includes(q))
      .sort((a, b) => SEVERITY_RANK[b.status] - SEVERITY_RANK[a.status] || (b.since ?? 0) - (a.since ?? 0) || a.site.id.localeCompare(b.site.id))
  }, [pack, minute, status, type, regionId, search])
}

export function SiteTable({ rows }: { rows: LiveSite[] }) {
  const { pack, t, p, r, locale } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const selected = useDemo((s) => s.siteId)
  const selectSite = useDemo((s) => s.selectSite)
  if (!rows.length) return <p className="py-6 text-center text-[0.9rem] text-muted">{p(SITES.noSites)}</p>
  const th = 'py-2 pe-3 text-start font-medium'
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.86rem]" data-testid="site-table">
        <thead>
          <tr className="border-b border-line text-[0.75rem] text-muted">
            <th className={th}>{t('site')}</th>
            <th className={th}>{t('status')}</th>
            <th className={th}>{t('region')}</th>
            {pack.spec.assetTypes.length > 1 && <th className={th}>{t('type')}</th>}
            <th className={th}>{p(SITES.keyReading)}</th>
            <th className={th}>{p(SITES.sinceCol)}</th>
            <th className={`${th} hidden 2xl:table-cell`}>{t('note')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => {
            const m = l.site.metrics?.[0]
            const v = m ? metricAt(m, clockMs) : undefined
            const tone = m && v !== undefined && m.limit !== undefined ? metricTone(m, v) : undefined
            return (
              <tr
                key={l.site.id}
                onClick={() => selectSite(l.site.id)}
                className={`cursor-pointer border-b border-line/60 transition-colors last:border-0 hover:bg-surface ${selected === l.site.id ? 'bg-surface' : ''}`}
                data-testid={`site-row-${l.site.id}`}
              >
                <td className="py-2 pe-3">
                  <button type="button" className="flex items-center gap-2.5 text-start" onClick={(e) => (e.stopPropagation(), selectSite(l.site.id))}>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_VAR[l.status] }} />
                    <span>
                      <span className="block font-semibold text-ink">{p(l.site.name)}</span>
                      <span className="num block text-[0.72rem] text-muted" dir="ltr">
                        {l.site.id}
                      </span>
                    </span>
                  </button>
                </td>
                <td className="pe-3">
                  <StatusChip status={l.status} />
                </td>
                <td className="pe-3 text-body">{pack.regionName(l.site.regionId, locale)}</td>
                {pack.spec.assetTypes.length > 1 && <td className="pe-3 text-body">{pack.typeName(l.site.type, locale)}</td>}
                <td className="pe-3">
                  {m && v !== undefined ? (
                    <span className="num whitespace-nowrap font-semibold" style={{ color: tone ? STATUS_VAR[tone] : 'var(--ink)' }} title={p(m.label)}>
                      {fmtNumber(v, locale, m.decimals ?? 0)}
                      {p(m.unit)}
                      {m.limit !== undefined && (
                        <span className="ms-1 font-normal text-muted">
                          / {fmtNumber(m.limit, locale, m.decimals ?? 0)}
                          {p(m.unit)}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="num pe-3 text-muted">{l.since ? formatTime(l.since, locale) : '—'}</td>
                <td className="hidden max-w-[22rem] truncate pe-3 text-[0.8rem] text-muted 2xl:table-cell" title={r(l.note)}>
                  {r(l.note) || '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
