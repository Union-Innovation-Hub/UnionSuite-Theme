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
---
**IQAs the theme runs by path** (`GET /api/query`), all in `$/_i4u_/Core/Cases/UnionSuite/Manage Case` unless noted

| IQA | Used by |
| --- | --- |
| `API - Manage Case - Primary Contacts Workplaces` | Choosing the case's workplace |
| `API - Manage Case - Contact List - Primary Workplace` | **Add party**'s list |
| `API - Value List - Case Status` | The status menu (`Code`, `Description`, `Closed Status`) |
| `API - Communication Recipient List - Parties` | **Email parties**' recipients |
| `API - Case Email Logs` | Matching a sent email to the case |
| `$/_i4u_/Core/Cases/Value Lists/Case - Form Data/Get Case Staff Member Types` | **Add staff**'s roles |
| `$/_i4u_/Core/Shared/API - Communication Details` | A sent email's recipients on its activity card |
| `$/_i4u_/Core/Shared/API - Zen Attachment Tags` | Attachment tag suggestions |

The client IQAs are in [Where a site's case settings live](#where-case-settings-live).

**CloudToolz endpoints**

| Endpoint | Does |
| --- | --- |
| `/cases/quick-add/note`, `task`, `meeting`, `attachment`, `contact`, `staff` | The add forms' saves |
| `/cases/quick-add/StaffList` | The case's staff, for pickers |
| `/cases/quick-update/set-status`, `set-lead-staff`, `set-primary-party`, `set-primary-workplace` | Changes made in place |
| `/cases/complete-task` | Ticking a task |
| `/cases/reopen` | **Reopen case** |
| `/cases/case-access`, `/cases/attachment-access` | Whether the user may see the case, or a restricted note or file |

**Hooks:** none yet. A site can't add its own steps to these flows without changing them. Hooks are planned and will be listed here.
