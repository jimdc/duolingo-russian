# duolingo-russian — todo

Expansion of the old `gender-reveal` / `declension-highlighter` userscript for Russian.

## Phase 0 — Revive/diagnose ✅ DONE (2026-06-01)
- [x] Read the 2018 source; identify what it hooks
- [x] Check against current Duolingo web (React) DOM + data sources
- [x] Decision: **rewrite, not patch** — see CLAUDE.md "Phase 0 outcome"
  - All selectors are dead hashed class names; never colored on current site
  - Hint tables no longer carry gender → must derive gender locally
  - Cleaner source found: intercept `/2017-06-30/sessions` JSON via `duo-toolbox`

## Phase 1 — Rewrite scaffold (new architecture)
- [~] Capture real Russian challenge DOM (ground-truth fixture) ← in progress
  - [x] `tests/fixtures/ru-speak-challenge.json` — a `challenge-speak` exercise ("Там большое, синее и красивое море!")
  - CONFIRMED: `data-test="hint-token"` is real; each word is in its `aria-label` (clean per-word extraction, no char-span reassembly needed for word boundaries)
  - CONFIRMED dead: none of the 2018 hashes (`_1Y5M_`, `_3_AmQ`, …) appear; current hashes are different (`_2IGwo`, `tFegI`, `_33wyM`) → empirical proof old script matches nothing
  - KEY SIMPLIFICATION: gender + stress come from our OWN lexicon, so we likely DON'T need `/sessions` JSON or hint popovers for the core feature — just locate + recolor the rendered Russian words
  - [x] `tests/fixtures/ru-translate-wordbank.json` — `challenge-translate` ("Где красное ведро?"); confirms `hint-token` aria-labels + `word-bank`/`challenge-tap-token-text` tiles
- [x] Reproduction test: old hashed selectors match nothing on both real captures (`tests/old-script-dead.test.js`) — 11/11 green
- [x] `src/extract-russian.js` — pull ordered Russian words from `hint-token` aria-labels (tested on both fixtures)
- [x] `src/ru-gender.js` — local gender heuristic (endings + -мя/-ь/natural-gender exceptions + function-word stoplist), tested
- [x] `src/colorize.js` — group prompt char-spans into words, add gender class to Cyrillic letters (15/15 tests on both fixtures)
- [x] **Prior-art check** — niche is UNFILLED; reuse OpenRussian (data) + duo-toolbox/solution-viewer (hooks ref). See CLAUDE.md "Prior art & reuse"
- [x] **Userscript build** — `scripts/build-userscript.mjs` bundles src/ → `dist/duolingo-russian.user.js` (`npm run build`); valid JS, injects style + legend, polls challenges
- [x] **Published** — repo renamed `declension-highlighter` → `jimdc/duolingo-russian`, pushed to master; userscript self-updates via `@updateURL`
  - Install: https://github.com/jimdc/duolingo-russian/raw/master/dist/duolingo-russian.user.js
- [x] **Verified live (2026-06-01):** masc/fem/neuter coloring confirmed on a real Russian lesson 🎉
  - GOTCHA (now in README): Chrome needs `chrome://extensions` → Developer mode + Tampermonkey → Details → **Allow User Scripts**, or the script installs but never runs
  - On new releases: bump `@version` in `scripts/build-userscript.mjs`, `npm run build`, commit+push → Tampermonkey offers the update
- [ ] EN→RU word-bank capture (Russian *tiles*) to extend coloring to tap tokens
- [ ] (optional) emit an MV3 unpacked extension from the same core

## Phase 2 — Russian gender ✅ (v0.2.0, 2026-06-01)
- [x] Ending heuristic shipped in v0.1 (`src/ru-gender.js`) — kept for `normalize()`, retired from live coloring
- [x] **Lexicon-backed gender** (`src/lexicon.js` + `scripts/build-lexicon.mjs`) from OpenRussian — 243k wordforms incl. all declension cells; colors only dict-confirmed noun/adjective forms
  - Fixes BOTH failure modes: declined forms now color (сумку, красную, чашку, синюю) AND non-nouns are skipped (Дай, мне, надо, помыть, пожалуйста)
  - Shipped as a Tampermonkey `@resource` (cached once, offline after) — userscript stays ~11KB
- [ ] Spot-check live across more lessons; note any miscolorings (OpenRussian CSV is slightly dirty)
- [ ] Homograph genders (same form, two genders) are dropped as ambiguous — revisit if it under-colors common words

## Phase 3 — Stress (ударение)  ← NEXT (data already in hand)
- OpenRussian gives the stressed form per cell (`accented` col, apostrophe notation: `су'мку` = сУ́мку). Same pipeline as gender.
- [ ] Extend `build-lexicon.mjs` to emit wordform → stress position (or accented form), reusing the case columns
- [ ] Render accent overlay on the stressed vowel (о́, е́, …) on the prompt char-spans
- [ ] Handle multiple/ambiguous stress (cells with comma alternatives) and stress that shifts with case

## Phase 4 — Other features
- [ ] Case / declension annotation (the original stated goal)
- [ ] ё vs е disambiguation
- [ ] Verb aspect pairs (perfective/imperfective)

## Phase 4 — Other features
- [ ] Case / declension annotation (the original stated goal)
- [ ] ё vs е disambiguation
- [ ] Verb aspect pairs (perfective/imperfective)

## Housekeeping
- [ ] Update `README.md` (still says `gender-reveal`)
- [ ] Optionally rename internal files + GitHub repo `declension-highlighter` → `duolingo-russian`
- [ ] Delete/retire dead 2018 files once the rewrite lands (keep in git history)
