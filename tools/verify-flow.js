import fs from 'fs';
import path from 'path';
import { isSectionHeading, base } from './lib/section-flow.mjs';

// A qualifying section's body is a contiguous run of these types (+ its own
// same-base headings). Anything else ends the section. Must match the reflow rule
// in tools/lib/section-flow.mjs.
const isBodyType = (t) => t === 'consigne' || t === 'question' || t === 'info-box';
const isBodyBlock = (b) => b && (b.type === 'question' || b.type === 'info-box');
const isSuite = (b) => b && b.type === 'heading' && typeof b.text === 'string' && b.text.trimEnd().endsWith('(suite)');

function verifyLesson(filePath) {
  const lesson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const id = lesson.id;
  const errors = [];
  const pages = lesson.pages || [];

  // --- Per-page checks: placement + no stranded section start ---
  for (let p = 0; p < pages.length; p++) {
    const blocks = pages[p].content || [];
    const label = `p${String(p + 1).padStart(2, '0')}`;
    for (let b = 0; b < blocks.length; b++) {
      const blk = blocks[b];
      if (!isSectionHeading(blk) || isSuite(blk)) continue;
      // placement: a section must open its own page (index 0), or index 1 under a phase-banner
      const placed = b === 0 || (b === 1 && blocks[0].type === 'phase-banner');
      if (!placed) {
        errors.push(`[FLOW] ${id} ${label}: section "${blk.text}" starts at index ${b} — it shares a page with a preceding activity`);
      }
      // not stranded: its first page must carry a body block (question/info-box)
      if (!blocks.slice(b).some(isBodyBlock)) {
        errors.push(`[FLOW] ${id} ${label}: section "${blk.text}" first page has no body block (question/info-box)`);
      }
    }
  }

  // --- Streaming check: every continued body page repeats the "(suite)" heading ---
  let active = null; // base of the section whose body is still running
  for (let p = 0; p < pages.length; p++) {
    const blocks = pages[p].content || [];
    const label = `p${String(p + 1).padStart(2, '0')}`;
    let start = 0;

    if (active !== null) {
      const first = blocks[0];
      if (first && first.type === 'heading' && base(first.text) === active) {
        start = 1; // continuation heading present — good
      } else if (isBodyBlock(first)) {
        // a bare question/info-box continuing the section but with no heading
        errors.push(`[FLOW] ${id} ${label}: continued section "${active}" is missing its "${active} (suite)" heading`);
      } else {
        active = null; // section ended (page opens with a consigne/other → new activity)
      }
    }

    for (let b = start; b < blocks.length; b++) {
      const blk = blocks[b];
      if (isSectionHeading(blk)) {
        active = base(blk.text);
      } else if (active !== null && !(isBodyType(blk.type) || (blk.type === 'heading' && base(blk.text) === active))) {
        active = null; // body run ended
      }
    }
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  let files = [];
  if (args.length > 0) {
    files = [path.resolve(process.cwd(), args[0])];
  } else {
    const contentDir = path.resolve(process.cwd(), 'public/content');
    for (const u of fs.readdirSync(contentDir).filter(d => d.startsWith('unit')).sort()) {
      const dirPath = path.join(contentDir, u);
      const jsonFiles = fs.readdirSync(dirPath)
        .filter(f => /^lesson\d+\.json$/.test(f))
        .sort((a, b) => parseInt(a.replace(/\D+/g, ''), 10) - parseInt(b.replace(/\D+/g, ''), 10));
      for (const f of jsonFiles) files.push(path.join(dirPath, f));
    }
  }

  const allErrors = [];
  for (const filePath of files) {
    if (fs.existsSync(filePath)) allErrors.push(...verifyLesson(filePath));
  }

  if (allErrors.length > 0) {
    allErrors.forEach(err => console.log(err));
    console.log('FAIL');
    process.exit(1);
  }
  console.log('PASS');
  process.exit(0);
}

main();
