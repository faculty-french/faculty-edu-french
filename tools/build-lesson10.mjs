import fs from 'fs';

// ---- Question bank (all open-ended & vrai-faux; ids must match ^l10-(q\d+)$ or ^l10-(vf\d+)$) ----
const Q = [];
const q = (id, text, lines) => { Q.push({ id, type: 'open-ended', text, lines }); return { type: 'question', questionId: id }; };
const vf = (id, text, answer) => { Q.push({ id, type: 'vrai-faux', text, answer }); return { type: 'question', questionId: id }; };

// ---- block helpers ----
const heading = (text, level = 2) => ({ type: 'heading', text, level });
const para = (text) => ({ type: 'paragraph', text });
const consigne = (text) => ({ type: 'consigne', text });
const microtask = (number, text, duration) => duration ? ({ type: 'microtask', number, text, duration }) : ({ type: 'microtask', number, text });
const banner = (phase, title, duration) => ({ type: 'phase-banner', phase, title, duration });
const video = (videoUrl, caption) => ({ type: 'video', videoUrl, caption });

const pages = [];
const P = (id, phase, title, content) => pages.push({ id, phase, type: 'content', title, content });

// ===================== PHASE 0 : OBJECTIFS =====================
P('lesson10-p01', 0, 'LEÇON 10 : OBJECTIFS', [
  heading('Leçon 10 : Mohammed Salah : Le Pharaon du Football', 1),
  para("Objectif général : À la fin de la leçon « Mohammed Salah : Le Pharaon du Football », l'apprenant sera capable de comprendre un texte explicatif et de produire un écrit cohérent et structuré pour informer et convaincre."),
  para("À la fin de cette leçon, l'apprenant doit être capable de :"),
  {
    type: 'objectives',
    title: 'Objectifs de la leçon (01 - 11)',
    items: [
      { num: '01', text: "Formuler des hypothèses sur le thème du texte." },
      { num: '02', text: "Lier entre ses connaissances antérieures et les informations d'un texte lu." },
      { num: '03', text: "Résumer correctement un texte lu." },
      { num: '04', text: "Faire des inférences en établissant des liens entre les éléments d'un texte lu en justifiant son interprétation." },
      { num: '05', text: "Employer des mots adéquats à la situation." },
      { num: '06', text: "Donner des exemples, en tant que possible sur le sujet du texte." },
      { num: '07', text: "Exprimer ses goûts et ses préférences." },
      { num: '08', text: "Fonctionner convenablement les signes de ponctuation." },
      { num: '09', text: "Maîtriser les règles de l'orthographe (utiliser la majuscule au début de la phrase, nom propre)." },
      { num: '10', text: "Encourager la participation active des apprenants à travers des activités numériques interactives." },
      { num: '11', text: "Exploiter les supports numériques pour enrichir l'expérience d'apprentissage du FLE." }
    ]
  }
]);

// ===================== PHASE 1 : PRÉ-ACTION =====================
P('lesson10-p02', 1, 'LEÇON 10 : PHASE 1 — OBSERVATION', [
  banner(1, 'Pré-action (Activation des connaissances)', '20 min'),
  heading('Introduction et Motivation', 2),
  consigne("Observez l'image, puis prédisez le thème de la leçon."),
  q('l10-q0', "Observez l'image, puis prédisez le thème de la leçon.", 4)
]);

P('lesson10-p03', 1, 'LEÇON 10 : QUESTIONS PRÉLIMINAIRES', [
  consigne('Répondez aux questions suivantes :'),
  q('l10-q1', '1. Que voyez-vous dans ces images ?', 4),
  q('l10-q2', '2. Selon vous, quel est le thème de la leçon ?', 4)
]);

P('lesson10-p04', 1, 'LEÇON 10 : MICRO-TÂCHE 1 & LECTURE GUIDÉE', [
  microtask(1, "Identifiez l'idée générale du texte ?"),
  consigne('Selon les images ci-dessus, de quoi parle ce texte.'),
  q('l10-q3', 'Selon les images ci-dessus, de quoi parle ce texte.', 4),
  heading('Lecture guidée du texte (15 minutes)', 2),
  consigne('Lisez le texte en entier en silence ou à voix basse et comprendre le sens global. (10 minutes)')
]);

