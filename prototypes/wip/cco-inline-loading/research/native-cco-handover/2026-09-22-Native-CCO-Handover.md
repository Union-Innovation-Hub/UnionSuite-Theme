# Native CCO inline loading — handover and next steps

> Historical snapshot. Continue from the [23 September desktop handover](2026-09-23-Native-CCO-Handover.md). Latest live 0.7.0 failed in parsing; current 0.7.1 source is untested. The restart commands and current-status statements below describe 22 September's earlier v0.4.0 state.

Date: 22 September 2026. Current console probe: **0.4.0-probe**. Read the [findings](2026-09-22-Native-CCO-Findings.md) and [preserved evidence](evidence/README.md) alongside this report.

## Start here

The user wants fast tab switching inside the existing native iMIS CCO, loading each tab in the background and inserting it on the page. Both A (child ContentPreview) and B (normal parent-page selected tab) now have successful live insertion reports. A feels faster to the user; B produces control IDs scoped to the parent CCO and is the recommended next foundation for a native-control experiment.

**The immediate task is to investigate the single Cases grid in Probe B.** Establish its emitted initialization and dependencies, then attempt a narrowly scoped client-control initialization and a paging/sorting request. Do not restart endpoint discovery or rewrite the custom iframe iPart. Do not declare the inline approach ready because content renders or `initializationErrors` is empty.

This is a recommendation for further work, not an implemented native-control fix. Neither B grid registration nor a working native grid action has yet been supplied. The last user action was sending a six-tab B report and requesting this documentation.

## Files and ownership

From repository root `C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts`:

| File | Purpose |
| --- | --- |
| [CCO-Inline-Probes.js](../../CCO-Inline-Probes.js) | Maintained single-paste console probe; both modes and discovery |
| [Probe README](../../README.md) | Current WIP run instructions, limits and observations |
| [test-probes.cjs](../../test-probes.cjs) | Synthetic Edge regression scenarios |
| [Research findings](../custom-iframe-ipart/research/Findings-and-Decisions.md) | Earlier native/custom-CCO research plus verified identity/routing corrections |
| [Custom iPart README](../custom-iframe-ipart/README.md) and [live verification](../custom-iframe-ipart/Live-Verification.md) | Separate retained-frame implementation and its remaining gates |
| [Shared refresh source](../../../../../Theme/UnionSuite/zUnionSuite.js) | Supported Query Template/native IQA refresh helpers |
| Existing frame implementation (archived locally: `archive/Custom CCO iPart/src/frames.js`) | Separate iframe lifecycle and 1,200 ms visible-frame reveal delay |

Keep implementation changes in `prototypes/wip/cco-inline-loading/` while experimenting. Do not duplicate the probe into this handover folder. The old custom-iPart prompt to build its initial vertical slice is historical; that implementation exists and this work explores a different loading approach.

Current production theme and canonical usage-guide sources are untouched. No guide rebuild is required for this documentation snapshot. If a future change becomes supported theme behaviour, promote it into its proper owner and update/build the canonical guide then. Preserve underscores in iMIS paths. No commits/pushes without explicit approval of staged changes; never add Co-Authored-By trailers.

## What is ready and what remains unknown

| Item | Status |
| --- | --- |
| Parent Document lookup with DVK + status 40 | Verified by user response and locally decoded export/blob |
| Paired ContentItem lookup | User-verified; either key alone returns 404 |
| Dynamic CCO primary folder and 15 caption/DVK mappings | Confirmed in user-run A discovery output |
| Automatic canonical-path discovery in v0.4.0 | Locally tested; prior inspector evidence supports the route; a live result from this new implementation is still needed |
| A insertion | 12 successful loads across 10 tabs in the latest report |
| B caption routing and insertion | Six successful parent-mode loads in the latest report |
| A native Notes grid instances | Confirmed absent after insertion, despite `$find` being available |
| B native grid instances/actions | Not yet verified after insertion |
| Native server state, validation, saves, automatic popup refresh | Unresolved |
| Local regression suite | Last run: 53 scenarios passed; not live iMIS validation |
| Deployment / release | None performed or approved by this work |

## Exact restart commands

Use the outer browser console on the sandbox Account Page Staff page, with the intended member/context selected and Easy Edit off. Start on a native tab other than Cases, such as Overview, for the next Cases test. Reload for a clean test, then paste the complete maintained `CCO-Inline-Probes.js`. Pasting installs the API but starts no requests or interception.

Check the loaded version and native tabs:

```js
usCcoInline.version; // expected: '0.4.0-probe'
usCcoInline.inspect('#ste_container_ciAccountpagetabs');
```

### Optional: verify automatic key discovery separately

```js
copy(JSON.stringify(await usCcoInline.keys(), null, 2));
```

Expected identities:

```text
parentDvk / contentKey: bc60a070-2cb9-4bb7-82ba-11b450bf958a
contentItemKey:         b511e4d0-55d8-4a38-b20d-f26d82b1af72
```

