// Tests the IQA where-used extraction, index and lookup
// (Theme/UnionSuite/Scripts/IQA-WhereUsed.js) against fixtures shaped like
// the dev tenant probe results (prototypes/wip/iqa-where-used/README.md).
// Run from the project root: node tools/test-where-used.cjs
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const core = require('../Theme/UnionSuite/Scripts/IQA-WhereUsed.js');

const TARGET = { path: '$/_i4u_/SandBox/ContactRecords', documentKey: '75068202-0191-4ef3-bf87-66c58cc99744', versionKey: '18a19f51-065b-4e42-bbc8-209da92feda1' };
const OTHER = { path: '$/_i4u_/SandBox/Other Query', documentKey: '11111111-2222-3333-4444-555555555555', versionKey: '66666666-7777-8888-9999-000000000000' };

// Collects what an extractor emits, as [identifier, isKey, property, owner, ownerType].
function collect(run) {
  const found = [];
  run((identifier, isKey, property, owner, ownerType) => found.push([identifier, isKey, property, owner, ownerType]));
  return found;
}

// .NET BinaryFormatter strings: a 7-bit length prefix then UTF-8 bytes.
function nrbfString(text) {
  const bytes = Buffer.from(text, 'utf8');
  const prefix = bytes.length < 128 ? [bytes.length] : [(bytes.length & 0x7f) | 0x80, bytes.length >> 7];
  return Buffer.concat([Buffer.from(prefix), bytes]);
}

const contentPage = '<Content xmlns:a="x" xmlns:b="y" xmlns:i="z"><a:ContentItems>' +
  '<a:ContentItem i:type="b:QueryMenu"><a:ContentItemName>New QueryMenuCommon</a:ContentItemName>' +
  '<b:SourceKey>' + TARGET.documentKey + '</b:SourceKey>' +
  '<b:SourceFolderPathControl>' + TARGET.path + '</b:SourceFolderPathControl></a:ContentItem>' +
  '<a:ContentItem i:type="b:QueryMenu"><a:ContentItemName>Folder menu</a:ContentItemName>' +
  '<b:SourceFolderPathControl>$/_i4u_/SandBox</b:SourceFolderPathControl></a:ContentItem>' +
  '<a:ContentItem i:type="b:ContentHtml"><a:ContentItemName>Tracker</a:ContentItemName>' +
  '<b:Html>&lt;div data-us-iqa="$/_i4u_/SandBox/Other Query"&gt;&lt;a href="/api/query?QueryName=%24%2F_i4u_%2FSandBox%2FContactRecords"&gt;x&lt;/a&gt;&lt;/div&gt;</b:Html>' +
  '</a:ContentItem></a:ContentItems></Content>';

test('content pages: paths, keys, Content HTML and the owning iPart', () => {
  const found = collect(emit => core.xmlReferences(contentPage, emit, { contentItems: true }));
  assert.deepEqual(found.find(ref => ref[0] === TARGET.documentKey), [TARGET.documentKey, true, 'SourceKey', 'New QueryMenuCommon', 'QueryMenu']);
  assert.deepEqual(found.find(ref => ref[0] === TARGET.path.toLowerCase() && ref[2] === 'SourceFolderPathControl'),
    [TARGET.path.toLowerCase(), false, 'SourceFolderPathControl', 'New QueryMenuCommon', 'QueryMenu']);
  assert.ok(found.some(ref => ref[0] === '$/_i4u_/sandbox' && ref[3] === 'Folder menu'), 'folder reference');
  assert.ok(found.some(ref => ref[0] === OTHER.path.toLowerCase() && ref[3] === 'Tracker'), 'quoted path in Content HTML');
  assert.ok(found.some(ref => ref[0] === TARGET.path.toLowerCase() && ref[2] === 'Html'), 'URL-encoded path in Content HTML');
});

test('business objects: value-list keys named by their property', () => {
  const xml = '<xs:schema><xs:element name="ResignReason" msprop:ValueListQuery="' + TARGET.versionKey + '" type="xs:string" /></xs:schema>';
  const found = collect(emit => core.xmlReferences(xml, emit));
  assert.deepEqual(found, [[TARGET.versionKey, true, '@msprop:ValueListQuery', 'ResignReason', '']]);
});

test('communication templates: generic items report their parent; own path skipped', () => {
  const xml = '<Communication><Path>$/Common/Communications/Templates/Welcome</Path><FolderPath>$/Common/Communications/Templates</FolderPath>' +
    '<Queries><string>' + TARGET.path + '</string></Queries></Communication>';
  const found = collect(emit => core.xmlReferences(xml, emit, { skipElements: ['Path', 'FolderPath'] }));
  assert.deepEqual(found.map(ref => [ref[0], ref[2]]), [[TARGET.path.toLowerCase(), 'Queries/string']]);
});

