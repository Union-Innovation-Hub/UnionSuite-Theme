# Task form (WIP)

One task form for every module: personal tasks (home page), cases and
agreements, adding and editing. Owner, 19 October 2026.

**Status: built in the theme, 20 October 2026** (`Theme/UnionSuite/Forms/`:
`UnionSuiteForms.js`, `UnionSuiteForms.css`, `TaskForm.js`; documented in the
usage guide's `#popup-forms`; tests `tools/test-popup-forms.cjs`). Waiting on
the owner's IQAs, CloudToolz endpoint and three pages (TODO.md), then live
verification. This folder keeps the approved mock-up (`task-form.html`) and the
preview of the built form on sample data (`task-form-preview.html`) until then;
the guide is now the documentation of record.

## Problem

Tasks are added from the home page, cases and agreements, and edited from the
task rows on all three. One form should do all of it, and it must work on a
page without the UnionSuite theme (a client may take the cases module only).
All forms move to HubForms eventually; until then this form is drawn by a
shared script built to the same contract, so HubForms can replace it form by
form without page or endpoint changes.

## Decisions (owner, 19 October 2026)

- **One form, three pages.** Each page (personal, case, agreement) holds only a
  placeholder; the shared script draws the form. Pages carry their own iMIS
  access settings and fix the module and its tag filter:
  `<div data-us-form="task" data-module="case" data-tags-module="case"></div>`.
- **Where the code lives:** the theme's `Forms/` folder, not `zUnionSuite.*`:
  `UnionSuiteForms.js` (the runtime and shared fields), `UnionSuiteForms.css`
  and one file per form (`TaskForm.js`). iMIS auto-links only the theme root's
  `.css`, so the forms' stylesheet never lands on ordinary pages. A page loads
  the runtime through the theme loader (with or without the theme CSS) or
  with a direct `<script src>`.
- **Styling without the theme:** the form draws in a shadow root with its own
  stylesheet and inline SVG icons. Theme tokens are read once on `:host` with
  fallbacks, so the form takes the theme's colours, font and dark mode when
  they are there and stays a plain light form when they are not. The iMIS
  vendor sheets cannot reach in. The stylesheet is fetched once and adopted
  before the form draws, so it never shows unstyled.
- **Address parameters:** `Type=task`, `ID` (signed-in user), `Module`
  (`personal|case|agreement`), `ModuleID` + `ModuleOrdinal` (the parent record;
  absent for personal) and `Ordinal` (the task being edited; its presence
  switches the form to edit). `Ordinal` on every form, not `TaskOrdinal`. A
  task's `Ordinal` is unique within its module, so `Module` + `Ordinal` find
  it; no party ID is needed.
- **Tags:** the task tag IQA, filtered by an optional module parameter; child
  tags by parent ordinal alone. No task tags set up: the row is not drawn.
- **Record line** at the top: from `ModuleID` at once, plus the record's name
  from an optional IQA named on the placeholder. Personal tasks say so.
- **Personal tasks are the signed-in user's own:** always assigned to the
  signed-in user (required, set automatically), so the form has no Assign to
  field; the record line reads "Personal task · Assigned to you" (owner,
  20 October 2026).
- **Due date before Assign to** (owner, 20 October 2026): the date starts empty
  and is what people set (with the quick dates); the assignee starts as the
  signed-in user and is usually kept. Same order on every module.
- **Optional due time** (owner, 20 October 2026): once a date is set, "Add
  time" shows a time field beside the date (15-minute steps). Emptying it
  hides it again; Clear date clears both. Sent as `DueTime` ("14:30") beside
  `DueDate`, or null.
- **Subtags fade in only when the chosen tags have subtags** (owner,
  20 October 2026), and fade out again when they no longer do; beside Tags
  the field only fades, on a narrow form it also slides.
- **Assign to lists, one IQA each:** cases list the case's staff (the staff
  assigned to the case); agreements list either all staff or the agreement's
  staff, set by the placeholder's `data-assign="all|record"`. Three IQAs:
  case staff, agreement staff, all staff. **Optional on cases and agreements**
  (owner, 19 October 2026): an unassigned task shows on the record as
  something to action as part of the case or agreement itself. It starts as
  the signed-in user; clearing it reads "Unassigned" and sends
  `AssignTo: null`.
- **Edit is the same form:** filled in, details open when there are any,
  **Completed** (ticks the task off, or reopens it; the task line strikes
  through, as on the task rows; sent as `Completed`), Save changes, no Save
  and add another, and who added it.
- **No Delete.** Deleting a task is an admin-only function, for v2 (TODO).
- Each form file is mostly a field list (fields, sources, required, shown when,
  payload mapping), so moving it to HubForms is close to a translation.

## Save and add another (document in the guide)

New behaviour, kept until there is feedback on it (owner, 19 October 2026).
Adding only; edit has Save changes alone.

1. Saves the task exactly as Save task does (same payload, same endpoint).
2. Keeps the popup open. The task line, Details (closed again) and the High
   priority flag clear; **Assign to, Due date, Tags and Subtags stay**, since
   tasks added in a batch (after a meeting) usually share them.
3. The footer's keyboard hint is replaced by a quiet line, "Saved "<task>". Add
   the next one.", and the cursor returns to the task line.
4. Closing afterwards is not a cancel. Cancel closes with
   `{saved: true, Ordinals: [...]}` (every task saved in the batch), and Save
   task closes with those plus the last one, so the task list refreshes and
   the composer treats it as saved. Cancel does not undo tasks already saved.
   (The window's own close button reports nothing; the theme then reads the
   list, and the new rows show it was saved.)

## Sources

| File | What it is |
|---|---|
| `task-form.html` | The mock-up: Module, Add/Edit, Agreement assign list (all / agreement staff), Task tags, Styling (theme / none) and Appearance switches; the form in a shadow root; the side panel shows the page placeholder, the popup address, and what Save or Cancel would send and how the popup would close. |
| `task-form.css` | The mock-up's stylesheet, the prototype of `Forms/UnionSuiteForms.css`. |
| `task-form-preview.html` | The built form: loads the real `Theme/UnionSuite/Forms/` files, with iMIS, the IQAs (sample rows), CloudToolz and the popup stubbed; the side panel shows the requests, what Save sends and the close result. Switches: module, add/edit, agreement assign list, task tags, endpoint stubbed or not set up, theme or none, light or dark. |

Preview: serve the project root (`static-node`, port 8778) and open
`/prototypes/wip/task-form/task-form.html`. URL parameters:
`module=personal|case|agreement`, `mode=add|edit`, `assignlist=all|record`, `tasktags=some|none`,
`styling=theme|none`, `scheme=light|dark`.

## Open

- The three Assign to IQAs and the task tag IQAs: names and fields.
- The CloudToolz task endpoint and its response (`{Ordinal}` assumed).
- A personal task "about" a member: not a dropdown (some clients have 300,000
  members). Recommended: member tasks are added from the contact record, where
  the member is already known; a later `Module=contact` page could reuse this
  form. Owner to decide.

## Next

Built (20 October 2026). Next: the owner's IQAs, endpoint and pages, then live
verification on the dev tenant (TODO.md "Task form: go live"). After that,
move the approved spec to `prototypes/approved/` or archive this folder once
the guide holds everything useful. Then the Add note embed
(`../agreement-page/templates/Add-Note-Form-Content-HTML.html`) moves onto
the runtime as `Forms/NoteForm.js`.
