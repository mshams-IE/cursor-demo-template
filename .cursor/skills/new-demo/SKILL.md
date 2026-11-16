---
name: new-demo
description: Chat wizard that builds a new Cloudera executive demo from this template in nine steps, saving progress to pack/demo-spec.json and filling skipped answers with marked assumptions. Use when someone asks to build, start, create or continue a demo ("build a demo for X", "continue the demo wizard", "change step 5").
---

# New demo wizard

You build a demo by filling `pack/demo-spec.json` (types in `kit/src/types.ts`) one step at a time. The app renders whatever the spec holds, so you never write UI code.

## Before step 1

1. Read `pack/demo-spec.json`.
   - If `wizard.status` is `in-progress`, **resume** at `wizard.step`. Say "Resuming at step N of 9: <name>" and show one line per completed step. Do not re-read old chats.
   - If it holds a sample (`id` is `coastal-water` or `orbit-telecom`) or is already `built` and the person asked for a new demo, ask whether to start blank or from that demo. Blank: `npm run use-sample -- blank --force`.
   - "Start from <other repo or sample>": copy that spec in, set `wizard` to `{ "step": 1, "completed": [], "status": "in-progress" }`, and walk the steps as edits.
2. Look up the industry starter with `starterFor(industry)` in `kit/starters/index.ts` once step 1 tells you the industry. Any industry works: one without its own starter (for example `government`, `logistics` or `other`) gets the `generic` starter, so adapt its wording to the customer. The starter backs every "You decide" answer, and its `vocabulary` and `defaultGeo` set the defaults for step 3.

## How to ask

- One step per turn. Title each turn **"Step N of 9: <name>"**.
- Use the AskQuestion tool for choices when it is available, otherwise numbered options. Put the recommended option first and mark it "(recommended)".
- **Every question offers "You decide".** A skipped question counts as "You decide".
- For lists (organisation, sites), give a paste-ready table template and accept a paste from Excel. Do not ask row by row.
- Ask decisions, not implementation. Keep each turn short.

## "You decide" and skipped answers

Fill the value with the best plausible guess from the starter, the customer's industry and geography, and earlier answers. Then:

- set `"source": "assumed"` and a one-line `"why"`, for example "Typical non-revenue water for a Gulf utility; no figure given";
- keep it consistent: totals add up, derived counts match sites, and the story matches the figures;
- tell the person in one line what you assumed.

**Never assume:**

- The customer name or logo. Use `"Customer"` and the Cloudera logo until given.
- Real people's names. Use first names or roles only.
- Figures the customer officially reports, such as published non-revenue water or SAIDI. If the person has none, the figure is illustrative and marked assumed.
- Topics to refuse. Start from the starter's refusals.

## The steps

Each step writes its part of the spec, then runs `npm run gates:spec -- --step N`. Fix every error before moving on, and mention warnings. Then add N to `wizard.completed` and set `wizard.step` to N+1. **Save after every step.**

1. **Customer.** Customer name (English and Arabic), industry (any: the starters cover power, water, telecom, aviation, banking, retail and healthcare, and anything else uses the generic starter), languages (English only, or English and Arabic), audience, and the title and subtitle of the demo. Writes `id`, `industry`, `languages`, `customer`, `title`, `subtitle`, `audience`.
2. **Brand.** Keep the Cloudera theme (recommended), or co-brand with the customer's logo and one accent colour. For co-branding, save the logo under `public/brand/`, then set `customer.logo` (for example `./brand/logo.svg`), `customer.accent` and `brand.coBrand: true`. Take a screenshot of the top bar to confirm (`node scripts/shots.mjs` with `npm run dev` running).
3. **Organisation.** Three decisions, then the groups.
   - **Wording.** What the demo calls its sites, its groups and its asset types, written to `vocabulary`. For example, a bank says "Branch" and "Business line", and a hospital group says "Facility" and "Cluster". Offer the starter's `vocabulary` first, or "Site and Region" (no `vocabulary`). Arabic forms take the definite article (`الفرع`, `الفروع`).
   - **Map or tiles.** Does the organisation map to geography? If yes, set `geo` to a boundary set from `kit/src/geo.ts` (`BOUNDARIES`). Saudi Arabia is `sa-adm1`, the UAE `ae-adm1`, Qatar `qa-adm1`, Kuwait `kw-adm1`, Oman `om-adm1` and Bahrain `bh-adm1`. If no, for example when grouping by business line, product or department, leave `geo` out. The overview and report then show one tile per group instead of a map. Recommend the starter's `defaultGeo`.
   - **Another country.** If it is a country with no boundary set, say that the template owner adds it with `node scripts/add-geo.mjs <ISO3>` and registers it in `kit/src/geo.ts`. Meanwhile, offer the tile layout.

   Then the groups (regions):

   | id | English name | Arabic name | boundary id (map only) |
   |---|---|---|---|

   Boundary ids are the feature `id`s in the boundary set's file in `kit/geo/`. For `sa-adm1` they are `eastern`, `riyadh`, `makkah`, `madinah`, `qassim`, `asir`, `tabuk`, `hail`, `northern`, `jazan`, `najran`, `bahah` and `jawf`. Without a map, drop the boundary column. Spellings are final from here on: point out near-duplicates the gates flag.
