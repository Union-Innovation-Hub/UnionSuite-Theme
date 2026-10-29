// Generates the independent offline Recents layout workshop.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const script = text => text.replace(/<\/script/gi, '<\\/script');
const nativeButtons = read('Theme/UnionSuite/99-Orion.css').split('/* set up button base styles */')[1].split('/* ==========================================================================\n   ORION THEME STYLES')[0];
const font = fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64');
const iconSource = read('Theme/UnionSuite/Tabler/tabler-icons.min.css');
const names = ['x', 'refresh', 'file-search', 'layout', 'arrow-up-right'];
const iconRules = names.map(name => {
  const rule = iconSource.match(new RegExp('\\.ti-' + name + ':before\\{[^}]+\\}'));
  if (!rule) throw new Error('Missing Tabler icon: ' + name);
  return rule[0];
}).join('\n');
const styles = nativeButtons + '\n' + read('Theme/UnionSuite/zUnionSuite.css') + '\n' + read('Theme/UnionSuite/zzDarkMode.css')
  + '\n@font-face{font-family:workshop-tabler;src:url(data:font/woff2;base64,' + font + ') format("woff2");font-display:block}\n' + iconRules;

let output = read('prototypes/approved/taskbar/Recents-Workshop.source.html');
for (const [marker, replacement] of Object.entries({
  '/* SHARED_STYLES */': styles,
  '/* RECENTS_STYLES */': read('prototypes/approved/taskbar/Recents-Workshop.css') + '\n' + read('prototypes/approved/taskbar/Popup-Shell.css'),
  '/* RECENTS_SCRIPT */': script(read('prototypes/approved/taskbar/Recents-Workshop.js'))
})) output = output.replace(marker, () => replacement);
const destination = path.join(root, 'references/Recents-Workshop.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error('Recents workshop is stale.');
  console.log('Recents workshop is current.');
} else {
  fs.writeFileSync(destination, output);
  console.log('Built references/Recents-Workshop.html');
}
