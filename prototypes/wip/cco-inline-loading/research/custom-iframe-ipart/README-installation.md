# UnionSuite CCO 0.1.0 — local trial

The user confirms the save-compatibility update resolves the containing-page save issue. All six tabs appear, About renders, and People search retains its search when switching away and back. The latest local update routes ordinary same-origin child-page links, including the supplied `/UTNewTheme/Party.aspx?ID=...` route, to the parent document. This navigation update still needs a live retest. No shared-theme promotion has occurred.

## Local build and preview

Run from this folder with Node.js:

```powershell
node tools/build.mjs
node --test tests/contracts.test.mjs
node tests/browser.cjs
node tests/frame-gutters.cjs
node tests/page-editor.cjs
node tools/build-guide.mjs
node tools/build.mjs --check
node tools/build-guide.mjs --check
node tools/check-guide.cjs
node tools/preview.cjs
```

Open `http://127.0.0.1:4173/?ID=1001&tag=a&tag=b` for the synthetic runtime, `/config-demo` for the native editor fixture and `/guide` for the offline trial guide. The preview enables sequential preloading and the popup bridge so they can be exercised; new real configurations default to both off. No iMIS endpoint is contacted by these fixtures. Stop the preview with Ctrl+C. Browser tests reuse `../.tmp-iqa-integration/node_modules/playwright` and installed Microsoft Edge; `CCO_PLAYWRIGHT_PATH` can point to another existing Playwright package. The runtime and build have no npm dependencies.

## Edit a tab's entire page

Replace the rebuilt upload ZIP at its existing location and reload the containing page. Parent Easy Edit shows a separate pencil beside each tab. The pencil opens that page in the parent's native Content Designer and does not select the tab or change its URL. This requires the native parent `ShowDialog_NoReturnValue`/dialog manager and normal iMIS editing permissions; the optional child popup bridge can remain off. No new author class, setting or shared-theme upload is required.

The page's `DocumentVersionId` supplies `iUniformKey`. `src/page-editor.js` resolves the same-origin ContentRecordEdit path under `__ClientContext.websiteRoot`, then `gWebSiteRoot`, then the application root. It uses the verified argument-12 close callback, leaving argument 8 (`beforeClose`) empty. Every close, including Cancel/X, refreshes only that tab; saving without closing does not. Tracked unsaved edits prompt before discard. Declining preserves the child. Other retained tabs, selection and context remain intact. Native close handling finishes before refresh/focus, and callbacks are ignored after CCO replacement, disposal or contact-context changes.

Pencils use existing shared `TextButton us-icon-button` appearance; `src/styles.css` owns placement and caption clearance. `src/runtime.js` owns visibility, refresh and focus. The native boolean `gIsEasyEditEnabled` is authoritative, with native marker fallback if absent. Native loads/ASP.NET updates/marker changes reconcile it; integrations changing only the flag can call `window.UnionSuiteCCO.scan()`. Tab caption/order/folder/key changes require Collection options → Reload configuration. See the guide's visual examples and generated control (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`). Local tests pass; verify native permissions and Save/Publish after upload.

## Generated assets and future sandbox registration

### Standalone iMIS-server upload option

