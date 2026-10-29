# Component references

Open [index.html](index.html) for the generated references. Maintain generators
and source templates, not the generated HTML. Captured fixtures in
prototypes/native-forms are sanitised; offline simulations do not make native
postbacks or prove live Telerik behavior.

Generated HTML in this directory is ignored by Git; use the commands below to
rebuild it after checkout. `index.html` and the accepted Taskbar/Recents workshop
outputs remain tracked. The two authored studies without separate generators
(`Convert-Icon-Preview.html` and `Task List Animations.html`) also remain tracked
until classified; they must not be treated as reproducible generated output. Canonical guide inputs live in
[guides/usage](../Theme/UnionSuite-Guides/usage/README.md); active and approved design
work follows the [prototype lifecycle](../prototypes/README.md). Ignored `archive/`
is for superseded research and must not supply guide build inputs.

## Status

- IQA-Expandable-Rows.html demonstrates row-only fade/spinner feedback, a blank native `rgExpandCol` heading, preserved row controls and native utility-column width, normal data-column resizing and hidden query columns. Its fixture simulates a short ASP.NET request; loading presentation uses shared theme code and native iMIS owns live requests. Build with `node Theme/UnionSuite-Guides/usage/build/iqa-expand-example.cjs`. The guide embeds the same source example. `tools/test-iqa-expand-columns.cjs` and `tools/test-iqa-row-loading.cjs` check shared CSS/JS, request routing, row bounds, cleanup and accessibility.
- Task-Rows-Workbench.html compares the accepted task row with the older two-line row. Each scenario renders twice at the same list width from the canonical Query Templates (`Tasks-Detail-Query-Template.html` and `Tasks-Completion-Query-Template.html`) inside native iPart wrappers, using the shipped theme CSS and behaviour and no styles of its own, with phone/panel/page width presets, light/dark and the real search, Show completed and completion behaviour. Completion now PUTs FollowUpActioned to i4u_UT_Interactions; this page answers that request itself and has a Simulate save failure switch, so no tenant is touched. Build with `node tools/build-task-rows-workbench.cjs`; the format, the decisions behind it and what is still open are in `prototypes/approved/task-rows/`.
- Activity-Cards-Workbench.html (work in progress, 25 September 2026) compares the owner's supplied Recent Activity card with a theme-token candidate for every history-style list: the combined activity feed, notes, cases, meetings and communications. Each list renders the candidate from the Query Templates in `prototypes/wip/activity-cards/templates/`, inside native iPart wrappers with the shipped theme CSS, Recent activity runs the real US-ACTIVITY-FEED module from the contact page v3 prototype on sample records, and also shows the supplied card frozen in its original styling (an isolated iframe); the candidate options (type colour, date position, row actions, rail, density, feed filters) toggle modifiers on `.us-records`. Build with `node tools/build-activity-cards-workbench.cjs` (add `--check` to confirm it is current); decisions and sources are in `prototypes/wip/activity-cards/README.md`.
- Home-Preview.html is a local homepage layout trial using the shared welcome header, Needs Attention, a shorter task list with an IQA-style header filter disclosure for search/Show completed, full-row hover feedback, outstanding/overdue footer counts, and five sample Staff Bulletin posts. Tasks can be ticked/unticked directly; completed tasks slide away and use green checks, struck-through titles and Actioned dates. Desktop panel bottoms align; task rows and bulletin posts scroll within bounded panels, with a bottom fade only while more content remains below. Build with `node tools/build-home-preview.cjs`; sources and integration notes are in `prototypes/legacy/Home/`. Task/queue data and interactions are illustrative. The home-welcome and home-welcome-date classes are shared CSS; the other home-* classes remain local.
- Native forms, choices/dropdowns, calendar, messages, buttons and report styles are implemented in shared assets. References demonstrate the approved presentation.
- Section-Loading.html includes the approved spinning circles plus unselected alternatives. Native popup/panel loaders and the IQA refresh overlay are implemented; alternative animations and simulated failure/retry examples remain reference-only.
- Taskbar-Comparison.html compares legacy colours with implemented shared accent-only overrides. Current layout is retained by the dedicated Scripts/UnionSuiteTaskbar.js replacement; all component CSS is in zUnionSuite.css. The separate layout redesign remains a trial.
- CCO-Tabs-Comparison.html contains five vertical and three horizontal accent-led trials (including the open-right V4 and warm V5 hybrid), plus a combined example covering nested Address and standalone native tab displays. It is independent of banners and supersedes earlier CCO-only options. V5 and H2 are now implemented in the shared theme; other alternatives remain archived. The stable build entry point delegates to Theme/UnionSuite-Guides/usage/build/build-tab-display-options.cjs; styles live in Theme/UnionSuite-Guides/usage/examples/Tab-Display-Options.css.
- Banner presentation is implemented; tab-to-zone switching is deferred.
- Section-Switcher.html demonstrates the shared page-sections adapter and the sliding accent underline on connected standalone menus. Build with `node Theme/UnionSuite-Guides/usage/build/section-tabs-example.cjs`; the usage guide embeds the same example. `node tools/test-section-indicator.cjs` checks motion, keyboard selection, reflow/scrolling and lifecycle cleanup. Deploy both shared CSS and JS; existing author classes and HTML are sufficient.
- See [inventory](../docs/THEME-INVENTORY.md) and [TODO](../TODO.md) for remaining reviews and live checks.

