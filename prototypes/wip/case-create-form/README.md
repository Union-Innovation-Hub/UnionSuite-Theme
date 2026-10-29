# Create case form (WIP)

A streamlined staff Create case form, to be built in BeyondFormz. Owner,
29 October 2026: "a new, streamlined version … incorporating the new features
we've built as part of cases (eg. select workplace), and a nicer UX."

**Status: BeyondFormz export built, 29 October 2026; not yet imported or
tried on the dev tenant.** Built from the owner's copy of the form
("UnionSuite: Create Case - Staff Form", `99586023-…`); the flows are
unchanged.

## The BeyondFormz build (`beyondformz/`)

`node beyondformz/build-form.cjs <export.json> [output.json]` reads a
BeyondFormz export of the form, keeps its form record and field
properties, and writes the new field list and scripts (default output
`beyondformz/dist/Create-Case-Staff-Form.json`, ignored by Git). Edit the
sources, never the export:

| File | Goes into |
|---|---|
| `form-inject.js` | JavaScript to inject; the build writes `case-create-form.candidate.css` into it as a style tag |
| `prefill.js` | The autoexecute (`Cases/Create-Prefill`) field's JavaScript |
| `subtypes-button.js` | The hidden `SubTypeSession` button's JavaScript (`Cases/SetSessionStorage`) |
| `create-button.js` | Create case's JavaScript (`Cases/Create-Case-Staff`) |
| `preview.html` / `preview.js` | A stand-in for BeyondFormz's renderer that runs the built export's scripts on sample flow answers (`?prefill=today|new`, `&from=member|note`, `&save=ok|fail`, `&scheme=light|dark`). Not BeyondFormz: check the real form after importing |

**Works with today's flows:** Type, Subtype (the hidden button fetches every
subtype once; no session storage), the note (today's "Created from Note:"
description loses its prefix and shows above), Lead staff as the signed-in
user (from iMIS's `__ClientContext`), Priority Normal, Access buttons, the
FormFields rules (Visible 0 hides; IsRequired marks; Editable 0 disables;
fields without a rule show), the checks on Create, and opening the case
from the link in today's success message. Create case runs
`Cases/Create-Case-Staff` itself; `Form/Validation` and the hidden submit
button are gone.

**Waits for Create-Prefill to return more** (the form reads them when they
come): `Member` {Name, ID, MemberType, Standing, StandingTone,
StandingNote} for the for line; `Workplaces` (the jobs IQA's rows, with
`WorkplaceID`) for Workplace, which stays hidden until then; `Note`
{Note, CreatedOn, CreatedBy}; `SubTypes`; `Me` {ID}. And for
Create-Case-Staff: saving `PrimaryWorkplaceID` (sent, not yet saved), and
optionally answering `{CaseID, CaseNum}`.

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
`/Cases_ManageCase?CaseID=C221&CaseNum=220` from the link in it. The
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
theme (US-BEYOND-FORMS) plus `case-create-form.candidate.css`. The notes
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
| `case-create-form.candidate.css` | Generic `us-bf-*` additions for BeyondFormz forms (title, for line, origin note, sections, hints, errors, reveal, segmented buttons, footer). Target: zUnionSuite.css, US-BEYOND-FORMS |
| `case-create-form.js` | Preview toolbar and sample prefill data, then the behaviour the form's injected script would have |

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
