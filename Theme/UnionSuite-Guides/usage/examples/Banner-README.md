# Union Suite banner usage guide

The standalone [theme usage handbook](../../Usage-Guide.html)
includes this component's author-facing setup, searchable class reference,
token mapping and copyable templates. Keep its source at
`Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html` current with banner changes,
then rebuild it with `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs` from the project root.

All banner styling is maintained in
[zUnionSuite.css](../../../UnionSuite/zUnionSuite.css), in separate
`US-BANNER-PAGE-LAYOUT` and `US-BANNER-COMPONENT` sections. This includes the
full-width gutter adapter, tokens, responsive states, compact transitions,
Actions dropdown, badges, tabs, reduced motion and print rules.

Sticky/collapse and Actions behaviour are now maintained in
[zUnionSuite.js](../../../UnionSuite/zUnionSuite.js), inside the marked
`US-BANNER-BEHAVIOUR` section. One shared theme JS include supplies both reports
and banners. [Banner-Shared-Styles.html](Banner-Shared-Styles.html) and
[Banner-Behaviour.js](Banner-Behaviour.js) are generated compatibility fallbacks
for older installations, not separate sources to maintain. Local integration
is not deployment.

Use [Banner-Template.html](../templates/Banner-Template.html) for copy/paste banner HTML with
optional Actions and tabs. Open [Banner-Preview.html](../../../../references/Banner-Preview.html) to
inspect the visual result and scroll behaviour. The preview contains sample
data and checkboxes that remove/reinsert the optional blocks.

Simpler starting points are [Banner-Dashboard-Template.html](../templates/Banner-Dashboard-Template.html)
for static Content HTML and [Banner-Contact-Template.html](../templates/Banner-Contact-Template.html)
for one current-record query result. The latter uses bracketed author placeholders,
not executable IQA syntax; replace them with the actual query substitutions.

## Choose a banner mode

Enter one of these space-separated combinations in the **banner iPart's CSS
class field**, without leading dots. The same classes work for a dynamic Query
Template Display banner and a static Content HTML banner.

| Mode | iPart CSS classes | Behaviour |
|---|---|---|
| Normal | `us-banner` | Shows all details and scrolls away with the page |
| Sticky | `us-banner us-banner-sticky` | Stays visible while scrolling, retaining all details |
| Collapsible | `us-banner us-banner-collapsible` | Stays visible and animates into a compact summary on scroll |

**Collapsible includes sticky.** There is no separate scroll-triggered,
non-sticky collapse mode. Do not add `us-banner-sticky` as a requirement for a
collapsible banner. Existing configurations with both modifiers still work,
but the extra class is redundant and is not a fourth mode.

Recommended for the contact, agreement, staff and dashboard banners:

```text
us-banner us-banner-collapsible
```

## Where each class belongs

| Class | Configuration field | Purpose |
|---|---|---|
| `us-banner-page` | Page CSS class | Opts into the full-width banner page layout and native grid gutters |
| `us-banner` | Banner iPart CSS class | Required base component styling |
| `us-banner-sticky` | Banner iPart CSS class, alongside `us-banner` | Keeps the expanded banner visible |
| `us-banner-collapsible` | Banner iPart CSS class, alongside `us-banner` | Keeps the banner visible and condenses it on scroll |

Apply the iPart classes to the content item **displaying the banner**, not to
the separate style/script embed, a zone, or the HTML header inside the template.
Classes such as `us-banner__surface` and `us-banner__details` belong inside the
template HTML and describe its content structure; they are not iPart settings.
The page-layout class does not enable sticky or collapsing behaviour by itself.

## Installation

1. Upload and load the updated `zUnionSuite.css` after native Orion and before
   `zzClientSpecific.css`.
2. Upload `zUnionSuite.js`; the theme loader (`index.js`, the site's one
   header include) loads it. It supplies both report and banner behaviour.
   Bump `RELEASE` in `index.js` so browsers fetch the new file. A JS file in
   the theme folder is not loaded unless the loader lists it.
