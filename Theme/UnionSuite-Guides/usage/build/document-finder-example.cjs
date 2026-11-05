// Guide-only fixture: the document finder's Quick find panel, open four
// times: the IQA browser empty (favourites, recently opened, recent
// searches), waiting for the server, and with results; then the content
// designer with pages and a folder. Results come from the real search in
// Theme/UnionSuite/Scripts/Document-Finder.js; the markup mirrors what that
// script draws, styled by the shared US-DOCUMENT-FINDER CSS. No requests.
const finder = require('../../../UnionSuite/Scripts/Document-Finder.js');

exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/document-finder-example.cjs',
  'Theme/UnionSuite/Scripts/Document-Finder.js'
];

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const queries = [
  { k: '1', n: 'Milestones', p: '$/_i4u_/Core/CA/v2/Reports/Milestones' },
  { k: '2', n: 'API - Manage Agreement - Banner Details', p: '$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details' },
  { k: '3', n: 'Query Template - Manage Agreement - Banner', p: '$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Banner' },
  { k: '4', n: 'Workbench List', p: '$/_i4u_/Core/Membership/Workbenches/Workbench List' },
  { k: '5', n: 'Agreement Milestones', p: '$/_i4u_/Core/CA/Dashboards/Agreement Milestones' }
];

// As the content search IQA returns them (DocumentType Content or CFL).
const content = [
  { k: '6', n: 'My_Participation', p: '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/My_Participation', f: finder.isFolderType('Content') },
  { k: '7', n: 'Organisation', p: '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Organisation', f: finder.isFolderType('CFL') },
  { k: '8', n: 'Organisation-Summary', p: '@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Organisation/Organisation-Summary', f: false }
];

// A document: go, star, open. A folder: go only.
function item(entry, starred, { icon = 'ti-file-search', open = 'Open in the designer' } = {}) {
  if (entry.f) {
    return `<li class="us-doc-finder__item"><button type="button" class="us-doc-finder__go"><i class="ti ti-folder" aria-hidden="true"></i>
    <span class="us-doc-finder__name">${esc(entry.n)}</span><span class="us-doc-finder__path">${esc(finder.folderOf(entry.p))}</span></button></li>`;
  }
  return `<li class="us-doc-finder__item"><button type="button" class="us-doc-finder__go"><i class="ti ${icon}" aria-hidden="true"></i>
    <span class="us-doc-finder__name">${esc(entry.n)}</span><span class="us-doc-finder__path">${esc(finder.folderOf(entry.p))}</span></button>
    <button type="button" class="us-doc-finder__star" aria-pressed="${starred}" aria-label="${starred ? 'Remove from' : 'Add to'} favourites"><i class="ti ${starred ? 'ti-star-filled' : 'ti-star'}" aria-hidden="true"></i></button>
    <button type="button" class="us-doc-finder__open" aria-label="${esc(open)}"><i class="ti ti-pencil" aria-hidden="true"></i></button></li>`;
}

const section = (title, list) => `<section class="us-doc-finder__section"><h3 class="us-doc-finder__heading">${esc(title)}</h3><ul class="us-doc-finder__list">${list}</ul></section>`;

exports.documentHtml = ({nativePreviewCss, theme, iconCss, branding}) => {
  const empty = section('Favourites', [queries[1]].map(entry => item(entry, true)).join('')) +
    section('Recently opened', [queries[3], queries[0]].map(entry => item(entry, false)).join('')) +
    section('Recent searches', ['banner', 'workbench'].map(term => `<li class="us-doc-finder__item"><button type="button" class="us-doc-finder__search">
      <i class="ti ti-history" aria-hidden="true"></i><span class="us-doc-finder__term">${esc(term)}</span></button></li>`).join(''));
  const waiting = `<div class="us-doc-finder__body"><p class="us-doc-finder__status us-doc-finder__loading" role="status">
    <span class="section-loader-spinning-circles" aria-hidden="true"></span>Searching…</p></div>`;
  const found = finder.search(queries, 'milestones');
  const results = section('All folders · ' + found.length + ' found', found.map(entry => item(entry, false)).join(''));
  const pages = finder.search(content, 'organisation');
  const contentResults = section('All folders · ' + pages.length + ' found',
    pages.map(entry => item(entry, false, { icon: 'ti-file-text', open: 'Open in the content editor' })).join(''));
  const box = (value, panel, caption, placeholder = 'Quick find, or search all queries', region = 'Search all queries') => `<figure class="finder-demo"><div class="QuickFindWrapper us-doc-finder-host">
      <input type="text" value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="Quick find">
      <div class="us-doc-finder" role="region" aria-label="${esc(region)}">${panel}</div></div>
      <figcaption>${caption}</figcaption></figure>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Document finder</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page)}
.finder-demos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:24px}
.finder-demo{margin:0}
.finder-demo .QuickFindWrapper{float:none;width:auto;margin:0}
.finder-demo input{box-sizing:border-box;width:100%;padding:7px 10px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);font:14px/1.4 var(--font-ui)}
/* The guide shows the panel in place; on the page it drops below Quick find. */
.finder-demo .us-doc-finder{position:static;width:auto;margin-top:6px}
.finder-demo figcaption{margin-top:8px;color:var(--text-muted);font:12px/1.5 var(--font-ui)}
</style><body><div class="finder-demos">${box('', empty, 'IQA browser, empty box: favourites, recently opened and recent searches.')}${box('milesto', waiting, 'While the server searches: the quick search’s spinning circles.')}${box('milestones', results, 'IQA browser, results for <code>milestones</code>: every folder, best matches first.')}${box('organisation', contentResults, 'Content designer, results for <code>organisation</code>: a folder goes into it; a page has a star and opens in the content editor.', 'Quick find, or search all pages', 'Search all pages and folders')}</div></body></html>`;
};
