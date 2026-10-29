// US-INLINE-COMPOSER through the generated guide's offline example: the
const {guidePath}=require('../build/guide-output.cjs');
// composer, its checks, the holding row and quiet insert, and the full
// form's draft hand-off and close values. Save, page read and popup are the
// example's stand-ins (examples/Inline-Composer.js).
const path = require('node:path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const {chromium} = require(path.join(root, '.tmp-iqa-integration/node_modules/playwright'));

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage({viewport: {width: 1400, height: 1000}});
    await page.emulateMedia({reducedMotion: 'reduce'});
    const errors = [];
    page.on('console', message => {
      if (message.type() === 'error' && /US-INLINE-COMPOSER|UnionSuite/.test(message.text())) errors.push(message.text());
    });
    await page.goto(pathToFileURL(guidePath('Usage-Guide.html')).href + '#inline-composer');
    const demo = page.frameLocator('#inline-composer-demo');
    const toggle = demo.locator('.panel-heading .us-composer-toggle');
    const composer = demo.locator('.us-composer:not([data-closing])');
    const rows = demo.locator('.QueryTemplateSet > section');
    const message = composer.locator('.us-composer__message');
    const save = composer.locator('.us-composer__save');
    await toggle.waitFor();
    assert.equal(await rows.count(), 2);

    // Opens in its section, pressed, with the cursor in the main field.
    await toggle.click();
    await composer.waitFor();
    assert.equal(await toggle.getAttribute('aria-pressed'), 'true');
    assert.equal(await demo.locator(':focus').getAttribute('data-name'), 'Task');

    // Pressed again it puts the draft away; it comes back as typed.
    await composer.locator('[data-name="Task"]').fill('Kept draft');
    await toggle.click();
    await composer.waitFor({state: 'detached'});
    assert.equal(await toggle.getAttribute('aria-pressed'), 'false');
    await toggle.click();
    assert.equal(await composer.locator('[data-name="Task"]').inputValue(), 'Kept draft');

    // Required, then the question before saving, withdrawn by a change.
    await composer.locator('[data-name="Task"]').fill('');
    await save.click();
    assert.equal(await message.textContent(), 'Write the task first.');
    await composer.locator('[data-name="Task"]').fill('Book the mediation room');
    await composer.locator('[data-name="DueDate"]').fill('2020-01-05');
    await save.click();
    assert.equal(await message.textContent(), 'That date has passed. Save the task anyway?');
    assert.equal(await save.textContent(), 'Save anyway');
    await composer.locator('[data-name="DueDate"]').fill('2099-01-06');
    assert.equal(await save.textContent(), 'Save task');

    // A failed save keeps the composer as typed.
    await demo.locator('#demo-save-fails').check();
    await save.click();
    await message.filter({hasText: 'could not be added'}).waitFor();
    assert.equal(await composer.locator('[data-name="Task"]').inputValue(), 'Book the mediation room');
    await demo.locator('#demo-save-fails').uncheck();

    // Saved: the composer clears and stays open (keepOpen); the new row
    // arrives without a reload and the holding row is gone.
    await save.click();
    await rows.filter({hasText: 'Book the mediation room'}).waitFor();
    await demo.locator('.us-composer-holding').waitFor({state: 'detached'});
    assert.equal(await rows.count(), 3);
    assert.equal(await composer.locator('[data-name="Task"]').inputValue(), '');
    assert.equal(await demo.locator('.us-query-refresh-overlay').count(), 0);

    // More options: the draft goes with the popup and the composer stays.
    await demo.locator('#demo-popup-result').selectOption('cancel');
    await composer.locator('[data-name="Task"]').fill('Cancelled in the full form');
    await composer.locator('.us-composer__more').click();
    await demo.locator('#demo-status').filter({hasText: 'Task “Cancelled in the full form”'}).waitFor();
    await demo.locator('#demo-status').filter({hasText: 'It was cancelled'}).waitFor();
    assert.equal(await composer.locator('[data-name="Task"]').inputValue(), 'Cancelled in the full form');

    await demo.locator('#demo-popup-result').selectOption('');
    await composer.locator('.us-composer__more').click();
    await demo.locator('#demo-status').filter({hasText: 'nothing passed'}).waitFor();
    await page.waitForTimeout(1500);
    assert.equal(await composer.locator('[data-name="Task"]').inputValue(), 'Cancelled in the full form');

    await demo.locator('#demo-popup-result').selectOption('saved');
    await composer.locator('[data-name="Task"]').fill('Saved in the full form');
    await composer.locator('.us-composer__more').click();
    await rows.filter({hasText: 'Saved in the full form'}).waitFor();
    await composer.waitFor({state: 'detached'});
    assert.equal(await rows.count(), 4);

    assert.deepEqual(errors, []);
    console.log('PASS Inline composer: toggle and kept draft, required and confirm, failed save, holding row and quiet insert, full form draft and close values.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
