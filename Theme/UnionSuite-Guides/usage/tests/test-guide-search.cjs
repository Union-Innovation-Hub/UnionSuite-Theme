// Exercise offline handbook search against the complete generated deliverable.
const {guidePath}=require('../build/guide-output.cjs');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../../../../.tmp-iqa-integration/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/^https?:/, route => {
      requests.push(route.request().url());
      return route.abort();
    });
    await page.emulateMedia({reducedMotion: 'reduce'});
    await page.goto(pathToFileURL(guidePath('Usage-Guide.html')).href, {waitUntil: 'load', timeout: 60000});
    const input = page.locator('#guide-search-input');
    const links = page.locator('#guide-search-results a');
    const dialog = page.locator('#guide-search-dialog');
    async function search(query) {
      await input.fill(query);
      await page.waitForTimeout(160);
    }

    await page.getByRole('button', {name: 'Search the guide'}).click();
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    await search('dark mode');
    assert.match(await links.first().innerText(), /dark mode/i);
    assert.ok(await links.locator('mark').count() > 0);
    await page.screenshot({path: '.preview/guide-search-desktop.png'});
    await input.press('Enter');
    assert.equal(await dialog.evaluate(node => node.open), false);
    assert.match(await page.locator('.guide-search-match').innerText(), /dark mode/i);
    assert.equal(await page.locator('.guide-search-match').evaluate(node => node === document.activeElement), true);

    await page.keyboard.press('Control+k');
    await search('Selector and preview rules');
    await input.press('ArrowDown');
    assert.equal(await links.first().evaluate(node => node === document.activeElement), true);
    await page.keyboard.press('ArrowUp');
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    await input.press('Enter');
    assert.equal(await page.locator('.guide-search-match').evaluate(node => node.closest('details').open), true);

    // CSS selector searches include code and author class chips, without a
    // separate pre-maintained index. Case and a leading selector dot are ignored.
    await page.keyboard.press('Control+k');
    await search('.US-TASK-COMPLETED-FILTER');
    assert.ok(await links.count() > 0);
    assert.match(await links.first().innerText(), /us-task-completed-filter/i);
    await search('UnionSuiteActions.define');
    assert.ok(await links.count() > 0);
    await search('qzx-no-such-feature');
    assert.equal(await links.count(), 0);
    assert.match(await page.locator('#guide-search-status').innerText(), /No results/);
    await search('[');
    assert.ok(await links.count() > 0, 'regex punctuation is literal search text');
    await search('<img src=x onerror=alert(1)>');
    assert.equal(await page.locator('#guide-search-results img').count(), 0);
    await search('   ');
    assert.equal(await links.count(), 0);
    assert.match(await page.locator('#guide-search-status').innerText(), /Start typing/);
    await input.press('Escape');
    assert.equal(await dialog.evaluate(node => node.open), false);

    // Existing table filters remain independent; jumping into a hidden row
    // clears only that table's filter so the chosen destination becomes visible.
    await page.locator('#class-search').fill('no-matching-class');
    assert.equal(await page.locator('#class-table tbody tr:visible').count(), 0);
    await page.keyboard.press('Control+k');
    await search('us-report-no-styling');
    const rowLink = await links.evaluateAll(nodes => nodes.find(node => document.getElementById(node.dataset.guideTarget)?.closest('#class-table'))?.dataset.guideTarget);
    assert.ok(rowLink, 'global search can find a filtered class-reference row');
    await page.locator('[data-guide-target="' + rowLink + '"]').click();
    assert.equal(await page.locator('#class-search').inputValue(), '');
    assert.equal(await page.locator('#' + rowLink).isVisible(), true);
    assert.match(await page.locator('#' + rowLink).innerText(), /us-report-no-styling/);

    // Shortcut also works while interacting with a self-contained example frame.
    await page.frameLocator('#banner-demo').locator('body').dispatchEvent('keydown', {key: 'k', ctrlKey: true, bubbles: true});
    assert.equal(await dialog.evaluate(node => node.open), true);
    await search('popup');
    await page.setViewportSize({width: 390, height: 844});
    await page.screenshot({path: '.preview/guide-search-mobile.png'});
    const dimensions = await dialog.boundingBox();
    assert.ok(dimensions.x >= 0 && dimensions.x + dimensions.width <= 390);
    assert.ok(dimensions.y >= 0 && dimensions.y + dimensions.height <= 844);
    assert.equal(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth), true);
    await page.getByRole('button', {name: 'Close guide search'}).click();
    assert.equal(await dialog.evaluate(node => node.open), false);
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'search and the guide need no network');
    console.log('PASS: offline search, excerpts, classes/code, keyboard, closed references, filtered rows, example-frame shortcut and mobile layout.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
