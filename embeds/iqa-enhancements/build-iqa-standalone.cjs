#!/usr/bin/env node
/* =============================================================================
 * Builds IQA-Enhancements-Standalone.js: every IQA enhancement in one script,
 * for an iMIS site that does not have the UnionSuite theme.
 *
 *   node "embeds/iqa-enhancements/build-iqa-standalone.cjs"           build
 *   node "embeds/iqa-enhancements/build-iqa-standalone.cjs" --check   fail if stale
 *
 * The theme files are read, never written. The bundle holds:
 *   • the theme's IQA scripts, unchanged: HtmlSourceEditor.js,
 *     IQA-Enhancements.js, IQA-WhereUsed.js (Show Usage), IQA-Finder.js;
 *   • the two zUnionSuite.js sections they lean on: US-COPY (the copy
 *     buttons) and US-RECORD-CARDS (the sliding fold);
 *   • their CSS from zUnionSuite.css, by section marker or by selector;
 *   • iqa-standalone.base.css (this folder) for the buttons and icons the
 *     theme's button system and icon font would otherwise draw.
 *
 * Every theme token (var(--accent) and so on) is renamed to a private
 * --iqae-* copy, defined once with Orion's exact values, so the bundle never
 * reads or sets a theme token and the client's own CSS cannot collide.
 * ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const read = file => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const fail = message => { console.error('build-iqa-standalone: ' + message); process.exit(1); };

// The theme folder is found by walking up from this file, so the builder
// keeps working wherever it sits inside the project.
function findTheme(from) {
  for (let dir = from; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'Theme', 'UnionSuite');
    if (fs.existsSync(path.join(candidate, 'zUnionSuite.css'))) return candidate;
    if (path.dirname(dir) === dir) fail('no Theme/UnionSuite folder above ' + from);
  }
}

const HERE = __dirname;
const THEME = findTheme(HERE);
const OUTPUT = path.join(HERE, 'IQA-Enhancements-Standalone.js');
const BASE_CSS = path.join(HERE, 'iqa-standalone.base.css');
const PREFIX = '--iqae-';

/* ---------------------------------------------------------------------------
 * Sources
 * ------------------------------------------------------------------------ */
const THEME_CSS = read(path.join(THEME, 'zUnionSuite.css'));
const THEME_JS = read(path.join(THEME, 'zUnionSuite.js'));

// Scripts in the order they must run: the copy and fold runtimes first, then
// the HTML source editor, which IQA-Enhancements looks for as it mounts.
const SCRIPTS = [
  { name: 'zUnionSuite.js — US-COPY', text: () => jsSection('US-COPY') },
  { name: 'zUnionSuite.js — US-RECORD-CARDS', text: () => jsSection('US-RECORD-CARDS') },
  { name: 'Scripts/HtmlSourceEditor.js', text: () => read(path.join(THEME, 'Scripts', 'HtmlSourceEditor.js')) },
  { name: 'Scripts/IQA-Enhancements.js', text: () => read(path.join(THEME, 'Scripts', 'IQA-Enhancements.js')) },
  { name: 'Scripts/IQA-WhereUsed.js', text: () => whereUsedWithoutTheme(read(path.join(THEME, 'Scripts', 'IQA-WhereUsed.js'))) },
  { name: 'Scripts/IQA-Finder.js', text: () => read(path.join(THEME, 'Scripts', 'IQA-Finder.js')) }
];

// zUnionSuite.css sections taken whole (less any banner-only rules).
const CSS_SECTIONS = ['US-COPY', 'US-HTML-SOURCE', 'US-WHERE-USED', 'US-IQA-FINDER'];

