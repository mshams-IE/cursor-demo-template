import type { Locale } from '../../types'
import type { BriefDoc } from './briefDoc'

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export interface BriefChrome {
  eyebrow: string
  footer: string
  logos: { src: string; alt: string }[]
}

export function briefToHtml(doc: BriefDoc, locale: Locale, chrome: BriefChrome) {
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  const sections = doc.sections
    .map((s) => {
      const body = s.list ? `<ul>${s.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : s.lines.map((l) => `<p>${esc(l)}</p>`).join('')
      return `<section>${s.heading ? `<h2>${esc(s.heading)}</h2>` : ''}${body}</section>`
    })
    .join('')
  const logos = chrome.logos.map((l) => `<img src="${esc(l.src)}" alt="${esc(l.alt)}">`).join('')
  return `<!doctype html><html lang="${locale}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(doc.title)}</title><style>
body{font-family:'Plus Jakarta Sans','IBM Plex Sans Arabic','Segoe UI',system-ui,sans-serif;color:#333e47;margin:0;background:#f5f8fa}
main{max-width:820px;margin:32px auto;background:#fff;border:1px solid #cedbe4;border-radius:16px;overflow:hidden}
.band{height:6px;background:linear-gradient(90deg,#120046,#413cc3 60%,#ff550d)}
.inner{padding:36px 48px}
.logos{display:flex;align-items:center;gap:16px;margin-bottom:24px}.logos img{height:22px}
.eyebrow{font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#413cc3}
[dir=rtl] .eyebrow,[dir=rtl] h2{letter-spacing:0}
h1{font-size:26px;color:#120046;margin:4px 0}
.meta{font-size:13px;color:#5f6b76;padding-bottom:16px;border-bottom:1px solid #cedbe4}
h2{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#413cc3;margin:22px 0 6px}
p,li{font-size:14.5px;line-height:1.65;margin:0}ul{margin:0;padding-inline-start:20px}
footer{margin-top:28px;padding-top:10px;border-top:1px solid #cedbe4;font-size:11px;color:#5f6b76}
@media print{body{background:#fff}main{margin:0;border:0;border-radius:0;max-width:none}}
</style></head><body><main><div class="band"></div><div class="inner"><div class="logos">${logos}</div>
<div class="eyebrow">${esc(chrome.eyebrow)}</div><h1>${esc(doc.title)}</h1><div class="meta">${esc(doc.meta ?? '')}</div>${sections}
<footer>${esc(chrome.footer)}</footer></div></main></body></html>`
}

async function inline(src: string) {
  if (src.startsWith('data:')) return src
  try {
    const blob = await (await fetch(src)).blob()
    return await new Promise<string>((resolve) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => resolve(src)
      r.readAsDataURL(blob)
    })
  } catch {
    return src
  }
}

export async function downloadBrief(doc: BriefDoc, locale: Locale, chrome: BriefChrome, fileName: string) {
  const logos = await Promise.all(chrome.logos.map(async (l) => ({ ...l, src: await inline(l.src) })))
  const blob = new Blob([briefToHtml(doc, locale, { ...chrome, logos })], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.html`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
