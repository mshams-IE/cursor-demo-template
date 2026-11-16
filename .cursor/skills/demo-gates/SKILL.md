---
name: demo-gates
description: How to run the demo quality gates and fix each kind of failure (names, units, numbers, languages, sources, status, presenter, brand). Use when a gate fails, when CI fails on a demo pull request, or before calling a demo done.
---

# Demo gates

```bash
npm run gates                    # full check of pack/demo-spec.json, exits 1 on any error
npm run gates:spec -- --step 4   # wizard mode: only steps 1 to 4 that are marked completed
npm run gates:samples            # pack plus every samples/*/demo-spec.json
npm run check                    # typecheck + lint + unit tests + full gates
npx playwright test              # browser checks: views, units on tiles, cross-view agreement, presenter, refusals
node scripts/shots.mjs           # screenshots of every view in every language (needs npm run dev)
```

CI (`.github/workflows/gates.yml`) runs all of these on every pull request and attaches the screenshots.

## Fixing each gate

| Gate | Typical error | Fix |
|---|---|---|
| Wizard steps complete | Steps not finished | Finish the wizard, or say which step is left |
| Ids and references resolve | Unknown region, type or site; duplicate id | Fix the id in the spec. Renaming an id means updating every `{site.ID}` |
| Ids and references resolve | Unknown boundary set; region has no geoId; site has no coordinates | With a map, fix `geo`, `geoId` or `coordinates`. For a demo without a map, remove `geo` |
| Ids and references resolve | Vocabulary needs a term; type without typePlural | Fill all four of `entity`, `entityPlural`, `group` and `groupPlural`, and give `type` and `typePlural` together |
| Every text is in every pack language | Missing Arabic for "…" | Add the `ar` text. Arabic is reviewed for meaning, not machine-translated word for word |
| One spelling per name | Same name spelled differently; "X" should be spelled "Y" | Pick the spelling the customer uses, keep it once in the spec, and use `{site.ID}` in text |
| Every key figure states its unit and basis | Count without an "of N" basis; no unit | Add `of`, or `derive` it from sites; add `unit` |
| Numbers come from the data | "18,000" is typed in | Replace it with `{fact.ID}` or `{kpi.ID}`, adding a fact if needed |
| Every value says where it came from | Assumed value has no reason; customer name assumed | Add `why`; use "Customer" until the name is given |
| Every flagged site says why | Site is critical but has no note | Add a one-line `note` |
| Presenter questions give the scripted answers | "Q" gets "fallback" instead of "now" | Add the question's wording to that answer's `questions` |
| Brand stays within the kit rules | Accent close to a status colour | Choose a different accent, or keep the Cloudera accent |

Warnings don't fail the build, but mention them when you report.

## Why these gates exist

They encode failures found while building the first executive demo:

- one site named two ways in two views;
- counts shown without saying "of how many";
- a map bubble counting a different thing from the tile next to it;
- answers quoting numbers that no longer matched the data after a change;
- presenter lines that stopped matching the live answers.
