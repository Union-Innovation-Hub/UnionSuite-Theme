const fs = require('node:fs');
const assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const read = file => fs.readFileSync(file, 'utf8');
const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html');
const taskUrl = '/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx?ID=104019&Ordinal=219';
const row = template.replace(/\{#query\.(\w+)\}/g, (_, key) => ({
  TaskTitle: 'Call Alex about renewal', TaskUrl: taskUrl, MemberName: 'Alex',
  MemberUrl: '/Party.aspx?ID=104019', IsCompleted: 'false'
}[key] || ''));

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://theme.test/**', route => route.fulfill({
      contentType: 'text/html',
      body: '<div class="ContentItemContainer"><div><div class="panel"><div class="panel-body">' + row + '</div></div></div></div>'
    }));
    await page.goto('https://theme.test/home');
    await page.evaluate(() => {
      window.calls = [];
      window.refreshes = [];
      window.ShowDialog_NoReturnValue = (...args) => calls.push(args);
    });
    await page.addScriptTag({content: read('Theme/UnionSuite/zUnionSuite.js')});
    // Stub only native report refresh; exercise the real action and popup lifecycle.
    await page.evaluate(() => {
      window.UnionSuiteRefresh = {
        capture: (trigger, owner) => ({trigger, owner}),
        forOrigin: () => ({}),
        plan: async (config, env) => refreshes.push({
          when: config.when, target: config.targets[0].type,
          title: env.origin.trigger.textContent
        })
      };
    });
    await page.addScriptTag({content: read('Theme/UnionSuite/Scripts/ActionDefinitions.js')});
    const title = page.locator('.us-task__title');
    await page.waitForFunction(() => document.querySelector('.us-task__title').dataset.usCommandState === 'ready');
    assert.equal(await title.textContent(), 'Call Alex about renewal');
    assert.equal(await title.getAttribute('aria-label'), 'Call Alex about renewal');
    assert.equal(await title.getAttribute('aria-haspopup'), 'dialog');
    assert.equal(await page.locator('.us-task__member-name').getAttribute('href'), '/Party.aspx?ID=104019');
    await title.press('Enter');
    await page.waitForFunction(() => calls.length === 1);
    assert.deepEqual(await page.evaluate(() => calls[0].slice(0, 5)),
      ['https://theme.test' + taskUrl, null, '70%', '70%', 'Open task']);
    await title.dispatchEvent('click');
    assert.equal(await page.evaluate(() => calls.length), 1);
    await page.evaluate(() => calls[0][11]({}, {}));
    await page.waitForFunction(() => refreshes.length === 1 && !document.querySelector('.us-task__title').hasAttribute('aria-busy'));
    assert.deepEqual(await page.evaluate(() => refreshes[0]), {
      when: 'close', target: 'origin-report', title: 'Call Alex about renewal'
    });
    // Replaced query output gets a fresh title and task URL without rebinding.
    await page.evaluate(html => {
      document.querySelector('.panel-body').innerHTML = html.replaceAll('Call Alex about renewal', 'Second task').replaceAll('Ordinal=219', 'Ordinal=220');
    }, row);
    await page.waitForFunction(() => document.querySelector('.us-task__title').dataset.usCommandState === 'ready');
    assert.equal(await title.textContent(), 'Second task');
    await title.press('Space');
    await page.waitForFunction(() => calls.length === 2);
    assert.match(await page.evaluate(() => calls[1][0]), /Ordinal=220$/);
    await page.evaluate(() => calls[1][11]({}, {}));
    await page.waitForFunction(() => refreshes.length === 2);
    await title.evaluate(element => element.setAttribute('data-us-task-url', ''));
    await page.waitForFunction(() => document.querySelector('.us-task__title').getAttribute('aria-disabled') === 'true');
    await title.dispatchEvent('click');
    assert.equal(await page.evaluate(() => calls.length), 2);
    assert.deepEqual(errors, []);
    console.log('PASS task title, native popup, keyboard, duplicate prevention, refresh on close, replaced rows and blank URL.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
