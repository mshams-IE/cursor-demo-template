import { Siren, TriangleAlert } from 'lucide-react'
import { useMemo } from 'react'
import { useT } from '../../i18n'
import { alertsAt } from '../../model/live'
import { useDemo } from '../../store'

const STYLE = {
  watch: 'border-[#f2d49b] bg-watch-soft text-[#7a4d00]',
  critical: 'border-critical/30 bg-critical-soft text-[#8f1d14]',
  normal: 'border-line bg-white text-body',
}

export function AlertBanners() {
  const { pack, p, r, locale } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  const alerts = useMemo(() => alertsAt(pack.spec, minute), [pack, minute])
  if (!alerts.length) return null
  return (
    <div className="flex max-w-[44rem] flex-col gap-2" data-testid="alert-banners">
      {alerts.map((a) => {
        const Icon = a.severity === 'critical' ? Siren : TriangleAlert
        const lead = a.regionId ? pack.regionName(a.regionId, locale) : p(a.title)
        return (
          <div key={a.id} role="status" className={`flex items-start gap-2 rounded-2xl border px-4 py-2.5 text-[0.85rem] ${STYLE[a.severity]}`} title={p(a.title)} data-testid={`alert-${a.id}`}>
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span>
              <strong>{lead}: </strong>
              {r(a.text)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
