#!/usr/bin/env node
/* =============================================================================
 * Checks the minified theme in tools/build-theme-dist.cjs's dist folder against
 * the readable sources, in a browser:
 *
 *   node tools/test-theme-dist.cjs
 *
 *   1. dist is current (the build's --check).
 *   2. Every minified stylesheet parses to the same rules as its source: the
 *      browser's own serialisation of each rule, in order.
 *   3. Every minified script runs as its source does on a blank page: the same
 *      errors (none expected) and the same globals.
 *   4. A captured iMIS staff page (legacy/Orion page.html) with the whole theme
 *      loaded the way the tenant loads it, CSS links plus the index.js header
 *      include: the loader reports the same modules, no page errors, and every
 *      element's computed style matches, in light and dark.
 *
 * Playwright loads from .tmp-iqa-integration/node_modules, as the other
 * browser tests do.
 * ========================================================================== */
'use strict';

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {chromium} = require('../.tmp-iqa-integration/node_modules/playwright');
const {SOURCE, DIST, listDist} = require('./build-theme-dist.cjs');

const ROOT = path.resolve(__dirname, '..');
const CLIENT = path.join(ROOT, 'Theme', 'UnionSuite-Client');
const VARIANTS = {source: SOURCE, dist: DIST};

// The CSS iMIS links for the theme folder, alphabetically, as it does.
const THEME_CSS = ['99-Orion.css', 'Tabler.css', 'zUnionSuite.css', 'zzClientSpecific.css', 'zzDarkMode.css'];

let failures = 0;
const pass = message => console.log('  ok    ' + message);
const failed = (message, detail) => {
  failures++;
  console.log('  FAIL  ' + message + (detail ? '\n        ' + String(detail).replace(/\n/g, '\n        ') : ''));
};

/* ---------------------------------------------------------------------------
 * Server: /App_Themes/<variant>/ is the theme folder, the client folder sits
 * beside it as on the tenant, and /page/ serves the fixtures.
 * ------------------------------------------------------------------------ */

const TYPES = {
  '.css': 'text/css', '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png',
  '.gif': 'image/gif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'text/xml'
};

