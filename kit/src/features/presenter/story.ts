import { PAGES } from '../../app/pages'
import { sendToExpert } from '../../conversation'
import { pick, type Pack } from '../../pack'
import { toMs } from '../../model/time'
import { useDemo } from '../../store'
import type { Beat, DemoSpec, Locale, Text } from '../../types'
import { useArch } from '../architecture/store'
import { S } from './strings'

export interface PresenterStory {
  id: string
  title: Text
  beats: Beat[]
}

const key = (beats: Beat[]) => beats.map((b) => b.id).join('|')

/** The pack's stories, with the plain beat list first as "Default" unless a story already tells it. */
export function storiesOf(spec: DemoSpec): PresenterStory[] {
  const stories = (spec.presenter.stories ?? []).filter((s) => s.beats.length)
  const beats = spec.presenter.beats
  const told = stories.some((s) => key(s.beats) === key(beats))
  return [...(beats.length && !told ? [{ id: 'default', title: S.defaultStory, beats }] : []), ...stories]
}

/** Where a beat opens: its page, or the legacy view. */
export function beatPath(beat: Beat): string {
  if (beat.page) return PAGES.find((p) => p.id === beat.page)?.path ?? '/'
  if (beat.view === 'experts') return '/'
  return '/overview'
}

/** Rough reading time of the narration, so auto-advance gives the presenter time to say it. */
export function beatMs(beat: Beat): number {
  const words = beat.narration.en.split(/\s+/).length
  return Math.min(18_000, Math.max(8_000, words * 380 + (beat.ask ? 3_000 : 0)))
}

/**
 * Puts the app in the state a beat describes: page, mode, clock, selection, and the scripted question.
 * Report mode hides the experts pages, so it is switched on only after the page has changed (`goThenReport`).
 */
export function applyBeat(beat: Beat, pack: Pack, locale: Locale, go: (path: string) => void, goThenReport: (path: string) => void) {
  const st = useDemo.getState()
  const report = !beat.page && beat.view === 'report'
  if (!report) st.setMode('experts')
  if (beat.clock) {
    st.setClockPlaying(false)
    if (st.clockLive) st.setClockLive(false)
    st.setClock(toMs(beat.clock))
  }
  const path = beatPath(beat)
  st.selectRegion(beat.regionId)
  if (path === '/overview' && beat.spotlight && beat.siteId) {
    st.selectSite(undefined)
    st.commandMap('site', beat.siteId)
  } else st.selectSite(beat.siteId)
  if (report) {
    st.setReportFocus({ regionId: beat.regionId, siteId: beat.siteId })
    goThenReport(path)
    return
  }
  const ask = beat.ask
  if (ask && pack.spec.experts.some((e) => e.id === ask.expertId)) {
    st.openExpert(ask.expertId)
    go(`/experts/${ask.expertId}/chat`)
    const asked = (st.chats[ask.expertId] ?? []).some((t) => t.role === 'expert' && t.answerId === ask.answerId)
    if (!asked) void sendToExpert(pack, ask.expertId, pick(ask.question, locale))
    return
  }
  go(path)
  if (beat.page === 'architecture') useArch.getState().requestTrace('incident')
}
