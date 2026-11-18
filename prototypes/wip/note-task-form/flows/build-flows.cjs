#!/usr/bin/env node
/* Builds the case note flows into one Flowz export.

   node build-flows.cjs <flowz-export.json> [<flowz-export.json>…] [--out=output.json]

   The exports are the owner's (18 November 2026): the two flows copied from
   the Create case form's, and the copy of CA: Access Restricted Note. Each
   flow found in them is built; their definitionId and versionId are kept,
   so importing the output overwrites them; everything inside is replaced:

   - US Case Form Prefill: Note           POST /cases/US/note/Prefill (the form's autoexecute)
   - US Case Form: Note                   POST /cases/US/note (the form's Save)
   - Cases: Quick Access Restricted Note  POST /cases/quick/note-access (Show note on a
                                          restricted note, in the case page's quick view)

   Each path matches its caller exactly, case and all. The three share the
   access rules (ACCESS_RULES).

   Writes to --out, or dist/Imports/Case-Note-Flows.json at the project
   root. Activity IDs are derived from each activity's name, so a
   rebuild keeps them. Edit this script, never the export. */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const sources = args.filter(arg => !arg.startsWith('--out='));
const target = (args.find(arg => arg.startsWith('--out=')) || '').slice(6) ||
  path.join(__dirname, '..', '..', '..', '..', 'dist', 'Imports', 'Case-Note-Flows.json');

if (!sources.length) {
  console.error('Usage: node build-flows.cjs <flowz-export.json> [<flowz-export.json>…] [--out=output.json]');
  process.exit(1);
}

// Every export's flows, as one.
const inputs = sources.map(source => JSON.parse(fs.readFileSync(source, 'utf8')));
const exported = {
  ...inputs[0],
  hierarchies: inputs.flatMap(entry => entry.hierarchies || []),
  flowz: inputs.flatMap(entry => entry.flowz || [])
};

const PREFILL_PATH = '/cases/US/note/Prefill';
const NOTE_ACCESS_PATH = '/cases/quick/note-access';
const SAVE_PATH = '/cases/US/note';

// The case's details (PrimaryContactName), as Resolve case's prefill reads.
const CASE_DETAILS_IQA = '$/_i4u_/Core/Cases/Get Case Details';
// The case and its primary contact's record, as Quick Add Attachment reads
// them for the Zidebar upload.
const UPLOAD_CASE_IQA = '$/_i4u_/Core/Zidebar/Drag and Drop Fileuploader/CaseID';
const UPLOAD_CONTACT_IQA = '$/_i4u_/Core/Zidebar/Drag and Drop Fileuploader/BranchAndIdOfContactRecord';
// The tag the drag and drop flow adds to every case file (Cases).
const CASE_FILE_TAG = '3';

/* ---------- Activity builders (property shapes as CloudToolz exports them) ---------- */

const none = () => ({});
const literal = value => ({Literal: value});
const javascript = value => ({JavaScript: value});

function property(name, expressions, syntax = null) {
  return {name, syntax, expressions};
}

