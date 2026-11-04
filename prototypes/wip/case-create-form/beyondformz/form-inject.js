/* Create case (staff) form: the form's "JavaScript to inject".

   Maintained here; build-form.cjs writes it into the BeyondFormz export.
   Do not edit the copy in BeyondFormz without bringing the change back.

   The form's fields are plain BeyondFormz fields; the us-bf-* classes it
   uses are styled by the theme (zUnionSuite.css, US-BEYOND-FORMS). This
   script:
   - shows the form once the prefill answers, so fields never pop in one
     by one;
   - applies the FormFields rules (UnionTemplate.FormFields, Cases /
     CreateCaseStaff): Visible 0 hides a field, IsRequired marks it,
     Editable 0 disables it. Fields without a rule stay as built;
   - draws who the case is for, and the note it starts from;
   - reads every subtype from an IQA, filters Subtype by the chosen types,
     and shows it only when there is something to pick;
   - fills Workplace from the prefill's Workplaces (hidden until it has some);
   - starts Lead staff empty and Priority at Normal, and adds "Assign me to
     this case" while the lead is empty or someone else;
   - draws Access as three buttons; an Individual case needs a lead or
     Assign me;
   - sends the chosen types', lead's, workplace's and priority's names for
     the change log;
   - checks the required fields when Create case is pressed, before
     BeyondFormz sends anything, and opens the new case once it is saved.

   The other field scripts hand their answers to window.usCreateCase:
   the prefill (autoexecute) calls prefill(data), Create case calls
   created(data). */

