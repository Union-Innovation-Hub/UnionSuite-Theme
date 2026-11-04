# Deployment tracker

What is built here but not yet in iMIS, and what has gone in. Tracking
started on 4 November 2026; nothing before that is recorded, so what was
live before then isn't known from this file.

## How to use it

- **A change that needs something done in iMIS** adds a row under
  [Pending](#pending) in the same change: the theme upload, Content HTML to
  paste, a form or flow to import, an IQA to change.
- **An iMIS item the work depends on** (an IQA, business object, panel
  source, content page or flow) goes in
  [Items to export at deployment](#items-to-export-at-deployment). Keep the
  list, not the files: they are exported fresh when it's time to deploy.
- **When it's deployed,** move the row to [Deployed](#deployed) with the
  date, where it went and how it was checked.
- **Deploys come from the working copy, not from commits.** The theme upload
  is `dist/UnionSuite`, built from whatever is in the checkout, so it can
  carry uncommitted work. Say so in the row when it does.
- **The theme's release number** (`RELEASE` in `Theme/UnionSuite/index.js`)
  shows which build a site runs: the theme's scripts load with `?v=<release>`.
  Check it in the browser's network list or with
  `window.UnionSuiteLoader.status()`.

## Where things go

| Target | What | Built by |
|---|---|---|
| Theme | `dist/UnionSuite` uploaded as the site's theme (`App_Themes/UnionSuite2` on the dev tenant) | `node tools/build-theme-dist.cjs` |
| Content HTML | A template pasted into a page's Content HTML iPart | Edited by hand, from its template file |
| BeyondFormz | A form export, imported over the form | `node prototypes/wip/case-create-form/beyondformz/build-form.cjs <export.json>` |
| Flowz | A flow export, imported over the flows | `node prototypes/wip/case-create-form/flows/build-flows.cjs <flowz-export.json>` |
| iMIS items | IQAs, business objects, panel sources and content, moved between sites | The iMIS exporter, at deployment |
| CloudToolz items | Flows, moved between sites | CloudToolz's package manager, at deployment |

Environments: the dev tenant is `uhubemsdev.imiscloud.com` (websites
UTNewTheme and UTTemplate share its domain).

## Pending

| Added | Target | What | Source | Notes |
|---|---|---|---|---|
| 4 Nov 2026 | Theme, dev tenant | Release `1.0.18`: Create case button, no-access redirect and its links under the current website; the `CreateCasePopupFn` override (old account page's Quick Actions → Create Case); the Quick Actions double caret; the old account page's small-screen layout; dates in the website's iMIS culture (`US-DATE-LOCALE`: task "Actioned", Membership Overview range, task form "Added on"); the home dashboard's Add task (`home.add-task`) opens `/_i4u_/Core/Staff-Site-Layouts/US-Home-Dashboard/Popups/Add-Task.aspx` instead of the `i4u_Sandbox` page (`f2ec74b`); Needs Attention hides a tracker IQA with no rows instead of erroring, shows errors only in Easy Edit, and logs empty and failed IQAs to the console | `8812984`, `c96fe1f`, `f2ec74b`, `caa2718`, plus the uncommitted work in the checkout (incl. the date locale) | The dev tenant ran `1.0.17` on 4 Nov 2026. Its websites are all `en-AU`, so dates there look the same |
| 4 Nov 2026 | BeyondFormz, dev tenant | Create case form: job and note dates in the website's culture | `beyondformz/dist/Create-Case-Staff-Form.json` (uncommitted) | Reads the note date as `yyyy-mm-dd` from the new prefill flow, and still shows an older flow's text date as it is |
| 4 Nov 2026 | Content HTML, each website's `Cases_NoAccess` page | The Back to home link gets `us-action-cases-back-to-home` | `prototypes/wip/case-page/templates/Case-No-Access-Content-HTML.html` (`8812984`) | Both UTNewTheme and UTTemplate have the page; needs the 1.0.18 theme |
| 4 Nov 2026 | Flowz, dev tenant | The Create case form's two flows (prefill and create). The prefill now returns the note's date as `yyyy-mm-dd` (was `en-AU` text) | `flows/dist/Create-Case-Staff-Flows.json`, from `prototypes/wip/case-create-form/flows/` (uncommitted) | **To confirm:** the form README says they aren't imported yet, but the form that calls them was imported on 4 Nov 2026 |

### Items to export at deployment

The iMIS items the theme's case, taskbar, home page and finance dashboard work
depends on, on the dev tenant (`uhubemsdev`). At deployment, export them
fresh with the iMIS exporter; CloudToolz flows go through CloudToolz's own
package manager. Listed 4 November 2026; add to it as work adds items.

**iMIS exporter**

| Feature | Type | Item | iMIS location |
|---|---|---|---|
| Cases | Panel sources | `i4u_UT_Cases`, `i4u_UT_Cases_Communications`, `i4u_UT_Cases_Contacts`, `i4u_UT_Cases_Meetings`, `i4u_UT_Cases_Staff` | Panel sources |
| Cases | Panel source | `Zen_CloudFiles_Notes` (case tasks; agreement notes share it) | Panel sources |
| Change history (cases, agreements) | Panel source | `i4u_UT_Logging` (one row per logged change; includes the `ChangeRank` column the change history list filters on) | Panel sources |
| Cases | Business objects | `_I4u_UT_Cases_Notes`, `_I4u_UT_Cases_Attachments`, `_I4u_UT_Cases_Attachments_Emails`, `_I4u_UT_ZenFileTags` (attachment tags), `_i4u_UT_ValueList_CasePriority` | `$/Design Business Object Definition/` |
| Cases | IQA folder | `Layouts v2`: 30 IQAs, the Manage Case page's Query Templates, Query Menus, Activity Feed bases and API IQAs (incl. `API - Value List - Subtypes`, `API - Create Case - Member Workplaces`) | `$/_i4u_/Core/Cases/Layouts v2` |
| Interactions | Business object | `_I4u_UT_Lookup_InteractionType` (the Interaction Type values: Call, Email, In Person, Note…; the activity feed shows them as an interaction's category). Not named in this repo's code | `$/Design Business Object Definition/` |
| Shared contact objects | Business objects | `_i4u_UT_Contact_Name`, `_I4u_UT_Contact_KeyName` (not tied to one feature in this repo) | `$/Design Business Object Definition/` |
| Taskbar | IQA | `Taskbar Quick Search` (the quick search results) | `$/_i4u_/Core/Directory/Quick Search` |
| Taskbar and admin | IQAs | 16 IQAs: the taskbar Recents (`Recent Content Pages`, `Recent IQAs`, all and user), `Query Search - IQA Document Tree Taskbar`, `CFL Search`, `IQA Access Datasource`, the IQA Builder quick-add lists, `Staff Site Shortcuts`, `System Version Number`, `Alert Notification - System Alerts`, and the 4 `Access Sync` IQAs | `$/_i4u_/Core/Admin` |
| Home page | IQA folder | `Home Page - UnionSuite`: 7 IQAs, `Query Template - Home Page - My Tasks` and the 6 `Stats` IQAs (`Total Member Count`, `Members Joined`, `Members Resigned`, `Member Counts by Category`, `by Financial Status`, `by Group`) | `$/_i4u_/Core/Home Page/Home Page - UnionSuite` |
| Home page (client) | IQA folder | `Home Page - UnionSuite`: 5 IQAs, `Query Template - Home Page - Welcome Message` and the 4 `Trackers` (`1. API Tracker - Pending Membership Applications`, `2. … Pending Resignations`, `3. … Locked Out Users`, `4. … Change Requests`). In the client folder, so a client may have changed it | `$/_i4u_/Client/Home Page - UnionSuite` |
| Home page | Content layout | `i4u_UT_HomePage_v2` (the home page's layout) | `$/ContentManagement/DefaultSystem/ContentLayouts/i4u_UT_HomePage_v2` |
| Home page | Content folder | `US-Home-Dashboard`: `Home`, `My-Tasks-Full`, `Staff-Bulletin` and `Popups/Add-Task` (the theme's Add task, `home.add-task`). The theme's Manage bulletin (`home.manage-bulletin`) still opens the older `Home-Dashboard/Staff-Bulletin.aspx`, which isn't in this export | `@/_i4u_/Core/Staff-Site-Layouts/US-Home-Dashboard` |
| Home page (client) | Content folder | `Staff-Site-Layouts` (the folder alone, no pages; import it first so the folder below has a parent) | `@/_i4u_/Client/Staff-Site-Layouts` |
| Home page (client) | Content folder | `US-Home-Dashboard`: `Stats/Membership-Stats`, `Search/Contacts`, `Search/Organisations`. In the client folder, so a client may have changed it | `@/_i4u_/Client/Staff-Site-Layouts/US-Home-Dashboard` |
| Finance dashboard | Content | `Finance-Dashboard`, `Batch-Detail`, `Arrears-Dashboard` | `@/_i4u_/Core/UnionPay/Dashboard` |

**CloudToolz package manager**

| Feature | Item | Endpoints |
|---|---|---|
| Cases | 11 quick add/update flows | `/cases/quick-add/task`, `contact`, `meeting`, `StaffList`, `staff`, `note`, `attachment`; `/cases/quick-update/set-lead-staff`, `set-primary-party`, `set-status`, `set-primary-workplace` |
| Cases | The Create case form's prefill and create flows (see the Flowz row above) | — |
| Finance dashboard | `Finance Dashboard - Load Data - Dashboard` and `- Payment Batch Detail` (folder `Finance Dashboard`) | `/UnionTemplate/UnionPay/FinanceDashboard/LoadData/Dashboard`, `…/PaymentBatch` |

## Deployed

| Date | Target | What | Source | Checked |
|---|---|---|---|---|
| 4 Nov 2026 | BeyondFormz, dev tenant | Create case form: opens the new case, and its message links, under the current website | `beyondformz/dist/Create-Case-Staff-Form.json`, built from the working copy (`8812984` plus uncommitted form work) | After a hard refresh, `/UTNewTheme/Cases_CreateCase` ran the new script, and `created()` opened `/UTNewTheme/Cases_ManageCase?CaseID=C221&CaseNum=220` |
