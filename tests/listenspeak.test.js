// Real capture (scripts/visual/capture.mjs): a "Repeat what you hear" challenge,
// «Наш отец умеет готовить», where отец is shown and Наш/умеет/готовить are masked
// (transparent text via a hashed CSS class). Because the masking lives in Duolingo's
// stylesheet — not the HTML — linkedom can't see it, so we feed the capture's
// ground-truth masked-word set through setHiddenCheck (the stand-in for the entry's
// getComputedStyle predicate). Asserts annotation never reveals a masked word, and
// that без the gate the verbs leak — proving the gate is what protects the answer.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { loadChallenge } from './helpers.js';
import { wordGroups, setHiddenCheck } from '../src/colorize.js';
import { annotateChallenge } from '../src/annotate.js';
import { makeLexicon } from '../src/lexicon.js';
import { makeStress } from '../src/stress.js';
import { makeVerbTense } from '../src/verbs.js';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const deps = {
  lexicon: makeLexicon(load('../src/data/ru-gender-lexicon.json')),
  stress: makeStress(load('../src/data/ru-stress-lexicon.json')),
  verb: makeVerbTense(load('../src/data/ru-verb-lexicon.json')),
};

// A prompt char-span's word = its wrapper's hint-token aria-label (real DOM shape).
const wordOfSpan = (span) => {
  const tok = span.parentElement && span.parentElement.querySelector('[data-test="hint-token"]');
  return tok ? tok.getAttribute('aria-label') : null;
};
const cyrMarks = (el) =>
  [...el.querySelectorAll('span[aria-hidden="true"]')].filter((s) => /[Ѐ-ӿ]/.test(s.textContent));

test('annotation never reveals a masked word; the shown word is still annotated', () => {
  const { document, meta } = loadChallenge('ru-listenspeak-masked.json');
  const ch = document.querySelector('[data-test^="challenge challenge-"]');
  const masked = new Set(meta.maskedWords); // ["Наш","умеет","готовить"] from the capture

  setHiddenCheck((span) => masked.has(wordOfSpan(span)));
  try {
    // wordGroups skips the masked words entirely — only отец is readable.
    assert.deepEqual(wordGroups(ch).map((g) => g.word), ['отец']);

    annotateChallenge(ch, deps);

    // No masked letter got a colour class or a stress acute.
    const leaked = cyrMarks(ch).filter((s) => masked.has(wordOfSpan(s)))
      .some((s) => /rg-/.test(s.className) || (s.textContent || '').includes('́'));
    assert.equal(leaked, false, 'a masked word was revealed by annotation');

    // отец (shown) is annotated: gender-coloured + stressed.
    const shown = cyrMarks(ch).filter((s) => wordOfSpan(s) === 'отец');
    assert.ok(shown.some((s) => s.classList.contains('rg-masc')), 'отец coloured masculine');
    assert.ok(shown.some((s) => (s.textContent || '').includes('́')), 'отец stressed');
  } finally {
    setHiddenCheck(null);
  }
});

test('WITHOUT the gate, the masked verbs leak (умеет/готовить get tense + stress)', () => {
  const { document, meta } = loadChallenge('ru-listenspeak-masked.json');
  const ch = document.querySelector('[data-test^="challenge challenge-"]');
  const masked = new Set(meta.maskedWords);

  setHiddenCheck(null); // no gate → the live bug
  annotateChallenge(ch, deps);

  const leaked = cyrMarks(ch).filter((s) => masked.has(wordOfSpan(s)))
    .some((s) => /rg-/.test(s.className) || (s.textContent || '').includes('́'));
  assert.equal(leaked, true, 'expected masked words to leak without the gate');
});
