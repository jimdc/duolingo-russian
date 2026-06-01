// Reproduction of the bug we're fixing: the 2018 script colors nothing on the
// current site. It keys off hashed React class names that Duolingo regenerates
// every build, so every selector it depends on matches zero elements on a real,
// freshly-captured lesson DOM. This test pins that down against live captures.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadChallenge } from './helpers.js';

// The selectors hardcoded in the 2018 gender-reveal.user.js / language-specific.js.
const DEAD_2018_SELECTORS = {
  exerciseContainer: '._1Y5M_',
  wordSpan: 'span._3_AmQ',
  genderHintCell: 'td._3s3uv',
  multipleChoiceText: 'div._3EaeX',
  languageName: 'span._386Yc',
};

const FIXTURES = ['ru-speak-challenge.json', 'ru-translate-wordbank.json'];

for (const fixture of FIXTURES) {
  test(`old 2018 selectors match nothing in ${fixture}`, () => {
    const { document } = loadChallenge(fixture);
    for (const [name, selector] of Object.entries(DEAD_2018_SELECTORS)) {
      const hits = document.querySelectorAll(selector).length;
      assert.equal(
        hits,
        0,
        `expected dead selector ${name} (${selector}) to match nothing, got ${hits}`,
      );
    }
  });
}
