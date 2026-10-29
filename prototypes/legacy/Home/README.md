# Home page — local layout trial

Open `../../references/Home-Preview.html`, or serve it through the reference
preview server. This is an offline prototype with sample records, not a deployed
home page or an installable iPart template.

## Layout direction

The current header refinement groups the greeting and navigation with an 18px gap, shared theme tab buttons with a 100px minimum width and a full-width divider 4px below the buttons. Content begins 24px below the divider. The buttons and us-section-navigation spacing/divider wrapper now come from the shared theme.

The current preview follows the full homepage screenshot supplied on 13 September 2026: evening greeting, Tasks/Search/Stats navigation, queue counts 2/4/0, two sample tasks and three bulletin posts. Shared section switching is enabled with Tasks selected initially. Search is an offline placeholder; Stats uses verified probe data and reusable shared-theme cards. Panels now use natural content heights rather than equal-height scroll windows; the older fixed-height description below records the previous direction. The global site header/sidebar are outside this content-only prototype.

- A compact, unboxed welcome keeps the greeting and branch without a large empty shell.
- Needs Attention uses the shared Content HTML component with simulated folder
  discovery and three illustrative IQA summaries. The copyable live template points
  to `$/_i4u_/SandBox/CRM Layouts/Home_Page/Trackers` (literal underscores).
- My tasks sits immediately below, with one list and a header filter icon that
  reveals a full-width Search tasks field; Show completed is a ti ti-checkbox header icon next to the funnel. The filter controls and completed
  tasks are hidden by default. Compact rows scroll within the panel, keeping
  the open controls and View all tasks footer visible. Its bottom aligns with the Staff Bulletin.
- Below the task header: “Your outstanding tasks and those completed in the last
  30 days.” A plus icon in the header is labelled Add task for assistive technology
  and opens an explanatory demo dialog; the task creation form is not implemented.
- The existing Staff Bulletin remains on the right, using its approved component
  CSS and Manage Bulletin action. Five sample posts scroll inside a fixed-height
  panel; the heading and Manage Bulletin action stay visible. No bulletin
  authoring redesign is included.
- Global contact search and recent contacts remain in the site's persistent
  taskbar. The search field here filters only the local task list.
- Above 1150px, work and bulletin columns use a 2:1 ratio (two-thirds/one-third
  of the available width after the gap). From 901px to 1150px, the bulletin keeps
  its existing 340px width and work fills the remaining space.
- At 900px and below the page becomes one column: work first, bulletin second.
  Desktop columns share a 620px height. In the single-column layout, the task
  panel is 440px high and the bulletin panel is 560px high.

## Source and build

- `Home-Preview.html`: page composition and native task/bulletin iPart fixtures.
- `Welcome-Content.html`: copyable welcome Content HTML, shared by the prototype and guide.
- `Needs-Attention-Content.html`: copyable Content HTML; shared CSS/JS renders up to
  four tracker IQAs from the configured folder. Each IQA returns one summary row
  with Count, Header, Label and optional Link. The native iPart Title/CSS class
  field stay empty; the section provides the shell. See the guide's
  `#needs-attention` section for REST access, ordering, lifecycle and field rules.
- `home-layout.css`: prototype page geometry and proposed attention/task layouts.
- `home-preview.js`: local-only demo interactions; data is inserted by the builder.
- `../../../tools/build-home-preview.cjs`: illustrative records and offline generator.

From the project root:

```text
node tools/build-home-preview.cjs
node tools/build-home-preview.cjs --check
```

The builder embeds the actual native foundation, shared theme, client branding
seeds, shared query controls, icon actions/tooltips and the bulletin action registry. Bulletin content is rendered from
`../List-Templates/Bulletin-Query-Template.html`. Its native fixture includes the
extra class div under ContentItemContainer, exactly as iMIS generates it.
Fonts use local/system fallbacks. Client header/logo overrides are outside this
content-only preview. No remote assets or runtime fetches are needed.
The home and guide use `Theme/UnionSuite-Guides/usage/source/attention-example.js` to simulate
folder and query responses. That fetch stub is never installed in production.
The actual folder loader lives in the shared theme's US-ATTENTION block. Its
direct-folder discovery uses DocumentSummary FindByPath/FindDocumentsInFolder,
then runs at most four published IQD queries by DocumentVersionId, sorted by Name.
The live folder/API contract still requires verification on the iMIS site.

## Behaviour and boundaries

