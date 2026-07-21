import fs from 'fs';
import { enforceSectionFlow } from "./lib/section-flow.mjs";

// ---- Question bank (all open-ended & multiple-choice; ids must match ^l12-(q\d+)$) ----
const Q = [];
const q = (id, text, lines) => { Q.push({ id, type: 'open-ended', text, lines }); return { type: 'question', questionId: id }; };
const vf = (id, text, answer) => { Q.push({ id, type: 'vrai-faux', text, answer }); return { type: 'question', questionId: id }; };
const mc = (id, text, options, answer) => { Q.push({ id, type: 'multiple-choice', text, answer, options }); return { type: 'question', questionId: id }; };

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
P('lesson12-p01', 0, 'LEÇON 12 : OBJECTIFS', [
  heading("Leçon 12 : Faut-il donner des devoirs à l'école ?", 1),
  para("Objectif général : À la fin de la leçon « Faut-il donner des devoirs à l'école ? », l'apprenant sera capable de comprendre et de produire un texte écrit cohérent et structuré pour informer et convaincre."),
  para("À la fin de cette leçon, l'apprenant doit être capable de :"),
  {
    type: 'objectives',
    title: 'Objectifs de la leçon (01 - 11)',
    items: [
      { num: '01', text: "Déterminer les idées principales et secondaires d'un texte lu." },
      { num: '02', text: "Identifier les informations détaillées du texte." },
      { num: '03', text: "Résumer correctement un texte lu." },
      { num: '04', text: "Faire des comparaisons entre les problèmes contenus dans le texte et les problèmes semblables dans la vie quotidienne." },
      { num: '05', text: "Porter un jugement d'un texte lu à partir des critères pertinents." },
      { num: '06', text: "Employer des mots adéquats à la situation." },
      { num: '07', text: "Mettre en lien des connaissances antérieures au sujet visé." },
      { num: '08', text: "Argumenter son point de vue." },
      { num: '09', text: "Encourager les apprenants à relever les défis liés à l'apprentissage du français." },
      { num: '10', text: "Stimuler la motivation des apprenants à participer aux activités et à progresser en FLE." },
      { num: '11', text: "Amener les apprenants à profiter les difficultés comme des occasions d'apprentissage et de développement." }
    ]
  }
]);

// ===================== PHASE 1 : PRÉ-ACTION =====================
P('lesson12-p02', 1, 'LEÇON 12 : PHASE 1 — OBSERVATION', [
  banner(1, 'Pré-action (Activation des connaissances)', '20 min'),
  heading('Introduction et Motivation', 2),
  consigne('Observez les images suivantes, puis prédisez le thème de la leçon.'),
  q('l12-q0', 'Observez les images suivantes, puis prédisez le thème de la leçon.', 4)
]);

P('lesson12-p03', 1, 'LEÇON 12 : QUESTIONS PRÉLIMINAIRES', [
  consigne('Répondez aux questions suivantes :'),
  q('l12-q1', '1. Que voyez-vous dans ces images ?', 4),
  q('l12-q2', '2. Selon vous, quel est le thème de la leçon ?', 4)
]);

P('lesson12-p04', 1, 'LEÇON 12 : LECTURE GUIDÉE', [
  heading('Lecture guidée du texte (15 minutes)', 2),
  consigne('Lisez le texte en entier en silence ou à voix basse et comprenez le sens global. (10 minutes)')
]);

// ===================== PHASE 2 : ACTION (LECTURE) =====================
P('lesson12-p05', 2, 'LEÇON 12 : PHASE 2 — LECTURE (1/4)', [
  banner(2, 'Action (Compréhension approfondie)', '60 min'),
  consigne('Lisez le texte suivant, puis répondez aux questions'),
  heading("Faut-il donner des devoirs à l'école ? (1/4)", 3),
  para("Personnellement, je n'ai jamais aimé faire mes devoirs à l'école. Je les faisais constamment à la dernière minute pendant les intercours et je les ai toujours considérés comme quelque chose de casse pied qui me faisait perdre mon temps. Je crois que le problème des devoirs, c'est que ça n'incite pas forcément à apprendre ni à comprendre ce qu'on a vu pendant un cours. Comme les élèves voient les devoirs comme quelque chose de contraignant, ça ne leur donne pas envie d'apprendre. Le problème, c'est qu'après, ils risquent d'associer l'école à un lieu désagréable qui leur donne des devoirs ennuyeux.")
]);

