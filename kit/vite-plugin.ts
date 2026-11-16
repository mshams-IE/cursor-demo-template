import type { Plugin } from 'vite'
import { nodeHandler } from './server/expert.ts'

/** Mounts the Digital Expert model proxy at /api/expert in `vite` dev and `vite preview`. */
export function expertApi(): Plugin {
  return {
    name: 'cloudera-demos:expert-api',
    configureServer(server) {
      server.middlewares.use('/api/expert', (req, res) => void nodeHandler(req, res))
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/expert', (req, res) => void nodeHandler(req, res))
    },
  }
}
