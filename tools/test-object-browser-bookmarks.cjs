// Tests Copy path and folder bookmarks on the iMIS object browser screens
// (Theme/UnionSuite/Scripts/ObjectBrowser-Bookmarks.js): the path and list
// functions in Node, then the row and address box icons and the Bookmarks
// pane in a headless browser against a page shaped like the native object
// browser (the document browser and the IQA browser), with the iMIS API
// stubbed.
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

test('display names: kept only when they differ from the path, and saved third', () => {
  const key = '11111111-2222-3333-4444-555555555555';
  let list = core.toggleIn([], { k: key, p: '@/_i4u_/Core/Cases/UnionSuite/Manage-Case', t: 'Manage Case' });
  assert.equal(core.titleOf(list[0]), 'Manage Case');
  assert.equal(core.serialise(list), JSON.stringify([[key, '@/_i4u_/Core/Cases/UnionSuite/Manage-Case', 'Manage Case']]));
  assert.deepEqual(core.parseBookmarks(core.serialise(list)), list);
  const plain = core.toggleIn([], { k: key, p: '$/_i4u_/Core', t: 'Core' });
  assert.equal(plain[0].t, undefined);
  assert.equal(core.titleOf(plain[0]), 'Core');
  // A bookmark saved with display names in its path is put right, and its
  // display name kept unless a new one is given.
  list = core.parseBookmarks(JSON.stringify([[key, '@/_i4u_/Core/Cases/UnionSuite/Manage Case']]));
  list = core.renameIn(list, key, '@/_i4u_/Core/Cases/UnionSuite/Manage-Case', 'Manage Case');
  assert.deepEqual(list, [{ k: key, p: '@/_i4u_/Core/Cases/UnionSuite/Manage-Case', t: 'Manage Case' }]);
  assert.equal(core.renameIn(list, key, '@/_i4u_/Core/Cases/UnionSuite/Manage-Case'), list);
});

/* ---------------------------------------------------------------------------
 * In the browser
 * ------------------------------------------------------------------------ */
const KEYS = {
  root: 'a0000000-0000-4000-8000-000000000000',
  open: 'a0000000-0000-4000-8000-000000000009',
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

// The native object browser as the dev tenant renders it, cut down: the
// floated address box and Go in their update panel, a tree in its splitter
// pane (with a $find stub for the selected node and its key), Quick find,
// and the list.
function fixture(prefix, rows) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Object browser</title>
<link rel="stylesheet" href="/theme/zUnionSuite.css">
<style>body{font:14px sans-serif}.ObjectBrowserContentItem.selected{background:#003a4c;color:#fff}</style>
<script>
  window.__rowEvents = [];
  window.__go = [];
  // The tree shows display names; a path is made of document names.
  const path = ['$', '_i4u_'];
  const shown = ['$', 'i4u Folder'];
  const keys = ['${KEYS.root}', '${KEYS.open}'];
  const node = i => i < 0 ? null : {
    get_text: () => shown[i],
    get_parent: () => node(i - 1),
    get_attributes: () => ({ getAttribute: name => name === 'DocumentVersionKey' ? keys[i] : name === 'data-DocumentName' ? path[i] : null })
  };
  window.$find = () => ({ get_selectedNode: () => node(path.length - 1) });
</script></head><body>
<input type="hidden" id="__ClientContext" value='{"loggedInPartyId":"100","isAnonymous":false}'>
<input type="hidden" id="__RequestVerificationToken" value="t">
<div class="ObjectBrowserWrapper">
  <div id="${prefix}_AddressUpdatePanel" style="display:block;overflow:hidden">
    <input type="text" class="InputXLarge" id="${prefix}_Address" value="$/_i4u_" style="float:left;box-sizing:border-box;width:400px;height:33px;padding:0 10px;border:1px solid #999">
    <input type="button" id="${prefix}_AddressGoButton" value="Go" style="float:left;height:33px" onclick="window.__go.push(document.getElementById('${prefix}_Address').value)">
  </div>
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
    // A bookmarked folder renamed since it was saved.
    if (url.pathname === '/api/DocumentSummary') {
      const moved = url.searchParams.get('DocumentVersionId') === KEYS.client
        ? [{ Path: '$/_i4u_/Client-Files', FolderPath: '$/_i4u_', Name: 'Client-Files', AlternateName: 'Client Files', Status: 'Published' }]
        : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Items: { $values: moved } }) });
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

