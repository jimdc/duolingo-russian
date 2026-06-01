// ==UserScript==
// @name         Duolingo Russian — gender + stress
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.3.0
// @description  Colour Russian words on Duolingo by grammatical gender (masc/fem/neuter) and mark stress (ударение), from an OpenRussian lexicon so declined forms work.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @resource     lexicon https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json
// @resource     stress https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-stress-lexicon.json
// @match        https://*.duolingo.com/*
// @run-at       document-idle
// @grant        GM_getResourceText
// ==/UserScript==

// Russian grammatical gender from a surface word form.
//
// We can't read gender from Duolingo (its hint tables only carry translations),
// so we derive it ourselves: nominative-singular noun/adjective ending rules,
// guarded by exception lists for the cases the endings get wrong.
//
// Returns one of: 'Masculine' | 'Feminine' | 'Neuter' | 'Unknown'.
// 'Unknown' means "don't color this" — function words, ambiguous -ь nouns,
// and anything non-Cyrillic all land here on purpose.

// -мя nouns: end in -я but are neuter (the classic trap).
const NEUTER_MYA = new Set([
  'время', 'имя', 'племя', 'знамя', 'семя', 'стремя',
  'бремя', 'пламя', 'темя', 'вымя',
]);

// End in -а/-я but masculine (natural gender).
const MASCULINE_DESPITE_A_YA = new Set([
  'папа', 'дядя', 'дедушка', 'мужчина', 'юноша', 'староста',
  'старшина', 'воевода', 'слуга', 'судья', 'папочка', 'дедуля',
]);

// Soft-sign (-ь) nouns are genuinely ambiguous; only the lists decide.
const SOFT_SIGN_MASCULINE = new Set([
  'день', 'конь', 'гость', 'путь', 'словарь', 'царь', 'огонь', 'медведь',
  'дождь', 'камень', 'корень', 'уровень', 'рубль', 'автомобиль', 'учитель',
  'апрель', 'июнь', 'июль', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь', 'февраль',
]);
const SOFT_SIGN_FEMININE = new Set([
  'дверь', 'ночь', 'мать', 'дочь', 'любовь', 'тетрадь', 'площадь', 'вещь',
  'осень', 'кровать', 'соль', 'жизнь', 'смерть', 'боль', 'часть', 'новость',
  'помощь', 'речь', 'мышь', 'постель', 'модель', 'роль', 'цель', 'связь',
  'степень', 'тень', 'кость', 'кровь',
]);

// Function words carry no gender to color — keeps adverbs/conjunctions/particles
// from being mis-colored by the bare ending rules (e.g. "где" ends in -е).
const STOPWORDS = new Set([
  'там', 'тут', 'здесь', 'где', 'куда', 'когда', 'как', 'что', 'чтобы',
  'и', 'а', 'но', 'или', 'не', 'ни', 'же', 'ли', 'бы', 'да', 'нет',
  'очень', 'тоже', 'также', 'уже', 'ещё', 'еще', 'вот', 'потому',
]);

const CYRILLIC_CONSONANTS = new Set('бвгджзйклмнпрстфхцчшщ'.split(''));

/** Strip combining accents (ударение, e.g. ра́дио), punctuation, and case. */
function normalize(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/[̀-ͯ́]/g, '') // combining marks incl. combining acute
    .replace(/[^Ѐ-ӿ]/g, '')      // keep Cyrillic only
    .toLowerCase()
    .trim();
}

/**
 * Best-effort grammatical gender for a single Russian word.
 * @param {string} raw surface form (may include accents/punctuation)
 * @returns {'Masculine'|'Feminine'|'Neuter'|'Unknown'}
 */
