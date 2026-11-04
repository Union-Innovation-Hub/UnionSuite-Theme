#!/usr/bin/env node
/* Builds the two Create case (staff) flows into one Flowz export.

   node build-flows.cjs <flowz-export.json> [output.json]

   The export is the owner's export of the two "UnionSuite Cases" copies
   (29 October 2026). Their definitionId and versionId are kept, so importing
   the output overwrites those copies; everything inside them is replaced:

   - UnionSuite Cases: Prefill Create Case - Staff Form
     POST /Cases/Union-Suite/Create-Case-Staff-Prefill (the form's autoexecute)
   - UnionSuite Cases: Create Case - Staff Form
     POST /Cases/Union-Suite/Create-Case-Staff (the form's Create case)

   Each path matches the form's executeFlow exactly, case and all: the
   create flow answered 400 until its path did (owner, 29 October 2026).

   Writes to output.json, or dist/Create-Case-Staff-Flows.json beside this
   script. Activity IDs are derived from each activity's name, so a rebuild
   keeps them. Edit this script, never the export. */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const [source, target = path.join(__dirname, 'dist', 'Create-Case-Staff-Flows.json')] = process.argv.slice(2);

if (!source) {
  console.error('Usage: node build-flows.cjs <flowz-export.json> [output.json]');
  process.exit(1);
}

const exported = JSON.parse(fs.readFileSync(source, 'utf8'));

/* ---------- Activity builders (property shapes as CloudToolz exports them) ---------- */

const none = () => ({});
const literal = value => ({Literal: value});
const javascript = value => ({JavaScript: value});

function property(name, expressions, syntax = null) {
  return {name, syntax, expressions};
}

