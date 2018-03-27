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
  var languageClass = "span._386Yc";
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

  var frenchPronouns = {
    'un' : 'Masculine',
    'une' : 'Feminine',
    'le' : 'Masculine',
    'la' : 'Feminine',
    'un' : 'Masculine',
    'une' : 'Feminine',
    'du' : 'Masculine',
    'mon' : 'Masculine', <!-- Or before a mute initial consonant noun -->
    'ma' : 'Feminine',
    'ton' : 'Masculine', <!-- Or before a mute initial consonant noun -->
    'ta' : 'Feminine',
    'son' : 'Masculine', <!-- Or before a mute initial consonant noun -->
    'sa' : 'Feminine',
    'celui' : 'Masculine',
    'ceux' : 'Masculine',
    'celle' : 'Feminine',
    'celles' : 'Feminine',
    'ce' : 'Masculine',
    'cet' : 'Masculine',
    'cette' : 'Feminine',
    'quel' : 'Masculine',
    'quels' : 'Masculine',
    'quelle' : 'Feminine',
    'quelles' : 'Feminine'
  };

  var portuguesePronouns = {
    'um' : 'Masculine',
    'uma' : 'Feminine',
    'ele' : 'Masculine',
    'ela' : 'Feminine',
    'dele' : 'Masculine',
    'dela' : 'Feminine',
    'nele' : 'Masculine',
    'nela' : 'Feminine',
    'eles' : 'Masculine', <!-- Could be a mixed group -->
    'elas' : 'Feminine',
    'deles' : 'Masculine', <!-- Could be a mixed group -->
    'delas' : 'Feminine',
    'neles' : 'Masculine', <!-- Could be a mixed group -->
    'nelas' : 'Feminine',
    'o' : 'Masculine',
    'lo' : 'Masculine',
    'no' : 'Masculine',
    'a' : 'Feminine',
    'la' : 'Feminine',
    'na' : 'Feminine',
    'os' : 'Masculine',
    'los' : 'Masculine',
    'nos' : 'Masculine',
    'as' : 'Feminine',
    'las' : 'Feminine',
    'nas' : 'Feminine',
    'mo' : 'Masculine',
    'ma' : 'Feminine',
    'mos' : 'Masculine',
    'mas' : 'Feminine',
    'to' : 'Masculine',
    'ta' : 'Feminine',
    'tos' : 'Masculine',
    'tas' : 'Feminine',
    'lho' : 'Masculine',
    'lha' : 'Feminine',
    'lhos' : 'Masculine',
    'lhas' : 'Feminine',
    'meu' : 'Masculine',
    'minha' : 'Feminine',
    'meus' : 'Masculine',
    'minhas' : 'Feminine',
    'teu' : 'Masculine',
    'tua' : 'Feminine',
    'teus' : 'Masculine', <!-- Could be a mixed group -->
    'tuas' : 'Feminine',
    'seu' : 'Masculine',
    'sua' : 'Feminine',
    'seus' : 'Masculine', <!-- Could be a mixed group -->
    'suas' : 'Feminine',
    'nosso' : 'Masculine',
    'nossa' : 'Feminine',
    'nossos' : 'Masculine', <!-- Could be a mixed group -->
    'nossas' : 'Feminine',
    'vosso' : 'Masculine',
    'vossa' : 'Feminine',
    'vossos' : 'Masculine', <!-- Could be a mixed group -->
    'vossas' : 'Feminine'
  };

  var spanishPronouns = {
    'un' : 'Masculine',
    'una' : 'Feminine',
    'mío' : 'Masculine',
    'mía' : 'Feminine',
    'míos' : 'Masculine',
    'mías' : 'Feminine',
    'lo' : 'Masculine',
    'la' : 'Feminine',
    'el' : 'Masculine',
    'suyo' : 'Masculine',
    'suya' : 'Feminine',
    'él' : 'Masculine',
    'ella' : 'Feminine',
    'ello' : 'Neuter', <!-- rare !!! -->
    'ellos' : 'Masculine', <!-- Could be a mixed group -->
    'ellas' : 'Feminine',
    'nosotros' : 'Masculine', <!-- Could be a mixed group -->
    'nosotras' : 'Feminine',
    'nuestro' : 'Masculine',
    'nuestra' : 'Feminine',
    'nuestros' : 'Masculine', <!-- Could be a mixed group -->
    'nuestras' : 'Feminine',
    'vosotros' : 'Masculine', <!-- Could be a mixed group -->
    'vosotras' : 'Feminine',
    'vuestro' : 'Masculine',
    'vuestra' : 'Feminine',
    'nuestros' : 'Masculine', <!-- Could be a mixed group -->
    'nuestras' : 'Feminine',
    'cuyo' : 'Masculine',
    'cuya' : 'Feminine',
    'cuyos' : 'Masculine', <!-- Could be a mixed group -->
    'cuyas' : 'Feminine'
  };

  <!-- Problematic, because gender changes during case declension -->
  var germanPronouns = {
    'er' : 'Masculine',
    'ihn' : 'Masculine',
    'ihrer' : 'Feminine',
    'es' : 'Neuter',
  };

  var dutchPronouns = {
    'het' : 'Neuter',
    'des' : 'Masculine',
    'hij' : 'Masculine', <!-- ie? -->
    'hem' : 'Masculine', <!-- `m? -->
    'zij' : 'Feminine',
    'ze' : 'Feminine',
    'haar' : 'Feminine', <!-- `r, d`r? -->
    'het' : 'Neuter', <!-- `t? -->
  }

  var italianPronouns = {
    'il' : 'Masculine',
    'lo' : 'Masculine',
    'i' : 'Masculine',
    'gli' : 'Masculine',
    'la' : 'Feminine',
    'le' : 'Feminine',
    'un' : 'Masculine',
    'uno' : 'Masculine',
    'una' : 'Feminine',
    "un'" : 'Feminine',
    'del' : 'Masculine'
    'dello' : 'Masculine',
    'dei' : 'Masculine', <!-- Could refer to a mixed group -->
    'degli' : 'Masculine', <!-- Could refer to a mixed group -->
    'della' : 'Feminine',
    'delle' : 'Feminine',
    'mio' : 'Masculine',
    'miei' : 'Masculine',
    'mia' : 'Feminine',
    'mie' : 'Feminine',
    'tuo' : 'Masculine',
    'tuoi' : 'Masculine',
    'tua' : 'Feminine',
    'tue' : 'Feminine',
    'suo' : 'Masculine',
    'suoi' : 'Masculine', <!-- Could refer to a mixed group -->
    'sua' : 'Feminine',
    'sue' : 'Feminine',
    'nostro' : 'Masculine',
    'nostri' : 'Masculine', <!-- Could refer to a mixed group -->
    'nostra' : 'Feminine',
    'nostre' : 'Feminine',
    'vostro' : 'Masculine', 
    'vostri' : 'Masculine', <!-- Could refer to a mixed group -->
    'vostra' : 'Feminine',
    'vostre' : 'Feminine'
    'egli' : 'Masculine',
    'esso' : 'Masculine',
    'lui' : 'Masculine',
    'ella' : 'Feminine',
    'essa' : 'Feminine',
    'lei' : 'Feminine',
    'essi' : 'Masculine', <!-- Could refer to a mixed group -->
    'esse' : 'Feminine',
    'al' : 'Masculine',
    'allo' : 'Masculine',
    'alla' : 'Feminine',
    'ai' : 'Masculine',
    'agli' : 'Masculine',
    'alle' : 'Feminine',
    'nel' : 'Masculine',
    'nello' : 'Masculine',
    'nella' : 'Feminine',
    'nei' : 'Masculine',
    'negli' : 'Masculine',
    'nelle' : 'Feminine',
    'col' : 'Masculine',
    'coi' : 'Masculine',
    'sul' : 'Masculine',
    'sullo' : 'Masculine',
    'sulla' : 'Feminine',
    'sui' : 'Masculine',
    'sugli' : 'Masculine',
    'sulle' : 'Feminine'
  };

  var myPronouns = null;

  function assignPronouns() {
    var langue = document.querySelector(languageClass);
    if (langue !== null) {
      var result = String(langue.innerHTML)
      switch(result) {
        case "French":
          myPronouns = frenchPronouns;
          break;
        case "Portuguese":
          myPronouns = portuguesePronouns;
          break;
        case "Spanish":
          myPronouns = spanishPronouns;
          break;
        case "German":
          myPronouns = germanPronouns;
          break;
        case "Dutch":
          myPronouns = dutchPronouns;
          break;
        default:
          myPronouns = null;
          break;
      }
      return result;
    }
    return "LanguageWasNull!";
  }

  function returnGenderIfPronoun(possiblyAGenderedPronoun) {
    if (myPronouns !== null) {
      var foundGender = myPronouns[possiblyAGenderedPronoun];
      return foundGender;
    }

    return null;
  }

  function assignColorForGender(theElement, theGender) {
    switch(theGender) {
      case "Masculine":
        theElement.syle.color = "Blue";
        break;
      case "Feminine":
        theElement.style.color = "Pink";
        break;
      case "Neuter":
        theElement.style.color = "Green";
        break;
      default:
        break;
    }
  }

  function checkSentenceHints() {
    var words = document.querySelectorAll(nameWord);
    var i;
    for(i = 0; i < words.length; i += 1) {        
      var word = onlyTopText(words[i]);
      var genderHint = words[i].querySelector(nameGenderHint);
      if (genderHint !== null) {
        var genderFromHint = genderHint.getElementsByTagName("strong")[0];
        if (genderFromHint !== null) {
          assignColorForGender(words[i], String(genderFromHint.innerHTML));
        } // gender !== null
      } else { // word does not have a gender hint: could it be a pronoun?
        var maybeGender = returnGenderIfPronoun(word);
        if (maybeGender !== null) {
          assignColorForGender(words[i], maybeGender);
        }
      }
    } // end for loop
  } // end checkSentenceHints()

  function checkMultipleChoice() {
      var challengeJudgeTexts = document.querySelectorAll(challengeJudgeText)
      var j;
      for(i = 0; i < challengeJudgeTexts.length; i += 1) {
          var sentence = challengeJudgeTexts[i].innerHTML;
          var sentenceWords = sentence.split(" ");
          <!-- todo: find a way to encapsulate a word inside a colored element -->
      }
  }

  function checkDom() {
    try {
      if (document.getElementsByClassName(classNameExercise).length !== 1) {
        return; //No exercise active (<1), or during transition animation between two exercises (>1)
      }

      checkSentenceHints();

    } catch (e) {
      log(e);
    }
  }

  setInterval(checkDom, 100);
  log("Gender reveal loaded for " + assignPronouns());

}) ();
