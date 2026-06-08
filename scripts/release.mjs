// One-command release: bump the version, test, rebuild the userscript, and commit.
// The @version in dist/ is read from package.json (see build-userscript.mjs), so the
// userscript version can never drift from the bump done here.
//
//   npm run release                 # patch bump (0.6.0 -> 0.6.1)
//   npm run release -- minor        # 0.6.0 -> 0.7.0
//   npm run release -- major        # 0.6.0 -> 1.0.0
//   npm run release -- 1.2.3        # explicit version
//   npm run release -- minor "Colour tiles + reduction"   # custom commit subject
//   npm run release -- --dry minor  # show what would happen, change nothing
//
// Push is left to you (it publishes to the public repo, and master is what the
// auto-updater reads): after a release, run `git push`.

import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const pkgUrl = new URL('package.json', root);
const run = (cmd) => execSync(cmd, { cwd: fileURLToPath(root), stdio: 'inherit' });
const capture = (cmd) => execSync(cmd, { cwd: fileURLToPath(root) }).toString().trim();

// ---- parse args ----
const argv = process.argv.slice(2);
const dry = argv.includes('--dry');
const rest = argv.filter((a) => a !== '--dry');
const bump = rest[0] || 'patch';
const message = rest.slice(1).join(' ').trim();

function nextVersion(cur, kind) {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(cur);
  if (!m) throw new Error(`current version "${cur}" is not X.Y.Z`);
  const [major, minor, patch] = [+m[1], +m[2], +m[3]];
  if (kind === 'major') return `${major + 1}.0.0`;
  if (kind === 'minor') return `${major}.${minor + 1}.0`;
  if (kind === 'patch') return `${major}.${minor}.${patch + 1}`;
  if (/^\d+\.\d+\.\d+$/.test(kind)) return kind; // explicit version
  throw new Error(`unknown bump "${kind}" — use patch | minor | major | X.Y.Z`);
}

const pkg = JSON.parse(readFileSync(pkgUrl, 'utf8'));
const from = pkg.version;
const to = nextVersion(from, bump);
const subject = `v${to}${message ? ': ' + message : ''}`;

console.log(`\nRelease: ${from} -> ${to}${dry ? '  (dry run)' : ''}`);

if (dry) {
  console.log('\nWould:');
  console.log('  1. node --test');
  console.log(`  2. set package.json version = ${to}`);
  console.log('  3. node scripts/build-userscript.mjs');
  console.log(`  4. git add -A && git commit -m ${JSON.stringify(subject)}`);
  console.log('\nThen you would run: git push');
  process.exit(0);
}

// 1) Tests first — a red suite must never become a release.
console.log('\n— running tests —');
run('node --test');

// 2) Bump package.json (the single source of truth for @version).
pkg.version = to;
writeFileSync(pkgUrl, JSON.stringify(pkg, null, 2) + '\n');

// 3) Rebuild dist/ (reads the new version from package.json).
console.log('\n— building userscript —');
run('node scripts/build-userscript.mjs');

// 4) Commit everything as the release.
run('git add -A');
run(`git commit -m ${JSON.stringify(subject)}`);

console.log(`\n✓ committed ${capture('git rev-parse --short HEAD')}  ${subject}`);
console.log('\nNext:');
console.log('  • git push                      # publishes to master → auto-updater picks it up');
console.log('  • npm run visual                # if rendering changed: regenerate & review images/');
console.log('  • bump VER in scripts/build-userscript.mjs too, ONLY if src/data/*.json changed');
