const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('../../../../.tmp-iqa-integration/node_modules/playwright');
const example = require('../build/home-task-empty-example.cjs');
const noResults = fs.readFileSync('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-No-Results.html', 'utf8');

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1000, height: 850 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setContent(example.documentHtml());
    const empty = page.locator('#task-empty-example .us-task-empty');
    const toggle = page.locator('#task-empty-example .us-task-completed-toggle');
    await empty.waitFor();
    assert.equal(await empty.locator('svg').getAttribute('aria-hidden'), 'true');
    assert.equal(await empty.locator('.us-task-empty__hammock').evaluate(node => getComputedStyle(node).animationName), 'none');
    await toggle.click();
    await empty.waitFor({ state: 'detached' });
    await page.locator('#task-empty-example [data-us-task-toggle]').click();
    await page.waitForFunction(() => document.querySelector('#task-empty-example [data-us-task-completed="false"]'));
    assert.equal(await empty.count(), 0, 'reopened task prevents empty state');
    await toggle.click();
    await page.locator('#task-empty-example .us-iqa-filter-toggle').click();
    await page.locator('#task-empty-example input[type=search]').fill('no matching task');
    assert.equal(await empty.count(), 0, 'zero search matches is not zero outstanding');
    await page.locator('#task-empty-example input[type=search]').fill('');
    await page.locator('#task-empty-example [data-us-task-toggle]').click();
    await empty.waitFor();
    await page.screenshot({ path: '.preview/home-task-empty-desktop.png' });
    await page.setViewportSize({ width: 360, height: 800 });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '.preview/home-task-empty-mobile.png' });
    await page.evaluate(() => document.documentElement.setAttribute('data-us-color-scheme', 'dark'));
    await page.screenshot({ path: '.preview/home-task-empty-dark.png' });

    // A native no-results response omits the QueryTemplateSet altogether.
    await page.locator('#empty-query').click();
    await empty.waitFor();
    assert.equal(await page.locator('#task-empty-example .QueryTemplateSet').count(), 0);
    assert.equal(await page.locator('#task-empty-example .us-home-tasks-empty').isVisible(), false);
    await page.locator('#restore-task').click();
    await empty.waitFor({ state: 'detached' });
    assert.equal(await page.locator('#task-empty-example .us-task-empty').count(), 0);

    const wrap = (id, classes, content) => '<div class="ContentItemContainer"><div id="' + id + '" class="' + classes + '">' + example.panel(content) + '</div></div>';
    const completedSet = '<div class="QueryTemplateSet">' + example.taskRow(true) + '</div>';
    const fixtures = wrap('wrapped', 'us-home-tasks', noResults) +
      wrap('completed', 'us-home-tasks', completedSet) +
      wrap('empty-wrapper', '', completedSet) +
      '<div id="direct" class="ContentItemContainer">' + example.panel(completedSet) + '</div>' +
      wrap('optout', 'us-home-tasks us-report-no-styling', noResults) +
      wrap('error', 'us-home-tasks', '<p role="alert">Unable to load tasks</p>') +
      wrap('loading', 'us-home-tasks', '') +
      wrap('outer', 'us-home-tasks', wrap('nested', 'us-home-tasks', noResults)) +
      wrap('unknown', 'us-home-tasks', '<div class="QueryTemplateSet"><section><div class="QueryTemplateItem">Unmarked task</div></section></div>') +
      wrap('paged', 'us-home-tasks', '<div class="QueryTemplateSet">' + example.taskRow(true) + example.taskRow(false).replace('<section>', '<section style="display:none">') + '</div>');
    await page.locator('main').evaluate((node, html) => { node.innerHTML = html; UnionSuiteIqaFilters.refresh(); }, fixtures);
    await page.locator('#wrapped .us-task-empty').waitFor();
    for (const id of ['completed', 'nested']) assert.equal(await page.locator('#' + id + ' .us-task-empty').count(), 1);
    for (const id of ['direct', 'empty-wrapper', 'optout', 'error', 'loading', 'unknown', 'paged']) {
      assert.equal(await page.locator('#' + id + ' .us-task-empty').count(), 0, id);
    }
    assert.equal(await page.locator('#outer > .panel > .panel-body-container > .panel-body > .us-task-empty').count(), 0);
    const ids = await page.locator('.us-task-empty linearGradient').evaluateAll(nodes => nodes.map(node => node.id));
    assert.equal(new Set(ids).size, ids.length, 'gradient IDs are instance-local');
    await page.evaluate(() => { for (let i = 0; i < 5; i++) UnionSuiteIqaFilters.refreshQueryTemplates(); });
    assert.equal(await page.locator('#wrapped .us-task-empty').count(), 1, 'repeated refresh is idempotent');
    await page.locator('#wrapped').evaluate(node => { node.classList.remove('us-home-tasks'); UnionSuiteIqaFilters.refresh(); });
    await page.locator('#wrapped .us-task-empty').waitFor({ state: 'detached' });
    assert(await page.locator('#wrapped .us-home-tasks-empty').isVisible(), 'class removal restores native fallback');
    await page.locator('#completed').evaluate(node => { node.classList.add('us-report-no-styling'); UnionSuiteIqaFilters.refresh(); });
    await page.locator('#completed .us-task-empty').waitFor({ state: 'detached' });

    // Entire-panel replacement, not just results replacement.
    await page.locator('#wrapped').evaluate((node, html) => { node.classList.add('us-home-tasks'); node.innerHTML = html; UnionSuiteIqaFilters.refresh(); }, example.panel(completedSet));
    await page.locator('#wrapped .us-task-empty').waitFor();
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await page.locator('#wrapped .us-task-empty__hammock').evaluate(node => getComputedStyle(node).animationIterationCount), '1');
    assert.deepEqual(errors, []);
    console.log('PASS Biscuit empty state: completion/reopen, search, no-results, unknown/hidden records, wrapper ownership, opt-out, partial replacement, unique SVG IDs, responsive layout and reduced motion.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
