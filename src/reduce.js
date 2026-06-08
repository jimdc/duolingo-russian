// Predict standard (Moscow-norm) unstressed vowel reduction — akanye + ikanye —
// and surface it as a small IPA superscript on each reduced vowel. We already know
// the stress (from the stress lexicon), which is the one fact reduction needs:
//
//   akanye  (hard о/а):  stressed → first-pretonic/word-initial [ɐ] → elsewhere [ə]
//   ikanye  (soft е/я):  unstressed → [ɪ]   (and а after ч/щ → [ɪ])
//   ж/ш/ц + е/и/я:       unstressed → [ɨ]   (always-hard sibilants)
//   у/ю/ы/и:             left alone (negligible reduction / already that sound)
//
// Nothing is recoloured (gender/tense own colour) and no text is rewritten: the
// IPA hint is a CSS ::after on a `.rg-rd` wrapper, shown only when reduction mode
// is toggled on. So this layers cleanly over everything else.

import { wordGroups } from './colorize.js';
import { stressIndexOf } from './stress.js';

// Unique names: the userscript bundler flattens every src file into one scope,
// so these must not collide with stress.js's CYRILLIC/VOWELS.
const RD_CYR = /[Ѐ-ӿ]/;
const RD_VOWELS = new Set('аеёиоуыэюя');
const HARD_SIBILANTS = new Set('жшц'); // always hard
const SOFT_CONSONANTS = new Set('чщй'); // always soft

const AKANYE = (tier1) =>
  tier1 ? { ipa: 'ɐ', cls: 'rg-rd-a' } : { ipa: 'ə', cls: 'rg-rd-schwa' };
const IKANYE = { ipa: 'ɪ', cls: 'rg-rd-i' };
const YERY = { ipa: 'ɨ', cls: 'rg-rd-y' };

/**
 * The reduced realisation of one unstressed vowel.
 * @param {string} v      the (lowercased) vowel letter
 * @param {string} prev   the (lowercased) preceding Cyrillic letter, '' if none
 * @param {boolean} tier1 true if first-pretonic or word-initial (weaker reduction)
 * @returns {{ipa: string, cls: string}|null} null = leave it unmarked
 */
function reduceVowel(v, prev, tier1) {
  if (HARD_SIBILANTS.has(prev)) {
    if (v === 'е' || v === 'и' || v === 'я') return YERY; // жена→[ɨ], цифра→[ɨ]
    if (v === 'а' || v === 'о') return AKANYE(tier1); // жара→[ɐ]
    return null;
  }
  if (SOFT_CONSONANTS.has(prev)) {
    if (v === 'а' || v === 'е' || v === 'я') return IKANYE; // часы→[ɪ]
    return null; // и already [ɪ]; у stays
  }
  if (v === 'я' || v === 'е') return IKANYE; // ikanye after a soft consonant
  if (v === 'а' || v === 'о') return AKANYE(tier1); // akanye
  if (v === 'э') return YERY; // rare; этаж→[ɨ]
  return null; // и, у, ю, ы, ё — left alone
}

/**
 * Map each reduced vowel of `word` to its IPA hint, keyed by Cyrillic-letter index
 * (the same index space as the stress lexicon and applyStressToSpans).
 * @param {string} word
 * @param {number} stressIdx index of the stressed Cyrillic letter, or -1
 * @returns {Map<number, {ipa: string, cls: string}>}
 */
export function reduceWord(word, stressIdx) {
  const out = new Map();
  if (stressIdx == null || stressIdx < 0) return out; // unknown stress / monosyllable

  const letters = [];
  for (const ch of String(word)) if (RD_CYR.test(ch)) letters.push(ch.toLowerCase());

  const vowelAt = []; // Cyrillic-letter indices that are vowels, in order
  for (let i = 0; i < letters.length; i++) if (RD_VOWELS.has(letters[i])) vowelAt.push(i);
  if (vowelAt.length <= 1) return out; // monosyllable: the one vowel is the stress

  const stressedPos = vowelAt.indexOf(stressIdx);
  if (stressedPos < 0) return out; // stress mark not on a vowel — bail rather than guess
  const firstPretonic = stressedPos > 0 ? vowelAt[stressedPos - 1] : -1;

  for (const li of vowelAt) {
    if (li === stressIdx) continue; // stressed vowel keeps full quality
    const r = reduceVowel(letters[li], li > 0 ? letters[li - 1] : '', li === firstPretonic || li === 0);
    if (r) out.set(li, r);
  }
  return out;
}

/** Wrap (or tag) the reduced vowels among `spans` with `.rg-rd` + data-ipa. */
export function applyReductionToSpans(spans, byIndex) {
  let pos = 0;
  let any = false;
  for (const s of spans) {
    const t = s.textContent || '';
    let cyr = 0;
    for (const ch of t) if (RD_CYR.test(ch)) cyr++;
    if (cyr === 0) continue;
    if (cyr === 1) {
      // One Cyrillic letter in this span (prompt char-span, or a 1-letter tile):
      // tag the span itself so CSS can render the superscript.
      const r = byIndex.get(pos);
      if (r) {
        if (!s.classList || !s.classList.contains('rg-rd')) {
          s.classList.add('rg-rd', r.cls);
          s.setAttribute('data-ipa', r.ipa);
        }
        any = true;
      }
      pos += 1;
    } else {
      // Whole-word span (tile): split the text so each reduced vowel gets a wrapper.
      if (rebuildSpan(s, t, pos, byIndex)) any = true;
      pos += cyr;
    }
  }
  return any;
}

/** Rebuild a multi-letter span, wrapping its reduced vowels; textContent is preserved. */
function rebuildSpan(s, t, startPos, byIndex) {
  if (s.querySelector && s.querySelector('.rg-rd')) return true; // already done
  const doc = s.ownerDocument;
  if (!doc) return false;

  let pos = startPos;
  let hasAny = false;
  for (const ch of t) {
    if (RD_CYR.test(ch)) {
      if (byIndex.has(pos)) { hasAny = true; break; }
      pos++;
    }
  }
  if (!hasAny) return false;

  const frag = doc.createDocumentFragment();
  let buf = '';
  const flush = () => { if (buf) { frag.appendChild(doc.createTextNode(buf)); buf = ''; } };
  pos = startPos;
  for (const ch of t) {
    if (RD_CYR.test(ch)) {
      const r = byIndex.get(pos);
      if (r) {
        flush();
        const w = doc.createElement('span');
        w.className = 'rg-rd ' + r.cls;
        w.setAttribute('data-ipa', r.ipa);
        w.textContent = ch;
        frag.appendChild(w);
      } else {
        buf += ch;
      }
      pos++;
    } else {
      buf += ch; // punctuation, spaces, and the combining acute on the stressed vowel
    }
  }
  flush();
  s.textContent = '';
  s.appendChild(frag);
  return true;
}

/**
 * Annotate every known word in `root` with its predicted vowel reduction.
 * @returns {{word: string, count: number}[]} words actually annotated
 */
export function colorizeReductions(root, stressMap) {
  const applied = [];
  for (const { word, spans } of wordGroups(root)) {
    const byIndex = reduceWord(word, stressIndexOf(word, stressMap));
    if (byIndex.size && applyReductionToSpans(spans, byIndex)) {
      applied.push({ word, count: byIndex.size });
    }
  }
  return applied;
}
