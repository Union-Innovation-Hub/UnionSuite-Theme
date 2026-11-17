---
id: case-queries-and-endpoints
title: IQAs and endpoints the case page calls
section: Technical
answer: The theme runs core IQAs by path through `GET /api/query`, and saves through CloudToolz endpoints under `/cases/`. The flows have no hooks for site changes yet.
asks:
  - which IQAs does the case page use
  - what endpoints does the case page call
  - are there hooks in the case flows
  - what saves a case task
keywords: [technical, IQA, api, query, endpoint, endpoints, CloudToolz, flow, flows, hook, hooks, quick-add, quick-update]
related: [case-page-parts, case-shortcuts-and-popups, where-case-settings-live]
verify:
  - Re-list these after any theme change that adds a case lookup or save.
  - The staff removal check, set-staff-role and remove-staff are proposed: the theme calls them from 1.0.28, but they are not built yet. Mark them built once they are.
  - Check that a keepalive removal sent as the page closes reaches CloudToolz through the theme's call.
---
**IQAs the theme runs by path** (`GET /api/query`), all in `$/_i4u_/Core/Cases/UnionSuite/Manage Case` unless noted

| IQA | Used by |
| --- | --- |
| `API - Manage Case - Primary Contacts Workplaces` | Choosing the case's workplace |
| `API - Manage Case - Contact List - Primary Workplace` | **Add party**'s list |
| `API - Value List - Case Status` | The status menu, open or closed, and the banner's status colour (`Code`, `Description`, `Closed Status`, `Colour`), from the lookup tables `i4u_UT_CASE_STATUS` and `i4u_UT_CASE_STATUSCOLOUR`. See [Add or change the case statuses](#change-the-case-statuses) |
| `API - Communication Recipient List - Parties` | **Email parties**' recipients |
| `API - Case Email Logs` | Matching a sent email to the case |
| `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Case Value List - Case Contact Types` | **Add staff**'s roles, and the role menu on a staff card (`value`, `label`; was `Get Case Staff Member Types`) |
| `API - Manage Case - Staff Removal Check` (proposed) | **Remove from case**'s check: one row per staff member, prompt `CaseNum`; `Ordinal`, `IsLead`, `CaseAccess` (Open, Team or Individual), optional `CanOpen` ('false' for a row that doesn't let that person open an Individual case) |
| `$/_i4u_/Core/Shared/API - Communication Details` | A sent email's recipients on its activity card |
| `$/_i4u_/Core/Shared/API - Zen Attachment Tags` | Attachment tag suggestions |

The client IQAs are in [Where a site's case settings live](#where-case-settings-live).

**CloudToolz endpoints**

| Endpoint | Does |
| --- | --- |
| `/cases/quick-add/note`, `task`, `meeting`, `attachment`, `contact`, `staff` | The add forms' saves |
| `/cases/quick-add/StaffList` | The case's staff, for pickers |
| `/cases/quick-update/set-status`, `set-lead-staff`, `set-primary-party`, `set-primary-workplace` | Changes made in place |
| `/cases/quick-update/set-staff-role` (proposed) | The role menu on a staff card: `{CaseID, CaseNum, StaffOrdinal, Role}`, logged as *Staff updated* |
| `/cases/quick-update/remove-staff` (proposed) | **Remove from case**: `{CaseID, CaseNum, StaffID, StaffOrdinal}`; removes the row, clears the case's lead if it was this person, logs *Staff removed* |
| `/cases/complete-task` | Ticking a task |
| `/cases/quick-update/reopen` | **Reopen case**: `{CaseID, CaseNum}`. Sets the status the case had before it was resolved (the newest `Status` change in `i4u_UT_Logging`, through `API - Manage Case - Reopen - Get Previous Status`) if that is still an open status, otherwise `InProgress`; keeps the resolution; logs the status change. An already open case answers 200 without a change |
| `/cases/case-access`, `/cases/attachment-access` | Whether the user may see the case, or a restricted note or file |

**How Remove from case's Undo works:** the theme checks the case first (the check IQA above), so changes made in another tab count. With nothing to warn about, the card closes up and a line with **Undo** takes its place in the Case team; the remove request is only sent when it runs out (6 seconds, paused while the pointer or focus is on it). **Undo** cancels the wait, so nothing is sent and nothing is logged: the change log can't be deleted from, so there is no remove-then-re-add. The ZenToken CloudToolz needs is stored as the card closes, so leaving, hiding or refreshing the page sends any waiting removal at once (`fetch` with `keepalive`). A send that fails brings the card back with an error line under it. With a warning (the lead, the last staff on an Individual case, or removing yourself), the card asks first and **Remove** sends straight away.

**Hooks:** none yet. A site can't add its own steps to these flows without changing them. Hooks are planned and will be listed here.
