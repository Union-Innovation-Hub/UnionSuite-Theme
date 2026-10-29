// Builds the activity cards workbench: every history-style list (notes, cases,
// meetings, communications) rendered from the candidate card templates inside
// the wrappers iMIS generates, with the shipped theme CSS and behaviour; and the
// combined activity feed as the real US-ACTIVITY-FEED module from the contact
// page v3 prototype, answered from the sample records. Recent activity also
// shows the owner's supplied card, frozen, in an isolated frame.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = 'prototypes/wip/activity-cards/';
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const script = text => text.replace(/<\/script/gi, '<\\/script');
const specimens = require('../prototypes/wip/activity-cards/record-specimens.cjs');

const template = file => read(source + file).replace(/<!--[\s\S]*?-->\s*/g, '').trim();

function themeStyles() {
  const icons = read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(
    /@font-face\s*\{[^}]*\}/g,
    '@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,'
      + fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64')
      + ') format("woff2");font-display:block}'
  );
  return [
    // Native base first: it sets html{font-size:62.5%}, as on a real iMIS page.
    read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css'),
    read('Theme/UnionSuite/99-Orion.css'),
    read('Theme/UnionSuite/zUnionSuite.css'),
    read('Theme/UnionSuite-Client/Branding.css'),
    read('Theme/UnionSuite/zzDarkMode.css'),
    icons
  ].join('\n');
}

// The same composition the task row workbench uses: everything before the
// banner behaviour, which covers the native wrapper and list adapters.
function sharedScript() {
  return read('Theme/UnionSuite/zUnionSuite.js').split('/* US-BANNER-BEHAVIOUR:START */')[0];
}

