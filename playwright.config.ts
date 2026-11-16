import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  timeout: 30_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: 'http://127.0.0.1:5210/', viewport: { width: 1600, height: 1000 } },
  webServer: { command: 'npx vite --port 5210 --strictPort', url: 'http://127.0.0.1:5210/', reuseExistingServer: !process.env.CI },
})
