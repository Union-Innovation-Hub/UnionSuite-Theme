---
id: change-the-case-tabs
title: Change the case tabs
section: Configuration
answer: Put the site's tab pages in `@/_i4u_/Client/Cases/UnionSuite/Manage-Case/Tabs`. Once it has one published page, the case shows only the Client tabs; empty, it shows every core tab.
asks:
  - how do I add a tab to the case page
  - override the case tabs for a client
  - hide a tab on the case page
  - change the order of the case tabs
keywords: [tab, tabs, override, client tabs, add tab, hide tab, rename tab, order, CCO, dynamic content collection organizer]
related: [where-case-settings-live, case-page-parts]
verify:
  - Confirm whether a draft (unpublished) page in the Client Tabs folder counts as a tab.
---
The Manage Case page's tabs come from a folder, not from a fixed list. It looks in the Client folder first and uses the core folder only when the Client folder is empty.

| Client Tabs folder | Tabs on the case |
| --- | --- |
| Empty | Every core tab: Overview, Details, Activity, Parties, Attachments |
| One or more published pages | **Only** the Client folder's pages |

It is all or nothing: the two folders are never mixed. To add one tab and keep the rest, the Client folder needs a copy of each core tab you keep, plus the new one.

**To change the tabs**

1. Copy the core tabs you want to keep from `@/_i4u_/Core/Cases/UnionSuite/Manage-Case/Tabs` into `@/_i4u_/Client/Cases/UnionSuite/Manage-Case/Tabs`.
2. Add or change pages there. Leave out a tab to hide it.
3. Publish them, then open a case and check the tabs.

**How tabs are named and ordered**

- The tab's label is the page's **Title**.
- Tabs are ordered by the page's **Name**, so number them: `1.Overview`, `2.Details`. A name without a number sorts after the numbered ones.
- The first tab opens by default.
- Pages in folders inside `Tabs` count as tabs too, so keep anything else out of it.

**To go back to the core tabs,** delete or move every page out of the Client Tabs folder.

> **Tip:** Copied tabs don't get later core changes. After an upgrade, compare them with the core tabs.
