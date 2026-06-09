// Regression: a word-bank "Write this in Russian" challenge paints the bank on the
// first pass, then — as the user taps words — Duolingo mounts FRESH tiles in the
// answer area. The entry used to latch each challenge done after the first paint
// (ch.dataset.rgDone), so the assembled answer stayed bare: no gender, no stress,
// no schwa. annotateAll re-runs idempotently, so the new tiles get painted too.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { makeLexicon } from '../src/lexicon.js';
import { makeStress } from '../src/stress.js';
import { makeVerbTense } from '../src/verbs.js';
import { annotateAll } from '../src/annotate.js';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const deps = {
  lexicon: makeLexicon(load('../src/data/ru-gender-lexicon.json')),
  stress: makeStress(load('../src/data/ru-stress-lexicon.json')),
  verb: makeVerbTense(load('../src/data/ru-verb-lexicon.json')),
};

const cyr = (s) => s.replace(/[^Ѐ-ӿ]/g, '');
const tile = (w) =>
  `<span class="tile"><button data-test="${w}-challenge-tap-token" lang="ru">`
  + `<span data-test="challenge-tap-token-text">${w}</span></button></span>`;
const tokenFor = (root, word) =>
  [...root.querySelectorAll('[data-test="challenge-tap-token-text"]')]
    .find((s) => cyr(s.textContent) === word);

test('annotateAll paints answer-area tiles tapped after the first paint', () => {
  // First render: only the word bank exists (the answer area is empty).
  const { document } = parseHTML(
    '<!doctype html><body><div data-test="challenge challenge-translate">'
    + '<div data-test="answer-area"></div>'
    + '<div data-test="word-bank">' + ['стол', 'этот'].map(tile).join('') + '</div>'
    + '</div></body>',
  );
  const ch = document.querySelector('[data-test^="challenge challenge-"]');

  annotateAll(document, deps); // tick 1: paints the bank
  const bankEtot = tokenFor(document.querySelector('[data-test="word-bank"]'), 'этот');
  assert.ok(bankEtot.classList.contains('rg-masc'), 'bank tile gets gender');
  assert.ok(bankEtot.textContent.includes('́'), 'bank tile gets stress');
  assert.equal(bankEtot.querySelector('.rg-rd[data-ipa="ə"]').textContent, 'о', 'bank tile gets schwa');

  // User taps "этот": Duolingo mounts a FRESH, unpainted tile in the answer area.
  const answer = ch.querySelector('[data-test="answer-area"]');
  answer.innerHTML = tile('этот');
  const newEtot = tokenFor(answer, 'этот');
  assert.equal(newEtot.className, '', 'new answer tile starts bare');

  annotateAll(document, deps); // tick 2: must paint the new node (the fix)
  assert.ok(newEtot.classList.contains('rg-masc'), 'answer tile gets gender');
  assert.ok(newEtot.textContent.includes('́'), 'answer tile gets stress');
  assert.equal(newEtot.querySelector('.rg-rd[data-ipa="ə"]').textContent, 'о', 'answer tile gets schwa');

  // …and re-running did not double-mark the original bank tile.
  assert.equal((bankEtot.textContent.match(/́/g) || []).length, 1, 'no doubled acute');
  assert.equal(bankEtot.querySelectorAll('.rg-rd').length, 1, 'no doubled reduction wrapper');
});

test('annotateAll is a no-op on bad input', () => {
  assert.doesNotThrow(() => annotateAll(null, deps));
  assert.doesNotThrow(() => annotateAll(undefined, deps));
});
