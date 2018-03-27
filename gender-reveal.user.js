// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @namespace   https://github.com/jimdc/gender-reveal
// @updateURL   https://github.com/jimdc/gender-reveal/raw/master/gender-reveal.user.js
// @version     1.3
// @run-at      document-start
// ==/UserScript==

(function() {

  // React/Duolingo obfuscated class names
  var classNameExercise = "_1Y5M_"; // Div enclosing all controls of an exercise
  var nameGenderHint = "td._3s3uv";
  var nameWord = "span._3_AmQ";
  var challengeJudgeText = "div._3EaeX"

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

  function checkDom() {
    try {
      if (document.getElementsByClassName(classNameExercise).length !== 1) {
        return; //No exercise active (<1), or during transition animation between two exercises (>1)
      }

      var challengeJudgeTexts = document.querySelectorAll(challengeJudgeText)
      var j;
      for(i = 0; i < challengeJudgeTexts.length; i += 1) {
          var sentence = challengeJudgeTexts[i].innerHTML;
          log(sentence)
      }

      <!-- Todo: find a way not to set the color repeatedly. --> 
      var words = document.querySelectorAll(nameWord);
      var i;
      for(i = 0; i < words.length; i += 1) {        
        var word = onlyTopText(words[i]);
        var genderHint = words[i].querySelector(nameGenderHint);
        if (genderHint !== null) {
          var gender = genderHint.getElementsByTagName("strong")[0];
          if (gender !== null) {
            switch(String(gender.innerHTML)) {
              case "Masculine":
                words[i].style.color = "Blue";
                log("Set blue color to masculine word " + word);
              break;
              case "Feminine":
                words[i].style.color = "Pink";
                log("Set pink color to feminine word " + word);
              break;
              case "Neuter":
                words[i].style.color = "Green";
                log("Set green color to neuter word " + word);
              break;
            }
          }
        }

      }

    } catch (e) {
      log(e);
    }
  }

  setInterval(checkDom, 100);
  log("Gender reveal loaded");

}) ();