const build = {
  endpoint: pathValue => ['HttpEndpoint', [
    property('Path', literal(pathValue)),
    property('Methods', {Json: '["POST"]'}),
    property('ReadContent', literal('true')),
    property('TargetType', none()),
    property('Schema', literal(''), 'Literal'),
    property('ValidateCallerUrl', none()),
    property('ValidateImisRequest', literal('true')),
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
    property('Parameters', javascript(parameters), 'JavaScript'),
    property('Timeout', none()),
    property('StrictlySelectOnly', none())
  ]],

  iqa: (iqaPath, parameters, limit) => ['IntelligentQueryArchitectData', [
    property('IqaPath', literal(iqaPath)),
    property('Parameters', javascript(parameters), 'JavaScript'),
    property('Offset', none()),
    property('Limit', literal(String(limit))),
    property('CollectionName', none())
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

  updateMulti: (dataSource, mapping, partyId, ordinal) => ['UpdateMultiInstanceDataSource', [
    property('NameOfDataSource', {Liquid: dataSource}),
    property('DataMapping', javascript(mapping)),
    property('PartyId', javascript(partyId), 'JavaScript'),
    property('Ordinal', javascript(ordinal), 'JavaScript')
  ]],

  when: condition => ['If', [
    property('Condition', javascript(condition.trim()), 'JavaScript')
  ]],

  script: code => ['RunJavaScript', [
    property('Script', literal(code.trim()), 'Literal'),
    property('PossibleOutcomes', none())
  ]],

  forEach: items => ['ForEach', [
    property('Items', javascript(items), 'JavaScript')
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

/* ---------- Shared pieces ---------- */

// Every response the form reads: BeyondFormz writes class-html-Message into
// the form's message line; the form's script reads the rest.
const MESSAGE = (tone, html) => `'<div class="${tone === 'error' ? 'AsiError AsiErrorIcon' : 'AsiSuccess AsiSuccessIcon'}">' + ${html} + '</div>'`;

/* ======================================================================
   Prefill: what the form needs before it shows.
   Answers {ReqVals, Member, Workplaces, Note}; every part but ReqVals is
   optional, and a part that cannot be read is left out, so the form still
   opens.
   ====================================================================== */

const MEMBER_WORKPLACES_IQA = '$/_i4u_/Core/Cases/Layouts v2/API - Create Case - Member Workplaces';

const prefill = assemble('create-case-prefill', [
  ['EndpointData', 'HTTP Endpoint', build.endpoint('/Cases/Union-Suite/Create-Case-Staff-Prefill'), 0, 0],

  ['SQL_FormFields', 'SQL - Form field rules', build.sql(`
-- The FormFields rules for this form: which fields show, are required and
-- can be changed.
SELECT IsRequired, Visible, FieldName, Editable
FROM UnionTemplate.FormFields
WHERE Module = 'Cases'
  AND Area = 'CreateCaseStaff';
`, 'JSON.stringify([])'), 0, 1],

  // No ID on the page: no member, and no lookups. Asked with a blank ID,
  // the IQAs returned their first row, so the form showed someone else
  // ("(Erased) (Erased)"; owner, 29 October 2026).
  ['IF_HasMember', 'IF: Member Given', build.when(`
String(activities.EndpointData.Output().Body.MemberID ?? '').trim() !== ''
`), 0, 2],

  ['IQA_Member', 'IQA: Member', build.iqa(
    '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/GetContactInfo',
    `'&parameter=' + activities.EndpointData.Output().Body.MemberID`, 1), 1, 2],

  // The member's jobs by their ID (prompt Member ID). If it cannot be read,
  // Workplace stays hidden on the form.
  ['IQA_Jobs', 'IQA: Member Workplaces (by ID)', build.iqa(
    MEMBER_WORKPLACES_IQA,
    `'&parameter=' + activities.EndpointData.Output().Body.MemberID`, 100), 1, 3],

  ['IF_HasNote', 'IF: From A Note', build.when(`
String(activities.EndpointData.Output().Body.NoteOrdinal ?? '').trim() !== ''
`), 0, 4],

  ['SQL_Note', 'SQL - The Note', build.sql(`
-- The note the case starts from, shown above the form and linked on save.
-- CreatedOn as yyyy-mm-dd: the form shows it in the website's culture.
SELECT TOP 1
  Note,
  CONVERT(char(10), CreatedOn, 23) AS CreatedOn
FROM [ZideBar].[Zen_CloudFiles_Notes]
WHERE Ordinal = CAST(@NoteOrdinal AS int);
`, 'JSON.stringify([{"Name":"@NoteOrdinal","Value":String(activities.EndpointData.Output().Body.NoteOrdinal ?? "")}])'), 1, 4],

  ['Response', 'HTTP Response', build.respond(`
// Each part is read on its own: one that did not run or failed is left out.
var body = activities.EndpointData.Output().Body;
var read = function (fn) { try { return fn(); } catch (error) { return null; } };

var rules = read(function () { return activities.SQL_FormFields.ResultSet(); }) || [];
// Only for a member the page named (the lookups did not run without one).
var memberId = String(body.MemberID ?? '').trim();
var contact = memberId === '' ? null : read(function () { return activities.IQA_Member.ResultSet()[0]; });
var jobs = memberId === '' ? [] : read(function () { return activities.IQA_Jobs.ResultSet(); }) || [];
var noteRow = read(function () { return activities.SQL_Note.ResultSet()[0]; });

// The note: from NoteOrdinal, or the interaction the page passed in Prefill.
var note = noteRow && noteRow.Note ? {Note: noteRow.Note, CreatedOn: noteRow.CreatedOn} : null;
var passed = read(function () { return JSON.parse(body.Prefill); });
if (!note && passed && passed.Note) {
  note = {Note: passed.Note, CreatedOn: passed.CreatedOn || ''};
}

return {
  ReqVals: rules,
  Member: contact ? {Name: contact.Name, ID: memberId} : null,
  Workplaces: jobs,
  Note: note
};
`), 0, 5]
], [
  ['EndpointData', 'Done', 'SQL_FormFields'],
  ['SQL_FormFields', 'Done', 'IF_HasMember'],
  ['SQL_FormFields', 'Error', 'IF_HasMember'],
  ['IF_HasMember', 'True', 'IQA_Member'],
  ['IF_HasMember', 'False', 'IF_HasNote'],
  ['IQA_Member', 'True', 'IQA_Jobs'],
  ['IQA_Member', 'False', 'IQA_Jobs'],
  ['IQA_Jobs', 'True', 'IF_HasNote'],
  ['IQA_Jobs', 'False', 'IF_HasNote'],
  ['IF_HasNote', 'True', 'SQL_Note'],
  ['IF_HasNote', 'False', 'Response'],
  ['SQL_Note', 'Done', 'Response'],
  ['SQL_Note', 'Error', 'Response']
]);

/* ======================================================================
   Create: one case, in order. iMIS first, then CloudToolz, for each record:
   the case, the member as the primary party, the lead staff member (if
   chosen), the signed-in user (if "Assign me" was ticked and they are not
   the lead), each type and subtype, and the note or interaction it came
   from. Then one change-log entry for the whole creation.

   Before the case exists, a problem answers an error and nothing is saved.
   After it exists, a failed step answers a "partly saved" message naming
   the step and linking the case; a failed tag is noted and the rest go on.
   ====================================================================== */

// The values the flow works from, read and checked once.
const PREPARE = `
// The form checks these too; this is the safety net.
var endpoint = activities.EndpointData.Output();
var body = endpoint.Body;
var text = function (value) { return String(value ?? '').trim(); };
var list = function (value) {
  return text(value) === '' ? [] : text(value).split(',').map(function (item) { return item.trim(); }).filter(Boolean);
};

var me = text(endpoint.Headers.loggedinpartyid);
var lead = text(body.CaseStaffMembers);
var access = text(body.CaseAccessLevel) || 'Open';

var newCase = {
  memberId: text(body.MemberID),
  me: me,
  lead: lead,
  // Ticked on the form, and not already the lead.
  assignMe: text(body.AssignMe) !== '' && me !== '' && me !== lead,
  name: text(body.CaseName),
  description: text(body.CaseDescription),
  date: text(body.DateIncident),
  // Blank: not chosen. 0: not about a workplace.
  workplace: text(body.PrimaryWorkplaceID),
  priority: text(body.CasePriority),
  access: access,
  status: text(body.CaseStatus) || 'New',
  // As text, not lists: a list kept in a variable comes back as a .NET list,
  // which concat does not unpack (dev tenant, 29 October 2026). The tag
  // loop reads its items from the body instead (TAG_ITEMS).
  types: list(body['CaseTypes[]']).join(', '),
  subTypes: list(body['CaseSubTypes[]']).join(', '),
  noteOrdinal: text(body.NoteOrdinal),
  interactionOrdinal: text(body.InteractionOrdinal),
  // Names for the change log only, added by the form's script.
  names: {
    types: text(body.CaseTypeNames),
    subTypes: text(body.CaseSubTypeNames),
    lead: text(body.LeadStaffName),
    me: text(body.AssignMeName),
    workplace: text(body.WorkplaceName),
    priority: text(body.PriorityName)
  }
};

var problems = [];
if (newCase.memberId === '') {
  problems.push('No member was given for the case.');
}
if (newCase.types === '') {
  problems.push('Choose at least one type.');
}
if (newCase.description === '') {
  problems.push('Say what happened.');
}
if (access === 'Individual' && lead === '' && !newCase.assignMe) {
  problems.push('An Individual case is seen only by its staff: choose a lead, or assign yourself.');
}

setVariable('NewCase', newCase);
setVariable('Problems', problems);
setVariable('TagProblems', []);
`;

// Shorthands used in the expressions below.
const NEW = "getVariable('NewCase')";
const PREP = 'activities.SQL_Prepare.ResultSet()[0]';
const CASE_ORDINAL = 'String(activities.iMIS_Case.ImisOrdinal())';
const CONTACT = 'activities.IQA_Contact.ResultSet()[0]';

// The type and subtype ordinals, one item each, read from the body as the
// old flow read them: a plain array of strings.
const TAG_ITEMS = `(function () {
  var body = activities.EndpointData.Output().Body;
  var list = function (value) {
    var text = String(value ?? '').trim();
    return text === '' ? [] : text.split(',').map(function (item) { return item.trim(); }).filter(Boolean);
  };
  return list(body['CaseTypes[]']).concat(list(body['CaseSubTypes[]']));
})()`;
const sqlParameters = pairs => 'JSON.stringify([' + pairs.map(([name, value]) => `{"Name":"${name}","Value":String((${value}) ?? "")}`).join(',') + '])';
const mapping = pairs => 'JSON.stringify([' + pairs.map(([name, value]) => `{"Name":"${name}","Value":String((${value}) ?? "")}`).join(',') + '])';
const AUDIT = [
  ['FirstCreatedBy', `${NEW}.me`],
  ['FirstCreatedOn', `${PREP}.Timestamp`],
  ['LastUpdatedBy', `${NEW}.me`],
  ['LastUpdatedOn', `${PREP}.Timestamp`]
];

// Staff on the case: iMIS row, then the CloudToolz row with its Ordinal.
const STAFF_SQL = `
INSERT INTO [Cases].[i4u_UT_Cases_Staff] (
  Ordinal,
  CaseOrdinal,
  StaffId,
  StaffType,
  [Action],
  FirstCreatedBy,
  FirstCreatedOn,
  LastUpdatedBy,
  LastUpdatedOn
) VALUES (
  CAST(@Ordinal AS int),
  CAST(@CaseOrdinal AS int),
  @StaffId,
  @StaffType,
  'INSERT',
  @LoggedInUser,
  @LocalTimestamp,
  @LoggedInUser,
  @LocalTimestamp
);
`;

const staffSteps = (key, label, staffIdExpression, staffType, row) => [
  [`iMIS_${key}`, `iMIS Insert - i4u_UT_Cases_Staff (${label})`, build.insert('i4u_UT_Cases_Staff', mapping([
    ['CaseOrdinal', CASE_ORDINAL],
    ['StaffId', staffIdExpression],
    ['StaffType', `'${staffType}'`],
    ...AUDIT
  ])), 1, row],
  [`SQL_${key}`, `SQL: CT Insert - i4u_UT_Cases_Staff (${label})`, build.sql(STAFF_SQL, sqlParameters([
    ['@Ordinal', `activities.iMIS_${key}.ImisOrdinal()`],
    ['@CaseOrdinal', CASE_ORDINAL],
    ['@StaffId', staffIdExpression],
    ['@StaffType', `'${staffType}'`],
    ['@LoggedInUser', `${NEW}.me`],
    ['@LocalTimestamp', `${PREP}.Timestamp`]
  ])), 1, row + 1]
];

// A step that failed after the case was saved. The step is named by the
// first activity in the list that has an exception.
const PARTLY_SAVED_STEPS = [
  ['SQL_Case', 'the case in CloudToolz'],
  ['iMIS_Contact', 'the member as a party'],
  ['SQL_Contact', 'the member as a party in CloudToolz'],
  ['iMIS_Lead', 'the lead staff member'],
  ['SQL_Lead', 'the lead staff member in CloudToolz'],
  ['iMIS_Me', 'you as staff'],
  ['SQL_Me', 'you as staff in CloudToolz'],
  ['SQL_NoteLink', 'the link to the note in CloudToolz'],
  ['iMIS_NoteLink', 'the link to the note'],
  ['iMIS_InteractionNote', 'the note from the interaction'],
  ['SQL_InteractionNote', 'the note from the interaction in CloudToolz'],
  ['iMIS_InteractionLink', 'the link to the interaction']
];

const create = assemble('create-case-staff', [
  ['EndpointData', 'HTTP Endpoint', build.endpoint('/Cases/Union-Suite/Create-Case-Staff'), 0, 0],

  ['JS_Prepare', 'JS: Read And Check The Form', build.script(PREPARE), 0, 1],

  ['IF_Valid', 'IF: Nothing Missing', build.when(`getVariable('Problems').length === 0`), 0, 2],

  ['Response_Invalid', 'HTTP Response - Missing Fields', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "getVariable('Problems').join(' ')")}
};
`), 1, 2],

  ['IQA_Contact', 'IQA: Get Contact Info', build.iqa(
    '$/_i4u_/Core/Cases/Value Lists/Case - Form Data/GetContactInfo',
    `'&parameter=' + ${NEW}.memberId`, 1), 0, 3],

  ['Response_LookupFailed', 'HTTP Response - Lookup Failure', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "'The member could not be checked. Nothing was saved; please try again.'")}
};
`), 1, 3],

  ['IF_ContactFound', 'IF: Member Found', build.when(`activities.IQA_Contact.ResultSet().length > 0`), 0, 4],

  ['Response_NoContact', 'HTTP Response - Member Not Found', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "'The member could not be found. Nothing was saved.'")}
};
`), 1, 4],

  ['SQL_Prepare', 'SQL - Entity, Timestamp And Case ID', build.sql(`
-- The case belongs to the member's entity (owner, 29 October 2026; the
-- quick add and update flows check it), and is stamped with that entity's
-- local time.
DECLARE @EntityCode varchar(20) = COALESCE(
  (SELECT TOP 1 EntityCode FROM [ZenCrm].[Individuals] WHERE ImisId = @MemberID),
  (SELECT TOP 1 OrgCode FROM UnionTemplate.Entities WHERE IsDefault = 1)
);
DECLARE @LocalTimestamp datetime = COALESCE([UnionTemplate].fn_GetDateTimeWithTimeZone(@EntityCode), GETUTCDATE());

