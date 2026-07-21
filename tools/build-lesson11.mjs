import fs from 'fs';
import { enforceSectionFlow } from "./lib/section-flow.mjs";


// ---- Question bank (all open-ended & vrai-faux; ids must match ^l11-(q\d+)$ or ^l11-(vf\d+)$) ----
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
P('lesson11-p01', 0, 'LEÇON 11 : OBJECTIFS', [
  heading("Leçon 11 : L'intelligence artificielle à l'école : un nouvel outil pédagogique", 1),
  para("Objectif général : À la fin de la leçon « L'intelligence artificielle à l'école : un nouvel outil pédagogique », l'apprenant sera capable de comprendre et de produire un texte écrit cohérent et structuré pour informer et convaincre."),
  para("À la fin de cette leçon, l'apprenant doit être capable de :"),
  {
    type: 'objectives',
    title: 'Objectifs de la leçon (01 - 11)',
    items: [
      { num: '01', text: "Comprendre l'idée générale d'un texte lu." },
      { num: '02', text: "Donner le synonyme d'un mot cité dans un texte lu." },
      { num: '03', text: "Dégager le sens implicite existant entre les lignes." },
      { num: '04', text: "Analyser l'organisation d'un texte lu et interpréter son sens en s'appuyant sur des indices." },
      { num: '05', text: "Choisir des mots clairs et simples." },
      { num: '06', text: "Argumenter son point de vue." },
      { num: '07', text: "Présenter des idées exprimant correctement le contenu d'un sujet." },
      { num: '08', text: "Mettre en lien des connaissances antérieures au sujet visé." },
      { num: '09', text: "Fonctionner la mise en page du texte." },
      { num: '10', text: "Renforcer le plaisir d'apprendre le français chez les apprenants." },
      { num: '11', text: "Développer le sentiment de satisfaction lié au progrès dans l'apprentissage du FLE." }
    ]
  }
]);

// ===================== PHASE 1 : PRÉ-ACTION =====================
P('lesson11-p02', 1, 'LEÇON 11 : PHASE 1 — OBSERVATION', [
  banner(1, 'Pré-action (Activation des connaissances)', '20 min'),
  heading('Introduction et Motivation', 2),
  consigne("Observez l'image, puis prédisez le thème de la leçon."),
  q('l11-q0', "Observez l'image, puis prédisez le thème de la leçon.", 4)
]);

P('lesson11-p03', 1, 'LEÇON 11 : QUESTIONS PRÉLIMINAIRES', [
  consigne('Répondez aux questions suivantes :'),
  q('l11-q1', '1. Que voyez-vous dans ces images ?', 4),
  q('l11-q2', '2. Selon vous, quel est le thème de la leçon ?', 4)
]);

P('lesson11-p04', 1, 'LEÇON 11 : MICRO-TÂCHE 1 & LECTURE GUIDÉE', [
  microtask(1, "Identifiez l'idée générale du texte ?"),
  consigne('Selon les images ci-dessus, de quoi parle ce texte.'),
  q('l11-q3', 'Selon les images ci-dessus, de quoi parle ce texte.', 4),
  heading('Lecture guidée du texte (15 minutes)', 2),
  consigne('Lisez le texte en entier en silence ou à voix basse et comprenez le sens global. (10 minutes)')
]);

// ===================== PHASE 2 : ACTION (LECTURE) =====================
P('lesson11-p05', 2, 'LEÇON 11 : PHASE 2 — LECTURE (1/3)', [
  banner(2, 'Action (Compréhension approfondie)', '60 min'),
  consigne('Lisez le texte suivant, puis répondez aux questions.'),
  heading("L'intelligence artificielle à l'école : un nouvel outil pédagogique (1/3)", 3),
  para("L'intelligence artificielle (IA) fait son entrée dans les salles de classe. Pour les enseignants, cette technologie représente un soutien précieux. Elle peut générer des exercices, proposer des idées pour les cours ou aider à analyser les difficultés des élèves. Cela libère du temps pour l'enseignant, qui peut alors se concentrer sur l'accompagnement individuel. De plus, l'IA permet de personnaliser les apprentissages. Elle peut adapter le contenu et le rythme des activités en fonction des besoins spécifiques de chaque élève, offrant un parcours éducatif plus flexible.")
]);

