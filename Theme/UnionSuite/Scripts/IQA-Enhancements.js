/* =============================================================================
 * IQA Enhancements — combined script
 * -----------------------------------------------------------------------------
 * One file for the iMIS Intelligent Query Architect Design page
 * (.../iMIS/QueryBuilder/Design.aspx). Delivered via the shared CDN inject
 * (jQuery present on the page, but this script itself is dependency-free).
 *
 * ENHANCE MODE
 *   A toggle pill before the Save button group turns all *gated* modules on/off, live,
 *   with no page reload — state persisted in localStorage['iqaEnhanceMode']
 *   (default: on). Gated modules restore the stock editor on teardown.
 *
 *   ALWAYS ON (independent of the toggle):
 *     • QuickAdd  — injected "Union Template" Business Object quick-add panel
 *
 *   GATED (behind the toggle):
 *     • OverhaulCss         — editor layout/width/colour CSS (body.iqa-enhanced)
 *     • BoSearch            — searchable Business Object input on the source panel
 *     • SqlTools            — copy SQL and copy-expression buttons
 *     • FilterSortDropdowns — type-to-filter dropdowns on Filters & Sort selects
 *     • UncheckAll          — "uncheck all" checkbox in the Display grid header
 *     • FilterAutocomplete  — per-property value history on filter value inputs
 *     • DragSort            — Display options toolbar + drag ordering (on by default)
 *     • FilterWorkspace     — compact Filters layout + staged within-group reorder
 *     • SourceWorkspace     — staged business-object reorder with one final refresh
 *     • Branchify           — adds i4u_UT_EntityAccess and its "@LoggedInUser"
 *                             filter in the background; the Branchify tab in the
 *                             relationship editor joins it
 *     • TemplateHtml        — Template tab HTML view: highlighting, formatting,
 *                             tag pairing and {#query.…} field suggestions, from
 *                             the shared Scripts/HtmlSourceEditor.js
 *
 * The editor is an ASP.NET WebForms page (constant partial postbacks); the
 * shell re-runs every module on PageRequestManager endRequest, and each mount
 * is idempotent and self-gating (finds its own target, or no-ops).
 * ========================================================================== */
