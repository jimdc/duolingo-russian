// Aspect (perfective/imperfective) + verbs-of-motion (unidirectional/multidirectional)
// markers. These are appended as a trailing superscript on a verb word — independent
// of the tense COLOUR — so a learner sees сде́лаю is perfective and иду́ is "one-way".
// Gender still wins: a noun/verb homograph that's gender-coloured gets no verb marker.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import {
  makeVerbMeta, verbAspectOf, verbMotionOf, colorizeVerbMeta,
} from '../src/verbs.js';

// ---- pure lookups (synthetic packed lexicon) ----
const meta = makeVerbMeta({
  aspect: { pf: 'сделаю сделать помыл домой', ipf: 'делаю делать идти ходить мыл' },
  motion: { uni: 'идти иду', multi: 'ходить хожу' },
});

test('verbAspectOf / verbMotionOf resolve forms (accent + ё + case normalised)', () => {
  assert.equal(verbAspectOf('сделаю', meta), 'pf');
  assert.equal(verbAspectOf('делаю', meta), 'ipf');
  assert.equal(verbAspectOf('Сде́лаю', meta), 'pf'); // caps + combining acute
  assert.equal(verbAspectOf('книга', meta), null);
  assert.equal(verbMotionOf('идти', meta), 'uni');
  assert.equal(verbMotionOf('ходить', meta), 'multi');
  assert.equal(verbMotionOf('делаю', meta), null); // a verb, but not a motion verb
});

// Minimal challenge: one Russian word as char-spans + a hint-token (prompt shape).
function challengeWith(word) {
  const chars = [...word].map((c) => `<span aria-hidden="true">${c}</span>`).join('');
  const html = `<div data-test="challenge challenge-translate"><span lang="ru">${chars}<div data-test="hint-token" aria-label="${word}"></div></span></div>`;
  return parseHTML('<!doctype html><body>' + html + '</body>').document;
}

test('colorizeVerbMeta appends one marker with aspect + motion sub-spans', () => {
  const doc = challengeWith('идти'); // ipf + unidirectional
  const applied = colorizeVerbMeta(doc, meta);
  assert.deepEqual(applied.map((a) => `${a.word}:${a.aspect || '-'}:${a.motion || '-'}`), ['идти:ipf:uni']);
  const marks = doc.querySelectorAll('.rg-vmeta');
  assert.equal(marks.length, 1);
  assert.equal(marks[0].querySelector('.rg-asp-ipf').textContent, 'ipf');
  assert.equal(marks[0].querySelector('.rg-mot-uni').textContent, '→');
});

test('re-running is idempotent — no duplicate markers', () => {
  const doc = challengeWith('сделаю'); // pf, no motion
  colorizeVerbMeta(doc, meta);
  const again = colorizeVerbMeta(doc, meta);
  assert.equal(again.length, 0, 'second pass marks nothing new');
  assert.equal(doc.querySelectorAll('.rg-vmeta').length, 1);
  assert.equal(doc.querySelector('.rg-asp-pf').textContent, 'pf');
  assert.equal(doc.querySelector('.rg-mot-uni'), null); // not a motion verb
});

test('gender-coloured words get no verb marker (gender wins on homographs)', () => {
  const doc = challengeWith('ходить');
  for (const s of doc.querySelectorAll('span[aria-hidden]')) s.classList.add('rg-masc');
  const applied = colorizeVerbMeta(doc, meta);
  assert.equal(applied.length, 0);
  assert.equal(doc.querySelectorAll('.rg-vmeta').length, 0);
});

test('function-word homographs get no marker (домой = adverb, not imperative of домыть)', () => {
  const doc = challengeWith('домой'); // in `meta` as pf, but домой is the adverb here
  const applied = colorizeVerbMeta(doc, meta);
  assert.equal(applied.length, 0);
  assert.equal(doc.querySelectorAll('.rg-vmeta').length, 0);
});

// ---- shipped data sanity (built from OpenRussian by scripts/build-verbs.mjs) ----
test('shipped lexicon: aspect + motion are correct for known verbs', () => {
  const shipped = makeVerbMeta(
    JSON.parse(readFileSync(new URL('../src/data/ru-verbmeta-lexicon.json', import.meta.url), 'utf8')),
  );
  // aspect
  assert.equal(verbAspectOf('сделать', shipped), 'pf');
  assert.equal(verbAspectOf('делать', shipped), 'ipf');
  assert.equal(verbAspectOf('помыл', shipped), 'pf'); // past of помыть (perfective)
  assert.equal(verbAspectOf('мыл', shipped), 'ipf'); // past of мыть (imperfective)
  // motion
  assert.equal(verbMotionOf('идти', shipped), 'uni');
  assert.equal(verbMotionOf('ходить', shipped), 'multi');
  assert.equal(verbMotionOf('иду', shipped), 'uni');
  assert.equal(verbMotionOf('хожу', shipped), 'multi');
  assert.equal(verbMotionOf('шёл', shipped), 'uni'); // irregular past of идти
  assert.equal(verbMotionOf('делать', shipped), null); // not a motion verb
  // homograph dropped on collision: лечу = лететь (motion) vs лечить (treat) → ambiguous
  assert.equal(verbMotionOf('лечу', shipped), null);
});
