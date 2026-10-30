/* =============================================================================
 * Taskbar side pane — window.UnionSuiteSidePane
 * -----------------------------------------------------------------------------
 * A toggle at the far right of the taskbar opens a pane from the right, below
 * the header. The pane holds tabs, and each tab says which pages it belongs
 * on, so the pane shows what helps on the page being viewed. The toggle
 * appears only on a page with at least one tab.
 *
 * First version (owner, 29 October 2026): Case help on the manage case page.
 * Since 30 October 2026 its chat answers from the case guide hosted at
 * /App_Themes/UnionSuite-Guide/Cases-Help.html (CASE_GUIDE_URL below).
 * Planned tabs, registered the same way: an admin support ticket (to the
 * UnionSuite team), a standard support ticket (to the client's system
 * administrator), an assistant that sees the page's context, and a preview.
 *
 *   UnionSuiteSidePane.register({
 *     id: 'case-help',              // unique
 *     label: 'Case help',           // tab name and pane title
 *     icon: 'help-circle',          // Tabler icon name
 *     description: 'How to use …',  // optional, under the title
 *     pages: ['case'],              // names in PAGES below, or when: () => bool
 *     order: 10,                    // optional, lower first
 *     render(panel, context) {}     // builds the tab once, on first show
 *   });
 *
 * The pane overlays the page and never moves it, like the IQA designer's
 * Where-used drawer. It is non-modal: the page stays usable while it is open.
 *
 * Design and mockup: prototypes/wip/taskbar-side-pane/.
 * ========================================================================== */
