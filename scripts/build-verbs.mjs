// Build a verb-wordform -> tense/mood lexicon from OpenRussian verbs.csv (CC-BY-SA).
// aspect decides whether the presfut columns are PRESENT (imperfective) or FUTURE
// (perfective). Output buckets: past | pres | fut | imp | inf.
//
// Also emits a separate verb-META lexicon (aspect + verbs-of-motion direction), kept
// in its own file so adding it doesn't bump the shared cache VER (it downloads once
// without forcing a re-download of the existing ~18 MB of gender/stress/verb data).
//
// Output: src/data/ru-verb-lexicon.json      ({ "<tense>": "form ..." })
//         src/data/ru-verbmeta-lexicon.json  ({ aspect:{pf,ipf}, motion:{uni,multi} })

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);

function rows(csv) {
  const lines = readFileSync(new URL('data/' + csv, root), 'utf8').split('\n').filter(Boolean);
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const o = {};
    headers.forEach((h, i) => (o[h] = cells[i] ?? ''));
    return o;
  });
}

function forms(cell) {
  return (cell || '')
    .replace(/['ʹ’()]/g, '')
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase().replace(/ё/g, 'е'))
    .filter((s) => /^[Ѐ-ӿ-]+$/.test(s) && s.length > 0);
}

const tense = Object.create(null); // form -> tense
const conflict = new Set();
function add(form, t) {
  if (conflict.has(form)) return;
  const prev = tense[form];
  if (prev && prev !== t) { delete tense[form]; conflict.add(form); return; }
  tense[form] = t;
}

const PAST = ['past_m', 'past_f', 'past_n', 'past_pl'];
const IMP = ['imperative_sg', 'imperative_pl'];
const PRESFUT = ['presfut_sg1', 'presfut_sg2', 'presfut_sg3', 'presfut_pl1', 'presfut_pl2', 'presfut_pl3'];

// ---- aspect: form -> 'pf'|'ipf' (biaspectual 'both' skipped); drop on pf/ipf clash ----
const aspect = Object.create(null);
const aspConflict = new Set();
function addAsp(form, a) {
  if (aspConflict.has(form)) return;
  const prev = aspect[form];
  if (prev && prev !== a) { delete aspect[form]; aspConflict.add(form); return; }
  aspect[form] = a;
}

// ---- verbs of motion: the base determinate/indeterminate pairs (normalised ё->е) ----
// Only the unprefixed bases carry the uni/multi contrast; prefixed forms (приходить…)
// are ordinary aspectual pairs and are covered by the aspect marker instead.
const MOTION = {
  идти: 'uni', ходить: 'multi', ехать: 'uni', ездить: 'multi', бежать: 'uni', бегать: 'multi',
  лететь: 'uni', летать: 'multi', плыть: 'uni', плавать: 'multi', нести: 'uni', носить: 'multi',
  вести: 'uni', водить: 'multi', везти: 'uni', возить: 'multi', ползти: 'uni', ползать: 'multi',
  лезть: 'uni', лазить: 'multi', лазать: 'multi', тащить: 'uni', таскать: 'multi',
  катить: 'uni', катать: 'multi', гнать: 'uni', гонять: 'multi', брести: 'uni', бродить: 'multi',
};
const motionDir = Object.create(null); // form -> Set(dir)
const nonMotionForms = new Set(); // every form produced by a NON-motion verb (collision guard)

for (const r of rows('verbs.csv')) {
  for (const f of forms(r.bare)) add(f, 'inf');
  for (const f of forms(r.accented)) add(f, 'inf');
  for (const col of PAST) for (const f of forms(r[col])) add(f, 'past');
  for (const col of IMP) for (const f of forms(r[col])) add(f, 'imp');
  const pf = r.aspect === 'imperfective' ? 'pres' : r.aspect === 'perfective' ? 'fut' : null;
  if (pf) for (const col of PRESFUT) for (const f of forms(r[col])) add(f, pf);

  // every wordform of this verb, for the aspect + motion passes
  const all = [
    ...forms(r.bare), ...forms(r.accented),
    ...PAST.flatMap((c) => forms(r[c])),
    ...IMP.flatMap((c) => forms(r[c])),
    ...PRESFUT.flatMap((c) => forms(r[c])),
  ];
  const a = r.aspect === 'perfective' ? 'pf' : r.aspect === 'imperfective' ? 'ipf' : null;
  if (a) for (const f of all) addAsp(f, a);

  const dir = MOTION[forms(r.bare)[0] || '']; // keyed by the (normalised) infinitive
  if (dir) for (const f of all) (motionDir[f] || (motionDir[f] = new Set())).add(dir);
  else for (const f of all) nonMotionForms.add(f);
}

const buckets = { past: [], pres: [], fut: [], imp: [], inf: [] };
for (const f of Object.keys(tense)) buckets[tense[f]].push(f);
const packed = {};
for (const k of Object.keys(buckets)) packed[k] = buckets[k].join(' ');
const json = JSON.stringify(packed);
mkdirSync(new URL('src/data/', root), { recursive: true });
writeFileSync(new URL('src/data/ru-verb-lexicon.json', root), json);

// ---- verb-meta: aspect buckets + collision-safe motion buckets ----
const aspectBuckets = { pf: [], ipf: [] };
for (const f of Object.keys(aspect)) aspectBuckets[aspect[f]].push(f);
const motionBuckets = { uni: [], multi: [] };
let motionDropped = 0;
for (const f of Object.keys(motionDir)) {
  const dirs = motionDir[f];
  if (dirs.size !== 1 || nonMotionForms.has(f)) { motionDropped++; continue; } // ambiguous (e.g. лечу = fly/treat)
  motionBuckets[[...dirs][0]].push(f);
}
const verbmeta = {
  aspect: { pf: aspectBuckets.pf.join(' '), ipf: aspectBuckets.ipf.join(' ') },
  motion: { uni: motionBuckets.uni.join(' '), multi: motionBuckets.multi.join(' ') },
};
const metaJson = JSON.stringify(verbmeta);
writeFileSync(new URL('src/data/ru-verbmeta-lexicon.json', root), metaJson);

console.log('forms:', Object.keys(tense).length,
  Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  '| conflicts dropped:', conflict.size, '| bytes:', json.length);
console.log('verb-meta: aspect', { pf: aspectBuckets.pf.length, ipf: aspectBuckets.ipf.length },
  '| motion', { uni: motionBuckets.uni.length, multi: motionBuckets.multi.length },
  '| aspect conflicts:', aspConflict.size, '| motion dropped:', motionDropped, '| bytes:', metaJson.length);
for (const w of ['помыл', 'мою', 'мыл', 'помою', 'помой', 'помыть', 'мыть', 'делаю', 'сделаю', 'дай'])
  console.log(' ', w, '->', tense[w.toLowerCase().replace(/ё/g, 'е')] || '(none)',
    '| asp', aspect[w.toLowerCase().replace(/ё/g, 'е')] || '-');
for (const w of ['идти', 'ходить', 'иду', 'хожу', 'шел', 'лечу', 'делать'])
  console.log(' motion', w, '->', motionBuckets.uni.includes(w) ? 'uni' : motionBuckets.multi.includes(w) ? 'multi' : '(none)');
