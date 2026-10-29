// Rebuilds the preview pages. Run: node .preview/build.js
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..');

// The real cascade, in load order. themed.html gets all five; native.html
// stops at 99-Orion so you can see what the theme is actually doing.
const NATIVE = [
  ['10-UltraWaveResponsive.css', 'Theme/UnionSuite/guides/usage/vendor/10-UltraWaveResponsive.css'],
  ['UT_Staff.css',              'legacy/UTStaff.css'],
  ['Orion-99.css',              'legacy/Native CSS/Orion-99.css'],
];
const THEME = [
  ['zAdditionalStyling.css', 'legacy/UT-theme.css'],      // the theme deploys as this
  ['zUnionStyling.css',      'legacy/zUnionStyling.css'], // per-client, empty here
];

for (const [dest, src] of [...NATIVE, ...THEME]) {
  fs.copyFileSync(path.join(dir, src), path.join(__dirname, dest));
}

// Tabler lives in the deploy folder; mirror it so icons.html can smoke-test it.
const T = path.join(dir, 'Theme', 'UnionSuite');
fs.mkdirSync(path.join(__dirname, 'Tabler', 'fonts'), { recursive: true });
fs.copyFileSync(path.join(T, 'Tabler.css'), path.join(__dirname, 'Tabler.css'));
fs.copyFileSync(path.join(T, 'Tabler', 'tabler-icons.min.css'), path.join(__dirname, 'Tabler', 'tabler-icons.min.css'));
fs.copyFileSync(path.join(T, 'Tabler', 'fonts', 'tabler-icons.woff2'), path.join(__dirname, 'Tabler', 'fonts', 'tabler-icons.woff2'));

const link = n => `<link rel="stylesheet" href="${n}">`;
let h = fs.readFileSync(path.join(dir, 'legacy', 'Orion page.html'), 'utf8')
  .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
  .replace(/<link[^>]*type=["']text\/css["'][^>]*>/gi, '')
  .replace(/<script[^>]*src=[^>]*><\/script>/gi, '')
  // the capture starts invisible; the script that reveals it is stripped above
  .replace(/(<body[^>]*class=")fade\s*/i, '$1');

const base = NATIVE.map(([n]) => link(n)).join('\n');
const theme = THEME.map(([n]) => link(n)).join('\n');

fs.writeFileSync(path.join(__dirname, 'themed.html'), h.replace(/<\/head>/i, base + '\n' + theme + '\n</head>'));
fs.writeFileSync(path.join(__dirname, 'native.html'), h.replace(/<\/head>/i, base + '\n</head>'));
console.log('rebuilt themed.html + native.html');
