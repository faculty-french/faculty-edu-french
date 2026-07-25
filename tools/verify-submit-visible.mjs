// Reproduces the "vanishing submit button" bug and guards against it.
//
// Scenario: a student reaches the Soumission page with many unanswered questions and
// presses the button. The validation notice used to render a full-text line per missing
// question ABOVE the button, inside the fixed 420x640 overflow:hidden sheet — with 30+
// missing questions the button was clipped out of the page, and only a full reload
// (which resets the status) brought it back.
//
// Asserts, on the real app (mobile viewport):
//   1. Pressing submit with everything unanswered shows the notification.
//   2. The button is still fully inside the visible sheet, and still clickable.
//   3. The page wrapper has not overflowed (scrollHeight - clientHeight <= 2).
//   4. A second press re-runs validation (notification persists — no dead state).
//
// Needs the dev server: npm run dev  (http://localhost:5173/faculty-edu-french/)
import assert from 'assert';
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/faculty-edu-french/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Test' }));
    // All questions unanswered — the worst case that used to clip the button away.
    localStorage.removeItem('book_answers_lesson1');
    Object.keys(localStorage).filter((k) => k.startsWith('book_submission_')).forEach((k) => localStorage.removeItem(k));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.page', { timeout: 20000 });

  // Locate the submit page of the lesson with the MOST questions, via the app's own loader.
  const target = await page.evaluate(async () => {
    const url = new URL('src/services/contentLoader.js', document.baseURI).href;
    const mod = await import(/* @vite-ignore */ url);
    const book = await mod.loadBook();
    let best = null;
    book.pages.forEach((p, i) => {
      const submit = (p.content || []).find((b) => b.type === 'submit');
      if (!submit) return;
      const n = book.questions.filter((q) => q.lessonId === submit.lessonId).length;
      if (!best || n > best.questions) best = { index: i, lessonId: submit.lessonId, questions: n };
    });
    return best;
  });
  assert.ok(target, 'no submit page found in the book');
  console.log(`target: ${target.lessonId} submit page at index ${target.index} (${target.questions} questions unanswered)`);

  await page.evaluate((i) => localStorage.setItem('book_current_page_book', String(i)), target.index);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector(`#submit-btn-${target.lessonId}`, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));

  const pressAndMeasure = async () => {
    await page.click(`#submit-btn-${target.lessonId}`);
    await new Promise((r) => setTimeout(r, 600));
    return page.evaluate((lessonId) => {
      const btn = document.getElementById(`submit-btn-${lessonId}`);
      const sheet = btn?.closest('.page');
      const wrapper = btn?.closest('.page__content-wrapper');
      if (!btn || !sheet || !wrapper) return { err: 'button/page not found after press' };
      const b = btn.getBoundingClientRect();
      const s = sheet.getBoundingClientRect();
      const notif = sheet.querySelector('.validation-notification');
      return {
        notificationShown: !!notif,
        chips: notif ? notif.querySelectorAll('.validation-notification__chip').length : 0,
        buttonInsideSheet: b.top >= s.top - 1 && b.bottom <= s.bottom + 1 && b.height > 10,
        buttonRect: { top: Math.round(b.top - s.top), bottom: Math.round(b.bottom - s.top), sheetHeight: Math.round(s.height) },
        overflowDiff: wrapper.scrollHeight - wrapper.clientHeight,
      };
    }, target.lessonId);
  };

  const first = await pressAndMeasure();
  assert.ok(!first.err, first.err);
  assert.ok(first.notificationShown, 'FAIL 1: notification did not appear');
  assert.strictEqual(first.chips, target.questions, `FAIL 1: expected ${target.questions} chips, got ${first.chips}`);
  console.log(`OK 1: notification shown with ${first.chips} question chip(s)`);

  assert.ok(first.buttonInsideSheet,
    `FAIL 2: button clipped out of the sheet (button ${JSON.stringify(first.buttonRect)})`);
  console.log(`OK 2: button fully visible inside the sheet (${JSON.stringify(first.buttonRect)})`);

  assert.ok(first.overflowDiff <= 2, `FAIL 3: page wrapper overflows by ${first.overflowDiff}px`);
  console.log(`OK 3: no page overflow (diff ${first.overflowDiff})`);

  const second = await pressAndMeasure();
  assert.ok(!second.err && second.notificationShown && second.buttonInsideSheet,
    'FAIL 4: second press left the page in a dead state');
  console.log('OK 4: button still works on a second press — no reload needed');

  console.log('\nPASS: the submit button can no longer be pushed out of the page.');
} finally {
  await browser.close();
}
