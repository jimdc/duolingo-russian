// Russian grammatical gender from a surface word form.
//
// We can't read gender from Duolingo (its hint tables only carry translations),
// so we derive it ourselves: nominative-singular noun/adjective ending rules,
// guarded by exception lists for the cases the endings get wrong.
//
// Returns one of: 'Masculine' | 'Feminine' | 'Neuter' | 'Unknown'.
// 'Unknown' means "don't color this" — function words, ambiguous -ь nouns,
// and anything non-Cyrillic all land here on purpose.

// -мя nouns: end in -я but are neuter (the classic trap).
const NEUTER_MYA = new Set([
  'время', 'имя', 'племя', 'знамя', 'семя', 'стремя',
  'бремя', 'пламя', 'темя', 'вымя',
]);

// End in -а/-я but masculine (natural gender).
const MASCULINE_DESPITE_A_YA = new Set([
  'папа', 'дядя', 'дедушка', 'мужчина', 'юноша', 'староста',
  'старшина', 'воевода', 'слуга', 'судья', 'папочка', 'дедуля',
]);

// Soft-sign (-ь) nouns are genuinely ambiguous; only the lists decide.
const SOFT_SIGN_MASCULINE = new Set([
  'день', 'конь', 'гость', 'путь', 'словарь', 'царь', 'огонь', 'медведь',
  'дождь', 'камень', 'корень', 'уровень', 'рубль', 'автомобиль', 'учитель',
  'апрель', 'июнь', 'июль', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь', 'февраль',
]);
const SOFT_SIGN_FEMININE = new Set([
  'дверь', 'ночь', 'мать', 'дочь', 'любовь', 'тетрадь', 'площадь', 'вещь',
  'осень', 'кровать', 'соль', 'жизнь', 'смерть', 'боль', 'часть', 'новость',
  'помощь', 'речь', 'мышь', 'постель', 'модель', 'роль', 'цель', 'связь',
  'степень', 'тень', 'кость', 'кровь',
]);

// Function words carry no gender to color — keeps adverbs/conjunctions/particles
// from being mis-colored by the bare ending rules (e.g. "где" ends in -е).
const STOPWORDS = new Set([
  'там', 'тут', 'здесь', 'где', 'куда', 'когда', 'как', 'что', 'чтобы',
  'и', 'а', 'но', 'или', 'не', 'ни', 'же', 'ли', 'бы', 'да', 'нет',
  'очень', 'тоже', 'также', 'уже', 'ещё', 'еще', 'вот', 'потому',
]);

const CYRILLIC_CONSONANTS = new Set('бвгджзйклмнпрстфхцчшщ'.split(''));

/** Strip combining accents (ударение, e.g. ра́дио), punctuation, and case. */
export function normalize(raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/[̀-ͯ́]/g, '') // combining marks incl. combining acute
    .replace(/[^Ѐ-ӿ]/g, '')      // keep Cyrillic only
    .toLowerCase()
    .trim();
}

/**
 * Best-effort grammatical gender for a single Russian word.
 * @param {string} raw surface form (may include accents/punctuation)
 * @returns {'Masculine'|'Feminine'|'Neuter'|'Unknown'}
 */
export function genderOf(raw) {
  const w = normalize(raw);
  if (w.length === 0) return 'Unknown';
  if (STOPWORDS.has(w)) return 'Unknown';

  if (NEUTER_MYA.has(w)) return 'Neuter';
  if (MASCULINE_DESPITE_A_YA.has(w)) return 'Masculine';
  if (SOFT_SIGN_FEMININE.has(w)) return 'Feminine';
  if (SOFT_SIGN_MASCULINE.has(w)) return 'Masculine';

  const last = w[w.length - 1];
  if (last === 'а' || last === 'я') return 'Feminine';
  if (last === 'о' || last === 'е' || last === 'ё') return 'Neuter';
  if (last === 'й') return 'Masculine';
  if (last === 'ь') return 'Unknown';        // ambiguous and not in the lists
  if (CYRILLIC_CONSONANTS.has(last)) return 'Masculine';

  return 'Unknown';
}
