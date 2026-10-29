# Union Suite theme

Open [Theme-Config.html](../UnionSuite-Guides/Theme-Config.html) for the client branding workspace:
five seed colours, optional advanced overrides and focused live component
examples. It works offline; edits update the page immediately and are discarded
on reload. Persistence is deferred. The usage-guide build also rebuilds this page.

Open [Usage-Guide.html](../UnionSuite-Guides/Usage-Guide.html) for the maintained, standalone author
handbook: branding and tokens, class placement, banner and report recipes,
copyable/downloadable templates, troubleshooting and feature status. It works
offline and can be shared as one HTML file.

**iPart CSS classes change the DOM:** iMIS adds a separate classed div inside
ContentItemContainer around the native output. Support direct and wrapped
panels in selectors, JavaScript detection and previews. See
[the wrapper examples](../UnionSuite-Guides/Usage-Guide.html#ipart-class-wrapper) before changing an
iPart's shell or header actions.

The [UnionSuite-Guides/usage directory](../UnionSuite-Guides/usage/README.md) is the documentation source of truth.
Update `../UnionSuite-Guides/usage/source/Usage-Guide.source.html` alongside feature changes, then run
`node tools/build-theme-usage.cjs` from the project root. The generator imports
tokens and templates from their maintained source files. Run the same command
with `--check` to detect a stale deliverable, then run `node tools/check-usage-sources.cjs`.
See [UnionSuite-Guides/usage/README.md](../UnionSuite-Guides/usage/README.md) for source ownership and the
maintenance workflow. Generated HTML is ignored by Git; rebuild it after checkout.

Native button colours, the approved Query Menu / IQA component and all banner CSS are included in this local theme.
The live site still needs the updated assets and shared script include.

Standard RiSE page layouts now use 24px horizontal gutters automatically through
`99-Orion.css`. The rule matches layout rows containing native iPart zones under
ContentPanel, ContentWizardDisplay or EmptyMasterContentPanel, including native
CCO pages. Form/component rows, card padding and vertical iPart spacing keep
their existing values. No new author class is required. Deploy the updated
foundation to each page's theme, including iframe content themes. See
[the layout example and exact scope](../UnionSuite-Guides/Usage-Guide.html#page-layout-spacing).

For a single embedded content page, put `EmbeddedCCO` in the CCO iPart's
**CSS class** field. The shared stylesheet hides its outer header/tab strip
and removes the surrounding panel surface and padding, including the empty
vertical navigation rail. Nested panels and tabs retain their styling. See
[the interactive example and placement notes](../UnionSuite-Guides/Usage-Guide.html#embedded-cco).
This modifier needs updated `zUnionSuite.css` only; no custom CCO package change.

The [Membership Overview cards](../UnionSuite-Guides/Usage-Guide.html#membership-stats) are implemented
in the shared CSS/JS. Copy the six Content HTML templates into the embedded Stats
page using RiSE rows 12 / 12 / 8+4 / 8+4. The cards execute `GET /api/query` only
when visible and share cached results; the time-series card is a placeholder.
See [the template installation notes](../../Theme/UnionSuite-Guides/usage/templates/Home/Stats/README.md) for
the six IQAs, named date filters, financial-status configuration and `(empty)`
buckets. The offline home/guide examples embed a verified probe capture; production
loads live data. Install both updated shared assets on the embedded page.
Side-by-side membership cards now stretch through their native iMIS wrappers
to match the tallest card in each Bootstrap row; stacked mobile cards retain
natural heights. Update both shared assets for this behaviour. Existing card
HTML and Bootstrap column settings remain unchanged.

## Files and installation

### Stylesheet ownership

`99-Orion.css` is our editable theme foundation. Prefer updating its existing
native colours, spacing, borders and states directly instead of stacking new
overrides. Use shared theme tokens for inherited hard-coded colours.

Keep tokens and UnionSuite additions (IQA enhancements, spinners, taskbar and
banners) in `zUnionSuite.css`. Client branding values and deliberate client-only
differences belong in `../UnionSuite-Client/Override.css`, after shared CSS (the
client stylesheet role also appears below as `zzClientSpecific.css`).

Dark mode is the exception: its palette, toggle styling and all mode-specific
overrides live only in `zzDarkMode.css`, loaded **last**, after both client files.
It is a separately deployed CSS file, not an import or build-time bundle.
The existing shared JS owns document preferences; the taskbar generates the switch.
See [dark mode installation and limits](../UnionSuite-Guides/Usage-Guide.html#taskbar-dark-mode).

Consolidate redundant overrides when touching a component, preserving and
checking its native states and behaviour. Existing overrides have not all been
migrated; a blanket rewrite is not required. Deploy any changed foundation CSS
alongside the affected shared assets.

| File | Purpose |
|---|---|
| `99-Orion.css` | Native theme foundation |
| `Tabler.css` + `Tabler/` | Root icon stylesheet shim and bundled Tabler 3.31.0 CSS/font/licence |
| `zUnionSuite.css` | Design tokens, staff navigation icon mappings, native button colours, IQA report CSS, separate banner page-layout and component CSS sections |
| `zzClientSpecific.css` | Client logo and token overrides; load after `zUnionSuite.css` |
| `zzDarkMode.css` | Dark palette, native/component overrides and taskbar switch styling; load last |
| `zUnionSuite.js` | Shared IQA utilities, banner sticky/collapse, Actions disclosure and icon-button tooltips |
| `Scripts/UnionSuiteTaskbar.js` | Header taskbar and approved Biscuit daily greeting, click reactions and idle animations |
| `Scripts/HtmlSourceEditor.js` | Shared HTML source editor: highlighting, formatting, tag pairing and `{#…}` field suggestions; styles in `zUnionSuite.css` (`US-HTML-SOURCE`) |
| `../UnionSuite-Client/Config.js` | Client taskbar settings, including Biscuit's on/off switch; load before the taskbar script |

1. Upload `zUnionSuite.css` and `zUnionSuite.js` to the deployed Union Suite theme
   folder. Keep the existing native styles, skins, icons and client stylesheet.
2. Confirm stylesheet order: native Orion, `zUnionSuite.css`, then
   client Branding/Override (or `zzClientSpecific.css`), then `zzDarkMode.css` last. Supported native Query Menu iParts automatically get
   the full report styling and available Filters/Export icons; no report class
   is required. Existing native `TextButton`/`btn`
   controls receive the shared colour mapping without an opt-in class.
3. Load the scripts through the theme loader, `index.js` (confirmed on the dev
   tenant, 3 October 2026). It is the only header include: it loads
   `zUnionSuite.js`, `Scripts/ActionDefinitions.js`, the taskbar and the
   page-specific scripts in dependency order. Deploy the include once; later
   releases ship in the theme folder, with `RELEASE` in `index.js` bumped.
   A file placed in the theme folder is not loaded unless the loader lists it.
   For a deployment whose script folder is `UnionSuite-Core`, use:

   ```html
   <script>
     (function () {
       var s = document.createElement('script');
       s.src = '/App_Themes/UnionSuite-Core/index.js?t=' + Math.floor(Date.now() / 1200000);
       s.async = true;
       document.head.appendChild(s);
     })();
   </script>
   ```

   Adjust the theme folder or application path to the actual deployment. Use
   the resolved URL in the rendered page, not a Windows filesystem path. The
   script uses the page's native iMIS/Telerik controls and ASP.NET AJAX lifecycle;
   it does not require a second jQuery or a build step. Confirm it loads once on
   report pages and on any popup documents that should use these enhancements.
4. Remove the entire old standalone IQA style/script embed from test pages once
   the shared assets are included. The approved legacy reference is now
   [Query Menu Display Styling.html](../../prototypes/legacy/Query%20Menu%20Display%20Styling.html)
   in `prototypes/` (previously named `Contact-Search-IQA-Style.html`).
   Do not load both implementations: the old singleton
   could initialize first and prevent the shared version from taking ownership.
5. Reload with the updated assets, then verify normal view, expanded view,
   sorting, query selection, filters, Export, page size, paging and Easy Edit.
   Test the first page with no standalone embed so the actual theme cascade is
   exercised. Adding these local files does not publish the theme or site.

## Staff navigation icons

The `US-STAFF-NAV-ICONS` block in `zUnionSuite.css` now owns the eight custom
navigation mappings previously kept under `/* --- Staff Site nav icons --- */`
in `UTStaff.css`. Existing navigation settings remain usable: `Nav-Icon` plus
`Home`, `Organising`, `Cases`, `Agreements`, `Calls`, `Committees`, `Travel` or
`Integrations`. iMIS adds `-wrapper` to these classes on the root tree row.
No new icon element or `ti` class is needed for those rows.

Home uses `ti-home`; Organising/Committees use `ti-users-group`; Cases uses
`ti-briefcase`; Agreements uses `ti-contract`; Calls uses
`ti-phone-outgoing`; Travel uses `ti-plane`; Integrations uses `ti-settings`.
Normal icons use `--brand-100`; hover, keyboard focus, selected and selected-child
states use `--accent`. The font stays at weight 400 and occupies a 32px slot.
Native Orion sprite icons and expand/collapse controls keep their existing rules.

Deploy the updated `zUnionSuite.css` with the existing root `Tabler.css`,
`Tabler/tabler-icons.min.css` and `Tabler/fonts/tabler-icons.woff2` intact.
Keep `Tabler/LICENSE` with the package. After verifying the new theme, the old
staff-icon rules can be removed from a separate live `UTStaff.css` include;
the repository copy remains a legacy reference. Do not reload that whole legacy
stylesheet just for icons. See the [navigation usage recipe](../UnionSuite-Guides/Usage-Guide.html#navigation-icons)
for class placement, the complete mapping and troubleshooting.

## Existing native buttons

`TextButton` and `btn` use navy secondary emphasis. `PrimaryButton` and
`UsePrimaryButton` use the orange primary accent. For authored main actions
previously relying on plain TextButton being orange, add PrimaryButton; keep
native generated classes and handlers. `AccentButton`, `LinkButton`, `DangerButton` and `SuccessButton` use
the corresponding tokens. Native size and group classes retain their layout.
Report Find/filled actions follow the accent; Export keeps its neutral styling.

See [THEME-BUTTONS.md](../../docs/THEME-BUTTONS.md) for the complete native inventory,
token mapping, wrapper placement, specialised controls and verification scope.
No new button class family is introduced. Dedicated secondary/warning variants
are not present in the captured native sheets and are not implemented aliases.
The usage guide includes live native-class examples and copyable HTML.

## Action icons and the visual usage guide

Use a direct `ti` icon child inside an existing `TextButton`/`btn`. For compact
icon-only actions, add `us-icon-button` to that same control and give it an
`aria-label`, e.g. `Edit Alex Morgan`. An inner `ti ti-pencil` with
`aria-hidden="true"` supplies the glyph. `DangerButton` keeps delete actions
semantic. Shared JS supplies hover/focus tooltips. Preserve native handlers;
no action is inferred or injected from its label. See [THEME-BUTTONS.md](../../docs/THEME-BUTTONS.md).

The guide has prominent **Buttons & usage**, **Action icons & usage** and
**IQA reports** sections. Each implemented element has a visual example,
click-to-copy classes, placement instructions and relevant copyable HTML.
There are 20 native-button recipes, 25 action-icon recipes, separate Contact and
dashboard banner previews, semantic banner parts and the interactive banner.
The dummy IQA contains 12 fictional members and guide-only data controls; its
Filters and Expand use shared theme JS. Do not deploy the dummy data simulation
as an iMIS query implementation. Preview seed edits update every embedded
example. The font is embedded in the portable guide, which works offline.

## Classes for a Query Menu iPart

Enter space-separated classes in the **Query Menu iPart's CSS class field**,
without leading dots. Configure its native Title, Description, heading level,
IQA/query folder and access settings as usual. Apply these classes to the
individual iPart, not the zone, page or a group containing unrelated iParts.

| Class | Effect | Requires |
|---|---|---|
| `us-report` | Compatibility class; full responsive filter/table styling and header utilities are already automatic | Theme CSS and JS |
| `us-filters-collapsible` | Legacy compatibility class; Filters is now automatic when native fields exist | No longer required |
| `us-filters-collapsed` | Changes the initial filter state to closed | Native Query Menu |
| `us-report-expandable` | Optional Expand/Restore for the supported native grid layout | Native Query Menu; no us-report required |
| `us-action-AREA-COMMAND` | Registered action; definition supplies presentation, context and operation | Shared engine and registration file |
| `us-report-no-styling` | Native iMIS presentation; disables report enhancements | Takes precedence over other report classes |
| `SearchContactsClass` | Compatibility alias for `us-report`; existing test pages continue to work | Theme CSS and JS |

Typical configurations:

| Use | CSS class field |
|---|---|
| Full report styling and available Filters/Export | No added class |
| Legacy compatibility (same appearance) | `us-report` |
| Filters initially closed | `us-filters-collapsed` |
| Default report with Expand | `us-report-expandable` |
| Registered member Add Note and Expand | `us-action-member-add-note us-report-expandable` |
| Enhanced layout, filters initially closed and Expand | `us-filters-collapsed us-report-expandable` |

Neither `us-report` nor `SearchContactsClass` is required. Both remain compatible aliases for the same styling.
Changing the alias does not change the generated grid IDs, so existing filter
preferences continue to apply. The user's filter choice is remembered per
report/query in the browser tab; changing the query or initial-state class
resets it. `us-filters-collapsed` overrides stored preferences on initialization/reconciliation without overwriting the normal saved choice. Users can open filters and validation can reopen them.

## Included behavior

- Native title/description, understated query-folder selector, responsive
  filters, multiselect chips, report rows, pager and composite page-size control.
- Whole-cell native sort links; right-aligned sort icons; blue hover without
  the active underline; persistent direction and underline on the sorted column.
- One shared row for icon-only Filters, Export and optional Expand, plus a
  custom action slot that supports both labelled buttons and text links.
- Filter show/hide transition (180 ms), validation reopening and reduced motion.
- Full-window report with pinned title/filters, sticky column headings, scrolling
  data and pinned native pagination. Expand/Restore uses a 240 ms transition,
  returns to the captured page position and supports Escape and reduced motion.
- Expanded backgrounds reach the screen edges; text/control padding is 12–24 px.
  The floating Cookie Preferences tab is hidden only while a report is expanded.
- Native IDs, handlers, form ownership, filter values and custom action nodes
  are retained. Moved controls return to their original positions before an
  ASP.NET partial update; the updated report is reconciled afterwards.

Full report CSS applies to automatically detected native Query Menu
wrappers marked by the adapter with `data-us-iqa-native`, as well as the legacy
`us-report` and `SearchContactsClass` aliases. This adapter is
for Query Menu IQA grids, including single queries and query folders. It does
not automatically restyle Query Template Displays, trackers, banners or grouped
panels. Expanded view supports the captured single-table RadGrid structure;
already-split or virtualized grid layouts receive a disabled Expand control.

## Tokens and extension points

Native single-table reports now have column resize separators by default. Drag a
heading edge, or focus the separator and use Left/Right (10px), Shift+arrow (40px)
or Home (fit visible content). Widths persist in memory across partial updates for
the same grid/query/headings. Wide tables scroll horizontally. ID/Member ID/Legacy
ID/Party ID columns do not wrap and cannot shrink below the longest displayed
value or heading. Measurement is per rendered page, not all server records.
Hidden columns retain their native indexes and visibility; adapter 1.1 skips them without blocking resizing or ID sizing on visible columns. Fully hidden tables defer initialization. Split grids, spanning rows/headers and recognised native resizing are excluded.
`us-report-no-styling` disables this adapter. See the guide for the working sample
and lifecycle limits; deployed Telerik resize/pager behaviour needs a live check.

Colors come from the theme's semantic variables and therefore follow the client
seed overrides in `zzClientSpecific.css`. Component variables use the `--iqa-*`
prefix. For example, `--iqa-expanded-inset` controls expanded text padding.
The duration settings are `filterDuration` and `windowDuration` in the shared JS.

The report utility API remains `window.UnionSuiteIqaFilters`: `refresh()`,
`getActionSlot(ipartWrapper)` and `restoreReport()`. Reconciliation emits
`us:panel-actions-ready` with the immediate owner and slot. Business actions now
use one `UnionSuiteActions.define` registry; the old report register/configure
methods and suffix-derived IDs are retired.

Load `zUnionSuite.js`, `Scripts/ActionDefinitions.js`, then client
`../UnionSuite-Client/Actions.js` once in order. Definitions separate presentation,
context and action. Repeated controls have unique IDs; required missing context
disables them. See [the complete API and execution route](../UnionSuite-Guides/Usage-Guide.html#unified-action-route).

See [panel actions and report behavior](../../docs/THEME-PANEL-ACTIONS.md),
[the element inventory](../../docs/THEME-INVENTORY.md),
[iMIS CMS structure](../../docs/IMIS-CMS-STRUCTURE.md), and
[the activity-feed plan](../../docs/THEME-ACTIVITY-FEED.md).

## Banner classes — shared theme CSS and JavaScript

The reusable banner's complete CSS is in `zUnionSuite.css`. Page-layout rules
are in `US-BANNER-PAGE-LAYOUT`; component defaults, layout, optional controls,
responsive/compact states and print rules are in `US-BANNER-COMPONENT`.
Client overrides continue to load afterwards through `zzClientSpecific.css`.

Banner sticky/collapse and Actions behaviour now live in the marked
`US-BANNER-BEHAVIOUR` section of `zUnionSuite.js`. The shared include above
supplies both components. Deploy the updated CSS and JS, remove the old
separate banner embed/script include, then reload and verify scrolling,
Actions and the native partial-refresh lifecycle. Keep the visible HTML and
iPart/page classes. The old embed and standalone banner JS remain generated
fallbacks for older deployments only. See the [banner guide](../../Theme/UnionSuite-Guides/usage/examples/Banner-README.md).

These combinations go on the **banner iPart**, for either Query Template
Display or Content HTML:

| iPart CSS classes | Behaviour |
|---|---|
| `us-banner` | Normal banner; scrolls away with the page |
| `us-banner us-banner-sticky` | Sticky banner; retains all details |
| `us-banner us-banner-collapsible` | Sticky banner; condenses on scroll |

`us-banner-collapsible` includes sticky behaviour. There is no non-sticky
scroll-collapse mode, and adding both modifiers is redundant. The optional
`us-banner-page` belongs in the **page** CSS class field and controls full-width
layout only. No classes are needed on other content zones. Sticky/condensing
requires the shared theme JS; apply the classes to the content iPart, not the
separate behaviour embed. Keep page-layout CSS and component CSS in their own
sections during future updates. The zone tab switcher remains deferred.

The [complete banner template](../../Theme/UnionSuite-Guides/usage/templates/Banner-Template.html) includes
removable Actions and tabs divs. The disclosure works; sample commands still
need verified handlers or destinations, and tab switching remains planned.
For lightweight dashboards, the preferred tab adapter will show/hide matching
page zones without reloading the page; all zones still load initially. CCO is
a separate option, not a dependency of the dashboard approach. See the
[tab switcher plan](../../prototypes/wip/banner-tabs/Banner-Tabs-Plan.md).
Simpler [dashboard](../../Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html) and
[Contact](../../Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html) templates are included
in the standalone guide. Its [maintenance workflow](docs/README.md) imports
these sources and the current tokens when rebuilding the portable HTML.

## Mapping CSVs

- [Current condensed component inventory](../../docs/crm-member-profile/CRM-Member-Profile-Component-Types-Updated.csv), including the planned combined activity feed.
- [Earlier condensed inventory, updated for the theme](../../docs/crm-member-profile/CRM-Member-Profile-Component-Types-Theme.csv).
- [Detailed prototype-to-iPart mapping, updated for the theme](../../docs/crm-member-profile/CRM-Member-Profile-iPart-Mapping-Theme.csv).

The two `-Theme.csv` copies replace the corresponding original CSVs for this
update: those originals were locked by another process and could not be saved.
The copies preserve all rows and user assignments and update only the relevant
recommendations and notes. The current condensed `-Updated.csv` was updated in place.

## HTML source editor

[HtmlSourceEditor.js](Scripts/HtmlSourceEditor.js) is a shared helper for editing
HTML as source text. It registers `window.UnionSuiteHtmlSource` and attaches
nothing by itself: each page script chooses where to use it. Its styles are the
`US-HTML-SOURCE` section of `zUnionSuite.css`, with dark values in
`zzDarkMode.css`. Deploy the script with both stylesheets and the loader.

| Feature | Behaviour |
|---|---|
| Highlighting | Tags, attributes, values, comments, entities and `{#…}` fields are colour-coded behind the unchanged textarea. |
| Format HTML | Button or Shift+Alt+F. Re-indents without changing tags or attributes, adding end tags or touching `pre`, `textarea` and `script` content. Undo with Ctrl+Z. |
| Tag pairing | The tag under the cursor and its partner are highlighted. A tag that is never closed, or a closing tag with nothing to close, is underlined and listed with its line; **Go to problem** steps through them. Tags HTML lets you leave open (`p`, `li`, `td` and similar) are not reported. |
| Field suggestions | Type `{#`, or press Ctrl+Space, for the fields a page supplies. `{#…}` placeholders in a namespace the list covers but missing from it are flagged. |

Current use: the IQA Template tab (`IQA-Enhancements.js`), with the native
"Insert data source field" items as suggestions. The loader loads the helper
only on the pages listed in its `html-source` entry; add each page that adopts
it there.

```js
const source = window.UnionSuiteHtmlSource;

// A RadEditor's HTML view. fieldTool is the insert-field tool's name, 'auto'
// for any tool whose items are {#…} placeholders, or null for no suggestions.
const editor = source.attachRadEditor(radEditorElement, { fieldTool: 'auto' });

// Any other HTML textarea. fields() returns [] of fields, or null for none.
const plain = source.attach(textarea, { fields: () => null });

editor.dispose(); // Restores the textarea and removes every addition.
```

`format(html)` and `tagPairs(html)` are also available without a textarea.
Run `node tools/test-html-source-editor.cjs` after changing the helper.

## Integration verification

Local checks confirmed JavaScript syntax, preservation of the original theme
tokens, and parity with the approved embed apart from scope and documentation
changes. Startup checks covered both document-loading states, the canonical and
legacy scope selector, native AJAX subscriptions and repeated script inclusion.
CSV round trips preserved all rows, assignments and unrelated values; local
documentation links were checked. The shared assets have not been rendered or
tested on a live iMIS page in this integration pass; use the installation checks
above when applying them.

## Live brand preview

The usage guide has a five-seed editor with colour pickers and hex fields.
Validated edits inject one preview stylesheet into the guide and all component
frames. The combined sample uses real theme CSS/JS for banners, native buttons
and an illustrative IQA report. Copy/download the generated CSS into the client
stylesheet to apply it. Reset restores source colours; preview changes are not
saved to files or persisted across reloads.

### Ordinary form fields
Add `us-form` to an iPart/container around native PanelField markup. Shared CSS supplies field appearance; shared JS enhances direct native file inputs with drag-and-drop and preserves their change handlers. IQA and specialised widget skins are excluded. PrimaryButton reversal applies automatically, excluding compact icon and semantic controls. See Usage-Guide.html#forms for examples, copyable classes and full placement instructions.

### Native feedback messages
Approved Asi* message styles now ship in zUnionSuite.css under US-MESSAGES. No opt-in class is needed. Semantic tokens, 24px native message icons and baseline-aligned inline spans are covered. SecurityIndicator and icon-only spans are excluded. Usage-Guide.html#messages includes examples and placement; references/Message-Reference.html compares native and themed appearances.

## Native form integration
US-NATIVE-FORMS in zUnionSuite.css styles ordinary PanelFieldValue controls automatically (36px single-line controls; multiline padding, focus and disabled states). IQA and specialised widgets are excluded; scoped adapters cover organisation autocomplete and address Status. Address Phone/Fax/Email rows are hidden by native ID suffix, not removed or disabled. Remaining address fields use 280px responsive widths. Theme Upload receives a grouped layout and white selected-file surface; its Telerik Select/Remove controls are preserved. zUnionSuite.js adds the upload drop highlight and dispatches native input/change events after file selection. Verify Telerik validation, Remove and upload on live iMIS. Offline preview fallback is not shipped.

## Shared busy presentation
Deploy zUnionSuite.css and zUnionSuite.js together. UnionSuiteBusy centralises native and custom spinner presentation; UnionSuiteButtons.run remains the custom Promise helper. Native Find, Sign In and command-bar Save adapters retain their lifecycle logic. See Usage-Guide.html for the show/clear API and supported scopes.

Native panel editors: .PanelEditorEditForm uses container-based field sizing (150px labels / 280px controls with 16px gap at 460px column width; stacked full-width controls below). CalendarInput2 wrappers participate; checkbox/radio sizing is unchanged. See Usage-Guide.html and references/Native-Form-Integration.html. Live Telerik calendar interaction remains a deployment check.

CCO wizard Next/Previous: UnionSuiteWizardBusy 1.2 in shared JS uses accepted ASP.NET partial requests to show the centred ring. Matches CommandBar TextButton inputs with native CCO IDs ending _btnNext_N / _btnPrevious_N; disables Next during accepted requests and restores its prior state on cleanup; validation, submission and Previous disabled handling remain native. The owner confirmed CCO navigation loading works; remaining validation and recovery paths still need live checks.

Wizard 1.2 also handles native full-page form submissions (confirmed by live navigation logs), preserving Next submit values before disabling it. Validate blocked submission and browser Back restoration live.

Approved choices and dropdowns are in shared CSS: white checkbox mark and outlined radio/dot use accent by default; --checkbox-colour and --radio-colour support independent primary overrides in zzClientSpecific.css. Native Telerik RadComboBoxDropDown styling is automatic. Native select menus remain browser-owned. Verify the deployed Telerik skin and keyboard behaviour live. The taskbar and Biscuit are implemented; unselected taskbar comparisons remain previews.

Calendar styling is now included in zUnionSuite.css (US-NATIVE-CALENDAR). Covers RadCalendar and RadCalendarMonthView, including month heading, SelectTodayLink footer, navigation, date states and rcMView_Today/OK/Cancel. No custom picker or replacement handlers. Live Telerik rendering and keyboard navigation remain deployment checks. Selector reference: https://www.telerik.com/teststudio/documentation/api/telerik.webaii.controls.html.calendarconstants

IQA Refresh: UnionSuiteIqaRefresh 1.0 shows the approved spinning-circles loader over a faded grid during accepted ASP.NET partial requests. The refresh input’s data-ajaxupdatedcontrolid supplies the target; native messages remain unchanged. Deploy both shared CSS and JS. Overlay geometry and cleanup were verified locally; live lifecycle remains a deployment check.

IQA Find and sorting: UnionSuiteIqaBusy 3.1 retains the Find button ring and adds a spinning-circles
indicator over the visible `.rgMasterTable > tbody`, using a 72% surface overlay.
It clips to the scroll container and viewport, leaving headings, filters and pager
outside the overlay. Only that report's native `_UpdateProgress1` message is hidden,
and only while the replacement is visible. Without a usable results body, native
Loading remains the fallback. Completion/error/page exit restores `aria-busy`,
removes the overlay and releases the message suppression. Native validation,
submission and disabled states are retained; `us-report-no-styling` opts out.
Deploy shared CSS and JS together. The guide's Find example uses an 850ms local
delay and `UnionSuiteIqaBusy.showResults(button)` with its returned `clear()` handle;
the delay and dummy query simulation are never shipped in production JS.
Unit tests cover clipped geometry, fallback and cleanup; live requests and browser
appearance still require verification.

IQA date ranges: native `GridFilterCalendar` controls now use aligned stacked or
inline layouts according to field width (including search sheets that place
filters straight into Bootstrap columns), integrated calendar buttons, and the
approved form calendar glyph. Older ASP.NET `CalendarBehavior` popups receive
shared `ajax__calendar` styling alongside the existing Telerik calendar styles.
Native date conversion, popup navigation and validation remain in control. The
guide includes an appearance-only legacy popup example; verify native behavior
after deployment.

Theme Upload Save: UnionSuiteThemeSaveBusy 1.2 recognises _AppThemeEditControl_UploadButton, _TemplateBody_ImportButton and _TemplateBody_UploadButton within _ImporterControlPanel and uses the centred simple button ring after accepted partial or native full-page submission. Validation and file upload remain native. Verify live after deploying shared JS.

Native Import loading: UnionSuiteThemeSaveBusy 1.1 also recognises input.TextButton ending _TemplateBody_ImportButton. Uses the same centred ring and accepted-postback lifecycle as Theme Save; native validation and import submission remain in control.

## Latest native integration status

Theme Upload and XML Import share the compact file row, secondary Select/Remove states and drop highlight (ZIP or XML prompt). The owner reports the upload forms look good; native validation, file limits and removal/upload handlers remain authoritative.

Native IQA rows now have one surface colour with dividers and separate hover/selection states. The query selector uses a transparent, unboxed container, semibold label and a full-width divider on its parent row; FilterPanelHorizontal keeps a top label and one-third desktop width, full-width below 768px, without changing the native filter columns.

Calendar first-open focus decoration is drawn only on the date link, and the month chevron is centred with inline flex. These latest IQA/calendar refinements have local checks and await live confirmation.

Use [the inventory](../../docs/THEME-INVENTORY.md) for feature status and [TODO](../../TODO.md) for outstanding checks, review candidates and parked work.

Staff sidebar presentation (US-STAFF-NAV): brand-800 menu, a 6% white blend for submenus, subtle hover and stronger selected tint with an accent bar. Native sprite/font icon hover uses accent. Scope is SideBarPanel / RadTreeView_Orion; no author class or new JS. Indentation, flyout geometry and native navigation remain unchanged. Custom raster icons are not recoloured. Verify expanded/collapsed, nested, selected and keyboard states live.

Top-level Orion navigation items retain a subtle lighter background on hover and focus-within, alongside the accent icon highlight.

Column-sort partial requests use the same results-body overlay and native Loading suppression as Find, without a ring on the header. The adapter recognises native sort links and same-grid Telerik postbacks during the header click; cancelled clicks do not start loading. No optional class is required. The guide simulates both operations with an 850ms delay. Verify native sorting and request completion/error after uploading the shared JS.

## Approved Actions menus (option 5)

Shared `zUnionSuite.css` and `zUnionSuite.js` now provide neutral inset menus,
400ms disclosure/inline submenu motion and a one-shot 1000ms line glint.
New markup uses `us-actions`; supported native, Quick Actions, custom Agreement
and banner menus are adapted automatically. Original unregistered item handlers
and links remain native. Other context/Telerik menus still need review.

Use [the Actions guide](../UnionSuite-Guides/Usage-Guide.html#action-menus) for exact placement,
HTML, migration, keyboard/lifecycle behaviour and limits. Author template:
[Action-Menu-Template.html](../../Theme/UnionSuite-Guides/usage/templates/Action-Menu-Template.html).
Register namespaced definitions via `UnionSuiteActions.define(key, definition)` in a
client-owned JS file loaded once after the shared theme. The
[client example](../../Theme/UnionSuite-Guides/usage/examples/Client-Actions.example.js) uses the supplied
case popup functions; review its editor destination for the intended page.
There are no inline onclick handlers or dynamic function-name evaluation.
The old banner-only compatibility embed does not include this shared registry.

## Dialog chrome

Classic RadWindow_Bootstrap title typography and reload/maximize/restore/close
states are automatic with shared CSS. Popup footer dividers require shared
CSS/JS inside the popup document (IsPopup=true), or the optional authored
us-dialog-footer container. See [usage](../UnionSuite-Guides/Usage-Guide.html#dialog-chrome).
Window sizing, native actions and resize footer remain native. Verify the live
iframe footer markup and Telerik states after upload.

## Taskbar and Biscuit

The approved Biscuit behaviour is included in `Scripts/UnionSuiteTaskbar.js` (1.7)
and `zUnionSuite.css`, with the dark palette in `zzDarkMode.css`. Biscuit sits on
the header divider, left of the management shortcuts, without a separator.
His 30% larger golden drawing and attached floppy ears use a 96px reserved slot.
He greets the signed-in user once per local day, stays for five minutes and
uses the normal slide-away on timeout. Every 15 seconds, an available idle
beat chooses a head scratch or curious tilt. Clicks play wave, happy hop,
then the duck/look-around/startled goodbye. Reduced motion and teardown
cleanup are supported; no mascot prototype or external image is required.

Refresh the existing upload archives with `powershell -NoProfile -File
tools/package-taskbar.ps1` after rebuilding the usage guide. The script
updates the taskbar-related entries in `Theme/UnionSuite.zip` and the
Biscuit setting in `Theme/UnionSuite-Client.zip`, preserving other archive entries.

Load the client's `Config.js` before the taskbar script; `pipGreeting: true`
enables Biscuit and `false` removes him and his reserved space. Remove the old
taskbar injection and include `Scripts/UnionSuiteTaskbar.js` once with `defer`.
Keep `zzDarkMode.css` last after client CSS. See
[the taskbar installation notes](Scripts/README.md) and
[the complete Biscuit guide](../UnionSuite-Guides/Usage-Guide.html#taskbar-pip).
The legacy `pipGreeting`, `pipStoragePrefix`, `playPipIdle()` and CSS hooks now
control Biscuit. Existing daily records are preserved. Deploy the script and
both stylesheets together. Replay and idle-trigger buttons stay in the preview.
Updating the local theme and archives does not upload them to iMIS.

### Standard business actions

The dedicated [ActionDefinitions.js](Scripts/ActionDefinitions.js) installs fifteen
definitions for member operations, Add Contact Method, Job row edit/delete and Manage Bulletin,
plus the agreement page set: 28 `agreements.*` definitions, the CloudToolz call and the
agreement task saver (3 October 2026).
Use [the current inventory](../../references/Theme-Button-Function-Inventory.md)
for every class, context source and handler. Job edit/delete refresh the native
report containing the clicked control, including after partial replacement.
Add Job/Address now use native popups; seven other member helpers still
require the existing site functions file.

The new [client Actions.js](../UnionSuite-Client/Actions.js) is the extension point.
Home/Case task editor contracts and the permission provider remain client inputs.
Never use client visibility as a substitute for server authorization.

See [conversion checklist](../../references/Unified-Action-Conversion-Checklist.md)
and [helper cleanup status](../../references/Helper-Cleanup-Status.md) before
removing legacy helpers. The local build does not update published CMS content
or upload the theme. Upload the loose files together; existing ZIP archives
have not been repackaged for this change.
