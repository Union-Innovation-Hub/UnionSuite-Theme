// Exercises the shared production controller with simulated GET /api/query responses.
const fs=require('node:fs'),assert=require('node:assert/strict'),example=require('../Theme/UnionSuite-Guides/usage/build/membership-stats-example.cjs');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8'),css=fs.readFileSync('Theme/UnionSuite/zUnionSuite.css','utf8');
const snapshot=JSON.parse(fs.readFileSync('Theme/UnionSuite-Guides/usage/templates/Home/Stats/captured-data.json','utf8').replace(/^\uFEFF/,''));
const runtime=example.runtime(source),card=example.card;
const clone=()=>structuredClone(snapshot);
const all=['summary','financial','groups','categories'].map(card).join('');
const wrap=html=>'<div class="ContentItemContainer"><div class="author-wrapper"><div class="panel"><div class="panel-body">'+html+'</div></div></div></div>';
const wait=async(page,type='summary',state='ready')=>page.waitForFunction(({type,state})=>document.querySelector('[data-us-membership="'+type+'"]').dataset.usMembershipState===state,{type,state});
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});let passed=0;
 try{
  async function setup(markup=all,data=clone(),mode={}){
   const page=await browser.newPage({viewport:{width:1440,height:2700}}),calls=[],errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   const documentHtml=body=>`<!doctype html><html><head><meta charset="utf-8"><style>${css}body{margin:0;padding:10px}.us-membership{margin-bottom:8px}</style></head><body><input name="__RequestVerificationToken" value="test-only-token" type="hidden">${body}<script>${runtime}</script></body></html>`;
   await page.route('https://imis.test/**',async route=>{
    const req=route.request(),u=new URL(req.url());
    if(!u.pathname.endsWith('/api/query'))return route.fulfill({contentType:'text/html',body:documentHtml(u.pathname==='/frame'?all:markup)});
    assert.equal(req.method(),'GET');assert.equal(req.headers().requestverificationtoken,'test-only-token');
    const name=u.searchParams.get('QueryName');assert(name.startsWith(snapshot.folder+'/'));
    const query=Object.values(data.queries).find(q=>name===data.folder+'/'+q.name);
    assert(query,'known query: '+name);let period='current';
    if(query.previous){period=Object.keys(data.periods).find(k=>data.periods[k].start===u.searchParams.get('StartDate')&&data.periods[k].end===u.searchParams.get('EndDate'));assert(period,'named inclusive/exclusive date filters');}
    const offset=Number(u.searchParams.get('offset'));calls.push({name:query.name,period,offset});
    const rows=structuredClone(query[period]);
    if(mode.delay)await new Promise(resolve=>setTimeout(resolve,mode.delay));
    if(mode.fail===query.name)return route.fulfill({status:403,json:{Message:'Forbidden'}});
    const batch=rows.slice(offset,offset+100);
    const items=mode.typed?batch.map(row=>({Properties:{$values:Object.entries(row).map(([Name,Value])=>({Name,Value:{$value:Value}}))}})):batch;
    const result={Items:mode.typed?{$values:items}:items,TotalCount:rows.length,HasNext:offset+100<rows.length,NextOffset:Math.min(offset+100,rows.length)};
    if(mode.incomplete)result.HasNext=false;
    await route.fulfill({json:result});
   });
   await page.goto('https://imis.test/');return {page,calls,errors,data,mode};
  }
  async function finish(t,label){assert.deepEqual(t.errors,[]);await t.page.close();console.log('PASS '+label);passed++;}
  {
   const t=await setup('<div id="host" hidden>'+all+'</div>');await t.page.waitForTimeout(220);assert.equal(t.calls.length,0);
   await t.page.locator('#host').evaluate(n=>n.hidden=false);await wait(t.page,'categories');await wait(t.page,'groups');await wait(t.page);
   assert.equal(t.calls.length,8);assert.equal(new Set(t.calls.map(c=>JSON.stringify(c))).size,8);
   await t.page.locator('#host').evaluate(n=>n.hidden=true);await t.page.locator('#host').evaluate(n=>n.hidden=false);await t.page.waitForTimeout(100);assert.equal(t.calls.length,8);
   await finish(t,'hidden tabs wait, shared queries, retained data on revisit');
  }
  {
   const t=await setup(all,clone(),{typed:true});await wait(t.page,'financial');await wait(t.page,'groups');await wait(t.page,'categories');
   assert.equal(await t.page.locator('.us-membership__legend dt').last().innerText(),'(empty)');
   assert.deepEqual(await t.page.locator('[data-us-membership="groups"] tfoot td').allTextContents(),['83,084','8','1','+7']);
   await finish(t,'typed dynamic collections and all captured breakdowns reconcile');
  }
  {
   const data=clone();data.queries.group.current=Array.from({length:101},(_,i)=>({GroupCode:'Group '+i,MemberCount:i===0?82984:1}));
   const t=await setup(card('groups'),data);await wait(t.page,'groups');assert(t.calls.some(c=>c.offset===100));
   assert.equal(await t.page.locator('tbody tr').count(),103,'event-only groups retained');
   await finish(t,'multiple pages and joins/resignations in groups without current members');
  }
  {
   const data=clone();data.queries.category.current=Array.from({length:101},(_,i)=>({CategoryCode:'Type '+i,MemberCount:i===0?82984:1}));
   const t=await setup(card('categories'),data,{incomplete:true});await wait(t.page,'categories','error');assert.equal(await t.page.locator('.us-membership__bars').count(),0);
   await finish(t,'incomplete pagination does not display partial totals');
  }
  for(const invalid of ['negative','duplicate','mismatch']){
   const data=clone();if(invalid==='negative')data.queries.financial.current[0].MemberCount=-1;
   if(invalid==='duplicate')data.queries.financial.current.push({...data.queries.financial.current[1]});
   if(invalid==='mismatch')data.queries.financial.current[0].MemberCount++;
   const t=await setup(card('summary')+card('financial'),data);await wait(t.page,'financial','error');await wait(t.page,'summary','error');
   assert.deepEqual(await t.page.locator('.us-membership__metric > strong').allTextContents(),['83,084','—','8','1']);
   await finish(t,invalid+' counts show unavailable while valid trackers remain');
  }
  {
   const data=clone();data.queries.financial.current[0].MemberCount=20614;data.queries.financial.current.push({FinancialStatusCode:'  ',MemberCount:1},{MemberCount:1});
   data.queries.category.current[0].CategoryCode='<img src=x onerror=alert(1)>';
   const t=await setup(all,data);await wait(t.page,'financial');await wait(t.page,'categories');
   assert.equal(await t.page.locator('.us-membership__legend dd').last().innerText(),'20,616');
   assert.equal(await t.page.locator('.us-membership__bars img').count(),0);assert((await t.page.locator('.us-membership__bars').innerText()).includes('<img'));
   await finish(t,'blank buckets coalesce and server labels render as plain text');
  }
  {
   const data=clone();data.queries.joined.previous=[];data.queries.resigned.previous=[];
   const t=await setup(card('summary'),data);await wait(t.page);assert.equal(await t.page.getByText('(previously 0)',{exact:false}).count(),2);
   assert(!(await t.page.locator('.us-membership__content').innerText()).match(/Infinity|NaN/));
   await finish(t,'zero previous counts have no undefined percentages');
  }
  {
   const t=await setup(all,clone(),{fail:'Members Joined'});await wait(t.page,'summary','error');await wait(t.page,'categories');await wait(t.page,'financial');await wait(t.page,'groups','error');
   t.mode.fail=null;const retry=t.page.locator('[data-us-membership="summary"] .us-membership__retry');await retry.focus();await retry.click();await wait(t.page);await wait(t.page,'groups');await wait(t.page,'categories');await wait(t.page,'financial');
   assert.equal(t.calls.length,16,'retry reloads shared folder once');assert.equal(await t.page.locator('.us-membership__metric > strong').nth(2).innerText(),'8');
   assert(await t.page.locator('[data-us-membership="summary"] > .us-membership__content').evaluate(n=>n===document.activeElement));
   await finish(t,'query access failure and shared-folder Retry with keyboard focus');
  }
  {
   const direct='<div class="ContentItemContainer">'+card('summary')+'</div>',empty='<div class="ContentItemContainer"><div>'+card('financial')+'</div></div>';
   const t=await setup(direct+empty+wrap(card('groups'))+'<div class="us-report-no-styling">'+card('categories')+'</div>');await wait(t.page,'groups');await wait(t.page);
   assert(!t.calls.some(c=>c.name==='Member Counts by Category'));assert.equal(await t.page.locator('.panel [data-us-panel]').count(),0);assert.equal(await t.page.locator('.author-wrapper').getAttribute('class'),'author-wrapper');
   await t.page.locator('.us-report-no-styling').evaluate(n=>n.classList.remove('us-report-no-styling'));await wait(t.page,'categories');
   await finish(t,'direct, empty, wrapped, nested markup and opt-out without changing outer panels');
  }
  {
   const t=await setup(card('summary'),clone(),{delay:300});await t.page.waitForFunction(()=>document.querySelector('[aria-busy="true"]'));
   assert.equal(await t.page.locator('.section-loader-spinning-circles').count(),1);
   await t.page.locator('[data-us-membership="summary"]').evaluate((n,html)=>n.outerHTML=html,card('categories'));await wait(t.page,'categories');await t.page.waitForTimeout(350);
   assert.equal(await t.page.locator('.us-membership__metrics').count(),0);assert.equal(await t.page.locator('.us-membership__bars').count(),1);
   await t.page.locator('.us-membership__status').evaluate(n=>n.outerHTML='<p class="us-membership__status" role="status"></p>');await wait(t.page,'categories');
   assert.equal(t.calls.length,7,'partial replacement reuses pending datasets');
   await finish(t,'theme spinner and partial replacement discard stale rendering');
  }
  {
   const t=await setup('<div id="frame-host" style="visibility:hidden"><iframe src="/frame" style="width:100%;height:2200px;border:0"></iframe></div>');
   await t.page.waitForTimeout(300);assert.equal(t.calls.length,0);
   await t.page.locator('#frame-host').evaluate(n=>n.style.visibility='visible');
   const frame=t.page.frames().find(f=>f.url().endsWith('/frame'));await wait(frame);await wait(frame,'groups');assert.equal(t.calls.length,8);
   await finish(t,'embedded cards wait for a delayed parent-tab reveal');
  }
  console.log('Passed '+passed+' membership controller scenarios.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