3. Remove the old banner style/script iPart or external `Banner-Behaviour.js`
   include once the updated theme assets are loaded. Keep the visible banner
   HTML, then reload and verify `window.UnionSuiteBanners.getStatus()`, scroll,
   Actions and a real partial update. Repeat includes are tolerated, but new
   installations should have only the shared script.
4. Keep `us-banner-page` in the page CSS class field when full width is needed.
5. Use `us-banner us-banner-collapsible` in the banner iPart's CSS class field,
   or choose another mode above. Leave its native title/description blank and
   border disabled.

Existing static/contact templates and inner markup work unchanged. Full width
expects a top-level `col-sm-12` column. Sticky/collapse also works without
`us-banner-page`, following the iPart's normal position and width. Other iParts
can share its zone; no extra content wrappers are needed.

For an older site that cannot yet load shared theme JS, the generated
`Banner-Shared-Styles.html` or external `Banner-Behaviour.js` can still supply
banner-only behaviour. These are fallbacks, not additional includes for the
current theme. Never add CSS or edit behaviour in the generated copies.

Only the first visible eligible banner is enhanced on a page, so multiple page
banners cannot overlap. To return to normal behaviour, leave only `us-banner`
in the banner iPart's class field.

## Dynamic and static examples

| Example | Content iPart | Page CSS class for full width | Banner iPart CSS classes |
|---|---|---|---|
| Contact or agreement record | Query Template Display with one result for the current record | `us-banner-page` | `us-banner us-banner-collapsible` |
| Membership dashboard | Content HTML with static text | `us-banner-page` | `us-banner us-banner-collapsible` |

Both use the same banner HTML structure and shared assets. Choosing a different
data source does not change the class contract. A query that renders more than
one banner surface in the same iPart is left unenhanced to avoid overlapping
fixed headers.

## Colours and gutters

The gradient uses `--brand-800` and `--brand-700`, derived from the primary brand
seed. The 2px top line uses `--accent`; the 1px left separator and dividers use
`--banner-border`, which defaults to `--brand-600`. Text uses the inverse text
token, and status badge variants use semantic status colours. Client branding
flows through the existing theme tokens; template HTML contains no colour values.

Horizontal layout follows the native row's `--bs-gutter-x`. The full-width
banner extends through its column's half-gutter, while regular content retains
native column padding. No `us-page-content` wrappers are required.

## The two tiers

The summary remains visible: `us-banner__identity`, `us-banner__eyebrow`,
`us-banner__title`, `us-banner__status` and `us-banner__actions`. Optional avatars
and the title become smaller. Authored navigation in `us-banner__nav` also stays
visible. The Actions dropdown is implemented; business command handlers and
native CCO tab integration remain separate work.

The script folds `us-banner__subtitle` and `us-banner__details` automatically.
An optional `data-us-banner-collapse` attribute adds another element to the fold.
Nested fold targets are handled once. Keep essential record identifiers and
primary actions in the summary rather than in a collapsible details block.

After 60px of window scroll, the banner condenses over 260ms. It expands within
16px of the top. The gap between these thresholds avoids flickering around a
single boundary. These thresholds are the `collapseAt` and `expandAt` settings
in the script; motion uses `--banner-motion-duration` and
`--banner-motion-easing`. Heights follow actual content instead of fixed values.
At narrow widths the compact summary wraps to keep key information readable.

The native `#hd` header supplies the current visible top offset. If that header
scrolls away, the banner reaches the top of the viewport. Native row gutters
(`--bs-gutter-x`) and sidebar geometry supply the horizontal positioning.
The `us-banner-page` layout changes gutters and padding only. Keep surface
positioning in the component's normal and pinned rules; a page-layout
`position: relative` can override the pinned state in native Query Template
wrappers and incorrectly add viewport offsets to the normal document position.
The original banner nodes stay within their iPart and form. Its normal-flow
slot follows the animated height, avoiding a blank area under the compact banner.

Details containing keyboard focus remain expanded until focus leaves. Folded
details are inert and hidden from assistive technology. Reduced motion removes
the animation. Easy Edit and very short pages retain the expanded presentation;
short pages may remain sticky but do not condense if shrinking could clamp the
scroll position. If the available viewport height is below 140px, pinning stops.

