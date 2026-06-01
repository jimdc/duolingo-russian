// Gender lookup backed by the OpenRussian-derived wordform lexicon.
//
// Replaces the nominative-only ending heuristic for live colouring: it knows
// every declined form (сумку → f, красную → f) AND, by only containing nouns
// and adjectives, it returns Unknown for verbs/particles/pronouns (дай, надо,
// пожалуйста), so they're left uncoloured. Under-colour beats mis-colour.

import { normalize } from './ru-gender.js';

/** Build {m,f,n} Sets from the packed `{m,f,n: "form form ..."}` lexicon. */
export function makeLexicon(packed) {
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
export function lexiconGender(word, lex) {
  if (!lex) return 'Unknown';
  const w = normalize(word).replace(/ё/g, 'е'); // lexicon keys are built with ё→е
  if (!w) return 'Unknown';
  if (lex.f.has(w)) return 'Feminine';
  if (lex.m.has(w)) return 'Masculine';
  if (lex.n.has(w)) return 'Neuter';
  return 'Unknown';
}
