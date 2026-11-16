// Screenshots every view in every pack language: node scripts/shots.mjs [baseUrl]
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:5200/'
const spec = JSON.parse(readFileSync('pack/demo-spec.json', 'utf8'))
mkdirSync('shots', { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

for (const lang of spec.languages) {
  for (const view of ['overview', 'report', 'experts']) {
    await page.goto(`${base}?lang=${lang}&view=${view}&motion=reduced`)
    await page.waitForSelector(`[data-testid="view-${view}"]`)
    if (view === 'experts') {
      await page.locator('[data-testid^="starter-"]').first().click()
      await page.waitForSelector('[data-testid="chat-answer"]')
    }
    await page.waitForTimeout(400)
    await page.screenshot({ path: `shots/${lang}-${view}.png`, fullPage: true })
    console.log(`shots/${lang}-${view}.png`)
  }
}

await page.goto(`${base}?lang=en&motion=reduced`)
await page.getByTestId('presenter-toggle').click()
await page.getByTestId('presenter-next').click()
await page.getByTestId('assumptions-toggle').click()
await page.waitForTimeout(600)
await page.screenshot({ path: 'shots/en-presenter.png' })
console.log('shots/en-presenter.png')

await browser.close()
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
