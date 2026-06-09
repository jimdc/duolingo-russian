// Dev hot-reload: push the freshly-built dist/ userscript into the dedicated debug
// Chrome over CDP — no Tampermonkey re-import, no @version bump, no auto-update lag.
// This exists because a stale Tampermonkey copy is easy to not notice (you end up
// debugging a bug that's already fixed on master); injecting what you just built
// means you always run exactly the current code.
//
//   npm run chrome:debug      # once: dedicated profile on :9222 (see chrome-debug.sh)
//   npm run build             # produce dist/
//   npm run dev:inject        # evaluate dist/ in the open Duolingo tab
//
// In the debug profile, DISABLE the Tampermonkey copy of this script (toggle it off
// in the dashboard) so only the injected build runs — otherwise both annotate and the
// version stamp flickers between the two copies. Re-enable it for a pre-release smoke
// test of the real GM_xmlhttpRequest path. The injected copy shares the same IndexedDB
// lexicon cache, so it loads instantly off a warm cache; setBypassCSP covers a cold one
// (the entry falls back to fetch() when GM_xmlhttpRequest is absent).
//
// Override the endpoint with CDP=... or argv[2] (default http://localhost:9222).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = new URL('../../', import.meta.url);
const DIST = new URL('dist/duolingo-russian.user.js', ROOT);

/**
 * Wrap the built bundle so re-running it on an already-loaded page is idempotent:
 * each run tears down the previous instance's interval + injected DOM before starting,
 * so hot-reloading never stacks intervals or leaves a stale legend/style behind.
 */
export function payload() {
  const bundle = readFileSync(DIST, 'utf8');
  return [
    ';(function () {',
    '  if (typeof window !== "undefined" && window.__rgDevTeardown) { try { window.__rgDevTeardown(); } catch (e) {} }',
    '  var __rgIv = [], __si = window.setInterval;',
    '  window.setInterval = function () { var id = __si.apply(this, arguments); __rgIv.push(id); return id; };',
    '  try {',
    bundle,
    '  } finally { window.setInterval = __si; }',
    '  window.__rgDevTeardown = function () {',
    '    try { __rgIv.forEach(function (id) { clearInterval(id); }); } catch (e) {}',
    '    var s = document.getElementById("rg-style"); if (s) s.remove();',
    '    var l = document.getElementById("rg-legend"); if (l) l.remove();',
    '  };',
    '})();',
  ].join('\n');
}

/** Connect to the debug Chrome and find its Duolingo tab. */
export async function connect(endpoint = process.env.CDP || process.argv[2] || 'http://localhost:9222') {
  const browser = await chromium.connectOverCDP(endpoint);
  const ctx = browser.contexts()[0];
  const pages = ctx ? ctx.pages() : [];
  const page = pages.find((p) => /duolingo\.com/.test(p.url())) || pages[0] || null;
  return { browser, page };
}

/**
 * Inject the current dist/ into `page`: immediately (so the open lesson updates now)
 * and on future loads (so a reload still runs it, like a real userscript at
 * document-start). Pass the prior scriptId to avoid stacking new-document scripts.
 * @returns {{ver: string, scriptId: string}}
 */
export async function inject(page, prevId) {
  const session = await page.context().newCDPSession(page);
  try { await session.send('Page.enable'); } catch (e) { /* already enabled */ }
  try { await session.send('Page.setBypassCSP', { enabled: true }); } catch (e) { /* best-effort */ }
  if (prevId) {
    try { await session.send('Page.removeScriptToEvaluateOnNewDocument', { identifier: prevId }); } catch (e) { /* gone */ }
  }
  const src = payload();
  const { identifier } = await session.send('Page.addScriptToEvaluateOnNewDocument', { source: src });
  await page.evaluate(src); // run on the page that's already open
  const ver = await page.evaluate(
    () => (document.documentElement && document.documentElement.dataset.rgVer) || '(no rg-ver — rebuild dist?)',
  );
  return { ver, scriptId: identifier };
}

// CLI
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const { browser, page } = await connect();
  if (!page) {
    console.error('No Chrome tab on the debug endpoint. Run `npm run chrome:debug` and open a Duolingo lesson.');
    process.exit(1);
  }
  const { ver } = await inject(page);
  console.log(`injected dist/ → ${page.url()}  (running v${ver})`);
  console.log('(disable the Tampermonkey copy in this profile so only the injected build runs.)');
  await browser.close(); // detaches CDP; the debug Chrome stays up
}
