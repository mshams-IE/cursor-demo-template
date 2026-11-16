export interface BriefSection {
  heading: string
  lines: string[]
  list?: boolean
}

export interface BriefDoc {
  title: string
  meta?: string
  sections: BriefSection[]
}

/** Saved briefs keep their body as plain text: "## " starts a section, "- " a list item. */
export function docToBody(sections: BriefSection[]): string {
  return sections
    .filter((s) => s.lines.length)
    .map((s) => [`## ${s.heading}`, ...s.lines.map((l) => (s.list ? `- ${l}` : l))].join('\n'))
    .join('\n\n')
}

export function bodyToSections(body: string): BriefSection[] {
  const out: BriefSection[] = []
  let cur: BriefSection | undefined
  for (const raw of body.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('## ')) {
      cur = { heading: line.slice(3), lines: [] }
      out.push(cur)
      continue
    }
    if (!cur) {
      cur = { heading: '', lines: [] }
      out.push(cur)
    }
    if (line.startsWith('- ')) {
      cur.list = true
      cur.lines.push(line.slice(2))
    } else cur.lines.push(line)
  }
  return out
}

export function docToText(doc: BriefDoc): string {
  const parts = [doc.title, doc.meta ?? '']
  for (const s of doc.sections) {
    if (s.heading) parts.push('', s.heading.toUpperCase())
    parts.push(...s.lines.map((l) => (s.list ? `• ${l}` : l)))
  }
  return parts.join('\n').trim()
}