const build = {
  endpoint: (pathValue, validateImis = true) => ['HttpEndpoint', [
    property('Path', literal(pathValue)),
    property('Methods', {Json: '["POST"]'}),
    property('ReadContent', literal('true')),
    property('TargetType', none()),
    property('Schema', literal(''), 'Literal'),
    property('ValidateCallerUrl', none()),
    property('ValidateImisRequest', validateImis ? literal('true') : none()),
    property('ImisRequestVerificationRole', none()),
    property('Authorize', none()),
    property('Policy', none()),
    property('AuthorizeWithCustomHeader', none()),
    property('CustomHeaderName', none()),
    property('CustomHeaderValue', none()),
    property('ValidateOutlookPluginToken', none()),
    property('RequiredOutlookPluginUsername', none()),
    property('OutlookPluginMailboxEmail', none())
  ]],

  sql: (script, parameters) => ['ExecuteSqlAgainstCloudToolz', [
    property('ExpectedResults', literal('Result Set')),
    property('ConnectionId', literal('default')),
    property('Script', literal(script.trim()), 'Literal'),
    property('Parameters', javascript(parameters.trim()), 'JavaScript'),
    property('Timeout', none()),
    property('StrictlySelectOnly', none())
  ]],

  iqa: (iqaPath, parameters, limit) => ['IntelligentQueryArchitectData', [
    property('IqaPath', literal(iqaPath)),
    property('Parameters', javascript(parameters.trim()), 'JavaScript'),
    property('Offset', none()),
    property('Limit', literal(String(limit))),
    property('CollectionName', none())
  ]],

  insert: (dataSource, mapping) => ['InsertIntoDataSource', [
    property('NameOfDataSource', literal(dataSource)),
    property('DataMapping', javascript(mapping.trim()), 'JavaScript')
  ]],

  // As Complete Task updates a note: a list of rows keyed by Ordinal.
  bulk: (dataSource, operation, collection) => ['BulkDataSourceOperation', [
    property('DataSource', literal(dataSource)),
    property('DataSourceOperation', literal(operation)),
    property('CollectionToProcess', javascript(collection.trim()), 'JavaScript'),
    property('KeyField', none()),
    property('SwitchOnStopwatch', none()),
    property('MaxDegreeOfParallelism', none()),
    property('DataSourceType', literal(''))
  ]],

  authorize: () => ['RequestAuthorization', [
    property('Role', none()),
    property('HttpRequest', javascript('activities.EndpointData.Output()'), 'JavaScript')
  ]],

  fault: () => ['Fault', [
    property('Message', none())
  ]],

  respondText: (content, status) => ['WriteHttpResponse', [
    property('Content', literal(content)),
    property('ContentType', literal('text/plain')),
    property('StatusCode', literal(status)),
    property('CharSet', literal('utf-8')),
    property('ResponseHeaders', none())
  ]],

  when: condition => ['If', [
    property('Condition', javascript(condition.trim()), 'JavaScript')
  ]],

  script: code => ['RunJavaScript', [
    property('Script', literal(code.trim()), 'Literal'),
    property('PossibleOutcomes', none())
  ]],

  forEach: items => ['ForEach', [
    property('Items', javascript(items.trim()), 'JavaScript')
  ]],

  runWorkflow: (definition, input, mode, outcomes) => ['RunWorkflow', [
    property('WorkflowDefinitionId', javascript(definition), 'JavaScript'),
    property('Input', javascript(input), 'JavaScript'),
    property('PossibleOutcomes', outcomes ? {Json: JSON.stringify(outcomes)} : none()),
    property('Mode', literal(mode)),
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
    if (ids.has(name)) {
      throw new Error(flowKey + ': two activities named ' + name);
    }
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

/* ---------- Shared pieces ---------- */

// BeyondFormz writes class-html-Message into the form's message line; the
// form's script reads the rest.
const MESSAGE = (tone, html) => `'<div class="${tone === 'error' ? 'AsiError AsiErrorIcon' : 'AsiSuccess AsiSuccessIcon'}">' + ${html} + '</div>'`;

// Small helpers every script below starts with.
const HELPERS = `
var text = function (value) { return String(value ?? '').trim(); };
var on = function (value) { return /^(1|true|yes|on)$/i.test(text(value)); };
var list = function (value) {
  return text(value) === '' ? [] : text(value).split(',').map(function (item) { return item.trim(); }).filter(Boolean);
};
`;

// The form's values, prepared by JS_Prepare (kept as JSON text: a list kept
// in a variable comes back as a .NET list; Create case, 29 October 2026).
const ENTRY = `var entry = JSON.parse(getVariable('EntryJson'));`;
const ROW = `var row = JSON.parse(getVariable('RowJson'));`;

// Who can open the case and the note (owner, 18 November 2026): the case
// as the case page decides it, the note by its own Access. The IQAs are
// the ones US Cases: Case Access Check reads, in their folder since the
// 5 November move (dev tenant, 19 November 2026: the Layouts v2 paths
// answer "not found").
const CASE_STAFF_IQA = '$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - Access Check - Case Staff';
const USER_ROLES_IQA = '$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - User Roles';
const ADMIN_ROLES = ['sysadmin', 'manager'];
const CASE_TEAM_ROLE = 'case team';

/* Reads IQA_CaseStaff and IQA_UserRoles; gives access.caseGranted(level)
   and access.noteGranted(level). A note needs both: the flows check the
   case first, then the note (owner, 18 November 2026). */
const ACCESS_RULES = `
var access = (function () {
  var read = function (fn) { try { return fn(); } catch (error) { return null; } };
  // A .NET list has Count, a JavaScript array has length.
  var size = function (rows) { return rows ? (rows.length !== undefined ? rows.length : rows.Count) : 0; };
  var lower = function (value) { return String(value ?? '').trim().toLowerCase(); };
  var staff = read(function () { return activities.IQA_CaseStaff.ResultSet(); });
  var roles = read(function () { return activities.IQA_UserRoles.ResultSet(); });
  // Currently assigned to the case.
  var onCase = size(staff) > 0 && lower(staff[0].Access) === 'granted';
  var admin = false;
  var caseTeam = false;
  for (var i = 0; i < size(roles); i++) {
    var role = lower(roles[i].Role);
    if (${JSON.stringify(ADMIN_ROLES)}.indexOf(role) >= 0) {
      admin = true;
    }
    if (role === ${JSON.stringify(CASE_TEAM_ROLE)}) {
      caseTeam = true;
    }
  }
  return {
    // As US Cases: Case Access Check decides: sysadmin and manager always;
    // the case's staff; then by the case's Access: Open, or Team and
    // Individual for the case team role. Anything else: no.
    caseGranted: function (level) {
      level = lower(level);
      return admin || onCase || level === 'open' ||
        ((level === 'team' || level === 'individual') && caseTeam);
    },
    // The note's own Access (owner, 18 November 2026): sysadmin and manager
    // always; Open, anyone who can open the case; Team, the case team role;
    // Individual, staff currently assigned to the case. Anything else: no.
    noteGranted: function (level) {
      level = lower(level);
      return admin || level === 'open' ||
        (level === 'team' && caseTeam) ||
        (level === 'individual' && onCase);
    }
  };
})();
`;

/* ======================================================================
   Prefill: what the form needs before it shows.
   Answers {ReqVals, CaseNum, MemberName}, and when editing {Note, NoteTags,
   Files}. Error: the case or the note can't be opened by this user. A part
   that can't be read is left out, so the form still opens.
   ====================================================================== */

const prefill = assemble('case-note-prefill', [
  ['EndpointData', 'HTTP Endpoint', build.endpoint(PREFILL_PATH), 0, 0],

  // A site without the FormFields table gets no rules rather than an error.
  ['SQL_FormFields', 'SQL - Form field rules', build.sql(`
-- The FormFields rules for this form: which fields show and can be changed.
-- Without the UnionTemplate.FormFields table (not on every site yet) the
-- answer is no rules, and the form shows as designed.
IF OBJECT_ID(N'UnionTemplate.FormFields', N'U') IS NOT NULL
  SELECT IsRequired, Visible, FieldName, Editable
  FROM UnionTemplate.FormFields
  WHERE Module = 'Cases'
    AND Area = 'Note';
ELSE
  SELECT
    CAST(NULL AS bit) AS IsRequired,
    CAST(NULL AS bit) AS Visible,
    CAST(NULL AS varchar(100)) AS FieldName,
    CAST(NULL AS bit) AS Editable
  WHERE 1 = 0;
`, 'JSON.stringify([])'), 0, 1],

  ['SQL_Note', 'SQL - The Case And The Note', build.sql(`
-- The case (by CaseNum, or by CaseID when the theme's link gave only that),
-- whether the signed-in user's entities include it (as the quick add and
-- update flows check), and when editing, the note on that case with its
-- note tags (i4u_UT_Tags rows whose ModuleOrdinal is the note). One row.
DECLARE @CaseOrd int = COALESCE(
  TRY_CAST(NULLIF(@CaseNum, '') AS int),
  (SELECT TOP 1 Ordinal FROM [Cases].[i4u_UT_Cases] WHERE CaseID = @CaseID)
);
DECLARE @NoteOrd int = TRY_CAST(NULLIF(@Ordinal, '') AS int);
DECLARE @Allowed bit = CASE WHEN EXISTS (
  SELECT 1
  FROM [Cases].[i4u_UT_Cases] C
  INNER JOIN UnionTemplate.EntityAccess A
    ON C.OrgCode = A.EntityCode
  WHERE C.Ordinal = @CaseOrd
    AND C.CaseID = @CaseID
    AND A.StaffimisID = @LoggedInUser
) THEN 1 ELSE 0 END;

SELECT
  @CaseOrd AS CaseNum,
  @Allowed AS Allowed,
  (SELECT TOP 1 Access FROM [Cases].[i4u_UT_Cases] WHERE Ordinal = @CaseOrd) AS CaseAccess,
  N.Ordinal,
  N.FollowUpRequired,
  N.Title,
  N.Note,
  N.ActionedNotes,
  CONVERT(varchar(19), N.Deadline, 126) AS Deadline,
  N.PrimaryStaffLead,
  N.HighPriority,
  N.Actioned,
  N.Access,
  CONVERT(varchar(19), N.FirstCreatedOn, 126) AS CreatedOn,
  (SELECT STRING_AGG(CAST(T.TagOrdinal AS varchar(20)), ',')
   FROM [Cases].[i4u_UT_Tags] T
   WHERE T.ModuleOrdinal = N.Ordinal) AS NoteTags
FROM (SELECT 1 AS One) AS One
LEFT JOIN [ZideBar].[Zen_CloudFiles_Notes] N
  ON @Allowed = 1
  AND N.Ordinal = @NoteOrd
  AND N.CaseOrdinal = @CaseOrd;
`, `
JSON.stringify([
  {Name: "@CaseNum", Value: String(activities.EndpointData.Output().Body.CaseNum ?? "")},
  {Name: "@CaseID", Value: String(activities.EndpointData.Output().Body.CaseID ?? "")},
  {Name: "@Ordinal", Value: String(activities.EndpointData.Output().Body.Ordinal ?? "")},
  {Name: "@LoggedInUser", Value: String(activities.EndpointData.Output().Headers.loggedinpartyid ?? "")}
])
`), 0, 2],

  // The member's name for the record line.
  ['IQA_Case', 'IQA: Case Details', build.iqa(CASE_DETAILS_IQA,
    `'&parameter=' + activities.EndpointData.Output().Body.CaseID`, 1), 1, 2],

  // Whether the user is on the case's staff, and their roles: the access
  // rules' inputs. The case is the one SQL_Note found (never blank: asked
  // with a blank case, the IQA would answer for another case).
  ['IQA_CaseStaff', 'IQA: User Assigned To The Case', build.iqa(CASE_STAFF_IQA, `
'&parameter=' + (String(activities.SQL_Note.ResultSet()[0].CaseNum ?? '') || '0') +
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 1), 2, 2],
  ['IQA_UserRoles', 'IQA: The User\'s Roles', build.iqa(USER_ROLES_IQA, `
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 30), 2, 3],

  ['IF_Editing', 'IF: Editing A Note On The Case', build.when(`
(function () {
  try {
    var note = activities.SQL_Note.ResultSet()[0];
    return !!(note && note.Ordinal);
  } catch (error) {
    return false;
  }
})()
`), 0, 3],

  // The note's attachments, with their tags (not the system ones). Only
  // where the storage table links files to notes (NoteOrdinal); otherwise
  // none are listed.
  ['SQL_Files', 'SQL - The Note\'s Attachments', build.sql(`
IF COL_LENGTH('ZideBar.Zen_CloudFiles_Storage', 'NoteOrdinal') IS NOT NULL
  EXEC sp_executesql N'
    SELECT
      F.Ordinal,
      F.FileName,
      ISNULL((SELECT STRING_AGG(T.TagName, '', '') WITHIN GROUP (ORDER BY T.TagName)
              FROM [ZideBar].[Zen_CloudFiles_Tags] FT
              INNER JOIN [ZideBar].[Zen_Tags] T ON T.Ordinal = FT.TagOrdinal
              WHERE FT.ZCFS_Ordinal = F.Ordinal
                AND T.Ordinal > 11), '''') AS Tags
    FROM [ZideBar].[Zen_CloudFiles_Storage] F
    WHERE F.NoteOrdinal = @NoteOrd
    ORDER BY F.FileName',
    N'@NoteOrd int',
    @NoteOrd = @NoteOrdinal;
ELSE
  SELECT
    CAST(NULL AS int) AS Ordinal,
    CAST(NULL AS varchar(400)) AS FileName,
    CAST(NULL AS varchar(4000)) AS Tags
  WHERE 1 = 0;
`, `
JSON.stringify([
  {Name: "@NoteOrdinal", Value: String(activities.SQL_Note.ResultSet()[0].Ordinal ?? "")}
])
`), 1, 3],

  ['Response', 'HTTP Response', build.respond(`
// Each part is read on its own: one that did not run or failed is left out.
var body = activities.EndpointData.Output().Body;
var read = function (fn) { try { return fn(); } catch (error) { return null; } };
${HELPERS}
var rules = read(function () { return activities.SQL_FormFields.ResultSet(); }) || [];
var row = read(function () { return activities.SQL_Note.ResultSet()[0]; }) || {};
var details = read(function () { return activities.IQA_Case.ResultSet()[0]; }) || {};
var files = read(function () { return activities.SQL_Files.ResultSet(); }) || [];

var answer = {
  ReqVals: rules,
  CaseNum: text(row.CaseNum),
  MemberName: text(details.PrimaryContactName ?? details.MemberName ?? details.FullName)
};

if (!on(row.Allowed)) {
  answer.Error = "This case couldn't be opened: it may not exist, or you don't have access to it.";
  return answer;
}
${ACCESS_RULES}
if (!access.caseGranted(row.CaseAccess)) {
  answer.Error = "You don't have access to this case.";
  return answer;
}

if (text(body.Ordinal) !== '') {
  if (!row.Ordinal) {
    answer.Error = "This note couldn't be opened. It may have been deleted, or be on another case.";
    return answer;
  }
  // A restricted note's text stays on the server.
  if (!access.noteGranted(row.Access)) {
    answer.Error = 'This note is restricted (' + text(row.Access) + "), and you don't have access to it.";
    return answer;
  }
  answer.Note = {
    Ordinal: text(row.Ordinal),
    FollowupRequired: on(row.FollowUpRequired),
    Title: text(row.Title),
    Note: String(row.Note ?? ''),
    ActionedNotes: String(row.ActionedNotes ?? ''),
    Deadline: text(row.Deadline),
    PrimaryStaffLead: text(row.PrimaryStaffLead),
    HighPriority: on(row.HighPriority),
    Actioned: on(row.Actioned),
    Access: text(row.Access) || 'Open',
    CreatedOn: text(row.CreatedOn)
  };
  answer.NoteTags = text(row.NoteTags);
  answer.Files = files.map(function (file) { return {FileName: text(file.FileName), Tags: text(file.Tags)}; });
}
return answer;
`), 0, 4]
], [
  ['EndpointData', 'Done', 'SQL_FormFields'],
  ['SQL_FormFields', 'Done', 'SQL_Note'],
  ['SQL_FormFields', 'Error', 'SQL_Note'],
  ['SQL_Note', 'Done', 'IQA_Case'],
  ['SQL_Note', 'Error', 'IQA_Case'],
  ['IQA_Case', 'True', 'IQA_CaseStaff'],
  ['IQA_Case', 'False', 'IQA_CaseStaff'],
  ['IQA_CaseStaff', 'True', 'IQA_UserRoles'],
  ['IQA_CaseStaff', 'False', 'IQA_UserRoles'],
  ['IQA_UserRoles', 'True', 'IF_Editing'],
  ['IQA_UserRoles', 'False', 'IF_Editing'],
  ['IF_Editing', 'True', 'SQL_Files'],
  ['IF_Editing', 'False', 'Response'],
  ['SQL_Files', 'Done', 'Response'],
  ['SQL_Files', 'Error', 'Response']
]);

/* ======================================================================
   Save: one note or task, added or edited. In order:
   1. JS_Prepare reads the form; IF_Valid refuses what's missing.
   2. SQL_Check: the case, the user's access, the note on it (editing), the
      note's tags as they are, and the entity's local time. JS_Values works
      out the row; a saved task stays a task. IF_Allowed refuses otherwise.
   3. The case's primary contact (for the tags and the uploads).
   4. The note: iMIS first, then CloudToolz (insert, or update by Ordinal).
   5. Its tags in i4u_UT_Tags (ModuleOrdinal: the note): new ones added,
      dropped ones removed (only tags the form offered).
   6. Each new attachment through the Zidebar upload, with its own tags.
   7. LogChangesToIMIS: an Add with what was set, an Edit with what changed.
   ====================================================================== */

const NOTE_COLUMNS = `
  {Name: "@Ordinal", Value: String(getVariable('NoteOrdinal') ?? "")},
  {Name: "@CaseOrdinal", Value: entry.caseNum},
  {Name: "@Title", Value: row.Title},
  {Name: "@Note", Value: row.Note},
  {Name: "@ActionedNotes", Value: row.ActionedNotes},
  {Name: "@Category", Value: row.Category},
  {Name: "@Access", Value: row.Access},
  {Name: "@CrmID", Value: String(getVariable('CrmID') ?? "")},
  {Name: "@FollowUp", Value: row.FollowupRequired ? "1" : "0"},
  {Name: "@Deadline", Value: row.Deadline},
  {Name: "@StaffLead", Value: row.PrimaryStaffLead},
  {Name: "@HighPriority", Value: row.HighPriority ? "1" : "0"},
  {Name: "@Actioned", Value: row.Actioned ? "1" : "0"},
  {Name: "@TaskStatus", Value: row.TaskStatus},
  {Name: "@LoggedInUser", Value: entry.me},
  {Name: "@LocalTimestamp", Value: String(getVariable('Timestamp') ?? "")}`;

const save = assemble('case-note-save', [
  ['EndpointData', 'HTTP Endpoint', build.endpoint(SAVE_PATH), 0, 0],

  ['JS_Prepare', 'JS: Read And Check The Form', build.script(`
// The form checks these too; this is the safety net. BeyondFormz sends
// every value as text; a multi-select as one comma-joined value.
var endpoint = activities.EndpointData.Output();
var body = endpoint.Body;
${HELPERS}
var json = function (value, fallback) {
  try { return JSON.parse(text(value) || 'null') ?? fallback; } catch (error) { return fallback; }
};

var task = on(body.FollowupRequired);
var entry = {
  caseId: text(body.CaseID),
  caseNum: text(body.CaseNum),
  ordinal: text(body.Ordinal),
  task: task,
  // A note carries no task fields.
  title: task ? text(body.Title) : '',
  note: String(body.Note ?? '').trim(),
  actionedNotes: task ? String(body.ActionedNotes ?? '').trim() : '',
  deadline: task ? text(body.Deadline) : '',
  staff: task ? text(body.PrimaryStaffLead) : '',
  staffName: task ? text(body.PrimaryStaffLeadName) : '',
  highPriority: task && on(body.HighPriority),
  actioned: task && on(body.Actioned),
  access: text(body.Access) || 'Open',
  tags: list(body['Tags[]']).concat(list(body['Subtags[]'])),
  known: list(body.NoteTagOptions),
  me: text(endpoint.Headers.loggedinpartyid)
};

// The new attachments, uploaded by the form: [{UploadName, Uuid, TagOrdinals}].
var files = json(body.Files, []);
files = (Array.isArray(files) ? files : []).filter(function (file) {
  return file && text(file.Uuid) !== '' && text(file.UploadName) !== '';
}).map(function (file) {
  return {UploadName: text(file.UploadName), Uuid: text(file.Uuid), TagOrdinals: text(file.TagOrdinals)};
});

var problems = [];
if (entry.caseId === '' || !/^\\d+$/.test(entry.caseNum)) {
  problems.push('The case is missing: open this from the case.');
}
if (entry.ordinal !== '' && !/^\\d+$/.test(entry.ordinal)) {
  problems.push("This note couldn't be found.");
}
if (task && entry.title === '') {
  problems.push('Say what needs doing.');
}
if (!task && entry.note === '') {
  problems.push('Write the note.');
}
if (entry.deadline !== '' && !/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}(:\\d{2})?$/.test(entry.deadline)) {
  problems.push("The due date isn't a date.");
}
if (['Open', 'Team', 'Individual'].indexOf(entry.access) === -1) {
  problems.push('Choose who can see it.');
}

setVariable('EntryJson', JSON.stringify(entry));
setVariable('FilesJson', JSON.stringify(files));
setVariable('TagLabelsJson', JSON.stringify(json(body.TagLabels, {})));
setVariable('ProblemsJson', JSON.stringify(problems));
setVariable('TagProblemsJson', '[]');
setVariable('FileProblemsJson', '[]');
setVariable('ContactJson', '{}');
setVariable('NoteOrdinal', entry.ordinal);
`), 0, 1],

  ['IF_Valid', 'IF: Nothing Missing', build.when(`
JSON.parse(getVariable('ProblemsJson')).length === 0
`), 0, 2],

  ['Response_Invalid', 'HTTP Response - Missing Fields', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "JSON.parse(getVariable('ProblemsJson')).join(' ')")}
};
`), 1, 2],

  ['SQL_Check', 'SQL - Case, Note And Timestamp', build.sql(`
-- The case exists and the signed-in user's entities include it (as the quick
-- add and update flows check); when editing, the note is on this case. Then
-- the entity's local time, the user's CRM ID (CrmID, as Quick Add Note
-- writes it), and the note as it is now: the log's old values, and its tags
-- among those the form offered.
DECLARE @CaseOrd int = TRY_CAST(@CaseNum AS int);
DECLARE @NoteOrd int = TRY_CAST(NULLIF(@Ordinal, '') AS int);
DECLARE @EntityCode varchar(20) = COALESCE(
  (SELECT TOP 1 OrgCode FROM [Cases].[i4u_UT_Cases] WHERE Ordinal = @CaseOrd),
  (SELECT TOP 1 EntityCode FROM [ZenCrm].[Individuals] WHERE ImisId = @LoggedInUser),
  (SELECT TOP 1 OrgCode FROM UnionTemplate.Entities WHERE IsDefault = 1)
);
DECLARE @LocalTimestamp datetime = COALESCE([UnionTemplate].fn_GetDateTimeWithTimeZone(@EntityCode), GETUTCDATE());
DECLARE @Message varchar(4000) = '';

IF NOT EXISTS (SELECT 1 FROM [Cases].[i4u_UT_Cases] WHERE CaseID = @CaseID AND Ordinal = @CaseOrd)
  SET @Message += 'This case couldn''t be found. ';
ELSE IF NOT EXISTS (
  SELECT 1
  FROM [Cases].[i4u_UT_Cases] C
  INNER JOIN UnionTemplate.EntityAccess A
    ON C.OrgCode = A.EntityCode
  WHERE C.CaseID = @CaseID
    AND C.Ordinal = @CaseOrd
    AND A.StaffimisID = @LoggedInUser
)
  SET @Message += 'You don''t have access to this case. ';

IF @NoteOrd IS NOT NULL AND NOT EXISTS (
  SELECT 1 FROM [ZideBar].[Zen_CloudFiles_Notes] WHERE Ordinal = @NoteOrd AND CaseOrdinal = @CaseOrd
)
  SET @Message += 'This note isn''t on the case. ';

SELECT
  CASE WHEN @Message = '' THEN 1 ELSE 0 END AS Valid,
  @Message AS [Message],
  CONVERT(varchar(23), @LocalTimestamp, 126) AS [Timestamp],
  (SELECT TOP 1 ID FROM [ZenCRM].[Individuals] WHERE ImisId = @LoggedInUser) AS CrmID,
  (SELECT TOP 1 Access FROM [Cases].[i4u_UT_Cases] WHERE Ordinal = @CaseOrd) AS CaseAccess,
  N.FollowUpRequired AS OldFollowUp,
  N.Title AS OldTitle,
  N.Note AS OldNote,
  N.ActionedNotes AS OldActionedNotes,
  CONVERT(varchar(19), N.Deadline, 126) AS OldDeadline,
  N.PrimaryStaffLead AS OldStaffLead,
  N.HighPriority AS OldHighPriority,
  N.Actioned AS OldActioned,
  N.Access AS OldAccess,
  N.Category AS OldCategory,
  N.TaskStatus AS OldTaskStatus,
  (SELECT STRING_AGG(CAST(T.TagOrdinal AS varchar(20)), ',')
   FROM [Cases].[i4u_UT_Tags] T
   WHERE T.ModuleOrdinal = @NoteOrd
     AND CAST(T.TagOrdinal AS varchar(20)) IN (
       SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@KnownTags, ',') WHERE LTRIM(RTRIM(value)) <> ''
     )) AS OldTags
FROM (SELECT 1 AS One) AS One
LEFT JOIN [ZideBar].[Zen_CloudFiles_Notes] N
  ON N.Ordinal = @NoteOrd
  AND N.CaseOrdinal = @CaseOrd;
`, `
(function () {
  ${ENTRY}
  return JSON.stringify([
    {Name: "@CaseNum", Value: entry.caseNum},
    {Name: "@CaseID", Value: entry.caseId},
    {Name: "@Ordinal", Value: entry.ordinal},
    {Name: "@LoggedInUser", Value: entry.me},
    {Name: "@KnownTags", Value: entry.known.join(',')}
  ]);
})()
`), 0, 3],

  ['Response_Failed', 'HTTP Response - Not Saved', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "'It wasn’t saved: nothing was changed. Try again; if it keeps happening, contact an administrator.'")}
};
`), 2, 3],

  ['JS_Values', 'JS: Work Out The Row', build.script(`
// The row as it will be saved, under Zen_CloudFiles_Notes's column names.
${ENTRY}
${HELPERS}
var check = activities.SQL_Check.ResultSet()[0] || {};
var problems = [];
if (!on(check.Valid)) {
  problems.push(text(check.Message) || "This case or note couldn't be found.");
}

var editing = entry.ordinal !== '';
var wasTask = editing && on(check.OldFollowUp);
// A saved task stays a task (owner, 18 November 2026).
if (wasTask && !entry.task) {
  problems.push('A saved task stays a task.');
}

// TaskStatus as Complete Task sets it: Complete once actioned; a task not
// actioned keeps its status (New when it had none, or was Complete).
var oldStatus = text(check.OldTaskStatus);
var status = !entry.task ? ''
  : entry.actioned ? 'Complete'
  : wasTask && oldStatus !== '' && !/^complete$/i.test(oldStatus) ? oldStatus
  : 'New';

var row = {
  FollowupRequired: entry.task,
  Title: entry.title,
  Note: entry.note,
  ActionedNotes: entry.actionedNotes,
  Deadline: entry.deadline,
  PrimaryStaffLead: entry.staff,
  HighPriority: entry.highPriority,
  Actioned: entry.actioned,
  TaskStatus: status,
  // Task for a task, as Quick Add Task writes it; a note keeps its own, or
  // Case, as the old note form set it.
  Category: entry.task ? 'Task' : (editing ? text(check.OldCategory) || 'Case' : 'Case'),
  Access: entry.access
};

// The note's tags: add the new, remove the dropped (only among the tags
// the form offered, so a case type sharing the ordinal is never touched).
var oldTags = list(check.OldTags);
var newTags = entry.tags.filter(function (tag, index) { return entry.tags.indexOf(tag) === index; });
var add = newTags.filter(function (tag) { return oldTags.indexOf(tag) === -1; });
var remove = oldTags.filter(function (tag) { return newTags.indexOf(tag) === -1; });

setVariable('RowJson', JSON.stringify(row));
setVariable('OldTagsJson', JSON.stringify(oldTags));
setVariable('TagsToAddJson', JSON.stringify(add));
setVariable('TagsToRemove', remove.join(','));
setVariable('ProblemsJson', JSON.stringify(problems));
setVariable('Timestamp', text(check.Timestamp));
setVariable('CrmID', text(check.CrmID));
`), 0, 4],

  // The access rules' inputs, as the prefill reads them.
  ['IQA_CaseStaff', 'IQA: User Assigned To The Case', build.iqa(CASE_STAFF_IQA, `
'&parameter=' + JSON.parse(getVariable('EntryJson')).caseNum +
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 1), 1, 4],
  ['IQA_UserRoles', 'IQA: The User\'s Roles', build.iqa(USER_ROLES_IQA, `
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 30), 2, 4],

  // The case's access, and (editing) the note's as it is now: someone who
  // can't open it can't change it.
  ['JS_Access', 'JS: Check Case And Note Access', build.script(`
${ENTRY}
${HELPERS}
${ACCESS_RULES}
var check = activities.SQL_Check.ResultSet()[0] || {};
var problems = JSON.parse(getVariable('ProblemsJson'));
// Only once the case was found and is in the user's entity.
if (on(check.Valid)) {
  if (!access.caseGranted(check.CaseAccess)) {
    problems.push("You don't have access to this case.");
  } else if (entry.ordinal !== '' && !access.noteGranted(check.OldAccess)) {
    problems.push("This note is restricted, and you don't have access to it.");
  }
}
setVariable('ProblemsJson', JSON.stringify(problems));
`), 2, 5],

  ['IF_Allowed', 'IF: Case And Note Allowed', build.when(`
JSON.parse(getVariable('ProblemsJson')).length === 0
`), 0, 5],

  ['Response_Refused', 'HTTP Response - Not Allowed', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "JSON.parse(getVariable('ProblemsJson')).join(' ')")}
};
`), 1, 5],

  // The case and its primary contact: the tags' ContactID, and the upload's
  // member and entity. Neither stops the save.
  ['IQA_UploadCase', 'IQA: The Case For The Upload', build.iqa(UPLOAD_CASE_IQA,
    `'&parameter=' + JSON.parse(getVariable('EntryJson')).caseId`, 1), 0, 6],

  ['IF_HasContact', 'IF: Case Has A Primary Contact', build.when(`
