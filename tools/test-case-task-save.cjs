// The case task tick (cases.item-status in Scripts/ActionDefinitions.js) posts
// to the cases flow /cases/complete-task, not the agreements /ca/complete-task,
// through the shared CloudToolz call (base URL, ZenToken, headers).
'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const theme = read('Theme/UnionSuite/zUnionSuite.js');
const actions = read('Theme/UnionSuite/Scripts/ActionDefinitions.js');

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.setContent('<!doctype html><html><body>' +
      '<input type="hidden" id="__RequestVerificationToken" value="test-token">' +
      '<input type="hidden" id="__ClientContext" value=\'{"loggedInPartyId":"1004","selectedPartyId":"1004","isAnonymous":false}\'>' +
      '</body></html>');
    // The iMIS and CloudToolz calls, answered in the page.
    await page.evaluate(() => {
      window.calls = [];
      window.fetch = async (url, init = {}) => {
        url = String(url);
        if (url.startsWith('/api/query')) {
          return new Response(JSON.stringify({Items: {$values: [{Description: 'https://ct.test', Properties: {$values: [{Name: 'Description', Value: 'https://ct.test'}]}}]}}), {status: 200});
        }
        if (url === '/api/ZenTokens') return new Response('{}', {status: 201});
        window.calls.push({url, method: init.method, body: JSON.parse(init.body || 'null'), headers: init.headers});
        return new Response('{"TaskID":931,"Action":"Complete"}', {status: 200});
      };
    });
    await page.addScriptTag({content: theme});
    // Capture the savers ActionDefinitions registers.
    await page.evaluate(() => {
      window.savers = {};
      window.UnionSuiteTaskRows = {defineSaver: (name, fn) => { window.savers[name] = fn; }};
    });
    await page.addScriptTag({content: actions});
    const result = await page.evaluate(async () => {
      // A task row as the case tasks template renders it.
      const row = (ordinal, type) => {
        const el = document.createElement('div');
        el.setAttribute('data-us-task-ordinal', ordinal);
        if (type) el.setAttribute('data-us-task-note-type', type);
        return el;
      };
      await window.savers['cases.item-status']({root: row('931', 'Task'), done: true});
      await window.savers['cases.item-status']({root: row(' 932 '), done: false});
      let error = null;
      try { await window.savers['cases.item-status']({root: row(''), done: true}); } catch (e) { error = e.message; }
      return {calls: window.calls, error, agreementSaver: typeof window.savers['agreements.item-status']};
    });
    assert.deepEqual(errors, []);
    assert.deepEqual(result.calls.map(c => [c.url, c.method, c.body]), [
      ['https://ct.test/cases/complete-task', 'POST', {TaskID: '931', Action: 'Complete', NoteType: 'Task'}],
      ['https://ct.test/cases/complete-task', 'POST', {TaskID: '932', Action: 'Not Complete', NoteType: 'Task'}]
    ]);
    assert.equal(result.calls[0].headers.LoggedInPartyId, '1004', 'the flow reads the signed-in user from this header');
    assert.equal(result.error, 'The case task has no ordinal.');
    assert.equal(result.agreementSaver, 'function');
    // The agreement tick keeps the agreements flow.
    assert.match(actions, /cloudToolz\('\/ca\/complete-task'/);
    console.log('PASS case task tick posts {TaskID, Action, NoteType} to /cases/complete-task with the signed-in user; a row without an ordinal saves nothing; agreements keep /ca/complete-task.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
