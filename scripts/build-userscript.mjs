// Bundle the packaging-agnostic src/ modules into a single installable userscript.
// Single source of truth: src/*.js. We strip ESM import/export and append a browser
// entry. The lexicons are fetched at runtime (GM_xmlhttpRequest, with progress) and
// cached in IndexedDB, so they download ONCE ever and the legend shows progress.

import { readFileSync, writeFileSync, mkdirSync, statSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const size = (p) => statSync(new URL(p, root)).size;

// Single source of truth for the userscript @version: package.json. Bump it with
// `npm run release` (scripts/release.mjs), never by hand-editing the header below.
const VERSION = JSON.parse(read('package.json')).version;
const stripModule = (s) =>
  s.replace(/^\s*import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');

// Order: ru-gender (normalize) + colorize (wordGroups) before modules that use them;
// annotate pulls them all together, so it comes last (before ui).
const modules = [
  'src/stopwords.js', 'src/ru-gender.js', 'src/colorize.js', 'src/lexicon.js',
  'src/stress.js', 'src/verbs.js', 'src/reduce.js', 'src/annotate.js', 'src/ui.js',
].map((p) => stripModule(read(p)));

const RAW = 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data';
const LEX_URL = `${RAW}/ru-gender-lexicon.json`;
const STRESS_URL = `${RAW}/ru-stress-lexicon.json`;
const VERB_URL = `${RAW}/ru-verb-lexicon.json`;
const VERBMETA_URL = `${RAW}/ru-verbmeta-lexicon.json`;
const TOTAL =
  size('src/data/ru-gender-lexicon.json') +
  size('src/data/ru-stress-lexicon.json') +
  size('src/data/ru-verb-lexicon.json') +
  size('src/data/ru-verbmeta-lexicon.json');

const header = `// ==UserScript==
// @name         Duolingo Russian — gender, stress & verb tense
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      ${VERSION}
// @description  On Duolingo Russian: colour nouns/adjectives by gender, verbs by tense, mark stress (ударение), and predict vowel reduction (akanye/ikanye) — on the prompt AND the word-bank tiles. Data from OpenRussian, cached locally so it downloads once.
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
  const RG_VERSION = '${VERSION}'; // userscript @version (from package.json) — stamped onto <html data-rg-ver> + logged, so dev tooling can read what's actually running
  const VER = '0.4.0';
  const SRC = { lexicon: '${LEX_URL}', stress: '${STRESS_URL}', verb: '${VERB_URL}', verbmeta: '${VERBMETA_URL}' };
  const TOTAL = ${TOTAL};
  const state = { lexicon: null, stress: null, verb: null, verbMeta: null };
  const loaded = {};
  let failed = false;
  const bytes = () => (loaded.lexicon || 0) + (loaded.stress || 0) + (loaded.verb || 0) + (loaded.verbmeta || 0);

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
      loadOne('verbmeta', makeVerbMeta).then(function (v) { state.verbMeta = v; }),
    ]).catch(function (e) { failed = true; console.warn('[duolingo-russian] load failed', e); });
  }
  const ready = () => state.lexicon && state.stress && state.verb && state.verbMeta;

  const reduceOn = () => !!(document.body && document.body.classList.contains('rg-reduce'));
  const KEY_HTML =
    'gender <span class="m">m</span> <span class="f">f</span> <span class="n">n</span>' +
    ' · tense <span class="pa">past</span> <span class="pr">pres</span> <span class="fu">fut</span> <span class="im">imp</span> <span class="in">inf</span>' +
    ' · aspect <span class="asp">pf</span>/<span class="asp">ipf</span> · motion <span class="mot">→</span>uni<span class="mot">⇄</span>multi' +
    ' · +stress';
  const RED_ON =
    ' · reduce <span class="rda">ɐ</span><span class="rds">ə</span><span class="rdi">ɪ</span><span class="rdy">ɨ</span> <b>R</b>';
  const RED_OFF = ' · <span style="opacity:.65">vowel reduction off — <b>R</b></span>';
  function legendHtml() {
    if (ready()) return KEY_HTML + (reduceOn() ? RED_ON : RED_OFF);
    if (failed) return 'RU helper — download failed; reload to retry';
    return 'RU helper — loading dictionaries ' + (bytes() / 1e6).toFixed(1) +
      ' / ~' + (TOTAL / 1e6).toFixed(0) + ' MB (one-time, then cached)';
  }

  const STYLE = [
    '.rg-masc{color:#1565c0!important} .rg-fem{color:#c2185b!important} .rg-neut{color:#2e7d32!important}',
    '.rg-past{color:#e65100!important} .rg-pres{color:#00838f!important} .rg-fut{color:#6a1b9a!important} .rg-imp{color:#5d4037!important} .rg-inf{color:#455a64!important}',
    // Vowel-reduction hints: a small IPA superscript via ::after, shown only when on.
    'body.rg-reduce .rg-rd{border-bottom:1px dotted rgba(0,0,0,.3)}',
    'body.rg-reduce .rg-rd::after{content:attr(data-ipa);font-size:.6em;line-height:0;vertical-align:.5em;margin:0 .5px;opacity:.8;font-weight:700}',
    'body.rg-reduce .rg-rd-a::after{color:#b26a00} body.rg-reduce .rg-rd-schwa::after{color:#757575} body.rg-reduce .rg-rd-i::after{color:#00838f} body.rg-reduce .rg-rd-y::after{color:#6a1b9a}',
    // Verb-meta: a trailing superscript — aspect abbrev (pf/ipf) + motion arrow (→ one-way / ⇄ both ways).
    '.rg-vmeta{font-size:.62em;vertical-align:super;line-height:0;margin-left:1px;white-space:nowrap;font-weight:700}',
    '.rg-vmeta .rg-asp-pf,.rg-vmeta .rg-asp-ipf{color:#455a64}',
    '.rg-vmeta .rg-mot-uni,.rg-vmeta .rg-mot-multi{color:#00897b;margin-left:1px}',
    // Spent word-bank tiles (a tapped word's greyed placeholder) carry aria-disabled
    // and Duolingo renders their text transparent; yield our !important colour there
    // so the placed word doesn't look duplicated (we also stop annotating them, but a
    // tile painted while active keeps its class once it's spent — this covers that).
    '[aria-disabled="true"] .rg-masc,[aria-disabled="true"] .rg-fem,[aria-disabled="true"] .rg-neut,[aria-disabled="true"] .rg-past,[aria-disabled="true"] .rg-pres,[aria-disabled="true"] .rg-fut,[aria-disabled="true"] .rg-imp,[aria-disabled="true"] .rg-inf{color:inherit!important}',
    '[aria-disabled="true"] .rg-rd::after{display:none!important}',
    '[aria-disabled="true"] .rg-vmeta{display:none!important}', // don't float a marker on a spent placeholder
    '#rg-legend{position:fixed;left:12px;bottom:12px;z-index:99999;font:12px/1.5 system-ui,sans-serif;background:rgba(255,255,255,.96);color:#333;border:1px solid #ddd;border-radius:8px;padding:5px 10px;box-shadow:0 1px 4px rgba(0,0,0,.15);max-width:70vw;cursor:pointer;user-select:none}',
    '#rg-legend .m{color:#1565c0}#rg-legend .f{color:#c2185b}#rg-legend .n{color:#2e7d32}#rg-legend .pa{color:#e65100}#rg-legend .pr{color:#00838f}#rg-legend .fu{color:#6a1b9a}#rg-legend .im{color:#5d4037}#rg-legend .in{color:#455a64}',
    '#rg-legend .asp{color:#455a64;font-weight:700}#rg-legend .mot{color:#00897b;font-weight:700}',
    '#rg-legend .rda{color:#b26a00}#rg-legend .rds{color:#757575}#rg-legend .rdi{color:#00838f}#rg-legend .rdy{color:#6a1b9a}',
  ].join('\\n');

  function toggleReduce() {
    if (!document.body) return;
    document.body.classList.toggle('rg-reduce');
    setLegend(document, legendHtml());
  }
  // Toggle with the R key (Latin R or Cyrillic К on the same physical key)…
  document.addEventListener('keydown', function (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!/^[rRкК]$/.test(e.key)) return;
    const el = e.target, tag = (el && el.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return;
    toggleReduce();
  });

  function tick() {
    ensureStyle(document, STYLE);
    if (document.documentElement) document.documentElement.dataset.rgVer = RG_VERSION; // queryable: document.documentElement.dataset.rgVer
    if (document.body && !document.body.dataset.rgReduceInit) {
      document.body.dataset.rgReduceInit = '1'; // default ON, once (user toggle then sticks)
      document.body.classList.add('rg-reduce');
    }
    setLegend(document, legendHtml());
    // …or by clicking the legend (wired once).
    const lg = document.getElementById('rg-legend');
    if (lg && !lg.dataset.rgClick) { lg.dataset.rgClick = '1'; lg.addEventListener('click', toggleReduce); }
    if (!ready()) return;
    // Re-run every tick (no per-challenge latch): word-bank challenges mount fresh,
    // unpainted tiles in the answer area as you tap, and React can re-render tiles —
    // annotateAll is idempotent, so it paints the new nodes without doubling marks.
    annotateAll(document, { lexicon: state.lexicon, stress: state.stress, verb: state.verb, verbMeta: state.verbMeta });
  }

  // Don't reveal masked words: in "Repeat what you hear" the to-be-revealed sentence
  // is in the DOM but visually hidden (transparent/visibility/opacity). Without this,
  // our !important colour would paint — and thereby reveal — the answer. Needs layout.
  function rgHidden(el) {
    try {
      const win = (el.ownerDocument && el.ownerDocument.defaultView) || window;
      for (let n = el, i = 0; n && n.nodeType === 1 && i < 8; n = n.parentElement, i++) {
        const cs = win.getComputedStyle(n);
        if (!cs) continue;
        if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) === 0) return true;
      }
      const m = (win.getComputedStyle(el).color || '').match(/^rgba?\\(([^)]+)\\)/);
      if (m) { const p = m[1].split(','); if (p.length === 4 && parseFloat(p[3]) === 0) return true; }
      return false;
    } catch (e) { return false; }
  }
  setHiddenCheck(rgHidden);

  if (document.documentElement) document.documentElement.dataset.rgVer = RG_VERSION; // stamp now (tick() keeps it set); readable before the first tick
  loadAll();
  setInterval(tick, 400);
  console.log('[duolingo-russian] v' + RG_VERSION + ' active (gender + stress + verb tense + vowel reduction)');
})();
`;

const out = [header, '', ...modules, entry].join('\n');
if (/^\s*(export|import)\s/m.test(modules.join('\n'))) {
  throw new Error('build: leftover export/import in bundled modules');
}
mkdirSync(new URL('dist/', root), { recursive: true });
writeFileSync(new URL('dist/duolingo-russian.user.js', root), out);
console.log('wrote dist/duolingo-russian.user.js (' + out.length + ' bytes)');
