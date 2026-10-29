// Browser checks for the generated offline guide and actual shared renderers.
const {guidePath}=require('../Theme/UnionSuite-Guides/usage/build/guide-output.cjs');
// Supersedes the retired report-icon, popup and conflict API fixture tests.
const path=require('node:path'),{pathToFileURL}=require('node:url'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route(/^https?:/,r=>r.abort());
  await page.goto(pathToFileURL(guidePath('Usage-Guide.html')).href+'#unified-action-route');
  const demo=page.frameLocator('#unified-action-demo');
  const edit=demo.locator('#B_ResultsGrid .us-action-example-edit').first();await edit.click();
  assert.match(await demo.locator('#example-context').innerText(),/Member 202, job 22/);
  await demo.locator('#example-close').click();await demo.locator('#refresh-B').filter({hasText:'Refreshed 1'}).waitFor();
  assert.equal(await demo.locator('#refresh-A').innerText(),'Not refreshed yet');
  assert.equal(await demo.locator('#B_ResultsGrid .us-action-example-edit').nth(1).getAttribute('aria-disabled'),'true');
  await demo.locator('.example-tools > button').click();await demo.locator('#example-close').click();await demo.locator('#refresh-A').filter({hasText:'Refreshed 1'}).waitFor();
  const toggle=demo.locator('.us-actions__toggle');await toggle.focus();await toggle.press('Enter');
  assert.equal(await toggle.getAttribute('aria-expanded'),'true');
  await demo.locator('.us-actions__item').press('Escape');assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await toggle.click();await demo.locator('.us-actions__item').click();assert.equal(await toggle.getAttribute('aria-expanded'),'false');
  await demo.locator('#example-close').click();await demo.locator('#refresh-A').filter({hasText:'Refreshed 2'}).waitFor();
  page.once('dialog',dialog=>dialog.accept());await demo.locator('#B_ResultsGrid .us-action-example-delete').first().click();
  await demo.locator('#refresh-B').filter({hasText:'Refreshed 2'}).waitFor();assert.equal(await demo.locator('#B_ResultsGrid tbody tr').count(),1);
  assert.equal(await demo.locator('#A_ResultsGrid tbody tr').count(),2);
  const ids=await demo.locator('[data-us-command-key][id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);
  for(const id of ['unified-action-template','jobs-row-actions','action-refresh-plan','action-refresh-callback'])assert.equal(await page.locator('button[data-copy="'+id+'"]').count(),1,id);
  const conflicts=page.frameLocator('#action-conflict-demo');await conflicts.locator('#demo-repeat').click();
  assert.match(await conflicts.locator('#demo-result').innerText(),/Repeated include ignored/);
  await conflicts.locator('#demo-conflict').click();const action=conflicts.locator('button.us-action-demo-add-example');
  assert.equal(await action.locator('.us-action-conflict-icon').count(),1);await action.focus();await action.press('Enter');
  assert.equal(await action.getAttribute('aria-disabled'),'true');
  await conflicts.locator('#demo-resolve').click();await action.click();assert.match(await conflicts.locator('#demo-result').innerText(),/home task action ran/);
  const icons=page.frameLocator('#report-icon-demo');
  await icons.locator('button.us-action-demo-add-task').click();assert.match(await icons.locator('#icon-demo-status').innerText(),/Add task selected/);
  const popup=page.frameLocator('#popup-action-demo');await popup.locator('button.us-action-demo-add-interaction').click();await popup.locator('#popup-sample-close').click();
  assert.match(await popup.locator('#popup-sample-status').innerText(),/1 time/);
  // The complete guide must work offline; capture all frame errors before moving on.
  assert.deepEqual(errors,[]);
  await page.goto(pathToFileURL(path.resolve('references/Unified-Action-Comparison.html')).href);
  await page.locator('#B_ResultsGrid button.us-action-example-edit').first().waitFor();
  await page.screenshot({path:'.preview/unified-action-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile comparison overflow');
  const mobileDelete=await page.locator('#A_ResultsGrid .us-action-example-delete').first().boundingBox();assert(mobileDelete.x+mobileDelete.width<=390,'row actions remain visible on mobile');
  await page.screenshot({path:'.preview/unified-action-mobile.png',fullPage:true});
  await page.locator('#demo-owner-A > .panel > .panel-heading button').click();assert.match(await page.locator('#example-log').innerText(),/demo-owner-A/);
  assert.deepEqual(errors,[]);
  console.log('PASS offline guide: all four placements, correct report refresh, delete isolation, missing context, keyboard/menu, conflict recovery, glyphs, popup demo, copy targets and desktop/mobile layout.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
