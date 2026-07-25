// Unit tests for the admin content model: the editor may rewrite text values and
// move whole blocks, and must never invent, drop or rewrite a block while doing so.
// Run: node tools/test-admin-blocks.mjs
import assert from 'assert';
import { readFileSync } from 'fs';
import {
  extractPageBlocks,
  extractEditableFields,
  setFieldValue,
  reorderBlock,
  moveBlockToPage,
  blockInventory,
  movablePageTargets,
} from '../src/utils/adminFields.js';

const lesson = JSON.parse(readFileSync(new URL('../public/content/unit1/lesson3.json', import.meta.url), 'utf8'));
const PAGE = lesson.pages.findIndex((p) => p.content.some((b) => b.type === 'question'));
assert.ok(PAGE >= 0, 'no page with a question found');

// ---- 1. blocks carry their own fields
{
  const blocks = extractPageBlocks(lesson, PAGE);
  assert.strictEqual(blocks.length, lesson.pages[PAGE].content.length, 'one card per block');
  const all = extractEditableFields(lesson, PAGE);
  const grouped = blocks.flatMap((b) => b.fields);
  assert.strictEqual(grouped.length, all.length, 'every field belongs to exactly one block');
  const qBlock = blocks.find((b) => b.type === 'question');
  assert.ok(qBlock && qBlock.fields.every((f) => f.path[0] === 'questions'),
    'question fields are addressed into lesson.questions, not the page');
  assert.ok(qBlock.label.startsWith('Question '), `question block should be labelled, got "${qBlock.label}"`);
  console.log(`OK 1: page ${PAGE} → ${blocks.length} block cards, ${all.length} fields, all attributed`);
}

// ---- 2. a text edit changes exactly one string
{
  const field = extractEditableFields(lesson, PAGE).find((f) => f.kind === 'text');
  const next = setFieldValue(lesson, field.path, 'NOUVEAU TEXTE');
  assert.notStrictEqual(next, lesson, 'must return a new object');
  assert.strictEqual(JSON.stringify(lesson), JSON.stringify(JSON.parse(readFileSync(new URL('../public/content/unit1/lesson3.json', import.meta.url), 'utf8'))),
    'the source lesson must not be mutated');
  const before = JSON.stringify(lesson).split('NOUVEAU TEXTE').length - 1;
  const after = JSON.stringify(next).split('NOUVEAU TEXTE').length - 1;
  assert.strictEqual(before, 0);
  assert.strictEqual(after, 1, 'exactly one slot rewritten');
  console.log('OK 2: a text edit rewrites exactly one string, immutably');
}

// ---- 3. a bogus path cannot invent structure
{
  const next = setFieldValue(lesson, ['pages', PAGE, 'content', 999, 'text'], 'x');
  assert.strictEqual(JSON.stringify(next), JSON.stringify(lesson), 'a stale path must be a no-op');
  const next2 = setFieldValue(lesson, ['pages', PAGE, 'content', 0, 'brandNewKey'], 'x');
  assert.strictEqual(JSON.stringify(next2), JSON.stringify(lesson), 'only existing string slots may be written');
  console.log('OK 3: stale or non-string paths are no-ops');
}

// ---- 4. reorder keeps every block, just in a different order
{
  const page = lesson.pages[PAGE];
  assert.ok(page.content.length >= 2, 'need at least two blocks to reorder');
  const moved = reorderBlock(lesson, PAGE, 0, 1);
  assert.deepStrictEqual(blockInventory(moved), blockInventory(lesson), 'no block created or lost');
  assert.strictEqual(JSON.stringify(moved.pages[PAGE].content[1]), JSON.stringify(page.content[0]),
    'the block moved down by one');
  assert.strictEqual(moved.pages[PAGE].content.length, page.content.length);
  // out-of-range moves are refused
  assert.strictEqual(reorderBlock(lesson, PAGE, 0, -1), lesson, 'cannot move the first block up');
  assert.strictEqual(reorderBlock(lesson, PAGE, page.content.length - 1, 1), lesson, 'cannot move the last block down');
  console.log('OK 4: reorder preserves the inventory and refuses out-of-range moves');
}

// ---- 5. moving to another page preserves the inventory and the questions array
{
  const to = PAGE + 1;
  const before = lesson.pages[PAGE].content.length;
  const beforeTo = lesson.pages[to].content.length;
  const moved = moveBlockToPage(lesson, PAGE, 0, to);
  assert.deepStrictEqual(blockInventory(moved), blockInventory(lesson), 'no block created or lost');
  assert.strictEqual(moved.pages[PAGE].content.length, before - 1);
  assert.strictEqual(moved.pages[to].content.length, beforeTo + 1);
  assert.strictEqual(JSON.stringify(moved.questions), JSON.stringify(lesson.questions),
    'moving a block must never touch the questions array');
  assert.strictEqual(moved.pages.length, lesson.pages.length, 'page count unchanged');
  assert.strictEqual(moveBlockToPage(lesson, PAGE, 0, PAGE), lesson, 'moving to the same page is a no-op');
  console.log('OK 5: cross-page move preserves inventory, questions and page count');
}

// ---- 6. moving a question block keeps its answer wiring intact
{
  const qIndex = lesson.pages[PAGE].content.findIndex((b) => b.type === 'question');
  const qId = lesson.pages[PAGE].content[qIndex].questionId;
  const moved = moveBlockToPage(lesson, PAGE, qIndex, PAGE + 1);
  const landed = moved.pages[PAGE + 1].content.some((b) => b.type === 'question' && b.questionId === qId);
  assert.ok(landed, 'the question block landed on the target page');
  assert.ok(moved.questions.some((q) => q.id === qId), 'the question definition is still there');
  const occurrences = moved.pages.flatMap((p) => p.content).filter((b) => b.type === 'question' && b.questionId === qId);
  assert.strictEqual(occurrences.length, 1, 'the question is referenced exactly once');
  console.log('OK 6: a moved question keeps exactly one reference and its definition');
}

// ---- 7. edits and moves compose in any order
{
  const field = extractEditableFields(lesson, PAGE).find((f) => f.kind === 'text' && f.path[0] === 'pages');
  const editThenMove = moveBlockToPage(setFieldValue(lesson, field.path, 'ABC'), PAGE, 0, PAGE + 1);
  const movedFirst = moveBlockToPage(lesson, PAGE, 0, PAGE + 1);
  // after the move the field lives at a new path — recompute it from the draft
  const newField = extractEditableFields(movedFirst, PAGE)
    .concat(extractEditableFields(movedFirst, PAGE + 1))
    .find((f) => f.value === field.value);
  const moveThenEdit = setFieldValue(movedFirst, newField.path, 'ABC');
  assert.strictEqual(JSON.stringify(editThenMove), JSON.stringify(moveThenEdit),
    'editing then moving must equal moving then editing');
  console.log('OK 7: text edits and block moves commute when paths are recomputed from the draft');
}

// ---- 8. move targets exclude the current page and are numbered like the book
{
  const targets = movablePageTargets(lesson, PAGE, 100);
  assert.ok(!targets.some((t) => t.index === PAGE), 'the current page is not a target');
  assert.strictEqual(targets.length, lesson.pages.length - 1);
  const next = targets.find((t) => t.index === PAGE + 1);
  assert.strictEqual(next.label, 'Page 101', `book numbering expected, got ${next.label}`);
  console.log('OK 8: move targets are the other pages, labelled with their printed page number');
}

console.log('\nPASS: admin block model is safe.');