(function () {
  try {
    var found = activities.IQA_UploadCase.ResultSet()[0];
    return !!(found && String(found.PrimaryContactID ?? '').trim() !== '');
  } catch (error) {
    return false;
  }
})()
`), 0, 7],

  // Asked with a blank ID an IQA returns its first row, so only with one.
  ['IQA_UploadContact', 'IQA: The Primary Contact\'s Record', build.iqa(UPLOAD_CONTACT_IQA,
    `'&parameter=' + activities.IQA_UploadCase.ResultSet()[0].PrimaryContactID`, 1), 1, 7],

  ['JS_Contact', 'JS: Keep The Contact', build.script(`
var found = activities.IQA_UploadCase.ResultSet()[0] || {};
var contact = {};
try {
  contact = activities.IQA_UploadContact.ResultSet()[0] || {};
} catch (error) {
  contact = {};
}
setVariable('ContactJson', JSON.stringify({
  ID: String(contact.ID ?? found.PrimaryContactID ?? ''),
  EntityCode: String(contact.EntityCode ?? ''),
  CaseOrdinal: String(found.CaseOrdinal ?? '')
}));
`), 1, 8],

  ['IF_Editing', 'IF: Editing', build.when(`
JSON.parse(getVariable('EntryJson')).ordinal !== ''
`), 0, 9],

  /* --- A new note --- */

  ['iMIS_Insert', 'iMIS Insert - Zen_CloudFiles_Notes', build.insert('Zen_CloudFiles_Notes', `
