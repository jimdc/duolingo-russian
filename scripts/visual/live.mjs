// Tier-2 visual check: connect to YOUR already-running, logged-in Chrome over the
// DevTools protocol and screenshot the current lesson — real Duolingo, with the
// userscript actually running via Tampermonkey.
//
// 1. Quit Chrome, then relaunch it with remote debugging (keeps your profile/login):
//      /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222
// 2. Open a Russian lesson.
// 3. npm run visual:live        (then review images/live-lesson.png)

import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = new URL('../../', import.meta.url);
const endpoint = process.argv[2] || 'http://localhost:9222';

let browser;
try {
  browser = await chromium.connectOverCDP(endpoint);
} catch (e) {
  console.error(`Could not connect to ${endpoint}.`);
  console.error('Launch Chrome with:  --remote-debugging-port=9222  (quit Chrome first).');
  process.exit(1);
}

const ctx = browser.contexts()[0];
const pages = ctx ? ctx.pages() : [];
const page = pages.find((p) => /duolingo\.com/.test(p.url())) || pages[0];
if (!page) {
  console.error('No open tab found. Open a Duolingo lesson, then re-run.');
  await browser.close();
  process.exit(1);
}

console.log('capturing:', page.url());
const out = fileURLToPath(new URL('images/live-lesson.png', ROOT));
await page.screenshot({ path: out });
console.log('saved images/live-lesson.png — review it (and I can read it back).');
await browser.close(); // disconnects CDP; does not close your Chrome
