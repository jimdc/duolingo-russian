# Lessons

## The ending heuristic can't do inflected Russian (2026-06-01)
**Symptom (two reports):** in «Дай мне красную сумку, пожалуйста» and «…синюю чашку…», verbs/particles got colored (Дай→blue, пожалуйста→red) while real nouns/adjectives in oblique cases did NOT (красную, сумку, синюю, чашку stayed black).
**Cause:** `genderOf` uses **nominative-singular** endings, but Duolingo shows words in every case. Oblique endings (`-у/-ю/-ью`, infinitive `-ть`…) → `Unknown` (false negatives); coincidental `-й/-а/-о` on non-nouns (Дай, надо, пожалуйста) → wrong gender (false positives).
**Fix / rule:** lexicon-first via **OpenRussian** wordform→gender (every declension cell, incl. adjective decl_{m,f,n}_* and short forms). Color **only** dictionary-known noun/adjective forms; words not in the dict stay uncolored. Under-color beats mis-color. The bare heuristic is demoted to a fallback (or off). Anticipated in CLAUDE.md "Strategy shift".

## Browser-glue needs tests too (2026-06-01)
**Symptom:** gender colors worked live, but the "RU gender" legend never appeared.
**Cause:** a shared `inject()` helper appended *everything* to `document.head` — correct for `<style>`, but a `<div>` in `<head>` is invisible. The bug lived in the build-script entry string, which had **no tests**.
**Fix / rule:** keep DOM mount logic in a unit-testable module (`src/ui.js`): `ensureStyle → <head>`, `ensureLegend → <body>`, with a regression test on the mount target.

## The real install blocker on Chrome is "Allow User Scripts" (2026-06-01)
Chrome (2024+) silently won't run userscripts until `chrome://extensions` → Developer mode + the extension's **Allow User Scripts** toggle is on. `scriptRan: false` while the page DOM is correct = this, not a code bug. Documented in README.

## Visual test caught a homograph on its first run (2026-06-01)
The Tier-1 visual renderer (`scripts/visual/render.mjs`, real Chrome via `playwright-core` `channel:'chrome'`) immediately surfaced that **`мою`** rendered as feminine (red) not present-tense verb (teal): it's a homograph — "I wash" (мыть) vs "my" (мой, fem acc) — and gender lookup wins over verb-tense. Context-free lookup can't disambiguate; documented as a known limitation. **Rule:** a screenshot the model can actually read back is worth building — it finds rendering/semantic issues unit tests don't. `playwright-core` + `channel:'chrome'` avoids the ~120MB Chromium download.
