# Banner and standalone tab integration

**Implemented:** option 6 standalone submenus, 6B banner navigation and the opt-in page-sections adapter. See the usage guide section-switcher section and references/Section-Switcher.html for working examples. The adapter uses explicit owners, supports nested groups and multiple sibling panels per key, preserves values, and restores visibility if the mapping becomes invalid.

**Still planned:** automatic native zone/title/layout ownership discovery and a native CCO adapter. The implementation deliberately does not infer these. The design plan below is historical; its claims that all switching is deferred are superseded by this status.

---

# Banner tab switcher — template and integration plan

A working standalone preview is now available at [Standalone-Tabs-Preview.html](../../../references/Standalone-Tabs-Preview.html). It demonstrates local section switching, keyboard navigation, retained values and optional sticky navigation. Native iMIS zone integration is still deferred. The owner will return to
the switcher later. The [project TODO](../../../TODO.md) records the agreed scope and
resume checklist; retain the current visual-only template until then.

Status: the visual row is available in [Banner-Template.html](../../../Theme/UnionSuite-Guides/usage/templates/Banner-Template.html),
with shared styling in [zUnionSuite.css](../../../Theme/UnionSuite/zUnionSuite.css).
The row remains visible in the expanded and compact banner. The reusable
template's tab buttons are deliberately disabled until a content adapter is
connected. No CCO controls are hidden and no real sections are switched yet.

The [standalone Theme Usage Guide](../../../Theme/UnionSuite-Guides/Usage-Guide.html) includes
the visual template and a summary of this plan. When an adapter is implemented,
update both documents with the verified source classes, mappings, keyboard
behaviour, postback recovery and fallback. The guide's snippets are imported from
the maintained banner files; keep the template's disabled state aligned with the
actual integration status.

The owner prefers tabs connected directly to ordinary page zones for lighter
dashboards. In the owner's current CCO configuration, navigating tabs reloads
the whole page. The preferred first implementation is therefore a client-side
`page-sections` adapter. A native CCO adapter remains a separate option for
pages that deliberately retain CCO; it must not be presented as a way to remove
CCO's existing reload behaviour.

## 1. Keep the template small

The author keeps or deletes one `us-banner__nav` div. Keeping it does not require
another banner iPart class. Add, remove, rename or reorder buttons in that block.

```html
<div class="us-banner__nav" data-us-tabs="record">
  <div class="us-banner__tabs" role="group" aria-label="Record sections">
    <button type="button" class="us-banner__tab is-active"
            data-us-tab="overview" aria-current="true" disabled>Overview</button>
    <button type="button" class="us-banner__tab"
            data-us-tab="activity" disabled>Activity</button>
  </div>
</div>
```

`record` identifies the tab set; `overview` and `activity` identify tabs within
it. They must be unique within their respective scope. Labels are presentation,
so changing “Overview” to “Summary” must not break the mapping. Each banner
instance pairs with one explicit source, never the first tab strip on the page.

## 2. Prefer page zones for lightweight dashboards

Render the dashboard's zones normally on the initial page load. A banner tab
then shows its matching zones and hides the other zones in that tab set. The
switch itself should not submit the form, request a new page, reload IQAs or
invoke CCO. The banner remains mounted and keeps its compact/expanded state.

An author chooses a stable group key, for example `membership`, and tab keys
such as `overview`, `activity` and `tasks`. The existing template can supply
those keys without adding another banner iPart class:

```html
<div class="us-banner__nav" data-us-tabs="membership">
  <div class="us-banner__tabs" role="group" aria-label="Membership sections">
    <button type="button" class="us-banner__tab is-active"
            data-us-tab="overview" aria-current="true" disabled>Overview</button>
    <button type="button" class="us-banner__tab"
            data-us-tab="activity" disabled>Activity</button>
    <button type="button" class="us-banner__tab"
            data-us-tab="tasks" disabled>Tasks</button>
  </div>
</div>
```

Proposed **Zone CSS class** values, without leading dots:

| Page zone | Class value | Visible with |
|---|---|---|
| Membership figures | `us-tab-panel us-tabset-membership us-tab-overview` | Overview |
| Membership trends | `us-tab-panel us-tabset-membership us-tab-overview` | Overview |
| Recent activity | `us-tab-panel us-tabset-membership us-tab-activity` | Activity |
| Outstanding tasks | `us-tab-panel us-tabset-membership us-tab-tasks` | Tasks |

These are planned hooks, not active theme features. Buttons remain disabled in
the current visual template. The future adapter should pair keys automatically;
ordinary zone switching should not require a custom JavaScript map for each page.
One tab can control several zones, each with its normal collection of iParts.
Zones with no tab membership remain visible across all tabs. Each participating
zone belongs to one group and one tab; invalid or ambiguous mappings fail open.

### Titles, layout and native controls

Zone titles are rendered outside `.WebPartZone`. Resolve the owning zone wrapper
and its title from verified layout metadata or an explicit association; hide/show
both together. A title outside the zone cannot be handled by a descendant rule.
Likewise, hiding content inside a grid column must not leave an empty reserved
column or row. Collapse an owning layout container only when all of its relevant
content belongs to inactive panels. Keep shared/unmarked content in place. Inspect
one real dashboard layout to establish that adapter before applying broad rules.

Authors should not need a new wrapper around every zone or a separate iPart for
each tab. Reuse the native layout where ownership is unambiguous. Preserve iPart
nodes, form ownership, handlers, filter values and entered data. Show/hide the
existing content instead of replacing it. Check charts and native grids that were
initialized while hidden; run a verified resize/reflow hook when shown if needed,
without triggering a data reload just for tab selection.

### Loading and fallback