4. **Assets and sites.** Asset types (tick from the starter or add your own), then the sites:

   | id | English name | Arabic name | region id | type | longitude | latitude | status | why (if not normal) |
   |---|---|---|---|---|---|---|---|---|

   Longitude and latitude are only for demos with a map; drop those columns otherwise. Aim for 12 to 30 sites with about a third not normal, clustered where the story happens. Status is `normal`, `watch` or `critical`.
5. **Key figures.** Four tiles work best. Offer the starter's figures as ticks. Each figure needs a unit, and each count needs an "of N" basis. Prefer `derive` for counts of sites so the tile, the map (or tiles) and the report always agree:

   ```json
   "derive": { "count": { "status": ["watch", "critical"] }, "of": {} }
   ```

   Also add `facts` for any other number the story will quote, such as customers affected.
6. **Story.** The hero incident (what, where, when, impact), the chronic problem, and one or two supporting incidents, plus `clock.observedAt`. Mark them with `"role": "hero"` and `"role": "chronic"`. Impact text uses placeholders, for example `"{fact.customers-affected} in {site.KHB-D1} without supply"`.
7. **Experts.** Two to four personas from the starter's roles, each with a name, role, focus and three to five answers. Write the answers following `.cursor/skills/demo-experts/SKILL.md`. Set the refusal topics and reply.
8. **Presenter.** Five to seven beats following `.cursor/skills/demo-presenter/SKILL.md`, including at least one `ask` beat for the hero incident.
   **Richer demos (optional, after step 8).** Each of these switches on more of the app; offer them when the user wants the full experience, and write them the way `samples/power/demo-spec.json` does:
   - the day moving: `clock.replay`, site `timeline` and `metrics` with `series`, KPI `series`, incident `resolved`, `timeline`, `cause`, `evidence`, `restoreHours`, `affected`, and `alerts`;
   - expert portraits (`kit:man-1` … `kit:woman-3` or an image in `public/`), `available`, `category` with `expertCategories`, `tags`, `intro`, `greeting`, `topics`, and a team from `specialists`;
   - `planning` (options with cost, benefit and hours, budget, windows, optional scenario and what-if) for the Response planning page;
   - `history` series for questions about the past year, `report.records` for *Today's report*, `architecture` sources and apps, and `presenter.stories`.
   Every new item still needs `source`, Arabic text and numbers from the data; the gates check all of it.
9. **Review.** Show a one-page summary:
   - customer, industry, languages and brand;
   - wording (`vocabulary`) and map (`geo`, or tiles);
   - counts of regions, sites (with how many need attention), key figures with values, incidents, experts and beats;
   - **Assumed values (N):** every `assumed` item with its reason. Get this list with `npm run gates`.

   Offer: "Build (recommended)", "Change step N" and "Show me the assumptions in detail". On Build, set `wizard.completed` to all nine steps and `wizard.status` to `reviewed`.

## Build

1. Run `npm run check` (typecheck, lint, unit tests, full gates) and `npx playwright test`. Fix anything that fails in `pack/` only.
2. With `npm run dev` running, run `node scripts/shots.mjs` and look at every screenshot in both languages. Check that the hero story reads at a glance on the overview, and that names and numbers match across views.
3. Set `wizard.status` to `built`. Commit on a branch and offer to open a pull request with the screenshots and the assumptions list in its description.

## Changing a step later

"Change step N": edit only that part of the spec, re-run `npm run gates`, and fix any knock-on errors, such as a renamed site that a placeholder still points at. Re-take screenshots only for the views that changed.
