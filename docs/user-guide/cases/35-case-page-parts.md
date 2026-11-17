---
id: case-page-parts
title: How the case page is built
section: Technical
answer: `Cases_ManageCase` opens `@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Manage Case`. It has a banner Query Template and a tab organiser called `CaseTab`, and the theme adds the actions, panels and activity feed on top.
asks:
  - how is the case page built
  - what is on the manage case page
  - which iParts are on the case page
  - what does the CaseTab parameter do
keywords: [technical, architecture, page, ipart, iparts, query template, CCO, CaseTab, shortcut, theme, layout, build]
related: [change-the-case-tabs, case-queries-and-endpoints, case-shortcuts-and-popups, change-the-case-statuses]
verify:
  - The Overview's Resolution gate (Query Template - Manage Case - Case Resolved) is being set up on 17 November 2026, replacing the Content HTML. Confirm it is live on 1.Overview.
  - The rule that hides an iPart holding us-case-unresolved (US-CASE-RESOLVED) is in zUnionSuite.css from 17 November 2026. Check an open case shows no Resolution panel once that theme is uploaded.
---
**The page:** `@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Manage Case`, opened through the shortcut `Cases_ManageCase` with `CaseID` in the address. Its wrapper classes are `us-banner-page us-case-page`.

| iPart | Type | What it does |
| --- | --- | --- |
| `Banner` | Query Template Display | `Query Template - Manage Case - Banner Top` (core). Its details row reads the client's Banner Details IQA |
| `CaseTab` | Dynamic Content Collection Organizer | The tabs: the Client Tabs folder, else the core Tabs folder. Its name is also the address parameter, so `?CaseTab=` picks a tab |

**Core tabs** (`@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Tabs`)

| Tab | Holds |
| --- | --- |
| `1.Overview` | Query Templates for the resolution, tasks, meetings, recent activity, the primary party, recent attachments and staff |
| `2.Details` | Case details and Resolution panels (Content HTML that runs the client IQAs) |
| `3.Activity` | The activity feed, notes details and change history (Query Templates), and meetings and changelog report views (Query Menus) |
| `4.Parties` | The parties list (Query Template) |
| `Attachments` | Every attachment (Query Template) |

The Query Templates are in `$/_i4u_/Core/Cases/UnionSuite/Manage Case`.

**The Overview's Resolution panel** shows only once the case is closed. It is a Query Template Display (CSS class `us-query-template us-case-resolved`, one row) whose IQA, `Query Template - Manage Case - Case Resolved`, is a gate: one row when the case's status has Expansion `Closed` in `i4u_UT_CASE_STATUS`, none while it is open. Its template runs the client `API - Manage Case - Resolution` for the fields. Its No results field holds `<span class="us-case-unresolved" hidden></span>`, which hides the whole iPart. See [Add or change the case statuses](#change-the-case-statuses).

**The theme's part** (`Theme/UnionSuite`)

- `Scripts/ActionDefinitions.js`: every case button and menu item (`cases.*` actions) and the add-and-pick composers.
- `zUnionSuite.js`: the panels laid out by column name (`US-FIELD-GROUPS`), the activity feed, the primary workplace picker, email results and in-place tab switching.
- To check which theme build a site runs, run `window.UnionSuiteLoader.status()` in the browser console.
