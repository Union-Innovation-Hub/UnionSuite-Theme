// Case access on page load: Restricted replaces the manage case page with the
// no-access page; Granted, a failed check or no answer stays on the page.
// The root's data-us-case-access tells US-CASE-ACCESS when to show it.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const source = fs.readFileSync('Theme/UnionSuite/Scripts/ActionDefinitions.js', 'utf8');
const cloudToolz = 'https://cloudtoolz.test';

async function load({pathname = '/Cases_ManageCase', search = '?CaseID=C202&CaseNum=198', pageClass = false, access, memberId, status = 200, site = 'https://theme.test/UTNewTheme'}) {
  const calls = [], replaced = [], warnings = [], root = {}, defs = new Map();
  const json = (body, ok = true, code = 200) => ({ok, status: code, json: async () => body});
  const fetch = async (url, init = {}) => {
    calls.push({url: String(url), init});
    if (String(url).startsWith('/api/query')) return json({Items: {$values: [{Description: cloudToolz + '/'}]}});
    if (String(url) === '/api/ZenTokens') return json({});
    return json(access === undefined ? {} : {Access: access, ...(memberId ? {MemberID: memberId} : {})}, status < 400, status);
  };
  const location = {origin: 'https://theme.test', pathname, search, replace: url => replaced.push(url)};
  const document = {
    getElementById: id => ({
      __RequestVerificationToken: {value: 'token'},
      __ClientContext: {value: JSON.stringify({loggedInPartyId: '100', selectedPartyId: '100'})}
    })[id] || null,
    documentElement: {setAttribute: (name, value) => { root[name] = value; }},
    querySelector: selector => pageClass && selector === '.us-case-page' ? {} : null,
    querySelectorAll: () => [],
    addEventListener() {}
  };
  const window = {UnionSuiteActions: {define: (key, value) => defs.set(key, value)}, gWebsiteKey: 'site', gWebSiteRoot: site};
  const MutationObserver = class { observe() {} };
  const context = vm.createContext({window, document, fetch, location, URL, URLSearchParams, MutationObserver,
    console: {warn: (...args) => warnings.push(args.join(' ')), log() {}, error() {}}});
  vm.runInContext(source, context);
  await new Promise(resolve => setTimeout(resolve, 20));
  return {calls: calls.filter(call => call.url.startsWith(cloudToolz)), replaced, warnings, defs, state: root['data-us-case-access']};
}

(async () => {
  const restricted = await load({access: 'Restricted'});
  assert.equal(restricted.calls.length, 1);
  assert.equal(restricted.calls[0].url, cloudToolz + '/cases/case-access');
  assert.equal(restricted.calls[0].init.method, 'POST');
  assert.deepEqual(JSON.parse(restricted.calls[0].init.body), {CaseOrdinal: '198'});
  assert.equal(restricted.calls[0].init.headers['Content-Type'], 'application/json');
  assert.equal(restricted.calls[0].init.headers.RequestVerificationToken, 'token');
  assert.deepEqual(restricted.replaced, ['https://theme.test/UTNewTheme/Cases_NoAccess?CaseID=C202&CaseNum=198']);
  assert.equal(restricted.state, 'restricted');

  const granted = await load({access: 'Granted'});
  assert.equal(granted.calls.length, 1);
  assert.deepEqual(granted.replaced, []);
  assert.deepEqual(granted.warnings, []);
  assert.equal(granted.state, 'granted');

  const failed = await load({access: 'Restricted', status: 500});
  assert.deepEqual(failed.replaced, []);
  assert.match(failed.warnings[0], /cases\.case-access.*HTTP 500/);
  assert.equal(failed.state, 'failed');

  const unanswered = await load({});
  assert.deepEqual(unanswered.replaced, []);
  assert.match(unanswered.warnings[0], /gave no answer/);
  assert.equal(unanswered.state, 'failed');

  const aspx = await load({pathname: '/_i4u_/Core/Cases/Cases_ManageCase.aspx', access: 'Restricted'});
  assert.equal(aspx.replaced.length, 1);

  // Popups and other pages that carry a CaseID do not check.
  const popup = await load({pathname: '/Cases_EditCase', access: 'Restricted'});
  assert.equal(popup.calls.length, 0);
  assert.deepEqual(popup.replaced, []);
  assert.equal(popup.state, undefined);

  // A page carrying us-case-page checks whatever its address.
  const classed = await load({pathname: '/Cases/Manage', pageClass: true, access: 'Granted'});
  assert.equal(classed.calls.length, 1);
  assert.equal(classed.state, 'granted');

  // The case's member goes on to the no-access page as ID.
  const withMember = await load({access: 'Restricted', memberId: '12345'});
  assert.deepEqual(withMember.replaced, ['https://theme.test/UTNewTheme/Cases_NoAccess?CaseID=C202&CaseNum=198&ID=12345']);

  // Back to member reads ID from the no-access page's address.
  const noAccess = await load({pathname: '/UTNewTheme/Cases_NoAccess', search: '?CaseID=C202&CaseNum=198&ID=12345'});
  const back = noAccess.defs.get('cases.back-to-member');
  assert.equal(back.className, 'us-action-cases-back-to-member');
  assert.equal(back.presentation.label, 'Back to member');
  assert.deepEqual({from: back.context.memberId.from, parameter: back.context.memberId.parameter}, {from: 'query', parameter: 'ID'});
  assert.equal(back.context.memberId.validate('12345'), true);
  assert.equal(typeof back.context.memberId.validate('12 345'), 'string');
  assert.equal(back.action.href({context: {memberId: '12345'}}), 'https://theme.test/UTNewTheme/Party.aspx?ID=12345');
  assert.equal(noAccess.calls.length, 0);

  // Back to home opens the current website's home, not the domain's default website.
  const home = noAccess.defs.get('cases.back-to-home');
  assert.equal(home.className, 'us-action-cases-back-to-home');
  assert.equal(home.action.href({context: {}}), 'https://theme.test/UTNewTheme/');

  // The no-access page and its links follow the current website (4 November 2026).
  const otherSite = await load({access: 'Restricted', memberId: '12345', site: 'https://theme.test/UTTemplate/'});
  assert.deepEqual(otherSite.replaced, ['https://theme.test/UTTemplate/Cases_NoAccess?CaseID=C202&CaseNum=198&ID=12345']);
  assert.equal(otherSite.defs.get('cases.back-to-member').action.href({context: {memberId: '12345'}}), 'https://theme.test/UTTemplate/Party.aspx?ID=12345');
  assert.equal(otherSite.defs.get('cases.back-to-home').action.href({context: {}}), 'https://theme.test/UTTemplate/');

  // Without a website root, the paths stay at the domain root.
  const noSite = await load({access: 'Restricted', site: ''});
  assert.deepEqual(noSite.replaced, ['https://theme.test/Cases_NoAccess?CaseID=C202&CaseNum=198']);

  console.log('Case access check: 13 cases pass.');
})().catch(error => { console.error(error); process.exit(1); });
