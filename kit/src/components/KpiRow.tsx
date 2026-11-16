import { fmtNumber, type ResolvedKpi } from '../pack'
import { useT } from '../i18n'
import { CountUp, InfoPopover, Sparkline } from './ui'

const TONE: Record<ResolvedKpi['tone'], string> = {
  critical: 'var(--status-critical)',
  watch: 'var(--status-watch)',
  positive: 'var(--status-normal)',
  neutral: 'var(--brand-primary)',
}

/** One key figure. The unit line is always shown: counts read "of N <unit>", the rest show their unit. */
export function KpiTile({ r }: { r: ResolvedKpi }) {
  const { t, p, locale, rtl, pack } = useT()
  const k = r.kpi
  const color = TONE[r.tone]
  const decimals = k.kind === 'count' ? 0 : (k.decimals ?? 0)
  const suffix = k.kind === 'percent' ? '%' : ''
  const unitLine = k.kind === 'count' ? (locale === 'ar' ? `من ${fmtNumber(r.of ?? 0, locale)} ${p(k.unit)}` : `of ${fmtNumber(r.of ?? 0, locale)} ${p(k.unit)}`) : p(k.unit)
  const delta = k.delta
  return (
    <div className="card relative overflow-hidden p-5 pb-10" data-testid={`kpi-${k.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.92rem] font-semibold text-muted">{p(k.label)}</div>
        <InfoPopover title={`${t('definition')}: ${p(k.label)}`}>
          <p>{p(k.definition)}</p>
          <p className="mt-2 text-[0.76rem] text-muted">
            {t('observed')}: {p(pack.spec.clock.zone)} {pack.spec.clock.observedAt.replace('T', ' ')}
          </p>
        </InfoPopover>
      </div>
      <div className="num mt-2 text-[clamp(2.1rem,3vw,3.1rem)] font-bold leading-none tracking-tight" style={{ color }} data-testid="kpi-value">
        <CountUp value={r.value} format={(n) => `${fmtNumber(n, locale, decimals)}${suffix}`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2 text-[0.85rem] text-muted">
        <span data-testid="kpi-unit">{unitLine}</span>
        {delta && delta.value !== 0 && (
          <span className="num font-semibold" style={{ color: delta.value > 0 === delta.worseWhenUp ? 'var(--status-critical)' : 'var(--status-normal)' }} data-testid="kpi-delta">
            {delta.value > 0 ? '▲' : '▼'} {fmtNumber(Math.abs(delta.value), locale, decimals)}
            {suffix} {p(delta.period)}
          </span>
        )}
      </div>
      {k.trend && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 opacity-70" style={{ transform: rtl ? 'scaleX(-1)' : undefined }}>
          <Sparkline values={k.trend} color={color} />
        </div>
      )}
    </div>
  )
}

export function KpiRow() {
  const { pack } = useT()
  return (
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4" data-testid="kpi-row">
      {pack.kpis.map((r) => (
        <KpiTile key={r.kpi.id} r={r} />
      ))}
    </div>
  )
}
