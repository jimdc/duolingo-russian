// Build a verb-wordform -> tense/mood lexicon from OpenRussian verbs.csv (CC-BY-SA).
// aspect decides whether the presfut columns are PRESENT (imperfective) or FUTURE
// (perfective). Output buckets: past | pres | fut | imp | inf.
//
// Output: src/data/ru-verb-lexicon.json  ({ "<tense>": "form form ..." })

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

for (const r of rows('verbs.csv')) {
  for (const f of forms(r.bare)) add(f, 'inf');
  for (const f of forms(r.accented)) add(f, 'inf');
  for (const col of PAST) for (const f of forms(r[col])) add(f, 'past');
  for (const col of IMP) for (const f of forms(r[col])) add(f, 'imp');
  const pf = r.aspect === 'imperfective' ? 'pres' : r.aspect === 'perfective' ? 'fut' : null;
  if (pf) for (const col of PRESFUT) for (const f of forms(r[col])) add(f, pf);
}

const buckets = { past: [], pres: [], fut: [], imp: [], inf: [] };
for (const f of Object.keys(tense)) buckets[tense[f]].push(f);
const packed = {};
for (const k of Object.keys(buckets)) packed[k] = buckets[k].join(' ');
const json = JSON.stringify(packed);
mkdirSync(new URL('src/data/', root), { recursive: true });
writeFileSync(new URL('src/data/ru-verb-lexicon.json', root), json);

console.log('forms:', Object.keys(tense).length,
  Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, v.length])),
  '| conflicts dropped:', conflict.size, '| bytes:', json.length);
for (const w of ['помыл', 'мою', 'мыл', 'помою', 'помой', 'помыть', 'мыть', 'делаю', 'сделаю', 'дай'])
  console.log(' ', w, '->', tense[w.toLowerCase().replace(/ё/g, 'е')] || '(none)');
