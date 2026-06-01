// The new approach: pull Russian words from `[data-test="hint-token"]` aria-labels.
// Verified against the same real captures the old selectors fail on.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadChallenge } from './helpers.js';
import { extractRussianWords } from '../src/extract-russian.js';

test('extracts the prompt words from the speak challenge', () => {
  const { document } = loadChallenge('ru-speak-challenge.json');
  assert.deepEqual(extractRussianWords(document), [
    'Там', 'большое', 'синее', 'и', 'красивое', 'море',
  ]);
});

test('extracts the prompt words from the translate challenge', () => {
  const { document } = loadChallenge('ru-translate-wordbank.json');
  assert.deepEqual(extractRussianWords(document), ['Где', 'красное', 'ведро']);
});

test('returns [] for junk input instead of throwing', () => {
  assert.deepEqual(extractRussianWords(null), []);
  assert.deepEqual(extractRussianWords({}), []);
});