// Single rules taken from anywhere in zUnionSuite.css, by selector. Each
// pattern must match at least one rule, so a renamed class fails the build
// rather than silently dropping a style.
const CSS_SELECTORS = [
  { name: 'switch', pattern: /\.us-switch/ },
  { name: 'button spinner', pattern: /\.us-button-spinner/ },
  { name: 'busy label', pattern: /\.us-busy-hide-label/ },
  { name: 'tab spinner', pattern: /us-tab-loading/ },
  { name: 'tab spinner room', pattern: /> \.rtsLevel > \.rtsUL > \.rtsLI > \.rtsLink \.rtsTxt/ },
  { name: 'filter conditions', pattern: /\.iqa-filter-condition-box/ }
];
const CSS_KEYFRAMES = ['us-button-spin', 'us-tab-loading-spin'];

// Banner rules ride along in US-COPY; they need the banner, which is not here.
// Only the whole .us-banner class: the copy button's own rules also name
// button.us-banner__copy and must stay.
const EXCLUDE = /\.us-banner(?![\w-])/;

// Tabler outline icons (24px grid, 2px round strokes) used by Show Usage and
// the IQA browser. Filled icons are drawn with fill instead of stroke.
const ICONS = {
  'bolt': ['M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11'],
  'database': ['M12 6m-8 0a8 3 0 1 0 16 0a8 3 0 1 0 -16 0', 'M4 6v6a8 3 0 0 0 16 0v-6', 'M4 12v6a8 3 0 0 0 16 0v-6'],
  'external-link': ['M12 6h-6a2 2 0 0 0 -2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-6', 'M11 13l9 -9', 'M15 4h5v5'],
  'file-search': ['M14 3v4a1 1 0 0 0 1 1h4', 'M12 21h-5a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v4.5', 'M16.5 17.5m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0', 'M18.5 19.5l2.5 2.5'],
  'file-text': ['M14 3v4a1 1 0 0 0 1 1h4', 'M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z', 'M9 9l1 0', 'M9 13l6 0', 'M9 17l6 0'],
  'folder': ['M5 4h4l3 3h7a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2'],
  'history': ['M12 8l0 4l2 2', 'M3.05 11a9 9 0 1 1 .5 4m-.5 5v-5h5'],
  'info-circle': ['M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0', 'M12 9h.01', 'M11 12h1v4h1'],
  'mail': ['M3 7a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-10z', 'M3 7l9 6l9 -6'],
  'palette': ['M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25', 'M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0', 'M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0'],
  'pencil': ['M4 20h4l10.5 -10.5a2.828 2.828 0 1 0 -4 -4l-10.5 10.5v4', 'M13.5 6.5l4 4'],
  'sitemap': ['M3 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z', 'M15 15m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z', 'M9 3m0 2a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2z', 'M6 15v-1a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v1', 'M12 9l0 3'],
  'star': ['M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'],
  'star-filled': { fill: true, paths: ['M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z'] },
  'table': ['M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14z', 'M3 10h18', 'M10 3v18'],
  'x': ['M18 6l-12 12', 'M6 6l12 12']
};

/* ---------------------------------------------------------------------------
 * JavaScript sections and the one bundle-only adjustment
 * ------------------------------------------------------------------------ */
function jsSection(name) {
  const start = THEME_JS.indexOf('/* ' + name + ':START');
  const endMarker = '/* ' + name + ':END */';
  const end = THEME_JS.indexOf(endMarker, start);
  if (start < 0 || end < 0) fail('zUnionSuite.js has no ' + name + ' section');
  return THEME_JS.slice(start, end + endMarker.length);
}

// Replaces one exact passage, failing the build if the theme source has
// changed so that it is no longer there exactly once.
function swap(source, from, to, label) {
  const at = source.indexOf(from);
  if (at < 0 || source.indexOf(from, at + 1) >= 0) fail('IQA-WhereUsed.js: ' + label + ' has changed; update whereUsedWithoutTheme()');
  return source.slice(0, at) + to + source.slice(at + from.length);
}