-- The next case number: C followed by it.
DECLARE @NewID TABLE (ID int);
INSERT INTO [Cases].[Cases]
OUTPUT Inserted.ID INTO @NewID
DEFAULT VALUES;

SELECT
  'C' + CAST((SELECT TOP 1 ID FROM @NewID) AS varchar(20)) AS CaseID,
  @EntityCode AS EntityCode,
  CONVERT(varchar(23), @LocalTimestamp, 126) AS [Timestamp];
`, sqlParameters([['@MemberID', `${NEW}.memberId`]])), 0, 5],

  ['Response_Failed', 'HTTP Response - Not Saved', build.respond(`
return {
  Error: true,
  "class-html-Message": ${MESSAGE('error', "'The case could not be created. Nothing was saved; please try again, or contact an administrator if it keeps happening.'")}
};
`), 1, 5],

  ['iMIS_Case', 'iMIS Insert - i4u_UT_Cases', build.insert('i4u_UT_Cases', mapping([
    ['CaseID', `${PREP}.CaseID`],
    ['ImisID', `${NEW}.memberId`],
    ['PrimaryContactID', `${NEW}.memberId`],
    ['CaseName', `${NEW}.name`],
    ['Description', `${NEW}.description`],
    ['Date', `${NEW}.date`],
    ['Access', `${NEW}.access`],
    ['Priority', `${NEW}.priority`],
    ['Status', `${NEW}.status`],
    ['StaffLeadID', `${NEW}.lead`],
    ['PrimaryWorkplaceID', `${NEW}.workplace`],
    ['OrgCode', `${PREP}.EntityCode`],
    ...AUDIT
  ])), 0, 6],

  ['SQL_Case', 'SQL: CT Insert - i4u_UT_Cases', build.sql(`
