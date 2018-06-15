// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @require     language-specific.js
// @require     color-chooser.js
// @namespace   https://github.com/jimdc/gender-reveal
// @updateURL   https://github.com/jimdc/gender-reveal/raw/master/gender-reveal.user.js
// @version     0.9
// @run-at      document-start
// ==/UserScript==

(function() {
  const version = 0.9

  // React/Duolingo obfuscated class names
  const classNameExercise = "_1Y5M_"; // Div enclosing all controls of an exercise
  const nameGenderHint = "td._3s3uv";
  const nameWord = "span._3_AmQ";
  const challengeJudgeText = "div._3EaeX";

  const realConsole = console;
  const realConsoleLog = console.log;
  function log(s) {
    realConsoleLog.call(realConsole, s);
  }

  function onlyTopText(element) {
    let child = element.firstChild;
    let texts = [];
    while(child) {
      if (child.nodeType === 3) {
        texts.push(child.data);
      }
      child = child.nextSibling;
    }

    return texts.join("");
  }

  function checkSentenceHints() {

    let sourceToTargetLangPrompt = false;

    if (targetLanguagePronouns !== null) {
      const languageCode = targetLanguagePronouns["ISO6391"];
      if (languageCode !== null) {
        const textAreas = document.getElementsByTagName("textarea");    
        if (textAreas !== null) {
            for(let i = 0; i < textAreas.length; i++)
            {
                const textArea = textAreas[i];
                if (textArea.lang === languageCode) {
                    sourceToTargetLangPrompt = true;
                }
            }
        }
      }
    }

    if (sourceToTargetLangPrompt === true) {
        return; //To be able to handle cases like this, rest of the function should be more dynamic
    }

    const words = document.querySelectorAll(nameWord);
    for(let i = 0; i < words.length; i += 1) {
      let word = onlyTopText(words[i]);
      let genderHint = words[i].querySelector(nameGenderHint);
      if (genderHint !== null) {
        let genderFromHint = genderHint.getElementsByTagName("strong")[0];
        if (genderFromHint !== null) {
          assignColorForGender(words[i], String(genderFromHint.innerHTML));
        } // gender !== null
      } else { // word does not have a gender hint: could it be a pronoun?
        let maybeGender = returnGenderIfPronoun(word);
        if (maybeGender !== null) {
          assignColorForGender(words[i], maybeGender);
        }
      }
    } // end for loop
  } // end checkSentenceHints()

  function checkMultipleChoice() {
      const challengeJudgeTexts = document.querySelectorAll(challengeJudgeText);

      for(let j = 0; j < challengeJudgeTexts.length; j += 1) {
          const sentence = challengeJudgeTexts[j].innerHTML;
          if (sentence.includes("<")) {
              log(`Skipping already-processed choice ${sentence}`)
              continue; //We already colored the sentence 
          } else {
              log(`Processing choice ${sentence}`)
          }
          let sentenceColoredWords = [];
          let sentenceWords = sentence.split(" ");
          for(let k = 0; k < sentenceWords.length; k += 1) {
              const genderWordResult = returnGenderIfPronoun(sentenceWords[k]);
              if (genderWordResult !== null) {
                  sentenceColoredWords.push(colorSpanForGender(sentenceWords[k], genderWordResult));
              } else {
                  sentenceColoredWords.push(sentenceWords[k]);  
              }
          }
          const reconstructedSentence = sentenceColoredWords.join(" ");
          if (sentence !== reconstructedSentence) {
              challengeJudgeTexts[j].innerHTML = reconstructedSentence;
          }
      }
  }


  function checkDom() {
    try {
      if (targetLanguagePronouns === null) {
          assignTargetPronouns();
          if (targetLanguagePronouns !== null) {
            log(`assigned target language as ${targetLanguagePronouns["WHOAMI"]}`)
          }
      }

      if (document.getElementsByClassName(classNameExercise).length !== 1) {
        return; //No exercise active (<1), or during transition animation between two exercises (>1)
      } else {
        //setGenderColorStyle();         

        const exercise = document.querySelector(`.${classNameExercise}`);
        if (!exercise.hasAttribute("gr-processed")) {
          checkSentenceHints();
          checkMultipleChoice();
          exercise.setAttribute("gr-processed", "true");
        }
      }
    } catch (e) {
      log(e);
    }
  }

  setInterval(checkDom, 100);
  log(`Gender reveal v${version} loaded`);

}) ();
