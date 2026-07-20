import fs from 'fs';
import path from 'path';
import { enforceSectionFlow } from './lib/section-flow.mjs';

function reflowAllLessons() {
  const contentDir = path.resolve(process.cwd(), 'public/content');
  const unitDirs = fs.readdirSync(contentDir)
    .filter(d => d.startsWith('unit'))
    .sort();

  for (const u of unitDirs) {
    const dirPath = path.join(contentDir, u);
    const files = fs.readdirSync(dirPath)
      .filter(f => /^lesson\d+\.json$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.replace(/\D+/g, ''), 10);
        const nb = parseInt(b.replace(/\D+/g, ''), 10);
        return na - nb;
      });

    for (const f of files) {
      // Leçon zéro is a special intro lesson (not in CONFIG.UNITS, own id scheme) —
      // it has no qualifying sections and is out of scope for the flow rule.
      if (u === 'unit0') continue;
      const filePath = path.join(dirPath, f);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const lesson = JSON.parse(fileContent);

      const oldPageCount = lesson.pages.length;
      lesson.pages = enforceSectionFlow(lesson.pages, lesson.id, lesson.questions);
      const newPageCount = lesson.pages.length;

      fs.writeFileSync(filePath, JSON.stringify(lesson, null, 2) + '\n');
      console.log(`${lesson.id}: ${oldPageCount} -> ${newPageCount} pages`);
    }
  }
}

reflowAllLessons();
