import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';
import { makeVerbTense, verbTenseOf, colorizeVerbs } from '../src/verbs.js';

const packed = JSON.parse(
  readFileSync(new URL('../src/data/ru-verb-lexicon.json', import.meta.url), 'utf8'),
);
const map = makeVerbTense(packed);
const t = (w) => verbTenseOf(w, map);

test('verb forms map to the right tense/mood', () => {
  assert.equal(t('помыл'), 'past');
  assert.equal(t('мою'), 'pres'); // мыть is imperfective -> present
  assert.equal(t('помою'), 'fut'); // помыть is perfective -> future
  assert.equal(t('помой'), 'imp');
  assert.equal(t('помыть'), 'inf');
  assert.equal(t('сделаю'), 'fut');
  assert.equal(t('книга'), null); // not a verb
});

// Minimal synthetic challenge: one Russian word as char-spans + a hint-token.
function challengeWith(word) {
  const chars = [...word].map((c) => `<span aria-hidden="true">${c}</span>`).join('');
  const html = `<div data-test="challenge challenge-translate"><span lang="ru">${chars}<div data-test="hint-token" aria-label="${word}"></div></span></div>`;
  return parseHTML('<!doctype html><body>' + html + '</body>').document;
}

test('colorizeVerbs adds the tense class to the verb letters', () => {
  const doc = challengeWith('помыл');
  const applied = colorizeVerbs(doc, { tenseOf: t });
  assert.equal(applied.length, 1);
  assert.equal(applied[0].tense, 'past');
  assert.equal(doc.querySelectorAll('.rg-past').length, 5); // помыл
});

test('word-bank tiles: a verb tile gets its tense class', () => {
  const json = JSON.parse(
    readFileSync(new URL('./fixtures/ru-wordbank-russian-tiles.json', import.meta.url), 'utf8'),
  );
  const { document } = parseHTML('<!doctype html><body>' + json.challengeHTML + '</body>');
  const applied = colorizeVerbs(document, { tenseOf: t });
  // читаю → present; the noun/adjective tiles aren't verbs.
  assert.deepEqual(applied.map((a) => `${a.word}:${a.tense}`), ['читаю:pres']);
  assert.equal(document.querySelectorAll('.rg-pres').length, 1);
});

test('gender-coloured words are skipped (gender wins on homographs)', () => {
  const doc = challengeWith('мыл');
  for (const s of doc.querySelectorAll('span[aria-hidden]')) s.classList.add('rg-masc');
  const applied = colorizeVerbs(doc, { tenseOf: t });
  assert.equal(applied.length, 0);
  assert.equal(doc.querySelectorAll('.rg-past').length, 0);
});

test('function-word homographs of imperatives are not verb-coloured (домой)', () => {
  assert.equal(t('домой'), 'imp'); // the lexicon DOES hold it (imperative of домыть)…
  const doc = challengeWith('домой'); // …but домой here is the adverb "homeward"
  const applied = colorizeVerbs(doc, { tenseOf: t });
  assert.equal(applied.length, 0);
  assert.equal(doc.querySelectorAll('.rg-imp').length, 0);
});
