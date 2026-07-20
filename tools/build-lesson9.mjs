import fs from 'fs';

// ---- Question bank (all open-ended; ids must match ^l9-(q\d+)$) ----
const Q = [];
const q = (id, text, lines) => { Q.push({ id, type: 'open-ended', text, lines }); return { type: 'question', questionId: id }; };

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
P('lesson9-p01', 0, 'LEÇON 9 : OBJECTIFS', [
  heading('Leçon 9 : Le pot de lait de Gita', 1),
  para("Objectif général : À la fin de la leçon « Le pot de lait de Gita », l'apprenant sera capable de comprendre et de produire un texte écrit cohérent et structuré pour informer et convaincre."),
  para("À la fin de cette leçon, l'apprenant doit être capable de :"),
  {
    type: 'objectives',
    title: 'Objectifs de la leçon (01 - 12)',
    items: [
      { num: '01', text: "Faire ressortir les mots clés d'un texte lu." },
      { num: '02', text: "Déterminer le genre d'un texte lu." },
      { num: '03', text: "Dégager le sens implicite existant entre les lignes." },
      { num: '04', text: "Suivre l'enchaînement chronologique des événements d'un texte lu." },
      { num: '05', text: "Réorganiser les informations d'un texte d'une manière personnelle." },
      { num: '06', text: "Analyser l'organisation d'un texte lu et interpréter son sens en s'appuyant sur des indices." },
      { num: '07', text: "Choisir des mots clairs et simples." },
      { num: '08', text: "Conjuguer correctement des verbes dans le temps convenable." },
      { num: '09', text: "Employer le temps convenable d'après le type du texte." },
      { num: '10', text: "Enchaîner logiquement les idées." },
      { num: '11', text: "Intégrer des moments d'échange et d'interaction afin de rendre l'apprentissage plus plaisant." },
      { num: '12', text: "Intégrer le livre numérique interactif pour rendre l'apprentissage du français plus motivant et plus plaisant." }
    ]
  }
]);

// ===================== PHASE 1 : PRÉ-ACTION =====================
P('lesson9-p02', 1, 'LEÇON 9 : PHASE 1 — OBSERVATION', [
  banner(1, 'Pré-action (Activation des connaissances)', '20 min'),
  heading('Introduction et Motivation', 2),
  { type: 'images-row', images: [
    { imageUrl: 'images/lessons/lesson9-a.png', caption: 'Image 1' },
    { imageUrl: 'images/lessons/lesson9-b.png', caption: 'Image 2' }
  ] },
  q('l9-q0', "Observez l'image, puis prédisez le thème de la leçon.", 4)
]);

P('lesson9-p03', 1, 'LEÇON 9 : QUESTIONS PRÉLIMINAIRES', [
  consigne('Répondez aux questions suivantes :'),
  q('l9-q1', '1. Qui sont ces personnages ?', 4),
  q('l9-q2', '2. Où vivent-ils ?', 4),
  microtask(1, 'Que fait-elle ?'),
  q('l9-q3', 'Que fait-elle ?', 4)
]);

P('lesson9-p04', 1, 'LEÇON 9 : MICRO-TÂCHE 2 & LECTURE GUIDÉE', [
  microtask(2, 'Quels problèmes pourrait-elle rencontrer ?'),
  q('l9-q4', 'Quels problèmes pourrait-elle rencontrer ?', 5),
  heading('Lecture guidée du texte (15 minutes)', 2),
  consigne('Lisez le texte en entier en silence ou à voix basse et comprenez le sens global. (10 minutes)')
]);

// ===================== PHASE 2 : ACTION (LECTURE) =====================
P('lesson9-p05', 2, 'LEÇON 9 : PHASE 2 — LECTURE (1/3)', [
  banner(2, 'Action (Compréhension approfondie)', '60 min'),
  consigne('Lisez le texte suivant, puis répondez aux questions.'),
  heading('Le pot de lait de Gita (1/3)', 3),
  para("Il était une fois une jeune fille nommée Gita, qui vivait avec sa grand-mère dans une petite maison de campagne. Tous les matins, elle trayait les vaches et portait un grand pot de lait au marché du village. Elle aimait marcher le long du chemin, entourée des oiseaux et des fleurs. Ce jour-là, le soleil brillait fort et Gita était de bonne humeur. Sa grand-mère lui dit avant de partir : « Sois prudente, ma fille, et pense à bien tenir ton pot de lait. » Gita hocha la tête, mais, à peine sortie, elle se mit à rêver. Elle pensait à tout ce qu'elle pourrait acheter avec l'argent qu'elle gagnerait")
]);

