const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();
 const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
 const script=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-BANNER-BEHAVIOUR:START */')[0];
 const native=fs.readFileSync('.preview/native.html','utf8');
 // Extract the captured pre-Find query's own panel, without executing native scripts.
 await page.setContent(native.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 const panel=await page.locator('[id$="PeopleSearch_ContentPanel"]').evaluate(n=>n.closest('.panel').outerHTML);
 await page.setContent('<div class="ContentItemContainer" id="direct">'+panel+'</div>');
 await page.addStyleTag({content:css});await page.addScriptTag({content:script});
 await page.waitForFunction(()=>document.querySelector('#direct').hasAttribute('data-us-iqa-native'));
 assert.equal(await page.locator('#direct .RadGrid').count(),0);
 assert.equal(await page.locator('#direct [data-us-iqa-filter-toggle]').count(),1);
 assert.equal(await page.locator('#direct > .panel').evaluate(n=>getComputedStyle(n).borderTopLeftRadius),'12px');
 await page.locator('#direct [data-us-iqa-filter-toggle]').click();
 await page.locator('#direct [data-us-iqa-filter-toggle]').click();
 await page.evaluate(()=>{const g=document.querySelector('#direct [data-gridid]');g.insertAdjacentHTML('beforeend','<div class="RadGrid"><table class="rgMasterTable"><tbody><tr><td>Result</td></tr></tbody></table></div>');UnionSuiteIqaFilters.refresh();});
 await page.waitForTimeout(150);assert.equal(await page.locator('#direct [data-us-iqa-filter-toggle]').count(),1);
 console.log('PASS captured pre-Find shell, filter control and transition to results without duplicate controls.');
 for(const cls of ['','example-author-class','us-report-no-styling']){
  await page.setContent('<div class="ContentItemContainer"><div id="owner" class="'+cls+'">'+panel+'</div></div>');
  await page.addStyleTag({content:css});
  // setContent retains the Window; remove the old API guard for this fresh fixture.
  await page.evaluate(()=>{delete window.UnionSuiteIqaFilters;});await page.addScriptTag({content:script});
  await page.waitForTimeout(150);
  assert.equal(await page.locator('#owner[data-us-iqa-native]').count(),cls==='us-report-no-styling'?0:1,cls||'empty class wrapper');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
