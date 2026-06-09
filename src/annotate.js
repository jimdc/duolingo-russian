// Annotate one Duolingo challenge in place: gender colour, verb tense, stress mark,
// and (CSS-gated) vowel-reduction hints — the exact sequence the userscript runs on
// every poll. Kept as one tested unit so the browser entry can't drift from the
// tests, and so the "re-run paints newly-tapped answer-area tiles" contract is
// covered (see tests/reannotate.test.js).
//
// Why re-run instead of paint-once: a word-bank challenge renders the bank first,
// then — as you tap words — Duolingo mounts FRESH, unpainted tiles in the answer
// area. The entry used to latch each challenge "done" after the first paint, so the
// assembled answer stayed bare (no gender/stress/reduction). Re-running every tick
// catches those new nodes. Each step is idempotent at the element level (stress
// bails on an existing acute, the class-adders are no-ops on repeat, reduction bails
// on an existing .rg-rd), so re-painting never doubles a mark.

import { colorizeChallenge } from './colorize.js';
import { colorizeVerbs, verbTenseOf, colorizeVerbMeta } from './verbs.js';
import { lexiconGender } from './lexicon.js';
import { genderOf } from './ru-gender.js';
import { markStress } from './stress.js';
import { colorizeReductions } from './reduce.js';

/**
 * Gender for colouring: the OpenRussian lexicon is authoritative; if a word is
 * absent from it, fall back to the ending heuristic — but ONLY for words that
 * aren't verb forms (those are left for tense colouring) and aren't function
 * words (genderOf's stoplist handles those). This recovers common nouns missing
 * from OpenRussian (e.g. поли́тик) without re-introducing the mis-colouring the
 * lexicon-first switch fixed. @returns {'Masculine'|'Feminine'|'Neuter'|'Unknown'}
 */
export function resolveGender(word, deps = {}) {
  const { lexicon, verb } = deps;
  const g = lexiconGender(word, lexicon);
  if (g !== 'Unknown') return g; // lexicon wins (incl. on homographs)
  if (verbTenseOf(word, verb)) return 'Unknown'; // verb form → tense colouring owns it
  return genderOf(word); // guarded ending heuristic (function words → Unknown)
}

/**
 * Run the full annotation sequence over one challenge container.
 * @param {Element} ch a `[data-test^="challenge challenge-"]` element
 * @param {{lexicon: object, stress: Map, verb: Map, verbMeta?: object}} deps built lexicons
 */
export function annotateChallenge(ch, deps) {
  const { lexicon, stress, verb, verbMeta } = deps || {};
  colorizeChallenge(ch, { genderOf: (w) => resolveGender(w, { lexicon, verb }) });
  colorizeVerbs(ch, { tenseOf: (w) => verbTenseOf(w, verb) }); // gender wins; runs after
  markStress(ch, stress);
  colorizeReductions(ch, stress); // stress must run first (it mutates tile text)
  colorizeVerbMeta(ch, verbMeta); // aspect/motion superscript; appended last (trailing sibling)
}

/**
 * Annotate every challenge under `root`. Safe to call on each poll: idempotent on
 * already-painted nodes, and it picks up tiles added since the last call.
 * @param {Element|Document} root
 * @param {{lexicon: object, stress: Map, verb: Map, verbMeta?: object}} deps
 */
export function annotateAll(root, deps) {
  if (!root?.querySelectorAll) return;
  for (const ch of root.querySelectorAll('[data-test^="challenge challenge-"]')) {
    annotateChallenge(ch, deps);
  }
}