P('lesson12-p06', 2, 'LEÇON 12 : LECTURE (2/4)', [
  heading("Faut-il donner des devoirs à l'école ? (2/4)", 2),
  para("Mais d'un autre côté, les devoirs peuvent aussi avoir une certaine utilité. Ils permettent notamment de valider la compréhension des cours. En effet, parfois, c'est en faisant leurs devoirs que les élèves peuvent réaliser qu'il y avait des points du cours qu'ils n'avaient pas compris. Ce qu'ils n'auraient jamais remarqué si on ne leur avait rien donné à faire chez eux.")
]);

P('lesson12-p07', 2, 'LEÇON 12 : LECTURE (3/4)', [
  heading("Faut-il donner des devoirs à l'école ? (3/4)", 2),
  para("Alors, je suis partagé. Une part de moi pense que ça ne sert à rien. Après tout, beaucoup de pays ne donnent pas de devoir à la maison et les élèves s'en sortent très bien. Et une autre part de moi admet que c'est utile."),
  para("En tout cas, je ne pense pas qu'il faille donner trop de devoirs aux élèves, surtout s'ils ont déjà travaillé beaucoup d'heures dans la journée. Les devoirs à la maison ne doivent pas servir à remplacer les explications des professeurs. À mon sens, c'est pendant les cours que les élèves devraient retenir la majorité des cours.")
]);

P('lesson12-p08', 2, 'LEÇON 12 : LECTURE (4/4)', [
  heading("Faut-il donner des devoirs à l'école ? (4/4)", 2),
  para("Enfin, peut-être que certains élèves ont besoin de devoir pour apprendre, tandis que d'autres non. Mais ce serait injuste de donner des devoirs qu'à une partie des élèves, même si ce serait plus logique. Une autre solution serait de donner des devoirs facultatifs et d'encourager les élèves à les faire, en leur donnant une récompense, par exemple, s'ils les ont faits."),
  para("https://anyfrench.com/lecture/faut-il-donner-des-devoirs-a-lecole/")
]);

// ===================== PHASE 2 : COMPRÉHENSION =====================
P('lesson12-p09', 2, 'LEÇON 12 : MICRO-TÂCHE 1', [
  microtask(1, "Quelle est l'idée principale de ce texte ?", '5 minutes'),
  consigne("Quelle est l'idée principale de ce texte ?"),
  q('l12-q3', "Quelle est l'idée principale de ce texte ?", 4)
]);

P('lesson12-p10', 2, 'LEÇON 12 : QUESTIONS GUIDÉES', [
  heading('Questions guidées (10 minutes)', 2),
  consigne('Répondez aux questions suivantes :'),
  q('l12-q4', "1. Quels sont les deux arguments contre les devoirs selon l'auteur ?", 4),
  q('l12-q5', '2. Quels sont deux avantages des devoirs mentionnés dans le texte ?', 4),
  q('l12-q6', "3. Pourquoi l'auteur propose-t-il de donner des devoirs facultatifs avec une récompense ?", 4),
  q('l12-q7', '4. Es-tu plutôt pour ou contre les devoirs à la maison ? Pourquoi ?', 4)
]);

P('lesson12-p11', 2, 'LEÇON 12 : PRÉSENTATION DU TEXTE', [
  {
    type: 'info-box',
    title: 'Des informations supplémentaires',
    sections: [
      {
        heading: 'Présentation du texte explicatif - argumentatif:',
        items: [
          'Ce texte est explicatif-argumentatif, car il explique un phénomène (les devoirs) et présente des arguments pour et contre.'
        ]
      },
      {
        heading: "Dans ce texte « Faut-il donner des devoirs à l'école », l'auteur :",
        items: [
          "Traiter la question des devoirs à l'école et leur utilité pour les élèves.",
          'Présente les arguments pour et contre les devoirs.',
          "S'adresse à des lecteurs (élèves, enseignants, parents) pour les inviter à réfléchir sur le rôle des devoirs dans l'apprentissage."
        ]
      }
    ]
  }
]);

P('lesson12-p12', 2, 'LEÇON 12 : MICRO-TÂCHES 2 & 3', [
  microtask(2, 'En une seule phrase, écrivez de quoi parle le texte.', '5 minutes'),
  q('l12-q8', 'En une seule phrase, écrivez de quoi parle le texte.', 4),
  microtask(3, 'Relisez le texte et soulignez trois mots ou expressions importantes qui décrivent le problème des devoirs.', '5 minutes'),
  q('l12-q9', 'Relisez le texte et soulignez trois mots ou expressions importantes qui décrivent le problème des devoirs.', 4)
]);

