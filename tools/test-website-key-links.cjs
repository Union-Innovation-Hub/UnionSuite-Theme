// Domain-root popup and page links carry the current website's key
// (?WebsiteKey=<gWebsiteKey>), so iMIS resolves a website's own shortcut,
// such as /Cases_ResolveCase, on the website being viewed instead of the
// domain's default website. Links built under the website's path
// (/UTNewTheme/Cases_CreateCase) are already the website's and stay as they
// were.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('Theme/UnionSuite/Scripts/ActionDefinitions.js', 'utf8');
const KEY = 'b69d7cc8-ae4a-4a13-806f-d46d6b3427af';

function load({websiteKey = KEY} = {}) {
  const actions = {}, composers = {};
  const location = {origin: 'https://theme.test', pathname: '/UTNewTheme/Cases_ManageCase', search: '?CaseID=C49', href: ''};
  const document = {
    getElementById: () => null,
    documentElement: {setAttribute() {}},
    body: {classList: {contains: () => false}},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  const window = {
    gWebSiteRoot: 'https://theme.test/UTNewTheme',
    ...(websiteKey ? {gWebsiteKey: websiteKey} : {}),
    UnionSuiteActions: {define: (key, options) => { actions[key] = options; }},
    UnionSuiteComposers: {define: (key, spec) => { composers[key] = spec; }},
    addEventListener() {}
  };
  const MutationObserver = class { observe() {} };
  vm.runInContext(source, vm.createContext({window, document, location, URL, URLSearchParams, MutationObserver,
    globalThis: {location}, fetch: async () => ({ok: true, json: async () => ({})}),
    console: {warn() {}, log() {}, error() {}}}));
  return {window, actions, composers};
}

const href = value => new URL(value);
const {window, actions, composers} = load();
const context = {caseId: 'C49', caseNum: '48', ordinal: '7', partyId: '104023', agreementId: 'A1', agreementNum: '1'};

// The helper itself: adds the key, keeps one already on the address.
assert.equal(window.UnionSuiteWebsite.stamp(new URL('https://theme.test/Cases_ResolveCase')).searchParams.get('WebsiteKey'), KEY);
const kept = window.UnionSuiteWebsite.stamp(new URL('https://theme.test/Cases_ResolveCase?WebsiteKey=other'));
assert.equal(kept.searchParams.getAll('WebsiteKey').join(), 'other');

// Case popups through shortcuts and shared pages.
const resolve = href(actions['cases.resolve'].action.href({context}));
assert.equal(resolve.pathname, '/Cases_ResolveCase');
assert.equal(resolve.searchParams.get('CaseID'), 'C49');
assert.equal(resolve.searchParams.get('WebsiteKey'), KEY);
for (const key of ['cases.edit-meeting', 'cases.edit-staff', 'cases.edit-note', 'cases.edit-task', 'cases.edit-resolution']) {
  assert.equal(href(actions[key].action.href({context})).searchParams.get('WebsiteKey'), KEY, key);
}
for (const key of ['cases.add-note', 'cases.add-task', 'cases.add-meeting', 'cases.add-staff', 'cases.add-party', 'cases.add-attachment']) {
  assert.equal(href(composers[key].form.href({context})).searchParams.get('WebsiteKey'), KEY, key);
}

// Contact and home popups.
assert.equal(href(actions['home.add-task'].action.href({context})).searchParams.get('WebsiteKey'), KEY);
assert.equal(href(actions['home.manage-bulletin'].action.href({context})).searchParams.get('WebsiteKey'), KEY);

// Already under the website's path: unchanged.
const created = href(actions['member.create-case'].action.href({context}));
assert.equal(created.pathname, '/UTNewTheme/Cases_CreateCase');
assert.equal(created.searchParams.has('WebsiteKey'), false);

// No key on the page (a preview, an old page): links are as before.
const bare = load({websiteKey: ''});
assert.equal(href(bare.actions['cases.resolve'].action.href({context})).searchParams.has('WebsiteKey'), false);

console.log('Website key links: ok');
