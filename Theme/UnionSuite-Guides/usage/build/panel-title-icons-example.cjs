// Guide-only fixture: panel titles typed with a leading [[icon-name]] token,
// converted by the shared US-PANEL-TITLE-ICONS block in zUnionSuite.js,
// which draws the theme's own us- icons from US-ICONS.
// Each caption shows exactly what was typed in the iPart Title field.
exports.sources = ['Theme/UnionSuite-Guides/usage/build/panel-title-icons-example.cjs'];

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const panels = [
  ['[[user]] Contact summary', 'Typed with a known icon name: the token becomes the icon.'],
  ['[[receipt]] Recent payments', 'Any Tabler icon name works, without the ti- prefix.'],
  ['[[us-building]] Covered workplaces', 'One of the theme\'s own icons, by its us- name.'],
  ['[[recieve]] Documents', 'A misspelt name: the token is still removed, and no icon or gap is left.'],
  ['Pinned notes', 'No token: the title is unchanged.']
];

exports.documentHtml = ({nativePreviewCss, theme, themeJs, iconCss, branding}) => {
  const block = name => themeJs.match(new RegExp('/\\* ' + name + ':START[\\s\\S]*?/\\* ' + name + ':END \\*/'))[0];
  const runtime = block('US-ICONS') + '\n' + block('US-PANEL-TITLE-ICONS');
  const markup = panels.map(([title, note]) => `<figure class="title-icon-demo">
    <div class="ContentItemContainer"><div class="panel">
      <div class="panel-heading Distinguish"><h2 class="panel-title">${esc(title)}</h2></div>
      <div class="panel-body-container"><div class="panel-body"><p class="title-icon-demo__body">Panel content</p></div></div>
    </div></div>
    <figcaption>Title field: <code>${esc(title)}</code><br>${esc(note)}</figcaption>
  </figure>`).join('\n');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Panel title icons</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page)}
.title-icon-demo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:20px}
.title-icon-demo{margin:0}
.title-icon-demo .panel{margin:0}
.title-icon-demo__body{margin:0;color:var(--text-muted);font:13px/1.5 var(--font-ui)}
.title-icon-demo figcaption{margin-top:8px;color:var(--text-muted);font:12px/1.5 var(--font-ui)}
.title-icon-demo figcaption code{color:var(--text-strong)}
</style><body><div class="title-icon-demo-grid">${markup}</div><script>${runtime}</script></body></html>`;
};
