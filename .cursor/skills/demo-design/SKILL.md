---
name: demo-design
description: Look-and-feel rules for Cloudera executive demos, including the standard views, theme, co-branding and screenshot review. Use when reviewing how a demo looks, changing branding, or when someone asks for a layout or visual change.
---

# Demo design

## The standard pages (kit/src/pages, kit/src/features)

The shell (`kit/src/app/`) has a navy sidebar with "Powered by Cloudera", and a top bar with the *Today's report* / *With Digital Experts* mode, the time window and the clock (Real time or Replay). The sidebar shows a page only when the pack has its data (`kit/src/app/pages.ts`); `hidePages` hides one on purpose.

- **Digital experts** (`/`): portrait cards with availability, categories and tags; an intro page; a chat workspace where the expert's team of AI specialists works visibly on each answer, with a context panel, voice and read-aloud.
- **Executive overview** (`/overview`): alert banners, four key-figure tiles with sparklines and the change against one hour earlier, a live map (status shading, region bubbles, markers, metric layers, 3D), and priority insights. In *Today's report* mode it becomes the counts-only report from `report.records`.
- **Incidents & sites** (`/sites`): incident cards and the site register; clicking a site opens the investigation (readings against limits, charts, evidence, timelines).
- **Response planning** (`/planning`, needs `planning`): budget, window and scenario, the recommended plan, curves, exclusions, a what-if, assigned actions.
- **Executive briefs** (`/briefs`), **Technology architecture** (`/architecture`, Cloudera platform layers fixed by the kit, customer sources from `architecture`), **Command wall** (`/wall`) and **Executive pack** (`/pack`).
- **Without a map** (no `geo` in the spec), every map is replaced by group tiles (`GroupGrid`): one tile per region, shaded by its worst status, with "N of M need attention" and up to three flagged sites. Presenter beats can spotlight `group-grid` instead of `region-map`.
- **Wording:** the spec's `vocabulary` renames "Site", "Region" and "Asset type" everywhere in the UI (navigation, headers, filters, search, legend). Change wording there, never in components.
- **Presenter:** a bottom teleprompter with stories, beats, spotlight and an assumptions note.

## Theme

- The Cloudera default is in `kit/themes/cloudera.css`:
  - primary `#120046`, accent `#FF550D`, secondary `#413CC3`;
  - Plus Jakarta Sans for Latin text, IBM Plex Sans Arabic for Arabic.
- These were taken from cloudera.com and are pending confirmation by Cloudera marketing. Change them only in the kit, never in a demo.
- **Co-branding** (wizard step 2): the customer logo replaces the Cloudera logo in the top bar, the customer accent replaces only the accent colour, and "Powered by Cloudera" stays in the sidebar. Layout, fonts and status colours never change.
- Status colours are fixed: normal green, watch amber, critical red. Never use the accent colour for status.

## When someone asks for a visual change

1. Check whether a pack setting covers it (title, subtitle, logo, accent, number of tiles, beats, `vocabulary`, `geo`). If it does, change the spec.
2. If it needs a new component or layout, don't build it in the demo. Explain that it belongs in the kit, so every demo gets it, and suggest raising it with the template owner.

## Screenshot review

With `npm run dev` running, run `node scripts/shots.mjs`, then open `shots/*.png` and check:

- the hero story is visible on the overview without scrolling, and the top bar fits without clipping;
- no text is cut off or overlapping in either language, and Arabic mirrors right-to-left;
- the map is zoomed to where the story happens and the bubbles match the tiles, or, without a map, the group tiles match the tiles;
- the UI uses the demo's own wording (for example "Branches", not "Sites") in both languages;
- the numbers in the tiles, the report count and the expert answers agree.
