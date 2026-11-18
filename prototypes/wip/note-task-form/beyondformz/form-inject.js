/* Case note and task form: the form's "JavaScript to inject".

   Maintained here; build-form.cjs writes it into the BeyondFormz export.
   Do not edit the copy in BeyondFormz without bringing the change back.

   One form adds and edits a case's notes and tasks (owner, 18 November
   2026; the approved mock-up is ../index.html). A task is a note with
   follow-up: one row in Zen_CloudFiles_Notes. The theme opens it as
   /Cases_CreateNote?CaseID=C217 (a note) or /Cases_CreateTask?CaseID=C217
   &Task=true (a task); CaseNum, Type=note|task and Ordinal (to edit) are
   read too. This script:
   - shows the form once the prefill answers, so nothing changes in view;
   - draws the record line with Note | Task (FollowupRequired). A saved task
     stays a task: no choice when editing one (owner, 18 November 2026);
   - a task: What needs doing? (Title, required) with the High priority
     flag, Details (Note, optional, behind Add details on a new task), Due
     date with Add time and quick dates (sent as one Deadline datetime;
     midnight when no time), Assign to (optional; you, on a new task);
   - a note: Note (required) first; the title and the task fields close;
   - editing a task: Completed (Actioned) and What was done (ActionedNotes);
   - Tags and Subtags (the case note tags);
   - attachments: each file uploads as it is added, and picks its own
     attachment tags behind Add tags; the saved ones are listed;
   - Access as buttons (Open, Team, Individual) with what each means;
   - checks the form before BeyondFormz sends anything, and closes the
     popup once it saved: {saved: true, Ordinal} (Cancel or Esc: {cancel:
     true}). Ctrl+Enter saves. There is no Save and add another.

   The field scripts hand their answers to window.usCaseNote: the prefill
   (autoexecute) calls prefill(data), Save calls saved(data). Its us-bf-*
   classes are styled by the theme (zUnionSuite.css, US-BEYOND-FORMS). */

