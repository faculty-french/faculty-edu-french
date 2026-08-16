// Audit page fill across the whole book: flags near-empty pages and overflows.
//
// The book renders on a fixed 420x640 sheet. This tool loads the site, forces
// every flip-page visible at the real sheet width, measures each page's natural
// content height, and reports:
//   - OVERFLOW  : content taller than the sheet (scrollHeight > clientHeight)
//   - SPARSE    : content filling less than --threshold (default 50%) of the sheet
//
// Usage:
//   node tools/verify-fill.mjs                          # against http://localhost:4173/faculty-edu-french/
//   node tools/verify-fill.mjs --url http://localhost:5173/faculty-edu-french/
//   node tools/verify-fill.mjs --threshold 55           # stricter sparse cut-off (%)
//
// Exit code: 1 if any overflow or sparse page is found, 0 otherwise.
// Front-matter pages with a special layout (cover, sommaire, …) are ignored.

import puppeteer from 'puppeteer';

let url = 'http://localhost:4173/faculty-edu-french/';
let threshold = 50;
const urlIdx = process.argv.indexOf('--url');
if (urlIdx !== -1 && process.argv[urlIdx + 1]) url = process.argv[urlIdx + 1];
const thIdx = process.argv.indexOf('--threshold');
if (thIdx !== -1 && process.argv[thIdx + 1]) threshold = parseInt(process.argv[thIdx + 1], 10);

const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Audit' }));
  });
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 90000 });
  await page.waitForSelector('.page[data-page-id]', { timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const report = await page.evaluate(() => {
    const vis = [...document.querySelectorAll('.stf__item')]
      .find(it => it.style.display !== 'none' && it.offsetWidth > 0);
    const W = vis.offsetWidth, H = vis.offsetHeight;

    // Pass 1 — exact sheet size: overflow check identical to the app's own
    // scrollHeight > clientHeight test in PageContent.
    const st = document.createElement('style');
    st.textContent = `.stf__item{display:block !important; position:relative !important;
      transform:none !important; width:${W}px !important; height:${H}px !important;}`;
    document.head.appendChild(st);
    const overflow = [...document.querySelectorAll('.page[data-page-id]')].map(el => {
      const w = el.querySelector('.page__content-wrapper');
      return w ? { id: el.dataset.pageId, over: w.scrollHeight - w.clientHeight } : null;
    }).filter(Boolean);

    // Pass 2 — natural height at the same width: how much of the sheet is used.
    const st2 = document.createElement('style');
    st2.textContent = `.stf__item{height:auto !important; min-height:0 !important;}
      .stf__item .page__content-wrapper{height:auto !important; max-height:none !important; min-height:0 !important;}`;
    document.head.appendChild(st2);
    const fill = [...document.querySelectorAll('.page[data-page-id]')].map(el => {
      const w = el.querySelector('.page__content-wrapper');
      if (!w) return null;
      let used = 0;
      for (const c of w.children) {
        const s = getComputedStyle(c);
        used = Math.max(used, c.offsetTop + c.offsetHeight + (parseFloat(s.marginBottom) || 0));
      }
      const layout = [...el.classList].find(c => c.startsWith('page--layout-')) || '';
      return { id: el.dataset.pageId, pct: Math.round((used / H) * 100), layout };
    }).filter(Boolean);
    return { H, overflow, fill };
  });

  const overflows = report.overflow.filter(p => p.over > 2);
  const sparse = report.fill.filter(p => !p.layout && p.pct < threshold);
  const lessons = report.fill.filter(p => /^lesson\d+-p/.test(p.id));
  const median = lessons.map(p => p.pct).sort((a, b) => a - b)[Math.floor(lessons.length / 2)];

  console.log(`\nPages mesurées : ${report.fill.length} (leçons : ${lessons.length}) — remplissage médian ${median}%`);
  console.log('======================================');
  if (overflows.length) {
    console.log(`OVERFLOW (${overflows.length}) :`);
    overflows.forEach(p => console.log(`  * ${p.id} dépasse de ${p.over}px`));
  } else {
    console.log('OVERFLOW : aucun (PASS)');
  }
  if (sparse.length) {
    console.log(`SPARSE <${threshold}% (${sparse.length}) :`);
    sparse.forEach(p => console.log(`  * ${p.id} — ${p.pct}%`));
  } else {
    console.log(`SPARSE : aucune page sous ${threshold}% (PASS)`);
  }
  console.log('======================================');
  process.exitCode = (overflows.length || sparse.length) ? 1 : 0;
} finally {
  await browser.close();
}