function genderOf(raw) {
  const w = normalize(raw);
  if (w.length === 0) return 'Unknown';
  if (STOPWORDS.has(w)) return 'Unknown';

  if (NEUTER_MYA.has(w)) return 'Neuter';
  if (MASCULINE_DESPITE_A_YA.has(w)) return 'Masculine';
  if (SOFT_SIGN_FEMININE.has(w)) return 'Feminine';
  if (SOFT_SIGN_MASCULINE.has(w)) return 'Masculine';

  const last = w[w.length - 1];
  if (last === 'а' || last === 'я') return 'Feminine';
  if (last === 'о' || last === 'е' || last === 'ё') return 'Neuter';
  if (last === 'й') return 'Masculine';
  if (last === 'ь') return 'Unknown';        // ambiguous and not in the lists
  if (CYRILLIC_CONSONANTS.has(last)) return 'Masculine';

  return 'Unknown';
}

// Paint the Russian prompt words in a Duolingo challenge by grammatical gender.
//
// The prompt is rendered as a flat run of single-character `span[aria-hidden]`
// elements (letters, spaces, punctuation), followed by the `hint-token` overlay
// divs — all sharing one parent (the `lang="ru"` span). Layout coordinates only
// exist in a real browser, so we don't use geometry: we group the character
// spans by whitespace into words (which line up 1:1 with the hint-tokens) and
// add a gender class to each word's Cyrillic letters.
//
// genderOf is injected (not imported) so this file stays dependency-free and
// bundles cleanly into the userscript.

const GENDER_CLASS = {
  Masculine: 'rg-masc',
  Feminine: 'rg-fem',
  Neuter: 'rg-neut',
};

const isCharSpan = (el) =>
  el.tagName === 'SPAN' && el.getAttribute('aria-hidden') === 'true';

const isWhitespace = (s) => /^\s*$/.test(s.textContent || '');

const hasCyrillic = (s) => /[Ѐ-ӿ]/.test(s.textContent || '');

/** Split an ordered list of char spans into word-groups on whitespace spans. */
function groupByWhitespace(spans) {
  const groups = [];
  let cur = [];
  for (const s of spans) {
    if (isWhitespace(s)) {
      if (cur.length) groups.push(cur);
      cur = [];
    } else {
      cur.push(s);
    }
  }
  if (cur.length) groups.push(cur);
  return groups;
}

/**
 * The Russian prompt words in `root`, in reading order, as {word, spans}.
 * Shared by gender-colouring and stress-marking so the parsing lives in one place.
 * @param {Element|Document} root a challenge container
 * @returns {{word: string, spans: Element[]}[]}
 */
function wordGroups(root) {
  if (!root?.querySelectorAll) return [];
  const containers = new Set(
    [...root.querySelectorAll('[data-test="hint-token"]')]
      .map((t) => t.parentElement)
      .filter(Boolean),
  );
  const groups = [];
  for (const container of containers) {
    const charSpans = [...container.children].filter(isCharSpan);
    for (const spans of groupByWhitespace(charSpans)) {
      groups.push({ word: spans.map((s) => s.textContent).join(''), spans });
    }
  }
  return groups;
}

/**
 * Add gender classes to the Russian words in `root`.
 * @param {Element|Document} root a challenge container
 * @param {{genderOf: (w: string) => string}} opts
 * @returns {{word: string, gender: string, cls: string}[]} words actually colored
 */
function colorizeChallenge(root, opts = {}) {
  const { genderOf } = opts;
  if (typeof genderOf !== 'function') return [];

  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    const gender = genderOf(word);
    const cls = GENDER_CLASS[gender];
    if (!cls) continue; // Unknown / function word -> leave alone
    for (const s of spans) if (hasCyrillic(s)) s.classList.add(cls);
    applied.push({ word, gender, cls });
  }
  return applied;
}

// Gender lookup backed by the OpenRussian-derived wordform lexicon.
//
// Replaces the nominative-only ending heuristic for live colouring: it knows
// every declined form (сумку → f, красную → f) AND, by only containing nouns
// and adjectives, it returns Unknown for verbs/particles/pronouns (дай, надо,
// пожалуйста), so they're left uncoloured. Under-colour beats mis-colour.

/** Build {m,f,n} Sets from the packed `{m,f,n: "form form ..."}` lexicon. */
function makeLexicon(packed) {
  const sets = { m: new Set(), f: new Set(), n: new Set() };
  if (packed) {
    for (const g of ['m', 'f', 'n']) {
      const blob = packed[g];
      if (!blob) continue;
      for (const form of blob.split(' ')) if (form) sets[g].add(form);
    }
  }
  return sets;
}