(function () {
  'use strict';

  const $ = window.jQuery;
  const createButton = document.getElementById('CreateCaseButton');

  if (!createButton || window.usCreateCase) {
    return;
  }

  const form = createButton.closest('.rendered-form');

  /* ---------- Settings ---------- */

  // What a missing required field says. Others say "Fill this in."
  const MISSING = {
    CaseName: 'Give the case a title.',
    CaseTypes: 'Choose at least one type.',
    CaseDescription: 'Say what happened.',
    CaseAccessLevel: 'Choose who can see the case.',
    CasePriority: 'Choose a priority.'
  };

  const ACCESS = {
    Open: {icon: 'ti-world', hint: 'All staff can see it.'},
    Team: {icon: 'ti-users', hint: 'Only the Case Team can see it. Managers see every case.'},
    Individual: {icon: 'ti-lock', hint: 'Only staff on this case can see it. Managers see every case.'}
  };

  // Every subtype (Ordinal, TagName, TagStatus, ParentTagOrdinal,
  // ParentTagName). Its ParentTagOrdinal filter is optional but defaults
  // to 0, which returns nothing: sent blank, it returns every subtype
  // (dev tenant, 2 November 2026).
  const SUBTYPES_QUERY = '$/_i4u_/Core/Cases/Layouts v2/API - Value List - Subtypes';

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

  /* The current website's path, e.g. "/UTTemplate", from gWebSiteRoot or
     the __ClientContext websiteRoot. When several websites share a domain,
     a bare shortcut such as /Cases_ManageCase opens the default website,
     not this one (owner, 4 November 2026). */
  function websiteRoot() {
    let site = window.gWebSiteRoot || '';
    if (!site) {
      try {
        site = JSON.parse(document.getElementById('__ClientContext').value).websiteRoot || '';
      } catch (error) {
        site = '';
      }
    }
    try {
      return site ? new URL(String(site), location.origin).pathname.replace(/\/+$/, '') : '';
    } catch (error) {
      return '';
    }
  }

  // A root-relative path, moved under the current website. Other links,
  // and paths already under it, are left as they are.
  function websitePath(path) {
    const root = websiteRoot();
    const value = String(path || '');
    if (!root || !/^\/(?!\/)/.test(value)) {
      return value;
    }
    const lower = value.toLowerCase();
    const rootLower = root.toLowerCase();
    if (lower === rootLower || lower.startsWith(rootLower + '/')) {
      return value;
    }
    return root + value;
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

  // The flow's messages link the case root-relative. Whenever BeyondFormz
  // writes one in, move its links under the current website.
  function fixMessageLinks() {
    message.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const fixed = websitePath(href);
      if (fixed !== href) {
        link.setAttribute('href', fixed);
      }
    });
  }

  if (message) {
    new MutationObserver(fixMessageLinks).observe(message, {childList: true, subtree: true});
  }

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

  /* After Create case, how many fields still need filling in: the fields
     showing an error, and the staff group (one field; Lead staff is where
     it is fixed). It goes down as each is filled, and goes once none are
     left. Only called while errors from Create are showing. */
  function showMissingCount() {
    const count = form.querySelectorAll('[aria-invalid=true]').length + (staffMissed ? 1 : 0);
    if (!count) {
      setMessage('');
    } else {
      setMessage(count === 1 ? 'One field needs filling in.' : count + ' fields need filling in.', 'danger');
    }
  }

  /* Required fields that are shown and editable, and empty. An Individual
     case also needs someone on it (nobodyOnIt), which the staff group's
     message answers rather than a field's error. */
  function missingFields() {
    const missing = [...form.querySelectorAll('[required]')].filter(el => {
      if (el.disabled || el.type === 'hidden') {
        return false;
      }
      const field = el.closest('.form-group');
      if (!field || field.hidden || field.offsetParent === null) {
        return false;
      }
      return !hasValue(el);
    });
    return missing;
  }

  // An Individual case with no lead and Assign me not ticked.
  function nobodyOnIt() {
    return access.value === 'Individual' && !hasValue(lead) && !assignMeBox.checked;
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

  /* No member on the page (no ID in the address): a case needs one, so the
     form says where to start instead, and Create case cannot be pressed
     (owner, 29 October 2026). The create flow refuses one too. */
  const noMember = String((control('MemberID') || {}).value || '').trim() === '';
  const noMemberNote = document.createElement('p');
  noMemberNote.className = 'us-bf-warning';
  noMemberNote.id = 'us-bf-no-member';
  noMemberNote.setAttribute('role', 'status');
  noMemberNote.innerHTML = '<i class="ti ti-alert-triangle" aria-hidden="true"></i><span>No member is chosen, so a case cannot be created here. ' +
    'Open the member\'s profile and use Create case on their Cases list.</span>';
  noMemberNote.hidden = !noMember;
  if (title) {
    forLine.after(noMemberNote);
  }

  // Only for the member the page names (its ID): an older prefill, asked
  // with no ID, sent back the first contact it found (owner, 29 October 2026).
  function drawMember(member) {
    const pageMember = String((control('MemberID') || {}).value || '').trim();
    if (!member || !member.Name || pageMember === '' || String(member.ID || '').trim() !== pageMember) {
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
    const by = note ? [fullDate(note.CreatedOn), note.CreatedBy].filter(Boolean).join(' · ') : '';
    origin.innerHTML = '<span class="us-bf-origin__head">From a note' + (by ? ', ' + escapeHtml(by) : '') +
      '. It will be linked to this case.</span><span class="us-bf-origin__text">' + escapeHtml(text) + '</span>';
    origin.hidden = false;
  }

  /* ---------- Sections ---------- */

  form.querySelectorAll('h3').forEach(heading => heading.classList.add('us-bf-section'));

  /* ---------- Searchable lists ---------- */

  // A single list (Lead staff, Workplace) opens with the cursor in its
  // search box, so typing filters at once (owner, 2 November 2026: on the
  // dev tenant a second click was needed to search).
  $(form).on('select2:open', () => {
    setTimeout(() => {
      const search = document.querySelector('.select2-container--open .select2-search--dropdown .select2-search__field');
      if (search) {
        search.focus();
      }
    }, 0);
  });

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

  /* Every subtype a new case can take, as {value, label, ParentTag}, from
     the subtypes IQA's rows. A disabled tag (TagStatus false) stays on the
     cases that have it but is not offered here: a new case has none yet. */
  function setSubTypes(rows) {
    allSubTypes = (Array.isArray(rows) ? rows : [])
      .filter(row => row.TagStatus !== false && String(row.TagStatus).toLowerCase() !== 'false')
      .map(row => ({value: row.Ordinal, label: row.TagName, ParentTag: row.ParentTagOrdinal}))
      .filter(row => row.value != null && row.label != null && row.ParentTag != null);
    refreshSubTypes();
  }

  // Read once, as the script starts: Subtype stays closed until a type is
  // chosen, so nothing waits for it.
  function loadSubTypes() {
    const token = document.getElementById('__RequestVerificationToken');
    const search = new URLSearchParams({QueryName: SUBTYPES_QUERY, ParentTagOrdinal: '', limit: '500'});
    fetch('/api/query?' + search, {
      credentials: 'same-origin',
      headers: {Accept: 'application/json', RequestVerificationToken: token ? token.value : ''}
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(data => {
        const rows = (data && data.Items && data.Items.$values) || [];
        if (!rows.length) {
          console.warn('Create case: the subtypes IQA returned no rows, so Subtype has nothing to show.');
        }
        setSubTypes(rows);
      })
      .catch(error => console.warn('Create case: the subtypes IQA failed (' + error.message + '), so Subtype has nothing to show.'));
  }

  /* ---------- Workplace ---------- */

  const workplace = control('PrimaryWorkplaceID');
  const workplaceField = wrapper('PrimaryWorkplaceID');
  if (workplaceField) {
    // No options until the prefill brings jobs: an empty list sends nothing.
    workplace.innerHTML = '';
    workplaceField.hidden = true;
  }

  /* Dates show in the website's iMIS culture (gCurrentCultureCode, set per
     website), so a US client's site shows US dates (owner, 4 November
     2026). Without one, en-AU. The form runs without the theme, so this is
     its own copy of US-DATE-LOCALE in zUnionSuite.js. */
  function dateLocale() {
    const culture = String(window.gCurrentCultureCode || '').trim();
    try {
      if (culture && Intl.DateTimeFormat.supportedLocalesOf(culture).length) {
        return culture;
      }
    } catch (error) {
      // An invalid code: fall back.
    }
    return 'en-AU';
  }

  // Whether the website writes the month before the day (en-US: 11/4/2026).
  function monthFirst() {
    const parts = new Intl.DateTimeFormat(dateLocale()).formatToParts(new Date(2026, 10, 4));
    const order = parts.map(part => part.type);
    return order.indexOf('month') < order.indexOf('day');
  }

  // A date from ISO, or as iMIS writes it in the website's order
  // (d/MM/yyyy, or M/d/yyyy on a US site). Null when it isn't one.
  function readDate(value) {
    const raw = String(value ?? '').trim();
    const local = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (local) {
      const [day, month] = monthFirst() ? [+local[2], +local[1]] : [+local[1], +local[2]];
      return new Date(+local[3], month - 1, day);
    }
    // A date alone (2026-11-04) is the local day, not UTC midnight.
    const isoDay = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = isoDay ? new Date(+isoDay[1], +isoDay[2] - 1, +isoDay[3]) : new Date(raw);
    return raw && !isNaN(date) ? date : null;
  }

  // A date as month and year; other text as it is.
  function monthYear(value) {
    const raw = String(value ?? '').trim();
    const date = readDate(raw);
    return date ? date.toLocaleDateString(dateLocale(), {month: 'short', year: 'numeric'}) : raw;
  }

  // A date as day, month and year; other text (an older flow's
  // "4 Nov 2026") as it is.
  function fullDate(value) {
    const raw = String(value ?? '').trim();
    const date = readDate(raw);
    return date ? date.toLocaleDateString(dateLocale(), {day: 'numeric', month: 'short', year: 'numeric'}) : raw;
  }

  // A column by any of its names, whatever its case, spaces, underscores or
  // hyphens, as the case page's jobs IQA is read (Workplace Name,
  // WorkplaceName).
  function column(row, ...names) {
    const key = name => String(name).replace(/[\s_-]/g, '').toLowerCase();
    const wanted = names.map(key);
    const found = Object.keys(row).find(name => wanted.indexOf(key(name)) !== -1);
    return found === undefined || row[found] == null ? '' : String(row[found]).trim();
  }

  /* One job, as the jobs IQA returns it: the columns of the case page's
     API - Manage Case - Primary Contacts Workplaces. */
  function job(row) {
    const status = column(row, 'Member Job Status', 'Status') || 'Active';
    const start = monthYear(column(row, 'Job Start Date', 'Start'));
    const end = monthYear(column(row, 'Job End Date', 'End'));
    const group = /finish|former/i.test(status) ? 'former' : /not started/i.test(status) ? 'upcoming' : 'current';
    const dates = group === 'former'
      ? [start, end].filter(Boolean).join(' – ')
      : group === 'upcoming' ? (start ? 'Starts ' + start : '') : (start ? 'Since ' + start : '');
    const employer = [column(row, 'Work-Employer', 'Employer'), column(row, 'Work-Classification', 'Classification')].filter(Boolean);
    const about = employer.length ? employer : [column(row, 'Workplace Type')].filter(Boolean);
    return {
      group,
      id: column(row, 'Workplace ID', 'WorkplaceID', 'ID'),
      text: column(row, 'Workplace Name', 'Workplace'),
      line: [...about, dates].filter(Boolean).join(' · ')
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

  /* ---------- Lead staff, Assign me, and Priority ---------- */

  const lead = control('CaseStaffMembers');
  const leadField = wrapper('CaseStaffMembers');
  const me = signedInPartyId();
  const leadOptions = {width: '100%', placeholder: 'No lead yet', allowClear: true};

  $(lead).select2(leadOptions);

  // Lead staff starts empty (owner, 29 October 2026). The signed-in user is
  // marked "(you)" in the list; Select2 copies each option's text once, so
  // the mark goes in before the list is drawn again.
  whenFilled(lead, () => {
    // An empty, disabled first option: a lead left empty is not sent, which
    // the create flow reads as "no lead".
    $(lead).find('option[value=""]').remove();
    $(lead).prepend('<option value="" disabled></option>');
    const mine = me && lead.querySelector('option[value="' + me + '"]');
    if (mine && !/\(you\)$/.test(mine.textContent)) {
      mine.textContent += ' (you)';
    }
    $(lead).select2('destroy');
    $(lead).select2(leadOptions);
    $(lead).val('').trigger('change');
  });

  /* "Assign me to this case" (owner, 29 October 2026): adds the signed-in
     user to the case's staff with no type. A field this script adds, which
     BeyondFormz sends with the rest (AssignMe=1 when ticked; nothing when
     not). Shown while the lead is empty or someone else. */
  // A div around the label: the theme styles a field's own label (a label
  // straight inside .form-group) as its heading.
  const assignMe = document.createElement('div');
  assignMe.className = 'us-bf-check';
  assignMe.innerHTML = '<label><input type="checkbox" name="AssignMe" value="1"><span>Assign me to this case</span></label>';
  const assignMeBox = assignMe.querySelector('input');
  leadField.appendChild(assignMe);

  function showAssignMe() {
    const show = me !== '' && $(lead).val() !== me;
    if (show) {
      assignMe.removeAttribute('data-closed');
    } else {
      assignMe.setAttribute('data-closed', '');
      assignMeBox.checked = false;
    }
    assignMeBox.disabled = !show;
  }

  $(lead).on('change', showAssignMe);
  showAssignMe();

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
    updateAccessWarning();
  }

  /* Individual with nobody on the case (owner, 29 October 2026): a warning
     as soon as it is chosen, not only when Create case is pressed. It goes
     once a lead is chosen or Assign me ticked, and comes back if both are
     undone. One message, not a field error as well (owner, 2 November
     2026): Create case with nobody on it turns the same line red. */
  const accessWarning = document.createElement('p');
  accessWarning.className = 'us-bf-warning';
  accessWarning.id = 'CaseAccessLevel-warning';
  accessWarning.setAttribute('role', 'status');
  accessWarning.setAttribute('data-closed', '');

  /* On an Individual case, Lead staff and Assign me are framed as one
     group, titled "Staff on this case * (one of)", with the warning inside
     it: the requirement is the pair's, not either field's (owner,
     2 November 2026). Marks only: the check on Create decides. */
  const leadRow = leadField.closest('.row') || leadField;
  const staffGroup = document.createElement('div');
  staffGroup.className = 'us-bf-staff';
  staffGroup.setAttribute('role', 'group');
  staffGroup.setAttribute('aria-labelledby', 'us-bf-staff-title');
  staffGroup.innerHTML = '<p class="us-bf-staff__title" id="us-bf-staff-title" data-closed>Staff on this case' +
    '<span class="formbuilder-required">*</span><span class="us-bf-optional">(one of)</span></p>';
  leadRow.before(staffGroup);
  staffGroup.append(leadRow, accessWarning);
  const staffOneOf = staffGroup.querySelector('.us-bf-optional');

  // Set when Create case is pressed with nobody on the case; cleared once
  // someone is.
  let staffMissed = false;

  function updateAccessWarning() {
    const individual = access.value === 'Individual';
    // Lead staff is not "(optional)" on an Individual case. markOptional
    // adds the mark after the prefill, so it is looked up each time.
    const leadOptional = leadField.querySelector(':scope > label .us-bf-optional');
    staffGroup.toggleAttribute('data-required', individual);
    staffGroup.querySelector('.us-bf-staff__title').toggleAttribute('data-closed', !individual);
    // With Assign me not offered, Lead staff is the only way on.
    staffOneOf.hidden = assignMeBox.disabled;
    if (leadOptional) {
      leadOptional.hidden = individual;
    }
    // The title and the hint above say why; the line says only what to do.
    if (nobodyOnIt()) {
      const ask = assignMeBox.disabled ? 'Choose a lead staff member.' : 'Choose a lead staff member or tick Assign me.';
      const icon = staffMissed ? 'ti-alert-circle' : 'ti-alert-triangle';
      accessWarning.innerHTML = '<i class="ti ' + icon + '" aria-hidden="true"></i><span>' + escapeHtml(ask) + '</span>';
      accessWarning.toggleAttribute('data-error', staffMissed);
      accessWarning.removeAttribute('data-closed');
      group.setAttribute('aria-describedby', accessHint.id + ' ' + accessWarning.id);
    } else {
      accessWarning.setAttribute('data-closed', '');
      group.setAttribute('aria-describedby', accessHint.id);
      if (staffMissed) {
        staffMissed = false;
        showMissingCount();
      }
    }
  }

  $(lead).on('change', updateAccessWarning);
  assignMeBox.addEventListener('change', updateAccessWarning);

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

  // No later than today: the picker greys out the days after it. Under the
  // field, quick dates as the task form draws them (UnionSuiteForms.js
  // dateHtml): Today, and Clear date while there is a date.
  const incident = control('DateIncident');
  if (incident) {
    const today = () => new Date().toLocaleDateString('en-CA');
    incident.max = today();

    const quick = document.createElement('div');
    quick.className = 'us-bf-quick';
    quick.setAttribute('role', 'group');
    quick.setAttribute('aria-label', 'Quick dates');
    quick.innerHTML =
      '<button type="button" data-us-today>Today</button>' +
      '<button type="button" class="us-bf-quiet" data-us-clear-date hidden><i class="ti ti-x" aria-hidden="true"></i> Clear date</button>';
    incident.after(quick);

    const clear = quick.querySelector('[data-us-clear-date]');
    const syncClear = () => {
      clear.hidden = !incident.value;
    };

    quick.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) {
        return;
      }
      incident.value = button.hasAttribute('data-us-today') ? today() : '';
      // Native events, so jQuery's handlers and plain listeners both hear.
      incident.dispatchEvent(new Event('input', {bubbles: true}));
      incident.dispatchEvent(new Event('change', {bubbles: true}));
    });
    incident.addEventListener('input', syncClear);
    incident.addEventListener('change', syncClear);
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

  /* Names of what was chosen, for the change log only: the create flow
     logs "Discrimination" rather than 60. Fields this script adds, sent
     with the rest. */
  function stampNames() {
    const chosenText = select => [...select.selectedOptions].map(option => option.textContent.replace(/ \(you\)$/, '')).join(', ');
    const mine = me && lead.querySelector('option[value="' + me + '"]');
    const names = {
      CaseTypeNames: chosenText(types),
      CaseSubTypeNames: chosenText(subTypes),
      LeadStaffName: hasValue(lead) ? chosenText(lead) : '',
      AssignMeName: assignMeBox.checked && mine ? mine.textContent.replace(/ \(you\)$/, '') : '',
      WorkplaceName: workplace && hasValue(workplace) ? chosenText(workplace) : '',
      PriorityName: priority ? chosenText(priority) : ''
    };
    Object.keys(names).forEach(name => {
      let field = form.querySelector('input[type=hidden][name="' + name + '"]');
      if (!field) {
        field = document.createElement('input');
        field.type = 'hidden';
        field.name = name;
        form.appendChild(field);
      }
      field.value = names[name];
    });
  }

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

  // Without a member, Create case stays unavailable, saying why.
  if (noMember) {
    createButton.disabled = true;
    createButton.setAttribute('aria-describedby', noMemberNote.id);
    createButton.title = 'Open Create case from a member\'s profile';
  }

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
      createButton.disabled = on || noMember;
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
    if (saving || noMember) {
      stop();
      return;
    }

    form.querySelectorAll('[aria-invalid=true]').forEach(clearError);
    const missing = missingFields();
    staffMissed = nobodyOnIt();
    updateAccessWarning();
    if (missing.length || staffMissed) {
      stop();
      missing.forEach(el => showError(el, MISSING[fieldName(el)] || 'Fill this in.'));
      showMissingCount();
      const first = missing[0] || lead;
      if ($(first).data('select2')) {
        $(first).select2('open');
      } else {
        first.focus();
      }
      return;
    }

    setMessage('');
    stampCurrentDate();
    stampNames();
    busy(true);
  }, true);

  // A field clears its error as soon as it has a value.
  $(form).on('input change', 'input, select, textarea', event => {
    const el = event.target;
    if (el.getAttribute('aria-invalid') === 'true' && hasValue(el)) {
      clearError(el);
      showMissingCount();
    }
  });

  /* The create flow's answer. {CaseID, CaseNum}, or the old flow's message
     with the case link: either way, open the case. Error (nothing saved) and
     Partial (saved, with a step missing; its message links the case) stay
     on the form with the flow's message, which BeyondFormz has written in. */
  function created(answer) {
    const data = parse(answer) || {};
    const html = String(data['class-html-Message'] || '');
    if (data.Error || data.Partial) {
      busy(false);
      if (message) {
        message.dataset.tone = 'danger';
      }
      if (!html) {
        setMessage("The case wasn't created. Try again; if it keeps happening, contact an administrator.", 'danger');
      }
      return;
    }
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

    url = websitePath(url);
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
    const member = parse(data.Member) || {};
    // Jobs belong to the page's member; without one there are none to show.
    if (!noMember) {
      setWorkplaces(parse(data.Workplaces), member.Name);
    }
    // markOptional has just added Lead staff's "(optional)".
    updateAccessWarning();
    prefilled = true;
    revealWhenReady();
  }

  /* ---------- Start ---------- */

  form.setAttribute('data-us-loading', '');
  revealTimer = setTimeout(() => {
    markOptional();
    updateAccessWarning();
    revealForm();
  }, SHOW_ANYWAY_AFTER);
  loadSubTypes();

  window.usCreateCase = {prefill, created};

  // Answers that arrived before this script ran.
  if (window.usCreateCasePending) {
    prefill(window.usCreateCasePending);
    delete window.usCreateCasePending;
  }
})();
