#!/usr/bin/env node
/* Builds the streamlined Create case form into a BeyondFormz export.

   node build-form.cjs <export.json> [output.json]

   Reads a BeyondFormz export of "Create Case - Staff Form" (or a copy of
   it), keeps its form record (ids, name, folder) and every field property
   BeyondFormz stores, and replaces the field list and scripts with the
   design in ../index.html:
   - the scripts from this folder (form-inject.js, with
     ../case-create-form.candidate.css written into it; prefill.js;
     subtypes-button.js; create-button.js);
   - the fields in FIELDS below.
   Writes to output.json, or dist/Create-Case-Staff-Form.json beside this
   script. Import the output in BeyondFormz. */

'use strict';

const fs = require('fs');
const path = require('path');

const here = __dirname;
const [source, target = path.join(here, 'dist', 'Create-Case-Staff-Form.json')] = process.argv.slice(2);

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

const original = new Map(form.fields.filter(field => field.name).map(field => [field.name, field]));
const byType = new Map(form.fields.map(field => [field.type, field]));

/* A field with every property BeyondFormz stores: the original field of
   that name and type when there is one, otherwise one of the same type,
   cleared. */
function field(type, name, settings) {
  const same = original.get(name);
  const keep = same && same.type === type;
  const base = (keep && same) || byType.get(type) || original.get('CaseName');
  const cleared = keep ? {} : {
    className: null, label: null, description: null, placeholder: null, required: false,
    multiple: false, executeFlow: null, iqaPathWithParameters: null, javaScript: null,
    urlParameter: null, value: null, values: null, maxlength: null, rows: null, subtype: null
  };
  return {...base, ...cleared, type, name, ...settings};
}

const IQA = '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/';

const css = read('../case-create-form.candidate.css');
const inject = read('form-inject.js').replace("'/* US-BF-STYLES */'", JSON.stringify(css));
if (inject.indexOf('US-BF-STYLES') !== -1) {
  console.error('form-inject.js: the styles placeholder was not replaced.');
  process.exit(1);
}

/* The fields, in order. Fields sharing a row-N class sit in one row;
   col-md-N sets the width. The form's script adds the us-bf-* classes it
   needs to the field wrappers, which className cannot reach. */
const FIELDS = [
  field('autoexecute', 'autoexecute-1743469376028-0', {
    executeFlow: 'Cases/Create-Prefill',
    javaScript: read('prefill.js')
  }),

  field('header', null, {label: 'New case', subtype: 'h2', className: 'us-bf-title'}),
  field('header', null, {label: 'The case', subtype: 'h3', className: 'us-bf-section'}),

  field('text', 'CaseName', {
    label: 'Title',
    className: 'form-control row-1 col-md-12',
    placeholder: 'e.g. Bullying complaint – night shift supervisor'
  }),

  field('select', 'CaseTypes', {
    label: 'Type',
    className: 'form-control row-2 col-md-6',
    multiple: true,
    required: true,
    iqaPathWithParameters: IQA + 'Case Value List - CaseTags'
  }),
  field('select', 'CaseSubTypes', {
    label: 'Subtype',
    className: 'form-control row-2 col-md-6',
    multiple: true,
    required: false
  }),

  field('textarea', 'CaseDescription', {
    label: 'What happened?',
    className: 'form-control row-3 col-md-12',
    required: true,
    rows: 5,
    maxlength: 4000,
    placeholder: 'What the member told you, who was involved, and what they want to happen.'
  }),

  field('select', 'PrimaryWorkplaceID', {
    label: 'Workplace',
    className: 'form-control row-4 col-md-8',
    multiple: false,
    required: false,
    useCloudToolzUrlforExecuteFlow: false,
    activateAsTriggerForDependentControls: false,
    values: [{label: 'Option 1', value: 'option-1-', selected: false}]
  }),
  field('date', 'DateIncident', {
    label: 'Date of incident',
    className: 'form-control row-4 col-md-4'
  }),

  field('header', null, {label: 'Handling', subtype: 'h3', className: 'us-bf-section'}),

  field('select', 'CaseStaffMembers', {
    label: 'Lead staff member',
    className: 'form-control row-5 col-md-6',
    required: false,
    iqaPathWithParameters: IQA + 'Get Staff Members'
  }),
  field('select', 'CasePriority', {
    label: 'Priority',
    className: 'form-control row-5 col-md-6',
    required: true,
    iqaPathWithParameters: IQA + 'Case Value List - Priority'
  }),

  field('select', 'CaseAccessLevel', {
    label: 'Who can see it',
    className: 'form-control row-6 col-md-12',
    required: true,
    iqaPathWithParameters: IQA + 'Case Value List - Access Level'
  }),

  // A new case is New; the FormFields rules leave hidden fields alone.
  field('hidden', 'CaseStatus', {value: 'New'}),

  field('paragraph', null, {label: '&amp;nbsp;', subtype: 'p', className: 'Message'}),

  field('button', 'CreateCaseButton', {
    label: 'Create case',
    className: 'btn-primary btn PrimaryButton',
    executeFlow: 'Cases/Create-Case-Staff',
    labelHoldingMessage: 'Creating case…',
    javaScript: read('create-button.js')
  }),

  field('urlParameters', 'NoteOrdinal', {}),
  field('urlParameters', 'InteractionOrdinal', {}),
  field('urlParameters', 'MemberID', {}),

  field('button', 'SubTypeSession', {
    label: 'Load subtypes',
    javaScript: read('subtypes-button.js')
  }),

  field('hidden', 'CurrentDate', {}),
  field('hidden', 'Module', {}),
  field('hidden', 'Area', {}),
  field('hidden', 'Prefill', {})
];

const output = {
  ...exported,
  forms: [{
    ...form,
    javaScriptToInject: inject,
    fields: FIELDS
  }]
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output));

const removed = form.fields.map(entry => entry.name).filter(name => name && !FIELDS.some(entry => entry.name === name));
console.log('Wrote ' + target);
console.log(FIELDS.length + ' fields. Removed: ' + (removed.join(', ') || 'none') + '.');
