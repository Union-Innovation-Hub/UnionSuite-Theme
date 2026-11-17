---
id: where-case-settings-live
title: Where a site's case settings live
section: Configuration
answer: Each site changes cases through its **Client** folders - `$/_i4u_/Client/Cases/UnionSuite/Layouts` for IQAs and `@/_i4u_/Client/Cases/UnionSuite` for content. The **Core** folders are replaced on upgrade, so leave them alone.
asks:
  - where do I configure cases
  - what can a client change on the case page
  - which folders are client folders
  - where are the case IQAs
keywords: [configure, configuration, client, core, folder, customise, customize, settings, setup, admin]
related: [change-the-case-tabs, change-the-banner-details, change-the-case-detail-panels, change-the-party-details, change-the-activity-card-details]
---
The case page is built from two sets of folders. **Core** is the same on every site and is replaced when UnionSuite is upgraded. **Client** belongs to the site: change what you need there, and an upgrade leaves it alone.

**IQAs**

| Folder | What is in it |
| --- | --- |
| `$/_i4u_/Client/Cases/UnionSuite/Layouts` | The site's own details: `API - Manage Case - Banner Details`, `Case Details`, `Resolution`, `Party Details` and `Primary Party Details` |
| `$/_i4u_/Client/Cases/UnionSuite/Layouts/Activity Feed - Details` | What an activity card shows when it opens: `Notes Details`, `Meetings Details`, `Emails Sent Details`, `Emails Logged Details` |
| `$/_i4u_/Core/Cases/UnionSuite/Manage Case` | The page's lists, templates and lookups. Core: don't change |

**Content**

| Folder | What is in it |
| --- | --- |
| `@/_i4u_/Client/Cases/UnionSuite/Manage-Case/Tabs` | The site's own tabs. Empty means the core tabs show |
| `@/_i4u_/Client/Cases/UnionSuite/Manage-Case/Popups` and `Forms` | Kept for the site's own popups and forms. Nothing reads them yet |
| `@/_i4u_/Core/Cases/UnionSuite` | The Manage Case page, its core tabs, popups and the Create case form. Core: don't change |

**Lookup tables**

| Table | What it is |
| --- | --- |
| `i4u_UT_CASE_STATUS` | The case statuses, and whether each is open or closed. See [Add or change the case statuses](#change-the-case-statuses) |
| `i4u_UT_CASE_STATUSCOLOUR` | Each status's colour in the case banner |

**Rules for every client IQA**

- Keep its name and folder. The page finds it by its path.
- Keep its prompted filter's name (`CaseNum` or `ID`, as each topic says) and return one row.
- Column names decide the labels and layout, so most changes are just renaming, adding or removing columns.
- Check the change on a rich case and on a nearly empty one.

> **Tip:** Never recreate a Client folder by hand on another site. Bring it across in the core package, so the page still finds it.
