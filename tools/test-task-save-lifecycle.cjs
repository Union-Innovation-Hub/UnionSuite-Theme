// A cancelled celebration must not settle a pending iMIS write.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('../.tmp-iqa-integration/node_modules/playwright');
const source = fs.readFileSync('Theme/UnionSuite/zUnionSuite.js', 'utf8');
const script = source.split('/* US-BANNER-BEHAVIOUR:START */')[0] + '\n' +
  source.match(/\/\* US-TASK-ROWS:START[\s\S]*?US-TASK-ROWS:END \*\//)[0];
const template = fs.readFileSync('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html', 'utf8');
const record = {
  TaskTitle: 'Follow up renewal', TaskUrl: '#task', TaskNote: 'Call the member',
  MemberName: 'Alex Morgan', MemberUrl: '#member', IsCompleted: 'false',
  DueState: 'none', TaskDateLabel: 'Due tomorrow', DueLabel: 'Due tomorrow',
  TaskPartyId: '104019', TaskOrdinal: '219'
};

async function check(browser, interruption, status, initiallyCompleted = false) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => route.abort());
  try {
    const values = { ...record, IsCompleted: String(initiallyCompleted),
      TaskDateLabel: initiallyCompleted ? 'Actioned 10 September 2026' : record.TaskDateLabel };
    const row = template.replace(/\{#query\.(\w+)\}/g, (_, key) => values[key]);
    await page.setContent('<html lang="en-AU"><body><div class="ContentItemContainer">' +
      '<div id="tasks" class="us-query-search us-task-completed-filter"><div class="panel">' +
      '<div class="panel-heading"><h2 class="panel-title">Tasks</h2></div>' +
      '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' +
      '<section><div class="QueryTemplateItem">' + row + '</div></section>' +
      '</div></div></div></div></div></div></body></html>');
    await page.evaluate(() => {
      window.sent = [];
      window.fetch = (url, options) => new Promise(resolve => {
        window.sent.push(options);
        window.settleSave = status => resolve(new Response('{}', { status }));
      });
    });
    await page.addScriptTag({ content: script });
    await page.waitForSelector('.us-task-completed-toggle');
    await page.evaluate(initiallyCompleted => {
      if (initiallyCompleted) document.querySelector('.us-task-completed-toggle').click();
      window.taskUnderTest = document.querySelector('.us-task');
      taskUnderTest.querySelector('[data-us-task-toggle]').click();
    }, initiallyCompleted);
    await page.waitForFunction(() => window.sent.length === 1);
    if (interruption === 'reduced-motion') {
      await page.emulateMedia({ reducedMotion: 'reduce' });
    } else {
      await page.evaluate(interruption => {
        if (interruption === 'filter') document.querySelector('.us-task-completed-toggle').click();
        else if (interruption === 'search') {
          const input = document.querySelector('.us-query-search-field input');
          input.value = 'Alex';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        } else if (interruption === 'remove') taskUnderTest.closest('section').remove();
        else if (interruption === 'opt-out') document.getElementById('tasks').classList.add('us-report-no-styling');
        else if (interruption === 'hidden') {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
        } else window.dispatchEvent(new Event(interruption));
      }, interruption);
    }
    await page.waitForFunction(() => !document.querySelector('.us-task-particle'));
    assert.equal(await page.evaluate(() => taskUnderTest.getAttribute('data-us-task-completed')),
      String(initiallyCompleted), 'pending request must not commit a completion marker');
    assert.equal(await page.evaluate(() => taskUnderTest.hasAttribute('data-us-task-changing')), true);
    await page.evaluate(() => taskUnderTest.querySelector('[data-us-task-toggle]').click());
    assert.equal(await page.evaluate(() => sent.length), 1, 'interruption must not release the save lock');
    await page.evaluate(status => settleSave(status), status);
    await page.waitForFunction(() => !taskUnderTest.hasAttribute('data-us-task-changing'));
    const state = await page.evaluate(() => ({
      completed: taskUnderTest.getAttribute('data-us-task-completed'),
      checked: taskUnderTest.querySelector('[data-us-task-toggle]').getAttribute('aria-checked'),
      date: taskUnderTest.querySelector('.us-task__date').textContent,
      error: taskUnderTest.querySelector('.us-task__save-error')?.textContent || null
    }));
    const outcome = status === 200 ? !initiallyCompleted : initiallyCompleted;
    assert.equal(state.completed, String(outcome));
    assert.equal(state.checked, String(outcome));
    assert.equal(state.error, status === 200 ? null : 'Not saved. Try again.');
    if (status !== 200) assert.equal(state.date, values.TaskDateLabel, 'failed save restores the original date');
    assert.deepEqual(errors, []);
  } finally {
    await page.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const interruption of ['scroll', 'resize', 'filter', 'search', 'reduced-motion', 'hidden', 'remove', 'opt-out']) {
      for (const status of [200, 500]) await check(browser, interruption, status);
    }
    await check(browser, 'scroll', 500, true);
    console.log('PASS: 17 delayed-save cases; interrupted motion keeps the save lock, applies success and restores failures, including reopening.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