// A blank field is how an IQA returns an unused optional alias.
function render(file, record) {
  return template(file).replace(/\{#query\.(\w+)\}/g, (token, field) => esc(field in record ? record[field] : ''));
}

function panel(title, body) {
  return `<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">${esc(title)}</h2></div>`
    + `<div class="panel-body-container"><div class="panel-body">${body}</div></div></div>`;
}

// A Query Template Display: us-records in the iPart CSS class field (its own
// div inside ContentItemContainer), Display in cards off.
function list(specimen) {
  const items = specimen.records.map((record, index) =>
    `<section data-item="${specimen.id}-${index}" class="mb-3"><div class="QueryTemplateItem">${render(specimen.template, record)}</div></section>`).join('');
  return `<div class="ContentItemContainer"><div class="us-records">${panel(specimen.panelTitle, `<div class="QueryTemplateSet">${items}</div>`)}</div></div>`;
}

// The activity feed: the one-row host whose template is the .us-activity-feed
// element, one source per type. The real US-ACTIVITY-FEED module fills it,
// from the sample-data responses below.
const FEED_FOLDER = '$/Workbench/Activity';

function feed(specimen) {
  const sources = specimen.filters.filter(([type]) => type !== 'all').map(([type, label, history]) =>
    `<li data-source="${type}" data-query="${esc(label)}" data-type="${type}"${history ? ` data-history="${esc(history)}"` : ''}></li>`).join('');
  const host = `<div class="QueryTemplateSet"><section data-item="${specimen.id}-host"><div class="QueryTemplateItem">`
    + `<div class="us-activity-feed" data-us-activity-folder="${FEED_FOLDER}" data-us-activity-filter="ID" data-us-activity-value="004821"`
    + ` data-us-activity-today="2026-05-14" data-us-activity-history="#full-history"><ul class="us-activity__sources" hidden>${sources}</ul></div>`
    + `</div></section></div>`;
  return `<div class="ContentItemContainer">${panel(specimen.panelTitle, host)}</div>`;
}

// The sample records in the feed's IQA field contract, one list per source.
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function activityDate(record) {
  const [day, month, year = record.Month.split(' ')[1]] = record.DateShort.split(' ');
  const [, hour = '0', minute = '00', half = 'am'] = (record.TimeText || '').match(/^(\d+):(\d+) (am|pm)$/) || [];
  const hours = (Number(hour) % 12) + (half === 'pm' ? 12 : 0);
  const pad = value => String(value).padStart(2, '0');
  return `${year}-${pad(MONTH_NAMES.indexOf(month) + 1)}-${pad(day)}T${pad(hours)}:${minute}:00`;
}

function toContract(record) {
  return {
    ActivityKey: record.ActivityKey,
    ActivityDate: activityDate(record),
    Subject: record.Subject || '',
    Summary: record.Summary || '',
    Detail: record.Detail || '',
    StaffName: record.StaffName || '',
    With: record.With || '',
    Duration: record.Duration || '',
    Outcome: record.Outcome || '',
    OutcomeTone: record.OutcomeTone || '',
    CaseRef: record.CaseRef || '',
    CaseUrl: record.CaseUrl || '',
    RecordUrl: record.RecordUrl || '',
    AttachmentCount: Number.parseInt(record.AttachmentLabel, 10) || '',
    Direction: record.DirectionLabel ? (/^(received|inbound)$/i.test(record.DirectionLabel) ? 'In' : 'Out') : '',
    PriorityFlag: record.PriorityFlag || ''
  };
}

// Answers the feed's GET /api/query requests from the sample records: the
// ID, StartDate, limit and offset parameters behave as the IQAs would.
function feedResponder() {
  const specimen = specimens.find(item => item.kind === 'feed');
  const data = {};
  specimen.filters.filter(([type]) => type !== 'all').forEach(([type, label]) => {
    data[label] = specimen.records.filter(record => record.ActivityType === type).map(toContract);
  });
  return `/* Workbench only: sample-data answers for US-ACTIVITY-FEED. */
(function () {
  'use strict';
  const folder = ${JSON.stringify(FEED_FOLDER + '/')};
  const data = ${JSON.stringify(data)};
  const original = window.fetch;
  window.fetch = async (input, options = {}) => {
    const url = new URL(input, window.location.href);
    const name = url.searchParams.get('QueryName') || '';
    if (!url.pathname.endsWith('/api/query') || !name.startsWith(folder)) {
      return original ? original(input, options) : Promise.reject(new Error('Offline workbench'));
    }
    const start = url.searchParams.get('StartDate') || '';
    const rows = (url.searchParams.get('ID') === '004821' ? data[name.slice(folder.length)] || [] : [])
      .filter(row => row.ActivityDate.slice(0, 10) >= start)
      .sort((a, b) => b.ActivityDate.localeCompare(a.ActivityDate));
    const limit = Number(url.searchParams.get('limit')) || 100;
    const offset = Number(url.searchParams.get('offset')) || 0;
    const page = rows.slice(offset, offset + limit);
    return { ok: true, status: 200, json: async () => ({ TotalCount: rows.length, HasNext: offset + page.length < rows.length, Items: { $values: page } }) };
  };
})();`;
}

// The feed's own chrome and the slim section switcher it uses (v3 items 32
// and 2), taken from the contact page v3 candidate so both show one design.
const V3 = 'prototypes/wip/contact-page-v3/';

function feedStyles() {
  const css = read(V3 + 'theme-candidate.css');
  const switcher = css.match(/\/\* -{10,}\n   2\. Standalone section switcher[\s\S]*?(?=\/\* -{10,}\n   3\. )/);
  const chrome = css.match(/\/\* -{10,}\n   32\. Recent activity feed[\s\S]*$/);
  if (!switcher || !chrome) throw new Error('Could not find v3 candidate sections 2 and 32.');
  return switcher[0] + '\n' + chrome[0];
}

function feedScript() {
  const js = read(V3 + 'theme-candidate.js');
  const block = js.match(/\/\* US-ACTIVITY-FEED:START[\s\S]*?\/\* US-ACTIVITY-FEED:END \*\//);
  if (!block) throw new Error('Could not find the US-ACTIVITY-FEED block.');
  return block[0];
}

function candidateFrame(specimen) {
  const content = specimen.kind === 'feed' ? feed(specimen) : list(specimen);
  return `<div class="wb-variant wb-variant--candidate">
    <p class="wb-variant__label">Candidate</p>
    <div class="wb-stage__frame">
      <div class="iMIS-WebPart">${content}</div>
    </div>
  </div>`;
}

// The owner's supplied card, frozen: its own markup, inline values, palette
// and Font Awesome icons, filled from the same records. Nothing from the
// theme or candidate reaches it (an iframe document of its own).
const ORIGINAL_TYPES = {
  call: { label: 'Call', plural: 'Calls', icon: 'fa-phone', fg: '#1f63c9', bg: '#e8f0fb' },
  email: { label: 'Email', plural: 'Emails', icon: 'fa-envelope', fg: '#6d28d9', bg: '#ede9fe' },
  note: { label: 'Note', plural: 'Notes', icon: 'fa-note-sticky', fg: '#b45309', bg: '#fef3c7' },
  interaction: { label: 'Interaction', plural: 'Interactions', icon: 'fa-note-sticky', fg: '#b45309', bg: '#fef3c7' },
  meeting: { label: 'Meeting', plural: 'Meetings', icon: 'fa-users', fg: '#0f766e', bg: '#ccfbf1' },
  sms: { label: 'SMS', plural: 'SMS', icon: 'fa-comment-dots', fg: '#be185d', bg: '#fce7f3' }
};

function originalItem(record) {
  const type = ORIGINAL_TYPES[record.ActivityType] || ORIGINAL_TYPES.note;
  const inward = /^(received|inbound)$/i.test(record.DirectionLabel || '');
  const tags = [
    `<span class="o-pill" style="color:${type.fg};background:${type.bg}">${esc(type.label)}</span>`,
    record.DirectionLabel ? `<span class="o-dir"><i class="fa ${inward ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>${esc(record.DirectionLabel)}</span>` : '',
    record.CaseRef ? `<span class="o-case"><i class="fa fa-link"></i>${esc(record.CaseRef)}</span>` : ''
  ].join('');
  const meta = [['Handled by', record.StaffName || '—'], ['With', record.With], ['Duration', record.Duration], ['Outcome', record.Outcome]]
    .filter(([, value]) => value).map(([key, value]) => `<div><span>${esc(key)}</span><span>${esc(value)}</span></div>`).join('');
  return `<div class="o-item" data-type="${esc(record.ActivityType)}">
      <div class="o-node" style="color:${type.fg};background:${type.bg}"><i class="fa ${type.icon}"></i></div>
      <div class="o-box">
        <div class="o-row">
          <div class="o-main">
            <div class="o-tags">${tags}</div>
            ${record.Subject ? `<div class="o-subject">${esc(record.Subject)}</div>` : ''}
            <div class="o-preview">${esc(record.Summary || '')}</div>
          </div>
          <div class="o-side"><span class="o-date">${esc(record.DateShort)}</span><span class="o-time">${esc(record.TimeText || '')}</span>
            <div class="o-acts"><button type="button" class="o-view">View</button><i class="fa fa-chevron-down o-chev"></i></div></div>
        </div>
        <div class="o-more" hidden>
          <div class="o-meta">${meta}</div>
          <p class="o-body">${esc(record.Detail || record.Summary || '')}</p>
          ${record.AttachmentLabel ? `<div class="o-att"><i class="fa fa-paperclip"></i><span>${esc(record.AttachmentLabel)}</span></div>` : ''}
          <div><button type="button" class="o-primary"><i class="fa fa-up-right-from-square"></i>View full details</button></div>
        </div>
      </div>
    </div>`;
}

function originalFeed(specimen) {
  const count = type => specimen.records.filter(record => type === 'all' || record.ActivityType === type).length;
  const chips = specimen.filters.map(([type, label], index) => {
    const icon = type === 'all' ? 'fa-layer-group' : (ORIGINAL_TYPES[type] || ORIGINAL_TYPES.note).icon;
    return `<button type="button" class="o-chip" data-type="${type}" aria-pressed="${index === 0}"><i class="fa ${icon}"></i>${esc(label)} (${count(type)})</button>`;
  }).join('');
  const months = [...new Set(specimen.records.map(record => record.Month))];
  const groups = months.map(month => `    <div class="o-month">${esc(month)}</div>
    <div class="o-group"><div class="o-rail"></div>${specimen.records.filter(record => record.Month === month).map(originalItem).join('')}</div>`).join('\n');
  const font = fs.readFileSync(path.join(root, source + 'supplied/fa-solid-900.woff2')).toString('base64');
  const replacements = {
    '/* FONT */': font,
    '<!-- COUNT -->': `${specimen.records.length} of ${specimen.records.length}`,
    '<!-- CHIPS -->': chips,
    '<!-- GROUPS -->': groups
  };
  let page = read(source + 'supplied/Original-Feed.html');
  for (const [marker, value] of Object.entries(replacements)) {
    if (!page.includes(marker)) throw new Error(`Original-Feed.html is missing the ${marker} marker.`);
    page = page.replace(marker, () => value);
  }
  return `<div class="wb-variant wb-variant--supplied">
    <p class="wb-variant__label">Supplied (original, frozen)</p>
    <div class="wb-stage__frame"><iframe class="wb-original" title="Supplied Recent Activity card, original styling" srcdoc="${esc(page)}"></iframe></div>
  </div>`;
}

function stage(specimen) {
  const supplied = specimen.kind === 'feed' ? originalFeed(specimen) : '';
  return `<section class="wb-stage" id="${specimen.id}">
  <h2 class="wb-stage__title">${esc(specimen.title)}</h2>
  <p class="wb-stage__note">${esc(specimen.note)}</p>
  <div class="wb-stage__variants">${supplied}${candidateFrame(specimen)}</div>
</section>`;
}

const replacements = {
  '/* THEME_STYLES */': themeStyles(),
  '/* CANDIDATE_STYLES */': feedStyles() + '\n' + read(source + 'activity-cards.candidate.css'),
  '/* WORKBENCH_STYLES */': read(source + 'Activity-Cards.workbench.css'),
  '<!-- SPECIMENS -->': specimens.map(stage).join('\n'),
  '/* SHARED_SCRIPT */': script(sharedScript()),
  '/* CANDIDATE_SCRIPT */': script([feedResponder(), feedScript(), read(source + 'activity-cards.candidate.js')].join('\n')),
  '/* WORKBENCH_SCRIPT */': script(read(source + 'Activity-Cards.workbench.js'))
};

let output = read(source + 'Activity-Cards.source.html');
for (const [marker, replacement] of Object.entries(replacements)) {
  if (!output.includes(marker)) throw new Error(`Source is missing the ${marker} marker.`);
  output = output.replace(marker, () => replacement);
}

const destination = path.join(root, 'references/Activity-Cards-Workbench.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    throw new Error('Activity cards workbench is stale. Run node tools/build-activity-cards-workbench.cjs.');
  }
  console.log('Activity cards workbench is current.');
} else {
  fs.writeFileSync(destination, output);
  console.log('Built references/Activity-Cards-Workbench.html');
}
