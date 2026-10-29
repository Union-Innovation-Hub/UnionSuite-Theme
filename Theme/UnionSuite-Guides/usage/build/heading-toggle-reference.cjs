// Offline reference: every IQA heading icon toggle in every state, light and
// dark, from the production stylesheets. Writes references/Heading-Icon-Toggles.html.
//
// Forced states: a page cannot hold :hover, :active or :focus-visible open,
// so the frame script copies each theme rule that styles these buttons
// through one of those pseudo-classes, swapping the pseudo-class for a
// data-demo token and inserting the copy directly after the original. The
// copies keep the original selector, declarations and cascade position, so a
// forced cell renders exactly as the live state would; no value is restated
// here.
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const output = path.join(root, 'references/Heading-Icon-Toggles.html');

const sources = [
  'Theme/UnionSuite-Guides/usage/build/heading-toggle-reference.cjs',
  'Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css',
  'Theme/UnionSuite/99-Orion.css',
  'Theme/UnionSuite/zUnionSuite.css',
  'Theme/UnionSuite-Client/Branding.css',
  'Theme/UnionSuite-Client/Override.css',
  'Theme/UnionSuite/zzDarkMode.css',
  'Theme/UnionSuite/Tabler/tabler-icons.min.css',
  'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2'
];

// The theme's own icon() paths (zUnionSuite.js), read rather than restated.
function svgIcon(name) {
  const js = read('Theme/UnionSuite/zUnionSuite.js');
  const body = js.match(/function icon\(name\) \{\s*var paths = \(\{([\s\S]*?)\}\)\[name\];/);
  if (!body) throw Error('Theme icon() paths not found in zUnionSuite.js');
  const entry = body[1].match(new RegExp('\\b' + name + ':\\s*\\[([\\s\\S]*?)\\]'));
  if (!entry) throw Error('Theme icon() has no ' + name + ' path');
  const paths = [...entry[1].matchAll(/"([^"]+)"/g)].map(match => `<path d="${match[1]}"/>`).join('');
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
}

// Tabler: only the glyphs used here, plus the font embedded for offline use.
function tablerCss(names) {
  const source = read('Theme/UnionSuite/Tabler/tabler-icons.min.css');
  const font = fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64');
  const base = source.match(/\.ti\{[^}]+\}/);
  if (!base) throw Error('Tabler base .ti rule not found');
  const glyphs = names.map(name => {
    const rule = source.match(new RegExp('\\.ti-' + name + ':before\\{[^}]+\\}'));
    if (!rule) throw Error('Missing Tabler glyph: ' + name);
    return rule[0];
  });
  return `@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;src:url(data:font/woff2;base64,${font}) format("woff2")}\n` +
    base[0] + '\n' + glyphs.join('\n');
}

