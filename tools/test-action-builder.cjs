const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const core = require('../Theme/UnionSuite-Guides/usage/examples/Action-Builder/builder-core.js');

function compile(model) {
  let definition;
  const sandbox = {
    window: {location: {href: 'https://theme.test/Member.aspx?ID=00123'}, UnionSuiteActions: {
      define(key, value) { definition = {key, value}; },
      configure(key, value) { definition = {key, value}; }
    }}, URL
  };
  const output = core.generate(model);
  vm.runInNewContext(output.js, sandbox);
  return {...definition, output, sandbox};
}

(async () => {
  for (const kind of ['job', 'popup', 'function', 'navigate']) {
    const model = core.preset(kind);
    assert.deepEqual(core.validate(model).errors, [], kind);
    assert.deepEqual(core.normalize(JSON.parse(JSON.stringify(model))), model, 'draft round trip');
    const {value} = compile(model);
    assert.equal(value.action.type, model.operation);
    assert.equal(value.context[model.context[0].name].required, true);
  }
  const job = core.preset();
  let built = compile(job);
  const url = new URL(built.value.action.href({context: {partyId: '00 A&B', ordinal: '22', workplaceId: '8/9'}}));
  assert.equal(url.searchParams.get('ID'), '00 A&B');
  assert.equal(url.searchParams.get('Worksite'), '8/9');
  assert.equal(url.searchParams.get('AllowEdit'), 'True');
  assert.equal(built.value.action.refresh.targets[0].type, 'origin-report');
  job.label = 'Edit </script><script>window.pwned=true</script> & "record"';
  job.context[0].sample = '" onclick="bad()';
  built = compile(job);
  assert(!built.output.js.includes('</script>'));
  assert(built.output.html.includes('&quot; onclick=&quot;bad()'));
  assert.equal(built.sandbox.window.pwned, undefined);
  job.refreshMode = 'both';
  job.targets = [{selector: '.JobsIQA', match: 'one'}, {selector: '.NotesIQA', match: 'all'}];
  built = compile(job);
  assert.equal(built.value.action.refresh.targets.length, 3);
  assert.equal(built.value.action.refresh.targets[2].match, 'all');
  const fn = core.preset('function');
  fn.refreshMode = 'custom';
  built = compile(fn);
  let received;
  built.sandbox.window.MyActions = {updateRecord(env) { received = env; return Promise.resolve('done'); }, refreshRelatedViews(env) { return env.context.recordId; }};
  const env = {context: {recordId: '001'}};
  assert.equal(await built.value.action.run(env), 'done');
  assert.equal(received, env);
  assert.equal(built.value.action.refresh.run(env), '001');
  assert.equal(built.value.action.requires.length, 2);
  assert(core.validate({...fn, command: 'bad name'}).errors.length);
  assert(core.validate({...fn, helper: 'MyActions.run()'}).errors.length);
  assert(core.validate({...fn, helper: 'constructor.constructor'}).errors.length);
  assert(core.validate({...fn, registration: 'configure', acknowledge: false}).errors.length);
  assert(core.validate(core.preset(), [{key: 'jobs.edit-example', className: 'us-action-jobs-edit-example'}]).errors.length);
  assert(core.validate({...core.preset(), placement: 'header'}).errors.length);
  assert(core.validate({...core.preset(), popupWidth: '80vw'}).errors.length);
  assert.throws(() => core.normalize({version: 100}), /version 1/);

  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}});
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
    await page.route(/^https?:/, route => route.abort());
    await page.goto(pathToFileURL(path.resolve('references/Action-Builder-Preview.html')).href);
    const ready = () => page.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Ready.'));
    const frame = page.frameLocator('#action-preview');
    await ready();
    assert(await frame.locator('#sample-result').evaluate(node => node.getBoundingClientRect().bottom <= innerHeight), 'preview feedback fits inside its frame');
    await frame.getByRole('button', {name: 'Edit job', exact: true}).click();
    assert.match(await frame.locator('#sample-destination').innerText(), /ID=103885/);
    await frame.getByRole('button', {name: 'Close example'}).click();
    await page.waitForFunction(() => document.querySelector('#simulation-status').textContent.includes('Simulated refresh: originating native IQA'));

    await page.locator('#simulate-missing').check();
    await page.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Missing required'));
    assert.equal(await frame.locator('button.us-command').getAttribute('aria-disabled'), 'true');
    await page.locator('#simulate-missing').uncheck();
    await ready();
    await page.locator('#refresh-mode').selectOption('both');
    await page.locator('#add-target').click();
    await page.locator('[data-target="1"] input').fill('.NotesIQA');
    await page.locator('[data-target="1"] select').selectOption('all');
    assert.match(await page.locator('#code-js').innerText(), /\.NotesIQA/);
    await page.locator('#tab-html').click();
    assert.match(await page.locator('#code-html').innerText(), /data-workplace="103842"/);
    await page.locator('#tab-html').press('ArrowRight');
    assert.equal(await page.locator('#tab-setup').getAttribute('aria-selected'), 'true');

    // A new definition cannot silently replace a bundled action.
    await page.locator('#command').fill('edit');
    assert.match(await page.locator('#validation').innerText(), /already bundled/);
    assert(await page.locator('#download-js').isDisabled());
    await page.locator('.builder-advanced summary').click();
    await page.locator('#registration').selectOption('configure');
    await page.locator('#acknowledge').check();
    assert.equal(await page.locator('#download-js').isDisabled(), false);
    assert.match(await page.locator('#code-js').textContent(), /UnionSuiteActions.configure/);
    await page.locator('#permission').fill('jobs.edit');
    await page.locator('#simulate-denied').check();
    await page.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Permission denial'));
    assert.equal(await frame.locator('button.us-command').getAttribute('aria-disabled'), 'true');

    // Header preset outputs just the author class; preview reproduces iMIS's wrapper.
    await page.locator('#preset').selectOption('popup');
    await page.locator('#load-preset').click();
    await ready();
    assert.equal(await frame.locator('.ContentItemContainer > div.us-action-records-edit-example > .panel').count(), 1);
    assert.equal(await page.locator('#code-html').textContent(), 'us-action-records-edit-example');
    await page.locator('#placement').selectOption('menu');
    await page.waitForFunction(() => document.querySelector('#code-html').textContent.includes('us-actions__item'));
    await frame.locator('.us-actions__toggle').click();
    await frame.locator('.us-actions__item').click();
    await frame.locator('#sample-close').click();

    // Native navigation is simulated; the configured destination is never opened.
    await page.locator('#preset').selectOption('navigate');
    await page.locator('#load-preset').click();
    await ready();
    assert(await page.locator('#refresh-settings').isHidden());
    assert(!(await page.locator('#code-js').textContent()).includes('refresh:'));
    await frame.getByRole('button', {name: 'View record', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Would open'));

    // Download output and draft round trip, including graceful bad-draft rejection.
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText: async text => { window.copiedBuilderText = text; }}}));
    await page.locator('#tab-js').click();
    await page.locator('[data-copy="js"]').click();
    assert.equal(await page.evaluate(() => window.copiedBuilderText), await page.locator('#code-js').textContent());
    await page.locator('#tab-html').click();
    await page.locator('[data-copy="html"]').click();
    assert.equal(await page.evaluate(() => window.copiedBuilderText), await page.locator('#code-html').textContent());
    const downloadEvent = page.waitForEvent('download');
    await page.locator('#download-js').click();
    const download = await downloadEvent;
    assert.equal(download.suggestedFilename(), 'records.view-example.registration.js');
    assert.equal(fs.readFileSync(await download.path(), 'utf8'), await page.locator('#code-js').textContent());
    const draftEvent = page.waitForEvent('download');
    await page.locator('#download-draft').click();
    const savedDraft = JSON.parse(fs.readFileSync(await (await draftEvent).path(), 'utf8'));
    assert.equal(core.normalize(savedDraft).operation, 'navigate');
    const draft = core.preset('function');
    draft.label = 'Run imported action';
    await page.locator('#load-draft').setInputFiles({name: 'draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(draft))});
    assert.equal(await page.locator('#label').inputValue(), 'Run imported action');
    // Confirm the exported snippets are accepted by the actual production validator.
    const validator = await browser.newPage();
    await validator.addScriptTag({content: fs.readFileSync('Theme/UnionSuite/zUnionSuite.js', 'utf8')});
    for (const kind of ['job', 'popup', 'function', 'navigate']) {
      const config = core.preset(kind);
      config.command += '-' + kind;
      const generated = core.generate(config);
      await validator.addScriptTag({content: generated.js});
      assert.equal(await validator.evaluate(key => UnionSuiteActions.getActionStatus(key).status, generated.key), 'registered');
    }
    await validator.close();
    await ready();
    await frame.getByRole('button', {name: 'Run imported action', exact: true}).click();
    await page.waitForFunction(() => document.querySelector('#simulation-status').textContent.startsWith('Simulated refresh:'));
    await page.locator('#load-draft').setInputFiles({name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{"version":1}')});
    assert.match(await page.locator('#copy-status').innerText(), /Draft not loaded/);
    assert.equal(await page.locator('#label').inputValue(), 'Run imported action');
    await page.locator('#preset').selectOption('job');
    await page.locator('#load-preset').click();
    await ready();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({path: '.preview/action-builder-desktop.png'});
    await page.setViewportSize({width: 390, height: 844});
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({path: '.preview/action-builder-mobile.png'});

    // Appearance feedback uses the real renderer and remains live while unrelated
    // settings are invalid. It does not reload its frame or execute an action.
    const appearance = page.frameLocator('#appearance-preview');
    await appearance.locator('.us-icon-button svg').waitFor();
    await appearance.locator('body').evaluate(node => { node.dataset.testPersistent = 'yes'; });
    await page.locator('#destination').fill('');
    await page.locator('#label').fill('Email member');
    await page.locator('#icon').selectOption('ti-mail');
    await appearance.locator('.ti-mail').waitFor();
    await appearance.getByRole('button', {name: 'Email member', exact: true}).waitFor();
    assert((await appearance.locator('.ti-mail').evaluate(node => getComputedStyle(node).fontFamily)).includes('tabler'));
    await page.locator('#appearance').selectOption('button');
    await appearance.locator('.us-outline-button').waitFor();
    await page.locator('#tone').selectOption('danger');
    await appearance.locator('.DangerButton').waitFor();
    await page.locator('#placement').selectOption('menu');
    await appearance.locator('.us-actions__item--danger').waitFor();
    await page.locator('#appearance').selectOption('link');
    await appearance.locator('.us-panel-action--text').waitFor();
    await page.locator('#appearance').selectOption('icon');
    await page.locator('#icon').selectOption('');
    await appearance.locator('.us-outline-button').waitFor();
    assert.equal(await appearance.locator('button span').innerText(), 'Email member', 'no-icon fallback keeps the label');
    await page.locator('#label').fill('');
    await appearance.getByRole('button', {name: 'Action label', exact: true}).waitFor();
    assert.equal(await appearance.locator('body').getAttribute('data-test-persistent'), 'yes');
    assert(await page.locator('#download-js').isDisabled(), 'appearance sample does not bypass definition validation');
    await page.locator('#label').fill('Email member');
    await page.locator('#icon').selectOption('ti-mail');
    await page.locator('#appearance').selectOption('button');
    await page.locator('#tone').selectOption('default');
    await appearance.locator('.us-outline-button:not(.DangerButton) .ti-mail').waitFor();
    await appearance.getByRole('button', {name: 'Email member', exact: true}).click();
    assert.equal(await appearance.locator('dialog').count(), 0);
    assert(await appearance.locator('body').evaluate(node => node.scrollWidth <= innerWidth));
    const presentation = page.locator('[aria-labelledby="presentation-heading"]');
    await presentation.evaluate(node => node.scrollIntoView({block: 'start', behavior: 'instant'}));
    await page.screenshot({path: '.preview/action-builder-appearance-mobile.png'});
    await page.setViewportSize({width: 1440, height: 1000});
    await presentation.screenshot({path: '.preview/action-builder-appearance-desktop.png'});
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
    console.log('PASS action builder: generated code/URL encoding, schema validation, collisions, all placements, popup/function/navigation simulation, refresh plans, permissions/context, draft import/export, mobile and zero network requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