P('lesson12-p13', 2, 'LEÇON 12 : MICRO-TÂCHE 4', [
  microtask(4, "Après avoir lu ce texte, indiquez un avantage et un inconvénient des devoirs à l'école, puis donnez votre opinion personnelle en une ou deux phrases.", '5 minutes'),
  q('l12-q10', "Indiquez un avantage et un inconvénient des devoirs à l'école, puis donnez votre opinion personnelle.", 5)
]);

P('lesson12-p14', 2, 'LEÇON 12 : MICRO-TÂCHE 5', [
  microtask(5, 'Discussion en petits groupes', '5 minutes'),
  consigne('En petits groupes, discutez et proposez deux solutions pour rendre les devoirs plus intéressants et utiles pour les apprenants.'),
  q('l12-q11', 'Proposez deux solutions pour rendre les devoirs plus intéressants et utiles.', 5)
]);

P('lesson12-p15', 2, 'LEÇON 12 : MICRO-TÂCHE 6 — REFORMULATION', [
  microtask(6, 'Reformulez la phrase suivante ?', '5 minutes'),
  consigne('Reformulez cette phrase en utilisant vos propres mots.'),
  q('l12-q12', "« Le problème des devoirs, c'est que ça n'incite pas forcément à apprendre ni à comprendre ce qu'on a vu pendant un cours. »", 5)
]);

P('lesson12-p16', 2, 'LEÇON 12 : STRUCTURES À OBSERVER', [
  heading('Structures à observer : (5 minutes)', 2),
  {
    type: 'info-box',
    title: 'Structures à observer',
    sections: [
      {
        heading: 'Structure de comparison :',
        items: [
          'Pour mettre en relation différentes situations ou points de vue :',
          'Comme les élèves voient les devoirs comme quelque chose de contraignant…',
          'Après tout, beaucoup de pays ne donnent pas de devoirs…'
        ]
      },
      {
        heading: 'Structure de suggestion / solution :',
        items: [
          'Pour proposer une solution à un problème :',
          'Une autre solution serait de…',
          'Il serait préférable de…',
          'On pourrait…'
        ]
      },
      {
        heading: "Structure d'introduction / conclusion d'une idée :",
        items: [
          'Pour guider le lecteur et organiser le texte :',
          "Le problème, c'est que…",
          'Mais le problème est que…',
          'Enfin…'
        ]
      }
    ]
  }
]);

P('lesson12-p17', 2, 'LEÇON 12 : MICRO-TÂCHE 7 — VIDÉO', [
  microtask(7, "Regardez cette vidéo pour bien comprendre qu'est-ce que signifie le covoit :", '5 minutes'),
  video('https://www.youtube.com/embed/tIl-zM5uF0A', 'Micro-tâche 7'),
  consigne('Écrivez un court résumé de ce que vous avez compris de cette vidéo.'),
  q('l12-q13', 'Écrivez un court résumé de ce que vous avez compris de cette vidéo.', 5)
]);

P('lesson12-p18', 2, 'LEÇON 12 : MINI-PRODUCTION', [
  microtask(8, 'Mini-production : Résumez ce texte lu en trois phrases ?', '10 minutes'),
  q('l12-q14', 'Résumez ce texte lu en trois phrases ?', 11)
]);

P('lesson12-p19', 2, 'LEÇON 12 : DISCUSSION EN GROUPES', [
  microtask(9, 'Discussion en groupes', '10 minutes'),
  consigne('Déroulement : Travaillez en petits groupes (3 à 4 étudiants). Discutez autour de la question suivante :'),
  para("« Selon vous, comment pourrait-on rendre les devoirs à l'école plus utiles et efficace pour tous les élèves ? »"),
  consigne('Chaque groupe propose des solutions réelles liées à ce phénomène.'),
  q('l12-q15', "Selon vous, comment pourrait-on rendre les devoirs à l'école plus utiles et efficace pour tous les élèves ?", 7)
]);

// ===================== PHASE 3 : POST-ACTION =====================
P('lesson12-p20', 3, 'LEÇON 12 : PHASE 3 — TÂCHE FINALE', [
  banner(3, 'Post-action (Tâche finale)', '20 min'),
  heading('Tâche finale (avec modèle + aide lexicale)', 2),
  consigne("Vous participez à une discussion collective en classe sur les devoirs à la maison. Après avoir lu le texte et échangé vos idées avec vos camarades, votre professeur vous demande de présenter votre opinion sur les devoirs et de proposer des idées pour les améliorer."),
  para("À travers la discussion précédente, écrivez un texte de 5 à 7 phrases dans lequel vous :<br>• Expliquez votre opinion sur les devoirs à la maison.<br>• Donnez un avantage et un inconvénient des devoirs.<br>• Proposez une solution ou une amélioration pour que les devoirs soient plus utiles et intéressants.")
]);

