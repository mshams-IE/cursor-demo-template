import {
  Activity,
  Banknote,
  Bell,
  ChartColumn,
  CircleDollarSign,
  Clock,
  Droplets,
  Factory,
  Fuel,
  Gauge,
  HeartPulse,
  Landmark,
  MapPin,
  Package,
  Percent,
  Phone,
  Plane,
  Server,
  Signal,
  Siren,
  Thermometer,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Wifi,
  Wrench,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { CountUp, InfoPopover, Sparkline } from '../../components/ui'
import { useT } from '../../i18n'
import { kpisAt, type LiveKpi } from '../../model/live'
import { formatTime } from '../../model/time'
import { fmtNumber, type ResolvedKpi } from '../../pack'
import { useDemo } from '../../store'
import { OVERVIEW } from './strings'

const ICONS: Record<string, LucideIcon> = {
  Activity,
  AlertTriangle: TriangleAlert,
  Banknote,
  BarChart: ChartColumn,
  Bell,
  ChartColumn,
  CircleDollarSign,
  Clock,
  Droplets,
  Factory,
  Fuel,
  Gauge,
  HeartPulse,
  Landmark,
  MapPin,
  Package,
  Percent,
  Phone,
  Plane,
  Server,
  Signal,
  Siren,
  Thermometer,
  Timer,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  Truck,
  Users,
  Wifi,
  Wrench,
  Zap,
}

const TONE: Record<ResolvedKpi['tone'], string> = {
  critical: 'var(--status-critical)',
  watch: 'var(--status-watch)',
  positive: 'var(--status-normal)',
  neutral: 'var(--ink)',
}

/** Whether a rise is bad: the KPI's declared delta, counts of flagged items, otherwise unknown. */
function worseWhenUp(k: LiveKpi): boolean | undefined {
  if (k.kpi.delta) return k.kpi.delta.worseWhenUp
  if (k.kpi.kind === 'count') return true
  return undefined
}

export function LiveKpiTile({ k }: { k: LiveKpi }) {
  const { t, p, locale, rtl, pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const kpi = k.kpi
  const color = TONE[k.tone]
  const Icon = (kpi.icon && ICONS[kpi.icon]) || Activity
  const decimals = kpi.kind === 'count' ? 0 : (kpi.decimals ?? 0)
  const suffix = kpi.kind === 'percent' ? '%' : ''
  const basis = kpi.kind === 'count' ? (locale === 'ar' ? `من ${fmtNumber(k.of ?? 0, locale)} ${p(kpi.unit)}` : `of ${fmtNumber(k.of ?? 0, locale)} ${p(kpi.unit)}`) : p(kpi.unit)
  const change = k.change !== undefined ? Number(k.change.toFixed(decimals)) : kpi.delta?.value
  const up = worseWhenUp(k)
  const changeColor = !change || up === undefined ? 'var(--muted)' : change > 0 === up ? 'var(--status-critical)' : 'var(--status-normal)'
  const period = k.change !== undefined ? p(OVERVIEW.vsHourAgo) : p(kpi.delta?.period)
  const progress = kpi.kind === 'percent' ? Math.min(100, Math.max(0, k.value)) : undefined
  return (
    <div className={`card relative overflow-hidden p-5 ${progress !== undefined ? 'pb-11' : 'pb-9'}`} data-testid={`kpi-${kpi.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-[0.92rem] font-medium text-muted">
          <Icon size={18} style={{ color }} className="shrink-0" />
          {p(kpi.label)}
        </div>
        <InfoPopover title={`${t('definition')}: ${p(kpi.label)}`}>
          <p>{p(kpi.definition)}</p>
          <p className="mt-2 text-[0.78rem] text-muted">
            {t('observed')}: {formatTime(clockMs, locale, p(pack.spec.clock.zone))}
          </p>
        </InfoPopover>
      </div>
      <div className="num mt-2 text-[clamp(2.2rem,3.2vw,3.3rem)] font-semibold leading-none tracking-tight" style={{ color }} data-testid="kpi-value">
        <CountUp value={k.value} durationMs={1200} format={(n) => `${fmtNumber(n, locale, decimals)}${suffix}`} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 overflow-hidden rounded-b-[inherit] opacity-60" style={{ transform: rtl ? 'scaleX(-1)' : undefined }} data-testid="kpi-spark">
        <Sparkline values={k.spark} color={color} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[0.85rem] text-muted">
        <span data-testid="kpi-unit">{basis}</span>
        {!!change && (
          <span className="num font-semibold" style={{ color: changeColor }} data-testid="kpi-delta">
            {change > 0 ? '▲' : '▼'} {fmtNumber(Math.abs(change), locale, decimals)}
            {suffix} {period}
          </span>
        )}
      </div>
      {progress !== undefined && (
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-ok transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  )
}

export function LiveKpiRow() {
  const { pack } = useT()
  const clockMs = useDemo((s) => s.clockMs)
  const minute = Math.floor(clockMs / 60_000) * 60_000
  const kpis = useMemo(() => kpisAt(pack, minute), [pack, minute])
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" data-testid="kpi-row">
      {kpis.map((k) => (
        <LiveKpiTile key={k.kpi.id} k={k} />
      ))}
    </div>
  )
}
