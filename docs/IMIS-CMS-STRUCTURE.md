# iMIS RiSE — CMS structure and CSS hooks

What you can attach styling to, and where each hook actually lands in the DOM.
Captured DOM examples below come from real pages. The current report and banner
contracts are documented in §§18–19. For author recipes and copyable HTML, use
the [standalone Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html); §20 records
how that guide stays aligned with the implementation.

Reference: [Creating custom layouts](https://documentation.advsol.com/imis/v4.0/docs/creating-custom-layouts)

Companion to [THEME-FINDINGS.md](THEME-FINDINGS.md) and
[THEME-INVENTORY.md](THEME-INVENTORY.md).

---

## 1. The stack, outermost first

| Layer | Artifact | Configurable? | CSS hook |
|---|---|---|---|
| Master page | `/templates/masterpages/constellations.master` | Rarely | `body`, `.wrapper`, `.col-primary`, header/footer |
| Theme | `App_Themes/<name>/` | Per website | The stylesheets themselves |
| Page layout | Content record, type `LAY` | Yes — you author the HTML | Any class/ID you write |
| Content page | Content record, type `CON` | Yes | A class on `<body>` |
| Container / zone | Defined by the layout | Yes | Class appended to `.WebPartZone` |
| iPart instance | Dropped into a container | Configure, not edit | Class on a **wrapper div** |
| iPart internals | Rendered by iMIS | No | Whatever classes iMIS emits |

Page globals confirm the layers at runtime:

```js
gMasterPage  = '/templates/masterpages/constellations.master'
gPageTheme   = 'UnionSuiteTheme'
gWebsiteKey  = 'b69d7cc8-…'
gIsEasyEditEnabled = false
```

---

## 2. The actual DOM chain

From `.col-primary` down to a rendered iPart:

```html
<body id="MainBody" class="fade OrganiserPortal body-main sidebar-fixed">
                            ^^^^^^^^^^^^^^ page CSS class lands here
  <div class="wrapper SVG-enabled js-nav-sticky">
    <div class="col-secondary">…nav…</div>
    <div class="col-primary">
      <div class="main"><div class="ContentPanel">

        <div>                              ← layout HTML starts here
          <div class="row">
            <div class="col-sm-9">
              <div class="ContentItemContainer">
                <div id="WebPartZone1_Page1" class="WebPartZone StaffDashboard">
                                                   ^^^^^^^^^^^^  ^^^^^^^^^^^^^^
                                                   iMIS          container class
                  <div class="iMIS-WebPart">
                    <div id="ste_container_ciWelcomeMessage" class="ContentItemContainer">
                      <div class="no-card">          ← iPart CSS class (see §4)
                        <div class="panel">
                          <div class="panel-heading Distinguish">…</div>
                          <div class="panel-body-container">
                            <div class="panel-body">   ← iPart output
```

### Layout HTML — what you control

The layout is where the responsive grid gets chosen. Observed in use:
`.row`, `.col-sm-3`, `.col-sm-4`, `.col-sm-9`, `.col-sm-12`. Any class or ID you
write into the layout survives to the DOM verbatim.

---

## 3. Container (zone) classes

The class you assign to a container is **appended** to `WebPartZone`:

```html
<div class="WebPartZone StaffDashboard">
<div class="WebPartZone BulletinList">
<div class="WebPartZone MembershipTasks MyTasks">   ← two classes, space separated
<div class="WebPartZone ">                          ← none assigned (note trailing space)
```

Multiple classes work. `MembershipTasks MyTasks` / `MembershipTasks
SearchDirectory` is the pattern used to let page JS show/hide whole zones:

```js
jQuery('.MembershipTasks').hide();
jQuery('.MembershipTasks.MyTasks').fadeIn();
```

**So container classes are load-bearing for behaviour, not just styling.**
Renaming one can break a page's script.

---

## 4. iPart classes insert an extra div — this matters

Adding a class changes the DOM structure, not just an attribute. This has caused
both missing panel shells and missing header actions when CSS/JS or previews
assumed the wrong parent. Check this first when a component breaks after adding
an iPart class. It applies to iPart configuration generally, not only bulletins.

For a panel-rendering iPart, **without** a CSS class the panel can be a direct
child of `.ContentItemContainer`:

```html
<div class="ContentItemContainer">
  <div class="panel">…native heading and body…</div>
</div>
```

**With** `us-staff-bulletin` in the iPart CSS class field, iMIS inserts an extra
div. The class goes on this div, not on ContentItemContainer or the panel:

```html
<div class="ContentItemContainer">
  <div class="us-staff-bulletin">
    <div class="panel">…native heading and body…</div>
  </div>
</div>
```

Multiple configured classes share this one div. Some captured iParts also retain
an empty `<div class="">`; a blank field does not guarantee the direct form in
every rendering. Page and zone classes have different placement rules (§§1–3).

**Consequence: `.ContentItemContainer > .panel` misses the wrapped form.**
Do not solve this with a blanket `.ContentItemContainer .panel` rule: nested CCOs
and zones also contain panels. Support both immediate-owner forms and validate
the native component below that panel. For example, Query Template Display
requires `.panel > .panel-body-container > .panel-body > .QueryTemplateSet`.
The shared detector excludes banner templates and honours `us-report-no-styling`.
After validation, header lookup can use `:scope > .panel > .panel-heading` from
the matched owner. Runtime markers and action-class lookup belong on that owner:
the generated div when present, otherwise ContentItemContainer.

Preview fixtures must use the same class placement as iMIS. Cover no class,
configured class, empty wrapper, nested iPart and opt-out cases; verify partial
replacement for JS adapters. Do not pre-populate runtime detection attributes
or flatten the extra div to make a preview look correct. The existing local
regressions are `tools/test-query-display-wrappers.cjs` and
`tools/test-data-panel-wrappers.cjs`.

These examples explain **generated output**. Authors enter the class in iMIS
and paste only the inner Content HTML or single-result Query Template. They
must not add the outer wrapper or move the class into each repeated card.
See the [author guide's wrapper note](Theme/UnionSuite-Guides/Usage-Guide.html#ipart-class-wrapper).

Also note `ste_container_ci<Name>` — the id is derived from the content item
name, sometimes with a GUID suffix. Do not assume a suffix means a duplicate:
the single Content HTML item in the §15 fixture has its `ContentItemKey`
appended without hyphens. Prefer configured classes for reusable styling.

### Not every iPart renders a panel

- Query template iPart → `.panel` → `.panel-body` → `.QueryTemplateSet`
- Section-buttons iPart → `.ContentItemContainer` → a bare `<div>` → `<p class="HomeDashboardButtons">`
- JS iPart → `.ContentItemContainer` → a bare `<div>` → `<script>`

Don't assume `.ContentItemContainer` implies a card.

---

## 5. Containers nest

The Content Collection Organiser (tabbed iPart) contains **its own
WebPartZones**, which contain iParts, which are themselves panels:

```
.panel (My Tasks)
  .panel-body
    .cco .tabs-wrapper
      .RadTabStrip                    ← tab strip
      .RadMultiPage > .rmpView
        .ContentWizardDisplay
          .row > .col-sm-12
            .WebPartZone              ← a zone inside an iPart
              .ContentItemContainer
                .panel (My Unactioned Tasks)   ← panel inside a panel
```

This is the source of the stacked-heading problem in the findings doc. Assume
arbitrary nesting depth; never write a rule that assumes a panel is top-level.

---

## 6. Content record types

From the Content Designer's own menu config, the document type codes are:

`APC APP BOD BUS CFL COM CON COP CTY DBB DBO DBS IQD LAY MEA MEP NAV NPE OP2
OPP POS RCT RFA RFM SLP SPE SRT WEB WFD XPE`

The ones that matter here:

| Code | What |
|---|---|
| `CON` | Content record (a page) |
| `CFL` | Content folder |
| `LAY` | **Page layout** |
| `NAV` | Navigation |
| `IQD` | IQA / query definition |
| `RCT` / `TCT` | Record / tab content templates |
| `WEB` | Website |

**Layouts are content records** — versioned, publishable, cut/copy/paste-able,
and they live in the same tree as pages. They have a Recycle Bin.

---

## 7. Where authors can inject arbitrary HTML

Three places, all of which can contain hardcoded colours, classes and icon
markup your CSS has to survive:

1. **The HTML/content iPart** — the one you can type into freely.
2. **IQA display templates** — the `{#query.Field}` templates. This is where
   `<i class="fa-solid fa-list-check">` came from on the Workbench page.
3. **Query template content records** — `.QueryTemplateSet` / `.QueryTemplateItem`
   wrap author HTML, e.g. the whole Manage Workbenches banner including its own
   `<style>` block.

Inline `<style>` inside a content record **beats external stylesheets at equal
specificity**, regardless of load order.

### RiSE filters what you save

Per prior project findings: saving a content record **strips `on*` attributes
and decodes HTML entities — even inside `<script>` text**, which can turn valid
JS into a syntax error. The HTML iPart is not a raw passthrough.

---

## 8. CSS hook summary

| Hook | Lands as | Scope |
|---|---|---|
| Theme stylesheet | `App_Themes/<theme>/*.css` | Every page using that theme |
| Page CSS class | class on `<body>` | One page |
| Layout classes/IDs | verbatim in the layout HTML | Every page using that layout |
| Container class | appended to `.WebPartZone` | One zone on one page |
| iPart class | wrapper div inside `.ContentItemContainer` | One iPart instance |
| Content-record HTML | anywhere inside `.panel-body` | One iPart's output |
| Per-instance iPart config | `#JsonSettings` → `/api/ContentItem` | One iPart instance |

**Specificity ladder available to you, cheapest first:**
`.WebPartZone.YourZoneClass` → `.YourIPartClass` → `body.YourPageClass` →
`#MainBody` (nuclear).

---

## 9. Answered (2026-09-05)

**Theme scope — per website.** Each website (UTStaff, UTTemplate, MemberPortal,
…) has its own theme applied to it. Each website can also call scripts and
stylesheets in its header; that is how `UT_Staff.css` reaches UTStaff and
UTTemplate from the CDN.

**Popups and iframes inherit everything** — same master page, same theme, and
the website-level header imports too. A RadWindow popup and the Content
Designer summary pane are the same styling surface as the page behind them.
One surface to get right, not three.

**`constellations.master` is out of scope** — no access to modify it.

**Easy Edit must keep working.** Not yet tested against a new theme. See §13.

**Layout versioning — unknown.** Whether editing a `LAY` record requires
republishing the pages that use it still needs testing.

---

## 10. `UT_Staff.css` is being deprecated into the theme

This project absorbs it. Sizing the job:

- **2,513 lines, 423 rule blocks, 27 `!important`**
- Organised **by page, not by component**. Its own section comments:
  `General Styling · Home Page · Contact Record · Case Module ·
  Staff Site nav icons · Organiser Portal · Manage Workbench Page · Staff Page`
- It contains **entire custom page designs**, not just overrides. The Organiser
  Portal and Contact Page sections each carry a full
  `RESET & BASE / BANNER / TOOLBAR / CONTENT / SECTIONS / DETAIL ROWS /
  ADDRESS / NOTES / EMPLOYMENT / CASES / FILTER BUTTONS / RESPONSIVE` stack.

**The decision this forces.** A theme is normally a *system* — components, not
pages. Absorbing `UT_Staff.css` puts page-specific design inside it. Either:

- **accept it**, and namespace every page block behind its page class
  (`body.OrganiserPortal …`), so page CSS can never leak into the system; or
- **split it** — system into the theme, page designs into per-page content
  records or a second stylesheet.

Decide before porting. The two produce very different files, and the first one
is how a 423-rule sheet becomes an 800-rule sheet nobody can reason about.

---

## 11. HTML-bearing iParts — four escape hatches, not one

Author-written HTML, each able to carry its own `<script>` and `<style>`:

1. **HTML / content iPart**
2. **Query Display templates** — IQA-driven display
3. **Alerts / Notification Sets**
4. **DataShowcase display**

All exist to pull dynamic data (usually from an IQA) into a custom display.
**There are currently too many across the site to enumerate**, and the project
aims to replace them with theme-provided styling.

Two consequences:

- The theme must be **robust against unknown author HTML** — arbitrary classes,
  hardcoded colours, inline `<style>` that outranks it at equal specificity,
  and icon markup for fonts that may no longer be loaded.
- To actually replace them, the theme has to **offer classes good enough that
  authors stop writing their own**. That is a system-design requirement, not a
  styling one: name the components, document them, make them reachable.

---

## 12. Empty and no-content states

**Empty headings — measured, and the real one.** iMIS emits a `__Head` div for
every content item whether or not it has a title. An untitled one is `<div
class="panel-heading">\n\n\t</div>` — whitespace, not nothing, so `:empty`
matches **0 of 4** on the Home page. Any background or border on
`.panel-heading` paints a blank strip on every untitled iPart.

Guard with `:not(:has(*))`, which is live: if script ever injects a title, the
heading styles itself back on.

**"No content found" is a warning, and that is a trap.** When a CCO tab has no
content available, iMIS does not render an empty container — it renders a
message, using the generic warning class:

```html
<div class="rmpView rmpHidden">
  <div class="ContentTabbedDisplay AddPadding">
    <p class="AsiWarning">No content found</p>
  </div>
</div>
```

Four instances on the Home page alone. `.AsiWarning` is styled in UltraWave;
`.ContentTabbedDisplay` in both sheets.

**So an empty state and a genuine warning share one class.** If the theme gives
`.AsiWarning` an alarming treatment — amber fill, icon, border — every empty
tab across the site starts reading as an error. Style it calmly, or
differentiate on the container (`.ContentTabbedDisplay .AsiWarning`) and leave
the standalone warning alone.

**Permissions.** iParts themselves do not carry permissions. Access is
controlled at the **CCO tab / content page** level, and the visible result is
the "No content found" message above — not a silent empty container.

**Empty zones — confirmed 2026-09-06.** `Structure/Blank Page.html` renders all
nine layout zones as whitespace-only `.WebPartZone` divs with Easy Edit off
(`gIsEasyEditEnabled=false`). The layout's rows, columns and surrounding
`.ContentItemContainer` wrappers remain, including hidden download controls.
`legacy/Structure/Elements.html` also retains its unfilled zones 3 and 4.
`.WebPartZoneDesignTimeEmptyZoneText` is a separate authoring placeholder;
these captures do not verify its Easy Edit appearance.

**The rule still holds, for the heading case if nothing else:** don't give a
structural container an unconditional background, border, padding, margin or
min-height unless it cannot be empty.

---

## 13. Easy Edit is a second rendering mode

`gIsEasyEditEnabled` flips the page into authoring mode, and iMIS then injects
chrome that only exists there:

- `.ContentItemButtonPanel`, `.ContentItemActionPanel`,
  `a.EasyEdit-ActionButton`
- `.WebPartZoneDesignTimeAction`, `.WebPartZoneDesignTimeEmptyZoneText`
- a `TemplateAreaEasyEditOn` class added to `<body>` by page script

Several of those carry **colour `!important`s in UltraWave**, which is why they
survive most theming — but layout properties do not.

**The risk:** the theme changes what authors see *while building pages*. If
empty-zone placeholder text goes invisible, or the action buttons lose their
hit area, page building gets materially harder and nobody will connect it to
the theme.

**Test it explicitly.** Enable Easy Edit on a page with at least one empty zone
and one untitled iPart, and check: placeholder text legible, action buttons
visible and clickable, zone boundaries discernible.

---

## 14. Paired layout, page sources and export (2026-09-06)

Evidence in `Structure/`:

- `Layout - OneOverThreeOverOneOverTwo.html` — author-controlled layout HTML.
- `Blank Page.html` — rendered page with no page iParts and body class `BlankPage`.
- `Elements.html` — rendered page with various iParts and no custom page class.
- `Blank_Page_2026-09-06T10_15_59.xml` — one export containing both `CON` records.

**Layout contract, confirmed by the owner:** the HTML is fully configurable
provided it contains numbered paragraph placeholders (`<p>1</p>`, `<p>2</p>`,
etc.) in numerical order. The Bootstrap grid in this example is an authoring
choice, not a requirement. New layouts can use their own markup and classes
around those placeholders.

This file actually contains nine placeholders across five rows: full width;
three thirds; full width; two halves; two more halves. Each placeholder is
replaced with a `.ContentItemContainer` containing `#WebPartZoneN_Page1` and
hidden download controls. The surrounding layout HTML remains.

### Export definition and placement

The exported `Blob` is Base64 text. Decoding its bytes as UTF-8 yields a
readable XML `Content` definition; this is the exported representation of the
binary definition described by the owner. Both pages reference
`LayoutDocumentVersionKey` = `19d98162-2813-4733-b64b-f2dd226d98ad`.
The export contains the two pages, not a separate `LAY` definition.

- `PageWrapperCssClass` is `BlankPage` for Blank Page and empty for Elements,
  matching their rendered body classes.
- `ContentItems` is empty for Blank Page and contains eight items for Elements.
- Each item records `LayoutZone`, `SortOrder`, its name and type, and
  type-specific configuration. Common iPart CSS classes appear as `CssClass`;
  HTML iParts can also supply their own markup.

| Zone | Elements page content, in order |
|---|---|
| 1 | AddWorkbench (QueryTemplateDisplay), DesignTokens (ContentHtml) |
| 2 | Summary_OutstandingTasks (ProgressTracker) |
| 3 | Empty |
| 4 | Empty |
| 5 | WorkbenchList (QueryMenu) |
| 6 | Workplace Delegates (QueryTemplateDisplay) |
| 7 | MyTasks (ContentCollectionOrganizerCommon), rendering a nested zone/panel |
| 8 | Membership_1 (PanelEditorCommon), wrapped in `.CalloutPart2` |
| 9 | Copy of Membership_1 (PanelEditorCommon), without a custom wrapper class |

The two membership panels provide a direct example of configuration changing
wrapper depth. The blank page provides an empty-zone baseline. Together these
are structural fixtures for theme work; they do not establish visual or Easy
Edit compatibility without further testing.

---

## 15. Named zone and iPart settings traced end to end (2026-09-06)

Evidence: `Structure/Copy of Blank Page.html` and
`legacy/Structure/Copy_of_Blank_Page_2026-09-06T10_30_52.xml`, plus the owner's
configuration screenshots. This page retains body class `BlankPage` and puts
two iParts in zone 5. The updated export/source supersede an earlier capture
whose zone properties had not saved due to a bug reported by the owner.

### Zone properties

The decoded page definition stores these in `LayoutZoneProperties` as
string key/value pairs, keyed by the placeholder number:

| Configuration | XML key | Value | Rendered location |
|---|---|---|---|
| Title | `5_Title` | `ZoneTitle` | Text of `#ctl01_TemplateBody_WebPartZone5Header` |
| Title CSS class | `5_TitleCssClass` | `TitleCSSClass` | Class on that header div |
| Zone CSS class | `5_CssClass` | `ZoneCSSclass` | Appended to `#WebPartZone5_Page1.WebPartZone` |

**The zone title is outside the zone**, preceding its outer
`.ContentItemContainer` as a sibling within the layout column:

```html
<div class="col-sm-12">
  <div id="ctl01_TemplateBody_WebPartZone5Header" class="TitleCSSClass">ZoneTitle</div>
  <div class="ContentItemContainer">
    <div id="WebPartZone5_Page1" class="WebPartZone ZoneCSSclass">
      <!-- Both iParts render here -->
    </div>
    <!-- Hidden download controls -->
  </div>
</div>
```

Consequently `.ZoneCSSclass .TitleCSSClass` cannot target the zone title.
Use its configured title class, optionally scoped by page or layout. It is a
plain div, not a `.panel-heading` or semantic heading element.

### Query Menu — zone 5, sort order 1

| Configuration | Definition field | Rendered location |
|---|---|---|
| `SearchContactsName` | `ContentItemName` | `ste_container_ciSearchContactsName` and generated control IDs |
| `Search Contacts Title` | `PartTitle` / `PageTitle` | `h2.panel-title` inside `.panel-heading.Distinguish` |
| Heading level 2 | `PartTitleHeadingLevel` | The `h2` element |
| `Search Contacts Description` | `PartDescription` | Child div of `.panel-description`, between heading and body container |
| `SearchContactsClass` | `CssClass` | Wrapper around the iPart's `.panel` |

The query filters themselves include a nested `.panel.FilterPanel`. This is
another reason not to assume every descendant panel is a separate card.
`ShowTitleFlag` is false in this export despite the visible title; it is not
sufficient by itself to predict this iPart's title rendering.

### Content HTML — zone 5, sort order 2

- `ContentItemName`: `ContentHTMLName`.
- `CssClass`: `ContentHTMLClass`, rendered as a wrapper inside
  `.ContentItemContainer`.
- `Body`: `Content HTML Exmaple`, rendered inside a plain div whose ID ends
  in `_Panel_ContentHTMLName`.
- `ShowBorder`: false. This fixture emits no `.panel`, `.panel-heading` or
  `.panel-body` for the Content HTML item.
- Its outer ID is `ste_container_ciContentHTMLName_4b2f582d2f8b4a9ea4c3d7b5e1bb2ae1`;
  the suffix matches its `ContentItemKey` without hyphens.

The two items are siblings, each enclosed by `.iMIS-WebPart`, within zone 5.
The configuration screenshots also show the authoring interface, but do not
constitute a completed Easy Edit compatibility test for the replacement theme.

---

## 16. Planned header actions from iPart classes (agreed 2026-09-06)

The owner approved a central theme JavaScript feature that injects a registered
header action when its action class is present on an iPart. Example:
`us-report us-action-create-case` on a Query Menu with Title `Cases`.

The action class selects a registered behaviour and its default button or
text-link treatment; the panel presentation class selects panel styling.
This lets a report and its action be authored as one iPart, replacing the
separate HTML header/button iPart used in existing examples. The script will
preserve native headings, descriptions and report controls, and bind each
action to its owning iPart and verified member context.

Header actions must support both treatments, including an Add Note button in
Pinned Notes and a View Full Profile text link in Contact Summary. Mixed actions
share the header container, with appearance defined per action. Navigation uses
a real anchor; popup/in-page commands use appropriate button/native-control
semantics even when styled as text links. The actual iPart adapters and profile
destination/section-switch behaviour still need verification.

Action markers belong on the **iPart wrapper**, not a zone or page. Grouped
sections need explicit local toolbar placement when their child headings are
suppressed; actions must not be moved into a zone title implicitly.

See [Theme panel actions — implementation plan](THEME-PANEL-ACTIONS.md) for
the class contract, registry, placement, lifecycle, refresh policy, authoring
behaviour and acceptance cases. This is an agreed plan, not a feature observed
in the captured HTML. The shared report utilities and action slot are now
implemented (§18); named business-action injection is still planned.

---

## 17. Planned combined activity feed (2026-09-06)

The owner wants to combine records from separate Calls, Emails, Notes, Meetings
and SMS Query Template Display iParts into one recent-activity block. Shared
theme styling provides the container and cards; an optional module in the
central JavaScript file assembles and sorts marked template items. Queries and
record mappings remain configurable, with record/date filters and result limits
applied before rendering.

Proposed authoring uses `us-activity-feed` on a dedicated zone,
`us-activity-source` on each participating iPart and common per-item identity,
type and timestamp metadata in the templates. The zone title needs its own
`us-activity-feed-title` class and a verified association to the group because
it sits outside `.WebPartZone` (§15). Preserve native wrappers and authoring
controls; suppress duplicate source presentation only after successful assembly.

Initial scope is a bounded recent list, loaded-item filtering and a full-history
link. It does not claim to solve query performance by rearranging HTML, or provide
complete-history search, true totals or combined paging without additional
data-loading work. See [Combined activity feed — feature plan](THEME-ACTIVITY-FEED.md)
for ownership, metadata, performance, lifecycle and acceptance criteria.
This feature is documented for implementation and is not yet available in the theme.


## 18. Implemented Union Suite IQA report classes

The approved report component now lives in `Theme/UnionSuite/zUnionSuite.css`
and `Theme/UnionSuite/zUnionSuite.js`. See the [installation guide](../Theme/UnionSuite/README.md)
for the shared script include and removal of the old standalone embed.

Enter the following in the Query Menu iPart's **CSS class** field, with no dots:

| Setting | Class |
|---|---|
| Report presentation and standard header utilities | `us-report` |
| Enable a filter toggle, initially expanded | `us-filters-collapsible` |
| Start filters collapsed; also requires the toggle class | `us-filters-collapsed` |
| Enable Expand/Restore for the supported native grid | `us-report-expandable` |
| Legacy alias for the base report class | `SearchContactsClass` |

Example with closed filters and expansion:

```text
us-report us-filters-collapsible us-filters-collapsed us-report-expandable
```

The base class belongs on the individual iPart wrapper demonstrated in §15,
not on the zone or page. Native Title, Description and heading-level settings
still supply the header. Query-folder selectors are detected from their native
markup, so they need no extra class. A user's filter preference is remembered
per browser tab until a query/default-state change resets it.

This contract covers Query Menu IQA reports. Query Template Display cards,
trackers, banners, grouped panels and the planned combined feed need their own
adapters. `us-action-*` business-action classes remain planned; the theme supplies
their shared header slot and button/text-link styling only.

## 19. Banner iPart and page classes — shared theme CSS and JS

The banner supports both Query Template Display (one current-record result)
and Content HTML (static content), using the same template HTML and classes.
See the [banner usage guide](../Theme/UnionSuite-Guides/usage/examples/Banner-README.md) and
[behaviour-only embed](../Theme/UnionSuite-Guides/usage/examples/Banner-Shared-Styles.html). All banner CSS is
now in `Theme/UnionSuite/zUnionSuite.css`, in separate page-layout and component
sections. Sticky/collapse and Actions are now in `zUnionSuite.js`, sharing the
report include. Deploy and load the updated theme assets, retire old standalone
banner includes, then reload and verify behaviour. Keep the visible HTML. The
legacy embed/standalone JS are generated fallbacks for older sites only.

| Configuration | CSS class value | Result |
|---|---|---|
| Banner iPart | `us-banner` | Normal expanded banner that scrolls away |
| Banner iPart | `us-banner us-banner-sticky` | Expanded banner stays visible |
| Banner iPart | `us-banner us-banner-collapsible` | Banner stays visible and condenses on scroll |
| Page | `us-banner-page` | Full-width banner layout using native row gutters |

**Collapsible includes sticky.** There is no separate non-sticky scroll-collapse
mode. Combining both modifiers is supported but redundant. Enter the class
values without leading dots, on the iPart displaying the banner, not the asset
embed or zone. The page class affects layout only; sticky/condensing needs the
behaviour script as well as a banner iPart modifier.

As in §4, the configured iPart class lands on a wrapper directly inside its
owning `.ContentItemContainer`. Behaviour discovers that wrapper independently
of the page grid's nesting. The full-width CSS adapter still targets the
captured top-level `col-sm-12` layout. Native columns supply the half-gutter via
`--bs-gutter-x`; other content retains its padding automatically.

The [copy/paste banner template](../Theme/UnionSuite-Guides/usage/templates/Banner-Template.html) now includes
optional `us-banner__actions` and `us-banner__nav` HTML blocks. Delete either
complete div to omit it; no extra iPart class is required. The Actions
disclosure is implemented, while individual command handlers still need
verified integrations. Tab styling is implemented, with content switching
planned in [Banner-Tabs-Plan.md](../prototypes/wip/banner-tabs/Banner-Tabs-Plan.md). The proposed
zone/CCO source classes and tab mappings there are not active theme features yet.

For lightweight dashboards, the owner prefers tabs tied to ordinary page zones:
the current CCO setup reloads the whole page when navigating. The first planned
adapter will match banner keys to Zone CSS classes such as
`us-tab-panel us-tabset-membership us-tab-overview`. Multiple zones may share
one tab key; unmarked zones remain visible. Selection changes visibility of
already-rendered content and should not cause a page reload or query rerun.
All participating queries still run on initial load. As verified in §15, zone
titles live outside `.WebPartZone`; the adapter must handle their association
and unused grid space without hiding unrelated content. CCO remains a separate
adapter for pages that intentionally retain its native navigation behaviour.

## 20. Author handbook and documentation maintenance

The maintained [Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html) is a
standalone offline HTML document. It combines installation, the seeded branding
model, searchable tokens/classes, iMIS configuration placement, banner templates,
report recipes, interaction examples and troubleshooting. Its optional project
links require the surrounding files; its core content and snippets do not.

The guide distinguishes three authoring layers: `us-banner-page` belongs on the
page body, `us-banner` / report modifiers belong on the iPart's configured wrapper,
and `us-banner__*` classes belong inside authored template HTML. The supported
prefix is `us-`; `ut-banner-sticky` is not an alias. Runtime classes and markers
are script-owned and are not author settings.

The template library includes the [complete banner](../Theme/UnionSuite-Guides/usage/templates/Banner-Template.html),
[static dashboard](../Theme/UnionSuite-Guides/usage/templates/Banner-Dashboard-Template.html) and
[Contact](../Theme/UnionSuite-Guides/usage/templates/Banner-Contact-Template.html). Bracketed values in the latter
are author placeholders; replace them with the actual query field substitutions.
The shared script and generated legacy fallbacks contain no record-specific data. Query Menu reports
continue to use native configuration and HTML rather than a replacement grid.

Edit guide prose in `Theme/UnionSuite-Guides/usage/source/Usage-Guide.source.html` and keep these
structural notes current when a verified wrapper or authoring contract changes.
Run `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs` and then the same command with `--check`.
The generator imports tokens and banner snippets from their maintained sources;
The five-seed editor injects validated overrides into the guide and all
component previews, including the combined banner/button/report sample. Copy or
download its CSS for the client stylesheet; edits do not write files. The build
does not infer documentation for newly introduced behaviour. See
[the maintenance workflow](../Theme/UnionSuite-Guides/usage/source/README.md).

## 21. Outer row gutter gotcha

Native `.row` has negative horizontal margins, balanced by the containing
layout's padding and half-gutter column padding. UltraWave defines
`--bs-gutter-x:30px`; project `99-Orion.css` keeps a `40px` default for ordinary
rows, producing `margin-left/right:-20px`. Standard page-layout rows now use
`24px`, producing `-12px` margins and 12px column padding. Removing horizontal shell padding can widen the
whole page even when its wrappers have `width:100%` and `max-width:100%`.

The 24px rule matches `.ContentPanel`, `.ContentWizardDisplay` or
`.EmptyMasterContentPanel` followed by a direct layout div and row. The row must
own at least one column with `.ContentItemContainer > .WebPartZone`. This covers
standard page and native CCO layouts without matching ordinary form/filter rows,
or arbitrary component grids. iPart class wrappers sit below that zone chain.
Empty zones work without JavaScript; rows added during a partial render receive
the same CSS. Opt-out on the row or an ancestor (`us-report-no-styling`) retains
the default. Custom layouts without this chain keep their existing gutter.
No new author class is needed. Card padding and vertical iPart margins are unchanged.
Banner breakout and text insets consume the nearest row's actual gutter.

The supplied native CCO structure includes
`.RadMultiPage > .rmpView > .ContentWizardDisplay > div > .row`.
Its content panel padding shares the row's document and accommodates the
negative margins. Content embedded in an iframe cannot use that padding:
padding outside the iframe cannot balance rows inside the child document, and
`#MainPanel .EmptyMasterContentPanel` has no horizontal padding. A local replay
for the retired custom CCO iPart, with UltraWave, Orion and shared CSS, confirmed a
984px child viewport with a 1024px outer row spanning −20px to 1004px under the
earlier 40px default. With the 24px page-layout gutter, the same unbalanced layout
would still have a 1008px row from −12px to 996px.

Correct the layout boundary that owns the row: retain balancing parent padding,
or clear only the unbalanced outer row margins. Never reset all `.row` gutters,
strip all column padding or hide overflow to conceal an oversized layout.
Nested iPart/field rows have their own padding contract; wide reports can keep
intentional internal scroll regions. Inspect rendered class wrappers before
choosing selectors. Measure the child document and any scrollable shell using
`scrollWidth` versus `clientWidth`; inspect row edges and computed parent padding.

The retired custom CCO iPart corrected this in the stylesheet it injected into the
child document, clearing only the outer
`:is(.ContentWizardDisplay, .ContentPanel, .EmptyMasterContentPanel) > div > .row`
margins outside iPart/grid/popup components, not with a global theme gutter reset.
Its research is retained in
[the CCO feature research](../prototypes/wip/cco-inline-loading/research/custom-iframe-ipart/README.md); the
implementation is archived locally. See the
[theme gotcha](Theme/UnionSuite-Guides/Usage-Guide.html#outer-row-gutters).
