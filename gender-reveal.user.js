// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @namespace   https://github.com/samideano/gender-reveal
// @updateURL   https://github.com/samideano/gender-reveal/raw/master/gender-reveal.user.js
// @version     1.2
// ==/UserScript==

function highlightWords() {
    var words = document.querySelectorAll('[data-test="hint-token"]');
    alert(words);
    var i;
    for(i = 0; i < words.length; i++) {
        words[i].style.backgroundColor = "red";
    }
}

function initApplication() {
    var start = document.querySelectorAll('[data-test="player-next"]');
    start.addEventListener('click', highlightWords);
}

document.onreadystatechange = function () {
    if (document.readyState === "complete") {
        initApplication();
    }
}
