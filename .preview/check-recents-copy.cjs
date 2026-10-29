// Local check: Recents copy button (shared US-COPY) and editor dialog size. Fixture only.
const fs = require('node:fs');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const read = file => fs.readFileSync(file, 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1100, height: 700 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: 'https://fixture.test' });
  const p = await context.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.route('https://fixture.test/', r => r.fulfill({ contentType: 'text/html', body:
    '<html lang="en"><body style="margin:0;background:var(--bg-page)"><input id="__ClientContext" type="hidden">' +
    '<input id="__RequestVerificationToken" value="t" type="hidden">' +
    '<header id="hd" style="background:var(--bg-surface)"><div id="masterTopBarAuxiliary"><div id="injected-taskbar" style="display:flex;justify-content:flex-end;padding:8px 22px">' +
    '<nav class="us-taskbar__quick-links"></nav></div></div></header></body></html>' }));
  await p.route(/^(?!https:\/\/fixture\.test\/$).*/, r => r.abort());
  await p.goto('https://fixture.test/');
  await p.addStyleTag({ content: read('Theme/UnionSuite/zUnionSuite.css').replace(/@import\s+[^;]+;/g, '') });
  await p.evaluate(() => {
    document.getElementById('__ClientContext').value = JSON.stringify({ loggedInPartyId: '123', websiteRoot: 'https://fixture.test/' });
    window.dialogs = [];
    window.ShowDialog_NoReturnValue = (...args) => dialogs.push(args);
    const row = (name, path) => ({ DocumentName: name, Path: path, DocumentVersionKey: 'k-' + name, UpdatedOn: new Date(Date.now() - 3600e3).toISOString().slice(0, 19) });
    window.fetch = url => {
      url = String(url);
      const items = /Recent/.test(decodeURIComponent(url))
        ? [row('Jobs List', '$/_i4u_/SandBox/CRM Layouts/Jobs List'), row('Member Counts by Category', '$/_i4u_/SandBox/CRM Layouts/Home_Page/Stats/Member Counts by Category')]
        : [];
      return Promise.resolve(new Response(JSON.stringify({ Items: { $values: items }, TotalCount: items.length, HasNext: false }), { status: 200 }));
    };
  });
  await p.addScriptTag({ content: read('Theme/UnionSuite/zUnionSuite.js') });
  await p.addScriptTag({ content: read('Theme/UnionSuite/Scripts/UnionSuiteTaskbar-Bookmarks.js') });
  await p.waitForSelector('#us-tb-bookmarks-toggle');
  await p.locator('#us-tb-bookmarks-toggle').click();
  await p.waitForTimeout(300);
  await p.locator('[data-open="recents"]').first().click();
  await p.waitForSelector('.us-recent-row');
  const rows = await p.locator('.us-recent-row').count();
  const copy = p.locator('.us-recent-copy').first();
  const before = await copy.evaluate(n => ({ w: n.offsetWidth, label: n.getAttribute('aria-label'), target: n.dataset.usCopyTarget }));
  await copy.click();
  await p.waitForTimeout(250);
  const after = await p.evaluate(() => ({
    clipboard: null,
    state: document.querySelector('.us-recent-copy').getAttribute('data-us-copy-state'),
    flashing: document.querySelector('.us-recent-item__path').classList.contains('us-copy-flash'),
    label: !!document.querySelector('.us-recent-copy > .us-copy-label'),
    panelOpen: !document.querySelector('.us-recents').hidden,
    dialogs: dialogs.length
  }));
  after.clipboard = await p.evaluate(() => navigator.clipboard.readText());
  await p.screenshot({ path: '.preview/recents-copy.png', clip: { x: 640, y: 40, width: 460, height: 330 } });
  await p.locator('.us-recent-item').first().click();
  const dialog = await p.evaluate(() => dialogs[0] && dialogs[0].slice(1, 5));
  console.log({ rows, before, after, dialog, errors });
  await browser.close();
})();
