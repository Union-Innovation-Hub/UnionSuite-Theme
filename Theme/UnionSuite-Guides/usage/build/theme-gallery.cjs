const {actions,buttons} = require('../source/action-catalog.cjs');
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const chip = (classes,where) => `<button type="button" class="copy-class" data-copy-text="${esc(classes)}" title="Copy classes · ${esc(where)}" aria-label="Copy classes: ${esc(classes)}"><code>${esc(classes)}</code></button>`;
const recipe = (id,html,label='HTML template') => `<details class="example-code"><summary>${label}</summary><pre><code id="${id}">${esc(html)}</code></pre><button type="button" class="copy-template" data-copy="${id}">Copy template</button></details>`;
const icon = name => `<i class="ti ti-${name}" aria-hidden="true"></i>`;
function buttonGallery() {
  const cards = buttons.map((b,i)=>`<article class="example-card"><h3>${esc(b.label)}</h3><div class="sample"><button type="button" class="${b.classes}" data-sample-action>${esc(b.text)}</button></div>${chip(b.classes,'Button or link class attribute')}<p class="example-placement">Paste into the button/link's <code>class</code> attribute.</p><p>${esc(b.meaning)}</p>${recipe('button-'+i,`<button type="button" class="${b.classes}" disabled>${b.text}</button>`)}</article>`).join('');
  const extras = [
    ['Busy button — approved ring','us-button-spinner','Decorative span inside a button; handler manages disabled and aria-busy','<button type="button" class="TextButton PrimaryButton" disabled aria-busy="true"><span class="us-button-spinner" aria-hidden="true"></span> Saving…</button>'],
    ['Primary action wrapper','UsePrimaryButton','Container class attribute','<div class="UsePrimaryButton"><button type="button" class="TextButton">Primary action</button></div>'],
    ['Accent wrapper','AccentButton','Container class attribute','<div class="AccentButton"><button type="button" class="TextButton">Accent action</button></div>'],
    ['Button group','btn-group','Container around existing buttons','<div class="btn-group" role="group" aria-label="View options"><button type="button" class="btn">First</button><button type="button" class="btn">Second</button></div>'],
    ['Vertical group','btn-group-vertical','Container around existing buttons','<div class="btn-group-vertical" role="group" aria-label="View options"><button type="button" class="btn">First</button><button type="button" class="btn">Second</button></div>'],
    ['Justified links','btn-group btn-group-justified','Container around action links','<div class="btn-group btn-group-justified" role="group" aria-label="View options"><a class="btn" href="#example">First</a><a class="btn" href="#example">Second</a></div>'],
    ['Toolbar','btn-toolbar','Container around button groups','<div class="btn-toolbar" role="toolbar" aria-label="Example toolbar"><div class="btn-group"><button type="button" class="btn">First</button><button type="button" class="btn">Second</button></div></div>'],
    ['Disabled button','TextButton','Button class attribute; also add disabled','<button type="button" class="TextButton" disabled>Unavailable</button>'],
    ['Disabled link','TextButton aspNetDisabled','Link class attribute; remove href and handlers','<a class="TextButton aspNetDisabled" aria-disabled="true">Unavailable</a>']
  ].map(([title,classes,where,html],i)=>`<article class="example-card"><h3>${title}</h3><div class="sample">${html}</div>${chip(classes,where)}<p class="example-placement">${where}.</p>${recipe('button-extra-'+i,html.replace(/href="#example"/g,'aria-disabled="true"').replace(/<button type="button" class="([^"]+)">/g,'<button type="button" class="$1" disabled>'))}</article>`).join('');
  return `<p class="example-note">Every control below uses the actual native and shared theme CSS. Click a class chip to copy it. Active previews demonstrate styling only; templates keep commands disabled until you connect their real handler.</p><section class="example-section"><div class="example-grid">${cards}</div></section><section class="example-section"><h2>Wrappers, groups and availability</h2><div class="example-grid">${extras}</div></section>`;
}
function actionGallery() {
  return `<p class="example-note">25 shared meanings. The compact control and labelled button use the same Tabler glyph. These visual examples do not perform commands. Use the compact recipe for row actions, or the labelled recipe for prominent actions.</p><div class="example-grid">${actions.map((a,i)=>{
    const compact = 'TextButton us-icon-button'+(a.modifier?' '+a.modifier:'');
    const labelled = 'TextButton'+(a.modifier?' '+a.modifier:'');
    const title = a.label.split(' / ')[0];
    const compactHtml = `<button type="button" class="${compact}" aria-label="${title} [record name]" disabled>\n  ${icon(a.icon)}\n</button>`;
    const labelHtml = `<button type="button" class="${labelled}" disabled>\n  ${icon(a.icon)} ${title}\n</button>`;
    return `<article class="example-card" data-action-example="${a.icon}"><h3>${esc(a.label)}</h3><div class="sample"><button type="button" class="${compact}" aria-label="${esc(title)} sample record" data-sample-action>${icon(a.icon)}</button><button type="button" class="${labelled}" data-sample-action>${icon(a.icon)} ${esc(title)}</button></div>${chip(compact,'Outer button/link class attribute')}${chip('ti ti-'+a.icon,'Inner i/span class attribute')}<p class="example-placement">First chip: outer button/link. Second chip: inner icon element.</p><p>${esc(a.meaning)}</p>${recipe('action-icon-'+i,compactHtml,'Icon-only HTML template')}${recipe('action-label-'+i,labelHtml,'Labelled-button HTML template')}</article>`;
  }).join('')}</div>`;
}
function classCopies(html) {
  // Only documented author classes. Leave CSS selectors, runtime markers,
  // planned hooks, template code and token declarations as literal text.
  const table = html.match(/<table id="class-table">[\s\S]*?<\/table>/)?.[0] || '';
  const names = new Set(['Nav-Icon','Home','Organising','Cases','Agreements','Calls','Committees','Travel','Integrations','ti','us-icon-button']);
  for (const row of table.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>/g)) {
    for (const m of row[1].matchAll(/<code>([\w -]+)<\/code>/g)) m[1].split(' ').forEach(n=>names.add(n));
  }
  actions.forEach(a=>names.add('ti-'+a.icon));
  buttons.forEach(b=>b.classes.split(' ').forEach(n=>names.add(n)));
  ['ti-home','ti-users-group','ti-briefcase','ti-contract','ti-phone-outgoing','ti-plane','ti-settings','btn-group-vertical','btn-group-justified','btn-toolbar'].forEach(n=>names.add(n));
  // Explicit copy controls are already interactive; never nest another button
  // around the code label inside them.
  return html.split(/(<pre\b[\s\S]*?<\/pre>|<button\b[\s\S]*?<\/button>)/g).map(part=>/^<(?:pre|button)\b/.test(part)?part:part.replace(/<code>([\w -]+)<\/code>/g,(all,text)=>text.split(' ').every(n=>names.has(n))?chip(text,'See the adjacent placement instruction'):all)).join('');
}
module.exports = {buttonGallery,actionGallery,classCopies,chip,recipe,icon};
