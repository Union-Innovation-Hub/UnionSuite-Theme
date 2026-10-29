/* =============================================================================
 * BO Enhancements - combined script
 * -----------------------------------------------------------------------------
 * Sibling of IQA-Enhancements.js, for the iMIS Business Object designer page.
 * Loaded by the theme loader (Theme/UnionSuite/index.js, module id 'bo'),
 * which must be included in the designer iframe. Dependency-free.
 *
 * STATUS: Database tab in progress, tested by console paste in the designer
 *   iframe. Properties / Definition / Preview tabs not yet probed.
 *
 * ENHANCE MODE
 *   "Enhance: On/Off" pill + "?" help button placed before Publish (same look
 *   as the IQA editor header), state in localStorage['boEnhanceMode'] (default
 *   on). All modules are gated and restore the stock page on teardown.
 *
 *   GATED:
 *     * OverhaulCss    - body.bo-enhanced layout hook
 *     * ListSizer      - Database tab: Tables / Joins lists grow to fit;
 *                        Used + Available Columns fixed equal height with
 *                        search boxes; the two Joins column dropdowns become
 *                        searchable SearchSelects (native select kept, hidden)
 *     * SqlHighlight   - Filter Expression: T-SQL colouring (transparent
 *                        textarea over a highlighted mirror) + Table.Column
 *                        suggestions from the Used/Available Columns lists
 *   PARKED (code present, not enabled): PropertyFilter, CopyTools - they
 *   assume a grid; enable after probing the Properties tab.
 *   Designer = /AsiCommon/Controls/BOA/Design.aspx inside a RadWindow iframe,
 *   so the loader must run in that document. Lists are located by caption
 *   text and assumed to be native <select> elements (unverified).
 *
 * The designer is assumed to be an ASP.NET WebForms page with partial
 * postbacks; like the IQA shell, every module is idempotent and re-run on
 * PageRequestManager endRequest.
 *
 * Console helpers: BoEnh.probe(), BoEnh.refresh(), BoEnh.mode(true|false)
 * ========================================================================== */
