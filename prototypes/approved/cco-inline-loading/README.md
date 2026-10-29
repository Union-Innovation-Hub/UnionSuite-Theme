# Native CCO tab switching without page reloads — specification

Status: **approved**, 23 September 2026. The owner decided the three open
questions; they are recorded under Decisions. It is implemented as a
shared-theme feature, with usage-guide documentation. Evidence: the live
v0.6.0 checklist passed on the sandbox account page (see the
[WIP README](../../wip/cco-inline-loading/README.md) and
`prototypes/wip/cco-inline-loading/research/native-cco-handover/`).

**Implementation status (23 September 2026):** implemented in the shared theme,
awaiting live acceptance. Behaviour is the `US-CCO-SWITCH` section of
`Theme/UnionSuite/zUnionSuite.js`, styles the `US-CCO-SWITCH` section of
`zUnionSuite.css` (the cover uses `--bg-surface`, which already follows dark
mode, so `zzDarkMode.css` needs no change), and the site-wide setting is in
`Theme/UnionSuite-Client/Config.js`. The usage guide documents it at
`#cco-tab-switching`. The 23 offline scenarios are in
`Theme/UnionSuite-Guides/usage/tests/test-cco-switch.cjs`. Keep this spec here
until the live checklist passes on the deployed theme.

**Implementing it:** read the [implementation guide](IMPLEMENTATION.md). It covers
the trial's reference code, CCO identification, the switch step by step, loading
states, coordination with existing theme features, tests, the guide and live
acceptance.

## Problem

A native iMIS Content Collection Organizer (CCO) tab click posts the whole page
back. The server answers with `Response.Redirect` to the page URL carrying the
tab's key, and the browser reloads everything. Switching tabs is slow, loses
scroll position and repaints the whole page.

## Behaviour

- **Scope: every CCO, automatically.** Every native CCO tab strip on every page
  switches in place once the theme is installed, including CCOs nested inside a
  tab. No author class is required.
- **Opt-outs.** A CCO keeps native behaviour in these cases:
  - `us-report-no-styling` is on the CCO iPart or an ancestor (the theme's existing opt-out);
  - Easy Edit is on;
  - the organiser is not a Telerik tab strip with a multipage (for example wizard layouts).
- **One switch, in place.** Clicking a tab:
  1. fetches the page URL that native navigation would load;
  2. replaces only that CCO's displayed view;
  3. switches the page-level form state (ViewState, generator, event validation,
     anti-forgery token, `PageInstanceKey`, form action, tab and multipage client
     state) to the fetched page;
  4. registers the fetched page's update panels with PageRequestManager;
  5. initializes the view's controls.

  The URL is updated with `history.replaceState`, so reload and shared links land
  on the displayed tab.
- **Native actions.** iMIS's own partial postbacks work unchanged: sorting,
  paging, page size, filters, panel editors, saves and popups. iParts that do a
  full postback natively, such as Communication Preferences Save, still reload
  the page onto the same tab. That is native behaviour and out of scope.
- **URL keys.** Each CCO's tab key (the first 12 hex characters of its placement
  key) is not known in the browser. The first switch of a CCO sends one
  background async tab-strip postback, as a native click does, and reads the tab
  URL from its `pageRedirect`; nothing is applied to the page. The key is then
  stored in `localStorage` per page path and tab strip ID for **7 days**, and
  later switches fetch directly. A stale key cannot break the page: its fetch
  lacks the expected view, so the switch falls back to native navigation, the
  stored key is discarded, and the next switch rediscovers it.
- **Initialization of the inserted view,** in native order:
  - the view's JavaScript-typed inline and external scripts;
  - page-level grid managers (`window['<id>_jsmanager']`) for controls in the view;
  - the server's `$create` blocks for controls in the view;
  - one native refresh per uninitialized report lister. One refresh updates every
    lister on the tab; iMIS then returns the grids with their own scripts.
- **Leaving a view** disposes its components and removes the Sys.Application and
  PageRequestManager handlers its initialization registered. Its content is
  replaced with the native `Loading...` placeholder.
- **Concurrency: the latest click wins.** A click during a switch, or during a
  native partial postback, is queued, and a newer click replaces an older queued
  one. When the current switch or postback finishes, the script switches to the
  queued tab. A switch in progress is never cancelled, because stopping part-way
  could leave the page state half-changed. Clicking the tab already being
  loaded, or the displayed tab, clears the queue.