P('lesson9-p06', 2, 'LEÇON 9 : LECTURE (2/3)', [
  heading('Le pot de lait de Gita (2/3)', 2),
  para("En marchant, Gita imagina une vie magnifique. « Avec l'argent du lait, je vais acheter une poule. Cette poule pondra des œufs. Je vendrai les œufs et j'aurai assez pour acheter une vache. Avec le lait de cette vache, j'aurai encore plus d'argent. Je pourrai acheter une belle robe bleue et aller à la fête du village. Qui sait ? Peut-être qu'un prince me remarquera ! Gita riait en pensant à tout cela. Mais, toute à ses rêves, elle oubliait son pot. Elle leva la tête fièrement, fit un grand pas... et ploc ! le pot tomba par terre. Le lait se renversa, coula sur la route, et tous ses beaux rêves disparurent d'un seul coup.")
]);

P('lesson9-p07', 2, 'LEÇON 9 : LECTURE (3/3)', [
  heading('Le pot de lait de Gita (3/3)', 2),
  para("Gita resta là, sans bouger, le cœur serré. Elle pensa à sa grand-mère et sentit la honte la gagner. Elle avait perdu le lait, l'argent et la confiance de sa famille. Quand elle rentra à la maison, sa grand-mère l'écouta sans colère et dit doucement : « Tu vois, ma petite, il faut d'abord travailler avant de rêver. Les beaux projets naissent de la patience. » Gita essuya ses larmes et promit de ne plus rêver sans effort. Le lendemain, elle retourna au marché, plus prudente, un nouveau pot sur la tête et un vrai sourire sur les lèvres : cette fois, elle savait que le courage et la patience valent mieux que les rêves sans travail."),
  para('https://www.bien-ecrire.com')
]);

// ===================== PHASE 2 : COMPRÉHENSION =====================
P('lesson9-p08', 2, 'LEÇON 9 : IDÉE GÉNÉRALE & QUESTIONS GUIDÉES (1/3)', [
  microtask(3, "Identifiez l'idée générale de l'histoire ?", '5 minutes'),
  consigne("Quelle est l'idée générale de cette histoire."),
  q('l9-q5', "Quelle est l'idée générale de cette histoire.", 4),
  consigne('Répondez aux questions suivantes :'),
  q('l9-q6', '1. Qui sont les personnages principaux ?', 4),
  q('l9-q7', '2. Où vivent-ils ?', 4)
]);

P('lesson9-p09', 2, 'LEÇON 9 : QUESTIONS GUIDÉES (2/3)', [
  q('l9-q8', '3. Que fait Gita chaque matin ?', 4),
  q('l9-q9', '4. Que rêvait Gita en allant au marché ?', 4),
  q('l9-q10', "5. Quel problème rencontre-t-elle à cause de ses rêves ?", 4)
]);

P('lesson9-p10', 2, 'LEÇON 9 : QUESTIONS GUIDÉES (3/3) & PRÉSENTATION', [
  q('l9-q11', '6. Quelle leçon Gita apprend-elle à la fin ?', 4),
  {
    type: 'info-box',
    title: 'Des informations supplémentaires',
    sections: [
      { heading: 'Présentation du texte.', items: [
        "Ce texte est un texte narratif. Il raconte une histoire pour expliquer une leçon de vie importante : la valeur du travail, de la patience et de la prudence."
      ] },
      { heading: 'Caractéristiques principales du texte narratif :', items: [
        "Il présente des informations claires et précises à travers une histoire.",
        "Il utilise des connecteurs logiques pour organiser les idées : tout d'abord, ensuite, enfin, mais d'un autre côté.",
        "Il montre les causes et les conséquences des actions de Gita : rêver sans agir conduit à des erreurs, tandis que le travail et la prudence mènent à la réussite."
      ] },
      { heading: 'Dans ce texte, le narrateur :', items: [
        "Décrit la vie quotidienne de Gita et sa relation avec sa grand-mère.",
        "Montre les conséquences de l'inattention et du rêve sans effort.",
        "Donne une leçon morale sur l'importance du travail, de la patience et du courage."
      ] }
    ]
  }
]);

