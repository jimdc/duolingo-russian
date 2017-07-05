// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://*.duolingo.com/*
// @namespace   https://github.com/samideano/gender-reveal
// @updateURL   https://github.com/samideano/gender-reveal/raw/master/gender-reveal.user.js
// @version     1.1
// ==/UserScript==

function initApplication() {
    var words = document.querySelectorAll('[data-test="hint-token"]');
    var i;
    for (i = 0; i < words.length; i++) {
        words[i].style.backgroundColor = "red";
    }
}

document.onreadystatechange = function () {
    if (document.readyState === "complete") {
        initApplication();
	console.log('hello, world');
	GM_log('helloGM');
    }
}
