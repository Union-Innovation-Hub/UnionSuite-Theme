// Generates the offline side pane workshop: the theme's real header, taskbar and
// bookmarks scripts (as deployed, with Pip switched off) plus the WIP side pane.
// The header styles follow the guide's utility navigation example
// (THeme/UnionSuite-Guides/usage/build/account-menu-example.cjs).
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const script = text => text.replace(/<\/script/gi, '<\\/script');
const attribute = text => text.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const wip = 'prototypes/wip/taskbar-side-pane/';
const usage = 'THeme/UnionSuite-Guides/usage/';

function section(source, name) {
  const code = source.match(new RegExp('/\\* ' + name + ':START[\\s\\S]*?/\\* ' + name + ':END \\*/'))?.[0];
  if (!code) throw new Error('Theme section is missing: ' + name);
  return code;
}

function nativeStyles() {
  let native = (read(usage + 'vendor/10-UltraWaveResponsive.css') + '\n' + read('THeme/UnionSuite/99-Orion.css'))
    .replace(/@import\s+[^;]+;/g, '')
    .replace(/@font-face\s*\{[^}]*\}/g, '');
  // Offline snapshot of the native iMIS icon sprite, as in the guide.
  const sprite = read(usage + 'source/imis-IconSprite.svg');
  const svgRoot = sprite.match(/<svg\b[^>]*>/)?.[0];
  const defs = sprite.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
  for (const id of ['cart', 'easy-edit', 'obo-toggle']) {
    const group = sprite.match(new RegExp('^    <g id="' + id + '">[\\s\\S]*?^    </g>', 'm'))?.[0];
    if (!svgRoot || !defs || !group) throw new Error('Native icon snapshot structure changed: ' + id);
    native = native.replaceAll('../../Assets/images/IconSprite.svg#' + id, 'data:image/svg+xml,' + encodeURIComponent(svgRoot + defs + group + '</svg>') + '#' + id);
  }
  return native;
}

function themeStyles() {
  const logo = 'data:image/svg+xml,' + encodeURIComponent(read(usage + 'source/utility-nav-logo.svg'));
  const client = read('THeme/UnionSuite-Client/Override.css').replace('/images/Hub/UHUB_Logo.png', logo);
  // The full Tabler set, as the theme loads it, with the font embedded.
  const font = fs.readFileSync(path.join(root, 'THeme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64');
  const tabler = read('THeme/UnionSuite/Tabler/tabler-icons.min.css')
    .replace(/url\("\.\/fonts\/tabler-icons\.woff2[^"]*"\)/, 'url(data:font/woff2;base64,' + font + ')');
  if (!tabler.includes('data:font/woff2')) throw new Error('Tabler font reference changed.');
  return [
    nativeStyles(),
    tabler,
    read('THeme/UnionSuite/zUnionSuite.css'),
    read('THeme/UnionSuite-Client/Branding.css'),
    client,
    // Dark mode loads last, after client CSS.
    read('THeme/UnionSuite/zzDarkMode.css')
  ].join('\n');
}

function frame() {
  const core = read('THeme/UnionSuite/zUnionSuite.js');
  const replacements = {
    '/* THEME_STYLES */': themeStyles(),
    '/* PAGE_STYLES */': read(wip + 'Side-Pane.page.css') + '\n' + read(wip + 'Side-Pane.css'),
    '/* APPEARANCE_SCRIPT */': script(section(core, 'US-APPEARANCE')),
    '/* PANE_MARKUP */': read(wip + 'Side-Pane.markup.html'),
    '/* FIXTURE_SCRIPT */': script(read(usage + 'source/taskbar-example.js') + '\n' + read(wip + 'Side-Pane.fixture.js')),
    // The theme sections the taskbar and Recents use: icons, busy states and copy.
    '/* THEME_SCRIPTS */': script(['US-ICONS', 'US-ACTION-ICONS', 'US-BUSY-PRESENTATION', 'US-COPY'].map(name => section(core, name)).join('\n')),
    '/* TASKBAR_SCRIPT */': script(read('THeme/UnionSuite/Scripts/UnionSuiteTaskbar.js')),
    '/* BOOKMARKS_SCRIPT */': script(read('THeme/UnionSuite/Scripts/UnionSuiteTaskbar-Bookmarks.js')),
    '/* PANE_SCRIPT */': script(read(wip + 'Side-Pane.js'))
  };
  let html = read(wip + 'Side-Pane.frame.html');
  for (const [marker, replacement] of Object.entries(replacements)) {
    if (!html.includes(marker)) throw new Error('Frame marker is missing: ' + marker);
    html = html.replace(marker, () => replacement);
  }
  return html;
}

let output = read(wip + 'Side-Pane.source.html');
const replacements = {
  '/* WORKSHOP_STYLES */': read('prototypes/approved/taskbar/Taskbar-Workshop.css'),
  // The pane needs more height than the bookmark workshop.
  '/* PAGE_STYLES */': '#proposal {\n  height: 760px;\n}',
  '/* WORKSHOP_CONTROLS */': script(read(wip + 'Side-Pane.controls.js')),
  'PROPOSAL_DOCUMENT': attribute(frame())
};
for (const [marker, replacement] of Object.entries(replacements)) output = output.replace(marker, () => replacement);
const destination = path.join(root, 'references/Taskbar-Side-Pane.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) throw new Error('Taskbar side pane workshop is stale.');
  console.log('Taskbar side pane workshop is current.');
} else {
  fs.writeFileSync(destination, output);
  console.log('Built references/Taskbar-Side-Pane.html');
}
