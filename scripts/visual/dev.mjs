// Dev watch loop: rebuild + re-inject on every src/ change, so editing a module shows
// up in the debug Chrome within ~a second — the tightest iteration loop for this
// userscript, and the one that makes "I was debugging a stale build" impossible.
//
//   npm run chrome:debug   # once: dedicated debug profile on :9222, Duolingo open
//   npm run dev:watch      # edit src/*.js → auto rebuild + inject; Ctrl-C to stop
//
// Disable the Tampermonkey copy of the script in that profile first (see inject.mjs).

import { watch } from 'node:fs';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { connect, inject } from './inject.mjs';

const ROOT = new URL('../../', import.meta.url);
const SRC = fileURLToPath(new URL('src/', ROOT));
const BUILD = fileURLToPath(new URL('scripts/build-userscript.mjs', ROOT));

const build = () =>
  new Promise((res, rej) =>
    execFile('node', [BUILD], { cwd: fileURLToPath(ROOT) }, (e, so, se) => (e ? rej(se || e) : res(String(so).trim()))),
  );

const { browser, page } = await connect();
if (!page) {
  console.error('No Chrome tab on the debug endpoint. Run `npm run chrome:debug` and open a Duolingo lesson.');
  process.exit(1);
}

let scriptId; // prior new-document script, removed each cycle so it doesn't stack
async function cycle(reason) {
  try {
    const built = await build();
    const r = await inject(page, scriptId);
    scriptId = r.scriptId;
    console.log(`[${reason}] ${built.replace(/\n/g, ' ')} → running v${r.ver}`);
  } catch (e) {
    console.error(`[${reason}] build/inject failed:`, String(e).slice(0, 500));
  }
}

await cycle('start');

let timer = null;
watch(SRC, { recursive: true }, (_event, file) => {
  if (file && !/\.js$/.test(file)) return; // src changes are .js; ignore editor temp files
  clearTimeout(timer);
  timer = setTimeout(() => cycle('change ' + file), 200); // debounce bursts of writes
});

console.log('watching src/ — edit a module and it rebuilds + re-injects. Ctrl-C to stop.');
process.on('SIGINT', async () => { try { await browser.close(); } catch (e) {} process.exit(0); });