P('lesson12-p21', 3, 'LEÇON 12 : RÉDACTION', [
  q('l12-q16', 'Rédigez ici votre texte (5 à 7 phrases).', 10)
]);

// ===================== PHASE 4 : ÉVALUATION =====================
P('lesson12-p22', 4, 'LEÇON 12 : PHASE 4 — ÉVALUATION', [
  banner(4, 'Évaluation des produits des étudiants', '10 min'),
  consigne('Relisez votre produit écrit et identifiez vos erreurs (vocabulaire, grammaire, orthographe, organisation des idées), comparez avec vos collèges et corrigez son texte si nécessaire.'),
  q('l12-q17', 'Relisez et corrigez votre texte.', 8),
  heading('É-évaluation', 2)
]);

P('lesson12-p23', 4, 'LEÇON 12 : É-ÉVALUATION', [
  heading('É-évaluation', 2),
  mc('l12-q18', "1. D'après le texte, quel est le problème des devoirs ?", [
    { id: 'a', label: 'a', text: "Ils sont trop simples pour les élèves" },
    { id: 'b', label: 'b', text: "Ils se font toujours pendant les intercours" },
    { id: 'c', label: 'c', text: "Ils ne permettent pas forcément de comprendre un cours" },
    { id: 'd', label: 'd', text: "Ils ne sont pas assez difficiles" }
  ], 'c'),
  mc('l12-q19', "2. D'après le texte, comment les élèves peuvent percevoir l'école si on leur donne des devoirs ?", [
    { id: 'a', label: 'a', text: "Comme un endroit pour élever leur esprit" },
    { id: 'b', label: 'b', text: "Comme un endroit désagréable" },
    { id: 'c', label: 'c', text: "Comme une prison pour leur esprit" },
    { id: 'd', label: 'd', text: "Comme un endroit fantastique" }
  ], 'b'),
  mc('l12-q20', "3. Selon le texte, dans quels cas les devoirs peuvent être utiles ?", [
    { id: 'a', label: 'a', text: "Pour vérifier sa compréhension des cours" },
    { id: 'b', label: 'b', text: "Pour remplacer les professeurs" },
    { id: 'c', label: 'c', text: "Pour donner envie d'apprendre davantage" },
    { id: 'd', label: 'd', text: "Pour comprendre les cours" }
  ], 'a'),
  mc('l12-q21', "4. S'il fallait donner des devoirs, combien faudrait-il en donner ?", [
    { id: 'a', label: 'a', text: "Pas trop de devoirs" },
    { id: 'b', label: 'b', text: "Davantage de devoirs" },
    { id: 'c', label: 'c', text: "Une avalanche de devoirs" },
    { id: 'd', label: 'd', text: "Beaucoup trop de devoirs" }
  ], 'a'),
  mc('l12-q22', "5. Quelle alternative propose le narrateur ?", [
    { id: 'a', label: 'a', text: "Des travaux manuels" },
    { id: 'b', label: 'b', text: "Des devoirs facultatifs" },
    { id: 'c', label: 'c', text: "Aucun devoir" },
    { id: 'd', label: 'd', text: "Punir les élèves qui ne font pas leur devoir" }
  ], 'b')
]);

P('lesson12-p24', 4, 'LEÇON 12 : SOUMISSION', [
  heading('Soumission du devoir', 2),
  para('Vérifier ta repense correcte'),
  para("Vous êtes arrivé à la fin de la Leçon 12. Veuillez valider et envoyer vos réponses à votre enseignant en cliquant sur le bouton ci-dessous."),
  { type: 'submit', lessonId: 'lesson12', lessonTitle: "Faut-il donner des devoirs à l'école ?" }
]);

// ---- assemble ----
const lesson = {
  id: 'lesson12',
  title: "Faut-il donner des devoirs à l'école ?",
  unitId: 'unit4',
  unitTitle: 'Module 4 : Le sport et la vie scolaire',
  pages: enforceSectionFlow(pages, 'lesson12', Q),
  questions: Q
};

fs.writeFileSync('public/content/unit4/lesson12.json', JSON.stringify(lesson, null, 2) + '\n');
console.log('pages:', pages.length, '| questions:', Q.length);
console.log('question ids:', Q.map(x => x.id).join(', '));
