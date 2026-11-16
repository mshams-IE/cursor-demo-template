import { Cpu, Sparkles } from 'lucide-react'
import { useT } from '../../i18n'
import { useDemo } from '../../store'
import { S } from './strings'

/** Whether answers come from the connected model or the local engine. */
export function ModelPill({ compact }: { compact?: boolean }) {
  const { p } = useT()
  const mode = useDemo((s) => s.expertMode)
  const model = mode.kind === 'model'
  return (
    <span className={`inline-flex items-center gap-1 shrink-0 rounded-full font-semibold ${compact ? 'px-1.5 py-px text-[0.66rem]' : 'px-2.5 py-1 text-[0.72rem]'} ${model ? 'bg-secondary/10 text-secondary' : 'bg-surface-2 text-muted'}`} data-testid="model-pill" data-mode={mode.kind} dir="ltr">
      {model ? <Sparkles size={12} aria-hidden /> : <Cpu size={12} aria-hidden />}
      {model ? `OpenAI · ${mode.model ?? ''}`.replace(/ · $/, '') : p(S.localEngine)}
    </span>
  )
}
