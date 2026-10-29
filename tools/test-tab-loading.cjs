const assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  await page.setContent(require('../Theme/UnionSuite-Guides/usage/build/tab-loading-example.cjs')());
  const tab=page.getByRole('tab',{name:'Preferences'});
  const width=await tab.evaluate(el=>el.getBoundingClientRect().width);
  const labelOffset=()=>tab.evaluate(el=>{
   const range=document.createRange();range.selectNodeContents(el.querySelector('.rtsTxt'));
   const text=range.getBoundingClientRect(),button=el.getBoundingClientRect();
   return Math.abs((text.left+text.right-button.left-button.right)/2);
  });
  assert(await labelOffset()<1,'Horizontal label is centred before loading');
  await tab.click();assert.equal(await tab.locator('.us-tab-loading-spinner').count(),0);
  await tab.locator('.us-tab-loading-spinner').waitFor();
  assert.equal(await tab.getAttribute('aria-busy'),'true');
  assert.equal(await tab.locator('.rtsTxt').evaluate(el=>getComputedStyle(el).opacity),'0.7');
  assert.equal(await tab.evaluate(el=>el.getBoundingClientRect().width),width);
  assert(await labelOffset()<1,'Horizontal label stays centred while loading');
  await page.screenshot({path:'.tmp-iqa-integration/tab-loading.png'});
  await page.waitForFunction(()=>!document.querySelector('[aria-busy="true"]'));
  assert.equal(await tab.locator('.us-tab-loading-spinner').count(),0);
  await page.getByRole('tab',{name:'Instant'}).click();await page.waitForTimeout(180);
  assert.equal(await page.locator('.us-tab-loading-spinner').count(),0);
  await page.evaluate(()=>{
   const form=document.querySelector('form');window.submits=0;
   form.submit=function(){window.submits++;return 42;};window.originalSubmit=form.submit;
   const li=document.createElement('li');li.className='rtsLI';
   li.innerHTML='<a class="rtsLink" role="tab" href="#"><span class="rtsTxt">Submit example</span></a>';
   document.querySelector('.rtsUL').append(li);
   li.firstElementChild.addEventListener('click',event=>{event.preventDefault();window.submitResult=form.submit();});
  });
  await page.getByRole('tab',{name:'Submit example'}).click();
  await page.locator('.us-tab-loading-spinner').waitFor();
  assert.equal(await page.evaluate(()=>submits),1);assert.equal(await page.evaluate(()=>submitResult),42);
  assert(await page.evaluate(()=>document.querySelector('form').submit===originalSubmit));
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  assert.equal(await page.locator('.us-tab-loading-spinner').count(),0);
  // An accepted request that completes before the delay must never flash.
  await tab.evaluate(el=>{const handle=UnionSuiteTabBusy.show(el);handle.clear();});await page.waitForTimeout(180);
  assert.equal(await page.locator('.us-tab-loading-spinner').count(),0);
  await tab.evaluate(el=>{el.setAttribute('aria-busy','false');UnionSuiteTabBusy.show(el);});
  await tab.locator('.us-tab-loading-spinner').waitFor();
  await page.evaluate(()=>manager.end());assert.equal(await tab.getAttribute('aria-busy'),'false');
  await tab.evaluate(el=>{el.setAttribute('aria-disabled','true');UnionSuiteTabBusy.show(el);});await page.waitForTimeout(180);
  assert.equal(await page.locator('.us-tab-loading-spinner').count(),0);
  await tab.evaluate(el=>{el.removeAttribute('aria-disabled');UnionSuiteTabBusy.show(el);el.remove();});await page.waitForTimeout(180);
  assert.equal(await page.locator('.us-tab-loading-spinner').count(),0);
  console.log('Passed: request routing, delay, readable label, stable width, instant/fast requests, completion/error cleanup, prior aria-busy, disabled and removed tabs.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
