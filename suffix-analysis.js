/* Source list from https://github.com/jimdc/gender-reveal/issues/10 */

const spanishExceptionallyMasculine = ['drama', 'enigma', 'esquema', 'estigma', 'estratega', 'idioma', 'mapa', 'morfema', 'planeta', 'problema', 'sistema', 'tema', 'día', 'aroma', 'axioma', 'buda', 'carisma', 'clima', 'diagrama', 'dilema', 'fantasma', 'panda', 'prisma', 'huésped', 'ataúd', 'abad', 'alud', 'áspid', 'laúd', 'récord', 'milord', 'césped', 'aprendiz', 'cáliz', 'arroz', 'pez', 'lápiz', 'ajedrez', 'antifaz', 'maíz', 'albornoz', 'avestruz', 'altavoz', 'altramuz', 'arroz', 'barniz', 'cariz', 'disfraz', 'haz', 'matiz', 'ansión', 'roción', 'notición', 'sentención'];

const spanishExceptionallyFeminine = ['foto', 'mano', 'moto', 'libido', 'radio', 'polio', 'virago', 'forma', 'miel', 'sal', 'hiel', 'piel', 'coliflor', 'sor', 'labor', 'flor', 'miel', 'sal', 'hiel', 'piel', 'coliflor', 'sor', 'labor', 'flor'];

/* todo: find the Spanish common words as with the French, and not just the natural gender ones */

const spanishMasculineEndings = ['o', 'á', 'é', 'í', 'ó', 'ú', 'ma', 'pa', 'ta', 'b', 'v', 'c', 'ch', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'ñ', 'p', 'r', 's', 't', 'w', 'x', 'y', 'e'];

const spanishFeminineEndings = ['a', 'd', 'z', 'ión'];

const spanishExceptionallyCommon = [];

/* In the case of double match like 'a' and 'ma', longer ending takes precedence */

/* Source list from https://github.com/jimdc/gender-reveal/issues/8, exceptions list from https://www.italki.com/article/253/gender-in-french-the-cheat-sheet */

const frenchExceptionallyMasculine = ['cimetière', 'derrière', 'accessoire', 'pourboire', 'cyanure', 'antibiotique', 'cirque', 'disque', 'kiosque'];

const frenchExceptionallyFeminine = ['eau', 'peau', 'couleur', 'valeur', 'longueur', 'largeur', 'fin', 'maison', 'leçon', 'chanson', 'plage', 'cage', 'page', 'garde-robe'];

/* look to see if there is a gendered antecedent pronoun */
const frenchExceptionallyCommon = ['mémoire', 'critique', 'mode', 'moule', 'livre', 'tour', 'poste'];

/* -on not after s/ç, and -é only after C(C=t). not including "if animate" ail, eil, euil, ueil, ing */
const frenchMasculineEndings = ['an', 'and', 'ant', 'ent', 'in', 'int', 'om', 'ond', 'ont', 'on', 'é', 'eau', 'au', 'aud', 'aut', 
'o', 'os', 'ot', 'ai', 'ais', 'ait', 'es', 'et', 'ou', 'out', 'oux', 'i', 'il', 'it', 'is', 'y', 'at', 'as', 'ois', 
'oit', 'u', 'us', 'ut', 'eu', 'er', 'age', 'ege', 'eme', 'ome', 'ôme', 'aume', 'isme', 'as', 'is', 'os', 'us', 
'ex', 'it', 'est', 'al', 'el', 'il', 'ol', 'eul', 'all', 'if', 'ef', 'ac', 'ic', 'oc', 'uc', 'am', 'um', 'en', 'air', 
'er', 'erf', 'ert', 'ar', 'arc', 'ars', 'art', 'our', 'ours', 'or', 'ord', 'ors', 'ort', 'ir', 'oir', 'eur'];

const frenchFeminineEndings = ['aie', 'oue', 'eue', 'ion', 'te', '`ee', 'ie', 'ue', 'asse', 'ace', 'esse', 'ece', 'aisse', 'isse', 'ice', 'ousse', 'ance', 'anse', 'ence', 'once', 'enne', 'onne', 'une', 'ine', 'aine', 'eine', 'erne', 'ande', 'ende', 'onde', 'ade', 'ude', 'arde', 'orde', 'euse', 'ouse', 'ase', 'aise', 'ese', 'oise', 'ise', 'yse', 'ose', 'use', 'ache', 'iche', 'eche', 'oche', 'uche', 'ouche', 'anche', 'ave', 'eve', 'ive', 'iere', 'ure', 'eure', 'ette', 'ete', '^ete', 'atte', 'otte', 'oute', 'orte', 'ante', 'ente', 'inte', 'onte', 'alle', 'elle', 'ille', 'olle', 'aille', 'eille', 'ouille', 'appe', 'ampe', 'ombe', 'igue'];