(function () {
  'use strict';

  /* ---- run only on the IQA Design page ---------------------------------- */
  if (!/\/QueryBuilder\/Design\.aspx$/i.test(location.pathname)) return;

  /* ===========================================================================
   * State
   * ======================================================================== */
  const MODE_KEY = 'iqaEnhanceMode';
  const getMode = () => localStorage.getItem(MODE_KEY) !== 'off';      // default on
  const setMode = (on) => localStorage.setItem(MODE_KEY, on ? 'on' : 'off');
  const safe = (fn) => { try { fn(); } catch (e) { console.error('[IQA-Enh]', e); } };

  /* ===========================================================================
   * Shared helpers
   * ======================================================================== */
  const token = () =>
    (document.getElementById('__RequestVerificationToken')
      || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';

  function runQuery(queryName, params) {
    let url = location.origin + '/api/query?QueryName=' + encodeURIComponent(queryName);
    if (params) for (const k in params) url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
    return fetch(url, {
      method: 'GET', credentials: 'same-origin',
      headers: { 'RequestVerificationToken': token(), 'Accept': 'application/json' }
    }).then(r => { if (!r.ok) throw new Error('query HTTP ' + r.status); return r.json(); });
  }

  function readRow(item) {
    if (!item) return null;
    let name = item.DocumentName, key = item.DocumentVersionKey,
        desc = (item.Description != null) ? item.Description : item.DocumentDescription;
    if (key == null && item.Properties?.$values) {
      const props = item.Properties.$values;
      const pick = n => { const p = props.find(x => x.Name === n); const v = p && p.Value; return (v && typeof v === 'object') ? v.$value : v; };
      name = pick('DocumentName'); key = pick('DocumentVersionKey'); desc = pick('Description') || pick('DocumentDescription');
    }
    if (!key) return null;
    return { name: name || '(unnamed)', key, desc: String(desc == null ? '' : desc).replace(/\s+/g, ' ').trim() };
  }
  const rowsFrom = (data) => {
    const items = data?.Items?.$values ?? (Array.isArray(data?.Items) ? data.Items : []);
    return items.map(readRow).filter(Boolean);
  };

  function addSource(key) {
    if (typeof window.AddQuickSource === 'function') { window.AddQuickSource(key); return; }
    const sk = document.getElementById('SelectedKeys');
    if (sk && typeof window.submitForm === 'function') { sk.value = key; window.submitForm(sk); }
  }

  async function copyText(text) {
    try { if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove(); return ok;
  }

  // The theme's own copy button (zUnionSuite.js US-COPY), whenever the theme
  // is loaded: its copy icon turns into the success tick with "Copied", the
  // target flashes in the accent, and the copy is announced. US-COPY copies a
  // field's value; for other elements this passes the visible text (keeping
  // line breaks) as the click starts. Null without the theme.
  let copyTargets = 0;
  function themeCopyButton(target, label) {
    if (!window.UnionSuiteCopy || !target) return null;
    if (!target.id) { target.id = 'iqaCopyTarget' + (++copyTargets); target.dataset.iqaCopyId = ''; }
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'us-copy'; button.dataset.iqaCopy = '';
    button.dataset.usCopyTarget = target.id; button.title = label; button.setAttribute('aria-label', label);
    if (!target.matches('input, textarea')) button.addEventListener('click', () => { button.dataset.usCopyText = target.innerText; }, true);
    return button;
  }
  function removeThemeCopyButtons() {
    document.querySelectorAll('button.us-copy[data-iqa-copy]').forEach(button => button.remove());
    document.querySelectorAll('[data-iqa-copy-id]').forEach(target => { target.removeAttribute('id'); delete target.dataset.iqaCopyId; });
  }
  const TICK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>';

  const elFromHTML = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  const injectStyle = (id, css) => { if (document.getElementById(id)) return; const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s); };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const COPY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
  const GRIP_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="5" r="1.6"></circle><circle cx="9" cy="12" r="1.6"></circle><circle cx="9" cy="19" r="1.6"></circle><circle cx="15" cy="5" r="1.6"></circle><circle cx="15" cy="12" r="1.6"></circle><circle cx="15" cy="19" r="1.6"></circle></svg>`;
  // A copy button's label reserves the width of every message it can show, so
  // swapping in "Copied" or "Copy failed" never resizes the button.
  const copyLabel = (text) => '<span class="iqa-header-copy-label">'
    + '<span class="iqa-header-copy-text">' + escapeHtml(text) + '</span>'
    + [text, 'Copied', 'Copy failed'].map(value => '<span aria-hidden="true">' + escapeHtml(value) + '</span>').join('')
    + '</span>';


  /* ===========================================================================
   * Busy presentation
   * ---------------------------------------------------------------------------
   * zUnionSuite.js owns this whenever it is loaded. Without it the same theme
   * classes are driven from here, so zUnionSuite.css still supplies every
   * spinner's appearance and no spinner styling is duplicated in this file.
   * ======================================================================== */
  const BUSY_CSS =
      '.iqa-busy-button{position:relative;}'
    // The theme hides a busy button's children; the spinner must stay visible.
    + '.iqa-busy-button > .iqa-busy-spinner{position:absolute;inset-inline-start:50%;top:50%;margin:-8px 0 0 -8px;visibility:visible!important;}';

  const Busy = {
    button(target) {
      // UnionSuiteBusy positions its spinner in document.body. A modal dialog
      // paints in the top layer, above everything in the document, so a button
      // inside one keeps the spinner within itself instead.
      if (window.UnionSuiteBusy && !target.closest('dialog')) return window.UnionSuiteBusy.show(target, { mode: 'center' });
      injectStyle('iqaBusyCss', BUSY_CSS);
      if (target.querySelector('.iqa-busy-spinner')) return { clear() {} };
      const spinner = elFromHTML('<span class="us-button-spinner iqa-busy-spinner" aria-hidden="true"></span>');
      spinner.style.color = getComputedStyle(target).color;
      const label = target.getAttribute('aria-label');
      if (label === null) target.setAttribute('aria-label', target.textContent.trim());
      target.classList.add('iqa-busy-button', 'us-busy-hide-label');
      target.setAttribute('aria-busy', 'true');
      target.append(spinner);
      return { clear() {
        spinner.remove();
        target.classList.remove('iqa-busy-button', 'us-busy-hide-label');
        target.removeAttribute('aria-busy');
        if (label === null) target.removeAttribute('aria-label');
      } };
    },
    // Let the browser paint the busy state before synchronous work blocks it.
    async run(target, work) {
      const handle = Busy.button(target);
      try {
        await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        return work();
      } finally { handle.clear(); }
    }
  };

  /* Tab switching. The native tabs post back, and the theme already reserves
     room beside each label so showing the indicator cannot shift the strip. */
  const TabBusy = {
    _selector: '.RadTabStrip .rtsLink[role="tab"],.RadTabStripVertical .rtsLink[role="tab"]',
    _pending: null, _active: null, _timer: 0, _watching: false,
    _owned: () => !window.UnionSuiteTabBusy,
    watch() {
      if (!TabBusy._owned()) { window.UnionSuiteTabBusy.refresh?.(); return; }
      if (TabBusy._watching) return;
      TabBusy._watching = true;
      document.addEventListener('click', event => {
        const tab = event.target.closest?.(TabBusy._selector);
        TabBusy._pending = tab && !tab.closest('.us-report-no-styling,[aria-disabled="true"],.rtsDisabled') ? tab : null;
      }, true);
    },
    begin() {
      if (!TabBusy._owned()) return;
      const tab = TabBusy._pending; TabBusy._pending = null;
      TabBusy.clear();
      if (!tab?.isConnected) return;
      // A short request should not flash an indicator.
      TabBusy._timer = setTimeout(() => {
        if (!tab.isConnected) return;
        const spinner = elFromHTML('<span class="us-tab-loading-spinner" aria-hidden="true"></span>');
        tab.setAttribute('data-us-tab-loading', ''); tab.setAttribute('aria-busy', 'true');
        tab.append(spinner);
        TabBusy._active = { tab, spinner };
      }, 150);
    },
    clear() {
      if (!TabBusy._owned()) return;
      clearTimeout(TabBusy._timer);
      const state = TabBusy._active; TabBusy._active = null;
      if (!state) return;
      state.spinner.remove();
      state.tab.removeAttribute('data-us-tab-loading');
      state.tab.removeAttribute('aria-busy');
    }
  };

  /* ===========================================================================
   * Pointer reordering for the reorder dialogs
   * ---------------------------------------------------------------------------
   * Matches the taskbar command palette: the held item follows the pointer, an
   * empty dashed slot marks where it will land, and the items it displaces
   * slide into place. An item stays in the list it started in, so the filter
   * dialog cannot move a filter between groups.
   *
   * HTML5 drag and drop cannot do this: its drag image is a static bitmap taken
   * at dragstart, and the source element cannot be restyled mid-drag.
   * ======================================================================== */
  function createPointerReorder({ surface, scroller, items, blocked, onDrop, classes }) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const slides = new Map();
    let active = null;

    const stopSlides = () => { slides.forEach(animation => animation.cancel()); slides.clear(); };
    const tops = list => new Map(list.map(item => [item, item.getBoundingClientRect().top]));

    // FLIP: each displaced item animates from where it just was.
    function slide(list, previousTops) {
      if (reducedMotion.matches) return;
      for (const node of list) {
        const previousTop = previousTops.get(node);
        if (previousTop === undefined) continue;
        const distance = previousTop - node.getBoundingClientRect().top;
        if (!Number.isFinite(distance) || Math.abs(distance) < 0.5) continue;
        const animation = node.animate(
          [{ transform: 'translateY(' + distance + 'px)' }, { transform: 'translateY(0)' }],
          { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
        slides.set(node, animation);
        animation.onfinish = () => { if (slides.get(node) === animation) slides.delete(node); };
      }
    }

    const middle = (item) => {
      const box = item.getBoundingClientRect();
      // Hit-test settled positions so a sliding item cannot move the target.
      const transform = getComputedStyle(item).transform;
      const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
      return box.top - shift + box.height / 2;
    };

    function start(event, handle, item, list) {
      if (event.button !== 0 || !event.isPrimary || active || blocked()) return;
      event.preventDefault();
      handle.focus({ preventScroll: true });

      const box = item.getBoundingClientRect();
      const offset = { x: event.clientX - box.left, y: event.clientY - box.top };
      const others = () => items(list).filter(node => node !== item);

      const placeholder = document.createElement('li');
      placeholder.className = classes.placeholder;
      placeholder.setAttribute('role', 'presentation');
      placeholder.style.height = box.height + 'px';
      item.before(placeholder);

      // The dialog is in the top layer, so the floating copy has to live inside
      // it. Ids and names are dropped and it is inert, so nothing is duplicated.
      const floating = item.cloneNode(true);
      floating.className = (item.className + ' ' + classes.floating).trim();
      floating.setAttribute('aria-hidden', 'true');
      floating.inert = true;
      floating.style.width = box.width + 'px';
      floating.style.height = box.height + 'px';
      floating.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
      floating.querySelectorAll('[name]').forEach(node => node.removeAttribute('name'));
      surface.appendChild(floating);
      surface.classList.add('iqa-is-sorting');
      item.classList.add(classes.dragging);

      let point = { x: event.clientX, y: event.clientY };
      let frame = 0;
      let finished = false;

      function position() {
        floating.style.left = (point.x - offset.x) + 'px';
        floating.style.top = (point.y - offset.y) + 'px';
        const rows = others();
        const next = rows.find(node => point.y < middle(node));
        const targetIndex = next ? rows.indexOf(next) : rows.length;
        const currentIndex = rows.filter(node =>
          node.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
        if (targetIndex === currentIndex) return;
        const previousTops = tops(rows);
        stopSlides();
        if (next) list.insertBefore(placeholder, next);
        else if (rows.length) rows[rows.length - 1].after(placeholder);
        slide(rows, previousTops);
      }

      // Keep scrolling while the pointer rests against an edge of the list.
      function tick() {
        const bounds = scroller.getBoundingClientRect();
        if (point.y >= bounds.top && point.y <= bounds.bottom) {
          const speed = point.y < bounds.top + 38 ? -7 : point.y > bounds.bottom - 38 ? 7 : 0;
          if (speed) scroller.scrollTop += speed;
        }
        position();
        frame = requestAnimationFrame(tick);
      }

      function finish(commit) {
        if (finished) return;
        finished = true;
        active = null;
        cancelAnimationFrame(frame);
        const previousTops = tops(others());
        stopSlides();
        surface.removeEventListener('pointermove', move);
        surface.removeEventListener('pointerup', release);
        surface.removeEventListener('pointercancel', cancel);
        surface.removeEventListener('lostpointercapture', cancel);
        surface.removeEventListener('keydown', key, true);
        window.removeEventListener('blur', cancel);
        if (surface.hasPointerCapture(event.pointerId)) surface.releasePointerCapture(event.pointerId);
        const landed = commit && !blocked() && placeholder.parentNode === list;
        if (landed) list.insertBefore(item, placeholder);
        placeholder.remove();
        floating.remove();
        item.classList.remove(classes.dragging);
        surface.classList.remove('iqa-is-sorting');
        slide(others(), previousTops);
        handle.focus({ preventScroll: true });
        if (landed) onDrop();
      }

      function move(moveEvent) {
        if (moveEvent.pointerId !== event.pointerId) return;
        moveEvent.preventDefault();
        point = { x: moveEvent.clientX, y: moveEvent.clientY };
        position();
      }
      function release(upEvent) {
        if (upEvent.pointerId !== event.pointerId) return;
        // Releasing away from the list abandons the move, as the palette does.
        const bounds = list.getBoundingClientRect();
        finish(upEvent.clientX >= bounds.left && upEvent.clientX <= bounds.right &&
          upEvent.clientY >= bounds.top && upEvent.clientY <= bounds.bottom);
      }
      function cancel() { finish(false); }
      // Escape cancels the move; the dialog must not close underneath it.
      function key(keyEvent) {
        if (keyEvent.key !== 'Escape') return;
        keyEvent.preventDefault(); keyEvent.stopPropagation(); cancel();
      }

      active = { cancel };
      surface.addEventListener('pointermove', move);
      surface.addEventListener('pointerup', release);
      surface.addEventListener('pointercancel', cancel);
      surface.addEventListener('lostpointercapture', cancel);
      surface.addEventListener('keydown', key, true);
      window.addEventListener('blur', cancel);
      surface.setPointerCapture(event.pointerId);
      frame = requestAnimationFrame(tick);
    }

    return {
      attach(handle, item, list) {
        handle.draggable = false;
        handle.addEventListener('pointerdown', event => start(event, handle, item, list));
        handle.addEventListener('dragstart', event => event.preventDefault());
      },
      cancel() { active?.cancel(); }
    };
  }

  /* ===========================================================================
   * QuickSource config + shared plumbing (QuickAdd + BoSearch)
   * ======================================================================== */
  const LIST_QUERY      = '$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object List';
  const SECTION_QUERY   = '$/_i4u_/Core/Admin/IQA Builder - Quick Add Business Object Section';
  const SEARCH_PARAM    = 'DocumentName';
  const SECTION_TITLE   = 'Union Template';
  const SECTION_CACHE   = 'iqaBoSearch:section';
  const SECTION_TTL     = 10 * 60 * 1000;
  const MIN_CHARS = 3, MAX_RESULTS = 10, DEBOUNCE_MS = 250;

  function panelBody() {
    const panel = document.querySelector('.QueryQuickSources');
    if (!panel) return null;
    return panel.querySelector('[id$="AddSourcePanel_Body"]') || panel.querySelector('.panel-body');
  }

  function loadSection() {
    try {
      const raw = sessionStorage.getItem(SECTION_CACHE);
      if (raw) { const obj = JSON.parse(raw); if (obj && (Date.now() - obj.t) <= SECTION_TTL) return Promise.resolve(obj.rows); }
    } catch (_) {}
    return runQuery(SECTION_QUERY, null).then(data => {
      const rows = rowsFrom(data);
      try { sessionStorage.setItem(SECTION_CACHE, JSON.stringify({ t: Date.now(), rows })); } catch (_) {}
      return rows;
    });
  }

  function buildQuickAddItem(o) {
    const media = document.createElement('div');
    media.className = 'media iqa-quickadd__media';
    const left = document.createElement('div'); left.className = 'media-left';
    const iconA = document.createElement('a'); iconA.href = 'javascript:void(0)';
    iconA.innerHTML = '<img src="../../assets/images/icons/QuerySources/icon_qs_bo.png" alt="" />';
    left.appendChild(iconA);
    const bodyD = document.createElement('div'); bodyD.className = 'media-body';
    const nameA = document.createElement('a'); nameA.href = 'javascript:void(0)';
    nameA.innerHTML = '<span>' + escapeHtml(o.name) + '</span>';
    bodyD.appendChild(nameA);
    if (o.desc) { const d = document.createElement('div'); d.className = 'iqa-quickadd__desc'; d.textContent = o.desc; bodyD.appendChild(d); }
    media.appendChild(left); media.appendChild(bodyD);
    const go = e => { if (e) e.preventDefault(); addSource(o.key); };
    iconA.addEventListener('click', go); nameA.addEventListener('click', go);
    return media;
  }

  /* ===========================================================================
   * Module: QuickAdd  (ALWAYS ON)
   * ======================================================================== */
  const QuickAdd = {
    mount() {
      const body = panelBody(); if (!body) return;
      injectStyle('iqaQuickAddCss', QUICKADD_CSS);
      const firstPanel = body.querySelector('.panel.panel-border');
      const wrapper = firstPanel ? firstPanel.parentNode : null;
      if (!wrapper) return;

      const native = this._findSection(wrapper, SECTION_TITLE);
      if (native) {
        if (native.dataset.iqaProcessed) return;
        native.dataset.iqaProcessed = '1';
        this._collapseAll(wrapper);
        wrapper.insertBefore(native, wrapper.firstChild);
        this._expand(native);
        this._mergeIntoNative(native);
        return;
      }
      if (document.getElementById('iqaQuickAddPanel')) return;
      this._collapseAll(wrapper);

      const panel = document.createElement('div');
      panel.className = 'panel panel-border Section NeutralShading p-0 iqa-quickadd';
      panel.innerHTML =
        '<a class="panel-heading Distinguish d-block" href="#iqaQuickAddPanel" data-toggle="collapse" aria-expanded="true">' +
          '<h4 class="pull-left">' + escapeHtml(SECTION_TITLE) + '</h4>' +
          '<span class="panel-heading-collapse-img pull-right"></span></a>' +
        '<div id="iqaQuickAddPanel" class="panel-body-container collapse in"><div class="panel-body">' +
          '<div class="iqa-quickadd__items"><div class="iqa-quickadd__note">Loading…</div></div>' +
        '</div></div>';
      wrapper.insertBefore(panel, wrapper.firstChild);

      const itemsEl = panel.querySelector('.iqa-quickadd__items');
      loadSection().then(rows => {
        itemsEl.innerHTML = '';
        if (!rows || !rows.length) { itemsEl.innerHTML = '<div class="iqa-quickadd__note">No quick-add objects configured</div>'; return; }
        rows.forEach(o => itemsEl.appendChild(buildQuickAddItem(o)));
      }).catch(e => { itemsEl.innerHTML = '<div class="iqa-quickadd__note">Could not load quick-add objects</div>'; console.error('[IQA-Enh]', e); });
    },

    _findSection(wrapper, title) {
      const want = title.trim().toLowerCase();
      for (const p of wrapper.querySelectorAll('.panel.panel-border')) {
        if (p.classList.contains('iqa-quickadd')) continue;
        const h = p.querySelector('.panel-heading h4');
        if (h && h.textContent.trim().toLowerCase() === want) return p;
      }
      return null;
    },
    _expand(panel) {
      const head = panel.querySelector('.panel-heading[data-toggle="collapse"]');
      const c = panel.querySelector('.panel-body-container.collapse');
      if (c) { c.classList.add('in'); c.setAttribute('aria-expanded', 'true'); c.style.height = ''; }
      if (head) { head.classList.remove('collapsed'); head.setAttribute('aria-expanded', 'true'); }
    },
    _collapseAll(wrapper) {
      wrapper.querySelectorAll('.panel.panel-border').forEach(p => {
        const head = p.querySelector('.panel-heading[data-toggle="collapse"]');
        const c = p.querySelector('.panel-body-container.collapse');
        if (c) { c.classList.remove('in'); c.setAttribute('aria-expanded', 'false'); }
        if (head) { head.classList.add('collapsed'); head.setAttribute('aria-expanded', 'false'); }
      });
    },
    _collectKeys(panel) {
      const keys = {};
      panel.querySelectorAll('a[href*="AddQuickSource"]').forEach(a => {
        const m = /AddQuickSource\(\s*["']?([0-9a-fA-F-]{36})/.exec(a.getAttribute('href') || '');
        if (m) keys[m[1].toLowerCase()] = true;
      });
      return keys;
    },
    _mergeIntoNative(panel) {
      const container = panel.querySelector('.panel-body'); if (!container) return;
      const have = this._collectKeys(panel);
      loadSection().then(rows => {
        const frag = document.createDocumentFragment();
        (rows || []).forEach(o => { if (!o.key || have[o.key.toLowerCase()]) return; frag.appendChild(buildQuickAddItem(o)); });
        if (!frag.childNodes.length) return;
        const firstMedia = container.querySelector('.media');
        if (firstMedia) container.insertBefore(frag, firstMedia); else container.appendChild(frag);
      }).catch(e => console.error('[IQA-Enh]', e));
    }
  };

  /* ===========================================================================
   * Module: BoSearch  (GATED)
   * ======================================================================== */
  const BoSearch = {
    _abort: null,
    mount() {
      const body = panelBody(); if (!body) return;
      if (document.getElementById('iqaBoSearch')) return;
      injectStyle('iqaBoSearchCss', BOSEARCH_CSS);

      const wrap = document.createElement('div');
      wrap.id = 'iqaBoSearch'; wrap.className = 'iqa-bo-search';
      wrap.innerHTML =
        '<label class="iqa-bo-search__label" for="iqaBoSearchInput">Search business objects</label>' +
        '<div class="iqa-bo-search__box">' +
          '<input id="iqaBoSearchInput" class="iqa-bo-search__input" type="text" placeholder="Type at least 3 characters…" ' +
            'autocomplete="off" role="combobox" aria-expanded="false" aria-autocomplete="list" aria-controls="iqaBoSearchList" spellcheck="false" />' +
          '<span class="iqa-bo-search__spinner" role="status" aria-label="Searching" aria-hidden="true"></span>' +
          '<ul id="iqaBoSearchList" class="iqa-bo-search__list" role="listbox"></ul>' +
        '</div>';

      const header = body.querySelector('.ClearFix.Section');
      if (header && header.parentNode === body) header.insertAdjacentElement('afterend', wrap);
      else body.insertBefore(wrap, body.firstChild);

      this._wire(wrap);
    },
    teardown() { this._abort?.abort(); this._abort = null; document.getElementById('iqaBoSearch')?.remove(); },

    _wire(wrap) {
      this._abort = new AbortController();
      const sig = { signal: this._abort.signal };
      const input = wrap.querySelector('.iqa-bo-search__input');
      const list  = wrap.querySelector('.iqa-bo-search__list');
      const box   = wrap.querySelector('.iqa-bo-search__box');
      let view = [], active = -1, timer = null, term = '';

      const setLoading = on => box.classList.toggle('is-loading', !!on);
      const open = show => { list.classList.toggle('is-open', !!show); input.setAttribute('aria-expanded', show ? 'true' : 'false'); };
      const hint = text => { view = []; active = -1; list.innerHTML = ''; const li = document.createElement('li'); li.className = 'iqa-bo-search__empty'; li.textContent = text; list.appendChild(li); open(true); };

      function render() {
        list.innerHTML = ''; active = -1;
        if (view.length === 0) { hint('No matching business objects'); return; }
        view.forEach((o, i) => {
          const li = document.createElement('li'); li.className = 'iqa-bo-search__item'; li.setAttribute('role', 'option'); li.id = 'iqaBoOpt' + i;
          const name = document.createElement('span'); name.className = 'iqa-bo-search__name'; name.textContent = o.name; li.appendChild(name);
          if (o.desc) { const d = document.createElement('span'); d.className = 'iqa-bo-search__desc'; d.textContent = o.desc; li.appendChild(d); li.title = o.desc; }
          li.addEventListener('mousedown', ev => { ev.preventDefault(); choose(o.key); });
          li.addEventListener('mousemove', () => setActive(i));
          list.appendChild(li);
        });
        open(true);
      }
      function setActive(i) {
        const items = list.querySelectorAll('.iqa-bo-search__item'); if (!items.length) return;
        if (i < 0) i = items.length - 1; if (i >= items.length) i = 0;
        if (active > -1 && items[active]) items[active].classList.remove('is-active');
        active = i; items[active].classList.add('is-active'); items[active].scrollIntoView({ block: 'nearest' });
        input.setAttribute('aria-activedescendant', items[active].id);
      }
      function choose(key) { open(false); setLoading(true); addSource(key); }
      function search(q) {
        term = q; setLoading(true);
        const params = {}; params[SEARCH_PARAM] = q;
        runQuery(LIST_QUERY, params).then(data => {
          if (q !== term) return;
          view = rowsFrom(data).slice(0, MAX_RESULTS); setLoading(false); render();
        }).catch(e => { if (q !== term) return; setLoading(false); hint('Search failed'); console.error('[IQA-Enh]', e); });
      }
      function onType() {
        const q = input.value.trim(); clearTimeout(timer); active = -1;
        if (q.length < MIN_CHARS) { term = ''; setLoading(false); hint('Type at least ' + MIN_CHARS + ' characters'); return; }
        timer = setTimeout(() => search(q), DEBOUNCE_MS);
      }
      input.addEventListener('input', onType, sig);
      input.addEventListener('focus', () => { if (input.value.trim().length < MIN_CHARS) hint('Type at least ' + MIN_CHARS + ' characters'); else open(true); }, sig);
      input.addEventListener('keydown', e => {
        switch (e.key) {
          case 'ArrowDown': e.preventDefault(); setActive(active + 1); break;
          case 'ArrowUp':   e.preventDefault(); setActive(active - 1); break;
          case 'Enter':     if (active > -1 && view[active]) { e.preventDefault(); choose(view[active].key); } break;
          case 'Escape':    open(false); break;
        }
      }, sig);
      document.addEventListener('mousedown', e => { if (!wrap.contains(e.target)) open(false); }, sig);
    }
  };

  /* ===========================================================================
   * Module: SqlTools  (GATED)
   * ======================================================================== */
  const SqlTools = {
    _flashTimers: new Map(),
    // With the theme loaded this is its accent copy glow (us-copy-flash,
    // 1.6s), as the theme's own copy buttons use.
    _flash(field) {
      if (!field.isConnected) return;
      const flash = window.UnionSuiteCopy ? 'us-copy-flash' : 'iqa-copy-flash';
      clearTimeout(this._flashTimers.get(field));
      field.classList.remove('us-copy-flash', 'iqa-copy-flash');
      void field.offsetWidth; // Restart the feedback when copying the same field again.
      field.classList.add(flash);
      this._flashTimers.set(field, setTimeout(() => {
        field.classList.remove(flash);
        this._flashTimers.delete(field);
      }, window.UnionSuiteCopy ? 1600 : 800));
    },
    mount() {
      injectStyle('iqaSqlToolsCss', SQLTOOLS_CSS);
      this._copyButtons();
      this._copyPath();
      this._enhanceExpressions();
    },
    teardown() {
      this._flashTimers.forEach((timer, field) => { clearTimeout(timer); field.classList.remove('iqa-copy-flash', 'us-copy-flash'); });
      this._flashTimers.clear();
      document.querySelectorAll('.sqltext-copy-btn, .copied-msg').forEach(e => e.remove());
      removeThemeCopyButtons();
      document.querySelectorAll('.SQLText[data-copy-btn-added]').forEach(e => { delete e.dataset.copyBtnAdded; });
      document.querySelectorAll('.textarea-wrap').forEach(wrap => {
        const ta = wrap.querySelector('textarea'); if (!ta) return;
        wrap.parentNode.insertBefore(ta, wrap); wrap.remove();
        ta.style.resize = ''; ta.style.height = ''; ta.style.overflowY = ''; ta.style.boxSizing = '';
        delete ta.dataset.enhanced; delete ta.dataset.userResized;
      });
    },

    _copyButtons() {
      document.querySelectorAll('.SQLText').forEach(el => {
        if (el.dataset.copyBtnAdded) return;
        el.dataset.copyBtnAdded = 'true';
        // Beside the field's "SQL" label, so it is found without scrolling the
        // full width of the SQL; after the field when no label is found.
        const label = this._fieldLabel(el, 'SQL');
        const place = button => {
          if (label) label.appendChild(button); // inside, so it stays on the label's line
          else (el.closest('div') || el.parentNode || el).insertAdjacentElement('beforeend', button);
        };
        const themed = themeCopyButton(el, 'Copy SQL');
        if (themed) { place(themed); return; }
        const btn = elFromHTML(`<span class="sqltext-copy-btn" role="button" tabindex="0" title="Copy SQL">${COPY_ICON}</span>`);
        const doCopy = async () => {
          const ok = await copyText(el.innerText || el.textContent || el.value || '');
          if (!btn.isConnected) return;
          if (ok) this._flash(el);
          btn.parentNode.querySelector('.copied-msg')?.remove();
          const msg = document.createElement('span'); msg.className = 'copied-msg'; msg.textContent = ok ? 'Copied' : 'Failed';
          msg.style.cssText = 'color:#0b62c4;margin-left:8px;font-size:12px;';
          btn.insertAdjacentElement('afterend', msg); setTimeout(() => msg.remove(), 1200);
        };
        btn.addEventListener('click', doCopy);
        btn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
        place(btn);
      });
    },

    // The nearest element reading exactly `text` around a field, walking out a
    // few levels, that is not the field or a container of it.
    _fieldLabel(field, text) {
      for (let scope = field.parentElement, depth = 0; scope && depth < 4; scope = scope.parentElement, depth++) {
        const label = [...scope.querySelectorAll('label, span, div, td, th')].find(node =>
          !node.contains(field) && !node.children.length && node.textContent.trim() === text);
        if (label) return label;
      }
      return null;
    },

    _copyPath() {
      const path = document.querySelector('span[id$="_QueryPath"]');
      if (!path || path.nextElementSibling?.classList.contains('iqa-path-copy')) return;
      const themed = themeCopyButton(path, 'Copy query path');
      if (themed) { themed.classList.add('iqa-path-copy'); path.insertAdjacentElement('afterend', themed); return; }
      const btn = elFromHTML(`<button type="button" class="sqltext-copy-btn iqa-path-copy" title="Copy path" aria-label="Copy query path">${COPY_ICON}</button>`);
      const msg = document.createElement('span');
      msg.className = 'copied-msg'; msg.setAttribute('role', 'status');
      msg.style.cssText = 'color:#0b62c4;margin-left:8px;font-size:12px;';
      path.insertAdjacentElement('afterend', btn);
      btn.insertAdjacentElement('afterend', msg);
      let timer;
      btn.addEventListener('click', async () => {
        const ok = await copyText(path.textContent.trim());
        if (!btn.isConnected) return;
        if (ok) this._flash(path);
        clearTimeout(timer);
        msg.textContent = ok ? 'Copied' : 'Copy failed';
        timer = setTimeout(() => { msg.textContent = ''; }, 1200);
      });
    },

    _enhanceExpressions() {
      const table = document.getElementById('SelectedProperty'); if (!table) return;

      // A long expression in a narrow column wraps over many lines, so growth
      // stops here and the field scrolls. Dragging the resize grip still wins.
      const AUTO_HEIGHT_MAX = 320;
      const autoResize = (ta) => {
        const userMin = ta.dataset.userResized === 'true' ? ta.clientHeight : null;
        ta.dataset.resizingProgrammatically = 'true';
        ta.style.height = 'auto';
        const content = ta.scrollHeight;
        const needed = Math.min(content, AUTO_HEIGHT_MAX);
        const height = userMin != null ? Math.max(needed, userMin) : needed;
        ta.style.height = height + 'px';
        ta.style.overflowY = content > height ? 'auto' : 'hidden';
        requestAnimationFrame(() => { delete ta.dataset.resizingProgrammatically; });
      };
      const iconBtn = (label) => { const el = document.createElement('span'); el.className = 'icon-btn'; el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('aria-label', label); el.title = label; return el; };

      table.querySelectorAll('textarea').forEach(ta => {
        if (ta.dataset.enhanced) return;
        ta.dataset.enhanced = 'true';
        // Vertical-only: a manual width would become an inline style that
        // outlives the column it was dragged in, overflowing narrower layouts.
        ta.style.resize = 'vertical'; ta.style.overflowY = 'hidden'; ta.style.boxSizing = 'border-box';

        const wrapper = document.createElement('div'); wrapper.className = 'textarea-wrap';
        const bar = document.createElement('div'); bar.className = 'icon-bar';
        const themedCopy = themeCopyButton(ta, 'Copy text');
        const copyBtn = themedCopy || iconBtn('Copy text'); if (!themedCopy) copyBtn.innerHTML = COPY_ICON;

        ta.parentNode.replaceChild(wrapper, ta);
        wrapper.appendChild(ta); wrapper.appendChild(bar); bar.appendChild(copyBtn);

        requestAnimationFrame(() => autoResize(ta));
        ta.addEventListener('input', () => autoResize(ta));
        if ('ResizeObserver' in window) {
          new ResizeObserver(entries => { for (const e of entries) { if (e.target.dataset.resizingProgrammatically === 'true') continue; e.target.dataset.userResized = 'true'; } }).observe(ta);
        }

        if (themedCopy) return; // the theme's US-COPY handles the click
        let statusTimer = null, statusEl = null;
        const doCopy = async () => {
          const ok = await copyText(ta.value);
          if (!copyBtn.isConnected) return;
          if (ok) this._flash(ta);
          if (!statusEl) { statusEl = document.createElement('span'); statusEl.className = 'copy-status'; statusEl.textContent = 'Copied'; statusEl.setAttribute('aria-live', 'polite'); statusEl.style.cssText = 'font-size:12px;color:#0b62c4;margin-left:6px;'; copyBtn.insertAdjacentElement('afterend', statusEl); }
          statusEl.textContent = ok ? 'Copied' : 'Copy failed';
          statusEl.style.opacity = '1';
          if (statusTimer) clearTimeout(statusTimer);
          statusTimer = setTimeout(() => { if (statusEl) statusEl.style.opacity = '0'; }, 1200);
        };
        copyBtn.addEventListener('click', doCopy);
        copyBtn.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doCopy(); } });
      });
    }
  };

  /* ===========================================================================
   * Module: FilterSortDropdowns  (GATED)
   * ======================================================================== */
  const FilterSortDropdowns = {
    _items: [],
    _label(text) { return text.trim().replace(/^\[([^\]]+)\]\s*/, '$1.'); },
    _isFieldSelect(select) {
      return [...select.options].some(o => /^\[[^\]]+\]\s*\S/.test(o.text.trim()) || /\.SR\d+\|/i.test(o.value));
    },
    mount() {
      injectStyle('iqaDropdownCss', DROPDOWN_CSS);
      this._items = this._items.filter(item => {
        if (item.select.isConnected) { item.sync(); return true; }
        item.dispose(); return false;
      });
      document.querySelectorAll('table.iqa-filter-condition-box select').forEach(select => {
        if (select.matches('select.property') || this._isFieldSelect(select))
          this._create(select, select.matches('select.property') ? 'Add a filter' : 'Select a field');
      });
      document.querySelectorAll('[id$="_SortPanel_Body"] > table > tbody > tr > td:nth-child(2) > select')
        .forEach(select => this._create(select, 'Add a sort'));
    },
    teardown() {
      this._items.forEach(item => item.dispose()); this._items = [];
      document.getElementById('iqaDropdownCss')?.remove();
    },
    _create(select, label) {
      if (this._items.some(item => item.select === select)) return;
      const oldDisplay = select.style.display, abort = new AbortController(), sig = { signal: abort.signal };
      const id = 'iqa-field-' + Math.random().toString(36).slice(2);
      const wrap = elFromHTML(`<div class="iqa-field-picker"><input type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false"><button type="button" tabindex="-1" aria-label="Show fields">▾</button></div>`);
      const input = wrap.querySelector('input'), button = wrap.querySelector('button');
      input.setAttribute('aria-label', label); input.placeholder = label; input.setAttribute('aria-controls', id);
      const list = document.createElement('div'); list.id = id; list.className = 'iqa-field-list';
      list.setAttribute('role', 'listbox'); list.setAttribute('aria-label', label); list.hidden = true;
      document.body.appendChild(list); select.before(wrap); select.style.display = 'none';
      let options = [], active = -1;
      const sync = () => {
        const option = select.options[select.selectedIndex];
        input.value = !option || option.value === 'None' || option.value === '' ? '' : this._label(option.text);
        input.disabled = button.disabled = select.disabled;
      };
      const close = () => { list.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; sync(); };
      const position = () => {
        const r = wrap.getBoundingClientRect(), width = Math.min(r.width, innerWidth - 16);
        list.style.width = width + 'px'; list.style.left = Math.max(8, Math.min(r.left, innerWidth - width - 8)) + 'px';
        const below = innerHeight - r.bottom - 8, above = r.top - 8, upwards = below < 240 && above > below;
        list.style.maxHeight = Math.max(60, Math.min(300, upwards ? above : below)) + 'px';
        list.style.top = upwards ? 'auto' : (r.bottom + 2) + 'px';
        list.style.bottom = upwards ? (innerHeight - r.top + 2) + 'px' : 'auto';
      };
      const choose = option => {
        const changed = select.value !== option.value; select.value = option.value; close();
        if (changed) {
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      const render = (query = '') => {
        if (select.disabled) return;
        const q = query.trim().toLowerCase();
        options = [...select.options].filter(o => !o.disabled && !o.hidden && !o.parentElement?.disabled && o.value !== 'None' && o.value !== '' && this._label(o.text).toLowerCase().includes(q));
        list.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
        options.forEach((option, i) => {
          const item = document.createElement('div'); item.id = id + '-' + i; item.setAttribute('role', 'option');
          item.setAttribute('aria-selected', String(option.value === select.value));
          const text = this._label(option.text), index = text.toLowerCase().indexOf(q);
          if (!q) item.textContent = text;
          else {
            const mark = document.createElement('mark'); mark.textContent = text.slice(index, index + q.length);
            item.append(document.createTextNode(text.slice(0, index)), mark, document.createTextNode(text.slice(index + q.length)));
          }
          item.addEventListener('mousedown', e => e.preventDefault());
          item.addEventListener('click', () => { choose(option); input.focus(); }); list.appendChild(item);
        });
        if (!options.length) { const empty = document.createElement('div'); empty.textContent = 'No matching fields'; empty.setAttribute('role', 'status'); list.appendChild(empty); }
        list.hidden = false; input.setAttribute('aria-expanded', 'true'); position();
      };
      const setActive = index => {
        if (!options.length) return;
        active = (index + options.length) % options.length;
        [...list.children].forEach((item, i) => item.classList.toggle('is-active', i === active));
        input.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({ block: 'nearest' });
      };
      input.addEventListener('focus', () => input.select(), sig);
      input.addEventListener('click', () => { if (list.hidden) render(); }, sig);
      input.addEventListener('input', () => render(input.value), sig);
      input.addEventListener('blur', close, sig);
      input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault(); if (list.hidden) render();
          setActive(active < 0 ? (e.key === 'ArrowDown' ? 0 : options.length - 1) : active + (e.key === 'ArrowDown' ? 1 : -1));
        } else if (e.key === 'Enter') { e.preventDefault(); if (!list.hidden && active >= 0) choose(options[active]); }
        else if (e.key === 'Escape') { e.preventDefault(); close(); }
        else if (e.key === 'Tab') close();
      }, sig);
      button.addEventListener('mousedown', e => e.preventDefault(), sig);
      button.addEventListener('click', () => { input.focus(); list.hidden ? render() : close(); }, sig);
      select.addEventListener('change', sync, sig);
      document.addEventListener('mousedown', e => { if (!wrap.contains(e.target) && !list.contains(e.target)) close(); }, sig);
      window.addEventListener('resize', close, sig);
      window.addEventListener('scroll', e => { if (!list.hidden && !list.contains(e.target)) close(); }, { capture: true, signal: abort.signal });
      sync();
      this._items.push({ select, sync, dispose() { abort.abort(); list.remove(); wrap.remove(); select.style.display = oldDisplay; } });
    }
  };

  /* ===========================================================================
   * Module: UncheckAll  (GATED) — select/clear Display column selection
   * ======================================================================== */
  const UncheckAll = {
    mount() {
      const table = document.getElementById('SelectedProperty');
      const header = document.querySelector('#SelectedProperty > tbody > tr.GridHeader > td:nth-child(1)');
      if (!header) return;
      if (this._table === table) { this._sync(); return; }
      this.teardown();
      const label = elFromHTML('<label class="iqa-uncheck" title="Select all columns" style="cursor:pointer;margin:0;"><input type="checkbox" id="uncheckAllBox" aria-label="Select all columns"></label>');
      header.appendChild(label);
      const master = label.querySelector('input');
      const boxes = () => [...table.querySelectorAll(':scope > tbody > tr:not(.GridHeader) > td:first-child input[type="checkbox"]')].filter(cb => !cb.disabled);
      const sync = () => {
        const all = boxes(), selected = all.filter(cb => cb.checked).length;
        master.checked = all.length > 0 && selected === all.length;
        master.indeterminate = selected > 0 && selected < all.length;
        master.disabled = !all.length;
        label.title = master.checked ? 'Deselect all columns' : 'Select all columns';
        master.setAttribute('aria-label', label.title);
      };
      master.addEventListener('change', () => {
        const checked = master.checked;
        boxes().forEach(cb => {
          if (cb.checked === checked) return;
          cb.checked = checked;
          cb.dispatchEvent(new Event('input', { bubbles: true }));
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        });
        sync();
      });
      table.addEventListener('change', sync);
      this._table = table; this._sync = sync; sync();
    },
    teardown() {
      this._table?.removeEventListener('change', this._sync);
      this._table = this._sync = null;
      document.querySelector('.iqa-uncheck')?.remove();
    }
  };

  /* ===========================================================================
   * Module: FilterAutocomplete  (GATED)
   * ======================================================================== */
  const FilterAutocomplete = (() => {
    const PREFIX = 'iqaFilterHist::', MAX = 15;
    const attached = [];
    const load = p => { try { return JSON.parse(localStorage.getItem(PREFIX + p)) || []; } catch { return []; } };
    const save = (p, a) => { try { localStorage.setItem(PREFIX + p, JSON.stringify(a.slice(0, MAX))); } catch {} };
    const add  = (p, v) => { v = (v || '').trim(); if (!v) return; const a = load(p).filter(x => x.toLowerCase() !== v.toLowerCase()); a.unshift(v); save(p, a); };
    const del  = (p, v) => save(p, load(p).filter(x => x !== v));
    const propOf = input => { const tr = input.closest('tr'); if (!tr) return ''; return [...tr.querySelectorAll('td')].map(td => td.innerText.trim()).find(t => t) || ''; };
    const eligible = el => { if (!el) return false; if ((el.getAttribute('type') || 'text').toLowerCase() !== 'text') return false; if (el.closest('.iqa-field-picker') || el.readOnly || el.disabled || el.offsetParent === null) return false; if (/ComboBox|Calendar|DatePicker/i.test(el.id || '')) return false; return true; };

    function attach(input) {
      if (input.dataset.iqaHist) return;
      const prop = propOf(input); if (!prop) return;
      input.dataset.iqaHist = '1';
      input.setAttribute('autocomplete', 'off');
      const abort = new AbortController(); const sig = { signal: abort.signal };
      const list = document.createElement('ul'); list.className = 'iqa-hist-list'; document.body.appendChild(list);
      let items = [], active = -1;
      const place = () => { const r = input.getBoundingClientRect(); list.style.left = (scrollX + r.left) + 'px'; list.style.top = (scrollY + r.bottom + 2) + 'px'; list.style.width = r.width + 'px'; };
      const close = () => { list.classList.remove('is-open'); active = -1; };
      const open  = () => { place(); list.classList.add('is-open'); };
      function render() {
        const q = input.value.trim().toLowerCase();
        items = load(prop).filter(v => v.toLowerCase().includes(q));
        list.innerHTML = ''; if (!items.length) return close();
        items.forEach(v => {
          const li = document.createElement('li'); li.className = 'iqa-hist-item';
          const val = document.createElement('span'); val.className = 'iqa-hist-val'; val.textContent = v; val.title = v;
          const x = document.createElement('span'); x.className = 'iqa-hist-del'; x.textContent = '×'; x.title = 'Remove';
          li.append(val, x);
          val.addEventListener('mousedown', e => { e.preventDefault(); choose(v); });
          x.addEventListener('mousedown', e => { e.preventDefault(); e.stopPropagation(); del(prop, v); render(); });
          list.appendChild(li);
        });
        open();
      }
      function setActive(i) { const els = [...list.children]; if (!els.length) return; if (i < 0) i = els.length - 1; if (i >= els.length) i = 0; els.forEach(e => e.classList.remove('is-active')); active = i; els[i].classList.add('is-active'); els[i].scrollIntoView({ block: 'nearest' }); }
      function choose(v) { input.value = v; input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); close(); }
      input.addEventListener('focus', render, sig);
      input.addEventListener('input', render, sig);
      input.addEventListener('keydown', e => {
        if (!list.classList.contains('is-open')) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter' && active > -1 && items[active]) { e.preventDefault(); choose(items[active]); }
        else if (e.key === 'Escape') close();
      }, sig);
      input.addEventListener('change', () => add(prop, input.value), sig);
      input.addEventListener('blur', () => { add(prop, input.value); setTimeout(close, 150); }, sig);
      addEventListener('scroll', () => { if (list.classList.contains('is-open')) place(); }, { capture: true, signal: abort.signal });
      attached.push({ input, list, abort });
    }

    return {
      mount() {
        injectStyle('iqaHistCss', HIST_CSS);
        // drop records whose input was replaced by a postback
        for (let i = attached.length - 1; i >= 0; i--) {
          if (!document.contains(attached[i].input)) { attached[i].abort.abort(); attached[i].list.remove(); attached.splice(i, 1); }
        }
        document.querySelectorAll('table.iqa-filter-condition-box input').forEach(el => { if (eligible(el)) attach(el); });
      },
      teardown() {
        attached.forEach(({ input, list, abort }) => { abort.abort(); list.remove(); if (input) { delete input.dataset.iqaHist; input.removeAttribute('autocomplete'); } });
        attached.length = 0;
        document.querySelectorAll('.iqa-hist-list').forEach(l => l.remove());
      }
    };
  })();

  /* ===========================================================================
   * Module: DragSort  (GATED) — drag-reorder Display columns and Sorting priorities
   * ======================================================================== */
  const DragSort = (() => {
    const SS_KEY = 'iqaSortEnabled', STYLE_ID = 'iqasort-style', ROW_ID = 'iqasort-toggle-row';
    let tab = 'Display';
    const activeTab = () => [...document.querySelectorAll('a.rtsSelected .rtsTxt')].map(el => el.textContent.trim()).find(name => name === 'Display' || name === 'Sorting');
    const grid = () => tab === 'Sorting' ? document.querySelector('[id$="_SortPanel_Body"] > table.Grid') : document.getElementById('SelectedProperty');
    const preferenceKey = () => tab === 'Sorting' ? 'iqaPrioritySortEnabled' : SS_KEY;

    let ac = null, tbody = null, baseline = [], rearranged = null, enabled = false;
    let distinctPlacement = null, layoutPanel = null;
    const rows = () => (tbody ? [...tbody.children].filter(tr => tr.__iqa) : []);
    const preferredOn = () => { try { return sessionStorage.getItem(preferenceKey()) !== '0'; } catch (_) { return true; } };
    const remember = on => { try { sessionStorage.setItem(preferenceKey(), on ? '1' : '0'); } catch (_) {} };
    const orderChanged = () => rows().some((tr, i) => tr !== baseline[i] || tr.__iqa.orderSel.value !== tr.__iqa.baseOrder);

    function ensureStyles() {
      if (document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style'); style.id = STYLE_ID;
      style.textContent = `
        .iqa-display-options-layout > .Info { flex:0 0 100%; width:100%; box-sizing:border-box; padding:0 0 12px !important; }
        .iqa-display-options-layout > #SelectedProperty { flex:0 0 100%; width:100%; }
        #${ROW_ID} { display:flex; align-items:center; justify-content:space-between; gap:var(--space-4,16px) var(--space-6,24px); flex-wrap:wrap; flex:0 0 100%; width:100%; min-width:0; box-sizing:border-box; margin:0 0 14px; padding:var(--space-3,12px) var(--space-4,16px); border:1px solid var(--border,#e2e5e9); border-radius:var(--radius-sm,4px); background:var(--bg-subtle,#f8f9fa); }
        #${ROW_ID} .iqasort-settings { display:flex; align-items:center; gap:var(--space-4,16px) 28px; flex-wrap:wrap; min-width:0; }
        #${ROW_ID} .iqasort-distinct-slot:empty { display:none; }
        #${ROW_ID} .iqasort-distinct { display:flex; align-items:center; gap:var(--space-2,8px); margin:0 !important; padding:0 !important; }
        #${ROW_ID} .iqasort-distinct .inputNoBorder { display:inline-flex; align-items:center; gap:var(--space-2,8px); }
        #${ROW_ID} .iqasort-distinct input[type="checkbox"], #${ROW_ID} .iqasort-distinct label { margin:0; }
        #${ROW_ID} .iqasort-distinct .sysicon-info { display:inline-block !important; }
        #${ROW_ID} .iqasort-reorder { display:flex; flex-direction:column; gap:var(--space-1,4px); }
        #${ROW_ID} .iqasort-switch { align-self:flex-start; }
        #${ROW_ID} .iqasort-help { font-size:var(--fs-xs,12px); color:var(--text-muted,#545962); }
        #${ROW_ID} .iqasort-status { font-size:var(--fs-sm,13px); color:var(--text-muted,#545962); }
        #${ROW_ID} .iqasort-actions { display:flex; align-items:center; gap:var(--space-3,12px); flex-wrap:wrap; margin-left:auto; }
        #${ROW_ID} .iqasort-reset { margin:0; white-space:nowrap; }
        @media (max-width:900px) { #${ROW_ID} .iqasort-settings { flex:1 1 100%; } #${ROW_ID} .iqasort-actions { flex:1 1 100%; justify-content:space-between; margin-left:0; } }

        /* Reordering presentation follows the taskbar command palette: a grip
           handle, the held row floating under the pointer, an empty dashed slot
           and the displaced rows sliding into their new places. */
        .iqasort-grip { display:inline-flex; align-items:center; justify-content:center; flex:none; width:24px; height:24px; border-radius:var(--radius-sm,4px); color:var(--text-muted,#545962); cursor:grab; user-select:none; touch-action:none; }
        .iqasort-grip:hover { color:var(--text-link,#006f94); background:var(--bg-sunken,#f1f3f5); }
        .iqasort-grip:active { cursor:grabbing; }
        .iqasort-grip:focus-visible { outline:2px solid var(--border-focus,#006f94); outline-offset:2px; }
        .iqasort-grip > svg { display:block; width:18px; height:18px; }
        /* The handle keeps a column of its own beside the property text. Left
           inline it wraps onto a line above the label as soon as the column is
           narrow enough for the source name to wrap. */
        .iqasort-prop { display:flex; align-items:flex-start; gap:var(--space-1,4px); min-width:0; }
        .iqasort-prop__body { flex:1 1 auto; min-width:0; }
        /* An expression row is as tall as its field; its handle sits at the
           row's middle, level with the row's checkbox. */
        #SelectedProperty .SQLExpression .iqasort-prop { align-items:center; }
        .iqasort-nosel, .iqasort-nosel * { cursor:grabbing !important; user-select:none !important; -webkit-user-select:none !important; }
        .iqasort-dragging { display:none !important; }
        .iqasort-placeholder > td { padding:0 !important; border:0 !important; background:transparent !important; }
        .iqasort-placeholder .iqasort-drop { box-sizing:border-box; border:2px dashed var(--border-focus,#006f94); border-radius:var(--radius-sm,4px); background:transparent; }
        .iqasort-floating { position:fixed; top:0; left:0; z-index:99999; box-sizing:border-box; overflow:hidden; border:1px solid var(--border-focus,#006f94); border-radius:var(--radius-sm,4px); background:var(--bg-surface,#fff); box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16)); opacity:.8; pointer-events:none; }
        .iqasort-floating > table { width:100%; margin:0; table-layout:fixed; border-collapse:collapse; }
        .iqasort-moved > td { background:rgba(0,126,168,.10) !important; background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent) !important; }
      `;
      document.head.appendChild(style);
    }

    function readRows() {
      const g = grid(); if (!g) return [];
      return [...g.querySelectorAll('tr')].map(tr => {
        // Sorting's final Add sort row has a numeric priority too, but no
        // saved criterion key. Keep it out of dragging and renumbering.
        if (tab === 'Sorting' && !tr.querySelector('td:first-child input[type="hidden"][value^="SC"]')) return null;
        // A numeric Order select is what makes a row a column: the title and
        // header rows have none. The Property cell cannot decide it, because
        // iMIS prints the [Source] prefix and bold name only when a query has
        // several sources; with one source the cell is the bare property name.
        const orderSel = [...tr.querySelectorAll('select')].find(s => s.options.length && [...s.options].every(o => /^\d+$/.test(o.value)));
        if (!orderSel) return null;
        const cell = tr.querySelector('td:nth-child(2)');
        const nameEl = cell?.querySelector('b');
        const expression = cell?.querySelector('textarea');
        const src = cell?.querySelector('span.small');
        const alias = tr.querySelector('td:nth-child(4) input[type="text"]')?.value.trim();
        const name = nameEl ? nameEl.textContent.trim() : tab === 'Sorting'
          ? (cell?.textContent.trim() || 'Sort criterion')
          : expression ? (alias || 'Custom SQL expression') : (cell?.textContent.trim() || alias || 'Column');
        return { tr, name, orderSel, src };
      }).filter(Boolean);
    }

    function indexRows(current = readRows()) {
      tbody = null;
      for (const { tr, name, orderSel, src } of current) {
        tr.__iqa = { orderSel, name, table: (src ? src.textContent : '').replace(/[\[\]]/g, '').trim(), baseOrder: orderSel.value };
        tbody = tr.parentNode;
      }
      return current.length;
    }

    function renumber() {
      let changed = 0;
      rows().forEach((tr, i) => {
        const want = String(i + 1); const sel = tr.__iqa.orderSel;
        if (![...sel.options].some(o => o.value === want)) { console.warn(`${tr.__iqa.name}: no Order option "${want}"`); return; }
        if (sel.value !== want) { sel.value = want; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); changed++; }
        tr.classList.toggle('iqasort-moved', !!rearranged?.has(tr));
        tr.classList.remove('GridRow', 'GridAlternateRow'); tr.classList.add(i % 2 ? 'GridAlternateRow' : 'GridRow');
      });
      status(changed); return changed;
    }

    function status() {
      const row = document.getElementById(ROW_ID); if (!row) return;
      const count = rows().length, changed = enabled && orderChanged();
      const noun = tab === 'Sorting' ? (count === 1 ? 'sort criterion' : 'sort criteria') : (count === 1 ? 'column' : 'columns');
      row.querySelector('.iqasort-status').textContent = `${count} ${noun}` + (changed ? ' · Order changed' : '');
      row.querySelector('[data-act="reset"]').disabled = !changed;
    }

    function enable() {
      if (enabled) return;
      if (activeTab() !== tab) return console.warn('Drag sort: not on the active reordering tab.');
      if (!indexRows()) return console.warn('Drag sort: no property rows with an Order dropdown.');
      ac = new AbortController();
      const on = (el, ev, fn) => el.addEventListener(ev, fn, { signal: ac.signal });
      const g = grid();
      let dragging = null, placeholder = null, floating = null, homeNext = null, pointer = null;
      let grabOffset = { x: 0, y: 0 }, point = { x: 0, y: 0 }, frame = 0;
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const slides = new Map();

      baseline = rows();
      baseline.forEach(tr => { tr.__iqa.baseOrder = tr.__iqa.orderSel.value; });
      rearranged = new Set();

      const clearSelection = () => { const s = document.getSelection?.(); if (s && !s.isCollapsed) s.removeAllRanges(); };
      // An empty dashed slot exactly as tall as the row being moved.
      const makePlaceholder = (tr, height) => {
        const ph = document.createElement('tr');
        ph.className = 'iqasort-placeholder'; ph.setAttribute('aria-hidden', 'true');
        const td = document.createElement('td'); td.colSpan = tr.children.length || 9;
        const drop = document.createElement('div'); drop.className = 'iqasort-drop'; drop.style.height = height + 'px';
        td.appendChild(drop); ph.appendChild(td);
        return ph;
      };
      // The held row itself follows the pointer. A table row cannot be floated
      // on its own, so the copy keeps a one-row table with the measured column
      // widths. Ids, names and controls are stripped so the copy stays inert.
      const makeFloating = (tr, box) => {
        const widths = [...tr.children].map(td => td.getBoundingClientRect().width);
        const holder = document.createElement('div');
        holder.className = 'iqasort-floating'; holder.setAttribute('aria-hidden', 'true'); holder.inert = true;
        holder.style.width = box.width + 'px';
        const table = document.createElement('table');
        table.className = tr.closest('table')?.className || '';
        const body = document.createElement('tbody');
        const clone = tr.cloneNode(true);
        clone.classList.remove('iqasort-dragging');
        const fields = [...tr.querySelectorAll('input, select, textarea')];
        [...clone.querySelectorAll('input, select, textarea')].forEach((field, i) => {
          const source = fields[i];
          if (!source) return;
          if (field.type === 'checkbox' || field.type === 'radio') field.checked = source.checked;
          else field.value = source.value;
        });
        clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
        clone.querySelectorAll('[name]').forEach(el => el.removeAttribute('name'));
        [...clone.children].forEach((td, i) => { td.style.width = widths[i] + 'px'; });
        body.appendChild(clone); table.appendChild(body); holder.appendChild(table);
        document.body.appendChild(holder);
        return holder;
      };
      const stopSlides = () => { slides.forEach(animation => animation.cancel()); slides.clear(); };
      // FLIP: rows the drop slot displaced slide from where they just were.
      function slideRows(list, previousTops) {
        if (reducedMotion.matches) return;
        for (const node of list) {
          const previousTop = previousTops.get(node);
          if (previousTop === undefined) continue;
          const distance = previousTop - node.getBoundingClientRect().top;
          if (!Number.isFinite(distance) || Math.abs(distance) < 0.5) continue;
          const animation = node.animate(
            [{ transform: 'translateY(' + distance + 'px)' }, { transform: 'translateY(0)' }],
            { duration: 180, easing: 'cubic-bezier(.2, .8, .2, 1)' });
          slides.set(node, animation);
          animation.onfinish = () => { if (slides.get(node) === animation) slides.delete(node); };
        }
      }
      const tops = (list) => new Map(list.map(tr => [tr, tr.getBoundingClientRect().top]));
      const settled = (tr) => {
        const box = tr.getBoundingClientRect();
        // Hit-test settled positions so a sliding row cannot move the target.
        const transform = getComputedStyle(tr).transform;
        const shift = transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42;
        return box.top - shift + box.height / 2;
      };
      function position() {
        if (!dragging) return;
        floating.style.left = (point.x - grabOffset.x) + 'px';
        floating.style.top = (point.y - grabOffset.y) + 'px';
        const others = rows().filter(tr => tr !== dragging);
        const next = others.find(tr => point.y < settled(tr));
        const targetIndex = next ? others.indexOf(next) : others.length;
        const currentIndex = others.filter(tr =>
          tr.compareDocumentPosition(placeholder) & Node.DOCUMENT_POSITION_FOLLOWING).length;
        if (targetIndex === currentIndex) return;
        const previousTops = tops(others);
        stopSlides();
        if (next) tbody.insertBefore(placeholder, next);
        else if (others.length) others[others.length - 1].after(placeholder);
        slideRows(others, previousTops);
      }
      // Keep scrolling while the pointer rests against an edge, as the palette
      // does inside its list.
      function tick() {
        if (point.y < 40) window.scrollBy(0, -12);
        else if (point.y > window.innerHeight - 40) window.scrollBy(0, 12);
        position();
        frame = requestAnimationFrame(tick);
      }
      function endDrag(cancelled) {
        if (!dragging) return;
        cancelAnimationFrame(frame); frame = 0;
        const landed = !cancelled && placeholder?.parentNode;
        const moved = dragging;
        const previousTops = tops(rows().filter(tr => tr !== moved));
        stopSlides();
        tbody.insertBefore(moved, landed ? placeholder : homeNext);
        if (landed) rearranged.add(moved);
        placeholder?.remove(); floating?.remove();
        moved.classList.remove('iqasort-dragging');
        dragging = placeholder = floating = homeNext = null;
        g.classList.remove('iqasort-nosel'); renumber();
        slideRows(rows().filter(tr => tr !== moved), previousTops);
      }

      function finishPointer(cancelled) {
        const previous = pointer; pointer = null;
        if (previous?.grip.hasPointerCapture(previous.id)) previous.grip.releasePointerCapture(previous.id);
        endDrag(cancelled);
      }
      function pointRow(event) {
        const row = document.elementFromPoint(event.clientX, event.clientY)?.closest('tr');
        return row?.parentNode === tbody && (row.__iqa || row === placeholder) ? row : null;
      }
      on(document, 'pointermove', event => {
        if (!pointer || event.pointerId !== pointer.id) return;
        if (!dragging && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 4) return;
        event.preventDefault();
        point = { x: event.clientX, y: event.clientY };
        if (!dragging) {
          dragging = pointer.row; homeNext = dragging.nextSibling; clearSelection();
          g.classList.add('iqasort-nosel');
          const box = dragging.getBoundingClientRect();
          grabOffset = { x: pointer.x - box.left, y: pointer.y - box.top };
          floating = makeFloating(dragging, box);
          placeholder = makePlaceholder(dragging, box.height);
          tbody.insertBefore(placeholder, dragging);
          dragging.classList.add('iqasort-dragging');
          frame = requestAnimationFrame(tick);
        }
        position();
      });
      on(document, 'pointerup', event => {
        if (pointer && event.pointerId === pointer.id) finishPointer(!pointRow(event));
      });
      on(document, 'pointercancel', event => {
        if (pointer && event.pointerId === pointer.id) finishPointer(true);
      });
      on(document, 'keydown', event => {
        if (pointer && event.key === 'Escape') { event.preventDefault(); finishPointer(true); }
      });
      on(window, 'blur', () => finishPointer(true));
      ac.signal.addEventListener('abort', () => finishPointer(true), { once: true });

      for (const tr of baseline) {
        const cell = tr.querySelector('td:nth-child(2)');
        const grip = elFromHTML(`<span class="iqasort-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
        grip.title = 'Drag to reorder (or Alt+Up / Alt+Down)';
        grip.draggable = false;
        grip.setAttribute('aria-label', 'Reorder ' + tr.__iqa.name); grip.setAttribute('aria-describedby', 'iqasortHelp');
        addGrip(cell, grip);
        on(grip, 'pointerdown', event => {
          if (event.button !== 0 || !event.isPrimary || pointer) return;
          event.preventDefault(); clearSelection(); grip.focus({ preventScroll: true });
          pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, row: tr, grip };
          grip.setPointerCapture(event.pointerId);
        });
        on(grip, 'lostpointercapture', () => { if (pointer?.grip === grip) finishPointer(true); });
        on(grip, 'dragstart', event => event.preventDefault());
        on(grip, 'keydown', e => {
          if (!e.altKey || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
          e.preventDefault(); const list = rows(); const i = list.indexOf(tr); const j = e.key === 'ArrowUp' ? i - 1 : i + 1;
          if (j < 0 || j >= list.length) return;
          tbody.insertBefore(tr, e.key === 'ArrowUp' ? list[j] : list[j].nextSibling);
          rearranged.add(tr); renumber(); grip.focus();
        });
      }

      enabled = true; remember(true); syncToggleUi(); status();
    }

    // The handle and the rest of the property cell share a flex row, so the
    // cell keeps its original children inside a body element while dragging is
    // on. Removing the handle alone would leave that element behind.
    function addGrip(cell, grip) {
      const existing = cell.querySelector('.iqasort-prop');
      if (existing) { existing.querySelector('.iqasort-grip')?.remove(); existing.insertBefore(grip, existing.firstChild); return; }
      const body = document.createElement('div');
      body.className = 'iqasort-prop__body';
      while (cell.firstChild) body.appendChild(cell.firstChild);
      const shell = document.createElement('div');
      shell.className = 'iqasort-prop';
      shell.appendChild(grip); shell.appendChild(body);
      cell.appendChild(shell);
    }
    function removeGrips() {
      document.querySelectorAll('.iqasort-prop').forEach(shell => {
        const body = shell.querySelector('.iqasort-prop__body'), cell = shell.parentNode;
        if (body) while (body.firstChild) cell.insertBefore(body.firstChild, shell);
        shell.remove();
      });
      document.querySelectorAll('.iqasort-grip').forEach(el => el.remove());
    }

    function disable({ remember: savePreference = true } = {}) {
      ac?.abort(); ac = null;
      removeGrips();
      document.querySelectorAll('.iqasort-floating, .iqasort-placeholder').forEach(el => el.remove());
      grid()?.classList.remove('iqasort-nosel');
      rows().forEach(tr => { tr.draggable = false; tr.classList.remove('iqasort-moved', 'iqasort-dragging'); });
      enabled = false; if (savePreference) remember(false); syncToggleUi(); status();
    }

    function reset() {
      if (!enabled) return console.warn('Turn drag sort on first.');
      const current = rows(), after = current[current.length - 1]?.nextSibling || null;
      baseline.forEach(tr => tbody.insertBefore(tr, after)); rearranged.clear();
      rows().forEach(tr => { const sel = tr.__iqa.orderSel; if (sel.value !== tr.__iqa.baseOrder) { sel.value = tr.__iqa.baseOrder; sel.dispatchEvent(new Event('input', { bubbles: true })); sel.dispatchEvent(new Event('change', { bubbles: true })); } });
      rows().forEach((tr, i) => { tr.classList.remove('iqasort-moved', 'GridRow', 'GridAlternateRow'); tr.classList.add(i % 2 ? 'GridAlternateRow' : 'GridRow'); });
      status();
    }

    function restoreOptionsLayout() {
      if (distinctPlacement) {
        const { node, marker } = distinctPlacement;
        node.classList.remove('iqasort-distinct');
        if (marker.parentNode) marker.replaceWith(node);
        distinctPlacement = null;
      }
      layoutPanel?.classList.remove('iqa-display-options-layout'); layoutPanel = null;
    }

    function placeOptions(row, g) {
      if (tab === 'Sorting') return;
      const panel = g.closest('[id$="_DisplayPanel_Body"]') || g.parentElement;
      if (layoutPanel && layoutPanel !== panel) restoreOptionsLayout();
      layoutPanel = panel; panel.classList.add('iqa-display-options-layout');
      const distinct = panel.querySelector('input[id$="_mDistinctCheckBox"]');
      const nativeRow = distinct?.closest('.inputNoBorder')?.parentElement;
      // Move the existing native control and tooltip together, retaining names,
      // event handlers and the native distinct-query confirmation behaviour.
      if (nativeRow && nativeRow.parentElement === panel) {
        if (distinctPlacement) restoreOptionsLayout();
        layoutPanel = panel; panel.classList.add('iqa-display-options-layout');
        const marker = document.createComment('IQA distinct option original position');
        nativeRow.before(marker); distinctPlacement = { node: nativeRow, marker };
        nativeRow.classList.add('iqasort-distinct');
        row.querySelector('.iqasort-distinct-slot').appendChild(nativeRow);
      }
    }

    function buildToggleRow() {
      const g = grid(); if (!g) return;
      const existing = document.getElementById(ROW_ID);
      if (existing) { placeOptions(existing, g); return; }
      const row = document.createElement('div'); row.id = ROW_ID;
      row.setAttribute('role', 'group'); row.setAttribute('aria-label', tab + ' options');
      const label = tab === 'Sorting' ? 'Drag to reorder sort priority' : 'Drag to reorder columns';
      row.innerHTML = `
        <div class="iqasort-settings">
          <div class="iqasort-distinct-slot"></div>
          <div class="iqasort-reorder">
            <label class="us-switch us-switch--primary iqasort-switch">
              <input type="checkbox" id="iqasortToggle" role="switch" aria-describedby="iqasortHelp">
              <span class="us-switch__track" aria-hidden="true"></span>
              <span>${label}</span>
            </label>
            <span id="iqasortHelp" class="iqasort-help">Drag a handle or use Alt + Up / Down.</span>
          </div>
        </div>
        <div class="iqasort-actions">
          <span class="iqasort-status" role="status" aria-live="polite" aria-atomic="true"></span>
          <button type="button" class="TextButton us-outline-button iqasort-reset" data-act="reset" disabled title="Restore the order captured when drag mode was enabled on this page.">Restore starting order</button>
        </div>`;
      g.parentNode.insertBefore(row, g);
      row.querySelector('#iqasortToggle').addEventListener('change', () => {
        if (enabled) disable(); else enable();
        syncToggleUi();
      });
      row.addEventListener('click', e => { if (e.target.dataset?.act !== 'reset') return; e.preventDefault(); reset(); });
      placeOptions(row, g);
    }
    function syncToggleUi() {
      const row = document.getElementById(ROW_ID); if (!row) return;
      // The native checkbox drives aria-checked, the track and the On/Off text.
      const toggle = row.querySelector('#iqasortToggle');
      toggle.checked = enabled; toggle.disabled = !rows().length;
      row.querySelector('.iqasort-help').textContent = !rows().length ? (tab === 'Sorting' ? 'Add sort criteria to use drag ordering.' : 'Add display columns to use drag ordering.')
        : enabled ? (tab === 'Sorting' ? 'Top row sorts first. Drag a handle or use Alt + Up / Down.' : 'Drag a handle or use Alt + Up / Down.') : 'Turn on to drag rows. Your current order is kept.';
    }

    function install() {
      ensureStyles();
      const nextTab = activeTab();
      if (nextTab && nextTab !== tab) {
        disable({ remember: false }); restoreOptionsLayout();
        document.getElementById(ROW_ID)?.remove();
        tbody = null; baseline = []; rearranged = null;
        tab = nextTab;
      }
      if (!nextTab || !grid()) {
        disable({ remember: false }); restoreOptionsLayout();
        document.getElementById(ROW_ID)?.remove();
        tbody = null; baseline = []; rearranged = null;
        return false;
      }
      const current = readRows(), nodes = new Set(current.map(item => item.tr));
      // Keep the starting order and handlers when the same rows survive an
      // update. Abort old handlers before mounting a replaced grid or row set.
      if (enabled && (nodes.size !== baseline.length || baseline.some(tr => !nodes.has(tr) || tr.parentNode !== tbody))) disable({ remember: false });
      buildToggleRow();
      if (!enabled) indexRows(current);
      if (preferredOn() && !enabled && current.length) enable();
      syncToggleUi(); status();
      return true;
    }
    function destroy() {
      disable({ remember: false });
      restoreOptionsLayout();
      document.getElementById(ROW_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
      grid()?.querySelectorAll('tr').forEach(tr => { delete tr.__iqa; });
      tbody = null; baseline = []; rearranged = null;
    }

    // expose a console handle too
    window.__iqaSort = { enable, disable, renumber, reset, destroy, install };

    return { mount: install, teardown: destroy };
  })();

  /* ===========================================================================
   * Module: OverhaulCss  (GATED via body.iqa-enhanced)
   * ======================================================================== */
  const OverhaulCss = { mount() { injectStyle('iqaOverhaulCss', OVERHAUL_CSS); }, teardown() { /* inert once body class removed */ } };

  /* ===========================================================================
   * Registries + shell
   * ======================================================================== */
  // BEGIN FILTER WORKSPACE V1
/* IQA Filters v1: native compact layout and staged within-group reorder. */
function createFilterWorkspace() {
  function orders(state) {
    return state.groups.map(group => ({ slot: group.slot, filters: group.filters.map(filter => filter.slot) }));
  }
  function nextState(state, move) {
    const next = JSON.parse(JSON.stringify(state));
    const group = next.groups.find(group => group.slot === move.group);
    if (!group) throw new Error('group-missing');
    const index = group.filters.findIndex(filter => filter.slot === move.filter);
    const target = index + (move.direction === 'up' ? -1 : 1);
    if (index < 0 || target < 0 || target >= group.filters.length) throw new Error('move-out-of-range');
    [group.filters[index], group.filters[target]] = [group.filters[target], group.filters[index]];
    return next;
  }
  function plan(state) {
    const group = state.groups.find(group => group.filters.length >= 3);
    if (!group) throw new Error('need-three-filters-in-one-group');
    const move = { group: group.slot, filter: group.filters[group.filters.length - 1].slot, direction: 'up' };
    return [move, { ...move }];
  }
  function urlCheck(value, base, original, stage, allowed = []) {
    const url = new URL(value, base), start = new URL(original);
    url.hash = ''; start.hash = '';
    const query = item => { const params = new URLSearchParams(item.search); params.sort(); return params.toString(); };
    const sameEndpoint = item => item.origin === start.origin && item.pathname.toLowerCase() === start.pathname.toLowerCase();
    const facts = { stage, sameOrigin: url.origin === start.origin,
      samePath: url.pathname.toLowerCase() === start.pathname.toLowerCase(),
      sameQueryAsAddressBar: query(url) === query(start),
      matchesSubmittedOrOriginalQuery: [start, ...allowed.map(item => new URL(item))]
        .some(item => sameEndpoint(item) && query(item) === query(url)) };
    // The native form action is authoritative for POST parameters. Its query string
    // need not equal the address bar. Keep the same-origin, same-editor path boundary.
    return { href: url.href, facts, allowed: facts.sameOrigin && facts.samePath
      && (stage === 'action' || facts.matchesSubmittedOrOriginalQuery) };
  }
  async function execute(initial, moves, io) {
    let page = initial, state = io.read(page);
    for (let index = 0; index < moves.length; index++) {
      if (io.stopped()) throw new Error('stopped-between-moves');
      const expected = nextState(state, moves[index]);
      // The next request uses the previous RESPONSE document, never the stale visible page.
      page = await io.post(page, moves[index], index);
      const actual = io.read(page);
      if (JSON.stringify(orders(actual)) !== JSON.stringify(orders(expected))) throw new Error('unexpected-order');
      if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error('filter-values-changed');
      state = actual;
      io.verified(index, state);
    }
    return page;
  }

  function planMoves(before, target) {
    if (before.length !== target.length) throw new Error('groups-changed');
    const working = before.map(group => ({ slot: group.slot, filters: [...group.filters] })), moves = [];
    target.forEach((group, groupIndex) => {
      const current = working[groupIndex];
      if (current.slot !== group.slot || new Set(group.filters).size !== group.filters.length
        || [...current.filters].sort().join('|') !== [...group.filters].sort().join('|')) throw new Error('group-membership-changed');
      group.filters.forEach((filter, position) => {
        let from = current.filters.indexOf(filter);
        while (from > position) {
          moves.push({ group: group.slot, filter, direction: 'up' });
          [current.filters[from - 1], current.filters[from]] = [current.filters[from], current.filters[from - 1]];
          from--;
        }
      });
    });
    return moves;
  }
  function groupExplanation(index, value) {
    if (index === 0) return value === 'AndFalse' ? 'Start with records that do not match this group.' : 'Start with records that match this group.';
    return { AndTrue: 'Keep records from the result above that also match this group.',
      AndFalse: 'Exclude records matching this group from the result above.',
      OrTrue: 'Include records matching this group as well as the result above.',
      OrFalse: 'Include records that do not match this group as well as the result above.' }[value] || 'This group combines with the result above.';
  }
  function groupExpression(groups) {
    let expression = '';
    for (const group of groups) {
      if (!group.count) continue;
      if (!['AndTrue', 'AndFalse', 'OrTrue', 'OrFalse'].includes(group.connector)) return 'Group structure unavailable';
      const term = (group.connector.endsWith('False') ? 'NOT ' : '') + 'Group ' + group.number;
      expression = expression ? '(' + expression + (group.connector.startsWith('Or') ? ' OR ' : ' AND ') + term + ')' : term;
    }
    return expression || 'No filter groups defined';
  }
  if (typeof document === 'undefined') return { orders, nextState, execute, planMoves, urlCheck, groupExplanation, groupExpression };
  const RESULT_KEY = 'iqa:filter-reorder:result:v1';
  const selector = 'input[type="hidden"]';
  let originalURL = new URL(location.href); originalURL.hash = '';
  const result = { timeOrigin: performance.timeOrigin };
  let stale = false, busy = false, stopped = false, dialog = null, mountedRoot = null, mountedMarkers = [], undo = [], changeListener = null;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'TextButton') {
    const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function restoreLayout() {
    if (mountedRoot && changeListener) mountedRoot.removeEventListener('change', changeListener);
    undo.reverse().forEach(fn => fn()); undo = []; mountedRoot = null; mountedMarkers = []; changeListener = null;
  }
  function moveContents(from, into) {
    const nodes = [...from.childNodes]; nodes.forEach(node => into.appendChild(node));
    // Another module may have disposed one of its widgets since this snapshot.
    // Restore only nodes we still own; never resurrect detached controls.
    undo.push(() => nodes.forEach(node => { if (node.parentNode === into) from.appendChild(node); }));
  }
  function mount() {
    if (dialog || busy) return;
    const scope = document.querySelector('[id$="_FiltersPanel_Body"]');
    const markers = scope ? [...scope.querySelectorAll('input[type="hidden"][value^="FS|"],input[type="hidden"][value^="F|"]')] : [];
    if (mountedRoot === scope && scope && markers.length === mountedMarkers.length && markers.every((node, index) => node === mountedMarkers[index])) { changeListener?.(); return; }
    restoreLayout();
    if (!scope) return;
    let groups; try { groups = groupTables(document); } catch (_) { return; }
    if (!groups.length) return;
    mountedRoot = scope; mountedMarkers = markers;
    const addCondition = [...scope.querySelectorAll('input[type="button"],button')].find(button =>
      (button.value || button.textContent || '').trim().toLowerCase() === 'add condition');
    if (addCondition) {
      const wrapper = addCondition.parentElement;
      const block = wrapper?.tagName === 'DIV' && wrapper.childElementCount === 1 ? wrapper : addCondition;
      const parent = block.parentNode, next = block.nextSibling;
      groups[groups.length - 1].table.after(block);
      undo.push(() => parent.insertBefore(block, next?.parentNode === parent ? next : null));
    }
    if (!document.getElementById('iqaFilterWorkspaceCss')) {
      const style = element('style'); style.id = 'iqaFilterWorkspaceCss'; style.textContent = CSS; document.head.appendChild(style);
    }
    const toolbar = element('div', null, 'iqa-filter-toolbar');
    const message = element('span', '', 'iqa-filter-feedback'); message.setAttribute('role', 'status');
    toolbar.append(message); groups[0].table.before(toolbar); undo.push(() => toolbar.remove());
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null');
      if (saved && Date.now() - saved.at < 120000 && saved.url === location.href) {
        const matches = JSON.stringify(orders(read({ doc: document }))) === JSON.stringify(saved.target);
        message.textContent = matches ? 'Filter order applied. Save the query when you are ready.' : 'The refreshed order differs from the requested order. Review the filters before saving.';
      }
      sessionStorage.removeItem(RESULT_KEY);
    } catch (_) {}
    const spans = [], rowData = [], columnGroups = [], descriptions = [], addCells = [];
    const explanation = element('p', 'Each group combines with the result above. The group controls below determine how records are included or excluded.', 'iqa-group-overview');
    toolbar.after(explanation); undo.push(() => explanation.remove());
    const logic = element('div', null, 'iqa-group-logic'), logicLabel = element('label', 'Group logic');
    const logicField = element('textarea'); logicField.id = 'iqaGroupLogic'; logicField.readOnly = true; logicField.rows = 1;
    logicLabel.htmlFor = logicField.id;
    const logicNote = element('small');
    logicNote.id = 'iqaGroupLogicNote'; logicField.setAttribute('aria-describedby', logicNote.id);
    logic.append(logicLabel, logicField, logicNote); explanation.before(logic); undo.push(() => logic.remove());
    const nativeHelp = element('details', null, 'iqa-filter-help');
    nativeHelp.appendChild(element('summary', 'Field help'));
    const header = groups[0].table.querySelector('.GridHeader');
    [[1, 'About the Function setting'], [3, 'About Allow multiple values']].forEach(([index, text]) => {
      const icon = header?.cells[index]?.querySelector('.sysicon-info');
      if (!icon) return;
      const parent = icon.parentNode, next = icon.nextSibling, entry = element('div', text + ' ');
      undo.push(() => parent.insertBefore(icon, next?.parentNode === parent ? next : null));
      entry.appendChild(icon); nativeHelp.appendChild(entry);
    });
    if (nativeHelp.children.length > 1) toolbar.appendChild(nativeHelp);
    groups.forEach((group, index) => {
      const table = group.table, filters = rows(group);
      if (filters.some(filter => filter.row.cells.length !== 8)) return;
      table.classList.add('iqa-compact-filter'); undo.push(() => table.classList.remove('iqa-compact-filter', 'iqa-has-search-label'));
      const columns = element('colgroup'); table.prepend(columns); columnGroups.push(columns); undo.push(() => columns.remove());
      const markerRow = table.querySelector('input[type="hidden"][value^="FS|"]')?.closest('tr');
      if (markerRow) {
        const descriptionRow = element('tr', null, 'iqa-group-description'), cell = element('td');
        const name = element('strong', 'Group ' + (index + 1)), text = element('span');
        cell.append(name, text); descriptionRow.appendChild(cell); markerRow.after(descriptionRow);
        descriptions.push({ index, group, cell, text }); undo.push(() => descriptionRow.remove());
      }
      table.querySelectorAll('td[colspan]').forEach(cell => {
        const original = cell.colSpan; spans.push({ cell, original }); undo.push(() => { cell.colSpan = original; });
      });
      const addRow = table.querySelector('select.property')?.closest('tr');
      if (addRow && addRow.cells.length === 8) {
        const cell = addRow.cells[0], originalSpan = cell.getAttribute('colspan');
        const bar = element('div', null, 'iqa-add-filter-bar'), field = element('div', null, 'iqa-add-filter-field');
        addRow.classList.add('iqa-add-filter-row'); addCells.push(cell);
        undo.push(() => { addRow.classList.remove('iqa-add-filter-row'); if (originalSpan === null) cell.removeAttribute('colspan'); else cell.setAttribute('colspan', originalSpan); });
        undo.push(() => bar.remove()); moveContents(cell, field);
        const reorder = button('Reorder filters', () => Busy.run(reorder, openReorder)); reorder.classList.add('iqa-filter-reorder-button');
        reorder.disabled = !groups.some(item => rows(item).length > 1);
        bar.append(field, reorder); cell.appendChild(bar);
      }
      filters.forEach(filter => {
        const row = filter.row, cells = [...row.cells], select = cells[1].querySelector('select');
        row.classList.add('iqa-rule-row'); undo.push(() => row.classList.remove('iqa-rule-row', 'iqa-searchable-row'));
        const actions = element('div', null, 'iqa-filter-row-actions');
        undo.push(() => actions.remove()); moveContents(cells[7], actions); cells[7].appendChild(actions);
        if (select) {
          const details = element('details', null, 'iqa-filter-options'), summary = element('summary', 'ƒx');
          summary.title = 'Function options'; summary.setAttribute('aria-label', 'Function options');
          const label = element('div', 'Function', 'iqa-function-label');
          const panel = element('div', null, 'iqa-filter-options-panel'); panel.appendChild(label);
          details.append(summary, panel); actions.prepend(details); undo.push(() => details.remove());
          moveContents(cells[1], panel);
          const badge = element('span', null, 'iqa-function-badge'); cells[0].appendChild(badge); undo.push(() => badge.remove());
          const update = () => { badge.textContent = select.value !== 'None' ? 'Function: ' + select.options[select.selectedIndex]?.text : ''; badge.hidden = select.value === 'None'; };
          select.addEventListener('change', update); undo.push(() => select.removeEventListener('change', update)); update();
        }
        if (cells[3].querySelector('input[type="checkbox"]')) {
          const multiple = element('label', null, 'iqa-filter-multiple');
          cells[4].appendChild(multiple); undo.push(() => multiple.remove());
          moveContents(cells[3], multiple); multiple.appendChild(document.createTextNode(' Allow multiple values'));
        }
        const valueWrap = element('div', null, 'iqa-filter-value');
        undo.push(() => valueWrap.remove()); moveContents(cells[4], valueWrap); cells[4].appendChild(valueWrap);
        rowData.push({ row, search: cells[5].querySelector('select') });
      });
    });
    changeListener = () => {
      logic.hidden = groups.length < 2;
      explanation.hidden = groups.length < 2;
      const configuredGroups = groups.map((group, index) => ({ number: index + 1, count: rows(group).length,
        connector: group.table.querySelector('input[type="radio"]:checked')?.value }));
      const expression = groupExpression(configuredGroups);
      if (logicField.value !== expression) logicField.value = expression;
      logicField.rows = Math.min(4, Math.max(1, Math.ceil(expression.length / 90)));
      logicNote.textContent = 'Shows the configured group structure. ' + (configuredGroups.some(group => !group.count) ? 'Empty groups are omitted. ' : '') + 'Runtime SQL can vary with optional filters and aggregates.';
      // Include collapsed groups, and never clear or enable/disable native prompt values.
      const visible = groups.some(group => rows(group).some(filter => /^(Optional|Required)$/.test(filter.row.querySelector('select.options')?.value)));
      groups.forEach(group => group.table.classList.toggle('iqa-has-search-label', visible));
      columnGroups.forEach(columns => {
        columns.replaceChildren(...['22%', '12%', '', '130px', ...(visible ? ['170px'] : []), '128px'].map(width => {
          const col = element('col'); if (width) col.style.width = width; return col;
        }));
      });
      descriptions.forEach(({ index, group, cell, text }) => {
        cell.colSpan = visible ? 6 : 5;
        text.textContent = groupExplanation(index, group.table.querySelector('input[type="radio"]:checked')?.value);
      });
      rowData.forEach(({ row, search }) => row.classList.toggle('iqa-searchable-row', /^(Optional|Required)$/.test(search?.value)));
      spans.forEach(({ cell, original }) => { cell.colSpan = Math.max(1, original - (visible ? 2 : 3)); });
      addCells.forEach(cell => { cell.colSpan = visible ? 6 : 5; });
    };
    scope.addEventListener('change', changeListener); changeListener();
  }
  function openReorder() {
    if (busy || dialog) return;
    restoreLayout(); // Return controls to their native locations before reading/serialising them.
    originalURL = new URL(location.href); originalURL.hash = '';
    let initialState, groups;
    try { initialState = read({ doc: document }); groups = groupTables(document); }
    catch (_) { mount(); return; }
    const initial = { doc: document, url: originalURL.href }, baseline = orders(initialState);
    const lists = [];
    const listItems = list => [...list.children].filter(item => item.dataset.slot);
    stale = false; stopped = false;
    dialog = element('dialog', null, 'iqa-reorder-dialog');
    const title = element('h2', 'Reorder filters'); title.id = 'iqaReorderTitle'; dialog.setAttribute('aria-labelledby', title.id);
    const help = element('p', 'Drag a handle within a group, use Alt + Up / Down, or use the move buttons. Apply order updates the query editor; saving the query is a separate action.');
    const content = element('div', null, 'iqa-reorder-groups');
    const reorder = createPointerReorder({
      surface: dialog, scroller: content, items: listItems, blocked: () => busy,
      onDrop: () => update(),
      classes: { dragging: 'iqa-dragging', placeholder: 'iqa-reorder-placeholder', floating: 'iqa-reorder-floating' }
    });
    const status = element('p', 'No position changes yet.', 'iqa-reorder-status'); status.setAttribute('role', 'status');
    const footer = element('div', null, 'iqa-reorder-actions');
    const getTarget = () => lists.map(({ group, list }) => ({ slot: group.slot, filters: listItems(list).map(item => item.dataset.slot) }));
    const apply = button('Apply order', applyOrder, 'TextButton PrimaryButton');
    const cancel = button('Cancel', cancelOrder, 'TextButton us-outline-button');
    function update() {
      const moves = planMoves(baseline, getTarget());
      apply.disabled = !moves.length || moves.length > 100;
      status.textContent = moves.length > 100 ? 'This order needs more than 100 moves. Apply a smaller rearrangement first.' : moves.length ? moves.length + ' native move' + (moves.length === 1 ? '' : 's') + ' to apply. The editor refreshes once when finished.' : 'No position changes yet.';
      lists.forEach(({ list }) => listItems(list).forEach((item, index) => {
        item.querySelector('[data-direction="up"]').disabled = index === 0;
        item.querySelector('[data-direction="down"]').disabled = index === listItems(list).length - 1;
        item.classList.toggle('iqa-reorder-moved', baseline.find(group => group.slot === list.dataset.group).filters[index] !== item.dataset.slot);
      }));
    }
    groups.forEach((group, index) => {
      const section = element('section'), selected = group.table.querySelector('input[type="radio"]:checked');
      const connective = { AndTrue: index ? 'And' : 'Where', AndFalse: index ? 'And Not' : 'Where Not', OrTrue: 'Or', OrFalse: 'Or Not' }[selected?.value] || '';
      section.appendChild(element('h3', 'Group ' + (index + 1) + ' · ' + connective));
      section.appendChild(element('p', groupExplanation(index, selected?.value), 'iqa-reorder-group-help'));
      const list = element('ol', null, 'iqa-reorder-list'); list.dataset.group = group.slot; lists.push({ group, list });
      rows(group).forEach(filter => {
        const item = element('li'); item.dataset.slot = filter.slot;
        const name = filter.row.querySelector('td.property')?.textContent.trim() || filter.slot;
        const handle = elFromHTML(`<span class="iqa-filter-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
        handle.title = 'Drag to reorder (or Alt+Up / Alt+Down)';
        handle.setAttribute('aria-label', 'Drag ' + name + '; use the adjacent move buttons for keyboard reordering');
        reorder.attach(handle, item, list);
        const up = button('Move up', () => { if (!busy && item.previousElementSibling) { list.insertBefore(item, item.previousElementSibling); update(); } }, 'TextButton us-outline-button'); up.dataset.direction = 'up'; up.setAttribute('aria-label', 'Move ' + name + ' up');
        const down = button('Move down', () => { if (!busy && item.nextElementSibling) { list.insertBefore(item.nextElementSibling, item); update(); } }, 'TextButton us-outline-button'); down.dataset.direction = 'down'; down.setAttribute('aria-label', 'Move ' + name + ' down');
        handle.addEventListener('keydown', event => {
          if (!busy && event.altKey && /^(ArrowUp|ArrowDown)$/.test(event.key)) { event.preventDefault(); reorder.cancel(); (event.key === 'ArrowUp' ? up : down).click(); handle.focus(); }
        });
        item.append(handle, element('span', name, 'iqa-reorder-name'), up, down); list.appendChild(item);
      });
      if (!list.children.length) section.appendChild(element('p', 'No filters in this group.'));
      section.appendChild(list); content.appendChild(section);
    });
    function close() { reorder.cancel(); dialog?.remove(); dialog = null; mount(); document.querySelector('.iqa-filter-reorder-button')?.focus(); }
    function cancelOrder() {
      if (busy) { stopped = true; cancel.disabled = true; status.textContent = 'Stopping after the current move. Completed moves will remain applied.'; }
      else if (stale) location.replace(originalURL.href);
      else close();
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy && !stale) close(); });
    async function applyOrder() {
      if (busy || stale) return;
      const target = getTarget(), moves = planMoves(baseline, target);
      if (!moves.length || moves.length > 100) return;
      const applying = Busy.button(apply);
      busy = true; apply.disabled = true; cancel.textContent = 'Stop after current move';
      content.inert = true;
      try {
        if (location.href.split('#')[0] !== originalURL.href || JSON.stringify(read(initial)) !== JSON.stringify(initialState)) throw new Error('page-changed-since-staging');
        const finalPage = await execute(initial, moves, { read, stopped: () => stopped,
          post(page, move, index) { status.textContent = 'Applying order: move ' + (index + 1) + ' of ' + moves.length + '…'; return post(page, move, index); },
          verified() {} });
        try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), url: finalPage.url, target })); } catch (_) {}
        status.textContent = 'Order applied. Refreshing the editor…'; cancel.disabled = true;
        location.replace(finalPage.url);
      } catch (error) {
        applying.clear();
        busy = false; cancel.disabled = false; cancel.textContent = stale ? 'Refresh editor' : 'Close';
        status.textContent = stale ? 'The reorder stopped. Some moves may have applied. Refresh the editor to see the current order before continuing.' : 'The reorder could not start. Close this window and try again.';
        const detail = element('small', 'Reason: ' + (/^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error'));
        status.appendChild(document.createElement('br')); status.appendChild(detail);
        // Never retry after an uncertain request or unlock a stale native form.
      }
    }
    footer.append(apply, cancel); dialog.append(title, help, content, status, footer); document.body.appendChild(dialog); update(); dialog.showModal();
  }
  const CSS = `
    .iqa-filter-toolbar{display:flex;align-items:center;gap:14px;margin:12px 0 18px;flex-wrap:wrap}
    .iqa-filter-toolbar:not(:has(> :not(:empty))){display:none}
    .iqa-add-filter-row>td:not(:first-child){display:none}
    .iqa-add-filter-bar{display:flex;align-items:center;gap:16px;width:100%;padding:6px 0}
    .iqa-add-filter-field{flex:0 1 350px;min-width:0}
    .iqa-add-filter-field>.iqa-field-picker{width:100%!important;max-width:100%}
    .iqa-add-filter-bar>.iqa-filter-reorder-button{margin-left:auto;flex:0 0 auto}
    .iqa-filter-feedback{font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-filter-help{font-size:var(--fs-sm,13px)}
    .iqa-filter-help summary{cursor:pointer;color:var(--text-link,#006f94)}
    .iqa-filter-help summary:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-filter-help>div{display:inline-flex;align-items:center;gap:4px;margin:6px 14px 0 0;color:var(--text-muted,#545962)}
    .iqa-filter-help .sysicon.sysicon-info{display:inline-block!important;vertical-align:middle}
    table.iqa-compact-filter{width:100%;table-layout:fixed;margin-bottom:18px}
    .iqa-group-overview{margin:0 0 16px;color:#526173;font-size:13px}
    .iqa-group-logic{margin:4px 0 12px}.iqa-group-logic>label{display:block;font-weight:600;margin-bottom:5px}
    body.iqa-enhanced .iqa-group-logic>textarea{display:block;width:100%!important;max-width:100%;min-height:40px!important;height:auto!important;box-sizing:border-box;padding:9px 12px;border:1px solid #cbd5e1;border-radius:4px;background:#f5f8fb;color:#183a50;font:15px/1.5 Consolas,monospace;resize:vertical}
    .iqa-group-logic>small{display:block;color:#526173;font-size:12px;margin-top:5px}
    .iqa-group-description>td{padding:12px 8px!important;white-space:normal!important;color:#526173}
    .iqa-group-description strong{color:#243343;margin-right:14px}.iqa-group-description span{font-size:13px}
    .iqa-compact-filter .GridHeader>td:nth-child(2),.iqa-compact-filter .GridHeader>td:nth-child(4),.iqa-compact-filter .iqa-rule-row>td:nth-child(2),.iqa-compact-filter .iqa-rule-row>td:nth-child(4){display:none}
    .iqa-compact-filter:not(.iqa-has-search-label) .GridHeader>td:nth-child(7),.iqa-compact-filter:not(.iqa-has-search-label) .iqa-rule-row>td:nth-child(7){display:none}
    .iqa-compact-filter .iqa-rule-row:not(.iqa-searchable-row)>td:nth-child(7)>*{visibility:hidden}
    body.iqa-enhanced .iqa-compact-filter .GridHeader>td{width:auto!important}
    .iqa-compact-filter .iqa-rule-row>td{vertical-align:middle!important;padding:3px 5px;white-space:normal!important}
    .iqa-compact-filter .iqa-rule-row>td:nth-child(1){overflow:visible;white-space:normal}
    .iqa-compact-filter .iqa-rule-row>td:nth-child(3)>select,.iqa-compact-filter .iqa-rule-row>td:nth-child(6)>select,.iqa-compact-filter .iqa-rule-row>td:nth-child(7)>input{width:100%!important;min-width:0;box-sizing:border-box}
    .iqa-filter-value{display:grid;grid-template-columns:110px minmax(100px,1fr);gap:4px 8px;align-items:start}
    .iqa-filter-value>*{grid-column:2;min-width:0;max-width:100%;box-sizing:border-box}
    .iqa-filter-value>select[aria-label="Value type field"]{grid-column:1;grid-row:1 / span 3;margin:0!important}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>input[type=text],body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>select,body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>.iqa-field-picker,body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>.RadComboBox{width:100%!important;max-width:100%!important;min-width:0!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner{display:flex!important;align-items:stretch;width:100%!important;box-sizing:border-box;padding-right:0!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner>input.rcbInput{flex:1 1 0;width:0!important;min-width:0!important;max-width:none!important;box-sizing:border-box;float:none!important}
    body.iqa-enhanced .iqa-filter-value>.RadComboBox>.rcbInner>.rcbActionButton{position:static!important;flex:0 0 32px;width:32px!important;height:auto!important;align-self:stretch;margin:0!important}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value>span:has(>.chosen-container){display:block;width:100%;min-width:0}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value .chosen-container{width:100%!important;max-width:100%;min-width:0;box-sizing:border-box}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-value .chosen-choices{width:100%;box-sizing:border-box}
    .iqa-filter-value>span:empty{display:none}.iqa-filter-value>.RadComboBox{padding-bottom:0!important}
    @media(max-width:1200px){.iqa-filter-value{grid-template-columns:minmax(0,1fr)}.iqa-filter-value>*{grid-column:1}.iqa-filter-value>select[aria-label="Value type field"]{grid-row:auto}}
    .iqa-filter-multiple{display:flex;align-items:center;gap:6px;margin:4px 0 0;font-size:var(--fs-sm,13px);white-space:normal}
    .iqa-filter-row-actions{display:flex;align-items:center;justify-content:flex-start;gap:6px;min-height:30px;white-space:nowrap;flex-wrap:nowrap}
    .iqa-filter-row-actions>*{flex-shrink:0}.iqa-filter-row-actions>.DisplayInlineBlock{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}
    .iqa-filter-row-actions input[type=image]{margin:0!important;flex-shrink:0}
    .iqa-filter-options{position:relative!important;text-align:left;margin:0;white-space:normal}.iqa-filter-options summary{display:inline-flex;align-items:center;justify-content:center;width:26px;height:30px;box-sizing:border-box;cursor:pointer;color:#087ba7;font:600 17px/1 Georgia,serif;white-space:nowrap;list-style:none;border-radius:4px}.iqa-filter-options summary::-webkit-details-marker{display:none}
    .iqa-filter-options summary:hover{background:#eaf3fc}.iqa-filter-options summary:focus-visible{outline:2px solid #087ba7;outline-offset:1px}
    .iqa-filter-options-panel{position:absolute;right:0;top:calc(100% + 6px);z-index:100;width:180px;padding:10px;box-sizing:border-box;border:1px solid #cbd5e1;border-radius:5px;background:#fff;box-shadow:0 4px 14px #0002}
    body.iqa-enhanced .iqa-compact-filter .iqa-filter-options select{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box}.iqa-function-label{font-size:12px;margin-top:6px}
    .iqa-function-badge{display:block;font-size:12px;color:#526173;margin-top:4px}
    .iqa-reorder-dialog{width:min(900px,94vw);max-height:90vh;padding:var(--space-6,24px);box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-base,1.5) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16))}
    .iqa-reorder-dialog::backdrop{background:rgb(0 27 35 / .4)}
    .iqa-reorder-dialog h2{margin-top:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif)}
    .iqa-reorder-dialog h3{padding:var(--space-2,8px) var(--space-3,12px);border-radius:var(--radius-sm,4px);background:var(--bg-sunken,#f1f3f5);color:var(--text-strong,#1c2024);font-size:var(--fs-md,16px)}
    .iqa-reorder-groups{max-height:55vh;overflow:auto}
    .iqa-reorder-list{list-style:none;padding:0;margin:0}
    .iqa-reorder-list li{display:flex;align-items:center;gap:var(--space-2,8px);padding:10px 4px;border-bottom:1px solid var(--border,#e2e5e9);flex-wrap:wrap}
    .iqa-reorder-name{flex:1;min-width:160px;color:var(--text-strong,#1c2024)}
    .iqa-reorder-group-help{margin:0 12px 10px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-reorder-actions{display:flex;gap:var(--space-3,12px)}
    .iqa-reorder-status{min-height:24px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-reorder-list li.iqa-reorder-moved{background:rgba(0,126,168,.10);background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent)}
    .iqa-reorder-dialog .iqa-filter-grip{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--radius-sm,4px);background:transparent;color:var(--text-muted,#545962);cursor:grab;user-select:none;touch-action:none}
    .iqa-reorder-dialog .iqa-filter-grip:hover{color:var(--text-link,#006f94);background:var(--bg-sunken,#f1f3f5)}
    .iqa-reorder-dialog .iqa-filter-grip:active{cursor:grabbing}
    .iqa-filter-grip:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-filter-grip>svg{display:block;width:18px;height:18px}
    .iqa-reorder-dialog.iqa-is-sorting,.iqa-reorder-dialog.iqa-is-sorting *{cursor:grabbing!important;user-select:none}
    .iqa-reorder-list li.iqa-dragging{display:none}
    .iqa-reorder-list li.iqa-reorder-placeholder{box-sizing:border-box;margin:0;padding:0;border:2px dashed var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:transparent}
    .iqa-reorder-dialog>li.iqa-reorder-floating{display:flex;align-items:center;gap:var(--space-2,8px);flex-wrap:wrap;position:fixed;top:0;left:0;z-index:1;box-sizing:border-box;padding:10px 4px;border:1px solid var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:var(--bg-surface,#fff);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));opacity:.8;pointer-events:none}
  `;
  return { mount, teardown() {
    if (busy || stale) { stopped = true; return; }
    dialog?.remove(); dialog = null; restoreLayout(); document.getElementById('iqaFilterWorkspaceCss')?.remove();
  } };
  function marker(container, prefix) {
    return Array.from(container.querySelectorAll(selector)).find(input => input.value.startsWith(prefix + '|'));
  }
  function slot(input, prefix) {
    const match = String(input?.value || '').match(new RegExp('^' + prefix + '\\|([A-Za-z0-9_-]{1,64})$'));
    if (!match) throw new Error('invalid-slot-marker');
    return match[1];
  }
  function groupTables(doc) {
    const scope = doc.querySelector('[id$="_FiltersPanel_Body"]') || doc.getElementById('ChildControls');
    if (!scope) throw new Error('filters-panel-missing');
    return Array.from(scope.querySelectorAll(selector)).filter(input => input.value.startsWith('FS|'))
      .map(input => ({ slot: slot(input, 'FS'), table: input.closest('table') }));
  }
  function rows(group) {
    return Array.from(group.table.querySelectorAll(selector))
      .filter(input => input.value.startsWith('F|') && input.closest('table') === group.table)
      .map(input => ({ slot: slot(input, 'F'), row: input.closest('tr') }));
  }
  function read(page) {
    const groups = groupTables(page.doc).map(group => ({ slot: group.slot, filters: rows(group).map(filter => ({
      slot: filter.slot,
      // In-memory comparison only. These values NEVER go into the saved/copyable report.
      values: Array.from(filter.row.querySelectorAll('input,select,textarea')).filter(control =>
        control.name && (control.tagName !== 'INPUT' || /^(text|search|number|date|checkbox|radio)$/i.test(control.type)))
        .map(control => ({ type: control.tagName + ':' + control.type,
          value: control.tagName === 'SELECT' ? Array.from(control.options).filter(option => option.selected).map(option => option.value)
            : /^(checkbox|radio)$/.test(control.type) ? control.checked : control.value }))
    })) }));
    if (!groups.length || new Set(groups.map(group => group.slot)).size !== groups.length) throw new Error('groups-missing-or-ambiguous');
    for (const group of groups) if (new Set(group.filters.map(filter => filter.slot)).size !== group.filters.length) throw new Error('ambiguous-filter-slots');
    return { groups };
  }
  function record() {}
  function checkURL(value, base, stage, allowed = []) {
    const check = urlCheck(value, base, originalURL.href, stage, allowed);
    record('url-check', check.facts);
    if (!check.allowed) {
      throw new Error('response-or-action-url-changed');
    }
    return check.href;
  }
  async function post(page, move, index) {
    const group = groupTables(page.doc).find(group => group.slot === move.group);
    const row = group && rows(group).find(filter => filter.slot === move.filter)?.row;
    const button = row?.querySelector('input[type="image"][title="Move Up"]');
    if (!button || button.disabled || !button.name) throw new Error('native-up-button-unavailable');
    const form = button.form;
    if (!form || form.method.toLowerCase() !== 'post') throw new Error('native-post-form-unavailable');
    if (button.getAttribute('onclick')) throw new Error('button-has-unhandled-client-script');
    const url = checkURL(form.getAttribute('action') || page.url, page.url, 'action');
    const data = new FormData(form);
    // Reproduce an image submitter's coordinates; FormData(form) excludes buttons.
    data.set(button.name + '.x', '1'); data.set(button.name + '.y', '1');
    if (data.has('__EVENTTARGET')) data.set('__EVENTTARGET', '');
    if (data.has('__EVENTARGUMENT')) data.set('__EVENTARGUMENT', '');
    data.delete('__ASYNCPOST');
    const body = new URLSearchParams();
    for (const [name, value] of data) {
      if (typeof value !== 'string') {
        if (value.size > 0) throw new Error('file-upload-present');
        continue;
      }
      body.append(name, value);
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    record('post-start', { step: index + 1, filter: move.filter,
      button: /^ctl[0-9][A-Za-z0-9_$:-]{0,220}$/.test(button.name) ? button.name : '[nonstandard name omitted]' });
    // From here onward the server may have processed a move, even if fetch fails.
    stale = true;
    try {
      const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin',
        redirect: 'follow', signal: controller.signal, headers: { 'Accept': 'text/html' } });
      const finalURL = checkURL(response.url, page.url, 'response', [url, page.url]);
      if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('non-html-or-error-response');
      const html = await response.text();
      const doc = new DOMParser().parseFromString(html, 'text/html');
      // No scripts from the response are executed or inserted into the visible page.
      const error = doc.querySelector('[id$="_ErrorMsgLabel"]');
      if (error?.textContent.trim()) throw new Error('native-filter-error');
      record('post-response', { step: index + 1, status: response.status, redirected: response.redirected,
        documentStayedVisible: performance.timeOrigin === result.timeOrigin });
      return { doc, url: finalURL };
    } finally { clearTimeout(timeout); }
  }

}

  const FilterWorkspace = createFilterWorkspace();
  // END FILTER WORKSPACE V1

  // BEGIN SOURCE WORKSPACE V1
