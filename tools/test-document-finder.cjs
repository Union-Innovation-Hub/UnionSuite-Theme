// Tests the document finder (Theme/UnionSuite/Scripts/Document-Finder.js):
// its search in Node, then Quick find on the content designer and the IQA
// browser, and the content editor's record of opened pages, in a headless
// browser against pages shaped like the native object browser, with the
// iMIS API stubbed.
// Run from the project root: node --test tools/test-document-finder.cjs
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const test = require('node:test');
const finder = require('../Theme/UnionSuite/Scripts/Document-Finder.js');

const THEME = path.resolve(__dirname, '../Theme/UnionSuite');
const ORIGIN = 'https://tenant.test';

/* ---------------------------------------------------------------------------
 * Core
 * ------------------------------------------------------------------------ */
const entries = [
  { k: '1', n: 'Milestones', p: '$/_i4u_/Core/CA/v2/Reports/Milestones' },
  { k: '2', n: 'Agreement Milestones', p: '$/_i4u_/Core/CA/Dashboards/Agreement Milestones' },
  { k: '3', n: 'Notes', p: '$/_i4u_/Core/CA/v2/Reports/Notes' },
  { k: '4', n: 'API - Manage Agreement - Banner Details', p: '$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details' },
  { k: '5', n: 'Query Template - Manage Agreement - Banner', p: '$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Banner' },
  { k: '6', n: 'Milestone Tasks', p: '$/_i4u_/SandBox/Milestone Tasks' },
  { k: '7', n: 'Résumé list', p: '$/_i4u_/SandBox/Résumé list' }
];
const names = query => finder.search(entries, query).map(entry => entry.n);

test('an exact name comes first, then names that start with it, then others', () => {
  assert.deepEqual(names('milestones'), ['Milestones', 'Agreement Milestones']);
  assert.deepEqual(names('milestone'), ['Milestone Tasks', 'Milestones', 'Agreement Milestones']);
});

test('every word must match the name or the path', () => {
  assert.deepEqual(names('banner details'), ['API - Manage Agreement - Banner Details']);
  assert.deepEqual(names('reports notes'), ['Notes']);
  assert.deepEqual(names('ca v2 reports'), ['Milestones', 'Notes']);
  assert.deepEqual(names('banner nothing'), []);
});

test('path separators and accents do not matter', () => {
  assert.deepEqual(names('v2/reports/notes'), ['Notes']);
  assert.deepEqual(names('resume'), ['Résumé list']);
});

test('an empty query finds nothing; the limit applies', () => {
  assert.deepEqual(names('   '), []);
  assert.equal(finder.search(entries, 'a', 2).length, 2);
});

test('the server is asked for the longest word only', () => {
  assert.equal(finder.serverTerm('ca v2 milestones'), 'milestones');
  assert.equal(finder.serverTerm('  Banner  '), 'banner');
  assert.equal(finder.serverTerm(''), '');
});

test('folder of a path', () => {
  assert.equal(finder.folderOf('$/_i4u_/Core/CA/v2/Reports/Notes'), '$/_i4u_/Core/CA/v2/Reports');
});

test('folder types: CFL and FOL are folders; pages and queries are not', () => {
  assert.equal(finder.isFolderType('CFL'), true);
  assert.equal(finder.isFolderType(' fol '), true);
  assert.equal(finder.isFolderType('Content'), false);
  assert.equal(finder.isFolderType('CON'), false);
  assert.equal(finder.isFolderType('IQD'), false);
  assert.equal(finder.isFolderType(''), false);
});

/* ---------------------------------------------------------------------------
 * In the browser
 * ------------------------------------------------------------------------ */
const KEYS = {
  page: '809ebe1b-dd2d-4d84-b1bb-3999d3aa875a',
  folder: '156dd970-91e3-4312-bfcc-66650b7b7d0d',
  other: '14b70ff1-fb39-4835-b6db-d1d0b1307866',
  query: 'e0000000-0000-4000-8000-000000000004'
};

// The content search IQA's rows, as the dev tenant returns them.
const CONTENT_ROWS = [
  { DocumentVersionKey: KEYS.page.toUpperCase(), DocumentName: 'My_Participation', DocumentPath: '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/My_Participation', DocumentType: 'Content' },
  { DocumentVersionKey: KEYS.folder.toUpperCase(), DocumentName: 'Participation', DocumentPath: '@/_i4u_/Core/Staff-Site-Layouts/Participation', DocumentType: 'CFL' },
  { DocumentVersionKey: KEYS.other.toUpperCase(), DocumentName: 'Add-New-Site-Visit', DocumentPath: '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Organisation/Add-New-Site-Visit', DocumentType: 'Content' }
];

function fixture(prefix, address) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Object browser</title>
<link rel="stylesheet" href="/theme/zUnionSuite.css">
<script>
  window.__go = [];
  window.__dialogs = [];
  window.__filtered = [];
  window.searchTable = text => window.__filtered.push(text);
  window.ShowDialog_NoReturnValue = (...args) => window.__dialogs.push(args);
