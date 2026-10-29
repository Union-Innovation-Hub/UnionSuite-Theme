/* ==========================================================================
   CONTACT PAGE v3 — THEME CANDIDATE SCRIPT (not installed)
   Proposed additions to Theme/UnionSuite/zUnionSuite.js. Styles are in
   theme-candidate.css (sections 8, 10, 12, 16, 17, 32 and 37).
   ========================================================================== */

/* US-IQA-ROW-GROUPS:START — expandable related rows in a native Query Menu.
   Opt in with us-iqa-row-groups on the Query Menu iPart CSS class field.
   Adjacent rows with the same first-column value form a group: the first row
   stays visible with a toggle, the rest are hidden until expanded. Rows stay
   native, so sorting, paging and export are unchanged. Sort the IQA by the
   first column so related rows are adjacent; a group cannot span pages. */
(function () {
  'use strict';

  if (window.UnionSuiteRowGroups) {
    window.UnionSuiteRowGroups.refresh();
    return;
  }

  const OWNER = '.us-iqa-row-groups';
  const TABLE = '[data-gridid] .RadGrid .rgMasterTable';
  const enhanced = new Set();
  let groupId = 0;
  let queued = false;

  const dataRows = table => Array.from(table.tBodies[0]?.rows || [])
    .filter(row => row.matches('.rgRow, .rgAltRow'));

  const keyOf = row => (row.cells[0]?.textContent || '').trim();

  const eligible = table => table.isConnected &&
    table.closest(OWNER) &&
    !table.closest('.us-report-no-styling') &&
    !document.body.classList.contains('TemplateAreaEasyEditOn');

  // When every hidden row carries the same status badge (for example three
  // "Declined" payment attempts), the toggle names it and takes its tone, as
  // v1's "3 failed attempts" did. Otherwise it reads "n more".
  const TONES = ['danger', 'warning', 'success', 'info'];
  function sharedStatus(children) {
    const statuses = children.map(row => {
      const badge = row.querySelector('.us-badge');
      if (!badge) return null;
      const tone = TONES.find(name => badge.classList.contains('us-badge--' + name)) || '';
      return { text: badge.textContent.trim().toLowerCase(), tone };
    });
    const first = statuses[0];
    if (!first?.text || statuses.some(status => status?.text !== first.text || status.tone !== first.tone)) return null;
    return first;
  }

  function describe(count, status, key) {
    return count + ' ' + (status ? status.text : 'more') + ' ' + (count === 1 ? 'row' : 'rows') + ' for ' + key;
  }

  function toggleFor(parent, children, key) {
    const ids = children.map(row => {
      row.id = row.id || 'us-row-group-' + (++groupId);
      return row.id;
    });
    const count = children.length;
    const status = sharedStatus(children);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-row-group__toggle';
    button.dataset.usRowGroupKey = key;
    if (status) button.dataset.usRowGroupStatus = status.text;
    if (status?.tone) {
      button.dataset.usTone = status.tone;
      children.forEach(row => { row.dataset.usTone = status.tone; });
    }
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', ids.join(' '));
    button.setAttribute('aria-label', 'Show ' + describe(count, status, key));
    button.innerHTML = '<svg viewBox="0 0 12 12" aria-hidden="true" focusable="false"><path d="m4.5 2.5 3.5 3.5-3.5 3.5"></path></svg>';
    const label = document.createElement('span');
    label.textContent = count + ' ' + (status ? status.text : 'more');
    button.append(label);
    return button;
  }

  function group(table) {
    const rows = dataRows(table);
    for (let start = 0; start < rows.length;) {
      const key = keyOf(rows[start]);
      let end = start + 1;
      while (key && end < rows.length && keyOf(rows[end]) === key) end++;
      if (end - start > 1) {
        const parent = rows[start];
        const children = rows.slice(start + 1, end);
        parent.setAttribute('data-us-row-group', 'parent');
        children.forEach(row => {
          row.setAttribute('data-us-row-group', 'child');
          row.hidden = true;
        });
        children[children.length - 1].setAttribute('data-us-row-group-last', '');
        parent.cells[0].append(toggleFor(parent, children, key));
      }
      start = end;
    }
    table.setAttribute('data-us-row-groups', '');
    enhanced.add(table);
  }

  function release(table) {
    table.querySelectorAll(':scope > tbody > tr > td > .us-row-group__toggle').forEach(button => button.remove());
    table.querySelectorAll(':scope > tbody > tr[data-us-row-group]').forEach(row => {
      if (row.getAttribute('data-us-row-group') === 'child') row.hidden = false;
      row.removeAttribute('data-us-row-group');
      row.removeAttribute('data-us-row-group-open');
      row.removeAttribute('data-us-row-group-last');
      row.removeAttribute('data-us-tone');
    });
    table.removeAttribute('data-us-row-groups');
    enhanced.delete(table);
  }

  function update() {
    queued = false;
    enhanced.forEach(table => {
      if (!eligible(table)) release(table);
    });
    document.querySelectorAll(OWNER + ' ' + TABLE).forEach(table => {
      if (!enhanced.has(table) && eligible(table)) group(table);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.us-row-group__toggle');
    if (!button || !button.closest(OWNER)) return;
    const open = button.getAttribute('aria-expanded') !== 'true';
    const count = button.getAttribute('aria-controls').split(' ').length;
    const key = button.dataset.usRowGroupKey;
    button.setAttribute('aria-expanded', String(open));
    const status = button.dataset.usRowGroupStatus ? { text: button.dataset.usRowGroupStatus } : null;
    button.setAttribute('aria-label', (open ? 'Hide ' : 'Show ') + describe(count, status, key));
    button.closest('tr').toggleAttribute('data-us-row-group-open', open);
    button.getAttribute('aria-controls').split(' ').forEach(id => {
      const row = document.getElementById(id);
      if (row) row.hidden = !open;
    });
  });

  // Native partial updates replace the grid; class changes opt in or out.
  new MutationObserver(schedule).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class']
  });

  if (window.Sys?.WebForms?.PageRequestManager) {
    window.Sys.WebForms.PageRequestManager.getInstance().add_endRequest(schedule);
  }

  window.UnionSuiteRowGroups = {
    refresh: schedule,
    releaseAll() {
      Array.from(enhanced).forEach(release);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update);
  else update();
})();
/* US-IQA-ROW-GROUPS:END */

/* US-IQA-SCROLL-EDGES:START — shows that a native report scrolls sideways.
   Marks each report grid with data-us-scroll-more="start", "end" or both
   while columns are hidden on that side; the stylesheet fades that edge.
   Re-checks on scroll, on size changes (window, rail, column fitting) and
   when native partial updates replace a grid. */
