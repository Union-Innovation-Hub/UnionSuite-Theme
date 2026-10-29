// Follow the real pointer path through a tooltip overlapping the preceding row.
const assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const preview = require('../Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs');
const key = 'union-suite:preview:quick-search-history:100';

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1100, height:800}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.request().url() === 'https://taskbar.test/'
      ? route.fulfill({contentType:'text/html', body:preview.frameDocument()}) : route.abort());
    await page.goto('https://taskbar.test/');
    await page.evaluate(key => {
      localStorage.setItem(key, JSON.stringify(['sda','stark','04111']));
      UnionSuiteTaskbar.destroy(); UnionSuiteTaskbar.initialise();
    }, key);
    const input = page.locator('#us-taskbar-search');
    const menu = page.locator('#tb-search-dropdown');
    const lower = page.getByRole('button', {name:'Remove search: 04111', exact:true});
    const upper = page.getByRole('button', {name:'Remove search: stark', exact:true});
    const tip = page.locator('.us-action-tooltip');
    await input.focus();
    const lowerBox = await lower.boundingBox();
    await page.mouse.move(lowerBox.x + lowerBox.width / 2, lowerBox.y + lowerBox.height + 20);
    await page.mouse.move(lowerBox.x + lowerBox.width / 2, lowerBox.y + lowerBox.height / 2, {steps:12});
    await tip.waitFor({state:'visible'});
    assert.equal(await tip.innerText(), 'Remove search: 04111');
    const label = await tip.boundingBox(), above = await upper.boundingBox();
    const left = Math.max(label.x, above.x), right = Math.min(label.x + label.width, above.x + above.width);
    const top = Math.max(label.y, above.y), bottom = Math.min(label.y + label.height, above.y + above.height);
    assert(right > left && bottom > top, 'fixture reproduces the tooltip overlapping the preceding remove button');
    const point = {x:(left + right) / 2, y:(top + bottom) / 2};
    assert(await tip.evaluate((node,{x,y}) => {
      node.style.pointerEvents = 'auto';
      const onTop = document.elementFromPoint(x,y) === node;
      node.style.removeProperty('pointer-events');
      return onTop;
    }, point), 'the visual label is above the dropdown, not hidden behind it');
    assert.equal(await page.evaluate(({x,y}) => document.elementFromPoint(x,y).closest('button')?.getAttribute('aria-label'), point),
      'Remove search: stark', 'the covered button receives pointer hit testing');
    await page.screenshot({path:'.preview/taskbar-tooltip-before-moving.png'});
    await page.mouse.move(point.x, point.y, {steps:16});
    assert.equal(await tip.innerText(), 'Remove search: stark', 'moving upward immediately switches to the correct label');
    await page.mouse.click(point.x, point.y);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), ['sda','04111']);
    assert(await menu.isVisible(), 'removing the upper search keeps the history menu open');
    assert(await input.evaluate(node => node === document.activeElement));
    // The next row can move under the stationary pointer and show its own label.
    await page.mouse.move(20, 450);
    await tip.waitFor({state:'hidden'});

    // Hovering the visual label remains supported without a pointer-catching layer.
    await lower.hover();
    const remainingLabel = await tip.boundingBox();
    await page.mouse.move(remainingLabel.x + 8, remainingLabel.y + remainingLabel.height / 2);
    await page.waitForTimeout(200);
    assert(await tip.isVisible(), 'the label stays readable while its rectangle is hovered');
    assert.equal(await tip.evaluate(node => getComputedStyle(node).pointerEvents), 'none');
    await page.mouse.move(20, 450);
    await tip.waitFor({state:'hidden'});

    await lower.focus();
    await tip.waitFor({state:'visible'});
    assert.equal(await tip.innerText(), 'Remove search: 04111');
    await lower.press('Escape');
    await tip.waitFor({state:'hidden'});
    // The taskbar also closes on Escape and returns focus to its nav input.
    await input.blur();
    await input.click();
    await lower.focus();
    await lower.press('Space');
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), ['sda']);
    assert(await menu.isVisible());
    await tip.waitFor({state:'hidden'});
    assert.deepEqual(errors, []);
    console.log('PASS: real upward pointer path, overlapping-button hit testing, correct deletion, open menu/input focus, hover persistence, keyboard labels, Escape and removed-owner cleanup.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
