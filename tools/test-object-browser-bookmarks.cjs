// Tests Copy path and folder bookmarks on the iMIS object browser screens
// (Theme/UnionSuite/Scripts/ObjectBrowser-Bookmarks.js): the path and list
// functions in Node, then the row icons and the Bookmarks pane in a headless
// browser against a page shaped like the native object browser (the
// document browser and the IQA browser), with the iMIS API stubbed.
// Run from the project root: node tools/test-object-browser-bookmarks.cjs
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../Theme/UnionSuite/Scripts/ObjectBrowser-Bookmarks.js');

const THEME = path.resolve(__dirname, '../Theme/UnionSuite');
const ORIGIN = 'https://tenant.test';

/* ---------------------------------------------------------------------------
 * Core
 * ------------------------------------------------------------------------ */
test('paths join, split and keep underscores', () => {
  assert.equal(core.joinPath('$/_i4u_', 'Core'), '$/_i4u_/Core');
  assert.equal(core.joinPath('$/_i4u_/', 'Case List'), '$/_i4u_/Case List');
  assert.equal(core.joinPath('$', '_i4u_'), '$/_i4u_');
  assert.equal(core.joinPath('@/_i4u_', ''), '@/_i4u_');
  assert.equal(core.nameOf('$/_i4u_/Core/Cases'), 'Cases');
  assert.equal(core.parentOf('$/_i4u_/Core/Cases'), '$/_i4u_/Core');
  assert.equal(core.parentOf('$'), '');
  assert.equal(core.rootOf('@/_i4u_'), '@');
});

test('saved values: only well-formed bookmarks, once each', () => {
  const key = '11111111-2222-3333-4444-555555555555';
  const list = core.parseBookmarks(JSON.stringify([
    [key.toUpperCase(), '$/_i4u_/Core'],
    [key, '$/_i4u_/Again'],
    ['not-a-key', '$/x'],
    ['22222222-2222-3333-4444-555555555555', 'no root'],
    'junk'
  ]));
  assert.deepEqual(list, [{ k: key, p: '$/_i4u_/Core' }]);
  assert.deepEqual(core.parseBookmarks('not json'), []);
  assert.deepEqual(core.parseBookmarks('{"a":1}'), []);
  assert.equal(core.serialise(list), JSON.stringify([[key, '$/_i4u_/Core']]));
});

test('toggling adds newest first and removes; renaming keeps the bookmark', () => {
  const a = { k: '11111111-2222-3333-4444-555555555555', p: '$/A' };
  const b = { k: '22222222-2222-3333-4444-555555555555', p: '@/B' };
  let list = core.toggleIn([], a);
  list = core.toggleIn(list, b);
  assert.deepEqual(list.map(item => item.p), ['@/B', '$/A']);
  assert.deepEqual(core.forRoot(list, '$'), [a]);
  assert.deepEqual(core.toggleIn(list, { k: b.k.toUpperCase() }).map(item => item.p), ['$/A']);
  const renamed = core.renameIn(list, a.k, '$/A2');
  assert.equal(renamed.find(item => item.k === a.k).p, '$/A2');
  assert.equal(core.renameIn(list, a.k, '$/A'), list, 'unchanged list is the same list');
});

/* ---------------------------------------------------------------------------
 * In the browser
 * ------------------------------------------------------------------------ */
const KEYS = {
  core: 'c0000000-0000-4000-8000-000000000001',
  client: 'c0000000-0000-4000-8000-000000000002',
  doc: 'd0000000-0000-4000-8000-000000000003',
  query: 'e0000000-0000-4000-8000-000000000004',
  content: 'f0000000-0000-4000-8000-000000000005'
};

function row(key, name, type, container) {
  return `<tr class=" ObjectBrowserContentItem" id="${key}" data-documenttypecode="${type}" data-documentname="${name}"
    data-iscontainer="${container}" tabindex="0" onmousedown="window.__rowEvents.push('mousedown:${name}'); document.querySelectorAll('.ObjectBrowserContentItem').forEach(r => r.classList.remove('selected')); this.classList.add('selected')"
    ondblclick="window.__rowEvents.push('open:${name}')" onkeydown="window.__rowEvents.push('key:${name}')">
    <td><span class="ObjectBrowserIcon ObjectBrowserContentListName"><span class="pl-2">${name}</span></span></td></tr>`;
}

