import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeStress, stressIndexOf, markStress } from '../src/stress.js';
import { loadChallenge } from './helpers.js';

const packed = JSON.parse(
  readFileSync(new URL('../src/data/ru-stress-lexicon.json', import.meta.url), 'utf8'),
);
const map = makeStress(packed);

// Render helper for assertions: where does the accent land?
const accented = (w) => {
  const i = stressIndexOf(w, map);
  const k = w.toLowerCase().replace(/ё/g, 'е');
  return i < 0 ? null : [...k].map((c, j) => (j === i ? c + '́' : c)).join('');
};

test('stress lands on the right vowel across parts of speech', () => {
  assert.equal(accented('пожалуйста'), 'пожа́луйста'); // particle
  assert.equal(accented('надо'), 'на́до'); // adverb/predicative
  assert.equal(accented('помыть'), 'помы́ть'); // verb infinitive
  assert.equal(accented('сумку'), 'су́мку'); // declined noun
  assert.equal(accented('красную'), 'кра́сную'); // declined adjective
  assert.equal(accented('ведро'), 'ведро́'); // end stress
});

test('monosyllables are not marked', () => {
  assert.equal(stressIndexOf('дай', map), -1);
  assert.equal(stressIndexOf('я', map), -1);
});

test('markStress appends a combining acute to the prompt words', () => {
  const { document } = loadChallenge('ru-translate-wordbank.json'); // «Где красное ведро?»
  const marked = markStress(document, map);
  const words = marked.map((m) => m.word.replace(/[^Ѐ-ӿ]/g, ''));
  assert.ok(words.includes('ведро'));
  assert.ok(words.includes('красное'));
  // the actual DOM text now carries the accent
  const text = document.querySelector('[lang="ru"]').textContent;
  assert.ok(text.includes('ведро́') || text.includes('́'), 'expected a combining acute in the DOM');
});

test('word-bank tiles: stress is inserted inside the whole-word tile span', () => {
  const { document } = loadChallenge('ru-wordbank-russian-tiles.json');
  markStress(document, map);
  const tileText = (w) =>
    [...document.querySelectorAll('[data-test="challenge-tap-token-text"]')]
      .map((s) => s.textContent)
      .find((t) => t.replace(/[^Ѐ-ӿ]/g, '') === w);
  assert.equal(tileText('ведро'), 'ведро́'); // end stress, mid-string insertion
  assert.equal(tileText('красное'), 'кра́сное'); // stress on the 3rd letter
  // idempotent on tiles too
  markStress(document, map);
  assert.equal(tileText('ведро'), 'ведро́');
});

test('idempotent — re-running does not double the accent', () => {
  const { document } = loadChallenge('ru-translate-wordbank.json');
  markStress(document, map);
  const once = document.querySelector('[lang="ru"]').textContent;
  markStress(document, map);
  const twice = document.querySelector('[lang="ru"]').textContent;
  assert.equal(once, twice);
});
