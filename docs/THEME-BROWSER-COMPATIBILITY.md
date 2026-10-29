# Theme browser compatibility review

Reviewed 14 September 2026. Review only; no production theme CSS or JavaScript was changed.

The shared theme works broadly across the three tested browser engines. One reproducible interaction difference affects Safari/WebKit: clicking a Query Template search disclosure does not focus its search field. Older browsers also encounter unguarded selector dependencies and incomplete sidebar colour fallbacks. These older-browser limitations do not, by themselves, invalidate a policy targeting recent browser releases.

## Recommended support policy

- Chrome, Edge and Firefox: current and previous major versions, plus currently supported Firefox ESR releases.
- Safari: current and previous major browser releases on supported macOS/iOS versions; verify desktop and mobile separately.
- Older versions: best effort unless client usage or a contractual requirement justifies extending support. Do not target Internet Explorer or legacy Edge.
- Prefer Baseline Widely Available features for essential functionality. Newer visual enhancements should have usable fallbacks.

This is a proposed project policy, not an existing guarantee. [iMIS officially supports the latest versions of the major desktop/mobile browsers](https://help.imis.com/enterprise/upgrading_to_imis_ems/system_requirements.htm). [Baseline Widely Available](https://web.dev/baseline) means a feature has been interoperable across the core browsers for at least 30 months; it is a feature-selection guide, not a promise that every browser released in that period works.

## Findings

### 1. P2 — Search disclosure assumes a mouse click focuses its button

Source: [zUnionSuite.js, line 639](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite/zUnionSuite.js:639>), in `finishTransition()`; activation is handled around line 407.

After opening a search disclosure, focus is transferred only if `document.activeElement === entry.button`. Safari does not normally focus a button when it is clicked, so that condition fails. This is [documented browser behaviour](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/button#clicking_and_focus).

Reproduced with the actual shared CSS/JS in Edge 153 and Playwright WebKit 26.5:

| Action | Edge | WebKit |
|---|---|---|
| Click search/filter disclosure | Search input receives focus | Field opens; focus stays on `BODY` |
| Focus disclosure, then press Enter | Search input receives focus | Search input receives focus |
| Focus field manually and enter a query | Results filter correctly | Results filter correctly |

Impact: Safari users cannot immediately type after opening search; they need a second click into the field. The same path affects the contact-list search. This is an interaction inconsistency, not a failure of the filtering algorithm.

Recommended fix: capture the intent to focus search when the disclosure is activated, then honour it after the opening animation. Preserve the protection against stealing focus if the user deliberately moves elsewhere during the animation. Test pointer and keyboard activation separately.

### 2. P2 if older browsers are required — `:has()` is a JavaScript dependency without a compatibility guard

Sources: [query-display selector, line 154](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite/zUnionSuite.js:154>), its execution at line 181, [action candidates, line 2667](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite/zUnionSuite.js:2667>), and [task selector, line 3388](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite/zUnionSuite.js:3388>). CSS also depends extensively on `:has()` for wrapper ownership and layout.

Support starts at Chrome/Edge 105, Firefox 121 and Safari/iOS Safari 15.4. Earlier browsers can reject these selectors in DOM queries, interrupting component setup instead of merely omitting a visual enhancement. See [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/selectors/has.json) and [DOM query exceptions](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector#exceptions).

An unsupported-selector simulation produced selector exceptions and left query/action enhancements uninitialised. This was fault injection in modern browsers, not an execution of historical browser binaries. A Firefox preference intended to disable `:has()` no longer disabled it in the installed build, so that run was not counted as legacy-browser evidence.

Recommended action: document the minimum feature requirements. If older clients must retain functionality, use native DOM traversal for essential detection or add a capability gate that safely preserves native controls. A CSS-only fallback cannot prevent a JavaScript selector exception. Retain the project's direct/wrapped/nested iPart ownership contract.

### 3. P2 if older browsers are required — Sidebar tokens bypass the `color-mix()` fallback

Source: [zUnionSuite.css, line 2360](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite/zUnionSuite.css:2360>), with consumers at lines 2363–2371 and in the foundation stylesheet.

The initial colour ramps correctly place derived colours inside `@supports`, but `--nav-submenu-bg`, `--nav-hover-bg` and `--nav-selected-bg` are assigned `color-mix()` values unconditionally. On a browser without that function, consuming declarations become invalid at computed-value time. A fallback inside `var(--nav-selected-bg, ...)` does not rescue an already-defined but unusable token.

Reproduction: replacing `color-mix()` with an unknown function in an in-memory stylesheet made the selected sidebar link's computed background transparent in all three engines. The original mixed background was present with normal CSS. The accent selection indicator remains, so this is degraded navigation styling rather than a total loss of selection feedback.

Affected versions precede Chrome/Edge 111, Firefox 113 and Safari 16.2, according to [MDN's colour compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/types/color.json).

Recommended fix: give these tokens literal baseline values and place their derived versions inside the existing `@supports` strategy. Audit other component-local colour tokens when touching their components. The focus glow also disappears without `color-mix()`, but the guide explicitly documents the retained focus border; that was not counted as a separate defect.

### 4. P3 — Existing browser tests contain engine and input-device assumptions

Examples: [test-report-icon-actions.cjs](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/tools/test-report-icon-actions.cjs>), [test-query-search.cjs](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/tools/test-query-search.cjs>), [test-section-switcher.cjs](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/tools/test-section-switcher.cjs>), and [test-membership-stats.cjs](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/tools/test-membership-stats.cjs>).

Most browser tests explicitly launch Edge. Running selected tests with other engines exposed assertions that should be made portable:

- Firefox returned the intended 44px coarse-pointer controls while two tests unconditionally expected 36px. The CSS was following its touch-target rules.
- WebKit's viewport resize had not settled when one immediate width assertion ran. Waiting for the new viewport and layout resolved it.
- WebKit did not expose `forcedColorAdjust`; an unconditional assertion failed even though preceding section-indicator checks passed.
- A test labelled as a keyboard retry used `.focus()` followed by a mouse `.click()`. Using Enter passed all 13 membership-controller scenarios in WebKit.

Recommended fix: parameterise the browser engine, assert the correct outcome for the reported pointer capability, wait for observable layout/state changes, and use real keyboard activation in keyboard tests. Keep the search-autofocus regression as a product finding rather than masking it with unconditional test focus.

## Lower-priority observations

- The WebKit guide check emitted `ResizeObserver loop completed with undelivered notifications.` after its interaction checks passed. A likely source is [usage-guide.js, lines 175–192](<C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts/Theme/UnionSuite-Guides/usage/source/usage-guide.js:175>), which changes iframe height directly from a body resize observer. Root cause and visible impact were not isolated; do not treat this as a confirmed broken layout. Investigate coalescing writes with `requestAnimationFrame` and avoiding unchanged height assignments, following [ResizeObserver guidance](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver#observation_errors).
- Contact details and membership cards depend on container queries for narrow-container reflow (`zUnionSuite.css`, lines 3111 and 3537–3538). Browsers before Chrome/Edge 105, Firefox 110 or Safari 16 will keep their base column arrangements. This matters if older devices are brought into scope. [Compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/container-type.json).
- Mobile tab overflow fades use unprefixed `mask-image` at lines 2885–2887. Chrome/Edge before 120 need the prefixed version. Scrolling remains available without the fade, so this is cosmetic. [Compatibility data](https://github.com/mdn/browser-compat-data/blob/main/css/properties/mask-image.json).
- `scrollbar-color` was unsupported in the tested Windows WebKit port; scrollbars remained usable. That port result should not be presented as a guarantee about current macOS Safari. Safari added `scrollbar-width` and `scrollbar-gutter` in 18.2. [WebKit release notes](https://webkit.org/blog/16301/webkit-features-in-safari-18-2/).

## Verification and limits

Reviewed the shared foundation, shared CSS/JS, taskbar script, client overrides, guide implementation, and existing test fixtures. Ran 12 selected browser test scripts per engine using the existing Playwright installation:

| Engine actually executed | Original test scripts passing | Interpretation |
|---|---:|---|
| Microsoft Edge 153.0.4234.32 | 12/12 | All selected checks passed |
| Playwright Firefox 153.0 | 10/12 | Remaining failures were hard-coded 36px expectations on coarse-pointer controls |
| Playwright WebKit 26.5, Windows port | 6/12 | Search focus discrepancy plus portability assumptions; triaged separately above |

The selected scripts covered panel/query wrappers, taskbar, report icon actions, contact lists, section switching/indicators, membership data/layout, task rows, query search and Needs Attention. Temporary review-only test adaptations confirmed that WebKit membership retry, section switching/indicators, contact lists and query filtering proceed correctly when the identified focus/timing/platform assumptions are handled. These adaptations did not modify production sources or the maintained test files. The guide resize warning remained an open observation.

Full-script smoke fixtures initialised query and action enhancements without page errors in all three engines. Feature-loss probes were explicitly simulated. Local mocked requests did not exercise a live iMIS site or submit live data.

This is not certification of every browser in the proposed policy. Chrome was represented by the Chromium engine in Edge; it was not run separately. Real macOS/iOS Safari, Firefox ESR, historical browser versions, mobile virtual keyboards, native OS pickers, and live Telerik/ASP.NET interactions were not exercised. Confirm those where relevant before declaring a release supported.

Reproduction scripts, raw results and source hashes are retained in `.tmp-iqa-integration/compat-*`. The review does not introduce a permanent test runner or change the supported-browser policy in the usage guide.
