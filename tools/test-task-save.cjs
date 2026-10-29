// Saving a completion: the PUT iMIS receives, and what the row does when it fails.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=f=>fs.readFileSync(f,'utf8');
const source=read('Theme/UnionSuite/zUnionSuite.js');
const script=source.split('/* US-BANNER-BEHAVIOUR:START */')[0]+'\n'+source.match(/\/\* US-TASK-ROWS:START[\s\S]*?US-TASK-ROWS:END \*\//)[0];
const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite-Client/Branding.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'');
const template=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html');
// The third row has no interaction identity: that list stays local, as before.
const records=[
 {TaskTitle:'Call Alex about renewal',TaskUrl:'#task',TaskNote:'Confirm the tier.',MemberName:'Alex Morgan',MemberUrl:'#member',IsCompleted:'false',DueState:'overdue',TaskDateLabel:'Overdue 10 September 2026',DueLabel:'Overdue 10 September 2026',TaskPartyId:'104019',TaskOrdinal:'219'},
 {TaskTitle:'Confirm workplace details',TaskUrl:'#task',TaskNote:'Check the employer record.',MemberName:'Jordan Lee',MemberUrl:'#member',IsCompleted:'false',DueState:'soon',TaskDateLabel:'Due 18 September 2026',DueLabel:'Due 18 September 2026',TaskPartyId:'104020',TaskOrdinal:'7'},
 {TaskTitle:'Unsaveable task',TaskUrl:'#task',TaskNote:'No interaction identity.',MemberName:'Taylor Smith',MemberUrl:'#member',IsCompleted:'false',DueState:'none',TaskDateLabel:'Due 21 September 2026',DueLabel:'Due 21 September 2026',TaskPartyId:'',TaskOrdinal:''}
];
const rows=records.map((row,i)=>'<section data-row="'+i+'"><div class="QueryTemplateItem">'+template.replace(/\{#query\.(\w+)\}/g,(_,key)=>row[key])+'</div></section>').join('');
const panel='<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">My tasks</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">'+rows+'</div></div></div></div>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:800}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent('<!doctype html><html lang="en-AU"><body><input type="hidden" id="__RequestVerificationToken" value="token-123"><div class="ContentItemContainer"><div id="tasks" class="us-query-search us-task-completed-filter">'+panel+'</div></div></body></html>');
  await page.addStyleTag({content:css+'html{height:auto}body{width:auto;height:auto;margin:32px}'});
  // Record every request the theme makes and answer it without a tenant.
  await page.evaluate(()=>{
   window.sent=[];window.failNext=false;
   window.fetch=(input,init)=>{
    window.sent.push({url:String(input),method:init&&init.method,headers:init&&init.headers,body:init&&init.body});
    return Promise.resolve(new Response('{}',{status:window.failNext?500:200}));
   };
  });
  await page.addScriptTag({content:script});
  const row=i=>page.locator('[data-row="'+i+'"] .us-task');
  const toggle=i=>page.locator('[data-row="'+i+'"] [data-us-task-toggle]');

  await toggle(0).click();
  await page.waitForFunction(()=>window.sent.length===1);
  const sent=await page.evaluate(()=>window.sent[0]);
  assert.equal(sent.method,'PUT','completion updates the interaction; POST would create a second one');
  assert(sent.url.endsWith('/api/i4u_UT_Interactions/104019/219'),'endpoint carries the party id and ordinal: '+sent.url);
  assert.equal(sent.headers.RequestVerificationToken,'token-123');
  assert.equal(sent.headers['Content-Type'],'application/json');
  const body=JSON.parse(sent.body);
  assert.equal(body.EntityTypeName,'i4u_UT_Interactions');
  assert.equal(body.PrimaryParentEntityTypeName,'Party');
  assert.deepEqual(body.Identity.IdentityElements.$values,['104019','219']);
  assert.deepEqual(body.PrimaryParentIdentity.IdentityElements.$values,['104019']);
  const properties=Object.fromEntries(body.Properties.$values.map(p=>[p.Name,p.Value]));
  assert.equal(properties.ID,'104019');
  assert.deepEqual(properties.Ordinal,{'$type':'System.Int32','$value':219},'the row key repeats as a typed property');
  assert.deepEqual(properties.FollowUpActioned,{'$type':'System.Boolean','$value':true},'booleans need their typed wrapper');
  assert.equal(Object.keys(properties).length,3,'a partial update sends only the key and the changed field');
  await page.waitForFunction(()=>!document.querySelector('[data-row="0"] .us-task').getClientRects().length);
  console.log('PASS: completion PUTs the interaction row and leaves the list');

  // Reopening writes false.
  await page.evaluate(()=>{const t=document.querySelector('[data-row="0"] [data-us-task-toggle]');t.closest('section').style.display='';});
  await page.evaluate(()=>document.querySelector('[data-row="0"] [data-us-task-toggle]').click());
  await page.waitForFunction(()=>window.sent.length===2);
  const reopened=await page.evaluate(()=>JSON.parse(window.sent[1].body));
  assert.deepEqual(Object.fromEntries(reopened.Properties.$values.map(p=>[p.Name,p.Value])).FollowUpActioned,{'$type':'System.Boolean','$value':false});
  console.log('PASS: reopening writes false');

  // A rejected write restores the row exactly as it was and says so.
  await page.evaluate(()=>{window.failNext=true;});
  const before=await row(1).locator('.us-task__date').textContent();
  await toggle(1).click();
  await page.waitForFunction(()=>!!document.querySelector('[data-row="1"] .us-task__save-error'));
  const state=await page.evaluate(()=>{
   const task=document.querySelector('[data-row="1"] .us-task');
   return {visible:task.getClientRects().length>0, completed:task.getAttribute('data-us-task-completed'),
    checked:task.querySelector('[data-us-task-toggle]').getAttribute('aria-checked'),
    complete:task.classList.contains('us-task--complete'),
    date:task.querySelector('.us-task__date').textContent,
    message:task.querySelector('.us-task__save-error').textContent,
    live:task.querySelector('.us-task__save-error').getAttribute('role')};
  });
  assert.equal(state.visible,true,'a task that did not save stays in the list');
  assert.equal(state.completed,'false');
  assert.equal(state.checked,'false');
  assert.equal(state.complete,false);
  assert.equal(state.date,before,'the original date label is restored, not today’s actioned date');
  assert.equal(state.message,'Not saved. Try again.');
  assert.equal(state.live,'status','the failure is announced politely');
  console.log('PASS: a rejected write reverts the row and reports it');

  // No identity means no request: those lists behave exactly as they did before.
  await page.evaluate(()=>{window.failNext=false;window.sent.length=0;});
  await toggle(2).click();
  await page.waitForFunction(()=>!document.querySelector('[data-row="2"] .us-task').getClientRects().length);
  assert.deepEqual(await page.evaluate(()=>window.sent),[],'a row without an interaction identity writes nothing');
  console.log('PASS: rows without an interaction identity stay local');

  assert.deepEqual(errors,[]);
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
