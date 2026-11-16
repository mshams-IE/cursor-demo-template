import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import aeAdm1 from '../geo/ae-adm1.json'
import bhAdm1 from '../geo/bh-adm1.json'
import kwAdm1 from '../geo/kw-adm1.json'
import omAdm1 from '../geo/om-adm1.json'
import qaAdm1 from '../geo/qa-adm1.json'
import saAdm1 from '../geo/sa-adm1.json'

export type BBox = [number, number, number, number]
export type Boundaries = FeatureCollection<Polygon | MultiPolygon, { id: string }> & { attribution: string }

/**
 * Boundary sets a pack can name in `geo`. Add a country with `node scripts/add-geo.mjs <ISO3>`,
 * which writes a simplified ADM1 GeoJSON (feature property `id`, top-level `attribution`) to kit/geo,
 * then register it here.
 */
export const BOUNDARIES: Record<string, Boundaries> = {
  'sa-adm1': saAdm1 as unknown as Boundaries,
  'ae-adm1': aeAdm1 as unknown as Boundaries,
  'qa-adm1': qaAdm1 as unknown as Boundaries,
  'kw-adm1': kwAdm1 as unknown as Boundaries,
  'om-adm1': omAdm1 as unknown as Boundaries,
  'bh-adm1': bhAdm1 as unknown as Boundaries,
}

function rings(f: Feature<Polygon | MultiPolygon>): number[][][] {
  return f.geometry.type === 'Polygon' ? [f.geometry.coordinates[0]] : f.geometry.coordinates.map((p) => p[0])
}

export function featureBBox(f: Feature<Polygon | MultiPolygon>): BBox {
  let [a, b, c, d] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const ring of rings(f))
    for (const [x, y] of ring) {
      a = Math.min(a, x)
      b = Math.min(b, y)
      c = Math.max(c, x)
      d = Math.max(d, y)
    }
  return [a, b, c, d]
}

export function unionBBox(boxes: BBox[]): BBox {
  return boxes.reduce<BBox>((acc, bb) => [Math.min(acc[0], bb[0]), Math.min(acc[1], bb[1]), Math.max(acc[2], bb[2]), Math.max(acc[3], bb[3])], [Infinity, Infinity, -Infinity, -Infinity])
}

export function pointInBBox([x, y]: [number, number], [a, b, c, d]: BBox, pad = 0) {
  return x >= a - pad && x <= c + pad && y >= b - pad && y <= d + pad
}
