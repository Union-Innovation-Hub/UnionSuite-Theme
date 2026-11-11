# MVP task list

The work left before the theme's MVP. Set by the owner on 14 October 2026.
Day-to-day tasks and live checks stay in [TODO.md](../TODO.md); tick items off
here as each one is finished.

## Taskbar

- [ ] Palette: replace the placeholder entries with the real list.

## Home page

- [ ] Search: go back to the standard CCO search.
- [ ] Needs attention: point the folder at a real folder, not the sandbox.

## Contact layout

- [ ] CloudToolz Query Template: finish it. **Blocks most of the finance
      sections.**
- [ ] Contact IQAs: move them out of the sandbox (list below, under
      [IQAs still in the sandbox](#iqas-still-in-the-sandbox)).
- [ ] Banner: finish it.
  - [ ] Alerts
  - [ ] Delegates
- [ ] Activity timeline: finish it.
- [ ] Participation tab: tidy it up to match the mockup.
- [ ] History / changelog tab: finish it.

Handover and decisions: [contact page v3](../prototypes/wip/contact-page-v3/README.md).

## Cases layout

- [ ] Banner
- [ ] Overview
- [ ] Details
- [ ] Activity
- [ ] Quick actions
- [ ] Composer actions
- [ ] Create case form

Handover: [case page](../prototypes/wip/case-page/HANDOVER.md). Open data
issues (CaseID not reaching the case contacts IQA, ContactType 'Please
Enter') are under Cases in [TODO.md](../TODO.md#cases).

## Agreements layout

- [ ] Review all popups.

Background: [agreement page](../prototypes/wip/agreement-page/README.md).

## IQAs still in the sandbox

Contact, case and agreement IQAs that the repo references in a `SandBox`
folder (found 14 October 2026). Each one needs a production folder. When an IQA
moves, also update every file listed beside it. This list only covers paths
written in the repo. Paths set only in an iPart's settings on the live site
won't appear here, so check each page in iMIS too (IQA designer → Where used).

### Contact

| Sandbox IQA or folder | Used by |
| --- | --- |
| `$/_i4u_/SandBox/CRM Layouts/Contact_Page/Alerts` | Banner alert bell: `usage/templates/Banner-Contact-Template.html`, v3 `index.html` |
| `$/_i4u_/SandBox/CRM Layouts/Contact_Page/Active Positions` | Banner positions: same files |
| `$/_i4u_/SandBox/CRM Layouts/Contact_Page/Tab Counts` | Banner tab counts: same files |
| `$/_i4u_/SandBox/CRM Layouts/Contact_Page/Trackers` | Contact trackers: v3 `index.html`, v3 `README.md` |
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity` (folder) | Activity timeline sources (Interactions, Outbound Emails, Outbound Email Resends, Outbound Emails History …): v3 `index.html`, `contact-page.js`, `docs/THEME-ACTIVITY-FEED.md`, `Activity-IQA-Specs.md` |
| `$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities` (folder) | Timeline details IQAs (client-editable): `Activity-IQA-Specs.md`, `Outbound-Emails-Build.md` |

### Cases

| Sandbox IQA or folder | Used by |
| --- | --- |
| `$/_i4u_/SandBox/Cases/Case Activity` (folder, incl. `Last 30 Days`) | Activity, recent activity and changes: `case-page.js`, `Case-All-Activity-`, `Case-Recent-Activity-`, `Case-Changes-Query-Template.html` |

The banner, staff, notes ledger and parties IQAs are already under
`$/_i4u_/Core/Cases/`. The member card's and the parties' details are
client IQAs (28 October 2026): `$/_i4u_/Client/Cases - UnionSuite/Layouts/`
`API - Manage Case - Primary Party Details` and `API - Manage Case - Party
Details`.

### Agreements

| Sandbox IQA or folder | Used by |
| --- | --- |
| `$/_i4u_/SandBox/CA/ZenFileTags` (moved 5 Nov 2026 to `$/_i4u_/Core/Shared/API - Zen Attachment Tags`) | Attachment tag suggestions. **Already in the shipped theme** (`Theme/UnionSuite/zUnionSuite.js`, `US-ATTACHMENTS`). |
| `$/_i4u_/SandBox/CA/Agreement Summary` | Field groups: `Agreement-Field-Groups-Query-Template.html` |
| `$/_i4u_/SandBox/CA/Agreement Details` | Field groups: same template |
| `$/_i4u_/SandBox/CA/Agreement Key Dates` | Field groups: same template |
| `$/_i4u_/SandBox/CA/Agreement Resolution` | Field groups: same template |
| `$/_i4u_/SandBox/CA/Data - Manage Agreement - Agreement Details`, `… - Key Dates`, `… - Resolution` | The iPart sources the panels sit on (the live page still uses them): `Field-Groups-IQA-Build.md` |
| `$/_i4u_/SandBox/CA/Increases/Agreement Increases` | Increases rows: `Agreement-Increases-Query-Template.html`, `Agreement-Increases-Rows-Query-Template.html` |
| `$/_i4u_/SandBox/CA/Increases/Agreement Increases Summary` | Increases summary: `Agreement-Increases-Summary-Query-Template.html` |

The other agreement IQAs are already under `$/_i4u_/Core/CA/`. The v1
mock-up (`prototypes/Agreement Management/`) also names
`SandBox/CA/Config - Query Template Definitions` and
`SandBox/CA/Query Template - Manage Agreement - Milestones API`. Check
whether the live page still uses them.

### Also in the sandbox (outside these three layouts)

- Home: the Needs attention trackers and the membership stats IQAs
  (templates under `usage/templates/Home/`) moved to the client folders
  `$/_i4u_/Client/Home Page - UnionSuite/Trackers` and `.../Stats` on
  4 November 2026. Nothing is deployed from the sandbox.
- Taskbar bookmarks: `$/_i4u_/SandBox/CRM Layouts/Jobs List` in
  `Scripts/UnionSuiteTaskbar-Bookmarks.js`.
