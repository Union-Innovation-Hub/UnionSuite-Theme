# Query Template Display recipes

Header actions use registered `us-action-AREA-COMMAND` classes in the iPart CSS
class field. The definition controls label, icon and appearance. Load shared CSS,
zUnionSuite.js, Scripts/ActionDefinitions.js, then client Actions.js. Register
home.add-task with the real editor and assignee contract before using
us-action-home-add-task. This guide's sample definition is preview-only.
Repeated instances are supported with unique IDs; no action HTML belongs in
the repeating template. See Usage-Guide.html#unified-action-route.


## Optional header search

Add `us-query-search` to a Query Template Display iPart's CSS class field,
alongside existing list and Add action classes. Set a nonempty Title and load
updated `zUnionSuite.css` and `zUnionSuite.js` once through the site template.
Keep the repeating HTML, Header and Footer fields unchanged. A funnel button
and collapsible search input are generated automatically; the new searchable
task example uses the unchanged Tasks Query Template and real shared behaviour.

Search starts collapsed and matches displayed text case-insensitively. Closing
the funnel clears the search and restores results, respecting the independent
Show completed setting. It searches the currently displayed page only, leaving
native pagination/hidden records, full-query filtering and task state to iMIS.
Hidden content, control attributes and nested iParts are excluded. Matching
counts/no-match feedback are announced politely below the results. Clearing
search restores original visibility without replacing row controls or handlers.

Instances are independent. Body/panel partial replacements retain the search
while the CSS-class wrapper survives; a full iPart replacement or reload resets
it. ASP.NET load/endRequest hooks reconcile controls, and rendered-row changes
are observed. Custom DOM insertion or runtime class changes should call
`UnionSuiteIqaFilters.refresh()`. Removing the class or adding
`us-report-no-styling` releases managed visibility. Untitled, missing-list,
banner and surrounding-zone structures receive no search controls.

The funnel uses the existing IQA icon, expanded state and 180ms slide, with
ARIA controls/expanded state, focus handling and reduced-motion support.
Enter in the search field does not submit the native form. Coarse pointers
receive 44px controls. Existing theme tokens supply all colours, focus and sizing;
see the guide's `#query-template-search` section for the full recipe and limits.

Cards unchecked gives plain content without card padding. Cards checked with
us-list--no-shell retains card-body padding but removes the individual card
surface, outline, corners and shadow. The outer iPart panel remains.

Preview records/configuration live in
Theme/UnionSuite-Guides/usage/source/list-query-examples.cjs. The generator inserts that data
into the actual repeating template and adds native wrappers for the visual
preview only. It never offers those generated wrappers as copyable templates.
Native-Bulletin.html and Native-Bulletin-Plain.html remain rendered-structure
fixtures for references/Query-Template-Structure.html.

Legacy Bulletin.html, Member-Notes.html, Tasks.html, Recent-History.html,
No-Shell.html and Empty.html are retained for compatibility with authored Content
HTML lists. They are not the iMIS paste-in recipes and are no longer exposed by
the reference copy controls. Existing authored list CSS remains supported.

Rebuild the standalone reference and guide from the project root:

```text
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs
node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs --check
```

## Independent task completion filter

The detail template's title uses `us-task__title us-action-home-open-task` on
the anchor. Load shared JS and `Scripts/ActionDefinitions.js`; select `TaskUrl`
in the IQA and supply the verified editor URL, including its task identifiers,
in both `href` and `data-us-task-url`. The native popup opens at 70% width and
height and refreshes the originating report on close, matching Add task.
The task title remains the action label. Blank URLs disable the action;
fragment destinations are unsupported. Offline sample links cannot open a real
iMIS editor. The related member link remains a normal link.

Select `MemberId` for the member link's `data-id` attribute. When it matches
`__ClientContext.loggedInPartyId`, shared task-row JS displays `Personal Task`
in place of the member name, removing href and disabling keyboard navigation.
Other or blank IDs retain the authored name and link. Missing/invalid or
anonymous client context and no-styling opt out.
The label is reapplied after query refresh. For an unused MemberId, select `''`
with that alias or remove the attribute from the template.

Use `us-query-search` alone for notes and other query templates. Add
`us-task-completed-filter` to the task iPart CSS class field for Show completed;
it works alone or alongside search, with one shared header funnel. Keep a
nonempty Title and load updated shared CSS/JS. Header/Footer fields need no
filter markup. Completed tasks start hidden; both options filter only native
results currently displayed, preserving native paging and hidden rows.

`Tasks-Completion-Query-Template.html` is a one-result author template. Map the
suggested IsCompleted query alias to the actual completion field and emit
`data-us-task-completed="true"`/`"1"` or `"false"`/`"0"` on its authored root.
The query must return outstanding and eligible completed tasks (and own the
30-day date window, dates and ordering). Missing or unknown markers remain
visible. The theme does not infer state from text or save completion changes.
The task templates now use the homepage-style `us-task` row with a separate
checkbox, title, member and TaskDateLabel. The checkbox and slide/collapse
animation are local only, as requested; API persistence will be connected later.
Display in cards should be unchecked. Reload/replacement restores query data.

Paste `Tasks-Query-Footer.html` in the separate Footer field, replacing the link
destination. `us-query-footer` supplies a full-width divider and
`us-query-footer__link` aligns View all tasks right. The optional
`data-us-task-summary` span receives the filtered outstanding count for this page.
It works with direct Footer HTML or a native template-footer wrapper. A plain
anchor alone has no footer shell. `us-list__footer` remains an item-level footer.
Use `us-query-search us-task-completed-filter us-action-home-add-task` on the
iPart; the task content itself supplies its compact row layout.

The generated reference demonstrates search-only notes, combined task filters
and completion-only tasks using shared production controls. Search, Show
completed and disclosure choices survive body/panel refreshes while the iPart
class wrapper remains. Marker updates are observed; custom class changes use
UnionSuiteIqaFilters.refresh(). Removing either class retains the other option;
removing both or opting out restores native results. All copyable templates
exclude iMIS-generated wrappers. See the guide for keyboard and token details.

For the homepage, use `us-home-tasks` instead of the three separate helper
classes to also enable Biscuit's zero-outstanding state. Put
`Tasks-No-Results.html` in the separate **No results** field and leave **Hide when
there are no results** unchecked. It is static HTML with no query fields. The
query must be scoped to the logged-in user and load all outstanding tasks; search
matches and unloaded server pages cannot establish the user's total. The theme
counts loaded task markers before filtering. Completed rows remain accessible
through Show completed. See the guide's `#home-tasks-empty` example and contract.
