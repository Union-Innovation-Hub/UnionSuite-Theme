/* A stand-in for BeyondFormz's renderer, for trying the built export.

   Draws the fields as formRender does (row-N / col-* classes on the field
   wrapper, the rest on the control; fields sharing row-N in one .row),
   runs javaScriptToInject, then answers each flow with sample data:
   class-html-<Class> and id-val-<Id> keys are written into the page, and
   the field's javaScript runs with the answer as `data`. Not BeyondFormz:
   check the real form after importing. */

(function () {
  'use strict';

  const $ = window.jQuery;
  const params = new URLSearchParams(location.search);
  const pick = (name, values) => (values.includes(params.get(name)) ? params.get(name) : values[0]);
  const state = {
    prefill: pick('prefill', ['today', 'new']),
    from: pick('from', ['member', 'note']),
    save: pick('save', ['ok', 'partial', 'fail']),
    scheme: pick('scheme', ['light', 'dark'])
  };
  document.documentElement.setAttribute('data-us-color-scheme', state.scheme);

  const log = text => {
    document.querySelector('[data-pv-log]').textContent += text + '\n';
  };

  /* ---------- Sample IQA lists and flow answers ---------- */

  const LISTS = {
    CaseTypes: [['25', 'ABC'], ['69', 'Bullying / Harassment'], ['60', 'Discrimination'], ['64', 'Dismissal'], ['71', 'Grievance'], ['70', 'Insurance']],
    CaseStaffMembers: [['23264', "Mary O'Conner"], ['23283', 'Andrew O Newnham'], ['104114', 'Ash Hunt'], ['18099', 'Brooke McCormac'], ['103817', 'Christina Zerk']],
    CasePriority: [['1', 'Lowest'], ['2', 'Low'], ['3', 'Normal'], ['4', 'High'], ['5', 'Highest'], ['6', 'Critical']],
    CaseAccessLevel: [['Individual', 'Individual'], ['Open', 'Open', true], ['Team', 'Team']]
  };

  // As the subtypes IQA returns them. Race is disabled, so the form leaves
  // it out.
  const SUBTYPES = [
    {Ordinal: 201, TagName: 'Verbal', TagStatus: true, ParentTagOrdinal: 69, ParentTagName: 'Bullying / Harassment'},
    {Ordinal: 202, TagName: 'Online', TagStatus: true, ParentTagOrdinal: 69, ParentTagName: 'Bullying / Harassment'},
    {Ordinal: 211, TagName: 'Race', TagStatus: false, ParentTagOrdinal: 60, ParentTagName: 'Discrimination'},
    {Ordinal: 212, TagName: 'Age', TagStatus: true, ParentTagOrdinal: 60, ParentTagName: 'Discrimination'},
    {Ordinal: 221, TagName: 'Unfair dismissal', TagStatus: true, ParentTagOrdinal: 64, ParentTagName: 'Dismissal'}
  ];

  const NOTE = 'Priya called about her night shift supervisor, who has made comments about her accent in front of the team since July.';

  const RULES = [
    {FieldName: 'CaseName', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'CaseTypes', Visible: 1, IsRequired: 1, Editable: 1},
    {FieldName: 'CaseSubTypes', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'CaseDescription', Visible: 1, IsRequired: 1, Editable: 1},
    {FieldName: 'CaseStatus', Visible: 1, IsRequired: 1, Editable: 0},
    {FieldName: 'CaseAccessLevel', Visible: 1, IsRequired: 1, Editable: 1},
    {FieldName: 'CaseStaffMembers', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'CaseWorkBench', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'DateIncident', Visible: 1, IsRequired: 0, Editable: 1}
  ];

  function answer(flow, body) {
    if (flow === 'Cases/Union-Suite/Create-Case-Staff-Prefill') {
      const today = {ReqVals: RULES};
      if (state.from === 'note') {
        today['id-val-CaseDescription'] = 'Created from Note: ' + NOTE;
      }
      if (state.prefill === 'today') {
        return today;
      }
      // As flows/build-flows.cjs's prefill answers (29 October 2026).
      return {
        ReqVals: RULES,
        Member: {Name: 'Priya Natarajan', ID: '20544'},
        Note: state.from === 'note' ? {Note: NOTE, CreatedOn: '2026-10-28'} : null,
        Workplaces: [
          {WorkplaceID: '4101', 'Workplace Name': 'Dandenong DC – night shift', Employer: 'Northside Distribution Pty Ltd', Classification: 'Storeperson Grade 2', 'Member Job Status': 'Active', 'Job Start Date': '2020-03-02'},
          {WorkplaceID: '4120', 'Workplace Name': 'Frankston Hospital – catering', Employer: 'Bayside Health', Classification: 'Food services assistant', 'Member Job Status': 'Active', 'Job Start Date': '2023-08-14'},
          {WorkplaceID: '3870', 'Workplace Name': 'Westgate Cold Storage – Laverton', Employer: 'Westgate Logistics Pty Ltd', Classification: 'Storeperson Grade 1', 'Member Job Status': 'Finished', 'Job Start Date': '2016-03-01', 'Job End Date': '2019-01-31'}
        ]
      };
    }
    if (flow === 'Cases/Union-Suite/Create-Case-Staff') {
      log('Create-Case-Staff body:\n' + JSON.stringify(body, null, 2));
      // As flows/build-flows.cjs's create flow answers. The success link is
      // a hash, so opening the case stays on this page.
      if (state.save === 'ok') {
        return {'class-html-Message': '<div class="AsiSuccess AsiSuccessIcon">Case: <a href="#Cases_ManageCase?CaseID=C231&amp;CaseNum=228">C231</a> Successfully Created</div>'};
      }
      if (state.save === 'partial') {
        return {Partial: true, CaseID: 'C231', CaseNum: '228', FailedStep: 'the lead staff member', 'class-html-Message': '<div class="AsiError AsiErrorIcon">Case C231 was created, but the lead staff member could not be saved. <a href="#Cases_ManageCase?CaseID=C231&amp;CaseNum=228">Open C231</a> to finish it, or contact an administrator.</div>'};
      }
      return {Error: true, 'class-html-Message': '<div class="AsiError AsiErrorIcon">The case could not be created. Nothing was saved; please try again, or contact an administrator if it keeps happening.</div>'};
    }
    return {};
  }

  /* ---------- Rendering ---------- */

  function decode(html) {
    const area = document.createElement('textarea');
    area.innerHTML = html || '';
    return area.value;
  }

  function control(field, own) {
    const name = field.multiple ? field.name + '[]' : field.name;
    let el;
    if (field.type === 'textarea') {
      el = document.createElement('textarea');
      el.rows = field.rows || 4;
    } else if (field.type === 'select') {
      el = document.createElement('select');
      el.multiple = !!field.multiple;
      // IQA lists arrive after the injected script has run, as on the dev
      // tenant (29 October 2026); fixed values are there from the start.
      const fill = list => list.forEach(([value, label, selected]) => el.add(new Option(label, value, selected, selected)));
      if (field.iqaPathWithParameters) {
        setTimeout(() => fill(LISTS[field.name] || []), 400);
      } else {
        fill((field.values || []).map(v => [v.value, v.label, v.selected]));
      }
    } else {
      el = document.createElement('input');
      el.type = field.type;
    }
    el.id = field.name;
    el.name = name;
    el.className = own.join(' ');
    if (field.maxlength) {
      el.maxLength = field.maxlength;
    }
    if (field.placeholder) {
      el.placeholder = field.placeholder;
    }
    if (field.required) {
      el.required = true;
      el.setAttribute('aria-required', 'true');
    }
    return el;
  }

  function render(form, host) {
    const root = document.createElement('div');
    root.className = 'rendered-form formbuilder-embedded-bootstrap';
    let row = null;
    let rowKey = null;
    const buttons = [];
    const autoexecute = [];

    form.fields.forEach(field => {
      const classes = (field.className || '').split(/\s+/).filter(Boolean);
      const layout = classes.filter(c => /^row-\d+$/.test(c) || /^col-/.test(c));
      const own = classes.filter(c => !layout.includes(c));
      let node;

      if (field.type === 'autoexecute') {
        autoexecute.push(field);
        return;
      }
      if (field.type === 'header') {
        node = document.createElement('div');
        node.innerHTML = '<' + field.subtype + ' class="' + own.join(' ') + '">' + field.label + '</' + field.subtype + '>';
      } else if (field.type === 'paragraph') {
        node = document.createElement('div');
        node.innerHTML = '<p class="' + own.join(' ') + '">' + decode(field.label) + '</p>';
      } else if (field.type === 'hidden' || field.type === 'urlParameters') {
        node = document.createElement('input');
        node.type = 'hidden';
        node.id = field.name;
        node.name = field.name;
        // ID defaults to the sample member; ?ID= (blank) tries the page without one.
        node.value = field.type === 'urlParameters'
          ? (params.has(field.urlParameter) ? params.get(field.urlParameter) : (field.urlParameter === 'ID' ? '20544' : ''))
          : (field.value || '');
      } else if (field.type === 'button') {
        node = document.createElement('div');
        node.className = 'formbuilder-button form-group field-' + field.name;
        const button = document.createElement('button');
        button.type = 'button';
        button.id = field.name;
        button.name = field.name;
        button.className = own.join(' ');
        button.innerHTML = field.label;
        node.appendChild(button);
        buttons.push([button, field]);
      } else {
        node = document.createElement('div');
        node.className = 'formbuilder-' + field.type + ' form-group field-' + field.name + ' ' + layout.join(' ');
        const label = document.createElement('label');
        label.htmlFor = field.name;
        label.className = 'formbuilder-' + field.type + '-label';
        label.innerHTML = field.label + (field.required ? '<span class="formbuilder-required">*</span>' : '');
        node.append(label, control(field, own));
      }

      const key = layout.find(c => /^row-/.test(c));
      if (key && field.type !== 'button') {
        if (key !== rowKey) {
          row = document.createElement('div');
          row.className = 'row';
          root.appendChild(row);
          rowKey = key;
        }
        row.appendChild(node);
      } else {
        rowKey = null;
        root.appendChild(node);
      }
    });

    host.appendChild(root);
    return {root, buttons, autoexecute};
  }

  function apply(data) {
    Object.keys(data).forEach(key => {
      const html = key.match(/^class-html-(.+)$/);
      const val = key.match(/^id-val-(.+)$/);
      if (html) {
        $('.' + html[1]).html(data[key]);
      } else if (val) {
        $('#' + val[1]).val(data[key]);
      }
    });
  }

  /* As BeyondFormz does: POST every named input in the form, serialized.
     The request goes to this server (which answers 404) so console probes
     can see it; the answer itself is the sample above. An aborted request
     (tools/probe-create-case-form.js blocks saves) gets no answer. */
  function run(field, root) {
    const serialized = $(root).find('input, select, textarea').serialize();
    const body = {};
    $(root).find('input, select, textarea').serializeArray().forEach(({name, value}) => {
      body[name] = body[name] ? body[name] + ',' + value : value;
    });
    let aborted = false;
    $.ajax({type: 'POST', url: '/cloudtoolz/' + field.executeFlow, data: serialized})
      .fail((xhr, status) => {
        aborted = status === 'abort';
      });
    setTimeout(() => {
      if (aborted) {
        log(field.executeFlow + ' was not sent (aborted).');
        return;
      }
      const data = answer(field.executeFlow, body);
      apply(data);
      if (field.javaScript) {
        new Function('data', field.javaScript)(data);
      }
    }, 700);
  }

  // iMIS's /api/query, for the subtypes IQA: its rows, a little late.
  const pageFetch = window.fetch.bind(window);
  window.fetch = (url, options) => {
    if (!String(url).startsWith('/api/query?')) {
      return pageFetch(url, options);
    }
    log('GET ' + decodeURIComponent(String(url)));
    const body = JSON.stringify({Items: {$values: SUBTYPES}, Count: SUBTYPES.length, HasNext: false});
    return new Promise(resolve => setTimeout(() => resolve(new Response(body, {status: 200})), 300));
  };

  fetch('dist/Create-Case-Staff-Form.json')
    .then(response => response.json())
    .then(exported => {
      const form = exported.forms[0];
      const host = document.getElementById('formrender_preview');
      host.setAttribute('data-beyondformid', form.formId);
      const {root, buttons, autoexecute} = render(form, host);

      new Function(form.javaScriptToInject)();

      // BeyondFormz binds each button's flow on the button itself, and
      // only after the injected script has run: a click before then is
      // lost (dev tenant, 29 October 2026).
      setTimeout(() => buttons.forEach(([button, field]) => button.addEventListener('click', () => {
        log('BeyondFormz runs ' + field.executeFlow);
        run(field, root);
      })), 200);
      autoexecute.forEach(field => run(field, root));
      log('Rendered ' + form.fields.length + ' fields; prefill: ' + state.prefill + ', from: ' + state.from + ', save: ' + state.save);
    })
    .catch(error => log('Could not load dist/Create-Case-Staff-Form.json: build it first. ' + error));
})();
