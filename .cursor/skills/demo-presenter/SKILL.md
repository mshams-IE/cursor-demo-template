---
name: demo-presenter
description: How to write the presenter beats and teleprompter story for a demo, and check that every scripted question still produces its answer. Use when writing presenter beats, a demo script or a teleprompter in pack/demo-spec.json.
---

# Presenter beats

The presenter bar (clapperboard button in the top bar) walks through `presenter.beats`. Each beat can:

- switch the view (`view`);
- zoom the map to a region, or select its group tile when there is no map (`regionId`);
- spotlight one element (`spotlight`);
- ask an expert a scripted question (`ask`).

## The story arc (five to seven beats)

1. **At a glance.** Overview, spotlight `kpi-row`. One sentence with the two most important key figures.
2. **Where.** Overview, `regionId` set, spotlight `region-map` (or `group-grid` without a map). Where the trouble is.
3. **The hero incident.** Spotlight `incident-<id>`. What happened and who is affected.
4. **Ask the expert.** Experts view, spotlight `expert-chat`, with an `ask` for the hero question, so the answer appears live.
5. **One register.** Report view, spotlight `report-table`. The same data behind every view.
6. **The recurring problem.** Ask the asset expert the chronic question.
7. Optional: **what to do next**, or the business value.

## Rules

- `narration` is what the presenter says: one or two spoken sentences. Numbers and names come from placeholders, as in answers.
- `spotlight` must be a kit element:
  - `kpi-row`, `kpi-<id>`, `region-map`, `map-legend`, `group-grid`, `group-<regionId>`, `incident-list`, `incident-<id>`;
  - `report-filters`, `report-table`, `expert-cards`, `expert-card-<id>`, `expert-chat`, `chat-input`.
- `ask.question` is written exactly as the presenter will type or say it, in each language. `ask.answerId` is the answer it must produce. `npm run gates` fails if the question routes anywhere else.
- Check the presenter bar's assumptions note (clipboard icon) before presenting. Never claim an assumed value as a customer fact.

## Rehearsal check

With `npm run dev` running, run `npx playwright test -g presenter`. It steps through every beat and confirms each `ask` beat shows an answer.
