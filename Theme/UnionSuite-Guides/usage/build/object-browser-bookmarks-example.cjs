// Guide-only fixture: the object browser (IQA browser, content designer,
// document browser) with Copy path and the bookmark star in the address
// box, the Bookmarks pane above the folder tree and Copy path on the
// selected row. The markup mirrors what
// Theme/UnionSuite/Scripts/ObjectBrowser-Bookmarks.js draws, styled by the
// shared US-OB-BOOKMARKS and US-COPY CSS; paths come from the script's own
// functions. No requests.
const bookmarks = require('../../../UnionSuite/Scripts/ObjectBrowser-Bookmarks.js');

exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/object-browser-bookmarks-example.cjs',
  'Theme/UnionSuite/Scripts/ObjectBrowser-Bookmarks.js'
];

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const OPEN = '$/_i4u_/Core';
const saved = ['$/_i4u_/Core', '$/_i4u_/Core/Membership', '$/_i4u_/Core/Cases/Reports'];

function paneItem(path) {
  const current = path === OPEN ? ' aria-current="location"' : '';
  return `<li class="us-ob-bookmarks__item"><button type="button" class="us-ob-bookmarks__go" title="${esc(path)}"${current}>
    <i class="ti ti-folder" aria-hidden="true"></i><span class="us-ob-bookmarks__name">${esc(bookmarks.nameOf(path))}</span>
    <span class="us-ob-bookmarks__path">${esc(bookmarks.parentOf(path))}</span></button>
    <button type="button" class="us-ob-bookmarks__star" aria-pressed="true" aria-label="Remove ${esc(bookmarks.nameOf(path))} from bookmarks"><i class="ti ti-star-filled" aria-hidden="true"></i></button></li>`;
}

// selected: the native selection.
function row(name, { selected = false, folder = true } = {}) {
  const path = bookmarks.joinPath(OPEN, name);
  return `<tr class="ObjectBrowserContentItem us-ob-row${selected ? ' selected' : ''}"><td>
    <span class="ObjectBrowserContentListName"><i class="ti ${folder ? 'ti-folder' : 'ti-file-search'}" aria-hidden="true"></i> <span>${esc(name)}</span></span>
    <span class="us-ob-actions"><button type="button" class="us-copy us-ob-copy" title="Copy path" aria-label="Copy path of ${esc(name)}" data-us-copy-text="${esc(path)}"></button></span></td></tr>`;
}

// The address box as iMIS floats it, with the tools the script puts after it.
const address = `<div class="demo-address">
  <input type="text" class="InputXLarge us-ob-address" value="${esc(OPEN)}" aria-label="Address">
  <span class="us-ob-address-tools">
    <button type="button" class="us-copy us-ob-address-copy" title="Copy this folder’s path" aria-label="Copy this folder’s path"></button>
    <button type="button" class="us-ob-address-star" aria-pressed="true" title="Remove this folder from bookmarks" aria-label="Remove Core from bookmarks"><i class="ti ti-star-filled" aria-hidden="true"></i></button>
  </span>
  <input type="button" class="TextButton" value="Go">
</div>`;

exports.documentHtml = ({nativePreviewCss, theme, iconCss, branding}) => {
  const pane = `<section class="us-ob-bookmarks" aria-label="Bookmarks">
    <button type="button" class="us-ob-bookmarks__toggle" aria-expanded="true"><i class="ti ti-chevron-down us-ob-bookmarks__chevron" aria-hidden="true"></i>
      <span class="us-ob-bookmarks__title">Bookmarks</span><span class="us-ob-bookmarks__count">${saved.length}</span></button>
    <div class="us-ob-bookmarks__body"><ul class="us-ob-bookmarks__list">${saved.map(paneItem).join('')}</ul></div></section>`;
  const tree = ['$', '_i4u_', 'Client', 'Core', 'SandBox'].map((name, index) =>
    `<li style="padding-left:${index < 2 ? index * 14 : 28}px"${name === 'Core' ? ' class="demo-tree__selected"' : ''}><i class="ti ti-folder" aria-hidden="true"></i> ${esc(name)}</li>`).join('');
  const rows = row('Admin') + row('Cases', { selected: true }) + row('Membership') + row('Reports') + row('Case Search', { folder: false });
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Object browser bookmarks</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page);font:14px/1.4 var(--font-ui)}
.demo-browser{display:grid;grid-template-columns:minmax(200px,260px) minmax(0,1fr);max-width:760px;border:1px solid var(--border);background:var(--bg-surface)}
.demo-address{grid-column:1/-1;display:flow-root;padding:8px 10px;border-bottom:1px solid var(--border)}
.demo-address .InputXLarge{float:left;box-sizing:border-box;width:min(400px,calc(100% - 60px));height:33px;padding:0 10px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);color:var(--text-base);font:14px/1 var(--font-ui)}
.demo-address .TextButton{float:left;height:33px;margin-left:4px}
.demo-tree-pane{border-right:1px solid var(--border)}
.demo-tree{margin:0;padding:6px 10px;list-style:none;color:var(--text-base)}
.demo-tree li{padding-block:3px}
.demo-tree__selected{font-weight:600}
.demo-list{width:100%;border-collapse:collapse}
.demo-list .ObjectBrowserContentItem > td{padding:4px 10px;color:var(--text-strong)}
.demo-list .ObjectBrowserContentItem.selected{background:var(--teal-800, #003a4c)}
.demo-list .ObjectBrowserContentItem.selected > td{color:#fff}
.demo-list .ObjectBrowserContentListName .ti{color:var(--text-muted)}
.demo-list .selected .ObjectBrowserContentListName .ti{color:inherit}
figcaption{margin-top:8px;color:var(--text-muted);font:12px/1.5 var(--font-ui)}
@media (max-width:600px){.demo-browser{grid-template-columns:1fr}.demo-tree-pane{border-right:0;border-bottom:1px solid var(--border)}}
</style><body><figure style="margin:0"><div class="demo-browser">
  ${address}
  <div class="demo-tree-pane">${pane}<ul class="demo-tree">${tree}</ul></div>
  <table class="demo-list"><tbody>${rows}</tbody></table>
</div><figcaption>The document browser open at <code>${esc(OPEN)}</code>, which is bookmarked: the star in the address box is filled and the pane marks it. The copy icon beside the star copies <code>${esc(OPEN)}</code>. <strong>Cases</strong> is selected: its copy icon copies <code>${esc(bookmarks.joinPath(OPEN, 'Cases'))}</code>.</figcaption></figure></body></html>`;
};