/* IQA Sources v1: stage a source order, apply native adjacent moves, refresh once.
 * Relationship controls/state may change through native iMIS processing. They are
 * submitted from each fresh response, but are not part of reorder verification.
 */
function createSourceWorkspace() {
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const order = state => state.sources.map(source => source.slot);
  const preserved = state => state.sources.map(({ slot, source, alias, type }) => ({ slot, source, alias, type })).sort((a, b) => a.slot.localeCompare(b.slot));
  function nextState(state, source) {
    const next = JSON.parse(JSON.stringify(state)), index = next.sources.findIndex(item => item.slot === source);
    if (index < 1) throw new Error('source-cannot-move-up');
    [next.sources[index - 1], next.sources[index]] = [next.sources[index], next.sources[index - 1]];
    return next;
  }
  function planMoves(before, target) {
    if (new Set(before).size !== before.length || new Set(target).size !== target.length
      || !equal([...before].sort(), [...target].sort())) throw new Error('source-membership-changed');
    const working = [...before], moves = [];
    target.forEach((source, position) => {
      let from = working.indexOf(source);
      while (from > position) {
        moves.push(source);
        [working[from - 1], working[from]] = [working[from], working[from - 1]];
        from--;
      }
    });
    return moves;
  }
  function postbackOptions(script, buttonName) {
    const match = script.trim().match(/^(?:javascript:\s*)?WebForm_DoPostBackWithOptions\(\s*new WebForm_PostBackOptions\(([\s\S]*)\)\s*\)\s*;?$/);
    let args;
    try { args = match && JSON.parse('[' + match[1] + ']'); } catch (_) {}
    // Parse known option data, never eval an onclick or invoke a submit-capable hook.
    if (!args || args.length !== 7 || args[0] !== buttonName || args[1] !== ''
      || typeof args[2] !== 'boolean' || typeof args[3] !== 'string'
      || args[4] !== '' || args[5] !== false || args[6] !== false) throw new Error('unsupported-postback-options');
    return { validation: args[2], validationGroup: args[3] };
  }
  function validate(options, runtime) {
    if (!options.validation) return;
    if (typeof runtime.Page_ClientValidate !== 'function') throw new Error('native-validation-unavailable');
    if (runtime.Page_ClientValidate(options.validationGroup) !== true || runtime.Page_IsValid === false) throw new Error('native-validation-failed');
  }
  function checkURL(value, base, original, stage, allowed = []) {
    const url = new URL(value, base), start = new URL(original); url.hash = ''; start.hash = '';
    const query = item => { const params = new URLSearchParams(item.search); params.sort(); return params.toString(); };
    const endpoint = item => item.origin === start.origin && item.pathname.toLowerCase() === start.pathname.toLowerCase();
    if (!endpoint(url) || (stage === 'response' && ![start, ...allowed.map(item => new URL(item))].some(item => endpoint(item) && query(item) === query(url)))) {
      throw new Error('response-or-action-url-changed');
    }
    return url.href;
  }
  async function execute(initial, moves, io) {
    let page = initial, state = io.read(page);
    for (let index = 0; index < moves.length; index++) {
      if (io.stopped()) throw new Error('stopped-between-moves');
      const expected = nextState(state, moves[index]);
      page = await io.post(page, moves[index], index);
      const actual = io.read(page);
      if (!equal(order(actual), order(expected))) throw new Error('unexpected-source-order');
      if (!equal(preserved(actual), preserved(expected))) throw new Error('source-details-changed');
      // Native relationship refreshes are explicitly allowed, including when the first source changes.
      state = actual;
      io.verified?.(index, state);
    }
    return page;
  }
  function sourceRows(doc) {
    return [...doc.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value))
      .map(input => ({ slot: input.value, marker: input, row: input.closest('tr') }));
  }
  function read(page) {
    const sources = sourceRows(page.doc).map(({ slot, row }) => {
      const alias = row?.querySelector('input[id*="txtAlias"]');
      if (!alias || !row.cells[0] || !row.cells[2]) throw new Error('source-controls-missing');
      return { slot, alias: alias.value, source: row.cells[0].textContent.trim(), type: row.cells[2].textContent.trim() };
    });
    if (!sources.length || new Set(order({ sources })).size !== sources.length) throw new Error('sources-missing-or-ambiguous');
    return { sources };
  }
  if (typeof document === 'undefined') return { order, preserved, nextState, planMoves, postbackOptions, validate, checkURL, execute, read };
  const RESULT_KEY = 'iqa:source-reorder:result:v1';
  let toolbar = null, mountedMarkers = [], dialog = null, busy = false, stale = false, stopped = false;
  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function button(text, action, className = 'TextButton') {
    const node = element('button', text, className); node.type = 'button'; node.addEventListener('click', action); return node;
  }
  function mount() {
    if (dialog || busy || stale) return;
    const rows = sourceRows(document), markers = rows.map(row => row.marker);
    if (toolbar?.isConnected && markers.length === mountedMarkers.length && markers.every((marker, index) => marker === mountedMarkers[index])) return;
    toolbar?.remove(); toolbar = null; mountedMarkers = [];
    if (!rows.length || !rows[0].row) return;
    const table = rows[0].row.closest('table');
    if (!table || rows.some(item => item.row?.closest('table') !== table)) return;
    let state; try { state = read({ doc: document }); } catch (_) { return; }
    if (!document.getElementById('iqaSourceWorkspaceCss')) {
      const style = element('style'); style.id = 'iqaSourceWorkspaceCss'; style.textContent = CSS; document.head.appendChild(style);
    }
    toolbar = element('div', null, 'iqa-source-toolbar'); mountedMarkers = markers;
    const status = element('span', '', 'iqa-source-feedback'); status.setAttribute('role', 'status');
    const reorder = button('Reorder business objects', () => Busy.run(reorder, openReorder)); reorder.classList.add('iqa-source-reorder-button'); reorder.disabled = state.sources.length < 2;
    toolbar.append(status, reorder); table.before(toolbar);
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null');
      if (saved && Date.now() - saved.at < 120000 && [saved.url, saved.originalURL].includes(location.href.split('#')[0])) {
        status.textContent = equal(order(state), saved.target) ? 'Business-object order applied. Save the query when you are ready.' : 'The refreshed source order differs from the requested order. Review it before saving.';
      }
      sessionStorage.removeItem(RESULT_KEY);
    } catch (_) {}
  }
  function nativeButton(page, slot) {
    const row = sourceRows(page.doc).find(source => source.slot === slot)?.row;
    const move = row?.querySelector('input[type="image"][title="Move Up"]');
    if (!move || move.disabled || !move.name) throw new Error('native-up-button-unavailable');
    if (!move.form || move.form.method.toLowerCase() !== 'post') throw new Error('native-post-form-unavailable');
    return move;
  }
  function openReorder() {
    if (busy || stale || dialog) return;
    const originalURL = location.href.split('#')[0], initial = { doc: document, url: originalURL };
    let initialState;
    try { initialState = read(initial); } catch (_) { return; }
    if (initialState.sources.length < 2) return;
    const baseline = order(initialState);
    stale = false; stopped = false;
    dialog = element('dialog', null, 'iqa-source-reorder-dialog');
    const title = element('h2', 'Reorder business objects'); title.id = 'iqaSourceReorderTitle'; dialog.setAttribute('aria-labelledby', title.id);
    const help = element('p', 'Drag a handle, use Alt + Up / Down, or use the move buttons. Apply order updates the editor; save the query when you are ready.');
    const content = element('div', null, 'iqa-source-reorder-content'), list = element('ol', null, 'iqa-source-reorder-list'); content.appendChild(list);
    const status = element('p', '', 'iqa-source-reorder-status'); status.setAttribute('role', 'status');
    const footer = element('div', null, 'iqa-source-reorder-actions');
    const apply = button('Apply order', applyOrder, 'TextButton PrimaryButton');
    const cancel = button('Cancel', cancelOrder, 'TextButton us-outline-button');
    const listItems = node => [...node.children].filter(item => item.dataset.slot);
    const items = () => listItems(list);
    const target = () => items().map(item => item.dataset.slot);
    const reorder = createPointerReorder({
      surface: dialog, scroller: content, items: listItems, blocked: () => busy || stale,
      onDrop: () => update(),
      classes: { dragging: 'iqa-source-dragging', placeholder: 'iqa-source-placeholder', floating: 'iqa-source-floating' }
    });
    function update() {
      const positions = target(), moves = planMoves(baseline, positions), changed = positions.filter((slot, index) => slot !== baseline[index]).length;
      apply.disabled = !moves.length || moves.length > 100;
      status.textContent = moves.length > 100 ? 'Please apply a smaller rearrangement first.' : changed ? changed + ' positions changed. The editor will refresh once after applying.' : 'No position changes yet.';
      items().forEach((item, index) => {
        item.querySelector('[data-direction="up"]').disabled = index === 0;
        item.querySelector('[data-direction="down"]').disabled = index === positions.length - 1;
        item.querySelector('.iqa-source-position').textContent = String(index + 1);
        item.classList.toggle('iqa-source-moved', baseline[index] !== item.dataset.slot);
      });
    }
    initialState.sources.forEach(source => {
      const item = element('li'); item.dataset.slot = source.slot;
      const name = source.alias || source.source;
      const handle = elFromHTML(`<span class="iqa-source-grip" role="button" tabindex="0">${GRIP_ICON}</span>`);
      handle.title = 'Drag to reorder (or Alt+Up / Alt+Down)'; handle.setAttribute('aria-label', 'Reorder ' + name + '; Alt + Up or Down, or use the move buttons');
      reorder.attach(handle, item, list);
      function move(direction) {
        if (busy || stale) return;
        reorder.cancel();
        if (direction === 'up' && item.previousElementSibling) list.insertBefore(item, item.previousElementSibling);
        if (direction === 'down' && item.nextElementSibling) list.insertBefore(item.nextElementSibling, item);
        update();
      }
      const up = button('Move up', () => move('up'), 'TextButton us-outline-button');
      const down = button('Move down', () => move('down'), 'TextButton us-outline-button');
      up.dataset.direction = 'up'; down.dataset.direction = 'down';
      up.setAttribute('aria-label', 'Move ' + name + ' up'); down.setAttribute('aria-label', 'Move ' + name + ' down');
      handle.addEventListener('keydown', event => {
        if (event.altKey && /^(ArrowUp|ArrowDown)$/.test(event.key)) { event.preventDefault(); move(event.key === 'ArrowUp' ? 'up' : 'down'); handle.focus(); }
      });
      const label = element('span', name, 'iqa-source-name');
      if (source.source !== name) label.appendChild(element('small', source.source));
      item.append(handle, element('span', '', 'iqa-source-position'), label, up, down); list.appendChild(item);
    });
    function close() {
      reorder.cancel(); dialog?.remove(); dialog = null; mount(); document.querySelector('.iqa-source-reorder-button')?.focus();
    }
    function cancelOrder() {
      if (busy) { stopped = true; cancel.disabled = true; status.textContent = 'Stopping after the current move. Completed moves will remain applied.'; }
      else if (stale) location.replace(originalURL);
      else close();
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy && !stale) close(); });
    async function applyOrder() {
      if (busy || stale) return;
      reorder.cancel();
      const requestedOrder = target(), moves = planMoves(baseline, requestedOrder);
      if (!moves.length || moves.length > 100) return;
      const applying = Busy.button(apply);
      busy = true; apply.disabled = true; cancel.textContent = 'Stop after current move'; content.inert = true;
      try {
        if (location.href.split('#')[0] !== originalURL || !equal(read(initial), initialState)) throw new Error('page-changed-since-staging');
        const firstButton = nativeButton(initial, moves[0]);
        const options = postbackOptions(firstButton.getAttribute('onclick') || '', firstButton.name);
        const finalPage = await execute(initial, moves, { read, stopped: () => stopped,
          async post(page, slot, index) {
            const move = nativeButton(page, slot), form = move.form;
            const currentOptions = postbackOptions(move.getAttribute('onclick') || '', move.name);
            if (!equal(currentOptions, options)) throw new Error('validation-options-changed');
            if (location.href.split('#')[0] !== originalURL || !equal(read(initial), initialState)) throw new Error('visible-editor-state-changed');
            validate(currentOptions, window);
            if (page.doc === document && !form.noValidate && !move.formNoValidate && typeof form.checkValidity === 'function' && !form.checkValidity()) throw new Error('html-form-validation-failed');
            const url = checkURL(form.getAttribute('action') || page.url, page.url, originalURL, 'action');
            // Fresh native fields, including any native relationship updates, are carried forward.
            const data = new FormData(form);
            data.set(move.name + '.x', '1'); data.set(move.name + '.y', '1');
            if (data.has('__EVENTTARGET')) data.set('__EVENTTARGET', '');
            if (data.has('__EVENTARGUMENT')) data.set('__EVENTARGUMENT', '');
            data.delete('__ASYNCPOST');
            const body = new URLSearchParams();
            for (const [name, value] of data) {
              if (typeof value === 'string') body.append(name, value);
              else if (value.size > 0) throw new Error('file-upload-present');
            }
            const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
            status.textContent = 'Applying order: ' + Math.round(index / moves.length * 100) + '%…';
            stale = true; // Once requested, an uncertain outcome must never be retried on the old form.
            try {
              const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin', redirect: 'follow', signal: controller.signal, headers: { Accept: 'text/html' } });
              const finalURL = checkURL(response.url, page.url, originalURL, 'response', [url, page.url]);
              if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('non-html-or-error-response');
              const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
              if ([...doc.querySelectorAll('[id$="_ErrorMsgLabel"]')].some(label => label.textContent.trim())) throw new Error('native-source-error');
              return { doc, url: finalURL }; // Response scripts are not inserted or executed.
            } finally { clearTimeout(timer); }
          } });
        try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), originalURL, url: finalPage.url, target: requestedOrder })); } catch (_) {}
        status.textContent = 'Order applied. Refreshing the editor…'; cancel.disabled = true;
        location.replace(finalPage.url);
      } catch (error) {
        applying.clear();
        busy = false; cancel.disabled = false; cancel.textContent = stale ? 'Refresh editor' : 'Close';
        const validation = /validation/.test(error.message);
        status.textContent = stale ? 'The reorder stopped. Refresh the editor to see the current order before continuing.' : validation ? 'Close this window and check the editor’s validation messages before trying again.' : 'The reorder could not start. Close this window and try again.';
        console.warn('[IQA Sources reorder]', /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error');
      }
    }
    footer.append(apply, cancel); dialog.append(title, help, content, status, footer); document.body.appendChild(dialog); update(); dialog.showModal();
  }
  const CSS = `
    .iqa-source-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:16px;flex-wrap:wrap;margin:10px 0 12px}
    .iqa-source-feedback{flex:1;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-dialog{width:min(900px,94vw);max-height:90vh;padding:var(--space-6,24px);box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-base,1.5) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16))}
    .iqa-source-reorder-dialog::backdrop{background:rgb(0 27 35 / .4)}
    .iqa-source-reorder-dialog h2{margin-top:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif)}
    .iqa-source-reorder-content{max-height:55vh;overflow:auto}
    .iqa-source-reorder-list{list-style:none;padding:0;margin:0}
    .iqa-source-reorder-list li{display:flex;align-items:center;gap:var(--space-2,8px);padding:10px 4px;border-bottom:1px solid var(--border,#e2e5e9);flex-wrap:wrap}
    .iqa-source-name{flex:1;min-width:160px;overflow-wrap:anywhere;color:var(--text-strong,#1c2024)}
    .iqa-source-name small{display:block;font-size:var(--fs-xs,12px);color:var(--text-muted,#545962)}
    .iqa-source-position{min-width:20px;text-align:center;font-size:var(--fs-xs,12px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-actions{display:flex;gap:var(--space-3,12px)}
    .iqa-source-reorder-status{min-height:24px;font-size:var(--fs-sm,13px);color:var(--text-muted,#545962)}
    .iqa-source-reorder-list li.iqa-source-moved{background:rgba(0,126,168,.10);background:color-mix(in srgb,var(--border-focus,#006f94) 12%,transparent)}
    .iqa-source-reorder-dialog .iqa-source-grip{display:inline-flex;align-items:center;justify-content:center;flex:none;width:28px;height:28px;padding:0;border:0;border-radius:var(--radius-sm,4px);background:transparent;color:var(--text-muted,#545962);cursor:grab;user-select:none;touch-action:none}
    .iqa-source-reorder-dialog .iqa-source-grip:hover{color:var(--text-link,#006f94);background:var(--bg-sunken,#f1f3f5)}
    .iqa-source-reorder-dialog .iqa-source-grip:active{cursor:grabbing}
    .iqa-source-grip:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-source-grip>svg{display:block;width:18px;height:18px}
    .iqa-source-reorder-dialog.iqa-is-sorting,.iqa-source-reorder-dialog.iqa-is-sorting *{cursor:grabbing!important;user-select:none}
    .iqa-source-reorder-list li.iqa-source-dragging{display:none}
    .iqa-source-reorder-list li.iqa-source-placeholder{box-sizing:border-box;margin:0;padding:0;border:2px dashed var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:transparent}
    .iqa-source-reorder-dialog>li.iqa-source-floating{display:flex;align-items:center;gap:var(--space-2,8px);flex-wrap:wrap;position:fixed;top:0;left:0;z-index:1;box-sizing:border-box;padding:10px 4px;border:1px solid var(--border-focus,#006f94);border-radius:var(--radius-sm,4px);background:var(--bg-surface,#fff);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));opacity:.8;pointer-events:none}
  `;
  return { mount, teardown() {
    if (busy || stale) { stopped = true; return; }
    dialog?.remove(); dialog = null; toolbar?.remove(); toolbar = null; mountedMarkers = [];
    document.getElementById('iqaSourceWorkspaceCss')?.remove();
  } };
}

  const SourceWorkspace = createSourceWorkspace();
  // END SOURCE WORKSPACE V1

  // BEGIN NATIVE BACKGROUND POSTS
