// Supported offline simulation of the change history (US-CHANGE-FIELDS)
// and its Details view (US-DETAILS-VIEW). The cards are the copyable
// template filled with sample saves; opening one runs the theme's own code,
// with /api/query answered from sample field rows after a short delay. The
// Details view is a native Query Menu grid of the same rows.
const sources = [
  'Theme/UnionSuite-Guides/usage/build/change-history-example.cjs',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html'
];

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

// One row per save, as the change history IQA returns them.
const saves = [
  {ChangeKey: 'save-4', Action: 'Edit', Event: 'Meeting updated', Summary: '2 fields', ChangedBy: 'Andrew O Newnham', ChangeDay: '25 Oct 2026', ChangeTime: '9:42 pm'},
  {ChangeKey: 'save-3', Action: 'Add', Event: 'Meeting added', Summary: 'Hearing preparation', ChangedBy: "Mary O'Conner", ChangeDay: '25 Oct 2026', ChangeTime: '8:13 pm'},
  {ChangeKey: 'save-2', Action: 'Delete', Event: 'Staff removed', Summary: 'Dani Sundara (10233)', ChangedBy: "Mary O'Conner", ChangeDay: '24 Oct 2026', ChangeTime: '4:05 pm'},
  {ChangeKey: 'save-1', Action: 'Edit', Event: 'Case updated', Summary: '3 fields', ChangedBy: 'Andrew O Newnham', ChangeDay: '22 Oct 2026', ChangeTime: '11:02 am'}
];

// The fields IQA's rows for each save, as the change log stores them: the
// logged field names and the US date text the logging flow writes.
const fields = {
  'save-4': [
    {Field: 'Location', OldValue: '', NewValue: 'Level 3, Trades Hall'},
    {Field: 'MeetingDate', OldValue: '10/28/2026 12:00:00 AM', NewValue: '10/29/2026 9:30:00 AM'}
  ],
  'save-3': [
    {Field: 'Title', OldValue: '', NewValue: 'Hearing preparation'},
    {Field: 'Location', OldValue: '', NewValue: ''},
    {Field: 'MeetingDate', OldValue: '', NewValue: '10/28/2026 12:00:00 AM'},
    {Field: 'MeetingType', OldValue: '', NewValue: 'General'}
  ],
  'save-1': [
    {Field: 'Priority', OldValue: 'Lowest', NewValue: 'High'},
    {Field: 'IncidentDate', OldValue: '', NewValue: '2026-09-22'},
    {Field: 'Source', OldValue: '', NewValue: 'Member phone call'}
  ]
};

function documentHtml({read, css, themeJs}) {
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html')
    .replace(/<!--[\s\S]*?-->\s*/g, '');
  const items = saves.map((row, index) => '<section data-item="' + index + '"><div class="QueryTemplateItem">' +
    template.replace(/\{#query\.(\w+)\}/g, (_, name) => esc(row[name] ?? '')) + '</div></section>').join('');
  // The frame's address is about:srcdoc, so the query string is read as is.
  const answer = 'window.fetch=async url=>{const key=new URLSearchParams(String(url).split("?")[1]||"").get("ChangeKey");' +
    'await new Promise(r=>setTimeout(r,400));' +
    'return new Response(JSON.stringify({Items:{$values:(' + JSON.stringify(fields) + ')[key]||[]}}),{status:200});};';
  // The Details view (US-DETAILS-VIEW): the same log as a native Query Menu
  // grid, one row per field.
  const history = saves.flatMap(save => (fields[save.ChangeKey] || [{Field: '', OldValue: '', NewValue: ''}]).map(row =>
    [save.ChangeDay + ' ' + save.ChangeTime, save.Event, row.Field, row.OldValue, row.NewValue, save.ChangedBy]));
  const grid = '<table class="rgMasterTable"><thead><tr>' +
    ['Changed on', 'Change', 'Field', 'Old', 'New', 'Changed by'].map(name => '<th class="rgHeader" scope="col">' + name + '</th>').join('') +
    '</tr></thead><tbody>' +
    history.map((cells, index) => '<tr class="' + (index % 2 ? 'rgAltRow' : 'rgRow') + '">' + cells.map(cell => '<td>' + esc(cell) + '</td>').join('') + '</tr>').join('') +
    '</tbody></table>';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{margin:0;padding:20px;height:auto;min-height:420px;background:var(--bg-page)}</style><body><div class="WebPartZone">' +
    '<div class="ContentItemContainer"><div class="us-query-template us-records us-details-view-history"><div class="panel">' +
    '<div class="panel-heading Distinguish"><h2 class="panel-title">Change history</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' + items + '</div></div></div>' +
    '</div></div></div>' +
    '<div class="ContentItemContainer" id="ste_container_ciHistory"><div class="us-activity-detail us-activity-detail-history"><div class="panel">' +
    '<div class="panel-heading Distinguish"><h2 class="panel-title">History</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="RadGrid RadGrid_MetroTouch">' + grid + '</div></div></div>' +
    '</div></div></div></div><script>' + answer + '\n' +
    themeJs.match(/\/\* US-RECORD-CARDS:START[\s\S]*?US-RECORD-CARDS:END \*\//)[0] + '\n' +
    themeJs.match(/\/\* US-CHANGE-FIELDS:START[\s\S]*?US-CHANGE-FIELDS:END \*\//)[0] + '\n' +
    themeJs.match(/\/\* US-DETAILS-VIEW:START[\s\S]*?US-DETAILS-VIEW:END \*\//)[0] + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