test('tasks and panel sources: JSON key paths', () => {
  const task = {
    TaskDefinitionId: 'task-1',
    DataSources: { $values: [{ Query: { Criteria: { $values: [{ Values: { $values: [TARGET.versionKey] } }] } } }] },
    Actions: { $values: [{ QueryDocumentID: OTHER.versionKey }] }
  };
  const found = collect(emit => core.jsonReferences(task, emit));
  assert.deepEqual(found.map(ref => [ref[0], ref[2]]), [
    [TARGET.versionKey, 'DataSources.Query.Criteria.Values'],
    [OTHER.versionKey, 'Actions.QueryDocumentID']
  ]);
  const rule = { $type: 'PropertyRuleQueryData', Query: { EntityTypeName: 'IQA', Criteria: { $values: [{ Values: { $values: [TARGET.path] } }] } } };
  const fromRule = collect(emit => core.jsonReferences(rule, emit, 'Rule', 'ResignReason'));
  assert.deepEqual(fromRule, [[TARGET.path.toLowerCase(), false, 'Rule.Query.Criteria.Values', 'ResignReason', '']]);
});

test('IQA definitions: length-prefixed paths and keys inside longer strings', () => {
  const blob = Buffer.concat([
    Buffer.from([0, 1, 0, 0, 0, 0xff, 0xff, 0xff, 0xff]),
    nrbfString(OTHER.path),
    nrbfString('source:' + TARGET.documentKey + '.SR4'),
    nrbfString('a'.repeat(200))
  ]).toString('latin1');
  const found = collect(emit => core.nrbfReferences(blob, emit));
  assert.ok(found.some(ref => ref[0] === OTHER.path.toLowerCase() && !ref[1]), 'whole path');
  assert.ok(found.some(ref => ref[0] === TARGET.documentKey && ref[1]), 'key inside a longer string');
});

test('IQA definitions: a path inside the display template (agreement banner)', () => {
  const details = '$/_i4u_/Core/CA/v2/API - Manage Agreement - Banner Details';
  const template = '<header class="us-banner__surface"><div class="us-banner__details" data-us-facts-query="' + details +
    '" data-us-facts-filter="AgreementNum"></div><h1>{#query.Name}</h1></header>' + 'x'.repeat(300);
  const blob = Buffer.concat([
    Buffer.from([0, 1, 0, 0, 0, 0xff, 0xff, 0xff, 0xff]),
    nrbfString('Query Template - Manage Agreement - Banner'),
    nrbfString(template)
  ]).toString('latin1');
  const found = collect(emit => core.nrbfReferences(blob, emit));
  assert.deepEqual(found.filter(ref => ref[0] === details.toLowerCase()).map(ref => ref[2]), ['Template']);

  const index = core.createIndex();
  const banner = index.item({ s: 'IQD', n: 'Query Template - Manage Agreement - Banner', p: '$/_i4u_/Core/CA/v2/Query Template - Manage Agreement - Banner', k: 'b1' }, ['b1']);
  found.forEach(([identifier, isKey, property]) => index.ref(banner, identifier, isKey, property, '', ''));
  const groups = core.lookup(index.finish({ sources: {} }), { path: details, documentKey: 'd1', versionKey: 'v1' });
  assert.deepEqual(groups.find(group => group.source.id === 'IQD').results.map(result => [result.item.n, result.how]),
    [['Query Template - Manage Agreement - Banner', 'Its display template uses this query']]);
});

test('theme scripts: named by section marker or action key; shorthand skipped', () => {
  const source = "/* US-COMMS-LOG:START — x */\nconst a = '$/_i4u_/Core/CA/v2/API - Agreement Email Logs';\n" +
    "define('home.add-task', { href: '$/_i4u_/Core/Home/Tasks' });\n// $/…/Contact_Page/Alerts\nconst b = \"$/…/Contact_Page/Alerts\";";
  const found = collect(emit => core.scriptReferences(source, emit));
  assert.deepEqual(found.map(ref => [ref[0], ref[3]]), [
    ['$/_i4u_/core/ca/v2/api - agreement email logs', 'US-COMMS-LOG'],
    ['$/_i4u_/core/home/tasks', 'home.add-task']
  ]);
});

