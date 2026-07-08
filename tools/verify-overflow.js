import puppeteer from 'puppeteer';
import http from 'http';

function checkUrlReachable(urlStr) {
  return new Promise((resolve) => {
    try {
      const url = new URL(urlStr);
      const req = http.request({
        method: 'HEAD',
        host: url.hostname,
        port: url.port || 80,
        path: url.pathname,
        timeout: 3000
      }, (res) => {
        resolve(true);
      });
      
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

async function runViewportCheck(targetUrl, viewport) {
  console.log(`\nChecking viewport: ${viewport.width}x${viewport.height}`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const overflows = new Set();
  
  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);
    
    // Inject mock student profile to bypass NamePrompt screen
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('book_student_profile', JSON.stringify({ name: 'Test Student' }));
    });
    
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('OVERFLOW page')) {
        const match = text.match(/OVERFLOW page\s+(\S+)/);
        if (match) {
          overflows.add(match[1]);
        } else {
          overflows.add(text);
        }
      }
    });
    
    await page.goto(targetUrl, { waitUntil: 'networkidle0', timeout: 20000 });
    
    // Wait for the book footer navigation buttons to render
    await page.waitForSelector('#btn-next-page', { timeout: 10000 });
    
    // Let the initial render settle
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    let hasNext = true;
    let pageNum = 1;
    while (hasNext) {
      const nextButton = await page.$('#btn-next-page');
      if (!nextButton) break;
      
      const isDisabled = await page.evaluate(el => el.disabled, nextButton);
      if (isDisabled) {
        hasNext = false;
      } else {
        await nextButton.click();
        pageNum++;
        // Wait for page transition flip animation (600ms) plus a bit extra
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    
    console.log(`Successfully swept through ${pageNum} pages.`);
    return Array.from(overflows);
  } finally {
    await browser.close();
  }
}

async function main() {
  let targetUrl = 'http://localhost:5173/faculty-edu-french/';
  const urlFlagIdx = process.argv.indexOf('--url');
  if (urlFlagIdx !== -1 && process.argv[urlFlagIdx + 1]) {
    targetUrl = process.argv[urlFlagIdx + 1];
  }
  
  console.log(`Checking connection to dev server at: ${targetUrl}`);
  const reachable = await checkUrlReachable(targetUrl);
  if (!reachable) {
    console.error(`\n[ERROR] Dev server is not reachable at ${targetUrl}.`);
    console.error(`Please start the dev server (e.g., "npm run dev") before running this script.`);
    process.exit(1);
  }
  console.log('Dev server is reachable.');
  
  const viewports = [
    { width: 360, height: 640 },
    { width: 1400, height: 900 }
  ];
  
  let totalOverflowsCount = 0;
  const results = {};
  
  for (const viewport of viewports) {
    try {
      const overflows = await runViewportCheck(targetUrl, viewport);
      results[`${viewport.width}x${viewport.height}`] = overflows;
      totalOverflowsCount += overflows.length;
    } catch (err) {
      console.error(`Failed during check for viewport ${viewport.width}x${viewport.height}:`, err);
      process.exit(1);
    }
  }
  
  console.log('\n======================================');
  console.log('OVERFLOW CHECK SUMMARY:');
  for (const [vp, overflows] of Object.entries(results)) {
    if (overflows.length === 0) {
      console.log(`- Viewport ${vp}: 0 overflows (PASS)`);
    } else {
      console.log(`- Viewport ${vp}: ${overflows.length} overflow(s) (FAIL)`);
      overflows.forEach(id => console.log(`  * Overflow on page: ${id}`));
    }
  }
  console.log('======================================');
  
  if (totalOverflowsCount > 0) {
    console.log('\nFAIL: Page overflows were detected.');
    process.exit(1);
  } else {
    console.log('\nPASS: Zero overflows detected.');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error in verify-overflow script:', err);
  process.exit(1);
});
