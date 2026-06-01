// Bundle the packaging-agnostic src/ modules into a single installable userscript.
// Single source of truth: src/ru-gender.js + src/colorize.js. We just strip the
// ESM `export` keywords (the modules have no imports) and append a browser entry.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const stripExports = (s) => s.replace(/^export\s+/gm, '');

const gender = stripExports(read('src/ru-gender.js'));
const colorize = stripExports(read('src/colorize.js'));
const ui = stripExports(read('src/ui.js'));

const header = `// ==UserScript==
// @name         Duolingo Russian — gender colors
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.1.1
// @description  Colour Russian words on Duolingo by grammatical gender (masc/fem/neuter). Stress marks (ударение) coming next.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @match        https://*.duolingo.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==`;

const entry = `
/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
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
    for (const ch of document.querySelectorAll('[data-test^="challenge challenge-"]')) {
      if (ch.dataset.rgDone) continue;
      const applied = colorizeChallenge(ch, { genderOf });
      if (applied.length) ch.dataset.rgDone = '1';
    }
  }

  setInterval(tick, 400);
  console.log('[duolingo-russian] gender colors active');
})();
`;

const out = [header, '', gender, colorize, ui, entry].join('\n');

// Sanity: no ESM leftovers should reach the userscript.
if (/^\s*(export|import)\s/m.test([gender, colorize, ui].join('\n'))) {
  throw new Error('build: leftover export/import in bundled modules');
}

mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/duolingo-russian.user.js', root), out);
console.log('wrote dist/duolingo-russian.user.js (' + out.length + ' bytes)');
