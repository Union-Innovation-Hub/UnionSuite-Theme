# Note and task form (WIP)

One form for a case's notes and tasks, in place of today's separate note
and task forms. Owner, 18 November 2026.

**Status:** the mock-up is the agreed design (owner, 18 November 2026). It is
built as a BeyondFormz form, **UnionSuite Cases: Note**, with its two flows,
ready to import. Not yet imported or run on iMIS.

## Problem

A task is always a note; a note is a task only when it needs follow-up. Both
are one row in `Zidebar.[Zen_CloudFiles_Notes]` in CloudToolz, the
`Zen_CloudFiles_Notes` data source in iMIS (owner, 18 November 2026):

| Column | Field | Holds |
|---|---|---|
| `FollowUpRequired` (iMIS `FollowupRequired`) | Note \| Task | Whether the note is a task (the activity feed IQAs read it too) |
| `Title` | What needs doing? | A task's title |
| `Note` | Note, or Details | A note's text, and a task's details |
| `ActionedNotes` | What was done | What was done, when a task is actioned (optional) |
| `Deadline` | Due date and time | One datetime |
| `PrimaryStaffLead` | Assign to | The assignee (optional on cases) |
| `HighPriority` | The flag | bit |
| `Actioned` | Completed | bit |
| `Access` | Access | `Open`, `Team` or `Individual` |
| `Category` | | `Task` for a task (as Quick Add Task writes it); a note keeps its own, or `Case` |
| `TaskStatus` | | `New`; `Complete` once actioned (as Complete Task sets it); blank on a note |
| `CaseOrdinal` | | The case the note belongs to (an agreement's: `AgreementOrdinal`) |

A note's tags and subtags are rows in `i4u_UT_Tags` (owner, 18 November 2026),
one per tag, with the note's Ordinal as `ModuleOrdinal`. They come from a
dedicated list of case note tags, so a note's rows are never mistaken for a
case's types.

Cases first (owner, 18 November 2026): personal tasks get a form of their own,
and agreements are parked.

## The design

One field order, with **Note | Task** at the top, beside the record. It is
`FollowUpRequired`, chosen before anything is typed, so what it opens never
moves text already written.

1. **Note | Task.** Add note opens it on Note, Add task on Task. A saved note
   opens on Note and can still be given follow-up. A saved task has no
   choice: it stays a task (owner, 18 November 2026: turning one back into a
   note was too complicated).
2. **What needs doing?** (`Title`, required) and the High priority flag: task
   only.
3. **Note** (`Note`, required) on a note; **Details** (`Note`, optional) on a
   task, behind *Add details* on a new task. Switching keeps the text until
   it is saved.
4. **Due date**, with **Add time** once there is a date (15-minute steps,
   as the task form has it), and **Assign to** (optional; you, on a new
   task): task only. Saved as one `Deadline` datetime; with no time it is
   midnight, and midnight reads back as the date alone.
5. **Tags**, then **Subtags** once a tag is chosen.
6. **Completed**, and under it **What was done** (`ActionedNotes`, optional):
   editing a task only. It opens once ticked, or when it has text.
7. **Attachments** and **Access**. Each new attachment picks its own
   attachment tags (the attachment tag list, not the note tags), behind
   *Add tags* as Details is behind *Add details*. A saved one shows its tags,
   which change through the attachment's own quick edit.

Saving closes the popup: there is no Save and add another. Every change is
logged against the case (`LogChangesToIMIS`), as the case flows log: an Add
with what was set, an Edit with each changed column old → new. A restricted
note's text (Team or Individual) is not logged, as Quick Add Note does.

## Files

| Path | What |
|---|---|
| `index.html`, `note-task-form.js`, `note-task-form.css` | The mock-up (`?mode=add|edit&type=note|task&scheme=light|dark`), on the forms runtime's styles |
| `beyondformz/build-form.cjs` | Builds the BeyondFormz import from an export of the form (it keeps only the form record) |
| `beyondformz/form-inject.js` | The form's JavaScript to inject: everything above |
| `beyondformz/prefill.js`, `save-button.js` | The prefill's and Save's JavaScript (they hand the answers to the injected script) |
| `beyondformz/preview.html`, `preview.js` | A stand-in for BeyondFormz's renderer that runs the built export's scripts on sample answers. Not BeyondFormz: check the real form after importing |
| `flows/build-flows.cjs` | Builds the two flows into a Flowz export (below) |

## Build and import

```bash
node prototypes/wip/note-task-form/beyondformz/build-form.cjs <BeyondFormz export.json>
```

```bash
node prototypes/wip/note-task-form/flows/build-flows.cjs <Flowz export.json> [<Flowz export.json>…]
```

They write `dist/Imports/Case-Note-Form.json` and
`dist/Imports/Case-Note-Flows.json` (ignored by Git). Both keep the export's
ids, so importing overwrites the form and the two flows. The form needs the
theme's `zUnionSuite.css` with these `us-bf-*` additions (18 November 2026).

To try it first: build, start the `static-node` preview and open
`/prototypes/wip/note-task-form/beyondformz/preview.html`
(`?Type=task`, `?Ordinal=9874` to edit a task, `?Ordinal=9902` to edit a
note, `?save=ok|warn|fail`, `?scheme=dark`).

## The form

The form is on the `Cases_CreateNote` shortcut (owner, 18 November 2026). The
case page's **Add note** and **Add task** open it (their composers' More
options, release 1.0.38): `/Cases_CreateNote?CaseID=C217&CaseNum=214`, and
`&Type=task` for a task. A note's and a task's **Edit** (the pencil) open it
with `&Ordinal=…`. Older links still work: `Task=true` opens it on Task,
and without `CaseNum` the prefill finds it from `CaseID`. `Ordinal` opens a
note to edit.

