// Offline handbook search. Index author documentation, never iframe internals.
(function () {
  'use strict';

  var doc = document;
  var main = doc.getElementById('main');
  var dialog = doc.getElementById('guide-search-dialog');
  var input = doc.getElementById('guide-search-input');
  var results = doc.getElementById('guide-search-results');
  var status = doc.getElementById('guide-search-status');
  var launcher = doc.getElementById('open-guide-search');
  var entries = [];
  var headings = [];
  var detailEntries = new Map();
  var targetNumber = 0;
  var searchTimer;
  var highlightedTarget;
  var ignored = 'script, style, iframe, select, textarea, [aria-hidden="true"], button:not([data-copy-text])';

  function textOf(node) {
    var walker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    var parts = [];
    var text;
    while ((text = walker.nextNode())) {
      if (!text.parentElement.closest(ignored)) parts.push(text.textContent);
    }
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function ensureId(node) {
    if (!node.id) {
      do { targetNumber++; } while (doc.getElementById('guide-match-' + targetNumber));
      node.id = 'guide-match-' + targetNumber;
    }
    return node.id;
  }

  function newEntry(node, title) {
    var section = node.closest('section');
    var sectionHeading = section && section.querySelector('h1, h2');
    var entry = {
      title: title,
      titleLower: title.toLowerCase(),
      section: section,
      detail: node.closest('details'),
      breadcrumb: sectionHeading && sectionHeading !== node ? textOf(sectionHeading) : 'Usage guide',
      target: node,
      segments: []
    };
    ensureId(node);
    entries.push(entry);
    return entry;
  }

  // Keep one result per heading/reference, with the matching paragraph, row or
  // code block as its destination. Closed details and filtered rows are indexed.
  main.querySelectorAll('h1, h2, h3, h4, h5, h6, summary, p, li, tr, pre, dt, dd, figcaption, .callout, .placement, .resource-grid a').forEach(function (node) {
    if (node.closest(ignored)) return;
    var title = textOf(node);
    if (!title) return;
    if (/^H[1-6]$/.test(node.tagName)) {
      var level = Number(node.tagName.slice(1));
      headings = headings.filter(function (heading) { return heading.level < level; });
      var entry = newEntry(node, title);
      entry.level = level;
      headings.push(entry);
      return;
    }
    if (node.tagName === 'SUMMARY') {
      detailEntries.set(node.parentElement, newEntry(node, title));
      return;
    }
    // The enclosing block already contributes nested list/paragraph text.
    if (node.parentElement.closest('p, li, tr, pre, .callout, .placement')) return;
    var owner = headings.slice().reverse().find(function (heading) {
      return heading.section === node.closest('section') && (!heading.detail || heading.detail.contains(node));
    });
    var reference = detailEntries.get(node.closest('details'));
    if (reference && (!owner || owner.target.compareDocumentPosition(reference.target) & Node.DOCUMENT_POSITION_FOLLOWING)) owner = reference;
    if (!owner) return;
    ensureId(node);
    owner.segments.push({text: title, lower: title.toLowerCase(), target: node});
  });
  entries.forEach(function (entry) {
    entry.searchText = entry.titleLower + ' ' + entry.segments.map(function (segment) { return segment.lower; }).join(' ');
  });

  function termsFor(value) {
    // A copied CSS selector such as .us-query-search also finds its class name.
    return Array.from(new Set(value.toLowerCase().trim().replace(/(^|\s)\.(?=[a-z])/g, '$1').split(/\s+/).filter(Boolean)));
  }

  function appendHighlighted(node, text, terms) {
    var escaped = terms.slice().sort(function (a, b) { return b.length - a.length; }).map(function (term) {
      return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    });
    var pattern = new RegExp(escaped.join('|'), 'gi');
    var offset = 0;
    var match;
    while ((match = pattern.exec(text))) {
      node.appendChild(doc.createTextNode(text.slice(offset, match.index)));
      var mark = doc.createElement('mark');
      mark.textContent = match[0];
      node.appendChild(mark);
      offset = match.index + match[0].length;
    }
    node.appendChild(doc.createTextNode(text.slice(offset)));
  }

  function excerpt(text, terms) {
    var lower = text.toLowerCase();
    var matches = terms.map(function (term) { return lower.indexOf(term); }).filter(function (position) { return position >= 0; });
    var start = Math.max(0, (matches.length ? Math.min.apply(null, matches) : 0) - 65);
    if (start) {
      var space = text.indexOf(' ', start);
      if (space !== -1 && space < start + 25) start = space + 1;
    }
    return (start ? '…' : '') + text.slice(start, start + 220) + (text.length > start + 220 ? '…' : '');
  }

  function search() {
    clearTimeout(searchTimer);
    results.replaceChildren();
    var terms = termsFor(input.value);
    if (!terms.length) {
      status.textContent = 'Start typing to search the whole guide.';
      return;
    }
    var phrase = terms.join(' ');
    var matches = entries.filter(function (entry) {
      return terms.every(function (term) { return entry.searchText.includes(term); });
    }).map(function (entry) {
      var best;
      var bestScore = -1;
      entry.segments.forEach(function (segment) {
        var score = terms.filter(function (term) { return segment.lower.includes(term); }).length * 4;
        if (segment.lower.includes(phrase)) score += 6;
        if (score > bestScore) { best = segment; bestScore = score; }
      });
      var titleMatches = terms.filter(function (term) { return entry.titleLower.includes(term); }).length;
      return {
        entry: entry,
        score: titleMatches * 12 + (entry.titleLower.includes(phrase) ? 25 : 0) + bestScore,
        text: best ? best.text : entry.title,
        target: titleMatches === terms.length || !best ? entry.target : best.target
      };
    }).sort(function (a, b) { return b.score - a.score; });
    status.textContent = matches.length ? matches.length + ' matching section' + (matches.length === 1 ? '' : 's') + (matches.length > 30 ? ' · showing the first 30. Add another word to narrow your search.' : '.') : 'No results. Try a feature name, class or fewer words.';
    matches.slice(0, 30).forEach(function (match) {
      var item = doc.createElement('li');
      var link = doc.createElement('a');
      link.href = '#' + match.target.id;
      link.dataset.guideTarget = match.target.id;
      var breadcrumb = doc.createElement('span');
      breadcrumb.className = 'guide-search-breadcrumb';
      breadcrumb.textContent = match.entry.breadcrumb;
      var title = doc.createElement('strong');
      appendHighlighted(title, match.entry.title, terms);
      var snippet = doc.createElement('span');
      snippet.className = 'guide-search-excerpt';
      appendHighlighted(snippet, excerpt(match.text, terms), terms);
      link.append(breadcrumb, title, snippet);
      item.appendChild(link);
      results.appendChild(item);
    });
    results.scrollTop = 0;
  }

  function openSearch() {
    if (!dialog.open) dialog.showModal();
    input.focus();
    input.select();
    search();
  }

  function reveal(target, focus) {
    for (var parent = target; parent && parent !== main; parent = parent.parentElement) {
      if (parent.tagName === 'DETAILS') parent.open = true;
    }
    var table = target.closest('table');
    if (table && target.closest('[hidden]')) {
      doc.querySelectorAll('[data-filter]').forEach(function (filter) {
        if (filter.dataset.filter === table.id) {
          filter.value = '';
          filter.dispatchEvent(new Event('input', {bubbles: true}));
        }
      });
    }
    if (focus) {
      if (highlightedTarget) highlightedTarget.classList.remove('guide-search-match');
      highlightedTarget = target;
      target.classList.add('guide-search-match');
      var addedTabindex = !target.hasAttribute('tabindex');
      if (addedTabindex) target.setAttribute('tabindex', '-1');
      target.focus({preventScroll: true});
      target.addEventListener('blur', function () {
        target.classList.remove('guide-search-match');
        if (addedTabindex) target.removeAttribute('tabindex');
      }, {once: true});
    }
    target.scrollIntoView({block: 'center', behavior: 'instant'});
  }

  launcher.addEventListener('click', openSearch);
  doc.getElementById('close-guide-search').addEventListener('click', function () { dialog.close(); });
  input.addEventListener('input', function () {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(search, 100);
  });
  results.addEventListener('click', function (event) {
    var link = event.target.closest('a[data-guide-target]');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    var target = doc.getElementById(link.dataset.guideTarget);
    dialog.close();
    // Native hashes keep copied result links and browser Back useful offline.
    window.location.hash = target.id;
    reveal(target, true);
  });
  dialog.addEventListener('keydown', function (event) {
    var links = Array.from(results.querySelectorAll('a'));
    if (event.key === 'Escape') {
      // Search inputs otherwise consume Escape to clear their text first.
      event.preventDefault();
      dialog.close();
    } else if (event.target === input && event.key === 'Enter') {
      event.preventDefault();
      search();
      var first = results.querySelector('a');
      if (first) first.click();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (event.target !== input && !links.includes(event.target)) return;
      event.preventDefault();
      var index = links.indexOf(event.target);
      var next = index + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0 || !links.length) input.focus();
      else links[Math.min(next, links.length - 1)].focus();
    }
  });
  function shortcut(event) {
    if ((event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
  }
  doc.addEventListener('keydown', shortcut);
  // Keyboard events do not bubble out of the guide's local example frames.
  doc.querySelectorAll('iframe[data-theme-preview], iframe[data-guide-tool]').forEach(function (frame) {
    function bindShortcut() {
      if (frame.contentDocument) frame.contentDocument.addEventListener('keydown', shortcut);
    }
    frame.addEventListener('load', bindShortcut);
    bindShortcut();
  });
  if (/Mac|iPhone|iPad/.test(navigator.platform)) launcher.querySelector('kbd').textContent = '⌘ K';
  function revealHash() {
    var id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch (_) { return; }
    var target = doc.getElementById(id);
    // Preserve normal section-anchor scrolling. Only search-generated targets
    // and references hidden inside details need help from the search runtime.
    if (target && main.contains(target) && (target.id.startsWith('guide-match-') || target.closest('details'))) reveal(target, false);
  }
  window.addEventListener('hashchange', revealHash);
  if (window.location.hash) revealHash();
})();