/* One native postback built from a page's own form (the visible document or a
 * previous response), with only the named fields changed, for features that run
 * several native steps in the background before one refresh. The response is
 * parsed, never inserted, and its scripts never run. onRequest is called once
 * the request is sent: from then the server may have applied the step even if
 * the fetch fails, so the caller must not retry on the old form.
 */
function createNativePost() {
  function checkURL(value, base, original, stage, allowed = []) {
    const url = new URL(value, base), start = new URL(original); url.hash = ''; start.hash = '';
    const query = item => { const params = new URLSearchParams(item.search); params.sort(); return params.toString(); };
    const endpoint = item => item.origin === start.origin && item.pathname.toLowerCase() === start.pathname.toLowerCase();
    if (!endpoint(url) || (stage === 'response' && ![start, ...allowed.map(item => new URL(item))].some(item => endpoint(item) && query(item) === query(url)))) {
      throw new Error('response-or-action-url-changed');
    }
    return url.href;
  }
  // The target a select's own setTimeout('__doPostBack(…)') onchange posts to.
  function postbackTarget(control) {
    return /__doPostBack\(\\?'([^'\\]+)\\?'/.exec(control?.getAttribute('onchange') || '')?.[1] || null;
  }
  async function post(page, original, { changes = {}, target = '', argument = '', onRequest } = {}) {
    const form = page.doc.querySelector('input[name="__VIEWSTATE"]')?.form;
    if (!form || form.method.toLowerCase() !== 'post') throw new Error('native-post-form-unavailable');
    const url = checkURL(form.getAttribute('action') || page.url, page.url, original, 'action');
    const data = new FormData(form);
    data.delete('__ASYNCPOST');
    data.set('__EVENTTARGET', target); data.set('__EVENTARGUMENT', argument);
    Object.entries(changes).forEach(([name, value]) => data.set(name, value));
    const body = new URLSearchParams();
    for (const [name, value] of data) {
      if (typeof value === 'string') body.append(name, value);
      else if (value.size > 0) throw new Error('file-upload-present');
    }
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 30000);
    onRequest?.();
    try {
      const response = await fetch(url, { method: 'POST', body, credentials: 'same-origin', redirect: 'follow', signal: controller.signal, headers: { Accept: 'text/html' } });
      const finalURL = checkURL(response.url, page.url, original, 'response', [url, page.url]);
      if (!response.ok || !/text\/html/i.test(response.headers.get('content-type') || '')) throw new Error('non-html-or-error-response');
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      if ([...doc.querySelectorAll('[id$="_ErrorMsgLabel"]')].some(label => label.textContent.trim())) throw new Error('native-error-message');
      return { doc, url: finalURL };
    } finally { clearTimeout(timer); }
  }
  return { post, postbackTarget };
}

  const NativePost = createNativePost();
  // END NATIVE BACKGROUND POSTS

  // BEGIN RELATIONSHIP WORKSPACE V1
/* Sources relationship editor. Join by ID, Branchify and Choose fields open
 * the native field controls and add in the background (NativePost), then
 * refresh once, showing the fields in this page's own selects. When the native
 * field controls are already open, and for Predefined relationship, the native
 * controls are used. */