| Field | Sent as | From |
|---|---|---|
| Note \| Task | `FollowupRequired` 1 or 0 | Drawn by the script |
| What needs doing? | `Title` | |
| The flag | `HighPriority` 1 or 0 | Drawn by the script |
| Note / Details | `Note` | |
| Due date, Add time | `Deadline` (`yyyy-mm-ddThh:mm:00`, or blank) | The date field and a time the script adds |
| Assign to | `PrimaryStaffLead`, with `PrimaryStaffLeadName` for the log | The old form's flow, `flow/sharepoint/AssignStaff?CaseID={{CaseID}}` |
| Tags | `Tags[]` | `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Note Tags` (new) |
| Subtags | `Subtags[]` | `…/Case - Form Data/API - Value List - Note Subtags` (new), read by the script |
| | `NoteTagOptions`, `TagLabels` | Every note tag offered and its name: the flow only adds or removes those, and logs the names |
| Completed | `Actioned` 1 or 0 | Drawn by the script |
| What was done | `ActionedNotes` | |
| Attachments | `Files`: `[{UploadName, Uuid, TagOrdinals}]` | The script uploads each file as it is added (below) |
| Access | `Access` | `…/Case - Form Data/Case Value List - Access Level`, drawn as buttons |

**Attachments.** The old form used BeyondFormz's file field and Zidebar's
save. This form draws its own drop zone so each file can carry its own tags.
Each file is uploaded as it is added, the way BeyondFormz's file field does
it: `POST <CloudToolz URL>/api/formz/fineUpload` (`qquuid`, `qqfilename`,
`qqtotalfilesize`, `qqfile`), which stages it in Redis as
`FineUploader[<uuid>]`. The CloudToolz URL comes from
`$/ZENTSO/Security/CloudToolzUrl`. The attachment tags come from
`$/_i4u_/Core/Shared/API - Zen Attachment Tags`, ordinals 12 and up (below
that are the system tags the upload adds itself). Save waits until every
file has uploaded. A staged file expires after 30 minutes.

## The flows

- **`US Case Form Prefill: Note`** (`/cases/US/note/Prefill`; your copy still
  had Create case's path). It answers `ReqVals` (the FormFields rules, Module
  `Cases`, Area `Note`), `CaseNum`, `MemberName` (from `Get Case Details`),
  and when editing: `Note` (the row), `NoteTags` and `Files` (the note's
  attachments with their tags). It checks access (below). If the user can't
  open the case or the note, or the note isn't on the case, it answers
  `Error` (and no note text) and the form disables Save.
