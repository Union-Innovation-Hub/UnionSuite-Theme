#!/usr/bin/env node
/* =============================================================================
 * Builds the upload copy of the UnionSuite theme: Theme/UnionSuite with its
 * project-owned CSS and JS minified, every other file copied as it is.
 *
 *   node tools/build-theme-dist.cjs           build
 *   node tools/build-theme-dist.cjs --check   fail if the dist folder is stale
 *
 * The output goes outside OneDrive and Git, beside the built usage guide:
 * C:\Dev\UHUB\Theme\dist\UnionSuite (UNIONSUITE_DIST_DIR overrides it). Upload
 * the folder's contents to the tenant's theme folder (App_Themes/UnionSuite2
 * on the dev tenant). Run `npm install` once first, for Terser.
 *
 * What the tenant depends on, and how the build keeps it:
 *   • File names and folders are unchanged. The loader (index.js) and the
 *     forms runtime find themselves by name (document.currentScript, or a
 *     /index.js and /UnionSuiteForms.js search) and resolve every child
 *     beside them with ?v=RELEASE, so there is no .min suffix.
 *   • IQA Where-Used fetches the uploaded scripts and reads the IQA paths in
 *     them, naming each by the nearest "/* US-…:START" marker or define('…')
 *     call. Terser keeps those markers and the name `define`, and the build
 *     fails if the minified scripts would report anything different.
 *   • CSS minifying removes comments and whitespace only. Rules, selectors,
 *     declarations and their order are untouched, so the cascade is too;
 *     tools/test-theme-dist.cjs compares the browser's parsed rules.
 *   • Third-party minified files (Tabler/tabler-icons.min.css) are copied as
 *     supplied.
 *
 * The readable sources stay the only maintained copy: the usage guide and the
 * embeds build from them, never from this folder.
 * ========================================================================== */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'Theme', 'UnionSuite');
const DIST = path.resolve(process.env.UNIONSUITE_DIST_DIR || 'C:\\Dev\\UHUB\\Theme\\dist\\UnionSuite');

// Documentation and OS files stay out of the upload.
const SKIP = [/\.md$/i, /(^|\/)desktop\.ini$/i, /(^|\/)Thumbs\.db$/i, /(^|\/)\.DS_Store$/];

// OneDrive conflict copies are name-<MACHINE>.ext. iMIS loads every .css in
// the theme folder, so one would be uploaded and applied: stop instead.
const MACHINES = ['UHUB-ALPHA-2', 'Omega', os.hostname()];

// Copied byte for byte: supplied already minified.
const AS_SUPPLIED = [/\.min\.(css|js)$/i];

// Comments the tenant reads (IQA Where-Used's section markers) or that a
// licence needs. Every other comment goes.
const KEPT_COMMENTS = (node, comment) =>
  /^\s*US-[A-Z0-9-]+:START/.test(comment.value) || /^!|@license|@preserve/.test(comment.value);

const TERSER_OPTIONS = {
  ecma: 2020,
  // Classic scripts that share globals: top-level names must survive.
  toplevel: false,
  // Whitespace, comments and local names only; no code is rewritten. The
  // rewrites saved about 3% more, and they move code: inlining a constant
  // changed which section IQA Where-Used names for it.
  compress: false,
  // IQA Where-Used names a reference by the nearest define('…') call, and
  // ActionDefinitions.js calls a local function named define.
  mangle: {reserved: ['define']},
  format: {comments: KEPT_COMMENTS}
};

// The source as the minified file should read it: comments gone, code as is.
const BASELINE_OPTIONS = {...TERSER_OPTIONS, mangle: false};

const fail = message => {
  console.error('build-theme-dist: ' + message);
  process.exit(1);
};

/* ---------------------------------------------------------------------------
 * The file list
 * ------------------------------------------------------------------------ */

function listSource(dir = SOURCE) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSource(full);
    return [path.relative(SOURCE, full).split(path.sep).join('/')];
  }).sort();
}

