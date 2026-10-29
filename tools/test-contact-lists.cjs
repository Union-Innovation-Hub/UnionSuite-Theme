const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=file=>fs.readFileSync(file,'utf8'),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const template=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Contacts-Query-Template.html');
const source=read('Theme/UnionSuite/zUnionSuite.js').split('/* US-BANNER-BEHAVIOUR:START */')[0];
const records=require('../Theme/UnionSuite-Guides/usage/source/contact-records.cjs').delegates;
const row=record=>'<section><div class="QueryTemplateItem">'+template.replace(/\{#query\.(\w+)\}/g,(_,field)=>esc(record[field]))+'</div></section>';
const items=()=>records.map(row).join('')+'<section style="display:none" data-native-hidden><div class="QueryTemplateItem">'+template.replace(/\{#query\.(\w+)\}/g,(_,field)=>esc({...records[0],ContactName:'Native hidden',ContactId:'PAGED'}[field]))+'</div></section>';
const panel=(bodyExtra='')=>'<div class="panel"><div class="panel-heading"><h2 class="panel-title">Delegates</h2></div><div class="panel-description">Supporting contacts</div><div class="panel-body-container"><div class="panel-body" '+bodyExtra+'><div class="QueryTemplateSet">'+items()+'</div></div></div></div>';
const wrap=(id,classes='us-list-scroll us-query-search',extra='')=>'<div class="ContentItemContainer"><div id="'+id+'" class="'+classes+'">'+panel(extra)+'</div></div>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1361,height:900}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',route=>{requests.push(route.request().url());return route.abort();});
  const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
  await page.setContent('<!doctype html><html><body><main><div class="ContentItemContainer" id="direct">'+panel()+'</div>'+wrap('empty','')+wrap('wrapped')+wrap('optout','us-list-scroll us-query-search us-report-no-styling')+'<div class="ContentItemContainer"><div id="outer" class="us-list-scroll"><div class="panel"><div class="panel-body-container"><div class="panel-body">'+wrap('nested')+'</div></div></div></div></div>'+wrap('custom','us-list-scroll','tabindex="-1" role="group" aria-label="My custom label"')+'</main></body></html>');
  await page.addStyleTag({content:css+'html{height:auto}body{height:auto;margin:20px}main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.ContentItemContainer{min-width:0}'});
  await page.addScriptTag({content:source});
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-list-scroll-body]').length===3);
  for(const id of ['direct','empty','optout'])assert.equal(await page.locator('#'+id+' [data-us-list-scroll-body]').count(),0,id);
  assert.equal(await page.locator('#outer > .panel > .panel-body-container[data-us-list-scroll-frame]').count(),0,'outer CCO untouched');
  assert.equal(await page.locator('#optout [data-us-contact-empty]').count(),0,'no-styling contact untouched');
  const body=page.locator('#wrapped [data-us-list-scroll-body]'),frame=page.locator('#wrapped [data-us-list-scroll-frame]');
  assert.equal(await body.getAttribute('tabindex'),'0');assert.equal(await body.getAttribute('aria-label'),'Delegates');
  assert.equal(await body.evaluate(n=>n.clientHeight),414);assert.equal(await frame.getAttribute('data-us-list-more'),'');
  const geometry=await page.locator('#wrapped .us-contact').first().evaluate(n=>({row:n.getBoundingClientRect().width,body:n.closest('.panel-body').clientWidth}));assert(Math.abs(geometry.row-geometry.body)<2,JSON.stringify(geometry));
  assert.equal(await page.locator('#wrapped .us-contact').first().locator('.us-contact__details').isVisible(),false);
  assert.equal(await page.locator('#wrapped .us-contact').nth(2).locator('.us-contact__detail').nth(1).isVisible(),false);
  await body.evaluate(n=>n.scrollTop=n.scrollHeight);await page.waitForFunction(()=>!document.querySelector('#wrapped [data-us-list-scroll-frame]').hasAttribute('data-us-list-more'));
  await body.evaluate(n=>n.scrollTop=0);
  await page.locator('#wrapped .us-iqa-filter-toggle').click();const input=page.locator('#wrapped input[type=search]');
  await page.waitForFunction(()=>document.activeElement.matches('#wrapped input[type=search]'));
  await input.fill('101000');
  assert.equal(await page.locator('#wrapped .QueryTemplateSet > section:visible').count(),1);
  await page.waitForFunction(()=>!document.querySelector('#wrapped [data-us-list-scroll-frame]').hasAttribute('data-us-list-more'));
  assert.equal(await body.getAttribute('tabindex'),null);assert.equal(await page.locator('#nested .QueryTemplateSet > section:visible').count(),7);
  await input.fill('PAGED');assert.equal(await page.locator('#wrapped [data-native-hidden]').isVisible(),false);
  await input.fill('');
  // Contact updates trim optional fields, restore rows and validate arbitrary hex badge colours.
  const contact=page.locator('#wrapped .us-contact').first();
  await contact.locator('.us-contact__detail a').first().evaluate(n=>{n.textContent='  person@example.org ';n.setAttribute('href','mailto:person@example.org');});
  await page.waitForFunction(()=>!document.querySelector('#wrapped .us-contact__details').hasAttribute('data-us-contact-empty'));
  await contact.locator('.us-contact__role').evaluate(n=>n.textContent='   ');
  await page.waitForFunction(()=>document.querySelector('#wrapped .us-contact__role').hasAttribute('data-us-contact-empty'));
  await contact.locator('.us-contact__role').evaluate(n=>{n.textContent='Any role name';n.style.setProperty('padding-top','5px');});
  for(const [value,hex,foreground] of [['#DBEAFE','#dbeafe','rgb(0, 0, 0)'],['#5B3F86','#5b3f86','rgb(255, 255, 255)'],['  #aBc  ','#aabbcc','rgb(0, 0, 0)'],['#000','#000000','rgb(255, 255, 255)'],['#fff','#ffffff','rgb(0, 0, 0)'],['#777777','#777777','rgb(0, 0, 0)']]){
    await contact.evaluate((n,v)=>n.setAttribute('data-us-contact-colour',v),value);
    await page.waitForFunction(expected=>document.querySelector('#wrapped .us-contact__role').style.getPropertyValue('--us-contact-badge-bg')===expected,hex);
    assert.equal(await contact.locator('.us-contact__role').evaluate(n=>getComputedStyle(n).color),foreground);
    const bg=await contact.locator('.us-contact__role').evaluate(n=>getComputedStyle(n).backgroundColor);
    assert.equal(bg,'rgb('+[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)).join(', ')+')','hex is the exact background');
  }
  for(const invalid of ['', ' ', 'delegate','#12345','#12345678','rgb(1,2,3)','{#query.RoleColour}','#fff; color:red']){
    await contact.evaluate((n,v)=>n.setAttribute('data-us-contact-colour',v),invalid);
    await page.waitForFunction(()=>!document.querySelector('#wrapped .us-contact__role').style.getPropertyValue('--us-contact-badge-bg'));
    assert.equal(await contact.locator('.us-contact__role').evaluate(n=>n.style.getPropertyValue('--us-contact-badge-text')),'');
    assert.equal(await contact.locator('.us-contact__role').evaluate(n=>n.style.paddingTop),'5px','unrelated author styles survive');
  }
  await contact.evaluate(n=>n.setAttribute('data-us-contact-colour','#5b3f86'));
  await page.waitForFunction(()=>document.querySelector('#wrapped .us-contact__role').style.getPropertyValue('--us-contact-badge-bg')==='#5b3f86');
  await contact.evaluate(n=>n.removeAttribute('data-us-contact-colour'));
  await page.waitForFunction(()=>!document.querySelector('#wrapped .us-contact__role').style.getPropertyValue('--us-contact-badge-bg'));
  await contact.locator('.us-contact__name').evaluate(n=>n.setAttribute('href','javascript:alert(1)'));
  await page.waitForFunction(()=>!document.querySelector('#wrapped .us-contact__name').hasAttribute('href'));
  await contact.locator('.us-contact__name').evaluate(n=>n.setAttribute('href','/Party.aspx?ID=101000'));
  await page.waitForFunction(()=>document.querySelector('#wrapped .us-contact__name').getAttribute('href')==='/Party.aspx?ID=101000');
  // Query body replacement, repeated script inclusion and reusable notes scrolling.
  await input.fill('101000');await page.locator('#wrapped .panel-body').evaluate((n,html)=>n.outerHTML=html,panel().match(/<div class="panel-body" [\s\S]*<\/div><\/div><\/div>$/)[0].slice(0,-12));
  await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
  await page.waitForFunction(()=>document.querySelector('#wrapped input[type=search]')?.value==='101000'&&document.querySelector('#wrapped [data-us-list-scroll-body]'));
  await page.addScriptTag({content:source});
  await page.waitForFunction(()=>document.querySelectorAll('#wrapped [data-us-list-scroll-body]').length===1);
  await page.locator('#custom .QueryTemplateSet').evaluate(n=>n.innerHTML='<section><div class="QueryTemplateItem"><p>Notes without a contact template</p></div></section>');
  await page.waitForFunction(()=>!document.querySelector('#custom [data-us-list-scroll-frame]').hasAttribute('data-us-list-more'));
  await page.locator('#custom').evaluate(n=>n.classList.remove('us-list-scroll'));
  await page.waitForFunction(()=>!document.querySelector('#custom [data-us-list-scroll-body]'));
  assert.equal(await page.locator('#custom .panel-body').getAttribute('tabindex'),'-1');assert.equal(await page.locator('#custom .panel-body').getAttribute('role'),'group');assert.equal(await page.locator('#custom .panel-body').getAttribute('aria-label'),'My custom label');
  await page.locator('#wrapped').evaluate(n=>n.classList.add('us-report-no-styling'));await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
  await page.waitForFunction(()=>!document.querySelector('#wrapped [data-us-list-scroll-body]')&&!document.querySelector('#wrapped [data-us-contact-empty]'));
  assert.equal(await page.locator('#wrapped .us-contact__role').first().evaluate(n=>n.style.getPropertyValue('--us-contact-badge-bg')),'','opt-out releases generated colours');
  assert.equal(await page.locator('#wrapped .panel-body').getAttribute('tabindex'),null);assert.equal(await page.locator('#wrapped .panel-body').getAttribute('role'),null);
  assert.equal(await page.locator('#wrapped [data-native-hidden]').getAttribute('style'),'display:none');
  // Actual generated reference contains only production component styles and works offline.
  await page.setContent(read('references/Contact-Lists-Preview.html'));
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-list-scroll-body]').length===2);
  await page.screenshot({path:'.preview/contact-shared-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile has no horizontal overflow');
  await page.screenshot({path:'.preview/contact-shared-mobile.png'});
  await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});
  assert.equal(await page.locator('[data-us-list-scroll-frame]').first().evaluate(n=>getComputedStyle(n,'::after').display),'none');
  assert.deepEqual(errors,[]);assert.equal(requests.filter(url=>url.includes('/api/')).length,0);
  console.log('Passed: shared contact template, explicit ID search, native wrappers, optional fields/links, scrolling/fades, keyboard attributes, nested isolation, replacement, opt-out, mobile and forced colours.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
