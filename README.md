# LogicLab — simulateur de circuits logiques (Bac Pro CIEL)

Simulateur **hors ligne** (HTML/CSS/JS pur, aucune dépendance) : éditeur de schémas à **symboles européens (CEI 60617-12)**, simulation en direct des niveaux 0 / 1 derrière chaque porte, tables de vérité, tableaux de Karnaugh, chronogrammes et TP corrigés automatiquement. Même présentation qu'ElectroLab.

## Lancer
- Ouvrir `dist/logiclab.html` (fichier unique autonome) **ou** `index.html` (sources).
- Menu **TP ▾** → choisir un TP ; **Mode enseignant** (code PIN) affiche les corrections ; **? Aide** affiche les symboles et la matrice de couverture du référentiel.

## Contenu
| Domaine | Détail |
|---|---|
| Moteur | Logique à trois états (0, 1, ? pour entrée en l'air ou conflit de sorties), portes idéales, bascule D sur front montant, simulation temporelle à pas adaptatif |
| Portes | NON, tampon, ET, OU, NON-ET, NON-OU, OU exclusif, NON-OU exclusif (2 à 8 entrées) ; boîte noire à fonction cachée |
| Entrées | Interrupteur, bouton poussoir, niveaux 0/1 fixes, **horloge** (fréquence, rapport cyclique, retard), **séquence binaire** programmable, **générateur de combinaisons** (compteur 2 à 4 bits) |
| Sorties | LED, sonde logique, afficheur 7 segments, actionneur (moteur, pompe, lampe, sirène, électrovanne) |
| Lecture en direct | Fils vert épais (1), gris (0), orange pointillé (?), pastilles 0/1 sur chaque broche, table de la porte sélectionnée |
| Onglets | Chronogramme (curseurs A/B, fenêtre, gel) · Table de vérité en direct · Équations (lue sur le schéma, formes canoniques, forme simplifiée) · Karnaugh (remplissage, groupements corrigés) · Concepteur (table → équation → schéma en ET/OU, NON-ET, OU/ET, NON-OU) |

## TD et TP
Deux types de séances :
- **TD** (travaux dirigés) : déroulé **guidé en étapes**. Chaque étape explique la notion (« À comprendre »), donne la consigne (« À faire »), un coup de pouce, et se **valide** seule. Questions avec aide.
- **TP** (travaux pratiques) : cahier des charges seul, **sans cours ni pas à pas**, validation automatique du montage et des réponses. Chaque TP renvoie vers le TD correspondant.

**TD (12)** : `td_premier`, `td_et_ou`, `td_inverses`, `td_lire`, `td_equ_schema`, `td_canoniques` (Σ, Π, mintermes, maxtermes), `td_demorgan`, `td_karnaugh3`, `td_alarme`, `td_generateur`, `td_div2`, `td_portail` (problème complet à 2 sorties)

**TP (30, avec variantes)**
1 · Portes logiques : `premier`, `et_ou`, `inverses`, `inconnue`
2 · Tables et équations : `lire`, `canoniques`, `equ_schema`, `suivre`, `depannage`
3 · Boole et Karnaugh : `demorgan`, `tout_nand`, `simplifier`, `karnaugh3`, `karnaugh4`, `indifferents`
4 · Conception : `alarme`, `pompe`, `vote`, `va_et_vient`, `demi_add`, `add_complet`
5 · Signaux et bascules : `generateur`, `horloges`, `combinaisons`, `div2`, `compteur`
6 · Problèmes à résoudre (on décrit les sorties voulues, l'élève conçoit les circuits) : `portail`, `cafe`, `monte_charge`, `comparateur`

Chaque séance : sujet, objectifs, questions (table à remplir, équation à saisir, QCM, valeurs), critères vérifiés automatiquement sur le schéma, correction avec bouton « Appliquer la solution ».

## Développement
```
npm run build   # assemble dist/logiclab.html
npm test        # moteur logique, simulation, synthèse, et chaque TP (solution + critères + réponses)
```
Sources : `js/logic.js` (expressions, Quine-McCluskey, Karnaugh), `js/engine.js` (simulation), `js/synth.js` (synthèse de schémas), `js/scenarios.js` (cadre des TP), `js/tp_*.js` (TP), `js/td.js` (TD), `js/cours.js` (apports de cours).

## Référentiel
La matrice de couverture (menu **? Aide**) est **à valider** : elle a été établie de mémoire et doit être confrontée au référentiel officiel du Bac Pro CIEL.

## Licence
© 2026 Yahn LE PRETTRE - Formaxion Landes — [EUPL 1.2](LICENSE).
