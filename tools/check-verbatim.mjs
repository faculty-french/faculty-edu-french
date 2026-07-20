#!/usr/bin/env node
// Verbatim-equality gate for the section-flow reflow.
//
// Proves the reflow only moved whole content blocks between pages and inserted
// "(suite)" heading blocks — it changed NO content text and dropped/reordered
// nothing. For every lesson JSON that exists in the git baseline (HEAD), we
// flatten pages -> ordered content blocks for both the committed version and the
// working-tree version, strip every heading whose text ends with " (suite)"
// (the only blocks the reflow is allowed to add/remove), and require the two
// remaining block sequences to be byte-for-byte identical.
//
// Usage: node tools/check-verbatim.mjs            (checks all lessons)
//        node tools/check-verbatim.mjs --ref <gitref>   (baseline other than HEAD)
// Exit 0 = PASS (all verbatim), 1 = FAIL (a real content change slipped in).

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { isSectionHeading } from './lib/section-flow.mjs';

const args = process.argv.slice(2);
const refIdx = args.indexOf('--ref');
const REF = refIdx !== -1 ? args[refIdx + 1] : 'HEAD';

const root = process.cwd();

function lessonFiles() {
  // deterministic order: unit0..unit4, lesson0..lesson12
  const out = [];
  for (let u = 0; u <= 4; u++) {
    const dir = path.join(root, 'public', 'content', `unit${u}`);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter(f => /^lesson\d+\.json$/.test(f))) {
      out.push(path.join('public', 'content', `unit${u}`, f));
    }
  }
  // sort by lesson number
  return out.sort((a, b) => {
    const na = Number(a.match(/lesson(\d+)/)[1]);
    const nb = Number(b.match(/lesson(\d+)/)[1]);
    return na - nb;
  });
}

// Flatten pages -> ordered content blocks, dropping qualifying section headings
// (Questions guidées / Structure à observer / É-évaluation). Those are the ONLY
// blocks the reflow rewrites — their "(1/2)"/"(suite)" labels are mutable by
// design. Every other block (paragraphs, questions, consignes, info-boxes,
// objectives, and all NON-section headings like "Soumission…"/"Lecture guidée")
// must survive byte-for-byte and in order.
function contentStream(lesson) {
  const stream = [];
  for (const page of lesson.pages || []) {
    for (const block of page.content || []) {
      if (isSectionHeading(block)) continue;
      stream.push(block);
    }
  }
  return stream;
}

function gitShow(relPath) {
  try {
    return execSync(`git show ${REF}:${relPath}`, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null; // not in baseline (e.g. a brand-new lesson)
  }
}

let failures = 0;
let checked = 0;
let skipped = 0;

for (const rel of lessonFiles()) {
  const baselineRaw = gitShow(rel);
  if (baselineRaw === null) {
    console.log(`SKIP  ${rel} (not in ${REF})`);
    skipped++;
    continue;
  }
  const before = contentStream(JSON.parse(baselineRaw));
  const after = contentStream(JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')));

  if (before.length !== after.length) {
    console.error(`FAIL  ${rel}: block count ${before.length} -> ${after.length} (content added/dropped)`);
    // show first divergence for debugging
    const n = Math.min(before.length, after.length);
    for (let i = 0; i < n; i++) {
      if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) {
        console.error(`      first divergence at #${i}:`);
        console.error(`        before: ${JSON.stringify(before[i]).slice(0, 140)}`);
        console.error(`        after : ${JSON.stringify(after[i]).slice(0, 140)}`);
        break;
      }
    }
    failures++;
    continue;
  }

  let mismatch = -1;
  for (let i = 0; i < before.length; i++) {
    if (JSON.stringify(before[i]) !== JSON.stringify(after[i])) { mismatch = i; break; }
  }
  if (mismatch !== -1) {
    console.error(`FAIL  ${rel}: content block #${mismatch} changed (text edited or reordered)`);
    console.error(`        before: ${JSON.stringify(before[mismatch]).slice(0, 160)}`);
    console.error(`        after : ${JSON.stringify(after[mismatch]).slice(0, 160)}`);
    failures++;
    continue;
  }

  console.log(`OK    ${rel} (${after.length} content blocks verbatim)`);
  checked++;
}

console.log(`\n${checked} verbatim, ${skipped} skipped, ${failures} failed.`);
if (failures > 0) { console.log('FAIL'); process.exit(1); }
console.log('PASS'); process.exit(0);
