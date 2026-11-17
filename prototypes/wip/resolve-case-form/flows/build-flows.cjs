#!/usr/bin/env node
/* Builds the two Resolve case flows for the Resolve case form.

   node build-flows.cjs <flowz-export.json> [output.json]

   Reads a Flowz export holding the two flows (first the owner's export of
   16 November 2026; any later export of them works too) and keeps their
   definitionId and versionId, so importing the output overwrites them:

   - US Case Form Prefill: Resolve Case   POST /Cases/US/Resolve/Prefill
     Only its Success HTTP Response is changed: ReqVals as before;
     DateOpened (FirstCreatedOn) and MemberName when the case row has them;
     with Edit=true the saved values as id-val-*, blanks and zero amounts
     left empty. Without Edit it sends no values: the old answer wrote
     1970-01-01 (a blank date run through formatDate) and 0.000000000000
     into the empty form.

   - US Case Form: Resolve Case           POST /Cases/US/Resolve
     Everything inside it is replaced (owner, 17 November 2026): no email is
     sent from CloudToolz. In order:
       1. the case in iMIS (i4u_UT_Cases);
       2. the case in CloudToolz (Cases.i4u_UT_Cases);
       3. the change log (LogChangesToIMIS);
       4. when resolving, by the Cases / Resolution configuration: a row in
          the primary contact's and the staff lead's i4u_UT_AutomationTrigger,
          which an iMIS automation sends from a communication template, so
          the email is logged to the member and the case;
       5. the answer the form reads.
     The endpoint and Request Authorization are kept as exported.

   Activity IDs are derived from each activity's name, so a rebuild keeps
   them. Writes output.json, or dist/Imports/Resolve-Case-Flows.json at the
   project root, where every import file goes. Edit this script, never the
   export. */

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

// What each automation trigger row says it is for. The iMIS automation
// picks its rows (and communication template) by Type.
const TRIGGER_TYPE_CONTACT = 'Case Resolved - Primary Contact';
const TRIGGER_TYPE_STAFF = 'Case Resolved - Staff Lead';

// The Cases / Resolution configuration rows read (UnionTemplate.Configuration).
const CONFIG_ENTITY = 'DEMO';

/* ---------- Activity builders (property shapes as CloudToolz exports them) ---------- */

const none = () => ({});
const literal = value => ({Literal: value});
const javascript = value => ({JavaScript: value});

function property(name, expressions, syntax = null) {
  return {name, syntax, expressions};
}

const build = {
  sql: (script, parameters) => ['ExecuteSqlAgainstCloudToolz', [
    property('ExpectedResults', literal('Result Set')),
    property('ConnectionId', literal('default')),
    property('Script', literal(script.trim()), 'Literal'),
    property('Parameters', javascript(parameters), 'JavaScript'),
    property('Timeout', none()),
    property('StrictlySelectOnly', none())
  ]],

  insert: (dataSource, mapping) => ['InsertIntoDataSource', [
    property('NameOfDataSource', literal(dataSource)),
    property('DataMapping', javascript(mapping), 'JavaScript')
  ]],

  updateSingle: (dataSource, mapping, partyId) => ['UpdateSingleInstanceDataSource', [
    property('NameOfDataSource', literal(dataSource)),
    property('DataMapping', javascript(mapping), 'JavaScript'),
    property('PartyId', javascript(partyId), 'JavaScript')
  ]],

  when: condition => ['If', [
    property('Condition', javascript(condition.trim()), 'JavaScript')
  ]],

  script: code => ['RunJavaScript', [
    property('Script', literal(code.trim()), 'Literal'),
    property('PossibleOutcomes', none())
  ]],

  runWorkflow: (definition, input) => ['RunWorkflow', [
    property('WorkflowDefinitionId', javascript(definition), 'JavaScript'),
    property('Input', javascript(input), 'JavaScript'),
    property('PossibleOutcomes', none()),
    property('Mode', literal('FireAndForget')),
    property('TenantId', none()),
    property('CorrelationId', none()),
    property('ContextId', none()),
    property('CustomAttributes', none()),
    property('RetryFailedActivities', none())
  ]],

  respond: content => ['WriteHttpResponse', [
    property('Content', javascript(content.trim()), 'JavaScript'),
    property('ContentType', literal('application/json')),
    property('StatusCode', literal('OK')),
    property('CharSet', literal('utf-8')),
    property('ResponseHeaders', none())
  ]],

  unauthorized: () => ['WriteHttpResponse', [
    property('Content', none()),
    property('ContentType', literal('text/plain')),
    property('StatusCode', literal('Unauthorized')),
    property('CharSet', literal('utf-8')),
    property('ResponseHeaders', none())
  ]],

  finish: () => ['Finish', [
    property('ActivityOutput', none()),
    property('OutcomeNames', none())
  ]]
};

