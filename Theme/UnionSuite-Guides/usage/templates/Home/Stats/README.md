# Membership Overview cards

These are reusable **Content HTML** templates. Production styling and data loading are in `Theme/UnionSuite/zUnionSuite.css` and `zUnionSuite.js`. Upload both updated theme files and ensure the embedded content page loads them, with client branding after shared CSS. Do not install `home-stats.js` or `captured-data.json`: they are offline preview fixtures.

## Page setup

Use one Content HTML iPart per file. Paste the complete file into its HTML/source editor. Leave the iPart title and CSS class field blank and disable its optional border/panel styling. The template supplies its own heading and card surface. Do not paste generated `ContentItemContainer` or panel wrappers. RiSE owns the Bootstrap rows and gutters; no `home-stats.css` is needed on the installed page.

| Row | Column | Content HTML file |
| --- | --- | --- |
| 1 | 12 | `Heading-Content.html` |
| 2 | 12 | `Tracker-Bar-Content.html` |
| 3 | 8 | `Trend-Placeholder-Content.html` |
| 3 | 4 | `Financial-Status-Content.html` |
| 4 | 8 | `Group-Breakdown-Content.html` |
| 4 | 4 | `Category-Breakdown-Content.html` |

Use your normal row spacing (24px in the preview). The trend card is intentionally a placeholder: no CloudToolz call, synthetic graph, or historical total comparison is made. Add the six-month MonthEnd/MemberCount series later.

Side-by-side cards automatically stretch to the tallest card in their Bootstrap row, with the shorter card's footer at the bottom. Keep one card per column. The shared JS carries the row's stretch through its owning iMIS wrappers, including direct, classed and empty wrappers; the shared CSS preserves Bootstrap column widths, gutters and wrapping. On mobile each stacked card returns to its natural height. No fixed heights, new author class or HTML changes are needed: update both shared CSS and JS. Rows containing extra visible content or multiple cards in one column are left alone. Runtime `data-us-membership-row` and `data-us-membership-stretch` attributes are managed by the theme and must not be authored. Nested CCO/page rows are matched at each card's nearest row, and unrelated outer rows are preserved. Class removal, opt-out and partial replacement reconcile automatically.

## Card configuration

The included `class="us-membership"` and `data-us-membership="summary|financial|groups|categories"` belong on the inner section in the Content HTML body. They are already present. Keep its content/status/retry children for loading and error handling. `us-membership-heading` is the separate page heading and `us-membership--trend` is the static placeholder.

Every data card includes this literal folder (underscores, not asterisks):

```text
$/_i4u_/Client/Home Page - UnionSuite/Stats
```

The six IQAs live in the client folder because they decide who counts as a current member and what the group, category and financial status are; each client can change them. Until 4 November 2026 they were in `$/_i4u_/SandBox/CRM Layouts/Home_Page/Stats`. The installed page is `@/_i4u_/Client/Staff-Site-Layouts/US-Home-Dashboard/Stats/Membership-Stats`. Both are in the deployment list (`DEPLOY.md`).

| Attribute | Default / meaning |
| --- | --- |
| `data-us-stats-folder` | Required folder above. Change on every card if moved. |
| `data-us-time-zone` | `Australia/Sydney`; business date used for month-to-date filters. |
| `data-us-financial-codes` | `Financial`; exact returned codes counted as financial. Use `Financial|Paid` for multiple codes. Blank statuses stay separate. Set consistently on tracker and financial card. |
| `data-us-group-label` | `Member category` in the group template. Edit its visible heading too; use Region, Industry, etc. for another client. |
| `data-us-start-parameter` / `data-us-end-parameter` | `StartDate` / `EndDate`; distinct IQA Search Labels. |
| `data-us-query-total`, `-financial`, `-joined`, `-resigned`, `-groups`, `-categories` | Optional query filename overrides; defaults in the table below. Each full attribute begins `data-us-query-`. |

## Six IQAs

Use aggregated counts, not member-detail rows. Each static breakdown must cover the same member population as the total, with each member counted exactly once. Group codes must be consistent between the group, join and resignation queries. Name columns in your output contain dimension headings, so the cards display the Code values as row labels.

| Exact IQA filename | Required output fields | Filters |
| --- | --- | --- |
| `Total Member Count` | `MemberCount` (one summary row) | Current members |
| `Members Joined` | `GroupCode`, `JoinedCount` | Join date **>= StartDate AND < EndDate** |
| `Members Resigned` | `GroupCode`, `ResignedCount` | Resignation date **>= StartDate AND < EndDate** |
| `Member Counts by Financial Status` | `FinancialStatusCode`, `MemberCount` | Same current membership population |
| `Member Counts by Group` | `GroupCode`, `MemberCount` | Same current membership population |
| `Member Counts by Category` | `CategoryCode`, `MemberCount` | Same current membership population |

