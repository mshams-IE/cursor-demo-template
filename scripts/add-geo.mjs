#!/usr/bin/env node
// Downloads a country's ADM1 boundaries from geoBoundaries gbOpen, simplifies them and writes
// kit/geo/<id>.json in the shape the kit expects (feature property `id`, top-level `attribution`).
// Usage: node scripts/add-geo.mjs <ISO3> [id] [--tolerance 0.01]
// Example: node scripts/add-geo.mjs ARE ae-adm1
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = args.indexOf(name)
  if (i === -1) return fallback
  const [, v] = args.splice(i, 2)
  return v
}
const tolerance = Number(flag('--tolerance', '0.01'))
const [iso3, idArg] = args
if (!iso3 || !/^[A-Za-z]{3}$/.test(iso3)) {
  console.error('Usage: node scripts/add-geo.mjs <ISO3> [id] [--tolerance 0.01]')
  process.exit(1)
}
const ISO3 = iso3.toUpperCase()

const meta = await (await fetch(`https://www.geoboundaries.org/api/current/gbOpen/${ISO3}/ADM1/`)).json()
const url = meta.simplifiedGeometryGeoJSON || meta.gjDownloadURL
const raw = await (await fetch(url)).json()
const iso2 = (raw.features[0]?.properties?.shapeISO ?? '').slice(0, 2).toLowerCase() || ISO3.toLowerCase()
const id = idArg ?? `${iso2}-adm1`

const slug = (s) =>
  s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(emirate|governorate|province|region|municipality|of|the)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

function perpDist([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  if (!dx && !dy) return Math.hypot(x - x1, y - y1)
  const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (x1 + t * dx), y - (y1 + t * dy))
}

function simplify(pts, tol) {
  if (pts.length < 4) return pts
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[pts.length - 1] = 1
  const stack = [[0, pts.length - 1]]
  while (stack.length) {
    const [a, b] = stack.pop()
    let best = -1
    let at = -1
    for (let i = a + 1; i < b; i++) {
      const d = perpDist(pts[i], pts[a], pts[b])
      if (d > best) [best, at] = [d, i]
    }
    if (best > tol) {
      keep[at] = 1
      stack.push([a, at], [at, b])
    }
  }
  return pts.filter((_, i) => keep[i])
}

const round = ([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000]
const ring = (r) => {
  const s = simplify(r, tolerance).map(round)
  return s.length >= 4 ? s : null
}
const polygon = (p) => {
  const outer = ring(p[0])
  return outer ? [outer, ...p.slice(1).map(ring).filter(Boolean)] : null
}

const seen = new Set()
const features = raw.features
  .map((f) => {
    const name = f.properties.shapeName
    let fid = slug(name) || f.properties.shapeISO?.toLowerCase()
    while (seen.has(fid)) fid += '-2'
    seen.add(fid)
    const polys = (f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates).map(polygon).filter(Boolean)
    if (!polys.length) return null
    return {
      type: 'Feature',
      properties: { id: fid, iso: f.properties.shapeISO, nameEn: name },
      geometry: polys.length === 1 ? { type: 'Polygon', coordinates: polys[0] } : { type: 'MultiPolygon', coordinates: polys },
    }
  })
  .filter(Boolean)

const source = meta.boundarySource ? ` (${meta.boundarySource})` : ''
const license = meta.boundaryLicense?.includes('Open Database License') ? 'ODbL 1.0' : meta.boundaryLicense
const out = {
  type: 'FeatureCollection',
  attribution: `Region boundaries: geoBoundaries gbOpen ${ISO3} ADM1${source}, ${license} — simplified`,
  features,
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const file = join(root, 'kit', 'geo', `${id}.json`)
writeFileSync(file, JSON.stringify(out))
const camel = id.replace(/-(\w)/g, (_, c) => c.toUpperCase())
console.log(`Wrote ${file} (${features.length} regions, ${Math.round(JSON.stringify(out).length / 1024)} KB)`)
console.log('Region ids:', features.map((f) => f.properties.id).join(', '))
console.log(`Register it in kit/src/geo.ts:\n  import ${camel} from '../geo/${id}.json'\n  '${id}': ${camel} as unknown as Boundaries,`)
