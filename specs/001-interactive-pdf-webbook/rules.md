# Règles de développement pour la plateforme "Le livret de l'étudiant"

Ces règles ont été établies suite aux phases initiales de développement et d'optimisation visuelle et d'interaction. Elles doivent être respectées de manière stricte lors de l'intégration de toute leçon ou tout module futur.

---

## 1. Règle d'intégration du contenu (Verbatim strict)
*   **Aucun résumé ni omission** : Tout texte fourni par l'utilisateur pour être intégré dans le livre doit être copié **à 100% mot pour mot, dans le même ordre exact**, sans abréger, simplifier ou supprimer la moindre phrase, mot ou lettre.
*   **Préservation orthographique** : Si un mot comporte une graphie particulière dans le document de l'utilisateur (par exemple, "élargير"), il doit être conservé tel quel sauf demande contraire explicite.

## 2. Règle linguistique (French-only strict)
*   **Aucun mot anglais ou arabe** sur l'interface visible par l'étudiant (par exemple, les boutons de navigation doivent être `‹ Précédent` et `Suivant ›` au lieu de l'arabe ou de l'anglais).
*   Tout terme anglais résiduel trouvé dans le texte fourni par l'utilisateur (ex. `with`, `is`, `by`) doit être traduit en français (`avec`, `est`, `par`) pour maintenir la cohérence de la langue d'apprentissage.

## 3. Règle des clics et de la sélection de texte
*   **Aucun flip par clic central** : La propriété `disableFlipByClick={true}` doit rester activée sur `<HTMLFlipBook>`.
*   Cela permet aux utilisateurs de sélectionner du texte, copier des mots, et cliquer sur des choix de questions ou des zones de saisie sans déclencher accidentellement un changement de page.

## 4. Règle du défilement tactile sur mobile
*   **Aucun geste de flip sur mobile** : La propriété `useMouseEvents={!isMobile}` doit être utilisée.
*   Sur mobile (largeur d'écran < 768px), le balayage tactile (swipe) pour tourner la page est désactivé pour éviter les conflits avec le défilement vertical natif du navigateur lorsque le contenu dépasse de l'écran.
*   Le changement de page sur mobile se fait uniquement via les boutons de navigation `‹ Précédent` et `Suivant ›` dans le footer.

## 5. Règle d'interprétation HTML
*   **Rendu des balises HTML** : Tous les blocs textuels (`heading`, `paragraph`, `quote`, `instruction`, `objectives`) doivent utiliser la propriété React `dangerouslySetInnerHTML={{ __html: text }}`.
*   Cela garantit que les balises HTML de mise en forme (comme `<strong>` pour le gras, `<em>` pour l'italique, `<br />`, etc.) sont interprétées et affichées correctement par le navigateur au lieu d'apparaître en texte brut.

## 6. Règle de salutation personnalisée dynamique
*   Tout bloc de texte contenant la clé `{name}` doit être remplacé dynamiquement par le prénom de l'étudiant stocké dans `localStorage` sous la clé `book_student_profile` (géré par la fonction `formatText` dans `PageContent.jsx`).

## 7. Règle de la pliure centrale (Shadow)
*   Chaque page doit comporter un dégradé d'ombre subtil sur son bord intérieur pour simuler le pli central du livre (`.page--left::before` et `.page--right::before`).

## 8. Règle de parité des numéros de page
*   Les numéros de page doivent alterner : à gauche pour les pages gauches (paires) et à droite pour les pages droites (impaires) via les classes `.page__number--left` et `.page__number--right`.

## 9. Règle de numérisation des leçons (Leçons 2 à 12)
*   Toute nouvelle leçon doit respecter strictement le guide de structure et de mise en page décrit dans [lesson-digitization-rules.md](file:///home/george/Desktop/book-onlin/specs/001-interactive-pdf-webbook/lesson-digitization-rules.md) pour assurer l'anti-split d'exercices et le nommage cohérent des questions.