</script></head><body>
<input type="hidden" id="__ClientContext" value='{"loggedInPartyId":"100","isAnonymous":false,"websiteRoot":"https://tenant.test/UTNewTheme/"}'>
<input type="hidden" id="__RequestVerificationToken" value="t">
<div class="ObjectBrowserWrapper">
  <div id="${prefix}_AddressUpdatePanel">
    <input type="text" id="${prefix}_Address" value="${address}">
    <input type="button" id="${prefix}_AddressGoButton" value="Go" onclick="window.__go.push(document.getElementById('${prefix}_Address').value)">
  </div>
  <div class="QuickFindWrapper"><input type="text" id="${prefix}_ObjectQuickFindTextBox"></div>
  <div id="${prefix}_ContentListUpdatePanel"><table><tbody></tbody></table></div>
</div>
</body></html>`;
}

async function openPage(browser, { pagePath, prefix, address, favourites, local }) {
  const context = await browser.newContext({ viewport: { width: 1200, height: 800 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  const requests = [];
  if (local) await page.addInitScript(values => { Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, JSON.stringify(value))); }, local);
  await page.route(/.*/, async route => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    requests.push({ method, url: url.pathname + url.search, body: route.request().postData() });
    if (url.pathname === pagePath) return route.fulfill({ contentType: 'text/html', body: fixture(prefix, address) });
    if (url.pathname.startsWith('/theme/')) {
      const file = path.join(THEME, decodeURIComponent(url.pathname.slice('/theme/'.length)));
      return route.fulfill({ contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript', body: fs.readFileSync(file, 'utf8') });
    }
    if (url.pathname === '/api/QueryParameterDefinition') {
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Items: { $values: [{ PropertyName: 'DocumentPath', Prompt: 'Document Path Contains' }] } }) });
    }
    if (url.pathname === '/api/query') {
      const rows = /Content Search/.test(url.searchParams.get('QueryName')) ? CONTENT_ROWS : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Items: { $values: rows } }) });
    }
    if (url.pathname.startsWith('/api/i4u_UT_UserSettings')) {
      if (method === 'GET') {
        const value = favourites?.[url.searchParams.get('SettingsKey')];
        const items = value == null ? [] : [{ Properties: { $values: [{ Name: 'Ordinal', Value: { $value: 3 } }, { Name: 'Value', Value: value }] } }];
        return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ Items: { $values: items } }) });
      }
      return route.fulfill({ contentType: 'application/json', body: '{}' });
    }
    if (url.pathname.startsWith('/api/')) return route.fulfill({ status: 404, body: '' });
    return route.abort();
  });
  await page.goto(ORIGIN + pagePath);
  await page.addScriptTag({ url: '/theme/Scripts/Document-Finder.js' });
  return { page, requests, context };
}

test('document finder in the browser', async t => {
  let chromium;
  try {
    ({ chromium } = require('../.tmp-iqa-integration/node_modules/playwright'));
  } catch (_) {
    t.skip('Playwright is not installed in .tmp-iqa-integration');
    return;
  }
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  t.after(() => browser.close());

  await t.test('content designer: search pages and folders, go, open, star', async () => {
    const { page, requests, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/iMIS/ContentManagement/ContentDesigner.aspx',
      prefix: 'ctl01_TemplateBody_ContentItemBrowser',
      address: '@/_i4u_',
      favourites: { 'Content-Favourites': '[]' }
    });
    const box = '[id$="_ObjectQuickFindTextBox"]';
    assert.equal(await page.getAttribute(box, 'placeholder'), 'Quick find, or search all pages');

    // Typing searches the content IQA by its Document Path filter.
    await page.fill(box, 'participation');
    await page.waitForSelector('.us-doc-finder__item');
    const asked = requests.find(request => request.url.startsWith('/api/query?'));
    const params = new URL(ORIGIN + asked.url).searchParams;
    assert.equal(params.get('QueryName'), '$/_i4u_/Core/Admin/Content Search - CON Document Tree Taskbar');
    assert.equal(params.get('DocumentPath'), 'participation');

    // A folder ranks first on its exact name: folder icon, no star or pencil.
    // A page has its icon, a star and the pencil.
    const items = await page.$$eval('.us-doc-finder__item', list => list.map(item => ({
      name: item.querySelector('.us-doc-finder__name').textContent,
      icon: item.querySelector('.us-doc-finder__go .ti').className,
      star: Boolean(item.querySelector('.us-doc-finder__star')),
      open: Boolean(item.querySelector('.us-doc-finder__open'))
    })));
    assert.deepEqual(items, [
      { name: 'Participation', icon: 'ti ti-folder', star: false, open: false },
      { name: 'My_Participation', icon: 'ti ti-file-text', star: true, open: true }
    ]);

    // Choosing a folder goes into it.
    await page.click('.us-doc-finder__item:nth-child(1) .us-doc-finder__go');
    assert.deepEqual(await page.evaluate(() => window.__go), ['@/_i4u_/Core/Staff-Site-Layouts/Participation']);

    // Choosing a page goes to its folder.
    await page.fill('[id$="_Address"]', '@/_i4u_');
    await page.fill(box, 'participation');
    await page.waitForSelector('.us-doc-finder__item:nth-child(2)');
    await page.click('.us-doc-finder__item:nth-child(2) .us-doc-finder__go');
    assert.deepEqual(await page.evaluate(() => window.__go.at(-1)), '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts');

    // The pencil opens the page in the content editor, under the website.
    await page.fill(box, 'participation');
    await page.waitForSelector('.us-doc-finder__open');
    await page.click('.us-doc-finder__open');
    const [url, , width, height, title] = await page.evaluate(() => window.__dialogs[0]);
    assert.equal(url, 'https://tenant.test/UTNewTheme/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iUniformKey=' + KEYS.page + '&iOperation=Edit&TemplateType=E&DocumentTypeCode=CON&IsPopup=true');
    assert.deepEqual([width, height, title], ['95%', '95%', 'Edit Content Page']);

    // Starring a page saves to the user's Content-Favourites row.
    await page.fill(box, 'participation');
    await page.waitForSelector('.us-doc-finder__star');
    await page.click('.us-doc-finder__star');
    await page.waitForTimeout(600);
    const put = requests.find(request => request.method === 'PUT');
    assert.match(put.url, /i4u_UT_UserSettings\/100\/3$/);
    const values = JSON.parse(put.body).Properties.$values;
    assert.equal(values.find(entry => entry.Name === 'SettingsKey').Value, 'Content-Favourites');
    assert.deepEqual(JSON.parse(values.find(entry => entry.Name === 'Value').Value), [KEYS.page]);

    // With the box empty: Favourites, Recently opened and Recent searches,
    // kept apart from the IQA browser's.
    await page.fill(box, '');
    await page.waitForFunction(() => document.querySelectorAll('.us-doc-finder__heading').length === 3);
    const sections = await page.$$eval('.us-doc-finder__section', list => list.map(block => [
      block.querySelector('.us-doc-finder__heading').textContent,
      [...block.querySelectorAll('.us-doc-finder__name, .us-doc-finder__term')].map(node => node.textContent)
    ]));
    assert.deepEqual(sections, [
      ['Favourites', ['My_Participation']],
      ['Recently opened', ['My_Participation']],
      ['Recent searches', ['participation']]
    ]);
    const stored = await page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('unionsuite:')).sort());
    assert.ok(stored.includes('unionsuite:content-finder:opened'));
    assert.ok(!stored.some(key => key.startsWith('unionsuite:iqa-finder:')));
    await context.close();
  });

  await t.test('content editor: records the open page', async () => {
    const { page, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx',
      prefix: 'none',
      address: ''
    });
    await page.goto(ORIGIN + '/UTNewTheme/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iUniformKey=' + KEYS.other.toUpperCase() + '&iOperation=Edit');
    await page.addScriptTag({ url: '/theme/Scripts/Document-Finder.js' });
    assert.equal(await page.evaluate(() => window.UnionSuiteDocumentFinder.screen), 'content');
    const opened = await page.evaluate(() => JSON.parse(localStorage.getItem('unionsuite:content-finder:opened')));
    assert.equal(opened[0].k, KEYS.other);
    await context.close();
  });

  await t.test('IQA browser: keeps its storage from before the rename', async () => {
    const { page, context } = await openPage(browser, {
      pagePath: '/UTNewTheme/AsiCommon/Controls/IQA/Default.aspx',
      prefix: 'ctl01_TemplateBody_ObjectBrowser1',
      address: '$/_i4u_',
      favourites: { 'IQA-Favourites': '[]' },
      local: {
        'unionsuite:iqa-finder:opened': [{ k: KEYS.query, t: 1 }],
        'unionsuite:iqa-finder:names': { [KEYS.query]: ['Case List', '$/_i4u_/Core/Cases/Case List', 1] }
      }
    });
    assert.equal(await page.getAttribute('[id$="_ObjectQuickFindTextBox"]', 'placeholder'), 'Quick find, or search all queries');
    await page.focus('[id$="_ObjectQuickFindTextBox"]');
    await page.waitForSelector('.us-doc-finder__item');
    const opened = await page.$$eval('.us-doc-finder__section', list => list
      .filter(block => block.querySelector('.us-doc-finder__heading').textContent === 'Recently opened')
      .map(block => [...block.querySelectorAll('.us-doc-finder__name')].map(node => node.textContent)));
    assert.deepEqual(opened, [['Case List']]);
    assert.equal(await page.$eval('.us-doc-finder__item .us-doc-finder__go .ti', node => node.className), 'ti ti-file-search');
    await context.close();
  });
});
