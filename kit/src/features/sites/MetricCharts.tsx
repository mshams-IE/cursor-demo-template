import { useMemo } from 'react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { STATUS_VAR } from '../../components/ui'
import { useT } from '../../i18n'
import { metricAt } from '../../model/live'
import { formatTime, HOUR, toMs } from '../../model/time'
import { fmtNumber } from '../../pack'
import type { SiteMetric } from '../../types'
import { metricTone } from '../map/mapModel'
import { SITES } from './strings'

const AXIS = { fontSize: 11, fill: '#5f6b76' }

/** Axis bounds on round numbers with about four steps, kept at or above zero for non-negative data. */
function niceRange(min: number, max: number): [number, number, number] {
  const span = max - min || Math.abs(max) || 1
  const raw = span / 4
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? 10 * mag
  const lo = Math.floor((min - span * 0.05) / step) * step
  return [min >= 0 ? Math.max(0, lo) : lo, Math.ceil((max + span * 0.05) / step) * step, step]
}

export function MetricCard({ m, clockMs }: { m: SiteMetric; clockMs: number }) {
  const { p, locale } = useT()
  const value = metricAt(m, clockMs)
  const tone = m.limit !== undefined ? metricTone(m, value) : 'normal'
  const color = m.limit !== undefined ? STATUS_VAR[tone] : 'var(--ink)'
  const pct = m.limit ? Math.min(100, (value / (m.limit * 1.25)) * 100) : undefined
  const limitPct = m.limit ? 80 : undefined
  return (
    <div className="rounded-2xl bg-surface p-3.5" data-testid={`metric-${m.id}`}>
      <div className="text-[0.78rem] text-muted">{p(m.label)}</div>
      <div className="num mt-1 whitespace-nowrap text-[1.5rem] font-semibold leading-tight" style={{ color }}>
        {fmtNumber(value, locale, m.decimals ?? 0)}
        <span className="ms-0.5 text-[0.9rem] font-medium">{p(m.unit)}</span>
      </div>
      {m.limit !== undefined && (
        <>
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            <div className="absolute inset-y-0 w-0.5 bg-ink/60" style={{ insetInlineStart: `${limitPct}%` }} />
          </div>
          <div className="num mt-1 text-[0.72rem] text-muted">
            {p(SITES.limit)} {fmtNumber(m.limit, locale, m.decimals ?? 0)}
            {p(m.unit)}
          </div>
        </>
      )}
    </div>
  )
}

export function MetricChart({ m, clockMs }: { m: SiteMetric; clockMs: number }) {
  const { p, locale, rtl } = useT()
  const rows = useMemo(() => (m.series ?? []).map((pt) => ({ t: toMs(pt.at), v: pt.value })), [m.series])
  const shown = rows.filter((r) => r.t <= clockMs)
  if (!rows.length) return null
  const [lo, hi, step] = niceRange(Math.min(...rows.map((r) => r.v), m.limit ?? Infinity), Math.max(...rows.map((r) => r.v), m.limit ?? -Infinity))
  const yTicks = Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => lo + i * step)
  const t0 = rows[0].t
  const t1 = Math.max(t0 + HOUR, Math.min(clockMs, rows[rows.length - 1].t))
  const every = Math.max(1, Math.ceil((t1 - t0) / HOUR / 5)) * HOUR
  const xTicks = Array.from({ length: Math.floor((t1 - t0) / every) + 1 }, (_, i) => Math.ceil(t0 / HOUR) * HOUR + i * every).filter((x) => x <= t1)
  const tone = m.limit !== undefined ? metricTone(m, metricAt(m, clockMs)) : 'normal'
  const stroke = m.limit !== undefined && tone !== 'normal' ? STATUS_VAR[tone] : 'var(--brand-secondary)'
  const fmt = (v: number) => fmtNumber(v, locale, m.decimals ?? 0)
  return (
    <div data-testid={`metric-chart-${m.id}`}>
      <div className="mb-1 text-[0.82rem] font-semibold text-muted">
        {p(m.label)} <span className="font-normal">({p(m.unit)})</span>
      </div>
      <div className="h-48" dir="ltr">
        <ResponsiveContainer>
          <LineChart data={shown} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="#ebf1f4" vertical={false} />
            <XAxis dataKey="t" type="number" domain={[t0, t1]} ticks={xTicks} reversed={rtl} tickFormatter={(v: number) => formatTime(v, locale)} tick={AXIS} minTickGap={40} />
            <YAxis domain={[lo, hi]} ticks={yTicks} tick={AXIS} tickFormatter={(v: number) => fmtNumber(v, locale, step < 1 ? 1 : 0)} orientation={rtl ? 'right' : 'left'} />
            <Tooltip labelFormatter={(v) => formatTime(Number(v), locale)} formatter={(v) => [`${fmt(Number(v))} ${p(m.unit)}`, p(m.label)]} />
            {m.limit !== undefined && (
              <ReferenceLine
                y={m.limit}
                stroke={STATUS_VAR.watch}
                strokeDasharray="5 4"
                label={{
                  value: p(SITES.limit),
                  position: rtl ? 'insideTopRight' : 'insideTopLeft',
                  fontSize: 10,
                  fill: '#8a6100',
                }}
              />
            )}
            <Line dataKey="v" stroke={stroke} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
