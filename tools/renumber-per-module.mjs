// Renumber the DISPLAYED lesson number so it restarts at 1 within each module
// (global 1..3 -> 1..3, 4..6 -> 1..3, 7..9 -> 1..3, 10..12 -> 1..3). Page ids and
// question ids stay GLOBAL and are never touched. Only the human-facing labels
// change: each page `title` ("LEÇON {n} : …"), the opening lesson heading
// ("Leçon {n} : …"), and each intro's `lessonLabel` in lesson-intros.json.
//
// Idempotent. Run it as the LAST step after any reflow/rebuild, since those
// regenerate titles with the global number.
import fs from 'fs';
import { execSync } from 'child_process';

const displayNum = (globalN) => ((globalN - 1) % 3) + 1;

const files = execSync("ls public/content/unit[1-4]/lesson*.json").toString().trim().split("\n");
let totalPages = 0;
for (const f of files) {
  const L = JSON.parse(fs.readFileSync(f, 'utf8'));
  const g = parseInt(String(L.id).replace(/\D+/g, ''), 10);
  if (!g) continue;
  const D = displayNum(g);
  let n = 0;
  for (const p of L.pages) {
    if (typeof p.title === 'string') {
      const t = p.title.replace(/^LEÇON \d+ : /, `LEÇON ${D} : `);
      if (t !== p.title) { p.title = t; n++; }
    }
    for (const b of (p.content || [])) {
      if (b.type === 'heading' && typeof b.text === 'string') {
        const x = b.text.replace(/^Leçon \d+ : /, `Leçon ${D} : `);
        if (x !== b.text) { b.text = x; n++; }
      }
    }
  }
  if (n) { fs.writeFileSync(f, JSON.stringify(L, null, 2) + '\n'); totalPages += n; console.log(`${L.id}: display "Leçon ${D}" (${n} labels)`); }
}

const introPath = "public/content/lesson-intros.json";
if (fs.existsSync(introPath)) {
  const intros = JSON.parse(fs.readFileSync(introPath, 'utf8'));
  let ic = 0;
  for (const k of Object.keys(intros)) {
    const g = parseInt(k.replace(/\D+/g, ''), 10);
    if (!g) continue;
    const want = `Leçon ${displayNum(g)}`;
    if (intros[k].lessonLabel !== want) { intros[k].lessonLabel = want; ic++; }
  }
  if (ic) { fs.writeFileSync(introPath, JSON.stringify(intros, null, 2) + '\n'); console.log(`lesson-intros.json: ${ic} lessonLabel(s) renumbered`); }
}

console.log(`done: ${totalPages} lesson label(s) updated`);
