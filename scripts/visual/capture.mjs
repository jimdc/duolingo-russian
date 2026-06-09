// Tier-2 capture: attach (read-only) to YOUR logged-in Chrome over CDP and record
// each challenge's real DOM + computed masking styles as you play a lesson. YOU drive
// the lesson normally; this just watches and saves one fixture per challenge — no
// DevTools snippets. Used to turn live challenges (especially the listen/reveal
// masking) into faithful test fixtures.
//
// 1. Quit Chrome, relaunch with remote debugging (keeps your profile + login):
//      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --remote-debugging-port=9222
// 2. Open a Russian lesson.
// 3. node scripts/visual/capture.mjs        (play the lesson; Ctrl-C to stop)
//
// Captures land in captures/ (gitignored). Hand-pick the interesting ones into
// tests/fixtures/ afterwards.

import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('../../', import.meta.url);
const endpoint = process.argv[2] || 'http://localhost:9222';
const OUT = new URL('captures/', ROOT);
mkdirSync(OUT, { recursive: true });

let browser;
try {
  browser = await chromium.connectOverCDP(endpoint);
} catch (e) {
  console.error(`Could not connect to ${endpoint}.`);
  console.error('Quit Chrome, relaunch with --remote-debugging-port=9222, open a lesson, then re-run.');
  process.exit(1);
}

const ctx = browser.contexts()[0];
const page = (ctx ? ctx.pages() : []).find((p) => /duolingo\.com/.test(p.url())) || (ctx && ctx.pages()[0]);
if (!page) { console.error('No open tab found. Open a Duolingo lesson, then re-run.'); await browser.close(); process.exit(1); }

console.log('watching', page.url());
console.log('Play the lesson normally — I capture each challenge. Ctrl-C to stop.\n');

// Runs in-page: a change-signature + the full capture payload (DOM + computed styles
// of every Cyrillic word, so we can see exactly how masked words are hidden).
const probe = () => {
  const ch = document.querySelector('[data-test^="challenge challenge-"]');
  if (!ch) return null;
  const type = ch.getAttribute('data-test');
  const cyr = (s) => /[Ѐ-ӿ]/.test(s || '');
  const styleOf = (el) => {
    const c = getComputedStyle(el);
    return { color: c.color, visibility: c.visibility, opacity: c.opacity, display: c.display };
  };
  const words = [];
  ch.querySelectorAll('span[aria-hidden="true"]').forEach((s) => {
    if (cyr(s.textContent)) words.push({ kind: 'char', text: s.textContent, ...styleOf(s) });
  });
  ch.querySelectorAll('[data-test="challenge-tap-token-text"]').forEach((s) => {
    if (cyr(s.textContent)) words.push({ kind: 'tile', text: s.textContent, ...styleOf(s) });
  });
  const sig = type + '|' + words.map((w) => w.text).join('') + '|' + ch.textContent.length;
  return { type, sig, words, html: ch.outerHTML, url: location.href };
};

const isTransparent = (c) => {
  const m = (c || '').match(/^rgba?\(([^)]+)\)/);
  if (!m) return false;
  const p = m[1].split(',');
  return p.length === 4 && parseFloat(p[3]) === 0;
};

let last = '';
let n = 0;
let stop = false;
process.on('SIGINT', () => { stop = true; });

while (!stop) {
  let cap = null;
  try { cap = await page.evaluate(probe); } catch (e) { /* mid-navigation between challenges */ }
  if (cap && cap.sig !== last) {
    last = cap.sig;
    n += 1;
    const name = String(n).padStart(3, '0') + '-' + cap.type.replace(/[^a-z0-9-]/gi, '_');
    writeFileSync(
      new URL(name + '.json', OUT),
      JSON.stringify({ url: cap.url, type: cap.type, words: cap.words, challengeHTML: cap.html }, null, 2) + '\n',
    );
    const masked = cap.words.filter((w) => w.visibility === 'hidden' || parseFloat(w.opacity) === 0 || isTransparent(w.color));
    console.log(`#${n}  ${cap.type}  (${cap.words.length} words${masked.length ? `, ${masked.length} MASKED` : ''}) → captures/${name}.json`);
    if (masked.length) console.log('     masked:', masked.map((w) => `${w.text}{${w.color},vis:${w.visibility},op:${w.opacity}}`).join(' '));
  }
  await page.waitForTimeout(500);
}
console.log(`\ncaptured ${n} challenge(s) → captures/`);
await browser.close(); // disconnects CDP; does not close your Chrome
