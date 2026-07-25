// End-to-end test of the in-site admin editor, with the relay Worker mocked via
// request interception (no real GitHub commits). Asserts:
//   1. The ⚙️ toggle is present; a wrong password shows an error and does NOT
//      enable admin mode (the client owns no password — the mock rejects it).
//   2. A correct password (mock accepts) enables admin mode; content pages
//      show the ✏️ edit button, cover/divider pages do not.
//   3. The editor lists the page's texts; editing a paragraph and submitting
//      POSTs /admin/save whose body carries the edited string at the right
//      JSON path and the right lesson path; a success message appears.
//   4. After the auto-reload, the local override renders the edited text in
//      the book (what every reader will see once the CDN catches up).
//   5. The edit button reacts to a real CDP touch tap (page-flip suppresses
//      compatibility clicks on the sheets).
//
// Needs the dev server: npm run dev
import assert from 'assert';
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/faculty-edu-french/';
const GOOD_PW = 'test-pw-ok';
const EDITED = 'Texte modifié par le test admin — été «ç»';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Test' }));
  });

  // Mock the relay: /admin/login accepts only GOOD_PW; /admin/save captures its
  // body. Everything else (the dev server, content JSON) passes through.
  const saved = [];
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const href = req.url();
    // Cross-origin JSON POSTs preflight first; without this the fetch dies
    // before /admin/login is ever attempted.
    if (req.method() === 'OPTIONS' && href.includes('workers.dev')) {
      return req.respond({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    if (href.includes('/admin/login')) {
      const body = JSON.parse(req.postData() || '{}');
      const ok = body.password === GOOD_PW;
      return req.respond({
        status: ok ? 200 : 401,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(ok ? { ok: true } : { ok: false, error: 'Mot de passe incorrect.' }),
      });
    }
    if (href.includes('/admin/save')) {
      saved.push(JSON.parse(req.postData() || '{}'));
      return req.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ ok: true, commits: [{ branch: 'gh-pages', sha: 'x' }] }),
      });
    }
    if (href.includes('workers.dev')) {
      return req.respond({ status: 404, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{}' });
    }
    return req.continue();
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.page', { timeout: 20000 });
  await page.evaluate(() => {
    localStorage.removeItem('book_admin_overrides');
    sessionStorage.removeItem('book_admin_session');
  });

  // Open on lesson3-p18 (a content page with a paragraph-free mix? it has consigne
  // + mind-map + question) — use p16 instead? Just find lesson3's first page with
  // a paragraph block, via the loader.
  const target = await page.evaluate(async () => {
    const mod = await import(/* @vite-ignore */ new URL('src/services/contentLoader.js', document.baseURI).href);
    const book = await mod.loadBook();
    const idx = book.pages.findIndex((p) =>
      p.sourceFile === 'unit1/lesson3.json' && (p.content || []).some((b) => b.type === 'paragraph' && b.text));
    const p = book.pages[idx];
    const block = p.content.find((b) => b.type === 'paragraph' && b.text);
    return { idx, pageId: p.id, sourceIndex: p.sourceIndex, originalText: block.text };
  });
  assert.ok(target.idx > 0, 'no lesson3 page with a paragraph found');
  console.log(`target: ${target.pageId} (book index ${target.idx}, source index ${target.sourceIndex})`);

  await page.evaluate((i) => localStorage.setItem('book_current_page_book', String(i)), target.idx);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#btn-admin-toggle', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 800));

  // ---- 1. wrong password rejected
  await page.click('#btn-admin-toggle');
  await page.waitForSelector('#admin-password', { timeout: 5000 });
  await page.type('#admin-password', 'wrong-password');
  await page.click('.admin-card--login .admin-btn--primary');
  await page.waitForSelector('.admin-card--login .admin-error', { timeout: 5000 });
  let editBtns = await page.$$('.admin-edit-btn');
  assert.strictEqual(editBtns.length, 0, 'admin mode must not activate on a rejected password');
  console.log('OK 1: wrong password shows an error, no admin mode');

  // ---- 2. correct password enables admin mode
  await page.evaluate(() => {
    const input = document.querySelector('#admin-password');
    input.focus();
    input.select();
  });
  await page.type('#admin-password', GOOD_PW);
  await page.click('.admin-card--login .admin-btn--primary');
  await page.waitForFunction(() => !document.querySelector('.admin-card--login'), { timeout: 5000 });
  await page.waitForSelector('.admin-edit-btn', { timeout: 5000 });

  const buttonsPlacement = await page.evaluate(() => {
    const onContent = [...document.querySelectorAll('.page')].filter((p) => p.querySelector('.admin-edit-btn'));
    return {
      count: onContent.length,
      onCover: onContent.some((p) => p.className.includes('layout-cover') || p.className.includes('layout-divider') || p.className.includes('layout-index')),
    };
  });
  assert.ok(buttonsPlacement.count > 0, 'no edit buttons after login');
  assert.ok(!buttonsPlacement.onCover, 'edit buttons must not appear on covers/dividers/sommaire');
  console.log(`OK 2: admin mode on — ${buttonsPlacement.count} pages carry the edit button, none decorative`);

  // ---- 3. edit a paragraph and submit (open via real touch tap: assertion 5 too)
  const btnPos = await page.evaluate((pageId) => {
    const sheet = document.querySelector(`[data-page-id="${pageId}"]`);
    const b = sheet.querySelector('.admin-edit-btn');
    const r = b.getBoundingClientRect();
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) };
  }, target.pageId);
  const cdp = await page.target().createCDPSession();
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: btnPos.x, y: btnPos.y }] });
  await new Promise((r) => setTimeout(r, 60));
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForSelector('.admin-card--editor', { timeout: 5000 });
  console.log('OK 5: editor opened from a real touch tap on the sheet');

  await page.waitForFunction(
    () => [...document.querySelectorAll('.admin-field__textarea')].length > 0,
    { timeout: 10000 }
  );
  const fieldHandle = await page.evaluateHandle((original) => {
    return [...document.querySelectorAll('.admin-field__textarea')].find((t) => t.value === original);
  }, target.originalText);
  assert.ok(await fieldHandle.evaluate((el) => !!el), 'paragraph textarea not found in the editor');

  await fieldHandle.asElement().evaluate((el) => { el.focus(); el.select(); });
  await page.keyboard.press('Backspace');
  await fieldHandle.asElement().type(EDITED);

  await page.click('#admin-submit-edits');
  await page.waitForSelector('#admin-save-ok', { timeout: 10000 });

  assert.strictEqual(saved.length, 1, 'exactly one /admin/save call expected');
  const body = saved[0];
  assert.strictEqual(body.path, 'unit1/lesson3.json');
  assert.ok(typeof body.password === 'string' && body.password.length > 0, 'save must be authenticated');
  const sentBlock = body.lesson.pages[target.sourceIndex].content.find((b) => b.type === 'paragraph' && b.text === EDITED);
  assert.ok(sentBlock, 'edited text missing at the expected page in the posted lesson');
  const stillOriginal = JSON.stringify(body.lesson).includes(target.originalText.slice(0, 40));
  assert.ok(!stillOriginal || target.originalText === EDITED, 'original text should have been replaced on that block');
  console.log('OK 3: save posted the full lesson with the edited paragraph in place');

  // ---- 4. after the auto-reload, the override renders the edited text
  await page.waitForFunction(() => !document.querySelector('.admin-card--editor'), { timeout: 15000 });
  await page.waitForSelector('.page', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1000));
  const rendered = await page.evaluate((pageId, edited) => {
    const sheet = document.querySelector(`[data-page-id="${pageId}"]`);
    return sheet ? sheet.textContent.includes(edited) : false;
  }, target.pageId, EDITED);
  assert.ok(rendered, 'edited text not rendered after reload (override not applied)');
  console.log('OK 4: the book renders the edited text after reload (local override)');

  console.log('\nPASS: admin editing works end to end against a mocked relay.');
} finally {
  await browser.close();
}
