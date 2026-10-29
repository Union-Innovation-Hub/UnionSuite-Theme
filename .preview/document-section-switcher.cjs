const fs=require('fs');const p='Theme/UnionSuite/guides/usage/source/Usage-Guide.source.html';let s=fs.readFileSync(p,'utf8');
const section=`
<section id="section-switcher" class="section">
<h2>Banner navigation and standalone submenus</h2>
<p><strong>Implemented:</strong> banner tabs use the full-width darker 6B navigation area with neutral segmented selections. Standalone submenus use option 6: a 10px rounded track, 6px selected item and small theme-accent marker. Both retain inset shading while pressed.</p>
{{SECTION_TABS_DEMO}}
<p>This example runs the shared section switcher. Edit a field, switch the banner or submenu, and return: values and DOM nodes remain intact.</p>
<h3>Connect a menu</h3>
<p>Add <button type="button" data-copy-text="us-section-tabs"><code>us-section-tabs</code></button> to a standalone menu div. For a banner use the existing <code>us-banner__nav</code> / <code>us-banner__tabs</code> structure. On the menu or its enclosing nav set <code>data-us-tabs="member"</code> and <button type="button" data-copy-text='data-us-tab-adapter="page-sections"'><code>data-us-tab-adapter="page-sections"</code></button>. This explicit adapter opt-in is required; legacy visual-only menus do not start hiding content.</p>
<p>Give each button a unique <code>data-us-tab</code> key, with <code>is-active</code> on the initial choice. Use lowercase keys starting with a letter, followed by letters, digits or hyphens. Do not include disabled buttons in a connected menu: omit unavailable sections instead. One menu per group is supported. Nested submenus use a different group key.</p>
<div class="snippet"><div class="snippet-bar"><span>Standalone menu · inner HTML</span><button type="button" data-copy="code-section-menu">Copy</button></div><pre><code id="code-section-menu">&lt;div class="us-section-tabs" data-us-tabs="member"
     data-us-tab-adapter="page-sections" aria-label="Member sections"&gt;
  &lt;button type="button" data-us-tab="overview" class="is-active"&gt;Overview&lt;/button&gt;
  &lt;button type="button" data-us-tab="notes"&gt;Notes&lt;/button&gt;
&lt;/div&gt;</code></pre></div>
<h3>Mark the sections to show and hide</h3>
<p>Use <button type="button" data-copy-text="us-tab-panel us-tabset-member us-tab-overview"><code>us-tab-panel us-tabset-member us-tab-overview</code></button> on the Overview section owner and <button type="button" data-copy-text="us-tab-panel us-tabset-member us-tab-notes"><code>us-tab-panel us-tabset-member us-tab-notes</code></button> on Notes. Several sibling owners can share the same tab key. Unmarked content stays visible.</p>
<p>For an iPart, put these values in its CSS class field: iMIS inserts the marked div inside ContentItemContainer. Only that div and its children are hidden. If a title or layout column sits outside it, mark an explicit common section container that includes them. Do not assume zone CSS automatically includes its title or removes an outer grid gap. Automatic zone-owner discovery is not implemented. Keep the menu outside its own switched panels; do not mark native CCO page views.</p>
<div class="snippet"><div class="snippet-bar"><span>Explicit sections · Content HTML</span><button type="button" data-copy="code-section-panels">Copy</button></div><pre><code id="code-section-panels">&lt;section class="us-tab-panel us-tabset-member us-tab-overview"&gt;
  &lt;h2&gt;Overview&lt;/h2&gt;
  &lt;!-- Overview content --&gt;
&lt;/section&gt;
&lt;section class="us-tab-panel us-tabset-member us-tab-notes"&gt;
  &lt;h2&gt;Notes&lt;/h2&gt;
  &lt;!-- Notes content --&gt;
&lt;/section&gt;</code></pre></div>
<p>Load zUnionSuite.css and zUnionSuite.js once. The script validates the whole group before hiding anything. Missing sections, duplicate groups/keys, disabled choices, no-styling owners, and overlapping panel owners within one group leave the original content available. Removing a menu restores its original visibility. Easy Edit via the visible on-toggle or EasyEdit body class also releases managed visibility.</p>
<p>Keyboard arrows and Home/End move focus; Enter/Space activates. The controller adds tab roles, panel IDs, labels and aria-controls, including multiple panels per key. Selections survive partial DOM replacement within the same URL; a full reload resets them. No URL rewriting, lazy loading or data refresh occurs. The script emits <code>us:sectionchange</code> with group, key and visible panels; use a verified widget reflow hook when charts need it, rather than re-running queries.</p>
<p><code>UnionSuiteSections.refresh()</code> reconnects after class/availability configuration changes or a same-page record-context change. <code>UnionSuiteSections.select('member','notes')</code> selects a connected section and returns whether it succeeded. Content remains mounted, so unsaved values survive switching, but no saving is provided. Hidden fields may still participate in native validation; verify real forms before rollout. Hiding is not access control. CCO keeps its own loading and postbacks; this adapter can control explicitly authored subsections inside a CCO, but does not replace its page views.</p>
</section>
`;
s=s.replace('<section id="native-tabs"',section+'\n<section id="native-tabs"');
s=s.replace('Optional banner tabs keep a faint selected fill, white semibold text and the status-coloured underline. Tab content integration still requires an adapter; styling does not replace the CCO or implement content loading.','Optional banner tabs use the darker full-width 6B band, neutral segmented selection and inset pressed shading. Connect explicit page sections using the section-switcher instructions; native CCO loading remains separate.');
s=s.replace('The 8px left rail, pill and selected-tab underline share the derived display colour.','The 8px left rail and pill share the derived display colour. Banner tabs use neutral selection without a status-coloured underline.');
fs.writeFileSync(p,s);
const b='Theme/UnionSuite/guides/usage/build/build-theme-usage.cjs';s=fs.readFileSync(b,'utf8').replace('const fingerprint = hash.digest','hash.update(read("Theme/UnionSuite/guides/usage/build/section-tabs-example.cjs"));\nconst fingerprint = hash.digest');
s=s.replace('  CONTACT_DEMO:','  SECTION_TABS_DEMO: iframe("section-tabs-demo","Shared banner and standalone section switching",require("./section-tabs-example.cjs").documentHtml(),true),\n  CONTACT_DEMO:');fs.writeFileSync(b,s);
