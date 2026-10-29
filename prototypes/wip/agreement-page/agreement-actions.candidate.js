/* Agreement page — candidate action definitions.
   Target: Theme/UnionSuite/Scripts/ActionDefinitions.js (core UnionSuite:
   agreements are part of the shared suite, not a client layer). Load after
   zUnionSuite.js and ActionDefinitions.js, before UnionSuite-Client/Actions.js.

   Replaces the CA_* popup launchers that the old page delivered through an
   IQA iPart. One definition, several placements (the class does the placing):
   - Panel headings: the class in the panel iPart's CSS class field.
   - Banner Actions menu: <button class="us-actions__item us-action-…">.
   - Rows: a link or button with the class and the row's data-* attributes.

   Refresh replaces the old reload helpers (CA_reloadList, CA_syncContactCards,
   CA_reloadContactCard, CA_reloadMilestones): the theme re-renders the iPart
   the action started from, or the named list when it started in the banner.

   Also registers the agreement task saver (theme-candidate-task-rows.js) and
   the shared CloudToolz call used by tasks, milestones and attachments. */
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before the agreement actions.');

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
      source: 'agreement-actions.candidate.js:' + key,
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
  // Notes, tasks, milestones and attachments share the Zidebar Add Note form:
  // Type picks the form, ID is the signed-in user, Module, ModuleID and
  // ModuleOrdinal the agreement (owner, 14 and 19 October 2026).
  const addNoteForm = type => ({context}) => page('/_i4u_/Core/Zidebar/Add-Note-New.aspx', {
    Type: type, ID: context.userId, Module: 'agreement', ModuleID: context.agreementId, ModuleOrdinal: context.agreementNum
  });
  popup('agreements.add-note', 'Add note', 'plus',
    addNoteForm('note'),
    'Add note', refreshList('us-action-agreements-add-note'));
  popup('agreements.upload-attachment', 'Upload', 'ti-upload',
    addNoteForm('attachmentonly'),
    'Add attachment', refreshList('us-action-agreements-upload-attachment'), {maxWidth: 960});
  popup('agreements.add-contact', 'Add contact', 'plus',
    ({context}) => page('/Agreements_ManageContacts', {AgreementID: context.agreementId}),
    'Manage contacts', refreshList('us-action-agreements-add-contact'));
  popup('agreements.add-meeting', 'Add meeting', 'plus',
    ({context}) => page('/Agreements_CreateMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum}),
    'Schedule meeting', refreshList('us-action-agreements-add-meeting'));
  popup('agreements.add-task', 'Add task', 'plus',
    addNoteForm('task'),
    'Add task', refreshList('us-action-agreements-add-task'));
  popup('agreements.add-milestone', 'Add milestone', 'plus',
    addNoteForm('milestone'),
    'Add milestone', refreshList('us-action-agreements-add-milestone'));

  // ── Agreement details ───────────────────────────────────────
  // One editor with a Section parameter; a heading button cannot carry data
  // attributes, so each section is its own action. The read-only panels are
  // native panel editors; a native panel cannot be re-rendered in place, so
  // closing the editor reloads the page (as the old page expected).
  const reload = {when: 'close', run: () => location.reload()};
  popup('agreements.edit', 'Update details', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'Details'}),
    'Edit agreement details', reload);
  popup('agreements.edit-key-dates', 'Update key dates', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'KeyDates'}),
    'Edit key dates', reload);
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
  popup('agreements.email-members', 'Email members', 'ti-mail',
    ({context}) => page('/Agreements_SMSContacts', {AgreementID: context.agreementId}), 'Email members');
  // Placeholder (owner, 3 October 2026): the send button in the Contacts
  // heading (option 6). It will start an "email contacts" action through
  // iMIS so the emails are tracked; the destination is not decided, so for
  // now it opens the same page as Email negotiating team. Icon only in the
  // heading, a labelled item in menus.
  define('agreements.email-contacts', {
    presentation: {label: 'Email contacts', icon: 'ti-send', default: 'button', header: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum},
    action: {type: 'popup', recordKey: ['agreementId'],
      href: ({context, wrapper}) => {
        // Option 7: with a filter on, email the contacts on screen. Rows
        // carry data-us-contact-id; hidden rows are the filtered-out ones.
        // Without ids (option 6) or with nothing filtered, the whole list.
        const values = {AgreementID: context.agreementId};
        const rows = wrapper ? [...wrapper.querySelectorAll('.QueryTemplateSet > section')]
          .map(section => ({section, id: section.querySelector('[data-us-contact-id]')?.getAttribute('data-us-contact-id')?.trim()}))
          .filter(row => row.id) : [];
        const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
        if (shown.length && shown.length < rows.length) values.ContactIDs = shown.map(row => row.id).join(',');
        return page('/Agreements_EmailContacts', values);
      },
      popup: {title: 'Email contacts', width: '90%', height: '90%'}}
  });

  // ── Terms and coverage ──────────────────────────────────────
  popup('agreements.add-term', 'Add term', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum}),
    'Add term', refreshList('us-action-agreements-add-term'));
  popup('agreements.remove-terms', 'Remove terms', 'trash',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Delete_Terms.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Remove terms', refreshList('us-action-agreements-add-term'));
  popup('agreements.edit-coverage', 'Update coverage', 'pencil',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Coverage.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Edit coverage rules', {when: 'close', targets: [{type: 'origin-report'}]});
  // Layout v2 (index-v2.html): the Add scheduled increase BeyondForm, on its
  // own popup page (owner, 5 October 2026).
  popup('agreements.add-increase', 'Add increase', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Add-Scheduled-Increase.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Add scheduled increase', {when: 'close', targets: [{type: 'origin-report'}]}, {maxWidth: 800});

  // ── Row actions (read the record from the row's data-ordinal) ─
  // Open actions sit on the row's own title, which keeps its text as a link
  // (as home.open-task does). Edit actions are icon buttons.
  const openLink = {useAuthoredLabel: true, default: 'link'};
  const editIcon = {icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'};
  function rowPopup(key, label, presentation, href, title) {
    define(key, {
      presentation: {label, ...presentation},
      context: {agreementId, agreementNum, ordinal: rowOrdinal},
      action: {type: 'popup', recordKey: ['agreementId', 'ordinal'], href, popup: {title, width: '90%', height: '90%'},
        refresh: {when: 'close', targets: [{type: 'origin-report'}]}}
    });
  }
  const noteDetails = mode => ({context}) => page('/_i4u_/Core/Zidebar/NoteDetails.aspx', {
    NoteOrdinal: context.ordinal, AgreementID: context.agreementId, ...(mode ? {[mode]: 'true'} : {})
  });
  rowPopup('agreements.view-note', 'Open note', openLink, noteDetails(''), 'Note');
  // The eye button on a ledger note row (us-notes--ledger); same popup as Open note.
  rowPopup('agreements.preview-note', 'View note', {icon: 'ti-eye', default: 'button', row: 'icon'}, noteDetails(''), 'Note');
  rowPopup('agreements.view-task', 'Open task', openLink, noteDetails('Task'), 'Task');
  // The eye button at the end of a task row; same popup as the title link.
  rowPopup('agreements.preview-task', 'View task', {icon: 'ti-eye', default: 'button', row: 'icon'}, noteDetails('Task'), 'Task');
  rowPopup('agreements.view-milestone', 'Open milestone', openLink, noteDetails('Milestones'), 'Milestone');
  rowPopup('agreements.view-meeting', 'Open meeting', openLink,
    ({context}) => page('/Agreements_EditMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum, MeetingOrdinal: context.ordinal}),
    'Edit meeting');
  rowPopup('agreements.edit-contact', 'Edit contact', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Contact/Edit-Contact-Information.aspx', {ID: context.ordinal}),
    'Edit contact');
  rowPopup('agreements.edit-term', 'Edit term', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum, TermOrdinal: context.ordinal}),
    'Update term');

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

  window.UnionSuiteAgreements = Object.freeze({cloudToolz, saveItemStatus, version: '0.1-candidate'});

  // Agreement task rows carry data-us-task-save="agreements.item-status".
  window.UnionSuiteTaskRows?.defineSaver?.('agreements.item-status', async ({root, done}) => {
    const ordinal = (root.getAttribute('data-us-task-ordinal') || '').trim();
    if (!/^\d+$/.test(ordinal)) throw new Error('The agreement task has no ordinal.');
    await saveItemStatus(ordinal, done ? 'Complete' : 'Not Complete', root.getAttribute('data-us-task-note-type') || 'Task');
  });

  // ── Attachments ─────────────────────────────────────────────
  const attachmentRow = {
    ordinal: rowOrdinal,
    uniqueId: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-id', required: true},
    branch: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-branch', required: true},
    fileName: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-name'}
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

  // Inline name/tag editing is the us-attachments candidate (theme-candidate.js);
  // this action opens the editor on the row and saves through CloudToolz.
  define('agreements.edit-attachment', {
    presentation: {label: 'Edit name and tags', icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['ordinal'], run: ({trigger}) => window.UnionSuiteAttachments.edit(trigger.closest('.us-attachment'))}
  });
})();