Also check `pagePath`, `identitySource` and the 15 `childPages`. `keys()` does fresh API reads and leaves native navigation untouched. It is not required to run B. If automatic discovery fails, record its canonical URL, native root globals, attempted content path and response shape; do not treat a B success as verification of this separate lookup. Existing explicit-DVK discovery remains available:

```js
await usCcoInline.discover({
  parentDvk: 'bc60a070-2cb9-4bb7-82ba-11b450bf958a'
});
```

### Start B using verified caption routing

This parameter is verified for this Account Page Staff CCO. Do not carry it to a different placement.

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

The current `ID`, WebsiteKey and other query context stay intact. `URLSearchParams` encodes spaces. The probe requires all other tab destinations at startup; this recipe builds them from the native captions, then validates the requested selection on every fetched response. No guessed server POST or global script replay occurs.

Load Cases (index 8 in the current 15-tab list; verify `inspect()` first if the page changes):

```js
await usCcoInline.select(8);
copy(JSON.stringify(usCcoInline.report(), null, 2));
```

If Cases was the initially selected native tab, selecting it restores retained native content instead of fetching. With Cases selected, use `await usCcoInline.refresh()` to force a B fetch. Do not mistake a retained working native grid for a successfully initialized transplanted grid.

### Inspect the inserted Cases grid without submitting it

```js
copy(JSON.stringify((() => {
  const grids = [...document.querySelectorAll(
    '#ste_container_ciAccountpagetabs .us-cco-inline-probe #ste_container_Cases .RadGrid'
  )];
  if (grids.length !== 1) {
    throw new Error('Expected exactly one inserted Cases grid; found ' + grids.length);
  }
  const element = grids[0];
  const control = typeof window.$find === 'function'
    ? window.$find(element.id)
    : null;
  return {
    registryAvailable: typeof window.$find === 'function',
    radGridTypeAvailable: typeof window.Telerik?.Web?.UI?.RadGrid === 'function',
    id: element.id,
    registered: Boolean(control),
    attachedToCurrentElement: control?.get_element?.() === element
  };
})(), null, 2));
```

Expected ID from the latest B report:

```text
ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1
```

This command records readiness only; it does not create the control or prove its server operations work. `radGridTypeAvailable: true` means a constructor is present, not that the specific grid has been initialized.

### Capture, refresh and stop

```js
copy(JSON.stringify(usCcoInline.report(), null, 2));
usCcoInline.currentUrl; // fetched source URL for the visible injected tab
await usCcoInline.refresh(); // refetch current tab
usCcoInline.stop(); // restore initial native nodes and remove interception
```

Copy the report before stopping. Reload after exercising native forms/postbacks/custom initializers: DOM restoration cannot reverse global handlers or server changes. There is no active-tab edit retention in the inline experiment.

For a supported Query Template inside the selected tab, use its actual container ID:

```js
await usCcoInline.refreshQueryTemplate('#ste_container_ciTasks');
```

That example applies only when the Tasks Query Template exists. It supplies the injected source URL to the shared refresher. Automatic popup-close `origin-report` refresh is a separate unresolved integration.

### A reference run

Use a fresh reload/paste for a clean comparison:

```js
await usCcoInline.startChild({
  rootSelector: '#ste_container_ciAccountpagetabs'
});
```

If diagnosing automatic discovery independently, the previously working explicit form is:

```js
await usCcoInline.startChild({
  parentDvk: 'bc60a070-2cb9-4bb7-82ba-11b450bf958a',
  rootSelector: '#ste_container_ciAccountpagetabs'
});
```

Do not start both modes concurrently; stop or reload between them.

## Next investigation, in order

### 1. Establish a real native Cases baseline

On a fresh, non-intercepted page, select Cases normally. Record the live grid ID, `$find` result, backing element, native outer CCO IDs and one ordinary sort/page action. Capture the request destination, event target/argument, whether it is full or partial postback, response kind and visible result. A control's `ctl01` prefix is an observation from one render, not an identifier to manufacture.

Then repeat the inserted-grid readiness check under B. Keep member, website, query/filter context and intended role consistent. Save only diagnostic metadata and needed code/configuration snippets; do not put cookies, verification tokens, complete ViewState or member result HTML into shared reports.

Deliverable: a native-versus-inserted baseline proving what is missing, with no write/save operation needed.

### 2. Inspect the emitted initialization contract

Inspect the full HTML response at `usCcoInline.currentUrl`, especially startup script blocks outside the selected `.rmpView`. Identify the actual descriptor or `$create` call for the Cases grid, its properties/events/references, dependent control descriptors, client-state input IDs, validators and required script resources. Confirm the precise constructor/callbacks exist in the parent and that referenced DOM elements survived extraction.

The current probe retains only script counts in `report()`. Its `initialize(container, context)` callback receives the inserted host, mode/index/source URL/abort signal, but **does not receive the parsed source document or original script descriptors**. Extend the WIP diagnostic path deliberately if that evidence is needed. A separate read-only source fetch is acceptable for diagnosis, but do not quietly add a second fetch to every timed render.

