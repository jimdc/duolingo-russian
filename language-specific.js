let targetLanguagePronouns = null;
let targetLanguageSuffixes = null;
let targetLanguage = null;

/* while the pronouns are based on a more free-floating gender system, suffixes are bit more hardcoded */
let targetExceptionallyMasculine = null;
let targetExceptionallyFeminine = null;
let targetExceptionallyCommon = null;
let targetMasculineEndings = null;
let targetFeminineEndings = null;

const targetLanguageClass = "span._386Yc";

/* must be called before assignTargetPronouns() or assignTargetSuffixes() for them to work */
function assignTargetLanguage() {
    const languageSelector = document.querySelector(targetLanguageClass);
    if (languageSelector !== null) {
        const result = String(languageSelector.innerHTML);
        targetLanguage = result;
        return result;
    }

    return null;
}

function assignTargetSuffixes() {
    if (targetLanguage !== null) {
        switch(targetLanguage) {
        case "Spanish":
            targetExceptionallyMasculine = spanishExceptionallyMasculine;
            targetExceptionallyFeminine = spanishExceptionallyFeminine;
            targetExceptionallyCommon = spanishExceptionallyCommon;
            targetMasculineEndings = spanishMasculineEndings;
            targetFeminineEndings = spanishFeminineEndings;
            targetLanguageSuffixes = "Spanish";
            break;
        case "French":
            targetExceptionallyMasculine = frenchExceptionallyMasculine;
            targetExceptionallyFeminine = frenchExceptionallyFeminine;
            targetExceptionallyCommon = frenchExceptionallyCommon;
            targetMasculineEndings = frenchMasculineEndings;
            targetFeminineEndings = frenchFeminineEndings;
            targetLanguageSuffixes = "French";
            break;
        default:
            break;
      }
    }
}

function returnGenderByAnalysis(word) {
    if (targetLanguageSuffixes !== null) {
        const lowerCaseWord = word.toLowerCase();

        if (targetExceptionallyMasculine.indexOf(lowerCaseWord) !== -1) return "Masculine";
        if (targetExceptionallyFeminine.indexOf(lowerCaseWord) !== -1) return "Feminine";
        if (targetExceptionallyCommon.indexOf(lowerCaseWord) !== -1) return "Neuter"; //todo: something else with common words...

        let endings = [];

        for(let i = 0; i < targetMasculineEndings.length; i++) {
            if (lowerCaseWord.endsWith(targetMasculineEndings[i])) {
                endings.push(targetMasculineEndings[i]);
            }
        }

        for(let i = 0; i < targetFeminineEndings.length; i++) {
            if (lowerCaseWord.endsWith(targetFeminineEndings[i])) {
                endings.push(targetFeminineEndings[i]);
            }
        }

        const longest_ending = timo_longest(endings);
        if (containsObject(longest_ending, targetMasculineEndings)) return "Masculine";
        if (containsObject(longest_ending, targetFeminineEndings)) return "Feminine";
    }

    return null;
}

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
        }
    }

    return false;
}

/* longest in array optimized for speed, from
https://stackoverflow.com/questions/6521245/finding-longest-string-in-array/12548884#12548884 */
function timo_longest(a) {
  var c = 0, d = 0, l = 0, i = a.length;
  if (i) while (i--) {
    d = a[i].length;
    if (d > c) {
      l = i; c = d;
    }
  }
  return a[l];
}

function assignTargetPronouns() {
    if (targetLanguage !== null) {
      switch(targetLanguage) {
        case "English":
          targetLanguagePronouns = englishPronouns;
          break;
        case "French":
          targetLanguagePronouns = frenchPronouns;
          break;
        case "Portuguese":
          targetLanguagePronouns = portuguesePronouns;
          break;
        case "Spanish":
          targetLanguagePronouns = spanishPronouns;
          break;
        case "German":
          targetLanguagePronouns = germanPronouns;
          break;
        case "Dutch":
          targetLanguagePronouns = dutchPronouns;
          break;
        case "Italian":
          targetLanguagePronouns = italianPronouns;
          break;
        default:
          targetLanguagePronouns = null;
      }
      return targetLanguage;
    }
    return null;
}

function returnGenderIfPronoun(possiblyAGenderedPronoun) {
    if (targetLanguagePronouns !== null) {
        return targetLanguagePronouns[possiblyAGenderedPronoun.toLowerCase()];
    } else {
        return null;
    }
}