-- The column names are the table's own (PrimaryContctID, FirstCreatecBy,
-- LastUpdateOn).
INSERT INTO [Cases].[i4u_UT_Cases] (
  Ordinal,
  CrmID,
  CaseID,
  CaseName,
  [Description],
  [Date],
  Access,
  Priority,
  [Status],
  PrimaryContctID,
  StaffLeadID,
  PrimaryWorkplaceID,
  OrgCode,
  FirstCreatecBy,
  FirstCreatedOn,
  LastUpdatedBy,
  LastUpdateOn
)
SELECT
  CAST(@Ordinal AS int),
  (SELECT TOP 1 ID FROM [ZenCrm].[Individuals] WHERE ImisID = @MemberID),
  @CaseID,
  @CaseName,
  @Description,
  NULLIF(@Date, ''),
  @Access,
  @Priority,
  @Status,
  @MemberID,
  NULLIF(@Lead, ''),
  NULLIF(@Workplace, ''),
  @EntityCode,
  @LoggedInUser,
  @LocalTimestamp,
  @LoggedInUser,
  @LocalTimestamp;
`, sqlParameters([
    ['@Ordinal', CASE_ORDINAL],
    ['@MemberID', `${NEW}.memberId`],
    ['@CaseID', `${PREP}.CaseID`],
    ['@CaseName', `${NEW}.name`],
    ['@Description', `${NEW}.description`],
    ['@Date', `${NEW}.date`],
    ['@Access', `${NEW}.access`],
    ['@Priority', `${NEW}.priority`],
    ['@Status', `${NEW}.status`],
    ['@Lead', `${NEW}.lead`],
    ['@Workplace', `${NEW}.workplace`],
    ['@EntityCode', `${PREP}.EntityCode`],
    ['@LoggedInUser', `${NEW}.me`],
    ['@LocalTimestamp', `${PREP}.Timestamp`]
  ])), 0, 7],

  ['iMIS_Contact', 'iMIS Insert - i4u_UT_Cases_Contacts', build.insert('i4u_UT_Cases_Contacts', mapping([
    ['CaseOrdinal', CASE_ORDINAL],
    ['ContactId', `${NEW}.memberId`],
    ['ContactName', `${CONTACT}.Name`],
    ['ContactType', "'Member'"],
    ['ContactPhone', `${CONTACT}.Mobile`],
    ['ContactEmail', `${CONTACT}.Email`],
    ...AUDIT
  ])), 0, 8],

  ['SQL_Contact', 'SQL: CT Insert - i4u_UT_Cases_Contacts', build.sql(`
