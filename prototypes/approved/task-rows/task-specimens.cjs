// Specimen content for the task row workbench. Data only.
//
// Each scenario renders twice from Theme/UnionSuite-Guides/usage/templates/List-Templates/:
// the accepted task row and the older two-line row, so the two can be compared on
// one page at the same list width. Both use the shipped theme CSS.
//
// Fictional records. Dates and labels are literal display strings, exactly as a
// query returns them; the accepted rows add the fields that template needs.

const current = 'Tasks-Completion-Query-Template.html';
const accepted = 'Tasks-Detail-Query-Template.html';

// Compact (the default) and full rows, US-TASK-ROWS 1.2 (owner, 19 October
// 2026): one row in two versions for the homepage, agreement and case pages.
const proposed = [
  {id:'compact', label:'Compact (default)', template:'Tasks-Compact-Query-Template.html'},
  {id:'full', label:'Full', template:'Tasks-Full-Query-Template.html'}
];

// Shared record shape. The older template reads TaskTitle, MemberName, IsCompleted
// and TaskDateLabel and ignores the rest.
const everydayRecords = [
  {
    TaskTitle:'Call Alex about renewal', MemberName:'Alex Morgan', MemberUrl:'#member-1', MemberId:'104001', TaskPartyId:'104011', TaskOrdinal:'201', IsCompleted:'false',
    TaskDateLabel:'Overdue 10 September 2026', DueState:'overdue', DueLabel:'Overdue 10 September 2026', TaskUrl:'#task-1', TaskTags:'Membership, Renewal, Phone call',
    TaskNote:'Discuss the membership options sent earlier this week and confirm which tier he wants before the renewal lapses. He asked for the comparison sheet and the payroll deduction form, and wants a call back after 3pm on weekdays.', PriorityBadge:'High Priority'
  },
  {
    TaskTitle:'Confirm updated workplace details', MemberName:'Jordan Lee', MemberUrl:'#member-2', MemberId:'104002', TaskPartyId:'104012', TaskOrdinal:'202', IsCompleted:'false',
    TaskDateLabel:'Due today', DueState:'today', DueLabel:'Due today', TaskUrl:'#task-2', TaskTags:'Correspondence',
    TaskNote:'New site address supplied by the delegate; check it against the employer record.', PriorityBadge:''
  },
  {
    TaskTitle:'Follow up membership application', MemberName:'Taylor Smith', MemberUrl:'#member-3', MemberId:'104003', TaskPartyId:'104013', TaskOrdinal:'203', IsCompleted:'false',
    TaskDateLabel:'Due 18 September 2026', DueState:'soon', DueLabel:'Due 18 September 2026', TaskUrl:'#task-3', TaskTags:'Membership',
    TaskNote:'Waiting on payroll deduction confirmation from the employer.', PriorityBadge:''
  },
  {
    TaskTitle:'Send Alex the renewal summary', MemberName:'Alex Morgan', MemberUrl:'#member-1', MemberId:'104001', TaskPartyId:'104011', TaskOrdinal:'201', IsCompleted:'true',
    TaskDateLabel:'Actioned 11 September 2026', DueState:'none', DueLabel:'Due 9 September 2026', TaskUrl:'#task-4', TaskTags:'Correspondence',
    TaskNote:'Summary emailed with the fee schedule attached.', PriorityBadge:''
  }
];

