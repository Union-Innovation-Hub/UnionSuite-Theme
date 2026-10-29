// Documentation fixture: native layout/zone wrappers with fictional content.
// Gutter and component styles are imported from the maintained theme.
const fs = require('node:fs');
const path = require('node:path');
const read = file => fs.readFileSync(path.resolve(__dirname, '../../../..', file), 'utf8');
exports.sources = ['Theme/UnionSuite-Guides/usage/build/page-layout-example.cjs'];
exports.zone = (content, wrapper = null) => `<div class="ContentItemContainer"><div class="WebPartZone"><div class="iMIS-WebPart"><div class="ContentItemContainer">${wrapper === null ? content : `<div class="${wrapper}">${content}</div>`}</div></div></div></div>`;
exports.panel = (id, title, content) => `<div id="${id}" class="panel panel-border"><div class="panel-heading Distinguish"><h2 class="panel-title">${title}</h2></div><div class="panel-body-container"><div class="panel-body">${content}</div></div></div>`;
exports.layout = () => `<div class="ContentPanel"><div><div class="row" id="layout-row"><div class="col-sm-8">${exports.zone(exports.panel('layout-main', 'Membership details', '<p>Page columns use a 24px gutter.</p><div class="row" id="component-row"><div class="col-sm-6"><label for="layout-name">First name</label><input id="layout-name" type="text" value="Alex"></div><div class="col-sm-6"><label for="layout-surname">Last name</label><input id="layout-surname" type="text" value="Morgan"></div></div>'), '')}</div><div class="col-sm-4">${exports.zone(exports.panel('layout-side', 'Workplace', '<p>Community Services</p><p>Card padding follows the existing component styles.</p>'), 'example-author-class')}</div></div></div></div>`;
exports.documentHtml = () => {
  const css = ['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css', 'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite/zUnionSuite.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g, '').replace(/@font-face\s*\{[^}]*\}/g, '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Standard page layout spacing</title><style>${css}\nhtml,body{height:auto;min-height:0}body{margin:0;padding:20px;background:var(--bg-page);font:14px/1.5 var(--font-ui)}.panel-body p:last-child{margin-bottom:0}input{width:100%;min-width:0}label{display:block}</style></head><body>${exports.layout()}</body></html>`;
};
