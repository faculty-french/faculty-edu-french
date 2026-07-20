import assert from "node:assert";

const QUALIFYING_PREFIXES = [
  "Questions guidées",
  "Structure à observer",
  "Structures à observer",
  "É-évaluation"
];

// Strip a trailing " (suite)" or " (N/M)" label so section headings compare by their base text.
export function base(text) {
  if (typeof text !== "string") return text;
  return text.replace(/\s*\((?:suite|\d+\/\d+)\)$/i, "");
}

export function isSectionHeading(block) {
  if (!block || block.type !== "heading" || typeof block.text !== "string") return false;
  const b = base(block.text);
  return QUALIFYING_PREFIXES.some(prefix => b.startsWith(prefix));
}

// A section's body is a contiguous run of these block types (+ its own same-base
// headings, which are skipped and regenerated). ANYTHING else — microtask,
// paragraph, video, images-row, keywords, objectives, divider, phase-banner,
// submit, or a heading of a DIFFERENT section (e.g. "Soumission…", "Vidéo…") —
// ends the section.
function isBodyType(type) {
  return type === "consigne" || type === "question" || type === "info-box";
}

function isSoumissionHeading(block) {
  return block && block.type === "heading" && typeof block.text === "string" && block.text.startsWith("Soumission");
}

function upper(s) {
  return typeof s === "string" ? s.toLocaleUpperCase("fr-FR") : s;
}

function getNonHeadingBlocks(pages) {
  const blocks = [];
  for (const pg of pages) {
    if (Array.isArray(pg.content)) {
      for (const blk of pg.content) {
        if (blk.type !== "heading") blocks.push(blk);
      }
    }
  }
  return blocks;
}