// Two changes to the bundled copy of Show Usage; the theme file is not touched.
//  1. Its "UnionSuite theme" place reads the scripts the theme loader lists.
//     With no loader every check would fail on it, so that place is left out.
//  2. A client may have no i4u_UT_Configuration to keep the shared results
//     in. When it cannot be read, checks still run and their results stay in
//     the drawer until the page is reloaded (state.pageOnly). A check whose
//     save fails also keeps its results on the page, with the warning.
function whereUsedWithoutTheme(source) {
  const guard = "if (!/\\/QueryBuilder\\/Design\\.aspx$/i.test(location.pathname)) return;";
  const at = source.indexOf(guard);
  if (at < 0) fail('IQA-WhereUsed.js: the page guard has moved; update whereUsedWithoutTheme()');
  const split = at + guard.length;
  let page = source.slice(split);
  if (!/\bSOURCES\b/.test(page)) fail('IQA-WhereUsed.js: the drawer no longer uses SOURCES; update whereUsedWithoutTheme()');
  page = page.replace(/\bSOURCES\b/g, 'PLACES');

  page = swap(page,
    "      try {\n        if (!state.rebuilding) state.stored = await readStored();\n      } catch (error) {\n        state.loadError = error.message;\n      }",
    "      try {\n        if (!state.rebuilding && !state.pageOnly) state.stored = await readStored();\n      } catch (error) {\n"
    + "        // Standalone: nowhere to keep shared results, so checks stay on this page.\n"
    + "        console.info('[UnionSuiteWhereUsed] i4u_UT_Configuration could not be read, so checks are kept on this page only.', error);\n"
    + "        state.pageOnly = true;\n      }",
    'loading the stored results');

  page = swap(page,
    "    if (index) {\n      try {\n        const ordinal = state.stored?.ordinal ?? null;",
    "    if (index && state.pageOnly) {\n      state.stored = { ordinal: null, index };\n      index = null;\n    }\n"
    + "    if (index) {\n      try {\n        const ordinal = state.stored?.ordinal ?? null;",
    'saving a check');

  page = swap(page,
    "        state.saveError = error.message;\n",
    "        state.saveError = error.message;\n        state.stored = { ordinal: state.stored?.ordinal ?? null, index };\n",
    'a failed save');

  const everyone = "'Run a check once and everyone can see where their queries are used. It looks through every page, value list, template, task and query, and takes about 15 seconds.'";
  page = swap(page, everyone,
    "(state.pageOnly\n          ? 'Run a check to see where this query is used. It looks through every page, value list, template, task and query, and takes about 15 seconds. "
    + "This site has nowhere to save the results, so they stay here until the page is reloaded.'\n          : " + everyone + ')',
    'the first-check text');

  page = swap(page,
    "    meta.append(document.createTextNode(built));\n    if (canRebuild()) meta.append(rebuildButton('Check again'));",
    "    meta.append(document.createTextNode(built + (state.pageOnly ? ' · kept on this page only' : '')));\n    if (canRebuild()) meta.append(rebuildButton('Check again'));",
    'the results status line');

  return source.slice(0, split)
    + "\n\n  // Standalone bundle: no theme loader, so the theme's own scripts are not a place to check.\n"
    + "  const PLACES = SOURCES.filter(source => source.id !== 'THEME');"
    + page;
}

/* ---------------------------------------------------------------------------
 * A small CSS reader: top-level statements, with comments and strings kept
 * out of the brace counting.
 * ------------------------------------------------------------------------ */
function statements(css, offset = 0) {
  const list = [];
  let i = 0, start = 0, depth = 0, braceAt = -1;
  while (i < css.length) {
    const ch = css[i];
    if (ch === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (depth === 0 && css.slice(start, i).trim() === '') start = end + 2;
      i = end < 0 ? css.length : end + 2;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) j += css[j] === '\\' ? 2 : 1;
      i = j + 1;
      continue;
    }
    if (ch === '{') { if (depth === 0) braceAt = i; depth++; }
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        list.push({ start: offset + start, prelude: css.slice(start, braceAt).trim(), body: css.slice(braceAt + 1, i), text: css.slice(start, i + 1).trim() });
        start = i + 1;
      }
    } else if (ch === ';' && depth === 0) start = i + 1;
    i++;
  }
  return list;
}