(function () {
  ${ENTRY}
  ${ROW}
  var stamp = String(getVariable('Timestamp') ?? '');
  return JSON.stringify([
    {Name: "CaseOrdinal", Value: entry.caseNum},
    {Name: "CaseID", Value: entry.caseId},
    {Name: "Title", Value: row.Title},
    {Name: "Note", Value: row.Note},
    {Name: "ActionedNotes", Value: row.ActionedNotes},
    {Name: "Category", Value: row.Category},
    {Name: "Access", Value: row.Access},
    {Name: "imisID", Value: entry.me},
    {Name: "FollowupRequired", Value: String(row.FollowupRequired)},
    {Name: "Deadline", Value: row.Deadline},
    {Name: "PrimaryStaffLead", Value: row.PrimaryStaffLead},
    {Name: "HighPriority", Value: String(row.HighPriority)},
    {Name: "Actioned", Value: String(row.Actioned)},
    {Name: "TaskStatus", Value: row.TaskStatus},
    {Name: "FirstCreatedBy", Value: entry.me},
    {Name: "FirstCreatedOn", Value: stamp},
    {Name: "LastUpdatedBy", Value: entry.me},
    {Name: "LastUpdatedOn", Value: stamp}
  ]);
})()
`), 0, 10],

  ['JS_Added', 'JS: The New Note\'s Ordinal', build.script(`
