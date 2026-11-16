---
name: demo-experts
description: How to write digital expert personas and their answers for a demo pack, including answer shape, grounding numbers in the data, Arabic phrasings, follow-ups and refusals. Use when writing or editing experts or answers in pack/demo-spec.json.
---

# Writing expert answers

The kit's answer engine (`kit/src/engine.ts`) routes a question to the answer whose `questions` phrasings best match it, after checking refusal keywords first. Answers are written, not generated, so they stay accurate on stage.

## Personas

- Two to four experts, each with a distinct job, such as operations now, asset health or customers.
- Use a first name and a role ("Sara, Network operations expert"). Never use a real person's name.
- `focus` is one sentence on what they are good for. It shows on their card.

## Answer shape

- **`lead`:** one sentence that answers the question directly, with the most important number.
- **`points`:** two to four short supporting sentences, each adding something new (cause, impact, action or timing).
- **`followUps`:** one or two answer ids that are the natural next questions. They show as "Tell me more" chips.
- Plain, executive language. No jargon without a gloss, no hedging, and no "As an AI".

## Grounding

- Every number comes from a placeholder: `{kpi.ID}` reads as "8 of 17 monitored sites", `{kpi.ID.value}` as "8", and `{fact.ID}` as "18,400 customers".
- Every site and region name comes from `{site.ID}` and `{region.ID}`.
- Times (09:15) and years (1990) may be typed in. The gates reject any other typed number.
- If the story needs a number that isn't a key figure, add it to `facts` with its source.

## Phrasings

- Three to five `questions` per answer: the scripted question, a short form, and a different wording.
- For bilingual packs, add at least one Arabic phrasing per answer, such as "ما الوضع الآن؟". Arabic questions only route to answers that have Arabic phrasings.
- Run `npm test` and `npm run gates`. The presenter gate proves every scripted question still reaches its answer.

## Refusals

- Keep the starter's refusal topics (tariffs, named employees, unannounced plans) unless the customer asks otherwise. Add customer-specific ones as keyword lists in both languages.
- The refusal `reply` says briefly what the experts *can* help with.

## Starter answers per expert

Cover:

- "what needs attention now";
- the hero incident in detail;
- the chronic problem;
- one key figure trend;
- one "what should we do" answer.
