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
 * Add gender classes to the Russian words in `root`.
 * @param {Element|Document} root a challenge container
 * @param {{genderOf: (w: string) => string}} opts
 * @returns {{word: string, gender: string, cls: string}[]} words actually colored
 */
export function colorizeChallenge(root, opts = {}) {
  const { genderOf } = opts;
  if (!root?.querySelectorAll || typeof genderOf !== 'function') return [];

  const containers = new Set(
    [...root.querySelectorAll('[data-test="hint-token"]')]
      .map((t) => t.parentElement)
      .filter(Boolean),
  );

  const applied = [];
  for (const container of containers) {
    const charSpans = [...container.children].filter(isCharSpan);
    for (const group of groupByWhitespace(charSpans)) {
      const word = group.map((s) => s.textContent).join('');
      const gender = genderOf(word);
      const cls = GENDER_CLASS[gender];
      if (!cls) continue; // Unknown / function word -> leave alone
      for (const s of group) if (hasCyrillic(s)) s.classList.add(cls);
      applied.push({ word, gender, cls });
    }
  }
  return applied;
}
