// Build a wordform -> stressed-vowel-index lexicon from OpenRussian (CC-BY-SA).
// Covers ALL parts of speech (nouns, adjectives, verbs, others) so stress marks
// appear on verbs/particles too, not just the gendered words.
//
// Each accented cell marks stress with an apostrophe after the stressed vowel
// (су'мку = сУ́мку). We record, per surface form, the index of the stressed
// LETTER. Monosyllables (no ambiguity) and conflicting homographs are skipped.
//
// Output: src/data/ru-stress-lexicon.json  ({ "<idx>": "form form ..." })

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const VOWELS = new Set('аеёиоуыэюя'.split(''));

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

// "су'мку" -> {bare:'сумку', idx:1}; handles parens; ё counts as its own stress.
function parseAccented(raw) {
  const out = [];
  for (let variant of (raw || '').split(/[,;]/)) {
    variant = variant.replace(/[()]/g, '').trim();
    if (!variant) continue;
    let bare = '', idx = -1, letterPos = 0;
    for (const ch of variant) {
      if (ch === "'" || ch === 'ʹ' || ch === '’') { idx = letterPos - 1; continue; }
      bare += ch;
      if (ch === 'ё' && idx === -1) idx = letterPos; // ё is inherently stressed
      letterPos++;
    }
    const key = bare.toLowerCase().replace(/ё/g, 'е');
    if (!/^[Ѐ-ӿ]+$/.test(key)) continue;
    const vowels = [...key].filter((c) => VOWELS.has(c)).length;
    if (vowels <= 1) continue; // monosyllabic: stress unwritten
    if (idx < 0 || idx >= key.length || !VOWELS.has(key[idx])) continue; // no/invalid stress
    out.push([key, idx]);
  }
  return out;
}

const stress = Object.create(null); // form -> idx
const conflict = new Set();
function add(key, idx) {
  if (conflict.has(key)) return;
  const prev = stress[key];
  if (prev !== undefined && prev !== idx) { delete stress[key]; conflict.add(key); return; }
  stress[key] = idx;
}

const COLS = {
  'nouns.csv': ['accented', 'sg_nom', 'sg_gen', 'sg_dat', 'sg_acc', 'sg_inst', 'sg_prep', 'pl_nom', 'pl_gen', 'pl_dat', 'pl_acc', 'pl_inst', 'pl_prep'],
  'adjectives.csv': ['accented', 'short_m', 'short_f', 'short_n', 'short_pl', 'decl_m_nom', 'decl_m_gen', 'decl_m_dat', 'decl_m_acc', 'decl_m_inst', 'decl_m_prep', 'decl_f_nom', 'decl_f_gen', 'decl_f_dat', 'decl_f_acc', 'decl_f_inst', 'decl_f_prep', 'decl_n_nom', 'decl_n_gen', 'decl_n_dat', 'decl_n_acc', 'decl_n_inst', 'decl_n_prep', 'decl_pl_nom', 'decl_pl_gen', 'decl_pl_dat', 'decl_pl_acc', 'decl_pl_inst', 'decl_pl_prep'],
  'verbs.csv': ['accented', 'imperative_sg', 'imperative_pl', 'past_m', 'past_f', 'past_n', 'past_pl', 'presfut_sg1', 'presfut_sg2', 'presfut_sg3', 'presfut_pl1', 'presfut_pl2', 'presfut_pl3'],
  'others.csv': ['accented'],
};
for (const [file, cols] of Object.entries(COLS))
  for (const r of rows(file))
    for (const col of cols)
      for (const [key, idx] of parseAccented(r[col])) add(key, idx);

const buckets = {};
for (const form of Object.keys(stress)) (buckets[stress[form]] ??= []).push(form);
const packed = {};
for (const k of Object.keys(buckets)) packed[k] = buckets[k].join(' ');
const json = JSON.stringify(packed);
mkdirSync(new URL('src/data/', root), { recursive: true });
writeFileSync(new URL('src/data/ru-stress-lexicon.json', root), json);

console.log('forms:', Object.keys(stress).length, '| conflicts dropped:', conflict.size, '| bytes:', json.length);
const show = (w) => {
  const k = w.toLowerCase().replace(/ё/g, 'е');
  const i = stress[k];
  if (i === undefined) return console.log(' ', w, '-> (none)');
  console.log(' ', w, '->', [...k].map((c, j) => (j === i ? c + '́' : c)).join(''));
};
['пожалуйста', 'надо', 'помыть', 'сумку', 'красную', 'ведро', 'красное', 'молоко', 'хорошо'].forEach(show);
