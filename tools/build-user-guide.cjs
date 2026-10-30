#!/usr/bin/env node
/*
 * Builds the staff help (docs/user-guide/) from its Markdown topics.
 *
 * Each area folder (such as docs/user-guide/cases/) holds an _area.json
 * and one Markdown file per topic. For each area this writes, both ignored
 * by Git:
 *
 *   Theme/UnionSuite-Guides/<Output>.html
 *                        the readable help page, with an Ask a question box;
 *                        the Guides folder holds the pages hosted in iMIS
 *   docs/user-guide/dist/<area>-help.json
 *                        the same topics for the chatbot (see page/match.js)
 *
 * Usage (from the repo root):
 *   node tools/build-user-guide.cjs           build
 *   node tools/build-user-guide.cjs --check   fail if a topic is invalid or
 *                                             an output is missing or stale
 *
 * Topic format and writing rules: docs/user-guide/README.md.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const GUIDE = path.join(__dirname, '..', 'docs', 'user-guide');
const DIST = path.join(GUIDE, 'dist');
const GUIDES = path.join(__dirname, '..', 'Theme', 'UnionSuite-Guides');
const PAGE = path.join(GUIDE, 'page');
// The matcher is a theme script: the side pane's Case help chat uses it too.
const MATCHER = path.join(__dirname, '..', 'Theme', 'UnionSuite', 'Scripts', 'UnionSuiteHelpMatch.js');

const TOPIC_KEYS = ['id', 'title', 'section', 'answer', 'asks', 'keywords', 'related', 'verify'];
const LIST_KEYS = new Set(['asks', 'keywords', 'related', 'verify']);
const ANSWER_MAX = 260;

// ── Front matter ─────────────────────────────────────────────
// A small YAML subset: "key: value", "key: [a, b]", and "key:" followed
// by "  - item" lines.

function parseTopic(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(source);
  if (!match) throw new Error(path.basename(file) + ': no front matter (--- lines) at the top.');
  const meta = {};
  let listKey = null;
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const item = /^\s+-\s+(.*)$/.exec(line);
    if (item) {
      if (!listKey) throw new Error(path.basename(file) + ': list item with no key: ' + line);
      meta[listKey].push(item[1].trim());
      continue;
    }
    const pair = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!pair) throw new Error(path.basename(file) + ': cannot read front matter line: ' + line);
    const [, key, value] = pair;
    listKey = null;
    if (value.startsWith('[') && value.endsWith(']')) {
      meta[key] = value.slice(1, -1).split(',').map(part => part.trim()).filter(Boolean);
    } else if (!value) {
      meta[key] = [];
      listKey = key;
    } else {
      meta[key] = value;
    }
  }
  return {file, meta, body: match[2].trim()};
}

// ── Markdown subset ──────────────────────────────────────────
// Paragraphs, **bold**, *italic*, `keys`, [links](#topic), "1." and "-"
// lists (one level of "-" under a step), "|" tables, "> " tips, and a
// paragraph that is only **bold** as a subheading.

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(text) {
  return escapeHtml(text)
    .replace(/`([^`]+)`/g, '<kbd>$1</kbd>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
}

function plain(text) {
  return String(text)
    .replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1')
    .replace(/\*\*|`/g, '')
    .replace(/\*([^*]+)\*/g, '$1');
}

function links(text) {
  return [...String(text).matchAll(/\]\(([^)\s]+)\)/g)].map(found => found[1]);
}

const LIST_ITEM = /^(\d+\.|-)\s+(.*)$/;
const SUB_ITEM = /^\s{2,}-\s+(.*)$/;

