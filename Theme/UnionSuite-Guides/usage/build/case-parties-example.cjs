// Supported offline simulation of US-CASE-PARTIES. The layout, search,
// Select toggle and lead-first order are the theme's own code; only the
// rows, the party details IQA and the case actions are stand-ins.
const sources = [
  'Theme/UnionSuite-Guides/usage/build/case-parties-example.cjs',
  'Theme/UnionSuite-Guides/usage/examples/Case-Parties.js',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html'
];

function documentHtml({read, css, themeJs}) {
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html');
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '#demo-status{margin:0 0 12px;font-size:13px;color:var(--text-muted)}</style><body>' +
    '<p id="demo-status" role="status">Choose a party, search the list, or press Select to tick who to email. Make primary party moves the crown.</p>' +
    '<div id="parties-demo"></div>' +
    '<script>window.casePartiesTemplate=' + JSON.stringify(template).replace(/<\//g, '<\/') + ';<\/script>' +
    '<script>' + read('Theme/UnionSuite-Guides/usage/examples/Case-Parties.js') + '<\/script>' +
    '<script>' + themeJs + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