setVariable('NoteOrdinal', String(activities.iMIS_Insert.ImisOrdinal()));
`), 0, 11],

  ['SQL_Insert', 'SQL: CT Insert - Zen_CloudFiles_Notes', build.sql(`
-- The same row in CloudToolz, under iMIS's Ordinal.
INSERT INTO [ZideBar].[Zen_CloudFiles_Notes] (
  Ordinal,
  CaseOrdinal,
  Title,
  Note,
  ActionedNotes,
  Category,
  Access,
  CrmID,
  FollowUpRequired,
  Deadline,
  PrimaryStaffLead,
  HighPriority,
  Actioned,
  TaskStatus,
  FirstCreatedBy,
  FirstCreatedOn,
  LastUpdatedBy,
  LastUpdatedOn
) VALUES (
  CAST(@Ordinal AS int),
  CAST(@CaseOrdinal AS int),
  NULLIF(@Title, ''),
  @Note,
  NULLIF(@ActionedNotes, ''),
  @Category,
  @Access,
  NULLIF(@CrmID, ''),
  CAST(@FollowUp AS bit),
  CASE WHEN @Deadline = '' THEN NULL ELSE CAST(@Deadline AS datetime) END,
  NULLIF(@StaffLead, ''),
  CAST(@HighPriority AS bit),
  CAST(@Actioned AS bit),
  NULLIF(@TaskStatus, ''),
  @LoggedInUser,
  @LocalTimestamp,
  @LoggedInUser,
  @LocalTimestamp
);

SELECT CAST(@Ordinal AS int) AS Ordinal;
`, `
(function () {
  ${ENTRY}
  ${ROW}
  return JSON.stringify([${NOTE_COLUMNS}
  ]);
})()
`), 0, 12],

  /* --- An edited note --- */

  ['iMIS_Update', 'iMIS Update - Zen_CloudFiles_Notes', build.bulk('Standalone|Zen_CloudFiles_Notes|Multi', 'Update', `
(function () {
  ${ENTRY}
  ${ROW}
  return [{
    Ordinal: entry.ordinal,
    Title: row.Title,
    Note: row.Note,
    ActionedNotes: row.ActionedNotes,
    Category: row.Category,
    Access: row.Access,
    FollowupRequired: row.FollowupRequired,
    Deadline: row.Deadline,
    PrimaryStaffLead: row.PrimaryStaffLead,
    HighPriority: row.HighPriority,
    Actioned: row.Actioned,
    TaskStatus: row.TaskStatus,
    LastUpdatedBy: entry.me,
    LastUpdatedOn: String(getVariable('Timestamp') ?? '')
  }];
})()
`), 1, 10],

  ['SQL_Update', 'SQL: CT Update - Zen_CloudFiles_Notes', build.sql(`
UPDATE [ZideBar].[Zen_CloudFiles_Notes]
SET Title = NULLIF(@Title, ''),
    Note = @Note,
    ActionedNotes = NULLIF(@ActionedNotes, ''),
    Category = @Category,
    Access = @Access,
    FollowUpRequired = CAST(@FollowUp AS bit),
    Deadline = CASE WHEN @Deadline = '' THEN NULL ELSE CAST(@Deadline AS datetime) END,
    PrimaryStaffLead = NULLIF(@StaffLead, ''),
    HighPriority = CAST(@HighPriority AS bit),
    Actioned = CAST(@Actioned AS bit),
    TaskStatus = NULLIF(@TaskStatus, ''),
    LastUpdatedBy = @LoggedInUser,
    LastUpdatedOn = @LocalTimestamp
WHERE Ordinal = CAST(@Ordinal AS int)
  AND CaseOrdinal = CAST(@CaseOrdinal AS int);

SELECT CAST(@Ordinal AS int) AS Ordinal;
`, `
(function () {
  ${ENTRY}
  ${ROW}
  return JSON.stringify([${NOTE_COLUMNS}
  ]);
})()
`), 1, 11],

  // iMIS has the note but CloudToolz doesn't: saving again would add a
  // second note, so the answer says not to.
  ['Response_PartlySaved', 'HTTP Response - Partly Saved', build.respond(`
var ordinal = String(getVariable('NoteOrdinal') ?? '');
return {
  Error: true,
  Partial: true,
  Ordinal: ordinal,
  "class-html-Message": ${MESSAGE('error', "'It was saved in iMIS (note ' + ordinal + '), but CloudToolz couldn’t be updated. Don’t save again: contact an administrator.'")}
};
`), 2, 11],

  /* --- Its tags (i4u_UT_Tags, ModuleOrdinal: the note) --- */

  ['ForEach_TagAdd', 'For Each: Tag To Add', build.forEach(`
JSON.parse(getVariable('TagsToAddJson'))
`), 0, 13],

  ['iMIS_TagInsert', 'iMIS Insert - i4u_UT_Tags', build.insert('i4u_UT_Tags', `