function sectionRanges(css) {
  return CSS_SECTIONS.map(name => {
    const start = css.indexOf('/* ' + name + ':START');
    const end = css.indexOf('/* ' + name + ':END */', start);
    if (start < 0 || end < 0) fail('zUnionSuite.css has no ' + name + ' section');
    return [start, end];
  });
}

function extractThemeCss() {
  const ranges = sectionRanges(THEME_CSS);
  const inSection = at => ranges.some(([start, end]) => at >= start && at < end);
  const used = new Set();
  const wanted = prelude => {
    if (EXCLUDE.test(prelude)) return false;
    const hit = CSS_SELECTORS.find(rule => rule.pattern.test(prelude));
    if (hit) used.add(hit.name);
    return Boolean(hit);
  };
  const out = [];
  for (const statement of statements(THEME_CSS)) {
    const { prelude } = statement;
    const whole = inSection(statement.start);
    if (/^@keyframes/.test(prelude)) {
      const name = prelude.split(/\s+/)[1];
      if (whole || CSS_KEYFRAMES.includes(name)) { out.push(statement.text); used.add('@keyframes ' + name); }
    } else if (/^@(media|supports)/.test(prelude)) {
      const inner = statements(statement.body).filter(rule => !EXCLUDE.test(rule.prelude) && (whole || wanted(rule.prelude)));
      if (inner.length) out.push(prelude + ' {\n' + inner.map(rule => '  ' + rule.text.replace(/\n/g, '\n  ')).join('\n\n') + '\n}');
    } else if (!prelude.startsWith('@') && !EXCLUDE.test(prelude) && (whole || wanted(prelude))) {
      out.push(statement.text);
    }
  }
  CSS_SELECTORS.forEach(rule => used.has(rule.name) || fail('no zUnionSuite.css rule matches "' + rule.name + '"'));
  CSS_KEYFRAMES.forEach(name => used.has('@keyframes ' + name) || fail('zUnionSuite.css has no @keyframes ' + name));
  return out.join('\n\n');
}

