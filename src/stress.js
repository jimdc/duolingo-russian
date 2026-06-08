// Mark Russian stress (ударение) on the prompt words, using the OpenRussian-derived
// wordform → stressed-letter-index lexicon. Applies to every part of speech, so
// verbs/particles get accents even though they aren't gender-coloured.

import { normalize } from './ru-gender.js';
import { wordGroups } from './colorize.js';

const COMBINING_ACUTE = '́';
const VOWELS = /[аеёиоуыэюя]/i;
const CYRILLIC = /[Ѐ-ӿ]/;

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

/**
 * Insert a combining acute after the idx-th Cyrillic letter among `spans`.
 * Counts by Cyrillic letter, not by span, so it works whether each span holds a
 * single letter (the prompt) or a whole word (a tile).
 */
export function applyStressToSpans(spans, idx) {
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
export function markStress(root, map) {
  const marked = [];
  for (const { word, spans } of wordGroups(root)) {
    const idx = stressIndexOf(word, map);
    if (idx < 0) continue;
    if (applyStressToSpans(spans, idx)) marked.push({ word, idx });
  }
  return marked;
}