(function () {
  ${ENTRY}
  var contact = JSON.parse(getVariable('ContactJson'));
  return JSON.stringify([
    {Name: "ModuleOrdinal", Value: String(getVariable('NoteOrdinal') ?? "")},
    {Name: "ContactID", Value: String(contact.ID ?? "")},
    {Name: "TagOrdinal", Value: String(activities.ForEach_TagAdd.Output() ?? "")},
    {Name: "LastUpdatedBy", Value: entry.me}
  ]);
})()
`), 1, 13],

  ['SQL_TagInsert', 'SQL: CT Insert - i4u_UT_Tags', build.sql(`
INSERT INTO [Cases].[i4u_UT_Tags] (
  Ordinal,
  ModuleOrdinal,
  ContactID,
  TagOrdinal,
  LastUpdateBy,
  [Action]
) VALUES (
  CAST(@Ordinal AS int),
  CAST(@NoteOrdinal AS int),
  @ContactID,
  @TagOrdinal,
  @LoggedInUser,
  'INSERT'
);
`, `
(function () {
  ${ENTRY}
  var contact = JSON.parse(getVariable('ContactJson'));
  return JSON.stringify([
    {Name: "@Ordinal", Value: String(activities.iMIS_TagInsert.ImisOrdinal() ?? "")},
    {Name: "@NoteOrdinal", Value: String(getVariable('NoteOrdinal') ?? "")},
    {Name: "@ContactID", Value: String(contact.ID ?? "")},
    {Name: "@TagOrdinal", Value: String(activities.ForEach_TagAdd.Output() ?? "")},
    {Name: "@LoggedInUser", Value: entry.me}
  ]);
})()
`), 2, 13],

  ['JS_TagFailed', 'JS: Note The Tag That Failed', build.script(`
var failed = JSON.parse(getVariable('TagProblemsJson'));
var labels = JSON.parse(getVariable('TagLabelsJson'));
var tag = String(activities.ForEach_TagAdd.Output() ?? '');
failed.push(labels[tag] || tag);
setVariable('TagProblemsJson', JSON.stringify(failed));
`), 1, 14],

  // The dropped tags' rows: removed from iMIS first, then CloudToolz.
  ['SQL_TagRows', 'SQL - The Tags To Remove', build.sql(`
SELECT T.Ordinal
FROM [Cases].[i4u_UT_Tags] T
WHERE T.ModuleOrdinal = CAST(@NoteOrdinal AS int)
  AND CAST(T.TagOrdinal AS varchar(20)) IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@Remove, ',') WHERE LTRIM(RTRIM(value)) <> ''
  );
`, `
JSON.stringify([
  {Name: "@NoteOrdinal", Value: String(getVariable('NoteOrdinal') ?? "")},
  {Name: "@Remove", Value: String(getVariable('TagsToRemove') ?? "")}
])
`), 0, 15],

  ['iMIS_TagRemove', 'iMIS Delete - i4u_UT_Tags', build.bulk('Standalone|i4u_UT_Tags|Multi', 'Delete', `
activities.SQL_TagRows.ResultSet()
`), 0, 16],

  ['SQL_TagRemove', 'SQL: CT Delete - i4u_UT_Tags', build.sql(`
DELETE T
FROM [Cases].[i4u_UT_Tags] T
WHERE T.ModuleOrdinal = CAST(@NoteOrdinal AS int)
  AND CAST(T.TagOrdinal AS varchar(20)) IN (
    SELECT LTRIM(RTRIM(value)) FROM STRING_SPLIT(@Remove, ',') WHERE LTRIM(RTRIM(value)) <> ''
  );
`, `
JSON.stringify([
  {Name: "@NoteOrdinal", Value: String(getVariable('NoteOrdinal') ?? "")},
  {Name: "@Remove", Value: String(getVariable('TagsToRemove') ?? "")}
])
`), 0, 17],

  ['JS_TagRemoveFailed', 'JS: Note The Tags Not Removed', build.script(`
var failed = JSON.parse(getVariable('TagProblemsJson'));
var labels = JSON.parse(getVariable('TagLabelsJson'));
String(getVariable('TagsToRemove') ?? '').split(',').filter(Boolean).forEach(function (tag) {
  failed.push((labels[tag] || tag) + ' (removing)');
});
setVariable('TagProblemsJson', JSON.stringify(failed));
`), 1, 16],

  /* --- Its new attachments --- */

  ['IF_HasFiles', 'IF: New Attachments', build.when(`
JSON.parse(getVariable('FilesJson')).length > 0
`), 0, 18],

  ['IF_CanUpload', 'IF: A Member To File Them Under', build.when(`
String(JSON.parse(getVariable('ContactJson')).ID ?? '') !== ''
`), 0, 19],

  ['JS_NoUpload', 'JS: Note The Files Not Uploaded', build.script(`
var failed = JSON.parse(getVariable('FileProblemsJson'));
JSON.parse(getVariable('FilesJson')).forEach(function (file) { failed.push(file.UploadName); });
setVariable('FileProblemsJson', JSON.stringify(failed));
`), 1, 19],

  ['ForEach_File', 'For Each: New Attachment', build.forEach(`
JSON.parse(getVariable('FilesJson'))
`), 0, 20],

  // The Zidebar upload's input, as Quick Add Attachment builds it, for one
  // file: its own tags plus Cases, linked to the note (NoteOrdinal) and
  // taking the note's Access. The form staged the file under its Uuid.
  ['JS_FileInput', 'JS: Build The Upload Input', build.script(`
${ENTRY}
${ROW}
var file = activities.ForEach_File.Output();
var contact = JSON.parse(getVariable('ContactJson'));
var tags = String(file.TagOrdinals ?? '').split(',').map(function (tag) { return tag.trim(); }).filter(Boolean);
tags.push('${CASE_FILE_TAG}');
tags = tags.filter(function (tag, index) { return tags.indexOf(tag) === index; });

setVariable('UploadName', String(file.UploadName));
setVariable('ParentInput', {
  "Files": [{UploadName: String(file.UploadName), Uuid: String(file.Uuid)}],
  "FileTags": tags,
  "EntityCode": contact.EntityCode,
  "NoteOrdinal": String(getVariable('NoteOrdinal')),
  // The entity's local time as "YYYY-MM-DD HH:mm", as the form sent NoteDate.
  "Date": String(getVariable('Timestamp')).slice(0, 16).replace('T', ' '),
  "Case": {
    "CaseOrdinal": contact.CaseOrdinal || entry.caseNum,
    "CaseID": entry.caseId,
    "NewCase": false,
    "CreatedByMember": false,
    "DefaultTagOrdinal": '',
    "Access": row.Access
  },
  "Agreement": null,
  "Type": 'Case',
  "Email": {
    "IsEmail": false
  },
  "User": {
    "StaffIMISID": entry.me,
    "MemberIMISID": contact.ID
  }
});
`), 1, 20],

  ['Run_FileUpload', 'Run Fileupload And Tagging', build.runWorkflow(
    'getWorkflowDefinitionIdByName("Zidebar: Fileupload")', "getVariable('ParentInput')", 'Blocking', ['Status']), 2, 20],

  // The upload finishes with {Status: 'S' or 'E', Message}; anything but E
  // counts as uploaded, as Quick Add Attachment reads it.
  ['JS_FileStatus', 'JS: Read The Upload Status', build.script(`
var result = null;
try {
  result = activities.Run_FileUpload.Output();
} catch (error) {
  result = {Status: 'E'};
}
var output = (result && (result.WorkflowOutput || result.Output)) || result || {};
if (output.Status === 'E') {
  var failed = JSON.parse(getVariable('FileProblemsJson'));
  failed.push(String(getVariable('UploadName')));
  setVariable('FileProblemsJson', JSON.stringify(failed));
}
`), 2, 21],

  /* --- The change log --- */

  ['JS_CreateLogContext', 'JS: Create Log Context', build.script(`
// One entry against the case: an Add with what was set, an Edit with each
// changed column, old and new (OldValue). A restricted note's text is not
// logged (as Quick Add Note).
${ENTRY}
${ROW}
${HELPERS}
var check = activities.SQL_Check.ResultSet()[0] || {};
var labels = JSON.parse(getVariable('TagLabelsJson'));
var editing = entry.ordinal !== '';

// A deadline as "YYYY-MM-DD HH:mm", or the date alone at midnight.
var due = function (value) {
  var match = text(value).match(/^(\\d{4}-\\d{2}-\\d{2})(?:T(\\d{2}:\\d{2}))?/);
  return match ? match[1] + (match[2] && match[2] !== '00:00' ? ' ' + match[2] : '') : '';
};
var tagNames = function (tags) {
  return tags.map(function (tag) { return labels[tag] || tag; }).sort().join(', ');
};
var flag = function (value) { return value ? 'true' : 'false'; };

