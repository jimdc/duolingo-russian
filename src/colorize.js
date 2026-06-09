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

export const GENDER_CLASS = {
  Masculine: 'rg-masc',
  Feminine: 'rg-fem',
  Neuter: 'rg-neut',
};

const isCharSpan = (el) =>
  el.tagName === 'SPAN' && el.getAttribute('aria-hidden') === 'true';

const isWhitespace = (s) => /^\s*$/.test(s.textContent || '');

export const hasCyrillic = (s) => /[Ѐ-ӿ]/.test(s.textContent || '');

// Optional gate: skip words Duolingo is visually masking (e.g. the to-be-revealed
// sentence in "Repeat what you hear"). Their real letters sit in the DOM but are
// hidden by style, so our `!important` colour would reveal them — i.e. leak the
// answer. The check needs layout, so the userscript entry injects a getComputedStyle
// predicate; in headless tests it's unset and nothing is hidden.
let hiddenCheck = null;
/** @param {((el: Element) => boolean) | null} fn predicate: is this word masked? */
export function setHiddenCheck(fn) {
  hiddenCheck = typeof fn === 'function' ? fn : null;
}
const isHidden = (el) => !!(hiddenCheck && el && hiddenCheck(el));

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
export function wordGroups(root) {
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
      if (isHidden(spans[0])) continue; // masked (to-be-revealed) word — don't reveal it
      groups.push({ word: spans.map((s) => s.textContent).join(''), spans });
    }
  }

  // Word-bank / match tiles: each tile holds its whole word in one text node.
  // Only Russian tiles matter — non-Cyrillic tiles (e.g. English answers) are
  // left out so the colour/stress passes never touch them.
  for (const tile of root.querySelectorAll('[data-test="challenge-tap-token-text"]')) {
    if (isHidden(tile)) continue;
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
export function colorizeChallenge(root, opts = {}) {
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
