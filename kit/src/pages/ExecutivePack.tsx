import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Printer } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import clouderaLogo from '../../assets/cloudera-logo.png'
import { CountUp, StatusChip } from '../components/ui'
import { bodyToSections } from '../features/briefs/briefDoc'
import { planHeadline } from '../features/planning/planBrief'
import { S } from '../features/planning/strings'
import { evaluateAt, fullBy, hoursLabel, money } from '../features/planning/usePlan'
import { assumptionLabel } from '../features/wall/assumptionLabel'
import { P } from '../features/wall/packStrings'
import '../features/wall/wall.css'
import { useT } from '../i18n'
import { activeIncidents, kpisAt, type LiveKpi } from '../model/live'
import { whatIfAt } from '../model/planning'
import { formatDate, formatHoursRange, formatTime, MINUTE, toMs } from '../model/time'
import { fmtNumber } from '../pack'
import { useDemo } from '../store'
import type { Text } from '../types'

const TONE: Record<LiveKpi['tone'], string> = {
  critical: 'var(--status-critical)',
  watch: 'var(--status-watch)',
  positive: 'var(--status-normal)',
  neutral: 'var(--brand-secondary)',
}

function Big({ k }: { k: LiveKpi }) {
  const { p, locale } = useT()
  const kpi = k.kpi
  const decimals = kpi.kind === 'count' ? 0 : (kpi.decimals ?? 0)
  const suffix = kpi.kind === 'percent' ? '%' : ''
  const sub = kpi.kind === 'count' ? `${locale === 'ar' ? 'من' : 'of'} ${fmtNumber(k.of ?? 0, locale)} ${p(kpi.unit)}` : p(kpi.unit)
  return (
    <div className="flex flex-col rounded-3xl bg-surface px-7 py-6">
      <div className="text-[1.05rem] text-muted">{p(kpi.label)}</div>
      <div className="num mt-1 text-[3.6rem] font-bold leading-none tracking-tight" style={{ color: TONE[k.tone] }}>
        <CountUp value={k.value} format={(n) => `${fmtNumber(n, locale, decimals)}${suffix}`} />
      </div>
      <div className="mt-auto pt-3 text-[1rem] text-muted">{sub}</div>
    </div>
  )
}

function Scaled({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [k, setK] = useState(1)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setK(el.clientWidth / 1280))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="relative w-full" style={{ height: 720 * k }}>
      <div className="absolute left-0 top-0 origin-top-left" style={{ transform: `scale(${k})` }}>
        {children}
      </div>
    </div>
  )
}

