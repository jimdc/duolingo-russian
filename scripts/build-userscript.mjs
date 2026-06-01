// Bundle the packaging-agnostic src/ modules into a single installable userscript.
// Single source of truth: src/*.js. We strip ESM import/export and append a browser
// entry. The lexicons are NOT inlined — they ship as Tampermonkey @resource files
// (downloaded + cached once at install), so the userscript itself stays tiny.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const stripModule = (s) =>
  s.replace(/^\s*import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');

// Order matters: ru-gender (normalize) and colorize (wordGroups) before the
// modules that use them (lexicon, stress).
const gender = stripModule(read('src/ru-gender.js'));
const colorize = stripModule(read('src/colorize.js'));
const lexicon = stripModule(read('src/lexicon.js'));
const stress = stripModule(read('src/stress.js'));
const ui = stripModule(read('src/ui.js'));
const modules = [gender, colorize, lexicon, stress, ui];

const RAW = 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data';
const LEX_URL = `${RAW}/ru-gender-lexicon.json`;
const STRESS_URL = `${RAW}/ru-stress-lexicon.json`;

const header = `// ==UserScript==
// @name         Duolingo Russian — gender + stress
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.3.0
// @description  Colour Russian words on Duolingo by grammatical gender (masc/fem/neuter) and mark stress (ударение), from an OpenRussian lexicon so declined forms work.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @resource     lexicon ${LEX_URL}
// @resource     stress ${STRESS_URL}
// @match        https://*.duolingo.com/*
// @run-at       document-idle
// @grant        GM_getResourceText
// ==/UserScript==`;

const entry = `
/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
  const URLS = { lexicon: '${LEX_URL}', stress: '${STRESS_URL}' };
  let LEX = null, STRESS = null;
  const lookup = (w) => lexiconGender(w, LEX);

  // Load a @resource (cached, offline) or, failing that, fetch raw GitHub (CORS *).
  function loadResource(name, build, assign) {
    try {
      if (typeof GM_getResourceText === 'function') {
        const txt = GM_getResourceText(name);
        if (txt) { assign(build(JSON.parse(txt))); return; }
      }
    } catch (e) { console.warn('[duolingo-russian] resource ' + name + ' failed, will fetch', e); }
    fetch(URLS[name]).then((r) => r.json()).then((j) => assign(build(j)))
      .catch((e) => console.warn('[duolingo-russian] fetch ' + name + ' failed', e));
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
    if (!LEX || !STRESS) return; // wait until both lexicons are ready
    for (const ch of document.querySelectorAll('[data-test^="challenge challenge-"]')) {
      if (ch.dataset.rgDone) continue;
      const colored = colorizeChallenge(ch, { genderOf: lookup });
      const stressed = markStress(ch, STRESS);
      if (colored.length || stressed.length) ch.dataset.rgDone = '1';
    }
  }

  loadResource('lexicon', makeLexicon, (v) => { LEX = v; });
  loadResource('stress', makeStress, (v) => { STRESS = v; });
  setInterval(tick, 400);
  console.log('[duolingo-russian] active (gender + stress)');
})();
`;

const out = [header, '', ...modules, entry].join('\n');

// Sanity: no ESM leftovers should reach the userscript.
if (/^\s*(export|import)\s/m.test(modules.join('\n'))) {
  throw new Error('build: leftover export/import in bundled modules');
}

mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/duolingo-russian.user.js', root), out);
console.log('wrote dist/duolingo-russian.user.js (' + out.length + ' bytes)');
