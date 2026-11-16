import { sendToExpert } from '../conversation'
import { ChatThread, Composer, useSend } from '../features/experts/chat'
import type { Pack } from '../pack'
import { ExpertsHome } from '../pages/ExpertsHome'
import type { Expert } from '../types'

/** @deprecated Use `sendToExpert` from the conversation module. */
export function sendQuestion(pack: Pack, expertId: string, question: string) {
  return sendToExpert(pack, expertId, question)
}

/** A self-contained chat with one expert. */
export function ExpertChat({ expert }: { expert: Expert }) {
  const send = useSend(expert.id)
  const onSend = (q: string) => void send(q)
  return (
    <section className="card flex h-[38rem] flex-col overflow-hidden" data-testid="expert-chat">
      <ChatThread expert={expert} onSend={onSend} />
      <Composer expert={expert} onSend={onSend} />
    </section>
  )
}

/** @deprecated The experts home page replaces this view. */
export function ExpertsView() {
  return <ExpertsHome />
}
