// Generate one portable guide; no dependencies, network access or runtime fetches.
// Run from any directory: node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const uncomment = css => css.replace(/\/\*[\s\S]*?\*\//g, '');
const guideOutput = require('./guide-output.cjs');
const gallery = require('./theme-gallery.cjs');
const listTemplates = require('./list-template-examples.cjs');
const queryFields = require('./query-template-fields.cjs');
const reportIconExample = require('./report-icon-example.cjs');
const popupActionExample = require('./popup-action-example.cjs');
const queryTemplateRefreshExample = require('./query-template-refresh-example.cjs');
const inlineComposerExample = require('./inline-composer-example.cjs');
const casePartiesExample = require('./case-parties-example.cjs');
const changeHistoryExample = require('./change-history-example.cjs');
const caseMemberExample = require('./case-member-example.cjs');
const caseBannerExample = require('./case-banner-example.cjs');
const queryValueExample = require('./query-value-example.cjs');
const caseListsExample = require('./case-lists-example.cjs');
const actionConflictExample = require('./action-conflict-example.cjs');
const membership = require('./membership-stats-example.cjs');
const actionBuilder = require('./build-action-builder.cjs');
const theme = read('Theme/UnionSuite/zUnionSuite.css');
const themeJs = read('Theme/UnionSuite/zUnionSuite.js')+'\n'+read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
const behaviour = require('./theme-sources.cjs').bannerBehaviour(themeJs);
const tokenCss = theme.split('/* US-NATIVE-BUTTONS:START */')[0];
if (!tokenCss.includes('--seed-primary') || tokenCss.includes('.us-report')) throw Error('Token section boundary changed; update the guide builder.');
const embed = read('Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html');
function bannerSection(name) {
  const start = '/* US-BANNER-' + name + ':START */';
  const end = '/* US-BANNER-' + name + ':END */';
  if (theme.split(start).length !== 2 || theme.split(end).length !== 2) throw Error('Missing or duplicate banner CSS section: ' + name);
  return theme.split(start)[1].split(end)[0].trim();
}
const bannerCss = bannerSection('PAGE-LAYOUT') + '\n' + bannerSection('COMPONENT');
const buttonCss = theme.split('/* US-NATIVE-BUTTONS:START */')[1]?.split('/* US-NATIVE-BUTTONS:END */')[0];
const actionCss = theme.split('/* US-ACTION-ICONS:START */')[1]?.split('/* US-ACTION-ICONS:END */')[0];
if (!buttonCss?.includes('--button-bg:') || tokenCss.includes('.TextButton')) throw Error('Native button CSS boundaries changed.');
const orion = read('Theme/UnionSuite/99-Orion.css');
const nativeButtonCss = orion.split('/* set up button base styles */')[1]?.split('/* ==========================================================================' + '\n   ORION THEME STYLES')[0];
if (!nativeButtonCss?.includes('.SuccessButton')) throw Error('Native button foundation boundary changed.');
const nativeGroupCss = [...uncomment(read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css')).matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(m => /\.btn(?:\b|-)/.test(m[1])).map(m => m[0]).join('\n');
if (/<style\b/i.test(embed)) throw Error('Banner CSS belongs in the theme, not the compatibility embed.');
const template = read('Theme/UnionSuite-Guides/usage/templates/Banner-Template.html');
const compatibilityBehaviour = embed.match(/<script id="us-banner-behaviour">([\s\S]*?)<\/script>/)?.[1];
if (compatibilityBehaviour?.trim() !== behaviour || behaviour !== read('Theme/UnionSuite-Guides/usage/examples/Banner-Behaviour.js').trim()) throw Error('Legacy banner copies are out of sync with the theme. Run node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs first.');
const clientCss = uncomment(read('Theme/UnionSuite/zzClientSpecific.css'));
const clientRoots = [...clientCss.matchAll(/:root\s*\{[^}]*\}/g)].map(m => m[0]).join('\n');
const snippets = {
  'task-no-results': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-No-Results.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-No-Results.html')],
  'agreement-facts': ['Theme/UnionSuite-Guides/usage/templates/Banner-Agreement-Facts.html', read('Theme/UnionSuite-Guides/usage/templates/Banner-Agreement-Facts.html')],
  'case-details': ['Theme/UnionSuite-Guides/usage/templates/Case-Details-Content.html', read('Theme/UnionSuite-Guides/usage/templates/Case-Details-Content.html')],
  'copy-button': ['Theme/UnionSuite-Guides/usage/templates/Copy-Button-Template.html', read('Theme/UnionSuite-Guides/usage/templates/Copy-Button-Template.html')],
  'contact-row': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Contacts-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Contacts-Query-Template.html')],
  'case-parties': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html')],
  'case-member': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html')],
  'change-history': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html')],
  'system-alert': ['Theme/UnionSuite-Guides/usage/templates/System-Alert-Message.html', read('Theme/UnionSuite-Guides/usage/templates/System-Alert-Message.html')],
  attention: ['Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html', read('Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html')],
  'task-compact-row': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Compact-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Compact-Query-Template.html')],
  'task-full-row': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Full-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Full-Query-Template.html')],
  'task-detail-row': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html')],
  'task-row': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Completion-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Completion-Query-Template.html')],
  'task-footer': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html')],
  placeholder: ['Theme/UnionSuite-Guides/usage/templates/Placeholder-Content.html', read('Theme/UnionSuite-Guides/usage/templates/Placeholder-Content.html')],
  welcome: ['Theme/UnionSuite-Guides/usage/templates/Home/Welcome-Content.html', read('Theme/UnionSuite-Guides/usage/templates/Home/Welcome-Content.html')],
  actions: ["Theme/UnionSuite-Guides/usage/templates/Action-Menu-Template.html", read("Theme/UnionSuite-Guides/usage/templates/Action-Menu-Template.html")],
  "client-actions": ["Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js", read("Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js")],
  master: ['Theme/UnionSuite-Guides/usage/templates/Banner-Template.html', template],
  dashboard: ['Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html', read('Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html')],
  'attachments-count-footer': ['Theme/UnionSuite-Guides/usage/templates/List-Templates/Attachments-Count-Footer.html', read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Attachments-Count-Footer.html')],
  'case-rows': ['Theme/UnionSuite-Guides/usage/templates/Banner-Case-Rows-Query-Template.html', read('Theme/UnionSuite-Guides/usage/templates/Banner-Case-Rows-Query-Template.html')],
  case: ['Theme/UnionSuite-Guides/usage/templates/Banner-Case-Template.html', read('Theme/UnionSuite-Guides/usage/templates/Banner-Case-Template.html')],
  contact: ['Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html', read('Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html')],
  embed: ['Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html', embed],
  'banner-js': ['Theme/UnionSuite-Guides/usage/examples/Banner-Behaviour.js', read('Theme/UnionSuite-Guides/usage/examples/Banner-Behaviour.js')],
  buttons: ['Theme/UnionSuite-Guides/usage/source/Button-Examples.html', read('Theme/UnionSuite-Guides/usage/source/Button-Examples.html')]
};
function snippet(key) {
  const [file, content] = snippets[key];
  const name = file.split('/').pop();
  const authored = content.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<!--[\s\S]*?-->/g,'');
  if (/\{#query\.\w+/.test(authored) && !Object.hasOwn(queryFields.definitions,name)) throw Error('Copyable query HTML needs field definitions: '+file);
  const fields = Object.hasOwn(queryFields.definitions,name) ? queryFields.table(name,content) : '';
  return fields+`<div class="snippet"><div class="snippet-bar"><span>${esc(name)}</span><div><button type="button" data-copy="code-${key}">Copy</button><button type="button" data-download="code-${key}" data-filename="${esc(name)}">Download</button></div></div><pre tabindex="0" aria-label="${esc(name)} source"><code id="code-${key}">${esc(content)}</code></pre></div>`;
}
function declarations(css) {
  return [...uncomment(css).matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)].map(m => [m[1], m[2].trim()]);
}
const rootTokens = new Map();
for (const [key, value] of declarations(tokenCss)) {
  const entry = rootTokens.get(key) || {fallback: value};
  entry.value = value;
  rootTokens.set(key, entry);
}
function tokenCategory(name) {
  if (name.startsWith('--seed-')) return 'Brand seeds';
  if (name.startsWith('--activity-')) return 'Activity types';
  if (/^--(teal-|accent-\d|neutral-|white$|page$|status-)/.test(name)) return 'Palette & status';
  if (/^--(brand-|accent$|accent-hover$|bg-|text-|border|focus-|success|warning|danger|info)/.test(name)) return 'Semantic colours';
  if (/^--(face-|font-|fs-|lh-|fw-)/.test(name)) return 'Typography';
  if (/^--(space-|radius|shadow)/.test(name)) return 'Spacing & shape';
  return 'Layout & layering';
}
const colourName = name => /^--(seed-|teal-|accent|neutral-|white$|page$|status-|brand-|bg-|text-|border|success|warning|danger|info|activity-)/.test(name);
let tokenRows = '';
for (const [name, values] of rootTokens) {
  const swatch = colourName(name) ? `<span class="token-dot" style="background:var(${name})" aria-hidden="true"></span>` : '';
  tokenRows += `<tr><th scope="row"><code>${name}</code></th><td>${tokenCategory(name)}</td><td><code>${esc(values.value)}</code>${values.fallback !== values.value ? `<small>Fallback: <code>${esc(values.fallback)}</code></small>` : ''}</td><td>${swatch}<code data-token="${name}" data-colour="${colourName(name)}">${esc(values.fallback)}</code></td></tr>\n`;
}
function aliasTable(css, pattern) {
  const values = new Map(declarations(css).filter(([key]) => pattern.test(key)));
  return [...values].map(([name, value]) => `<tr><th scope="row"><code>${name}</code></th><td><code>${esc(value)}</code></td></tr>`).join('\n');
}
const bannerDefaults = bannerCss.replaceAll(':not(:where(.us-report-no-styling, .us-report-no-styling *))', '').match(/:where\(\.us-banner\)\s*\{([\s\S]*?)\}/)?.[1];
const iqaBlock = theme.match(/\{([^{}]*--iqa-surface:[^{}]*)\}/);
const iqaDefaults = iqaBlock?.[1];
// The alias selector grows as the IQA scope gains container patterns, so the
// config editor reuses it instead of a copy that silently loses specificity.
const iqaSelector = iqaBlock && theme.slice(0, iqaBlock.index).split(/[}]|[*][/]/).pop().trim();
if (!bannerDefaults?.includes('--banner-bg:') || !iqaDefaults?.includes('--iqa-radius:') || !iqaSelector?.startsWith(':is(')) throw Error('Component defaults changed; update extraction.');
const allSources = ['Theme/UnionSuite-Guides/usage/build/switch-examples.cjs','Theme/UnionSuite-Guides/usage/source/document-loader-example.html','Theme/UnionSuite-Guides/usage/source/badge-example.html','Theme/UnionSuite-Guides/usage/build/cco-sticky-example.cjs','Theme/UnionSuite-Guides/usage/build/tab-loading-example.cjs','Theme/UnionSuite-Guides/usage/build/cco-switch-example.cjs','Theme/UnionSuite-Guides/usage/build/account-menu-example.cjs','Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js','Theme/UnionSuite-Guides/usage/source/taskbar-example.js','Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs','Theme/UnionSuite-Guides/usage/build/dialog-chrome-example.cjs','Theme/UnionSuite-Guides/usage/build/action-menu-example.cjs','Theme/UnionSuite-Guides/usage/templates/Action-Menu-Template.html','Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js','Theme/UnionSuite-Guides/usage/examples/Data-Panel-Native-read.html','Theme/UnionSuite-Guides/usage/build/build-tab-display-options.cjs','Theme/UnionSuite-Guides/usage/examples/Tab-Display-Fixture.js','Theme/UnionSuite-Guides/usage/examples/CCO-Tabs-Fixture.css','Theme/UnionSuite-Guides/usage/source/busy-examples.cjs','Theme/UnionSuite-Guides/usage/examples/Form-Fields.source.html','Theme/UnionSuite-Guides/usage/examples/Form-Fields.layout.css','Theme/UnionSuite/zUnionSuite.css', 'Theme/UnionSuite/zUnionSuite.js', 'Theme/UnionSuite/zzClientSpecific.css',
  'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css', 'docs/THEME-BUTTONS.md', 'Theme/UnionSuite-Guides/usage/source/Button-Examples.html',
  'Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html', 'Theme/UnionSuite-Guides/usage/examples/Banner-Behaviour.js', 'Theme/UnionSuite-Guides/usage/templates/Banner-Template.html',
  'Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html', 'Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html',
  'Theme/UnionSuite/README.md', 'Theme/UnionSuite-Guides/usage/examples/Banner-README.md',
  'docs/THEME-PANEL-ACTIONS.md', 'docs/THEME-ACTIVITY-FEED.md', 'docs/IMIS-CMS-STRUCTURE.md',
  'Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html', 'Theme/UnionSuite-Guides/usage/source/usage-guide.css',
  'Theme/UnionSuite-Guides/usage/source/usage-guide.js', 'Theme/UnionSuite-Guides/usage/source/guide-search.js', 'Theme/UnionSuite-Guides/usage/source/Brand-Preview.source.html', 'Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs', 'Theme/UnionSuite-Guides/usage/build/theme-sources.cjs',
  'Theme/UnionSuite-Guides/usage/build/theme-gallery.cjs', 'Theme/UnionSuite-Guides/usage/source/action-catalog.cjs', 'Theme/UnionSuite-Guides/usage/source/example-gallery.css',
  'Theme/UnionSuite-Guides/usage/source/IQA-Example.source.html', 'Theme/UnionSuite-Guides/usage/source/iqa-example.js', 'Theme/UnionSuite/Tabler/tabler-icons.min.css'];
allSources.push('Theme/UnionSuite-Guides/usage/templates/System-Alert-Message.html');
allSources.push('Theme/UnionSuite-Guides/usage/templates/Banner-Agreement-Facts.html', 'Theme/UnionSuite-Guides/usage/templates/Case-Details-Content.html', 'Theme/UnionSuite-Guides/usage/templates/Banner-Case-Template.html', 'Theme/UnionSuite-Guides/usage/templates/Copy-Button-Template.html');
allSources.push(...listTemplates.sources);
allSources.push(...caseMemberExample.sources);
allSources.push(...require('./build-taskbar-dark-mode.cjs').sources);
allSources.push('Theme/UnionSuite-Client/Config.js');
allSources.push('Theme/UnionSuite/Scripts/ActionDefinitions.js','Theme/UnionSuite-Client/Actions.js');
allSources.push(...require('./object-browser-example.cjs').sources);
allSources.push(...require('./query-empty-example.cjs').sources);
allSources.push('Theme/UnionSuite-Guides/usage/build/home-task-empty-example.cjs');
allSources.push('Theme/UnionSuite-Guides/usage/build/report-icon-example.cjs');
allSources.push(...require('./panel-title-icons-example.cjs').sources);
allSources.push(...require('./where-used-example.cjs').sources);
allSources.push(...require('./side-pane-example.cjs').sources);
allSources.push(...require('./iqa-finder-example.cjs').sources);
allSources.push(...require('./popup-forms-example.cjs').sources);
allSources.push('Theme/UnionSuite-Guides/usage/build/popup-action-example.cjs');
allSources.push('Theme/UnionSuite-Guides/usage/build/action-conflict-example.cjs');
allSources.push(...require('./unified-action-example.cjs').sources);
allSources.push(...require('./page-layout-example.cjs').sources);
allSources.push('Theme/UnionSuite-Guides/usage/templates/Home/Welcome-Content.html');
allSources.push(...require('./attention-example.cjs').sources);
allSources.push(...require('./heading-toggle-reference.cjs').sources);
allSources.push(...membership.sources);
allSources.push(...actionBuilder.sources);
allSources.push(...inlineComposerExample.sources);
allSources.push(...casePartiesExample.sources);
allSources.push(...changeHistoryExample.sources);
allSources.push(...caseBannerExample.sources);
allSources.push(...queryValueExample.sources);
allSources.push(...caseListsExample.sources);
allSources.push('Theme/UnionSuite-Guides/usage/build/query-template-refresh-example.cjs','Theme/UnionSuite-Guides/usage/examples/Query-Template-Refresh.js');
allSources.push('Theme/UnionSuite-Guides/usage/build/embedded-cco-example.cjs');
allSources.push('Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs','Theme/UnionSuite-Guides/usage/source/iqa-expand-example.html','Theme/UnionSuite-Guides/usage/source/iqa-expand-example.css','Theme/UnionSuite-Guides/usage/source/iqa-expand-example.js');
allSources.push('Theme/UnionSuite-Guides/usage/build/build-bulletin-study.cjs','Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.html','Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.css','Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.js');
allSources.push('Theme/UnionSuite-Guides/usage/source/utility-nav-example.html','Theme/UnionSuite-Guides/usage/source/utility-nav-example.css','Theme/UnionSuite-Guides/usage/source/utility-nav-example.js','Theme/UnionSuite-Client/Branding.css');
const hash = crypto.createHash('sha256');
['Success','Information','Warning','Error'].forEach(kind=>hash.update(fs.readFileSync(path.join(root,'Theme/UnionSuite/images/Asi'+kind+'.png'))));
allSources.forEach(file => hash.update(file + '\n' + read(file) + '\n'));
const iconFont = fs.readFileSync(path.join(root,'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2'));
hash.update(iconFont);
const navIconFont = fs.readFileSync(path.join(root,'Theme/UnionSuite/Tabler/fonts/tabler-icons-300.woff2'));
hash.update(navIconFont);
// One embedded font in the portable document. Guide JS shares this stylesheet
// with same-origin srcdoc examples; no iframe makes a runtime asset request.
let iconCss = read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(/@font-face\s*\{[^}]*\}/g,
  '@font-face{font-family:"tabler-icons";font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,'+iconFont.toString('base64')+') format("woff2")}');
