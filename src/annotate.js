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
import { colorizeVerbs, verbTenseOf } from './verbs.js';
import { lexiconGender } from './lexicon.js';
import { markStress } from './stress.js';
import { colorizeReductions } from './reduce.js';

/**
 * Run the full annotation sequence over one challenge container.
 * @param {Element} ch a `[data-test^="challenge challenge-"]` element
 * @param {{lexicon: object, stress: Map, verb: Map}} deps built lexicons
 */
export function annotateChallenge(ch, deps) {
  const { lexicon, stress, verb } = deps || {};
  colorizeChallenge(ch, { genderOf: (w) => lexiconGender(w, lexicon) });
  colorizeVerbs(ch, { tenseOf: (w) => verbTenseOf(w, verb) }); // gender wins; runs after
  markStress(ch, stress);
  colorizeReductions(ch, stress); // stress must run first (it mutates tile text)
}

/**
 * Annotate every challenge under `root`. Safe to call on each poll: idempotent on
 * already-painted nodes, and it picks up tiles added since the last call.
 * @param {Element|Document} root
 * @param {{lexicon: object, stress: Map, verb: Map}} deps
 */
export function annotateAll(root, deps) {
  if (!root?.querySelectorAll) return;
  for (const ch of root.querySelectorAll('[data-test^="challenge challenge-"]')) {
    annotateChallenge(ch, deps);
  }
}
