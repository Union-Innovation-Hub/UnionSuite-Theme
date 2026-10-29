# Combined activity feed — feature plan

Status: direction changed 2026-09-25 from merging Query Template Displays to one
API-driven module. A working candidate (`US-ACTIVITY-FEED`, item 32) is in the
[contact page v3 prototype](../prototypes/wip/contact-page-v3/README.md#activity-feed)
with offline fixtures. **Not in the theme, not approved and not deployed.** The
card layout is being decided in the activity cards workbench
(`prototypes/wip/activity-cards/`).

The [Theme Usage Guide](Theme/UnionSuite-Guides/Usage-Guide.html) lists this feature and
its proposed classes under planned work. When it is promoted, update that entry
with the markup and field contract below. Add working templates and class recipes
to the guide only then.

The owner wants one recent-activity block containing records from separate
tables. The first deployment combines six IQAs: Interactions, Zidebar Notes, Outbound calls,
Outbound emails, Inbound emails and Meetings. The supplied design shows one
header, search and date controls, type filters with counts, month groups, and
chronological cards with their own details and actions. The owner reports poor
performance when combining large datasets with UNION; no comparative benchmark
has been run in this project.

## 1. Feature boundary

Build an optional, reusable activity-feed module. Its visual styling belongs in
the theme; its fetching, merging and interaction logic lives in the central theme
JavaScript file. Queries, record mappings and destinations remain configurable
for each deployment. The same module should support member, organisation and
case contexts through explicit configuration.

| Layer | Responsibility |
|---|---|
| Theme CSS | Shared panel, timeline, cards, icons, badges, filters, responsive layout and interaction states |
| Shared JavaScript module | Read the configuration, query each source with `GET /api/query`, merge and page the results, group by month, filter, and manage expansion |
| IQAs | Query each table, apply record/date/access constraints, sort newest first, and return the common field contract |
| Host configuration | Identify the viewed record and participating sources, types, initial window, page sizes and the full-history destination |

Ordinary grouped panels remain a separate composition pattern. The feed only
activates on an explicit `.us-activity-feed` element.

## 2. Why one API module, not merged Query Template Displays

The 2026-09-06 plan merged the output of one Query Template Display per source.
It was replaced because:

- **Paging.** Each source keeps its own offset, so Show more and a wider date
  range fetch real data in the correct global order. Separate native pagers
  cannot be combined into one.
- **Honest filters and counts.** The date range re-queries; type counts are the
  sources' real `TotalCount`s.
- **Page cost.** Requests run in parallel, and only when the feed is first
  visible. Query Template Displays all render on the server during page load.
- **Less fragile.** No hidden duplicate markup, no partial-postback
  reconciliation, no authoring-mode detection, no ISO dates emitted into
  templates.
- **Content filter.** The host holds configuration only; the RiSE content
  filter strips `on*` attributes and decodes entities in inline script, so no
  script lives in page content.
- **Precedent.** `US-MEMBERSHIP-STATS`, the banner alert bell and the tab counts
  already work this way.

Trade-offs: nothing renders without JavaScript (an error state and the
full-history link cover this), and authors cannot reshape cards in RiSE. The
fixed field contract is deliberate: it keeps every source consistent.

## 3. Authoring contract (candidate)

The host is a one-row Query Template Display whose IQA returns the viewed record.
Its template is the feed element, so iMIS fills in the record value:

```html
<div class="us-activity-feed"
     data-us-activity-folder="$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity"
     data-us-activity-filter="ID" data-us-activity-value="{#query.ID}"
     data-us-activity-start="StartDate" data-us-activity-days="90"
     data-us-activity-history="…full history page…">
  <ul class="us-activity__sources" hidden>
    <li data-source="interactions" data-query="Interactions" data-details="Interactions Details" data-type="interaction"></li>
    <li data-source="zidebar-notes" data-query="Zidebar Notes" data-details="Zidebar Notes Details" data-type="note"></li>
    <li data-source="calls-out" data-query="Outbound Calls" data-details="Outbound Calls Details" data-type="call" data-direction="out"></li>
    <li data-source="emails-out" data-query="Outbound Emails" data-details="Outbound Emails Details" data-type="email" data-direction="out"></li>
    <li data-source="emails-in" data-query="Inbound Emails" data-details="Inbound Emails Details" data-type="email" data-direction="in"></li>
    <li data-source="meetings" data-query="Meetings" data-details="Meetings Details" data-type="meeting"></li>
  </ul>
</div>
```

Each source names two IQAs (1 October 2026): `data-query`, the fixed core
IQA the list is built from, and `data-details`, a client-editable IQA read
for one record when its card first opens. Everything it returns is shown in
the opened card, laid out as a field group panel (22 October 2026):
`Group-Label` columns under a heading per group, `Tone-*` badges, `Alert-*`
columns. A blank value is left out (and a group left empty goes too) unless
the column name ends `(show blank)`, which shows the field with a dash and
drops the marker from its label (22 October 2026; cards only, the panels
keep their dashes). `Ordinal`, `ActivityKey` and the record
filter's column are left out; an `Additional-*` column reads as its label
alone, with no heading. The full column, filter and client configuration
rules are in
[Activity-IQA-Specs.md](../prototypes/wip/contact-page-v3/Activity-IQA-Specs.md).

A source `<li>` can also carry `data-history`: the IQA page for its type,
shown as "View all calls" (emails, meetings…) while that type is chosen.
A source `<li>` can also carry `data-record-popup="true"` (or `1`, `yes`):
its View full details link then opens `RecordUrl` in the native iMIS popup
(`ShowDialog_NoReturnValue`, 80% × 80%, titled with the card's Subject), as the
theme's popup actions do, instead of navigating the page. Use it for pages
built to run in a dialog, such as the email preview
(`/iParts/Common/InteractionLog/InteractionPreview.aspx`). Another site, a URL
with a fragment, a missing popup service or a popup error leave the link to
navigate normally. Without the attribute every source navigates.
Each row renders as a record card (`US-RECORD-CARDS`, from
`prototypes/wip/activity-cards/`).

Optional attributes: `data-us-activity-limit` (rows per request, default 20),
`data-us-activity-page` (rows per Show more, default 10),
`data-us-activity-time-zone` (default `Australia/Sydney`),
`data-us-activity-details-folder` (default: the core folder). An unsubstituted
placeholder value leaves the feed inactive.

Every core IQA is sorted newest first, filtered on the record filter and the
named start-date filter, and returns only the columns its type has data for
(a missing column is treated as blank, so IQAs are never padded with `''`):

| Alias | Required | Purpose |
|---|---|---|
| `ActivityKey` | yes | Unique within the source; source + key identifies a card and filters its details |
| `ActivityDate` | yes | The business date of the activity (not last-modified). Server-local time; the same server for every source, so order is consistent |
| `Subject` | Subject or Summary | Card headline; most records have none |
| `Summary` | Subject or Summary | The preview line. A row needs a value in one of the two |
| `Detail` | no | Plain-text note shown on expand; cap its length in the IQA |
| `CreatedBy` | no | "by …" on the type line |
| `Priority` | no | `High` or `Urgent` shows a flag |
| `Category` | no | Sub-type after the type name, such as an interaction's Interaction Type |
| `FollowUpRequired`, `FollowUpDate`, `FollowUpActioned` | no | A follow-up task (`FollowUpRequired` true; without that column, any `FollowUpDate`): badge "Follow-up 22 May", amber "Overdue 12 May", or "Follow-up done" |
| `FollowUpNotes` | no | What the task needs, under a "Follow-up" heading when the card opens; searchable |
| `Pinned` | no | Pin icon and amber edge |
| `DoNotCall` | no | Red no-entry alert icon |
| `CaseRef`, `CaseUrl` | no | Linked record |
| `RecordUrl` | no | Native view page for View full details (a popup when the source has `data-record-popup`) |
| `Direction` | no | `In` or `Out`; overrides the source's `data-direction` |

Everything else (a status or outcome, with whom, duration, attachments, workbench…)
belongs in the type's details IQA, as any column (`Group-Label` to group it).

Values render as text, never HTML. Links must be same-site `http(s)` URLs.
Type and direction come from the source definition, so Inbound and Outbound
emails share the Emails filter.

## 4. Query limits and performance

Filter each query to the viewed record and date window before results reach the
browser. Return only fields needed by the cards; expensive full details can stay
on their existing view pages.

The initial view requests the newest `limit` rows from every source. The global
newest N are contained in the newest N of each source, given consistent ordering
and one row per activity, so no per-type quota is needed. Joined duplicate rows
must not consume the limit before unique activities are selected.

Measure each query and the whole feed on representative large contact
histories, and compare against the existing UNION implementation before claiming
a performance improvement.

## 5. Search, counts and paging

| Feature | Behaviour |
|---|---|
| Type filters | Choose which sources merge; Show more keeps paging those sources until the requested number of rows can be shown |
| Counts | Each source's `TotalCount` for the current window; Emails = inbound + outbound |
| Date range | Last 90 days (default), 6 months, 12 months, All time. Sources are newest first, so a shorter range is the front of a longer one: narrowing drops loaded rows outside the window (their cards fold away); widening keeps what is loaded and pages on from each source's offset. Only the counts re-query (one row per source). Relies on each IQA returning the same order for any start date |
| Search | Covers loaded rows only, labelled "Search loaded activity", and never triggers loading. Also matches type and direction words, and faintly highlights matches. Server-side search through an optional named filter on each IQA is a later extension |
| Filter toggle | On a wide feed (880px and over) search and the date range share the type filters' line and the button hides. On a narrow feed they sit behind the heading's filter button, the theme's `US-QUERY-SEARCH` toggle (as on the home page tasks); the type filters stay visible. This toggle should become one shared component for any Query Template Display or Content HTML block, as IQA reports already hide their filters behind a similar toggle (owner note, 2026-09-25) |
| Show more | Merges from per-source buffers; a row is shown only once no source with unloaded rows could hold a newer one |

## 6. Lifecycle and failure

- Loads when the feed first becomes visible; a hidden tab or sub-tab makes no
  requests.
- Tracks each source as loading, ready or failed. A failed source shows a notice
  naming it, with Retry, and is never presented as zero or as complete.
- Distinguishes loading, no activity in the window, and no loaded matches.
- State belongs to the feed element and its record value. Replaced or removed
  hosts (partial updates) are detected; results from a previous context are
  ignored.
- Type filters expose a pressed state; expansion controls expose an expanded
  state and keep focus across re-renders; type badges carry text as well as an
  icon.

## 7. Implementation and acceptance

1. Build the six IQAs to the field contract and confirm REST access for staff,
   the start-date filter names (`GET /api/QueryParameterDefinition?QueryPath=…`)
   and plain-text email bodies. Specification:
   [Activity-IQA-Specs.md](../prototypes/wip/contact-page-v3/Activity-IQA-Specs.md).
2. Settle the card layout in the activity cards workbench.
3. Measure paging cost on large histories against the UNION query.
4. Promote `US-ACTIVITY-FEED` and its CSS, then document it in the usage guide.

| Case | Expected result |
|---|---|
| Marker absent; unrelated iPart; two feeds | No accidental activation or shared state |
| Mixed sources and equal timestamps | Deterministic order, unique cards and correct month groups |
| One source dominates the latest records | Correct newest N across sources, without per-type quotas |
| Empty, failed or slow source | Accurate state; no false claim of completeness |
| Replaced host or changed record | No stale cards or results from the previous record |
| Search on loaded data | Scope and counts remain explicit |
| Keyboard, mobile and long card content | Readable cards, reachable controls, no horizontal scroll |
| Large histories | Measured query/page timings and bounded payloads |

This feature is T15 in the [updated condensed component inventory](crm-member-profile/CRM-Member-Profile-Component-Types-Updated.csv).
