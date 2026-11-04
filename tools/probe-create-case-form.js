// CREATE CASE FORM PROBE: paste this whole file into the browser console on
// the staff Create case page (/Cases_CreateCase?ID=…),
// once the form has loaded.
//
// Read-only. It never creates a case: while it runs, every POST except the
// two the form reads with (Cases/Create-Prefill, Cases/SetSessionStorage)
// is blocked and logged instead of sent. Press Create case after filling
// the form to see exactly what it would send; nothing leaves the page.
//
// A blocked request is answered locally with "Blocked by the Create case
// probe: nothing was sent.", which the form shows in its message line.
//
// It checks:
//   1. the form and its script (window.usCreateCase), the page tokens;
//   2. every field: type, name, required, shown, list size, Select2;
//   3. which buttons BeyondFormz has wired, and to which flow;
//   4. that a field added by script is sent with a flow (it adds one hidden
//      field, presses the hidden SubTypeSession button, and reads the body);
//   5. what Cases/SetSessionStorage answers (the subtypes' shape);
//   6. whether the Child Tags IQA returns subtypes for a type.
//
// When finished:
//   copy(JSON.stringify(window.usCreateCaseProbeReport, null, 2))
// then paste the result back. Stop blocking with
//   window.usCreateCaseProbe.stop()
// (reloading the page also stops it).

