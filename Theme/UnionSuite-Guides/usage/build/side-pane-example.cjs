// Guide-only fixtures for the taskbar side pane (Scripts/UnionSuiteSidePane.js).
// The live example runs the real script on a stand-in case page, with the
// taskbar reduced to its search field; a guide-only second tab shows the tab
// strip. Case help answers from a small stand-in case guide (GUIDE_FIXTURE),
// served by a fetch stub in place of the hosted Cases-Help.html. The chat
// example draws the US-SIDE-PANE chat styles in place. No requests.
exports.sources = [
  'Theme/UnionSuite-Guides/usage/build/side-pane-example.cjs',
  'Theme/UnionSuite/Scripts/UnionSuiteSidePane.js',
  'Theme/UnionSuite/Scripts/UnionSuiteHelpMatch.js'
];

// Three topics shaped like the built case guide: its #help-data block and
// one article per topic, whose .topic__body holds the steps.
const fixtureTopics = [
  {
    id: 'add-a-note', title: 'Add a note',
    answer_html: 'Press <strong>Add note</strong>, write the note and press <strong>Save note</strong>.',
    asks: ['how do I add a note', 'record a phone call'], keywords: ['note', 'comment', 'call'],
    steps: '<ol><li>Press <strong>Add note</strong>.</li><li>Write the note.</li><li>Press <strong>Save note</strong>, or press <kbd>Ctrl+Enter</kbd>.</li></ol><p class="callout"><strong>Tip:</strong> Tick <strong>Follow up</strong> to make the note a task too. See <a href="#change-the-status">Change the status</a> once it is done.</p>'
  },
  {
    id: 'change-the-status', title: 'Change the status',
    answer_html: 'Select the status in the banner and choose the new one from the menu. It saves straight away.',
    asks: ['how do I change the status', 'set the case to on hold'], keywords: ['status', 'on hold', 'in progress'],
    steps: '<ol><li>Select the status in the banner.</li><li>Choose the new status.</li></ol>'
  },
  {
    id: 'resolve-and-close', title: 'Resolve and close a case',
    answer_html: 'Choose <strong>Resolve case</strong> from the status menu. Fill in the outcome and save; the case closes.',
    asks: ['how do I close a case', 'finish a case'], keywords: ['close', 'resolve', 'outcome', 'finish'],
    steps: '<ol><li>Choose <strong>Resolve case</strong>.</li><li>Fill in the outcome.</li><li>Save.</li></ol>'
  }
];

const GUIDE_FIXTURE = '<!doctype html><title>Managing a case</title>' +
  '<script type="application/json" id="help-data">' + JSON.stringify({
    title: 'Managing a case (guide sample)',
    examples: ['how do I close a case', 'add a note'],
    synonyms: {finish: 'resolve', close: 'resolve'},
    topics: fixtureTopics.map(({steps, ...topic}) => ({
      ...topic, url: 'Cases-Help.html#' + topic.id, answer_text: topic.answer_html.replace(/<[^>]+>/g, '')
    }))
  }).replace(/</g, '\\u003c') + '</script>' +
  fixtureTopics.map(topic => '<article class="topic" id="' + topic.id + '"><div class="topic__body">' + topic.steps + '</div></article>').join('');

const page = ({nativePreviewCss, theme, iconCss, branding}, title, css, body, root = '') => `<!doctype html><html lang="en"${root}><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}
html{height:auto}
body{height:auto;margin:0;background:var(--bg-page);font:14px/1.5 var(--font-ui);color:var(--text-base)}
${css}
</style><body>${body}</body></html>`;

exports.liveHtml = ({read, ...css}) => page(css, 'Taskbar side pane', `
#hd{display:flex;align-items:center;gap:16px;padding:12px 20px;border-bottom:1px solid var(--border);background:var(--bg-surface)}
.demo-brand{margin-right:auto;color:var(--text-strong);font:600 18px var(--font-ui)}
#injected-taskbar{display:flex;align-items:center;gap:8px}
#injected-taskbar .tb-search-wrap{width:240px}
.demo-page{min-height:560px;padding:24px 20px}
.demo-page h1{margin:0 0 8px;color:var(--text-strong);font:600 22px var(--font-ui);text-transform:none}
.demo-page p{max-width:440px;margin:0;color:var(--text-muted)}`, `
<header id="hd"><span class="demo-brand">Manage case</span>
  <div class="us-taskbar" id="injected-taskbar">
    <div class="tb-search-wrap us-taskbar__search"><div class="us-taskbar__search-shell"><input class="tb-search-input us-taskbar__search-input" aria-label="Quick Search" placeholder="Search by ID, name, email or mobile…"></div></div>
  </div>
</header>
<main class="demo-page us-case-page"><h1>C217 · Unpaid overtime</h1><p>A stand-in case page. Select the side pane toggle at the right of the taskbar to close and reopen the pane.</p></main>
<script>
// Guide only: the hosted case guide, answered from a stand-in page.
const guideFixture = ${JSON.stringify(GUIDE_FIXTURE).replace(/<\//g, '<\\/')};
const realFetch = window.fetch.bind(window);
window.fetch = (url, options) => String(url).endsWith('/App_Themes/UnionSuite-Guide/Cases-Help.html')
  ? Promise.resolve(new Response(guideFixture, {headers: {'Content-Type': 'text/html'}}))
  : realFetch(url, options);
</script>
<script>${read('Theme/UnionSuite/Scripts/UnionSuiteHelpMatch.js').replace(/<\/script/gi, '<\\/script')}</script>
<script>${read('Theme/UnionSuite/Scripts/UnionSuiteSidePane.js').replace(/<\/script/gi, '<\\/script')}</script>
<script>
// Guide only: a second tab, to show the tab strip. Only Case help ships.
UnionSuiteSidePane.register({
  id: 'guide-example', label: 'Example tab', icon: 'layout-sidebar-right', order: 20,
  description: 'Guide only: how a second tab appears.', pages: ['case'],
  render(panel) {
    const note = document.createElement('p');
    note.style.cssText = 'margin:20px;font-size:13px';
    note.textContent = 'Planned tabs register the same way: an admin support ticket, a standard support ticket, an assistant that sees the page, and a preview.';
    panel.append(note);
  }
});
setTimeout(() => UnionSuiteSidePane.open('case-help', {focus: false}), 0);
</script>`,
// The case access check has passed; until it does, US-CASE-ACCESS hides the page.
' data-us-case-access="granted"');