(function () {
  'use strict';

  if (window.UnionSuiteSidePane) return;

  // Page names a tab can list. The case test matches the case access check
  // in ActionDefinitions.js: the page's path, or its us-case-page class.
  const PAGES = {
    case: () => /\/Cases_ManageCase(\.aspx)?$/i.test(location.pathname) ||
      Boolean(document.querySelector('.us-case-page'))
  };

  const tabs = new Map();
  const rendered = new Set();
  let toggle = null;
  let pane = null;
  let title = null;
  let subtitle = null;
  let tabList = null;
  let panels = null;
  let activeId = null;
  let observer = null;
  let refreshTimer = null;
  let placeFrame = null;

  const icon = name => {
    const node = document.createElement('i');
    node.className = 'ti ti-' + name;
    node.setAttribute('aria-hidden', 'true');
    return node;
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function matches(tab) {
    try {
      if (typeof tab.when === 'function') return Boolean(tab.when());
      return (tab.pages || []).some(page => PAGES[page]?.());
    } catch (error) {
      console.warn('[UnionSuiteSidePane] ' + tab.id + ' page test failed', error);
      return false;
    }
  }

  function availableTabs() {
    return [...tabs.values()]
      .filter(matches)
      .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  function isOpen() {
    return Boolean(pane) && !pane.hasAttribute('data-closed');
  }

  /* ---- the taskbar toggle --------------------------------------------------- */

  function createToggle() {
    toggle = element('button', 'us-side-pane-toggle');
    toggle.type = 'button';
    toggle.id = 'us-side-pane-toggle';
    // Icon only, like the bookmarks star beside it. The name is in
    // aria-label; the tooltip says what a click will do.
    toggle.setAttribute('aria-label', 'Side pane');
    toggle.setAttribute('aria-controls', 'us-side-pane');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.title = 'Show side pane';
    toggle.append(icon('layout-sidebar-right'));
    toggle.addEventListener('click', () => (isOpen() ? close() : open(null)));
  }

  // The taskbar mounts after this script on some pages, and iMIS partial
  // postbacks or the taskbar's own remount can replace it, so the toggle is
  // put back whenever the live taskbar lacks it. CSS orders it last.
  function mountToggle() {
    const bar = document.querySelector('#injected-taskbar');
    if (!bar) return;
    if (!toggle) createToggle();
    if (toggle.parentElement !== bar) bar.append(toggle);
  }

  function refresh() {
    const available = availableTabs();
    if (!available.length) {
      close();
      toggle?.remove();
      return;
    }
    mountToggle();
    if (pane) renderTabs(available);
  }

  function scheduleRefresh() {
    if (refreshTimer !== null) return;
    refreshTimer = setTimeout(() => {
      refreshTimer = null;
      refresh();
    }, 0);
  }

  /* ---- the pane ------------------------------------------------------------- */

  function createPane() {
    pane = element('aside', 'us-side-pane');
    pane.id = 'us-side-pane';
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'false');
    pane.setAttribute('aria-labelledby', 'us-side-pane-title');
    pane.setAttribute('data-closed', '');

    const head = element('div', 'us-side-pane__head');
    const heading = element('div', 'us-side-pane__heading');
    title = element('h2', 'us-side-pane__title');
    title.id = 'us-side-pane-title';
    title.tabIndex = -1;
    subtitle = element('p', 'us-side-pane__subtitle');
    heading.append(title, subtitle);
    const closeButton = element('button', 'us-side-pane__close');
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', 'Close side pane');
    closeButton.title = 'Close';
    closeButton.append(icon('x'));
    closeButton.addEventListener('click', close);
    head.append(heading, closeButton);

    tabList = element('div', 'us-side-pane__tabs');
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', 'Side pane');
    tabList.addEventListener('keydown', onTabKeydown);

    panels = element('div', 'us-side-pane__panels');
    pane.append(head, tabList, panels);

    pane.addEventListener('keydown', event => {
      if (event.key !== 'Escape') return;
      // Escape inside the pane closes it, and nothing else on the page.
      event.stopPropagation();
      close();
    });

    // Outside iMIS's page form, so the pane's own fields never post it.
    document.body.append(pane);
    new ResizeObserver(placePane).observe(document.querySelector('#hd') || document.body);
  }

  // One tab per available feature. The strip is hidden while there is only
  // one; the pane title always names the open tab.
  function renderTabs(available) {
    const ids = available.map(tab => tab.id);
    if (!ids.includes(activeId)) activeId = ids[0];
    tabList.replaceChildren(...available.map(tab => {
      const button = element('button', 'us-side-pane__tab');
      button.type = 'button';
      button.id = 'us-side-pane-tab-' + tab.id;
      button.setAttribute('role', 'tab');
      button.setAttribute('aria-controls', 'us-side-pane-panel-' + tab.id);
      button.append(icon(tab.icon || 'point'), document.createTextNode(tab.label));
      button.addEventListener('click', () => select(tab.id));
      return button;
    }));
    tabList.hidden = available.length < 2;
    // Panels for tabs no longer on this page are dropped.
    panels.querySelectorAll('.us-side-pane__panel').forEach(panel => {
      if (!ids.includes(panel.dataset.tab)) {
        rendered.delete(panel.dataset.tab);
        panel.remove();
      }
    });
    select(activeId);
  }

  function select(id) {
    const tab = tabs.get(id);
    if (!tab) return;
    activeId = id;
    title.textContent = tab.label;
    subtitle.textContent = tab.description || '';
    subtitle.hidden = !tab.description;
    tabList.querySelectorAll('[role="tab"]').forEach(button => {
      const selected = button.id === 'us-side-pane-tab-' + id;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    let panel = panels.querySelector('[data-tab="' + id + '"]');
    if (!panel) {
      panel = element('section', 'us-side-pane__panel');
      panel.id = 'us-side-pane-panel-' + id;
      panel.dataset.tab = id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tabList.hidden ? 'us-side-pane-title' : 'us-side-pane-tab-' + id);
      panels.append(panel);
    }
    panels.querySelectorAll('.us-side-pane__panel').forEach(node => {
      node.hidden = node !== panel;
    });
    if (!rendered.has(id)) {
      rendered.add(id);
      try {
        tab.render(panel, {pane, close});
      } catch (error) {
        console.error('[UnionSuiteSidePane] ' + id + ' failed to render', error);
        panel.replaceChildren(element('p', 'us-side-pane__error', 'This section could not be shown.'));
      }
    }
  }

  function onTabKeydown(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const buttons = [...tabList.querySelectorAll('[role="tab"]')];
    const current = buttons.findIndex(button => button.getAttribute('aria-selected') === 'true');
    const next = event.key === 'Home' ? 0
      : event.key === 'End' ? buttons.length - 1
      : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    event.preventDefault();
    buttons[next].click();
    buttons[next].focus();
  }

  // The pane starts at the header's bottom edge, so the taskbar and its
  // toggle stay in view, and rises to the top as the header scrolls away.
  function placePane() {
    if (!pane) return;
    const header = document.querySelector('#hd');
    const bottom = header ? header.getBoundingClientRect().bottom : 0;
    pane.style.setProperty('--us-side-pane-top', Math.max(0, Math.round(bottom)) + 'px');
  }

  function onScroll() {
    if (!isOpen() || placeFrame !== null) return;
    placeFrame = requestAnimationFrame(() => {
      placeFrame = null;
      placePane();
    });
  }

  /* ---- open and close ------------------------------------------------------- */

  // focus: false leaves focus where it is, for previews that open the pane
  // on load; a person opening it always gets focus moved to its title.
  function open(id, {focus = true} = {}) {
    const available = availableTabs();
    if (!available.length) return;
    if (!pane) createPane();
    if (id && available.some(tab => tab.id === id)) activeId = id;
    renderTabs(available);
    placePane();
    if (isOpen()) return;
    pane.removeAttribute('data-closed');
    toggle?.setAttribute('aria-expanded', 'true');
    if (toggle) toggle.title = 'Hide side pane';
    if (focus) title.focus({preventScroll: true});
  }

  function close() {
    if (!isOpen()) return;
    const hadFocus = pane.contains(document.activeElement);
    pane.setAttribute('data-closed', '');
    toggle?.setAttribute('aria-expanded', 'false');
    if (toggle) toggle.title = 'Show side pane';
    if (hadFocus) toggle?.focus({preventScroll: true});
  }

  /* ---- registration --------------------------------------------------------- */

  function register(definition) {
    if (!definition?.id || !definition.label || typeof definition.render !== 'function') {
      throw new Error('UnionSuiteSidePane.register needs an id, a label and a render function.');
    }
    if (tabs.has(definition.id)) {
      console.warn('[UnionSuiteSidePane] ' + definition.id + ' is already registered.');
      return;
    }
    tabs.set(definition.id, Object.freeze({...definition}));
    scheduleRefresh();
  }

  /* ---- Case help: answers from the case guide ------------------------------ */

  // The staff help page for cases (docs/user-guide/, built by
  // tools/build-user-guide.cjs into Theme/UnionSuite-Guides/), hosted beside
  // the theme. The chat reads the page's topics (#help-data) and each topic's
  // steps (its article), answers with the page's own matcher
  // (UnionSuiteHelpMatch.js, loaded first by index.js), and links every
  // answer back to its topic on the page.
  const CASE_GUIDE_URL = '/App_Themes/UnionSuite-Guide/Cases-Help.html';

  const guides = new Map();
  let stepsCount = 0;

  // baseURI rather than location: previews run in srcdoc frames. A base that
  // is not a web address (about:blank) leaves the address as given.
  function absolute(url, base = document.baseURI) {
    try {
      return new URL(url, base).href;
    } catch (error) {
      return url;
    }
  }

  // One request per page view; a failed one is tried again the next time the
  // tab is built. App_Themes is cached for a week, so the request asks the
  // server whether the page has changed (a 304 when it has not).
  function loadGuide(url) {
    if (!guides.has(url)) {
      const address = absolute(url);
      const loading = fetch(address, {cache: 'no-cache', credentials: 'same-origin'})
        .then(response => {
          if (!response.ok) throw new Error(response.status + ' ' + response.statusText);
          return response.text();
        })
        .then(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const help = JSON.parse(doc.getElementById('help-data')?.textContent || 'null');
          if (!help?.topics?.length) throw new Error('no topics in the page');
          if (typeof window.UnionSuiteHelpMatch?.create !== 'function') {
            throw new Error('UnionSuiteHelpMatch.js is not loaded');
          }
          const topics = new Map(help.topics.map(topic => [topic.id, Object.assign(topic, {
            href: absolute(topic.url, address),
            steps: doc.getElementById(topic.id)?.querySelector('.topic__body') || null
          })]));
          return {...help, address, topics, matcher: window.UnionSuiteHelpMatch.create(help)};
        });
      loading.catch(() => guides.delete(url));
      guides.set(url, loading);
    }
    return guides.get(url);
  }

  function assistantMessage(messages) {
    const message = element('div', 'us-side-chat__message us-side-chat__message--assistant');
    const avatar = element('span', 'us-side-chat__avatar');
    avatar.append(icon('sparkles'));
    const bubble = element('div', 'us-side-chat__bubble');
    message.append(avatar, bubble);
    messages.append(message);
    return bubble;
  }

  function userMessage(messages, text) {
    const message = element('div', 'us-side-chat__message us-side-chat__message--user');
    message.append(element('div', 'us-side-chat__bubble', text));
    messages.append(message);
    return message;
  }

  // The guide page an answer came from, in a new tab so the case stays put.
  function sourceLink(href, title, from) {
    const link = element('a', 'us-side-chat__source');
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.title = 'Opens in a new tab';
    const text = element('span', '', title);
    text.append(element('small', '', from));
    link.append(icon('book'), text, icon('external-link'));
    return link;
  }

  function chips(items, onPick) {
    const list = element('div', 'us-side-chat__suggestions');
    for (const item of items) {
      const chip = element('button', 'us-side-chat__chip', item.title);
      chip.type = 'button';
      chip.addEventListener('click', () => onPick(item));
      list.append(chip);
    }
    return list;
  }

  // Shows or hides with the shared fold (US-RECORD-CARDS) when the theme's
  // core script is on the page, and instantly without it.
  function fold(node, open) {
    const shared = window.UnionSuiteRecordCards?.fold;
    if (shared) return shared(node, open);
    node.hidden = !open;
    return Promise.resolve();
  }

  // Brings the reader's question to the top of the log, so a long answer is
  // read from its start.
  function reveal(messages, node) {
    const top = messages.scrollTop + node.getBoundingClientRect().top - messages.getBoundingClientRect().top - 12;
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    messages.scrollTo({top: Math.max(0, top), behavior: instant ? 'auto' : 'smooth'});
  }

  function renderCaseHelp(panel) {
    const chat = element('div', 'us-side-chat');
    const messages = element('div', 'us-side-chat__messages');
    messages.setAttribute('role', 'log');

    const composer = element('div', 'us-side-chat__composer');
    const label = element('label', 'us-side-chat__label', 'Ask a question');
    label.htmlFor = 'us-side-chat-question-' + panel.dataset.tab;
    const input = element('textarea', 'us-side-chat__input');
    input.id = label.htmlFor;
    input.rows = 1;
    const send = element('button', 'us-side-chat__send');
    send.type = 'button';
    send.setAttribute('aria-label', 'Send question');
    send.append(icon('send'));
    composer.append(label, input, send);

    const guideHref = absolute(CASE_GUIDE_URL);
    const note = element('p', 'us-side-chat__note', 'Answers come from the ');
    const guideLink = element('a', '', 'case guide');
    guideLink.href = guideHref;
    guideLink.target = '_blank';
    guideLink.rel = 'noopener';
    note.append(guideLink, '.');

    chat.append(messages, composer, note);
    panel.append(chat);

    let guide = null;

    function setReady(ready) {
      input.disabled = !ready;
      composer.setAttribute('aria-disabled', String(!ready));
      send.disabled = !ready || !input.value.trim();
    }

    function fitInput() {
      input.style.height = 'auto';
      input.style.height = input.scrollHeight + 'px';
    }

    // An answer: the guide's short answer, the topic's steps folded away
    // under Show the steps, and the topic on the guide page.
    function answer(bubble, topic) {
      const short = element('p');
      short.innerHTML = topic.answer_html;
      bubble.append(short);
      if (topic.steps) {
        const steps = element('div', 'us-side-chat__steps');
        steps.id = 'us-side-chat-steps-' + (++stepsCount);
        steps.append(...[...topic.steps.childNodes].map(node => document.importNode(node, true)));
        steps.hidden = true;
        const toggle = element('button', 'us-side-chat__steps-toggle');
        toggle.type = 'button';
        toggle.setAttribute('aria-controls', steps.id);
        toggle.setAttribute('aria-expanded', 'false');
        const text = element('span', '', 'Show the steps');
        toggle.append(icon('chevron-right'), text);
        toggle.addEventListener('click', () => {
          const open = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', String(open));
          text.textContent = open ? 'Hide the steps' : 'Show the steps';
          fold(steps, open);
        });
        bubble.append(toggle, steps);
      }
      bubble.append(sourceLink(topic.href, topic.title, guide.title || 'Case guide'));
    }

    function showTopic(topic) {
      const question = userMessage(messages, topic.title);
      answer(assistantMessage(messages), topic);
      reveal(messages, question);
    }

    function ask(text) {
      const question = userMessage(messages, text);
      const bubble = assistantMessage(messages);
      const reply = guide.matcher.reply(text);
      const pick = topic => showTopic(guide.topics.get(topic.id));
      if (reply.sure) {
        answer(bubble, guide.topics.get(reply.topic.id));
        if (reply.others.length) {
          bubble.append(element('p', 'us-side-chat__others', 'Not quite? Try:'), chips(reply.others, pick));
        }
      } else {
        const maybe = [reply.topic, ...reply.others].filter(Boolean);
        bubble.append(element('p', '', maybe.length
          ? 'I am not sure what you mean. Is it one of these?'
          : 'I could not find that in the case guide. Try other words, or look through the guide.'));
        if (maybe.length) bubble.append(chips(maybe, pick));
        bubble.append(sourceLink(guide.address, 'All case topics', guide.title || 'Case guide'));
      }
      reveal(messages, question);
    }

    function submit() {
      const text = input.value.trim();
      if (!guide || !text) return;
      input.value = '';
      fitInput();
      setReady(true);
      ask(text);
    }

    input.addEventListener('input', () => {
      fitInput();
      send.disabled = input.disabled || !input.value.trim();
    });
    // Enter sends and Shift+Enter starts a new line. The pane holds no form:
    // an iMIS page is one form already.
    input.addEventListener('keydown', event => {
      if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
      event.preventDefault();
      submit();
    });
    send.addEventListener('click', submit);

    // A link to another topic inside the steps answers in the chat.
    messages.addEventListener('click', event => {
      const link = event.target.closest('.us-side-chat__steps a[href^="#"]');
      const topic = link && guide?.topics.get(link.getAttribute('href').slice(1));
      if (!topic) return;
      event.preventDefault();
      showTopic(topic);
    });

    const greeting = assistantMessage(messages);
    const typing = element('span', 'us-side-chat__typing');
    typing.setAttribute('aria-label', 'Loading the case guide');
    typing.append(element('span'), element('span'), element('span'));
    greeting.append(typing);
    input.placeholder = 'Ask how to do something on this page';
    setReady(false);

    loadGuide(CASE_GUIDE_URL).then(loaded => {
      guide = loaded;
      const examples = (guide.examples || []).map(example => ({title: example}));
      greeting.replaceChildren(element('p', '', 'Ask how to do something on this case page, or try one of these.'));
      if (examples.length) greeting.append(chips(examples, example => ask(example.title)));
      setReady(true);
    }, error => {
      console.warn('[UnionSuiteSidePane] the case guide did not load from ' + CASE_GUIDE_URL, error);
      greeting.replaceChildren(
        element('p', '', 'Case help could not load just now. The case guide still opens in a new tab.'),
        sourceLink(guideHref, 'Open the case guide', 'UnionSuite help')
      );
      input.placeholder = 'Case help is unavailable';
    });
  }

  register({
    id: 'case-help',
    label: 'Case help',
    icon: 'help-circle',
    description: 'How to use this case page.',
    pages: ['case'],
    order: 10,
    render: renderCaseHelp
  });

  /* ---- start ---------------------------------------------------------------- */

  function start() {
    refresh();
    // Watch for the taskbar arriving or being replaced, and for a page class
    // that arrives late; both are cheap checks, batched once per task.
    observer = new MutationObserver(() => {
      if (!toggle?.isConnected || !document.querySelector('#injected-taskbar #us-side-pane-toggle')) scheduleRefresh();
    });
    observer.observe(document.documentElement, {childList: true, subtree: true});
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('resize', placePane);
  }

  window.UnionSuiteSidePane = Object.freeze({
    version: '1.1',
    register,
    open,
    close,
    refresh,
    isOpen,
    pages: Object.keys(PAGES)
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