function createRelationshipWorkspace() {
  function editorURL(value, base) {
    const url = new URL(value, base); url.hash = ''; url.searchParams.sort();
    return url.href;
  }
  function makeIntent(data, current, action, at = Date.now()) {
    const original = new URL(current), submitted = new URL(action || current, current);
    const urls = [editorURL(current)];
    if (submitted.origin === original.origin && submitted.pathname === original.pathname) urls.push(editorURL(submitted.href));
    return { ...data, urls: [...new Set(urls)], at };
  }
  function readIntent(saved, current, now = Date.now()) {
    if (!saved || !['id', 'entity', 'fields', 'predefined'].includes(saved.mode) || !Number.isFinite(saved.at) || now - saved.at < 0 || now - saved.at >= 300000) return null;
    try {
      const urls = saved.urls || [saved.url];
      return urls.some(url => typeof url === 'string' && editorURL(url) === editorURL(current)) ? saved : null;
    } catch (_) { return null; }
  }
  function field(value, text) {
    const match = String(value).match(/^(.+\.(SR\d+))\|([^|]+)$/);
    return match ? { value, text, source: match[1], slot: match[2], property: match[3] } : null;
  }
  // Join by ID's key types. A field is a key when its name is the type or ends
  // in it as its own word: ContactId, Contact_Id, Co Id, CreatedByUserKey.
  // Paid and Barcode are not keys, as the ending does not start a word.
  const KEY_TYPES = ['Id', 'Key', 'Code', 'Ordinal'];
  function keyType(name) {
    const text = String(name || '').trim();
    return KEY_TYPES.find(type => {
      const tail = text.slice(-type.length), before = text.charAt(text.length - type.length - 1);
      if (tail.toLowerCase() !== type.toLowerCase()) return false;
      return !before || /[\s_]/.test(before) || /[a-z0-9]/.test(before) && tail[0] === tail[0].toUpperCase();
    }) || '';
  }
  // A field picker item's text is "Alias.Field"; an alias cannot contain a dot.
  const fieldName = item => item.text.slice(item.text.indexOf('.') + 1);
  // Each business object's key fields of one type, in source order: the plain
  // name first (Id before ContactId), then alphabetically.
  function keyFields(fields, sources, type) {
    const plain = item => [item.property, fieldName(item)].some(name => name.trim().toLowerCase() === type.toLowerCase()) ? 0 : 1;
    return sources.flatMap(source => fields
      .filter(item => item.slot === source.slot && (keyType(item.property) || keyType(fieldName(item))) === type)
      .sort((a, b) => plain(a) - plain(b) || fieldName(a).localeCompare(fieldName(b), undefined, { sensitivity: 'base' }))
      .map(item => ({ ...item, alias: source.alias })));
  }
  // The key types a pair can use: those on at least two business objects.
  const keyTypes = (left, right, sources) => KEY_TYPES.filter(type =>
    new Set([...keyFields(left, sources, type), ...keyFields(right, sources, type)].map(item => item.slot)).size > 1);
  // The Branchify tab: a branch code on any other business object, against
  // i4u_UT_EntityAccess's EntityCode (see Branchify).
  const ENTITY_ACCESS = /^_?i4u_UT_EntityAccess$/i, ENTITY_CODE = /^(org_?code|entity_?code)$/i;
  function entityFields(fields, sources, side) {
    return fields.flatMap(item => {
      const source = sources.find(entry => entry.slot === item.slot);
      if (!source) return [];
      const wanted = side === 'access' ? source.access && /^entitycode$/i.test(item.property) : !source.access && ENTITY_CODE.test(item.property);
      return wanted ? [{ ...item, alias: source.alias }] : [];
    });
  }
  function isDuplicate(relations, left, right, type) {
    const normal = text => text.replace(/\s+/g, ' ').trim();
    return relations.some(relation => {
      if (relation.type !== type) return false;
      const match = relation.description.match(/\(When (.+) = (.+)\)$/);
      if (!match) return false;
      const a = normal(match[1]), b = normal(match[2]), l = normal(left), r = normal(right);
      return a === l && b === r || type === 'Equal|AND' && a === r && b === l;
    });
  }
  function comboFields(combo) {
    const items = combo.get_items(), fields = [];
    for (let index = 0; index < items.get_count(); index++) {
      const item = items.getItem(index), entry = field(item.get_value(), item.get_text());
      if (entry && (!item.get_enabled || item.get_enabled())) fields.push(entry);
    }
    return fields;
  }
  function setComboValue(combo, value) {
    const methods = ['findItemByValue', 'get_items', 'trackChanges', 'commitChanges', 'set_selectedItem', 'set_selectedIndex', 'set_text', 'set_value', 'get_value'];
    if (methods.some(method => typeof combo?.[method] !== 'function')) throw new Error('field-control-not-ready');
    const item = combo.findItemByValue(value);
    if (!item || (item.get_enabled && !item.get_enabled())) throw new Error('field-not-available');
    const items = combo.get_items(); let index = -1;
    for (let i = 0; i < items.get_count(); i++) if (items.getItem(i) === item) index = i;
    if (index < 0) throw new Error('field-not-available');
    // Public property setters stage the actual native selection without firing a
    // selection event/postback between the two sides. The native Add submits both.
    combo.trackChanges();
    try {
      combo.set_selectedItem(item); combo.set_selectedIndex(index);
      combo.set_text(item.get_text()); combo.set_value(item.get_value());
    } finally { combo.commitChanges(); }
    if (combo.get_value() !== value) throw new Error('field-selection-failed');
  }
  // A field picker's item list from its startup $create(…, {"itemData":[…]}, …,
  // $get("id")). Responses are parsed, never run, so this is read as text.
  function itemData(scripts, id) {
    for (const text of scripts) {
      let at = text.indexOf('$get("' + id + '")'); if (at < 0) at = text.indexOf("$get('" + id + "')");
      if (at < 0) continue;
      const start = text.lastIndexOf('$create(', at), key = text.indexOf('"itemData":', start);
      if (start < 0 || key < 0 || key > at) continue;
      const open = key + '"itemData":'.length;
      let depth = 0, quoted = false, end = -1;
      for (let i = open; i < at && end < 0; i++) {
        const c = text[i];
        if (quoted) { if (c === '\\') i++; else if (c === '"') quoted = false; }
        else if (c === '"') quoted = true;
        else if (c === '[' || c === '{') depth++;
        else if ((c === ']' || c === '}') && --depth === 0) end = i;
      }
      if (end > open) return JSON.parse(text.slice(open, end + 1));
    }
    return null;
  }
  // A predefined relationship's description starts with its own name instead
  // of "Custom": "FK_Name_Member_Types (When … = …)". iMIS can add one by
  // itself when a source is added, and unless it joins two keys of the same
  // type (Id to Contact Id, Ordinal to Case Ordinal; see keyType) it is often
  // the wrong join, so it is marked for checking.
  function predefinedName(description) {
    const name = (/^(.*?)\s*\(When /.exec(String(description)) || [])[1] || '';
    return name.trim().toLowerCase() === 'custom' ? '' : name.trim();
  }
  // An Exists or Not Exist relation's description ends "… = X.Id Does Exist)"
  // or "… Does Not Exist)"; the field is the part before that.
  const plainField = field => String(field || '').trim().replace(/\s+(?:does\s+)?(?:not\s+)?exists?$/i, '');
  const checkEdge = edge => {
    const left = keyType(plainField(edge.leftField));
    return Boolean(edge.name && !(left && left === keyType(plainField(edge.rightField))));
  };
  // The join graph from the Relations list. Each relationship links the two
  // sources its description names, with the field on each side:
  // "Custom (When Finance.Frequency = _I4u_UT_Lookup_Frequency.Lookup Id)".
  // One whose description cannot be read that way links the two aliases it
  // mentions, without fields. Aliases cannot contain a dot.
  function joinEdges(sources, relations) {
    const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const longestFirst = sources.map((source, index) => ({ alias: source.alias, index })).sort((a, b) => b.alias.length - a.alias.length);
    const sideOf = text => {
      const match = longestFirst.find(entry => text.toLowerCase().startsWith(entry.alias.toLowerCase() + '.'));
      return match ? { index: match.index, field: plainField(text.slice(match.alias.length + 1)) } : null;
    };
    return relations.flatMap((relation, id) => {
      const kind = { id, type: relation.type || '', typeText: relation.typeText || relation.type || '', name: predefinedName(relation.description) };
      const parts = /\(When (.+?) = (.+)\)\s*$/.exec(relation.description);
      const left = parts && sideOf(parts[1].trim()), right = parts && sideOf(parts[2].trim());
      if (left && right && left.index !== right.index) return [{ ...kind, left: left.index, right: right.index, leftField: left.field, rightField: right.field }];
      const named = sources.map((source, index) => new RegExp('(^|[\\s(=])' + escape(source.alias) + '\\.', 'i').test(relation.description) ? index : -1).filter(index => index >= 0);
      return named.length === 2 ? [{ ...kind, left: named[0], right: named[1], leftField: '', rightField: '' }] : [];
    });
  }
  // Trees walked outward from the first source, then from the first source of
  // each group it does not reach, in source order. Each node's joins are taken
  // in source order too, not the order iMIS added them, so the tree reads like
  // the Sources table. Each node keeps the relationship that reached it.
  // A source joined to two sources on one path is a merge: it moves under the
  // deeper one, and the join from the source it was first reached from (an
  // ancestor of its new parent) becomes its merge, drawn as a second line into
  // it. Only joins merge, never Exists or Not Exist filters. Any other
  // relationship between two sources already placed is an "also joined" note
  // on whichever was placed later.
  function joinForest(count, edges) {
    const placed = new Map(), trees = [];
    for (let start = 0; start < count; start++) {
      if (placed.has(start)) continue;
      const root = { index: start, edge: null, parent: null, children: [], also: [], merge: null, order: placed.size };
      placed.set(start, root); trees.push(root);
      for (const queue = [root]; queue.length;) {
        const node = queue.shift();
        edges.map(edge => ({ edge, other: edge.left === node.index ? edge.right : edge.right === node.index ? edge.left : -1 }))
          .filter(item => item.other >= 0).sort((a, b) => a.other - b.other).forEach(({ edge, other }) => {
            if (placed.has(other)) return;
            const child = { index: other, edge, parent: node, children: [], also: [], merge: null, order: placed.size };
            placed.set(other, child); node.children.push(child); queue.push(child);
          });
      }
    }
    const isJoin = edge => !/Exist\|/.test(edge.type);
    const above = (upper, node) => { for (let step = node.parent; step; step = step.parent) if (step === upper) return true; return false; };
    const extra = edge => {
      const a = placed.get(edge.left), b = placed.get(edge.right);
      return a && b && a.edge !== edge && b.edge !== edge && a.merge?.edge !== edge && b.merge?.edge !== edge ? [a, b] : null;
    };
    edges.forEach(edge => {
      const ends = extra(edge);
      if (!ends || !isJoin(edge)) return;
      // The end that moves is the one whose parent is above the other end
      // (and that the other end is not beneath); the later placed if both are.
      const [node, host] = [[ends[0], ends[1]], [ends[1], ends[0]]].sort(([a], [b]) => b.order - a.order)
        .find(([node, host]) => !node.merge && node.edge && isJoin(node.edge) && above(node.parent, host) && !above(node, host)) || [];
      if (!node) return;
      node.merge = { edge: node.edge, other: node.parent.index };
      node.parent.children.splice(node.parent.children.indexOf(node), 1);
      node.edge = edge; node.parent = host;
      host.children.push(node); host.children.sort((a, b) => a.index - b.index);
    });
    edges.forEach(edge => {
      const [a, b] = extra(edge) || [];
      if (!a) return;
      const [earlier, later] = a.order < b.order ? [a, b] : [b, a];
      later.also.push({ edge, other: earlier.index });
    });
    return trees;
  }
  // A left join keeps every row of its left side, so the source on the right
  // is optional. An Equals join beneath an optional source makes it required
  // again: the first source's rows without it are dropped.
  const optionalNode = node => Boolean(node?.edge && /^Left\|/.test(node.edge.type) && node.edge.right === node.index);
  const requiresOptionalParent = node => Boolean(node.edge && node.edge.type === 'Equal|AND' && optionalNode(node.parent));
  if (typeof document === 'undefined') return { field, keyType, keyFields, keyTypes, entityFields, isDuplicate, comboFields, setComboValue, makeIntent, readIntent, itemData, joinEdges, joinForest, optionalNode, requiresOptionalParent, predefinedName, checkEdge };
  const KEY = 'iqa:relationship-intent:v1';

  // The relationship editor in a page or response: the "Predefined relationship"
  // select, whose Custom value opens the field controls.
  function kindSelect(doc) {
    return [...doc.querySelectorAll('select')].find(select => [...select.options].some(option => option.value === 'Custom')
      && [...select.options].some(option => option.value === 'None') && select.closest('tr')?.querySelector('.JoinButton')) || null;
  }
  const relationCount = doc => [...doc.querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).length;
  // A cell's own text, without the tags this editor adds to it.
  const ownText = cell => [...(cell?.childNodes || [])].filter(node => node.nodeType === 3).map(node => node.textContent).join('').replace(/\s+/g, ' ').trim();
  // The field controls in a response with Custom selected: each picker's posted
  // names and items (text from its dropdown list, values from its itemData),
  // the join type and the hidden AddJoin submit that ConfirmCrossJoin clicks.
  function readFieldEditor(doc) {
    const kind = kindSelect(doc);
    if (kind?.value !== 'Custom') throw new Error('field-controls-not-open');
    const row = kind.closest('tr'), scripts = [...doc.querySelectorAll('script')].map(script => script.textContent);
    const type = row.querySelector('select[id$="_mRelationTypeDropDown"]');
    const addJoin = doc.querySelector('input[type="submit"][name$="$AddJoin"]');
    const combos = [...row.querySelectorAll('.RadComboBox[id]')].map(node => {
      const input = node.querySelector('input.rcbInput'), state = doc.getElementById(node.id + '_ClientState');
      const texts = [...(doc.getElementById(node.id + '_DropDown')?.querySelectorAll('li') || [])].map(item => item.textContent.trim());
      const data = itemData(scripts, node.id);
      if (!input?.name || !state?.name || !texts.length || !Array.isArray(data) || data.length !== texts.length) throw new Error('field-list-unreadable');
      const items = texts.map((text, index) => data[index]?.enabled === false ? null : field(data[index]?.value ?? text, text)).filter(Boolean);
      return { inputName: input.name, stateName: state.name, items };
    });
    if (combos.length !== 2 || !type?.name || !addJoin?.name) throw new Error('field-controls-incomplete');
    return { combos, type: { name: type.name, value: type.value, options: [...type.options].map(option => ({ value: option.value, text: option.text })) }, addJoin: { name: addJoin.name, value: addJoin.value } };
  }
  // Background step: select Custom, as the native select's own postback does.
  async function openFieldsInBackground(page, original, onRequest) {
    const kind = kindSelect(page.doc);
    if (!kind?.name) throw new Error('relationship-editor-unavailable');
    if (kind.value !== 'Custom') {
      const target = NativePost.postbackTarget(kind);
      if (!target) throw new Error('relationship-postback-unavailable');
      page = await NativePost.post(page, original, { changes: { [kind.name]: 'Custom' }, target, onRequest });
    }
    return { page, editor: readFieldEditor(page.doc) };
  }
  // Background step: both pickers' text and client state, the join type and the
  // AddJoin submit, as the native Add posts them; one more relationship after.
  async function addInBackground(page, original, editor, left, right, type, onRequest) {
    const changes = { [editor.type.name]: type, [editor.addJoin.name]: editor.addJoin.value };
    [left, right].forEach((item, side) => {
      const combo = editor.combos[side];
      changes[combo.inputName] = item.text;
      changes[combo.stateName] = JSON.stringify({ logEntries: [], value: item.value, text: item.text, enabled: true, checkedIndices: [], checkedItemsTextOverflows: false });
    });
    const before = relationCount(page.doc);
    const next = await NativePost.post(page, original, { changes, onRequest });
    if (relationCount(next.doc) <= before) throw new Error('relationship-not-added');
    return next;
  }
  let mounted = null, undo = [], timer = null;
  function el(tag, text, className) { const node = document.createElement(tag); if (text != null) node.textContent = text; if (className) node.className = className; return node; }
  function listen(node, event, callback) { node.addEventListener(event, callback); undo.push(() => node.removeEventListener(event, callback)); }
  function hide(node, hidden) { node.hidden = hidden; }
  function remember(data) { try { sessionStorage.setItem(KEY, JSON.stringify(makeIntent(data, location.href, mounted?.form?.getAttribute('action')))); } catch (_) {} }
  function forget() { try { sessionStorage.removeItem(KEY); } catch (_) {} }
  function restore() { clearTimeout(timer); timer = null; undo.reverse().forEach(fn => fn()); undo = []; mounted = null; }
  function move(node, target) {
    const parent = node.parentNode, next = node.nextSibling;
    target.appendChild(node); undo.push(() => parent.insertBefore(node, next?.parentNode === parent ? next : null));
  }
  function captureScroll(node) {
    const containers = [];
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (parent.id && (parent.scrollTop || parent.scrollLeft)) containers.push({ id: parent.id, x: parent.scrollLeft, y: parent.scrollTop });
    }
    return { x: window.scrollX, y: window.scrollY, containers };
  }
  function restoreScroll(position) {
    if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    let cancelled = false;
    const timers = [], frames = [];
    const stop = () => {
      cancelled = true; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame);
      ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => window.removeEventListener(event, stop, true));
      window.removeEventListener('load', afterLoad);
    };
    const apply = () => {
      if (cancelled) return;
      for (const saved of Array.isArray(position.containers) ? position.containers : []) {
        const container = document.getElementById(saved.id);
        if (container && Number.isFinite(saved.x) && Number.isFinite(saved.y)) container.scrollTo({ left: saved.x, top: saved.y, behavior: 'instant' });
      }
      window.scrollTo({ left: position.x, top: position.y, behavior: 'instant' });
    };
    const afterLoad = () => { frames.push(requestAnimationFrame(apply)); };
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(event => window.addEventListener(event, stop, { capture: true, passive: true }));
    window.addEventListener('load', afterLoad, { once: true });
    // Native load handlers and Telerik sizing can run after the first layout.
    frames.push(requestAnimationFrame(() => { apply(); frames.push(requestAnimationFrame(apply)); }));
    [100, 350, 800, 1500].forEach(delay => timers.push(setTimeout(apply, delay)));
    timers.push(setTimeout(stop, 1800));
    undo.push(stop); // Never keep scrolling after teardown or user interaction.
  }
  function mount() {
    const kind = [...document.querySelectorAll('select')].find(select => [...select.options].some(option => option.value === 'Custom')
      && [...select.options].some(option => option.value === 'None') && select.closest('tr')?.querySelector('.JoinButton'));
    if (mounted === kind && kind?.isConnected) return;
    restore(); if (!kind) return;
    const row = kind.closest('tr'), nativeAdd = row.querySelector('.JoinButton'), cell = row.cells[0];
    if (!nativeAdd || !cell || row.cells.length !== 2) return;
    mounted = kind;
    if (!document.getElementById('iqaRelationshipCss')) { const style = el('style'); style.id = 'iqaRelationshipCss'; style.textContent = CSS; document.head.appendChild(style); }
    const originalSpan = cell.colSpan, originalActionHidden = row.cells[1].hidden;
    cell.colSpan = 4; row.cells[1].hidden = true;
    undo.push(() => { cell.colSpan = originalSpan; row.cells[1].hidden = originalActionHidden; });
    const panel = el('section', null, 'iqa-relationship-editor'), heading = el('h3', 'Add relationship');
    const modes = el('div', null, 'iqa-relationship-modes'); modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'How to add a relationship');
    const message = el('p', 'Choose how you want to connect your business objects.', 'iqa-relationship-message'); message.setAttribute('role', 'status');
    const predefined = el('div'), custom = el('div', null, 'iqa-relationship-fields'), idPanel = el('div', null, 'iqa-relationship-ids');
    const leftBox = el('div'), typeBox = el('div'), rightBox = el('div');
    function labelBox(box, text, input) { const label = el('label', text); if (input?.id) label.htmlFor = input.id; box.appendChild(label); }
    const combos = [...row.querySelectorAll('.RadComboBox')];
    const nativeType = row.querySelector('select[id$="_mRelationTypeDropDown"]');
    if (kind.value === 'Custom' && (combos.length !== 2 || !nativeType)) { restore(); return; }
    const kindParent = kind.parentNode, kindHidden = kindParent.hidden; undo.push(() => { kindParent.hidden = kindHidden; });
    // Move wrappers, not individual Telerik inputs, retaining IDs, hidden state and native handlers.
    if (combos.length === 2 && nativeType) {
      labelBox(leftBox, 'Left field', combos[0].querySelector('input.rcbInput')); move(combos[0].parentNode, leftBox);
      labelBox(typeBox, 'Join type', nativeType); move(nativeType.parentNode, typeBox);
      labelBox(rightBox, 'Right field', combos[1].querySelector('input.rcbInput')); move(combos[1].parentNode, rightBox);
    }
    labelBox(predefined, 'Predefined relationship', kind); move(kindParent, predefined);
    const originalOptionHidden = [...kind.options].map(option => option.hidden);
    [...kind.options].forEach(option => { if (option.value === 'Custom') option.hidden = true; });
    const blank = [...kind.options].find(option => option.value === 'None'), blankText = blank?.text;
    if (blank) blank.text = 'Select a relationship';
    undo.push(() => { [...kind.options].forEach((option, i) => { option.hidden = originalOptionHidden[i]; }); if (blank) blank.text = blankText; });
    const leftID = el('select'), rightID = el('select'); leftID.id = 'iqaJoinIdLeft'; rightID.id = 'iqaJoinIdRight';
    // Join by ID's key type (Id, Key, Code, Ordinal) filters both field selects.
    const keySelect = el('select'), keyBox = el('div'); keySelect.id = 'iqaJoinKeyType';
    labelBox(keyBox, 'Key type', keySelect); keyBox.appendChild(keySelect);
    const idLeftBox = el('div'), idRightBox = el('div'); labelBox(idLeftBox, 'Left business object', leftID); labelBox(idRightBox, 'Right business object', rightID);
    idLeftBox.appendChild(leftID); idRightBox.appendChild(rightID); idPanel.append(keyBox, idLeftBox, idRightBox);
    const leftLabel = idLeftBox.querySelector('label'), rightLabel = idRightBox.querySelector('label');
    // Source rows, read once: their alias and whether each is i4u_UT_EntityAccess.
    const sourceRows = [...row.closest('table').querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value)).map(input => {
      const sourceRow = input.closest('tr'), alias = sourceRow.querySelector('input[id*="txtAlias"]')?.value || input.value;
      const name = (sourceRow.cells[0]?.textContent || '').replace(/\s+/g, ' ').trim();
      return { slot: input.value, alias, name, access: ENTITY_ACCESS.test(name) || ENTITY_ACCESS.test(alias) };
    });
    const hasAccess = sourceRows.some(source => source.access);
    const pairModes = hasAccess ? ['id', 'entity'] : ['id'], isPair = value => pairModes.includes(value);
    custom.append(leftBox, typeBox, rightBox);
    const preview = el('div', '', 'iqa-relationship-preview'); preview.setAttribute('aria-live', 'polite');
    const add = el('button', 'Add relationship', 'TextButton'); add.type = 'button';
    const actions = el('div', null, 'iqa-relationship-actions'); actions.append(preview, add);
    panel.append(heading, modes, message, predefined, idPanel, custom, actions); cell.appendChild(panel); undo.unshift(() => panel.remove());
    // The Filters tab's type-to-search picker over both field selects. It reads
    // their options when opened; its shown value is re-synced after each fill.
    const syncPickers = [leftID, rightID].map(select => {
      FilterSortDropdowns._create(select, 'Select a field');
      const item = FilterSortDropdowns._items.find(entry => entry.select === select);
      undo.push(() => { item?.dispose(); FilterSortDropdowns._items = FilterSortDropdowns._items.filter(entry => entry !== item); });
      return () => item?.sync();
    });
    let intent = null;
    try { intent = readIntent(JSON.parse(sessionStorage.getItem(KEY) || 'null'), location.href); } catch (_) {}
    // Keep the choice through repeated native refreshes/remounts, not just the
    // first render. Add or Enhance-off clears it; expired/other-editor state is ignored.
    if (!intent) forget();
    const scrollToRestore = intent?.scroll;
    if (scrollToRestore) remember({ ...intent, scroll: null }); // One navigation only.
    let mode = kind.value === 'Custom' ? isPair(intent?.mode) ? intent.mode : 'fields' : kind.value !== 'None' ? 'predefined' : '';
    let freshFields = intent?.freshFields === true;
    let keyKind = KEY_TYPES.includes(intent?.keyType) ? intent.keyType : 'Id';
    let clients = null, initialized = false, loading = false, loadFailed = false, loadingTimer = null, pendingScroll = null;
    undo.push(() => clearTimeout(loadingTimer));
    const buttons = new Map();
    // The field controls opened in the background for Join by ID and Join by
    // entity, when the visible page does not have them: the response page and
    // its pickers. The join type is then this page's own select, filled from it.
    let remote = null, adding = false, failed = false;
    const ownType = el('select'); ownType.id = 'iqaJoinType';
    const fieldsFor = side => clients ? comboFields(clients[side]) : remote ? remote.editor.combos[side].items : [];
    const typeControl = () => clients ? nativeType : remote ? ownType : null;
    // Modes shown in this page's pair of field selects: Join by ID, Join by
    // entity, and Choose fields unless the native pickers are open.
    const paired = value => isPair(value) || value === 'fields' && !clients;
    // Field choices for Join by ID and the Branchify tab, built once the field
    // controls load; the shared pair of selects shows the current mode's.
    // Join by ID has a list per key type; the Key type select offers only the
    // types at least two of this query's business objects have.
    let pairOptions = null, filledFor = null;
    const fillKey = () => mode === 'id' ? 'id:' + keyKind : mode;
    const pairList = side => mode === 'id' ? pairOptions.id[keyKind]?.[side] || [] : pairOptions[mode][side];
    function buildPairs() {
      const left = fieldsFor(0), right = fieldsFor(1);
      const options = (list, label) => list.map(entry => ({ value: entry.value, label: entry.alias + ' · ' + label(entry) }));
      // Choose fields: every field, grouped by business object.
      const everyField = list => list.map(entry => ({ value: entry.value, label: entry.text, group: sourceRows.find(source => source.slot === entry.slot)?.alias || entry.slot }));
      const types = keyTypes(left, right, sourceRows);
      keySelect.replaceChildren(...types.map(type => { const option = el('option', type); option.value = type; return option; }));
      if (!types.includes(keyKind)) keyKind = types[0] || 'Id';
      keySelect.value = keyKind;
      pairOptions = {
        id: Object.fromEntries(types.map(type => [type, [keyFields(left, sourceRows, type), keyFields(right, sourceRows, type)].map(list => options(list, fieldName))])),
        entity: [entityFields(left, sourceRows, 'other'), entityFields(right, sourceRows, 'access')].map(list => options(list, entry => entry.property)),
        fields: [everyField(left), everyField(right)]
      };
      filledFor = null;
    }
    // Join by ID keeps each side's business object when the key type changes,
    // on its plain field (Id before ContactId), where it has that type.
    function fillPairs() {
      if (!pairOptions || !paired(mode) || filledFor === fillKey()) return;
      const before = filledFor?.startsWith('id:') && mode === 'id' ? [sourceOf(leftID.value), sourceOf(rightID.value)] : null;
      filledFor = fillKey();
      [leftID, rightID].forEach((select, side) => {
        const nodes = [], groups = new Map();
        // Choose fields starts unselected, so both fields are a deliberate choice.
        if (mode === 'fields') { const blank = el('option', 'Select a field'); blank.value = ''; nodes.push(blank); }
        for (const entry of pairList(side)) {
          const option = el('option', entry.label); option.value = entry.value;
          if (!entry.group) { nodes.push(option); continue; }
          if (!groups.has(entry.group)) { const group = el('optgroup'); group.label = entry.group; groups.set(entry.group, group); nodes.push(group); }
          groups.get(entry.group).appendChild(option);
        }
        select.replaceChildren(...nodes);
      });
      // Each side shows its saved field, or after a key type change the business
      // object it showed before. Join by ID's right side otherwise starts on the
      // first business object the left side does not have.
      const saved = intent?.mode === mode && (mode !== 'id' || intent.keyType === keyKind) ? intent : null;
      const find = (select, test) => [...select.options].find(option => option.value && test(option.value))?.value;
      const left = before ? find(leftID, value => sourceOf(value) === before[0]) : find(leftID, value => value === saved?.left);
      if (left) leftID.value = left;
      const right = before ? find(rightID, value => sourceOf(value) === before[1] && before[1] !== sourceOf(leftID.value)) : find(rightID, value => value === saved?.right);
      if (right) rightID.value = right;
      else if (mode === 'id') rightID.value = find(rightID, value => sourceOf(value) !== sourceOf(leftID.value)) || rightID.value;
      separate(leftID);
      applyPreselect();
    }
    // A join started from the tree's "+ Join": Join by ID with that business
    // object on the right and the first source on the left, once the field
    // selects are filled. Without a field of the current key type it moves to
    // the first key type the business object has, and without any key field
    // it opens Choose fields instead.
    let preselect = null;
    function joinFrom(slot) {
      preselect = { slot };
      if (mode === 'id') applyPreselect(); else choose('id');
      panel.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }
    function applyPreselect() {
      if (!preselect || !paired(mode) || filledFor !== fillKey() || !leftID.options.length) return;
      const slot = preselect.slot;
      const option = (select, wanted) => [...select.options].find(item => item.value && field(item.value, '')?.slot === wanted);
      if (mode === 'id' && !option(rightID, slot)) {
        const type = Object.keys(pairOptions.id).find(type => pairOptions.id[type][1].some(entry => field(entry.value, '')?.slot === slot));
        if (type) { keyKind = keySelect.value = type; fillPairs(); return; }
        preselect = null; choose('fields'); return;
      }
      preselect = null;
      if (mode !== 'id') return;
      rightID.value = option(rightID, slot).value;
      const first = option(leftID, sourceRows[0].slot);
      // The left side flashes only when this changed it; it often already
      // shows the first source.
      const filled = [rightID];
      if (first && sourceRows[0].slot !== slot && leftID.value !== first.value) { leftID.value = first.value; filled.push(leftID); }
      separate(rightID); persist(); render();
      // Each prefilled picker flashes an accent outline to show what changed.
      filled.forEach(select => {
        const picker = select.previousElementSibling?.matches('.iqa-field-picker') ? select.previousElementSibling : select;
        picker.classList.remove('iqa-prefill-flash'); void picker.offsetWidth;
        picker.classList.add('iqa-prefill-flash');
        setTimeout(() => picker.classList.remove('iqa-prefill-flash'), 1600);
      });
    }
    // A business object cannot be joined to itself, so each side hides the
    // business object chosen on the other. Choosing one the other side already
    // has moves that side to its first remaining choice (or back to blank).
    const sourceOf = value => field(value, '')?.source || '';
    function separate(changed) {
      const other = changed === leftID ? rightID : leftID, taken = sourceOf(changed.value);
      if (taken && sourceOf(other.value) === taken) {
        const next = [...other.options].find(option => !option.value ? mode === 'fields' : sourceOf(option.value) !== taken);
        other.value = next ? next.value : '';
      }
      [[leftID, rightID], [rightID, leftID]].forEach(([select, opposite]) => {
        const used = sourceOf(opposite.value);
        [...select.options].forEach(option => { option.hidden = Boolean(used && option.value && sourceOf(option.value) === used); });
      });
      syncPickers.forEach(sync => sync());
    }
    function persist() { remember({ mode, keyType: keyKind, left: leftID.value, right: rightID.value, freshFields, scroll: pendingScroll }); }
    // The native switch to the field controls: a postback that reloads the editor.
    function openNative(next) {
      pendingScroll = captureScroll(kind);
      freshFields = next === 'fields' && kind.value === 'None';
      loading = true; render();
      loadingTimer = setTimeout(() => {
        loading = false; loadFailed = true; render();
        message.textContent = 'The field editor has not finished loading. Refresh the editor if it does not open.';
      }, 30000);
      persist(); kind.value = 'Custom'; kind.dispatchEvent(new Event('change', { bubbles: true }));
      message.textContent = 'Opening the field controls…'; add.disabled = true;
    }
    // The same switch in the background, for the pair modes: no reload. If the
    // response cannot be read, the native switch is used instead.
    async function openRemote() {
      loading = true; render();
      const original = location.href.split('#')[0];
      try {
        remote = { original, ...(await openFieldsInBackground({ doc: document, url: original }, original)) };
        ownType.replaceChildren(...remote.editor.type.options.filter(option => option.value !== 'Cross|AND').map(option => {
          const item = el('option', option.text); item.value = option.value; return item;
        }));
        ownType.value = remote.editor.type.value;
        if (!ownType.isConnected) { typeBox.replaceChildren(); labelBox(typeBox, 'Join type', ownType); typeBox.appendChild(ownType); }
        buildPairs();
        loading = false; persist(); render();
      } catch (error) {
        remote = null; loading = false;
        console.warn('[IQA relationships] background field controls unavailable:', /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error');
        openNative(mode);
      }
    }
    function choose(next) {
      if (loading || adding) return;
      mode = next;
      if (next !== 'predefined' && kind.value !== 'Custom') {
        if (!remote) { openRemote(); return; }
      }
      if (next === 'predefined' && kind.value === 'Custom') kind.value = 'None';
      persist();
      render();
    }
    // Predefined relationship is offered only when the native select has one.
    const hasPredefined = [...kind.options].some(option => !['None', 'Custom'].includes(option.value));
    const modeButtons = [['id', 'Join by ID'], ...(hasAccess ? [['entity', 'Branchify']] : []), ['fields', 'Choose fields'], ...(hasPredefined ? [['predefined', 'Predefined relationship']] : [])];
    for (const [value, text] of modeButtons) {
      const button = el('button', text); button.type = 'button'; listen(button, 'click', () => choose(value)); buttons.set(value, button); modes.appendChild(button);
    }
    function relationships() { return [...row.closest('table').querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).map(input => {
      const relation = input.closest('tr'), select = relation.querySelector('select');
      return { description: ownText(relation.cells[0]), type: select?.value, typeText: select?.selectedOptions[0]?.text.trim() || '' };
    }); }
    function selectedPair() {
      if (paired(mode)) return [fieldsFor(0).find(item => item.value === leftID.value), fieldsFor(1).find(item => item.value === rightID.value)];
      if (!clients) return null;
      return clients.map(combo => comboFields(combo).find(item => item.value === combo.get_value() && item.text === combo.get_text()));
    }
    function render() {
      if (failed) return;
      const pending = loading || paired(mode) && !clients && !remote && !loadFailed;
      buttons.forEach((button, key) => {
        button.setAttribute('aria-pressed', String(mode === key));
        button.setAttribute('aria-busy', String(key === mode && pending));
        button.classList.toggle('iqa-relationship-loading', key === mode && pending);
        button.disabled = loading || adding || key === mode && pending;
      });
      if (paired(mode) && typeBox.parentNode !== idPanel) idPanel.insertBefore(typeBox, idRightBox);
      if (!paired(mode) && typeBox.parentNode !== custom) custom.insertBefore(typeBox, rightBox);
      hide(predefined, mode !== 'predefined'); hide(kindParent, mode !== 'predefined'); hide(idPanel, !paired(mode)); hide(custom, mode !== 'fields' || !clients);
      const keyed = mode === 'id' && keySelect.options.length > 0;
      hide(keyBox, !keyed); idPanel.classList.toggle('has-key-type', keyed);
      leftLabel.textContent = mode === 'entity' ? 'Business object field' : 'Left field';
      rightLabel.textContent = mode === 'entity' ? 'Entity access field' : 'Right field';
      hide(actions, !mode); add.disabled = true; add.textContent = 'Add relationship'; preview.textContent = '';
      if (loading) { message.textContent = 'Opening the field controls…'; return; }
      if (!mode) return;
      if (mode === 'predefined') {
        message.textContent = 'Use a relationship already defined for these business objects.';
        add.disabled = !kind.value || ['None', 'Custom'].includes(kind.value);
        if (!add.disabled) preview.textContent = kind.options[kind.selectedIndex]?.text || '';
        return;
      }
      message.textContent = mode === 'id' ? 'Connect one pair by a key field. Review the fields and join type, then add.'
        : mode === 'entity' ? 'Join a business object’s branch code to i4u_UT_EntityAccess. Review the fields and join type, then add.'
        : 'Choose a field from each business object and the join type.';
      if (!clients && !(remote && paired(mode))) {
        if (paired(mode)) message.textContent = loadFailed ? 'The field controls are unavailable. Refresh the editor and try again.' : 'Loading available fields…';
        else add.disabled = combos.length !== 2 || !nativeType || nativeAdd.disabled === true;
        return;
      }
      if (adding) { message.textContent = 'Adding the relationship…'; return; }
      fillPairs();
      const pair = selectedPair();
      if (paired(mode) && (!leftID.options.length || !rightID.options.length)) {
        message.textContent = mode === 'entity' ? 'No OrgCode, Org_Code, EntityCode or Entity_Code field to join to EntityCode. Use Choose fields instead.'
          : mode === 'fields' ? 'No fields are available to join.' : 'No two business objects have an Id, Key, Code or Ordinal field. Use Choose fields instead.';
        return;
      }
      if (!pair?.every(Boolean)) return;
      if (pair[0].source === pair[1].source) { preview.textContent = 'Choose two different business objects.'; return; }
      const typeSelect = typeControl(), type = typeSelect.value, label = typeSelect.options[typeSelect.selectedIndex]?.text || type;
      preview.textContent = pair[0].text + '  ·  ' + label + '  ·  ' + pair[1].text;
      const duplicate = isDuplicate(relationships(), pair[0].text, pair[1].text, type);
      add.disabled = duplicate || (!remote || clients) && nativeAdd.disabled === true;
      if (duplicate) add.textContent = 'Already joined';
    }
    // Add in the background from the field controls opened there, then refresh
    // once. Any failure after the request stops here and offers a refresh.
    async function addRemote(pair) {
      adding = true; render();
      const working = Busy.button(add);
      try {
        const page = await addInBackground(remote.page, remote.original, remote.editor, pair[0], pair[1], ownType.value);
        forget();
        message.textContent = 'Relationship added. Refreshing the editor…';
        location.replace(page.url);
      } catch (error) {
        working.clear(); failed = true;
        console.warn('[IQA relationships] background add failed:', /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error');
        message.textContent = 'The relationship could not be added. Refresh the editor to see the current relationships before trying again.';
        add.textContent = 'Refresh editor'; add.disabled = false;
      }
    }
    listen(ownType, 'change', render);
    listen(keySelect, 'change', () => { keyKind = keySelect.value; fillPairs(); persist(); render(); });
    listen(leftID, 'change', () => { separate(leftID); persist(); render(); }); listen(rightID, 'change', () => { separate(rightID); persist(); render(); });
    listen(kind, 'change', () => { pendingScroll ||= captureScroll(kind); mode = kind.value === 'Custom' ? isPair(mode) ? mode : 'fields' : 'predefined'; persist(); render(); });
    if (nativeType) listen(nativeType, 'change', () => { pendingScroll = captureScroll(nativeType); persist(); render(); });
    listen(add, 'click', () => {
      if (failed) { location.replace(location.href.split('#')[0]); return; }
      if (adding) return;
      render(); if (add.disabled) return;
      if (paired(mode) && remote && !clients) { addRemote(selectedPair()); return; }
      if (isPair(mode)) {
        try {
          setComboValue(clients[0], leftID.value); setComboValue(clients[1], rightID.value);
        } catch (_) { message.textContent = 'The field selection could not be prepared. Use Choose fields to select the fields directly.'; return; }
      }
      forget();
      // Preserve ConfirmCrossJoin, native validation and its actual submit target.
      nativeAdd.click();
    });
    function hydrate(attempt = 0) {
      if (mounted !== kind || !kind.isConnected || combos.length !== 2 || !nativeType) return;
      const found = combos.map(node => typeof window.$find === 'function' ? window.$find(node.id) : null);
      if (found.some(combo => !combo || typeof combo.get_items !== 'function')) {
        if (attempt < 30) timer = setTimeout(() => hydrate(attempt + 1), 250);
        else { loadFailed = true; render(); }
        return;
      }
      clients = found;
      if (!initialized) {
        if (freshFields) {
          clients.forEach(combo => {
            // Only clear iMIS's initial defaults for an explicitly requested NEW
            // custom relationship. Existing draft selections are left intact.
            if (['trackChanges', 'commitChanges', 'set_selectedItem', 'set_selectedIndex', 'set_text', 'set_value'].every(method => typeof combo[method] === 'function')) {
              combo.trackChanges();
              try { combo.set_selectedItem(null); combo.set_selectedIndex(-1); combo.set_text(''); combo.set_value(''); }
              finally { combo.commitChanges(); }
              const input = combo.get_inputDomElement?.();
              if (input) { const placeholder = input.getAttribute('placeholder'); input.setAttribute('placeholder', 'Select a field'); undo.push(() => { if (placeholder === null) input.removeAttribute('placeholder'); else input.setAttribute('placeholder', placeholder); }); }
            }
          });
          freshFields = false;
        }
        buildPairs();
        clients.forEach(combo => {
          const changed = () => { persist(); render(); };
          if (typeof combo.add_selectedIndexChanged === 'function' && typeof combo.remove_selectedIndexChanged === 'function') {
            combo.add_selectedIndexChanged(changed); undo.push(() => combo.remove_selectedIndexChanged(changed));
          }
          const input = combo.get_inputDomElement?.(); if (input) listen(input, 'input', render);
          combo.repaint?.();
        });
        initialized = true;
        fillPairs();
        if (intent) persist(); // Preserve resolved pair choices, but do not re-clear fresh fields.
      }
      render();
    }
    // Improve existing rows without replacing any native relationship fields/actions.
    const table = row.closest('table');
    [...table.querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).forEach(input => {
      const relation = input.closest('tr'), select = relation.querySelector('select'); relation.classList.add('iqa-existing-relationship');
      undo.push(() => relation.classList.remove('iqa-existing-relationship'));
      // Predefined relationships are tagged; one not joining two keys of the same
      // type is marked for checking. An alias cannot contain a dot, so each field follows it.
      const description = ownText(relation.cells[0]), name = predefinedName(description);
      if (name && relation.cells[0]) {
        const sides = /\(When (.+?) = (.+)\)\s*$/.exec(description);
        const fieldOf = side => plainField(side.slice(side.indexOf('.') + 1));
        const check = checkEdge({ name, leftField: sides ? fieldOf(sides[1]) : '', rightField: sides ? fieldOf(sides[2]) : '' });
        // Drawn from an attribute, so the description text stays readable.
        const cell = relation.cells[0];
        cell.setAttribute('data-iqa-tag', check ? 'Predefined: check' : 'Predefined');
        cell.title = check ? 'Added from a predefined relationship and not joined key to key. Check it is the join you want.' : 'Added from a predefined relationship.';
        relation.classList.add(check ? 'iqa-relation-check' : 'iqa-relation-predefined');
        undo.push(() => { cell.removeAttribute('data-iqa-tag'); cell.removeAttribute('title'); relation.classList.remove('iqa-relation-check', 'iqa-relation-predefined'); });
      }
      if (select) { const old = select.getAttribute('aria-label'); select.setAttribute('aria-label', 'Relationship join type'); undo.push(() => { if (old === null) select.removeAttribute('aria-label'); else select.setAttribute('aria-label', old); }); }
    });
    // The join graph from the Relations list (joinEdges), walked from the first
    // source (joinForest). It drives both the source-row markers and the tree.
    const forest = sourceRows.length > 1 ? joinForest(sourceRows.length, joinEdges(sourceRows, relationships())) : [];
    const rootAlias = sourceRows[0]?.alias || '';
    const linked = index => forest.some(function has(node) { return node.index === index && Boolean(node.edge || node.children.length) || node.children.some(has); });
    // While iMIS warns that one or more sources have no relation, mark each
    // source the first one does not reach: with no relationship at all, or
    // joined only within a separate group.
    const warning = [...document.querySelectorAll('div, span, p, td')].find(node => !node.children.length
      && /do not have a Relation defined/i.test(node.textContent) && node.offsetParent !== null);
    if (warning) {
      forest.slice(1).forEach(function mark(node) {
        const source = sourceRows[node.index];
        const sourceRow = [...table.querySelectorAll('input[type="hidden"]')].find(input => input.value === source.slot)?.closest('tr');
        // Drawn from an attribute, so the cell's text (read elsewhere as the
        // business object's name) stays as iMIS rendered it.
        // In Tree view it is only a small !, the tree showing the detail; the
        // List view keeps the amber row and the tag's words.
        if (sourceRow?.cells[0]) {
          const cell = sourceRow.cells[0], text = linked(node.index) ? 'Not joined to ' + rootAlias : 'No relationship';
          cell.setAttribute('data-iqa-tag', text); cell.title = text;
          sourceRow.classList.add('iqa-source-unrelated');
          undo.push(() => { sourceRow.classList.remove('iqa-source-unrelated'); cell.removeAttribute('data-iqa-tag'); cell.removeAttribute('title'); });
        }
        node.children.forEach(mark);
      });
    }
    // Relations: a join tree (the default) or iMIS's own list, switched in the
    // Relations heading and remembered in this browser. The tree has one line
    // per business object, branching from the first source: solid lines must
    // match (Equals), dashed are optional (Left join), dotted filter (Exists)
    // or exclude (Not exist). Groups the first source does not reach follow in
    // an amber block. Each relationship's own join type select and Remove
    // button are moved from its row onto its tree line, and back for the list,
    // so every change is still iMIS's own postback.
    if (forest.length) {
      let warnings = 0;
      const relationRows = [...table.querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value)).map(input => input.closest('tr'));
      const fieldsOf = (edge, from) => !edge.leftField ? '' : edge.left === from ? edge.leftField + ' = ' + edge.rightField : edge.rightField + ' = ' + edge.leftField;
      // Exists and Not Exist are WHERE [NOT] EXISTS subqueries, not joins: the
      // source filters the rows above it and adds no columns. Not Exist keeps
      // only rows with no match, so it is drawn as an exclusion.
      const kindOf = edge => /^Left\|/.test(edge.type) ? ' is-optional' : /^NotExist\|/.test(edge.type) ? ' is-exclude' : /^Exist\|/.test(edge.type) ? ' is-filter' : '';
      const filterSentence = (edge, parent, child) => {
        const fields = fieldsOf(edge, parent), or = /\|OR$/.test(edge.type) ? 'Or: only ' : 'Only ';
        return or + sourceRows[parent].alias + (/^NotExist\|/.test(edge.type) ? ' with no matching ' : ' with a matching ')
          + sourceRows[child].alias + (fields ? ' (' + fields + ')' : '');
      };
      const pill = edge => el('span', edge.typeText || edge.type, 'iqa-join-pill' + kindOf(edge));
      const predefinedTag = edge => {
        const tag = el('span', checkEdge(edge) ? 'Predefined: check' : 'Predefined', 'iqa-relation-tag' + (checkEdge(edge) ? ' is-check' : ''));
        tag.title = edge.name; return tag;
      };
      const checkText = (edge, from) => {
        const fields = fieldsOf(edge, from);
        return 'Predefined relationship ' + edge.name + (fields ? ' joins ' + fields : '') + ', not key to key. Check it is the join you want.';
      };
      // A warning is an amber ! on its line, with the sentence as its tooltip;
      // the summary's "N warnings" shows or hides every sentence under its line.
      const warningIcons = [];
      function addWarning(wrap, line, text) {
        warnings++;
        const icon = el('button', '!', 'iqa-join-alert'); icon.type = 'button';
        icon.title = text; icon.setAttribute('aria-label', 'Warning: ' + text);
        line.insertBefore(icon, line.querySelector(':scope > .iqa-join-type, :scope > .iqa-join-add'));
        warningIcons.push(icon);
        wrap.appendChild(el('div', text, 'iqa-join-warning'));
      }
      // A relationship's native controls, placed into slots on its tree line.
      // Without a select (an unexpected row) the type shows as a pill instead.
      const controls = [], used = new Set(), kinds = new Set();
      function relationControls(id, kind, edge) {
        used.add(id); if (edge) kinds.add(kind);
        const row = relationRows[id], type = row?.querySelector('select'), remove = row?.querySelector('input[type="image"][title="Remove"]');
        const typeSlot = el('span', null, 'iqa-join-type' + kind), removeSlot = el('span', null, 'iqa-join-remove');
        [[type, typeSlot], [remove, removeSlot]].forEach(([node, slot]) => {
          if (node) controls.push({ node, slot, parent: node.parentNode, next: node.nextSibling });
        });
        if (!type && edge) typeSlot.appendChild(pill(edge));
        return { typeSlot, removeSlot };
      }
      // "+ Join" on a business object the first source does not reach starts
      // a relationship for it in Add relationship below.
      function joinButton(index) {
        const button = el('button', 'Join', 'iqa-join-add'); button.type = 'button';
        button.setAttribute('aria-label', 'Add a relationship for ' + sourceRows[index].alias);
        listen(button, 'click', () => joinFrom(sourceRows[index].slot));
        return button;
      }
      const lineBySource = new Map(), wrapBySource = new Map(), merges = [];
      function branch(node, groupRoot) {
        const source = sourceRows[node.index];
        const wrap = el('div', null, node.edge ? 'iqa-join-branch' + kindOf(node.edge) : 'iqa-join-root');
        const line = el('div', null, 'iqa-join-node');
        lineBySource.set(node.index, line); wrapBySource.set(node.index, wrap);
        // A filter adds no columns, so its name is muted; Not Exist also gets ⊘.
        const filterName = !node.edge ? '' : /^NotExist\|/.test(node.edge.type) ? ' is-excluded' : /^Exist\|/.test(node.edge.type) ? ' is-filtered' : '';
        line.append(el('span', source.alias, 'iqa-join-name' + filterName));
        if (source.name && source.name.toLowerCase() !== source.alias.toLowerCase()) line.append(el('span', source.name, 'iqa-join-object'));
        if (node.edge) {
          const slots = relationControls(node.edge.id, kindOf(node.edge), node.edge);
          const filter = /Exist\|/.test(node.edge.type), fields = fieldsOf(node.edge, node.parent.index);
          if (filter) line.append(el('span', filterSentence(node.edge, node.parent.index, node.index), 'iqa-join-fields'));
          else if (fields) line.append(el('span', fields, 'iqa-join-fields'));
          if (node.edge.name) line.append(predefinedTag(node.edge));
          line.append(slots.typeSlot, slots.removeSlot);
        } else if (node.index === 0) line.append(el('span', 'first source', 'iqa-join-fields'));
        else {
          if (!node.children.length) line.append(el('span', 'No relationship', 'iqa-join-fields'));
          line.append(joinButton(node.index));
        }
        wrap.appendChild(line);
        if (node.edge && checkEdge(node.edge)) addWarning(wrap, line, checkText(node.edge, node.parent.index));
        if (requiresOptionalParent(node)) {
          addWarning(wrap, line, 'Equals under a left join: ' + sourceRows[groupRoot.index].alias + ' rows with no '
            + sourceRows[node.parent.index].alias + ' are dropped.');
        }
        // A merge's own row, under the line it joins into; drawMerges draws
        // its line from the source above.
        if (node.merge) {
          const { edge, other } = node.merge, fields = fieldsOf(edge, other);
          const row = el('div', null, 'iqa-join-note iqa-join-merge'), slots = relationControls(edge.id, kindOf(edge), edge);
          row.append('Also joined to ' + sourceRows[other].alias);
          if (fields) row.append(el('span', fields, 'iqa-join-fields'));
          if (edge.name) row.append(predefinedTag(edge));
          row.append(slots.typeSlot, slots.removeSlot);
          wrap.appendChild(row);
          merges.push({ node, row });
          if (checkEdge(edge)) addWarning(wrap, row, checkText(edge, other));
        }
        node.also.forEach(also => {
          const note = el('div', null, 'iqa-join-note'), fields = fieldsOf(also.edge, node.index);
          const slots = relationControls(also.edge.id, kindOf(also.edge), also.edge);
          note.append('Also joined to ' + sourceRows[also.other].alias);
          if (fields) note.append(el('span', fields, 'iqa-join-fields'));
          if (also.edge.name) note.append(predefinedTag(also.edge));
          note.append(slots.typeSlot, slots.removeSlot);
          wrap.appendChild(note);
          if (checkEdge(also.edge)) addWarning(wrap, note, checkText(also.edge, node.index));
        });
        // Joins first, then Exists and Not Exist filters: those are conditions,
        // not data sources. Otherwise source order is kept (the sort is stable).
        const filtering = child => /Exist\|/.test(child.edge?.type || '') ? 1 : 0;
        [...node.children].sort((a, b) => filtering(a) - filtering(b)).forEach(child => wrap.appendChild(branch(child, groupRoot)));
        return wrap;
      }
      const treePanel = el('section', null, 'iqa-join-tree');
      const summary = el('p', '', 'iqa-join-tree-summary');
      const trees = [branch(forest[0], forest[0])];
      if (forest.length > 1) {
        const detached = el('div', null, 'iqa-join-detached');
        detached.appendChild(el('div', 'Not joined to ' + rootAlias, 'iqa-join-detached-title'));
        forest.slice(1).forEach(tree => detached.appendChild(branch(tree, tree)));
        trees.push(detached);
      }
      // Relationships the tree could not read stay listed, with their controls.
      const others = relationRows.map((row, id) => ({ row, id })).filter(item => item.row && !used.has(item.id));
      if (others.length) {
        const other = el('div', null, 'iqa-join-other');
        other.appendChild(el('div', 'Other relationships', 'iqa-join-detached-title'));
        others.forEach(item => {
          const line = el('div', null, 'iqa-join-node'), slots = relationControls(item.id, '');
          line.append(el('span', ownText(item.row.cells[0]), 'iqa-join-fields'), slots.typeSlot, slots.removeSlot);
          other.appendChild(line);
        });
        trees.push(other);
      }
      // The legend lists only the join types this query uses.
      const legend = el('div', null, 'iqa-join-legend');
      [['Equals', '', 'must match'], ['Left join', ' is-optional', 'optional'], ['Exists', ' is-filter', 'keeps matches'], ['Not exist', ' is-exclude', 'excludes matches']]
        .filter(([, kind]) => kinds.has(kind)).forEach(([text, kind, meaning]) => {
          const item = el('span'); item.append(el('span', text, 'iqa-join-pill' + kind), ' ' + meaning); legend.appendChild(item);
        });
      // The summary and legend share a header row; the legend sits right, over
      // the join-type selects it explains, and wraps below when space runs out.
      const head = el('div', null, 'iqa-join-tree-head');
      head.append(summary, ...(legend.children.length ? [legend] : []));
      treePanel.append(head, ...trees);
      // A merge's line can't be a border: it leaves the merge's source, runs
      // down past other branches and comes up into a deeper one. It is drawn
      // over the tree, measured from the branches: down the source's line from
      // the elbow of its branch on the way here (that branch's own border
      // already draws it unless it is the last), right under the merge row,
      // then up into the elbow of this source's line, where a dot marks the
      // join. Redrawn whenever the tree changes size.
      const SVG_NS = 'http://www.w3.org/2000/svg';
      const overlay = document.createElementNS(SVG_NS, 'svg');
      overlay.setAttribute('class', 'iqa-join-merges'); overlay.setAttribute('aria-hidden', 'true');
      function drawMerges() {
        overlay.replaceChildren();
        if (!merges.length || treePanel.hidden || treePanel.classList.contains('is-list') || !treePanel.offsetWidth) return;
        const panelBox = treePanel.getBoundingClientRect();
        const x0 = panelBox.left + treePanel.clientLeft, y0 = panelBox.top + treePanel.clientTop;
        // Elbows sit 15px down a branch; its line runs through the middle of its 1.5px border.
        const ELBOW = 15.25, LINE = 0.75, INSET = 8;
        merges.forEach(({ node, row }) => {
          let step = node;
          while (step.parent && step.parent.index !== node.merge.other) step = step.parent;
          const first = wrapBySource.get(step.index).getBoundingClientRect(), own = wrapBySource.get(node.index).getBoundingClientRect();
          const rowBox = row.getBoundingClientRect();
          const spine = first.left - x0 + LINE, rowY = rowBox.top - y0 + rowBox.height / 2;
          const joinX = own.left - x0 + INSET, joinY = own.top - y0 + ELBOW;
          const down = wrapBySource.get(step.index).nextElementSibling ? 'M' + spine + ' ' + rowY : 'M' + spine + ' ' + (first.top - y0 + ELBOW) + 'V' + rowY;
          const path = document.createElementNS(SVG_NS, 'path');
          path.setAttribute('d', down + 'H' + joinX + 'V' + joinY);
          const dot = document.createElementNS(SVG_NS, 'circle');
          dot.setAttribute('cx', joinX); dot.setAttribute('cy', joinY); dot.setAttribute('r', 3);
          [path, dot].forEach(shape => shape.setAttribute('class', kindOf(node.merge.edge).trim()));
          overlay.append(path, dot);
        });
      }
      if (merges.length) {
        treePanel.appendChild(overlay);
        if (typeof ResizeObserver !== 'undefined') {
          const resized = new ResizeObserver(drawMerges); resized.observe(treePanel);
          undo.push(() => resized.disconnect());
        }
      }
      const apart = forest.slice(1).reduce(function count(total, node) { return node.children.reduce(count, total + 1); }, 0);
      summary.append(sourceRows.length + ' business objects · ' + (apart ? apart + ' not joined to ' + rootAlias : 'all joined'));
      if (warnings) {
        const WARNINGS_KEY = 'iqa:join-warnings-open';
        const toggle = el('button', warnings + (warnings === 1 ? ' warning' : ' warnings'), 'iqa-join-warnings-toggle'); toggle.type = 'button';
        summary.append(' · ', toggle);
        let open = false; try { open = sessionStorage.getItem(WARNINGS_KEY) === '1'; } catch (_) {}
        const show = next => {
          open = next; treePanel.classList.toggle('show-warnings', open); toggle.setAttribute('aria-expanded', String(open));
          try { sessionStorage.setItem(WARNINGS_KEY, open ? '1' : '0'); } catch (_) {}
        };
        show(open);
        [toggle, ...warningIcons].forEach(button => listen(button, 'click', () => show(!open)));
      }
      cell.insertBefore(treePanel, panel); undo.unshift(() => treePanel.remove());

      // Hovering a tree line or its business object's row in Sources above
      // marks both, to match aliases to objects.
      [...table.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value)).forEach(input => {
        const index = sourceRows.findIndex(source => source.slot === input.value), row = input.closest('tr'), line = lineBySource.get(index);
        if (!row || !line) return;
        const mark = on => { row.classList.toggle('iqa-source-linked', on); line.classList.toggle('is-linked', on); };
        [row, line].forEach(node => { listen(node, 'mouseenter', () => mark(true)); listen(node, 'mouseleave', () => mark(false)); });
        undo.push(() => { row.classList.remove('iqa-source-linked'); line.classList.remove('is-linked'); });
      });

      // The Tree / List switcher sits in iMIS's Relations heading row, so it
      // stays put between views; without that row it heads the tree panel.
      const titleRow = [...table.querySelectorAll('span.SectionTitle')].find(span => /^relations$/i.test(span.textContent.trim()))?.closest('tr');
      const headerRow = titleRow?.nextElementSibling?.classList.contains('GridHeader') ? titleRow.nextElementSibling : null;
      const switcher = el('div', null, 'iqa-relations-view'); switcher.setAttribute('role', 'group'); switcher.setAttribute('aria-label', 'Relations view');
      const viewButtons = [['tree', 'Tree'], ['list', 'List']].map(([value, text]) => {
        const button = el('button', text); button.type = 'button'; button.dataset.view = value; switcher.appendChild(button); return button;
      });
      const host = titleRow?.cells[0];
      if (host) host.appendChild(switcher); else treePanel.insertBefore(switcher, treePanel.firstChild);
      if (host) { host.classList.add('iqa-relations-heading'); undo.push(() => host.classList.remove('iqa-relations-heading')); }
      const VIEW_KEY = 'iqaRelationsView';
      // Sources and Relations share one table, so hiding the relationship rows
      // would re-fit its columns. The source columns keep the widths they have
      // with the list showing, as shares of the table, so they don't move.
      const sourceHeader = [...table.rows].find(row => row.classList.contains('GridHeader'));
      if (sourceHeader && table.offsetWidth) {
        const widths = [...sourceHeader.cells].map(cell => cell.offsetWidth / table.offsetWidth * 100);
        [...sourceHeader.cells].forEach((cell, index) => {
          const before = cell.style.width; cell.style.width = widths[index].toFixed(2) + '%';
          undo.push(() => { cell.style.width = before; });
        });
      }
      // A join type change posts in the background (NativePost), as the
      // select's own postback would, instead of reloading the page. The page
      // then takes the response's hidden form state (ViewState, validation,
      // tokens) so later native actions post current state, and the tree is
      // rebuilt. Anything unexpected falls back to one ordinary refresh.
      async function changeType(select) {
        const original = location.href.split('#')[0], target = NativePost.postbackTarget(select) || select.name;
        treePanel.classList.add('is-busy'); treePanel.setAttribute('aria-busy', 'true');
        const spinner = el('span', null, 'us-button-spinner iqa-join-tree-spinner'); spinner.setAttribute('aria-hidden', 'true');
        treePanel.appendChild(spinner);
        // The relationship's own marker (RLn) identifies it in the response;
        // control names can be numbered differently there.
        const home = controls.find(control => control.node === select)?.parent?.closest('tr');
        const marker = [...(home?.querySelectorAll('input[type="hidden"]') || [])].find(input => /^RL\d+$/.test(input.value))?.value;
        try {
          if (!marker) throw new Error('relationship-marker-missing');
          const page = await NativePost.post({ doc: document, url: original }, original, { changes: { [select.name]: select.value }, target });
          const row = [...page.doc.querySelectorAll('input[type="hidden"]')].find(input => input.value === marker)?.closest('tr');
          const applied = row?.querySelector('select');
          if (!applied) throw new Error('relationship-not-in-response');
          if (applied.value !== select.value) throw new Error('join-type-not-applied');
          if (applied.name !== select.name) throw new Error('control-names-changed');
          // Matched by name in a map: this module's own CSS constant shadows
          // the browser's CSS.escape.
          const form = document.querySelector('input[name="__VIEWSTATE"]')?.form;
          const mine = new Map([...(form?.querySelectorAll('input[type="hidden"][name]') || [])].map(input => [input.name, input]));
          page.doc.querySelectorAll('input[type="hidden"][name]').forEach(input => {
            const field = mine.get(input.name);
            if (field && field.value !== input.value) field.value = input.value;
          });
          restore(); mount();
        } catch (error) {
          console.warn('[IQA relationships] background join type change failed:', /^[a-z-]+$/.test(error.message) ? error.message : error);
          location.replace(original);
        }
      }
      // Capture on the tree runs before the select's own onchange postback,
      // which stopping the event here prevents.
      const typeChanged = event => {
        const select = event.target.closest?.('.iqa-join-type select');
        if (!select || treePanel.classList.contains('is-busy')) return;
        event.stopPropagation();
        changeType(select);
      };
      treePanel.addEventListener('change', typeChanged, true);
      undo.push(() => treePanel.removeEventListener('change', typeChanged, true));
      function place(tree) {
        controls.forEach(control => {
          if (tree) control.slot.appendChild(control.node);
          else control.parent.insertBefore(control.node, control.next?.parentNode === control.parent ? control.next : null);
        });
        [...relationRows, headerRow].forEach(row => row?.classList.toggle('iqa-relations-hidden', tree));
        [...treePanel.children].forEach(child => { if (child !== switcher) child.hidden = !tree; });
        treePanel.classList.toggle('is-list', !tree);
        table.classList.toggle('iqa-relations-tree', tree);
        treePanel.hidden = !tree && Boolean(host);
        viewButtons.forEach(button => button.setAttribute('aria-pressed', String((button.dataset.view === 'tree') === tree)));
        drawMerges();
      }
      let view = 'tree';
      try { if (localStorage.getItem(VIEW_KEY) === 'list') view = 'list'; } catch (_) {}
      place(view === 'tree');
      viewButtons.forEach(button => listen(button, 'click', () => {
        view = button.dataset.view; place(view === 'tree');
        try { localStorage.setItem(VIEW_KEY, view); } catch (_) {}
      }));
      undo.push(() => { place(false); treePanel.hidden = false; switcher.remove(); });
    }
    render(); hydrate();
    restoreScroll(scrollToRestore);
  }
  const CSS = `
    .iqa-relationship-editor{margin:12px 0;padding:18px;border:1px solid #cbd5e1;border-radius:6px;background:#fff;white-space:normal}
    .iqa-relationship-editor h3{font-size:17px;margin:0 0 12px}.iqa-relationship-modes{display:flex;gap:0;flex-wrap:wrap;margin-bottom:12px}
    .iqa-relationship-modes button{padding:8px 14px;border:1px solid #cbd5e1;background:#fff;color:#344454;font:inherit;cursor:pointer}
    .iqa-relationship-modes button[aria-pressed=true]{background:#dff4fc;border-color:#168eb8;color:#064b66;font-weight:600}
    .iqa-relationship-modes button:focus-visible{outline:2px solid #087fae;outline-offset:2px}
    .iqa-relationship-modes button.iqa-relationship-loading{cursor:wait;display:inline-flex;align-items:center;gap:8px}
    .iqa-relationship-modes button.iqa-relationship-loading::before{content:"";display:inline-block;width:13px;height:13px;flex:0 0 13px;border:2px solid #bfd4df;border-top-color:#087ba7;border-radius:50%;animation:iqaRelationshipSpin .7s linear infinite}
    @keyframes iqaRelationshipSpin{to{transform:rotate(360deg)}}
    @media(prefers-reduced-motion:reduce){.iqa-relationship-modes button.iqa-relationship-loading::before{animation:none}}
    .iqa-relationship-editor label{display:block;margin-bottom:6px;font-size:13px;font-weight:600}
    .iqa-relationship-editor [hidden]{display:none!important}.iqa-relationship-message{font-size:13px;color:#526173;margin:0 0 14px}
    .iqa-relationship-fields{display:grid;grid-template-columns:minmax(0,1fr) 165px minmax(0,1fr);gap:14px;align-items:start}
    .iqa-relationship-ids{display:grid;grid-template-columns:minmax(0,1fr) 165px minmax(0,1fr);gap:14px;margin-bottom:12px}
    .iqa-relationship-ids.has-key-type{grid-template-columns:110px minmax(0,1fr) 165px minmax(0,1fr)}
    .iqa-relationship-fields>div,.iqa-relationship-ids>div{min-width:0}
    body.iqa-enhanced .iqa-relationship-editor .SubItems{margin:0!important;padding:0!important}
    body.iqa-enhanced .iqa-relationship-editor .InputXXLargeWrapper,body.iqa-enhanced .iqa-relationship-editor .RadComboBox,body.iqa-enhanced .iqa-relationship-editor select{width:100%!important;max-width:100%!important;box-sizing:border-box;min-width:0!important}
    .iqa-relationship-actions{display:flex;gap:16px;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap}
    .iqa-relationship-preview{flex:1;min-width:200px;overflow-wrap:anywhere;padding:8px 10px;background:#f2f7fa;border-radius:4px;font-size:13px}.iqa-relationship-preview:empty{display:none}
    .iqa-existing-relationship>td{padding-top:12px!important;padding-bottom:12px!important}
    .iqa-join-tree{margin:12px 0;padding:12px 18px;border:1px solid var(--border,#cbd5e1);border-radius:6px;background:var(--bg-surface,#fff);white-space:normal;color:var(--text-strong,#1c2024)}
    .iqa-join-tree-head{display:flex;flex-wrap:wrap;align-items:center;gap:8px 24px;margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid var(--border,#e2e5e9)}
    .iqa-join-tree:has(.iqa-join-remove:not(:empty))>.iqa-join-tree-head{padding-right:36px}
    .iqa-join-tree-summary{margin:0;font-size:13px;color:var(--text-muted,#545962)}
    .iqa-relations-heading>.iqa-relations-view{margin-left:16px;vertical-align:middle}
    .iqa-relations-view{display:inline-flex;gap:0}
    .iqa-join-tree>.iqa-relations-view{margin-bottom:10px}
    .iqa-relations-view button{padding:4px 14px;border:1px solid #cbd5e1;background:#fff;color:#344454;font:inherit;font-size:13px;cursor:pointer}
    .iqa-relations-view button+button{margin-left:-1px}
    .iqa-relations-view button[aria-pressed=true]{position:relative;background:#dff4fc;border-color:#168eb8;color:#064b66;font-weight:600}
    .iqa-relations-view button:focus-visible{outline:2px solid #087fae;outline-offset:2px}
    .iqa-relations-hidden{display:none!important}
    .iqa-join-tree.is-list{padding:10px 18px}
    .iqa-join-type select{width:100%!important;min-width:0!important;max-width:none;height:28px;margin:0!important;padding:0 26px 0 10px;border-radius:999px;font-size:12px;line-height:26px}
    .iqa-join-type.is-optional select{border-color:transparent;background-color:var(--info-bg,#e4f0f4);color:var(--text-link,#006f94)}
    .iqa-join-type.is-filter select{border-style:dotted}
    .iqa-join-type.is-exclude select{border:1px dotted var(--danger,#d03528);background-color:var(--danger-bg,#fbe4e2);color:var(--danger,#d03528)}
    .iqa-join-node>*,.iqa-join-note>*{flex-shrink:0}
    .iqa-join-node>.iqa-join-fields,.iqa-join-note>.iqa-join-fields{flex-shrink:1;min-width:0;overflow-wrap:anywhere}
    .iqa-join-node>.iqa-join-type,.iqa-join-note>.iqa-join-type{margin-left:auto;flex:none;width:150px;display:inline-flex;justify-content:flex-end}
    .iqa-join-remove{position:relative;display:inline-flex;flex:none;width:28px;height:28px;border-radius:6px;color:var(--text-muted,#545962)}
    .iqa-join-remove:empty{display:none}
    .iqa-join-remove:focus-within{outline:2px solid var(--border-focus,#006f94);outline-offset:1px}
    .iqa-join-remove::before{content:"";position:absolute;inset:5px;background:currentColor;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3'/%3E%3C/svg%3E") center/contain no-repeat;mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3'/%3E%3C/svg%3E") center/contain no-repeat;pointer-events:none;transition:color 150ms cubic-bezier(.2,0,0,1)}
    .iqa-join-remove:has(input:is(:hover,:focus-visible)){color:var(--danger,#d03528)}
    .iqa-join-remove input[type=image]{position:absolute;inset:0;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:none!important;opacity:0;cursor:pointer}
    .iqa-join-remove input[type=image]:focus{outline:none}
    .iqa-join-other{margin-top:12px;padding-top:8px;border-top:1px solid var(--border,#e2e5e9)}
    .iqa-join-tree{position:relative}
    .iqa-prefill-flash{outline:2px solid var(--accent,#f39237);outline-offset:2px;animation:iqaPrefillFlash 1600ms cubic-bezier(.4,0,.6,1) forwards}
    @keyframes iqaPrefillFlash{0%,35%{outline-color:var(--accent,#f39237)}100%{outline-color:transparent}}
    @media(prefers-reduced-motion:reduce){.iqa-prefill-flash{animation:none}}
    .iqa-join-alert{display:inline-flex;align-items:center;justify-content:center;flex:none;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:var(--warning,#b45309);color:#fff;font:700 12px/1 inherit;cursor:pointer}
    .iqa-join-alert:focus-visible,.iqa-join-warnings-toggle:focus-visible,.iqa-join-add:focus-visible{outline:2px solid var(--border-focus,#006f94);outline-offset:2px}
    .iqa-join-warnings-toggle{padding:0;border:0;background:none;color:var(--text-link,#006f94);font:inherit;text-decoration:underline;cursor:pointer}
    .iqa-join-warning{max-height:6em;overflow:hidden;transition:max-height 220ms cubic-bezier(.2,0,0,1),opacity 180ms cubic-bezier(.2,0,0,1),padding 220ms cubic-bezier(.2,0,0,1)}
    .iqa-join-tree:not(.show-warnings) .iqa-join-warning{max-height:0;padding-top:0;padding-bottom:0;opacity:0;visibility:hidden;transition:max-height 220ms cubic-bezier(.2,0,0,1),opacity 180ms cubic-bezier(.2,0,0,1),padding 220ms cubic-bezier(.2,0,0,1),visibility 0s 220ms}
    .iqa-join-node>.iqa-join-add{margin-left:auto;flex:none}
    .iqa-join-add{padding:2px 10px;border:1px solid var(--border-strong,#94a3b8);border-radius:999px;background:var(--bg-surface,#fff);color:var(--text-link,#006f94);font:inherit;font-size:12px;cursor:pointer}
    .iqa-join-add::before{content:"+ "}
    .iqa-join-add:hover{background:var(--info-bg,#e4f0f4)}
    .iqa-join-node.is-linked{background-color:var(--info-bg,#e4f0f4)}
    table tr.iqa-source-linked[class]>td{background-color:var(--info-bg,#e4f0f4)!important}
    @media(prefers-reduced-motion:reduce){.iqa-join-warning,.iqa-join-tree:not(.show-warnings) .iqa-join-warning{transition:none}}
    .iqa-join-tree.is-busy>:not(.iqa-join-tree-spinner){opacity:.45;pointer-events:none;transition:opacity 180ms cubic-bezier(.2,0,0,1)}
    .iqa-join-tree-spinner{position:absolute;top:50%;left:50%;margin:-8px 0 0 -8px;color:var(--text-link,#006f94)}
    .iqa-join-node,.iqa-join-note{border-radius:4px;transition:background-color 150ms cubic-bezier(.2,0,0,1)}
    .iqa-join-node:has(.iqa-join-type select:is(:hover,:focus-visible)),.iqa-join-note:has(.iqa-join-type select:is(:hover,:focus-visible)){background-color:color-mix(in srgb,var(--text-link,#006f94) 12%,transparent)}
    .iqa-join-node:has(.iqa-join-remove input:is(:hover,:focus-visible)),.iqa-join-note:has(.iqa-join-remove input:is(:hover,:focus-visible)){background-color:var(--danger-bg,#fbe4e2)}
    @media(prefers-reduced-motion:reduce){.iqa-join-tree.is-busy>*,.iqa-join-node,.iqa-join-note{transition:none}}
    .iqa-join-name.is-filtered{color:var(--text-muted,#545962)}
    .iqa-join-legend{display:flex;gap:18px;flex-wrap:wrap;margin-left:auto;font-size:12px;color:var(--text-muted,#545962)}
    .iqa-join-node{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding:4px 0;font-size:14px}
    .iqa-join-root>.iqa-join-node>.iqa-join-name{font-weight:600}
    .iqa-join-object{font-size:12px;font-style:italic;color:var(--text-muted,#545962)}
    .iqa-join-fields{font-size:12px;color:var(--text-muted,#545962)}
    .iqa-join-pill{display:inline-block;padding:1px 8px;border:1px solid var(--border-strong,#94a3b8);border-radius:999px;font-size:12px;line-height:1.5;white-space:nowrap;background:var(--bg-surface,#fff)}
    .iqa-join-pill.is-optional{border-color:transparent;background:var(--info-bg,#e4f0f4);color:var(--text-link,#006f94)}
    .iqa-join-pill.is-filter{border-style:dotted}
    .iqa-join-branch{position:relative;margin-left:11px;padding-left:20px;border-left:1.5px solid var(--border-strong,#94a3b8)}
    .iqa-join-branch:last-child{border-left-color:transparent}
    .iqa-join-branch::before{content:"";position:absolute;left:-1.5px;top:0;width:16px;height:16px;border-left:1.5px solid var(--border-strong,#94a3b8);border-bottom:1.5px solid var(--border-strong,#94a3b8)}
    .iqa-join-branch.is-optional,.iqa-join-branch.is-optional::before{border-left-style:dashed}
    .iqa-join-branch.is-optional::before{border-bottom-style:dashed}
    .iqa-join-branch.is-filter,.iqa-join-branch.is-filter::before{border-left-style:dotted}
    .iqa-join-branch.is-filter::before{border-bottom-style:dotted}
    .iqa-join-branch.is-exclude,.iqa-join-branch.is-exclude::before{border-left-style:dotted}
    .iqa-join-branch.is-exclude::before{border-bottom-style:dotted;border-color:var(--danger,#d03528)}
    .iqa-join-pill.is-exclude{border:1px dotted var(--danger,#d03528);background:var(--danger-bg,#fbe4e2);color:var(--danger,#d03528)}
    .iqa-join-name.is-excluded{color:var(--text-muted,#545962)}
    .iqa-join-name.is-excluded::before{content:"\\2298";margin-right:4px;color:var(--danger,#d03528)}
    .iqa-join-note{display:flex;align-items:center;gap:8px;flex-wrap:nowrap;padding:0 0 4px;font-size:12px;color:var(--text-muted,#545962)}
    .iqa-join-merge{padding:2px 0 6px}
    .iqa-join-merges{position:absolute;left:0;top:0;width:100%;height:100%;overflow:visible;pointer-events:none}
    .iqa-join-merges path{fill:none;stroke:var(--border-strong,#94a3b8);stroke-width:1.5}
    .iqa-join-merges path.is-optional{stroke-dasharray:4 3}
    .iqa-join-merges circle{fill:var(--border-strong,#94a3b8)}
    .iqa-join-warning{position:relative;padding:1px 0 4px 24px;font-size:12px;line-height:1.5;color:var(--text-strong,#1c2024)}
    .iqa-join-warning::before{content:"!";position:absolute;left:2px;top:2px;display:flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:var(--warning,#b45309);color:#fff;font-size:11px;font-weight:700}
    .iqa-join-detached{margin-top:12px;padding:8px 12px;border-radius:6px;background:var(--warning-bg,#fdf3e1)}
    .iqa-join-detached-title{margin-bottom:4px;font-size:12px;font-weight:600}
    .iqa-relation-tag{display:inline-block;margin-left:8px;padding:1px 8px;border:1px dashed var(--border-strong,#94a3b8);border-radius:999px;font-size:12px;line-height:1.5;vertical-align:middle;white-space:nowrap;color:var(--text-muted,#545962)}
    .iqa-relation-tag.is-check{border:1px solid var(--warning,#b45309);color:var(--text-strong,#1c2024);background:var(--warning-bg,#fdf3e1)}
    .iqa-join-node .iqa-relation-tag{margin-left:0}
    .iqa-relation-check>td{background:var(--warning-bg,#fdf3e1)!important}
    .iqa-relation-check>td:first-child{box-shadow:inset 3px 0 0 var(--warning,#b45309)}
    table:not(.iqa-relations-tree) .iqa-source-unrelated>td{background:var(--warning-bg,#fdf3e1)!important}
    table:not(.iqa-relations-tree) .iqa-source-unrelated>td:first-child{box-shadow:inset 3px 0 0 var(--warning,#b45309)}
    td[data-iqa-tag]::after{content:attr(data-iqa-tag);display:inline-block;margin-left:8px;padding:1px 8px;border:1px dashed var(--border-strong,#94a3b8);border-radius:999px;font-size:12px;line-height:1.5;vertical-align:middle;white-space:nowrap;color:var(--text-muted,#545962)}
    .iqa-relation-check>td[data-iqa-tag]::after,.iqa-source-unrelated>td[data-iqa-tag]::after{border:1px solid var(--warning,#b45309);color:var(--text-strong,#1c2024);background:var(--warning-bg,#fdf3e1)}
    table.iqa-relations-tree .iqa-source-unrelated>td[data-iqa-tag]::after{content:"!";display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;padding:0;border:0;border-radius:50%;background:var(--warning,#b45309);color:#fff;font-weight:700;line-height:1}
    @media(max-width:800px){.iqa-relationship-fields,.iqa-relationship-ids,.iqa-relationship-ids.has-key-type{grid-template-columns:1fr}.iqa-relationship-editor{padding:12px}}
  `;
  return { mount, openFieldsInBackground, addInBackground, teardown() { restore(); forget(); document.getElementById('iqaRelationshipCss')?.remove(); } };
}

  const RelationshipWorkspace = createRelationshipWorkspace();
  // END RELATIONSHIP WORKSPACE V1

  // BEGIN BRANCHIFY V1