function parseBlocks(markdown) {
  const lines = markdown.split('\n');
  const blocks = [];
  let i = 0;
  const startsBlock = line => !line.trim() || line.startsWith('>') || line.startsWith('|') || LIST_ITEM.test(line);
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('>')) {
      const text = [];
      while (i < lines.length && lines[i].startsWith('>')) text.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push({type: 'tip', text: text.join(' ')});
      continue;
    }
    if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = row => row.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      blocks.push({type: 'table', head: cells(rows[0]), rows: rows.slice(2).map(cells)});
      continue;
    }
    const first = LIST_ITEM.exec(line);
    if (first) {
      const ordered = first[1] !== '-';
      const items = [];
      while (i < lines.length) {
        const item = LIST_ITEM.exec(lines[i]);
        const sub = SUB_ITEM.exec(lines[i]);
        if (item && (item[1] !== '-') === ordered) {
          items.push({text: item[2], children: []});
        } else if (sub && items.length) {
          items[items.length - 1].children.push(sub[1]);
        } else if (/^\s{2,}\S/.test(lines[i]) && items.length) {
          items[items.length - 1].text += ' ' + lines[i].trim();
        } else {
          break;
        }
        i++;
      }
      blocks.push({type: ordered ? 'ol' : 'ul', items});
      continue;
    }
    const text = [];
    while (i < lines.length && (text.length === 0 || !startsBlock(lines[i]))) text.push(lines[i++].trim());
    const joined = text.join(' ');
    const heading = /^\*\*([^*]+)\*\*$/.exec(joined);
    blocks.push(heading ? {type: 'subhead', text: heading[1]} : {type: 'p', text: joined});
  }
  return blocks;
}

function blocksHtml(blocks) {
  return blocks.map(block => {
    switch (block.type) {
      case 'tip':
        return '<p class="callout">' + inline(block.text) + '</p>';
      case 'subhead':
        return '<h4 class="topic__subhead">' + inline(block.text) + '</h4>';
      case 'table':
        return '<div class="table-wrap"><table>\n<thead><tr>' +
          block.head.map(cell => '<th scope="col">' + inline(cell) + '</th>').join('') +
          '</tr></thead>\n<tbody>\n' +
          block.rows.map(row => '<tr>' + row.map(cell => '<td>' + inline(cell) + '</td>').join('') + '</tr>').join('\n') +
          '\n</tbody>\n</table></div>';
      case 'ol':
      case 'ul':
        return '<' + block.type + '>\n' + block.items.map(item => '<li>' + inline(item.text) +
          (item.children.length ? '<ul>' + item.children.map(child => '<li>' + inline(child) + '</li>').join('') + '</ul>' : '') +
          '</li>').join('\n') + '\n</' + block.type + '>';
      default:
        return '<p>' + inline(block.text) + '</p>';
    }
  }).join('\n');
}

function blocksText(blocks) {
  return blocks.map(block => {
    switch (block.type) {
      case 'tip':
      case 'subhead':
      case 'p':
        return plain(block.text);
      case 'table':
        return block.rows.map(row => row.map(plain).join(': ')).join('\n');
      default:
        return block.items.map((item, index) => (block.type === 'ol' ? (index + 1) + '. ' : '- ') + plain(item.text) +
          item.children.map(child => '\n  - ' + plain(child)).join('')).join('\n');
    }
  }).join('\n\n');
}

// ── Areas ────────────────────────────────────────────────────

function loadArea(folder) {
  const area = JSON.parse(fs.readFileSync(path.join(folder, '_area.json'), 'utf8'));
  const problems = [];
  const files = fs.readdirSync(folder).filter(name => name.endsWith('.md')).sort();
  const topics = [];
  for (const name of files) {
    let topic;
    try {
      topic = parseTopic(path.join(folder, name));
    } catch (error) {
      problems.push(error.message);
      continue;
    }
    const {meta} = topic;
    const where = area.id + '/' + name;
    for (const key of Object.keys(meta)) {
      if (!TOPIC_KEYS.includes(key)) problems.push(where + ': unknown key "' + key + '".');
    }
    for (const key of ['id', 'title', 'section', 'answer']) {
      if (typeof meta[key] !== 'string' || !meta[key]) problems.push(where + ': needs "' + key + '".');
    }
    for (const key of LIST_KEYS) {
      if (meta[key] !== undefined && !Array.isArray(meta[key])) problems.push(where + ': "' + key + '" must be a list.');
      meta[key] = Array.isArray(meta[key]) ? meta[key] : [];
    }
    if (meta.asks.length < 2) problems.push(where + ': give at least two "asks" (questions people type).');
    if (!meta.keywords.length) problems.push(where + ': give at least one keyword.');
    if (meta.id && name.replace(/^\d+-/, '').replace(/\.md$/, '') !== meta.id) {
      problems.push(where + ': the file name (after its number) must be the id, "' + meta.id + '".');
    }
    if (meta.section && !area.sections.includes(meta.section)) {
      problems.push(where + ': section "' + meta.section + '" is not in _area.json.');
    }
    if (meta.answer && plain(meta.answer).length > ANSWER_MAX) {
      problems.push(where + ': the answer is ' + plain(meta.answer).length + ' characters; keep it under ' + ANSWER_MAX + '.');
    }
    topics.push(topic);
  }
  const ids = new Set();
  for (const {meta} of topics) {
    if (ids.has(meta.id)) problems.push(area.id + ': two topics have the id "' + meta.id + '".');
    ids.add(meta.id);
  }
  for (const {meta, body} of topics) {
    for (const id of meta.related) {
      if (!ids.has(id) || id === meta.id) problems.push(area.id + '/' + meta.id + ': related "' + id + '" is not another topic.');
    }
    for (const href of links(body + ' ' + meta.answer)) {
      if (!href.startsWith('#') || !ids.has(href.slice(1))) problems.push(area.id + '/' + meta.id + ': link "' + href + '" is not a topic (#id).');
    }
  }
  return {area, topics, problems};
}