The task fixture now uses the shared helpers directly. Apply exactly these three
classes in the **Query Template Display iPart's CSS class field**:

```text
us-query-search us-task-completed-filter us-action-home-add-task
```

iMIS creates the class div inside ContentItemContainer around the native panel;
the preview reproduces that wrapper. Set a nonempty iPart Title and load the shared
CSS/JS. No hand-authored search, toggle or plus-button HTML is needed.
`us-query-search` supplies the generic search and header funnel;
`us-task-completed-filter` adds the Show completed icon in the card header;
`us-action-home-add-task` generates the labelled plus using the shared action helper.
Register `home.add-task` in client Actions.js to connect the real form or destination. Here it opens only the sample dialog.

Each repeating result includes `data-us-task-completed="true"` or `"false"` on its
inner content. The shared helpers filter the supplied native QueryTemplateSet
records; the local controller supplies the sample date window, completion actions,
animations, footer totals and empty messages. No local search predicate or copied
filter controls remain. See the guide's `#query-template-search`,
`#task-completed-filter` and `#report-icon-actions` sections for reusable examples.

The shared funnel reveals or hides its generated controls over 180ms, retaining
search and Show completed values. Its label changes between Show filters and
Hide filters, with `aria-expanded` and `aria-controls`. Hidden/animating controls
are inert; opening focuses search when the trigger still has focus. Rapid toggles
reverse from the current height; reduced motion skips the transition.

Search matches visible result text, including task titles, member names, member IDs and date labels, without case sensitivity;
leading and trailing spaces are ignored. The Show completed button includes
tasks completed in the last 30 days alongside outstanding tasks, with outstanding
tasks listed first. The window uses the fixed preview date of 12 September 2026
and includes that day plus the preceding 29 calendar days. Sample completions have
`completedOn` dates; marking a task complete records the preview date. The live
query will need an equivalent completion-date filter using the site's current date.
It retains the current search and uses `aria-pressed` to announce its state.
Completed rows have muted, struck-through titles, a checked green box and an
Actioned date (for example, Actioned 10 Sept 2026); they remain available to open. These cues follow the agreement
prototype using the existing theme tokens. The footer reads “5 outstanding, 2
overdue” initially; both counts reflect outstanding tasks in the current search
and update immediately on completion/reopening. Completed records do not count
towards either total. There is no summary above the list. The footer count is a
polite live region. Search with no matches
has its own message rather than claiming all tasks are complete.

Tick the separate checkbox at the start of a row to complete it immediately;
untick a completed task to reopen it. The checkbox exposes `role="checkbox"`
and `aria-checked`, has a task-specific accessible name, and works with Space or
Enter. Clicking the task title, date or chevron opens its detail dialog instead.
The dialog also supports Mark complete and Reopen task using the same controller.
Reopening clears the actioned date and restores the task's original due label
and outstanding styling. Re-completing it records the preview date again.

On completion, the checked row slides left and fades over 650ms, then its space
collapses over 250ms. Counts update immediately. It disappears when Show completed
is off; when on, it returns in the completed group with its actioned date after
the exit finishes. The exiting row is inert; focus moves to the next available
task checkbox, the preceding checkbox or Search tasks when no rows remain
(the header filter button when the search controls are closed).
Multiple exits can run together. Changing search, Show completed or the empty
preview ends pending animations and renders the current task states; cancelled
animation callbacks cannot restore old rows. Unticking does not slide the row.
Reduced motion skips both the slide and collapse; changing that preference during
an exit also finishes it immediately. The checkbox remains visible on mobile and
has a 44px target for coarse pointers; forced colours retain its visible check.
Hovering or focusing either row control highlights the whole row across the
scrolling list, including its side padding. Separators remain inset. Task details
and completion retain their separate click targets.

Reloading resets all changes. Escape closes dialogs; focus returns to the trigger.
The preview toolbar can show an empty outstanding list without discarding the
sample records; that control clears search and switches Show completed off.
Queue tiles, Add task, View all tasks, Manage Bulletin and the fee link
open explanatory/sample dialogs rather than contacting live iMIS.

The local `home-scroll-frame` surrounds each `home-scroll-area`: the task results
and the bulletin's panel body are the scrolling areas. Keyboard users can
focus an area and scroll with arrows or Page Up/Down. A bottom gradient appears
only while more content remains below, and clears at the end or when all content
fits. The preview controller recalculates it after filtering, task changes and resize;
headers and task footer sit outside the scroll areas. The fade ignores pointer
events, focus has a visible inset outline, and scroll padding keeps focused links
clear of the fade. Reduced motion removes its transition; forced colours retain
the native scrollbar without a gradient. These are preview-only layout hooks,
not additional classes to apply to production bulletin iParts.

