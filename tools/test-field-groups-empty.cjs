#!/usr/bin/env node
/*
 * US-FIELD-GROUPS: an Empty-<Group> column shows its line in place of a group
 * whose fields are all blank (the case's Case details, a case not about a
 * workplace), and changes nothing when any field has a value.
 *
 *   node tools/test-field-groups-empty.cjs
 */
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');

const js = fs.readFileSync('Theme/UnionSuite/zUnionSuite.js', 'utf8');
const section = js.slice(js.indexOf('/* US-FIELD-GROUPS:START'), js.indexOf('/* US-FIELD-GROUPS:END */'));
const css = fs.readFileSync('Theme/UnionSuite/zUnionSuite.css', 'utf8');
assert(section.length > 1000, 'the US-FIELD-GROUPS section is found');

const NOTE = 'This case isn’t about a workplace.';
const row = (workplace, empty = NOTE) => ({
  'Case-Status': 'New',
  'Workplace-Workplace': workplace,
  'Workplace-Address': '',
  'Empty-Workplace': empty,
  'Dates-Opened': '2025-08-18'
});

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1000, height: 800}});
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // Each panel's IQA answer comes from its filter value.
    const answers = {blank: row(''), filled: row('Acme Stores'), unset: row('', '')};
    await page.route('**/api/query?**', route => {
      const value = new URL(route.request().url()).searchParams.get('CaseNum');
      route.fulfill({contentType: 'application/json', body: JSON.stringify({Items: {$values: [answers[value]]}})});
    });
    await page.route('http://test.local/', route => route.fulfill({contentType: 'text/html', body:
      '<!doctype html><html><head><style>' + css + '</style></head><body>' +
      ['blank', 'filled', 'unset'].map(value =>
        '<div id="' + value + '" class="us-field-groups" data-us-fields-query="$/Test/Case Details" data-us-fields-filter="CaseNum" data-us-fields-value="' + value + '"></div>').join('') +
      '<script>' + section + '</script></body></html>'}));
    await page.goto('http://test.local/');
    await page.waitForFunction(() => [...document.querySelectorAll('.us-field-groups')].every(n => n.getAttribute('data-us-fields-state') === 'ready'));

    const read = id => page.locator('#' + id).evaluate(root => [...root.querySelectorAll('.us-field-groups__group')].map(group => ({
      heading: group.querySelector('.us-field-groups__heading')?.textContent || '',
      empty: group.classList.contains('us-field-groups__group--empty'),
      note: group.querySelector(':scope > .us-field-groups__note')?.textContent || '',
      fieldsShown: getComputedStyle(group.querySelector('.us-fields')).display !== 'none',
      labels: [...group.querySelectorAll('dt')].map(dt => dt.textContent)
    })));

    const blank = await read('blank');
    assert.deepEqual(blank.map(g => g.heading), ['Case', 'Workplace', 'Dates'], 'Empty is not a group of its own');
    const workplace = blank.find(g => g.heading === 'Workplace');
    assert.equal(workplace.empty, true, 'all-blank group gets the empty class');
    assert.equal(workplace.note, NOTE, 'the Empty- line replaces the fields');
    assert.equal(workplace.fieldsShown, false, 'the blank fields are hidden');
    assert.equal(blank.find(g => g.heading === 'Case').empty, false, 'other groups are unchanged');

    const filled = (await read('filled')).find(g => g.heading === 'Workplace');
    assert.equal(filled.empty, false, 'one value keeps the group as usual');
    assert.equal(filled.note, '');
    assert.equal(filled.fieldsShown, true);
    assert.deepEqual(filled.labels, ['Workplace', 'Address'], 'its blank field still shows, as a dash');

    const unset = (await read('unset')).find(g => g.heading === 'Workplace');
    assert.equal(unset.empty, false, 'a blank Empty- column leaves the dashes');
    assert.equal(unset.fieldsShown, true);

    // The activity feed's build() lays out rows the same way.
    const built = await page.evaluate(row => {
      const root = window.UnionSuiteFieldGroups.build(row);
      return root.querySelector('.us-field-groups__group--empty .us-field-groups__note')?.textContent;
    }, row(''));
    assert.equal(built, NOTE, 'build() honours Empty- too');

    await page.locator('#blank').screenshot({path: '.preview/field-groups-empty.png'});
    assert.deepEqual(errors, [], 'no page errors');
    console.log('Field groups Empty- rule: all checks passed.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
