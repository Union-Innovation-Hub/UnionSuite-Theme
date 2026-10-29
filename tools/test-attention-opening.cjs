const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const runtime=source.match(/\/\* US-ATTENTION:START[\s\S]*?US-ATTENTION:END \*\//)[0];
const css=fs.readFileSync('Theme/UnionSuite/zUnionSuite.css','utf8');
const card=(tag,id,attrs='')=>`<li><${tag} id="${id}" class="us-attention__card" ${attrs}><span class="us-attention__number">3</span><span class="us-attention__copy"><strong>Applications</strong><span>Awaiting review</span></span>${tag==='a'?'<svg class="us-attention__chevron" viewBox="0 0 24 24"><path d="m9 5 7 7-7 7"/></svg>':''}</${tag}></li>`;
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><style>${css}\nbody{margin:20px;background:var(--bg-page)}</style><body><section class="us-attention"><header class="us-attention__heading"><h2>Needs Attention</h2></header><ul class="us-attention__items">${card('a','linked','href="/report" aria-label="Applications queue"')}${card('a','second','href="/second"')}${card('div','static')}</ul></section><script>${runtime}</script></body></html>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:700}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));let releaseNavigation,reportRequested;
  const navigationRequested=new Promise(resolve=>reportRequested=resolve);
  await page.route('**/*',async route=>{
   if(route.request().url()==='https://attention.test/home')return route.fulfill({contentType:'text/html',body:html});
   if(route.request().url()==='https://attention.test/report'){await new Promise(resolve=>{releaseNavigation=resolve;reportRequested();});return route.fulfill({contentType:'text/html',body:'<h1>Report loaded</h1>'});}
   return route.abort();
  });
  await page.goto('https://attention.test/home');
  const link=page.locator('#linked');
  await page.evaluate(()=>{
   window.cancelNavigation=true;window.clicks=[];
   document.addEventListener('click',event=>{const link=event.target.closest('a');if(!link)return;clicks.push({busy:link.getAttribute('aria-busy'),href:link.getAttribute('href')});if(cancelNavigation)event.preventDefault();});
   window.beginAction=()=>{window.actionPromise=UnionSuiteAttention.run(document.getElementById('linked'),()=>new Promise((resolve,reject)=>{window.finishAction=resolve;window.failAction=reject;}));actionPromise.catch(()=>{});};
  });
  const cleared=()=>page.waitForFunction(()=>!document.querySelector('[data-us-attention-opening]'));
  const before=await link.boundingBox();await link.hover();await page.mouse.down();
  await page.waitForFunction(()=>getComputedStyle(document.getElementById('linked')).boxShadow.includes('inset'));
  await page.mouse.up();await cleared();
  assert.equal(await page.evaluate(()=>clicks.at(-1).busy),'true','normal navigation shows feedback before a later handler cancels it');
  assert.equal(await link.getAttribute('aria-label'),'Applications queue','cancel restores accessible label');
  await link.press('Enter');await cleared();assert.equal(await page.evaluate(()=>clicks.at(-1).busy),'true','keyboard activation receives the same feedback');
  await page.evaluate(()=>beginAction());await page.waitForFunction(()=>typeof finishAction==='function');
  assert.equal(await link.locator('.us-button-spinner').count(),1);assert.equal(await link.getAttribute('aria-busy'),'true');
  assert.equal(await link.locator('.us-attention__chevron').isVisible(),false);
  assert(await link.locator('.us-attention__number').isVisible());assert(await link.locator('.us-attention__copy').isVisible());
  assert.deepEqual(await link.boundingBox(),before,'spinner does not move or resize the card');
  assert.equal(await page.locator('#static [class*=spinner]').count(),0);
  const clicks=await page.evaluate(()=>window.clicks.length);await link.click();assert.equal(await page.evaluate(()=>window.clicks.length),clicks,'duplicate activation suppressed');
  assert(await page.evaluate(()=>UnionSuiteAttention.run(document.getElementById('linked'),()=>{})===actionPromise),'manual pending action reused');
  await page.screenshot({path:'.preview/attention-opening-desktop.png'});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await link.locator('.us-button-spinner').evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.screenshot({path:'.preview/attention-opening-mobile.png'});
  await page.evaluate(()=>finishAction());await cleared();assert.equal(await link.getAttribute('aria-label'),'Applications queue');
  await page.evaluate(()=>beginAction());await page.waitForFunction(()=>typeof failAction==='function');await page.evaluate(()=>failAction(Error('Expected test failure')));await cleared();
  // Modified clicks and non-navigation anchors are passed through unchanged.
  for(const change of [{ctrlKey:true},{metaKey:true},{shiftKey:true},{altKey:true},{button:1}]){
   const observed=await link.evaluate((n,change)=>{n.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,button:0,...change}));return n.hasAttribute('data-us-attention-opening');},change);assert.equal(observed,false);
  }
  for(const attrs of [{target:'_blank'},{download:''},{href:'#details'},{'aria-disabled':'true'}]){
   await link.evaluate((n,attrs)=>{for(const [key,value]of Object.entries(attrs))n.setAttribute(key,value);},attrs);
   await link.dispatchEvent('click');assert.equal(await link.getAttribute('data-us-attention-opening'),null);
   await link.evaluate((n,attrs)=>{for(const key of Object.keys(attrs))n.removeAttribute(key);n.setAttribute('href','/report');},attrs);
  }
  await page.evaluate(()=>beginAction());await link.evaluate(n=>n.closest('.us-attention').classList.add('us-report-no-styling'));await cleared();
  await link.evaluate(n=>n.closest('.us-attention').classList.remove('us-report-no-styling'));await page.evaluate(()=>finishAction());
  for(const event of ['pagehide','pageshow']){await page.evaluate(()=>beginAction());await page.evaluate(event=>window.dispatchEvent(new Event(event)),event);await cleared();await page.evaluate(()=>finishAction());}
  await page.evaluate(()=>beginAction());await link.evaluate(n=>{window.removedCard=n;n.remove();});await page.waitForFunction(()=>!removedCard.hasAttribute('aria-busy'));await page.evaluate(()=>{document.querySelector('.us-attention__items > li').append(removedCard);finishAction();});
  // A real same-tab navigation is held locally so its loading state can be read.
  const navigating=await page.evaluate(()=>{cancelNavigation=false;const link=document.getElementById('linked');link.click();return link.hasAttribute('data-us-attention-opening');});
  assert(navigating,'feedback starts before native navigation');
  await navigationRequested;
  releaseNavigation();await page.waitForURL('https://attention.test/report');assert(await page.getByRole('heading',{name:'Report loaded'}).isVisible());
  assert.deepEqual(errors,[]);
  console.log('PASS: pressed feedback, stable spinner/text geometry, success/error cleanup, duplicate guard, mouse/keyboard-compatible activation, reduced motion, mobile, navigation exclusions, lifecycle/removal and real mocked navigation.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
