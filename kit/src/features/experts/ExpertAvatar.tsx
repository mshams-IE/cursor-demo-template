import { useT } from '../../i18n'
import type { Expert } from '../../types'
import { initials, portraitUrl } from './catalog'

export function ExpertAvatar({ expert, size = 32, online, rounded = 'full', muted }: { expert?: Expert; size?: number; online?: boolean; rounded?: 'full' | 'card'; muted?: boolean }) {
  const { p } = useT()
  const src = portraitUrl(expert?.portrait)
  const shape = rounded === 'full' ? 'rounded-full' : 'rounded-2xl'
  return (
    <span className="relative inline-block shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className={`h-full w-full object-cover ${shape} ${rounded === 'full' ? 'ring-2 ring-white' : ''} ${muted ? 'grayscale-[40%]' : ''}`} />
      ) : (
        <span className={`flex h-full w-full items-center justify-center font-bold text-white ${shape} ${muted ? 'opacity-70' : ''}`} style={{ background: 'linear-gradient(135deg, var(--brand-secondary), var(--brand-primary))', fontSize: size * 0.36 }} aria-hidden>
          {initials(p(expert?.name))}
        </span>
      )}
      {online && <span className="absolute bottom-[4%] end-[4%] h-[26%] w-[26%] rounded-full bg-ok ring-2 ring-white" data-testid="expert-online" />}
    </span>
  )
}