// The native object browser as the dev tenant renders it, cut down: an
// address box and Go, a tree in its splitter pane (with a $find stub for
// the selected node), Quick find, and the list.
function fixture(prefix, rows) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Object browser</title>
<link rel="stylesheet" href="/theme/zUnionSuite.css">
<style>body{font:14px sans-serif}.ObjectBrowserContentItem.selected{background:#003a4c;color:#fff}</style>
<script>
  window.__rowEvents = [];
  window.__go = [];
  const path = ['$', '_i4u_'];
  const node = i => i < 0 ? null : { get_text: () => path[i], get_parent: () => node(i - 1) };
  window.$find = () => ({ get_selectedNode: () => node(path.length - 1) });
</script></head><body>
<input type="hidden" id="__ClientContext" value='{"loggedInPartyId":"100","isAnonymous":false}'>
<input type="hidden" id="__RequestVerificationToken" value="t">
<div class="ObjectBrowserWrapper">
  <input type="text" id="${prefix}_Address" value="$/_i4u_">
  <input type="button" id="${prefix}_AddressGoButton" value="Go" onclick="window.__go.push(document.getElementById('${prefix}_Address').value)">
  <div class="QuickFindWrapper"><input type="text" id="${prefix}_ObjectQuickFindTextBox"></div>
  <table><tr>
    <td style="width:300px"><div id="RAD_SPLITTER_PANE_CONTENT_${prefix}_RadPaneTree" style="width:300px;height:400px;overflow:auto">
      <div id="${prefix}_TreeUpdatePanel"><div class="TreePane"><div id="${prefix}_RadTreeView1" class="RadTreeView">tree</div></div></div>
    </div></td>
    <td style="width:500px"><div id="${prefix}_ContentListUpdatePanel"><table id="ContentList" style="width:100%"><tbody>${rows}</tbody></table></div></td>
  </tr></table>
</div>
<script src="/theme/zUnionSuite.js"></script>
</body></html>`;
}

async function openPage(browser, { pagePath, prefix, rows, saved, scripts, iqaFavourites }) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests = [];
  await page.addInitScript(() => {
    window.__copied = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: text => { window.__copied.push(text); return Promise.resolve(); } }
    });
  });
  await page.route(/.*/, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === pagePath) return route.fulfill({ contentType: 'text/html', body: fixture(prefix, rows) });
    if (url.pathname.startsWith('/theme/')) {
      const file = path.join(THEME, decodeURIComponent(url.pathname.slice('/theme/'.length)));
      return route.fulfill({ contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(file, 'utf8') });
    }
    if (url.pathname.startsWith('/api/i4u_UT_UserSettings')) {
      requests.push({ method, url: url.pathname + url.search, body: route.request().postData() });
      if (method === 'GET') {
        const key = url.searchParams.get('SettingsKey');
        const value = key === 'Folder-Bookmarks' ? saved : key === 'IQA-Favourites' ? iqaFavourites : null;
        const items = value == null ? [] : [{ Properties: { $values: [{ Name: 'Ordinal', Value: { $value: 7 } }, { Name: 'Value', Value: value }] } }];
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Items: { $values: items } }) });
      }
      return route.fulfill({ contentType: 'application/json', body: '{}' });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, body: '' });
    return route.abort();
  });
  await page.goto(ORIGIN + pagePath);
  for (const script of scripts) await page.addScriptTag({ url: '/theme/' + script });
  return { page, requests, context };
}

test('object browser rows and the Bookmarks pane', async t => {
  let chromium;
  try {
    ({ chromium } = require('../.tmp-iqa-integration/node_modules/playwright'));
  } catch (_) {
    t.skip('Playwright is not installed in .tmp-iqa-integration');
    return;
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  t.after(() => browser.close());

  await t.test('document browser: copy, stars, pane, go and collapse', async () => {
    const saved = JSON.stringify([[KEYS.client, '$/_i4u_/Client'], [KEYS.content, '@/_i4u_/Pages']]);
    const { page, requests, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/BSA/DocumentBrowser.aspx',
      prefix: 'ctl01_TemplateBody_ObjectBrowser1',
      rows: row(KEYS.core, 'Core', 'FOL', 'true') + row(KEYS.client, 'Client', 'FOL', 'true') + row(KEYS.doc, 'Case List', 'IQD', 'false'),
      saved,
      scripts: ['Scripts/ObjectBrowser-Bookmarks.js']
    });
    await page.waitForSelector('.us-ob-bookmarks__go');

    // Icons: copy on every row, a star on folders only.
    const groups = await page.$$eval('tr.ObjectBrowserContentItem', rows => rows.map(row => [...row.querySelectorAll('.us-ob-actions > button')].map(b => b.className)));
    assert.deepEqual(groups, [['us-copy us-ob-copy', 'us-ob-star'], ['us-copy us-ob-copy', 'us-ob-star'], ['us-copy us-ob-copy']]);

    // Hidden until the row is selected; a starred folder always shows its star.
    const visible = selector => page.$eval(selector, node => getComputedStyle(node).visibility);
    assert.equal(await visible(`[id="${KEYS.core}"] .us-ob-copy`), 'hidden');
    assert.equal(await visible(`[id="${KEYS.client}"] .us-ob-star`), 'visible');
    await page.mouse.move(0, 0);
    await page.$eval(`[id="${KEYS.core}"]`, node => node.classList.add('selected'));
    assert.equal(await visible(`[id="${KEYS.core}"] .us-ob-copy`), 'visible');

    // Copy path: the full path, never opening or reselecting the row, even
    // when clicked twice quickly.
    await page.evaluate(() => { window.__rowEvents.length = 0; });
    await page.click(`[id="${KEYS.core}"] .us-ob-copy`);
    await page.dblclick(`[id="${KEYS.core}"] .us-ob-copy`);
    await page.waitForFunction(() => window.__copied.length >= 2);
    assert.deepEqual(await page.evaluate(() => window.__copied.slice(0, 1)), ['$/_i4u_/Core']);
    assert.deepEqual(await page.evaluate(() => window.__rowEvents), []);
    await page.$eval(`[id="${KEYS.doc}"]`, node => node.classList.add('selected'));
    await page.click(`[id="${KEYS.doc}"] .us-ob-copy`);
    await page.waitForFunction(() => window.__copied.includes('$/_i4u_/Case List'));
    assert.equal(await page.getAttribute(`[id="${KEYS.doc}"] .us-ob-copy`, 'data-us-copy-state'), 'success');

    // The pane sits first in the tree pane, above the tree, with this
    // tree's ($) bookmarks only.
    assert.equal(await page.$eval('[id$="_RadPaneTree"]', host => host.firstElementChild.className), 'us-ob-bookmarks');
    assert.deepEqual(await page.$$eval('.us-ob-bookmarks__go', items => items.map(item => item.title)), ['$/_i4u_/Client']);
    assert.equal(await page.textContent('.us-ob-bookmarks__count'), '1');

    // Starring a folder row saves it to the user's settings row and lists it.
    await page.click(`[id="${KEYS.core}"] .us-ob-star`);
    await page.waitForFunction(() => document.querySelectorAll('.us-ob-bookmarks__go').length === 2);
    assert.equal(await page.getAttribute(`[id="${KEYS.core}"] .us-ob-star`, 'aria-pressed'), 'true');
    await page.waitForTimeout(600);
    const put = requests.find(request => request.method === 'PUT');
    assert.ok(put, 'saved with PUT to the existing row');
    assert.match(put.url, /i4u_UT_UserSettings\/100\/7$/);
    const value = JSON.parse(put.body).Properties.$values.find(entry => entry.Name === 'Value').Value;
    assert.deepEqual(JSON.parse(value), [[KEYS.core, '$/_i4u_/Core'], [KEYS.client, '$/_i4u_/Client'], [KEYS.content, '@/_i4u_/Pages']]);

    // Choosing a bookmark uses the address box and Go.
    await page.click('.us-ob-bookmarks__go[title="$/_i4u_/Client"]');
    assert.deepEqual(await page.evaluate(() => window.__go), ['$/_i4u_/Client']);

    // Collapse and reopen; remembered in this browser.
    await page.click('.us-ob-bookmarks__toggle');
    assert.equal(await page.getAttribute('.us-ob-bookmarks__toggle', 'aria-expanded'), 'false');
    assert.equal(await page.$eval('.us-ob-bookmarks__body', body => body.hidden), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('unionsuite:folder-bookmarks:open')), 'false');

    // Removing from the pane unstars the row.
    await page.click('.us-ob-bookmarks__toggle');
    await page.click(`.us-ob-bookmarks__item[data-key="${KEYS.core}"] .us-ob-bookmarks__star`);
    await page.waitForFunction(key => document.querySelector(`[id="${key}"] .us-ob-star`).getAttribute('aria-pressed') === 'false', KEYS.core);

    // Touch-sized icons on narrow windows.
    await page.setViewportSize({ width: 800, height: 800 });
    assert.equal(await page.$eval(`[id="${KEYS.core}"] .us-ob-copy`, node => node.getBoundingClientRect().width), 44);
    await context.close();
  });

  await t.test('IQA browser: the query star joins the group; pane lists queries', async () => {
    const { page, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/IQA/Default.aspx',
      prefix: 'ctl01_TemplateBody_ObjectBrowser1',
      rows: row(KEYS.core, 'Core', 'FOL', 'true') + row(KEYS.query, 'Case List', 'IQD', 'false'),
      saved: null,
      iqaFavourites: JSON.stringify([KEYS.query]),
      scripts: []
    });
    await page.evaluate(([key]) => localStorage.setItem('unionsuite:iqa-finder:names', JSON.stringify({ [key]: ['Case List', '$/_i4u_/Core/Cases/Case List', 1] })), [KEYS.query]);
    await page.reload();
    await page.addScriptTag({ url: '/theme/Scripts/IQA-Finder.js' });
    await page.addScriptTag({ url: '/theme/Scripts/ObjectBrowser-Bookmarks.js' });
    await page.waitForSelector(`[id="${KEYS.query}"] .us-iqa-finder__star`, { state: 'attached' });
    const group = await page.$$eval(`[id="${KEYS.query}"] .us-ob-actions > button`, buttons => buttons.map(b => b.className));
    assert.deepEqual(group, ['us-copy us-ob-copy', 'us-iqa-finder__star']);
    await page.waitForSelector('.us-ob-bookmarks__go .ti-file-search', { state: 'attached' });
    assert.deepEqual(await page.$$eval('.us-ob-bookmarks__name', names => names.map(name => name.textContent)), ['Case List']);
    assert.equal(await page.textContent('.us-ob-bookmarks__path'), '$/_i4u_/Core/Cases');
    await context.close();
  });
});