## Optional Actions and tabs

Both optional blocks are included in [Banner-Template.html](../templates/Banner-Template.html).
They use the existing banner classes; no additional iPart mode is required.

| Optional block | Placement | To omit it |
|---|---|---|
| `div.us-banner__actions` | Inside `us-banner__summary`, after identity/status | Delete the entire actions div |
| `div.us-banner__nav` | After `us-banner__details`, directly inside the banner surface | Delete the entire nav div |

### Actions dropdown

Status badges and Actions share the summary row's vertical centre alignment
in both expanded and compact modes. At narrow widths, the summary can wrap;
no extra wrapper or iPart class is required to align these controls.

The button at the top right is a native `summary` inside
`details.us-banner__action-menu`. It opens a themed dropdown containing grouped
ordinary links or buttons. The shared script closes it on outside click,
Escape or action activation; Escape returns focus to the trigger. It positions
the menu within the viewport, including while the banner is compact. Normal
Tab order applies to enabled controls; this is a disclosure, not an ARIA menu
requiring a separate menu keyboard model.

The supplied action items are **disabled placeholders**. For a navigation
action, replace its button with an `a.us-banner__menu-item` with a verified URL.
For a command, retain `button type="button"`, connect its verified handler in
shared JavaScript, then remove `disabled`. Do not use inline event attributes
and load the full shared theme plus the dedicated registration files for `us-action-*` commands. Group labels
and order are authored in this HTML. An optional `us-banner__menu-item--danger`
modifier uses semantic danger colours.

Menu surface, text, borders and hover states derive from the theme through
`--banner-menu-*` aliases. Native summary semantics also allow the disclosure
to open if the shared script is unavailable, although outside-click/Escape
handling and viewport positioning require the script.

### Tabs row

The tabs sit on the banner's bottom edge, with an accent underline for the
current item. They stay visible during collapse and scroll horizontally when
labels exceed the available width. Use `us-banner__tab` on each button and
stable `data-us-tab` keys. The containing nav div has the tab-set key in
`data-us-tabs`. Delete or reorder buttons to customise the visual template.

**This stage supplies tab presentation only.** Template buttons remain disabled
until they are connected to real content. The initial `is-active` class is a
visual state, not evidence that a native CCO section was selected. The future
adapter will supply full tab semantics after it resolves the actual panels.
For lightweight dashboards, the preferred next implementation ties tabs directly
to page zones. One tab may show several zones, while unmarked zones remain
visible. Switching visibility should not reload the page or rerun queries; all
zones still load initially. A native CCO adapter remains a separate option, not
a prerequisite. The owner reports full page reloads with the current CCO setup.
See [Banner-Tabs-Plan.md](../../../../prototypes/wip/banner-tabs/Banner-Tabs-Plan.md) for the proposed zone classes,
title/layout handling, CCO alternative and implementation checks. Neither adapter
is active yet, and no native tab strip is hidden by the current template.

## Lifecycle and verification

The singleton `window.UnionSuiteBanners` supports `refresh()` after custom
content insertion. The script also detects inserted content and class changes,
observes size changes, and hooks ASP.NET page loading/end-request events.
Before a partial update it restores native markup; after the update it enhances
the new banner. Repeated script execution does not add duplicate handlers.

If neither feature starts, first verify the classes are on the iPart, the final
script has loaded, and Easy Edit is off. In the browser console,
`window.UnionSuiteBanners?.getStatus()` reports initialization, matching iParts
and the active state without exposing record data. An undefined result means
the shared script has not registered; zero marked iParts means the modifier
classes were not found on an iPart wrapper. Invalid/multiple banner surfaces
and hidden content are excluded from enhancement.

