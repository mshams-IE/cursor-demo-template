// Screenshots every page in every pack language: node scripts/shots.mjs [baseUrl]
import { mkdirSync, readFileSync } from 'node:fs'
import { chromium } from '@playwright/test'

const base = process.argv[2] ?? 'http://127.0.0.1:5200/'
const spec = JSON.parse(readFileSync('pack/demo-spec.json', 'utf8'))
mkdirSync('shots', { recursive: true })

const hidden = spec.hidePages ?? []
const experts = spec.experts.filter((e) => e.available !== false)
const pages = [
  ['experts', '/', spec.experts.length > 0],
  ['overview', '/overview', true],
  ['sites', '/sites', spec.sites.length > 0],
  ['planning', '/planning', !!spec.planning?.options?.length],
  ['briefs', '/briefs', spec.experts.length > 0],
  ['architecture', '/architecture', true],
  ['wall', '/wall', true],
  ['pack', '/pack', true],
].filter(([id, , show]) => show && !hidden.includes(id))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

async function shot(name, url, after) {
  await page.goto(url)
  await page.reload()
  await page.waitForTimeout(900)
  if (after) await after()
  await page.screenshot({ path: `shots/${name}.png` })
  console.log(`shots/${name}.png`)
}

for (const lang of spec.languages) {
  const q = `?lang=${lang}&motion=reduced`
  for (const [id, path] of pages) await shot(`${lang}-${id}`, `${base}#${path}${q}`)
  if (spec.experts.length) await shot(`${lang}-report`, `${base}#/overview${q}&mode=report`)
  if (experts.length)
    await shot(`${lang}-chat`, `${base}#/experts/${experts[0].id}/chat${q}`, async () => {
      await page.locator('[data-testid^="starter-"]').first().click()
      await page.getByTestId('chat-answer').last().waitFor()
      await page.waitForTimeout(400)
    })
}

await shot('en-presenter', `${base}#/?lang=en&motion=reduced`, async () => {
  await page.getByTestId('presenter-toggle').click()
  await page.getByTestId('presenter-start').click()
  await page.getByTestId('assumptions-toggle').click()
  await page.waitForTimeout(600)
})

await browser.close()
if (errors.length) {
  console.error(`Console errors:\n${errors.join('\n')}`)
  process.exit(1)
}
