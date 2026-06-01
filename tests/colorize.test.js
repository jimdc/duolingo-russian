import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadChallenge } from './helpers.js';
import { colorizeChallenge } from '../src/colorize.js';
import { genderOf } from '../src/ru-gender.js';

const cyr = (w) => w.replace(/[^Ѐ-ӿ]/g, '');

test('translate: only the two neuter content words get the neuter class', () => {
  const { document } = loadChallenge('ru-translate-wordbank.json');
  const applied = colorizeChallenge(document, { genderOf });
  // красное (7 letters) + ведро (5) = 12 colored letter-spans, nothing else
  assert.equal(document.querySelectorAll('.rg-neut').length, 12);
  assert.equal(document.querySelectorAll('.rg-masc').length, 0);
  assert.equal(document.querySelectorAll('.rg-fem').length, 0);
  assert.deepEqual(applied.map((a) => cyr(a.word)).sort(), ['ведро', 'красное']);
});

test('speak: neuter agreement coloring, function words (Там/и) skipped', () => {
  const { document } = loadChallenge('ru-speak-challenge.json');
  const applied = colorizeChallenge(document, { genderOf });
  // большое(7)+синее(5)+красивое(8)+море(4) = 24
  assert.equal(document.querySelectorAll('.rg-neut').length, 24);
  assert.deepEqual(
    applied.map((a) => cyr(a.word)).sort(),
    ['большое', 'красивое', 'море', 'синее'],
  );
});

test('punctuation is not colored, only Cyrillic letters', () => {
  const { document } = loadChallenge('ru-translate-wordbank.json');
  colorizeChallenge(document, { genderOf });
  // the "?" span sits in the ведро group but must stay uncolored
  const colored = [...document.querySelectorAll('.rg-neut')].map((s) => s.textContent);
  assert.ok(!colored.includes('?'));
  assert.ok(!colored.includes(' '));
});

test('no-op safety on bad input', () => {
  assert.deepEqual(colorizeChallenge(null, { genderOf }), []);
  const { document } = loadChallenge('ru-translate-wordbank.json');
  assert.deepEqual(colorizeChallenge(document, {}), []); // missing genderOf
});
