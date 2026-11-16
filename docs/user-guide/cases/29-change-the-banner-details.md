---
id: change-the-banner-details
title: Change the banner's details
section: Configuration
answer: The facts under the case banner (Type, Subtype, Priority, Lead staff) come from `API - Manage Case - Banner Details` in the Client Layouts folder. Each `Additional-` column is one fact, labelled with the text after the prefix.
asks:
  - how do I change what shows in the case banner
  - add a field to the case header
  - change the banner labels
  - make priority a badge
keywords: [banner, header, heading, facts, label, labels, lead staff, priority, type, subtype, badge, tone, Additional]
related: [where-case-settings-live, read-the-banner]
---
**IQA:** `$/_i4u_/Client/Cases/UnionSuite/Layouts/API - Manage Case - Banner Details`

**Filter:** a prompted filter named `CaseNum` (the case's number). One row.

The banner itself (case number, member, status and **Actions**) is core. The details row under it reads this IQA's columns by name, in column order:

| Column | Shows |
| --- | --- |
| `Description` | First, under *Description*, cut off after 300 characters with **Read more** |
| `Additional-Label` | A fact labelled *Label*: `Additional-Lead staff` shows as **Lead staff** |
| `Tone-Label` | Shows the fact with that label as a badge: `success`, `warning`, `danger` or `info`. Blank shows plain text |

- Blank facts are left out.
- Dates read like *1 Jan 2026*, and true/false values read Yes/No.
- In the base version, the IQA returns `Additional-Type`, `Additional-Subtype`, `Additional-Priority`, `Additional-Lead staff` and `Additional-Opened`, with `Tone-Priority` and `Tone-Lead staff`.

**Examples**

- To rename a label, change the column's alias: `Additional-Category` instead of `Additional-Type`.
- To add a fact, add a column named `Additional-` plus its label.
- To warn when no lead staff is assigned, return `danger` in `Tone-Lead staff` for that case.
