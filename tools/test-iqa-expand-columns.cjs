const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const html=require('../Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs').documentHtml();
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:650}}),errors=[];
  await page.route('**/*',route=>route.abort());page.on('pageerror',error=>errors.push(error.message));
  await page.setContent(html);
  const table=page.locator('#expand-example-table'),header=table.locator('th.rgExpandCol');
  await page.locator('[data-us-iqa-column-table]').waitFor();
  assert.equal(await header.evaluate(node=>getComputedStyle(node).fontSize),'0px');
  assert.equal(await header.evaluate(node=>getComputedStyle(node).display),'table-cell');
  assert.equal(await header.getAttribute('aria-label'),'ExpandColumn');
  assert.equal(await header.locator('.us-iqa-column-resizer').count(),0);
  assert.equal(await table.locator('.us-iqa-column-resizer').count(),3);
  assert.equal(await header.getAttribute('style'),'width:36px','Native utility width is not overridden');
  assert.equal(await table.locator('col').first().getAttribute('style'),'width:36px');
  assert.equal(await table.locator('th').nth(4).getAttribute('style'),'display:none');
  const expand=page.locator('#visit-one-GECBtnExpandColumn');
  await expand.click();await page.locator('#visit-one-detail').waitFor({state:'visible'});assert.equal(await expand.getAttribute('aria-expanded'),'true');
  assert.equal(await header.locator('.us-iqa-column-resizer').count(),0);
  await expand.press('Enter');await page.locator('#visit-one-detail').waitFor({state:'hidden'});assert.equal(await expand.getAttribute('aria-expanded'),'false');
  const resize=table.locator('th').nth(1).locator('.us-iqa-column-resizer'),before=Number(await resize.getAttribute('aria-valuenow'));
  await resize.press('ArrowRight');assert.equal(Number(await resize.getAttribute('aria-valuenow')),before+10);
  await page.getByRole('link',{name:'Date',exact:true}).click();assert.match(await page.locator('#expand-example-status').textContent(),/Date sort activated/);
  await page.evaluate(()=>{const row=document.querySelector('#expand-example-table tbody tr');window.expandControl=row.querySelector('input');window.expandClicks=0;window.expandControl.addEventListener('click',()=>window.expandClicks++);UnionSuiteIqaColumns.refresh();});
  await expand.click();await page.locator('#visit-one-detail').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>window.expandClicks),1,'Original control/handler is preserved');
  await page.screenshot({path:'.tmp-iqa-integration/iqa-expand-columns.png'});
  // Partial replacement keeps blank utility headers and restores native indexes.
  await page.evaluate(()=>{const grid=document.querySelector('#expand-example-grid');const replacement=document.createElement('table');replacement.className='rgMasterTable';replacement.id='replacement-table';replacement.innerHTML='<colgroup><col style="width:30px"><col><col style="display:none"><col></colgroup><thead><tr><th class="rgHeader rgExpandCol" style="width:30px" aria-label="ExpandColumn">Expand Collapse</th><th class="rgHeader">Member ID</th><th class="rgHeader" style="display:none">Hidden</th><th class="rgHeader">Paid</th></tr></thead><tbody><tr class="rgRow"><td class="rgExpandCol"><input type="submit" class="rgExpand" title="Expand" value=" "></td><td>12345678901234567890</td><td style="display:none">secret</td><td>Yes</td></tr></tbody>';grid.replaceChildren(replacement);UnionSuiteIqaColumns.refresh();});
  const replacement=page.locator('#replacement-table');await replacement.locator('.us-iqa-column-resizer').first().waitFor();
  assert.equal(await replacement.locator('.us-iqa-column-resizer').count(),2);
  assert.equal(await replacement.locator('th.rgExpandCol .us-iqa-column-resizer').count(),0);
  assert.equal(await replacement.locator('tbody td').nth(1).getAttribute('data-us-iqa-id-cell'),'');
  assert.equal(await replacement.locator('tbody td').nth(3).getAttribute('data-us-iqa-id-cell'),null);
  const idHandle=replacement.locator('th').nth(1).locator('.us-iqa-column-resizer');await idHandle.press('Home');
  assert(Number(await idHandle.getAttribute('aria-valuenow'))>=Number(await idHandle.getAttribute('aria-valuemin')));
  await page.setViewportSize({width:390,height:844});
  assert.equal(await replacement.locator('th.rgExpandCol').evaluate(node=>getComputedStyle(node).fontSize),'0px');
  assert(await replacement.locator('input.rgExpand').isVisible());
  await page.evaluate(()=>{document.querySelector('.us-report').classList.add('us-report-no-styling');UnionSuiteIqaColumns.refresh();});
  await page.waitForFunction(()=>!document.querySelector('.us-iqa-column-resizer'));
  assert.equal(await replacement.locator('th.rgExpandCol').getAttribute('style'),'width:30px');
  assert.equal(await replacement.locator('th').nth(1).evaluate(node=>node.style.width),'','Normal widths restored on opt-out');
  assert.deepEqual(errors,[]);
  console.log('Passed: blank utility header, preserved native width/controls, no utility resizer, data resizing/sort, collapse/expand, partial replacement, hidden indexes, readable IDs, mobile and opt-out cleanup.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
