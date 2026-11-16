import { create } from 'zustand'

export type MapLayer = 'status' | 'incidents' | `metric:${string}`

interface MapViewState {
  layer: MapLayer
  map3d: boolean
  setLayer: (layer: MapLayer) => void
  setMap3d: (on: boolean) => void
}

export const useMapView = create<MapViewState>((set) => ({
  layer: 'status',
  map3d: false,
  setLayer: (layer) => set({ layer }),
  setMap3d: (map3d) => set({ map3d }),
}))
