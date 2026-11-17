// Unit test for US-FILTER-VALUE in zUnionSuite.js: a filter value a Query
// Template wrote with thousands separators is sent as a plain integer.
// Run: node tools/test-filter-value.cjs
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'Theme', 'UnionSuite', 'zUnionSuite.js'), 'utf8');
const section = source.match(/\/\* US-FILTER-VALUE:START[\s\S]*?\/\* US-FILTER-VALUE:END \*\//);
assert(section, 'US-FILTER-VALUE section not found');

const window = {};
vm.runInNewContext(section[0], {window});
const filterValue = window.UnionSuiteFilterValue;

const cases = [
  ['54,698', '54698'],
  ['1,234,567', '1234567'],
  ['-1,000', '-1000'],
  [' 54,698 ', '54698'],
  ['54698', '54698'],
  ['198', '198'],
  ['C407', 'C407'],
  ['Smith, John', 'Smith, John'],
  ['12,34', '12,34'],
  ['1,2345', '1,2345'],
  ['1,234.50', '1,234.50'],
  ['{#query.Ordinal}', '{#query.Ordinal}'],
  ['', ''],
  [null, ''],
  [undefined, ''],
  [54698, '54698'],
];

for (const [input, expected] of cases) {
  assert.strictEqual(filterValue(input), expected, `filterValue(${JSON.stringify(input)})`);
}

// Every reader of a template-supplied filter value goes through the helper.
const readers = ['usAlertsValue', 'usPositionsValue', 'usFactsValue', 'usValueFilterValue', 'usFieldsValue', 'usCountsValue', 'usActivityValue'];
for (const reader of readers) {
  const pattern = new RegExp(`UnionSuiteFilterValue\\?\\.\\(text\\([\\w?.]+\\.dataset\\.${reader}\\)\\)`);
  assert(pattern.test(source), `${reader} is not read through UnionSuiteFilterValue`);
}

console.log(`filter value: ${cases.length} values and ${readers.length} readers passed`);
