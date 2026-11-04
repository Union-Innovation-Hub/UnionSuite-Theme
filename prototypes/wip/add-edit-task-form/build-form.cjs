#!/usr/bin/env node
/* Builds the Add Edit Task BeyondFormz form for import: takes a BeyondFormz
   export that holds the form and sets its Submit button's JavaScript from
   submit-button.js. Everything else in the export is left as it is.

   Usage: node prototypes/wip/add-edit-task-form/build-form.cjs <export.json>
   Writes dist/Add-Edit-Task-Form.json beside this script. */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const FORM_ID = 'dfc64b28-cb88-4331-93e3-56adbf3612a8';
const BUTTON = 'AddEditTask';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node build-form.cjs <BeyondFormz export.json>');
  process.exit(1);
}

const exported = JSON.parse(fs.readFileSync(input, 'utf8'));
const forms = (exported.forms || []).filter(form => form.formId === FORM_ID && !form.isFolder);
if (forms.length !== 1) {
  throw new Error('Expected the Add Edit Task form (' + FORM_ID + ') once in the export; found ' + forms.length + '.');
}
const buttons = forms[0].fields.filter(field => field.type === 'button' && field.name === BUTTON);
if (buttons.length !== 1) {
  throw new Error('Expected one ' + BUTTON + ' button on the form; found ' + buttons.length + '.');
}
if (buttons[0].executeFlow !== 'Interaction/AddEditTask') {
  throw new Error('The ' + BUTTON + ' button no longer runs Interaction/AddEditTask; check the script still fits.');
}

buttons[0].javaScript = fs.readFileSync(path.join(__dirname, 'submit-button.js'), 'utf8');

const out = path.join(__dirname, 'dist', 'Add-Edit-Task-Form.json');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, JSON.stringify(exported));
console.log('Wrote ' + path.relative(process.cwd(), out));