// Each toggle as the theme generates it. `on` holds what changes when the
// toggle is on; the expand toggle also swaps its icon and label.
function toggles() {
  const filterIcon = svgIcon('filter');
  return {
    queryTemplate: {
      title: 'Query Template panel',
      owner: 'data-us-query-display',
      body: '<div class="QueryTemplateSet"></div>',
      note: 'Query Template Display iParts. The runtime marks the panel <code>[data-us-query-display]</code> and builds these in its heading utilities (US-QUERY-SEARCH).',
      rows: [
        {
          name: 'Filter',
          detail: '<code>us-query-search</code> · opens the search row · <code>aria-expanded</code>',
          className: 'us-iqa-filter-toggle us-iqa-icon-button',
          state: 'aria-expanded',
          off: { label: 'Show filters', icon: filterIcon },
          on: { label: 'Hide filters', icon: filterIcon }
        },
        {
          name: 'Show completed tasks',
          detail: '<code>us-task-completed-filter</code> · <code>aria-pressed</code>',
          className: 'us-task-completed-toggle us-iqa-icon-button',
          state: 'aria-pressed',
          off: { label: 'Show completed tasks', icon: '<i class="ti ti-checkbox" aria-hidden="true"></i>' },
          on: { label: 'Show completed tasks', icon: '<i class="ti ti-checkbox" aria-hidden="true"></i>' }
        }
      ]
    },
    report: {
      title: 'IQA report (Query Menu)',
      owner: 'data-us-iqa-native',
      body: '',
      note: 'Native Query Menu reports. The runtime marks the panel <code>[data-us-iqa-native]</code> and builds these in its heading utilities.',
      rows: [
        {
          name: 'Filter',
          detail: 'Reports with a filter panel · <code>aria-expanded</code>',
          className: 'us-iqa-filter-toggle us-iqa-icon-button',
          extra: ' data-us-iqa-filter-toggle=""',
          state: 'aria-expanded',
          off: { label: 'Show filters', icon: filterIcon },
          on: { label: 'Hide filters', icon: filterIcon }
        },
        {
          // Not a toggle: iMIS's own Export dropdown, which the theme moves into
          // the utilities, gives the icon-button class and relabels (US-IQA
          // export relocation). "On" is its menu open. Markup as the theme
          // leaves it; the menu's native postback links are omitted.
          name: 'Export',
          detail: 'Native iMIS Export, relocated and restyled by the theme · <code>aria-expanded</code> while its menu is open',
          className: 'TextButton dropdown-toggle us-iqa-icon-button',
          extra: ' translate="no" data-toggle="dropdown" aria-haspopup="true"',
          wrap: ['<div class="btn-group us-iqa-native-export">', '</div>'],
          state: 'aria-expanded',
          off: { label: 'Export options', icon: 'Export <span class="caret"></span>' + svgIcon('download') },
          on: { label: 'Export options', icon: 'Export <span class="caret"></span>' + svgIcon('download') }
        },
        {
          name: 'Expand report',
          detail: '<code>us-report-expandable</code> · <code>aria-pressed</code>',
          className: 'us-iqa-icon-button us-iqa-expand-toggle',
          state: 'aria-pressed',
          off: { label: 'Expand report', icon: svgIcon('expand') },
          on: { label: 'Restore report size (Escape)', icon: svgIcon('restore') }
        }
      ]
    }
  };
}

// Columns: the first is live; the rest force one state each.
const columns = [
  { key: 'live', title: 'Live', hint: 'Hover, click, Tab', on: false, demo: '' },
  { key: 'off', title: 'Off', on: false, demo: '' },
  { key: 'hover', title: 'Hover', on: false, demo: 'hover' },
  { key: 'on', title: 'On', on: true, demo: '' },
  { key: 'on-hover', title: 'On + hover', on: true, demo: 'hover' },
  { key: 'press', title: 'Press', hint: 'Momentary', on: false, demo: 'active' },
  { key: 'focus', title: 'Keyboard focus', on: false, demo: 'focus' }
];

function button(row, column) {
  const face = column.on ? row.on : row.off;
  const live = column.key === 'live';
  const demo = column.demo ? ` data-demo="${column.demo}"` : '';
  const inert = live ? '' : ' tabindex="-1" data-demo-static=""';
  return `<button type="button" class="${row.className}"${row.extra || ''} ${row.state}="${column.on}"` +
    ` aria-label="${face.label}" title="${face.label}"${demo}${inert}` +
    (live ? ` data-live="${row.state}" data-label-off="${row.off.label}" data-label-on="${row.on.label}"` : '') +
    `>${face.icon}</button>`;
}

// One cell: the button inside its owner, in the owner's real structure. The
// theme defines the --iqa-* colours, and their dark remapping, partly by
// structure: a .ContentItemContainer wrapper whose panel body holds the
// results. Each cell carries that structure in an empty, hidden panel, so the
// theme's own selectors match as they do on a page; no colour is restated.
// Without it, a report owner matched by [data-us-iqa-native] alone keeps the
// light --iqa-selected in dark mode (see the page notes).
function cell(group, row, column) {
  const [before, after] = row.wrap || ['', ''];
  const utilities = `<div class="us-iqa-report-utilities">${before}${button(row, column)}${after}</div>`;
  return `<div class="ContentItemContainer"><div ${group.owner}="">${utilities}` +
    `<div class="panel" hidden><div class="panel-body-container"><div class="panel-body">${group.body}</div></div></div>` +
    '</div></div>';
}

