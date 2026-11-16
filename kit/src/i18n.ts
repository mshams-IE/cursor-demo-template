import { createContext, useContext, useMemo } from 'react'
import { pick, render, type Pack } from './pack'
import { useDemo } from './store'
import { UI, vocabularyTerms, type UiKey } from './terms'
import type { Severity, Text } from './types'

export { vocabularyTerms, type UiKey } from './terms'

export const PackContext = createContext<Pack | null>(null)

export function usePack(): Pack {
  const p = useContext(PackContext)
  if (!p) throw new Error('usePack must be used inside <DemoApp>')
  return p
}

export function useT() {
  const pack = usePack()
  const locale = useDemo((s) => s.locale)
  const terms = useMemo(() => (pack.spec.vocabulary ? vocabularyTerms(pack.spec.vocabulary) : {}), [pack.spec.vocabulary])
  return {
    pack,
    locale,
    rtl: locale === 'ar',
    t: (k: UiKey) => pick(terms[k] ?? UI[k], locale),
    p: (text: Text | undefined) => pick(text, locale),
    r: (text: Text | undefined) => render(pack, pick(text, locale), locale),
    sev: (s: Severity) => pick(UI[s], locale),
  }
}
