# gender-reveal
Color-codes words in [Duolingo](http://www.duolingo.com/) by grammatical gender in target-to-source sentence challenges. Source information comes from hover hints and certain languages' gendered pronouns.
![No hover hint necessary](gender_color_different.png)
![Info is taken from hover hint, though](gender_in_hint.png)

# installation
You will need to have installed [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) on Firefox or [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en) on Chrome. Then go to [the userscript](gender-reveal.user.js) and click on "raw".

# color conventions
Currently follows the convention:
* "Blue" for "Masculine"
* "Green" for "Neuter"
* "Pink" for "Feminine"

# pronouns
Gendered pronouns, which do not have hints in Duolingo, are colored--*if the pronoun is unambiguous*--in French, Portuguese, Spanish, German and Dutch. This means that in German, only *er*, *ihn*, *ihrer*, and *es* are colored; while pronouns like *ihm* (could be masculine or neuter) or *der* (could be masculine*-nominativ* or feminine*-dativ*) are not. In the future, I hope to be able to analyze case to disambiguate those pronouns' gender. 

# future features planned 
* color-code words on multiple choice exercises
* color for common gender (as in Swedish) and Swahili noun classes?
