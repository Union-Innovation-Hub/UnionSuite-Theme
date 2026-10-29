// Builds Case-Page-Standalone.html: the case page prototype as one file that
// opens from disk, with no server. Every linked stylesheet and script is
// inlined, the stylesheets' fonts and images become data: URLs, and the
// author templates the sample data renders through are embedded
// (window.UnionSuiteCaseTemplates), since a page opened from disk cannot
// fetch them. Generated: edit index.html, the candidates or the templates,
// then run `node build-standalone.cjs` (`--check` reports a stale copy).
// Adapted from ../contact-page-v3/build-standalone.cjs.
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '../../..');
const sourcePath = path.join(__dirname, 'index.html');
const templatesDir = path.join(__dirname, 'templates');
const guideTemplates = [
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Parties-Query-Template.html',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Case-Member-Query-Template.html',
  'Theme/UnionSuite-Guides/usage/templates/List-Templates/Change-History-Query-Template.html'
];
const outputPath = path.join(__dirname, 'Case-Page-Standalone.html');
const missingAssets = new Set();
const embeddedAssets = new Set();

const mimeTypes = {
  '.eot': 'application/vnd.ms-fontobject',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

// An empty image stands in for vendor assets absent from this checkout.
const emptyImage = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';

function localFile(href) {
  return path.resolve(__dirname, decodeURIComponent(href));
}

function embeddedUrl(value, stylesheetPath) {
  const reference = value.trim();
  if (/^(?:data:|blob:|#)/i.test(reference)) return `url("${reference}")`;
  if (/^(?:https?:|\/\/)/i.test(reference)) {
    throw new Error(`Remote asset in ${stylesheetPath}: ${reference}`);
  }

  const fragmentStart = reference.indexOf('#');
  const withQuery = fragmentStart < 0 ? reference : reference.slice(0, fragmentStart);
  const fragment = fragmentStart < 0 ? '' : reference.slice(fragmentStart);
  // A cache-busting query ("tabler-icons.woff2?v3.31.0") names no file.
  const assetName = withQuery.split('?')[0];
  const assetPath = assetName.startsWith('/')
    ? path.join(projectRoot, assetName.slice(1))
    : path.resolve(path.dirname(stylesheetPath), assetName);

  if (!fs.existsSync(assetPath)) {
    missingAssets.add(path.relative(projectRoot, assetPath).replaceAll('\\', '/'));
    return `url("${emptyImage}")`;
  }

  const mime = mimeTypes[path.extname(assetPath).toLowerCase()];
  if (!mime) throw new Error(`Unknown asset type: ${assetPath}`);
  embeddedAssets.add(assetPath);
  const content = fs.readFileSync(assetPath);

  // Sprites show the icon a URL fragment names with :target, which a data:
  // URL cannot target; embed a copy that shows the named icon.
  const iconId = /^#([\w-]+)$/.exec(fragment)?.[1];
  const svg = mime === 'image/svg+xml' ? content.toString('utf8') : '';
  if (iconId && svg.includes(':target')) {
    const shown = svg.replace(/<\/svg>\s*$/, `<style>#${iconId}{display:block}</style></svg>`);
    return `url("data:${mime};base64,${Buffer.from(shown).toString('base64')}")`;
  }

  return `url("data:${mime};base64,${content.toString('base64')}${fragment}")`;
}

function inlineStylesheet(href) {
  const stylesheetPath = localFile(href);
  let css = fs.readFileSync(stylesheetPath, 'utf8');
  // Google Fonts imports are the theme's only remote dependency; the font
  // fallbacks keep the export usable offline.
  css = css.replace(/^@import\s+url\(["']?https?:\/\/[^\r\n]+;\s*$/gm, '');
  css = css.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi, (_, doubleQuoted, singleQuoted, bare) =>
    embeddedUrl(doubleQuoted ?? singleQuoted ?? bare, stylesheetPath));
  css = css.replace(/<\/style/gi, '<\\/style');
  return `<style data-source="${href}">\n${css}\n</style>`;
}

function inlineScript(href) {
  const js = fs.readFileSync(localFile(href), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script data-source="${href}">\n${js}\n</script>`;
}

// Every author template, by file name, as the sample data asks for them.
function templatesScript() {
  const templates = {};
  for (const name of fs.readdirSync(templatesDir).filter(file => file.endsWith('.html')).sort()) {
    templates[name] = fs.readFileSync(path.join(templatesDir, name), 'utf8');
  }
  // Templates now in the usage guide, which the page reads from there.
  for (const file of guideTemplates) templates[path.basename(file)] = fs.readFileSync(path.join(projectRoot, file), 'utf8');
  const json = JSON.stringify(templates).replace(/<\//g, '<\\/').replace(/<!--/g, '<\\!--');
  return { count: Object.keys(templates).length, html: `<script data-source="templates/">\nwindow.UnionSuiteCaseTemplates = ${json};\n</script>` };
}

let html = fs.readFileSync(sourcePath, 'utf8');
html = html.replace(/<!--\s*Case page \(Manage Case\) — WIP layout prototype[\s\S]*?-->/,
  '<!-- Generated standalone case page preview. Edit index.html, the candidates or the templates and run build-standalone.cjs. -->');
html = html.replace('WIP · sample data · live theme CSS/JS + case candidates', 'WIP · sample data · standalone preview');

let stylesheetCount = 0;
html = html.replace(/^  <link rel="stylesheet" href="([^"]+)">\r?\n/gm, (_, href) => {
  stylesheetCount++;
  return `  ${inlineStylesheet(href)}\n`;
});

const templates = templatesScript();
let scriptCount = 0;
html = html.replace(/^<script src="([^"]+)"><\/script>\r?\n/gm, (_, href) => {
  scriptCount++;
  // The templates go first, before the sample data reads them.
  return (scriptCount === 1 ? templates.html + '\n' : '') + `${inlineScript(href)}\n`;
});

const expected = {stylesheets: 9, scripts: 4};
if (stylesheetCount !== expected.stylesheets || scriptCount !== expected.scripts) {
  throw new Error(`Expected ${expected.stylesheets} stylesheets and ${expected.scripts} scripts; found ${stylesheetCount} and ${scriptCount}. Update build-standalone.cjs when index.html links change.`);
}
if (/<(?:link\s+rel="stylesheet"|script\s+src=)/i.test(html)) {
  throw new Error('The output still contains a linked stylesheet or script.');
}

if (process.argv.includes('--check')) {
  if (!fs.existsSync(outputPath) || fs.readFileSync(outputPath, 'utf8') !== html) {
    throw new Error('Standalone HTML is out of date. Run node build-standalone.cjs.');
  }
  console.log('Standalone HTML is current.');
} else {
  fs.writeFileSync(outputPath, html);
  console.log(`Built ${path.relative(projectRoot, outputPath)} (${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MiB).`);
}

console.log(`Embedded ${stylesheetCount} stylesheets, ${scriptCount} scripts, ${templates.count} templates and ${embeddedAssets.size} local assets.`);
if (missingAssets.size) {
  console.log(`${missingAssets.size} assets referenced by vendor stylesheets are absent from this checkout; empty images were substituted:`);
  for (const asset of [...missingAssets].sort()) console.log(`  ${asset}`);
}
