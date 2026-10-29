/* Create case form, mock-up behaviour.

   Two parts:
   - PREVIEW: the toolbar and the sample answers the Create-Prefill flow
     would give. Mock-up only.
   - FORM: what the BeyondFormz form's injected script would do with them
     (Select2 lists, subtype filter, workplace list, Access buttons, hints,
     the check on Create and the busy button). The real script would read
     the prefill's `data` in the autoexecute field's JavaScript; here it
     reads SAMPLE. */

(function () {
  'use strict';

  /* ---------- PREVIEW: state and toolbar ---------- */

  const params = new URLSearchParams(location.search);

  function pick(name, values) {
    const value = params.get(name);
    return values.includes(value) ? value : values[0];
  }

  const state = {
    jobs: pick('jobs', ['several', 'one', 'none']),
    standing: pick('standing', ['financial', 'new', 'unfinancial']),
    from: pick('from', ['member', 'note']),
    save: pick('save', ['ok', 'fail']),
    scheme: pick('scheme', ['light', 'dark'])
  };

  document.querySelectorAll('[data-control]').forEach(group => {
    const name = group.dataset.control;
    group.querySelectorAll('button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.value === state[name]));
      button.addEventListener('click', () => {
        if (name === 'scheme') {
          state.scheme = button.dataset.value;
          applyScheme();
          group.querySelectorAll('button').forEach(other => {
            other.setAttribute('aria-pressed', String(other === button));
          });
        }
        params.set(name, button.dataset.value);
        if (name === 'scheme') {
          history.replaceState(null, '', '?' + params);
        } else {
          location.search = params;
        }
      });
    });
  });

  function applyScheme() {
    document.documentElement.setAttribute('data-us-color-scheme', state.scheme);
  }

  applyScheme();

  /* ---------- PREVIEW: what Create-Prefill would return ---------- */

  const JOBS = {
    several: [
      {WorkplaceID: '4101', Workplace: 'Dandenong DC – night shift', Employer: 'Northside Distribution Pty Ltd', Classification: 'Storeperson Grade 2', Status: 'Active', Start: 'Mar 2020', End: ''},
      {WorkplaceID: '4120', Workplace: 'Frankston Hospital – catering', Employer: 'Bayside Health', Classification: 'Food services assistant', Status: 'Active', Start: 'Aug 2023', End: ''},
      {WorkplaceID: '4133', Workplace: 'Clayton DC – day shift', Employer: 'Northside Distribution Pty Ltd', Classification: 'Team leader', Status: 'Not Started', Start: 'Nov 2026', End: ''},
      {WorkplaceID: '3870', Workplace: 'Westgate Cold Storage – Laverton', Employer: 'Westgate Logistics Pty Ltd', Classification: 'Storeperson Grade 1', Status: 'Finished', Start: 'Mar 2016', End: 'Jan 2019'}
    ],
    one: [
      {WorkplaceID: '4101', Workplace: 'Dandenong DC – night shift', Employer: 'Northside Distribution Pty Ltd', Classification: 'Storeperson Grade 2', Status: 'Active', Start: 'Mar 2020', End: ''}
    ],
    none: []
  };

  const STANDING = {
    financial: {badge: '', tone: '', note: ''},
    new: {badge: 'New member', tone: 'warning', note: ''},
    unfinancial: {badge: 'Unfinancial', tone: 'danger', note: 'Paid to 30 June 2026.'}
  };

  const SAMPLE = {
    member: {ID: '20544', Name: 'Priya Natarajan', MemberType: 'Full member', ...STANDING[state.standing]},
    me: {ID: '23264', Name: "Mary O'Conner"},
    note: state.from === 'note'
      ? {Ordinal: '8812', CreatedOn: '28 Oct 2026', CreatedBy: "Mary O'Conner",
         Note: 'Priya called about her night shift supervisor. He has made comments about her accent in front of the team three times since July, and last week moved her onto the loading dock without notice. She wants it to stop and to go back to her usual duties.'}
      : null,
    workplaces: JOBS[state.jobs],
    types: [
      {value: '69', label: 'Bullying / Harassment'},
      {value: '60', label: 'Discrimination'},
      {value: '64', label: 'Dismissal'},
      {value: '71', label: 'Grievance'},
      {value: '70', label: 'Insurance'}
    ],
    subTypes: [
      {value: '201', label: 'Verbal', ParentTag: '69'},
      {value: '202', label: 'Online', ParentTag: '69'},
      {value: '203', label: 'Physical', ParentTag: '69'},
      {value: '211', label: 'Race', ParentTag: '60'},
      {value: '212', label: 'Age', ParentTag: '60'},
      {value: '213', label: 'Disability', ParentTag: '60'},
      {value: '214', label: 'Sex or gender', ParentTag: '60'},
      {value: '221', label: 'Unfair dismissal', ParentTag: '64'},
      {value: '222', label: 'Redundancy', ParentTag: '64'}
    ],
    staff: [
      {value: '23264', label: "Mary O'Conner"},
      {value: '23283', label: 'Andrew Newnham'},
      {value: '104114', label: 'Ash Hunt'},
      {value: '18099', label: 'Brooke McCormac'},
      {value: '103817', label: 'Christina Zerk'},
      {value: '103910', label: 'Peter Williams'}
    ],
    priorities: [
      {value: '1', label: 'Lowest'},
      {value: '2', label: 'Low'},
      {value: '3', label: 'Normal'},
      {value: '4', label: 'High'},
      {value: '5', label: 'Highest'},
      {value: '6', label: 'Critical'}
    ]
  };

  /* ---------- FORM ---------- */

  const $ = window.jQuery;
  const form = document.querySelector('[data-beyondformid] .rendered-form');
  const message = form.querySelector('.Message');
  const createButton = form.querySelector('#CreateCaseButton');

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
  }

  function fillOptions(select, options) {
    select.innerHTML = options
      .map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
      .join('');
  }

  function addHint(field, text) {
    const hint = document.createElement('p');
    hint.className = 'us-bf-hint';
    hint.textContent = text;
    field.appendChild(hint);
    return hint;
  }

  /* Who the case is for, and the note it starts from. Create-Prefill
     returns both as class-html-* values; BeyondFormz writes them in. */
  function renderFor() {
    const member = SAMPLE.member;
    const badge = member.badge
      ? ` <span class="us-badge us-badge--${member.tone}">${escapeHtml(member.badge)}</span>`
      : '';
    const note = member.note
      ? `<span class="us-bf-for__note">${escapeHtml(member.note)}</span>`
      : '';
    form.querySelector('[data-cc-for]').innerHTML =
      `<span>For</span> <strong>${escapeHtml(member.Name)}</strong>` +
      `<span>· Member ${escapeHtml(member.ID)} · ${escapeHtml(member.MemberType)}</span>${badge}${note}`;

    const origin = form.querySelector('[data-cc-origin]');
    if (SAMPLE.note) {
      origin.innerHTML =
        `<span class="us-bf-origin__head">From a note, ${escapeHtml(SAMPLE.note.CreatedOn)} · ${escapeHtml(SAMPLE.note.CreatedBy)}. It will be linked to this case.</span>` +
        `<span class="us-bf-origin__text">${escapeHtml(SAMPLE.note.Note)}</span>`;
      origin.hidden = false;
      form.querySelector('#CaseDescription').value = SAMPLE.note.Note;
      form.querySelector('#NoteOrdinal').value = SAMPLE.note.Ordinal;
    }
  }

  /* Type and Subtype. Subtype is filtered from the prefill's full list by
     the chosen types, keeps what was picked under a type still chosen, and
     shows only when there is something to pick. */
  function setUpTypes() {
    const types = form.querySelector('#CaseTypes');
    const subTypes = form.querySelector('#CaseSubTypes');
    const subField = subTypes.closest('.form-group');

    fillOptions(types, SAMPLE.types);
    $(types).select2({width: '100%', placeholder: 'Choose one or more'});
    $(subTypes).select2({width: '100%', placeholder: 'Choose any that apply'});

    function refreshSubTypes() {
      const chosen = $(types).val() || [];
      const kept = $(subTypes).val() || [];
      const options = SAMPLE.subTypes.filter(option => chosen.includes(option.ParentTag));

      fillOptions(subTypes, options);
      $(subTypes).val(kept.filter(value => options.some(option => option.value === value)));
      $(subTypes).trigger('change.select2');

      if (options.length) {
        subField.removeAttribute('data-closed');
      } else {
        subField.setAttribute('data-closed', '');
      }
    }

    $(types).on('change', refreshSubTypes);
    refreshSubTypes();
  }

  /* Workplace: the member's jobs grouped by standing, each with its
     employer, classification and dates, then "Not about a workplace".
     One current job is chosen; with several, none is. No jobs: no field. */
  function setUpWorkplace() {
    const select = form.querySelector('#PrimaryWorkplaceID');
    const field = select.closest('.form-group');
    const jobs = SAMPLE.workplaces;

    if (!jobs.length) {
      field.hidden = true;
      return;
    }

    function job(entry) {
      const dates = entry.Status === 'Finished'
        ? `${entry.Start} – ${entry.End}`
        : entry.Status === 'Not Started' ? `Starts ${entry.Start}` : `Since ${entry.Start}`;
      return {
        id: entry.WorkplaceID,
        text: entry.Workplace,
        line: `${entry.Employer} · ${entry.Classification} · ${dates}`
      };
    }

    const groups = [
      ['Current jobs', 'Active'],
      ['Not started', 'Not Started'],
      ['Former jobs', 'Finished']
    ]
      .map(([text, status]) => ({text, children: jobs.filter(entry => entry.Status === status).map(job)}))
      .filter(group => group.children.length);

    const data = [{id: '', text: ''}, ...groups, {id: '0', text: 'Not about a workplace', line: ''}];

    function drawOption(item) {
      if (!item.id || !item.line) {
        return item.text;
      }
      return $(`<span><span class="cc-option__name">${escapeHtml(item.text)}</span><span class="cc-option__line">${escapeHtml(item.line)}</span></span>`);
    }

    $(select).select2({
      width: '100%',
      data,
      placeholder: 'Choose the job this case is about',
      allowClear: true,
      templateResult: drawOption
    });

    const current = jobs.filter(entry => entry.Status === 'Active');
    $(select).val(current.length === 1 ? current[0].WorkplaceID : '').trigger('change');

    const first = SAMPLE.member.Name.split(' ')[0];
    addHint(field, jobs.length > 1
      ? `${first}'s jobs. You can change it later on the case.`
      : `${first}'s only job. You can change it later on the case.`);
  }

  /* Lead staff starts as the signed-in user; Priority starts at Normal. */
  function setUpHandling() {
    const lead = form.querySelector('#CaseStaffMembers');
    fillOptions(lead, [{value: '', label: ''}, ...SAMPLE.staff.map(person => ({
      value: person.value,
      label: person.value === SAMPLE.me.ID ? `${person.label} (you)` : person.label
    }))]);
    $(lead).select2({width: '100%', placeholder: 'No lead yet', allowClear: true});
    $(lead).val(SAMPLE.me.ID).trigger('change');

    const priority = form.querySelector('#CasePriority');
    fillOptions(priority, SAMPLE.priorities);
    priority.value = '3';
  }

  /* Who can see it: the Access select drawn as three buttons (a radio
     group), with a line saying what the choice means. Individual makes the
     lead required. */
  function setUpAccess() {
    const select = form.querySelector('#CaseAccessLevel');
    const field = select.closest('.form-group');
    const leadRequired = form.querySelector('[data-cc-lead-required]');
    const leadOptional = form.querySelector('[data-cc-lead-optional]');

    const CHOICES = {
      Open: {icon: 'ti-world', hint: 'All staff can see it.'},
      Team: {icon: 'ti-users', hint: 'Only the Case Team can see it. Managers see every case.'},
      Individual: {icon: 'ti-lock', hint: 'Only staff on this case can see it. Managers see every case.'}
    };

    const group = document.createElement('div');
    group.className = 'us-bf-segmented';
    group.setAttribute('role', 'radiogroup');
    group.setAttribute('aria-labelledby', 'CaseAccessLevel-label');

    const buttons = [...select.options].map(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.dataset.value = option.value;
      button.innerHTML = `<i class="ti ${CHOICES[option.value].icon}" aria-hidden="true"></i>${escapeHtml(option.text)}`;
      group.appendChild(button);
      return button;
    });

    field.appendChild(group);
    const hint = addHint(field, '');
    hint.id = 'CaseAccessLevel-hint';
    group.setAttribute('aria-describedby', hint.id);

    function choose(value, focus) {
      select.value = value;
      buttons.forEach(button => {
        const on = button.dataset.value === value;
        button.setAttribute('aria-checked', String(on));
        button.tabIndex = on ? 0 : -1;
        if (on && focus) {
          button.focus();
        }
      });
      hint.textContent = CHOICES[value].hint;
      const individual = value === 'Individual';
      leadRequired.hidden = !individual;
      leadOptional.hidden = individual;
      if (!individual) {
        clearError(form.querySelector('#CaseStaffMembers'));
      }
    }

    group.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) {
        choose(button.dataset.value, false);
      }
    });

    group.addEventListener('keydown', event => {
      const step = {ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1}[event.key];
      if (!step) {
        return;
      }
      event.preventDefault();
      const index = buttons.findIndex(button => button.dataset.value === select.value);
      const next = buttons[(index + step + buttons.length) % buttons.length];
      choose(next.dataset.value, true);
    });

    choose(select.value || 'Open', false);
  }

  /* Checks on Create: each missing field says what it needs, the first
     takes focus. Fields clear their error as soon as they change. */
  const CHECKS = [
    {id: 'CaseName', message: 'Give the case a title.', missing: el => !el.value.trim()},
    {id: 'CaseTypes', message: 'Choose at least one type.', missing: el => !($(el).val() || []).length},
    {id: 'CaseDescription', message: 'Say what happened.', missing: el => !el.value.trim()},
    {id: 'CaseStaffMembers', message: 'Choose a lead: an Individual case is seen only by its staff.',
      missing: el => form.querySelector('#CaseAccessLevel').value === 'Individual' && !el.value}
  ];

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
    error.innerHTML = `<i class="ti ti-alert-circle" aria-hidden="true"></i>${escapeHtml(text)}`;
  }

  function clearError(el) {
    const field = el.closest('.form-group');
    field.classList.remove('us-bf-invalid');
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
    field.querySelector('.us-bf-error')?.remove();
  }

  function focusField(el) {
    if ($(el).data('select2')) {
      $(el).select2('open');
    } else {
      el.focus();
    }
  }

  function setMessage(text, tone) {
    message.textContent = text || ' ';
    if (tone) {
      message.dataset.tone = tone;
    } else {
      delete message.dataset.tone;
    }
  }

  CHECKS.forEach(check => {
    const el = form.querySelector('#' + check.id);
    $(el).on('input change', () => {
      if (el.hasAttribute('aria-invalid') && !check.missing(el)) {
        clearError(el);
        if (!form.querySelector('[aria-invalid=true]')) {
          setMessage('');
        }
      }
    });
  });

  function busy(on) {
    createButton.disabled = on;
    form.querySelector('#CancelButton').disabled = on;
    createButton.setAttribute('aria-busy', String(on));
    createButton.innerHTML = on
      ? '<span class="us-button-spinner" aria-hidden="true"></span>Creating case…'
      : 'Create case';
  }

  function payload() {
    const values = {};
    form.querySelectorAll('[name]').forEach(el => {
      if (el.tagName === 'BUTTON') {
        return;
      }
      values[el.name] = el.multiple ? ($(el).val() || []).join(',') : el.value;
    });
    return values;
  }

  createButton.addEventListener('click', () => {
    const missing = CHECKS
      .map(check => ({check, el: form.querySelector('#' + check.id)}))
      .filter(({check, el}) => check.missing(el));

    CHECKS.forEach(check => clearError(form.querySelector('#' + check.id)));

    if (missing.length) {
      missing.forEach(({check, el}) => showError(el, check.message));
      setMessage(missing.length === 1 ? 'One field needs filling in.' : `${missing.length} fields need filling in.`, 'danger');
      focusField(missing[0].el);
      return;
    }

    setMessage('');
    busy(true);
    form.querySelector('#CurrentDate').value = new Date().toISOString().slice(0, 16);

    const sent = document.querySelector('[data-cc-sent]');
    document.querySelector('[data-cc-sent-body]').textContent = JSON.stringify(payload(), null, 2);
    sent.hidden = false;

    setTimeout(() => {
      if (state.save === 'fail') {
        busy(false);
        setMessage("The case wasn't created. Try again; if it keeps happening, contact an administrator.", 'danger');
        return;
      }
      createButton.innerHTML = '<span class="us-button-spinner" aria-hidden="true"></span>Opening case…';
      setMessage('Case C231 created. On the live page it opens now.');
    }, 1200);
  });

  form.querySelector('#CancelButton').addEventListener('click', () => {
    setMessage(`Cancel goes back to ${SAMPLE.member.Name}'s page.`);
  });

  /* Footer and dates. */
  const today = new Date().toLocaleDateString('en-CA');
  form.querySelector('#DateIncident').max = today;

  renderFor();
  setUpTypes();
  setUpWorkplace();
  setUpHandling();
  setUpAccess();
})();
