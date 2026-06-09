// Regression: tapping a word-bank tile places it in the answer (active, normal
// colour) AND leaves a greyed "spent" placeholder in the bank, marked aria-disabled,
// whose text Duolingo renders transparent. Our !important colour overrode that, so
// the placed word looked duplicated ("крокодил appearing twice"). wordGroups must
// skip spent tiles — detected structurally via aria-disabled, because once we've
// painted a tile its computed colour is ours and the masking gate can't see through.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { wordGroups, colorizeChallenge } from '../src/colorize.js';
import { genderOf } from '../src/ru-gender.js';

// Real shape: aria-disabled lives on the button, an ancestor of the token-text span.
const tile = (w, disabled) =>
  `<span class="tile"><button data-test="${w}-challenge-tap-token" aria-disabled="${disabled ? 'true' : 'false'}" lang="ru">`
  + `<span class="inner"><span data-test="challenge-tap-token-text">${w}</span></span></button></span>`;

const buttonOf = (span) => {
  for (let n = span; n; n = n.parentElement) if (n.tagName === 'BUTTON') return n;
  return null;
};

test('spent (aria-disabled) tiles are skipped; active tiles still read', () => {
  const html = '<div data-test="challenge challenge-translate"><div data-test="word-bank">'
    + tile('крокодил', false) // the placed word (active)
    + tile('крокодил', true) //  the greyed spent placeholder
    + tile('котёнок', false)
    + '</div></div>';
  const { document } = parseHTML('<!doctype html><body>' + html + '</body>');
  const ch = document.querySelector('[data-test^="challenge challenge-"]');

  // Only the two active tiles are read — the spent крокодил placeholder is excluded.
  assert.deepEqual(wordGroups(ch).map((g) => g.word), ['крокодил', 'котёнок']);
});

test('colorizeChallenge paints the active tile but not its spent placeholder', () => {
  const html = '<div data-test="challenge challenge-translate"><div data-test="word-bank">'
    + tile('крокодил', false) + tile('крокодил', true)
    + '</div></div>';
  const { document } = parseHTML('<!doctype html><body>' + html + '</body>');
  const ch = document.querySelector('[data-test^="challenge challenge-"]');

  colorizeChallenge(ch, { genderOf }); // крокодил → Masculine
  const crocs = [...ch.querySelectorAll('[data-test="challenge-tap-token-text"]')]
    .map((s) => ({ disabled: buttonOf(s).getAttribute('aria-disabled'), painted: s.classList.contains('rg-masc') }));

  assert.equal(crocs.find((c) => c.disabled === 'false').painted, true, 'active placed word painted');
  assert.equal(crocs.find((c) => c.disabled === 'true').painted, false, 'spent placeholder left alone');
});
