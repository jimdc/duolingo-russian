// The guarded heuristic fallback: lexicon-first, then the ending rule for content
// nouns OpenRussian is missing (e.g. политик), but never for verb forms or function
// words. Reproduces the reported bug — политик stayed uncoloured because it's absent
// from the gender lexicon — and pins the guards that keep it from over-colouring.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeLexicon } from '../src/lexicon.js';
import { makeVerbTense } from '../src/verbs.js';
import { resolveGender } from '../src/annotate.js';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const deps = {
  lexicon: makeLexicon(load('../src/data/ru-gender-lexicon.json')),
  verb: makeVerbTense(load('../src/data/ru-verb-lexicon.json')),
};

test('lexicon is authoritative when the word is known', () => {
  assert.equal(resolveGender('зеркало', deps), 'Neuter');
  assert.equal(resolveGender('выставку', deps), 'Feminine'); // inflected
  assert.equal(resolveGender('москвы', deps), 'Feminine');
});

test('content noun missing from OpenRussian falls back to the heuristic (the bug)', () => {
  assert.equal(resolveGender('политик', deps), 'Masculine');
});

test('verb forms are never gender-coloured (left for tense colouring)', () => {
  // genderOf alone would call these Masculine — the verb-lexicon guard stops that.
  assert.equal(resolveGender('обсуждает', deps), 'Unknown'); // present
  assert.equal(resolveGender('дай', deps), 'Unknown'); // imperative
  assert.equal(resolveGender('помой', deps), 'Unknown'); // imperative
});

test('function words stay Unknown via the stoplist', () => {
  for (const w of ['надо', 'пожалуйста', 'два', 'четыре', 'хорошо', 'нужно', 'нельзя', 'наш', 'это']) {
    // (это is also in the lexicon as Neuter; either way it is not heuristic-coloured)
    const g = resolveGender(w, deps);
    assert.ok(g === 'Unknown' || g === 'Neuter', `${w} -> ${g}`);
  }
});

test('no lexicon/verb deps → pure heuristic (still stoplisted)', () => {
  assert.equal(resolveGender('политик', {}), 'Masculine');
  assert.equal(resolveGender('надо', {}), 'Unknown');
});
