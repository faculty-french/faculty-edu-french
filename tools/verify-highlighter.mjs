import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import http from 'http';
import assert from 'assert';

const TARGET_URL = 'http://localhost:5173/faculty-edu-french/';
let devServerProcess = null;

async function isServerUp() {
  return new Promise((resolve) => {
    const req = http.get(TARGET_URL, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.end();
  });
}

async function ensureDevServer() {
  const up = await isServerUp();
  if (up) return;

  console.log('Starting dev server on port 5173...');
  devServerProcess = spawn('npx', ['vite', '--port', '5173'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    detached: false
  });

  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isServerUp()) {
      console.log('Dev server ready.');
      return;
    }
  }
  throw new Error('Dev server failed to start within 15 seconds.');
}

async function cdpTouchSwipe(client, fromX, fromY, toX, toY, steps = 20) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: Math.round(fromX), y: Math.round(fromY) }]
  });
  await new Promise(r => setTimeout(r, 50));

  for (let i = 1; i <= steps; i++) {
    const x = Math.round(fromX + (toX - fromX) * (i / steps));
    const y = Math.round(fromY + (toY - fromY) * (i / steps));
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y }]
    });
    await new Promise(r => setTimeout(r, 20));
  }

  await client.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
}

async function getCurrentPageNum(page) {
  return await page.evaluate(() => {
    const btn = document.querySelector('#btn-goto-page');
    return btn ? btn.textContent.trim() : '';
  });
}

