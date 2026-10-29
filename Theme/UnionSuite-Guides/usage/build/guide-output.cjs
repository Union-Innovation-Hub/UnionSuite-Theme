// Where the built guide and its config page go (owner, 25 October 2026):
// out of OneDrive, whose sync stalled re-uploading the 180 MB guide after
// every build, and out of Git (they were already ignored). Usage-Guide.html
// and Theme-Config.html stay together: they link to each other by name.
// UNIONSUITE_GUIDE_DIR overrides the folder, for another machine.
const fs = require('node:fs');
const path = require('node:path');
const {pathToFileURL} = require('node:url');

const root = path.resolve(__dirname, '../../../..');
const guideDir = process.env.UNIONSUITE_GUIDE_DIR || 'C:\\Dev\\UHUB\\Theme\\Usage-Guide';

// Where the guide lived in the repo: its relative links are written from here.
const sourceDir = path.join(root, 'Theme/UnionSuite-Guides');

function guidePath(name) {
  return path.join(guideDir, name);
}

function writeGuideFile(name, html) {
  fs.mkdirSync(guideDir, {recursive: true});
  fs.writeFileSync(guidePath(name), html);
}

// The guide links to repo documents relatively (../../references/…,
// ../../THEME-BUTTONS.md). Outside the repo those become file links to the
// same documents, so they still open. Only attributes are rewritten: links
// shown as code are escaped and stay as written.
function repoLinks(html) {
  return html.replace(/\b(href|src)="(\.\.\/[^"#?]*)([?#][^"]*)?"/g, (match, attribute, relative, rest = '') => {
    const target = pathToFileURL(path.join(sourceDir, decodeURI(relative))).href;
    return `${attribute}="${target}${rest}"`;
  });
}

module.exports = {guideDir, guidePath, writeGuideFile, repoLinks};
