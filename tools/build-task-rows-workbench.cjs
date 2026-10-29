// Builds the task row workbench: the accepted task row beside the older one, both
// from the canonical Query Templates and the shipped theme CSS and behaviour. It
// copies no styles of its own, and renders the templates inside the wrappers iMIS
// generates, so what it shows is what a real list does.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const script = text => text.replace(/<\/script/gi, '<\\/script');
const specimens = require('../prototypes/approved/task-rows/task-specimens.cjs');

// Both variants are supported templates now: the accepted row and the older one.
const supportedDirectory = 'Theme/UnionSuite-Guides/usage/templates/List-Templates/';
const template = file => read(supportedDirectory + file).replace(/<!--[\s\S]*?-->\s*/g, '').trim();

function themeStyles() {
  const icons = read('Theme/UnionSuite/Tabler/tabler-icons.min.css').replace(
    /@font-face\s*\{[^}]*\}/g,
    '@font-face{font-family:tabler-icons;src:url(data:font/woff2;base64,'
      + fs.readFileSync(path.join(root, 'Theme/UnionSuite/Tabler/fonts/tabler-icons.woff2')).toString('base64')
      + ') format("woff2");font-display:block}'
  );
  return [
    // Native base first: it sets html{font-size:62.5%}, so anything sized in rem
    // behaves here exactly as it does on a real iMIS page.
    read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css'),
    read('Theme/UnionSuite/99-Orion.css'),
    read('Theme/UnionSuite/zUnionSuite.css'),
    read('Theme/UnionSuite-Client/Branding.css'),
    read('Theme/UnionSuite/zzDarkMode.css'),
    icons
  ].join('\n');
}

// The same composition the guide's list reference uses: everything up to the
// banner behaviour, plus the action icons and task rows.
function sharedScript() {
  const source = read('Theme/UnionSuite/zUnionSuite.js');
  return [
    source.split('/* US-BANNER-BEHAVIOUR:START */')[0],
    source.match(/\/\* US-ACTION-ICONS:START \*\/[\s\S]*?\/\* US-ACTION-ICONS:END \*\//)[0],
    source.match(/\/\* US-TASK-ROWS:START[\s\S]*?US-TASK-ROWS:END \*\//)[0],
    // The task title is the home.open-task action (a link); without the
    // site's definitions the theme draws it as an unconfigured button.
    read('Theme/UnionSuite/Scripts/ActionDefinitions.js')
  ].join('\n');
}

function row(specimen, variant, record) {
  // Unresolved tokens would be a rendering bug, not sample content.
  const markup = template(variant.template).replace(/\{#query\.(\w+)\}/g, (token, field) => {
    if (!(field in record)) throw new Error(`Specimen ${specimen.id} is missing ${field} for ${variant.template}`);
    return esc(record[field]);
  });
  return `<section data-item="wb-${specimen.id}" class="mb-3"><div class="QueryTemplateItem">${markup}</div></section>`;
}

// iMIS puts the iPart CSS class on its own div inside ContentItemContainer.
function frame(specimen, variant) {
  const id = `${specimen.id}-${variant.id}`;
  const items = specimen.records.map(record => row(specimen, variant, record)).join('');
  const footer = specimen.footer ? template(specimen.footer).replace('/your-tasks-page', '#example') : '';
  const list = `<div id="wb-set-${id}" class="QueryTemplateSet simplePaginateList">${items}</div>${footer}`;
  const panel = `<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">${esc(specimen.panelTitle)}</h2></div>`
    + `<div class="panel-body-container"><div class="panel-body">${list}</div></div></div>`;
  return `<div class="wb-variant wb-variant--${variant.id}">
    <p class="wb-variant__label">${esc(variant.label)}</p>
    <div class="wb-stage__frame">
      <div class="iMIS-WebPart"><div class="ContentItemContainer"><div class="${esc(specimen.classes)}">${panel}</div></div></div>
    </div>
  </div>`;
}

function stage(specimen) {
  return `<section class="wb-stage" id="${specimen.id}">
  <h2 class="wb-stage__title">${esc(specimen.title)}</h2>
  <p class="wb-stage__note">${esc(specimen.note)}</p>
  <div class="wb-stage__variants">${specimen.variants.map(variant => frame(specimen, variant)).join('')}</div>
</section>`;
}

const replacements = {
  '/* THEME_STYLES */': themeStyles(),
  '/* WORKBENCH_STYLES */': read('prototypes/approved/task-rows/Task-Rows.workbench.css'),
  '<!-- SPECIMENS -->': specimens.map(stage).join('\n'),
  '/* SHARED_SCRIPT */': script(sharedScript()),
  '/* WORKBENCH_SCRIPT */': script(read('prototypes/approved/task-rows/Task-Rows.workbench.js'))
};

let output = read('prototypes/approved/task-rows/Task-Rows.source.html');
for (const [marker, replacement] of Object.entries(replacements)) {
  if (!output.includes(marker)) throw new Error(`Source is missing the ${marker} marker.`);
  output = output.replace(marker, () => replacement);
}

const destination = path.join(root, 'references/Task-Rows-Workbench.html');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(destination) || fs.readFileSync(destination, 'utf8') !== output) {
    throw new Error('Task row workbench is stale. Run node tools/build-task-rows-workbench.cjs.');
  }
  console.log('Task row workbench is current.');
} else {
  fs.writeFileSync(destination, output);
  console.log('Built references/Task-Rows-Workbench.html');
}
