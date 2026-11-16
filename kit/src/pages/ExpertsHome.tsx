import { MessageSquare, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isAvailable, matchesQuery } from '../features/experts/catalog'
import { ExpertAvatar } from '../features/experts/ExpertAvatar'
import { S } from '../features/experts/strings'
import { useT } from '../i18n'
import type { Expert } from '../types'

export function ExpertsHome() {
  const { pack, p } = useT()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const categories = (pack.spec.expertCategories ?? []).filter((c) => pack.spec.experts.some((e) => e.category === c.id))
  const list = useMemo(() => pack.spec.experts.filter((e) => (filter === 'all' || e.category === filter) && matchesQuery(pack, e, query.trim())), [pack, filter, query])
  const hasTeams = (pack.spec.specialists?.length ?? 0) > 0

  return (
    <div className="mx-auto max-w-[88rem] space-y-7 p-8" data-testid="experts-home">
      <div>
        <div className="eyebrow">{p(S.eyebrow)}</div>
        <h1 className="mt-1 text-[clamp(2rem,2.6vw,2.8rem)] font-semibold leading-tight tracking-tight text-ink">{p(S.title)}</h1>
        <p className="mt-2 max-w-[52rem] text-[1.05rem] text-muted">{p(hasTeams ? S.subtitle : S.subtitleSolo)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[20rem] flex-1 items-center gap-3 rounded-full border border-line bg-white px-5 py-3 shadow-sm focus-within:border-secondary">
          <Search size={20} className="text-muted" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={p(S.search)} aria-label={p(S.searchLabel)} className="w-full bg-transparent text-[1.05rem] !outline-none" data-testid="expert-search" />
        </label>
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={p(S.filterLabel)}>
            {[{ id: 'all', label: S.all }, ...categories].map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={filter === c.id}
                onClick={() => setFilter(c.id)}
                data-testid={`expert-filter-${c.id}`}
                className={`rounded-full border px-4 py-2 text-[0.95rem] font-semibold transition ${filter === c.id ? 'border-secondary bg-secondary text-white' : 'border-line bg-white text-ink hover:bg-surface-2'}`}
              >
                {p(c.label)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2" data-testid="expert-cards">
        {list.map((e) => (
          <ExpertCard key={e.id} expert={e} />
        ))}
        {list.length === 0 && (
          <p className="text-muted" data-testid="expert-empty">
            {p(S.empty)}
          </p>
        )}
      </div>
    </div>
  )
}

function ExpertCard({ expert: e }: { expert: Expert }) {
  const { pack, p } = useT()
  const navigate = useNavigate()
  const { search } = useLocation()
  const available = isAvailable(e)
  const org = pack.spec.org
  const open = () => available && navigate({ pathname: `/experts/${e.id}`, search })
  return (
    <article
      className={`card flex gap-5 p-5 transition ${available ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg' : 'opacity-75'}`}
      onClick={open}
      onKeyDown={(ev) => ev.key === 'Enter' && ev.target === ev.currentTarget && open()}
      role={available ? 'link' : undefined}
      tabIndex={available ? 0 : undefined}
      aria-label={`${p(e.role)} · ${p(e.name)}`}
      data-testid={`expert-card-${e.id}`}
      data-available={available}
    >
      <ExpertAvatar expert={e} size={112} rounded="card" muted={!available} />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-[1.25rem] font-semibold text-ink">{p(e.role)}</h2>
          <span className="flex items-center gap-1.5 text-[0.85rem] font-medium text-muted" data-testid={`expert-status-${e.id}`}>
            <span className={`h-2 w-2 rounded-full ${available ? 'bg-secondary' : 'bg-line'}`} aria-hidden />
            {available ? p(S.available) : p(S.availableOnRequest)}
          </span>
        </div>
        <div className="text-[0.85rem] text-muted">
          {p(e.name)}
          {org && <> · {p(org)}</>}
        </div>
        <p className="mt-2 text-[0.98rem] leading-relaxed text-body">{p(e.focus)}</p>
        <div className="mt-auto flex items-end justify-between gap-3 pt-4">
          <div className="flex flex-wrap gap-1.5">
            {(e.tags ?? []).slice(0, 4).map((s) => (
              <span key={s.en} className="chip bg-surface text-muted">
                {p(s)}
              </span>
            ))}
          </div>
          {available ? (
            <Link to={{ pathname: `/experts/${e.id}/chat`, search }} onClick={(ev) => ev.stopPropagation()} className="btn shrink-0 bg-secondary text-white hover:bg-secondary-bright" data-testid={`expert-chat-${e.id}`}>
              <MessageSquare size={17} aria-hidden />
              {p(S.chat)}
            </Link>
          ) : (
            <button type="button" className="btn btn-ghost shrink-0" disabled data-testid={`expert-chat-${e.id}`}>
              {p(S.onRequest)}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
