const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const documentHtml=require('../Theme/UnionSuite-Guides/usage/build/section-tabs-example.cjs').documentHtml;
const measure=list=>{
 const button=list.querySelector('[aria-selected="true"]'),r=list.getBoundingClientRect(),b=button.getBoundingClientRect(),style=getComputedStyle(list,'::after'),matrix=new DOMMatrixReadOnly(style.transform);
 return {x:r.left+list.clientLeft+matrix.m41+10-list.scrollLeft,target:b.left+b.width/2,y:r.top+list.clientTop+matrix.m42-list.scrollTop,targetY:b.bottom-5,content:style.content,duration:style.transitionDuration,fallback:getComputedStyle(button,'::after').content,scrollWidth:list.scrollWidth,width:list.clientWidth};
};
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1000,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
  await page.setContent(documentHtml());
  const list=page.locator('.us-section-tabs'),tab=key=>list.locator('[data-us-tab="'+key+'"]');
  const aligned=async()=>{await page.waitForFunction(()=>{const list=document.querySelector('.us-section-tabs'),button=list.querySelector('[aria-selected="true"]');if(!list.hasAttribute('data-us-section-indicator')||!button||list.getAnimations({subtree:true}).some(a=>a.playState==='running'))return false;const r=list.getBoundingClientRect(),b=button.getBoundingClientRect(),m=new DOMMatrixReadOnly(getComputedStyle(list,'::after').transform);return Math.abs(r.left+list.clientLeft+m.m41+10-list.scrollLeft-b.left-b.width/2)<1;});const m=await list.evaluate(measure);assert(Math.abs(m.x-m.target)<1,JSON.stringify(m));assert(Math.abs(m.y-m.targetY)<1,JSON.stringify(m));assert.equal(m.fallback,'none');return m;};
  await aligned();
  const initial=await list.evaluate(measure);
  assert.equal(await page.locator('.us-banner__tabs[data-us-section-indicator]').count(),0,'banner navigation is separate');
  await tab('addresses').click();
  await page.waitForFunction(()=>document.querySelector('.us-section-tabs').getAnimations({subtree:true}).some(a=>a.playState==='running'));
  await list.evaluate(n=>{const a=n.getAnimations({subtree:true}).find(a=>a.playState==='running');a.pause();a.currentTime=110;});
  const middle=await list.evaluate(measure);
  assert(middle.x>initial.x+1&&middle.x<middle.target-1,'underline visibly travels between tabs');
  assert.equal(middle.duration,'0.22s');
  await page.screenshot({path:'.preview/section-indicator-moving.png'});
  await list.evaluate(n=>n.getAnimations({subtree:true}).forEach(a=>a.finish()));await aligned();
  // Rapid retargeting finishes under the last activated choice.
  await tab('details').click();await tab('addresses').click();await aligned();
  await tab('addresses').press('ArrowLeft');assert.equal(await tab('addresses').getAttribute('aria-selected'),'true','arrows only move focus');
  await page.keyboard.press('Enter');await aligned();assert.equal(await tab('details').getAttribute('aria-selected'),'true');
  await page.locator('input').fill('Retained value');
  // Resize/reflow follows longer labels, with no selection animation.
  await tab('details').evaluate(n=>{n.textContent='Personal and membership details';});
  await page.waitForFunction(()=>document.querySelector('.us-section-tabs').dataset.usSectionIndicator==='still');await aligned();
  await page.setViewportSize({width:390,height:844});await aligned();
  const beforeScroll=await list.evaluate(n=>n.scrollWidth);
  await list.evaluate(n=>n.scrollLeft=n.scrollWidth);await aligned();assert.equal(await list.evaluate(n=>n.scrollWidth),beforeScroll,'marker does not widen the scroll region');
  await list.evaluate(n=>n.dir='rtl');await page.evaluate(()=>UnionSuiteSections.refresh());await aligned();
  await list.evaluate(n=>n.scrollLeft=-n.scrollWidth);await aligned();
  await tab('addresses').click();await aligned();
  await page.screenshot({path:'.preview/section-indicator-mobile-rtl.png'});
  // Reveal a selected nested menu after it was hidden by its parent switcher.
  await page.locator('[data-us-tabs="member"] [data-us-tab="finance"]').click();
  await page.locator('[data-us-tabs="member"] [data-us-tab="overview"]').click();await aligned();
  await page.emulateMedia({reducedMotion:'reduce'});await tab('details').click();
  const reduced=await aligned();assert.equal(reduced.duration,'0s');assert.equal(await page.locator('input').inputValue(),'Retained value');
  await page.emulateMedia({forcedColors:'active'});await aligned();assert.equal(await list.evaluate(n=>getComputedStyle(n,'::after').forcedColorAdjust),'none');
  await page.emulateMedia({forcedColors:'none'});
  // DOM replacement and refresh reuse the selected key without cloning content.
  await list.evaluate(n=>{const fresh=n.cloneNode(true);fresh.removeAttribute('data-us-section-indicator');fresh.style.removeProperty('--us-section-indicator-x');fresh.style.removeProperty('--us-section-indicator-y');n.replaceWith(fresh);});await aligned();
  await list.evaluate(n=>{n.style.setProperty('color','rgb(1, 2, 3)');n.classList.add('us-report-no-styling');});
  await page.evaluate(()=>UnionSuiteSections.refresh());
  await page.waitForFunction(()=>!document.querySelector('.us-section-tabs').hasAttribute('data-us-section-indicator'));
  assert.equal(await list.evaluate(n=>n.style.getPropertyValue('--us-section-indicator-x')),'','owned coordinates released');
  assert.equal(await list.evaluate(n=>n.style.color),'rgb(1, 2, 3)','unrelated inline styles retained');
  await list.evaluate(n=>n.classList.remove('us-report-no-styling'));await page.evaluate(()=>UnionSuiteSections.refresh());await aligned();
  await page.evaluate(()=>document.body.classList.add('EasyEdit'));
  await page.waitForFunction(()=>!document.querySelector('.us-section-tabs').hasAttribute('data-us-section-indicator'));
  assert.equal(await page.locator('.us-tabset-contact:visible').count(),2);
  await page.evaluate(()=>document.body.classList.remove('EasyEdit'));await aligned();
  await list.evaluate(n=>n.remove());await page.waitForFunction(()=>document.querySelectorAll('.us-tabset-contact:not([hidden])').length===2);
  assert.deepEqual(errors,[]);
  console.log('PASS: visible sliding transition, rapid retargeting, keyboard activation, label/viewport reflow, horizontal/RTL scrolling, nested reveal, reduced motion, forced colours, replacement, opt-out, Easy Edit and cleanup.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
