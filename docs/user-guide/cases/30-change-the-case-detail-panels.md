---
id: change-the-case-detail-panels
title: Change the Case details and Resolution panels
section: Configuration
answer: The **Details** tab's Case details and Resolution panels come from `API - Manage Case - Case Details` and `API - Manage Case - Resolution` in the Client Layouts folder. Column names set each label and its group.
asks:
  - how do I add a field to case details
  - change the groups on the details tab
  - change what the resolution panel shows
  - rename a field on the case details
keywords: [details, case details, resolution, panel, field, fields, group, heading, label, Group-Label, alert, outcome]
related: [where-case-settings-live, field-group-columns, update-case-details, resolve-and-close]
---
| Panel | IQA (in `$/_i4u_/Client/Cases/UnionSuite/Layouts`) | Where it shows |
| --- | --- | --- |
| Case details | `API - Manage Case - Case Details` | The **Details** tab |
| Resolution | `API - Manage Case - Resolution` | The **Details** tab and the **Overview** |

**Filter:** a prompted filter named `CaseNum`. One row.

The panels lay themselves out from the IQA's column names, so a change is just a change of columns. See [Column names that lay out a panel](#field-group-columns).

**In the base version**

- **Case details** groups its fields under *Case* (`Case-Type`, `Case-Status`, `Case-Access`…), *Dates* (`Dates-Opened`, `Dates-Incident Date`, `Dates-Duration`) and *Workplace* (`Workplace-Workplace`, `Workplace-Address`…).
- For a case that isn't about a workplace, every `Workplace-` field is blank, so the group shows *This case isn't about a workplace.* instead, as the member card does. The line comes from the `Empty-Workplace` column, an expression returning `N'This case isn’t about a workplace.'` every time; the panel only uses it when the group is blank. Change the text there, or remove the column to show dashes.
- The older `Additional-` columns (Lead staff, Workbench, Source) show under a heading *Additional* here. Rename them `Case-` to put them with the other case fields.
- **Resolution** shows `Alert-Title`, `Alert-Message` and `Alert-Tone`: *Not yet resolved* (info) while the case is open and *Resolved* (success) once it closes, then the outcome fields (`1-Amount won`). `Alert-Only` set to true shows just the alert.

**The same label in two groups**

Each column is its own field, even when two share a label. With both `Additional-Lead Staff` and `Staff-Lead Staff` in the IQA:

| Column | Shows |
| --- | --- |
| `Additional-Lead Staff` | *Lead Staff* under the heading *Additional* |
| `Staff-Lead Staff` | *Lead Staff* again, under the heading *Staff* |
| `Tone-Lead Staff` | Badges **both** fields: a tone matches every field with that label, whatever its group |

Both badges take the one tone (`success`, `warning`, `danger` or `info`), and a blank field stays a dash. A tone can't pick out one of the two. To show the field once, keep one column. To badge only one, give the other a different label, such as `Additional-Lead`.

> **Tip:** Field labels on the panels are the IQA's. The **Update case details** form has its own labels, so rename a field in both places.