test('object browser rows, the address box and the Bookmarks pane', async t => {
  let chromium;
  try {
    ({ chromium } = require('../.tmp-iqa-integration/node_modules/playwright'));
  } catch (_) {
    t.skip('Playwright is not installed in .tmp-iqa-integration');
    return;
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  t.after(() => browser.close());

  await t.test('document browser: row copy, address copy and star, pane, go and collapse', async () => {
    const saved = JSON.stringify([[KEYS.client, '$/_i4u_/Client'], [KEYS.content, '@/_i4u_/Pages']]);
    const { page, requests, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/BSA/DocumentBrowser.aspx',
      prefix: 'ctl01_TemplateBody_ObjectBrowser1',
      rows: row(KEYS.core, 'Core', 'FOL', 'true') + row(KEYS.client, 'Client', 'FOL', 'true') + row(KEYS.doc, 'Case List', 'IQD', 'false'),
      saved,
      scripts: ['Scripts/ObjectBrowser-Bookmarks.js']
    });
    await page.waitForSelector('.us-ob-bookmarks__go');

    // Rows: Copy path only, no stars.
    const groups = await page.$$eval('tr.ObjectBrowserContentItem', rows => rows.map(row => [...row.querySelectorAll('.us-ob-actions > button')].map(b => b.className)));
    assert.deepEqual(groups, [['us-copy us-ob-copy'], ['us-copy us-ob-copy'], ['us-copy us-ob-copy']]);

    // Hidden until the row is selected.
    const visible = selector => page.$eval(selector, node => getComputedStyle(node).visibility);
    await page.mouse.move(0, 0);
    assert.equal(await visible(`[id="${KEYS.core}"] .us-ob-copy`), 'hidden');
    await page.$eval(`[id="${KEYS.core}"]`, node => node.classList.add('selected'));
    assert.equal(await visible(`[id="${KEYS.core}"] .us-ob-copy`), 'visible');

    // Row Copy path: the full path, never opening or reselecting the row,
    // even when clicked twice quickly.
    await page.evaluate(() => { window.__rowEvents.length = 0; });
    await page.click(`[id="${KEYS.core}"] .us-ob-copy`);
    await page.dblclick(`[id="${KEYS.core}"] .us-ob-copy`);
    await page.waitForFunction(() => window.__copied.length >= 2);
    assert.deepEqual(await page.evaluate(() => window.__copied.slice(0, 1)), ['$/_i4u_/Core']);
    assert.deepEqual(await page.evaluate(() => window.__rowEvents), []);
    await page.$eval(`[id="${KEYS.doc}"]`, node => node.classList.add('selected'));
    await page.click(`[id="${KEYS.doc}"] .us-ob-copy`);
    await page.waitForFunction(() => window.__copied.includes('$/_i4u_/Case List'));

    // The address row: Copy path then the star, straight after Go, on its
    // line and clear of the box.
    const tools = await page.$eval('[id$="_AddressGoButton"]', go => {
      const next = go.nextElementSibling;
      const box = document.querySelector('[id$="_Address"]').getBoundingClientRect();
      const g = go.getBoundingClientRect();
      const b = next.getBoundingClientRect();
      return {
        className: next.className,
        buttons: [...next.children].map(c => c.className),
        afterGo: b.left >= g.right && b.left >= box.right,
        sameLine: Math.abs(b.top - box.top) < 2 && Math.round(b.height) === Math.round(box.height)
      };
    });
    assert.deepEqual(tools, { className: 'us-ob-address-tools', buttons: ['us-copy us-ob-address-copy', 'us-ob-address-star'], afterGo: true, sameLine: true });

    // Address Copy path copies the open folder (even with other text typed)
    // and flashes the box.
    await page.fill('[id$="_Address"]', '$/_i4u_/Typed');
    await page.click('.us-ob-address-copy');
    await page.waitForFunction(() => window.__copied.at(-1) === '$/_i4u_');
    assert.equal(await page.$eval('[id$="_Address"]', box => box.classList.contains('us-copy-flash')), true);
    await page.fill('[id$="_Address"]', '$/_i4u_');

    // The pane sits first in the tree pane, above the tree, with this
    // tree's ($) bookmarks only.
    assert.equal(await page.$eval('[id^="RAD_SPLITTER_PANE_CONTENT_"]', host => host.firstElementChild.className), 'us-ob-bookmarks');
    assert.deepEqual(await page.$$eval('.us-ob-bookmarks__go', items => items.map(item => item.title)), ['$/_i4u_/Client']);
    assert.equal(await page.textContent('.us-ob-bookmarks__count'), '1');

    // The star bookmarks the open folder, saves to the user's settings row
    // and lists it, marked as the open folder.
    assert.equal(await page.getAttribute('.us-ob-address-star', 'aria-pressed'), 'false');
    await page.click('.us-ob-address-star');
    await page.waitForFunction(() => document.querySelectorAll('.us-ob-bookmarks__go').length === 2);
    assert.equal(await page.getAttribute('.us-ob-address-star', 'aria-pressed'), 'true');
    assert.equal(await page.getAttribute('.us-ob-bookmarks__go[aria-current]', 'title'), '$/_i4u_');
    await page.waitForTimeout(600);
    const put = requests.find(request => request.method === 'PUT');
    assert.ok(put, 'saved with PUT to the existing row');
    assert.match(put.url, /i4u_UT_UserSettings\/100\/7$/);
    const value = JSON.parse(put.body).Properties.$values.find(entry => entry.Name === 'Value').Value;
    // The path of document names; the tree's display name kept beside it.
    assert.deepEqual(JSON.parse(value), [[KEYS.open, '$/_i4u_', 'i4u Folder'], [KEYS.client, '$/_i4u_/Client'], [KEYS.content, '@/_i4u_/Pages']]);
    assert.equal(await page.textContent('.us-ob-bookmarks__go[aria-current] .us-ob-bookmarks__name'), 'i4u Folder');

    // Choosing a bookmark looks up where its folder is now (renamed here),
    // puts the bookmark right and goes there with the address box and Go.
    await page.click('.us-ob-bookmarks__go[title="$/_i4u_/Client"]');
    await page.waitForFunction(() => window.__go.length === 1);
    assert.deepEqual(await page.evaluate(() => window.__go), ['$/_i4u_/Client-Files']);
    assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem('unionsuite:folder-bookmarks')).find(item => item[0] === key), KEYS.client), [KEYS.client, '$/_i4u_/Client-Files', 'Client Files']);
    await page.fill('[id$="_Address"]', '$/_i4u_');

    // Collapse and reopen; remembered in this browser.
    await page.click('.us-ob-bookmarks__toggle');
    assert.equal(await page.getAttribute('.us-ob-bookmarks__toggle', 'aria-expanded'), 'false');
    assert.equal(await page.$eval('.us-ob-bookmarks__body', body => body.hidden), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('unionsuite:folder-bookmarks:open')), 'false');

    // Removing from the pane turns the address star off.
    await page.click('.us-ob-bookmarks__toggle');
    await page.click(`.us-ob-bookmarks__item[data-key="${KEYS.open}"] .us-ob-bookmarks__star`);
    await page.waitForFunction(() => document.querySelector('.us-ob-address-star').getAttribute('aria-pressed') === 'false');

    // A partial postback redraws the address box and Go; the tools come back.
    await page.evaluate(() => {
      const box = document.querySelector('[id$="_Address"]');
      const panel = box.parentElement;
      panel.innerHTML = panel.innerHTML.replace(/<span class="us-ob-address-tools"[\s\S]*?<\/span>/, '');
    });
    await page.waitForFunction(() => document.querySelector('[id$="_AddressGoButton"]').nextElementSibling?.className === 'us-ob-address-tools');

    // Touch-sized icons on narrow windows.
    await page.setViewportSize({ width: 800, height: 800 });
    assert.equal(await page.$eval(`[id="${KEYS.core}"] .us-ob-copy`, node => node.getBoundingClientRect().width), 44);
    assert.equal(await page.$eval('.us-ob-address-star', node => node.getBoundingClientRect().width), 44);
    await context.close();
  });

  await t.test('IQA browser: no star on query rows; Quick find keeps favourites', async () => {
    const { page, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/IQA/Default.aspx',
      prefix: 'ctl01_TemplateBody_ObjectBrowser1',
      rows: row(KEYS.core, 'Core', 'FOL', 'true') + row(KEYS.query, 'Case List', 'IQD', 'false'),
      saved: null,
      iqaFavourites: JSON.stringify([KEYS.query]),
      scripts: ['Scripts/Document-Finder.js', 'Scripts/ObjectBrowser-Bookmarks.js']
    });
    await page.waitForSelector('.us-ob-bookmarks__empty');
    await page.waitForFunction(() => window.UnionSuiteDocumentFinder?.favourites().length === 1);
    const group = await page.$$eval(`[id="${KEYS.query}"] .us-ob-actions > button`, buttons => buttons.map(b => b.className));
    assert.deepEqual(group, ['us-copy us-ob-copy']);
    assert.equal(await page.$$eval('.us-doc-finder__star', stars => stars.length), 0);
    assert.match(await page.textContent('.us-ob-bookmarks__empty'), /star beside Go/);
    await context.close();
  });
});