function conflictCopies(files) {
  const names = new Set(files);
  return files.filter(file => {
    const match = file.match(/^(.*)-([^/]+?)(\.[^./]+)$/);
    return match && MACHINES.includes(match[2]) && names.has(match[1] + match[3]);
  });
}

/* ---------------------------------------------------------------------------
 * CSS: comments and whitespace only
 *
 * A small tokenizer that copies strings, url(…) and escapes verbatim, drops
 * comments, and collapses whitespace, leaving it out only where CSS never
 * needs it: around { } ; , and the colon after a property name, after ( and
 * before ). A custom property's value keeps its inner whitespace exactly:
 * the browser hands it back to scripts as written. A nested style rule stops
 * the build, because the colon rule would not be safe inside one.
 * ------------------------------------------------------------------------ */

// At-rules whose block holds declarations. Every other at-rule block holds
// rules: @media, @supports, @keyframes and so on, and any unknown one, such as
// the Sass @respond-to left in 99-Orion.css, which browsers drop whole.
const DECLARATION_AT_RULES = /^@(-[a-z]+-)?(font-face|page|property|counter-style|font-palette-values|font-feature-values|viewport|view-transition)\b/i;

function minifyCss(css, file) {
  // Kept as chunks with the last character tracked: reading back from one
  // long concatenated string makes the build quadratic.
  const out = [];
  let last = '';              // the last character written
  let semicolon = false;      // a ; waits, dropped if the block closes next
  let space = '';             // the whitespace before the next token
  const blocks = ['rules'];   // 'rules' or 'declarations', innermost last
  let statement = '';         // this statement's text so far, to classify a block
  let depth = 0;              // parentheses
  let declaration = null;     // the declaration being read, in a declarations block
  let afterColon = false;     // the last thing written was a declaration colon

  const inDeclarations = () => blocks[blocks.length - 1] === 'declarations';
  const startDeclaration = () => {
    declaration = inDeclarations() ? {name: '', colon: false, custom: false, value: false} : null;
  };

  // tight: this token never needs a space before it.
  function write(text, {tight = false} = {}) {
    if (semicolon) {
      // The last declaration in a block needs no semicolon.
      if (!(text === '}' && inDeclarations())) out.push(';');
      semicolon = false;
    }
    if (space && last) {
      if (declaration?.custom && declaration.value) {
        if (!tight) text = space + text;
      } else if (!tight && !afterColon && !'{};,('.includes(last)) {
        text = ' ' + text;
      }
    }
    space = '';
    afterColon = false;
    out.push(text);
    last = text[text.length - 1];
    statement += text;
    if (declaration?.colon) declaration.value = true;
  }

  // A custom property's value keeps its own spacing; only its edges go.
  const tightInValue = () => !(declaration?.custom && declaration.colon);

  for (let i = 0; i < css.length;) {
    const char = css[i];

    if (char === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      if (end < 0) throw new Error(file + ': unterminated comment');
      i = end + 2;
      continue;
    }

    if (/\s/.test(char)) {
      const start = i;
      while (i < css.length && /\s/.test(css[i])) i++;
      space += css.slice(start, i);
      continue;
    }

    if (char === '"' || char === "'") {
      let end = i + 1;
      while (end < css.length && css[end] !== char) {
        if (css[end] === '\\') end++;
        else if (css[end] === '\n') throw new Error(file + ': unterminated string');
        end++;
      }
      if (end >= css.length) throw new Error(file + ': unterminated string');
      write(css.slice(i, end + 1));
      i = end + 1;
      continue;
    }

    if (char === '\\') {
      // An escape: up to six hex digits and the one space that ends them.
      const hex = css.slice(i + 1, i + 8).match(/^[0-9a-f]{1,6}[ \t\n]?/i);
      const length = hex ? 1 + hex[0].length : 2;
      write(css.slice(i, i + length));
      i += length;
      continue;
    }

    if (char === '(' && /url$/i.test(css.slice(i - 3, i)) && !/[\w-]/.test(css[i - 4] || '')) {
      // An unquoted url(…) is a single token: copy it whole.
      let start = i + 1;
      while (/\s/.test(css[start] || '')) start++;
      if (css[start] !== '"' && css[start] !== "'") {
        let end = start;
        while (end < css.length && css[end] !== ')') end += css[end] === '\\' ? 2 : 1;
        if (end >= css.length) throw new Error(file + ': unterminated url(');
        write('(' + css.slice(start, end).trim() + ')');
        i = end + 1;
        continue;
      }
    }

    if (char === '{') {
      if (inDeclarations()) {
        throw new Error(file + ': nested rule after "' + statement.trim().slice(-60) + '"; extend minifyCss before using CSS nesting');
      }
      const prelude = statement.trim();
      const opens = prelude.startsWith('@') && !DECLARATION_AT_RULES.test(prelude) ? 'rules' : 'declarations';
      write('{', {tight: true});
      blocks.push(opens);
      statement = '';
      depth = 0;
      startDeclaration();
      i++;
      continue;
    }

    if (char === '}') {
      if (blocks.length === 1) throw new Error(file + ': unbalanced }');
      write('}', {tight: true});
      blocks.pop();
      statement = '';
      depth = 0;
      startDeclaration();
      i++;
      continue;
    }

    if (char === ';' && depth === 0) {
      // Written with the next token, which decides whether it is needed.
      if (semicolon) out.push(';');
      semicolon = true;
      space = '';
      last = ';';
      statement = '';
      startDeclaration();
      i++;
      continue;
    }

    if (char === ':' && declaration && !declaration.colon && depth === 0) {
      declaration.custom = declaration.name.startsWith('--');
      write(':', {tight: true});
      declaration.colon = true;
      afterColon = true;
      i++;
      continue;
    }

    if (char === ',' || char === ')') {
      if (char === ')') depth = Math.max(0, depth - 1);
      write(char, {tight: tightInValue()});
      i++;
      continue;
    }

    if (char === '(') depth++;
    if (declaration && !declaration.colon) declaration.name += char;
    write(char);
    i++;
  }

  if (blocks.length !== 1) throw new Error(file + ': unclosed {');
  if (semicolon) out.push(';');
  return out.join('');
}

