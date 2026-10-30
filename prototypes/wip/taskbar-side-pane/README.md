# Taskbar side pane: help and support

Status: work in progress, first mockup 29 October 2026.

**First version built into the theme (29 October 2026):** the toggle, the pane
with page tabs, and Case help as a chat placeholder on the manage case page
(`Theme/UnionSuite/Scripts/UnionSuiteSidePane.js`, US-SIDE-PANE in
`zUnionSuite.css`, the usage guide's `#side-pane`, `tools/test-side-pane.cjs`).
The owner's decisions for it: the toggle shows only on pages that have a tab
(the case page for now); support tickets wait, and will be two tabs, an admin
ticket to the UnionSuite team and a standard ticket to the client's system
administrator; later tabs include an assistant that sees the page's context
and a preview. Since 30 October 2026 Case help answers from the staff case
guide hosted at `/App_Themes/UnionSuite-Guide/Cases-Help.html`
(`docs/user-guide/`), matching questions by words with
`Scripts/UnionSuiteHelpMatch.js`: no AI. The ticket screens below remain the
mockup for the later tabs, as does the help screen's Raise a ticket handoff.

## Problem

Staff need one place to get help without leaving the page they're on: ask how
to do something, and raise a support ticket when that isn't enough. The owner
asked for a button at the right of the taskbar that opens a side pane, starting
with a help/chat bot and a support ticket form, with room for more later.

## The mockup

- **Setting:** the theme's real header and taskbar, as deployed: the native
  iMIS header with Cart, Easy Edit, On behalf of and the account menu,
  `UnionSuiteTaskbar.js` (Quick Search, Full Search, appearance switch) and
  `UnionSuiteTaskbar-Bookmarks.js` (bookmarks, Go to… palette, bookmarks bar
  and Recents). Pip is off through the theme's own `pipGreeting: false`
  (owner, 29 October 2026).
- **Toggle:** an icon-only side pane toggle (Tabler `layout-sidebar-right`) at
  the far right of the taskbar, after the bookmarks star (CSS `order: 3`; the
  appearance switch is 1 and the star 2). It is a general pane toggle, not a
  Help button, because the owner expects the pane to host more features
  (29 October 2026). It uses the bookmarks script's `us-nav-icon-button` and
  repeats the star's pressed state, so the two read as a pair. The tooltip
  reads Show or Hide side pane. 44px at 950px and below.
- **Pane:** 400px from the right, below the header, so the taskbar and launcher
  stay visible, including the bookmarks bar when shown. It slides like the Where-used drawer (`US-WHERE-USED` in
  `zUnionSuite.css`): 220ms in, 180ms out. It is non-modal: the page stays
  usable. Escape or ✕ closes it and returns focus to the launcher.
- **Overlay or Push:** a workshop control compares covering the page with
  narrowing it. At 950px and below it always overlays; at 480px it is full width.
- **Ask:** a greeting with three suggested questions, then a chat. Answers show
  the guide page they came from. A "Did that help?" No, or an answer the
  assistant can't give, offers **Raise a ticket**.
- **Support ticket:** category, subject, details, an impact switch (Not much /
  Slowing me down / I can't work) with a hint for what happens next, and a "Sent
  with your ticket" list: this page, browser and screen, and the help chat when
  handed over. Each can be unticked. Add a screenshot or file. Sending shows
  the ticket number, the reply promise and "Your tickets" with statuses.
- **Handoff:** Raise a ticket switches tabs, attaches the chat, fills the
  category and subject from the conversation and focuses the details. Details
  become optional while the chat is attached.

Answers, files, tickets and page details are fictional. Nothing is sent.

## Sources and preview

| File | Purpose |
|---|---|
| `Side-Pane.frame.html` | The mockup page: native iMIS header markup and a placeholder page |
| `Side-Pane.page.css` | Layout for that page only |
| `Side-Pane.fixture.js` | Offline answers for bookmarks and Recents, Pip off, no navigation |
| `Side-Pane.markup.html` | Pane markup |
| `Side-Pane.css` | Launcher and pane styles (prototype only, theme tokens) |
| `Side-Pane.js` | Pane behaviour and canned answers |
| `Side-Pane.source.html`, `Side-Pane.controls.js` | Workshop page and its controls |
| `tools/build-taskbar-side-pane.cjs` | Builds `references/Taskbar-Side-Pane.html` |

The builder embeds the theme as deployed: native Orion CSS, the Tabler icon
font, `zUnionSuite.css`, client branding and `zzDarkMode.css`, the core script
sections the taskbar uses, and both taskbar scripts unchanged. Quick Search
answers come from the guide's `taskbar-example.js` fixture. The header markup
and styles follow the guide's utility navigation example. The outer workshop
page reuses `Taskbar-Workshop.css` from the approved taskbar.

```powershell
node tools/build-taskbar-side-pane.cjs
node tools/build-taskbar-side-pane.cjs --check
```

Then open `references/Taskbar-Side-Pane.html` in a browser.

## Open decisions

- **Overlay or Push** on wide screens.
- **What else lives in the pane** (two tabs now; a third or fourth still fits
  the switcher), and whether it remembers its open state and tab across pages.
- **Assistant source:** the usage guide via the Claude API through a server
  proxy, or a knowledge-base search. Who can use it, and what it may see.
- **Ticket destination:** email, a helpdesk API, or an iMIS record; where
  "Your tickets" and their statuses come from; who receives "I can't work".
- **Attachments:** real screenshot capture, file limits.

## Implementation notes

- An iMIS page is one ASP.NET form, so the production pane cannot contain
  `<form>` elements (forms cannot nest). Use buttons with handlers, and handle
  Enter in the chat box as the mockup's key handler already does.
- Native styles reach the pane: `html, body, form { height: 100% }` and
  Orion's `label` margin, weight and colour. `Side-Pane.css` resets both.
- In this preview the header wraps the account menu to a second row below
  about 1366px with or without the toggle; use the Wide preview width.