export function enforceSectionFlow(pages, lessonId, questions = []) {
  const N = parseInt(String(lessonId).replace(/\D+/g, ""), 10);
  const qType = new Map((questions || []).map(q => [q.id, q.type]));
  let work = JSON.parse(JSON.stringify(pages));
  let changed = false;

  let cursor = 0;
  while (cursor < work.length) {
    const page = work[cursor];
    const bi = page.content.findIndex(isSectionHeading);
    if (bi === -1) { cursor++; continue; }
    // Already validly opening a phase directly under its own banner — leave it.
    if (bi === 1 && page.content[0].type === "phase-banner") { cursor++; continue; }
    changed = true;

    const H = page.content[bi];
    const B = base(H.text);
    const L = H.level;

    // (a) preceding activity stays on this page
    const preceding = page.content.slice(0, bi);

    // (b) gather the section's body, walking forward across pages from (cursor, bi),
    //     stopping at the first block that is not part of the section.
    const gatherable = (blk) =>
      isBodyType(blk.type) ||
      (blk.type === "heading" && typeof blk.text === "string" && base(blk.text) === B);

    const gathered = [];
    let stopPageIdx = work.length;
    let stopBlockIdx = -1;
    let walkPageIdx = cursor;
    let walkBlockIdx = bi;

    outer:
    while (walkPageIdx < work.length) {
      const curContent = work[walkPageIdx].content;
      for (let i = walkBlockIdx; i < curContent.length; i++) {
        const blk = curContent[i];
        if (!gatherable(blk)) { stopPageIdx = walkPageIdx; stopBlockIdx = i; break outer; }
        if (blk.type === "heading") continue; // skip same-base heading; we regenerate them
        gathered.push(blk);
      }
      walkPageIdx++;
      walkBlockIdx = 0;
    }

    // Trailing consigne(s) introduce the NEXT (boundary) activity — hand them to the tail
    // so a section never ends on a consigne whose content lives on the following page.
    const trailingConsignes = [];
    if (stopBlockIdx !== -1) {
      while (gathered.length && gathered[gathered.length - 1].type === "consigne") {
        trailingConsignes.unshift(gathered.pop());
      }
    }

    // (c) slice `gathered` into fresh section pages.
    // Page height is budgeted by weight (a multiple-choice question is ~2x an
    // open-ended one and fills a page fast) AND capped by a raw question count.
    // Weights/budget calibrated to the pages that pass vs. overflow the 420x640
    // sheet: heading≈0, consigne=1, open-ended/vrai-faux=1, MCQ=2, BUDGET=4.
    const BUDGET = 4;
    const weightOf = (blk) => {
      if (blk.type === "question") return qType.get(blk.questionId) === "multiple-choice" ? 2 : 1;
      if (blk.type === "consigne") return 1;
      return 0;
    };
    const emitted = [];
    let cur = null;
    let curWeight = 0;
    let curQ = 0;
    const hasBodyBlock = (arr) => arr ? arr.some(b => b.type !== "heading" && b.type !== "consigne") : false;
    const flush = () => { if (cur !== null && hasBodyBlock(cur)) emitted.push(cur); cur = null; };
    const startPage = () => { cur = [{ type: "heading", text: "", level: L }]; curWeight = 0; curQ = 0; };
    const SOLO_TYPES = new Set(["info-box", "paragraph", "video", "images-row", "objectives", "keywords", "divider"]);

    startPage();
    for (const blk of gathered) {
      if (SOLO_TYPES.has(blk.type)) {
        if (hasBodyBlock(cur)) { flush(); startPage(); }
        cur.push(blk);
        flush();
        startPage();
      } else if (blk.type === "consigne") {
        if (curWeight + 1 > BUDGET && hasBodyBlock(cur)) { flush(); startPage(); }
        cur.push(blk);
        curWeight += 1;
      } else if (blk.type === "question") {
        const w = weightOf(blk);
        const countCap = emitted.length === 0 ? 2 : 3;
        if ((curWeight + w > BUDGET || curQ >= countCap) && hasBodyBlock(cur)) { flush(); startPage(); }
        cur.push(blk);
        curWeight += w;
        curQ += 1;
      } else {
        cur.push(blk);
      }
    }
    flush();

    for (let idx = 0; idx < emitted.length; idx++) {
      emitted[idx][0] = { ...H, text: idx === 0 ? B : B + " (suite)" };
    }

    const T = emitted.length;
    const sectionPages = emitted.map((content, idx) => ({
      id: "",
      phase: page.phase,
      type: "content",
      title: "LEÇON " + N + " : " + upper(B) + (T > 1 ? " (" + (idx + 1) + "/" + T + ")" : ""),
      content
    }));

    // (d) rebuild `work`
    const newPages = work.slice(0, cursor);
    if (preceding.length > 0) newPages.push({ ...page, content: preceding });
    newPages.push(...sectionPages);

    const tailPages = [];
    if (stopPageIdx < work.length) {
      const firstTail = trailingConsignes.concat(work[stopPageIdx].content.slice(stopBlockIdx));
      if (firstTail.length > 0) {
        const tp = { ...work[stopPageIdx], content: firstTail };
        if (isSoumissionHeading(firstTail[0])) tp.title = "LEÇON " + N + " : SOUMISSION DU DEVOIR";
        tailPages.push(tp);
      }
      for (let k = stopPageIdx + 1; k < work.length; k++) {
        if (work[k].content.length > 0) {
          const tp = { ...work[k] };
          if (isSoumissionHeading(tp.content[0])) tp.title = "LEÇON " + N + " : SOUMISSION DU DEVOIR";
          tailPages.push(tp);
        }
      }
    }

    work = newPages.concat(tailPages);
    cursor = cursor + (preceding.length > 0 ? 1 : 0) + sectionPages.length;
  }

  // Renumber page ids contiguously — only if we actually reflowed a section, so a
  // lesson with no qualifying sections (e.g. Leçon zéro) is left completely untouched.
  if (changed) {
    for (let i = 0; i < work.length; i++) {
      work[i].id = "lesson" + N + "-p" + String(i + 1).padStart(2, "0");
    }
  }

  // Integrity net: no non-heading content block may be added, dropped, or altered.
  const inBlocks = getNonHeadingBlocks(pages).map(b => JSON.stringify(b)).sort();
  const outBlocks = getNonHeadingBlocks(work).map(b => JSON.stringify(b)).sort();
  assert.strictEqual(inBlocks.length, outBlocks.length, "Non-heading block count changed during reflow");
  assert.deepStrictEqual(inBlocks, outBlocks, "Non-heading block content changed during reflow");

  return work;
}