- **`US Case Form: Note`** (`/cases/US/note`), in order:
  1. `JS_Prepare` reads the form, and `IF_Valid` refuses what's missing.
  2. `SQL_Check`: the case, the user's entity, and (editing) that the note
     is on the case. It also reads the note as it is now, for the log's old
     values and its current tags, and the entity's local time. A saved task
     sent as a note is refused. Then `JS_Access` applies the access rules
     (below) to the case and to the note as it was: someone who can't open
     it can't change it.
  3. The case's primary contact, through the Zidebar upload IQAs that Quick
     Add Attachment uses: the tags' `ContactID`, and the upload's member and
     entity.
  4. The note: iMIS first (`InsertIntoDataSource`, or a bulk Update by
     Ordinal as Complete Task does), then CloudToolz under iMIS's Ordinal.
     If iMIS fails, nothing is saved. If CloudToolz fails after iMIS, the
     answer says not to save again (a new note would be added twice).
  5. Its tags in `i4u_UT_Tags`: new ones added (iMIS, then CloudToolz), and
     dropped ones removed (iMIS, then CloudToolz), only among the tags the
     form offered.
  6. Each new attachment through `Zidebar: Fileupload` (Blocking), one at a
     time with its own tags plus Cases (3), linked to the note
     (`NoteOrdinal`) and taking the note's Access.
  7. `LogChangesToIMIS`: `Case C217: Add Note`, `…: Add Task`, `…: Update
     Note` or `…: Update Task`, Table `Zen_CloudFiles_Notes`.
  8. The answer: `{Success, Ordinal}` and "Note saved." / "Task saved.". A
     tag or an attachment that didn't save is named in the message; the
     note itself is saved.

- **`Cases: Quick Access Restricted Note`** (`/cases/quick/note-access`): Show
  note on a restricted note in the case page's quick view (the theme's
  restricted note loader asks it on a case page; agreements keep
  `/ca/note-access`). Takes `{NoteOrdinal}`; the case is the note's own, not
  the page's. Answers `{Access: 'Granted', Note}` only to someone who passes
  the checks below, otherwise `{Access: 'Restricted'}`.

## Access

To open, save or show a note, the user must meet the case's requirements **and**
the note's (owner, 18 November 2026). Both flows check, in order:

1. **The entity.** The case is in the user's entity
   (`UnionTemplate.EntityAccess`), as the quick add and update flows check.
2. **The case**, as **US Cases: Case Access Check** (`/cases/case-access`)
   decides it:
   - sysadmin and manager always;
   - staff currently assigned to the case
     (`$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - Access Check - Case Staff`
     answers Granted);
   - otherwise by the case's Access: **Open**, anyone; **Team** or
     **Individual**, the case team role (`…/UnionSuite/Manage Case/API - User Roles`, which reads `i4u_UT_UserRoles`);
     anything else, no one.
3. **The note** (editing), by its own Access (owner, 18 November 2026):
   - sysadmin and manager always;
   - **Open**: anyone who can open the case;
   - **Team**: the case team role;
   - **Individual**: staff currently assigned to the case;
   - anything else: no one.

The rules are in all three flows (`ACCESS_RULES` in `flows/build-flows.cjs`): a
flow can't call another flow's endpoint. If US Cases: Case Access Check
changes, change step 2 here too. Refused, the prefill answers an error with
no note text and the form disables Save; the save writes nothing.

## IQAs to create

Two, copies of the case type lists for note tags (owner, 18 November 2026):

- `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Note Tags`:
  the note tags, shaped like `Case Value List - CaseTags` (BeyondFormz fills
  the Tags list from it).
- `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/API - Value List - Note Subtags`:
  the note subtags, shaped like `$/_i4u_/Core/Cases/Layouts v2/API - Value
  List - Subtypes`: `Ordinal`, `TagName`, `TagStatus` (yes/no; false is not
  offered) and `ParentTagOrdinal`, with an optional `ParentTagOrdinal` filter
  that returns every row when blank.

The prefill needs none: it reads the note in CloudToolz and the case from
`Get Case Details`, which exists.

## To confirm on dev

- **The upload.** The form posts files to `/api/formz/fineUpload` itself, as
  BeyondFormz's file field does; that the endpoint takes them from the form
  (no other header) hasn't been seen yet. Check by adding a file and
  watching the network list for a `200`.
- **Linking files to the note.** `Zidebar: Fileupload` takes `NoteOrdinal`.
  The prefill lists a note's files only where
  `ZideBar.Zen_CloudFiles_Storage` has a `NoteOrdinal` column, and otherwise
  lists none.
- **The iMIS columns** `Title`, `PrimaryStaffLead`, `HighPriority` and
  `Actioned` on `Zen_CloudFiles_Notes`, and the bulk Update clearing a
  `Deadline` with a blank.
- **`i4u_UT_Tags` in iMIS** as `Standalone|i4u_UT_Tags|Multi` for the bulk
  Delete (Create case only inserts into it).
- **Assign to's list**: `flow/sharepoint/AssignStaff` answers staff iMIS IDs
  as values.
