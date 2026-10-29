// Dedicated client branding workspace. Reuses the guide's canonical assets.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const decode = value => value.replace(/&(amp|lt|gt|quot);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"'}[key]));
// Native CSS retains asset paths for deployment. These standalone examples use
// shared inline glyphs and the embedded font; suppress unused native assets.
const portableCss = css => css.replace(/\burl\(\s*(?:(["'])(.*?)\1|([^)]*))\s*\)/gi,(whole,quote,quoted,plain)=>/^\s*data:/i.test(quoted??plain)?whole:'none');
const portable = html => html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi,(_,start,css,end)=>start+portableCss(css)+end)
  .replace(/\bstyle=("[^"]*"|'[^']*')/gi,(_,attribute)=>'style='+portableCss(attribute));
// scopes.iqa is filled from the theme in build(); the order here is the
// order the branding CSS is written in.
const scopes = {
  root: ':root',
  banner: ':root .us-banner:not(:where(.us-report-no-styling, .us-report-no-styling *))',
  iqa: '',
  actions: ':root .us-actions:not(:where(.us-report-no-styling, .us-report-no-styling *, [data-us-actions-ignore], [data-us-actions-ignore] *))'
};
function build(shared, check = false) {
  const {inserts, rootTokens, declarations, tokenCategory, theme, themeJs, nativePreviewCss, clientRoots, bannerDefaults, iqaDefaults, iqaSelector, demoBanner} = shared;
  // Overrides must reach the same elements as the theme's own alias rule and
  // outrank it, so reuse its selector rather than an abbreviated copy.
  scopes.iqa = ':root ' + iqaSelector.replace(/\s+/g, ' ');
  function type(name) {
    if (name === '--us-actions-duration') return 'number';
    if (/duration$/.test(name)) return 'time';
    if (/easing$/.test(name)) return 'easing';
    if (/^--(face-|font-)|-font$/.test(name)) return 'font';
    if (/^--fw-|-font-weight$/.test(name)) return 'weight';
    if (/^--lh-|-line-height$/.test(name)) return 'lineHeight';
    if (/^--z-/.test(name)) return 'integer';
    if (/^--shadow|^--focus-ring$|-glow$/.test(name)) return 'shadow';
    if (/^--(fs-|space-|radius|page-gutter|card-pad-|sidebar-w|header-h)|^--iqa-(radius|inset|expanded-inset|row-padding|filter-min|filter-bottom|action-height|multi-max-height)$|^--banner-(radius|padding|gap|title-size)$|-(font-size|min-height|action-height|padding-block)$/.test(name)) return 'length';
    return 'colour';
  }
  const tokens = [...rootTokens].map(([name, values]) => ({name, value: values.value, scope:'root', group: /^--(checkbox|radio)-colour$/.test(name)?'Form controls':tokenCategory(name), type: type(name)}));
  const actions = theme.match(/:root \.us-actions[^{}]*\{([^}]*--us-actions-duration[^}]*)\}/)?.[1];
  if (!actions) throw Error('Actions defaults changed; update config extraction.');
  for (const [scope, group, css] of [['banner','Banners',bannerDefaults],['iqa','IQAs & data panels',iqaDefaults],['actions','Action menus',actions]]) {
    declarations(css).filter(([name]) => name.startsWith(scope === 'actions' ? '--us-actions-' : '--'+scope+'-')).forEach(([name,value]) => tokens.push({name,value,scope,group,type:type(name)}));
  }
  // Use the actual root overrides for this source snapshot; no logo/site rules.
  for (const [name,value] of declarations(clientRoots)) { const token=tokens.find(t=>t.name===name); if(token) token.value=value; }
  const preview = markup => portable(markup).replace('</head>','<meta name="us-config-preview" content="component"><script>'+read('Theme/UnionSuite-Guides/usage/source/config-preview.js')+'</script></head>');
  const frame = (id,title,markup) => `<iframe id="${id}" data-theme-preview title="${esc(title)}" loading="lazy" srcdoc="${esc(preview(markup))}"></iframe>`;
  const reuse = html => html.replace(/srcdoc="([^"]*)"/,(_,source)=>'srcdoc="'+esc(preview(decode(source).replace('</head>','<style>'+clientRoots+'</style></head>')))+'"');
  const documentHtml = (title,markup) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>${nativePreviewCss}\n${theme}\n${clientRoots}</style><style>${read('Theme/UnionSuite-Guides/usage/source/config-preview.css')}</style><script>${themeJs}</script></head><body>${markup}</body></html>`;
  const overview = read('Theme/UnionSuite-Guides/usage/source/Config-Preview.source.html').replace('{{BANNER}}',demoBanner).replace('{{DATA_PANEL}}',read('Theme/UnionSuite-Guides/usage/examples/Data-Panel-Native-read.html'));
  const howtoImages = {
    BRANDING_MENU_IMAGE:'branding-themes-menu.png',
    BRANDING_DOWNLOAD_IMAGE:'branding-download-client.png',
    BRANDING_UPLOAD_IMAGE:'branding-upload-version.png'
  };
  const howto = read('Theme/UnionSuite-Guides/usage/source/Branding-Howto.source.html').replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{
    if(!howtoImages[key])throw Error('Unknown branding screenshot: '+key);
    return 'data:image/png;base64,'+fs.readFileSync(path.join(root,'Theme/UnionSuite/images',howtoImages[key])).toString('base64');
  });
  const values = {
    BRANDING_HOWTO: howto,
    CONFIG_CSS: read('Theme/UnionSuite-Guides/usage/source/theme-config.css'),
    CONFIG_JS: read('Theme/UnionSuite-Guides/usage/source/theme-config.js'),
    CONFIG_DATA: JSON.stringify({tokens,scopes}).replace(/</g,'\\u003c'),
    TOKENS_CSS: inserts.TOKENS_CSS,
    ICON_CSS: inserts.ICON_CSS,
    ICON_LICENSE: inserts.ICON_LICENSE,
    OVERVIEW: frame('config-overview','Member overview: banner, buttons and data panel',documentHtml('Member overview',overview)),
    REPORT: reuse(inserts.REPORT_DEMO),
    TABS: reuse(inserts.TABS_DEMO),
    ACTIONS: reuse(inserts.ACTION_MENU_DEMO).replace('Approved option 5','Record actions').replace('Shared theme CSS and behaviour. Open Actions, then Manage Case Contacts. Below 950px the child rows expand inline with the drawing line. Example actions only update the message below.','Open Actions, then Manage Case Contacts to explore a nested menu. Try different colours and preview sizes. Sample commands only update the message below.').replace('Author template','Actions menu').replace('Existing case markup','Quick Actions').replace('Banner Quick Actions','Banner actions'),
    FORMS: frame('config-forms','Form controls and feedback',documentHtml('Forms and feedback',read('Theme/UnionSuite-Guides/usage/source/Config-Form.source.html')))
  };
  const html = read('Theme/UnionSuite-Guides/usage/source/Theme-Config.source.html').replace(/\{\{([A-Z_]+)\}\}/g,(_,key)=>{
    if (!(key in values)) throw Error('Unknown config placeholder: '+key);
    return values[key];
  });
  const guideOutput=require('./guide-output.cjs');
  const output=guideOutput.guidePath('Theme-Config.html');
  if (check) {
    if (!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html) {console.error('Theme-Config.html is stale. Run node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs.');process.exitCode=1;}
    else console.log('Theme config is current ('+tokens.length+' editable tokens).');
  } else {guideOutput.writeGuideFile('Theme-Config.html',html);console.log('Built '+output+' ('+tokens.length+' editable tokens).');}
}
module.exports = {build};
if (require.main === module) build(require('./build-theme-usage.cjs'),process.argv.includes('--check'));