INSERT INTO [Cases].[i4u_UT_Cases_Contacts] (
  Ordinal,
  CaseOrdinal,
  ContactId,
  ContactName,
  ContactType,
  ContactPhone,
  ContactEmail,
  ContactRole,
  ContactIsExternal,
  [Action],
  FirstCreatedBy,
  FirstCreatedOn,
  LastUpdatedBy,
  LastUpdatedOn
) VALUES (
  CAST(@Ordinal AS int),
  CAST(@CaseOrdinal AS int),
  @ContactID,
  @ContactName,
  'Member',
  @ContactPhone,
  @ContactEmail,
  '',
  0,
  'INSERT',
  @LoggedInUser,
  @LocalTimestamp,
  @LoggedInUser,
  @LocalTimestamp
);
`, sqlParameters([
    ['@Ordinal', 'activities.iMIS_Contact.ImisOrdinal()'],
    ['@CaseOrdinal', CASE_ORDINAL],
    ['@ContactID', `${NEW}.memberId`],
    ['@ContactName', `${CONTACT}.Name`],
    ['@ContactPhone', `${CONTACT}.Mobile`],
    ['@ContactEmail', `${CONTACT}.Email`],
    ['@LoggedInUser', `${NEW}.me`],
    ['@LocalTimestamp', `${PREP}.Timestamp`]
  ])), 0, 9],

  ['IF_Lead', 'IF: Lead Chosen', build.when(`${NEW}.lead !== ''`), 0, 10],
  ...staffSteps('Lead', 'Lead', `${NEW}.lead`, 'Primary', 10),

  ['IF_AssignMe', 'IF: Assign Me', build.when(`${NEW}.assignMe`), 0, 12],
  // "No type" (owner, 29 October 2026): set later on the case.
  ...staffSteps('Me', 'Assign Me', `${NEW}.me`, '', 12),

  ['ForEach_Tag', 'For Each: Type And Subtype', build.forEach(TAG_ITEMS), 0, 14],

  ['iMIS_Tag', 'iMIS Insert - i4u_UT_Tags', build.insert('i4u_UT_Tags', mapping([
    ['ModuleOrdinal', CASE_ORDINAL],
    ['ContactID', `${NEW}.memberId`],
    ['TagOrdinal', 'activities.ForEach_Tag.Output()'],
    ['LastUpdatedBy', `${NEW}.me`]
  ])), 1, 14],

  ['SQL_Tag', 'SQL: CT Insert - i4u_UT_Tags', build.sql(`
INSERT INTO [Cases].[i4u_UT_Tags] (
  Ordinal,
  ModuleOrdinal,
  ContactID,
  TagOrdinal,
  LastUpdateBy,
  [Action]
) VALUES (
  CAST(@Ordinal AS int),
  CAST(@CaseOrdinal AS int),
  @ContactID,
  @TagOrdinal,
  @LoggedInUser,
  'INSERT'
);
`, sqlParameters([
    ['@Ordinal', 'activities.iMIS_Tag.ImisOrdinal()'],
    ['@CaseOrdinal', CASE_ORDINAL],
    ['@ContactID', `${NEW}.memberId`],
    ['@TagOrdinal', 'activities.ForEach_Tag.Output()'],
    ['@LoggedInUser', `${NEW}.me`]
  ])), 1, 15],

  ['JS_TagFailed', 'JS: Note The Tag That Failed', build.script(`
