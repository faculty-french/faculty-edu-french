# Lesson Factory Guide — Building Lessons 2–12

**Audience:** an AI worker agent (Gemini Flash, Claude Sonnet/Haiku, or similar) tasked with converting ONE lesson from the source booklet into the app's JSON format.
**Status:** authoritative. This document supersedes `lesson-digitization-rules.md` (the 15-page structure and the book.json double-sync rule described there are obsolete).
**Gold standard:** `public/content/unit1/lesson1.json` — the validated reference implementation. When this guide is ambiguous, imitate lesson 1.

---

## 1. Mission

The project converts a printed FLE workbook (*Le livret de l'élève*, faculté de pédagogie de Minia) into an interactive page-flip web book (React + Vite). Each lesson follows the **approche actionnelle** in 4 phases:

1. **Pré-action** — activation des connaissances (images, prediction, preliminary questions)
2. **Action** — compréhension approfondie (guided reading, questions, micro-tâches, vrai/faux, vidéo)
3. **Post-action** — tâche finale (writing production)
4. **Évaluation** — peer evaluation + é-évaluation (self-assessment questions)

Your job: given the extracted source text (and images) for one lesson, produce **exactly one file**:

```
public/content/unit{U}/lesson{N}.json
```

You do **not** touch any other file. In particular:

> ⛔ **NEVER edit `public/content/book.json`.** It contains front matter only. The app assembles the full book automatically from the individual lesson files (`loadBook()` in `src/services/contentLoader.js`). Adding lesson content to book.json creates duplicate pages — this exact mistake has already happened once and broke the book.

### Lesson → file mapping

| File | Lesson | Module |
|---|---|---|
| `unit1/lesson2.json` | Les espaces verts | 1 : L'environnement et le développement durable |
| `unit1/lesson3.json` | Le covoiturage | 1 |
| `unit2/lesson4.json` | La vie dans le passé : sans internet, sans téléphone | 2 : La technologie et la société |
| `unit2/lesson5.json` | L'absence familiale et ses effets sur la vie quotidienne | 2 |
| `unit2/lesson6.json` | Le phénomène des « influenceurs » sur les réseaux sociaux | 2 |
| `unit3/lesson7.json` | Le télétravail | 3 : Le travail et le bien-être |
| `unit3/lesson8.json` | Le travail contribue-t-il au bonheur ? | 3 |
| `unit3/lesson9.json` | L'histoire de Gita | 3 |
| `unit4/lesson10.json` | Mohammed Salah | 4 : Le sport et la vie scolaire |
| `unit4/lesson11.json` | L'intelligence artificielle à l'école | 4 |
| `unit4/lesson12.json` | Faut-il donner des devoirs à l'école | 4 |

Use the exact `unitTitle` strings from `src/config/config.js` (CONFIG.UNITS).

---

## 2. Inputs you will receive

Your task brief provides:

1. **The extracted source text** of the lesson (from the booklet PDF), pre-cleaned by the orchestrator. Treat it as the single source of truth for all French content.
2. **Image files** already placed in `public/images/lessons/` with their paths (e.g. `images/lessons/lesson2-park.png`). These are the booklet's own images, extracted from the PDF by the orchestrator (`pdfimages`) — the app must show the same images as the printed book. You only reference the paths given in your brief; you never create, generate, or substitute image files.
3. **A video URL** (YouTube embed form) if the lesson has one. Video links are supplied by the project owner per lesson, possibly **after** the lesson is first built: when your brief has no video URL, build the lesson **without** the video pages (drop p20–p21 and q13, renumber pages). A later task may ask you to insert the video pages into an existing lesson — that insertion renumbers page ids after the insertion point but never changes question IDs.
4. This guide + read access to `public/content/unit1/lesson1.json`.

---

## 3. Output file structure

```json
{
  "id": "lesson2",
  "title": "Les espaces verts",
  "unitId": "unit1",
  "unitTitle": "Module 1 : L'environnement et le développement durable",
  "pages": [ ... ],
  "questions": [ ... ]
}
```

### Page object

```json
{
  "id": "lesson2-p01",
  "type": "content",
  "phase": 1,
  "title": "LEÇON 2 : PHASE 1 — IMAGES D'OBSERVATION",
  "content": [ ...blocks... ]
}
```

- `id`: `lesson{N}-pNN`, zero-padded, strictly sequential (`p01`, `p02`, …). No gaps.
- `phase`: `0` for the title/objectives pages, then `1`–`4` following the lesson's phases. Never decreasing across the page sequence.
- `title`: UPPERCASE, always prefixed `LEÇON {N} : `. When a section spans several pages, suffix ` (1/2)`, ` (2/2)` etc.
- **No `pageNumber` field** — numbering is assigned automatically at assembly.

### Content block types (complete list — use no others)

```json
{ "type": "heading", "text": "Leçon 2 : Les espaces verts", "level": 1 }
{ "type": "paragraph", "text": "Texte… (only <strong>, <em>, <br/> allowed inside)" }
{ "type": "divider" }
{ "type": "phase-banner", "phase": 2, "title": "Action (compréhension approfondie)", "duration": "60 min" }
{ "type": "consigne", "text": "Observez attentivement les deux images suivantes, puis prédisez le thème du texte." }
{ "type": "microtask", "number": 3, "text": "Identifiez les connecteurs logiques et expliquez leur rôle.", "duration": "5 min" }
{ "type": "keywords", "title": "Mots-clés", "items": ["Consommateur", "Produits polluants"] }
{ "type": "info-box", "title": "Le texte explicatif", "sections": [
    { "heading": "Définition", "items": ["…", "…"] },
    { "heading": "Objectif", "items": ["…"] } ] }
{ "type": "objectives", "title": "Objectifs de la leçon (01 - 06)", "items": [
    { "num": "01", "text": "Comprendre l'idée générale d'un texte lu." } ] }
{ "type": "images-row", "images": [
    { "imageUrl": "images/lessons/lesson2-a.png", "caption": "Image 1 : …" },
    { "imageUrl": "images/lessons/lesson2-b.png", "caption": "Image 2 : …" } ] }
{ "type": "video", "videoUrl": "https://www.youtube.com/embed/XXXX", "caption": "…" }
{ "type": "question", "questionId": "l2-q3" }
{ "type": "submit", "lessonId": "lesson2", "lessonTitle": "Les espaces verts" }
```

Rules that trip workers up:

- `consigne` and `microtask` texts contain **no emojis** (📌 📝 👉 ➤ are all stripped from the source) and no redundant prefixes: drop leading "Consigne :", "Micro-tâche N :", and "(X minutes)" from the text — the component renders its own label, and durations go in the `duration` field (`"5 minutes"` → `"5 min"`).
- `phase-banner` appears on the **first page of each phase** (and may be repeated on a continuation page like lesson 1's p25).
- French typography is preserved exactly: accents, apostrophes (’), guillemets (« »), capitalization.

### Question object

```json
{ "id": "l2-q3", "type": "open-ended", "text": "Pourquoi… ?", "lines": 4 }
{ "id": "l2-vf1", "type": "vrai-faux", "text": "1. Affirmation à juger.", "answer": "vrai" }
{ "id": "l2-q3", "type": "multiple-choice", "text": "1. Les espaces verts améliorent…", "answer": "b", "options": [
    { "id": "a", "label": "a", "text": "la pollution" },
    { "id": "b", "label": "b", "text": "la qualité de l'air" },
    { "id": "c", "label": "c", "text": "la circulation" } ] }
```

Three question types are supported: `open-ended`, `vrai-faux`, and `multiple-choice`. 
- `vrai-faux` and `multiple-choice` questions **must include an `answer` field** specifying the correct value (e.g. `"vrai"` or `"faux"` for True/False, or the exact option `id` such as `"b"` for MCQ). The UI automatically displays correct/incorrect feedback when an answer is selected.
- `multiple-choice`: Use when the source presents lettered options (a/b/c) — the guided comprehension questions (`q3`–`q5`) are often MCQ in lessons other than lesson 1. MCQ questions have **no `lines` field**; they require an `options` array where each option is `{ "id", "label", "text" }` (`id` and `label` are the letter, `text` is the choice). Budget: an MCQ with 3 options counts like an open-ended question — max 2 per page, or 1 if it shares the page with two other blocks.

- `lines`: **minimum 4** (hard rule). Use 5 for multi-paragraph summaries, 6 for the tâche finale.
- Every question in `questions` must be referenced by exactly one `{ "type": "question" }` block, and vice versa.
- `text` is the full question verbatim from the source (numbering like "1. " kept for guided/vrai-faux series).

### Question ID conventions (fixed — do not invent new patterns)

| ID | Role |
|---|---|
| `l{N}-q0` | Prediction from the observation images (Phase 1) |
| `l{N}-q1`, `l{N}-q2` | Preliminary activation questions |
| `l{N}-q3` … `l{N}-q5` | Guided comprehension questions |
| `l{N}-q6` | Keyword definitions |
| `l{N}-q7` | Idée générale |
| `l{N}-q8` | Connecteurs logiques |
| `l{N}-q9` | Résumé par paragraphe (`lines: 5`) |
| `l{N}-q10` | Phrases difficiles |
| `l{N}-vf1` … `l{N}-vf5` | Vrai/faux statements |
| `l{N}-q11` | Reformulation |
| `l{N}-q12` | Mini-production |
| `l{N}-q13` | Résumé de la vidéo (omit if no video) |
| `l{N}-q14` | Discussion en groupes |
| `l{N}-q15` | Tâche finale (`lines: 6`) |
| `l{N}-q16` | Évaluation des pairs (Phase 4) |
| `l{N}-e1` … `l{N}-e10` | É-évaluation (self-assessment) |

If the source lesson has more or fewer items in a series (e.g. 4 guided questions, 7 é-évaluation questions), extend or shorten the sequence **without renumbering the other roles**, and flag the deviation in your final report.

---

## 4. Canonical page sequence

Follow lesson 1's validated 32-page layout, adapting to your lesson's content. This is the template (page splits marked ‖ are mandatory):

| # | phase | Content |
|---|---|---|
| p01 | 0 | h1 title, divider, "Objectifs" h2, objectif général paragraph, objectives 01–06 |
| p02 | 0 | objectives 07–11 (suite) |
| p03 | 1 | phase-banner 1, section heading, consigne, images-row (2 images), q0 |
| p04 | 1 | consigne, q1, q2 |
| p05 | 2 | phase-banner 2, "Lecture guidée" heading, microtask 1, consigne |
| p06–p07 | 2 | reading text, ‖ max 4 paragraphs per page, heading repeated with (1/2)(2/2) |
| p08 | 2 | "Questions guidées" heading, consigne, q3, q4 |
| p09 | 2 | heading (2/2), consigne, q5 |
| p10 | 2 | consigne, keywords chips, q6 |
| p11–p13 | 2 | ‖ one microtask + its question per page (q7, q8, q9) |
| p14 | 2 | info-box alone on its page |
| p15 | 2 | microtask 5, q10 |
| p16 | 2 | consigne, vf1, vf2, vf3 ‖ max 3 vrai-faux per page |
| p17 | 2 | consigne (suite), vf4, vf5 |
| p18 | 2 | microtask 6, consigne, q11 (reformulation) |
| p19 | 2 | microtask 7, consigne, q12 (mini-production) |
| p20 | 2 | microtask 8, video ‖ video always alone with its microtask |
| p21 | 2 | consigne, q13 (résumé vidéo) |
| p22 | 2 | "Structures à observer" heading, keywords chips |
| p23 | 2 | microtask 9, consigne, q14 (discussion) |
| p24 | 3 | phase-banner 3, tâche finale heading, context paragraphs |
| p25 | 3 | phase-banner 3, consigne, q15 ‖ the 6-line essay zone gets its own page |
| p26 | 4 | phase-banner 4, paragraph, consigne, q16 |
| p27–p31 | 4 | é-évaluation ‖ heading + exactly 2 questions per page, titled (1/5)…(5/5) |
| p32 | 4 | "Soumission du devoir" heading, closing paragraph, submit |

No video → drop p20–p21 and q13, renumber pages (not question IDs). Source content that has no slot here (extra grammar box, extra exercise) → give it its own page in source order and report it.

---

## 5. No-scroll content budget (the hard constraint)

Every page renders on a fixed **420×640** sheet. Content that doesn't fit is **cut off — there is no scrolling**. A dev-mode detector outlines overflowing pages in red and logs `OVERFLOW page <id>` to the browser console; the acceptance bar is **zero overflow warnings**.

Budget rules (derived from the validated lesson 1; when in doubt, split):

- **Open-ended questions:** **fill the page — aim for 2 per page.** A page carrying a single 4-line open-ended question wastes most of the sheet; pair two consecutive same-phase micro-task questions on one page (each with its own microtask/consigne block above it) whenever the pair fits the 420×640 sheet. The overflow detector is the final arbiter: if it fits without a warning, keep two; if it overflows, drop to one. Only ever put **1** question on a page when the pair genuinely overflows (e.g. a 5-line or 6-line answer zone paired with another, or a question sharing the page with a large block like an info-box or images-row). A **6-line** tâche-finale question always sits alone. Never exceed 2 open-ended questions per page.
- **Vrai/faux:** max **3** per page.
- **Reading text:** max **4 paragraphs** (~110 words) per page; split with `(1/2)`, `(2/2)` headings.
- **info-box:** always alone on its page; max ~3 sections / 12 bullet items total. Longer → split into two info-boxes on two pages.
- **objectives:** max **6** items per page.
- **keywords:** max ~8 chips, plus one consigne and one question on the same page.
- **images-row:** exactly 2 images side by side, plus consigne + one question max.
- **video:** alone on its page with one microtask.
- A phase-banner + heading counts as two blocks toward the budget.

Never split a single block across pages; move whole blocks to the next page.

---

## 6. Content fidelity rules

1. **Verbatim French.** Copy the source text exactly — no paraphrasing, no corrections, no "improvements", even if the source contains grammatical idiosyncrasies. You restructure; you never rewrite.
2. Fix only **OCR artifacts** (broken hyphenation across lines, doubled spaces), and report every such fix.
3. Strip decorative emojis/arrow bullets from texts (the components provide visual labels).
4. Durations: normalize to `"N min"` in `duration` fields; remove them from the visible text.
5. Nothing from the source may be silently dropped. If something can't be represented with the available block types, put it in a `paragraph` on its own page and flag it in your report.

---

## 7. Self-verification (required before reporting)

```bash
cd /home/george/projects/faculty-edu-french
node -e "JSON.parse(require('fs').readFileSync('public/content/unitU/lessonN.json'))"   # valid JSON
node tools/validate-lesson.js public/content/unitU/lessonN.json                        # schema + conventions
npm run build                                                                          # must pass
node tools/verify-overflow.js                                                          # 0 OVERFLOW warnings (needs dev server on :5173)
```

`validate-lesson.js` checks: schema conformance, sequential page ids, phase monotonicity, question↔page cross-references, `lines >= 4`, emoji leftovers, and budget heuristics. `verify-overflow.js` sweeps every book page in headless Chromium at 360×640 and 1400×900.

### Final report format

Report back: lesson id and final page count; the mapping of source sections → pages; every deviation from the canonical sequence (missing video, extra/fewer questions, OCR fixes, unplaceable content); and the four verification results.

---

## 8. Common mistakes (all observed in practice)

1. Editing `book.json` → duplicate pages. **Never touch it.**
2. Overflowing pages by stacking "just one more" block — respect the budget table.
3. Rewriting French text instead of copying it.
4. Keeping `📌`/`📝` emojis or "(5 minutes)" inside block texts.
5. Inventing block types or extra fields — the renderer ignores unknown types silently, so content disappears.
6. `lines` below 4, or forgetting that taller answer zones eat the page budget.
7. Adding `pageNumber` fields or hardcoding page indices in titles.
8. ASCII quotes/apostrophes (`'`, `"`) where the source has typographic ones (`’`, `« »`).