P('lesson11-p06', 2, 'LEÇON 11 : LECTURE (2/3)', [
  heading("L'intelligence artificielle à l'école : un nouvel outil pédagogique (2/3)", 2),
  para("Cependant, cette innovation présente aussi des inconvénients majeurs. Le premier risque est que l'IA rende les élèves passifs. Si les outils donnent des réponses trop rapidement, les élèves pourraient cesser de réfléchir par eux-mêmes. Un autre problème est l'inégalité d'accès. Toutes les écoles n'ont pas le même équipement technologique, ce qui peut créer des différences entre les établissements. Enfin, il existe des questions éthiques importantes. La protection des données personnelles des élèves et la fiabilité des informations fournies par l'IA nécessitent une vigilance constante.")
]);

P('lesson11-p07', 2, 'LEÇON 11 : LECTURE (3/3)', [
  heading("L'intelligence artificielle à l'école : un nouvel outil pédagogique (3/3)", 2),
  para("Pour que l'intelligence artificielle soit un véritable progrès à l'école, un cadre d'utilisation est nécessaire. Les enseignants doivent recevoir une formation pour maîtriser ces outils et guider leurs élèves. Les élèves, de leur côté, doivent apprendre à utiliser l'IA de manière critique et responsible. L'objectif n'est pas de remplacer le professeur, mais de l'assister. L'école doit rester un lieu où l'on apprend à penser, pas seulement à obtenir des réponses. Avec des règles claires, l'IA peut devenir un allié pour une éducation plus moderne et plus adaptée."),
  para('https://www.bien-ecrire.com')
]);

// ===================== PHASE 2 : COMPRÉHENSION =====================
P('lesson11-p08', 2, 'LEÇON 11 : IDÉE PRINCIPALE & QUESTIONS GUIDÉES (1/2)', [
  microtask(2, "Quelle est l'idée principale de ce texte ?", '5 minutes'),
  q('l11-q4', "Quelle est l'idée principale de ce texte ?", 4),
  consigne('Répondez aux questions suivantes :'),
  q('l11-q5', "1. Quels sont les avantages de l'IA selon le texte ?", 4)
]);

P('lesson11-p09', 2, 'LEÇON 11 : QUESTIONS GUIDÉES (2/2)', [
  q('l11-q6', "2. Quels problèmes l'auteur souligne-t-il ?", 4),
  q('l11-q7', "3. Que doit-on faire pour utiliser l'IA de manière responsable et profiter de ces outils ?", 4),
  q('l11-q8', "4. Selon vous, l'IA peut-elle remplacer le professeur ? Pourquoi ?", 4)
]);

P('lesson11-p10', 2, 'LEÇON 11 : PRÉSENTATION DU TEXTE', [
  {
    type: 'info-box',
    title: 'Des informations supplémentaires',
    sections: [
      {
        heading: 'Présentation du texte explicatif - argumentatif:',
        items: [
          "Ce texte est explicatif parce qu'il présente et explique le rôle de l'intelligence artificielle à l'école, ses avantages et ses inconvénients. Il est aussi argumentatif car l'auteur donne son point de vue, souligne les risques, propose des solutions."
        ]
      },
      {
        heading: "Dans ce texte « l'intelligence artificielle », l'auteur :",
        items: [
          "Explique le rôle de l'intelligence artificielle dans le domaine de l'éducation.",
          "Présente ses avantages pour les enseignants et les élèves.",
          "Présente les avantages et les inconvénients liés à son utilisation à l'école.",
          "Propose des solutions et des conditions pour une utilisation responsable de l'IA."
        ]
      }
    ]
  }
]);

