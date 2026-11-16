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
related: [change-the-case-tabs, case-queries-and-endpoints, case-shortcuts-and-popups]
---
**The page:** `@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Manage Case`, opened through the shortcut `Cases_ManageCase` with `CaseID` in the address. Its wrapper classes are `us-banner-page us-case-page`.

| iPart | Type | What it does |
| --- | --- | --- |
| `Banner` | Query Template Display | `Query Template - Manage Case - Banner Top` (core). Its details row reads the client's Banner Details IQA |
| `CaseTab` | Dynamic Content Collection Organizer | The tabs: the Client Tabs folder, else the core Tabs folder. Its name is also the address parameter, so `?CaseTab=` picks a tab |

**Core tabs** (`@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Tabs`)

| Tab | Holds |
| --- | --- |
| `1.Overview` | Resolution (Content HTML), and Query Templates for tasks, meetings, recent activity, the primary party, recent attachments and staff |
| `2.Details` | Case details and Resolution panels (Content HTML that runs the client IQAs) |
| `3.Activity` | The activity feed, notes details and change history (Query Templates), and meetings and changelog report views (Query Menus) |
| `4.Parties` | The parties list (Query Template) |
| `Attachments` | Every attachment (Query Template) |

The Query Templates are in `$/_i4u_/Core/Cases/UnionSuite/Manage Case`.

**The theme's part** (`Theme/UnionSuite`)

- `Scripts/ActionDefinitions.js`: every case button and menu item (`cases.*` actions) and the add-and-pick composers.
- `zUnionSuite.js`: the panels laid out by column name (`US-FIELD-GROUPS`), the activity feed, the primary workplace picker, email results and in-place tab switching.
- To check which theme build a site runs, run `window.UnionSuiteLoader.status()` in the browser console.
