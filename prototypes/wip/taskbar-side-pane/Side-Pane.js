/* Offline side pane mockup only. Answers are canned; nothing is sent anywhere. */
(function () {
  'use strict';

  const query = selector => document.querySelector(selector);
  const icon = name => '<i class="ti ti-' + name + '" aria-hidden="true"></i>';
  const escape = value => String(value).replace(/[&<>"']/g, value => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[value]));
  const narrow = () => innerWidth <= 950;
  const notifyParent = detail => window.parent.postMessage({workshop: true, ...detail}, '*');

  const pane = query('#sp-pane');
  const messages = query('#sp-messages');
  const question = query('#sp-question');
  const form = query('#sp-ticket-form');
  const submit = query('#sp-submit');

  // Illustrative answers; a real assistant would answer from the usage guide.
  const answers = [
    {
      ask: 'How do I log a case note?',
      match: /note/i,
      type: 'howto',
      html: '<p>Open the case, then:</p><ol><li>Select <strong>Actions</strong> in the case banner and choose <strong>Add note</strong>.</li><li>Write the note and pick its type.</li><li>Select <strong>Save</strong>. It appears at the top of the case activity.</li></ol>',
      source: ['UnionSuite guide', 'Case notes']
    },
    {
      ask: 'Why is a member showing as unfinancial?',
      match: /financial|dues|paid|arrears/i,
      type: 'data',
      html: '<p>A member shows as unfinancial when their paid-through date has passed or a dues payment failed.</p><p>Check the member\'s <strong>Financial</strong> tab for the paid-through date and any failed payments. If a payment went through but the status hasn\'t changed, the support team can check the overnight update.</p>',
      source: ['UnionSuite guide', 'Member status'],
      escalate: true
    },
    {
      ask: 'How do I bookmark a page?',
      match: /bookmark|favourite|star|taskbar/i,
      type: 'howto',
      html: '<p>Open <strong>Go to…</strong> (or press <kbd>Ctrl</kbd> <kbd>Space</kbd>), find the page and select the star beside it.</p><p>Your first five bookmarks sit in the taskbar. Select the star at the right of the taskbar to see them all.</p>',
      source: ['UnionSuite guide', 'Taskbar bookmarks']
    }
  ];
  const fallback = {
    type: 'howto',
    html: '<p>I couldn\'t find that in the UnionSuite guide.</p><p>The support team can look into it for you.</p>',
    escalate: true
  };
  const impactHints = {
    low: 'It joins the normal queue.',
    slow: 'The team aims to look at it today.',
    blocked: 'The support team is alerted straight away. If everyone is affected, phone the support line too.'
  };
  const sampleFiles = [
    ['photo', 'Screenshot 2026-10-29 101522.png', '214 KB'],
    ['file-text', 'renewal-export.csv', '18 KB']
  ];
  const earlierTickets = [
    {number: 'SUP-2031', subject: 'Renewal report is missing a branch', status: 'progress', label: 'In progress', when: 'Updated yesterday'},
    {number: 'SUP-1987', subject: 'Can\'t upload member photos', status: 'resolved', label: 'Resolved', when: '14 Oct'}
  ];

  let launcher;
  let mode = 'overlay';
  let conversation = [];
  let replyTimer;
  let submitTimer;
  let nextTicket = 2048;
  let filesAdded = 0;
  let tickets = [...earlierTickets];

  /* Launcher and pane */

  function placePane() {
    const bottom = query('#hd').getBoundingClientRect().bottom;
    document.body.style.setProperty('--sp-top', Math.max(0, bottom) + 'px');
  }

  function isOpen() {
    return !pane.hasAttribute('data-closed');
  }

  function openPane(tab) {
    if (tab) selectTab(tab);
    placePane();
    pane.removeAttribute('data-closed');
    document.body.setAttribute('data-sp-open', '');
    launcher.setAttribute('aria-expanded', 'true');
    launcher.title = 'Hide side pane';
    // Wait for visibility to apply before moving focus into the pane.
    requestAnimationFrame(() => {
      const onAsk = query('#sp-tab-ask').getAttribute('aria-selected') === 'true';
      (onAsk && !narrow() ? question : query('#sp-title')).focus({preventScroll: true});
    });
  }

  function closePane() {
    const hadFocus = pane.contains(document.activeElement);
    pane.setAttribute('data-closed', '');
    document.body.removeAttribute('data-sp-open');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.title = 'Show side pane';
    if (hadFocus) launcher.focus();
  }

  function selectTab(name) {
    for (const tab of ['ask', 'ticket']) {
      const selected = tab === name;
      const button = query('#sp-tab-' + tab);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      query('#sp-' + tab).hidden = !selected;
    }
  }

  // The bookmarks script adds its star toggle once its settings load; the
  // side pane toggle goes after it, at the far right of the taskbar.
  function addLauncher() {
    const bar = query('#injected-taskbar');
    launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'us-nav-icon-button sp-launch';
    launcher.id = 'sp-launch';
    // A general side pane toggle: the pane will host more features than help.
    launcher.title = 'Show side pane';
    launcher.setAttribute('aria-label', 'Side pane');
    launcher.setAttribute('aria-controls', 'sp-pane');
    launcher.setAttribute('aria-expanded', 'false');
    launcher.innerHTML = icon('layout-sidebar-right');
    launcher.addEventListener('click', () => (isOpen() ? closePane() : openPane()));
    bar.append(launcher);
  }

  /* Ask */

  function scrollMessages() {
    messages.scrollTo({top: messages.scrollHeight, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
  }

  function addMessage(from, html) {
    const node = document.createElement('div');
    node.className = 'sp-message sp-message--' + from;
    node.innerHTML = (from === 'bot' ? '<span class="sp-avatar">' + icon('sparkles') + '</span>' : '') + '<div class="sp-bubble">' + html + '</div>';
    messages.append(node);
    scrollMessages();
    return node;
  }

  function escalation() {
    const node = document.createElement('div');
    node.className = 'sp-escalate';
    node.innerHTML = '<span>Still stuck? The support team can look into it.</span>';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sp-secondary';
    button.innerHTML = icon('ticket') + 'Raise a ticket';
    button.addEventListener('click', handOff);
    node.append(button);
    return node;
  }

  function greet() {
    const node = addMessage('bot', '<p>Hi James. I can help with UnionSuite and iMIS: how to do something, or what a screen means.</p>');
    const suggestions = document.createElement('div');
    suggestions.className = 'sp-suggestions';
    for (const answer of answers) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'sp-chip';
      chip.textContent = answer.ask;
      chip.addEventListener('click', () => ask(answer.ask));
      suggestions.append(chip);
    }
    node.querySelector('.sp-bubble').append(suggestions);
  }

  function answerFor(text) {
    return answers.find(answer => answer.match.test(text)) || fallback;
  }

  function ask(text, then) {
    text = text.trim();
    if (!text) return;
    clearTimeout(replyTimer);
    messages.querySelector('.sp-typing')?.closest('.sp-message').remove();
    conversation.push({from: 'user', text});
    addMessage('user', escape(text));
    question.value = '';
    sizeQuestion();
    const typing = addMessage('bot', '<span class="sp-typing" aria-label="Thinking"><i></i><i></i><i></i></span>');
    replyTimer = setTimeout(() => {
      typing.remove();
      const answer = answerFor(text);
      conversation.push({from: 'bot', text: answer.html, type: answer.type});
      const node = addMessage('bot', answer.html);
      const bubble = node.querySelector('.sp-bubble');
      if (answer.source) {
        bubble.insertAdjacentHTML('beforeend', '<a class="sp-source" href="#" data-sp-source>' + icon('book') + '<span>' + answer.source[1] + '<small>' + answer.source[0] + '</small></span>' + icon('external-link') + '</a>');
      }
      if (answer.escalate) bubble.append(escalation());
      else bubble.append(feedback());
      scrollMessages();
      then?.();
    }, 900);
  }

  function feedback() {
    const node = document.createElement('div');
    node.className = 'sp-feedback';
    node.innerHTML = '<span>Did that help?</span>';
    for (const [value, glyph] of [['yes', 'thumb-up'], ['no', 'thumb-down']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.setAttribute('aria-label', value === 'yes' ? 'Yes, that helped' : 'No, that didn\'t help');
      button.setAttribute('aria-pressed', 'false');
      button.innerHTML = icon(glyph);
      button.addEventListener('click', () => {
        node.querySelectorAll('button').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
        node.nextElementSibling?.remove();
        if (value === 'no') node.after(escalation());
        else node.querySelector('span').textContent = 'Thanks for letting us know.';
      });
      node.append(button);
    }
    return node;
  }

  function sizeQuestion() {
    question.style.height = 'auto';
    question.style.height = Math.min(question.scrollHeight, 120) + 'px';
    query('.sp-send').disabled = !question.value.trim();
  }

  /* Support ticket */

  function handOff() {
    const lastQuestion = [...conversation].reverse().find(item => item.from === 'user');
    const lastAnswer = [...conversation].reverse().find(item => item.from === 'bot');
    query('#sp-type').value = lastAnswer?.type || 'howto';
    if (!query('#sp-subject').value) query('#sp-subject').value = lastQuestion?.text.slice(0, 120) || '';
    query('#sp-handoff').hidden = false;
    query('#sp-context-chat').hidden = false;
    query('#sp-include-chat').checked = true;
    query('#sp-chat-count').textContent = conversation.length + ' messages from this conversation';
    query('#sp-details').placeholder = 'Anything to add? For example, what you expected to happen.';
    showForm();
    selectTab('ticket');
    query('#sp-details').focus();
  }

  function chatAttached() {
    return !query('#sp-context-chat').hidden && query('#sp-include-chat').checked;
  }

  function setInvalid(field, invalid) {
    field.setAttribute('aria-invalid', String(invalid));
    query('#' + field.id + '-error').hidden = !invalid;
  }

  function validate() {
    const subject = query('#sp-subject');
    const details = query('#sp-details');
    setInvalid(subject, !subject.value.trim());
    // The attached chat already explains the problem.
    setInvalid(details, !details.value.trim() && !chatAttached());
    const first = form.querySelector('[aria-invalid="true"]');
    first?.focus();
    return !first;
  }

  function renderTickets() {
    query('#sp-tickets').innerHTML = tickets.map(ticket => '<li><span><strong>' + escape(ticket.subject) + '</strong><small>' + ticket.number + ' · ' + ticket.when + '</small></span><span class="sp-status sp-status--' + ticket.status + '">' + ticket.label + '</span></li>').join('');
  }

  function setBusy(busy) {
    submit.disabled = busy;
    submit.setAttribute('aria-busy', String(busy));
    submit.querySelector('.us-button-spinner').hidden = !busy;
  }

  function send(event) {
    event.preventDefault();
    if (!validate()) return;
    setBusy(true);
    submitTimer = setTimeout(() => {
      setBusy(false);
      const number = 'SUP-' + nextTicket++;
      tickets = [{number, subject: query('#sp-subject').value.trim(), status: 'new', label: 'New', when: 'Just now'}, ...tickets];
      query('#sp-ticket-number').textContent = number;
      renderTickets();
      form.hidden = true;
      query('#sp-sent').hidden = false;
      query('#sp-sent-title').focus();
    }, 900);
  }

  function resetForm() {
    clearTimeout(submitTimer);
    setBusy(false);
    form.reset();
    form.querySelectorAll('[aria-invalid]').forEach(field => setInvalid(field, false));
    query('#sp-handoff').hidden = true;
    query('#sp-context-chat').hidden = true;
    query('#sp-details').placeholder = 'What were you doing, what did you expect, and what happened instead?';
    query('#sp-files').replaceChildren();
    query('#sp-impact-hint').textContent = impactHints.low;
    filesAdded = 0;
  }

  function showForm() {
    if (!form.hidden) return;
    resetForm();
    query('#sp-sent').hidden = true;
    form.hidden = false;
  }

  function addFile() {
    const [glyph, name, size] = sampleFiles[filesAdded++ % sampleFiles.length];
    const item = document.createElement('li');
    item.innerHTML = icon(glyph) + '<span><strong>' + name + '</strong><small>' + size + '</small></span>';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'sp-close';
    remove.setAttribute('aria-label', 'Remove ' + name);
    remove.innerHTML = icon('x');
    remove.addEventListener('click', () => {
      item.remove();
      query('#sp-attach').focus();
    });
    item.append(remove);
    query('#sp-files').append(item);
  }

  function describeBrowser() {
    const brand = navigator.userAgentData?.brands?.find(item => !/not|chromium/i.test(item.brand));
    query('#sp-browser').textContent = (brand ? brand.brand + ' ' + brand.version : 'Your browser') + ' · ' + innerWidth + ' × ' + innerHeight;
  }

  function reset() {
    clearTimeout(replyTimer);
    closePane();
    selectTab('ask');
    conversation = [];
    messages.replaceChildren();
    greet();
    question.value = '';
    sizeQuestion();
    tickets = [...earlierTickets];
    nextTicket = 2048;
    query('#sp-sent').hidden = true;
    form.hidden = false;
    resetForm();
  }

  /* Wiring */

  function start() {
    if (!query('#injected-taskbar')) {
      // The taskbar mounts on DOMContentLoaded; wait for it if it is late.
      const observer = new MutationObserver(() => {
        if (!query('#injected-taskbar')) return;
        observer.disconnect();
        start();
      });
      observer.observe(document.body, {childList: true, subtree: true});
      return;
    }
    addLauncher();
    greet();
    sizeQuestion();
    describeBrowser();
    placePane();
    // The bookmarks bar changes the header's height as it slides.
    new ResizeObserver(placePane).observe(query('#hd'));
    notifyParent({ready: true});
  }

  query('#sp-close').addEventListener('click', closePane);
  for (const tab of ['ask', 'ticket']) query('#sp-tab-' + tab).addEventListener('click', () => selectTab(tab));
  query('.sp-tabs').addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const next = query('#sp-tab-ask').getAttribute('aria-selected') === 'true' ? 'ticket' : 'ask';
    selectTab(next);
    query('#sp-tab-' + next).focus();
  });
  query('#sp-composer').addEventListener('submit', event => {
    event.preventDefault();
    ask(question.value);
  });
  question.addEventListener('input', sizeQuestion);
  question.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      ask(question.value);
    }
  });
  messages.addEventListener('click', event => {
    if (event.target.closest('[data-sp-source]')) event.preventDefault();
  });
  form.addEventListener('submit', send);
  form.addEventListener('input', event => {
    if (event.target.getAttribute('aria-invalid') === 'true' && event.target.value.trim()) setInvalid(event.target, false);
    if (event.target.name === 'sp-impact') query('#sp-impact-hint').textContent = impactHints[event.target.value];
  });
  query('#sp-include-chat').addEventListener('change', () => query('#sp-handoff').hidden = !query('#sp-include-chat').checked);
  query('#sp-attach').addEventListener('click', addFile);
  query('#sp-another').addEventListener('click', () => {
    showForm();
    query('#sp-type').focus();
  });
  query('#sp-back-to-ask').addEventListener('click', () => {
    selectTab('ask');
    question.focus();
  });
  pane.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      closePane();
    }
  });
  window.addEventListener('scroll', placePane, {passive: true});
  window.addEventListener('resize', () => {
    placePane();
    describeBrowser();
  });
  window.addEventListener('message', event => {
    if (event.source !== parent || !event.data?.workshop) return;
    const message = event.data;
    if (message.scheme && message.scheme !== window.UnionSuiteAppearance.getState().scheme) {
      window.UnionSuiteAppearance.setPreference(message.scheme);
    }
    if (message.paneMode) {
      mode = message.paneMode;
      document.body.dataset.spMode = mode;
    }
    if (message.paneTry === 'open') openPane('ask');
    if (message.paneTry === 'ask') {
      openPane('ask');
      ask(answers[0].ask);
    }
    if (message.paneTry === 'handoff') {
      openPane('ask');
      ask(answers[1].ask, handOff);
    }
    if (message.paneTry === 'ticket') {
      showForm();
      openPane('ticket');
    }
    if (message.reset) reset();
  });
  // The taskbar's own appearance switch keeps the workshop control in step.
  window.addEventListener('unionsuite:appearancechange', () => {
    notifyParent({scheme: window.UnionSuiteAppearance.getState().scheme});
  });

  document.body.dataset.spMode = mode;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