// The display has to survive whatever the query returns, including values no
// design mock contains. Each row here answers a question about the layout.
const extremeRecords = [
  {
    TaskTitle:'Review and confirm the updated enterprise agreement coverage for every member at the Northern Rivers depot before the ballot closes',
    MemberName:'Alexandra Constantinou-Whitfield', MemberUrl:'#member-4', MemberId:'104004', TaskPartyId:'104014', TaskOrdinal:'204', IsCompleted:'false',
    TaskDateLabel:'Due 30 September 2026', DueState:'soon', DueLabel:'Due 30 September 2026', TaskUrl:'#task-5', TaskTags:'Bargaining, Coverage',
    TaskNote:'Coverage schedule needs checking against the 2024 classification changes, the depot roster and the three labour-hire arrangements the organiser flagged after the site visit last month.', PriorityBadge:'High Priority'
  },
  {
    TaskTitle:'Ring back', MemberName:'Jo Ng', MemberUrl:'#member-5', MemberId:'104005', TaskPartyId:'104015', TaskOrdinal:'205', IsCompleted:'false',
    TaskDateLabel:'Due today', DueState:'today', DueLabel:'Due today', TaskUrl:'#task-6', TaskTags:'Phone call', TaskNote:'', PriorityBadge:''
  },
  {
    TaskTitle:'Undated follow-up', MemberName:'Taylor Smith', MemberUrl:'#member-3', MemberId:'104003', TaskPartyId:'104013', TaskOrdinal:'203', IsCompleted:'false',
    TaskDateLabel:'', DueState:'none', DueLabel:'', TaskUrl:'#task-7', TaskTags:'',
    TaskNote:'No due date set by the assigning organiser.', PriorityBadge:''
  },
  {
    TaskTitle:'Chase outstanding delegate nomination paperwork', MemberName:'Kerry O’Sullivan', MemberUrl:'#member-6', MemberId:'104006', TaskPartyId:'104016', TaskOrdinal:'206', IsCompleted:'true',
    TaskDateLabel:'Actioned 3 September 2026', DueState:'none', DueLabel:'Due 1 September 2026', TaskUrl:'#task-8', TaskTags:'Paperwork',
    TaskNote:'Signed nomination received and filed.', PriorityBadge:''
  },
  {
    TaskTitle:'Email workplace-entry notice', MemberName:'', MemberUrl:'', MemberId:'', TaskPartyId:'104099', TaskOrdinal:'299', IsCompleted:'false',
    TaskDateLabel:'Due 21 September 2026', DueState:'soon', DueLabel:'Due 21 September 2026', TaskUrl:'#task-9', TaskTags:'Correspondence, Workplace entry', TaskNote:'', PriorityBadge:''
  }
];

const singleRecords = [everydayRecords[0]];

module.exports = [
  {
    id: 'everyday',
    title: 'Everyday list',
    note: 'The normal case. The current row shows title, member and date; the accepted row adds a one-line note, the member as a linked name with a person icon, and a due state on the date. Search, Show completed and the footer come from the real query display controller.',
    panelTitle: 'My tasks',
    classes: 'us-query-search us-task-completed-filter',
    footer: 'Tasks-Query-Footer.html',
    records: everydayRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'accepted', label:'Accepted', template:accepted}, ...proposed]
  },
  {
    id: 'extremes',
    title: 'Content extremes',
    note: 'Long titles, a long member name, a blank member, an undated task and an actioned row. Completed rows are visible here because this stage has no completion filter.',
    panelTitle: 'Content extremes',
    classes: 'us-query-template',
    records: extremeRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'accepted', label:'Accepted', template:accepted}, ...proposed]
  },
  {
    id: 'single',
    title: 'Single row',
    note: 'One result, to read the row’s own padding and height without neighbours or dividers.',
    panelTitle: 'One task',
    classes: 'us-query-template',
    records: singleRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'accepted', label:'Accepted', template:accepted}, ...proposed]
  },
  {
    id: 'outstanding',
    title: 'Outstanding-only template (older format only)',
    note: 'The simpler supported template, where the row supplies the Due prefix and the query supplies only the date. The accepted row carries its own composed date label instead.',
    panelTitle: 'My outstanding tasks',
    classes: 'us-query-template',
    records: [
      {TaskTitle:'Call Alex about renewal', MemberName:'Alex Morgan', DueDate:'10 September 2026'},
      {TaskTitle:'Confirm updated workplace details', MemberName:'Jordan Lee', DueDate:'14 September 2026'},
      {TaskTitle:'Follow up membership application', MemberName:'Taylor Smith', DueDate:'Not set'}
    ],
    variants: [{id:'current', label:'Current', template:'Tasks-Query-Template.html'}]
  }
];