function Slide({ n, total, eyebrow, title, children, cover, print }: { n: number; total: number; eyebrow: string; title: string; children: ReactNode; cover?: boolean; print?: boolean }) {
  const { pack, p } = useT()
  const { customer, brand } = pack.spec
  return (
    <section className="pack-slide flex h-[720px] w-[1280px] flex-col overflow-hidden rounded-[28px] bg-white px-16 py-10 text-ink shadow-2xl" data-testid={print ? undefined : `pack-slide-${n}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={clouderaLogo} alt="Cloudera" className={cover ? 'h-9 w-auto' : 'h-6 w-auto'} />
          {brand.coBrand && customer.logo && <img src={customer.logo} alt={p(customer.name)} className={`${cover ? 'h-14' : 'h-10'} w-auto border-s border-line ps-4`} />}
        </div>
        <span className="num text-[1rem] text-muted">
          {n} / {total}
        </span>
      </div>
      {cover ? (
        children
      ) : (
        <>
          <div className="mt-5 text-[1rem] font-bold uppercase tracking-[0.14em] text-secondary">{eyebrow}</div>
          <h2 className="mt-1 line-clamp-2 text-[2.4rem] font-bold leading-tight text-ink">{title}</h2>
          <div className="mt-6 min-h-0 flex-1">{children}</div>
        </>
      )}
    </section>
  )
}

interface SlideDef {
  id: string
  eyebrow: string
  title: string
  cover?: boolean
  body: ReactNode
}

export function ExecutivePack() {
  const { pack, t, p, r, locale } = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const clockMs = useDemo((s) => s.clockMs)
  const budget = useDemo((s) => s.budget)
  const windowHours = useDemo((s) => s.windowHours)
  const scenario = useDemo((s) => s.scenario)
  const whatIfInput = useDemo((s) => s.whatIfInput)
  const briefs = useDemo((s) => s.briefs)
  const [i, setI] = useState(0)
  const ar = locale === 'ar'
  const minute = Math.floor(clockMs / MINUTE) * MINUTE
  const { spec } = pack
  const zone = p(spec.clock.zone)
  const L = (t: Text) => p(t)

  const kpis = useMemo(() => kpisAt(pack, minute), [pack, minute])
  const incidents = useMemo(() => activeIncidents(spec, minute), [spec, minute])
  const view = useMemo(() => (spec.planning ? evaluateAt(pack, { budget, windowHours, scenario, clockMs: minute }) : undefined), [pack, spec.planning, budget, windowHours, scenario, minute])
  const whatIf = spec.planning?.whatIf ? whatIfAt(spec.planning, whatIfInput) : undefined

  const slides: SlideDef[] = []
  slides.push({
    id: 'cover',
    eyebrow: '',
    title: p(spec.title),
    cover: true,
    body: (
      <div className="flex flex-1 flex-col justify-center">
        <div className="text-[1.1rem] font-bold uppercase tracking-[0.16em] text-secondary">{L(P.executivePack)}</div>
        <h1 className="mt-3 text-[4rem] font-bold leading-[1.05] tracking-tight text-ink">{p(spec.title)}</h1>
        <p className="mt-3 text-[1.6rem] text-body">{p(spec.subtitle)}</p>
        <div className="mt-10 h-1.5 w-40 rounded-full bg-[linear-gradient(90deg,var(--brand-secondary),var(--brand-accent))]" />
        <div className="mt-8 grid grid-cols-2 gap-6 text-[1.15rem]">
          <div>
            <div className="text-muted">{L(P.preparedFor)}</div>
            <div className="mt-1 font-semibold text-ink">{p(spec.customer.name)}</div>
            <div className="text-body">{p(spec.audience)}</div>
          </div>
          <div>
            <div className="text-muted">{L(P.statusAt)}</div>
            <div className="mt-1 font-semibold text-ink">{formatDate(minute, locale)}</div>
            <div className="num text-body">{formatTime(minute, locale, zone)}</div>
          </div>
        </div>
      </div>
    ),
  })
  slides.push({
    id: 'situation',
    eyebrow: L(P.situation),
    title: `${L(P.statusAt)} ${formatTime(minute, locale, zone)}`,
    body: (
      <div className={`grid h-full gap-5 ${kpis.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {kpis.slice(0, 4).map((k) => (
          <Big key={k.kpi.id} k={k} />
        ))}
      </div>
    ),
  })
  const lead = incidents[0]
  slides.push({
    id: 'incidents',
    eyebrow: L(P.activeIncidents),
    title: lead ? p(lead.incident.title) : L(P.noIncidents),
    body: (
      <div className="grid h-full grid-cols-[1.15fr_1fr] gap-8">
        <ul className="space-y-3 overflow-hidden">
          {incidents.slice(0, 4).map(({ incident: x, startedMs }) => {
            const site = pack.site(x.siteId)
            return (
              <li key={x.id} className="rounded-2xl border border-line px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-[1.15rem] font-semibold text-ink">{p(x.title)}</span>
                  <StatusChip status={x.severity} />
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-[0.98rem] text-muted">
                  {site && <span>{pack.regionName(site.regionId, locale)}</span>}
                  <span className="num">{formatTime(startedMs, locale)}</span>
                  {x.affected && (
                    <span className="num font-semibold text-critical">
                      {fmtNumber(x.affected.value, locale)} {p(x.affected.unit)}
                    </span>
                  )}
                  {x.restoreHours && <span className="num">{formatHoursRange(x.restoreHours, locale)}</span>}
                </div>
              </li>
            )
          })}
        </ul>
        {lead && (
          <div className="min-h-0 overflow-hidden">
            <p className="text-[1.15rem] leading-relaxed text-body">{r(lead.incident.impact)}</p>
            {lead.incident.cause && <p className="mt-3 rounded-2xl bg-watch-soft px-4 py-3 text-[1rem] text-[#7a4d00]">{r(lead.incident.cause)}</p>}
            <ol className="mt-4 space-y-2.5 border-s-2 border-line ps-5">
              {(lead.incident.timeline ?? [])
                .filter((s) => toMs(s.at) <= minute)
                .slice(-4)
                .map((s, k) => (
                  <li key={k} className="text-[0.98rem]">
                    <span className="num font-semibold text-secondary">{formatTime(toMs(s.at), locale)}</span> <span>{r(s.text)}</span>
                  </li>
                ))}
            </ol>
          </div>
        )}
      </div>
    ),
  })
  const ev = view?.ev
  if (view && ev && ev.options.length && spec.planning) {
    const chosen = ev.plan.optionIds.map((id) => view.byId.get(id)!).filter(Boolean)
    const unit = p(spec.planning.benefit.unit)
    slides.push({
      id: 'plan',
      eyebrow: L(P.plan),
      title: chosen.length
        ? ar
          ? `${money(pack, ev.plan.cost, locale)} تحقق ${fmtNumber(ev.plan.delivered, locale)} ${unit} خلال ${hoursLabel(ev.inputs.windowHours, locale)}`
          : `${money(pack, ev.plan.cost, locale)} delivers ${fmtNumber(ev.plan.delivered, locale)} ${unit} in ${hoursLabel(ev.inputs.windowHours, locale)}`
        : planHeadline(view, locale),
      body: (
        <div className="grid h-full grid-cols-[1.2fr_1fr] gap-8">
          <ol className="space-y-3">
            {chosen.map((o, k) => (
              <li key={o.id} className="flex gap-4 rounded-2xl bg-surface-2 px-5 py-4 text-[1.15rem] font-medium text-ink">
                <span className="num flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[1rem] text-white">{k + 1}</span>
                <span className="min-w-0">
                  {p(o.title)}
                  <span className="num mt-0.5 block text-[0.92rem] font-normal text-muted">
                    {money(pack, o.cost, locale)} · {formatHoursRange(o.hours, locale)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <div className="space-y-5">
            {[
              { k: L(P.baseline), v: ev.baseline.delivered, c: 'var(--muted)' },
              { k: L(P.planLabel), v: ev.plan.delivered, c: 'var(--brand-secondary)' },
            ].map((x) => (
              <div key={x.k}>
                <div className="flex justify-between text-[1.1rem]">
                  <span>{x.k}</span>
                  <span className="num font-semibold">
                    {fmtNumber(x.v, locale)} / {fmtNumber(ev.total, locale)}
                  </span>
                </div>
                <div className="mt-2 h-5 overflow-hidden rounded-full bg-surface" dir="ltr">
                  <div className="pack-bar h-full rounded-full" style={{ width: `${(x.v / Math.max(1, ev.total)) * 100}%`, background: x.c }} />
                </div>
              </div>
            ))}
            {chosen.length > 0 && (
              <p className="text-[1.05rem] text-body">
                {p(S.fullBy)}: <span className="num font-semibold">{hoursLabel(fullBy(ev, view.byId), locale)}</span> · {p(S.cost)} <span className="num font-semibold">{money(pack, ev.plan.cost, locale)}</span> {p(S.ofBudget)} <span className="num">{money(pack, ev.inputs.budget, locale)}</span>
              </p>
            )}
            {spec.planning.note && <p className="text-[0.92rem] leading-relaxed text-muted">{p(spec.planning.note)}</p>}
          </div>
        </div>
      ),
    })
  }
  if (whatIf && spec.planning?.whatIf) {
    const w = spec.planning.whatIf
    slides.push({
      id: 'whatif',
      eyebrow: L(P.exposure),
      title: p(w.title),
      body: (
        <div className="grid h-full grid-cols-2 gap-8">
          <div className="space-y-4">
            <p className="text-[1.1rem] leading-relaxed text-body">{p(w.description)}</p>
            <div className="rounded-3xl border-2 border-critical/40 px-6 py-5">
              <div className="text-[1.05rem] text-muted">{p(w.impact.label)}</div>
              <div className="num mt-1 text-[3rem] font-bold leading-none text-critical">{fmtNumber(whatIf.impact, locale)}</div>
              <div className="mt-1 text-[1rem] text-muted">
                {p(w.impact.unit)} · {L(S.current)} <span className="num">{fmtNumber(w.impact.current, locale)}</span>
              </div>
            </div>
          </div>
          <ul className="space-y-4">
            {whatIf.readings.map((x) => (
              <li key={x.reading.label.en} className="rounded-2xl bg-surface px-5 py-4">
                <div className="flex items-baseline justify-between gap-3 text-[1.08rem]">
                  <span className="font-medium text-ink">{p(x.reading.label)}</span>
                  <span className="num text-[1.5rem] font-bold" style={{ color: x.state === 'trip' ? 'var(--status-critical)' : x.state === 'alarm' ? 'var(--status-watch)' : 'var(--status-normal)' }}>
                    {fmtNumber(x.value, locale, x.reading.decimals ?? 1)} {p(x.reading.unit)}
                  </span>
                </div>
                <div className="num mt-1 text-[0.92rem] text-muted">
                  {x.reading.limit !== undefined && `${p(S.limit)} ${fmtNumber(x.reading.limit, locale)}`}
                  {x.reading.trip !== undefined && ` · ${p(S.trip)} ${fmtNumber(x.reading.trip, locale)}`}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ),
    })
  }
  if (briefs.length) {
    const latest = briefs[0]
    const sections = bodyToSections(latest.body).slice(0, 3)
    slides.push({
      id: 'briefs',
      eyebrow: L(P.briefs),
      title: latest.title,
      body: (
        <div className="grid h-full grid-cols-[1.4fr_1fr] gap-8">
          <div className="min-h-0 space-y-4 overflow-hidden">
            {sections.map((s, k) => (
              <section key={k}>
                {s.heading && <div className="text-[0.9rem] font-bold uppercase tracking-[0.1em] text-secondary">{s.heading}</div>}
                <ul className="mt-1 space-y-1 text-[1.05rem] leading-relaxed text-body">
                  {s.lines.slice(0, 3).map((l, j) => (
                    <li key={j} className="line-clamp-2">
                      {l}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <ul className="space-y-2.5">
            {briefs.slice(0, 6).map((b) => (
              <li key={b.id} className="rounded-2xl border border-line px-4 py-3">
                <div className="font-semibold text-ink">{b.title}</div>
                <div className="num text-[0.9rem] text-muted">{formatTime(b.createdMs, locale, zone)}</div>
              </li>
            ))}
          </ul>
        </div>
      ),
    })
  }
  const assumptions = pack.assumptions
  slides.push({
    id: 'assumptions',
    eyebrow: L(P.assumptions),
    title: L(P.assumptionsTitle),
    body: (
      <div className="flex h-full flex-col">
        {assumptions.length ? (
          <ul className="grid grid-cols-2 gap-x-8 gap-y-3">
            {assumptions.slice(0, 10).map((a) => (
              <li key={a.path} className="border-s-4 border-watch ps-4">
                <div className="line-clamp-1 text-[1.02rem] font-semibold text-ink">{assumptionLabel(pack, a, locale)}</div>
                <div className="line-clamp-2 text-start text-[0.92rem] text-muted" dir="auto">
                  {a.why}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[1.2rem] text-muted">{t('noAssumptions')}</p>
        )}
        {assumptions.length > 10 && (
          <p className="mt-3 text-[0.95rem] text-muted">
            +{fmtNumber(assumptions.length - 10, locale)} {L(P.more)}
          </p>
        )}
        <p className="mt-auto text-[0.95rem] text-muted">{L(P.illustrative)}</p>
      </div>
    ),
  })

  const total = slides.length
  const idx = Math.min(i, total - 1)
  const go = (n: number) => setI(Math.max(0, Math.min(total - 1, n)))
  const exit = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate({ pathname: '/overview', search: globalThis.location.hash.split('?')[1] ?? '' })
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const fwd = ar ? 'ArrowLeft' : 'ArrowRight'
      const back = ar ? 'ArrowRight' : 'ArrowLeft'
      if (e.key === fwd || e.key === ' ' || e.key === 'PageDown') go(idx + 1)
      else if (e.key === back || e.key === 'PageUp') go(idx - 1)
      else if (e.key === 'Escape') exit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const Prev = ar ? ChevronRight : ChevronLeft
  const Next = ar ? ChevronLeft : ChevronRight
  const Back = ar ? ArrowRight : ArrowLeft
  const s = slides[idx]
  return (
    <div className="pack flex h-full flex-col items-center justify-center gap-5 px-8 py-6" data-testid="executive-pack">
      <div className="pack-screen w-full max-w-[min(92rem,calc((100vh-9rem)*16/9))]">
        <Scaled>
          <div key={s.id} className="fade-up">
            <Slide n={idx + 1} total={total} eyebrow={s.eyebrow} title={s.title} cover={s.cover}>
              {s.body}
            </Slide>
          </div>
        </Scaled>
      </div>
      <div className="pack-print">
        {slides.map((x, k) => (
          <Slide key={x.id} print n={k + 1} total={total} eyebrow={x.eyebrow} title={x.title} cover={x.cover}>
            {x.body}
          </Slide>
        ))}
      </div>
      <div className="no-print flex items-center gap-3 text-white">
        <button type="button" className="wall-btn" onClick={exit} aria-label={L(P.back)} title={L(P.back)} data-testid="pack-exit">
          <Back size={18} />
        </button>
        <button type="button" className="wall-btn" onClick={() => go(idx - 1)} disabled={idx === 0} aria-label={L(P.previous)} data-testid="pack-prev">
          <Prev size={20} />
        </button>
        <div className="flex gap-2">
          {slides.map((x, k) => (
            <button key={x.id} type="button" onClick={() => go(k)} aria-label={`${k + 1}`} aria-current={k === idx || undefined} className={`h-2.5 rounded-full transition-all ${k === idx ? 'w-8 bg-white' : 'w-2.5 bg-white/40'}`} data-testid={`pack-dot-${x.id}`} />
          ))}
        </div>
        <button type="button" className="wall-btn" onClick={() => go(idx + 1)} disabled={idx === total - 1} aria-label={L(P.next)} data-testid="pack-next">
          <Next size={20} />
        </button>
        <span className="mx-3 text-[0.85rem] text-white/60">
          {formatDate(minute, locale)} · {p(spec.customer.name)}
        </span>
        <button type="button" className="wall-btn" onClick={() => window.print()} aria-label={L(P.print)} title={L(P.print)} data-testid="pack-print">
          <Printer size={18} />
        </button>
      </div>
    </div>
  )
}