For upload to your iMIS server, run `node tools/package-upload.mjs`. It refreshes `upload/UnionSuite-CCO/` and creates `upload/UnionSuite-CCO.zip` containing **display.html**, **configure.html** and a short README inside its **UnionSuite-CCO/** directory. Packaging uses Node without PowerShell execution-policy dependencies. Static upload text is ASCII to prevent em dashes and ellipses being misdecoded by the server; values supplied by the API are not changed.

Your supplied iMIS export uses ZIP-backed iPartSource paths. The user subsequently corrected the paths to include the inner folder and confirmed configuration opens. Upload replacements to the same location and retain these current values:

```text
DisplayHtmlPath: ~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/display.html
ConfigHtmlPath:  ~/iPartSource/UnionSuite-CCO.zip/UnionSuite-CCO/configure.html
```

The earlier exported values omitted the inner folder and did not match the archive. The user resolved this by correcting the iMIS paths, so replacement ZIPs preserve the inner directory rather than flattening it. Unlike ordinary external hosting, this iMIS mechanism addresses entries through the `.zip/...` virtual path. Supplied original ZIPs/XMLs remain unchanged in `ZIPs/` for comparison.

This packaging variant replaces the hosted runtime's external bootstrap with inline JavaScript. Local packaging checks (`node tests/upload-package.cjs`) cover rendering and native-field save preparation; live iMIS must still confirm its fetch pipeline and CSP permit the embedded scripts/styles, along with token substitution. Opening display.html directly does not supply the tokens; opening configure.html directly does not supply the native JsonSettings field. Use both through the Client-based Content Type.

The separate externally hosted build below remains available if inline runtime execution is restricted.

The default build embeds `https://unionsuite-cco.invalid` as an intentionally unusable asset base. Choose a separate sandbox hosting target, then generate concrete assets with:

```powershell
node tools/build.mjs --asset-base=https://YOUR-SANDBOX-ASSET-HOST/cco/v0.1.0
node tools/build.mjs --check --asset-base=https://YOUR-SANDBOX-ASSET-HOST/cco/v0.1.0
```

This only writes local files. It does not publish or modify iMIS. Use the same asset base for build and check. Uploading, registration and cache clearing remain a subsequent explicitly authorized sandbox exercise.

| Artifact | Purpose |
|---|---|
| `dist/embed/index.html` | Token-bearing runtime shell retrieved/substituted by iMIS |
| `dist/runtime.js`, `dist/cco.css` | Framework-free runtime bundle and scoped styles |
| `dist/config.html` | Self-contained editor with CSS/JS inlined, following the HubForms native configuration pattern |
| `dist/build-info.json` | Local version, chosen asset base and trial status |

Create a **new Client-based Content Type**, proposed name **UnionSuite Content Collection Organizer (Trial)**. Use the chosen host's direct `/cco/v0.1.0/embed/?DoNotCache=1` URL as **URL to display items at runtime** and its direct `config.html?DoNotCache=1` URL as **URL to configure content items**. Hosting must serve the directory shell without a redirect. If the config requires a different server-reachable host as HubForms did, host only `dist/config.html` there; it has no external asset dependencies. Do not copy the HubForms deployment URLs. Test the actual fetches, CSP and trailing-slash behaviour before using the component. Revalidate trial assets instead of serving stale long-lived copies.

The shell runs inside the iMIS document. It must not be placed in a cross-origin iframe. The iMIS runtime must execute the external bootstrap script and retain the stylesheet link. Verify both substituted data attributes on the mount before diagnosing downstream behaviour. The supplied shell is a Content Type asset, not a template to paste into Content HTML, and authors never enter placement GUIDs in HTML.

Add the Content Type to a restricted staff sandbox page. Its own output supplies `.us-cco`; leave the iPart **CSS class** field empty unless a separate supported author class is needed. An iMIS CSS-class value creates an extra wrapper div inside `.ContentItemContainer`; the runtime finds only `[data-us-cco]` mounts and does not detect or restyle native panels. Direct, author-wrapper, empty-wrapper, panel-free and nested-panel fixtures are covered.

## Configuration

Use the editor through iMIS so exactly one native `#JsonSettings` field is available. Supply the folder's **DocumentVersionId**, a path label if useful and a collection caption. Use **Check folder contents** to inspect the current session's immediate children. Copy an optional initial page document-version key from that result. Use native **Save** or **Save & Close**, then reopen and check the values. The fixture tests preparation of the field and save-event ordering; only live iMIS can confirm persistence.

```json
{
  "schemaVersion": 1,
  "folderDocumentVersionId": "00000000-0000-4000-8000-000000000003",
  "folderPathLabel": "@/Your/Sandbox/Folder",
  "caption": "Directory",
  "initialDocumentVersionId": "",
  "orientation": "vertical",
  "preload": "off",
  "popupBridge": false
}
```

The key above is synthetic; replace it in the editor. Keys drive requests, labels do not. The editor merges its owned fields into current JSON and preserves unrelated properties. Valid edits sync on input/change, before the native save reads the field. Invalid JSON and unsupported schema versions are not overwritten. Validation chains the native `RunAllValidators` function and retains a scoped fallback for known Save buttons. A hidden/removed editor does not veto parent-page saves, and there is no document-wide submit blocker. Enter on an editor input/select is suppressed to avoid accidental postback. A blank native content-item name is filled from the caption; an existing author name is preserved. Both mounts use `ng-non-bindable`, matching the supplied Hub Widgets shims. These integrations require a live page-save retest. No settings are saved through a custom PUT/POST endpoint.

See `research/Hub-Widgets-Save-Comparison.md` for the comparison and remaining uncertainty. `node tests/editor-save.cjs` tests simulated host save/validation flows. If the page still loses the iPart, `diagnostics/Page-Save-Trace.js` can be pasted into the containing page editor's console before Save. It logs counts and cancellation/error booleans without submitting anything or printing form values. The actual Save network response and a post-save export are needed to distinguish a rejected request from a missing placement in the saved document.

`preload: "sequential-idle"` enables the trial scheduler. `popupBridge: true` enables only the `ShowDialog_NoReturnValue` bridge. `orientation` accepts `vertical` (default for new settings) or `horizontal`. Existing saved horizontal settings are preserved; choose **Tab layout > Vertical** to match the native CCO sidebar. The installed UnionSuite theme CSS is required: the runtime uses the native `.cco.tabs-wrapper`, `.RadTabStripVertical` / `.RadTabStrip`, `.rtsLevel > .rtsUL > .rtsLI > .rtsLink` and adjacent `.RadMultiPage` structure. The iPart does not ship a second copy of native theme styles. Collection caption labels the tablist for assistive technology. The bottom-right refresh icon reloads only its tab; Collection options below the CCO reloads configuration and clears retained tabs. Use `urlParameter` to choose a parameter such as Directory; blank retains automatic placement namespacing. `urlValue` accepts name (default), key or number and controls generated links; incoming links accept all formats. The earlier `selectionParameter` field is not used. The runtime has no folder, identity or route overrides in viewer query parameters.

## Runtime contracts and navigation

- `GET /api/ContentItem?ContentItemKey=…&ContentKey=…` must yield exactly one matching pair. Both identities are verified across Data/direct/property-bag shapes, including conflicting identities. Duplicate matching records and wrong-page records stop before folder lookup. A copied placement is safe only when its containing key also matches.
- Settings may be a JSON string/object or `$value` wrapper under `JsonSettings` or the HubForms `Settings` alias. Unknown schema versions stop visibly. Network calls use the current document's verification token, same-origin cookies, no-store and a 30-second timeout. API redirects, HTTP errors, malformed JSON and service failure flags are rejected.
- `FindDocumentsInFolder` uses the verified typed string-array and boolean arguments. Only immediate `CON` children become tabs; `CFL` rows are counted and omitted, with no traversal and therefore no cycles. Duplicate version keys, malformed names/keys and unexpected document types fail visibly. Pages sort by Name and label with AlternateName, falling back to Name.
- Explicit non-published/denied/deleted flags are omitted; unrecognized nonempty Status values are also omitted. When no status is supplied, the listing service's filtering is the only publication signal. This is **not** an authorization implementation. Confirm actual status shapes and permission filtering under each intended live role. No DocumentSummary query, draft lookup, definition download, SQL scan, stub discovery or discovery postback exists in the runtime.
- Initial selection is an available document-version key in the instance's query parameter, then the configured initial page, then the first returned page. Invalid deep links fall back visibly. The parameter is `us-cco-{ContentKey without hyphens}-{ContentItemKey without hyphens}` and its value is the selected full document-version GUID. A tab click uses `history.pushState`; hash and other placements' parameters remain intact. Back/Forward restores retained selections without a parent reload in local tests.
- All parent query context is forwarded with repeated values and their within-key ordering retained, except case-insensitive renderer options (`TemplateType`, `iMode`, `iUniformKey`, `iOperation`, `DocumentTypeCode`, `DialogCacheParam`, `IsPopup`, `popup`, `PageInstanceKey`, `DoNotCache`), names beginning `us-cco-` and names beginning `__`. Hash is not context. Parameter names retain case. Review this forwarding policy against real child pages before rollout.
- Child frames use the verified staff-trial ContentPreview Execute route with `iUniformKey` set to the listed version key and `TemplateType=E`. The refresh tab icon retries that child route; there is no Open full page link. Access, login redirects, error-page shapes, CSP/frame restrictions and chrome suppression remain live gates. Browsers do not expose an iframe's HTTP status through `load`; a same-origin HTML error page can look loaded. `ready` means an accessible document loaded, not verified native success or publication.
- Hidden panels use `hidden` and `inert`. Tabs have roles, selected states, controlled panels and meaningful frame titles. Up/Down (vertical) or Left/Right (horizontal/mobile), plus Home/End, move focus; Enter/Space activates. This manual-activation policy avoids starting a slow load just to move keyboard focus. Tabs scroll horizontally on narrow screens. Styling uses existing UnionSuite colour/font tokens and has no motion dependency. Frames automatically grow and shrink to content height so the main page scrolls, with a default 480px minimum controlled by `--us-cco-min-height`. `--us-cco-frame-height` only sets the initial loading viewport. Content updates, width changes and retained-tab reveal trigger remeasurement; native grids/editors retain their own explicit scroll regions. The child document roots and outer native page-shell wrappers fit the available tab width, retaining responsive columns and gutters without hiding horizontal overflow. The rules exclude nested iParts, grids and popups. See the standalone guide's `#content-width` and `#content-height` sections for lifecycle and live-verification limits.

## Retention, context, dirty state and lifecycle

Each instance owns an in-memory frame map keyed by destination version. The owner supplies containing key + placement key + effective context + freshly loaded configuration, so maps never cross instances or contexts. Nothing writes member HTML, configuration or API payloads into browser storage. There is no LRU or frame-count cap yet; memory must be measured with real tabs.

With background loading off, selecting a new tab loads it and retains previously visited tabs. With sequential idle loading on, the selected page must be ready first; then one speculative request runs at a time. A clicked page starts immediately even if one speculative page is in flight. Ready revisits reuse the iframe node. An in-flight revisit reuses its request. Failed tabs wait for the refresh tab button; the scheduler does not retry them in a loop.

Parent `pushState`, `replaceState` and `popstate` trigger a context comparison. Clean context changes dispose all previous frames and refetch configuration before rendering new content. Dirty frames are hidden and inert; users must explicitly discard them before loading the new context, or return to the previous context to recover them. Refresh tab and Reload configuration prompt before discarding tracked edits. Text/choice edits are conservatively treated as dirty, except input[type=search] and controls inside .FilterPanel, [role=search] or [data-us-cco-search]. These search/filter changes are retained UI state and do not set the custom unsaved-edit guard. Native third-party warnings are not suppressed. Native child navigation resets tracking after its next load. Parent/child beforeunload handlers request native browser warnings, subject to browser restrictions. Arbitrary native AJAX saves, script-driven edits and partial-postback deletion cannot be reliably inferred; these are live release blockers. A tested adapter may dispatch `us-cco:clean` on the child document after a confirmed save.

Ordinary unmodified left-clicks on same-origin links to a different page now target the parent document, including People search links to `/UTNewTheme/Party.aspx?ID=...`. The original destination query and fragment are preserved; the old member context is not merged into the link. Browser default navigation performs the action, so native cancellation and beforeunload warnings still apply. The delegated handler is installed on each child load and handles links inserted by a partial update; disposal removes it and restores targets it changed.

Same-path links (including query-based paging), same-page anchors, JavaScript links, inline onclick handlers, button-role links, explicit targets/new tabs, modified clicks, download attributes, non-page file extensions and recognized Download/Export/Attachment.aspx endpoints retain their existing behaviour. External links are also left unchanged. A reviewed integration can use `data-us-cco-navigation="child"` on an ordinary link that deliberately belongs in the child. This policy does not override forms, JavaScript redirects or server postback redirects; those require separate evidence and adapters. Unknown download routes and native popup controls still need live checks.

Back/Forward tests cover CCO selection entries; navigation that remains within a child can still add native joint-history entries. Page-context values outside the URL need a host adapter to trigger `us-cco:reload`; automatic identity detection from hidden business state is not implemented.

Initialization is idempotent. A MutationObserver handles replaced mounts and changed key attributes. ASP.NET `Sys.Application.load` and `PageRequestManager.pageLoading` integrate when available. Removal aborts pending requests, cancels preload work and disposes listeners, frames and bridges. Repeated identical placements in one DOM and nested custom CCOs are rejected visibly. Config changes are picked up on remount or explicit Reload configuration, not remote polling. Global history wrappers are restored on disposal only if still owned by this runtime; interoperability with other wrappers requires live validation.

The popup bridge forwards argument objects unchanged with the parent window as `this`; callback closures continue to execute in their originating child. It restores helpers on disposal and reconciles replaced helpers every 500ms. A frame load installs it again. Missing parent helpers fall back to the child's original helper. Other helper APIs, nested dialogs, cancel, validation failure and cross-origin navigation need live checks. No claim is made that every dialog is bridged.

For local diagnostics, use `window.UnionSuiteCCO.diagnostics()`. It reports identities, counts, states and load times, not member contents. `us-cco:timing` events on the mount report selection cost/warm status and frame-load duration without context values. `window.UnionSuiteCCO.reload(mount)` or `mount.dispatchEvent(new CustomEvent('us-cco:reload'))` requests a controlled reload. `window.UnionSuiteCCO.dispose()` removes the page runtime. These are developer hooks, not author classes or an API authorization layer.

## Theme and release boundary

The component CSS stays in this isolated package, consuming `--brand-600/700/50`, `--bg-surface/subtle`, `--text-base/strong/muted/link`, `--border/strong/focus`, `--danger` and `--font-ui`. There are no global token declarations or native-panel overrides in it. This trial does not settle the outstanding secondary-navigation-on-grey design choice.

`references/Usage-Guide.html` is the standalone **trial** guide with local screenshots, exact source and copy controls; edit `docs/Usage-Guide.source.html` and rebuild it. The parent theme Usage Guide also documents the CCO integration and its limits. The CCO's embedded-page sizing correction is packaged in the iPart; it does not change shared `99-Orion.css`, `zUnionSuite.css/js` or client stylesheets. Promotion remains phase 6: move only accepted component additions to the appropriate theme owners, update the parent guide source, run `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs` and `--check` from the parent root, and inspect the offline guide.

### Outer gutters and inline style ownership

Native outer `.row` margins are negative half-gutters (20px per side under Orion). Parent CCO padding is outside the iframe and cannot balance these margins inside the child. The embedded-page correction in `src/frame-size.js` clears horizontal margins only for the supported outer page-layout rows; nested field/iPart gutters, column padding and ordinary padded containers stay native. It does not hide overflow. See the gutter scope and visual regression (archived locally: `archive/Custom CCO iPart/references/Usage-Guide.html`).

The shared theme owns tabs, panel surfaces, icons and tokens. `src/styles.css` owns the custom mount/frame/loading layout. `src/frame-size.js` injects child-shell compatibility CSS as `style[data-us-cco-frame-style]` and calculates the iframe's inline pixel height. The inline `.EmptyMasterContentPanel` height comes from iMIS; the child CSS overrides it. The package build embeds its CSS and JavaScript in `display.html` so the ZIP is self-contained. Edit source files and run `node tools/package-upload.mjs`; upload the rebuilt ZIP to its existing location and reload the parent page. No new class, setting or theme stylesheet upload is required.

See `Live-Verification.md` for the unresolved gates. This version is not production-ready.

## Folder lookup in the configuration editor

Find a content folder searches `$/_i4u_/Core/Admin/CFL Search` through GET `/api/query` with the named `Path` filter (for example `Path=CFL`). Type part of the filepath (300ms debounce), or use Find folders / Enter. Blank searches omit the optional parameter and request the first 20 results. Refine the path when the limit is reached. The IQA must expose `DocumentVersionKey`, `DocumentPath` and `Name` and restrict results to CFL folders. Selecting a result validates DocumentVersionKey as a GUID, fills the key and path label, and prepares native JsonSettings; native Save persists it. Manual key entry and Check folder contents remain available. IQA access follows the current user/session. Errors never replace saved settings. Requests are cancelled on new searches and editor disposal. Keyboard users can Tab to a result and activate it with Enter/Space. The query path and aliases are supplied by the user; this IQA has not been called against live iMIS during development.

Tab loads use the installed theme's `.us-tab-loading-spinner` and `data-us-tab-loading` marker, delayed 150ms like the native CCO. Only the selected loading tab shows an indicator. Sequential background preloads stay silent; selecting an in-flight or cold tab shows the indicator, and switching away clears it. Loading/ready announcements remain in the live region without a visible message band; errors and context warnings remain visible. Completion, failure, reload and disposal clear the indicators. Only tabs that have already completed a visible layout pass switch without a spinner. A hidden preload still shows the theme loader on first reveal.

Horizontal mode leaves the mount and tab-strip backgrounds transparent so the surrounding page shows through. Native tab buttons and the content surface retain their theme backgrounds; vertical mode is unchanged.

## Readable tab links

Set Tab URL parameter to Directory. Incoming links always accept a content key, a 1-based tab number, or a unique displayed name, regardless of Tab URL value. `Directory=About` opens About; `Directory=Notes-and-Interactions` and `Directory=Notes%20and%20Interactions` both open Notes and Interactions. Matching ignores case. Missing `urlValue` defaults to name, replacing whitespace runs with dashes when clicking tabs. Explicit saved key/number formats remain in place. Keys take precedence, then numeric positions, then names/dashed names. Names that collide or look like another tab's key/position use stable keys for generated links; ambiguous incoming names use the configured default tab. Numbers follow the currently available displayed folder order; reordering/filtering changes their meaning, while renaming changes name links. Parameter names must be unique across CCOs and must not reuse contact/renderer parameters. The custom parameter is excluded from child context and invalidation comparisons. Old automatic GUID links remain a fallback when the custom parameter is absent; the next selection replaces this placement's old parameter. With no navigation value, the configured initial tab (or first available tab) is selected and the URL is left intact until a click. Refresh and Back/Forward accept all formats without reloading retained frames. Install the rebuilt upload ZIP and reload the page; see the standalone guide's `#tab-links` examples.

Popup screenshot follow-up: the user reported the bridge option was disabled. Enable it, save and reload the containing page before retesting AddAddressPopup. The available button markup names AddAddressPopup but does not include its implementation; coverage depends on it calling ShowDialog_NoReturnValue. Live verification of Add Address and its save callback is still needed.
# First-load frame visibility

The content loader now uses the theme's section-loader-spinning-circles element (three circles, brand and accent colours). The iPart owns placement and visibility only; zUnionSuite.css supplies the visual and reduced-motion rules. No duplicate spinner CSS is bundled.

The component, panels and frames reserve a 480px minimum height, configurable with --us-cco-min-height. A content-area spinner appears during configuration and new child loads. New frames remain hidden until document load and a bounded 1200ms settling period with a measurable visible viewport. Hidden preloads retain their frame and defer this display step until selected; the child receives a resize event. Hiding the page during settling resets the display timer. This also covers an entire CCO hidden behind a page-section switcher. Tabs already shown appear immediately without a new request. Reduced motion uses a static ring. This delay does not confirm completion of every asynchronous query or widget. Install the rebuilt custom CCO display package; updating shared theme CSS/JS alone is insufficient.

### Retained iframe appearance
Update runtime.js and the shared zzDarkMode.css for dark-mode reveal synchronisation. Every themed child must load zUnionSuite.js and zzDarkMode.css with the same appearance storage key as its parent. The runtime reads the latest parent preference on load and visible presentation, including previously visited hidden tabs. Selected tab text and its loading spinner use the shared dark text token.

