// ==UserScript==
// @name         Duolingo Russian — gender, stress & verb tense
// @namespace    https://github.com/jimdc/duolingo-russian
// @version      0.6.0
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
 * The Russian words in `root`, in reading order, as {word, spans}.
 * Shared by gender-colouring and stress-marking so the parsing lives in one place.
 *
 * Two DOM shapes are covered, both via stable `data-test` selectors:
 *  - the prompt sentence — a flat run of per-character `span[aria-hidden]`
 *    grouped by whitespace, under each `hint-token`'s parent (`spans` = letters);
 *  - word-bank / match tiles — each tile's word is one text node in
 *    `[data-test="challenge-tap-token-text"]` (`spans` = the single text span).
 * Consumers don't care which: they add classes to every span and treat stress
 * by Cyrillic-letter offset, so a 1-letter span and a whole-word span both work.
 *
 * @param {Element|Document} root a challenge container
 * @returns {{word: string, spans: Element[]}[]}
 */
function wordGroups(root) {
  if (!root?.querySelectorAll) return [];
  const groups = [];

  // Prompt sentence: per-character spans, grouped into words on whitespace.
  const containers = new Set(
    [...root.querySelectorAll('[data-test="hint-token"]')]
      .map((t) => t.parentElement)
      .filter(Boolean),
  );
  for (const container of containers) {
    const charSpans = [...container.children].filter(isCharSpan);
    for (const spans of groupByWhitespace(charSpans)) {
      groups.push({ word: spans.map((s) => s.textContent).join(''), spans });
    }
  }

  // Word-bank / match tiles: each tile holds its whole word in one text node.
  // Only Russian tiles matter — non-Cyrillic tiles (e.g. English answers) are
  // left out so the colour/stress passes never touch them.
  for (const tile of root.querySelectorAll('[data-test="challenge-tap-token-text"]')) {
    if (hasCyrillic(tile)) groups.push({ word: tile.textContent || '', spans: [tile] });
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
const CYRILLIC = /[Ѐ-ӿ]/;

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

/**
 * Insert a combining acute after the idx-th Cyrillic letter among `spans`.
 * Counts by Cyrillic letter, not by span, so it works whether each span holds a
 * single letter (the prompt) or a whole word (a tile).
 */
function applyStressToSpans(spans, idx) {
  let letterPos = 0;
  for (const s of spans) {
    const t = s.textContent || '';
    for (let i = 0; i < t.length; i++) {
      if (!CYRILLIC.test(t[i])) continue; // count Cyrillic letters only
      if (letterPos === idx) {
        const ch = t[i];
        if (t[i + 1] === COMBINING_ACUTE) return false; // already marked
        if (ch === 'ё' || ch === 'Ё') return false; // ё is inherently stressed
        if (!VOWELS.test(ch)) return false; // safety: only accent a vowel
        s.textContent = t.slice(0, i + 1) + COMBINING_ACUTE + t.slice(i + 1);
        return true;
      }
      letterPos++;
    }
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

// Colour verbs by tense/mood, using the OpenRussian-derived verb-form lexicon.
// Gender (nouns/adjectives) already owns text colour; verbs are a disjoint set,
// so a word is either gender-coloured OR tense-coloured, never both. Gender wins
// on the rare homograph (e.g. печь = oven/to-bake).

const TENSE_CLASS = {
  past: 'rg-past',
  pres: 'rg-pres',
  fut: 'rg-fut',
  imp: 'rg-imp',
  inf: 'rg-inf',
};

const GENDER_CLASSES = ['rg-masc', 'rg-fem', 'rg-neut'];

/** Build a form → tense Map from the packed `{ "<tense>": "form ..." }` lexicon. */
function makeVerbTense(packed) {
  const map = new Map();
  if (packed) {
    for (const t of Object.keys(packed)) {
      for (const f of packed[t].split(' ')) if (f) map.set(f, t);
    }
  }
  return map;
}

/** @returns {'past'|'pres'|'fut'|'imp'|'inf'|null} */
function verbTenseOf(word, map) {
  if (!map) return null;
  const w = normalize(word).replace(/ё/g, 'е');
  return map.get(w) || null;
}

const isGendered = (spans) =>
  spans.some((s) => s.classList && GENDER_CLASSES.some((c) => s.classList.contains(c)));

/**
 * Add a tense class to verb words in `root` that aren't already gender-coloured.
 * @returns {{word: string, tense: string, cls: string}[]}
 */
function colorizeVerbs(root, opts = {}) {
  const { tenseOf } = opts;
  if (typeof tenseOf !== 'function') return [];
  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    if (isGendered(spans)) continue; // gender takes precedence
    const tense = tenseOf(word);
    const cls = TENSE_CLASS[tense];
    if (!cls) continue;
    for (const s of spans) if (hasCyrillic(s)) s.classList.add(cls);
    applied.push({ word, tense, cls });
  }
  return applied;
}

// Predict standard (Moscow-norm) unstressed vowel reduction — akanye + ikanye —
// and surface it as a small IPA superscript on each reduced vowel. We already know
// the stress (from the stress lexicon), which is the one fact reduction needs:
//
//   akanye  (hard о/а):  stressed → first-pretonic/word-initial [ɐ] → elsewhere [ə]
//   ikanye  (soft е/я):  unstressed → [ɪ]   (and а after ч/щ → [ɪ])
//   ж/ш/ц + е/и/я:       unstressed → [ɨ]   (always-hard sibilants)
//   у/ю/ы/и:             left alone (negligible reduction / already that sound)
//
// Nothing is recoloured (gender/tense own colour) and no text is rewritten: the
// IPA hint is a CSS ::after on a `.rg-rd` wrapper, shown only when reduction mode
// is toggled on. So this layers cleanly over everything else.

// Unique names: the userscript bundler flattens every src file into one scope,
// so these must not collide with stress.js's CYRILLIC/VOWELS.
const RD_CYR = /[Ѐ-ӿ]/;
const RD_VOWELS = new Set('аеёиоуыэюя');
const HARD_SIBILANTS = new Set('жшц'); // always hard
const SOFT_CONSONANTS = new Set('чщй'); // always soft

const AKANYE = (tier1) =>
  tier1 ? { ipa: 'ɐ', cls: 'rg-rd-a' } : { ipa: 'ə', cls: 'rg-rd-schwa' };
const IKANYE = { ipa: 'ɪ', cls: 'rg-rd-i' };
const YERY = { ipa: 'ɨ', cls: 'rg-rd-y' };

/**
 * The reduced realisation of one unstressed vowel.
 * @param {string} v      the (lowercased) vowel letter
 * @param {string} prev   the (lowercased) preceding Cyrillic letter, '' if none
 * @param {boolean} tier1 true if first-pretonic or word-initial (weaker reduction)
 * @returns {{ipa: string, cls: string}|null} null = leave it unmarked
 */
function reduceVowel(v, prev, tier1) {
  if (HARD_SIBILANTS.has(prev)) {
    if (v === 'е' || v === 'и' || v === 'я') return YERY; // жена→[ɨ], цифра→[ɨ]
    if (v === 'а' || v === 'о') return AKANYE(tier1); // жара→[ɐ]
    return null;
  }
  if (SOFT_CONSONANTS.has(prev)) {
    if (v === 'а' || v === 'е' || v === 'я') return IKANYE; // часы→[ɪ]
    return null; // и already [ɪ]; у stays
  }
  if (v === 'я' || v === 'е') return IKANYE; // ikanye after a soft consonant
  if (v === 'а' || v === 'о') return AKANYE(tier1); // akanye
  if (v === 'э') return YERY; // rare; этаж→[ɨ]
  return null; // и, у, ю, ы, ё — left alone
}

/**
 * Map each reduced vowel of `word` to its IPA hint, keyed by Cyrillic-letter index
 * (the same index space as the stress lexicon and applyStressToSpans).
 * @param {string} word
 * @param {number} stressIdx index of the stressed Cyrillic letter, or -1
 * @returns {Map<number, {ipa: string, cls: string}>}
 */
function reduceWord(word, stressIdx) {
  const out = new Map();
  if (stressIdx == null || stressIdx < 0) return out; // unknown stress / monosyllable

  const letters = [];
  for (const ch of String(word)) if (RD_CYR.test(ch)) letters.push(ch.toLowerCase());

  const vowelAt = []; // Cyrillic-letter indices that are vowels, in order
  for (let i = 0; i < letters.length; i++) if (RD_VOWELS.has(letters[i])) vowelAt.push(i);
  if (vowelAt.length <= 1) return out; // monosyllable: the one vowel is the stress

  const stressedPos = vowelAt.indexOf(stressIdx);
  if (stressedPos < 0) return out; // stress mark not on a vowel — bail rather than guess
  const firstPretonic = stressedPos > 0 ? vowelAt[stressedPos - 1] : -1;

  for (const li of vowelAt) {
    if (li === stressIdx) continue; // stressed vowel keeps full quality
    const r = reduceVowel(letters[li], li > 0 ? letters[li - 1] : '', li === firstPretonic || li === 0);
    if (r) out.set(li, r);
  }
  return out;
}

/** Wrap (or tag) the reduced vowels among `spans` with `.rg-rd` + data-ipa. */
function applyReductionToSpans(spans, byIndex) {
  let pos = 0;
  let any = false;
  for (const s of spans) {
    const t = s.textContent || '';
    let cyr = 0;
    for (const ch of t) if (RD_CYR.test(ch)) cyr++;
    if (cyr === 0) continue;
    if (cyr === 1) {
      // One Cyrillic letter in this span (prompt char-span, or a 1-letter tile):
      // tag the span itself so CSS can render the superscript.
      const r = byIndex.get(pos);
      if (r) {
        if (!s.classList || !s.classList.contains('rg-rd')) {
          s.classList.add('rg-rd', r.cls);
          s.setAttribute('data-ipa', r.ipa);
        }
        any = true;
      }
      pos += 1;
    } else {
      // Whole-word span (tile): split the text so each reduced vowel gets a wrapper.
      if (rebuildSpan(s, t, pos, byIndex)) any = true;
      pos += cyr;
    }
  }
  return any;
}

/** Rebuild a multi-letter span, wrapping its reduced vowels; textContent is preserved. */
function rebuildSpan(s, t, startPos, byIndex) {
  if (s.querySelector && s.querySelector('.rg-rd')) return true; // already done
  const doc = s.ownerDocument;
  if (!doc) return false;

  let pos = startPos;
  let hasAny = false;
  for (const ch of t) {
    if (RD_CYR.test(ch)) {
      if (byIndex.has(pos)) { hasAny = true; break; }
      pos++;
    }
  }
  if (!hasAny) return false;

  const frag = doc.createDocumentFragment();
  let buf = '';
  const flush = () => { if (buf) { frag.appendChild(doc.createTextNode(buf)); buf = ''; } };
  pos = startPos;
  for (const ch of t) {
    if (RD_CYR.test(ch)) {
      const r = byIndex.get(pos);
      if (r) {
        flush();
        const w = doc.createElement('span');
        w.className = 'rg-rd ' + r.cls;
        w.setAttribute('data-ipa', r.ipa);
        w.textContent = ch;
        frag.appendChild(w);
      } else {
        buf += ch;
      }
      pos++;
    } else {
      buf += ch; // punctuation, spaces, and the combining acute on the stressed vowel
    }
  }
  flush();
  s.textContent = '';
  s.appendChild(frag);
  return true;
}

/**
 * Annotate every known word in `root` with its predicted vowel reduction.
 * @returns {{word: string, count: number}[]} words actually annotated
 */
function colorizeReductions(root, stressMap) {
  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    const byIndex = reduceWord(word, stressIndexOf(word, stressMap));
    if (byIndex.size && applyReductionToSpans(spans, byIndex)) {
      applied.push({ word, count: byIndex.size });
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
  (doc.body || doc.documentElement).appendChild(d);
  return d;
}

/** Set the legend's HTML (mounting it first if needed); no-op if unchanged. */
function setLegend(doc, html) {
  const el = ensureLegend(doc);
  if (el.innerHTML !== html) el.innerHTML = html;
  return el;
}


/* ---- browser entry (not part of the tested core) ---- */
(function () {
  'use strict';
  const VER = '0.4.0';
  const SRC = { lexicon: 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-gender-lexicon.json', stress: 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-stress-lexicon.json', verb: 'https://raw.githubusercontent.com/jimdc/duolingo-russian/master/src/data/ru-verb-lexicon.json' };
  const TOTAL = 18561490;
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

  const reduceOn = () => !!(document.body && document.body.classList.contains('rg-reduce'));
  const KEY_HTML =
    'gender <span class="m">m</span> <span class="f">f</span> <span class="n">n</span>' +
    ' · tense <span class="pa">past</span> <span class="pr">pres</span> <span class="fu">fut</span> <span class="im">imp</span> <span class="in">inf</span>' +
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
    '#rg-legend{position:fixed;left:12px;bottom:12px;z-index:99999;font:12px/1.5 system-ui,sans-serif;background:rgba(255,255,255,.96);color:#333;border:1px solid #ddd;border-radius:8px;padding:5px 10px;box-shadow:0 1px 4px rgba(0,0,0,.15);max-width:70vw;cursor:pointer;user-select:none}',
    '#rg-legend .m{color:#1565c0}#rg-legend .f{color:#c2185b}#rg-legend .n{color:#2e7d32}#rg-legend .pa{color:#e65100}#rg-legend .pr{color:#00838f}#rg-legend .fu{color:#6a1b9a}#rg-legend .im{color:#5d4037}#rg-legend .in{color:#455a64}',
    '#rg-legend .rda{color:#b26a00}#rg-legend .rds{color:#757575}#rg-legend .rdi{color:#00838f}#rg-legend .rdy{color:#6a1b9a}',
  ].join('\n');

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
    if (document.body && !document.body.dataset.rgReduceInit) {
      document.body.dataset.rgReduceInit = '1'; // default ON, once (user toggle then sticks)
      document.body.classList.add('rg-reduce');
    }
    setLegend(document, legendHtml());
    // …or by clicking the legend (wired once).
    const lg = document.getElementById('rg-legend');
    if (lg && !lg.dataset.rgClick) { lg.dataset.rgClick = '1'; lg.addEventListener('click', toggleReduce); }
    if (!ready()) return;
    for (const ch of document.querySelectorAll('[data-test^="challenge challenge-"]')) {
      if (ch.dataset.rgDone) continue;
      const g = colorizeChallenge(ch, { genderOf: function (w) { return lexiconGender(w, state.lexicon); } });
      const v = colorizeVerbs(ch, { tenseOf: function (w) { return verbTenseOf(w, state.verb); } });
      const s = markStress(ch, state.stress);
      const r = colorizeReductions(ch, state.stress); // stress must run first (it mutates tile text)
      if (g.length || v.length || s.length || r.length) ch.dataset.rgDone = '1';
    }
  }

  loadAll();
  setInterval(tick, 400);
  console.log('[duolingo-russian] active (gender + stress + verb tense + vowel reduction)');
})();
