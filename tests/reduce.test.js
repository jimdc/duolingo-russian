import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { loadChallenge } from './helpers.js';
import { makeStress } from '../src/stress.js';
import { reduceWord, colorizeReductions } from '../src/reduce.js';

const packed = JSON.parse(
  readFileSync(new URL('../src/data/ru-stress-lexicon.json', import.meta.url), 'utf8'),
);
const map = makeStress(packed);

// Compact view of reduceWord: "<letter><ipa>" per reduced vowel, in order.
const reduced = (word, stressIdx) =>
  [...reduceWord(word, stressIdx)].sort((a, b) => a[0] - b[0]).map(([i, r]) => word[i] + r.ipa);

test('akanye: о/а → [ɐ] first-pretonic/word-initial, [ə] elsewhere', () => {
  // молоко́: stress on the final о (idx 5) → [мə лɐ ко]
  assert.deepEqual(reduced('молоко', 5), ['оə', 'оɐ']);
  // вода́: stress on а (idx 3), pretonic о → [ɐ]
  assert.deepEqual(reduced('вода', 3), ['оɐ']);
  // го́род: stress on first о (idx 1), post-tonic о → [ə]
  assert.deepEqual(reduced('город', 1), ['оə']);
  // огуре́ц: word-initial о stays [ɐ] even as 2nd-pretonic
  assert.deepEqual(reduceWord('огурец', 4).get(0).ipa, 'ɐ');
});

test('ikanye: unstressed е/я → [ɪ], incl. а after ч/щ', () => {
  // язы́к: word-initial unstressed я → [ɪ]
  assert.deepEqual(reduced('язык', 2), ['яɪ']);
  // ведро́: pretonic е after soft в → [ɪ] (final о is the stress, so it stays)
  assert.deepEqual(reduced('ведро', 4), ['еɪ']);
  // часы́: а after ч → [ɪ]
  assert.deepEqual(reduced('часы', 3), ['аɪ']);
});

test('after ж/ш/ц (always hard): е/и → [ɨ]', () => {
  assert.deepEqual(reduced('жена', 3), ['еɨ']); // жена́ → [ʐɨna]
  assert.equal(reduceWord('цена', 3).get(1).ipa, 'ɨ'); // цена́
});

test('monosyllables and unknown stress reduce to nothing', () => {
  assert.equal(reduceWord('дом', -1).size, 0); // monosyllable
  assert.equal(reduceWord('кот', 1).size, 0); // single vowel
  assert.equal(reduceWord('молоко', -1).size, 0); // stress unknown → don't guess
});

test('у/ю/ы/и are left unmarked', () => {
  // у́тро: post-tonic о → [ə]; the у is stressed, nothing else marked
  assert.deepEqual(reduced('утро', 0), ['оə']);
  // none of these reduce visibly
  assert.equal(reduceWord('мужчина', 3).has(1), false); // у (idx1) unmarked
});

test('colorizeReductions tags prompt char-spans with rg-rd + data-ipa', () => {
  // Synthetic prompt: per-character spans + a hint-token (the prompt DOM shape).
  const word = 'молоко';
  const chars = [...word].map((c) => `<span aria-hidden="true">${c}</span>`).join('');
  const html = `<div data-test="challenge challenge-translate"><span lang="ru">${chars}`
    + `<div data-test="hint-token" aria-label="${word}"></div></span></div>`;
  const { document } = parseHTML('<!doctype html><body>' + html + '</body>');

  const applied = colorizeReductions(document, map);
  assert.deepEqual(applied, [{ word: 'молоко', count: 2 }]);
  const marks = [...document.querySelectorAll('.rg-rd')].map((s) => ({
    letter: s.textContent,
    ipa: s.getAttribute('data-ipa'),
  }));
  assert.deepEqual(marks, [
    { letter: 'о', ipa: 'ə' }, // 2nd-pretonic schwa
    { letter: 'о', ipa: 'ɐ' }, // first pretonic
  ]);
});

test('colorizeReductions wraps reduced vowels inside a whole-word tile (text preserved)', () => {
  const { document } = loadChallenge('ru-wordbank-russian-tiles.json');
  colorizeReductions(document, map);
  const tile = [...document.querySelectorAll('[data-test="challenge-tap-token-text"]')]
    .find((s) => s.textContent.replace(/[^Ѐ-ӿ]/g, '') === 'ведро');
  // textContent is unchanged…
  assert.equal(tile.textContent, 'ведро');
  // …but the pretonic е is now a wrapped [ɪ] hint.
  const e = tile.querySelector('.rg-rd');
  assert.equal(e.textContent, 'е');
  assert.equal(e.getAttribute('data-ipa'), 'ɪ');
  // idempotent: re-running doesn't double-wrap
  colorizeReductions(document, map);
  assert.equal(tile.querySelectorAll('.rg-rd').length, 1);
});
