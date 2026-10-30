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
| `page/` | The help page's `help.css` and `help.js`. The matcher both the page and the side pane chat use is a theme script, `Theme/UnionSuite/Scripts/UnionSuiteHelpMatch.js`, which the build inlines |
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

`Theme/UnionSuite/Scripts/UnionSuiteHelpMatch.js` matches a question to a
topic by words, with no AI. It works in a browser or in Node:

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

Since 30 October 2026 the side pane's **Case help** tab (`case-help` in
`Theme/UnionSuite/Scripts/UnionSuiteSidePane.js`, on the manage case page)
is this chatbot. It reads the hosted help page itself, not the JSON:

- **Where:** `CASE_GUIDE_URL`, `/App_Themes/UnionSuite-Guide/Cases-Help.html`
  (the server folder is singular; the repo folder is
  `Theme/UnionSuite-Guides/`). Upload the built `Cases-Help.html` there.
- **What it reads:** the page's `#help-data` block (examples, synonyms,
  topics) and each topic's `article#<id> .topic__body` for its steps. Keep
  both when changing the page build.
- **When:** fetched once per page view, the first time the tab opens, with
  `cache: 'no-cache'` so an uploaded update is seen despite the week-long
  `App_Themes` cache. If it fails, the tab says so and links the guide.
- **Matcher:** the theme's `UnionSuiteHelpMatch.js`, which `index.js` loads
  before the side pane on the case page; the page build inlines the same
  file.

How a reply shows (`us-side-chat` classes):

| Side pane | From the guide |
| --- | --- |
| Greeting's suggested questions (`__suggestions`, `__chip`) | `examples` |
| Assistant bubble (`__message--assistant`, `__bubble`) | `topic.answer_html` |
| Show the steps (`__steps-toggle`, `__steps`) | the topic's `.topic__body`, folded into the bubble |
| Source link (`__source`: title, small line, link) | `topic.title`, the guide's `title`, `topic.url` on the hosted page (new tab) |
| Not quite? Try (`__others`, `__chip`) | `reply.others` |
| Not sure | the nearest topics as chips, and a link to the whole guide |

Links between topics inside the steps (`#id`) answer in the chat, so the
reader never leaves the case. Still to come: offering Raise a ticket when
the answer is not sure (once the support tabs exist), help areas for other
pages, and choosing the area by page.

Test the side pane chat with `node tools/test-side-pane.cjs`: it serves the
guide built in memory from these topics on a stand-in origin.

**When it answers wrongly,** add the question to the right topic's `asks`,
a word to its `keywords`, or a word or phrase to `synonyms.json`, then add
the question to `tools/test-user-guide.cjs`. Do not tune the matcher's
weights for one question.
