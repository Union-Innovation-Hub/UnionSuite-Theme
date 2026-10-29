// Portable native-tab design studies: 5 vertical + 3 horizontal, with nesting.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const tokens = read('Theme/UnionSuite/zUnionSuite.css').split('/* US-NATIVE-BUTTONS:START */')[0];
const native = read('Theme/UnionSuite/99-Orion.css').split('/* RadTabStrip\n')[1]?.split('/* RadTabStrip - Content Collection Organiser')[0];
if (!tokens.includes('--seed-accent') || tokens.includes('.us-report') || !native?.includes('.rtsSelected')) throw Error('Native CSS or token extraction boundary changed.');
const styles = read('Theme/UnionSuite-Guides/usage/examples/Tab-Display-Options.css');
const theme = read('Theme/UnionSuite/zUnionSuite.css');
const themeJs = read('Theme/UnionSuite/zUnionSuite.js');
const section = (text,name) => { const part=text.split('/* '+name+':START */')[1]?.split('/* '+name+':END */')[0]; if(!part) throw Error('Missing '+name); return part; };
const approvedCss = section(theme,'US-NATIVE-TABS-PAGE-LAYOUT') + section(theme,'US-NATIVE-TABS-COMPONENT');
const approvedJs = section(themeJs,'US-NATIVE-TABS');
const fixtureCss = read('Theme/UnionSuite-Guides/usage/examples/CCO-Tabs-Fixture.css');
const fixtureJs = read('Theme/UnionSuite-Guides/usage/examples/Tab-Display-Fixture.js');
const horizontal = ['Missing contact details','Contact names','Addresses','Membership','No Company ID','Locked out users'];
const vertical = ['Overview','Participation','About','Membership','Transactions','Giving','Volunteering','Preferences','Security','Alerts'];
const options = {
  v: [
    ['Midnight','Dark continuous menu. A solid accent block makes the current section unmistakable.'],
    ['Inset cards','Soft grey menu with individual white rows. Selection uses an accent outline and a warm tint.'],
    ['Accent rail','A full accent-colour menu. The current row turns white with a dark edge.'],
    ['Open-right tabs','H2 turned vertically: a white selected tab opens into the content on its right, with an accent left edge.'],
    ['Warm attached tabs','V2 colouring meets V4 geometry: white inactive rows, a warm accent selection fading to white at the open right edge, joining a white panel.']
  ],
  h: [
    ['Segmented track','A single neutral track with a raised accent segment for the current tab.'],
    ['Attached tabs','Folder-style tabs attached to the content surface, with an accent cap on the selected tab.'],
    ['Accent bar','A continuous accent bar with a dark selected tab. A bolder, flatter treatment.']
  ]
};
function tab(label, id, i, count) {
  return `<li class="rtsLI${i === 0 ? ' rtsFirst' : ''}${i === count-1 ? ' rtsLast' : ''}" role="presentation"><a class="rtsLink${i === 0 ? ' rtsSelected' : ''}" id="${id}-tab-${i}" href="#${id}-panel-${i}" role="tab" aria-disabled="false" aria-selected="${i === 0}" aria-controls="${id}-panel-${i}" tabindex="${i === 0 ? 0 : -1}"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${esc(label)}</span></span></span></a></li>`;
}
function tabs({id, key, labels, kind='horizontal', bodies=[], cco=true, add=false}) {
  const strip = kind === 'vertical' ? 'RadTabStripVertical RadTabStrip_Orion RadTabStripLeft_Orion RadTabStripLeft' : 'RadTabStrip RadTabStrip_Orion RadTabStripTop_Orion RadTabStripTop';
  const outer = cco ? `cco tabs-wrapper tabs-${kind} tabs-${kind === 'vertical' ? 'left' : 'top'}` : 'ContentTabbedDisplay';
  return `<div class="${outer}" data-demo-tabset="${key}"><div class="${strip}" aria-disabled="false" aria-activedescendant="${id}-tab-0"><div class="rtsLevel rtsLevel1"><ul class="rtsUL" role="tablist" aria-label="${key === 'addresses' ? 'Address types' : key === 'standalone' ? 'Contact profile' : kind === 'vertical' ? 'Account page' : 'Data integrity'}">${labels.map((label,i) => tab(label,id,i,labels.length)).join('')}${add ? '<li class="rtsLI" role="presentation"><a class="rtsLink rtsDisabled" role="button" aria-disabled="true" aria-label="Add address unavailable in preview">+</a></li>' : ''}</ul></div></div><div class="RadMultiPage RadMultiPage_Default">${labels.map((label,i) => `<div class="rmpView" id="${id}-panel-${i}" role="tabpanel" aria-labelledby="${id}-tab-${i}" tabindex="0"${i ? ' hidden' : ''}><p class="selection-caption">Selected: ${esc(label)}</p><div class="demo-content">${bodies[i] || `<h2>${esc(label)}</h2><p class="hint">Sample content for ${esc(label)}. No live iMIS request is made.</p>`}</div></div>`).join('')}</div></div>`;
}
function addresses(id) {
  return tabs({id:id+'-address',key:'addresses',cco:false,labels:['Residential','Postal','Business'],add:true,bodies:[
    '<div class="address-text"><strong>Residential address</strong>14 Example Street<br>Carlton VIC 3053<p class="hint">Preferred mailing address</p></div>',
    '<div class="address-text"><strong>Postal address</strong>PO Box 120<br>Carlton VIC 3053<p class="hint">Correspondence only</p></div>',
    '<div class="address-text"><strong>Business address</strong>42 Sample Road<br>Melbourne VIC 3000<p class="hint">Workplace address</p></div>'
  ]});
}
function overview(id) {
  return `<section class="demo-block"><h2>Tasks</h2><table aria-label="Tasks"><thead><tr><th scope="col">Date</th><th scope="col">Assigned to</th></tr></thead><tbody><tr><td colspan="2">There are no records.</td></tr></tbody></table></section><section class="demo-block"><h2>Addresses</h2>${addresses(id)}<p class="nested-note">These native Address tabs use the selected horizontal style.</p></section><section class="demo-block"><h2>Open invoices</h2><table aria-label="Open invoices"><thead><tr><th scope="col">Invoice</th><th scope="col">Date</th></tr></thead><tbody><tr><td colspan="2">This person has no open invoices.</td></tr></tbody></table></section>`;
}
function frameDocument(id, kind, v, h, swatch = true) {
  const approved = !swatch;
  const outer = tabs({id, key:'outer', kind, labels:kind === 'vertical' ? vertical : horizontal, bodies:swatch ? [] : [overview(id)]});
  const standalone = swatch ? '' : `<section class="standalone-demo"><h2>Standalone tabbed display</h2><p class="hint">The same horizontal style also applies outside a CCO.</p>${tabs({id:id+'-profile',key:'standalone',cco:false,labels:['Contact details','Employment','Demographics'],bodies:['<strong>Contact details</strong><p>member@example.org</p>','<strong>Employment</strong><p>Example Community Services · Member services</p>','<strong>Demographics</strong><p>Preferred language: English</p>']})}</section>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(id)} — tab display preview</title><style>${tokens}\n${fixtureCss}\n/* RadTabStrip\n${native}\n${approved ? approvedCss : styles}\n${approved ? '' : fixtureCss}</style></head><body class="${approved ? 'us-tabs-approved' : 'us-tab-study us-tabs-v'+v+' us-tabs-h'+h+' menu-swatch'}" data-fixture="${id}">${outer}${standalone}<script>${fixtureJs}</script>${approved ? '<script>'+approvedJs+'</script>' : ''}</body></html>`;
}
function frame(id, kind, v, h, swatch = true) {
  const html = frameDocument(id,kind,v,h,swatch);
  return `<div class="frame-wrap"><iframe id="${id}" data-group="${swatch ? kind : 'combined'}" title="${swatch ? `${kind === 'vertical' ? 'V'+v : 'H'+h} ${options[kind === 'vertical' ? 'v' : 'h'][(kind === 'vertical' ? v : h)-1][0]}` : 'Combined tab display preview'}" srcdoc="${esc(html)}"></iframe></div>`;
}
function card(kind, i) {
  const key = kind === 'vertical' ? 'v' : 'h';
  const code = key.toUpperCase() + (i+1);
  return `<article class="comparison-card" id="option-${code.toLowerCase()}"><div class="card-head"><h3><span class="option-code">${code}</span>${options[key][i][0]}${i === (key === 'v' ? 4 : 1) ? '<span class="badge">APPROVED</span>' : ''}</h3><p>${options[key][i][1]}</p></div>${frame('option-'+code,kind,kind === 'vertical' ? i+1 : 2,kind === 'horizontal' ? i+1 : 2)}</article>`;
}
const chooser = key => options[key].map(([name],i) => `<option value="${i+1}"${i === 1 ? ' selected' : ''}>${key.toUpperCase()}${i+1} · ${name}</option>`).join('');
const recipe = `<!-- Preview scope only: put both choices on one ancestor of ALL tab displays. -->
<div class="us-tab-study us-tabs-v1 us-tabs-h2">
  <!-- Existing native CCO, standalone and nested Address tab markup goes here. -->
</div>
<!-- v1/v2/v3/v4/v5 chooses the vertical style; h1/h2/h3 chooses every horizontal strip. -->`;
const html = `<!doctype html>
<!-- Generated by Theme/UnionSuite-Guides/usage/build/build-tab-display-options.cjs; rebuild via tools/build-cco-tabs-comparison.cjs. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tab displays — eight design options</title><style>${read('Theme/UnionSuite-Guides/usage/examples/CCO-Tabs-Comparison.css')}</style></head><body data-layout="full"><main>
<a href="index.html">← All component references</a><div class="eyebrow">UNION SUITE / TAB DISPLAY STUDY</div><h1>Tab display options <span class="badge">V5 / H2 APPROVED</span></h1><p class="intro">Five vertical menus. Three horizontal menus. Each uses the accent differently, across CCOs, standalone tabbed displays and nested Address tabs.</p><p class="intro">The full example below uses the approved shared theme. Earlier options remain here for comparison.</p>
<p class="chosen-direction"><strong>Approved pairing: V5 Warm attached tabs + H2 Attached tabs.</strong> <a href="#combine-heading">View the selected combination</a></p><nav class="jump-links" aria-label="Comparison sections"><a href="#vertical-heading">Vertical · V1–V5</a><a href="#horizontal-heading">Horizontal · H1–H3</a><a href="#combine-heading">Try a combination</a></nav>
<div class="toolbar"><label><input type="checkbox" id="sync-tabs" checked> Match sample selections</label><label><input type="checkbox" id="disable-last"> Disable final tabs</label><button type="button" id="reset">Reset examples</button></div>
<section aria-labelledby="vertical-heading"><div class="section-head"><h2 id="vertical-heading">Vertical menus</h2><p>Five vertical treatments, including two open-right variations. The sample menus stay vertical for comparison; the full example adapts to narrow screens.</p></div><div class="option-grid vertical-options">${options.v.map((_,i) => card('vertical',i)).join('')}</div></section>
<section aria-labelledby="horizontal-heading"><div class="section-head"><h2 id="horizontal-heading">Horizontal menus</h2><p>Different structures, not just colour changes. Each style also applies to Address and other nested tab strips.</p></div><div class="option-grid horizontal-options">${[0,1,2].map(i => card('horizontal',i)).join('')}</div></section>
<section class="combined-section" aria-labelledby="combine-heading"><div class="section-head"><h2 id="combine-heading">Try them together</h2><p>Approved V5 + H2. Switch the Address tabs and try the standalone display below the account panel.</p></div><div class="toolbar"><strong>V5 · Warm attached tabs + H2 · Attached tabs</strong><fieldset><legend>Preview</legend><label><input type="radio" name="layout" value="full" checked> Full width</label><label><input type="radio" name="layout" value="narrow"> Narrow · 390px</label></fieldset></div><div class="comparison-card">${frame('combined','vertical',5,2,false)}</div></section>
<section class="technical" aria-labelledby="implementation"><h2 id="implementation">Approved implementation &amp; archived trials</h2><p>V5 and H2 are approved and implemented in zUnionSuite.css and zUnionSuite.js. The combined example uses those shared sources. The other six designs and trial CSS are retained as an archive. One horizontal choice covers top-level CCOs, nested Address tabs and standalone native tabbed displays; the vertical choice applies to native vertical strips. Banner markup remains a separate component.</p>
<table><tbody><tr><th scope="row">Native targets</th><td><code>.RadTabStrip</code> and <code>.RadTabStripVertical</code>, with their direct <code>.rtsLevel &gt; .rtsUL &gt; .rtsLI &gt; .rtsLink</code> chain. Styling does not require a CCO ancestor or a generated ID.</td></tr><tr><th scope="row">Preview placement</th><td><code>us-tab-study</code> plus one <code>us-tabs-v1/v2/v3/v4/v5</code> and one <code>us-tabs-h1/h2/h3</code> on a common ancestor. These are trial comparison modifiers, not installed author classes. Nested displays inherit the horizontal choice automatically.</td></tr><tr><th scope="row">Colour tokens</th><td>Accent fills/caps/outlines use <code>--accent</code>; warm selections use <code>--accent-100</code>; text on accent uses <code>--text-on-accent</code>. Dark surfaces use <code>--brand-900</code>; light surfaces use <code>--bg-surface</code> and <code>--bg-sunken</code>. All tokens are read from the shared theme at build time.</td></tr><tr><th scope="row">Responsive layout</th><td>On mobile (600px or below), H2 uses a single scrolling row, including nested and standalone tabs. Other horizontal trials retain wrapping. In the full preview, the 220px vertical menu becomes a scrolling row at 600px or below. V4 opens right into a white content panel; V5 uses the same opening with V2’s grey rail, white inactive rows and warm accent selection, fading the selected tab to white at the open edge while the adjoining panel stays white with a neutral grey border. Both become scrolling top rows with a bottom opening at narrow widths; V5 uses a solid pale accent selection and top cap. Mobile targets are at least 44px high. Full vertical examples offer an All sections disclosure for direct navigation; overflowing rows show edge fades and reveal the selected tab automatically. Menu-only swatches deliberately remain vertical; V4 and V5 include a slice of the adjacent panel. Those swatch overrides are confined to fixture CSS.</td></tr><tr><th scope="row">Interaction</th><td>Every tabset has independent selection, ARIA state, arrow keys, Home/End and disabled-tab skipping. Changing an outer tab preserves nested selection. The mobile All sections list reflects selected and disabled states; selection closes it and focuses the tab, and Escape closes it and returns focus to its trigger. The approved example uses UnionSuiteTabs for mobile navigation; only dummy panel switching belongs to the fixture. The Address + action is an unavailable demo placeholder. Native iMIS owns panel selection and requests; the shared All sections adapter activates the existing native tab.</td></tr><tr><th scope="row">Production limits</th><td>This demonstrates the supplied Orion/Telerik markup family. Other skins, scroll-button modes, right/bottom placement and unrelated custom tab widgets need inspection before claiming support. No server postbacks, validation or real records are used. Live iMIS must retain native selection, keyboard and refresh behaviour; do not deploy the fixture controller.</td></tr></tbody></table>
<details><summary>Trial class placement</summary><button class="copy" type="button" data-copy="trial-html">Copy HTML</button><pre><code id="trial-html">${esc(recipe)}</code></pre></details><details><summary>All eight styles — comparison CSS</summary><button class="copy" type="button" data-copy="trial-css">Copy CSS</button><pre><code id="trial-css">${esc(styles)}</code></pre></details><p id="copy-status" role="status"></p><p class="foot">Source: <code>Theme/UnionSuite-Guides/usage/examples/Tab-Display-Options.css</code>. Build: <code>node tools/build-cco-tabs-comparison.cjs</code>. <a href="../Theme/UnionSuite-Guides/Usage-Guide.html#cco-tabs-trial">Usage guide entry</a>.</p></section>
</main><script>${read('Theme/UnionSuite-Guides/usage/examples/CCO-Tabs-Comparison.js')}</script></body></html>`;
module.exports = {frameDocument};
if (require.main === module || module.parent?.filename.endsWith('build-cco-tabs-comparison.cjs')) {
const output = path.join(root,'references/CCO-Tabs-Comparison.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(output) || fs.readFileSync(output,'utf8') !== html) {console.error('Tab display comparison is stale. Rebuild it.');process.exitCode=1;}
  else console.log('Tab display comparison is current (5 vertical, 3 horizontal, nested/standalone preview).');
} else {fs.writeFileSync(output,html);console.log('Built references/CCO-Tabs-Comparison.html (eight tab display options).');}

}