Checked locally in Edge using the supplied contact-page markup and current
native/theme CSS: animated intermediate heights, normal/compact geometry,
native gutters, sidebar resizing, moving/resizing header, original node and
action-handler retention, keyboard focus, mobile wrapping, reduced motion,
repeated includes, simulated ASP.NET replacement, Easy Edit classes and modifier
removal. Optional-control checks cover dropdown opening, keyboard/outside close,
retained action handlers, viewport bounds, compact tabs, mobile overflow and
deleting/reinserting each optional block. This harness does not execute the real iMIS/Telerik runtime; verify
scrolling and a real partial refresh after pasting into the live test page.

For local maintenance, `node Theme/UnionSuite-Guides/usage/build/build-banner-preview.cjs` regenerates the
preview from the theme CSS/JS and current template, and regenerates both
compatibility files from the marked banner block in `zUnionSuite.js`. Edit
`zUnionSuite.css` for styling, `zUnionSuite.js` for behaviour and the templates
for content slots. The
generated preview and usage guide import those sources; they are not alternate
CSS sources. The preview is not an iMIS content item to paste into production.

### Approved shared Actions behaviour

With the full zUnionSuite.js/css installation, existing banner Actions markup is
adapted to approved option 5. Native details handling remains a fallback in the
legacy banner-only embed; do not install that embed as a substitute for the full
Actions controller. New standalone or banner menus may use
[Action-Menu-Template.html](../templates/Action-Menu-Template.html). Assign a registered `us-action-AREA-COMMAND` class
to each item and register its definition once in client JavaScript; see the
[Actions usage guide](../../Usage-Guide.html#action-menus).

## Member profile status treatment

Use Banner-Contact-Template.html for the approved member profile banner.
The inner header uses us-banner__surface--member and data-us-status-colour.
Its status badge uses us-banner__badge--member-status. The query supplies
StatusColour (#RRGGBB) and StatusDescription; rename those aliases as needed.
Shared JS preserves the input and derives one display colour for white text,
the 15px rail. Missing/invalid colour falls back to #596579.
The compact pill has 3px vertical padding, and Quick Actions uses glass states.
Tabs use neutral 6B styling. Connect them to explicit panels with data-us-tab-adapter="page-sections"; see the section-switcher usage guide.

See the member-profile-banner section in the usage handbook for exact placement,
lifecycle, accessibility, popup prerequisites and the copyable contact template.
Banner-Status-Final.html now consumes the shared component, with preview-only
sample controls and commands. Rebuild it with node tools/build-banner-status-final.cjs.

### Client status and colour configuration

- Member status is controlled by the `_I4u_UT_Contact_BannerType` business object,
  via its custom SQL expression filter.
- `I4U_CONTACTBANNER_TYPES` maps the member type/status produced by that BO to
  a corresponding CSS colour code. Use #RRGGBB for the current banner.
- For each contact ID, IQA pulls the matching status and lookup colour into the
  banner result. The template uses StatusDescription for the pill label and
  StatusColour for data-us-status-colour; substitute the actual query aliases
  where they differ.
- Change status assignment in the BO and status colours in the lookup.
  The theme only derives readable display colours; it does not alter those
  business rules or the stored values.

## Case and agreement example

Use [Banner-Case-Template.html](../templates/Banner-Case-Template.html) for literal case sample HTML, shared by cases and agreements. [Open the scrolling prototype](../../../../references/Case-Banner-Prototype.html). The shared description and facts layout needs no extra component CSS. Actions open but business commands are disabled. Rebuild with `node .preview/build-case-banner-preview.cjs`; setup and copyable HTML are in the usage guide, under Case and agreement banner.

The case/agreement banner keeps status in its summary and priority beside the record ID and limits the folding facts to primary complainant, type, case date and manager. The description of up to 300 characters is backed by [Case-Details-Content.html](../templates/Case-Details-Content.html), a separate native Content HTML panel containing the full description, opened date and last update.

## Client configuration for cases and agreements

`Banner-Case-Template.html` is the reusable template for both record types. Edit the marked CLIENT DETAILS slot in each client’s content/query template: add, remove or reorder whole `us-banner__fact` divs and choose their labels and values. No shared CSS/JS changes are needed. `Banner-Agreement-Facts.html` supplies an alternative agreement row. Both examples, placement instructions and query adaptation requirements are included in the standalone usage guide.
