// Guide-only fixture: the IQA designer's "Show Usage" drawer, open on sample
// results. The descriptions come from the real lookup in
// Theme/UnionSuite/Scripts/IQA-WhereUsed.js; the markup mirrors what that
// script draws, styled by the shared US-WHERE-USED CSS. No requests.
const core = require('../../../UnionSuite/Scripts/IQA-WhereUsed.js');

exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/where-used-example.cjs',
  'Theme/UnionSuite/Scripts/IQA-WhereUsed.js'
];

const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const TARGET = { path: '$/_i4u_/Core/Membership/Workbenches/Workbench List', documentKey: 'bc4724d5-ecb3-4743-b1dc-6b1d351794c5', versionKey: '9847b181-2028-4352-99e7-1752279d28f5' };

function sampleIndex() {
  const index = core.createIndex();
  index.iqa(TARGET.path, TARGET.documentKey, TARGET.versionKey);
  const add = (fields, refs) => {
    const item = index.item(fields);
    refs.forEach(([identifier, isKey, property, owner, ownerType]) => index.ref(item, identifier, isKey, property, owner, ownerType));
  };
  const path = core.normalPath(TARGET.path);
  add({ s: 'CON', n: 'Workbench Dashboard', p: '@/_i4u_/Core/Membership/Workbenches/Workbench-Dashboard', k: '2aad5ea0' },
    [[path, false, 'SourceFolderPathControl', 'WorkbenchList', 'QueryMenu'], [TARGET.documentKey, true, 'SourceKey', 'WorkbenchList', 'QueryMenu']]);
  add({ s: 'CON', n: 'Elements', p: '@/i4u_Sandbox/Styling-Elements/Elements', k: 'ebc1039c' },
    [[path, false, 'SourceFolderPathControl', 'WorkbenchList', 'QueryMenu']]);
  add({ s: 'CON', n: 'Organiser Workbenches', p: '@/_i4u_/Core/Organiser Portal/Workbenches', k: '5b1d0f6e' },
    [[core.parentFolder(TARGET.path), false, 'SourceFolderPathControl', 'Workbenches', 'QueryMenu']]);
  add({ s: 'TASK', n: 'Workbench membership reminder', k: '4728b5c9' },
    [[TARGET.versionKey, true, 'DataSources.Query.Criteria.Values', '', '']]);
  add({ s: 'IQD', n: 'Workbench List - Export', p: '$/_i4u_/Core/Membership/Workbenches/Workbench List - Export', k: '0f4d2c6b' },
    [[TARGET.documentKey, true, 'Query', '', '']]);
  return index.finish({ builtAt: '2026-10-12T09:00:00.000Z', durationMs: 12400, sources: {} });
}

function itemHtml(result, id) {
  const item = result.item;
  const shownPath = item.s === 'TASK' ? 'Process Automation or alert' : item.p;
  const copy = /^[$@]\//.test(item.p)
    ? `<button type="button" class="us-copy" data-us-copy-target="wu-path-${id}" aria-label="Copy path of ${esc(item.n)}" title="Copy path"></button>` : '';
  const open = `<a class="us-where-used__open-tab" href="#" aria-label="Open ${esc(item.n)} in a new tab" title="Open in a new tab"><i class="ti ti-external-link" aria-hidden="true"></i></a>`;
  return `<li class="us-where-used__item"><div class="us-where-used__item-text">
      <span class="us-where-used__name">${esc(item.n)}</span>
      <span class="us-where-used__path" id="wu-path-${id}">${esc(shownPath)}</span>
      <span class="us-where-used__how">${esc(result.how)}</span></div>
      <div class="us-where-used__actions">${copy}${open}</div></li>`;
}

exports.documentHtml = ({nativePreviewCss, theme, iconCss, branding}) => {
  let id = 0;
  const groups = core.lookup(sampleIndex(), TARGET);
  const total = groups.reduce((sum, group) => sum + group.results.length, 0);
  const sections = groups.map(group => {
    const direct = group.results.filter(result => !result.viaFolder);
    const folder = group.results.filter(result => result.viaFolder);
    const count = group.results.length
      ? `<span class="us-where-used__count" data-state="found">${group.results.length}</span>`
      : '<span class="us-where-used__count" data-state="none">None</span>';
    const folderHtml = folder.length
      ? `<div class="us-where-used__folder-group"><p class="us-where-used__group-label">Uses the folder <code>${esc(TARGET.path.slice(0, TARGET.path.lastIndexOf('/')))}</code>, which contains this query</p>
        <ul class="us-where-used__items">${folder.map(result => itemHtml(result, ++id)).join('')}</ul></div>` : '';
    return `<section class="us-where-used__source"><h3 class="us-where-used__source-head"><i class="ti ${group.source.icon}" aria-hidden="true"></i>
      <span class="us-where-used__source-name">${esc(group.source.name)}</span>${count}</h3>
      ${direct.length ? `<ul class="us-where-used__items">${direct.map(result => itemHtml(result, ++id)).join('')}</ul>` : ''}${folderHtml}</section>`;
  }).join('\n');

  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Show Usage drawer</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;padding:20px;background:var(--bg-page)}
/* The guide shows the drawer in place; in the designer it is fixed to the right. */
.us-where-used{position:relative;top:auto;right:auto;bottom:auto;height:720px;margin-left:auto;border:1px solid var(--border)}
</style><body>
<aside class="us-where-used" role="dialog" aria-labelledby="wu-title">
  <div class="us-where-used__head"><div class="us-where-used__heading"><h2 class="us-where-used__title" id="wu-title">Usage</h2><p class="us-where-used__subject">Workbench List</p></div>
    <button type="button" class="us-where-used__close" aria-label="Close" title="Close"><i class="ti ti-x" aria-hidden="true"></i></button></div>
  <div class="us-where-used__status"><p class="us-where-used__summary">Used in ${total} places</p>
    <p class="us-where-used__meta">Last checked 2 hours ago by HUBUSER <button type="button" class="TextButton us-outline-button">Check again</button></p></div>
  <div class="us-where-used__body">${sections}
    <p class="us-where-used__note">Not checked: Flowz workflows, and pages outside the page tree such as ASI’s admin pages.</p></div>
  <div class="us-where-used__foot"><div class="us-where-used__option"><label><input type="checkbox"> Include ASI system content</label>
    <button type="button" class="us-where-used__help-toggle" aria-label="What this includes"><i class="ti ti-info-circle" aria-hidden="true"></i></button></div></div>
</aside></body></html>`;
};
