'use strict';

// Exercise the guide and companion builds without writing their outputs. This
// catches local-only inputs before research or captures are removed from Git.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { fileURLToPath } = require('node:url');
const root = path.resolve(__dirname, '../../../..');
const inputs = new Set();
const outputs = new Set();
const originalRead = fs.readFileSync;
const originalWrite = fs.writeFileSync;
const originalLog = console.log;

function relativeFile(file) {
  if (typeof file === 'number') throw new Error('Use a named file for guide inputs.');
  const absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  const relative = path.relative(root, absolute).replaceAll('\\', '/');
  if (relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) {
    throw new Error('Guide dependency leaves the repository: ' + absolute);
  }
  return relative;
}

// The guide and its config page are built outside the repository on
// purpose (guide-output.cjs); every other output must stay inside it.
const guideOutput = require('./guide-output.cjs');
function outputFile(file) {
  const absolute = path.resolve(file instanceof URL ? fileURLToPath(file) : String(file));
  if (path.dirname(absolute) === path.resolve(guideOutput.guideDir)) return 'guide-output/' + path.basename(absolute);
  return relativeFile(file);
}

try {
  fs.readFileSync = function (file, ...args) {
    const relative = relativeFile(file);
    if (/^(?:archive|\.preview|prototypes|\.tmp-[^/]+)\//i.test(relative) ||
        relative.startsWith('Theme/UnionSuite/docs/')) {
      throw new Error('Promote this guide input into guides/usage/: ' + relative);
    }
    inputs.add(relative);
    return originalRead.call(fs, file, ...args);
  };
  fs.writeFileSync = function (file) {
    outputs.add(outputFile(file));
  };
  console.log = () => {};
  const guide = require('./build-theme-usage.cjs');
  guide.build(false);
} finally {
  fs.readFileSync = originalRead;
  fs.writeFileSync = originalWrite;
  console.log = originalLog;
}

const ignored = spawnSync('git', ['check-ignore', '--no-index', '-z', '--stdin'], {
  cwd: root,
  input: [...inputs].join('\0') + '\0',
  encoding: 'utf8'
});
if (ignored.error) throw ignored.error;
if (ignored.status !== 0 && ignored.status !== 1) {
  throw new Error('Unable to check guide inputs against Git ignores: ' + ignored.stderr);
}
const ignoredInputs = ignored.stdout.split('\0').filter(Boolean);
if (ignoredInputs.length) {
  throw new Error('Guide inputs must remain trackable:\n' + ignoredInputs.join('\n'));
}
const circular = [...inputs].filter(file => outputs.has(file));
if (circular.length) {
  throw new Error('A generated guide output is also used as input:\n' + circular.join('\n'));
}
// The IQA where-used index finds the theme's own IQAs by scanning its
// scripts for whole quoted $/ paths (Scripts/IQA-WhereUsed.js). A path
// assembled from parts would be invisible to it, so none may be.
const themeDir = path.join(root, 'Theme/UnionSuite');
const scriptsIn = folder => fs.readdirSync(path.join(themeDir, folder))
  .filter(name => name.endsWith('.js')).map(name => folder + '/' + name);
const themeScripts = ['index.js', 'zUnionSuite.js', ...scriptsIn('Scripts'), ...scriptsIn('Forms')];
// The loader lists the forms' on-demand files for the where-used scan
// (ON_DEMAND in index.js); every form file must be there.
const loaderSource = originalRead.call(fs, path.join(themeDir, 'index.js'), 'utf8');
const unlisted = scriptsIn('Forms').filter(file => file !== 'Forms/UnionSuiteForms.js' && !loaderSource.includes("'" + file + "'"));
if (unlisted.length) {
  throw new Error('List each form file in index.js ON_DEMAND, so where used scans it:\n' + unlisted.join('\n'));
}
const assembled = [
  /['"`]\$\/[^'"`\r\n]*['"`]\s*\+/,
  /\+\s*['"`]\$\/[^'"`\r\n]*['"`]/,
  /`\$\/[^`]*\$\{/
];
const assembledPaths = [];
for (const script of themeScripts) {
  originalRead.call(fs, path.join(themeDir, script), 'utf8').split('\n').forEach((line, index) => {
    if (assembled.some(pattern => pattern.test(line))) assembledPaths.push(script + ':' + (index + 1) + '  ' + line.trim());
  });
}
if (assembledPaths.length) {
  throw new Error('Write IQA paths in theme scripts as whole strings, so where used can find them:\n' + assembledPaths.join('\n'));
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({inputs: [...inputs].sort(), outputs: [...outputs].sort()}, null, 2));
} else {
  console.log('Guide source check passed: ' + inputs.size + ' repository inputs; ' +
    outputs.size + ' outputs simulated; no archived, prototype or ignored dependencies.');
}