// The other tags go on; the answer says which did not save.
var failed = getVariable('TagProblems') || [];
failed.push(String(activities.ForEach_Tag.Output()));
setVariable('TagProblems', failed);
`), 2, 15],

  ['IF_Interaction', 'IF: From An Interaction', build.when(`${NEW}.interactionOrdinal !== ''`), 0, 16],

  ['JS_Interaction', 'JS: Read The Interaction', build.script(`
// The page passes the interaction as JSON in Prefill.
var interaction = JSON.parse(activities.EndpointData.Output().Body.Prefill);
setVariable('Interaction', {
  note: interaction.Note,
  createdOn: interaction.CreatedOn,
  createdBy: interaction.CreatedBy,
  assignedTo: interaction.AssignedTo,
  followUpDate: interaction.FollowUpDate
});
`), 1, 16],

  ['iMIS_InteractionNote', 'iMIS Insert - Zen_CloudFiles_Notes', build.insert('Zen_CloudFiles_Notes', mapping([
    ['CaseID', `${PREP}.CaseID`],
    ['CaseOrdinal', CASE_ORDINAL],
    ['ImisID', `${NEW}.memberId`],
    ['Note', "getVariable('Interaction').note"],
    ['Category', "'Case'"],
    ['Access', "'Open'"],
    ['PrimaryStaffLead', "getVariable('Interaction').assignedTo"],
    ['Deadline', "getVariable('Interaction').followUpDate"],
    ['CreatedOn', "getVariable('Interaction').createdOn"],
    ['FirstCreatedOn', "getVariable('Interaction').createdOn"],
    ['FirstCreatedBy', "getVariable('Interaction').createdBy"],
    ['LastUpdatedOn', "getVariable('Interaction').createdOn"],
    ['LastUpdatedBy', "getVariable('Interaction').createdBy"]
  ])), 1, 17],

  ['SQL_InteractionNote', 'SQL: CT Insert - Zen_CloudFiles_Notes', build.sql(`
IF NOT EXISTS (SELECT 1 FROM [ZideBar].[Zen_CloudFiles_Notes] WHERE Ordinal = CAST(@Ordinal AS int))
BEGIN
  INSERT INTO [ZideBar].[Zen_CloudFiles_Notes] (
    Ordinal,
    CaseOrdinal,
    CrmID,
    Note,
    Category,
    Access,
    PrimaryStaffLead,
    Deadline,
    CreatedOn,
    FirstCreatedOn,
    FirstCreatedBy,
    LastUpdatedOn,
    LastUpdatedBy
  ) VALUES (
    CAST(@Ordinal AS int),
    CAST(@CaseOrdinal AS int),
    @MemberID,
    @Note,
    'Case',
    'Open',
    @AssignedTo,
    NULLIF(@FollowUpDate, ''),
    @CreatedOn,
    @CreatedOn,
    @CreatedBy,
    @CreatedOn,
    @CreatedBy
  );
END
`, sqlParameters([
    ['@Ordinal', 'activities.iMIS_InteractionNote.ImisOrdinal()'],
    ['@CaseOrdinal', CASE_ORDINAL],
    ['@MemberID', `${NEW}.memberId`],
    ['@Note', "getVariable('Interaction').note"],
    ['@AssignedTo', "getVariable('Interaction').assignedTo"],
    ['@FollowUpDate', "getVariable('Interaction').followUpDate"],
    ['@CreatedOn', "getVariable('Interaction').createdOn"],
    ['@CreatedBy', "getVariable('Interaction').createdBy"]
  ])), 1, 18],

  ['iMIS_InteractionLink', 'iMIS Update - i4u_UT_Interactions', build.updateMulti('i4u_UT_Interactions',
    `JSON.stringify([{"Name":"CaseOrdinal","Value":${CASE_ORDINAL}}])`,
    `${NEW}.memberId`, `${NEW}.interactionOrdinal`), 1, 19],

  ['IF_Note', 'IF: From A Note', build.when(`${NEW}.noteOrdinal !== ''`), 0, 17],

  ['SQL_NoteLink', 'SQL: CT Update - Zen_CloudFiles_Notes', build.sql(`
UPDATE [ZideBar].[Zen_CloudFiles_Notes]
SET CaseOrdinal = CAST(@CaseOrdinal AS int)
WHERE Ordinal = CAST(@NoteOrdinal AS int);
`, sqlParameters([
    ['@CaseOrdinal', CASE_ORDINAL],
    ['@NoteOrdinal', `${NEW}.noteOrdinal`]
  ])), 2, 17],

  ['iMIS_NoteLink', 'iMIS Update - Zen_CloudFiles_Notes', build.updateSingle('Zen_CloudFiles_Notes',
    `JSON.stringify([{"Name":"CaseOrdinal","Value":${CASE_ORDINAL}}])`,
    `${NEW}.noteOrdinal`), 2, 18],

  ['JS_CreateLogContext', 'JS: Create Log Context', build.script(`
