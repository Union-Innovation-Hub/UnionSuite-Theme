// Local homepage composition. Production component styles/behaviour are embedded from their sources.
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const membership = require('../Theme/UnionSuite-Guides/usage/build/membership-stats-example.cjs');
const read = file => fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n');
const esc = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const chevron = '<svg class="home-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
const previewDate = '2026-09-12';
const tasks = [
  {id:'task-1',title:'Follow up on missing application details',member:'Sarah Mitchell',memberId:'104582',due:'2 days overdue',when:'overdue',note:'Call Sarah to confirm her workplace and employment details so her membership application can progress.'},
  {id:'task-2',title:'Return call about membership fees',member:'Daniel Chen',memberId:'103917',due:'1 day overdue',when:'overdue',note:'Daniel has asked for a call to discuss which membership rate applies to his current working hours.'},
  {id:'task-3',title:'Confirm updated payment details',member:'Rebecca Wilson',memberId:'102846',due:'Today',when:'today',note:'Confirm that Rebecca’s new payment details have been received and update the follow-up note.'},
  {id:'task-4',title:'Send membership confirmation',member:'Michael Roberts',memberId:'104601',due:'Today',when:'today',note:'Send Michael his membership confirmation and check that his preferred email address is correct.'},
  {id:'task-5',title:'Check workplace transfer details',member:'Emma Thompson',memberId:'101293',due:'Mon, 14 Sep',when:'upcoming',note:'Confirm Emma’s new workplace and the effective date of her transfer.'},
  {id:'task-6',title:'Update preferred contact details',member:'Alex Morgan',memberId:'103288',due:'2 days overdue',when:'overdue',done:true,completedOn:'2026-09-10',note:'Preferred phone number confirmed and updated.'},
  {id:'task-7',title:'Send membership statement',member:'Jamie Collins',memberId:'102519',due:'5 days overdue',when:'overdue',done:true,completedOn:'2026-09-07',note:'Membership statement sent to the member’s preferred email.'}
];
const queues = {
  applications:{title:'Applications awaiting review',records:[['Sarah Mitchell','Workplace details required'],['Olivia Taylor','Ready for membership review'],['Noah Anderson','Employment details to confirm']]},
  payments:{title:'Failed payments to follow up',records:[['Rebecca Wilson','Updated payment details received'],['Liam Harris','Member follow-up required'],['Chloe Martin','Member follow-up required'],['Ethan Walker','Payment details to confirm']]},
  resignations:{title:'Resignations ready to process',records:[['Grace Lewis','Requested end date: 30 September'],['Lucas White','Requested end date: 30 September']]}
};
// Current live-home screenshot: retain the larger sample set only as historical source above.
tasks.splice(0,tasks.length,
 {id:'task-1',title:'N',member:'Hub TestLastName',memberId:'',due:'',when:'upcoming',note:'Sample task from the supplied homepage screenshot.'},
 {id:'task-2',title:'IP',member:'Hub TestLastName',memberId:'',due:'17/09/2026',when:'upcoming',note:'Sample task from the supplied homepage screenshot.'});
