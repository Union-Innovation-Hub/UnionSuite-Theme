const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const example = require('../Theme/UnionSuite-Guides/usage/build/query-empty-example.cjs');
const source = fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-BANNER-BEHAVIOUR:START */')[0];
const wrap = (id, classes, content=example.panel(false)) => '<div class="ContentItemContainer"><div id="'+id+'" class="'+classes+'">'+content+'</div></div>';
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try {
    const page=await browser.newPage({viewport:{width:1200,height:900}}), errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.abort());
    await page.setContent(example.documentHtml());
    const shell = id => page.locator('#'+id+' > .panel').evaluate(n=>{
      const s=getComputedStyle(n), h=getComputedStyle(n.querySelector('.panel-title')), d=getComputedStyle(n.querySelector('.panel-description'));
      return {border:s.borderTopWidth,radius:s.borderRadius,background:s.backgroundColor,titleSize:h.fontSize,titleWeight:h.fontWeight,descriptionBackground:d.backgroundColor};
    });
    const normal=await shell('filled-query');
    assert.equal(normal.border,'1px');assert.equal(normal.titleSize,'15px');
    assert.deepEqual(await shell('empty-query'),normal,'initial no-results card matches the populated shell');
    assert.equal(await page.locator('#empty-query .QueryTemplateSet').count(),0,'do not invent native results');
    assert.equal(await page.locator('#empty-query [data-us-list-scroll-body]').count(),0);
    assert.equal(await page.locator('#empty-query .panel-body').evaluate(n=>getComputedStyle(n).padding),'12px 18px');
    assert.equal(await page.locator('#empty-query .panel-body > p').evaluate(n=>getComputedStyle(n).margin),'0px');
    assert((await page.locator('#empty-query > .panel').boundingBox()).height<200,'empty card uses natural height');
    await page.locator('#toggle-results').click();
    await page.waitForFunction(()=>document.querySelector('#empty-query [data-us-list-scroll-body]'));
    assert.equal(await page.locator('#empty-query .panel-body').evaluate(n=>n.clientHeight),414);
    await page.locator('#toggle-results').click();
    await page.waitForFunction(()=>!document.querySelector('#empty-query [data-us-list-scroll-body]'));
    assert.equal(await page.locator('#empty-query .panel-body').getAttribute('tabindex'),null);
    assert.deepEqual(await shell('empty-query'),normal,'plain-text no-results response keeps shell after refresh');
    await page.screenshot({path:'.preview/query-empty-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'.preview/query-empty-mobile.png'});
    await page.setViewportSize({width:1200,height:900});

    // Each author class sits in iMIS's extra div, never on ContentItemContainer.
    await page.locator('main').evaluate((n,html)=>n.innerHTML=html,
      ['us-query-template','us-list-scroll','us-query-search','us-task-completed-filter'].map((c,i)=>wrap('helper-'+i,c)).join('')+
      wrap('action','us-query-template us-query-search us-action-test-add-entry')+
      wrap('unmarked','')+wrap('optout','us-list-scroll us-report-no-styling')+
      '<div class="ContentItemContainer" id="direct">'+example.panel(true)+'</div>'+
      wrap('empty-wrapper','',example.panel(true))+
      wrap('outer','us-list-scroll','<div class="panel"><div class="panel-body-container"><div class="panel-body">'+wrap('nested','us-query-template')+'</div></div></div>')+
      wrap('grid','us-list-scroll',example.panel(false).replace('<p>No delegates found.</p>','<div class="RadGrid">Unrelated grid</div>'))+
      wrap('no-panel','us-query-template','<p>Content without a native panel</p>')+
      wrap('untitled','us-query-template',example.panel(false,'')));
    await page.evaluate(()=>{window.addCalls=0;UnionSuiteActions.define('test.add-entry',{className:'us-action-test-add-entry',owner:'test',source:'empty',presentation:{label:'Add entry',icon:'plus',header:'icon'},context:{},action:{type:'function',run:()=>addCalls++}});UnionSuiteIqaFilters.refresh();});
    await page.waitForFunction(()=>document.querySelector('#action [data-us-command-key]'));
    for(let i=0;i<4;i++)assert.deepEqual(await shell('helper-'+i),normal,'helper '+i+' opts in without records');
    assert.deepEqual(await shell('nested'),normal,'nested query owns its own shell');
    for(const id of ['unmarked','optout','outer','grid','no-panel'])assert.equal(await page.locator('#'+id).getAttribute('data-us-query-display'),null,id+' not promoted');
    for(const id of ['direct','empty-wrapper'])assert.equal(await page.locator('#'+id).getAttribute('data-us-query-display'),'','native result detection '+id);
    assert.equal(await page.locator('#untitled > .panel').evaluate(n=>getComputedStyle(n).borderTopWidth),'1px','untitled card has shell without action runtime');
    assert.equal(await page.locator('#action .us-iqa-filter-toggle').count(),0,'no filter for absent results');
    await page.locator('#action [data-us-command-key]').click();assert.equal(await page.evaluate(()=>addCalls),1,'Add stays usable with zero results');
    await page.locator('#action .panel-body').evaluate((n,html)=>n.innerHTML=html,example.body(true));
    await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
    await page.waitForFunction(()=>document.querySelector('#action .us-iqa-filter-toggle'));
    await page.locator('#action .us-iqa-filter-toggle').click();
    await page.waitForFunction(()=>document.activeElement.matches('#action input[type=search]'));
    await page.locator('#action input[type=search]').fill('101000');
    assert.equal(await page.locator('#action .QueryTemplateSet > section:visible').count(),1);
    await page.locator('#action .panel-body').evaluate(n=>n.textContent='No delegates found.');
    await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
    await page.waitForFunction(()=>!document.querySelector('#action .us-iqa-filter-toggle'));
    assert.equal(await page.locator('#action [data-us-command-key]').count(),1);
    await page.locator('#action > .panel').evaluate((n,html)=>n.outerHTML=html,example.panel(true));
    await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
    await page.waitForFunction(()=>document.querySelector('#action input[type=search]'));
    await page.addScriptTag({content:source});
    assert.equal(await page.locator('#action [data-us-command-key]').count(),1,'replacement/repeated includes do not duplicate actions');
    await page.locator('#helper-0').evaluate(n=>n.classList.remove('us-query-template'));
    await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
    await page.waitForFunction(()=>!document.querySelector('#helper-0').hasAttribute('data-us-query-display'));
    assert.deepEqual(await shell('helper-0'),await shell('unmarked'),'removing declaration restores original styling');
    await page.locator('#helper-1').evaluate(n=>n.classList.add('us-report-no-styling'));
    await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
    await page.waitForFunction(()=>!document.querySelector('#helper-1').hasAttribute('data-us-query-display'));
    assert.deepEqual(await shell('helper-1'),await shell('optout'));
    assert.deepEqual(errors,[]);
    console.log('PASS empty/populated shells, raw text/paragraph spacing, scrolling cleanup, desktop/mobile, native/direct/wrapped/nested/untitled/opt-out cases, Add actions, filtering, replacement and class removal.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
