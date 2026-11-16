import { ChevronRight, X } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { ReportView } from '../../components/ReportView'
import { Card, Segmented } from '../../components/ui'
import { useT } from '../../i18n'
import { fmtNumber } from '../../pack'
import { formatShortDate, formatTime, DAY } from '../../model/time'
import { useDemo, type ReportDay, type ReportFocus } from '../../store'
import type { Text } from '../../types'
import { countBy, inDay, slice, useReportData, type ReportRow } from './data'
import { ReportGroups, ReportMap } from './ReportMap'
import { S } from './strings'

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

function useWords() {
  const { pack, p, t, locale } = useT()
  const v = pack.spec.vocabulary
  const en = locale === 'en'
  const word = (text: string) => (en ? lower(text) : text)
  const report = pack.spec.report
  return {
    label: word(p(report?.label)),
    plural: p(report?.plural),
    pluralLower: word(p(report?.plural)),
    site: word(t('site')),
    sites: p(v?.entityPlural) || t('sites'),
    sitesLower: word(p(v?.entityPlural) || t('sites')),
    region: word(t('region')),
    regions: p(v?.groupPlural) || (en ? 'Regions' : 'المناطق'),
    regionsLower: word(p(v?.groupPlural) || (en ? 'Regions' : 'المناطق')),
  }
}

function fill(text: string, vars: Record<string, string | number>) {
  return text.replace(/\{(\w+)\}/g, (w, k: string) => (k in vars ? String(vars[k]) : w))
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const { t } = useT()
  return (
    <div>
      <div className="eyebrow mb-1">{t('report')}</div>
      <h1 className="text-[clamp(1.9rem,2.3vw,2.5rem)] font-semibold leading-tight tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-[1rem] text-muted" data-testid="report-basis">
        {subtitle}
      </p>
    </div>
  )
}

function SliceBar() {
  const { pack, p, t, locale } = useT()
  const focus = useDemo((s) => s.reportFocus)
  const setFocus = useDemo((s) => s.setReportFocus)
  const day = useDemo((s) => s.reportDay)
  const setDay = useDemo((s) => s.setReportDay)
  const crumbs: { label: string; f: ReportFocus }[] = [{ label: t('allRegions'), f: { category: focus.category } }]
  if (focus.regionId) crumbs.push({ label: pack.regionName(focus.regionId, locale), f: { regionId: focus.regionId, category: focus.category } })
  if (focus.siteId) crumbs.push({ label: p(pack.site(focus.siteId)?.name), f: focus })
  const category = pack.spec.report?.categories?.find((c) => c.id === focus.category)
  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-2.5" data-testid="report-slice">
      <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-[0.9rem]" aria-label={p(S.slice)}>
        {crumbs.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1">
            {i > 0 && <ChevronRight size={14} className="text-muted rtl:rotate-180" aria-hidden />}
            <button type="button" onClick={() => setFocus(c.f)} className={i === crumbs.length - 1 ? 'font-semibold text-ink' : 'text-secondary hover:underline'} data-testid="report-crumb">
              {c.label}
            </button>
          </span>
        ))}
        {category && (
          <span className="chip ms-2 bg-[#ecebfa] text-brand" data-testid="report-category-chip">
            {p(category.label)}
            <button type="button" onClick={() => setFocus({ ...focus, category: undefined })} aria-label={p(S.clearCategory)} className="hover:text-secondary">
              <X size={13} />
            </button>
          </span>
        )}
      </nav>
      <Segmented<ReportDay>
        ariaLabel={p(S.daysShown)}
        value={day}
        onChange={setDay}
        options={[
          { value: 'both', label: p(S.both) },
          { value: 'yesterday', label: p(S.yesterday) },
          { value: 'today', label: p(S.today) },
        ]}
        testid="report-day"
      />
    </div>
  )
}

