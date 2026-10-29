# Activity and record cards

Status: work in progress, started 25 September 2026. Nothing is in the theme
and nothing is approved. Nothing is committed.

## Problem

The owner supplied a Recent Activity card design (`prototypes/Recent activity/`,
built on the superseded Union Innovation Hub design system) and prefers its
card layout. The contact page v3 activity feed (item 32) currently draws
interim compact rows. The goal is one card design that every history-style
list in the theme shares: the combined activity feed, notes, cases, meetings,
communications and similar lists.

## Preview

From the project root:

```text
node tools/build-activity-cards-workbench.cjs
```

Then open `references/Activity-Cards-Workbench.html` (directly, or at
`http://localhost:8778/references/Activity-Cards-Workbench.html` with the
`crm-static-node` preview). Run the build with `--check` to confirm the
generated page is current.

- **Candidate** (every list): the card on theme tokens. The options bar
  changes it.
- **Supplied** (Recent activity only, the one list the original designed):
  the owner's card frozen in its original styling, `supplied/Original-Feed.html`.
  It has its own markup, inline values, palette and Font Awesome icons (the
  font extracted from the owner's bundle), filled from the same records, and
  runs in an isolated iframe, so no theme or candidate change can reach it.
  Its design-system controls (search, select, chips, buttons) are
  approximated from that system's tokens; everything else is exact. Do not
  restyle it: it is the "before". Always light.

Width presets (380, 620, 820, 1100) resize the list, not the window, because
the card adapts to its container.

## Sources

| File | Purpose |
|---|---|
| `templates/Activity-Card.html` | Calls, emails, SMS, meetings and interactions. Also the markup `US-ACTIVITY-FEED` will render |
| `templates/Note-Card.html`, `Case-Card.html`, `Meeting-Card.html` | The same card for notes, cases and meetings lists |
| `activity-cards.candidate.css` | The card component (`.us-records`, `.us-record__*`), its options and feed chrome. Target: a new `US-RECORD-CARDS` section in `zUnionSuite.css`; dark values in `zzDarkMode.css` |
| `activity-cards.candidate.js` | `US-RECORD-CARDS`: expand and collapse for every card, one delegated handler |
| `record-specimens.cjs` | Sample records for one member (the v3 contact, Sarah Reynolds) |
| `supplied/Original-Feed.html`, `supplied/fa-solid-900.woff2` | The frozen original card and its Font Awesome 6 Free solid font (SIL OFL 1.1; icons CC BY 4.0) |
| `Activity-Cards.source.html`, `Activity-Cards.workbench.css`, `Activity-Cards.workbench.js` | Workbench page, chrome and controls |
| `../../../tools/build-activity-cards-workbench.cjs` | Builds `references/Activity-Cards-Workbench.html` |

## How the card is used

- **Query Template Display lists** (notes, cases, meetings, communications): put
  `us-records` in the iPart CSS class field, turn Display in cards off, and use
  the matching card template. Blank optional fields collapse, including empty
  detail facts. The status tone comes from the IQA (`OutcomeTone` or
  `StatusTone`); only `danger` and `warning` show colour. `PriorityFlag`
  (`High`, `Urgent` or blank) shows a coloured flag beside the status.
- **The activity feed:** `US-ACTIVITY-FEED` keeps its data layer (item 32) and
  renders each row with the activity card markup, grouped by month inside
  `.us-records`, with the feed controls above.
- **Icons and colour** come from `data-us-record-type` (`call`, `email`,
  `sms`, `meeting`, `note`, `interaction`, `case`), so authors never choose an
  icon or a colour.
- **Expanding** is `US-RECORD-CARDS`. Templates carry no IDs: the same record
  can appear in two lists on one page (the feed and Meetings do here), so the
  script pairs each toggle with its details, uniquely, on first use. Without
  the script, details stay hidden and View still opens the record.

## Owner decisions

- 26 September 2026: in the feed, "Last 30 days" is gone (90 days stays the
  default); range changes keep what is loaded (narrowing folds older cards
  away, widening pages on); cards fold in and out on type, search and range
  changes; the switcher underline slides like the home page's; search
  matches get a faint highlight. All in `US-ACTIVITY-FEED`, which the
  workbench runs as is.
- 26 September 2026: on a wide feed, search and the date range share the
  type filters' line and the heading's filter button hides; narrow feeds
  keep the button. To keep one implementation, the workbench's Recent
  activity now runs the real `US-ACTIVITY-FEED` module and its chrome CSS
  (v3 section 32, and the slim switcher, section 2), answered from the sample
  records; its simulated filter bar and the "Feed filters" option are gone.
- 26 September 2026: choosing a type in the feed's switcher shows a "View
  all calls" (emails, meetings…) link at the end of the filter bar, to that
  type's IQA page; it fades in and out and hides on All. The feed card was
  then folded into the contact page v3 Activity tab (item 32), and the
  interim row styles and the leftover layout options, fields and helpers
  were removed.
- 26 September 2026: no View link on the card; the record opens only from
  the expanded details (View full details, Open note, Open case, Open
  meeting). The date column is date, time and the expand button. The "Row
  actions" option is gone.
- 26 September 2026 (supersedes the layout decisions below that conflict):
  the candidate is rebuilt as a close translation of the original card,
  because its structure is what makes it clear. On the left, a quiet type
  line (TYPE · direction · linked record · by whom, then the priority and
  status flags), one bold headline and one muted preview line; on the
  right, date, time and View/expand stacked in a column, so dates line up.
  With no subject (most records) the note keeps the preview's type (12px,
  regular, muted; owner, same day) and may use two lines. Kept from the iterations: theme tokens and fonts,
  colour only on the rail icon and for importance, neutral routine statuses,
  the priority flag, the secondary button at the bottom right of the details,
  motion, and the slim section switcher. Balanced spacing gives 78px cards
  (the original is 99px); "Comfortable (original)" restores its spacing.
  Replaced: date at the top left, the two-line slim layout, the subject
  combined into the note line, and moving direction and linked record into
  the details (they are back on the type line).
