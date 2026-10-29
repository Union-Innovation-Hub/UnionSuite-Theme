# Case page: handover (12 October 2026; status updated 28 October 2026)

Start here, then read `README.md` (candidates C1–C41, files, data sources, open
decisions). This file keeps what the README does not: the decisions and their
reasons, how the pieces fit, what is still open, and the traps found along the
way.

## Where things stand

- **The case page prototype** (`index.html`, served at
  `http://localhost:8778/prototypes/wip/case-page/index.html?CaseID=C217&CaseNum=214#overview`
  by the `static-node` launch config) has rail tabs Overview, Details,
  Activity, Parties, Attachments. Sample data and stubs: `case-page.js`.
  Standalone export: `node build-standalone.cjs` then `--check` (the output,
  `Case-Page-Standalone.html`, is ignored by Git; 9 stylesheets, 5 scripts).
- **Every add on the page is in place** (US-INLINE-COMPOSER, C40), approved by
  the owner, and **now in the shared theme** (12 October 2026): the block
  after the action engine in `zUnionSuite.js`, its section in
  `zUnionSuite.css`, two dark details in `zzDarkMode.css`, and the usage
  guide's `#inline-composer` (live example, copyable spec, field types,
  popup contract; test `usage/tests/test-inline-composer.cjs`). The case
  specs are in `Scripts/ActionDefinitions.js` (the Case page actions block,
  20 October 2026; they were `case-actions.candidate.js`).
- **Since then, also in the theme:** the case actions
  (`Scripts/ActionDefinitions.js`), parties (US-CASE-PARTIES), the member
  card and its workplace choice (US-CASE-MEMBER, US-CASE-WORKPLACE), the
  activity timeline, the change history and its Details views, the case
  email composer, the access check on page load, Create case opening its
  staff page, quick adds into empty lists and one-at-a-time uploads.