/**
 * @param {string} word surface form (any case, with stress/punctuation)
 * @param {{m:Set,f:Set,n:Set}|null} lex from makeLexicon()
 * @returns {'Masculine'|'Feminine'|'Neuter'|'Unknown'}
 */
function lexiconGender(word, lex) {
  if (!lex) return 'Unknown';
  const w = normalize(word).replace(/ё/g, 'е'); // lexicon keys are built with ё→е
  if (!w) return 'Unknown';
  if (lex.f.has(w)) return 'Feminine';
  if (lex.m.has(w)) return 'Masculine';
  if (lex.n.has(w)) return 'Neuter';
  return 'Unknown';
}

// Mark Russian stress (ударение) on the prompt words, using the OpenRussian-derived
// wordform → stressed-letter-index lexicon. Applies to every part of speech, so
// verbs/particles get accents even though they aren't gender-coloured.

const COMBINING_ACUTE = '́';
const VOWELS = /[аеёиоуыэюя]/i;

/** Build a form → stressed-index Map from the packed `{ "<idx>": "form ..." }` lexicon. */
function makeStress(packed) {
  const map = new Map();
  if (packed) {
    for (const idx of Object.keys(packed)) {
      const i = Number(idx);
      for (const form of packed[idx].split(' ')) if (form) map.set(form, i);
    }
  }
  return map;
}

/** @returns {number} index of the stressed letter, or -1 if unknown. */
function stressIndexOf(word, map) {
  if (!map) return -1;
  const w = normalize(word).replace(/ё/g, 'е');
  return map.has(w) ? map.get(w) : -1;
}

/** Append a combining acute to the idx-th Cyrillic letter among `spans`. */
function applyStressToSpans(spans, idx) {
  let letterPos = 0;
  for (const s of spans) {
    if (!hasCyrillic(s)) continue;
    if (letterPos === idx) {
      const t = s.textContent || '';
      if (t.includes(COMBINING_ACUTE) || t.includes('ё') || t.includes('Ё')) return false; // already marked
      if (!VOWELS.test(t)) return false; // safety: only accent a vowel
      s.textContent = t + COMBINING_ACUTE;
      return true;
    }
    letterPos++;
  }
  return false;
}

/**
 * Add stress marks to every known word in `root`.
 * @returns {{word: string, idx: number}[]} words actually marked
 */
function markStress(root, map) {
  const marked = [];
  for (const { word, spans } of wordGroups(root)) {
    const idx = stressIndexOf(word, map);
    if (idx < 0) continue;
    if (applyStressToSpans(spans, idx)) marked.push({ word, idx });
  }
  return marked;
}

// Minimal DOM glue for the userscript: the gender stylesheet and the legend.
// Lives here (not inline in the build script) so the mount targets are unit-testable.

const STYLE_ID = 'rg-style';
const LEGEND_ID = 'rg-legend';

/** Mount the gender CSS once. A <style> belongs in <head>. */
function ensureStyle(doc, css) {
  const existing = doc.getElementById(STYLE_ID);
  if (existing) return existing;
  const s = doc.createElement('style');
  s.id = STYLE_ID;
  s.textContent = css;
  (doc.head || doc.documentElement).appendChild(s);
  return s;
}

/** Mount the legend once. A <div> must go in <body> — in <head> it won't render. */
function ensureLegend(doc) {
  const existing = doc.getElementById(LEGEND_ID);
  if (existing) return existing;
  const d = doc.createElement('div');
  d.id = LEGEND_ID;
  d.innerHTML =
    'RU gender: <span class="m">masc</span> · <span class="f">fem</span> · <span class="n">neut</span>';
  (doc.body || doc.documentElement).appendChild(d);
  return d;
}


/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
  const URLS = { lexicon: 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json', stress: 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-stress-lexicon.json' };
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
  ].join('\n');

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
