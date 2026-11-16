# @cloudera-demos/kit changelog

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