/* ---------- Flow assembly ---------- */

// A GUID that stays the same for the same flow and activity name.
function stableId(flowKey, name) {
  const hex = crypto.createHash('sha1').update(flowKey + ':' + name).digest('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), '4' + hex.slice(13, 16), '8' + hex.slice(17, 20), hex.slice(20, 32)].join('-');
}

// steps: [name, displayName, [type, properties], column, row]
// links: [from, outcome, to]
function assemble(flowKey, steps, links) {
  const ids = new Map();
  const activities = steps.map(([name, displayName, [type, properties], column, row]) => {
    const activityId = stableId(flowKey, name);
    ids.set(name, activityId);
    return {
      activityId,
      type,
      name,
      displayName,
      description: null,
      x: 40 + column * 470,
      y: 40 + row * 250,
      persistWorkflow: false,
      loadWorkflowContext: false,
      saveWorkflowContext: false,
      properties,
      propertyStorageProviders: {}
    };
  });
  const connections = links.map(([from, outcome, to]) => {
    if (!ids.has(from) || !ids.has(to)) {
      throw new Error(flowKey + ': unknown activity in link ' + from + ' → ' + to);
    }
    return {sourceActivityId: ids.get(from), targetActivityId: ids.get(to), outcome};
  });
  return {activities, connections};
}

function flowNamed(displayName) {
  const flow = exported.flowz.find(entry => entry.displayName === displayName);
  const hierarchy = exported.hierarchies.find(entry => entry.displayName === displayName);
  if (!flow || !hierarchy) {
    throw new Error('Not in the export: ' + displayName);
  }
  return {flow: JSON.parse(JSON.stringify(flow)), hierarchy: {...hierarchy, lastExecutedAt: null, latestInstanceStatus: null}};
}

// An exported activity's properties, by its type (the flow has one of each).
function exportedProperties(flow, type) {
  const found = flow.activities.find(entry => entry.type === type);
  if (!found) {
    throw new Error(flow.displayName + ' has no ' + type + ' activity');
  }
  return JSON.parse(JSON.stringify(found.properties));
}

/* ---------- Shared pieces ---------- */

// Every response the form reads: BeyondFormz writes class-html-Message into
// the form's message line; the form's script reads Success and Error.
const MESSAGE = (tone, html) => `'<div class="${tone === 'error' ? 'AsiError AsiErrorIcon' : 'AsiSuccess AsiSuccessIcon'}">' + ${html} + '</div>'`;

const sqlParameters = pairs => 'JSON.stringify([' + pairs.map(([name, value]) => `{"Name":"${name}","Value":String((${value}) ?? "")}`).join(',') + '])';
const mapping = pairs => 'JSON.stringify([' + pairs.map(([name, value]) => `{"Name":"${name}","Value":String((${value}) ?? "")}`).join(',') + '])';

// Edit=true: the form is changing a resolved case's resolution.
const EDITING = "/^(true|1|yes)$/i.test(String(activities.Endpoint.Output().Body.Edit ?? '').trim())";
const BODY = 'activities.Endpoint.Output().Body';
const ME = 'activities.Endpoint.Output().Headers.loggedinpartyid';
const CASE = 'activities.SQL_Case.ResultSet()[0]';

/* ---------- Prefill ---------- */

const prefill = flowNamed(PREFILL);
const prefillResponse = prefill.flow.activities.find(entry => entry.displayName === 'Success HTTP Response');
if (!prefillResponse) {
  throw new Error(PREFILL + ' has no Success HTTP Response');
}
prefillResponse.properties.find(entry => entry.name === 'Content').syntax = 'JavaScript';
prefillResponse.properties.find(entry => entry.name === 'Content').expressions = javascript(`// The Resolve case form's prefill (prototypes/wip/resolve-case-form).
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

/* ======================================================================
   Resolve: one save, in order. Before iMIS is written, a problem answers an
   error and nothing is saved. If iMIS saved but CloudToolz did not, the
   answer says so and the form stays open: saving again finishes it (every
   write sets the same values). A trigger row that fails is named in the
   answer; the case is still resolved.
   ====================================================================== */

const resolveExport = flowNamed(RESOLVE);

// Checked again here: the form checks before sending, but anything can
// post to the endpoint.
const VALID = `
(function () {
  var body = ${BODY};
  var text = function (value) { return String(value ?? '').trim(); };
  var number = /^(\\d+(\\.\\d+)?)?$/;
  return text(body.CaseID) !== '' &&
    /^\\d+$/.test(text(body.CaseNum)) &&
    text(body.ResolutionType) !== '' &&
    /^\\d{4}-\\d{2}-\\d{2}/.test(text(body.ResolutionDate)) &&
    number.test(text(body.ResolutionAmount)) &&
    number.test(text(body.ResolutionWeeks));
})()
`;

// The case as CloudToolz has it before the save (the change log's old
// values), who a trigger row is for, the resolution switches, and the
// entity's local time. One row, Found 0 when the case isn't there.
// The column names are the table's own (PrimaryContctID, LastUpdateOn).
const CASE_SQL = `
DECLARE @EntityCode varchar(20) = COALESCE(
  (SELECT TOP 1 OrgCode FROM [Cases].[i4u_UT_Cases] WHERE Ordinal = CAST(@CaseOrdinal AS int)),
  (SELECT TOP 1 EntityCode FROM [ZenCrm].[Individuals] WHERE ImisId = @LoggedInUser),
  (SELECT TOP 1 OrgCode FROM UnionTemplate.Entities WHERE IsDefault = 1)
);
DECLARE @LocalTimestamp datetime = COALESCE([UnionTemplate].fn_GetDateTimeWithTimeZone(@EntityCode), GETUTCDATE());

SELECT
  CASE WHEN C.Ordinal IS NULL THEN 0 ELSE 1 END AS Found,
  CONVERT(varchar(23), @LocalTimestamp, 126) AS [Timestamp],
  CAST(C.PrimaryContctID AS varchar(50)) AS PrimaryContactID,
  CAST(C.StaffLeadID AS varchar(50)) AS StaffLeadID,
  CAST(C.[Status] AS varchar(150)) AS OldStatus,
  CAST(C.ResolutionType AS nvarchar(4000)) AS OldResolutionType,
  CONVERT(varchar(10), C.ResolutionDate, 23) AS OldResolutionDate,
  CAST(C.ResolutionAmount AS varchar(50)) AS OldResolutionAmount,
  CAST(C.ResolutionWeeks AS varchar(50)) AS OldResolutionWeeks,
  CAST(C.Resolution AS nvarchar(max)) AS OldResolution,
  (SELECT TOP 1 CAST([Value] AS varchar(10))
     FROM [UnionTemplate].[Configuration]
     WHERE [Module] = 'Cases' AND [Category] = 'Resolution'
       AND [Entity] = '${CONFIG_ENTITY}' AND [Code] = 'EmailPrimaryContact') AS EmailPrimaryContact,
  (SELECT TOP 1 CAST([Value] AS varchar(10))
     FROM [UnionTemplate].[Configuration]
     WHERE [Module] = 'Cases' AND [Category] = 'Resolution'
       AND [Entity] = '${CONFIG_ENTITY}' AND [Code] = 'EmailPrimaryStaff') AS EmailPrimaryStaff
FROM (SELECT 1 AS One) AS Always
LEFT JOIN [Cases].[i4u_UT_Cases] AS C
  ON C.Ordinal = CAST(@CaseOrdinal AS int)
  AND C.CaseID = @CaseID;
`;

// Blank amounts, weeks and date save as NULL. Resolving also completes the
// case; editing changes the resolution only.
const UPDATE_SQL = `
UPDATE [Cases].[i4u_UT_Cases]
SET ResolutionType = @ResolutionType,
  ResolutionDate = CONVERT(date, NULLIF(LEFT(@ResolutionDate, 10), ''), 23),
  ResolutionAmount = NULLIF(@ResolutionAmount, ''),
  ResolutionWeeks = NULLIF(@ResolutionWeeks, ''),
  Resolution = @Resolution,
  [Status] = CASE WHEN @Resolving = '1' THEN 'Complete' ELSE [Status] END,
  LastUpdatedBy = @LoggedInUser,
  LastUpdateOn = @LocalTimestamp
WHERE Ordinal = CAST(@CaseOrdinal AS int)
  AND CaseID = @CaseID;
`;

// One change-log entry for the save: the five resolution fields, and the
// status when resolving. New and old values are written the same way
// (dates yyyy-mm-dd, amounts plain numbers, zero as blank), so only real
// changes show in the case's history.
const LOG_CONTEXT = `
var endpoint = activities.Endpoint.Output();
var body = endpoint.Body;
var before = activities.SQL_Case.ResultSet()[0];
var editing = ${EDITING};

var text = function (value) { return String(value ?? '').trim(); };
var day = function (value) { var match = text(value).match(/^(\\d{4}-\\d{2}-\\d{2})/); return match ? match[1] : ''; };
var number = function (value) { var amount = Number(text(value)); return amount ? String(Math.round(amount * 100) / 100) : ''; };

var logContext = {
    "Note": "Case " + text(body.CaseID) + (editing ? ": Resolution Edited" : ": Resolved"),
    "Table": "i4u_UT_Cases",
    "UpdateReason": "Edit",
    "workflowDefinitionId": workflowDefinitionId, // DON'T UPDATE, VARIABLE IS PROVIDED BY CLOUDTOOLZ
    "sourceOrdinal": text(body.CaseNum) // the case's ordinal
};

var now = {
    "ResolutionType": text(body.ResolutionType),
    "ResolutionDate": day(body.ResolutionDate),
    "ResolutionAmount": number(body.ResolutionAmount),
    "ResolutionWeeks": number(body.ResolutionWeeks),
    "Resolution": text(body.Resolution)
};
var old = {
    "ResolutionType": text(before.OldResolutionType),
    "ResolutionDate": day(before.OldResolutionDate),
    "ResolutionAmount": number(before.OldResolutionAmount),
    "ResolutionWeeks": number(before.OldResolutionWeeks),
    "Resolution": text(before.OldResolution)
};
if (!editing) {
    now.Status = "Complete";
    old.Status = text(before.OldStatus);
}

// Names must match the keys in logBody.
var fieldsToCompare = Object.keys(now);
var logBody = {"OldValue": JSON.stringify(old)};
fieldsToCompare.forEach(function (field) { logBody[field] = now[field]; });

setVariable('logChanges', {
    "logContext": logContext, // DON'T CHANGE
    "fieldsToCompare": fieldsToCompare, // DON'T CHANGE
    "body": logBody,
    "profileID": text(body.CaseID), // the case the change belongs to
    "updatedByID": endpoint.Headers.loggedinpartyid
});
`;

// A switch is on when its configuration Value is 1 (or true/yes), and the
// case has someone to send to.
const on = code => `/^(1|true|yes)$/i.test(String(${CASE}.${code} ?? '').trim())`;
const has = column => `String(${CASE}.${column} ?? '').trim() !== ''`;

// A row in the person's i4u_UT_AutomationTrigger. CommunicationLogKey is
// left for the automation.
const trigger = (idColumn, type) => build.insert('i4u_UT_AutomationTrigger', mapping([
  ['ID', `${CASE}.${idColumn}`],
  ['Type', `'${type}'`],
  ['Reference', `${BODY}.CaseID`],
  ['Date', `${CASE}.Timestamp`],
  ['EntryGUID', 'guid()'],
  ['CommunicationLogKey', "''"]
]));

const resolve = assemble('resolve-case', [
  ['Endpoint', 'HTTP Endpoint', ['HttpEndpoint', exportedProperties(resolveExport.flow, 'HttpEndpoint')], 0, 0],

  ['RequestAuthorization', 'Request Authorization', ['RequestAuthorization', exportedProperties(resolveExport.flow, 'RequestAuthorization')], 0, 1],

  ['Response_Unauthorized', 'Unauthorized HTTP Response', build.unauthorized(), 1, 1],

  ['IF_Valid', 'IF: Outcome Type And Date Given', build.when(VALID), 0, 2],

  ['Response_Invalid', 'HTTP Response - Missing Fields', build.respond(`
return {
  "Error": true,
  "class-html-Message": ${MESSAGE('error', "'Choose the outcome type and the closed date. Amounts and weeks are numbers. Nothing was saved.'")}
};
`), 1, 2],

  ['SQL_Case', 'SQL - Case, Settings And Timestamp', build.sql(CASE_SQL, sqlParameters([
    ['@CaseOrdinal', `${BODY}.CaseNum`],
    ['@CaseID', `${BODY}.CaseID`],
    ['@LoggedInUser', ME]
  ])), 0, 3],

  ['Response_Failed', 'HTTP Response - Not Saved', build.respond(`
return {
  "Error": true,
  "class-html-Message": ${MESSAGE('error', "'The resolution couldn’t be saved. Nothing was changed; try again, or contact an administrator if it keeps happening.'")}
};
`), 1, 3],

  ['IF_CaseFound', 'IF: Case Found', build.when(`${CASE}.Found == 1`), 0, 4],

  ['Response_NotFound', 'HTTP Response - Case Not Found', build.respond(`
return {
  "Error": true,
  "class-html-Message": ${MESSAGE('error', "'This case couldn’t be found. Nothing was saved.'")}
};
`), 1, 4],

  // 1. The case in iMIS.
  ['iMIS_Update', 'iMIS Update - i4u_UT_Cases', build.updateSingle('i4u_UT_Cases', `(function () {
  var body = ${BODY};
  var text = function (value) { return String(value ?? '').trim(); };
  var map = [
    {Name: "LastUpdatedOn", Value: String(${CASE}.Timestamp)},
    {Name: "LastUpdatedBy", Value: String(${ME})},
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
})()`, `${BODY}.CaseNum`), 0, 5],

  // 2. The case in CloudToolz.
  ['SQL_Update', 'SQL: CT Update - i4u_UT_Cases', build.sql(UPDATE_SQL, sqlParameters([
    ['@CaseOrdinal', `${BODY}.CaseNum`],
    ['@CaseID', `${BODY}.CaseID`],
    ['@ResolutionType', `String(${BODY}.ResolutionType ?? '').trim()`],
    ['@ResolutionDate', `String(${BODY}.ResolutionDate ?? '').trim()`],
    ['@ResolutionAmount', `String(${BODY}.ResolutionAmount ?? '').trim()`],
    ['@ResolutionWeeks', `String(${BODY}.ResolutionWeeks ?? '').trim()`],
    ['@Resolution', `String(${BODY}.Resolution ?? '').trim()`],
    ['@Resolving', `${EDITING} ? '0' : '1'`],
    ['@LoggedInUser', ME],
    ['@LocalTimestamp', `${CASE}.Timestamp`]
  ])), 0, 6],

  ['Response_PartlySaved', 'HTTP Response - Partly Saved', build.respond(`
return {
  "Error": true,
  "Partial": true,
  "Detail": String(activities.SQL_Update.Exception() ?? ''),
  "class-html-Message": ${MESSAGE('error', "'The resolution was saved in iMIS but not in CloudToolz. Save again to finish it; if it keeps happening, contact an administrator.'")}
};
`), 1, 6],

  // 3. The change log.
  ['JS_CreateLogContext', 'JS: Create Log Context', build.script(LOG_CONTEXT), 0, 7],

  ['LogChangesToIMIS', 'Log Changes To IMIS', build.runWorkflow(
    "getWorkflowDefinitionIdByName('LogChangesToIMIS')", "getVariable('logChanges')"), 0, 8],

  // 4. The automation triggers, only when resolving.
  ['IF_Resolving', 'IF: Resolving (Not Editing)', build.when('!' + EDITING), 0, 9],

  ['IF_TriggerContact', 'IF: Tell The Primary Contact', build.when(`${on('EmailPrimaryContact')} && ${has('PrimaryContactID')}`), 0, 10],

  ['iMIS_TriggerContact', 'iMIS Insert - i4u_UT_AutomationTrigger (Primary Contact)', trigger('PrimaryContactID', TRIGGER_TYPE_CONTACT), 1, 10],

  ['JS_ContactNotQueued', 'JS: Note The Contact Trigger Failed', build.script(`
setVariable('ContactNotQueued', true);
`), 2, 10],

  ['IF_TriggerStaff', 'IF: Tell The Staff Lead', build.when(`${on('EmailPrimaryStaff')} && ${has('StaffLeadID')}`), 0, 11],

  ['iMIS_TriggerStaff', 'iMIS Insert - i4u_UT_AutomationTrigger (Staff Lead)', trigger('StaffLeadID', TRIGGER_TYPE_STAFF), 1, 11],

  ['JS_StaffNotQueued', 'JS: Note The Staff Trigger Failed', build.script(`
setVariable('StaffNotQueued', true);
`), 2, 11],

  // 5. The answer. The case is saved either way; a trigger that failed is
  // named, so someone can send that email by hand.
  ['Response_Saved', 'Success HTTP Response', build.respond(`
var editing = ${EDITING};
var missed = [];
if (getVariable('ContactNotQueued') === true) {
  missed.push('the member');
}
if (getVariable('StaffNotQueued') === true) {
  missed.push('the lead staff member');
}

if (missed.length) {
  return {
    "Success": true,
    "Partial": true,
    "class-html-Message": ${MESSAGE('error', "'Case resolved, but the email to ' + missed.join(' and ') + ' couldn’t be queued. Contact an administrator.'")}
  };
}

return {
  "Success": true,
  "class-html-Message": ${MESSAGE('success', "(editing ? 'Resolution updated.' : 'Case resolved.')")}
};
`), 0, 12],

  ['Finish', 'Finish', build.finish(), 0, 13]
], [
  ['Endpoint', 'Done', 'RequestAuthorization'],
  ['RequestAuthorization', 'True', 'IF_Valid'],
  ['RequestAuthorization', 'False', 'Response_Unauthorized'],
  ['Response_Unauthorized', 'Done', 'Finish'],

  ['IF_Valid', 'True', 'SQL_Case'],
  ['IF_Valid', 'False', 'Response_Invalid'],
  ['Response_Invalid', 'Done', 'Finish'],

  ['SQL_Case', 'Done', 'IF_CaseFound'],
  ['SQL_Case', 'Error', 'Response_Failed'],
  ['IF_CaseFound', 'True', 'iMIS_Update'],
  ['IF_CaseFound', 'False', 'Response_NotFound'],
  ['Response_NotFound', 'Done', 'Finish'],

  ['iMIS_Update', 'True', 'SQL_Update'],
  ['iMIS_Update', 'False', 'Response_Failed'],
  ['Response_Failed', 'Done', 'Finish'],

  ['SQL_Update', 'Done', 'JS_CreateLogContext'],
  ['SQL_Update', 'Error', 'Response_PartlySaved'],
  ['Response_PartlySaved', 'Done', 'Finish'],

  ['JS_CreateLogContext', 'Done', 'LogChangesToIMIS'],
  ['LogChangesToIMIS', 'Done', 'IF_Resolving'],
  ['LogChangesToIMIS', 'Not Found', 'IF_Resolving'],

  ['IF_Resolving', 'True', 'IF_TriggerContact'],
  ['IF_Resolving', 'False', 'Response_Saved'],

  ['IF_TriggerContact', 'True', 'iMIS_TriggerContact'],
  ['IF_TriggerContact', 'False', 'IF_TriggerStaff'],
  ['iMIS_TriggerContact', 'True', 'IF_TriggerStaff'],
  ['iMIS_TriggerContact', 'False', 'JS_ContactNotQueued'],
  ['JS_ContactNotQueued', 'Done', 'IF_TriggerStaff'],

  ['IF_TriggerStaff', 'True', 'iMIS_TriggerStaff'],
  ['IF_TriggerStaff', 'False', 'Response_Saved'],
  ['iMIS_TriggerStaff', 'True', 'Response_Saved'],
  ['iMIS_TriggerStaff', 'False', 'JS_StaffNotQueued'],
  ['JS_StaffNotQueued', 'Done', 'Response_Saved'],

  ['Response_Saved', 'Done', 'Finish']
]);

resolveExport.flow.activities = resolve.activities;
resolveExport.flow.connections = resolve.connections;

/* ---------- The export ---------- */

const flows = [prefill, resolveExport];
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
