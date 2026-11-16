---
id: field-group-columns
title: Column names that lay out a panel
section: Configuration
answer: Name a column `Group-Label` to put **Label** under the heading **Group**. `Alert-Title`, `Alert-Message` and `Alert-Tone` show an alert above the fields, and `Tone-Label` turns that field into a badge.
asks:
  - how do column names work on the case panels
  - what does Group-Label mean
  - how do I add an alert to a panel
  - how do I make a field a badge
keywords: [column, columns, column name, alias, prefix, hyphen, Group-Label, heading, group, alert, tone, badge, layout, field groups, show blank, Empty, empty group, dashes]
related: [change-the-case-detail-panels, change-the-party-details, change-the-activity-card-details]
---
The case panels and the activity cards share these rules. They read the IQA's columns in order.

| Column name | Shows |
| --- | --- |
| `Work-Employer` | *Employer* under the heading *Work*. The name splits at the first hyphen only |
| `1-Outcome` | A group named with a number starts a new line with no heading |
| `Alert-Title`, `Alert-Message`, `Alert-Tone` | An alert above the fields. A blank `Alert-Title` leaves it out |
| `Tone-Label` | The field labelled *Label* as a badge: `success`, `warning`, `danger` or `info` |
| `Empty-Group` | A line shown instead of the group's fields when they are all blank: `Empty-Workplace` with *This case isn't about a workplace.* |
| `Additional-Label` | On the banner and activity cards, the older style: a label with no heading. On a panel it is an ordinary group, headed *Additional* |

- Fields show in column order, and groups in the order of their first column.
- A label keeps the IQA's wording when it has a space (`Lead Staff` stays *Lead Staff*). The page shows labels in capitals either way.
- A `Tone-Label` column applies to every field with that label, in any group.
- Dates read like *30 Jun 2026*, true/false reads Yes/No, and email and web addresses become links.
- A value over 60 characters takes the whole row.

**Blank values**

- **Panels** (Case details, Resolution, the member card, party details) show a blank value as a dash. If a whole group can be blank, add an `Empty-` column for it so the panel says why, instead of showing a row of dashes.
- **Activity cards** leave blank values out. To show one anyway, end its column name with `(show blank)`: `FollowUp-Actioned notes (show blank)`.

> **Tip:** Untick key columns you don't want shown. Activity cards already leave out `Ordinal`, `ActivityKey` and `CaseNum`.
