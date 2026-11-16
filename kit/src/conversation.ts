import { useEffect, useState } from 'react'
import { answerLocal, parseQuestion, type LocalReply } from './engine/local'
import { probeStatus, runModel, type ModelStatus } from './engine/model'
import { isArabic } from './engine/nlu'
import { route } from './engine/routing'
import { pickTeam } from './engine/team'
import type { EngineContext } from './engine/words'
import { pick, render, type Pack } from './pack'
import { useDemo, type ChatTurn } from './store'
import type { Expert, Locale, Text } from './types'

export type { ModelStatus } from './engine/model'
export type { EngineContext, Generated } from './engine/words'
export { answerLocal, type LocalReply } from './engine/local'

/** Workspace state the engine answers against. */
export function engineContext(): EngineContext {
  const s = useDemo.getState()
  return { clockMs: s.clockMs, mode: s.mode, budget: s.budget, windowHours: s.windowHours, scenario: s.scenario, regionId: s.regionId, siteId: s.siteId, incidentId: s.incidentId }
}

function reducedMotion(): boolean {
  if (typeof document === 'undefined') return true
  return document.documentElement.dataset.reducedMotion === 'true' || useDemo.getState().reducedMotion
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/** Time the team strip animates before a local answer appears. */
export const paceMs = (team: number) => (reducedMotion() ? 0 : Math.min(2400, 600 + 350 * team))

const handoffNote = (e: Expert): Text => ({ en: `Handed to ${e.name.en} · ${e.role.en}`, ar: `أُحيل إلى ${e.name.ar ?? e.name.en} · ${e.role.ar ?? e.role.en}` })

const UNVERIFIED: Text = {
  en: "The model's figures did not all match the data, so this answer comes from the local engine.",
  ar: 'لم تطابق كل أرقام النموذج البيانات، لذا تأتي هذه الإجابة من المحرك المحلي.',
}
const UNAVAILABLE: Text = { en: 'The model did not answer in time, so this answer comes from the local engine.', ar: 'لم يُجب النموذج في الوقت المحدد، لذا تأتي هذه الإجابة من المحرك المحلي.' }

function localTurn(reply: LocalReply): Partial<ChatTurn> {
  switch (reply.kind) {
    case 'answer':
      return { kind: 'answer', answerId: reply.answerId, suggestions: undefined }
    case 'generated': {
      const { lead, points, sources } = reply.generated
      return { kind: 'answer', generated: { lead, points, sources }, visual: reply.generated.visual, suggestions: reply.suggestions }
    }
    case 'refusal':
      return { kind: 'refusal' }
    default:
      return { kind: 'fallback', suggestions: reply.suggestions }
  }
}

/** Earlier questions and answers in a thread, as plain text for the model. */
function threadHistory(pack: Pack, expert: Expert, turns: ChatTurn[], locale: Locale) {
  const out: { question: string; answer: string }[] = []
  for (let i = 0; i < turns.length - 1; i++) {
    const u = turns[i]
    const a = turns[i + 1]
    if (u.role !== 'user' || a.role !== 'expert' || a.pending || !u.text) continue
    const scripted = a.answerId ? expert.answers.find((x) => x.id === a.answerId) : undefined
    const answer = a.modelText ?? (a.generated ? [a.generated.lead, ...a.generated.points].join(' ') : scripted ? render(pack, pick(scripted.lead, locale), locale) : '')
    if (answer) out.push({ question: u.text, answer })
  }
  return out
}

/**
 * The one entry point the chat UI calls. Pushes the user's turn, hands the question to a better
 * placed expert when another one owns it (a note turn in both threads), then fills a pending expert
 * turn: from the connected model when it is on and its figures check out, otherwise from the local
 * engine. Resolves with the expert who answered, so the UI can follow a handoff.
 */
export async function sendToExpert(pack: Pack, expertId: string, question: string): Promise<{ expertId: string }> {
  const st = useDemo.getState()
  const ctx = engineContext()
  st.pushTurn(expertId, { role: 'user', text: question })
  let target = expertId
  if (st.mode !== 'report') {
    const r = route(pack, expertId, question, parseQuestion(pack, question, ctx), answerLocal(pack, expertId, question, ctx).kind === 'generated')
    const to = pack.spec.experts.find((e) => e.id === r.expertId)
    if (to && to.id !== expertId) {
      target = to.id
      const note = handoffNote(to)
      st.pushTurn(expertId, { role: 'note', note, handoffTo: target })
      st.pushTurn(target, { role: 'note', note, handoffTo: target })
      st.pushTurn(target, { role: 'user', text: question })
    }
  }
  const expert = pack.spec.experts.find((e) => e.id === target) ?? pack.spec.experts[0]
  const local = answerLocal(pack, target, question, ctx)
  const team = local.kind === 'answer' || local.kind === 'generated' ? pickTeam(pack, expert, local.intent) : []
  st.setBusyExpert(target)
  const id = st.pushTurn(target, { role: 'expert', pending: true, team })
  try {
    const mode = useDemo.getState().expertMode
    if (mode.kind === 'model' && local.kind !== 'refusal') {
      const locale: Locale = isArabic(question) ? 'ar' : /[a-z]/i.test(question) ? 'en' : st.locale
      const tools: string[] = []
      try {
        const run = await runModel({
          pack,
          expert,
          question,
          ctx,
          locale,
          history: threadHistory(pack, expert, useDemo.getState().chats[target] ?? [], locale),
          onText: (text) => useDemo.getState().updateTurn(target, id, { stream: { text, tools: [...tools] } }),
          onTool: (name) => {
            tools.push(name)
            useDemo.getState().updateTurn(target, id, { stream: { text: '', tools: [...tools] } })
          },
        })
        if (run.verified) {
          useDemo.getState().updateTurn(target, id, { kind: 'model', modelText: run.text, tools: run.tools, stream: undefined, pending: false })
          return { expertId: target }
        }
        useDemo.getState().updateTurn(target, id, { stream: undefined })
        useDemo.getState().pushTurn(target, { role: 'note', note: UNVERIFIED })
      } catch {
        useDemo.getState().updateTurn(target, id, { stream: undefined })
        useDemo.getState().pushTurn(target, { role: 'note', note: UNAVAILABLE })
      }
      const fresh = useDemo.getState()
      fresh.updateTurn(target, id, { pending: false, ...localTurn(local), tools: tools.length ? tools : undefined })
      return { expertId: target }
    }
    const ms = paceMs(team.length)
    if (ms) await wait(ms)
    useDemo.getState().updateTurn(target, id, { pending: false, ...localTurn(local) })
    return { expertId: target }
  } finally {
    useDemo.getState().setBusyExpert(undefined)
  }
}

let status: ModelStatus | undefined
let probing: Promise<ModelStatus> | undefined
let chosen = false

/** Whether a model is connected, probed once per page; undefined while the probe runs. Turns model mode on the first time it is found. */
export function useModelStatus(): ModelStatus | undefined {
  const [s, set] = useState(status)
  useEffect(() => {
    let live = true
    probing ??= probeStatus().then((v) => {
      status = v
      if (v.enabled && !chosen) useDemo.getState().setExpertMode({ kind: 'model', model: v.model })
      return v
    })
    probing.then((v) => live && set(v))
    return () => {
      live = false
    }
  }, [])
  return s
}

/** Switches answers between the connected model and the local engine; stays local when no model is connected. */
export function setModelEnabled(on: boolean): void {
  chosen = true
  useDemo.getState().setExpertMode(on && status?.enabled ? { kind: 'model', model: status.model } : { kind: 'local' })
}
