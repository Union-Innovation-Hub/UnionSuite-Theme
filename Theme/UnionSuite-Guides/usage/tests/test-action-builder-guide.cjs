// Verify the embedded authoring workflow in the portable guide, not a fetched copy.
const {guidePath}=require('../build/guide-output.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../../../../.tmp-iqa-integration/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    await page.route(/^https?:/, route => route.abort());
    await page.emulateMedia({reducedMotion: 'reduce'});
    const url = pathToFileURL(guidePath('Usage-Guide.html')).href;
    await page.goto(url + '#action-builder', {waitUntil: 'load', timeout: 60000});
    const builder = page.frameLocator('#action-builder-frame');
    const live = builder.frameLocator('#action-preview');
    const appearance = builder.frameLocator('#appearance-preview');
    await live.getByRole('button', {name: 'Edit job', exact: true}).waitFor();
    const builderFrame = await (await page.$('#action-builder-frame')).contentFrame();
    assert.equal(await page.locator('#action-builder-frame').getAttribute('src'), null);
    assert.equal(await builder.locator('.builder-header').isVisible(), false);
    assert.equal(await builder.locator('.builder-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 2);

    await live.getByRole('button', {name: 'Edit job', exact: true}).click();
    assert.match(await live.locator('#sample-destination').textContent(), /ID=103885/);
    await live.getByRole('button', {name: 'Close example'}).click();
    await builderFrame.waitForFunction(() => document.querySelector('#simulation-status').textContent.includes('originating native IQA'));

    await builder.locator('#label').fill('Edit selected job');
    await builder.locator('#icon').selectOption('ti-mail');
    await appearance.locator('.ti-mail').waitFor();
    await appearance.getByRole('button', {name: 'Edit selected job', exact: true}).waitFor();
    assert.match(await builder.locator('#code-js').textContent(), /Edit selected job/);
    await page.locator('.sidebar a[href="#classes"]').click();
    await page.locator('.sidebar a[href="#action-builder"]').click();
    assert.equal(await builder.locator('#label').inputValue(), 'Edit selected job', 'guide navigation preserves the draft');

    // Clipboard output is owned by the tool rather than guide example handlers.
    await builderFrame.evaluate(() => Object.defineProperty(navigator, 'clipboard', {
      configurable: true, value: {writeText: async text => { window.copiedText = text; }}
    }));
    await builder.locator('[data-copy="js"]').click();
    assert.equal(await builderFrame.evaluate(() => window.copiedText), await builder.locator('#code-js').textContent());
    await builder.locator('#tab-html').click();
    await builder.locator('[data-copy="html"]').click();
    assert.equal(await builderFrame.evaluate(() => window.copiedText), await builder.locator('#code-html').textContent());
    assert.match(await builder.locator('#code-html').textContent(), /data-seqn="22"/);
    const exported = page.waitForEvent('download');
    await builder.locator('#download-js').click();
    const registration = await exported;
    assert.equal(fs.readFileSync(await registration.path(), 'utf8'), await builder.locator('#code-js').textContent());
    const saved = page.waitForEvent('download');
    await builder.locator('#download-draft').click();
    const draft = fs.readFileSync(await (await saved).path(), 'utf8');
    await builder.locator('#label').fill('Temporary edit');
    await builder.locator('#load-draft').setInputFiles({name: 'saved.json', mimeType: 'application/json', buffer: Buffer.from(draft)});
    assert.equal(await builder.locator('#label').inputValue(), 'Edit selected job');

    // Search can reach the tool and its shortcut works while editing the form.
    await builder.locator('#label').press('Control+k');
    assert.equal(await page.locator('#guide-search-dialog').evaluate(node => node.open), true);
    await page.locator('#guide-search-input').fill('action builder');
    await page.locator('#guide-search-input').press('Enter');
    assert.match(await page.locator('.guide-search-match').textContent(), /Action builder/);
    await builderFrame.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Ready.'));
    await builderFrame.evaluate(() => {
      window.scrollTo(0, 0);
      document.querySelector('.builder-result').scrollTop = 0;
    });
    await page.evaluate(() => document.activeElement.blur());
    await page.locator('#action-builder').evaluate(node => node.scrollIntoView({block: 'start', behavior: 'instant'}));
    await page.screenshot({path: '.preview/action-builder-guide-desktop.png'});

    await page.setViewportSize({width: 390, height: 844});
    await page.locator('#action-builder').evaluate(node => node.scrollIntoView({block: 'start', behavior: 'instant'}));
    const dimensions = await page.evaluate(() => {
      const section = document.querySelector('#action-builder');
      const withBuilder = document.documentElement.scrollWidth;
      const right = section.getBoundingClientRect().right;
      section.hidden = true;
      const withoutBuilder = document.documentElement.scrollWidth;
      section.hidden = false;
      return {right, withBuilder, withoutBuilder};
    });
    assert(dimensions.right <= 390 && dimensions.withBuilder <= dimensions.withoutBuilder, 'builder adds no horizontal overflow to the guide');
    assert(await builderFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await builder.locator('.builder-layout').evaluate(node => getComputedStyle(node).gridTemplateColumns.split(' ').length), 1);
    await page.screenshot({path: '.preview/action-builder-guide-mobile.png'});
    await builder.locator('#label').fill('Mobile edit');
    await appearance.getByRole('button', {name: 'Mobile edit', exact: true}).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, [], 'the integrated workflow stays offline');
    console.log('PASS: guide builder, sidebar/search, preserved drafts, nested previews, simulated refresh, clipboard, downloads/import and responsive offline layout.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
