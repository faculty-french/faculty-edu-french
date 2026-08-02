// End-to-end gate for the print/PDF feature.
//
// The assertion that matters is the last one: we let headless Chrome render the real
// print stylesheet into a real A4 PDF and require that it contains EXACTLY one PDF
// page per book page. Any sheet a hair too tall for the printable area silently emits
// a blank page after every single page — a 334-page book becomes 668 pages — and that
// is invisible in any screenshot-based check.
//
// Run: npm run dev, then  node tools/verify-print.mjs [--url http://localhost:5173/faculty-edu-french/]
import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

const MM_PER_PX = 25.4 / 96; // CSS fixes 1in = 96px for print
const A4_W_MM = 210;
const A4_H_MM = 297;
const PAGE_MARGIN_MM = 8;

let failures = 0;
function check(ok, label, detail = '') {
  if (ok) {
    console.log(`OK  ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures++;
    console.error(`FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

function pdfPageCount(buffer) {
  const raw = Buffer.from(buffer).toString('latin1');
  // Chrome writes one "/Type /Page" object per page (and "/Type /Pages" for the tree
  // node, which the negative lookahead excludes).
  const matches = raw.match(/\/Type\s*\/Page(?![s])/g);
  if (matches) return matches.length;
  const count = /\/Count\s+(\d+)/.exec(raw);
  return count ? Number(count[1]) : -1;
}

async function main() {
  const urlFlag = process.argv.indexOf('--url');
  const targetUrl = urlFlag !== -1 && process.argv[urlFlag + 1]
    ? process.argv[urlFlag + 1]
    : 'http://localhost:5173/faculty-edu-french/';

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Test Étudiant' }));
      // Stubbed so the run never opens a print dialog. It throws on purpose: that
      // aborts PrintBook's own teardown sequence, so the print tree stays mounted and
      // can be measured and rendered to PDF. A no-op stub would let the 1.5s
      // afterprint fallback unmount it mid-measurement.
      window.__printCalled = 0;
      window.print = () => {
        window.__printCalled += 1;
        throw new Error('window.print stubbed by verify-print');
      };
    });

    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('#btn-next-page', { timeout: 15000 });

    const bookPages = await page.$$eval('.stf__item', (els) => els.length);
    check(bookPages > 300, '1. book loaded', `${bookPages} pages in the flip-book`);

    // ---- 2. the cover carries its own print button, and it opens the dialog
    const coverBtn = await page.$('#btn-print-cover');
    check(!!coverBtn, '2. print button on the first page of the book');
    await page.evaluate(() => {
      document.querySelector('#btn-print-cover').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForSelector('#print-dialog', { timeout: 5000 });
    check(true, '2b. the cover button opens the print dialog');
    await page.evaluate(() => document.querySelector('.print-dialog__backdrop').click());
    await page.waitForFunction(() => !document.querySelector('#print-dialog'), { timeout: 5000 });

    // ---- 3. the header button opens the same dialog
    await page.click('#btn-print');
    await page.waitForSelector('#print-dialog', { timeout: 5000 });
    check(true, '3. header button opens the print dialog');

    // Default must be a blank workbook: a printed livret is filled in by hand.
    const answersDefault = await page.$eval('#print-include-answers', (el) => el.checked);
    check(answersDefault === false, '3b. "inclure mes réponses" is off by default');

    // ---- 4. confirming builds the print tree: one sheet per book page
    await page.click('#print-confirm');
    await page.waitForFunction(
      (n) => document.querySelectorAll('.print-root .print-sheet').length === n,
      { timeout: 90000, polling: 500 },
      bookPages
    );
    const sheets = await page.$$eval('.print-root .print-sheet', (els) => els.length);
    check(sheets === bookPages, '4. one print sheet per book page', `${sheets} sheets`);

    await page.waitForFunction(() => window.__printCalled > 0, { timeout: 120000, polling: 500 });
    check(true, '4b. window.print() was reached (fonts + images resolved)');

    // ---- 5. print media: only the print tree prints, and it fits A4
    await page.emulateMediaType('print');
    const geometry = await page.evaluate(() => {
      const sheet = document.querySelector('.print-root .print-sheet');
      const scaler = sheet.querySelector('.print-sheet__scaler');
      const logical = scaler.firstElementChild;
      const root = document.querySelector('#root');
      return {
        sheet: sheet.getBoundingClientRect().toJSON(),
        scaled: scaler.getBoundingClientRect().toJSON(),
        logicalW: logical.offsetWidth,
        logicalH: logical.offsetHeight,
        rootDisplay: getComputedStyle(root).display,
        printRootDisplay: getComputedStyle(document.querySelector('.print-root')).display,
        printing: document.documentElement.getAttribute('data-printing'),
        colorAdjust: getComputedStyle(document.querySelector('.print-root')).printColorAdjust,
      };
    });

    check(geometry.rootDisplay === 'none', '5. the app shell does not print',
      `#root display: ${geometry.rootDisplay}`);
    check(geometry.printing === 'true' && geometry.printRootDisplay !== 'none',
      '5b. the print tree is the printed document');
    check(geometry.logicalW === 420 && geometry.logicalH === 640,
      '5c. the logical page is still 420x640 (scaled, never re-laid-out)',
      `${geometry.logicalW}x${geometry.logicalH}`);

    const printableW = A4_W_MM - 2 * PAGE_MARGIN_MM;
    const printableH = A4_H_MM - 2 * PAGE_MARGIN_MM;
    const sheetWmm = geometry.sheet.width * MM_PER_PX;
    const sheetHmm = geometry.sheet.height * MM_PER_PX;
    check(sheetWmm <= printableW + 0.5 && sheetHmm <= printableH + 0.5,
      '6. the sheet fits inside the A4 printable area',
      `sheet ${sheetWmm.toFixed(1)}x${sheetHmm.toFixed(1)}mm vs ${printableW}x${printableH}mm`);

    const inkW = geometry.scaled.width * MM_PER_PX;
    const inkH = geometry.scaled.height * MM_PER_PX;
    check(
      geometry.scaled.left >= geometry.sheet.left - 1 &&
      geometry.scaled.right <= geometry.sheet.right + 1 &&
      geometry.scaled.top >= geometry.sheet.top - 1 &&
      geometry.scaled.bottom <= geometry.sheet.bottom + 1,
      '6b. the scaled page stays inside its sheet',
      `page ${inkW.toFixed(1)}x${inkH.toFixed(1)}mm`
    );
    // The whole point of the feature: a page big enough to read and write on. Anything
    // under ~150mm tall on A4 is a postcard in the middle of a sea of white.
    check(inkH >= 250 && inkW >= 160,
      '6c. the printed page actually fills the paper',
      `${inkW.toFixed(1)}x${inkH.toFixed(1)}mm on ${A4_W_MM}x${A4_H_MM}mm`);
    check(geometry.colorAdjust === 'exact',
      '6d. backgrounds (phase colours, Seyès ruling) are printed');

    // ---- 7. blocks that cannot survive on paper were swapped out
    const swaps = await page.evaluate(() => ({
      iframes: document.querySelectorAll('.print-root iframe').length,
      videoCards: document.querySelectorAll('.print-root .print-video').length,
      orbiting: document.querySelectorAll('.print-root .mind-map__canvas--orbit').length,
      mindMaps: document.querySelectorAll('.print-root .mind-map').length,
      adminBtns: document.querySelectorAll('.print-root .admin-edit-btn').length,
      submitHidden: Array.from(document.querySelectorAll('.print-root .submit-container'))
        .every((el) => getComputedStyle(el).display === 'none'),
      theme: document.documentElement.getAttribute('data-theme'),
    }));
    check(swaps.iframes === 0 && swaps.videoCards > 0, '7. videos print as a card with their URL',
      `${swaps.videoCards} card(s), ${swaps.iframes} iframe(s)`);
    check(swaps.mindMaps > 0 && swaps.orbiting === 0, '7b. the mind map prints static, not mid-orbit');
    check(swaps.submitHidden, '7c. the submission button is not printed');
    check(swaps.theme === 'light', '7d. printing forces the light palette');

    // A `transparent` stop is transparent *black*: the ruling then exports as a
    // rasterised tiling pattern behind a luminosity soft mask, and PDF viewers that
    // mis-render that mask paint the whole answer zone as one grey block instead of
    // 1px rules — on some pages but not others, which is what made it hard to see.
    const ruling = await page.evaluate(() => {
      const el = document.querySelector('.print-root .open-ended__lines');
      if (!el) return null;
      const bg = getComputedStyle(el).backgroundImage;
      return { bg, transparentStops: (bg.match(/rgba\(0,\s*0,\s*0,\s*0\)/g) || []).length };
    });
    check(ruling && ruling.bg.includes('repeating-linear-gradient') && ruling.transparentStops === 0,
      '7e. the Seyès ruling has no transparent stop (no soft mask in the PDF)',
      ruling ? `${ruling.transparentStops} transparent stop(s)` : 'no answer zone found');

    // ---- 8. the real thing: an A4 PDF with exactly one PDF page per book page
    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    const pdfPages = pdfPageCount(pdf);
    const out = '/tmp/claude-1000/-home-george-projects/verify-print.pdf';
    try { writeFileSync(out, pdf); } catch { /* scratch write is a convenience only */ }
    check(pdfPages === bookPages,
      '8. the generated A4 PDF has exactly one page per book page',
      `${pdfPages} PDF pages for ${bookPages} book pages (${(pdf.length / 1e6).toFixed(1)} MB)`);

    // ---- 9. teardown restores the app
    await page.emulateMediaType(null);
    await page.evaluate(() => {
      // Emulate the browser closing the print dialog.
      window.print = () => {};
      window.dispatchEvent(new Event('afterprint'));
    });
    await page.waitForFunction(() => !document.querySelector('.print-root'), { timeout: 10000 })
      .then(() => check(true, '9. the print tree is torn down after printing'))
      .catch(() => check(false, '9. the print tree is torn down after printing'));
    const restored = await page.evaluate(() => document.documentElement.getAttribute('data-printing'));
    check(restored === null, '9b. data-printing is cleared, Ctrl+P is normal again');
  } finally {
    await browser.close();
  }

  console.log('');
  if (failures > 0) {
    console.error(`FAIL: ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('PASS: the book prints as an A4 PDF, one book page per sheet.');
}

main().catch((err) => {
  console.error('Fatal error in verify-print:', err);
  process.exit(1);
});