// One change-log entry for the whole creation (owner, 29 October 2026): the
// case's "Case added" card lists what was set. Field names read as words in
// the change history (LeadStaff: "Lead staff").
var newCase = getVariable('NewCase');
var prepared = activities.SQL_Prepare.ResultSet()[0];
var contact = activities.IQA_Contact.ResultSet()[0];
var named = function (name, value) { return name !== '' ? name : value; };

var logContext = {
    "Note": "Case " + prepared.CaseID + ": Created",
    "Table": "i4u_UT_Cases",
    "UpdateReason": "Add",
    "workflowDefinitionId": workflowDefinitionId, // DON'T UPDATE, VARIABLE IS PROVIDED BY CLOUDTOOLZ
    "sourceOrdinal": String(activities.iMIS_Case.ImisOrdinal())
};

var logBody = {
    "Title": newCase.name,
    "Types": named(newCase.names.types, newCase.types),
    "Subtypes": named(newCase.names.subTypes, newCase.subTypes),
    "Description": newCase.description,
    "DateOfIncident": newCase.date,
    "PrimaryParty": String(contact.Name ?? '') + ' (' + newCase.memberId + ')',
    "Workplace": newCase.workplace === '0' ? 'Not about a workplace' : named(newCase.names.workplace, newCase.workplace),
    "LeadStaff": named(newCase.names.lead, newCase.lead),
    "AssignedStaff": newCase.assignMe ? named(newCase.names.me, newCase.me) : '',
    "Priority": named(newCase.names.priority, newCase.priority),
    "Access": newCase.access,
    "Status": newCase.status,
    "CreatedFrom": newCase.interactionOrdinal !== '' ? 'Interaction ' + newCase.interactionOrdinal
        : newCase.noteOrdinal !== '' ? 'Note ' + newCase.noteOrdinal : ''
};

// An Add logs only the values given: the logging flow writes a row for every
// field listed, blank or not.
var fieldsToCompare = Object.keys(logBody).filter(function (field) { return logBody[field] !== ''; });

setVariable('logChanges', {
    "logContext": logContext, // DON'T CHANGE
    "fieldsToCompare": fieldsToCompare, // DON'T CHANGE
    "body": logBody,
    "profileID": String(prepared.CaseID), // the case the change belongs to
    "updatedByID": newCase.me
});
`), 0, 19],

  ['LogChangesToIMIS', 'Log Changes To IMIS', build.runWorkflow(
    "getWorkflowDefinitionIdByName('LogChangesToIMIS')", "getVariable('logChanges')"), 0, 20],

  ['Response_Created', 'HTTP Response - Created', build.respond(`
// The form opens the case: from CaseID and CaseNum, or the link.
var caseId = activities.SQL_Prepare.ResultSet()[0].CaseID;
var caseNum = String(activities.iMIS_Case.ImisOrdinal());
var link = '/Cases_ManageCase?CaseID=' + caseId + '&CaseNum=' + caseNum;
var tags = getVariable('TagProblems') || [];

if (tags.length) {
  return {
    Partial: true,
    CaseID: caseId,
    CaseNum: caseNum,
    "class-html-Message": ${MESSAGE('error', "'Case ' + caseId + ' was created, but ' + tags.length + (tags.length === 1 ? ' type' : ' types') + ' could not be added (' + tags.join(', ') + '). <a href=\"' + link + '\">Open ' + caseId + '</a> to add them.'")}
  };
}

return {
  CaseID: caseId,
  CaseNum: caseNum,
  "class-html-Message": ${MESSAGE('success', "'Case: <a href=\"' + link + '\">' + caseId + '</a> Successfully Created'")}
};
`), 0, 21],

  ['Response_PartlySaved', 'HTTP Response - Partly Saved', build.respond(`
// The case exists, but a later step failed. Name the step and link the case.
var steps = ${JSON.stringify(PARTLY_SAVED_STEPS)};
var step = 'a later step';
var detail = '';
steps.forEach(function (entry) {
  try {
    var activity = activities[entry[0]];
    var exception = activity && activity.Exception ? activity.Exception() : null;
    if (exception && detail === '') {
      step = entry[1];
      detail = String(exception);
    }
  } catch (error) {
    // The step did not run.
  }
});

var caseId = activities.SQL_Prepare.ResultSet()[0].CaseID;
var caseNum = String(activities.iMIS_Case.ImisOrdinal());
var link = '/Cases_ManageCase?CaseID=' + caseId + '&CaseNum=' + caseNum;

