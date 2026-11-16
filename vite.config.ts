import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const offline = mode === 'offline'
  return {
    plugins: [react(), tailwindcss(), ...(offline ? [viteSingleFile({ removeViteModuleLoader: true })] : [])],
    base: './',
    build: offline ? { outDir: 'dist-offline', assetsInlineLimit: () => true, chunkSizeWarningLimit: 10_000 } : { chunkSizeWarningLimit: 2_500 },
    server: { host: '127.0.0.1', port: 5200 },
    preview: { host: '127.0.0.1', port: 5201 },
    test: {
      environment: 'jsdom',
      include: ['kit/**/*.test.ts', 'pack/**/*.test.ts', 'src/**/*.test.ts'],
    },
  }
})
