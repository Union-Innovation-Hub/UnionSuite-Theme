# Native CCO: two inline-loading browser probes

> **Approved specification:** [prototypes/approved/cco-inline-loading/](../../approved/cco-inline-loading/README.md). This folder keeps the live trial, its tests and the research until the theme implementation lands.
>
> **Research and history:** `research/native-cco-handover/` holds the dated handovers, findings and user-supplied evidence for this investigation. `research/custom-iframe-ipart/` holds the retained research, plans and verification of the retired custom iframe CCO iPart, whose implementation is archived locally. The current direction and live results are further down this README, under the native partial-postback sections.

Status: WIP console experiments, 22 September 2026. These compare inserting HTML into a **native** CCO without an iframe. They do not modify the deployed theme or the Custom CCO ZIP. Live iMIS verification is still required.

Current probe: **0.7.1-probe**, locally verified and awaiting a live retry. The live 0.7.0 trial stopped before initialization with `Ambiguous slash after a closing brace.` 0.7.1 skips scripts that mention the grid ID but contain neither a `$create(...)` call nor the Cases manager name, such as the native focus helper. Scripts that could create the controls are still scanned strictly; a failure there now reports the script index plus whole-script line and offset.

The [Cases initialization trial](#cases-initialization-trial) supports the captured page-size dropdown as well as the grid. It creates the dropdown first, uses the two supplied Telerik handlers, restores both controls' validated client-state fields and disposes owned controls on exit. The paginated setup is checked locally with synthetic controls; live initialization, cleanup and server paging remain unverified. Ordinary A/B modes retain their previous behavior. The dated handover records v0.4.0 and remains a historical snapshot.

## What is being compared

| Probe | How it finds content | What is inserted |
| --- | --- | --- |
| A — child page | Native canonical path → parent DVK → published Document blob → CCO configuration and child DVKs → individual ContentPreview page | Children of the selected child-page content shell |
| B — parent page | A captured normal parent-page URL for each selected tab | Children of the selected native `.rmpView`, from the same CCO |

Both intercept the original tab links, fetch HTML using the current session, retain existing results beneath a loading overlay, and insert the fragment inside the existing `.RadMultiPage`. Content interaction is blocked while loading; tabs and Stop remain available. The initial tab's actual DOM nodes and listeners are retained for restoration. Other tabs are fetched afresh on each visit. No background preloading is performed.

The first question is whether direct child rendering or parent-context rendering produces usable iParts. Successful insertion is **not** a claim that native grids, forms or popup callbacks work. Both modes deliberately leave the outer URL, Telerik selection state, ViewState and event-validation fields unchanged. They are experiments for a clean sandbox page, not navigation replacements ready for deployment.

## Maintained files and local check

- `CCO-Inline-Probes.js` — one pasteable browser script with both experiments and a configuration discovery command. No build/bundle step or external script download.
- `Capture-Cases-Callbacks.js` — small follow-up console capture for the observed native Cases descriptor; reads callback/helper source without copying its properties or changing the installed probe.
- `Capture-Cases-Manager.js` — completed source capture: manager setup lines and bounded method definitions, without invoking methods or reading runtime field values; works with the older v0.5.1 probe.
- `test-cases-trial.cjs` — offline Cases contract/ownership checks using the supplied manager body with a synthetic grid and component registry.
- `Capture-Cases-Pager.js` — completed standalone source capture, retained for diagnostics: one Cases GET, dropdown property shapes and exact bounded callback/postback source, without inserting content or initializing controls.
- `test-probes.cjs` — headless Edge checks against fictional, intercepted HTTP pages. It uses the repository's existing Playwright installation and never contacts iMIS.
- This README — run instructions, current limits and decisions still to resolve.

From the repository root:

```powershell
node --check prototypes/wip/cco-inline-loading/CCO-Inline-Probes.js
node prototypes/wip/cco-inline-loading/test-probes.cjs
```

Preview command: paste `CCO-Inline-Probes.js` into the **outer published page's** browser console, then use one of the commands below. There is no standalone live-page preview server.

## Start here

1. Open a native CCO page in the sandbox with the intended member/context selected, no unsaved edits and Easy Edit off. The probe can discover the containing page's DVK automatically; no page-inspector panel is required.
2. Paste the complete contents of `CCO-Inline-Probes.js` into the outer page console. This only installs the console API; it makes no requests or visible changes yet.
3. Check the native tabs:

```js
usCcoInline.inspect();
```

When there is exactly one native CCO, the probe selects its actual container automatically. If there are multiple, it prints their IDs and asks for `rootSelector`, for example `usCcoInline.inspect('#ste_container_ciDirectory')`. A supplied selector must select the intended `.ContentItemContainer`, including the `ste_container_` wrapper. Additional author-class wrappers are supported; nested CCOs are not mistaken for the outer strip. Display names with spaces are not assumed to equal DOM ID suffixes.

## Probe A — resolve configuration from the published Document blob

Run:

```js
await usCcoInline.startChild();
```

Click the **existing CCO tabs**. On the first switch the probe fetches a child `ContentPreview.aspx` document and inserts the content from `#MainPanel .EmptyMasterContentPanel` into the CCO. The source shell is not itself copied, avoiding the empty-master height/scroll restrictions from the earlier iframe work.

As of v0.4.0, discovery first reads the native `<link rel="canonical">` URL. It ignores the query string, removes `.aspx`, and strips only a matching native `gWebSiteRoot`/application root. The remaining path becomes `@/...` and is resolved with `POST /api/Document/_execute`, `OperationName: FindByPath`. For example, `/UTStaff/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff.aspx?ID=10420` resolves to `@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Account_Page_Staff` when the native website root is `/UTStaff`. Underscores are preserved. Member/query context for child rendering still comes from the visible page URL.

If there is no canonical link, discovery uses the current pathname with the same root rules. A native `ContentPreview.aspx` URL with `DocumentTypeCode=CON` instead supplies its single `iUniformKey`. Unrelated URL GUIDs, nested iPart script keys, Easy Edit metadata and ViewState are not used as parent identity. The lookup does not repeatedly strip path segments or try unrelated slugs. Multiple/cross-origin canonical links, mismatched returned paths/types, ambiguous/paged results and missing or invalid keys stop discovery. A change of URL/canonical link during the identity request also stops it. `stop()` cancels identity discovery started by `startChild()`.

The canonical-path route follows the earlier `iMIS Enhanced/probes/content-page-metadata-recon-probe.js` and its recorded Account Page Staff findings. Those are existing research evidence; v0.4.0 automatic discovery is locally tested against synthetic pages and still needs a live run. The standalone CCO probe has no runtime dependency on that sibling project. An explicit `parentDvk` skips the path lookup; an explicit `pagePath: '@/...'` overrides path derivation when native metadata is missing.

Once the DVK is resolved, discovery requests `GET /api/Document?DocumentVersionID={parentDvk}&DocumentStatusID=40`. On 22 September the user supplied a successful response containing exactly one published `CON` document with a Base64 XML definition in `Data.$value`. The probe validates the returned DVK, type, published status and complete single-document result, decodes UTF-8 XML, then reads only the CCO entries directly inside `ContentItems`. Each CCO's `ContentKey` must match the parent DVK. Malformed/ambiguous responses are rejected; configuration XML is never inserted or executed.

The published Document request discovers both the placement key and configuration. Automatic canonical-path resolution adds one preceding read-only FindByPath request; subsequent folder enumeration is unchanged. No Easy Edit markup, DocumentSummary lookup or ContentItem call is used by the default path. If the document contains multiple CCOs, it prints their names and placement keys and stops. Repeat with the intended `contentItemKey` and `rootSelector`; the key selects an entry inside the blob.

For the supplied **Account Page Staff** export and confirmed API response, reload the page, paste the updated script, then use:

```js
await usCcoInline.startChild({
  rootSelector: '#ste_container_ciAccountpagetabs'
});
```

The supplied blob identifies the Dynamic CCO named `Account page tabs`, placement `b511e4d0-55d8-4a38-b20d-f26d82b1af72`. If this page contains more than one rendered CCO, also supply its actual `rootSelector` from the printed container list. The Document response is live evidence supplied by the user and decoded locally; folder enumeration and inline rendering on this page are not yet verified by that response.

To inspect the configuration and page list without installing a tab handler:

```js
await usCcoInline.discover();
// A smaller, copyable key inventory; also leaves native navigation untouched:
copy(JSON.stringify(await usCcoInline.keys(), null, 2));
```

The key inventory returns `parentDvk`, `contentKey` (the same containing-page key), `contentItemKey` (the selected CCO placement), `pagePath`, `identitySource`, and `childPages` with each caption and its `contentKey`/DVK. Child entries follow the folder result order; they are not asserted to be native tab indexes. Starting Probe A independently matches captions to native tabs and includes this inventory in its return value. `keys()` and `discover()` perform fresh lookups each time; neither starts interception or changes native controls.

Folder mode uses the existing read operation `POST /api/Document/_execute`, `OperationName: FindDocumentsInFolder`. It ignores stale manual settings when `UseContentFolder` is true. It supports immediate children only and stops on nested folders. Explicit non-published, deleted or unauthorized documents are excluded. Only pages matching an existing native tab caption are requested. Unknown publication metadata still needs live review; this does not establish preview-route suitability for public users.

Dynamic CCO configuration is recognised by the XML `DynamicContentCollectionOrganizer` type and its namespace (or `DynamicContentCollectionOrganizerCommon` in the optional ContentItem response). It uses `SourceKey`/`SourceFolder`, with `DefaultSourceKey`/`DefaultSourceFolder` as fallback when the primary key is unset or the source returns zero documents. API errors, nested folders and caption mismatches do not trigger fallback. This fallback rule follows the older native decompilation and still needs live parity checks. Diagnostics report the folder used. On this page the primary folder is `@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Tabs`, key `a5855360-8ee9-4be8-8cfd-78aca7a92b83`.

For explicit comparison with the previously verified two-key endpoint, add `configSource: 'content-item'` and `contentItemKey`. That mode requires both keys because the user confirmed either key alone gives 404. It is never tried silently when Document discovery fails.

Manual mode recognises the older native BEL/newline settings format documented in the supplied decompilation. It refuses shortcuts and unknown formats. Captions must map uniquely; mapping is never based on presumed folder order.

Options when needed:

```js
await usCcoInline.startChild({
  parentDvk: 'PASTE-CONTAINING-PAGE-DVK-HERE', // optional override: skips native path discovery
  contentItemKey: 'PASTE-CCO-PLACEMENT-KEY-HERE', // optional: select one CCO from the blob
  rootSelector: '#ste_container_ciDirectory',
  appRoot: '', // e.g. '/imis' for an application below the origin root
  childSelector: '#MainPanel .EmptyMasterContentPanel',
  selectionParameters: ['Directory']
});
```

`appRoot` defaults to `gWebRoot` or the origin root. Child requests preserve the parent's query context and repeated values, excluding renderer options, the configured selection parameter, the known placement-key prefix and explicitly listed selection parameters. Do not list ID/member/filter parameters as selection parameters.

If extraction fails, inspect the returned HTML in the Network panel and set `childSelector` to its unique content shell. Do not select `body`, the whole form or the parent page's outer layout.

## Probe B — fetch the native parent-page tab URL

Stop Probe A or reload before starting this mode:

```js
usCcoInline.stop();
```

Use actual URLs recorded after normal native tab clicks, or construct URLs using a routing rule verified on that CCO (before installing interception, or in a separate browser tab with the same member/context). The existing research observed a placement-prefix parameter rather than the configured `Directory` parameter; **do not guess its name, values or index base**.

`await usCcoInline.keys()` now extracts the native page/CCO/child identities for either investigation. Those keys do not establish Probe B's tab-routing parameter or values. `startParent()` continues to require real native navigation URLs or explicit `tabUrls` based on verified routing; it does not invent routes from the discovered keys and does not need configuration API calls itself.

For **Account Page Staff**, the user supplied native-click URLs with parameter `b511e4d055d8`: Finance `3`, Notes and Interactions `4`, Preferences `5`. They subsequently confirmed that the same parameter also accepts the displayed captions `Finance`, `About` and `Notes and Interactions`. This is user-reported live navigation evidence; it does not yet establish successful inline insertion with Probe B. Prefer captions for this comparison so URL construction does not depend on inferred tab numbering. The parameter matches this placement key's first 12 hyphen-free characters, but that observation is not a universal routing guarantee for other CCOs.

After pasting the current probe into this page, run:

```js
await (async () => {
  usCcoInline.stop();
  const rootSelector = '#ste_container_ciAccountpagetabs';
  const parameter = 'b511e4d055d8';
  const tabUrls = Object.fromEntries(
    usCcoInline.inspect(rootSelector).map(({ name }) => {
      const url = new URL(location.href);
      url.searchParams.set(parameter, name);
      url.hash = parameter;
      return [name, url.href];
    })
  );
  return usCcoInline.startParent({
    rootSelector,
    selectionParameters: [parameter],
    tabUrls
  });
})();
```

`URLSearchParams` encodes spaces as `+`; do not pre-encode captions. The command preserves the current member, WebsiteKey and other query parameters. It applies the observed caption-routing rule to the native tab list, and the existing response-selection check rejects any caption that does not select its intended tab. No script update is required for name-valued URLs. The initially selected tab is restored from its retained native DOM; use `refresh()` while that tab is selected to test fetching it too.

For another CCO with captured full URLs, the general form remains:

```js
await usCcoInline.startParent({
  rootSelector: '#ste_container_ciDirectory',
  selectionParameters: ['PASTE-OBSERVED-TAB-PARAMETER'],
  tabUrls: {
    'Overview': 'PASTE-FULL-NATIVE-OVERVIEW-URL',
    'About': 'PASTE-FULL-NATIVE-ABOUT-URL',
    'Finance': 'PASTE-FULL-NATIVE-FINANCE-URL',
    'Notes and Interactions': 'PASTE-FULL-NATIVE-NOTES-URL',
    'Worksite Search': 'PASTE-FULL-NATIVE-WORKSITE-URL'
  }
});
```

This example assumes **People search is the initially selected tab**. Supply every other actual tab caption exactly as `inspect()` reports it. The initial tab may be omitted: clicking it restores the original content. Supply its captured URL too if using `refresh()` on that tab.

If native links already expose real navigation URLs, `tabUrls` entries are optional; the probe reads them. A `javascript:__doPostBack(...)` or `#` link is not treated as a fetchable URL. The probe does **not** issue a background native form POST to discover destinations.

Only same-origin URLs with the same parent pathname are accepted. Non-selection query parameters must match the current page, including repeated member/filter values. After fetching, the response must have the same CCO and captions with the requested tab selected. Wrong/default selections, login pages, redirects and ambiguous fragments are rejected while the existing content remains visible.

## Controls and results

```js
await usCcoInline.select(2);          // zero-based native tab index
await usCcoInline.refresh();          // refetch the current tab
usCcoInline.currentUrl;               // source of the currently displayed fragment
console.table(usCcoInline.report());
copy(JSON.stringify(usCcoInline.report(), null, 2)); // Chrome/Edge console helper
usCcoInline.stop();                   // restore original nodes, attributes and listeners
```

The visible **Stop probe / restore** button does the same cleanup. Stop cancels pending requests; late responses are ignored. Native replacement of the CCO ends the trial. Re-pasting requires a page reload, but after `stop()` either mode can be started again using the installed API. Capture `report()` **before** stopping.

Reports include timing, iPart IDs, native control IDs, script/initializer counts, existing component registry IDs and any extraction/initialisation error. They omit HTML, form values, cookies, verification tokens and fetched query results. Native console/network errors can be useful additional evidence.

An `inserted` result means the fragment was inserted and configured initialisation steps finished. `inserted-initialization-incomplete` means it appeared but a required plugin/callback failed. `failed` means replacement was rejected. Native control behaviour still needs to be exercised in every case.

## Cases initialization trial

**Current direction (23 September 2026): native partial postbacks.** Native Cases sort/page is already an UpdatePanel partial postback. A live async tab click returned a server redirect, which confirms the decompiled `Tab_TabClick` → `Response.Redirect`, so tab switching itself cannot be made partial. [Native-Partial-Postback-Trial.js](Native-Partial-Postback-Trial.js) tests the alternative. From About it:

1. fetches Cases and inserts its tab view, with fetched scripts removed;
2. detaches the original tab's content;
3. switches the page-level form state (`__VIEWSTATE`, generator, event validation, anti-forgery token, `PageInstanceKey`, tab client state, form action) to the fetched page;
4. registers the Cases `ListerPanel` with the native PageRequestManager;
5. requests the native Cases refresh, so iMIS returns the grid and its own initialization scripts.

The user then sorts once. `usCcoPartial.report()` logs requests, delta panel/type summaries, redirects, errors and grid registration, without tokens, ViewState or row data. Local check: `node prototypes/wip/cco-inline-loading/test-partial-postback-trial.cjs`. Its 4 synthetic scenarios pass; they use doubles for PageRequestManager and prove nothing about server acceptance. The hand-built grid initializer below (v0.7.x) is paused.

**Live result, v0.1.0 — passed:** the server accepted the switched state. The native refresh returned a normal delta, iMIS's own scripts initialized the grid, and a user sort updated in place with no reload, redirect or error. See the [preserved report](research/native-cco-handover/evidence/partial-postback-trial-v0.1.0-success.json). For lister tabs this supersedes hand-built control reconstruction. Follow-up in the same session: page 2 and a larger page size also worked natively. Clicking About then did nothing, because only the tab's appearance had changed and Telerik still treated About as selected. Another tab still worked through the native post-and-redirect path.

**v0.2.0 (current, not yet run live)** handles every CCO tab click itself. A capture-phase click handler runs before Telerik's and does not post back. For each switch it:

1. fetches the tab's page;
2. disposes the leaving view's components (PageRequestManager `_destroyTree`, then any remaining) and restores its `Loading...` placeholder;
3. inserts the fetched view, switches form state and the tab's client state, and updates the URL with `history.replaceState`;
4. registers the fetched page's own update panels and async/postback controls from its `PageRequestManager._initialize` arrays, through the native `_updateControls` or a verified manual fallback;
5. runs the view's JavaScript-typed inline and external scripts in document order;
6. replays the server `$create` blocks whose targets lie in the view, excluding report listers;
7. sequentially triggers each lister's hidden native refresh.

Each switch logs timings, disposal count, registration path, script/create/refresh results and Telerik-classed elements left without a component. Replaying server startup code follows iMIS's own partial-update lifecycle, which re-runs startup blocks on every sort. Page-wide statements such as non-grid `_jsmanager` assignments are not replayed; create errors caused by their absence are reported. `DOMContentLoaded` handlers in tab content will not fire. Local check: 6 synthetic scenarios pass.

**Live result, v0.2.0:** Cases → About → Cases → Finance all displayed and every lister refreshed natively. Totals were Cases about 1.2 s (fetch 0.7 s + refresh 0.55 s), About 4.8 s (three sequential refreshes of about 1.1–1.25 s) and Finance 3.0 s (fetch only).

Returning to About after Finance threw `can't access property "_item", e is undefined` in `_toggleActiveDescendantAttributes`. It came from a Sys.Application `raiseLoad` handler while the first About refresh completed. The exception stopped PageRequestManager before `endRequest`. The About lister script then cancelled later requests while the postback still appeared active, so the About Edit button did nothing. Most likely cause: a control created on Finance leaves its load handler behind when disposed. Natively, tab controls are never disposed without a reload. The live About response also showed that one lister refresh updates all three About listers.

**v0.3.0 (current, not yet run live):**
- **Handler tracking:** it records `add_load` and PageRequestManager handlers registered while a view's scripts and `$create` blocks run, and removes them when the view is left.
- **Lister refreshes:** it skips listers already initialized by an earlier refresh on the same tab.
- **Missing endRequest:** it detects one not raised after about 0.7 s idle, with a 15 s timeout.
- **Busy state:** the tab area is dimmed and unclickable while a switch is in progress.
- **Reporting:** each switch records page errors, released/tracked handler counts and orphaned components.

Local check: 7 synthetic scenarios pass. The leak scenario reproduces the live error when handler removal is disabled.

**Live result, v0.3.0 — passed:** About → Cases → Finance → About completed with no page errors. Handlers were released on every leave, no orphaned components remained, and About took 3.3 s. On the switched About tab, both panel editors (MembershipDetails, UTProfile) opened and cancelled as native partial postbacks. See the [preserved report](research/native-cco-handover/evidence/partial-postback-trial-v0.3.0-success.json).

**v0.4.0 (current, not yet run live): loading indicators, replicating the custom CCO iPart.**

- **Tab:** the clicked tab is selected immediately, marked `aria-busy`, and after the theme's 150 ms delay gets `data-us-tab-loading` and the theme's `us-tab-loading-spinner`. The trial owns this indicator because its internal lister postbacks would clear the theme's own `UnionSuiteTabBusy` indicator.
- **Content:** the CCO multipage (`data-us-cco-partial`) is blocked while busy. After the same delay it is dimmed (views at 0.6 opacity) under the theme's `section-loader-spinning-circles`, positioned as `.us-cco__loader` in the iPart (180 px down, centred).
- **Screen readers:** a `role="status"` element announces `Loading <tab>`.
- **Native progress images:** `_UpdateProgress1` images in the new view are hidden during the internal refreshes using the theme's `data-us-iqa-progress-replaced` marker.
- **Failure:** a fetch failure reverts the tab selection and removes every indicator.

Only the positioning/dimming rules are trial CSS, injected as `#us-cco-partial-styles`; promotion would move them to `zUnionSuite.css`. `start()` reports whether the theme's spinner styles are present on the page (`themeStyles`). Local check: 8 synthetic scenarios pass. They load the real `99-Orion.css` and `zUnionSuite.css`, and a mid-switch screenshot confirmed both spinners.

**Live result, v0.4.0:** switches worked and `themeStyles` were both present. Three problems showed up:

- **Double spinner:** the theme's `US-IQA-REFRESH-OVERLAY` reacts to the trial's lister refresh button. It matches `input[type=image][id$=_ResultsGrid_RefreshButton][data-ajaxupdatedcontrolid]`.
- **Spinner only on the first switch:** not diagnosed. Most likely the fixed 180 px position was off-screen after scrolling down a long tab.
- **Notes and Interactions:** the Email Communications `CommunicationGrid` `$create` failed. Its page-level `window['…_jsmanager']` statement had not been replayed.

**v0.5.0 (current, not yet run live):**

- **Cover:** an opaque cover (`--bg-surface`) replaces dimming.
- **Spinner position:** 180 px down, sticky so it stays in view when scrolled; content is isolated so it cannot stack above it.
- **Theme overlays:** the theme's `us-iqa-refresh-overlay`, `us-iqa-find-overlay` and their status are hidden while `data-us-cco-switching` is set on the root.
- **Grid managers:** page-level `window['<id>_jsmanager'] = new …(…)` statements are replayed, before `$create`, for owners inside the view and outside listers. The call is extracted by balanced parentheses; neighbouring startup statements are not run.
- **Diagnostics:** each switch reports `indicator` (whether the spinner was in the viewport and on top).

Local check: 9 synthetic scenarios pass. The scrolled-page scenario fails if the spinner is not sticky.

**v0.5.0 live attempt was invalid:** v0.5.0 was pasted into a page where v0.4.0 was still running. The earlier copy's capture handler ran first and stopped the event, so v0.4.0 kept handling every switch. The v0.5.0 report therefore held only network entries and no `switch` entries. The spinner seen below the CCO was most likely the theme's report-refresh overlay, which v0.4.0 does not hide.

**v0.5.1** stops any earlier copy (`usCcoPartial.stop()`) when pasted, replaces the injected styles, and records `replacedInstance` in the start entry. Local check: 10 synthetic scenarios pass.

**Live result, v0.5.1:** navigation and report sorting worked across About, Notes and Interactions, Manage Member, Overview, Yabbr Chat and Finance, with no page errors. The Email Communications manager replay worked (`managers.run: 1`, no create errors).

The cover rendered **unstyled**. The DOM showed `.us-cco-partial__overlay` as a plain block after the views, with the spinner at its left, below the content. `indicator.inViewport` was false on long tabs. So the injected `<style>` element does not take effect on the live page. The cause is not yet known; a Content Security Policy blocking inline styles is a candidate.

A Preferences panel Edit → Save also succeeded as a partial postback. It ran on the tab the page was loaded with, not a switched one, so it does not test saving after a switch.

**v0.5.2 (current, not yet run live):**

- **Inline styles only:** layout is set with inline element styles (CSSOM), which inline-style policies do not block. This covers the cover, sticky spinner, status, and the multipage's busy/loading state (restored afterwards). The stylesheet is removed.
- **Theme overlays:** the theme's report-refresh overlays and their status are hidden by a body `MutationObserver` during a switch.
- **Update-progress images:** also hidden with an inline style.
- **Diagnostics:** `start` reports `styleElementsApply`, and each `indicator` adds `insideContent` and `overlayPosition`.

Local check: 10 scenarios pass. The spinner scenarios run under `Content-Security-Policy: style-src 'self'` and fail if the cover and spinner styles are removed.

**User report after v0.5.1:** a Communication Preferences save on the Preferences tab reloaded the whole page, which ended the trial and lost its log. The supplied markup shows why: its Save/Cancel buttons use `WebForm_DoPostBackWithOptions`, and the iPart has no update panel (no `…_radAjaxPanel1Panel` or `…_ListerPanel`), so it is a full postback natively too. The user confirmed the native save also reloads the page. The trial therefore matches native behaviour: the switched form state posts with the displayed tab's own state and URL. A theme-loaded version would simply start again on the reloaded page.

**Decision (23 September 2026): get single-tab switching right first; background tabs are v2.** Preloading tab pages and keeping visited tabs alive, as the custom CCO iPart did, are deferred. Assessment for v2:

- **Preloading:** feasible and low risk. The fetch is 0.5–3.5 s of each switch. Listers refresh on display anyway. Needs clear-on-save, a short expiry and sequential fetching. Gate: a preloaded page's state is still accepted minutes later, after other tabs' postbacks.
- **Keeping tabs:** feasible in principle. All tabs share one form and PageRequestManager, so each kept tab needs its form state and PRM registration saved and restored. Gate: iMIS accepts a tab's older state and token after other tabs' postbacks. Risks: hidden controls' load handlers, grid redraw on show, staleness and memory.

Current-behaviour work before v2:

- live check of the v0.5.2/0.5.3 cover and spinner;
- a partial-postback save on a switched tab;
- popups and popup-to-lister refresh;
- row entry buttons;
- back/forward and reload;
- repeated switching;
- a native tab-switch timing comparison.

**Bug found live (after v0.5.3): tabs of a CCO nested inside a tab still did a full native reload.** The trial only intercepted the account CCO's own tab strip.

**v0.6.0 (current, not yet run live): nested CCOs.**

- **Click handling:** a document capture handler covers the account CCO and any CCO inside its content, including ones inserted by a switch. Each CCO is a `…radTab_Top` / `…radPage` pair sharing an ID prefix.
- **URL keys:** a nested CCO's key is unknown in advance. Its first switch sends one background async tab-strip postback, like a native click, and reads the tab URL from the `pageRedirect` it returns; nothing is applied to the page. The key is cached (`urlKeys` in the report) when the changed parameter carries the tab's value. Later switches fetch directly.
- **Scope of the switch:** only the nested CCO's own tab client state, views and loading cover are switched. Page-level form state switches as before.
- **Server ID:** the tab strip's unique ID comes from its `_postBackReference`. The fallback keeps the strip's `radTab_Top` segment intact.

Local check: 12 scenarios pass, including a nested-CCO case: discovery postback, direct fetch on the next switch, and the outer tab and selection left intact.

**Live test checklist (v0.6.0):** start each run from a full reload with Easy Edit off, then paste the script and run `usCcoPartial.start()`.

1. **Nested CCO:** on the tab containing a nested CCO, switch its inner tabs several times, including back to the first. No page reload. The first inner switch has a `discovery.key`; later ones have none. The outer tab stays selected.
2. **Spinner/cover:** switch long and short tabs, scrolling down before some clicks. Each `indicator` shows `inViewport: true`, `insideContent: true`, `overlayPosition: "absolute"`. There is one spinner, and content is hidden until ready.
3. **Tab spinner:** the clicked tab is selected at once and shows its small spinner until the content is ready.
4. **Reports on a switched tab:** sort, page, change page size, and use Find/filter.
5. **Partial save on a switched tab:** switch to Preferences from another tab, then Preferences panel Edit → Save. The change persists and there is no reload.
6. **Panel editor cancel:** About Edit information → Cancel.
7. **Full-postback save:** Communication Preferences Save reloads onto the same tab (native behaviour). After re-pasting, `usCcoPartial.previousReport()` has an `unload` entry naming the Save button.
8. **Popups:** Quick Actions → Add Note, and a report row entry button (e.g. `ContactDetailsEntry_*`). The popup opens; saving it refreshes the report behind it, if it does natively.
9. **Links out:** a report link (e.g. a case), then browser Back returns to the tab shown.
10. **Reload:** reloading lands on the tab that was displayed.
11. **Repeated switching:** 20–30 switches across tabs. No `pageErrors`, `orphans` stays empty, and there is no slowdown.
12. **Native comparison:** without the script, time a native click to Finance and to About for comparison with `totalMs`.
13. **Report hygiene:** the pasted report contains no ViewState, tokens or row data.

**Live result, v0.6.0 — checklist passed (user report, 23 September 2026).** The user reported every checklist item as passing, including nested CCOs. The one remark: after opening a case link and returning with Back, the trial's loading cover lost its layout, although it had held across several switches before. Not investigated at the user's request: the production version will use theme CSS instead of the trial's inline layout. v0.6.1 logs back-forward cache restores (`restored` events, `indicator.restoredFromHistory`) in case this matters later.

**Current state:** single-tab switching (no background tabs) is established as feasible on the live account page. Next is the design-lifecycle step: approve the behaviour and specification before implementation. Implementation means theme-owned JS/CSS with themed loading styles and guide documentation. Preload and kept tabs remain v2.

**Out of scope for the CCO work:** saving full-postback iParts without a reload affects all pages, not just CCO tabs. It is a possible broader theme project, not a CCO acceptance gate.

**v0.5.3:** on `pagehide`, the report is kept in `sessionStorage` (`usCcoPartial:lastReport`). It adds an `unload` entry with the full-postback `__EVENTTARGET`/argument, the form action tab, and whether a switch or partial postback was in progress. After a reload, pasting the script announces the kept report, and `usCcoPartial.previousReport()` returns it. Local check: 11 scenarios pass.

Still open: saves, popups, row-level entry buttons, repeated switching, back/forward, and prefetch with a native timing comparison.

**Latest live result (v0.7.1):** the parser error is gone. The trial now stops at `Cases contract: another component descriptor targets the imported fragment. [script 37]`, before initialization. That run listed only the grid; the page-size dropdown and its state field were absent. v0.7.2 names the unexpected control's constructor, target ID and element class in that error, without values. Syntax checks, 35 Cases scenarios and 70 general scenarios pass locally. v0.7.2 has not been run live.

**Previous live result:** v0.7.0, started from About with the smaller page size, inventoried both the grid and the page-size dropdown, then stopped before initialization with `Ambiguous slash after a closing brace.` See the [preserved failure](research/native-cco-handover/evidence/probe-b-cases-trial-v0.7.0-failure.json). v0.7.1 addresses the likely cause and adds failure locations; it has not yet been run live.

**Earlier live result:** the user started v0.6.0 from About after reducing the Cases page size to test pagination. The [preserved failure](research/native-cco-handover/evidence/probe-b-cases-trial-v0.6.0-failure.json) lists the expected grid plus its `RadComboBox.PageSizeDropDown`, whose ID ends `_ctl00_ctl03_ctl01_PageSizeComboBox`. The earlier Cases insertion inventory had only the grid. This is a newly exposed dependency, not a failed grid initialization: the contract check stopped before replacement or `$create`.

**Pager capture received:** the [preserved result](research/native-cco-handover/evidence/cases-pager-source.json) identifies one `Telerik.Web.UI.RadComboBox` descriptor at script 37 line 54, before the grid at line 57. Its events are `Telerik.Web.UI.Grid.ChangePageSizeComboHandler` and `Telerik.Web.UI.Grid.ChangingPageSizeComboHandler`; references are `null` and no postback-source property was captured. Both grid and dropdown client-state fields sit inside the grid. v0.7.0 implements this optional dropdown contract; it still rejects other native controls, changed callbacks/references/properties, reversed creation order and missing native resources. The source settings stay in the browser; the local fixture uses synthetic values for strings/item data omitted from the capture.

The capture is asynchronous: an initial `Promise { <state>: "pending" }` is not the final result. The current helper logs its request/completion and saves successful redacted output as `window.usCcoCasesPagerResult` before attempting clipboard copy. If automatic copying fails, run `copy(JSON.stringify(window.usCcoCasesPagerResult, null, 2));`. For the earlier helper already run without this saved result, if its Promise is still the last console evaluation, `copy(JSON.stringify(await $_, null, 2));` retrieves and copies that existing capture without another request. A rejected Promise reports the underlying error; it is not a successful capture. The request/body timeout is 30 seconds.

The main script includes the general inventory under each cycle's `insertion` even when validation fails, plus `initializationAttempted`. A successful paginated trial also reports `cycle.pager` with registration, attachment, callback count and creation-order checks. Successful live initialization/cleanup and sorting/paging remain pending. No further source capture is requested before retrying the trial below.

The user-supplied [manager capture](research/native-cco-handover/evidence/native-cases-manager-source.json) identifies `Asi_Web_BusinessDataGrid2`. Its setup disables multi-selection and tracking across postbacks, sets both custom row callbacks to `null`, and uses no manager disposal method. In this configuration `OnGridCreated` retains the grid; the other three callbacks do no work. The trial uses the constructor already loaded by iMIS and those exact flags. It does not copy or evaluate the captured function body.

**Next live run:** navigate normally to About, then reload there with Easy Edit off. Keep the smaller Cases report page size. Paste the full current [CCO-Inline-Probes.js](CCO-Inline-Probes.js) in the outer page console. Do not first visit Cases after reloading: that can leave its manager/control in memory, which this trial refuses to overwrite. About supplied the required grid resources in the earlier run; missing dropdown resources are now reported before insertion.

```js
await usCcoInline.startCasesTrial();
copy(JSON.stringify(usCcoInline.casesReport(), null, 2));
```

Send the copied report. A prerequisite error means the initial page lacks a required native resource; send that error instead. The trial does not fetch missing scripts. It requires the verified Account Page Staff path and CCO identity, retains all URL context, and uses the verified `b511e4d055d8=Cases` routing rule. Only Cases and return to the original native tab are enabled during this trial.

Successful local initialization reports `cycles[0].status: "initialized"`, with registration, current-element attachment and master-table attachment all true. This establishes only the client-side connection. It does not prove a sort, page, selection, popup or form save works. `casesReport()` survives Stop, unlike the general `report()` history.

After a successful first report, lifecycle checks can be run without a native server action:

```js
await usCcoInline.refresh();
usCcoInline.stop();
copy(JSON.stringify(usCcoInline.casesReport(), null, 2));
```

Both cycles should have `cleanup.status: "disposed"`, and the original native content should return. Return to the original tab and reselect Cases is also supported. Each entry creates fresh controls. A failed initialization or incomplete cleanup requires a reload before another attempt.

The adapter isolates one literal manager assignment, one `$create(Telerik.Web.UI.RadGrid, ...)` descriptor and, when present, the single verified page-size dropdown descriptor. It validates identifiers, observed top-level properties, exact event references, `null` component references and manager settings. The manager is created before the controls; the dropdown is created before the grid as emitted by iMIS. Property values remain in the browser and are passed to native `$create`; reports omit them. Only the grid and optional dropdown `clientStateFieldID` hidden fields are restored. `HiddenKeyField1`, outer ViewState/event validation, other hidden inputs, the focus helper and unrelated startup code are not imported or replayed. Actual paging requests may expose further server-state dependencies.

Owned registry/element-attached components are tracked during creation. On refresh, switching, Stop or failure, native disposal runs before removing the owned manager reference. Retained original objects and later replacement objects are never claimed as trial-owned. If an external replacement takes the same control ID, cleanup reports incomplete and leaves the replacement intact. If the native CCO/grid DOM is replaced, interception stops without restoring old markup over it. Constructor internals allocated before any registry/element attachment cannot be observed; every native creation failure therefore requires reload even when discoverable components were disposed. DOM restoration cannot reverse global or server effects.

**Next independent gate:** after registration and cleanup are verified live, run a fresh trial and test one non-saving native sort/page action, twice, recording the result, request type and retained member/context. The outer form still describes the original native tab. No native action is automatically triggered and no server compatibility is claimed by this release.

Run offline checks with:

```powershell
node prototypes/wip/cco-inline-loading/test-cases-trial.cjs
node prototypes/wip/cco-inline-loading/test-probes.cjs
```

The Cases suite uses the supplied manager body with false tracking flags, but its grid, registry and response properties are synthetic. It checks contract rejection, state isolation, registration, refresh/switch/Stop cleanup, partial failure, abort, replacement ownership and report redaction. It is not Telerik or iMIS acceptance.

Verified locally on 22 September 2026: 16 Cases trial scenarios and all 70 existing probe scenarios passed in headless Edge. JavaScript syntax checks passed. No live iMIS request, commit, push or deployment was performed for this change.

The v0.6.1 follow-up passed all 19 Cases scenarios, including failed-report inventory retention, bounded pager capture/redaction and rejection of changed targets/nonempty references. Main probe and pager-capture syntax checks passed. The 70 general probe scenarios above were last run for v0.6.0; this follow-up changes Cases reporting and adds a separate capture helper.

Verified for v0.7.0 on 23 September 2026: all 30 Cases scenarios and all 70 general probe scenarios passed. A subsequent disposal guard was checked with both replacement scenarios, including the new pager replacement case (31 distinct Cases scenarios now covered). The guard prevents an owned parent from disposing a later native replacement child and reports incomplete cleanup requiring reload. Syntax checks passed. These checks use synthetic Telerik controls and do not establish real paging or server-state compatibility.

Verified for v0.7.1 on 23 September 2026: syntax checks, all 34 Cases scenarios and all 70 general probe scenarios passed. Three new Cases scenarios cover the change. The first adds the supplied native focus helper and an unrelated helper with a real slash after `}`; setup still initializes and neither helper runs. The other two put ambiguous syntax in the setup script, at top level and inside a `$create` argument list; both stop before creation and report the exact whole-script offset. Removing the helper filter or the nested-offset correction makes the matching scenario fail. The shared scanner is unchanged and still rejects ambiguous slashes. The earlier v0.5.1 diagnostic located its failure at offset 191 of the 197-character helper, the `//]]>` after `}`. The v0.7.0 report gave no location, so that helper is the likely cause but not a proven one.

## Cases grid diagnostic

The handover's next gate needs the actual Cases initialization contract. `gridDiagnostics()` is a read-only command: it makes no requests, invokes no initialization, submits no action and changes no DOM or form state. It does call the existing `$find` and `get_element` methods to check control attachment. The default selector is `#ste_container_ciAccountpagetabs #ste_container_Cases .RadGrid`; pass `{ selector: '...' }` to diagnose another uniquely identified grid.

1. **Native baseline:** reload the sandbox, with Easy Edit off, then select Cases normally. Paste the current `CCO-Inline-Probes.js` and run this before starting either probe:

   ```js
   copy(JSON.stringify(usCcoInline.gridDiagnostics(), null, 2));
   ```

   Send that report as **native Cases**. It reads scripts currently present in the live DOM. If Cases was rendered by a partial postback, its transient startup scripts may be absent; a missing descriptor does not establish that the server never emitted one. Observe one ordinary sort/page action separately and record whether the page navigates or updates in place. The diagnostic does not record requests or claim action success.

2. **Inserted comparison:** reload on another native tab, such as Overview. Paste the current script and use the [Probe B startup recipe](#probe-b--fetch-the-native-parent-page-tab-url) above. Then run:

   ```js
   const cases = usCcoInline.inspect('#ste_container_ciAccountpagetabs')
     .find(tab => tab.name === 'Cases');
   if (!cases) throw new Error('Cases tab is missing.');
   await usCcoInline.select(cases.index);
   copy(JSON.stringify(usCcoInline.gridDiagnostics(), null, 2));
   ```

   Send that report as **B-inserted Cases**. Its `rendering` must be `parent-inserted`. If it says `native-dom`, Cases was retained as the original native tab: run `await usCcoInline.refresh()` and repeat the diagnostic. Also inspect `usCcoInline.report()` for insertion failures.

The inserted diagnostic reads the full detached response for the current insertion, including startup blocks outside the extracted tab. That response stays in memory only while its inserted content is current. Successful replacement, native restoration and Stop release the previous source; failed requests keep the source associated with the content still visible. No second fetch is added to render timing. Reports are built only when requested. The command refuses diagnostics during loading/initialization or after the grid element has been replaced independently; refresh the tab to obtain matching source again. An in-place mutation of the same grid node is not detected: the source label explicitly refers to the original insertion response.

The report contains:

- `registered`, `attachedToCurrentElement` and `radGridTypeAvailable` separately. A stale registry object must not count as successful initialization.
- Related script indexes and line numbers, literal `$create` descriptors for exactly the grid ID, constructor/callback availability, property shapes and verified component-reference IDs. Unresolved reference strings are omitted and marked; it does not recursively claim to resolve those dependencies. Script indexes are zero-based; line numbers are one-based within the script block.
- Hidden input IDs within the grid's native iPart, with source/live counts. These are candidates for inspection; they are not a list of fields to copy or proof that all are required.
- Whole-document script resource paths/query-key names and exact URL presence in the live document. URL query values are omitted; tag presence does not establish successful execution, and whole-document resources are not all grid dependencies.

Parsing supports balanced calls of the form `$create(Dotted.Constructor, strictJSONProperties, namedEventsOrNull, JSONReferencesOrNull, $get('literalId'))`. Named events accept dotted identifiers and, from v0.5.2, the observed `window['literal'].Method` form (single or double quotes); computed expressions and inline functions remain unsupported. Availability lookup inspects data properties through the prototype chain without invoking accessors. Comments (including classic HTML line-comment wrappers), quoted strings and regex literal bodies are skipped. Division operators are recognized using the preceding expression context. Template literals, ambiguous slash immediately after a closing brace and malformed code still stop scanning explicitly; they are never evaluated. Scanner failures include the zero-based character offset and one-based line within the script. An unsupported target on an otherwise balanced `$create` call is reported independently, so unrelated outer initialization does not stop the scan before a later Cases descriptor. This limited scanner is not a full JavaScript parser.

A script may contain both a recognized descriptor and an unsupported region; inspect `unsupportedScripts`, `properties.supported`, `eventsSupported` and `referencesSupported` before drawing conclusions. This is an initialization inventory, not an executable reconstruction. A descriptor outside matching script blocks or using another creation mechanism can be missed.

Arbitrary property values, member rows, input/state values, cookies, tokens and raw script text are excluded. Property names, types and verified DOM/control identifiers remain visible. Literal property objects are bounded to eight levels and 100 fields per object; arrays report only length. Use the reported script index/line to inspect any required exact settings locally before sharing a narrowly scoped follow-up snippet.

The user's [v0.5.0 native Cases baseline](research/native-cco-handover/evidence/native-cases-grid-baseline.json) confirms `registered: true`, `attachedToCurrentElement: true` and the RadGrid constructor's availability. It identifies `Cases_ResultsGrid_HiddenKeyField1` and `Cases_ResultsGrid_Grid1_ClientState` under the full parent CCO ID prefix. Their presence is not evidence that both should be copied. Related scripts 16 (197 characters) and 37 (24,266 characters) both stopped on the old scanner's combined template/regex/division error; no raw script body was supplied, so the exact trigger remains unknown. `insideSource: true` here refers to the whole live document, not the grid's iPart.

The user's subsequent [v0.5.1 report](research/native-cco-handover/evidence/native-cases-grid-descriptor-v0.5.1.json) locates one `Telerik.Web.UI.RadGrid` descriptor in script 37, line 52. Its properties parse as strict JSON; `ClientID`, `_masterClientID` and `clientStateFieldID` point to existing native elements. `UniqueID` is a different, dollar-separated string with zero DOM matches; that alone does not indicate a missing element, since the same report confirms successful native registration and attachment. The descriptor reports supported empty component references, but `eventsSupported: false` with no event details. Script 16 still stops on an ambiguous slash after a closing brace at offset 191, line 3. Its actual source is not yet supplied.

The property inventory includes `_clientKeyValues` with six indexed `code_CaseNum` field shapes, plus a string `_gridTableViewsData`. Do not request or export the full property object to inspect callbacks: it can include member row/key values. The diagnostic deliberately omitted those values.

**Callback capture received:** the user ran [Capture-Cases-Callbacks.js](Capture-Cases-Callbacks.js). The [preserved result](research/native-cco-handover/evidence/native-cases-callback-source.json) shows `gridCreated`, `rowCreated`, `rowDeselected` and `rowSelected` referencing `OnGridCreated`, `OnRowCreated`, `OnRowDeselected` and `OnRowSelected` on the same `window['<actualGridId>_jsmanager']` object. They are static member references, not inline functions. `referencesSource` is `null`, but that fourth `$create` argument does not describe the manager dependency in the event argument. The subsequent manager capture supplies its constructor and setup, described in the trial above.

The supplied short script only finds `<actualGridId>_ctl00` and calls `table.focus()` when it exists. It does not create either the grid or its manager. The normalized 197-character script passes the local v0.5.1/v0.5.2 scanner, so the earlier offset-191 failure is not reproduced from the supplied source; no speculative scanner change was made for it. The exact focus source and callback expressions are now regression fixtures. v0.5.2 changes event-reference recognition and availability lookup only.

**Manager capture completed:** [Capture-Cases-Manager.js](Capture-Cases-Manager.js) was run on the same native Cases page with the earlier probe already installed. Its preserved result is linked above; no repeat capture is currently required. The helper derives the manager name from this verified Cases convention and requires a native registered grid attached to the current element.

The manager capture reports field names/types (not values), source for the four event methods and available lifecycle/other methods, and inline source lines mentioning the exact manager name. It follows data-property descriptors through prototypes without invoking getters. It calls no manager method, initializes nothing and makes no requests. Source is exact code and can include configuration literals. It omits complete grid-descriptor/page-state lines, including `_clientKeyValues` and `_gridTableViewsData`. The limits are 24 selected method names, 8,000 characters per method, 18,000 total method characters, 20 startup lines, 2,500 characters per startup line and 8,000 total startup characters; omissions are reported. These bounds avoid copying a whole page or serializing the live manager object.

The retained callback capture uses the freshly diagnosed script index and line, skips the strict-JSON properties entirely, verifies their `ClientID` locally, and isolates only the event and empty-reference arguments ending at the exact grid target. It also includes unsupported related inline helper blocks of at most 300 characters (the observed one is 197). Unlike the redacted inventory, this is **exact bounded callback/helper code** for manual inspection. It reads no input values, executes no captured code, makes no requests, installs no handlers and does not start B. It rejects inserted-mode source, changed target boundaries, ambiguous matches, nonempty references and callback regions exceeding its 5,000-character search bound. Arbitrary property objects and unrelated later startup code are excluded.

Local v0.5.1 checks cover slash/comment handling, fake descriptor text inside regex, unrelated unsupported targets, failure locations and the existing diagnostic lifecycle/redaction cases. Separate callback-capture tests cover exact inline events/helper extraction, omitted row properties, no source execution/requests and rejected inserted/changed targets. These checks are synthetic; the captured source still needs live review.

Still pending: a live B-inserted initialization/cleanup report, any additional dependencies revealed by that run, and a genuine sort/page operation that works twice while preserving the surrounding page and correct member/context. The initial native manager must not be reused or overwritten as an assumed manager for newly inserted content. Do not attempt a general script replay or merge outer WebForms state to pass those gates.

## Initialisation and Query Template refresh

The probe recognises the same limited `simplePaginate` initializer pattern as the shared Query Template refresher. The pagination plugin must already be available in the parent. It also asks the existing UnionSuite filters, actions, task rows, banners and action menus to rescan. Set `pagination: false` for an insertion-only comparison when diagnosing an unsupported initializer.

As of v0.3.2, pagination scripts whose target is absent from the extracted source are skipped and listed under `paginationSkipped`, with the target ID and reason (`absent-from-response` or `outside-extracted-content`). This does not imply an empty query: it records exactly what the fetched markup contained. A target present in the source but missing after insertion is still an error. Each pagination script, theme owner and custom initializer runs independently; errors are collected in `initializationErrors` and still produce `inserted-initialization-incomplete`.

Fetched scripts are not executed. Head styles are not imported, and fragment styles, nested frames and hidden inputs are removed. The opt-in Cases trial restores only its validated grid and optional pager client-state fields as described above. Inline event attributes remain for testing existing handlers, which may depend on missing scripts. Relative `href`/`src`/`action`/`poster` URLs are resolved against the fetched document; CSS URLs and `srcset` are not rewritten. These restrictions keep the comparison observable without pretending to reproduce a WebForms page lifecycle.

For a known, specific custom control, supply `initialize(container, context)` to either start method. It may return a cleanup function. `context` contains `mode`, `index`, source `url` and an abort `signal`; respect that signal for asynchronous work. A page-wide `Sys.Application.load`, arbitrary script evaluation or replacing outer hidden state is not an initializer strategy provided by this probe.

The existing automatic popup-close `origin-report` refresh still uses the outer page URL. That may contain the **original native tab selection**, so it is not automatically compatible with the injected tab. Test the source-aware command explicitly:

```js
await usCcoInline.refreshQueryTemplate('#ste_container_ciTasks');
// Equivalent: UnionSuiteRefresh.queryTemplate(selector, { url: usCcoInline.currentUrl })
```

This calls the installed shared refresher with the loaded tab's source URL. It does not change the production popup action definitions. Test popup opening/closing and this explicit refresh separately; integrating the correct source into automatic close refresh is a later step.

## Live comparison and open decisions

### Probe A observation — 22 September 2026

The user ran Probe A (`startChild`) against Account Page Staff and reports that it feels much faster than the custom iframe iPart. The pasted console output confirms automatic discovery of `ste_container_ciAccountpagetabs`, the Dynamic CCO configuration, primary folder enumeration without fallback, and all 15 native-tab-to-DVK mappings. About was the original native tab. Probe B has not been tested in this observation.

The user's expanded report supplied these individual elapsed times (fetch, extraction and attempted initialization; not an independent paint measurement or controlled comparison):

| Tab | Result | Elapsed |
| --- | --- | --- |
| Overview | Inserted; pagination target not found | 594 ms |
| Notes and Interactions | Inserted; three RadGrids reported | 966 ms |
| Preferences | Inserted, across three visits | 329, 307, 211 ms |
| Finance | Inserted; one pagination initializer; nested RadTabStrip/MultiPage reported | 2,907 ms |
| Security | Rejected by the old password-input heuristic | No timing returned |

All native component registry lookups in the returned `existingComponentIds` lists were empty. Insertion is confirmed; grid sorting/paging, nested tabs, native postbacks, popup saves and editable controls have not been verified by this report.

Probe v0.3.1 removes the overly broad password-input sign-in check: a Security iPart may legitimately contain passwords. Native `input.SignInButton`, rejected redirects and missing content shells remain independent checks. Local tests cover both legitimate password content and a native sign-in response. Overview's supplied error was `Pagination target: expected one match, found 0.` Probe v0.3.2 distinguishes absent source targets from insertion losses and continues independent initializers.

The user's subsequent v0.3.2 report confirms 12 successful insertions across 10 distinct tabs, all with empty `initializationErrors`:

| Tab | Elapsed across reported visits |
| --- | --- |
| Overview | 565, 282 ms |
| Finance | 3,199, 2,639 ms |
| Notes and Interactions | 988 ms |
| Preferences | 329 ms |
| Security | 607 ms |
| Alerts | 755 ms |
| Participation | 1,727 ms |
| Cases | 462 ms |
| Collective Agreements | 484 ms |
| Engagement | 1,133 ms |

Overview skips two recognized pagination targets, `#fe42a1d4c9` and `#1002b7d8e8`, both with reason `absent-from-response`. The probe found neither target anywhere in the parsed fetched document; this is not a target removed during insertion. The report does not explain why iMIS emitted those initializers without their targets. Finance initializes one supported pagination target on each visit; the remaining tabs initialize none.

Security now passes the sign-in check and inserts without a reported initialization error. Its inventory contains no `.ContentItemContainer` wrappers or recognized native controls, so the report alone does not establish that the expected security UI is present or functional.

The second report still contains no evidence of working native grid paging/sorting, nested Finance tabs or editable forms. `existingComponentIds` is sampled **before** inserting the fragment; its empty lists are not a check of the registry after insertion. Native controls and component initializer counts are markup inventories, not successful control creation counts. A subsequent user-run check confirms `$find` is available but all three Notes and Interactions grids have `registered: false` and `attachedToCurrentElement: false`. Their markup is present without registered native client instances. v0.4.0 changes identity discovery only; it does not restore those controls' initialization or server lifecycle. The subsequent Probe B report is recorded below.

Potential speed contributors: Probe A does not start another iframe document or replay its scripts; the expanded reports count 27–33 document scripts not replayed. The custom iPart's maintained `src/frames.js` also waits 1,200 ms before revealing newly presented frame content. These are code/log observations, not a measured attribution of the reported speed difference. The current priority is control compatibility on the fast path; this result does not establish a need for a SQL discovery alternative.

### Probe B observation — 22 September 2026

After the caption-based startup instructions, the user supplied a parent-mode report with six successful insertions and no reported `initializationErrors`. These elapsed values can be compared descriptively with the previous A run; they are not a controlled benchmark or paint measurements:

| Tab | Probe A, earlier run | Probe B |
| --- | --- | --- |
| Preferences | 329 ms | 628 ms |
| Finance | 3,199, 2,639 ms | 3,008 ms |
| About | No fetched result supplied | 1,287 ms |
| Overview | 565, 282 ms | 836 ms |
| Cases | 462 ms | 600 ms |
| History | No result supplied | 1,055 ms |

The source-selection checks passed for all six requested tabs. Preferences, Finance, Overview and Cases report the same iPart wrapper IDs as their A counterparts. The native control IDs differ: A's Finance controls begin `ctl00_TemplateBody_Transactions_`, whereas B's begin `ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Transactions_`. Cases shows the same change to the parent CCO naming scope. About and History also report grids within that parent scope. This confirms a material rendering-context difference; it does not establish that the unchanged outer form state matches the fetched controls.

Finance initializes one recognized pagination target in B. Overview skips the same two targets, `#fe42a1d4c9` and `#1002b7d8e8`, as `absent-from-response`, showing that their absence also occurs in parent rendering. B inventories 41–49 document script elements, three script blocks matching initializer patterns, and nine head styles; those script/style counts are not executed initializer counts. The four directly comparable tabs each contain 14–16 more document scripts than A. Full-page work is a plausible source of overhead, but this report does not separate server rendering, transfer, extraction and initialization time.

`existingComponentIds` remains empty before insertion for all six B entries. No post-insertion registry check or working grid/nested-tab action has been supplied for B. Both modes still remove fetched scripts and hidden state. B is the preferred next experiment for native-control initialization because its rendered IDs retain the parent CCO scope; A remains the faster observed reference for the supported HTML/Query Template path. The next meaningful compatibility test is scoped native control creation followed by a real grid action, with separate verification of server request state. General script replay or copying the fetched page's ViewState into the live form is not an established solution.

Run both modes against the same native CCO, starting from a fresh page for each full comparison. Record:

1. Whether the expected page and member data appear, with no repeated outer banner.
2. Whether Query Template pagination, search/filter controls, task links and explicit source-aware refresh work.
3. Whether native grid Find/sorting/paging and editable panels work. Native postbacks can reload the page or fail because the outer form state was not reconciled; record that result rather than treating visual success as control compatibility.
4. Which popup helpers work from the inserted context, and what happens on Save versus Cancel. The probe does not undo data saved through those controls.
5. Differences in rendered IDs, missing CSS, component initializers and request time between modes.

Placement discovery from the parent DVK is now implemented through the supplied Document response contract; matching multiple configured CCOs to their live DOM containers still requires explicit selection. Unsaved form tracking, native server selection synchronization, general WebForms/Telerik disposal/recreation, source-aware automatic popup refresh, history, caching/preloading, nested folder resolution and public-role preview permissions remain open. The initial native tab is restored from its original DOM; injected tabs do not retain edits when switching away. Reload after a session that exercised native forms, postbacks or custom initializers; DOM restoration cannot roll back their global/server effects.

## Evidence and related work

- [22 September handover and evidence](research/native-cco-handover/README.md): dated findings, full A/B report copies and ordered next steps for the Cases grid in B.
- [Consolidated CCO findings](research/custom-iframe-ipart/research/Findings-and-Decisions.md): confirmed ContentItem lookup, native route discrepancy and preview route.
- [Earlier retained-frame trial](research/custom-iframe-ipart/examples/CCO-Retained-Tabs-Trial.md): native-tab capture and iframe experiment. These new probes do not modify it.
- [Shared Query Template refresh](../../../Theme/UnionSuite/zUnionSuite.js): known pagination and theme reinitialisation pattern.
- [Telerik tab-selection event](https://www.telerik.com/products/aspnet-ajax/documentation/controls/tabstrip/client-side-programming/events/onclienttabselecting): a potential production interception point. These probes use capture interception, including already-selected links, without changing Telerik's server state.
- [DOMParser behaviour](https://developer.mozilla.org/en-US/docs/Web/API/DOMParser/parseFromString): parsed documents are separate from the active DOM; insertion still requires deliberate treatment of scripts/handlers.

No installation guide rebuild is needed: no implemented theme behaviour, author class, template or installation instruction is changed by these WIP console experiments.
