# @cloudera-demos/kit changelog

## 0.3.0

Full parity with the original executive grid intelligence app, generic over the pack and branded Cloudera. Existing packs work unchanged; each new page appears only when the pack has its data.

- **App shell.** Hash-routed pages with a navy sidebar ("Powered by Cloudera"), and a top bar with the *Today's report* / *With Digital Experts* mode, the time window (today, 6 h, 24 h), and a clock with Real time and Replay (`clock.replay`, `?at=HH:MM`, `?clock=live`). Command wall (`/wall`) and executive pack (`/pack`) open full screen. Old `?view=` links still work.
- **Time-aware spec (all optional).** `clock.utcOffsetMinutes`, `replay`, `snapshotLabel`; site `timeline`, `metrics` (with `series` and `limit`) and `details`; KPI `series` and `icon`; incident `resolved`, `affected`, `cause`, `causeConfirmed`, `evidence`, `restoreHours`, `timeline`; `alerts`. `kit/src/model/` derives statuses, key figures (with change against one hour earlier), incidents and alerts at the clock.
- **Digital experts.** Home with portraits (six AI-generated kit portraits, `kit:man-1` … `kit:woman-3`), availability, categories and tags; intro page; workspace with a team of AI specialists (`specialists`, `expert.team`) that work visibly on each answer, context panel, voice input and read-aloud, follow-ups and hand-offs between experts (`expert.topics`). A dock beside the sites, planning and briefs pages.
- **Answer engine.** Scripted answers first, then answers composed from the data: status, incidents, key figures, rankings, sites, twelve months of generated history (`history`, with charts), planning and Today's report counts.
- **OpenAI.** `kit/server/expert.ts` proxies OpenAI Chat Completions (`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_BASE_URL`, server-side only), mounted at `/api/expert` by `kit/vite-plugin.ts`. Tools run in the browser over the pack, and every number in a model answer is checked against the tool results before it is shown. `scripts/mock-llm.mjs` mocks the model for tests.
- **Overview and sites.** MapLibre map with no tile server (status shading, region bubbles, live markers, layers per site metric, 3D, legend) with the SVG map as fallback and group tiles without geo; KPI tiles with sparklines and hourly change; alert banners; incidents and sites page; site investigation with readings against limits, charts, evidence and timelines.
- **Response planning.** `planning`: budget, window and scenario controls, a generic optimiser over options (cost, benefit, hours, sensitivity), restoration and budget curves, exclusions, a what-if card, assigned actions and briefs.
- **Briefs, command wall and executive pack**, printable and in every pack language.
- **Technology architecture.** Customer sources (`architecture`) flowing through the Cloudera platform layers to the experts and apps, with an animated incident trace and a deployment switch.
- **Today's report.** Counts-only view of `report.records` by day, category, region and site.
- **Presenter.** `presenter.stories`; beats can set `page`, `clock` and `siteId`.
- **Gates** validate every new reference, time and text. **Samples:** new power flagship that uses every feature.

## 0.2.0

Generalised to fit any industry and any country. Existing `specVersion: 1` packs work unchanged.

- **Optional map.** `geo` is now optional, and so are `regions[].geoId` and `sites[].coordinates`. Without a map, the overview and the report show `GroupGrid`: one tile per group with its worst status, "N of M need attention" and the flagged sites. Clicking a tile filters just as clicking a map region does. `OrganisationView` picks the map or the tiles.
- **Vocabulary.** The optional `vocabulary` (`entity`, `entityPlural`, `group`, `groupPlural`, and optionally `type` and `typePlural`) renames "Site", "Region" and "Asset type" across the UI and the assumptions list. UI strings moved to `kit/src/terms.ts`, which exports `vocabularyTerms`.
- **Boundary sets** for the UAE, Qatar, Kuwait, Oman and Bahrain, plus `scripts/add-geo.mjs` to import any country's ADM1 boundaries from geoBoundaries.
- **Industries.** `Industry` adds `banking`, `retail`, `healthcare`, `government`, `manufacturing` and `logistics`.
  - New starters for banking, retail and healthcare, and a `generic` fallback. Get the right one with `starterFor(industry)`.
  - Starters now suggest a `vocabulary` and whether the industry usually has a map (`defaultGeo`).
- **Gates.**
  - Geo checks run only when `geo` is set, and then require `geoId` and `coordinates`.
  - The vocabulary must be complete and is checked for Arabic.
- **Presenter.** Beats can spotlight `group-grid` and `group-<regionId>`.
- **Samples.** New banking sample with no map.

## 0.1.0

- First release, extracted from the executive grid intelligence demo and generalised:
  - standard views: executive overview, today's report and digital experts;
  - presenter bar with spotlight and an assumptions note.
- Cloudera default theme (colours and fonts from cloudera.com, pending brand confirmation), with co-branding of the logo and accent colour.
- Pack contract (`DemoSpec`) where every value carries `source: customer | starter | assumed`.
- Answer engine with English and Arabic routing, follow-ups and refusals. Placeholders keep every number and name tied to the data.
- Gates:
  - wizard;
  - structure;
  - languages;
  - one spelling per name;
  - units and basis;
  - numbers from data;
  - sources;
  - status notes;
  - presenter routing;
  - brand.
- Industry starters for power, water, telecom and aviation.
- Boundary set: Saudi Arabia ADM1 (geoBoundaries, ODbL).
