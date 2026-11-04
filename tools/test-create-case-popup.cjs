// The old contact page's Quick Actions call CreateCasePopupFn() by name. The
// theme replaces it with the current website's Create Case page, and sets it
// again once the page has loaded, after i4u_JsFunctions.js may have declared
// the original.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('Theme/UnionSuite/Scripts/ActionDefinitions.js', 'utf8');

function load({site = 'https://theme.test/UTNewTheme', search = '?ID=104023'} = {}) {
  const listeners = {document: {}, window: {}};
  const location = {origin: 'https://theme.test', pathname: '/_i4u_/Core/Account_Page_Staff.aspx', search, href: ''};
  const document = {
    getElementById: () => null,
    documentElement: {setAttribute() {}},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: (type, run) => { listeners.document[type] = run; }
  };
  const window = {
    gWebSiteRoot: site,
    UnionSuiteActions: {define() {}},
    addEventListener: (type, run) => { listeners.window[type] = run; }
  };
  const MutationObserver = class { observe() {} };
  vm.runInContext(source, vm.createContext({window, document, location, URL, URLSearchParams, MutationObserver,
    fetch: async () => ({ok: true, json: async () => ({})}), console: {warn() {}, log() {}, error() {}}}));
  return {window, location, listeners};
}

const page = load();
assert.equal(typeof page.window.CreateCasePopupFn, 'function');
page.window.CreateCasePopupFn();
assert.equal(page.location.href, 'https://theme.test/UTNewTheme/Cases_CreateCase?ID=104023');

// i4u_JsFunctions.js may declare the original after the theme has run: the
// override is set again on DOMContentLoaded and load.
const original = function CreateCasePopupFn() {};
for (const [target, type] of [['document', 'DOMContentLoaded'], ['window', 'load']]) {
  page.window.CreateCasePopupFn = original;
  page.listeners[target][type]();
  assert.notEqual(page.window.CreateCasePopupFn, original, type + ' sets the override again');
}

// A lowercase id, and a site without a website root.
const lower = load({site: '', search: '?id=100020'});
lower.window.CreateCasePopupFn();
assert.equal(lower.location.href, 'https://theme.test/Cases_CreateCase?ID=100020');

console.log('CreateCasePopupFn override: 4 cases pass.');
