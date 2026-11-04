const fs=require('node:fs'), assert=require('node:assert/strict');
const {guidePath}=require('../Theme/UnionSuite-Guides/usage/build/guide-output.cjs');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=f=>fs.readFileSync(f,'utf8');
const themeJs=read('Theme/UnionSuite/zUnionSuite.js');
const script=themeJs.match(/\/\* US-ATTENTION:START[\s\S]*?US-ATTENTION:END \*\//)[0];
const template=read('Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html');
const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite-Client/Branding.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'');
const folder='$/_i4u_/Client/Home Page - UnionSuite/Trackers';
const folderId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ids=[1,2,3,4,5].map(i=>'00000000-0000-4000-8000-'+String(i).padStart(12,'0'));
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1200,height:850}}), errors=[], calls=[];
  page.on('pageerror',e=>errors.push(e.message));
  const logs=[];page.on('console',m=>{if(m.text().startsWith('Needs Attention section:'))logs.push([m.type(),m.text()]);});
  const easyEdit=on=>page.evaluate(on=>window.gIsEasyEditEnabled=on,on);
  const reload=()=>page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));
  let mode='valid';
  const dataRows=[
    {Count:3,Header:'Applications',Label:'Awaiting review',Link:'/reports?kind=applications'},
    {Count:0,Header:'Failed payments',Label:'Need a follow-up'},
    {Count:2,Header:'Resignations',Label:'Ready to process',Link:'~/reports/resignations'},
    {Count:4,Header:'<img src=x onerror=alert(1)>',Label:'A & B',Link:'javascript:alert(1)'},
    {Count:999,Header:'Ignored fifth IQA',Label:'Hidden'}
  ];
  await page.route('**/*',async route=>{
   const request=route.request(), url=new URL(request.url());
   if(url.pathname==='/home') {await route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="en-AU"><body><input type="hidden" id="__RequestVerificationToken" value="test-token"></body></html>'});return;}
   if(!url.pathname.startsWith('/sdk/api/')) {await route.abort();return;}
   calls.push({url,method:request.method(),body:request.postDataJSON()});
   assert.equal(request.headers().requestverificationtoken,'test-token');
   let body;
   if(url.pathname.endsWith('DocumentSummary/_execute')) {
    const payload=request.postDataJSON();
    assert.equal(payload.EntityTypeName,'DocumentSummary');
    if(payload.OperationName==='FindByPath') {
      assert([folder,folder+'/Replacement'].includes(payload.Parameters.$values[0].$value));
      if(mode==='folder-error'){await route.fulfill({status:403,body:'{}'});return;}
      body={Result:{DocumentId:{$type:'System.String',$value:folderId}}};
    } else {
      assert.equal(payload.OperationName,'FindDocumentsInFolder');
      assert.equal(payload.Parameters.$values[0].$value,folderId,'folder DocumentId, not version key');
      assert.deepEqual(payload.Parameters.$values[1].$values,['IQD']);
      assert.equal(payload.Parameters.$values[2].$value,true);
      body={Result:{$values:mode==='empty'?[]:ids.map((id,i)=>({DocumentTypeId:'IQD',DocumentVersionId:id,Name:'0'+(i+1)+' Query'})).reverse().concat([{DocumentTypeId:'CFL',DocumentVersionId:folderId,Name:'Subfolder'}])}};
    }
   } else {
    assert.equal(url.pathname,'/sdk/api/iqa');assert.equal(url.searchParams.get('Limit'),'2');
    const i=ids.indexOf(url.searchParams.get('QueryDocumentVersionKey')); assert(i>=0 && i<4,'only first four queries execute');
    if(mode==='query-error' && i===1){await route.fulfill({status:500,body:'{}'});return;}
    const row={...dataRows[i]};
    if(mode==='invalid' && i===0) row.Count=null;
    if(mode==='invalid' && i===1) row.Count=-1;
    if(mode==='invalid' && i===2) row.Label='';
    // iMIS's reply when a grouped count IQA matches nothing.
    if(mode==='no-rows'&&i===2||mode==='all-no-rows'){body={Items:{$values:[]},Offset:0,Limit:2,Count:0,TotalCount:0,HasNext:false,NextOffset:0};await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});return;}
    body={TotalCount:mode==='invalid'&&i===3?2:1,Items:{$values:[{Properties:{$values:Object.entries(row).map(([Name,Value])=>({Name,Value:{$value:Value}}))}}]}};
    if(mode==='delayed') await new Promise(resolve=>setTimeout(resolve,120));
   }
   await route.fulfill({contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto('https://attention.example/home');
  await page.evaluate(()=>window.gWebRoot='/sdk/');
  await page.addStyleTag({content:css+'html{height:auto}body{margin:20px;width:auto;height:auto}'});
  await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend','<div id="mount" class="ContentItemContainer">'+html+'</div>'),template);
  await page.addScriptTag({content:script});
  const cards=page.locator('#mount .us-attention__card'), status=page.locator('#mount .us-attention__status');
  const settled=()=>page.waitForFunction(()=>document.querySelector('#mount .us-attention__items')?.children.length===4&&!document.querySelector('#mount [aria-busy]'));
  await settled();
  assert.equal(calls.length,6,'two folder requests plus four IQAs');
  assert.deepEqual(await cards.locator('.us-attention__number').allTextContents(),['3','0','2','4']);
  assert.equal(await cards.nth(0).getAttribute('href'),'https://attention.example/reports?kind=applications');
  assert.equal(await cards.nth(1).evaluate(n=>n.tagName),'DIV');
  assert.equal(await cards.nth(2).getAttribute('href'),'https://attention.example/sdk/reports/resignations');
  assert.equal(await cards.nth(3).getAttribute('href'),null,'unsafe link becomes static');
  assert.equal(await cards.nth(3).locator('img').count(),0,'IQA text is not interpreted as HTML');
  assert.match(await cards.nth(3).textContent(),/<img src=x/);
  assert.equal(await status.textContent(),'');
  await page.screenshot({path:'.preview/attention-desktop.png'});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll('body, #mount, .us-attention, .us-attention__card')].map(n=>({node:n.className||n.tagName,left:n.getBoundingClientRect().left,right:n.getBoundingClientRect().right,width:getComputedStyle(n).width})))));
  const boxes=await cards.evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().top));
  assert(boxes.every((top,i)=>i===0||top>boxes[i-1]),'mobile stacks four cards');
  await page.screenshot({path:'.preview/attention-mobile.png',fullPage:true});
  const loaded=()=>page.waitForFunction(()=>!document.querySelector('#mount [aria-busy]')&&!document.querySelector('#mount .us-attention__status').textContent.startsWith('Loading'));
  const retry=page.locator('#mount .us-attention__retry');
  // Staff never see errors: a failed IQA drops its card and the console says why.
  mode='query-error';logs.length=0;await reload();await loaded();
  assert.deepEqual(await cards.locator('.us-attention__number').allTextContents(),['3','2','4']);
  assert.equal(await status.textContent(),'');assert.equal(await retry.isVisible(),false);
  assert.deepEqual(logs,[['error','Needs Attention section: IQA '+folder+'/02 Query returned an error (HTTP 500).']]);
  mode='folder-error';logs.length=0;await reload();await loaded();
  assert.equal(await cards.count(),0);assert.equal(await status.textContent(),'');assert.equal(await retry.isVisible(),false);
  assert.deepEqual(logs,[['error','Needs Attention section: couldn’t load '+folder+' — returned an error (HTTP 403).']]);
  mode='empty';logs.length=0;await reload();await loaded();
  assert.equal(await status.textContent(),'');assert.deepEqual(logs,[['warning','Needs Attention section: no tracker IQAs were found in '+folder+'.']]);
  // Easy Edit shows the error cards, messages and Retry.
  await easyEdit(true);
  mode='query-error';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));await settled();
  assert.equal(await cards.nth(1).locator('.us-attention__number').textContent(),'—');
  assert.match(await status.textContent(),/3 of 4/);
  mode='valid';await page.locator('#mount .us-attention__retry').click();await settled();
  assert.equal(await cards.nth(1).locator('.us-attention__number').textContent(),'0');
  assert.equal(await page.evaluate(()=>document.activeElement.className),'us-attention__items','retry retains a useful focus location');
  mode='invalid';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));await settled();
  assert.deepEqual(await cards.locator('.us-attention__number').allTextContents(),['—','—','—','—']);
  // A tracker with no rows has nothing needing attention: its card is left out, not an error, and the console says so.
  mode='no-rows';logs.length=0;await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));await loaded();
  assert.deepEqual(logs,[['info','Needs Attention section: IQA '+folder+'/03 Query returned 0 results.']]);
  assert.deepEqual(await cards.locator('.us-attention__copy > strong').allTextContents(),['Applications','Failed payments','<img src=x onerror=alert(1)>']);
  assert.equal(await status.textContent(),'');assert.equal(await page.locator('#mount .us-attention__retry').isVisible(),false);
  assert.equal(await page.locator('#mount .us-attention__items').evaluate(n=>n.style.getPropertyValue('--us-attention-columns')),'3');
  mode='all-no-rows';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));await loaded();
  assert.equal(await cards.count(),0);assert.equal(await status.textContent(),'Nothing needs attention.');
  mode='empty';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));
  await page.waitForFunction(()=>document.querySelector('#mount .us-attention__status').textContent.startsWith('No tracker'));
  assert.equal(await cards.count(),0);
  mode='folder-error';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));
  await page.waitForFunction(()=>document.querySelector('#mount .us-attention__status').textContent.startsWith('Couldn’t'));
  assert.equal(await page.locator('#mount .us-attention__retry').isVisible(),true);
  await easyEdit(false);mode='valid';
  // Direct, empty, configured and nested Content HTML wrappers do not change ownership.
  for(const wrapping of [html=>'<div>'+html+'</div>',html=>'<div class="author-wrapper">'+html+'</div>',html=>'<div class="panel"><div class="ContentItemContainer">'+html+'</div></div>']) {
    await page.locator('#mount').evaluate((node,html)=>node.innerHTML=html,wrapping(template));await settled();
  }
  const before=calls.length;await page.addScriptTag({content:script});
  await page.evaluate(()=>UnionSuiteAttention.refresh());
  await page.waitForTimeout(50);assert.equal(calls.length,before,'idempotent reconciliation');
  await page.evaluate(html=>document.body.insertAdjacentHTML('beforeend','<div id="optout" class="us-report-no-styling">'+html+'</div>'),template);
  await page.waitForTimeout(50);assert.equal(await page.locator('#optout .us-attention__card').count(),0);assert.equal(calls.length,before);
  // Replace the inner Content HTML while requests are pending: old responses cannot fill new slots.
  mode='delayed';await page.evaluate(()=>UnionSuiteAttention.reload(document.querySelector('#mount .us-attention')));
  // While loading, the shared spinner sits before the text, hidden from assistive tech.
  const loadingSpinner=status.locator('.us-button-spinner.us-attention__spinner');
  assert.equal(await status.textContent(),'Loading counts…');assert(await loadingSpinner.isVisible());
  assert.equal(await loadingSpinner.getAttribute('aria-hidden'),'true');
  assert.equal(await status.evaluate(n=>getComputedStyle(n).display),'flex');
  await page.locator('#mount').evaluate((node,html)=>node.innerHTML=html,template.replace('data-us-iqa-folder="'+folder+'"','data-us-iqa-folder="'+folder+'/Replacement"'));
  await settled();assert.equal(await cards.count(),4);
  assert.equal(await loadingSpinner.count(),0,'the spinner goes when the counts load');
  assert.deepEqual(errors,[]);
  // The standalone guide uses the same component without network or external assets.
  const guide=await browser.newPage({viewport:{width:1100,height:900}});
  const guideErrors=[];guide.on('pageerror',e=>guideErrors.push(e.message));
  await guide.route('**/*',route=>route.abort());
  await guide.setContent(read(guidePath('Usage-Guide.html')),{waitUntil:'domcontentloaded'});
  const frame=guide.frameLocator('#attention-demo');
  await frame.locator('.us-attention__card').first().waitFor();
  assert.equal(await frame.locator('.us-attention__card').count(),4);
  await frame.locator('a.us-attention__card').first().click();
  assert.match(await frame.locator('#attention-example-status').textContent(),/Sample destination/);
  assert((await guide.locator('#code-attention').textContent()).includes(folder));
  assert.deepEqual(guideErrors,[]);
  console.log('Needs Attention passed: folder contract, four-query cap/order, field validation, safe links, errors/retry in Easy Edit only, console logging, trackers with no rows, loading spinner, wrappers/replacement, responsive cards and offline guide.');
 } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
