// Taskbar side pane: page gating, toggle placement, opening, tabs and taskbar
// remounts. Local fixture only, never a tenant.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const script = fs.readFileSync('THeme/UnionSuite/Scripts/UnionSuiteSidePane.js', 'utf8');
const css = fs.readFileSync('THeme/UnionSuite/zUnionSuite.css', 'utf8').replace(/@import\s+[^;]+;/g, '');

// A header whose taskbar arrives after the script, as on a live page.
async function fixture(browser, { casePage = true, reducedMotion = 'no-preference' } = {}) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, reducedMotion });
  page.errors = [];
  page.on('pageerror', error => page.errors.push(error.message));
  await page.route('**/*', route => route.abort());
  await page.setContent('<html lang="en" data-us-case-access="granted"><body' + (casePage ? ' class="us-case-page"' : '') + '>' +
    '<header id="hd" style="padding:12px"><div id="masterTopBarAuxiliary"></div></header>' +
    '<main class="main" style="height:1600px">Page</main></body></html>');
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: script });
  await page.evaluate(() => {
    const bar = document.createElement('div');
    bar.id = 'injected-taskbar';
    bar.className = 'us-taskbar';
    bar.style.display = 'flex';
    bar.innerHTML = '<button type="button" class="us-taskbar__theme-toggle" style="order:1">Theme</button>' +
      '<button type="button" class="us-bookmarks-toggle" id="us-tb-bookmarks-toggle" style="order:2">Star</button>';
    document.getElementById('masterTopBarAuxiliary').append(bar);
  });
  return page;
}