// ===================== PHASE 2 : ACTION (LECTURE) =====================
P('lesson10-p05', 2, 'LEÇON 10 : PHASE 2 — LECTURE (1/3)', [
  banner(2, 'Action (Compréhension approfondie)', '60 min'),
  consigne('Lisez le texte suivant, puis répondez aux questions'),
  heading('Mohammed Salah : Le Pharaon du Football (1/3)', 3),
  para("Mohamed Salah naît en 1992 dans un petit village appelé Nagrig, près de Basyoun. Enfant, il rêve de devenir footballeur comme ses idoles, Zinédine Zidane et Ronaldo. Chaque jour, il voyage des heures en bus pour s'entraîner au Caire avec son premier club, El Mokawloon, puis retourne à l'école l'après-midi. À 17 ans, il est le plus jeune joueur du championnat égyptien ! Ses parents sont fiers, mais sa mère refuse que son petit frère suive le même chemin : \"C'est trop difficile\", dit-elle.")
]);

P('lesson10-p06', 2, 'LEÇON 10 : LECTURE (2/3)', [
  heading('Mohammed Salah : Le Pharaon du Football (2/3)', 2),
  para("En 2012, Salah part en Suisse jouer pour le FC Bâle. Il marque dès son premier match ! Mais sa vraie gloire commence en Italie. Après un passage difficile à Chelsea, il rejoint l'AS Roma. Là, il devient une star : 19 buts en une saison ! Puis Liverpool le recrute en 2017. Et là, miracle : il bat des records ! 32 buts en une saison, un trophée de champion d'Angleterre, et une Ligue des champions gagnée en marquant un but en finale. Les fans de Liverpool l'adorent : un jour, il paye l'essence de tous les clients d'une station-service ! Un enfant court après sa voiture… et trébuche contre un lampadaire. Salah s'arrête, le console et prend une photo avec lui.")
]);

P('lesson10-p07', 2, 'LEÇON 10 : LECTURE (3/3)', [
  heading('Mohammed Salah : Le Pharaon du Football (3/3)', 2),
  para("Salah n'oublie jamais son pays. En Égypte, il est un vrai super-héros : il donne de l'argent pour construire des écoles, des hôpitaux, et même une usine de traitement des eaux dans son village. Chaque mois, 450 familles pauvres reçoivent son aide grâce à sa fondation. Quand il mène une campagne contre la drogue, les appels d'urgence augmentent de 400 % ! Un médecin raconte : \"Un jeune est venu à l'hôpital à 4 heures du matin, voulant arrêter la drogue… juste parce qu'il admire Salah ! En 2018, lors des élections présidentielles, des Égyptiens écrivent son nom sur leurs bulletins de vote alors qu'il n'est même pas candidat ! \"Il nous donne tant, c'est notre façon de le remercier\", explique un jeune."),
  para('https://www.bien-ecrire.com')
]);

// ===================== PHASE 2 : COMPRÉHENSION =====================
P('lesson10-p08', 2, 'LEÇON 10 : IDÉE PRINCIPALE & QUESTIONS GUIDÉES (1/2)', [
  microtask(2, "Quelle est l'idée principale de ce texte ?", '5 minutes'),
  q('l10-q4', "Quelle est l'idée principale de ce texte ?", 4),
  consigne('Répondez aux questions suivantes :'),
  q('l10-q5', '1. Qui est Mohamed Salah ?', 4),
  q('l10-q6', '2. Où est né Mohamed Salah ?', 4)
]);

P('lesson10-p09', 2, 'LEÇON 10 : QUESTIONS GUIDÉES (2/2)', [
  q('l10-q7', '3. Quel était le rêve de Mohamed Salah quand il était enfant ?', 4),
  q('l10-q8', '4. Quels efforts faisait-il pour réussir dans le football ?', 4),
  q('l10-q9', '5. Pourquoi Mohamed Salah est-il considéré comme un modèle pour les jeunes ?', 4)
]);

P('lesson10-p10', 2, 'LEÇON 10 : PRÉSENTATION DU TEXTE', [
  {
    type: 'info-box',
    title: 'Des informations supplémentaires',
    sections: [
      { heading: 'Présentation du texte explicatif - argumentatif:', items: [
        'Il explique un sujet ou un phénomène en donnant des informations claires.',
        'Il présente un point de vue et le justifie par des arguments.',
        'Il utilise des connecteurs logiques (en effet, mais, donc, cependant, de plus…).',
        'Il montre souvent des causes, des conséquences et des exemples.'
      ] },
      { heading: "Dans ce texte « Mohamed Salah », l'auteur :", items: [
        'Explique le parcours de Mohamed Salah depuis son enfance jusqu\'à la réussite,',
        'Montre que Salah est un modèle sportif et humain grâce à ses actions sociales.'
      ] }
    ]
  }
]);

