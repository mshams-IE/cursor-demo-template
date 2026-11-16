import { expect, test, type Page } from '@playwright/test'
import { readFileSync } from 'node:fs'
import type { DemoSpec, Severity } from '../kit/src/types'

const spec = JSON.parse(readFileSync('pack/demo-spec.json', 'utf8')) as DemoSpec
const observed = spec.clock.observedAt
const hhmm = (t: string) => (t.length === 5 ? `${observed.slice(0, 10)}T${t}` : t)

/** Site status at the observed time, following each site's timeline. */
function statusAtObserved(s: DemoSpec['sites'][number]): Severity {
  let status = s.status
  for (const c of s.timeline ?? []) if (hhmm(c.at) <= observed) status = c.status
  return status
}
const attention = spec.sites.filter((s) => statusAtObserved(s) !== 'normal').length
const available = spec.experts.filter((e) => e.available !== false)
const chatOf = (id: string, q = '') => `./#/experts/${id}/chat?motion=reduced${q}`

const pages = [
  { id: 'experts', path: '/', show: spec.experts.length > 0 },
  { id: 'overview', path: '/overview', show: true },
  { id: 'sites', path: '/sites', show: spec.sites.length > 0 },
  { id: 'planning', path: '/planning', show: !!spec.planning?.options.length },
  { id: 'briefs', path: '/briefs', show: spec.experts.length > 0 },
  { id: 'architecture', path: '/architecture', show: true },
].filter((p) => p.show && !(spec.hidePages ?? []).includes(p.id as never))

function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return errors
}

for (const lang of spec.languages) {
  test(`every page renders without errors (${lang})`, async ({ page }, info) => {
    const errors = watchErrors(page)
    for (const p of pages) {
      await page.goto(`./#${p.path}?lang=${lang}&motion=reduced`)
      await expect(page.locator(`main[data-testid="page-${p.id}"]`)).toBeVisible()
      await expect(page.getByTestId(`nav-${p.id}`)).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr')
      await page.waitForTimeout(300)
      await info.attach(`${lang}-${p.id}`, { body: await page.screenshot(), contentType: 'image/png' })
    }
    for (const full of ['wall', 'pack']) {
      await page.goto(`./#/${full}?lang=${lang}&motion=reduced`)
      await expect(page.getByTestId(full === 'wall' ? 'command-wall' : 'executive-pack')).toBeVisible()
    }
    expect(errors).toEqual([])
  })
}

test('every key figure shows its unit line', async ({ page }) => {
  await page.goto('./#/overview?motion=reduced')
  for (const k of spec.kpis) await expect(page.getByTestId(`kpi-${k.id}`).getByTestId('kpi-unit')).not.toBeEmpty()
})

test('the derived key figure follows the site register at the clock', async ({ page }) => {
  const derived = spec.kpis.find((k) => k.kind === 'count' && k.derive?.count.status?.every((s) => s !== 'normal') && !k.derive.count.type && !k.derive.count.regionId)
  test.skip(!derived, 'No derived attention figure')
  await page.goto('./#/overview?motion=reduced')
  await expect(page.getByTestId(`kpi-${derived!.id}`).getByTestId('kpi-value')).toHaveText(String(attention))
})

test("Today's report hides the expert-only pages and shows counts", async ({ page }) => {
  test.skip(!spec.experts.length, 'No experts, so no mode switch')
  await page.goto('./#/overview?motion=reduced')
  await page.getByTestId('mode-switch-report').click()
  await expect(page.getByTestId('report-overview')).toBeVisible()
  await expect(page.getByTestId('nav-sites')).toHaveCount(0)
  await expect(page.getByTestId('nav-planning')).toHaveCount(0)
  await page.getByTestId('mode-switch-experts').click()
  await expect(page.getByTestId('kpi-row')).toBeVisible()
})

test('groups show as tiles when the pack has no map', async ({ page }) => {
  test.skip(!!spec.geo, 'Pack has a map')
  await page.goto('./#/overview?motion=reduced')
  await expect(page.getByTestId('group-grid')).toBeVisible()
  for (const r of spec.regions) {
    const list = spec.sites.filter((s) => s.regionId === r.id)
    if (!list.length) continue
    await expect(page.getByTestId(`group-count-${r.id}`)).toHaveText(`${list.filter((s) => statusAtObserved(s) !== 'normal').length} of ${list.length} need attention`)
  }
})

test('replay moves the clock and the reset returns to the snapshot', async ({ page }) => {
  await page.goto('./#/overview?motion=reduced')
  const time = page.getByTestId('clock-time')
  await expect(time).toContainText(observed.slice(11, 16))
  await page.goto(`./#/overview?motion=reduced&at=${spec.clock.replay ? spec.clock.replay.start.slice(-5) : '06:00'}`)
  await page.reload()
  await expect(page.getByTestId('clock-reset')).toBeVisible()
  await page.getByTestId('clock-reset').click()
  await expect(time).toContainText(observed.slice(11, 16))
})

test('presenter beats with a question produce the scripted answer', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('./#/?motion=reduced')
  await page.getByTestId('presenter-toggle').click()
  const beats = spec.presenter.beats
  await page.getByTestId('presenter-start').click()
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
  test.skip(!spec.languages.includes('ar') || !available.length, 'English-only pack or no experts')
  await page.goto(chatOf(available[0].id, '&lang=ar'))
  const arabic = /[\u0600-\u06FF]/
  const starters = page.locator('[data-testid^="starter-"]')
  await expect(starters.first()).toBeVisible()
  for (const chip of await starters.allTextContents()) expect(chip).toMatch(arabic)
  await starters.first().click()
  await expect(page.getByTestId('chat-answer').last()).toBeVisible()
  for (const chip of await page.locator('[data-testid^="followup-"]').allTextContents()) expect(chip).toMatch(arabic)
})

test('out-of-scope questions are refused', async ({ page }) => {
  test.skip(!available.length || !spec.refusals.topics.length, 'No experts or refusals')
  await page.goto(chatOf(available[0].id))
  await page.getByTestId('chat-input').fill(`What about ${spec.refusals.topics[0].keywords[0]}?`)
  await page.getByTestId('chat-send').click()
  await expect(page.getByTestId('chat-refusal')).toBeVisible()
})

test('experts on request cannot be opened', async ({ page }) => {
  const onRequest = spec.experts.find((e) => e.available === false)
  test.skip(!onRequest, 'Every expert is available')
  await page.goto('./#/?motion=reduced')
  await expect(page.getByTestId(`expert-chat-${onRequest!.id}`)).toBeDisabled()
})
