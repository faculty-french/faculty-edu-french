// Verifies that every lesson link in the Sommaire opens that lesson's COVER page
// (the "page de garde"), not its first content page.
//
// The book is one long flipbook and the Sommaire navigates by page index. Recording
// that index after appending the cover made every link skip the cover. This loads the
// real contentLoader in the browser and asserts each lesson's index lands on its cover.
//
// Needs the dev server: npm run dev  (http://localhost:5173/faculty-edu-french/)
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/faculty-edu-french/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

let failures = 0;
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('page error:', e.message));
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

  const report = await page.evaluate(async () => {
    // The app is served under a base path, so resolve the module against it.
    const url = new URL('src/services/contentLoader.js', document.baseURI).href;
    const mod = await import(/* @vite-ignore */ url);
    const book = await mod.loadBook();
    const coverIds = new Set(book.pages.filter((p) => p.layout === 'lesson-intro').map((p) => p.id));
    const rows = [];
    for (const [lessonId, idx] of Object.entries(book.lessonPageIndex)) {
      const target = book.pages[idx];
      rows.push({
        lessonId,
        idx,
        displayedPage: idx + 1,
        layout: target?.layout ?? null,
        id: target?.id ?? null,
        // Leçon zéro has no cover; such a lesson may legitimately open on its first page.
        hasCover: coverIds.has(`${lessonId}-intro`),
        isCover: target?.layout === 'lesson-intro',
        title: target?.title ?? null,
      });
    }
    return rows.sort((a, b) => a.idx - b.idx);
  });

  for (const r of report) {
    const where = `${r.lessonId.padEnd(9)} p.${String(r.displayedPage).padStart(3)}  ->  ${r.id}`;
    if (r.isCover) {
      console.log(`OK   ${where}  "${r.title}"`);
    } else if (!r.hasCover) {
      console.log(`--   ${where}  (no cover page for this lesson — opens its first page)`);
    } else {
      console.log(`FAIL ${where} (layout=${r.layout}) — a cover exists but the link skips it`);
      failures++;
    }
  }
  if (report.length === 0) { console.log('FAIL: no lessons found in lessonPageIndex'); failures++; }
} finally {
  await browser.close();
}

if (failures) { console.log(`\nFAIL: ${failures} lesson link(s) do not open the cover page.`); process.exit(1); }
console.log('\nPASS: every Sommaire link opens the lesson cover page.');