- **The live page** is on the dev tenant at
  `@/_i4u_/Core/Cases/Layouts-v2/Manage Case`, with its five tabs. What its
  flows and IQAs already do, and what they still need, is under
  [Live build](#live-build-from-the-owners-exports-28-october-2026).
- **Approved, not built:** `prototypes/approved/list-search-and-paging/`, the
  theme's own paging and search-everything for lists, with the found record
  kept in view in context. Read it before touching list search or paging.

## Adding records: how it works and why

The owner's brief, in order (all 10 October 2026):

1. "Apply the same format to all add functions within the cases page -
   including on the overview tab. then wrap that style into the theme."
2. "The banner actions should just open the popup"; a composer only ever
   opens in the section whose button was pressed.
3. UX is the highest priority: "save data, row slides down. no report
   reloading. no flashes."
4. Not over-built: rendering rows in the browser from the IQA's stored
   template (the definition blob holds the Query Template HTML) was explored
   and rejected as too complex for a transition. The simple version won.

**The pieces** (US-INLINE-COMPOSER in the theme; the case specs in
`Scripts/ActionDefinitions.js`):

- `UnionSuiteComposers.define(key, spec)` defines two actions: `key` (the
  section's add button, a toggle; pressed again it puts the composer away
  *keeping the draft*; Cancel and Escape discard) and `key + '-form'` (the full
  popup, keeping its authored label: the composer's More options and the
  banner's Actions items).
- A spec declares the composer's fields as data (textarea, text, date, time,
  select, checkbox, files, combobox), `required`, `shownBy`, `confirm` (an
  "are you sure"), `submit`, `lists`, `arrive`, `feed`, `keepOpen`. Field and
  type details are in the block's header and the guide.
- **On save:** the button spins for the save only. On success the composer
  clears (keepOpen: tasks, staff, parties) or folds away, and at the same moment
  a **holding row** opens where `arrive` says (`top`, `bottom` of the rows
  showing, or `{field, attribute, order}`: meetings by date). It shows what was
  typed, a tick that draws itself (ring 640ms, check 480ms after 440ms: the
  owner asked for it "2x as slow") and "Saved" (it is saved), then a soft
  shimmer until the real row arrives.
- **Query Template sections:** `UnionSuiteRefresh.queryTemplate(selector,
  {insert: true, holding})` (US-ACTION-REFRESH) reads the page quietly, with
  the refresh's queue, timeout and checks; rows compared by record (ordinal, otherwise text), and
  only new rows go in. Each takes its holding row's place (matched by the
  `Ordinal` the save returns; otherwise in order): in the same place it grows
  from the holding row's height with its contents fading in; elsewhere the
  holding row closes as it opens. Rows the page no longer has close (the
  Overview's newest three attachments). Template parts marked `data-us-live`
  (the "View all attachments (n)" count) take the new text. Nothing else in
  the section changes; the theme then dresses the new row
  (`UnionSuiteIqaFilters`, `UnionSuiteActions`, `UnionSuiteTaskRows`,
  `UnionSuiteActionMenus` refreshes, and a `us:query-template-refreshed` event
  whose `detail.inserted` is the number of rows added, 0 included).
- **Feed sections (the timeline):** the holding row is a record card (the tick
  in the timeline node). The feed then calls the new theme method
  `UnionSuiteActivityFeed.reload(feed, {quiet: true, types})` (in
  `zUnionSuite.js`, documented in the usage guide), which re-runs only the
  record type's source IQAs from the start and folds in only the new cards: no
  "Loading activity…", no redraw. `types` is the spec's `feed`, default its kind
  (tasks show as notes).
- **Other lists the save changes** take their new rows quietly too (feeds by
  the quiet reload), and all the Query Template lists of one save share one
  page read. Before, the others refreshed under the overlay.
- **More options** (owner, 11 October 2026) carries the draft into the popup
  (a one-time `usDraft` key; the popup's theme takes it and fills
  `form.fill`, or HubForms reads `UnionSuiteComposers.received()`) and
  leaves the composer underneath. The popup reports `{saved: true, Ordinal}`
  or `{cancel: true}` as it closes (BeyondFormz: a submit script, in the
  guide); saved clears the composer at once, cancel keeps it, nothing passed
  compares the lists. Try it here with `window.casePopupResult`.
- **Meetings dated before today** ask first: "That date has passed. Save the
  meeting anyway?", Save becoming "Save anyway"; changing anything withdraws it.
  Today is `UnionSuiteQueryStatesConfig.today` when set (previews pin it), else
  the local date.
- **A refreshed feed keeps its type** (C41, now native in `US-ACTIVITY-FEED`): the
  section remembers the chosen type and picks it again when the feed is rebuilt.
- **Add party's quick add** lists the members at the primary party's workplace
  (`API - Manage Case - Contact List - Primary Workplace`, filtered by `CaseNum`); its More
  options is the full popup, "a comprehensive search function for the entire
  db". People already on the case show but cannot be picked
  (`data-us-contact-id` in the section).

## Live build (from the owner's exports, 28 October 2026)

Checked against three exports from the dev tenant: the Flowz Cases folder (47
flows), the `$/_i4u_/Core/Cases/Layouts v2` IQA folder (27 IQAs) and the
`@/_i4u_/Core/Cases/Layouts-v2` pages. Read from the exports only; nothing
was run.

**Built:**

- **Quick adds** (`/cases/quick-add/note`, `task`, `meeting`, `staff`): each
  checks the case and the user's entity, writes iMIS and CloudToolz, logs the
  change and returns `{"Ordinal": n}`. Their bodies match the specs in
  `Scripts/ActionDefinitions.js` (staff's `Role` is saved as `StaffType`).
- **Attachments** (`/cases/quick-add/attachment`): stages each file in Redis
  and runs the Fileupload and tagging flow, adding tag 3 as the drag and drop
  flow does. It returns `{Status: 'S', Files: n}`, not Ordinals, so the
  holding rows are matched in order. `flows/` holds an export of it and of
  `CA-Update-Attachment`.
- **Staff list** (`GET /cases/quick-add/StaffList?CaseNum=`): `API - Case
  Staff List`, with the role from `UnionTemplate.Configuration` (Cases,
  CaseStaff) for the user's entity.
- **Make primary party and Make lead staff**
  (`/cases/quick-update/set-primary-party`, `set-lead-staff`): write the
  case's `PrimaryContactID` and `StaffLeadID` and return the row's Ordinal.
  The CloudToolz side writes `PrimaryContctID`, the spelling the case flows
  use throughout.
- **Case access:** `/cases/case-access`, `API - Access Check - Case Staff`,
  `API - User Roles` and the `No-Access` page.
- **Change history:** `Query Template - Manage Case - Changelog` (`ChangeRank`,
  `ChangeKey`, Event, Summary, ChangeDay, ChangeTime), its details IQA
  `API - Manage Case - Changelog Details` (in Layouts v2, not the
  `$/_i4u_/Core/Logging/API - Change Fields` first proposed) and the History
  Query Menu, on the Activity tab (`us-case-changes`,
  `us-activity-detail-history`).
- **Activity IQAs:** Notes returns `RecordUrl`, Meetings `RecordURL` (the feed
  reads field names in any case).
- **Lists:** Parties, Primary Party and Case Staff filter on `@url:CaseNum`;
  Case Tasks is on the shared task columns and the compact row.
- **Email:** `API - Case Email Logs`, `API - Communication Recipient List -
  Parties`, and the `Send-Email-Parties` and `Send-SMS-Parties` popups.
- **Pages:** `Manage Case` (Banner Top, with the status menu) and the tabs
  1.Overview, 2.Details (its IQAs are in `$/_i4u_/Client/Cases -
  UnionSuite/Layouts/`), 3.Activity, 4.Parties and Attachments.

**Still open (owner):**

- **Status changes:** the owner built `/cases/quick-update/set-status`
  (28 October 2026). Its corrected version is
  `flows/Cases-Quick-Update-Set-Status.flow.json`, to import over it (same
  definition): the copied Set Lead Staff log recorded a lead staff change
  instead of the status, the response returned `{}`, and any status was
  accepted, closed ones too. It now logs Status (old and new), returns
  `{Status}`, and refuses a status that is not an open row of
  `$/_i4u_/Core/Cases/Layouts v2/API - Value List - Case Status` (`Code`,
  `Description`, `Closed Status`). The banner's menu is filled from that
  list (its open statuses, Description shown, Code saved), and open or
  closed follows Closed Status: before, a resolved case's `Complete` read
  as open.
- **Add party's quick add:** `/cases/quick-add/contact` is a stub on the
  site (the endpoint and an empty OK: no insert, no Ordinal). Its
  replacement is drafted in `flows/Cases-Quick-Add-Contact.flow.json`
  (28 October 2026), to import over the stub: it validates the case, refuses
  a contact already on it, reads the contact, adds the case contact
  (`ContactType` "Member") in iMIS and CloudToolz, logs it and returns
  `{"Ordinal": n}`. Its quick list is built (owner, 28 October 2026):
  `$/_i4u_/Core/Cases/Layouts v2/API - Manage Case - Contact List - Primary
  Workplace`, the active members currently working at the case's workplace
  (`i4u_UT_Cases.PrimaryWorkplaceID`). Required `CaseNum`, optional `Search`
  (the taskbar quick search's string: name, email and phone joined); at most
  20 rows; returns `ID`, `Full Name`, `Member Type` and `Member Category`,
  which `cases.add-party` reads (28 October 2026). More options is the full
  popup, "a comprehensive search function for the entire db".
- **Case workplace (C42; owner, 22 and 28 October 2026):** the member
  card's Work label menu (`US-CASE-WORKPLACE`, guide `#case-member`) now
  reads the live jobs IQA, `$/_i4u_/Core/Cases/Layouts v2/API - Manage Case
  - Primary Contacts Workplaces` (CaseNum required; Workplace Name,
  Workplace Type, Member Job Status Active / Not Started / Finished, Job
  Start Date, Job End Date), and saves through the owner's
  `/cases/quick-update/set-primary-workplace` (`{CaseID, CaseNum,
  ContactID, WorkplaceID}`), which writes `i4u_UT_Cases.PrimaryWorkplaceID`
  (a varchar). Blank means not about a workplace: the create form sets the
  primary contact's primary workplace, so a blank is a choice (an older case
  never set reads the same until a job is picked). Not started jobs have
  their own menu group and badge. Its corrected flow is
  `flows/Cases-Quick-Update-Set-Primary-Workplace.flow.json`, to import over
  it (same definition): the log read the primary contact as the old value,
  its note said Set Primary Party, the response returned `{}`, and any
  workplace was accepted; it now refuses one that is not the primary
  contact's job. Still to do on the site:
  - The jobs IQA must also return the workplace's ID (`Workplace ID`,
    `WorkplaceID` or `ID`): the card leaves out a job without one.
  - `PrimaryWorkplaceID` on `Query Template - Manage Case - Primary Party`,
    and `data-us-workplace-id="{#query.PrimaryWorkplaceID}"` (with
    `data-us-member-id="{#query.MemberId}"`) on its `us-case-member` div, as
    the guide's Case member template has them.
  - The card's details need a field group named Work for the control to
    attach. They now come from the client's `API - Manage Case - Primary
    Party Details` (filter `CaseNum`, joining the case's job on
    `PrimaryWorkplaceID`; owner, 28 October 2026), so the Primary Party
    template's details div points there with `CaseNum`, and the IQA selects
    `CaseNum`. The jobs IQA has no Work-* columns, so after a save the card
    reads its details again, the previous job's fields dimmed until they
    arrive.
  - `set-primary-party` should set the new primary's primary workplace or
    clear it; it does not touch the workplace yet. The Details tab does not
    reload after Make primary party.
- **Record popups on the live timeline:** add `data-record-popup="true"` to
  the notes and meetings sources of the live `Query Template - Manage Case -
  Activity Feed` (done in this folder's templates, 28 October 2026).
- **Case contacts' `ContactType` is "Please Enter"** (TODO.md, Cases): its
  source is not visible in the export.
- **Popup pages:** the `Cases_*` full forms, `Cases_EditMeeting` among them,
  are placeholders to confirm.
- **`Cases: Prefill Cases`** (`/cases/preload-edit`) is at v100, unpublished,
  last run 27 October: check the edit prefill runs the intended version.

**How the parties and staff data fit:**

- The primary party and lead staff are stored on the case
  (`[vBoi4u_UT_Cases].[PrimaryContactID]`, `[StaffLeadID]`), so each list's
  `ContactIsLead` is a custom SQL expression returning `'true'`/`'false'`.
  An IQA cannot sort on it, so both lists carry `us-contacts-lead-first`
  (US-LEAD-FIRST, in the theme) and sort on real columns.
- Party details are a second IQA through US-FIELD-GROUPS, loaded only when
  a party is first shown: the client's `$/_i4u_/Client/Cases -
  UnionSuite/Layouts/API - Manage Case - Party Details` (filter `ID`, owner,
  28 October 2026, so each client chooses its details). The member card has
  its own, `…/API - Manage Case - Primary Party Details` (filter `CaseNum`;
  the member from the case's `PrimaryContactID`, the Work group from its
  `PrimaryWorkplaceID`).
- Parties are in the theme (14 October 2026): US-CASE-PARTIES (CSS and JS),
  US-CASE-MEMBER (CSS), the `us-case-parties` preset, and the guide's
  `#case-parties` with the template. The prototype reads that template from
  the guide. Found on the live page then (owner's paste): `ContactType`
  returned iMIS's "Please Enter", `ContactRole` was blank, the details IQA
  returned no row for `ID`, and the editor merged the meta spans (the
  template now classes them).
- **iMIS query behaviour learned:** `GET /api/query` returns columns by
  alias/column name (`FULL_NAME`, not "Full Name"); an IQA can serve both the
  page (filtered `@url:AgreementNum`, hidden) and a one-row API call (an
  `Ordinal` optional filter); the definition blob from
  `POST /api/QueryDefinition/_execute` (`FindByPath`) holds the Query Template
  HTML (not used; recorded in case it is needed).
- **Live date output:** Query Templates show DateTime as `d/MM/yyyy`, no time
  (`9/09/2026`); nulls render empty.

## Next steps, in order

1. **Owner, to finish the live page:** import the corrected set-status flow
   and Add party's contact flow (both in `flows/`); the workplace save
   (import its corrected flow, the jobs IQA's ID column and the Primary
   Party template's `PrimaryWorkplaceID`); the record popups on the live
   feed template.
2. **List search and paging** (`prototypes/approved/list-search-and-paging/`).
   The quick insert must work with the new pager: today a paged list that
   grows past its page is refreshed in full instead.
3. **BeyondFormz fill:** needs a real BeyondFormz form's markup (field
   names, when it has drawn, whether its upload takes files from a script) to
   write each spec's `form.fill`; the guide's checklist covers setting one up.
4. **Live checks** on the dev tenant: a quick add of each kind now their
   endpoints exist, that the theme loads inside iMIS popups (the draft
   hand-off needs it), and a BeyondFormz close value.
5. Smaller, open: the holding row's text starts slightly left of task titles
   (cosmetic; it does not know each list's columns).
6. Carried over: agreement banner match; agreement Members and Organisations
   report columns.

## Traps found this session

- **Function names in one IIFE collide silently.** Twice a new helper
  (`open`, then `place`) shadowed an existing one in the composer (now in
  `zUnionSuite.js`) and every Add button stopped working. Grep for `function NAME(` before
  adding one.
- **`array.map(fn)` passes the index** as the second argument:
  `lists.map(renderList)` broke when `renderList` gained a second parameter.
- **The theme's Query Template refresh keeps the `ContentItemContainer` and
  its class wrapper div, and replaces the panel** inside. Keep references to
  the container, not the panel or the set.
- **The sample data serves page reads**: `case-page.js` intercepts a fetch of
  the page itself and returns `index.html` with every list filled, after a
  1.5-second wait (so the quiet insert and the theme refresh behave as in
  iMIS).
- **The preview pane pauses `requestAnimationFrame` and animations when it is
  not drawing** (window behind, pane hidden). Animations, the theme's row
  processing (completed tasks hidden, counts) and anything scheduled on a
  frame stall until a screenshot or a visible pane wakes it. Do not read
  half-finished state as a bug: wake the pane, then check. The pane is also
  often tiny: emulate a viewport (`resize_window` 1100×700) for screenshots,
  and reset it after.
- **Cache:** reload changed files with `fetch(file, {cache: 'reload'})` then
  `location.reload()`; the theme file is at `../../../Theme/UnionSuite/zUnionSuite.js`.
- **A guide example frame's `location.origin` reads `"null"`** (srcdoc),
  so a page read there must use `url: 'about:blank'` (also `null`) and a
  stubbed fetch, as the refresh and composer examples do.
- **`String.replace` with theme code as the replacement** turns the `$'` in
  `'$' + value` into the rest of the page: pass a function. It broke the
  guide's CCO sticky example, and once this file: its own end was repeated
  three times until 28 October 2026. (`test-query-template-refresh.cjs`, which
  it failed, passes again.)
- **Theme state is derived in the browser:** `data-us-task-completed` comes
  from `TaskCheckCSS` (US-QUERY-STATES), past meetings from the date; the
  completed filter and counts are the theme's (US-QUERY-SEARCH).

## Owner preferences seen this session

- UX first; smooth, honest feedback; no flashes or double animations.
- Asks to talk plans through before code ("talk me through the plan for this
  before writing anything"); give options with a clear recommendation, then
  build when told.
- Prefers the simple version when the complex one is mostly mechanism.
- Terminology: parties (not complainants), attachments (not files).
