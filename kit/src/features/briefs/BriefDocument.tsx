import clouderaLogo from '../../../assets/cloudera-logo.png'
import { useT } from '../../i18n'
import type { BriefDoc } from './briefDoc'
import { B } from './strings'

export function useBriefLogos() {
  const { pack, p } = useT()
  const { customer, brand } = pack.spec
  return [{ src: clouderaLogo, alt: 'Cloudera' }, ...(brand.coBrand && customer.logo ? [{ src: customer.logo, alt: p(customer.name) }] : [])]
}

/** A brief laid out as a printable memo. */
export function BriefDocument({ doc }: { doc: BriefDoc }) {
  const { p } = useT()
  const logos = useBriefLogos()
  return (
    <article className="brief-sheet overflow-hidden rounded-[var(--radius-card)] border border-line bg-white shadow-sm" data-testid="brief-preview">
      <div className="h-1.5 bg-[linear-gradient(90deg,var(--brand-primary),var(--brand-secondary)_60%,var(--brand-accent))]" />
      <div className="px-10 py-8">
        <div className="mb-6 flex items-center gap-4">
          {logos.map((l) => (
            <img key={l.src} src={l.src} alt={l.alt} className="h-[1.3rem] w-auto" />
          ))}
        </div>
        <div className="eyebrow !text-secondary">{p(B.executiveBrief)}</div>
        <h2 className="mt-1 text-[1.65rem] font-bold leading-tight text-ink" data-testid="brief-title">
          {doc.title}
        </h2>
        {doc.meta && <div className="mt-1 border-b border-line pb-4 text-[0.84rem] text-muted">{doc.meta}</div>}
        {doc.sections.map((s, i) => (
          <section key={i} className="mt-5">
            {s.heading && <h3 className="eyebrow !text-secondary">{s.heading}</h3>}
            {s.list ? (
              <ul className="mt-1.5 list-disc space-y-1 ps-5 text-[0.95rem] leading-relaxed text-body">
                {s.lines.map((l, k) => (
                  <li key={k}>{l}</li>
                ))}
              </ul>
            ) : (
              s.lines.map((l, k) => (
                <p key={k} className="mt-1.5 text-[0.95rem] leading-relaxed text-body">
                  {l}
                </p>
              ))
            )}
          </section>
        ))}
        <footer className="mt-8 border-t border-line pt-3 text-[0.74rem] text-muted">{p(B.footer)}</footer>
      </div>
    </article>
  )
}
