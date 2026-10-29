# Task row display

**Status (19 October 2026): the compact row is the task list format** for the
homepage, the agreement page and the case page, with the full row as an option;
both are implemented. The detail row below was the accepted format before them
and stays supported. See [Compact and full rows](#compact-and-full-rows-19-october-2026).

**Earlier status: accepted and implemented.** The detail layout was the task list
format for new lists, on the homepage and on a dedicated tasks page.

- Template: `Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html`
- Styles: the `US-TASK-ROWS` section of `Theme/UnionSuite/zUnionSuite.css`, opted
  into with `us-task--detail` on the row
- Behaviour: the shipped `US-TASK-ROWS` section of `zUnionSuite.js`, which now
  saves completion to `i4u_UT_Interactions`
- Guide: the task list section of the usage guide, and the `#task-detail` example
  in `references/List-Templates.html`

The older two-line row stays supported for lists already using it; every rule for
the accepted layout carries the `us-task--detail` modifier, so nothing existing
changed. This folder keeps the workbench that the format was designed in, and the
record of what was decided and why.

## Compact and full rows (19 October 2026)

**Problem.** The homepage (My Tasks) and the agreement page showed tasks
differently: the homepage had the detail row with a note line, a title that opened
the task and long-form dates; the agreement page a compact row with no note, a
pencil to edit, a High Priority badge and short dates ("9/09/2026 - Overdue").

**Owner decisions (19 October 2026).**

- One row in two versions for the homepage, agreement and case pages:
  **compact** (the default, `us-task--compact`) and **full** (optional,
  `us-task--full`, the note shown too). Both keep `us-task--detail`.
- Long-form dates on every page ("Overdue 10 September 2026", "Due today"),
  composed by the query.
- "Personal Task" for the signed-in user's tasks on every page (the existing
  `MemberId` check).
- One edit action: the **pencil**; the title is plain text.
- The note is read in place, not in a popup: the compact row's **details button**
  opens it under the row; the full row shows two lines with **More**. Notes slide
  open and shut (200ms, the theme ease; instant with reduced motion).
- Layout: the title, badge and buttons share the first line, which never moves,
  and stay level with a long title's first line; the title line is padded to the
  badge's 22px so the badge never meets the line below; an opened note runs the
  full width below, starting clear of the pressed details button.
- **Tags** end the date and member line, muted: the first and a "+2" button that
  shows the rest; an open note shows them all; from the separate task tag list.
