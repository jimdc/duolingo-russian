// Build a wordform -> gender lexicon from OpenRussian CSVs (Badestrand/russian-dictionary, CC-BY-SA 4.0).
// Maps every inflected form (all declension cells) to its gender, so oblique forms
// like сумку (acc of сумка) and красную (fem-acc of красный) colour correctly, and
// non-nouns (verbs, particles, pronouns) stay absent -> uncoloured.
//
// Output: src/data/ru-gender-lexicon.json  ({ "<form>": "m"|"f"|"n" })
// Run:    node scripts/build-lexicon.mjs   (needs data/nouns.csv + data/adjectives.csv)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);

function rows(csv) {
  const text = readFileSync(new URL('data/' + csv, root), 'utf8');
  const lines = text.split('\n').filter((l) => l.length > 0);
  const headers = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const o = {};
    headers.forEach((h, i) => (o[h] = cells[i] ?? ''));
    return o;
  });
}

// A cell may hold stress-marked alternatives: "кра'сный,кра'сного" / "су'мкой, су'мкою" / "(кра'сною)".
// Strip stress apostrophes + parens, normalise ё→е (gender doesn't depend on it), split alternatives.
function forms(cell) {
  return (cell || '')
    .replace(/['ʹ’()]/g, '')
    .split(/[,;]/)
    .map((s) => s.trim().toLowerCase().replace(/ё/g, 'е'))
    .filter((s) => s.length > 0);
}

const gender = Object.create(null); // form -> 'm'|'f'|'n'
const conflict = new Set();
function add(form, g) {
  if (!form || conflict.has(form)) return;
  const prev = gender[form];
  if (prev && prev !== g) {
    delete gender[form];
    conflict.add(form); // genuinely ambiguous (e.g. adj m/n share forms) -> don't colour
    return;
  }
  gender[form] = g;
}

const NOUN_COLS = [
  'bare', 'sg_nom', 'sg_gen', 'sg_dat', 'sg_acc', 'sg_inst', 'sg_prep',
  'pl_nom', 'pl_gen', 'pl_dat', 'pl_acc', 'pl_inst', 'pl_prep',
];
for (const r of rows('nouns.csv')) {
  const g = r.gender;
  if (g !== 'm' && g !== 'f' && g !== 'n') continue;
  for (const col of NOUN_COLS) for (const f of forms(r[col])) add(f, g);
}

const ADJ_COLS = {
  m: ['short_m', 'decl_m_nom', 'decl_m_gen', 'decl_m_dat', 'decl_m_acc', 'decl_m_inst', 'decl_m_prep'],
  f: ['short_f', 'decl_f_nom', 'decl_f_gen', 'decl_f_dat', 'decl_f_acc', 'decl_f_inst', 'decl_f_prep'],
  n: ['short_n', 'decl_n_nom', 'decl_n_gen', 'decl_n_dat', 'decl_n_acc', 'decl_n_inst', 'decl_n_prep'],
};
for (const r of rows('adjectives.csv')) {
  for (const g of ['m', 'f', 'n']) for (const col of ADJ_COLS[g]) for (const f of forms(r[col])) add(f, g);
}

// Packed format: group forms by gender, space-joined. Halves the byte size vs a
// per-entry object (no quotes/colons/commas); runtime rebuilds Sets by splitting.
const buckets = { m: [], f: [], n: [] };
for (const form of Object.keys(gender)) buckets[gender[form]].push(form);
const packed = { m: buckets.m.join(' '), f: buckets.f.join(' '), n: buckets.n.join(' ') };
const json = JSON.stringify(packed);
mkdirSync(new URL('src/data/', root), { recursive: true });
writeFileSync(new URL('src/data/ru-gender-lexicon.json', root), json);

console.log('forms:', Object.keys(gender).length,
  '(m', buckets.m.length, 'f', buckets.f.length, 'n', buckets.n.length, ')',
  '| conflicts dropped:', conflict.size, '| bytes:', json.length);
console.log('--- should be colored ---');
for (const w of ['сумку', 'красную', 'чашку', 'синюю', 'сумка', 'стол', 'книга', 'окно', 'время', 'мать'])
  console.log(' ', w, '->', gender[w] || '(none)');
console.log('--- should NOT be colored ---');
for (const w of ['дай', 'мне', 'надо', 'помыть', 'пожалуйста', 'и', 'где'])
  console.log(' ', w, '->', gender[w] || '(none)');
