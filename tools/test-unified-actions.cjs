const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
const row=(seqn='22',party='103885',workplace='103842')=>`<tr><td>Job ${seqn}</td><td><button type="button" class="us-action-jobs-edit" data-id="${party}" data-seqn="${seqn}" ${workplace===null?'':`data-workplace="${workplace}"`}>Edit job</button></td><td><button type="button" class="us-action-jobs-delete" data-id="${party}" data-seqn="${seqn}">Delete job</button></td></tr>`;
const report=(id,{direct=false,classes='JobsIQA us-action-member-add-job',rows=row(),nested=''}={})=>`<div class="ContentItemContainer" id="part-${id}">${direct?'':`<div class="${classes}" id="owner-${id}">`}<div class="panel"><div class="panel-heading"><h2 class="panel-title">Jobs ${id}</h2></div><div class="panel-body-container"><div class="panel-body"><div id="${id}_ContentPanel"><div id="${id}_ListerPanel"><div data-gridid="${id}_ResultsGrid" id="${id}_grid"><div class="RadGrid" id="${id}_ResultsGrid"><table class="rgMasterTable"><thead><tr><th>Job</th><th>Edit</th><th>Delete</th></tr></thead><tbody>${rows}</tbody></table></div><input type="image" id="${id}_ResultsGrid_RefreshButton" data-ajaxupdatedcontrolid="${id}_ResultsGrid"></div></div></div>${nested}</div></div></div>${direct?'':'</div>'}</div>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const html='<form><input type="hidden" id="__RequestVerificationToken" value="fixture-token">'+report('a')+report('b',{rows:row('22','207777')+row('23','207777',null)})+report('direct',{direct:true})+report('outer',{nested:report('inner',{classes:'us-action-member-add-job'})})+'<div class="us-actions"><button type="button" class="us-actions__toggle">Actions</button><ul class="us-actions__list"><li><button class="us-actions__item us-action-member-add-job" type="button">Add job</button></li></ul></div></form>';
  await page.route('https://theme.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://theme.test/Party.aspx?ID=103885');
  await page.evaluate(()=>{
   window.nativeCalls=[];window.refreshCalls=[];window.logs=[];window.requests=[];window.busyCount=0;window.maxBusy=0;window.submits=0;
   window.confirm=()=>true;
   window.ShowDialog_NoReturnValue=(...args)=>nativeCalls.push(args);
   const listeners={beginRequest:[],endRequest:[],pageLoading:[],initializeRequest:[]};
   const prm={active:false,get_isInAsyncPostBack(){return this.active;}};
   Object.keys(listeners).forEach(name=>{prm['add_'+name]=fn=>listeners[name].push(fn);prm['remove_'+name]=fn=>{const i=listeners[name].indexOf(fn);if(i>=0)listeners[name].splice(i,1);};});
   window.emit=(name,args)=>[...listeners[name]].forEach(fn=>fn(prm,args));window.listenerCounts=()=>Object.fromEntries(Object.entries(listeners).map(([key,items])=>[key,items.length]));
   window.Sys={WebForms:{PageRequestManager:{getInstance:()=>prm}}};window.prm=prm;
   document.addEventListener('submit',e=>{e.preventDefault();submits++;});
   document.addEventListener('click',event=>{
    const button=event.target.closest('input[id$="_ResultsGrid_RefreshButton"]');if(!button)return;event.preventDefault();
    if(button.dataset.testCancel==='true')return;
    if(prm.active)throw Error('Overlapping native requests');
    prm.active=true;busyCount++;maxBusy=Math.max(maxBusy,busyCount);refreshCalls.push(button.id);
    emit('beginRequest',{get_postBackElement:()=>button});
    setTimeout(()=>{prm.active=false;busyCount--;emit('endRequest',{get_error:()=>button.dataset.testError==='true'?Error('Fixture refresh failure'):null});},15);
   },true);
   window.fetch=async(url,options)=>{requests.push({url,method:options.method,token:options.headers.RequestVerificationToken});return {ok:true,status:204};};
  });
  await page.addStyleTag({content:read('Theme/UnionSuite/zUnionSuite.css')});
  console.log('Loading unified runtime');
  await page.addScriptTag({content:read('Theme/UnionSuite/zUnionSuite.js')});
  await page.addScriptTag({content:read('Theme/UnionSuite/Scripts/ActionDefinitions.js')});
  console.log('Checking generated controls');
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-command-key="member.add-job"]').length===5);
  // Fifteen standard definitions, plus the agreement page set (3 October 2026).
  assert.equal(await page.evaluate(()=>UnionSuiteActions.listActions().filter(item=>!item.key.startsWith('agreements.')).length),15);
  assert.equal(await page.evaluate(()=>UnionSuiteActions.listActions().filter(item=>item.key.startsWith('agreements.')).length),28);
  assert.equal(await page.evaluate(()=>typeof UnionSuiteIqaFilters.configureAction),'undefined');
  assert.equal(await page.evaluate(()=>typeof UnionSuiteActions.register),'undefined');
  const missing=page.locator('#b_ResultsGrid button.us-action-jobs-edit').nth(1);
  assert.equal(await missing.getAttribute('aria-disabled'),'true');assert.match(await missing.getAttribute('title'),/workplaceId/);
  const edit=page.locator('#b_ResultsGrid button.us-action-jobs-edit').first();
  await edit.locator('svg').click();await page.waitForFunction(()=>nativeCalls.length===1);
  console.log('Checking row popup and replacement');
  assert.deepEqual(await page.evaluate(()=>{const a=nativeCalls[0],url=new URL(a[0]);return [url.searchParams.get('ID'),url.searchParams.get('Ordinal'),url.searchParams.get('Worksite'),a[2],a[3],a.length]}),['207777','22','103842','70%','70%',13]);
  // Replace the whole originating iPart while the editor is open. The close must
  // find its current native control, not a detached node or the first JobsIQA.
  await page.evaluate(markup=>{document.getElementById('part-b').outerHTML=markup;},report('b',{rows:row('22','207777')}));
  await page.evaluate(()=>nativeCalls[0][11]({},{}));await page.waitForFunction(()=>refreshCalls.length===1&&busyCount===0);
  assert.deepEqual(await page.evaluate(()=>refreshCalls),['b_ResultsGrid_RefreshButton']);
  await page.waitForFunction(()=>document.querySelector('#b_ResultsGrid .us-action-jobs-delete')?.getAttribute('aria-disabled')!=='true');
  await page.locator('#b_ResultsGrid .us-action-jobs-delete').click();await page.waitForFunction(()=>requests.length===1&&refreshCalls.length===2&&busyCount===0);
  assert.deepEqual(await page.evaluate(()=>requests[0]),{url:'/api/i4u_UT_Jobs/~207777|22',method:'DELETE',token:'fixture-token'});
  // Native queue: multiple IQAs, no overlapping requests, same source IDs.
  await page.evaluate(()=>UnionSuiteRefresh.iqa('.JobsIQA',{scope:'page',match:'all'}));
  console.log('Checking queue failures and conflicts');
  assert.equal(await page.evaluate(()=>maxBusy),1);
  // Missing/ambiguous explicit targets do not click the first match.
  assert.equal(await page.evaluate(async()=>{try{await UnionSuiteRefresh.iqa('.JobsIQA',{scope:'page'});return false;}catch{return true;}}),true);
  assert.equal(await page.evaluate(async()=>{const e=document.createElement('div');try{await UnionSuiteRefresh.native(UnionSuiteRefresh.capture(e));return false;}catch{return true;}}),true);
  // Native cancellation must reject and leave no per-request subscriptions.
  const counts=await page.evaluate(()=>listenerCounts());
  assert.equal(await page.evaluate(async()=>{const b=document.querySelector('#a_ResultsGrid_RefreshButton');b.dataset.testCancel='true';try{await UnionSuiteRefresh.iqa('#owner-a',{scope:'page',startTimeout:20});return false;}catch{return true;}finally{delete b.dataset.testCancel;}}),true);
  assert.deepEqual(await page.evaluate(()=>listenerCounts()),counts);
  // Complete definitions conflict; repeated instances/includes do not.
  await page.evaluate(()=>{
   window.demoDefinition=()=>({className:'us-action-demo-run',owner:'demo',source:'demo.js',presentation:{label:'Run',icon:'plus',default:'button',row:'icon'},context:{partyId:{from:'trigger',attribute:'data-id',required:true}},action:{type:'function',run:({context})=>logs.push(context.partyId)}});
   document.body.insertAdjacentHTML('beforeend','<button class="us-action-demo-run" data-id="one">Run</button><button class="us-action-demo-run" data-id="two">Run</button>');
   UnionSuiteActions.define('demo.run',demoDefinition());UnionSuiteActions.define('demo.run',demoDefinition());
  });
  await page.locator('button.us-action-demo-run').nth(1).click();await page.waitForFunction(()=>logs.includes('two'));
  await page.evaluate(()=>UnionSuiteActions.define('demo.run',{...demoDefinition(),owner:'other',source:'other.js'}));
  assert.equal(await page.locator('.us-action-demo-run .us-action-conflict-icon').count(),2);
  await page.locator('button.us-action-demo-run').first().dispatchEvent('click');assert.deepEqual(await page.evaluate(()=>logs),['two']);
  await page.evaluate(()=>UnionSuiteActions.configure('demo.run',demoDefinition()));
  assert.equal(await page.locator('.us-action-demo-run .us-action-conflict-icon').count(),0);
  await page.evaluate(()=>UnionSuiteActions.define('demo.other',{...demoDefinition(),owner:'other',source:'other-class.js'}));
  assert.equal(await page.locator('.us-action-demo-run .us-action-conflict-icon').count(),2);
  await page.evaluate(()=>UnionSuiteActions.configure('demo.other',null));
  console.log('Checking refresh recovery and permissions');
  // Refresh-only recovery never repeats the successful operation.
  await page.evaluate(()=>{
   window.operationCount=0;window.summaryCount=0;window.failSummary=true;
   UnionSuiteActions.configure('demo.run',{...demoDefinition(),action:{type:'function',run:async()=>{operationCount++;},refresh:{when:'success',targets:[{type:'custom',run:async()=>{summaryCount++;if(failSummary)throw Error('Summary failed');}}]}}});
  });
  await page.locator('button.us-action-demo-run').first().click();await page.waitForFunction(()=>summaryCount===1);
  await page.evaluate(()=>failSummary=false);await page.getByRole('button',{name:'Retry refresh',exact:true}).click();await page.waitForFunction(()=>summaryCount===2);
  assert.equal(await page.evaluate(()=>operationCount),1);
  // Missing contexts are re-enabled after a relevant data attribute change.
  await page.evaluate(()=>document.querySelector('button.us-action-demo-run').removeAttribute('data-id'));
  await page.waitForFunction(()=>document.querySelector('button.us-action-demo-run').getAttribute('aria-disabled')==='true');
  await page.evaluate(()=>document.querySelector('button.us-action-demo-run').dataset.id='restored');
  await page.waitForFunction(()=>document.querySelector('button.us-action-demo-run').getAttribute('aria-disabled')!=='true');
  // Permission provider fails closed, async missing dependency can recover.
  await page.evaluate(()=>UnionSuiteActions.configure('demo.run',{...demoDefinition(),action:{type:'function',access:{permission:'demo.run'},run:()=>logs.push('allowed')}}));
  assert.equal(await page.locator('button.us-action-demo-run').first().getAttribute('aria-disabled'),'true');
  await page.evaluate(()=>UnionSuiteActions.setAccessResolver(async()=>true));
  await page.waitForFunction(()=>document.querySelector('button.us-action-demo-run').getAttribute('aria-disabled')!=='true');
  await page.locator('button.us-action-demo-run').first().click();await page.waitForFunction(()=>logs.includes('allowed'));
  // The menu retains disclosure and routes its item through the same action.
  await page.getByRole('button',{name:'Actions',exact:true}).click();
  await page.locator('.us-actions .us-action-member-add-job').click();await page.waitForFunction(()=>nativeCalls.length===2);
  assert.equal(await page.getByRole('button',{name:'Actions',exact:true}).getAttribute('aria-expanded'),'false');
  // Banner has no origin and three JobsIQA targets: surface ambiguity on close.
  await page.evaluate(()=>nativeCalls[1][11]({},{}));await page.waitForFunction(()=>document.querySelector('.us-command-notice').textContent.includes('could not refresh'));
  // Opt-out restores the original authored button without a managed handler.
  await page.evaluate(()=>{const b=document.querySelector('button.us-action-demo-run');const owner=document.createElement('div');owner.className='us-report-no-styling';b.before(owner);owner.append(b);});
  await page.waitForFunction(()=>!document.querySelector('.us-report-no-styling button').hasAttribute('data-us-command-key'));
  // Mixed toolbar modes agree with the report controller and remain stable.
  await page.evaluate(()=>{
   ['label','link','icon'].forEach((mode,index)=>UnionSuiteActions.define('order.'+mode,{className:'us-action-order-'+mode,owner:'test',source:'order:'+mode,presentation:{label:mode,icon:'plus',default:mode==='label'?'button':mode,order:-index},context:{},action:{type:'function',run:()=>{}}}));
   document.body.insertAdjacentHTML('beforeend','<div class="ContentItemContainer"><div id="order-owner" class="us-query-search us-action-order-label us-action-order-link us-action-order-icon"><div class="panel"><div class="panel-heading"><h2 class="panel-title">Order</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="QueryTemplateItem">Row</div></section></div></div></div></div></div></div>');
  });
  await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
  await page.waitForFunction(()=>document.querySelectorAll('#order-owner [data-us-panel-actions-slot] > *').length===4);
  const order=()=>page.locator('#order-owner [data-us-panel-actions-slot]').evaluate(n=>[...n.children].map(c=>c.dataset.usCommandKey||'utilities'));
  assert.deepEqual(await order(),['order.link','order.icon','utilities','order.label']);
  await page.evaluate(()=>{UnionSuiteIqaFilters.refresh();UnionSuiteActions.refresh();});
  assert.deepEqual(await order(),['order.link','order.icon','utilities','order.label']);
  assert.equal(await page.evaluate(()=>submits),0);
  assert.deepEqual(errors,[]);
  console.log('PASS unified definitions, native origin refresh after replacement, row delete, queued multi-refresh, cancellation cleanup, repeated controls, conflicts, permissions, context updates, menu routing and refresh-only recovery.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
