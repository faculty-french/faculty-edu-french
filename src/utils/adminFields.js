// The admin content model: turns one page of a lesson JSON file into editable
// fields grouped per block, and applies the two kinds of change the editor can
// make — rewriting a text value, and moving a whole block.
//
// Text edits are addressed by `path` (JSON path segments into the lesson), and
// every operation returns a NEW lesson object, so the editor can keep one draft
// and compose edits and moves in any order without stale paths.
//
// Moves never touch `lesson.questions`: a `question` block only carries a
// questionId, so moving it between pages leaves the question definition — and
// therefore every stored answer and every submit button — untouched.

const BLOCK_LABELS = {
  heading: 'Titre',
  paragraph: 'Paragraphe',
  consigne: 'Consigne',
  instruction: 'Instruction',
  microtask: 'Micro-tâche',
  quote: 'Citation',
  'phase-banner': 'Bandeau de phase',
  keywords: 'Mots-clés',
  objectives: 'Objectifs',
  'info-box': 'Encadré',
  'images-row': 'Images',
  video: 'Vidéo',
  'mind-map': 'Carte mentale',
  question: 'Question',
  submit: 'Bouton d\'envoi',
  divider: 'Séparateur',
};

export function blockLabel(block, questions = []) {
  const base = BLOCK_LABELS[block?.type] || block?.type || 'Bloc';
  if (block?.type === 'question') {
    const q = questions.find((x) => x.id === block.questionId);
    return q ? `Question ${q.id}` : `Question ${block.questionId || '?'}`;
  }
  if (block?.type === 'microtask' && block.number != null) return `Micro-tâche ${block.number}`;
  return base;
}

const FIELD_LABELS = {
  heading: 'Titre',
  paragraph: 'Paragraphe',
  consigne: 'Consigne',
  instruction: 'Instruction',
  microtask: 'Micro-tâche',
  quote: 'Citation',
};

export function extractEditableFields(lesson, pageIndex) {
  const page = lesson.pages?.[pageIndex];
  if (!page || !Array.isArray(page.content)) return [];
  const fields = [];
  const add = (label, path, value, opts = {}) => {
    if (typeof value !== 'string') return;
    fields.push({ id: path.join('.'), label, path, value, kind: opts.kind || 'text', choices: opts.choices });
  };

  page.content.forEach((block, bi) => {
    const base = ['pages', pageIndex, 'content', bi];
    const n = bi + 1;
    switch (block.type) {
      case 'heading':
      case 'paragraph':
      case 'consigne':
      case 'instruction':
      case 'quote':
        add(`Bloc ${n} — ${FIELD_LABELS[block.type]}`, [...base, 'text'], block.text);
        break;
      case 'microtask':
        add(`Bloc ${n} — Micro-tâche ${block.number ?? ''}`.trim(), [...base, 'text'], block.text);
        add(`Bloc ${n} — Durée`, [...base, 'duration'], block.duration, { kind: 'short' });
        break;
      case 'phase-banner':
        add(`Bloc ${n} — Bandeau de phase`, [...base, 'title'], block.title);
        add(`Bloc ${n} — Durée`, [...base, 'duration'], block.duration, { kind: 'short' });
        break;
      case 'keywords':
      case 'objectives':
        add(`Bloc ${n} — Titre de l'encadré`, [...base, 'title'], block.title);
        (block.items || []).forEach((item, ii) => {
          add(`Bloc ${n} — Élément ${ii + 1}`, [...base, 'items', ii], item);
        });
        break;
      case 'info-box':
        add(`Bloc ${n} — Titre de l'encadré`, [...base, 'title'], block.title);
        (block.sections || []).forEach((sec, si) => {
          add(`Bloc ${n} — Sous-titre ${si + 1}`, [...base, 'sections', si, 'heading'], sec.heading);
          (sec.items || []).forEach((item, ii) => {
            add(`Bloc ${n} — ${sec.heading || 'Section'} · élément ${ii + 1}`, [...base, 'sections', si, 'items', ii], item);
          });
        });
        break;
      case 'images-row':
        (block.images || []).forEach((img, ii) => {
          add(`Bloc ${n} — Légende de l'image ${ii + 1}`, [...base, 'images', ii, 'caption'], img.caption);
        });
        break;
      case 'video':
        add(`Bloc ${n} — Légende de la vidéo`, [...base, 'caption'], block.caption);
        break;
      case 'mind-map':
        add(`Bloc ${n} — Carte mentale : centre`, [...base, 'center'], block.center);
        add(`Bloc ${n} — Carte mentale : légende`, [...base, 'caption'], block.caption);
        add(`Bloc ${n} — Carte mentale : astuce`, [...base, 'hint'], block.hint);
        (block.branches || []).forEach((br, ri) => {
          add(`Bloc ${n} — Branche « ${br.label} »`, [...base, 'branches', ri, 'label'], br.label);
          (br.items || []).forEach((item, ii) => {
            add(`Bloc ${n} — ${br.label} · idée ${ii + 1}`, [...base, 'branches', ri, 'items', ii, 'label'], item.label);
            if (typeof item.example === 'string') {
              add(`Bloc ${n} — ${br.label} · exemple ${ii + 1}`, [...base, 'branches', ri, 'items', ii, 'example'], item.example);
            }
          });
        });
        break;
      case 'question': {
        const qi = (lesson.questions || []).findIndex(q => q.id === block.questionId);
        if (qi === -1) break;
        const q = lesson.questions[qi];
        const qBase = ['questions', qi];
        add(`Question ${q.id} — Énoncé`, [...qBase, 'text'], q.text);
        if (q.type === 'multiple-choice') {
          (q.options || []).forEach((opt, oi) => {
            add(`Question ${q.id} — Choix ${opt.label || opt.id}`, [...qBase, 'options', oi, 'text'], opt.text);
          });
          add(`Question ${q.id} — Bonne réponse`, [...qBase, 'answer'], q.answer, {
            kind: 'select',
            choices: (q.options || []).map(opt => ({ value: opt.id, label: `${opt.label || opt.id})` })),
          });
        }
        if (q.type === 'vrai-faux') {
          add(`Question ${q.id} — Bonne réponse`, [...qBase, 'answer'], q.answer, {
            kind: 'select',
            choices: [{ value: 'vrai', label: 'Vrai' }, { value: 'faux', label: 'Faux' }],
          });
        }
        break;
      }
      default:
        break; // submit, divider, … — nothing editable
    }
  });
  return fields;
}