var after = {
  FollowupRequired: flag(row.FollowupRequired),
  Title: row.Title,
  Note: row.Note,
  ActionedNotes: row.ActionedNotes,
  Deadline: due(row.Deadline),
  PrimaryStaffLead: row.PrimaryStaffLead,
  HighPriority: flag(row.HighPriority),
  Actioned: flag(row.Actioned),
  TaskStatus: row.TaskStatus,
  Category: row.Category,
  Access: row.Access,
  Tags: tagNames(entry.tags)
};
var before = {
  FollowupRequired: flag(on(check.OldFollowUp)),
  Title: text(check.OldTitle),
  Note: String(check.OldNote ?? '').trim(),
  ActionedNotes: String(check.OldActionedNotes ?? '').trim(),
  Deadline: due(check.OldDeadline),
  PrimaryStaffLead: text(check.OldStaffLead),
  HighPriority: flag(on(check.OldHighPriority)),
  Actioned: flag(on(check.OldActioned)),
  TaskStatus: text(check.OldTaskStatus),
  Category: text(check.OldCategory),
  Access: text(check.OldAccess),
  Tags: tagNames(JSON.parse(getVariable('OldTagsJson')))
};

var fields = Object.keys(after).filter(function (field) {
  return editing ? before[field] !== after[field] : after[field] !== '' && after[field] !== 'false';
});
var restricted = row.Access !== 'Open' || (editing && before.Access !== '' && before.Access !== 'Open');
if (restricted) {
  fields = fields.filter(function (field) { return ['Title', 'Note', 'ActionedNotes'].indexOf(field) === -1; });
}

// The assignee as "Name (ID)" where the form named them.
var person = function (id) {
  return id === '' ? '' : id === row.PrimaryStaffLead && entry.staffName ? entry.staffName + ' (' + id + ')' : id;
};
var logBody = {};
var oldValue = {};
fields.forEach(function (field) {
  logBody[field] = field === 'PrimaryStaffLead' ? person(after[field]) : after[field];
  oldValue[field] = field === 'PrimaryStaffLead' ? person(before[field]) : before[field];
});
if (editing) {
  logBody.OldValue = JSON.stringify(oldValue);
}

var what = row.FollowupRequired ? 'Task' : 'Note';
setVariable('HasChanges', fields.length > 0);
setVariable('logChanges', {
  "logContext": {
    "Note": "Case " + entry.caseId + ": " + (editing ? 'Update ' : 'Add ') + what,
    "Table": "Zen_CloudFiles_Notes",
    "UpdateReason": editing ? "Edit" : "Add",
    "workflowDefinitionId": workflowDefinitionId, // provided by CloudToolz
    "sourceOrdinal": String(getVariable('NoteOrdinal'))
  },
  "fieldsToCompare": fields,
  "body": logBody,
  "profileID": entry.caseId, // the case the change belongs to
  "updatedByID": entry.me
});
`), 0, 22],

  ['IF_HasChanges', 'IF: Anything To Log', build.when(`
getVariable('HasChanges') === true
`), 0, 23],

  ['LogChangesToIMIS', 'Log Changes To IMIS', build.runWorkflow(
    "getWorkflowDefinitionIdByName('LogChangesToIMIS')", "getVariable('logChanges')", 'FireAndForget'), 1, 23],

  ['Response_Saved', 'HTTP Response - Saved', build.respond(`
// Saved. A tag or an attachment that didn't save is named; the note is.
${ROW}
var tags = JSON.parse(getVariable('TagProblemsJson'));
var files = JSON.parse(getVariable('FileProblemsJson'));
var what = row.FollowupRequired ? 'Task' : 'Note';
var warnings = [];
if (tags.length) {
  warnings.push((tags.length === 1 ? 'a tag' : tags.length + ' tags') + ' (' + tags.join(', ') + ')');
}
if (files.length) {
  warnings.push((files.length === 1 ? 'an attachment' : files.length + ' attachments') + ' (' + files.join(', ') + ')');
}

if (warnings.length) {
  var warning = what + ' saved, but ' + warnings.join(' and ') + ' couldn’t be saved. Edit it to try again.';
  return {
    Success: true,
    Ordinal: String(getVariable('NoteOrdinal')),
    Warning: warning,
    "class-html-Message": ${MESSAGE('error', 'warning')}
  };
}
return {
  Success: true,
  Ordinal: String(getVariable('NoteOrdinal')),
  "class-html-Message": ${MESSAGE('success', "what + ' saved.'")}
};
`), 0, 24]
], [
  ['EndpointData', 'Done', 'JS_Prepare'],
  ['JS_Prepare', 'Done', 'IF_Valid'],
  ['IF_Valid', 'True', 'SQL_Check'],
  ['IF_Valid', 'False', 'Response_Invalid'],
  ['SQL_Check', 'Done', 'JS_Values'],
  ['SQL_Check', 'Error', 'Response_Failed'],
  ['JS_Values', 'Done', 'IQA_CaseStaff'],
  ['IQA_CaseStaff', 'True', 'IQA_UserRoles'],
  ['IQA_CaseStaff', 'False', 'IQA_UserRoles'],
  ['IQA_UserRoles', 'True', 'JS_Access'],
  ['IQA_UserRoles', 'False', 'JS_Access'],
  ['JS_Access', 'Done', 'IF_Allowed'],
  ['IF_Allowed', 'True', 'IQA_UploadCase'],
  ['IF_Allowed', 'False', 'Response_Refused'],

  ['IQA_UploadCase', 'True', 'IF_HasContact'],
  ['IQA_UploadCase', 'False', 'IF_HasContact'],
  ['IF_HasContact', 'True', 'IQA_UploadContact'],
  ['IF_HasContact', 'False', 'IF_Editing'],
  ['IQA_UploadContact', 'True', 'JS_Contact'],
  ['IQA_UploadContact', 'False', 'JS_Contact'],
  ['JS_Contact', 'Done', 'IF_Editing'],

  ['IF_Editing', 'False', 'iMIS_Insert'],
  ['iMIS_Insert', 'True', 'JS_Added'],
  ['iMIS_Insert', 'False', 'Response_Failed'],
  ['JS_Added', 'Done', 'SQL_Insert'],
  ['SQL_Insert', 'Done', 'ForEach_TagAdd'],
  ['SQL_Insert', 'Error', 'Response_PartlySaved'],

  ['IF_Editing', 'True', 'iMIS_Update'],
  ['iMIS_Update', 'Successful', 'SQL_Update'],
  ['iMIS_Update', 'NoRecords', 'SQL_Update'],
  ['iMIS_Update', 'Failed', 'Response_Failed'],
  ['SQL_Update', 'Done', 'ForEach_TagAdd'],
  ['SQL_Update', 'Error', 'Response_PartlySaved'],

  ['ForEach_TagAdd', 'Iterate', 'iMIS_TagInsert'],
  ['iMIS_TagInsert', 'True', 'SQL_TagInsert'],
  ['iMIS_TagInsert', 'False', 'JS_TagFailed'],
  ['SQL_TagInsert', 'Error', 'JS_TagFailed'],
  ['ForEach_TagAdd', 'Done', 'SQL_TagRows'],

  ['SQL_TagRows', 'Done', 'iMIS_TagRemove'],
  ['SQL_TagRows', 'Error', 'JS_TagRemoveFailed'],
  ['iMIS_TagRemove', 'Successful', 'SQL_TagRemove'],
  ['iMIS_TagRemove', 'NoRecords', 'SQL_TagRemove'],
  ['iMIS_TagRemove', 'Failed', 'JS_TagRemoveFailed'],
  ['SQL_TagRemove', 'Done', 'IF_HasFiles'],
  ['SQL_TagRemove', 'Error', 'JS_TagRemoveFailed'],
  ['JS_TagRemoveFailed', 'Done', 'IF_HasFiles'],

  ['IF_HasFiles', 'True', 'IF_CanUpload'],
  ['IF_HasFiles', 'False', 'JS_CreateLogContext'],
  ['IF_CanUpload', 'True', 'ForEach_File'],
  ['IF_CanUpload', 'False', 'JS_NoUpload'],
  ['JS_NoUpload', 'Done', 'JS_CreateLogContext'],
  ['ForEach_File', 'Iterate', 'JS_FileInput'],
  ['JS_FileInput', 'Done', 'Run_FileUpload'],
  ['Run_FileUpload', 'Done', 'JS_FileStatus'],
  ['Run_FileUpload', 'Not Found', 'JS_FileStatus'],
  ['ForEach_File', 'Done', 'JS_CreateLogContext'],

  ['JS_CreateLogContext', 'Done', 'IF_HasChanges'],
  ['IF_HasChanges', 'True', 'LogChangesToIMIS'],
  ['IF_HasChanges', 'False', 'Response_Saved'],
  ['LogChangesToIMIS', 'Done', 'Response_Saved'],
  ['LogChangesToIMIS', 'Not Found', 'Response_Saved']
]);

/* ======================================================================
   Show note: a restricted note's text, in the case page's quick view (the
   theme's restricted note loader, US-NOTES-RESTRICTED). Takes {NoteOrdinal}
   (and the page's CaseID and CaseNum, which it doesn't trust: the case is
   the note's own). Answers {Access: 'Granted', Note} only to a user who
   meets the case's and the note's access, as the form's flows decide them
   (owner, 18 November 2026); otherwise {Access: 'Restricted'}, and
   {Access: 'Unavailable'} when the check couldn't run.
   ====================================================================== */

const noteAccess = assemble('case-note-access', [
  ['EndpointData', 'HTTP Endpoint', build.endpoint(NOTE_ACCESS_PATH, false), 0, 0],
  ['RequestAuthorization', 'Request Authorization', build.authorize(), 0, 1],
  ['Response_Unauthorised', 'HTTP Response - Unauthorised', build.respondText('Unauthorised', 'Unauthorized'), 1, 1],
  ['Fault', 'Fault', build.fault(), 2, 1],

  ['SQL_Note', 'SQL - The Note And Its Case', build.sql(`
