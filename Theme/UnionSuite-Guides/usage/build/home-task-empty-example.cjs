// Offline fixture: production drawing and state logic come from shared CSS/JS.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const templateRoot = 'Theme/UnionSuite-Guides/usage/templates/List-Templates/';

function taskRow(completed) {
  const values = {
    TaskTitle: 'Follow up membership application', MemberName: 'Alex Morgan',
    IsCompleted: String(completed), TaskDateLabel: completed ? 'Actioned today' : 'Due today',
    Status: completed ? 'Complete' : 'Due today', TaskNote: 'Confirm the application details.'
  };
  return '<section><div class="QueryTemplateItem">' +
    read(templateRoot + 'Tasks-Completion-Query-Template.html').replace(/\{#query\.(\w+)\}/g, (_, key) => values[key] || '') +
    '</div></section>';
}

function panel(content) {
  return '<div class="panel"><div class="panel-heading"><h2 class="panel-title">My tasks</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body">' + content + '</div></div></div>';
}

function documentHtml() {
  const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css',
    'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite/zUnionSuite.css',
    'Theme/UnionSuite/zzDarkMode.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g, '');
  const icons = read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(/@font-face\s*\{[^}]*\}/g,
    '@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,' +
    fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64') + ') format("woff2")}');
  const js = read('Theme/UnionSuite/zUnionSuite.js') + '\n' + read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
  const completed = '<div class="QueryTemplateSet">' + taskRow(true) + '</div>';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Biscuit task empty state</title><style>' + css + icons +
    'html{height:auto}body{height:auto;min-height:0;margin:0;padding:16px;background:var(--bg-page)}.demo{max-width:800px;margin:auto}.demo-controls{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}</style>' +
    '<main class="demo"><div class="demo-controls"><button type="button" class="TextButton" id="restore-task">Add sample outstanding task</button>' +
    '<button type="button" class="TextButton" id="empty-query">Simulate no query results</button></div>' +
    '<div class="ContentItemContainer"><div id="task-empty-example" class="us-home-tasks">' + panel(completed) + '</div></div></main>' +
    '<template id="sample-outstanding"><div class="QueryTemplateSet">' + taskRow(false) + taskRow(true) + '</div></template>' +
    '<template id="sample-empty">' + read(templateRoot + 'Tasks-No-Results.html') + '</template>' +
    '<script>' + js + '</script><script>' +
    'function replaceResults(id){document.querySelector("#task-empty-example .panel-body").replaceChildren(document.getElementById(id).content.cloneNode(true));UnionSuiteIqaFilters.refresh();}' +
    'document.getElementById("restore-task").addEventListener("click",()=>replaceResults("sample-outstanding"));' +
    'document.getElementById("empty-query").addEventListener("click",()=>replaceResults("sample-empty"));' +
    '</script></html>';
}

module.exports = { documentHtml, panel, taskRow };
