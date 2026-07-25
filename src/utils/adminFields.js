// Turns one page of a lesson JSON file into a flat list of editable fields, and
// writes edited values back. The admin edits text only: the structure (block
// types, ids, page splits) never changes here, which is what keeps the no-scroll
// pagination and the question wiring safe from editor mistakes.
//
// Every field carries a `path` (JSON path segments into the lesson object), so
// applying an edit is data-driven and testable — no closures over live objects.

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
    fields.push({ id: `f${fields.length}`, label, path, value, kind: opts.kind || 'text', choices: opts.choices });
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