## Rebuild from the project root

Run these in order (form preview precedes button reference):

```text
node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs
node tools/build-form-preview.cjs
node tools/build-button-reference.cjs
node tools/build-message-reference.cjs
node tools/build-native-form-integration.cjs
node tools/build-choice-dropdown-comparison.cjs
node tools/build-calendar-comparison.cjs
node tools/build-section-loading.cjs
node tools/build-taskbar-comparison.cjs
node tools/build-cco-tabs-comparison.cjs
node tools/build-cco-tabs-comparison.cjs --check
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check
```

Rebuilding the parked taskbar reference only synchronises its generated file;
it does not promote it into the theme. Usage-Guide.html remains in Theme/UnionSuite.

- Data-Panel-Comparison.html: approved native Panel Editor styling, with read-only/edit/mobile examples and captured native markup integration. Build using node tools/build-data-panel-comparison.cjs.

- Data panel comparison also covers multi-instance records: header Add, row Edit popups, and trash/delete danger styling. All interactions remain offline simulations.

- Its native integration gallery also includes a sanitised Organisation Details capture with three Bootstrap columns and left-hand labels. Native frames include the base stylesheet as well as Orion/shared CSS so gutter and body-inset conflicts are visible. Single-instance content has 18px horizontal padding (14px on narrow screens); multi-instance tables remain flush. `tools/test-data-panel-wrappers.cjs` checks body padding, nested/class-wrapper ownership and field/title alignment against that capture.

- Action-Menu-Comparison.html: five visual directions for native, Quick Actions, Agreement and banner menus. Option 5 approved; other directions archived. Build with node tools/build-action-menu-comparison.cjs.

- Actions option 5 is approved in shared CSS/JS. The comparison preserves the
  five historical alternatives; the usage guide's Actions section runs the
  shared implementation and provides copyable HTML/client registration examples.
- `Action-Menu-Approved.html` is the standalone shared-runtime fixture, generated
  by `node Theme/UnionSuite-Guides/usage/build/action-menu-example.cjs`; handlers are offline simulations.
- Dialog-Chrome.html: shared title/icon/footer CSS with simplified offline window geometry; rebuild with node Theme/UnionSuite-Guides/usage/build/dialog-chrome-example.cjs. Native window operations are not simulated as real Telerik requests.

Taskbar-Preview.html runs the dedicated replacement script against guide-only fictional responses. Regenerate with node Theme/UnionSuite-Guides/usage/build/taskbar-preview.cjs.

Taskbar-Biscuit-Preview.html now runs the approved production Biscuit taskbar,
like Taskbar-Preview.html. Its review URL and independent preview daily key remain
available. Biscuit uses the shared CSS/JS: 30% larger golden drawing, attached
floppy ears, five-minute visit, 15-second idles and wave/hop/goodbye clicks.
Replay, light/dark and idle buttons remain offline fixture controls. Build with
`node tools/build-taskbar-biscuit.cjs` and verify with
`node tools/build-taskbar-biscuit.cjs --check`. No preview skin or mascot prototype
is required by the production theme.

- CCO-Sticky-Tabs.html demonstrates opt-in sticky sidebars alongside a condensing banner. Generate with `node Theme/UnionSuite-Guides/usage/build/cco-sticky-example.cjs`; it uses shared production CSS/JS and preview-only fixtures. This is separate from the deferred grey-background navigation design.

- Query Template Display search is implemented by the shared `us-query-search` iPart class. The searchable-task example in List-Templates.html uses canonical shared JS, with no search markup in its repeating template. `tools/test-query-search.cjs` checks filtering, native visibility, wrapper ownership, actions, AJAX replacement and cleanup.

- Heading-Icon-Toggles.html shows every IQA and Query Template heading icon button (filter, the relocated native Export, expand and Show completed tasks) in each state, light and dark, from the production stylesheets. Hover, press and keyboard focus are held open by copying the theme's own `:hover`, `:active` and `:focus-visible` rules onto a data attribute in the same cascade position; each cell carries its owner's real panel structure so the `--iqa-*` colours resolve as on a page. The usage guide build regenerates and checks it; run it alone with `node Theme/UnionSuite-Guides/usage/build/heading-toggle-reference.cjs` (add `--check` to confirm it is current).

Shared header icon actions are documented in the usage guide at
`#report-icon-actions` and shown on the task-filter example in List-Templates.html.
`us-report-icon-add-task` generates a labelled plus action; other icons use the
existing configureAction API. `tools/test-report-icon-actions.cjs` checks both
native query families, accessible labels, handlers, disabled states, refreshes
and touch targets. The guide example is generated by Theme/UnionSuite-Guides/usage/build/report-icon-example.cjs.