/* ---------------------------------------------------------------------------
 * JS
 * ------------------------------------------------------------------------ */

function loadTerser() {
  try {
    return require('terser');
  } catch {
    fail('Terser is not installed. Run `npm install` in the repo root once, then build again.');
  }
}

async function minifyJs(code, file, terser) {
  const result = await terser.minify({[file]: code}, TERSER_OPTIONS);
  // Terser has parsed it; this confirms the output still compiles as a
  // classic script, which is how the loader runs it.
  new vm.Script(result.code, {filename: file});
  return result.code + '\n';
}

/* ---------------------------------------------------------------------------
 * Guards: what the tenant reads from the uploaded files
 * ------------------------------------------------------------------------ */

// IQA Where-Used's own patterns, read from its source so they cannot drift.
function whereUsedPatterns(sources) {
  const text = sources.get('Scripts/IQA-WhereUsed.js').toString('utf8');
  const literal = name => {
    const match = text.match(new RegExp('const ' + name + ' = (/.+/[gimsuy]*);'));
    if (!match) fail('IQA-WhereUsed.js no longer defines ' + name + '; update whereUsedPatterns');
    return new Function('return ' + match[1])();
  };
  return {path: literal('SCRIPT_PATH'), owner: literal('SCRIPT_OWNER')};
}

// The same reading as scriptReferences() in IQA-WhereUsed.js.
function scriptReferences(source, patterns) {
  const owners = [];
  const references = [];
  let match;
  patterns.owner.lastIndex = 0;
  while ((match = patterns.owner.exec(source))) owners.push({at: match.index, name: match[1] || match[2]});
  patterns.path.lastIndex = 0;
  while ((match = patterns.path.exec(source))) {
    const iqa = match[2];
    if (iqa.includes('…') || iqa.includes('${')) continue;
    const before = owners.filter(owner => owner.at < match.index);
    references.push(iqa + '  ←  ' + (before.length ? before[before.length - 1].name : '(no owner)'));
  }
  return references.sort();
}

