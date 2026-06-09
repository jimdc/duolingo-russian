// Regression: in "Repeat what you hear", the sentence's real letters are in the DOM
// but visually masked (you listen, then click REVEAL). Our `!important` colour /
// stress would override the mask and leak the answer. wordGroups must skip any word
// the injected hidden-check flags. The browser entry injects a getComputedStyle
// predicate; here we inject a marker-based one so the gate is testable headless.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { wordGroups, colorizeChallenge, setHiddenCheck } from '../src/colorize.js';
import { genderOf } from '../src/ru-gender.js';

// Two-word listen prompt (flat per-character spans, like the real capture). The
// hidden word's letters carry a marker the test predicate understands.
function promptDoc() {
  const word = (w, hidden) =>
    [...w].map((c) =>
      `<span aria-hidden="true"${hidden ? ' data-masked="1"' : ''}>${c}</span>`).join('')
    + '<span aria-hidden="true"> </span>';
  const html =
    '<div data-test="challenge challenge-listen"><span lang="ru">'
    + word('стол', true) + word('книга', false) // стол masked, книга visible
    + '<div data-test="hint-token" aria-label="стол"></div>'
    + '<div data-test="hint-token" aria-label="книга"></div>'
    + '</span></div>';
  return parseHTML('<!doctype html><body>' + html + '</body>').document;
}

const isMasked = (el) => !!(el.getAttribute && el.getAttribute('data-masked') === '1');

test('masked (to-be-revealed) words are skipped; visible ones still annotated', () => {
  const document = promptDoc();
  setHiddenCheck(isMasked);
  try {
    assert.deepEqual(wordGroups(document).map((g) => g.word), ['книга']); // стол skipped
    const applied = colorizeChallenge(document, { genderOf });
    assert.deepEqual(applied.map((a) => a.word), ['книга']); // only книга painted
    // none of the masked word's letters got a colour class (it stays masked)
    assert.equal(document.querySelectorAll('[data-masked] [class*="rg-"]').length, 0);
    assert.equal(document.querySelectorAll('[data-masked].rg-masc').length, 0);
  } finally {
    setHiddenCheck(null); // never leak the gate into other tests
  }
});

test('without a hidden-check, every word is read (so the entry MUST set one)', () => {
  const document = promptDoc();
  // default: hiddenCheck unset → the masked word WOULD be painted (the live bug)
  const applied = colorizeChallenge(document, { genderOf });
  assert.deepEqual(applied.map((a) => a.word).sort(), ['книга', 'стол']);
});