async function main() {
  try {
    await ensureDevServer();

    console.log('\n--- Running Mobile Highlighter Verification ---\n');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true
    });

    // The app blocks on a name prompt until a student profile exists, so seed it BEFORE
    // the first load — otherwise `.page` never renders and every assertion times out.
    // Only the profile goes here: this hook re-runs on page.reload(), so clearing the
    // highlights here would wipe the very highlight assertion 4 is meant to find.
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Alex' }));
    });

    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForSelector('.page', { timeout: 20000 });

    // Start from a clean slate, once.
    await page.evaluate(() => localStorage.removeItem('book_highlights'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.page', { timeout: 20000 });

    await new Promise(r => setTimeout(r, 1000));

    const client = await page.target().createCDPSession();

    // Advance until a real lesson page is on screen. Front matter (covers, Sommaire,
    // lesson "pages de garde") is deliberately not highlightable, so stopping on a
    // fixed page number would test the wrong thing.
    const onContentPage = () => page.evaluate(() => {
      const visible = Array.from(document.querySelectorAll('.page')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 50 && r.height > 50 && r.top < window.innerHeight && r.bottom > 0;
      });
      const sheet = visible[visible.length - 1];
      if (!sheet) return false;
      if (/page--layout-/.test(sheet.className)) return false;
      return Array.from(sheet.querySelectorAll('[data-block-index]'))
        .some((el) => el.textContent.trim().length > 40);
    });

    let hops = 0;
    while (!(await onContentPage()) && hops < 60) {
      await page.click('#btn-next-page');
      await new Promise(r => setTimeout(r, 200));
      hops++;
    }
    assert.ok(await onContentPage(), 'Setup FAIL: could not reach a highlightable lesson page');
    await new Promise(r => setTimeout(r, 500));

    const pageNum1 = await getCurrentPageNum(page);
    console.log('Current page counter:', pageNum1);

    // -------------------------------------------------------------
    // Assertion 1: With mode OFF, touch drag across page flips page
    // -------------------------------------------------------------
    const frameRect = await page.evaluate(() => {
      const el = document.querySelector('.book-sheet-frame');
      const r = el.getBoundingClientRect();
      return { x: r.left, y: r.top, width: r.width, height: r.height };
    });

    const cornerStartX = Math.round(frameRect.x + frameRect.width - 15);
    const cornerStartY = Math.round(frameRect.y + frameRect.height - 15);
    const cornerEndX = Math.round(frameRect.x + 30);
    const cornerEndY = Math.round(frameRect.y + frameRect.height - 15);

    await cdpTouchSwipe(client, cornerStartX, cornerStartY, cornerEndX, cornerEndY);
    await new Promise(r => setTimeout(r, 1200));
    let pageNum2 = await getCurrentPageNum(page);

    if (pageNum2 === pageNum1) {
      console.log('Bottom-right corner drag did not flip, trying bottom-left corner drag...');
      await cdpTouchSwipe(client, Math.round(frameRect.x + 15), cornerStartY, Math.round(frameRect.x + frameRect.width - 30), cornerEndY);
      await new Promise(r => setTimeout(r, 1200));
      pageNum2 = await getCurrentPageNum(page);
    }

    console.log(`Page counter before drag: "${pageNum1}", after drag: "${pageNum2}"`);
    assert.notStrictEqual(pageNum1, pageNum2, 'Assertion 1 FAIL: Touch drag in mode OFF did not flip page');
    console.log('✓ Assertion 1 PASS: With mode OFF, touch drag flips the page.');

    const swipeFromX = pageNum2 > pageNum1 ? cornerStartX : Math.round(frameRect.x + 15);
    const swipeToX = pageNum2 > pageNum1 ? cornerEndX : Math.round(frameRect.x + frameRect.width - 30);

    // -------------------------------------------------------------
    // Assertion 2: With mode ON, touch drag does NOT flip page
    // -------------------------------------------------------------
    await page.click('#btn-highlight-toggle');
    await new Promise(r => setTimeout(r, 300));

    const modeState = await page.evaluate(() => document.body.dataset.highlight);
    assert.strictEqual(modeState, 'on', 'Mode ON dataset attribute missing');

    const pageNumBeforeDrag = pageNum2;

    await cdpTouchSwipe(client, swipeFromX, cornerStartY, swipeToX, cornerEndY);

    await new Promise(r => setTimeout(r, 1200));

    const pageNumAfterDrag = await getCurrentPageNum(page);
    console.log(`Mode ON swipe - before: "${pageNumBeforeDrag}", after: "${pageNumAfterDrag}"`);
    assert.strictEqual(pageNumBeforeDrag, pageNumAfterDrag, 'Assertion 2 FAIL: Touch drag in mode ON flipped the page');
    console.log('✓ Assertion 2 PASS: With mode ON, touch drag does NOT flip the page.');

    // -------------------------------------------------------------
    // Assertion 3: With mode ON, selecting text produces mark.hl
    // -------------------------------------------------------------
    await page.evaluate(() => {
      // react-pageflip keeps EVERY page in the DOM, so a document-wide query would grab
      // a block on the cover instead of the page the student is actually looking at.
      // Scope the selection to the visible sheet.
      const visible = Array.from(document.querySelectorAll('.page')).filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 50 && r.height > 50 && r.top < window.innerHeight && r.bottom > 0;
      });
      const sheet = visible[visible.length - 1];
      if (!sheet) throw new Error('No visible page found');

      const blockElements = Array.from(sheet.querySelectorAll('[data-block-index]'));
      let targetNode = null;
      let targetBlock = null;

      for (const el of blockElements) {
        if (el.textContent.trim().length > 15) {
          const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let curr;
          while ((curr = walk.nextNode())) {
            if (curr.nodeValue.trim().length > 8) {
              targetNode = curr;
              targetBlock = el;
              break;
            }
          }
          if (targetNode) break;
        }
      }

      if (!targetBlock || !targetNode) throw new Error('No target text node found on the visible page');

      const range = document.createRange();
      range.setStart(targetNode, 0);
      range.setEnd(targetNode, Math.min(15, targetNode.nodeValue.length));

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      targetBlock.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    await new Promise(r => setTimeout(r, 300));

    const markCount = await page.evaluate(() => document.querySelectorAll('mark.hl').length);
    assert.ok(markCount > 0, 'Assertion 3 FAIL: Selecting text did not create mark.hl element');
    console.log(`✓ Assertion 3 PASS: Selecting text created ${markCount} mark.hl element(s) in DOM.`);

    // -------------------------------------------------------------
    // Assertion 4: Highlight survives page.reload()
    // -------------------------------------------------------------
    const pageCounterBeforeReload = await getCurrentPageNum(page);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.page', { timeout: 20000 });

    const savedHighlights = await page.evaluate(() => localStorage.getItem('book_highlights'));
    assert.ok(savedHighlights && savedHighlights !== '{}', 'Highlighter data missing in localStorage after reload');
    const storedPageId = Object.keys(JSON.parse(savedHighlights))[0];
    console.log(`   stored highlight belongs to page "${storedPageId}": ${savedHighlights}`);

    // The book mounts 334 pages before highlights are re-applied, so poll rather than
    // guess a delay — a fixed wait makes this assertion flaky on a slower machine.
    let markCountReload = 0;
    for (let i = 0; i < 40; i++) {
      markCountReload = await page.evaluate(() => document.querySelectorAll('mark.hl').length);
      if (markCountReload > 0) break;
      await new Promise(r => setTimeout(r, 250));
    }
    if (markCountReload === 0) {
      const diag = await page.evaluate((pid) => {
        const sheet = document.querySelector(`[data-page-id="${pid}"]`);
        return {
          pageInDom: !!sheet,
          blockIndexes: sheet ? Array.from(sheet.querySelectorAll('[data-block-index]')).map((e) => e.dataset.blockIndex) : [],
          textLen: sheet ? sheet.textContent.length : 0,
        };
      }, storedPageId);
      console.log('   diagnostics:', JSON.stringify(diag));
    }
    assert.ok(markCountReload > 0, 'Assertion 4 FAIL: Highlight did not survive page reload');
    console.log('✓ Assertion 4 PASS: Highlight survives page reload.');

    // -------------------------------------------------------------
    // Assertion 5: Tapping highlight with mode ON removes it
    // -------------------------------------------------------------
    const currentMode = await page.evaluate(() => document.body.dataset.highlight);
    if (currentMode !== 'on') {
      await page.click('#btn-highlight-toggle');
      await new Promise(r => setTimeout(r, 300));
    }

    // Toggling the mode re-renders every page, so the mark can momentarily be absent
    // while highlights are re-applied. Wait for it rather than demanding it instantly.
    let tapped = false;
    for (let i = 0; i < 40; i++) {
      tapped = await page.evaluate(() => {
        const mark = document.querySelector('mark.hl');
        if (!mark) return false;
        mark.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
        return true;
      });
      if (tapped) break;
      await new Promise(r => setTimeout(r, 250));
    }
    assert.ok(tapped, 'Assertion 5 FAIL: no mark.hl was ever available to tap');

    await new Promise(r => setTimeout(r, 500));

    const markCountAfterTap = await page.evaluate(() => document.querySelectorAll('mark.hl').length);
    assert.strictEqual(markCountAfterTap, 0, 'Assertion 5 FAIL: Tapping mark.hl did not remove it');
    console.log('✓ Assertion 5 PASS: Tapping highlight in mode ON removes it.');

    // -------------------------------------------------------------
    // Assertion 6: Highlighted page has scrollHeight - clientHeight <= 2
    // -------------------------------------------------------------
    await page.evaluate(() => {
      const blockElements = Array.from(document.querySelectorAll('[data-block-index]'));
      let targetNode = null;
      let targetBlock = null;

      for (const el of blockElements) {
        if (el.textContent.trim().length > 15) {
          const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
          let curr;
          while ((curr = walk.nextNode())) {
            if (curr.nodeValue.trim().length > 8) {
              targetNode = curr;
              targetBlock = el;
              break;
            }
          }
          if (targetNode) break;
        }
      }

      if (!targetBlock || !targetNode) throw new Error('No target text node found for overflow test');

      const range = document.createRange();
      range.setStart(targetNode, 0);
      range.setEnd(targetNode, Math.min(10, targetNode.nodeValue.length));

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      targetBlock.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });

    await new Promise(r => setTimeout(r, 300));

    const overflowDiff = await page.evaluate(() => {
      const wrapper = document.querySelector('.page__content-wrapper');
      return wrapper.scrollHeight - wrapper.clientHeight;
    });

    assert.ok(overflowDiff <= 2, `Assertion 6 FAIL: Page overflow diff is ${overflowDiff} > 2`);
    console.log(`✓ Assertion 6 PASS: Highlighted page content wrapper overflow diff is ${overflowDiff} <= 2.`);

    // -------------------------------------------------------------
    // Assertion 7: text inside a composite box (objectifs / info-box / mots-clés)
    // can be highlighted. Those boxes address each text leaf separately, so a
    // regression here means offsets are being measured against the whole box again.
    // -------------------------------------------------------------
    await page.evaluate(() => localStorage.removeItem('book_highlights'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.page', { timeout: 20000 });
    await new Promise(r => setTimeout(r, 1200));

    // Surligneur mode is not persisted, so the reload turned it off again.
    if (await page.evaluate(() => document.body.dataset.highlight) !== 'on') {
      await page.click('#btn-highlight-toggle');
      await new Promise(r => setTimeout(r, 300));
    }

    const foundBox = await page.evaluate(async () => {
      const leaf = document.querySelector(
        '.objectives-box__text[data-block-index], .info-box__item[data-block-index], .keywords__chip[data-block-index]'
      );
      if (!leaf) return { ok: false, reason: 'no composite-box leaf carries a block key' };
      // Bring its page on screen so the interaction is realistic.
      leaf.scrollIntoView?.();
      const walk = document.createTreeWalker(leaf, NodeFilter.SHOW_TEXT, null);
      const node = walk.nextNode();
      if (!node || node.nodeValue.trim().length < 4) return { ok: false, reason: 'leaf has no usable text' };
      const range = document.createRange();
      range.setStart(node, 0);
      range.setEnd(node, Math.min(8, node.nodeValue.length));
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      leaf.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
      return { ok: true, key: leaf.dataset.blockIndex, cls: leaf.className };
    });
    assert.ok(foundBox.ok, `Assertion 7 FAIL: ${foundBox.reason}`);
    await new Promise(r => setTimeout(r, 400));

    const boxMarks = await page.evaluate(() => document.querySelectorAll(
      '.objectives-box mark.hl, .info-box mark.hl, .keywords mark.hl'
    ).length);
    assert.ok(boxMarks > 0, `Assertion 7 FAIL: no highlight rendered inside the composite box (key ${foundBox.key})`);
    console.log(`✓ Assertion 7 PASS: composite box highlightable (leaf key "${foundBox.key}", ${boxMarks} mark(s)).`);

    // -------------------------------------------------------------
    // Assertion 8: undo reverts the last highlight
    // -------------------------------------------------------------
    const countStored = () => page.evaluate(() => {
      const raw = localStorage.getItem('book_highlights');
      if (!raw) return 0;
      return Object.values(JSON.parse(raw)).reduce((n, arr) => n + (arr?.length || 0), 0);
    });

    const before = await page.evaluate(() => document.querySelectorAll('mark.hl').length);
    const storedBefore = await countStored();
    assert.ok(before > 0, 'Assertion 8 FAIL: nothing highlighted to undo');

    await page.click('#btn-highlight-undo');
    await new Promise(r => setTimeout(r, 500));

    const after = await page.evaluate(() => document.querySelectorAll('mark.hl').length);
    const storedAfter = await countStored();
    assert.ok(after < before, `Assertion 8 FAIL: undo did not remove the highlight from the page (${before} -> ${after})`);
    assert.ok(storedAfter < storedBefore, `Assertion 8 FAIL: undo was not persisted (${storedBefore} -> ${storedAfter} stored range(s))`);
    console.log(`✓ Assertion 8 PASS: undo reverted the last highlight (${before} -> ${after} on page, ${storedBefore} -> ${storedAfter} stored).`);

    await browser.close();
    console.log('\nALL 8 MOBILE HIGHLIGHTER ASSERTIONS PASSED!\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ VERIFICATION FAILED:', err.message);
    process.exit(1);
  } finally {
    if (devServerProcess) {
      devServerProcess.kill();
    }
  }
}

main();