function synonyms() {
  const all = JSON.parse(fs.readFileSync(path.join(GUIDE, 'synonyms.json'), 'utf8'));
  return Object.fromEntries(Object.entries(all).filter(([key]) => !key.startsWith('_')));
}

function helpJson({area, topics}) {
  const page = area.output + '.html';
  return {
    area: area.id,
    title: area.title,
    intro: area.intro,
    page,
    examples: area.examples || [],
    sections: area.sections,
    synonyms: synonyms(),
    topics: topics.map(({meta, body}) => {
      const blocks = parseBlocks(body);
      return {
        id: meta.id,
        title: meta.title,
        section: meta.section,
        url: page + '#' + meta.id,
        answer: meta.answer,
        answer_text: plain(meta.answer),
        answer_html: inline(meta.answer),
        asks: meta.asks,
        keywords: meta.keywords,
        related: meta.related,
        body_markdown: body,
        body_html: blocksHtml(blocks),
        body_text: blocksText(blocks)
      };
    })
  };
}

function pageHtml(help) {
  const css = fs.readFileSync(path.join(PAGE, 'help.css'), 'utf8');
  const matcher = fs.readFileSync(MATCHER, 'utf8');
  const script = fs.readFileSync(path.join(PAGE, 'help.js'), 'utf8');
  const byId = new Map(help.topics.map(topic => [topic.id, topic]));
  const sections = help.sections
    .map(title => ({title, slug: 'section-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-'), topics: help.topics.filter(topic => topic.section === title)}))
    .filter(section => section.topics.length);

  const toc = sections.map(section =>
    '<li class="toc__section"><a class="toc__section-link" href="#' + section.slug + '">' + escapeHtml(section.title) + '</a>\n<ul>' +
    section.topics.map(topic => '<li><a href="#' + topic.id + '">' + escapeHtml(topic.title) + '</a></li>').join('') +
    '</ul></li>').join('\n');

  const articles = sections.map(section =>
    '<section class="help-section" id="' + section.slug + '" aria-labelledby="' + section.slug + '-title">\n' +
    '<h2 class="help-section__title" id="' + section.slug + '-title">' + escapeHtml(section.title) + '</h2>\n' +
    section.topics.map(topic => {
      const related = topic.related.map(id => '<a href="#' + id + '">' + escapeHtml(byId.get(id).title) + '</a>');
      return '<article class="topic" id="' + topic.id + '" aria-labelledby="' + topic.id + '-title">\n' +
        '<h3 class="topic__title" id="' + topic.id + '-title" tabindex="-1">' + escapeHtml(topic.title) + '</h3>\n' +
        '<p class="topic__answer"><span class="topic__answer-label">In short</span>' + topic.answer_html + '</p>\n' +
        '<div class="topic__body">\n' + topic.body_html + '\n</div>\n' +
        (related.length ? '<p class="topic__related"><span>Related:</span> ' + related.join(' · ') + '</p>\n' : '') +
        '</article>';
    }).join('\n') +
    '\n</section>').join('\n');

  const examples = help.examples.map(example =>
    '<button type="button" class="ask__example">' + escapeHtml(example) + '</button>').join(' ');

  // Read by help.js, and by the side pane's chat, which fetches the hosted
  // page and takes each topic's steps from its article.
  const data = JSON.stringify({
    title: help.title,
    examples: help.examples,
    synonyms: help.synonyms,
    topics: help.topics.map(({id, title, url, answer_text, answer_html, asks, keywords}) => ({id, title, url, answer_text, answer_html, asks, keywords}))
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(help.title)} · UnionSuite help</title>
<style>
${css}
</style>
</head>
<body>
<a class="skip-link" href="#topics">Skip to the topics</a>
<header class="help-header" id="top">
<p class="help-header__eyebrow">UnionSuite help</p>
<h1>${escapeHtml(help.title)}</h1>
<p class="help-header__intro">${escapeHtml(help.intro)}</p>
</header>
<section class="ask" aria-labelledby="ask-label">
<label class="ask__label" id="ask-label" for="ask-input">Ask a question</label>
<div class="ask__field">
<svg class="ask__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.8-4.8"/></svg>
<input class="ask__input" id="ask-input" type="search" autocomplete="off" spellcheck="true" placeholder="For example: how do I close a case?">
</div>
<p class="ask__try"><span>Try</span> ${examples}</p>
<div class="ask__result" id="ask-result" aria-live="polite" hidden></div>
</section>
<div class="help-layout">
<nav class="toc" aria-label="Topics">
<details class="toc__details" open>
<summary class="toc__summary">All topics</summary>
<ul class="toc__list">
${toc}
</ul>
</details>
</nav>
<main class="help-main" id="topics">
${articles}
</main>
</div>
<script type="application/json" id="help-data">${data}</script>
<script>
${matcher}
</script>
<script>
${script}
</script>
</body>
</html>
`;
}

// ── Build ────────────────────────────────────────────────────

function build({check = false} = {}) {
  const folders = fs.readdirSync(GUIDE, {withFileTypes: true})
    .filter(entry => entry.isDirectory() && fs.existsSync(path.join(GUIDE, entry.name, '_area.json')))
    .map(entry => path.join(GUIDE, entry.name));
  const outputs = [];
  const problems = [];
  const verify = [];
  for (const folder of folders) {
    const loaded = loadArea(folder);
    problems.push(...loaded.problems);
    if (loaded.problems.length) continue;
    for (const {meta} of loaded.topics) {
      for (const note of meta.verify) verify.push(loaded.area.id + '/' + meta.id + ': ' + note);
    }
    const help = helpJson(loaded);
    outputs.push({file: path.join(DIST, loaded.area.id + '-help.json'), text: JSON.stringify(help, null, 2) + '\n'});
    outputs.push({file: path.join(GUIDES, loaded.area.output + '.html'), text: pageHtml(help)});
  }
  if (problems.length) {
    console.error('Help topics need fixing:\n  ' + problems.join('\n  '));
    process.exitCode = 1;
    return;
  }
  if (check) {
    const stale = outputs.filter(({file, text}) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text);
    if (stale.length) {
      console.error('Stale or missing (run node tools/build-user-guide.cjs):\n  ' + stale.map(({file}) => path.relative(process.cwd(), file)).join('\n  '));
      process.exitCode = 1;
      return;
    }
    console.log('Help is current: ' + outputs.length + ' files.');
  } else {
    fs.mkdirSync(DIST, {recursive: true});
    for (const {file, text} of outputs) fs.writeFileSync(file, text);
    console.log('Wrote:\n  ' + outputs.map(({file}) => path.relative(process.cwd(), file)).join('\n  '));
  }
  if (verify.length) console.log('\nTo confirm before staff use it (' + verify.length + '):\n  ' + verify.join('\n  '));
}

module.exports = {build, loadArea, helpJson, pageHtml, parseBlocks, GUIDE, DIST, GUIDES, MATCHER};

if (require.main === module) build({check: process.argv.includes('--check')});
