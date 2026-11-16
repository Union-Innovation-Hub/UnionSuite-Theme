#!/usr/bin/env node
/* Updates the two Resolve case flows for the rebuilt Resolve case form.

   node build-flows.cjs <flowz-export.json> [output.json]

   Reads the owner's Flowz export holding the two flows (16 November 2026),
   keeps their definitionId and versionId, so importing the output
   overwrites them, and changes only what the form needs (README, "What the
   flows need"):

   - US Case Form Prefill: Resolve Case   POST /Cases/US/Resolve/Prefill
     Success HTTP Response: ReqVals as before; DateOpened (FirstCreatedOn)
     and MemberName when the case row has them; with Edit=true the saved
     values as id-val-*, blanks and zero amounts left empty. Without Edit it
     sends no values: the old answer wrote 1970-01-01 (a blank date run
     through formatDate) and 0.000000000000 into the empty form.

   - US Case Form: Resolve Case           POST /Cases/US/Resolve
     IF_Valid (new) after the authorisation: an outcome type, a closed date
     and plain-number amounts, or Response_Invalid (new), so nothing is
     saved. The form checks the same before sending; this stands in for the
     Form/Validation step the form no longer runs.
     Update: Status "Complete" only when resolving (not Edit=true).
     IF_Resolving (new) after the history row: resolving goes on to the
     notification emails as before; editing skips them.
     Success HTTP Response: "Case resolved." or "Resolution updated."

   Everything else, the emails and their configuration included, is kept as
   exported. New activities get IDs derived from their names, so a rebuild
   keeps them. Writes output.json, or dist/Imports/Resolve-Case-Flows.json
   at the project root, where every import file goes. Edit this script, never the export. */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [source, target = path.join(__dirname, '..', '..', '..', '..', 'dist', 'Imports', 'Resolve-Case-Flows.json')] = process.argv.slice(2);

if (!source) {
  console.error('Usage: node build-flows.cjs <flowz-export.json> [output.json]');
  process.exit(1);
}

const exported = JSON.parse(fs.readFileSync(source, 'utf8'));

const PREFILL = 'US Case Form Prefill: Resolve Case';
const RESOLVE = 'US Case Form: Resolve Case';

/* ---------- Helpers ---------- */

