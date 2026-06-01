// Colour verbs by tense/mood, using the OpenRussian-derived verb-form lexicon.
// Gender (nouns/adjectives) already owns text colour; verbs are a disjoint set,
// so a word is either gender-coloured OR tense-coloured, never both. Gender wins
// on the rare homograph (e.g. печь = oven/to-bake).

import { normalize } from './ru-gender.js';
import { wordGroups, hasCyrillic } from './colorize.js';

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
    const tense = tenseOf(word);
    const cls = TENSE_CLASS[tense];
    if (!cls) continue;
    for (const s of spans) if (hasCyrillic(s)) s.classList.add(cls);
    applied.push({ word, tense, cls });
  }
  return applied;
}
