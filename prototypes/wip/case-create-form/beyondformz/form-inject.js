/* Create case (staff) form: the form's "JavaScript to inject".

   Maintained here; build-form.cjs writes it into the BeyondFormz export.
   Do not edit the copy in BeyondFormz without bringing the change back.

   The form's fields are plain BeyondFormz fields. This script:
   - adds the us-bf-* styles (until they move to the theme's
     US-BEYOND-FORMS section);
   - shows the form once the prefill answers, so fields never pop in one
     by one;
   - applies the FormFields rules (UnionTemplate.FormFields, Cases /
     CreateCaseStaff): Visible 0 hides a field, IsRequired marks it,
     Editable 0 disables it. Fields without a rule stay as built;
   - draws who the case is for, and the note it starts from;
   - filters Subtype by the chosen types, and shows it only when there is
     something to pick;
   - fills Workplace from the prefill's Workplaces (hidden until it has some);
   - starts Lead staff as the signed-in user and Priority at Normal;
   - draws Access as three buttons, Individual making Lead staff required;
   - checks the required fields when Create case is pressed, before
     BeyondFormz sends anything, and opens the new case once it is saved.

   The other field scripts hand their answers to window.usCreateCase:
   the prefill (autoexecute) calls prefill(data), the hidden SubTypeSession
   button calls setSubTypes(list), Create case calls created(data). */

