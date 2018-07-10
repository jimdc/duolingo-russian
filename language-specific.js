let targetLanguagePronouns = null;
let targetLanguageSuffixes = null;
let targetLanguage = null;

/* while the pronouns are based on a more free-floating gender system, suffixes are bit more hardcoded */
let targetExceptionallyMasculine = null;
let targetExceptionallyFeminine = null;
let targetMasculineEndings = null;
let targetFeminineEndings = null;

const targetLanguageClass = "span._386Yc";

/* must be called before assignTargetPronouns() or assignTargetSuffixes() for them to work */
function assignTargetLanguage() {
    const languageSelector = document.querySelector(targetLanguageClass);
    if (languageSelector !== null) {
        const result = String(languageSelector.innerHTML);
        targetLanguage = result;
    }

    return result;
}

function assignTargetSuffixes() {
    if (targetLanguage !== null) {
        switch(targetLanguage) {
        case "Spanish":
            targetExceptionallyMasculine = spanishExceptionallyMasculine;
            targetExceptionallyFeminine = spanishExceptionallyFeminine;
            targetMasculineEndings = spanishMasculineEndings;
            targetFeminineEndings = spanishFeminineEndings;
            targetLanguageSuffixes = "Spanish";
            break;
        case "French":
            targetExceptionallyMasculine = frenchExceptionallyMasculine;
            targetExceptionallyFeminine = frenchExceptionallyFeminine;
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

        /* todo: iterate through masculineEndings and feminineEndings, see which ending is longer */

    } else {
        return null;
    }
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