// The chat styles, drawn in place: in a page the pane is fixed to the right.
exports.chatHtml = css => page(css, 'Side pane chat styles', `
body{padding:20px}
.us-side-pane{position:relative;top:auto;right:auto;bottom:auto;height:640px;margin-left:auto;border:1px solid var(--border)}`, `
<aside class="us-side-pane" aria-labelledby="chat-demo-title">
  <div class="us-side-pane__head"><div class="us-side-pane__heading"><h2 class="us-side-pane__title" id="chat-demo-title">Case help</h2><p class="us-side-pane__subtitle">How to use this case page.</p></div>
    <button type="button" class="us-side-pane__close" aria-label="Close side pane" title="Close"><i class="ti ti-x" aria-hidden="true"></i></button></div>
  <div class="us-side-pane__panels"><section class="us-side-pane__panel"><div class="us-side-chat">
    <div class="us-side-chat__messages" role="log">
      <div class="us-side-chat__message us-side-chat__message--assistant"><span class="us-side-chat__avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></span>
        <div class="us-side-chat__bubble"><p>Ask how to do something on this page.</p>
          <div class="us-side-chat__suggestions"><button type="button" class="us-side-chat__chip">How do I log a case note?</button><button type="button" class="us-side-chat__chip">How do I change the status?</button></div></div></div>
      <div class="us-side-chat__message us-side-chat__message--user"><div class="us-side-chat__bubble">How do I log a case note?</div></div>
      <div class="us-side-chat__message us-side-chat__message--assistant"><span class="us-side-chat__avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></span>
        <div class="us-side-chat__bubble"><p>Press <strong>Add note</strong>, write the note and press <strong>Save note</strong>.</p>
          <button type="button" class="us-side-chat__steps-toggle" aria-expanded="true" aria-controls="chat-demo-steps"><i class="ti ti-chevron-right" aria-hidden="true"></i><span>Hide the steps</span></button>
          <div class="us-side-chat__steps" id="chat-demo-steps"><ol><li>Press <strong>Add note</strong>.</li><li>Write the note.</li><li>Press <strong>Save note</strong>, or press <kbd>Ctrl+Enter</kbd>.</li></ol><h4>Good to know</h4><p class="callout"><strong>Tip:</strong> Tick <strong>Follow up</strong> to make the note a task too.</p></div>
          <a class="us-side-chat__source" href="#"><i class="ti ti-book" aria-hidden="true"></i><span>Add a note<small>Managing a case</small></span><i class="ti ti-external-link" aria-hidden="true"></i></a>
          <p class="us-side-chat__others">Not quite? Try:</p><div class="us-side-chat__suggestions"><button type="button" class="us-side-chat__chip">Add and complete tasks</button></div></div></div>
      <div class="us-side-chat__message us-side-chat__message--assistant"><span class="us-side-chat__avatar"><i class="ti ti-sparkles" aria-hidden="true"></i></span>
        <div class="us-side-chat__bubble"><span class="us-side-chat__typing" aria-label="Answering"><span></span><span></span><span></span></span></div></div>
    </div>
    <div class="us-side-chat__composer"><label class="us-side-chat__label" for="chat-demo-input">Ask a question</label><textarea class="us-side-chat__input" id="chat-demo-input" rows="1" placeholder="Ask about this page…"></textarea>
      <button type="button" class="us-side-chat__send" aria-label="Send question"><i class="ti ti-send" aria-hidden="true"></i></button></div>
    <p class="us-side-chat__note">Answers come from the <a href="#">case guide</a>.</p>
  </div></section></div>
</aside>`);
