// OFFLINE PROTOTYPE ONLY. Never installed in the theme.
// 1. Gives the page the agreement URL parameters the actions read.
// 2. Renders sample rows through the real author templates in templates/,
//    substituting {#query.Field} the way the Query Template Display does.
// 3. Answers the CloudToolz, ZenTokens and tag requests offline.
// 4. Stands in for the native iMIS popup (ShowDialog_NoReturnValue).
// 5. Simulates native CCO tab selection; in iMIS the theme switches tabs in
//    place (US-CCO-SWITCH), which cannot run from a static file.
(() => {
  'use strict';

  // ── Task rows: the shared task columns ───────────────────────
  // The compact task row (US-TASK-ROWS 1.2, owner, 19 October 2026) reads one
  // set of column names on every page. The sample tasks keep the current
  // IQA's columns; this maps them as the renamed IQA will return them, with
  // the long-form date the homepage uses, and sample notes and tags.
  const TASK_NOTES = {
      "811": "Include the redlined clauses 12 to 18 and the costings summary. The committee meets Thursday, so it needs to be with them by Tuesday.",
      "812": "Seats for 120; check accessibility and parking. Hold the booking until the ballot date is confirmed."
  };
  const TASK_TAGS = {
      "635": "Legal",
      "811": "Bargaining, Correspondence",
      "812": "Meeting",
      "813": "Fair Work, Lodgement, Compliance"
  };
  function longDate(value) {
    if (!value) return '';
    const iso = /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : value.split('/').reverse().map(part => part.padStart(2, '0')).join('-');
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'});
  }
  function taskColumns(row) {
    const done = /^(done|true|1)$/i.test(String(row.TAskCheckCSS || ''));
    const due = longDate(row.Deadline);
    const dueLabel = due ? (row.TaskStatusCSS === 'overdue' ? 'Overdue ' : 'Due ') + due : '';
    const actioned = longDate(row.CompletedIso);
    return {
      ...row,
      TaskOrdinal: row.Ordinal,
      TaskTitle: row.Note,
      IsCompleted: done ? 'true' : 'false',
      DueState: done ? 'none' : row.TaskStatusCSS === 'overdue' ? 'overdue' : due ? 'soon' : 'none',
      TaskDateLabel: done ? (actioned ? 'Actioned ' + actioned : dueLabel.replace(/^Overdue /, 'Due ')) : dueLabel,
      DueLabel: dueLabel,
      AssignedToName: row.AssignedTo,
      AssignedToID: row.AssignedToID || '',
      TaskNote: row.TaskNote ?? row.Description ?? TASK_NOTES[row.Ordinal] ?? '',
      TaskTags: row.TaskTags ?? TASK_TAGS[row.Ordinal] ?? ''
    };
  }

  // ── 1. Page context ──────────────────────────────────────────
  const url = new URL(location.href);
  if (!url.searchParams.get('AgreementID')) {
    url.searchParams.set('AgreementID', 'A107');
    url.searchParams.set('AgreementNum', '123');
    try { history.replaceState(null, '', url); } catch (error) { /* optional */ }
  }
  window.gWebsiteKey = '44d4896b-1260-4b32-904e-9f9b4778fd68';
  // Fixed "today" so past and upcoming meetings stay put in the sample.
  window.UnionSuiteQueryStatesConfig = {today: '2026-10-02'};

  // ── 2. Sample rows (values as the existing IQAs return them) ──
  const rows = {
    tasks: [
      {Ordinal: '811', Note: 'Send draft agreement to the bargaining committee', TAskCheckCSS: '', TaskStatusCSS: 'overdue', Deadline: '28/09/2026', OverdueText: ' - Overdue', AssignedTo: 'Mary O\'Conner', PriorityBadge: 'High Priority'},
      {Ordinal: '812', Note: 'Book venue for the members\' ballot meeting', TAskCheckCSS: '', TaskStatusCSS: 'outstanding', Deadline: '14/10/2026', OverdueText: '', AssignedTo: 'Dani Sundara', PriorityBadge: ''},
      {Ordinal: '813', Note: 'Confirm Fair Work lodgement requirements', TAskCheckCSS: '', TaskStatusCSS: 'outstanding', Deadline: '', OverdueText: '', AssignedTo: 'Unassigned', PriorityBadge: ''},
      {Ordinal: '635', Note: 'Contact Bill and Bill Lawyers asap and get them to review the latest contracts', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '', OverdueText: '', AssignedTo: 'Alicia Miller', PriorityBadge: 'High Priority'},
      {Ordinal: '620', Note: 'Send survey to members', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '22/05/2026', OverdueText: '', AssignedTo: 'Unassigned', PriorityBadge: ''},
      {Ordinal: '640', Note: 'Finalise meeting schedule for June', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '31/05/2026', OverdueText: '', AssignedTo: 'Unassigned', PriorityBadge: ''},
      {Ordinal: '762', Note: 'Email members about agreement', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '31/07/2026', OverdueText: '', AssignedTo: 'Alex Keaton', PriorityBadge: ''}
    ],
    milestones: [
      {Ordinal: '637', Note: 'Form bargaining committee', TaskStatus: 'Complete', StatusCSS: 'done', Deadline: '', Status: 'Completed'},
      {Ordinal: '636', Note: 'Initial member survey', TaskStatus: 'Complete', StatusCSS: 'done', Deadline: '', Status: 'Completed'},
      {Ordinal: '617', Note: 'First round of negotiations', TaskStatus: 'Complete', StatusCSS: 'done', Deadline: '21/05/2026', Status: 'Completed'},
      {Ordinal: '773', Note: 'Second round of negotiations', TaskStatus: 'In Progress', StatusCSS: 'current', Deadline: '30/10/2026', Status: 'In progress'},
      {Ordinal: '774', Note: 'Members\' ballot', TaskStatus: 'Not Complete', StatusCSS: 'future', Deadline: '20/11/2026', Status: 'Outstanding'},
      {Ordinal: '775', Note: 'Lodge with Fair Work', TaskStatus: 'Not Complete', StatusCSS: 'future', Deadline: '', Status: 'Outstanding'}
    ],
    // Contacts IQA (option 7, settled 3 October 2026): sorted by group
    // order, the Lead first, then name. Group order and tone come from the
    // group setup; ContactUrl is the record link (iMIS-only, so it 404s here).
    contacts: [
      {Ordinal: '183', ContactId: '10183', ContactName: "Mary O'Conner", ContactUrl: '/Party.aspx?ID=10183', ContactIsLead: 'true', ContactRole: 'Lead', ContactType: 'Staff', ContactGroup: 'Bargaining Team', ContactGroupOrder: '1', ContactGroupTone: 'info', ContactPhone: '(917) 653-6240', ContactEmail: ''},
      {Ordinal: '195', ContactId: '10195', ContactName: 'Dani Sundara', ContactUrl: '/Party.aspx?ID=10195', ContactIsLead: 'false', ContactRole: 'General', ContactType: 'Staff', ContactGroup: 'SBU', ContactGroupOrder: '2', ContactGroupTone: 'success', ContactPhone: '0400 123 457', ContactEmail: 'danisundara@mailinator.com'},
      {Ordinal: '198', ContactId: '10198', ContactName: 'Tony Fin Stark', ContactUrl: '/Party.aspx?ID=10198', ContactIsLead: 'false', ContactRole: 'Consultant', ContactType: 'Member', ContactGroup: 'SBU', ContactGroupOrder: '2', ContactGroupTone: 'success', ContactPhone: '', ContactEmail: 'work@email.com'},
      {Ordinal: '197', ContactId: '10197', ContactName: 'Tony Williams', ContactUrl: '/Party.aspx?ID=10197', ContactIsLead: 'false', ContactRole: 'Consultant', ContactType: 'Member', ContactGroup: 'SBU', ContactGroupOrder: '2', ContactGroupTone: 'success', ContactPhone: '(429) 183-3413', ContactEmail: 'tonywilliams@mailinator.com'},
      {Ordinal: '194', ContactId: '10194', ContactName: 'Al Soria', ContactUrl: '/Party.aspx?ID=10194', ContactIsLead: 'false', ContactRole: 'Consultant', ContactType: 'Staff', ContactGroup: 'All', ContactGroupOrder: '3', ContactGroupTone: 'neutral', ContactPhone: '', ContactEmail: 'asoria@mailinator.com'},
      {Ordinal: '186', ContactId: '10186', ContactName: 'Frank Grimes', ContactUrl: '/Party.aspx?ID=10186', ContactIsLead: 'false', ContactRole: 'Consultant', ContactType: 'External', ContactGroup: 'External', ContactGroupOrder: '4', ContactGroupTone: 'warning', ContactPhone: '0400 123 456', ContactEmail: 'frank@grimes.com.au'}
    ],
    attachments: [
      {Ordinal: '583', FileName: 'Contract File 27-05-2026', TagNames: 'Logged Document,CaseTask,Logged Email', TagOrdinals: '1,7,2', UniqueID: '01S3AQU4FL33YVW46I3ND2RIHLJKS5ZW6G', EntityCode: 'DEMO', CreatedBy: 'Hub TestLastName', CreatedOn: '11/05/2026'},
      {Ordinal: '584', FileName: 'Initial Proposal v2', TagNames: 'new tag', TagOrdinals: '10', UniqueID: '01S3AQU4D2H5ZDQULL6VDZVWZKMDKTZSKV', EntityCode: 'DEMO', CreatedBy: 'Hub TestLastName', CreatedOn: '11/05/2026'},
      {Ordinal: '585', FileName: 'Survey Responses v2', TagNames: 'Cases,CaseTask,Logged Document', TagOrdinals: '3,7,1', UniqueID: '01S3AQU4B272PZJYJY5BEI66IZRJMRXN62', EntityCode: 'DEMO', CreatedBy: 'Hub TestLastName', CreatedOn: '11/05/2026'},
      {Ordinal: '592', FileName: 'Test Contract', TagNames: 'Documentation,Forms,ID,new tag', TagOrdinals: '14,15,16,10', UniqueID: '01S3AQU4E73MZGEWFCBJALD3O6K2S7IL5R', EntityCode: 'DEMO', CreatedBy: 'Hub TestLastName', CreatedOn: '26/05/2026'},
      {Ordinal: '607', FileName: 'Screenshot 2026-06-03 122317', TagNames: 'ID,new tag', TagOrdinals: '16,10', UniqueID: '01S3AQU4AGLJDG4BVHWBEIJAJARH4HMFGQ', EntityCode: 'DEMO', CreatedBy: 'Andrew O Newnham', CreatedOn: '4/06/2026'}
    ],
    meetings: [
      {Ordinal: '21', 'Date-ISO': '2026-10-14', 'Date-Month': 'Oct', 'Date-Day': '14', MeetingType: 'Hearing', Matter: 'FairWorkAct', 'Date-Time': '10:00 AM', Location: 'Fair Work Commission, Melbourne'},
      {Ordinal: '22', 'Date-ISO': '2026-10-21', 'Date-Month': 'Oct', 'Date-Day': '21', MeetingType: 'General', Matter: 'EADispute', 'Date-Time': '02:00 PM', Location: ''},
      {Ordinal: '19', 'Date-ISO': '2026-07-31', 'Date-Month': 'Jul', 'Date-Day': '31', MeetingType: 'General', Matter: 'EADispute', 'Date-Time': '12:30 PM', Location: ''},
      {Ordinal: '20', 'Date-ISO': '2026-07-16', 'Date-Month': 'Jul', 'Date-Day': '16', MeetingType: 'General', Matter: 'EADispute', 'Date-Time': '02:00 PM', Location: ''},
      {Ordinal: '18', 'Date-ISO': '2026-05-20', 'Date-Month': 'May', 'Date-Day': '20', MeetingType: 'General', Matter: 'Other', 'Date-Time': '11:47 AM', Location: 'aa'}
    ],
    notes: [
      {Ordinal: '808', CreatedOn: '1/10/2026', CreatedTime: '9:14 am', CreatedBy: 'Hub TestLastName', Priority: '', AccessClass: '', Note: 'Task goes here', Category: 'Task'},
      {Ordinal: '773', CreatedOn: '20/08/2026', CreatedTime: '3:47 pm', CreatedBy: 'Christina Zerk', Priority: '', AccessClass: '', Note: 'New milestone', Category: 'Milestones'},
      {Ordinal: '684', CreatedOn: '4/06/2026', CreatedTime: '11:02 am', CreatedBy: 'Andrew O Newnham', Priority: '', AccessClass: '', Note: 'test', Category: 'Agreement'},
      {Ordinal: '639', CreatedOn: '11/05/2026', CreatedTime: '4:30 pm', CreatedBy: 'Hub TestLastName', Priority: 'High', AccessClass: '', Note: 'Have Alicia review the latest proposal', Category: ''},
      {Ordinal: '634', CreatedOn: '10/05/2026', CreatedTime: '10:15 am', CreatedBy: 'Hub TestLastName', Priority: '', AccessClass: 'restricted', Note: 'Received feedback from some members that the latest increase schedule will impact them significantly', Category: 'Agreement'},
      {Ordinal: '621', CreatedOn: '5/05/2026', CreatedTime: '2:05 pm', CreatedBy: 'Hub TestLastName', Priority: '', AccessClass: '', Note: 'Spoke to Lawyer X regarding the initial contract documents', Category: 'Agreement'},
      // Longer notes, so the ledger's three-line cap and More show on the page.
      {Ordinal: '602', CreatedOn: '28/04/2026', CreatedTime: '1:20 pm', CreatedBy: 'Christina Zerk', Priority: '', AccessClass: '', Note: 'Met with the employer bargaining team at their offices. They tabled a revised classification structure that collapses levels 3 and 4 into a single band, with the new band paid at the current level 3 rate plus 1.5%. Our delegates are concerned this is a pay cut for anyone currently at level 4, which is about forty members at this site. We asked for the modelling behind the proposal and they agreed to send it by the end of next week. We also raised the outstanding rostering grievance from February, which they say is still with their legal team. Next meeting is pencilled in for the 12th.', Category: 'Agreement'},
      {Ordinal: '588', CreatedOn: '14/04/2026', CreatedTime: '8:55 am', CreatedBy: 'Andrew O Newnham', Priority: 'High', AccessClass: 'restricted', Note: 'Confidential: a member has reported that the site manager has been asking individual staff to sign a new individual flexibility arrangement before the agreement is finalised.\nWe need to confirm how many have been approached and whether anyone has signed. Do not raise this with the employer until we have spoken to the members directly.\nFollow up with the delegate on Thursday.', Category: 'Agreement'}
    ],
    // Terms and scheduled increases as live (owner's screenshot, 9 October
    // 2026): two terms; 13 general increases (107% + CPI + $4,788.00, 10 Jul
    // 2026 to 1 Jan 2028) and two classes (C88, three steps to 16.5%; Test,
    // one step of 2%). The live amounts are test data; the general dates
    // and split are made up to give the live totals.
    terms: [
      {Ordinal: '58', Term: 'Paid Meetings', Category: 'General', Amount: '0.00', StatusClass: 'negotiating', StatusLabel: 'Negotiating', Comment: ''},
      {Ordinal: '59', Term: "Staff entitled to half-day off on Friday's", Category: 'General', Amount: '0.00', StatusClass: 'included', StatusLabel: 'Included', Comment: 'This is a commitment from the employer to recognise dangerous working bonus'}
    ],
    // Scheduled increases, as the Agreement Increases IQA returns them: sorted
    // general first, then each class; When and AmountText built by the IQA.
    increases: [
      {Ordinal: '301', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '50.00', Amount: '', AmountPeriod: '', EffectiveDate: '2026-07-10', MonthsInClass: '', When: '10 July 2026', AmountText: '50%', IncreaseNum: '1', Comment: ''},
      {Ordinal: '302', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '20.00', Amount: '', AmountPeriod: '', EffectiveDate: '2026-08-01', MonthsInClass: '', When: '1 Aug 2026', AmountText: '20%', IncreaseNum: '2', Comment: ''},
      {Ordinal: '303', Kind: 'General', IncreaseType: 'Fixed amount', Class: '', ClassOrder: '', Percent: '', Amount: '4000.00', AmountPeriod: '', EffectiveDate: '2026-09-01', MonthsInClass: '', When: '1 Sept 2026', AmountText: '$4,000.00', IncreaseNum: '3', Comment: ''},
      {Ordinal: '304', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '10.00', Amount: '', AmountPeriod: '', EffectiveDate: '2026-10-01', MonthsInClass: '', When: '1 Oct 2026', AmountText: '10%', IncreaseNum: '4', Comment: ''},
      {Ordinal: '305', Kind: 'General', IncreaseType: 'CPI', Class: '', ClassOrder: '', Percent: '', Amount: '', AmountPeriod: '', EffectiveDate: '2026-11-01', MonthsInClass: '', When: '1 Nov 2026', AmountText: 'CPI', IncreaseNum: '5', Comment: ''},
      {Ordinal: '306', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '10.00', Amount: '', AmountPeriod: '', EffectiveDate: '2026-12-01', MonthsInClass: '', When: '1 Dec 2026', AmountText: '10%', IncreaseNum: '6', Comment: ''},
      {Ordinal: '307', Kind: 'General', IncreaseType: 'Fixed amount', Class: '', ClassOrder: '', Percent: '', Amount: '500.00', AmountPeriod: '', EffectiveDate: '2027-01-01', MonthsInClass: '', When: '1 Jan 2027', AmountText: '$500.00', IncreaseNum: '7', Comment: ''},
      {Ordinal: '308', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '5.00', Amount: '', AmountPeriod: '', EffectiveDate: '2027-03-01', MonthsInClass: '', When: '1 Mar 2027', AmountText: '5%', IncreaseNum: '8', Comment: ''},
      {Ordinal: '309', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '5.00', Amount: '', AmountPeriod: '', EffectiveDate: '2027-05-01', MonthsInClass: '', When: '1 May 2027', AmountText: '5%', IncreaseNum: '9', Comment: ''},
      {Ordinal: '310', Kind: 'General', IncreaseType: 'Fixed amount', Class: '', ClassOrder: '', Percent: '', Amount: '288.00', AmountPeriod: '', EffectiveDate: '2027-07-01', MonthsInClass: '', When: '1 July 2027', AmountText: '$288.00', IncreaseNum: '10', Comment: ''},
      {Ordinal: '311', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '3.00', Amount: '', AmountPeriod: '', EffectiveDate: '2027-09-01', MonthsInClass: '', When: '1 Sept 2027', AmountText: '3%', IncreaseNum: '11', Comment: ''},
      {Ordinal: '312', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '2.00', Amount: '', AmountPeriod: '', EffectiveDate: '2027-11-01', MonthsInClass: '', When: '1 Nov 2027', AmountText: '2%', IncreaseNum: '12', Comment: ''},
      {Ordinal: '313', Kind: 'General', IncreaseType: 'Negotiated', Class: '', ClassOrder: '', Percent: '2.00', Amount: '', AmountPeriod: '', EffectiveDate: '2028-01-01', MonthsInClass: '', When: '1 Jan 2028', AmountText: '2%', IncreaseNum: '13', Comment: ''},
      {Ordinal: '321', Kind: 'Class', IncreaseType: 'Percentage', Class: 'C88', ClassOrder: '1', Percent: '12.00', Amount: '', AmountPeriod: '', EffectiveDate: '', MonthsInClass: '7', When: 'After 7 months', AmountText: '12%', IncreaseNum: '', Comment: ''},
      {Ordinal: '322', Kind: 'Class', IncreaseType: 'Percentage', Class: 'C88', ClassOrder: '1', Percent: '2.00', Amount: '', AmountPeriod: '', EffectiveDate: '', MonthsInClass: '12', When: 'After 12 months', AmountText: '2%', IncreaseNum: '', Comment: ''},
      {Ordinal: '323', Kind: 'Class', IncreaseType: 'Percentage', Class: 'C88', ClassOrder: '1', Percent: '2.50', Amount: '', AmountPeriod: '', EffectiveDate: '', MonthsInClass: '24', When: 'After 24 months', AmountText: '2.5%', IncreaseNum: '', Comment: ''},
      {Ordinal: '324', Kind: 'Class', IncreaseType: 'Percentage', Class: 'Test', ClassOrder: '2', Percent: '2.00', Amount: '', AmountPeriod: '', EffectiveDate: '', MonthsInClass: '6', When: 'After 6 months', AmountText: '2%', IncreaseNum: '', Comment: ''}
    ]
  };

  // Notes use the ledger (option 4, owner 3 October 2026). ?notes=reading keeps
  // the option 5 preview available for comparison.
  const readingNotes = url.searchParams.get('notes') === 'reading';
  // ?meetings=past drops the upcoming samples, to preview the No upcoming
  // meetings placeholder (US-PAST-EMPTY).
  const pastMeetingsOnly = url.searchParams.get('meetings') === 'past';
  // ?tasks=done marks every task complete, to preview the No outstanding
  // tasks placeholder (US-PAST-EMPTY).
  const allTasksDone = url.searchParams.get('tasks') === 'done';
  // ?resolution=open previews an agreement not yet resolved: status
  // Negotiating in the banner, Summary and Details, and a blank Resolution.
  const resolutionOpen = url.searchParams.get('resolution') === 'open';
  const status = resolutionOpen
    ? {text: 'Negotiating', tone: 'warning', message: 'This agreement has not yet been finalised.'}
    : {text: 'Active', tone: 'success', message: 'This agreement has been finalised.'};
  // The banner's top row is page markup here (in iMIS, the Banner primary
  // IQA fills it), so the preview restates the status on it.
  if (resolutionOpen) {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.us-banner__surface[data-us-record-status]').forEach(surface => surface.setAttribute('data-us-record-status', status.text));
      document.querySelectorAll('.us-banner__badge--record-status').forEach(badge => { badge.textContent = status.text; });
    });
  }

  // Coverage rules, as the Agreement Coverage Rules IQA returns the iMIS
  // copy of the rules table: sorted Rank, then Ordinal, with ValueLabel
  // naming an .ImisId rule's contact. As live (owner's screenshot,
  // 9 October 2026): rank 4 has a disabled rule.
  const coverageRules = [
    {Ordinal: '112', Rank: '2', Enabled: '1', Rule1: 'ZenCrm.Organisations.ImisId', MatchCondition: 'Equals', Rule2: '103997', ValueLabel: 'RMIT Melbourne'},
    {Ordinal: '115', Rank: '4', Enabled: '1', Rule1: 'ZenCrm.Organisations.ImisId', MatchCondition: 'Equals', Rule2: '23309', ValueLabel: 'TestOrg10'},
    {Ordinal: '117', Rank: '4', Enabled: '1', Rule1: 'ZenCrm.Individuals.Category', MatchCondition: 'Equals', Rule2: 'RN', ValueLabel: ''},
    {Ordinal: '118', Rank: '4', Enabled: '0', Rule1: 'UnionTemplate.Profile.Division', MatchCondition: 'Equals', Rule2: 'Nursing', ValueLabel: ''},
    {Ordinal: '119', Rank: '5', Enabled: '1', Rule1: 'ZenCrm.Organisations.ImisId', MatchCondition: 'Equals', Rule2: '103842', ValueLabel: 'Stark Enterprise - Melbourne'}
  ];

  // Coverage trackers: the folder's IQAs by name, each one summary row.
  const trackerFolder = '$/_i4u_/Core/CA/v2/Coverage Trackers';
  // As live (owner's screenshot, 9 October 2026): Contacts, then Workplaces.
  const coverageTrackers = {
    '01 Covered Contacts': {Count: 29, Header: 'Contacts', Label: 'covered by this agreement', Link: ''},
    '02 Covered Workplaces': {Count: 2, Header: 'Workplaces', Label: 'covered by this agreement', Link: ''}
  };

  // Which template fills which list, and whether "Display in cards" is on.
  const lists = [
    {set: 'ap-tasks', template: 'Agreement-Tasks-Query-Template.html', rows: (allTasksDone ? rows.tasks.map(row => ({...row, TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', OverdueText: ''})) : rows.tasks).map(taskColumns)},
    {set: 'ap-milestones', template: 'Agreement-Milestones-Query-Template.html', rows: rows.milestones},
    {set: 'ap-contacts', template: 'Agreement-Contacts-Grouped-Tiles-Query-Template.html', rows: rows.contacts},
    {set: 'ap-attachments', template: 'Agreement-Attachments-Query-Template.html', rows: rows.attachments},
    {set: 'ap-meetings', template: 'Agreement-Meetings-Query-Template.html', rows: pastMeetingsOnly ? rows.meetings.filter(row => row['Date-ISO'] < window.UnionSuiteQueryStatesConfig.today) : rows.meetings},
    {set: 'ap-notes', template: readingNotes ? 'Agreement-Notes-Reading-Query-Template.html' : 'Agreement-Notes-Ledger-Query-Template.html', rows: readingNotes ? rows.notes : rows.notes.map(ledgerNote)},
    {set: 'ap-terms', template: 'Agreement-Terms-Query-Template.html', rows: rows.terms},
    {set: 'ap-increases', template: 'Agreement-Increases-Query-Template.html', rows: rows.increases},
    {set: 'ap-coverage-rules', template: 'Agreement-Coverage-Rules-Query-Template.html', rows: coverageRules}
  ];

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // The ledger's Notes IQA fields: a restricted note's text is the word
  // "Restricted", with NoteClass us-restricted-note (owner, 5 October 2026).
  function ledgerNote(row) {
    return row.AccessClass === 'restricted'
      ? {...row, Note: 'Restricted', NoteClass: 'us-restricted-note'}
      : {...row, NoteClass: ''};
  }

  // Same substitution the Query Template Display performs: each token is
  // replaced by the row's value, HTML-encoded unless the token says noencode
  // ({#query.Note noencode}); an unselected field fails loudly here.
  function fill(template, row) {
    return template.replace(/\{#query\.([A-Za-z0-9_-]+)( noencode)?\}/g, (_, field, raw) => {
      if (!(field in row)) throw new Error('Sample row has no ' + field + ' — the IQA must select it.');
      return raw ? String(row[field] ?? '') : escapeHtml(row[field]);
    });
  }

  const nativeFetch = window.fetch.bind(window);

  const templates = new Map();

  async function renderList(list) {
    if (!templates.has(list.template)) {
      const response = await nativeFetch('templates/' + list.template);
      templates.set(list.template, (await response.text()).replace(/<!--[sS]*?-->/g, '').trim());
    }
    const template = templates.get(list.template);
    const set = document.getElementById(list.set);
    if (!set) return;
    if (list.set === 'ap-notes' && readingNotes) {
      const wrapper = set.closest('.us-notes');
      wrapper.classList.replace('us-notes--ledger', 'us-notes--reading');
      wrapper.classList.remove('us-list-scroll');
    }
    set.innerHTML = list.rows.map((row, index) => list.cards
      ? `<section data-item='${list.set}-${index}' class='mb-3'><div class='card QueryTemplateItem'><div class='card-body'>${fill(template, row)}</div></div></section>`
      : `<section data-item='${list.set}-${index}'><div class='QueryTemplateItem'>${fill(template, row)}</div></section>`).join('');
  }

  async function renderLists(only) {
    // No refresh calls here: in iMIS nothing outside the theme calls them, so
    // the theme must notice the rendered rows on its own (it did not, for the
    // milestone rail, until 3 October 2026).
    await Promise.all(lists.filter(list => !only || only.includes(list.set)).map(renderList));
  }

  // A refreshed iPart comes back from the page with its (empty) fixture list;
  // refill it, as iMIS would return it with rows.
  document.addEventListener('us:query-template-refreshed', event => {
    const sets = [...(event.detail?.container?.querySelectorAll('.QueryTemplateSet[id]') || [])].map(set => set.id);
    if (sets.length) renderLists(sets).catch(error => console.error(error));
  });

  // ── 3. Offline API answers ───────────────────────────────────
  const cloudToolz = 'https://cloudtoolz.example';
  const tags = ['Logged Document', 'Logged Email', 'Cases', 'CaseTask', 'Longer File Name test 2', 'new tag', 'Documentation', 'Forms', 'ID']
    .map((name, index) => ({Ordinal: [1, 2, 3, 7, 8, 10, 14, 15, 16][index], TagName: name}));
  let savesFail = false;

  // /api/query answers a PagedResult whose rows are flat alias-keyed objects.
  const items = list => ({Count: list.length, TotalCount: list.length, Items: {$values: list}});
  const reply = (data, status = 200, delay = 150) => new Promise(resolve => setTimeout(() => resolve({
    ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data)
  }), delay));

  window.fetch = async (input, init = {}) => {
    const target = new URL(typeof input === 'string' ? input : input.url, location.href);
    // The tracker folder's listing (DocumentSummary FindByPath, then
    // FindDocumentsInFolder), as the Needs Attention loader asks for it.
    if (target.pathname === '/api/DocumentSummary/_execute') {
      const request = JSON.parse(init.body || '{}');
      if (request.OperationName === 'FindByPath') return reply({Result: {DocumentId: '00000000-0000-4000-8000-0000000000c0'}});
      if (request.OperationName === 'FindDocumentsInFolder') {
        return reply({Result: {$values: Object.keys(coverageTrackers).map((Name, index) =>
          ({Name, DocumentTypeId: 'IQD', DocumentVersionId: '00000000-0000-4000-8000-0000000000c' + (index + 1)}))}});
      }
    }
    if (target.pathname === '/api/query') {
      const name = target.searchParams.get('QueryName') || '';
      if (name.endsWith('/CloudToolzUrl')) return reply(items([{Description: cloudToolz + '/'}]));
      if (name.endsWith('/API - Zen Attachment Tags')) return reply(items(tags));
      // Client-editable banner details: Description, Additional-* facts and a
      // Tone-* badge colour, in the order the IQA returns them.
      // One contact, for the tile refresh after Edit contact (US-ROW-PATCH).
      if (name.endsWith('/API - Manage Agreement - Contacts Single')) {
        const contact = rows.contacts.find(row => row.Ordinal === target.searchParams.get('Ordinal'));
        return reply(items(contact ? [contact] : []), 200, 600);
      }
      // Coverage trackers (US-ATTENTION with data-us-iqa-filter): one summary
      // row each, for the agreement in the AgreementNum filter.
      const tracker = coverageTrackers[name.slice(name.lastIndexOf('/') + 1)];
      if (name.startsWith(trackerFolder + '/') && tracker) {
        return reply(items(target.searchParams.get('AgreementNum') === '123' ? [tracker] : []), 200, 300);
      }
      if (name.endsWith('/API - Manage Agreement - Banner Details')) return reply(items([{
        Description: 'New collective bargaining agreement for Stark Industries.',
        'Additional-Agreement type': 'EBA_SupportedBargaining',
        'Additional-Priority': 'High',
        'Tone-Priority': 'danger',
        'Additional-Opened': '2026-01-01T00:00:00',
        'Additional-Lead': "Mary O'Conner",
        'Additional-Last updated': '2026-10-01T00:00:00'
      }]), 200, 300);
      // Client-editable field panels (US-FIELD-GROUPS). Column names lay the
      // panel out: Group-Label for a sub-heading, a number for a new line
      // without one, Tone-<Label> for a badge.
      if (name.endsWith('/Agreement Details')) return reply(items([{
        'Agreement number': 'A107',
        Type: 'EBA_SupportedBargaining',
        Status: status.text,
        'Tone-Status': status.tone,
        'Lead staff': "Mary O'Conner",
        'Coverage-Industry': 'AGR',
        'Coverage-Sector': 'Federal',
        'Coverage-Workbench': 'Avengers',
        'Classification-Tags': '',
        'Classification-Subtags': '',
        '1-Agreement link': 'https://www.fairwork.com/Agreement123'
      }]), 200, 250);
      if (name.endsWith('/Agreement Key Dates') || name.endsWith('/API - Manage Agreement - Key Dates')) return reply(items([{
        'Bargaining-Start': '2026-01-01T00:00:00',
        'Bargaining-Completed': '2026-05-21T00:00:00',
        'Bargaining-Approved': '',
        'Term-Expiry': '',
        'Term-Re-negotiation': '2026-10-29T00:00:00'
      }]), 200, 250);
      // Summary leads Overview: the status alert, then key details (owner,
      // 3 October 2026). Resolution, on Details, has no alert.
      if (name.endsWith('/Agreement Summary')) return reply(items([{
        'Alert-Title': status.text,
        'Alert-Message': status.message,
        'Alert-Tone': status.tone,
        'Outcome type': resolutionOpen ? '' : 'All Terms Agreed',
        Start: '2026-01-01T00:00:00',
        Expiry: '',
        Renegotiation: '2026-10-29T00:00:00'
      }]), 200, 250);
      if (name.endsWith('/Agreement Resolution')) return reply(items([resolutionOpen ? {
        'Outcome type': '',
        'Approved date': '',
        '1-Approved by': '',
        '1-Signed by': '',
        '2-Outcome': ''
      } : {
        'Outcome type': 'All Terms Agreed',
        'Approved date': '',
        '1-Approved by': '23116',
        '1-Signed by': '18108',
        '2-Outcome': 'Successfully completed with all terms agreed'
      }]), 200, 250);
    }
    if (target.pathname === '/api/ZenTokens') return reply({});
    if (target.origin === cloudToolz) {
      if (savesFail) return reply({}, 500, 700);
      if (target.pathname === '/flowz/sharepoint/download') {
        return reply({FileName: 'sample.txt', Base64string: btoa('Sample file from the offline agreement prototype.')}, 200, 500);
      }
      toast('Saved through CloudToolz ' + target.pathname + ' (offline sample).');
      return reply({}, 200, 700);
    }
    return nativeFetch(input, init);
  };

  // ── 4. Native popup stand-in ─────────────────────────────────
  // Arguments as the theme's popup actions pass them: URL first, title fifth,
  // close callback twelfth. The callback runs so the refresh path is exercised.
  window.ShowDialog_NoReturnValue = (href, args, width, height, title, ...rest) => {
    const path = new URL(href, location.href);
    toast(`Would open “${title}”: ${path.pathname}${path.search}`);
    const close = rest[6];
    if (typeof close === 'function') setTimeout(() => close(null, null), 600);
  };

  // ── 5. Prototype chrome ──────────────────────────────────────
  function toast(message) {
    const node = document.getElementById('ap-toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 3200);
  }

  function selectView(key) {
    const cco = document.getElementById('ap-cco');
    const link = cco?.querySelector(`a.rtsLink[data-view="${key}"]`);
    if (!link) return false;
    cco.querySelectorAll('a.rtsLink').forEach(item => {
      const selected = item === link;
      item.classList.toggle('rtsSelected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    cco.querySelectorAll('.rmpView').forEach(view => view.classList.toggle('rmpHidden', view.id !== 'view-' + key));
    try { history.replaceState(null, '', location.pathname + location.search + '#' + key); } catch (error) { /* optional */ }
    return true;
  }

  function showColorScheme() {
    const button = document.getElementById('ap-color-scheme');
    const dark = window.UnionSuiteAppearance?.getState().scheme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.textContent = dark ? 'Mode: dark' : 'Mode: light';
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('#ap-cco a.rtsLink');
    if (tab) {
      event.preventDefault();
      selectView(tab.dataset.view);
      return;
    }
    if (event.target.closest('#ap-color-scheme')) {
      window.UnionSuiteAppearance?.toggle();
      showColorScheme();
      return;
    }
    const failing = event.target.closest('#ap-save-failing');
    if (failing) {
      savesFail = !savesFail;
      failing.setAttribute('aria-pressed', String(savesFail));
      failing.textContent = savesFail ? 'Saves: fail' : 'Saves: succeed';
      return;
    }
    if (event.target.closest('.ap-demo')) {
      event.preventDefault();
      toast('BeyondForm submit — demo only.');
    }
  }, true);

  window.addEventListener('unionsuite:appearancechange', showColorScheme);
  window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));

  document.addEventListener('DOMContentLoaded', () => {
    selectView(location.hash.slice(1)) || selectView('overview');
    showColorScheme();
    renderLists().catch(error => {
      console.error(error);
      toast('Sample rows could not render: ' + error.message);
    });
  });
})();
