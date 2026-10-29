// Generates one offline comparison from real taskbar sources and isolated trial code.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const script = text => text.replace(/<\/script/gi, '<\\/script');
const attribute = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const source = read('Theme/UnionSuite/zUnionSuite.js');
const appearance = source.match(/\/\* US-APPEARANCE:START \*\/[\s\S]*?\/\* US-APPEARANCE:END \*\//)?.[0];
if (!appearance) throw new Error('Appearance section is missing.');
// The taskbar's record icons come from the shared US-ICONS block.
const themeIcons = source.match(/\/\* US-ICONS:START[\s\S]*?\/\* US-ICONS:END \*\//)?.[0];
if (!themeIcons) throw new Error('Icons section is missing.');
const nativeButtons = read('Theme/UnionSuite/99-Orion.css').split('/* set up button base styles */')[1].split('/* ==========================================================================\n   ORION THEME STYLES')[0];
const font = fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64');
const iconSource = read('Theme/UnionSuite/Tabler/tabler-icons.min.css');
const names = ['moon', 'sun', 'cloud-filled', 'star-filled', 'star', 'x', 'search', 'refresh', 'plus', 'pencil', 'command', 'history', 'file-search', 'layout', 'palette', 'chart-bar', 'users', 'calendar-event', 'layout-grid', 'folders', 'user-plus', 'users-group', 'info-circle', 'book', 'grip-vertical', 'arrow-up', 'arrow-down', 'arrow-up-right'];
const iconRules = names.map(name => {
  const rule = iconSource.match(new RegExp('\\.ti-' + name + ':before\\{[^}]+\\}'));
  if (!rule) throw new Error('Missing Tabler icon: ' + name);
  return rule[0];
}).join('\n');
const styles = nativeButtons + '\n' + read('Theme/UnionSuite/zUnionSuite.css') + '\n' + read('Theme/UnionSuite/zzDarkMode.css')
  + '\n@font-face{font-family:workshop-tabler;src:url(data:font/woff2;base64,' + font + ') format("woff2");font-display:block}\n' + iconRules;
const fusePath = '../iMIS Enhanced/CSI Chrome Extension/source/lib/fuse/fuse-6.6.2.js';
function frame(variant) {
  const replacements = {
    'FRAME_TITLE': variant === 'baseline' ? 'Current taskbar' : 'Taskbar proposal',
    'FRAME_VARIANT': variant,
    '/* SHARED_STYLES */': styles,
    '/* FRAME_STYLES */': read('prototypes/approved/taskbar/Taskbar-Workshop.frame.css') + '\n' + read('prototypes/approved/taskbar/Popup-Shell.css'),
    '/* APPEARANCE_SCRIPT */': script(appearance + '\n' + themeIcons),
    '/* FIXTURE_SCRIPT */': script(read('Theme/UnionSuite-Guides/usage/source/taskbar-example.js').replaceAll('union-suite:preview:', 'union-suite:workshop:' + variant + ':')),
    '/* TASKBAR_SCRIPT */': script(read('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js')),
    '/* FUSE_SCRIPT */': variant === 'proposal' ? script(read(fusePath)) : '',
    '/* FRAME_SCRIPT */': script(read('prototypes/approved/taskbar/Taskbar-Workshop.frame.js'))
  };
  let html = read('prototypes/approved/taskbar/Taskbar-Workshop.frame.html');
  for (const [marker, replacement] of Object.entries(replacements)) html = html.replace(marker, () => replacement);
  return html;
}
let output = read('prototypes/approved/taskbar/Taskbar-Workshop.source.html');
const replacements = {
  '/* WORKSHOP_STYLES */': read('prototypes/approved/taskbar/Taskbar-Workshop.css'),
  '/* WORKSHOP_CONTROLS */': script(read('prototypes/approved/taskbar/Taskbar-Workshop.controls.js')),
  'BASELINE_DOCUMENT': attribute(frame('baseline')),
  'PROPOSAL_DOCUMENT': attribute(frame('proposal'))
};
for (const [marker, replacement] of Object.entries(replacements)) output = output.replace(marker, () => replacement);
const destination = path.join(root, 'references/Taskbar-Workshop.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error('Taskbar workshop is stale.');
  console.log('Taskbar workshop is current.');
} else {
  fs.writeFileSync(destination, output);
  console.log('Built references/Taskbar-Workshop.html');
}
