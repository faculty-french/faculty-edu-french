import { CONFIG } from '../config/config';

const cache = {};

export async function loadLesson(unitId, lessonId) {
  const key = `${unitId}/${lessonId}`;
  if (cache[key]) return cache[key];

  const url = `${import.meta.env.BASE_URL}content/${unitId}/${lessonId}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Erreur de chargement de la leçon : ${response.status}`);
    }
    const data = await response.json();
    cache[key] = data;
    return data;
  } catch (error) {
    console.error(`Failed to load lesson ${key}:`, error);
    throw new Error('Impossible de charger la leçon. Veuillez vérifier votre connexion internet.', { cause: error });
  }
}

export function clearCache() {
  Object.keys(cache).forEach(key => delete cache[key]);
}

/**
 * Builds a placeholder page for a lesson that is missing, invalid, or has no
 * pages yet. Used so the assembled book always has a slot for every lesson
 * declared in CONFIG.UNITS, even before its content is written.
 */
function buildPlaceholderPage(lessonId, title) {
  return {
    id: `${lessonId}-placeholder`,
    title: title || lessonId,
    content: [
      { type: 'heading', text: title || lessonId, level: 1 },
      { type: 'paragraph', text: 'Leçon à venir.' }
    ]
  };
}

/**
 * Loads a single lesson file (front-matter-independent), returning its pages
 * and questions. Falls back to a single placeholder page when the lesson is
 * missing, unreachable, malformed, or has an empty pages array.
 */
async function loadLessonSafe(unitId, lessonId, fallbackTitle) {
  try {
    const data = await loadLesson(unitId, lessonId);
    if (!data || !Array.isArray(data.pages) || data.pages.length === 0) {
      return { pages: [buildPlaceholderPage(lessonId, data?.title || fallbackTitle)], questions: [] };
    }
    return { pages: data.pages, questions: Array.isArray(data.questions) ? data.questions : [] };
  } catch {
    return { pages: [buildPlaceholderPage(lessonId, fallbackTitle)], questions: [] };
  }
}

/**
 * Patches the `index` content block (Sommaire) inside the front-matter pages
 * so its lesson links point at the *computed* page index of each lesson in
 * the assembled book, instead of whatever pageIndex was hand-written in
 * book.json. Front-matter-only targets (e.g. "intro", "objectives") are left
 * untouched since front matter keeps its original relative order.
 */
function patchIndexBlocks(pages, lessonPageIndex) {
  return pages.map(page => {
    if (!page.content?.some(block => block.type === 'index')) return page;
    return {
      ...page,
      content: page.content.map(block => {
        if (block.type !== 'index') return block;
        return {
          ...block,
          units: block.units.map(unit => ({
            ...unit,
            lessons: unit.lessons.map(lesson => (
              lessonPageIndex[lesson.id] !== undefined
                ? { ...lesson, pageIndex: lessonPageIndex[lesson.id] }
                : lesson
            ))
          }))
        };
      })
    };
  });
}

/**
 * Assembles the full book from the single source of truth:
 *   book.json (front matter) + unit0/lesson0.json + every lesson in
 *   CONFIG.UNITS order.
 *
 * pageNumber is assigned sequentially (1..N) at assembly time, ignoring any
 * hardcoded pageNumber found in the source files. Questions from every
 * source are merged into a single flat array (front matter first, then each
 * lesson in order).
 */
export async function loadBook() {
  const bookRes = await fetch(`${import.meta.env.BASE_URL}content/book.json`);
  if (!bookRes.ok) throw new Error('Erreur de chargement du livre.');
  const bookData = await bookRes.json();

  const frontMatterPages = Array.isArray(bookData.pages) ? bookData.pages : [];
  const frontMatterQuestions = Array.isArray(bookData.questions) ? bookData.questions : [];

  const lessonTitles = {};
  frontMatterPages.forEach(page => {
    page.content?.forEach(block => {
      if (block.type !== 'index') return;
      block.units?.forEach(unit => unit.lessons?.forEach(l => { lessonTitles[l.id] = l.title; }));
    });
  });

  const lessonSlots = [{ unitId: 'unit0', lessonId: 'lesson0', title: "Leçon zéro : L'approche actionnelle" }];
  CONFIG.UNITS.forEach(unit => {
    unit.lessons.forEach(lessonId => {
      lessonSlots.push({ unitId: unit.id, lessonId, title: lessonId, unitTitle: unit.title, unitLessons: unit.lessons });
    });
  });

  const lessonResults = await Promise.all(
    lessonSlots.map(slot => loadLessonSafe(slot.unitId, slot.lessonId, slot.title))
  );

  const lessonPageIndex = {};
  const allPages = [...frontMatterPages];
  const allQuestions = [...frontMatterQuestions];

  const seenDividers = new Set();
  lessonSlots.forEach((slot, i) => {
    const { pages, questions } = lessonResults[i];
    const moduleNum = /^unit([1-4])$/.exec(slot.unitId)?.[1];
    if (moduleNum && !seenDividers.has(moduleNum)) {
      seenDividers.add(moduleNum);
      allPages.push({
        id: `module-${moduleNum}-divider`,
        type: 'content',
        title: `MODULE ${moduleNum}`,
        layout: 'divider',
        module: Number(moduleNum),
        content: [{
          type: 'module-divider',
          module: Number(moduleNum),
          title: slot.unitTitle,
          lessons: (slot.unitLessons || []).map(id => ({ id, title: lessonTitles[id] || id }))
        }]
      });
    }

    lessonPageIndex[slot.lessonId] = allPages.length;
    allPages.push(...pages.map(p => (moduleNum ? { ...p, module: Number(moduleNum) } : p)));
    allQuestions.push(...questions);
  });

  const patchedPages = patchIndexBlocks(allPages, lessonPageIndex);
  const numberedPages = patchedPages.map((page, i) => ({ ...page, pageNumber: i + 1 }));

  return {
    id: bookData.id,
    title: bookData.title,
    author: bookData.author,
    pages: numberedPages,
    questions: allQuestions,
    lessonPageIndex
  };
}
