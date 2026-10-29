# Native CCO tab switching — implementation guide

Companion to the [approved specification](README.md). The spec says **what** to
build; this guide says **how**. It records what the live trial learned, what
the trial hardcoded and must be generalized, and how the feature fits into the
UnionSuite theme. Read [`AGENTS.md`](../../../AGENTS.md) first: it governs
stylesheet ownership, formatting, the usage-guide workflow and commits.

## Reference code

The working reference is the live-verified trial:

- [`Native-Partial-Postback-Trial.js`](../../wip/cco-inline-loading/Native-Partial-Postback-Trial.js)
  (v0.6.x). It passed the full live checklist on the sandbox account page,
  including nested CCOs.
- [`test-partial-postback-trial.cjs`](../../wip/cco-inline-loading/test-partial-postback-trial.cjs):
  12 synthetic Playwright scenarios with doubles for PageRequestManager,
  `Sys.Application` and `$create`, run against the real `99-Orion.css` and
  `zUnionSuite.css`.
- The [WIP README](../../wip/cco-inline-loading/README.md): version history,
  every live result, and the reasons behind each change.
- `research/native-cco-handover/`: dated findings and user-supplied evidence.

Reuse the trial's logic, but **do not paste it in as the theme feature**. It is
a console experiment. It hardcodes the account page, uses inline styles (see
Loading states), keeps a diagnostic log and exposes test-only APIs. Rewrite it
as a theme section that follows the conventions below.

## Where the code goes

| Part | Owner | Notes |
| --- | --- | --- |
| Behaviour | `Theme/UnionSuite/zUnionSuite.js`, new section `/* US-CCO-SWITCH:START — ... */` … `/* US-CCO-SWITCH:END */` | Place it after `US-TAB-BUSY` and `US-CCO-STICKY-TABS`. Guard it with `if (window.UnionSuiteCcoSwitch) return;` like the other sections. |
| Loading styles | `Theme/UnionSuite/zUnionSuite.css`, new `US-CCO-SWITCH` section | Two-space indentation, one declaration per line (AGENTS). Reuse the existing `section-loader-spinning-circles`, `us-tab-loading-spinner` and `us-iqa-refresh-status` classes. |
| Dark mode | `Theme/UnionSuite/zzDarkMode.css` | Only the cover surface, if `--bg-surface` does not already follow dark mode. |
| Site-wide setting | `Theme/UnionSuite-Client/Config.js` | Add `window.UnionSuiteCcoSwitchConfig = { ...window.UnionSuiteCcoSwitchConfig, enabled: true };` with a comment in the file's existing style. |
| Behaviour tests | `tools/test-cco-switch.cjs` | Follow the existing `tools/test-*.cjs`: Playwright from `../.tmp-iqa-integration/node_modules/playwright`, `channel: 'msedge'`, headless, requests intercepted. Port the trial's fixtures. |
| Guide | `Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html` | A section near the native tabs and `EmbeddedCCO` sections, plus installation-table entries for `Config.js`. Rebuild and check (below). |

Public API: `window.UnionSuiteCcoSwitch` with `refresh()`, `report()`, `enable()`
and `disable()`. Nothing else is global.

## Identifying a CCO

The trial knew one CCO's IDs. The theme must recognise any CCO, and must
**never** intercept a tab strip that is not a CCO, such as the Address iPart's
own tabs.

- A native CCO renders
  `div.cco.tabs-wrapper > div[id$="_radTab_Top"].RadTabStrip|.RadTabStripVertical`
  plus a sibling `div[id$="_radPage"].RadMultiPage`. Both share an ID prefix,
  such as `ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_`.
  Require all three: the `.cco` wrapper as their direct parent, the strip, and
  the multipage with the same prefix.
- The page's startup script also creates the CCO's manager:
  `new Asi_Web_iParts_ContentCollectionOrganizer_ContentCollectionOrganizerDisplay('<prefix>radPage', ...)`
  in `window['<prefix>jsmanager']`. Use it as supporting evidence when present.
  For a nested CCO inserted by a switch it may be absent, because page-level
  statements are not replayed, so the structure check must be enough on its own.
- **Unverified:** real nested-CCO markup was not inspected directly. The trial
  paired `…radTab_Top` with `…radPage` and worked live. Confirm the nested CCO
  has the same `.cco` wrapper before relying on it, and inspect one Address tab
  strip to confirm it is excluded.
