// Reference-only configuration and fictional records. No live query execution.
const fields = require('./query-field-definitions.cjs');
const notes = [
  {NoteTitle:'Renewal options discussed',AuthorName:'James',CreatedOn:'11 September 2026 · 10:15 am',NoteBody:'Alex called about renewing their membership. Sent the current fee schedule and agreed to follow up next week.',ContactMethod:'Phone call'},
  {NoteTitle:'Contact details confirmed',AuthorName:'Sam Taylor',CreatedOn:'9 September 2026 · 2:30 pm',NoteBody:'Confirmed the preferred email address with the member.',ContactMethod:'Email'}
];
module.exports = [
  {
    id:'bulletin',title:'Staff bulletin',panelTitle:'Staff Bulletin',
    description:'Approved accent edge and soft hover treatment, using your existing BulletinCard content.',
    file:'Bulletin-Query-Template.html',classes:'us-query-template us-staff-bulletin',rows:3,
    query:'Keep your existing Staff Bulletin source query.',
    order:'Use the query’s publication/visibility filters; newest CreatedOn first.',
    fields:fields['Bulletin-Query-Template.html'],
    mapping:'These are the exact substitutions from your supplied Staff Bulletin template.',
    optional:'DocumentBody already contains HTML. Keep the div around it so its paragraphs are not nested inside another paragraph. Keep optional whole-list text in the iPart Header and Footer fields.',
    empty:'No staff announcements to show.',
    records:[
      {DocumentName:'Updated Membership Fees',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>Our membership fees have been updated. Please find the latest fee schedule below.</p><p><a href="#example">Latest Membership Fees</a></p>'},
      {DocumentName:'New Policy',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>The updated workplace policy is available in the staff handbook.</p>'},
      {DocumentName:'New Staff',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>Please welcome our newest staff members!</p><p>Raphael Chambers<br>Heinrich Reimer<br>Milton Chiu</p>'}
    ]
  },
  {
    id:'bulletin-linked',title:'Staff bulletin with optional card links',panelTitle:'Staff Bulletin',
    description:'The same styling with real card links. A blank AlertUrl leaves New Staff non-clickable.',
    file:'Bulletin-Linked-Query-Template.html',classes:'us-query-template us-staff-bulletin',rows:3,
    query:'Keep your Staff Bulletin query and add an output alias named AlertUrl for the optional destination.',
    order:'Keep the query’s publication/visibility filters; newest CreatedOn first.',
    fields:fields['Bulletin-Linked-Query-Template.html'],
    mapping:'DocumentName, FirstName, LastName, CreatedOn and DocumentBody are your supplied substitutions. AlertUrl is a new suggested query output alias, not an existing iMIS field. Map the actual URL field or expression in your query to this alias before using this template.',
    optional:'Use https:// or http:// URLs, a site path starting with one slash, or a nonempty #anchor. Blank, unresolved and unsupported URL formats hide the entire Read more link, divider and arrow; the card has no extra click target or tab stop. Keep the URL encoded, not noencode, and validate destinations in the source query. The label can be edited in the template. Links inside DocumentBody still open their own destinations. For cards without this feature, use the basic bulletin template, which needs no additional query field. No production JavaScript is required.',
    empty:'No staff announcements to show.',
    records:[
      {DocumentName:'Updated Membership Fees',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>Our membership fees have been updated. Please find the latest fee schedule below.</p><p><a href="#example">Latest Membership Fees</a></p>',AlertUrl:'#example-announcement'},
      {DocumentName:'New Policy',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>Starting from today, employees are not to bring pet snakes into the office.</p>',AlertUrl:'#example-policy'},
      {DocumentName:'New Staff',FirstName:'Peter',LastName:'Williams',CreatedOn:'12/05/2025',DocumentBody:'<p>Please welcome our newest staff members!</p><p>Raphael Chambers<br>Heinrich Reimer<br>Milton Chiu</p>',AlertUrl:''}
    ]
  },
  {
    id:'bulletin-system-alerts',title:'Staff bulletin from System Alerts',panelTitle:'Staff Bulletin',
    description:'Posts from the i4u_UT_SystemAlerts table, the same rows that feed system alerts. A Link makes the card clickable; without one the card stays plain.',
    file:'Bulletin-SystemAlerts-Query-Template.html',classes:'us-query-template us-staff-bulletin',rows:3,
    query:'An IQA on the i4u_UT_SystemAlerts business object, selecting StartDate, Alert, Link and LinkText.',
    order:'Filters: Bulletin equals true, StartDate is less than or equal to @Date, and EndDate is greater than or equal to @Date, so a post shows from its start date to its end date inclusive. Give every post both dates (a far-off EndDate for an open-ended one): a blank date fails its filter. Sort by StartDate, newest first.',
    fields:fields['Bulletin-SystemAlerts-Query-Template.html'],
    mapping:'StartDate, Alert, Link and LinkText are the table’s own properties, so their names need no aliases. Bulletin, EndDate and SitewideAlert are filters only; CreatedOn, UpdatedOn and Ordinal are not used.',
    optional:'Leave Link blank for a plain card: the footer link, divider, arrow and whole-card click target are all hidden. A blank LinkText reads Read more, supplied by zUnionSuite.css, so the query needs no expression for it. Keep Link encoded, not noencode. Links inside Alert still open their own destinations. The table has no title or author, so the card leads with its date; an Alert can start with its own heading if a post needs one. No production JavaScript is required.',
    empty:'No staff announcements to show.',
    records:[
      {StartDate:'12/10/2026',Alert:'<p>Our membership fees have been updated. The latest fee schedule is available now.</p>',Link:'#example-announcement',LinkText:'Latest membership fees'},
      {StartDate:'08/10/2026',Alert:'<p>Starting from today, employees are not to bring pet snakes into the office.</p>',Link:'#example-policy',LinkText:''},
      {StartDate:'01/10/2026',Alert:'<p>Please welcome our newest staff members!</p><p>Raphael Chambers<br>Heinrich Reimer<br>Milton Chiu</p>',Link:'',LinkText:''}
    ]
  },
  {
    id:'notes',title:'Member notes',panelTitle:'Member Notes',
    description:'The same card shell with a note title, author, date and contact method.',
    file:'Member-Notes-Query-Template.html',classes:'us-query-template',rows:5,
    query:'Use your member-notes query, filtered to the current member.',order:'Newest CreatedOn first.',
    fields:fields['Member-Notes-Query-Template.html'],
    optional:'ContactMethod and the entire us-list__footer block are optional. Remove both if the query does not supply a contact method. NoteBody is encoded plain text.',
    empty:'No notes recorded for this member.',records:notes
  },
  {
    id:'tasks',title:'Outstanding tasks',panelTitle:'My Outstanding Tasks',
    description:'Homepage-style rows with a separate checkbox, task title, member and due date. Checkbox changes are local only.',
    cards:false,
    file:'Tasks-Query-Template.html',classes:'us-query-template us-list--rows us-list--compact',rows:5,
    query:'Use your tasks query, filtered to the current staff member and outstanding tasks.',order:'Earliest DueDate first; decide where undated tasks belong in your query.',
    fields:fields['Tasks-Query-Template.html'],
    optional:'Load updated shared CSS and JS. The separate checkbox toggles locally and animates on completion; no API writes occur. This outstanding-only template has a fixed false initial flag. Use the completion template when the query also returns completed tasks.',
    empty:'No outstanding tasks. You’re up to date.',
    records:[
      {TaskTitle:'Call Alex about renewal',MemberName:'Alex Morgan',DueDate:'10 September 2026',Status:'Overdue',TaskNote:'Discuss the membership options sent earlier this week.'},
      {TaskTitle:'Confirm updated workplace details',MemberName:'Jordan Lee',DueDate:'11 September 2026',Status:'Due today',TaskNote:'Confirm the new workplace address with the member.'},
      {TaskTitle:'Follow up membership application',MemberName:'Taylor Smith',DueDate:'14 September 2026',Status:'Upcoming',TaskNote:'Check whether the remaining application details are ready.'}
    ]
  },
  {
    id:'history',title:'Recent history',panelTitle:'Recent History',
    description:'Compact cards on a decorative timeline. The query supplies the records and their order.',
    file:'Recent-History-Query-Template.html',classes:'us-query-template us-list--timeline us-list--compact',rows:5,
    query:'Use an existing history query, filtered to the current member or record.',order:'Newest ActivityDate first.',
    fields:fields['Recent-History-Query-Template.html'],
    optional:'ActivityDetail and its us-list__body block are optional. The template does not combine separate activity sources into a new feed.',
    empty:'No recent history to show.',
    records:[
      {ActivityTitle:'Membership renewed',AuthorName:'James',ActivityDate:'11 September 2026 · 9:40 am',ActivityDetail:'Membership extended to 30 September 2027.'},
      {ActivityTitle:'Renewal email sent',AuthorName:'Member Services',ActivityDate:'10 September 2026 · 2:20 pm',ActivityDetail:'The renewal reminder was sent to the member’s preferred email.'},
      {ActivityTitle:'Phone number updated',AuthorName:'Sam Taylor',ActivityDate:'9 September 2026 · 11:05 am',ActivityDetail:'The preferred contact number was updated.'}
    ]
  },
  {
    id:'no-shell',title:'Without the card shell',panelTitle:'Member Notes',
    description:'Native cards keep their internal spacing while the background, border and shadow are removed.',
    file:'Member-Notes-Query-Template.html',classes:'us-query-template us-list--no-shell',rows:5,
    query:'Use the same member-notes query as the Member notes example.',order:'Newest CreatedOn first.',
    fields:fields['Member-Notes-Query-Template.html'],
    optional:'Use exactly the same repeating template as Member notes; only the iPart CSS class changes. Keep Display in cards checked to retain internal card padding. Unchecking it instead produces plain content without that padding.',
    empty:'No notes recorded for this member.',records:notes
  }
];
// One shared template demonstrates the optional search class, with no search
// markup in the repeating result and no preview-only filtering controller.
module.exports.push({
  ...module.exports.find(example => example.id === 'tasks'),
  id:'search-tasks', title:'Searchable task results', panelTitle:'My tasks',
  description:'Open the header funnel and search by task, member or displayed date. The existing task template is unchanged; shared theme JS filters this iPart’s loaded results.',
  classes:'us-list--rows us-list--compact us-query-search',
  optional:'Add us-query-search to the Query Template Display iPart’s CSS class field alongside existing list/action classes. Load updated zUnionSuite.css and zUnionSuite.js. Set a nonempty Title. Search starts collapsed and matches displayed text case-insensitively. Closing the funnel clears the search and restores results, respecting the independent Show completed setting. It searches only the currently displayed page; native queries and paging still own the full result set. No-match feedback is generated automatically. The HTML below is the unchanged one-result template.'
});
module.exports.push({
  ...module.exports.find(example => example.id === 'notes'),
  id:'search-notes', title:'Searchable notes',
  description:'Reusable query search on notes. This iPart has no task-completion toggle.',
  classes:'us-query-search',
  optional:'Add only us-query-search to the iPart CSS class field. The generic search works with the existing notes template and needs no task status field. It searches the currently displayed results.'
});
const completionExample = {
  id:'task-filters', title:'Task search and completion filter', panelTitle:'My tasks',
  description:'Independent search/completion filters share one funnel, with a generated Add task plus icon. Completed tasks start hidden.',
  file:'Tasks-Completion-Query-Template.html', classes:'us-query-search us-task-completed-filter us-action-home-add-task', rows:5,
  cards:false,footer:'Tasks-Query-Footer.html',
  query:'Use your tasks query, filtered to the current staff member. Return outstanding tasks and tasks completed in the last 30 days.',
  order:'Outstanding first, then recently completed. The query owns sorting and the completion date window.',
  fields:fields['Tasks-Completion-Query-Template.html'],
  optional:'These aliases are suggested mappings, not verified iMIS fields. Leave Header blank. Paste Tasks-Query-Footer.html into the separate Footer field and replace /your-tasks-page with your actual destination. The footer shows the outstanding count in the filtered results on this page and right-aligns View all tasks. The checkbox uses shared local-only tick/untick and slide/collapse behaviour; there are no API writes until a future save integration. Reloading or native paging/replacement restores the query state. The query still owns the 30-day window. An initially completed row can optionally supply data-us-task-due-label with its original due label for reopening.',
  empty:'No tasks to show.',
  records:[
    {TaskTitle:'Call Alex about renewal',MemberName:'Alex Morgan',IsCompleted:'false',TaskDateLabel:'Due 10 September 2026',Status:'Overdue',TaskNote:'Discuss the renewal options.'},
    {TaskTitle:'Confirm workplace details',MemberName:'Jordan Lee',IsCompleted:'0',TaskDateLabel:'Due 14 September 2026',Status:'Upcoming',TaskNote:'Confirm the new workplace address.'},
    {TaskTitle:'Send Alex the renewal summary',MemberName:'Alex Morgan',IsCompleted:'true',TaskDateLabel:'Actioned 11 September 2026',Status:'Complete',TaskNote:'Renewal summary sent.'}
  ]
};
// Accepted task list format: title, a one-line note, and the member beside the
// due or actioned date. Prefer this over the two-line completion template for new
// lists; the older template stays supported for lists already using it.
const detailExample = {
  id:'task-detail', title:'Task list (accepted format)', panelTitle:'My tasks',
  description:'Title, a clipped one-line note, and a linked member beside the due or actioned date. Overdue says so as well as showing red. Search and the Show completed toggle behave as above.',
  file:'Tasks-Detail-Query-Template.html', classes:'us-query-search us-task-completed-filter', rows:5,
  cards:false, footer:'Tasks-Query-Footer.html',
  query:'Use your tasks query, filtered to the current staff member. Return outstanding tasks and tasks completed in the last 30 days.',
  order:'Outstanding first, then recently completed. The query owns sorting and the completion date window.',
  fields:fields['Tasks-Detail-Query-Template.html'],
  optional:'These aliases are suggested mappings, not verified iMIS fields. Leave Header blank and paste Tasks-Query-Footer.html into the separate Footer field, replacing /your-tasks-page with your destination. The query composes TaskDateLabel in full, including the words Overdue, Due and Actioned, so the row never depends on colour alone and a missing value cannot leave a stray prefix. DueState only drives emphasis; it is not updated when a staff member ticks a row, so a completed row always shows a plain green Actioned date. The note is clipped to one line by CSS rather than truncated in the query, which keeps the whole note searchable. Supply TaskPartyId and TaskOrdinal to save completion: ticking PUTs FollowUpActioned to the matching i4u_UT_Interactions row, and the row only leaves the list once iMIS accepts the change. This example leaves both blank, so its checkboxes stay local.',
  empty:'No tasks to show.',
  records:[
    {TaskTitle:'Call Alex about renewal',MemberName:'Alex Morgan',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'overdue',TaskDateLabel:'Overdue 10 September 2026',DueLabel:'Overdue 10 September 2026',TaskUrl:'#example',TaskNote:'Discuss the membership options sent earlier this week and confirm which tier he wants before the renewal lapses.'},
    {TaskTitle:'Confirm updated workplace details',MemberName:'Jordan Lee',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'today',TaskDateLabel:'Due today',DueLabel:'Due today',TaskUrl:'#example',TaskNote:'New site address supplied by the delegate; check it against the employer record.'},
    {TaskTitle:'Follow up membership application',MemberName:'Taylor Smith',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'soon',TaskDateLabel:'Due 18 September 2026',DueLabel:'Due 18 September 2026',TaskUrl:'#example',TaskNote:'Waiting on payroll deduction confirmation from the employer.'},
    {TaskTitle:'Send Alex the renewal summary',MemberName:'Alex Morgan',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'true',DueState:'none',TaskDateLabel:'Actioned 11 September 2026',DueLabel:'Due 9 September 2026',TaskUrl:'#example',TaskNote:'Summary emailed with the fee schedule attached.'}
  ]
};
// Compact and full task rows (US-TASK-ROWS 1.2, owner, 19 October 2026): one
// row in two versions for the homepage, agreement and case pages. Compact is
// the default; full shows the note as well. The title is plain text and the
// pencil edits; tags end the meta line.
const taskRowRecords = [
  {TaskTitle:'Call Alex about renewal',MemberName:'Alex Morgan',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'overdue',TaskDateLabel:'Overdue 10 September 2026',DueLabel:'Overdue 10 September 2026',TaskUrl:'#example',PriorityBadge:'High Priority',TaskTags:'Membership, Renewal, Phone call',TaskNote:'Discuss the membership options sent earlier this week and confirm which tier he wants before the renewal lapses. He asked for the comparison sheet and the payroll deduction form, and wants a call back after 3pm on weekdays.'},
  {TaskTitle:'Confirm updated workplace details',MemberName:'Jordan Lee',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'today',TaskDateLabel:'Due today',DueLabel:'Due today',TaskUrl:'#example',PriorityBadge:'',TaskTags:'Correspondence',TaskNote:'New site address supplied by the delegate; check it against the employer record.'},
  {TaskTitle:'Ring back',MemberName:'Jo Ng',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'false',DueState:'soon',TaskDateLabel:'Due 18 September 2026',DueLabel:'Due 18 September 2026',TaskUrl:'#example',PriorityBadge:'',TaskTags:'',TaskNote:''},
  {TaskTitle:'Send Alex the renewal summary',MemberName:'Alex Morgan',MemberUrl:'#example',MemberId:'',TaskPartyId:'',TaskOrdinal:'',IsCompleted:'true',DueState:'none',TaskDateLabel:'Actioned 11 September 2026',DueLabel:'Due 9 September 2026',TaskUrl:'#example',PriorityBadge:'',TaskTags:'Correspondence',TaskNote:'Summary emailed with the fee schedule attached.'}
];
const taskRowOptional = 'These aliases are suggested mappings, not verified iMIS fields. The query composes TaskDateLabel in long form, including the words Overdue, Due and Actioned (Overdue 10 September 2026, Due today), so the row never depends on colour alone. The pencil (us-action-home-edit-task) opens TaskUrl in the native popup; on the agreement or case page use that page\u2019s edit action instead. TaskTags lists the task\u2019s tags, comma-separated, from the task tag list; blank shows none. Supply TaskPartyId and TaskOrdinal to save completion, as for the detail row; this example leaves both blank, so its checkboxes stay local.';
const compactExample = {
  id:'task-compact', title:'Task list: compact (default)', panelTitle:'My tasks',
  description:'Title, then the date, member and tags; the High Priority badge, a details button and the pencil on the title line. The details button opens the note under the row; +2 shows the rest of the tags.',
  file:'Tasks-Compact-Query-Template.html', classes:'us-query-search us-task-completed-filter', rows:5,
  cards:false, footer:'Tasks-Query-Footer.html',
  query:'Use your tasks query, filtered to the current staff member. Return outstanding tasks and tasks completed in the last 30 days.',
  order:'Outstanding first, then recently completed. The query owns sorting and the completion date window.',
  fields:fields['Tasks-Compact-Query-Template.html'],
  optional:taskRowOptional,
  empty:'No tasks to show.',
  records:taskRowRecords
};
const fullExample = {
  ...compactExample,
  id:'task-full', title:'Task list: full (optional)',
  description:'The compact row with the note shown under the title, up to two lines; a longer note gets More, which opens it in place.',
  file:'Tasks-Full-Query-Template.html',
  fields:fields['Tasks-Full-Query-Template.html']
};
module.exports.push(compactExample, fullExample);
module.exports.push(detailExample);
module.exports.push(completionExample, {
  ...completionExample, id:'task-completed-only', title:'Completion filter only',
  description:'The same tasks with only us-task-completed-filter: a Show completed toggle and no search field.',
  classes:'us-list--rows us-list--compact us-task-completed-filter'
});
const contacts=require('./contact-records.cjs');
['delegates','organisers'].forEach(kind=>module.exports.push({
 id:'contacts-'+kind,title:'Workplace '+kind,panelTitle:'Workplace '+kind,
 description:'Shared contact rows, role badges and scroll fade. Use the funnel to search by displayed details or the hidden contact ID (try '+contacts[kind][0].ContactId+').',
 file:'Contacts-Query-Template.html',classes:'us-query-search us-list-scroll',cards:false,rows:30,
 query:'Keep your existing workplace '+kind+' query; map its output aliases to the fields below.',
 order:'Filter to the current member’s workplaces in IQA; sort by the desired role/name order.',
 mapping:"Include all nine aliases in the IQA Select/display column list when using the unchanged template. Only ContactName needs a nonempty value. Optional values may be blank, but every field still referenced in the HTML must be selected. For unused fields, add selected custom SQL columns returning '' with the matching aliases, or remove every reference from the template, including links and search tokens. The example paths below are illustrative: substitute your actual iMIS destinations. RoleColour replaces RoleKey and has no predefined role-name mapping.",
 fields:fields['Contacts-Query-Template.html'],
 optional:"Load updated zUnionSuite.css/zUnionSuite.js and the theme Tabler icon stylesheet/font. Leave Header and Footer blank. Set a nonempty Title and use the Description field for supporting text. All tokens are suggested output aliases: include them in the IQA Select/display column list. For unused optional values, select custom SQL columns returning '' with matching aliases, or remove all their template references, including relevant blocks, links and data-us-search tokens. Keep substitutions HTML-encoded, including data-us-search and href; never use noencode. The shared contact helper hides rendered blank optional text; it cannot satisfy a missing selected query column. Use verified http(s), root-relative, ./, ../ or # destinations; unsafe/blank destinations become non-clickable text. The contact ID is in the HTML and searchable, not secret. data-us-search replaces visible-text matching; removing that attribute restores it. Scrolling limits the native body to 414px by default, including any authored Header/Footer and pager; the panel heading/description and search controls stay above it. Native paging and query access remain unchanged. Remove us-list-scroll for natural height or remove us-query-search for no search. Both workplace lists use this same template.",
 empty:'No '+kind+' to show for this workplace.',records:contacts[kind]
}));