P('lesson9-p11', 2, 'LEÇON 9 : MICRO-TÂCHES 4 À 6', [
  microtask(4, "Faire ressortir les mots clés de l'histoire ?", '5 minutes'),
  q('l9-q12', "Faire ressortir les mots clés de l'histoire ?", 4),
  microtask(5, 'Identifiez le genre de cette histoire.', '5 minutes'),
  q('l9-q13', 'Identifiez le genre de cette histoire.', 4),
  microtask(6, 'Quel est le moral de cette histoire ?', '5 minutes'),
  q('l9-q14', 'Quel est le moral de cette histoire ?', 4)
]);

P('lesson9-p12', 2, 'LEÇON 9 : MICRO-TÂCHES 7 & 8', [
  microtask(7, "Conjuguez à l'imparfait ?", '5 minutes'),
  para('1. Gita (marcher) le long du chemin.<br>2. Elle (rêver) d\'une vie magnifique.<br>3. Le soleil (briller) fort.'),
  q('l9-q15', "Conjuguez ces verbes à l'imparfait.", 4),
  microtask(8, "Arrangez ces phrases dans un ordre logique d'après l'histoire :", '5 minutes'),
  para('• Elle retourna au marché avec prudence.<br>• Gita renverse le pot de lait.<br>• Gita trayait les vaches chaque matin.'),
  q('l9-q16', "Arrangez ces phrases dans un ordre logique.", 4)
]);

P('lesson9-p13', 2, 'LEÇON 9 : MICRO-TÂCHE 9 & STRUCTURE À OBSERVER (1/2)', [
  microtask(9, 'Reformulez la phrase suivante ?', '5 minutes'),
  consigne('Reformulez cette phrase en utilisant vos propres mots.'),
  q('l9-q17', '« Les beaux projets naissent de la patience. »', 4),
  heading('Structure à observer :', 2),
  {
    type: 'info-box',
    title: 'Structure à observer',
    sections: [
      { heading: 'Structure de la cause : Sert à justifier une idée ou une conséquence.', items: [
        "Exemple : « Elle avait perdu le lait, l'argent et la confiance de sa famille parce qu'elle rêvait sans faire attention. »"
      ] }
    ]
  }
]);

P('lesson9-p14', 2, 'LEÇON 9 : STRUCTURE À OBSERVER (2/2)', [
  {
    type: 'info-box',
    title: 'Structure à observer (suite)',
    sections: [
      { heading: "Structure de la conséquence : Sert à montrer l'effet d'une action ou d'une situation.", items: [
        "Exemple : « Le pot tomba par terre. Le lait se renversa, et tous ses beaux rêves disparurent d'un seul coup. »"
      ] },
      { heading: "Structure de l'opposition / contraste : Sert à présenter deux points de vue ou des situations différentes pour nuancer.", items: [
        "Exemple : « Mais d'un autre côté, même avoir un travail que l'on n'aime pas peut être formate"
      ] },
      { heading: 'Imparfait : Sert à décrire la situation, les sentiments ou les actions répétitives.', items: [
        'Exemples :',
        "« Tous les matins, elle trayait les vaches… »",
        "« Elle pensait à tout ce qu'elle pourrait acheter avec l'argent… »",
        "« Gita était de bonne humeur. »"
      ] }
    ]
  }
]);

P('lesson9-p15', 2, 'LEÇON 9 : MICRO-TÂCHE 10 — VIDÉO', [
  microtask(10, "Regardez cette vidéo pour bien comprendre qu'est-ce que signifie le covoit :", '5 minutes'),
  video('https://www.youtube.com/embed/zNYr_vH5UIY', 'Micro-tâche 10'),
  consigne('Écrivez un court résumé de ce que vous avez compris de cette vidéo.'),
  q('l9-q18', 'Écrivez un court résumé de ce que vous avez compris de cette vidéo.', 5)
]);

