// Verify the generated, self-contained guide and its real shared-search example.
const {guidePath}=require('../build/guide-output.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../../../../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
  const browser=await chromium.launch({channel:'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.route('**/*',route=>route.abort());
    await page.setContent(fs.readFileSync(guidePath('Usage-Guide.html'),'utf8'),{waitUntil:'domcontentloaded',timeout:60000});
    const copy=page.locator('#content-lists [data-copy-text="us-query-search"]').first();
    assert.equal(await copy.innerText(),'us-query-search');
    const frame=page.frameLocator('#list-demo');
    const toggle=frame.locator('#search-tasks .us-iqa-filter-toggle');
    // Other gallery frames resize as they load. The component's pointer and
    // keyboard interaction is covered in test-query-search.cjs independently.
    await toggle.dispatchEvent('click');
    const input=frame.getByRole('searchbox',{name:'Search My tasks',exact:true});
    await input.fill('Jordan');
    await page.waitForFunction(()=>document.querySelector('#list-demo').contentDocument.querySelector('#search-tasks .us-query-search-status').textContent==='1 of 3 results on this page.');
    assert.equal(await frame.locator('#demo-search-tasks > section:visible').count(),1);
    // Both new recipes use the actual shared runtime inside the offline guide.
    assert.equal(await page.locator('#content-lists [data-copy-text="us-task-completed-filter"]').first().innerText(),'us-task-completed-filter');
    await frame.locator('#task-filters .us-iqa-filter-toggle').dispatchEvent('click');
    assert.equal(await frame.locator('#demo-task-filters > section:visible').count(),2);
    await frame.locator('#task-filters .us-task-completed-toggle').dispatchEvent('click');
    assert.equal(await frame.locator('#demo-task-filters > section:visible').count(),3);
    await frame.locator('#task-filters input[type=search]').fill('Alex');
    assert.equal(await frame.locator('#demo-task-filters > section:visible').count(),2);
    await frame.locator('#task-filters .us-iqa-filter-toggle').dispatchEvent('click');
    assert.equal(await frame.locator('#task-filters input[type=search]').inputValue(),'');
    assert.equal(await frame.locator('#demo-task-filters > section:visible').count(),3);
    assert.equal(await frame.locator('#task-filters .us-task-completed-toggle').getAttribute('aria-pressed'),'true');
    await frame.locator('#search-notes .us-iqa-filter-toggle').dispatchEvent('click');
    await frame.locator('#search-notes input[type=search]').fill('James');
    assert.equal(await frame.locator('#demo-search-notes > section:visible').count(),1);
    assert.equal(await frame.locator('#search-notes .us-task-completed-toggle').count(),0);
    assert.equal(await frame.locator('#task-completed-only input[type=search]').count(),0);
    assert.equal(await frame.locator('#task-completed-only .us-iqa-filter-toggle').count(),0,'completion-only control does not generate a search funnel');
    await frame.locator('#task-completed-only .us-task-completed-toggle').dispatchEvent('click');
    assert.equal(await frame.locator('#demo-task-completed-only > section:visible').count(),3);
    await frame.locator('#contacts-delegates .us-iqa-filter-toggle').dispatchEvent('click');
    await frame.locator('#contacts-delegates input[type=search]').fill('101000');
    assert.equal(await frame.locator('#demo-contacts-delegates > section:visible').count(),1);
    await page.waitForFunction(()=>!document.querySelector('#list-demo').contentDocument.querySelector('#contacts-delegates [data-us-list-scroll-frame]').hasAttribute('data-us-list-more'));
    assert.equal(await frame.locator('#demo-contacts-organisers > section:visible').count(),8);
    assert.equal(await page.locator('#code-contact-row').count(),1,'canonical contact HTML is copyable');
    assert((await frame.locator('#contacts-delegates .ti-building').first().evaluate(n=>getComputedStyle(n).fontFamily)).includes('tabler'),'offline icon font CSS reaches the frame');
    await frame.locator('#task-filters').getByRole('button',{name:'Add task',exact:true}).click();
    assert.match(await frame.locator('#list-reference-status').innerText(),/Add task — sample action/);
    const icons=page.frameLocator('#report-icon-demo');
    const add=icons.getByRole('button',{name:'Add task',exact:true});
    await add.dispatchEvent('click');
    assert.match(await icons.locator('#icon-demo-status').innerText(),/Add task selected/);
    assert.equal(await icons.getByRole('button',{name:'Edit note',exact:true}).locator('svg').count(),1);
    await icons.getByRole('button',{name:'Find notes',exact:true}).dispatchEvent('click');
    assert.match(await icons.locator('#icon-demo-status').innerText(),/Find notes selected/);
    await copy.evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:'.preview/query-search-guide.png'});
    await page.locator('#report-icon-actions').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));
    await page.screenshot({path:'.preview/report-icon-guide.png'});
    console.log('Passed: standalone guide loads without network, exposes copyable classes, and demonstrates generic notes search, independent task completion and combined filters.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
