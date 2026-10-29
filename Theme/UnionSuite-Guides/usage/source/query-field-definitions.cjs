// Author documentation only. Required means a nonempty value for this recipe;
// every field still referenced in HTML must be selected, including optional ones.
const required = (description, example, token) => ({required:true, description, example, ...(token ? {token} : {})});
const optional = (description, example, token) => ({required:false, description, example, ...(token ? {token} : {})});
const bulletin = {
  DocumentName:required('Announcement title.', 'Updated membership fees'),
  FirstName:optional('Author’s first name. If omitting authors, remove both name tokens from the metadata line and adjust its separator.', 'Peter'),
  LastName:optional('Author’s last name. May be blank for a single-name author.', 'Williams'),
  CreatedOn:required('Publication date formatted for display by the query.', '14 September 2026'),
  DocumentBody:required('Existing rich HTML announcement body. This supplied field uses noencode inside a div; retain encoding on ordinary text fields.', '<p>The updated fee schedule is now available.</p>')
};
const notes = {
  NoteTitle:required('Note subject.', 'Renewal options discussed'),
  AuthorName:required('Staff member who wrote the note.', 'Sam Taylor'),
  CreatedOn:required('Note date and time formatted for display by the query.', '14 September 2026 · 10:15 am'),
  NoteBody:required('Plain-text note content. Keep the substitution HTML-encoded.', 'Sent the fee schedule and agreed to follow up next week.'),
  ContactMethod:optional('How the contact occurred. Remove the whole us-list__footer block if unused; a blank value alone can leave footer spacing.', 'Phone call')
};
const taskTitle = required('Task subject, also used in the checkbox’s accessible label. Do not map a status code such as N or IP here.', 'Call Alex about renewal');
const memberName = optional('Related member’s display name. Remove its span if the task has no member context.', 'Alex Morgan');
const contacts = {
  ContactName:required('Contact display name.', 'Adam Phillips'),
  ContactId:optional('Searchable contact ID. It is in the HTML but is not displayed. Remove its data-us-search token if unused.', '101000'),
  ContactUrl:optional('Contact profile destination. Blank leaves a plain-text name. Example path is illustrative; use your actual iMIS destination.', '/contacts/101000'),
  RoleLabel:optional('Badge text in sentence case. Blank hides the badge.', 'Delegate'),
  RoleColour:optional('Badge background as #RGB or #RRGGBB, including #. Text automatically uses black or white. Blank/invalid colours use the neutral theme badge. Previous backgrounds with current branding: Delegate/coordinator #F0F3F7; Region #D1DCE6; General #F3F3F4. These are query values; there are no role-name CSS rules.', '#F0F3F7'),
  WorkplaceName:optional('Workplace display name. Blank hides the whole workplace row.', 'Stark Enterprise - Melbourne'),
  WorkplaceUrl:optional('Workplace profile destination. Blank leaves plain text. Example path is illustrative.', '/workplaces/200100'),
  Email:optional('Email address without mailto:; the template adds it. Blank hides the entire email row.', 'adam@example.com'),
  Phone:optional('Phone number without tel:; the template adds it. Blank hides the entire phone row.', '0400 123 456')
};
module.exports = {
  'Bulletin-Query-Template.html':bulletin,
  'Bulletin-Linked-Query-Template.html':{
    ...bulletin,
    AlertUrl:optional('Trimmed destination URL. Blank hides the Read more link and whole-card click target. Use a verified http(s) URL, root-relative path or nonempty #anchor; this example path is illustrative.', '/staff/announcements/membership-fees')
  },
  'Bulletin-SystemAlerts-Query-Template.html':{
    StartDate:required('i4u_UT_SystemAlerts.StartDate: the day the post goes live, shown as the card’s date line. The query’s date filter also needs it. If iMIS adds a time, select a custom SQL expression that formats the date, with this alias.', '14/10/2026'),
    Alert:required('i4u_UT_SystemAlerts.Alert: the post. Rendered as HTML (noencode) so paragraphs, line breaks and inline links work. Plain text displays too, but its line breaks are lost; enter them as HTML. The same value is the system alert when SitewideAlert is checked.', '<p>The updated fee schedule is now available.</p>'),
    Link:optional('i4u_UT_SystemAlerts.Link, trimmed. A value makes the whole card clickable, with a footer link. Blank leaves a plain card with no footer, click target or tab stop. Use an http(s) URL, a site path starting with one slash, or a nonempty #anchor; other formats are treated as blank. This example path is illustrative.', '/staff/announcements/membership-fees'),
    LinkText:optional('i4u_UT_SystemAlerts.LinkText: the footer link’s visible label and accessible name. Blank reads Read more. Not shown when Link is blank.', 'Latest membership fees')
  },
  'Member-Notes-Query-Template.html':notes,
  'Recent-History-Query-Template.html':{
    ActivityTitle:required('Activity summary.', 'Membership renewed'),
    AuthorName:required('Person or team responsible.', 'Member Services'),
    ActivityDate:required('Activity date and time formatted for display by the query.', '14 September 2026 · 9:40 am'),
    ActivityDetail:optional('Plain-text supporting detail. Remove its complete us-list__body block if unused to avoid empty body spacing.', 'Membership extended to 30 September 2027.')
  },
  'Tasks-Query-Template.html':{
    TaskTitle:taskTitle, MemberName:memberName,
    DueDate:optional('Formatted due date without the Due prefix (the template adds it). For undated tasks, supply a display value such as Not set or remove the entire date span; a blank value alone leaves Due visible.', '18 September 2026')
  },
  'Tasks-Completion-Query-Template.html':{
    TaskTitle:taskTitle, MemberName:memberName,
    IsCompleted:required('Explicit completion flag: true or 1 for completed; false or 0 for outstanding. Do not infer completion from status wording.', 'false'),
    TaskDateLabel:optional('Complete display label: Due plus a due date for outstanding tasks; Actioned plus an actioned date for completed tasks. Blank leaves no date text.', 'Actioned 14 September 2026')
  },
  'Tasks-Detail-Query-Template.html':{
    TaskTitle:taskTitle,
    TaskUrl:required('Verified task editor URL, including the parameters identifying this task. Used in both href and data-us-task-url. Opens in the native iMIS popup; fragments are not supported. Blank disables the action. Select this alias even when values are blank, or replace the entire anchor with plain title text.', '/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx?ID=104019&Ordinal=219'),
    TaskNote:optional('Plain-text task note. One line is displayed and the rest is clipped by CSS, so the full note stays searchable. Blank removes the line and the row closes up.', 'Discuss the membership options sent earlier this week.'),
    MemberName:memberName,
    MemberUrl:optional('Related member’s record. Blank leaves a plain-text name; a blank MemberName hides the icon and name together. Example path is illustrative.', '/Party.aspx?ID=101000'),
    MemberId:optional('Party ID represented by MemberName and MemberUrl. Used in the member link data-id; when it matches __ClientContext.loggedInPartyId, the name becomes Personal Task and the link is disabled. Blank leaves the authored name and link. Compare IDs as strings, preserving leading zeroes.', '104203'),
    IsCompleted:required('Explicit completion flag: true or 1 for completed; false or 0 for outstanding. Do not infer completion from status wording.', 'false'),
    DueState:optional('Urgency for the date: overdue, today, soon or none. Only overdue is coloured, and the label below must carry the word as well, so the state never relies on colour alone. Not updated after a staff member ticks the row.', 'overdue'),
    TaskDateLabel:optional('Complete display label: Overdue or Due plus a due date for outstanding tasks; Actioned plus an actioned date for completed tasks. Blank leaves no date text.', 'Overdue 10 September 2026'),
    DueLabel:optional('Original due label, restored if a completed row is reopened. Usually the same value as TaskDateLabel for an outstanding task.', 'Overdue 10 September 2026'),
    TaskPartyId:optional('ID of the i4u_UT_Interactions row: the party the interaction belongs to. Supplied with TaskOrdinal, ticking the checkbox saves FollowUpActioned; without both the checkbox stays local and nothing is written.', '104019'),
    TaskOrdinal:optional('Ordinal of the i4u_UT_Interactions row, which identifies it within that party. Whole number. Supplied with TaskPartyId to enable saving.', '219')
  },
  'Tasks-Query-Footer.html':{},
  'Contacts-Query-Template.html':contacts,
  'Case-Parties-Query-Template.html':{
    Ordinal:required('Ordinal of the case contact row. Make primary party and Email parties send it.', '208'),
    ContactId:required('The party’s iMIS ID. Filters the party details IQA (its ID filter), and marks who is already on the case for Add party.', '18916'),
    ContactName:required('Display name, shown as plain text; also the avatar initials and the search.', 'Nick Abbott'),
    ContactUrl:optional('The party’s contact profile, opened by View profile. Example path is illustrative.', '/Party.aspx?ID=18916'),
    ContactIsLead:required('true for the primary party, otherwise false (true or 1 in any case counts). The primary party is stored on the case, so this is a custom SQL expression: CASE WHEN [vBoi4u_UT_Cases].[PrimaryContactID] = [vBoi4u_UT_Cases_Contacts].[ContactId] THEN \'true\' ELSE \'false\' END. The primary party is moved to the top, crowned and chosen first.', 'true'),
    ContactRole:required('Primary party or Party. Read to screen readers after the name; the crown shows it on screen.', 'Primary party'),
    ContactType:required('Member, Former member or Employer. Employer hides Make primary party. Return one of these words, not an iMIS placeholder such as Please Enter.', 'Member'),
    MemberType:optional('The second line’s first part: the iMIS member type, or Employer for an organisation. Blank leaves it out.', 'Full member'),
    MemberStatus:optional('The second line’s second part: the membership status. Blank (an employer) leaves it out, with its separator.', 'Financial'),
    MemberStanding:optional('The badge text: Unfinancial, Former member or New member. Blank (a financial member, an employer) hides the badge.', 'Unfinancial'),
    MemberStandingTone:optional('The badge colour: danger or warning. Blank gives the neutral badge.', 'danger'),
    MemberLine:optional('The line under the name in the preview. Blank hides it.', 'Member 20544 · Full member')
  },
  'Case-Member-Query-Template.html':{
    CaseNum:required('The case number. Filters the member details IQA (its CaseNum filter), so the Work fields can be the case’s job.', '214'),
    MemberId:required('The primary party’s iMIS ID. Sent as ContactID when the case’s job changes.', '20544'),
    MemberName:required('The primary party’s display name, shown as plain text; also the avatar initials.', 'Priya Natarajan'),
    MemberUrl:optional('The primary party’s contact profile, opened by View profile (cases.view-member) from the panel heading. Example path is illustrative.', '/Party.aspx?ID=20544'),
    MemberLine:optional('The line under the name, such as the member number and type. Blank hides it.', 'Member 20544 · Full member'),
    PrimaryWorkplaceID:optional('The case’s PrimaryWorkplaceID: the job the case is about, matching the jobs IQA’s Workplace ID values. Blank means the case is not about a workplace: the Work fields give way to “This case isn’t about a workplace.” The case create form sets the primary contact’s primary workplace. The count comes from the jobs IQA, so this IQA never joins the jobs.', '4101'),
    OtherParties:optional('The case’s other parties, as one sentence: “Also on this case: Josh Kemp and Northside Distribution Pty Ltd.” Blank (the usual single-member case) hides the line and its See all parties link.', 'Also on this case: Josh Kemp and Northside Distribution Pty Ltd.')
  },
  'Change-History-Query-Template.html':{
    ChangeKey:required('The save’s key: the change log’s SourceRef. Filters the fields IQA (its ChangeKey filter) when the card opens.', '4d86c5270f51469bb6fd3ac0ba1209b2'),
    Action:required('The change log’s Reason: Add, Edit or Delete. Add lists the values given; Edit shows old → new; Delete has no fields, so its card has no open button.', 'Add'),
    Event:required('What happened, the card’s headline: a custom SQL expression on Table and Reason.', 'Meeting added'),
    Summary:optional('The line under the headline: the record’s name for an add or a remove, otherwise how many fields changed. Blank hides it.', 'Hearing preparation'),
    ChangedBy:optional('Who saved it: the full name for UpdatedById. Blank hides it.', 'Mary O’Conner'),
    ChangeDay:required('The save’s date for the card: FORMAT(ChangeDate, \'d MMM yyyy\', \'en-AU\'). Sort on the raw ChangeDate, not this alias.', '25 Oct 2026'),
    ChangeTime:optional('The save’s time under the date: LOWER(FORMAT(ChangeDate, \'h:mm tt\', \'en-AU\')).', '8:13 pm')
  },
  'query-search-template':{TaskTitle:taskTitle, MemberName:memberName},
  'explicit-query-search':{ContactName:contacts.ContactName, ContactId:contacts.ContactId},
  'Banner-Case-Rows-Query-Template.html':{
    CaseID:required('Case reference in the ID chip, copied by its copy button, and the start of the browser tab title (data-us-page-title): C217 - Overview.', 'C217'),
    CaseTitle:required('Case title, the banner heading.', 'Bullying complaint – Northside Distribution night shift'),
    Status:required('The case’s status Code, as the case Status value list holds it (the column the case stores). Fills the status pill (until the theme shows the list’s Description) and data-us-record-status, which colours the pill and left rail: New, Open and In progress amber; Active, Approved and Completed green; Expired, Terminated and Overdue red; any other status neutral. The fallback menu items’ data-us-case-status values are Codes too.', 'Open'),
    MemberName:required('The primary party’s display name, under the title. It stays when the banner condenses.', 'Priya Natarajan'),
    MemberUrl:optional('The primary party’s contact profile. Blank leaves the name as plain text. Example path is illustrative.', '/Party.aspx?ID=20544'),
    MemberLine:optional('Muted text after the name, such as the member type and number. Blank hides it.', 'Member 20544'),
    MemberStanding:optional('Standing badge text: Unfinancial, No longer a member or New member. Blank (a financial member, an employer) hides the badge.', 'Unfinancial'),
    MemberStandingTone:optional('Standing badge colour: danger or warning. Blank gives the neutral badge. Use the same conditions, in the same order, as MemberStanding.', 'danger')
  },
  'Banner-Contact-Template.html':{
    ContactId:required('Contact identifier in the eyebrow, copied by its copy button. Also the filter value for the optional positions, tab counts and alerts blocks.', '101000', '[Contact ID]'),
    ContactType:required('Display text for the contact type, in the eyebrow and on the avatar. Organisation, Organization or Company show a building; any other value a person. Derive it from the same COMPANY_RECORD flag the taskbar quick search uses.', 'Individual', '[Contact type]'),
    ContactName:required('Full contact name.', 'Adam Phillips', '[Full name]'),
    MemberType:optional('Membership category. If unused, remove this token and the adjoining separator from the subtitle.', 'Full member', '[Member type]'),
    JoinDate:optional('Formatted membership join date. If unused, remove Member since and this token from the subtitle.', '1 July 2021', '[Join date]'),
    StatusDescription:optional('Plain-text member status from the existing status mapping. Blank uses Status unavailable.', 'Financial member'),
    StatusColour:optional('Six-digit hex including # from the existing status lookup. The helper adjusts its display colour for white-text contrast; blank/invalid values use the neutral fallback.', '#23845B'),
    Email:optional('Email address shown as text. Remove the entire Email fact if unused.', 'adam@example.com', '[Email address]'),
    Mobile:optional('Mobile number shown as text. Remove the entire Mobile fact if unused.', '0400 123 456', '[Mobile number]'),
    EmployerName:optional('Employer display name. Remove the entire Employer fact if unused.', 'Stark Enterprise', '[Employer name]'),
    BranchName:optional('Branch display name. Remove the entire Branch fact if unused.', 'Melbourne', '[Branch name]'),
    OrganiserName:optional('Assigned organiser’s display name. Remove the entire Organiser fact if unused.', 'Sam Taylor', '[Organiser name]')
  },
  'Banner-Template.html':{
    RecordType:required('Record category; may be authored literal text instead of a query field.', 'Agreement', '[Record type]'),
    RecordId:required('Record identifier.', 'AGR-2026-014', '[Record ID]'),
    RecordName:required('Record display name.', 'Stark Enterprise agreement', '[Record name]'),
    RecordSubtitle:optional('Supporting summary. Remove the entire subtitle paragraph if unused.', 'Melbourne workplaces', '[Supporting record information]'),
    RecordStatus:optional('Plain-text badge label. Remove its badge/status block if unused.', 'Current', '[Record status]'),
    ...Object.fromEntries([1,2,3,4].flatMap((n)=>[
      ['FactLabel'+n, optional('Label for optional fact '+n+'. Usually authored literal text; remove its whole fact block when unused.', ['Start date','End date','Owner','Branch'][n-1], '[Fact label '+n+']')],
      ['FactValue'+n, optional('Display value for optional fact '+n+'. Remove its whole fact block when unused.', ['1 July 2026','30 June 2029','Sam Taylor','Melbourne'][n-1], '[Fact value '+n+']')]
    ]))
  },
  'Banner-Dashboard-Template.html':{},
  'Welcome-Content.html':{}
};

