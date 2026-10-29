/* Standard Union Suite actions. Load once AFTER zUnionSuite.js and business
   dependencies, BEFORE UnionSuite-Client/Actions.js. Do not embed in iParts. */

/* The task form's pages (Forms/TaskForm.js; owner, 20 October 2026): one
   iMIS page per module, each holding only <div data-us-form="task"
   data-module="…">. Blank until the page exists; a blank page keeps that
   module's task actions on the form they open today. Set each to the
   page's path, e.g. '/_i4u_/Core/Tasks/Task-Case.aspx'.
   UnionSuiteTaskForms.href(module, values) builds a popup address: Type=task,
   the signed-in user's ID, and the values given (ModuleID, ModuleOrdinal,
   and Ordinal when editing), or null while the page is blank. */
(function () {
  'use strict';
  const PAGES = {personal: '', case: '', agreement: ''};
  function href(module, values = {}) {
    if (!PAGES[module]) return null;
    let client = {};
    try { client = JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch (_) {}
    const url = new URL(PAGES[module], location.origin);
    url.searchParams.set('Type', 'task');
    if (client.loggedInPartyId) url.searchParams.set('ID', String(client.loggedInPartyId));
    Object.entries(values).forEach(([name, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
    });
    return url.href;
  }
  window.UnionSuiteTaskForms = Object.freeze({pages: Object.freeze({...PAGES}), href});
})();

(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');
  const party = {from:'query', parameter:'ID', required:true};
  const recordId = value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid record ID.';
  const row = {
    partyId:{from:'trigger',attribute:'data-id',required:true,validate:recordId},
    ordinal:{from:'trigger',attribute:'data-seqn',required:true,validate:value => /^\d+$/.test(String(value)) || 'Invalid job ordinal.'}
  };
  function define(key, options) {
    return actions.define(key, {className:'us-action-'+key.replace(/\./g,'-'),owner:'UnionSuite',source:'ActionDefinitions.js:'+key,...options});
  }
  function editor(path, values) {
    const url = new URL(path,location.origin);
    Object.entries(values).forEach(([name,value]) => url.searchParams.set(name,String(value)));
    url.searchParams.set('AllowEdit','True');
    return url.href;
  }
  // Client context published in the DOM. loggedInPartyId is who is signed in,
  // which is not the same as the contact being viewed.
  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }
  async function refreshReport(env, selector) {
    if (env.origin.report || env.origin.ambiguous) return env.refresh.originReport();
    return env.refresh.iqa(selector,{scope:'page',match:'one'});
  }
  // These six integrations retain their existing site-owned implementations.
  // Their popup/save/refresh behaviour remains in those helpers until ported.
  const legacy = [
    ['member.email','Email member','ti-mail','EmailMemberPopupFn'],
    ['member.sms','SMS member','ti-message','SMSMemberPopupFn'],
    ['member.add-note','Add note','plus','AddNotePopupFn'],
    ['member.create-quick-case','Quick case','plus','CreateQuickCasePopupFn'],
    ['member.resolve-duplicate','Resolve duplicate','ti-users','ResolveDuplicatePopupFn'],
    ['member.assign-workbench','Assign workbench','ti-user-plus','AssignWorkbenchToStaffFn']
  ];
  legacy.forEach(([key,label,icon,helper]) => define(key,{
    presentation:{label,icon,default:'button',menu:'menu-item'},
    context:{partyId:party},
    action:{type:'function',requires:[helper],recordKey:['partyId'],run:() => window[helper]()}
  }));
  // The staff Create Case page for the selected member, in the same window,
  // as the retired CreateCasePopupFn did. The contact page's Cases report
  // carries it in its heading (owner, 27 October 2026).
  define('member.create-case',{
    presentation:{label:'Create case',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'navigate',
      href:({context}) => {
        const url = new URL('/_i4u_/Core/Cases/Create-Case-Staff.aspx',location.origin);
        url.searchParams.set('ID',context.partyId);
        return url.href;
      }
    }
  });
  define('member.add-job',{
    presentation:{label:'Add job',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Jobs/Select-Workplace.aspx',{Ordinal:'',ID:context.partyId}),
      popup:{title:'Add new job',width:'90%',height:'90%'},
      refresh:{when:'close',run:env => refreshReport(env,'.JobsIQA')}
    }
  });
  define('member.add-address',{
    presentation:{label:'Add new address',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/iParts/Contact%20Management/ContactAddressEditor/ContactAddressEdit.aspx',{
        ContentItemKey:'5eaa38bb-f275-4f1d-98ed-94cc6ff1060a',SingleTextAddress:'False',CloseWindowOnCommit:'true',ID:context.partyId
      }),
      popup:{title:'Add address',width:'70%',height:'70%'},
      refresh:{when:'close',run:env => refreshReport(env,'.AddressIQA')}
    }
  });
  define('member.add-contact-method',{
    presentation:{label:'Add contact method',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Add-Contact-Method.aspx',{ID:context.partyId}),
      popup:{title:'Add contact method',width:'70%',height:'70%'},
      refresh:{when:'close',run:env => refreshReport(env,'.ContactDetailsIQA')}
    }
  });
  define('home.manage-bulletin',{
    presentation:{label:'Manage bulletin',default:'button',menu:'menu-item'},context:{},
    action:{type:'navigate',href:'/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx',target:'_blank'}
  });
  define('home.add-task',{
    presentation:{label:'Add task',icon:'plus',default:'button',menu:'menu-item'},
    context:{
      // The signed-in staff member, not the selected contact. Anonymous
      // sessions resolve to null so the required check reports it rather
      // than opening the editor without an owner.
      partyId:{
        resolve:() => { const c = clientContext(); return c.isAnonymous === true ? null : c.loggedInPartyId ?? null; },
        required:true, validate:recordId
      }
    },
    action:{type:'popup',recordKey:['partyId'],
      // The personal task form once its page is set (UnionSuiteTaskForms).
      href:({context}) => {
        const form = window.UnionSuiteTaskForms?.href('personal');
        if (form) return form;
        const url = new URL('/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx',location.origin);
        url.searchParams.set('ID',context.partyId);
        return url.href;
      },
      popup:{title:'Add task',width:'70%',height:'70%',maxWidth:800},
      // Refresh the iPart the button belongs to, whichever report that is.
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('home.open-task', {
    presentation: {label: 'Open task', useAuthoredLabel: true, default: 'link'},
    context: {
      taskUrl: {from: 'trigger', attribute: 'data-us-task-url', required: true}
    },
    action: {
      type: 'popup',
      recordKey: ['taskUrl'],
      href: ({context}) => context.taskUrl,
      popup: {title: 'Open task', width: '70%', height: '70%', maxWidth: 800},
      refresh: {when: 'close', targets: [{type: 'origin-report'}]}
    }
  });
  // The pencil on a compact or full task row (US-TASK-ROWS 1.2, owner,
  // 19 October 2026): the title is plain text there, and the pencil opens
  // the same task popup the detail row's title link opens.
  define('home.edit-task', {
    presentation: {label: 'Edit task', icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {
      taskUrl: {from: 'trigger', attribute: 'data-us-task-url', required: true}
    },
    action: {
      type: 'popup',
      recordKey: ['taskUrl'],
      href: ({context}) => context.taskUrl,
      popup: {title: 'Edit task', width: '70%', height: '70%', maxWidth: 800},
      refresh: {when: 'close', targets: [{type: 'origin-report'}]}
    }
  });
  define('jobs.edit',{
    presentation:{label:'Edit job',icon:'pencil',default:'button',row:'icon',menu:'menu-item'},
    context:{...row,workplaceId:{from:'trigger',attribute:'data-workplace',required:true,validate:recordId}},
    action:{type:'popup',recordKey:['partyId','ordinal'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/EditJob.aspx',{ID:context.partyId,Ordinal:context.ordinal,Worksite:context.workplaceId}),
      popup:{title:'Edit job',width:'70%',height:'70%'},
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('jobs.delete',{
    presentation:{label:'Delete job',icon:'trash',tone:'danger',default:'button',row:'icon',menu:'menu-item'},context:row,
    action:{type:'function',recordKey:['partyId','ordinal'],confirm:{message:'Are you sure you wish to delete this job?'},
      async run({context}) {
        const token = document.getElementById('__RequestVerificationToken')?.value;
        if (!token) throw new Error('The request verification token is unavailable.');
        const response = await fetch('/api/i4u_UT_Jobs/~'+encodeURIComponent(context.partyId)+'|'+encodeURIComponent(context.ordinal),{
          method:'DELETE',credentials:'same-origin',redirect:'error',headers:{RequestVerificationToken:token,Accept:'application/json'}
        });
        if (!response.ok) throw new Error('Job deletion failed (HTTP '+response.status+').');
        return {deleted:true};
      },
      refresh:{when:'success',targets:[{type:'origin-report'}]},successMessage:'Job deleted.'
    }
  });
})();

/* Agreement page actions (3 October 2026).

   Replaces the CA_* popup launchers that the old page delivered through an
   IQA iPart. One definition, several placements (the class does the placing):
   - Panel headings: the class in the panel iPart's CSS class field.
   - Banner Actions menu: <button class="us-actions__item us-action-…">.
   - Rows: a link or button with the class and the row's data-* attributes.

   Refresh replaces the old reload helpers (CA_reloadList, CA_syncContactCards,
   CA_reloadContactCard, CA_reloadMilestones): the theme re-renders the iPart
   the action started from, or the named list when it started in the banner.

   Also registers the agreement task saver (US-TASK-ROWS defineSaver) and
   the shared CloudToolz call used by tasks, milestones and attachments. */
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');

  const agreementId = {from: 'query', parameter: 'AgreementID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid agreement ID.'};
  const agreementNum = {from: 'query', parameter: 'AgreementNum', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid agreement number.'};
  const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};
  // The signed-in staff member (not the contact being viewed). Anonymous
  // sessions resolve to null, so the required check stops the popup.
  const userId = {
    resolve: () => {
      let context = {};
      try { context = JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch (_) {}
      return context.isAnonymous === true ? null : context.loggedInPartyId ?? null;
    },
    required: true,
    validate: value => /^\d+$/.test(String(value).trim()) || 'Invalid signed-in user ID.'
  };

  function define(key, options) {
    return actions.define(key, {
      className: 'us-action-' + key.replace(/\./g, '-'),
      owner: 'UnionSuite',
      source: 'ActionDefinitions.js:' + key,
      ...options
    });
  }

  function page(path, values) {
    const url = new URL(path, location.origin);
    Object.entries(values).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return url.href;
  }

  // The iPart that owns a list carries its add action's class, so the class
  // also finds the list when the action starts somewhere else (the banner).
  function refreshList(listClass) {
    return {
      when: 'close',
      run: env => (env.origin.template || env.origin.report)
        ? env.refresh.originReport()
        : env.refresh.queryTemplate('.us-query-template.' + listClass)
    };
  }

  // sizing: optional popup size options (maxWidth, maxHeight) over the 90%.
  function popup(key, label, icon, href, title, refresh, sizing) {
    define(key, {
      presentation: {label, ...(icon ? {icon} : {}), default: 'button', menu: 'menu-item'},
      context: {agreementId, agreementNum, userId},
      action: {type: 'popup', recordKey: ['agreementId'], href, popup: {title, width: '90%', height: '90%', ...sizing}, ...(refresh ? {refresh} : {})}
    });
  }

  // ── Add entry ───────────────────────────────────────────────
  // Single-record forms (notes, tasks, milestones, meetings, terms, contacts)
  // stop at 800px:
  // 90% of a large screen stretched their narrow fields (owner, 5 October
  // 2026). A smaller window keeps the 90%.
  const formWidth = {maxWidth: 800};
  // Notes, tasks, milestones and attachments share the Zidebar Add Note form:
  // Type picks the form, ID is the signed-in user, Module, ModuleID and
  // ModuleOrdinal the agreement (owner, 14 and 19 October 2026).
  const addNoteForm = type => ({context}) => page('/_i4u_/Core/Zidebar/Add-Note-New.aspx', {
    Type: type, ID: context.userId, Module: 'agreement', ModuleID: context.agreementId, ModuleOrdinal: context.agreementNum
  });
  popup('agreements.add-note', 'Add note', 'plus',
    addNoteForm('note'),
    'Add note', refreshList('us-action-agreements-add-note'), formWidth);
  popup('agreements.upload-attachment', 'Upload', 'ti-upload',
    addNoteForm('attachmentonly'),
    'Add attachment', refreshList('us-action-agreements-upload-attachment'), {maxWidth: 960});
  popup('agreements.add-contact', 'Add contact', 'plus',
    ({context}) => page('/Agreements_ManageContacts', {AgreementID: context.agreementId}),
    'Manage contacts', refreshList('us-action-agreements-add-contact'));
  popup('agreements.add-meeting', 'Add meeting', 'plus',
    ({context}) => page('/Agreements_CreateMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum}),
    'Schedule meeting', refreshList('us-action-agreements-add-meeting'), formWidth);
  // The agreement task form once its page is set (UnionSuiteTaskForms);
  // until then the Add Note form's task type.
  popup('agreements.add-task', 'Add task', 'plus',
    args => window.UnionSuiteTaskForms?.href('agreement', {ModuleID: args.context.agreementId, ModuleOrdinal: args.context.agreementNum}) ||
      addNoteForm('task')(args),
    'Add task', refreshList('us-action-agreements-add-task'), formWidth);
  popup('agreements.add-milestone', 'Add milestone', 'plus',
    addNoteForm('milestone'),
    'Add milestone', refreshList('us-action-agreements-add-milestone'), formWidth);

  // ── Agreement details ───────────────────────────────────────
  // One editor with a Section parameter; a heading button cannot carry data
  // attributes, so each section is its own action. The panels it edits read
  // their IQAs through /api/query (US-FIELD-GROUPS, and US-BANNER-FACTS for
  // the banner's second row), so closing the editor runs those calls again
  // instead of reloading the page. Every field panel shown on the page is
  // refetched, because one edit can change several. Panels on other CCO tabs
  // are skipped: they are not on the page (or are hidden), and a tab loads
  // its panels fresh when it opens.
  // The agreement editor's sections stop at 1060px wide (owner, 5 October
  // 2026); a smaller window keeps the 90%.
  const editorWidth = {maxWidth: 1060};
  const reload = {when: 'close', run: () => {
    document.querySelectorAll('.us-field-groups[data-us-fields-query]').forEach(root => {
      if (root.getClientRects().length) window.UnionSuiteFieldGroups?.reload(root);
    });
    window.UnionSuiteBannerFacts?.reload?.();
  }};
  popup('agreements.edit', 'Update details', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'Details'}),
    'Edit agreement details', reload, editorWidth);
  popup('agreements.edit-key-dates', 'Update key dates', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'KeyDates'}),
    'Edit key dates', reload, editorWidth);
  popup('agreements.record-resolution', 'Record resolution', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'Resolution'}),
    'Record resolution', reload);
  define('agreements.clone', {
    presentation: {label: 'Clone agreement', icon: 'ti-copy', default: 'button', menu: 'menu-item'},
    context: {agreementId},
    action: {type: 'navigate', href: ({context}) => page('/_i4u_/Core/Collective_Agreements/Navigation/Create-Agreement.aspx', {AgreementID: context.agreementId})}
  });

  // ── Communication ───────────────────────────────────────────
  popup('agreements.email-team', 'Email negotiating team', 'ti-mail',
    ({context}) => page('/Agreements_EmailContacts', {AgreementID: context.agreementId}), 'Email negotiating team');
  // The send button in the Contacts heading (owner, 5 October 2026). It hands
  // the contacts on screen to a copy of iMIS's Create communication page (the
  // Communication Creator iPart), as the Email button under a Query Menu
  // report does with the original, so the send is tracked:
  //   <website>/<send page>?query=<IQA path>
  //     &queryparams=[{"Item1":"<filter>","Item2":"<value>"}, …]
  //     &ReturnUrl=<this page>
  // The IQA is API - Communication Recipient List - Contacts (owner, 6 October
  // 2026; before it, API - Communication Recipient List):
  // one prompt, Ordinal (the agreement contact rows to email), and a hidden
  // AgreementOrdinal = @url:AgreementNum filter. Several ordinals go in one
  // value, each in double quotes: "177","183","214" (iMIS's form for a list
  // in an Equals prompt). With a group, role or search filter on, Ordinal
  // carries the rows still shown; with nothing filtered it is blank, so the
  // whole agreement is emailed, including rows past the first page. The
  // agreement goes in queryparams under the IQA's prompt name,
  // AgreementOrdinal: the Communication Creator runs the query on the
  // server, not from this page's address, and ignored "@url:AgreementNum"
  // (24 October 2026).
  // AgreementID goes too: the send page (us-agreement-comms on its
  // Communication Creator iPart) puts "Agreement A107 –" at the start
  // of the subject, where staff cannot remove it (US-SUBJECT-TAG). So do
  // AgreementNum, Audience=Staff and CommunicationType=Email: after the send
  // the page links the log row to the agreement with them (US-COMMS-LOG).
  // It navigates rather than opening a popup, although the page sits in the
  // Popups folder: the Communication Creator returns to ReturnUrl when it
  // finishes, which would load this page inside a popup.
  // Icon only in the heading, a labelled item in menus.
  const emailContacts = {
    // The send page, under the current website (owner, 5 October 2026).
    page: '/_i4u_/Core/Collective_Agreements/v2/Popups/Send-Email-Contacts.aspx',
    query: '$/_i4u_/Core/CA/v2/API - Communication Recipient List - Contacts',
    ordinalFilter: 'Ordinal',
    // The IQA's own prompt name. "@url:AgreementNum" passed /api/query but
    // the send ignored it and counted every agreement's contacts (151
    // against 1; iMIS's confirmation, dev tenant, 24 October 2026).
    agreementFilter: 'AgreementOrdinal'
  };
  // The tiles' ordinals, all of them and those the filters leave shown.
  // A tile without its ordinal (a template from before data-us-contact-
  // ordinal) cannot be sent, so a list missing any ordinal stops the send.
  function contactOrdinals(wrapper) {
    const rows = wrapper ? [...wrapper.querySelectorAll('.QueryTemplateSet > section')]
      .map(section => ({section, ordinal: section.querySelector('[data-us-contact-ordinal]')?.getAttribute('data-us-contact-ordinal')?.trim()})) : [];
    if (rows.some(row => !row.ordinal)) {
      throw new Error('The contacts list does not mark each contact\'s ordinal (data-us-contact-ordinal in its Query Template), so the email cannot be limited to the contacts shown.');
    }
    const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
    return {total: rows.length, shown: shown.map(row => row.ordinal)};
  }
  // The current website's path (/UTNewTheme), as the native Email button
  // uses. gWebRoot is the virtual directory (usually blank), not the website.
  function websitePath(path) {
    const site = window.gWebSiteRoot || clientContext().websiteRoot || '';
    const root = site ? new URL(String(site), location.origin).pathname.replace(/\/+$/, '') : '';
    return new URL(root + path, location.origin);
  }
  // The send page's address: the record (AgreementID for the subject tag,
  // AgreementNum for the log row), audience and channel (US-COMMS-LOG), the
  // recipients query and its filters, and where to come back to.
  function sendPage(target, context, audience, filters) {
    const url = websitePath(target.page);
    url.searchParams.set('AgreementID', context.agreementId);
    url.searchParams.set('AgreementNum', context.agreementNum);
    url.searchParams.set('Audience', audience);
    url.searchParams.set('CommunicationType', 'Email');
    url.searchParams.set('query', target.query);
    url.searchParams.set('queryparams', JSON.stringify(filters));
    url.searchParams.set('ReturnUrl', location.pathname + location.search);
    return url.href;
  }
  define('agreements.email-contacts', {
    presentation: {label: 'Email contacts', icon: 'ti-send', default: 'button', header: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum},
    action: {type: 'function', recordKey: ['agreementId'],
      // Read the rows when the button is pressed, not when it is drawn: the
      // filters change without the action being checked again.
      run: ({context, wrapper}) => {
        const {total, shown} = contactOrdinals(wrapper);
        if (!total) throw new Error('This agreement has no contacts to email.');
        // Every row filtered out: nothing on screen to email, and a blank
        // Ordinal would mean the whole agreement.
        if (!shown.length) throw new Error('No contacts are shown to email. Clear the filter and try again.');
        const ordinals = shown.length < total ? shown : [];
        location.assign(sendPage(emailContacts, context, 'Staff', [
          {Item1: emailContacts.ordinalFilter, Item2: ordinals.map(ordinal => '"' + ordinal + '"').join(',')},
          {Item1: emailContacts.agreementFilter, Item2: String(context.agreementNum)}
        ]));
      }}
  });

  // Email members (owner, 6 October 2026): every member the agreement
  // covers, through the member send page, as Email contacts does for the
  // contacts. The page's Communication Creator iPart carries
  // us-agreement-comms us-agreement-comms--members (the subject tag, and the
  // log row's Audience=Members), and a Content HTML iPart above it shows the
  // count only (us-send-recipients--summary) with a link back to the
  // agreement's Coverage tab. The IQA, API - Communication Recipient List -
  // Members, takes the agreement's ordinal directly in its AgreementOrdinal
  // filter: queryparams=[{"Item1":"AgreementOrdinal","Item2":"123"}]. A
  // value passed through @url:AgreementNum did not filter reliably (owner,
  // 6 October 2026).
  // A labelled button, send icon and "Email Members", in the Covered Members
  // report's heading, and a labelled item in the banner's Actions menu
  // (owner, 6 October 2026). It emails every covered member, whatever the
  // report's own filters show, so it is drawn in the danger tone (red) to
  // say it matters and needs care.
  const emailMembers = {
    page: '/_i4u_/Core/Collective_Agreements/v2/Popups/SendEmail-Members.aspx',
    query: '$/_i4u_/Core/CA/v2/API - Communication Recipient List - Members',
    agreementFilter: 'AgreementOrdinal'
  };
  define('agreements.email-members', {
    presentation: {label: 'Email Members', icon: 'ti-send', default: 'button', header: 'button', menu: 'menu-item', tone: 'danger'},
    context: {agreementId, agreementNum},
    action: {type: 'function', recordKey: ['agreementId'],
      run: ({context}) => location.assign(sendPage(emailMembers, context, 'Members', [
        {Item1: emailMembers.agreementFilter, Item2: String(context.agreementNum)}
      ]))}
  });

  // ── Terms and coverage ──────────────────────────────────────
  popup('agreements.add-term', 'Add term', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum}),
    'Add term', refreshList('us-action-agreements-add-term'), formWidth);
  // The page removes several terms at once (owner, 4 October 2026: "Bulk remove").
  popup('agreements.remove-terms', 'Bulk remove', 'trash',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Delete_Terms.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Remove terms', refreshList('us-action-agreements-add-term'));
  popup('agreements.edit-coverage', 'Update coverage', 'pencil',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Coverage.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Edit coverage rules', {when: 'close', targets: [{type: 'origin-report'}]});
  // Layout v2 (index-v2.html): the Add scheduled increase BeyondForm, on its
  // own popup page (owner, 5 October 2026).
  popup('agreements.add-increase', 'Add increase', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Add-Scheduled-Increase.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Add scheduled increase', {when: 'close', targets: [{type: 'origin-report'}]}, formWidth);

  // ── Row actions (read the record from the row's data-ordinal) ─
  // Open actions sit on the row's own title, which keeps its text as a link
  // (as home.open-task does). Edit actions are icon buttons.
  const openLink = {useAuthoredLabel: true, default: 'link'};
  const editIcon = {icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'};
  // Closing a row's popup refreshes only that row (owner, 3 October 2026, as
  // the old page did for contact cards). A row whose template names its own
  // API IQA (data-us-row-query, as the contact tiles do) is patched from one
  // /api/query call; any other row is swapped from a fetch of the list.
  function refreshRow(env) {
    const row = env.trigger?.closest('[data-us-row-query]');
    if (row && window.UnionSuiteRowPatch) return window.UnionSuiteRowPatch.refresh(row);
    return env.refresh.originReport({row: '[data-ordinal="' + env.context.ordinal + '"]'});
  }
  // sizing: optional popup size options (maxWidth, maxHeight) over the 90%.
  function rowPopup(key, label, presentation, href, title, sizing) {
    define(key, {
      presentation: {label, ...presentation},
      context: {agreementId, agreementNum, ordinal: rowOrdinal},
      action: {type: 'popup', recordKey: ['agreementId', 'ordinal'], href, popup: {title, width: '90%', height: '90%', ...sizing},
        refresh: {when: 'close', run: refreshRow}}
    });
  }
  const noteDetails = mode => ({context}) => page('/_i4u_/Core/Zidebar/NoteDetails.aspx', {
    NoteOrdinal: context.ordinal, AgreementID: context.agreementId, ...(mode ? {[mode]: 'true'} : {})
  });
  // A row's edit is a pencil at its end everywhere on the page, and task,
  // milestone and meeting titles are plain text (owner, 6 and 7 October
  // 2026): these popups open forms that change the record. The open-link
  // actions remain for the earlier templates' title links.
  rowPopup('agreements.view-note', 'Open note', openLink, noteDetails(''), 'Note', formWidth);
  // The button on a ledger or reading note row (us-notes--ledger,
  // us-notes--reading); it was an eye. Its key stays, so the templates need
  // no change.
  rowPopup('agreements.preview-note', 'Edit note', editIcon, noteDetails(''), 'Note', formWidth);
  // Tasks open the agreement task form with the task's Ordinal once its
  // page is set (UnionSuiteTaskForms); until then the note details page.
  const taskForm = args => window.UnionSuiteTaskForms?.href('agreement', {
    ModuleID: args.context.agreementId, ModuleOrdinal: args.context.agreementNum, Ordinal: args.context.ordinal
  }) || noteDetails('Task')(args);
  const taskTitle = window.UnionSuiteTaskForms?.pages.agreement ? 'Edit task' : 'Task';
  rowPopup('agreements.view-task', 'Open task', openLink, taskForm, taskTitle, formWidth);
  rowPopup('agreements.edit-task', 'Edit task', editIcon, taskForm, taskTitle, formWidth);
  // The earlier task template's eye button, a pencil now too.
  rowPopup('agreements.preview-task', 'Edit task', editIcon, taskForm, taskTitle, formWidth);
  rowPopup('agreements.view-milestone', 'Open milestone', openLink, noteDetails('Milestones'), 'Milestone', formWidth);
  rowPopup('agreements.edit-milestone', 'Edit milestone', editIcon, noteDetails('Milestones'), 'Milestone', formWidth);
  const meetingForm = ({context}) => page('/Agreements_EditMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum, MeetingOrdinal: context.ordinal});
  rowPopup('agreements.view-meeting', 'Open meeting', openLink, meetingForm, 'Edit meeting', formWidth);
  rowPopup('agreements.edit-meeting', 'Edit meeting', editIcon, meetingForm, 'Edit meeting', formWidth);
  rowPopup('agreements.edit-contact', 'Edit contact', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Contact/Edit-Contact-Information.aspx', {ID: context.ordinal}),
    'Edit contact', formWidth);
  rowPopup('agreements.edit-term', 'Edit term', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum, TermOrdinal: context.ordinal}),
    'Update term', formWidth);
  // The increase row's pencil (owner, 5 October 2026). An edit can change
  // the group totals, so closing it refreshes the whole list, as Add
  // increase does, rather than the one row.
  define('agreements.edit-increase', {
    presentation: {label: 'Edit increase', ...editIcon},
    context: {agreementId, agreementNum, ordinal: rowOrdinal},
    action: {type: 'popup', recordKey: ['agreementId', 'ordinal'],
      href: ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Edit-Scheduled-Increase.aspx', {AgreementNum: context.agreementNum, IncreaseOrdinal: context.ordinal}),
      popup: {title: 'Edit scheduled increase', width: '90%', height: '90%', ...formWidth},
      refresh: {when: 'close', targets: [{type: 'origin-report'}]}}
  });

  // ── CloudToolz ──────────────────────────────────────────────
  // Every CloudToolz call stores a short-lived ZenToken in iMIS first; CloudToolz
  // reads it back to verify the request. The base URL is read once per page.
  let cloudToolzUrl = null;

  function token() {
    const value = document.getElementById('__RequestVerificationToken')?.value;
    if (!value) throw new Error('The request verification token is unavailable.');
    return value;
  }

  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }

  // /api/query rows are flat alias-keyed objects; older endpoints return
  // Name/Value property lists. Read either, ignoring case.
  function propertyValue(item, name) {
    const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
    const properties = unwrap(item?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(entry => String(entry.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(item || {}).find(entry => entry.toLowerCase() === name.toLowerCase());
    return key ? unwrap(item[key]) : undefined;
  }

  async function baseUrl() {
    if (cloudToolzUrl) return cloudToolzUrl;
    const params = new URLSearchParams({QueryName: '$/ZENTSO/Security/CloudToolzUrl'});
    const response = await fetch('/api/query?' + params, {credentials: 'same-origin', headers: {RequestVerificationToken: token()}});
    if (!response.ok) throw new Error('The CloudToolz URL query failed (HTTP ' + response.status + ').');
    const data = await response.json();
    const url = propertyValue(data?.Items?.$values?.[0], 'Description');
    if (!url) throw new Error('The CloudToolz URL is not configured in iMIS.');
    cloudToolzUrl = String(url).replace(/\/$/, '');
    return cloudToolzUrl;
  }

  async function storeZenToken(context) {
    const property = (name, value) => ({$type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value});
    const response = await fetch('/api/ZenTokens', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', RequestVerificationToken: token()},
      body: JSON.stringify({
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: 'ZenTokens',
        Properties: {$type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', $values: [
          property('PartyId', context.loggedInPartyId),
          property('ID', context.loggedInPartyId),
          property('SelectedPartyId', context.selectedPartyId),
          property('RequestVerificationToken', token()),
          property('UtcUnixTimeStamp', Date.now())
        ]}
      })
    });
    if (!response.ok) throw new Error('The ZenToken could not be stored (HTTP ' + response.status + ').');
  }

  async function cloudToolz(path, init = {}) {
    const context = clientContext();
    const url = await baseUrl();
    await storeZenToken(context);
    const response = await fetch(url + path, {
      ...init,
      headers: {
        ...(init.body ? {'Content-Type': 'application/json'} : {}),
        RequestVerificationToken: token(),
        SelectedPartyId: context.selectedPartyId,
        LoggedInPartyId: context.loggedInPartyId,
        WebsiteKey: window.gWebsiteKey || ''
      }
    });
    if (!response.ok) throw new Error('CloudToolz ' + path.split('?')[0] + ' failed (HTTP ' + response.status + ').');
    return response;
  }

  // Status for a task or milestone note. action: Complete | In Progress | Not Complete.
  function saveItemStatus(ordinal, action, noteType) {
    return cloudToolz('/ca/complete-task', {method: 'POST', body: JSON.stringify({TaskID: ordinal, Action: action, NoteType: noteType})});
  }

  // Whether the signed-in user may read a restricted note (owner, 6 October
  // 2026). CloudToolz knows the user from the call, as for complete-task,
  // checks the note's access (Open, Individual, Team) and answers
  // {Access: 'Granted' | 'Restricted', Note}; the text comes only when granted.
  async function noteAccess(ordinal) {
    const response = await cloudToolz('/ca/note-access', {method: 'POST', body: JSON.stringify({NoteOrdinal: ordinal})});
    return response.json();
  }

  // A term's status from the row's quick edit (us-term__status-button;
  // owner, 6 October 2026), as complete-task saves a task's. Action is the
  // status as shown: Negotiating | Included | Not Included.
  function saveTermStatus(ordinal, action) {
    return cloudToolz('/ca/quick-edit-term', {method: 'POST', body: JSON.stringify({TermID: ordinal, Action: action})});
  }

  // One term deleted from its row's bin (owner, 6 October 2026), as the
  // status quick edit saves. The heading's Bulk remove keeps the
  // Delete_Terms.aspx popup for several terms.
  function deleteTerm(ordinal) {
    return cloudToolz('/ca/quick-delete-term', {method: 'POST', body: JSON.stringify({TermID: ordinal})});
  }

  // The agreement's milestones in their new order (US-MILESTONE-ORDER;
  // owner, 7 October 2026), each with its Sequence, 1 for the first. The
  // Milestones IQA sorts on Sequence. Proposed endpoint: not built yet.
  function saveMilestoneOrder(ordinals) {
    const agreementId = new URLSearchParams(location.search).get('AgreementID') || '';
    return cloudToolz('/ca/reorder-milestones', {
      method: 'POST',
      body: JSON.stringify({AgreementID: agreementId, Milestones: ordinals.map((Ordinal, index) => ({Ordinal, Sequence: index + 1}))})
    });
  }

  window.UnionSuiteAgreements = Object.freeze({cloudToolz, saveItemStatus, saveTermStatus, deleteTerm, saveMilestoneOrder, noteAccess, version: '1.0'});

  // The bin in an open term row: asks first, deletes, then refreshes the
  // terms list it sits in. A failed delete leaves the row and says so.
  // Once deleted, the row's words fly into the bin (US-TERM-DELETE, the word
  // vacuum; owner, 6 October 2026) before the list refreshes.
  define('agreements.delete-term', {
    presentation: {label: 'Delete term', icon: 'trash', tone: 'danger', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum, ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['agreementId', 'ordinal'],
      confirm: {message: 'Delete this term? This cannot be undone.'},
      run: async ({context, trigger}) => {
        await deleteTerm(context.ordinal);
        // The term is gone by now, so a failed animation only logs.
        const section = trigger?.closest('.QueryTemplateSet > section');
        try {
          if (section) await window.UnionSuiteTermDelete?.play(section, trigger);
        } catch (error) {
          console.warn('[agreements.delete-term] The delete animation failed:', error);
        }
        return {deleted: true};
      },
      refresh: {when: 'success', targets: [{type: 'origin-report'}]},
      successMessage: 'Term deleted.'}
  });

  // US-TERMS in zUnionSuite.js: a status change shows at once and reverts
  // with "Not saved" if this throws (an HTTP error from CloudToolz does).
  window.UnionSuiteTermStatus?.defineSaver?.(({ordinal, label}) => saveTermStatus(ordinal, label));

  // US-MILESTONE-ORDER in zUnionSuite.js: Save order keeps the new order
  // and says "Order not saved" if this throws.
  window.UnionSuiteMilestoneOrder?.defineSaver?.(({ordinals}) => saveMilestoneOrder(ordinals));

  // Show note on a restricted note (US-NOTES-RESTRICTED in zUnionSuite.js).
  // Granted shows the text; Restricted reads as denied ("You don't have
  // permission…"); any other answer reads as a failed check.
  window.UnionSuiteRestrictedNotes?.defineLoader?.(async ({ordinal}) => {
    const data = await noteAccess(ordinal);
    const access = String(propertyValue(data, 'Access') ?? '').trim().toLowerCase();
    if (access === 'granted') return String(propertyValue(data, 'Note') ?? '');
    if (access === 'restricted') {
      const denied = new Error('Access to this note is restricted.');
      denied.denied = true;
      throw denied;
    }
    throw new Error('The note access check gave no answer (Access was "' + access + '").');
  });

  // Agreement task rows carry data-us-task-save="agreements.item-status".
  window.UnionSuiteTaskRows?.defineSaver?.('agreements.item-status', async ({root, done}) => {
    const ordinal = (root.getAttribute('data-us-task-ordinal') || '').trim();
    if (!/^\d+$/.test(ordinal)) throw new Error('The agreement task has no ordinal.');
    await saveItemStatus(ordinal, done ? 'Complete' : 'Not Complete', root.getAttribute('data-us-task-note-type') || 'Task');
  });

  // ── Attachments ─────────────────────────────────────────────
  // The file is read from the nearest element that names one: an attachment
  // row (us-attachment), or an activity timeline card whose IQA returns the
  // Data-us-file-* columns (a logged email or an attachment added; owner,
  // 21 October 2026).
  const fileHolder = '[data-us-file-id]';
  const attachmentRow = {
    ordinal: rowOrdinal,
    uniqueId: {from: 'closest', selector: fileHolder, attribute: 'data-us-file-id', required: true},
    branch: {from: 'closest', selector: fileHolder, attribute: 'data-us-file-branch', required: true},
    fileName: {from: 'closest', selector: fileHolder, attribute: 'data-us-file-name'}
  };

  async function downloadFile(context) {
    const query = new URLSearchParams({uniqueid: context.uniqueId, branch: context.branch, delordinal: context.ordinal});
    const response = await cloudToolz('/flowz/sharepoint/download?' + query, {method: 'GET'});
    const data = await response.json();
    if (!data?.Base64string) throw new Error('The download returned no file.');
    // A data: URL, not a blob: URL — Firefox ignores download on blob: URLs.
    const link = document.createElement('a');
    link.href = 'data:application/octet-stream;base64,' + data.Base64string;
    link.download = data.FileName || context.fileName || 'file';
    document.body.append(link);
    link.click();
    link.remove();
    return {downloaded: link.download};
  }

  define('agreements.download-attachment', {
    presentation: {label: 'Download', icon: 'ti-download', default: 'button', row: 'icon', menu: 'menu-item'},
    context: attachmentRow,
    action: {type: 'function', recordKey: ['ordinal'], run: ({context}) => downloadFile(context), successMessage: 'Download started.'}
  });

  // Viewing opens the file through the same download until a CloudToolz view
  // endpoint exists (the old page's view modal was a placeholder).
  define('agreements.view-attachment', {
    presentation: {label: 'View', icon: 'ti-eye', default: 'button', row: 'icon', menu: 'menu-item'},
    context: attachmentRow,
    action: {type: 'function', recordKey: ['ordinal'], run: ({context}) => downloadFile(context)}
  });

  // Inline name/tag editing is US-ATTACHMENTS in zUnionSuite.js;
  // this action opens the editor on the row and saves through CloudToolz.
  define('agreements.edit-attachment', {
    presentation: {label: 'Edit name and tags', icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['ordinal'], run: ({trigger}) => window.UnionSuiteAttachments.edit(trigger.closest('.us-attachment'))}
  });
})();

/* Case page actions (20 October 2026; promoted from the case page
   prototype's case-actions.candidate.js).

   The case page is /Cases_ManageCase?CaseID=C202&CaseNum=198 (the case
   reference and the i4u_UT_Cases Ordinal), as the contact page's case links
   build it. Every action reads both from the page URL.

   POPUP PAGES AND ENDPOINTS ARE PROPOSED. The Cases_* shortcuts follow the
   agreement pattern and have not been checked against the live site, and
   the /cases/* CloudToolz endpoints are not built yet (case page README,
   open decisions 1 and 3). A missing page opens as an error in its popup; a
   missing endpoint fails the save, which says so. Every composer posts to
   the owner's /cases/quick-add/* (20 October 2026): note, task, meeting,
   attachment, staff and contact (the add party composer). Each body starts
   with CaseID and CaseNum, both from the page URL.

   Reused from the agreement actions above:
   - The CloudToolz call (UnionSuiteAgreements). Case notes and tasks live in
     the same Zen_CloudFiles_Notes table as agreement notes, so the task tick
     saves through /ca/complete-task by note ordinal. To confirm.
   - The restricted note loader (/ca/note-access), defined once for the page.
   - Attachment View, Download and Edit: they read only the row, so the case
     template keeps the agreements.*-attachment classes. */
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');

  const caseId = {from: 'query', parameter: 'CaseID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid case ID.'};
  const caseNum = {from: 'query', parameter: 'CaseNum', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid case number.'};
  const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};

  function define(key, options) {
    return actions.define(key, {
      className: 'us-action-' + key.replace(/\./g, '-'),
      owner: 'UnionSuite',
      source: 'ActionDefinitions.js:' + key,
      ...options
    });
  }

  function page(path, values) {
    const url = new URL(path, location.origin);
    Object.entries(values).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return url.href;
  }

  // The iPart that owns a list carries its add action's class, so the class
  // also finds the list when the action starts in the banner.
  function refreshList(listClass) {
    return {
      when: 'close',
      run: env => (env.origin.template || env.origin.report)
        ? env.refresh.originReport()
        : env.refresh.queryTemplate('.us-query-template.' + listClass)
    };
  }

  function popup(key, label, icon, href, title, refresh, sizing) {
    define(key, {
      presentation: {label, ...(icon ? {icon} : {}), default: 'button', menu: 'menu-item'},
      context: {caseId, caseNum},
      action: {type: 'popup', recordKey: ['caseId'], href, popup: {title, width: '90%', height: '90%', ...sizing}, ...(refresh ? {refresh} : {})}
    });
  }

  const formWidth = {maxWidth: 800};

  // ── Add entry: composers (C40) ──────────────────────────────
  // Every add on the page opens a composer in the section it was pressed
  // in (US-INLINE-COMPOSER; owner, 10 October 2026: "apply the same format
  // to all add functions within the cases page"), and each composer's More
  // options is the full form (KEY-form), which the banner's Actions menu
  // opens directly. The saves are proposed CloudToolz endpoints.
  // A page without US-INLINE-COMPOSER (an older zUnionSuite.js, or a build
  // that loads this file on its own) skips the adds, whose buttons then show
  // as not configured, rather than losing every other case action.
  const composers = window.UnionSuiteComposers;

  // A call through the agreement actions' CloudToolz call, defined above.
  function callCloudToolz(path, init) {
    const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
    if (!cloudToolz) throw new Error('The CloudToolz call (UnionSuiteAgreements) is unavailable.');
    return cloudToolz(path, init);
  }

  const post = (path, body) => callCloudToolz(path, {method: 'POST', body: JSON.stringify(body)});

  // The endpoint's answer: the new record's {Ordinal} (or {Ordinals}).
  async function send(path, body) {
    const response = await post(path, body);
    return response.json().catch(() => ({}));
  }

  // An IQA's rows through GET /api/query.
  async function query(name, values) {
    const params = new URLSearchParams({QueryName: name, offset: '0', ...values});
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {credentials: 'same-origin', headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return (await response.json())?.Items?.$values || [];
  }

  // A proposed search IQA (at most 8 rows unless the caller says otherwise;
  // extra parameters go with Search).
  const lookup = (name, term, extra = {}) => query(name, {Search: term, limit: '8', ...extra});

  // A value read once for the page and shared by every composer; a failed
  // read is tried again next time.
  function once(load) {
    let pending = null;
    return () => pending ||= load().catch(error => {
      pending = null;
      throw error;
    });
  }

  // A row's column by name, whatever its case, spaces or underscores
  // ("value" or "Value"; "Full Name", "FullName" or "FULL_NAME").
  const columnKey = name => String(name).replace(/[\s_]/g, '').toLowerCase();
  const column = (row, name) => row?.[Object.keys(row || {}).find(key => columnKey(key) === columnKey(name))];

  // People already in the section show in the list but cannot be picked.
  const onCase = wrapper => new Set([...(wrapper?.querySelectorAll('[data-us-contact-id]') || [])].map(node => node.getAttribute('data-us-contact-id')));

  function base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Today as YYYY-MM-DD: the date previews pin (UnionSuiteQueryStatesConfig,
  // which also decides which meetings are past), otherwise the local date.
  function today() {
    const pinned = window.UnionSuiteQueryStatesConfig?.today;
    if (pinned) return String(pinned).slice(0, 10);
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function composer(key, spec) {
    if (!composers?.define) return;
    composers.define(key,{context: {caseId, caseNum}, recordKey: ['caseId'], owner: 'UnionSuite', source: 'ActionDefinitions.js:' + key, ...spec});
  }

  // A placeholder list until the Note category value list is read from iMIS.
  const CATEGORIES = ['Case', 'Employer', 'Membership', 'Intake', 'Meeting'];

  // Notes (C34): a follow-up note is also a task (owner, 9 October 2026).
  composer('cases.add-note', {
    label: 'Add note',
    form: {href: ({context}) => page('/Cases_CreateNote', {CaseID: context.caseId}), title: 'Add note'},
    lists: values => values.FollowUp ? ['us-action-cases-add-note', 'us-action-cases-add-task'] : ['us-action-cases-add-note'],
    arrive: 'top',
    composer: {
      kind: 'note', label: 'New note', save: 'Save note',
      main: {type: 'textarea', name: 'Note', label: 'Note', placeholder: 'Write a note…', required: 'Write the note first.'},
      fields: [
        {type: 'select', name: 'Category', label: 'Category', options: CATEGORIES},
        {type: 'checkbox', name: 'FollowUp', label: 'Follow up'},
        {type: 'date', name: 'FollowUpDate', label: 'Follow-up date', shownBy: 'FollowUp', required: 'Choose a follow-up date.'}
      ],
      submit: (values, context) => send('/cases/quick-add/note', {CaseID: context.caseId, CaseNum: context.caseNum, Note: values.Note, Category: values.Category,
        FollowUp: values.FollowUp, FollowUpDate: values.FollowUp ? values.FollowUpDate : ''}),
      saved: values => values.FollowUp ? 'Note saved, with a follow-up task.' : 'Note saved.',
      failed: 'The note could not be saved. Try again.'
    }
  });

  // Tasks (C40): stays open for the next one; the server assigns the lead
  // staff member. More options is the case task form once its page is set
  // (UnionSuiteTaskForms); until then the proposed Cases_CreateTask page.
  composer('cases.add-task', {
    label: 'Add task',
    form: {href: ({context}) => window.UnionSuiteTaskForms?.href('case', {ModuleID: context.caseId, ModuleOrdinal: context.caseNum}) ||
      page('/Cases_CreateTask', {Task: 'true', CaseID: context.caseId}), title: 'Add task'},
    lists: () => ['us-action-cases-add-task', 'us-action-cases-add-note'],
    // Oldest outstanding first: a new task is the last of them.
    arrive: 'bottom',
    // In the timeline a task shows as its note.
    feed: ['note'],
    composer: {
      kind: 'task', label: 'New task', save: 'Save task', keepOpen: true,
      main: {type: 'text', name: 'Task', label: 'Task', placeholder: 'What needs doing…', required: 'Write the task first.'},
      fields: [{type: 'date', name: 'DueDate', label: 'Due Date', showLabel: true}],
      submit: (values, context) => send('/cases/quick-add/task', {CaseID: context.caseId, CaseNum: context.caseNum, Task: values.Task, DueDate: values.DueDate}),
      saved: 'Task added.', failed: 'The task could not be added. Try again.'
    }
  });

  // Meetings (C39): attendees and the agenda are More options.
  composer('cases.add-meeting', {
    label: 'Add meeting',
    form: {href: ({context}) => page('/Cases_CreateMeeting', {CaseID: context.caseId, CaseOrdinal: context.caseNum}), title: 'Schedule meeting'},
    lists: () => ['us-action-cases-add-meeting'],
    arrive: {field: 'Date', attribute: 'data-us-meeting-date', order: 'ascending'},
    composer: {
      kind: 'meeting', label: 'New meeting', save: 'Save meeting',
      main: {type: 'text', name: 'Title', label: 'Meeting title', placeholder: 'Meeting title…', required: 'Give the meeting a title.'},
      fields: [
        {type: 'date', name: 'Date', label: 'Meeting date', required: 'Choose the meeting date.'},
        {type: 'time', name: 'Time', label: 'Start time'},
        {type: 'text', name: 'Location', label: 'Location', placeholder: 'Location', width: 'grow'}
      ],
      // A date before today is usually a slip (owner, 10 October 2026: "an
      // are you sure"), but past meetings are recorded too, so it asks.
      confirm: values => values.Date && values.Date < today()
        ? 'That date has passed. Save the meeting anyway?' : null,
      // DateTime is the two together for the meeting's datetime column
      // (owner, 21 October 2026): local time with no offset, as iMIS stores
      // it, and midnight when no start time is given.
      submit: (values, context) => send('/cases/quick-add/meeting', {CaseID: context.caseId, CaseNum: context.caseNum, Title: values.Title, Date: values.Date,
        Time: values.Time, DateTime: values.Date + 'T' + (values.Time || '00:00').slice(0, 5) + ':00', Location: values.Location}),
      saved: 'Meeting saved.', failed: 'The meeting could not be saved. Try again.'
    }
  });

  // Attachments (C39): files dropped or chosen and their tags (owner, 21
  // October 2026: tags in place of the Sensitive flag). The files go as
  // Base64, as CloudToolz downloads return them (its helper sends JSON).
  // The tags come from CloudToolz POST /zidebar/sharepoint/tagsprefill,
  // read once for the page. ITS ANSWER IS TO CONFIRM: a list of tags, bare
  // or under Items (.$values), each read from the first of TAG_VALUE and
  // TAG_LABEL it has.
  const TAG_VALUE = ['TagOrdinal', 'Ordinal', 'TagID', 'ID', 'Value', 'Code'];
  const TAG_LABEL = ['TagName', 'Name', 'Label', 'Description', 'Tag'];
  const firstColumn = (row, names) => names.map(name => column(row, name)).find(value => value != null && value !== '');

  const attachmentTags = once(async () => {
    const query = new URLSearchParams(location.search);
    const response = await post('/zidebar/sharepoint/tagsprefill', {CaseID: query.get('CaseID') || '', CaseNum: query.get('CaseNum') || ''});
    const data = await response.json();
    const rows = Array.isArray(data) ? data : data?.Items?.$values || data?.Items || data?.Tags || [];
    return rows.map(row => typeof row === 'object'
      ? {value: String(firstColumn(row, TAG_VALUE) ?? firstColumn(row, TAG_LABEL) ?? ''), label: String(firstColumn(row, TAG_LABEL) ?? firstColumn(row, TAG_VALUE) ?? '')}
      : {value: String(row), label: String(row)})
      .filter(tag => tag.value && tag.label);
  });

  // More options is the Zidebar Add Note form's attachment type (owner, 26
  // October 2026): ID the case's member, from the member card
  // (Case-Member-Query-Template.html), ModuleID the case.
  composer('cases.add-attachment', {
    label: 'Upload', icon: 'ti-upload',
    form: {label: 'Upload attachment', href: ({context}) => page('/_i4u_/Core/Zidebar/Add-Note-New.aspx', {
      Type: 'attachmentonly', ID: document.querySelector('[data-us-case-member]')?.getAttribute('data-us-member-id') || '',
      Module: 'case', ModuleID: context.caseId
    }), title: 'Add attachment', maxWidth: 960},
    lists: () => ['us-action-cases-add-attachment'],
    arrive: 'top',
    composer: {
      kind: 'attachment', label: 'New attachment', save: 'Upload', eachFile: true,
      main: {type: 'files', name: 'Files', label: 'Files', required: 'Choose a file first.'},
      fields: [{type: 'multiselect', name: 'Tags', label: 'Tags', placeholder: 'Add tags…', options: attachmentTags,
        empty: term => term ? 'No tags match “' + term + '”.' : 'No more tags.'}],
      // The tags as ordinals and names, comma-separated, as the attachment
      // editor's /ca/update-attachment takes them.
      submit: async (values, context) => {
        const tags = (await attachmentTags()).filter(tag => values.Tags.includes(tag.value));
        return send('/cases/quick-add/attachment', {CaseID: context.caseId, CaseNum: context.caseNum,
          TagOrdinals: tags.map(tag => tag.value).join(','), TagNames: tags.map(tag => tag.label).join(','),
          Files: await Promise.all(values.Files.map(async file => ({FileName: file.name, Base64string: await base64(file)})))});
      },
      saved: values => values.Files.length > 1 ? 'Attachments uploaded.' : 'Attachment uploaded.',
      failed: 'The upload failed. Try again.'
    }
  });

  // Staff (C38, C40): a person from the staff and delegates list, never
  // free text, and their role on the case; their type is the person's.
  // The people come from CloudToolz (owner, 21 October 2026): GET
  // /cases/quick-add/StaffList?CaseNum= answers [{StaffID, StaffName}], read
  // once for the page from when Add staff is pressed, and searched here by
  // part of a name. The list opens when the field is clicked or typed in.
  // The Role list is the case staff member types value list: its value
  // column is the code saved, its label column what shows.
  const staffList = once(async () => {
    const caseNum = new URLSearchParams(location.search).get('CaseNum') || '';
    const response = await callCloudToolz('/cases/quick-add/StaffList?' + new URLSearchParams({CaseNum: caseNum}), {method: 'GET'});
    const data = await response.json();
    return Array.isArray(data) ? data : data?.Items?.$values || data?.Items || [];
  });
  const staffTypes = once(async () => (await query('$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Get Case Staff Member Types', {limit: '100'}))
    .map(row => ({value: column(row, 'value') ?? '', label: column(row, 'label') ?? ''})));

  function staffMatching(people, term) {
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    return people.filter(person => words.every(word => String(person.StaffName || '').toLowerCase().includes(word)));
  }

  composer('cases.add-staff', {
    label: 'Add staff',
    form: {href: ({context}) => page('/Cases_ManageStaff', {CaseID: context.caseId}), title: 'Add staff'},
    lists: () => ['us-action-cases-add-staff'],
    // The end of the team (owner, 10 October 2026: groups do not matter).
    arrive: 'bottom',
    composer: {
      kind: 'staff', label: 'New staff member', save: 'Add', keepOpen: true,
      main: {type: 'combobox', name: 'StaffID', label: 'Staff member', placeholder: 'Search staff…', avatars: true,
        required: 'Choose someone from the list.',
        search: async ({term, wrapper}) => {
          const taken = onCase(wrapper);
          return staffMatching(await staffList(), term).slice(0, 8).map(person => {
            const disabled = taken.has(String(person.StaffID));
            return {value: person.StaffID, name: person.StaffName, meta: disabled ? 'On the case' : '', disabled};
          });
        },
        preload: () => staffList(),
        empty: term => term ? 'No staff match “' + term + '”.' : 'No staff to show.'},
      fields: [{type: 'select', name: 'Role', label: 'Role on the case', options: staffTypes}],
      submit: (values, context) => send('/cases/quick-add/staff', {CaseID: context.caseId, CaseNum: context.caseNum, StaffID: values.StaffID, Role: values.Role}),
      saved: 'Staff member added.', failed: 'The staff member could not be added. Try again.'
    }
  });

  // Parties (C40): usually one member, sometimes several, sometimes an
  // employer (owner, 8 October 2026). The quick add lists the members at
  // the case's workplace, the usual co-complainants; More options is the
  // full form, which searches every contact (owner, 10 October 2026).
  // The list IQA (owner, 28 October 2026) returns the active members
  // currently working at i4u_UT_Cases.PrimaryWorkplaceID: CaseNum
  // (required) and Search (optional, the taskbar quick search's string of
  // name, email and phone) in; ID, Full Name, Member Type and Member
  // Category out, at most 20. Its aliases are read by column(), so
  // "Full Name", "FullName" and "FULL_NAME" all match.
  const WORKPLACE_MEMBERS = '$/_i4u_/Core/Cases/Layouts v2/API - Manage Case - Contact List - Primary Workplace';
  composer('cases.add-party', {
    label: 'Add party',
    form: {href: ({context}) => page('/Cases_ManageContacts', {CaseID: context.caseId}), title: 'Add party'},
    lists: () => ['us-action-cases-add-party', 'us-action-cases-view-member'],
    arrive: 'bottom',
    composer: {
      kind: 'party', label: 'New party', save: 'Add', keepOpen: true,
      main: {type: 'combobox', name: 'ContactID', label: 'Member at the workplace', placeholder: 'Members at the case’s workplace…', avatars: true,
        required: 'Choose a member from the list, or use More options to search everyone.',
        search: async ({term, wrapper}) => {
          const taken = onCase(wrapper);
          const caseNum = new URLSearchParams(location.search).get('CaseNum') || '';
          return (await lookup(WORKPLACE_MEMBERS, term, {CaseNum: caseNum, limit: '20'})).map(row => {
            const id = String(column(row, 'ID') ?? '');
            const disabled = taken.has(id);
            return {value: id, name: column(row, 'Full Name') ?? '',
              meta: [column(row, 'Member Type'), column(row, 'Member Category'), disabled ? 'On the case' : ''].filter(Boolean).join(' · '), disabled};
          });
        },
        empty: term => (term ? 'No members at this workplace match “' + term + '”.' : 'No other members at this workplace.') + ' More options searches everyone.'},
      fields: [],
      submit: (values, context) => send('/cases/quick-add/contact', {CaseID: context.caseId, CaseNum: context.caseNum, ContactID: values.ContactID}),
      saved: 'Party added.', failed: 'The party could not be added. Try again.'
    }
  });

  // Several parties are handled by designating one the primary
  // party (owner, 8 October 2026). The Parties tab's preview
  // carries this button for any member who is not already primary (the
  // template's CSS hides it for the primary and for employers). After the
  // save nothing reloads on the tab (owner, 9 October 2026): the button
  // turns into the crown (promoteButton, below), the new primary's row
  // slides to the top of the list as a new lead staff card does
  // (slideToTop), the banner's member line names them (above), and the
  // Overview's member card refreshes out of sight on its own tab.
  // Proposed CloudToolz endpoint, not built yet.
  // The banner's member line (C9) names the primary party. The banner
  // cannot be re-rendered in place (its iPart sits in a zone without a
  // stable ID), so the line is rewritten from the chosen party's row,
  // which holds the same values, and fades in. A reload shows the IQA's.
  function chosenParty(trigger) {
    const wrapper = trigger?.closest('.us-parties');
    const row = wrapper?.querySelector('.us-party__select[aria-pressed="true"]')?.closest('.us-party');
    const card = trigger?.closest('.us-case-member');
    // The name is plain text; View profile carries the link (owner, 9 October 2026).
    const name = card?.querySelector('.us-case-member__name-text');
    const link = card?.querySelector('.us-case-member__profile');
    if (!row || !name) return null;
    const badge = row.querySelector('.us-party__standing');
    return {
      name: name.textContent.trim(),
      href: link?.getAttribute('href') || '',
      line: card.querySelector('.us-case-member__meta')?.textContent.trim() || '',
      standing: badge?.textContent.trim() || '',
      tone: [...(badge?.classList || [])].find(name => /^us-badge--(danger|warning|success|info)$/.test(name))?.slice('us-badge--'.length) || ''
    };
  }

  function showBannerMember(member) {
    const line = document.querySelector('.us-banner .us-banner__member');
    if (!member || !line) return;
    const name = line.querySelector('.us-banner__member-name');
    const number = line.querySelector('.us-banner__member-line');
    const badge = line.querySelector('.us-banner__badge');
    if (name) {
      name.textContent = member.name;
      name.setAttribute('href', member.href);
    }
    if (number) number.textContent = member.line;
    if (badge) {
      badge.textContent = member.standing;
      badge.className = 'us-banner__badge' + (member.tone ? ' us-banner__badge--' + member.tone : '');
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      line.animate([{opacity: 0}, {opacity: 1}], {duration: 180, easing: 'cubic-bezier(.2, 0, 0, 1)'});
    }
  }

  // The body carries the party's iMIS ID (ContactID) with the case party
  // row's ordinal (owner, 21 October 2026). The Parties preview shows the
  // chosen row's details apart from the row, so the ID comes from the row
  // with the button's ordinal (data-us-contact-ordinal).
  const partyId = {
    resolve: ({trigger}) => {
      const ordinal = trigger.getAttribute('data-ordinal') || '';
      const row = trigger.closest('[data-us-contact-id]') ||
        document.querySelector(`.us-party[data-us-contact-ordinal="${CSS.escape(ordinal)}"]`);
      return row?.getAttribute('data-us-contact-id') ?? null;
    },
    required: true,
    validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid party ID.'
  };

  define('cases.set-primary-party', {
    presentation: {label: 'Make primary party', icon: 'ti-crown', default: 'icon', row: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum, ordinal: rowOrdinal, contactId: partyId},
    action: {type: 'function', recordKey: ['caseId', 'ordinal'],
      run: ({context}) => post('/cases/quick-update/set-primary-party', {CaseID: context.caseId, CaseNum: context.caseNum, ContactID: context.contactId, PartyOrdinal: context.ordinal}),
      refresh: {when: 'success', run: async env => {
        const member = chosenParty(env.trigger);
        if (!await promoteParty(env.trigger)) await env.refresh.originReport();
        showBannerMember(member);
        if (document.querySelector('[data-us-case-member]')) await env.refresh.queryTemplate('[data-us-case-member]');
      }},
      successMessage: 'Primary party updated.'}
  });

  // The new primary party, in place (owner, 9 October 2026). The quiet
  // crown beside the name becomes the primary's amber crown where it sits,
  // popping in as a new lead staff member's does (C8), while the person's
  // row slides to the top of the list (slideToTop) and the old primary's
  // row gives up its lead. Reduced motion swaps at once. Returns false when
  // the preview or row is missing, so the caller refreshes.
  async function promoteParty(trigger) {
    const pane = trigger?.closest('.us-parties__preview');
    const wrapper = trigger?.closest('.us-parties');
    const row = wrapper?.querySelector('.us-party__select[aria-pressed="true"]')?.closest('.us-party');
    const section = row?.closest('.QueryTemplateSet > section');
    if (!pane || !row || !section) return false;
    const button = pane.querySelector('.us-party__make-primary');
    // Pressed from the keyboard: focus moves on to View profile.
    const keyboard = button?.matches(':focus-visible');
    slideToTop(section);
    takeLead(pane, row, section);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pane.setAttribute('data-us-lead-arrived', '');
      setTimeout(() => pane.removeAttribute('data-us-lead-arrived'), 440);
    }
    if (keyboard) pane.querySelector('.us-case-member__profile')?.focus({preventScroll: true});
    else if (document.activeElement === button) button.blur();
    return true;
  }

  // The lead marks: the row's (its avatar and screen reader role) and the
  // preview's (crown, not the button).
  function takeLead(pane, row, section) {
    section.parentElement.querySelectorAll('.us-party[data-us-contact-lead]').forEach(other => {
      const lead = other === row;
      const role = other.querySelector('.us-party__select .sr-only');
      if (role) role.textContent = lead ? ', Primary party' : ', Party';
    });
    pane.setAttribute('data-us-contact-lead', 'true');
  }

  // ── Case details ────────────────────────────────────────────
  // The field panels and the banner's second row read their IQAs through
  // /api/query, so closing the editor reruns those calls instead of
  // reloading the page (as the agreement editor does).
  const editorWidth = {maxWidth: 1060};
  const reload = {when: 'close', run: () => {
    document.querySelectorAll('.us-field-groups[data-us-fields-query]').forEach(root => {
      if (root.getClientRects().length) window.UnionSuiteFieldGroups?.reload(root);
    });
    window.UnionSuiteBannerFacts?.reload?.();
  }};
  // View profile in the Member panel's heading (owner, 9 October 2026), with
  // the other panels' actions: the member card is one person, so opening
  // their profile is the panel's action. The URL is the card's, so it
  // follows the primary party when that changes.
  define('cases.view-member', {
    presentation: {label: 'View profile', icon: 'ti-id', default: 'button', header: 'button'},
    context: {memberUrl: {required: true, resolve: ({owner}) =>
      owner?.querySelector('[data-us-case-member]')?.getAttribute('data-us-member-url') || null}},
    action: {type: 'navigate', href: ({context}) => context.memberUrl}
  });

  // Back to member on the case no-access page (owner, 27 October 2026). The
  // access check sends the case's member there as ID on the address.
  define('cases.back-to-member', {
    presentation: {label: 'Back to member', icon: 'ti-arrow-left', default: 'button'},
    context: {memberId: {from: 'query', parameter: 'ID', required: true,
      validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid member ID.'}},
    action: {type: 'navigate', href: ({context}) => page('/UTNewTheme/Party.aspx', {ID: context.memberId})}
  });

  popup('cases.edit', 'Update case details', 'pencil',
    ({context}) => page('/Cases_EditCase', {CaseID: context.caseId, Section: 'Details'}),
    'Edit case details', reload, editorWidth);
  // ── Resolving and closing (C16) ─────────────────────────────
  // Recording the resolution and closing the case are one step (owner,
  // 8 October 2026: "essentially the same thing"):
  //   Open case    Resolve case: a check for open tasks, then one form
  //                (outcome type, outcome, amount, closed date) whose save
  //                records the resolution and closes the case.
  //   Closed case  Edit resolution (the same form, the case stays closed)
  //                and Reopen case (back to Open; the resolution stays in
  //                the case history).
  // Each action shows only in the state it belongs to, wherever it sits
  // (banner Actions, the Resolution panel's heading). The status is the
  // banner's (data-us-record-status). The theme hides an action only for
  // access, so the state check is an access check with denied: 'hide'.
  // Resolving and reopening change the status, the banner, the Overview
  // and which actions show, so the page reloads after either.
  // Open or closed is the case Status value list's Closed Status (owner,
  // 28 October 2026), read once for the page. Until it arrives, or if it
  // cannot be read, the status's name decides ("Complete" is what Resolve
  // case saves).
  const CASE_STATUSES = '$/_i4u_/Core/Cases/Layouts v2/API - Value List - Case Status';
  const CLOSED = /^(closed|resolved|complete|completed)$/i;
  let caseStatuses = null;
  const flag = value => /^(true|1|yes|y)$/i.test(String(value ?? '').trim());
  const loadCaseStatuses = once(async () => {
    caseStatuses = (await query(CASE_STATUSES, {limit: '100'}))
      .map(row => ({code: String(column(row, 'Code') ?? '').trim(), label: String(column(row, 'Description') ?? '').trim(), closed: flag(column(row, 'Closed Status'))}))
      .filter(status => status.code)
      .map(status => ({...status, label: status.label || status.code}));
    return caseStatuses;
  });
  // A status by its code or its description, whatever the case.
  const statusEntry = value => {
    const key = String(value ?? '').trim().toLowerCase();
    return key ? caseStatuses?.find(status => status.code.toLowerCase() === key || status.label.toLowerCase() === key) : undefined;
  };
  const caseStatus = () => document.querySelector('.us-banner__surface[data-us-record-status]')?.getAttribute('data-us-record-status') || '';
  const isClosed = () => statusEntry(caseStatus())?.closed ?? CLOSED.test(caseStatus());
  const whenOpen = {check: () => !isClosed() || 'This case is already closed.', denied: 'hide'};
  const whenClosed = {check: () => isClosed() || 'This case is open.', denied: 'hide'};
  const reloadPage = {when: 'close', run: () => location.reload()};

  // Outstanding tasks on the page (the Overview's Tasks list). A tab that
  // is not loaded cannot be counted, so the check is skipped there.
  function openTasks() {
    const list = document.querySelector('.us-case-tasks');
    if (!list) return 0;
    return [...list.querySelectorAll('.us-task')].filter(task => task.getAttribute('data-us-task-completed') !== 'true').length;
  }

  define('cases.resolve', {
    presentation: {label: 'Resolve case', icon: 'ti-circle-check', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'popup', recordKey: ['caseId'], access: whenOpen,
      confirm: () => {
        const count = openTasks();
        if (!count) return true;
        return window.confirm(count + (count === 1 ? ' task is' : ' tasks are') + ' still open. They stay open after the case closes.\n\nResolve the case anyway?');
      },
      href: ({context}) => page('/Cases_ResolveCase', {CaseID: context.caseId, CaseNum: context.caseNum}),
      popup: {title: 'Resolve case', width: '90%', height: '90%', ...formWidth},
      refresh: reloadPage}
  });

  define('cases.edit-resolution', {
    presentation: {label: 'Edit resolution', icon: 'pencil', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'popup', recordKey: ['caseId'], access: whenClosed,
      href: ({context}) => page('/Cases_ResolveCase', {CaseID: context.caseId, CaseNum: context.caseNum, Edit: 'true'}),
      popup: {title: 'Edit resolution', width: '90%', height: '90%', ...formWidth},
      refresh: reload}
  });

  define('cases.reopen', {
    presentation: {label: 'Reopen case', icon: 'ti-lock-open', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'function', recordKey: ['caseId'], access: whenClosed,
      confirm: {message: 'Reopen this case? It goes back to Open; its resolution stays in the case history.'},
      run: ({context}) => post('/cases/reopen', {CaseID: context.caseId}),
      refresh: {when: 'success', run: () => location.reload()}}
  });

  // ── Quick status change (C23) ───────────────────────────────
  // The banner's status pill opens a menu of the open statuses (owner,
  // 9 October 2026: "click the status in the banner to quick update").
  // They are the case Status value list's open rows, in its order (owner,
  // 28 October 2026), each showing its Description and saving its Code, which
  // the case stores; the pill shows the description too. The template's own
  // items stay until the list arrives, and if it cannot be read. Choosing
  // one shows it at once (the pill's text, and the banner's tone and rail,
  // which follow data-us-record-status), saves it through
  // /cases/quick-update/set-status, and puts the old status back if the save
  // fails, when the action notice says so. Closing is not a status here: the
  // menu's Resolve case records the resolution and closes (C16), and a
  // closed case offers Edit resolution and Reopen case instead.
  const statusSurface = () => document.querySelector('.us-banner__surface[data-us-record-status]');

  function showStatus(code) {
    const surface = statusSurface();
    if (!surface) return;
    surface.setAttribute('data-us-record-status', code);
    const pill = surface.querySelector('.us-case-status > .us-actions__toggle');
    if (pill) pill.textContent = statusEntry(code)?.label || code;
    markCurrentStatus();
  }

  // The current status is ticked in the menu, by code or description.
  function markCurrentStatus() {
    const stored = statusSurface()?.getAttribute('data-us-record-status') || '';
    const current = (statusEntry(stored)?.code || stored).toLowerCase();
    document.querySelectorAll('.us-case-status [data-us-case-status]').forEach(item => {
      const on = (statusEntry(item.getAttribute('data-us-case-status'))?.code || item.getAttribute('data-us-case-status')).toLowerCase() === current;
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  // The value list's open statuses in place of the template's, once per
  // menu, and the pill's description. Nothing changes without the list.
  function fillStatusMenus() {
    const open = caseStatuses?.filter(status => !status.closed) || [];
    if (!open.length) return markCurrentStatus();
    let added = false;
    document.querySelectorAll('.us-case-status > .us-actions__list:not([data-us-case-statuses])').forEach(list => {
      const authored = [...list.querySelectorAll('[data-us-case-status]')].map(item => item.closest('li') || item);
      const items = open.map(status => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'us-actions__item us-action-cases-set-status';
        button.setAttribute('data-us-case-status', status.code);
        button.textContent = status.label;
        item.append(button);
        return item;
      });
      const heading = list.querySelector('.us-actions__heading')?.closest('li');
      if (authored.length) authored[0].before(...items);
      else if (heading) heading.after(...items);
      else list.prepend(...items);
      authored.forEach(node => node.remove());
      list.setAttribute('data-us-case-statuses', '');
      added = true;
    });
    const surface = statusSurface();
    const pill = surface?.querySelector('.us-case-status > .us-actions__toggle');
    const entry = statusEntry(surface?.getAttribute('data-us-record-status'));
    if (pill && entry) pill.textContent = entry.label;
    markCurrentStatus();
    // The new items are actions, and closed or open may have changed.
    if (added || entry) window.UnionSuiteActions?.refresh();
  }

  define('cases.set-status', {
    presentation: {label: 'Set status', useAuthoredLabel: true, default: 'menu-item', menu: 'menu-item'},
    context: {caseId, caseNum, status: {from: 'trigger', attribute: 'data-us-case-status', required: true}},
    action: {type: 'function', recordKey: ['caseId', 'status'], access: whenOpen,
      run: async ({context}) => {
        const previous = statusSurface()?.getAttribute('data-us-record-status') || '';
        const code = statusEntry(context.status)?.code || context.status;
        if ((statusEntry(previous)?.code || previous).toLowerCase() === code.toLowerCase()) return {unchanged: true};
        showStatus(code);
        try {
          await post('/cases/quick-update/set-status', {CaseID: context.caseId, CaseNum: context.caseNum, Status: code});
        } catch (error) {
          showStatus(previous);
          throw error;
        }
        return {status: code};
      },
      successMessage: 'Status updated.'}
  });

  // The banner arrives with the page, or later in the offline prototype.
  // This file loads on every page, so only a case page (CaseID in its
  // address) reads the statuses and watches for it. (globalThis: builds
  // load this file without a page.)
  if (/[?&]CaseID=/i.test(globalThis.location?.search || '')) {
    markCurrentStatus();
    loadCaseStatuses().then(fillStatusMenus, error => console.warn('[cases.set-status] The case statuses could not be read; the menu keeps its own.', error));
    new MutationObserver(records => {
      if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('.us-case-status, .us-banner__surface') || node.querySelector?.('.us-case-status'))))) fillStatusMenus();
    }).observe(document.documentElement, {subtree: true, childList: true});
  }

  // ── Emailing parties (C17) ─────────────────────────────
  // Email all of a case's parties, or a subset (owner, 8 October 2026),
  // as the agreement's Email contacts does: narrow the Parties list
  // with its search, or tick them with the list's Select toggle, then the
  // list toolbar's send button emails the parties shown (or ticked); with nothing narrowed (or from the banner's Actions
  // menu, or with the list not on the page), every party. It opens a
  // copy of iMIS's Create communication page (the Communication Creator
  // iPart) with the recipients query, so the send is tracked:
  //   <website>/<send page>?query=<IQA path>
  //     &queryparams=[{"Item1":"Ordinal","Item2":"\"611\",\"612\""},
  //                   {"Item1":"CaseOrdinal","Item2":"214"}]
  //     &CaseID=C217&CaseNum=214&Audience=Parties&CommunicationType=Email
  //     &ReturnUrl=<this page>&CommunicationId=<the default template>
  // The send page's Communication Creator iPart carries us-case-comms: the
  // subject starts "Case C217 – " (US-SUBJECT-TAG) and the send is linked to
  // the case afterwards (US-COMMS-LOG; both in the theme, 21 October 2026,
  // into i4u_UT_Cases_Communications). The send page and the recipients IQA
  // are set up (owner, 24 October 2026). The page opens with the default
  // case template, "Generic Case Email" in
  // $/Common/Communications/Templates/i4u/Cases (its DocumentVersionId as
  // CommunicationId; TODO.md: make it configurable). Open lists that
  // folder (US-COMMS-TEMPLATES).
  const emailParties = {
    page: '/_i4u_/Core/Cases/Layouts-v2/Popups/Send-Email-Parties.aspx',
    communicationId: '9ae4a05c-4f8a-4103-bd23-db28a3faf8fc',
    query: '$/_i4u_/Core/Cases/Layouts v2/API - Communication Recipient List - Parties',
    ordinalFilter: 'Ordinal',
    // The IQA's own prompt name. "@url:CaseNum" passed /api/query but the
    // send ignored it and counted every case's parties (224 against 7;
    // iMIS's confirmation, owner's dev tenant, 24 October 2026).
    caseFilter: 'CaseOrdinal'
  };

  function clientRoot() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}').websiteRoot || ''; }
    catch (_) { return ''; }
  }

  // The current website's path, as the native Email button uses.
  function websitePath(path) {
    const site = window.gWebSiteRoot || clientRoot();
    const root = site ? new URL(String(site), location.origin).pathname.replace(/\/+$/, '') : '';
    return new URL(root + path, location.origin);
  }

  // The parties list's ordinals, all of them and those still shown.
  function partyOrdinals() {
    const rows = [...document.querySelectorAll('.us-parties .QueryTemplateSet > section')].map(section => ({
      section,
      ordinal: section.querySelector('[data-us-contact-ordinal]')?.getAttribute('data-us-contact-ordinal')?.trim()
    }));
    if (rows.some(row => !row.ordinal)) {
      throw new Error('The parties list does not mark each party\'s ordinal (data-us-contact-ordinal in its Query Template), so the email cannot be limited to those shown.');
    }
    // Selecting (the list's Select toggle): exactly the ticked parties.
    if (document.querySelector('.us-parties .us-parties--selecting')) {
      const ticked = rows.filter(row => row.section.querySelector('.us-party__check')?.checked);
      if (!ticked.length) throw new Error('Tick the parties to email, or turn off Select to email those shown.');
      return {total: rows.length, shown: ticked.map(row => row.ordinal), selected: true};
    }
    const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
    return {total: rows.length, shown: shown.map(row => row.ordinal)};
  }

  define('cases.email-parties', {
    // An icon beside the search in the list's toolbar (owner, 8 October
    // 2026); a labelled item in the banner's Actions menu.
    presentation: {label: 'Email parties', icon: 'ti-send', default: 'icon', header: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'function', recordKey: ['caseId'],
      // Read the rows when pressed: the search changes without the action
      // being checked again.
      run: ({context, wrapper}) => {
        const fromList = !!wrapper?.closest('.us-parties') || !!wrapper?.matches?.('.us-parties');
        const {total, shown, selected} = fromList ? partyOrdinals() : {total: 0, shown: []};
        if (fromList && !total) throw new Error('This case has no parties to email.');
        if (fromList && !shown.length) throw new Error('No parties are shown to email. Clear the search and try again.');
        // Ticked parties are always named, even when all are ticked.
        const ordinals = fromList && (selected || shown.length < total) ? shown : [];
        const url = websitePath(emailParties.page);
        url.searchParams.set('CaseID', context.caseId);
        url.searchParams.set('CaseNum', context.caseNum);
        url.searchParams.set('Audience', 'Parties');
        url.searchParams.set('CommunicationType', 'Email');
        url.searchParams.set('query', emailParties.query);
        url.searchParams.set('queryparams', JSON.stringify([
          {Item1: emailParties.ordinalFilter, Item2: ordinals.map(ordinal => '"' + ordinal + '"').join(',')},
          {Item1: emailParties.caseFilter, Item2: String(context.caseNum)}
        ]));
        url.searchParams.set('ReturnUrl', location.pathname + location.search);
        url.searchParams.set('CommunicationId', emailParties.communicationId);
        // The case page prototype runs offline and answers the navigation
        // itself (UnionSuiteCasePreview); a live page navigates.
        (window.UnionSuiteCasePreview?.navigate || (href => location.assign(href)))(url.href);
      }}
  });

  // ── Row actions (read the record from the row's data-ordinal) ─
  const editIcon = {icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'};
  function refreshRow(env) {
    const row = env.trigger?.closest('[data-us-row-query]');
    if (row && window.UnionSuiteRowPatch) return window.UnionSuiteRowPatch.refresh(row);
    return env.refresh.originReport({row: '[data-ordinal="' + env.context.ordinal + '"]'});
  }
  function rowPopup(key, label, href, title) {
    define(key, {
      presentation: {label, ...editIcon},
      context: {caseId, caseNum, ordinal: rowOrdinal},
      action: {type: 'popup', recordKey: ['caseId', 'ordinal'], href, popup: {title, width: '90%', height: '90%', ...formWidth},
        refresh: {when: 'close', run: refreshRow}}
    });
  }
  // The shared note details popup the agreement page uses, with CaseID.
  const noteDetails = mode => ({context}) => page('/_i4u_/Core/Zidebar/NoteDetails.aspx', {
    NoteOrdinal: context.ordinal, CaseID: context.caseId, ...(mode ? {[mode]: 'true'} : {})
  });
  rowPopup('cases.edit-note', 'Edit note', noteDetails(''), 'Note');
  // Tasks open the case task form with the task's Ordinal once its page is
  // set (UnionSuiteTaskForms); until then the note details page.
  const taskForm = args => window.UnionSuiteTaskForms?.href('case', {
    ModuleID: args.context.caseId, ModuleOrdinal: args.context.caseNum, Ordinal: args.context.ordinal
  }) || noteDetails('Task')(args);
  rowPopup('cases.edit-task', 'Edit task', taskForm, window.UnionSuiteTaskForms?.pages.case ? 'Edit task' : 'Task');
  rowPopup('cases.edit-meeting', 'Edit meeting',
    ({context}) => page('/Cases_EditMeeting', {CaseID: context.caseId, CaseOrdinal: context.caseNum, MeetingOrdinal: context.ordinal}),
    'Edit meeting');
  rowPopup('cases.edit-staff', 'Edit staff',
    ({context}) => page('/Cases_EditStaff', {CaseID: context.caseId, ID: context.ordinal}),
    'Edit staff');

  // After the save, the new lead's card slides to the top of the list and
  // the others move down to make room (owner, 8 October 2026), rather than
  // the list re-rendering in its new order. The cards are moved in place,
  // in the order the IQA would now return (lead first), and each one
  // animates from where it was (FLIP). Reduced motion moves them at once.
  // Returns false when the card is not in a list, so the caller refreshes.
  // Used for lead staff and for the primary party's row.
  const SLIDE = {duration: 240, easing: 'cubic-bezier(.2, 0, 0, 1)'};
  function slideLeadToTop(trigger) {
    return slideToTop(trigger?.closest('.QueryTemplateSet > section'));
  }

  function slideToTop(section) {
    const set = section?.parentElement;
    if (!set?.matches('.QueryTemplateSet')) return false;
    const items = [...set.children];
    const before = new Map(items.map(item => [item, item.getBoundingClientRect().top]));
    set.prepend(section);
    // Moving a card drops its style, so a colour change made before the
    // move would snap. Read the moved card's avatar style first, then swap
    // the leads, so both initials circles transition (C8 CSS).
    const tile = section.querySelector('[data-us-contact-lead]');
    const avatar = tile?.querySelector('.us-avatar');
    if (avatar) getComputedStyle(avatar).backgroundColor;
    set.querySelectorAll('[data-us-contact-lead]').forEach(other => other.setAttribute('data-us-contact-lead', 'false'));
    tile?.setAttribute('data-us-contact-lead', 'true');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    // The crown's arrival (C8 CSS) plays while this attribute is on.
    tile?.setAttribute('data-us-lead-arrived', '');
    setTimeout(() => tile?.removeAttribute('data-us-lead-arrived'), SLIDE.duration + 200);
    items.forEach(item => {
      const shift = before.get(item) - item.getBoundingClientRect().top;
      if (!shift) return;
      const rising = item === section;
      // The rising card passes over the others.
      if (rising) {
        item.style.position = 'relative';
        item.style.zIndex = '1';
      }
      item.animate([{transform: `translateY(${shift}px)`}, {transform: 'none'}], SLIDE).finished.finally(() => {
        if (!rising) return;
        item.style.removeProperty('position');
        item.style.removeProperty('z-index');
      });
    });
    return true;
  }

  // The crown on a staff card that is not the lead (C8; owner, 8 October
  // 2026): makes that person the case's lead staff member. Their card then
  // slides to the top (above) and the banner's Lead staff fact reloads.
  // Proposed CloudToolz endpoint, not built yet. The body carries the
  // person's iMIS ID (StaffID, from the card's data-us-contact-id) with
  // the case staff row's ordinal (owner, 21 October 2026).
  define('cases.set-lead-staff', {
    presentation: {label: 'Make lead staff', icon: 'ti-crown', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum, ordinal: rowOrdinal,
      staffId: {from: 'closest', selector: '[data-us-contact-id]', attribute: 'data-us-contact-id', required: true,
        validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid staff ID.'}},
    action: {type: 'function', recordKey: ['caseId', 'ordinal'],
      run: ({context}) => post('/cases/quick-update/set-lead-staff', {CaseID: context.caseId, CaseNum: context.caseNum, StaffID: context.staffId, StaffOrdinal: context.ordinal}),
      refresh: {when: 'success', run: env => {
        window.UnionSuiteBannerFacts?.reload?.();
        if (!slideLeadToTop(env.trigger)) return env.refresh.originReport();
      }},
      successMessage: 'Lead staff updated.'}
  });

  // Case task rows carry data-us-task-save="cases.item-status".
  window.UnionSuiteTaskRows?.defineSaver?.('cases.item-status', async ({root, done}) => {
    const ordinal = (root.getAttribute('data-us-task-ordinal') || '').trim();
    if (!/^\d+$/.test(ordinal)) throw new Error('The case task has no ordinal.');
    const save = window.UnionSuiteAgreements?.saveItemStatus;
    if (!save) throw new Error('The task status save (UnionSuiteAgreements) is unavailable.');
    await save(ordinal, done ? 'Complete' : 'Not Complete', root.getAttribute('data-us-task-note-type') || 'Task');
  });

  // Unlock on a restricted case attachment (US-RESTRICTED-ATTACHMENTS in
  // zUnionSuite.js; C33, owner, 9 October 2026). Granted opens it;
  // Restricted reads as denied; any other answer reads as a failed check.
  // Case pages only, so another record's check is not replaced. Proposed
  // CloudToolz endpoint, not built yet.
  if (/[?&]CaseID=/i.test(globalThis.location?.search || '')) {
    window.UnionSuiteRestrictedAttachments?.defineCheck?.(async ({ordinal}) => {
      const data = await send('/cases/attachment-access', {AttachmentOrdinal: ordinal});
      const access = String(data?.Access ?? '').trim().toLowerCase();
      if (access === 'granted') return;
      if (access === 'restricted') {
        const denied = new Error('Access to this attachment is restricted.');
        denied.denied = true;
        throw denied;
      }
      throw new Error('The attachment access check gave no answer (Access was "' + access + '").');
    });
  }

  // Case access on page load (owner, 27 October 2026). CloudToolz
  // POST /cases/case-access takes {CaseOrdinal} (the CaseNum), checks the
  // signed-in user as /ca/note-access does and answers
  // {Access: 'Granted' | 'Restricted', MemberID}. Restricted replaces the page with
  // the no-access page, so Back does not return to the case. A failed check
  // or any other answer stays on the page and logs: only an explicit
  // Restricted redirects. The manage case page only (its path, or the
  // us-case-page page class), not its popups. The no-access page is the
  // UTNewTheme site's (owner, 27 October 2026).
  // US-CASE-ACCESS in zUnionSuite.css keeps the page hidden until the root
  // carries data-us-case-access: granted or failed shows it, restricted
  // keeps it hidden while the browser leaves.
  const noAccessPage = '/UTNewTheme/Cases_NoAccess';

  function markCaseAccess(state) {
    document.documentElement.setAttribute('data-us-case-access', state);
  }

  async function checkCaseAccess() {
    const query = new URLSearchParams(location.search);
    const values = {CaseID: query.get('CaseID') || '', CaseNum: query.get('CaseNum') || ''};
    const response = await post('/cases/case-access', {CaseOrdinal: values.CaseNum});
    const data = await response.json().catch(() => ({}));
    const access = String(data?.Access ?? '').trim().toLowerCase();
    if (access === 'granted') {
      markCaseAccess('granted');
      return;
    }
    if (access === 'restricted') {
      // The case's member (MemberID, the case's PrimaryContactID) goes on
      // as ID for the no-access page's Back to member.
      const memberId = String(data?.MemberID ?? '').trim();
      markCaseAccess('restricted');
      location.replace(page(noAccessPage, memberId ? {...values, ID: memberId} : values));
      return;
    }
    throw new Error('The case access check gave no answer (Access was "' + access + '").');
  }

  const manageCasePath = /\/Cases_ManageCase(\.aspx)?$/i.test(globalThis.location?.pathname || '');
  if (manageCasePath || globalThis.document?.querySelector?.('.us-case-page')) {
    checkCaseAccess().catch(error => {
      markCaseAccess('failed');
      console.warn('[cases.case-access]', error);
    });
  }
})();