/* Branchify: limit a query to the records the signed-in user may see. One action
 * adds the i4u_UT_EntityAccess business object and the filter
 * ContactKey = "@LoggedInUser", as the designer's own postbacks sent in the
 * background like the reorders, then refreshes the editor once. The relationship
 * varies by business object, so it is chosen in the popup.
 *
 * Steps, each posted from the previous response and checked before the next:
 *   1. Add the source: SelectedKeys = its key, a plain submit (AddQuickSource).
 *      Skipped when the query already has it.
 *   2. Open Filters: the inner tab strip's postback.
 *   3. Add the filter: the "Add a filter" select's own postback. Skipped when a
 *      ContactKey filter on that source already exists.
 *   4. Return to Sources, posting "@LoggedInUser" in the new row's value.
 *   5. Optional, when a branch code field is chosen: add that relationship
 *      through the relationship editor's background open and Add.
 */
function createBranchify() {
  const ACCESS_SOURCE = /^_?i4u_UT_EntityAccess$/i, ENTITY_CODE = /^(org_?code|entity_?code)$/i;
  const PROPERTY = 'ContactKey', VALUE = '"@LoggedInUser"';
  const RESULT_KEY = 'iqa:branchify:result:v1';
  let host = null, toolbarButton = null, statusLine = null, dialog = null, busy = false, stale = false;

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text != null) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  const normal = text => String(text || '').replace(/\s+/g, ' ').trim();

  function sources(doc) {
    return [...doc.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value)).map(input => {
      const row = input.closest('tr');
      return { slot: input.value, name: normal(row?.cells[0]?.textContent), alias: row?.querySelector('input[id*="txtAlias"]')?.value || '', type: normal(row?.cells[2]?.textContent) };
    });
  }
  const isAccess = source => ACCESS_SOURCE.test(source.name) || ACCESS_SOURCE.test(source.alias);

  // What the relationship could join to EntityCode: the business objects with an
  // OrgCode, Org_Code, EntityCode or Entity_Code field, from each definition.
  async function branchCodes() {
    const all = sources(document), access = all.find(isAccess);
    if (access) {
      const relations = [...document.querySelectorAll('input[type="hidden"]')].filter(input => /^RL\d+$/.test(input.value))
        .map(input => normal(input.closest('tr')?.cells[0]?.textContent).toLowerCase());
      if (relations.some(text => text.includes((access.alias || access.name).toLowerCase() + '.'))) return { joined: true, objects: [] };
    }
    const token = (document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';
    const objects = await Promise.all(all.filter(source => !isAccess(source) && source.type === 'Business Object').map(async source => {
      const response = await fetch(new URL('/api/BOEntityDefinition/' + encodeURIComponent(source.name), location.origin), {
        credentials: 'same-origin', headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) }
      });
      if (!response.ok) throw new Error('definition-unavailable');
      const data = await response.json(), values = (data?.Result || data)?.Properties?.$values;
      if (!Array.isArray(values)) throw new Error('definition-unavailable');
      return { ...source, fields: values.map(property => property?.Name).filter(name => typeof name === 'string' && ENTITY_CODE.test(name)) };
    }));
    return { joined: false, objects: objects.filter(source => source.fields.length) };
  }

  function filterRows(doc) {
    return [...doc.querySelectorAll('input[type="hidden"]')].filter(input => input.value.startsWith('F|'))
      .map(input => ({ slot: input.value, row: input.closest('tr') })).filter(item => item.row);
  }
  // "[alias] Contact Key" in the row's first cell.
  function isAccessFilter(row, alias) {
    const label = normal(row.cells[0]?.textContent).toLowerCase();
    return label.startsWith('[' + alias.toLowerCase() + ']') && /contact\s*key$/.test(label);
  }

  // The key comes from the Union Template quick-add list, or the native panel.
  async function accessKey() {
    try {
      const row = (await loadSection() || []).find(item => ACCESS_SOURCE.test(normal(item.name)));
      if (row?.key) return row.key;
    } catch (_) {}
    for (const link of document.querySelectorAll('a[href*="AddQuickSource"]')) {
      const match = /AddQuickSource\(\s*["']?([0-9a-fA-F-]{36})/.exec(link.getAttribute('href') || '');
      if (match && ACCESS_SOURCE.test(normal(link.textContent))) return match[1];
    }
    return null;
  }

  // The inner tab strip (Summary, Sources, Filters…), read from the visible page:
  // its postback target, the argument a tab click sends and its client state.
  function tabStrip() {
    for (const node of document.querySelectorAll('.RadTabStrip[id]')) {
      const control = window.$find?.(node.id), tabs = control?.get_tabs?.();
      if (!tabs) continue;
      const names = Array.from({ length: tabs.get_count() }, (_, index) => normal(tabs.getTab(index).get_text()));
      if (!names.includes('Sources') || !names.includes('Filters')) continue;
      const reference = control._postBackReference || '';
      const target = /WebForm_PostBackOptions\(\s*'([^']+)'\s*,\s*'arguments'/.exec(reference)?.[1];
      if (!target) throw new Error('tab-postback-unavailable');
      // A native tab click sends {"type":0,"index":"2"} (captured 7 October 2026).
      const argument = name => {
        const tab = tabs.getTab(names.indexOf(name));
        const index = typeof tab._getHierarchicalIndex === 'function' ? String(tab._getHierarchicalIndex()) : String(names.indexOf(name));
        return JSON.stringify({ type: 0, index });
      };
      return { id: node.id, target, names, argument, validates: /'arguments'\s*,\s*true/.test(reference) };
    }
    throw new Error('tab-strip-unavailable');
  }
  function tabChanges(page, strip, name) {
    const field = page.doc.getElementById(strip.id + '_ClientState'), changes = {};
    if (field?.name) {
      let state = {};
      try { state = JSON.parse(field.value || '{}') || {}; } catch (_) {}
      changes[field.name] = JSON.stringify({ logEntries: [], scrollState: {}, ...state, selectedIndexes: [String(strip.names.indexOf(name))] });
    }
    return changes;
  }

  // Every step is a native postback (NativePost). Once one is sent, an uncertain
  // outcome must never be retried on the old form.
  const post = (page, original, changes, target, argument = '') =>
    NativePost.post(page, original, { changes, target, argument, onRequest: () => { stale = true; } });

  async function run(progress, join) {
    const original = location.href.split('#')[0];
    let page = { doc: document, url: original };
    const strip = tabStrip();
    if (strip.validates && typeof window.Page_ClientValidate === 'function' && window.Page_ClientValidate('') !== true) throw new Error('native-validation-failed');
    const before = sources(document);
    let access = before.filter(isAccess);
    if (access.length > 1) throw new Error('several-entity-access-sources');
    const added = { source: false, filter: false };

    if (!access.length) {
      const key = await accessKey();
      const keys = document.querySelector('input[type="hidden"][name$="$SelectedKeys"]');
      if (!key) throw new Error('entity-access-not-in-quick-add');
      if (!keys) throw new Error('add-source-control-unavailable');
      progress('Adding i4u_UT_EntityAccess…');
      page = await post(page, original, { [keys.name]: key }, '');
      access = sources(page.doc).filter(source => isAccess(source) && !before.some(item => item.slot === source.slot));
      if (access.length !== 1) throw new Error('entity-access-not-added');
      added.source = true;
    }
    const source = access[0], alias = source.alias || source.name;

    progress('Opening Filters…');
    page = await post(page, original, tabChanges(page, strip, 'Filters'), strip.target, strip.argument('Filters'));
    const addFilter = page.doc.querySelector('select.property');
    if (!addFilter?.name) throw new Error('filters-tab-not-returned');
    const existing = filterRows(page.doc);
    const changes = {};

    if (!existing.some(item => isAccessFilter(item.row, alias))) {
      const option = [...addFilter.options].find(item => {
        const match = /\.(SR\d+)\|([^|]+)$/.exec(item.value);
        return match && match[1] === source.slot && match[2] === PROPERTY;
      });
      if (!option) throw new Error('contact-key-field-unavailable');
      progress('Adding the Contact Key filter…');
      page = await post(page, original, { [addFilter.name]: option.value }, addFilter.name);
      const fresh = filterRows(page.doc).filter(item => !existing.some(old => old.slot === item.slot) && isAccessFilter(item.row, alias));
      if (fresh.length !== 1) throw new Error('filter-not-added');
      const row = fresh[0].row, selects = [...row.querySelectorAll('select')];
      const comparison = selects.find(select => [...select.options].some(item => item.value === 'Between'));
      const valueType = selects.find(select => [...select.options].some(item => item.value === 'Constant'));
      const box = row.querySelector('input[type="text"][id$="_TextBox1"]');
      // The new row's defaults are Equal and Constant; anything else is left for review.
      if (comparison?.value !== 'Equal' || valueType?.value !== 'Constant' || !box?.name) throw new Error('filter-defaults-changed');
      changes[box.name] = VALUE;
      added.filter = true;
    }

    progress('Returning to Sources…');
    page = await post(page, original, { ...changes, ...tabChanges(page, strip, 'Sources') }, strip.target, strip.argument('Sources'));
    if (!sources(page.doc).some(item => item.slot === source.slot)) throw new Error('sources-tab-not-returned');

    // The relationship, as the Branchify tab adds it: open the field controls, then
    // the native Add, both in the background. The source and filter are already
    // in place, so a join that fails is reported rather than failing Branchify.
    if (join) {
      try {
        progress('Adding the relationship…');
        const opened = await RelationshipWorkspace.openFieldsInBackground(page, original, () => { stale = true; });
        page = opened.page;
        const pick = (side, slot, property) => opened.editor.combos[side].items.find(item => item.slot === slot && item.property.toLowerCase() === property.toLowerCase());
        const left = pick(0, join.slot, join.property), right = pick(1, source.slot, 'EntityCode');
        if (!left || !right) throw new Error('join-fields-unavailable');
        const type = opened.editor.type.options.some(option => option.value === 'Equal|AND') ? 'Equal|AND' : opened.editor.type.value;
        page = await RelationshipWorkspace.addInBackground(page, original, opened.editor, left, right, type, () => { stale = true; });
        added.join = join.label;
      } catch (error) {
        added.joinFailed = join.label;
        console.warn('[IQA Branchify] relationship not added:', /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error');
      }
    }
    return { page, original, added };
  }

  function openDialog() {
    if (dialog || busy) return;
    stale = false;
    dialog = element('dialog', null, 'iqa-source-reorder-dialog iqa-branchify-dialog');
    const title = element('h2', 'Branchify this query'); title.id = 'iqaBranchifyTitle';
    dialog.setAttribute('aria-labelledby', title.id);
    // The Filters tab is not in this page, so with the source already present
    // the popup says Branchify will check there rather than guessing.
    const help = element('div'), present = sources(document).some(isAccess);
    if (present) {
      const added = element('p'), filters = element('p');
      added.append(element('strong', 'i4u_UT_EntityAccess'), ' is already in this query, so it will not be added again.');
      filters.append('The Filters tab cannot be seen from here: Branchify checks it and adds the filter ',
        element('strong', 'Contact Key = ' + VALUE), ' only if it is missing.');
      help.append(added, filters);
    } else {
      help.append('Adds ', element('strong', 'i4u_UT_EntityAccess'), ' and the filter ',
        element('strong', 'Contact Key = ' + VALUE), ', so results are limited to the entities the signed-in user can access.');
    }
    const status = element('p', '', 'iqa-source-reorder-status'); status.setAttribute('role', 'status');
    const footer = element('div', null, 'iqa-source-reorder-actions');
    const start = element('button', 'Branchify', 'TextButton PrimaryButton'); start.type = 'button';
    const cancel = element('button', 'Cancel', 'TextButton us-outline-button'); cancel.type = 'button';

    // The relationship is offered only when it is unambiguous: one business
    // object with one branch code field. Otherwise the reason is shown instead.
    injectStyle('iqaBranchifyCss', `
      .iqa-branchify-join>p{margin:0 0 var(--space-3,12px)}
      .iqa-branchify-option{display:flex;align-items:flex-start;gap:var(--space-2,8px);margin:0 0 var(--space-3,12px)}
      .iqa-branchify-option>input{flex:none;margin:3px 0 0}
      .iqa-branchify-option>label{margin:0;font-weight:var(--fw-normal,400)}
      .iqa-branchify-choices{margin:0 0 var(--space-3,12px);padding:0;border:0}
      .iqa-branchify-choices>legend{margin:0 0 var(--space-2,8px);padding:0;border:0;font-size:inherit;font-weight:var(--fw-semi,600);color:inherit}
      .iqa-branchify-choices>.iqa-branchify-option{margin-bottom:var(--space-2,8px)}
      .iqa-branchify-object{color:var(--text-muted,#545962);font-weight:var(--fw-normal,400)}
    `);
    const joinBlock = element('div', null, 'iqa-branchify-join');
    const say = text => joinBlock.replaceChildren(element('p', text));
    // Each choice is { join, input }; the chosen one is the checked input's join.
    let choices = [];
    const chosenJoin = () => choices.find(choice => choice.input.checked)?.join || null;
    // "[alias].[field]", followed by the business object's own name, faded,
    // when its alias differs.
    function option(input, candidate, prefix) {
      const text = element('label'); text.htmlFor = input.id;
      if (prefix) text.append(prefix);
      if (candidate) {
        text.append(element('strong', candidate.label));
        if (candidate.alias.toLowerCase() !== candidate.name.toLowerCase()) text.append(' - ', element('em', candidate.name, 'iqa-branchify-object'));
      }
      const row = element('div', null, 'iqa-branchify-option'); row.append(input, text);
      return row;
    }
    say('Checking your business objects for a branch code field…');
    start.disabled = true;
    branchCodes().then(found => {
      if (!dialog) return;
      const candidates = found.objects.flatMap(source => source.fields.map(property => {
        const alias = source.alias || source.name;
        return { slot: source.slot, property, alias, name: source.name, label: '[' + alias + '].[' + property + ']' };
      }));
      const joinOf = candidate => ({ slot: candidate.slot, property: candidate.property, label: candidate.label });
      if (found.joined) say('i4u_UT_EntityAccess is already joined to a business object.');
      else if (!candidates.length) say('No business object has an OrgCode, Org_Code, EntityCode or Entity_Code field. Add the relationship yourself afterwards.');
      else if (candidates.length === 1) {
        const input = element('input'); input.type = 'checkbox'; input.id = 'iqaBranchifyJoin'; input.checked = true;
        choices = [{ input, join: joinOf(candidates[0]) }];
        joinBlock.replaceChildren(option(input, candidates[0], 'Branchify on: '));
      } else {
        // Several fields could be the branch: list each, with no join chosen
        // until one is picked.
        const group = element('fieldset', null, 'iqa-branchify-choices');
        group.append(element('legend', 'Branchify on:'));
        const radio = (index, checked) => {
          const input = element('input'); input.type = 'radio'; input.name = 'iqaBranchifyJoin'; input.id = 'iqaBranchifyJoin' + index; input.checked = checked;
          return input;
        };
        candidates.forEach((candidate, index) => {
          const input = radio(index, false);
          choices.push({ input, join: joinOf(candidate) });
          group.append(option(input, candidate));
        });
        const none = radio('None', true);
        choices.push({ input: none, join: null });
        group.append(option(none, null, 'Don’t add a relationship'));
        joinBlock.replaceChildren(group);
      }
    }).catch(() => {
      if (dialog) say('The business objects could not be checked. Join it with the Branchify tab under Add relationship afterwards.');
    }).finally(() => { if (dialog && !busy) start.disabled = false; });
    const close = () => { dialog?.remove(); dialog = null; toolbarButton?.focus(); };
    cancel.addEventListener('click', () => { if (busy) return; if (stale) location.replace(location.href.split('#')[0]); else close(); });
    dialog.addEventListener('cancel', event => { event.preventDefault(); if (!busy && !stale) close(); });
    start.addEventListener('click', async () => {
      if (busy || stale) return;
      const working = Busy.button(start);
      busy = true; start.disabled = true; cancel.disabled = true;
      choices.forEach(choice => { choice.input.disabled = true; });
      try {
        const result = await run(text => { status.textContent = text; }, chosenJoin());
        try { sessionStorage.setItem(RESULT_KEY, JSON.stringify({ at: Date.now(), urls: [result.original, result.page.url], added: result.added })); } catch (_) {}
        status.textContent = 'Done. Refreshing the editor…';
        location.replace(result.page.url);
      } catch (error) {
        working.clear(); busy = false; cancel.disabled = false;
        const reason = /^[a-z-]+$/.test(error.message) ? error.message : 'request-or-browser-error';
        const messages = {
          'entity-access-not-in-quick-add': 'i4u_UT_EntityAccess is not in the Union Template quick-add list.',
          'several-entity-access-sources': 'This query already has more than one i4u_UT_EntityAccess source. Branchify it by hand.',
          'native-validation-failed': 'Check the editor’s validation messages, then try again.',
          'filter-defaults-changed': 'The filter was added, but its comparison or value type was not the default. Set it on the Filters tab.'
        };
        status.textContent = messages[reason] || (stale ? 'Branchify stopped part way. Refresh the editor to see what was added before continuing.' : 'Branchify could not start. Close this window and try again.');
        if (stale) { cancel.textContent = 'Refresh editor'; start.hidden = true; }
        else { start.disabled = false; choices.forEach(choice => { choice.input.disabled = false; }); }
        console.warn('[IQA Branchify]', reason);
      }
    });
    footer.append(start, cancel); dialog.append(title, help, joinBlock, status, footer);
    document.body.appendChild(dialog); dialog.showModal();
  }

  // The action sits in the Sources toolbar beside Reorder business objects.
  function mount() {
    if (busy || stale) return;
    const toolbar = document.querySelector('.iqa-source-toolbar');
    if (!toolbar) { host = null; return; }
    if (host === toolbar && toolbarButton?.isConnected) return;
    host = toolbar;
    toolbarButton = element('button', 'Branchify', 'TextButton us-outline-button iqa-branchify-button'); toolbarButton.type = 'button';
    toolbarButton.title = 'Limit results to the entities the signed-in user can access';
    toolbarButton.addEventListener('click', openDialog);
    statusLine = element('span', '', 'iqa-source-feedback iqa-branchify-feedback'); statusLine.setAttribute('role', 'status');
    const reorder = toolbar.querySelector('.iqa-source-reorder-button');
    toolbar.insertBefore(toolbarButton, reorder);
    toolbar.insertBefore(statusLine, toolbar.firstChild);
    try {
      const saved = JSON.parse(sessionStorage.getItem(RESULT_KEY) || 'null');
      sessionStorage.removeItem(RESULT_KEY);
      if (saved && Date.now() - saved.at < 120000 && saved.urls?.includes(location.href.split('#')[0])) {
        const added = saved.added || {};
        const done = [added.source && 'i4u_UT_EntityAccess', added.filter && 'the Contact Key = ' + VALUE + ' filter', added.join && 'the relationship on ' + added.join];
        const list = done.filter(Boolean), last = list.pop();
        statusLine.textContent = (last ? 'Added ' + (list.length ? list.join(', ') + ' and ' : '') + last + '. ' : 'Already branchified. ')
          + (added.joinFailed ? 'The relationship on ' + added.joinFailed + ' could not be added; use the Branchify tab under Add relationship. '
            : added.join ? '' : 'Join it with the Branchify tab under Add relationship if it is not joined yet. ')
          + 'Save the query when you are ready.';
      }
    } catch (_) {}
  }

  return { mount, teardown() {
    if (busy || stale) return;
    dialog?.remove(); dialog = null;
    toolbarButton?.remove(); statusLine?.remove(); toolbarButton = statusLine = host = null;
  } };
}

  const Branchify = createBranchify();
  // END BRANCHIFY V1

  // BEGIN SQL EDITOR V1
/* SQL colouring keeps the native textarea as the editable/submitted control. */
function createSqlEditor(options = {}) {
  const keywords = new Set(('ALL AND AS ASC BETWEEN BY CASE CAST CONVERT DESC DISTINCT ELSE END EXISTS FROM GROUP HAVING IN IS JOIN LEFT LIKE NOT NULL ON OR ORDER OUTER OVER PARTITION RIGHT SELECT THEN TOP UNION WHEN WHERE WITH SUM COUNT MIN MAX AVG COALESCE ISNULL NULLIF IIF CONCAT GETDATE DATEADD DATEDIFF ROUND').split(' '));
  function tokens(sql) {
    const result = [];
    const pattern = /--[^\r\n]*|\/\*[\s\S]*?(?:\*\/|$)|N?'(?:''|[^'])*(?:'|$)|\[(?:\]\]|[^\]])*(?:\]|$)|"(?:""|[^"])*(?:"|$)|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z_0-9]*\b/gi;
    let at = 0;
    for (const match of sql.matchAll(pattern)) {
      if (match.index > at) result.push({ text: sql.slice(at, match.index), type: '' });
      const text = match[0];
      const type = /^(--|\/\*)/.test(text) ? 'comment' : /^N?'/i.test(text) ? 'string' : /^[\["]/.test(text) ? 'identifier' : /^\d/.test(text) ? 'number' : keywords.has(text.toUpperCase()) ? 'keyword' : '';
      result.push({ text, type }); at = match.index + text.length;
    }
    if (at < sql.length) result.push({ text: sql.slice(at), type: '' });
    return result;
  }
  const quote = value => '[' + value.replace(/\]/g, ']]') + ']';
  // T-SQL functions with a parameter hint: each parameter's name, type and
  // meaning, and for a parameter that takes a fixed set of values (a datepart,
  // a data type, a date style), those values as suggestions.
  // Common dateparts first; dayofyear and weekday count as day in DATEADD.
  const DATEPARTS = [
    ['year', 'yy, yyyy'], ['quarter', 'qq, q'], ['month', 'mm, m'], ['week', 'wk, ww'], ['day', 'dd, d'], ['hour', 'hh'], ['minute', 'mi, n'], ['second', 'ss, s'],
    ['millisecond', 'ms'], ['microsecond', 'mcs'], ['nanosecond', 'ns'], ['dayofyear', 'dy, y'], ['weekday', 'dw, w']
  ].map(([name, short]) => ({ label: name, detail: 'Also ' + short, insert: name, aliases: short.split(', ') }));
  const DATA_TYPES = [
    ['varchar(n)', 'varchar(30)', 'Text, up to n characters'], ['nvarchar(n)', 'nvarchar(100)', 'Unicode text, up to n characters'], ['char(n)', 'char(10)', 'Text, exactly n characters'],
    ['date', 'date', 'Date only'], ['datetime', 'datetime', 'Date and time, to 3 ms'], ['datetime2', 'datetime2', 'Date and time, to 100 ns'], ['time', 'time', 'Time only'],
    ['int', 'int', 'Whole number'], ['bigint', 'bigint', 'Large whole number'], ['decimal(p, s)', 'decimal(18, 2)', 'Exact number: p digits, s after the point'],
    ['money', 'money', 'Currency, 4 decimal places'], ['float', 'float', 'Approximate number'], ['bit', 'bit', '1, 0 or NULL']
  ].map(([label, insert, detail]) => ({ label, detail, insert }));
  const DATE_STYLES = [
    [0, 'mon dd yyyy hh:miAM (default)'], [23, 'yyyy-mm-dd'], [101, 'mm/dd/yyyy (US)'], [103, 'dd/mm/yyyy (Australia, UK)'], [104, 'dd.mm.yyyy'],
    [105, 'dd-mm-yyyy'], [106, 'dd mon yyyy'], [107, 'Mon dd, yyyy'], [108, 'hh:mi:ss'], [110, 'mm-dd-yyyy'], [111, 'yyyy/mm/dd'],
    [112, 'yyyymmdd (ISO)'], [113, 'dd mon yyyy hh:mi:ss:mmm'], [114, 'hh:mi:ss:mmm'], [120, 'yyyy-mm-dd hh:mi:ss (ODBC)'],
    [121, 'yyyy-mm-dd hh:mi:ss.mmm'], [126, 'yyyy-mm-ddThh:mi:ss.mmm (ISO 8601)']
  ].map(([code, format]) => ({ label: String(code), detail: format, insert: String(code) }));
  const DATEPART = { name: 'datepart', type: 'keyword', detail: 'The unit, unquoted: year, quarter, month, day, week, hour, minute, second…', values: DATEPARTS };
  const SQL_FUNCTIONS = {
    DATEADD: {
      detail: 'Adds a number of dateparts to a date · returns the date’s type',
      params: [DATEPART,
        { name: 'number', type: 'int', detail: 'How many dateparts to add; negative to subtract. Decimals are truncated' },
        { name: 'date', type: 'date, datetime, datetime2, time', detail: 'The date to add to: a field, expression or quoted literal' }]
    },
    DATEDIFF: {
      detail: 'Counts the datepart boundaries from startdate to enddate · returns int',
      params: [DATEPART,
        { name: 'startdate', type: 'date, datetime, datetime2, time', detail: 'The earlier date. A later startdate gives a negative result' },
        { name: 'enddate', type: 'date, datetime, datetime2, time', detail: 'The later date. Boundaries are counted, so year from 31 Dec to 1 Jan is 1' }]
    },
    CONVERT: {
      detail: 'Converts a value to another data type · returns data_type',
      params: [
        { name: 'data_type', type: 'data type', detail: 'The type to convert to, with a length where it has one: varchar(30), date, int…', values: DATA_TYPES },
        { name: 'expression', type: 'any', detail: 'The value to convert: a field, expression or literal' },
        { name: 'style', type: 'int, optional', detail: 'Date format: 103 dd/mm/yyyy, 112 yyyymmdd, 120 yyyy-mm-dd hh:mi:ss…', values: DATE_STYLES }]
    }
  };
  const signatureText = name => name + '(' + SQL_FUNCTIONS[name].params.map(param => param.name).join(', ') + ')';
  // The innermost unclosed call the caret is in, and which argument: commas at
  // that call's own depth. Strings and comments are skipped. Only calls in
  // SQL_FUNCTIONS are returned.
  function callAt(before) {
    const stack = []; let word = '';
    for (const token of tokens(before)) {
      if (token.type === 'comment') continue;
      if (token.type || /^[A-Za-z_]/.test(token.text)) { word = token.type === 'keyword' || !token.type ? token.text.toUpperCase() : ''; continue; }
      for (const char of token.text) {
        if (char === '(') { stack.push({ name: word, arg: 0 }); word = ''; }
        else if (char === ')') { stack.pop(); word = ''; }
        else if (char === ',') { if (stack.length) stack.at(-1).arg++; word = ''; }
        else if (!/\s/.test(char)) word = '';
      }
    }
    const call = stack.at(-1), definition = call && SQL_FUNCTIONS[call.name];
    return definition && call.arg < definition.params.length ? { name: call.name, arg: call.arg, ...definition } : null;
  }
  // iMIS SQL functions, offered only after "dbo.". The document path needs a
  // DocumentVersionKey, so it appears only when a source has that field, and
  // arrives prefilled with it (one option per source that has it).
  function dboFunctions(search, sources) {
    const options = [{ kind: 'function', label: 'asi_GetAppDatetime()', detail: 'Date and time in the instance’s configured time zone · use instead of GETDATE()', insert: 'asi_GetAppDatetime()' }];
    sources.forEach(source => source.fields.filter(field => field.name.toLowerCase() === 'documentversionkey').forEach(field => {
      const call = 'asi_PublishedDocumentPath(' + quote(source.sqlName) + '.' + quote(field.name) + ')';
      options.push({ kind: 'function', label: call, detail: 'Published path of the document · nvarchar(4000)', insert: call });
    }));
    return options.filter(option => option.label.toLowerCase().includes(search));
  }
  function complete(before, sources) {
    const fieldDetail = field => [field.label, field.dataType].filter(Boolean).join(' · ');
    const last = tokens(before).at(-1);
    if (last && /^(comment|string)$/.test(last.type)) return null;
    // An argument with a fixed set of values, started or not yet typed.
    const call = callAt(before), values = call?.params[call.arg].values, typed = before.match(/[(,]\s*(\w*)$/);
    if (values && typed) {
      const search = typed[1].toLowerCase();
      const options = values.filter(value => [value.label, ...(value.aliases || [])].some(name => name.toLowerCase().startsWith(search)));
      if (options.length) return { start: before.length - typed[1].length, options: options.map(value => ({ kind: 'value', ...value })) };
    }
    const field = before.match(/(\[(?:\]\]|[^\]])+\]|[\w]+)\.\s*(\[?[\w ]*)$/);
    if (field) {
      const name = field[1].replace(/^\[|\]$/g, '').replace(/\]\]/g, ']');
      const source = sources.find(item => item.sqlName.toLowerCase() === name.toLowerCase());
      const search = field[2].replace(/^\[/, '').toLowerCase();
      if (!source && name.toLowerCase() === 'dbo') return { start: before.length - field[2].length, options: dboFunctions(search, sources) };
      if (!source) return null;
      return { start: before.length - field[2].length, options: source.fields.filter(item => item.name.toLowerCase().includes(search) || item.label.toLowerCase().includes(search)).map(item => ({ kind: 'field', label: item.name, detail: fieldDetail(item), insert: quote(item.name) })) };
    }
    const match = before.match(/\[?[A-Za-z_][\w]*$/);
    if (!match || before[match.index - 1] === '.') return null;
    const search = match[0].replace(/^\[/, '').toLowerCase();
    const functionOptions = match[0].startsWith('[') ? [] : Object.keys(SQL_FUNCTIONS).filter(name => name.toLowerCase().startsWith(search))
      .map(name => ({ kind: 'function', label: signatureText(name), detail: SQL_FUNCTIONS[name].detail, insert: name + '(' }));
    const sourceOptions =sources.filter(item => item.sqlName.toLowerCase().includes(search) || item.label.toLowerCase().includes(search)).map(item => ({ kind: 'source', label: item.sqlName, detail: item.label, insert: quote(item.sqlName) + '.' }));
    const fieldOptions = sources.flatMap(source => source.fields.filter(field => field.name.toLowerCase().includes(search) || field.label.toLowerCase().includes(search)).map(field => ({
      kind: 'field',
      label: quote(source.sqlName) + '.' + quote(field.name),
      sourceLabel: quote(source.sqlName),
      fieldLabel: quote(field.name),
      detail: [source.label, field.label, field.dataType].filter(Boolean).join(' · '),
      insert: quote(source.sqlName) + '.' + quote(field.name)
    })));
    return { start: match.index, options: [...functionOptions, ...sourceOptions, ...fieldOptions] };
  }
  // Deliberately a conservative lint check, not a complete T-SQL parser.
  function validate(sql) {
    const parts = [], parentheses = [], cases = [];
    const error = (message, index) => {
      const lines = sql.slice(0, index).split('\n');
      return { message, index, line: lines.length, column: lines.at(-1).length + 1 };
    };
    for (let i = 0; i < sql.length;) {
      const start = i, char = sql[i];
      if (/\s/.test(char)) { i++; continue; }
      if (sql.startsWith('--', i)) { const end = sql.indexOf('\n', i); i = end < 0 ? sql.length : end; continue; }
      if (sql.startsWith('/*', i)) {
        let depth = 1; i += 2;
        while (i < sql.length && depth) {
          if (sql.startsWith('/*', i)) { depth++; i += 2; }
          else if (sql.startsWith('*/', i)) { depth--; i += 2; } else i++;
        }
        if (depth) return error('Close the comment with */.', start);
        continue;
      }
      if (char === "'" || char === '"' || char === '[') {
        const end = char === '[' ? ']' : char; let closed = false; i++;
        while (i < sql.length) {
          if (sql[i] === end) {
            if (sql[i + 1] === end) { i += 2; continue; }
            i++; closed = true; break;
          } else i++;
        }
        if (!closed) return error(char === '[' ? 'Close the field or source name with ].' : 'Close the quoted text.', start);
        parts.push({ word: '', index: start }); continue;
      }
      if (char === ']') return error('Unexpected closing bracket ].', i);
      const word = sql.slice(i).match(/^[@#\p{L}_][@#$\p{L}\p{N}_]*/u)?.[0];
      if (word) { parts.push({ word: word.toUpperCase(), index: i }); i += word.length; }
      else { parts.push({ word: char, index: i }); i++; }
    }
    if (!parts.length) return error('Enter a SQL expression.', 0);
    if (parts[0].word === 'SELECT') return error('Enter an expression, or enclose a scalar SELECT subquery in parentheses.', parts[0].index);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i], word = part.word, previous = parts[i - 1]?.word;
      if (word === '(') parentheses.push(part);
      if (word === ')') {
        if (!parentheses.length) return error('Unexpected closing parenthesis ).', part.index);
        if (['+', '-', '/', '%', '=', '<', '>', '|', '&', '^', ',', '.', 'AND', 'OR'].includes(previous)) return error('Complete the expression before ).', part.index);
        parentheses.pop();
      }
      if (word === ';') return error('Enter one expression without a statement separator (;).', part.index);
      if (word === ',' && !parentheses.length) return error('Enter one expression. Add separate columns individually.', part.index);
      if (word === 'CASE') cases.push({ ...part, state: 'case' });
      else if (['WHEN', 'THEN', 'ELSE', 'END'].includes(word)) {
        const current = cases.at(-1);
        if (!current) return error(word + ' needs a matching CASE.', part.index);
        if (word === 'WHEN') {
          if (!['case', 'then'].includes(current.state)) return error('Complete the preceding CASE branch before WHEN.', part.index);
          if (previous === 'THEN') return error('Enter a result after THEN.', part.index);
          current.state = 'when';
        } else if (word === 'THEN') {
          if (current.state !== 'when' || previous === 'WHEN') return error('THEN needs a condition after WHEN.', part.index);
          current.state = 'then';
        } else if (word === 'ELSE') {
          if (current.state !== 'then' || previous === 'THEN') return error('Complete a WHEN … THEN branch before ELSE.', part.index);
          current.state = 'else';
        } else {
          if (!['then', 'else'].includes(current.state) || ['THEN', 'ELSE'].includes(previous)) return error('Complete the CASE branches before END.', part.index);
          cases.pop();
        }
      }
    }
    if (cases.length) return error('Close this CASE expression with END.', cases.at(-1).index);
    if (parentheses.length) return error('Close this parenthesis with ).', parentheses.at(-1).index);
    const last = parts.at(-1);
    if (['+', '-', '*', '/', '%', '=', '<', '>', '|', '&', '^', '.', ',', 'AND', 'OR', 'NOT', 'IS', 'LIKE', 'BETWEEN', 'AS', 'COLLATE', 'AT'].includes(last.word)) return error('Complete the expression after ' + last.word + '.', last.index);
    return null;
  }
  function createSourceCache(storage, location, now = Date.now) {
    let memory = null, previousScope = '';
    function scope() {
      const params = new Map([...new URLSearchParams(location.search)].map(([key, value]) => [key.toLowerCase(), value.toLowerCase()]));
      const id = params.get('isession') || params.get('iuniformkey') || '';
      const key = 'iqa:sql-sources:v1:' + location.pathname.toLowerCase() + ':' + encodeURIComponent(id);
      if (key !== previousScope) { memory = null; previousScope = key; }
      return { key, persistent: !!id, documentKey: params.get('iuniformkey') || '' };
    }
    function readRecord() {
      const current = scope(); let record = memory;
      if (current.persistent) { try { record = JSON.parse(storage.getItem(current.key) || 'null') || record; } catch (_) {} }
      if (!record || !Number.isFinite(record.at) || now() - record.at > 43200000 || current.documentKey && record.documentKey && current.documentKey !== record.documentKey || !Array.isArray(record.sources)) return null;
      return record;
    }
    function read() { return (readRecord()?.sources || []).filter(source => /^SR\d+$/.test(source.slot) && typeof source.name === 'string' && typeof source.alias === 'string' && typeof source.type === 'string'); }
    function capture(sources, origin = 'live') {
      const current = scope();
      memory = { at: now(), documentKey: current.documentKey, sources, origin };
      if (current.persistent) { try { storage.setItem(current.key, JSON.stringify(memory)); } catch (_) {} }
    }
    return { read, capture, hasSnapshot: () => !!readRecord() };
  }
  function definitionRequest(path) {
    return {
      $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts', OperationName: 'FindByPath', EntityTypeName: 'QueryDefinition',
      Parameters: { $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib', $values: [{ $type: 'System.String', $value: path }] },
      ParameterTypeName: { $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: ['System.String'] }, UseJson: false
    };
  }
  function definitionSources(response, path, versionKey = '', queryId = '') {
    const result = response?.Result, doc = result?.Document;
    const same = (a, b) => typeof a === 'string' && a.toLowerCase() === b.toLowerCase();
    if (!same(result?.Path, path) || !same(doc?.Path, path)) throw Error('The saved definition returned a different query path.');
    if (versionKey && !same(doc?.DocumentVersionId, versionKey)) throw Error('The saved definition belongs to a different document version.');
    if (queryId && !same(doc?.DocumentId, queryId)) throw Error('The saved definition does not match the editor query.');
    const sources = result?.Sources?.$values;
    if (!Array.isArray(sources)) throw Error('The saved definition did not contain a source list.');
    const slots = new Set();
    return sources.map(source => {
      if (!/^SR\d+$/.test(source.QuerySourceId) || slots.has(source.QuerySourceId)) throw Error('The saved source identifiers are invalid.');
      slots.add(source.QuerySourceId);
      if (source.QuerySourceType === 1 && (typeof source.BusinessControllerName !== 'string' || !source.BusinessControllerName)) throw Error('A saved business-object name is missing.');
      return { slot: source.QuerySourceId, name: source.BusinessControllerName || '', alias: source.Description || '', type: source.QuerySourceType === 1 ? 'Business Object' : 'Query' };
    });
  }
  function catalog(fields, mapping) {
    const result = new Map();
    for (const field of fields) {
      const source = mapping.find(source => source.slot === field.slot);
      // Do not invent a SQL identifier from a friendly alias or guess the suffix
      // assigned when the same business object occurs more than once.
      if (!source || source.type !== 'Business Object' || !source.name || mapping.filter(other => other.name.toLowerCase() === source.name.toLowerCase()).length !== 1) continue;
      if (!result.has(field.slot)) result.set(field.slot, { slot: field.slot, label: field.alias, sqlName: 'vBo' + source.name, fields: [] });
      const entry = result.get(field.slot);
      if (!entry.fields.some(item => item.name === field.name)) entry.fields.push({ name: field.name, label: field.label, dataType: field.dataType || '' });
    }
    return [...result.values()];
  }
  function definitionProperties(response, expectedName) {
    const result = response?.Result || response;
    if (!result || typeof result.EntityTypeName !== 'string' || result.EntityTypeName.toLowerCase() !== expectedName.toLowerCase()) throw Error('The business-object definition returned a different object.');
    const values = result.Properties?.$values;
    if (!Array.isArray(values)) throw Error('The business-object definition did not contain properties.');
    const seen = new Set(), fields = [];
    for (const property of values) {
      if (property?.Visible === false || typeof property?.Name !== 'string' || !property.Name) continue;
      const key = property.Name.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
      const dataType = typeof property.PropertyTypeName === 'string' && property.PropertyTypeName.trim()
        ? property.PropertyTypeName.trim()
        : (typeof property.ExtendedPropertyInformation?.DbDataType === 'string' ? property.ExtendedPropertyInformation.DbDataType.trim() : '');
      fields.push({ name: property.Name, label: typeof property.Caption === 'string' && property.Caption.trim() ? property.Caption.trim() : property.Name, dataType });
    }
    return fields;
  }
  if (typeof document === 'undefined') return { tokens, complete, callAt, quote, validate, createSourceCache, catalog, definitionProperties, definitionRequest, definitionSources };
  const sourceCache = createSourceCache({ getItem: key => sessionStorage.getItem(key), setItem: (key, value) => sessionStorage.setItem(key, value) }, location);
  const boDefinitions = new Map(), boDefinitionLoads = new Map();
  async function loadBusinessObjectDefinitions(mapping) {
    const names = [...new Set(mapping.filter(source => source.type === 'Business Object' && source.name).map(source => source.name))];
    const results = await Promise.allSettled(names.map(async name => {
      const key = name.toLowerCase();
      if (boDefinitions.has(key)) return;
      if (!boDefinitionLoads.has(key)) boDefinitionLoads.set(key, (async () => {
        const requestToken = (document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';
        const response = await fetch(new URL('/api/BOEntityDefinition/' + encodeURIComponent(name), location.origin), {
          method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json', ...(requestToken ? { RequestVerificationToken: requestToken } : {}) }
        });
        if (!response.ok) throw Error('Could not load fields for ' + name + ' (HTTP ' + response.status + ').');
        boDefinitions.set(key, definitionProperties(await response.json(), name));
      })().finally(() => boDefinitionLoads.delete(key)));
      await boDefinitionLoads.get(key);
    }));
    const failed = results.find(result => result.status === 'rejected');
    if (failed) throw failed.reason;
  }
  function definitionFieldCatalog(mapping) {
    const fields = mapping.flatMap(source => (boDefinitions.get(source.name.toLowerCase()) || []).map(field => ({ slot: source.slot, alias: source.alias || source.name, ...field })));
    return catalog(fields, mapping);
  }
  let definitionLoad = null;
  async function loadSavedSources() {
    if (sourceCache.hasSnapshot()) return;
    if (definitionLoad) return definitionLoad;
    const path = options.getPath?.() || '', versionKey = options.getDocumentKey?.() || '';
    if (!path.startsWith('$/')) throw Error('Open Summary to capture the saved path, or visit Sources to load the current objects.');
    const url = location.href;
    const marker = document.querySelector('#AvailableProperty [data-hidden-value]');
    const queryId = (marker?.getAttribute('data-hidden-value') || '').match(/^([0-9a-f-]{36})\.SR\d+\|/i)?.[1] || '';
    definitionLoad = (async () => {
      const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 15000);
      try {
        const token = (document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]'))?.value || '';
        const response = await fetch(new URL('/API/QueryDefinition/_execute', location.origin), {
          method: 'POST', credentials: 'same-origin', redirect: 'error', signal: controller.signal,
          headers: { 'Content-Type': 'application/json', Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}) },
          body: JSON.stringify(definitionRequest(path))
        });
        if (!response.ok) throw Error('Could not load the saved definition (HTTP ' + response.status + ').');
        const mapping = definitionSources(await response.json(), path, versionKey, queryId);
        // Never replace an editor snapshot captured while this request was running.
        if (location.href === url && options.getPath?.() === path && !sourceCache.hasSnapshot()) sourceCache.capture(mapping, 'saved');
      } finally { clearTimeout(timeout); }
    })();
    return definitionLoad;
  }
  function captureSources() {
    const panel = document.querySelector('[id$="_SourcesPanel_Body"]');
    if (!panel || !panel.getClientRects().length) return;
    const mapping = [...panel.querySelectorAll('input[type="hidden"]')].filter(input => /^SR\d+$/.test(input.value)).map(input => {
      const row = input.closest('tr');
      return { slot: input.value, name: row?.cells[0]?.textContent.trim() || '', alias: row?.querySelector('input[id*="txtAlias"]')?.value || '', type: row?.cells[2]?.textContent.trim() || '' };
    });
    sourceCache.capture(mapping);
  }
  function sourceFields() {
    const mapping = sourceCache.read();
    return definitionFieldCatalog(mapping);
  }
  const items = new Map();
  function dispose(ta, item) {
    item.observer?.disconnect(); item.abort.abort();
    item.menu.remove(); item.signature.remove(); item.hint.remove(); item.validation.remove();
    if (item.add) item.add.disabled = item.addDisabled;
    if (item.shell.parentNode) item.shell.replaceWith(ta);
    ta.classList.remove('iqa-sql-input');
    for (const [name, value] of Object.entries(item.attributes)) { if (value === null) ta.removeAttribute(name); else ta.setAttribute(name, value); }
    if (item.spellcheck === null) ta.removeAttribute('spellcheck'); else ta.setAttribute('spellcheck', item.spellcheck);
    items.delete(ta);
  }
  function mount() {
    if (!document.getElementById('iqaSqlEditorCss')) {
      const style = document.createElement('style'); style.id = 'iqaSqlEditorCss';
      style.textContent = `
        .iqa-sql-editor{position:relative;min-width:0;width:100%;background:#fff;border-radius:4px;}
        body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input,.iqa-sql-editor>pre{font:13px/1.6 Consolas,"Courier New",monospace!important;letter-spacing:normal!important;tab-size:3;white-space:pre-wrap;overflow-wrap:break-word;word-break:normal;padding:10px!important;margin:0!important;box-sizing:border-box!important;text-align:left;}
        body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input{display:block;position:relative;z-index:1;background:transparent!important;color:transparent!important;-webkit-text-fill-color:transparent;caret-color:#172b4d;overflow:auto;}
        .iqa-sql-editor>pre{position:absolute;top:0;left:0;pointer-events:none;overflow:hidden;border:1px solid transparent;color:#172b4d;background:transparent;}
        .iqa-sql-keyword{color:#7141ac;font-weight:normal}.iqa-sql-string{color:#9c3425}.iqa-sql-comment{color:#587747}.iqa-sql-number{color:#066c91}.iqa-sql-identifier{color:#005a9c}
        .iqa-sql-complete{position:fixed;z-index:100000;max-height:240px;overflow:auto;width:360px;max-width:calc(100vw - 24px);background:#fff;border:1px solid #94a3b8;border-radius:4px;box-shadow:0 4px 12px #0002;padding:3px;color:#172b4d;font:13px/1.4 Consolas,monospace;}
        .iqa-sql-complete[hidden]{display:none}.iqa-sql-complete>[role=option]{display:grid;grid-template-columns:22px minmax(0,1fr);grid-template-areas:"icon label" "icon detail";padding:6px 8px;cursor:pointer;overflow-wrap:anywhere}.iqa-sql-complete>[aria-selected=true]{background:#dcedfc}.iqa-sql-complete-icon{grid-area:icon;align-self:center;display:flex;align-items:center;justify-content:center;width:18px;height:18px;color:#4b5563;background:none}.iqa-sql-complete-icon svg{display:block;width:18px;height:18px;overflow:visible;shape-rendering:crispEdges}.iqa-sql-complete-icon[data-kind=field] svg{width:10px;height:18px}.iqa-sql-complete-label{grid-area:label;min-width:0}.iqa-sql-complete-source{color:#7b8794}.iqa-sql-complete small{grid-area:detail;display:block;color:#64748b;font:12px/1.4 system-ui}.iqa-sql-hint{display:block;margin:5px 0 8px;color:#64748b;font-size:12px;}
        .iqa-sql-signature{position:fixed;z-index:100000;max-width:min(480px,calc(100vw - 24px));background:#fff;border:1px solid #94a3b8;border-radius:4px;box-shadow:0 4px 12px #0002;padding:6px 8px;color:#475569;font:12px/1.4 system-ui}.iqa-sql-signature[hidden]{display:none}.iqa-sql-signature-call{margin-bottom:2px;color:#172b4d;font:13px/1.4 Consolas,monospace}.iqa-sql-signature strong{color:#0b5cad}
        .iqa-sql-validation{margin:5px 0;font-size:13px;color:#526173}.iqa-sql-validation[data-error=true]{color:#a12622}body.iqa-enhanced #CustomProperty textarea.iqa-sql-input[aria-invalid=true]{border-color:#a12622!important}
        @media(forced-colors:active){.iqa-sql-editor>pre{display:none}body.iqa-enhanced #CustomProperty .iqa-sql-editor>textarea.iqa-sql-input{color:CanvasText!important;-webkit-text-fill-color:CanvasText;caret-color:auto}}
      `;
      document.head.appendChild(style);
    }
    for (const [ta, item] of items) if (!ta.isConnected) dispose(ta, item);
    document.querySelectorAll('#CustomProperty textarea').forEach(ta => {
      if (items.has(ta)) return;
      const shell = document.createElement('div'); shell.className = 'iqa-sql-editor';
      const pre = document.createElement('pre'); pre.setAttribute('aria-hidden', 'true');
      const menu = document.createElement('div'); menu.className = 'iqa-sql-complete'; menu.hidden = true; menu.id = 'iqaSqlComplete-' + Math.random().toString(36).slice(2); menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'SQL suggestions'); document.body.appendChild(menu);
      // The parameter hint: the DATEADD, DATEDIFF or CONVERT call the caret is
      // in, with the current parameter in bold, its type and meaning, above the caret.
      const signature = document.createElement('div'); signature.className = 'iqa-sql-signature'; signature.hidden = true; signature.id = menu.id + '-signature'; signature.setAttribute('role', 'tooltip'); document.body.appendChild(signature);
      const hint = document.createElement('small'); hint.className = 'iqa-sql-hint';
      hint.title = 'Suggestions use configured source mappings and authoritative field names from the Business Object definition API. Every Sources load refreshes the mapping, including added or removed objects, and takes precedence over the saved query definition.';
      const readyHint = 'Type a source, field name or alias for suggestions, dbo. for iMIS functions, or DATEADD, DATEDIFF or CONVERT for their parameters. Use ↑ / ↓ and Tab or Enter to insert; Tab inserts 3 spaces when suggestions are closed; Esc dismisses.';
      hint.textContent = sourceFields().length ? readyHint : 'Click the SQL box to load configured sources and their Business Object fields.';
      const attributes = Object.fromEntries(['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'aria-invalid', 'aria-describedby'].map(name => [name, ta.getAttribute(name)]));
      const validation = document.createElement('div'); validation.className = 'iqa-sql-validation'; validation.id = menu.id + '-validation'; validation.setAttribute('role', 'status');
      const add = ta.closest('table')?.querySelector('input[type="submit"], button[type="submit"]');
      const item = { shell, menu, signature, hint, validation, add, addDisabled: add?.disabled, attributes, abort: new AbortController(), spellcheck: ta.getAttribute('spellcheck') };
      ta.before(shell); shell.append(pre, ta); ta.classList.add('iqa-sql-input'); ta.spellcheck = false;
      shell.after(hint); ta.setAttribute('role', 'combobox'); ta.setAttribute('aria-autocomplete', 'list'); ta.setAttribute('aria-controls', menu.id); ta.setAttribute('aria-expanded', 'false');
      hint.after(validation); ta.setAttribute('aria-describedby', [attributes['aria-describedby'], validation.id, signature.id].filter(Boolean).join(' '));
      const check = () => {
        const issue = validate(ta.value), hasText = !!ta.value.trim();
        validation.dataset.error = String(!!issue && hasText); ta.setAttribute('aria-invalid', String(!!issue && hasText));
        validation.textContent = issue ? (hasText ? `Line ${issue.line}, column ${issue.column}: ${issue.message}` : 'Enter an expression to enable Add.') : 'Basic syntax checks passed. Full SQL validation happens when the query runs.';
        if (add) add.disabled = item.addDisabled || !!issue;
        return issue;
      };
      const guardAdd = event => {
        const issue = check(); if (!issue) return;
        event.preventDefault(); event.stopImmediatePropagation(); ta.focus(); ta.setSelectionRange(issue.index, issue.index);
      };
      add?.addEventListener('click', guardAdd, { capture: true, signal: item.abort.signal });
      ta.form?.addEventListener('submit', event => { if (event.submitter === add) guardAdd(event); }, { capture: true, signal: item.abort.signal });
      let suggestions = null, active = 0;
      const close = () => { menu.hidden = true; suggestions = null; ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant'); };
      const select = () => {
        [...menu.children].forEach((node, i) => node.setAttribute('aria-selected', String(i === active)));
        const node = menu.children[active];
        if (node) {
          ta.setAttribute('aria-activedescendant', node.id);
          if (node.offsetTop < menu.scrollTop) menu.scrollTop = node.offsetTop;
          else if (node.offsetTop + node.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = node.offsetTop + node.offsetHeight - menu.clientHeight;
        }
      };
      // The caret's viewport position, from a hidden copy of the text before it.
      const caretAt = () => {
        const mirror = document.createElement('div'), caret = document.createElement('span');
        const style = getComputedStyle(ta);
        Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', width: ta.clientWidth + 'px', boxSizing: 'border-box', font: style.font, padding: style.padding, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: '3' });
        mirror.textContent = ta.value.slice(0, ta.selectionStart); caret.textContent = '\u200b'; mirror.appendChild(caret); document.body.appendChild(mirror);
        const origin = mirror.getBoundingClientRect(), point = caret.getBoundingClientRect(), box = ta.getBoundingClientRect();
        mirror.remove();
        return { left: box.left + point.left - origin.left - ta.scrollLeft, top: box.top + point.top - origin.top - ta.scrollTop };
      };
      const position = () => {
        const { left, top } = caretAt();
        menu.style.left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(top + 22, window.innerHeight - menu.offsetHeight - 8)) + 'px';
      };
      const hideSignature = () => { signature.hidden = true; };
      const showSignature = () => {
        const call = document.activeElement === ta && ta.selectionStart === ta.selectionEnd ? callAt(ta.value.slice(0, ta.selectionStart)) : null;
        if (!call) return hideSignature();
        const param = call.params[call.arg], head = document.createElement('div'); head.className = 'iqa-sql-signature-call';
        head.append(call.name + '(');
        call.params.forEach((item, index) => {
          if (index) head.append(', ');
          const name = document.createElement(index === call.arg ? 'strong' : 'span'); name.textContent = item.name; head.append(name);
        });
        head.append(')');
        signature.replaceChildren(head, param.name + ' (' + param.type + '): ' + param.detail + '.');
        signature.hidden = false;
        const { left, top } = caretAt();
        signature.style.left = Math.max(8, Math.min(left, window.innerWidth - signature.offsetWidth - 8)) + 'px';
        signature.style.top = Math.max(8, top - signature.offsetHeight - 4) + 'px';
      };
      const suggest = () => {
        if (ta.selectionStart !== ta.selectionEnd) return close();
        suggestions = complete(ta.value.slice(0, ta.selectionStart), sourceFields());
        if (!suggestions?.options.length) return close();
        active = 0; menu.replaceChildren();
        suggestions.options.forEach((option, index) => {
          const node = document.createElement('div'); node.setAttribute('role', 'option'); node.id = menu.id + '-' + index;
          const kind = ['source', 'function', 'value'].includes(option.kind) ? option.kind : 'field';
          node.setAttribute('aria-label', { source: 'Source: ', field: 'Field: ', function: 'Function: ', value: 'Value: ' }[kind] + option.label + '. ' + option.detail);
          const icon = document.createElement('span'); icon.className = 'iqa-sql-complete-icon'; icon.dataset.kind = kind; icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = kind === 'source'
            ? '<svg viewBox="0 0 18 18"><rect x="1.5" y="1.5" width="15" height="15" fill="none" stroke="currentColor"/><rect x="2" y="2" width="14" height="3.5" fill="#9aa2ac"/><path d="M1.5 5.5h15M6.5 5.5v11M11.5 5.5v11M1.5 9.17h15M1.5 12.83h15" fill="none" stroke="currentColor"/></svg>'
            : kind === 'function'
              ? '<svg viewBox="0 0 18 18"><text x="9" y="13.5" text-anchor="middle" fill="currentColor" font-family="Georgia,serif" font-size="12" font-style="italic">fx</text></svg>'
              : kind === 'value'
                ? '<svg viewBox="0 0 18 18"><path d="M3 5.5h12M3 9h12M3 12.5h8" fill="none" stroke="currentColor"/></svg>'
                : '<svg viewBox="4 0 10 18"><rect x="5" y="1.5" width="8" height="15" fill="none" stroke="currentColor"/><rect x="5.5" y="2" width="7" height="3.5" fill="#9aa2ac"/><path d="M5 5.5h8M5 9.17h8M5 12.83h8" fill="none" stroke="currentColor"/></svg>';
          const label = document.createElement('span'); label.className = 'iqa-sql-complete-label';
          if (kind === 'field' && option.sourceLabel) {
            const sourceName = document.createElement('span'); sourceName.className = 'iqa-sql-complete-source'; sourceName.textContent = option.sourceLabel + '.';
            const fieldName = document.createElement('span'); fieldName.textContent = option.fieldLabel;
            label.append(sourceName, fieldName);
          } else label.textContent = option.label;
          const detail = document.createElement('small'); detail.textContent = option.detail; node.appendChild(detail);
          node.prepend(icon, label);
          node.addEventListener('pointerdown', event => { event.preventDefault(); active = index; accept(); }); menu.appendChild(node);
        });
        menu.hidden = false; ta.setAttribute('aria-expanded', 'true'); select(); position();
      };
      const accept = () => {
        const option = suggestions?.options[active]; if (!option) return;
        const start = suggestions.start, end = ta.selectionEnd;
        const suffix = ta.value.slice(end).match(/^[\w]*\]?/)?.[0] || '';
        close(); ta.focus(); ta.setRangeText(option.insert, start, end + suffix.length, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      };
      let requestedSources = false;
      ta.addEventListener('focus', async () => {
        if (requestedSources) return;
        requestedSources = true; hint.textContent = 'Loading sources and Business Object fields…'; shell.setAttribute('aria-busy', 'true');
        try {
          await loadSavedSources();
          await loadBusinessObjectDefinitions(sourceCache.read());
          if (item.abort.signal.aborted) return;
          hint.textContent = sourceFields().length ? readyHint : 'No unambiguous business-object suggestions are available. Visit Sources to refresh the current definition.';
          if (document.activeElement === ta) suggest();
        } catch (error) {
          requestedSources = false;
          if (!item.abort.signal.aborted) {
            hint.textContent = (error.name === 'AbortError' ? 'Loading the saved definition timed out.' : error.message) + ' You can continue typing SQL or retry by focusing this field again.';
            if (document.activeElement === ta) suggest();
          }
        } finally { shell.removeAttribute('aria-busy'); }
      }, { signal: item.abort.signal });
      const sync = () => {
        pre.style.width = (ta.clientWidth + 2) + 'px'; pre.style.height = (ta.clientHeight + 2) + 'px';
        pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft;
      };
      const paint = () => {
        const fragment = document.createDocumentFragment();
        for (const token of tokens(ta.value)) {
          const span = document.createElement('span'); span.textContent = token.text;
          if (token.type) span.className = 'iqa-sql-' + token.type;
          fragment.appendChild(span);
        }
        fragment.appendChild(document.createTextNode('\n')); pre.replaceChildren(fragment); sync(); check();
      };
      ta.addEventListener('input', event => { paint(); if (event.isComposing) close(); else suggest(); showSignature(); }, { signal: item.abort.signal });
      ta.addEventListener('change', paint, { signal: item.abort.signal });
      ta.addEventListener('scroll', () => { sync(); close(); hideSignature(); }, { signal: item.abort.signal });
      ta.addEventListener('blur', () => { close(); hideSignature(); }, { signal: item.abort.signal });
      ta.addEventListener('click', () => { close(); showSignature(); }, { signal: item.abort.signal });
      ta.addEventListener('keyup', event => { if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) showSignature(); }, { signal: item.abort.signal });
      window.addEventListener('resize', () => { close(); hideSignature(); }, { signal: item.abort.signal });
      ta.addEventListener('keydown', event => {
        if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
        if (menu.hidden) {
          if (event.key === 'Escape' && !signature.hidden) { event.preventDefault(); hideSignature(); }
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            ta.setRangeText('   ', ta.selectionStart, ta.selectionEnd, 'end');
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
          return;
        }
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); active = (active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.options.length) % suggestions.options.length; select(); }
        else if (!event.shiftKey && (event.key === 'Tab' || event.key === 'Enter')) { event.preventDefault(); accept(); }
        else if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'].includes(event.key)) close();
      }, { signal: item.abort.signal });
      if (typeof ResizeObserver !== 'undefined') { item.observer = new ResizeObserver(sync); item.observer.observe(ta); }
      items.set(ta, item); paint();
    });
  }
  function teardown() { for (const [ta, item] of items) dispose(ta, item); }
  return { mount, teardown, captureSources };
}
if (typeof module !== 'undefined' && module.exports) module.exports = createSqlEditor;

  const SqlEditor = createSqlEditor({ getPath: () => HeaderPath._read().path, getDocumentKey: () => HeaderDocumentKey._read() });
  // END SQL EDITOR V1

  // BEGIN TEMPLATE HTML EDITOR V2
  /* Template tab, HTML view: highlighting, formatting, tag pairing and
     {#query.Alias} suggestions from the shared UnionSuite HTML source editor
     (Scripts/HtmlSourceEditor.js, window.UnionSuiteHtmlSource).

     Suggestions come from the native "Insert data source field" tool. The
     helper reads its items from the editor configuration rather than the
     tool's popup, which RadEditor builds only when the dropdown is first
     opened, so they are ready as soon as the tab loads, in Design mode too. */
  const TemplateHtml = (() => {
    const EDITORS = '[id$="_TemplatePanel_Body"] .RadEditor';
    const OPTIONS = {
      fieldTool: 'QueryTemplateInsertField',
      messages: {
        ready: count => count + (count === 1 ? ' data source field' : ' data source fields')
          + '. Type {# for suggestions, or press Ctrl+Space.',
        noFields: 'No data source fields were found. Add columns on the Display tab.',
        unknown: list => (list.length === 1 ? 'Not a Display column: ' : 'Not Display columns: ')
          + list.join(', ') + '. Add it on the Display tab, or correct the alias.'
      }
    };
    const controllers = new Map();
    let waiting = false;

    function mount() {
      for (const [editorEl, controller] of controllers) {
        if (!editorEl.isConnected) { controller.dispose(); controllers.delete(editorEl); }
      }
      const editors = document.querySelectorAll(EDITORS);
      if (!editors.length) return;
      const shared = window.UnionSuiteHtmlSource;
      if (!shared) {
        // The loader normally runs the helper first; this covers it arriving late.
        if (!waiting) {
          waiting = true;
          document.addEventListener('unionsuite:html-source-ready', () => { waiting = false; if (getMode()) mount(); }, { once: true });
        }
        return;
      }
      editors.forEach(editorEl => {
        if (controllers.has(editorEl)) return;
        const controller = shared.attachRadEditor(editorEl, OPTIONS);
        if (controller) controllers.set(editorEl, controller);
      });
    }

    function teardown() {
      for (const controller of controllers.values()) controller.dispose();
      controllers.clear();
    }

    return { mount, teardown };
  })();
  // END TEMPLATE HTML EDITOR V2

  const ALWAYS = [QuickAdd, { mount: () => SqlEditor.captureSources() }];
  const GATED  = [OverhaulCss, BoSearch, SqlTools, FilterSortDropdowns, UncheckAll, FilterAutocomplete, DragSort, FilterWorkspace, SourceWorkspace, Branchify, RelationshipWorkspace, SqlEditor, TemplateHtml];

  const mountAlways  = () => ALWAYS.forEach(m => safe(() => m.mount?.()));
  const enableGated  = () => { document.body.classList.add('iqa-enhanced'); GATED.forEach(m => safe(() => m.mount?.())); };
  const disableGated = () => { [...GATED].reverse().forEach(m => safe(() => m.teardown?.())); document.body.classList.remove('iqa-enhanced'); };

  function ensureEnhanceHelp(pill) {
    injectStyle('iqaEnhanceHelpCss', `
      /* Presentation comes from the theme's native button classes. Only the
         dialog's own layout and the compact "?" glyph are set here. */
      #iqaEnhanceHelp{flex:0 0 auto;font-size:var(--fs-md,16px);font-weight:var(--fw-semi,600);line-height:1;}
      #iqaEnhanceHelpDialog{width:min(740px,92vw);max-height:88vh;padding:0;box-sizing:border-box;border:1px solid var(--border,#e2e5e9);border-radius:var(--radius,8px);background:var(--bg-surface,#fff);color:var(--text-base,#545962);font:var(--fw-normal,400) var(--fs-base,14px)/var(--lh-loose,1.65) var(--font-body,"Open Sans","Helvetica Neue",Arial,sans-serif);box-shadow:var(--shadow-lg,0 8px 20px rgba(0,27,35,.16));text-align:left;}
      #iqaEnhanceHelpDialog[open]{display:flex;flex-direction:column;}
      #iqaEnhanceHelpDialog::backdrop{background:rgb(0 27 35 / .4);}
      #iqaEnhanceHelpDialog header{display:flex;align-items:center;justify-content:space-between;gap:var(--space-4,16px);flex-shrink:0;padding:var(--space-4,16px) var(--space-5,20px);border-bottom:1px solid var(--border,#e2e5e9);}
      #iqaEnhanceHelpDialog h2{margin:0;color:var(--text-strong,#1c2024);font:var(--fw-semi,600) var(--fs-xl,22px)/var(--lh-tight,1.25) var(--font-display,"Red Hat Display","Open Sans",Helvetica,Arial,sans-serif);}
      #iqaEnhanceHelpDialog .iqa-help-content{overflow:auto;min-height:0;padding:var(--space-2,8px) var(--space-6,24px) var(--space-6,24px);}
      #iqaEnhanceHelpDialog h3{margin:var(--space-5,20px) 0 var(--space-2,8px);color:var(--text-strong,#1c2024);font-size:var(--fs-md,16px);}
      #iqaEnhanceHelpDialog ul,#iqaEnhanceHelpDialog ol{margin:0;padding-left:22px;}
      #iqaEnhanceHelpDialog li{margin:var(--space-1,4px) 0;}
      #iqaEnhanceHelpDialog .iqa-help-note{margin:var(--space-5,20px) 0 0;padding:var(--space-3,12px);border-radius:var(--radius-sm,4px);background:var(--info-bg,#e4f0f4);}
    `);
    let button = document.getElementById('iqaEnhanceHelp');
    if (!button) {
      button = document.createElement('button'); button.type = 'button'; button.id = 'iqaEnhanceHelp'; button.textContent = '?';
      button.className = 'TextButton us-icon-button';
      button.title = 'About IQA enhancements'; button.setAttribute('aria-label', 'Help with IQA enhancements');
      button.setAttribute('aria-haspopup', 'dialog'); button.setAttribute('aria-controls', 'iqaEnhanceHelpDialog');
      button.addEventListener('click', () => {
        let dialog = document.getElementById('iqaEnhanceHelpDialog');
        if (!dialog) {
          dialog = document.createElement('dialog'); dialog.id = 'iqaEnhanceHelpDialog'; dialog.setAttribute('aria-labelledby', 'iqaEnhanceHelpTitle');
          dialog.innerHTML = `<header><h2 id="iqaEnhanceHelpTitle">IQA enhancements</h2><button type="button" class="TextButton us-outline-button" autofocus>Close</button></header>
            <div class="iqa-help-content">
              <h3>Throughout IQA</h3>
              <ul><li>Turn the improvements on or off using <strong>Enhance</strong>.</li>
              <li>Press <strong>Ctrl+S</strong>, or <strong>Command+S</strong> on a Mac, while working in the query designer to save your query. The Save button shows <strong>Saving…</strong> with a spinner while the save is in progress.</li>
              <li>Copy the query path or DocumentVersionKey from the header, even after switching tabs. Hover over either button to see the value. The DocumentVersionKey is captured when you open an existing IQA.</li>
              </ul>
              <h3>Summary</h3>
              <ul><li>Copy the query path or SQL summary with one click.</li><li>Larger fields make descriptions and SQL easier to read.</li></ul>
              <h3>Sources</h3>
              <ol><li>Quick add business objects via search or the <strong>Union Template</strong> quick-add list.</li>
              <li>Drag and drop to reorder business objects (via popup).</li>
              <li>Quick add relationships using <strong>Join by ID</strong>, choosing the key type (Id, Key, Code or Ordinal) your business objects share. Original relationships are still available via <strong>Choose fields</strong>, or <strong>Predefined relationship</strong>.</li>
              <li>See when a matching relationship already exists.</li>
              <li>Relations show as a <strong>join tree</strong> from the first business object, with each relationship's join type and delete beside it. Separate groups, Equals joins under a left join and predefined relationships that don't join key to key (Id, Key, Code or Ordinal) are flagged. Switch to <strong>List</strong> in the Relations heading for the standard view.</li>
              <li><strong>Branchify</strong> limits results to the entities the signed-in user can access. It adds <strong>i4u_UT_EntityAccess</strong> and the filter <strong>Contact Key = "@LoggedInUser"</strong> in the background, then refreshes the editor once. Anything already in place is kept. When exactly one business object has an <strong>OrgCode</strong>, <strong>Org_Code</strong>, <strong>EntityCode</strong> or <strong>Entity_Code</strong> field, it can also add that relationship. When there are several such fields, choose which one to join, or none.</li>
              <li>With <strong>i4u_UT_EntityAccess</strong> in the query, the <strong>Branchify</strong> tab under Add relationship joins its <strong>Entity Code</strong> to an <strong>OrgCode</strong>, <strong>Org_Code</strong>, <strong>EntityCode</strong> or <strong>Entity_Code</strong> field on another business object.</li></ol>
              <h3>Filters</h3>
              <ol><li>Type to search on field dropdowns.</li>
              <li>Drag and drop to reorder filters (via popup).</li>
              <li>When multiple filter groups are defined: see numbered groups and grouping order of operations. eg. <strong>((Group 1 OR Group 2) AND Group 3)</strong>.</li>
              <li>Function setting hidden behind the <strong>ƒx</strong> icon.</li>
              <li><strong>Allow multiple values</strong> moved beneath the relevant dropdown.</li>
              <li><strong>Search Label</strong> column hidden when no optional/required fields exist.</li>
              <li>Add condition moved to beneath the last group.</li></ol>
              <h3>Display</h3>
              <ol><li>Drag columns into the order you want.</li>
              <li>Toggle drag and drop off when you don’t need it.</li>
              <li>Use <strong>Reset order</strong> to undo changes you've made via drag and drop.</li>
              <li>Edit or copy custom SQL using the buttons beside the field.</li>
              <li>Type a business-object name, alias, or field name to see matching source and fully qualified field suggestions. All fields in each configured Business Object are included, whether selected or still available, and field suggestions show their data type. Source and field icons identify each result. Suggestions insert the actual SQL source name.</li>
              <li>Type <strong>dbo.</strong> to list iMIS SQL functions: <strong>asi_GetAppDatetime()</strong> returns the instance’s configured local date and time (use it instead of GETDATE()), and <strong>asi_PublishedDocumentPath()</strong> returns a document’s published path. The document path is listed only when a source has a DocumentVersionKey field, and is inserted with that field filled in.</li>
              <li> Use the arrow keys and Tab or Enter to insert; Escape closes the list. With the list closed, Tab inserts three spaces.</li>
              <li>Configured source mappings are loaded from the current Sources tab or saved query definition. Field names and captions are loaded from the Business Object definition API.</li>
              <li>Common SQL syntax errors show a line and column number and disable <strong>Add</strong> until corrected. These basic checks do not replace full SQL validation when running the query.</li></ol>
              <h3>Sorting</h3>
              <ul><li>Type to search on field dropdowns.</li><li>Drag and drop fields to reorder.</li></ul>
              <h3>Template</h3>
              <ol><li>In <strong>HTML</strong> view, tags, attributes, values and <strong>{#query.…}</strong> fields are colour-coded.</li>
              <li>Type <strong>{#</strong> to list the data source fields from the Display tab, or press <strong>Ctrl+Space</strong>. Use the arrow keys and Tab or Enter to insert; Escape closes the list. With the list closed, Tab inserts two spaces.</li>
              <li>With the cursor on an opening or closing tag, it and its partner are highlighted.</li>
              <li>A tag that is never closed, or a closing tag with nothing to close, is underlined in red and listed below the editor with its line number. <strong>Go to problem</strong> selects each in turn. Tags HTML lets you leave open, such as <strong>&lt;p&gt;</strong>, <strong>&lt;li&gt;</strong> and <strong>&lt;td&gt;</strong>, are not reported.</li>
              <li>Fields that are not Display columns are underlined in red and listed below the editor.</li>
              <li><strong>Format HTML</strong>, or <strong>Shift+Alt+F</strong>, re-indents the template without changing its tags or attributes. Undo with Ctrl+Z.</li></ol>
              <p class="iqa-help-note"><strong>Remember:</strong> applying a new order updates the editor. Click <strong>Save</strong>, press <strong>Ctrl+S</strong>, or press <strong>Command+S</strong> on a Mac when you’re ready to save the query.</p>
            </div>`;
          dialog.querySelector('header button').addEventListener('click', () => dialog.close());
          dialog.addEventListener('close', () => document.getElementById('iqaEnhanceHelp')?.focus({ preventScroll: true }));
          dialog.addEventListener('click', event => {
            if (event.target !== dialog) return;
            const bounds = dialog.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
          });
          document.body.appendChild(dialog);
        }
        if (!dialog.open) { dialog.querySelector('.iqa-help-content').scrollTop = 0; dialog.showModal(); }
      });
    }
    if (pill.nextElementSibling !== button) pill.after(button);
  }

  function paintToggle() {
    // Setting the native checkbox is enough: the theme's switch renders the
    // track, thumb and On/Off text from :checked, and exposes aria-checked.
    const input = document.getElementById('iqaEnhanceToggleInput');
    if (input) input.checked = getMode();
  }
  // Tab-local editor memory: Summary supplies the authoritative path. Other tabs
  // may omit it entirely, including after a full native editor refresh.
  const HeaderPath = {
    _record: null,
    _queryKey(search) {
      // QueryKey identifies the IQA; tab selection and other editor parameters do not.
      for (const [name, value] of new URLSearchParams(search)) if (name.toLowerCase() === 'querykey') return value.toLowerCase();
      return '';
    },
    _read() {
      const session = [...new URLSearchParams(location.search)].find(([name]) => name.toLowerCase() === 'isession')?.[1]?.toLowerCase() || '';
      const key = 'iqa:header-path:v1:' + location.pathname.toLowerCase() + (session ? ':session:' + encodeURIComponent(session) : '');
      if (this._storageKey !== key) { this._record = null; this._storageKey = key; }
      const queryKey = this._queryKey(location.search);
      const field = document.querySelector('span[id$="_QueryPath"]');
      let record = this._record;
      try { record = JSON.parse(sessionStorage.getItem(key) || 'null') || record; } catch (_) {}
      const path = field?.textContent.trim() || '';
      const visibleSummary = field?.closest('[id$="_SummaryPanel_Body"]')?.getClientRects().length > 0;
      const previousQueryKey = record?.queryKey || this._queryKey(record?.query || '');
      if (path.startsWith('$/') || visibleSummary) {
        // Only an active Summary can clear an unsaved query's path. Empty hidden
        // Summary controls on other tabs must not erase the captured value.
        record = path.startsWith('$/') ? { path, queryKey, at: Date.now() } : null;
        try { if (record) sessionStorage.setItem(key, JSON.stringify(record)); else sessionStorage.removeItem(key); } catch (_) {}
      } else if (record && (Date.now() - record.at > 43200000 || queryKey && previousQueryKey && queryKey !== previousQueryKey)) {
        record = null;
        try { sessionStorage.removeItem(key); } catch (_) {}
      }
      this._record = record;
      return { path: typeof record?.path === 'string' && record.path.startsWith('$/') ? record.path : '', field };
    },
    mount(pill) {
      const state = this._read();
      let button = document.getElementById('iqaHeaderCopyPath');
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.id = 'iqaHeaderCopyPath'; button.className = 'TextButton us-outline-button iqa-header-copy-button';
        button.innerHTML = COPY_ICON + copyLabel('Path');
        button.setAttribute('aria-label', 'Copy query path');
        const status = document.createElement('span'); status.className = 'iqa-header-copy-status'; status.setAttribute('role', 'status');
        button.appendChild(status);
        button.addEventListener('click', async () => {
          const current = this._read(); if (!current.path) return;
          const ok = await copyText(current.path);
          if (!button.isConnected) return;
          headerCopied(button, ok, 'Path', ok ? 'Query path copied' : 'Could not copy query path');
          if (ok) SqlTools._flash(current.field || button);
        });
      }
      button.disabled = !state.path;
      button.title = state.path || 'Open Summary to capture the query path';
      if (button.parentElement !== pill.parentElement || button.nextElementSibling !== pill) pill.before(button);
    }
  };
  // A header copy button's feedback, as the theme's copy buttons give it: the
  // copy icon turns into the success tick and the label reads "Copied" for
  // the theme's 1.6s, then both turn back. Its value is not on the page, so
  // there is nothing to flash.
  const headerTimers = new WeakMap();
  function headerCopied(button, ok, text, announcement) {
    clearTimeout(headerTimers.get(button));
    const label = button.querySelector('.iqa-header-copy-text'), status = button.querySelector('.iqa-header-copy-status');
    const icon = button.querySelector(':scope > svg');
    label.textContent = ok ? 'Copied' : 'Copy failed';
    status.textContent = announcement;
    if (icon) icon.outerHTML = ok ? TICK_ICON : COPY_ICON;
    button.classList.toggle('is-copied', ok);
    headerTimers.set(button, setTimeout(() => {
      label.textContent = text; status.textContent = '';
      button.classList.remove('is-copied');
      const shown = button.querySelector(':scope > svg'); if (shown) shown.outerHTML = COPY_ICON;
    }, 1600));
  }
  const HeaderDocumentKey = {
    _record: null,
    _read() {
      const params = new Map([...new URLSearchParams(location.search)].map(([name, value]) => [name.toLowerCase(), value]));
      const session = (params.get('isession') || '').toLowerCase();
      const storageKey = 'iqa:document-key:v1:' + location.pathname.toLowerCase() + ':session:' + encodeURIComponent(session);
      if (this._storageKey !== storageKey) { this._record = null; this._storageKey = storageKey; }
      const supplied = params.get('iuniformkey');
      const valid = value => typeof value === 'string' && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value) && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(value);
      let record = this._record;
      if (session) { try { record = JSON.parse(sessionStorage.getItem(storageKey) || 'null') || record; } catch (_) {} }
      const newQuery = /^(new|add|create)$/i.test(params.get('imode') || '') || /^(new|add|create)$/i.test(params.get('ioperation') || '');
      if (newQuery) record = null;
      else if (supplied !== undefined) record = valid(supplied) ? { value: supplied, at: Date.now() } : null;
      else if (!session || !valid(record?.value) || !Number.isFinite(record?.at) || Date.now() - record.at > 43200000) record = null;
      this._record = record;
      if (session) { try { if (record) sessionStorage.setItem(storageKey, JSON.stringify(record)); else sessionStorage.removeItem(storageKey); } catch (_) {} }
      return record?.value || '';
    },
    mount(pill) {
      const key = this._read();
      let button = document.getElementById('iqaHeaderCopyDocumentKey');
      if (!button) {
        button = document.createElement('button'); button.type = 'button';
        button.id = 'iqaHeaderCopyDocumentKey'; button.className = 'TextButton us-outline-button iqa-header-copy-button';
        button.innerHTML = COPY_ICON + copyLabel('DocumentVersionKey');
        button.setAttribute('aria-label', 'Copy query DocumentVersionKey');
        const status = document.createElement('span'); status.className = 'iqa-header-copy-status'; status.setAttribute('role', 'status'); button.appendChild(status);
        button.addEventListener('click', async () => {
          const current = this._read(); if (!current) return;
          const ok = await copyText(current); if (!button.isConnected) return;
          headerCopied(button, ok, 'DocumentVersionKey', ok ? 'DocumentVersionKey copied' : 'Could not copy DocumentVersionKey');
        });
      }
      button.disabled = !key;
      button.title = key || 'Reopen an existing IQA to capture its DocumentVersionKey';
      if (button.parentElement !== pill.parentElement || button.nextElementSibling !== pill) pill.before(button);
    }
  };
  let shortcutSaveState = null;
  function clearShortcutSaving() {
    const state = shortcutSaveState;
    if (!state) return;
    shortcutSaveState = null;
    clearTimeout(state.timer);
    state.spinner.remove();
    state.save.disabled = state.disabled;
    if (state.isInput) state.save.value = state.label;
    if (state.busy === null) state.save.removeAttribute('aria-busy');
    else state.save.setAttribute('aria-busy', state.busy);
  }
  function showShortcutSaving(save) {
    injectStyle('iqaSaveSpinnerCss', '.iqa-save-spinner{display:inline-block;width:16px;height:16px;box-sizing:border-box;border:2px solid #cbd5e1;border-top-color:#007fa3;border-radius:50%;vertical-align:middle;animation:iqaSaveSpin .7s linear infinite;}@keyframes iqaSaveSpin{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.iqa-save-spinner{animation:none;}}');
    const spinner = document.createElement('span');
    spinner.className = 'iqa-save-spinner';
    spinner.setAttribute('role', 'status'); spinner.setAttribute('aria-label', 'Saving query');
    const state = { save, spinner, disabled: save.disabled, busy: save.getAttribute('aria-busy'), isInput: save.tagName === 'INPUT', label: save.value };
    shortcutSaveState = state;
    save.disabled = true; save.setAttribute('aria-busy', 'true');
    if (state.isInput) save.value = 'Saving…';
    save.after(spinner);
    // Recover if navigation is cancelled or the native save leaves the page open.
    state.timer = setTimeout(clearShortcutSaving, 30000);
  }
  function handleSaveShortcut(event) {
    if ((!event.ctrlKey && !event.metaKey) || (event.ctrlKey && event.metaKey) || event.altKey || event.shiftKey || event.isComposing || event.key.toLowerCase() !== 's') return;
    const save = document.querySelector('[id$="_DesignShell1_SaveButton"]');
    if (!save) return;
    event.preventDefault();
    // Use the current native control after each postback, including its validation.
    if (shortcutSaveState || event.repeat || save.matches(':disabled, [aria-disabled="true"]') || !save.getClientRects().length || document.querySelector('dialog[open]')) return;
    const prm = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
    if (prm?.get_isInAsyncPostBack?.()) return;
    let clickEvent;
    const observe = event => { clickEvent = event; };
    save.addEventListener('click', observe, { capture: true, once: true });
    try {
      // Click first: disabling beforehand would suppress native validation/postback.
      save.click();
      if (!clickEvent?.defaultPrevented && window.Page_IsValid !== false) showShortcutSaving(save);
    } finally { save.removeEventListener('click', observe, true); }
  }

  function ensureToggle() {
    const save = document.querySelector('[id$="_DesignShell1_SaveButton"]');
    const group = save?.parentElement;
    if (!group) { document.getElementById('iqaEnhanceToggle')?.remove(); document.getElementById('iqaHeaderCopyPath')?.remove(); document.getElementById('iqaHeaderCopyDocumentKey')?.remove(); document.getElementById('iqaEnhanceHelp')?.remove(); document.getElementById('iqaEnhanceHelpDialog')?.remove(); return; }
    const firstAction = group.querySelector('[id$="_DesignShell1_SaveAsButton"]') || save;
    save.setAttribute('aria-keyshortcuts', 'Control+S Meta+S');
    if (!save.dataset.iqaOriginalTitle) save.dataset.iqaOriginalTitle = save.title || 'Save query';
    save.title = save.dataset.iqaOriginalTitle + ' (Ctrl+S or ⌘S)';

    injectStyle('iqaEnhanceToggleCss',
      '.iqa-editor-actions{display:flex;align-items:center;justify-content:flex-end;flex-wrap:wrap;gap:var(--space-2,8px);}' +
      '.iqa-header-copy-button{display:inline-flex;align-items:center;gap:var(--space-2,8px);margin:0;white-space:nowrap;}' +
      '.iqa-header-copy-button > svg{flex:none;width:16px;height:16px;}' +
      // The success tick pops in, in the theme's success colour (as US-COPY).
      '.iqa-header-copy-button.is-copied > svg{color:var(--success,#1f7a4d);animation:iqaCopyTick 180ms ease;}' +
      '@keyframes iqaCopyTick{from{opacity:0;transform:scale(.65);}}' +
      '@media(prefers-reduced-motion:reduce){.iqa-header-copy-button.is-copied > svg{animation:none;}}' +
      '.iqa-header-copy-label{display:grid;justify-items:center;}' +
      '.iqa-header-copy-label > span{grid-area:1/1;}' +
      '.iqa-header-copy-label > span + span{visibility:hidden;}' +
      '.iqa-header-copy-status{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}' +
      '.iqa-copy-flash{background-color:rgba(0,126,168,.12)!important;background-color:color-mix(in srgb,var(--border-focus,#006f94) 14%,transparent)!important;}' +
      '#iqaEnhanceToggle{margin:0;}' +
      '#iqaEnhanceToggle > span:not([class]){white-space:nowrap;}');

    let pill = document.getElementById('iqaEnhanceToggle');
    if (!pill) {
      pill = elFromHTML(`<label id="iqaEnhanceToggle" class="us-switch us-switch--primary" title="Turn the IQA editor enhancements on or off">
        <input type="checkbox" role="switch" id="iqaEnhanceToggleInput">
        <span class="us-switch__track" aria-hidden="true"></span>
        <span>Enhance</span>
      </label>`);
      pill.querySelector('input').addEventListener('change', event => {
        const next = event.target.checked; setMode(next);
        if (next) enableGated(); else disableGated();
        paintToggle();
      });
    }
    // Keep the native actions and their handlers in place. Remount after postbacks.
    group.classList.add('iqa-editor-actions');
    if (pill.parentElement !== group || pill.nextElementSibling !== firstAction) group.insertBefore(pill, firstAction);
    paintToggle();
    HeaderPath.mount(pill);
    HeaderDocumentKey.mount(pill);
    ensureEnhanceHelp(pill);
  }

  function run() {
    mountAlways();
    if (getMode()) enableGated();
    ensureToggle();
  }

  /* ---- boot + postback re-run ------------------------------------------- */
  function boot() {
    document.addEventListener('keydown', handleSaveShortcut);
    window.addEventListener('pageshow', clearShortcutSaving);
    TabBusy.watch();
    // DOM readiness is sufficient on every editor tab. Waiting for a Sources
    // or Display control delayed Summary/Sorting startup by over ten seconds.
    run();
    let tries = 0;
    const attachPostbacks = () => {
      try {
        const prm = window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
        if (!prm) return false;
        prm.add_beginRequest(() => TabBusy.begin());
        prm.add_endRequest(() => { TabBusy.clear(); clearShortcutSaving(); run(); });
        return true;
      } catch (_) { return false; }
    };
    // A late ASP.NET runtime must not hold up the visible enhancements.
    if (!attachPostbacks()) {
      const t = setInterval(() => {
        if (attachPostbacks() || ++tries >= 40) clearInterval(t);
      }, 250);
    }
  }

  /* ===========================================================================
   * Styles (module CSS + prefixed overhaul)
   * ======================================================================== */
  var BOSEARCH_CSS =
      '.iqa-bo-search{margin:12px 0 16px;position:relative;font-size:13px;}'
    + '.iqa-bo-search__label{display:block;font-weight:600;color:#475569;margin:0 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.03em;}'
    + '.iqa-bo-search__box{position:relative;}'
    + '.iqa-bo-search__input{width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:13px;outline:none;transition:border-color .15s,box-shadow .15s;}'
    + '.iqa-bo-search__input:focus{border-color:#667eea;box-shadow:0 0 0 3px rgba(102,126,234,.15);}'
    + '.iqa-bo-search__box.is-loading .iqa-bo-search__input{padding-right:30px;}'
    + '.iqa-bo-search__spinner{position:absolute;top:50%;right:9px;width:14px;height:14px;margin-top:-7px;box-sizing:border-box;border:2px solid #cbd5e1;border-top-color:#667eea;border-radius:50%;display:none;animation:iqaBoSpin .6s linear infinite;}'
    + '.iqa-bo-search__box.is-loading .iqa-bo-search__spinner{display:block;}'
    + '@keyframes iqaBoSpin{to{transform:rotate(360deg);}}'
    + '.iqa-bo-search__list{list-style:none;margin:0;padding:4px;position:absolute;top:calc(100% + 2px);z-index:1000;left:0;right:0;background:#fff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.12);max-height:320px;overflow-y:auto;display:none;}'
    + '.iqa-bo-search__list.is-open{display:block;}'
    + '.iqa-bo-search__item{padding:6px 8px;border-radius:4px;cursor:pointer;display:flex;flex-direction:column;gap:1px;}'
    + '.iqa-bo-search__item.is-active,.iqa-bo-search__item:hover{background:#eef2ff;}'
    + '.iqa-bo-search__name{font-weight:600;color:#1e293b;}'
    + '.iqa-bo-search__desc{color:#64748b;font-size:11px;line-height:1.3;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;}'
    + '.iqa-bo-search__empty{padding:8px;color:#94a3b8;text-align:center;}';

  var QUICKADD_CSS =
      '.iqa-quickadd__media{margin-top:0;}'
    + '.iqa-quickadd__media + .iqa-quickadd__media{margin-top:10px;}'
    + '.iqa-quickadd__desc{color:#64748b;font-size:11px;line-height:1.35;margin-top:1px;}'
    + '.iqa-quickadd__note{color:#94a3b8;font-size:12px;padding:2px 0;}';

  var SQLTOOLS_CSS =
      '.textarea-wrap{position:relative;display:grid;grid-template-columns:minmax(0,1fr) 30px;gap:6px;align-items:start;}'
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap{display:grid!important;grid-template-columns:minmax(0,1fr) 30px!important;width:100%;}'
    /* The width group repeats what the shared .textarea-wrap rule below
       already says, at a specificity that beats the native
       `.SQLExpression td textarea{min-width:300px}`. Without it the field keeps
       that 300px and spills over its toolbar column and the Alias cell as soon
       as the grid is narrower than the expression. */
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap>textarea{grid-column:1;grid-row:1;width:100%;min-width:0;max-width:100%;}'
    + 'body.iqa-enhanced #SelectedProperty .textarea-wrap>.icon-bar{display:flex!important;flex-direction:column!important;grid-column:2;grid-row:1;gap:4px;margin:0!important;align-self:start;}'
    + '.iqa-copy-flash{background-color:rgba(0,126,168,.12)!important;background-color:color-mix(in srgb,var(--border-focus,#006f94) 14%,transparent)!important;animation:iqaCopyFlash .8s ease-out;}'
    + '@keyframes iqaCopyFlash{0%,25%{box-shadow:inset 0 0 0 9999px rgba(0,126,168,.24);box-shadow:inset 0 0 0 9999px color-mix(in srgb,var(--border-focus,#006f94) 26%,transparent);}100%{box-shadow:inset 0 0 0 9999px transparent;}}'
    + '@media(prefers-reduced-motion:reduce){.iqa-copy-flash{animation:none;box-shadow:inset 0 0 0 9999px rgba(0,126,168,.20);box-shadow:inset 0 0 0 9999px color-mix(in srgb,var(--border-focus,#006f94) 22%,transparent);}}'
    + '.textarea-wrap textarea{display:block;width:100%;min-width:0;box-sizing:border-box;}'
    + '.icon-bar{display:flex;flex-direction:column;gap:4px;margin:0;align-items:center;}'
    + '.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:4px;border-radius:5px;border:1px solid #cbd5e1;background:#fff;color:#475569;cursor:pointer;user-select:none;transition:background .12s,border-color .12s,color .12s;}'
    + '.icon-btn:hover{background:#eef2ff;border-color:#94a3b8;}'
    + '.icon-btn:focus{outline:2px solid #4f8fd9;outline-offset:1px;}'
    + '.icon-btn svg{width:18px;height:18px;display:block;}'
    + '.copy-status{transition:opacity .2s;opacity:0;}'
    + '.sqltext-copy-btn{display:inline-flex;align-items:center;cursor:pointer;margin-left:8px;vertical-align:middle;color:#475569;}'
    + '.sqltext-copy-btn:hover{color:#0b62c4;}'
    + '.iqa-path-copy{border:0;padding:0;background:transparent;font:inherit;}'
    + '.iqa-path-copy:focus-visible{outline:2px solid #0b62c4;outline-offset:3px;}'
    + '.sqltext-copy-btn svg{width:20px;height:20px;}';

  var DROPDOWN_CSS = `
    .iqa-field-picker{display:flex;position:relative;width:100%;min-width:0;box-sizing:border-box;border:1px solid #ccc;border-radius:4px;background:#fff;overflow:hidden;}
    .iqa-field-picker:focus-within{border-color:#25a0da;box-shadow:0 0 4px #25a0da66;}
    body.iqa-enhanced .iqa-field-picker > input[type="text"]{flex:1 1 0;width:0!important;min-width:0!important;max-width:none!important;border:0!important;box-shadow:none!important;border-radius:0;margin:0;padding:6px 10px;min-height:32px;font:inherit;background:transparent;}
    .iqa-field-picker > button{flex:0 0 32px;border:0;border-left:1px solid #ddd;border-radius:0;background:#f8f8f8;color:#333;padding:0;cursor:pointer;}
    .iqa-field-picker:focus-within > button{background:#25a0da;color:#fff;}
    .iqa-field-list{position:fixed;z-index:100000;overflow:auto;box-sizing:border-box;padding:3px 0;border:1px solid #ccc;background:white;color:#454b54;box-shadow:0 3px 9px #0003;font:inherit;}
    .iqa-field-list[hidden]{display:none;}
    .iqa-field-list > div{padding:6px 10px;overflow-wrap:anywhere;cursor:pointer;}
    .iqa-field-list > div:hover,.iqa-field-list > .is-active{background:#e8e8e8;}
    .iqa-field-list mark{background:#ddd;color:inherit;font-weight:700;}
    table.iqa-filter-condition-box select{width:100%;}
    .sysicon.sysicon-info{display:none!important;}
    table.Grid.iqa-filter-condition-box > tbody > tr.GridHeader > td:nth-child(4){width:10px!important;}
  `;

  var HIST_CSS =
      '.iqa-hist-list{list-style:none;margin:0;padding:4px;position:absolute;z-index:100000;background:#fff;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 6px 20px rgba(0,0,0,.14);max-height:260px;overflow-y:auto;display:none;font-size:13px;}'
    + '.iqa-hist-list.is-open{display:block;}'
    + '.iqa-hist-item{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:5px 8px;border-radius:4px;cursor:pointer;}'
    + '.iqa-hist-item.is-active,.iqa-hist-item:hover{background:#eef2ff;}'
    + '.iqa-hist-val{color:#1e293b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}'
    + '.iqa-hist-del{color:#94a3b8;font-weight:700;padding:0 4px;line-height:1;}'
    + '.iqa-hist-del:hover{color:#dc2626;}';

  /* Feature-5 overhaul — every selector prefixed with body.iqa-enhanced so the
     toggle flips it all at once. */
  var OVERHAUL_CSS = [
    'body.iqa-enhanced [id$="_DisplayPanel_Body"] input[type="checkbox"]{width:18px;height:18px;min-width:18px;vertical-align:middle;cursor:pointer;}body.iqa-enhanced [id$="_DisplayPanel_Body"] input[type="checkbox"]:disabled{cursor:default;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid{width:870px;max-width:100%;min-width:0!important;table-layout:auto;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(1){width:8%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(2){width:65%;white-space:normal;overflow-wrap:anywhere;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(3){width:23%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(4){width:4%;}',
    'body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:nth-child(3) > select,body.iqa-enhanced [id$="_SortPanel_Body"] .iqa-field-picker{width:100%!important;min-width:0;max-width:100%;box-sizing:border-box;}',
    '@media(max-width:600px){body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(2){width:55%;}body.iqa-enhanced [id$="_SortPanel_Body"] > table.Grid > tbody > tr > td:not([colspan]):nth-child(3){width:33%;}}',
    'body.iqa-enhanced table.Grid.no-border.align-middle{width:100%;}',
    'body.iqa-enhanced input[id*="_DesignShell1_ctl00_ctl00_ctl00_txtAlias"]{width:100%;}',
    'body.iqa-enhanced table.Grid.no-border.align-middle:not(#SelectedProperty) > tbody > tr.GridHeader > td:nth-child(4){min-width:350px !important;}',
    'body.iqa-enhanced table#SelectedProperty{margin-bottom:25px;}',
    /* Property carries the source and field names, or a whole SQL expression,
       so it takes the largest share. Length and Format are capped because the
       native input and the long date options otherwise collect the spare
       width and leave Property too narrow to read an expression in. */
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(2){width:26%;min-width:200px;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4), body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5){width:18% !important;min-width:150px !important;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4) > input, body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5) > input{width:100% !important;min-width:0;box-sizing:border-box;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(8){width:80px;}',
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(8) > input{width:100%;min-width:0;box-sizing:border-box;}',
    /* A select is at least as wide as its longest option, so the date formats
       would otherwise claim the widest column on the grid. max-width caps that
       contribution and lets the option text truncate instead. */
    'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(9) > select{max-width:170px;}',
    /* Below roughly a 1200px editor the fixed minimums are what pushes the grid
       past the viewport, so they give way before the Property column does. */
    '@media(max-width:1200px){'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(2){width:30%;min-width:220px;}'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(4),body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(5){width:auto !important;min-width:100px !important;}'
      + 'body.iqa-enhanced table#SelectedProperty > tbody > tr > td:nth-child(9) > select{max-width:130px;}'
      + '}',
    'body.iqa-enhanced textarea[id*=_DesignShell1_ctl00_ctl00_ctl00_SQLTextField]{width:80%;min-height:500px;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_DivAdvancedMode > div:nth-child(3) > div > div.PanelFieldValue{width:100%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(3) > div, body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(3) > div > textarea{width:80%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(2) > div.PanelFieldValue{width:80%;}',
    'body.iqa-enhanced #ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_SummaryPanel_Body > div:nth-child(2) > div > input{width:80%;}',
    'body.iqa-enhanced div#AvailablePanel{display:none;}',
    'body.iqa-enhanced div#CustomTitlePanel{display:none;}',
    'body.iqa-enhanced div#ctl00_TemplateBody_DesignShell1_ctl00_ctl00_ctl00_DisplayPanel_Body{display:flex;flex-direction:row;flex-wrap:wrap;}',
    'body.iqa-enhanced div#CustomPanel{width:990px;min-width:0;max-width:calc(100% - 8px);box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty,body.iqa-enhanced #CustomProperty > tbody,body.iqa-enhanced #CustomProperty > tbody > tr{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty > tbody > tr > td{display:block;width:100%!important;min-width:0!important;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty .SQLExpression textarea,body.iqa-enhanced #CustomProperty .SQLExpression input[type="text"]{width:100%!important;min-width:0;max-width:100%;box-sizing:border-box;}',
    'body.iqa-enhanced #CustomProperty .SQLExpression td textarea{min-height:350px;resize:vertical;}',
    'body.iqa-enhanced #CustomProperty > tbody > tr:first-child > td:empty{display:none;}',
    '@media(max-width:800px){body.iqa-enhanced div#CustomPanel{width:100%;max-width:100%;margin-left:0!important;}}',
    'body.iqa-enhanced #CustomProperty > tbody > tr:nth-child(1) > td:nth-child(2){display:none;}',
    'body.iqa-enhanced #CustomProperty tr.SQLExpression > td:nth-child(2)::before{content:"Alias";display:block;font-weight:700;margin:8px 0 2px;}'
  ].join('\n');

  // Start after CSS variables have been assigned, including when injected
  // into a document which has already finished loading.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