const toggle = '#us-side-pane-toggle';
const settled = page => page.waitForTimeout(260);

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const other = await fixture(browser, { casePage: false });
    try {
      await other.waitForTimeout(50);
      assert.equal(await other.locator(toggle).count(), 0, 'no toggle on a page without tabs');
      assert.equal(await other.evaluate(() => UnionSuiteSidePane.isOpen()), false);
      assert.deepEqual(other.errors, []);
      console.log('PASS: a page with no tabs gets no toggle.');
    } finally { await other.close(); }

    const page = await fixture(browser);
    try {
      await page.locator(toggle).waitFor();
      const order = await page.evaluate(() => [...document.querySelectorAll('#injected-taskbar > *')]
        .sort((a, b) => getComputedStyle(a).order - getComputedStyle(b).order).map(node => node.id || node.className));
      assert.equal(order.at(-1), 'us-side-pane-toggle', 'the toggle closes the taskbar row, after the star');
      assert.equal(await page.locator(toggle).getAttribute('aria-expanded'), 'false');
      assert.equal(await page.locator(toggle).getAttribute('title'), 'Show side pane');

      await page.locator(toggle).click();
      await settled(page);
      assert.equal(await page.locator(toggle).getAttribute('aria-expanded'), 'true');
      assert.equal(await page.locator(toggle).getAttribute('title'), 'Hide side pane');
      assert.equal(await page.locator('.us-side-pane__title').textContent(), 'Case help');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'us-side-pane-title', 'focus moves to the title');
      assert.equal(await page.locator('.us-side-pane__tabs').isVisible(), false, 'one tab: no tab strip');
      assert.equal(await page.locator('.us-side-chat__input').isDisabled(), true, 'the chat is a placeholder');
      const placed = await page.evaluate(() => ({
        top: Math.round(document.getElementById('us-side-pane').getBoundingClientRect().top),
        header: Math.round(document.getElementById('hd').getBoundingClientRect().bottom),
        right: Math.round(document.getElementById('us-side-pane').getBoundingClientRect().right)
      }));
      assert.equal(placed.top, placed.header, 'the pane starts at the header edge');
      assert.equal(placed.right, 1200, 'the pane sits at the right edge');
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(100);
      assert.equal(await page.evaluate(() => Math.round(document.getElementById('us-side-pane').getBoundingClientRect().top)), 0, 'the pane rises as the header scrolls away');
      await page.mouse.wheel(0, -400);
      await page.screenshot({ path: '.preview/side-pane-open.png' });

      await page.keyboard.press('Escape');
      await settled(page);
      assert.equal(await page.evaluate(() => UnionSuiteSidePane.isOpen()), false, 'Escape inside the pane closes it');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'us-side-pane-toggle', 'focus returns to the toggle');

      // A second tab shows the strip; arrow keys move between tabs.
      await page.evaluate(() => {
        window.renders = 0;
        UnionSuiteSidePane.register({ id: 'second', label: 'Second', icon: 'lifebuoy', pages: ['case'], order: 20,
          render(panel) { window.renders++; panel.append('Second tab'); } });
      });
      await page.waitForTimeout(20);
      await page.locator(toggle).click();
      await settled(page);
      assert.equal(await page.locator('.us-side-pane__tabs').isVisible(), true, 'two tabs: the strip shows');
      await page.locator('#us-side-pane-tab-case-help').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('.us-side-pane__title').textContent(), 'Second');
      assert.equal(await page.locator('#us-side-pane-tab-second').getAttribute('aria-selected'), 'true');
      assert.equal(await page.locator('#us-side-pane-panel-case-help').isHidden(), true);
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('End');
      assert.equal(await page.evaluate(() => window.renders), 1, 'a tab renders once');
      await page.screenshot({ path: '.preview/side-pane-tabs.png' });

      // The toggle closes the pane; clicking the page does not.
      await page.locator('main').click({ position: { x: 20, y: 20 } });
      assert.equal(await page.evaluate(() => UnionSuiteSidePane.isOpen()), true, 'non-modal: clicking the page keeps it open');
      await page.locator(toggle).click();
      await settled(page);
      assert.equal(await page.evaluate(() => UnionSuiteSidePane.isOpen()), false);

      // A replaced taskbar gets the toggle back.
      await page.evaluate(() => {
        const bar = document.getElementById('injected-taskbar');
        const copy = bar.cloneNode(true);
        copy.querySelector('#us-side-pane-toggle')?.remove();
        bar.replaceWith(copy);
      });
      await page.waitForFunction(() => document.querySelector('#injected-taskbar #us-side-pane-toggle'));
      await page.locator(toggle).click();
      await settled(page);
      assert.equal(await page.evaluate(() => UnionSuiteSidePane.isOpen()), true, 'the remounted toggle still opens the pane');

      const rejected = await page.evaluate(() => { try { UnionSuiteSidePane.register({ id: 'x' }); return false; } catch (_) { return true; } });
      assert.equal(rejected, true, 'a tab without a label and render is refused');
      assert.deepEqual(page.errors, []);
      console.log('PASS: toggle placement, opening, focus, Escape, tabs, render-once and taskbar remount.');
    } finally { await page.close(); }

    const narrow = await fixture(browser);
    try {
      await narrow.setViewportSize({ width: 420, height: 760 });
      await narrow.locator(toggle).waitFor();
      const size = await narrow.locator(toggle).evaluate(node => [node.offsetWidth, node.offsetHeight]);
      assert.deepEqual(size, [44, 44], 'touch-sized toggle at narrow widths');
      await narrow.locator(toggle).click();
      await settled(narrow);
      assert.equal(await narrow.evaluate(() => Math.round(document.getElementById('us-side-pane').getBoundingClientRect().width)), 420, 'full width on a phone');
      await narrow.screenshot({ path: '.preview/side-pane-narrow.png' });
      assert.deepEqual(narrow.errors, []);
      console.log('PASS: touch sizes and full width at 420px.');
    } finally { await narrow.close(); }

    const reduced = await fixture(browser, { reducedMotion: 'reduce' });
    try {
      await reduced.locator(toggle).waitFor();
      await reduced.locator(toggle).click();
      const transition = await reduced.locator('#us-side-pane').evaluate(node => getComputedStyle(node).transitionDuration);
      assert.match(transition, /^0s(, 0s)*$/, 'reduced motion opens instantly');
      console.log('PASS: reduced motion.');
    } finally { await reduced.close(); }
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
