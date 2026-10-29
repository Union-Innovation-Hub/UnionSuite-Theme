// A Query Template Display with no results (owner, 27 October 2026). iMIS
// renders its No results HTML straight into the panel body, with no
// QueryTemplateSet, beside the pager script. A quick add there must still
// show its holding row and bring the first row in; a list whose last row
// goes must show No results again; and an open composer must survive both.
// The page is served through routes, so every refresh reads it for real.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../../..');
const {chromium} = require(path.join(root, '.tmp-iqa-integration/node_modules/playwright'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const origin = 'https://theme.test';
const themeJs = read('Theme/UnionSuite/zUnionSuite.js');
const themeCss = read('Theme/UnionSuite/zUnionSuite.css');
let rows = [];
let nextOrdinal = 701;

// The meetings iPart as the server renders it now.
function ipart() {
  const pager = '<script type="text/javascript"> var contentItemId = \'#qts701\'; var resultsPerPage = \'30\'; ' +
    'var hidePageNumbers = \'False\'; var displayCards = \'False\'; var pageElement = \'section\'; ' +
    'jQuery(contentItemId).simplePaginate({ paginateElement: pageElement, elementsPerPage: resultsPerPage, uniqueId: \'qts701\' }); </script>';
  const results = rows.length
    ? '<div id="qts701" class="QueryTemplateSet">' + rows.map(row =>
      `<section><div class="QueryTemplateItem"><div class="test-meeting" data-ordinal="${row.ordinal}">${row.title}</div></div></section>`).join('') + '</div>'
    : '<div class="us-placeholder us-placeholder--compact"><h3>No meetings</h3><p>Schedule one.</p></div>';
  return '<div id="ste_container_Meetings" class="ContentItemContainer"><div class="us-action-test-add-meeting"><div class="panel">' +
    '<div class="panel-heading"><h2 class="panel-title">Meetings</h2></div>' +
    `<div class="panel-body-container"><div class="panel-body">${results} ${pager}</div></div></div></div></div>`;
}

function page() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
    // Only the pager plugin the refresh replays.
    '<script>window.jQuery = () => ({simplePaginate() {}}); window.jQuery.fn = {simplePaginate() {}};</script>' +
    `<style>${themeCss}</style></head><body>${ipart()}<script>${themeJs}</script><script>
      UnionSuiteComposers.define('test.add-meeting', {
        label: 'Add meeting', owner: 'test', source: 'test-empty-query-template.cjs',
        form: {href: '${origin}/form', title: 'Add meeting'},
        lists: () => ['us-action-test-add-meeting'],
        composer: {
          kind: 'meeting', label: 'New meeting', save: 'Save meeting', keepOpen: true,
          main: {type: 'text', name: 'Title', label: 'Meeting', required: 'Name the meeting first.'},
          fields: [],
          submit: async values => (await fetch('${origin}/save', {method: 'POST', body: values.Title})).json(),
          saved: 'Meeting added.'
        }
      });
    </script></body></html>`;
}

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const context = await browser.newContext({viewport: {width: 1200, height: 900}, reducedMotion: 'reduce'});
    await context.route(origin + '/**', async route => {
      const request = route.request();
      if (request.url() === origin + '/save') {
        await new Promise(resolve => setTimeout(resolve, 300));
        const ordinal = String(nextOrdinal++);
        rows.push({ordinal, title: request.postData()});
        return route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({Ordinal: ordinal})});
      }
      // A refresh's page read takes a moment, as on iMIS, so the holding
      // row is there to see.
      if (request.resourceType() !== 'document') await new Promise(resolve => setTimeout(resolve, 900));
      return route.fulfill({status: 200, contentType: 'text/html', body: page()});
    });
    const tab = await context.newPage();
    const errors = [];
    tab.on('pageerror', error => errors.push(error.message));
    tab.on('console', message => {
      if (['error', 'warning'].includes(message.type()) && /US-INLINE-COMPOSER|UnionSuite|Query Template/.test(message.text())) errors.push(message.text());
    });
    await tab.goto(origin + '/case');

    const ipartNode = tab.locator('#ste_container_Meetings');
    const results = ipartNode.locator('.QueryTemplateSet > section');
    const placeholder = ipartNode.locator('.us-placeholder');
    const composer = ipartNode.locator('.us-composer:not([data-closing])');
    const toggle = ipartNode.locator('.panel-heading .us-composer-toggle');
    await toggle.waitFor();
    assert.equal(await ipartNode.locator('.QueryTemplateSet').count(), 0);
    assert.equal(await placeholder.count(), 1);

    // Quick add on the empty list: the holding row confirms it, the first
    // row arrives quietly, No results goes, and the composer stays open.
    await toggle.click();
    await composer.locator('[data-name="Title"]').fill('Initial sit down');
    await composer.locator('.us-composer__save').click();
    await ipartNode.locator('.us-composer-holding').first().waitFor({state: 'attached'});
    await results.filter({hasText: 'Initial sit down'}).waitFor();
    await ipartNode.locator('.us-composer-holding').waitFor({state: 'detached'});
    assert.equal(await results.count(), 1);
    assert.equal(await placeholder.count(), 0);
    assert.equal(await composer.count(), 1);
    assert.equal(await composer.locator('[data-name="Title"]').inputValue(), '');
    assert.equal(await ipartNode.locator('.us-query-refresh-overlay').count(), 0);

    // A second quick add joins the list as usual.
    await composer.locator('[data-name="Title"]').fill('Follow-up');
    await composer.locator('.us-composer__save').click();
    await results.filter({hasText: 'Follow-up'}).waitFor();
    assert.equal(await results.count(), 2);

    // The rows go (deleted elsewhere): a quiet refresh shows No results
    // again, without the set, and keeps the composer.
    rows = [];
    await tab.evaluate(() => UnionSuiteRefresh.queryTemplate('#ste_container_Meetings', {insert: true}));
    assert.equal(await ipartNode.locator('.QueryTemplateSet').count(), 0);
    assert.equal(await placeholder.count(), 1);
    assert.equal(await composer.count(), 1);

    // A full refresh brings rows into an empty list too.
    rows = [{ordinal: '801', title: 'Added in the full form'}];
    await tab.evaluate(() => UnionSuiteRefresh.queryTemplate('#ste_container_Meetings'));
    assert.equal(await results.count(), 1);
    assert.equal(await placeholder.count(), 0);

    // One row refreshed after it went: the list shows No results.
    rows = [];
    await tab.evaluate(() => UnionSuiteRefresh.queryTemplate('#ste_container_Meetings', {row: '[data-ordinal="801"]'}));
    assert.equal(await ipartNode.locator('.QueryTemplateSet').count(), 0);
    assert.equal(await placeholder.count(), 1);

    assert.deepEqual(errors, []);
    console.log('PASS Empty Query Template: quick add confirms and brings the first row in, keeps the composer, and the last row going shows No results (insert, full and row refresh).');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
