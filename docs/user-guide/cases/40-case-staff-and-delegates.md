---
id: case-staff-and-delegates
title: How the Case team splits staff and delegates
section: Technical
answer: The Case team IQA reads each case staff row's `StaffType`. `Representative` (hard-coded, not in the Case Contact Types list) makes the row a Delegate; any other value is Staff. The same field is the role shown on the card.
asks:
  - how does the case team know who is a delegate
  - where does the delegate group come from
  - what is a representative on a case
  - why does a delegate show as representative
  - what IQA builds the case team list
keywords: [technical, delegate, delegates, representative, staff, case staff, case team, group, StaffType, IQA, query template]
related: [case-queries-and-endpoints, add-staff, change-staff-role, remove-staff]
verify:
  - Confirm which save writes StaffType 'Representative' (the delegate add) and that no list offers it.
  - Decide what the role menu does on a delegate (see below) before it is promoted to the theme.
  - Confirm whether a delegate on the case can open a case with Individual access (the remove check's CanOpen).
---
**The IQA:** `$/_i4u_/Core/Cases/UnionSuite/Manage Case/Query Template - Manage Case - Case Staff`, the *Staff* Query Template Display on the **1.Overview** tab. Its template is the Case team card.

| Source (alias) | Business object | Joined on |
| --- | --- | --- |
| `CaseStaff` | `i4u_UT_Cases_Staff` | the case staff rows |
| `CaseStaffName` | `_i4u_UT_Contact_Name` | `StaffId` |
| (the case) | `i4u_UT_Cases` | `CaseOrdinal` = the case's `Ordinal` |

Filter: `CaseOrdinal` = `@url:CaseNum` (from the page address, not a prompt). Sort: `FirstLast`. The lead is put first by the theme (`us-contacts-lead-first`), not the IQA.

**Columns**

| Column | From |
| --- | --- |
| `Ordinal` | The case staff row |
| `ContactId` | `StaffId` |
| `ContactName` | `FULL_NAME` |
| `ContactIsLead` | `'true'` when the case's `StaffLeadID` = `StaffId` |
| `ContactRole` | `StaffType` |
| `ContactGroup` | `'Delegate'` when `StaffType` = `'Representative'`, else `'Staff'` |
| `ContactGroupOrder` | `2` for a delegate, else `1` |
| `ContactGroupTone` | `success` for a delegate, else `info` |
| `ContactEmail` | `EMAIL` |
| `ContactPhone` | `PreferredMobile` |
| `ContactUrl` | A custom expression (the person's record) |

**Staff or delegate**

| `StaffType` | Group | Heading tone | Where the value comes from |
| --- | --- | --- | --- |
| `Representative` | Delegate | success (green) | Hard-coded when a delegate is added; not in the Case Contact Types list |
| Anything else (Case manager, Support, …) | Staff | info (blue) | `Case Value List - Case Contact Types`, chosen in **Add staff** |

**What follows from one field**

- **The role is the group's source too.** A delegate's role on the card reads *Representative*, and changing a row's `StaffType` moves it between Staff and Delegate.
- **The role menu (C44, mockup only) lists only the Case Contact Types.** On a delegate it opens with nothing marked, and choosing a role would make them Staff. Before it is promoted, either show a delegate's role as plain text (no menu), or keep the menu and add *Representative* to it.
- **The IQA reads the case from the page address**, so it can't be called through `GET /api/query`. That is why **Remove from case** checks the case through its own IQA ([IQAs and endpoints](#case-queries-and-endpoints)).
- **The group headings** read *Staff* and *Delegate*, the IQA's values. While headings show, the theme hides the group on each card.
