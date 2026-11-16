import { useT } from '../../i18n'
import { formatTime } from '../../model/time'
import { useDemo, type Action } from '../../store'
import { S } from './strings'

const NEXT: Record<Action['status'], Action['status']> = { assigned: 'in-progress', 'in-progress': 'done', done: 'assigned' }
const TONE: Record<Action['status'], { bg: string; fg: string }> = {
  assigned: { bg: 'var(--surface-2)', fg: 'var(--brand-secondary)' },
  'in-progress': { bg: 'var(--status-watch-soft)', fg: '#8a6100' },
  done: { bg: 'var(--status-normal-soft)', fg: '#0a7a55' },
}

export function ActionsList() {
  const { p, locale } = useT()
  const actions = useDemo((s) => s.actions)
  const update = useDemo((s) => s.updateAction)
  const clockMs = useDemo((s) => s.clockMs)
  if (!actions.length)
    return (
      <p className="text-[0.88rem] text-muted" data-testid="actions-list">
        {p(S.noActions)}
      </p>
    )
  return (
    <div className="overflow-x-auto" data-testid="actions-list">
      <table className="w-full text-[0.86rem]">
        <thead>
          <tr className="border-b border-line text-[0.75rem] text-muted">
            <th className="py-2 text-start font-medium">{p(S.action)}</th>
            <th className="text-start font-medium">{p(S.owner)}</th>
            <th className="text-start font-medium">{p(S.due)}</th>
            <th className="text-start font-medium">{p(S.status)}</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => {
            const overdue = a.status !== 'done' && a.dueMs < clockMs
            return (
              <tr key={a.id} className="border-b border-line/60 align-top last:border-0" data-testid={`action-${a.id}`}>
                <td className="max-w-[28rem] py-2 pe-3 font-medium text-ink">{a.title}</td>
                <td className="py-2 pe-3 text-body">{a.owner}</td>
                <td className="num py-2 pe-3" style={{ color: overdue ? 'var(--status-critical)' : undefined }}>
                  {formatTime(a.dueMs, locale)}
                  {overdue && <span className="ms-1 text-[0.72rem] font-semibold">· {p(S.overdue)}</span>}
                </td>
                <td className="py-2">
                  <button type="button" className="chip cursor-pointer" style={{ background: TONE[a.status].bg, color: TONE[a.status].fg }} onClick={() => update(a.id, { status: NEXT[a.status] })} data-testid={`action-status-${a.id}`}>
                    {p(S[`status-${a.status}`])}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