iconCss += '@font-face{font-family:"tabler-icons-300";font-style:normal;font-weight:400;font-display:block;src:url(data:font/woff2;base64,'+navIconFont.toString('base64')+') format("woff2")}';
hash.update(read("Theme/UnionSuite-Guides/usage/build/section-tabs-example.cjs"));
const fingerprint = hash.digest('hex').slice(0, 12);
const values = {'[Record type]':'Contact','[Record ID]':'104019','[Record name]':'Alex Morgan',
  '[Supporting record information]':'Regular member · Member since 1 June 2026','[Record status]':'Active',
  '[Fact label 1]':'Email','[Fact value 1]':'alex@example.org','[Fact label 2]':'Employer','[Fact value 2]':'Harbour Services',
  '[Fact label 3]':'Branch','[Fact value 3]':'Sydney Metro','[Fact label 4]':'Organiser','[Fact value 4]':'Sam Taylor'};
let demoBanner = template;
Object.entries(values).forEach(([key,value]) => { demoBanner = demoBanner.replaceAll(key,value); });
const demo = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Interactive banner example</title><style>${tokenCss}\n${bannerCss}\n${clientRoots}</style><script>${themeJs}</script>
<style>*{box-sizing:border-box}body{margin:0;color:var(--text-base);background:var(--bg-page);font:14px/1.5 var(--font-ui)}#hd{position:sticky;top:0;z-index:1031;background:var(--bg-surface);padding:10px 20px;border-bottom:1px solid var(--border);font-size:12px}.demo-nav{position:fixed;left:0;top:39px;bottom:0;width:38px;background:var(--bg-inverse)}.main{margin-left:38px}.row{--bs-gutter-x:40px}.col-sm-12{padding-inline:calc(var(--bs-gutter-x) * .5)}.demo-content{padding:24px 20px;min-height:1100px}.demo-content p{max-width:65ch}.demo-content h2{font-size:18px;color:var(--text-strong)}@media(max-width:500px){.demo-nav{display:none}.main{margin:0}}</style></head><body class="us-banner-page"><header id="hd">Sample iMIS header · scroll inside this example</header><aside class="demo-nav" aria-hidden="true"></aside><main class="main"><div class="ContentPanel"><div><div class="row"><div class="col-sm-12"><div class="ContentItemContainer"><div class="WebPartZone"><div class="iMIS-WebPart"><div class="ContentItemContainer"><div class="us-banner us-banner-collapsible">${demoBanner}</div></div></div></div></div></div></div><section class="demo-content"><h2>One banner, two levels of detail</h2><p>Scroll here to condense the banner. Its title, status, Actions and tabs remain visible. Return to the top to expand it.</p><p>Actions opens a working disclosure. Commands and tab buttons are disabled examples awaiting integration.</p><p>This uses the real banner CSS and behaviour with a small sample layout, not a live iMIS data source.</p></section></div></div></main></body></html>`;
let html = read('Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html');
function galleryDocument(title,markup) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${tokenCss}\n${nativeGroupCss}\n${nativeButtonCss}\n${buttonCss}\n${actionCss}\n${clientRoots}\n${read('Theme/UnionSuite-Guides/usage/source/example-gallery.css')}</style><script>${themeJs}</script></head><body>${markup}</body></html>`;
}
const busyExamples = require('../source/busy-examples.cjs');
const busyDemo = galleryDocument('Button busy states: approved ring and success/failure demo','<style>'+busyExamples.css+'.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:20px}article{padding:18px;border:1px solid var(--border);border-radius:8px}h2{font-size:18px}</style>'+busyExamples.markup+'<script>'+busyExamples.script+'</script>');
const buttonDemo = galleryDocument('Native button examples and recipes',gallery.buttonGallery());
const actionDemo = galleryDocument('Action icon examples and recipes',gallery.actionGallery());
const palette = [
  ['teal', [950,900,800,700,600,500,300,50]],
  ['accent', [700,600,500,100]],
  ['neutral', [900,800,700,600,400,200,100,50]]
].map(([ramp,stops]) => `<div class="preview-palette" aria-label="${ramp} palette">${stops.map(stop => `<div><span style="--sample:var(--${ramp}-${stop})" aria-hidden="true"></span><code>--${ramp}-${stop}</code></div>`).join('')}</div>`).join('\n');
// Native foundation is embedded for fidelity. Remove remote font/import assets
// from this offline sample; the actual theme files retain their native assets.
const nativePreviewCss = (read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css') + '\n' + orion)
  .replace(/@import\s+[^;]+;/g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
const brandMarkup = read('Theme/UnionSuite-Guides/usage/source/Brand-Preview.source.html').replace('{{BANNER}}', demoBanner).replace('{{PALETTE}}', palette);
const brandDemo = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Combined theme brand preview</title><style>${nativePreviewCss}\n${theme}\n${clientRoots}</style><script>${themeJs}</script></head><body class="us-banner-page">${brandMarkup}</body></html>`;
const reportMarkup = read('Theme/UnionSuite-Guides/usage/source/IQA-Example.source.html').replace('{{IQA_ROWS}}','<tr class="rgRow"><td>104019</td><td>Alex Morgan</td><td>Sydney Metro</td><td>Active</td><td>Sample record</td></tr>');
const reportDemo = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dummy IQA report</title><style>${nativePreviewCss}\n${theme}\n${clientRoots}</style><script>${themeJs}</script></head><body>${reportMarkup}<script>${read('Theme/UnionSuite-Guides/usage/source/iqa-example.js')}</script></body></html>`;
function staticBanner(title,markup,after = '') {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${theme}\n${clientRoots}\nbody{margin:0;background:var(--bg-page);font:14px/1.5 var(--font-ui)}*{box-sizing:border-box}</style><script>${themeJs}</script></head><body><div class="ContentItemContainer"><div class="us-banner">${markup}</div></div>${after}</body></html>`;
}
const badgeParts = ['success','warning','danger','info'].map((s,i)=>`<span class="us-banner__badge us-banner__badge--${s}">${['Active','Review required','Suspended','Information'][i]}</span>`).join('');
const parts = `<header class="us-banner__surface"><div class="us-banner__summary"><div class="us-banner__identity"><span class="us-banner__avatar" aria-hidden="true">AM</span><div class="us-banner__identity-text"><span class="us-banner__eyebrow">Avatar / identity</span><h2 class="us-banner__title">Alex Morgan</h2><p class="us-banner__subtitle">Supporting record information</p></div></div><div class="us-banner__status">${badgeParts}</div><div class="us-banner__actions"><button class="us-banner__action us-banner__action--primary" type="button" disabled>Primary action</button></div></div><div class="us-banner__details"><dl class="us-banner__facts"><div class="us-banner__fact"><dt>Employer</dt><dd>Harbour Services</dd></div><div class="us-banner__fact"><dt>Branch</dt><dd>Sydney Metro</dd></div></dl></div></header>`;
const iframe = (id,title,content,auto=false) => `<iframe class="example-frame" id="${id}" data-theme-preview${auto?' data-autofit':''} title="${esc(title)}" srcdoc="${esc(content)}" loading="${auto?'eager':'lazy'}"></iframe>`;
const formMarkup='<form class="us-form" onsubmit="event.preventDefault()"><div class="field-grid">'+read('Theme/UnionSuite-Guides/usage/examples/Form-Fields.source.html')+'</div><div class="form-footer"><button type="submit" class="TextButton PrimaryButton">Validate example</button><button type="reset" class="TextButton">Reset</button></div></form>';
const formDemo='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+'\n'+theme+'\n'+read('Theme/UnionSuite-Guides/usage/examples/Form-Fields.layout.css')+'</style></head><body><main>'+formMarkup+'</main><script>'+themeJs+'</script></body></html>';
// A designed BeyondFormz form (us-bf-*) as it renders once its injected
// script has run: static markup, no BeyondFormz or form script. The frame's
// own rules stand in for CloudToolz's Bootstrap sheet (full-width controls,
// md columns), which the guide does not carry.
const beyondDesignedMarkup=read('Theme/UnionSuite-Guides/usage/examples/BeyondFormz-Designed-Form.html').trim();
const beyondVendorStandIn='[data-beyondformid] .rendered-form .form-control{display:block;width:100%}'
  +'@media (min-width:768px){[data-beyondformid] .row{display:flex;flex-wrap:wrap}[data-beyondformid] .row>.col-md-4{flex:0 0 33.333%;max-width:33.333%}[data-beyondformid] .row>.col-md-8{flex:0 0 66.667%;max-width:66.667%}[data-beyondformid] .row>.col-md-12{flex:0 0 100%;max-width:100%}}';
