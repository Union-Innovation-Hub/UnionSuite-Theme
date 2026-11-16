---
id: change-the-party-details
title: Change the member card and party details
section: Configuration
answer: The **Overview** member card reads `API - Manage Case - Primary Party Details` (filter `CaseNum`). Each party on the **Parties** tab reads `API - Manage Case - Party Details` (filter `ID`). Both are in the Client Layouts folder.
asks:
  - how do I change the member card on a case
  - add a field to the parties tab
  - change the membership warning on a case
  - what does the primary party card show
keywords: [member card, primary party, party, parties, member details, membership, alert, warning, work, contact, unfinancial]
related: [where-case-settings-live, field-group-columns, the-member-card, add-a-party]
---
| Card | IQA (in `$/_i4u_/Client/Cases/UnionSuite/Layouts`) | Filter |
| --- | --- | --- |
| Member card on the **Overview** | `API - Manage Case - Primary Party Details` | `CaseNum`. It finds the member from the case |
| A party on the **Parties** tab | `API - Manage Case - Party Details` | `ID`, the party's iMIS ID. It must be a prompt, not an `@url` value |

Both return one row and are laid out by [column name](#field-group-columns). In the base version they return:

- `Alert-Title` and `Alert-Tone`: the membership warning, such as *Non-Member* (danger). Blank for a member in good standing.
- `Contact-Email` and `Contact-Mobile`.
- `Membership-Joined` and `Membership-Paid Through`.
- Member card only: `Work-Workplace`, `Work-Category`, `Work-Industry`… These are the **case's** workplace (the one chosen on the case), and blank when the case isn't about a workplace.

**Keep the two in step.** They should return the same `Alert-`, `Contact-` and `Membership-` columns, so a member looks the same on both tabs.

**Messages you may see**

- *No details recorded.* The IQA ran but returned no row: check the filter name.
- *These details could not be loaded.* The IQA failed: check its path and that staff can run it.
