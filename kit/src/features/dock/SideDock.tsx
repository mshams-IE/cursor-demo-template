import { MessageSquare, Network, X } from 'lucide-react'
import { useState } from 'react'
import { AgentExpanded, TeamDock } from '../agents/AgentPanel'
import { A } from '../agents/strings'
import { teamOf, currentExpert } from '../experts/catalog'
import { ExpertPanel } from '../experts/ExpertPanel'
import { S } from '../experts/strings'
import { useT } from '../../i18n'
import { useDemo } from '../../store'

/** The expert and their specialist team beside the investigation pages; a sheet on small screens. */
export function SideDock() {
  const { pack, p, rtl } = useT()
  const report = useDemo((s) => s.mode === 'report')
  const expert = currentExpert(pack.spec, useDemo((s) => s.expertId))
  const [sheet, setSheet] = useState<'none' | 'expert' | 'team'>('none')
  const hasTeam = !report && teamOf(pack.spec, expert).length > 0
  return (
    <>
      <aside className="no-print hidden w-[25vw] min-w-[24rem] max-w-[34rem] shrink-0 flex-col border-s border-line bg-white xl:flex" aria-label={p(S.expert)} data-testid="side-dock">
        {hasTeam && <TeamDock />}
        <ExpertPanel />
      </aside>
      <div className="no-print fixed bottom-20 end-4 z-40 flex flex-col gap-2 lg:bottom-6 xl:hidden">
        {hasTeam && (
          <button type="button" className="btn btn-ghost bg-white shadow-lg" onClick={() => setSheet('team')} data-testid="open-team-mobile">
            <Network size={18} aria-hidden /> {p(A.team)}
          </button>
        )}
        <button type="button" className="btn btn-primary shadow-lg" onClick={() => setSheet('expert')} data-testid="open-expert-mobile">
          <MessageSquare size={18} aria-hidden /> {p(expert?.name)}
        </button>
      </div>
      {sheet !== 'none' && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-white xl:hidden" dir={rtl ? 'rtl' : 'ltr'} role="dialog" aria-modal="true" data-testid="dock-sheet">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            {hasTeam ? (
              <div className="seg">
                <button type="button" aria-pressed={sheet === 'expert'} onClick={() => setSheet('expert')}>
                  {p(expert?.name)}
                </button>
                <button type="button" aria-pressed={sheet === 'team'} onClick={() => setSheet('team')}>
                  {p(A.team)}
                </button>
              </div>
            ) : (
              <span className="font-semibold text-ink">{p(expert?.name)}</span>
            )}
            <button type="button" className="btn btn-ghost" onClick={() => setSheet('none')} data-testid="close-dock-sheet">
              <X size={16} aria-hidden /> {p(S.close)}
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{sheet === 'team' && hasTeam ? <TeamDock fill /> : <ExpertPanel />}</div>
        </div>
      )}
      <AgentExpanded />
    </>
  )
}
