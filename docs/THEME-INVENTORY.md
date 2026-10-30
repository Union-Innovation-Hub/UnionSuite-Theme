# Element inventory — what the native CSS actually styles

Extracted from `legacy/Native CSS/Orion-99.css` (1,030 rule blocks, 563 classes) and
`Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css` (3,831 blocks, 2,678 classes) by
parsing selectors and weighting each class by how many declarations target it.
Presence checked against the captured `legacy/Orion page.html`.

Companion to [THEME-FINDINGS.md](THEME-FINDINGS.md) — read §3 and §6 there
before styling anything on this list.

Current implementation: the approved Query Menu / IQA component is now in
`Theme/UnionSuite/zUnionSuite.css` and `zUnionSuite.js`. Use `us-report` on the
iPart; optional modifiers are `us-filters-collapsible`, `us-filters-collapsed`
and `us-report-expandable`. `SearchContactsClass` remains a supported alias.
Use the [standalone Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html) for
author-facing classes, tokens, templates and feature status, and the
[theme README](../Theme/UnionSuite/README.md) for integration details.
The [current condensed CSV](crm-member-profile/CRM-Member-Profile-Component-Types-Updated.csv) and
[detailed mapping CSV](crm-member-profile/CRM-Member-Profile-iPart-Mapping-Theme.csv) include the
report classes and distinguish implemented utilities from planned business actions.
See the [CSV version note](../Theme/UnionSuite/README.md#mapping-csvs) for the locked originals.

---

## Implementation status — reconciled 8 September 2026

This status summary supersedes the original priorities and guard notes below.
The class counts and **[seen]** markers are historical source evidence, not a
completion checklist. “Implemented” means present in shared theme assets;
it does not imply every native screen or state has been verified live.

| Area | Current status | Remaining work / boundary |
|---|---|---|
| Native buttons | Implemented token mapping, outlined/warning variants and shared busy presentation | Verify additional native handlers individually; a button class alone does not establish a request lifecycle |
| Loading | Implemented button ring, native popup/panel circles, IQA refresh overlay and Save/Import/CCO adapters | CCO navigation confirmed working by owner; verify remaining request/error/restore paths in live contexts |
| Ordinary forms and panel editors | Implemented native field presentation, responsive widths and checkbox-label alignment; opt-in us-form also available | Check additional specialised widgets and narrow columns; native validation remains authoritative |
| Address forms | Implemented consistent widths, Notes alignment, matching arrows and scoped deprecated Phone/Fax/Email hiding | Hidden fields retain native submission/validation behavior |
| Checkboxes / radios | Implemented enlarged controls, white checkbox tick and client-overridable colour tokens | --checkbox-colour and --radio-colour can independently use accent or primary; specialised Telerik controls excluded |
| Selects / autocomplete | Implemented scoped native select and RadComboBox presentation | Native select menus remain browser-owned; Chosen has report-specific styling, not a completed system-wide pass |
| Calendar | Approved styling promoted, including navigation/pressed states, month/Today controls and picker actions | Latest single-focus-frame and centred-chevron corrections await live confirmation; Telerik owns behavior |
| Theme Upload / XML Import | Scoped compact file row, secondary Select/Remove states, drop highlight and native upload busy adapters implemented | Owner reports upload forms look good; retain native XML/ZIP validation and verify untested error paths. No blanket RadUpload restyle |
| IQA / reports | Approved authored report component and native baseline implemented | Latest uniform rows and horizontal query-selector layout and unboxed divider treatment need live verification; preserve native three-column filters |
| IQA designer: Where used | Implemented 12 October 2026: `Scripts/IQA-WhereUsed.js` (loader module `where-used`, IQA and business object designers), `US-WHERE-USED` in zUnionSuite.css and its dark rule, shared index in `i4u_UT_Configuration.Payload`, guide `#iqa-where-used`, tests `tools/test-where-used.cjs`. Business object designer (IQAs using the object as a source) added 30 October 2026 | Live verification on dev pending ([build plan](../prototypes/wip/iqa-where-used/BUILD-PLAN.md#live-checks-on-dev)); Flowz usage needs a CloudToolz flow (TODO.md) |
| IQA browser: search, favourites and recent | Implemented 12 October 2026: `Scripts/IQA-Finder.js` (loader module `iqa-finder`, IQA browser and designer), `US-IQA-FINDER` in zUnionSuite.css, search through `$/_i4u_/Core/Admin/Query Search - IQA Document Tree Taskbar`, favourites in `i4u_UT_UserSettings` (SettingsKey `IQA-Favourites`), guide `#iqa-finder`, tests `tools/test-iqa-finder.cjs` | Live verification on dev pending: Quick find panel placement, go-to-folder selection, designer opening, favourites saving |
| Messages / alerts | Approved styling and native validation presentation implemented | Verify remaining message types and partial-update contexts |
| Panels / cards | Report and banner containers implemented | General native panel/card variants still need a dedicated review |
| Native tabs | Implemented: V5 vertical + H2 horizontal, nested/standalone tabs, mobile scrolling and All sections | Shared CSS/JS; native iMIS retains selection and requests. Local adapter checks passed; verify live validation/cancellation and partial updates. Independent of banner zone switching |
| Trackers / charts | Inventoried; dedicated review remains | Capture real KPI, progress-bar and chart examples |
| Shell / site navigation | Staff icon mappings and Orion sidebar surfaces/hover/selected/focus styling implemented. Collapsed sidebar at 768–991px (and on touch devices from 768px) is a slim 42px full-height rail with content after it, replacing the floating tab (13 October 2026). The page wrapper clips sideways overflow in both sidebar states | Live expanded/collapsed and nested-state verification remains; breadcrumb and account-menu review remains |
| Menus / dialogs | IQA export open state and native popup loading covered | General menu variants and alert/confirm/prompt chrome still need review |
| Profile banners | Custom shared banner implemented | Native profile-banner family is separate and still needs review |
| Content output | Query/report and custom banner output supported | Bulletin cards and recent-history variants need review; combined activity feed remains planned |
| Panel business actions | Shared report action slot and visual treatments implemented | Named action injection and verified business handlers remain planned |
| Popup forms: the task form | Implemented 20 October 2026: `Theme/UnionSuite/Forms/` (`UnionSuiteForms.js` runtime, `UnionSuiteForms.css` in each form's shadow root, `TaskForm.js`), loader module `forms` (pages with `[data-us-form]`; works without the theme), `UnionSuiteTaskForms` page paths in Scripts/ActionDefinitions.js (blank: the task buttons keep today's forms), guide `#popup-forms` (staff use, page setup, payload and close results, the form format), tests `tools/test-popup-forms.cjs`, preview `prototypes/wip/task-form/task-form-preview.html` | Owner to build: the six IQAs and the CloudToolz endpoint (blank in TaskForm.js CONFIG) and the three pages; then set the page paths and verify live |
| Task rows: compact and full | Implemented 19 October 2026: US-TASK-ROWS 1.2 in zUnionSuite.css / .js (`us-task--compact` default, `us-task--full` optional, on `us-task--detail`): plain title and pencil, badge and buttons on the title's first line, note read in place (details button, or two lines and More; sliding), tags with a "+N" button. `home.edit-task` in Scripts/ActionDefinitions.js. Guide `#task-rows`, templates Tasks-Compact / Tasks-Full, examples `#task-compact` / `#task-full`; the agreement and case task templates moved onto it; workbench `references/Task-Rows-Workbench.html` | Live: upload the theme files, paste the templates on the homepage, agreement and case pages, and the IQA column changes in TODO.md |
| Taskbar search | Standalone Scripts/UnionSuiteTaskbar.js implemented. Header row at every width (US-TASKBAR-LAYOUT, 13 October 2026): one row while it fits with a shrinking search field, icon-only Add bookmarks / Go to below 1100px, the taskbar on its own row at 960px and below, search on its own row at 780px and below | Replaces old injection; all styling in shared CSS; accent colours and lifecycle cleanup. Guide `#taskbar-responsive` |
| Biscuit taskbar greeting | Approved in theme: five-minute daily visit, 15-second scratch/tilt idles, wave/hop/goodbye clicks. Hidden below 1200px, as the approved design specifies (previously 600px; the 1060px rule had stopped matching) | Client Config.js on/off switch; header divider perch; normal timed exit; reduced motion; preview controls stay offline. Upload updated theme/client archives and retain script load order |
| Banner tab switching | Presentation exists; behavior deferred by owner | Do not enable template tabs until zone-switching integration is implemented |

Production truth: [shared CSS](../Theme/UnionSuite/zUnionSuite.css),
[shared JS](../Theme/UnionSuite/zUnionSuite.js) and the
[usage guide](Theme/UnionSuite-Guides/Usage-Guide.html).
Visual references: [native forms](references/Native-Form-Integration.html),
[choices/dropdowns](references/Choice-Dropdown-Comparison.html),
[calendar](references/Calendar-Comparison.html) and
[all references](../references/index.html).

---

## Families, by how much native CSS they carry

"Decls" is total declarations aimed at the family across both sheets — a proxy
for how much is already styled, and therefore how much you'd be arguing with.

| Family | Classes | Decls | Owner | Priority |
|---|---|---|---|---|
| App shell / nav | 86 | 2,425 | iMIS | **1 — every page** |
| Icons | 86 | 1,968 | iMIS | 3 |
| Layout utilities | 630 | 1,472 | Bootstrap-ish | **Do not touch** |
| Panels / cards | 61 | 1,078 | iMIS | **1 — every page** |
| Site nav (incl. tree) | 25 | **1,618** | **Orion** | **1 — every page** |
| Menus | 62 | 1,039 | Telerik + BS | 3 |
| Profile banners | 28 | 1,032 | iMIS | 2 |
| Combo / select | 32 | 676 | Telerik + Chosen | 4 — guard |
| Buttons | 17 | 612 | iMIS | **1 — every page** |
| Grids (RadGrid) | 40 | 549 | Telerik | **2 — everywhere in staff site** |
| Trackers / charts | 17 | 542 | iMIS | 2 |
| Tabs | 21 | 532 | Telerik | 2 |
| Editor (RadEditor) | 51 | 450 | Telerik | 5 — leave alone |
| Messages / alerts | 32 | 319 | iMIS | 2 |
| Scheduler | 26 | 304 | Telerik | 5 — leave alone |
| Forms / fields | 30 | 264 | iMIS | **1 — every page** |
| Windows / dialogs | 37 | 234 | Telerik | 3 |
| Upload | 16 | 219 | Telerik | Scoped Theme Upload / XML Import implemented; guard other instances |
| Splitter | 19 | 63 | Telerik | **Never touch** — see findings §3.1 |
| Query templates | 8 | 60 | iMIS content | 2 |

1,665 classes / 10,282 declarations didn't fall into a family — almost all
one-off page and module classes (`cart-items-grid`, `invoice-grid`,
`RegistrationArea`, `Wrapper-StaffSignIn`, `layout-preview`, `donut-bite`…).
Treat those as per-module, not system.

---

## The list, family by family

Marked **[seen]** where the class appears in the captured Home page — those are
confirmed live, not just present in the stylesheet.

### 1. Buttons — *do first, appears everywhere*

Current implementation: native `TextButton`/`btn` and existing variants now
consume shared tokens in `Theme/UnionSuite/zUnionSuite.css`; no replacement
class is required. See [THEME-BUTTONS.md](THEME-BUTTONS.md) for the complete
native inventory, size/group controls, semantic mapping, specialised-control
boundaries and missing secondary/warning variants. The findings below remain
the native-source evidence behind this integration.

- `.TextButton` **[seen]** — the workhorse. iMIS puts it on grid row actions,
  form submits, toolbar buttons, header search. Rendered as `<a>`, `<input
  type="submit">`, `<input type="button">` and `<button>` depending on context.
- `.AccentButton` — **Orion's own accent class**, `background-color:#ff9947`.
  Selector list is `.AccentButton, .AccentButton .TextButton, .RadGrid
  input.AccentButton, .RadGrid.RadGrid input.TextButton.AccentButton,
  .RadGrid.RadGrid a.TextButton.AccentButton`. Match it or lose inside grids.
- `.btn`, `.btn-group` **[seen]**, `.dropdown-toggle` **[seen]**
- `.PrimaryButton`, `.SignInButton`, `.FeatureButton`
- `.ruButton` (upload), `.rwPopupButton` (dialogs) — Telerik, guard
- **Trap:** the bare element selectors `input[type=button|submit|reset]` and
  `button` are shared with Telerik chrome. Findings §3.1.

### 2. Panels / cards — *do first*

- `.panel` **[seen]**, `.panel-heading` **[seen]**, `.panel-body` **[seen]**,
  `.panel-body-container`, `.panel-title`, `.panel-description`
- `.Distinguish` **[seen]** — per-content-item emphasis tickbox. Authors apply
  it liberally; expect several per page.
- `.PanelNoPadding`, `.panel-border`, `.no-card`
- `.ContentItemContainer` **[seen]**, `.WebPartZone` **[seen]**, `.iMIS-WebPart`
- `.card` **[seen]**, `.StandardPanel`, `.ContentBorder`, `.section`
- **Traps:** empty headings are whitespace not `:empty` (§3.3); panels nest
  (§3.4); `.panel{overflow:hidden}` clips anything bleeding out (§3.9).

#### Data display panels / Panel Editor — read-only and edit states confirmed

Owner-supplied Contact details HTML and screenshots confirm both states (9 September 2026).
Comparison: [Data-Panel-Comparison.html](references/Data-Panel-Comparison.html) — approved shared panel header/action styling, with read-only/edit/mobile modes and native markup integration.

This is a complete native data display/editor component, distinct from report cards,
banner containers and the individual field styles already implemented. Its overall
presentation remains pending design review; recording these selectors does not approve
new styling.

- Shared shell: `.ContentItemContainer > .panel`, `.panel-heading.Distinguish`,
  `.panel-title`, `.panel-heading-options`, `.panel-body-container`, `.panel-body`.
- Header actions: native `.sysicon-panel-config` (Edit Panel) and `.sysicon-edit`
  (Edit information), both Telerik `.RadButton` controls. Configuration and editing
  record data are separate actions; preserve their handlers and availability.
- Read-only state: `.PanelEditorReadOnlyForm`, `.ReadOnly.PanelField.Top`,
  `.Label`, `.PanelFieldValue`; also `.PanelField.Left` in Membership details.
  Preserve empty values, links, wrapping and label/value associations.
- Edit state: `.PanelEditorEditForm`, `.PanelField.Top`, associated `label[for]`
  and `.PanelFieldValue`, with native text inputs, selects and Telerik date input/
  calendar controls. Some metadata remains read-only within the editable panel.
- Native column layout includes `.row`, `.BreakWord.col-md-4`; review label/value
  rhythm, column spacing and stacking across both states, including long/empty values.
- Validation: `.ValidationError`, sometimes `.Important.ValidationError`; errors
  may be hidden with either `display:none` or `visibility:hidden`. Retain native
  validation, field constraints and Enter-key handling.
- Footer actions: Save is `input.PrimaryButton.TextButton`; Cancel is
  `input.TextButton`. Save uses validated ASP.NET postback options; Cancel uses its
  existing postback handler. Do not replace either with a local visual toggle.
- Lifecycle: `.RadAjaxPanel` and a native loading overlay surround the editor.
  Review loading, validation failures, Save/Cancel return to read-only mode and
  partial replacement without changing native behaviour or clipping calendar popups.
- The edit capture also contains a separate Open invoices grid and a read-only
  Membership panel. Do not treat the whole enclosing `.WebPartZone` as one editor.

#### Multi-instance Panel Editor — native list and popup editing confirmed

- Multiple rows per member, distinct from the single-instance attribute panel above.
- Same panel shell and configuration action; header Add uses native `.sysicon-add`.
- Native list uses generated `_multipleInstanceList` / `_multipleInstanceList_Grid1` IDs, `.RadGrid.RadGrid_MetroTouch` and `.rgMasterTable`.
- Row Edit is `a.ImgNoResize[title="Edit"]`, invoking the native PanelEditDialog popup. Add also opens a popup (owner-confirmed). Preserve the configured editor, callback and AJAX refresh.
- Row Delete is an image input with ID suffix `_gbcDeleteColumn`, title Delete this item, native confirmation and postback. Proposed trash glyph/red hover must preserve that control's semantics and handler.
- Comparison includes native/proposed tables, Add/Edit modal simulations and confirmed deletion of fictional rows. Header/settings/add reuse IQA presentation; row actions use theme icon-button and danger treatment. Trial only; no production adapter yet.
- Fields, field order and column layout are fully author-configurable. Do not infer audit groups or require Updated by/Updated on fields. The Account alerts columns are only one example.

### 3. Forms / fields — *do first*

- `.PanelField` **[seen]**, `.PanelFieldLabel` **[seen]**, `.PanelFieldValue`,
  `.AutoWidth`
- `.InputXLarge`, `.InputLarge`, `.InputSmall`
- `.CalendarInput` **[seen]**, `.StylesDateText` **[seen]**
- `.search-field` **[seen]**, `.Watermarked`
- `.Required`, `.AsiErrorInline`
- `.FilterPanelHorizontal` — the IQA filter block; its submit is the "Find"
  button (§3.6)
- Chosen (`.chosen-container`, `.chosen-choices`, `.chosen-single`) — a
  third-party multiselect, 676 decls across the combo family. Guard.

### 4. App shell / navigation — *do first, then leave alone*

- `.wrapper` **[seen]**, `.col-primary` **[seen]**, `.col-secondary` **[seen]**,
  `.main` **[seen]**, `.sidebar`
- `.header`, `.navbar` **[seen]**, `.nav-auxiliary`, `.navbar-toggle`
- `.sub-nav` **[seen]**, `.sub-nav-body`, `.sub-nav-head`, `.Nav-Icon-wrapper`
  (the 8 staff nav icon mappings are now in `Theme/UnionSuite/zUnionSuite.css`,
  block `US-STAFF-NAV-ICONS`; `UTStaff.css` is the legacy source)
- `.footer-main` **[seen]**, `.breadcrumb`
- `.account-menu` **[seen]**, `.account-toggle`, `.obo-toggle` **[seen]**,
  `.obo-panel`, `.batch-toggle`, `.ste-toggle`, `.transaction-date-toggle`
- `.app-menu`, `.logo`, `.header-search`
- `.nav-expanded`, `.js-nav-sticky`, `.sidebar-fixed` — **state classes set by
  script**; read them, never fight them
- **Note:** the sidebar expand/collapse animates `width`/`margin` — the 9
  outstanding `layout-transition` findings.

### 4a. Site navigation — *its own family. 1,618 declarations.*

Split across two families in the first draft of this list, with half of it
wrongly filed under "Telerik, leave alone". It is the most visible chrome on
every page and it **is** yours to style.

**The container**

- `.col-secondary` **[seen]** (51) — the sidebar column, `#SideBarPanel`
- `.sub-nav-wrapper` (6) + `.scrollbar-minimal` (11)
- `.sub-nav` **[seen]** (2), `.sub-nav-head` — the title slot, often empty
- `.sub-nav-body` (296) — the scroll container
- `.navbar-toggle` (58) + `.primary-nav-toggle` (31) — the collapse control
- `#js-scroll-signifier` — the "scroll down" affordance

**The tree — `RadTreeView_Orion`, not Telerik's default**

- `.RadTreeView_Orion` (289) — **Orion's own skin.** 286 of those declarations
  are in `99-Orion.css`, zero in UltraWave.
- `.rtUL` (284), `.rtLI` (245), `.rtIn` (67) — list, item, item content
- `.rtTop` / `.rtMid` / `.rtBot` — position within the list
- `.rtPlus` (32) / `.rtMinus` (31) — expand/collapse affordances
- `.rtSp` — spacer
- `.TreeNode`, `.TreeNodeSelect`, `.TreeNodeOver` — iMIS's state classes
- `.Nav-Icon-wrapper` (historical count: 11 in the staff stylesheet; now promoted
  to the shared theme with Tabler codepoints and token colours) + eight wrappers
  (`.Home-wrapper`, `.Organising-wrapper`, `.Cases-wrapper`,
  `.Agreements-wrapper`, `.Calls-wrapper`, `.Committees-wrapper`,
  `.Travel-wrapper`, `.Integrations-wrapper`)

**State classes set by script — read, never fight**

- `.nav-expanded` (54), `.js-nav-sticky` (51), `.sidebar-fixed` (49)
- Persisted in `localStorage` as `StaffNavExpanded`; the sidebar's `top` is set
  inline on scroll by `setNavTop()`.

**The distinction that matters**

`RadTreeView_Orion` and `RadTreeView_MetroTouch` are different skins of the
same Telerik control:

| Skin | Where | Owner | Decls | Verdict |
|---|---|---|---|---|
| `RadTreeView_Orion` | the site nav | **Orion** | 289 | **style it** |
| `RadTreeView_MetroTouch` | Content Designer folder tree | Telerik | 19 | leave alone |

So scope tree rules to the skin, never to `.RadTreeView` or bare `.rt*`:

```css
.RadTreeView_Orion .rtIn { … }        /* site nav only */
```

A bare `.rtLI` rule hits the Content Designer's folder tree as well.

**Traps**

- The sidebar expand/collapse animates `width` and `margin` — these are the 9
  outstanding `layout-transition` findings.
- Flyout submenus are positioned by script on `mouseenter`; the script writes
  `top` directly onto `.rtUL` and `> div > a`. Do not set `top` on those.
- `.sub-nav-head` is usually empty — the same empty-container rule applies.

### 5. Grids / IQA reports (RadGrid) — *second, but they are everywhere*

- `.RadGrid` **[seen]**, `.RadGrid_MetroTouch`, `.rgMasterTable` **[seen]**
- `.rgHeader` **[seen]**, `.rgRow` **[seen]**, `.rgAltRow` **[seen]**,
  `.rgSelectedRow`, `.rgEditForm`
- `.rgPager`, `.rgPagerCell`, `.rgNumPart`, `.rgArrPart1/2`, `.rgWrap`,
  `.rgInfoPart`, `.rgPageFirst/Prev/Next/Last`
- `.GridTitlePanel`, `.GridFooterPanel`
- **Trap:** `.RadGrid.RadGrid .rgRow a` is 0-3-1 and outranks `.TextButton`
  (§3.8). Pager controls are `input[type=submit]` inside `.RadGrid` — guard.

**Concrete element: Query Menu / IQA report.** An iPart that displays IQA
report data in a grid. Confirmed in `Structure/Copy of Blank Page.html`,
zone 5, item `SearchContactsName` (export type `QueryMenu`). Its styling
surface includes:

- Captured wrapper `.SearchContactsClass` — originally specific to this example;
  now supported as a compatibility alias. Use `.us-report` for new theme reports.
- Report title `.panel-heading.Distinguish .panel-title` and description
  `.panel-description`.
- Query filters inside a nested `.panel.FilterPanel`.
- Results `.RadGrid.RadGrid_MetroTouch`, table `.rgMasterTable`, column
  headers, data rows, alternating rows and result links.
- Paging controls and report export actions.

Treat the complete report as a component composed of panels, forms, buttons
and a grid; check those styles together against this fixture. This extends
the existing RadGrid inventory, rather than adding a separate grid engine.
See `docs/IMIS-CMS-STRUCTURE.md` §15 for configuration-to-DOM mappings and §18 for
the implemented class contract. The shared component includes native title and
description, single-query/query-folder presentation, filter disclosure, whole-cell
sorting with right-aligned icons, native Export in the header, pagination and
optional animated expanded view with pinned controls.

**Planned extension: optional header actions.** The owner approved using an
iPart class such as `us-action-create-case` to request an action injected by a
central theme script. `us-report` remains the panel presentation choice.
Header actions need both button and text-link treatments: Add Note in Pinned
Notes uses a button; View Full Profile in Contact Summary uses a text link.
Both may coexist in one header, with presentation selected per action.
Inventory the shared action container, button/text variants, wrapping,
hover/focus/unavailable states and an action-only toolbar for missing/suppressed
headings alongside the report. Use real anchors for navigation and buttons for
in-page commands, independent of visual treatment.
The shared action slot and button/text-link styles are implemented for reports.
Named action injection and business handlers remain planned. These are custom
theme classes, not classes measured in native CSS. See
[THEME-PANEL-ACTIONS.md](THEME-PANEL-ACTIONS.md) for the implementation plan.

### 6. Tabs — *second*

- `.RadTabStrip` **[seen]**, `.RadTabStrip_Orion`, `.RadTabStripTop`,
  `.RadTabStripVertical`, `.SubTabStrip`
- `.rtsLevel`, `.rtsUL`, `.rtsLI`, `.rtsLink` **[seen]**, `.rtsSelected`
  **[seen]**, `.rtsAfter`, `.rtsTxt`, `.rtsIn`, `.rtsOut`
- `.RadMultiPage` **[seen]**, `.rmpView` **[seen]**, `.rmpHidden`
- `.tabs-wrapper`, `.tabs-horizontal`, `.tabs-top`, `.cco`
- Without Telerik's own JS/CSS a tab strip degrades to a bullet list — that's
  what you see in the harness, not a theme bug.

### 7. Messages / alerts — *second*

- `.AsiMessage` **[seen]**, `.AsiSystem`, `.AsiWarning` **[seen]**,
  `.AsiError`, `.AsiErrorIcon`, `.AsiSuccess`, `.AsiInformation`,
  `.AsiValidation`
- `.iMISUserMessageInformation` **[seen]**, `.user-message-area`
- `.ContentTabbedDisplay` **[seen]** + `.AsiWarning` — **iMIS renders an empty
  CCO tab as a *warning***: `<p class="AsiWarning">No content found</p>`. Four
  on the Home page. Style `.AsiWarning` calmly or every empty tab reads as an
  error.
- `.alert`, `.alert-danger/-warning/-success/-info`

### 8. Trackers / dashboard figures — *second*

- `.ProgressTrackerPanel` **[seen]**, `.ProgressTracker_Dashboard_Overview`,
  `.ProgressTrackerNavigation`, `.ProgressTracker2`
- `.count` **[seen]**, `.inset` **[seen]**, `.label`
- `.ProgressTrackerNumberGradient` **[seen]** — **Orion's own opt-in
  gradient-text class.** The KPI figures are `#545962` grey with a cyan
  `background-clip:text` gradient over them. Author-controlled, not the theme.
- `.ProgressBar`, `.donut-bite`, `.tiny/small/medium/large-chartbox`

### 9. Query template / content output — *second*

- `.QueryTemplateSet` **[seen]**, `.QueryTemplateItem` **[seen]**
- `.BulletinCard` **[seen]**, `.RecentHistoryList` **[seen]**,
  `.RecentHistoryItem`
- These wrap whatever an author put in a content record — **assume arbitrary
  HTML inside**, including hardcoded colours and `fa-` icons (§3.2).

**Planned extension: combined activity feed (T15).** Multiple Query Template
Display iParts query separate activity tables and contribute cards to one
chronological list. The theme supplies the shared panel/timeline/card styling;
an optional central JavaScript module handles assembly, month groups, loaded-item
filters and expansion. Queries and source mappings remain configurable.

Proposed markers are `us-activity-feed` on a dedicated zone,
`us-activity-feed-title` on its separately rendered title, and
`us-activity-source` on each participating iPart. Inventory the single header,
search/date/type controls, explicit counts, activity cards, action links,
loading/empty/partial-error states and fallback source displays. These are
planned components, not native classes measured in the CSS.

Initial scope is a bounded recent-activity view with a full-history link.
Complete-history search, totals and combined paging require a separate
data-loading component. See [THEME-ACTIVITY-FEED.md](THEME-ACTIVITY-FEED.md) for
the metadata contract, source limits, title ownership and refresh/fallback plan.
T15 is included in the [updated component-type CSV](crm-member-profile/CRM-Member-Profile-Component-Types-Updated.csv).

### 10. Icons — *third*

- `.sysicon`, `.sysicon--before` **[seen]**, `.sysicon--after`, `.sysicon-*`
  (person, edit, …) — **434 + 397 + 393 declarations. iMIS's own icon system**,
  by far the most heavily styled thing in the native CSS. Leave it alone unless
  recolouring.
- `.file-icon--before` **[seen]**, `.file-icon-word/-excel/-pdf/-csv/-xml`
- `.SocialSprite`, `.cartSprite` **[seen]**, `.NavSprite`, `.IconSprite`
- `.heading-icon`
- Plus whatever icon font you ship, and the `fa-` shim.

### 11. Menus / dropdowns — *third*

- `.dropdown-menu` **[seen]**, `.dropdown-header`, `.caret` **[seen]**,
  `.divider`
- `.RadMenu`, `.rmRootGroup`, `.rmItem`, `.rmLink`, `.rmRootLink`, `.rmText`,
  `.rmToggle`, `.rmSlide`, `.rmSeparator`, `.rmDisabled`, `.rmLeftImage`
- `.rmNeedBaseStyles` — 227 declarations; Telerik's own base. Guard.

### 12. Profile banners — *third*

- `.account-banner`, `.account-banner-short`, `.mini-profile-banner-large`,
  `.mini-profile-banner-small`, `.profile-picture-wrapper`, `.picture-primary`
- 1,032 declarations. Heavily styled and highly visible on contact records.

**Custom banner component (T07).** The shared HTML banner has three iPart modes:
`us-banner` for normal flow, `us-banner us-banner-sticky` to retain the expanded
banner on scroll, and `us-banner us-banner-collapsible` to retain and condense
it. Collapsible includes sticky; the two modifiers need not be combined.
The same contract supports Query Template Display and static Content HTML.
`us-banner-page` is a separate page-layout class for full width and native
gutters. All styling is now in `Theme/UnionSuite/zUnionSuite.css`, with page-layout
and component rules kept separate. Interaction still uses the existing banner
script; the legacy-named embed is now behaviour only. The native profile-banner
selectors above are a different component family. See the
[banner usage guide](../Theme/UnionSuite-Guides/usage/examples/Banner-README.md).

The [complete template](../Theme/UnionSuite-Guides/usage/templates/Banner-Template.html) includes an optional
Actions disclosure inside the summary and tabs after the details. Delete either
whole div to omit it. Both remain visible when compact. Dropdown behaviour is
implemented; sample commands are disabled until connected to verified handlers.
Tabs supply presentation only. Direct zone switching is the preferred planned
adapter for lightweight dashboards, with multiple zones per tab and shared zones
remaining visible. CCO integration remains a separate option. Zone titles and
grid space must follow visibility; hiding a zone does not defer its initial IQA.
Separate [dashboard](../Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html) and
[Contact](../Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html) templates provide simpler
starting points. The standalone guide embeds these maintained sources rather
than carrying independently edited copies.

### 13. Windows / dialogs — *third*

- `.RadWindow`, `.rwDialogPopup` **[seen]**, `.rwDialogText`, `.rwPopupButton`,
  `.radalert`, `.radconfirm`, `.radprompt`
- `.modal` **[seen]**, `.modal-dialog`, `.modal-content`, `.modal-header`
- Most staff editing happens in these popups — worth theming, but they're
  Telerik-rendered, so verify on a real deploy.

### 14. Guarded components and scoped exceptions

- **`.RadSplitter` / `.rsp*` / `.ObjectBrowserWrapper`** — the Content
  Designer's entire layout. Findings §3.1. Guard, never style.
- **`.RadEditor` / `.re*` / `.SimpleContentEditor`** — 450 decls, and it's the
  content editor. Breaking it stops authors working.
- **`.RadScheduler` / `.rs*` / `.OccurrenceScheduler`**
- **`.RadUpload` / `.ru*`** — scoped Theme Upload and XML Import presentation
  and drop handling are now implemented. Preserve Telerik processing and native
  validation; other upload instances remain guarded.
- **`.RadTreeView_MetroTouch`** — the Content Designer folder tree only, 19
  decls. The *site nav* uses `.RadTreeView_Orion` and is yours to style — see
  §4a. Never write bare `.rt*` rules: they hit both.
- **Bootstrap-ish utilities** (`.col-sm-*`, `.row`, `.pull-*`, `.d-*`, `.p-*`,
  `.m-*`, `.text-*`, `.yui-*`) — 630 classes. These are the grid iMIS lays
  pages out with, and most of UltraWave's 1,139 `!important`s live here.

---

## Next review queue

Capture a real example, compare states, approve presentation, then verify on the
native screen. These are review candidates, not claims that native controls fail.

1. Live verification of approved native V5/H2 tabs: cancellation, validation, partial updates and mobile navigation.
2. Content-window chrome: verify approved title/icon/footer changes live. Telerik alert/confirm/prompt dialogs are deferred by owner until encountered; standard browser dialogs remain unchanged.
3. Menus: supplied Actions families are implemented (option 5); inspect remaining native context/Telerik menus.
4. Dashboard trackers: figures, progress bars and charts.
5. General native panels/cards, shell navigation and native profile banners.
6. Specialised lookup/multiselect fields outside the approved report scope.
7. Bulletin cards and recent-history output.

Keep the taskbar layout redesign and banner zone switching parked; standalone taskbar and shared styling are implemented. Activity feeds and named
business actions require their own implementation work, not just CSS polish.
Splitter, editor, scheduler and global layout utilities remain guarded.

## Coverage gap

The original **[seen]** markers refer to one captured Home page. Subsequent
form, calendar, upload and IQA captures informed the implemented work above.
These captures still do not constitute full system coverage. Combo
boxes, trees, splitters and the editor appear in the stylesheets but not in
that capture — they're confirmed live only from the Workbench and Content
Designer sources. **Capture the other 8–10 screens before trusting this list as
complete.**

### Editable panel uploads (implemented)

Native `.PanelFieldValue > .RadUploadPanel` now shares Theme Upload / Content Import control styling, with a padded subtle surround and native drop overlay. Applies to inline and popup editors that emit these classes and load shared CSS; no author class or new upload handler. Field rules and Telerik lifecycle remain native. Resume is shown in the Data Panel comparison (Edit mode); the surrounding panel card is also approved and implemented.

### Data display panels (approved and implemented)

Shared CSS and UnionSuiteDataPanels in zUnionSuite.js automatically decorate native single/multiple Panel Editor cards. Includes IQA-family card/title/table/sort styling, preserved configured layouts, settings/edit/add controls and native delete input with trash icon and danger hover/focus. Native actions remain unchanged; no us-report author class. See Usage-Guide.html#data-panels-trial for installation and live checks. This supersedes the earlier panel trial status; local popup/Save simulations stay in references only.

## Actions menus — approved option 5 (implemented)

The shared theme supports authored us-actions, native BigButtonList, Member
Quick Actions, CaseActions.dropdown, custom actions-wrap and banner details.
Headers, separators, disabled/danger states, one submenu level, keyboard focus,
400ms opening/closing and the 1000ms inline line glint are implemented.
Namespaced explicit function registration replaces inline onclick for new HTML.
Other native context/Telerik menus remain unreviewed. See
[usage and examples](Theme/UnionSuite-Guides/Usage-Guide.html#action-menus).
Live iMIS popup/postback/permission testing remains required.


### Deferred: CCO navigation on grey backgrounds

The owner will revisit how vertical CCO navigation relates to white panel cards on a grey page when there is no shared content container. An optional standalone secondary navigation treatment is a design candidate, not an approved or implemented variant. Use the existing [CCO menu comparison](references/CCO-Tabs-Comparison.html) for the next review; see [parked work](../TODO.md#parked-by-owner). Retain approved V5/H2 and current mobile behaviour. This decision is separate from banner tab-to-zone switching.

### Dialog chrome (implemented; live verification pending)

Classic RadWindow_Bootstrap titles and reload/maximize/restore/close controls
now use shared typography, navy hover, inset pressed borders and red Close
states. Popup-document dividers use the theme border; load shared CSS/JS inside
the iframe as well as the parent. The captured HTML omits iframe footer markup,
so verify that coverage live. Alert/confirm/prompt content remains unreviewed.
See [usage and preview](Theme/UnionSuite-Guides/Usage-Guide.html#dialog-chrome).


### Deferred: alert, confirm and prompt dialogs

The owner has not encountered the Telerik versions and will supply an example if one appears. Leave these templates and standard browser dialogs unchanged; no replacement or styling work is queued until then. Approved content-window title/icon/footer styling remains implemented.

- Reusable row/panel badges: implemented `us-badge` (neutral), `us-badge--primary`, `us-badge--success`, `us-badge--warning`, `us-badge--danger` on authored spans. Shared CSS only; no automatic status detection. Usage guide includes visual examples and HTML.
