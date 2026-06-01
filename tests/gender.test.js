import { test } from 'node:test';
import assert from 'node:assert/strict';
import { genderOf, normalize } from '../src/ru-gender.js';
import { loadChallenge } from './helpers.js';
import { extractRussianWords } from '../src/extract-russian.js';

test('basic ending rules', () => {
  assert.equal(genderOf('стол'), 'Masculine');   // consonant
  assert.equal(genderOf('музей'), 'Masculine');  // -й
  assert.equal(genderOf('книга'), 'Feminine');   // -а
  assert.equal(genderOf('неделя'), 'Feminine');  // -я
  assert.equal(genderOf('окно'), 'Neuter');      // -о
  assert.equal(genderOf('море'), 'Neuter');      // -е
});

test('exceptions the bare endings would get wrong', () => {
  assert.equal(genderOf('папа'), 'Masculine');   // -а but masculine
  assert.equal(genderOf('дядя'), 'Masculine');   // -я but masculine
  assert.equal(genderOf('время'), 'Neuter');     // -мя neuter, not feminine
  assert.equal(genderOf('имя'), 'Neuter');
  assert.equal(genderOf('мать'), 'Feminine');    // -ь feminine
  assert.equal(genderOf('день'), 'Masculine');   // -ь masculine
  assert.equal(genderOf('тетрадь'), 'Feminine'); // -ь feminine, from the list
});

test('ambiguous soft-sign nouns not in the lists stay Unknown', () => {
  assert.equal(genderOf('абвгдь'), 'Unknown');
});

test('function words and non-Cyrillic are not colored', () => {
  assert.equal(genderOf('где'), 'Unknown');
  assert.equal(genderOf('и'), 'Unknown');
  assert.equal(genderOf('там'), 'Unknown');
  assert.equal(genderOf('bucket'), 'Unknown');
  assert.equal(genderOf(''), 'Unknown');
  assert.equal(genderOf(null), 'Unknown');
});

test('normalize strips stress accents and punctuation', () => {
  assert.equal(normalize('ра́дио'), 'радио');
  assert.equal(normalize('ведро?'), 'ведро');
  assert.equal(normalize('Большо́е,'), 'большое');
});

test('agreeing adjectives + noun resolve to neuter on both real sentences', () => {
  for (const fx of ['ru-speak-challenge.json', 'ru-translate-wordbank.json']) {
    const { document } = loadChallenge(fx);
    const colored = extractRussianWords(document)
      .map((w) => [w, genderOf(w)])
      .filter(([, g]) => g !== 'Unknown');
    // every colored word in these two sentences is neuter
    assert.ok(colored.length > 0, `${fx}: expected some colored words`);
    for (const [word, g] of colored) {
      assert.equal(g, 'Neuter', `${fx}: ${word} -> ${g}, expected Neuter`);
    }
  }
});
