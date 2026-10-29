// Regenerate the preview and legacy compatibility assets from the shared theme.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const themeJs = read('Theme/UnionSuite/zUnionSuite.js')+'\n'+read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
const script = require('./theme-sources.cjs').bannerBehaviour(themeJs);
const embed = `<!-- GENERATED compatibility fallback; edit zUnionSuite.js, not this file.
Canonical banner CSS and behaviour now ship in zUnionSuite.css / zUnionSuite.js.
New installations load those theme files once; this embed is unnecessary.
After deploying the shared JS and verifying window.UnionSuiteBanners, remove
the old separate banner include. Keep the visible banner HTML and iPart classes.
For an older site without the shared JS, this fallback supplies behaviour only.
Do not add CSS here. Rebuild with node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs.
-->
<script id="us-banner-behaviour">
${script}
</script>
`;
fs.writeFileSync(path.join(root, 'Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html'), embed);
const template = read('Theme/UnionSuite-Guides/usage/templates/Banner-Template.html');
fs.writeFileSync(path.join(root, 'Theme/UnionSuite-Guides/usage/examples/Banner-Behaviour.js'), script.trim() + '\n');
const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css', 'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite/zUnionSuite.css']
  .map(read).join('\n').replace(/@import\s+[^;]+;/g, '');
const values = {
  '[Record type]': 'Contact', '[Record ID]': 'MBR-004821', '[Record name]': 'Sarah Reynolds',
  '[Supporting record information]': 'Full member · Member since 12 March 2018', '[Record status]': 'Active',
  '[Fact label 1]': 'Email', '[Fact value 1]': 'sarah.reynolds@example.org',
  '[Fact label 2]': 'Employer', '[Fact value 2]': 'Harbour Services',
  '[Fact label 3]': 'Branch', '[Fact value 3]': 'Sydney Metro',
  '[Fact label 4]': 'Organiser', '[Fact value 4]': 'Alex Morgan'
};
let banner = template;
Object.entries(values).forEach(([key, value]) => { banner = banner.replaceAll(key, value); });
const html = `<!doctype html>
<!-- Generated preview. Edit zUnionSuite.css / zUnionSuite.js / Banner-Template.html,
     then run node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs. Sample data only. -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Union Suite — banner preview</title>
<style>${css}</style>
<script>${themeJs}</script>
<style>
body{margin:0;background:var(--bg-page);color:var(--text-base);font-family:var(--font-ui)}
#hd{position:sticky;top:0;z-index:var(--z-header);min-height:56px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 20px;background:var(--bg-surface);border-bottom:1px solid var(--border);font-size:13px}
#hd strong{color:var(--text-strong)}
.preview-controls{display:flex;gap:16px;align-items:center;flex-wrap:wrap}
.preview-controls label{display:flex;gap:6px;align-items:center;margin:0;font-size:12px;font-weight:500}
.preview-controls input{margin:0}
.preview-sidebar{position:fixed;top:56px;left:0;bottom:0;width:64px;background:var(--bg-inverse);color:var(--text-inverse);display:flex;align-items:center;flex-direction:column;gap:40px;padding-top:24px;font-size:11px;z-index:var(--z-sidebar)}
.main{margin-left:64px}
.preview-content{margin-top:var(--space-6)}
.preview-card{padding:var(--space-6);border:1px solid var(--border);border-radius:var(--radius);background:var(--bg-surface);margin-bottom:var(--space-5)}
.preview-card h2{color:var(--text-strong);font-size:var(--fs-lg);margin:0 0 12px}
.preview-card p{margin:0;max-width:75ch;font-size:var(--fs-sm);line-height:var(--lh-loose)}
.preview-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:24px;margin-top:24px}
.preview-facts dt{font-weight:400;font-size:12px;color:var(--text-muted)}
.preview-facts dd{margin:4px 0 0;color:var(--text-strong);font-weight:600}
.preview-spacer{min-height:1100px}
@media(max-width:600px){.main{margin-left:0}.preview-sidebar{display:none}#hd{padding:10px 16px}}
</style></head>
<body class="us-banner-page">
<header id="hd"><strong>Union Suite · Banner preview</strong><div class="preview-controls">
<label><input id="preview-actions" type="checkbox" checked>Actions</label>
<label><input id="preview-tabs" type="checkbox" checked>Tabs</label>
</div></header>
<aside class="preview-sidebar" aria-label="Sample sidebar"><span>Home</span><span>CRM</span><span>Tasks</span></aside>
<main class="main"><div class="ContentPanel"><div class="SimpleLayout">
<div class="row"><div class="col-sm-12"><div class="ContentItemContainer"><div class="WebPartZone"><div class="iMIS-WebPart"><div class="ContentItemContainer"><div class="us-banner us-banner-collapsible">
${banner}
</div></div></div></div></div></div></div>
<div class="row preview-content"><div class="col-sm-12">
<section class="preview-card"><h2>Review the optional controls</h2><p>Open Actions to inspect the dropdown. Scroll to see Actions and the tabs stay visible as the banner condenses. Use the checkboxes above to remove either block. The sample commands and tabs are disabled until connected to real actions and content.</p></section>
<section class="preview-card"><h2>Contact summary</h2><p>Sample content shows how the page aligns with the banner's native gutters.</p><dl class="preview-facts"><div><dt>Member type</dt><dd>Full member</dd></div><div><dt>Branch</dt><dd>Sydney Metro</dd></div><div><dt>Employer</dt><dd>Harbour Services</dd></div></dl></section>
<section class="preview-card preview-spacer"><h2>Page content</h2><p>The banner will remain visible above the page while you scroll.</p></section>
</div></div></div></div></main>
<script>
(function(){
  var surface=document.querySelector('.us-banner__surface');
  var actions=surface.querySelector('.us-banner__actions');
  var tabs=surface.querySelector('.us-banner__nav');
  document.getElementById('preview-actions').addEventListener('change',function(){
    if(this.checked) surface.querySelector('.us-banner__summary').append(actions); else actions.remove();
  });
  document.getElementById('preview-tabs').addEventListener('change',function(){
    if(this.checked) surface.append(tabs); else tabs.remove();
  });
})();
</script></body></html>`;
fs.writeFileSync(path.join(root, 'references/Banner-Preview.html'), html);
console.log('Updated Banner-Preview.html and synchronized Banner-Behaviour.js.');
