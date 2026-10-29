// Guide-only fixture: the IQA browser's Quick find panel, open three times:
// empty (favourites, recently opened, recent searches), waiting for the
// server, and with results. Results
// come from the real search in Theme/UnionSuite/Scripts/IQA-Finder.js; the
// markup mirrors what that script draws, styled by the shared US-IQA-FINDER
// CSS. No requests.
const finder = require('../../../UnionSuite/Scripts/IQA-Finder.js');

exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/iqa-finder-example.cjs',
  'Theme/UnionSuite/Scripts/IQA-Finder.js'
];

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const entries = [
  { k: '1', n: 'Milestones', p: '$/_i4u_/Core/CA/v2/Reports/Milestones' },
  { k: '2', n: 'API - Manage Agreement - Banner Details', p: '$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details' },
  { k: '3', n: 'Query Template - Manage Agreement - Banner', p: '$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Banner' },
  { k: '4', n: 'Workbench List', p: '$/_i4u_/Core/Membership/Workbenches/Workbench List' },
  { k: '5', n: 'Agreement Milestones', p: '$/_i4u_/Core/CA/Dashboards/Agreement Milestones' }
];

function item(entry, starred) {
  return `<li class="us-iqa-finder__item"><button type="button" class="us-iqa-finder__go"><i class="ti ti-file-search" aria-hidden="true"></i>
    <span class="us-iqa-finder__name">${esc(entry.n)}</span><span class="us-iqa-finder__path">${esc(finder.folderOf(entry.p))}</span></button>
    <button type="button" class="us-iqa-finder__star" aria-pressed="${starred}" aria-label="${starred ? 'Remove from' : 'Add to'} favourites"><i class="ti ${starred ? 'ti-star-filled' : 'ti-star'}" aria-hidden="true"></i></button>
    <button type="button" class="us-iqa-finder__open" aria-label="Open in the designer"><i class="ti ti-pencil" aria-hidden="true"></i></button></li>`;
}

const section = (title, list) => `<section class="us-iqa-finder__section"><h3 class="us-iqa-finder__heading">${esc(title)}</h3><ul class="us-iqa-finder__list">${list}</ul></section>`;

exports.documentHtml = ({nativePreviewCss, theme, iconCss, branding}) => {
  const favourites = [entries[1]];
  const opened = [entries[3], entries[0]];
  const empty = section('Favourites', favourites.map(entry => item(entry, true)).join('')) +
    section('Recently opened', opened.map(entry => item(entry, false)).join('')) +
    section('Recent searches', ['banner', 'workbench'].map(term => `<li class="us-iqa-finder__item"><button type="button" class="us-iqa-finder__search">
      <i class="ti ti-history" aria-hidden="true"></i><span class="us-iqa-finder__term">${esc(term)}</span></button></li>`).join(''));
  const waiting = `<div class="us-iqa-finder__body"><p class="us-iqa-finder__status us-iqa-finder__loading" role="status">
    <span class="section-loader-spinning-circles" aria-hidden="true"></span>Searching…</p></div>`;
  const found = finder.search(entries, 'milestones');
  const results = section('All folders · ' + found.length + ' found', found.map(entry => item(entry, false)).join(''));
  const box = (value, panel, caption) => `<figure class="finder-demo"><div class="QuickFindWrapper us-iqa-finder-host">
      <input type="text" value="${esc(value)}" placeholder="Quick find, or search all queries" aria-label="Quick find">
      <div class="us-iqa-finder" role="region" aria-label="Search all queries">${panel}</div></div>
      <figcaption>${caption}</figcaption></figure>`;
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>IQA finder</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page)}
.finder-demos{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:24px}
.finder-demo{margin:0}
.finder-demo .QuickFindWrapper{float:none;width:auto;margin:0}
.finder-demo input{box-sizing:border-box;width:100%;padding:7px 10px;border:1px solid var(--border-strong);border-radius:var(--radius-sm);font:14px/1.4 var(--font-ui)}
/* The guide shows the panel in place; on the page it drops below Quick find. */
.finder-demo .us-iqa-finder{position:static;width:auto;margin-top:6px}
.finder-demo figcaption{margin-top:8px;color:var(--text-muted);font:12px/1.5 var(--font-ui)}
</style><body><div class="finder-demos">${box('', empty, 'Empty box: favourites, recently opened and recent searches.')}${box('milesto', waiting, 'While the server searches: the quick search’s spinning circles.')}${box('milestones', results, 'Results for <code>milestones</code>: every folder, best matches first.')}</div></body></html>`;
};
