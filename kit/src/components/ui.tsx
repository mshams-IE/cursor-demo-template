import { Info, X } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import type { Severity } from '../types'

export const STATUS_VAR: Record<Severity, string> = {
  normal: 'var(--status-normal)',
  watch: 'var(--status-watch)',
  critical: 'var(--status-critical)',
}
export const STATUS_SOFT: Record<Severity, string> = {
  normal: 'var(--status-normal-soft)',
  watch: 'var(--status-watch-soft)',
  critical: 'var(--status-critical-soft)',
}
const STATUS_TEXT: Record<Severity, string> = { normal: '#0a7a55', watch: '#8a6100', critical: '#b42318' }

export function StatusChip({ status }: { status: Severity }) {
  const { sev } = useT()
  return (
    <span className="chip" style={{ background: STATUS_SOFT[status], color: STATUS_TEXT[status] }} data-testid={`status-${status}`}>
      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_VAR[status] }} />
      {sev(status)}
    </span>
  )
}

export function Card({ children, className = '', title, actions, testid }: { children: ReactNode; className?: string; title?: ReactNode; actions?: ReactNode; testid?: string }) {
  return (
    <section className={`card p-5 ${className}`} data-testid={testid}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          {typeof title === 'string' ? <h2 className="section-title">{title}</h2> : title}
          {actions}
        </header>
      )}
      {children}
    </section>
  )
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel, testid }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel: string; testid?: string }) {
  return (
    <div className="seg" role="group" aria-label={ariaLabel} data-testid={testid}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} data-testid={testid ? `${testid}-${o.value}` : undefined}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function InfoPopover({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div className="relative inline-flex" ref={ref}>
      <button type="button" aria-label={title} aria-expanded={open} onClick={() => setOpen((o) => !o)} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-secondary">
        <Info size={16} />
      </button>
      {open && (
        <div role="dialog" className="card fade-up absolute end-0 top-9 z-40 w-[21rem] p-4 text-start text-[0.85rem] leading-relaxed text-body">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="font-semibold text-ink">{title}</div>
            <button type="button" onClick={() => setOpen(false)} className="text-muted hover:text-ink" aria-label="close">
              <X size={14} />
            </button>
          </div>
          {children}
        </div>
      )}
    </div>
  )
}

export function prefersReducedMotion() {
  return typeof document !== 'undefined' && (document.documentElement.dataset.reducedMotion === 'true' || matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

export function CountUp({ value, durationMs = 1200, format }: { value: number; durationMs?: number; format: (n: number) => string }) {
  const shown = useRef(0)
  const [v, setV] = useState(0)
  useEffect(() => {
    const start = shown.current
    if (prefersReducedMotion() || start === value) {
      shown.current = value
      setV(value)
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / durationMs)
      const next = start + (value - start) * (1 - Math.pow(1 - k, 3))
      shown.current = next
      setV(next)
      if (k < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, durationMs])
  return <>{format(v)}</>
}

export function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null
  const w = 300
  const h = 46
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 3 - ((v - min) / span) * (h - 6)])
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" pathLength={1} className="spark-line" />
    </svg>
  )
}
