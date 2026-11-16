---
id: change-the-activity-card-details
title: Change what an activity card shows
section: Configuration
answer: When a note, meeting or email card opens on the **Activity** tab, it runs that type's IQA in `$/_i4u_/Client/Cases/UnionSuite/Layouts/Activity Feed - Details` and shows every column it returns.
asks:
  - how do I change what a note card shows when opened
  - add a field to the meeting card in activity
  - activity card details
  - hide a field on the activity card
keywords: [activity, card, timeline, feed, note details, meeting details, email details, open card, follow up, details]
related: [where-case-settings-live, field-group-columns, see-the-case-history]
---
The timeline's list comes from core IQAs. What a card shows when you open it comes from the site's IQAs:

| Card | IQA (in `Activity Feed - Details`) | In the base version |
| --- | --- | --- |
| Note | `Notes Details` | `FollowUp-Task Status`, `FollowUp-Follow Up Required`, `FollowUp-Actioned Notes` |
| Meeting | `Meetings Details` | `Details-Meeting Type`, `Details-Location`, `Details-Other Attendees`, `Outcome-Outcome`… |
| Email sent | `Emails Sent Details` | Its columns, plus the send's recipients, which are core |
| Email logged | `Emails Logged Details` | Its columns |

**Filters:** `CaseNum` and `ActivityKey`, both prompts. One row.

- Every column it returns is shown, laid out by [column name](#field-group-columns).
- Blank values are left out unless the column name ends with `(show blank)`.
- The record's keys (`Ordinal`, `ActivityKey`, `CaseNum`) are never shown.

> **Tip:** Keep the IQA names as they are. The feed finds each one by name in this folder.
