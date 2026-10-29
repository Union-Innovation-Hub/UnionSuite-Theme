// Native Tasks capture shape: class wrapper, plain QueryTemplateItems and direct Footer HTML.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=f=>fs.readFileSync(f,'utf8');
const source=read('Theme/UnionSuite/zUnionSuite.js');
const script=source.split('/* US-BANNER-BEHAVIOUR:START */')[0]+'\n'+source.match(/\/\* US-TASK-ROWS:START[\s\S]*?US-TASK-ROWS:END \*\//)[0];
const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite-Client/Branding.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'');
const template=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Completion-Query-Template.html');
const footer=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html');
const records=[
 {TaskTitle:'Follow up application details',MemberName:'Hub TestLastName',IsCompleted:'False',TaskDateLabel:'17/09/2026'},
 {TaskTitle:'Confirm workplace details',MemberName:'Jordan Lee',IsCompleted:'0',TaskDateLabel:'18/09/2026'},
 {TaskTitle:'Send membership statement',MemberName:'Alex Morgan',IsCompleted:'True',TaskDateLabel:'Actioned 10 Sept 2026'},
 {TaskTitle:'Native paged task',MemberName:'Native hidden',IsCompleted:'false',TaskDateLabel:''}
];
const rows=records.map((row,i)=>'<section data-row="'+i+'"'+(i===3?' style="display:none"':'')+'><div class="QueryTemplateItem">'+template.replace(/\{#query\.(\w+)\}/g,(_,key)=>row[key])+'</div></section>').join('');
const panel=wrapped=>'<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">My Tasks</h2></div><div class="panel-description"><div>Your outstanding tasks and those completed in the last 30 days.</div></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">'+rows+'</div>'+(wrapped?'<span class="template-footer">'+footer+'</span>':footer)+'</div></div></div>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{requests.push(r.request().url());return r.abort();});
  await page.setContent('<!doctype html><html lang="en-AU"><body><div class="ContentItemContainer"><div id="tasks" class="us-list--rows us-list--compact us-query-search us-task-completed-filter us-action-home-add-task">'+panel(false)+'</div></div></body></html>');
  await page.addStyleTag({content:css+'html{height:auto}body{width:auto;height:auto;margin:32px;background:var(--bg-page)}'});
  await page.addScriptTag({content:script});
  const root=page.locator('#tasks'),check=i=>root.locator('[data-row="'+i+'"] [data-us-task-toggle]');
  const waitCount=text=>page.waitForFunction(value=>document.querySelector('[data-us-task-summary]')?.textContent===value,text);
  await waitCount('2 outstanding');
  assert.equal(await check(2).getAttribute('aria-checked'),'true');
  assert.equal(await root.locator('[data-row="2"]').isVisible(),false);
  const geometry=await page.evaluate(()=>{
   const rect=s=>document.querySelector(s).getBoundingClientRect();
   const body=rect('.panel-body'),row=rect('.us-task'),foot=rect('.us-query-footer'),link=rect('.us-query-footer__link');
   return {bodyLeft:body.left,rowLeft:row.left,footLeft:foot.left,footRight:foot.right,bodyRight:body.right,linkRight:link.right,footBorder:getComputedStyle(document.querySelector('.us-query-footer')).borderTopWidth,checkWidth:rect('.us-task__check').width};
  });
  assert(Math.abs(geometry.rowLeft-geometry.bodyLeft)<1,JSON.stringify(geometry));
  assert(Math.abs(geometry.footLeft-geometry.bodyLeft)<1&&Math.abs(geometry.footRight-geometry.bodyRight)<1,JSON.stringify(geometry));
  assert(geometry.footRight-geometry.linkRight<25,JSON.stringify(geometry));assert.equal(geometry.footBorder,'1px');assert.equal(geometry.checkWidth,36);
  assert.equal(await root.locator('.panel-body > .us-query-search-status').count(),0,'status is inside footer');
  await page.screenshot({path:'.preview/task-native-footer-desktop.png'});
  await check(0).press('Space');
  assert.equal(await check(0).getAttribute('aria-checked'),'true');
  assert.equal(await root.locator('[data-row="0"]').evaluate(n=>n.inert),true,'filter off retains slide/collapse');
  await waitCount('1 outstanding');
  await page.waitForFunction(()=>!document.querySelector('[data-us-task-exiting]'));
  await page.waitForFunction(()=>document.querySelector('[data-row="0"]').hasAttribute('data-us-query-search-hidden'));
  await root.locator('.us-iqa-filter-toggle').click();
  await root.locator('.us-task-completed-toggle').click();
  assert.ok(await root.locator('[data-row="0"]').evaluate(n=>n.getAnimations().length)>0,'completed rows animate into view');
  await page.waitForTimeout(350);
  assert.equal(await root.locator('.QueryTemplateSet > section:visible').count(),3);
  // Completed rows leave the way they arrive: the row stays in the list and
  // collapses, and filtering waits for it rather than blinking the row out.
  await root.locator('.us-task-completed-toggle').click();
  assert.ok(await root.locator('[data-row="0"]').evaluate(n=>n.getAnimations().length)>0,'completed rows animate out of view');
  assert.equal(await root.locator('[data-row="0"]').evaluate(n=>n.hasAttribute('data-us-query-search-hidden')),false,'filtering waits for the collapse');
  await page.waitForFunction(()=>document.querySelector('[data-row="0"]').hasAttribute('data-us-query-search-hidden'));
  await root.locator('.us-task-completed-toggle').click();
  await page.waitForTimeout(350);
  assert.equal(await root.locator('.QueryTemplateSet > section:visible').count(),3);
  assert.match(await root.locator('[data-row="0"] .us-task__date').textContent(),/^Actioned /);
  await check(0).click();await waitCount('2 outstanding');
  assert.equal(await root.locator('[data-row="0"] .us-task__date').textContent(),'17/09/2026');
  assert.equal(await root.locator('[data-row="3"]').isVisible(),false,'native paging hidden state is preserved');
  await check(1).click();
  assert.equal(await root.locator('[data-us-task-exiting]').count(),0,'Show completed on suppresses exit');
  await root.locator('input[type=search]').fill('Hub');
  await page.waitForFunction(()=>!document.querySelector('[data-us-task-exiting]'));
  await waitCount('1 outstanding');
  assert.equal(await root.locator('.QueryTemplateSet > section:visible').count(),1);
  await page.emulateMedia({reducedMotion:'reduce'});
  await root.evaluate((n,html)=>n.innerHTML=html,panel(true));
  await page.evaluate(()=>UnionSuiteIqaFilters.refresh()); // Same reconciliation used by the native partial-postback hook.
  await root.locator('input[type=search]').waitFor({state:'attached'});
  if (!(await root.locator('input[type=search]').isVisible())) await root.locator('.us-iqa-filter-toggle').click();
  await root.locator('input[type=search]').fill('');await waitCount('2 outstanding');
  assert.equal(await root.locator('.template-footer .us-query-search-status').count(),1);
  await check(0).press('Enter');await waitCount('1 outstanding');assert.equal(await root.locator('[data-us-task-exiting]').count(),0);
  await root.evaluate(n=>n.classList.remove('us-list--rows','us-list--compact'));
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'three classes fit mobile');
  await page.screenshot({path:'.preview/task-native-footer-mobile.png',fullPage:true});
  await root.evaluate(n=>n.classList.add('us-report-no-styling'));
  await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
  await check(1).click();assert.equal(await check(1).getAttribute('aria-checked'),'false');
  assert.deepEqual(errors,[]);assert.equal(requests.filter(url=>url.includes('/api/')).length,0,'local-only interaction never writes data');
  console.log('Task rows passed: native footer shell/alignment, checkbox state, local animation, filtering, paging, replacement, reduced motion and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