(function () {
  'use strict';

  if (window.UnionSuiteScrollEdges) {
    window.UnionSuiteScrollEdges.refresh();
    return;
  }

  const GRID = '[data-gridid] .RadGrid, .RadGrid[data-gridid]';
  const watched = new WeakSet();
  let queued = false;

  function mark(grid) {
    const hidden = grid.scrollWidth - grid.clientWidth;
    // Right-to-left pages report scrollLeft as zero or negative.
    const offset = Math.abs(grid.scrollLeft);
    const sides = [];
    if (hidden > 1 && offset > 1) sides.push('start');
    if (hidden > 1 && offset < hidden - 1) sides.push('end');
    const value = sides.join(' ');
    if ((grid.getAttribute('data-us-scroll-more') || '') === value) return;
    if (value) grid.setAttribute('data-us-scroll-more', value);
    else grid.removeAttribute('data-us-scroll-more');
  }

  const sizes = window.ResizeObserver ? new ResizeObserver(records => {
    records.forEach(record => {
      const grid = record.target.closest('.RadGrid');
      if (grid) mark(grid);
    });
  }) : null;

  function scan() {
    queued = false;
    document.querySelectorAll(GRID).forEach(grid => {
      if (!watched.has(grid)) {
        watched.add(grid);
        grid.addEventListener('scroll', () => mark(grid), { passive: true });
        sizes?.observe(grid);
        const table = grid.querySelector('table');
        if (table) sizes?.observe(table);
      }
      mark(grid);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(scan);
  }

  new MutationObserver(schedule).observe(document.documentElement, { subtree: true, childList: true });
  window.addEventListener('resize', schedule);

  window.UnionSuiteScrollEdges = { refresh: schedule };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  else scan();
})();
/* US-IQA-SCROLL-EDGES:END */


/* US-CCO-RAIL-COLLAPSE:START — collapsible vertical CCO rail.
   Opt in with us-cco-collapsible on the CCO iPart CSS class field (pairs with
   us-cco-cards). A toggle at the top of the rail's column (the same spot in
   both states) collapses the outer rail on desktop; the collapsed rail becomes a "Sections: <current>" dropdown, reusing the mobile All
   sections picker that UnionSuiteTabs already adds to every vertical strip
   (UnionSuiteTabs 1.1 writes the label, theme-candidate-tabs.js).
   The user's choice is remembered per browser for every page. With no saved
   choice, the rail collapses automatically below 1200px. Mobile, nested CCOs
   and Easy Edit are unchanged. */
(function () {
  'use strict';

  if (window.UnionSuiteCcoRail) {
    window.UnionSuiteCcoRail.refresh();
    return;
  }

  const OWNER = '.us-cco-collapsible, .us-cco-rail';
  const STORAGE_KEY = 'UnionSuiteCcoRail';
  const AUTO_BELOW = 1200;
  const entries = new Map();
  let queued = false;
  let levelId = 0;
  let sessionChoice = null;
  let holding = false; // True while a collapse/expand animation holds the content.

  function preference() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'collapsed' || value === 'expanded' ? value : null;
    } catch (error) {
      return null;
    }
  }

  function remember(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      // Storage unavailable: the choice lasts until reload.
    }
    sessionChoice = value;
  }

  function collapsed() {
    const choice = preference() || sessionChoice;
    return choice ? choice === 'collapsed' : window.innerWidth < AUTO_BELOW;
  }

  function outerCcos() {
    const easy = window.gIsEasyEditEnabled === true || document.body.classList.contains('TemplateAreaEasyEditOn');
    if (easy) return [];
    return Array.from(document.querySelectorAll(OWNER + ' :is(.cco, .tabs-wrapper).tabs-vertical'))
      .filter(cco => !cco.parentElement.closest(OWNER + ' :is(.cco, .tabs-wrapper)') &&
        !cco.closest('.us-report-no-styling') &&
        cco.querySelector(':scope > .RadTabStripVertical > .rtsLevel'));
  }

  function attach(cco) {
    const strip = cco.querySelector(':scope > .RadTabStripVertical');
    const level = strip.querySelector(':scope > .rtsLevel');
    level.id = level.id || 'us-cco-rail-' + (++levelId);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-cco-rail-toggle';
    button.setAttribute('aria-controls', level.id);
    button.innerHTML = '<span class="us-cco-rail-toggle__icon" aria-hidden="true"></span>';
    entries.set(cco, { strip, button });
  }

  function detach(cco, entry) {
    entry.button.remove();
    cco.removeAttribute('data-us-cco-rail');
    cco.removeAttribute('data-us-cco-sections-inline');
    cco.style.removeProperty('--us-cco-bar-space');
    cco.style.removeProperty('--us-cco-sections-offset');
    cco.querySelector('[data-us-cco-sections-host]')?.removeAttribute('data-us-cco-sections-host');
    entries.delete(cco);
    window.UnionSuiteTabs?.refresh();
  }

  function update() {
    queued = false;
    const current = outerCcos();
    entries.forEach((entry, cco) => {
      if (!current.includes(cco) || !cco.contains(entry.button)) detach(cco, entry);
    });
    current.forEach(cco => {
      if (!entries.has(cco)) attach(cco);
    });

    const isCollapsed = collapsed();
    let switched = false;
    entries.forEach((entry, cco) => {
      // Expanded: a wrapper child in the toolbar row above the rail.
      // Collapsed: the start of the Sections bar, which takes that row.
      const parent = isCollapsed ? entry.strip : cco;
      if (entry.button.parentElement !== parent) {
        const focused = document.activeElement === entry.button;
        if (isCollapsed) entry.strip.prepend(entry.button);
        else cco.insertBefore(entry.button, entry.strip);
        if (focused) entry.button.focus();
      }
      const state = isCollapsed ? 'collapsed' : 'expanded';
      if (cco.getAttribute('data-us-cco-rail') !== state) switched = true;
      cco.setAttribute('data-us-cco-rail', state);
      entry.button.setAttribute('aria-expanded', String(!isCollapsed));
      entry.button.setAttribute('aria-label', isCollapsed ? 'Expand sections menu' : 'Collapse sections menu');
      entry.button.title = isCollapsed ? 'Expand sections' : 'Collapse sections';
      const desktop = window.matchMedia('(min-width: 601px)').matches;
      placeSwitcher(cco, entry, isCollapsed && desktop);
    });
    // UnionSuiteTabs labels the Sections picker from whether the tab list is
    // rendered. Ask it now, so the label is right in the frame the rail
    // switches (its resize observer would otherwise catch up a frame later).
    if (switched) window.UnionSuiteTabs?.refresh();
  }

  // Collapsed: a section switcher leading the open tab shares the Sections
  // row when it fits beside the bar's controls (the content then starts in
  // that row, the switcher's block leaves room for the controls and lines up
  // with them). Otherwise it keeps its own row. Not re-measured while a
  // collapse/expand animation is holding the content.
  function placeSwitcher(cco, entry, collapsedDesktop) {
    if (holding) return;
    const view = Array.from(cco.querySelectorAll(':scope > .RadMultiPage > .rmpView'))
      .find(node => node.getClientRects().length);
    const host = view && Array.from(view.children).find(node => node.getClientRects().length);
    const tabs = host?.querySelector('.us-section-navigation .us-section-tabs');
    const previous = cco.querySelector(':scope > .RadMultiPage > .rmpView > [data-us-cco-sections-host]');
    const wasInline = cco.hasAttribute('data-us-cco-sections-inline');
    let inline = false;
    if (collapsedDesktop && tabs) {
      const controls = [entry.button, entry.strip.querySelector(':scope > .us-tab-sections')]
        .filter(Boolean).map(node => node.getBoundingClientRect()).filter(box => box.width);
      const content = cco.querySelector(':scope > .RadMultiPage')?.getBoundingClientRect();
      if (controls.length && content) {
        const right = cco.classList.contains('tabs-right');
        const space = right ?
          content.right - Math.min(...controls.map(box => box.left)) + 16 :
          Math.max(...controls.map(box => box.right)) - content.left + 16;
        inline = tabs.scrollWidth <= content.width - space;
        if (inline) cco.style.setProperty('--us-cco-bar-space', Math.ceil(space) + 'px');
      }
    }
    if (previous && (previous !== host || !inline)) previous.removeAttribute('data-us-cco-sections-host');
    cco.toggleAttribute('data-us-cco-sections-inline', inline);
    if (!inline) {
      cco.style.removeProperty('--us-cco-bar-space');
      cco.style.removeProperty('--us-cco-sections-offset');
    } else {
      host.setAttribute('data-us-cco-sections-host', '');
      // Centre the switcher on the Sections box.
      const box = entry.strip.querySelector(':scope > .us-tab-sections')?.getBoundingClientRect();
      const current = parseFloat(cco.style.getPropertyValue('--us-cco-sections-offset')) || 0;
      const track = tabs.getBoundingClientRect();
      if (box?.height) {
        const offset = Math.round(current + (box.top + box.height / 2) - (track.top + track.height / 2));
        if (offset !== current) cco.style.setProperty('--us-cco-sections-offset', offset + 'px');
      }
    }
    // The switcher's underline measures on resize; re-measure when it moves.
    if (inline !== wasInline) requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  // Collapse/expand changes the grid's structure, which CSS cannot animate.
  // Where supported, a same-document view transition morphs the menu between
  // states in two steps (motion() ms in total, from --us-cco-rail-motion):
  //   collapse: the whole menu folds up from the bottom to the height of the
  //             Sections box, then moves sideways into the box's position;
  //   expand:   the reverse - the box moves to the rail's column, then the
  //             menu unfolds downwards.
  // The menu's morph partner is the Sections box (not the full-width bar),
  // so the menu becomes the dropdown control.
  // Only the menu is a snapshot: the root is not captured, so the content
  // stays live. Each top-level block of the open tab (panel, report, row)
  // starts at its old width and animates its side margin to the new width as
  // the menu's edge passes it - bottom block first when collapsing, top block
  // first when expanding - so panels grow and text re-wraps continuously.
  // Reduced motion and older browsers switch instantly.
  // One duration setting, shared with the stylesheet's default animations.
  const motion = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--us-cco-rail-motion')) || 1000;
  const EASE = 'cubic-bezier(.4, 0, .2, 1)';
  const BLOCK_MIN = 0.2; // Shortest block resize, as a fraction of the duration.

  // EASE as a function, to time the blocks against the menu's moving edge.
  const ease = (() => {
    const curve = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
    return x => {
      let low = 0;
      let high = 1;
      for (let i = 0; i < 24; i++) {
        const mid = (low + high) / 2;
        if (curve(mid, .4, .2) < x) low = mid;
        else high = mid;
      }
      return curve((low + high) / 2, 0, 1);
    };
  })();
  const lerp = (a, b, t) => a + (b - a) * t;

  const picker = entry => entry.strip.querySelector(':scope > .us-tab-sections');
  const rect = node => {
    const box = node.getBoundingClientRect();
    return { x: box.left, y: box.top, w: box.width, h: box.height };
  };
  const frame = (box, offset, easing = EASE) => ({
    offset,
    transform: 'translate(' + box.x + 'px, ' + box.y + 'px)',
    width: box.w + 'px',
    height: box.h + 'px',
    easing
  });

  // The rendered open view of a CCO, and its top-level blocks.
  function openView(cco) {
    return Array.from(cco.querySelectorAll(':scope > .RadMultiPage > .rmpView'))
      .find(node => node.getClientRects().length) || null;
  }

  function contentBlocks(view) {
    return view ? Array.from(view.children).filter(node => node.getClientRects().length) : [];
  }

  // Bottom edge of the menu at time t (0-1), matching animateRail's steps.
  function menuBottom(from, to, collapsing, t) {
    const start = from.y + from.h;
    const finish = to.y + to.h;
    if (collapsing) return t >= 0.5 ? finish : lerp(start, finish, ease(t / 0.5));
    return t <= 0.5 ? start : lerp(start, finish, ease((t - 0.5) / 0.5));
  }

  const firstTime = test => {
    for (let i = 0; i <= 200; i++) {
      if (test(i / 200)) return i / 200;
    }
    return 1;
  };

  // Lowest visible bottom edge of the page chrome above the CCO: the iMIS
  // header, the taskbar and the banner (in flow or pinned).
  function chromeEdge() {
    let bottom = 0;
    document.querySelectorAll('#hd, #injected-taskbar, .us-banner__surface').forEach(node => {
      if (!node.getClientRects().length) return;
      bottom = Math.max(bottom, node.getBoundingClientRect().bottom);
    });
    return Math.round(bottom);
  }

  function animateRail(from, to, collapsing) {
    const root = document.documentElement;
    // Step 1 changes height only (collapse) or position/width only (expand);
    // step 2 does the other, so the two movements read separately.
    const middle = collapsing ?
      { x: from.x, y: to.y, w: from.w, h: to.h } :
      { x: to.x, y: from.y, w: to.w, h: from.h };
    const timing = { duration: motion(), fill: 'both' };
    root.animate([frame(from, 0), frame(middle, 0.5), frame(to, 1)],
      { ...timing, pseudoElement: '::view-transition-group(us-cco-rail)' });
    // Hand over from the old snapshot to the new one around the midpoint.
    root.animate([{ opacity: 1, offset: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0, offset: 0.65 }, { opacity: 0, offset: 1 }],
      { ...timing, pseudoElement: '::view-transition-old(us-cco-rail)' });
    root.animate([{ opacity: 0, offset: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1, offset: 0.65 }, { opacity: 1, offset: 1 }],
      { ...timing, pseudoElement: '::view-transition-new(us-cco-rail)' });
  }

  // Live content: pin every block (and the view's vertical offset) to its old
  // geometry in the new layout, before the new state is first painted.
  function holdContent(content) {
    if (!content.view) return;
    const view = rect(content.view);
    content.shift = content.oldTop - view.y;
    content.view.style.translate = '0 ' + content.shift + 'px';
    content.blocks.forEach(block => {
      const next = rect(block.node);
      const style = getComputedStyle(block.node);
      block.next = next;
      block.inline = { left: block.node.style.marginLeft, right: block.node.style.marginRight };
      block.final = { left: parseFloat(style.marginLeft) || 0, right: parseFloat(style.marginRight) || 0 };
      // Positive margins narrow the block to its old edges; negative ones
      // widen it (expand: the block starts as wide as it was).
      block.start = {
        left: block.final.left + (block.old.x - next.x),
        right: block.final.right + ((next.x + next.w) - (block.old.x + block.old.w))
      };
      block.node.style.marginLeft = block.start.left + 'px';
      block.node.style.marginRight = block.start.right + 'px';
    });
  }

  // Each block holds its old width until the menu's edge reaches it, then
  // eases to its new width; the view glides to its new vertical position.
  function animateContent(content, from, to, collapsing) {
    if (!content.view) return;
    const duration = motion();
    // The vertical glide happens in the first half in both directions:
    // collapsing, the content moves down out of the Sections row while the
    // menu folds into it; expanding, it rises as the box leaves. Ease in and
    // out, no sudden start.
    content.view.animate([{ translate: '0 ' + content.shift + 'px' }, { translate: '0 0' }], {
      duration: duration / 2,
      easing: 'cubic-bezier(.65, 0, .35, 1)',
      fill: 'backwards'
    });
    content.view.style.removeProperty('translate');
    content.blocks.forEach(block => {
      let begin;
      let finish;
      if (collapsing) {
        // Starts as the edge rises past the block's bottom, ends past its top.
        begin = firstTime(t => menuBottom(from, to, true, t) <= block.old.y + block.old.h);
        finish = firstTime(t => menuBottom(from, to, true, t) <= block.old.y);
        // A block level with the folded row never gets passed; finish it just
        // after the fold completes rather than at the very end.
        if (finish >= 1) finish = 0.6;
      } else {
        // Must be narrow before the unfolding edge reaches its (new) top.
        finish = firstTime(t => menuBottom(from, to, false, t) >= block.next.y);
        begin = finish - BLOCK_MIN;
      }
      begin = Math.max(0, Math.min(begin, 1 - BLOCK_MIN));
      finish = Math.min(1, Math.max(finish, begin + BLOCK_MIN));
      block.animation = block.node.animate([
        { marginLeft: block.start.left + 'px', marginRight: block.start.right + 'px' },
        { marginLeft: block.final.left + 'px', marginRight: block.final.right + 'px' }
      ], { duration: (finish - begin) * duration, delay: begin * duration, easing: EASE, fill: 'backwards' });
      // The animation now holds the start margins; restore the author's own.
      block.node.style.marginLeft = block.inline.left;
      block.node.style.marginRight = block.inline.right;
    });
  }

  function releaseContent(content) {
    if (!content?.view) return;
    content.view.style.removeProperty('translate');
    content.blocks.forEach(block => {
      block.animation?.cancel();
      if (block.inline) {
        block.node.style.marginLeft = block.inline.left;
        block.node.style.marginRight = block.inline.right;
      }
    });
  }

  function toggle(button) {
    const collapsing = button.getAttribute('aria-expanded') === 'true';
    const settle = () => {
      button.focus();
      // Sticky rail, section underlines and banner geometry measure on resize.
      window.dispatchEvent(new Event('resize'));
    };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce) {
      remember(collapsing ? 'collapsed' : 'expanded');
      update();
      settle();
      return;
    }

    // The first CCO gets the fixed name that the stylesheet and the two-step
    // animation address, and its content follows block by block. Any further
    // CCOs get numbered names and the default single-step menu morph.
    const morphs = [];
    let index = 0;
    entries.forEach((entry, cco) => {
      const suffix = index ? '-' + (index + 1) : '';
      const view = index ? null : openView(cco);
      index += 1;
      morphs.push({
        entry,
        name: 'us-cco-rail' + suffix,
        from: collapsing ? entry.strip : picker(entry),
        content: {
          view,
          oldTop: view ? rect(view).y : 0,
          blocks: contentBlocks(view).map(node => ({ node, old: rect(node) }))
        }
      });
    });
    morphs.forEach(morph => {
      if (morph.from) morph.from.style.viewTransitionName = morph.name;
    });
    const primary = morphs[0];
    const fromBox = primary?.from ? rect(primary.from) : null;

    // The toggle sits at the rail's side in both states: on the right half of
    // the CCO means a right-hand rail, whose snapshots anchor right.
    const cco = button.closest(':is(.cco, .tabs-wrapper)');
    const box = cco.getBoundingClientRect();
    const place = button.getBoundingClientRect();
    const side = place.left + place.width / 2 > box.left + box.width / 2 ? 'right' : 'left';
    document.documentElement.setAttribute('data-us-cco-rail-transition', side);
    // Snapshots draw above the whole page, pinned banner included. Clip them
    // below the page chrome so the menu stays beneath it, as it does live.
    document.documentElement.style.setProperty('--us-cco-rail-clip-top', chromeEdge() + 'px');
    // The held content moves under the browser's scroll anchoring, which then
    // shifts the page (clamped to the bottom as it shortens) while the
    // snapshots stay put. The stylesheet turns anchoring off for the
    // transition; the scroll position is restored after the layout switch.
    const scroll = { left: window.scrollX, top: window.scrollY };

    const transition = document.startViewTransition(() => {
      remember(collapsing ? 'collapsed' : 'expanded');
      update();
      window.scrollTo({ ...scroll, behavior: 'instant' });
      // Hand each menu's name from its old element to its new partner.
      morphs.forEach(morph => {
        morph.from?.style.removeProperty('view-transition-name');
        morph.to = collapsing ? picker(morph.entry) : morph.entry.strip;
        if (morph.to) morph.to.style.viewTransitionName = morph.name;
      });
      if (primary) holdContent(primary.content);
      holding = true;
    });

    transition.ready.then(() => {
      if (!fromBox || !primary.to) {
        releaseContent(primary?.content);
        return;
      }
      const toBox = rect(primary.to);
      animateRail(fromBox, toBox, collapsing);
      animateContent(primary.content, fromBox, toBox, collapsing);
    }).catch(() => {
      // Skipped transition: the state has already changed; drop the hold.
      releaseContent(primary?.content);
    });

    transition.finished.finally(() => {
      morphs.forEach(morph => {
        [morph.from, morph.to].forEach(node => node?.style.removeProperty('view-transition-name'));
      });
      document.documentElement.removeAttribute('data-us-cco-rail-transition');
      document.documentElement.style.removeProperty('--us-cco-rail-clip-top');
      holding = false;
      schedule();
      settle();
    });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.us-cco-rail-toggle');
    if (button) toggle(button);
  });

  // The collapsed Sections list opens and closes like Quick Actions: it
  // unfolds from zero height (--us-actions-duration, default 400ms) and folds
  // back up on every close path. The theme closes the details instantly, so
  // the fold-up plays on a short-lived, non-interactive copy of the list.
  const LIST_EASE = 'cubic-bezier(.22, 1, .36, 1)';
  const LIST_ZERO = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', borderBottomWidth: '0px' };
  const listDuration = () => {
    const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--us-actions-duration'));
    return Number.isFinite(value) ? Math.max(0, value) : 400;
  };
  const listFrame = node => {
    const style = getComputedStyle(node);
    return {
      height: node.getBoundingClientRect().height + 'px',
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderTopWidth: style.borderTopWidth,
      borderBottomWidth: style.borderBottomWidth
    };
  };
  const openLists = new Map();

  // The latest drawn size and position of an open list, so the fold-up
  // starts exactly where the list was (after filtering, scrolling or a
  // half-finished opening).
  const recordList = (picker, options) => {
    const last = openLists.get(picker);
    if (!last || !picker.open) return;
    last.full = listFrame(options);
    last.box = options.getBoundingClientRect();
  };
  const listSizes = new ResizeObserver(entries => {
    entries.forEach(entry => recordList(entry.target.parentElement, entry.target));
  });

  // Runs on the open attribute itself (a microtask, before the next paint).
  // The toggle event arrives a frame later, which showed the whole list for
  // one frame before it unfolded and left a blank frame before it folded.
  const animateList = picker => {
    if (!picker.matches('.us-tab-sections') || !picker.closest(OWNER + ' [data-us-cco-rail="collapsed"]')) return;
    const options = picker.querySelector(':scope > .us-tab-section-options');
    if (!options || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (picker.open) {
      if (openLists.has(picker)) return;
      openLists.set(picker, { full: listFrame(options), box: options.getBoundingClientRect() });
      options.animate([LIST_ZERO, openLists.get(picker).full], { duration: listDuration(), easing: LIST_EASE });
      listSizes.observe(options);
      return;
    }

    const last = openLists.get(picker);
    openLists.delete(picker);
    listSizes.unobserve(options);
    if (!last || !picker.isConnected) return;
    // Out-of-flow wrapper so the copy keeps the list's styling without
    // taking space in the Sections bar.
    const ghost = document.createElement('div');
    ghost.className = 'us-tab-sections';
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.cssText = 'position:absolute;width:0;height:0;min-width:0;margin:0;overflow:visible;pointer-events:none';
    const copy = options.cloneNode(true);
    copy.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    copy.style.cssText = 'position:fixed;margin:0;box-sizing:border-box;overflow:hidden;z-index:6;' +
      'left:' + last.box.left + 'px;top:' + last.box.top + 'px;width:' + last.box.width + 'px;height:' + last.box.height + 'px';
    ghost.append(copy);
    picker.after(ghost);
    const fold = copy.animate([last.full, LIST_ZERO], { duration: listDuration(), easing: LIST_EASE, fill: 'forwards' });
    fold.finished.finally(() => ghost.remove());
  };

  new MutationObserver(records => {
    records.forEach(record => {
      if (record.target.open !== (record.oldValue !== null)) animateList(record.target);
    });
  }).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['open'],
    attributeOldValue: true
  });

  // Keep the recorded box current if the page scrolls while the list is open.
  window.addEventListener('scroll', () => {
    openLists.forEach((last, picker) => {
      const options = picker.querySelector(':scope > .us-tab-section-options');
      if (options) recordList(picker, options);
    });
  }, { passive: true, capture: true });

  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.us-tab-sections, .us-cco-rail-toggle'))) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'aria-selected']
  });

  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);

  window.UnionSuiteCcoRail = {
    refresh: schedule,
    collapse() { remember('collapsed'); update(); },
    expand() { remember('expanded'); update(); },
    reset() {
      try { localStorage.removeItem(STORAGE_KEY); } catch (error) { /* unavailable */ }
      sessionChoice = null;
      update();
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update);
  else update();
})();
/* US-CCO-RAIL-COLLAPSE:END */


