// Supported offline example of US-QUERY-VALUE: the case Overview's newest
// attachments with the copyable count footer in the iPart's Footer, inside
// the wrapper iMIS renders. The footer loader is the theme's own code; the
// count IQA is a stand-in (fetch is stubbed), and Add a file stands in for
// an upload, which refreshes the list and so reloads the count.
const sources = [
  'Theme/UnionSuite-Guides/usage/build/query-value-example.cjs',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Attachments-Count-Footer.html'
];

const files = [
  ['Northside reply to meeting request', 'Mary O’Conner', '8/10/2026'],
  ['Statement – Priya Natarajan', 'Mary O’Conner', '8/10/2026'],
  ['Night shift roster September', 'Mary O’Conner', '8/10/2026']
];

function documentHtml({read, css, themeJs}) {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  // The page's CaseNum URL parameter, which the preview does not have.
  const footer = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Attachments-Count-Footer.html').trim()
    .replace('data-us-value-filter="CaseNum"', 'data-us-value-filter="CaseNum" data-us-value-filter-value="214"');
  const rows = files.map(([name, by, on]) => '<section><div class="QueryTemplateItem"><div class="us-attachment">' +
    '<span class="us-attachment__file" aria-hidden="true"><i class="ti ti-file-text"></i></span>' +
    '<div class="us-attachment__copy"><span class="us-attachment__name">' + esc(name) + '</span>' +
    '<p class="us-attachment__meta"><span>' + esc(by) + '</span><span>' + esc(on) + '</span></p></div></div></div></section>').join('');
  const stub = 'window.demoCount=4;' +
    'window.fetch=async url=>/\\/api\\/query\\?/.test(String(url))' +
    '?new Response(JSON.stringify({Items:{$values:[{AttachmentCount:String(window.demoCount)}]}}),{status:200,headers:{"Content-Type":"application/json"}})' +
    ':new Response("",{status:404});';
  const upload = 'document.getElementById("demo-add").addEventListener("click",()=>{window.demoCount++;' +
    'const panel=document.querySelector(".us-attachments-demo");' +
    'panel.dispatchEvent(new CustomEvent("us:query-template-refreshed",{bubbles:true,detail:{container:panel}}));});';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '#demo-status{display:flex;align-items:center;gap:12px;margin:0 0 12px;font-size:13px;color:var(--text-muted)}' +
    '.ContentItemContainer{max-width:420px}</style><body>' +
    '<p id="demo-status">The count comes from its own IQA. <button type="button" id="demo-add" class="TextButton us-outline-button">Add a file</button></p>' +
    '<div class="ContentItemContainer"><div class="us-query-template us-attachments us-attachments-demo"><div class="panel">' +
    '<div class="panel-heading"><h2 class="panel-title">Attachments</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' + rows + '</div>' +
    '<span class="template-footer">' + footer + '</span></div></div></div></div></div>' +
    '<script>' + stub + '<\/script>' +
    '<script>' + themeJs + '<\/script>' +
    '<script>' + upload + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