- 25 September 2026: card layout over the interim compact rows.
- 26 September 2026: the date (and time) at the top left of the card and the
  status pill at the top right; the tag line (type, direction, linked
  record) and title follow; View and expand sit at the bottom right, beside
  the preview (later the same day, moved from the top right). They come last
  in the markup too, so keyboard order matches. This replaced
  the supplied right-hand date column and the "date on the tag line" option.
- 26 September 2026: colour is kept for what matters. The type colour stays
  on the rail icon only; the type is a plain uppercase label. Routine
  statuses (Completed, Opened, Follow-up booked, Closed) are neutral; danger
  and warning statuses (Escalated, Bounced, Left message, Pending) keep their
  colour. A new optional `PriorityFlag` (High: amber; Urgent: red) shows a
  labelled flag beside the status (its left card edge was removed later the
  same day). The first line
  reads date · time · by whom, as in the owner's simple notes example
  (cases show the assignee without "by"). The "Type colour" option became
  "Rail colour" (`us-records--neutral-rail`). Linked records keep the link
  colour, which is their clickable affordance.
- 26 September 2026: the subject and the note are one text block. Most
  records have no subject line, so an optional subject leads the text in bold
  ("Subject — note…") and disappears when blank (`us-record__text` with
  `us-record__subject`). The text shows two lines and opens to its full
  length when the card expands, animated with the details; note details no
  longer repeat the body. Toggles are labelled "Show details".
- 26 September 2026: the expanded details end with one secondary action
  (View full details, Open note, Open case, Open meeting) at the bottom
  right, as a white-fill button: the theme's `TextButton us-outline-button`
  (plain `TextButton` is the navy-filled secondary), at the small size.
- 26 September 2026: two lines at a glance, to be as slim as the original.
  Line 1: date · time · by whom (a case leads with its reference), with
  status and priority on the right. Line 2: the type as a small prefix,
  then the text (optional bold subject, then the note) on one line, with
  View and expand. Moved into the details: direction, linked record,
  meeting duration and the full text. Compact spacing tightened (6px/10px
  padding, 24px rail icons, 6px between cards) and in-card badges sized to
  the 18px first line, so every card is 53px at panel widths (the original
  is 99px). At phone width a card with two flags wraps its first line.
- 26 September 2026: the supplied card is frozen (see Preview): the shared
  markup had let candidate changes (priority edges, neutral statuses, the
  by-line, combined text, motion) leak into it. It now appears on Recent
  activity only; other lists show the candidate alone.
- 26 September 2026: compact spacing is the default; the supplied spacing is
  the "comfortable" option (`us-records--comfortable`).
- 26 September 2026: the section switcher for the feed's type filters, at the
  sub-tab size (30px buttons on a 3px track, v3 item 2); chips are the option.
  The type filters stay visible for quick navigation and real counts; search
  also matches type words.
- 26 September 2026: every state change animates; UX is the core of the
  project. `US-RECORD-CARDS` `fold()` slides details, the filter panel,
  records filtering in and out, and month groups (height and fade, 220ms for
  details, 180ms otherwise, the theme's `cubic-bezier(.2, 0, 0, 1)`), and a
  reversed toggle carries on from its current frame. Hover, selection and
  option changes cross-fade in CSS. Reduced motion is instant. The preview no
  longer unclamps on expand, which made cards jump; the full text is in the
  details. The v3 feed has an interim copy of `fold()` until it renders the
  card.
- 25 September 2026: search and the date range sit behind the heading's
  filter button, as on the home page tasks (the supplied variant keeps them
  visible). That toggle is to become one shared theme component for any
  Query Template or Content HTML block, as IQA reports already have (root
  `TODO.md`).

## Decisions to work through

Each is an option in the workbench; the Supplied variant keeps the owner's
original card for reference.

1. **Rail colour.** Per type, or neutral icons (colour only for importance).
2. **Priority source.** Which field drives `PriorityFlag` for each list
   (for example the case priority, a note's pinned or urgent flag), and
   whether Pinned notes (v3 item 13) become High.
3. **Rail style.** Icon nodes (supplied), dots (the theme's `us-list--timeline`
   style) or none. Lists that are not histories (cases) may not want a rail.
4. **Notes.** Replace the compact notes template (v3 item 13) with the note
   card, or keep both.
5. **Scope.** Which other theme lists move to the card (for example Recent
   History, and home page lists), and whether the older templates are retired.

## Checked so far

In the preview browser (Chromium), 25 September 2026: both variants render for
all five lists at 380, 620 and 820px; expand, type filters, the filter button, the options and reset
work; no duplicate IDs; blank optional fields and empty facts collapse; type
badge text contrast is at least 4.5:1 in light and dark; no frame overflows
sideways. Not yet checked: other browsers, the 820 and 1100 presets in detail,
and forced colours.

## Next

- Done, 26 September 2026: the contact page v3 activity feed (item 32)
  renders the activity card, loading this folder's candidate CSS and script;
  its interim row styles were removed. A chosen type in the feed shows a
  "View all …" link to that type's IQA page (`data-history` on the source).
- When approved: move the templates and their field definitions into
  `Theme/UnionSuite-Guides/usage/templates/List-Templates/`, the CSS into a
  `US-RECORD-CARDS` section of `zUnionSuite.css` (dark values into
  `zzDarkMode.css`) and the script into `zUnionSuite.js`, then document them
  in the usage guide.