-- The note, its case (the note's own, not the page's), the case's Access,
-- and whether the signed-in user's entities include the case.
DECLARE @NoteOrd int = TRY_CAST(@NoteOrdinal AS int);

SELECT TOP 1
  N.Ordinal,
  N.Access,
  N.Note,
  N.CaseOrdinal,
  C.CaseID,
  C.Access AS CaseAccess,
  CASE WHEN EXISTS (
    SELECT 1
    FROM UnionTemplate.EntityAccess A
    WHERE A.EntityCode = C.OrgCode
      AND A.StaffimisID = @LoggedInUser
  ) THEN 1 ELSE 0 END AS Allowed
FROM [ZideBar].[Zen_CloudFiles_Notes] N
INNER JOIN [Cases].[i4u_UT_Cases] C
  ON C.Ordinal = N.CaseOrdinal
WHERE N.Ordinal = @NoteOrd;
`, `
JSON.stringify([
  {Name: "@NoteOrdinal", Value: String(activities.EndpointData.Output().Body.NoteOrdinal ?? "")},
  {Name: "@LoggedInUser", Value: String(activities.EndpointData.Output().Headers.loggedinpartyid ?? "")}
])
`), 0, 2],

  ['Response_Unavailable', 'HTTP Response - Check Failed', build.respond(`
return JSON.stringify({Access: 'Unavailable'});
`), 1, 2],

  // The access rules' inputs, for the note's own case (never blank: asked
  // with a blank case, the IQA would answer for another case).
  ['IQA_CaseStaff', 'IQA: User Assigned To The Case', build.iqa(CASE_STAFF_IQA, `
'&parameter=' + (function () {
  try {
    return String(activities.SQL_Note.ResultSet()[0].CaseOrdinal ?? '') || '0';
  } catch (error) {
    return '0';
  }
})() +
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 1), 0, 3],
  ['IQA_UserRoles', 'IQA: The User\'s Roles', build.iqa(USER_ROLES_IQA, `
'&parameter=' + String(activities.EndpointData.Output().Headers.loggedinpartyid ?? '')
`, 30), 0, 4],

  ['Response', 'HTTP Response', build.respond(`
// The text only to a user who meets the case's access and the note's.
${HELPERS}
var note = null;
try {
  note = activities.SQL_Note.ResultSet()[0] || null;
} catch (error) {
  note = null;
}
${ACCESS_RULES}
var granted = !!note && on(note.Allowed) &&
  access.caseGranted(note.CaseAccess) && access.noteGranted(note.Access);
return JSON.stringify(granted
  ? {Access: 'Granted', Note: String(note.Note ?? '')}
  : {Access: 'Restricted'});
`), 0, 5]
], [
  ['EndpointData', 'Done', 'RequestAuthorization'],
  ['RequestAuthorization', 'True', 'SQL_Note'],
  ['RequestAuthorization', 'False', 'Response_Unauthorised'],
  ['Response_Unauthorised', 'Done', 'Fault'],
  ['SQL_Note', 'Done', 'IQA_CaseStaff'],
  ['SQL_Note', 'Error', 'Response_Unavailable'],
  ['IQA_CaseStaff', 'True', 'IQA_UserRoles'],
  ['IQA_CaseStaff', 'False', 'IQA_UserRoles'],
  ['IQA_UserRoles', 'True', 'Response'],
  ['IQA_UserRoles', 'False', 'Response']
]);

/* ---------- Checks: links, reachability, and every script parses ---------- */

function check(name, built, entry) {
  const ids = new Set(built.activities.map(activity => activity.activityId));
  built.connections.forEach(connection => {
    if (!ids.has(connection.sourceActivityId) || !ids.has(connection.targetActivityId)) {
      throw new Error(name + ': a link to an activity that is not there');
    }
  });
  const start = built.activities.find(activity => activity.name === entry).activityId;
  const reached = new Set([start]);
  let grew = true;
  while (grew) {
    grew = false;
    built.connections.forEach(connection => {
      if (reached.has(connection.sourceActivityId) && !reached.has(connection.targetActivityId)) {
        reached.add(connection.targetActivityId);
        grew = true;
      }
    });
  }
  const unreached = built.activities.filter(activity => !reached.has(activity.activityId)).map(activity => activity.name);
  if (unreached.length) {
    throw new Error(name + ': not reached: ' + unreached.join(', '));
  }
  built.activities.forEach(activity => activity.properties.forEach(prop => {
    const code = prop.expressions.JavaScript || (activity.type === 'RunJavaScript' && prop.name === 'Script' ? prop.expressions.Literal : '');
    if (!code) {
      return;
    }
    // An expression is a value; a Script or a Content body is statements.
    const asBody = activity.type === 'RunJavaScript' || (activity.type === 'WriteHttpResponse' && prop.name === 'Content');
    try {
      new Function('activities', 'getVariable', 'setVariable', 'workflowDefinitionId', asBody ? code : 'return (' + code + ');');
    } catch (error) {
      throw new Error(name + ' ' + activity.name + '.' + prop.name + ': ' + error.message);
    }
  }));
}

check('Prefill', prefill, 'EndpointData');
check('Save', save, 'EndpointData');
check('Note access', noteAccess, 'EndpointData');

/* ---------- The export ---------- */

function flowFrom(displayName, endpointPath, built) {
  const flow = exported.flowz.find(entry => entry.displayName === displayName);
  const hierarchy = exported.hierarchies.find(entry => entry.displayName === displayName);
  if (!flow || !hierarchy) {
    console.warn('Not in the export, so not built: ' + displayName);
    return null;
  }
  return {
    hierarchy: {...hierarchy, endpointPath, isPublished: true, lastExecutedAt: null, latestInstanceStatus: null},
    flow: {...flow, name: displayName, isPublished: true, isLatest: true, variables: {data: {}}, activities: built.activities, connections: built.connections}
  };
}

const flows = [
  flowFrom('US Case Form Prefill: Note', PREFILL_PATH, prefill),
  flowFrom('US Case Form: Note', SAVE_PATH, save),
  flowFrom('Cases: Quick Access Restricted Note', NOTE_ACCESS_PATH, noteAccess)
].filter(Boolean);

if (!flows.length) {
  console.error('The exports hold none of the note flows.');
  process.exit(1);
}

const output = {
  ...exported,
  hierarchies: flows.map(entry => entry.hierarchy),
  flowz: flows.map(entry => entry.flow)
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output, null, 2));
console.log('Wrote ' + target);
flows.forEach(entry => console.log('  ' + entry.flow.displayName + ': ' + entry.flow.activities.length + ' activities, ' + entry.hierarchy.endpointPath));
