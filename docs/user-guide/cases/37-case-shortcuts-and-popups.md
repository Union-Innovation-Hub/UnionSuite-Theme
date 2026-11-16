---
id: case-shortcuts-and-popups
title: Shortcuts and popups the case page opens
section: Technical
answer: Most case forms open through `Cases_` shortcuts, such as `Cases_CreateNote` and `Cases_EditCase`. Three still open a page path directly: **Email parties**, the upload form and note details.
asks:
  - which shortcuts does the case page use
  - what pages do the case popups open
  - why does a case popup open the wrong page
keywords: [technical, shortcut, shortcuts, popup, popups, form, forms, aspx, path, website]
related: [case-page-parts, case-queries-and-endpoints]
verify:
  - Popups other than Create case and the no-access page open under the domain's default website, not the current one. Check this on a domain with more than one website.
---
**Shortcuts** (each must exist on the site)

| Shortcut | Opens |
| --- | --- |
| `Cases_ManageCase` | The case page |
| `Cases_CreateCase` | The Create case form (`@/_i4u_/Core/Cases/UnionSuite/Forms/Create-Case-Staff-Form`) |
| `Cases_NoAccess` | The no-access page |
| `Cases_CreateNote`, `Cases_CreateTask`, `Cases_CreateMeeting` | **Add note**, **Add task** and **Add meeting**'s full forms |
| `Cases_EditCase`, `Cases_ResolveCase` | **Update case details**, **Resolve case** and **Edit resolution** |
| `Cases_ManageStaff`, `Cases_EditStaff` | **Add staff** and editing a staff member |
| `Cases_ManageContacts` | **Add party** |
| `Cases_EditMeeting` | Editing a meeting |

**Direct page paths**

| Action | Page |
| --- | --- |
| **Email parties** | `/_i4u_/Core/Cases/UnionSuite/Manage-Case/Popups/Send-Email-Parties.aspx` |
| **Upload**'s full form | `/_i4u_/Core/Zidebar/Add-Note-New.aspx` |
| Note details | `/_i4u_/Core/Zidebar/NoteDetails.aspx` |

A direct path breaks if its page moves. A shortcut only needs its target updated.