No AsAtDate column is required. Joins and resignations use two requests each: month to date and the same elapsed days of the previous month, capped at that month's end. Start dates are inclusive; end dates are exclusive. On 13 September, that is 1–13 September vs 1–13 August. This is not a comparison with all of August. A zero prior count shows “previously 0”, without an undefined percentage. Increases in joins/decreases in resignations are favourable; zero change is neutral.

Null, omitted, empty or whitespace-only codes display as **(empty)** and retain their counts. Blank-code rows are combined. Duplicate nonblank codes, negative/invalid counts, incomplete paging and mismatching static totals produce unavailable/retry states. They never silently become zero.

Staff only see "Membership figures are unavailable", so the browser console says why, each line starting `Membership stats:`. A failed IQA is logged once however many cards share it (HTTP status, 30-second timeout, or the reason such as an invalid or duplicate count, with the dates for the joined and resigned queries). A breakdown that doesn't add up to `Total Member Count` is logged by each card that needs it, with both totals. The usual cause is an Equals join that drops members without a row in the joined object; a Left Join keeps them as **(empty)**. Nothing is logged when every figure shows. The group table retains event-only groups with zero current members, and its net change means joined minus resigned, not historical change in the member population.

## Loading and lifecycle

The shared loader uses `GET /api/query?QueryName=...`, same-origin session credentials and the page's request-verification token when present. It does not use `/api/iqa`. Requests begin only when a card is visible in the viewport, including checks through same-origin iframe ancestors. Offscreen lower cards wait until scrolled into view. To defer the embedded page's own server rendering, also defer assigning its iframe URL until the Stats tab opens; this card loader controls only its browser API requests. Cross-origin embedding is not supported for authenticated data access.

Within one document, cards share pending and completed results. Showing a loaded tab again reuses data; no polling or automatic refresh is scheduled. The complete dashboard normally makes eight requests (six IQAs, with two periods for each event query); additional pages require additional requests. A single page caches one current snapshot until reload/retry. Retry refreshes all cards using the same folder, and hidden cards use the refreshed cache on their next reveal.

The theme's spinning-circles loader, minimum loading height, `aria-busy`, live error status and keyboard-accessible Retry are included. Each query page times out after 30 seconds. Pagination is capped at 20 pages of 100 aggregate rows; errors remain visible. Missing access to one dataset can leave other tracker figures available. Counts can change between independent IQA requests; a mismatch is reported rather than hidden.

Partial DOM replacement and late insertion are supported. The runtime only owns the inner card, without changing parent iPart panels. Applying `us-report-no-styling` to the card or an ancestor also opts it out of this enhancement and its queries. Optional integration API:

```javascript
UnionSuiteMembership.refresh(); // scan/recheck visibility; retains existing results
UnionSuiteMembership.reload(document.querySelector('[data-us-membership="summary"]'));
// Explicit refresh of all cards with that folder, when visible.
```

## Preview and validation

`references/Membership-Stats.html` and the Stats tab of `references/Home-Preview.html` embed the verified probe captured on 13 September 2026 (from the earlier SandBox folder; `captured-data.json` names the current folder so the preview answers the templates' queries). The preview date and API fixture are added by the generator only; production uses the current business date and live iMIS responses.

Captured totals: **83,084** members; **7,227** financial (8.7%); **8** joined vs **1** (+7, +700%); **1** resigned vs **1** (0, 0.0%). Financial status includes **20,616 (empty)** and the member category table includes **80,699 (empty)**. All three current-member breakdowns reconcile to 83,084.

Component colours use existing theme tokens: `--accent` for short tracker markers and the first category bar, `--brand-700`/`--teal-300` for the financial chart, `--neutral-300` for unassigned status, `--success`/`--danger` for changes, and `--border`, `--bg-surface`, `--bg-subtle`, `--radius-lg`, `--font-ui` for surfaces. Client branding remains in the client theme; no hard-coded brand colours or custom spinner are installed.

Build: `node tools/build-membership-stats.cjs`, `node tools/build-home-preview.cjs`, then `node Theme/UnionSuite-Guides/usage/build/build-theme-usage.cjs`. Run each with `--check` for freshness. Browser checks: `node tools/test-membership-stats.cjs`, `node tools/test-membership-layout.cjs` and `node tools/test-home-stats.cjs`.
