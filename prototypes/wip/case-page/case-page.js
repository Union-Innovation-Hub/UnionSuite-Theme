// OFFLINE PROTOTYPE ONLY. Never installed in the theme.
// 1. Gives the page the case URL parameters the actions read.
// 2. Renders sample rows through the real author templates in templates/,
//    substituting {#query.Field} the way the Query Template Display does.
// 3. Answers the IQA, CloudToolz and ZenToken requests offline.
// 4. Stands in for the native iMIS popup (ShowDialog_NoReturnValue).
// 5. Simulates native CCO tab selection; in iMIS the theme switches tabs in
//    place (US-CCO-SWITCH), which cannot run from a static file.
// Adapted from prototypes/wip/agreement-page/agreement-page.js.
(() => {
  'use strict';

  // ── Task rows: the shared task columns ───────────────────────
  // The compact task row (US-TASK-ROWS 1.2, owner, 19 October 2026) reads one
  // set of column names on every page. The sample tasks keep the current
  // IQA's columns; this maps them as the renamed IQA will return them, with
  // the long-form date the homepage uses, and sample notes and tags.
  const TASK_NOTES = {};
  const TASK_TAGS = {
      "929": "Correspondence",
      "931": "Evidence, Statement",
      "932": "Evidence, Employer, Records",
      "933": "Membership"
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
  if (!url.searchParams.get('CaseID')) {
    url.searchParams.set('CaseID', 'C217');
    url.searchParams.set('CaseNum', '214');
    try { history.replaceState(null, '', url); } catch (error) { /* optional */ }
  }
  window.gWebsiteKey = '44d4896b-1260-4b32-904e-9f9b4778fd68';
  // Fixed "today" so past and upcoming meetings stay put in the sample.
  window.UnionSuiteQueryStatesConfig = {today: '2026-10-08'};

  // Preview variants (toolbar buttons, kept in the address so a reload or a
  // shared link keeps them). The default is the larger case, so every panel
  // has something to show (owner, 8 October 2026); typical is the usual case,
  // one member and one staff member.
  //   ?member=financial | new | former   the member's standing (default unfinancial)
  //   ?size=typical | new                one member and one staff member, or a
  //                                      case opened today with nothing recorded
  //   ?age=older                         opened in July, no member contact for 21 days
  //   ?lead=none                         no lead staff member
  //   ?case=closed                       closed, with a resolution
  //   ?jobs=former | future | none | single
  //                                      Priya's four jobs (two current, one
  //                                      not started, one former) with the
  //                                      case on the former or the not started
  //                                      one, or not about a workplace; or one
  //                                      job (default: the night shift, a
  //                                      current job)
  // A toolbar press rebuilds the sample data and re-renders in place.
  let standing, size, larger, fresh, older, noLead, closed, jobs;
  // The primary party's iMIS ID; Make primary party changes it.
  let primaryId = '20544';
  // The case's PrimaryWorkplaceID (C42): a job's workplace ID, or blank for
  // not about a workplace (owner, 28 October 2026).
  let caseWorkplaceId = '';
  let member, banner, rows, memberDetails, activity, activityDetails, changes, changeFields, lists, detailsFor, caseJob, caseMemberDetails, leadStaff, setLeadStaff;
  // The activity feeds' base and details IQAs (Activity-Feed-IQA-Build.md).
  const activityFolder = '$/_i4u_/Core/Cases/UnionSuite/Manage Case/Activity Feed - Base/';
  const activityDetailsFolder = '$/_i4u_/Client/Cases - UnionSuite/Layouts/Activity Feed - Details/';
  // Notes and tasks saved inline (C34, C35), kept across rebuilds. A note
  // with a follow-up is also a task (owner, 9 October 2026), so it adds a
  // task row too, marked FromNote so the activity lists it once, as the note.
  const added = {notes: [], tasks: [], meetings: [], staff: [], attachments: [], parties: []};
  // The members at the case's workplace, for Add party's list IQA
  // (C40); Josh is already on the larger case.
  const contacts = [
    {ContactId: '20903', ContactName: 'Josh Kemp', ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Financial', Number: 'Member 20903', Classification: 'Storeperson Grade 1', Plan: 'Full member', MemberStanding: 'New member', MemberStandingTone: 'warning', ContactEmail: 'joshkemp@mailinator.com', ContactPhone: ''},
    {ContactId: '20977', ContactName: 'Sam Okafor', ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Financial', Number: 'Member 20977', Classification: 'Forklift driver', Plan: 'Full member', MemberStanding: '', MemberStandingTone: '', ContactEmail: 'sokafor@mailinator.com', ContactPhone: '0412 555 230'},
    {ContactId: '21033', ContactName: 'Rina Patel', ContactType: 'Member', MemberType: 'Part-time member', MemberStatus: 'Financial', Number: 'Member 21033', Classification: 'Storeperson Grade 2', Plan: 'Part-time member', MemberStanding: '', MemberStandingTone: '', ContactEmail: 'rpatel@mailinator.com', ContactPhone: ''},
    {ContactId: '21108', ContactName: 'Tom Nguyen', ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Unfinancial', Number: 'Member 21108', Classification: 'Team leader', Plan: 'Full member', MemberStanding: 'Unfinancial', MemberStandingTone: 'danger', ContactEmail: '', ContactPhone: '0433 555 914'}
  ];
  // The case Status value list (owner, 28 October 2026): Code is what the
  // case stores, Description what shows, Closed Status whether the row
  // closes the case. "Hold" shows as "On hold", so the menu's mapping
  // shows; Complete is what Resolve case saves.
  const caseStatuses = [
    {Code: 'New', Description: 'New', 'Closed Status': 'false'},
    {Code: 'Open', Description: 'Open', 'Closed Status': 'false'},
    {Code: 'In progress', Description: 'In progress', 'Closed Status': 'false'},
    {Code: 'Hold', Description: 'On hold', 'Closed Status': 'false'},
    {Code: 'Complete', Description: 'Complete', 'Closed Status': 'true'},
    {Code: 'Withdrawn', Description: 'Withdrawn', 'Closed Status': 'true'}
  ];
  // The open case's status, as the quick status change saves it.
  let openStatus = 'Open';
  // The case staff member types value list: value is the code saved,
  // label what shows.
  const staffTypes = [
    {value: 'SUP', label: 'Support'},
    {value: 'ASSIST', label: 'Assisting'},
    {value: 'CM', label: 'Case manager'},
    {value: 'LEGAL', label: 'Legal advice'}
  ];
  // The union's staff and delegates, for CloudToolz's StaffList (C38).
  const directory = [
    {ContactId: '10179', ContactName: 'Andrew O Newnham', Position: 'Industrial officer', Group: 'Case team', Email: 'anewnham@union.example', Phone: '0400 123 450'},
    {ContactId: '10183', ContactName: "Mary O'Conner", Position: 'Industrial officer', Group: 'Case team', Email: 'moconner@mailinator.com', Phone: '(917) 653-6240'},
    {ContactId: '10195', ContactName: 'Dani Sundara', Position: 'Organiser', Group: 'Case team', Email: 'danisundara@mailinator.com', Phone: '0400 123 457'},
    {ContactId: '10201', ContactName: 'Chris Tan', Position: 'Organiser', Group: 'Case team', Email: 'ctan@union.example', Phone: '0400 123 461'},
    {ContactId: '10204', ContactName: 'Jordan Ellis', Position: 'Lawyer', Group: 'Case team', Email: 'jellis@union.example', Phone: '0400 123 464'},
    {ContactId: '10210', ContactName: 'Fatima Rahman', Position: 'Industrial officer', Group: 'Case team', Email: 'frahman@union.example', Phone: '0400 123 470'},
    {ContactId: '10214', ContactName: 'Sam Pereira', Position: 'Member services', Group: 'Case team', Email: 'spereira@union.example', Phone: ''},
    {ContactId: '20417', ContactName: 'Alex Keaton', Position: 'Delegate', Group: 'Delegates', Email: 'alexkeaton@mailinator.com', Phone: ''},
    {ContactId: '20460', ContactName: 'Tom Becker', Position: 'Delegate', Group: 'Delegates', Email: 'tbecker@mailinator.com', Phone: '0433 555 911'}
  ];
  let addedClock = 0;
  // Each member's jobs (C42): the workplace, its type, whether the job is
  // current (Active), not started or finished, its dates, then the Work
  // columns the member card's details IQA shows for the case's job. The
  // jobs IQA (API - Manage Case - Primary Contacts Workplaces, owner,
  // 28 October 2026) returns the first part only, under its own column
  // names; see the /api/query answer below.
  const memberJobs = {
    '20544': [
      {WorkplaceID: '4101', WorkplaceName: 'Dandenong DC – night shift', WorkplaceType: 'Distribution centre', WorkplaceLine: 'Northside Distribution Pty Ltd · Storeperson Grade 2',
        WorkplaceStatus: 'Current', WorkplaceStart: '2020-03-02T00:00:00', WorkplaceEnd: '',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – night shift', 'Work-Classification': 'Storeperson Grade 2', 'Work-Delegate': 'Alex Keaton'},
      {WorkplaceID: '4188', WorkplaceName: 'Frankston Hospital – catering', WorkplaceType: 'Hospital', WorkplaceLine: 'Bayside Health · Food services assistant',
        WorkplaceStatus: 'Current', WorkplaceStart: '2023-08-14T00:00:00', WorkplaceEnd: '',
        'Work-Employer': 'Bayside Health', 'Work-Workplace': 'Frankston Hospital – catering', 'Work-Classification': 'Food services assistant', 'Work-Delegate': 'Tom Becker'},
      // A job Priya has not started yet (owner, 28 October 2026).
      {WorkplaceID: '4210', WorkplaceName: 'Clayton DC – day shift', WorkplaceType: 'Distribution centre', WorkplaceLine: 'Northside Distribution Pty Ltd · Team leader',
        WorkplaceStatus: 'Not Started', WorkplaceStart: '2026-12-07T00:00:00', WorkplaceEnd: '',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Clayton DC – day shift', 'Work-Classification': 'Team leader', 'Work-Delegate': ''},
      // A workplace Priya has left: a case can be about it (G).
      {WorkplaceID: '3907', WorkplaceName: 'Westgate Cold Storage – Laverton', WorkplaceType: 'Cold storage', WorkplaceLine: 'Westgate Logistics Pty Ltd · Storeperson Grade 1',
        WorkplaceStatus: 'Former', WorkplaceStart: '2016-03-07T00:00:00', WorkplaceEnd: '2019-01-25T00:00:00',
        'Work-Employer': 'Westgate Logistics Pty Ltd', 'Work-Workplace': 'Westgate Cold Storage – Laverton', 'Work-Classification': 'Storeperson Grade 1', 'Work-Delegate': 'Dana Whitfield'}
    ],
    '20903': [
      {WorkplaceID: '4102', WorkplaceName: 'Dandenong DC – night shift', WorkplaceType: 'Distribution centre', WorkplaceLine: 'Northside Distribution Pty Ltd · Storeperson Grade 1',
        WorkplaceStatus: 'Current', WorkplaceStart: '2026-09-03T00:00:00', WorkplaceEnd: '',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – night shift', 'Work-Classification': 'Storeperson Grade 1', 'Work-Delegate': 'Alex Keaton'}
    ],
    '20871': [
      {WorkplaceID: '4103', WorkplaceName: 'Dandenong DC – day shift', WorkplaceType: 'Distribution centre', WorkplaceLine: 'Northside Distribution Pty Ltd · Forklift driver',
        WorkplaceStatus: 'Current', WorkplaceStart: '2021-05-03T00:00:00', WorkplaceEnd: '',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – day shift', 'Work-Classification': 'Forklift driver', 'Work-Delegate': 'Alex Keaton'}
    ]
  };
  // The case details' Workbench, which the case's workplace decides.
  const workbenches = {'3907': 'Logistics', '4101': 'Logistics', '4210': 'Logistics', '4102': 'Logistics', '4103': 'Logistics', '4188': 'Health'};
  const jobsOf = id => id === '20544' && jobs === 'single' ? memberJobs[id].slice(0, 1) : memberJobs[id] || [];
  // A member with one job needs no choice: the case takes it (the create
  // and set-primary-party endpoints' rule, C42).
  const onlyJob = id => jobsOf(id).length === 1 ? jobsOf(id)[0].WorkplaceID : '';

  function readVariants() {
    const params = new URL(location.href).searchParams;
    standing = ['financial', 'new', 'former'].includes(params.get('member')) ? params.get('member') : 'unfinancial';
    size = ['typical', 'new'].includes(params.get('size')) ? params.get('size') : 'larger';
    larger = size === 'larger';
    // A case opened today: nothing recorded yet, so every list shows its
    // empty state (C13).
    fresh = size === 'new';
    older = params.get('age') === 'older';
    noLead = params.get('lead') === 'none';
    closed = params.get('case') === 'closed';
    jobs = ['former', 'future', 'none', 'single'].includes(params.get('jobs')) ? params.get('jobs') : 'chosen';
    // The case's PrimaryWorkplaceID: a job, or blank (not about a
    // workplace).
    caseWorkplaceId = primaryId !== '20544' || jobs === 'single' ? onlyJob(primaryId)
      : {chosen: '4101', former: '3907', future: '4210', none: ''}[jobs];
  }

  // The member's standing as each IQA states it: the banner fact, the card's
  // warning (Alert-* columns) and the party tile badge.
  const standings = {
    unfinancial: {fact: 'Unfinancial', tone: 'danger', alert: {title: 'Unfinancial', message: 'Paid to 30 Jun 2026. Check eligibility before providing assistance.'}},
    financial: {fact: '', tone: '', alert: null},
    new: {fact: 'New member', tone: 'warning', alert: {title: 'New member', message: 'Joined 3 Sep 2026, five weeks ago. Check the new member rules before providing assistance.'}},
    former: {fact: 'No longer a member', tone: 'danger', alert: {title: 'No longer a member', message: 'Resigned 14 Aug 2026. Check whether the union can continue to act.'}}
  };
  // The No results HTML each template gives (C13), for a list with no rows.
  const emptyState = (icon, title, text, action) =>
    '<div class="us-placeholder us-placeholder--compact"><span class="us-placeholder__icon" aria-hidden="true"><i class="ti ' + icon + '"></i></span>' +
    '<h3>' + title + '</h3><p>' + text + '</p>' + (action ? '<button type="button" class="' + action + '"></button>' : '') + '</div>';

  function build() {
    member = standings[standing];

    // ── 2. Sample rows (values as the proposed IQAs return them) ──
    // Every party on the sample case. Priya's standing follows the
    // Member toolbar button; the others' are fixed. The larger case adds
    // two members and an employer.
    const memberType = standing === 'former' ? 'Former member' : 'Member';
    const people = [
      {Ordinal: '611', ContactId: '20544', ContactName: 'Priya Natarajan', ContactType: memberType, MemberType: 'Full member', MemberStatus: {unfinancial: 'Unfinancial', financial: 'Financial', new: 'Financial', former: 'Resigned'}[standing], Number: memberType + ' 20544', Plan: 'Full member', MemberStanding: member.fact, MemberStandingTone: member.tone, ContactEmail: 'priya.n@mailinator.com', ContactPhone: '0412 555 019'},
      ...(larger ? [
        {Ordinal: '612', ContactId: '20903', ContactName: 'Josh Kemp', ContactType: 'Member', MemberType: 'Full member', MemberStatus: 'Financial', Number: 'Member 20903', Plan: 'Full member', MemberStanding: 'New member', MemberStandingTone: 'warning', ContactEmail: 'joshkemp@mailinator.com', ContactPhone: ''},
        {Ordinal: '615', ContactId: '20871', ContactName: 'Lee Hartley', ContactType: 'Former member', MemberType: 'Full member', MemberStatus: 'Resigned', Number: 'Former member 20871', Plan: '', MemberStanding: 'Former member', MemberStandingTone: 'danger', ContactEmail: '', ContactPhone: '0433 555 802'},
        {Ordinal: '613', ContactId: '30112', ContactName: 'Northside Distribution Pty Ltd', ContactType: 'Employer', MemberType: 'Employer', MemberStatus: '', Number: 'Employer 30112', Plan: '', MemberStanding: '', MemberStandingTone: '', ContactEmail: 'hr@northside.example', ContactPhone: '(03) 9555 0140'}
      ] : []),
      // Parties added inline (C40), after the sample's.
      ...added.parties
    ];
    // The primary party: Priya unless Make primary party chose
    // someone else (primaryId); a choice no longer on the case falls back.
    const primary = people.find(person => person.ContactId === primaryId) || people[0];
    const ordered = [primary, ...people.filter(person => person !== primary)];
    const others = ordered.slice(1).map(person => person.ContactName);
    const url = person => '/Party.aspx?ID=' + person.ContactId;
    const line = person => person.Number + (person.Plan ? ' · ' + person.Plan : '');

    banner = {
      CaseID: 'C217',
      CaseTitle: 'Bullying complaint – Northside Distribution night shift',
      Status: closed ? 'Complete' : openStatus,
      // The primary party, in the top row (owner, 8 October 2026: one
      // of the most important things on the page).
      MemberName: primary.ContactName,
      MemberUrl: url(primary),
      MemberLine: primary.Number,
      MemberStanding: primary.MemberStanding,
      MemberStandingTone: primary.MemberStandingTone
    };

    rows = {
      // The primary party, from their record (Case - Primary Member).
      member: [{
        CaseNum: '214',
        MemberId: primary.ContactId,
        MemberName: primary.ContactName,
        // C42: which job the case is about (the jobs IQA gives the count).
        PrimaryWorkplaceID: caseWorkplaceId,
        MemberUrl: url(primary),
        MemberLine: line(primary),
        OtherParties: others.length
          ? 'Also on this case: ' + others.slice(0, -1).join(', ') + (others.length > 1 ? ' and ' : '') + others[others.length - 1] + '.'
          : ''
      }],
      // Every party, the primary first (the IQA's sort).
      parties: ordered.map(person => ({
        ...person,
        ContactUrl: url(person),
        MemberLine: line(person),
        ContactIsLead: person === primary ? 'true' : 'false',
        ContactRole: person === primary ? 'Primary party' : 'Party'
      })),
      staff: [
        ...(noLead ? [] : [{Ordinal: '701', ContactId: '10183', ContactName: "Mary O'Conner", ContactUrl: '/Party.aspx?ID=10183', ContactIsLead: 'true', ContactRole: 'Case manager', ContactType: 'Industrial officer', ContactGroup: 'Case team', ContactGroupOrder: '1', ContactGroupTone: 'info', ContactEmail: 'moconner@mailinator.com', ContactPhone: '(917) 653-6240'}]),
        ...(larger || noLead ? [{Ordinal: '702', ContactId: '10195', ContactName: 'Dani Sundara', ContactUrl: '/Party.aspx?ID=10195', ContactIsLead: 'false', ContactRole: 'Support', ContactType: 'Organiser', ContactGroup: 'Case team', ContactGroupOrder: '1', ContactGroupTone: 'info', ContactEmail: 'danisundara@mailinator.com', ContactPhone: '0400 123 457'}] : []),
        ...(larger ? [{Ordinal: '705', ContactId: '20417', ContactName: 'Alex Keaton', ContactUrl: '/Party.aspx?ID=20417', ContactIsLead: 'false', ContactRole: 'Assisting', ContactType: 'Delegate', ContactGroup: 'Delegates', ContactGroupOrder: '2', ContactGroupTone: 'success', ContactEmail: 'alexkeaton@mailinator.com', ContactPhone: ''}] : [])
      ],
      // Each task with what the Activity tab's detailed rows and the task
      // feed sources show: description, when and by whom created and done.
      tasks: [
        {Ordinal: '931', Note: 'Get a written statement from Priya', TAskCheckCSS: '', TaskStatusCSS: 'overdue', Deadline: '6/10/2026', OverdueText: ' - Overdue', AssignedTo: "Mary O'Conner", PriorityBadge: 'High Priority',
          Description: 'Dates, times and who was present for each incident since July, and the names of the two co-workers who saw one. Signed and dated.',
          CreatedIso: '2026-10-07T17:30:00', CreatedBy: 'Andrew O Newnham', CreatedText: '7 Oct 2026 by Andrew O Newnham', CompletedIso: '', CompletedBy: '', CompletedText: ''},
        {Ordinal: '932', Note: 'Request the roster and CCTV log for 22 September', TAskCheckCSS: '', TaskStatusCSS: 'outstanding', Deadline: '15/10/2026', OverdueText: '', AssignedTo: "Mary O'Conner", PriorityBadge: '',
          Description: 'Ask HR in writing; the employer keeps CCTV for 30 days, so it must be requested before 22 October.',
          CreatedIso: '2026-10-08T14:20:00', CreatedBy: "Mary O'Conner", CreatedText: "8 Oct 2026 by Mary O'Conner", CompletedIso: '', CompletedBy: '', CompletedText: ''},
        {Ordinal: '933', Note: 'Confirm membership standing before the employer meeting', TAskCheckCSS: '', TaskStatusCSS: 'outstanding', Deadline: '13/10/2026', OverdueText: '', AssignedTo: "Mary O'Conner", PriorityBadge: '',
          Description: 'Priya is paid to 30 June; check the payment link has been used.',
          CreatedIso: '2026-10-08T14:35:00', CreatedBy: "Mary O'Conner", CreatedText: "8 Oct 2026 by Mary O'Conner", CompletedIso: '', CompletedBy: '', CompletedText: ''},
        {Ordinal: '929', Note: 'Send the member the bullying fact sheet', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '8/10/2026', OverdueText: '', AssignedTo: 'Andrew O Newnham', PriorityBadge: '',
          Description: '',
          CreatedIso: '2026-10-07T17:25:00', CreatedBy: 'Andrew O Newnham', CreatedText: '7 Oct 2026 by Andrew O Newnham', CompletedIso: '2026-10-07T17:40:00', CompletedBy: 'Andrew O Newnham', CompletedText: '7 Oct 2026 by Andrew O Newnham'},
        {Ordinal: '928', Note: 'Acknowledge the complaint', TAskCheckCSS: 'done', TaskStatusCSS: 'actioned', Deadline: '8/10/2026', OverdueText: '', AssignedTo: "Mary O'Conner", PriorityBadge: '',
          Description: 'Within two working days, as the service standard says.',
          CreatedIso: '2026-10-07T17:06:00', CreatedBy: 'Andrew O Newnham', CreatedText: '7 Oct 2026 by Andrew O Newnham', CompletedIso: '2026-10-08T09:10:00', CompletedBy: "Mary O'Conner", CompletedText: "8 Oct 2026 by Mary O'Conner"}
      ],
      meetings: [
        {Ordinal: '41', 'Date-ISO': '2026-10-14', 'Date-Month': 'Oct', 'Date-Day': '14', MeetingTitle: 'Employer meeting – Bullying', MeetingType: 'Employer meeting', Matter: 'Bullying', 'Date-Time': '10:00 AM', Location: 'Northside Distribution, Dandenong',
          Attendees: "Mary O'Conner, Alex Keaton, Northside HR Manager", Description: 'Raise the pattern of comments since July and ask for the supervisor to be moved off the night shift while it is investigated. Do not name the co-workers.', Outcome: ''},
        {Ordinal: '40', 'Date-ISO': '2026-10-07', 'Date-Month': 'Oct', 'Date-Day': '7', MeetingTitle: 'First interview with Priya', MeetingType: 'Member interview', Matter: 'Bullying', 'Date-Time': '04:30 PM', Location: 'Phone',
          Attendees: 'Priya Natarajan, Andrew O Newnham', Description: 'First account of the incidents, what Priya wants from the union, and what she is willing to have raised with the employer.', Outcome: 'Priya will keep a diary of incidents and send the messages she has kept. Agreed the union contacts the employer after her statement.'}
      ],
      notes: [
        {Ordinal: '951', Iso: '2026-10-08T16:20:00', CreatedOn: '8/10/2026', CreatedTime: '4:20 pm', CreatedBy: "Mary O'Conner", Priority: '', AccessClass: '', NoteClass: '', Note: 'Employer HR confirmed the meeting for 14 October at 10 am. They asked for the complaint in writing beforehand; told them we will bring a summary to the meeting instead.', Category: 'Employer', Staff: "Mary O'Conner", Members: '', FollowUpRequired: 'true', FollowUpDate: '2026-10-13', FollowUpActioned: '', FollowUpNotes: 'Send HR the one-page summary before the meeting.', FollowUpText: 'Follow-up 13 Oct', FollowUpTone: ''},
        {Ordinal: '949', Iso: '2026-10-08T15:05:00', CreatedOn: '8/10/2026', CreatedTime: '3:05 pm', CreatedBy: 'Dani Sundara', Priority: '', AccessClass: '', NoteClass: '', Note: 'Spoke to the site delegate. Two night shift workers are willing to give statements if they stay anonymous until the meeting.', Category: 'Case', Staff: 'Dani Sundara', Members: 'Alex Keaton', FollowUpRequired: '', FollowUpDate: '', FollowUpActioned: '', FollowUpNotes: '', FollowUpText: '', FollowUpTone: ''},
        {Ordinal: '947', Iso: '2026-10-08T14:30:00', CreatedOn: '8/10/2026', CreatedTime: '2:30 pm', CreatedBy: "Mary O'Conner", Priority: 'High', AccessClass: '', NoteClass: '', Note: 'Membership: Priya is paid to 30 June. She says the direct debit failed when her bank changed. Sent her the payment link; check before the employer meeting.', Category: 'Membership', Staff: "Mary O'Conner", Members: 'Priya Natarajan', FollowUpRequired: 'true', FollowUpDate: '2026-10-06', FollowUpActioned: '', FollowUpNotes: 'Check the payment link has been used.', FollowUpText: 'Overdue 6 Oct', FollowUpTone: 'warning'},
        {Ordinal: '944', Iso: '2026-10-08T13:40:00', CreatedOn: '8/10/2026', CreatedTime: '1:40 pm', CreatedBy: "Mary O'Conner", Priority: '', AccessClass: '', NoteClass: '', Note: 'Took over as lead. Called Priya to introduce myself; she is happy for the union to contact the employer.', Category: 'Case', Staff: '', Members: 'Priya Natarajan', FollowUpRequired: '', FollowUpDate: '', FollowUpActioned: '', FollowUpNotes: '', FollowUpText: '', FollowUpTone: ''},
        {Ordinal: '941', Iso: '2026-10-07T17:12:00', CreatedOn: '7/10/2026', CreatedTime: '5:12 pm', CreatedBy: 'Andrew O Newnham', Priority: 'High', AccessClass: '', NoteClass: '', Note: 'Priya reports repeated comments from the night shift supervisor about her accent and work rate since July. Two other workers on the shift saw at least one incident. She does not want the supervisor told who raised it until the union has met the employer.', Category: 'Intake', Staff: 'Andrew O Newnham', Members: 'Priya Natarajan', FollowUpRequired: '', FollowUpDate: '', FollowUpActioned: '', FollowUpNotes: '', FollowUpText: '', FollowUpTone: ''},
        {Ordinal: '940', Iso: '2026-10-07T17:05:00', CreatedOn: '7/10/2026', CreatedTime: '5:05 pm', CreatedBy: 'Andrew O Newnham', Priority: '', AccessClass: 'restricted', NoteClass: 'us-restricted-note', Note: 'Restricted', Category: 'Intake', Staff: 'Andrew O Newnham', Members: '', FollowUpRequired: '', FollowUpDate: '', FollowUpActioned: '', FollowUpNotes: '', FollowUpText: '', FollowUpTone: ''},
        {Ordinal: '938', Iso: '2026-10-07T16:45:00', CreatedOn: '7/10/2026', CreatedTime: '4:45 pm', CreatedBy: 'Andrew O Newnham', Priority: '', AccessClass: '', NoteClass: '', Note: 'First call from Priya. Advised her to keep a diary of incidents with dates, times and who was there.', Category: 'Intake', Staff: '', Members: 'Priya Natarajan', FollowUpRequired: 'true', FollowUpDate: '2026-10-08', FollowUpActioned: 'true', FollowUpNotes: 'Send the bullying fact sheet.', FollowUpText: 'Follow-up done', FollowUpTone: 'success'}
      ],
      emails: [
        {EmailKey: 'e3', Direction: 'out', DirectionLabel: 'Outgoing', Party: 'To Northside Distribution', SentBy: "Mary O'Conner", Subject: 'Meeting request – concerns raised by a member on night shift', Preview: 'We would like to meet to discuss concerns raised by a member working the night shift.', EmailDate: '8 Oct 2026', EmailTime: '2:15 pm', Recipients: 'hr@northside.example', AttachmentLabel: '', RecordUrl: '#activity'},
        {EmailKey: 'e2', Direction: 'in', DirectionLabel: 'Incoming', Party: 'From Priya Natarajan', SentBy: 'Andrew O Newnham', Subject: 'Re: Your complaint – next steps', Preview: 'Thanks for calling back. I have attached the messages I mentioned.', EmailDate: '7 Oct 2026', EmailTime: '6:48 pm', Recipients: 'cases@union.example', AttachmentLabel: '2 attachments', RecordUrl: '#activity'},
        {EmailKey: 'e1', Direction: 'out', DirectionLabel: 'Outgoing', Party: 'To Priya Natarajan', SentBy: 'Andrew O Newnham', Subject: 'Your complaint – next steps', Preview: 'Thank you for contacting the union. A staff member will be in touch within two working days.', EmailDate: '7 Oct 2026', EmailTime: '5:20 pm', Recipients: 'priya.n@mailinator.com', AttachmentLabel: '', RecordUrl: '#activity'}
      ],
      // Newest first, as the IQAs sort them; CreatedIso dates the activity card.
      attachments: [
        ...(larger ? [
          {Ordinal: '804', FileName: 'Northside reply to meeting request', TagNames: 'Logged Email,Cases', TagOrdinals: '2,3', UniqueID: '01S3AQU4B7KQ2VXN5M4RJ8TLP6WZC3HD9E', EntityCode: 'DEMO', CreatedBy: "Mary O'Conner", CreatedOn: '8/10/2026', CreatedIso: '2026-10-08T16:05:00', AccessClass: ''},
          {Ordinal: '803', FileName: 'Statement – Priya Natarajan', TagNames: 'Logged Document,Cases', TagOrdinals: '1,3', UniqueID: '01S3AQU4H2MW8YQC6R5TXK9PLD4ZN7BF3J', EntityCode: 'DEMO', CreatedBy: "Mary O'Conner", CreatedOn: '8/10/2026', CreatedIso: '2026-10-08T15:30:00', AccessClass: 'restricted'}
        ] : []),
        {Ordinal: '802', FileName: 'Night shift roster September', TagNames: 'Documentation', TagOrdinals: '14', UniqueID: '01S3AQU4D2H5ZDQULL6VDZVWZKMDKTZSKW', EntityCode: 'DEMO', CreatedBy: "Mary O'Conner", CreatedOn: '8/10/2026', CreatedIso: '2026-10-08T09:20:00', AccessClass: ''},
        {Ordinal: '801', FileName: 'Text messages from supervisor', TagNames: 'Logged Document,Cases', TagOrdinals: '1,3', UniqueID: '01S3AQU4FL33YVW46I3ND2RIHLJKS5ZW6H', EntityCode: 'DEMO', CreatedBy: 'Andrew O Newnham', CreatedOn: '7/10/2026', CreatedIso: '2026-10-07T18:52:00', AccessClass: 'restricted'}
      ]
    };

    if (fresh) {
      rows.tasks = [];
      rows.meetings = [];
      rows.notes = [];
      rows.emails = [];
      rows.attachments = [];
    }

    // d/m/yyyy (the task rows' Deadline) as yyyy-mm-dd.
    const isoDate = text => {
      const [day, month, year] = String(text || '').split('/');
      return year ? year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0') : '';
    };

    // A task is a note with a follow-up (owner, 9 October 2026): on the
    // Activity tab it is one of the notes, in the timeline and the ledger,
    // with the follow-up badge saying when it is due or that it is done.
    const shortDay = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-AU', {day: 'numeric', month: 'short'});
    const taskNote = task => {
      const due = isoDate(task.Deadline);
      const done = task.TAskCheckCSS === 'done';
      const overdue = !done && due && due < '2026-10-08';
      const created = new Date(task.CreatedIso);
      return {
        Ordinal: task.Ordinal, Iso: task.CreatedIso,
        CreatedOn: created.getDate() + '/' + (created.getMonth() + 1) + '/' + created.getFullYear(),
        CreatedTime: created.toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit'}).toLowerCase(),
        CreatedBy: task.CreatedBy, Priority: task.PriorityBadge ? 'High' : '', AccessClass: '', NoteClass: '',
        Note: task.Note + (task.Description ? '\n' + task.Description : ''), Category: 'Task',
        Staff: task.AssignedTo, Members: '',
        FollowUpRequired: 'true', FollowUpDate: due, FollowUpActioned: done ? 'true' : '', FollowUpNotes: '',
        FollowUpText: done ? 'Follow-up done' : (overdue ? 'Overdue ' : 'Follow-up ') + shortDay(due),
        FollowUpTone: done ? 'success' : overdue ? 'warning' : ''
      };
    };
    // Tasks list oldest outstanding first (owner, 9 October 2026), so a new
    // task joins the end of the outstanding ones (C40);
    // completed tasks stay after them.
    // Staff added inline (C38) join the case team or the delegates.
    rows.staff = [...rows.staff, ...added.staff];
    // Attachments uploaded inline (C39), newest first.
    rows.attachments = [...added.attachments, ...rows.attachments];
    // Meetings saved inline (C37) join the list in date order.
    rows.meetings = [...rows.meetings, ...added.meetings].sort((a, b) => a['Date-ISO'].localeCompare(b['Date-ISO']));
    rows.tasks = [...rows.tasks.filter(task => task.TAskCheckCSS !== 'done'), ...added.tasks,
      ...rows.tasks.filter(task => task.TAskCheckCSS === 'done')];
    rows.notes = [...rows.notes, ...added.notes, ...rows.tasks.filter(task => !task.FromNote).map(taskNote)].sort((a, b) => b.Iso.localeCompare(a.Iso));

    // The member card's details (the client's API - Manage Case - Primary
    // Party Details, filtered on CaseNum; the Parties tab's are API - Manage
    // Case - Party Details, filtered on the party's ID): the warning, then grouped fields, all from column names.
    memberDetails = {
      ...(member.alert ? {'Alert-Title': member.alert.title, 'Alert-Message': member.alert.message, 'Alert-Tone': member.tone} : {}),
      'Contact-Mobile': '0412 555 019',
      'Contact-Email': 'priya.n@mailinator.com',
      'Membership-Paid to': standing === 'unfinancial' ? '2026-06-30T00:00:00' : '2027-06-30T00:00:00',
      'Membership-Joined': standing === 'new' ? '2026-09-03T00:00:00' : '2019-02-11T00:00:00',
      'Work-Employer': 'Northside Distribution Pty Ltd',
      'Work-Workplace': 'Dandenong DC – night shift',
      'Work-Classification': 'Storeperson Grade 2',
      'Work-Delegate': 'Alex Keaton'
    };
    const otherDetails = {
      '20903': {'Alert-Title': 'New member', 'Alert-Message': 'Joined 3 Sep 2026, five weeks ago. Check the new member rules before providing assistance.', 'Alert-Tone': 'warning',
        'Contact-Mobile': '', 'Contact-Email': 'joshkemp@mailinator.com', 'Membership-Paid to': '2027-06-30T00:00:00', 'Membership-Joined': '2026-09-03T00:00:00',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – night shift', 'Work-Classification': 'Storeperson Grade 1', 'Work-Delegate': 'Alex Keaton'},
      '20871': {'Alert-Title': 'No longer a member', 'Alert-Message': 'Resigned 14 Aug 2026. Check whether the union can continue to act.', 'Alert-Tone': 'danger',
        'Contact-Mobile': '0433 555 802', 'Contact-Email': '', 'Membership-Paid to': '2026-08-14T00:00:00', 'Membership-Joined': '2021-05-03T00:00:00',
        'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – day shift', 'Work-Classification': 'Forklift driver', 'Work-Delegate': 'Alex Keaton'},
      // An employer: the same IQA returns the organisation's fields.
      '30112': {'Contact-Phone': '(03) 9555 0140', 'Contact-Email': 'hr@northside.example', 'Contact-HR contact': 'Sam Whitlock',
        'Organisation-ABN': '51 824 753 556', 'Organisation-Site': 'Dandenong DC, 14 Frankston Road, Dandenong VIC 3175', 'Organisation-Members on site': '42'}
    };
    detailsFor = id => id === '20544' ? memberDetails : otherDetails[id];
    // The case's workplace (C42): the job PrimaryWorkplaceID names.
    caseJob = () => jobsOf(primary.ContactId).find(job => job.WorkplaceID === caseWorkplaceId) || null;
    // The member card's IQA is the case's (filter CaseNum, C42): the
    // primary party's details with the Work fields from the case's job,
    // blank when the case is not about a workplace.
    caseMemberDetails = () => {
      const details = {...(detailsFor(primary.ContactId) || {})};
      const job = caseJob();
      Object.keys(details).filter(column => column.startsWith('Work-')).forEach(column => { details[column] = job?.[column] ?? ''; });
      return details;
    };

    // Recent activity (US-ACTIVITY-FEED): one list per source IQA, in the
    // feed's fixed columns, filtered on CaseNum.
    activity = {
      // Restricted notes too, as "Restricted" (C29); follow-ups as the
      // theme's follow-up columns.
      'Notes': rows.notes.map(note => ({
        ActivityKey: note.Ordinal,
        ActivityDate: note.Iso,
        Subject: '', Summary: note.Note, Detail: '', CreatedBy: note.CreatedBy, Category: note.Category, Priority: note.Priority, RecordUrl: '#activity',
        FollowUpRequired: note.FollowUpRequired, FollowUpDate: note.FollowUpDate, FollowUpActioned: note.FollowUpActioned, FollowUpNotes: note.FollowUpNotes
      })),
      // Sent from iMIS (i4u_UT_Cases_Communications): always outgoing.
      'Emails Sent': [
        {ActivityKey: '503', ActivityDate: '2026-10-08T14:15:00', Subject: 'Meeting request – concerns raised by a member on night shift', Summary: '2 recipients · 2 sent', Category: 'Staff', Detail: '', CreatedBy: "Mary O'Conner",
          CommunicationLogKey: 'log-503', Audience: 'Staff', Recipients: '2', Delivered: '2', NotSent: '0'},
        {ActivityKey: '501', ActivityDate: '2026-10-07T17:20:00', Subject: 'Your complaint – next steps', Summary: '1 recipient · 1 sent', Category: 'Parties', Detail: '', CreatedBy: 'Andrew O Newnham',
          CommunicationLogKey: 'log-501', Audience: 'Parties', Recipients: '1', Delivered: '1', NotSent: '0'}
      ],
      // Logged through the Outlook plugin, either way; the stored email opens
      // as an attachment does (the Data-us-file-* columns).
      'Emails Logged': [
        {ActivityKey: '502', ActivityDate: '2026-10-07T18:48:00', Subject: 'Re: Your complaint – next steps', Summary: 'From priya.n@mailinator.com', Direction: 'In', Category: 'Logged from Outlook', Detail: '', CreatedBy: 'Andrew O Newnham',
          'Data-us-file-id': '01S3AQU4EMAIL502', 'Data-us-file-branch': 'DEMO', 'Data-us-file-name': 'Re: Your complaint – next steps'},
        {ActivityKey: '506', ActivityDate: '2026-10-08T15:02:00', Subject: 'Re: Meeting request – concerns raised by a member on night shift', Summary: 'To hr@northside.example', Direction: 'Out', Category: 'Logged from Outlook', Detail: '', CreatedBy: "Mary O'Conner",
          'Data-us-file-id': '01S3AQU4EMAIL506', 'Data-us-file-branch': 'DEMO', 'Data-us-file-name': 'Re: Meeting request – concerns raised by a member on night shift'}
      ],
      // A card when each file was added (C26), tags as the detail line.
      'Attachments': rows.attachments.map(file => ({
        ActivityKey: file.Ordinal, ActivityDate: file.CreatedIso, Subject: file.FileName,
        Summary: file.TagNames.split(',').filter(Boolean).join(' · '), Detail: '', CreatedBy: file.CreatedBy,
        'Data-us-file-id': file.UniqueID, 'Data-us-file-branch': file.EntityCode, 'Data-us-file-name': file.FileName
      })),
      // Detail is the description (headed Description by the source).
      'Meetings': [
        ...added.meetings.map(meeting => ({ActivityKey: meeting.Ordinal, ActivityDate: meeting['Date-ISO'] + 'T' + (meeting.Time24 || '09:00') + ':00',
          Subject: meeting.Matter, Summary: '', Detail: '', CreatedBy: meeting.CreatedBy, RecordUrl: '#overview'})),
        {ActivityKey: '40', ActivityDate: '2026-10-07T16:30:00', Subject: 'Member interview', Summary: 'Phone interview with Priya about the incidents since July.',
          Detail: 'First account of the incidents, what Priya wants from the union, and what she is willing to have raised with the employer.', CreatedBy: 'Andrew O Newnham', RecordUrl: '#overview'}
      ]
    };

    // The details IQAs (data-details), one row per ActivityKey: each
    // Additional-* column is a line in the card's expanded view.
    activityDetails = {
      'Notes Details': Object.fromEntries(rows.notes.map(note => [note.Ordinal, {'Additional-Staff': note.Staff, 'Additional-Members': note.Members}])),
      'Emails Sent Details': {
        '503': {'Additional-Subject': 'Case C217 – Meeting request – concerns raised by a member on night shift', 'Additional-Type': ''},
        '501': {'Additional-Subject': 'Case C217 – Your complaint – next steps', 'Additional-Type': ''}
      },
      'Emails Logged Details': {
        '502': {'Additional-From': 'priya.n@mailinator.com', 'Additional-To': 'cases@union.example', 'Additional-Cc': ''},
        '506': {'Additional-From': 'moconner@union.example', 'Additional-To': 'hr@northside.example', 'Additional-Cc': 'dsundara@union.example'}
      },
      'Meetings Details': {
        ...Object.fromEntries(added.meetings.map(meeting => [meeting.Ordinal, {'Additional-Location': meeting.Location, 'Additional-Attendees': ''}])),
        '40': {'Additional-Location': 'Phone', 'Additional-Attendees': 'Priya Natarajan, Andrew O Newnham'}
      }
    };

    if (older) {
      activity.Notes.push(
        {ActivityKey: '901', ActivityDate: '2026-08-12T10:20:00', Subject: '', Summary: 'Employer cancelled the August meeting; asked to reschedule after the roster review.', Detail: '', CreatedBy: "Mary O'Conner", Category: 'Employer', Priority: '', RecordUrl: '#activity'},
        {ActivityKey: '900', ActivityDate: '2026-07-02T09:05:00', Subject: '', Summary: 'First call from Priya about comments from the night shift supervisor.', Detail: '', CreatedBy: 'Andrew O Newnham', Category: 'Intake', Priority: '', RecordUrl: '#activity'}
      );
    }

    // The change history (the guide's Change-History-Query-Template.html):
    // one row per save, newest first, as the case's change history IQA
    // returns it from the change log.
    changes = [
      {ChangeKey: 'save-8', Action: 'Add', Event: 'Meeting added', Summary: 'Hearing preparation', ChangedBy: "Mary O'Conner", ChangeDay: '8 Oct 2026', ChangeTime: '3:10 pm'},
      {ChangeKey: 'save-7', Action: 'Edit', Event: 'Staff updated', Summary: '1 field', ChangedBy: 'Andrew O Newnham', ChangeDay: '8 Oct 2026', ChangeTime: '1:48 pm'},
      {ChangeKey: 'save-6', Action: 'Edit', Event: 'Case updated', Summary: '2 fields', ChangedBy: "Mary O'Conner", ChangeDay: '8 Oct 2026', ChangeTime: '11:02 am'},
      ...(larger ? [
        {ChangeKey: 'save-5', Action: 'Add', Event: 'Party added', Summary: 'Lee Hartley (20871)', ChangedBy: 'Andrew O Newnham', ChangeDay: '8 Oct 2026', ChangeTime: '10:40 am'},
        {ChangeKey: 'save-4', Action: 'Delete', Event: 'Staff removed', Summary: 'Dani Sundara (10233)', ChangedBy: "Mary O'Conner", ChangeDay: '8 Oct 2026', ChangeTime: '9:10 am'}
      ] : []),
      {ChangeKey: 'save-3', Action: 'Edit', Event: 'Case updated', Summary: '1 field', ChangedBy: 'Andrew O Newnham', ChangeDay: '7 Oct 2026', ChangeTime: '5:30 pm'},
      {ChangeKey: 'save-2', Action: 'Edit', Event: 'Case updated', Summary: '3 fields', ChangedBy: 'Andrew O Newnham', ChangeDay: '7 Oct 2026', ChangeTime: '5:06 pm'},
      {ChangeKey: 'save-1', Action: 'Add', Event: 'Case created', Summary: 'Bullying complaint', ChangedBy: 'Andrew O Newnham', ChangeDay: '7 Oct 2026', ChangeTime: '5:04 pm'}
    ];
    if (fresh) changes = changes.filter(change => change.ChangeKey === 'save-1');

    // The fields IQA's rows for each save, as the change log stores them:
    // the logged field names and the logging flow's US date text.
    changeFields = {
      'save-8': [
        {Field: 'Title', OldValue: '', NewValue: 'Hearing preparation'},
        {Field: 'Location', OldValue: '', NewValue: ''},
        {Field: 'MeetingDate', OldValue: '', NewValue: '10/14/2026 9:30:00 AM'},
        {Field: 'MeetingType', OldValue: '', NewValue: 'General'}
      ],
      'save-7': [{Field: 'LeadStaff', OldValue: 'Andrew O Newnham', NewValue: "Mary O'Conner"}],
      'save-6': [
        {Field: 'Priority', OldValue: 'Lowest', NewValue: 'High'},
        {Field: 'IncidentDate', OldValue: '', NewValue: '9/22/2026 12:00:00 AM'}
      ],
      'save-5': [{Field: 'Name', OldValue: '', NewValue: 'Lee Hartley (20871)'}, {Field: 'Role', OldValue: '', NewValue: 'Party'}],
      'save-3': [{Field: 'Status', OldValue: 'New', NewValue: 'Open'}],
      'save-2': [
        {Field: 'Type', OldValue: 'General enquiry', NewValue: 'Bullying / Harassment'},
        {Field: 'Subtype', OldValue: '', NewValue: 'Supervisor conduct'},
        {Field: 'Source', OldValue: '', NewValue: 'Member phone call'}
      ],
      'save-1': [
        {Field: 'Title', OldValue: '', NewValue: 'Bullying complaint'},
        {Field: 'Type', OldValue: '', NewValue: 'General enquiry'},
        {Field: 'Priority', OldValue: '', NewValue: 'Lowest'}
      ]
    };

    leadStaff = () => rows.staff.find(row => row.ContactIsLead === 'true')?.ContactName || '';
    setLeadStaff = ordinal => {
      rows.staff.forEach(row => { row.ContactIsLead = row.Ordinal === ordinal ? 'true' : 'false'; });
      rows.staff.sort((a, b) => (b.ContactIsLead === 'true') - (a.ContactIsLead === 'true'));
    };

    // Which template fills which list.
    lists = [
      {set: 'cp-banner', template: 'Case-Banner-Query-Template.html', rows: [banner], bare: true},
      // Resolved cases only: the source IQA returns no row while the case is
      // open, and iMIS writes the No results field (the C6 marker) instead.
      {set: 'cp-resolved', template: 'Case-Resolved-Query-Template.html', rows: closed ? [{CaseNum: '214'}] : [], empty: '<span class="us-case-unresolved" hidden></span>'},
      // The member card's template is the guide's (US-CASE-WORKPLACE is in the theme).
      {set: 'cp-member', template: 'Case-Member-Query-Template.html', src: '../../../Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html', rows: rows.member},
      {set: 'cp-recent', template: 'Case-Recent-Activity-Query-Template.html', rows: [{Ordinal: '214'}]},
      {set: 'cp-all-activity', template: 'Case-All-Activity-Query-Template.html', rows: [{Ordinal: '214'}]},
      // The change history template is the guide's (US-CHANGE-FIELDS is in the theme).
      {set: 'cp-changes', template: 'Change-History-Query-Template.html', src: '../../../Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html', rows: changes,
        empty: '<p>No changes recorded yet.</p>'},
      // The parties template is the guide's (US-CASE-PARTIES is in the theme).
      {set: 'cp-parties', template: 'Case-Parties-Query-Template.html', src: '../../../Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html', rows: rows.parties},
      {set: 'cp-staff', template: 'Case-Staff-Query-Template.html', rows: rows.staff},
      {set: 'cp-tasks', template: 'Case-Tasks-Query-Template.html', rows: rows.tasks.map(taskColumns), empty: emptyState('ti-checklist', 'No tasks yet', 'Add the first step for this case.', 'us-action-cases-add-task')},
      {set: 'cp-meetings-detail', template: 'Case-Meetings-Detail-Query-Template.html', rows: rows.meetings, empty: emptyState('ti-calendar-plus', 'No meetings', 'Schedule one to meet the member or the employer.', 'us-action-cases-add-meeting')},
      {set: 'cp-meetings', template: 'Case-Meetings-Query-Template.html', rows: rows.meetings, empty: emptyState('ti-calendar-plus', 'No meetings', 'Schedule one to meet the member or the employer.', 'us-action-cases-add-meeting')},
      {set: 'cp-notes', template: 'Case-Notes-Ledger-Query-Template.html', rows: rows.notes, empty: emptyState('ti-notes', 'No notes yet', 'Record calls and conversations as notes.', 'us-action-cases-add-note')},
      // The Overview's newest three (C26), each row with the case's file count.
      {set: 'cp-attachments-recent', template: 'Case-Attachments-Recent-Query-Template.html', rows: rows.attachments.slice(0, 3), empty: emptyState('ti-paperclip', 'No attachments yet', 'Upload statements, letters and other documents.', 'us-action-cases-add-attachment')},
      {set: 'cp-attachments', template: 'Case-Attachments-Query-Template.html', rows: rows.attachments, empty: emptyState('ti-paperclip', 'No attachments yet', 'Upload statements, letters and other documents.', 'us-action-cases-add-attachment')}
    ];
  }

  readVariants();
  build();

  const escapeHtml = value => String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  // Same substitution the Query Template Display performs; an unselected
  // field fails loudly here, as a reminder the IQA must select it.
  function fill(template, row) {
    return template.replace(/\{#query\.([A-Za-z0-9_-]+)( noencode)?\}/g, (_, field, raw) => {
      if (!(field in row)) throw new Error('Sample row has no ' + field + ' — the IQA must select it.');
      return raw ? String(row[field] ?? '') : escapeHtml(row[field]);
    });
  }

  const nativeFetch = window.fetch.bind(window);
  const templates = new Map();

  async function renderList(list, root = document) {
    if (!templates.has(list.template)) {
      // The standalone export embeds the templates (build-standalone.cjs);
      // the served page fetches them.
      const embedded = window.UnionSuiteCaseTemplates?.[list.template];
      const text = embedded ?? await (await nativeFetch(list.src || 'templates/' + list.template)).text();
      templates.set(list.template, text.replace(/<!--[\s\S]*?-->/g, '').trim());
    }
    const template = templates.get(list.template);
    const set = root.getElementById(list.set);
    if (!set) return;
    // The banner iPart holds the template's output directly.
    if (!list.rows.length && list.empty) {
      set.innerHTML = list.empty;
      return;
    }
    set.innerHTML = list.bare
      ? fill(template, list.rows[0])
      : list.rows.map((row, index) => `<section data-item='${list.set}-${index}'><div class='QueryTemplateItem'>${fill(template, row)}</div></section>`).join('');
  }

  // After a toolbar press: every list again, then the panels the page holds
  // itself (Case details, Resolution) and the actions' checks.
  async function rerender() {
    readVariants();
    build();
    await renderLists();
    document.querySelectorAll('.us-field-groups[data-us-fields-query]').forEach(root => {
      // The rendered lists (QueryTemplateSet with an id) load their own.
      if (!root.closest('.QueryTemplateSet[id]')) window.UnionSuiteFieldGroups?.reload(root);
    });
    window.UnionSuiteActions?.refresh();
    showVariants();
  }

  // In iMIS the rows arrive with the page; here they arrive later, so the
  // actions that read them (View profile's URL) are checked again.
  async function renderLists(only) {
    await Promise.all(lists.filter(list => !only || only.includes(list.set)).map(list => renderList(list)));
    window.UnionSuiteActions?.refresh();
  }

  // A refreshed iPart comes back with its (empty) fixture list; refill it.
  // Not after the composer's quiet insert, which adds rows to the list.
  document.addEventListener('us:query-template-refreshed', event => {
    if (event.detail?.inserted != null) return;
    const sets = [...(event.detail?.container?.querySelectorAll('.QueryTemplateSet[id], #cp-banner') || [])].map(set => set.id);
    if (sets.length) renderLists(sets).catch(error => console.error(error));
  });

  // ── 3. Offline API answers ───────────────────────────────────
  const cloudToolz = 'https://cloudtoolz.example';
  const tags = ['Logged Document', 'Logged Email', 'Cases', 'CaseTask', 'Documentation', 'Forms', 'ID']
    .map((name, index) => ({Ordinal: [1, 2, 3, 7, 14, 15, 16][index], TagName: name}));
  let savesFail = false;

  const items = list => ({Count: list.length, TotalCount: list.length, Items: {$values: list}});
  const reply = (data, status = 200, delay = 150) => new Promise(resolve => setTimeout(() => resolve({
    ok: status < 400, status, json: async () => data, text: async () => JSON.stringify(data)
  }), delay));

  window.fetch = async (input, init = {}) => {
    const target = new URL(typeof input === 'string' ? input : input.url, location.href);
    // A read of the page itself (a Query Template refresh, the composer's
    // quiet insert): the served page with every list filled from the
    // sample data, as iMIS renders it, after an iMIS-like wait.
    if (target.origin === location.origin && target.pathname === location.pathname && (init.method || 'GET') === 'GET') {
      const text = await (await nativeFetch(target.href, {cache: 'no-store'})).text();
      const doc = new DOMParser().parseFromString(text, 'text/html');
      await Promise.all(lists.map(list => renderList(list, doc)));
      await new Promise(resolve => setTimeout(resolve, 1500));
      return new Response('<!DOCTYPE html>' + doc.documentElement.outerHTML, {status: 200, headers: {'Content-Type': 'text/html; charset=utf-8'}});
    }
    if (target.pathname === '/api/query') {
      const name = target.searchParams.get('QueryName') || '';
      if (name.endsWith('/CloudToolzUrl')) return reply(items([{Description: cloudToolz + '/'}]));
      if (name.endsWith('/API - Zen Attachment Tags')) return reply(items(tags));
      // The Overview attachments footer's count (US-QUERY-VALUE).
      if (name.endsWith('/API - Manage Case - Attachment Count')) return reply(items([{AttachmentCount: String(rows.attachments.length)}]));
      // The banner's second row: replaces the current page's Details block.
      if (name.endsWith('/API - Manage Case - Banner Details')) return reply(items([{
        Description: 'Priya reports repeated belittling comments from a night shift supervisor since July.',
        'Additional-Opened': (older ? '2 Jul 2026' : fresh ? '8 Oct 2026' : '7 Oct 2026') + ' · ' +
          (closed ? 'closed after ' + (older ? '141' : '44') + ' days' : older ? '98 days' : fresh ? 'today' : '1 day'),
        'Additional-Type': 'Bullying / Harassment',
        'Additional-Subtype': '',
        'Additional-Priority': 'High',
        'Tone-Priority': 'danger',
        'Additional-Lead staff': leadStaff() || 'No lead staff assigned',
        'Tone-Lead staff': leadStaff() ? '' : 'danger',
        // Warning from 14 days without contact, danger from 28; blank once closed.
        'Additional-Last member contact': closed ? '' : older ? '21 days ago' : fresh ? 'Not yet' : 'Yesterday',
        'Tone-Last member contact': closed ? '' : older ? 'warning' : ''
      }]), 200, 300);
      // Add party's list (C40; the live IQA, owner, 28 October 2026): the
      // active members at the case's workplace, Search matching the taskbar
      // quick search's string, at most 20, with the live IQA's aliases. The
      // primary party is listed too; the composer marks who is on the case.
      if (name.endsWith('/API - Manage Case - Contact List - Primary Workplace')) {
        const term = (target.searchParams.get('Search') || '').toLowerCase();
        const found = contacts.filter(contact => !term || (contact.ContactName + ' ' + contact.Number).toLowerCase().includes(term));
        return reply(items(found.slice(0, Number(target.searchParams.get('limit')) || 20).map(contact => ({
          ID: contact.ContactId, 'Full Name': contact.ContactName,
          'Member Type': contact.MemberType, 'Member Category': contact.MemberStatus
        }))), 200, 200);
      }
      // The add staff composer's Role list (case staff member types).
      if (name.endsWith('/Get Case Staff Member Types')) return reply(items(staffTypes), 200, 200);
      // The banner's status menu (C23).
      if (name.endsWith('/API - Value List - Case Status')) return reply(items(caseStatuses), 200, 200);
      // The member card's IQA (the case's primary party, C42).
      if (name.endsWith('/API - Manage Case - Primary Party Details')) {
        const known = target.searchParams.get('CaseNum') === '214';
        return reply(items(known ? [caseMemberDetails()] : []), 200, 250);
      }
      // The primary party's jobs (C42), current, not started and finished,
      // under the live IQA's column names (owner, 28 October 2026). No Work-*
      // columns: the card reads its details again after a pick.
      if (name.endsWith('/API - Manage Case - Primary Contacts Workplaces')) {
        const list = target.searchParams.get('CaseNum') === '214' ? jobsOf(rows.member[0].MemberId) : [];
        return reply(items(list.map(job => ({
          'Workplace ID': job.WorkplaceID, 'Workplace Name': job.WorkplaceName, 'Workplace Type': job.WorkplaceType,
          'Member Job Status': {Current: 'Active', 'Not Started': 'Not Started', Former: 'Finished'}[job.WorkplaceStatus],
          'Job Start Date': job.WorkplaceStart, 'Job End Date': job.WorkplaceEnd
        }))), 200, 250);
      }
      // A party's details (the guide's template).
      if (name.endsWith('/API - Manage Case - Party Details')) {
        const details = detailsFor(target.searchParams.get('ID'));
        return reply(items(details ? [details] : []), 200, 250);
      }
      // A sent email's recipients (data-comms-recipients), by its log key.
      if (name.endsWith('/API - Communication Details')) {
        const recipients = {
          'log-503': [{Recipient: 'Northside HR', Address: 'hr@northside.example', Status: 'Open'}, {Recipient: 'Dani Sundara', Address: 'dsundara@union.example', Status: 'Delivered'}],
          'log-501': [{Recipient: 'Priya Natarajan', Address: 'priya.n@mailinator.com', Status: 'Delivered'}]
        };
        return reply(items(recipients[target.searchParams.get('CommunicationLogKey')] || []), 200, 300);
      }
      // A change history card's fields (US-CHANGE-FIELDS), by the save's key.
      if (name.endsWith('/API - Change Fields')) return reply(items(changeFields[target.searchParams.get('ChangeKey')] || []), 200, 300);
      // A card's details (data-details): one row for its ActivityKey.
      const details = activityDetails[name.slice(name.lastIndexOf('/') + 1)];
      if (name.startsWith(activityDetailsFolder) && details) {
        const row = target.searchParams.get('CaseNum') === '214' ? details[target.searchParams.get('ActivityKey')] : null;
        return reply(items(row ? [row] : []), 200, 250);
      }
      // The base sources, newest first, paged as /api/query pages. Every
      // feed uses them; Recent activity's 30 days is its StartDate (C19).
      if (name.startsWith(activityFolder)) {
        const source = activity[name.slice(name.lastIndexOf('/') + 1)] || [];
        // The timeframe filter: the feed sends StartDate unless All time.
        const start = target.searchParams.get('StartDate') || '';
        const list = (target.searchParams.get('CaseNum') === '214' ? source : [])
          .filter(row => row.ActivityDate.slice(0, 10) >= start)
          .slice().sort((a, b) => b.ActivityDate.localeCompare(a.ActivityDate));
        const limit = Number(target.searchParams.get('limit')) || 100;
        const offset = Number(target.searchParams.get('offset')) || 0;
        const page = list.slice(offset, offset + limit);
        return reply({TotalCount: list.length, Offset: offset, Limit: limit, Count: page.length, HasNext: offset + page.length < list.length, Items: {$values: page}}, 200, 200 + Math.random() * 200);
      }
      if (name.endsWith('/API - Manage Case - Case Details')) return reply(items([{
        'Case-Reference': 'C217',
        'Case-Type': 'Bullying / Harassment',
        'Case-Subtype': '',
        'Case-Priority': 'High',
        'Tone-Priority': 'danger',
        'Case-Source': 'Member phone call',
        'Case-Access level': 'Case team only',
        'Workplace-Employer': caseJob()?.['Work-Employer'] || '',
        'Workplace-Site': caseJob()?.['Work-Workplace'] || '',
        'Workplace-Workbench': workbenches[caseWorkplaceId] || '',
        'Dates-Opened': older ? '2026-07-02T00:00:00' : '2026-10-07T00:00:00',
        'Dates-Incident date': '2026-09-22T00:00:00',
        'Dates-Limitation date': '2026-12-21T00:00:00',
        '1-Tags': 'Night shift, Supervisor conduct',
        '2-Description': 'Priya reports repeated belittling comments from a night shift supervisor since July, about her accent and work rate. Two co-workers saw at least one incident.'
      }]), 200, 250);
      if (name.endsWith('/API - Manage Case - Resolution')) return reply(items([closed ? {
        'Alert-Title': 'Resolved',
        'Alert-Message': "Closed 20 Nov 2026 by Mary O'Conner.",
        'Alert-Tone': 'success',
        'Outcome type': 'Resolved with employer',
        '1-Amount won': '',
        '2-Outcome': 'Supervisor moved off the night shift; the employer agreed to bullying training for all shift leads.'
      } : {
        'Alert-Title': 'Not yet resolved',
        'Alert-Message': 'Resolve the case when it is finished: its outcome is recorded and it closes.',
        'Alert-Tone': 'info',
        'Alert-Only': 'true'
      }]), 200, 250);
    }
    if (target.pathname === '/api/ZenTokens') return reply({});
    if (target.origin === cloudToolz) {
      if (savesFail) return reply({}, 500, 700);
      if (target.pathname === '/flowz/sharepoint/download') {
        return reply({FileName: 'sample.txt', Base64string: btoa('Sample file from the offline case prototype.')}, 200, 500);
      }
      // A sensitive file (C33): the statement opens, the text messages do not.
      if (target.pathname === '/cases/attachment-access') {
        const ordinal = JSON.parse(init.body || '{}').AttachmentOrdinal;
        return reply({Access: ordinal === '801' ? 'Restricted' : 'Granted'}, 200, 600);
      }
      if (target.pathname === '/ca/note-access') {
        return reply({Access: 'Granted', Note: 'Priya disclosed she is on a visa tied to this employer and is worried about raising the complaint. Do not record visa details elsewhere on the case.'}, 200, 600);
      }
      // The add staff composer's people (C38): the whole list, searched in
      // the page. Slow enough to show the list's spinner when clicked at once.
      if (target.pathname === '/cases/quick-add/StaffList') {
        return reply(directory.map(person => ({StaffID: person.ContactId, StaffName: person.ContactName})), 200, 1200);
      }
      // Inline saves (C34, C35, proposed endpoints): the new row joins the
      // sample data, and the lists refresh from it.
      if (target.pathname === '/cases/quick-add/staff') {
        const body = JSON.parse(init.body || '{}');
        const person = directory.find(entry => entry.ContactId === body.StaffID);
        if (!person) return reply({}, 400, 300);
        const delegate = person.Group === 'Delegates';
        added.staff.push({Ordinal: String(710 + added.staff.length), ContactId: person.ContactId, ContactName: person.ContactName,
          ContactUrl: '/Party.aspx?ID=' + person.ContactId, ContactIsLead: 'false',
          ContactRole: staffTypes.find(type => type.value === body.Role)?.label || 'Support',
          ContactType: person.Position, ContactGroup: person.Group, ContactGroupOrder: delegate ? '2' : '1',
          ContactGroupTone: delegate ? 'success' : 'info', ContactEmail: person.Email, ContactPhone: person.Phone});
        build();
        return reply({Ordinal: String(709 + added.staff.length)}, 200, 500);
      }
      if (target.pathname === '/cases/quick-add/contact') {
        const contact = contacts.find(entry => entry.ContactId === JSON.parse(init.body || '{}').ContactID);
        if (!contact) return reply({}, 400, 300);
        added.parties.push({...contact, Ordinal: String(620 + added.parties.length)});
        build();
        return reply({Ordinal: String(619 + added.parties.length)}, 200, 500);
      }
      // The add attachment composer's tags (shape to confirm): the sample
      // tag list, slow enough to show the list's spinner.
      if (target.pathname === '/zidebar/sharepoint/tagsprefill') return reply(tags, 200, 900);
      if (target.pathname === '/cases/quick-add/attachment') {
        const body = JSON.parse(init.body || '{}');
        const by = leadStaff() || "Mary O'Conner";
        const ordinals = [];
        (body.Files || []).forEach(file => {
          const ordinal = String(810 + added.attachments.length);
          ordinals.push(ordinal);
          const iso = '2026-10-08T17:' + String(addedClock++).padStart(2, '0') + ':00';
          added.attachments.unshift({Ordinal: ordinal, FileName: file.FileName.replace(/\.[^.]+$/, ''), TagNames: body.TagNames || '', TagOrdinals: body.TagOrdinals || '',
            UniqueID: '01S3AQU4NEW' + ordinal, EntityCode: 'DEMO', CreatedBy: by, CreatedOn: '8/10/2026', CreatedIso: iso,
            AccessClass: ''});
        });
        build();
        return reply({Ordinals: ordinals}, 200, 700);
      }
      if (target.pathname === '/cases/quick-add/meeting') {
        const body = JSON.parse(init.body || '{}');
        const day = new Date((body.Date || '2026-10-08') + 'T00:00:00');
        const [hour, minute] = (body.Time || '').split(':').map(Number);
        const time = body.Time ? String(hour % 12 || 12).padStart(2, '0') + ':' + String(minute).padStart(2, '0') + (hour < 12 ? ' AM' : ' PM') : '';
        added.meetings.push({Ordinal: String(50 + added.meetings.length), 'Date-ISO': body.Date, 'Date-Month': day.toLocaleDateString('en-AU', {month: 'short'}),
          'Date-Day': String(day.getDate()), MeetingTitle: body.Title || '', MeetingType: '', Matter: '', 'Date-Time': time, Location: body.Location || '',
          Attendees: '', Description: '', Outcome: '', Time24: body.Time || '', CreatedBy: leadStaff() || "Mary O'Conner"});
        build();
        return reply({Ordinal: String(49 + added.meetings.length)}, 200, 500);
      }
      if (target.pathname === '/cases/quick-add/note' || target.pathname === '/cases/quick-add/task') {
        const body = JSON.parse(init.body || '{}');
        // After the sample's latest entry (8 Oct, 4:20 pm), a minute apart.
        const iso = '2026-10-08T17:' + String(addedClock++).padStart(2, '0') + ':00';
        const local = new Date(iso);
        const createdOn = local.getDate() + '/' + (local.getMonth() + 1) + '/' + local.getFullYear();
        const createdTime = local.toLocaleTimeString('en-AU', {hour: 'numeric', minute: '2-digit'}).toLowerCase();
        const by = leadStaff() || "Mary O'Conner";
        const due = body.FollowUpDate || body.DueDate || '';
        const dueText = due ? due.split('-').reverse().map(part => String(Number(part))).join('/') : '';
        const dueShort = due ? new Date(due + 'T00:00:00').toLocaleDateString('en-AU', {day: 'numeric', month: 'short'}) : '';
        const ordinal = String(960 + addedClock);
        const task = text => ({Ordinal: ordinal, Note: text, TAskCheckCSS: '', TaskStatusCSS: 'outstanding', Deadline: dueText, OverdueText: '',
          AssignedTo: by, PriorityBadge: '', Description: '', CreatedIso: iso, CreatedBy: by, CreatedText: createdOn + ' by ' + by,
          CompletedIso: '', CompletedBy: '', CompletedText: ''});
        if (target.pathname === '/cases/quick-add/note') {
          added.notes.push({Ordinal: ordinal, Iso: iso, CreatedOn: createdOn, CreatedTime: createdTime, CreatedBy: by, Priority: '', AccessClass: '', NoteClass: '',
            Note: body.Note || '', Category: body.Category || '', Staff: by, Members: '',
            FollowUpRequired: due ? 'true' : '', FollowUpDate: due, FollowUpActioned: '', FollowUpNotes: '',
            FollowUpText: due ? 'Follow-up ' + dueShort : '', FollowUpTone: ''});
          if (due) added.tasks.push({...task((body.Note || '').split('\n')[0]), FromNote: true});
        } else {
          added.tasks.push(task(body.Task || ''));
        }
        build();
        return reply({Ordinal: ordinal}, 200, 500);
      }
      if (target.pathname === '/cases/quick-update/set-lead-staff') setLeadStaff(JSON.parse(init.body || '{}').StaffOrdinal);
      // The quick status change (C23): a known open status, as the flow
      // checks it; a closed one is Resolve case's.
      if (target.pathname === '/cases/quick-update/set-status') {
        const code = JSON.parse(init.body || '{}').Status;
        const status = caseStatuses.find(row => row.Code === code);
        if (!status || status['Closed Status'] === 'true') return reply('Choose an open status.', 400, 400);
        openStatus = code;
        return reply({Status: code}, 200, 700);
      }
      if (target.pathname === '/cases/reopen') {
        const next = new URL(location.href);
        next.searchParams.delete('case');
        history.replaceState(null, '', next);
      }
      if (target.pathname === '/cases/quick-update/set-primary-party') {
        const ordinal = JSON.parse(init.body || '{}').PartyOrdinal;
        primaryId = rows.parties.find(row => row.Ordinal === ordinal)?.ContactId || primaryId;
        // The old workplace was the old primary's (C42): the new one's only
        // job, or none until someone chooses.
        caseWorkplaceId = onlyJob(primaryId);
        build();
      }
      // The case's workplace (C42): one of the primary party's jobs, or
      // blank for not about a workplace, as the flow checks it.
      if (target.pathname === '/cases/quick-update/set-primary-workplace') {
        const body = JSON.parse(init.body || '{}');
        const known = body.WorkplaceID === '' || jobsOf(primaryId).some(job => job.WorkplaceID === body.WorkplaceID);
        if (!known || body.ContactID !== primaryId) return reply({}, 400, 300);
        caseWorkplaceId = body.WorkplaceID;
        build();
      }
      toast('Saved through CloudToolz ' + target.pathname + ' (offline sample).');
      return reply({}, 200, 700);
    }
    return nativeFetch(input, init);
  };

  window.UnionSuiteCasePreview = {
    navigate: href => {
      const target = new URL(href);
      const filters = JSON.parse(target.searchParams.get('queryparams') || '[]');
      const ordinals = filters.find(filter => filter.Item1 === 'Ordinal')?.Item2;
      toast('Would open the send page ' + target.pathname + ' for ' + (ordinals ? 'parties ' + ordinals : 'every party') + '.');
    }
  };

  // ── 4. Native popup stand-in ─────────────────────────────────
  window.ShowDialog_NoReturnValue = (href, args, width, height, title, ...rest) => {
    const path = new URL(href, location.href);
    toast(`Would open “${title}”: ${path.pathname}${path.search}`);
    const close = rest[6];
    // Saving the Resolve case form closes the case.
    if (path.pathname === '/Cases_ResolveCase' && !path.searchParams.get('Edit')) {
      const next = new URL(location.href);
      next.searchParams.set('case', 'closed');
      history.replaceState(null, '', next);
    }
    // The value a form passes as it closes (the usage guide's #composer-popup-forms), as the
    // RadWindow's close argument: set window.casePopupResult to
    // {saved: true} or {cancel: true} to try either; nothing, as the ×.
    const result = window.casePopupResult ?? null;
    if (typeof close === 'function') setTimeout(() => close(null, {get_argument: () => result}), 600);
  };

  // ── 5. Prototype chrome ──────────────────────────────────────
  function toast(message) {
    const node = document.getElementById('cp-toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 3200);
  }

  function selectView(key) {
    const cco = document.getElementById('cp-cco');
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

  // The toolbar's variant buttons: [id, parameter, value when on, label on,
  // label off]. Member steps through the four standings instead.
  const toggles = [
    ['cp-variant-age', 'age', 'older', 'Age: older', 'Age: recent'],
    ['cp-variant-lead', 'lead', 'none', 'Lead staff: none', 'Lead staff: assigned'],
    ['cp-variant-closed', 'case', 'closed', 'Status: closed', 'Status: open']
  ];
  const standingOrder = ['unfinancial', 'financial', 'new', 'former'];
  const sizeOrder = ['larger', 'new', 'typical'];
  const jobsOrder = ['chosen', 'former', 'future', 'none', 'single'];

  function showVariants() {
    const params = new URL(location.href).searchParams;
    toggles.forEach(([id, name, value, on, off]) => {
      const button = document.getElementById(id);
      if (!button) return;
      const active = params.get(name) === value;
      button.textContent = active ? on : off;
      button.setAttribute('aria-pressed', String(active));
    });
    const memberButton = document.getElementById('cp-variant-member');
    if (memberButton) {
      memberButton.textContent = 'Member: ' + standing;
      memberButton.setAttribute('aria-pressed', String(standing !== 'unfinancial'));
    }
    const jobsButton = document.getElementById('cp-variant-jobs');
    if (jobsButton) {
      jobsButton.textContent = {chosen: 'Jobs: current job', former: 'Jobs: former job', future: 'Jobs: not started', none: 'Jobs: no workplace', single: 'Jobs: 1'}[jobs];
      jobsButton.setAttribute('aria-pressed', String(jobs !== 'chosen'));
    }
    const sizeButton = document.getElementById('cp-variant-size');
    if (sizeButton) {
      sizeButton.textContent = 'Case: ' + size;
      sizeButton.setAttribute('aria-pressed', String(size !== 'larger'));
    }
  }

  // A press changes the address (no reload) and re-renders the page.
  function pressVariant(button) {
    const next = new URL(location.href);
    if (button.id === 'cp-variant-member') {
      const following = standingOrder[(standingOrder.indexOf(standing) + 1) % standingOrder.length];
      if (following === 'unfinancial') next.searchParams.delete('member');
      else next.searchParams.set('member', following);
    } else if (button.id === 'cp-variant-jobs') {
      const following = jobsOrder[(jobsOrder.indexOf(jobs) + 1) % jobsOrder.length];
      if (following === 'chosen') next.searchParams.delete('jobs');
      else next.searchParams.set('jobs', following);
    } else if (button.id === 'cp-variant-size') {
      const following = sizeOrder[(sizeOrder.indexOf(size) + 1) % sizeOrder.length];
      if (following === 'larger') next.searchParams.delete('size');
      else next.searchParams.set('size', following);
    } else {
      const [, name, value] = toggles.find(([id]) => id === button.id);
      if (next.searchParams.get(name) === value) next.searchParams.delete(name);
      else next.searchParams.set(name, value);
    }
    history.replaceState(null, '', next);
    rerender().catch(error => {
      console.error(error);
      toast('Sample rows could not render: ' + error.message);
    });
  }

  function showColorScheme() {
    const button = document.getElementById('cp-color-scheme');
    const dark = window.UnionSuiteAppearance?.getState().scheme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.textContent = dark ? 'Mode: dark' : 'Mode: light';
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('#cp-cco a.rtsLink');
    if (tab) {
      event.preventDefault();
      selectView(tab.dataset.view);
      return;
    }
    const variant = event.target.closest('.cp-toolbar [id^="cp-variant-"]');
    if (variant) {
      pressVariant(variant);
      return;
    }
    if (event.target.closest('#cp-color-scheme')) {
      window.UnionSuiteAppearance?.toggle();
      showColorScheme();
      return;
    }
    const failing = event.target.closest('#cp-save-failing');
    if (failing) {
      savesFail = !savesFail;
      failing.setAttribute('aria-pressed', String(savesFail));
      failing.textContent = savesFail ? 'Saves: fail' : 'Saves: succeed';
    }
  }, true);

  window.addEventListener('unionsuite:appearancechange', showColorScheme);
  window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));

  document.addEventListener('DOMContentLoaded', () => {
    selectView(location.hash.slice(1)) || selectView('overview');
    showVariants();
    showColorScheme();
    renderLists().catch(error => {
      console.error(error);
      toast('Sample rows could not render: ' + error.message);
    });
  });
})();