- **Failure.** If a switch cannot complete (unexpected response, missing view,
  sign-in page, discovery failure), the theme falls back to native navigation to
  the tab URL. No page is left half-switched without that fallback.
- **Back-forward cache.** A page restored with Back resumes normally, with no
  lingering loading state.

## Loading states

- **Tab:** the clicked tab is selected immediately and marked `aria-busy`. After
  the theme's 150 ms delay it shows the existing `us-tab-loading-spinner` with
  `data-us-tab-loading`, like native tab loading today.
- **Queued clicks:** the tab selection and tab spinner move to the latest clicked
  tab straight away, so it is clear which tab is coming. The content cover and
  section spinner stay in place, unchanged, across queued clicks until the final
  tab is ready. The status message announces the latest tab.
- **Content:** the CCO's multipage is blocked from interaction. After the same
  delay it is covered by an opaque theme surface carrying the shared
  `section-loader-spinning-circles`, 180 px down and kept in view when the page
  is scrolled.
- **Announcement:** a polite `role="status"` message announces `Loading <tab>`.
- **Suppressed native indicators:** during the internal lister refreshes, the
  theme's report-refresh overlays and native update-progress images are hidden.
- **Styling:** all of this lives in `zUnionSuite.css`, with dark values in
  `zzDarkMode.css` and reduced motion handled; the trial's inline styles are not
  carried over. The trial found an injected `<style>` element did not apply on
  the live page, so implementation must confirm the shared stylesheet is present
  and ordered correctly.

## Known limits

- `DOMContentLoaded` and `window.load` handlers inside tab content do not fire,
  since the document has already loaded. Page-wide startup statements other than
  grid managers are not replayed. Missing initialization is reported in the
  diagnostics.
- Report row elements with RadButton classes (for example `ContactDetailsEntry_*`)
  are reported as uninitialized. Their live behaviour passed the checklist, so
  they are treated as styling-only unless shown otherwise.
- Fetching a tab costs the same server render as a native switch (0.5–3.5 s
  measured). The saving is the avoided POST, redirect and full-page reload.

## Not in v1

- Background preloading and kept tabs (v2; assessment in the WIP README).
- Making full-postback iParts partial (a broader, non-CCO project).

## Diagnostics

`window.UnionSuiteCcoSwitch` exposes `refresh()` and `report()` (the trial's
report format, without ViewState, tokens or row data).

## Turning it off

Two switches return every CCO to native page reloads. Either one turns the
feature off; both are documented in the usage guide.

- **Site-wide:** `enabled: false` in the client theme config,
  `Theme/UnionSuite-Client/Config.js`, following the existing per-feature pattern:

  ```js
  window.UnionSuiteCcoSwitchConfig = {
    ...window.UnionSuiteCcoSwitchConfig,
    enabled: true // false = every CCO uses native page reloads.
  };
  ```

  The default is `true`. The setting is read at click time, so `Config.js` load
  order does not matter.
- **This browser tab only:** `UnionSuiteCcoSwitch.disable()` and `.enable()` in the
  console. Stored in `sessionStorage`, so it survives reloads until the tab is
  closed, for diagnosing a page without affecting other users.
- **Planned:** a toggle for the session switch in a taskbar dev mode (TODO).

## Acceptance

- Automated fixtures in the canonical guide test location cover:
  - switching and nested CCOs;
  - URL-key discovery;
  - form state and panel registration;
  - initialization order;
  - disposal and handler release;
  - loading states, including scrolled pages;
  - opt-outs, the site-wide setting and the session switch;
  - queued clicks, including the spinner moving to the latest tab;
  - stored URL keys, their 7-day expiry and stale-key recovery;
  - failure fallback;
  - report hygiene.
- The live checklist in the WIP README passes on the sandbox, plus one non-account
  page with a CCO.
- Usage guide section: behaviour, opt-outs, both off switches with copyable
  `Config.js` and console snippets, loading states, limits and diagnostics. There
  are no author templates, since no authoring is required.

## Decisions (owner, 23 September 2026)

1. **Concurrency:** queue the latest click. The tab spinner moves to the latest
   clicked tab; the content spinner stays unchanged across clicks.
2. **Off switches:** both a site-wide setting in the client `Config.js` and a
   per-tab session switch, documented in the guide. The taskbar dev-mode toggle
   is a TODO.
3. **URL keys:** long-term storage in `localStorage`, for 7 days.
