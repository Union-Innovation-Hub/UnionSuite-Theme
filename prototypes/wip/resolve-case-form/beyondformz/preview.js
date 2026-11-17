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
    prefill: pick('prefill', ['full', 'rules']),
    save: pick('save', ['ok', 'fail']),
    statuses: pick('statuses', ['several', 'one', 'none']),
    scheme: pick('scheme', ['light', 'dark'])
  };
  document.documentElement.setAttribute('data-us-color-scheme', state.scheme);

  const log = text => {
    document.querySelector('[data-pv-log]').textContent += text + '\n';
  };

  /* ---------- Sample IQA lists and flow answers ---------- */

  const LISTS = {
    ResolutionType: [['Won', 'Won'], ['Settled', 'Settled'], ['Partially successful', 'Partially successful'], ['Unsuccessful', 'Unsuccessful'], ['Withdrawn', 'Withdrawn'], ['No further action', 'No further action']]
  };

  // UnionTemplate.FormFields for Cases / Resolution, as the prefill returns
  // them (shape from the form's original script).
  const RULES = [
    {FieldName: 'ResolutionDate', Visible: 1, IsRequired: 1, Editable: 1},
    {FieldName: 'ResolutionType', Visible: 1, IsRequired: 1, Editable: 1},
    {FieldName: 'ResolutionAmount', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'ResolutionWeeks', Visible: 1, IsRequired: 0, Editable: 1},
    {FieldName: 'Resolution', Visible: 1, IsRequired: 0, Editable: 1}
  ];

  // The Case Status value list's closed statuses, as the prefill sends
  // them (?statuses=several|one|none).
  const CLOSED = {
    several: [{Code: 'Won', Description: 'Won'}, {Code: 'Lost', Description: 'Lost'}, {Code: 'Withdrawn', Description: 'Withdrawn'}],
    one: [{Code: 'Complete', Description: 'Complete'}],
    none: []
  }[state.statuses];

  const editing = params.get('Edit') === 'true';

  function answer(flow, body) {
    if (flow === 'Cases/US/Resolve/Prefill') {
      if (state.prefill === 'rules') {
        // What the live flow is known to return; the decimal fields come
        // back as the column's zero.
        return {ReqVals: RULES, 'id-val-ResolutionAmount': '0.000000000000', 'id-val-ResolutionWeeks': '0.000000000000'};
      }
      const full = {ReqVals: RULES, MemberName: 'Tony Andrews', DateOpened: '2025-08-18T00:00:00', ClosedStatuses: CLOSED};
      if (!editing) {
        return {...full, 'id-val-ResolutionAmount': '0.000000000000', 'id-val-ResolutionWeeks': '0.000000000000'};
      }
      return {
        ...full,
        'id-val-ResolutionType': 'Settled',
        'id-val-ResolutionDate': '2026-11-12T00:00:00',
        'id-val-ResolutionAmount': '4250.000000000000',
        'id-val-ResolutionWeeks': '2.000000000000',
        'id-val-Resolution': 'Employer agreed to back-pay the unpaid overtime, to restore two weeks of personal leave, and to correct the roster rules.',
        CurrentStatus: CLOSED.length > 1 ? 'Lost' : 'Complete',
        ResolvedBy: 'Sam Carter',
        ResolvedOn: '2026-11-12T15:20:00'
      };
    }
    if (flow === 'Cases/US/Resolve') {
      log('Cases/US/Resolve body:\n' + JSON.stringify(body, null, 2));
      if (state.save === 'ok') {
        return {'class-html-Message': '<div class="AsiSuccess AsiSuccessIcon">' + (editing ? 'Resolution updated.' : 'Case resolved.') + '</div>'};
      }
      return {Error: true, 'class-html-Message': '<div class="AsiError AsiErrorIcon">The resolution could not be saved. Nothing was changed; please try again.</div>'};
    }
    return {};
  }

  // The iMIS popup around the page: logs how the form closed it.
  window.radWindow = {close: result => log('Popup closed with ' + JSON.stringify(result))};

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
      } else if (field.type === 'imisClientContext') {
        // BeyondFormz draws nothing for it; the page's __ClientContext stands in.
        return;
      } else if (field.type === 'hidden' || field.type === 'urlParameters') {
        node = document.createElement('input');
        node.type = 'hidden';
        node.id = field.name;
        node.name = field.name;
        // ID defaults to the sample member; ?ID= (blank) tries the page without one.
        node.value = field.type === 'urlParameters'
          ? (params.has(field.urlParameter) ? params.get(field.urlParameter) : (field.urlParameter === 'CaseID' ? 'C49' : field.urlParameter === 'CaseNum' ? '48' : ''))
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

  fetch('../../../../dist/Imports/Resolve-Case-Form.json')
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
      log('Rendered ' + form.fields.length + ' fields; prefill: ' + state.prefill + ', closed statuses: ' + state.statuses + ', edit: ' + editing + ', save: ' + state.save);
    })
    .catch(error => log('Could not load dist/Imports/Resolve-Case-Form.json: build it first. ' + error));
})();