P('lesson9-p16', 2, 'LEÇON 9 : MINI-PRODUCTION', [
  microtask(11, "Mini-production : Résumez l'histoire lu en trois phrases ?", '10 minutes'),
  q('l9-q19', "Résumez l'histoire lu en trois phrases ?", 11)
]);

P('lesson9-p17', 2, 'LEÇON 9 : DISCUSSION EN GROUPES', [
  microtask(12, 'Discussion en groupes', '10 minutes'),
  consigne('Déroulement : Travaillez en petits groupes (3 à 4 étudiants). Discutez autour de la question suivante :'),
  para('« Que feriez-vous à la place de Gita? »'),
  consigne('Chaque groupe propose des solutions réelles liées à ce phénomène.'),
  q('l9-q20', 'Que feriez-vous à la place de Gita ?', 7)
]);

// ===================== PHASE 3 : POST-ACTION =====================
P('lesson9-p18', 3, 'LEÇON 9 : PHASE 3 — TÂCHE FINALE', [
  banner(3, 'Post-action (Tâche finale)', '20 min'),
  heading('Tâche finale (avec modèle + aide lexicale)', 2),
  consigne("À travers la discussion précédente. Racontez une expérience personnelle qui vous est rencontré et expliquez ce que vous en avez appris. »"),
  q('l9-q21', 'Racontez votre expérience personnelle.', 10)
]);

// ===================== PHASE 4 : ÉVALUATION =====================
P('lesson9-p19', 4, 'LEÇON 9 : PHASE 4 — ÉVALUATION', [
  banner(4, 'Évaluation des produits des étudiants', '10 min'),
  consigne("Relisez votre produit écrit et identifiez vos erreurs (vocabulaire, grammaire, orthographe, organisation des idées), comparez avec vos collèges et corrigez son texte si nécessaire."),
  q('l9-q22', 'Relisez et corrigez votre texte.', 9),
  heading('É-évaluation', 2),
  consigne('Répondez aux questions suivantes :')
]);

P('lesson9-p20', 4, 'LEÇON 9 : É-ÉVALUATION (1/3)', [
  q('l9-q23', 'Pourquoi Gita a-t-elle fait tomber le pot de lait ?', 4),
  q('l9-q24', 'Comment se sent-elle après avoir perdu le lait ?', 4),
  q('l9-q25', "Que lui dit sa grand-mère après l'accident ?", 4)
]);

P('lesson9-p21', 4, 'LEÇON 9 : É-ÉVALUATION (2/3)', [
  q('l9-q26', "Qu'est-ce que Gita apprend de cette expérience ?", 4),
  q('l9-q27', 'Comment Gita agit-elle le lendemain ?', 4),
  q('l9-q28', "Quel est le thème principal de l'histoire ?", 4)
]);

P('lesson9-p22', 4, 'LEÇON 9 : É-ÉVALUATION (3/3) & SOUMISSION', [
  q('l9-q29', 'Donnez un autre titre possible pour cette histoire.', 5),
  heading('Soumission du devoir', 2),
  para('Vérifier ta repense correcte'),
  para('Vous êtes arrivé à la fin de la Leçon 9. Veuillez valider et envoyer vos réponses à votre enseignant en cliquant sur le bouton ci-dessous.'),
  { type: 'submit', lessonId: 'lesson9', lessonTitle: 'Le pot de lait de Gita' }
]);

// ---- assemble ----
const lesson = {
  id: 'lesson9',
  title: 'Le pot de lait de Gita',
  unitId: 'unit3',
  unitTitle: 'Module 3 : Le travail et la vie sociale',
  pages,
  questions: Q
};

fs.writeFileSync('public/content/unit3/lesson9.json', JSON.stringify(lesson, null, 2) + '\n');
console.log('pages:', pages.length, '| questions:', Q.length);
console.log('question ids:', Q.map(x => x.id).join(', '));