(async () => {
  'use strict';

  if (window.usCreateCaseProbe) {
    console.warn('Create case probe is already running. window.usCreateCaseProbe.stop() first.');
    return;
  }

  /* ---------- Settings ---------- */

  // POSTs allowed through; everything else is blocked and logged.
  const ALLOWED_POSTS = [/Create-Prefill/i, /SetSessionStorage/i];

  const CHILD_TAGS_QUERY = '$/_i4u_/SandBox/CRM Layouts/Child Tags';
  const CHILD_TAGS_PARAMETER = 'ParentTag';
  const TYPES_TO_TRY = 3;

  // What a blocked request answers: BeyondFormz writes the message into the
  // form's .Message line.
  const BLOCKED_ANSWER = {
    probeBlocked: true,
    'class-html-Message': 'Blocked by the Create case probe: nothing was sent.'
  };

  const PROBE_FIELD = 'ProbeDynamicField';
  const WAIT_FOR_ANSWER = 8000;

  /* ---------- Report ---------- */

  const report = window.usCreateCaseProbeReport = {
    probe: 'Create case form probe',
    version: 1,
    page: location.pathname + location.search,
    startedAt: new Date().toISOString(),
    checks: [],
    form: null,
    fields: [],
    buttons: [],
    requests: [],
    subTypesAnswer: null,
    childTags: null
  };

  function check(status, test, detail) {
    report.checks.push({status, test, detail});
    const log = status === 'fail' ? console.error : status === 'warn' ? console.warn : console.log;
    log('[' + status + '] ' + test + (detail ? ': ' + detail : ''));
  }

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const $ = window.jQuery;

  /* ---------- Request capture: block and log ---------- */

  const original = {
    open: XMLHttpRequest.prototype.open,
    send: XMLHttpRequest.prototype.send,
    fetch: window.fetch
  };

  function decodeBody(body) {
    if (body == null) {
      return null;
    }
    if (typeof body !== 'string') {
      return '(' + Object.prototype.toString.call(body) + ')';
    }
    try {
      return JSON.parse(body);
    } catch (error) {
      // Form encoded: name=value&name=value, repeated names kept in order.
      const fields = {};
      new URLSearchParams(body).forEach((value, name) => {
        fields[name] = name in fields ? [].concat(fields[name], value) : value;
      });
      return fields;
    }
  }

  function allowed(method, url) {
    return method !== 'POST' || ALLOWED_POSTS.some(pattern => pattern.test(url));
  }

  function record(method, url, body, blocked) {
    const entry = {at: new Date().toISOString(), method, url, blocked, body: decodeBody(body), status: null, answer: null};
    report.requests.push(entry);
    console.log((blocked ? 'BLOCKED ' : 'sent ') + method + ' ' + url, entry.body);
    return entry;
  }

  XMLHttpRequest.prototype.open = function (method, url) {
    this.usProbe = {method: String(method).toUpperCase(), url: String(url)};
    return original.open.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    const info = this.usProbe || {method: 'GET', url: '?'};
    if (!allowed(info.method, info.url)) {
      record(info.method, info.url, body, true);
      // Never sent. The request is pointed at a local answer instead, so
      // the page gets a reply and puts its button back (an abort leaves
      // jQuery waiting forever).
      original.open.call(this, 'GET', 'data:application/json,' + encodeURIComponent(JSON.stringify(BLOCKED_ANSWER)));
      return original.send.call(this);
    }
    if (info.method === 'POST') {
      const entry = record(info.method, info.url, body, false);
      this.addEventListener('loadend', () => {
        entry.status = this.status;
        entry.answer = decodeBody(this.responseText);
      });
    }
    return original.send.apply(this, arguments);
  };

  window.fetch = function (resource, init) {
    const method = String((init && init.method) || 'GET').toUpperCase();
    const url = String(resource && resource.url ? resource.url : resource);
    if (!allowed(method, url)) {
      record(method, url, init && init.body, true);
      return Promise.resolve(new Response(JSON.stringify(BLOCKED_ANSWER), {headers: {'Content-Type': 'application/json'}}));
    }
    return original.fetch.apply(this, arguments);
  };

  function stop() {
    XMLHttpRequest.prototype.open = original.open;
    XMLHttpRequest.prototype.send = original.send;
    window.fetch = original.fetch;
    const added = document.querySelector('input[name="' + PROBE_FIELD + '"]');
    if (added) {
      added.remove();
    }
    delete window.usCreateCaseProbe;
    console.log('Create case probe stopped: requests are sent normally again.');
  }

  window.usCreateCaseProbe = {stop, report};

  /* ---------- 1. Form, script and page ---------- */

  const createButton = document.getElementById('CreateCaseButton');
  const form = createButton && createButton.closest('.rendered-form');
  const host = form && form.closest('[data-beyondformid]');

  if (!form) {
    check('fail', 'Form found', 'No #CreateCaseButton inside a .rendered-form on this page.');
    return;
  }

  let clientContext = null;
  try {
    clientContext = JSON.parse(document.getElementById('__ClientContext').value);
  } catch (error) {
    clientContext = null;
  }

  report.form = {
    beyondFormId: host ? host.getAttribute('data-beyondformid') : null,
    scriptLoaded: !!window.usCreateCase,
    stillLoading: form.hasAttribute('data-us-loading'),
    stylesAdded: !!document.getElementById('us-bf-styles'),
    jQuery: $ ? $.fn.jquery : null,
    select2: !!($ && $.fn.select2),
    loggedInPartyId: clientContext ? clientContext.loggedInPartyId || null : null,
    verificationToken: !!document.getElementById('__RequestVerificationToken'),
    cloudToolzUrl: window.gCloudToolzUrl || null
  };

  check(report.form.scriptLoaded ? 'pass' : 'fail', 'Form script ran', report.form.scriptLoaded ? '' : 'window.usCreateCase is missing: the injected script did not run or failed.');
  check(report.form.stillLoading ? 'warn' : 'pass', 'Form shown', report.form.stillLoading ? 'Still waiting for the prefill or a list.' : '');
  check(report.form.loggedInPartyId ? 'pass' : 'warn', 'Signed-in party ID', report.form.loggedInPartyId || '__ClientContext has none: Lead staff cannot start as you.');
  check(report.form.verificationToken ? 'pass' : 'warn', 'Request token', report.form.verificationToken ? '' : 'No __RequestVerificationToken: /api/query calls will fail.');

  /* ---------- 2. Fields ---------- */

  form.querySelectorAll('input, select, textarea').forEach(el => {
    if (!el.name || el.classList.contains('select2-search__field')) {
      return;
    }
    const wrapper = el.closest('.form-group');
    report.fields.push({
      name: el.name,
      tag: el.tagName.toLowerCase(),
      type: el.type,
      required: el.required,
      disabled: el.disabled,
      shown: !!wrapper && wrapper.offsetParent !== null && !wrapper.hidden,
      options: el.tagName === 'SELECT' ? [...el.options].filter(option => option.value !== '').length : null,
      value: el.type === 'hidden' || el.tagName === 'SELECT' ? ($ ? $(el).val() : el.value) : (el.value ? '(filled)' : ''),
      select2: !!($ && $(el).data('select2')),
      iqa: el.getAttribute('iqa-path-with-parameters')
    });
  });
  console.table(report.fields.map(({name, type, required, shown, options, select2}) => ({name, type, required, shown, options, select2})));

  report.fields
    .filter(field => field.iqa && field.options === 0)
    .forEach(field => check('fail', 'List filled: ' + field.name, 'Its IQA list is still empty.'));

  /* ---------- 3. Buttons ---------- */

  function jqueryHandlers(el, type) {
    const events = $ && $._data ? $._data(el, 'events') : null;
    return events && events[type] ? events[type].length : 0;
  }

  form.querySelectorAll('[execute-flow]').forEach(el => {
    report.buttons.push({
      name: el.name || el.id,
      tag: el.tagName.toLowerCase(),
      flow: el.getAttribute('execute-flow'),
      shown: el.offsetParent !== null,
      inlineOnclick: !!el.onclick,
      jqueryClickHandlers: jqueryHandlers(el, 'click'),
      delegatedOnForm: jqueryHandlers(form, 'click'),
      delegatedOnDocument: jqueryHandlers(document, 'click')
    });
  });
  console.table(report.buttons);

  /* ---------- 4 and 5. A field added by script, and the subtypes answer ---------- */

  const subTypeButton = document.getElementById('SubTypeSession');
  if (!subTypeButton) {
    check('warn', 'Subtypes button', 'No #SubTypeSession on the form: skipping the added-field and subtypes tests.');
  } else {
    const probeValue = 'probe-' + Date.now();
    const added = document.createElement('input');
    added.type = 'hidden';
    added.name = PROBE_FIELD;
    added.value = probeValue;
    form.appendChild(added);

    const before = report.requests.length;
    $(subTypeButton).trigger('click');

    const deadline = Date.now() + WAIT_FOR_ANSWER;
    let entry = null;
    while (Date.now() < deadline) {
      entry = report.requests.slice(before).find(request => /SetSessionStorage/i.test(request.url));
      if (entry && entry.status != null) {
        break;
      }
      await wait(200);
    }

    if (!entry) {
      check('fail', 'Subtypes button sends', 'Pressing #SubTypeSession sent nothing: BeyondFormz has not wired it.');
    } else {
      check('pass', 'Subtypes button sends', entry.url);

      const body = entry.body || {};
      check(body[PROBE_FIELD] === probeValue ? 'pass' : 'fail', 'Field added by script is sent',
        body[PROBE_FIELD] === probeValue ? PROBE_FIELD + ' arrived in the flow body.' : 'Not in the body: only configured fields are sent.');

      if (entry.status == null) {
        check('fail', 'Subtypes answer', 'No answer within ' + (WAIT_FOR_ANSWER / 1000) + ' seconds.');
      } else {
        let subTypes = entry.answer && entry.answer.SubTypes;
        if (typeof subTypes === 'string') {
          try {
            subTypes = JSON.parse(subTypes);
          } catch (error) {
            // Reported as is below.
          }
        }
        const rows = Array.isArray(subTypes) ? [].concat(...subTypes.map(row => (Array.isArray(row) ? row : [row]))) : [];
        report.subTypesAnswer = {
          status: entry.status,
          keys: entry.answer && typeof entry.answer === 'object' ? Object.keys(entry.answer) : null,
          rows: rows.length,
          rowKeys: rows[0] ? Object.keys(rows[0]) : null,
          sample: rows.slice(0, 3)
        };
        check(rows.length ? 'pass' : 'fail', 'Subtypes answer', entry.status >= 400
          ? 'HTTP ' + entry.status + ' from the flow.'
          : rows.length + ' subtypes; row keys: ' + (report.subTypesAnswer.rowKeys || []).join(', '));
      }
    }
    added.remove();
  }

  /* ---------- 6. Child Tags IQA ---------- */

  async function query(name, filters) {
    const params = new URLSearchParams({QueryName: name, limit: '100', offset: '0', ...filters});
    const response = await original.fetch.call(window, '/api/query?' + params, {
      credentials: 'same-origin',
      headers: {RequestVerificationToken: (document.getElementById('__RequestVerificationToken') || {}).value || ''}
    });
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch (error) {
      data = text.slice(0, 300);
    }
    return {status: response.status, data};
  }

  function rowsOf(data) {
    const items = data && (data.Items || data.items);
    const list = items && (items.$values || items);
    return Array.isArray(list) ? list : [];
  }

  const types = document.getElementById('CaseTypes');
  const chosen = types ? ($(types).val() || []) : [];
  const typeIds = (chosen.length ? chosen : [...(types ? types.options : [])].map(option => option.value))
    .filter(Boolean)
    .slice(0, TYPES_TO_TRY);

  report.childTags = {query: CHILD_TAGS_QUERY, parameter: CHILD_TAGS_PARAMETER, typeIds, parameters: null, results: []};

  try {
    const definition = await original.fetch.call(window, '/api/QueryParameterDefinition?QueryPath=' + encodeURIComponent(CHILD_TAGS_QUERY), {
      credentials: 'same-origin',
      headers: {RequestVerificationToken: (document.getElementById('__RequestVerificationToken') || {}).value || ''}
    });
    report.childTags.parameters = definition.ok ? await definition.json() : 'HTTP ' + definition.status;
  } catch (error) {
    report.childTags.parameters = String(error);
  }

  for (const id of typeIds) {
    try {
      const {status, data} = await query(CHILD_TAGS_QUERY, {[CHILD_TAGS_PARAMETER]: '"' + id + '"'});
      const rows = rowsOf(data);
      report.childTags.results.push({typeId: id, status, rows: rows.length, rowKeys: rows[0] ? Object.keys(rows[0]) : null, sample: rows.slice(0, 3)});
    } catch (error) {
      report.childTags.results.push({typeId: id, error: String(error)});
    }
  }
  console.table(report.childTags.results.map(({typeId, status, rows, error}) => ({typeId, status, rows, error})));

  const anyChildren = report.childTags.results.some(result => result.rows > 0);
  const failed = report.childTags.results.find(result => result.error || result.status >= 400);
  if (anyChildren) {
    check('pass', 'Child Tags IQA', 'Returns subtypes for at least one type.');
  } else if (failed) {
    check('fail', 'Child Tags IQA', 'Could not be read: ' + (failed.error || 'HTTP ' + failed.status) + '.');
  } else {
    check('warn', 'Child Tags IQA', 'No rows for types ' + typeIds.join(', ') + ' (pick a type that has subtypes, then run the probe again).');
  }

  /* ---------- Next ---------- */

  report.finishedAt = new Date().toISOString();
  console.log(
    '\nCreate case probe done. Optional: fill the form and press Create case. The request is blocked and ' +
    'logged here, so no case is created; leave something required empty first to check nothing is sent.\n' +
    'Then: copy(JSON.stringify(window.usCreateCaseProbeReport, null, 2)) and paste it back.\n' +
    'window.usCreateCaseProbe.stop() lets requests through again.'
  );
})();
