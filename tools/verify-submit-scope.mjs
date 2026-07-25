// Guards the submit page's question scope.
//
// loadBook() pools EVERY lesson's questions into one array and hands that array to
// PageContent, which passes it to SubmitButton. Without a per-lesson filter the
// Leçon 1 submit button validates all ~350 questions in the book and refuses to
// submit, listing questions from other lessons as "non résolues".
//
// This reproduces the pooling and the filter against the real content files and
// asserts each lesson's submit block sees exactly its own questions.
import fs from 'fs';
import assert from 'assert';
import { execSync } from 'child_process';

const files = execSync('ls public/content/unit*/lesson*.json').toString().trim().split('\n');

// Mirror contentLoader.loadBook(): pool all questions, tagged with their lesson.
const pooled = [];
const lessons = [];
for (const f of files) {
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  const own = L.questions || [];
  pooled.push(...own.map((q) => ({ ...q, lessonId: L.id })));

  const submits = [];
  for (const p of L.pages || []) {
    for (const b of p.content || []) if (b.type === 'submit') submits.push(b);
  }
  lessons.push({ id: L.id, own, submits });
}

let failures = 0;
console.log(`pooled ${pooled.length} questions from ${files.length} lesson files\n`);

for (const { id, own, submits } of lessons) {
  if (own.length === 0) { console.log(`${id.padEnd(9)} no questions — skipped`); continue; }

  if (submits.length === 0) {
    console.log(`${id.padEnd(9)} FAIL: has ${own.length} questions but no submit block`);
    failures++;
    continue;
  }

  for (const block of submits) {
    // The filter as applied in PageContent.jsx
    const scoped = pooled.filter((q) => q.lessonId === block.lessonId);
    try {
      assert.strictEqual(block.lessonId, id, `submit block lessonId "${block.lessonId}" != "${id}"`);
      assert.strictEqual(scoped.length, own.length,
        `submit sees ${scoped.length} questions, lesson has ${own.length}`);
      assert.deepStrictEqual(scoped.map((q) => q.id), own.map((q) => q.id),
        'scoped question ids differ from the lesson\'s own');
      // Every question must be answerable: a page must render it.
      const rendered = new Set();
      const L = JSON.parse(fs.readFileSync(files.find((f) => f.includes(`${id}.json`)), 'utf8'));
      for (const p of L.pages || []) for (const b of p.content || []) if (b.type === 'question' && b.questionId) rendered.add(b.questionId);
      const orphans = own.filter((q) => !rendered.has(q.id));
      assert.strictEqual(orphans.length, 0,
        `${orphans.length} question(s) can never be answered (no page renders them): ${orphans.map((q) => q.id).join(', ')}`);

      console.log(`${id.padEnd(9)} OK  submit scoped to ${scoped.length} question(s)`);
    } catch (err) {
      console.log(`${id.padEnd(9)} FAIL: ${err.message}`);
      failures++;
    }
  }
}

if (failures) {
  console.log(`\nFAIL: ${failures} problem(s) found.`);
  process.exit(1);
}
console.log('\nPASS: every submit page is scoped to its own lesson, and every question is answerable.');
