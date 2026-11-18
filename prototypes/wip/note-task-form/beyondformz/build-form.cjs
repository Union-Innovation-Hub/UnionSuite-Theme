#!/usr/bin/env node
/* Builds the case note and task form into a BeyondFormz export.

   node build-form.cjs <export.json> [output.json]

   Reads a BeyondFormz export of "UnionSuite Cases: Note" (owner, 18 November
   2026), keeps its form record (ids, name, folder) and replaces everything
   inside it with the design in ../index.html (the approved mock-up):
   - the scripts from this folder (form-inject.js, prefill.js,
     save-button.js);
   - the fields in FIELDS below.
   Writes to output.json, or dist/Imports/Case-Note-Form.json at the project
   root, where every import file goes. Import the output in BeyondFormz. */

'use strict';

const fs = require('fs');
const path = require('path');

const here = __dirname;
const [source, target = path.join(here, '..', '..', '..', '..', 'dist', 'Imports', 'Case-Note-Form.json')] = process.argv.slice(2);

if (!source) {
  console.error('Usage: node build-form.cjs <export.json> [output.json]');
  process.exit(1);
}

const read = file => fs.readFileSync(path.join(here, file), 'utf8');

const exported = JSON.parse(fs.readFileSync(source, 'utf8'));
const form = exported.forms && exported.forms[0];
if (!form || !Array.isArray(form.fields)) {
  console.error('Not a BeyondFormz export: ' + source);
  process.exit(1);
}

// The flows' paths: each must match its flow's endpoint exactly.
const SAVE_FLOW = 'cases/US/note';
const PREFILL_FLOW = 'cases/US/note/Prefill';

// The case's value lists. Note Tags is new (owner, 18 November 2026): a case
// copy of the note tags, shaped like Case Value List - CaseTags.
const IQA = '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/';

/* Every property BeyondFormz stores on a field, as it exports them. A field
   is this, with its own settings over it. */
const BASE = {
  id: 0,
  form: null,
  created: '0001-01-01T00:00:00',
  updated: '0001-01-01T00:00:00',
  lastAccessed: '0001-01-01T00:00:00',
  type: null,
  access: false,
  className: null,
  inline: false,
  toggle: false,
  description: null,
  label: null,
  multiple: false,
  name: null,
  other: false,
  requireValidOption: false,
  required: false,
  style: null,
  executeFlow: null,
  httpMethod: 'post',
  statusFlow: null,
  pollingIntervalInSeconds: 5,
  labelHoldingMessage: 'Please wait...',
  useCloudToolzUrlforExecuteFlow: false,
  placeholder: null,
  subtype: null,
  maxlength: null,
  rows: null,
  urlParameter: null,
  imisRequestAuthorization: false,
  outlookPluginAuthorization: false,
  iqaPathWithParameters: null,
  javaScript: null,
  javaScriptToExecuteAfterStatusFlowFinished: null,
  value: null,
  step: 0,
  min: 0,
  max: 0,
  activateAsTriggerForDependentControls: null,
  values: null
};

const field = (type, name, settings = {}) => ({...BASE, type, name, ...settings});

// An IQA or flow list starts with BeyondFormz's placeholder options, which
// it replaces when the list loads.
const PLACEHOLDER_OPTIONS = [{label: 'Option 1', value: 'option-1-', selected: true}];

/* The fields, in order. Fields sharing a row-N class sit in one row;
   col-md-N sets the width. The form's script draws the rest (the record
   line with Note | Task, the flag, Add details, the due time and quick
   dates, Completed, the attachments, Access as buttons, the footer) and
   adds the us-bf-* classes the theme styles (US-BEYOND-FORMS). */
