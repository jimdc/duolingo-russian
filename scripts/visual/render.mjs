// Tier-1 visual test: render Duolingo-shaped prompt DOM + the real annotation
// modules in headless (system) Chrome, screenshot each to images/. Deterministic,
// offline, no login — a pre-push visual gate AND the source of the README images.
//
//   npm run visual
//
// Review the PNGs in images/ afterwards (they're committed as the README shots).

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = new URL('../../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const strip = (s) => s.replace(/^\s*import[^\n]*\n/gm, '').replace(/^export\s+/gm, '');

// Same modules/order the userscript bundles — this tests the real rendering code.
const MODULES = ['src/ru-gender.js', 'src/colorize.js', 'src/lexicon.js', 'src/stress.js', 'src/verbs.js', 'src/ui.js']
  .map((p) => strip(read(p)))
  .join('\n');

// Full lexicons (Node side) so we can slice each sentence down to a tiny payload.
const G = JSON.parse(read('src/data/ru-gender-lexicon.json'));
const S = JSON.parse(read('src/data/ru-stress-lexicon.json'));
const V = JSON.parse(read('src/data/ru-verb-lexicon.json'));
const gSets = { m: new Set(G.m.split(' ')), f: new Set(G.f.split(' ')), n: new Set(G.n.split(' ')) };
const sMap = new Map(); for (const k of Object.keys(S)) for (const w of S[k].split(' ')) sMap.set(w, k);
const vMap = new Map(); for (const k of Object.keys(V)) for (const w of V[k].split(' ')) vMap.set(w, k);
const norm = (w) => w.toLowerCase().normalize('NFC').replace(/[^Ѐ-ӿ]/g, '').replace(/ё/g, 'е');

function sliceFor(sentence) {
  const g = { m: [], f: [], n: [] }, s = {}, v = {};
  for (const raw of sentence.split(/\s+/)) {
    const w = norm(raw);
    if (!w) continue;
    for (const k of ['m', 'f', 'n']) if (gSets[k].has(w)) g[k].push(w);
    if (sMap.has(w)) (s[sMap.get(w)] ??= []).push(w);
    if (vMap.has(w)) (v[vMap.get(w)] ??= []).push(w);
  }
  const join = (o) => Object.fromEntries(Object.entries(o).map(([k, a]) => [k, [...new Set(a)].join(' ')]));
  return { gender: join(g), stress: join(s), verb: join(v) };
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Duolingo-shaped prompt: per-character aria-hidden spans + one hint-token per word.
function challengeHTML(sentence) {
  const chars = [...sentence].map((c) => `<span aria-hidden="true">${esc(c)}</span>`).join('');
  const tokens = sentence.split(/\s+/).filter(Boolean)
    .map((w) => `<div data-test="hint-token" aria-label="${esc(w)}"></div>`).join('');
  return `<div data-test="challenge challenge-translate" id="cap"><span lang="ru">${chars}${tokens}</span></div>`;
}

const CSS = [
  '.rg-masc{color:#1565c0}.rg-fem{color:#c2185b}.rg-neut{color:#2e7d32}',
  '.rg-past{color:#e65100}.rg-pres{color:#00838f}.rg-fut{color:#6a1b9a}.rg-imp{color:#5d4037}.rg-inf{color:#455a64}',
  '#cap [data-test="hint-token"]{display:none}',
  '#cap{font:30px/1.4 system-ui,sans-serif;color:#222;display:inline-block}',
].join('');

// Runs in-page: build lexicons from the sliced payload and annotate the prompt.
function annotate(data) {
  const lex = makeLexicon(data.gender);
  const stress = makeStress(data.stress);
  const verb = makeVerbTense(data.verb);
  const ch = document.querySelector('[data-test^="challenge challenge-"]');
  colorizeChallenge(ch, { genderOf: (w) => lexiconGender(w, lex) });
  colorizeVerbs(ch, { tenseOf: (w) => verbTenseOf(w, verb) });
  markStress(ch, stress);
}

const SHOTS = [
  { name: 'gender-stress', sentence: 'Дай мне красную сумку, пожалуйста.' },
  { name: 'verb-tense', sentence: 'Я читаю книгу, помыл сумку и помою посуду.' },
];

mkdirSync(new URL('images/', ROOT), { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const manifest = [];
for (const { name, sentence } of SHOTS) {
  const page = await browser.newPage({ viewport: { width: 900, height: 160 }, deviceScaleFactor: 2 });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>${CSS}</style></head>`
    + `<body style="margin:0;padding:22px;background:#fff">${challengeHTML(sentence)}</body></html>`;
  await page.setContent(html, { waitUntil: 'domcontentloaded' });
  await page.addScriptTag({ content: `${MODULES}\n;(${annotate.toString()})(${JSON.stringify(sliceFor(sentence))});` });
  const el = await page.$('#cap');
  await el.screenshot({ path: fileURLToPath(new URL(`images/${name}.png`, ROOT)) });
  // Gate: fail loudly if the annotation pipeline produced nothing.
  const stats = await page.evaluate(() => ({
    coloured: document.querySelectorAll('#cap [class*="rg-"]').length,
    stress: (document.querySelector('#cap [lang="ru"]').textContent.match(/́/g) || []).length,
  }));
  if (stats.coloured === 0 && stats.stress === 0) {
    console.error('FAIL: no annotations rendered for', name);
    process.exitCode = 1;
  }
  manifest.push({ name, sentence, ...stats });
  console.log(`shot ${name} → images/${name}.png  (${stats.coloured} coloured, ${stats.stress} stress)  «${sentence}»`);
  await page.close();
}
await browser.close();
writeFileSync(new URL('images/manifest.json', ROOT), JSON.stringify(manifest, null, 2) + '\n');
console.log('done');