function Tile({ testid, value, of, label, note, onClick, active }: { testid: string; value: number; of?: number; label: string; note?: string; onClick?: () => void; active?: boolean }) {
  const { p, locale } = useT()
  const body = (
    <>
      <div className="flex items-baseline gap-1.5">
        <span className="num text-[2.1rem] font-semibold tracking-tight text-ink">{fmtNumber(value, locale)}</span>
        {of !== undefined && (
          <span className="text-[0.95rem] text-muted">
            {p(S.of)} <span className="num font-semibold text-body">{fmtNumber(of, locale)}</span>
          </span>
        )}
      </div>
      <div className="text-[0.95rem] font-medium leading-tight text-ink">{label}</div>
      {note && <div className="mt-0.5 text-[0.78rem] text-muted">{note}</div>}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={`card px-5 py-4 text-start transition-shadow hover:shadow-lg ${active ? 'ring-2 ring-secondary' : ''}`} data-testid={testid}>
      {body}
    </button>
  ) : (
    <div className="card px-5 py-4" data-testid={testid}>
      {body}
    </div>
  )
}

function SummaryTable({ rows, days }: { rows: ReportRow[]; days: ReportDay }) {
  const { pack, p, t, locale } = useT()
  const w = useWords()
  const focus = useDemo((s) => s.reportFocus)
  const setFocus = useDemo((s) => s.setReportFocus)
  const cols: ('yesterday' | 'today')[] = days === 'both' ? ['yesterday', 'today'] : [days]
  const tally = (list: ReportRow[], d: 'yesterday' | 'today') => {
    const x = list.filter((r) => r.day === d)
    return { n: x.length, sites: new Set(x.map((r) => r.siteId)).size }
  }
  const groups = pack.spec.regions
    .filter((r) => !focus.regionId || r.id === focus.regionId)
    .map((r) => {
      const list = rows.filter((x) => x.regionId === r.id)
      const sites = pack.spec.sites.filter((s) => s.regionId === r.id && list.some((x) => x.siteId === s.id))
      return { r, list, sites }
    })
    .filter((g) => g.list.length)
  const cells = (list: ReportRow[], strong?: boolean) =>
    cols.map((d) => {
      const t = tally(list, d)
      return (
        <Fragment key={d}>
          <td className={`num border-s border-line px-2 py-1.5 text-end ${strong ? 'font-semibold' : ''}`}>{fmtNumber(t.n, locale)}</td>
          <td className={`num px-2 py-1.5 text-end ${strong ? 'font-semibold' : ''}`}>{fmtNumber(t.sites, locale)}</td>
        </Fragment>
      )
    })
  const span = cols.length * 2 + 1
  return (
    <div className="scroll-thin h-full overflow-auto" data-testid="report-summary" data-days={days}>
      <table className="w-full border-collapse text-[0.84rem]">
        <thead className="sticky top-0 bg-white text-[0.74rem] text-muted">
          <tr>
            <th rowSpan={2} className="px-2 py-1.5 text-start font-medium">
              {`${t('region')} / ${t('site')}`}
            </th>
            {cols.map((d) => (
              <th key={d} colSpan={2} className="border-s border-line px-2 pt-1.5 text-center font-semibold text-ink">
                {p(d === 'today' ? S.today : S.yesterday)}
              </th>
            ))}
          </tr>
          <tr className="border-b border-line">
            {cols.map((d) => (
              <Fragment key={d}>
                <th className="border-s border-line px-2 py-1.5 text-end font-medium">{w.plural}</th>
                <th className="px-2 py-1.5 text-end font-medium">{w.sites}</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(({ r, list, sites }) => (
            <Fragment key={r.id}>
              <tr className={`cursor-pointer border-t border-line hover:bg-[#ecebfa] ${focus.regionId === r.id && !focus.siteId ? 'bg-[#ecebfa]' : 'bg-surface'}`} onClick={() => setFocus({ regionId: r.id, category: focus.category })} data-testid={`report-region-${r.id}`}>
                <td className="px-2 py-1.5 font-semibold text-ink">{p(r.name)}</td>
                {cells(list, true)}
              </tr>
              {sites.map((s) => (
                <tr
                  key={s.id}
                  className={`cursor-pointer border-t border-line/60 hover:bg-[#ecebfa]/60 ${focus.siteId === s.id ? 'bg-[#ecebfa] font-semibold' : ''}`}
                  onClick={() => setFocus({ regionId: r.id, siteId: s.id, category: focus.category })}
                  data-testid={`report-site-${s.id}`}
                >
                  <td className="px-2 py-1.5 ps-5">{p(s.name)}</td>
                  {cells(list.filter((x) => x.siteId === s.id))}
                </tr>
              ))}
            </Fragment>
          ))}
          {!groups.length && (
            <tr>
              <td colSpan={span} className="px-2 py-6 text-center text-muted">
                {p(S.none)}
              </td>
            </tr>
          )}
          <tr className="border-t-2 border-brand/30 font-semibold" data-testid="report-total">
            <td className="px-2 py-2">{p(S.total)}</td>
            {cells(rows, true)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function RecordsTable({ rows, total, days }: { rows: ReportRow[]; total: number; days: ReportDay }) {
  const { pack, p, t, locale } = useT()
  const categories = new Map((pack.spec.report?.categories ?? []).map((c) => [c.id, c.label]))
  const setFocus = useDemo((s) => s.setReportFocus)
  const focus = useDemo((s) => s.reportFocus)
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="report-table" data-days={days}>
      <div className="mb-2 text-[0.82rem] text-muted" data-testid="report-count">
        {fill(p(S.shown), { n: fmtNumber(rows.length, locale), total: fmtNumber(total, locale) })}
      </div>
      <div className="scroll-thin min-h-0 flex-1 overflow-auto">
        <table className="w-full text-[0.84rem]">
          <thead className="sticky top-0 bg-white text-[0.74rem] text-muted">
            <tr className="border-b border-line">
              <th className="px-2 py-1.5 text-start font-medium">{p(S.time)}</th>
              <th className="px-2 py-1.5 text-start font-medium">{t('site')}</th>
              <th className="px-2 py-1.5 text-start font-medium">{t('region')}</th>
              {categories.size > 0 && <th className="px-2 py-1.5 text-start font-medium">{p(S.category)}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line/60 hover:bg-surface" data-testid="report-record">
                <td className="num whitespace-nowrap px-2 py-1.5 text-start">
                  {days === 'both' && <span className="me-1.5 text-[0.72rem] text-muted">{p(r.day === 'today' ? S.today : S.yesterday)}</span>}
                  {formatTime(r.at, locale)}
                </td>
                <td className="px-2 py-1.5">
                  <button type="button" className="text-start font-medium text-ink hover:text-secondary" onClick={() => setFocus({ ...focus, regionId: r.regionId, siteId: r.siteId })}>
                    {p(pack.site(r.siteId)?.name)}
                  </button>
                </td>
                <td className="px-2 py-1.5 text-body">{pack.regionName(r.regionId, locale)}</td>
                {categories.size > 0 && (
                  <td className="px-2 py-1.5">
                    {r.category ? (
                      <button type="button" className="chip bg-surface text-body hover:bg-[#ecebfa]" onClick={() => setFocus({ ...focus, category: r.category })}>
                        {p(categories.get(r.category)) || r.category}
                      </button>
                    ) : (
                      <span className="text-muted">{p(S.uncategorised)}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && <p className="py-6 text-center text-muted">{p(S.none)}</p>}
      </div>
    </div>
  )
}

/** Counts-only view of the pack's report records: yesterday and today, by region, site and category. No diagnosis, causes or experts. */
export function ReportOverview() {
  const { pack, p, t, locale } = useT()
  const data = useReportData(pack)
  const focus = useDemo((s) => s.reportFocus)
  const day = useDemo((s) => s.reportDay)
  const setFocus = useDemo((s) => s.setReportFocus)
  const w = useWords()

  const view = useMemo(() => {
    if (!data) return undefined
    const all = data.rows
    const inFocus = slice(all, focus)
    const spanned = inFocus.filter(inDay(day))
    const forCategories = slice(all, focus, 'category').filter(inDay(day))
    const forMap = slice(slice(all, focus, 'regionId'), focus, 'siteId').filter(inDay(day))
    return { all, inFocus, spanned, forCategories, forMap }
  }, [data, focus, day])

  if (!data || !view) {
    return (
      <div className="space-y-5 p-6" data-testid="report-overview">
        <PageHeader title={t('report')} subtitle={p(pack.spec.subtitle)} />
        <ReportView />
      </div>
    )
  }

  const { report, dayStart, clockMs } = data
  const time = formatTime(clockMs, locale)
  const yesterdayDate = formatShortDate(dayStart - DAY, locale)
  const todayDate = formatShortDate(dayStart, locale)
  const spanText = p(day === 'today' ? S.spanToday : day === 'yesterday' ? S.spanYesterday : S.spanBoth)
  const scopeSites = pack.spec.sites.filter((s) => (!focus.regionId || s.regionId === focus.regionId) && (!focus.siteId || s.id === focus.siteId))
  const scopeRegions = focus.regionId ? 1 : pack.spec.regions.length
  const todayN = view.inFocus.filter((r) => r.day === 'today').length
  const yesterdayN = view.inFocus.filter((r) => r.day === 'yesterday').length
  const sitesHit = new Set(view.spanned.map((r) => r.siteId)).size
  const regionsHit = new Set(view.spanned.map((r) => r.regionId)).size
  const byCategory = countBy(view.forCategories, (r) => r.category)
  const categories: { id: string; label: Text }[] = report.categories ?? []
  const vars = { label: w.label, plural: w.plural, pluralLower: w.pluralLower, site: w.site, sites: w.sites, region: w.region, regions: w.regions, span: spanText, time, yesterday: yesterdayDate, date: todayDate }

  return (
    <div className="space-y-5 p-6" data-testid="report-overview" data-view="report">
      <PageHeader title={fill(p(S.title), vars)} subtitle={fill(p(S.basis), { ...vars, region: w.region, site: w.site })} />
      <SliceBar />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" data-testid="report-tiles">
        <Tile testid="report-tile-today" value={todayN} label={fill(p(S.countToday), vars)} note={fill(p(S.toTime), { date: todayDate, time })} />
        <Tile testid="report-tile-yesterday" value={yesterdayN} label={fill(p(S.countYesterday), vars)} note={yesterdayDate} />
        <Tile testid="report-tile-sites" value={sitesHit} of={scopeSites.length} label={fill(p(S.sitesWith), { sites: w.sites, span: spanText })} />
        <Tile testid="report-tile-regions" value={regionsHit} of={scopeRegions} label={fill(p(S.regionsWith), { regions: w.regions, span: spanText })} />
      </div>
      {categories.length > 0 && (
        <section data-testid="report-categories">
          <div className="eyebrow mb-2">{fill(p(S.byCategory), vars)}</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            {categories.map((c) => {
              const n = byCategory.get(c.id) ?? 0
              const on = focus.category === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFocus({ ...focus, category: on ? undefined : c.id })}
                  aria-pressed={on}
                  className={`card px-4 py-3 text-start transition-shadow hover:shadow-lg ${on ? 'ring-2 ring-secondary' : ''} ${focus.category && !on ? 'opacity-60' : ''}`}
                  data-testid={`report-tile-${c.id}`}
                >
                  <div className="flex items-baseline gap-1">
                    <span className="num text-[1.5rem] font-semibold text-ink">{fmtNumber(n, locale)}</span>
                    <span className="text-[0.78rem] text-muted">
                      {p(S.of)} <span className="num">{fmtNumber(view.forCategories.length, locale)}</span>
                    </span>
                  </div>
                  <div className="truncate text-[0.84rem] font-medium text-ink">{p(c.label)}</div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full bg-secondary/70" style={{ width: `${view.forCategories.length ? (n / view.forCategories.length) * 100 : 0}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}
      <div className={`card overflow-hidden !rounded-[20px] ${pack.boundaries ? 'h-[26rem] xl:h-[30rem]' : ''}`}>
        {pack.boundaries ? (
          <ReportMap
            rows={view.forMap}
            listTitle={focus.regionId ? fill(p(S.sitesIn), { sites: w.sites }) : fill(p(S.mapTitle), { plural: w.plural, region: w.region })}
            legend={fill(p(S.mapLegend), { plural: w.pluralLower, span: spanText, region: w.region, site: w.site })}
          />
        ) : (
          <ReportGroups rows={view.forMap} />
        )}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card title={fill(p(S.summaryTitle), { region: w.region, site: w.site })} className="flex min-h-0 flex-col xl:h-[40rem]">
          <SummaryTable rows={view.spanned} days={day} />
        </Card>
        <Card title={`${p(S.recordsTitle)} · ${w.plural}`} className="flex min-h-0 flex-col xl:h-[40rem]">
          <RecordsTable rows={view.spanned} total={view.all.filter(inDay(day)).length} days={day} />
        </Card>
      </div>
    </div>
  )
}
