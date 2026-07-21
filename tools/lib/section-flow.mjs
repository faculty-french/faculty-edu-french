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
    // sheet: heading≈0, consigne=1, open-ended/vrai-faux=1, MCQ=2. The first page
    // carries the full-size section title so it gets a tighter budget (3); later
    // pages carry a compact "(suite)" running head, so they fit a bit more (4).
    // First page carries the full-size title (budget 4); continued pages a compact
    // running head (budget 6). A short open-ended question = 1, so ~3 pack per page;
    // an MCQ = 3 (tall), so 1 fits under the full title, 2 under the compact one.
    const budgetFor = () => (emitted.length === 0 ? 4 : 6);
    const weightOf = (blk) => {
      if (blk.type === "question") return qType.get(blk.questionId) === "multiple-choice" ? 3 : 1;
      // A consigne is a single short instruction line — negligible height next to a
      // question's answer box / MCQ option list. Give it weight 0 so a run of MCQs
      // packs 2-per continued page instead of being split 1-per-page by interleaved
      // consignes. (The countCap still bounds raw question density.)
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
        // Weight 0: a consigne rides along with the question(s) it introduces and
        // never forces a page break on its own.
        cur.push(blk);
      } else if (blk.type === "question") {
        const w = weightOf(blk);
        const countCap = 3;
        if ((curWeight + w > budgetFor() || curQ >= countCap) && hasBodyBlock(cur)) {
          // A consigne immediately preceding this question introduces it — carry it
          // to the new page so it never strands on the page break.
          const carried = [];
          while (cur.length && cur[cur.length - 1].type === "consigne") carried.unshift(cur.pop());
          flush();
          startPage();
          cur.push(...carried);
        }
        cur.push(blk);
        curWeight += w;
        curQ += 1;
      } else {
        cur.push(blk);
      }
    }
    flush();

    // Rebalance a lonely trailing page so questions spread evenly (3+3+1 -> 3+2+2)
    // rather than leaving a near-empty final page. Only moves whole question blocks
    // between adjacent pages (order preserved), never grows a page past its max.
    // GUARD: only pages made purely of heading/consigne/question may be rebalanced.
    // A SOLO page (info-box/video/…) carries a block that MUST keep its position in
    // the content order; pulling a question onto it would reorder the section.
    const countQ = (pg) => pg.filter(b => b.type === "question").length;
    const isCleanQPage = (pg) => pg.every(b => b.type === "heading" || b.type === "consigne" || b.type === "question");
    while (emitted.length >= 2 &&
           isCleanQPage(emitted[emitted.length - 1]) &&
           isCleanQPage(emitted[emitted.length - 2]) &&
           countQ(emitted[emitted.length - 1]) < countQ(emitted[emitted.length - 2]) - 1) {
      const prev = emitted[emitted.length - 2];
      const last = emitted[emitted.length - 1];
      const qi = prev.map(b => b.type).lastIndexOf("question");
      const moved = prev.splice(qi, 1)[0];
      const insertPos = last.findIndex(b => b.type === "question");
      last.splice(insertPos === -1 ? last.length : insertPos, 0, moved);
    }

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

  // Pack a lonely single-question micro-task page onto an adjacent COMPACT page
  // (before or after) so it stops filling only ~half a no-scroll sheet. To make a
  // pair fit, open-ended answer boxes are shrunk toward FLOOR lines (size only — the
  // question text/content is never touched; `lines` lives on the question object, not
  // the page block, so this affects neither the verbatim gate nor the reorder assert).
  // A "compact" page carries only microtask/consigne/question(open-ended|vrai-faux)
  // blocks — never a heading, banner, paragraph, video, info-box, keywords, images, or
  // MCQ — so the linear height model below is reliable for it (paragraph/media pages
  // render far denser than the model and are deliberately excluded from merging).
  const FLOOR = 3;      // smallest answer box we will shrink to (a sensible min for a written answer)
  const MERGE_CAP = 28; // proven overflow-safe; fitting compact pairs ~25, overflow ~32
  const qById = new Map((questions || []).map(q => [q.id, q]));
  const qtypeOf = (id) => qById.get(id) && qById.get(id).type;
  const isOpen = (id) => { const t = qtypeOf(id); return t !== "multiple-choice" && t !== "vrai-faux"; };
  const isCompactPage = (pg) => {
    const c = pg.content;
    if (!c.length) return false;
    if (c.some(b => b.type === "phase-banner" || b.type === "heading")) return false;
    if (!c.every(b => b.type === "microtask" || b.type === "consigne" || b.type === "question")) return false;
    if (c.some(b => b.type === "question" && qtypeOf(b.questionId) === "multiple-choice")) return false;
    return true;
  };
  const isLonely = (pg) => {
    if (!isCompactPage(pg)) return false;
    const qs = pg.content.filter(b => b.type === "question");
    return qs.length === 1 && isOpen(qs[0].questionId) && pg.content.some(b => b.type === "microtask");
  };
  const estLines = (content, lineMap) => {
    let t = 0;
    for (const b of content) {
      if (b.type === "microtask") t += 2 + Math.ceil((b.text || "").length / 38);
      else if (b.type === "consigne") t += 1 + Math.ceil((b.text || "").length / 38);
      else if (b.type === "question") {
        const q = qById.get(b.questionId) || {};
        const qt = Math.ceil((q.text || "").length / 34);
        if (q.type === "vrai-faux") t += qt + 2;
        else t += qt + (lineMap && lineMap.has(b.questionId) ? lineMap.get(b.questionId) : (q.lines || 4)) + 1;
      }
    }
    return t;
  };
  // Shrink open-ended boxes (largest first) toward FLOOR until the page fits, or give
  // up. Returns the id->lines map to apply, or null if it cannot fit even at FLOOR.
  const tryFit = (content) => {
    const lines = new Map();
    for (const b of content) if (b.type === "question" && isOpen(b.questionId)) lines.set(b.questionId, qById.get(b.questionId).lines || 4);
    while (estLines(content, lines) > MERGE_CAP) {
      let target = null, max = FLOOR;
      for (const [id, ln] of lines) if (ln > max) { max = ln; target = id; }
      if (target === null) return null;
      lines.set(target, lines.get(target) - 1);
    }
    return lines;
  };
  {
    const packed = [];
    for (const pg of work) {
      const prev = packed[packed.length - 1];
      // Merge when prev & pg are both compact, same phase, and at least one is a lonely
      // single-question page (so we never fuse two already-full pages).
      if (prev && prev.phase === pg.phase && isCompactPage(prev) && isCompactPage(pg) &&
          (isLonely(prev) || isLonely(pg))) {
        const candidate = prev.content.concat(pg.content);
        const fit = tryFit(candidate);
        if (fit) {
          for (const [id, ln] of fit) qById.get(id).lines = ln;
          prev.content = candidate;
          changed = true;
          continue;
        }
      }
      packed.push(pg);
    }
    work = packed;
  }

  // Renumber page ids contiguously — only if we actually reflowed a section, so a
  // lesson with no qualifying sections (e.g. Leçon zéro) is left completely untouched.
  if (changed) {
    for (let i = 0; i < work.length; i++) {
      work[i].id = "lesson" + N + "-p" + String(i + 1).padStart(2, "0");
    }
  }

  // Integrity net: no non-heading content block may be added, dropped, altered, OR
  // REORDERED. Compared in document order (not sorted) so a page-boundary move that
  // swaps a question past a SOLO block (e.g. an info-box) is caught here, not later.
  const inBlocks = getNonHeadingBlocks(pages).map(b => JSON.stringify(b));
  const outBlocks = getNonHeadingBlocks(work).map(b => JSON.stringify(b));
  assert.strictEqual(inBlocks.length, outBlocks.length, "Non-heading block count changed during reflow");
  assert.deepStrictEqual(inBlocks, outBlocks, "Non-heading block content or order changed during reflow");

  return work;
}