P('lesson11-p11', 2, 'LEÇON 11 : MICRO-TÂCHES 3 & 4', [
  microtask(3, "En une seule phrase, écrivez de quoi parle le texte.", '5 minutes'),
  q('l11-q9', "En une seule phrase, écrivez de quoi parle le texte.", 4),
  microtask(4, "Écrivez en deux phrases comment vous utiliseriez l'IA à l'école si vous étiez élève.", '5 minutes'),
  q('l11-q10', "Écrivez en deux phrases comment vous utiliseriez l'IA à l'école si vous étiez élève.", 4)
]);

P('lesson11-p12', 2, 'LEÇON 11 : MICRO-TÂCHE 5 — OPINION', [
  microtask(5, "Donnez votre opinion ?", '5 minutes'),
  consigne("Donnez votre opinion sur l'utilisation de l'IA à l'école. Expliquez un avantage et un inconvénient selon vous."),
  q('l11-q11', "Donnez votre opinion sur l'utilisation de l'IA à l'école.", 5)
]);

P('lesson11-p13', 2, 'LEÇON 11 : MICRO-TÂCHE 6', [
  microtask(6, "Expliquez-en deux phrases comment éviter les problèmes liés à l'IA.", '5 minutes'),
  q('l11-q12', "Expliquez-en deux phrases comment éviter les problèmes liés à l'IA.", 5)
]);

P('lesson11-p14', 2, 'LEÇON 11 : MICRO-TÂCHE 7 — REFORMULATION', [
  microtask(7, "Reformulez la phrase suivante ?", '5 minutes'),
  consigne("Reformulez cette phrase en utilisant vos propres mots."),
  q('l11-q13', '"Les enseignants doivent recevoir une formation pour maîtriser ces outils et guider leurs élèves."', 5)
]);

P('lesson11-p15', 2, 'LEÇON 11 : MICRO-TÂCHE 8 — VIDÉO', [
  microtask(8, "Regardez cette vidéo pour bien comprendre qu'est-ce que signifie le covoit :", '5 minutes'),
  video('https://www.youtube.com/embed/7xiEiMNovU8', 'Micro-tâche 8'),
  consigne('Écrivez un court résumé de ce que vous avez compris de cette vidéo.'),
  q('l11-q14', 'Écrivez un court résumé de ce que vous avez compris de cette vidéo.', 5)
]);

P('lesson11-p16', 2, 'LEÇON 11 : STRUCTURES À OBSERVER (1/2)', [
  heading('Structures à observer : (5 minutes)', 2),
  {
    type: 'info-box',
    title: 'Structures à observer',
    sections: [
      {
        heading: "Structure de l'opinion :",
        items: [
          'Pour les enseignants, …',
          "L'objectif n'est pas de…, mais de…",
          "L'école doit rester un lieu où…"
        ]
      },
      {
        heading: 'Structure de la cause :',
        items: [
          'Parce que…',
          'Car…',
          'En raison de…'
        ]
      },
      {
        heading: 'Structure de la conséquence :',
        items: [
          'Cela permet de…',
          'Ce qui peut…',
          'Ainsi…',
          'Donc…'
        ]
      }
    ]
  }
]);

P('lesson11-p17', 2, 'LEÇON 11 : STRUCTURES À OBSERVER (2/2)', [
  {
    type: 'info-box',
    title: 'Structures à observer (suite)',
    sections: [
      {
        heading: "Structure de l'opposition / concession :",
        items: [
          'Cependant…',
          'Mais…',
          'Toutefois…',
          "D'un autre côté…"
        ]
      },
      {
        heading: "Structure de l'énumération :",
        items: [
          "D'abord…",
          'De plus…',
          'Ensuite…',
          'Enfin…'
        ]
      },
      {
        heading: 'Structure de la condition :',
        items: [
          'Pour que…',
          'À condition que…',
          'Si…, alors…'
        ]
      }
    ]
  }
]);

P('lesson11-p18', 2, 'LEÇON 11 : MINI-PRODUCTION', [
  microtask(9, 'Mini-production : Résumez ce texte lu en trois phrases ?', '10 minutes'),
  q('l11-q15', 'Résumez ce texte lu en trois phrases ?', 11)
]);

