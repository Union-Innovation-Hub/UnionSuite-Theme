# Staff help (user guide)

How-to help for the staff who use UnionSuite, in plain words. It is not the
theme's usage guide: that one is for the people who build pages
(`Theme/UnionSuite-Guides/usage/`). This one is for the people who use them.

Each topic is one job ("Add a note", "Resolve and close a case") with a
one-sentence answer, so the same source feeds a readable help page and a
simple chatbot.

## Folders

| Path | What |
| --- | --- |
| `cases/` | Managing a case: `_area.json` (title, sections in order, example questions) and one Markdown file per topic |
| `page/` | The help page's `help.css` and `help.js`, and `match.js`, the chatbot's matcher |
| `synonyms.json` | Words and short phrases people type, mapped to the words the topics use. Shared by every area |
| `dist/` | Built chatbot data, ignored by Git: `cases-help.json`. The help page itself, `Cases-Help.html`, is built into `Theme/UnionSuite-Guides/` with the other pages hosted in iMIS |

A new area (contacts, agreements) is a new folder with its own `_area.json`;
the build finds it.

## Commands (from the repo root)

```bash
node tools/build-user-guide.cjs
```

```bash
node tools/build-user-guide.cjs --check
```

```bash
node tools/test-user-guide.cjs
```

The build writes the page and `dist/`, and lists each topic's `verify` notes: things to
confirm before staff rely on that topic. `--check` fails on an invalid topic
or a stale output. The test asks the matcher questions worded the way staff
ask them and checks it picks the right topic.

`Cases-Help.html` is one file with everything inlined; it opens from disk.

## A topic

File name: a number for its order, then its id (`08-add-a-note.md`).

```markdown
---
id: add-a-note
title: Add a note
section: Working on a case
answer: Press **Add note**, write the note and press **Save note**.
asks:
  - how do I add a note
  - record a phone call
keywords: [note, comment, call, follow up]
related: [add-and-complete-tasks, restricted-notes-and-files]
verify:
  - Something to confirm before staff use this topic (optional).
---
1. Press **Add note**.
2. Write the note.

> **Tip:** One short tip, if it helps.
```

| Key | Required | What it is |
| --- | --- | --- |
| `id` | yes | Lowercase words joined by hyphens; the link to the topic (`#add-a-note`) and the file name after the number |
| `title` | yes | The job, in the user's words. Starts with a verb where it can |
| `section` | yes | One of the sections in `_area.json` |
| `answer` | yes | One or two sentences, under 260 characters. The chatbot says this, so it must stand alone |
| `asks` | yes, 2+ | Questions as people would type them, not as the topic says them |
| `keywords` | yes | Other words people use for it, including the wrong ones ("comment" for a note) |
| `related` | no | Other topic ids |
| `verify` | no | Notes for us: not shown to staff, listed by the build |

The body supports paragraphs, `**bold**`, `*italic*`, `` `Ctrl+Enter` ``
(shown as a key), `[links](#topic-id)`, numbered and `-` lists (one level of
`-` under a step), `|` tables and `> ` tips. A line that is only bold is a
subheading.

## Writing rules

- **Write for someone on their first day.** Short sentences, everyday words,
  "you". No iMIS, IQA, iPart, CloudToolz or other build words.
- **Name buttons exactly as the screen does, in bold:** **Add note**, not
  "the add button".
- **Say where things are** before what to press: "On the **Overview**, find
  *Tasks* and press **Add task**."
- **Numbered steps for doing; bullets for knowing.** Keep steps to about
  eight.
- **Say what happens after:** what the user sees once it worked, and what to
  do if it did not.
- **Describe only what staff can use.** Anything not live yet gets a `verify`
  note and is checked before the help goes out.
- When a screen changes, change its topic in the same piece of work, as the
  usage guide is.

## The chatbot

`dist/<area>-help.json` holds everything a simple chatbot needs:

```json
{
  "area": "cases",
  "title": "Managing a case",
  "page": "Cases-Help.html",
  "examples": ["how do I close a case"],
  "synonyms": {"to do": "task"},
  "topics": [{
    "id": "add-a-note",
    "title": "Add a note",
    "url": "Cases-Help.html#add-a-note",
    "answer": "Markdown", "answer_text": "plain", "answer_html": "HTML",
    "asks": [], "keywords": [], "related": [],
    "body_markdown": "", "body_html": "", "body_text": ""
  }]
}
```

`page/match.js` matches a question to a topic by words, with no AI. It
works in a browser or in Node:

```js
const matcher = UnionSuiteHelpMatch.create(helpJson);
const reply = matcher.reply('how do i close a case');
// reply.sure: confident enough to answer
// reply.topic: the best topic (answer_html, url, body_html …)
// reply.others: up to two close alternatives
```

A bot can say `topic.answer_text`, link `topic.url` for the steps, and offer
`others` as "Did you mean…". When `sure` is false it should say it does not
know and offer the topics. The help page's Ask a question box is this same
matcher, so trying questions there shows what the bot would answer.

### In the taskbar side pane

The chatbot's home is the taskbar side pane, in the theme since 30 October
2026 (commit 174b7ce): `Theme/UnionSuite/Scripts/UnionSuiteSidePane.js`
(`window.UnionSuiteSidePane`), loaded on the manage case page only, with
its styles in `US-SIDE-PANE` in `zUnionSuite.css` and the usage guide's
`#side-pane`. Its **Case help** tab (`case-help`) is a chat placeholder: a
greeting and a disabled question box. The chat is not wired yet. The design
record and its open decisions are in `prototypes/wip/taskbar-side-pane/`.

Tabs register with `UnionSuiteSidePane.register({id, label, icon,
description, pages, order, render(panel, {close})})`. A second
registration of an id is ignored with a warning, so the real chat replaces
the placeholder's `register` block in `UnionSuiteSidePane.js` (or its own
script registers `case-help` and the placeholder goes).

A reply maps onto the side pane's chat classes (`us-side-chat`):

| Side pane | From the reply |
| --- | --- |
| Greeting's suggested questions (`__suggestions`, `__chip`) | `help.examples` |
| Assistant bubble (`__message--assistant`, `__bubble`) | `topic.answer_html` |
| Source link (`__source`: title, small line, link) | `topic.title`, `help.title`, `topic.url` (new tab) |
| Did you mean (`__chip`) | `reply.others` |
| Escalate (offer Raise a ticket, when that tab exists) | `!reply.sure` |
| Ticket subject from the chat | `topic.title` |

- **Steps stay in the pane.** "Show me the steps" expands `topic.body_html`
  in the bubble rather than leaving the page; links inside it are to other
  topics (`#id`), so answer them by showing that topic in the chat.
- **Did you mean:** offer `reply.others` as chips that ask that topic.
- **Not sure:** say so plainly and offer Raise a ticket, as the mockup's
  fallback does.

- **The placeholder's note** says answers come from "the UnionSuite guide";
  once wired, they come from this staff help.

Still open: where `match.js` and the help JSON are installed (proposed:
under `Theme/UnionSuite/`, as the loader resolves paths from `index.js`,
with the tab fetching the JSON when first opened); one JSON per area chosen
by page, or one for all (per area keeps the case page's download small);
and favouring the area of the page the user is on.

**When it answers wrongly,** add the question to the right topic's `asks`,
a word to its `keywords`, or a word or phrase to `synonyms.json`, then add
the question to `tools/test-user-guide.cjs`. Do not tune the matcher's
weights for one question.