// The minified script must give IQA Where-Used the same references as the
// source does without its comments. Paths that appear only in comments (doc
// examples) stop being reported, which is a correction; they are listed.
async function checkWhereUsed(sources, built, terser) {
  const patterns = whereUsedPatterns(sources);
  const problems = [];
  const commentsOnly = [];
  const difference = (from, to) => from.filter(line => !to.includes(line));

  for (const file of built.keys()) {
    if (!/\.js$/i.test(file) || /IQA-WhereUsed\.js$/i.test(file) || !sources.has(file)) continue;
    const source = sources.get(file).toString('utf8');
    const baseline = (await terser.minify({[file]: source}, BASELINE_OPTIONS)).code;
    const expected = scriptReferences(baseline, patterns);
    const actual = scriptReferences(built.get(file).toString('utf8'), patterns);

    if (expected.join('\n') !== actual.join('\n')) {
      problems.push(file + ':\n    lost   ' + (difference(expected, actual).join('\n           ') || '-') +
        '\n    gained ' + (difference(actual, expected).join('\n           ') || '-'));
    }
    difference(scriptReferences(source, patterns), expected).forEach(line => commentsOnly.push(file + ': ' + line));
  }

  if (problems.length) {
    fail('IQA Where-Used would read the minified scripts differently:\n  ' + problems.join('\n  '));
  }
  return commentsOnly;
}

// Every file the loader and the forms runtime request must be in the output.
function checkLoaderFiles(sources, built) {
  const loader = sources.get('index.js').toString('utf8');
  const forms = sources.get('Forms/UnionSuiteForms.js').toString('utf8');
  const wanted = [
    ...[...loader.matchAll(/^\s*path: '([^']+)'/gm)].map(match => match[1]),
    ...[...loader.matchAll(/const ON_DEMAND = \[([^\]]*)\]/g)].flatMap(match => match[1].match(/[^'",\s]+\.js/g) || []),
    ...[...forms.matchAll(/const STYLESHEET = '([^']+)'/g)].map(match => 'Forms/' + match[1])
  ];
  if (wanted.length < 10) fail('could not read the loader\'s file list from index.js; update checkLoaderFiles');
  const missing = wanted.filter(file => !built.has(file));
  if (missing.length) fail('the loader requests files the build did not produce: ' + missing.join(', '));
}

function release(text) {
  return text.match(/const RELEASE\s*=\s*['"]([^'"]+)['"]/)?.[1] || null;
}

/* ---------------------------------------------------------------------------
 * Build
 * ------------------------------------------------------------------------ */

async function build() {
  const files = listSource();
  const conflicts = conflictCopies(files);
  if (conflicts.length) {
    fail('OneDrive conflict copies in Theme/UnionSuite. Compare each with its original, keep what matters, and remove the copy:\n  ' + conflicts.join('\n  '));
  }

  const terser = loadTerser();
  const sources = new Map();
  const built = new Map();
  const kinds = new Map();

  for (const file of files) {
    if (SKIP.some(pattern => pattern.test(file))) continue;
    const bytes = fs.readFileSync(path.join(SOURCE, file));
    sources.set(file, bytes);

    if (AS_SUPPLIED.some(pattern => pattern.test(file))) {
      built.set(file, bytes);
      kinds.set(file, 'copied');
    } else if (/\.css$/i.test(file)) {
      built.set(file, Buffer.from(minifyCss(bytes.toString('utf8'), file), 'utf8'));
      kinds.set(file, 'minified');
    } else if (/\.js$/i.test(file)) {
      try {
        built.set(file, Buffer.from(await minifyJs(bytes.toString('utf8'), file, terser), 'utf8'));
      } catch (error) {
        fail(file + ': ' + (error.message || error));
      }
      kinds.set(file, 'minified');
    } else {
      built.set(file, bytes);
      kinds.set(file, 'copied');
    }
  }

  const commentsOnly = await checkWhereUsed(sources, built, terser);
  checkLoaderFiles(sources, built);
  return {sources, built, kinds, commentsOnly};
}

function listDist(dir = DIST) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listDist(full);
    return [path.relative(DIST, full).split(path.sep).join('/')];
  });
}