Do not infer that `componentInitializers: 3` means there are three controls to initialize: it counts matching script blocks across the entire document. Whole-page startup can include unrelated outer controls and page-wide setup. Merely raising `Sys.Application.load` does not create absent descriptors.

Deliverable: a bounded dependency/initialization inventory for one grid, and an explicit distinction between supported parsing and unsupported script patterns.

### 3. Attempt one scoped initialization and cleanup

Only after inspecting the actual descriptor, implement a Cases-only trial. Create only the required grid/dependencies, with explicit validation of target IDs and referenced elements. Do not evaluate whole fetched documents or rerun outer ScriptManager/CCO setup. Keep fetched outer `__VIEWSTATE`/`__EVENTVALIDATION` separate from any proven per-control client-state dependency; copying all hidden inputs is not a demonstrated solution.

Use the existing custom initializer/cleanup seam or a narrowly defined extension. Any owned component/handler must be disposed when replaced, refreshed, stopped or cancelled. Avoid disposing retained initial native components or registering new instances over stale objects with the same ID. Respect stale-request/abort guards.

Deliverable: `$find(actualGridId)` returns an object whose `get_element()` is exactly the current inserted element; refresh/switch/stop leave no duplicate registration or stale references. Add focused synthetic lifecycle tests for whatever behaviour is implemented; a fake registry alone does not pass live acceptance.

### 4. Prove one real grid operation and server-state compatibility

Try a non-saving sort/page action. Record the request/response and inspect the result. A created client object is only the first gate: the original parent form may still describe another selected tab, so ASP.NET UniqueIDs, update panels, ViewState, event validation and native CCO selection need separate evidence.

If the action fails, distinguish missing client dependencies from rejected/misdirected server events. Preserve the original content/context during failures. Do not mask a failure by reporting a full-page navigation as successful inline operation. Investigate an actual supported native partial-rendering mechanism if one is exposed; none has yet been proven by this research.

Deliverable: one genuine grid action operates on the correct tab/member, returns the expected data, keeps the surrounding page in place, and leaves the control usable for another action. Otherwise document the precise blocker and request/state evidence.

### 5. Expand only after that gate passes

Test Finance's nested tabs, the three Notes grids, editable Preferences/Security controls, validation, popup helpers and source-aware refresh. For popup actions, test Save and Cancel separately; configured close refresh runs on both. Verify actual Security UI visually because its inventory had no iPart wrappers. Compare required CSS/resources rather than importing all fetched page styles.

Then cover repeated switching/refresh, context changes, multiple CCOs, ID collisions, cleanup, keyboard/focus behaviour, unsaved input, intended roles and child preview-route publication suitability. Decide how injected edits, history, caching and preloading should work before making deployment claims.

Performance comparisons should use equivalent functioning controls, fresh A/B runs, repeated cold/warm samples, request counts and separate network/render/initialization measurements. Do not attribute an apparent speedup solely to the 1,200 ms iframe reveal delay without measurement.

If general inline native-control compatibility proves impractical, retain A for explicitly supported HTML/Query Template content and retain the iframe approach as an available native-lifecycle option. That is a future decision, not a fallback silently enabled by the current probes. SQL discovery optimization is not the current blocker.

## Validation and delivery state

Last implementation checks, completed during this investigation:

```powershell
node --check prototypes/wip/cco-inline-loading/CCO-Inline-Probes.js
node prototypes/wip/cco-inline-loading/test-probes.cjs
```

Both passed: 53 synthetic scenarios in total, including 17 automatic-identity checks. The test runner optionally accepts a scenario-name substring. It depends on the local Playwright installation in `.tmp-iqa-integration/node_modules/playwright` and installed Edge; restore that dependency explicitly if absent rather than presenting a failed setup as a code regression.

This handover is documentation/evidence work only. Tests were not rerun solely to create the documents. New documentation links, evidence JSON and the displayed timing/count summaries are checked locally. The maintained WIP JavaScript is not copied, deployed or committed by the handover.

## Resume prompt

```text
Continue the native CCO inline-loading investigation in Custom CCO iPart/handover.
Read the dated handover and findings, then the maintained probe under
prototypes/wip/cco-inline-loading (current version 0.4.0-probe).

Both A and B insert content successfully. A's three Notes grids were confirmed
unregistered. B renders parent-scoped control IDs but its native lifecycle is
unverified. Start with the single Cases grid in B: compare a native baseline,
inspect its actual emitted initialization/dependencies, build a narrow scoped
initializer/disposer if supported, and test one real sort/page request.

Keep client registration and server postback-state compatibility as separate
gates. Do not replay whole page scripts, overwrite global WebForms state, redo
the established API discovery, or change the existing iframe iPart by default.
Keep work in the WIP probe, preserve current member/website context, record live
evidence separately from synthetic tests, and do not commit or deploy without
explicit authorization.
```
