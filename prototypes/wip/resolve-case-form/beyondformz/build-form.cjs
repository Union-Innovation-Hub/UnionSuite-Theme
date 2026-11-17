#!/usr/bin/env node
/* Builds the Resolve case form into a BeyondFormz export.

   node build-form.cjs <export.json> [output.json]

   Reads a BeyondFormz export of "UnionSuite Cases: Resolution" (or a copy of
   it), keeps its form record (ids, name, folder) and every field property
   BeyondFormz stores, and replaces the field list and scripts with the
   design in ../resolve-case-form.html (owner, 16 November 2026):
   - the scripts from this folder (form-inject.js, prefill.js,
     resolve-button.js);
   - the fields in FIELDS below.
   Writes to output.json, or dist/Imports/Resolve-Case-Form.json at the
   project root, where every import file goes. Import the output in
   BeyondFormz. */

'use strict';

const fs = require('fs');
const path = require('path');

const here = __dirname;
const [source, target = path.join(__dirname, '..', '..', '..', '..', 'dist', 'Imports', 'Resolve-Case-Form.json')] = process.argv.slice(2);

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
   that name and type when there is one, otherwise one of the same type (or
   the Resolution textarea), cleared. */
function field(type, name, settings) {
  const same = original.get(name);
  const keep = same && same.type === type;
  const base = (keep && same) || byType.get(type) || original.get('Resolution');
  const cleared = keep ? {} : {
    className: null, label: null, description: null, placeholder: null, required: false,
    multiple: false, executeFlow: null, iqaPathWithParameters: null, javaScript: null,
    urlParameter: null, value: null, values: null, maxlength: null, rows: null, subtype: null
  };
  return {...base, ...cleared, type, name, ...settings};
}

// The original autoexecute field keeps its name, so BeyondFormz keeps it.
const prefillField = form.fields.find(entry => entry.type === 'autoexecute');

/* The fields, in order. Fields sharing a row-N class sit in one row;
   col-md-N sets the width. The form's script draws the case line, the
   open-tasks warning, the quick dates, the $ and weeks marks and the footer
   (us-bf-* classes, styled by the theme's US-BEYOND-FORMS). */
const FIELDS = [
  field('imisClientContext', form.fields.find(entry => entry.type === 'imisClientContext')?.name || 'imisClientContext-0', {}),

  // From the theme's Resolve case and Edit resolution actions:
  // /Cases_ResolveCase?CaseID=C49&CaseNum=48[&Edit=true][&OpenTasks=2].
  field('urlParameters', 'CaseID', {urlParameter: 'CaseID'}),
  field('urlParameters', 'CaseNum', {urlParameter: 'CaseNum'}),
  field('urlParameters', 'Edit', {urlParameter: 'Edit'}),
  field('urlParameters', 'OpenTasks', {urlParameter: 'OpenTasks'}),

  field('autoexecute', prefillField ? prefillField.name : 'autoexecute-resolution-prefill', {
    executeFlow: 'Cases/US/Resolve/Prefill',
    javaScript: read('prefill.js')
  }),

  // The status the case closes with (owner, 17 November 2026). The prefill
  // sends the closed statuses and the script fills this list: with several
  // it shows, required; with one or none it stays hidden and sends that one,
  // or Complete. Complete is here so a form whose prefill never answers
  // still sends what the flow did before.
  field('select', 'Status', {
    label: 'Status',
    className: 'form-control row-1 col-md-6',
    values: [{label: 'Complete', value: 'Complete', selected: true}]
  }),

  field('select', 'ResolutionType', {
    label: 'Outcome type',
    className: 'form-control row-2 col-md-6',
    required: true,
    iqaPathWithParameters: '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Outcome Type'
  }),
  field('date', 'ResolutionDate', {
    label: 'Closed date',
    className: 'form-control row-2 col-md-6',
    subtype: 'date',
    required: true
  }),

  // Text, not number: a number field shows the decimal column's
  // 0.000000000000 and refuses "$4,250". The script cleans them before
  // sending; blank means nothing awarded.
  field('text', 'ResolutionAmount', {
    label: 'Amount awarded',
    className: 'form-control row-3 col-md-6',
    subtype: 'text'
  }),
  field('text', 'ResolutionWeeks', {
    label: 'Time awarded',
    className: 'form-control row-3 col-md-6',
    subtype: 'text'
  }),

  field('textarea', 'Resolution', {
    label: 'Outcome',
    className: 'form-control row-4 col-md-12',
    subtype: 'textarea',
    rows: 4,
    placeholder: 'What happened, in a few sentences'
  }),

  field('paragraph', null, {label: '&amp;nbsp;', subtype: 'p', className: 'Message'}),

  field('button', 'ResolveButton', {
    label: 'Resolve case',
    className: 'btn-primary btn PrimaryButton',
    style: 'primary',
    subtype: 'button',
    executeFlow: 'Cases/US/Resolve',
    labelHoldingMessage: 'Saving…',
    useCloudToolzUrlforExecuteFlow: true,
    imisRequestAuthorization: true,
    clearForm: false,
    javaScript: read('resolve-button.js')
  }),

  field('hidden', 'CurrentDate', {}),
  field('hidden', 'Module', {value: 'Cases'}),
  field('hidden', 'Area', {value: 'Resolution'})
];

const output = {
  ...exported,
  forms: [{
    ...form,
    javaScriptToInject: read('form-inject.js'),
    fields: FIELDS
  }]
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output));

const removed = form.fields.map(entry => entry.name).filter(name => name && !FIELDS.some(entry => entry.name === name));
console.log('Wrote ' + target);
console.log(FIELDS.length + ' fields. Removed: ' + (removed.join(', ') || 'none') + '.');