const FIELDS = [
  field('imisClientContext', 'imisClientContext'),

  // From the theme's Add note, Add task and Edit actions:
  // /Cases_Note?CaseID=C217&CaseNum=214[&Type=task][&Ordinal=9874].
  field('urlParameters', 'CaseID', {urlParameter: 'CaseID'}),
  field('urlParameters', 'CaseNum', {urlParameter: 'CaseNum'}),
  field('urlParameters', 'Ordinal', {urlParameter: 'Ordinal'}),
  field('urlParameters', 'Type', {urlParameter: 'Type'}),

  field('autoexecute', 'autoexecute-Prefill', {
    executeFlow: PREFILL_FLOW,
    pollingIntervalInSeconds: 10,
    useCloudToolzUrlforExecuteFlow: true,
    imisRequestAuthorization: true,
    javaScript: read('prefill.js')
  }),

  // Note | Task, set by the form's script: 1 makes the note a task.
  field('hidden', 'FollowupRequired', {value: '0'}),

  field('text', 'Title', {
    label: 'What needs doing?',
    className: 'form-control row-1 col-md-12',
    subtype: 'text',
    maxlength: 400,
    placeholder: 'e.g. Send the revised log of claims to HR'
  }),
  field('hidden', 'HighPriority', {value: '0'}),

  // A note's text, or a task's details: the one Note column.
  field('textarea', 'Note', {
    label: 'Note',
    className: 'form-control row-2 col-md-12',
    subtype: 'textarea',
    rows: 4,
    maxlength: 4000,
    placeholder: 'What happened, what was said or agreed…'
  }),

  // Due date, and the time the script adds; sent together as Deadline.
  field('date', 'DueDate', {
    label: 'Due date',
    className: 'form-control row-3 col-md-6',
    subtype: 'date'
  }),
  field('select', 'PrimaryStaffLead', {
    label: 'Assign to',
    className: 'form-control row-3 col-md-6',
    executeFlow: 'flow/sharepoint/AssignStaff?CaseID={{CaseID}}',
    useCloudToolzUrlforExecuteFlow: true,
    activateAsTriggerForDependentControls: true,
    values: PLACEHOLDER_OPTIONS
  }),
  field('hidden', 'Deadline'),
  field('hidden', 'PrimaryStaffLeadName'),

  field('select', 'Tags', {
    label: 'Tags',
    className: 'form-control row-4 col-md-6',
    multiple: true,
    iqaPathWithParameters: IQA + 'Case Value List - Note Tags',
    activateAsTriggerForDependentControls: false,
    values: PLACEHOLDER_OPTIONS
  }),
  // Filled by the script from the note subtags IQA, by the chosen tags.
  field('select', 'Subtags', {
    label: 'Subtags',
    className: 'form-control row-4 col-md-6',
    multiple: true,
    values: []
  }),
  // For the flow: every tag the form offered (it only adds or removes
  // those) and their names (for the change log).
  field('hidden', 'NoteTagOptions'),
  field('hidden', 'TagLabels'),

  // Editing a task: Completed (drawn by the script) and what was done.
  field('hidden', 'Actioned', {value: '0'}),
  field('textarea', 'ActionedNotes', {
    label: 'What was done',
    className: 'form-control row-5 col-md-12',
    subtype: 'textarea',
    rows: 3,
    maxlength: 4000,
    placeholder: 'What you did, and anything the next person should know…'
  }),

  // The new attachments, as JSON [{UploadName, Uuid, TagOrdinals}]: the
  // script uploads each file as it is added and keeps this up to date.
  field('hidden', 'Files'),
  // The attachment tags each file can take, for the script (hidden; nothing
  // is chosen in it, so nothing is sent): the old note form's tag list flow.
  field('select', 'FileTagChoices', {
    label: 'Attachment tags',
    className: 'form-control row-7 col-md-12',
    multiple: true,
    executeFlow: 'flow/sharepoint/seetags',
    useCloudToolzUrlforExecuteFlow: true,
    activateAsTriggerForDependentControls: false,
    values: PLACEHOLDER_OPTIONS
  }),

  field('select', 'Access', {
    label: 'Access',
    className: 'form-control row-6 col-md-12',
    iqaPathWithParameters: IQA + 'Case Value List - Access Level',
    activateAsTriggerForDependentControls: false,
    values: PLACEHOLDER_OPTIONS
  }),

  field('paragraph', null, {label: '&amp;nbsp;', subtype: 'p', className: 'Message'}),

  field('button', 'SaveButton', {
    label: 'Save note',
    className: 'btn-primary btn PrimaryButton',
    style: 'primary',
    subtype: 'button',
    executeFlow: SAVE_FLOW,
    pollingIntervalInSeconds: 10,
    labelHoldingMessage: 'Saving…',
    useCloudToolzUrlforExecuteFlow: true,
    useCloudToolzUrlforStatusFlow: false,
    imisRequestAuthorization: true,
    clearForm: false,
    javaScript: read('save-button.js')
  }),

  field('hidden', 'CurrentDate')
];

const output = {
  ...exported,
  forms: [{
    ...form,
    description: 'Add or edit a note or task on a case, with attachments (UnionSuite; prototypes/wip/note-task-form).',
    javaScriptToInject: read('form-inject.js'),
    fields: FIELDS
  }]
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output));

const removed = form.fields.map(entry => entry.name).filter(name => name && !FIELDS.some(entry => entry.name === name));
console.log('Wrote ' + target);
console.log(FIELDS.length + ' fields. Removed: ' + (removed.join(', ') || 'none') + '.');