function iconCss() {
  return Object.entries(ICONS).map(([name, icon]) => {
    const { fill, paths } = Array.isArray(icon) ? { fill: false, paths: icon } : icon;
    const paint = fill ? "fill='black' stroke='none'" : "fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'";
    const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' " + paint + '>'
      + paths.map(d => "<path d='" + d + "'/>").join('') + '</svg>';
    return '.ti-' + name + ' {\n  ' + PREFIX + 'icon: url("data:image/svg+xml,' + encodeURIComponent(svg).replace(/'/g, '%27') + '");\n}';
  }).join('\n\n');
}

/* ---------------------------------------------------------------------------
 * Tokens: Orion's exact values, resolved to literals and renamed
 * ------------------------------------------------------------------------ */
function themeTokens() {
  // The exact-value and semantic :root blocks come before the first
  // component section; the color-mix() ramp inside @supports is skipped, so
  // every value is the exact Orion one.
  const head = THEME_CSS.slice(0, THEME_CSS.indexOf('/* US-NATIVE-BUTTONS:START'));
  const tokens = new Map();
  for (const statement of statements(head)) {
    if (statement.prelude !== ':root') continue;
    for (const match of statement.body.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) tokens.set(match[1], match[2].trim());
  }
  const resolve = (value, seen = new Set()) => value.replace(/var\((--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (all, name, fallback) => {
    if (seen.has(name)) fail('token loop at ' + name);
    if (tokens.has(name)) return resolve(tokens.get(name), new Set([...seen, name]));
    if (fallback != null) return fallback.trim();
    fail('token ' + name + ' is used in a token value but never defined');
  });
  return { names: new Set(tokens.keys()), resolve: name => resolve(tokens.get(name)) };
}

function renameTokens(text, names, usedTokens) {
  return text.replace(/var\(\s*(--[\w-]+)(?![\w-])/g, (all, name) => {
    if (!names.has(name)) return all;
    usedTokens.add(name);
    return 'var(' + PREFIX + name.slice(2);
  });
}

/* ---------------------------------------------------------------------------
 * Bundle
 * ------------------------------------------------------------------------ */
function build() {
  const tokens = themeTokens();
  const usedTokens = new Set();

  const css = renameTokens([
    '/* iqa-standalone.base.css */\n' + read(BASE_CSS).replace(/^\/\*[\s\S]*?\*\/\s*/, ''),
    '/* Icons */\n' + iconCss(),
    '/* From zUnionSuite.css */\n' + extractThemeCss()
  ].join('\n\n'), tokens.names, usedTokens);

  const scripts = SCRIPTS.map(script => ({ name: script.name, text: renameTokens(script.text(), tokens.names, usedTokens) }));

  // Tokens referenced by other tokens' values are resolved to literals, so
  // only the ones the bundle actually reads are declared.
  const declarations = [...usedTokens].sort().map(name => '  ' + PREFIX + name.slice(2) + ': ' + tokens.resolve(name) + ';');
  const rootCss = '/* Private copies of the theme tokens this bundle reads (Orion values). */\n:root {\n' + declarations.join('\n') + '\n}';
  const fullCss = rootCss + '\n\n' + css;

  // Anything still reading a var() that nothing here defines is a missing
  // style, unless the reader supplies its own fallback.
  const defined = new Set([...fullCss.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1]));
  scripts.forEach(s => [...s.text.matchAll(/(--[\w-]+)\s*:/g)].forEach(m => defined.add(m[1])));
  const missing = new Set();
  for (const text of [fullCss, ...scripts.map(s => s.text)]) {
    for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!m[2] && !defined.has(m[1])) missing.add(m[1]);
  }
  if (missing.size) console.warn('build-iqa-standalone: read without a definition or fallback: ' + [...missing].sort().join(', '));

  const header = read(path.join(HERE, 'standalone-header.txt')).trimEnd();
  return header + '\n'
    + "(function () {\n"
    + "  'use strict';\n\n"
    + "  // The theme brings its own copies of all of this; never run beside it.\n"
    + "  if (window.UnionSuiteLoader || window.UnionSuiteActions) {\n"
    + "    console.info('[IQA standalone] The UnionSuite theme is loaded; remove the standalone IQA script.');\n"
    + "    return;\n"
    + "  }\n"
    + "  if (window.UnionSuiteIqaStandalone) return;\n"
    + "  if (!/\\/QueryBuilder\\/Design\\.aspx$|\\/AsiCommon\\/Controls\\/IQA\\/Default\\.aspx$/i.test(location.pathname)) return;\n"
    + "  window.UnionSuiteIqaStandalone = Object.freeze({ version: " + JSON.stringify(version()) + " });\n\n"
    + "  const style = document.createElement('style');\n"
    + "  style.id = 'iqa-standalone-css';\n"
    + "  style.textContent = " + JSON.stringify(fullCss) + ";\n"
    + "  (document.head || document.documentElement).appendChild(style);\n"
    + scripts.map(s => '\n  /* ======================================================================\n   * ' + s.name + '\n   * =================================================================== */\n' + s.text.trim() + '\n').join('')
    + "})();\n";
}

// Changes with any source, so a client can tell builds apart in the console.
function version() {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256');
  [THEME_CSS, THEME_JS, read(BASE_CSS), read(path.join(HERE, 'standalone-header.txt')), ...SCRIPTS.slice(2).map(s => s.text())].forEach(t => hash.update(t));
  return hash.digest('hex').slice(0, 10);
}

const output = build();
if (process.argv.includes('--check')) {
  const current = fs.existsSync(OUTPUT) ? read(OUTPUT) : '';
  if (current !== output) fail(path.basename(OUTPUT) + ' is out of date; run without --check');
  console.log(path.basename(OUTPUT) + ' is up to date.');
} else {
  fs.writeFileSync(OUTPUT, output);
  console.log('Wrote ' + path.basename(OUTPUT) + ' (' + Math.round(Buffer.byteLength(output) / 1024) + ' KB).');
}
