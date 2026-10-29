// Regression: rebuilding the clicked history row must not count as an outside click.
const assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const preview=require('../Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs');
const key='union-suite:preview:quick-search-history:100';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  for(const width of [1100,390]){
   const context=await browser.newContext({viewport:{width,height:800},hasTouch:width===390});
   await context.route('**/*',route=>route.request().url()==='https://taskbar.test/'?route.fulfill({contentType:'text/html',body:preview.frameDocument()}):route.abort());
   const page=await context.newPage();await page.goto('https://taskbar.test/');
   const nav=page.locator('#us-taskbar-search'),input=width===390?page.locator('.tb-dd-input'):nav,menu=page.locator('#tb-search-dropdown');
   const seed=async()=>{
    await page.evaluate(({key})=>{localStorage.setItem(key,JSON.stringify(['Morgan','example.com','Alex']));UnionSuiteTaskbar.destroy();UnionSuiteTaskbar.initialise();window.historyMenuRequests=[];const original=window.fetch;window.fetch=(...args)=>{historyMenuRequests.push(args[0]);return original(...args);};},{key});
    await nav.focus();await page.getByRole('button',{name:'Remove search: Morgan',exact:true}).waitFor();
   };
   const openAndFocused=async()=>{
    assert(await menu.isVisible(),'history stays open after its clicked row is replaced');
    assert.equal(await nav.getAttribute('aria-expanded'),'true');
    assert(await input.evaluate(n=>n===document.activeElement),'focus returns to the visible search input');
   };
   const history=()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);
   await seed();
   const remove=page.getByRole('button',{name:'Remove search: Morgan',exact:true});
   if(width===390)await remove.tap();else await remove.click();
   await openAndFocused();assert.deepEqual(await history(),['example.com','Alex']);
   await page.getByRole('button',{name:'Remove search: Alex',exact:true}).press('Enter');
   await openAndFocused();assert.deepEqual(await history(),['example.com']);
   await page.getByRole('button',{name:'Remove search: example.com',exact:true}).press('Space');
   await openAndFocused();assert.deepEqual(await history(),[]);
   assert(await page.getByText('Completed searches appear here.',{exact:true}).isVisible());
   assert(await page.getByText('Recently viewed records',{exact:true}).isVisible());
   assert.deepEqual(await page.evaluate(()=>historyMenuRequests),[],'removals do not execute searches');
   await page.screenshot({path:'.preview/taskbar-history-empty-'+width+'.png'});
   await seed();
   // Rerun also replaces the clicked history link when restoring input focus.
   await page.getByRole('link',{name:'Morgan',exact:true}).click();
   await page.locator('.tb-dd-name').filter({hasText:'Morgan Engineering'}).waitFor();
   await openAndFocused();assert.equal(await input.inputValue(),'Morgan');
   await input.fill('');await page.getByRole('button',{name:'Clear history',exact:true}).press('Enter');
   await openAndFocused();assert.deepEqual(await history(),[]);
   await input.press('Escape');assert.equal(await menu.isVisible(),false,'Escape still dismisses');
   await nav.blur();await nav.click();
   if(width<=768){await page.getByRole('button',{name:'Close search results',exact:true}).click();assert.equal(await menu.isVisible(),false,'explicit mobile close still closes the dropdown');}
   else{await page.locator('#demo-taskbar-status').click();assert.equal(await menu.isVisible(),false,'outside clicks still dismiss');}
   await context.close();
  }
  console.log('PASS: desktop click, mobile tap, keyboard removal, last-item empty state, Clear history, rerun, persistence, input focus and normal dismissal.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
