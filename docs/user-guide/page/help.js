/*
 * The help page's Ask a question box and topic list. Uses the theme's
 * matcher (UnionSuiteHelpMatch.js) on the topics the build embeds in
 * #help-data, so it answers the way the side pane's chat does.
 */
(function () {
  'use strict';

  const help = JSON.parse(document.getElementById('help-data').textContent);
  // Questions are answered from the staff topics; once the reader opens the
  // administrators' part, from every topic.
  const staffMatcher = window.UnionSuiteHelpMatch.create({...help, topics: help.topics.filter(topic => topic.audience !== 'admin')});
  const allMatcher = window.UnionSuiteHelpMatch.create(help);
  const admin = document.getElementById('for-administrators');
  const matcherNow = () => (admin && admin.open ? allMatcher : staffMatcher);
  const input = document.getElementById('ask-input');
  const result = document.getElementById('ask-result');
  const toc = document.querySelector('.toc__details');
  let timer = 0;

  // The topic list is a fold-away list only in narrow windows, where it
  // starts folded. (Without this script it stays open.)
  const wide = window.matchMedia('(min-width: 951px)');
  function placeToc() {
    toc.open = wide.matches;
  }
  placeToc();
  wide.addEventListener('change', placeToc);

  // The topic list's filter: every word typed must start a word of the
  // topic's title, its section or its keywords ("priv" finds Restricted
  // notes through "private"). Sections with no match hide; Escape clears.
  const filter = document.getElementById('toc-filter');
  const empty = document.getElementById('toc-empty');
  const words = value => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const topicWords = new Map(help.topics.map(topic => [topic.id, words([topic.title, topic.section, ...(topic.keywords || [])].join(' '))]));
  function applyFilter() {
    const wanted = words(filter.value);
    let shown = 0;
    document.querySelectorAll('.toc__section').forEach(section => {
      let any = false;
      section.querySelectorAll(':scope > ul > li').forEach(item => {
        const id = item.querySelector('a')?.getAttribute('href').slice(1);
        const have = topicWords.get(id) || [];
        const match = wanted.every(word => have.some(term => term.startsWith(word)));
        item.toggleAttribute('data-filtered', !match);
        if (match) any = true;
      });
      section.toggleAttribute('data-filtered', !any);
      if (any) shown++;
    });
    const admin = document.querySelector('.toc__admin');
    if (admin) admin.toggleAttribute('data-filtered', !admin.querySelector('.toc__section:not([data-filtered])'));
    empty.hidden = shown > 0;
  }
  if (filter) {
    filter.parentElement.hidden = false;
    filter.addEventListener('input', applyFilter);
    filter.addEventListener('keydown', event => {
      if (event.key === 'Escape' && filter.value) {
        filter.value = '';
        applyFilter();
      }
    });
  }

  function link(topic, text) {
    const anchor = document.createElement('a');
    anchor.href = '#' + topic.id;
    anchor.textContent = text || topic.title;
    return anchor;
  }

  function show(question) {
    const text = question.trim();
    if (text.length < 3) {
      result.hidden = true;
      result.replaceChildren();
      return;
    }
    const answer = matcherNow().reply(text);
    const parts = [];
    result.classList.toggle('ask__result--unsure', !answer.sure);

    if (answer.sure) {
      const title = document.createElement('h2');
      title.className = 'ask__result-title';
      title.textContent = answer.topic.title;
      const reply = document.createElement('p');
      reply.innerHTML = answer.topic.answer_html;
      const steps = document.createElement('p');
      steps.className = 'ask__result-steps';
      steps.append(link(answer.topic, 'Show me the steps →'));
      parts.push(title, reply, steps);
    } else {
      const unsure = document.createElement('p');
      unsure.textContent = 'I am not sure what you mean. Try other words, or choose a topic from the list.';
      parts.push(unsure);
    }

    const suggestions = answer.sure ? answer.others : [answer.topic, ...answer.others].filter(Boolean);
    if (suggestions.length) {
      const others = document.createElement('p');
      others.className = 'ask__others';
      others.append(answer.sure ? 'Not quite? Try ' : 'Maybe ');
      suggestions.forEach((topic, index) => {
        if (index) others.append(index === suggestions.length - 1 ? ' or ' : ', ');
        others.append(link(topic));
      });
      parts.push(others);
    }

    result.replaceChildren(...parts);
    result.hidden = false;
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => show(input.value), 200);
  });

  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      clearTimeout(timer);
      show(input.value);
    }
  });

  document.querySelectorAll('.ask__example').forEach(button => {
    button.addEventListener('click', () => {
      input.value = button.textContent;
      show(input.value);
      input.focus();
    });
  });

  // Links within the page scroll here rather than by the browser: where the
  // page is shown from a data: address or a frame (a preview pane, an iMIS
  // content item), a plain #link does nothing. The topic gone to is marked,
  // and its heading takes focus so a keyboard or screen reader user lands
  // there too; narrow windows fold the topic list away.
  function goTo(target) {
    const fold = target.closest('details.help-admin');
    if (fold) fold.open = true;
    document.querySelectorAll('.topic--current').forEach(topic => topic.classList.remove('topic--current'));
    if (target.classList.contains('topic')) target.classList.add('topic--current');
    target.scrollIntoView({block: 'start'});
    const heading = target.querySelector('.topic__title');
    if (heading) heading.focus({preventScroll: true});
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest('a[href^="#"]');
    if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const id = anchor.getAttribute('href').slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (!wide.matches && anchor.closest('.toc')) toc.open = false;
    goTo(target);
    try {
      history.pushState(null, '', '#' + id);
    } catch (error) {
      // Some hosts refuse address changes; the scroll has happened anyway.
    }
  });

  // A link to a topic (Cases-Help.html#add-a-note) marks it on arrival.
  const linked = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
  if (linked && linked.closest('details.help-admin')) linked.closest('details.help-admin').open = true;
  if (linked && linked.classList.contains('topic')) linked.classList.add('topic--current');
})();