- Each view's value is the number in its `…_Page_<n>` ID. That is the tab's URL
  value (1-based), and matches the tab's position.

## Opt-outs and off switches

Check these at click time, in this order; if any applies, leave the click alone
so native behaviour runs:

1. **Session switch:** `sessionStorage['UnionSuiteCcoSwitch:disabled'] === '1'`,
   set by `disable()` and cleared by `enable()`.
2. **Site setting:** `window.UnionSuiteCcoSwitchConfig?.enabled === false`.
   Read it at click time, because the guide loads client `Config.js` with
   `defer`.
3. **Easy Edit:** `window.gIsEasyEditEnabled === true`, a native global in the
   page head.
4. **Styling opt-out:** the CCO or an ancestor has `us-report-no-styling`.
5. The strip is not a CCO (see above).

Either off switch turns the feature off; there is no precedence conflict.

## The switch, step by step

These steps follow the trial's `show()`; the trial function names are in brackets.

1. **Intercept** clicks with one capture-phase `click` listener on `document`
   (`onTabClick`). It runs before Telerik's handler, which would post back and
   redirect. Call `preventDefault()` and `stopImmediatePropagation()` only after
   deciding to handle the click.
2. **Queue** the click (spec, Concurrency). Keep one queued target; a newer click
   replaces it. The trial ignored clicks instead, so queueing is new work. A
   click is also queued while `prm.get_isInAsyncPostBack()` is true; run it on
   `endRequest`.
3. **Resolve the tab URL.** The URL is the current URL with the CCO's key
   parameter set to the tab value, with the hash removed (`tabUrl`). The key
   comes from, in order:
   - **Stored keys:** `localStorage['UnionSuiteCcoSwitch:keys']`, a JSON map of
     `pathname + '|' + strip ID` to `{ key, expires }`, with a 7-day expiry.
     Prune expired entries on read.
   - **The current URL:** after a native tab click, the redirect leaves the URL
     with that CCO's key, for example `?ID=…&b511e4d055d8=9#b511e4d055d8`.
     The fragment names the key of the last native click. A query parameter
     whose name is 12 lowercase hex characters (`/^[0-9a-f]{12}$/`) and whose
     value equals the displayed view's value is a strong candidate. Only take
     it when exactly one parameter matches; otherwise discover.
   - **Discovery** (`discoverTabUrl`): one background async postback of the tab
     strip, like a native click. Send a POST to `form.action` with every string
     field of `new FormData(form)`, then set:
     - `ctl01$ScriptManager1` = `ctl01$ScriptManager1|<uniqueId>`;
     - `__EVENTTARGET` = `<uniqueId>`;
     - `__EVENTARGUMENT` = `{"type":0,"index":"<0-based>"}`;
     - `<stripId>_ClientState` = `{"selectedIndexes":["<index>"],"logEntries":[],"scrollState":{}}`;
     - `__ASYNCPOST` = `true`.

     Headers: `X-MicrosoftAjax: Delta=true`, `X-Requested-With: XMLHttpRequest`,
     `Content-Type: application/x-www-form-urlencoded; charset=utf-8`. The
     delta's `pageRedirect` entry holds the URL-encoded tab URL. The key is the
     parameter whose value equals the tab value and differs from the current URL.
     - **Unique ID:** read it from the strip component's `_postBackReference`
       (`__doPostBack('<uniqueId>','arguments')`). Fallback:
       `prefix.replaceAll('_', '$') + 'radTab_Top'`. The strip's own segment
       keeps its underscore: `…$ciAccountpagetabs$radTab_Top`, not `radTab$Top`.
       A test caught this.
   - **ScriptManager ID:** don't hardcode `ctl01$ScriptManager1`. Read it from
     the page's `PageRequestManager._initialize('<id>', …)` call or `prm._scriptManagerID`.
4. **Fetch** the tab URL with `credentials: 'same-origin'`. Reject the response
   if `!response.ok`, if it redirected to a different path, or if it is a
   sign-in page (native marker `input.SignInButton`). Parse it with `DOMParser`.
   Require the form (`#aspnetForm`), the target view (same ID as the live view)
   and the `PageRequestManager._initialize(...)` arrays (`parseInitialize`).
5. **Leave the current view** (`releaseHandlers`, `disposeTree`):
   - Remove the handlers its initialization registered (step 8).
   - Dispose its components: call `prm._destroyTree(view)` when available, then
     dispose any `Sys.Application.getComponents()` whose element is still inside
     the view.
   - Replace its content with `<span class="Info">Loading...</span>` and add
     `rmpHidden`.