- An open details button wears the theme's one toggle "on" state.
- One set of **column names** for every task list (the guide's), so one IQA shape
  serves all three pages; renaming the agreement and case IQA columns is in
  TODO.md.

**Where it lives.** `US-TASK-ROWS` 1.2 in `zUnionSuite.css` and `zUnionSuite.js`;
`home.edit-task` in `Scripts/ActionDefinitions.js`; the guide's
`Tasks-Compact-Query-Template.html` and `Tasks-Full-Query-Template.html` with
field definitions, the `#task-rows` section and the `#task-compact` /
`#task-full` examples; the agreement and case pages' task templates
(`prototypes/wip/agreement-page/templates/Agreement-Tasks-Query-Template.html`,
`prototypes/wip/case-page/templates/Case-Tasks-Query-Template.html`). The
workbench shows both as **Compact (default)** and **Full**.

## Problem

The row shows a title, a member and a date, and nothing else. Staff cannot see what
a task is actually about without leaving the list, and the list is going into two
places with very different widths: the homepage panel (measured at 598–891px,
depending on viewport) and a dedicated tasks page (1100px+).

The current row also does not survive real query values. At a 720px list, a completed
label carrying an author — "Actioned 3 September 2026 by Member Services" — took 296px
and left 318px for the title; at 384px the title collapsed to about one character per
line. Actioned labels are now date-only (below), but the row still has no cap, so any
long right-hand value does the same thing. A blank member gives a 48px row against
66px, so list rhythm changes with the data.

## What the workbench is

One page. Each scenario renders **twice at the same width** — `Current` (the older
two-line row) and `Accepted` — so the two can be compared directly. Both come from
the canonical Query Templates, inside the wrappers iMIS generates
(`ContentItemContainer` → iPart class div → panel → `QueryTemplateSet` →
`QueryTemplateItem`), and both use the shipped theme CSS and behaviour. The page
holds no styles of its own beyond its chrome, so what it shows is what a real list
does.

Scenarios: **everyday list** (with the real search, Show completed and footer),
**content extremes**, **single row**, and the **outstanding-only template** (current
only).

Controls: tier buttons (380 / 620 / 900 / 1200), a width slider, light/dark and
Reset rows. Each stage frame is also drag-resizable. Completion is local, as in
production: ticking plays the real celebration and exit sequence and writes nothing.

## The accepted format

One grid at every width, three lines deep:

| Line | Content |
| --- | --- |
| 1 | Title |
| 2 | One-line note |
| 3 | Member, with the due or actioned date right-aligned |

Rows are ~86px (~100px at phone width, where the title wraps). Title and note sit
4px apart so they read as one block; 6px separates the note from the member line.

Two drafts were tried and dropped on the way here. **Four aligned columns above
860px:** columns with no headers read as a sortable table, and the Query Template
Display cannot sort. **A due date in its own full-height right column:** it worked,
but with the date moved down beside the member the note gets the full row width and
the top line stays clean for the title and the view control. The only thing the
list width now changes is the title's minimum measure, which is relaxed below 480px
so a long date cannot force a horizontal overflow. Title and note still cap their
measure (62ch and 78ch) so a 1200px page does not stretch them past reading width.

Decisions taken, and why:

- **The title is a link** (`a.us-task__title`) and the destination is a placeholder.
  The shipped CSS already supports `:is(a, button).us-task__open`, so an open
  affordance was anticipated; opening itself stays out of scope for now.
- **No view icon.** An eye was tried in the top right and removed: it opened the
  same destination as the title, so it was a second tab stop to one place, and an
  eye reads as "view" when the popup will be an editable form. It also made the
  first grid row 28px tall, which is what opened a gap between the title and the
  note. The title is the sole open affordance.
- **The title always wins width** — `minmax(18ch, 1fr)`, capped at 62ch of text.
  The date sits on the member's line, right-aligned and capped at 12rem: enough for
  the longest real label, "Actioned 30 September 2026" (172px at 12px), which
  wrapped onto two lines in an earlier fixed 10rem column.
- **The note is one line, clamped with CSS, and there is no Read more.** Clamped
  text still matches the header search; the banner's Read more pattern hides the
  full copy, which would silently stop it matching. A per-row toggle would also add
  a third tab stop and make row heights jump mid-list. The rest of the note belongs
  to the task popup. If one line proves too thin, add the toggle as clamp-removal,
  not as the banner's two-copy swap.
- **No task type.** It was the weakest field and the width is better spent.
- **A filled person icon precedes the member** — `ti ti-user-filled`, `aria-hidden`,
  the same `ti` icon convention the contacts template uses, so screen readers just
  hear the name. Hovering the name turns the icon to `--accent` as well as
  underlining the text, so the pair reads as one control.
- **The member name links to the contact record** (`MemberUrl`, the same `*Url`
  convention the contacts template uses). It keeps the meta line's appearance
  instead of taking link colour — two differently coloured links in one row compete
  — and shows an underline on hover. It is a sibling of the title link, not nested
  inside it.
- **Actioned labels carry the date only** — "Actioned 3 September 2026", no author.
  That matches the guide's own field definition and the completion sequence, which
  writes `Actioned <date>` with no author when a row is ticked. The author belongs
  in the task popup.
- **No created date or author in the row.** Both were tried, right-aligned against
  the due date's edge, and removed: with a title, a note, a member and a due date
  already present, a fifth value made the row busy without changing what anyone
  does next. Provenance belongs in the task popup. The row is now title, one-line
  note, linked member, due date.
- **Only overdue is coloured, and it says so.** The query returns "Overdue 10
  September 2026" rather than "Due", so the state does not rest on colour alone —
  it survives greyscale, colour blindness and forced colours. Overdue uses
  `--danger` at 600 weight; due today keeps the weight without the amber, which was
  too much colour for a state that is not yet a problem. A badge would cost
  80–110px of contested width, so the date carries the state itself.
- **The completed date loses its green pill.** The shipped pill wraps to three lines
  inside a fixed date column; `--success` text alone carries the state. It also
  resets the weight: `data-us-task-due-state` comes from the query and is not
  updated when a row is ticked, so an overdue task showed a bold "Actioned" date
  while a task that arrived completed showed a regular one. Any rule keyed on the
  due state has to be neutralised for completed rows.
- **Blank values collapse** (`:empty`, and `:has()` for a member that is only an
  icon), so row rhythm follows the layout rather than the data.
- **The checkbox aligns to the title line**, not the middle of a three-line row.
- **The member line is upright.** It was italic while the member sat beside a note
  and an origin line that were all the same grey — in this client's branding
  `--text-base` and `--text-muted` both resolve to `#545962`, so colour could not
  separate them. With the type and origin gone and the note down to one line, the
  icon and 500 weight do that work, and a slanted link read as decoration rather
  than a control.
- **No middot between the meta values** — a separator glyph strands itself at the
  start of a line when the meta wraps. Weight and the icon carry the distinction.
- **Rows, not cards, in both places.** Cards roughly double the vertical cost, which
  is tolerable for four tasks on a homepage and painful for forty on a page.

The proposed row keeps the shipped contract — `.us-task[data-us-task-completed]`,
the toggle as a direct child, `.us-task__open`, `.us-task__copy` and `.us-task__date`
as the element the completion sequence rewrites — so search, the completed filter and
the completion animation all keep working. That is verified in the workbench, not
assumed.

**Implementation note found while building this:** dark mode colours links inside
`.panel-body` at specificity (0,3,1), so a class-only rule loses and the link turns
blue. It caught the title, then the member, then the view control. Every link rule
here is written as `.us-task a.us-task__*` to match it; the theme will need the
same care.

## Maintained sources

| File | Purpose |
| --- | --- |
| `Task-Rows.source.html` | Page shell and marker slots. |
| `Task-Rows.workbench.css` | Page chrome only. Must not style `.us-task`. |
| `Task-Rows.workbench.js` | Controls only. No task behaviour. |
| `task-specimens.cjs` | Specimen records and scenario definitions. Data only. |
| `../../../tools/build-task-rows-workbench.cjs` | Assembles `references/Task-Rows-Workbench.html`. |

## Preview

```text
node tools/build-task-rows-workbench.cjs
node tools/build-task-rows-workbench.cjs --check
```

Then open `references/Task-Rows-Workbench.html`. The output is generated and rebuilt
locally.

## Open decisions

- **Does provenance need to be in the list at all?** Created date and author were
  removed for busyness. If they come back, "Assigned by" may be the more useful
  field than "Created by" — whoever holds the task cares who gave it to them — and
  that is a data question before it is a layout one.
- **Is one line of note enough?** It reads well here, but the specimens are written
  to be readable at one line. Real notes may bury the point.
- **Meta fields.** Member and origin earn permanent width today. Priority or status
  may deserve a place, and the row has room for one more value at standard width.
- **Does the note belong on the homepage panel at all**, or only on the tasks page?
  Everything here assumes one component in both places.

## Found while folding this into the theme

- **`rem` is not 16px on a real page.** The native `10-UltraWaveResponsive.css` sets
  `html{font-size:62.5%}`, so the date's `12rem` cap became 120px in the guide and
  wrapped every long label. The cap is now `190px`. The workbench had not shown it
  because it was not loading the native base; it does now, so it renders at the
  same 10px root as iMIS.
- **`minmax(0, auto)` beside a `1fr` track collapses.** The date column was frozen
  at its base size instead of taking its label's width. It is `max-content`, with
  the element's `max-width` capping what that can be.

## Saving a completion

Ticking sends `PUT /api/i4u_UT_Interactions/{TaskPartyId}/{TaskOrdinal}` setting
`FollowUpActioned`; reopening writes `false`. The tick and celebration are
immediate, but the row only leaves the list once iMIS accepts the change — a
rejected write restores the row exactly as it was and says "Not saved. Try again."
A row without `TaskPartyId` and `TaskOrdinal` writes nothing and behaves locally.

`tools/test-task-save.cjs` asserts the request shape, the revert and the
no-identity case. The workbench answers the request itself and has a **Simulate
save failure** switch, so neither the page nor the test touches a tenant.

## Still to do

- The homepage prototype uses local `home-task-row` / `home-task-check` classes,
  not `.us-task`, so putting the accepted row on the homepage means migrating it.
- Opening a task is not implemented: `TaskUrl` is whatever the query supplies, and
  the popup action has not been registered.
- The write has only been exercised against a stub. Confirm against the tenant that
  `i4u_UT_Interactions` keys on `Ordinal` rather than `SEQN`, and that
  `FollowUpActioned` is a Boolean field rather than text.