P('lesson10-p11', 2, 'LEÇON 10 : MICRO-TÂCHES 3 & 4', [
  microtask(3, "Expliquez l'expression suivante selon le contexte : « un vrai super-héros »", '5 minutes'),
  q('l10-q10', "Expliquez l'expression suivante selon le contexte : « un vrai super-héros »", 4),
  microtask(4, "Donnez deux exemples d'actions positives faites par Mohamed Salah.", '5 minutes'),
  q('l10-q11', "Donnez deux exemples d'actions positives faites par Mohamed Salah.", 4)
]);

P('lesson10-p12', 2, 'LEÇON 10 : MICRO-TÂCHES 5 & 6', [
  microtask(5, "Pourquoi peut-on dire que Mohamed Salah est un modèle pour les jeunes ? Justifiez votre réponse à l'aide d'éléments du texte.", '5 minutes'),
  q('l10-q12', 'Pourquoi peut-on dire que Mohamed Salah est un modèle pour les jeunes ?', 4),
  microtask(6, "Imaginez que vous êtes un jeune qui admire Mohamed Salah. Proposez une action concrète que vous pourriez faire pour aider les autres de votre ville.", '5 minutes'),
  q('l10-q13', 'Proposez une action concrète que vous pourriez faire pour aider les autres de votre ville.', 4)
]);

P('lesson10-p13', 2, 'LEÇON 10 : MICRO-TÂCHE 7 — PONCTUATION', [
  microtask(7, 'Corriger la ponctuation ?', '5 minutes'),
  consigne('Corrigez les phrases suivantes'),
  para("1. Salah est un grand joueur il aide son pays<br>2. pourquoi les fans l'aiment<br>3. il dit je veux aider les pauvres"),
  q('l10-q14', 'Corrigez la ponctuation des phrases ci-dessus.', 5)
]);

P('lesson10-p14', 2, 'LEÇON 10 : MICRO-TÂCHE 8 — MAJUSCULES', [
  microtask(8, 'Corriger les majuscules ?', '5 minutes'),
  para('1. mohamed salah joue à liverpool.<br>2. il est né en egypte.<br>3. il joue contre chelsea et roma.'),
  q('l10-q15', 'Corrigez les majuscules des phrases ci-dessus.', 5)
]);

P('lesson10-p15', 2, 'LEÇON 10 : MICRO-TÂCHE 9 — VIDÉO', [
  microtask(9, "Regardez cette vidéo pour bien comprendre qu'est-ce que signifie le covoit :", '5 minutes'),
  video('https://www.youtube.com/embed/Gu1tz50AIMM', 'Micro-tâche 9'),
  consigne('Écrivez un court résumé de ce que vous avez compris de cette vidéo.'),
  q('l10-q16', 'Écrivez un court résumé de ce que vous avez compris de cette vidéo.', 5)
]);

P('lesson10-p16', 2, 'LEÇON 10 : MICRO-TÂCHE 10 — REFORMULATION', [
  microtask(10, 'Reformulez la phrase suivante.', '5 minutes'),
  consigne('Reformulez cette phrase en utilisant vos propres mots. « Salah n\'oublie jamais son pays »'),
  q('l10-q17', '« Salah n\'oublie jamais son pays »', 5)
]);

P('lesson10-p17', 2, 'LEÇON 10 : STRUCTURE À OBSERVER', [
  heading('Structure à observer :', 2),
  {
    type: 'info-box',
    title: 'Structure à observer',
    sections: [
      { heading: "Temps verbaux du texte : Le passé composé et l'imparfait.", items: [
        'Exemples :',
        '« Salah naît en 1992… »',
        '« Il rêvait de devenir footballeur. »'
      ] },
      { heading: "Structure de l'opposition : Sert à montrer une difficulté ou un contraste.", items: [
        'Mais',
        'Exemple du texte :',
        '« Mais sa vraie gloire commence en Italie. »',
        '« Mais sa mère refuse que son petit frère suive le même chemin. »'
      ] }
    ]
  }
]);

P('lesson10-p18', 2, 'LEÇON 10 : MINI-PRODUCTION', [
  microtask(11, 'Mini-production : Résumez ce texte lu en trois phrases ?', '10 minutes'),
  q('l10-q18', 'Résumez ce texte lu en trois phrases ?', 11)
]);

P('lesson10-p19', 2, 'LEÇON 10 : DISCUSSION EN GROUPES', [
  microtask(11, 'Discussion en groupes', '10 minutes'),
  consigne('Déroulement : Travaillez en petits groupes (3 à 4 étudiants). Discutez autour de la question suivante :'),
  para('« Quels défis Salah a-t-il dû surmonter pour devenir célèbre ? »'),
  consigne('Chaque groupe propose des solutions réelles liées à ce phénomène.'),
  q('l10-q19', 'Quels défis Salah a-t-il dû surmonter pour devenir célèbre ?', 7)
]);

