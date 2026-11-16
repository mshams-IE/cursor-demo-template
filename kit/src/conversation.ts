import { ask } from './engine'
import type { Pack } from './pack'
import { useDemo } from './store'

/**
 * The one entry point the chat UI calls. Pushes the user's turn and the expert's reply into the
 * store; the reply comes from the connected model when it is on and its figures check out,
 * otherwise from the local engine.
 */
export async function sendToExpert(pack: Pack, expertId: string, question: string): Promise<void> {
  const st = useDemo.getState()
  st.pushTurn(expertId, { role: 'user', text: question })
  const reply = ask(pack, expertId, question)
  if (reply.kind === 'answer') st.pushTurn(expertId, { role: 'expert', kind: 'answer', answerId: reply.answer.id })
  else if (reply.kind === 'refusal') st.pushTurn(expertId, { role: 'expert', kind: 'refusal' })
  else st.pushTurn(expertId, { role: 'expert', kind: 'fallback', suggestions: reply.suggestions.map((a) => a.id) })
}
