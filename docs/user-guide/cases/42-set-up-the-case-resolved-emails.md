---
id: set-up-the-case-resolved-emails
title: Set up the case resolved emails
section: Configuration
answer: Resolving a case can email the member and the lead staff member. Turn each on in `UnionTemplate.Configuration` (Cases, Resolution): `EmailPrimaryContact` and `EmailPrimaryStaff`. iMIS sends them from a communication template.
asks:
  - how do I turn on the case resolved email
  - email the member when a case is resolved
  - does resolving a case send an email
  - stop the resolution email
  - where is the resolve case email set up
  - change the wording of the case resolved email
keywords: [email, notification, notify, resolve, resolved, resolution, close, closed, configuration, setting, settings, automation, trigger, i4u_UT_AutomationTrigger, EmailPrimaryContact, EmailPrimaryStaff, template, communication]
related: [resolve-and-close, reopen-or-edit-resolution, where-case-settings-live, change-the-case-email-template]
verify:
  - Needs the rebuilt Resolve case flow (17 November 2026) on the site; until it is imported, resolving still sends the old CloudToolz emails.
  - The flow reads the settings with Entity DEMO only; confirm that's right for every site.
  - Confirm how the iMIS automation sends and logs the email (and that it logs it to the case through Reference).
---
When a case is resolved, two settings decide who is told. Each one that is on adds a row to that person's `i4u_UT_AutomationTrigger`. An iMIS automation sends the email from a communication template, so the email is logged in the person's activity history.

Editing a resolution sends nothing.

**The settings**

In the `UnionTemplate.Configuration` table, with Module `Cases`, Category `Resolution` and Entity `DEMO`:

| Code | Value | What it does |
| --- | --- | --- |
| `EmailPrimaryContact` | `1` on; anything else off | Emails the case's primary party |
| `EmailPrimaryStaff` | `1` on; anything else off | Emails the case's lead staff member |

A case with no lead staff member gets no row for one, and the same goes for the primary party.

**The row it adds**

| Column | What it holds |
| --- | --- |
| `ID` | The person: the primary party or the lead staff member |
| `Type` | `Case Resolved - Primary Contact` or `Case Resolved - Staff Lead` |
| `Reference` | The case's ID, such as `C49` |
| `Date` | When the case was resolved, in the site's local time |
| `EntryGUID` | A new ID for the row |
| `CommunicationLogKey` | Left blank for the automation |

**To set up an email**

1. Write a communication template for it.
2. Set up the iMIS automation to pick up `i4u_UT_AutomationTrigger` rows with its **Type** and send that template to the row's contact.
3. Set its setting to `1`.

The sender and wording come from the template. The old settings `SenderEmailAddress`, `EmailBody` and `EmailBodyStaff` are no longer read.

> **Tip:** If a row can't be added, the case still resolves, and the form says which email couldn't be queued. Send that one by hand.
