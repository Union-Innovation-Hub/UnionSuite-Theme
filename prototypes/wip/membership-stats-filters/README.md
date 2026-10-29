# Membership Stats: click-to-filter

Status: WIP visual/interaction mockup. Not implemented in the shared theme.

The current Stats cards (`Theme/UnionSuite-Guides/usage/templates/Home/Stats/`)
are read-only. This mockup brings back click-to-filter: selecting a member
category, membership type, financial status or gender recalculates every card.

## Behaviour

- **Member category:** click a table row. **Membership type** and **Gender:**
  click a bar row. **Financial status:** click a legend row. Click the selected
  row again to clear it.
- Filters combine across dimensions, e.g. Billing Category 1 + Financial.
- Tracker bar shows the fully filtered figures. "Total members" becomes
  "Selected members", with its share of all current members.
- Each breakdown card ignores its own filter and applies the others. All of its
  options stay visible: the selected row is highlighted and the rest are dimmed.
  Each card heading names the filters that apply to it.
- Filter chips sit under the page heading. Each chip removes one filter;
  "Clear all filters" appears when two or more are set. Escape clears everything
  (when the filter panel is open, Escape closes the panel first).
- **Filter panel:** the funnel button at the top right slides a panel in from
  the right (220ms in, 180ms out, matching the theme's Where used drawer;
  instant with reduced motion). It holds one radio group per dimension, each
  with All and a count per option. Counts follow the cards: a group ignores its
  own filter. Panel and cards share one filter state, so either can be used.
  The funnel shows a badge with the number of filters applied. The footer has
  Clear all and "Show N members", which closes the panel.
- The panel is non-modal: the report stays usable and updates live behind it.
  It closes with ×, Show N members, the funnel button or Escape, and focus
  returns to the funnel button. Outside clicks leave it open.
- Each option is a real `<button aria-pressed>`, stretched over its row. Filter
  changes are announced in a polite live region.
- **Membership trend** shows mock six-month history for the current filters:
  a month-end members line (Sept dashed as month to date) and joined vs resigned
  columns. Hovering a month highlights it in both charts and shows a tooltip.
  "Show table" swaps the charts for the same figures as a table. Resigned orange
  is under 3:1 contrast, so the table view is required, not optional.

## Files and preview

Maintained files: `index.html`, `filters.css`, `filters.js` and
`build-standalone.cjs`. Card styling comes from `Theme/UnionSuite/zUnionSuite.css`.
`filters.css` holds only the page layout, the selected/dimmed/chip states, the
trend charts and the filter panel.

Layout: Membership trend and Financial status share a 2:1 row; Membership type
and Gender sit side by side below; the member category table is full width.

Serve the repository root and open `/prototypes/wip/membership-stats-filters/`.
For example, use the `static-node` entry in `.claude/launch.json` (port 8778).

### Single-file copy

`Membership-Stats-Filters-Standalone.html` is the whole mockup in one file
(theme CSS, `filters.css` and `filters.js` inlined) that opens from disk, to
share or to keep working from. It is generated and ignored by Git: edit the
maintained files, then from this folder run:

```text
node build-standalone.cjs
node build-standalone.cjs --check
```

## Sample data

`filters.js` generates a seeded (repeatable) sample across six categories, four
membership types and three financial statuses. Each cell is then split into
Female, Male, Non-binary and (empty) gender with whole-number shares that keep
every total, so the other figures are unchanged by the gender split. Only the 83,091 total matches the
23 September 2026 Stats page. Each cell has monthly joins and resignations for
Apr–Sept. Resignations peak in June (end of financial year). Month-end counts
are worked backwards from current members.

## Open decisions

- **History source.** Live history still depends on the CloudToolz
  MonthEnd/MemberCount snapshots. Filtering the trend needs those snapshots per
  category, type, status and gender, or joins/resignations by month to work backwards from.
- **Data source.** The live IQAs return one-dimensional counts, so they can't be
  cross-filtered. Options:
  - one cross-tab IQA grouped by category, type, financial status and gender (plus
    joined/resigned equivalents), filtered client-side as in this mockup; or
  - optional GroupCode / CategoryCode / FinancialStatus / Gender parameters on the
    existing IQAs, re-queried on every click.
- **Table footer.** Should it keep the column total, or show the selected row
  against the total?
- **Tracker shortcuts.** Should the Financial members metric also act as a
  filter shortcut?
- **Sharing a view.** Should filters persist in the URL hash so a filtered view
  can be linked?
- **Gender values.** The sample uses Female, Male, Non-binary and (empty).
  Confirm the site's actual Gender values and whether blanks show as (empty)
  or "Not recorded".
- **Panel vs row clicks.** Keep both ways to filter, or move to the panel only?
