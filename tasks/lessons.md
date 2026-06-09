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

## Paint-once latch left the assembled answer bare (2026-06-08)
**Symptom (report + screenshot):** in a word-bank "Write this in Russian", the bank tiles were coloured/stressed but the **answer area** (the words you tap into the sentence) had no gender, no stress, and no schwa — and reduction looked "off" even though it's default-on.
**Cause:** the entry's `tick()` set `ch.dataset.rgDone='1'` after the first successful paint and `continue`d past that challenge forever. The first paint hits the bank; the tiles Duolingo later mounts in the answer area (and any React re-render) were fresh, unpainted nodes the latch never revisited. The defect lived in the **untested build-script entry** (cf. "Browser-glue needs tests too").
**Fix / rule:** drop the per-challenge latch — re-run every tick. Every step is idempotent at the element level (stress bails on an existing acute, class-adders are no-ops on repeat, reduction bails on an existing `.rg-rd`), so re-painting fresh nodes never doubles a mark. Extracted the sequence into a tested `src/annotate.js` (`annotateChallenge`/`annotateAll`) so the entry can't drift; `tests/reannotate.test.js` pins the "tiles added after the first paint get painted, without doubling" contract. **Rule:** on a polled React page, annotation must be re-asserting and idempotent, never paint-once.

## Coloring leaked answers in "Repeat what you hear" (2026-06-08)
**Symptom (report + screenshot):** in a listen-and-repeat reveal exercise, our colour/stress **revealed** the in-lexicon words (`Тури́сты`, `экску́рсии`) of a sentence that was supposed to stay hidden until REVEAL; the one out-of-lexicon word stayed blank.
**Cause:** the masked words' real Cyrillic letters are in the DOM but hidden by style (transparent/visibility/opacity). We deduced it's CSS masking, not underscore substitution: we only paint words whose spans hold Cyrillic *and* match the lexicon, so for them to paint the real letters must be present. Our `color … !important` then overrode the mask.
**Fix / rule:** gate `wordGroups` with an injectable visibility predicate (`setHiddenCheck`); skip any word currently masked. The check needs layout, so the entry injects a `getComputedStyle` predicate (visibility/display/opacity + alpha-0 colour); the pure core stays headless-testable with the predicate unset (`tests/hidden.test.js`). **Rule:** before painting page text with `!important`, check the site isn't deliberately hiding it — overriding a mask can leak answers.

## Visual test caught a homograph on its first run (2026-06-01)
The Tier-1 visual renderer (`scripts/visual/render.mjs`, real Chrome via `playwright-core` `channel:'chrome'`) immediately surfaced that **`мою`** rendered as feminine (red) not present-tense verb (teal): it's a homograph — "I wash" (мыть) vs "my" (мой, fem acc) — and gender lookup wins over verb-tense. Context-free lookup can't disambiguate; documented as a known limitation. **Rule:** a screenshot the model can actually read back is worth building — it finds rendering/semantic issues unit tests don't. `playwright-core` + `channel:'chrome'` avoids the ~120MB Chromium download.
