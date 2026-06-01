// Bundle the packaging-agnostic src/ modules into a single installable userscript.
// Single source of truth: src/*.js. We strip ESM import/export and append a browser
// entry. The gender lexicon is NOT inlined — it ships as a Tampermonkey @resource
// (downloaded + cached once at install), so the userscript itself stays tiny.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const stripModule = (s) =>
  s.replace(/^\s*import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');

// Order matters: normalize (ru-gender) before lexicon uses it.
const gender = stripModule(read('src/ru-gender.js'));
const lexicon = stripModule(read('src/lexicon.js'));
const colorize = stripModule(read('src/colorize.js'));
const ui = stripModule(read('src/ui.js'));

const LEX_URL =
  'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json';

const header = `// ==UserScript==
// @name         Duolingo Russian — gender colors
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.2.0
// @description  Colour Russian words on Duolingo by grammatical gender (masc/fem/neuter), using an OpenRussian lexicon so declined forms work. Stress marks (ударение) coming next.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @resource     lexicon ${LEX_URL}
// @match        https://*.duolingo.com/*
// @run-at       document-idle
// @grant        GM_getResourceText
// ==/UserScript==`;

const entry = `
/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
  const LEX_URL = '${LEX_URL}';
  let LEX = null;
  const lookup = (w) => lexiconGender(w, LEX);

  function loadLexicon() {
    try {
      if (typeof GM_getResourceText === 'function') {
        const txt = GM_getResourceText('lexicon');
        if (txt) { LEX = makeLexicon(JSON.parse(txt)); return; }
      }
    } catch (e) { console.warn('[duolingo-russian] resource load failed, will fetch', e); }
    // Fallback (console-paste / no grant): raw GitHub sends CORS *, so a page fetch works.
    fetch(LEX_URL).then((r) => r.json()).then((j) => { LEX = makeLexicon(j); })
      .catch((e) => console.warn('[duolingo-russian] lexicon fetch failed', e));
  }

  const STYLE = [
    '.rg-masc { color: #1565c0 !important; }',
    '.rg-fem  { color: #c2185b !important; }',
    '.rg-neut { color: #2e7d32 !important; }',
    '#rg-legend { position: fixed; left: 12px; bottom: 12px; z-index: 99999;',
    '  font: 12px/1.4 system-ui, sans-serif; background: rgba(255,255,255,.95);',
    '  color: #333; border: 1px solid #ddd; border-radius: 8px; padding: 5px 10px;',
    '  box-shadow: 0 1px 4px rgba(0,0,0,.15); pointer-events: none; }',
    '#rg-legend .m { color: #1565c0; } #rg-legend .f { color: #c2185b; } #rg-legend .n { color: #2e7d32; }',
  ].join('\\n');

  function tick() {
    ensureStyle(document, STYLE);
    ensureLegend(document);
    if (!LEX) return; // hold off colouring until the lexicon is ready
    for (const ch of document.querySelectorAll('[data-test^="challenge challenge-"]')) {
      if (ch.dataset.rgDone) continue;
      const applied = colorizeChallenge(ch, { genderOf: lookup });
      if (applied.length) ch.dataset.rgDone = '1';
    }
  }

  loadLexicon();
  setInterval(tick, 400);
  console.log('[duolingo-russian] active (lexicon-backed gender)');
})();
`;

const out = [header, '', gender, lexicon, colorize, ui, entry].join('\n');

// Sanity: no ESM leftovers should reach the userscript.
if (/^\s*(export|import)\s/m.test([gender, lexicon, colorize, ui].join('\n'))) {
  throw new Error('build: leftover export/import in bundled modules');
}

mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/duolingo-russian.user.js', root), out);
console.log('wrote dist/duolingo-russian.user.js (' + out.length + ' bytes)');
