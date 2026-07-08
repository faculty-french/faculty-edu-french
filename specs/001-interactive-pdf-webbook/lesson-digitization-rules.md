# Guide d'Intégration et de Numérisation des Leçons

> ⚠️ **OBSOLÈTE (2026-07-08).** Ce document est remplacé par `lesson-factory-guide.md` (nouveau schéma JSON, structure de pages sans défilement, fichier unique par leçon — la règle de double synchronisation avec book.json est supprimée). Ne pas suivre les instructions ci-dessous.

Ce document sert de référence pour l'intégration des leçons futures (Leçons 2 à 12). Il s'appuie sur la structure validée et optimisée lors de la conception de la Leçon 1.

---

## 1. Structure de Page Standard d'une Leçon (15 Pages)

Chaque leçon doit être découpée en **15 pages** consécutives pour respecter le format d'édition et la lisibilité mobile/desktop :

1.  **Page de Garde & Objectifs I** (ex. Page 17) : Titre de la leçon, objectif général de la leçon, et objectifs spécifiques 01 à 06 (composant `objectives`).
2.  **Objectifs II & Phase 1** (ex. Page 18) : Objectifs spécifiques 07 à 11, et bandeau d'introduction de la Phase 1 (Pré-action).
3.  **Phase 1 : Motivation et Observation** (ex. Page 19) :
    *   Titre de la sous-section et consigne d'observation des images.
    *   Affichage des deux images d'illustration côte à côte (composant `images-row`).
    *   Question de prédiction (`open-ended`, ID type `l{N}-q0`).
4.  **Questions préliminaires & Préparation lecture** (ex. Page 20) :
    *   Questions préliminaires d'activation des connaissances (`l{N}-q1` et `l{N}-q2`).
    *   Bandeau de transition Phase 2 (Action) et instructions de lecture.
5.  **Passage de lecture (Texte complet)** (ex. Page 21) : Le texte de lecture complet verbatim avec son titre principal (composant `paragraph` ou `heading`).
6.  **Questions guidées** (ex. Page 22) : Questions de compréhension directe du texte (3 questions `open-ended`, ID type `l{N}-q3` à `l{N}-q5`).
7.  **Analyse des Mots-clés** (ex. Page 23) :
    *   Consigne et boîte de vocabulaire regroupant tous les mots-clés de la leçon (composant `objectives`).
    *   Saisie libre de définition (`open-ended`, ID type `l{N}-q6`).
8.  **Micro-tâches d'analyse textuelle** (ex. Page 24) :
    *   Micro-tâche 2 (Idée générale, `l{N}-q7`).
    *   Micro-tâche 3 (Connecteurs logiques, `l{N}-q8`).
    *   Micro-tâche 4 (Résumé par paragraphe, `l{N}-q9`).
9.  **Fiche théorique & Phrases difficiles** (ex. Page 25) :
    *   Box d'informations théoriques enrichissantes (ex. Caractéristiques du texte argumentatif/explicatif).
    *   Micro-tâche 5 (Phrases difficiles, `l{N}-q10`).
10. **Exercices d'application & Grammaire** (ex. Page 26) :
    *   Exercice Vrai/Faux (5 affirmations sous forme de boutons `vrai-faux`, ID type `l{N}-vf1` à `l{N}-vf5`).
    *   Micro-tâche 6 (Reformulation de phrase, `l{N}-q11`).
    *   Micro-tâche 7 (Mini-production écrite, `l{N}-q12`).
11. **Vidéo éducative** (ex. Page 27) :
    *   Composant `video` avec lecteur intégré.
    *   Question de résumé de la vidéo (`l{N}-q13`).
12. **Structures linguistiques & Discussion** (ex. Page 28) :
    *   Box de structures à observer (exemples du texte).
    *   Micro-tâche 9 (Discussion en groupe / Saisie libre, `l{N}-q14`).
13. **Phase 3 : Tâche finale d'écriture** (ex. Page 29) :
    *   Bandeau Phase 3 (Post-action).
    *   Sujet de rédaction d'article ou de publication (8 à 10 lignes, `l{N}-q15`).
14. **Phase 4 & Auto-évaluation Partie 1** (ex. Page 30) :
    *   Consigne d'évaluation par les pairs (`l{N}-q16`).
    *   Questions d'auto-évaluation 1 à 4 (`l{N}-e1` à `l{N}-e4`).
15. **Auto-évaluation Partie 2 & Soumission** (ex. Page 31) :
    *   Questions d'auto-évaluation 5 à 10 (`l{N}-e5` à `l{N}-e10`).
    *   Bouton final de validation et de soumission Telegram (composant `submit`).

---

## 2. Règles de Mise en Page (Anti-Split)

Pour éviter que des composants liés soient séparés sur deux pages différentes :
*   **Images d'observation** : Toujours utiliser le type `images-row` pour afficher les images d'observation côte à côte horizontalement plutôt que verticalement. Cela évite d'éjecter la consigne ou la zone de saisie sur la page suivante.
*   **Mots-clés** : Regrouper toutes les étiquettes de mots-clés dans un seul bloc d'objectifs sur la même page que la question de saisie associée.
*   **Boîtes et références** : Toute boîte informative (`Des informations enrichissantes`, `Structures à observer`) doit être placée en entier sur sa page avec la question d'application directe qui la suit.

---

## 3. Convention de Nommage des Questions

Les identifiants (`id`) des questions doivent être uniques et suivre ce schéma strict :
*   `l{N}-q0` : Prédiction sur les images (Phase 1).
*   `l{N}-q1` / `l{N}-q2` : Questions d'activation préliminaire.
*   `l{N}-q3` / `l{N}-q4` / `l{N}-q5` : Questions de compréhension guidée.
*   `l{N}-q6` : Définition des mots-clés.
*   `l{N}-q7` : Idée générale.
*   `l{N}-q8` : Connecteurs logiques.
*   `l{N}-q9` : Résumé de paragraphes.
*   `l{N}-q10` : Phrases difficiles.
*   `l{N}-vf1` à `l{N}-vf5` : Affirmations du Vrai/Faux (type `vrai-faux`).
*   `l{N}-q11` : Reformulation.
*   `l{N}-q12` : Mini-production.
*   `l{N}-q13` : Résumé vidéo.
*   `l{N}-q14` : Saisie de la discussion en groupe.
*   `l{N}-q15` : Rédaction de la tâche finale.
*   `l{N}-q16` : Évaluation formative des pairs.
*   `l{N}-e1` à `l{N}-e10` : Questions d'auto-évaluation finale (É-évaluation).

---

## 4. Règle de Double Synchronisation

Chaque fois qu'une leçon est intégrée ou modifiée :
1.  **Fichier global** : Mettre à jour `public/content/book.json` en y ajoutant les pages de la leçon et en déclarant les questions dans le tableau racine.
2.  **Fichier local** : Mettre à jour le fichier individuel correspondant (ex. `public/content/unit1/lesson1.json`) avec exactement la même structure.
3.  **Validation** : Valider la syntaxe JSON via la commande :
    ```bash
    node -e "JSON.parse(require('fs').readFileSync('public/content/book.json'))"
    ```
