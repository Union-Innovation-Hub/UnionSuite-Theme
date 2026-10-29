// Supported offline simulation of the case member card and its workplace
// choice (US-CASE-MEMBER, US-CASE-WORKPLACE). The card, its details layout
// and the jobs menu are the theme's own code; only the rows, the two IQAs
// and the CloudToolz save are stand-ins.
const sources = [
  'Theme/UnionSuite-Guides/usage/build/case-member-example.cjs',
  'Theme/UnionSuite-Guides/usage/examples/Case-Member.js',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html'
];

function documentHtml({read, css, themeJs}) {
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '#demo-status{margin:0 0 12px;font-size:13px;color:var(--text-muted)}' +
    '#member-demo{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:16px;align-items:start}' +
    '.demo-label{margin:0 0 6px;font-size:12px;font-weight:600;color:var(--text-muted)}</style><body>' +
    '<p id="demo-status" role="status">Three cases for a member with two current jobs, one not started and a former one. Press Work to change which job the case is about.</p>' +
    '<div id="member-demo"></div>' +
    '<script>window.caseMemberTemplate=' + JSON.stringify(template).replace(/<\//g, '<\/') + ';<\/script>' +
    '<script>' + read('Theme/UnionSuite-Guides/usage/examples/Case-Member.js') + '<\/script>' +
    '<script>' + themeJs + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