/* US-BANNER-ALERTS:START — banner alert bell with a count and popup list.
   Author placeholder inside .us-banner__actions (Query Template banner):
     <div class="us-banner__alerts"
       data-us-alerts-query="$/…/Contact_Page/Alerts"
       data-us-alerts-filter="ID" data-us-alerts-value="{#query.ID}"
       data-us-alerts-tab="Summary"></div>
   One IQA, sorted newest first, filtered by the named filter. Output aliases:
   AlertKey (unique), Severity (danger|warning|important|info|success),
   Title, Message, AlertDate (display text), optional Link.
   Page load makes one limit=1 request: TotalCount gives the badge and the
   newest AlertKey detects anything new since this browser last opened the
   list. Opening the popup loads the list (up to 100). Uses GET /api/query. */
(function () {
  'use strict';

  if (window.UnionSuiteBannerAlerts) {
    window.UnionSuiteBannerAlerts.refresh();
    return;
  }

  const SELECTOR = '.us-banner__alerts[data-us-alerts-query]';
  const SEEN_KEY = 'UnionSuiteAlertsSeen';
  const LIST_LIMIT = 100;
  const states = new Map();
  let panelId = 0;
  let queued = false;

  // Tabler "bell" outline (MIT), drawn with currentColor.
  const BELL = '<svg class="us-banner__alerts-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"></path>' +
    '<path d="M9 17v1a3 3 0 0 0 6 0v-1"></path></svg>';

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(value).trim();

  // Rows arrive either as alias-keyed objects or as Name/Value property lists.
  function field(row, name) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(item => String(item.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  function config(root) {
    const query = text(root.dataset.usAlertsQuery);
    const filter = text(root.dataset.usAlertsFilter);
    const value = text(root.dataset.usAlertsValue);
    // Unsubstituted template placeholders mean the banner has no record yet.
    if (!/^\$\/.+/.test(query) || !filter || !value || /^[\[{]/.test(value)) return null;
    return { query, filter, value, scope: query + '|' + value, tab: text(root.dataset.usAlertsTab) };
  }

  async function request(cfg, limit) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({ QueryName: cfg.query, limit: String(limit), offset: '0' });
      params.set(cfg.filter, cfg.value);
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      const total = Number(unwrap(data.TotalCount));
      return { rows, total: Number.isFinite(total) ? total : rows.length };
    } finally {
      clearTimeout(timer);
    }
  }

  function seen(scope) {
    try {
      return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}')[scope] || null;
    } catch (error) {
      return null;
    }
  }

  function markSeen(scope, newest, count) {
    try {
      const all = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
      all[scope] = { newest, count };
      localStorage.setItem(SEEN_KEY, JSON.stringify(all));
    } catch (error) {
      // Storage unavailable: the badge stays "new" until reload.
    }
  }

  function render(state) {
    const { root, button, badge, count, fresh, status } = state;
    root.setAttribute('data-us-alerts-state', status);
    const known = status === 'ready' && count > 0;
    badge.hidden = !known;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.classList.toggle('us-banner__alerts-count--new', known && fresh);
    const label = status === 'error' ? 'Alerts (unavailable)' :
      status === 'loading' ? 'Alerts (loading)' :
      count === 0 ? 'Alerts: none outstanding' :
      'Alerts: ' + count + ' outstanding' + (fresh ? ', new' : '');
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  async function checkCount(state) {
    state.status = 'loading';
    render(state);
    try {
      const { rows, total } = await request(state.cfg, 1);
      const newest = text(field(rows[0], 'AlertKey'));
      const last = seen(state.cfg.scope);
      state.count = total;
      state.newest = newest;
      state.fresh = total > 0 && (!last || last.newest !== newest || total > last.count);
      state.status = 'ready';
    } catch (error) {
      state.status = 'error';
    }
    render(state);
  }

  function item(row) {
    const severity = text(field(row, 'Severity')).toLowerCase() || 'info';
    const li = document.createElement('li');
    li.className = 'us-banner__alerts-item';
    li.setAttribute('data-us-alert-severity', severity);
    const link = text(field(row, 'Link'));
    const body = document.createElement(link ? 'a' : 'div');
    body.className = 'us-banner__alerts-body';
    if (link) body.href = link;
    const title = document.createElement('strong');
    title.textContent = text(field(row, 'Title'));
    const message = document.createElement('span');
    message.textContent = text(field(row, 'Message'));
    const date = document.createElement('small');
    date.textContent = text(field(row, 'AlertDate'));
    body.append(title, message, date);
    li.append(body);
    return li;
  }

  async function loadList(state) {
    const { list, message, cfg, panel } = state;
    list.replaceChildren();
    message.textContent = 'Loading alerts…';
    message.hidden = false;
    panel.setAttribute('aria-busy', 'true');
    try {
      const { rows, total } = await request(cfg, LIST_LIMIT);
      rows.forEach(row => list.append(item(row)));
      message.textContent = total === 0 ? 'No outstanding alerts.' :
        total > rows.length ? 'Showing the newest ' + rows.length + ' of ' + total + '.' : '';
      message.hidden = !message.textContent;
      state.count = total;
      state.newest = text(field(rows[0], 'AlertKey'));
      state.fresh = false;
      state.status = 'ready';
      markSeen(cfg.scope, state.newest, total);
    } catch (error) {
      message.textContent = 'Alerts could not be loaded. ';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'TextButton SmallButton us-banner__alerts-retry';
      retry.textContent = 'Retry';
      message.append(retry);
    }
    panel.removeAttribute('aria-busy');
    render(state);
  }

  function open(state, show) {
    state.panel.hidden = !show;
    state.button.setAttribute('aria-expanded', String(show));
    if (show) {
      loadList(state);
      state.panel.focus();
    }
  }

  function goToTab(state) {
    const target = Array.from(document.querySelectorAll('.RadTabStripVertical .rtsLink, .RadTabStrip .rtsLink'))
      .find(link => text(link.querySelector('.rtsTxt')?.textContent || link.textContent) === state.cfg.tab);
    open(state, false);
    target?.click();
  }

  function attach(root, cfg) {
    const id = 'us-banner-alerts-' + (++panelId);
    root.replaceChildren();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-banner__alerts-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.innerHTML = BELL;
    const badge = document.createElement('span');
    badge.className = 'us-banner__alerts-count';
    badge.setAttribute('aria-hidden', 'true');
    badge.hidden = true;
    button.append(badge);

    const panel = document.createElement('div');
    panel.className = 'us-banner__alerts-panel';
    panel.id = id;
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Alerts');
    const head = document.createElement('div');
    head.className = 'us-banner__alerts-head';
    head.textContent = 'Alerts';
    const list = document.createElement('ul');
    list.className = 'us-banner__alerts-list';
    const message = document.createElement('p');
    message.className = 'us-banner__alerts-status';
    message.setAttribute('role', 'status');
    panel.append(head, list, message);
    if (cfg.tab) {
      const foot = document.createElement('div');
      foot.className = 'us-banner__alerts-foot';
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'us-banner__alerts-more';
      more.textContent = 'View on ' + cfg.tab + ' →';
      foot.append(more);
      panel.append(foot);
    }
    root.append(button, panel);

    const state = { root, cfg, button, badge, panel, list, message, count: 0, newest: '', fresh: false, status: 'loading' };
    states.set(root, state);
    checkCount(state);
  }

  function update() {
    queued = false;
    states.forEach((state, root) => {
      if (!root.isConnected || !root.contains(state.button)) states.delete(root);
    });
    document.querySelectorAll(SELECTOR).forEach(root => {
      if (states.has(root) || root.closest('.us-report-no-styling')) return;
      const cfg = config(root);
      if (!cfg) {
        root.setAttribute('data-us-alerts-state', 'unconfigured');
        return;
      }
      attach(root, cfg);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  document.addEventListener('click', event => {
    states.forEach(state => {
      if (event.target.closest('.us-banner__alerts-toggle') === state.button) {
        open(state, state.panel.hidden);
      } else if (state.panel.contains(event.target) && event.target.closest('.us-banner__alerts-more')) {
        goToTab(state);
      } else if (state.panel.contains(event.target) && event.target.closest('.us-banner__alerts-retry')) {
        loadList(state);
      } else if (!state.root.contains(event.target) && !state.panel.hidden) {
        open(state, false);
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    states.forEach(state => {
      if (!state.panel.hidden) {
        open(state, false);
        state.button.focus();
      }
    });
  });

  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.us-banner__alerts'))) schedule();
  }).observe(document.documentElement, { subtree: true, childList: true });

  window.UnionSuiteBannerAlerts = {
    refresh: schedule,
    // Re-checks every bell's count, e.g. after an alert is resolved.
    reload() {
      states.forEach(state => checkCount(state));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update);
  else update();
})();
/* US-BANNER-ALERTS:END */


/* US-CCO-SIDEBAR:START — tailored v1 sidebar: banner join, tab search, counts.
   Applies only to outer CCOs inside a us-cco-rail iPart; no other CCO gets
   search or counts.
   - Banner join: when the row (or iPart) directly above holds a .us-banner,
     measures the gap and sets --us-cco-rail-pull so the panel meets it.
   - Search: a "Find a section" box above the tabs and inside the collapsed
     Sections list once the menu has window.UnionSuiteCcoSidebarConfig
     .searchMinTabs tabs (default 8; set search: false to turn it off).
     Enter opens the first match, Escape clears, Down moves to the results.
   - Counts: a hidden placeholder, usually in the banner template:
       <div class="us-cco-counts" hidden
         data-us-counts-query="$/…/Contact_Page/Tab Counts"
         data-us-counts-filter="ID" data-us-counts-value="{#query.ID}"></div>
     One GET /api/query returns a row per tab: Tab (exact tab label), Count,
     optional Tone (danger|warning|info) and optional Badge (text such as "!"
     shown instead of the number). Counts render from data-us-count via CSS,
     so tab text (and the collapsed list built from it) is unchanged. */
(function () {
  'use strict';

  if (window.UnionSuiteCcoSidebar) {
    window.UnionSuiteCcoSidebar.refresh();
    return;
  }

  const OWNER = '.us-cco-rail';
  const COUNTS = '.us-cco-counts[data-us-counts-query]';
  const desktop = window.matchMedia('(min-width: 601px)');
  const entries = new Map();
  let counts = new Map();
  let queued = false;
  let searchId = 0;

  const settings = () => ({ search: true, searchMinTabs: 8, ...(window.UnionSuiteCcoSidebarConfig || {}) });
  const text = value => value == null ? '' : String(value).trim();
  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;

  // Rows arrive either as alias-keyed objects or as Name/Value property lists.
  function field(row, name) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(item => String(item.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  function outerCcos() {
    const easy = window.gIsEasyEditEnabled === true || document.body.classList.contains('TemplateAreaEasyEditOn');
    if (easy) return [];
    return Array.from(document.querySelectorAll(OWNER + ' :is(.cco, .tabs-wrapper).tabs-vertical'))
      .filter(cco => !cco.parentElement.closest(OWNER + ' :is(.cco, .tabs-wrapper)') &&
        !cco.closest('.us-report-no-styling') &&
        cco.querySelector(':scope > .RadTabStripVertical > .rtsLevel > .rtsUL'));
  }

  const items = entry => Array.from(entry.list.querySelectorAll(':scope > .rtsLI'));
  const label = item => text(item.querySelector('.rtsTxt')?.textContent || item.textContent);
  const pickerButtons = entry => Array.from(entry.strip.querySelectorAll(':scope > .us-tab-sections .us-tab-section-options > button'));

  // Banner join: only when the banner is the block directly above.
  function pull(cco) {
    let above = null;
    const part = cco.closest('.iMIS-WebPart');
    const previousPart = part?.previousElementSibling;
    if (previousPart?.querySelector?.('.us-banner')) {
      above = previousPart;
    } else {
      const row = cco.closest('.row');
      const previousRow = row?.previousElementSibling;
      if (previousRow?.matches('.row') && previousRow.querySelector('.us-banner')) above = previousRow;
    }
    let gap = 0;
    if (above) {
      // Join the banner itself when only spacing follows it in that block;
      // otherwise stop at the block's bottom so nothing below it is covered.
      const blockBottom = above.getBoundingClientRect().bottom;
      const bannerBottom = above.querySelector('.us-banner').getBoundingClientRect().bottom;
      const edge = blockBottom - bannerBottom <= 24 ? bannerBottom : blockBottom;
      // Fractional: rounding the gap up lifts the panel past the banner's
      // bottom edge, which shows as a hairline overlap. Two decimals keep the
      // written value stable without crossing that edge.
      gap = Math.round((cco.getBoundingClientRect().top - edge) * 100) / 100;
      if (gap < 0 || gap > 64) gap = 0;
    }
    const value = gap + 'px';
    if (cco.style.getPropertyValue('--us-cco-rail-pull') !== value) cco.style.setProperty('--us-cco-rail-pull', value);
  }

  // Phones: the tabs become one "Sections: <current>" dropdown under the
  // banner (UnionSuiteTabs 1.1 names the open tab, since the tab list is
  // hidden), which sticks below the pinned banner and any fixed top chrome.
  function chromeBottom() {
    let bottom = 0;
    document.querySelectorAll('#hd, #injected-taskbar, .us-banner--pinned .us-banner__surface').forEach(node => {
      if (!node.getClientRects().length) return;
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const pinned = node.matches('.us-banner--pinned .us-banner__surface');
      const stuck = style.position === 'sticky' && box.top <= (parseFloat(style.top) || 0) + 1;
      if (box.bottom > 0 && (pinned || style.position === 'fixed' || stuck)) bottom = Math.max(bottom, box.bottom);
    });
    // Ceil, so the dropdown never sticks a sub-pixel above the chrome's edge.
    return Math.ceil(bottom) + 'px';
  }

  let stickQueued = false;
  function stick() {
    stickQueued = false;
    const value = desktop.matches ? '' : chromeBottom();
    entries.forEach((entry, cco) => {
      if (cco.style.getPropertyValue('--us-cco-rail-sticky-top') === value) return;
      if (value) cco.style.setProperty('--us-cco-rail-sticky-top', value);
      else cco.style.removeProperty('--us-cco-rail-sticky-top');
    });
  }

  function scheduleStick() {
    if (stickQueued || !entries.size) return;
    stickQueued = true;
    requestAnimationFrame(stick);
  }

  function searchBox(entry, picker) {
    const wrap = document.createElement('div');
    wrap.className = 'us-cco-search' + (picker ? ' us-cco-search--picker' : '');
    const input = document.createElement('input');
    input.type = 'search';
    input.className = 'us-cco-search__input';
    input.id = 'us-cco-search-' + (++searchId);
    input.placeholder = 'Find a section';
    input.autocomplete = 'off';
    input.setAttribute('aria-label', 'Find a section');
    input.setAttribute('aria-keyshortcuts', 'Alt+S');
    input.value = entry.query;
    // Shows the Alt+S shortcut until the box is used.
    const key = document.createElement('kbd');
    key.className = 'us-cco-search__key';
    key.setAttribute('aria-hidden', 'true');
    key.textContent = SHORTCUT_LABEL;
    const empty = document.createElement('p');
    empty.className = 'us-cco-search__empty';
    empty.setAttribute('role', 'status');
    empty.hidden = true;
    empty.textContent = 'No matching sections';
    wrap.append(input, key, empty);
    return wrap;
  }

  const SHORTCUT_LABEL = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform || '') ? '⌥S' : 'Alt S';

  // The Sections button names its shortcut too (tooltip and screen readers).
  function labelShortcut(entry) {
    const summary = entry.strip.querySelector(':scope > .us-tab-sections > summary');
    if (!summary || summary.hasAttribute('aria-keyshortcuts')) return;
    summary.setAttribute('aria-keyshortcuts', 'Alt+S');
    summary.title = 'Sections (' + SHORTCUT_LABEL.replace(' ', '+') + ')';
  }

  function filter(entry) {
    const query = entry.query.toLowerCase();
    let shown = 0;
    items(entry).forEach(item => {
      const match = !query || label(item).toLowerCase().includes(query);
      item.hidden = !match;
      if (match) shown += 1;
    });
    pickerButtons(entry).forEach((button, index) => {
      const item = items(entry)[index];
      button.hidden = !!item && item.hidden;
    });
    entry.strip.querySelectorAll('.us-cco-search__empty').forEach(empty => {
      empty.hidden = shown > 0;
    });
  }

  function ensureSearch(entry) {
    labelShortcut(entry);
    const config = settings();
    const wanted = config.search !== false && items(entry).length >= Number(config.searchMinTabs || 0);
    const level = entry.list.parentElement;
    let rail = level.querySelector(':scope > .us-cco-search');
    const options = entry.strip.querySelector(':scope > .us-tab-sections .us-tab-section-options');
    let picker = options?.querySelector(':scope > .us-cco-search');
    if (!wanted) {
      rail?.remove();
      picker?.remove();
      if (entry.query) {
        entry.query = '';
        filter(entry);
      }
      return;
    }
    if (!rail) level.insertBefore(searchBox(entry, false), entry.list);
    if (options && !picker) options.prepend(searchBox(entry, true));
  }

  function applyCounts(entry) {
    const list = items(entry);
    const buttons = pickerButtons(entry);
    list.forEach((item, index) => {
      const data = counts.get(label(item).toLowerCase());
      const shown = data && (data.badge || data.count > 0) ? (data.badge || (data.count > 99 ? '99+' : String(data.count))) : '';
      [item.querySelector('.rtsLink'), buttons[index]].forEach(node => {
        if (!node) return;
        if (shown) {
          if (node.getAttribute('data-us-count') !== shown) node.setAttribute('data-us-count', shown);
          if (node.getAttribute('data-us-count-tone') !== data.tone) node.setAttribute('data-us-count-tone', data.tone);
        } else {
          node.removeAttribute('data-us-count');
          node.removeAttribute('data-us-count-tone');
        }
      });
    });
  }

  async function loadCounts() {
    const source = document.querySelector(COUNTS);
    const query = text(source?.dataset.usCountsQuery);
    const filterName = text(source?.dataset.usCountsFilter);
    const value = text(source?.dataset.usCountsValue);
    // Unsubstituted template placeholders mean the banner has no record yet.
    if (!/^\$\/.+/.test(query) || !filterName || !value || /^[\[{]/.test(value)) {
      counts = new Map();
      schedule();
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({ QueryName: query, limit: '100', offset: '0' });
      params.set(filterName, value);
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      counts = new Map(rows.map(row => [text(field(row, 'Tab')).toLowerCase(), {
        count: Number(unwrap(field(row, 'Count'))) || 0,
        tone: text(field(row, 'Tone')).toLowerCase() || 'neutral',
        badge: text(field(row, 'Badge'))
      }]));
    } catch (error) {
      // Counts are optional decoration: a failure leaves the tabs unmarked.
      counts = new Map();
    } finally {
      clearTimeout(timer);
    }
    schedule();
  }

  function detach(cco, entry) {
    entry.strip.querySelectorAll('.us-cco-search').forEach(node => node.remove());
    items(entry).forEach(item => { item.hidden = false; });
    entry.strip.querySelectorAll('[data-us-count]').forEach(node => {
      node.removeAttribute('data-us-count');
      node.removeAttribute('data-us-count-tone');
    });
    cco.style.removeProperty('--us-cco-rail-pull');
    cco.style.removeProperty('--us-cco-rail-sticky-top');
    entries.delete(cco);
  }

  function update() {
    queued = false;
    const current = outerCcos();
    entries.forEach((entry, cco) => {
      if (!current.includes(cco) || !cco.contains(entry.list)) detach(cco, entry);
    });
    current.forEach(cco => {
      if (!entries.has(cco)) {
        const strip = cco.querySelector(':scope > .RadTabStripVertical');
        entries.set(cco, { strip, list: strip.querySelector(':scope > .rtsLevel > .rtsUL'), query: '' });
      }
      const entry = entries.get(cco);
      pull(cco);
      ensureSearch(entry);
      applyCounts(entry);
      filter(entry);
    });
    stick();
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  const entryFor = node => entries.get(node.closest(':is(.cco, .tabs-wrapper).tabs-vertical'));

  document.addEventListener('input', event => {
    const input = event.target.closest?.('.us-cco-search__input');
    const entry = input && entryFor(input);
    if (!entry) return;
    entry.query = input.value;
    entry.strip.querySelectorAll('.us-cco-search__input').forEach(other => {
      if (other !== input) other.value = input.value;
    });
    filter(entry);
  });

  document.addEventListener('keydown', event => {
    const input = event.target.closest?.('.us-cco-search__input');
    const entry = input && entryFor(input);
    if (!entry) return;
    // Keys typed here must not reach Telerik's tab-strip keyboard handling
    // (arrows switch tabs). A plain Escape still closes the collapsed list.
    if (event.key !== 'Tab' && !(event.key === 'Escape' && !input.value)) event.stopPropagation();
    const inPicker = !!input.closest('.us-cco-search--picker');
    const targets = inPicker ?
      pickerButtons(entry).filter(button => !button.hidden && !button.disabled) :
      items(entry).filter(item => !item.hidden).map(item => item.querySelector('.rtsLink'));
    if (event.key === 'Enter') {
      event.preventDefault();
      const first = targets[0];
      entry.query = '';
      entry.strip.querySelectorAll('.us-cco-search__input').forEach(other => { other.value = ''; });
      filter(entry);
      first?.click();
    } else if (event.key === 'Escape' && input.value) {
      // Clear first; a second Escape closes the collapsed list as usual.
      event.preventDefault();
      event.stopPropagation();
      entry.query = '';
      entry.strip.querySelectorAll('.us-cco-search__input').forEach(other => { other.value = ''; });
      filter(entry);
    } else if (event.key === 'ArrowDown' && targets[0]) {
      event.preventDefault();
      targets[0].focus();
    }
  }, true);

  // Opening the collapsed Sections list puts the cursor in its search box.
  // Not on phones, where focusing would raise the on-screen keyboard over the
  // list.
  document.addEventListener('toggle', event => {
    const picker = event.target;
    if (!picker.matches?.('.us-tab-sections') || !picker.open || !picker.closest(OWNER) || !desktop.matches) return;
    requestAnimationFrame(() => picker.querySelector('.us-cco-search__input')?.focus({ preventScroll: true }));
  }, true);

  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.us-cco-search'))) schedule();
  }).observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'data-us-cco-rail']
  });

  window.addEventListener('resize', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('scroll', scheduleStick, { passive: true });

  // The pinned banner changes height as it condenses without the page
  // scrolling; keep the phone dropdown directly beneath it.
  const chromeSizes = new ResizeObserver(scheduleStick);
  const watchChrome = () => {
    document.querySelectorAll('.us-banner__surface').forEach(node => chromeSizes.observe(node));
  };

  // Alt+S (Option+S on a Mac) jumps to the sections from anywhere on the page,
  // including while typing in a field. Expanded, the rail is sticky, so the
  // cursor goes straight to its search box (or the current tab). Collapsed,
  // the Sections bar scrolls into view under the pinned banner and its list
  // opens, which focuses its search box. On phones the bar is already
  // sticky; the list just opens. Matched on the physical key (event.code) so
  // Option+S on a Mac does not type "ß" instead.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function jumpToSections(entry) {
    const cco = entry.strip.closest(':is(.cco, .tabs-wrapper)');
    const collapsed = cco.getAttribute('data-us-cco-rail') === 'collapsed';
    if (desktop.matches && !collapsed) {
      const target = entry.list.parentElement.querySelector(':scope > .us-cco-search .us-cco-search__input') ||
        entry.list.querySelector('.rtsLink.rtsSelected') || entry.list.querySelector('.rtsLink');
      target?.focus();
      target?.select?.();
      return;
    }
    const picker = entry.strip.querySelector(':scope > .us-tab-sections');
    if (!picker) return;
    if (desktop.matches) {
      const offset = () => entry.strip.getBoundingClientRect().top - parseFloat(chromeBottom()) - 8;
      if (Math.abs(offset()) > 1) {
        window.scrollTo({ top: Math.max(0, window.scrollY + offset()), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
        // The banner condenses or expands as the page moves, changing its
        // height; once the scroll settles, nudge the bar out from under it.
        let settled = false;
        const settle = () => {
          if (settled) return;
          settled = true;
          window.removeEventListener('scrollend', settle);
          const cover = offset();
          if (cover < -1) window.scrollBy({ top: cover, behavior: 'instant' });
        };
        window.addEventListener('scrollend', settle);
        setTimeout(settle, 1000);
      }
    }
    if (picker.open) {
      // Phones hide the list's search box, so focus goes to the current tab.
      const search = desktop.matches && picker.querySelector('.us-cco-search__input');
      (search || picker.querySelector('.us-tab-section-options > button[aria-current="true"]'))?.focus();
    } else {
      picker.querySelector(':scope > summary')?.click();
    }
  }

  document.addEventListener('keydown', event => {
    if (event.code !== 'KeyS' || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat) return;
    const entry = entries.values().next().value;
    if (!entry) return;
    event.preventDefault();
    jumpToSections(entry);
  });

  window.UnionSuiteCcoSidebar = {
    refresh: schedule,
    // The Alt+S behaviour, for a toolbar button or another shortcut.
    jumpToSections: () => { const entry = entries.values().next().value; if (entry) jumpToSections(entry); },
    // Re-reads the tab counts, e.g. after a case is closed.
    reloadCounts: loadCounts
  };

  const start = () => {
    update();
    loadCounts();
    watchChrome();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
/* US-CCO-SIDEBAR:END */

/* US-BANNER-ROW:START — one-row banner layout, for every banner.
   Sets data-us-banner-fit="row" on the surface when every fact fits on one
   line between the identity and the status/actions, otherwise "wrap" (the
   details take a second row under the avatar). Measured when the width
   changes and when the banner returns from its condensed state. Styles in
   theme-candidate.css section 3. */
(function () {
  'use strict';

  if (window.UnionSuiteBannerRow) return;

  const DESKTOP = '(min-width: 900px)';
  const lastWidth = new WeakMap();
  const watched = new WeakSet();
  const stale = new WeakSet();

  const surfaces = () => Array.from(document.querySelectorAll('.us-banner .us-banner__surface'));
  const condensed = surface => !!surface.closest('.us-banner.us-banner--compact');

  // The banner's own condense transition; measure after it has finished.
  const settleTime = surface => {
    const value = getComputedStyle(surface).getPropertyValue('--banner-motion-duration').trim();
    const time = parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
    return (Number.isFinite(time) ? time : 300) + 50;
  };

  // Try the one-row layout and keep it only if every fact stays on one line
  // at its full width.
  function fit(surface) {
    if (surface.closest('.us-report-no-styling')) return;
    // Condensed, the identity is smaller and the details are folded away;
    // keep the full banner's layout and measure again when it returns.
    if (condensed(surface) || !window.matchMedia(DESKTOP).matches) {
      stale.add(surface);
      return;
    }
    stale.delete(surface);
    const list = surface.querySelector('.us-banner__facts');
    const facts = list ? Array.from(list.children).filter(fact => fact.getClientRects().length) : [];
    surface.setAttribute('data-us-banner-fit', 'row');
    const top = facts.length ? facts[0].getBoundingClientRect().top : 0;
    const fits = facts.every(fact => Math.abs(fact.getBoundingClientRect().top - top) < 1 &&
      fact.scrollWidth <= fact.clientWidth + 1) &&
      (!list || list.scrollWidth <= list.clientWidth + 1);
    if (!fits) surface.setAttribute('data-us-banner-fit', 'wrap');
  }

  // Width changes only: the attribute changes the height, and measuring in
  // the next frame keeps the observer out of a resize loop.
  const sizes = new ResizeObserver(entries => {
    entries.forEach(entry => {
      const width = Math.round(entry.contentRect.width);
      if (width === lastWidth.get(entry.target)) return;
      lastWidth.set(entry.target, width);
      requestAnimationFrame(() => fit(entry.target));
    });
  });

  const watch = surface => {
    if (watched.has(surface)) return;
    watched.add(surface);
    sizes.observe(surface);
  };

  const refresh = () => {
    surfaces().forEach(surface => {
      watch(surface);
      fit(surface);
    });
  };

  // The banner condensing and expanding; banners added later (the first
  // class change on a new banner starts watching it).
  new MutationObserver(records => {
    records.forEach(record => {
      if (!record.target.classList?.contains('us-banner')) return;
      const wasCondensed = /(^|\s)us-banner--compact(\s|$)/.test(record.oldValue || '');
      record.target.querySelectorAll('.us-banner__surface').forEach(surface => {
        watch(surface);
        if (wasCondensed && !condensed(surface)) {
          if (stale.has(surface)) setTimeout(() => fit(surface), settleTime(surface));
        } else {
          fit(surface);
        }
      });
    });
  }).observe(document.documentElement, {
    subtree: true,
    attributes: true,
    attributeFilter: ['class'],
    attributeOldValue: true
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
  document.fonts?.ready.then(refresh);

  window.UnionSuiteBannerRow = { refresh };
})();
/* US-BANNER-ROW:END */

/* US-ATTENTION-HIDE-ZERO:START — opt-in quiet trackers (candidate).
   Add us-attention--hide-zero beside us-attention. Cards whose count is 0
   are hidden and the rest share the row; when every card is 0, the cards
   give way to one line, "Nothing needs attention", so an all-clear still
   reads as loaded rather than missing. Unavailable counts ("—") always show.
   Runs after the US-ATTENTION loader renders; on promotion this belongs in
   the loader itself (filter before replaceChildren). */
(function () {
  'use strict';

  if (window.UnionSuiteAttentionHideZero) {
    window.UnionSuiteAttentionHideZero.refresh();
    return;
  }

  const OWNER = '.us-attention.us-attention--hide-zero';

  function tidy(root) {
    const list = root.querySelector(':scope > .us-attention__items');
    if (!list) return;
    const items = Array.from(list.children);
    let shown = 0;
    items.forEach(item => {
      const zero = item.querySelector('.us-attention__number')?.textContent.trim() === '0';
      if (item.hidden !== zero) item.hidden = zero;
      if (!zero) shown += 1;
    });
    const allClear = items.length > 0 && shown === 0;
    if (items.length) list.style.setProperty('--us-attention-columns', String(Math.max(1, shown)));
    list.hidden = allClear;

    let clear = root.querySelector(':scope > .us-attention__clear');
    if (allClear && !clear) {
      clear = document.createElement('p');
      clear.className = 'us-attention__clear';
      clear.textContent = 'Nothing needs attention';
      list.after(clear);
    }
    if (clear) clear.hidden = !allClear;
  }

  function refresh() {
    document.querySelectorAll(OWNER).forEach(tidy);
  }

  // The loader replaces the cards on every load and reload.
  new MutationObserver(records => {
    const roots = new Set();
    records.forEach(record => {
      const root = record.target.closest?.(OWNER);
      if (root) roots.add(root);
    });
    roots.forEach(tidy);
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true });

  window.UnionSuiteAttentionHideZero = { refresh };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
/* US-ATTENTION-HIDE-ZERO:END */


/* US-ACTIVITY-FEED:START — one recent-activity list built from several IQAs.
   Author markup, usually the template of a one-row Query Template Display so
   iMIS fills in the record (item 32):
     <div class="us-activity-feed"
          data-us-activity-folder="$/…/Contact Profile/Activity"
          data-us-activity-filter="ID" data-us-activity-value="{#query.ID}"
          data-us-activity-start="StartDate" data-us-activity-days="90"
          data-us-activity-history="…full history page…">
       <ul class="us-activity__sources" hidden>
         <li data-source="calls-out" data-query="Outbound Calls"
             data-type="call" data-direction="out"></li>
         …one li per IQA…
       </ul>
     </div>
   Types: call, email, meeting, sms, note, interaction (data-label and
   data-plural name any other type). Every IQA is sorted newest first and
   filtered on the record filter and the named start-date filter, with these
   output aliases:
     required  ActivityKey, ActivityDate, Summary
     optional  Subject (most records have none), Detail, StaffName, With,
               Duration, Outcome, OutcomeTone, PriorityFlag (High|Urgent)
               (success|warning|danger|primary), CaseRef, CaseUrl, RecordUrl,
               AttachmentCount, Direction (In|Out; overrides data-direction)
   Optional: data-us-activity-limit (rows per request, default 20),
   data-us-activity-page (rows per Show more, default 10),
   data-us-activity-time-zone (default Australia/Sydney) and
   data-us-activity-today (a fixed YYYY-MM-DD for previews; leave it unset).
   On a source <li>, data-history is the IQA page for its type: while that
   type is chosen, a "View all calls" (emails, meetings…) link to it shows
   at the end of the type filters.
   The feed loads when it is first visible: one GET /api/query per source, in
   parallel. Rows merge newest first. A row shows only once no source that
   still holds unloaded rows could have a newer one, so Show more and the type
   filter page every source correctly. A date range change keeps what is
   loaded (narrowing folds the older cards away; widening pages on) and only
   re-queries the counts. Search covers the loaded rows only, says so, and
   faintly highlights matches. Cards fold in and out as filters change, and
   the type switcher's underline slides to the chosen type. A failed source is reported, never
   counted as zero. Values render as text, never as HTML.
   Each row is a record card (US-RECORD-CARDS and its CSS, from
   prototypes/wip/activity-cards/): the same markup as that folder's
   templates/Activity-Card.html, so the feed and every Query Template list
   share one design. The card script expands cards; the feed remembers which
   are open across re-renders. */
(function () {
  'use strict';

  if (window.UnionSuiteActivityFeed) {
    window.UnionSuiteActivityFeed.refresh();
    return;
  }

  const SELECTOR = '.us-activity-feed';
  const TYPES = {
    call: { label: 'Call', plural: 'Calls', inward: 'Inbound', outward: 'Outbound' },
    email: { label: 'Email', plural: 'Emails', inward: 'Received', outward: 'Sent' },
    meeting: { label: 'Meeting', plural: 'Meetings' },
    sms: { label: 'SMS', plural: 'SMS', inward: 'Received', outward: 'Sent' },
    note: { label: 'Note', plural: 'Notes' },
    interaction: { label: 'Interaction', plural: 'Interactions' }
  };
  const RANGES = [
    [90, 'Last 90 days'],
    [180, 'Last 6 months'],
    [365, 'Last 12 months'],
    [0, 'All time']
  ];
  const TONES = ['success', 'warning', 'danger', 'primary'];
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  // Tabler "search" outline (MIT), as drawn by the theme's report search.
  const SEARCH_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"></path><path d="M21 21l-6 -6"></path></svg>';
  // The theme's report filter icon (US-QUERY-SEARCH icon('filter')).
  const FILTER_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M10 20a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341L21.74 4.67A1 1 0 0 0 21 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14z"></path></svg>';
  const MAX_FETCHES_PER_FILL = 25;

  const states = new Map();
  let feedId = 0;
  let queued = false;

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(unwrap(value)).trim();

  // Rows arrive either as alias-keyed objects or as Name/Value property lists.
  function field(row, name) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(item => String(item.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  // Links from query data: same-site pages only (no javascript: or other schemes).
  function safeUrl(value) {
    const raw = text(value);
    if (!raw) return '';
    try {
      const url = new URL(raw, window.location.href);
      return /^https?:$/.test(url.protocol) ? raw : '';
    } catch (error) {
      return '';
    }
  }

  function typeInfo(source) {
    const known = TYPES[source.type] || { label: source.type, plural: source.type };
    return {
      label: source.label || known.label,
      plural: source.plural || known.plural,
      inward: known.inward || 'Inbound',
      outward: known.outward || 'Outbound'
    };
  }

  function config(root) {
    const folder = text(root.dataset.usActivityFolder).replace(/\/+$/, '');
    const filter = text(root.dataset.usActivityFilter);
    const value = text(root.dataset.usActivityValue);
    // Unsubstituted template placeholders mean the page has no record yet.
    if (!/^\$\/.+/.test(folder) || !filter || !value || /^[\[{]/.test(value)) return null;

    const sources = [];
    const seenKeys = new Set();
    root.querySelectorAll('.us-activity__sources > li[data-source][data-query][data-type]').forEach(item => {
      const key = text(item.dataset.source);
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      sources.push({
        key,
        query: text(item.dataset.query),
        type: text(item.dataset.type).toLowerCase(),
        direction: text(item.dataset.direction).toLowerCase(),
        label: text(item.dataset.label),
        plural: text(item.dataset.plural),
        history: safeUrl(item.dataset.history)
      });
    });
    if (!sources.length) return null;

    const number = (raw, fallback) => {
      const parsed = Number.parseInt(raw, 10);
      return Number.isSafeInteger(parsed) && parsed > 0 ? Math.min(parsed, 500) : fallback;
    };
    const days = Number.parseInt(root.dataset.usActivityDays, 10);
    return {
      folder,
      filter,
      value,
      sources,
      start: text(root.dataset.usActivityStart) || 'StartDate',
      days: RANGES.some(([range]) => range === days) ? days : 90,
      limit: number(root.dataset.usActivityLimit, 20),
      page: number(root.dataset.usActivityPage, 10),
      timeZone: text(root.dataset.usActivityTimeZone) || 'Australia/Sydney',
      today: /^\d{4}-\d{2}-\d{2}$/.test(text(root.dataset.usActivityToday)) ? text(root.dataset.usActivityToday) : '',
      history: safeUrl(root.dataset.usActivityHistory)
    };
  }

  // First day of the window as YYYY-MM-DD, counted in the display time zone.
  function startDate(cfg, days) {
    let today = cfg.today;
    if (!today) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', { timeZone: cfg.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
        .formatToParts(new Date()).map(part => [part.type, part.value]));
      today = parts.year + '-' + parts.month + '-' + parts.day;
    }
    const [year, month, day] = today.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day - days)).toISOString().slice(0, 10);
  }

  // ActivityDate as wall-clock parts. /api/query returns server-local time
  // without a zone; a value that does carry a zone is shown in the display zone.
  function parseDate(value, timeZone) {
    const raw = text(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?(?:\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/);
    if (!match) return null;
    let [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
    if (match[7]) {
      const instant = new Date(raw);
      if (Number.isNaN(instant.getTime())) return null;
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-AU', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
      }).formatToParts(instant).map(part => [part.type, part.value]));
      ({ year, month, day, hour, minute, second } = parts);
    }
    return {
      sort: year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second,
      year: Number(year),
      month: Number(month),
      day: Number(day),
      hour: Number(hour),
      minute: Number(minute),
      hasTime: Boolean(match[4])
    };
  }

  function shortDate(date, thisYear) {
    const text = date.day + ' ' + MONTHS[date.month - 1].slice(0, 3);
    return date.year === thisYear ? text : text + ' ' + date.year;
  }

  function timeText(date) {
    if (!date.hasTime) return '';
    const hour = date.hour % 12 || 12;
    return hour + ':' + String(date.minute).padStart(2, '0') + ' ' + (date.hour < 12 ? 'am' : 'pm');
  }

  function currentYear(cfg) {
    return Number((cfg.today || startDate(cfg, 0)).slice(0, 4));
  }

  function normalize(row, source, timeZone) {
    const key = text(field(row, 'ActivityKey'));
    const date = parseDate(field(row, 'ActivityDate'), timeZone);
    const subject = text(field(row, 'Subject'));
    const summary = text(field(row, 'Summary'));
    if (!key || !date || !(subject || summary)) return null;
    const direction = text(field(row, 'Direction')).toLowerCase() || source.direction;
    const tone = text(field(row, 'OutcomeTone')).toLowerCase();
    const attachments = Number.parseInt(text(field(row, 'AttachmentCount')), 10);
    return {
      id: source.key + ':' + key,
      source,
      date,
      subject,
      summary,
      detail: text(field(row, 'Detail')),
      staff: text(field(row, 'StaffName')),
      with: text(field(row, 'With')),
      duration: text(field(row, 'Duration')),
      outcome: text(field(row, 'Outcome')),
      tone: TONES.includes(tone) ? tone : '',
      priority: /^(high|urgent)$/i.test(text(field(row, 'PriorityFlag'))) ? text(field(row, 'PriorityFlag')) : '',
      caseRef: text(field(row, 'CaseRef')),
      caseUrl: safeUrl(field(row, 'CaseUrl')),
      recordUrl: safeUrl(field(row, 'RecordUrl')),
      attachments: Number.isSafeInteger(attachments) && attachments > 0 ? attachments : 0,
      direction: direction.startsWith('in') ? 'in' : direction.startsWith('out') ? 'out' : ''
    };
  }

  async function request(state, source, page = {}) {
    const { cfg } = state;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({
        QueryName: cfg.folder + '/' + source.def.query,
        limit: String(page.limit ?? cfg.limit),
        offset: String(page.offset ?? source.offset)
      });
      params.set(cfg.filter, cfg.value);
      if (state.days) params.set(cfg.start, startDate(cfg, state.days));
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      if (!data || unwrap(data.IsSuccessStatusCode) === false || unwrap(data.IsValid) === false) throw Error('Query failed');
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      const total = Number(unwrap(data.TotalCount));
      const hasNext = unwrap(data.HasNext);
      return {
        rows,
        total: Number.isSafeInteger(total) && total >= 0 ? total : null,
        hasNext: typeof hasNext === 'boolean' ? hasNext : null
      };
    } finally {
      clearTimeout(timer);
    }
  }

  const resetSource = source => Object.assign(source, { rows: [], ids: new Set(), offset: 0, total: null, more: false, status: 'loading', error: '' });

  // Loads the next page of one source. Returns false if the feed was reset meanwhile.
  async function loadPage(state, source) {
    const generation = state.generation;
    source.status = 'loading';
    try {
      const page = await request(state, source);
      if (generation !== state.generation) return false;
      page.rows.forEach(row => {
        const entry = normalize(row, source.def, state.cfg.timeZone);
        if (!entry) {
          console.warn('[US-ACTIVITY-FEED] Skipped a row without ActivityKey, a valid ActivityDate, or any Subject or Summary:', source.def.query);
        } else if (!source.ids.has(entry.id)) {
          source.ids.add(entry.id);
          source.rows.push(entry);
        }
      });
      source.offset += page.rows.length;
      source.total = page.total;
      const fallback = page.total === null ? page.rows.length === state.cfg.limit : source.offset < page.total;
      source.more = page.rows.length > 0 && (page.hasNext ?? fallback);
      source.status = 'ready';
      source.error = '';
    } catch (error) {
      if (generation !== state.generation) return false;
      source.status = 'failed';
      source.error = error.message || 'Request failed';
    }
    return true;
  }

  const newestFirst = (a, b) => a.date.sort < b.date.sort ? 1 : a.date.sort > b.date.sort ? -1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  const lastRow = source => source.rows[source.rows.length - 1];

  function relevantSources(state) {
    return state.sources.filter(source => source.status === 'ready' && (state.type === 'all' || source.def.type === state.type));
  }

  // Loaded rows that are certainly in their final position: no other source
  // with unloaded rows could still supply a newer row (equal times wait too).
  // A source with more to load but no rows yet could supply any row.
  function settledRows(state) {
    const sources = relevantSources(state);
    const pending = sources.filter(source => source.more);
    return sources.flatMap(source => source.rows).sort(newestFirst).filter(row =>
      pending.every(source => source.def === row.source || (lastRow(source) && row.date.sort > lastRow(source).date.sort)));
  }

  // Type and direction words match too ("email", "inbound"), as a shortcut
  // beside the type filters, which stay the way to page a whole type.
  function matchesSearch(row, query) {
    if (!query) return true;
    const info = typeInfo(row.source);
    const direction = row.direction === 'in' ? info.inward : row.direction === 'out' ? info.outward : '';
    return [row.subject, row.summary, row.detail, row.staff, row.with, row.caseRef, row.outcome, info.label, info.plural, direction]
      .some(value => value.toLowerCase().includes(query));
  }

  function visibleRows(state) {
    const query = state.query.toLowerCase();
    return settledRows(state).filter(row => matchesSearch(row, query));
  }

  // Loads more pages, from whichever source holds back the merge, until the
  // requested number of rows can be shown. Search never loads more: it
  // covers the loaded rows only.
  async function fill(state) {
    if (state.filling) {
      state.refill = true;
      return;
    }
    state.filling = true;
    const generation = state.generation;
    try {
      for (let fetches = 0; fetches < MAX_FETCHES_PER_FILL; fetches++) {
        if (state.query || visibleRows(state).length >= state.shown) break;
        const candidates = relevantSources(state).filter(source => source.more);
        if (!candidates.length) break;
        // A source with nothing loaded goes first: a wider date range reopens
        // sources that had no rows in the old one, such as a type with none.
        const next = candidates.find(source => !source.rows.length)
          ?? candidates.reduce((best, source) => lastRow(source).date.sort > lastRow(best).date.sort ? source : best);
        state.loadingMore = true;
        render(state);
        if (!await loadPage(state, next) || generation !== state.generation) return;
      }
    } finally {
      if (generation === state.generation) {
        state.filling = false;
        state.loadingMore = false;
        render(state);
        if (state.refill) {
          state.refill = false;
          fill(state);
        }
      }
    }
  }

  async function reload(state) {
    state.generation += 1;
    state.filling = false;
    state.refill = false;
    state.loadingMore = false;
    state.shown = state.cfg.page;
    state.sources.forEach(resetSource);
    clearBody(state);
    const generation = state.generation;
    render(state);
    await Promise.all(state.sources.map(source => loadPage(state, source)));
    if (generation === state.generation) fill(state);
  }

  // Every source is sorted newest first, so a shorter date range is the front
  // of a longer one. A range change therefore keeps what is loaded:
  // narrowing drops the rows now outside the window (their cards fold away)
  // and stops those sources; widening lets each source page on from where it
  // stopped. Only the counts are re-queried, one row per source.
  function changeRange(state, days) {
    const narrower = days !== 0 && (state.days === 0 || days < state.days);
    state.days = days;
    // A page requested for the old window is ignored when it arrives.
    state.generation += 1;
    state.filling = false;
    state.refill = false;
    state.loadingMore = false;
    const start = days ? startDate(state.cfg, days) : '';
    state.sources.forEach(source => {
      if (source.status === 'loading') {
        source.status = 'ready';
        source.more = true;
      }
      if (source.status !== 'ready') return;
      source.total = null;
      if (!narrower) {
        source.more = true;
        return;
      }
      const kept = source.rows.filter(row => row.date.sort.slice(0, 10) >= start);
      if (kept.length < source.rows.length) {
        // Everything in the new window is already here; the kept rows are the
        // first rows of any wider window, so paging can resume after them.
        source.more = false;
        source.rows = kept;
        source.ids = new Set(kept.map(row => row.id));
        source.offset = kept.length;
      }
    });
    render(state);
    fill(state);
    refreshCounts(state);
  }

  async function refreshCounts(state) {
    const generation = state.generation;
    await Promise.all(state.sources.filter(source => source.status === 'ready').map(async source => {
      try {
        const page = await request(state, source, { limit: 1, offset: 0 });
        if (generation === state.generation && page.total !== null) source.total = page.total;
      } catch (error) {
        // The count stays blank; the rows themselves are unaffected.
      }
    }));
    if (generation === state.generation) render(state);
  }

  async function retry(state) {
    const failed = state.sources.filter(source => source.status === 'failed');
    const generation = state.generation;
    failed.forEach(resetSource);
    render(state);
    await Promise.all(failed.map(source => loadPage(state, source)));
    if (generation === state.generation) fill(state);
  }

  /* Rendering */

  function typeKeys(state) {
    return [...new Set(state.cfg.sources.map(source => source.type))];
  }

  function sourceOfType(state, type) {
    return state.cfg.sources.find(source => source.type === type);
  }

  // Real totals from TotalCount; null while loading or when no source answered.
  function totalFor(state, type) {
    const sources = state.sources.filter(source => type === 'all' || source.def.type === type);
    if (sources.some(source => source.status === 'loading')) return null;
    const ready = sources.filter(source => source.status === 'ready');
    if (!ready.length) return null;
    return ready.reduce((sum, source) => sum + (source.total ?? source.rows.length), 0);
  }

  function build(state) {
    const { root } = state;
    const id = 'us-activity-' + (++feedId);

    const bar = el('div', 'us-activity__bar');
    const types = el('div', 'us-section-tabs us-activity__types');
    types.setAttribute('role', 'group');
    types.setAttribute('aria-label', 'Show activity type');
    ['all', ...typeKeys(state)].forEach(type => {
      const button = el('button');
      button.type = 'button';
      button.dataset.usTab = type;
      const label = type === 'all' ? 'All' : typeInfo(sourceOfType(state, type)).plural;
      button.append(el('span', 'us-activity__type-label', label), el('span', 'us-activity__count'));
      types.append(button);
    });

    const search = el('label', 'us-query-search-field us-activity__search');
    search.htmlFor = id + '-search';
    search.insertAdjacentHTML('afterbegin', SEARCH_ICON);
    const input = el('input');
    input.type = 'search';
    input.id = id + '-search';
    input.autocomplete = 'off';
    input.placeholder = 'Search loaded activity';
    input.setAttribute('aria-label', 'Search loaded activity');
    search.append(input);

    const range = el('select', 'us-activity__range');
    range.setAttribute('aria-label', 'Date range');
    RANGES.forEach(([days, label]) => {
      const option = el('option', '', label);
      option.value = String(days);
      range.append(option);
    });
    range.value = String(state.days);
    // "View all calls" and so on: shown while one type is chosen, linking to
    // that type's IQA page (data-history on its first source that has one).
    const typeHistory = el('a', 'us-activity__type-history');
    typeHistory.hidden = true;

    // Search and date range: on the type filters' line when the feed is wide
    // enough (the heading's filter button then hides); otherwise folded away
    // behind that button, as on the home page tasks, opening above the type
    // filters. Without a panel heading they stay visible.
    const controls = el('div', 'us-activity__controls');
    controls.id = id + '-filters';
    controls.append(search, range);
    const filterToggle = headingToggle(root, controls.id);
    controls.hidden = Boolean(filterToggle);
    bar.append(types, typeHistory, controls);

    const notice = el('div', 'us-activity__notice');
    notice.setAttribute('role', 'alert');
    notice.hidden = true;

    const body = el('div', 'us-activity__body us-records');
    body.id = id + '-body';

    const footer = el('div', 'us-activity__footer');
    const status = el('p', 'us-activity__status');
    status.setAttribute('role', 'status');
    const more = el('button', 'TextButton SmallButton us-outline-button us-activity__more', 'Show more');
    more.type = 'button';
    more.setAttribute('aria-controls', body.id);
    footer.append(status, more);
    if (state.cfg.history) {
      const history = el('a', 'us-activity__history', 'View full history');
      history.href = state.cfg.history;
      footer.append(history);
    }

    root.append(bar, notice, body, footer);
    Object.assign(state, { id, types, typeHistory, input, range, controls, filterToggle, filtersOpen: false, notice, body, status, more });
  }

  // The theme's own filter button (US-QUERY-SEARCH markup and classes) in the
  // host panel's heading actions, which the theme adds to every Query Template
  // Display; it is created here if the theme has not run yet. Interim: this
  // and setFiltersOpen become one shared filter-toggle helper for Query
  // Templates, Content HTML blocks and IQA filters (owner note, TODO.md).
  function headingToggle(root, controlsId) {
    const header = root.closest('.panel')?.querySelector(':scope > .panel-heading');
    if (!header?.querySelector('.panel-title')?.textContent.trim()) return null;
    let actions = header.querySelector(':scope > .us-panel-actions');
    if (!actions) {
      actions = el('div', 'us-iqa-report-actions us-panel-actions');
      header.append(actions);
    }
    const utilities = el('div', 'us-iqa-report-utilities us-activity__utilities');
    const button = el('button', 'us-iqa-filter-toggle us-iqa-icon-button');
    button.type = 'button';
    button.setAttribute('aria-controls', controlsId);
    button.insertAdjacentHTML('afterbegin', FILTER_ICON);
    utilities.append(button);
    actions.append(utilities);
    labelToggle(button, false);
    return button;
  }

  function labelToggle(button, open) {
    const label = open ? 'Hide filters' : 'Show filters';
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', label);
    button.title = label;
  }

  // Opens or closes the filters with the theme's 180ms fold. Closing clears
  // the search, as the tasks search does; the date range is kept and stays
  // named in the footer.
  const INLINE_FILTERS_MIN = 880;

  function fitFilters(state) {
    if (!state.filterToggle) return;
    const wide = state.root.clientWidth >= INLINE_FILTERS_MIN;
    if (state.root.hasAttribute('data-us-activity-wide') === wide && state.fitted) return;
    state.fitted = true;
    state.root.toggleAttribute('data-us-activity-wide', wide);
    state.filterToggle.closest('.us-activity__utilities').hidden = wide;
    // A search in progress keeps the fields open when the feed narrows.
    if (!wide && state.query) state.filtersOpen = true;
    state.controls.getAnimations().forEach(animation => animation.cancel());
    state.controls.style.overflow = '';
    state.controls.hidden = !wide && !state.filtersOpen;
    labelToggle(state.filterToggle, !state.controls.hidden);
  }

  function setFiltersOpen(state, open) {
    const { controls, filterToggle } = state;
    state.filtersOpen = open;
    labelToggle(filterToggle, open);
    if (!open && controls.contains(document.activeElement)) filterToggle.focus();
    if (!open && state.query) {
      state.input.value = '';
      state.query = '';
      state.shown = state.cfg.page;
      render(state);
      fill(state);
    }
    fold(controls, open, 180).then(() => {
      if (open && document.activeElement === filterToggle) state.input.focus({ preventScroll: true });
    });
  }

  // The card family's fold (US-RECORD-CARDS): height and fade, reversible.
  // Without the card script the change is instant.
  function fold(element, open, duration) {
    if (window.UnionSuiteRecordCards) return window.UnionSuiteRecordCards.fold(element, open, duration);
    element.hidden = !open;
    return Promise.resolve();
  }

  function fact(list, label, value) {
    if (!value) return;
    const group = el('div');
    group.append(el('dt', '', label), el('dd', '', value));
    list.append(group);
  }

  // One record card: the type line (type · direction · linked record · by
  // whom, then priority and status flags), the headline (Subject, when there
  // is one) and the note, and the date column; details below.
  function item(state, row, thisYear) {
    const info = typeInfo(row.source);
    const expanded = state.expanded.has(row.id);

    const record = el('article', 'us-record' + (expanded ? ' is-expanded' : ''));
    record.dataset.usRecordType = row.source.type;
    record.dataset.usRecordPriority = row.priority;
    record.dataset.usActivityId = row.id;
    const node = el('span', 'us-record__node');
    node.setAttribute('aria-hidden', 'true');

    const tags = el('p', 'us-record__tags');
    tags.append(el('span', 'us-record__type', info.label));
    if (row.direction) tags.append(el('span', 'us-record__direction', row.direction === 'in' ? info.inward : info.outward));
    if (row.caseRef) {
      const link = el(row.caseUrl ? 'a' : 'span', 'us-record__link', row.caseRef);
      if (row.caseUrl) link.href = row.caseUrl;
      tags.append(link);
    }
    if (row.staff) tags.append(el('span', 'us-record__by', row.staff));
    if (row.priority) tags.append(el('span', 'us-badge us-record__priority', row.priority));
    if (row.outcome) tags.append(el('span', 'us-badge us-record__status' + (row.tone ? ' us-badge--' + row.tone : ''), row.outcome));

    const side = el('div', 'us-record__side');
    const when = el('time', 'us-record__date', shortDate(row.date, thisYear));
    when.dateTime = row.date.sort;
    side.append(when);
    if (row.date.hasTime) side.append(el('span', 'us-record__time', timeText(row.date)));
    const actions = el('span', 'us-record__actions');
    const toggle = el('button', 'us-record__toggle');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', 'Show details');
    actions.append(toggle);
    side.append(actions);

    const head = el('div', 'us-record__head');
    head.append(tags, el('h3', 'us-record__title', row.subject), el('p', 'us-record__text', row.summary), side);

    const detail = el('div', 'us-record__detail');
    detail.hidden = !expanded;
    const facts = el('dl', 'us-record__facts');
    fact(facts, 'Handled by', row.staff);
    fact(facts, 'With', row.with);
    fact(facts, 'Duration', row.duration);
    fact(facts, 'Outcome', row.outcome);
    if (facts.childElementCount) detail.append(facts);
    if (row.detail) detail.append(el('p', 'us-record__body', row.detail));
    if (row.attachments) detail.append(el('p', 'us-record__files', row.attachments === 1 ? '1 attachment' : row.attachments + ' attachments'));
    if (row.recordUrl) {
      const more = el('p', 'us-record__more');
      const open = el('a', 'TextButton SmallButton us-outline-button', 'View full details');
      open.href = row.recordUrl;
      more.append(open);
      detail.append(more);
    }

    const card = el('div', 'us-record__card');
    card.append(head, detail);
    record.append(node, card);
    const li = el('li');
    li.append(record);
    return li;
  }

  function rangeLabel(state) {
    return RANGES.find(([days]) => days === state.days)[1];
  }

  function emptyMessage(state) {
    const what = state.type === 'all' ? 'activity' : typeInfo(sourceOfType(state, state.type)).plural.toLowerCase();
    return state.days ? 'No ' + what + ' in the ' + rangeLabel(state).toLowerCase() + '.' : 'No ' + what + ' recorded.';
  }

  function clearBody(state) {
    state.cards = new Map();
    state.groups = new Map();
    state.painted = false;
    state.body.replaceChildren();
    state.emptyNote = null;
  }

  // An element that no longer belongs folds away, then leaves the DOM. It can
  // be taken back while it is still folding.
  function leave(element, animate) {
    element.dataset.usActivityLeaving = '';
    if (!animate) {
      element.remove();
      return;
    }
    fold(element, false, 180).then(() => {
      if (element.hasAttribute('data-us-activity-leaving')) element.remove();
    });
  }

  function keep(element, animate, isNew) {
    const returning = element.hasAttribute('data-us-activity-leaving');
    element.removeAttribute('data-us-activity-leaving');
    if (isNew && animate) element.hidden = true;
    if ((isNew || returning) && animate) fold(element, true, 180);
    else if (returning) element.hidden = false;
  }

  // Moves an element to follow "previous" (or to the start), only if needed.
  function place(parent, element, previous) {
    const target = previous ? previous.nextElementSibling : parent.firstElementChild;
    if (target !== element) parent.insertBefore(element, target);
  }

  // Keyed update, so type, search and range changes animate: cards and month
  // groups that stay are kept and moved into order, new ones fold in and ones
  // that no longer match fold out. The first cards appear without motion.
  function renderBody(state, rows, firstLoad) {
    const { body } = state;
    if (!state.cards) clearBody(state);
    body.setAttribute('aria-busy', String(firstLoad));
    const animate = state.painted;
    const thisYear = currentYear(state.cfg);

    const months = new Map();
    rows.forEach(row => {
      const key = row.date.year + '-' + String(row.date.month).padStart(2, '0');
      if (!months.has(key)) months.set(key, []);
      months.get(key).push(row);
    });
    const wanted = new Set(rows.map(row => row.id));

    state.cards.forEach((card, id) => {
      if (!wanted.has(id) && !card.hasAttribute('data-us-activity-leaving')) leave(card, animate);
    });
    state.groups.forEach((group, key) => {
      if (!months.has(key) && !group.hasAttribute('data-us-activity-leaving')) leave(group, animate);
    });

    let previousGroup = null;
    months.forEach((groupRows, key) => {
      let group = state.groups.get(key);
      const newGroup = !group || !group.isConnected;
      if (newGroup) {
        const [year, month] = key.split('-').map(Number);
        group = el('section', 'us-records__group');
        group.append(el('h3', 'us-records__group-title', MONTHS[month - 1] + ' ' + year), el('ul', 'us-records__items'));
        state.groups.set(key, group);
      }
      place(body, group, previousGroup);
      keep(group, animate, newGroup);
      previousGroup = group;

      const list = group.lastElementChild;
      let previousCard = null;
      groupRows.forEach(row => {
        let card = state.cards.get(row.id);
        const newCard = !card || !card.isConnected;
        if (newCard) {
          card = item(state, row, thisYear);
          state.cards.set(row.id, card);
        }
        place(list, card, previousCard);
        // Cards inside a new group arrive with it.
        keep(card, animate && !newGroup, newCard);
        previousCard = card;
      });
    });

    // Empty, loading and no-match messages sit after the groups.
    let message = '';
    let loading = false;
    if (!rows.length) {
      const relevant = state.sources.filter(source => state.type === 'all' || source.def.type === state.type);
      message = emptyMessage(state);
      loading = firstLoad || state.loadingMore;
      if (loading) message = 'Loading activity…';
      else if (relevant.length && relevant.every(source => source.status === 'failed')) message = 'Activity couldn’t be loaded.';
      else if (state.query) message = 'No loaded activity matches “' + state.query + '”.';
    }
    if (!state.emptyNote) {
      state.emptyNote = el('p', 'us-activity__empty');
      state.emptyNote.hidden = true;
    }
    if (message) setNote(state.emptyNote, message, loading);
    body.append(state.emptyNote);
    if (animate) fold(state.emptyNote, Boolean(message), 180);
    else state.emptyNote.hidden = !message;

    if (rows.length) state.painted = true;
    highlightMatches(state);
  }

  // While loading, the theme's spinning circles lead the message, as beside
  // the IQA finder's "Searching…". An unchanged note is left alone, so the
  // spinner does not restart on every render.
  function setNote(note, message, loading) {
    const spinning = Boolean(note.querySelector(':scope > .section-loader-spinning-circles'));
    note.classList.toggle('is-loading', loading);
    if (note.textContent === message && spinning === loading) return;
    if (!loading) {
      note.textContent = message;
      return;
    }
    const spinner = el('span', 'section-loader-spinning-circles');
    spinner.setAttribute('aria-hidden', 'true');
    note.replaceChildren(spinner, document.createTextNode(message));
  }

  // A faint highlight on search matches, drawn with CSS Custom Highlights so
  // the card text is untouched (browsers without them show no highlight).
  // One registry entry covers every feed on the page.
  const MATCH_HIGHLIGHT = 'us-activity-match';

  function highlightMatches(state) {
    if (!window.CSS?.highlights || typeof Highlight !== 'function') return;
    const query = state.query.toLowerCase();
    const ranges = [];
    if (query) {
      const walker = document.createTreeWalker(state.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement.closest('[data-us-activity-leaving], .us-activity__empty')) continue;
        const text = node.data.toLowerCase();
        for (let at = text.indexOf(query); at >= 0; at = text.indexOf(query, at + query.length)) {
          const range = new Range();
          range.setStart(node, at);
          range.setEnd(node, at + query.length);
          ranges.push(range);
        }
      }
    }
    state.matches = ranges;
    const all = [...states.values()].flatMap(feed => feed.matches || []);
    if (all.length) CSS.highlights.set(MATCH_HIGHLIGHT, new Highlight(...all));
    else CSS.highlights.delete(MATCH_HIGHLIGHT);
  }

  // The chosen type's underline slides to it: the theme's switcher marker
  // (data-us-section-indicator and its offsets), as the page-sections adapter
  // moves it on the home page. Interim copy; on promotion both use one helper.
  function syncIndicator(state) {
    const list = state.types;
    const button = list.querySelector('button[data-us-tab].is-active');
    if (!button || !list.getClientRects().length || !button.offsetWidth) {
      list.removeAttribute('data-us-section-indicator');
      state.indicator = null;
      return;
    }
    const shown = Boolean(state.indicator);
    if (!shown) list.setAttribute('data-us-section-indicator', 'still');
    const width = parseFloat(getComputedStyle(list, '::after').width) || 20;
    const x = button.offsetLeft + (button.offsetWidth - width) / 2;
    const y = button.offsetTop + button.offsetHeight - 5;
    if (shown && state.indicator.x === x && state.indicator.y === y) return;
    list.setAttribute('data-us-section-indicator', shown ? 'animate' : 'still');
    list.style.setProperty('--us-section-indicator-x', x + 'px');
    list.style.setProperty('--us-section-indicator-y', y + 'px');
    state.indicator = { x, y };
  }

  // The chosen type's "View all …" link fades in when a type is chosen or
  // changed, and out when the filter returns to All.
  function showTypeHistory(state) {
    const link = state.typeHistory;
    const source = state.type === 'all' ? null : state.cfg.sources.find(item => item.type === state.type && item.history);
    const target = source ? source.history : '';
    if (target === (link.dataset.target || '')) return;
    link.dataset.target = target;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || !link.animate;
    link.getAnimations().forEach(animation => animation.cancel());
    if (!source) {
      if (reduced || link.hidden) {
        link.hidden = true;
        return;
      }
      link.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: 'cubic-bezier(.2, 0, 0, 1)' })
        .finished.then(() => {
          if (!link.dataset.target) link.hidden = true;
        }, () => {});
      return;
    }
    link.href = target;
    link.textContent = 'View all ' + typeInfo(source).plural.toLowerCase();
    link.hidden = false;
    if (!reduced) {
      link.animate([{ opacity: 0, transform: 'translateX(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 180, easing: 'cubic-bezier(.2, 0, 0, 1)' });
    }
  }

  function render(state) {
    const firstLoad = state.sources.every(source => source.status === 'loading' || source.status === 'idle');

    state.types.querySelectorAll('button[data-us-tab]').forEach(button => {
      const active = button.dataset.usTab === state.type;
      const total = totalFor(state, button.dataset.usTab);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
      button.querySelector('.us-activity__count').textContent = total === null ? '' : String(total);
    });
    syncIndicator(state);

    showTypeHistory(state);

    const failed = state.sources.filter(source => source.status === 'failed');
    state.notice.hidden = !failed.length;
    if (failed.length) {
      const names = failed.map(source => source.def.query);
      const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
      const again = el('button', 'TextButton SmallButton us-activity__retry', 'Retry');
      again.type = 'button';
      state.notice.replaceChildren(el('p', '', list + ' couldn’t be loaded, so this list may be incomplete.'), again);
    }

    const visible = visibleRows(state);
    const rows = visible.slice(0, state.shown);
    renderBody(state, rows, firstLoad);

    const pending = relevantSources(state).some(source => source.more);
    const total = totalFor(state, state.type);
    let summary = '';
    if (firstLoad) {
      summary = 'Loading…';
    } else if (state.query) {
      const loaded = relevantSources(state).reduce((sum, source) => sum + source.rows.length, 0);
      summary = visible.length + ' of ' + loaded + ' loaded ' + (loaded === 1 ? 'activity matches' : 'activities match') + ' your search';
    } else if (rows.length) {
      summary = 'Showing ' + rows.length + (total === null ? '' : ' of ' + total) + ' · ' + rangeLabel(state).toLowerCase();
    }
    state.status.textContent = summary;
    state.more.hidden = firstLoad || (visible.length <= state.shown && (Boolean(state.query) || !pending));
    state.more.disabled = Boolean(state.loadingMore);
    state.more.textContent = state.loadingMore ? 'Loading…' : 'Show more';
  }

  /* Lifecycle */

  function attach(root) {
    if (states.has(root)) return;
    const cfg = config(root);
    if (!cfg) return;
    const state = {
      root,
      cfg,
      generation: 0,
      type: 'all',
      query: '',
      days: cfg.days,
      shown: cfg.page,
      expanded: new Set(),
      loaded: false,
      sources: cfg.sources.map(def => ({ def, rows: [], ids: new Set(), offset: 0, total: null, more: false, status: 'idle', error: '' }))
    };
    states.set(root, state);
    root.setAttribute('data-us-activity-ready', '');
    build(state);
    render(state);

    // Load on first sight: a hidden tab or sub-tab makes no requests.
    state.observer = new IntersectionObserver(entries => {
      if (state.loaded || !entries.some(entry => entry.isIntersecting)) return;
      state.loaded = true;
      state.observer.disconnect();
      reload(state);
    });
    state.observer.observe(root);

    state.resizeObserver = new ResizeObserver(() => {
      fitFilters(state);
      syncIndicator(state);
    });
    state.resizeObserver.observe(root);
    state.resizeObserver.observe(state.types);
    fitFilters(state);

    state.types.addEventListener('click', event => {
      const button = event.target.closest('button[data-us-tab]');
      if (!button || button.dataset.usTab === state.type) return;
      state.type = button.dataset.usTab;
      state.shown = state.cfg.page;
      render(state);
      fill(state);
    });

    let searchTimer = 0;
    state.input.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.query = state.input.value.trim();
        state.shown = state.cfg.page;
        render(state);
        if (!state.query) fill(state);
      }, 150);
    });

    state.range.addEventListener('change', () => {
      const days = Number(state.range.value);
      if (state.loaded) changeRange(state, days);
      else state.days = days;
    });

    state.filterToggle?.addEventListener('click', () => {
      setFiltersOpen(state, state.filterToggle.getAttribute('aria-expanded') !== 'true');
    });

    root.addEventListener('click', event => {
      if (event.target.closest('.us-activity__retry')) {
        retry(state);
        return;
      }
      if (event.target.closest('.us-activity__more')) {
        state.shown += state.cfg.page;
        render(state);
        fill(state);
        return;
      }
      // US-RECORD-CARDS expands cards (its handler is on the document, so this
      // runs first); the feed notes which are open so re-renders keep them.
      const record = event.target.closest('.us-record');
      const onToggle = event.target.closest('.us-record__toggle') ||
        (event.target.closest('.us-record__head') && !event.target.closest('a, button, input, select, textarea'));
      if (!record || !onToggle || !state.body.contains(record)) return;
      const id = record.dataset.usActivityId;
      if (record.querySelector('.us-record__toggle').getAttribute('aria-expanded') === 'true') state.expanded.delete(id);
      else state.expanded.add(id);
    });
  }

  function refresh() {
    queued = false;
    states.forEach((state, root) => {
      if (root.isConnected) return;
      state.generation += 1;
      state.observer?.disconnect();
      // The filter button lives in the heading, outside the feed element.
      state.resizeObserver?.disconnect();
      state.filterToggle?.closest('.us-activity__utilities')?.remove();
      states.delete(root);
    });
    document.querySelectorAll(SELECTOR).forEach(attach);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  // Partial updates and delayed tabs can add or replace feed hosts. The
  // feed's own rendering happens inside attached roots and is ignored.
  new MutationObserver(records => {
    const changed = records.some(record => !record.target.closest?.('[data-us-activity-ready]') &&
      [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1));
    if (changed) schedule();
  }).observe(document.documentElement, { subtree: true, childList: true });

  window.UnionSuiteActivityFeed = {
    refresh,
    reload(root) {
      const targets = root && states.has(root) ? [states.get(root)] : [...states.values()];
      targets.filter(state => state.loaded).forEach(reload);
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
/* US-ACTIVITY-FEED:END */


/* US-BANNER-POSITIONS:START — the contact's active positions as one banner badge.
   Author placeholder inside .us-banner__status, after the status badge (a
   Query Template banner):
     <div class="us-banner__positions" hidden
       data-us-positions-query="$/…/Contact_Page/Active Positions"
       data-us-positions-filter="ID" data-us-positions-value="{#query.ID}"
       data-us-positions-tab="Engagement"
       data-us-positions-section="engagement:roles"></div>
   One IQA of the contact's active positions, most senior first (sorted by a
   rank the IQA owns). Output aliases: PositionKey (unique), Role (full
   title), Label (short badge text; Role when blank), Body, Since (display
   text), optional TermEnds (display text).
   The badge names the most senior position and counts the rest ("Branch
   committee +1"); it stays hidden when there are none or the query fails.
   Clicking it opens a popup listing every active position. Its footer link
   selects the named CCO tab, then the section switcher's group:key.
   One request per page load (limit 20). Uses GET /api/query. */
(function () {
  'use strict';

  if (window.UnionSuiteBannerPositions) {
    window.UnionSuiteBannerPositions.refresh();
    return;
  }

  const SELECTOR = '.us-banner__positions[data-us-positions-query]';
  const LIMIT = 20;
  const states = new Map();
  let panelId = 0;
  let queued = false;

  // Tabler "id-badge-2" and "chevron-down" outlines (MIT), drawn with currentColor.
  const ICON = '<svg class="us-banner__positions-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M7 12h3v4h-3z"></path>' +
    '<path d="M10 6h-6a1 1 0 0 0 -1 1v12a1 1 0 0 0 1 1h16a1 1 0 0 0 1 -1v-12a1 1 0 0 0 -1 -1h-6"></path>' +
    '<path d="M10 4a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v3a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z"></path>' +
    '<path d="M14 16h2"></path><path d="M14 12h4"></path></svg>';
  const CHEVRON = '<svg class="us-banner__positions-chevron" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    '<path d="M6 9l6 6l6 -6"></path></svg>';

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(value).trim();

  // Rows arrive either as alias-keyed objects or as Name/Value property lists.
  function field(row, name) {
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(item => String(item.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function apiRoot() {
    if (!window.gWebRoot) return '/api/';
    const root = new URL(String(window.gWebRoot), window.location.origin);
    return root.pathname.replace(/\/+$/, '') + '/api/';
  }

  function config(root) {
    const query = text(root.dataset.usPositionsQuery);
    const filter = text(root.dataset.usPositionsFilter);
    const value = text(root.dataset.usPositionsValue);
    // Unsubstituted template placeholders mean the banner has no record yet.
    if (!/^\$\/.+/.test(query) || !filter || !value || /^[\[{]/.test(value)) return null;
    const [group, section] = text(root.dataset.usPositionsSection).split(':');
    return { query, filter, value, tab: text(root.dataset.usPositionsTab), group, section };
  }

  async function request(cfg) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
      const params = new URLSearchParams({ QueryName: cfg.query, limit: String(LIMIT), offset: '0' });
      params.set(cfg.filter, cfg.value);
      const response = await fetch(apiRoot() + 'query?' + params, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        signal: controller.signal,
        headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
      });
      if (!response.ok) throw Error('HTTP ' + response.status);
      const data = await response.json();
      const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
      if (!Array.isArray(rows)) throw Error('Unexpected response');
      return rows;
    } finally {
      clearTimeout(timer);
    }
  }

  function position(row) {
    const role = text(field(row, 'Role'));
    return {
      role,
      label: text(field(row, 'Label')) || role,
      body: text(field(row, 'Body')),
      since: text(field(row, 'Since')),
      termEnds: text(field(row, 'TermEnds'))
    };
  }

  function item(entry) {
    const li = document.createElement('li');
    li.className = 'us-banner__positions-item';
    const role = document.createElement('strong');
    role.textContent = entry.role;
    li.append(role);
    if (entry.body) {
      const body = document.createElement('span');
      body.textContent = entry.body;
      li.append(body);
    }
    const dates = [entry.since && 'Since ' + entry.since, entry.termEnds && 'term ends ' + entry.termEnds].filter(Boolean);
    if (dates.length) {
      const when = document.createElement('small');
      when.textContent = dates.join(' · ');
      li.append(when);
    }
    return li;
  }

  function render(state, entries) {
    const { root, button, label, more, total, list } = state;
    root.hidden = entries.length === 0;
    root.setAttribute('data-us-positions-state', entries.length ? 'ready' : 'empty');
    if (!entries.length) return open(state, false);

    const others = entries.length - 1;
    label.textContent = entries[0].label;
    more.textContent = '+' + others;
    more.hidden = others === 0;
    total.textContent = String(entries.length);
    const summary = 'Active positions: ' + entries.map(entry => entry.role).join(', ');
    button.setAttribute('aria-label', summary);
    button.title = summary;
    list.replaceChildren(...entries.map(item));
  }

  async function load(state) {
    try {
      render(state, (await request(state.cfg)).map(position).filter(entry => entry.role));
    } catch (error) {
      // A badge that cannot load says nothing; the roles grid still has them.
      state.root.hidden = true;
      state.root.setAttribute('data-us-positions-state', 'error');
    }
  }

  function open(state, show) {
    state.panel.hidden = !show;
    state.button.setAttribute('aria-expanded', String(show));
    if (show) state.panel.focus();
  }

  function goToSection(state) {
    const { tab, group, section } = state.cfg;
    const target = Array.from(document.querySelectorAll('.RadTabStripVertical .rtsLink, .RadTabStrip .rtsLink'))
      .find(link => text(link.querySelector('.rtsTxt')?.textContent || link.textContent) === tab);
    open(state, false);
    target?.click();
    if (group && section) window.UnionSuiteSections?.select(group, section);
  }

  function attach(root, cfg) {
    const id = 'us-banner-positions-' + (++panelId);
    root.replaceChildren();
    root.hidden = true;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-banner__positions-toggle';
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-controls', id);
    button.innerHTML = ICON;
    const label = document.createElement('span');
    label.className = 'us-banner__positions-label';
    const more = document.createElement('span');
    more.className = 'us-banner__positions-more';
    more.setAttribute('aria-hidden', 'true');
    // Every position's count, shown instead of the label and "+N" where the
    // condensed banner has no room for them (phones).
    const total = document.createElement('span');
    total.className = 'us-banner__positions-total';
    total.setAttribute('aria-hidden', 'true');
    button.append(label, more, total);
    button.insertAdjacentHTML('beforeend', CHEVRON);

    const panel = document.createElement('div');
    panel.className = 'us-banner__positions-panel';
    panel.id = id;
    panel.hidden = true;
    panel.tabIndex = -1;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Active positions');
    const head = document.createElement('div');
    head.className = 'us-banner__positions-head';
    head.textContent = 'Active positions';
    const list = document.createElement('ul');
    list.className = 'us-banner__positions-list';
    panel.append(head, list);
    if (cfg.tab) {
      const foot = document.createElement('div');
      foot.className = 'us-banner__positions-foot';
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'us-banner__positions-all';
      link.textContent = 'View all roles →';
      foot.append(link);
      panel.append(foot);
    }
    root.append(button, panel);

    const state = { root, cfg, button, label, more, total, panel, list };
    states.set(root, state);
    load(state);
  }

  function update() {
    queued = false;
    states.forEach((state, root) => {
      if (!root.isConnected || !root.contains(state.button)) states.delete(root);
    });
    document.querySelectorAll(SELECTOR).forEach(root => {
      if (states.has(root) || root.closest('.us-report-no-styling')) return;
      const cfg = config(root);
      if (!cfg) {
        root.hidden = true;
        root.setAttribute('data-us-positions-state', 'unconfigured');
        return;
      }
      attach(root, cfg);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(update);
  }

  document.addEventListener('click', event => {
    states.forEach(state => {
      if (event.target.closest('.us-banner__positions-toggle') === state.button) {
        open(state, state.panel.hidden);
      } else if (state.panel.contains(event.target) && event.target.closest('.us-banner__positions-all')) {
        goToSection(state);
      } else if (!state.root.contains(event.target) && !state.panel.hidden) {
        open(state, false);
      }
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    states.forEach(state => {
      if (!state.panel.hidden) {
        open(state, false);
        state.button.focus();
      }
    });
  });

  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.us-banner__positions'))) schedule();
  }).observe(document.documentElement, { subtree: true, childList: true });

  window.UnionSuiteBannerPositions = {
    refresh: schedule,
    // Re-reads every badge's positions, e.g. after a role is added or ended.
    reload() {
      states.forEach(state => load(state));
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', update);
  else update();
})();
/* US-BANNER-POSITIONS:END */

/* US-ACTIVITY-EVENTS:START — an activity's attempt history, such as a sent
   email send's delivery attempts (item 37, proposed; design only, not promoted).
   Opt in per source on the activity feed host: data-events names a third IQA
   (beside data-query and data-details), and data-events-label its heading
   (default "History"):
     <li data-source="emails-out" data-query="Outbound Emails"
         data-details="Outbound Emails Details"
         data-events="Outbound Emails History"
         data-events-label="Delivery history" …></li>
   The history IQA is run for one record when its card opens, beside the
   details IQA, filtered on the feed's record filter and ActivityKey, and
   returns one row per attempt, oldest first (at most 50):
     required  EventDate (a date/time column), Event ("Queued", "Delivered")
     optional  EventDetail (a short note, such as a bounce reason),
               EventTone (success|warning|danger)
   It shows between the details fields and the note as a small dated list,
   dots joined by a line. Loading and Retry work as the details do; no rows
   show nothing. Loaded once per record and kept while the page is open. Each
   send is its own card, dated by its own core ActivityDate: a resend is a
   second source on the same type (Category Resend), and the original's
   history IQA leaves the resend out. */
(function () {
  'use strict';

  if (window.UnionSuiteActivityEvents) return;

  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const TONES = ['success', 'warning', 'danger'];
  const loaded = new Map();

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(unwrap(value)).trim();

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function field(row, name) {
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  // The card's feed, its source definition and its record key.
  function context(record) {
    const feed = record.closest('.us-activity-feed');
    const [sourceKey, ...rest] = (record.dataset.usActivityId || '').split(':');
    const source = feed?.querySelector(`.us-activity__sources > li[data-source="${CSS.escape(sourceKey)}"]`);
    const query = text(source?.dataset.events);
    if (!feed || !query || !rest.length) return null;
    return {
      feed,
      id: record.dataset.usActivityId,
      key: rest.join(':'),
      query,
      label: text(source.dataset.eventsLabel) || 'History'
    };
  }

  // "10 Sep, 1:00 pm"; the time is left out at midnight, and the year only
  // shows outside the feed's current year.
  function when(value, feed) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!match) return text(value);
    const [, year, month, day, hour = '00', minute = '00'] = match;
    const today = text(feed.dataset.usActivityToday) || new Date().toISOString().slice(0, 10);
    let label = Number(day) + ' ' + MONTHS[Number(month) - 1] + (year === today.slice(0, 4) ? '' : ' ' + year);
    if (hour !== '00' || minute !== '00') {
      const h = Number(hour);
      label += ', ' + (h % 12 || 12) + ':' + minute + ' ' + (h < 12 ? 'am' : 'pm');
    }
    return label;
  }

  async function request(ctx) {
    const { feed } = ctx;
    // The history IQA has a fixed column contract, so it stays with the core
    // IQAs, not in the client-editable details folder.
    const folder = text(feed.dataset.usActivityFolder).replace(/\/+$/, '');
    const params = new URLSearchParams({ QueryName: folder + '/' + ctx.query, limit: '50', offset: '0' });
    params.set(text(feed.dataset.usActivityFilter) || 'ID', text(feed.dataset.usActivityValue));
    params.set('ActivityKey', ctx.key);
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const data = await response.json();
    const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
    if (!Array.isArray(rows)) throw Error('Unexpected response');
    return rows.map(row => ({
      date: field(row, 'EventDate'),
      event: text(field(row, 'Event')),
      detail: text(field(row, 'EventDetail')),
      tone: TONES.includes(text(field(row, 'EventTone')).toLowerCase()) ? text(field(row, 'EventTone')).toLowerCase() : ''
    })).filter(row => row.event);
  }

  function fill(block, ctx) {
    const entry = loaded.get(ctx.id);
    block.replaceChildren();
    if (entry.status === 'loading') {
      const status = el('p', 'us-record__extra-status', 'Loading ' + ctx.label.toLowerCase() + '…');
      status.setAttribute('role', 'status');
      block.append(status);
    } else if (entry.status === 'failed') {
      const status = el('p', 'us-record__extra-status', ctx.label + ' could not be loaded. ');
      status.setAttribute('role', 'status');
      const again = el('button', 'TextButton SmallButton us-record__events-retry', 'Retry');
      again.type = 'button';
      status.append(again);
      block.append(status);
    } else if (entry.rows.length) {
      const list = el('ol', 'us-record__events-list');
      entry.rows.forEach(row => {
        const item = el('li', 'us-record__event');
        if (row.tone) item.dataset.usEventTone = row.tone;
        item.append(el('span', 'us-record__event-date', when(row.date, ctx.feed)), el('span', 'us-record__event-name', row.event));
        if (row.detail) item.append(el('span', 'us-record__event-detail', row.detail));
        list.append(item);
      });
      block.append(el('p', 'us-record__note-label', ctx.label), list);
    }
    block.hidden = !block.childElementCount;
  }

  // Every open card of this record gets the block (the feed can redraw a
  // card while its details are open).
  function paint(ctx) {
    ctx.feed.querySelectorAll(`.us-record[data-us-activity-id="${CSS.escape(ctx.id)}"]`).forEach(record => {
      const block = record.querySelector('.us-record__events');
      if (block) fill(block, ctx);
    });
  }

  function load(ctx) {
    const current = loaded.get(ctx.id);
    if (current && current.status !== 'failed') return;
    const entry = { status: 'loading', rows: [] };
    loaded.set(ctx.id, entry);
    paint(ctx);
    request(ctx).then(rows => {
      entry.status = 'ready';
      entry.rows = rows;
    }, error => {
      entry.status = 'failed';
      console.warn('[US-ACTIVITY-EVENTS] History did not load:', ctx.query, ctx.key, error);
    }).then(() => {
      if (loaded.get(ctx.id) === entry) paint(ctx);
    });
  }

  // Adds the block after the details fields, so the card's fold measures it.
  function attach(record) {
    const ctx = context(record);
    const detail = record.querySelector('.us-record__detail');
    if (!ctx || !detail || detail.querySelector('.us-record__events')) return ctx;
    const block = el('div', 'us-record__events');
    block.hidden = true;
    const extra = detail.querySelector('.us-record__extra');
    detail.insertBefore(block, extra ? extra.nextSibling : detail.firstChild);
    if (loaded.has(ctx.id)) fill(block, ctx);
    return ctx;
  }

  // Capture phase: before the card opens, so the loading line is part of
  // the height it folds open to.
  document.addEventListener('click', event => {
    const record = event.target.closest('.us-activity-feed .us-record');
    if (!record) return;
    if (event.target.closest('.us-record__events-retry')) {
      const ctx = context(record);
      if (ctx) load(ctx);
      return;
    }
    const onToggle = event.target.closest('.us-record__toggle') ||
      (event.target.closest('.us-record__head') && !event.target.closest('a, button, input, select, textarea'));
    if (!onToggle || record.querySelector('.us-record__toggle')?.getAttribute('aria-expanded') === 'true') return;
    const ctx = attach(record);
    if (ctx) load(ctx);
  }, true);

  // Cards redrawn already open (a reload, a range change) get their block.
  new MutationObserver(() => {
    document.querySelectorAll('.us-activity-feed .us-record.is-expanded').forEach(attach);
  }).observe(document.documentElement, { subtree: true, childList: true });

  window.UnionSuiteActivityEvents = { version: '0.1' };
})();
/* US-ACTIVITY-EVENTS:END */
