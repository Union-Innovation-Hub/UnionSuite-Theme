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
| CloudToolz database | Schema changes to a site's CloudToolz tables (columns the flows and IQAs read or write) | A SQL script run by hand against that site's CloudToolz database |

Environments: the dev tenant is `uhubemsdev.imiscloud.com` (websites
UTNewTheme and UTTemplate share its domain).

## Pending

| Added | Target | What | Source | Notes |
|---|---|---|---|---|
| 4 Nov 2026 | Theme, dev tenant | Release `1.0.18`: Create case button, no-access redirect and its links under the current website; the `CreateCasePopupFn` override (old account page's Quick Actions → Create Case); the Quick Actions double caret; the old account page's small-screen layout; dates in the website's iMIS culture (`US-DATE-LOCALE`: task "Actioned", Membership Overview range, task form "Added on"); the home dashboard's Add task (`home.add-task`) opens `/_i4u_/Core/Staff-Site-Layouts/US-Home-Dashboard/Popups/Add-Task.aspx` instead of the `i4u_Sandbox` page (`f2ec74b`); Needs Attention hides a tracker IQA with no rows instead of erroring, shows errors only in Easy Edit, and logs empty and failed IQAs to the console; its Loading counts… shows the spinner; closing Add task on an empty My Tasks list refreshes it (it failed with "no native IQA origin"); the Membership Stats cards log to the console why a card or figure can't show (a failed IQA, or a breakdown that doesn't add up to the total); on the original contact layout, Workplace Delegates and Workplace Organisers with no results get the same card as with results (temporary rule in the legacy UTStaff block); a case task tick saves through `/cases/complete-task` instead of the agreements `/ca/complete-task` (`Scripts/ActionDefinitions.js`); long field values (the case description) read as body text, not medium weight; the case page's Email parties (`cases.email-parties`) opens `/_i4u_/Core/Cases/UnionSuite/Manage-Case/Popups/Send-Email-Parties.aspx` (was `Layouts-v2/Popups/`, moved 5 Nov 2026; until this upload, Email parties opens the old path and fails) | `8812984`, `c96fe1f`, `f2ec74b`, `caa2718`, plus the uncommitted work in the checkout (incl. the date locale and the Email parties path) | The dev tenant ran `1.0.17` on 4 Nov 2026. Its websites are all `en-AU`, so dates there look the same |
| 4 Nov 2026 | BeyondFormz, dev tenant | Create case form: job and note dates in the website's culture | `beyondformz/dist/Create-Case-Staff-Form.json` (uncommitted) | Reads the note date as `yyyy-mm-dd` from the new prefill flow, and still shows an older flow's text date as it is |
| 4 Nov 2026 | BeyondFormz, dev tenant | Add Edit Task form (the home page's Add task popup): after a successful save, Submit is disabled and the popup closes 1.2 s later, which refreshes the task list | `prototypes/wip/add-edit-task-form/dist/Add-Edit-Task-Form.json`, built from the 4 Nov 2026 export | Closing an empty list's popup refreshes it only with the theme row above |
| 4 Nov 2026 | Content HTML, the home page's Needs Attention | `data-us-iqa-folder` becomes `$/_i4u_/Client/Home Page - UnionSuite/Trackers` (was the SandBox `Home_Page/Trackers`) | `Theme/UnionSuite-Guides/usage/templates/Home/Needs-Attention-Content.html` (uncommitted) | **To confirm:** skip if the page already points there. The Membership Stats page already points at the client `Stats` folder |
| 4 Nov 2026 | Content HTML, each website's `Cases_NoAccess` page | The Back to home link gets `us-action-cases-back-to-home` | `prototypes/wip/case-page/templates/Case-No-Access-Content-HTML.html` (`8812984`) | Both UTNewTheme and UTTemplate have the page; needs the 1.0.18 theme |
| 4 Nov 2026 | Flowz, dev tenant | `Cases: Complete Task` (`/cases/complete-task`), imported over the owner's v1: checks the task's case and the user's entity access, updates iMIS then CloudToolz (with LastUpdatedBy/On), answers errors, and logs the change through `LogChangesToIMIS` | `prototypes/wip/case-page/flows/Cases-Complete-Task.flow.json` (uncommitted) | Import before the theme row above: the theme's case task tick calls this endpoint. Then tick and untick a case task and check the change history |
| 4 Nov 2026 | Flowz, dev tenant | The Create case form's two flows (prefill and create). The prefill now returns the note's date as `yyyy-mm-dd` (was `en-AU` text) | `flows/dist/Create-Case-Staff-Flows.json`, from `prototypes/wip/case-create-form/flows/` (uncommitted) | **To confirm:** the form README says they aren't imported yet, but the form that calls them was imported on 4 Nov 2026 |
| 4 Nov 2026 | CloudToolz database, staging (`CloudToolz_uniontemplateemsdemo1`) and every other site that gets the case page | Add `[Cases].[i4u_UT_Cases].[PrimaryWorkplaceID] varchar(50) NULL`, which the case workplace save (`/cases/quick-update/set-primary-workplace`), the Primary Party details join and the Add party quick list read or write. Guard it with `IF COL_LENGTH(N'Cases.i4u_UT_Cases', N'PrimaryWorkplaceID') IS NULL` | Dev's table (`CloudToolz_uniontemplateEMSDevA_Dev`), which has the column | Run before importing the case flows. Staging's scripted table showed no `SYSTEM_VERSIONING = ON` (dev's history table is `[Cases].[i4u_UT_Cases_History]`): check `temporal_type_desc` in `sys.tables` first, and if it isn't versioned, add the column to `i4u_UT_Cases_History` too when that table exists. Compare the other case tables with dev before go-live. TODO.md, Cases |
| 4 Nov 2026 | CloudToolz database, staging (`CloudToolz_uniontemplateemsdemo1`) and every other site that gets the case page | Add `[Cases].[i4u_UT_Cases_Meetings].[Title] varchar(200) NULL`, which the case Meetings lists read (the `MeetingTitle` expression in `Case-Meetings-Query-Template.html` and `Case-Meetings-Detail-Query-Template.html`; the activity feed's Meetings `Subject`) and Add meeting (`/cases/quick-add/meeting`) sends. Guard it with `IF COL_LENGTH(N'Cases.i4u_UT_Cases_Meetings', N'Title') IS NULL` | Dev's table (`CloudToolz_uniontemplateEMSDevA_Dev`), which has the column | The only difference from dev in staging's `sp_help` (4 Nov 2026). Run before importing the case flows. If the table isn't system-versioned (`OBJECTPROPERTY(…, 'TableTemporalType') <> 2`) and a history table exists, add the column there too; `i4u_UT_Cases_Meetings_History` is a guess at its name from dev's `i4u_UT_Cases_History` |

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
| Cases | Content folder | `UnionSuite`, the one folder for every new-theme case page (owner, 5 Nov 2026); it supersedes all earlier case content folders, `Layouts-v2` included: `Manage-Case` (the Manage Case page, its tabs 1.Overview, 2.Details, 3.Activity, 4.Parties and Attachments, and `Popups/Send-Email-Parties` and `Send-SMS-Parties`) and `Forms/Create-Case-Staff-Form` (the Create case page). Moved from `@/_i4u_/Core/Cases/Layouts-v2` and `@/_i4u_/Core/Cases/UnionSuite` on 5 Nov 2026. The shortcuts `Cases_ManageCase`, `Cases_NoAccess` and `Cases_CreateCase` point into it | `@/_i4u_/Core/Cases/UnionSuite` |
| Cases | IQA folder | `Layouts v2`: 30 IQAs, the Manage Case page's Query Templates, Query Menus, Activity Feed bases and API IQAs (incl. `API - Value List - Subtypes`, `API - Create Case - Member Workplaces`) | `$/_i4u_/Core/Cases/Layouts v2` |
| Interactions | Business object | `_I4u_UT_Lookup_InteractionType` (the Interaction Type values: Call, Email, In Person, Note…; the activity feed shows them as an interaction's category). Not named in this repo's code | `$/Design Business Object Definition/` |
| Shared contact objects | Business objects | `_i4u_UT_Contact_Name`, `_I4u_UT_Contact_KeyName` (not tied to one feature in this repo) | `$/Design Business Object Definition/` |
| Taskbar | IQA | `Taskbar Quick Search` (the quick search results) | `$/_i4u_/Core/Directory/Quick Search` |
| Taskbar and admin | IQAs | 16 IQAs: the taskbar Recents (`Recent Content Pages`, `Recent IQAs`, all and user), `Query Search - IQA Document Tree Taskbar`, `CFL Search`, `IQA Access Datasource`, the IQA Builder quick-add lists, `Staff Site Shortcuts`, `System Version Number`, `Alert Notification - System Alerts`, and the 4 `Access Sync` IQAs | `$/_i4u_/Core/Admin` |
| Home page | IQA folder | `Home Page - UnionSuite`: 8 IQAs, `Query Template - Home Page - My Tasks`, `Query Menu - All Tasks` (the My-Tasks-Full page's list, added 4 Nov 2026: the signed-in user's follow-up tasks from `i4u_UT_Interactions`, with `_I4u_UT_ContactBasic` and `_I4u_UT_Lookup_InteractionType`). The 6 `Stats` IQAs in the first export of this folder moved to the client `Stats` folder on 4 Nov 2026 (three rows down); leave them out of this one | `$/_i4u_/Core/Home Page/Home Page - UnionSuite` |
| Home page (client) | IQA folder | `Home Page - UnionSuite`: `Query Template - Home Page - Welcome Message`. Its `Trackers` and `Stats` folders are the next two rows. In the client folder, so a client may have changed it | `$/_i4u_/Client/Home Page - UnionSuite` |
| Home page (client) | IQA folder | `Trackers`: the 4 Needs Attention trackers, `1. API Tracker - Pending Membership Applications`, `2. … Pending Resignations`, `3. … Locked Out Users`, `4. … Change Requests` (the latest export; supersedes the earlier tracker IQAs). The Needs Attention Content HTML's `data-us-iqa-folder` points here. In the client folder, so a client may have changed its queues | `$/_i4u_/Client/Home Page - UnionSuite/Trackers` |
| Home page (client) | IQA folder | `Stats`: the 6 IQAs behind the Membership Stats cards, `Total Member Count`, `Members Joined`, `Members Resigned`, `Member Counts by Category`, `Member Counts by Financial Status` and `Member Counts by Group`. The Membership Stats cards' `data-us-stats-folder` points here. In the client folder, so a client may have changed which members they count | `$/_i4u_/Client/Home Page - UnionSuite/Stats` |
| Home page | Content layout | `i4u_UT_HomePage_v2` (the home page's layout) | `$/ContentManagement/DefaultSystem/ContentLayouts/i4u_UT_HomePage_v2` |
| Home page | Content folder | `US-Home-Dashboard`: `Home`, `My-Tasks-Full` (its Query Menu lists `Query Menu - All Tasks`; changed 4 Nov 2026, after the first export of this folder), `Staff-Bulletin` and `Popups/Add-Task` (the theme's Add task, `home.add-task`). The theme's Manage bulletin (`home.manage-bulletin`) still opens the older `Home-Dashboard/Staff-Bulletin.aspx`, which isn't in this export | `@/_i4u_/Core/Staff-Site-Layouts/US-Home-Dashboard` |
| Home page (client) | Content folder | `Staff-Site-Layouts` (the folder alone, no pages; import it first so the folder below has a parent) | `@/_i4u_/Client/Staff-Site-Layouts` |
| Home page (client) | Content folder | `US-Home-Dashboard`: `Stats/Membership-Stats` (its 4 data cards' `data-us-stats-folder` now points at the client `Stats` IQA folder; changed 4 Nov 2026, after the first export of this folder), `Search/Contacts`, `Search/Organisations`. In the client folder, so a client may have changed it | `@/_i4u_/Client/Staff-Site-Layouts/US-Home-Dashboard` |
| Finance dashboard | Content | `Finance-Dashboard`, `Batch-Detail`, `Arrears-Dashboard` | `@/_i4u_/Core/UnionPay/Dashboard` |

**CloudToolz package manager**

| Feature | Item | Endpoints |
|---|---|---|
| Cases | 11 quick add/update flows | `/cases/quick-add/task`, `contact`, `meeting`, `StaffList`, `staff`, `note`, `attachment`; `/cases/quick-update/set-lead-staff`, `set-primary-party`, `set-status`, `set-primary-workplace` |
| Cases | `Cases: Complete Task` (the case task tick) | `/cases/complete-task` |
| Cases | The Create case form's prefill and create flows (see the Flowz row above) | — |
| Cases, branch access | CloudToolz table `UnionTemplate.EntityAccess` (which entities, by `EntityCode`, each staff member, by `StaffimisID`, can work on). The case quick add/update flows (add contact, add attachment, set status, set primary workplace) check it before changing a case and fail with "Unauthorised entity" without a row. IQA Enhancements' Branchify joins the `i4u_UT_EntityAccess` business object, probably the iMIS view of this table (not confirmed) | — |
| Interactions and tasks | BeyondFormz folder `Interaction`: forms `One on One Call - New` and `Add Edit Task` (the task form; `Add Edit Task` is the popup behind the home page's Add task) | — |
| Interactions and tasks | `Add Edit Task` (creates or updates a task in `i4u_UT_Interactions`) and `Edit Task - Prefill` (fills the form from `InteractionsPreload` when an `Ordinal` is passed) | `/Interaction/AddEditTask`, `/Interaction/EditTask-Prefill` |
| Finance dashboard | `Finance Dashboard - Load Data - Dashboard` and `- Payment Batch Detail` (folder `Finance Dashboard`) | `/UnionTemplate/UnionPay/FinanceDashboard/LoadData/Dashboard`, `…/PaymentBatch` |

**Not yet listed: what the Interaction forms and flows use.** Seen in
those exports on 4 November 2026 but not exported yet; confirm and add them
above:

- The `One on One Call - New` form's own flows, `Interaction/editinteractionprefill`
  and `Interaction/addinteraction`.
- The panel source `i4u_UT_Interactions` (the task flows write to it, and
  `Query Menu - All Tasks` reads it).
- The page `@/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/OneOnOneCallEdit`:
  `Query Menu - All Tasks` links each task's Edit to it.
- The IQA `$/_i4u_/Core/Contact Layouts/Individual/Interactions/InteractionsPreload`
  (the task prefill reads it).
- The form dropdowns' IQAs in `$/_i4u_/Core/ValueLists/BeyondForms/`:
  `i4u Value List - Note - InteractionType`, `i4u Value List - Note - RelatedTo`,
  `i4u Staff Users`, `i4u Value List - Workbench List - Tasks`.

## Deployed

| Date | Target | What | Source | Checked |
|---|---|---|---|---|
| 5 Nov 2026 | Content, dev tenant | Case pages moved (owner): `@/_i4u_/Core/Cases/Layouts-v2` to `@/_i4u_/Core/Cases/UnionSuite/Manage-Case`, and the Create case form to `@/_i4u_/Core/Cases/UnionSuite/Forms/Create-Case-Staff-Form`. The `Cases_ManageCase`, `Cases_NoAccess` and `Cases_CreateCase` shortcuts updated to match | Done in iMIS by the owner | Owner's report; not checked on the site here. Email parties needs the theme row under Pending |
| 4 Nov 2026 | BeyondFormz, dev tenant | Create case form: opens the new case, and its message links, under the current website | `beyondformz/dist/Create-Case-Staff-Form.json`, built from the working copy (`8812984` plus uncommitted form work) | After a hard refresh, `/UTNewTheme/Cases_CreateCase` ran the new script, and `created()` opened `/UTNewTheme/Cases_ManageCase?CaseID=C221&CaseNum=220` |
