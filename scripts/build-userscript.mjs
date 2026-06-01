// Bundle the packaging-agnostic src/ modules into a single installable userscript.
// Single source of truth: src/*.js. We strip ESM import/export and append a browser
// entry. The lexicons are fetched at runtime (GM_xmlhttpRequest, with progress) and
// cached in IndexedDB, so they download ONCE ever and the legend shows progress.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const size = (p) => statSync(new URL(p, root)).size;
const stripModule = (s) =>
  s.replace(/^\s*import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');

// Order: ru-gender (normalize) + colorize (wordGroups) before modules that use them.
const modules = [
  'src/ru-gender.js', 'src/colorize.js', 'src/lexicon.js',
  'src/stress.js', 'src/verbs.js', 'src/ui.js',
].map((p) => stripModule(read(p)));

const RAW = 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data';
const LEX_URL = `${RAW}/ru-gender-lexicon.json`;
const STRESS_URL = `${RAW}/ru-stress-lexicon.json`;
const VERB_URL = `${RAW}/ru-verb-lexicon.json`;
const TOTAL =
  size('src/data/ru-gender-lexicon.json') +
  size('src/data/ru-stress-lexicon.json') +
  size('src/data/ru-verb-lexicon.json');

const header = `// ==UserScript==
// @name         Duolingo Russian — gender, stress & verb tense
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.4.0
// @description  On Duolingo Russian: colour nouns/adjectives by gender, verbs by tense, and mark stress (ударение). Data from OpenRussian, cached locally so it downloads once.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @match        https://*.duolingo.com/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @connect      raw.githubusercontent.com
// ==/UserScript==`;

const entry = `
/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
  const VER = '0.4.0';
  const SRC = { lexicon: '${LEX_URL}', stress: '${STRESS_URL}', verb: '${VERB_URL}' };
  const TOTAL = ${TOTAL};
  const state = { lexicon: null, stress: null, verb: null };
  const loaded = {};
  let failed = false;
  const bytes = () => (loaded.lexicon || 0) + (loaded.stress || 0) + (loaded.verb || 0);

  // ---- IndexedDB cache (best-effort: download once, ever) ----
  const DBN = 'duo-russian', STORE = 'lex';
  function openDB() {
    return new Promise(function (resolve, reject) {
      try {
        const req = indexedDB.open(DBN, 1);
        req.onupgradeneeded = function () {
          if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
        };
        req.onsuccess = function () { resolve(req.result); };
        req.onerror = function () { reject(req.error); };
      } catch (e) { reject(e); }
    });
  }
  function idbGet(key) {
    return openDB().then(function (db) {
      return new Promise(function (resolve) {
        const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
        r.onsuccess = function () { resolve(r.result || null); };
        r.onerror = function () { resolve(null); };
      });
    }).catch(function () { return null; });
  }
  function idbSet(key, val) {
    openDB().then(function (db) {
      db.transaction(STORE, 'readwrite').objectStore(STORE).put(val, key);
    }).catch(function () {});
  }

  // CSP-safe cross-origin GET with progress; falls back to page fetch (console use).
  function download(name) {
    const url = SRC[name];
    return new Promise(function (resolve, reject) {
      if (typeof GM_xmlhttpRequest === 'function') {
        GM_xmlhttpRequest({
          method: 'GET', url: url,
          onprogress: function (e) { loaded[name] = e.loaded || 0; },
          onload: function (r) { loaded[name] = (r.responseText || '').length; resolve(r.responseText); },
          onerror: function () { reject(new Error('xhr ' + name)); },
        });
      } else {
        fetch(url).then(function (r) { return r.text(); }).then(resolve, reject);
      }
    });
  }
  function loadOne(name, build) {
    const key = name + '@' + VER;
    return idbGet(key).then(function (cached) {
      if (cached) return cached;
      return download(name).then(function (txt) { const o = JSON.parse(txt); idbSet(key, o); return o; });
    }).then(function (o) { return build(o); });
  }
  function loadAll() {
    Promise.all([
      loadOne('lexicon', makeLexicon).then(function (v) { state.lexicon = v; }),
      loadOne('stress', makeStress).then(function (v) { state.stress = v; }),
      loadOne('verb', makeVerbTense).then(function (v) { state.verb = v; }),
    ]).catch(function (e) { failed = true; console.warn('[duolingo-russian] load failed', e); });
  }
  const ready = () => state.lexicon && state.stress && state.verb;

  const KEY_HTML =
    'gender <span class="m">m</span> <span class="f">f</span> <span class="n">n</span>' +
    ' · tense <span class="pa">past</span> <span class="pr">pres</span> <span class="fu">fut</span> <span class="im">imp</span> <span class="in">inf</span>' +
    ' · +stress';
  function legendHtml() {
    if (ready()) return KEY_HTML;
    if (failed) return 'RU helper — download failed; reload to retry';
    return 'RU helper — loading dictionaries ' + (bytes() / 1e6).toFixed(1) +
      ' / ~' + (TOTAL / 1e6).toFixed(0) + ' MB (one-time, then cached)';
  }

  const STYLE = [
    '.rg-masc{color:#1565c0!important} .rg-fem{color:#c2185b!important} .rg-neut{color:#2e7d32!important}',
    '.rg-past{color:#e65100!important} .rg-pres{color:#00838f!important} .rg-fut{color:#6a1b9a!important} .rg-imp{color:#5d4037!important} .rg-inf{color:#455a64!important}',
    '#rg-legend{position:fixed;left:12px;bottom:12px;z-index:99999;font:12px/1.5 system-ui,sans-serif;background:rgba(255,255,255,.96);color:#333;border:1px solid #ddd;border-radius:8px;padding:5px 10px;box-shadow:0 1px 4px rgba(0,0,0,.15);pointer-events:none;max-width:70vw}',
    '#rg-legend .m{color:#1565c0}#rg-legend .f{color:#c2185b}#rg-legend .n{color:#2e7d32}#rg-legend .pa{color:#e65100}#rg-legend .pr{color:#00838f}#rg-legend .fu{color:#6a1b9a}#rg-legend .im{color:#5d4037}#rg-legend .in{color:#455a64}',
  ].join('\\n');

  function tick() {
    ensureStyle(document, STYLE);
    setLegend(document, legendHtml());
    if (!ready()) return;
    for (const ch of document.querySelectorAll('[data-test^="challenge challenge-"]')) {
      if (ch.dataset.rgDone) continue;
      const g = colorizeChallenge(ch, { genderOf: function (w) { return lexiconGender(w, state.lexicon); } });
      const v = colorizeVerbs(ch, { tenseOf: function (w) { return verbTenseOf(w, state.verb); } });
      const s = markStress(ch, state.stress);
      if (g.length || v.length || s.length) ch.dataset.rgDone = '1';
    }
  }

  loadAll();
  setInterval(tick, 400);
  console.log('[duolingo-russian] active (gender + stress + verb tense)');
})();
`;

const out = [header, '', ...modules, entry].join('\n');
if (/^\s*(export|import)\s/m.test(modules.join('\n'))) {
  throw new Error('build: leftover export/import in bundled modules');
}
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/duolingo-russian.user.js', root), out);
console.log('wrote dist/duolingo-russian.user.js (' + out.length + ' bytes)');