(function () {
  'use strict';

  const $ = window.jQuery;
  const button = document.getElementById('SaveButton');

  if (!button || window.usCaseNote) {
    return;
  }

  const form = button.closest('.rendered-form');

  /* ---------- Settings ---------- */

  // The note subtags (Ordinal, TagName, TagStatus, ParentTagOrdinal), as the
  // Create case form reads its subtypes: blank ParentTagOrdinal, every row.
  const SUBTAGS_QUERY = '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/API - Value List - Note Subtags';
  // The attachment tags (Ordinal, TagName). Ordinals up to 11 are the system
  // tags (ID, Cases…), which the upload adds itself.
  const FILE_TAGS_QUERY = '$/_i4u_/Core/Shared/API - Zen Attachment Tags';
  const FIRST_FILE_TAG = 12;
  // CloudToolz's address, and the upload BeyondFormz's file field uses:
  // each file is staged under a UUID made here, which the save sends.
  const CLOUDTOOLZ_URL_QUERY = '$/ZENTSO/Security/CloudToolzUrl';
  const UPLOAD_PATH = '/api/formz/fineUpload';
  const MAX_FILE_BYTES = 20 * 1024 * 1024;

  const ACCESS = {
    Open: {icon: 'ti-world', hint: 'Standard. Anyone who can see this case can read it.'},
    Team: {icon: 'ti-users', hint: 'Only the case team, managers and system administrators can read it.'},
    Individual: {icon: 'ti-lock', hint: 'Only the staff assigned to this case, managers and system administrators can read it.'}
  };

  const SHOW_ANYWAY_AFTER = 8000;
  const SAVE_TIMEOUT = 60000;
  const CLOSE_DELAY = 900;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /* ---------- Helpers ---------- */

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  // A flow's answer, or a value in it, arrives as JSON text or parsed.
  function parse(value) {
    for (let i = 0; i < 2 && typeof value === 'string'; i++) {
      try {
        value = JSON.parse(value);
      } catch (error) {
        return i ? value : null;
      }
    }
    return value;
  }

  const wrapper = name => form.querySelector('.form-group.field-' + name);
  const control = name => form.querySelector('#' + name);
  const param = name => String((control(name) || {}).value || '').trim();
  const truthy = value => value === true || value === 1 || /^(1|true|yes)$/i.test(String(value == null ? '' : value).trim());

  const pad = n => String(n).padStart(2, '0');
  const isoDay = date => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  function today(offset) {
    const date = new Date();
    date.setDate(date.getDate() + (offset || 0));
    return isoDay(date);
  }
  function niceDay(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? Number(match[3]) + ' ' + MONTHS[Number(match[2]) - 1] + ' ' + match[1] : String(value || '');
  }
  function uuid() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }
  function fileSize(bytes) {
    return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(bytes / 1024)) + ' KB';
  }

  function signedInPartyId() {
    try {
      return String(JSON.parse(document.getElementById('__ClientContext').value).loggedInPartyId || '');
    } catch (error) {
      return '';
    }
  }

  // An iMIS IQA through /api/query, as the page's session.
  function query(name, filters) {
    const token = document.getElementById('__RequestVerificationToken');
    const search = new URLSearchParams({QueryName: name, limit: '500', offset: '0', ...(filters || {})});
    return fetch('/api/query?' + search, {
      credentials: 'same-origin',
      headers: {Accept: 'application/json', RequestVerificationToken: token ? token.value : ''}
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(name + ': HTTP ' + response.status);
        }
        return response.json();
      })
      .then(data => (data && data.Items && data.Items.$values) || []);
  }
  // /api/query rows are flat alias-keyed objects; read them ignoring case.
  function column(row, name) {
    const key = Object.keys(row || {}).find(entry => entry.toLowerCase() === name.toLowerCase());
    const value = key ? row[key] : undefined;
    return value && typeof value === 'object' && '$value' in value ? value.$value : value;
  }

  /* Required, with BeyondFormz's own asterisk; "(optional)" otherwise. */
  function setRequired(name, on) {
    const field = wrapper(name);
    const el = control(name);
    if (!field || !el) {
      return;
    }
    el.required = on;
    if (on) {
      el.setAttribute('aria-required', 'true');
    } else {
      el.removeAttribute('aria-required');
    }
    const label = field.querySelector(':scope > label');
    if (!label) {
      return;
    }
    let star = label.querySelector('.formbuilder-required');
    let optional = label.querySelector('.us-bf-optional');
    if (on && !star) {
      star = document.createElement('span');
      star.className = 'formbuilder-required';
      star.textContent = '*';
      label.appendChild(star);
    }
    if (!on && !optional) {
      optional = document.createElement('span');
      optional.className = 'us-bf-optional';
      optional.textContent = ' (optional)';
      label.appendChild(optional);
    }
    if (star) {
      star.hidden = !on;
    }
    if (optional) {
      optional.hidden = on;
    }
  }

  // A field's own label text, keeping its marks.
  function setLabel(name, text) {
    const label = wrapper(name) && wrapper(name).querySelector(':scope > label');
    if (!label) {
      return;
    }
    const first = label.firstChild;
    if (first && first.nodeType === 3) {
      first.textContent = text;
    } else {
      label.prepend(document.createTextNode(text));
    }
  }

  /* A field (or a block the script made) that opens only when it applies:
     the theme's us-bf-reveal. */
  function reveal(node, open) {
    if (!node) {
      return;
    }
    node.classList.add('us-bf-reveal');
    node.toggleAttribute('data-closed', !open);
    // A closed field is not filled in, so it is never what stops a save.
    node.toggleAttribute('inert', !open);
  }

  /* ---------- Errors and the message ---------- */

  function showError(el, text) {
    const field = el.closest('.form-group');
    field.classList.add('us-bf-invalid');
    el.setAttribute('aria-invalid', 'true');
    let error = field.querySelector('.us-bf-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'us-bf-error';
      error.id = (el.id || 'field') + '-error';
      field.appendChild(error);
      el.setAttribute('aria-describedby', error.id);
    }
    error.innerHTML = '<i class="ti ti-alert-circle" aria-hidden="true"></i>' + escapeHtml(text);
  }

  function clearError(el) {
    const field = el.closest('.form-group');
    if (!field || !field.classList.contains('us-bf-invalid')) {
      return;
    }
    field.classList.remove('us-bf-invalid');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    field.querySelector('.us-bf-error')?.remove();
  }

  const message = form.querySelector('.Message');

  function setMessage(text, tone) {
    if (!message) {
      return;
    }
    message.textContent = text || ' ';
    if (tone) {
      message.dataset.tone = tone;
    } else {
      delete message.dataset.tone;
    }
  }

  /* ---------- Lists BeyondFormz fills later ---------- */

  // BeyondFormz fills IQA and flow lists after this script has run, so a
  // list's value is set once its options are in. A list is in once
  // BeyondFormz has replaced the builder's placeholder options (Option 1…),
  // even with nothing: an IQA with no rows, or one not set up yet, must not
  // hold the form back (dev tenant, 19 November 2026: the empty Note Tags
  // list kept it hidden for 8 seconds).
  const waitingLists = new Set();

  function filled(select) {
    return !!select && ![...select.options].some(option => /^option-\d+-$/.test(option.value));
  }

  function whenFilled(select, run) {
    if (!select) {
      return;
    }
    if (filled(select)) {
      run();
      return;
    }
    waitingLists.add(select);
    const observer = new MutationObserver(() => {
      if (!filled(select)) {
        return;
      }
      observer.disconnect();
      setTimeout(() => {
        run();
        waitingLists.delete(select);
        revealWhenReady();
      }, 0);
    });
    observer.observe(select, {childList: true});
    // A list that never loads still lets the form show.
    setTimeout(() => {
      if (waitingLists.delete(select)) {
        observer.disconnect();
        revealWhenReady();
      }
    }, SHOW_ANYWAY_AFTER);
  }

  /* ---------- Showing the form ---------- */

  let revealTimer = 0;
  let prefilled = false;

  function revealForm() {
    clearTimeout(revealTimer);
    form.removeAttribute('data-us-loading');
  }

  function revealWhenReady() {
    if (prefilled && !waitingLists.size) {
      revealForm();
    }
  }

  /* ---------- Mode ---------- */

  const editing = param('Ordinal') !== '';
  const me = signedInPartyId();
  // Type=task, or the theme's older Task=true link.
  let kind = /^task$/i.test(param('Type')) || /[?&]Task=(true|1)\b/i.test(location.search) ? 'task' : 'note';
  // A saved task stays a task: set from the prefill.
  let savedKind = '';
  let detailsOpen = false;

  /* ---------- The record line, with Note | Task ---------- */

  const caseLine = document.createElement('p');
  caseLine.className = 'us-bf-for';
  form.prepend(caseLine);
  const caseText = document.createElement('span');
  caseLine.appendChild(caseText);

  function drawCase(memberName) {
    const caseId = param('CaseID');
    caseText.innerHTML = '<i class="ti ti-briefcase" aria-hidden="true"></i> Case <strong>' + escapeHtml(caseId) + '</strong>' +
      (memberName ? ' · ' + escapeHtml(memberName) : '');
  }
  drawCase('');

  const kindGroup = document.createElement('div');
  kindGroup.className = 'us-bf-segmented';
  kindGroup.setAttribute('role', 'radiogroup');
  kindGroup.setAttribute('aria-label', 'Note or task');
  kindGroup.innerHTML =
    '<button type="button" role="radio" data-kind="note"><i class="ti ti-notes" aria-hidden="true"></i>Note</button>' +
    '<button type="button" role="radio" data-kind="task"><i class="ti ti-square-check" aria-hidden="true"></i>Task</button>';
  caseLine.appendChild(kindGroup);

  kindGroup.addEventListener('click', event => {
    const choice = event.target.closest('[data-kind]');
    if (choice) {
      setKind(choice.dataset.kind, true);
    }
  });
  kindGroup.addEventListener('keydown', event => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      setKind(kind === 'note' ? 'task' : 'note', true);
      kindGroup.querySelector('[aria-checked=true]').focus();
    }
  });

  /* ---------- Title, the flag and Add details ---------- */

  const title = control('Title');
  const titleField = wrapper('Title');
  const highPriority = control('HighPriority');

  // The input and the flag on one line. The input sits in a us-bf-affix
  // span so it keeps the theme's field look.
  const titleRow = document.createElement('div');
  titleRow.className = 'us-bf-title-row';
  const titleBox = document.createElement('span');
  titleBox.className = 'us-bf-affix';
  title.before(titleRow);
  titleBox.appendChild(title);
  const flag = document.createElement('button');
  flag.type = 'button';
  flag.className = 'us-bf-flag';
  flag.setAttribute('aria-pressed', 'false');
  flag.setAttribute('aria-label', 'High priority');
  flag.title = 'High priority';
  flag.innerHTML = '<i class="ti ti-flag" aria-hidden="true"></i>';
  titleRow.append(titleBox, flag);

  const badge = document.createElement('span');
  badge.className = 'us-bf-badge';
  badge.textContent = 'High priority';
  badge.hidden = true;
  titleField.querySelector(':scope > label').appendChild(badge);

  function setFlag(on) {
    highPriority.value = on ? '1' : '0';
    flag.setAttribute('aria-pressed', String(on));
    flag.innerHTML = '<i class="ti ' + (on ? 'ti-flag-filled' : 'ti-flag') + '" aria-hidden="true"></i>';
    // Last in the label, after the required mark.
    badge.parentNode.appendChild(badge);
    badge.hidden = !on;
  }
  flag.addEventListener('click', () => setFlag(highPriority.value !== '1'));

  const addDetails = document.createElement('button');
  addDetails.type = 'button';
  addDetails.className = 'us-bf-link';
  addDetails.innerHTML = '<i class="ti ti-plus" aria-hidden="true"></i> Add details';
  titleField.appendChild(addDetails);
  addDetails.addEventListener('click', () => {
    detailsOpen = true;
    sync();
    setTimeout(() => control('Note').focus(), 230);
  });

  /* ---------- Due date and time ---------- */

  const dueDate = control('DueDate');
  const dueField = wrapper('DueDate');
  const deadline = control('Deadline');

  // The date and the time on one line, each in a us-bf-affix span.
  const dueRow = document.createElement('div');
  dueRow.className = 'us-bf-due';
  dueDate.before(dueRow);
  const dateBox = document.createElement('span');
  dateBox.className = 'us-bf-affix';
  dateBox.appendChild(dueDate);
  const timeBox = document.createElement('span');
  timeBox.className = 'us-bf-affix';
  const dueTime = document.createElement('input');
  dueTime.type = 'time';
  dueTime.step = 900;
  dueTime.id = 'DueTime';
  dueTime.setAttribute('aria-label', 'Due time (optional)');
  timeBox.appendChild(dueTime);
  timeBox.hidden = true;
  dueRow.append(dateBox, timeBox);

  const quick = document.createElement('div');
  quick.className = 'us-bf-quick';
  quick.setAttribute('role', 'group');
  quick.setAttribute('aria-label', 'Quick dates');
  quick.innerHTML =
    '<button type="button" data-us-days="0">Today</button>' +
    '<button type="button" data-us-days="1">Tomorrow</button>' +
    '<button type="button" data-us-days="7">In a week</button>' +
    '<button type="button" class="us-bf-quiet" data-us-add-time><i class="ti ti-clock" aria-hidden="true"></i> Add time</button>' +
    '<button type="button" class="us-bf-quiet" data-us-clear-date><i class="ti ti-x" aria-hidden="true"></i> Clear date</button>';
  dueRow.after(quick);

  let timeShown = false;

  // Add time once there is a date (15-minute steps); clearing the date
  // clears the time. An empty time closes again when it loses focus.
  function syncDue() {
    if (!dueDate.value) {
      dueTime.value = '';
      timeShown = false;
    }
    timeBox.hidden = !timeShown;
    quick.querySelector('[data-us-add-time]').hidden = !dueDate.value || timeShown;
    quick.querySelector('[data-us-clear-date]').hidden = !dueDate.value;
  }

  function setDate(value) {
    dueDate.value = value;
    dueDate.dispatchEvent(new Event('input', {bubbles: true}));
    dueDate.dispatchEvent(new Event('change', {bubbles: true}));
    syncDue();
  }

  quick.addEventListener('click', event => {
    const choice = event.target.closest('button');
    if (!choice) {
      return;
    }
    if (choice.hasAttribute('data-us-add-time')) {
      timeShown = true;
      syncDue();
      dueTime.focus();
    } else if (choice.hasAttribute('data-us-clear-date')) {
      setDate('');
    } else {
      setDate(today(Number(choice.dataset.usDays)));
    }
  });
  dueDate.addEventListener('change', syncDue);
  dueDate.addEventListener('input', syncDue);
  dueTime.addEventListener('blur', () => {
    if (!dueTime.value) {
      timeShown = false;
      syncDue();
    }
  });

  // One datetime: the date, at the time when one is added, otherwise
  // midnight (which reads back as the date alone; owner, 18 November 2026).
  function composeDeadline() {
    deadline.value = kind === 'task' && dueDate.value ? dueDate.value + 'T' + (dueTime.value || '00:00') + ':00' : '';
  }

  /* ---------- Assign to ---------- */

  const staff = control('PrimaryStaffLead');
  const staffName = control('PrimaryStaffLeadName');
  let wantedStaff = editing ? '' : me;

  function chooseStaff() {
    if (!staff) {
      return;
    }
    // BeyondFormz's flow list may lead with a blank or a prompt row.
    [...staff.options].filter(option => /^option-\d+-$/.test(option.value)).forEach(option => option.remove());
    if (![...staff.options].some(option => option.value === '')) {
      staff.add(new Option('', ''), 0);
    }
    const known = [...staff.options].some(option => option.value === wantedStaff);
    $(staff).val(known ? wantedStaff : '').trigger('change');
  }

  if (staff) {
    $(staff).select2({width: '100%', placeholder: 'Nobody yet', allowClear: true});
    whenFilled(staff, chooseStaff);
    $(staff).on('change', () => {
      const option = staff.options[staff.selectedIndex];
      staffName.value = option && option.value ? option.text : '';
    });
  }

  /* ---------- Completed and what was done ---------- */

  const actioned = control('Actioned');
  const actionedNotes = control('ActionedNotes');
  const actionedField = wrapper('ActionedNotes');

  // A field of its own above What was done, in its row, so it opens with
  // the task and takes the row's spacing.
  const completedField = document.createElement('div');
  completedField.className = 'form-group field-Completed col-md-12';
  completedField.innerHTML = '<div class="us-bf-check"><label><input type="checkbox" id="Completed"><span>Completed</span></label></div>' +
    '<p class="us-bf-hint" data-us-added hidden></p>';
  const completed = completedField.querySelector('input');
  actionedField.before(completedField);
  completed.addEventListener('change', () => {
    actioned.value = completed.checked ? '1' : '0';
    sync();
    if (completed.checked) {
      setTimeout(() => actionedNotes.focus(), 230);
    }
  });

  /* ---------- Tags and subtags ---------- */

  const tags = control('Tags');
  const subtags = control('Subtags');
  const subtagField = wrapper('Subtags');
  const tagOptions = control('NoteTagOptions');
  const tagLabels = control('TagLabels');
  let allSubtags = [];
  let wantedTags = [];

  $(tags).select2({width: '100%', placeholder: 'Choose any that apply'});
  $(subtags).empty().select2({width: '100%', placeholder: 'Choose any that apply'});

  function tagName(value) {
    const option = [...tags.options].find(entry => entry.value === String(value));
    return option ? option.text : '';
  }

  // The subtags of the chosen tags, keeping any still offered.
  function refreshSubtags() {
    const chosen = ($(tags).val() || []).map(value => String(parseInt(value, 10)));
    const kept = ($(subtags).val() || []).concat(wantedTags.filter(value => allSubtags.some(sub => String(sub.value) === String(value))));
    const options = allSubtags.filter(option => chosen.indexOf(String(parseInt(option.parent, 10))) !== -1);
    subtags.innerHTML = options
      .map(option => '<option value="' + escapeHtml(option.value) + '"' +
        (kept.indexOf(String(option.value)) !== -1 ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>')
      .join('');
    $(subtags).trigger('change.select2');
    reveal(subtagField, options.length > 0);
    describeTags();
  }

  // For the flow: every tag ordinal offered (it adds and removes only
  // those) and every name, for the change log.
  function describeTags() {
    const labels = {};
    [...tags.options].filter(option => option.value && !/^option-\d+-$/.test(option.value))
      .forEach(option => { labels[option.value] = option.text; });
    allSubtags.forEach(option => {
      labels[option.value] = (tagName(option.parent) ? tagName(option.parent) + ' › ' : '') + option.label;
    });
    tagOptions.value = Object.keys(labels).join(',');
    tagLabels.value = JSON.stringify(labels);
  }

  $(tags).on('change', refreshSubtags);

  whenFilled(tags, () => {
    [...tags.options].filter(option => /^option-\d+-$/.test(option.value)).forEach(option => option.remove());
    $(tags).val(wantedTags.filter(value => [...tags.options].some(option => option.value === String(value))).map(String)).trigger('change');
  });

  query(SUBTAGS_QUERY, {ParentTagOrdinal: ''})
    .then(rows => {
      allSubtags = rows
        .filter(row => !/^false$/i.test(String(column(row, 'TagStatus'))))
        .map(row => ({value: String(column(row, 'Ordinal')), label: String(column(row, 'TagName') || ''), parent: String(column(row, 'ParentTagOrdinal'))}))
        .filter(row => row.value !== 'undefined' && row.label);
      refreshSubtags();
    })
    .catch(error => console.warn('Case note: the note subtags could not be read (' + error.message + '), so Subtags has nothing to show.'));

  /* ---------- Attachments ---------- */

  const filesInput = control('Files');
  const accessField = wrapper('Access');
  // In a row of its own, as BeyondFormz lays out a field, for the spacing.
  const filesRow = document.createElement('div');
  filesRow.className = 'row';
  const filesField = document.createElement('div');
  filesField.className = 'form-group field-Attachments col-md-12';
  filesRow.appendChild(filesField);
  filesField.innerHTML =
    '<label for="us-bf-file-input">Attachments <span class="us-bf-optional">(optional)</span></label>' +
    '<div class="us-bf-drop" data-us-drop>' +
    '<span class="us-bf-drop__text"><i class="ti ti-upload" aria-hidden="true"></i>' +
    '<span>Drop files here or <button type="button" data-us-choose>choose files</button></span></span>' +
    '<span>Up to 20 MB each</span>' +
    '<input type="file" id="us-bf-file-input" multiple hidden>' +
    '</div>' +
    '<ul class="us-bf-files" data-us-saved-files></ul>' +
    '<ul class="us-bf-files" data-us-files></ul>';
  (accessField.closest('.row') || accessField).before(filesRow);

  const drop = filesField.querySelector('[data-us-drop]');
  const picker = filesField.querySelector('input[type=file]');
  const savedList = filesField.querySelector('[data-us-saved-files]');
  const fileList = filesField.querySelector('[data-us-files]');
  const files = [];
  let fileTagChoices = null;
  let cloudToolzBase = null;

  function cloudToolzUrl() {
    if (cloudToolzBase) {
      return Promise.resolve(cloudToolzBase);
    }
    return query(CLOUDTOOLZ_URL_QUERY, {limit: '1'}).then(rows => {
      const url = String(column(rows[0], 'Description') || '').replace(/\/$/, '');
      if (!url) {
        throw new Error('The CloudToolz URL is not set up in iMIS.');
      }
      cloudToolzBase = url;
      return url;
    });
  }

  // The attachment tags: the hidden FileTagChoices list, which BeyondFormz
  // fills from flow/sharepoint/seetags (the old note form's file tags; dev
  // tenant, 19 November 2026: 12 General … 17 Minutes). Only if that comes
  // back empty, the attachment tags IQA.
  const fileTagSource = control('FileTagChoices');
  const fileTagField = wrapper('FileTagChoices');
  if (fileTagField) {
    fileTagField.hidden = true;
  }

  function fileTagsFromList() {
    return new Promise(resolve => {
      if (!fileTagSource) {
        resolve([]);
        return;
      }
      const read = () => [...fileTagSource.options]
        .map(option => ({value: String(option.value), label: String(option.text || '').trim()}))
        .filter(option => Number(option.value) >= FIRST_FILE_TAG && option.label);
      if (filled(fileTagSource)) {
        resolve(read());
        return;
      }
      const observer = new MutationObserver(() => {
        if (filled(fileTagSource)) {
          observer.disconnect();
          resolve(read());
        }
      });
      observer.observe(fileTagSource, {childList: true});
      setTimeout(() => {
        observer.disconnect();
        resolve(filled(fileTagSource) ? read() : []);
      }, SHOW_ANYWAY_AFTER);
    });
  }

  function fileTagsFromQuery() {
    return query(FILE_TAGS_QUERY)
      .then(rows => rows
        .map(row => ({value: String(column(row, 'Ordinal')), label: String(column(row, 'TagName') || '').trim()}))
        .filter(row => Number(row.value) >= FIRST_FILE_TAG && row.label))
      .catch(error => {
        console.warn('Case note: the attachment tags could not be read (' + error.message + ').');
        return [];
      });
  }

  function loadFileTags() {
    if (!fileTagChoices) {
      fileTagChoices = fileTagsFromList()
        .then(choices => (choices.length ? choices : fileTagsFromQuery()))
        .then(choices => choices.sort((a, b) => a.label.localeCompare(b.label)));
    }
    return fileTagChoices;
  }

  // The new files the save sends: uploaded ones, with their tags.
  function writeFiles() {
    filesInput.value = JSON.stringify(files.filter(entry => entry.state === 'done').map(entry => ({
      UploadName: entry.file.name,
      Uuid: entry.uuid,
      TagOrdinals: entry.tags.join(',')
    })));
  }

  // Fine Uploader's request, as BeyondFormz's own file field sends it.
  function upload(entry) {
    return cloudToolzUrl().then(base => {
      const data = new FormData();
      data.append('qquuid', entry.uuid);
      data.append('qqfilename', entry.file.name);
      data.append('qqtotalfilesize', String(entry.file.size));
      data.append('qqfile', entry.file, entry.file.name);
      return fetch(base + UPLOAD_PATH, {
        method: 'POST',
        credentials: 'omit',
        headers: {Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
        body: data
      });
    }).then(response => response.json().catch(() => ({})).then(result => {
      if (!response.ok || result.success === false) {
        throw new Error(result.error || 'HTTP ' + response.status);
      }
    }));
  }

  function drawFiles() {
    fileList.innerHTML = files.map((entry, index) => {
      const status = entry.state === 'uploading' ? 'Uploading…' : entry.state === 'failed' ? 'Not uploaded' : fileSize(entry.file.size);
      const head = '<div class="us-bf-file__head"><i class="ti ' + (entry.state === 'uploading' ? 'ti-loader-2' : 'ti-file') + '" aria-hidden="true"></i>' +
        '<span class="us-bf-file__name">' + escapeHtml(entry.file.name) + '</span>' +
        '<span class="us-bf-file__status" data-state="' + entry.state + '">' + escapeHtml(status) + '</span>' +
        '<button type="button" class="us-bf-file__remove" data-us-remove="' + index + '" aria-label="Remove ' + escapeHtml(entry.file.name) + '"><i class="ti ti-x" aria-hidden="true"></i></button></div>';
      // Its tags wait behind Add tags, as Details does on a task (owner,
      // 18 November 2026); open once opened or chosen.
      const tagsPart = entry.state === 'failed' ? '<p class="us-bf-error"><i class="ti ti-alert-circle" aria-hidden="true"></i>' + escapeHtml(entry.error || 'Not uploaded') + '</p>'
        : entry.tagsOpen || entry.tags.length
          ? '<label class="us-bf-file__label" for="us-bf-file-tags-' + index + '">File tags <span class="us-bf-optional">(optional)</span></label>' +
            '<select id="us-bf-file-tags-' + index + '" multiple data-us-file-tags="' + index + '"></select>'
          : '<button type="button" class="us-bf-link" data-us-add-tags="' + index + '"><i class="ti ti-plus" aria-hidden="true"></i> Add tags</button>';
      return '<li class="us-bf-file">' + head + tagsPart + '</li>';
    }).join('');

    // The tag pickers: Select2 over the attachment tags. They have no name,
    // so BeyondFormz does not send them; Files carries the tags.
    fileList.querySelectorAll('[data-us-file-tags]').forEach(select => {
      const entry = files[Number(select.dataset.usFileTags)];
      loadFileTags().then(choices => {
        select.innerHTML = choices.map(choice => '<option value="' + escapeHtml(choice.value) + '"' +
          (entry.tags.indexOf(choice.value) !== -1 ? ' selected' : '') + '>' + escapeHtml(choice.label) + '</option>').join('');
        $(select).select2({width: '100%', placeholder: 'Choose any that apply'});
        $(select).on('change', () => {
          entry.tags = ($(select).val() || []).map(String);
          writeFiles();
        });
        if (entry.openNow) {
          entry.openNow = false;
          $(select).select2('open');
        }
      });
    });
    writeFiles();
  }

  function addFiles(list) {
    [...list].forEach(file => {
      const entry = {file, uuid: uuid(), state: 'uploading', tags: [], tagsOpen: false};
      files.push(entry);
      if (file.size > MAX_FILE_BYTES) {
        entry.state = 'failed';
        entry.error = 'Larger than 20 MB.';
        return;
      }
      upload(entry)
        .then(() => {
          entry.state = 'done';
        })
        .catch(error => {
          entry.state = 'failed';
          entry.error = 'Not uploaded: ' + error.message;
        })
        .then(drawFiles);
    });
    drawFiles();
  }

  filesField.addEventListener('click', event => {
    if (event.target.closest('[data-us-choose]')) {
      picker.click();
      return;
    }
    const remove = event.target.closest('[data-us-remove]');
    if (remove) {
      files.splice(Number(remove.dataset.usRemove), 1);
      drawFiles();
      return;
    }
    const addTags = event.target.closest('[data-us-add-tags]');
    if (addTags) {
      const entry = files[Number(addTags.dataset.usAddTags)];
      entry.tagsOpen = true;
      entry.openNow = true;
      drawFiles();
    }
  });
  picker.addEventListener('change', () => {
    addFiles(picker.files);
    picker.value = '';
  });
  ['dragenter', 'dragover'].forEach(type => drop.addEventListener(type, event => {
    event.preventDefault();
    drop.setAttribute('data-over', '');
  }));
  ['dragleave', 'drop'].forEach(type => drop.addEventListener(type, () => drop.removeAttribute('data-over')));
  drop.addEventListener('drop', event => {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files.length) {
      addFiles(event.dataTransfer.files);
    }
  });

  // The note's saved attachments, with their tags: they change through the
  // attachment's own quick edit, not here.
  function drawSavedFiles(list) {
    savedList.innerHTML = (Array.isArray(list) ? list : []).map(entry => {
      const names = String(entry.Tags || '').split(',').map(name => name.trim()).filter(Boolean);
      return '<li class="us-bf-file"><div class="us-bf-file__head"><i class="ti ti-file" aria-hidden="true"></i>' +
        '<span class="us-bf-file__name">' + escapeHtml(entry.FileName) + '</span></div>' +
        (names.length ? '<div class="us-bf-file__tags">' + names.map(name => '<span class="us-bf-file__tag">' + escapeHtml(name) + '</span>').join('') + '</div>' : '') +
        '</li>';
    }).join('');
  }

  /* ---------- Access ---------- */

  const access = control('Access');
  const accessLabel = accessField.querySelector(':scope > label');
  accessLabel.id = 'Access-label';
  access.hidden = true;

  const accessGroup = document.createElement('div');
  accessGroup.className = 'us-bf-segmented';
  accessGroup.setAttribute('role', 'radiogroup');
  accessGroup.setAttribute('aria-labelledby', accessLabel.id);
  access.after(accessGroup);
  const accessHint = document.createElement('p');
  accessHint.className = 'us-bf-hint';
  accessHint.id = 'Access-hint';
  accessField.appendChild(accessHint);
  accessGroup.setAttribute('aria-describedby', accessHint.id);

  let accessButtons = [];
  let wantedAccess = 'Open';

  // Open, Team, Individual first (widest to narrowest), then any others.
  function drawAccess() {
    [...access.options].filter(option => /^option-\d+-$/.test(option.value)).forEach(option => option.remove());
    const order = Object.keys(ACCESS);
    const rank = option => (order.indexOf(option.value) === -1 ? order.length : order.indexOf(option.value));
    accessGroup.innerHTML = '';
    accessButtons = [...access.options].filter(option => option.value).sort((a, b) => rank(a) - rank(b)).map(option => {
      const choice = document.createElement('button');
      const icon = (ACCESS[option.value] || {}).icon;
      choice.type = 'button';
      choice.setAttribute('role', 'radio');
      choice.dataset.value = option.value;
      choice.innerHTML = (icon ? '<i class="ti ' + icon + '" aria-hidden="true"></i>' : '') + escapeHtml(option.text);
      accessGroup.appendChild(choice);
      return choice;
    });
    chooseAccess([...access.options].some(option => option.value === wantedAccess) ? wantedAccess : 'Open', false);
  }

  function chooseAccess(value, focus) {
    access.value = value;
    $(access).trigger('change');
    accessButtons.forEach(choice => {
      const on = choice.dataset.value === value;
      choice.setAttribute('aria-checked', String(on));
      choice.tabIndex = on ? 0 : -1;
      if (on && focus) {
        choice.focus();
      }
    });
    accessHint.textContent = (ACCESS[value] || {}).hint || '';
  }

  accessGroup.addEventListener('click', event => {
    const choice = event.target.closest('button[data-value]');
    if (choice) {
      chooseAccess(choice.dataset.value, true);
    }
  });
  accessGroup.addEventListener('keydown', event => {
    const step = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[event.key];
    if (!step || !accessButtons.length) {
      return;
    }
    event.preventDefault();
    const at = accessButtons.findIndex(choice => choice.getAttribute('aria-checked') === 'true');
    chooseAccess(accessButtons[(at + step + accessButtons.length) % accessButtons.length].dataset.value, true);
  });

  whenFilled(access, drawAccess);

  /* ---------- Note or task: what shows ---------- */

  const noteField = wrapper('Note');
  const note = control('Note');

  function setKind(value, focus) {
    if (savedKind === 'task') {
      value = 'task';
    }
    kind = value;
    // Text already typed stays: a note's text becomes the task's details.
    if (kind === 'task' && note.value.trim()) {
      detailsOpen = true;
    }
    sync();
    if (focus) {
      setTimeout(() => (kind === 'task' ? title : note).focus(), 230);
    }
  }

  function sync() {
    const task = kind === 'task';
    control('FollowupRequired').value = task ? '1' : '0';
    kindGroup.hidden = savedKind === 'task';
    kindGroup.querySelectorAll('[data-kind]').forEach(choice => {
      const on = choice.dataset.kind === kind;
      choice.setAttribute('aria-checked', String(on));
      choice.tabIndex = on ? 0 : -1;
    });

    reveal(titleField, task);
    setRequired('Title', task);
    addDetails.hidden = !task || detailsOpen;

    // The one Note column: a note's text, a task's details.
    reveal(noteField, !task || detailsOpen);
    setLabel('Note', task ? 'Details' : 'Note');
    setRequired('Note', !task);
    note.placeholder = task ? 'Anything the person doing it needs to know…' : 'What happened, what was said or agreed…';
    note.rows = task ? 3 : 4;

    reveal(dueField, task);
    reveal(wrapper('PrimaryStaffLead'), task);
    setRequired('DueDate', false);
    setRequired('PrimaryStaffLead', false);

    // Completed and What was done: editing a saved task only.
    const doneShown = task && savedKind === 'task';
    reveal(completedField, doneShown);
    reveal(actionedField, doneShown && (completed.checked || actionedNotes.value.trim() !== ''));
    setRequired('ActionedNotes', false);
    titleField.toggleAttribute('data-done', doneShown && completed.checked);

    syncDue();
    const label = editing ? 'Save changes' : task ? 'Save task' : 'Save note';
    if (!saving) {
      button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> ' + label;
    }
    buttonLabel = label;
  }

  /* ---------- Footer: message, Cancel, Save ---------- */

  const actions = document.createElement('div');
  actions.className = 'us-bf-actions';
  const buttonField = button.closest('.form-group') || button;
  buttonField.before(actions);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-default us-outline-button';
  cancel.textContent = 'Cancel';

  if (message) {
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    actions.appendChild(message);
  }
  const cancelField = document.createElement('div');
  cancelField.className = 'form-group field-CancelButton';
  cancelField.appendChild(cancel);
  actions.append(cancelField, buttonField);

  ['Tags', 'Subtags'].forEach(name => setRequired(name, false));

  /* ---------- Closing the popup ---------- */

  // The iMIS popup is a Telerik RadWindow around this page. It closes with
  // the popup form contract's result, which the theme reads.
  function popup() {
    try {
      if (window.radWindow) {
        return window.radWindow;
      }
      if (window.frameElement && window.frameElement.radWindow) {
        return window.frameElement.radWindow;
      }
      if (typeof window.GetRadWindow === 'function') {
        return window.GetRadWindow();
      }
    } catch (error) {
      // A frame from another site: not an iMIS popup.
    }
    return null;
  }

  function closeWith(result) {
    const win = popup();
    if (win && typeof win.close === 'function') {
      win.close(result);
      return true;
    }
    return false;
  }

  cancel.addEventListener('click', () => {
    if (!closeWith({cancel: true})) {
      history.back();
    }
  });

  /* ---------- Saving ---------- */

  let saving = false;
  let saveTimer = 0;
  let buttonLabel = 'Save note';

  function busy(on) {
    saving = on;
    clearTimeout(saveTimer);
    cancel.disabled = on;
    button.setAttribute('aria-busy', String(on));
    button.innerHTML = on
      ? '<span class="us-button-spinner" aria-hidden="true"></span>Saving…'
      : '<i class="ti ti-check" aria-hidden="true"></i> ' + buttonLabel;
    // After BeyondFormz's own click handler has started the save.
    setTimeout(() => {
      button.disabled = on;
    }, 0);
    if (on) {
      saveTimer = setTimeout(() => {
        busy(false);
        setMessage('No answer from the server. Check the case before trying again.', 'danger');
      }, SAVE_TIMEOUT);
    }
  }

  // Every shown field that fails, with what it says.
  function problems() {
    const found = [];
    if (kind === 'task' && !title.value.trim()) {
      found.push([title, 'Say what needs doing.']);
    }
    if (kind === 'note' && !note.value.trim()) {
      found.push([note, 'Write the note.']);
    }
    if (files.some(entry => entry.state === 'uploading')) {
      found.push([picker, 'Wait for the attachments to finish uploading.']);
    }
    return found;
  }

  function stampCurrentDate() {
    const now = new Date();
    control('CurrentDate').value = isoDay(now) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';
  }

  // Capture phase on window: runs before BeyondFormz's handler, and stops it
  // when something needs fixing, so nothing is sent.
  window.addEventListener('click', event => {
    if (!event.target.closest || !event.target.closest('#SaveButton')) {
      return;
    }
    const stop = () => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    if (saving) {
      stop();
      return;
    }
    form.querySelectorAll('[aria-invalid=true]').forEach(clearError);
    const found = problems();
    if (found.length) {
      stop();
      found.forEach(([el, text]) => (el === picker ? setMessage(text, 'danger') : showError(el, text)));
      if (found[0][0] !== picker) {
        setMessage(found.length === 1 ? 'One field needs fixing.' : found.length + ' fields need fixing.', 'danger');
        found[0][0].focus();
      }
      return;
    }
    // A note sends no task fields; the flow clears them too.
    if (kind === 'note') {
      setFlag(false);
      $(staff).val('').trigger('change');
    }
    composeDeadline();
    describeTags();
    writeFiles();
    setMessage('');
    stampCurrentDate();
    busy(true);
  }, true);

  // A field clears its error as soon as it changes.
  $(form).on('input change', 'input, select, textarea', event => {
    const el = event.target;
    if (el.getAttribute('aria-invalid') === 'true') {
      clearError(el);
      if (!form.querySelector('[aria-invalid=true]')) {
        setMessage('');
      }
    }
  });
  actionedNotes.addEventListener('input', () => {
    if (!actionedNotes.value.trim() && !completed.checked) {
      sync();
    }
  });

  // Ctrl+Enter saves from anywhere in the form; Esc cancels.
  form.addEventListener('keydown', event => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      button.click();
    } else if (event.key === 'Escape' && !saving && !document.querySelector('.select2-container--open')) {
      event.preventDefault();
      cancel.click();
    }
  });

  /* The save's answer. Success: Success true or an AsiSuccess message: the
     popup closes with {saved: true, Ordinal}, which refreshes the page's
     lists. Anything else stays on the form with the flow's message. */
  function saved(answer) {
    const data = parse(answer) || {};
    const html = String(data['class-html-Message'] || '');
    const ok = data.Success === true || /AsiSuccess/.test(html);
    if (!ok || data.Error) {
      busy(false);
      if (message) {
        message.dataset.tone = 'danger';
      }
      if (!html) {
        setMessage('It wasn’t saved. Try again; if it keeps happening, contact an administrator.', 'danger');
      }
      return;
    }
    clearTimeout(saveTimer);
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'false');
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Saved';
    if (!html) {
      setMessage(kind === 'task' ? 'Task saved.' : 'Note saved.');
    }
    // A warning (a tag or a file that didn't save) stays readable a moment.
    setTimeout(() => closeWith({saved: true, Ordinal: String(data.Ordinal || param('Ordinal'))}), data.Warning ? CLOSE_DELAY * 3 : CLOSE_DELAY);
  }

  /* ---------- The prefill ---------- */

  function applyRules(rows) {
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const field = wrapper(row.FieldName);
      const el = control(row.FieldName);
      if (!field || !el || el.type === 'hidden') {
        return;
      }
      if (row.Visible != null && !truthy(row.Visible)) {
        field.hidden = true;
        el.required = false;
        return;
      }
      if (row.Editable != null && !truthy(row.Editable)) {
        el.disabled = true;
      }
    });
  }

  /* The prefill's answer: ReqVals (the FormFields rules), CaseNum (when the
     link gave only CaseID), MemberName, and when editing: Note (the row),
     NoteTags (tag ordinals) and Files ({FileName, Tags}). Error: the note or
     the case could not be opened. */
  function prefill(answer) {
    const data = parse(answer) || {};
    applyRules(parse(data.ReqVals));
    drawCase(data.MemberName || '');
    if (!param('CaseNum') && data.CaseNum) {
      control('CaseNum').value = String(data.CaseNum);
    }

    const row = parse(data.Note);
    if (data.Error) {
      setMessage(String(data.Error), 'danger');
      button.disabled = true;
    } else if (editing && row) {
      savedKind = truthy(row.FollowupRequired) ? 'task' : 'note';
      kind = savedKind;
      title.value = row.Title || '';
      note.value = row.Note || '';
      detailsOpen = note.value.trim() !== '';
      setFlag(truthy(row.HighPriority));
      const due = String(row.Deadline || '').match(/^(\d{4}-\d{2}-\d{2})(?:T(\d{2}:\d{2}))?/);
      dueDate.value = due ? due[1] : '';
      // Midnight is the date alone.
      dueTime.value = due && due[2] && due[2] !== '00:00' ? due[2] : '';
      timeShown = dueTime.value !== '';
      wantedStaff = String(row.PrimaryStaffLead || '');
      completed.checked = truthy(row.Actioned);
      actioned.value = completed.checked ? '1' : '0';
      actionedNotes.value = row.ActionedNotes || '';
      wantedAccess = row.Access || 'Open';
      wantedTags = String(data.NoteTags || '').split(',').map(value => value.trim()).filter(Boolean);
      drawSavedFiles(parse(data.Files));
      const added = completedField.querySelector('[data-us-added]');
      if (row.CreatedOn) {
        added.textContent = 'Added ' + niceDay(row.CreatedOn) + (row.CreatedByName ? ' by ' + row.CreatedByName : '') + '.';
        added.hidden = false;
      }
      // Lists that were already in: put the saved values in now.
      if (filled(staff)) {
        chooseStaff();
      }
      if (filled(access)) {
        drawAccess();
      }
      if (filled(tags)) {
        $(tags).val(wantedTags).trigger('change');
      }
    } else if (editing) {
      setMessage('This note couldn’t be opened. It may have been deleted, or be on another case.', 'danger');
      button.disabled = true;
    }

    sync();
    prefilled = true;
    revealWhenReady();
  }

  /* ---------- Start ---------- */

  sync();
  form.setAttribute('data-us-loading', '');
  revealTimer = setTimeout(revealForm, SHOW_ANYWAY_AFTER);

  window.usCaseNote = {prefill, saved};
  // An answer that arrived before this script ran.
  if (window.usCaseNotePending) {
    prefill(window.usCaseNotePending);
    delete window.usCaseNotePending;
  }
})();
