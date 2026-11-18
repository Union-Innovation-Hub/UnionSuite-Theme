/* A stand-in for BeyondFormz's renderer, for trying the built export.

   Draws the fields as formRender does (row-N / col-* classes on the field
   wrapper, the rest on the control; fields sharing row-N in one .row),
   runs javaScriptToInject, then answers each flow with sample data:
   class-html-<Class> and id-val-<Id> keys are written into the page, and
   the field's javaScript runs with the answer as `data`. The IQAs the
   form's script reads (/api/query) and the file upload answer too. Not
   BeyondFormz: check the real form after importing. */

(function () {
  'use strict';

  const $ = window.jQuery;
  const params = new URLSearchParams(location.search);
  const pick = (name, values) => (values.includes(params.get(name)) ? params.get(name) : values[0]);
  const state = {
    save: pick('save', ['ok', 'warn', 'fail']),
    scheme: pick('scheme', ['light', 'dark'])
  };
  document.documentElement.setAttribute('data-us-color-scheme', state.scheme);

  const log = text => {
    document.querySelector('[data-pv-log]').textContent += text + '\n';
  };

  /* ---------- Sample lists and answers ---------- */

  // IQA and flow lists, by field name: [value, label].
  // ?tags=none: the Note Tags IQA answers no rows (as on the dev tenant
  // before it is set up), and the form must not wait for it.
  const LISTS = {
    PrimaryStaffLead: [['', ''], ['104002', 'James Driscoll'], ['104118', 'Sam Carter'], ['104140', 'Chris Tan']],
    Tags: params.get('tags') === 'none' ? [] : [['3', 'Representation'], ['4', 'Evidence'], ['5', 'Correspondence'], ['6', 'Discrimination']],
    Access: [['Open', 'Open'], ['Team', 'Team'], ['Individual', 'Individual']],
    // flow/sharepoint/seetags, as it answers on the dev tenant.
    FileTagChoices: [['12', 'General'], ['13', 'Contracts'], ['14', 'Documents'], ['15', 'Letters'], ['16', 'Emails'], ['17', 'Minutes']]
  };

  // The IQAs the form's script reads itself.
  const QUERIES = {
    'API - Value List - Note Subtags': [
      {Ordinal: 31, TagName: 'Meeting prep', TagStatus: true, ParentTagOrdinal: 3},
      {Ordinal: 32, TagName: 'Hearing', TagStatus: true, ParentTagOrdinal: 3},
      {Ordinal: 41, TagName: 'Witness statement', TagStatus: true, ParentTagOrdinal: 4},
      {Ordinal: 51, TagName: 'Letter', TagStatus: true, ParentTagOrdinal: 5},
      {Ordinal: 52, TagName: 'Old letters', TagStatus: false, ParentTagOrdinal: 5}
    ],
    'API - Zen Attachment Tags': [
      {Ordinal: 1, TagName: 'ID'}, {Ordinal: 3, TagName: 'Cases'},
      {Ordinal: 12, TagName: 'Letter of demand'}, {Ordinal: 13, TagName: 'Documentation'},
      {Ordinal: 14, TagName: 'Forms'}, {Ordinal: 15, TagName: 'Minutes'}, {Ordinal: 16, TagName: 'Contracts'}
    ],
    CloudToolzUrl: [{Description: location.origin + '/preview-cloudtoolz'}]
  };

  const SAVED = {
    9874: {
      Note: {Ordinal: '9874', FollowupRequired: true, Title: 'Prepare Priya for the show cause meeting',
        Note: 'Go through the allegations letter with her.', ActionedNotes: '', Deadline: '2026-11-20T14:30:00',
        PrimaryStaffLead: '104118', HighPriority: true, Actioned: false, Access: 'Open', CreatedOn: '2026-10-15T09:12:00'},
      NoteTags: '3,31',
      Files: []
    },
    9902: {
      Note: {Ordinal: '9902', FollowupRequired: false, Title: '', Note: 'Rang Priya. She has the allegations letter and wants to meet before Thursday.',
        ActionedNotes: '', Deadline: '', PrimaryStaffLead: '', HighPriority: false, Actioned: false, Access: 'Team', CreatedOn: '2026-11-12T16:40:00'},
      NoteTags: '5,51',
      Files: [{FileName: 'Allegations letter.pdf', Tags: 'Letter of demand'}]
    }
  };

  function answer(flow, body) {
    if (flow === 'cases/US/note/Prefill') {
      const saved = SAVED[body.Ordinal];
      if (body.Ordinal && !saved) {
        return {ReqVals: [], CaseNum: '214', Error: 'This note couldn’t be opened. It may have been deleted, or be on another case.'};
      }
      return {ReqVals: [], CaseNum: '214', MemberName: 'Priya Sharma', ...(saved || {})};
    }
    if (flow === 'cases/US/note') {
      log('cases/US/note body:\n' + JSON.stringify(body, null, 2));
      const what = body.FollowupRequired === '1' ? 'Task' : 'Note';
      if (state.save === 'ok') {
        return {Success: true, Ordinal: body.Ordinal || '9990', 'class-html-Message': '<div class="AsiSuccess AsiSuccessIcon">' + what + ' saved.</div>'};
      }
      if (state.save === 'warn') {
        const warning = what + ' saved, but an attachment (Scan.pdf) couldn’t be saved. Edit it to try again.';
        return {Success: true, Ordinal: body.Ordinal || '9990', Warning: warning, 'class-html-Message': '<div class="AsiError AsiErrorIcon">' + warning + '</div>'};
      }
      return {Error: true, 'class-html-Message': '<div class="AsiError AsiErrorIcon">It wasn’t saved: nothing was changed. Try again; if it keeps happening, contact an administrator.</div>'};
    }
    return {};
  }

  // /api/query and the upload, answered here.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const wait = (data, ms, status) => new Promise(resolve => setTimeout(() => resolve(new Response(JSON.stringify(data), {
      status: status || 200, headers: {'Content-Type': 'application/json'}
    })), ms));
    if (url.pathname === '/api/query') {
      const name = url.searchParams.get('QueryName') || '';
      const key = Object.keys(QUERIES).find(entry => name.endsWith(entry));
      return wait({Items: {$values: key ? QUERIES[key] : []}}, 300);
    }
    if (url.pathname === '/preview-cloudtoolz/api/formz/fineUpload') {
      const file = init.body.get('qqfilename');
      log('Uploaded ' + file + ' as ' + init.body.get('qquuid'));
      return /fail/i.test(file) ? wait({success: false, error: 'Upload refused'}, 600, 500) : wait({success: true}, 900);
    }
    return nativeFetch(input, init);
  };

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
      const fill = list => {
        el.innerHTML = '';
        list.forEach(([value, label, selected]) => el.add(new Option(label, value, selected, selected)));
      };
      fill((field.values || []).map(v => [v.value, v.label, v.selected]));
      // IQA and flow lists arrive after the injected script has run, as on
      // the dev tenant (29 October 2026).
      if (field.iqaPathWithParameters || field.executeFlow) {
        setTimeout(() => fill(LISTS[field.name] || []), 400);
      }
    } else {
      el = document.createElement('input');
      el.type = field.type === 'date' ? 'date' : 'text';
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
        return;
      } else if (field.type === 'hidden' || field.type === 'urlParameters') {
        node = document.createElement('input');
        node.type = 'hidden';
        node.id = field.name;
        node.name = field.name;
        node.value = field.type === 'urlParameters'
          ? (params.has(field.urlParameter) ? params.get(field.urlParameter) : (field.urlParameter === 'CaseID' ? 'C217' : ''))
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

  // As BeyondFormz does: every named input in the form, serialized.
  function run(field, root) {
    const body = {};
    $(root).find('input, select, textarea').serializeArray().forEach(({name, value}) => {
      body[name] = body[name] ? body[name] + ',' + value : value;
    });
    setTimeout(() => {
      const data = answer(field.executeFlow, body);
      apply(data);
      if (field.javaScript) {
        new Function('data', field.javaScript)(data);
      }
    }, 600);
  }

  fetch('../../../../dist/Imports/Case-Note-Form.json', {cache: 'no-cache'})
    .then(response => response.json())
    .then(exported => {
      const form = exported.forms[0];
      const host = document.getElementById('formrender_preview');
      host.setAttribute('data-beyondformid', form.formId);
      const {root, buttons, autoexecute} = render(form, host);

      new Function(form.javaScriptToInject)();

      // BeyondFormz binds each button's flow on the button itself, and
      // only after the injected script has run.
      setTimeout(() => buttons.forEach(([button, field]) => button.addEventListener('click', () => {
        log('BeyondFormz runs ' + field.executeFlow);
        run(field, root);
      })), 200);
      autoexecute.forEach(field => run(field, root));
      log('Rendered ' + form.fields.length + ' fields; Ordinal: ' + (params.get('Ordinal') || 'none') + ', save: ' + state.save);
    })
    .catch(error => log('Could not load dist/Imports/Case-Note-Form.json: build it first. ' + error));
})();
