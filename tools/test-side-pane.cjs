// Taskbar side pane: page gating, toggle placement, opening, tabs, taskbar
// remounts, and the Case help chat answering from the case guide. Local
// fixture only, never a tenant: a stand-in origin serves the page and the
// guide built in memory from docs/user-guide/.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const { loadArea, helpJson, pageHtml, GUIDE, MATCHER } = require('./build-user-guide.cjs');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteSidePane.js', 'utf8');
const matcher = fs.readFileSync(MATCHER, 'utf8');
const css = fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8').replace(/@import\s+[^;]+;/g, '');
const guideHtml = pageHtml(helpJson(loadArea(path.join(GUIDE, 'cases'))));

const ORIGIN = 'https://uhub.test';
const GUIDE_URL = ORIGIN + '/App_Themes/UnionSuite-Guide/Cases-Help.html';

// A header whose taskbar arrives after the script, as on a live page.
// guide: false makes the guide request fail, as before the page is uploaded.
async function fixture(browser, { casePage = true, reducedMotion = 'no-preference', guide = true } = {}) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, reducedMotion });
  page.errors = [];
  page.warnings = [];
  page.guideRequests = 0;
  page.on('pageerror', error => page.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'warning') page.warnings.push(message.text()); });
  const body = '<html lang="en" data-us-case-access="granted"><body' + (casePage ? ' class="us-case-page"' : '') + '>' +
    '<header id="hd" style="padding:12px"><div id="masterTopBarAuxiliary"></div></header>' +
    '<main class="main" style="height:1600px">Page</main></body></html>';
  // Off the case page, the path must not match the case test either.
  const pageUrl = ORIGIN + (casePage ? '/Cases_ManageCase.aspx' : '/Default.aspx');
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url === pageUrl) return route.fulfill({ contentType: 'text/html', body });
    if (url === GUIDE_URL) {
      page.guideRequests++;
      return guide
        ? route.fulfill({ contentType: 'text/html', body: guideHtml })
        : route.fulfill({ status: 404, contentType: 'text/html', body: 'Not found' });
    }
    return route.abort();
  });
  await page.goto(pageUrl);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: matcher });
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

    const chat = await fixture(browser);
    try {
      await chat.locator(toggle).waitFor();
      await chat.locator(toggle).click();
      const input = chat.locator('.us-side-chat__input');
      const send = chat.locator('.us-side-chat__send');
      await chat.locator('.us-side-chat__chip').first().waitFor();
      assert.equal(await input.isDisabled(), false, 'the box opens once the guide has loaded');
      assert.equal(await send.isDisabled(), true, 'Send waits for a question');
      assert.deepEqual(await chat.locator('.us-side-chat__chip').allTextContents(),
        ['how do I close a case', 'add a note', 'who can see this case'], 'the guide\'s examples are the greeting\'s chips');
      assert.equal(await chat.locator('.us-side-chat__note a').getAttribute('href'), GUIDE_URL);

      // A typed question, sent with Enter, answers from its topic.
      await input.fill('how do I close this case');
      assert.equal(await send.isDisabled(), false);
      await input.press('Enter');
      const last = chat.locator('.us-side-chat__message--assistant').last();
      assert.equal(await chat.locator('.us-side-chat__message--user').last().textContent(), 'how do I close this case');
      assert.match(await last.locator('p').first().textContent(), /Resolve case/);
      assert.equal(await last.locator('.us-side-chat__source').getAttribute('href'), GUIDE_URL + '#resolve-and-close',
        'the answer links its topic on the hosted guide');
      assert.equal(await last.locator('.us-side-chat__source').getAttribute('target'), '_blank');
      assert.equal(await input.inputValue(), '', 'the box empties once sent');

      // Show the steps unfolds the topic's own steps in the answer.
      const stepsToggle = last.locator('.us-side-chat__steps-toggle');
      assert.equal(await last.locator('.us-side-chat__steps').isHidden(), true);
      await stepsToggle.click();
      await chat.waitForTimeout(300);
      assert.equal(await stepsToggle.getAttribute('aria-expanded'), 'true');
      assert.equal(await stepsToggle.textContent(), 'Hide the steps');
      assert.ok(await last.locator('.us-side-chat__steps ol li').count() > 1, 'the steps are the topic\'s list');

      // A link between topics in the steps answers in the chat, not by leaving.
      await input.fill('what are the tabs on a case');
      await send.click();
      const layout = chat.locator('.us-side-chat__message--assistant').last();
      await layout.locator('.us-side-chat__steps-toggle').click();
      await chat.waitForTimeout(300);
      await layout.locator('.us-side-chat__steps a[href="#read-the-banner"]').click();
      assert.equal(await chat.locator('.us-side-chat__message--user').last().textContent(), 'Read the banner');
      assert.equal(await chat.locator('.us-side-chat__source').last().getAttribute('href'), GUIDE_URL + '#read-the-banner');
      assert.equal(chat.url(), ORIGIN + '/Cases_ManageCase.aspx', 'the case page stays put');

      // A question it cannot place says so and offers the guide.
      await input.fill('zebra crossing');
      await input.press('Enter');
      const unsure = chat.locator('.us-side-chat__message--assistant').last();
      assert.match(await unsure.textContent(), /could not find that|not sure/);
      assert.equal(await unsure.locator('.us-side-chat__source').getAttribute('href'), GUIDE_URL);

      // A suggested question asks itself.
      await chat.locator('.us-side-chat__message--assistant').first().locator('.us-side-chat__chip', { hasText: 'add a note' }).click();
      assert.equal(await chat.locator('.us-side-chat__source').last().getAttribute('href'), GUIDE_URL + '#add-a-note');
      await chat.screenshot({ path: '.preview/side-pane-chat.png' });
      assert.equal(chat.guideRequests, 1, 'the guide is fetched once');
      assert.deepEqual(chat.errors, []);
      console.log('PASS: Case help answers from the hosted guide, with steps, topic links and an unsure reply.');
    } finally { await chat.close(); }

    const missing = await fixture(browser, { guide: false });
    try {
      await missing.locator(toggle).waitFor();
      await missing.locator(toggle).click();
      await missing.locator('.us-side-chat__source').waitFor();
      assert.match(await missing.locator('.us-side-chat__bubble').first().textContent(), /could not load/);
      assert.equal(await missing.locator('.us-side-chat__source').getAttribute('href'), GUIDE_URL, 'the guide still opens');
      assert.equal(await missing.locator('.us-side-chat__input').isDisabled(), true);
      assert.ok(missing.warnings.some(text => text.includes('did not load')), 'the failure is logged');
      assert.deepEqual(missing.errors, []);
      console.log('PASS: a guide that does not load says so and still links the guide.');
    } finally { await missing.close(); }

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