// Applies { fieldPathJSON -> newValue } onto a deep copy of the lesson.
export function applyEdits(lesson, edits) {
  const next = JSON.parse(JSON.stringify(lesson));
  for (const [pathJson, value] of Object.entries(edits)) {
    const path = JSON.parse(pathJson);
    let node = next;
    for (let i = 0; i < path.length - 1; i++) {
      node = node?.[path[i]];
      if (node == null) break;
    }
    const leaf = path[path.length - 1];
    // Only overwrite a string slot with a string: structure stays intact even if
    // the stored path went stale against a concurrent edit.
    if (node != null && typeof node[leaf] === 'string' && typeof value === 'string') {
      node[leaf] = value;
    }
  }
  return next;
}


// ---------------------------------------------------------------------------
// Block-level view and structural moves
// ---------------------------------------------------------------------------

// The page's blocks, each with the fields that belong to it. Used by the editor
// so the admin sees "this block, its texts, and where to move it".
export function extractPageBlocks(lesson, pageIndex) {
  const page = lesson.pages?.[pageIndex];
  if (!page || !Array.isArray(page.content)) return [];
  const fields = extractEditableFields(lesson, pageIndex);
  const belongsToBlock = (f, block, index) => {
    // Question fields are addressed into lesson.questions, so map them back to
    // the block that references them; everything else is addressed by block.
    if (f.path[0] === 'questions') {
      return block.type === 'question'
        && (lesson.questions || [])[f.path[1]]?.id === block.questionId;
    }
    return f.path[0] === 'pages' && f.path[1] === pageIndex && f.path[3] === index;
  };

  return page.content.map((block, index) => ({
    index,
    type: block.type,
    label: blockLabel(block, lesson.questions || []),
    fields: fields
      .filter((f) => belongsToBlock(f, block, index))
      // The card header already names the block, so drop the redundant prefix.
      .map((f) => ({ ...f, label: f.label.replace(/^(Bloc \d+|Question [^\s]+)\s+—\s+/, '') })),
  }));
}

function clone(lesson) {
  return JSON.parse(JSON.stringify(lesson));
}

// Writes one string value at a JSON path. Only overwrites a slot that already
// holds a string, so a stale path can never invent structure.
export function setFieldValue(lesson, path, value) {
  const next = clone(lesson);
  let node = next;
  for (let i = 0; i < path.length - 1; i++) {
    node = node?.[path[i]];
    if (node == null) return next;
  }
  const leaf = path[path.length - 1];
  if (node != null && typeof node[leaf] === 'string' && typeof value === 'string') {
    node[leaf] = value;
  }
  return next;
}

// Moves a block up or down inside its own page.
export function reorderBlock(lesson, pageIndex, blockIndex, delta) {
  const next = clone(lesson);
  const content = next.pages?.[pageIndex]?.content;
  const target = blockIndex + delta;
  if (!Array.isArray(content) || target < 0 || target >= content.length) return lesson;
  const [block] = content.splice(blockIndex, 1);
  content.splice(target, 0, block);
  return next;
}

// Moves a block to another page of the SAME lesson, appended at the end (or at
// `toIndex`). Cross-lesson moves are deliberately not offered: question ids and
// submit buttons are scoped to their lesson file.
export function moveBlockToPage(lesson, fromPageIndex, blockIndex, toPageIndex, toIndex = null) {
  const next = clone(lesson);
  const from = next.pages?.[fromPageIndex]?.content;
  const to = next.pages?.[toPageIndex]?.content;
  if (!Array.isArray(from) || !Array.isArray(to) || fromPageIndex === toPageIndex) return lesson;
  if (blockIndex < 0 || blockIndex >= from.length) return lesson;
  const [block] = from.splice(blockIndex, 1);
  const at = toIndex == null ? to.length : Math.max(0, Math.min(toIndex, to.length));
  to.splice(at, 0, block);
  return next;
}

// Every block of the lesson, in order — used to prove a move rearranged blocks
// without creating, dropping or rewriting any of them.
export function blockInventory(lesson) {
  return (lesson.pages || [])
    .flatMap((p) => (p.content || []))
    .map((b) => JSON.stringify(b))
    .sort();
}

// Pages of this lesson the admin may move a block to, labelled with the book
// page number (lesson pages are contiguous in the assembled book, so the offset
// between a lesson page index and its printed number is constant).
export function movablePageTargets(lesson, fromPageIndex, bookPageNumber) {
  const offset = typeof bookPageNumber === 'number' ? bookPageNumber - fromPageIndex : null;
  return (lesson.pages || [])
    .map((p, i) => ({
      index: i,
      label: offset != null ? `Page ${offset + i}` : `Page ${i + 1} de la leçon`,
      blocks: (p.content || []).length,
    }))
    .filter((p) => p.index !== fromPageIndex);
}