function capturedPage(variant) {
  const links = THEME_CSS.map(file => `<link href="/App_Themes/${variant}/${file}" type="text/css" rel="stylesheet" />`).join('\n');
  // The header include from index.js's own comment, pointed at this folder.
  const loader = `<script>(function () {
    var s = document.createElement('script');
    s.src = '/App_Themes/${variant}/index.js?t=' + Math.floor(Date.now() / 1200000);
    s.async = true;
    document.head.appendChild(s);
  })();</script>`;
  return fs.readFileSync(path.join(ROOT, 'legacy', 'Orion page.html'), 'utf8')
    .replace(/<link[^>]*rel=["']stylesheet["'][^>]*>/gi, '')
    .replace(/<link[^>]*type=["']text\/css["'][^>]*>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    // The capture starts invisible; the script that reveals it is stripped.
    .replace(/(<body[^>]*class=")fade\s*/i, '$1')
    .replace(/<\/head>/i, links + '\n' + loader + '\n</head>');
}

function serve() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const send = (status, body, type = 'text/plain') => {
      response.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store'});
      response.end(body);
    };

    if (url.pathname === '/page/blank.html') return send(200, '<!doctype html><html><head></head><body></body></html>', 'text/html');
    const captured = url.pathname.match(/^\/page\/captured-(source|dist)\.html$/);
    if (captured) return send(200, capturedPage(captured[1]), 'text/html');

    const theme = url.pathname.match(/^\/App_Themes\/([^/]+)\/(.+)$/);
    if (!theme) return send(404, 'Not found');
    const folder = theme[1] === 'UnionSuite-Client' ? CLIENT : VARIANTS[theme[1]];
    const file = folder && path.join(folder, decodeURIComponent(theme[2]));
    if (!file || !file.startsWith(folder) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(404, 'Not found');
    send(200, fs.readFileSync(file), TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream');
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

/* ---------------------------------------------------------------------------
 * Browser helpers
 * ------------------------------------------------------------------------ */

async function openPage(browser, origin) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push('pageerror: ' + error.message));
  page.on('console', message => {
    // Failed requests are recorded with their address below.
    if (message.type() === 'error' && !/^Failed to load resource/.test(message.text())) {
      errors.push('console: ' + message.text());
    }
  });
  page.on('response', response => {
    if (response.status() >= 400) errors.push('HTTP ' + response.status() + ': ' + new URL(response.url()).pathname);
  });
  // Google Fonts and anything else off this server: not part of the
  // comparison. Answered empty, since a failed @import fails its stylesheet.
  await page.route(url => !url.href.startsWith(origin), route => route.fulfill({status: 200, contentType: 'text/css', body: ''}));
  return {page, errors};
}

// Page errors with the variant's folder name taken out, so they compare.
const neutral = (errors, variant) => errors.map(error => error.split('/App_Themes/' + variant + '/').join('/App_Themes/<theme>/'));

async function cssRules(browser, origin, variant, file) {
  const {page} = await openPage(browser, origin);
  await page.goto(origin + '/page/blank.html');
  const rules = await page.evaluate(async href => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    await new Promise((resolve, reject) => {
      link.onload = resolve;
      link.onerror = () => reject(new Error('could not load ' + href));
      document.head.append(link);
    });
    return [...link.sheet.cssRules].map(rule => rule.cssText);
  }, `${origin}/App_Themes/${variant}/${file}`);
  await page.close();
  return rules.map(spacing);
}

// The browser re-serialises most values, but keeps a value holding var() and
// an @supports condition as written. There a run of whitespace means one
// space, and spaces beside commas and inside parentheses mean nothing; the
// minifier relies on both, so both are evened out before comparing. Every
// other space still has to match.
const spacing = text => text
  .replace(/\s+/g, ' ')
  .replace(/ ?, ?/g, ',')
  .replace(/\( /g, '(')
  .replace(/ \)/g, ')');

// Scripts that need another first, as the loader's `after` edges order them.
const PREREQUISITES = {
  'Scripts/ActionDefinitions.js': ['zUnionSuite.js'],
  'Scripts/UnionSuiteTaskbar.js': ['zUnionSuite.js'],
  'Scripts/UnionSuiteTaskbar-Bookmarks.js': ['zUnionSuite.js', 'Scripts/UnionSuiteTaskbar.js'],
  'Scripts/IQA-WhereUsed.js': ['zUnionSuite.js'],
  'Scripts/UnionSuiteSidePane.js': ['Scripts/UnionSuiteHelpMatch.js']
};

async function scriptRun(browser, origin, variant, file) {
  const {page, errors} = await openPage(browser, origin);
  await page.goto(origin + '/page/blank.html');
  const load = name => page.evaluate(src => new Promise(resolve => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = script.onerror = resolve;
    document.head.append(script);
  }), `${origin}/App_Themes/${variant}/${name}?v=test`);
  for (const name of PREREQUISITES[file] || []) await load(name);
  const before = await page.evaluate(() => Object.getOwnPropertyNames(window));
  await load(file);
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => Object.getOwnPropertyNames(window));
  await page.close();
  return {errors: neutral(errors, variant), globals: after.filter(name => !before.includes(name)).sort()};
}

async function themedPage(browser, origin, variant) {
  const {page, errors} = await openPage(browser, origin);
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto(`${origin}/page/captured-${variant}.html`, {waitUntil: 'load'});
  await page.waitForFunction(() => window.UnionSuiteLoader);
  await page.evaluate(() => window.UnionSuiteLoader.complete);
  await page.waitForTimeout(1500);

  const loader = await page.evaluate(() => ({
    version: window.UnionSuiteLoader.version,
    modules: window.UnionSuiteLoader.status().map(row => row.path + ' ' + row.state)
  }));

  // Every element's full computed style, as one string per element. Sorted:
  // the browser lists custom properties in no fixed order.
  const snapshot = () => page.evaluate(() => [...document.querySelectorAll('*')].map(element => {
    const style = getComputedStyle(element);
    const properties = [];
    for (let index = 0; index < style.length; index++) {
      properties.push(style[index] + ':' + style.getPropertyValue(style[index]));
    }
    return element.tagName + (element.id ? '#' + element.id : '') + ' ' + properties.sort().join(';');
  }));

  // Settled: two snapshots 300ms apart that match. A late fade or timer
  // otherwise caught one copy mid-change now and then (opacity 0 against 1,
  // 2 November 2026).
  const settled = async () => {
    let previous = await snapshot();
    for (let tries = 0; tries < 10; tries++) {
      await page.waitForTimeout(300);
      const next = await snapshot();
      if (next.join('\n') === previous.join('\n')) return next;
      previous = next;
    }
    return previous;
  };

  const light = await settled();
  await page.evaluate(() => { document.documentElement.dataset.usColorScheme = 'dark'; });
  const dark = await settled();
  await page.close();
  // Requests finish in no fixed order, and a retried one may repeat.
  return {errors: [...new Set(neutral(errors, variant))].sort(), loader, light, dark};
}

// The first entry that differs, shown from just before the first character
// that differs.
function firstDifference(a, b) {
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index++) {
    if (a[index] !== b[index]) {
      const left = String(a[index]);
      const right = String(b[index]);
      let at = 0;
      while (at < left.length && left[at] === right[at]) at++;
      const from = Math.max(0, at - 120);
      const excerpt = text => (from ? '…' : '') + text.slice(from, at + 180);
      const element = left.slice(0, left.indexOf(' '));
      return `entry ${index} (${element}) of ${a.length}/${b.length}, character ${at}\n  source: ${excerpt(left)}\n  dist:   ${excerpt(right)}`;
    }
  }
  return null;
}

/* ---------------------------------------------------------------------------
 * Run
 * ------------------------------------------------------------------------ */

(async () => {
  console.log('1. dist is current');
  const check = spawnSync(process.execPath, [path.join(__dirname, 'build-theme-dist.cjs'), '--check'], {encoding: 'utf8'});
  if (check.status !== 0) {
    console.log(check.stdout + check.stderr);
    console.log('Build it first: node tools/build-theme-dist.cjs');
    process.exit(1);
  }
  pass(check.stdout.trim());

  const files = listDist();
  const stylesheets = files.filter(file => /\.css$/i.test(file) && !/\.min\.css$/i.test(file));
  const scripts = files.filter(file => /\.js$/i.test(file) && !/\.min\.js$/i.test(file));

  const server = await serve();
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({channel: 'msedge', headless: true});

  try {
    console.log('\n2. Stylesheets parse to the same rules');
    for (const file of stylesheets) {
      const [source, dist] = await Promise.all(['source', 'dist'].map(variant => cssRules(browser, origin, variant, file)));
      const difference = firstDifference(source, dist);
      if (difference) failed(file, difference);
      else pass(`${file}: ${dist.length} rules`);
    }

    console.log('\n3. Scripts run alike on a blank page');
    for (const file of scripts) {
      const [source, dist] = await Promise.all(['source', 'dist'].map(variant => scriptRun(browser, origin, variant, file)));
      const difference = firstDifference(source.errors, dist.errors) || firstDifference(source.globals, dist.globals);
      const globals = dist.globals.length > 6 ? dist.globals.length + ' globals' : dist.globals.join(', ') || 'no new globals';
      // An error the readable source raises too is the script's, not the build's.
      const same = dist.errors.length ? '; the source raises the same: ' + dist.errors.join(' | ') : '';
      if (difference) failed(file, difference);
      else pass(`${file}: ${globals}${same}`);
    }

    console.log('\n4. A captured iMIS page with the whole theme');
    const [source, dist] = [await themedPage(browser, origin, 'source'), await themedPage(browser, origin, 'dist')];
    const modules = firstDifference(source.loader.modules, dist.loader.modules);
    if (modules) failed('loader modules differ', modules);
    else pass(`loader ${dist.loader.version}: ${dist.loader.modules.join(', ')}`);
    if (dist.loader.modules.some(row => / (failed|blocked)$/.test(row))) failed('a module did not load', dist.loader.modules.join('\n'));
    // The capture's own images and iMIS resources are not served here, so the
    // readable theme has failed requests too: the minified one must add none.
    const errors = firstDifference(source.errors, dist.errors);
    if (errors) failed('page errors differ', errors);
    else pass('same page errors as the source: ' + (dist.errors.filter(error => !/^HTTP 404/.test(error)).length
      ? dist.errors.join(' | ')
      : 'none beyond ' + dist.errors.length + ' capture assets not served here'));
    for (const scheme of ['light', 'dark']) {
      const difference = firstDifference(source[scheme], dist[scheme]);
      if (difference) failed(`computed styles differ in ${scheme}`, difference);
      else pass(`computed styles match in ${scheme}: ${dist[scheme].length} elements`);
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(failures ? `\n${failures} failure(s)` : '\nAll checks passed.');
  process.exit(failures ? 1 : 0);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
