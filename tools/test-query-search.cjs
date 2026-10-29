// Browser regression for class-only Query Template Display search and native lifecycle.
const fs = require('node:fs'), assert = require('node:assert/strict');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const read = file => fs.readFileSync(file, 'utf8');
const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'');
const script = read('Theme/UnionSuite/zUnionSuite.js').split('/* US-BANNER-BEHAVIOUR:START */')[0];
function items(cards = true) {
  return [['Sarah Mitchell','104582'],['Daniel Chen','103917'],['Emma Thompson','101293']].map(([name,id],i) =>
    `<section data-record="${i}"><div class="${cards ? 'card ' : ''}QueryTemplateItem"><div${cards ? ' class="card-body"' : ''}><h3>${name}</h3><p>${id}</p><span hidden>Secret</span><button type="button" onclick="window.rowClicks++">Open task</button></div></div></section>`).join('') +
    '<section style="display:none" data-native-hidden><div class="QueryTemplateItem">Sarah hidden page</div></section>';
}
const body = cards => `<div class="panel-body"><span class="template-header">Header</span><div class="QueryTemplateSet">${items(cards)}</div><span class="template-footer">Footer</span></div>`;
const panel = (cards=true,title='Tasks') => `<div class="panel"><div class="panel-heading"><h2 class="panel-title">${title}</h2></div><div class="panel-body-container">${body(cards)}</div></div>`;
const wrap = (id,classes='',cards=true) => `<div class="ContentItemContainer"><div id="${id}" class="${classes}">${panel(cards)}</div></div>`;
(async () => {
  const browser = await chromium.launch({channel:'msedge',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1200,height:900}});
    const errors=[];page.on('pageerror', error=>errors.push(error.message));
    await page.route('**/*', route=>route.abort());
    await page.setContent(`<form><div class="ContentItemContainer" id="direct">${panel()}</div>${wrap('empty')}${wrap('search','us-query-search us-action-test-add')}${wrap('second','us-query-search',false)}${wrap('optout','us-query-search us-report-no-styling')}<div class="ContentItemContainer" id="zone"><div class="us-query-search"><div class="panel"><div class="panel-body-container"><div class="panel-body">${wrap('nested','us-query-search')}</div></div></div></div></div><div id="unrelated" class="us-query-search">${panel()}</div>${wrap('untitled','us-query-search').replace('<h2 class="panel-title">Tasks</h2>','<h2 class="panel-title"> </h2>')}</form>`);
    await page.addStyleTag({content:css});
    await page.evaluate(()=>{
      window.rowClicks=0;window.formSubmits=0;
      document.querySelector('form').addEventListener('submit',e=>{e.preventDefault();window.formSubmits++;});
      window.ajaxEnds=[];window.appLoads=[];
      const manager={add_endRequest:fn=>ajaxEnds.push(fn),add_pageLoading:()=>{}};
      window.Sys={Application:{add_load:fn=>appLoads.push(fn)},WebForms:{PageRequestManager:{getInstance:()=>manager}}};
    });
    await page.addScriptTag({content:script});
    await page.waitForFunction(()=>document.querySelectorAll('.us-query-search-controls').length===3);
    for(const id of ['direct','empty','optout','unrelated','untitled']) assert.equal(await page.locator('#'+id+' .us-query-search-controls').count(),0,id);
    assert.equal(await page.locator('#zone > .us-query-search > .panel > .us-query-search-controls').count(),0,'no surrounding-zone control');
    const input=page.locator('#search input[type=search]'), toggle=page.locator('#search .us-iqa-filter-toggle');
    assert.equal(await toggle.getAttribute('aria-expanded'),'false');assert.equal(await input.isVisible(),false);
    assert.equal(await page.locator('#search [data-record]:visible').count(),3);
    await page.evaluate(()=>{window.addClicks=0;UnionSuiteActions.define('test.add',{className:'us-action-test-add',owner:'test',source:'search',presentation:{label:'Add task'},context:{},action:{type:'function',run:()=>window.addClicks++}});});
    await page.locator('[data-us-command-key="test.add"]').click();assert.equal(await page.evaluate(()=>window.addClicks),1);
    await toggle.click();await input.waitFor({state:'visible'});
    await page.waitForFunction(()=>document.activeElement.matches('#search input[type=search]'));
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    assert.notEqual(await toggle.evaluate(n=>getComputedStyle(n).borderTopColor),'rgba(0, 0, 0, 0)','expanded appearance survives hover');
    await input.fill('  sArAh  ');assert.equal(await page.locator('#search [data-record]:visible').count(),1);
    assert.equal(await page.locator('#search .us-query-search-status').innerText(),'1 of 3 results on this page.');
    assert.equal(await page.locator('#second [data-record]:visible').count(),3,'instance isolation');
    assert.equal(await page.locator('#search [data-native-hidden]').isVisible(),false);
    await input.press('Enter');assert.equal(await page.evaluate(()=>window.formSubmits),0);
    await toggle.click();await input.waitFor({state:'hidden'});
    assert.equal(await input.inputValue(),'');assert.equal(await page.locator('#search [data-record]:visible').count(),3);
    assert.equal(await page.locator('#search .us-query-search-status').innerText(),'');
    assert.equal(await page.locator('#search [data-native-hidden]').isVisible(),false);
    await toggle.click();await page.waitForFunction(()=>document.activeElement.matches('#search input[type=search]'));await input.fill('103917');
    assert.equal(await page.locator('#search [data-record]:visible').innerText(),'Daniel Chen\n\n103917\n\nOpen task');
    await page.locator('#search [data-record]:visible button').click();assert.equal(await page.evaluate(()=>window.rowClicks),1,'native row handler survives');
    await input.fill('Secret');assert.equal(await page.locator('#search [data-record]:visible').count(),0,'hidden content is not searchable');
    assert.equal(await page.locator('#search .us-query-search-status').innerText(),'No matching results on this page.');
    await input.fill('');assert.equal(await page.locator('#search [data-record]:visible').count(),3);
    assert.equal(await page.locator('#search [data-native-hidden]').getAttribute('style'),'display:none','native hiding is never changed');
    // Result-only AJAX replacement preserves query, open state and existing action nodes.
    await input.fill('Emma');
    await page.evaluate(markup=>{window.savedAdd=document.querySelector('[data-us-command-key="test.add"]');document.querySelector('#search .panel-body').outerHTML=markup;ajaxEnds.forEach(fn=>fn());},body(true));
    await page.waitForFunction(()=>document.querySelector('#search input[type=search]').value==='Emma' && document.querySelector('#search [data-record="0"]').hasAttribute('data-us-query-search-hidden'));
    assert.equal(await page.locator('#search .us-query-search-controls').count(),1);
    assert.equal(await page.evaluate(()=>savedAdd===document.querySelector('[data-us-command-key="test.add"]')),true);
    assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    // Updating a row in place reapplies the search without a native postback.
    await page.locator('#search [data-record="0"] h3').evaluate(n=>n.textContent='Emma Cooper');
    await page.waitForFunction(()=>document.querySelectorAll('#search [data-record]:not([data-us-query-search-hidden])').length===2);
    // Panel replacement rebuilds one set of controls, still using the same iPart state.
    await page.evaluate(markup=>{document.querySelector('#search').innerHTML=markup;appLoads.forEach(fn=>fn());},panel());
    await page.waitForFunction(()=>document.querySelector('#search input[type=search]')?.value==='Emma');
    assert.equal(await page.locator('#search .us-query-search-controls').count(),1);
    await page.addScriptTag({content:script});
    await page.waitForTimeout(50);assert.equal(await page.locator('#search .us-iqa-filter-toggle').count(),1,'repeat include is idempotent');
    await page.emulateMedia({reducedMotion:'reduce'});
    await toggle.click();assert.equal(await input.isVisible(),false);
    await toggle.press('Space');assert.equal(await input.isVisible(),true);
    await page.setViewportSize({width:390,height:844});
    assert(await input.evaluate(n=>n.getBoundingClientRect().right<=innerWidth),'mobile search fits');
    // Explicit search data replaces visible text; a blank attribute is still an override.
    await input.fill('');
    const row0=page.locator('#search [data-record="0"] .QueryTemplateItem > div');
    await row0.evaluate(n=>n.setAttribute('data-us-search','  Staff   ALT-7788  '));
    await input.fill('staff alt-7788');assert.equal(await page.locator('#search [data-record]:visible').count(),1);
    await input.fill('Sarah');assert.equal(await page.locator('#search [data-record]:visible').count(),0,'visible name excluded by explicit override');
    await row0.evaluate(n=>n.setAttribute('data-us-search','Sarah new alias'));
    await page.waitForFunction(()=>!document.querySelector('#search [data-record="0"]').hasAttribute('data-us-query-search-hidden'));
    await row0.evaluate(n=>n.setAttribute('data-us-search','   '));
    await page.waitForFunction(()=>document.querySelector('#search [data-record="0"]').hasAttribute('data-us-query-search-hidden'));
    await row0.evaluate(n=>n.removeAttribute('data-us-search'));
    await page.waitForFunction(()=>!document.querySelector('#search [data-record="0"]').hasAttribute('data-us-query-search-hidden'));
    await row0.evaluate(n=>n.insertAdjacentHTML('beforeend','<div class="ContentItemContainer"><div data-us-search="NestedOnly">Nested display</div></div><div class="QueryTemplateItem" data-us-search="NestedResult">Nested result display</div><span class="us-report-no-styling" data-us-search="OptOutOnly"></span><span data-internal-key="InternalOnly"></span>'));
    for(const term of ['NestedOnly','NestedResult','OptOutOnly','InternalOnly']){await input.fill(term);assert.equal(await page.locator('#search [data-record]:visible').count(),0,term+' does not supply parent search data');}
    await row0.evaluate(n=>n.insertAdjacentHTML('afterbegin','<span hidden data-us-search="HiddenAlternate"></span><span data-us-search="SecondOverride"></span>'));
    await input.fill('HiddenAlternate');assert.equal(await page.locator('#search [data-record]:visible').count(),1,'explicit data may be on hidden content');
    await input.fill('SecondOverride');assert.equal(await page.locator('#search [data-record]:visible').count(),0,'first owned override wins');
    await page.locator('#search [data-native-hidden] .QueryTemplateItem').evaluate(n=>n.setAttribute('data-us-search','PagedAlternate'));
    await input.fill('PagedAlternate');assert.equal(await page.locator('#search [data-native-hidden]').isVisible(),false,'override never unhides native pages');
    // Class removal/opt-out release only our visibility, including rows currently excluded.
    await page.evaluate(()=>{document.querySelector('#search').classList.remove('us-query-search');UnionSuiteIqaFilters.refresh();});
    await page.waitForFunction(()=>!document.querySelector('#search .us-query-search-controls'));
    assert.equal(await page.locator('#search [data-record]:visible').count(),3);
    assert.equal(await page.locator('#search [data-native-hidden]').isVisible(),false);
    await page.evaluate(()=>{document.querySelector('#second').classList.add('us-report-no-styling');UnionSuiteIqaFilters.refresh();});
    await page.waitForFunction(()=>!document.querySelector('#second .us-query-search-controls'));
    const ids=await page.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length,'unique generated IDs');
    assert.deepEqual(errors,[]);
    console.log('Passed: native wrapper ownership, cards/plain results, independent search, hidden/paged content, actions, keyboard, reduced motion, mobile, AJAX replacement, repeat include, row updates and cleanup.');
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
