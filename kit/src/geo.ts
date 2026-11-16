import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import saAdm1 from '../geo/sa-adm1.json'

export type BBox = [number, number, number, number]
export type Boundaries = FeatureCollection<Polygon | MultiPolygon, { id: string }> & { attribution: string }

/**
 * Boundary sets a pack can name in `geo`. Add a new country by dropping a simplified
 * ADM1 GeoJSON (feature property `id`, top-level `attribution`) in kit/geo and registering it here.
 */
export const BOUNDARIES: Record<string, Boundaries> = {
  'sa-adm1': saAdm1 as unknown as Boundaries,
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
