// Generated previews use canonical templates and theme assets, never copied styles.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const examples = require('../source/list-query-examples.cjs');
const queryFields = require('./query-template-fields.cjs');
const sources = [__filename.replace(root + path.sep, '').replaceAll('\\', '/'), 'Theme/UnionSuite-Guides/usage/source/list-query-examples.cjs', 'Theme/UnionSuite-Guides/usage/source/list-examples.css', 'Theme/UnionSuite-Guides/usage/source/list-examples.js', 'Theme/UnionSuite-Client/Branding.css', 'Theme/UnionSuite/Scripts/ActionDefinitions.js', ...new Set(examples.map(x => 'Theme/UnionSuite-Guides/usage/templates/List-Templates/' + x.file)), 'Theme/UnionSuite-Guides/usage/templates/List-Templates/Native-Bulletin.html', 'Theme/UnionSuite-Guides/usage/templates/List-Templates/Native-Bulletin-Plain.html'];
const template = file => read('Theme/UnionSuite-Guides/usage/templates/List-Templates/' + file).replace(/<!--[\s\S]*?-->\s*/g, '').trim();
sources.push('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html');
sources.push('Theme/UnionSuite-Guides/usage/source/contact-records.cjs');
sources.push(...queryFields.sources);
function snippet(id, value, label = 'Query Template field · one result') {
  return `<div class="snippet"><div class="snippet-bar"><span>${esc(label)}</span><button type="button" class="TextButton LinkButton" data-copy="list-code-${id}">Copy HTML</button></div><pre tabindex="0" aria-label="${esc(label)}"><code id="list-code-${id}">${esc(value)}</code></pre></div>`;
}
function classValue(example, copy = true) {
  return example.classes ? (copy ? `<button type="button" class="TextButton LinkButton" data-copy-text="${esc(example.classes)}" aria-label="Copy ${esc(example.title)} iPart CSS class"><code>${esc(example.classes)}</code></button>` : `<code>${esc(example.classes)}</code>`) : 'Leave blank';
}
function commonSettings() {
  return `<div class="list-reference__defaults"><h3>Common iPart settings</h3><p>Apply these defaults, then use the settings and template for your chosen example. Install the updated <code>99-Orion.css</code> and <code>zUnionSuite.css</code> in their existing order before client branding/overrides.</p><table><thead><tr><th>Setting</th><th>Value</th></tr></thead><tbody>
    <tr><th scope="row">iPart</th><td>Query Template Display</td></tr>
    <tr><th scope="row">Stable empty-state shell</th><td>Use <code>us-query-template</code> in the iPart CSS class field unless the recipe already uses <code>us-query-search</code>, <code>us-list-scroll</code> or <code>us-task-completed-filter</code>. These declarations keep the outer card when iMIS omits the result list. No results HTML stays separate from the repeating template.</td></tr>
    <tr><th scope="row">Heading level</th><td>2 (the item templates use h3; adjust both levels together if the page requires it)</td></tr>
    <tr><th scope="row">Display in columns</th><td>Unchecked; Number of columns is not used</td></tr>
    <tr><th scope="row">Display a border around this content</th><td>Unchecked for these examples; the theme supplies the outer panel shell</td></tr>
    <tr><th scope="row">Display content within a collapsible panel</th><td>Unchecked</td></tr>
    <tr><th scope="row">Pager position / Use simple pager</th><td>Center / Unchecked (numbered pager)</td></tr>
    <tr><th scope="row">Header / Footer</th><td>Leave blank by default, or keep your configured once-per-list text. Enter it in those two fields; iMIS creates their wrappers.</td></tr>
    <tr><th scope="row">Hide when there are no results</th><td>Unchecked to show the example’s No results message. Check it instead if you want the whole iPart hidden.</td></tr>
  </tbody></table><p><strong>Selected query columns:</strong> every <code>{#query.FieldName}</code> referenced in the template HTML must be included in the IQA Select/display column list with a matching output alias. This includes links and <code>data-*</code> attributes, even search-only fields. For an unused optional field, add a selected custom SQL column returning <code>''</code> (two single quotes) with that alias, or remove every reference from the HTML, including the relevant optional block, links and search tokens. For example, keep <code>{#query.Email}</code> by selecting a custom SQL expression <code>''</code> with output alias <code>Email</code>. Optional values may be blank; referenced columns cannot be omitted. CSS/JavaScript hiding does not change this requirement.</p><p>Keep your existing audience, permissions and query access settings. These recipes configure presentation; they do not change who can view records. Rows per page are suggested starting values.</p></div>`;
}
function recipe(example) {
  const {id,panelTitle,rows,query,order,mapping,optional,empty,file} = example;
  return `<p>Apply the common settings above, then set:</p><table><thead><tr><th>iPart setting</th><th>Value</th></tr></thead><tbody>
    <tr><th scope="row">Title</th><td>${esc(panelTitle)}</td></tr>
    <tr><th scope="row">Display in cards</th><td>${example.cards===false?'Unchecked':'Checked'}</td></tr>
    <tr><th scope="row">CSS class</th><td>${classValue(example)}</td></tr>
    <tr><th scope="row">Rows per page</th><td>${rows}</td></tr>
    <tr><th scope="row">Source query</th><td>${esc(query)}</td></tr>
    <tr><th scope="row">Query filtering / sorting</th><td>${esc(order)}</td></tr>
  </tbody></table><p><strong>Query mapping:</strong> ${esc(mapping || 'These are suggested output aliases, not confirmed field names from your database. Match your source query’s output aliases to these names, or replace the tokens below with that query’s existing substitutions. Dates should be formatted by the query.')}</p>${queryFields.table(file,template(file))}<p><strong>Query Template field:</strong> paste all of the following HTML once. iMIS repeats it for each result and supplies the panel, list and card wrappers.</p>${snippet(id,template(file))}<p><strong>Header field:</strong> leave blank, or supply your own once-per-list content. Search and header-action classes generate their controls without Header HTML.</p>${example.footer ? '<p><strong>Footer field:</strong> paste the following once for the whole list; replace /your-tasks-page with the real destination.</p>'+queryFields.table(example.footer,template(example.footer))+snippet(id+'-footer',template(example.footer),'Footer field · once for the whole query') : '<p><strong>Footer field:</strong> leave blank, or supply your own once-per-list content. Any us-list__footer inside the repeating HTML belongs to that individual result.</p>'}<p>${esc(optional)}</p><p><strong>No results field:</strong> paste this separately. It is not part of the repeating template.</p>${snippet(id+'-empty','<p>'+empty+'</p>','No results field')}`;
}
function recipes() {
  return commonSettings() + examples.map(example => `<details id="list-recipe-${example.id}"><summary>${esc(example.title)} — iPart settings and Query Template</summary>${recipe(example)}</details>`).join('\n');
}
// Build-time fixture only: render the same one-result templates with fictional
// records, then add the native wrappers iMIS generates. Never offered for copying.
function nativePreview(example) {
  const items = example.records.map(record => {
    const content = template(example.file).replace(/\{#query\.(\w+)( noencode)?\}/g, (_,field,raw) => {
      if (!Object.hasOwn(record,field)) throw Error(`Missing demo field ${example.id}.${field}`);
      return raw ? record[field] : esc(record[field]);
    });
    return `<section data-item="demo-${example.id}" class="mb-3"><div class="${example.cards===false?'':'card '}QueryTemplateItem">${example.cards===false?content:'<div class="card-body">'+content+'</div>'}</div></section>`;
  }).join('\n');
  return `<div class="iMIS-WebPart"><div class="ContentItemContainer">${example.classes ? '<div class="'+esc(example.classes)+'">' : ''}<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">${esc(example.panelTitle)}</h2></div><div class="panel-body-container"><div class="panel-body"><div id="demo-${example.id}" class="QueryTemplateSet simplePaginateList">${items}</div>${example.footer?template(example.footer).replace('/your-tasks-page','#example'):''}</div></div></div>${example.classes ? '</div>' : ''}</div></div>`;
}
function documentHtml({nativePreviewCss, theme, branding = '', standalone = false}) {
  if(standalone) theme+='\n'+read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(/@font-face\s*\{[^}]*\}/g,'@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,'+fs.readFileSync(path.join(root,'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64')+') format("woff2");font-display:block}');
  const sharedSource = read('Theme/UnionSuite/zUnionSuite.js');
  const sharedSearch = sharedSource.split('/* US-BANNER-BEHAVIOUR:START */')[0] + '\n' + sharedSource.match(/\/\* US-ACTION-ICONS:START \*\/[\s\S]*?\/\* US-ACTION-ICONS:END \*\//)[0] + '\n' + sharedSource.match(/\/\* US-TASK-ROWS:START[\s\S]*?US-TASK-ROWS:END \*\//)[0]
    // The task rows' title link and pencil are site actions: load their
    // definitions, with iMIS's popup stubbed (the examples only log it).
    + '\nwindow.ShowDialog_NoReturnValue = window.ShowDialog_NoReturnValue || function (url) { console.info("Would open", url); };\n'
    + read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
  const items = examples.map(example => `<section class="list-reference__example" id="${example.id}"><h2>${esc(example.title)}</h2><p class="list-reference__description">${esc(example.description)}</p><div class="list-reference__recipe"><span>iPart CSS class:</span>${classValue(example,standalone)}</div>${nativePreview(example)}${standalone ? `<details><summary>iPart settings and Query Template</summary>${recipe(example)}</details>` : ''}</section>`).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Union Suite — Query Template Display recipes</title><style>${nativePreviewCss}\n${theme}\n${branding}\n${read('Theme/UnionSuite-Guides/usage/source/list-examples.css')}</style></head><body><main class="list-reference">${standalone ? '<header class="list-reference__intro"><p class="list-reference__eyebrow">UNION SUITE / QUERY TEMPLATE DISPLAY</p><h1>Configure the iPart. Paste one item.</h1><p>Each example gives you the iPart settings and HTML for the repeating Query Template field. iMIS supplies the outer panel, list and card wrappers.</p><p>The previews use those native wrappers and fictional records. They are generated from the same single-item templates you copy below; no live queries or pagination run here.</p><p><a href="../Theme/UnionSuite-Guides/Usage-Guide.html#content-lists">Complete usage guide</a> · <a href="Query-Template-Structure.html">Compare cards checked, unchecked and no-shell</a></p></header><details class="list-reference__common"><summary>Common iPart settings — apply to every example</summary>'+commonSettings()+'</details>' : ''}<div class="list-reference__grid">${items}</div></main><div id="list-reference-status" class="list-reference__status" role="status" aria-live="polite"></div><script>${sharedSearch}
${read('Theme/UnionSuite-Guides/usage/source/list-examples.js')}</script></body></html>`;
}
function nativeComparison({nativePreviewCss, theme}) {
  const variants=[['cards','Display in cards: checked','Native-Bulletin.html'],['plain','Display in cards: unchecked','Native-Bulletin-Plain.html'],['no-shell','Cards checked + us-list--no-shell','Native-Bulletin.html']];
  const sections=variants.map(([id,title,file])=>{
    let markup=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/'+file);
    if(id==='no-shell') markup=markup.replace('<div class="ContentItemContainer">','<div class="ContentItemContainer"><div class="us-list--no-shell">').replace(/<\/div>\s*$/, '</div></div>');
    return '<section class="list-reference__example" id="check-'+id+'"><h2>'+title+'</h2>'+markup+'</section>';
  }).join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Query Template Display structure check</title><style>'+nativePreviewCss+theme+read('Theme/UnionSuite-Client/Branding.css')+read('Theme/UnionSuite-Guides/usage/source/list-examples.css')+'</style></head><body><main class="list-reference"><header class="list-reference__intro"><h1>Panel, item shell and content</h1><p>Rendered structure supplied for the staff bulletin. Header and footer remain outside the repeated items. No iMIS query or paging scripts run in this local comparison.</p></header><div class="list-reference__grid">'+sections+'</div></main></body></html>';
}
function build(assets, check) {
  const output = path.join(root, 'references/List-Templates.html');
  const html = documentHtml({...assets, branding:read('Theme/UnionSuite-Client/Branding.css'), standalone:true});
  const comparisonOutput=path.join(root,'references/Query-Template-Structure.html');
  const comparison=nativeComparison(assets);
  if(check){if(!fs.existsSync(comparisonOutput)||fs.readFileSync(comparisonOutput,'utf8')!==comparison){console.error('Query Template structure reference is stale.');process.exitCode=1;}}else fs.writeFileSync(comparisonOutput,comparison);
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== html) {
      console.error('List-Templates.html is stale. Run node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs.');
      process.exitCode = 1;
    } else console.log('List templates reference is current.');
  } else {
    fs.writeFileSync(output, html);
    console.log('Built references/List-Templates.html.');
  }
}
module.exports = {sources, documentHtml, recipes, nativeComparison, build};