test('index: keys kept only for IQAs; items without references dropped', () => {
  const index = core.createIndex();
  index.iqa(TARGET.path, TARGET.documentKey, TARGET.versionKey);
  const page = index.item({ s: 'CON', n: 'List Of Contacts', p: '@/i4u_Sandbox/Training/List-Of-Contacts', k: 'page-key' });
  index.ref(page, TARGET.documentKey, true, 'SourceKey', 'Menu', 'QueryMenu');
  index.ref(page, 'aaaaaaaa-0000-0000-0000-000000000000', true, 'ContentKey', 'Menu', 'QueryMenu');
  const empty = index.item({ s: 'CON', n: 'Nothing', p: '@/x' });
  index.ref(empty, 'bbbbbbbb-0000-0000-0000-000000000000', true, 'ContentKey', '', '');
  const finished = index.finish({ builtAt: '2026-10-12T00:00:00.000Z', durationMs: 1, sources: {} });
  assert.equal(finished.format, core.FORMAT);
  assert.equal(finished.items.length, 1);
  assert.deepEqual(finished.refs, [[0, TARGET.documentKey, 'SourceKey', 'Menu', 'QueryMenu']]);
});

test('lookup: direct, by key, by folder, and never the IQA itself', () => {
  const index = core.createIndex();
  index.iqa(TARGET.path, TARGET.documentKey, TARGET.versionKey);
  index.iqa(OTHER.path, OTHER.documentKey, OTHER.versionKey);
  const page = index.item({ s: 'CON', n: 'List Of Contacts', p: '@/i4u_Sandbox/Training/List-Of-Contacts', k: 'p1' });
  index.ref(page, TARGET.path.toLowerCase(), false, 'SourceFolderPathControl', 'Menu', 'QueryMenu');
  index.ref(page, TARGET.documentKey, true, 'SourceKey', 'Menu', 'QueryMenu');
  const folderPage = index.item({ s: 'CON', n: 'Sandbox About Me Tab', p: '@/i4u_Sandbox/1About', k: 'p2' });
  index.ref(folderPage, '$/_i4u_/sandbox', false, 'SourceFolderPathControl', 'Folder menu', 'QueryMenu');
  // A grandparent folder does not list the IQA.
  const grandparent = index.item({ s: 'CON', n: 'Too broad', p: '@/x', k: 'p3' });
  index.ref(grandparent, '$/_i4u_', false, 'SourceFolderPathControl', 'Broad', 'QueryMenu');
  const wrapper = index.item({ s: 'IQD', n: 'Copy_of_contacts_-_base', p: '$/_i4u_/SandBox/branching/Copy_of_contacts_-_base', k: 'w1' }, ['w1']);
  index.ref(wrapper, TARGET.documentKey, true, 'Query', '', '');
  const itself = index.item({ s: 'IQD', n: 'ContactRecords', p: TARGET.path, k: TARGET.versionKey });
  index.ref(itself, TARGET.path.toLowerCase(), false, 'Query', '', '');
  const task = index.item({ s: 'TASK', n: 'Nightly', k: 't1', y: true });
  index.ref(task, TARGET.versionKey, true, 'DataSources.Query.Criteria.Values', '', '');

  const groups = core.lookup(index.finish({ sources: {} }), TARGET);
  const of = id => groups.find(group => group.source.id === id).results;
  assert.deepEqual(of('CON').map(result => [result.item.n, result.viaFolder, result.how]), [
    ['List Of Contacts', false, 'Query Menu "Menu" uses this query'],
    ['Sandbox About Me Tab', true, 'Query Menu "Folder menu" lists the queries in this folder']
  ]);
  assert.deepEqual(of('IQD').map(result => [result.item.n, result.how]), [['Copy_of_contacts_-_base', 'Uses this query as a source']]);
  assert.deepEqual(of('TASK').map(result => [result.item.n, result.item.y, result.how]), [['Nightly', 1, 'Reads this query as a data source']]);
  assert.equal(of('BOD').length, 0);
});

test('embedded paths and system folders', () => {
  assert.deepEqual(core.embeddedPaths('<a data-x="$/A/B"> ?QueryName=$/C/D&x=1 %24%2FE%2FF G'), ['$/a/b', '$/c/d', '$/e/f']);
  assert.equal(core.isSystemPath('@/iCore/Fundraising/Find_gifts'), true);
  assert.equal(core.isSystemPath('$/Samples/Dashboards/x'), true);
  assert.equal(core.isSystemPath('$/_i4u_/Core/x'), false);
  assert.equal(core.parentFolder('$/_i4u_/SandBox/ContactRecords'), '$/_i4u_/sandbox');
});
