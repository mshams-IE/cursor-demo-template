import { ClipboardCheck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '../../i18n'
import { HOUR } from '../../model/time'
import { pick } from '../../pack'
import { useDemo } from '../../store'
import type { PlanOption } from '../../types'
import { S } from './strings'

const DUE = [1, 2, 4, 8, 12, 24, 48]

interface Row {
  option: PlanOption
  on: boolean
  owner: string
  due: number
}

export function AssignButton({ options, className = '' }: { options: PlanOption[]; className?: string }) {
  const { pack, p, locale } = useT()
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const owners = pack.spec.experts.map((e) => `${pick(e.name, locale)} · ${pick(e.role, locale)}`)
  const start = () => {
    setRows(options.map((option) => ({ option, on: true, owner: owners[0] ?? '', due: DUE.find((h) => h >= option.hours[1]) ?? DUE[DUE.length - 1] })))
    setOpen(true)
  }
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const patch = (i: number, r: Partial<Row>) => setRows((all) => all.map((x, k) => (k === i ? { ...x, ...r } : x)))
  const confirm = () => {
    const s = useDemo.getState()
    rows.filter((r) => r.on).forEach((r) => s.addAction({ title: p(r.option.title), owner: r.owner.trim() || '—', dueMs: s.clockMs + r.due * HOUR, status: 'assigned', optionId: r.option.id }))
    s.showToast(S.assigned)
    setOpen(false)
  }
  return (
    <>
      <button type="button" className={`btn btn-primary ${className}`} onClick={start} disabled={!options.length} data-testid="assign-actions">
        <ClipboardCheck size={16} /> {p(S.assign)}
      </button>
      {open && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-brand/30 p-4" role="dialog" aria-modal="true" aria-label={p(S.assign)} onClick={() => setOpen(false)}>
          <div className="card fade-up max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} data-testid="assign-dialog">
            <div className="flex items-start justify-between">
              <h2 className="text-[1.25rem] font-bold text-ink">{p(S.assign)}</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label={p(S.cancel)} className="text-muted hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <datalist id="assign-owners">
              {owners.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            <ul className="mt-4 space-y-3">
              {rows.map((r, i) => (
                <li key={r.option.id} className={`rounded-2xl border p-3 ${r.on ? 'border-line bg-white' : 'border-line bg-surface opacity-60'}`}>
                  <label className="flex items-start gap-2.5 font-semibold text-ink">
                    <input type="checkbox" className="mt-1 accent-[var(--brand-secondary)]" checked={r.on} onChange={(e) => patch(i, { on: e.target.checked })} />
                    {p(r.option.title)}
                  </label>
                  <div className="mt-2 grid gap-2 ps-6 sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <label className="text-[0.8rem] font-medium text-muted">
                      {p(S.owner)}
                      <input list="assign-owners" value={r.owner} onChange={(e) => patch(i, { owner: e.target.value })} placeholder={p(S.ownerPlaceholder)} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink" data-testid={`assign-owner-${r.option.id}`} />
                    </label>
                    <label className="text-[0.8rem] font-medium text-muted">
                      {p(S.due)}
                      <select value={r.due} onChange={(e) => patch(i, { due: Number(e.target.value) })} className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 text-[0.88rem] text-ink">
                        {DUE.map((h) => (
                          <option key={h} value={h}>
                            {locale === 'ar' ? `خلال ${h} ساعة` : `Within ${h} h`}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[0.78rem] leading-relaxed text-muted">{p(S.assignHint)}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                {p(S.cancel)}
              </button>
              <button type="button" className="btn btn-primary" onClick={confirm} disabled={!rows.some((r) => r.on)} data-testid="assign-confirm">
                {p(S.confirmAssign)}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
