// Mark Russian stress (ударение) on the prompt words, using the OpenRussian-derived
// wordform → stressed-letter-index lexicon. Applies to every part of speech, so
// verbs/particles get accents even though they aren't gender-coloured.

import { normalize } from './ru-gender.js';
import { wordGroups, hasCyrillic } from './colorize.js';

const COMBINING_ACUTE = '́';
const VOWELS = /[аеёиоуыэюя]/i;

/** Build a form → stressed-index Map from the packed `{ "<idx>": "form ..." }` lexicon. */
export function makeStress(packed) {
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
export function stressIndexOf(word, map) {
  if (!map) return -1;
  const w = normalize(word).replace(/ё/g, 'е');
  return map.has(w) ? map.get(w) : -1;
}

/** Append a combining acute to the idx-th Cyrillic letter among `spans`. */
export function applyStressToSpans(spans, idx) {
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
export function markStress(root, map) {
  const marked = [];
  for (const { word, spans } of wordGroups(root)) {
    const idx = stressIndexOf(word, map);
    if (idx < 0) continue;
    if (applyStressToSpans(spans, idx)) marked.push({ word, idx });
  }
  return marked;
}