// The output folder is emptied of stale files, so make sure it is a folder of
// ours and not the source or a parent of it.
function guardDist() {
  const inside = (child, parent) => !path.relative(parent, child).startsWith('..') && !path.isAbsolute(path.relative(parent, child));
  if (inside(SOURCE, DIST) || inside(DIST, SOURCE)) fail('the dist folder overlaps Theme/UnionSuite: ' + DIST);
  if (path.parse(DIST).root === DIST) fail('the dist folder cannot be a drive root: ' + DIST);
}

function formatSize(bytes) {
  return bytes >= 1024 * 1024 ? (bytes / 1024 / 1024).toFixed(2) + ' MB' : Math.round(bytes / 1024) + ' KB';
}

async function main() {
  const checking = process.argv.includes('--check');
  guardDist();
  const {sources, built, kinds, commentsOnly} = await build();

  const existing = listDist();
  const stale = [...built].filter(([file, bytes]) => {
    const target = path.join(DIST, file);
    return !fs.existsSync(target) || !fs.readFileSync(target).equals(bytes);
  }).map(([file]) => file);
  const extra = existing.filter(file => !built.has(file));

  if (checking) {
    if (stale.length || extra.length) {
      console.error('build-theme-dist: ' + DIST + ' is out of date. Run node tools/build-theme-dist.cjs');
      stale.forEach(file => console.error('  changed  ' + file));
      extra.forEach(file => console.error('  extra    ' + file));
      process.exit(1);
    }
    console.log('Theme dist is current: ' + DIST + ' (' + built.size + ' files, RELEASE ' + release(sources.get('index.js').toString('utf8')) + ')');
    return;
  }

  // A script that changed since the last build reaches returning browsers
  // only under a new RELEASE: they cache theme files for a week.
  const previousRelease = fs.existsSync(path.join(DIST, 'index.js'))
    ? release(fs.readFileSync(path.join(DIST, 'index.js'), 'utf8'))
    : null;
  const currentRelease = release(sources.get('index.js').toString('utf8'));
  const changedScripts = stale.filter(file => /\.js$/i.test(file) && file !== 'index.js' && existing.includes(file));

  for (const file of stale) {
    fs.mkdirSync(path.dirname(path.join(DIST, file)), {recursive: true});
    fs.writeFileSync(path.join(DIST, file), built.get(file));
  }
  for (const file of extra) fs.rmSync(path.join(DIST, file));

  const total = kind => [...built.keys()].filter(file => kinds.get(file) === kind);
  const size = (map, list) => list.reduce((sum, file) => sum + map.get(file).length, 0);
  const minified = total('minified');
  console.log('Built ' + DIST);
  console.log('  ' + minified.length + ' minified: ' + formatSize(size(sources, minified)) + ' → ' + formatSize(size(built, minified)));
  console.log('  ' + total('copied').length + ' copied as they are');
  console.log('  ' + stale.length + ' written, ' + extra.length + ' removed, ' + (built.size - stale.length) + ' unchanged');
  console.log('  RELEASE ' + currentRelease);
  if (commentsOnly.length) {
    console.log('\n  IQA paths only in comments, which IQA Where-Used no longer counts once minified:');
    commentsOnly.forEach(line => console.log('    ' + line));
  }
  if (changedScripts.length && previousRelease === currentRelease) {
    console.warn('\n  Scripts changed since the last build, but RELEASE is still ' + currentRelease + '.');
    console.warn('  Raise RELEASE in Theme/UnionSuite/index.js before uploading, or returning');
    console.warn('  browsers keep the old scripts for up to a week:');
    changedScripts.forEach(file => console.warn('    ' + file));
  }
}

if (require.main === module) {
  main().catch(error => fail(error.stack || String(error)));
}

module.exports = {SOURCE, DIST, build, minifyCss, listDist};