(function () {
  'use strict';

  const $ = window.jQuery;
  const createButton = document.getElementById('CreateCaseButton');

  if (!createButton || window.usCreateCase) {
    return;
  }

  const form = createButton.closest('.rendered-form');

  /* ---------- Settings ---------- */

  // Replaced by build-form.cjs with case-create-form.candidate.css.
  const STYLES = '/* US-BF-STYLES */';

  // What a missing required field says. Others say "Fill this in."
  const MISSING = {
    CaseName: 'Give the case a title.',
    CaseTypes: 'Choose at least one type.',
    CaseDescription: 'Say what happened.',
    CaseStaffMembers: 'Choose a lead: an Individual case is seen only by its staff.',
    CaseAccessLevel: 'Choose who can see the case.',
    CasePriority: 'Choose a priority.'
  };

  const ACCESS = {
    Open: {icon: 'ti-world', hint: 'All staff can see it.'},
    Team: {icon: 'ti-users', hint: 'Only the Case Team can see it. Managers see every case.'},
    Individual: {icon: 'ti-lock', hint: 'Only staff on this case can see it. Managers see every case.'}
  };

  const NORMAL_PRIORITY = '3';
  const NOTE_PREFIX = 'Created from Note: ';
  const SHOW_ANYWAY_AFTER = 8000;
  const SAVE_TIMEOUT = 30000;

  /* ---------- Helpers ---------- */

  function escapeHtml(text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function parse(value) {
    if (typeof value !== 'string') {
      return value;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }

  function wrapper(name) {
    return form.querySelector('.form-group.field-' + name);
  }

  function control(name) {
    return form.querySelector('#' + name);
  }

  function signedInPartyId() {
    try {
      return String(JSON.parse(document.getElementById('__ClientContext').value).loggedInPartyId || '');
    } catch (error) {
      return '';
    }
  }

  function hasValue(el) {
    const value = $(el).val();
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value != null && String(value).trim() !== '';
  }

  function hint(field, text) {
    let line = field.querySelector('.us-bf-hint');
    if (!line) {
      line = document.createElement('p');
      line.className = 'us-bf-hint';
      line.id = field.className.match(/field-(\S+)/)[1] + '-hint';
      field.appendChild(line);
    }
    line.textContent = text;
    return line;
  }

  /* Required, with BeyondFormz's own asterisk; "(optional)" otherwise. */
  function setRequired(name, on) {
    const field = wrapper(name);
    const el = control(name);
    if (!field || !el) {
      return;
    }
    const label = field.querySelector('label');
    el.required = on;
    if (on) {
      el.setAttribute('aria-required', 'true');
    } else {
      el.removeAttribute('aria-required');
      clearError(el);
    }
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

  /* ---------- Errors ---------- */

  function showError(el, text) {
    const field = el.closest('.form-group');
    field.classList.add('us-bf-invalid');
    el.setAttribute('aria-invalid', 'true');
    let error = field.querySelector('.us-bf-error');
    if (!error) {
      error = document.createElement('p');
      error.className = 'us-bf-error';
      error.id = el.id + '-error';
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
    const error = field.querySelector('.us-bf-error');
    if (error) {
      error.remove();
    }
  }

  const message = form.querySelector('.Message');

  function setMessage(text, tone) {
    if (!message) {
      return;
    }
    message.textContent = text || ' ';
    if (tone) {
      message.dataset.tone = tone;
    } else {
      delete message.dataset.tone;
    }
  }

  /* Required fields that are shown and editable, and empty. */
  function missingFields() {
    return [...form.querySelectorAll('[required]')].filter(el => {
      if (el.disabled || el.type === 'hidden') {
        return false;
      }
      const field = el.closest('.form-group');
      if (!field || field.hidden || field.offsetParent === null) {
        return false;
      }
      return !hasValue(el);
    });
  }

  function fieldName(el) {
    return el.id || el.name.replace('[]', '');
  }

  /* ---------- Lists BeyondFormz fills later ---------- */

  // BeyondFormz fills each IQA list after this script has run (seen on the
  // dev tenant, 29 October 2026), so anything that needs a list's options
  // waits for them.
  const waitingLists = new Set();

  function filled(select) {
    return !!select && [...select.options].some(option => option.value !== '');
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
      // Let the rest of the list land first.
      setTimeout(() => {
        run();
        waitingLists.delete(select);
        revealWhenReady();
      }, 0);
    });
    observer.observe(select, {childList: true});
  }

  /* ---------- Showing the form ---------- */

  // Shown once the prefill has answered and the lists are in, so nothing
  // changes under the user's eyes; or after SHOW_ANYWAY_AFTER regardless.
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

  /* ---------- FormFields rules ---------- */

  function applyRules(rows) {
    const on = value => value === true || value === 1 || value === '1';
    (rows || []).forEach(row => {
      const name = row.FieldName;
      const field = wrapper(name);
      const el = form.querySelector('[name="' + name + '"], [name="' + name + '[]"]');
      if (!field || !el || el.type === 'hidden') {
        return;
      }
      if (!on(row.Visible)) {
        field.hidden = true;
        return;
      }
      if (row.Editable != null && !on(row.Editable)) {
        el.disabled = true;
        $(el).trigger('change.select2');
      }
      if (on(row.IsRequired)) {
        setRequired(name, true);
      }
    });
  }

  /* "(optional)" on every shown field that is not required. */
  function markOptional() {
    form.querySelectorAll('.form-group[class*="field-"]').forEach(field => {
      const el = field.querySelector('input, select, textarea');
      const label = field.querySelector(':scope > label');
      if (!el || !label || el.type === 'hidden' || field.classList.contains('field-CaseAccessLevel')) {
        return;
      }
      if (!el.required && !label.querySelector('.us-bf-optional')) {
        setRequired(fieldName(el), false);
      }
    });
  }

  /* ---------- Who the case is for, and the note ---------- */

  const title = form.querySelector('.us-bf-title') || form.querySelector('h1, h2');
  const forLine = document.createElement('p');
  forLine.className = 'us-bf-for';
  forLine.hidden = true;
  const origin = document.createElement('p');
  origin.className = 'us-bf-origin';
  origin.hidden = true;
  if (title) {
    title.classList.add('us-bf-title');
    title.after(forLine, origin);
  }

  function drawMember(member) {
    if (!member || !member.Name) {
      return;
    }
    const tone = member.StandingTone || 'warning';
    const badge = member.Standing
      ? ' <span class="us-badge us-badge--' + escapeHtml(tone) + '">' + escapeHtml(member.Standing) + '</span>'
      : '';
    const details = [member.ID ? 'Member ' + member.ID : '', member.MemberType]
      .filter(Boolean)
      .map(escapeHtml)
      .join(' · ');
    forLine.innerHTML = '<span>For</span> <strong>' + escapeHtml(member.Name) + '</strong>' +
      (details ? '<span>· ' + details + '</span>' : '') + badge +
      (member.StandingNote ? '<span class="us-bf-for__note">' + escapeHtml(member.StandingNote) + '</span>' : '');
    forLine.hidden = false;
  }

  /* The note the case starts from: the prefill's Note, or the description
     it filled ("Created from Note: …", which loses its prefix). */
  function drawNote(note) {
    const description = control('CaseDescription');
    let text = note && note.Note;
    if (!text && description && description.value.indexOf(NOTE_PREFIX) === 0) {
      text = description.value.slice(NOTE_PREFIX.length);
    }
    if (!text) {
      return;
    }
    if (description) {
      description.value = text;
    }
    const by = note ? [note.CreatedOn, note.CreatedBy].filter(Boolean).join(' · ') : '';
    origin.innerHTML = '<span class="us-bf-origin__head">From a note' + (by ? ', ' + escapeHtml(by) : '') +
      '. It will be linked to this case.</span><span class="us-bf-origin__text">' + escapeHtml(text) + '</span>';
    origin.hidden = false;
  }

  /* ---------- Sections ---------- */

  form.querySelectorAll('h3').forEach(heading => heading.classList.add('us-bf-section'));

  /* ---------- Type and Subtype ---------- */

  const types = control('CaseTypes');
  const subTypes = control('CaseSubTypes');
  const subField = wrapper('CaseSubTypes');
  let allSubTypes = [];

  $(types).select2({width: '100%', placeholder: 'Choose one or more'});
  $(subTypes).empty().select2({width: '100%', placeholder: 'Choose any that apply'});
  subField.classList.add('us-bf-reveal');
  subField.setAttribute('data-closed', '');

  function refreshSubTypes() {
    const chosen = ($(types).val() || []).map(value => String(parseInt(value, 10)));
    const kept = $(subTypes).val() || [];
    const options = allSubTypes.filter(option => chosen.indexOf(String(parseInt(option.ParentTag, 10))) !== -1);

    subTypes.innerHTML = options
      .map(option => '<option value="' + escapeHtml(option.value) + '"' +
        (kept.indexOf(String(option.value)) !== -1 ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>')
      .join('');
    $(subTypes).trigger('change.select2');

    if (options.length) {
      subField.removeAttribute('data-closed');
    } else {
      subField.setAttribute('data-closed', '');
    }
  }

  $(types).on('change', refreshSubTypes);

  /* Every subtype, as {value, label, ParentTag}. Also takes the tag IQA's
     names (Ordinal, TagName, ParentTagOrdinal) and a list of lists, as
     the old SubTypeFire answer was. */
  function setSubTypes(list) {
    const rows = [].concat(...(Array.isArray(list) ? list : []).map(row => (Array.isArray(row) ? row : [row])));
    allSubTypes = rows
      .map(row => ({
        value: row.value != null ? row.value : row.Ordinal,
        label: row.label != null ? row.label : row.TagName,
        ParentTag: row.ParentTag != null ? row.ParentTag : row.ParentTagOrdinal
      }))
      .filter(row => row.value != null && row.label != null && row.ParentTag != null);
    subTypesLoaded = true;
    clearTimeout(subTypesTimer);
    if (!allSubTypes.length) {
      console.warn('Create case: the subtypes answer had no usable rows.', list);
    }
    refreshSubTypes();
  }

  /* The hidden button that fetches every subtype (Cases/SetSessionStorage).
     Pressed once the prefill has answered: pressed while the form was
     still loading, BeyondFormz did not send it (dev tenant, 29 October
     2026). The old form's copy in session storage fills the list in the
     meantime. */
  const subTypeButton = document.getElementById('SubTypeSession');
  let subTypesLoaded = false;
  let subTypesRequested = false;
  let subTypesTimer = 0;

  if (subTypeButton) {
    subTypeButton.closest('.form-group').hidden = true;
  }

  function requestSubTypes() {
    if (subTypesLoaded || subTypesRequested || !subTypeButton) {
      return;
    }
    subTypesRequested = true;
    try {
      const cached = parse(sessionStorage.getItem('CaseSubTypes'));
      if (Array.isArray(cached) && cached.length) {
        setSubTypes(cached);
        subTypesLoaded = false;
      }
    } catch (error) {
      // No session storage: wait for the answer.
    }
    $(subTypeButton).trigger('click');
    subTypesTimer = setTimeout(() => {
      if (!subTypesLoaded) {
        console.warn('Create case: Cases/SetSessionStorage did not answer, so Subtype has nothing to show.');
      }
    }, 8000);
  }

  /* ---------- Workplace ---------- */

  const workplace = control('PrimaryWorkplaceID');
  const workplaceField = wrapper('PrimaryWorkplaceID');
  if (workplaceField) {
    // No options until the prefill brings jobs: an empty list sends nothing.
    workplace.innerHTML = '';
    workplaceField.hidden = true;
  }

  function monthYear(value) {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return isNaN(date) ? String(value) : date.toLocaleDateString('en-AU', {month: 'short', year: 'numeric'});
  }

  /* One job, as the jobs IQA returns it ("Workplace Name", "Member Job
     Status", "Job Start Date", "Job End Date") or with short names. */
  function job(row) {
    const status = String(row['Member Job Status'] || row.Status || 'Active');
    const start = monthYear(row['Job Start Date'] || row.Start);
    const end = monthYear(row['Job End Date'] || row.End);
    const group = /finish|former/i.test(status) ? 'former' : /not started/i.test(status) ? 'upcoming' : 'current';
    const dates = group === 'former'
      ? [start, end].filter(Boolean).join(' – ')
      : group === 'upcoming' ? (start ? 'Starts ' + start : '') : (start ? 'Since ' + start : '');
    return {
      group,
      id: String(row.WorkplaceID || row['Workplace ID'] || ''),
      text: row['Workplace Name'] || row.Workplace || '',
      line: [row.Employer, row.Classification, dates].filter(Boolean).join(' · ')
    };
  }

  function setWorkplaces(rows, memberName) {
    const jobs = (Array.isArray(rows) ? rows : []).map(job).filter(entry => entry.id && entry.text);
    if (!workplace || !workplaceField || !jobs.length) {
      return;
    }

    const groups = [['current', 'Current jobs'], ['upcoming', 'Not started'], ['former', 'Former jobs']]
      .map(([key, text]) => ({text, children: jobs.filter(entry => entry.group === key)}))
      .filter(group => group.children.length);

    $(workplace).empty().select2({
      width: '100%',
      data: [{id: '', text: '', disabled: true}, ...groups, {id: '0', text: 'Not about a workplace'}],
      placeholder: 'Choose the job this case is about',
      allowClear: true,
      templateResult: item => item.line
        ? $('<span><span class="us-bf-option__name">' + escapeHtml(item.text) + '</span>' +
            '<span class="us-bf-option__line">' + escapeHtml(item.line) + '</span></span>')
        : item.text
    });

    const current = jobs.filter(entry => entry.group === 'current');
    $(workplace).val(current.length === 1 ? current[0].id : '').trigger('change');

    const first = memberName ? memberName.split(' ')[0] + "'s" : "The member's";
    hint(workplaceField, (jobs.length > 1 ? first + ' jobs.' : first + ' only job.') + ' You can change it later on the case.');
    workplaceField.hidden = false;
  }

  /* ---------- Lead staff and Priority ---------- */

  const lead = control('CaseStaffMembers');
  let leadPartyId = signedInPartyId();

  $(lead).select2({width: '100%', placeholder: 'No lead yet', allowClear: true});

  // Select2 copies each option's text once, so "(you)" goes in first.
  function setLead(partyId) {
    leadPartyId = partyId;
    if (!filled(lead)) {
      return;
    }
    // An empty, disabled first option: a lead left empty is not sent,
    // which the create flow reads as "no lead".
    $(lead).find('option[value=""]').remove();
    $(lead).prepend('<option value="" disabled></option>');
    const option = partyId && lead.querySelector('option[value="' + partyId + '"]');
    if (option && !/\(you\)$/.test(option.textContent)) {
      option.textContent += ' (you)';
    }
    $(lead).select2('destroy');
    $(lead).select2({width: '100%', placeholder: 'No lead yet', allowClear: true});
    $(lead).val(option ? partyId : '').trigger('change');
  }

  whenFilled(lead, () => setLead(leadPartyId));

  const priority = control('CasePriority');
  whenFilled(priority, () => {
    if (priority.querySelector('option[value="' + NORMAL_PRIORITY + '"]')) {
      priority.value = NORMAL_PRIORITY;
    }
  });

  /* ---------- Who can see it ---------- */

  const access = control('CaseAccessLevel');
  const accessField = wrapper('CaseAccessLevel');
  const accessLabel = accessField.querySelector('label');
  accessLabel.id = 'CaseAccessLevel-label';
  access.hidden = true;

  const group = document.createElement('div');
  group.className = 'us-bf-segmented';
  group.setAttribute('role', 'radiogroup');
  group.setAttribute('aria-labelledby', accessLabel.id);
  group.hidden = true;

  access.after(group);
  const accessHint = hint(accessField, '');
  group.setAttribute('aria-describedby', accessHint.id);

  let accessButtons = [];

  // Open, Team, Individual first (widest to narrowest), then any others.
  function drawAccess() {
    const order = Object.keys(ACCESS);
    const rank = option => (order.indexOf(option.value) === -1 ? order.length : order.indexOf(option.value));
    group.innerHTML = '';
    accessButtons = [...access.options].filter(option => option.value).sort((a, b) => rank(a) - rank(b)).map(option => {
      const button = document.createElement('button');
      const icon = (ACCESS[option.value] || {}).icon;
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.dataset.value = option.value;
      button.innerHTML = (icon ? '<i class="ti ' + icon + '" aria-hidden="true"></i>' : '') + escapeHtml(option.text);
      group.appendChild(button);
      return button;
    });
    group.hidden = false;
    chooseAccess(access.value || 'Open', false);
  }

  function chooseAccess(value, focus) {
    access.value = value;
    $(access).trigger('change');
    accessButtons.forEach(button => {
      const on = button.dataset.value === value;
      button.setAttribute('aria-checked', String(on));
      button.tabIndex = on ? 0 : -1;
      if (on && focus) {
        button.focus();
      }
    });
    accessHint.textContent = (ACCESS[value] || {}).hint || '';
    setRequired('CaseStaffMembers', value === 'Individual');
  }

  group.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button && !access.disabled) {
      chooseAccess(button.dataset.value, false);
    }
  });

  group.addEventListener('keydown', event => {
    const step = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[event.key];
    if (!step || access.disabled) {
      return;
    }
    event.preventDefault();
    const index = accessButtons.findIndex(button => button.dataset.value === access.value);
    const next = accessButtons[(index + step + accessButtons.length) % accessButtons.length];
    chooseAccess(next.dataset.value, true);
  });

  whenFilled(access, drawAccess);

  /* ---------- Date of incident ---------- */

  const incident = control('DateIncident');
  if (incident) {
    incident.max = new Date().toLocaleDateString('en-CA');
  }

  function stampCurrentDate() {
    const pad = n => String(n).padStart(2, '0');
    const now = new Date();
    const stamp = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
      'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';
    const field = control('CurrentDate');
    if (field) {
      field.value = stamp;
    }
  }

  stampCurrentDate();

  /* ---------- Footer: message, Cancel, Create case ---------- */

  const actions = document.createElement('div');
  actions.className = 'us-bf-actions';
  const createField = createButton.closest('.form-group');
  createField.before(actions);

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.className = 'btn btn-default us-outline-button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => history.back());

  if (message) {
    message.setAttribute('role', 'status');
    message.setAttribute('aria-live', 'polite');
    actions.appendChild(message);
  }
  const cancelField = document.createElement('div');
  cancelField.className = 'form-group field-CancelButton';
  cancelField.appendChild(cancel);
  actions.append(cancelField, createField);

  /* ---------- Create case ---------- */

  const createLabel = 'Create case';
  let saving = false;
  let saveTimer = 0;

  function busy(on, label) {
    saving = on;
    clearTimeout(saveTimer);
    cancel.disabled = on;
    createButton.setAttribute('aria-busy', String(on));
    createButton.innerHTML = on
      ? '<span class="us-button-spinner" aria-hidden="true"></span>' + escapeHtml(label || 'Creating case…')
      : createLabel;
    // After BeyondFormz's own click handler has started the save.
    setTimeout(() => {
      createButton.disabled = on;
    }, 0);
    if (on) {
      saveTimer = setTimeout(() => {
        busy(false);
        setMessage('No answer from the server. Check the member\'s cases before trying again.', 'danger');
      }, SAVE_TIMEOUT);
    }
  }

  // Capture phase on window: runs before BeyondFormz's handler, and stops
  // it when something is missing, so nothing is sent.
  window.addEventListener('click', event => {
    if (!event.target.closest || !event.target.closest('#CreateCaseButton')) {
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
    const missing = missingFields();
    if (missing.length) {
      stop();
      missing.forEach(el => showError(el, MISSING[fieldName(el)] || 'Fill this in.'));
      setMessage(missing.length === 1 ? 'One field needs filling in.' : missing.length + ' fields need filling in.', 'danger');
      if ($(missing[0]).data('select2')) {
        $(missing[0]).select2('open');
      } else {
        missing[0].focus();
      }
      return;
    }

    setMessage('');
    stampCurrentDate();
    busy(true);
  }, true);

  // A field clears its error as soon as it has a value.
  $(form).on('input change', 'input, select, textarea', event => {
    const el = event.target;
    if (el.getAttribute('aria-invalid') === 'true' && hasValue(el)) {
      clearError(el);
      if (!form.querySelector('[aria-invalid=true]')) {
        setMessage('');
      }
    }
  });

  /* The create flow's answer. {CaseID, CaseNum}, or today's message with
     the case link: either way, open the case. Anything else is an error,
     which the flow has already written into the message. */
  function created(answer) {
    const data = parse(answer) || {};
    const html = String(data['class-html-Message'] || '');
    let url = '';
    let caseId = data.CaseID || '';
    if (data.CaseID && data.CaseNum) {
      url = '/Cases_ManageCase?CaseID=' + encodeURIComponent(data.CaseID) + '&CaseNum=' + encodeURIComponent(data.CaseNum);
    } else {
      const link = html.match(/href="([^"]*Cases_ManageCase[^"]*)"[^>]*>([^<]*)</);
      if (link) {
        url = link[1].replace(/&amp;/g, '&');
        caseId = link[2];
      }
    }

    if (!url) {
      busy(false);
      if (message) {
        message.dataset.tone = 'danger';
      }
      if (!html) {
        setMessage("The case wasn't created. Try again; if it keeps happening, contact an administrator.", 'danger');
      }
      return;
    }

    busy(true, 'Opening case…');
    clearTimeout(saveTimer);
    setMessage((caseId ? 'Case ' + caseId + ' created.' : 'Case created.') + ' Opening it…');
    location.href = url;
  }

  /* ---------- The prefill ---------- */

  function prefill(answer) {
    const data = parse(answer) || {};
    applyRules(parse(data.ReqVals));
    markOptional();
    drawMember(parse(data.Member));
    drawNote(parse(data.Note));
    if (data.SubTypes) {
      setSubTypes(parse(data.SubTypes));
    } else {
      requestSubTypes();
    }
    const member = parse(data.Member) || {};
    setWorkplaces(parse(data.Workplaces), member.Name);
    const me = parse(data.Me);
    if (me && me.ID && !hasValue(lead)) {
      setLead(String(me.ID));
    }
    prefilled = true;
    revealWhenReady();
  }

  /* ---------- Start ---------- */

  if (!document.getElementById('us-bf-styles')) {
    const style = document.createElement('style');
    style.id = 'us-bf-styles';
    style.textContent = STYLES;
    document.head.appendChild(style);
  }

  form.setAttribute('data-us-loading', '');
  revealTimer = setTimeout(() => {
    markOptional();
    revealForm();
    requestSubTypes();
  }, SHOW_ANYWAY_AFTER);

  window.usCreateCase = {prefill, setSubTypes, created};

  // Answers that arrived before this script ran.
  if (window.usCreateCasePending) {
    prefill(window.usCreateCasePending);
    delete window.usCreateCasePending;
  }
  if (window.usCreateCaseSubTypesPending) {
    setSubTypes(window.usCreateCaseSubTypesPending);
    delete window.usCreateCaseSubTypesPending;
  }
})();