// Compact and full task rows (US-TASK-ROWS 1.2, 19 October 2026).
function compactTaskFields(noteDescription) {
  const detail = module.exports['Tasks-Detail-Query-Template.html'];
  return {
    TaskTitle:optional('Task subject, also used in the checkbox’s accessible label. Do not map a status code such as N or IP here. Blank (a legacy note with no subject): the note takes the title’s place, up to two lines, and names the checkbox.', 'Call Alex about renewal'),
    TaskUrl:required('Verified task editor URL, including the parameters identifying this task, on the pencil (us-action-home-edit-task) as data-us-task-url. Opens in the native iMIS popup; fragments are not supported. Blank disables the pencil. On the agreement or case page, replace the pencil with that page\u2019s edit action instead (agreements.edit-task or the case\u2019s, with data-ordinal).', '/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx?ID=104019&Ordinal=219'),
    TaskNote:optional('Plain-text task note. ' + noteDescription, 'Discuss the membership options sent earlier this week.'),
    MemberName:detail.MemberName,
    MemberUrl:detail.MemberUrl,
    MemberId:detail.MemberId,
    TaskTags:optional('The task\u2019s tags from the task tag list, comma-separated. The first ends the date and member line, with a +N button that shows the rest; an opened note shows them all. Also searchable. Blank shows nothing.', 'Correspondence, Phone call'),
    PriorityBadge:optional('High Priority, or blank. Shown as a danger badge beside the pencil; blank leaves no badge.', 'High Priority'),
    IsCompleted:detail.IsCompleted,
    DueState:detail.DueState,
    TaskDateLabel:detail.TaskDateLabel,
    DueLabel:detail.DueLabel,
    TaskPartyId:detail.TaskPartyId,
    TaskOrdinal:detail.TaskOrdinal
  };
}
module.exports['Tasks-Compact-Query-Template.html'] = compactTaskFields('Compact: hidden until the details button beside the pencil opens it under the row; the button only shows when there is a note. Kept in the markup, so the header search still matches it. Blank leaves no note and no details button.');
module.exports['Tasks-Full-Query-Template.html'] = compactTaskFields('Full: shown under the title, up to two lines; a longer note gets a More link that opens it in place. Kept whole in the markup, so the header search matches all of it. Blank removes the line.');
