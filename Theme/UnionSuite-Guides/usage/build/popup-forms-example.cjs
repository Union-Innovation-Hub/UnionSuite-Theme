// Guide-only fixture: the task form, drawn by the real forms runtime
// (Theme/UnionSuite/Forms/UnionSuiteForms.js and TaskForm.js) with its real
// stylesheet, offline. iMIS is stubbed: __ClientContext, the request token,
// /api/query (sample rows for sample IQA names), the ZenToken store, the
// CloudToolz endpoint and the popup, whose close result is shown under the
// form. The sample IQA names and data live here only.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/popup-forms-example.cjs',
  'Theme/UnionSuite/Forms/UnionSuiteForms.js',
  'Theme/UnionSuite/Forms/UnionSuiteForms.css',
  'Theme/UnionSuite/Forms/TaskForm.js'
];

const VARIANTS = {
  add: {
    title: 'Add task',
    module: 'agreement',
    search: '?Type=task&ID=104002&ModuleID=A107&ModuleOrdinal=123',
    caption: 'Adding a task to an agreement: choose Bargaining to see Subtags appear, set a date to offer Add time, then Save task or Save and add another.'
  },
  edit: {
    title: 'Edit task',
    module: 'case',
    search: '?Type=task&ID=104002&ModuleID=C217&ModuleOrdinal=412&Ordinal=9874',
    caption: 'Editing a case task (Ordinal in the address): the task is filled in, with Completed and who added it.'
  }
};

// Sample data, answered by the fetch stub below.
const SAMPLE = {
  task: {Ordinal: '9874', Title: 'Prepare Priya for the show cause meeting', Details: 'Go through the allegations letter with her.',
    AssignToID: '104118', AssignToName: 'Sam Carter', DueDate: '2026-10-23T00:00:00', DueTime: '', HighPriority: true,
    Completed: false, TagOrdinals: '3', SubtagOrdinals: '31', AddedBy: 'Sam Carter', AddedOn: '2026-10-15T14:03:00'},
  allStaff: [['104002', 'Jordan Lee'], ['104118', 'Sam Carter'], ['104133', 'Morgan Lee'], ['104140', 'Chris Tan']],
  caseStaff: [['104002', 'Jordan Lee'], ['104118', 'Sam Carter'], ['104140', 'Chris Tan']],
  tags: [['3', 'Representation', 'case'], ['4', 'Evidence', 'case'], ['5', 'Bargaining', 'agreement'], ['6', 'Ballot', 'agreement'], ['7', 'Correspondence', '']],
  subtags: [['31', '3', 'Meeting prep'], ['32', '3', 'Hearing'], ['51', '5', 'Log of claims'], ['52', '5', 'Offer response'], ['71', '7', 'Email'], ['72', '7', 'Letter']]
};

function stubScript(variant) {
  return `
(function () {
  var SAMPLE = ${JSON.stringify(SAMPLE)};
  window.UnionSuiteFormsConfig = {
    stylesheet: ${JSON.stringify(read('Theme/UnionSuite/Forms/UnionSuiteForms.css'))},
    search: ${JSON.stringify(variant.search)},
    forms: {task: {endpoint: '/tasks/save', queries: {
      task: '$/Guide/Task', parentTags: '$/Guide/Task Tags', childTags: '$/Guide/Task Subtags',
      caseStaff: '$/Guide/Case Staff', agreementStaff: '$/Guide/Agreement Staff', allStaff: '$/Guide/All Staff'
    }}}
  };
  function rows(name, filters) {
    var pairs = function (list) { return list.map(function (item) { return {ID: item[0], Name: item[1]}; }); };
    switch (name) {
      case '$/ZENTSO/Security/CloudToolzUrl': return [{Description: 'https://cloudtoolz.example'}];
      case '$/Guide/Task': return filters.get('Ordinal') === SAMPLE.task.Ordinal ? [SAMPLE.task] : [];
      case '$/Guide/All Staff': return pairs(SAMPLE.allStaff);
      case '$/Guide/Case Staff': return pairs(SAMPLE.caseStaff);
      case '$/Guide/Task Tags':
        return SAMPLE.tags.filter(function (tag) { return !tag[2] || tag[2] === filters.get('Module'); })
          .map(function (tag) { return {Ordinal: tag[0], TagName: tag[1]}; });
      case '$/Guide/Task Subtags':
        var parents = (filters.get('ParentTag') || '').replace(/"/g, '').split(',');
        return SAMPLE.subtags.filter(function (tag) { return parents.indexOf(tag[1]) >= 0; })
          .map(function (tag) { return {Ordinal: tag[0], ParentTagOrdinal: tag[1], TagName: tag[2]}; });
      default: return [];
    }
  }
  var json = function (body) { return new Response(JSON.stringify(body), {headers: {'Content-Type': 'application/json'}}); };
  var next = 9901;
  var result = function (text) { document.getElementById('result').textContent = text; };
  window.fetch = function (input, init) {
    var url = new URL(String(input), 'https://imis.example');
    if (url.pathname === '/api/query') {
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(json({Items: {$values: rows(url.searchParams.get('QueryName'), url.searchParams)}, HasNext: false})); }, 120);
      });
    }
    if (url.pathname === '/api/ZenTokens') return Promise.resolve(json({}));
    if (url.hostname === 'cloudtoolz.example') {
      var body = JSON.parse((init && init.body) || '{}');
      var ordinal = body.Ordinal ? Number(body.Ordinal) : next++;
      result('Sent to CloudToolz ' + url.pathname + ': ' + JSON.stringify(body));
      return new Promise(function (resolve) { setTimeout(function () { resolve(json({Ordinal: ordinal})); }, 300); });
    }
    return Promise.reject(new Error('Not in the guide example'));
  };
  window.GetRadWindow = function () {
    return {close: function (value) { result('The popup closes with ' + JSON.stringify(value) + '.'); }};
  };
})();`;
}

exports.documentHtml = ({nativePreviewCss, theme, branding, variant: name = 'add'}) => {
  const variant = VARIANTS[name];
  return `<!doctype html><html lang="en-AU"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${variant.title}</title><style>${nativePreviewCss}\n${theme}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page)}
.forms-demo{max-width:800px;margin:0 auto;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-lg)}
.forms-demo__title{margin:0;padding:10px 20px;border-bottom:1px solid var(--border);color:var(--text-strong);font:700 15px/1.4 var(--font-ui)}
.forms-demo__result{max-width:800px;margin:12px auto 0;color:var(--text-muted);font:12px/1.5 var(--font-ui);overflow-wrap:anywhere}
.forms-demo__caption{max-width:800px;margin:6px auto 0;color:var(--text-muted);font:12px/1.5 var(--font-ui)}
</style><body>
<input type="hidden" id="__ClientContext" value='{"loggedInPartyId":"104002","selectedPartyId":"104002","isAnonymous":false}'>
<input type="hidden" id="__RequestVerificationToken" value="guide">
<section class="forms-demo" aria-label="${variant.title}"><p class="forms-demo__title">${variant.title}</p>
<div data-us-form="task" data-module="${variant.module}"></div></section>
<p class="forms-demo__result" id="result" role="status">Nothing is saved: the result of Save or Cancel shows here.</p>
<p class="forms-demo__caption">${variant.caption}</p>
<script>${stubScript(variant)}</script>
<script>${read('Theme/UnionSuite/Forms/UnionSuiteForms.js')}</script>
<script>${read('Theme/UnionSuite/Forms/TaskForm.js')}</script>
</body></html>`;
};
