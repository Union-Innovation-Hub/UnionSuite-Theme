# Theme enhancement integration: loader and file structure

Reviewed 20 September 2026. **Option C taskbar design approved and locked for implementation. Loader architecture and production integration remain planned; this is not a deployment instruction.**

Updated 21 September 2026: a trial loader has been built and exercised against the dev tenant. See [Loader trial: step 1 results](#loader-trial-step-1-results). The trial confirms the delivery mechanism only; feature migration remains planned.

Updated 3 October 2026: **the loader is confirmed** as the theme's header include, after the trial (owner). `Theme/UnionSuite/index.js` is no longer marked as a trial and its release is `1.0.0`. The installation steps in the usage guide and the theme README now use it. Context classification, the client folder and the file renames below are still planned.

Updated 22 September 2026: the agreed target combines the taskbar, bookmarks, navigation catalogue handling and Recents in `Taskbar.js`, keeps destination definitions in `Data/Navigation.json`, and groups shared helpers in `Shared.js`. The feature name is **Quick Navigation**, with **Go to…** retained on the taskbar button. DevTools becomes one file controlled by a single **Dev Mode** switch available only while Easy Edit is active. These are planning decisions; the runtime files have not yet been merged or renamed.

This maps the iMIS Enhanced implementation plan into the existing UnionSuite theme. The current request changes the delivery destination from a separate enhancement suite to this theme. Existing feature scope and behaviour remain the starting point; CDN-only delivery and a second taskbar are not prerequisites.

Reviewed inputs:

- [Implementation plan](<../iMIS Enhanced/IMPLEMENTATION-PLAN.md>) and [feature plan](<../iMIS Enhanced/ENHANCEMENTS-PLAN.md>), updated 19 September.
- [Current IQA output](<../iMIS Enhanced/upload/IQA-Theme/IQA-Enhancements.js>), 216,748 bytes at review. This is the current integration input; the older 55 KB baseline is incomplete by comparison.
- Existing [theme core](../Theme/UnionSuite/zUnionSuite.js), [taskbar](../Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js), action registrations, client settings and stylesheet ownership.
- RiSE/metadata/source-overlay probes, the reviewed route catalogue and existing IQA module sources, available locally.
- Approved [Option C taskbar reference](../references/Taskbar-Workshop.html), [Recents reference](../references/Recents-Workshop.html), their maintained `prototypes/` sources and shared `prototypes/approved/taskbar/Popup-Shell.css`. The design contract below supersedes earlier Pencil/Done and alternative-layout requirements for these features.

## Recommendation

Use one `index.js` in the theme root. Rename the existing general theme script to `Theme.js`. Combine the existing taskbar and bookmarks trial in `Taskbar.js`, including navigation catalogue loading/lookup, Quick Navigation and Recents. Keep related responsibilities in clearly labelled internal sections with coordinated initialisation and cleanup.

Keep the current IQA designer as one deployment file, `IqaEditor.js`. Its internal modules already provide useful boundaries. Use `RiseEditor.js` for content/layout editing, `AdminTools.js` for the three browser/list tools and `DevTools.js` for the combined diagnostics. Put helpers used by multiple features in one `Shared.js`; helpers used by only one feature stay with that feature. Reuse or deliberately move existing helpers so each retains one implementation.

The target below uses classic browser-ready scripts with explicit registration and script-element loading. No bundler or ES-module conversion is required for the initial integration.

## Current implementation versus planned work

| Area | Evidence in the current files | Integration work |
|---|---|---|
| Shared theme and taskbar | Theme core, actions, appearance, banners, report enhancements, contact search/history and Biscuit exist. | Put their existing files under one loader. Extend the theme taskbar; do not also load the external `taskbar-inject.js`. Preserve current search behaviour and dependencies. |
| IQA designer | Current output contains QuickAdd, business-object search, SQL copy/edit tools, searchable filter/sort fields, Display select/clear, filter-value history, Display/Sorting drag order, filter and source workspaces, relationships, SQL editor, help, Enhance switch, path/key copy and Ctrl/Cmd+S. | Port the current output, align CSS/icons, add explicit registration/duplicate protection and reconcile lifecycle with the loader. Existing code is not evidence that integration/live acceptance has passed. |
| RiSE editor | URL block, deep-links, verb decoration and zone layout have console probes; preview has CSI reference code. | Convert to repeat-safe modules. Add content key copying and the shared Enhance control. Preserve native form state/actions. |
| Quick Navigation and bookmarks | Reviewed CSV and approved Option C prototype exist, including grouped results, stars, full-row drag, animated placeholders and keyboard reordering. | Port the approved UI into the owning modules; implement catalogue/schema conversion, normal per-user store, ownership contract and optional GM owner. Prototype state is session-only. |
| IQA/content Recents | Approved narrow popup prototype exists with Mine first/default, compact scope control and Refresh feedback. | Port the UI; implement document-backed top-10 lists, verified Mine filtering/modified-by fields and native editor-opening actions. Contact history remains separate. |
| IQA browser path copy | Native address-field/legacy references exist. | A page-scoped section in `AdminTools.js`. Designer-header path copying does not implement this browser feature. |
| Object Browser URL copy and Panel Definition ID copy | Legacy Quicklinks implementations exist. | Group with IQA browser path copy in `AdminTools.js`, with a separate section and page guard for each tool. |
| Developer tools | Metadata and field-source probes exist. | One `DevTools.js` and one taskbar Dev Mode switch, available only during Easy Edit; enables current-page details and supported panel inspection together, with reliable identity resolution and cleanup. |
| Dialog shortcuts | IQA already handles Ctrl/Cmd+S. | Shared dialog helper adds Maximise/Restore and Save for other verified editors, with one owner per action. |

## Proposed deployed structure

This is the target structure. Current deployed names remain in the trial evidence below. JavaScript uses PascalCase feature names without the redundant UnionSuite prefix, with the conventional `index.js` entry point retained. Stylesheets retain their established names and load order in this JavaScript packaging change.

```text
Theme/
├── UnionSuite/
│   ├── index.js                         # the only header script include
│   ├── Theme.js                        # existing zUnionSuite.js behaviour
│   ├── 99-Orion.css                     # existing native foundation
│   ├── zUnionSuite.css                  # tokens and added component styles
│   ├── zzDarkMode.css                   # dark-specific styles; loaded last
│   ├── Tabler.css + Tabler/             # existing icons/font/licence
│   ├── Scripts/
│   │   ├── ActionDefinitions.js         # existing standard business actions
│   │   ├── Shared.js                    # common helpers, grouped into sections
│   │   ├── Taskbar.js                   # search, bookmarks, Quick Navigation, Recents
│   │   ├── IqaEditor.js                 # query designer enhancements
│   │   ├── RiseEditor.js                # content editor, deep links and designer UI
│   │   ├── AdminTools.js                # IQA path, file URL and panel ID copying
│   │   ├── DevTools.js                  # page details and panel inspection
│   │   └── Vendor/
│   │       └── fuse-6.6.2.js            # optional fuzzy search library
│   ├── Data/
│   │   ├── Navigation.json             # destination IDs, labels, URLs, icons, keywords
│   │   └── Navigation.schema.json      # authoring/build validation rules
│   ├── Usage-Guide.html                 # [existing] generated offline handbook
│   └── guides/usage/                   # existing canonical guide/example sources
└── UnionSuite-Client/
    ├── Config.js                       # [existing] settings; expanded as needed
    ├── Actions.js                      # [existing] client action registrations
    ├── Branding.css                    # [existing] generated client branding
    └── Override.css                    # [existing] deliberate client differences

userscript/
└── imis-plus-supplementary.user.js      # optional separately installed GM owner

tools/                                 # build/check tools; not runtime dependencies
references/                            # generated component previews
```

The target has nine shared runtime JavaScript files, plus Fuse if retained. The vendor file is conditional: the trial uses `window.Fuse` when available and otherwise matches search words against destination fields; the current loader does not supply Fuse. If retained, preserve its supplied code/licence and load it only for Quick Navigation. Do not introduce a second fuzzy-search library.

`Data/Navigation.json` is the maintained destination list. Define standard links/paths, stable IDs, names, categories, icons and search keywords there. The current trial embeds these entries in `UnionSuiteTaskbar-Bookmarks.js`; promotion extracts that list into JSON. There is no separate `RouteCatalogue.js` or second maintained JavaScript copy of the list.

`Data/Navigation.schema.json` defines the entry structure, required fields and allowed value types for authoring/build checks. It is not fetched by the browser and does not establish that a destination page exists. Everyday link changes touch `Navigation.json`; the schema changes when the entry structure changes. `Taskbar.js` owns runtime loading, validation, caching, ID lookup and URL resolution.

Client-specific destinations/overrides belong in client `Config.js`, keyed by stable destination ID. Dynamic editor links and feature-specific query paths remain in their owning feature's configuration, with client overrides as needed. Resolve page destinations against the active iMIS environment and JSON assets against the loader's theme base.

### File migration map

The left column distinguishes current source files from earlier proposed files that do not yet exist. Consolidate their responsibilities into the target files without creating the superseded intermediate structure.

| Current source or earlier proposal | Target |
|---|---|
| Current `zUnionSuite.js` | `Theme.js` |
| Current `Scripts/UnionSuiteTaskbar.js` and `Scripts/UnionSuiteTaskbar-Bookmarks.js` | `Scripts/Taskbar.js`, with distinct sections and one coordinated lifecycle |
| Current `Scripts/IQA-Enhancements.js`; earlier proposed `UnionSuiteIQA.js` | `Scripts/IqaEditor.js` |
| Earlier proposed `Shared/*.js` | Internal helper sections in `Scripts/Shared.js` |
| Earlier proposed `UnionSuiteSitewide.js` and `Sitewide/*.js`, including `RouteCatalogue.js` | Internal sections in `Scripts/Taskbar.js` |
| Earlier proposed `UnionSuiteRiSEEditor.js` and `RiSE/*.js` | `Scripts/RiseEditor.js` |
| Earlier proposed `UnionSuiteIQABrowser.js`, `UnionSuiteObjectBrowser.js` and `UnionSuitePanelList.js` | Page-scoped sections in `Scripts/AdminTools.js` |
| Earlier proposed `UnionSuiteDevTools.js` and `DevTools/*.js` | `Scripts/DevTools.js`, with the Dev Mode control in `Taskbar.js` |
| Current embedded destination list; earlier proposed `Data/command-palette-routes.json` | `Data/Navigation.json` |
| Earlier proposed `Data/command-palette-routes.schema.json` | `Data/Navigation.schema.json` |

Keep `index.js`, `ActionDefinitions.js` and the client `Config.js`/`Actions.js` names. Update loader manifests, build inputs, tests, installation examples and source-file references together as each migration lands. Historical trial evidence retains the names used when measured. Filename and feature-label changes do not rename existing public globals, DOM selectors, storage keys or generator section markers.

## Boundaries and function ownership

Rows within the same file describe internal sections, not additional deployed scripts. Preserve these boundaries during consolidation, including separate async state and cleanup for each feature.

| File / internal section | Owns | Reason for this boundary |
|---|---|---|
| `index.js` | Capture its own URL; release manifest; bootstrap promise; dependency/file loading; route selection; optional module load requests. | One installation point, with no business feature implementation. |
| `Theme.js` | Existing shared theme behaviour, appearance, actions runtime, banners and report enhancements. | Preserve existing ownership and APIs through the filename change. |
| `Shared.js`: Lifecycle | First mount before/after DOM readiness; one shared endRequest dispatcher for migrated/new modules; subscription disposal; bounded late-WebForms attachment; safe preference access and async generation guards. | Every imported/new module needs the same lifecycle contract. Existing core/taskbar observers are not rewritten just to claim a single subscription for the whole theme. |
| `Shared.js`: iMIS context | Supported document classification, website/application context and logged-in identity from `__ClientContext`. | Distinguishes a staff document, editor and CCO frame without confusing logged-in and selected parties. Classification is DOM-only; it does not wait for a bookmark API. |
| `Shared.js`: iMIS API | Request-verification token, same-origin JSON requests, named-filter query execution and shared Document FindByPath. | Shared network mechanics and document resolution. Keep feature-specific Recents filters and pin persistence contracts in their owning sections. Add PageMethods wrappers only when a real consumer uses them; missing PageMethods is not a global startup failure. |
| `Shared.js`: Icons and feedback | Consistent icon rendering, toasts and accessible feedback. | Reuse `.us-copy`/`data-us-copy-target` for ordinary copy buttons. Expose programmatic copying from the existing theme copy owner; retain one implementation and delegated listener. |
| `Shared.js`: Editor controls | Reusable Enhance switch, native action-row placement adapter and validated `iUniformKey` reading/retention scoped to editor sessions. | IQA and RiSE share the presentation and identity pattern. Their preferences and native selectors remain separate. This is not the viewed-page metadata resolver. |
| `Shared.js`: Dialog shortcuts | Verified owning RadWindow, Ctrl/Cmd+M; Ctrl/Cmd+S in supported non-IQA editors. | Works independently of the taskbar and data stores. IQA's existing Save handler remains the sole IQA Save owner. |
| `Taskbar.js`: Header and existing controls | Main-row layout, contact Quick Search/history, Full Search, appearance, Biscuit, bookmarks-bar visibility, Recents placement and reconnect after host replacement. | One coordinated taskbar lifecycle; feature cleanup preserves unrelated taskbar controls. |
| `Taskbar.js`: Navigation catalogue | Load `Data/Navigation.json`; TTL/revalidation, validated cache, fallback, ID lookup and route resolution. | Bookmarks and Quick Navigation use the same data; stable IDs survive label/URL edits. |
| `Taskbar.js`: Navigation search | Go to…/Ctrl+Space entry, full-text/fuzzy results, smart tags for ID/username/event/keyword/docs, bookmarks-first groups, whole-row focus, navigation and route-ID star requests. | Owns result/search/keyboard state; reads the bookmark snapshot and sends mutations to its sole owner. |
| `Taskbar.js`: Bookmarks | Empty initial pin set; first-five icon strip and full labelled bar; accessible labels; star/unstar and pointer/keyboard reorder; floating row, placeholder and slide cleanup; pin-event/state contract. No main-row edit pencil. | Owns pin order and reusable Quick Navigation reorder interaction. Check active ownership before render, applying responses and saving. Missing catalogue entries stay removable; failed saves remain visibly unsaved. |
| `Taskbar.js`: Bookmarks storage | Normal per-user iMIS reads/writes, environment/user cache keys, revalidation and multi-tab conflict handling. | Preserve the trial's load-before-edit and stale-response guards. Verify per-user enforcement; anonymous/missing identity prevents personal writes. |
| `Taskbar.js`: Recents | Approved 420px popup, IQAs above content, Mine default/left and Sitewide right, compact equal-width scope buttons, Refresh/busy feedback, two top-10 modified-document lists, loading/empty/error states and native editor actions. | Separate data state and lifecycle from pins and existing recent-contact history. Fetch on opening or filter changes. |
| `Taskbar.js`: Dev Mode control | One switch, visible/available only while Easy Edit is active; request `DevTools.js` on activation. | Turning it off, or leaving Easy Edit, tears down both diagnostic tools and stops their observers. |
| `IqaEditor.js` | All current query-designer modules, help, path/key actions, native Save shortcut and IQA settings. | Preserve the current unit while styling and loading are integrated. Its output already contains the four larger workspace/SQL modules. |
| `RiseEditor.js`: Controller and editor controls | RiSE content/layout editor, independent Enhance preference, full/relative URL copying, editor DVK copying and preview toggle. | Works in content editor documents; opening an IQA from RiSE transfers query editing to `IqaEditor.js`. |
| `RiseEditor.js`: Deep links | The two IQA source-label variants and multi-instance panel captions; verified folder/query/panel destinations. | Isolate async lookups, deduplication, paging, duplicate captions and stale-response handling within this section. Preserve dots in names and literal underscores in paths. |
| `RiseEditor.js`: Designer UI | Configure/Copy To/Move To/Minimize/Restore/Remove icon decoration, hidden Connect and zone header/footer actions. | Related DOM adaptation, cleanup and native-action preservation belong together. Preview coordinates via scoped state/classes from the controller. |
| `AdminTools.js` | IQA browser path, uploaded-file public URL and panel GUID copying, each in its own section. | Load on supported browser/list pages; activate only the matching tool and share clipboard/icon helpers. |
| `DevTools.js` | Current-page details and supported panel field inspection, enabled together by Dev Mode during Easy Edit. | One lifecycle with separate page-details, panel-inspection and cleanup sections; future diagnostics can extend the same file and gate. |
| Optional userscript | GM pin storage, bookmark takeover, UI/actions while GM-owned and pinned-ID announcements. | GM storage privileges require userscript installation. The normal theme loader cannot supply them. |

Keep the existing `window.imisPlus` registration shape described in the source plan (`modules`, `helpers`, `config`) for the new enhancement runtime, without replacing it on subsequent loads. Existing `window.UnionSuite*` theme APIs stay intact. Each feature has one explicit registration and one owner; filenames do not require renaming storage keys or duplicating globals.

## Approved design: Option C — Combined

Approved by James on 20 September 2026. This section is the implementation baseline for the taskbar, bookmarks, Quick Navigation and Recents. A/B and the separate bookmark editor remain historical comparison tools; they are not production layout options. Approval covers the design and interaction contract, not completed storage/API integration or live acceptance.

### Taskbar and bookmarks bar

- Extend the existing theme taskbar. Main-row order: brand, up to five bookmark icons, divider, bookmarks-bar toggle, Go to… button for Quick Navigation, divider, existing contact Quick Search, Full Search and appearance control. Keep the existing contact search/history and Biscuit behaviour.
- The first five saved bookmarks populate the main row in saved order. Five is a maximum, including on narrow screens; controls may wrap. Give icon-only links accessible destination names and tooltips. A new user starts with no bookmarks; the four/nine workshop samples are fixtures only.
- Omit the edit pencil. Stars in Quick Navigation add/remove bookmarks, and its drag handles or keyboard commands change their order. The external workshop Edit bookmarks button and move-button editor are not production taskbar controls.
- The toggle sits immediately to the right of the bookmark/control divider, before Go to…. It shows/hides a labelled second bar containing all bookmarks, including the first five. Keep its label and `aria-expanded` state accurate and associate it with its controlled bar.
- Start the bar collapsed. Retain visibility through feature rerenders/host remounts within the active document. Cross-visit persistence of visibility is not part of this approved design; bookmark data persistence belongs to the Bookmarks storage section of `Taskbar.js`.
- Put Recents at the right of the labelled bookmarks bar. Its normal entry is available when that bar is shown. Any programmatic Recents entry must reveal the bar before positioning the popup.
- All labelled bookmarks wrap as needed. Preserve constrained Quick Search sizing and main-row alignment; keep Biscuit perched on the main header edge and use the reference's below-1060px hiding rule. Recheck against actual native header widths during implementation.

### Quick Navigation and bookmark ordering

- Open the centred Quick Navigation dialog from Go to… or Ctrl+Space. Keep destination search separate from contact Quick Search. Arrow keys browse destination rows, Enter opens the destination, Escape closes, and focus returns to the opener. Tab still reaches each star and drag handle.
- Show matching bookmarks first in saved order, then a divider and Other destinations. Apply the query to both groups. Pin/unpin moves a result between groups and updates both bookmark presentations immediately; persistence failures must remain visible and recoverable.
- Each bookmarked result has a grip. Starting a drag picks up the entire row; the floating row follows the pointer at 80% opacity. Insert a blank, dashed, row-height placeholder at the proposed drop position. Move that placeholder and reorder neighbouring rows in real time.
- Animate surrounding rows into place over 180ms. Direction changes continue from current visual positions; hit testing must avoid animation-induced jitter. Honour reduced motion by skipping slides.
- Drop inside the list commits the shown order. Escape, pointer cancellation/lost capture, or release outside the list cancels. Support edge scrolling and dispose pointer listeners, floating rows and animations on close, rerender or host replacement.
- The grip supports Alt+Up/Down keyboard reordering, with accessible feedback and retained focus. While filtering, reorder only the matching bookmark slots; nonmatching bookmarks keep their positions. Both input methods call the same bookmark owner and persistence path.
- Arrow-key navigation highlights/outlines the whole row, including grip and star. Individual control focus rings stay within the row's rounded boundary. Keep a continuous search background across icon, input and Esc hint in both appearances; apply `--field-focus-colour` and `--field-focus-glow` only while the search field is focused.

### Recents

- Use the approved narrow popup: 420px maximum width, constrained to the viewport, with IQAs above content in a single scroll region. Keep the heading, scope controls and Refresh footer visible; cap the list region at the reference's 315px where space allows and reduce it for short viewports.
- Keep the IQAs/Content section headings sticky at the top of the scroll region while their own section is visible. Content takes over as it reaches the top. Use an opaque theme surface and divider so rows do not show through, in light and dark mode.
- Mine is selected initially and appears on the left; Sitewide is on the right. Use the final compact segmented control: equal columns, 72px minimum button widths, 28px minimum button height, 12px labels, 3px rail padding and 2px gap. The selected button uses the theme surface/shadow. There is no underline, and this control does not use the larger home-page `us-section-tabs` component.
- Retain two independently bounded lists: up to ten modified IQAs and up to ten modified content pages for the selected scope, sorted by last modified. Show the item title, modifier, relative time and appropriate type/destination icons. Mine identifies the authenticated user, not the selected contact.
- Refresh keeps its label, replaces its icon with the shared `.us-button-spinner`, disables duplicate refresh clicks and sets accessible busy state on the control/results. Restore normal state on completion, failure or cancellation; announce completion/failure. The prototype's timed refresh is a simulation, not the production data adapter.
- Close/Escape restores focus. Fetch on first use, scope change or Refresh through the owning module; guard stale responses after a scope change or close. Native editor actions, empty/error/retry states and permission handling still require real data integration.

### Theme styling and implementation sources

- Reuse the approved popup shell conventions: theme surface/border/shadow, 8px shell corners via `--radius`, sunken title bar/divider, 14px semibold title, compact 30×28px close control with danger hover/focus, consistent footer spacing and theme Tabler icons.
- Use 12px supporting text and 13px destination/item titles. Go to…, Recents and footer action buttons use the shared 36px compact control scale; the Recents scope control deliberately uses the smaller 28px scale above. Preserve visible keyboard, hover, active and disabled states.
- `prototypes/approved/taskbar/Taskbar-Workshop.frame.html`, `.frame.css` and `.frame.js` are the approved integrated reference. `prototypes/Recents-Workshop.*` retains the isolated popup reference. `prototypes/approved/taskbar/Popup-Shell.css` is the shared preview shell/control source. Outer comparison controls, sample dashboard/data, mock navigation and A/B variants stay in previews.
- Port component styles into `zUnionSuite.css`, dark-specific rules into `zzDarkMode.css`, and fix any affected existing native presentation in `99-Orion.css`. Production does not load `Popup-Shell.css` or duplicate a separate Recents stylesheet. Client overrides retain their established ownership.
- Keep distinct sections in `Taskbar.js` for configuration/dependencies, state/lifecycle, header attachment, contact search/history, navigation catalogue, navigation search, bookmarks storage, bookmark strip/bar and reordering, IQA/content Recents, appearance, Biscuit, Dev Mode, and initialisation/cleanup. Use shared icons/feedback and existing spinner styles. Each async feature keeps its own failure and stale-response handling within the coordinated taskbar lifecycle.

### Implementation acceptance for the approved design

- Compare the implemented C layout against the two approved references in light/dark mode, at desktop and narrow widths, with empty, four, five and more-than-five bookmarks. Verify wrapping, all-bookmark access, Recents placement, native search, Full Search, appearance and Biscuit alignment.
- Check stars, pointer and keyboard reorder, filtered slot preservation, full-row focus, placeholder movement, interrupted slides, reduced motion, edge scrolling and cancellation. Verify order across the bookmark strip, bookmarks bar and Quick Navigation, and confirm persisted state, including save failures and the optional GM owner's takeover.
- Check first-open Mine, equal compact scope widths/no underline, both top-ten limits, authenticated-user filtering, sticky section-heading handoff and a visible footer while scrolling, Refresh busy/error/retry and rapid scope/close changes. Validate actual editor opening and focus return.
- Check double loading, partial taskbar replacement, event disposal and one active owner for each feature. Do not carry the prototype's fake data, timer-based requests or blanket navigation interception into production.

## Updated loader structure

Header include (confirmed 3 October 2026), using the actual deployed theme URL:

```html
<script>
  // Optional, and must come before the loader.
  window.UnionSuiteTaskbarConfig = { pipGreeting: false };
  (function () {
    var s = document.createElement('script');
    s.src = '/App_Themes/UnionSuite-Core/index.js?t=' + Math.floor(Date.now() / 1200000);
    s.async = true;
    document.head.appendChild(s);
  })();
</script>
```

Deploy this once. It never changes again, which is the point: site headers are a manual deployment on this tenant, while theme folders ship remotely as a zip, so every later release must be able to travel in the zip alone.

`async`, not `defer`: the loader only injects scripts, so it has no reason to wait for the parser. Measured, this is worth little — see the tenant runs — but it describes the requirement accurately. Inline configuration such as `window.UnionSuiteTaskbarConfig` must appear before the loader. A deferred external config file would be unsafe here, because it can run after a dynamically injected consumer; resolve client configuration through the loader instead.

The `?t=` bucket is not decoration. iMIS serves `App_Themes` with `Cache-Control: public, max-age=604800` and no revalidation, confirmed on the tenant, so a stable entry URL is cached for a week. A stale `index.js` is the worst failure available here: the new loader never runs, and the old one keeps requesting the previous `?v=`, so no child update reaches the browser either. The bucket caps that exposure at 20 minutes while still serving from cache in between. The query is dropped when child paths resolve against the loader's directory, so nothing downstream sees it.

Twenty minutes was chosen on operational grounds, not performance. A bucket roll costs one ~5KB fetch, measured at 90–200ms against a cache hit, on the first page load in each new bucket; at 20 minutes an active user pays a few seconds a day in total. Lengthening it to a day would save about a second a day and raise the exposure on a bad release from 20 minutes to 24 hours, with a manual header deployment as the only faster remedy. Buckets longer than an hour also need a local-time key: `Math.floor(Date.now() / n)` divides UTC, so a 12-hour bucket rolls at 10pm and 10am Melbourne time, straddling the start of the working day and defeating the purpose.

The default client location is resolved as `../UnionSuite-Client/` relative to the loader. Allow a loader attribute/configured bootstrap path for tenants whose client folder has a different name. Never derive asset paths from the current iMIS page. API/record destinations, in contrast, resolve against the active iMIS environment, not the theme/CDN asset origin.

Conceptual load graph, not executable code:

```text
index.js: capture URL + establish one startup promise
│
├─ resolve client Config.js (or declared defaults) and DOM readiness
│
└─ Theme.js                 [UnionSuiteActions, UnionSuiteAppearance]
   ├─ ActionDefinitions.js -> client Actions.js
   ├─ existing shared theme features in themed documents
   └─ Shared.js -> classify supported staff/editor/CCO context
      ├─ parent staff page -> Taskbar.js
      │  ├─ bookmarks/navigation first need -> Data/Navigation.json
      │  ├─ Quick Navigation open -> optional Fuse, if retained
      │  ├─ Recents open -> fetch feature data through API helpers
      │  └─ Easy Edit active + Dev Mode on -> DevTools.js
      │     ├─ current-page details
      │     └─ panel inspection where supported
      ├─ QueryBuilder/Design.aspx -> IqaEditor.js
      ├─ ContentRecordEdit.aspx or ContentDesigner.aspx -> RiseEditor.js
      ├─ supported IQA/Object Browser/Panel Definition list -> AdminTools.js
      │  └─ activate only the matching page section
      └─ confirmed Telerik editor context -> shared dialog shortcuts
```

The taskbar sits under `Theme.js` (currently `zUnionSuite.js`) deliberately. It reads `window.UnionSuiteAppearance` to build its appearance switch, and that API is registered by the core file. The existing header include survives this only because the taskbar defers mounting to `DOMContentLoaded`; a dynamically injected taskbar can mount immediately, so the loader must honour the edge rather than treat the two as independent branches.

Current trial registration markers for contract 1, using current filenames. "Loaded" is not "working": a file that parses and then throws still fires `load`, so each step is confirmed by the global it registers. Registration also does not establish that asynchronous feature data or UI is ready.

| File | Registration marker | Must load after |
|---|---|---|
| `zUnionSuite.js` | `window.UnionSuiteActions.define` (also registers `UnionSuiteAppearance`, `UnionSuiteSwitches`) | — |
| `Scripts/ActionDefinitions.js` | `UnionSuiteActions.has('home.manage-bulletin')` | `zUnionSuite.js`; it throws without the runtime |
| `Scripts/UnionSuiteTaskbar.js` | `window.UnionSuiteTaskbar.initialise` | `zUnionSuite.js`, for `UnionSuiteAppearance` |
| `Scripts/UnionSuiteTaskbar-Bookmarks.js` | `window.UnionSuiteTaskbarBookmarks.initialise` | `Scripts/UnionSuiteTaskbar.js`; it replaces that script's quick-links region |
| `Scripts/IQA-Enhancements.js` | **none** | — |
| `Scripts/BO-Enhancements.js` | `window.BoEnh.probe` | — (gated to `AsiCommon/Controls/BOA/Design.aspx`, which runs in a RadWindow iframe) |
| `UnionSuite-Client/Actions.js` | none declared | shared runtime and `ActionDefinitions.js` |

`IQA-Enhancements.js` registers no global of its own: it returns early off `QueryBuilder/Design.aspx` and the `window.*` names it touches are native page functions it calls, not exports. Until it is ported to `IqaEditor.js` its execution cannot be verified by the loader, so gate it by URL and accept loading as the only signal. Give the ported file a registration marker.

`UnionSuiteTaskbar-Bookmarks.js` remains a standalone deployed trial until it is merged into `Taskbar.js`. Its header's older multi-file decomposition is superseded by this plan. Migrate the embedded destinations to `Data/Navigation.json` and keep their handling in the Navigation catalogue section of `Taskbar.js`. Update loader paths, build tools, tests and guide installation examples together when performing the renames; preserve existing globals and preference/storage keys.

Shared helpers load once and only before consumers that actually require them. The graph shows feature dependencies, not a requirement to serialize independent branches. Bookmark storage failure must not stop contact search, Quick Navigation, the editor or unrelated copy tools. Client action registrations follow standard action registration and their verified business helpers; missing business helpers are not silently replaced.

Important loader contracts:

1. Cache promises by resolved, versioned file URL; wait for both script loading and expected registration. Existing self-starting scripts need adapters/registration markers, not a second startup call. Add a duplicate guard to the imported IQA bundle before mixing it with any loader.
2. Keep one startup promise per document. Dynamic loading must work after DOMContentLoaded. Remounting UI after a postback does not re-download/re-execute script files.
3. Use load/error/time-out handling and isolate dependency failures. A late registration after a timeout must not automatically start a disabled feature. New files register first; the loader/controller starts them after readiness checks.
4. Core theme loading is distinct from staff-only enhancements: do not make appearance, banners and report behaviour depend on a staff marker. Do not inject parent taskbar, pins or Quick Navigation into CCO/editor frames.
5. The same entry include must reach each required editor document. A parent include alone cannot handle keyboard events inside an iframe. Inline Telerik dialogs are handled only when focus and ownership are confirmed, independently of taskbar mounting.
6. Load catalogue data when bookmarks first need it or Quick Navigation first opens. Fetch Recents only when used. Load `DevTools.js` only when Easy Edit is active and the user enables Dev Mode. Both page details and supported panel inspection share this gate; turning Dev Mode off or leaving Easy Edit removes their UI and stops observers. Check the gate again after asynchronous loading before mounting. Keep Dev Mode separate from IQA/RiSE Enhance switches.
7. Preserve `iqaEnhanceMode` and use independent `riseEnhanceMode`. The single Dev Mode control supersedes the source plan's independent diagnostic toggles; it starts off and cannot activate outside Easy Edit. Safe storage access must fall back to working in-memory state. The current IQA top-level mode reads need hardening for unavailable storage.
8. For the first IQA migration preserve its current always-on QuickAdd and source-capture behaviour while Enhance is Off. A whole-module disable is a separate loader setting. Do not assume the IQA pill presently disables every operation.
9. Capture a central release version in the loader and apply it consistently to child assets. Upload referenced files before publishing the updated loader; do not use a new timestamp on every request. **Restated 21 September 2026:** the original requirement here was a stable `index.js` URL served revalidated or short-cached. The tenant does not offer that — `App_Themes` is served `public, max-age=604800` with no per-file variation available — so the entry point instead carries a coarse time bucket applied by the header, as set out under Updated loader structure. The goal it protects is unchanged: a release must never require a header deployment. Bump the loader's release version when a child file changes; changing the loader alone does not need it, because the entry URL refreshes itself, and bumping needlessly re-downloads every child.
10. Replace the old individual includes during deployment. Deduplication cannot make arbitrary legacy scripts harmless: remove overlapping standalone IQA, Quicklinks IQA/shortcut, old taskbar and extension injections while retaining required unrelated business helpers.

## Loader trial: step 1 results

Implementation order step 1 was carried out on 21 September 2026 using a trial `Theme/UnionSuite/index.js`. The trial loads only existing deployed theme files and implements the URL capture, versioned child requests, promise caching, registration checks and failure isolation described above. Route selection, context classification, the client folder and the remaining feature files were out of scope.

### Verified locally

Served from a static copy of the theme folder, in a browser:

| Scenario | Result |
|---|---|
| Clean page, loader include only | `zUnionSuite.js` then `ActionDefinitions.js` both loaded; twelve actions registered; the `us-action-home-manage-bulletin` button rendered into the panel header through the iPart wrapper div |
| An existing manual `zUnionSuite.js` include left in place | Step reported `skipped`; one network request; one rendered button, so no double registration |
| A child file returning 404 | Step reported `failed` with the reason; the chain stopped; the already-loaded core file kept working |

### Verified on the dev tenant

Confirmed against `uhubemsdev.imiscloud.com`, resolving to `https://uhubemsdev.imiscloud.com/App_Themes/UnionSuite-Core/Scripts/ActionDefinitions.js?v=…`:

- iMIS serves `.js` from the theme folder to a dynamically injected `<script>`, and that script executes. No CSP or MIME obstacle was encountered.
- `document.currentScript` resolves correctly behind both `defer` and `async`, so child paths derive from the loader's own URL.
- The skip path behaved as designed against a real leftover include.

### Findings

- **The deployed theme folder is `UnionSuite-Core`, not `UnionSuite`.** The include example above and every `YOUR_THEME` placeholder are exactly that; resolving relative to the loader's own URL is load-bearing, and any hardcoded theme path would have failed here.
- **A cold child request measured about 630ms**, against about 25ms locally and about 75ms warm. At that latency a serialized chain of a dozen files would be plainly slow, which is the practical reason the graph's independent branches must actually overlap rather than queue.
- **The taskbar/core dependency was not visible in the previous graph** and was found only by reading the source. It is corrected above.
- **iMIS Application Insights emits an unrelated CORS console error** on these pages. It is native telemetry and not a loader symptom.

### Load-time optimisation (trial v0.3)

The step 1 capture showed that **latency dominates and byte size barely matters**: `ActionDefinitions.js` at 6KB cost 219ms while `zUnionSuite.js` at 286KB cost 283ms. Per-request overhead, not payload, sets the cost, so the work went into removing round trips from the critical path rather than into bundling. Three changes were made.

**Preload every module up front.** When the loader runs it injects one `<link rel="preload" as="script">` per module that passes its gate and is not already present, then proceeds through the dependency graph as before. Downloads overlap; execution order is unchanged. The preload href must match the eventual script src exactly, version parameter included, or the browser fetches the file twice. Preload was chosen over injecting every `<script async=false>` at once because the latter executes dependants even when a dependency has failed: a missing `zUnionSuite.js` would leave `ActionDefinitions.js` to run and throw, losing the failure isolation in contract 3.

**`async` on the header include**, as above.

**Bookmarks off the critical path.** `UnionSuiteTaskbar-Bookmarks.js` is marked non-critical: it still loads as soon as the taskbar registers, but `UnionSuiteLoader.ready` no longer waits for it. The taskbar is usable without it, and its own settings request measured 690ms on the tenant. It is deliberately **not** parked on an idle callback. The file replaces visible taskbar controls, so a deliberate delay would only widen the window in which the native quick links are shown and then swapped out.

The loader now exposes two promises: `ready` for the critical modules and `complete` for every module.

Measured A/B, serving the real theme files with a 200ms artificial delay per request to approximate the tenant round trip:

| | v0.2 serial + `defer` | v0.3 preload + `async` |
|---|---|---|
| Loader downloaded | 242ms | 231ms |
| Theme scripts start | 245ms, then 497, 497, 738 | 233ms, all four together |
| **Last theme script complete** | **947ms** | **452ms** |

That is a 495ms reduction, about half the chain, under an artificial constant delay. **The tenant behaved differently and this figure does not carry over; see the tenant measurements below.** Verified alongside it: no file is fetched twice, every download is initiated by the preload link rather than the script tag, and the gated, skipped, failed and blocked paths all still behave as they did in v0.2.

The trial did not bundle files together or inline the loader into the master page. The revised target groups related features in `Taskbar.js`, `RiseEditor.js` and `AdminTools.js` while retaining page gates; grouping does not require loading all features on every page. The timing measurements below describe the existing trial files, not the proposed consolidated files. Inlining the loader would give up the entry-file update mechanism that contract 9 protects.

### Measured on the dev tenant

Four captures of the same blank staff page, `/UTNewTheme/i4u_Sandbox/Styling-Elements/Blank-Page.aspx`, taken with the resource-timing report on 21 September 2026. Read these in preference to the simulated A/B above.

| Run | Header | Browser cache | `index.js` done | Preloads fire | Gap | Last theme script |
|---|---|---|---|---|---|---|
| 1 | `defer` | disabled | 3169ms | 3602ms | 433ms | 4497ms |
| 2 | `defer` | disabled | 876ms | 1607ms | 731ms | 1753ms |
| 3 | `async` | disabled | 549ms | 1250ms | 701ms | 1443ms |
| 4 | `async` | **enabled** | 316ms | 372ms | **56ms** | **431ms** |

The gap between the loader finishing its own download and issuing its preloads is the metric that isolates the loader from page-wide variance. Runs 1 and 2 are the same build and the same header, and differ by 2.7 seconds end to end; treat any single tenant run as unreliable. `index.js`, an 11KB file, took 1178ms in run 1 and 212ms in run 3.

**Preloading works on the tenant.** In every run the four theme files are fetched by the preload link rather than the script tag, start within 2ms of each other, and are never fetched twice.

**`async` is not where the time was.** Runs 2 and 3 differ only by the header attribute and the gap barely moved, 731ms to 701ms. Keep `async` as the more accurate description of what the loader needs, but do not expect it to pay for itself.

**The gap was main-thread contention, and caching removes it.** iMIS downloads roughly 1MB of its own JavaScript — a 698KB Telerik bundle and 304KB `Asi.js` — which must parse and execute before an async script gets the main thread. Serving those from cache collapses the gap from 701ms to 56ms and the whole theme chain from 1443ms to 431ms.

**Caching is working; `?v=` is doing its job.** Runs 1 to 3 showed every asset arriving from the network, which looked like missing cache headers. It was the browser's own disable-cache switch. With it off, every theme file is a true cache hit at zero transfer. Child versioning through `?v=` is therefore both effective and necessary, and revalidation is not a useful substitute for it.

**Static preload hints in the master page were evaluated and rejected.** Moving the hints into the header would start the theme downloads alongside the native assets instead of behind the loader. Against the uncached runs that looked worth about 900ms, but the cached run shows the real headroom is the 56ms gap. It is not worth hardcoding versioned theme paths into the header, which would require a header edit per release and break contract 9 for a saving inside the noise.

**Warm load is the number that matters: 431ms** from the page's first request to the last theme script, at zero bytes transferred.

### Entry-point delivery: alternatives considered

The entry point must be reachable by a release that ships only the theme folder. Four routes were considered against `public, max-age=604800`.

| Option | Header deployments | Verdict |
|---|---|---|
| Stable `index.js` URL | one | Rejected. Cached a week; releases cannot propagate. |
| Ask ASI to serve `index.js` with `no-cache` | one | Worth pursuing in parallel. Needs per-file cache policy under `App_Themes`, which is not known to be available, and the `imiscloud.com` Cloudflare zone is not ours to configure. If it lands, the bucket becomes redundant but harmless. |
| Version the header include, `index.js?v=4` | one per release | Rejected. Header deployment is manual here, so this puts a manual step in every release. |
| Move the loader to `cdn.uhub.org.au` | one | Rejected for now. It would give full cache control, and the CDN and its CSP allowance already exist. But it breaks resolving child paths from the loader's own URL, so the theme base would have to be supplied explicitly; it makes exceptions inside the loader opaque to `window.onerror` without `crossorigin`; one file would serve every tenant; and a future `script-src 'self'` would kill it outright. Reconsider if per-tenant cache control becomes worth that. |
| **Time-bucketed entry URL** | **one** | **Chosen.** No new origin, no per-release manual step, survives a strict CSP, nothing to purge. |

### Risk: the loader's own cache lifetime

`index.js` is served from cache with no revalidation. That is the one file in this design that must not be cached hard. A release works by bumping `RELEASE` inside `index.js` so every child URL changes; if a stale `index.js` is served, the new file never runs and it keeps requesting the previous `?v=`, so no child update reaches the browser either. The v0.3 deployment only propagated because the browser's cache was disabled at the time.

Confirmed on the tenant: `cache-control: public, max-age=604800`, with an `etag` that is never consulted because nothing triggers revalidation inside the week. `cf-cache-status: DYNAMIC` shows Cloudflare is not holding a copy, so this is browser cache only and there is nothing to purge. The 20-minute entry bucket above is the remedy, and contract 9 has been restated accordingly. This risk is closed unless the bucket is removed.

### Not yet proven

Behaviour across a partial postback. Cache behaviour for the stable `index.js` URL under contract 9 is now measured and is a live risk; see the tenant measurements below.

Frame behaviour is no longer unproven. The tenant page runs the loader three times because two `ContentPreview.aspx` iframes each execute the header include, so every frame downloads the core file, the taskbar and 96KB of bookmarks it cannot use. This is the case contract 4 already describes. A frame guard is still not implemented, by decision, but it is now a measured cost rather than a hypothetical one and is the largest single saving available. A frame guard for the taskbar branch is deliberately not implemented yet: the taskbar is self-limiting because it mounts only where it finds the native search markup, and an unverified guard could remove it from a legitimately framed staff document.

## Styling and icon integration

- Fix existing native control presentation in `99-Orion.css`; put added editor, Quick Navigation, bookmark and diagnostic components and tokens in `zUnionSuite.css`.
- Remove migrated hard-coded/injected component styles from the IQA/probe code as each feature is integrated. Scope editor styles to their editor state, including off/restore behaviour. Do not simply place another override layer over injected CSS.
- Use existing semantic surface/text/border/status/focus/type/spacing tokens. Client branding stays in Branding/Override; all dark-specific rules stay in `zzDarkMode.css`.
- Keep the current icon assets. Use the theme's Tabler action conventions and matching existing inline icons where appropriate; expose a common semantic icon adapter for the new features. Do not add another remote icon library or rewrite every existing icon as part of this migration. The existing `UnionSuiteActionIcons` export manages tooltips, not a general SVG factory.
- Reuse the theme's delegated copy controls. Keep record Copy ID/Username within the banners; no new Party script, duplicate button or unrelated username lookup.
- IQA and RiSE use the same redesigned theme-aligned Enhance control, with separate remembered settings and native action-row adapters. Preserve keyboard operation, labels and narrow-window wrapping.
- CSS still loads through the normal theme stylesheet order; the JS index does not need to inject or dynamically reorder the theme stylesheets. Ensure those styles and icon assets also reach the editor documents.

## IQA: what should eventually be separate?

For initial deployment, **one `Scripts/IqaEditor.js`** is the recommendation. The index will load it only in the designer, so dividing it brings maintainability benefits rather than reducing downloads on ordinary pages. The current output has a designer-page execution guard; it does not itself prevent downloading the bundle elsewhere.

If a later extraction is worthwhile, the strongest independent candidates are already identifiable in the output and separate source modules:

- `IQA/FilterWorkspace.js`: filter layout, group explanation and staged reorder.
- `IQA/SourceWorkspace.js`: business-object reorder and native response sequencing.
- `IQA/RelationshipWorkspace.js`: relationship entry modes and field/join handling.
- `IQA/SqlEditor.js`: SQL editing/completion/validation and source-definition cache.

Keep `IqaEditor.js` as their controller. QuickAdd/search, Display/Sorting controls and header/help actions can remain grouped until their size or independent usage justifies another boundary. Do not extract one file per helper.

Do not lazy-load IQA code solely from the currently visible tab without preserving cross-tab work: SQL source capture currently runs independently of Enhance mode. Check callback references, registration order and source capture before splitting.

Reconcile the full current output with the separate module sources/build scripts before selecting a canonical maintained source. The older baseline plus a subset of modules is not a proven rebuild of the latest output. After migration, maintain theme-owned sources and generate any continued standalone/CDN output from them; avoid two independently edited copies.

## Scope, verification and implementation order

Keep all accepted MVP features in the architecture. Sanitizer, Communications new-tab behaviour, the extension replacement and cross-device GM sync remain deferred; skipped tab icons/BO explorer/live iPart preview do not become loader dependencies. If later requested, Sanitizer warrants its own file, not additions to every feature's API helper.

Before implementing the affected features, verify the normal bookmark storage API and per-user enforcement, Recents document filters/modified-user mapping and native editor keys, stable catalogue IDs/environment-specific destinations, and editor document/selector/RadWindow coverage. These uncertainties do not block building unrelated theme loading or copy features.

New IQA requests use `GET /api/query` with named filters; prompted names come from `GET /api/QueryParameterDefinition?QueryPath=...`. Preserve the existing taskbar query contract during this packaging change; migrate its legacy request separately once its prompts are verified. Do not propagate `/api/iqa` into new code.

Recommended sequence:

1. Implement/test the index using only existing deployed theme files, with dependency/duplicate/failure checks. Include readiness reporting for callers that previously assumed synchronous global availability.
2. Port the current IQA output as one registered file, consolidate styles/icons and preserve preferences, postbacks, Save ownership and existing module checks. Recheck native Save/reopen behaviour in iMIS.
3. Establish `Shared.js` with lifecycle/context/UI/editor helper sections; adopt them incrementally without rewriting unrelated core features. Port `RiseEditor.js` and the three page-scoped sections in `AdminTools.js`, plus confirmed shared dialog shortcuts.
4. Consolidate taskbar attachment, Quick Navigation, catalogue handling, bookmarks/storage and Recents in `Taskbar.js` with distinct sections. Extract destinations to `Data/Navigation.json` and add schema/build validation using `Data/Navigation.schema.json`. Port the approved interaction and shell styles into their owners; keep historical A/B layouts and demo fixtures out of runtime. Preserve contact search/history, appearance and existing save/load race guards throughout.
5. Add the separately installed GM owner and the combined `DevTools.js`, with ownership/startup-order checks and Easy Edit/Dev Mode lifecycle checks, including leaving Easy Edit during a pending load. Keep IQA/RiSE Enhance preferences independent.
6. Update installation instructions, copyable include, feature status/examples and the standalone usage guide as implementation lands. Regenerate with `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs` and verify `--check`; browser-check changed guide examples. Keep generated previews in `references/` and the guide offline.

Acceptance follows the original plan's section 15: delayed/missing dependencies, double includes, partial replacements, off/on cycles, stale responses, native form persistence, clipboard rejection, correct popup focus, both bookmark owners/startup orders and actual supported-tenant smoke tests. This review does not claim those tests have run.
