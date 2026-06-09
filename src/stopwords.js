// Function words / non-nouns the ending heuristic must never colour.
//
// The bare nominative-ending rule (genderOf) mis-reads a lot of non-nouns: -о
// adverbs look neuter (на́до, хорошо́), -а/-я particles look feminine (пожа́луйста),
// numerals look gendered (два, четы́ре). When genderOf is used as a *fallback* for
// content nouns missing from the OpenRussian lexicon (e.g. поли́тик), those would
// leak through. Russian's function-word classes are CLOSED and finite, so we list
// them near-completely here; we also include the common adverbs/predicatives (the
// productive -о class) that aren't a closed class but are high-frequency.
//
// Verb forms are excluded separately by the caller (via the verb lexicon), so they
// are NOT listed here. Lexicon-known content words never reach this guard.
//
// Entries are stored lowercased with ё→е; isFunctionWord normalises the same way,
// so case forms / accents / ё-spelling / a hyphen (кто-то) all resolve.

const PREPOSITIONS =
  'в во на над надо под подо перед передо за к ко с со о об обо от ото до по при про ' +
  'для без безо из изо у через сквозь между меж среди средь вокруг около возле подле ' +
  'мимо вдоль против ради кроме вместо насчет благодаря согласно вопреки навстречу сверх изза изпод';

const CONJUNCTIONS =
  'и а но или либо что чтобы чтоб если когда пока потому поэтому как словно будто хотя ' +
  'зато однако тоже также ведь причем итак значит то ни нежели раз';

const PARTICLES =
  'не ни же ли бы б вот вон уж уже еще только лишь даже разве неужели пусть пускай давай ' +
  'давайте вряд едва почти именно мол дескать аж таки';

const PRONOUNS =
  'я меня мне мной мною ты тебя тебе тобой он его него ему нему им ним нем она ее нее ей ' +
  'ней ею оно мы нас нам нами вы вас вам вами они их них ими ними себя себе собой кто кого ' +
  'кому кем ком что чего чему чем это этот эта эти этого этой этих этому этим этими этом эту ' +
  'тот та те того той тех тому тем теми том ту такой такая такое такие весь вся все всего ' +
  'всей всех всему всем всеми всю сам сама само сами каждый каждая каждое который которая ' +
  'которое которые чей чья чье чьи мой моя мое мои моего моей моих моему моим мою твой твоя ' +
  'твое твои наш наша наше наши нашего нашей ваш ваша ваше ваши свой своя свое свои никто ' +
  'ничто никого ничего никому ктото чтото ктонибудь чтонибудь';

const NUMERALS =
  'ноль нуль один одна одно одни два две три четыре пять шесть семь восемь девять десять ' +
  'одиннадцать двенадцать тринадцать четырнадцать пятнадцать шестнадцать семнадцать ' +
  'восемнадцать девятнадцать двадцать тридцать сорок пятьдесят шестьдесят семьдесят ' +
  'восемьдесят девяносто сто двести триста четыреста пятьсот оба обе полтора ' +
  'много мало немного несколько сколько столько';

const ADVERBS =
  'хорошо плохо быстро медленно легко трудно тяжело тихо громко рано поздно давно недавно ' +
  'скоро долго часто редко тепло холодно жарко светло темно ясно чисто весело грустно скучно ' +
  'интересно важно нужно можно нельзя надо пора жаль жалко видно слышно понятно непонятно ' +
  'точно верно правильно просто сложно ужасно отлично прекрасно замечательно здорово обычно ' +
  'наверно наверное конечно особенно вообще сразу снова опять вместе отдельно серьезно ' +
  'спокойно вдруг далеко близко высоко низко глубоко широко страшно смешно красиво умно глупо ' +
  'больно дорого дешево сильно слабо более менее лучше хуже больше меньше дальше ближе выше ' +
  'ниже раньше позже дольше чаще реже там тут здесь туда сюда оттуда отсюда где куда откуда ' +
  'когда тогда сейчас теперь потом затем сначала наконец всегда никогда иногда везде всюду ' +
  'нигде домой дома назад вперед обратно рядом внизу вверху наверху вниз вверх слева справа ' +
  'налево направо сверху снизу впереди сзади почему зачем';

const INTERJECTIONS =
  'да нет ага ой ай ах ох эх эй ну алло привет пока пожалуйста спасибо здравствуйте ' +
  'здравствуй извините простите ладно окей увы ура';

export const FUNCTION_WORDS = new Set(
  [PREPOSITIONS, CONJUNCTIONS, PARTICLES, PRONOUNS, NUMERALS, ADVERBS, INTERJECTIONS]
    .join(' ')
    .split(/\s+/)
    .filter(Boolean),
);

/** True if `word` is a function word / non-noun the heuristic must not colour. */
export function isFunctionWord(word) {
  const w = String(word ?? '')
    .normalize('NFC')
    .replace(/[^Ѐ-ӿ]/g, '') // Cyrillic only (drops accents, punctuation, hyphens)
    .toLowerCase()
    .replace(/ё/g, 'е');
  return w.length > 0 && FUNCTION_WORDS.has(w);
}
