// Offline example of CCO tab switching loading states. The production switch in
// zUnionSuite.js fetches the tab's page and cannot run in a srcdoc frame, so a
// guide-only script reproduces its loading presentation on the same attributes
// and classes, styled by the production CSS. No request is made.
const fs = require('node:fs');
const path = require('node:path');

const read = file => fs.readFileSync(path.resolve(__dirname, '../../../..', file), 'utf8').replace(/\r\n/g, '\n');

const tabs = [
  ['Overview', 'Membership summary, current status and key dates.'],
  ['Notes', 'Recent notes and interactions with this contact.'],
  ['Finance', 'Open invoices, payments and saved payment methods.'],
  ['Cases', 'Open cases and their current owners.']
];

const strip = tabs.map(([label], index) =>
  `<li class="rtsLI"><a class="rtsLink${index === 0 ? ' rtsSelected' : ''}" role="tab" href="#" aria-selected="${index === 0}"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${label}</span></span></span></a></li>`).join('');

const views = tabs.map(([label, text], index) =>
  `<div id="switch-view-${index + 1}" class="rmpView${index === 0 ? '' : ' rmpHidden'}">${index === 0 ? `<h2>${label}</h2><p>${text}</p>` : '<span class="Info">Loading...</span>'}</div>`).join('');

// Guide-only simulation of the loading states: the tab is selected and busy at
// once; after 150 ms the tab spinner, the content cover and the status appear.
// A click during loading moves the tab spinner and keeps the cover (the
// latest click wins).
const simulation = `
(() => {
  const content = ${JSON.stringify(Object.fromEntries(tabs))};
  const strip = document.querySelector('.RadTabStripVertical');
  const multiPage = document.querySelector('.RadMultiPage');
  const links = [...strip.querySelectorAll('a.rtsLink')];
  const viewsList = [...multiPage.querySelectorAll('.rmpView')];
  const slow = document.getElementById('switch-slow');
  let loading = null;
  let timer = null;

  const label = link => link.querySelector('.rtsTxt').textContent;

  function select(link) {
    links.forEach(item => {
      item.classList.toggle('rtsSelected', item === link);
      item.setAttribute('aria-selected', String(item === link));
    });
  }

  function markTab(link, shown) {
    document.querySelectorAll('.us-tab-loading-spinner').forEach(node => node.remove());
    links.forEach(item => {
      item.removeAttribute('aria-busy');
      item.removeAttribute('data-us-tab-loading');
    });
    link.setAttribute('aria-busy', 'true');
    if (!shown) return;
    const spinner = document.createElement('span');
    spinner.className = 'us-tab-loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    link.setAttribute('data-us-tab-loading', '');
    link.append(spinner);
    document.getElementById('switch-status').textContent = 'Loading ' + label(link);
  }

  function finish() {
    const link = loading.link;
    viewsList.forEach((view, index) => {
      const selected = index === links.indexOf(link);
      view.classList.toggle('rmpHidden', !selected);
      view.innerHTML = selected ? '<h2>' + label(link) + '</h2><p>' + content[label(link)] + '</p>' : '<span class="Info">Loading...</span>';
    });
    clearTimeout(loading.reveal);
    document.querySelectorAll('.us-tab-loading-spinner, .us-cco-switch__cover').forEach(node => node.remove());
    link.removeAttribute('aria-busy');
    link.removeAttribute('data-us-tab-loading');
    multiPage.removeAttribute('data-us-cco-switch-busy');
    multiPage.removeAttribute('data-us-cco-switch-loading');
    multiPage.removeAttribute('aria-busy');
    document.getElementById('switch-status').textContent = '';
    loading = null;
  }

  strip.addEventListener('click', event => {
    const link = event.target.closest('a.rtsLink');
    if (!link) return;
    event.preventDefault();
    const displayed = links[viewsList.findIndex(view => !view.classList.contains('rmpHidden'))];
    if (!loading && link === displayed) return;
    select(link);
    if (loading) {
      markTab(link, loading.shown);
      loading.link = link;
    } else {
      loading = { link, shown: false };
      markTab(link, false);
      multiPage.setAttribute('data-us-cco-switch-busy', '');
      multiPage.setAttribute('aria-busy', 'true');
      loading.reveal = setTimeout(() => {
        loading.shown = true;
        markTab(loading.link, true);
        multiPage.setAttribute('data-us-cco-switch-loading', '');
        const cover = document.createElement('div');
        cover.className = 'us-cco-switch__cover';
        cover.setAttribute('aria-hidden', 'true');
        cover.innerHTML = '<span class="section-loader-spinning-circles"></span>';
        multiPage.append(cover);
      }, 150);
    }
    clearTimeout(timer);
    timer = setTimeout(finish, slow.checked ? 2400 : 900);
  });
})();`;

exports.documentHtml = () => {
  const native = (read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css') + '\n' + read('Theme/UnionSuite/99-Orion.css'))
    .replace(/@import\s+[^;]+;/g, '')
    .replace(/@font-face\s*\{[^}]*\}/g, '');
  const layout = `
html, body { height: auto; min-height: 0; }
body { margin: 0; padding: 20px; background: var(--bg-page); color: var(--text-base); font: 14px/1.5 var(--font-ui); }
.example-controls { display: flex; flex-wrap: wrap; gap: 16px; align-items: center; margin: 0 0 12px; }
.example-note { margin: 12px 0 0; color: var(--text-muted); }
.rmpView h2 { margin: 0 0 8px; font-size: 18px; }
.rmpHidden { display: none; }
.RadMultiPage { min-height: 200px; }`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CCO tab switching — loading states</title><style>${native}\n${read('Theme/UnionSuite/zUnionSuite.css')}\n${layout}</style></head><body>
<div class="example-controls"><label><input id="switch-slow" type="checkbox"> Slow response (2.4 seconds)</label></div>
<div class="ContentItemContainer"><div class="cco tabs-wrapper tabs-vertical tabs-left">
  <div class="RadTabStripVertical RadTabStrip_Orion RadTabStripLeft"><div class="rtsLevel rtsLevel1"><ul class="rtsUL" role="tablist">${strip}</ul></div></div>
  <div class="RadMultiPage RadMultiPage_Default">${views}</div>
</div></div>
<span id="switch-status" class="us-iqa-refresh-status us-cco-switch__status" role="status"></span>
<p class="example-note">Choose a tab to see the loading states. With Slow response on, choose another tab while loading: the tab spinner moves and the cover stays. Fictional content; no request is made.</p>
<script>${simulation}</script>
</body></html>`;
};
