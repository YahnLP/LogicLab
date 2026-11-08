/* coverage.js — matrice de couverture indicative du référentiel Bac Pro CIEL (logique combinatoire et séquentielle) */
(function (g) {
'use strict';
const NS = g.NS;
NS.COVERAGE = {
  note: 'À valider : cette correspondance a été établie de mémoire à partir de la connaissance générale du programme de logique du Bac Pro CIEL. Elle doit être confrontée au référentiel officiel avant tout usage officiel.',
  items: [
    ['Numération', 'Niveaux logiques 0 / 1, combinaisons binaires', 'ok', 'Premier circuit, Générateur'],
    ['Portes', 'NON, ET, OU, NON-ET, NON-OU, OU exclusif (symboles CEI)', 'ok', 'Premier circuit, ET contre OU, Inverses'],
    ['Portes', 'Identification d\'une fonction inconnue', 'ok', 'Porte inconnue'],
    ['Tables de vérité', 'Établir et lire une table (2 à 4 entrées)', 'ok', 'Lire un schéma, Que se passe-t-il…'],
    ['Équations', 'Lire une équation sur un schéma, dessiner un schéma', 'ok', 'Lire un schéma, Dessiner le schéma'],
    ['Équations', 'Formes canoniques (somme de produits / produit de sommes)', 'ok', 'Onglet Équations'],
    ['Algèbre de Boole', 'Règles, De Morgan, simplification algébrique', 'ok', 'De Morgan, Simplifier un schéma'],
    ['Portes universelles', 'Réalisation avec des NON-ET seuls', 'ok', 'Tout avec des NON-ET'],
    ['Karnaugh', '2 à 4 variables, groupements, états indifférents', 'ok', 'Karnaugh 3 et 4 variables, États indifférents'],
    ['Conception', 'Cahier des charges → table → équation → schéma', 'ok', 'Alarme, Pompe, Vote, Va-et-vient'],
    ['Arithmétique', 'Demi-additionneur et additionneur complet', 'ok', 'Demi-additionneur, Additionneur complet'],
    ['Dépannage', 'Localiser une porte défectueuse', 'ok', 'Dépannage'],
    ['Signaux', 'Période, fréquence, rapport cyclique, chronogramme', 'ok', 'Générateur, Deux horloges'],
    ['Séquentiel', 'Bascule D, diviseur de fréquence, compteur asynchrone', 'ok', 'Diviseur par 2, Compteur 2 bits'],
    ['Séquentiel', 'Bascules RS, JK, registres à décalage, compteurs synchrones', 'no', 'Non simulé (une RS se construit avec deux NON-OU)'],
    ['Systèmes', 'Interface avec un microcontrôleur, logique câblée / programmée', 'no', 'Hors périmètre de ce simulateur']
  ],
  limits: [
    'Tableau de Karnaugh limité à 4 variables ; table de vérité limitée à 6 entrées.',
    'Portes idéales : pas de temps de propagation, pas d\'aléas (« glitchs ») ni de niveaux électriques réels.',
    'Une seule bascule : la bascule D sur front montant (état initial Q = 0 à la mise sous tension).',
    'Les rebouclages sans bascule (verrou RS à portes) sont simulés mais peuvent donner un état « ? » au démarrage.',
    'Les TP corrigés automatiquement vérifient le comportement logique du schéma, pas son esthétique.'
  ]
};
})(typeof window !== 'undefined' ? window : globalThis);