function table(group) {
  const head = columns.map(column =>
    `<th scope="col">${column.title}${column.hint ? `<span>${column.hint}</span>` : ''}</th>`).join('');
  const rows = group.rows.map(row => {
    const cells = columns.map(column => `<td>${cell(group, row, column)}</td>`).join('');
    return `<tr><th scope="row">${row.name}<span>${row.detail}</span></th>${cells}</tr>`;
  }).join('\n');
  return `<section class="toggle-group">
  <h2>${group.title}</h2>
  <p>${group.note}</p>
  <div class="toggle-scroll"><table class="toggle-matrix">
    <thead><tr><th scope="col">Toggle</th>${head}</tr></thead>
    <tbody>
${rows}
    </tbody>
  </table></div>
</section>`;
}

// Frame script: force the pseudo-class states from the loaded theme rules,
// run the live column, then report the frame height to the page.
const frameScript = `(function () {
  var STATES = [[':hover', 'hover'], [':active', 'active'], [':focus-visible', 'focus']];
  var TARGET = /us-iqa-icon-button|us-task-completed-toggle|us-iqa-filter-toggle|us-iqa-expand-toggle|us-iqa-report-utilities button|TextButton|dropdown-toggle|btn-group/;
  function force(container) {
    for (var index = 0; index < container.cssRules.length; index += 1) {
      var rule = container.cssRules[index];
      if (rule.cssRules && !rule.selectorText) { force(rule); continue; }
      if (!rule.selectorText || !TARGET.test(rule.selectorText)) continue;
      var selector = rule.selectorText, changed = false;
      STATES.forEach(function (pair) {
        if (selector.indexOf(pair[0]) === -1) return;
        selector = selector.split(pair[0]).join('[data-demo~="' + pair[1] + '"]');
        changed = true;
      });
      if (!changed) continue;
      // Directly after the original, so the cascade order is unchanged.
      container.insertRule(selector + '{' + rule.style.cssText + '}', index + 1);
      index += 1;
    }
  }
  Array.prototype.forEach.call(document.styleSheets, force);

  document.querySelectorAll('[data-live]').forEach(function (control) {
    control.addEventListener('click', function () {
      var attribute = control.getAttribute('data-live');
      var on = control.getAttribute(attribute) !== 'true';
      control.setAttribute(attribute, String(on));
      var label = control.getAttribute(on ? 'data-label-on' : 'data-label-off');
      control.setAttribute('aria-label', label);
      control.title = label;
      // The expand toggle's icon follows its state, as in the theme.
      var template = document.getElementById(on ? 'expand-restore-icon' : 'expand-expand-icon');
      if (control.classList.contains('us-iqa-expand-toggle') && template) control.innerHTML = template.innerHTML;
    });
  });

  // scrollHeight never reports less than the frame itself, so measure the
  // content: the last group's bottom plus the body's bottom padding.
  function report() {
    var groups = document.querySelectorAll('.toggle-group');
    var last = groups[groups.length - 1];
    var padding = parseFloat(getComputedStyle(document.body).paddingBottom) || 0;
    var height = last ? last.getBoundingClientRect().bottom + scrollY + padding : document.documentElement.scrollHeight;
    parent.postMessage({ headingToggleFrame: window.name, height: height }, '*');
  }
  addEventListener('load', report);
  addEventListener('resize', report);
  report();
})();`;

