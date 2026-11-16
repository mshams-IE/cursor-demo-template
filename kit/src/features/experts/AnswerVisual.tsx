import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import type { Visual } from '../../store'

const SERIES_COLORS = ['#413cc3', '#00a3af', '#ff550d', '#00a7e1', '#5555f9', '#8a94a6']
const AXIS = { fontSize: 11, fill: '#5f6b76' }

/** Chart or table attached to an expert answer. */
export function AnswerVisual({ visual, large }: { visual: Visual; large?: boolean }) {
  const { locale, rtl } = useT()
  const num = (v: unknown) => {
    const n = Number(v)
    return Number.isFinite(n) ? fmtNumber(n, locale, Math.abs(n) < 10 && !Number.isInteger(n) ? 1 : 0) : String(v)
  }
  const height = large ? 260 : 200
  if (visual.kind === 'table')
    return (
      <figure className="mt-3 overflow-hidden rounded-xl border border-line bg-white" data-testid="answer-visual" data-kind="table">
        <figcaption className="border-b border-line px-3 py-2 text-[0.8rem] font-semibold text-ink">{visual.title}</figcaption>
        <div className="scroll-thin max-h-[18rem] overflow-auto">
          <table className="w-full text-[0.8rem]">
            <thead className="bg-surface text-muted">
              <tr>
                {visual.columns.map((c) => (
                  <th key={c} className="px-3 py-1.5 text-start font-semibold">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visual.rows.map((row, i) => (
                <tr key={i} className="border-t border-line">
                  {row.map((cell, j) => (
                    <td key={j} className={`px-3 py-1.5 ${typeof cell === 'number' ? 'num text-end' : ''}`}>
                      {typeof cell === 'number' ? num(cell) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </figure>
    )
  const unit = visual.unit
  return (
    <figure className="mt-3 rounded-xl border border-line bg-white px-3 pb-2 pt-3" data-testid="answer-visual" data-kind={visual.kind}>
      <figcaption className="mb-1 flex items-baseline justify-between gap-2 text-[0.8rem] font-semibold text-ink">
        <span>{visual.title}</span>
        {unit && <span className="text-[0.72rem] font-medium text-muted">{unit}</span>}
      </figcaption>
      <div style={{ height }} dir="ltr">
        <ResponsiveContainer>
          {visual.kind === 'stacked' ? (
            <BarChart data={visual.rows} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
              <CartesianGrid stroke="#ebf1f4" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} minTickGap={12} reversed={rtl} />
              <YAxis tick={AXIS} tickFormatter={num} width={52} orientation={rtl ? 'right' : 'left'} />
              <Tooltip formatter={(v) => `${num(v)} ${unit}`} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {visual.series.map((s, k) => (
                <Bar key={s.id} dataKey={s.id} name={s.label} stackId="a" fill={SERIES_COLORS[k % SERIES_COLORS.length]} maxBarSize={28} isAnimationActive={false} />
              ))}
            </BarChart>
          ) : visual.kind === 'line' ? (
            <LineChart data={visual.points} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
              <CartesianGrid stroke="#ebf1f4" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} minTickGap={18} reversed={rtl} />
              <YAxis tick={AXIS} tickFormatter={num} width={52} domain={['auto', 'auto']} orientation={rtl ? 'right' : 'left'} />
              <Tooltip formatter={(v) => `${num(v)} ${unit}`} />
              <Line dataKey="value" stroke={SERIES_COLORS[0]} strokeWidth={2.2} dot={visual.points.length <= 14} isAnimationActive={false} />
            </LineChart>
          ) : (
            <BarChart data={visual.points} margin={{ top: 6, right: 8, bottom: 0, left: -6 }}>
              <CartesianGrid stroke="#ebf1f4" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} minTickGap={8} reversed={rtl} />
              <YAxis tick={AXIS} tickFormatter={num} width={52} orientation={rtl ? 'right' : 'left'} />
              <Tooltip formatter={(v) => `${num(v)} ${unit}`} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false}>
                {visual.points.map((_, i) => (
                  <Cell key={i} fill={i === visual.highlight ? '#ff550d' : SERIES_COLORS[0]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