All participating zones are initially rendered and their queries still run.
This makes tab changes immediate but does not reduce the first page's content or
query workload. It suits the owner's lighter dashboards. Content-heavy pages may
need a separate loading strategy; lazy loading is not part of this adapter.

Use no unconditional CSS to hide the proposed zone classes. Hide inactive zones
only after successful pairing and initialization. If the script is unavailable,
mapping fails, Easy Edit is enabled, or the optional banner nav is removed,
release adapter-owned visibility and leave the normal page content available.
Visibility is not access control; retain the existing page/iPart permissions.

## 3. Keep native CCO as a separate adapter

For a page that intentionally uses CCO, let the Content Collection Organizer own content loading, native
selection, tab availability and page access. Keep its native tab strip intact
until the banner adapter is successfully connected. This follows the documented
[nested CCO structure](../../../docs/IMIS-CMS-STRUCTURE.md#5-containers-nest).

Proposed CCO iPart CSS classes:

```text
us-tabs-source us-tabset-record
```

The suffix `record` pairs with `data-us-tabs="record"`. These source classes are
**planned**, not implemented. They belong on the CCO iPart rather than a child
report, the page body or the banner. Multiple sources claiming the same key
should produce a diagnostic and leave native navigation available.

Before implementing, capture the actual configured CCO HTML and inspect its
Telerik client object: stable tab values, selected state, disabled/hidden items,
page-view association, selection events and whether selection triggers a full
or partial postback. The current project establishes `.RadTabStrip` /
`.RadMultiPage` structure but does not establish those instance-specific values.

## 4. Map CCO keys to verified native tab values

Keep one small mapping per tab set in shared configuration, separate from CSS
and HTML. Illustrative configuration shape:

```js
{
  key: "record",
  adapter: "imis-cco",
  sourceClass: "us-tabset-record",
  tabs: {
    overview: "<verified native tab value>",
    activity: "<verified native tab value>",
    tasks: "<verified native tab value>",
    documents: "<verified native tab value>"
  }
}
```

This is a proposed schema, not a working API. Avoid mapping by label text,
tab index or a guessed generated control ID. If the actual CCO supports stable
values identical to the authored keys, the mapping can become automatic.

On activation, ask the native control to select its associated tab through the
verified native mechanism. Reflect the resulting native selected state back
into the banner, including selection changes made elsewhere. Do not simulate
selection merely by changing `.is-active` or hiding `.rmpView` elements.

The source is authoritative for availability: unavailable tabs must not become
usable because a button exists in authored HTML. UI filtering is not access
control; retain native page/content permissions and server-side checks.

## 5. Keep adapter ownership explicit

Pair each banner tab set with either its marked page zones or an explicitly
configured CCO source. Do not attach both adapters to the same key, and never
treat CCO page views as ordinary page zones. If discovery is ambiguous, leave
the native content/navigation usable and report a diagnostic. Separate tab sets
must not hide one another's zones. Plain navigation to other pages should use
real anchors instead of either adapter.

## 6. Shared interaction and lifecycle

After validating all source mappings, enable connected buttons and provide
appropriate tab semantics: `tablist`, `tab`, `tabpanel`, unique IDs,
`aria-controls`, `aria-labelledby`, `aria-selected` and roving `tabindex`.
For sources that cannot supply true tab-panel semantics, retain navigation
semantics instead of inventing panel relationships.

Arrow keys and Home/End move focus. Enter/Space activates; avoid automatically
loading a potentially slow CCO page merely because keyboard focus moved.
Scroll the focused tab into view in the horizontal row without moving the page.

Keep the banner mounted outside the content being switched. The tabs remain
visible while the details condense. When changing sections while scrolled,
bring the selected section's start into view below the current compact banner;
do not force expansion or jump to the very top. Respect reduced motion.

For page sections, select a valid authored initial tab (the `is-active` item),
falling back to the first connected tab. Preserve the selected key during a
partial refresh of the same page/record; a removed or unavailable key falls back
to a valid tab. Cross-visit persistence and URL/deep-link behaviour are separate
decisions, not implicit requirements of a basic dashboard switcher.

For CCO, use its native initial selection and any existing deep-link behaviour.
Avoid introducing a second conflicting persistence mechanism. Any future saved
preference must be scoped to the page, record and tab set.

Hook the existing ASP.NET lifecycle. Detach source handlers before replacement,
reconnect after updates, and avoid duplicate listeners. If pairing fails or the
banner tab div is deleted, show ordinary zone content or restore native CCO
navigation as appropriate and release adapter-owned state. Easy Edit should
retain native controls and expose all authoring areas. Handle focus before hiding
a panel so keyboard focus cannot remain inside invisible content.

## 7. Implementation order and acceptance

1. Inspect one lightweight dashboard's zones, title associations and grid wrappers.
2. Implement `page-sections` with class/key pairing, multiple zones per tab and
   no page reload or new query caused by selection.
3. Add keyboard semantics, focus handling, layout collapse, hidden-widget reflow,
   Easy Edit and ASP.NET refresh recovery.
4. Verify failure/removal fallback and document the proven zone-class recipe.
5. Add the CCO adapter separately when a page needs it, after confirming its
   native selection API and reload behaviour. It is not a dashboard prerequisite.

Verify mouse/keyboard operation, long labels and mobile overflow, unavailable
tabs, empty content, record changes, full/partial postbacks, browser back/deep
links where supported, multiple tab sets, missing/deleted optional markup and
Easy Edit. Also verify multiple zones per tab, unmarked shared zones, matching
titles, no empty layout gaps, retained form/filter values and no document request
or query rerun caused by zone-tab selection. A failed adapter must leave the page
content or native navigation usable. Do not hide a CCO strip before its own
integration checks pass on the real page.

The visual template can be used now; direct zone switching is the next planned
implementation for lightweight dashboards. No tab-switching code is active yet.
