/* td.js — travaux dirigés : mêmes montages que certains TP, mais guidés étape par étape (explication, consigne, validation).
   Les TP gardent le cahier des charges seul ; chaque TP renvoie vers le TD qui lui correspond. */
(function (g) {
'use strict';
const NS = g.NS, SC = NS.SCENARIOS;
const base = id => SC.find(s => s.id === id);
const L = (ctx, ra, pa, rb, pb) => ctx.linked(ra, pa, rb, pb);

/* fabrique : copie le montage (build / solve / critères) d'un TP et y ajoute le déroulé guidé */
function td(baseId, d) {
  const b = base(baseId), questions = (d.questions || b.questions).map((q, i) => Object.assign({}, q, d.help && d.help[i] ? { help: d.help[i] } : {}));
  const t = Object.assign({}, b, { id: 'td_' + baseId, kind: 'TD', variants: undefined, variantLabel: undefined, title: d.title, desc: d.desc, objectives: d.obj || b.objectives, cours: d.cours || b.cours || [], stages: d.stages, steps: [], questions, duration: d.duration || b.duration, diff: d.diff || 1, correction: d.correction || b.correction, dock: d.dock || b.dock });
  SC.push(t); return t;
}

td('premier', {
  title: 'TD — Découvrir les niveaux logiques et la porte ET', duration: '45 min',
  desc: '<p>Un ordinateur ne manipule que deux états : <b>0</b> et <b>1</b>. Dans ce TD, vous câblez votre premier circuit logique, étape par étape : deux interrupteurs, une porte <b>ET</b> et une lampe (LED).</p>',
  obj: ['Savoir ce que représentent 0 et 1', 'Câbler un fil entre deux broches', 'Comprendre la règle de la porte ET', 'Remplir une table de vérité'],
  cours: ['niveaux'],
  stages: [
    { t: 'Les deux niveaux : 0 et 1', learn: '<p>En électronique numérique, une tension <b>basse</b> (environ 0 V) représente <b>0</b> et une tension <b>haute</b> (environ 5 V) représente <b>1</b>. Un <b>interrupteur</b> est la façon la plus simple de choisir 0 ou 1 : ouvert = 0, fermé = 1.</p><p>Sur le schéma, la <b>pastille</b> près d\'une broche indique son niveau, et un fil à 1 est <b>vert et épais</b>.</p>', do: 'Cliquez sur l\'interrupteur <b>A</b> : son chiffre passe de 0 à 1, puis cliquez encore pour revenir à 0. Rien d\'autre ne bouge : il n\'est pas encore relié à quoi que ce soit.' },
    { t: 'Relier A à la porte', learn: '<p>Une porte logique reçoit ses <b>entrées</b> sur le côté gauche (E1, E2) et fournit sa <b>sortie</b> à droite (S). Pour relier deux broches, <b>cliquez sur le petit rond d\'une broche et tirez jusqu\'à l\'autre broche</b>.</p>', do: 'Reliez la sortie de l\'interrupteur A à l\'entrée <b>E1</b> de la porte ET (G1).', hint: 'Partez du rond à droite de A, relâchez sur le rond E1 en haut à gauche de la porte. Un fil apparaît.', check: { label: 'A est relié à E1 de G1', run: c => L(c, 'A', 'S', 'G1', 'E1') }, fail: 'Le fil entre A et E1 n\'existe pas encore.' },
    { t: 'Relier B et la sortie', learn: '<p>Une porte ET possède ici deux entrées. Une entrée laissée « en l\'air » est indéterminée : son fil et sa pastille sont <b>orange avec un ?</b>.</p>', do: 'Reliez B à <b>E2</b>, puis la sortie de G1 à l\'entrée de la LED <b>S1</b>.', check: { label: 'Le montage est entièrement câblé', run: c => L(c, 'B', 'S', 'G1', 'E2') && L(c, 'G1', 'S', 'S1', 'E') && c.floating().length === 0 }, fail: 'Il manque un fil : vérifiez qu\'aucune broche n\'est orange avec un « ? ».' },
    { t: 'Observer la règle du ET', learn: '<p>La porte <b>ET</b> (symbole <b>&amp;</b>) donne 1 quand <b>A et B</b> valent 1 en même temps. Dans tous les autres cas, elle donne 0. Une <b>table de vérité</b> liste la sortie pour chaque combinaison des entrées : avec 2 entrées il y a 2 × 2 = <b>4 lignes</b>.</p>', do: 'Essayez les 4 combinaisons (A, B) = (0,0), (0,1), (1,0), (1,1) et regardez la LED. Ouvrez l\'onglet <b>Table de vérité</b> pour comparer, puis répondez aux questions ci-dessous.', check: { label: 'S1 = A·B', run: c => c.eq('S1', 'A·B') }, fail: 'Le comportement n\'est pas celui d\'une porte ET reliée à A et B.' }],
  help: ['Écrivez 0 ou 1 pour S1 sur chacune des 4 lignes. Une seule ligne donne 1.', 'Pensez à l\'image de deux interrupteurs en série : le courant passe seulement si les deux sont fermés.', 'Le point (·) se lit « ET » : S1 = A·B.']
});

td('et_ou', {
  title: 'TD — ET et OU : deux façons de combiner', duration: '45 min',
  desc: '<p>Les mêmes interrupteurs A et B commandent deux lampes : l\'une par une porte <b>ET</b>, l\'autre par une porte <b>OU</b>. Vous comparez ce qui change.</p>',
  obj: ['Distinguer ET et OU', 'Raccorder une même entrée à deux portes', 'Comparer deux tables de vérité'], cours: ['portes'],
  stages: [
    { t: 'Deux images pour comprendre', learn: '<p><b>ET</b> : comme deux interrupteurs en <b>série</b>, il faut que les deux soient fermés. <b>OU</b> : comme deux interrupteurs en <b>parallèle</b>, il suffit qu\'un seul soit fermé.</p><p>Symboles européens : <b>&amp;</b> pour ET, <b>≥ 1</b> pour OU (« au moins un »).</p>', do: 'Repérez sur le schéma G1 (&amp;) et G2 (≥ 1), et les deux LED S1 (verte) et S2 (jaune).' },
    { t: 'Brancher A et B sur les deux portes', learn: '<p>Une sortie peut alimenter <b>plusieurs entrées</b> : tirez simplement plusieurs fils depuis la même broche. Pour partir d\'un fil existant, cliquez dessus pour créer un nœud.</p>', do: 'Reliez A et B aux entrées E1 et E2 de <b>G1</b>, puis aux entrées E1 et E2 de <b>G2</b> (4 fils).', check: { label: 'A et B alimentent G1 et G2', run: c => L(c, 'A', 'S', 'G1', 'E1') && L(c, 'B', 'S', 'G1', 'E2') && L(c, 'A', 'S', 'G2', 'E1') && L(c, 'B', 'S', 'G2', 'E2') }, fail: 'Vérifiez les 4 fils : A et B vers G1, A et B vers G2.' },
    { t: 'Brancher les lampes', do: 'Reliez la sortie de G1 à S1 et la sortie de G2 à S2.', check: { label: 'S1 = A·B et S2 = A+B', run: c => c.eq('S1', 'A·B') && c.eq('S2', 'A+B') && c.floating().length === 0 }, fail: 'Une LED n\'est pas reliée à la bonne porte.' },
    { t: 'Comparer', learn: '<p>ET : 0 0 0 1. OU : 0 1 1 1. Les deux ne diffèrent que lorsque <b>un seul</b> interrupteur est à 1 : le OU allume, le ET n\'allume pas.</p>', do: 'Testez les 4 combinaisons en regardant S1 et S2, puis répondez aux questions.' }],
  help: ['Lisez S2 sur chaque ligne : il vaut 1 dès qu\'un interrupteur est à 1.', 'Cherchez la ligne où S1 et S2 sont tous deux à 1.', 'OU = « au moins un ».']
});

td('inverses', {
  title: 'TD — NON, NON-ET, NON-OU et OU exclusif', duration: '1 h',
  desc: '<p>Quatre nouvelles portes : le <b>NON</b> (inverseur), le <b>NON-ET</b>, le <b>NON-OU</b> et le <b>OU exclusif</b>. Vous découvrez le <b>petit rond</b> du symbole européen, qui signifie « inversé ».</p>',
  obj: ['Comprendre le rond de négation', 'Déduire NON-ET et NON-OU de ET et OU', 'Utiliser le OU exclusif'], cours: ['portes'],
  stages: [
    { t: 'L\'inverseur NON', learn: '<p>La porte <b>NON</b> (rectangle « 1 » avec un rond) inverse son entrée : 0 devient 1 et 1 devient 0. On écrit <b>!A</b> (ou A barré).</p>', do: 'Reliez A à l\'entrée de <b>G1</b> (NON), puis G1 à la LED <b>S1</b>. Cliquez sur A : S1 doit faire l\'inverse.', check: { label: 'S1 = NON A', run: c => c.eq('S1', '!A') && L(c, 'A', 'S', 'G1', 'E') }, fail: 'S1 doit s\'allumer quand A vaut 0.' },
    { t: 'Le rond = « puis inverser »', learn: '<p><b>NON-ET</b> = un ET suivi d\'un NON : il donne 0 uniquement si <b>toutes</b> les entrées valent 1. <b>NON-OU</b> = un OU suivi d\'un NON : il donne 1 uniquement si <b>toutes</b> les entrées valent 0. Leurs tables sont les <b>inverses</b> de celles de ET et de OU.</p>', do: 'Reliez A et B aux entrées de <b>G2</b> (NON-ET) et de <b>G3</b> (NON-OU), puis leurs sorties à S2 et S3.', hint: 'Pensez à partir de la broche S de A puis de B : chacune alimente trois portes (G2, G3, G4).', check: { label: 'S2 = NON-ET et S3 = NON-OU', run: c => c.eq('S2', '!(A·B)') && c.eq('S3', '!(A+B)') }, fail: 'Vérifiez les fils de G2 et G3 et leurs LED.' },
    { t: 'Le OU exclusif', learn: '<p>Le <b>OU exclusif</b> (symbole <b>= 1</b>) vaut 1 quand ses entrées sont <b>différentes</b> : « l\'un ou l\'autre, mais pas les deux ». On écrit A ⊕ B. C\'est la fonction « va-et-vient » d\'un éclairage.</p>', do: 'Reliez A et B à <b>G4</b> (OU exclusif) et sa sortie à <b>S4</b>. Testez les 4 combinaisons en observant les 4 LED, puis répondez.', check: { label: 'S4 = A ⊕ B', run: c => c.eq('S4', 'A⊕B') && c.floating().length === 0 }, fail: 'G4 doit recevoir A et B, et sa sortie doit aller à S4.' }],
  help: ['NON-ET = inverse de ET : 1 sauf quand A = B = 1.', 'NON-OU = inverse de OU : 1 seulement quand A = B = 0.', 'Le OU exclusif donne 1 si A ≠ B.', 'Comparez ligne à ligne avec les tables de ET et OU exclusif.', 'Un rond sur la sortie = on inverse le résultat de la porte.']
});

td('lire', {
  title: 'TD — Lire un schéma : table de vérité et équation', duration: '1 h', diff: 2,
  desc: '<p>Un montage de portes est déjà câblé (S1 dépend de A, B, C). Vous apprenez à en <b>déduire la table de vérité, puis l\'équation</b>, avec une méthode que vous pourrez réutiliser sur n\'importe quel schéma.</p>',
  obj: ['Remplir une table à 3 entrées (8 lignes)', 'Passer de la table à une équation (somme de produits)', 'Vérifier avec l\'onglet Équations'], cours: ['table', 'equation'],
  stages: [
    { t: 'Repérer les portes', learn: '<p>On lit un schéma de <b>gauche à droite</b> : les entrées à gauche, la sortie à droite. Chaque porte reçoit des fils : des entrées ou la sortie d\'une autre porte.</p>', do: 'Listez sur papier les portes (symbole et nombre d\'entrées) et ce qui est relié à chacune. Cliquez sur une porte : le panneau <b>Propriétés</b> montre sa table et les niveaux.' },
    { t: 'Les 8 combinaisons', learn: '<p>Avec <b>3 entrées</b> il y a 2<sup>3</sup> = <b>8 combinaisons</b>. On les range dans l\'ordre du comptage binaire : 000, 001, 010, … 111 (A est le bit de poids fort).</p>', do: 'Dans l\'onglet <b>Table de vérité</b>, cliquez sur une ligne : les interrupteurs se règlent tout seuls. Choisissez une ligne où <b>S1 = 1</b> et laissez-la ainsi.', check: { label: 'Les interrupteurs allument S1', run: c => c.val('S1', 'E') === 1 }, fail: 'S1 est éteinte : choisissez une ligne où la colonne S1 vaut 1.' },
    { t: 'De la table à l\'équation', learn: '<p><b>Méthode « somme de produits »</b> : pour <b>chaque ligne où S1 = 1</b>, on écrit un produit (ET) de toutes les entrées, en mettant un NON sur celles qui valent 0 dans cette ligne ; puis on relie tous les produits par un <b>OU</b>.</p><p>Exemple : la ligne A = 1, B = 0, C = 1 donne le produit <b>A·!B·C</b>.</p>', do: 'Écrivez les produits de chaque ligne à 1, assemblez-les, puis comparez avec l\'onglet <b>Équations</b> qui affiche aussi la forme <b>simplifiée</b>. Répondez aux questions.' }],
  help: ['Utilisez l\'onglet Table de vérité pour lire les 8 lignes.', 'Comptez les 1 de la colonne S1.', 'Saisissez l\'expression avec les boutons A, B, C, ·, +, !. Elle n\'a pas besoin d\'être la plus simple ici.']
});

td('equ_schema', {
  title: 'TD — Dessiner le schéma d\'une équation', duration: '1 h', diff: 2,
  desc: '<p>On vous donne l\'équation <b>S1 = A·B + !C</b>. Vous apprenez à la <b>traduire en schéma</b> : une porte par opérateur.</p>',
  obj: ['Découper une équation en opérateurs', 'Placer et câbler les portes correspondantes', 'Vérifier l\'équivalence'], cours: ['equation'],
  stages: [
    { t: 'Découper l\'équation', learn: '<p>Priorité des opérateurs : <b>NON</b> d\'abord, puis <b>ET</b>, puis <b>OU</b>. Ici : A·B est un ET ; !C est un NON ; le + final est un OU qui reçoit les deux résultats.</p>', do: 'Notez : porte 1 = ET (A, B) ; porte 2 = NON (C) ; porte 3 = OU (résultat 1, résultat 2). Il faut donc <b>3 portes</b>.' },
    { t: 'Placer les portes', learn: '<p>Choisissez les portes dans la palette (catégorie <b>Portes logiques</b>) et cliquez dans le schéma pour les poser. R fait pivoter. Placez-les de gauche à droite.</p>', do: 'Posez une porte ET, une porte NON et une porte OU entre les interrupteurs et la LED S1.', check: { label: 'Une porte ET, un NON et un OU sont posés', run: c => c.count('and') >= 1 && c.count('not') >= 1 && c.count('or') >= 1 }, fail: 'Il manque une des trois portes (ET, NON, OU).' },
    { t: 'Câbler', learn: '<p>Chaque entrée de porte reçoit soit une variable, soit la sortie d\'une autre porte. Le OU reçoit les sorties du ET et du NON.</p>', do: 'Câblez : A et B vers le ET ; C vers le NON ; sortie du ET et sortie du NON vers le OU ; sortie du OU vers S1.', hint: 'Si une broche reste orange avec un « ? », c\'est qu\'un fil manque.', check: { label: 'S1 = A·B + !C', run: c => c.eq('S1', 'A·B + !C') }, fail: 'La table de S1 ne correspond pas à A·B + !C : vérifiez chaque fil.' },
    { t: 'Vérifier', learn: '<p>Pour vérifier un schéma on compare sa <b>table de vérité</b> avec celle de l\'équation. L\'onglet <b>Équations</b> relit l\'équation de votre schéma.</p>', do: 'Ouvrez l\'onglet <b>Équations</b> et comparez avec l\'énoncé, puis répondez à la question.' }],
  help: ['Une porte par opérateur : ET, NON, OU.']
});

td('demorgan', {
  title: 'TD — Les lois de De Morgan', duration: '1 h', diff: 2,
  desc: '<p>La porte G1 (NON-OU) allume S1. Vous allez découvrir qu\'on peut obtenir <b>exactement le même résultat</b> avec seulement des NON et des ET : c\'est la loi de De Morgan.</p>',
  obj: ['Énoncer De Morgan', 'La vérifier sur un schéma', 'Comparer deux tables'], cours: ['boole'],
  stages: [
    { t: 'Observer le NON-OU', learn: '<p>NON-OU : S1 = !(A + B). Il vaut 1 <b>seulement</b> si A = 0 <b>et</b> B = 0.</p>', do: 'Testez les 4 combinaisons et notez S1.' },
    { t: 'La loi de De Morgan', learn: '<p>« Ni A ni B » veut dire « non A <b>et</b> non B ». En équation :</p><p><b>!(A + B) = !A · !B</b> et de même <b>!(A · B) = !A + !B</b>.</p><p>Le contraire d\'un OU est le ET des contraires.</p>', do: 'Concevez S2 avec <b>deux NON et un ET</b> : un NON sur A, un NON sur B, puis un ET entre les deux résultats.' },
    { t: 'Placer les portes', do: 'Placez deux portes NON et une porte ET en bas du schéma.', check: { label: 'Deux NON et un ET sont posés', run: c => c.count('not') >= 2 && c.count('and') >= 1 }, fail: 'Il faut deux NON et un ET en plus de G1.' },
    { t: 'Câbler et comparer', learn: '<p>Si la loi est exacte, S2 doit toujours être égal à S1 : les deux tables de vérité sont identiques.</p>', do: 'Câblez A et B chacun vers un NON, les deux NON vers le ET, le ET vers S2. Comparez S1 et S2 pour les 4 combinaisons.', check: { label: 'S2 = S1 pour les 4 combinaisons', run: c => { const a = c.outFn('S1'), b = c.outFn('S2'); return !!a && !!b && a.values.join() === b.values.join() && c.c.parts.filter(p => p.type === 'not').length >= 2; } }, fail: 'S2 ne se comporte pas comme S1 : vérifiez les fils.' }],
  help: ['Écrivez l\'équation de la forme « NON A ET NON B » avec ! et ·.', 'Le contraire d\'un ET est un OU des contraires.']
});

td('karnaugh3', {
  title: 'TD — Simplifier avec un tableau de Karnaugh (3 variables)', duration: '1 h 15', diff: 2, dock: 'karnaugh',
  desc: '<p>Un schéma compliqué réalise une fonction S1 de trois variables. Le <b>tableau de Karnaugh</b> permet de trouver, visuellement, la même fonction avec beaucoup moins de portes.</p>',
  obj: ['Remplir un tableau de Karnaugh', 'Faire des groupements', 'Lire l\'équation minimale', 'Refaire le schéma avec moins de portes'], cours: ['karnaugh'],
  stages: [
    { t: 'Pourquoi un tableau particulier ?', learn: '<p>Dans un tableau de Karnaugh, deux cases voisines ne diffèrent que d\'<b>une seule variable</b>. C\'est pour cela que les colonnes sont rangées 00, 01, <b>11, 10</b> (code de Gray) et non 00, 01, 10, 11. Si deux cases voisines valent 1, la variable qui change <b>disparaît</b> de l\'équation.</p>', do: 'Observez la fonction : lancez l\'onglet <b>Karnaugh</b>, choisissez la sortie <b>S1</b> du schéma dans la liste (à la place de « Tableau libre »). Le tableau se remplit à partir du schéma.' },
    { t: 'Faire les groupements', learn: '<p><b>Règles</b> : on entoure des 1 en <b>rectangles de 1, 2, 4 ou 8 cases</b> (puissances de 2). Les groupes doivent être <b>les plus gros possibles</b>, on en fait <b>le moins possible</b>, et un 1 peut être pris dans plusieurs groupes. Les bords opposés du tableau se touchent.</p>', do: 'Passez en mode <b>Entourer</b> et créez vos groupes. Le bouton « Montrer la solution » dit si vous avez trouvé ceux de la forme minimale.', hint: 'Cherchez d\'abord le plus gros groupe de 4 cases, puis couvrez les 1 restants avec des groupes de 2.' },
    { t: 'Lire l\'équation', learn: '<p>Chaque groupe donne <b>un terme</b> ne contenant que les variables qui <b>ne changent pas</b> dans le groupe : un groupe de 4 cases supprime 2 variables, un groupe de 2 en supprime 1. Les termes sont reliés par un OU.</p>', do: 'Écrivez l\'équation dans la question 2. L\'application la compare avec la forme minimale.' },
    { t: 'Refaire le schéma', learn: '<p>Moins de termes et moins de variables par terme, c\'est <b>moins de portes</b> : un circuit moins cher et plus fiable.</p>', do: 'Supprimez les portes de départ (sélection puis « Supprimer ») et câblez la forme simplifiée entre A, B, C et S1.', check: { label: 'Le schéma est minimal et S1 est inchangée', run: c => c.tt('S1').join('') === '00110111' && c.nGates() <= NS.minGates(['A', 'B', 'C'], [{ name: 'S1', values: [0, 0, 1, 1, 0, 1, 1, 1] }]) }, fail: 'Soit la fonction a changé, soit il reste trop de portes.' }],
  help: ['Comptez les cases à 1 dans le tableau.', 'Écrivez un terme par groupe, séparés par +.'],
  correction: '<p>Pour cette fonction : un groupe de 4 cases (B = 1) et un groupe de 2 cases (A·C). Équation minimale : <b>S1 = B + A·C</b>, soit 2 portes (un ET et un OU) au lieu de plusieurs.</p>'
});

td('alarme', {
  title: 'TD — Méthode de conception : une alarme', duration: '1 h 15', diff: 2,
  desc: '<p>Vous concevez un circuit à partir d\'un <b>énoncé en français</b> : la sirène sonne quand le système est armé et qu\'une ouverture (porte ou fenêtre) est ouverte. Vous suivez la méthode : variables → table → équation → schéma.</p>',
  obj: ['Traduire un énoncé en table de vérité', 'En déduire l\'équation', 'Câbler et tester'], cours: ['conception'],
  stages: [
    { t: 'Entrées et sorties', learn: '<p>On commence par <b>donner un nom</b> à chaque grandeur et décider ce que valent 0 et 1. Ici : A = porte ouverte (1 = ouverte), B = fenêtre ouverte, C = système armé, S1 = sirène (1 = elle sonne).</p>', do: 'Repérez A, B, C et S1 sur le schéma. Passez la souris sur chaque interrupteur : sa description s\'affiche.' },
    { t: 'La table de vérité', learn: '<p>On écrit la sortie pour <b>les 8 combinaisons</b>. Ici la sirène sonne <b>seulement si C = 1</b> et si A = 1 <b>ou</b> B = 1. Donc, si C = 0, S1 = 0 pour les 4 lignes.</p>', do: 'Remplissez la table de la question 1. Raisonnez ligne par ligne avec l\'énoncé.' },
    { t: 'De la table à l\'équation', learn: '<p>« Armé <b>ET</b> (porte <b>OU</b> fenêtre) » s\'écrit <b>C · (A + B)</b>. Le <b>OU</b> regroupe les deux ouvertures, le <b>ET</b> impose que le système soit armé.</p>', do: 'Écrivez l\'équation dans la question 2 (avec une forme simple : 3 variables écrites suffisent).' },
    { t: 'Schéma et test', learn: '<p>On dessine une porte par opérateur : un OU (A, B) puis un ET (résultat du OU, C), vers la sirène.</p>', do: 'Câblez le montage, puis testez les 8 combinaisons avec l\'onglet <b>Table de vérité</b>.', check: { label: 'S1 = (A+B)·C avec 2 portes', run: c => c.eq('S1', '(A+B)·C') && c.nGates() <= 2 }, fail: 'S1 ne suit pas le cahier des charges, ou il y a trop de portes.' }],
  help: ['Une seule ligne ne suffit pas : trois lignes donnent 1.', 'Écrivez-la avec ·, + et des parenthèses.']
});

td('generateur', {
  title: 'TD — Signaux carrés : période, fréquence, rapport cyclique', duration: '1 h',
  desc: '<p>Un générateur produit un signal qui alterne régulièrement entre 0 et 1. Vous apprenez à le régler et à lire ses caractéristiques sur un <b>chronogramme</b>.</p>',
  obj: ['Définir T, f et rapport cyclique', 'Régler un générateur', 'Mesurer sur le chronogramme'], cours: ['signaux'], dock: 'chrono',
  stages: [
    { t: 'Trois grandeurs', learn: '<p>La <b>période T</b> est la durée d\'un cycle complet (un état haut + un état bas). La <b>fréquence f = 1 / T</b> (en hertz) est le nombre de cycles par seconde. Le <b>rapport cyclique</b> est la part de la période passée à 1 : 25 % = un quart du temps à 1.</p><p>Exemple : f = 4 Hz → T = 1/4 = 0,25 s = 250 ms.</p>', do: 'Observez H1 : cliquez dessus et regardez dans <b>Propriétés</b> ses réglages (fréquence, rapport cyclique). Regardez la LED clignoter.' },
    { t: 'Régler la fréquence', do: 'Réglez la fréquence de H1 à <b>4 Hz</b>.', check: { label: 'H1 fonctionne à 4 Hz', run: c => { const m = c.measure('H1', 'S', 4); return !!m && Math.abs(m.f - 4) <= 0.2; } }, fail: 'La fréquence mesurée n\'est pas 4 Hz.' },
    { t: 'Régler le rapport cyclique', learn: '<p>Un rapport cyclique de 25 % signifie que le signal est à 1 pendant 25 % de T, donc <b>62,5 ms</b> pour T = 250 ms.</p>', do: 'Réglez le rapport cyclique à <b>25 %</b>.', check: { label: 'Rapport cyclique de 25 %', run: c => { const m = c.measure('H1', 'S', 4); return !!m && Math.abs(m.duty * 100 - 25) <= 3; } }, fail: 'Le rapport cyclique n\'est pas encore 25 %.' },
    { t: 'Lire le chronogramme', learn: '<p>Le chronogramme montre le niveau du signal au cours du temps. Cliquez deux fois pour placer les <b>curseurs A et B</b> : l\'affichage donne la durée entre eux (Δt) et la fréquence correspondante.</p>', do: 'Placez A et B sur deux fronts montants consécutifs : lisez T. Répondez aux questions.' }],
  help: ['T = 1 / f. Pensez à convertir en millisecondes.', 'Durée à 1 = T × rapport cyclique.', 'Relation à retenir entre f et T.']
});

td('div2', {
  title: 'TD — La bascule D : diviser une fréquence par 2', duration: '1 h', diff: 2,
  desc: '<p>Dans ce TD vous découvrez la <b>mémoire</b> en logique : la bascule D. En la câblant d\'une certaine façon, elle divise la fréquence d\'une horloge par 2.</p>',
  obj: ['Comprendre le front montant', 'Câbler une bascule D', 'Obtenir f / 2'], cours: ['bascule'], dock: 'chrono',
  stages: [
    { t: 'Comment fonctionne la bascule D', learn: '<p>La bascule D a une entrée de données <b>D</b>, une entrée d\'horloge <b>CLK</b> (avec un petit triangle) et deux sorties <b>Q</b> et <b>NQ</b> (l\'inverse de Q). À <b>chaque front montant</b> de CLK (passage de 0 à 1), elle recopie D sur Q. Entre deux fronts, Q ne bouge plus : c\'est une mémoire.</p>', do: 'Repérez D, CLK, Q et NQ sur la bascule FF1.' },
    { t: 'Brancher l\'horloge', do: 'Reliez la sortie de l\'horloge H1 à l\'entrée <b>CLK</b> de FF1.', check: { label: 'H1 est reliée à CLK', run: c => L(c, 'H1', 'S', 'FF1', 'CLK') }, fail: 'H1 doit être reliée à CLK (l\'entrée au triangle).' },
    { t: 'Reboucler NQ sur D', learn: '<p>Si D reçoit toujours le <b>contraire</b> de Q (c\'est-à-dire NQ), alors à chaque front montant Q <b>change d\'état</b> : 0 puis 1 puis 0… Q met donc <b>deux périodes de H1</b> pour faire un cycle : sa fréquence est divisée par 2.</p>', do: 'Reliez la sortie <b>NQ</b> de FF1 à son entrée <b>D</b>.', hint: 'Faites passer le fil sous la bascule pour qu\'il reste lisible (vous pouvez ajouter des points de passage).', check: { label: 'NQ est reliée à D', run: c => L(c, 'FF1', 'NQ', 'FF1', 'D') }, fail: 'Le fil NQ → D manque.' },
    { t: 'Observer', do: 'Reliez Q à la LED S1, ouvrez l\'onglet <b>Chronogramme</b> et comparez H1 et Q : combien de fronts de H1 par cycle de Q ? Répondez.', check: { label: 'Q change à chaque front montant (f / 2)', run: c => { const m = c.measure('FF1', 'Q', 6); return !!m && Math.abs(m.f - c.part('H1').p.f / 2) <= 0.1 * c.part('H1').p.f / 2; } }, fail: 'Q ne se comporte pas comme f / 2.' }],
  help: ['f(Q) = f(H1) / 2.', 'Cherchez l\'événement qui déclenche la mémorisation.']
});


/* ---- TD spécifique : lire les formes canoniques de l'onglet Équations (Σ, Π, mintermes, maxtermes) */
SC.push({
  id: 'td_canoniques', cat: '2 · Tables et équations', kind: 'TD', diff: 2, title: 'TD — Comprendre Σ, Π, mintermes et maxtermes', level: 'Bac Pro CIEL (première)', duration: '1 h', dock: 'eq',
  refs: 'Formes canoniques ; somme de produits et produit de sommes ; lecture de l\'onglet Équations',
  desc: '<p>L\'onglet <b>Équations</b> affiche des écritures comme <b>Σ(3)</b> ou <b>Π(0, 1, 2)</b>. Ce TD explique <b>ce qu\'elles veulent dire</b>, comment les retrouver à la main à partir d\'une table de vérité, et pourquoi on cherche ensuite une forme <b>simplifiée</b>.</p>',
  objectives: ['Numéroter les lignes d\'une table de vérité', 'Définir minterme et maxterme', 'Lire Σ(…) et Π(…)', 'Distinguer forme canonique et forme simplifiée'],
  cours: ['equation'], steps: [],
  stages: [
    { t: 'Numéroter les lignes de la table', learn: '<p>Chaque ligne de la table de vérité est une <b>combinaison des entrées</b>. On lui donne un <b>numéro</b> : la combinaison lue comme un nombre binaire, avec A en poids fort. Avec deux entrées A et B :</p><table class="cov"><tr><th>N°</th><th>A</th><th>B</th></tr><tr><td>0</td><td>0</td><td>0</td></tr><tr><td>1</td><td>0</td><td>1</td></tr><tr><td>2</td><td>1</td><td>0</td></tr><tr><td>3</td><td>1</td><td>1</td></tr></table><p>Exemple : la ligne n° 3 est « A = 1, B = 1 » (11 en binaire = 3).</p>', do: 'Ouvrez l\'onglet <b>Table de vérité</b> : repérez la colonne des numéros de ligne (case « n° de ligne »). Dans la question 1, dites à quelle combinaison correspond la ligne n° 2.' },
    { t: 'Câbler un ET et lire Σ', learn: '<p>Un <b>minterme</b> est un produit (ET) qui contient <b>toutes</b> les variables et qui vaut 1 pour <b>une seule</b> ligne. Pour la ligne 3 (A = 1, B = 1) : <b>A·B</b>. Pour la ligne 1 (A = 0, B = 1) : <b>!A·B</b> (on met un NON sur les variables qui valent 0).</p><p><b>Σ(3)</b> (« sigma ») veut dire : <i>S est la somme (OU) des mintermes des lignes 3</i>. On liste les numéros des lignes où <b>S = 1</b>.</p>', do: 'Reliez A et B à la porte <b>ET</b> (G1) et sa sortie à S1. Ouvrez l\'onglet <b>Équations</b> : vous devez lire <b>Σ(3)</b>, car S1 vaut 1 uniquement quand A = B = 1.', check: { label: 'A et B sont reliés à G1 et G1 à S1', run: c => L(c, 'A', 'S', 'G1', 'E1') && L(c, 'B', 'S', 'G1', 'E2') && L(c, 'G1', 'S', 'S1', 'E') }, fail: 'Câblez A et B aux entrées de G1, puis G1 à S1.' },
    { t: 'Lire Π : les lignes à 0', learn: '<p>On peut aussi décrire la fonction par ses <b>lignes à 0</b>. Un <b>maxterme</b> est une somme (OU) de toutes les variables qui vaut 0 pour <b>une seule</b> ligne. Pour la ligne 0 (A = 0, B = 0) : <b>A + B</b>. Attention : ici on met un NON sur les variables qui valent <b>1</b> dans la ligne. Pour la ligne 2 (A = 1, B = 0) : <b>!A + B</b>.</p><p><b>Π(0, 1, 2)</b> (« pi ») veut dire : <i>S est le produit (ET) des maxtermes des lignes 0, 1 et 2</i> : on liste les numéros des lignes où <b>S = 0</b>.</p>', do: 'Dans l\'onglet <b>Équations</b>, lisez Π(0, 1, 2) pour votre ET. Vérifiez que ce sont bien les lignes où S1 est à 0, puis répondez à la question 2.' },
    { t: 'Forme canonique ou forme simplifiée ?', learn: '<p>Σ et Π sont des <b>formes canoniques</b> : elles contiennent <b>toutes les variables dans chaque terme</b>, donc sont longues. On peut les <b>simplifier</b> (Boole, Karnaugh) pour obtenir une forme plus courte, avec moins de portes. L\'onglet Équations affiche les deux : <b>somme de produits</b> (ET puis OU) et <b>produit de sommes</b> (OU puis ET).</p><p>Pour A·B, la forme simplifiée est la même que la forme canonique : on ne peut pas faire plus court.</p>', do: 'Remplacez la porte ET par une porte <b>OU</b> (supprimez G1, placez un OU, recâblez-le avec A, B et S1). Relisez l\'onglet Équations : Σ passe à <b>Σ(1, 2, 3)</b>, Π à <b>Π(0)</b>, et la forme simplifiée devient A + B, bien plus courte que la forme canonique.', hint: 'Sélectionnez la porte G1 puis cliquez sur « Supprimer ». Posez ensuite une porte OU de la palette.', check: { label: 'S1 = A + B', run: c => c.eq('S1', 'A+B') && c.floating().length === 0 }, fail: 'S1 doit s\'allumer dès que A ou B vaut 1 : utilisez une porte OU.' }],
  questions: [
    { q: 'La ligne n° 2 d\'une table à deux entrées A, B correspond à…', type: 'choice', options: ['A = 0, B = 0', 'A = 0, B = 1', 'A = 1, B = 0', 'A = 1, B = 1'], correct: 2, help: 'Écrivez 2 en binaire sur deux chiffres.' },
    { q: 'Pour la fonction OU de A et B, la forme Σ est…', type: 'choice', options: ['Σ(3)', 'Σ(1, 2, 3)', 'Σ(0)', 'Σ(0, 1, 2, 3)'], correct: 1, help: 'Σ liste les numéros des lignes où S vaut 1. Pour un OU, S vaut 1 sauf quand A = B = 0.' },
    { q: 'Pour la fonction OU de A et B, la forme Π est…', type: 'choice', options: ['Π(0)', 'Π(1, 2, 3)', 'Π(3)', 'Π(0, 1, 2)'], correct: 0, help: 'Π liste les numéros des lignes où S vaut 0.' },
    { q: 'Écrivez le minterme de la ligne n° 1 (A = 0, B = 1).', type: 'expr', vars: ['A', 'B'], label: 'm1', target: '!A·B', help: 'Un NON sur la variable qui vaut 0.' }],
  build(c) { const L2 = NS.mk(c); L2.p('switch', 'A', 60, 90, { desc: 'Entrée A' }); L2.p('switch', 'B', 60, 200, { desc: 'Entrée B' }); L2.p('and', 'G1', 280, 140, { n: 2 }); L2.p('led', 'S1', 480, 140, { color: 'verte' }); },
  solve(c) { const L2 = NS.mk(c); c.byRef('G1').type = 'or'; L2.w('A', 'S', 'G1', 'E1'); L2.w('B', 'S', 'G1', 'E2'); L2.w('G1', 'S', 'S1', 'E'); },
  checks: [{ label: 'Aucune entrée en l\'air', run: c => c.floating().length === 0 }, { label: 'S1 = A + B', run: c => c.eq('S1', 'A+B') }],
  correction: '<p>ET : Σ(3) = A·B, Π(0, 1, 2). OU : Σ(1, 2, 3) = !A·B + A·!B + A·B, Π(0) = A + B, forme simplifiée A + B. Minterme de la ligne 1 : !A·B.</p>'
});
/* le TP associé : retrouver les formes canoniques à la main */
SC.push({
  id: 'canoniques', cat: '2 · Tables et équations', kind: 'TP', diff: 2, title: 'Formes canoniques d\'un schéma', level: 'Bac Pro CIEL (première)', duration: '45 min', variants: 3, dock: 'eq', td: 'td_canoniques', cours: [], steps: [],
  refs: 'Formes canoniques Σ et Π',
  desc: 'S1 est réalisé par le montage fourni (3 entrées A, B, C). Sans utiliser le simplificateur, donnez ses formes canoniques <b>Σ</b> et <b>Π</b> sous forme de listes de lignes, puis vérifiez avec l\'onglet Équations.',
  objectives: ['Écrire Σ(…) et Π(…) depuis une table', 'Écrire un minterme et un maxterme'],
  questions: [
    { q: 'Numéros des lignes où S1 = 1 (Σ), séparés par des virgules, ordre croissant.', type: 'text2', answer: c => NS.listTerms(c.tt('S1'), 1).join(',') },
    { q: 'Numéros des lignes où S1 = 0 (Π), séparés par des virgules.', type: 'text2', answer: c => NS.listTerms(c.tt('S1'), 0).join(',') },
    { q: 'Écrivez le minterme de la ligne 5 (A = 1, B = 0, C = 1).', type: 'expr', vars: ['A', 'B', 'C'], label: 'm5', target: 'A·!B·C' }],
  build(c, o) { NS.buildAst(c, { vars: ['A', 'B', 'C'], outputs: [{ name: 'S1', ast: NS.parse(['A·!B + B·C', '(A+B)·!C', '!A·B + A·C'][o.variant]) }] }, { fuse: false }); },
  solve(c) { ['A', 'B', 'C'].forEach(n => { c.byRef(n).p.on = false; }); const t = NS.circuitTable(c), r = t.rows.find(r => r.outs[0] === 1); ['A', 'B', 'C'].forEach((n, k) => { c.byRef(n).p.on = !!r.ins[k]; }); },
  checks: [{ label: 'Les interrupteurs sont sur une ligne où S1 = 1', run: c => c.val('S1', 'E') === 1 }],
  correction: '<p>Σ liste les lignes à 1, Π les lignes à 0 : à elles deux elles couvrent les 8 lignes. Minterme de la ligne 5 : A·!B·C.</p>'
});

/* ---- les TP : plus de cours, plus de pas à pas ; renvoi vers le TD le plus proche */
const LINK = { premier: 'td_premier', et_ou: 'td_et_ou', inverses: 'td_inverses', inconnue: 'td_inverses', lire: 'td_lire', suivre: 'td_lire', depannage: 'td_lire', equ_schema: 'td_equ_schema',
  demorgan: 'td_demorgan', tout_nand: 'td_demorgan', simplifier: 'td_demorgan', karnaugh3: 'td_karnaugh3', karnaugh4: 'td_karnaugh3', indifferents: 'td_karnaugh3',
  alarme: 'td_alarme', pompe: 'td_alarme', vote: 'td_alarme', va_et_vient: 'td_alarme', demi_add: 'td_alarme', add_complet: 'td_alarme', generateur: 'td_generateur', canoniques: 'td_canoniques', horloges: 'td_generateur', combinaisons: 'td_generateur', div2: 'td_div2', compteur: 'td_div2' };
SC.forEach(s => { if (s.kind === 'TD') return; s.kind = 'TP'; s.cours = []; s.steps = []; s.td = LINK[s.id]; });
/* les TD passent en tête dans l'ordre de la liste */
SC.sort((a, b) => (a.kind === 'TD' ? 0 : 1) - (b.kind === 'TD' ? 0 : 1));
})(typeof window !== 'undefined' ? window : globalThis);
