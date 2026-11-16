import { SEVERITY_RANK } from '../pack'
import { useT } from '../i18n'
import { useDemo } from '../store'
import { Card, StatusChip } from './ui'

export function IncidentList() {
  const { pack, p, r, t, locale } = useT()
  const selectRegion = useDemo((s) => s.selectRegion)
  const list = [...pack.spec.incidents].sort((a, b) => (a.role === 'hero' ? -1 : b.role === 'hero' ? 1 : SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]))
  return (
    <Card title={t('priorityIncidents')} testid="incident-list" className="flex flex-col">
      <ul className="scroll-thin -mx-1 flex-1 space-y-2 overflow-auto px-1">
        {list.map((i) => {
          const site = pack.site(i.siteId)
          return (
            <li key={i.id}>
              <button
                type="button"
                onClick={() => site && selectRegion(site.regionId)}
                className={`w-full rounded-xl border p-3 text-start transition-colors hover:bg-surface ${i.role === 'hero' ? 'border-accent/50 bg-[color-mix(in_srgb,var(--brand-accent)_6%,white)]' : 'border-line'}`}
                data-testid={`incident-${i.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-ink">{p(i.title)}</div>
                  <StatusChip status={i.severity} />
                </div>
                <div className="mt-1 text-[0.84rem] text-muted">
                  {site ? `${p(site.name)} · ${pack.regionName(site.regionId, locale)} · ` : ''}
                  {t('since')} <span className="num">{i.started}</span>
                  {i.role && <span className="ms-2 chip bg-surface-2 !py-0 text-[0.7rem] text-secondary">{t(i.role)}</span>}
                </div>
                <div className="mt-1 text-[0.86rem] text-body">{r(i.impact)}</div>
              </button>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
