// Tests the UnionSuite forms runtime's pure core and the task form's
// definition (Theme/UnionSuite/Forms/UnionSuiteForms.js and TaskForm.js):
// context, visibility, validation, the payload sent to CloudToolz and the
// popup close results. The drawing is checked in the browser
// (prototypes/wip/task-form/task-form-preview.html).
// Run from the project root: node --test tools/test-popup-forms.cjs
'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const forms = require('../Theme/UnionSuite/Forms/UnionSuiteForms.js');
const task = require('../Theme/UnionSuite/Forms/TaskForm.js');

const client = {loggedInPartyId: '104002', isAnonymous: false};
const context = (module, search = '', dataset = {}) =>
  forms.readContext({search, dataset: {'us-form': 'task', module, ...dataset}, client});

const agreementAdd = () => context('agreement', '?Type=task&ID=104002&ModuleID=A107&ModuleOrdinal=123');
const caseEdit = () => context('case', '?ModuleID=C217&ModuleOrdinal=412&Ordinal=9874');
const personal = () => context('personal', '?Type=task&ID=104002');

test('the context comes from the placeholder, the address and iMIS', () => {
  const add = agreementAdd();
  assert.equal(add.form, 'task');
  assert.equal(add.module, 'agreement');
  assert.equal(add.userId, '104002');
  assert.equal(add.moduleId, 'A107');
  assert.equal(add.moduleOrdinal, '123');
  assert.equal(add.mode, 'add');
  assert.equal(caseEdit().mode, 'edit');
  assert.equal(caseEdit().ordinal, '9874');
  // Address names are matched without regard to case.
  assert.equal(context('case', '?moduleid=C1&moduleordinal=4&ordinal=7').ordinal, '7');
  // Every other data-* attribute is a page setting, camel-cased.
  assert.equal(context('agreement', '', {'tags-module': '', assign: 'record'}).options.assign, 'record');
  assert.equal(context('agreement', '', {'tags-module': ''}).options.tagsModule, '');
});

test('the form refuses a page it cannot work on', () => {
  assert.equal(forms.checkContext(task, agreementAdd()), null);
  assert.equal(forms.checkContext(task, personal()), null);
  assert.match(forms.checkContext(task, context('agreement', '?ModuleID=A107')), /ModuleID and ModuleOrdinal/);
  assert.match(forms.checkContext(task, context('contact', '')), /data-module/);
  assert.match(forms.checkContext(task, context('case', '?ModuleID=C1&ModuleOrdinal=4&Ordinal=x')), /not a number/);
  const anonymous = forms.readContext({dataset: {module: 'personal'}, client: {loggedInPartyId: '1', isAnonymous: true}});
  assert.match(forms.checkContext(task, anonymous), /Sign in/);
});

test('fields follow the module and the mode', () => {
  const names = ctx => forms.valueFields(task, ctx).map(field => field.name);
  assert.ok(!names(personal()).includes('AssignTo'), 'personal tasks have no Assign to');
  assert.ok(names(agreementAdd()).includes('AssignTo'));
  assert.ok(!names(agreementAdd()).includes('Completed'), 'Completed is edit only');
  assert.ok(names(caseEdit()).includes('Completed'));
  // The flag, details and time travel with their fields.
  assert.deepEqual(names(agreementAdd()).slice(0, 5), ['Title', 'HighPriority', 'Details', 'DueDate', 'DueTime']);
});

test('a new case or agreement task starts assigned to the signed-in user', () => {
  assert.deepEqual(forms.emptyValues(task, agreementAdd()).AssignTo, [{id: '104002', label: 'Me'}]);
  assert.equal(forms.emptyValues(task, personal()).AssignTo, undefined);
});

test('the task line is required', () => {
  const values = forms.emptyValues(task, agreementAdd());
  assert.deepEqual(forms.validate(task, agreementAdd(), values), [{name: 'Title', message: 'Say what needs doing before saving.'}]);
  values.Title = '   ';
  assert.equal(forms.validate(task, agreementAdd(), values).length, 1);
  values.Title = 'Send the log of claims';
  assert.deepEqual(forms.validate(task, agreementAdd(), values), []);
});

test('the payload: record fields, then each field by name', () => {
  const ctx = agreementAdd();
  const values = {
    ...forms.emptyValues(task, ctx),
    Title: '  Send the log of claims ',
    HighPriority: true,
    DueDate: '2026-10-24',
    DueTime: '14:30',
    AssignTo: [{id: '104133', label: 'Morgan Lee'}],
    Tags: [{id: '5', label: 'Bargaining'}],
    Subtags: [{id: '52', label: 'Offer response', parent: '5'}]
  };
  assert.deepEqual(forms.buildPayload(task, ctx, values), {
    Type: 'task', ID: '104002', Module: 'agreement', ModuleID: 'A107', ModuleOrdinal: '123', Ordinal: null,
    Title: 'Send the log of claims', HighPriority: true, Details: '',
    DueDate: '2026-10-24', DueTime: '14:30',
    AssignTo: {ID: '104133', Name: 'Morgan Lee'},
    Tags: [{TagOrdinal: '5', TagName: 'Bargaining'}],
    Subtags: [{TagOrdinal: '5', SubtagOrdinal: '52', SubtagName: 'Offer response'}]
  });
});