6. **Insert the new view:** use `document.importNode`, list its `<script>`
   elements for step 8 and remove `rmpHidden`. Imported scripts are inert, so
   they stay in place until step 8 runs them.
7. **Switch form state** (`switchFormState`):
   - Copy `__VIEWSTATE`, `__VIEWSTATEGENERATOR`, `__EVENTVALIDATION`,
     `__RequestVerificationToken` and `PageInstanceKey` from the fetched form.
     Update, add or remove each to match the fetched form; `__EVENTVALIDATION`
     was absent on both pages in the sandbox.
   - Set the switching CCO's `<stripId>_ClientState` as in step 3, and its
     `<multipageId>_ClientState` to `''`.
   - Set `form.action` to the fetched form's action, and **set
     `form._initialAction = form.action`**. Without this, PageRequestManager
     treats the next postback as going to another page.
   - Leave `ctl01_ScriptManager1_TSM` and `ctl01_StyleSheetManager1_TSSM` as
     they are. They describe the scripts and styles this browser has already
     loaded, so the server sends anything missing.
   - Register the fetched page's panels and controls (`registerPanels`):
     call `prm._updateControls(panels, async, postBack, timeout, true)` with the
     `_initialize` arrays. They use the ASP.NET 4 format: server ID then client ID,
     with `''` meaning derived, and a `t`/`f` children-as-triggers prefix on panel
     IDs. Verify that `prm._updatePanelIDs` matches afterwards; otherwise assign
     the six `_updatePanel*`, `_asyncPostBack*` and `_postBack*` arrays directly
     (the trial's verified fallback).
   - `history.replaceState(history.state, '', url)`.
8. **Initialize the view** in native order, tracking the handlers it registers
   (`tracking`):
   1. **View scripts** (`runViewScripts`): execute JavaScript-typed scripts only
      (`isJavaScript`); JSON and template blocks stay inert. Load external
      scripts that are not already present, and wait for them. Run each script
      **in place**: a live copy replaces the inert one, so `document.currentScript`
      and its neighbours are where the server put them. CloudToolz BeyondFormz
      finds its placeholder as `document.currentScript.previousElementSibling`;
      run from `head`, every form rendered off the page and its prefill flow
      received an empty form (8 October 2026). Capture inline errors with a
      temporary `window` `error` listener (`execute`). Do not wrap them in
      `try`, which would change function-declaration scope.
   2. **Grid managers** (`managerStatements`, `replayManagers`): page-level
      `window['<id>_jsmanager'] = new Ctor(…)` statements. Extract only the call,
      using balanced parentheses and quote tracking (`callEnd`). Replay those
      whose `<id>` element is in the view and outside a lister. Without this, the
      Notes tab's Email Communications grid failed in its `$create`.
   3. **`$create` blocks** (`createBlocks`, `replayCreates`): match
      `Sys.Application.add_init(function() { $create(…$get("<id>")); });` with a
      pattern that cannot run into the next block (`createPattern`). Replay those
      targeting elements in the view, outside listers, and not already registered.
   4. **Lister refreshes** (`refreshListers`, `nativePostBack`): for each
      `[id$="_ListerPanel"]` containing
      `input[id$="_ResultsGrid_RefreshButton"][name]` whose grid is not yet
      registered, call `__doPostBack(button.name, '')` and wait for `endRequest`.
      One refresh updates every lister on the tab, so re-check before each.
      These postbacks are **not** tracked: PageRequestManager disposes the
      controls in panels it replaces.
   - **Handler tracking:** while steps 1–3 run, temporarily wrap `add_load` on
     `Sys.Application` and `add_initializeRequest`, `add_beginRequest`,
     `add_pageLoading`, `add_pageLoaded` and `add_endRequest` on the
     PageRequestManager. Record the handlers, and remove them in step 5 when the
     view is left. **Why:** natively a tab's controls are never disposed without
     a reload, and at least one Finance-tab control leaves a load handler
     behind. It then threw during the next partial update (`_toggleActiveDescendantAttributes`),
     which stopped iMIS before `endRequest` and blocked every later postback.
   - **Missing `endRequest`:** if a page script throws while PageRequestManager
     completes an update, `endRequest` never fires. Treat 0.7 s of
     `!prm.get_isInAsyncPostBack()` after it started as finished-with-error, and
     time out after 15 s.
9. **Finish:** clear the loading state, then run the queued click, if any.

**Failure:** if a switch fails before step 5, restore the previous tab selection
and fall back to native navigation: `location.assign(url)`, or when there is no
URL (failed discovery), a native `__doPostBack(uniqueId, …)` with the strip's
client state set. After step 5 the page is already switched; fall back with
`location.assign(url)`. If a switch fails because a stored key was stale (the
fetched page lacks the view), delete that stored key before navigating.

## Loading states

Implement these in theme CSS, as the spec requires.

- **Tab:** in the trial's `indicate`, the clicked tab gets `aria-busy`
  immediately. After 150 ms it gets `data-us-tab-loading` and an appended
  `<span class="us-tab-loading-spinner" aria-hidden="true">`. The theme's
  existing tab CSS positions it. **Queued clicks** move `rtsSelected`,
  `aria-busy`, the marker and the spinner to the newest tab; the content cover
  stays.
- **Content cover:** set a `data-` attribute on the multipage while busy. It
  blocks pointer events (`pointer-events: none`) and gets `position: relative`,
  `isolation: isolate` and `min-height: 260px`. After 150 ms append an opaque
  cover: absolute, `inset: 0`, a high `z-index`, `background: var(--bg-surface)`.
  It holds `<span class="section-loader-spinning-circles">` with
  `display: block; position: sticky; top: min(180px, calc(50vh - 24px)); margin: 180px auto 0`.
  Sticky keeps it in view when the page is scrolled down to lower tabs.
- **Announcement:** a `role="status"` element with the theme's
  `us-iqa-refresh-status` class reads `Loading <tab caption>`.
- **Suppress, during the switch only:**
  - the theme's report-refresh overlays and their status:
    `.us-iqa-refresh-overlay`, `.us-iqa-find-overlay`, `.us-iqa-refresh-status`
    except the switch's own. `US-IQA-REFRESH-OVERLAY` reacts to the lister
    refresh button, which caused a double spinner;
  - native `[id$="_UpdateProgress1"]` images, using the theme's existing
    `data-us-iqa-progress-replaced` marker.

  Scope this with a root attribute such as `:root[data-us-cco-switching]`.
- **Why the trial used inline styles:** on the live page an injected `<style>`
  element did not apply (`styleElementsApply: false`; cause unknown, possibly a
  CSP). Theme CSS loads as a normal stylesheet, so this should not affect the
  feature. Verify it live, and never inject `<style>` elements.
- **Reduced motion and dark mode:** the shared spinner classes already handle
  reduced motion. Check the cover's surface colour in dark mode.

## Coordination with existing theme features

- **`US-TAB-BUSY`** shows the theme's tab spinner on a native tab postback. Its
  document capture listener sees the click first, but only records a pending
  tab and briefly wraps `form.submit`. That is harmless, because the switch
  prevents the native postback. The switch **owns its own tab indicator**,
  because the theme's handle is cleared by the switch's internal lister
  postbacks (`beginRequest` and `endRequest`). Check that the two never show at
  once.
- **`US-IQA-BUSY` / `US-IQA-REFRESH-OVERLAY`:** suppress them during a switch, as
  above. They must work normally for user actions afterwards.
- **`EmbeddedCCO`:** hides the outer tab strip, so there are no outer clicks, but
  nested CCOs inside must still switch. Include it in the tests.
- **`US-CCO-STICKY-TABS` (`us-cco-sticky-tabs`):** the strip may be sticky. The
  cover belongs on the multipage, not the strip. Check the combination.
- **`US-NATIVE-LOADERS`:** decorates RadWindow and RadAjax loading panels; no
  change is needed.
- **Full-postback iParts** (such as Communication Preferences Save) reload
  natively onto the displayed tab, because the form action and state already
  describe it. This is correct behaviour, not a bug.

## Back-forward cache and reloads

- `pageshow` with `event.persisted`: clear any busy or loading state and the
  queue. A page returned to with Back must be usable at once.
- The trial saw the loading cover lose its layout after a case link and Back.
  That used the trial's inline styles; the owner deferred it to themed CSS.
  Re-test it with the theme implementation.
- Reload lands on the displayed tab through `history.replaceState`; this passed
  live.

## Diagnostics

`report()` returns the trial's report shape, for support:

- per-switch timings, `fields`, `registration`, `scripts`, `managers`,
  `creates`, `listers`, `uninitialized`, `orphans`, `pageErrors`;
- request and response summaries (`deltaSummary`).

Never include ViewState, tokens, row data or URL values other than tab values.
Keep the log small, for example the last 20 switches. It stays in memory only.
The trial's `sessionStorage` report persistence was a console-script workaround;
don't carry it over.

## Tests

Port the trial's scenarios to `tools/test-cco-switch.cjs`, against the real
theme files (`99-Orion.css`, `zUnionSuite.css`, `zUnionSuite.js`) and the
client `Config.js`. Add scenarios for the new work:

- **Identification:** real CCOs are handled; a non-CCO tab strip (Address-like)
  and a `us-report-no-styling` CCO are not.
- **Off switches and opt-outs:** the site setting read at click time,
  including a late `Config.js`; the session switch; Easy Edit.
- **Queueing:** clicks during a switch and during a native postback; the latest
  wins; the spinner moves; the cover stays; clicking the loading or displayed
  tab clears the queue.
- **URL keys:** stored keys with a 7-day expiry and pruning; learning a key
  from the current URL; ambiguity forcing discovery; stale-key recovery.
- **Fallback:** a failed fetch navigates natively; a sign-in response is detected.
- **Back-forward cache:** `pageshow` with `persisted` clears state.
- **Carried over from the trial:** double-spinner suppression, the sticky
  spinner on a scrolled page, and `EmbeddedCCO` with a nested CCO.

The trial's `test-partial-postback-trial.cjs` shows how to double
PageRequestManager (`_updateControls`, `_destroyTree`, `endRequest`),
`Sys.Application` (`add_init` runs immediately; `add_load` and `remove_load`)
and `$create`. It also shows how to serve theme CSS through the route handler,
and how to model a leaking load handler.

## Guide and build

- **Guide section,** with the first visual outside collapsed references (AGENTS):
  - behaviour and scope;
  - opt-outs;
  - both off switches, with copyable snippets: the `Config.js` block and
    `UnionSuiteCcoSwitch.disable()` / `.enable()`;
  - loading states, known limits and diagnostics.

  Add `Config.js` to the installation table, next to its existing `pipGreeting`
  entry. No author templates are needed.
- **Build and check** from the repository root:
  - `node tools/build-theme-usage.cjs`
  - `node tools/build-theme-usage.cjs --check`
  - `node tools/check-usage-sources.cjs`
- **Run** the new test and the related existing ones:
  - `tools/test-embedded-cco.cjs`, `tools/test-page-layout-gutters.cjs`;
  - the query display tests (`tools/test-query-display-wrappers.cjs`,
    `tools/test-query-empty.cjs`);
  - any `US-TAB-BUSY` or sticky-tabs tests.

## Live acceptance

Rerun the [WIP live checklist](../../wip/cco-inline-loading/README.md) against the
deployed theme, not the console trial. Include the account page (with its
nested CCO) and at least one other page with a CCO, then test:

- queued clicks;
- both off switches;
- Easy Edit;
- Back after a link out.

Then update the spec's status, move the reusable documentation into the guide,
and archive the WIP trial and research per AGENTS, keeping the research docs.

## Out of scope

- Background preloading and kept tabs (v2; assessment in the WIP README).
- Making full-postback iParts partial.
- The taskbar dev-mode toggle (TODO in `TODO.md`). The session switch API it will
  call is part of this work.

## Starting prompt for a new session

> Implement native CCO tab switching in the UnionSuite theme. Read `AGENTS.md`,
> then `prototypes/approved/cco-inline-loading/README.md` (the approved
> specification) and `prototypes/approved/cco-inline-loading/IMPLEMENTATION.md`
> (this guide). Use `prototypes/wip/cco-inline-loading/Native-Partial-Postback-Trial.js`
> and its tests as reference code, not as the implementation.
>
> Build the `US-CCO-SWITCH` sections in `zUnionSuite.js` and `zUnionSuite.css`,
> the `Config.js` setting, `tools/test-cco-switch.cjs` and the usage-guide
> section. Start by confirming the nested-CCO and Address tab-strip markup
> assumptions listed under "Identifying a CCO".
>
> Keep other uncommitted work in the working tree untouched. Show staged changes
> and wait for approval before committing, with no Co-Authored-By trailer. Finish
> by giving the owner a live checklist run against the deployed theme.
