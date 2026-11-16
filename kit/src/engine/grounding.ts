const toLatin = (s: string) =>
  s
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066C/g, ',')
    .replace(/\u066B/g, '.')

/** Codes such as "SS-RYD-247" or "TX2" carry digits that are names, not figures. */
const withoutCodes = (s: string) => s.replace(/[\p{L}]+[-_]?\d[\p{L}\d_-]*|\d+[-_][\p{L}\d_-]+/gu, ' ')

const canon = (raw: string) => String(Number(raw.replace(/,/g, '')))

/** Numbers in a text, with thousands separators removed and Arabic digits read as Latin. */
export function numbersIn(text: string): string[] {
  return (withoutCodes(toLatin(text)).match(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?/g) ?? []).map(canon)
}

const timesIn = (text: string) => toLatin(text).match(/\b\d{1,2}:\d{2}\b/g) ?? []

function variants(v: number): number[] {
  const r = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d
  const out = [v, Math.round(v), r(v, 1), r(v, 2), Math.abs(v), Math.floor(v), Math.ceil(v)]
  if (Math.abs(v) >= 1000) out.push(r(v / 1000, 1), Math.round(v / 1000))
  if (Math.abs(v) >= 1_000_000) out.push(r(v / 1_000_000, 1), r(v / 1_000_000, 2))
  if (Math.abs(v) <= 1) out.push(Math.round(v * 100), r(v * 100, 1))
  return out.map(Math.abs)
}

/**
 * Figures in a model answer that appear in none of the sources, allowing rounding, thousands
 * separators, "k"/"M" scaling and fractions written as percentages. Times must appear verbatim;
 * years and small counting words (1 to 12) pass.
 */
export function ungroundedNumbers(answer: string, sources: string[]): string[] {
  const known = new Set<string>()
  const times = new Set<string>()
  for (const s of sources) {
    for (const n of numbersIn(s)) for (const v of variants(Number(n))) known.add(String(v))
    for (const t of timesIn(s)) times.add(t.padStart(5, '0'))
  }
  const out: string[] = []
  const text = toLatin(answer)
  for (const t of timesIn(text)) if (!times.has(t.padStart(5, '0'))) out.push(t)
  for (const n of numbersIn(text.replace(/\b\d{1,2}:\d{2}\b/g, ' '))) {
    const v = Number(n)
    if (known.has(n) || (Number.isInteger(v) && v <= 12) || (Number.isInteger(v) && v >= 1990 && v <= 2100)) continue
    out.push(n)
  }
  return [...new Set(out)]
}
