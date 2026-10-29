const fs = require('node:fs'), path = require('node:path');
const read = file => fs.readFileSync(path.resolve(__dirname, '../../../..', file), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const folder = 'Theme/UnionSuite-Guides/usage/templates/Home/Stats/';
const cards = exports.cards = {heading:'Heading-Content.html', summary:'Tracker-Bar-Content.html', trend:'Trend-Placeholder-Content.html', financial:'Financial-Status-Content.html', groups:'Group-Breakdown-Content.html', categories:'Category-Breakdown-Content.html'};
exports.sources = ['Theme/UnionSuite-Guides/usage/build/membership-stats-example.cjs','Theme/UnionSuite-Guides/usage/templates/Home/Stats-Content.html','Theme/UnionSuite-Guides/usage/examples/Home/home-stats.css','Theme/UnionSuite-Guides/usage/examples/Home/home-stats.js',folder+'captured-data.json',folder+'README.md',...Object.values(cards).map(file => folder+file)];
exports.card = key => read(folder+cards[key]).trim();
exports.composition = () => Object.keys(cards).reduce((html,key) => html.replace('{{STATS_'+key.toUpperCase()+'}}',exports.card(key)),read('Theme/UnionSuite-Guides/usage/templates/Home/Stats-Content.html'));
// Match ContentWizardDisplay's native row/column/zone/container output.
// No iPart CSS class is configured; its Content HTML section is the direct child.
exports.nativeComposition = () => {
  const column=(key,width)=>`<div class="col-sm-${width}"><div class="WebPartZone"><div class="ContentItemContainer">${exports.card(key)}</div><div class="Error" style="display:none"></div></div></div>`;
  return `<section class="home-stats home-stats-native" aria-label="Membership Overview"><div class="row">${column('heading',12)}</div><div class="row">${column('summary',12)}</div><div class="row">${column('trend',8)}${column('financial',4)}</div><div class="row">${column('groups',8)}${column('categories',4)}</div><p class="home-stats-footnote">Preview using verified IQA results captured 13 September 2026. Joins and resignations compare 1–13 September with 1–13 August. Historical membership data will be added later.</p></section>`;
};
exports.runtime = source => {
  const shared = source.match(/\/\* US-MEMBERSHIP-STATS:START[\s\S]*?US-MEMBERSHIP-STATS:END \*\//)?.[0];
  if (!shared || shared.split('const now = new Date();').length !== 2) throw Error('Membership example runtime boundary changed.');
  return shared.replace('const now = new Date();', 'const now = new Date('+JSON.stringify(JSON.parse(read(folder+'captured-data.json')).capturedAt)+');');
};
exports.fixture = () => read('Theme/UnionSuite-Guides/usage/examples/Home/home-stats.js').replace('{{MEMBERSHIP_SNAPSHOT}}',JSON.stringify(JSON.parse(read(folder+'captured-data.json'))).replace(/</g,'\\u003c'));
exports.recipes = () => Object.entries(cards).map(([key,file]) => `<details class="reference"><summary>${esc(file.replace('-Content.html',''))}: Content HTML</summary><div class="snippet"><div class="snippet-bar"><span>${esc(file)}</span><div><button type="button" data-copy="code-stats-${key}">Copy</button><button type="button" data-download="code-stats-${key}" data-filename="${file}">Download</button></div></div><pre tabindex="0"><code id="code-stats-${key}">${esc(exports.card(key))}</code></pre></div></details>`).join('\n');
exports.documentHtml = ({nativePreviewCss,theme,themeJs,branding}) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Membership Overview — verified IQA preview</title><style>${nativePreviewCss}\n${theme}\n${branding}\n${read('Theme/UnionSuite-Guides/usage/examples/Home/home-stats.css')}\nhtml{height:auto}body{height:auto;min-height:0;margin:0;padding:20px;background:var(--bg-page);font:14px/1.5 var(--font-ui)}.home-stats{display:block!important}</style></head><body>${exports.nativeComposition()}<script>${exports.fixture()}\n${exports.runtime(themeJs)}</script></body></html>`;
