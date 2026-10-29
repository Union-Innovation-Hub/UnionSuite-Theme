// US-ACTIVITY-FEED core columns and client details: details load once per record on first open, every column but the keys, laid out as field groups (22 October 2026), with Retry.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
const folder='$/Test/Activity';
const html=`<form><input type="hidden" id="__RequestVerificationToken" value="fixture-token">
<div class="us-activity-feed" data-us-activity-folder="${folder}" data-us-activity-filter="ID" data-us-activity-value="004821"
  data-us-activity-start="StartDate" data-us-activity-days="0" data-us-activity-today="2026-05-14">
  <ul class="us-activity__sources" hidden>
    <li data-source="interactions" data-query="Interactions" data-details="Interactions Details" data-detail-label="Additional notes" data-type="interaction"></li>
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
  await page.evaluate(folder=>{
   const core={
    Interactions:[{ActivityKey:'I-2',ActivityDate:'2026-05-08T16:20:00',Subject:'',Summary:'Resignation submitted.',Detail:'Effective 30 June 2026.',CreatedBy:'Member portal',Category:'Site Meeting',Priority:'Urgent',RecordUrl:'/record/2',FollowUpRequired:true,FollowUpDate:'2026-05-12T00:00:00',FollowUpNotes:'Confirm the last shift with the ward manager.',FollowUpActioned:false,Pinned:true,Status:'Ignored',StaffName:'Ignored',Outcome:'Ignored'},
     {ActivityKey:'I-1',ActivityDate:'2026-04-01T10:00:00',Subject:'',Summary:'Checked in with the member.',Detail:'',CreatedBy:'J. Patel',Category:'Call',Priority:'',FollowUpRequired:'1',FollowUpDate:'2026-04-10',FollowUpActioned:'1',Pinned:'0',DoNotCall:'yes'},
     {ActivityKey:'I-0',ActivityDate:'2026-03-01T10:00:00',Summary:'Not a task.',FollowUpRequired:false,FollowUpDate:'2026-03-05',FollowUpNotes:'Stale note.'},
     {ActivityKey:'I-00',ActivityDate:'2026-02-01T10:00:00',Summary:'Task without a deadline.',FollowUpRequired:'true',FollowUpDate:null}],
    Meetings:[{ActivityKey:'M-1',ActivityDate:'2026-05-06T17:30:00',Subject:'Branch meeting',Summary:'Claims endorsed.',Detail:'',CreatedBy:'A. Smith',Category:'',Priority:'Normal',FollowUpDate:'2026-05-14T00:00:00'}]
   };
   const details={'I-2':{ActivityKey:'I-2','Additional-Handled by':'Retention team','Additional-WorkbenchID':'RES','Additional-Deadline':'2026-05-22T00:00:00','Additional-Due':'2026-05-12T17:00:00','Additional-Follow up':'','Additional_Booked':false,Helper:'Shown too','Outcome-Result':'Withdrawn','Outcome-Reason (show blank)':null,'Empty-Note':'',ID:'004821',Ordinal:2}};
   window.detailCalls=[];window.failDetails=false;
   window.fetch=async input=>{
    const url=new URL(input,location.href),name=url.searchParams.get('QueryName').slice(folder.length+1);
    let rows;
    if(name.endsWith(' Details')){
     detailCalls.push([name,url.searchParams.get('ID'),url.searchParams.get('ActivityKey'),url.searchParams.get('limit')]);
     if(failDetails)return {ok:false,status:500,json:async()=>({})};
     rows=details[url.searchParams.get('ActivityKey')]?[details[url.searchParams.get('ActivityKey')]]:[];
    }else rows=core[name]||[];
    return {ok:true,status:200,json:async()=>({TotalCount:rows.length,HasNext:false,Items:{$values:rows}})};
   };
  },folder);
  await page.addStyleTag({content:read('Theme/UnionSuite/zUnionSuite.css')});
  await page.addScriptTag({content:read('Theme/UnionSuite/zUnionSuite.js')});
  const card=page.locator('[data-us-activity-id="interactions:I-2"]'),meeting=page.locator('[data-us-activity-id="meetings:M-1"]');
  await card.waitFor();
  const search=page.locator('.us-activity-feed input[type=search]');
  const shown=()=>page.evaluate(()=>[...document.querySelectorAll('.us-activity-feed .us-record')].filter(r=>!r.closest('[data-us-activity-leaving]')).map(r=>r.dataset.usActivityId));

  // The note (Detail) is in every card from the start, hidden until it opens,
  // and search finds a collapsed card by it.
  assert.equal(await card.locator('.us-record__body').last().textContent(),'Effective 30 June 2026.');
  assert.equal(await card.locator('.us-record__detail').getAttribute('hidden'),'');
  // The source's data-detail-label heads the note; no note, no heading.
  assert.equal(await card.locator('.us-record__note:not(.us-record__note--follow-up) > .us-record__note-label').textContent(),'Additional notes');
  assert.equal(await page.locator('[data-us-activity-id="interactions:I-1"] :is(.us-record__note, .us-record__note-label, .us-record__body)').count(),0);
  assert.equal(await meeting.locator('.us-record__note-label').count(),0);
  await search.fill('30 june');
  await page.waitForFunction(()=>!document.querySelector('[data-us-activity-id="meetings:M-1"]')||document.querySelector('[data-us-activity-id="meetings:M-1"]').closest('[data-us-activity-leaving]'));
  assert.deepEqual(await shown(),['interactions:I-2']);
  assert.equal(await card.locator('.us-record__toggle').getAttribute('aria-expanded'),'false','search does not open the card');
  await search.fill('');
  await meeting.waitFor();

  // Collapsed card: core columns only; Status and old aliases are not read.
  assert.equal(await card.locator('.us-record__by').textContent(),'Member portal');
  assert.equal(await card.locator('.us-record__category').textContent(),'Site Meeting');
  assert.equal(await card.locator('.us-record__status').count(),0,'no status badge');
  assert.equal(await card.locator('.us-record__priority').textContent(),'Urgent');
  assert.equal(await meeting.locator('.us-record__category').count(),0,'blank category is left out');

  // Follow-up task badge (overdue, due today, done) and the pinned icon.
  const done=page.locator('[data-us-activity-id="interactions:I-1"]');
  assert.equal(await card.locator('.us-record__follow-up').textContent(),'Overdue 12 May');
  assert.match(await card.locator('.us-record__follow-up').getAttribute('class'),/us-badge--warning/);
  assert.equal(await card.getAttribute('data-us-record-follow-up'),'overdue');
  assert.equal(await meeting.locator('.us-record__follow-up').textContent(),'Follow-up today');
  assert.equal(await done.locator('.us-record__follow-up').textContent(),'Follow-up done');
  assert.equal(await done.locator('.us-record__follow-up').getAttribute('data-us-follow-up'),'done');
  // FollowUpRequired decides: false hides a dated follow-up and its notes;
  // true with no date is an open task with no date.
  const notTask=page.locator('[data-us-activity-id="interactions:I-0"]'),undated=page.locator('[data-us-activity-id="interactions:I-00"]');
  assert.equal(await notTask.locator('.us-record__follow-up').count(),0,'FollowUpRequired false is not a task');
  assert.equal(await notTask.locator('.us-record__note--follow-up').count(),0);
  assert.equal(await undated.locator('.us-record__follow-up').textContent(),'Follow-up');
  assert.equal(await undated.getAttribute('data-us-record-follow-up'),'open');
  // FollowUpNotes: headed "Follow-up", before the record's own note.
  assert.deepEqual(await card.locator('.us-record__note-label').allTextContents(),['Follow-up','Additional notes']);
  assert.equal(await card.locator('.us-record__note--follow-up .us-record__body').textContent(),'Confirm the last shift with the ward manager.');
  assert.equal(await card.locator('.us-record__pin').getAttribute('aria-label'),'Pinned');
  assert.equal(await card.getAttribute('data-us-record-pinned'),'');
  assert.equal(await done.locator('.us-record__pin').count(),0,'Pinned 0 shows no pin');
  assert.equal(await card.locator('.us-record__pin').evaluate(pin=>getComputedStyle(pin).width),'14px');
  assert.equal(await card.locator('.us-record__tags > :first-child').getAttribute('class'),'us-record__pin','pin leads the type line');
  assert.equal(await card.locator('.us-record__card').evaluate(node=>getComputedStyle(node).borderLeftWidth),'3px','pinned accent edge');
  assert.equal(await done.locator('.us-record__card').evaluate(node=>getComputedStyle(node).borderLeftWidth),'1px');

  // Do not call: a labelled red alert icon on the collapsed card.
  assert.equal(await done.locator('.us-record__do-not-call').getAttribute('aria-label'),'Do not call');
  assert.equal(await done.locator('.us-record__tags > :first-child').getAttribute('class'),'us-record__do-not-call','alert leads the type line');
  assert.equal(await done.getAttribute('data-us-record-do-not-call'),'');
  assert.equal(await card.locator('.us-record__do-not-call').count(),0);
  assert.equal(await done.locator('.us-record__do-not-call').evaluate(node=>getComputedStyle(node).width),'15px');
  assert.equal(await meeting.locator('.us-record__priority').count(),0,'Normal priority shows no flag');
  assert.equal(await page.evaluate(()=>detailCalls.length),0,'no details before a card opens');

  // First open: a failure shows Retry and keeps the note and button.
  await page.evaluate(()=>{failDetails=true;});
  await card.locator('.us-record__toggle').click();
  await card.locator('.us-record__extra-retry').waitFor();
  assert.equal(await card.locator('.us-record__body').last().textContent(),'Effective 30 June 2026.');
  assert.equal(await card.locator('.us-record__more a').getAttribute('href'),'/record/2');
  await page.evaluate(()=>{failDetails=false;});
  await card.locator('.us-record__extra-retry').click();
  await card.locator('.us-record__extra .us-field-groups').waitFor();
  assert.equal(await card.locator('.us-record__toggle').getAttribute('aria-expanded'),'true','Retry does not close the card');
  assert.deepEqual(await page.evaluate(()=>detailCalls),[['Interactions Details','004821','I-2','1'],['Interactions Details','004821','I-2','1']]);

  const facts=await card.locator('.us-record__extra dl > div').evaluateAll(groups=>groups.map(g=>g.querySelector('dt').textContent+' = '+g.querySelector('dd').textContent));
  assert.deepEqual(facts,['Handled by = Retention team','Workbench ID = RES','Deadline = 22 May 2026','Due = 12 May 2026','Booked = No','Helper = Shown too','Result = Withdrawn','Reason = '],'every column but the keys; a blank is left out unless (show blank)');
  assert.equal(await card.locator('.us-record__extra dd:empty').evaluate(node=>getComputedStyle(node,'::before').content),'"—"','a (show blank) column shows a dash');
  assert.deepEqual(await card.locator('.us-record__extra .us-field-groups__heading').allTextContents(),['Outcome'],'Group-Label columns are grouped; Additional-* has no heading; a group of blanks goes');
  assert.equal(await card.locator('.us-record__extra .us-field-groups__heading').evaluate(node=>node.tagName),'H4','headed under the card title');

  // Reopening uses the loaded details.
  await card.locator('.us-record__toggle').click();
  await page.waitForTimeout(300);
  await card.locator('.us-record__toggle').click();
  await page.waitForTimeout(300);
  assert.equal(await page.evaluate(()=>detailCalls.length),2,'no request on reopening');

  // A source without data-details opens to its note and makes no request.
  await meeting.locator('.us-record__toggle').click();
  await page.waitForTimeout(300);
  assert.equal(await meeting.locator('.us-record__extra').getAttribute('hidden'),'');
  assert.equal(await page.evaluate(()=>detailCalls.length),2);

  // Slimline search: the date range's height.
  const height=selector=>page.locator(selector).evaluate(node=>node.getBoundingClientRect().height);
  assert.equal(await height('.us-activity__search'),await height('.us-activity__range'));

  // Pinned only: a toggle in the search field while Interactions is chosen.
  const toggle=page.locator('.us-activity__pinned'),tab=type=>page.locator(`button[data-us-tab="${type}"]`).click();
  assert.equal(await toggle.isHidden(),true,'no pin toggle on All');
  await tab('interaction');
  await toggle.waitFor();
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-pressed'),'true');
  await page.waitForFunction(()=>[...document.querySelectorAll('.us-activity-feed .us-record')].filter(r=>!r.closest('[data-us-activity-leaving]')).length===1);
  assert.deepEqual(await shown(),['interactions:I-2']);
  assert.equal(await page.locator('.us-activity__status').textContent(),'Showing 1 pinned · all time');
  await tab('all');
  await page.waitForTimeout(300);
  assert.equal(await toggle.isHidden(),true);
  await tab('interaction');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false','changing type turns pinned only off');
  await tab('all');
  await meeting.waitFor();

  // Follow-up notes are searchable while the card is collapsed.
  // Waits on the settled list, as cleared search re-adds cards gradually.
  const settled=count=>page.waitForFunction(count=>[...document.querySelectorAll('.us-activity-feed .us-record')].filter(r=>!r.closest('[data-us-activity-leaving]')).length===count,count);
  await search.fill('ward manager');
  await settled(1);
  assert.deepEqual(await shown(),['interactions:I-2']);
  await search.fill('');
  await settled(5);

  // Flags are searchable by their wording.
  await search.fill('do not call');
  await page.waitForFunction(()=>!document.querySelector('[data-us-activity-id="meetings:M-1"]')||document.querySelector('[data-us-activity-id="meetings:M-1"]').closest('[data-us-activity-leaving]'));
  assert.deepEqual(await shown(),['interactions:I-1']);
  await search.fill('');
  await meeting.waitFor();

  // Search covers loaded details.
  await search.fill('retention team');
  await page.waitForFunction(()=>!document.querySelector('[data-us-activity-id="meetings:M-1"]')||document.querySelector('[data-us-activity-id="meetings:M-1"]').closest('[data-us-activity-leaving]'));
  assert.equal(await card.count(),1);

  assert.deepEqual(errors,[]);
  console.log('PASS activity core columns (category, follow-up badge and notes gated by FollowUpRequired, pinned icon, do-not-call alert, no status), slimline search, pinned-only toggle on Interactions, note in every card (labelled when the source asks, unlabelled and absent when blank) and searchable while collapsed, details on first open (ID + ActivityKey, once), every details column but the keys, laid out as field groups (Group-Label headings, Additional-* unheaded, blanks hidden unless (show blank)), Retry, no-details source and search over loaded details.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
