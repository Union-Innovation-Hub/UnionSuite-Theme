// Behavioural coverage for independent task/query filters in native iPart wrappers.
const fs = require('node:fs'), assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(f=>fs.readFileSync(f,'utf8')).join('\n').replace(/@import\s+[^;]+;/g,'');
const script = fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-BANNER-BEHAVIOUR:START */')[0];
const rows = (cards=true) => [
  ['open','Alex outstanding','false'],['done','Alex actioned',' TRUE '],
  ['numeric','Jordan actioned','1'],['unknown','Completed wording but no flag','unknown']
].map(([id,title,flag])=>`<section data-record="${id}"><div class="QueryTemplateItem${cards?' card':''}">${cards?'<div class="card-body">':''}<div data-us-task-completed="${flag}"><div class="us-list__header"><div class="us-list__heading"><h3 class="us-list__title">${title}</h3></div></div><button type="button" data-open>Open</button></div>${cards?'</div>':''}</div></section>`).join('')+
  '<section data-native-hidden style="display:none"><div class="QueryTemplateItem"><div data-us-task-completed="true">Native paged Alex</div></div></section>';
const panel = (cards=true) => `<div class="panel"><div class="panel-heading"><h2 class="panel-title">Tasks</h2></div><p class="panel-description">Description stays here</p><div class="panel-body-container"><div class="panel-body"><span class="template-header">Header</span><div class="QueryTemplateSet">${rows(cards)}</div><span class="template-footer">Footer</span></div></div></div>`;
const wrap = (id,classes='',cards=true) => `<div class="ContentItemContainer"><div id="${id}" class="${classes}">${panel(cards)}</div></div>`;
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1100,height:900}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/*',r=>r.abort());
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.setContent(`<form>${wrap('both','us-query-search us-task-completed-filter')}${wrap('notes','us-query-search')}${wrap('only','us-task-completed-filter',false)}${wrap('empty')}${wrap('optout','us-task-completed-filter us-report-no-styling')}<div class="ContentItemContainer" id="direct">${panel()}</div><div class="ContentItemContainer"><div id="outer" class="us-task-completed-filter"><div class="panel"><div class="panel-heading"><h2 class="panel-title">Container</h2></div><div class="panel-body-container"><div class="panel-body">${wrap('nested','us-task-completed-filter')}</div></div></div></div></div></form>`);
    await page.addStyleTag({content:css});
    await page.evaluate(()=>{
      window.formSubmits=0;window.opens=0;window.ajaxEnds=[];window.appLoads=[];
      document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();formSubmits++;});
      document.addEventListener('click',e=>{if(e.target.matches('[data-open]'))opens++;});
      const manager={add_endRequest:fn=>ajaxEnds.push(fn),add_pageLoading:()=>{}};
      window.Sys={Application:{add_load:fn=>appLoads.push(fn)},WebForms:{PageRequestManager:{getInstance:()=>manager}}};
    });
    await page.addScriptTag({content:script});
    const visible=id=>page.locator(`#${id} .QueryTemplateSet > [data-record]:visible`).count();
    const funnel=id=>page.locator(`#${id} .us-iqa-filter-toggle`);
    const completed=id=>page.locator(`#${id} .us-task-completed-toggle`);
    const search=page.locator('#both input[type=search]');
    assert.equal(await visible('both'),2);assert.equal(await visible('only'),2);
    assert.equal(await visible('notes'),4,'generic search ignores task state');
    assert.equal(await completed('notes').count(),0);assert.equal(await page.locator('#only input').count(),0);
    assert.equal(await funnel('both').count(),1,'two options share one funnel');
    for(const id of ['empty','direct','optout']) assert.equal(await completed(id).count(),0);
    assert.equal(await page.locator('#outer > .panel > .us-query-search-controls').count(),0);
    assert.equal(await visible('nested'),2);
    assert.equal(await page.locator('#both .panel-heading .us-task-completed-toggle .ti-checkbox').count(),1);
    // This suite runs with reduced motion, where hiding completed rows is
    // immediate: no collapse animation, and no deferred filtering behind it.
    await completed('only').click();
    await page.waitForFunction(()=>!document.querySelector('#only [data-record="done"]').hasAttribute('data-us-query-search-hidden'));
    await completed('only').click();
    const hiddenAtOnce=await page.evaluate(()=>{
      const row=document.querySelector('#only [data-record="done"]');
      return {hidden:row.hasAttribute('data-us-query-search-hidden'), animations:row.getAnimations().length};
    });
    assert.equal(hiddenAtOnce.hidden,true,'reduced motion hides completed rows immediately');
    assert.equal(hiddenAtOnce.animations,0,'reduced motion runs no collapse animation');
    assert.equal(await completed('only').getAttribute('aria-pressed'),'false');
    assert.equal(await completed('both').isVisible(),true);
    await funnel('both').click();
    assert(await page.locator('#both .us-query-search-field').evaluate(n=>Math.abs(n.getBoundingClientRect().width-n.parentElement.getBoundingClientRect().width)<2));
    await search.fill('Alex');
    assert.equal(await visible('both'),1);
    await completed('both').click();assert.equal(await visible('both'),2);
    assert.equal(await completed('both').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('#both [data-record="done"] h3').evaluate(n=>getComputedStyle(n).textDecorationLine),/line-through/);
    assert.equal(await page.locator('#both [data-native-hidden]').isVisible(),false);
    await search.fill('Jordan');assert.equal(await visible('both'),1);
    await completed('both').press('Space');assert.equal(await visible('both'),0);
    assert.equal(await page.locator('#both .us-query-search-status').innerText(),'No matching results on this page.');
    await search.fill('Completed wording');assert.equal(await visible('both'),1,'never infer state from text');
    await search.fill('Alex');await completed('both').click();
    await funnel('both').click();assert.equal(await search.isVisible(),false);
    assert.equal(await visible('both'),4,'closing disclosure clears search and preserves Show completed');
    assert.equal(await search.inputValue(),'');
    await funnel('both').click();
    await search.fill('Alex');
    // Native panel/body replacements retain both options and reconcile only one set of controls.
    await page.evaluate(markup=>{document.querySelector('#both').innerHTML=markup;ajaxEnds.forEach(fn=>fn());},panel());
    await page.waitForFunction(()=>document.querySelector('#both input')?.value==='Alex');
    assert.equal(await completed('both').getAttribute('aria-pressed'),'true');
    assert.equal(await visible('both'),2);assert.equal(await funnel('both').count(),1);
    await completed('both').click();
    await page.locator('#both [data-record="done"] [data-us-task-completed]').evaluate(n=>n.setAttribute('data-us-task-completed','false'));
    await page.waitForFunction(()=>!document.querySelector('#both [data-record="done"]').hasAttribute('data-us-query-search-hidden'));
    assert.equal(await visible('both'),2,'successful completion/reopen marker updates re-filter automatically');
    await page.locator('#both [data-record="open"] [data-open]').click();assert.equal(await page.evaluate(()=>opens),1);
    // An independently filtered nested iPart must not supply completion for its parent result.
    await page.locator('#both [data-record="unknown"] .QueryTemplateItem').evaluate(n=>n.innerHTML='<div class="ContentItemContainer"><div class="QueryTemplateSet"><div data-us-task-completed="true">Nested completed task</div></div></div>');
    await search.fill('');assert.equal(await visible('both'),3);
    // Remove either class independently; the remaining predicate stays active.
    await search.fill('Alex');
    await page.evaluate(()=>{document.querySelector('#both').classList.remove('us-task-completed-filter');UnionSuiteIqaFilters.refresh();});
    await completed('both').waitFor({state:'detached'});
    assert.equal(await completed('both').count(),0);assert.equal(await search.inputValue(),'Alex');assert.equal(await visible('both'),2);
    assert.equal(await page.locator('#both [data-us-task-completed-row]').count(),0);
    await page.evaluate(()=>{document.querySelector('#both').classList.add('us-task-completed-filter');UnionSuiteIqaFilters.refresh();});
    await completed('both').waitFor({state:'visible'});
    assert.equal(await completed('both').getAttribute('aria-pressed'),'false');
    await completed('both').click();
    await page.evaluate(()=>{document.querySelector('#both').classList.remove('us-query-search');UnionSuiteIqaFilters.refresh();});
    await search.waitFor({state:'detached'});
    assert.equal(await page.locator('#both input').count(),0);assert.equal(await visible('both'),4);
    assert.equal(await completed('both').getAttribute('aria-pressed'),'true');
    assert.equal(await funnel('only').count(),0);await completed('only').focus();assert.equal(await completed('only').evaluate(n=>n===document.activeElement),true);
    await completed('only').press('Enter');assert.equal(await visible('only'),4);assert.equal(await page.evaluate(()=>formSubmits),0);
    await page.setViewportSize({width:390,height:844});
    assert(await completed('only').evaluate(n=>n.getBoundingClientRect().right<=innerWidth),'mobile control fits');
    await page.addScriptTag({content:script});assert.equal(await completed('only').count(),1,'repeat include is idempotent');
    await page.evaluate(()=>{document.querySelector('#both').classList.add('us-report-no-styling');UnionSuiteIqaFilters.refresh();});
    await completed('both').waitFor({state:'detached'});
    assert.equal(await completed('both').count(),0);assert.equal(await visible('both'),4);
    assert.equal(await page.locator('#both [data-native-hidden]').getAttribute('style'),'display:none');
    await page.evaluate(()=>{document.querySelector('#only').classList.remove('us-task-completed-filter');UnionSuiteIqaFilters.refresh();});
    await funnel('only').waitFor({state:'detached'});
    assert.equal(await funnel('only').count(),0);assert.equal(await visible('only'),4);
    const ids=await page.locator('[id]').evaluateAll(ns=>ns.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);
    assert.deepEqual(errors,[]);
    console.log('Passed: independent/combined filters, notes isolation, explicit task state, native visibility, nested ownership, native actions, state retention, AJAX, marker updates, class removal, opt-out, keyboard and mobile.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