test('payload rules: unassigned, no date, personal, edit', () => {
  const ctx = agreementAdd();
  const values = {...forms.emptyValues(task, ctx), Title: 'A', AssignTo: [], DueTime: '09:00'};
  const payload = forms.buildPayload(task, ctx, values);
  assert.equal(payload.AssignTo, null, 'an emptied Assign to is unassigned');
  assert.equal(payload.DueDate, null);
  assert.equal(payload.DueTime, null, 'a time means nothing without its date');
  assert.ok(!('Completed' in payload), 'adding sends no Completed');

  const me = forms.buildPayload(task, ctx, {...forms.emptyValues(task, ctx), Title: 'A'});
  assert.deepEqual(me.AssignTo, {ID: '104002', Name: ''}, 'the "Me" default sends the ID only');

  const own = forms.buildPayload(task, personal(), {...forms.emptyValues(task, personal()), Title: 'A'});
  assert.deepEqual(own.AssignTo, {ID: '104002', Name: ''}, 'personal tasks are always the signed-in user\'s');
  assert.equal(own.ModuleID, null);
  assert.equal(own.ModuleOrdinal, null);

  const edit = forms.buildPayload(task, caseEdit(), {...forms.emptyValues(task, caseEdit()), Title: 'A', Completed: true});
  assert.equal(edit.Ordinal, '9874');
  assert.equal(edit.Completed, true);
});

test('the popup close results', () => {
  assert.deepEqual(forms.savedResult(9901), {saved: true, Ordinal: 9901});
  assert.deepEqual(forms.savedResult(null), {saved: true});
  // After "save and add another", every task saved in the batch.
  assert.deepEqual(forms.savedResult(9903, [9901, 9902]), {saved: true, Ordinals: [9901, 9902, 9903]});
  assert.deepEqual(forms.cancelResult([]), {cancel: true});
  assert.deepEqual(forms.cancelResult([9901, 9902]), {saved: true, Ordinals: [9901, 9902]});
});

test('IQA rows become options, by the source\'s columns', () => {
  const rows = [
    {Ordinal: '52', TagName: 'Offer response', ParentTagOrdinal: '5'},
    {Ordinal: 51, TagName: ' Log of claims ', ParentTagOrdinal: 5},
    {Ordinal: '52', TagName: 'Duplicate'},
    {Ordinal: '', TagName: 'No id'}
  ];
  assert.deepEqual(forms.rowsToOptions(rows, {value: 'Ordinal', label: 'TagName', parent: 'ParentTagOrdinal'}), [
    {id: '52', label: 'Offer response', parent: '5'},
    {id: '51', label: 'Log of claims', parent: '5'}
  ]);
  // Older endpoints' Name/Value property lists read the same.
  const legacy = {Properties: {$values: [{Name: 'ID', Value: '104118'}, {Name: 'Name', Value: {$value: 'Sam Carter'}}]}};
  assert.deepEqual(forms.rowsToOptions([legacy], {value: 'ID', label: 'Name'}), [{id: '104118', label: 'Sam Carter'}]);
});

test('values read from an IQA row', () => {
  assert.equal(forms.dateOnly('2026-10-22T00:00:00'), '2026-10-22');
  assert.equal(forms.dateOnly('0001-01-01T00:00:00'), '', 'the iMIS empty date is blank');
  assert.equal(forms.timeOnly('14:30:00'), '14:30');
  assert.equal(forms.timeOnly('2026-10-22T09:15:00'), '09:15');
  assert.equal(forms.timeOnly(''), '');
  assert.deepEqual(forms.idList('5, 6'), ['5', '6']);
  assert.deepEqual(forms.idList('"5","6"'), ['5', '6']);
  assert.deepEqual(forms.idList(''), []);
  assert.equal(forms.truthy('1'), true);
  assert.equal(forms.truthy('False'), false);
});

test('the task form names its form file and leaves its IQAs for the owner', () => {
  assert.equal(forms.FORM_FILES.task, 'TaskForm.js');
  assert.equal(task.type, 'task');
  // Placeholders until the owner builds them (20 October 2026); a filled
  // one must be a whole $/ path, so where used can find it.
  Object.values(task.config.queries).forEach(path => assert.ok(path === '' || /^\$\//.test(path), path));
  assert.ok(task.config.endpoint === '' || task.config.endpoint.startsWith('/'));
});

test('the subtag filter is the chosen tags, quoted', () => {
  const subtags = task.fields.find(field => field.name === 'Subtags');
  const source = subtags.source(agreementAdd());
  assert.deepEqual(source.params(agreementAdd(), {Tags: [{id: '5'}, {id: '7'}]}), {ParentTag: '"5","7"'});
});

test('the assign list follows the module and the agreement setting', () => {
  const assign = task.fields.find(field => field.name === 'AssignTo');
  const queries = task.config.queries;
  assert.equal(assign.source(context('case', '?ModuleID=C1&ModuleOrdinal=4')).query, queries.caseStaff);
  assert.deepEqual(assign.source(context('case', '?ModuleID=C1&ModuleOrdinal=4')).params(), {ModuleOrdinal: '4'});
  assert.equal(assign.source(agreementAdd()).query, queries.allStaff);
  assert.equal(assign.source(agreementAdd()).params, null);
  const own = context('agreement', '?ModuleID=A1&ModuleOrdinal=9', {assign: 'record'});
  assert.equal(assign.source(own).query, queries.agreementStaff);
});