// ===================== PHASE 3 : POST-ACTION =====================
P('lesson10-p20', 3, 'LEÇON 10 : PHASE 3 — TÂCHE FINALE', [
  banner(3, 'Post-action (Tâche finale)', '20 min'),
  heading('Tâche finale (avec modèle + aide lexicale)', 2),
  consigne('À travers la discussion précédente, rédigez un texte explicatif (8 à 10 lignes) sur Mohamed Salah ou sur un autre footballeur.'),
  para('Votre texte doit :<br>• Présenter qui est Mohamed Salah ou la personne que vous imaginez.<br>• Décrire les défis rencontrés et les efforts fournis pour réussir.<br>• Expliquer les actions concrètes pour aider les autres ou sa communauté.<br>• Utiliser des phrases claires et logiques, et un vocabulaire simple et précis.')
]);

P('lesson10-p21', 3, 'LEÇON 10 : RÉDACTION', [
  q('l10-q20', 'Rédigez ici votre texte explicatif (8 à 10 lignes).', 10)
]);

// ===================== PHASE 4 : ÉVALUATION =====================
P('lesson10-p22', 4, 'LEÇON 10 : PHASE 4 — ÉVALUATION', [
  banner(4, 'Évaluation des produits des étudiants', '10 min'),
  consigne('Relisez votre produit écrit et identifiez vos erreurs (vocabulaire, grammaire, orthographe, organisation des idées), comparez avec vos collèges et corrigez son texte si nécessaire.'),
  q('l10-q21', 'Relisez et corrigez votre texte.', 8),
  heading('É-évaluation', 2),
  consigne('Répondez aux questions suivantes :')
]);

P('lesson10-p23', 4, 'LEÇON 10 : É-ÉVALUATION (1/3)', [
  q('l10-q22', '1. Quel entraîneur à Chelsea ne lui a pas donné beaucoup de temps de jeu ?', 4),
  q('l10-q23', "2. Combien de buts Salah a-t-il marqué lors d'une saison à Liverpool ?", 4),
  q('l10-q24', '3. Citez deux actions concrètes que Mohamed Salah fait pour aider les autres de son pays.', 4)
]);

P('lesson10-p24', 4, 'LEÇON 10 : É-ÉVALUATION (2/3)', [
  q('l10-q25', '4. Que pouvons-nous apprendre de son attitude envers son pays et les autres ?', 4),
  q('l10-q26', "5. Selon vous, qu'est-ce qui a contribué le plus à sa réussite : le talent ou le travail dure ?", 4),
  q('l10-q27', "6. Qu'a fait Salah pour un enfant qui a trébuché contre un lampadaire ?", 4)
]);

P('lesson10-p25', 4, 'LEÇON 10 : É-ÉVALUATION (3/3) & VRAI/FAUX', [
  q('l10-q28', '7. Donnez un autre titre au texte ?', 4),
  heading('Mettez Vrai ou Faux devant chaque phrase :', 2),
  vf('l10-vf1', 'Salah a commencé sa carrière au Caire avec El Mokawloon.', 'vrai'),
  vf('l10-vf2', "À Chelsea, Salah était titulaire dans l'équipe.", 'faux')
]);

P('lesson10-p26', 4, 'LEÇON 10 : VRAI/FAUX & SOUMISSION', [
  vf('l10-vf3', "Il a marqué 19 buts en une saison avec l'AS Roma.", 'vrai'),
  vf('l10-vf4', 'Sa fondation aide 100 familles par mois.', 'faux'),
  vf('l10-vf5', "Salah a payé l'essence de tous les clients dans une station-service.", 'vrai'),
  heading('Soumission du devoir', 2),
  para('Vérifier ta repense correcte'),
  para('Vous êtes arrivé à la fin de la Leçon 10. Veuillez valider et envoyer vos réponses à votre enseignant en cliquant sur le bouton ci-dessous.'),
  { type: 'submit', lessonId: 'lesson10', lessonTitle: 'Mohammed Salah : Le Pharaon du Football' }
]);

// ---- assemble ----
const lesson = {
  id: 'lesson10',
  title: 'Mohammed Salah : Le Pharaon du Football',
  unitId: 'unit4',
  unitTitle: 'Module 4 : Le sport et la vie scolaire',
  pages,
  questions: Q
};

fs.writeFileSync('public/content/unit4/lesson10.json', JSON.stringify(lesson, null, 2) + '\n');
console.log('pages:', pages.length, '| questions:', Q.length);
console.log('question ids:', Q.map(x => x.id).join(', '));
