// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @require     language-specific.js
// @namespace   https://github.com/jimdc/gender-reveal
// @updateURL   https://github.com/jimdc/gender-reveal/raw/master/gender-reveal.user.js
// @version     1.8
// @run-at      document-start
// ==/UserScript==

(function() {
  var version = 1.8

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

  var genderColors = {
    "Masculine" : "Blue",
    "Feminine" : "Pink",
    "Neuter" : "Green"
  };

  function assignColorForGender(theElement, theGender) { 
    var colorAssignment = genderColors[theGender];
    if (colorAssignment !== null) {
        if (theElement.style.color !== colorAssignment) {
            theElement.style.color = colorAssignment;
        }
    }
  }

  function colorSpanForGender(theWord, theGenre) {
    var colorAssignment = genderColors[theGenre];
    if (colorAssignment !== null) {
        return "<span style=\"color:" + colorAssignment + "\">" + theWord + "</span>";
    } else {
      return theWord;
    }
  }

  function checkSentenceHints() {
    var words = document.querySelectorAll(nameWord);
    var i;
    var word;
    var genderHint;
    var genderFromHint;
    var maybeGender;

    if (myPronouns !== null) {
      var languageCode = myPronouns["ISO6391"];
      if (languageCode !== null) {
        var textAreas = document.getElementsByTagName("textarea");    
        if (textAreas !== null) {
            var i;
            for(i = 0; i < textAreas.length; i++)
            {
                var textArea = textAreas[i];
                if (textArea.lang === languageCode) {
                    return; //The prompt is in English; don't highlight
                }
            }
        }
      }
    }

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
      var k;
      var sentence;
      var reconstructedSentence;
      var sentenceColoredWords;
      var sentenceWords;
      var genderWordResult;
      for(j = 0; j < challengeJudgeTexts.length; j += 1) {
          sentence = challengeJudgeTexts[j].innerHTML;
          if (sentence.includes("<")) {
              log("Skipping already-processed choice " + sentence)
              continue; //We already colored the sentence 
          } else {
              log("Processing choice " + sentence)
          }
          sentenceColoredWords = [];
          sentenceWords = sentence.split(" ");
          for(k = 0; k < sentenceWords.length; k += 1) {
              genderWordResult = returnGenderIfPronoun(word);
              if (genderWordResult !== null) {
                  sentenceColoredWords.push(colorSpanForGender(sentenceWords[k], genderWordResult));
              } else {
                  sentenceColoredWords.push(sentenceWords[k]);  
              }
          }
          reconstructedSentence = sentenceColoredWords.join(" ");
          if (sentence !== reconstructedSentence) {
              challengeJudgeTexts[j].innerHTML = reconstructedSentence;
          }
      }
  }


  function checkDom() {
    try {
      if (myPronouns === null) {
          assignPronouns();
          if (myPronouns !== null) {
            log("assigned target language as " + myPronouns["WHOAMI"])
          }
      }

      if (document.getElementsByClassName(classNameExercise).length !== 1) {
        return; //No exercise active (<1), or during transition animation between two exercises (>1)
      }

      checkSentenceHints();
      checkMultipleChoice();

    } catch (e) {
      log(e);
    }
  }

  setInterval(checkDom, 100);
  log("Gender reveal v" + version + " loaded");

}) ();
