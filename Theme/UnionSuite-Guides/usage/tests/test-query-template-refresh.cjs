// Server-rendered Query Template fixtures; no live iMIS writes or script replay.
const {guidePath}=require('../build/guide-output.cjs');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const {chromium} = require(path.join(root, '.tmp-iqa-integration/node_modules/playwright'));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html');
const footer = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html');
const script = read('Theme/UnionSuite/zUnionSuite.js');
const definitions = read('Theme/UnionSuite/Scripts/ActionDefinitions.js');

function fixture(revision = 0, shape = 'wrapped', id = 'ste_container_ciTasks') {
  const setId = 'tasks' + revision;
  const rows = [false, true, false].map((complete, index) => {
    const record = {
      TaskTitle: (index === 0 ? 'Call Alex' : index === 1 ? 'Completed task' : 'Email Jordan') + ' ' + revision,
      TaskUrl: '/editor?ID=104019&Ordinal=' + (index + 1), IsCompleted: String(complete),
      TaskDateLabel: 'Due today', MemberName: 'James', MemberUrl: '/member',
      MemberId: index === 0 ? '104019' : '101000', TaskNote: 'Test note'
    };
    return '<section><div class="QueryTemplateItem">' + template.replace(/\{#query\.(\w+)\}/g, (_, key) => record[key] || '') + '</div></section>';
  }).join('');
  // Captured native simplePaginate startup shape, with synthetic IDs/data.
  const startup = `<script>
    var contentItemId = '#${setId}';
    var resultsPerPage = '10';
    var hidePageNumbers = 'False';
    var displayCards = 'False';
    var pageElement = 'section';
    jQuery(contentItemId).simplePaginate({
      paginateElement: pageElement, elementsPerPage: resultsPerPage,
      firstButton: false, lastButton: false, prevButtonText: "&laquo;", nextButtonText: "&raquo;",
      hidePaginationNumbers: hidePageNumbers.toLowerCase().trim(), uniqueId: '${setId}', pagerLocation: 'justify-content-center'
    });
  </script><script>window.unrelatedScriptRuns = (window.unrelatedScriptRuns || 0) + 1;</script>`;
  // no-results: iMIS's shape with no records, as on the live home page (4 November
  // 2026): its No results HTML straight in the panel body, no QueryTemplateSet.
  const results = shape === 'no-results' ? '<p class="us-home-tasks-empty">No outstanding tasks assigned to you.</p>' : '<div id="' + setId + '" class="QueryTemplateSet">' + rows + '</div>' + footer;
  const content = shape === 'no-panel' ? '<div id="' + setId + '" class="QueryTemplateSet">' + rows + '</div>' + startup : '<div class="panel"><div class="panel-heading"><h2 class="panel-title">My Tasks</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body">' + results + startup + '</div></div></div>';
  const classes = 'us-query-search us-task-completed-filter us-action-home-add-task';
  const inner = shape === 'direct' || shape === 'no-panel' ? content : '<div class="' + (shape === 'empty' ? '' : classes) + (shape === 'unstyled' ? ' us-report-no-styling' : '') + '">' + content + '</div>';
  // Real iPart author classes only go on the inserted class div. The direct and
  // empty-wrapper fixtures intentionally have no author enhancements.
  return '<div id="' + id + '" class="ContentItemContainer">' + inner + '</div>';
}

(async () => {
  const browser = await chromium.launch({channel:'msedge', headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1400, height:1000}});
    await page.emulateMedia({reducedMotion:'reduce'});
    let revision = 0, mode = 'ok', shape = 'wrapped', release;
    const requests = [], errors = [];
    page.on('pageerror', error => errors.push(error.stack));
    await page.route('https://theme.test/**', async route => {
      const request = route.request();
      if (request.resourceType() === 'document') {
        await route.fulfill({contentType:'text/html', body:'<!doctype html><html><body></body></html>'});
        return;
      }
      requests.push(request.url());
      if (mode === 'hold') await new Promise(resolve => { release = resolve; });
      const markup = fixture(++revision, shape);
      await route.fulfill({status:mode === 'http-error' ? 500 : 200, contentType:mode === 'json' ? 'application/json' : 'text/html',
        body:mode === 'missing' ? '<html><body>Sign in</body></html>' : mode === 'duplicate' ? markup + markup : markup});
    });
    await page.goto('https://theme.test/home?ID=001');
    await page.evaluate(() => {
      window.popups = [];
      window.paginationCalls = [];
      // Verify the adapter invokes the existing native plugin with the fresh ID
      // and settings. The plugin implementation itself is owned by iMIS.
      window.jQuery = element => ({simplePaginate: settings => {
        paginationCalls.push({id:element.id, ...settings});
        element.classList.add('simplePaginateList');
      }});
      window.jQuery.fn = {simplePaginate() {}};
      window.ShowDialog_NoReturnValue = (...args) => popups.push(args);
    });
    await page.evaluate(html => {
      document.body.innerHTML = '<input id="__ClientContext" type="hidden" value=\'{"loggedInPartyId":"104019"}\'>' + html;
    }, fixture());
    for (const file of ['Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite/zUnionSuite.css']) {
      await page.addStyleTag({content:read(file).replace(/@import\s+[^;]+;/g, '')});
    }
    await page.addScriptTag({content:script});
    await page.addScriptTag({content:definitions});
    const container = page.locator('#ste_container_ciTasks');
    const waitReady = () => page.waitForFunction(() => {
      const root = document.getElementById('ste_container_ciTasks');
      return root.querySelector('.us-action-home-add-task[data-us-command-state="ready"]') &&
        root.querySelector('.us-task-completed-toggle') && root.querySelector('.us-iqa-filter-toggle');
    });
    await waitReady();
    const add = container.locator('button.us-action-home-add-task');
    const completed = container.locator('.us-task-completed-toggle');
    const refresh = options => page.evaluate(options => UnionSuiteRefresh.queryTemplate('#ste_container_ciTasks', options), options);
    const visible = () => container.locator('.QueryTemplateSet > section:visible').count();
    const personal = container.locator('.us-task__member-name').first();
    const waitPersonal = () => page.waitForFunction(() => {
      const link = document.querySelector('#ste_container_ciTasks .us-task__member-name');
      return link.textContent === 'Personal Task' && !link.hasAttribute('href') && link.tabIndex === -1;
    });
    await waitPersonal();
    assert.equal(await personal.getAttribute('aria-disabled'), 'true');
    assert.equal(await container.locator('.us-task__member-name').nth(2).textContent(), 'James');
    assert.equal(await container.locator('.us-task__member-name').nth(2).getAttribute('href'), '/member');
    const homeUrl = page.url();
    await personal.evaluate(link => link.click());
    assert.equal(page.url(), homeUrl);
    for (const context of ['{}', '{"loggedInPartyId":"0104019"}', '{"loggedInPartyId":"104019","isAnonymous":true}', 'invalid json']) {
      await page.evaluate(value => {
        document.getElementById('__ClientContext').value = value;
        UnionSuiteTaskRows.refresh();
      }, context);
      await page.waitForFunction(() => document.querySelector('#ste_container_ciTasks .us-task__member-name').textContent === 'James');
      assert.equal(await personal.getAttribute('href'), '/member');
      assert.equal(await personal.getAttribute('aria-disabled'), null);
      assert.equal(await personal.getAttribute('tabindex'), null);
    }
    await page.evaluate(() => {
      document.getElementById('__ClientContext').value = '{"loggedInPartyId":104019}';
      UnionSuiteTaskRows.refresh();
    });
    await waitPersonal();
    await personal.evaluate(link => link.setAttribute('data-id', ''));
    await page.waitForFunction(() => document.querySelector('#ste_container_ciTasks .us-task__member-name').textContent === 'James');
    await personal.evaluate(link => link.setAttribute('data-id', '104019'));
    await waitPersonal();
    await container.locator(':scope > div').evaluate(owner => owner.classList.add('us-report-no-styling'));
    await page.waitForFunction(() => document.querySelector('#ste_container_ciTasks .us-task__member-name').textContent === 'James');
    await container.locator(':scope > div').evaluate(owner => owner.classList.remove('us-report-no-styling'));
    await waitReady();
    await waitPersonal();
    assert.equal(await visible(), 2);
    assert.match(await container.locator('[data-us-task-summary]').textContent(), /2 outstanding/);
    await add.click();
    await page.waitForFunction(() => popups.length === 1);
    await page.evaluate(() => popups[0][11]({}, {}));
    await page.waitForFunction(() => paginationCalls.length === 1);
    await waitReady();
    await waitPersonal();
    assert.equal(await visible(), 2);
    assert.equal(await add.count(), 1);
    assert.equal(await completed.getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('.us-command-notice').count(), 0);
    assert.deepEqual(await page.evaluate(() => [paginationCalls[0].id, paginationCalls[0].uniqueId, paginationCalls[0].elementsPerPage]), ['tasks1', 'tasks1', 10]);
    assert.equal(await page.evaluate(() => window.unrelatedScriptRuns || 0), 0);
    // Preserve authored wrapper identity, disclosure, query and completed choice.
    await container.locator('.us-iqa-filter-toggle').click();
    const input = container.locator('input[type="search"]');
    await input.fill('Call Alex');
    await completed.click();
    await input.focus();
    await refresh();
    await waitReady();
    assert.equal(await input.inputValue(), 'Call Alex');
    assert.equal(await completed.getAttribute('aria-pressed'), 'true');
    assert.equal(await visible(), 1);
    assert.equal(await input.evaluate(node => node === document.activeElement), true);
    await input.fill('');
    assert.equal(await visible(), 3);
    // Open-task popup also uses the real refresh; repeat does not duplicate controls.
    await container.locator('.us-task__title').first().click();
    await page.waitForFunction(() => popups.length === 2);
    await page.evaluate(() => popups[1][11]({}, {}));
    await page.waitForFunction(() => paginationCalls.length === 3);
    await waitReady();
    assert.equal(await add.count(), 1);
    assert.equal(await container.locator('.us-iqa-filter-toggle').count(), 1);
    mode = 'http-error';
    await add.click();
    await page.waitForFunction(() => popups.length === 3);
    await page.evaluate(() => popups[2][11]({}, {}));
    await page.getByRole('button', {name:'Retry refresh'}).waitFor();
    mode = 'ok';
    await page.getByRole('button', {name:'Retry refresh'}).click();
    await page.waitForFunction(() => document.querySelector('.us-command-notice')?.textContent === 'View refreshed.');
    assert.equal(await page.evaluate(() => popups.length), 3);
    await waitReady();
    // Errors reject and leave existing records, overlays and state intact.
    for (mode of ['http-error', 'missing', 'duplicate', 'json']) {
      const before = await container.locator('.QueryTemplateSet').getAttribute('id');
      await assert.rejects(refresh());
      assert.equal(await container.locator('.QueryTemplateSet').getAttribute('id'), before);
      assert.equal(await container.getAttribute('aria-busy'), null);
      assert.equal(await container.locator('.us-query-refresh-overlay').count(), 0);
      assert.equal(await container.locator('[inert]').count(), 0);
    }
    mode = 'hold';
    const pending = refresh();
    await page.waitForFunction(() => document.querySelector('.us-query-refresh-overlay'));
    assert.equal(await container.getAttribute('aria-busy'), 'true');
    assert(await container.locator('.QueryTemplateSet').isVisible());
    // A native/manual replacement while fetching makes the response stale.
    await container.locator('.QueryTemplateSet').evaluate(set => set.replaceWith(set.cloneNode(true)));
    release();
    await assert.rejects(pending, /changed while/);
    mode = 'ok';
    await page.evaluate(() => history.replaceState(null, '', '/home#/tasks?ID=002'));
    await refresh();
    assert.equal(requests.at(-1), 'https://theme.test/home?ID=002');
    await assert.rejects(page.evaluate(() => UnionSuiteRefresh.queryTemplate('#ste_container_ciTasks', {url:'https://other.test/home'})), /same-origin/);
    // Adding the first task: the empty list is the Add task popup's origin, so
    // closing the popup refreshes it and the new rows replace the No results text.
    shape = 'wrapped';
    await page.evaluate(html => { document.getElementById('ste_container_ciTasks').outerHTML = html; }, fixture(0, 'no-results'));
    await page.waitForFunction(() => document.querySelector('#ste_container_ciTasks .us-action-home-add-task[data-us-command-state="ready"]'));
    assert.equal(await container.locator('.QueryTemplateSet').count(), 0);
    const opened = await page.evaluate(() => popups.length), paged = await page.evaluate(() => paginationCalls.length);
    await add.click();
    await page.waitForFunction(count => popups.length === count + 1, opened);
    await page.evaluate(() => popups.at(-1)[11]({}, {}));
    await page.waitForFunction(count => paginationCalls.length === count + 1, paged);
    await page.waitForFunction(() => document.querySelectorAll('#ste_container_ciTasks .QueryTemplateSet > section').length === 3);
    assert.equal(await container.locator('.us-home-tasks-empty').count(), 0);
    // Only the earlier Retry step's success message may still be showing.
    assert.deepEqual((await page.locator('.us-command-notice').allTextContents()).filter(text => text !== 'View refreshed.'), [], 'no refresh error notice');
    // Direct, empty-wrapper, no-styling and no-panel forms remain refreshable.
    for (shape of ['no-panel', 'direct', 'empty', 'unstyled']) {
      await page.evaluate(html => { document.getElementById('ste_container_ciTasks').outerHTML = html; }, fixture(0, shape));
      await refresh();
      assert.equal(await container.locator('.QueryTemplateSet').count(), 1);
      assert.equal(await container.locator('button.us-action-home-add-task').count(), 0);
    }
    await page.evaluate(() => {
      document.querySelector('.panel-body').insertAdjacentHTML('beforeend', '<div class="ContentItemContainer"><div class="QueryTemplateSet"></div></div>');
    });
    await assert.rejects(refresh(), /Nested iParts/);
    // Exercise the generated, offline guide's live simulation as delivered.
    await page.goto(pathToFileURL(guidePath('Usage-Guide.html')).href);
    const demo = page.frameLocator('#query-template-refresh-demo');
    await demo.locator('button.us-action-home-add-task').waitFor();
    await demo.locator('.us-task__member-name').filter({hasText:'Personal Task'}).waitFor();
    assert.equal(await demo.locator('.us-task__member-name').first().getAttribute('href'), null);
    await demo.locator('.us-iqa-filter-toggle').click();
    await demo.locator('input[type="search"]').fill('Alex');
    await demo.locator('#demo-refresh').click();
    await demo.locator('#demo-status').filter({hasText:'Results refreshed.'}).waitFor();
    assert.equal(await demo.locator('input[type="search"]').inputValue(), 'Alex');
    assert.equal(await demo.locator('button.us-action-home-add-task').count(), 1);
    assert.equal(await demo.locator('.us-task-completed-toggle').getAttribute('aria-pressed'), 'false');
    assert(await demo.locator('.us-task--detail').first().evaluate(row => {
      const title = row.querySelector('.us-task__title span');
      const note = row.querySelector('.us-task__note');
      return Math.abs(title.getBoundingClientRect().left - note.getBoundingClientRect().left) < 1;
    }));
    await demo.locator('#demo-failure').check();
    await demo.locator('#demo-refresh').click();
    await demo.locator('#demo-status').filter({hasText:'HTTP 500'}).waitFor();
    assert.equal(await demo.locator('.QueryTemplateSet > section:visible').count(), 1);
    fs.mkdirSync(path.join(root, '.preview'), {recursive:true});
    await demo.locator('#demo-failure').uncheck();
    await demo.locator('#demo-refresh').click();
    await demo.locator('#demo-status').filter({hasText:'Results refreshed.'}).waitFor();
    await page.locator('#query-template-refresh-demo').screenshot({path:path.join(root, '.preview/query-template-refresh.png')});
    await page.setViewportSize({width:390, height:844});
    assert.equal(await demo.locator('body').evaluate(node => node.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('PASS Query Template popup refresh: header controls, filters/count, first record into an empty list, native pagination, script isolation, focus, wrappers, nested rejection and failed/stale requests.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