(function () {
  'use strict';

  /* ---- page gate: the designer document (inside its RadWindow iframe) ----
     Keep in step with the 'bo' entry's `when` in the theme loader (index.js). */
  if (!/\/AsiCommon\/Controls\/BOA\/Design\.aspx$/i.test(location.pathname)) return;
  if (window.BoEnh?.destroy) window.BoEnh.destroy();     // re-paste/re-inject replaces the old copy

  /* ---- target selectors: TIGHTEN after probing -------------------------- */
  const TARGET = {
    grid: null,                  // e.g. 'table[id$="PropertiesGrid_ctl00"]'; null = auto-detect
    boName: null                 // e.g. '[id$="BusinessObjectName"]'; null = auto-detect
  };
  const MIN_ROWS = 5;            // auto-detect: a grid needs at least this many body rows

  /* ===========================================================================
   * State + helpers
   * ======================================================================== */
  const MODE_KEY = 'boEnhanceMode';
  const getMode = () => { try { return localStorage.getItem(MODE_KEY) !== 'off'; } catch (_) { return true; } };
  const setMode = (on) => { try { localStorage.setItem(MODE_KEY, on ? 'on' : 'off'); } catch (_) {} };
  const safe = (fn) => { try { fn(); } catch (e) { console.error('[BO-Enh]', e); } };

  const injectStyle = (id, css) => {
    if (document.getElementById(id)) return;
    const s = document.createElement('style'); s.id = id; s.textContent = css; document.head.appendChild(s);
  };
  const removeById = (id) => document.getElementById(id)?.remove();

  async function copyText(text) {
    try { if (navigator.clipboard && isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (_) {}
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (_) {}
    ta.remove(); return ok;
  }

  function flash(btn, ok) {
    const prev = btn.dataset.label || btn.textContent;
    btn.dataset.label = prev;
    btn.textContent = ok ? 'Copied' : 'Copy failed';
    clearTimeout(btn._t);
    btn._t = setTimeout(() => { btn.textContent = prev; }, 1200);
  }

  const text = (el) => (el?.textContent || '').replace(/\s+/g, ' ').trim();

  /* Largest table with enough body rows; skips our own and layout tables. */
  function findGrid() {
    if (TARGET.grid) return document.querySelector(TARGET.grid);
    let best = null, bestRows = MIN_ROWS - 1;
    document.querySelectorAll('table').forEach((t) => {
      if (t.closest('.bo-enh')) return;
      const rows = t.querySelectorAll(':scope > tbody > tr, :scope > tr').length;
      if (rows > bestRows && t.querySelector('td')) { best = t; bestRows = rows; }
    });
    return best;
  }
  const bodyRows = (grid) => Array.from(grid.querySelectorAll(':scope > tbody > tr, :scope > tr'))
    .filter((tr) => tr.querySelector('td') && !tr.querySelector('th'));

  function boName() {
    if (TARGET.boName) {
      const el = document.querySelector(TARGET.boName);
      const v = el && (el.value || text(el));
      if (v) return v;
    }
    const h = document.querySelector('h1, h2, .PageTitle, .page-title');
    return text(h) || document.title.replace(/\s*[-|].*$/, '').trim();
  }

  /* Property name = first non-empty cell text, or first input value in the row. */
  function propName(tr) {
    for (const td of tr.cells) {
      const inp = td.querySelector('input[type="text"]');
      const v = inp ? inp.value.trim() : text(td);
      if (v) return v;
    }
    return '';
  }

  /* ===========================================================================
   * Module: OverhaulCss
   * ======================================================================== */
  /* Base CSS for the shell's own UI (pill, bars, search boxes). Owned by the
   * shell, not a gated module - the pill must stay styled while mode is off. */
  const BASE_CSS = `
        /* Enhance switch + help. The theme's own classes (us-switch, TextButton
           us-icon-button / us-outline-button) supply the look, matching the IQA
           editor header; only layout and the help dialog are set here. The
           group's auto left margin keeps it beside Publish when the header
           spreads its children. */
        .bo-editor-actions { display: inline-flex; align-items: center; gap: var(--space-2, 8px);
          margin: 0 var(--space-2, 8px) 0 auto; }
        .bo-editor-actions.bo-enh-floating { position: fixed; top: 8px; right: 12px; z-index: 99999; margin: 0; }
        #boEnhanceToggle { margin: 0; }
        #boEnhanceToggle > span:not([class]) { white-space: nowrap; }
        #boEnhanceHelp { flex: 0 0 auto; font-size: var(--fs-md, 16px); font-weight: var(--fw-semi, 600); line-height: 1; }
        #boEnhanceHelpDialog { width: min(740px, 92vw); max-height: 88vh; padding: 0; box-sizing: border-box;
          border: 1px solid var(--border, #e2e5e9); border-radius: var(--radius, 8px); background: var(--bg-surface, #fff);
          color: var(--text-base, #545962);
          font: var(--fw-normal, 400) var(--fs-base, 14px)/var(--lh-loose, 1.65) var(--font-body, "Open Sans", "Helvetica Neue", Arial, sans-serif);
          box-shadow: var(--shadow-lg, 0 8px 20px rgba(0, 27, 35, .16)); text-align: left; }
        #boEnhanceHelpDialog[open] { display: flex; flex-direction: column; }
        #boEnhanceHelpDialog::backdrop { background: rgb(0 27 35 / .4); }
        #boEnhanceHelpDialog header { display: flex; align-items: center; justify-content: space-between;
          gap: var(--space-4, 16px); flex-shrink: 0; padding: var(--space-4, 16px) var(--space-5, 20px);
          border-bottom: 1px solid var(--border, #e2e5e9); }
        #boEnhanceHelpDialog h2 { margin: 0; color: var(--text-strong, #1c2024);
          font: var(--fw-semi, 600) var(--fs-xl, 22px)/var(--lh-tight, 1.25) var(--font-display, "Red Hat Display", "Open Sans", Helvetica, Arial, sans-serif); }
        #boEnhanceHelpDialog .bo-help-content { overflow: auto; min-height: 0; padding: var(--space-2, 8px) var(--space-6, 24px) var(--space-6, 24px); }
        #boEnhanceHelpDialog h3 { margin: var(--space-5, 20px) 0 var(--space-2, 8px); color: var(--text-strong, #1c2024); font-size: var(--fs-md, 16px); }
        #boEnhanceHelpDialog ul, #boEnhanceHelpDialog ol { margin: 0; padding-left: 22px; }
        #boEnhanceHelpDialog li { margin: var(--space-1, 4px) 0; }
        #boEnhanceHelpDialog .bo-help-note { margin: var(--space-5, 20px) 0 0; padding: var(--space-3, 12px);
          border-radius: var(--radius-sm, 4px); background: var(--info-bg, #e4f0f4); }

        /* SearchSelect (Joins column dropdowns) */
        .bo-ss { display: inline-block; vertical-align: middle; max-width: 100%; }
        .bo-ss-btn { display: flex; align-items: center; width: 100%; box-sizing: border-box; margin: 0; padding: 4px 30px 4px 10px;
          border: 1px solid #aab; border-radius: 4px; text-align: left; cursor: pointer; font: inherit; color: #1f2933;
          background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5' fill='none' stroke='%23526173' stroke-width='1.6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center; }
        .bo-ss-btn:focus-visible { outline: 2px solid #0b62c4; outline-offset: 1px; }
        .bo-ss-btn[aria-expanded="true"] { border-color: #0b62c4; }
        .bo-ss-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .bo-ss-btn.bo-ss-empty .bo-ss-text { color: #64748b; }
        .bo-ss-panel { position: fixed; z-index: 100000; display: flex; flex-direction: column; box-sizing: border-box;
          max-width: min(640px, calc(100vw - 16px)); background: #fff; border: 1px solid #94a3b8; border-radius: 4px;
          box-shadow: 0 4px 12px rgba(0,0,0,.13); font: 13px/1.4 system-ui, sans-serif; color: #172b4d; }
        .bo-ss-panel[hidden] { display: none; }
        .bo-ss-search { flex: 0 0 auto; margin: 6px; padding: 5px 8px; border: 1px solid #aab; border-radius: 4px; font: inherit; }
        .bo-ss-list { overflow: auto; min-height: 0; padding: 0 3px 3px; }
        .bo-ss-list > [role=option] { padding: 5px 8px; border-radius: 3px; cursor: pointer; overflow-wrap: anywhere; }
        .bo-ss-list > [role=option]:hover { background: #f1f5f9; }
        .bo-ss-list > [aria-selected=true] { background: #dcedfc; }
        .bo-ss-list > [hidden] { display: none; }
        .bo-ss-tbl { color: #64748b; }
        .bo-ss-col { font-weight: 600; }
        .bo-ss-none { color: #64748b; font-style: italic; }
        .bo-enh-bar { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 8px 0; font: 13px system-ui, sans-serif; }
        .bo-enh-bar input { flex: 1 1 220px; min-width: 160px; padding: 5px 8px; border: 1px solid #aab; border-radius: 4px; }
        .bo-enh-bar button, .bo-enh-copy { padding: 4px 9px; border: 1px solid #aab; border-radius: 4px; background: #f6f8fa; cursor: pointer; font: inherit; }
        .bo-enh-bar button:hover, .bo-enh-copy:hover { background: #e8eef5; }
        .bo-enh-count { color: #567; }
        .bo-enh-copy { margin-left: 6px; padding: 0 6px; font-size: 11px; opacity: .55; }
        tr:hover .bo-enh-copy { opacity: 1; }
        tr.bo-enh-hidden { display: none !important; }
        .bo-enh-sfilter { display: block; box-sizing: border-box; width: 100%; margin: 0 0 4px; padding: 4px 8px;
          border: 1px solid #aab; border-radius: 4px; font: 13px system-ui, sans-serif; }
  `;

  const Overhaul = {
    mount() {
      document.body.classList.add('bo-enhanced');
      injectStyle('bo-enh-css', `
        body.bo-enhanced { max-width: none; }
        body.bo-enhanced .bo-grid-enh { width: 100% !important; border-collapse: collapse; }
        body.bo-enhanced .bo-grid-enh td, body.bo-enhanced .bo-grid-enh th { padding: 4px 8px; vertical-align: middle; }
        body.bo-enhanced .bo-grid-enh tbody tr:hover > td { background: rgba(0, 120, 212, .07); }
      `);
    },
    unmount() {
      document.body.classList.remove('bo-enhanced');
      removeById('bo-enh-css');
    }
  };

  /* ===========================================================================
   * Module: PropertyFilter
   * ======================================================================== */
  const Filter = {
    q: '',
    mount() {
      const grid = findGrid(); if (!grid) return;
      let bar = document.getElementById('bo-enh-filter');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bo-enh-filter'; bar.className = 'bo-enh bo-enh-bar';
        bar.innerHTML = '<input type="search" placeholder="Filter properties..." aria-label="Filter properties">' +
                        '<span class="bo-enh-count" aria-live="polite"></span>';
        const input = bar.querySelector('input');
        input.value = Filter.q;
        input.addEventListener('input', () => { Filter.q = input.value; Filter.apply(); });
        input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { input.value = ''; Filter.q = ''; Filter.apply(); } });
      }
      if (bar.nextElementSibling !== grid) grid.parentNode.insertBefore(bar, grid);
      Filter.apply();
    },
    apply() {
      const grid = findGrid(); if (!grid) return;
      const q = Filter.q.trim().toLowerCase();
      const rows = bodyRows(grid);
      let shown = 0;
      rows.forEach((tr) => {
        const hay = (text(tr) + ' ' + Array.from(tr.querySelectorAll('input[type="text"]')).map((i) => i.value).join(' ')).toLowerCase();
        const hit = !q || hay.includes(q);
        tr.classList.toggle('bo-enh-hidden', !hit);
        if (hit) shown++;
      });
      const c = document.querySelector('#bo-enh-filter .bo-enh-count');
      if (c) c.textContent = q ? shown + ' of ' + rows.length : rows.length + ' properties';
    },
    unmount() {
      removeById('bo-enh-filter');
      const g = findGrid();
      if (g) bodyRows(g).forEach((tr) => tr.classList.remove('bo-enh-hidden'));
    }
  };

  /* ===========================================================================
   * Module: CopyTools
   * ======================================================================== */
  const Copy = {
    mount() {
      const grid = findGrid(); if (!grid) return;
      let bar = document.getElementById('bo-enh-copybar');
      if (!bar) {
        bar = document.createElement('div');
        bar.id = 'bo-enh-copybar'; bar.className = 'bo-enh bo-enh-bar';
        bar.innerHTML = '<button type="button" data-a="bo">Copy BO name</button>' +
                        '<button type="button" data-a="props">Copy property names</button>' +
                        '<button type="button" data-a="qual">Copy BO.Property</button>';
        bar.addEventListener('click', async (e) => {
          const b = e.target.closest('button[data-a]'); if (!b) return;
          const g = findGrid(); if (!g) return;
          const bo = boName();
          const rows = bodyRows(g).filter((tr) => !tr.classList.contains('bo-enh-hidden'));
          const names = rows.map(propName).filter(Boolean);
          const out = b.dataset.a === 'bo' ? bo
                    : b.dataset.a === 'props' ? names.join('\n')
                    : names.map((n) => bo + '.' + n).join('\n');
          flash(b, await copyText(out));
        });
      }
      const filter = document.getElementById('bo-enh-filter');
      const anchor = filter || grid;
      if (bar.nextElementSibling !== anchor) anchor.parentNode.insertBefore(bar, anchor);

      bodyRows(grid).forEach((tr) => {
        if (tr.querySelector('.bo-enh-copy')) return;
        const cell = Array.from(tr.cells).find((td) => text(td) || td.querySelector('input[type="text"]'));
        if (!cell) return;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'bo-enh bo-enh-copy'; b.textContent = 'Copy'; b.title = 'Copy property name';
        b.addEventListener('click', async (e) => { e.preventDefault(); e.stopPropagation(); flash(b, await copyText(propName(tr))); });
        cell.appendChild(b);
      });
    },
    unmount() {
      removeById('bo-enh-copybar');
      document.querySelectorAll('.bo-enh-copy').forEach((b) => b.remove());
    }
  };

  /* ===========================================================================
   * Module: ListSizer - Database tab list boxes are ~1.5 rows tall by default.
   * Each list is found by its caption (the first <select> after the label) and
   * grown to fit its options, clamped to [min, max] px. Heights are applied
   * inline so teardown can restore the originals.
   * ======================================================================== */
  const LISTS = [
    { label: 'Tables',            min: 100, max: 260 },
    { label: 'Used Columns',      min: 238, max: 238, search: true },   // fixed, matching pair
    { label: 'Available Columns', min: 238, max: 238, search: true },
    { label: 'Joins',             min: 100, max: 260 }
  ];
  const ROW_PX = 20, PAD_PX = 12;

  function labelEl(name) {
    const want = name.toLowerCase();
    return Array.from(document.querySelectorAll('label, span, td, div, legend, h3, h4'))
      .find((el) => !el.children.length && text(el).replace(/:$/, '').toLowerCase() === want);
  }
  const selectsAfter = (lbl) => Array.from(document.querySelectorAll('select')).filter((s) =>
    (lbl.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING) && !lbl.contains(s));

  /* ---- shared option filter (hides non-matching <option>s) --------------- */
  const queries = {};                       // key -> last query, survives postbacks
  function applyFilter(sel, q) {
    const needle = q.trim().toLowerCase();
    Array.from(sel.options).forEach((o) => {
      const keep = !needle || o.value === '' || o.text.toLowerCase().includes(needle);
      o.hidden = !keep;
    });
  }
  const isListbox = (s) => s.multiple || s.size > 1;

  function attachFilter(sel, key, placeholder) {
    if (sel.dataset.boFilter === key && sel.previousElementSibling?.classList.contains('bo-enh-sfilter')) {
      applyFilter(sel, queries[key] || ''); return;
    }
    const inp = document.createElement('input');
    inp.type = 'search'; inp.className = 'bo-enh bo-enh-sfilter';
    inp.placeholder = placeholder; inp.setAttribute('aria-label', placeholder);
    inp.value = queries[key] || '';
    inp.addEventListener('input', () => { queries[key] = inp.value; applyFilter(sel, inp.value); });
    inp.addEventListener('keydown', (e) => { if (e.key === 'Escape') { inp.value = ''; queries[key] = ''; applyFilter(sel, ''); } });
    sel.parentNode.insertBefore(inp, sel);
    sel.dataset.boFilter = key;
    applyFilter(sel, inp.value);
  }

  /* ---- SearchSelect: searchable replacement for a native dropdown ---------
   * Same idea as the IQA FilterSortDropdowns: the native <select> is hidden
   * but stays in the form (its value posts back as normal); a lookalike button
   * shows the current choice and opens a panel with a search box + options.
   * The panel is rebuilt from the native options on every open, so it is
   * always current. Keyboard: Enter/Space/Down/typing opens; in the panel
   * Up/Down move, Enter picks, Esc or Tab closes. Space-separated words all
   * have to match ("comm key" finds CommunicationLog.ContactKey). */
  const ssList = [];                                        // { sel, wrap, panel, abort, refresh }
  function optionNode(o) {
    const n = document.createElement('div');
    n.setAttribute('role', 'option'); n.dataset.value = o.value;
    const t = o.text.trim(), dot = t.lastIndexOf('.');
    if (!t) { n.textContent = '(none)'; n.classList.add('bo-ss-none'); return n; }
    if (dot > 0) {                                          // Table.Column -> muted table, strong column
      const a = document.createElement('span'); a.className = 'bo-ss-tbl'; a.textContent = t.slice(0, dot + 1);
      const b = document.createElement('span'); b.className = 'bo-ss-col'; b.textContent = t.slice(dot + 1);
      n.append(a, b);
    } else n.textContent = t;
    return n;
  }
  function attachSearchSelect(sel, label) {
    const prev = ssList.find((x) => x.sel === sel);
    if (prev && prev.wrap.isConnected) { prev.refresh(); return; }
    const w = sel.offsetWidth, h = sel.offsetHeight;
    const abort = new AbortController(), signal = abort.signal;
    const wrap = document.createElement('span');
    wrap.className = 'bo-enh bo-ss';
    if (w) wrap.style.width = w + 'px';
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bo-ss-btn';
    if (h) btn.style.height = h + 'px';
    btn.setAttribute('aria-haspopup', 'listbox'); btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', label);
    const btnText = document.createElement('span'); btnText.className = 'bo-ss-text';
    btn.appendChild(btnText);
    wrap.appendChild(btn);
    const panel = document.createElement('div');
    panel.className = 'bo-enh bo-ss-panel'; panel.hidden = true;
    const search = document.createElement('input');
    search.type = 'search'; search.className = 'bo-ss-search'; search.autocomplete = 'off';
    search.placeholder = 'Type to filter...'; search.setAttribute('aria-label', 'Filter ' + label.toLowerCase());
    const list = document.createElement('div');
    list.className = 'bo-ss-list'; list.setAttribute('role', 'listbox');
    list.id = 'boSs-' + Math.random().toString(36).slice(2);
    search.setAttribute('aria-controls', list.id);
    panel.append(search, list);
    document.body.appendChild(panel);

    sel.dataset.boSsOrig = sel.style.cssText;
    sel.style.setProperty('display', 'none', 'important');
    sel.parentNode.insertBefore(wrap, sel);

    let active = -1;
    const visible = () => Array.from(list.children).filter((n) => !n.hidden);
    const refresh = () => {
      const o = sel.options[sel.selectedIndex];
      const t = o ? o.text.trim() : '';
      btnText.textContent = t || 'Select column...';
      btn.classList.toggle('bo-ss-empty', !t);
      btn.title = t;
    };
    const setActive = (i) => {
      const vis = visible();
      vis.forEach((n) => n.setAttribute('aria-selected', 'false'));
      if (!vis.length) { active = -1; search.removeAttribute('aria-activedescendant'); return; }
      active = (i + vis.length) % vis.length;
      const n = vis[active];
      n.setAttribute('aria-selected', 'true');
      if (!n.id) n.id = list.id + '-' + Array.prototype.indexOf.call(list.children, n);
      search.setAttribute('aria-activedescendant', n.id);
      n.scrollIntoView({ block: 'nearest' });
    };
    const filter = () => {
      const terms = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      Array.from(list.children).forEach((n) => {
        const t = n.textContent.toLowerCase();
        n.hidden = !terms.every((q) => t.includes(q));
      });
      setActive(0);
    };
    const place = () => {
      const r = btn.getBoundingClientRect();
      panel.style.minWidth = r.width + 'px';
      panel.style.left = Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 280) - 8)) + 'px';
      const below = window.innerHeight - r.bottom - 8, above = r.top - 8;
      const flip = below < 200 && above > below;          // not enough room below: open upwards
      panel.style.maxHeight = Math.max(160, Math.min(360, flip ? above : below)) + 'px';
      panel.style.top = flip ? '' : (r.bottom + 2) + 'px';
      panel.style.bottom = flip ? (window.innerHeight - r.top + 2) + 'px' : '';
    };
    const close = (refocus) => {
      if (panel.hidden) return;
      panel.hidden = true; btn.setAttribute('aria-expanded', 'false');
      if (refocus) btn.focus();
    };
    const open = (seed) => {
      list.replaceChildren(...Array.from(sel.options).map(optionNode));
      search.value = seed || '';
      panel.hidden = false; btn.setAttribute('aria-expanded', 'true');
      place(); filter();
      if (!seed) {                                          // start on the current choice
        const cur = visible().findIndex((n) => n.dataset.value === sel.value);
        if (cur > -1) setActive(cur);
      }
      search.focus();
    };
    const choose = (n) => {
      if (!n) return;
      const changed = sel.value !== n.dataset.value;
      sel.value = n.dataset.value;
      refresh(); close(true);
      if (changed) sel.dispatchEvent(new Event('change', { bubbles: true }));
    };

    btn.addEventListener('click', () => (panel.hidden ? open() : close(true)), { signal });
    btn.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      else if (e.key.length === 1) { e.preventDefault(); open(e.key); }    // type-to-search from the button
    }, { signal });
    search.addEventListener('input', filter, { signal });
    search.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setActive(active + (e.key === 'ArrowDown' ? 1 : -1)); }
      else if (e.key === 'Enter') { e.preventDefault(); choose(visible()[active]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(true); }  // don't close the RadWindow
      else if (e.key === 'Tab') close(false);
    }, { signal });
    list.addEventListener('pointerdown', (e) => { e.preventDefault(); choose(e.target.closest('[role=option]')); }, { signal });
    document.addEventListener('pointerdown', (e) => {
      if (!panel.contains(e.target) && !wrap.contains(e.target)) close(false);
    }, { signal, capture: true });
    window.addEventListener('resize', () => close(false), { signal });
    window.addEventListener('scroll', (e) => { if (!panel.contains(e.target)) close(false); }, { signal, capture: true });
    sel.addEventListener('change', refresh, { signal });   // keep in step if something else changes it

    refresh();
    ssList.push({ sel, wrap, panel, abort, refresh });
  }
  function detachSearchSelect(x) {
    x.abort.abort(); x.panel.remove(); x.wrap.remove();
    if ('boSsOrig' in x.sel.dataset) { x.sel.style.cssText = x.sel.dataset.boSsOrig; delete x.sel.dataset.boSsOrig; }
  }

  const Lists = {
    mount() {
      for (let i = ssList.length - 1; i >= 0; i--)          // drop instances whose select a postback replaced
        if (!ssList[i].sel.isConnected) { detachSearchSelect(ssList[i]); ssList.splice(i, 1); }
      LISTS.forEach((cfg) => {
        const lbl = labelEl(cfg.label); if (!lbl) return;
        const sel = selectsAfter(lbl).find(isListbox); if (!sel) return;   // never a dropdown
        if (!('boOrig' in sel.dataset)) sel.dataset.boOrig = sel.style.cssText;
        const h = Math.min(cfg.max, Math.max(cfg.min, sel.options.length * ROW_PX + PAD_PX));
        sel.style.setProperty('height', h + 'px', 'important');
        sel.style.setProperty('box-sizing', 'border-box');
        sel.classList.add('bo-enh-list');
        if (cfg.search) attachFilter(sel, cfg.label, 'Search ' + cfg.label.toLowerCase() + '...');
      });
      /* Joins: the first two dropdowns after the caption are left / right column;
       * the third is the join type (left native). */
      const jl = labelEl('Joins');
      if (jl) selectsAfter(jl).filter((s) => !isListbox(s)).slice(0, 2)
        .forEach((s, i) => attachSearchSelect(s, i ? 'Right join column' : 'Left join column'));
    },
    unmount() {
      document.querySelectorAll('select.bo-enh-list').forEach((s) => {
        s.style.cssText = s.dataset.boOrig || '';
        delete s.dataset.boOrig; s.classList.remove('bo-enh-list');
      });
      document.querySelectorAll('select[data-bo-filter]').forEach((s) => {
        Array.from(s.options).forEach((o) => { o.hidden = false; });
        delete s.dataset.boFilter;
      });
      document.querySelectorAll('.bo-enh-sfilter').forEach((i) => i.remove());
      ssList.splice(0).forEach(detachSearchSelect);
    }
  };

  /* ===========================================================================
   * Module: SqlHighlight - Filter Expression is a T-SQL WHERE fragment.
   * The real <textarea> stays the editable field (id, value, postback intact);
   * it is made text-transparent and a highlighted <pre> mirror sits behind it.
   * ======================================================================== */
  const SQL_FIELDS = ['Filter Expression'];
  const SQL_KEYWORDS = ('AND OR NOT IN IS NULL LIKE BETWEEN EXISTS ALL ANY SOME CASE WHEN THEN ELSE END ' +
    'SELECT FROM WHERE AS ON JOIN INNER LEFT RIGHT OUTER FULL CROSS TOP DISTINCT UNION ORDER GROUP BY HAVING ' +
    'ASC DESC TRUE FALSE ESCAPE COLLATE').split(' ');
  const SQL_RE = new RegExp([
    '(--[^\\n]*|/\\*[\\s\\S]*?(?:\\*/|$))',                 // 1 comment
    "('(?:[^']|'')*(?:'|$))",                               // 2 string
    '(\\[[^\\]\\n]*\\]?)',                                  // 3 [bracketed identifier]
    '(\\b\\d+(?:\\.\\d+)?\\b)',                             // 4 number
    '(\\b(?:' + SQL_KEYWORDS.join('|') + ')\\b)',           // 5 keyword
    '(\\b[A-Za-z_]\\w*(?=\\s*\\())',                        // 6 function call
    '(\\b[A-Za-z_]\\w*(?=\\.))',                            // 7 table/prefix before a dot
    '(<>|!=|<=|>=|[=<>+\\-*/%])'                            // 8 operator
  ].join('|'), 'gi');
  const SQL_CLASS = [null, 'c', 's', 'b', 'n', 'k', 'f', 't', 'o'];
  const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function sqlToHtml(src) {
    let out = '', last = 0, m;
    SQL_RE.lastIndex = 0;
    while ((m = SQL_RE.exec(src))) {
      if (m[0] === '') { SQL_RE.lastIndex++; continue; }
      out += escHtml(src.slice(last, m.index));
      let g = 1; while (g < m.length && m[g] === undefined) g++;
      out += '<span class="bo-sql-' + SQL_CLASS[g] + '">' + escHtml(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    return out + escHtml(src.slice(last)) + '\n';           // trailing \n keeps last empty line height
  }

  /* ---- column suggestions: catalogue from the Used + Available lists ------ */
  function columnCatalog() {
    const seen = new Map();                                 // lower(full) -> { table, column, full, used }
    [['Used Columns', true], ['Available Columns', false]].forEach(([label, used]) => {
      const lbl = labelEl(label); if (!lbl) return;
      const sel = selectsAfter(lbl).find(isListbox); if (!sel) return;
      Array.from(sel.options).forEach((o) => {
        const full = o.text.trim(), dot = full.lastIndexOf('.');
        if (dot < 1 || seen.has(full.toLowerCase())) return;
        seen.set(full.toLowerCase(), { table: full.slice(0, dot), column: full.slice(dot + 1), full, used });
      });
    });
    return Array.from(seen.values());
  }

  /* Pure: text before the caret + catalogue -> { start, options } or null.
   *   "Tab"         -> tables starting "Tab" (insert "Table.") and columns starting "Tab"
   *   "Table.Cr"    -> that table's columns containing "Cr" (prefix matches first)
   *   forced (Ctrl+Space) with nothing typed -> every table
   * Nothing inside a string literal or a -- comment; bare keywords don't trigger. */
  const MAX_SUGGEST = 40;
  function completeColumns(before, cols, forced) {
    if (((before.match(/'/g) || []).length % 2) || /--[^\n]*$/.test(before)) return null;
    const token = before.match(/[\w.]*$/)[0];
    const start = before.length - token.length;
    const byName = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });
    let options = [];
    const dot = token.lastIndexOf('.');
    if (dot > 0) {
      const tbl = token.slice(0, dot).toLowerCase(), frag = token.slice(dot + 1).toLowerCase();
      options = cols.filter((c) => c.table.toLowerCase() === tbl && c.column.toLowerCase().includes(frag))
        .sort((a, b) => (b.column.toLowerCase().startsWith(frag) - a.column.toLowerCase().startsWith(frag))
          || (b.used - a.used) || byName(a.column, b.column))
        .map((c) => ({ label: c.column, detail: c.table + (c.used ? ' - used column' : ''), insert: c.full }));
    } else {
      const frag = token.toLowerCase();
      if (!forced && (frag.length < 2 || SQL_KEYWORDS.includes(token.toUpperCase()))) return null;
      const tables = new Map();
      cols.forEach((c) => { if (c.table.toLowerCase().startsWith(frag)) tables.set(c.table, (tables.get(c.table) || 0) + 1); });
      options = Array.from(tables).sort((a, b) => byName(a[0], b[0]))
        .map(([t, n]) => ({ label: t + '.', detail: 'table - ' + n + ' column' + (n === 1 ? '' : 's'), insert: t + '.' }));
      if (frag) options = options.concat(cols.filter((c) => c.column.toLowerCase().startsWith(frag))
        .sort((a, b) => (b.used - a.used) || byName(a.full, b.full))
        .map((c) => ({ label: c.full, detail: c.used ? 'used column' : 'available column', insert: c.full })));
    }
    options = options.filter((o) => o.insert.toLowerCase() !== token.toLowerCase()).slice(0, MAX_SUGGEST);
    return options.length ? { start, options } : null;
  }

  /* Popup wiring for one textarea: caret-anchored listbox, Up/Down to move,
   * Tab/Enter to insert, Esc to dismiss, Ctrl+Space to open on demand. */
  function attachSuggest(ta, st) {
    const signal = st.abort.signal;
    const menu = document.createElement('div');
    menu.className = 'bo-enh bo-sql-menu'; menu.hidden = true;
    menu.id = 'boSqlMenu-' + Math.random().toString(36).slice(2);
    menu.setAttribute('role', 'listbox'); menu.setAttribute('aria-label', 'Column suggestions');
    document.body.appendChild(menu);
    const hint = document.createElement('small');
    hint.className = 'bo-enh bo-sql-hint';
    hint.textContent = 'Type a table or column name for suggestions, then a dot for its columns. ' +
      'Up/Down then Tab or Enter to insert; Esc to dismiss; Ctrl+Space to open.';
    st.wrap.after(hint);
    st.menu = menu; st.hint = hint;
    st.attrs = Object.fromEntries(['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls', 'aria-activedescendant', 'spellcheck']
      .map((n) => [n, ta.getAttribute(n)]));
    ta.setAttribute('role', 'combobox'); ta.setAttribute('aria-autocomplete', 'list');
    ta.setAttribute('aria-controls', menu.id); ta.setAttribute('aria-expanded', 'false'); ta.spellcheck = false;

    let sugg = null, active = 0;
    const close = () => {
      menu.hidden = true; sugg = null;
      ta.setAttribute('aria-expanded', 'false'); ta.removeAttribute('aria-activedescendant');
    };
    const highlight = () => {
      Array.from(menu.children).forEach((n, i) => n.setAttribute('aria-selected', String(i === active)));
      const n = menu.children[active]; if (!n) return;
      ta.setAttribute('aria-activedescendant', n.id);
      if (n.offsetTop < menu.scrollTop) menu.scrollTop = n.offsetTop;
      else if (n.offsetTop + n.offsetHeight > menu.scrollTop + menu.clientHeight) menu.scrollTop = n.offsetTop + n.offsetHeight - menu.clientHeight;
    };
    const position = () => {                                // mirror the text up to the caret to find its pixel position
      const cs = getComputedStyle(ta), mirror = document.createElement('div'), caret = document.createElement('span');
      Object.assign(mirror.style, { position: 'fixed', visibility: 'hidden', top: '0', left: '0', width: ta.clientWidth + 'px',
        boxSizing: 'border-box', font: cs.font, padding: cs.padding, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: '4' });
      mirror.textContent = ta.value.slice(0, ta.selectionStart); caret.textContent = '\u200b';
      mirror.appendChild(caret); document.body.appendChild(mirror);
      const o = mirror.getBoundingClientRect(), p = caret.getBoundingClientRect(), box = ta.getBoundingClientRect();
      mirror.remove();
      const left = box.left + (p.left - o.left) - ta.scrollLeft;
      const top = box.top + (p.top - o.top) - ta.scrollTop + (parseFloat(cs.lineHeight) || 20) + 2;
      menu.style.left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
      menu.style.top = (top + menu.offsetHeight > window.innerHeight - 8
        ? Math.max(8, box.top + (p.top - o.top) - ta.scrollTop - menu.offsetHeight - 2)   // flip above the caret
        : top) + 'px';
    };
    const accept = () => {
      const opt = sugg?.options[active]; if (!opt) return;
      const start = sugg.start, end = ta.selectionEnd;
      const suffix = ta.value.slice(end).match(/^\w*/)[0];   // replace the rest of the word under the caret
      close(); ta.focus();
      ta.setRangeText(opt.insert, start, end + suffix.length, 'end');
      ta.dispatchEvent(new Event('input', { bubbles: true }));   // repaints; a "Table." insert reopens on its columns
    };
    const suggest = (forced) => {
      if (ta.selectionStart !== ta.selectionEnd) return close();
      sugg = completeColumns(ta.value.slice(0, ta.selectionStart), columnCatalog(), forced);
      if (!sugg) return close();
      active = 0; menu.replaceChildren();
      sugg.options.forEach((opt, i) => {
        const n = document.createElement('div');
        n.setAttribute('role', 'option'); n.id = menu.id + '-' + i; n.textContent = opt.label;
        const d = document.createElement('small'); d.textContent = opt.detail; n.appendChild(d);
        n.addEventListener('pointerdown', (e) => { e.preventDefault(); active = i; accept(); });
        menu.appendChild(n);
      });
      menu.hidden = false; ta.setAttribute('aria-expanded', 'true');
      highlight(); position();
    };

    ta.addEventListener('input', (e) => { if (e.isComposing) close(); else suggest(false); }, { signal });
    ta.addEventListener('keydown', (e) => {
      if (e.isComposing) return;
      if (e.ctrlKey && (e.key === ' ' || e.code === 'Space')) { e.preventDefault(); suggest(true); return; }
      if (menu.hidden || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }   // don't let Esc close the RadWindow
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        active = (active + (e.key === 'ArrowDown' ? 1 : -1) + sugg.options.length) % sugg.options.length;
        highlight();
      }
      else if (!e.shiftKey && (e.key === 'Tab' || e.key === 'Enter')) { e.preventDefault(); accept(); }
      else if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) close();
    }, { signal });
    ta.addEventListener('blur', close, { signal });
    ta.addEventListener('click', close, { signal });
    ta.addEventListener('scroll', close, { signal });
    window.addEventListener('resize', close, { signal });
    window.addEventListener('scroll', close, { signal, capture: true });
  }

  const sqlState = new WeakMap();                           // textarea -> { wrap, pre, ro, abort, menu, hint, attrs }
  function textareaAfter(lbl) {
    return Array.from(document.querySelectorAll('textarea')).find((t) =>
      (lbl.compareDocumentPosition(t) & Node.DOCUMENT_POSITION_FOLLOWING) && !lbl.contains(t));
  }
  function sqlSync(ta, st) {
    const cs = getComputedStyle(ta), p = st.pre.style;
    const bl = parseFloat(cs.borderLeftWidth) || 0, br = parseFloat(cs.borderRightWidth) || 0;
    p.left = ta.offsetLeft + 'px'; p.top = ta.offsetTop + 'px';
    p.width = (ta.clientWidth + bl + br) + 'px';            // exclude textarea's scrollbar so wrapping matches
    p.height = ta.offsetHeight + 'px';
    p.padding = cs.padding; p.borderStyle = 'solid'; p.borderColor = 'transparent';
    p.borderWidth = cs.borderTopWidth + ' ' + cs.borderRightWidth + ' ' + cs.borderBottomWidth + ' ' + cs.borderLeftWidth;
    p.borderRadius = cs.borderRadius;
    st.pre.innerHTML = sqlToHtml(ta.value);
    st.pre.scrollTop = ta.scrollTop; st.pre.scrollLeft = ta.scrollLeft;
  }
  function sqlAttach(ta) {
    if (sqlState.has(ta)) { sqlSync(ta, sqlState.get(ta)); return; }
    injectStyle('bo-enh-sql-css', `
      .bo-sql-wrap { position: relative; }
      .bo-sql-pre { position: absolute; margin: 0; overflow: hidden; pointer-events: none; box-sizing: border-box;
        white-space: pre-wrap; overflow-wrap: break-word; word-break: normal; color: #1f2933; }
      textarea.bo-sql-ta { position: relative; background: transparent !important; color: transparent !important;
        caret-color: #1f2933; -webkit-text-fill-color: transparent;
        font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace !important;
        tab-size: 4; white-space: pre-wrap; overflow-wrap: break-word; word-break: normal; }
      .bo-sql-pre { font: 13px/1.5 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace; tab-size: 4; }
      .bo-sql-k { color: #0b57d0; font-weight: 600; } .bo-sql-s { color: #a31515; } .bo-sql-n { color: #098658; }
      .bo-sql-c { color: #6a737d; font-style: italic; } .bo-sql-f { color: #795e26; } .bo-sql-t { color: #267f99; }
      .bo-sql-o { color: #5b6470; } .bo-sql-b { color: #7a3e9d; }
      .bo-sql-menu { position: fixed; z-index: 100000; max-height: 240px; overflow: auto; min-width: 260px; max-width: min(520px, calc(100vw - 16px));
        background: #fff; border: 1px solid #94a3b8; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,.13); padding: 3px;
        color: #172b4d; font: 13px/1.4 ui-monospace, Consolas, monospace; }
      .bo-sql-menu[hidden] { display: none; }
      .bo-sql-menu > [role=option] { padding: 5px 8px; border-radius: 3px; cursor: pointer; overflow-wrap: anywhere; }
      .bo-sql-menu > [aria-selected=true] { background: #dcedfc; }
      .bo-sql-menu small { display: block; color: #64748b; font: 12px/1.4 system-ui, sans-serif; }
      .bo-sql-hint { display: block; margin: 4px 0 6px; color: #64748b; font: 12px system-ui, sans-serif; }
    `);
    const bg = getComputedStyle(ta).backgroundColor;
    const wrap = document.createElement('div');
    wrap.className = 'bo-enh bo-sql-wrap';
    wrap.style.background = (bg && bg !== 'rgba(0, 0, 0, 0)') ? bg : '#fff';
    wrap.style.borderRadius = getComputedStyle(ta).borderRadius;
    const pre = document.createElement('pre');
    pre.className = 'bo-sql-pre'; pre.setAttribute('aria-hidden', 'true');
    ta.parentNode.insertBefore(wrap, ta);
    wrap.appendChild(pre); wrap.appendChild(ta);
    const st = { wrap, pre, abort: new AbortController() };
    const signal = st.abort.signal;
    ta.classList.add('bo-sql-ta');
    const sync = () => sqlSync(ta, st);
    ta.addEventListener('input', sync, { signal });
    ta.addEventListener('scroll', () => { pre.scrollTop = ta.scrollTop; pre.scrollLeft = ta.scrollLeft; }, { signal });
    if (window.ResizeObserver) { st.ro = new ResizeObserver(sync); st.ro.observe(ta); }
    attachSuggest(ta, st);
    sqlState.set(ta, st);
    sync();
  }
  const SqlHighlight = {
    mount() {
      SQL_FIELDS.forEach((name) => {
        const lbl = labelEl(name); if (!lbl) return;
        const ta = textareaAfter(lbl); if (ta) sqlAttach(ta);
      });
    },
    unmount() {
      document.querySelectorAll('textarea.bo-sql-ta').forEach((ta) => {
        const st = sqlState.get(ta);
        st?.abort.abort(); st?.ro?.disconnect();
        st?.menu?.remove(); st?.hint?.remove();
        if (st?.attrs) for (const [n, v] of Object.entries(st.attrs)) { if (v === null) ta.removeAttribute(n); else ta.setAttribute(n, v); }
        ta.classList.remove('bo-sql-ta');
        if (st?.wrap.parentNode) { st.wrap.parentNode.insertBefore(ta, st.wrap); st.wrap.remove(); }
        sqlState.delete(ta);
      });
      removeById('bo-enh-sql-css');
    }
  };

  /* ===========================================================================
   * Shell
   * ======================================================================== */
  /* Filter + Copy are parked until the Properties tab is probed (they assume a grid). */
  const GATED = [Overhaul, Lists, SqlHighlight];

  /* The designer's Publish button (top-right); the toggle + help sit before it. */
  function publishButton() {
    return Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button, a'))
      .find((el) => !el.closest('.bo-enh') && (el.value || el.textContent || '').trim().toLowerCase() === 'publish');
  }

  const HELP_HTML = `<header><h2 id="boEnhanceHelpTitle">Business Object enhancements</h2><button type="button" class="TextButton us-outline-button" autofocus>Close</button></header>
    <div class="bo-help-content">
      <h3>Throughout the designer</h3>
      <ul><li>Turn the improvements on or off using <strong>Enhance</strong>. Turning it off restores the standard designer straight away, with no reload.</li></ul>
      <h3>Database</h3>
      <ol><li><strong>Tables</strong> and <strong>Joins</strong> lists grow to show their contents instead of one and a half rows.</li>
      <li><strong>Used Columns</strong> and <strong>Available Columns</strong> are the same height and each has a search box. Search matches anywhere in <em>Table.Column</em>; Escape clears it.</li>
      <li>The two <strong>Joins</strong> column dropdowns are searchable. Click, or focus and start typing, to filter. Separate words with spaces to match both, for example <em>comm key</em>. Use the arrow keys and Enter to choose; Escape closes the list.</li>
      <li><strong>Filter Expression</strong> is highlighted as SQL: keywords, strings, numbers, comments, functions, [bracketed] names and table prefixes.</li>
      <li>Type a table or column name in <strong>Filter Expression</strong> to see matching suggestions, then a dot for that table's columns. Suggestions come from the Used and Available Columns lists, so they follow the tables you add. Use the arrow keys and Tab or Enter to insert; Escape closes the list; Ctrl+Space opens it on demand.</li></ol>
      <p class="bo-help-note"><strong>Remember:</strong> nothing here saves for you. Click <strong>Save</strong> when you're ready, then <strong>Publish</strong>.</p>
    </div>`;

  function ensureHelp(group) {
    let b = document.getElementById('boEnhanceHelp');
    if (!b) {
      b = document.createElement('button');
      b.type = 'button'; b.id = 'boEnhanceHelp'; b.className = 'TextButton us-icon-button'; b.textContent = '?';
      b.title = 'About Business Object enhancements'; b.setAttribute('aria-label', 'Help with Business Object enhancements');
      b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-controls', 'boEnhanceHelpDialog');
      b.addEventListener('click', () => {
        let d = document.getElementById('boEnhanceHelpDialog');
        if (!d) {
          d = document.createElement('dialog');
          d.id = 'boEnhanceHelpDialog'; d.className = 'bo-enh'; d.setAttribute('aria-labelledby', 'boEnhanceHelpTitle');
          d.innerHTML = HELP_HTML;
          d.querySelector('header button').addEventListener('click', () => d.close());
          d.addEventListener('close', () => document.getElementById('boEnhanceHelp')?.focus({ preventScroll: true }));
          d.addEventListener('keydown', (e) => { if (e.key === 'Escape') e.stopPropagation(); });   // keep Esc away from the RadWindow
          d.addEventListener('click', (e) => {                // click on the backdrop closes
            if (e.target !== d) return;
            const r = d.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
          });
          document.body.appendChild(d);
        }
        if (!d.open) { d.querySelector('.bo-help-content').scrollTop = 0; d.showModal(); }
      });
    }
    if (b.parentNode !== group) group.appendChild(b);
  }

  /* Enhance switch + help, grouped and placed just before Publish (re-placed
   * after every postback). Same markup as the IQA editor's theme switch: the
   * native checkbox drives the theme's track and thumb. Floats top-right if
   * Publish can't be found. */
  function pill() {
    injectStyle('bo-enh-base-css', BASE_CSS);
    let group = document.getElementById('boEnhanceActions');
    if (!group) {
      group = document.createElement('span');
      group.id = 'boEnhanceActions'; group.className = 'bo-enh bo-editor-actions';
      group.innerHTML = '<label id="boEnhanceToggle" class="us-switch us-switch--primary" ' +
          'title="Turn the Business Object designer enhancements on or off">' +
        '<input type="checkbox" role="switch" id="boEnhanceToggleInput">' +
        '<span class="us-switch__track" aria-hidden="true"></span>' +
        '<span>Enhance</span>' +
        '</label>';
      group.querySelector('input').addEventListener('change', (e) => { setMode(e.target.checked); run(); });
      ensureHelp(group);
    }
    const pub = publishButton();
    if (pub) {
      group.classList.remove('bo-enh-floating');
      if (group.nextElementSibling !== pub) pub.before(group);
    } else {
      group.classList.add('bo-enh-floating');
      if (group.parentNode !== document.body) document.body.appendChild(group);
    }
    const input = document.getElementById('boEnhanceToggleInput');
    if (input) input.checked = getMode();
  }

  let busy = false;
  function run() {
    if (busy) return; busy = true;
    try {
      pill();
      if (getMode()) GATED.forEach((m) => safe(() => m.mount()));
      else GATED.slice().reverse().forEach((m) => safe(() => m.unmount()));
    } finally { busy = false; }
  }

  function probe() {
    const out = {
      url: location.href,
      title: document.title,
      headings: Array.from(document.querySelectorAll('h1,h2,h3')).map(text).slice(0, 10),
      tables: Array.from(document.querySelectorAll('table')).map((t) => ({
        id: t.id, cls: t.className,
        rows: t.querySelectorAll('tr').length,
        headers: Array.from(t.querySelectorAll('th')).map(text).slice(0, 12),
        firstRow: text(t.querySelector('tbody tr, tr'))?.slice(0, 120)
      })).filter((t) => t.rows >= 3),
      selects: Array.from(document.querySelectorAll('select')).map((e) => ({
        id: e.id, multiple: e.multiple, size: e.size, options: e.options.length, h: e.offsetHeight, w: e.offsetWidth
      })),
      autoGrid: findGrid()?.id || (findGrid() ? '(no id)' : null),
      boName: boName(),
      radWindow: !!(window.radWindow || window.frameElement?.radWindow),
      inIframe: window.self !== window.top,
      pageRequestManager: !!window.Sys?.WebForms?.PageRequestManager
    };
    console.log('[BO-Enh] probe', out);
    console.table(out.tables); console.table(out.selects);
    return out;
  }

  const onEndRequest = () => setTimeout(run, 0);
  const prm = () => window.Sys?.WebForms?.PageRequestManager?.getInstance?.();
  function destroy() {
    GATED.slice().reverse().forEach((m) => safe(() => m.unmount()));
    removeById('boEnhanceActions');
    removeById('boEnhanceHelpDialog');
    removeById('bo-enh-base-css');
    safe(() => prm()?.remove_endRequest(onEndRequest));
    delete window.BoEnh;
  }

  window.BoEnh = { probe, refresh: run, destroy, mode: (on) => { setMode(on !== false); run(); } };

  const start = () => {
    run();
    safe(() => prm()?.add_endRequest(onEndRequest));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
