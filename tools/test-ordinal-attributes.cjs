// Browser test for US-ORDINAL-ATTRIBUTES in zUnionSuite.js: a record ordinal
// a Query Template wrote with thousands separators ("1,234") becomes plain
// digits in the row's attribute, on load, when rows are added or changed,
// and in a page read without being shown.
// Run: node tools/test-ordinal-attributes.cjs
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.join(__dirname, '..');
const { chromium } = require(path.join(root, '.tmp-iqa-integration', 'node_modules', 'playwright'));

const source = fs.readFileSync(path.join(root, 'Theme', 'UnionSuite', 'zUnionSuite.js'), 'utf8');
const section = source.match(/\/\* US-ORDINAL-ATTRIBUTES:START[\s\S]*?\/\* US-ORDINAL-ATTRIBUTES:END \*\//);
assert(section, 'US-ORDINAL-ATTRIBUTES section not found');

// Both page reads the theme parses without showing normalise the result.
const reads = source.split('new DOMParser().parseFromString(').slice(1);
assert.strictEqual(reads.length, 2, 'expected two off-document page reads');
for (const read of reads) {
  assert(/window\.UnionSuiteOrdinals\?\.normalise\(doc\)/.test(read.slice(0, 900)), 'a page read does not normalise its document');
}

const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="list">
  <button id="first" data-ordinal="1,234">View</button>
  <article id="card" data-us-contact-ordinal="54,698"></article>
  <li id="task" data-us-task-ordinal="1,234,567"></li>
  <button id="small" data-ordinal="198"></button>
  <button id="plain" data-ordinal="54698"></button>
  <button id="odd" data-ordinal="12,34"></button>
  <span id="other" data-us-contact-id="1,234" title="1,234"></span>
</div>
<script>${section[0]}</script>
<script>
  // A section later in the theme: its observer must already see plain digits.
  window.seen = [];
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
    if (node.nodeType === 1) window.seen.push(node.getAttribute('data-ordinal') || node.querySelector('[data-ordinal]')?.getAttribute('data-ordinal'));
  }))).observe(document.body, {childList: true, subtree: true});
</script>
</body></html>`;

(async () => {
  const file = path.join(root, '.preview', 'test-ordinal-attributes.html');
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, page);
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const tab = await browser.newPage();
    const errors = [];
    tab.on('pageerror', error => errors.push(error.message));
    await tab.goto('file:///' + file.replace(/\\/g, '/'));
    const attribute = (id, name) => tab.evaluate(([id, name]) => document.getElementById(id).getAttribute(name), [id, name]);

    // On load.
    assert.strictEqual(await attribute('first', 'data-ordinal'), '1234');
    assert.strictEqual(await attribute('card', 'data-us-contact-ordinal'), '54698');
    assert.strictEqual(await attribute('task', 'data-us-task-ordinal'), '1234567');
    assert.strictEqual(await attribute('small', 'data-ordinal'), '198');
    assert.strictEqual(await attribute('plain', 'data-ordinal'), '54698');
    assert.strictEqual(await attribute('odd', 'data-ordinal'), '12,34', 'a value that is not a grouped integer is left alone');
    assert.strictEqual(await attribute('other', 'data-us-contact-id'), '1,234', 'other attributes are left alone');
    assert.strictEqual(await attribute('other', 'title'), '1,234');

    // Rows added later (a partial postback, a refreshed result set), nested and direct.
    const added = await tab.evaluate(async () => {
      const list = document.getElementById('list');
      list.insertAdjacentHTML('beforeend', '<div><button id="late" data-ordinal="2,345"></button></div>');
      const direct = document.createElement('button');
      direct.id = 'direct';
      direct.setAttribute('data-ordinal', '3,456');
      list.append(direct);
      await new Promise(resolve => setTimeout(resolve, 50));
      return {
        late: document.getElementById('late').getAttribute('data-ordinal'),
        direct: direct.getAttribute('data-ordinal'),
        found: Boolean(document.querySelector('[data-ordinal="2345"]')),
        seen: window.seen,
      };
    });
    assert.strictEqual(added.late, '2345');
    assert.strictEqual(added.direct, '3456');
    assert(added.found, 'the row is found by its plain ordinal');
    assert.deepStrictEqual(added.seen, ['2345', '3456'], 'a later observer sees plain digits');

    // An attribute changed in place.
    const changed = await tab.evaluate(async () => {
      const button = document.getElementById('small');
      button.setAttribute('data-ordinal', '9,999');
      await new Promise(resolve => setTimeout(resolve, 50));
      return button.getAttribute('data-ordinal');
    });
    assert.strictEqual(changed, '9999');

    // A page read without being shown.
    const parsed = await tab.evaluate(() => {
      const doc = new DOMParser().parseFromString('<div data-us-contact-ordinal="7,001"><button data-ordinal="7,001"></button></div>', 'text/html');
      const before = doc.querySelector('button').getAttribute('data-ordinal');
      window.UnionSuiteOrdinals.normalise(doc);
      const fragment = document.createRange().createContextualFragment('<i data-ordinal="8,002"></i>');
      window.UnionSuiteOrdinals.normalise(fragment);
      const element = document.createElement('b');
      element.setAttribute('data-ordinal', '9,003');
      window.UnionSuiteOrdinals.normalise(element);
      window.UnionSuiteOrdinals.normalise(null);
      return {
        before,
        button: doc.querySelector('button').getAttribute('data-ordinal'),
        card: doc.querySelector('div').getAttribute('data-us-contact-ordinal'),
        fragment: fragment.firstChild.getAttribute('data-ordinal'),
        element: element.getAttribute('data-ordinal'),
      };
    });
    assert.deepStrictEqual(parsed, {before: '7,001', button: '7001', card: '7001', fragment: '8002', element: '9003'});

    assert.deepStrictEqual(errors, [], 'no page errors');
    console.log('PASS ordinal attributes: on load, added rows (before later observers), changed attributes, off-document reads; other values and attributes untouched.');
  } finally {
    await browser.close();
    fs.rmSync(file, {force: true});
  }
})().catch(error => {
  console.error('FAIL', error.message);
  process.exit(1);
});