function frameDocument() {
  const native = (read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css') + '\n' + read('Theme/UnionSuite/99-Orion.css'))
    .replace(/@import\s+[^;]+;/g, '')
    .replace(/@font-face\s*\{[^}]*\}/g, '');
  const groups = toggles();
  const css = [
    native,
    read('Theme/UnionSuite/zUnionSuite.css'),
    read('Theme/UnionSuite-Client/Branding.css'),
    read('Theme/UnionSuite-Client/Override.css'),
    read('Theme/UnionSuite/zzDarkMode.css'),
    tablerCss(['checkbox'])
  ].join('\n');
  // Preview-only frame layout.
  const frameCss = `
body { margin: 0; padding: 20px; background: var(--bg-page); color: var(--text-base); font: 14px/1.5 var(--font-ui); }
.toggle-group + .toggle-group { margin-top: 28px; }
.toggle-group h2 { margin: 0 0 4px; color: var(--text-strong); font: 600 16px/1.4 var(--font-ui); }
.toggle-group > p { margin: 0 0 12px; color: var(--text-muted); font-size: 13px; }
.toggle-scroll { overflow-x: auto; border: 1px solid var(--border); border-radius: 12px; background: var(--bg-surface); }
.toggle-matrix { width: 100%; border-collapse: collapse; }
.toggle-matrix th, .toggle-matrix td { padding: 10px 12px; border-bottom: 1px solid var(--border); text-align: center; vertical-align: middle; }
.toggle-matrix tbody tr:last-child > * { border-bottom: 0; }
.toggle-matrix thead th { background: var(--bg-subtle); color: var(--text-muted); font: 700 11px/1.4 var(--font-ui); letter-spacing: .06em; text-transform: uppercase; white-space: nowrap; }
.toggle-matrix thead th span { display: block; font-weight: 400; letter-spacing: 0; text-transform: none; }
.toggle-matrix tbody th { min-width: 200px; color: var(--text-strong); font: 600 13px/1.4 var(--font-ui); text-align: left; }
.toggle-matrix tbody th > span { display: block; margin-top: 2px; color: var(--text-muted); font-weight: 400; font-size: 12px; }
.toggle-matrix td > div { display: flex; justify-content: center; }
.toggle-matrix td:nth-child(2) { background: var(--bg-subtle); }
[data-demo-static] { pointer-events: none; }
.toggle-matrix .ContentItemContainer { margin: 0; padding: 0; }
.toggle-matrix td .panel[hidden] { display: none; }
`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Heading icon toggles</title>
<style>${css}</style>
<style>${frameCss}</style></head>
<body>
${table(groups.queryTemplate)}
${table(groups.report)}
<template id="expand-expand-icon">${svgIcon('expand')}</template>
<template id="expand-restore-icon">${svgIcon('restore')}</template>
<script>${frameScript}</script>
</body></html>`;
}

function documentHtml() {
  const frame = frameDocument();
  if (frame.includes('</scr' + 'ipt><scr' + 'ipt')) throw Error('Unexpected script boundary in frame');
  // One copy of the frame, loaded twice: the dark frame only changes the
  // root colour-scheme attribute, as the shared appearance toggle does.
  const frameJson = JSON.stringify(frame).replace(/</g, '\\u003c');
  return `<!doctype html>
<!-- Generated by Theme/UnionSuite-Guides/usage/build/heading-toggle-reference.cjs. Production styles; do not edit. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Heading Icon Toggles</title>
<style>
:root { color-scheme: light; --ink: #1c2024; --muted: #545962; --line: #e2e5e9; --teal: #006f94; --page: #eeeeef; }
body { margin: 0; background: var(--page); color: var(--ink); font: 15px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 48px; }
h1 { margin: 0 0 8px; color: #003a4c; font-size: 28px; line-height: 1.25; }
h2 { margin: 32px 0 8px; color: #003a4c; font-size: 19px; }
p, li { max-width: 78ch; }
a { color: var(--teal); }
code { padding: 1px 5px; border-radius: 4px; background: #fff; font-size: .9em; }
.frame-wrap { margin-top: 12px; border-radius: 14px; overflow: hidden; box-shadow: 0 1px 2px rgba(0, 27, 35, .08); }
iframe { display: block; width: 100%; height: 640px; border: 0; }
.legend { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; margin: 12px 0 0; padding: 0; }
.legend dt { font-weight: 600; }
.legend dd { margin: 0; color: var(--muted); }
.notes { padding-left: 20px; }
.notes li { margin: 6px 0; }
</style></head>
<body><main>
  <h1>Heading icon toggles</h1>
  <p>The small square buttons in IQA and Query Template panel headings, in every state, rendered with the production stylesheets. Every toggle shares one on state: a <code>.us-iqa-icon-button</code> with <code>aria-expanded="true"</code> or <code>aria-pressed="true"</code> takes the <code>--iqa-selected</code> fill, a <code>--iqa-link</code> icon, a faint link-coloured border and a slight inset shadow, and every one shares a 2px <code>--border-focus</code> keyboard focus ring (<code>zUnionSuite.css</code>, US-QUERY-SEARCH). Read across a row to check one toggle; read down a column to check they match.</p>
  <dl class="legend">
    <dt>Live</dt><dd>Real buttons: hover, click to switch on and off, Tab to focus.</dd>
    <dt>Off / On</dt><dd>The resting states, from the ARIA attribute.</dd>
    <dt>Hover, Press, Keyboard focus</dt><dd>Held open by copying the theme's own <code>:hover</code>, <code>:active</code> and <code>:focus-visible</code> rules onto a data attribute, in the same cascade position. Nothing is restated.</dd>
  </dl>

  <h2>Light</h2>
  <div class="frame-wrap"><iframe name="light" title="Heading icon toggles, light mode"></iframe></div>

  <h2>Dark</h2>
  <div class="frame-wrap"><iframe name="dark" title="Heading icon toggles, dark mode"></iframe></div>

  <h2>Notes</h2>
  <ul class="notes">
    <li><strong>Forced colours</strong> (Windows high contrast) cannot be emulated by a page. There, the on state draws a 2px <code>Highlight</code> border for every toggle; emulate it with the browser's rendering tools to check.</li>
    <li><strong>Keyboard focus</strong> shows only the theme's own focus rules; the page adds none. Every heading icon button, including the relocated native Export, takes the one shared ring, so a cell without a ring would mean a button outside that rule.</li>
    <li><strong>Dark mode depends on panel structure.</strong> The dark rule that remaps <code>--iqa-selected</code> for <code>.us-report</code>, <code>[data-us-iqa-native]</code> and <code>[data-us-panel]</code> owners is outranked by the light rule, whose <code>:is()</code> list includes a long <code>:has()</code> selector. Owners inside a <code>.ContentItemContainer</code> with a panel body, which is every iPart today, are rescued by the second, structural dark rule. An owner without that structure would keep the pale light fill under a pale icon in dark mode. Each cell here carries the real structure in a hidden, empty panel.</li>
    <li>Buttons sit in the owner context the runtime creates (<code>[data-us-query-display]</code>, <code>[data-us-iqa-native]</code>), written statically so every state shows at once. For the runtime-generated controls see the usage guide: <a href="../Theme/UnionSuite-Guides/Usage-Guide.html#query-template-search">Query Template search</a>, <a href="../Theme/UnionSuite-Guides/Usage-Guide.html#task-completed-filter">Show completed tasks</a> and <a href="../Theme/UnionSuite-Guides/Usage-Guide.html#reports">reports</a>.</li>
  </ul>
</main>
<script>
(function () {
  var frame = ${frameJson};
  document.querySelectorAll('iframe[name]').forEach(function (element) {
    var scheme = element.name === 'dark' ? ' data-us-color-scheme="dark"' : '';
    element.srcdoc = frame.replace('<html lang="en">', '<html lang="en"' + scheme + '>');
  });
  addEventListener('message', function (event) {
    var data = event.data || {};
    var target = data.headingToggleFrame && document.querySelector('iframe[name="' + data.headingToggleFrame + '"]');
    if (target && data.height) target.style.height = Math.ceil(data.height) + 'px';
  });
})();
</script>
</body></html>`;
}

function build(check) {
  const html = documentHtml();
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== html) {
      console.error('Heading icon toggle reference is stale.');
      process.exitCode = 1;
    } else console.log('Heading icon toggle reference is current.');
  } else {
    fs.writeFileSync(output, html);
    console.log('Built references/Heading-Icon-Toggles.html.');
  }
}

module.exports = { documentHtml, frameDocument, build, sources };
if (require.main === module) build(process.argv.includes('--check'));
