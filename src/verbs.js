// Colour verbs by tense/mood, using the OpenRussian-derived verb-form lexicon.
// Gender (nouns/adjectives) already owns text colour; verbs are a disjoint set,
// so a word is either gender-coloured OR tense-coloured, never both. Gender wins
// on the rare homograph (e.g. печь = oven/to-bake).

import { normalize } from './ru-gender.js';
import { wordGroups, hasCyrillic } from './colorize.js';
import { isFunctionWord } from './stopwords.js';

export const TENSE_CLASS = {
  past: 'rg-past',
  pres: 'rg-pres',
  fut: 'rg-fut',
  imp: 'rg-imp',
  inf: 'rg-inf',
};

const GENDER_CLASSES = ['rg-masc', 'rg-fem', 'rg-neut'];

/** Build a form → tense Map from the packed `{ "<tense>": "form ..." }` lexicon. */
export function makeVerbTense(packed) {
  const map = new Map();
  if (packed) {
    for (const t of Object.keys(packed)) {
      for (const f of packed[t].split(' ')) if (f) map.set(f, t);
    }
  }
  return map;
}

/** @returns {'past'|'pres'|'fut'|'imp'|'inf'|null} */
export function verbTenseOf(word, map) {
  if (!map) return null;
  const w = normalize(word).replace(/ё/g, 'е');
  return map.get(w) || null;
}

const isGendered = (spans) =>
  spans.some((s) => s.classList && GENDER_CLASSES.some((c) => s.classList.contains(c)));

const metaKey = (word) => normalize(word).replace(/ё/g, 'е');

/**
 * Build aspect + motion lookups from the packed verb-meta lexicon
 * `{ aspect: { pf, ipf }, motion: { uni, multi } }` (space-joined form lists).
 * @returns {{aspect: Map<string,'pf'|'ipf'>, motion: Map<string,'uni'|'multi'>}}
 */
export function makeVerbMeta(packed) {
  const aspect = new Map();
  const motion = new Map();
  const fill = (map, obj) => {
    if (!obj) return;
    for (const k of Object.keys(obj)) for (const f of String(obj[k]).split(' ')) if (f) map.set(f, k);
  };
  if (packed) {
    fill(aspect, packed.aspect);
    fill(motion, packed.motion);
  }
  return { aspect, motion };
}

/** @returns {'pf'|'ipf'|null} perfective / imperfective (biaspectual verbs are absent) */
export function verbAspectOf(word, meta) {
  return (meta && meta.aspect && meta.aspect.get(metaKey(word))) || null;
}

/** @returns {'uni'|'multi'|null} unidirectional / multidirectional (motion verbs only) */
export function verbMotionOf(word, meta) {
  return (meta && meta.motion && meta.motion.get(metaKey(word))) || null;
}

/** Append a trailing superscript marker (aspect abbrev + motion arrow) after `last`. */
function appendVerbMark(last, aspect, motion) {
  const doc = last.ownerDocument;
  if (!doc || !last.parentNode) return;
  const mark = doc.createElement('span');
  mark.className = 'rg-vmeta';
  if (aspect) {
    const a = doc.createElement('span');
    a.className = 'rg-asp-' + aspect; // rg-asp-pf | rg-asp-ipf
    a.textContent = aspect; // "pf" | "ipf"
    mark.appendChild(a);
  }
  if (motion) {
    const m = doc.createElement('span');
    m.className = 'rg-mot-' + motion; // rg-mot-uni | rg-mot-multi
    m.textContent = motion === 'uni' ? '→' : '⇄'; // one-way vs back-and-forth
    mark.appendChild(m);
  }
  last.parentNode.insertBefore(mark, last.nextSibling);
}

/**
 * Tag verb words in `root` with an aspect/motion superscript. Orthogonal to the tense
 * COLOUR, so it runs after colorizeVerbs; skips gender-coloured words (gender wins on
 * noun/verb homographs). Idempotent: the last span is flagged `rg-vmeta-done` so a
 * re-run never appends a second marker.
 * @returns {{word: string, aspect: string|null, motion: string|null}[]} words newly marked
 */
export function colorizeVerbMeta(root, meta) {
  if (!meta) return [];
  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    if (!spans.length || isGendered(spans)) continue; // gender takes precedence
    if (isFunctionWord(word)) continue; // skip adverb/particle homographs (e.g. домой = imperative of домыть)
    const aspect = verbAspectOf(word, meta);
    const motion = verbMotionOf(word, meta);
    if (!aspect && !motion) continue;
    const last = spans[spans.length - 1];
    if (last.classList && last.classList.contains('rg-vmeta-done')) continue; // already marked
    appendVerbMark(last, aspect, motion);
    if (last.classList) last.classList.add('rg-vmeta-done');
    applied.push({ word, aspect, motion });
  }
  return applied;
}

/**
 * Add a tense class to verb words in `root` that aren't already gender-coloured.
 * @returns {{word: string, tense: string, cls: string}[]}
 */
export function colorizeVerbs(root, opts = {}) {
  const { tenseOf } = opts;
  if (typeof tenseOf !== 'function') return [];
  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    if (isGendered(spans)) continue; // gender takes precedence
    if (isFunctionWord(word)) continue; // adverb/particle homographs of imperatives (домой, давай) aren't verbs here
    const tense = tenseOf(word);
    const cls = TENSE_CLASS[tense];
    if (!cls) continue;
    for (const s of spans) if (hasCyrillic(s)) s.classList.add(cls);
    applied.push({ word, tense, cls });
  }
  return applied;
}
