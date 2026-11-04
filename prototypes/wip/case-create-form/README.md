# Create case form (WIP)

A streamlined staff Create case form, to be built in BeyondFormz. Owner,
29 October 2026: "a new, streamlined version … incorporating the new features
we've built as part of cases (eg. select workplace), and a nicer UX."

**Status:** the BeyondFormz form is imported on the dev tenant (29 October
2026). The contact page's Create case (`member.create-case`) opens it at
the shortcut `/Cases_CreateCase?ID=<member>`. Opened without an `ID`, it shows no member, says a case needs one (open Create case from the member's profile) and Create case cannot be pressed (29 October 2026). Its two new flows are built (`flows/`) but **not yet imported**;
the form's export now points at them.

**Promoted to the theme (2 November 2026):** the form's styles, the
generic `us-bf-*` classes, moved from `case-create-form.candidate.css`
(retired) into `zUnionSuite.css` (`US-BEYOND-FORMS`), with the guide's
"Designed BeyondForms forms" section (`#beyond-forms-designed`). The
Access buttons now look like the section tabs (track, white chosen button,
accent mark). The form's export no longer carries a copy of the styles, so
upload `zUnionSuite.css` before importing it. The form's script stays in
the form (`beyondformz/form-inject.js`): its behaviour is this form's own.

## The BeyondFormz build (`beyondformz/`)

`node beyondformz/build-form.cjs <export.json> [output.json]` reads a
BeyondFormz export of the form, keeps its form record and field
properties, and writes the new field list and scripts (default output
`beyondformz/dist/Create-Case-Staff-Form.json`, ignored by Git). Edit the
sources, never the export:

| File | Goes into |
|---|---|
| `form-inject.js` | JavaScript to inject; its `us-bf-*` classes are styled by the theme (`US-BEYOND-FORMS`) |
| `prefill.js` | The autoexecute (`Cases/Union-Suite/Create-Case-Staff-Prefill`) field's JavaScript |
| `create-button.js` | Create case's JavaScript (`Cases/Union-Suite/Create-Case-Staff`) |
| `preview.html` / `preview.js` | A stand-in for BeyondFormz's renderer that runs the built export's scripts on sample flow answers (`?prefill=today|new`, `&from=member|note`, `&save=ok|partial|fail`, `&scheme=light|dark`, `&ID=` for no member). Not BeyondFormz: check the real form after importing |

**What the form does:** Type, Subtype (every enabled subtype, read once
from `$/_i4u_/Core/Cases/Layouts v2/API - Value List - Subtypes` through
`GET /api/query`, shown for the chosen types; see below), Date of
incident (no later than today, so the picker greys out later days; a
Today chip under it, and Clear date while it has a date, as the task
form's quick dates, `us-bf-quick`), the note it starts from, Lead staff
(a single searchable list: Lead staff and Workplace open with the cursor
in their search box, 2 November 2026, as a second click was needed on the
dev tenant) starting empty with "Assign me to this case" while the lead is empty or
someone else (owner, 29 October 2026), Priority Normal, Access buttons
(Who can see it comes before the staff; Individual needs a lead or Assign me, which it frames as one group titled "Staff on this case * (one of)", with one line inside it while nobody is on the case, amber until Create case is pressed and red after), the FormFields rules (Visible 0
hides; IsRequired marks; Editable 0 disables; fields without a rule show),
the checks on Create, the chosen names for the change log
(`CaseTypeNames`, `CaseSubTypeNames`, `LeadStaffName`, `AssignMeName`,
`WorkplaceName`, `PriorityName`, added by script), and opening the case on
success. An `Error` answer (nothing saved) or a `Partial` one (saved, with
a step missing; its message links the case) keeps the form open.

## The flows (`flows/`)

`node flows/build-flows.cjs <flowz-export.json> [output.json]` builds both
into one Flowz export (default `flows/dist/Create-Case-Staff-Flows.json`,
ignored by Git), from the owner's export of the two "UnionSuite Cases"
copies (29 October 2026). It keeps their `definitionId` and `versionId`, so
importing overwrites the copies. Edit the script, never the export.

**UnionSuite Cases: Prefill Create Case - Staff Form**,
`POST /Cases/Union-Suite/Create-Case-Staff-Prefill`. (The copy it replaces
was the Edit case prefill, on the live Edit flow's path
`/cases/preload-edit`.) Answers `{ReqVals, Member, Workplaces, Note}`; each
part but the rules is left out if it cannot be read, so the form still
opens:

- `ReqVals`: `UnionTemplate.FormFields`, Cases / CreateCaseStaff.
- `Member` {Name, ID}: `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/GetContactInfo`. Only with an `ID` on the page: without one the member and jobs lookups are skipped (asked with a blank ID they returned their first row, "(Erased) (Erased)"; 29 October 2026), and the form draws a member line only for the page's own `ID`.
- `Workplaces`: `$/_i4u_/Core/Cases/Layouts v2/API - Create Case - Member Workplaces`
  (built by the owner, 29 October 2026; prompt `Member ID`, required;
  checked through `/api/query` for 100020 and 104038: one active job each,
  with Workplace ID, Workplace Name, Workplace Type, Member Job Status, Job
  Start Date, Job End Date). As specified:
  a copy of `API - Manage Case - Primary Contacts Workplaces` with its
  CaseNum filter swapped for one required prompted filter on the member's
  ID (the flow passes it as the first parameter). Columns, matched whatever
  their case or spacing: Workplace ID (required; the value saved),
  Workplace Name (required), Member Job Status (Active, Not Started,
  Finished; blank is Active), Job Start Date, Job End Date, and optionally
  Work-Employer and Work-Classification (else Workplace Type) for each
  job's second line. One row per job, at most 100. Until it exists the
  step fails quietly and Workplace stays hidden.
- `Note` {Note, CreatedOn}: the `NoteOrdinal` note
  (`ZideBar.Zen_CloudFiles_Notes`), or the interaction passed in `Prefill`.

Not yet: the member's type and standing on the for line (needs an IQA by
member ID).

**Subtypes (2 November 2026):** the form reads
`$/_i4u_/Core/Cases/Layouts v2/API - Value List - Subtypes` (Ordinal,
TagName, TagStatus, ParentTagOrdinal, ParentTagName) once as it starts,
in place of the hidden `SubTypeSession` button and `Cases/SetSessionStorage`
(both removed). The IQA's `ParentTagOrdinal` filter is optional but keeps
a default of 0, which returns nothing, so the form sends it blank; blank
returns every subtype (13 on the dev tenant). `TagStatus` is a yes/no:
a disabled tag (false) is not offered on a new case. Owner: a disabled
tag stays visible on the cases that already have it but cannot be added,
so the case page's tag editing should use the same IQA and rule.

**UnionSuite Cases: Create Case - Staff Form**,
`POST /Cases/Union-Suite/Create-Case-Staff`. In the quick-add flows'
pattern (`ValidateImisRequest` on the endpoint, iMIS then CloudToolz for
each record, one log through `LogChangesToIMIS`):

1. Read and check the form (member, a type, what happened; an Individual
   case needs a lead or Assign me). Problems answer `Error` and save nothing.
2. `GetContactInfo` for the member (name, mobile, email); not found:
   `Error`.
3. SQL: the member's entity (`ZenCrm.Individuals.EntityCode`, else the
   default entity; owner, 29 October 2026: the case's OrgCode comes from
   the member), its local timestamp, and the next case ID
   (`[Cases].[Cases]`, "C" + ID).
