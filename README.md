# gender-reveal
Color-codes words in [Duolingo](http://www.duolingo.com/) by the grammatical gender shown in its hover-hint in target-to-source sentence challenges. 
![No hover hint necessary](gender_color_different.png)
![Info is taken from hover hint, though](gender_in_hint.png)

Currently follows the convention:
* "Blue" for "Masculine"
* "Green" for "Neuter"
* "Pink" for "Feminine"
and should work for any languages who use a superset or subset of these.

Features being added (practical help needed):
* Detecting language (and when it switches) for gendered pronoun detection
* Common color for common/neuter contrast (as in Dutch and Swedish)
* Having some sort of non-log-dependent interface

Future features to add (conceptual help needed):
* DB storage of word/gender association, for coloring multiple-choice.
* Support for enclitics (Spanish *dáme**lo*** and all Romanian pronouns)  
* Support for morphing (gender of German pronouns depending on number, case...)
