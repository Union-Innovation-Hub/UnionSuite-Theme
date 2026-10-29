// Supported offline simulation of US-INLINE-COMPOSER. The composer, the
// holding rows, the quiet insert and the popup hand-off are the theme's own
// code; only the save, the page read and the native popup are stand-ins.
const sources = [
  'Theme/UnionSuite-Guides/usage/build/inline-composer-example.cjs',
  'Theme/UnionSuite-Guides/usage/examples/Inline-Composer.js',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html'
];

function documentHtml({read, css, themeJs}) {
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html');
  const controls = '<div class="demo-controls">' +
    '<label><input type="checkbox" id="demo-save-fails"> Simulate a failed save</label>' +
    '<label>The full form closes <select id="demo-popup-result">' +
    '<option value="saved">after a save ({saved: true})</option>' +
    '<option value="cancel">on Cancel ({cancel: true})</option>' +
    '<option value="">with the × (nothing passed)</option></select></label></div>' +
    '<p id="demo-status" role="status">Press Add task, type a task and save. Try a due date in the past, a failed save, or More options.</p>';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css +
    'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}' +
    '.demo-controls{display:flex;align-items:center;gap:8px 16px;flex-wrap:wrap;margin-bottom:8px;font-size:13px}' +
    '#demo-status{margin:0 0 16px;font-size:13px;color:var(--text-muted)}</style><body>' + controls +
    '<div id="composer-demo"></div>' +
    '<script>window.composerDemoTemplate=' + JSON.stringify(template).replace(/<\//g, '<\\/') + ';<\/script>' +
    '<script>' + themeJs + '<\/script><script>' + read('Theme/UnionSuite-Guides/usage/examples/Inline-Composer.js') + '<\/script></body></html>';
}

module.exports = {sources, documentHtml};