The bulletin uses these existing production-ready classes:
`us-staff-bulletin us-action-home-manage-bulletin` in the bulletin iPart's
CSS class field, with Display in cards checked. Its per-result template remains
the basic Bulletin Query Template. Leave Header and Footer blank unless real
content is required. The iPart supplies its outer shell.

The Add task icon uses the existing `TextButton us-icon-button` presentation,
with an inline SVG plus to keep this preview offline, `aria-label="Add task"`,
a matching title and `aria-haspopup="dialog"`. Its demo handler and icon geometry
are local; a production button must connect to the verified native task action.
Native Query Menu and Query Template Display iParts can now generate the same
kind of plus action with `us-action-home-add-task` in their CSS class field.
It uses `UnionSuiteActions.define`, with explicit presentation, context and action. The home
layout still uses its local sample dialog. See `#report-icon-actions` in the
usage guide for configurable icons, placement and live handler setup.

The whole-list count/View all tasks row uses local `home-task-footer` and
`home-text-button` styling. It is not yet a supported shared panel-footer recipe.
The shared `us-list__footer` provides a divided footer **inside an individual
list item**, scoped under `us-list` or `QueryTemplateSet`; it does not create a
whole-list summary, calculate totals, supply a destination or fix the footer
outside a scroll area. Those behaviours still need the page/query integration.

The welcome header is implemented in `Theme/UnionSuite/zUnionSuite.css`.
Paste `Welcome-Content.html` into a Content HTML iPart; keep `home-welcome` on
its header and `home-welcome-date` on the optional date span. No extra iPart CSS
class, prototype stylesheet or JavaScript is required. Keep the iPart title blank
and its border/collapsible panel off for the unboxed greeting. The theme controls
typography, internal alignment and responsive date/title presentation. The gap
below this header and overall page geometry remain in `home-layout.css`.
Greeting, name, branch and date values come from the authored content or your
existing integration; shared CSS does not populate them. See the guide's
`#welcome-header` section for the complete copyable recipe and token mapping.

All other `home-*` selectors are local preview classes, not supported author classes.
They use the existing `--accent`, `--accent-100`, `--brand-100`, `--text-*`, `--bg-*`, `--border`,
`--danger`, `--success`, `--success-bg`, `--radius-*` and font tokens. No new theme tokens
are introduced. Reduced motion removes trial transitions; keyboard focus remains
visible. Before promotion, confirm the queue queries, row fields, permissions,
task destinations, native task loading and partial refresh behaviour. Keep the
page layout separate from any shared component styling.

## Membership Overview cards

The Stats tab now uses the reusable Content HTML cards in [Stats/README.md](Stats/README.md). That guide contains the six exact IQA names, required fields, date semantics, configuration and Bootstrap 12 / 12 / 8+4 / 8+4 placement. The shared theme implements visible-only GET /api/query loading, cached shared results, theme spinners, reconciliation, unassigned (empty) counts and Retry. Joins and resignations use the corrected inclusive-start AND exclusive-end filters. No AsAtDate output is required.

The home and standalone Membership-Stats references use your verified 13 September 2026 probe, with 83,084 current members, 7,227 financial, 8 joined and 1 resigned. The previous comparison is 1–13 August, not the full month. Snapshot history is intentionally a placeholder pending CloudToolz MonthEnd/MemberCount data. No total-member trend is inferred from event counts.

Side-by-side Stats cards stretch to matching heights in each row; mobile cards use natural heights. The shared loader carries stretch through native iMIS wrappers without new author classes or fixed pixel heights. The standalone Stats/guide preview reproduces the captured Bootstrap/zone/container structure. Validate it with node tools/test-membership-layout.cjs.

The page layout remains in home-stats.css and Stats-Content.html; home-stats.js and Stats/captured-data.json are offline-only fixtures. Do not install these fixture files on iMIS. There are no selectors, exports or clickable group drilldowns. Restrained accents, responsive cards and an accessible scrolling table remain. The new source templates are inside Stats/ and are also copyable from the standalone usage guide.

Build using node tools/build-membership-stats.cjs, node tools/build-home-preview.cjs and node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs. Validate with node tools/test-membership-stats.cjs and node tools/test-home-stats.cjs.
