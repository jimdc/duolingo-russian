// Pull the ordered Russian prompt words out of a Duolingo challenge element.
//
// Confirmed against real captures (tests/fixtures/): in both `challenge-speak`
// and `challenge-translate` exercises, the Russian sentence is rendered as
// per-character spans with transparent `[data-test="hint-token"]` overlays, one
// per word, whose `aria-label` holds the whole word in reading order. The
// aria-labels are the cleanest source — no need to reassemble from char spans.

/**
 * @param {Element|Document|null} root a challenge container (or anything above it)
 * @returns {string[]} Russian words in reading order, e.g. ['Где','красное','ведро']
 */
export function extractRussianWords(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return [];
  return [...root.querySelectorAll('[data-test="hint-token"]')]
    .map((el) => (el.getAttribute('aria-label') || '').trim())
    .filter((w) => w.length > 0);
}

/** True if the element is a challenge container we know how to read. */
export function isSupportedChallenge(el) {
  const dt = el?.getAttribute?.('data-test') || '';
  return /\bchallenge\b/.test(dt);
}