P('lesson11-p19', 2, 'LEÇON 11 : DISCUSSION EN GROUPES', [
  microtask(10, 'Discussion en groupes', '10 minutes'),
  consigne('Déroulement : Travaillez en petits groupes (3 à 4 étudiants). Discutez autour de la question suivante :'),
  para("« Quelles actions concrètes pourriez-vous faire pour utiliser l'intelligence artificielle de manière responsable à l'école ? »"),
  consigne('Chaque groupe propose des solutions réelles liées à ce phénomène.'),
  q('l11-q16', "Quelles actions concrètes pourriez-vous faire pour utiliser l'intelligence artificielle de manière responsable à l'école ?", 7)
]);

// ===================== PHASE 3 : POST-ACTION =====================
P('lesson11-p20', 3, 'LEÇON 11 : PHASE 3 — TÂCHE FINALE', [
  banner(3, 'Post-action (Tâche finale)', '20 min'),
  heading('Tâche finale (avec modèle + aide lexicale)', 2),
  consigne("À travers la discussion précédente, imaginez que votre école va utiliser l'intelligence artificielle pendant les cours. Rédigez un petit texte (5 à 7 lignes) pour présenter l'importance de l'AI et les méthodes d'éviter les inconvénients de cette technologie"),
  para("Où tu expliques :<br>• Comment tu utiliserais l'IA pour apprendre mieux.<br>• Quels problèmes pourraient apparaître.<br>• Ce que tu ferais pour que l'IA soit utile et sûre.")
]);

P('lesson11-p21', 3, 'LEÇON 11 : RÉDACTION', [
  q('l11-q17', 'Rédigez ici votre petit texte (5 à 7 lignes).', 10)
]);

// ===================== PHASE 4 : ÉVALUATION =====================
P('lesson11-p22', 4, 'LEÇON 11 : PHASE 4 — ÉVALUATION', [
  banner(4, 'Évaluation des produits des étudiants', '10 min'),
  consigne('Relisez votre produit écrit et identifiez vos erreurs (vocabulaire, grammaire, orthographe, organisation des idées), comparez avec vos collèges et corrigez son texte si nécessaire.'),
  q('l11-q18', 'Relisez et corrigez votre texte.', 8),
  heading('É-évaluation', 2)
]);

P('lesson11-p23', 4, 'LEÇON 11 : É-ÉVALUATION (1/2)', [
  q('l11-q19', "1. Quel est l'avantage principal de l'IA pour les enseignants ?", 4),
  q('l11-q20', "2. Quel est le premier risque de l'IA pour les élèves ?", 4)
]);

P('lesson11-p24', 4, 'LEÇON 11 : É-ÉVALUATION (2/2) & SOUMISSION', [
  q('l11-q21', "3. Pourquoi l'IA peut-elle créer des inégalités entre les écoles ?", 4),
  q('l11-q22', "4. Quel est le rôle du professeur que l'IA ne doit pas remplacer ?", 4),
  heading('Soumission du devoir', 2),
  para('Vérifier ta repense correcte'),
  para('Vous êtes arrivé à la fin de la Leçon 11. Veuillez valider et envoyer vos réponses à votre enseignant en cliquant sur le bouton ci-dessous.'),
  { type: 'submit', lessonId: 'lesson11', lessonTitle: "L'intelligence artificielle à l'école : un nouvel outil pédagogique" }
]);

// ---- assemble ----
const lesson = {
  id: 'lesson11',
  title: "L'intelligence artificielle à l'école : un nouvel outil pédagogique",
  unitId: 'unit4',
  unitTitle: 'Module 4 : Le sport et la vie scolaire',
  pages: enforceSectionFlow(pages, 'lesson11', Q),
  questions: Q
};

fs.writeFileSync('public/content/unit4/lesson11.json', JSON.stringify(lesson, null, 2) + '\n');
console.log('pages:', pages.length, '| questions:', Q.length);
console.log('question ids:', Q.map(x => x.id).join(', '));
