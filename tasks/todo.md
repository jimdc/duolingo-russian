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
- [ ] **Verify live:** install from the GitHub URL, confirm gender colors on a real Russian lesson ← needs James
  - On new releases: bump `@version` in `scripts/build-userscript.mjs`, `npm run build`, commit+push → Tampermonkey offers the update
- [ ] EN→RU word-bank capture (Russian *tiles*) to extend coloring to tap tokens
- [ ] (optional) emit an MV3 unpacked extension from the same core

## Phase 2 — Russian gender
- [ ] Ending-based gender heuristic (-а/-я fem, -о/-е neut, consonant masc)
- [ ] Exception list (папа/дядя masc, -мя neuters, soft-sign -ь ambiguity)
- [ ] Color words by gender (existing blue/pink/green convention)

## Phase 3 — Stress (ударение)  ← highest-value feature
- [ ] Choose a stress data source (Wiktionary dump / OpenRussian) — log provenance
- [ ] Bundle a lemma→stress lexicon; map inflected forms where feasible
- [ ] Render accent overlay on the stressed vowel (о́, е́, …)
- [ ] Handle multiple/ambiguous stress and stress that shifts with case

## Phase 4 — Other features
- [ ] Case / declension annotation (the original stated goal)
- [ ] ё vs е disambiguation
- [ ] Verb aspect pairs (perfective/imperfective)

## Housekeeping
- [ ] Update `README.md` (still says `gender-reveal`)
- [ ] Optionally rename internal files + GitHub repo `declension-highlighter` → `duolingo-russian`
- [ ] Delete/retire dead 2018 files once the rewrite lands (keep in git history)
