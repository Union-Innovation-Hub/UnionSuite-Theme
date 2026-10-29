// Supported offline example of the two-row case banner: the copyable Query
// Template filled with its documented sample values, inside the wrapper
// iMIS renders for a Query Template Display iPart with a CSS class. The
// banner, member line, status menu and details row are the theme's own
// code; only the details IQA's row is a stand-in (fetch is stubbed).
const sources = [
  'Theme/UnionSuite-Guides/usage/build/case-banner-example.cjs',
  'Theme/UnionSuite-Guides/usage/templates/Banner-Case-Rows-Query-Template.html'
];

// The details IQA row, in IQA column order.
const detailsRow = {
  Description: 'Priya reports repeated belittling comments from a night shift supervisor since July.',
  'Additional-Opened': '7 Oct 2026 · 13 days',
  'Additional-Type': 'Bullying / Harassment',
  'Additional-Subtype': '',
  'Additional-Priority': 'High',
  'Tone-Priority': 'warning',
  'Additional-Lead staff': 'Mary O’Conner',
  'Tone-Lead staff': '',
  'Additional-Last member contact': '21 days ago',
  'Tone-Last member contact': 'warning'
};

function documentHtml({read, css, themeJs, fields}) {
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const template = read('Theme/UnionSuite-Guides/usage/templates/Banner-Case-Rows-Query-Template.html')
    .replace(/\{#query\.(\w+)\}/g, (_, name) => esc(fields[name].example))
    // The page's CaseNum URL parameter, which the preview does not have.
    .replace('data-us-facts-filter="CaseNum"', 'data-us-facts-filter="CaseNum" data-us-facts-value="214"')
    // The case actions tick the current status; the preview has none.
    .replace('data-us-case-status="Open">', 'data-us-case-status="Open" aria-current="true">');
  const stub = 'window.fetch=async url=>/\\/api\\/query\\?/.test(String(url))' +
    '?new Response(JSON.stringify({Items:{$values:[' + JSON.stringify(detailsRow).replace(/<\//g, '<\\/') + ']}}),{status:200,headers:{"Content-Type":"application/json"}})' +
    ':new Response("",{status:404});';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '#demo-status{margin:0 0 12px;font-size:13px;color:var(--text-muted)}</style><body>' +
    '<p id="demo-status">Open the status pill to see the status menu. The menu items show as not configured until the site defines the case actions.</p>' +
    '<div class="ContentItemContainer"><div class="us-banner"><div class="panel"><div class="panel-body-container"><div class="panel-body">' +
    '<div class="QueryTemplateSet"><section><div class="QueryTemplateItem">' + template + '</div></section></div>' +
    '</div></div></div></div></div>' +
    '<script>' + stub + '<\/script>' +
    '<script>' + themeJs + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
