/* Resolve case form: the form's "JavaScript to inject".

   Maintained here; build-form.cjs writes it into the BeyondFormz export.
   Do not edit the copy in BeyondFormz without bringing the change back.

   One form resolves a case and edits its resolution (owner, 16 November
   2026; the mock-up is ../resolve-case-form.html). The theme opens it as
   /Cases_ResolveCase?CaseID=C49&CaseNum=48, adding &OpenTasks=2 when tasks
   are still open, or &Edit=true from Edit resolution. This script:
   - shows the form once the prefill answers, so nothing changes in view;
   - applies the FormFields rules the prefill returns (ReqVals: Visible 0
     hides a field, IsRequired marks it, Editable 0 disables it). Fields
     without a rule stay as built: Outcome type and Closed date required;
   - fills Status with the closed statuses the prefill sends (owner,
     17 November 2026): with several it shows, required (the current one
     chosen when editing); with one or none it stays hidden and sends that
     one, or Complete;
   - draws the case line, and the open-tasks warning when resolving;
   - starts Closed date as today (not in the future, not before the case
     opened), with Today and Yesterday;
   - shows Amount awarded with $ and Time awarded with weeks, empty rather
     than 0.000000000000, and sends them as plain numbers (blank: nothing);
   - in edit mode, puts the prefill's values in, says who resolved it, and
     names the button Save changes;
   - checks the form when the button is pressed, before BeyondFormz sends
     anything, and closes the popup once it saved: {saved: true, Ordinal}
     (Cancel or Esc: {cancel: true}). Ctrl+Enter saves.

   The field scripts hand their answers to window.usResolveCase: the prefill
   (autoexecute) calls prefill(data), the button calls saved(data). Its
   us-bf-* classes are styled by the theme (zUnionSuite.css,
   US-BEYOND-FORMS). */

