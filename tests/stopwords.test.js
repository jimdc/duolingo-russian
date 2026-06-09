import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isFunctionWord } from '../src/stopwords.js';
import { genderOf } from '../src/ru-gender.js';

test('flags function words across the closed classes', () => {
  for (const w of [
    'в', 'на', 'без', 'через', // prepositions
    'и', 'но', 'чтобы', 'если', // conjunctions
    'не', 'же', 'бы', 'только', // particles
    'я', 'мне', 'это', 'наш', 'кто', // pronouns
    'два', 'четыре', 'сто', 'несколько', // numerals
    'надо', 'нужно', 'нельзя', 'хорошо', 'далеко', 'больше', // adverbs/predicatives
    'да', 'нет', 'пожалуйста', 'спасибо', // interjections
  ]) {
    assert.ok(isFunctionWord(w), `${w} should be a function word`);
  }
});

test('normalises case forms, ё-spelling, accents, and hyphens', () => {
  assert.ok(isFunctionWord('ЕЩЁ')); // upper + ё
  assert.ok(isFunctionWord('всё')); // ё → е (все)
  assert.ok(isFunctionWord('её')); // её → ее
  assert.ok(isFunctionWord('кто-то')); // hyphen stripped → ктото
  assert.ok(isFunctionWord('на́до')); // combining accent stripped
});

test('does NOT flag content nouns/adjectives', () => {
  for (const w of ['политик', 'стол', 'книга', 'зеркало', 'красную', 'большой', 'море', 'выставку']) {
    assert.equal(isFunctionWord(w), false, `${w} should not be a function word`);
  }
});

test('genderOf now leaves the expanded stoplist uncoloured (the old leaks)', () => {
  for (const w of ['надо', 'пожалуйста', 'два', 'четыре', 'хорошо', 'нужно', 'нельзя', 'спасибо', 'далеко']) {
    assert.equal(genderOf(w), 'Unknown', `${w} -> expected Unknown`);
  }
  // …while real content words still get their ending-based gender
  assert.equal(genderOf('политик'), 'Masculine');
  assert.equal(genderOf('стол'), 'Masculine');
  assert.equal(genderOf('книга'), 'Feminine');
});
