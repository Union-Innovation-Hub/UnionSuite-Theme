// Offline example: iMIS omits QueryTemplateSet when there are no results.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const esc = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const sources = ['Theme/UnionSuite-Guides/usage/build/query-empty-example.cjs','Theme/UnionSuite-Guides/usage/templates/List-Templates/Contacts-Query-Template.html','Theme/UnionSuite-Guides/usage/source/contact-records.cjs'];
function body(results) {
  if (!results) return '<p>No delegates found.</p>';
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Contacts-Query-Template.html').replace(/<!--[\s\S]*?-->/g,'');
  const records = require('../source/contact-records.cjs').delegates;
  return '<div class="QueryTemplateSet">'+records.map(record => '<section><div class="QueryTemplateItem">'+template.replace(/\{#query\.(\w+)\}/g,(_,field)=>esc(record[field]))+'</div></section>').join('')+'</div>';
}
function panel(results, title='Workplace Delegates') {
  return '<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">'+esc(title)+'</h2></div><div class="panel-description"><div>A list of delegates at this member’s workplace.</div></div><div class="panel-body-container"><div class="panel-body">'+body(results)+'</div></div></div>';
}
function documentHtml() {
  const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
  const icons = read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(/@font-face\s*\{[^}]*\}/g,'@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,'+fs.readFileSync(path.join(root,'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64')+') format("woff2")}');
  const js = read('Theme/UnionSuite/zUnionSuite.js').split('/* US-BANNER-BEHAVIOUR:START */')[0];
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Query templates — empty and populated</title><style>'+css+icons+'\nbody{margin:0;padding:20px;background:var(--bg-page)}.empty-demo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px;align-items:start}.demo-controls{margin:0 0 16px}.demo-label{font-size:13px;margin:0 0 8px}@media(max-width:650px){.empty-demo{grid-template-columns:minmax(0,1fr)}}</style></head><body><p class="demo-controls"><button id="toggle-results" type="button" class="TextButton" aria-pressed="false">Show sample results on the left</button></p><main class="empty-demo"><section><p class="demo-label">Switch this query between empty and populated</p><div class="ContentItemContainer"><div id="empty-query" class="us-list-scroll">'+panel(false)+'</div></div></section><section><p class="demo-label">Populated query for comparison</p><div class="ContentItemContainer"><div id="filled-query" class="us-list-scroll">'+panel(true)+'</div></div></section></main><template id="sample-results">'+body(true)+'</template><script>'+js+'</script><script>document.getElementById("toggle-results").addEventListener("click",function(){const show=this.getAttribute("aria-pressed")!=="true";this.setAttribute("aria-pressed",String(show));document.querySelector("#empty-query .panel-body").replaceChildren(show?document.getElementById("sample-results").content.cloneNode(true):document.createTextNode("No delegates found."));this.textContent=show?"Show no results on the left":"Show sample results on the left";UnionSuiteIqaFilters.refresh();});document.addEventListener("click",e=>{if(e.target.closest(".us-contact a"))e.preventDefault();});</script></body></html>';
}
module.exports = {sources, body, panel, documentHtml};
if (require.main === module) {
  const file = path.join(root,'references/Query-Empty-State.html'), html = documentHtml();
  if (process.argv.includes('--check')) { if (read('references/Query-Empty-State.html') !== html) throw Error('Empty-state preview is stale'); }
  else fs.writeFileSync(file,html);
  console.log('Query empty-state preview is current.');
}
