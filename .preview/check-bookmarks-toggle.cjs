// Local check: bookmarks toggle on state and bar slide. Fixture only, no tenant.
const fs = require('node:fs');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteTaskbar-Bookmarks.js', 'utf8');

async function page(browser, options = {}) {
  const p = await browser.newPage({ viewport: { width: 1100, height: 400 }, ...options });
  p.errors = [];
  p.on('pageerror', e => p.errors.push(e.message));
  await p.route('**/*', r => r.abort());
  await p.setContent('<html lang="en"><body style="margin:0;background:var(--bg-page)"><input id="__ClientContext" type="hidden">' +
    '<input id="__RequestVerificationToken" value="t" type="hidden">' +
    '<header id="hd" style="background:var(--bg-surface)"><div id="masterTopBarAuxiliary"><div id="injected-taskbar" style="display:flex;justify-content:flex-end;padding:8px 22px">' +
    '<nav class="us-taskbar__quick-links"></nav></div></div></header><main style="padding:20px">Page content</main></body></html>');
  await p.addStyleTag({ content: fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8').replace(/@import\s+[^;]+;/g, '') });
  await p.evaluate(() => {
    document.getElementById('__ClientContext').value = JSON.stringify({ loggedInPartyId: '123', websiteRoot: 'https://fixture.test/' });
    window.fetch = () => Promise.resolve(new Response(JSON.stringify({ Items: { $values: [{ Properties: { $values: [
      { Name: 'Ordinal', Value: { $type: 'System.Int32', $value: 1 } },
      { Name: 'Value', Value: JSON.stringify(['community.groups', 'community.communities']) }] } }] } }), { status: 200 }));
  });
  await p.addScriptTag({ content: script });
  await p.waitForSelector('#us-tb-bookmarks-toggle');
  await p.waitForTimeout(300);
  return p;
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const p = await page(browser);
  const toggle = p.locator('#us-tb-bookmarks-toggle');
  const bar = () => p.evaluate(() => {
    const b = document.getElementById('us-tb-bookmarks-bar');
    return { hidden: b.hidden, height: Math.round(b.getBoundingClientRect().height), sliding: b.classList.contains('is-sliding') };
  });
  const off = await toggle.evaluate(n => getComputedStyle(n).backgroundColor);
  await toggle.click();
  const mid = await (await p.waitForTimeout(90), bar());
  await p.waitForTimeout(250);
  const open = await bar();
  const on = await toggle.evaluate(n => ({ bg: getComputedStyle(n).backgroundColor, color: getComputedStyle(n).color, shadow: getComputedStyle(n).boxShadow, expanded: n.getAttribute('aria-expanded') }));
  await p.mouse.move(0, 300);
  await p.screenshot({ path: '.preview/bookmarks-toggle-on.png', clip: { x: 600, y: 0, width: 500, height: 120 } });
  await toggle.click();
  const closing = await (await p.waitForTimeout(90), bar());
  // Reverse mid-slide.
  await toggle.click();
  await p.waitForTimeout(300);
  const reopened = await bar();
  await toggle.click();
  await p.waitForTimeout(300);
  const closed = await bar();
  console.log({ off, on, mid, open, closing, reopened, closed, errors: p.errors });

  const reduced = await page(browser, { reducedMotion: 'reduce' });
  await reduced.locator('#us-tb-bookmarks-toggle').click();
  console.log('reduced motion, immediately after click:', await reduced.evaluate(() => {
    const b = document.getElementById('us-tb-bookmarks-bar');
    return { hidden: b.hidden, sliding: b.classList.contains('is-sliding'), animations: b.getAnimations().length };
  }));
  await browser.close();
})();