return {
  Partial: true,
  CaseID: caseId,
  CaseNum: caseNum,
  FailedStep: step,
  Detail: detail,
  "class-html-Message": ${MESSAGE('error', "'Case ' + caseId + ' was created, but ' + step + ' could not be saved. <a href=\"' + link + '\">Open ' + caseId + '</a> to finish it, or contact an administrator.'")}
};
`), 2, 21]
], [
  ['EndpointData', 'Done', 'JS_Prepare'],
  ['JS_Prepare', 'Done', 'IF_Valid'],
  ['IF_Valid', 'True', 'IQA_Contact'],
  ['IF_Valid', 'False', 'Response_Invalid'],
  ['IQA_Contact', 'True', 'IF_ContactFound'],
  ['IQA_Contact', 'False', 'Response_LookupFailed'],
  ['IF_ContactFound', 'True', 'SQL_Prepare'],
  ['IF_ContactFound', 'False', 'Response_NoContact'],
  ['SQL_Prepare', 'Done', 'iMIS_Case'],
  ['SQL_Prepare', 'Error', 'Response_Failed'],
  ['iMIS_Case', 'True', 'SQL_Case'],
  ['iMIS_Case', 'False', 'Response_Failed'],
  ['SQL_Case', 'Done', 'iMIS_Contact'],
  ['SQL_Case', 'Error', 'Response_PartlySaved'],
  ['iMIS_Contact', 'True', 'SQL_Contact'],
  ['iMIS_Contact', 'False', 'Response_PartlySaved'],
  ['SQL_Contact', 'Done', 'IF_Lead'],
  ['SQL_Contact', 'Error', 'Response_PartlySaved'],

  ['IF_Lead', 'True', 'iMIS_Lead'],
  ['IF_Lead', 'False', 'IF_AssignMe'],
  ['iMIS_Lead', 'True', 'SQL_Lead'],
  ['iMIS_Lead', 'False', 'Response_PartlySaved'],
  ['SQL_Lead', 'Done', 'IF_AssignMe'],
  ['SQL_Lead', 'Error', 'Response_PartlySaved'],

  ['IF_AssignMe', 'True', 'iMIS_Me'],
  ['IF_AssignMe', 'False', 'ForEach_Tag'],
  ['iMIS_Me', 'True', 'SQL_Me'],
  ['iMIS_Me', 'False', 'Response_PartlySaved'],
  ['SQL_Me', 'Done', 'ForEach_Tag'],
  ['SQL_Me', 'Error', 'Response_PartlySaved'],

  ['ForEach_Tag', 'Iterate', 'iMIS_Tag'],
  ['iMIS_Tag', 'True', 'SQL_Tag'],
  ['iMIS_Tag', 'False', 'JS_TagFailed'],
  ['SQL_Tag', 'Error', 'JS_TagFailed'],
  ['ForEach_Tag', 'Done', 'IF_Interaction'],

  ['IF_Interaction', 'True', 'JS_Interaction'],
  ['IF_Interaction', 'False', 'IF_Note'],
  ['JS_Interaction', 'Done', 'iMIS_InteractionNote'],
  ['iMIS_InteractionNote', 'True', 'SQL_InteractionNote'],
  ['iMIS_InteractionNote', 'False', 'Response_PartlySaved'],
  ['SQL_InteractionNote', 'Done', 'iMIS_InteractionLink'],
  ['SQL_InteractionNote', 'Error', 'Response_PartlySaved'],
  ['iMIS_InteractionLink', 'True', 'JS_CreateLogContext'],
  ['iMIS_InteractionLink', 'False', 'Response_PartlySaved'],

  ['IF_Note', 'True', 'SQL_NoteLink'],
  ['IF_Note', 'False', 'JS_CreateLogContext'],
  ['SQL_NoteLink', 'Done', 'iMIS_NoteLink'],
  ['SQL_NoteLink', 'Error', 'Response_PartlySaved'],
  ['iMIS_NoteLink', 'True', 'JS_CreateLogContext'],
  ['iMIS_NoteLink', 'False', 'Response_PartlySaved'],

  ['JS_CreateLogContext', 'Done', 'LogChangesToIMIS'],
  ['LogChangesToIMIS', 'Done', 'Response_Created'],
  ['LogChangesToIMIS', 'Not Found', 'Response_Created']
]);

/* ---------- The export ---------- */

function flowFrom(displayName, endpointPath, built) {
  const flow = exported.flowz.find(entry => entry.displayName === displayName);
  const hierarchy = exported.hierarchies.find(entry => entry.displayName === displayName);
  if (!flow || !hierarchy) {
    throw new Error('Not in the export: ' + displayName);
  }
  return {
    hierarchy: {...hierarchy, endpointPath, isPublished: true, lastExecutedAt: null, latestInstanceStatus: null},
    flow: {...flow, name: displayName, isPublished: true, isLatest: true, activities: built.activities, connections: built.connections}
  };
}

const flows = [
  flowFrom('UnionSuite Cases: Prefill Create Case - Staff Form', '/Cases/Union-Suite/Create-Case-Staff-Prefill', prefill),
  flowFrom('UnionSuite Cases: Create Case - Staff Form', '/Cases/Union-Suite/Create-Case-Staff', create)
];

const output = {
  ...exported,
  hierarchies: flows.map(entry => entry.hierarchy),
  flowz: flows.map(entry => entry.flow)
};

fs.mkdirSync(path.dirname(target), {recursive: true});
fs.writeFileSync(target, JSON.stringify(output, null, 2));
console.log('Wrote ' + target);
flows.forEach(entry => console.log('  ' + entry.flow.displayName + ': ' + entry.flow.activities.length + ' activities, ' + entry.hierarchy.endpointPath));
