// One maintained builder, embedded offline in the guide and standalone reference.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const base = 'Theme/UnionSuite-Guides/usage/examples/Action-Builder/';
const cleanCss = source => source
  .replace(/@import\s+[^;]+;/g, '')
  .replace(/@font-face\s*\{[^}]*\}/g, '')
  .replace(/url\((?!["']?data:)[^)]*\)/g, 'none');
const native = cleanCss(read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css') + '\n' + read('Theme/UnionSuite/99-Orion.css'));
const theme = cleanCss(read('Theme/UnionSuite/zUnionSuite.css'));
const branding = read('Theme/UnionSuite-Client/Branding.css');
const font = fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64');
const icons = '@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,' + font + ') format("woff2")}\n' +
  cleanCss(read('Theme/UnionSuite/Tabler/tabler-icons.min.css'));
const catalog = [];
// Read only definition identities; never invoke a business operation.
vm.runInNewContext(read('Theme/UnionSuite/Scripts/ActionDefinitions.js'), {
  window: {UnionSuiteActions: {define(key, definition) { catalog.push({key, className: definition.className}); }}}
});
const esc = value => String(value).replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
const options = [{label: 'None', value: ''}, ...require('../source/action-catalog.cjs').actions.map(item => ({
  label: item.label + ' · ' + item.icon,
  value: ['plus', 'pencil', 'trash'].includes(item.icon) ? item.icon : 'ti-' + item.icon
}))].map(item => '<option value="' + esc(item.value) + '">' + esc(item.label) + '</option>').join('');
const assets = {
  catalog, core: read(base + 'builder-core.js'), runtime: read('Theme/UnionSuite/zUnionSuite.js'),
  appearance: read(base + 'appearance-preview.js'), appearanceCss: read(base + 'appearance-preview.css'),
  preview: read(base + 'preview.js'), previewCss: native + '\n' + theme + '\n' + branding + '\n' + icons + '\n' + read(base + 'preview.css')
};
const replacements = {
  THEME_CSS: native + '\n' + theme + '\n' + branding,
  BUILDER_CSS: read(base + 'builder.css'), ICON_OPTIONS: options,
  ASSETS: JSON.stringify(assets).replace(/</g, '\\u003c'),
  CORE_JS: read(base + 'builder-core.js').replace(/<\/script/gi, '<\\/script'),
  APP_JS: read(base + 'builder.js').replace(/<\/script/gi, '<\\/script')
};
const sources = [
  'Theme/UnionSuite-Guides/usage/build/build-action-builder.cjs',
  ...['Action-Builder.source.html', 'builder.css', 'builder-core.js', 'builder.js',
    'preview.js', 'preview.css', 'appearance-preview.js', 'appearance-preview.css',
    'embedded.css'].map(name => base + name),
  'Theme/UnionSuite-Guides/usage/source/action-catalog.cjs',
  'Theme/UnionSuite/Scripts/ActionDefinitions.js',
  'Theme/UnionSuite/zUnionSuite.js', 'Theme/UnionSuite/zUnionSuite.css',
  'Theme/UnionSuite/99-Orion.css', 'Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css',
  'Theme/UnionSuite-Client/Branding.css', 'Theme/UnionSuite/Tabler/tabler-icons.min.css'
];

function documentHtml({embedded = false} = {}) {
  const values = {
    ...replacements,
    BUILDER_CSS: replacements.BUILDER_CSS + (embedded ? '\n' + read(base + 'embedded.css') : '')
  };
  return read(base + 'Action-Builder.source.html').replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error('Unknown placeholder: ' + key);
    return values[key];
  });
}

function build(check = process.argv.includes('--check')) {
  const html = documentHtml();
  const target = path.join(root, 'references/Action-Builder-Preview.html');
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== html) throw new Error('Action builder preview is stale.');
    console.log('Action builder preview is current.');
  } else {
    fs.writeFileSync(target, html);
    console.log('Built references/Action-Builder-Preview.html.');
  }
}

module.exports = {documentHtml, sources, build};
if (require.main === module) build();
