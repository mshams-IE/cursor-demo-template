# Cursor demo template

A Cloudera-branded template for executive AI demos. Every demo built from it shares one look, one layout and one set of quality checks. The only thing that changes per customer is the content in `pack/demo-spec.json`, which a chat wizard in Cursor fills in with you.

| | |
|---|---|
| **Views** | Executive overview, Today's report (map, or group tiles, above a filterable table), Digital experts (chat), Presenter bar |
| **Fits** | Any industry: starters for power, water, telecom, aviation, banking, retail and healthcare, with a generic starter for everything else. The demo's own wording ("Branch", "Business line") replaces "Site" and "Region" |
| **Maps** | Saudi Arabia, UAE, Qatar, Kuwait, Oman and Bahrain built in; any other country in one command; or no map at all |
| **Languages** | English, or English and Arabic, with right-to-left layout |
| **Theme** | Cloudera by default; optional customer co-branding (logo and accent colour) |
| **Checks** | Names, units, numbers, languages, sources and presenter script, run on every pull request |

## Build a new demo

1. On GitHub, click **Use this template**. Name the repository after the customer and industry, for example `marafiq-water-demo`.
2. Clone it, open the folder in **Cursor**, then run:

   ```bash
   npm install
   npm run dev        # http://127.0.0.1:5200 shows the sample water utility
   ```

3. In a new Cursor chat, type:

   > Build a demo for Marafiq, water utility, Jubail and Yanbu, English and Arabic.

4. The agent runs the nine-step wizard:
   1. Customer
   2. Brand
   3. Organisation
   4. Assets and sites
   5. Key figures
   6. Story
   7. Experts
   8. Presenter
   9. Review

   Answer what you know. Say **"You decide"** (or skip) for anything else, and the agent fills in a realistic value and marks it as assumed. Progress is saved after each step. In a new chat, say **"continue the demo wizard"** to pick up where you left off.
5. At the review step you see every assumed value. Then choose **Build**: the agent runs the checks, takes screenshots in each language and offers a pull request.
6. Present with the **clapperboard** button in the top bar. The clipboard icon in the presenter bar lists the assumptions, which you should not present as customer facts.

**Tips:**

- Paste tables from Excel at the organisation and sites steps.
- Fix spellings during the wizard, not after the build.
- Use one chat for the wizard and a fresh chat for polishing.

## Commands

```bash
npm run dev                      # local app on port 5200
npm run check                    # typecheck + lint + unit tests + gates
npm run gates                    # quality gates on pack/demo-spec.json
npm run gates:spec -- --step 4   # gates for the wizard steps done so far
npx playwright test              # browser checks in every pack language
node scripts/shots.mjs           # screenshots of every view (with dev running)
npm run build:offline            # one self-contained HTML file in dist-offline/
npm run use-sample -- telecom    # load a sample (water, telecom, banking) or "blank"
node scripts/add-geo.mjs ARE     # import a country's ADM1 boundaries into kit/geo/
```

## What's where

```text
pack/demo-spec.json   the demo: customer, regions, sites, key figures, story, experts, presenter (edit this)
kit/                  shared look, components, answer engine, gates and starters (don't edit in a demo)
kit/themes/           Cloudera theme
kit/starters/         industry starter lists that back "You decide" (plus a generic fallback)
kit/geo/              simplified country boundary sets for the map
samples/              finished example demos (water and telecom with a map, banking without)
.cursor/skills/       new-demo wizard, demo-design, demo-experts, demo-gates, demo-presenter, update-from-template
.cursor/rules/        always-on demo standards
.github/workflows/    gates on every pull request, with screenshots as an artifact
```

## Keeping demos up to date

When the template improves, open the demo in Cursor and say **"update from template"**. The agent pulls the newer kit, skills, rules and checks. Your `pack/` is never touched.

## Notes

- **Branding:** the colours, font and logo come from the public cloudera.com site and are pending confirmation by Cloudera marketing. Replace `kit/assets/cloudera-logo.png` with the official SVG when the brand kit is available.
- **Map boundaries:** geoBoundaries gbOpen ADM1 (OpenStreetMap contributors), ODbL 1.0, for Saudi Arabia (`sa-adm1`), the UAE (`ae-adm1`), Qatar (`qa-adm1`), Kuwait (`kw-adm1`), Oman (`om-adm1`) and Bahrain (`bh-adm1`). To add another country, run `node scripts/add-geo.mjs <ISO3>` and register the file it writes in `kit/src/geo.ts`. A demo whose organisation doesn't map to geography (business lines, products, departments) leaves `geo` out and shows one tile per group instead.
- **Wording:** `vocabulary` in the spec sets what the demo calls its sites, regions and asset types, in every pack language. Without it, the UI says "Site", "Region" and "Asset type".
- **Data:** all data in the samples is fictional and illustrative.
