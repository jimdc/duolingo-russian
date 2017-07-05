// ==UserScript==
// @name        Gender Reveal
// @namespace   genderreveal
// @description Reveal grammatical gender on DuoLingo
// @include     https://www.duolingo.com/*
// @version     1
// ==/UserScript==

var words = document.querySelectorAll('[data-test="hint-token"]');
var i;
for (i = 0; i < words.length; i++) {
    words[i].style.backgroundColor = "red";
}
