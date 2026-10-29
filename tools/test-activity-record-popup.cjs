// US-ACTIVITY-FEED data-record-popup: View full details opens the native popup for a source that asks for it,
// and otherwise (no attribute, no popup service, another site) the link navigates as usual.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
const folder='$/Test/Activity';
const preview='/iParts/Common/InteractionLog/InteractionPreview.aspx?CommunicationLogId=aaa&PartyId=004821&RecipientId=bbb';
const html=`<form><input type="hidden" id="__RequestVerificationToken" value="fixture-token">
<div class="us-activity-feed" data-us-activity-folder="${folder}" data-us-activity-filter="ID" data-us-activity-value="004821"
  data-us-activity-start="StartDate" data-us-activity-days="0" data-us-activity-today="2026-05-14">
  <ul class="us-activity__sources" hidden>
    <li data-source="emails-out" data-query="Outbound Emails" data-type="email" data-direction="out" data-record-popup="true"></li>
    <li data-source="meetings" data-query="Meetings" data-type="meeting"></li>
  </ul>
</div></form>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1100,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://theme.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://theme.test/Party.aspx?ID=004821');
  await page.evaluate(([folder,preview])=>{
   const core={
    'Outbound Emails':[
     {ActivityKey:'E-1',ActivityDate:'2026-05-10T08:00:00',Subject:'Test Email',Summary:'',Detail:'',CreatedBy:'James Driscoll',Priority:'',RecordUrl:preview},
     {ActivityKey:'E-2',ActivityDate:'2026-05-09T08:00:00',Subject:'Other site',Summary:'',Detail:'',CreatedBy:'System',Priority:'',RecordUrl:'https://other.example/view'},
     {ActivityKey:'E-3',ActivityDate:'2026-05-08T08:00:00',Subject:'With fragment',Summary:'',Detail:'',CreatedBy:'System',Priority:'',RecordUrl:'/record/e3#section'}],
    Meetings:[{ActivityKey:'M-1',ActivityDate:'2026-05-06T17:30:00',Subject:'Branch meeting',Summary:'Claims endorsed.',Detail:'',CreatedBy:'A. Smith',Priority:'',RecordUrl:'/record/m1'}]
   };
   window.fetch=async input=>{
    const name=new URL(input,location.href).searchParams.get('QueryName').slice(folder.length+1),rows=core[name]||[];
    return {ok:true,status:200,json:async()=>({TotalCount:rows.length,HasNext:false,Items:{$values:rows}})};
   };
   window.dialogCalls=[];
   window.ShowDialog_NoReturnValue=(...args)=>window.dialogCalls.push(args);
   // Runs after the feed's own handler, so it sees whether the link was left to navigate; it then stops the navigation.
   window.clicks=[];
   document.addEventListener('click',event=>{
    if(event.target.closest('.us-record__more a')){window.clicks.push(event.defaultPrevented);event.preventDefault();}
   });
  },[folder,preview]);
  await page.addStyleTag({content:read('Theme/UnionSuite/zUnionSuite.css')});
  await page.addScriptTag({content:read('Theme/UnionSuite/zUnionSuite.js')});

  const open=async id=>{
   const card=page.locator(`[data-us-activity-id="${id}"]`);
   await card.waitFor();
   if(await card.locator('.us-record__toggle').getAttribute('aria-expanded')!=='true')await card.locator('.us-record__toggle').click();
   return card.locator('.us-record__more a');
  };
  const reset=()=>page.evaluate(()=>{window.dialogCalls.length=0;window.clicks.length=0;});

  // A source with data-record-popup opens the record in the native popup.
  const link=await open('emails-out:E-1');
  assert.equal(await link.getAttribute('aria-haspopup'),'dialog');
  await link.click();
  const calls=await page.evaluate(()=>window.dialogCalls);
  assert.equal(calls.length,1,'one popup opened');
  assert.equal(calls[0][0],'https://theme.test'+preview,'absolute record URL');
  assert.equal(calls[0][1],null);
  assert.deepEqual(calls[0].slice(2,5),['80%','80%','Test Email'],'size and the subject as title');
  assert.equal(calls[0][6],'E','native template type');
  assert.match(calls[0][8],/^UnionSuite-activity-record-\d+$/,'unique window name');
  assert.deepEqual(await page.evaluate(()=>window.clicks),[true],'the link did not navigate');

  // Each open gets its own window name.
  await link.click();
  const names=await page.evaluate(()=>window.dialogCalls.map(call=>call[8]));
  assert.equal(new Set(names).size,2,'window names differ per open');

  // Another site, or a URL with a fragment, is left to navigate normally.
  await reset();
  await (await open('emails-out:E-2')).click();
  await (await open('emails-out:E-3')).click();
  assert.equal(await page.evaluate(()=>window.dialogCalls.length),0,'no popup for another site or a fragment');
  assert.deepEqual(await page.evaluate(()=>window.clicks),[false,false],'links navigate');

  // A source without the attribute navigates normally.
  await reset();
  const plain=await open('meetings:M-1');
  assert.equal(await plain.getAttribute('aria-haspopup'),null);
  await plain.click();
  assert.equal(await page.evaluate(()=>window.dialogCalls.length),0);
  assert.deepEqual(await page.evaluate(()=>window.clicks),[false],'a source without data-record-popup navigates');

  // Without the native popup service the popup source falls back to the link.
  await reset();
  await page.evaluate(()=>{delete window.ShowDialog_NoReturnValue;});
  await link.click();
  assert.deepEqual(await page.evaluate(()=>window.clicks),[false],'falls back to navigation');

  // A popup service that throws also falls back, and reports the error.
  await reset();
  await page.evaluate(()=>{window.ShowDialog_NoReturnValue=()=>{throw new Error('boom');};});
  await link.click();
  assert.deepEqual(await page.evaluate(()=>window.clicks),[false],'a failing popup falls back to navigation');

  assert.deepEqual(errors.filter(message=>message!=='boom'),[],'no page errors');
  console.log('PASS activity record popup: opens the native popup (80% x 80%, subject as title, unique window name) for a data-record-popup source; plain, other-site, fragment, no-service and failing-service cases navigate normally.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
