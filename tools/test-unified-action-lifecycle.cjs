const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const asi=fs.readFileSync('../API Reference/Asi.js','utf8');
const forwarder=asi.match(/function ShowDialog_NoReturnValue\([^)]*\)\{[^}]+\}/)[0];
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://theme.test/**',r=>r.fulfill({contentType:'text/html',body:'<button class="us-action-test-edit" data-id="001">Edit</button><button class="us-action-test-edit" data-id="001">Other instance</button><a class="us-action-test-link">Open</a>'}));
  await page.goto('https://theme.test/profile');
  await page.evaluate(()=>{window.calls=[];window.closeEvents=[];window.executions=0;window.ShowDialog=(...args)=>calls.push(args);window.confirm=()=>true;});
  await page.addScriptTag({content:forwarder});await page.addScriptTag({content:source});
  await page.evaluate(()=>{
   window.definition=()=>({className:'us-action-test-edit',owner:'test',source:'lifecycle',presentation:{label:'Edit record',icon:'pencil',default:'icon'},context:{id:{from:'trigger',attribute:'data-id',required:true}},action:{type:'popup',recordKey:['id'],href:({context})=>'https://theme.test/editor?ID='+context.id,popup:{title:'Record editor',width:'800px',height:'70%',args:{example:true},iconUrl:'/icon.png',templateType:'E',windowName:'FixedEditor',closeWindowOnCommit:true,preserveStatefulBusinessContainer:true,fullscreenBelow:768,onBeforeClose:({closeEvent})=>closeEvent.set_cancel(true),onClose:async env=>closeEvents.push([env.context.id,env.dialog.result])}}});
   UnionSuiteActions.define('test.edit',definition());
  });
  const button=page.locator('button.us-action-test-edit').first();await button.press('Enter');await page.waitForFunction(()=>calls.length===1);
  assert.deepEqual(await page.evaluate(()=>{const a=calls[0];return [a.length,a[0],a[1],a[2],a[3],a[4],a[5],a[6],a[8],a[9],a[10],a[12].dataset.id];}),[13,'https://theme.test/editor?ID=001',{example:true},800,'70%','Record editor','/icon.png','E','FixedEditor',true,true,'001']);
  await page.waitForFunction(()=>document.querySelectorAll('button.us-action-test-edit')[1].getAttribute('aria-disabled')==='true');
  await page.locator('button.us-action-test-edit').nth(1).dispatchEvent('click');assert.equal(await page.evaluate(()=>calls.length),1);
  await page.evaluate(()=>{window.cancelled=false;calls[0][7]({}, {set_cancel:value=>cancelled=value});});assert.equal(await page.evaluate(()=>cancelled),true);
  await page.evaluate(()=>{calls[0][11]({result:'saved'},{});calls[0][11]({result:'duplicate'},{});});
  await page.waitForFunction(()=>closeEvents.length===1&&!document.querySelector('button').hasAttribute('aria-busy'));
  assert.deepEqual(await page.evaluate(()=>closeEvents),[['001','saved']]);
  await page.setViewportSize({width:390,height:800});await button.click();await page.waitForFunction(()=>calls.length===2);
  assert.equal(await page.evaluate(()=>new URL(calls[1][0]).searchParams.get('Mode')),'Maximized');await page.evaluate(()=>calls[1][11]({},{}));
  // A pending href cannot open after context replacement or a competing definition.
  await page.evaluate(()=>{window.resolveHref=null;UnionSuiteActions.configure('test.edit',{...definition(),action:{type:'popup',href:()=>new Promise(resolve=>resolveHref=resolve)}});});
  await button.click();await page.waitForFunction(()=>typeof resolveHref==='function');
  await page.evaluate(()=>{document.querySelector('button').dataset.id='002';resolveHref('https://theme.test/editor');});
  await page.waitForFunction(()=>!document.querySelector('button').hasAttribute('aria-busy'));assert.equal(await page.evaluate(()=>calls.length),2);
  // External context resolver changes are rechecked after asynchronous confirmation.
  await page.evaluate(()=>{window.selected='before';window.accept=null;UnionSuiteActions.configure('test.edit',{...definition(),context:{id:{resolve:()=>selected,required:true}},action:{type:'function',confirm:()=>new Promise(resolve=>accept=resolve),run:()=>executions++}});});
  await button.click();await page.waitForFunction(()=>typeof accept==='function');await page.evaluate(()=>{selected='after';accept(true);});
  await page.waitForFunction(()=>!document.querySelector('button').hasAttribute('aria-busy'));assert.equal(await page.evaluate(()=>executions),0);
  // Invalid schemas never replace an existing valid definition.
  assert.deepEqual(await page.evaluate(()=>[
   {popup:{width:'80vw'}},{popup:{height:-1}},{popup:{fullscreenBelow:-1}},
   {refresh:{when:'success',targets:[]}},{refresh:{when:'close',targets:[],run:()=>{}}}
  ].map(extra=>{try{UnionSuiteActions.configure('test.edit',{...definition(),action:{...definition().action,...extra}});return false;}catch{return true;}})),[true,true,true,true,true]);
  // Invalid record keys become disabled states instead of breaking reconciliation.
  await page.evaluate(()=>UnionSuiteActions.configure('test.edit',{...definition(),action:{type:'function',recordKey:()=>{throw Error('No record key');},run:()=>executions++}}));
  assert.equal(await button.getAttribute('aria-disabled'),'true');assert.match(await button.getAttribute('title'),/No record key/);
  // Native link semantics and fresh data; stale links cannot follow an old URL.
  await page.evaluate(()=>UnionSuiteActions.define('test.link',{className:'us-action-test-link',owner:'test',source:'lifecycle',presentation:{label:'Open record',default:'link'},context:{id:{value:'42'}},action:{type:'navigate',href:({context})=>'https://theme.test/details?ID='+context.id,target:'_blank'}}));
  const link=page.locator('a.us-action-test-link');assert.equal(await link.getAttribute('href'),'https://theme.test/details?ID=42');assert.equal(await link.getAttribute('rel'),'noopener');
  assert.match(await link.getAttribute('aria-label'),/new tab/);
  // Custom callbacks can invoke the facade without any held native queue lock.
  await page.evaluate(()=>UnionSuiteActions.configure('test.edit',{...definition(),action:{type:'function',run:async()=>{executions++;},refresh:{when:'success',run:async({context,refresh})=>{if(typeof refresh.iqa!=='function')throw Error('Facade missing');closeEvents.push(context.id);}}}}));
  await button.click();await page.waitForFunction(()=>executions===1&&!document.querySelector('button').hasAttribute('aria-busy'));
  // A native disabled attribute added after enhancement blocks the operation.
  await page.evaluate(()=>document.querySelector('button').disabled=true);await button.dispatchEvent('click');assert.equal(await page.evaluate(()=>executions),1);
  await page.evaluate(()=>{document.querySelector('button').disabled=false;UnionSuiteActions.refresh();});assert.notEqual(await button.getAttribute('aria-disabled'),'true');
  // An old async availability result cannot restore a conflicted navigation link.
  await page.evaluate(()=>{
   window.pendingAccess=[];
   window.pendingLink={className:'us-action-test-link',owner:'test',source:'pending',presentation:{label:'Open record'},context:{},action:{type:'navigate',href:'https://theme.test/details',access:{check:()=>new Promise(resolve=>pendingAccess.push(resolve))}}};
   UnionSuiteActions.configure('test.link',pendingLink);
   const alternate=document.createElement('a');alternate.className='us-action-test-alternative';alternate.textContent='Alternative';document.body.append(alternate);
   UnionSuiteActions.define('test.link',{...pendingLink,className:'us-action-test-alternative',owner:'rival',source:'rival'});
   pendingAccess.forEach(resolve=>resolve(true));
  });
  await page.waitForFunction(()=>document.querySelectorAll('.us-action-conflict').length===2);
  assert.equal(await link.getAttribute('href'),null);assert.equal(await link.getAttribute('data-us-command-state'),'conflict');
  assert.equal(await page.locator('a.us-action-test-alternative').getAttribute('data-us-command-state'),'conflict');
  assert.deepEqual(errors,[]);
  console.log('PASS real Asi.js argument forwarding, popup guard/close lifecycle, stale context cancellation, async confirmation, option validation, record-key failures, native navigation and custom refresh callbacks.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
