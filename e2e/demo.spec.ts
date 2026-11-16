import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { vocabularyTerms } from '../kit/src/terms'
import type { DemoSpec } from '../kit/src/types'

const spec = JSON.parse(readFileSync('pack/demo-spec.json', 'utf8')) as DemoSpec
const attention = spec.sites.filter((s) => s.status !== 'normal').length
const shown = spec.vocabulary ? vocabularyTerms(spec.vocabulary).sitesShown!.en : 'sites shown'

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

for (const lang of spec.languages) {
  test(`every view renders without errors (${lang})`, async ({ page }, info) => {
    const errors = watchErrors(page)
    for (const view of ['overview', 'report', 'experts'] as const) {
      await page.goto(`./?lang=${lang}&view=${view}&motion=reduced`)
      await expect(page.getByTestId(`view-${view}`)).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
      await info.attach(`${lang}-${view}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
    }
    expect(errors).toEqual([])
  })
}

test('every key figure shows its unit line', async ({ page }) => {
  await page.goto('./?motion=reduced')
  for (const k of spec.kpis) await expect(page.getByTestId(`kpi-${k.id}`).getByTestId('kpi-unit')).not.toBeEmpty()
})

test('the map (or group tiles), the report and the derived key figure agree on sites needing attention', async ({ page }) => {
  await page.goto('./?view=report&motion=reduced')
  await expect(page.getByTestId('report-count')).toContainText(`${spec.sites.length} ${shown} · ${attention} need attention`)
  if (spec.geo) {
    const bubbles = await page.locator('[data-testid^="map-bubble-"] text').allTextContents()
    expect(bubbles.reduce((a, b) => a + Number(b), 0)).toBe(attention)
  } else {
    await expect(page.getByTestId('region-map')).toHaveCount(0)
    for (const r of spec.regions) {
      const list = spec.sites.filter((s) => s.regionId === r.id)
      const flagged = list.filter((s) => s.status !== 'normal').length
      await expect(page.getByTestId(`group-count-${r.id}`)).toHaveText(`${flagged} of ${list.length} need attention`)
    }
  }
  const derived = spec.kpis.find((k) => k.kind === 'count' && k.derive?.count.status?.every((s) => s !== 'normal'))
  if (derived) {
    await page.getByTestId('view-switch-overview').click()
    await expect(page.getByTestId(`kpi-${derived.id}`).getByTestId('kpi-value')).toHaveText(String(attention))
  }
})

test('report filters drive the table and the map together', async ({ page }) => {
  await page.goto('./?view=report&motion=reduced')
  await page.getByTestId('filter-status-critical').click()
  const critical = spec.sites.filter((s) => s.status === 'critical')
  await expect(page.locator('[data-testid^="row-"]')).toHaveCount(critical.length)
  if (spec.geo) await expect(page.locator('[data-testid^="map-site-"]')).toHaveCount(critical.length)
  else await expect(page.locator('[data-testid^="group-site-"]')).toHaveCount(critical.length)
})

test('selecting a group filters the report to it', async ({ page }) => {
  test.skip(!!spec.geo, 'Pack has a map')
  const region = spec.regions.find((r) => spec.sites.some((s) => s.regionId === r.id))!
  await page.goto('./?view=report&motion=reduced')
  await page.getByTestId(`group-${region.id}`).click()
  await expect(page.locator('[data-testid^="row-"]')).toHaveCount(spec.sites.filter((s) => s.regionId === region.id).length)
  await page.getByTestId('map-back').click()
  await expect(page.locator('[data-testid^="row-"]')).toHaveCount(spec.sites.length)
})

test('presenter beats with a question produce the scripted answer', async ({ page }) => {
  await page.goto('./?motion=reduced')
  await page.getByTestId('presenter-toggle').click()
  const beats = spec.presenter.beats
  await page.getByTestId('presenter-play').click()
  await page.getByTestId('presenter-play').click()
  for (let i = 0; i < beats.length; i++) {
    if (i > 0) await page.getByTestId('presenter-next').click()
    const b = beats[i]
    await expect(page.getByTestId('presenter-title')).toHaveText(b.title.en)
    if (b.ask) {
      const expert = spec.experts.find((e) => e.id === b.ask!.expertId)!
      await expect(page.getByTestId('expert-chat')).toContainText(expert.name.en)
      await expect(page.getByTestId('chat-answer').last()).toBeVisible()
    }
  }
})

test('suggested questions are in the chosen language', async ({ page }) => {
  test.skip(!spec.languages.includes('ar'), 'English-only pack')
  await page.goto('./?lang=ar&view=experts&motion=reduced')
  const arabic = /[\u0600-\u06FF]/
  for (const chip of await page.locator('[data-testid^="starter-"]').allTextContents()) expect(chip).toMatch(arabic)
  await page.locator('[data-testid^="starter-"]').first().click()
  await expect(page.getByTestId('chat-answer').last()).toBeVisible()
  for (const chip of await page.locator('[data-testid^="followup-"]').allTextContents()) expect(chip).toMatch(arabic)
})

test('out-of-scope questions are refused', async ({ page }) => {
  await page.goto('./?view=experts&motion=reduced')
  await page.getByTestId('chat-input').fill(`What about ${spec.refusals.topics[0].keywords[0]}?`)
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-refusal')).toBeVisible()
})
