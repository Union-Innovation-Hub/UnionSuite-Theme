// The CCO rail (us-cco-rail) example: the guide's native CCO fixture set to
// "Vertical right", inside a us-cco-rail iPart wrapper under a member banner,
// with the full shared theme. A stub answers the tab counts query, so the
// count badges show offline. Built like cco-sticky-example.cjs.
const fs = require('fs'), path = require('path'), root = path.resolve(__dirname, '../../../..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// What the Tab Counts IQA would return: one row per tab, by its exact label.
const COUNTS = [
  {Tab: 'Membership', Count: 2},
  {Tab: 'Transactions', Count: 14},
  {Tab: 'Alerts', Count: 1, Tone: 'danger', Badge: '!'}
];

exports.documentHtml = function () {
  let html = require('./build-tab-display-options.cjs').frameDocument('rail-cco', 'vertical', 5, 2, false);
  // The collapse toggle's icons are the iMIS navigation sprite's; inlined so
  // the offline example needs no image file.
  const sprite = 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(root, 'Theme/UnionSuite/images/NavbarSprite.svg')).toString('base64');
  const css = read('Theme/UnionSuite/zUnionSuite.css').split('images/NavbarSprite.svg').join(sprite);
  const js = read('Theme/UnionSuite/zUnionSuite.js');
  // "Vertical right" in the CCO iPart: iMIS renders tabs-right on the CCO and
  // RadTabStripRight on the strip.
  html = html.replace('cco tabs-wrapper tabs-vertical tabs-left', 'cco tabs-wrapper tabs-vertical tabs-right')
    .replace('RadTabStripLeft_Orion RadTabStripLeft', 'RadTabStripRight_Orion RadTabStripRight');
  // Replacer functions throughout: the theme JS contains "$'".
  html = html.replace('</head>', () => `<style>${css}
body{padding:0 0 24px;background:var(--bg-page)}.row{--bs-gutter-x:40px;display:flex;flex-wrap:wrap;margin:0}.col-sm-12{flex:0 0 100%;max-width:100%;padding-inline:calc(var(--bs-gutter-x) * .5)}.col-sm-12>.ContentItemContainer{margin-bottom:32px}#hd{position:sticky;top:0;z-index:1031;height:44px;padding:12px 20px;background:var(--bg-surface);border-bottom:1px solid var(--border);font-size:12px}.demo-note{margin:12px 20px;font-size:12px;color:var(--text-muted)}</style></head>`);
  const banner = '<div class="ContentItemContainer"><div class="us-banner us-banner-collapsible"><header class="us-banner__surface us-banner__surface--member" data-us-status-colour="#23845B"><div class="us-banner__summary"><div class="us-banner__identity"><span class="us-banner__avatar" data-us-contact-kind="Member" aria-hidden="true"></span><div class="us-banner__identity-text"><span class="us-banner__eyebrow">Member · 104019</span><h1 class="us-banner__title">Alex Morgan</h1></div></div><div class="us-banner__status"><span class="us-banner__badge us-banner__badge--member-status">Financial member</span></div><div class="us-banner__actions"><div class="us-cco-counts" hidden data-us-counts-query="$/Example/Tab Counts" data-us-counts-filter="ID" data-us-counts-value="104019"></div></div></div></header></div></div>';
  // iMIS's page column (.row > .col-sm-12), so the banner and the rail bleed
  // through its half-gutter as they do on a page.
  html = html.replace('<div class="cco tabs-wrapper tabs-vertical tabs-right', () => `<div id="hd">Sample iMIS header · resize to see the rail collapse below 1200px and become Sections on a phone</div><div class="row"><div class="col-sm-12">${banner}<div class="ContentItemContainer"><div class="us-cco-rail"><div class="cco tabs-wrapper tabs-vertical tabs-right`);
  html = html.replace('<section class="standalone-demo">', () => '</div></div></div></div><p class="demo-note">Fictional record. Tab clicks switch locally; Alt+S jumps to Find a section.</p><section class="standalone-demo" hidden>');
  const stub = `<script>(function(){var real=window.fetch;window.fetch=function(url,options){if(String(url).indexOf('/api/query?')<0)return real.apply(this,arguments);return Promise.resolve(new Response(JSON.stringify({Items:{$values:${JSON.stringify(COUNTS)}},Count:${COUNTS.length},HasNext:false}),{status:200,headers:{'Content-Type':'application/json'}}));};})();</script>`;
  html = html.replace('</body>', () => `${stub}<script>${js}</script></body>`);
  return html;
};

if (require.main === module) fs.writeFileSync(path.join(root, 'references/CCO-Rail.html'), '<!doctype html>' + exports.documentHtml().replace(/^<!doctype html>/i, ''));
