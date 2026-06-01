// ==UserScript==
// @name         Duolingo Russian — gender colors
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.2.0
// @description  Colour Russian words on Duolingo by grammatical gender (masc/fem/neuter), using an OpenRussian lexicon so declined forms work. Stress marks (ударение) coming next.
// @author       jimdc
// @homepageURL  https://github.com/jimdc/duolingo-russian
// @supportURL   https://github.com/jimdc/duolingo-russian/issues
// @downloadURL  https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @updateURL    https://raw.githubusercontent.com/jimdc/duolingo-russian/master/dist/duolingo-russian.user.js
// @resource     lexicon https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json
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
 * Add gender classes to the Russian words in `root`.
 * @param {Element|Document} root a challenge container
 * @param {{genderOf: (w: string) => string}} opts
 * @returns {{word: string, gender: string, cls: string}[]} words actually colored
 */
function colorizeChallenge(root, opts = {}) {
  const { genderOf } = opts;
  if (!root?.querySelectorAll || typeof genderOf !== 'function') return [];

  const containers = new Set(
    [...root.querySelectorAll('[data-test="hint-token"]')]
      .map((t) => t.parentElement)
      .filter(Boolean),
  );

  const applied = [];
  for (const container of containers) {
    const charSpans = [...container.children].filter(isCharSpan);
    for (const group of groupByWhitespace(charSpans)) {
      const word = group.map((s) => s.textContent).join('');
      const gender = genderOf(word);
      const cls = GENDER_CLASS[gender];
      if (!cls) continue; // Unknown / function word -> leave alone
      for (const s of group) if (hasCyrillic(s)) s.classList.add(cls);
      applied.push({ word, gender, cls });
    }
  }
  return applied;
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
  const LEX_URL = 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json';
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
  ].join('\n');

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
