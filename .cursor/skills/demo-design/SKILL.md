---
name: demo-design
description: Look-and-feel rules for Cloudera executive demos, including the standard views, theme, co-branding and screenshot review. Use when reviewing how a demo looks, changing branding, or when someone asks for a layout or visual change.
---

# Demo design

## The standard views (kit/src/components)

- **Executive overview:** key-figure tiles, a map shaded by the worst site status with a bubble per region counting sites that need attention, and priority incidents (hero first, chronic tagged).
- **Today's report:** a full-width map above a filterable site table. The filters drive both, so they always agree.
- **Without a map** (no `geo` in the spec), the map is replaced in both views by group tiles (`GroupGrid`). Each region gets one tile, shaded by its worst status, showing "N of M need attention" and listing up to three flagged sites. Clicking a tile filters just as clicking a map region does. Presenter beats can spotlight `group-grid` instead of `region-map`.
- **Wording:** the spec's `vocabulary` renames "Site", "Region" and "Asset type" everywhere in the UI (column headers, filters, search, legend). Change wording there, never in components.
- **Digital experts:** persona cards and a chat with starters, streamed answers, "Tell me more" follow-ups and refusals.
- **Presenter:** a bottom bar with beats, spotlight and an assumptions note.

## Theme

- The Cloudera default is in `kit/themes/cloudera.css`:
  - primary `#120046`, accent `#FF550D`, secondary `#413CC3`;
  - Plus Jakarta Sans for Latin text, IBM Plex Sans Arabic for Arabic.
- These were taken from cloudera.com and are pending confirmation by Cloudera marketing. Change them only in the kit, never in a demo.
- **Co-branding** (wizard step 2): the customer logo replaces the Cloudera logo in the top bar, the customer accent replaces only the accent colour, and "Powered by Cloudera" shows in the footer. Layout, fonts and status colours never change.
- Status colours are fixed: normal green, watch amber, critical red. Never use the accent colour for status.

## When someone asks for a visual change

1. Check whether a pack setting covers it (title, subtitle, logo, accent, number of tiles, beats, `vocabulary`, `geo`). If it does, change the spec.
2. If it needs a new component or layout, don't build it in the demo. Explain that it belongs in the kit, so every demo gets it, and suggest raising it with the template owner.

## Screenshot review

With `npm run dev` running, run `node scripts/shots.mjs`, then open `shots/*.png` and check:

- the hero story is visible on the overview without scrolling;
- no text is cut off or overlapping in either language, and Arabic mirrors right-to-left;
- the map is zoomed to where the story happens and the bubbles match the tiles, or, without a map, the group tiles match the tiles;
- the UI uses the demo's own wording (for example "Branches", not "Sites") in both languages;
- the numbers in the tiles, the report count and the expert answers agree.