const taskRow = task => `<section class="home-task-item" data-task-row="${task.id}"><div class="QueryTemplateItem"><div class="home-task-row" data-us-task-completed="false"><button type="button" class="home-task-check" role="checkbox" aria-checked="false" aria-label="Complete task: ${esc(task.title)}" title="Mark complete" data-task-toggle="${task.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button><button type="button" class="home-task-open" data-task="${task.id}"><span class="home-task-copy"><strong>${esc(task.title)}</strong><span>${esc(task.member)} · ${esc(task.memberId)}</span></span><span class="home-task-due is-${task.when}">${esc(task.due)}</span>${chevron}</button></div></div></section>`;
const records = [
  {title:'Updated Membership Fees',body:'<p>Our membership fees have been updated. Please find the latest fee schedule below.</p><p><a href="#preview-fees">Latest Membership Fees</a></p>'},
  {title:'New Policy',body:'<p>Starting from today, employees are not to bring pet snakes into the office.</p>'},
  {title:'New Staff',body:'<p>Please welcome our newest staff members!</p><p>Raphael Chambers<br>Heinrich Reimer<br>Milton Chiu</p>'},
  {title:'Staff Training Morning',body:'<p>Join the team on Tuesday, 15 September at 10 am for a refresher on membership enquiries and case handovers.</p><p>The session will be held in the main meeting room.</p>'},
  {title:'Office Maintenance',body:'<p>The kitchen will be unavailable from 8 to 10 am on Friday, 18 September while the new equipment is installed.</p><p>Please use the kitchenette on level two during this time.</p>'}
];
const bulletinTemplate = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Query-Template.html');
records.splice(3);
const items = records.map((record,i) => {
  const content = bulletinTemplate.replaceAll('{#query.DocumentName}',esc(record.title)).replaceAll('{#query.FirstName}','Peter').replaceAll('{#query.LastName}','Williams').replaceAll('{#query.CreatedOn}','12/05/2025').replaceAll('{#query.DocumentBody noencode}',record.body);
  return `<section data-item="home-bulletin-${i}" class="mb-3"><div class="card QueryTemplateItem"><div class="card-body">${content}</div></div></section>`;
}).join('\n');
const bulletin = `<div class="iMIS-WebPart"><div class="ContentItemContainer"><div class="us-staff-bulletin us-action-home-manage-bulletin"><div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Staff Bulletin</h2></div><div class="panel-body-container home-scroll-frame"><div class="panel-body home-scroll-area" tabindex="0" role="region" aria-label="Staff Bulletin posts"><div class="QueryTemplateSet simplePaginateList">${items}</div></div></div></div></div></div></div>`;
const source = read('Theme/UnionSuite/zUnionSuite.js');
const actions = source.split('/* US-BANNER-BEHAVIOUR:START */')[0]+'\n'+read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
const actionIcons = source.match(/\/\* US-ACTION-ICONS:START[\s\S]*?US-ACTION-ICONS:END \*\//)[0];
const attention = source.match(/\/\* US-ATTENTION:START[\s\S]*?US-ATTENTION:END \*\//)[0];
const sections = source.match(/\/\* US-SECTION-SWITCHER:START[\s\S]*?US-SECTION-SWITCHER:END \*\//)[0];
const native = (read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css')+'\n'+read('Theme/UnionSuite/99-Orion.css')).replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
const html = read('prototypes/legacy/Home/Home-Preview.html').replace('{{WELCOME}}',read('Theme/UnionSuite-Guides/usage/templates/Home/Welcome-Content.html').trim()).replace('{{ATTENTION}}',read('Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html').trim()).replaceAll('{{CHEVRON}}',chevron).replace('{{TASKS}}',tasks.filter(task=>!task.done).map(taskRow).join('')).replace('{{BULLETIN}}',bulletin).replace('{{STATS}}',membership.composition());
const js = sections+'\n'+read('prototypes/legacy/Home/home-preview.js').replace('{{TASK_DATA}}',JSON.stringify(tasks)).replace('{{PREVIEW_DATE}}',previewDate).replace('{{QUEUE_DATA}}',JSON.stringify(queues)).replaceAll('{{CHEVRON}}',chevron);
const output = `<!doctype html>\n<!-- Generated by tools/build-home-preview.cjs. Edit prototypes/Home/ sources. -->\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Home — UnionSuite layout prototype</title><meta name="description" content="Local membership CRM homepage prototype: needs attention, my tasks and staff bulletin."><style>${native}\n${read('Theme/UnionSuite/zUnionSuite.css')}\n${read('Theme/UnionSuite-Client/Branding.css')}\n${read('prototypes/legacy/Home/home-layout.css')}
${read('Theme/UnionSuite-Guides/usage/examples/Home/home-stats.css')}</style></head><body class="home-preview" data-attention-example-count="3">${html}<script>${read('Theme/UnionSuite-Guides/usage/source/attention-example.js')}\n${actions}\n${actionIcons}\n${attention}\n${js}
${membership.fixture()}\n${membership.runtime(source)}</script></body></html>`;
const file = path.join(root,'references/Home-Preview.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file,'utf8') !== output) throw Error('Home preview is stale. Run node tools/build-home-preview.cjs.');
  console.log('Home preview is current.');
} else {fs.writeFileSync(file,output);console.log('Built references/Home-Preview.html.');}