(function () {
  'use strict';

  const $ = window.jQuery;
  const button = document.getElementById('ResolveButton');

  if (!button || window.usResolveCase) {
    return;
  }

  const form = button.closest('.rendered-form');

  /* ---------- Settings ---------- */

  const MISSING = {
    Status: 'Choose the status the case closes with.',
    ResolutionType: 'Choose the outcome type.',
    ResolutionDate: 'Enter the date the case closed.'
  };
  const SHOW_ANYWAY_AFTER = 8000;
  const SAVE_TIMEOUT = 30000;
  const CLOSE_DELAY = 1200;
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

  function wrapper(name) {
    return form.querySelector('.form-group.field-' + name);
  }

  function control(name) {
    return form.querySelector('#' + name);
  }

  function param(name) {
    return String((control(name) || {}).value || '').trim();
  }

  function hasValue(el) {
    const value = $(el).val();
    return value != null && String(value).trim() !== '';
  }

  const pad = n => String(n).padStart(2, '0');
  const isoDay = date => date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  function today(offset) {
    const date = new Date();
    date.setDate(date.getDate() + (offset || 0));
    return isoDay(date);
  }
  // "2026-11-12T00:00:00" or "2026-11-12" → "2026-11-12"; anything else → "".
  function dayOf(value) {
    const match = String(value || '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : '';
  }
  function niceDay(value) {
    const day = dayOf(value);
    if (!day) {
      return String(value || '');
    }
    const [y, m, d] = day.split('-').map(Number);
    return d + ' ' + MONTHS[m - 1] + ' ' + y;
  }

  // "$4,250.00" → "4250", "2 weeks" → "2", "0.000000000000" → "" (blank:
  // nothing awarded). Anything else is left as typed for the check to name.
  function plainNumber(value) {
    const text = String(value == null ? '' : value).replace(/[$,\s]|weeks?$/gi, '');
    if (!text) {
      return '';
    }
    if (!/^\d+(\.\d+)?$/.test(text)) {
      return String(value).trim();
    }
    const number = Number(text);
    return number ? String(Math.round(number * 100) / 100) : '';
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
    const label = field.querySelector('label');
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

  /* ---------- Errors and the message ---------- */

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

  // BeyondFormz fills IQA lists after this script has run (Create case,
  // 29 October 2026), so Outcome type is set once its options are in.
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
      setTimeout(() => {
        run();
        waitingLists.delete(select);
        revealWhenReady();
      }, 0);
    });
    observer.observe(select, {childList: true});
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

  /* ---------- FormFields rules ---------- */

  function applyRules(rows) {
    const on = value => value === true || value === 1 || value === '1';
    (Array.isArray(rows) ? rows : []).forEach(row => {
      const name = row.FieldName;
      const field = wrapper(name);
      const el = control(name);
      if (!field || !el || el.type === 'hidden') {
        return;
      }
      if (row.Visible != null && !on(row.Visible)) {
        field.hidden = true;
        el.required = false;
        return;
      }
      if (row.Editable != null && !on(row.Editable)) {
        el.disabled = true;
      }
      if (on(row.IsRequired)) {
        setRequired(name, true);
      }
    });
  }

  // "(optional)" on every shown field that is not required.
  function markOptional() {
    ['ResolutionType', 'ResolutionDate', 'ResolutionAmount', 'ResolutionWeeks', 'Resolution'].forEach(name => {
      const el = control(name);
      if (el && !el.required) {
        setRequired(name, false);
      }
    });
  }

  /* ---------- Status ---------- */

  // Hidden until the prefill says which statuses close a case, still
  // sending its built-in Complete if the prefill never answers.
  const statusField = wrapper('Status');
  if (statusField) {
    statusField.hidden = true;
  }

  // The closed statuses ({Code, Description}). Several: a required list,
  // starting on "Choose the status" (or the case's own when editing). One
  // or none: hidden, sending that one or Complete; the flow decides the same
  // way, so the list only matters when there is a choice.
  function showStatuses(list, current) {
    const select = control('Status');
    if (!select || !statusField) {
      return;
    }
    const statuses = (Array.isArray(list) ? list : [])
      .map(entry => ({code: String((entry && entry.Code) || '').trim(), label: String((entry && (entry.Description || entry.Code)) || '').trim()}))
      .filter(entry => entry.code !== '');
    select.innerHTML = '';
    if (statuses.length <= 1) {
      const only = statuses[0] || {code: 'Complete', label: 'Complete'};
      select.add(new Option(only.label, only.code, true, true));
      setRequired('Status', false);
      statusField.hidden = true;
      $(select).trigger('change');
      return;
    }
    select.add(new Option('Choose the status', ''));
    statuses.forEach(entry => select.add(new Option(entry.label, entry.code)));
    const own = statuses.find(entry => entry.code.toLowerCase() === String(current || '').trim().toLowerCase());
    $(select).val(editing && own ? own.code : '').trigger('change');
    statusField.hidden = false;
    setRequired('Status', true);
  }

  /* ---------- Mode, the case line and open tasks ---------- */

  const editing = /^(true|1|yes)$/i.test(param('Edit'));
  const caseId = param('CaseID');
  const openTasks = editing ? 0 : parseInt(param('OpenTasks'), 10) || 0;
  const buttonLabel = editing ? 'Save changes' : 'Resolve case';
  button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> ' + buttonLabel;

  const caseLine = document.createElement('p');
  caseLine.className = 'us-bf-for';
  form.prepend(caseLine);

  function drawCase(memberName) {
    caseLine.innerHTML = '<i class="ti ti-briefcase" aria-hidden="true"></i><span>Case <strong>' +
      escapeHtml(caseId || '') + '</strong>' + (memberName ? ' · ' + escapeHtml(memberName) : '') + '</span>';
    caseLine.hidden = !caseId;
  }
  drawCase('');

  if (openTasks) {
    const warning = document.createElement('p');
    warning.className = 'us-bf-warning';
    warning.setAttribute('role', 'note');
    warning.innerHTML = '<i class="ti ti-alert-triangle" aria-hidden="true"></i><span><strong>' +
      (openTasks === 1 ? '1 task is' : openTasks + ' tasks are') + ' still open.</strong> ' +
      'They stay open after the case closes.</span>';
    caseLine.after(warning);
  }

  /* ---------- Closed date ---------- */

  const date = control('ResolutionDate');
  let opened = '';

  if (date) {
    date.max = today();
    if (!editing && !date.value) {
      date.value = today();
    }
    const quick = document.createElement('div');
    quick.className = 'us-bf-quick';
    quick.setAttribute('role', 'group');
    quick.setAttribute('aria-label', 'Quick dates');
    quick.innerHTML = '<button type="button" data-us-days="0">Today</button><button type="button" data-us-days="-1">Yesterday</button>';
    date.after(quick);
    quick.addEventListener('click', event => {
      const choice = event.target.closest('button');
      if (!choice) {
        return;
      }
      date.value = today(Number(choice.dataset.usDays));
      // Native events, so jQuery's handlers and plain listeners both hear.
      date.dispatchEvent(new Event('input', {bubbles: true}));
      date.dispatchEvent(new Event('change', {bubbles: true}));
    });
  }

  /* ---------- Amount and time awarded ---------- */

  // The $ before the amount and "weeks" after the time: a wrapper the
  // theme draws them in (us-bf-affix), around BeyondFormz's own input.
  function affix(name, before, after) {
    const el = control(name);
    if (!el) {
      return;
    }
    el.setAttribute('inputmode', 'decimal');
    el.setAttribute('autocomplete', 'off');
    const box = document.createElement('span');
    box.className = 'us-bf-affix';
    if (before) {
      box.dataset.before = before;
    }
    if (after) {
      box.dataset.after = after;
    }
    el.before(box);
    box.appendChild(el);
    el.value = plainNumber(el.value);
  }
  affix('ResolutionAmount', '$', '');
  affix('ResolutionWeeks', '', 'weeks');

  /* ---------- Footer: message, Cancel, the button ---------- */

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

  const resolvedLine = document.createElement('p');
  resolvedLine.className = 'us-bf-hint';
  resolvedLine.hidden = true;
  actions.before(resolvedLine);

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

  // Every shown, editable field that fails, with what it says.
  function problems() {
    const found = [];
    ['Status', 'ResolutionType', 'ResolutionDate', 'ResolutionAmount', 'ResolutionWeeks', 'Resolution'].forEach(name => {
      const el = control(name);
      const field = wrapper(name);
      if (!el || el.disabled || !field || field.hidden) {
        return;
      }
      if (el.required && !hasValue(el)) {
        found.push([el, MISSING[name] || 'Fill this in.']);
        return;
      }
      if (name === 'ResolutionDate' && el.value) {
        if (el.value > today()) {
          found.push([el, 'The closed date can’t be in the future.']);
        } else if (opened && el.value < opened) {
          found.push([el, 'The case was opened ' + niceDay(opened) + '; it can’t close before that.']);
        }
      }
      if (name === 'ResolutionAmount' && el.value && !/^\d+(\.\d{1,2})?$/.test(plainNumber(el.value) || '0')) {
        found.push([el, 'Enter an amount in dollars, such as 4250 or 4250.50.']);
      }
      if (name === 'ResolutionWeeks' && el.value && !/^\d+(\.\d{1,2})?$/.test(plainNumber(el.value) || '0')) {
        found.push([el, 'Enter a number of weeks, such as 2 or 1.5.']);
      }
    });
    return found;
  }

  function stampCurrentDate() {
    const now = new Date();
    const field = control('CurrentDate');
    if (field) {
      field.value = isoDay(now) + 'T' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';
    }
  }
  stampCurrentDate();

  // Capture phase on window: runs before BeyondFormz's handler, and stops it
  // when something needs fixing, so nothing is sent.
  window.addEventListener('click', event => {
    if (!event.target.closest || !event.target.closest('#ResolveButton')) {
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
      found.forEach(([el, text]) => showError(el, text));
      setMessage(found.length === 1 ? 'One field needs fixing.' : found.length + ' fields need fixing.', 'danger');
      found[0][0].focus();
      return;
    }
    // Plain numbers, blank for nothing awarded.
    ['ResolutionAmount', 'ResolutionWeeks'].forEach(name => {
      const el = control(name);
      if (el) {
        el.value = plainNumber(el.value);
      }
    });
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

  /* The save's answer. Success: an AsiSuccess message (or Success true):
     the button stays disabled and the popup closes with {saved: true,
     Ordinal}, which reloads the case page (resolving) or its panels
     (editing). Anything else stays on the form with the flow's message. */
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
        setMessage('The resolution wasn’t saved. Try again; if it keeps happening, contact an administrator.', 'danger');
      }
      return;
    }
    clearTimeout(saveTimer);
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    button.setAttribute('aria-busy', 'false');
    button.innerHTML = '<i class="ti ti-check" aria-hidden="true"></i> Saved';
    if (!html) {
      setMessage(editing ? 'Resolution saved.' : 'Case resolved.');
    }
    setTimeout(() => closeWith({saved: true, Ordinal: caseId}), CLOSE_DELAY);
  }

  /* ---------- The prefill ---------- */

  /* The prefill's answer: ReqVals (the FormFields rules), and optionally
     MemberName, DateOpened, ClosedStatuses, and in edit mode the values as
     id-val-<Field> (BeyondFormz has already written those in) with
     CurrentStatus, ResolvedBy and ResolvedOn. */
  function prefill(answer) {
    const data = parse(answer) || {};
    applyRules(parse(data.ReqVals));
    // After the rules: the flow needs a status whenever there is a choice.
    showStatuses(parse(data.ClosedStatuses), data.CurrentStatus);
    markOptional();
    drawCase(data.MemberName || '');

    opened = dayOf(data.DateOpened);
    if (date && opened) {
      date.min = opened;
    }

    // BeyondFormz wrote the values as they come from the database.
    if (date && data['id-val-ResolutionDate'] != null) {
      date.value = dayOf(data['id-val-ResolutionDate']) || (editing ? '' : today());
    }
    ['ResolutionAmount', 'ResolutionWeeks'].forEach(name => {
      const el = control(name);
      if (el) {
        el.value = plainNumber(data['id-val-' + name] != null ? data['id-val-' + name] : el.value);
      }
    });
    // Outcome type starts on "Choose the outcome" (an IQA list starts on its
    // first row), or the saved type when editing.
    const type = control('ResolutionType');
    const wanted = data['id-val-ResolutionType'];
    if (type) {
      whenFilled(type, () => {
        if (![...type.options].some(option => option.value === '')) {
          type.add(new Option('Choose the outcome', ''), 0);
        }
        $(type).val(wanted != null && wanted !== '' ? String(wanted) : '').trigger('change');
      });
    }

    if (editing && (data.ResolvedBy || data.ResolvedOn)) {
      resolvedLine.textContent = 'Resolved' + (data.ResolvedOn ? ' ' + niceDay(data.ResolvedOn) : '') +
        (data.ResolvedBy ? ' by ' + data.ResolvedBy : '') + '.';
      resolvedLine.hidden = false;
    }

    prefilled = true;
    revealWhenReady();
  }

  /* ---------- Start ---------- */

  form.setAttribute('data-us-loading', '');
  revealTimer = setTimeout(() => {
    markOptional();
    revealForm();
  }, SHOW_ANYWAY_AFTER);

  window.usResolveCase = {prefill, saved};
  // An answer that arrived before this script ran.
  if (window.usResolveCasePending) {
    prefill(window.usResolveCasePending);
    delete window.usResolveCasePending;
  }
})();
