# List search and paging: search everything, keep your place

**Status: approved (owner, 10 October 2026), not implemented.** Pick up in a new
session. This is a shared-theme change: `US-QUERY-SEARCH` and `US-ACTIVITY-FEED`
in `Theme/UnionSuite/zUnionSuite.js` and `zUnionSuite.css`, with the usage guide
updated in the same change (`AGENTS.md`, Guide workflow).

## Problem

Lists page and search in ways that fight each other.

**Query Template lists** (tasks, attachments, meetings, staff, parties). iMIS
renders every result into the `QueryTemplateSet`, then its `simplePaginate`
plugin hides all but 30 sections per page with `display: none`. The theme's
search and completed filter (`filterQueryResults`, US-QUERY-SEARCH) skip any row
that is `display: none`, so:

- search only covers the current page ("Searches the results on this page");
- completed tasks hidden by the filter still take page slots, so a page of 30
  can show 5 tasks, and the page numbers count rows nobody can see;
- a row added in place (US-INLINE-COMPOSER, C40) upsets the page counts, and is
  not placed on the right page.

**The timeline** (US-ACTIVITY-FEED). Each source IQA is asked for 20 rows at a
time (newest first) and more load on Show more. Search covers the loaded rows
only, and says so. A note older than what is loaded cannot be found.

**Finding something and then seeing it in context** is not possible in either:
clearing the search returns the list to where it was, and the record found is
lost again.

## Decisions (owner, 10 October 2026)

- **Query Templates: Option B, "keep your place with context".** The worked
  example the owner signed off:
  1. The timeline (or list) shows the top 10 records of 100.
  2. The user searches and finds note #60.
  3. They click note #60.
  4. They clear the search.
  5. Notes 1–10 still show; then a gap marker, "46 notes hidden · Show"; then
     notes 57–63 with #60 scrolled into view and briefly highlighted; then
     Show more, continuing from 63.

  "Option B is perfect." Rejected: Option A, extending the list to reach the
  record (1–63 all showing), as heavy, and a results header with page numbers
  and jump-to-page, as unnecessary once the place is kept.
- **Timeline: hybrid (Option 3), with "load everything" behind the button
  (Option 1).** Search the loaded rows at once; when more could match, the
  status offers "Search everything", which loads the rest of every source in
  the date range and searches them in the browser. Server-side search (each
  source IQA given a Search filter, Option 2) is deferred: it can later replace
  what the button does, for very long timelines, without changing what the
  user sees.

## The behaviour

### Query Template lists (US-QUERY-SEARCH)

1. **The theme pages, not `simplePaginate`.** Every row is already in the page,
   so the theme filters first (the completed filter, the search) and then shows
   the matching rows a page at a time with **Show more**, the same control as
   the timeline. The page size is the iPart's own (the theme already reads it
   from the iMIS `simplePaginate` script: `pagination()` in US-ACTION-REFRESH).
   `simplePaginate` is switched off for sets the theme pages.
2. **Search covers every row** and, while there is a query, **shows every match**
   (no Show more limit). The status counts across the whole list:
   "3 of 48 results", not "on this page".
3. **A filter that hides matches says so.** For example
   "3 matches · 2 more in completed tasks", with a one-click Show. A search that
   finds nothing because of a filter must never look like "no results".
4. **The touched record.** While searching, the record the user last clicked,
   opened or focused is remembered. If the search had exactly one match, that
   match counts as touched.
5. **Clearing the search keeps the touched record in view with context:**
   - the list returns to its previous Show more depth (the user's own top rows
     stay put);
   - the touched record shows with **three rows either side**, as an island;
   - between the top rows and the island, a **gap marker**: "46 tasks hidden ·
     Show" (the noun follows the list: notes, tasks, attachments…), which folds
     the hidden rows in when pressed;
   - the record is scrolled into view (to the middle of the view, not the edge)
     and briefly highlighted;
   - Show more after the island continues from its last row.
   If the island touches the top rows, there is no gap; they simply join.
6. **The gap goes away** when it is pressed (it fills in), when a new search
   starts (islands are replaced), or when the list is reset (type, date range,
   Show completed changed).
7. **The snap never changes the user's filters.** If the touched record is
   hidden by a filter the user changed after touching it (for example Show
   completed turned off), there is no snap; a short line says where it went
   ("That task is hidden while completed tasks are hidden · Show").
