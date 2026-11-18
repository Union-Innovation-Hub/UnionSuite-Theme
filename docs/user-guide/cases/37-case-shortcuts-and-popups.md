---
id: case-shortcuts-and-popups
title: Shortcuts and popups the case page opens
section: Technical
answer: Most case forms open through `Cases_` shortcuts, such as `Cases_CreateNote` and `Cases_EditCase`. Two still open a page path directly: **Email parties** and the upload form.
asks:
  - which shortcuts does the case page use
  - what pages do the case popups open
  - why does a case popup open the wrong page
keywords: [technical, shortcut, shortcuts, popup, popups, form, forms, aspx, path, website]
related: [case-page-parts, case-queries-and-endpoints]
verify:
  - From theme 1.0.26 the popups' addresses carry the current website (`WebsiteKey`), so each website that runs the theme needs these shortcuts. Check them on UTNewTheme (dev) and UTStaff (clients).
---
**Shortcuts** (each must exist on the site)

| Shortcut | Opens |
| --- | --- |
| `Cases_ManageCase` | The case page |
| `Cases_CreateCase` | The Create case form (`@/_i4u_/Core/Cases/UnionSuite/Forms/Create-Case-Staff-Form`) |
| `Cases_NoAccess` | The no-access page |
| `Cases_CreateNote` | **Add note** and **Add task**'s full form, and **Edit note** and **Edit task**: one note and task form (`UnionSuite Cases: Note`), opened on Note, on Task with `Type=task`, or on a saved one with `Ordinal` |
| `Cases_CreateMeeting` | **Add meeting**'s full form |
| `Cases_EditCase`, `Cases_ResolveCase` | **Update case details**, **Resolve case** and **Edit resolution** |
| `Cases_ManageStaff` | **Add staff**'s full form |
| `Cases_EditStaff` | Not needed once the role menu is live (C44): a staff member's role is changed on their card |
| `Cases_ManageContacts` | **Add party** |
| `Cases_EditMeeting` | Editing a meeting |

**Direct page paths**

| Action | Page |
| --- | --- |
| **Email parties** | `/_i4u_/Core/Cases/UnionSuite/Manage-Case/Popups/Send-Email-Parties.aspx` |
| **Upload**'s full form | `/_i4u_/Core/Zidebar/Add-Note-New.aspx` |

A direct path breaks if its page moves. A shortcut only needs its target updated.

Shortcuts belong to a website. The popups' addresses carry the current website's key (`WebsiteKey`), so a shortcut is looked up on the website being used, not the domain's default. Every website that runs the theme needs its own `Cases_` shortcuts.
