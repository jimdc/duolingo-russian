import { readFileSync } from 'node:fs';
import { parseHTML } from 'linkedom';

/** Load a captured fixture and return its parsed challenge `document`. */
export function loadChallenge(name) {
  const json = JSON.parse(
    readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'),
  );
  const { document } = parseHTML(
    `<!doctype html><html><body>${json.challengeHTML}</body></html>`,
  );
  return { document, meta: json };
}