const beyondDesignedDemo='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+'\n'+iconCss+'\n'+theme+'\nbody{margin:0;padding:20px 24px;background:var(--bg-surface);color:var(--text-base);font:14px/1.5 var(--font-ui);height:auto}'+beyondVendorStandIn+'</style></head><body>'+beyondDesignedMarkup+'</body></html>';
// System Notification panel as iMIS renders it: an ASI alert (its message
// supplies the .media icon row; the theme adds the iMIS logo), our alerts
// (System-Alert-Message.html with sample values, placed straight in the list
// item as iMIS does): one with IsSystem (the hub logo) and a link, one with
// neither, and the hidden upgrade alert.
const uhubAlert = (values, system = true) => read('Theme/UnionSuite-Guides/usage/templates/System-Alert-Message.html').replace(/<!--[\s\S]*?-->\s*/g, '').replace(/\{#SystemAlerts\.(\w+)\}/g, (_, field) => esc(values[field])).replace(system ? '' : ' IsSystem', '').trim();
const systemAlertIcon='data:image/png;base64,'+fs.readFileSync(path.join(root,'Theme/UnionSuite/images/AsiInformation.png')).toString('base64');
const systemAlertMarkup='<section><h2>System alerts</h2><div id="SystemAlertPanel"><div class="AsiMessage AsiSystem"><ul class="AlertSet">'
  +'<li class="AlertItem"><div class="media"><img alt="info" src="'+systemAlertIcon+'"><div class="media-body pt-1">A hotfix has been deployed. Review the Upgrade &amp; Hotfix Notifications Forum for details.</div></div></li>'
  +'<li class="AlertItem">'+uhubAlert({Alert:'Scheduled maintenance begins at 8 pm on Friday.', Link:'#example-maintenance', LinkText:'Maintenance details'})+'</li>'
  +'<li class="AlertItem">'+uhubAlert({Alert:'Payroll exports are paused until Monday.', Link:'', LinkText:''}, false)+'</li>'
  +'<li class="AlertItem"><div class="media" id="UpgradeAlert" style="display: none;"><div class="media-body py-2 pl-3">You have been upgraded to the latest version of iMIS EMS!</div></div></li>'
  +'</ul></div></div><p><button type="button" class="TextButton" onclick="UnionSuiteSystemAlerts.restore()">Show dismissed alerts again</button></p></section>';
// Only the dismiss script and the fold it uses, so the other messages in this
// frame keep their plain native presentation.
const systemAlertJs=['US-RECORD-CARDS','US-SYSTEM-ALERTS'].map(name=>read('Theme/UnionSuite/zUnionSuite.js').match(new RegExp('/\\* '+name+':START[\\s\\S]*?'+name+':END \\*/'))[0]).join('\n');
const messageMarkup=['Success','Information','Warning','Error'].map((kind,i)=>'<section><h2>'+kind+'</h2><div class="user-message-area"><div class="AsiMessage"><ul><li class="Asi'+kind+'"><img class="iMISUserMessageIcon" alt="'+kind+' icon" src="data:image/png;base64,'+fs.readFileSync(path.join(root,'Theme/UnionSuite/images/Asi'+kind+'.png')).toString('base64')+'"><div class="AsiMessageText">'+['Successfully updated','Your changes will apply at renewal.','Review these details before continuing.','The update failed. Please try again.'][i]+'</div></li></ul></div></div></section>').join('')+'<p class="AsiNeutral">No outstanding items.</p><p class="AsiImportant">Check your contact details.</p><p>Inline: <span class="AsiSuccess">Updated</span></p><div class="AsiValidationSummary">Please correct the highlighted fields.</div><span class="AsiErrorInline">Enter a complete email address.</span>'+systemAlertMarkup;
const messageDemo='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+'\n'+theme+'\nbody{margin:0;padding:16px;background:var(--bg-page);font:14px/1.5 var(--font-ui);height:auto}h2{font-size:16px}section{margin-bottom:20px}</style></head><body>'+messageMarkup+'<script>'+systemAlertJs+'</script></body></html>';
const inserts = {
 TASKBAR_DARK_MODE_DEMO: iframe('taskbar-dark-mode-demo','Shared dark mode: taskbar toggle with fictional workspace content',require('./build-taskbar-dark-mode.cjs').frameDocument(),true),
 QUERY_SEARCH_FIELDS: queryFields.table('query-search-template',html.match(/<code id="query-search-template">([\s\S]*?)<\/code>/)[1]),
 EXPLICIT_SEARCH_FIELDS: queryFields.table('explicit-query-search',html.match(/<code id="explicit-query-search">([\s\S]*?)<\/code>/)[1]),
 EMBEDDED_CCO_DEMO: iframe('embedded-cco-demo','EmbeddedCCO: hide the outer organiser chrome while retaining nested panels and tabs',require('./embedded-cco-example.cjs').documentHtml(),true),
 MEMBERSHIP_STATS_DEMO: iframe('membership-stats-demo','Membership Overview: verified IQA counts and history placeholder',membership.documentHtml({nativePreviewCss,theme,themeJs,branding:clientRoots}),true),
 MEMBERSHIP_STATS_RECIPES: membership.recipes(),
 ATTENTION_DEMO: iframe('attention-demo','Needs Attention: four IQA count cards',require('./attention-example.cjs').documentHtml({nativePreviewCss,theme,themeJs,branding:clientRoots}),true),
 SYSTEM_ALERT_TEMPLATE: snippet('system-alert'),
 ATTENTION_TEMPLATE: snippet('attention'),
 TASK_COMPACT_ROW_TEMPLATE: snippet('task-compact-row'),
 TASK_FULL_ROW_TEMPLATE: snippet('task-full-row'),
 TASK_DETAIL_ROW_TEMPLATE: snippet('task-detail-row'),
 QUERY_TEMPLATE_REFRESH_DEMO: iframe('query-template-refresh-demo', 'Query Template refresh and restored task controls', queryTemplateRefreshExample({read, css:nativePreviewCss+theme, themeJs}), true),
 INLINE_COMPOSER_DEMO: iframe('inline-composer-demo', 'Adding a task in place: the composer, holding row and quiet insert', inlineComposerExample.documentHtml({read, css:nativePreviewCss+theme, themeJs}), true),
 TASK_ROW_TEMPLATE: snippet('task-row'),
 QUERY_EMPTY_DEMO: iframe('query-empty-demo','Query template empty and populated cards',require('./query-empty-example.cjs').documentHtml(),true),
 HOME_TASK_EMPTY_DEMO: iframe('home-task-empty-demo','Biscuit: no outstanding tasks',require('./home-task-empty-example.cjs').documentHtml(),true),
 HOME_TASK_EMPTY_TEMPLATE: snippet('task-no-results'),
 CONTACT_ROW_TEMPLATE: snippet('contact-row'),
 CASE_PARTIES_DEMO: iframe('case-parties-demo', 'Case parties: the list, the chosen party and their details', casePartiesExample.documentHtml({read, css:nativePreviewCss+theme, themeJs}), true),
 CASE_PARTIES_TEMPLATE: snippet('case-parties'),
 CASE_MEMBER_DEMO: iframe('case-member-demo', 'Case member card: choosing which job the case is about', caseMemberExample.documentHtml({read, css:nativePreviewCss+theme, themeJs}), true),
 CASE_MEMBER_TEMPLATE: snippet('case-member'),
 CASE_ROWS_DEMO: iframe('case-rows-demo', 'Two-row case banner with the member line, status menu and details row', caseBannerExample.documentHtml({read, css:nativePreviewCss+theme, themeJs, fields:queryFields.definitions['Banner-Case-Rows-Query-Template.html']}), true),
 CASE_ROWS_TEMPLATE: snippet('case-rows'),
 QUERY_VALUE_DEMO: iframe('query-value-demo', 'Attachments with a count footer from its own IQA', queryValueExample.documentHtml({read, css:nativePreviewCss+theme, themeJs}), true),
 QUERY_VALUE_TEMPLATE: snippet('attachments-count-footer'),
 CASE_LISTS_DEMO: iframe('case-lists-demo', 'Case page lists: the case team, a detailed meeting, a restricted file and an empty list', caseListsExample.documentHtml({css:nativePreviewCss+theme, themeJs}), true),
 TASK_FOOTER_TEMPLATE: snippet('task-footer'),
 REPORT_ICON_DEMO: iframe('report-icon-demo','Generated report icon actions',reportIconExample.documentHtml({nativePreviewCss,theme,themeJs,iconCss,branding:clientRoots}),true),
 POPUP_FORMS_ADD_DEMO: iframe('popup-forms-add-demo','Task form: adding a task to an agreement',require('./popup-forms-example.cjs').documentHtml({nativePreviewCss,theme,branding:clientRoots,variant:'add'}),true),
 POPUP_FORMS_EDIT_DEMO: iframe('popup-forms-edit-demo','Task form: editing a case task',require('./popup-forms-example.cjs').documentHtml({nativePreviewCss,theme,branding:clientRoots,variant:'edit'}),true),
 IQA_FINDER_DEMO: iframe('iqa-finder-demo','IQA browser: search, favourites and recent',require('./iqa-finder-example.cjs').documentHtml({nativePreviewCss,theme,iconCss,branding:clientRoots}),true),
 SIDE_PANE_DEMO: iframe('side-pane-demo','Taskbar side pane: Case help on a case page',require('./side-pane-example.cjs').liveHtml({read,nativePreviewCss,theme,iconCss,branding:clientRoots}),true),
 SIDE_CHAT_DEMO: iframe('side-chat-demo','Side pane chat styles for help tabs',require('./side-pane-example.cjs').chatHtml({nativePreviewCss,theme,iconCss,branding:clientRoots}),true),
 WHERE_USED_DEMO: iframe('where-used-demo','IQA designer: Show Usage drawer',require('./where-used-example.cjs').documentHtml({nativePreviewCss,theme,iconCss,branding:clientRoots}),true),
 PANEL_TITLE_ICONS_DEMO: iframe('panel-title-icons-demo','Panel titles typed with an icon token',require('./panel-title-icons-example.cjs').documentHtml({nativePreviewCss,theme,themeJs,iconCss,branding:clientRoots}),true),
 POPUP_ACTION_DEMO: iframe('popup-action-demo','Native popup action example',popupActionExample.documentHtml({nativePreviewCss,theme,themeJs,branding:clientRoots}),true),
 ACTION_CONFLICT_DEMO: iframe('action-conflict-demo','Duplicate action detection example',actionConflictExample.documentHtml({nativePreviewCss,theme,themeJs,branding:clientRoots}),true),
 UNIFIED_ACTION_DEMO: iframe('unified-action-demo','Shared buttons, menus and row actions',require('./unified-action-example.cjs').documentHtml({nativePreviewCss,theme,themeJs,branding:clientRoots}),true),
 WELCOME_DEMO: iframe('welcome-demo', 'Shared home page welcome header', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:0;background:var(--bg-page)}</style><body><div class="ContentItemContainer"><div class="home-welcome-message"><div class="panel"><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet simplePaginateList"><section><div class="QueryTemplateItem">${snippets.welcome[1]}</div></section></div></div></div></div></div></div></body></html>`, true),
 CREDENTIALS_DEMO: iframe('credentials-demo', 'Native User credentials control with us-credentials (staff login)', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:0;background:var(--bg-page)}</style><body><div class="ContentWizardDisplay ClearFix"><div><div class="row"><div class="col-sm-12"><div class="WebPartZone">${read('Theme/UnionSuite-Guides/usage/examples/User-Credentials-Native.html')}</div></div></div></div></div><script>${themeJs.match(/\/\* US-CREDENTIALS:START[\s\S]*?US-CREDENTIALS:END \*\//)[0]}\n${themeJs.match(/\/\* US-COPY:START[\s\S]*?US-COPY:END \*\//)[0]}\n/* Guide only: Bootstrap collapse, which iMIS loads. */document.addEventListener('click',event=>{const toggle=event.target.closest('[data-toggle="collapse"]');if(!toggle)return;event.preventDefault();const body=document.querySelector(toggle.getAttribute('href'));const open=!body.classList.contains('in');body.classList.toggle('in',open);document.querySelectorAll('[data-toggle="collapse"][href="'+toggle.getAttribute('href')+'"]').forEach(link=>link.classList.toggle('collapsed',!open));});document.addEventListener('click',event=>{if(event.target.closest('a[href="#"], input[type=image], input[type=button]'))event.preventDefault();});<\/script></body></html>`, true),
 // Guide only: a srcdoc frame has no address, so the record the send page
 // reads from AgreementID=A107 is supplied in place of location.search.
 SUBJECT_TAG_DEMO: iframe('subject-tag-demo', 'Create Communication with us-agreement-comms: the agreement tag fixed at the start of the subject', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:0;background:var(--bg-page)}</style><body class="us-agreement-comms-page"><div class="WebPartZone">${read('Theme/UnionSuite-Guides/usage/examples/Communication-Creator-Header-Native.html')}</div><script>${themeJs.match(/\/\* US-SUBJECT-TAG:START[\s\S]*?US-SUBJECT-TAG:END \*\//)[0].replace('location.search', "'?AgreementID=A107'")}\ndocument.addEventListener('click',event=>{if(event.target.closest('input[type=button]'))event.preventDefault();});<\/script></body></html>`, true),
 // Guide only: the frame has no address and no iMIS, so the address the
 // Email button sends is supplied in place of location.search, and
 // /api/query answers from sample rows (the agreement's eight contacts).
 SEND_RECIPIENTS_DEMO: iframe('send-recipients-demo', 'us-send-recipients: who the email goes to, above the Communication Creator', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:420px;background:var(--bg-page)}</style><body><div class="us-send-recipients"></div><script>window.fetch=async()=>new Response(JSON.stringify({Items:{$values:[{ID:'23151',Name:'Dani Sundara',Email:'danisundara@example.org',Role:'General',Group:'SBU'},{ID:'20514',Name:'Tony Williams',Email:'tonywilliams@example.org',Role:'Consultant',Group:'SBU'},{ID:'103885',Name:'Tony Fin Stark',Email:'work@example.org',Role:'Consultant',Group:'SBU'},{ID:'245',Name:'Mary O\\'Conner',Email:'',Role:'Lead',Group:'Bargaining Team'},{ID:'18033',Name:'Barbara Bourgeois',Email:'barbara@example.org',Role:'Consultant',Group:'Bargaining Team'},{ID:'23285',Name:'Hub User',Email:'info@example.org',Role:'Negotiator',Group:''},{ID:'23152',Name:'Al Soria',Email:'asoria@example.org',Role:'Consultant',Group:'All'},{ID:'',Name:'Frank Grimes',Email:'frank@example.org',Role:'Consultant',Group:'External'}]}}),{status:200});\n${themeJs.match(/\/\* US-RECORD-CARDS:START[\s\S]*?US-RECORD-CARDS:END \*\//)[0]}\n${themeJs.match(/\/\* US-SEND-RECIPIENTS:START[\s\S]*?US-SEND-RECIPIENTS:END \*\//)[0].replaceAll('location.search', JSON.stringify('?query=' + encodeURIComponent('$/_i4u_/Core/CA/v2/API - Communication Recipient List - Contacts') + '&queryparams=' + encodeURIComponent('[{"Item1":"Ordinal","Item2":""},{"Item1":"@url:AgreementNum","Item2":"123"}]')))}<\/script></body></html>`, true),
 SEND_RECIPIENTS_SUMMARY_DEMO: iframe('send-recipients-summary-demo', 'us-send-recipients--summary: the member count and a link back to the agreement', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:120px;background:var(--bg-page)}</style><body><div class="us-send-recipients us-send-recipients--summary" data-us-recipients-link="/Agreements_ManageAgreement?AgreementID={AgreementID}&amp;AgreementNum={AgreementNum}&amp;AgreementTab=Coverage" data-us-recipients-link-label="View covered members"></div><script>window.fetch=async url=>{const total=1243,offset=Number(new URL(url,'https://example.org').searchParams.get('offset')||0),count=Math.min(500,total-offset);const rows=Array.from({length:count},(_,i)=>({ID:String(30000+offset+i),Name:'Member '+(offset+i+1),Email:(offset+i)%97===0?'':'member'+(offset+i)+'@example.org'}));return new Response(JSON.stringify({Items:{$values:rows},TotalCount:total,HasNext:offset+count<total,NextOffset:offset+count}),{status:200});};\n${themeJs.match(/\/\* US-SEND-RECIPIENTS:START[\s\S]*?US-SEND-RECIPIENTS:END \*\//)[0].replaceAll('location.origin', JSON.stringify('https://example.org')).replaceAll('location.search', JSON.stringify('?AgreementID=A107&AgreementNum=123&Audience=Members&query=' + encodeURIComponent('$/_i4u_/Core/CA/v2/API - Communication Recipient List - Members') + '&queryparams=' + encodeURIComponent('[{"Item1":"AgreementOrdinal","Item2":"123"}]')))}<\/script></body></html>`, true),
 // Guide only: /api/query answers the fields IQA from sample rows.
 CHANGE_HISTORY_DEMO: iframe('change-history-demo', 'Change history: one card per save, its fields loaded when opened', changeHistoryExample.documentHtml({read, css:[nativePreviewCss, theme, iconCss, clientRoots].join('\n'), themeJs}), true),
 // Guide only: /api/query answers the details IQA from sample rows.
 COMMS_RECIPIENTS_DEMO: iframe('comms-recipients-demo', 'Agreement communications: record cards that load their recipients when opened', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${clientRoots}\nhtml{height:auto}body{margin:0;padding:20px;height:auto;min-height:460px;background:var(--bg-page)}</style><body><div class="WebPartZone">${read('Theme/UnionSuite-Guides/usage/examples/Agreement-Communications-Records.html')}</div><script>window.fetch=async()=>{await new Promise(r=>setTimeout(r,400));return new Response(JSON.stringify({Items:{$values:[{Recipient:'Alex Moreno',Address:'alex.moreno@example.org',Status:'Delivered'},{Recipient:'Priya Shah',Address:'priya.shah@example.org',Status:'Open'},{Recipient:'Jordan Lee',Address:'jordan.lee@example.org',Status:'Bounce'},{Recipient:'Chris Ng',Address:'chris.ng@example.org',Status:'Delivered'}]}}),{status:200});};\n${themeJs.match(/\/\* US-RECORD-CARDS:START[\s\S]*?US-RECORD-CARDS:END \*\//)[0]}\n${themeJs.match(/\/\* US-COMMS-RECIPIENTS:START[\s\S]*?US-COMMS-RECIPIENTS:END \*\//)[0]}<\/script></body></html>`, true),
 PLACEHOLDER_DEMO: iframe('placeholder-demo', 'Placeholder for a section that is not ready', `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${nativePreviewCss}
${theme}
${iconCss}
${clientRoots}
html{height:auto}body{margin:0;padding:20px;height:auto;min-height:0;background:var(--bg-page)}</style><body><div class="ContentItemContainer"><div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Outstanding</h2></div><div class="panel-body-container"><div class="panel-body">${snippets.placeholder[1]}</div></div></div></div></body></html>`, true),
 LIST_DEMO: iframe('list-demo', 'Reusable cards, task rows and history timeline', listTemplates.documentHtml({nativePreviewCss, theme, branding:clientRoots}), true),
 PAGE_LAYOUT_DEMO: iframe('page-layout-demo', 'Native page columns with unchanged form spacing', require('./page-layout-example.cjs').documentHtml(), true),
 BULLETIN_HEADER_DEMO: iframe('bulletin-header-demo','Staff Bulletin with Manage header button','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+theme+'body{margin:0;padding:16px;background:var(--bg-page)}</style><body>'+require('./build-bulletin-study.cjs').panel(true,1)+'<p id="bulletin-header-status" role="status">Manage Bulletin opens the management page in a new tab on the live site. Click here for a local demonstration.</p><script>'+require('./build-bulletin-study.cjs').actionScript+';document.addEventListener("click",function(event){var link=event.target.closest("a");if(!link)return;event.preventDefault();document.getElementById("bulletin-header-status").textContent=link.id==="iqa-manage-bulletin"?"Live destination (new tab): "+link.getAttribute("href"):"Sample bulletin destination."});<\/script></body></html>',true),
 LIST_TEMPLATES: listTemplates.recipes(),
 BADGE_DEMO: iframe("badge-demo","Shared badges in reports and panels", '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>'+theme+'body{margin:0;padding:20px;background:var(--bg-surface);color:var(--text-base);font:14px var(--font-ui)}</style><body>'+read('Theme/UnionSuite-Guides/usage/source/badge-example.html')+'</body></html>',true),
 CCO_STICKY_DEMO: iframe("cco-sticky-demo","Sticky CCO sidebar with condensing banner",require("./cco-sticky-example.cjs").documentHtml()),
 CCO_SWITCH_DEMO: iframe('cco-switch-demo','CCO tab switching loading states',require('./cco-switch-example.cjs').documentHtml(),true),
 TAB_LOADING_DEMO: iframe('tab-loading-demo','Native tab request loading feedback',require('./tab-loading-example.cjs')(),true),
 ACCOUNT_MENU_DEMO: iframe('account-menu-demo','Native utility icons, click spinners and account dropdown',require('./account-menu-example.cjs')(),true),
 OBJECT_BROWSER_DARK_DEMO: iframe('object-browser-dark-demo','Telerik Object Browser in light and dark mode',require('./object-browser-example.cjs').documentHtml(),true),
 TASKBAR_DEMO: iframe('taskbar-colours-demo','Rebuilt taskbar with fictional search responses',require('./taskbar-preview.cjs').frameDocument(),true),
 IQA_EXPAND_DEMO: iframe('iqa-expand-demo','Expandable IQA rows with a blank utility heading',require('./iqa-expand-example.cjs').documentHtml(),true),
 DIALOG_DEMO: iframe("dialog-demo","Dialog title, icons and footer",require("./dialog-chrome-example.cjs").documentHtml(),true),
 ACTION_MENU_DEMO: iframe("action-menu-demo","Approved Actions menus",require("./action-menu-example.cjs").documentHtml()),
 ACTION_MENU_HTML: snippet("actions"),
 ACTION_MENU_JS: snippet("client-actions"),
 QUERY_TEMPLATE_DEMO: iframe('query-template-demo','Native Query Template Display shell','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+theme+'body{padding:16px;margin:0;background:var(--bg-page)}</style><body><div class="ContentItemContainer"><div class="us-action-home-manage-bulletin"><div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Staff Bulletin</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet simplePaginateList"><section class="mb-3"><div class="card QueryTemplateItem"><div class="card-body"><h3>Updated Membership Fees</h3><em>Sample author · 12/05/2025</em><p>The latest membership fee schedule is now available.</p></div></div></section><section class="mb-3"><div class="card QueryTemplateItem"><div class="card-body"><h3>New Staff</h3><p>Please welcome our newest staff members.</p></div></div></section></div></div></div></div></div></div><p id="query-action-status" role="status"></p><script>'+themeJs+';UnionSuiteActions.configure("home.manage-bulletin",{className:"us-action-home-manage-bulletin",owner:"preview",source:"query-display",presentation:{label:"Manage bulletin"},context:{},action:{type:"function",run:function(){document.getElementById("query-action-status").textContent="Manage bulletin clicked (demo only)."}}});<\/script></body></html>',true),
 DOCUMENT_LOADER_DEMO: iframe('document-loader-demo','Document Loader upload and Save','<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+nativePreviewCss+theme+'body{margin:0;padding:16px} #document-demo-form .ruFileInput{display:none} .CommandBar,#document-demo-status{max-width:560px;margin:12px auto}</style><body>'+read('Theme/UnionSuite-Guides/usage/source/document-loader-example.html')+'<script>'+themeJs+'<\/script></body></html>',true),
 DATA_PANEL_DEMO: iframe('data-panel-demo','Approved native data panel', '<!doctype html><html lang="en"><meta charset="utf-8"><style>'+nativePreviewCss+theme+iconCss+'body{padding:16px;margin:0}</style><body>'+read('Theme/UnionSuite-Guides/usage/examples/Data-Panel-Native-read.html')+'<script>'+themeJs.match(/\/\* US-DATA-PANELS:START[\s\S]*?US-DATA-PANELS:END \*\//)[0]+';document.addEventListener("click",e=>e.preventDefault(),true);<\/script></body></html>',true),
 CONDITION_DEMO: iframe('condition-demo','IQA editor condition radio buttons', '<!doctype html><html lang="en"><head><meta charset="utf-8"><style>'+nativePreviewCss+'\n'+theme+'\nbody{padding:16px;margin:0;font:14px var(--font-ui)}</style></head><body>'+[['Where','Where Not'],['And','And Not','Or','Or Not']].map((labels,g)=>'<div class="iqa-filter-condition-box"><ul class="radiobutton-buttons radiobutton-btn-group" aria-label="'+(g?'Additional condition':'First condition')+'">'+labels.map((label,i)=>'<li><input type="radio" name="condition-'+g+'" id="condition-'+g+'-'+i+'"'+(!i?' checked':'')+'><label for="condition-'+g+'-'+i+'">'+label+'</label></li>').join('')+'</ul></div>').join('')+'</body></html>',true),
 TABS_DEMO: iframe('tabs-demo','Approved native tabs: V5 menu, H2 Address and standalone tabs',require('./build-tab-display-options.cjs').frameDocument('guide-tabs','vertical',5,2,false),true),
 MESSAGE_DEMO: iframe('message-demo','Native iMIS feedback messages with Union Suite styling',messageDemo,true),
  FORM_DEMO: iframe('form-demo','Native form fields and primary button reversal',formDemo,true),
  BEYOND_FORMS_DESIGNED_DEMO: iframe('beyond-forms-designed-demo','A designed BeyondFormz form: the staff Create case form, cut down',beyondDesignedDemo,true),
  BEYOND_FORMS_DESIGNED_TEMPLATE: '<div class="snippet"><div class="snippet-bar"><span>Designed BeyondFormz form, as rendered (reference markup)</span><button type="button" data-copy="code-beyond-forms-designed">Copy</button></div><pre><code id="code-beyond-forms-designed">'+esc(beyondDesignedMarkup)+'</code></pre></div>',
  FORM_TEMPLATE: '<div class="snippet"><div class="snippet-bar"><span>Native field template</span><button type="button" data-copy="code-forms">Copy</button></div><pre><code id="code-forms">'+esc(formMarkup)+'</code></pre></div>',
  TOKENS_CSS: tokenCss + '\n' + clientRoots,
  GUIDE_CSS: read('Theme/UnionSuite-Guides/usage/source/usage-guide.css'),
  GUIDE_JS: read('Theme/UnionSuite-Guides/usage/source/usage-guide.js'),
  GUIDE_SEARCH_JS: read('Theme/UnionSuite-Guides/usage/source/guide-search.js'),
  ACTION_BUILDER: `<iframe id="action-builder-frame" data-guide-tool title="Interactive action builder" aria-describedby="action-builder-help" srcdoc="${esc(actionBuilder.documentHtml({embedded: true}))}" loading="lazy" allow="clipboard-write"></iframe>`,
  ICON_CSS: iconCss,
  ICON_LICENSE: esc(read('Theme/UnionSuite/Tabler/LICENSE')),
  TOKEN_ROWS: tokenRows,
  BANNER_TOKENS: aliasTable(bannerDefaults, /^--banner-/),
  IQA_TOKENS: aliasTable(iqaDefaults, /^--iqa-/),
  DEMO: `<iframe id="banner-demo" data-theme-preview title="Interactive banner: scroll to condense and open Actions" srcdoc="${esc(demo)}" loading="lazy"></iframe>`,
  BUSY_DEMO: iframe('busy-demo','Busy button examples and working success/failure simulation',busyDemo,true),
  SWITCH_DEMO: iframe('switch-demo','Spring switches: accent and primary, symbols and author recipes',galleryDocument('Spring switches','<style>'+theme+iconCss+'</style>'+require('./switch-examples.cjs').markup),true),
  BUTTON_DEMO: iframe('button-demo','Native buttons: visual examples, copy classes and HTML recipes',buttonDemo,true),
  ACTION_DEMO: iframe('action-demo','Action icons: visual examples, copy classes and HTML recipes',actionDemo,true),
  NATIVE_REPORT_DEMO: iframe('native-report-demo','Native IQA baseline without opt-in classes',reportDemo.replace(reportMarkup, reportMarkup.replace(/us-report(?: us-[a-z-]+)*/g,''))),
  NATIVE_ACTION_REPORT_DEMO: iframe('native-action-report-demo','Native IQA with optional custom actions and Expand',reportDemo.replace(reportMarkup, reportMarkup.replace('us-report us-report-expandable', 'us-report-expandable'))),
  UNSTYLED_REPORT_DEMO: iframe('unstyled-report-demo','Native iMIS IQA with Union Suite styling disabled',reportDemo.replace(reportMarkup, reportMarkup.replace(/us-report(?: us-[a-z-]+)*/g,'us-report-no-styling'))),
  REPORT_DEMO: iframe('report-demo','Dummy IQA: sample members, filters, sorting, paging, export and expand',reportDemo),
  COPY_DEMO: iframe('shared-copy-demo','Reusable copy button','<!doctype html><html lang="en"><meta charset="utf-8"><style>'+theme+'body{padding:24px;margin:0;background:var(--bg-page);color:var(--text-base);font:14px/1.6 var(--font-ui)}#copy-example-text{display:inline-block;padding:8px;margin:8px}</style><body>'+snippets['copy-button'][1]+'<script>'+themeJs+'</script></body></html>',true),
  AGREEMENT_BANNER_DEMO: iframe('agreement-banner-demo','Agreement banner with client-selected fields',staticBanner('Agreement banner',snippets.case[1].replace('CASE-2024-0847','AGR-2026-001').replaceAll('case-banner-id','agreement-banner-id').replaceAll('Copy case ID','Copy agreement ID').replace('Johnson v. Pacific Industries — Workplace Injury Dispute','Pacific Industries Enterprise Agreement').replace(/<span class="us-banner__badge us-banner__badge--danger us-banner__badge--priority">[^]*?<\/span>/,'').replace(/<span data-us-description-full>[^]*?<\/span>/,'<span data-us-description-full>Enterprise agreement covering employment conditions at Pacific Industries.</span>').replace(/<dl class="us-banner__facts"[^]*?<\/dl>/,snippets['agreement-facts'][1])),true),
  CASE_DEMO: iframe('case-banner-demo','Case and agreement banner',staticBanner('Case and agreement banner',snippets.case[1],'<section style="padding:24px;color:var(--text-base)"><h2>Case Details</h2>'+snippets['case-details'][1]+'</section>'),true),
  DASHBOARD_DEMO: iframe('dashboard-demo','Static dashboard banner template',staticBanner('Dashboard banner',snippets.dashboard[1]),true),
  SECTION_TABS_DEMO: iframe("section-tabs-demo","Shared banner and standalone section switching",require("./section-tabs-example.cjs").documentHtml(),true),
  CONTACT_DEMO: iframe('contact-demo','Contact banner template with placeholder fields',staticBanner('Contact banner',snippets.contact[1].replaceAll('{#query.StatusColour}', '#23845B').replaceAll('{#query.StatusDescription}', 'Financial member')),true),
  BANNER_PARTS: iframe('banner-parts-demo','Banner avatar, semantic badges, facts and primary action',staticBanner('Banner parts',parts),true),
  BANNER_PARTS_TEMPLATE: `<div class="snippet"><div class="snippet-bar"><span>Banner parts example · complete inner header</span><button type="button" data-copy="code-banner-parts">Copy</button></div><pre><code id="code-banner-parts">${esc(parts.replace(/></g,'>\n<'))}</code></pre></div>`,
  BRAND_DEMO: `<iframe id="brand-demo" data-theme-preview title="Live brand preview: banners, buttons, report fields and palette" srcdoc="${esc(brandDemo)}" loading="lazy"></iframe>`,
  FINGERPRINT: fingerprint,
  ...Object.fromEntries(Object.keys(snippets).map(key => [`SNIPPET_${key.toUpperCase().replaceAll('-', '_')}`, snippet(key)]))
};
html = html.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
  if (!(key in inserts)) throw Error('Unknown guide placeholder: ' + key);
  return inserts[key];
});
// Place the matching glyph beside each documented navigation mapping.
html = html.replace(/(<tr><th scope="row">)(Home|Organising|Case Management|Collective Agreements|Outbound Calls|Committees|Travels|Integrations)(<\/th><td><code>Nav-Icon[^]*?<td><code>ti-([\w-]+)<\/code><\/td><\/tr>)/g,
  (_,start,label,rest,name)=>start+`<i class="ti ti-${name} guide-icon" aria-hidden="true"></i> `+label+rest);
html = gallery.classCopies(html);
html = html.replace(/<table id="class-table">[\s\S]*?<\/table>/,table=>table
  .replace('</tr></thead>','<th scope="col">Visual</th></tr></thead>')
  .replace(/<tr><th scope="row">[\s\S]*?<\/tr>/g,row=>{
    const label=row.split('</th>')[0];
    const target=/us-action-/.test(label)?'unified-action-route':/home-welcome/.test(label)?'welcome-header':/us-task-completed-filter/.test(label)?'task-completed-filter':/us-list|us-staff-bulletin|us-bulletin__|us-query-search/.test(label)?'content-lists':/Nav-Icon/.test(label)?'navigation-icons':/us-icon-button|ti ti-/.test(label)?'action-icons':/us-banner|is-active/.test(label)?'banners':/us-report|us-filters|us-panel|SearchContactsClass/.test(label)?'reports':'buttons';
    return row.replace('</tr>',`<td><a href="#${target}">View example</a></td></tr>`);
  }));
// Built outside the repo (guide-output.cjs), with its repo links made absolute.
html = guideOutput.repoLinks(html);
const output = guideOutput.guidePath('Usage-Guide.html');
// Share the canonical sources and fixtures with the dedicated config page.
module.exports = {build, inserts, rootTokens, declarations, tokenCategory, colourName,
  theme, themeJs, tokenCss, nativePreviewCss, clientRoots, bannerDefaults, iqaDefaults, iqaSelector, demoBanner};
function build(check = false) {
  if (check) {
    if (!fs.existsSync(output) || fs.readFileSync(output, 'utf8') !== html) {
      console.error('Usage-Guide.html is stale. Run node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs.'); process.exitCode = 1;
    } else console.log('Usage guide is current: ' + fingerprint);
  } else {
    guideOutput.writeGuideFile('Usage-Guide.html', html);
    console.log('Built ' + output + ' (' + rootTokens.size + ' tokens; source ' + fingerprint + ').');
  }
  require('./build-theme-config.cjs').build(module.exports, check);
  listTemplates.build(module.exports, check);
  actionBuilder.build(check);
  require('./unified-action-example.cjs').build({nativePreviewCss,theme,themeJs,branding:clientRoots},check);
  require('./account-menu-example.cjs').build(check);
  require('./object-browser-example.cjs').build(check);
  require('./build-bulletin-study.cjs')(check);
  require('./heading-toggle-reference.cjs').build(check);
}
if (require.main === module) build(process.argv.includes('--check'));