4. The case: `i4u_UT_Cases` in iMIS, then CloudToolz (with
   `PrimaryWorkplaceID`; blank not chosen, 0 not about a workplace).
5. The member as the primary party, ContactType Member:
   `i4u_UT_Cases_Contacts`.
6. The lead (if chosen): `i4u_UT_Cases_Staff`, StaffType Primary.
7. Assign me (if ticked and not the lead): `i4u_UT_Cases_Staff`, no
   StaffType (owner, 29 October 2026).
8. Each type and subtype: `i4u_UT_Tags` (ContactID the member). A failed
   tag is noted and the rest go on.
9. The interaction (a note made from it, then the interaction stamped with
   the case) or the note (stamped with the case), as the old flow did.
10. One change-log entry for the whole creation (owner, 29 October 2026):
    Title, Types, Subtypes, Description, Date of incident, Primary party,
    Workplace, Lead staff, Assigned staff, Priority, Access, Status,
    Created from; blank ones left out.
11. Answers `{CaseID, CaseNum}` and the success message. A step that fails
    after the case exists answers `Partial` with the step named and the
    case linked.

Dropped from the old flow: the six `Cases: Add History` summaries (the log
replaces them), the creator's automatic staff row (now Assign me), browser
timestamps (now the entity's local time) and the `Form/Validation` call.
Fixed: the lead's CloudToolz row (it recorded the creator as the lead, used
the lead's party ID as its Ordinal and was written twice), subtype tags
saved against the creator, and ContactType "Please Enter".

**To put it live:** import the flows export (both flows), then the form
export, in that order; the form calls the new paths.

**First run on the dev tenant (29 October 2026):**

- The create flow answered 400 until its endpoint path matched the form's
  `executeFlow` case exactly (`/Cases/Union-Suite/Create-Case-Staff`).
  Both paths now match the form's casing.
- Case C222 was created without its types: the tag loop's items were built
  from lists kept in a flow variable, which CloudToolz's JavaScript hands
  back as .NET lists that `concat` does not unpack, so it looped over two
  whole lists. The loop now reads the ordinals from the request body, as
  the old flow did, and the variable keeps them as text. Rebuilt; not yet
  re-run. C222 is a test case missing its types.

**Seen on the dev tenant (29 October 2026, first import):** the header
fields take their className, and BeyondFormz fills the IQA lists *after*
the injected script runs. The script now waits for each list (Lead staff,
Priority, Access) before setting it up, and keeps the form hidden until the
prefill and the lists are in; the stand-in fills its lists late too.
Subtype stayed empty on the first import: the script pressed the hidden
`SubTypeSession` button while the form was still loading, probably
before BeyondFormz had wired it. It now presses it once the prefill has
answered (the stand-in wires its buttons late), uses the old form's
session-storage copy meanwhile, and warns in the console if no subtypes
arrive.

**Probed on the dev tenant (29 October 2026, `tools/probe-create-case-form.js`,
saves blocked):**

- A field added by script inside `.rendered-form` is sent with the flow:
  BeyondFormz posts every named input, select and textarea in the form
  (`formrenderV20.es.js`), not only configured fields.
- BeyondFormz binds its flow buttons with delegated click handlers on
  `document`; the form's capture-phase listener runs first. Create case
  with a required field empty sent nothing; filled, the body was as
  expected, and the button came back after the (blocked) answer.
- Subtypes work: `Cases/SetSessionStorage` returns 22 rows (`label`,
  `value`, `ParentTag`, `selected`; top-level tags come back with
  ParentTag 0). Discrimination shows Age, Disability and Gender.
  Bullying / Harassment has no subtypes, so its field stays hidden.
- The Child Tags IQA (`$/_i4u_/SandBox/CRM Layouts/Child Tags`, prompt
  `ParentTag` on `ParentTagOrdinal`, required) returns the same children
  (60: 3 rows: Ordinal, TagName, ParentTagOrdinal, ParentTagName), so it
  could replace the hidden button.
- Lead staff does not start as the signed-in user when that user is not in
  `Get Staff Members` (104023 was not; the list does include an
  organisation and Hub Record).

The script-added fields findings, the test and the planned flow-driven
fields are written up in
[`docs/BEYONDFORMZ-DYNAMIC-FIELDS.md`](../../../docs/BEYONDFORMZ-DYNAMIC-FIELDS.md).

**Real save (29 October 2026, owner's request):** test case C221
(CaseNum 220, member 100020, "TEST - script-added fields check (safe to
delete)") was created with three fields added by script after load: a
text input, a hidden input and a multi-select with two values. All three
reached `Cases/Create-Case-Staff` in the form-encoded body
(`DynText_…=…`, `DynHidden_…=…`, and the multi-select as a repeated
`DynMulti_…[]` with `alpha` and `beta`, as `CaseTypes[]` arrives). The flow
answered its usual success message, and the form opened
`/Cases_ManageCase?CaseID=C221&CaseNum=220` from the link in it. (Since
4 November 2026 the form puts that link under the current website's path
from `gWebSiteRoot`, e.g. `/UTNewTheme/Cases_ManageCase?…`, in both the
redirect and the flow's message links. Several websites share the domain,
and a bare shortcut opens the default website: on the dev tenant, UTTemplate's
Orion case page.) The
CloudToolz request log shows the flow's `Body` as strings by name, the
multi-select joined (`"DynMulti_…[]": "alpha,beta"`), so a value that
contains a comma cannot be told apart from two values. BeyondFormz also
sends `selectedpartyid` (the page's `ID`), `loggedinpartyid` and
`beyondformid` as headers.

## Problem

The current form ("Create Case - Staff Form", `2f9bd9fb-…`, on
`/_i4u_/Core/Cases/Create-Case-Staff.aspx?ID=<member>`, opened by the contact
page's `member.create-case`):

- hides every field until `Cases/Create-Prefill` answers, then shows them
  (the FormFields table decides visibility and required);
- loads subtypes through two hidden buttons (`SubTypeSession`, `SubTypeFire`),
  session storage and a one-second wait;
- asks for Status (a new case is New) and Workbench (the create flow never
  saves it);
- does not ask which of the member's jobs the case is about
  (`PrimaryWorkplaceID`, C42 on the case page), nor say who the case is for;
- greys out Create case until the required fields are filled, then runs
  `Form/Validation` and a hidden submit button: two round trips;
- ends with a message and a link instead of opening the new case.

## The mock-up

`index.html`: the form drawn as BeyondFormz renders it, styled by the live
theme (US-BEYOND-FORMS, which now holds the form's `us-bf-*` styles). The notes
beside the form list what changes, the BeyondFormz field list, the flow
changes and the open decisions.

Preview: serve the project root (`static-node`) and open
`http://localhost:8778/prototypes/wip/case-create-form/index.html`.
Toolbar / address: `?jobs=several|one|none`,
`&standing=financial|new|unfinancial`, `&from=member|note`, `&save=ok|fail`,
`&scheme=light|dark`. Select2 and jQuery come from public CDNs.

## Files

| File | What |
|---|---|
| `index.html` | The mock-up page, the form's markup and the notes |
| `case-create-form.js` | Preview toolbar and sample prefill data, then the behaviour the form's injected script would have |
| `beyondformz/` | The BeyondFormz export build, its scripts and the stand-in preview |
| `flows/build-flows.cjs` | The prefill and create flows, built into one Flowz export |

## Open decisions

1. Is Title required?
2. Several current jobs: leave Workplace empty, or pick the member's primary job?
3. Cancel: straight back to the member's page, or ask first when something has been typed?
4. Clean the Get Staff Members IQA (it lists organisations and Hub Record)?
5. Where the `us-bf-*` CSS lives: the theme (every BeyondFormz form can use
   it) or the form's own injected style (works without the theme).

## Sources

The owner's exports, 28 October 2026: the BeyondFormz form, the Flowz
`Case: Create-Prefill`, `Cases: Create Case Staff` and
`Form Validation: Validate`, and the rendered form's HTML. Not kept here.
