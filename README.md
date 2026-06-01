# duolingo-russian

A userscript that annotates the **Russian** course on Duolingo's web app. Right now it **colours words by grammatical gender**; **stress marks (ударение)** and case hints are next.

🔵 masculine &nbsp;·&nbsp; 🔴 feminine &nbsp;·&nbsp; 🟢 neuter &nbsp;·&nbsp; function words left alone

> Formerly **gender-reveal** → **declension-highlighter**. Rewritten in 2026 for Russian — the original colored seven other languages by scraping Duolingo's old hover-hints, which no longer carry gender (or exist in that form).

## Install

With [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/) installed, click:

### → [Install the userscript](https://github.com/jimdc/duolingo-russian/raw/master/dist/duolingo-russian.user.js)

Then open a Russian lesson on duolingo.com. It self-updates via `@updateURL`.

> **Chrome gotcha (2024+):** Chrome won't run userscripts until you allow them. Go to `chrome://extensions`, toggle **Developer mode** on (top-right), open Tampermonkey's **Details**, and enable **Allow User Scripts**. Otherwise the script installs but never runs.

## How it works

Duolingo no longer exposes grammatical gender (its hints only carry translations), so gender is **derived locally**:

1. Read the prompt words from `[data-test="hint-token"]` aria-labels.
2. Group the rendered per-character spans into words.
3. `genderOf(word)` — ending rules (`-а/-я`→fem, `-о/-е`→neut, consonant→masc) plus exception lists for what endings get wrong (`папа`→masc, `время`→neuter, soft-sign `-ь` nouns) and a function-word stoplist so `где`/`и` aren't coloured.
4. Add a gender CSS class to each word's Cyrillic letters.

The core in `src/` is packaging-agnostic; a build step bundles it into the userscript, so the same code can be emitted as an MV3 extension later.

## Develop

```sh
npm install
npm test          # node --test — 15 tests, incl. real captured-DOM fixtures
npm run build     # bundle src/ → dist/duolingo-russian.user.js
```

| Path | What |
|---|---|
| `src/ru-gender.js` | gender from a surface word form |
| `src/extract-russian.js` | pull prompt words from a challenge |
| `src/colorize.js` | apply gender classes in the DOM |
| `tests/fixtures/` | real Duolingo Russian challenge captures |
| `scripts/build-userscript.mjs` | the bundler |

## Roadmap

- **Stress marks (ударение)** + lexicon-accurate gender via [OpenRussian](https://github.com/Badestrand/russian-dictionary) (CC-BY-SA 4.0)
- Case / declension hints; ё vs е; verb aspect pairs
- Colour Russian word-bank tiles in EN→RU exercises
- Optional MV3 extension build

## License

MIT (code) — see [LICENSE](LICENSE). Bundled language data, once added, carries its own license (OpenRussian is CC-BY-SA 4.0).