8. **Rows added in place** (C40: holding row, quiet page read) take their place
   under the theme's paging: re-run the pager after inserting, so a new row is
   always visible where it lands, never on a hidden page.
9. Motion follows `AGENTS.md`: gaps and islands fold with
   `UnionSuiteRecordCards.fold` (220ms, `cubic-bezier(.2, 0, 0, 1)`); reduced
   motion makes every change instant.

### Timeline (US-ACTIVITY-FEED)

1. **Typing searches the loaded rows at once**, as now.
2. **When more could match** (any source in the chosen type and date range
   still has unloaded rows), the status says how much was searched and offers
   more: "3 matches in the latest 60 · Search everything".
3. **Search everything** loads the remaining pages of every relevant source
   (the chosen type, the date range) in parallel, showing progress in the status
   ("Searching… 140 of 230", from the sources' totals), then searches them in
   the browser with the existing matching (type words, follow-up notes, opened
   details). The loaded rows stay loaded afterwards (the feed is simply deeper).
4. **Islands work exactly as for Query Templates** (above): once everything up
   to the touched record is loaded, the feed knows the full order, so it can
   show the top rows, "46 notes hidden · Show", the island around the touched
   record, then Show more. Month headings already give a sense of position.
5. A source that fails during Search everything is reported, never counted as
   zero (the feed's existing rule).
6. Very long timelines (a contact's whole history) may make Search everything
   slow; that is the trigger for Option 2 later. Consider a sanity cap (for
   example 2,000 rows) with a clear message.

## Implementation plan

1. **US-QUERY-SEARCH paging.**
   - Read the page size from the iMIS script (reuse `pagination()`); disable
     `simplePaginate` on sets the theme pages, and remove its pager.
   - Extend `filterQueryResults(search)`: compute matches across all rows (not
     only displayed ones), then show the first N (Show more adds N). Keep the
     completed-filter and task-progress counting it already does.
   - A Show more control in the existing footer (`us-query-footer`), matching
     the timeline's.
   - The status text across the whole list, and the "more in completed"
     notice.
2. **Touched record and islands.**
   - Track the touched row while a query is active (click, focusin, card open);
     single-match rule.
   - On clearing: compute the island (touched ± 3), keep the previous depth,
     insert gap markers (`us-query-gap`, a button: "N tasks hidden · Show"),
     scroll and highlight. Islands live in search state, reset by the events in
     rule 6.
3. **US-ACTIVITY-FEED.**
   - "Search everything": a loop over relevant sources calling `loadPage` until
     `more` is false, with progress from `source.total`; abortable by a new
     query or a type/range change (the existing `generation` counter).
   - Islands in `renderBody`: render the top rows, a gap item, the island rows,
     then the Show more state. `state.shown` becomes "top depth" plus the
     island.
4. **Composer (C40) interaction.** After the quiet insert (`insertNew` in
   `prototypes/wip/case-page/composer.candidate.js`, to be promoted with the
   composer), call the search's re-filter/re-page instead of relying on
   `simplePaginate`.
5. **Guide.** Document Show more paging for Query Templates (the iPart setting
   it reads, that `simplePaginate` is replaced), search across the whole list,
   the touched-record snap and gap markers, and the timeline's Search everything.
   Rebuild and run the three checks.

## Tests to write

- A 100-row list (with completed rows) in a guide example and in the case
  prototype's sample data (the case lists are short; add a long sample toggle).
- Search finds a row beyond the first page; status counts across the list.
- Completed filter hides matches: the notice and its Show.
- Touch, clear: top rows unchanged, gap count right, island ±3, scroll and
  highlight; pressing the gap fills it; new search, type and range changes
  reset it; island next to the top rows joins without a gap.
- Single-match rule without a click.
- Filter changed after touching: no snap, the notice instead.
- Quick add (C40) into a paged list lands visible.
- Timeline: Search everything progress, abort on a new query, a failed source,
  islands after a deep search.
- Reduced motion; keyboard (the gap and Show more are buttons; focus moves
  sensibly after a gap fills).

## Open questions

- Show more page size for the timeline vs Query Templates (the feed uses
  `data-us-activity-page`, default 10; Query Templates use the iPart's 30).
- Should "touched" include hovering? (Proposed: no; click, open or focus only.)
- A cap for Search everything, and its message.
