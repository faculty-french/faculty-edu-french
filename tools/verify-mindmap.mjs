import assert from 'assert';
import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5173/faculty-edu-french/';

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({
    width: 390,
    height: 844,
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });

  // Only the student profile in evaluateOnNewDocument hook
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Test' }));
  });

  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.page', { timeout: 20000 });

  // Reset mindmap local storage before starting
  await page.evaluate(() => {
    localStorage.removeItem('book_mindmap_l3-covoiturage');
  });

  // Locate page index for lesson3-p18
  const targetIndex = await page.evaluate(async () => {
    const url = new URL('src/services/contentLoader.js', document.baseURI).href;
    const mod = await import(/* @vite-ignore */ url);
    const book = await mod.loadBook();
    return book.pages.findIndex((p) => p.id === 'lesson3-p18');
  });

  assert.ok(targetIndex !== -1, 'FAIL: lesson3-p18 not found in book pages');
  console.log(`target page lesson3-p18 found at index ${targetIndex}`);

  // Navigate to target page
  await page.evaluate((idx) => localStorage.setItem('book_current_page_book', String(idx)), targetIndex);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-page-id="lesson3-p18"] .mind-map', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));

  // Assertion 1: Visible sheet elements
  const checkSheet = await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    if (!pageEl) return { err: 'lesson3-p18 page element not found' };

    const mindmap = pageEl.querySelector('.mind-map');
    const branches = pageEl.querySelectorAll('.mind-map__branch');
    const center = pageEl.querySelector('.mind-map__center');
    const oldImg = pageEl.querySelector('img[src*="lesson3-mindmap.png"]');

    return {
      hasMindmap: !!mindmap,
      branchCount: branches.length,
      hasCenter: !!center,
      hasOldImg: !!oldImg,
    };
  });

  assert.ok(!checkSheet.err, checkSheet.err);
  assert.ok(checkSheet.hasMindmap, 'FAIL 1: .mind-map not found on lesson3-p18');
  assert.strictEqual(checkSheet.branchCount, 4, `FAIL 1: expected 4 branch buttons, got ${checkSheet.branchCount}`);
  assert.ok(checkSheet.hasCenter, 'FAIL 1: central node not found');
  assert.ok(!checkSheet.hasOldImg, 'FAIL 1: static PNG image lesson3-mindmap.png still present');
  console.log('OK 1: .mind-map with 4 branches and center present, static image gone');

  // Assertion 2: Overflow and height check
  const metrics = await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    const wrapper = pageEl?.querySelector('.page__content-wrapper');
    const mindmap = pageEl?.querySelector('.mind-map');
    if (!wrapper || !mindmap) return { err: 'wrapper or mindmap not found' };

    const diff = wrapper.scrollHeight - wrapper.clientHeight;
    const diffX = wrapper.scrollWidth - wrapper.clientWidth;
    const mmHeight = mindmap.getBoundingClientRect().height;

    return { diff, diffX, mmHeight };
  });

  assert.ok(!metrics.err, metrics.err);
  assert.ok(metrics.diff <= 2, `FAIL 2: wrapper overflowed by ${metrics.diff}px (must be <= 2)`);
  assert.ok(metrics.diffX <= 2, `FAIL 2: wrapper overflowed horizontally by ${metrics.diffX}px — a branch pill is wider than the sheet`);
  assert.ok(metrics.mmHeight <= 200, `FAIL 2: mind-map height is ${metrics.mmHeight}px (must be <= 200px)`);
  console.log(`OK 2: no overflow (${metrics.diff}px vertical, ${metrics.diffX}px horizontal), mind-map height ${Math.round(metrics.mmHeight)}px <= 200px`);

  // Assertion 3: Tap Inconvénients opens panel without turning page
  const pageBefore = await page.evaluate(() => localStorage.getItem('book_current_page_book'));

  const client = await page.target().createCDPSession();
  const branchRect = await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    const btn = pageEl?.querySelector('.mind-map__branch--red');
    if (!btn) return null;
    const r = btn.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  assert.ok(branchRect, 'FAIL 3: Inconvénients branch button rect not found');

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: branchRect.x, y: branchRect.y }],
  });
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: [{ x: branchRect.x, y: branchRect.y }],
  });
  await new Promise((r) => setTimeout(r, 600));

  // No fallback on purpose: page-flip calls preventDefault() on touchstart, so the
  // compatibility click never fires on a touch device. A real finger tap IS this
  // sequence — if it stops opening the panel, the feature is broken on phones.
  const panelStatus = await page.evaluate(() => {
    const backdrop = document.querySelector('.mind-map-panel__backdrop');
    const title = backdrop?.querySelector('.mind-map-panel__title h3')?.textContent;
    return { open: !!backdrop, title };
  });

  const pageAfter = await page.evaluate(() => localStorage.getItem('book_current_page_book'));

  assert.ok(panelStatus.open, 'FAIL 3: panel did not open after touch event');
  assert.strictEqual(pageBefore, pageAfter, 'FAIL 3: page turned on branch tap');
  console.log(`OK 3: panel opened ("${panelStatus.title}") without page turn`);

  // Assertion 4: Enter idea using page.type, close, check badge and localStorage
  await page.focus('.mind-map-panel__input');
  await page.type('.mind-map-panel__input', 'pas de place le matin');
  await new Promise((r) => setTimeout(r, 300));

  await page.click('.mind-map-panel__done-btn');
  await new Promise((r) => setTimeout(r, 500));

  const badgeText = await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    const btns = Array.from(pageEl.querySelectorAll('.mind-map__branch'));
    const btn = btns.find((b) => b.textContent.includes('Inconvénients'));
    return btn?.querySelector('.mind-map__badge')?.textContent;
  });

  const lsData = await page.evaluate(() => {
    const raw = localStorage.getItem('book_mindmap_l3-covoiturage');
    return raw ? JSON.parse(raw) : null;
  });

  assert.strictEqual(badgeText, '1/3', `FAIL 4: expected badge 1/3, got "${badgeText}"`);
  assert.ok(lsData && lsData['inconvenients.organisation'] === 'pas de place le matin',
    `FAIL 4: localStorage missing key inconvenients.organisation, got ${JSON.stringify(lsData)}`);
  console.log('OK 4: badge updated to 1/3 and idea saved in localStorage');

  // Assertion 5: Reload and verify persistence
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('[data-page-id="lesson3-p18"] .mind-map', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 1200));

  const badgeTextAfterReload = await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    const btns = Array.from(pageEl.querySelectorAll('.mind-map__branch'));
    const btn = btns.find((b) => b.textContent.includes('Inconvénients'));
    return btn?.querySelector('.mind-map__badge')?.textContent;
  });
  assert.strictEqual(badgeTextAfterReload, '1/3', `FAIL 5: badge after reload expected 1/3, got "${badgeTextAfterReload}"`);

  // Open panel again to check input value
  await page.evaluate(() => {
    const pageEl = document.querySelector('[data-page-id="lesson3-p18"]');
    const btnRed = pageEl?.querySelector('.mind-map__branch--red');
    if (btnRed) btnRed.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  const inputValueAfterReload = await page.evaluate(() => {
    const input = document.querySelector('.mind-map-panel__input');
    return input ? input.value : null;
  });

  assert.strictEqual(inputValueAfterReload, 'pas de place le matin',
    `FAIL 5: input value after reload expected "pas de place le matin", got "${inputValueAfterReload}"`);
  console.log('OK 5: persisted data loaded correctly after page reload (badge 1/3, pre-filled input)');

  console.log('\nPASS: MindMap interactive component verified successfully.');
} finally {
  await browser.close();
}
