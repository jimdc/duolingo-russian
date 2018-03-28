// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @require     language-specific.js
// @namespace   https://github.com/jimdc/gender-reveal
// @updateURL   https://github.com/jimdc/gender-reveal/raw/master/gender-reveal.user.js
// @version     1.6
// @run-at      document-start
// ==/UserScript==

(function() {

  // React/Duolingo obfuscated class names
  var classNameExercise = "_1Y5M_"; // Div enclosing all controls of an exercise
  var nameGenderHint = "td._3s3uv";
  var nameWord = "span._3_AmQ";
  var challengeJudgeText = "div._3EaeX";

  var realConsole = console;
  var realConsoleLog = console.log;
  function log(s) {
    realConsoleLog.call(realConsole, s);
  }

  function onlyTopText(elemento) {
    var child = elemento.firstChild;
    var texts = [];
    while(child) {
      if (child.nodeType === 3) {
        texts.push(child.data);
      }
      child = child.nextSibling;
    }

    return texts.join("");
  }

  function assignColorForGender(theElement, theGender) {
    switch(theGender) {
      case "Masculine":
        theElement.style.color = "Blue";
        break;
      case "Feminine":
        theElement.style.color = "Pink";
        break;
      case "Neuter":
        theElement.style.color = "Green";
        break;
    }
  }

  function checkSentenceHints() {
    var words = document.querySelectorAll(nameWord);
    var i;
    var word;
    var genderHint;
    var genderFromHint;
    var maybeGender;

    for(i = 0; i < words.length; i += 1) {        
      word = onlyTopText(words[i]);
      genderHint = words[i].querySelector(nameGenderHint);
      if (genderHint !== null) {
        genderFromHint = genderHint.getElementsByTagName("strong")[0];
        if (genderFromHint !== null) {
          assignColorForGender(words[i], String(genderFromHint.innerHTML));
        } // gender !== null
      } else { // word does not have a gender hint: could it be a pronoun?
        maybeGender = returnGenderIfPronoun(word);
        if (maybeGender !== null) {
          assignColorForGender(words[i], maybeGender);
        }
      }
    } // end for loop
  } // end checkSentenceHints()

  function checkMultipleChoice() {
      var challengeJudgeTexts = document.querySelectorAll(challengeJudgeText);
      var j;
      var sentence;
      var sentenceWords;
      for(j = 0; j < challengeJudgeTexts.length; j += 1) {
          sentence = challengeJudgeTexts[j].innerHTML;
          sentenceWords = sentence.split(" ");
      }
  }

  var maybeTargetLanguage = null;

  function checkDom() {
    try {
      if (maybeTargetLanguage === null) {
          maybeTargetLanguage = assignPronouns();
          if (maybeTargetLanguage !== null) { 
            log("assigned target language as " + maybeTargetLanguage)
          }
      }

      if (document.getElementsByClassName(classNameExercise).length !== 1) {
        return; //No exercise active (<1), or during transition animation between two exercises (>1)
      }

      checkSentenceHints();

    } catch (e) {
      log(e);
    }
  }

  setInterval(checkDom, 100);
  log("Gender reveal loaded");

}) ();
