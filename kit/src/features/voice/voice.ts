import type { Locale } from '../../types'

interface RecognitionResultEvent {
  resultIndex: number
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>
}
interface Recognition {
  lang: string
  interimResults: boolean
  continuous: boolean
  onresult: ((e: RecognitionResultEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

const LANG: Record<Locale, string> = { en: 'en-GB', ar: 'ar-SA' }

function recognitionCtor(): RecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => !!recognitionCtor()
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Starts dictation; returns a stop function. `onText` receives interim and final transcripts. */
export function listen(locale: Locale, onText: (text: string, final: boolean) => void, onEnd: (error?: string) => void): () => void {
  const Ctor = recognitionCtor()
  if (!Ctor) {
    onEnd('unsupported')
    return () => {}
  }
  const r = new Ctor()
  r.lang = LANG[locale]
  r.interimResults = true
  r.continuous = false
  let finalText = ''
  r.onresult = (e) => {
    let interim = ''
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i]
      if (res.isFinal) finalText += res[0].transcript
      else interim += res[0].transcript
    }
    onText((finalText + interim).trim(), !interim && !!finalText)
  }
  let error: string | undefined
  r.onerror = (e) => (error = e.error)
  r.onend = () => onEnd(error)
  try {
    r.start()
  } catch {
    onEnd('failed')
  }
  return () => r.stop()
}

function voiceFor(locale: Locale) {
  const voices = window.speechSynthesis.getVoices()
  const want = LANG[locale].toLowerCase()
  return voices.find((v) => v.lang.toLowerCase().replace('_', '-') === want) ?? voices.find((v) => v.lang.toLowerCase().startsWith(locale))
}

/** Speaks text in the given locale; resolves when finished or cancelled. */
export function speak(text: string, locale: Locale): Promise<void> {
  if (!canSpeak()) return Promise.resolve()
  const synth = window.speechSynthesis
  synth.cancel()
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text)
    u.lang = LANG[locale]
    const v = voiceFor(locale)
    if (v) u.voice = v
    u.rate = locale === 'ar' ? 0.95 : 1
    u.onend = () => resolve()
    u.onerror = () => resolve()
    synth.speak(u)
  })
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel()
}
