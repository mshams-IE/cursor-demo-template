import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { STATUS_VAR, StatusChip } from '../../components/ui'
import { useT } from '../../i18n'
import { metricAt, prioritySites } from '../../model/live'
import { formatTime } from '../../model/time'
import { fmtNumber } from '../../pack'
import { useDemo } from '../../store'
import { metricTone } from '../map/mapModel'
import { OVERVIEW } from './strings'

/** Sites that need attention at the clock, worst first. */
export function WatchList({ limit = 6 }: { limit?: number }) {
  const { pack, p, r, t, locale, rtl } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const regionId = useDemo((s) => s.regionId)
  const selectSite = useDemo((s) => s.selectSite)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  const list = useMemo(() => prioritySites(pack.spec, minute).filter((l) => !regionId || l.site.regionId === regionId), [pack, minute, regionId])
  const Chevron = rtl ? ChevronLeft : ChevronRight
  if (!list.length) return <p className="py-6 text-center text-[0.9rem] text-muted">{p(OVERVIEW.allClear)}</p>
  return (
    <ul className="grid gap-2.5 lg:grid-cols-2" data-testid="watch-list">
      {list.slice(0, limit).map((l) => {
        const m = l.site.metrics?.[0]
        const v = m ? metricAt(m, minute) : undefined
        return (
          <li key={l.site.id}>
            <button
              type="button"
              onClick={() => selectSite(l.site.id)}
              className="group flex w-full items-start gap-3 rounded-2xl border border-line bg-white p-3.5 text-start transition-colors hover:border-secondary hover:bg-surface"
              data-testid={`watch-${l.site.id}`}
            >
              <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full" style={{ background: STATUS_VAR[l.status] }} />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink">{p(l.site.name)}</span>
                  <StatusChip status={l.status} />
                </span>
                <span className="mt-0.5 block text-[0.78rem] text-muted">
                  {pack.regionName(l.site.regionId, locale)}
                  {l.since && ` · ${t('since')} ${formatTime(l.since, locale)}`}
                  {m && v !== undefined && (
                    <span
                      className="num ms-1 font-semibold"
                      style={{
                        color: m.limit !== undefined ? STATUS_VAR[metricTone(m, v)] : undefined,
                      }}
                    >
                      · {p(m.label)} {fmtNumber(v, locale, m.decimals ?? 0)}
                      {p(m.unit)}
                    </span>
                  )}
                </span>
                {l.note && <span className="mt-1 line-clamp-2 block text-[0.82rem] text-body">{r(l.note)}</span>}
              </span>
              <Chevron size={16} className="mt-1 shrink-0 text-muted group-hover:text-secondary" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
