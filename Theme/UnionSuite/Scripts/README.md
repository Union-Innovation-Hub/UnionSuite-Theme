# UnionSuite taskbar

`UnionSuiteTaskbar.js` replaces the previous taskbar injection. Remove the old
injection/include before loading this file once. Upload the updated
`zUnionSuite.css` too: the script contains no stylesheet or inline style rules.

Use your actual deployed theme folder in these paths:

```html
<link rel="stylesheet" href="/App_Themes/YOUR_THEME/zUnionSuite.css">
<!-- Retain client CSS here, then load the dark palette last. -->
<link rel="stylesheet" href="/App_Themes/YOUR_THEME/zzDarkMode.css">
```

The theme loader (`index.js`, the site's one header include) loads
`UnionSuiteTaskbar.js`; do not include it separately. The client `Config.js`
is not loaded by the loader yet, so taskbar settings go in an inline script
before the loader include.

Keep the existing native header search markup. The taskbar mounts beside
`.searchfieldplus-dropdown` for authenticated client contexts; native search is
hidden only after the replacement mounts. This is a presentation check, not
authorisation: the iMIS API continues to enforce access.

Configuration is optional and must precede the script:

```html
<script>
window.UnionSuiteTaskbarConfig = {
  queryName: '$/_i4u_/Core/Directory/Quick Search/Taskbar Quick Search',
  minimumSearchLength: 3,
  searchDelay: 250,
  pipGreeting: true // false removes Biscuit and his reserved space
};
</script>
```

Prefer editing the existing client `Config.js` and preserving other settings.
The example above shows the same object inline; do not load both alternatives.

## Biscuit's approved daily greeting

Version 1.7 replaces Pip with Biscuit in the theme taskbar. His 96px reserved section sits
left of the four management shortcuts, with no separator, and follows the
bottom edge of the containing header. His golden CSS drawing is 30% larger than
the original preview; attached floppy ears follow the head through each tilt.

- Daily arrival: peek and wave; the first eligible visible visit is stored per
  signed-in user, local calendar day and browser/origin.
- Visit length: five minutes from the first peek, then the normal slide-away.
  Clicks and idle previews do not extend this timer.
- Clicks: wave, happy hop, then the quick duck, peek-back, side-to-side glance,
  look at the viewer, startled jump and quick final exit.
- Idles: every 15 seconds choose a head scratch or curious tilt, skipping
  active reactions, typing/search, dialogs and reduced-motion mode.
- Hidden tabs pause idles but keep the five-minute deadline. Reloads and
  taskbar replacement retain the daily limit. Teardown clears all timers.

Deploy the script, `zUnionSuite.css` and last-loaded `zzDarkMode.css` together. Client `pipGreeting` is enabled by default.
The legacy `pipGreeting`, `pipStoragePrefix`, `playPipIdle()`, CSS class and
`--us-pip-*` token names now control Biscuit. Keeping them preserves existing
client settings and daily records; installation does not replay today's greeting.
The preview's Replay, Scratch head and Curious tilt buttons are not injected
into the production header. They call the same maintained code:
`UnionSuiteTaskbar.playPipIdle('scratch' | 'curious')` accepts only a visible
visit and does not advance the click count or revive a dismissed greeting.
See [the guide](../../UnionSuite-Guides/Usage-Guide.html#taskbar-pip) for accessibility, exact timing,
installation and copyable configuration.

## Quick Search

Quick Search requests at most 10 results using `&limit=10` on the IQA request.
The query receives one `parameter` and returns native `Items.$values` with
`Properties.$values`. Preserved fields: ID, FULL_NAME, COMPANY, COMPANY_RECORD,
Member Type, Status, PreferredEmail, PreferredMobile, Suburb and Postcode.
Quick Search handles record IDs as well as names/contact details; result links use
`/Party.aspx?ID=...`. Requests carry the page's RequestVerificationToken and
same-origin credentials. No server credentials are embedded.

The original IDs `injected-taskbar` and `tb-search-dropdown` and `tb-*` class
aliases are retained. Descriptive `us-taskbar__*` classes identify parts;
`data-taskbar-action` identifies commands and `data-record-id` identifies results.
Inputs have unique IDs and accessible names, with ARIA status/expanded relationships. Quick Search uses a decorative SVG magnifier; the Go to record text is omitted. Arrow keys move
through result links; Enter follows a focused link; Escape closes results.

Lifecycle API: `UnionSuiteTaskbar.refresh()`, `.destroy()`, `.initialise()`.
Duplicate loading is ignored. DOM replacement triggers remounting. Destroy
cancels pending work, removes document listeners and restores native search.
Closing results cancels pending searches; request versions also prevent stale
responses from reopening or replacing results. API errors leave controls usable.

The separate ID field has been removed. At 992px the search field shrinks;
at 768px management shortcuts hide and results fill the viewport.
Base layout, colour, focus and responsive rules live in the shared CSS.
Dark-specific rules and appearance-switch styling live in `zzDarkMode.css`.

## Dark mode

Deploy `zzDarkMode.css` last, after native/shared/client CSS, and update
`zUnionSuite.js` and `Scripts/UnionSuiteTaskbar.js`. Keep existing Tabler assets.
The taskbar appends one moon/sun switch after Full Search. It stays hidden when
shared appearance JS or the dark stylesheet is absent. No iPart class is needed.
The switch matches Full Search's 36px square on every pointer type, 8px corners
and outline states through generated `TextButton us-outline-button` classes.
Deploy the taskbar script and `zzDarkMode.css` together for this matching format.
The document-level `UnionSuiteAppearance` API follows the device on first use,
persists explicit choices per browser/origin, and supports `toggle()`, `reset()`,
`setPreference('light'|'dark'|'system')`, `getState()` and `refresh()`.
Load the same assets in themed iframe/popup documents; CSS cannot cross frames.
The shared guide's [dark mode section](../../UnionSuite-Guides/Usage-Guide.html#taskbar-dark-mode)
has the exact order, lifecycle, palette ownership and native coverage limits.

Verify authenticated search, real query permissions, record navigation and partial
updates on iMIS after deployment. Offline guide fixtures use fictional responses.

## Side pane

`UnionSuiteSidePane.js` adds a side pane toggle at the far right of the taskbar
(after the bookmarks star) on pages that have a side pane tab, and opens a pane
from the right, below the header. Features add tabs with
`UnionSuiteSidePane.register({id, label, icon, pages, render})`. The first tab,
Case help on the manage case page, is a chat that answers from the staff case
guide hosted at `/App_Themes/UnionSuite-Guide/Cases-Help.html`
(`CASE_GUIDE_URL`; built by `node tools/build-user-guide.cjs` into
`Theme/UnionSuite-Guides/`). It matches questions with
`UnionSuiteHelpMatch.js`, the same matcher the guide page inlines; the
matcher's source is here, and the guide build reads it from here. The loader
loads the matcher and then the side pane on the case page only; widen both
gates in `index.js` when tabs for other pages arrive. Styles are US-SIDE-PANE in `zUnionSuite.css`, with dark details
in `zzDarkMode.css`. Test: `node tools/test-side-pane.cjs`. Guide:
[side pane section](../../UnionSuite-Guides/Usage-Guide.html#side-pane).

Taskbar management shortcuts: Manage IQAs, Manage Content, Manage Themes and About iMIS appear between Biscuit and Quick Search. They are labelled same-tab anchors with shared theme outline icons. They hide at <=768px. Deploy updated UnionSuiteTaskbar.js and zUnionSuite.css; destination permissions remain native.

Management shortcuts and Full search resolve against websiteRoot in the DOM __ClientContext JSON. Built-in paths are website-relative (including leading-slash paths); no UTNewTheme prefix is embedded. Absolute HTTP(S) fullSearchUrl overrides are preserved. Missing websiteRoot falls back to the current origin root; malformed roots retain the original path. API and record lookup URLs remain unchanged.
