// Bookmark hydration and editing use local responses only, never a tenant.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteTaskbar-Bookmarks.js', 'utf8');
const primary = 'community.groups';
const added = 'community.communities';
const star = id => '[data-star="' + id + '"]';

async function fixture(browser) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent('<html lang="en"><body><input id="__ClientContext" type="hidden">' +
    '<input id="__RequestVerificationToken" value="fixture-token" type="hidden">' +
    '<header id="hd"><div id="masterTopBarAuxiliary"><div id="injected-taskbar">' +
    '<nav class="us-taskbar__quick-links"></nav></div></div></header></body></html>');
  await page.addStyleTag({ content: fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8').replace(/@import\s+[^;]+;/g, '') });
  await page.evaluate(() => {
    document.getElementById('__ClientContext').value = JSON.stringify({ loggedInPartyId: '123', websiteRoot: 'https://fixture.test/' });
    window.requests = [];
    window.reads = [];
    window.fetch = (url, options) => {
      requests.push({ url: String(url), method: options.method, body: options.body });
      if (options.method === 'GET') return new Promise(resolve => reads.push(resolve));
      return Promise.resolve(new Response(JSON.stringify({ Ordinal: 9 }), { status: 200 }));
    };
  });
  await page.addScriptTag({ content: script });
  await page.waitForFunction(() => reads.length === 1);
  await page.locator('[data-open="palette"]').click();
  return page;
}

async function settleRead(page, index, ids, ordinal = 8, status = 200) {
  await page.evaluate(({ index, ids, ordinal, status }) => {
    const rows = ids.length ? [{ Properties: { $values: [
      { Name: 'Ordinal', Value: { $type: 'System.Int32', $value: ordinal } },
      { Name: 'Value', Value: JSON.stringify(ids) }
    ] } }] : [];
    reads[index](new Response(JSON.stringify({ Items: { $values: rows } }), { status }));
  }, { index, ids, ordinal, status });
}

async function ready(page) {
  await page.waitForFunction(() => document.getElementById('us-tb-bookmarks-status').textContent === 'Star to bookmark');
}

async function writes(page, count) {
  await page.waitForFunction(count => requests.filter(request => request.method !== 'GET').length === count, count);
  return page.evaluate(() => requests.filter(request => request.method !== 'GET'));
}

function savedIds(request) {
  const value = JSON.parse(request.body).Properties.$values.find(property => property.Name === 'Value').Value;
  return JSON.parse(value);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await fixture(browser);
    try {
      assert.equal(await page.locator(star(added)).isDisabled(), true);
      assert.equal(await page.locator('#us-tb-bookmarks-retry').isVisible(), false);
      // dispatchEvent bypasses native disabled-button suppression: the handler
      // also has to refuse edits while the saved row's identity is unknown.
      await page.locator(star(added)).dispatchEvent('click');
      assert.deepEqual(await page.evaluate(() => UnionSuiteTaskbarBookmarks.getBookmarks()), []);
      assert.equal(await page.evaluate(() => requests.length), 1, 'no write before the read resolves');
      await page.locator('#us-tb-palette-query').fill('Community');
      assert(await page.locator('.us-destination').count() > 0, 'search and navigation remain available');
      assert.match(await page.locator('.us-destination').first().getAttribute('href'), /^https:\/\/fixture\.test\//);
      await page.locator('#us-tb-palette-query').fill('');
      await settleRead(page, 0, [primary]);
      await ready(page);
      assert.equal(await page.locator(star(primary)).getAttribute('aria-pressed'), 'true', 'open palette reflects loaded bookmarks');
      await page.locator(star(added)).click();
      let sent = await writes(page, 1);
      assert.equal(sent[0].method, 'PUT');
      assert(sent[0].url.endsWith('/123/8'));
      assert.deepEqual(savedIds(sent[0]), [primary, added]);
      await page.locator('[data-palette-handle="' + added + '"]').press('Alt+ArrowUp');
      sent = await writes(page, 2);
      assert.deepEqual(savedIds(sent[1]), [added, primary], 'reordering is available after loading');
      await page.evaluate(() => {
        const bar = document.getElementById('injected-taskbar');
        bar.replaceWith(bar.cloneNode(true));
      });
      await page.waitForFunction(() => document.querySelectorAll('#us-tb-bookmarks .us-pin').length === 2);
      assert.deepEqual(await page.evaluate(() => UnionSuiteTaskbarBookmarks.getBookmarks()), [added, primary]);
      assert.equal(await page.evaluate(() => reads.length), 1, 'partial remount preserves loaded state');
      assert.deepEqual(page.errors, []);
      console.log('PASS: delayed existing settings block early writes, update the open palette, retain existing pins and save/reorder using PUT.');
    } finally { await page.close(); }

    const retryPage = await fixture(browser);
    try {
      await settleRead(retryPage, 0, [], 8, 500);
      await retryPage.locator('#us-tb-bookmarks-retry').waitFor({ state: 'visible' });
      assert.equal(await retryPage.locator(star(added)).isDisabled(), true);
      await retryPage.locator(star(added)).dispatchEvent('click');
      assert.equal(await retryPage.evaluate(() => requests.length), 1, 'failed reads cannot be treated as an empty account');
      await retryPage.setViewportSize({ width: 390, height: 844 });
      await retryPage.screenshot({ path: '.preview/bookmarks-load-retry.png' });
      const fits = await retryPage.locator('#us-tb-palette').evaluate(node => node.scrollWidth <= node.clientWidth + 1);
      assert(fits, 'failure and Retry fit the narrow palette');
      await retryPage.locator('#us-tb-bookmarks-retry').click();
      await retryPage.waitForFunction(() => reads.length === 2);
      await retryPage.locator('#us-tb-bookmarks-retry').dispatchEvent('click');
      assert.equal(await retryPage.evaluate(() => reads.length), 2, 'retry cannot launch duplicate reads');
      await settleRead(retryPage, 1, []);
      await ready(retryPage);
      // With no bookmarks only the bar offers Add bookmarks; the header strip
      // leaves it to Go to…, which opens the same palette.
      const prompts = await retryPage.evaluate(() => ({
        strip: document.querySelectorAll('#us-tb-bookmarks button').length,
        bar: [...document.querySelectorAll('#us-tb-bookmarks-bar button')].filter(button => button.textContent.trim() === 'Add bookmarks').length
      }));
      assert.deepEqual(prompts, { strip: 0, bar: 1 }, 'an empty header strip has no Add bookmarks; the bar keeps one');
      await retryPage.locator(star(primary)).click();
      await writes(retryPage, 1);
      await retryPage.locator(star(added)).click();
      const sent = await writes(retryPage, 2);
      assert.deepEqual(sent.map(request => request.method), ['POST', 'PUT']);
      assert(sent[1].url.endsWith('/123/9'));
      assert.deepEqual(savedIds(sent[1]), [primary, added]);
      assert.equal(await retryPage.locator('#us-tb-bookmarks-retry').isVisible(), false);
      assert.deepEqual(retryPage.errors, []);
      console.log('PASS: failed reads hold edits, Retry recovers, and a confirmed empty account creates once then updates.');
    } finally { await retryPage.close(); }

    const replacementPage = await fixture(browser);
    try {
      await replacementPage.evaluate(() => {
        UnionSuiteTaskbarBookmarks.destroy();
        UnionSuiteTaskbarBookmarks.initialise();
      });
      await replacementPage.waitForFunction(() => reads.length === 2);
      await replacementPage.locator('[data-open="palette"]').click();
      await settleRead(replacementPage, 1, [primary], 12);
      await ready(replacementPage);
      await settleRead(replacementPage, 0, [added], 8);
      await replacementPage.locator(star(added)).click();
      const sent = await writes(replacementPage, 1);
      assert(sent[0].url.endsWith('/123/12'), 'stale read cannot replace the current row identity');
      assert.deepEqual(savedIds(sent[0]), [primary, added], 'stale read cannot replace the current pins');
      assert.deepEqual(replacementPage.errors, []);
      console.log('PASS: a read from a destroyed instance cannot overwrite a later instance.');
    } finally { await replacementPage.close(); }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
