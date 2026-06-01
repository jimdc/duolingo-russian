import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeLexicon, lexiconGender } from '../src/lexicon.js';
import { colorizeChallenge } from '../src/colorize.js';
import { loadChallenge } from './helpers.js';

const packed = JSON.parse(
  readFileSync(new URL('../src/data/ru-gender-lexicon.json', import.meta.url), 'utf8'),
);
const lex = makeLexicon(packed);
const g = (w) => lexiconGender(w, lex);

test('oblique noun/adjective forms now resolve (the reported misses)', () => {
  assert.equal(g('сумку'), 'Feminine'); // acc of сумка
  assert.equal(g('красную'), 'Feminine'); // fem-acc of красный
  assert.equal(g('чашку'), 'Feminine'); // acc of чашка
  assert.equal(g('синюю'), 'Feminine'); // fem-acc of синий
  assert.equal(g('сумку,'), 'Feminine'); // trailing punctuation tolerated
});

test('non-nouns are left uncoloured (the reported false positives)', () => {
  for (const w of ['Дай', 'мне', 'надо', 'помыть', 'пожалуйста', 'и', 'где'])
    assert.equal(g(w), 'Unknown', `${w} should be Unknown`);
});

test('hard nominative cases still correct', () => {
  assert.equal(g('время'), 'Neuter'); // -мя neuter
  assert.equal(g('мать'), 'Feminine'); // -ь feminine
  assert.equal(g('день'), 'Masculine'); // -ь masculine
  assert.equal(g('стол'), 'Masculine');
  assert.equal(g('окно'), 'Neuter');
});

test('lexicon path colours the original fixtures end-to-end', () => {
  for (const fx of ['ru-speak-challenge.json', 'ru-translate-wordbank.json']) {
    const { document } = loadChallenge(fx);
    const applied = colorizeChallenge(document, { genderOf: g });
    assert.ok(applied.length > 0, `${fx}: expected colouring via lexicon`);
    for (const a of applied) assert.equal(a.gender, 'Neuter', `${fx}: ${a.word}`);
  }
});
