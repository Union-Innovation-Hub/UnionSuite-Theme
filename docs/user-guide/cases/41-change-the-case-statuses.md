---
id: change-the-case-statuses
title: Add or change the case statuses
section: Technical
answer: Case statuses are the general lookup table `i4u_UT_CASE_STATUS`. **Code** is what the case saves, **Description** is the label staff see, and **Expansion** says `Open` or `Closed`. Each status's banner colour is in `i4u_UT_CASE_STATUSCOLOUR`.
asks:
  - how do I add a case status
  - where do the case statuses come from
  - rename a case status
  - make a status count as closed
  - what does expansion do on the case status table
  - change the colour of a case status
  - why is the banner this colour
keywords: [status, statuses, case status, lookup, lookup table, general table, general lookup, i4u_UT_CASE_STATUS, i4u_UT_CASE_STATUSCOLOUR, code, description, expansion, open, closed, value list, colour, color, banner colour, pill, rail]
related: [change-the-status, resolve-and-close, reopen-or-edit-resolution, where-case-settings-live, case-queries-and-endpoints]
verify:
  - Confirm API - Value List - Case Status turns Expansion into Closed Status as true or false. The theme reads true, 1, yes or y as closed, so the word Closed passed straight through would read as open.
  - Confirm which status Reopen case (/cases/reopen) saves, and that it is a row with Expansion Open.
  - Status colours are in the theme from 1.0.32. Confirm API - Value List - Case Status returns the Colour column from i4u_UT_CASE_STATUSCOLOUR before staff rely on it.
---
The statuses are a general lookup table, **`i4u_UT_CASE_STATUS`**. Change them in iMIS under **General lookup tables**: choose the table and use **Add new row** or the pencil on a row.

| Column | What it does on the case page |
| --- | --- |
| **Code** | The short value saved on the case. Keep it unchanged once cases use it |
| **Description** | The label staff see: the banner's status and its menu |
| **Expansion** | `Open` or `Closed`. Decides whether a case with this status is open or closed |

The base version ships three rows:

| Code | Description | Expansion |
| --- | --- | --- |
| `Complete` | Complete | `Closed` |
| `InProgress` | In Progress | `Open` |
| `New` | New | `Open` |

**What Open and Closed change**

- **The status menu** in the banner lists the `Open` statuses, in the table's order. A `Closed` status is never chosen there: a case closes through **Resolve case**, which saves `Complete`.
- **The actions:** an open case offers **Resolve case**; a closed case offers **Edit resolution** and **Reopen case**.
- **The Overview's Resolution panel** shows only once the case's status is `Closed`.

**The banner colour**

Each status's colour is a second lookup table, **`i4u_UT_CASE_STATUSCOLOUR`**, matched by **Code**. Its **Description** is the colour; **Expansion** is not used.

| Code | Description (the colour) |
| --- | --- |
| `Complete` | `#14b514` |
| `InProgress` | `orange` |
| `New` | `red` |

- The colour can be a hex value (`#14b514`) or a colour name (`orange`, `red`).
- It colours the status in the banner and the stripe down the banner's left edge. The status is a pale tint of the colour; its text is the colour, darkened or (in dark mode) lightened just enough to read clearly.
- Changing the status from the banner menu changes the colour straight away.
- A status with no row, or a value that isn't a colour, gets the theme's colour for its name, or grey.

**How the page reads it**

`$/_i4u_/Core/Cases/UnionSuite/Manage Case/API - Value List - Case Status` reads both tables and returns `Code`, `Description`, `Closed Status`, which is true when **Expansion** is `Closed`, and `Colour`, the colour table's **Description**. The status menu and the status save use it. The Overview's Resolution gate, `Query Template - Manage Case - Case Resolved` in the same folder, joins the case's status to the table and returns a row only when its **Expansion** is `Closed`. So a new row works everywhere once it is in the table.

> **Tip:** Keep a `Complete` row with Expansion `Closed`. Resolve case saves that code.
