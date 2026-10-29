const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const { chromium } = require(path.join(root, '.tmp-iqa-integration/node_modules/playwright'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const theme = 'Theme/UnionSuite/';
const guides = 'Theme/UnionSuite-Guides/';

// Use the maintained native report fixture, with the captured report's hidden
// query columns and a native utility column. No runtime markers are authored.
let markup = read(guides + 'usage/source/IQA-Example.source.html')
  .replace('us-report us-report-expandable', 'ReportCollection us-report-expandable')
  .replace('<table class="rgMasterTable">', '<table class="rgMasterTable" id="fullscreen-table"><colgroup><col style="width:36px"><col><col><col><col><col><col style="display:none"><col style="display:none"></colgroup>')
  .replace('<thead><tr>', '<thead><tr><th class="rgHeader rgExpandCol" style="width:36px" aria-label="ExpandColumn">Expand Collapse</th>')
  .replace('</tr></thead>', '<th class="rgHeader" style="display:none">code WID</th><th class="rgHeader" style="display:none">code RootId</th></tr></thead>')
  .replace('colspan="5"', 'colspan="8"')
  .replace('{{IQA_ROWS}}', Array.from({ length: 15 }, (_, i) => `<tr class="rgRow"><td class="rgExpandCol"></td><td>1040${i}</td><td>Sample member ${i + 1}</td><td>Metro</td><td>Active</td><td>View</td><td style="display:none">1</td><td style="display:none">2</td></tr>`).join(''));
const native = (read(guides + 'usage/vendor/10-UltraWaveResponsive.css') + read(theme + '99-Orion.css'))
  .replace(/@import\s+[^;]+;/g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
const lifecycle = `
  window.nativeReport = document.querySelector('#sample-report').outerHTML;
  window.fixtureEvents = {};
  const manager = {};
  for (const name of ['beginRequest', 'endRequest', 'pageLoading']) {
    fixtureEvents[name] = [];
    manager['add_' + name] = handler => fixtureEvents[name].push(handler);
    manager['remove_' + name] = handler => fixtureEvents[name] = fixtureEvents[name].filter(item => item !== handler);
  }
  window.Sys = { Application: { add_load() {} }, WebForms: { PageRequestManager: { getInstance: () => manager } } };
`;
const html = `<!doctype html><html><head><style>${native}\n${read(theme + 'zUnionSuite.css')}</style></head><body>${markup}<style>#sample-form > .ContentItemContainer{width:900px;max-width:100%}</style><script>${lifecycle}\n${read(theme + 'zUnionSuite.js')}</script></body></html>`;

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent(html);
    await page.locator('[data-us-iqa-column-table]').waitFor();
    const widths = () => page.locator('#fullscreen-table th').evaluateAll(heads => heads.map(head => head.getBoundingClientRect().width));
    const settled = () => page.waitForFunction(() => {
      const report = document.querySelector('#sample-report');
      return report.hasAttribute('data-us-iqa-expanded') && !report.hasAttribute('data-us-iqa-window-animating');
    });
    const fills = () => page.waitForFunction(() => {
      const table = document.querySelector('#fullscreen-table');
      return Math.abs(table.getBoundingClientRect().width - table.parentElement.clientWidth) < 2;
    }, null, { timeout: 3000 });
    const normal = await widths();
    const nativeTable = await page.locator('#fullscreen-table').elementHandle();
    await page.getByRole('button', { name: 'Expand report', exact: true }).click();
    await settled();
    await fills();
    assert(await nativeTable.evaluate(table => table === document.querySelector('#fullscreen-table')), 'Keep the native table');
    const expanded = await widths();
    assert(expanded[1] > normal[1], 'Distribute additional fullscreen space');
    assert.equal(expanded[0], normal[0], 'Keep the native utility width');
    assert.deepEqual(expanded.slice(-2), [0, 0], 'Hidden columns stay hidden');
    assert.equal(await page.locator('.us-iqa-column-resizer').count(), 5);

    // Resizing in fullscreen must use the displayed width, retain its minimum,
    // and leave the normal panel's widths unchanged on Restore.
    const memberHandle = page.locator('#fullscreen-table th').nth(2).locator('.us-iqa-column-resizer');
    const memberWidth = Number(await memberHandle.getAttribute('aria-valuenow'));
    await memberHandle.press('ArrowLeft');
    assert.equal(Number(await memberHandle.getAttribute('aria-valuenow')), memberWidth - 10);
    await fills();
    const resized = await widths();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-us-iqa-expanded]'));
    await page.waitForFunction(expected => Array.from(document.querySelectorAll('#fullscreen-table th')).every((head, i) => Math.abs(head.getBoundingClientRect().width - expected[i]) < 1), normal);

    await page.getByRole('button', { name: 'Expand report', exact: true }).click();
    await settled();
    await fills();
    const reopened = await widths();
    reopened.forEach((value, i) => assert(Math.abs(value - resized[i]) < 1, 'Keep fullscreen widths on repeat opening'));
    await page.setViewportSize({ width: 1680, height: 900 });
    await fills();
    await page.screenshot({ path: path.join(root, '.preview/iqa-fullscreen-columns.png') });

    // Reduced motion follows the same sizing/restore lifecycle.
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-us-iqa-expanded]'));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.getByRole('button', { name: 'Expand report', exact: true }).click();
    await settled();
    await fills();
    assert.equal(await page.locator('[data-us-iqa-window-animating]').count(), 0);

    await page.evaluate(() => {
      fixtureEvents.pageLoading.forEach(handler => handler());
      document.querySelector('#sample-report').outerHTML = nativeReport;
      fixtureEvents.endRequest.forEach(handler => handler(null, { get_error: () => null }));
    });
    await settled();
    await fills();
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('[data-us-iqa-expanded]'));
    await page.waitForFunction(expected => Array.from(document.querySelectorAll('#fullscreen-table th')).every((head, i) => Math.abs(head.getBoundingClientRect().width - expected[i]) < 1), normal);

    await page.getByRole('button', { name: 'Expand report', exact: true }).click();
    await settled();
    const drag = page.locator('#fullscreen-table th').nth(2).locator('.us-iqa-column-resizer');
    const bounds = await drag.boundingBox();
    const beforeDrag = Number(await drag.getAttribute('aria-valuenow'));
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.down();
    await page.mouse.move(bounds.x + bounds.width / 2 + 70, bounds.y + bounds.height / 2, { steps: 5 });
    await page.mouse.up();
    assert.equal(Number(await drag.getAttribute('aria-valuenow')), beforeDrag + 70);
    assert(await page.locator('.us-iqa-data-scroll').evaluate(scroll => scroll.scrollWidth > scroll.clientWidth + 60), 'Wider columns scroll');
    assert.deepEqual(errors, []);
    console.log('Passed: first fullscreen fills the viewport; native table, utility/hidden columns, keyboard/pointer resizing, normal Restore widths, repeat opening, viewport resize, reduced motion, native partial replacement and horizontal scrolling.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