// A dashed GUID from a name: the same name always gives the same ID.
function idFor(name) {
  const hex = crypto.createHash('sha1').update('resolve-case-form:' + name).digest('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), '4' + hex.slice(13, 16), ((parseInt(hex[16], 16) & 3) | 8).toString(16) + hex.slice(17, 20), hex.slice(20, 32)].join('-');
}

function flowNamed(displayName) {
  const flow = exported.flowz.find(entry => entry.displayName === displayName);
  const hierarchy = exported.hierarchies.find(entry => entry.displayName === displayName);
  if (!flow || !hierarchy) {
    throw new Error('Not in the export: ' + displayName);
  }
  return {flow: JSON.parse(JSON.stringify(flow)), hierarchy: {...hierarchy, lastExecutedAt: null, latestInstanceStatus: null}};
}

// An activity by its name, or by its display name when it has none.
function activity(flow, label) {
  const found = flow.activities.find(entry => entry.name === label) || flow.activities.find(entry => entry.displayName === label);
  if (!found) {
    throw new Error(flow.displayName + ' has no activity "' + label + '"');
  }
  return found;
}

function setScript(target, property, script) {
  const entry = target.properties.find(item => item.name === property);
  if (!entry) {
    throw new Error(target.displayName + ' has no property ' + property);
  }
  entry.syntax = 'JavaScript';
  entry.expressions = {JavaScript: script};
}

function add(flow, entry) {
  flow.activities.push({
    persistWorkflow: false,
    loadWorkflowContext: false,
    saveWorkflowContext: false,
    propertyStorageProviders: {},
    ...entry,
    activityId: idFor(entry.name)
  });
  return flow.activities[flow.activities.length - 1];
}

function rewire(flow, fromId, outcome, toId) {
  const link = flow.connections.find(entry => entry.sourceActivityId === fromId && entry.outcome === outcome);
  if (!link) {
    throw new Error(flow.displayName + ': no ' + outcome + ' connection to rewire');
  }
  link.targetActivityId = toId;
}

function connect(flow, fromId, outcome, toId) {
  flow.connections.push({sourceActivityId: fromId, targetActivityId: toId, outcome});
}

// JavaScript shared by the scripts below. Kept short: each property runs
// on its own.
const EDITING = "/^(true|1|yes)$/i.test(String(activities.Endpoint.Output().Body.Edit ?? '').trim())";

/* ---------- Prefill ---------- */

const prefill = flowNamed(PREFILL);

setScript(activity(prefill.flow, 'Success HTTP Response'), 'Content', `// The Resolve case form's prefill (prototypes/wip/resolve-case-form).
// Each part is read on its own: a missing column is left out.
var editing = ${EDITING};
var row = activities.CaseDetailsCurrentQ.ResultSet()[0] || {};

// A date as yyyy-mm-dd, from ISO or anything Date can read; '' otherwise.
var day = function (value) {
  var text = String(value ?? '').trim();
  var iso = text.match(/^(\\d{4}-\\d{2}-\\d{2})/);
  if (iso) {
    return iso[1];
  }
  var date = text ? new Date(text) : null;
  if (!date || isNaN(date.getTime()) || date.getFullYear() < 1900) {
    return '';
  }
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
};
// An amount or weeks as a plain number; '' for blank or zero.
var number = function (value) {
  var amount = Number(value ?? '');
  return amount ? String(Math.round(amount * 100) / 100) : '';
};
var text = function (value) {
  return String(value ?? '').trim();
};

var json = {
  "ReqVals": activities.ReqVisbleFields.ResultSet(),
  "DateOpened": day(row.FirstCreatedOn ?? row.DateOpened),
  "MemberName": text(row.PrimaryContactName ?? row.MemberName ?? row.FullName)
};

if (editing) {
  json["id-val-ResolutionType"] = text(row.ResolutionType);
  json["id-val-ResolutionDate"] = day(row.ResolutionDate);
  json["id-val-ResolutionAmount"] = number(row.ResolutionAmount);
  json["id-val-ResolutionWeeks"] = number(row.ResolutionWeeks);
  json["id-val-Resolution"] = text(row.Resolution);
}

return json;`);

/* ---------- Resolve ---------- */

const resolve = flowNamed(RESOLVE);
const flow = resolve.flow;

const auth = activity(flow, 'Request Authorization');
const emailSettings = activity(flow, 'EmailSettings');
const update = activity(flow, 'Update');
const history = activity(flow, 'Insert Into Data Source');
const emailStaff = activity(flow, 'If EmailPrimaryStaff');
const success = activity(flow, 'Success HTTP Response');
const finish = activity(flow, 'Finish');

// Checked again here: the form checks before sending, but anything can
// post to the endpoint.
const valid = add(flow, {
  type: 'If',
  name: 'IF_Valid',
  displayName: 'IF: Outcome Type And Date Given',
  x: 745,
  y: 440,
  properties: [{
    name: 'Condition',
    syntax: 'JavaScript',
    expressions: {JavaScript: `(function () {
  var body = activities.Endpoint.Output().Body;
  var text = function (value) { return String(value ?? '').trim(); };
  var number = /^(\\d+(\\.\\d+)?)?$/;
  return text(body.CaseID) !== '' &&
    text(body.ResolutionType) !== '' &&
    /^\\d{4}-\\d{2}-\\d{2}/.test(text(body.ResolutionDate)) &&
    number.test(text(body.ResolutionAmount)) &&
    number.test(text(body.ResolutionWeeks));
})()`}
  }]
});

const invalid = add(flow, {
  type: 'WriteHttpResponse',
  name: 'Response_Invalid',
  displayName: 'HTTP Response - Missing Fields',
  x: 980,
  y: 440,
  properties: [
    {name: 'Content', syntax: 'JavaScript', expressions: {JavaScript: `return {
  "Error": true,
  "class-html-Message": '<div class="AsiError AsiErrorIcon">Choose the outcome type and the closed date. Amounts and weeks are numbers. Nothing was saved.</div>'
};`}},
    {name: 'ContentType', expressions: {Literal: 'application/json'}},
    {name: 'StatusCode', expressions: {Literal: 'OK'}},
    {name: 'CharSet', expressions: {Literal: 'utf-8'}},
    {name: 'ResponseHeaders', expressions: {}}
  ]
});

rewire(flow, auth.activityId, 'True', valid.activityId);
connect(flow, valid.activityId, 'True', emailSettings.activityId);
connect(flow, valid.activityId, 'False', invalid.activityId);
connect(flow, invalid.activityId, 'Done', finish.activityId);

// Resolving closes the case; editing changes the resolution only. Blank
// amounts and weeks are sent blank, as the form sends them.
setScript(update, 'DataMapping', `(function () {
  var request = activities.Endpoint.Output();
  var body = request.Body;
  var text = function (value) { return String(value ?? '').trim(); };
  var map = [
    {Name: "LastUpdatedOn", Value: body.CurrentDate},
    {Name: "LastUpdatedBy", Value: request.Headers.loggedinpartyid},
    {Name: "ResolutionType", Value: text(body.ResolutionType)},
    {Name: "ResolutionDate", Value: text(body.ResolutionDate)},
    {Name: "ResolutionAmount", Value: text(body.ResolutionAmount)},
    {Name: "ResolutionWeeks", Value: text(body.ResolutionWeeks)},
    {Name: "Resolution", Value: text(body.Resolution)}
  ];
  if (!${EDITING}) {
    map.push({Name: "Status", Value: "Complete"});
  }
  return JSON.stringify(map);
})()`);

// After the history row: the notification emails only when resolving.
const resolving = add(flow, {
  type: 'If',
  name: 'IF_Resolving',
  displayName: 'IF: Resolving (Not Editing)',
  x: 745,
  y: 1945,
  properties: [{
    name: 'Condition',
    syntax: 'JavaScript',
    expressions: {JavaScript: '!' + EDITING}
  }]
});

rewire(flow, history.activityId, 'True', resolving.activityId);
connect(flow, resolving.activityId, 'True', emailStaff.activityId);
connect(flow, resolving.activityId, 'False', success.activityId);

setScript(success, 'Content', `var message = ${EDITING} ? 'Resolution updated.' : 'Case resolved.';
return {
  "Success": true,
  "class-html-Message": '<div class="AsiSuccess AsiSuccessIcon">' + message + '</div>'
};`);

/* ---------- The export ---------- */

const flows = [prefill, resolve];
const output = {
  ...exported,
  hierarchies: flows.map(entry => entry.hierarchy),
  flowz: flows.map(entry => entry.flow),
  schedules: []
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output, null, 2));
console.log('Wrote ' + target);
flows.forEach(entry => console.log('  ' + entry.flow.displayName + ': ' + entry.flow.activities.length + ' activities, ' + entry.hierarchy.endpointPath));
