(function () {
  'use strict';

  if (window.UnionSuiteTaskbar) return;
  // Set UnionSuiteTaskbarConfig before this file to override these site settings.
  const settings = Object.freeze({
    queryName: '$/_i4u_/Core/Directory/Quick Search/Taskbar Quick Search',
    minimumSearchLength: 3,
    searchDelay: 250,
    fullSearchUrl: '/_i4u_/Core/Staff-Site-Layouts/Admin/Directory.aspx',
    historyStoragePrefix: 'union-suite:quick-search-history:',
    // Keep the original configuration and storage names for existing clients.
    pipGreeting: true, // Client Config.js can set false to remove Biscuit and his reserved space.
    pipStoragePrefix: 'union-suite:pip-greeting:',
    ...window.UnionSuiteTaskbarConfig
  });
  let currentInstance = null;
  let observer = null;
  let mountTimer = null;
  let stopped = false;
  // Legacy aliases keep existing site CSS compatible during the migration.
  const classAliases = {
    'tb-input': 'us-taskbar__record-input',
    'tb-btn': 'us-taskbar__button',
    'tb-id-status': 'us-taskbar__record-status',
    'tb-id-wrap': 'us-taskbar__record',
    'tb-id-fields': 'us-taskbar__record-controls',
    'tb-divider': 'us-taskbar__divider',
    'tb-search-wrap': 'us-taskbar__search',
    'tb-search-input': 'us-taskbar__search-input',
    'tb-dd-header': 'us-taskbar__results-header',
    'tb-dd-input': 'us-taskbar__mobile-search-input',
    'tb-dd-close': 'us-taskbar__close-button',
    'tb-dd-body': 'us-taskbar__results-body',
    'tb-dd-item': 'us-taskbar__result',
    'tb-dd-name': 'us-taskbar__result-name',
    'tb-dd-id': 'us-taskbar__result-id',
    'tb-dd-meta': 'us-taskbar__result-meta',
    'tb-dd-match': 'us-taskbar__result-match',
    'tb-dd-msg': 'us-taskbar__results-message',
    'tb-dd-section': 'us-taskbar__results-section'
  };

  /* ── helpers ─────────────────────────────────────────── */

  function createElement(tag, className, text) {
    const n = document.createElement(tag);
    if (className) n.className = className + (classAliases[className] ? ' ' + classAliases[className] : '');
    if (text != null) n.textContent = text;
    return n;
  }

  function apiGet(path, signal) {
    const token = document.querySelector('#__RequestVerificationToken');
    return fetch(window.location.origin + path, {
      signal,
      credentials: 'same-origin',
      headers: { RequestVerificationToken: token ? token.value : '' }
    });
  }

  // Lowercase + strip spaces, so "0400789456" matches "0400 789 456".
  const normaliseSearchText = (s) => String(s == null ? '' : s).toLowerCase().replace(/ /g, '');

  const recordUrl = (id) => '/Party.aspx?ID=' + encodeURIComponent(id);

  // Navigation paths belong to the active website, not a particular theme.
  // Explicit absolute URLs remain configurable; API and record URLs are separate.
  function websiteUrl(path, websiteRoot) {
    if (/^https?:\/\//i.test(path)) return path;
    try {
      const root = new URL(websiteRoot || '/', window.location.href);
      if (!/^https?:$/.test(root.protocol)) return path;
      root.pathname = root.pathname.replace(/\/?$/, '/');
      root.search = '';
      root.hash = '';
      return new URL(path.replace(/^\/+/, ''), root).href;
    } catch (_) {
      return path;
    }
  }

  // Build a matcher for an already-lowercased, space-stripped needle. Supports
  // the SQL-style "%" wildcard (matches any run of characters) so the result
  // highlighter agrees with the server's wildcard search — e.g. "0400%222"
  // highlights "0400 111 222". Returns (haystack) => {start, end} | null.
  function buildMatcher(needle) {
    if (!needle) return () => null;
    if (needle.indexOf('%') === -1) {
      return (hay) => {
        const i = hay.indexOf(needle);
        return i === -1 ? null : { start: i, end: i + needle.length };
      };
    }
    const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(needle.split('%').map(escape).join('[\\s\\S]*'));
    return (hay) => {
      const m = re.exec(hay);
      return m && m[0].length ? { start: m.index, end: m.index + m[0].length } : null;
    };
  }

  function createPropertyReader(item) {
    const props = (item && item.Properties && item.Properties.$values) || [];
    return function get(name) {
      const prop = props.find((p) => p.Name === name);
      const val = prop && prop.Value;
      if (val == null) return '';
      return typeof val === 'object' ? val.$value : val;
    };
  }

  // Dropdown row shared by search results and "Recent items".
  // Returns {a, info} so callers can append extra detail nodes to info.
  function createResultLink(href, name, id, meta, companyRecord) {
    const a = createElement('a', 'tb-dd-item');
    a.href = href;
    a.dataset.recordId = id || '';
    a.dataset.taskbarAction = 'open-result';
    if (typeof companyRecord === 'boolean') {
      const icon = createElement('span', 'us-taskbar__result-kind');
      icon.setAttribute('role', 'img');
      icon.setAttribute('aria-label', companyRecord ? 'Company' : 'Person');
      // The theme's own icons (US-ICONS in zUnionSuite.js, which loads first).
      if (window.UnionSuiteIcons) {
        icon.appendChild(window.UnionSuiteIcons.create(companyRecord ? 'us-building' : 'us-person'));
      }
      a.appendChild(icon);
    }
    const info = createElement('div');
    info.className = 'us-taskbar__result-info';
    info.appendChild(createElement('div', 'tb-dd-name', name));
    if (meta) info.appendChild(createElement('div', 'tb-dd-meta', meta));
    a.appendChild(info);
    if (id) a.appendChild(createElement('span', 'tb-dd-id', id));
    return { a, info };
  }

  // Presentation, including responsive rules, is in zUnionSuite.css.

  /* US-TASKBAR-PIP:START */
  // One local-calendar-day greeting per signed-in user on this browser/origin.
  // The section keeps its footprint while Biscuit is away. No API calls are needed.
  function mountPip(bar, partyId, signal) {
    if (!settings.pipGreeting) return;
    const pip = createElement('div', 'us-taskbar__pip');
    pip.dataset.phase = 'away';
    const button = createElement('button', 'us-taskbar__pip-button');
    button.type = 'button';
    button.disabled = true;
    button.hidden = true;
    button.setAttribute('aria-label', 'Biscuit says hello. Make Biscuit wave');
    button.innerHTML = `
      <span class="pip-visitor" aria-hidden="true">
        <span class="pip-character">
          <span class="pip-creature">
            <span class="pip-figure">
              <span class="pip-tail"></span>
              <span class="pip-body">
                <span class="pip-belly"></span>
              </span>
              <span class="pip-collar"></span>
              <span class="pip-head">
                <span class="pip-ear pip-ear-left"></span>
                <span class="pip-ear pip-ear-right"></span>
                <span class="pip-blaze"></span>
                <span class="pip-eye-patch"></span>
                <span class="pip-tuft"></span>
                <span class="pip-muzzle"></span>
                <span class="pip-eye pip-eye-left"></span>
                <span class="pip-eye pip-eye-right"></span>
                <span class="pip-nose"></span>
                <span class="pip-mouth"></span>
                <span class="pip-tongue"></span>
                <span class="pip-cheek pip-cheek-left"></span>
                <span class="pip-cheek pip-cheek-right"></span>
              </span>
              <span class="pip-paw pip-paw-left"></span>
              <span class="pip-paw pip-paw-right"></span>
            </span>
          </span>
        </span>
      </span>
    `;
    pip.appendChild(button);
    // Biscuit stands beside the client logo, at the left of the header's top
    // row, rather than over the bookmarks bar below it. A previous drawing can
    // survive partial page replacement, so remove any earlier one first.
    document.querySelectorAll('.us-taskbar__pip').forEach(node => node.remove());
    const host = bar.closest('header') || document.getElementById('hd');
    // The native brand block keeps its own width and logo alignment; Biscuit
    // follows it as a sibling. Without that block he keeps his taskbar slot.
    const brand = host && host.querySelector('.navbar-left');
    if (brand && brand.parentElement) brand.after(pip);
    else bar.prepend(pip);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const key = settings.pipStoragePrefix + String(partyId);
    const owner = window.crypto?.randomUUID?.() || Date.now() + '-' + Math.random();
    const timers = new Set();
    let due = null, reaction = null, idleTimer = null, blinkTimer = null, arrivalWave = null;
    let visitEndsAt = 0;
    let clickCount = 0;
    let busy = false, intersecting = false, evaluatedDay = '', lastInput = Date.now();
    let perchOffset = 0, layoutFrame = null;
    // The slot reserves horizontal space beside the logo. The drawing rests on
    // the bottom edge of the surface below it, including padding and a taller
    // client logo: the header border, or the top row's own edge when another
    // row — the bookmarks bar — follows it inside the header.
    const header = pip.closest('header') || bar.closest('header') || bar.closest('#hd');
    const topRow = pip.closest('#masterTopBarAuxiliary, .navbar-header');
    // A narrow header wraps its controls onto further lines. Biscuit stops at
    // the first one that wraps beneath his slot rather than standing in front
    // of it; without one he keeps the full surface below him.
    function clearOfControls(slotRect, bottom) {
      if (!topRow || bottom <= slotRect.bottom) return bottom;
      const centre = slotRect.left + slotRect.width / 2;
      for (const node of topRow.querySelectorAll('a, button, input, select, textarea')) {
        if (pip.contains(node)) continue;
        const rect = node.getBoundingClientRect();
        if (!rect.width || !rect.height) continue;
        if (rect.left < centre && rect.right > centre && rect.top >= slotRect.bottom && rect.top < bottom) bottom = rect.top;
      }
      return bottom;
    }
    function perchBottom(slotRect) {
      if (topRow && topRow !== header) {
        const nextRow = topRow.nextElementSibling;
        if (nextRow && nextRow.getClientRects().length) return topRow.getBoundingClientRect().bottom;
      }
      if (!header) return slotRect.bottom;
      return header.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(header).borderBottomWidth) || 0);
    }
    function alignPerch() {
      layoutFrame = null;
      if (signal.aborted || !pip.isConnected) return;
      const slotRect = pip.getBoundingClientRect();
      const bottom = clearOfControls(slotRect, perchBottom(slotRect));
      const next = Math.round((bottom - slotRect.bottom) * 100) / 100;
      if (next !== perchOffset) {
        perchOffset = next;
        pip.style.setProperty('--pip-perch-offset', next + 'px');
        schedule();
      }
    }
    function queuePerch() {
      if (!signal.aborted && layoutFrame === null) layoutFrame = requestAnimationFrame(alignPerch);
    }
    const perchResize = new ResizeObserver(queuePerch);
    for (let node = pip; node; node = node.parentElement) {
      perchResize.observe(node, {box:'border-box'});
      if (node === header) break;
    }
    window.addEventListener('resize', queuePerch, {signal, passive:true});
    window.addEventListener('pageshow', queuePerch, {signal});
    document.fonts?.ready.then(queuePerch);
    alignPerch();
    function day() {
      const date = new Date();
      return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    }
    function later(fn, ms) {
      const id = setTimeout(() => { timers.delete(id); if (!signal.aborted) fn(); }, ms);
      timers.add(id);
      return id;
    }
    function cancel(id) { clearTimeout(id); timers.delete(id); }
    function resetGaze() {
      pip.style.setProperty('--pip-gaze-x', '0px');
      pip.style.setProperty('--pip-gaze-y', '0px');
      pip.style.setProperty('--pip-turn', '0deg');
    }
    function resetExpression() { pip.classList.remove('is-arriving', 'is-waving', 'is-hopping', 'is-curious', 'is-scratching', 'is-blinking', 'is-twitching'); }
    function phase(value) {
      pip.dataset.phase = value;
      button.disabled = value !== 'visit';
      button.hidden = value === 'away';
    }
    function ready() {
      if (signal.aborted || !intersecting || !pip.isConnected || document.visibilityState === 'hidden' || document.readyState !== 'complete') return false;
      let ctx;
      try { ctx = JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch (_) { return false; }
      if (String(ctx.loggedInPartyId) !== String(partyId) || ctx.isAnonymous === true) return false;
      const rect = pip.getBoundingClientRect();
      if (!rect.width || !rect.height || rect.bottom + perchOffset <= 0 || rect.top + perchOffset >= window.innerHeight) return false;
      const style = getComputedStyle(pip);
      if (style.visibility === 'hidden' || style.getPropertyValue('--us-pip-enabled').trim() !== '1') return false;
      const active = document.activeElement;
      return !active?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="dialog"], [aria-modal="true"]') &&
        !document.querySelector('dialog[open], [aria-modal="true"]:not([hidden])') &&
        bar.querySelector('#tb-search-dropdown')?.hidden !== false && Date.now() - lastInput >= 1200;
    }
    function readGreeting() { return JSON.parse(localStorage.getItem(key) || 'null'); }
    function releaseClaim() {
      try {
        const entry = readGreeting();
        if (entry?.owner === owner && entry.pending) localStorage.removeItem(key);
      } catch (_) { /* Persistence is optional; never repeat on every page if blocked. */ }
    }
    function pulse(name, ms) {
      pip.classList.add(name);
      later(() => pip.classList.remove(name), ms);
    }
    function blink() {
      cancel(blinkTimer);
      if (pip.dataset.phase !== 'visit' || motion.matches || document.visibilityState === 'hidden') return;
      blinkTimer = later(() => {
        if (!pip.matches('.is-waving, .is-hopping, .is-curious, .is-scratching')) {
          pulse('is-blinking', 230);
          if (Math.random() < .4) pulse('is-twitching', 460);
        }
        blink();
      }, 2400 + Math.random() * 1800);
    }
    function idle() {
      cancel(idleTimer);
      if (!['peek', 'visit'].includes(pip.dataset.phase) || motion.matches || document.visibilityState === 'hidden') return;
      idleTimer = later(() => {
        // User reactions and active work take priority; skipped beats do not queue.
        if (ready() && !pip.matches('.is-arriving, .is-waving, .is-hopping, .is-curious, .is-scratching')) {
          playIdle(Math.random() < .5 ? 'scratch' : 'curious');
        }
        idle();
      }, 15000);
    }
    function playIdle(action) {
      if (signal.aborted || !pip.isConnected || pip.dataset.phase !== 'visit' || document.visibilityState === 'hidden') return false;
      if (action !== 'scratch' && action !== 'curious') return false;
      react(action === 'scratch' ? 'is-scratching' : 'is-curious', action === 'scratch' ? 2200 : 2000);
      return true;
    }
    function leave(dismissed = false) {
      if (!['peek', 'visit'].includes(pip.dataset.phase)) return;
      // Five minutes uses the normal exit; the third activation uses the goodbye.
      if (document.activeElement === button) {
        const next = [...bar.querySelectorAll('.us-taskbar__quick-link, .us-taskbar__full-search')]
          .find(link => link.getClientRects().length && getComputedStyle(link).visibility !== 'hidden');
        if (next) next.focus({preventScroll:true});
        else button.blur();
      }
      // Cancel the arrival wave and idle callbacks as well as the active wave.
      timers.forEach(clearTimeout); timers.clear();
      resetExpression(); resetGaze();
      phase(motion.matches ? 'away' : dismissed ? 'goodbye' : 'leaving');
      // Match --pip-goodbye-duration: quick duck, look around, startle, quick exit.
      if (!motion.matches) later(() => phase('away'), dismissed ? 3000 : 700);
    }
    function wave() {
      if (pip.dataset.phase !== 'visit') return;
      react('is-waving', 2000);
    }
    function react(name, duration) {
      cancel(reaction); cancel(arrivalWave);
      resetExpression(); resetGaze();
      void button.offsetWidth;
      pip.classList.add(name);
      reaction = later(() => pip.classList.remove(name), duration);
    }
    function visit() {
      clickCount = 0;
      button.setAttribute('aria-label', 'Biscuit says hello. Make Biscuit wave');
      visitEndsAt = Date.now() + 300000;
      resetExpression(); resetGaze();
      button.hidden = false;
      void button.offsetWidth;
      phase(motion.matches ? 'visit' : 'peek');
      later(() => {
        phase('visit');
        if (!motion.matches) { pulse('is-arriving', 720); blink(); }
      }, motion.matches ? 0 : 1500);
      arrivalWave = later(() => { if (!clickCount) wave(); }, motion.matches ? 150 : 2300);
      later(() => leave(), 300000);
      idle();
    }
    async function claimGreeting() {
      if (!ready()) return;
      const today = day();
      const previous = readGreeting();
      if (previous?.day === today && (!previous.pending || Date.now() - previous.at < 5000)) {
        if (!previous.pending) evaluatedDay = today;
        return;
      }
      // A short pending claim also settles simultaneous tabs without Web Locks.
      localStorage.setItem(key, JSON.stringify({day:today, owner, pending:true, at:Date.now()}));
      await new Promise(resolve => setTimeout(resolve, 120));
      const claim = readGreeting();
      if (claim?.owner !== owner) return;
      if (!ready() || day() !== today) { releaseClaim(); return; }
      localStorage.setItem(key, JSON.stringify({day:today, owner}));
      evaluatedDay = today;
      visit();
    }
    async function check() {
      due = null;
      if (busy || evaluatedDay === day() || pip.dataset.phase !== 'away' || !ready()) return;
      busy = true;
      try {
        if (navigator.locks?.request) await navigator.locks.request(key, {signal}, claimGreeting);
        else await claimGreeting();
      } catch (_) {
        // Storage/lock denial must not break navigation or greet on every reload.
        releaseClaim();
        evaluatedDay = day();
      } finally { busy = false; }
    }
    function schedule() {
      cancel(due);
      if (!signal.aborted && evaluatedDay !== day()) due = later(check, 1300);
    }
    function input() { lastInput = Date.now(); schedule(); }
    button.addEventListener('click', () => {
      if (pip.dataset.phase !== 'visit') return;
      clickCount += 1;
      if (clickCount === 1) {
        button.setAttribute('aria-label', 'Make Biscuit hop');
        wave();
      } else if (clickCount === 2) {
        button.setAttribute('aria-label', 'Say goodbye to Biscuit');
        react('is-hopping', 850);
      } else leave(true);
    }, {signal});
    document.addEventListener('pointermove', event => {
      if (pip.dataset.phase !== 'visit' || pip.matches('.is-curious, .is-scratching') || motion.matches || event.pointerType === 'touch') return;
      const rect = button.getBoundingClientRect();
      const x = Math.max(-2, Math.min(2, (event.clientX - rect.left - rect.width / 2) / 90));
      const y = Math.max(-1.5, Math.min(1.5, (event.clientY - rect.top - rect.height / 2) / 100));
      pip.style.setProperty('--pip-gaze-x', x.toFixed(2) + 'px');
      pip.style.setProperty('--pip-gaze-y', y.toFixed(2) + 'px');
      pip.style.setProperty('--pip-turn', (x * 1.8).toFixed(2) + 'deg');
    }, {signal});
    document.documentElement.addEventListener('pointerleave', resetGaze, {signal});
    ['pointerdown', 'keydown', 'input'].forEach(type => document.addEventListener(type, input, {signal, passive:true}));
    document.addEventListener('focusout', schedule, {signal});
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Pause idle reactions without dismissing or resetting the click sequence.
        cancel(idleTimer); cancel(blinkTimer); resetExpression(); resetGaze(); releaseClaim();
      } else {
        if (visitEndsAt && Date.now() >= visitEndsAt) leave();
        blink(); idle(); schedule();
      }
    }, {signal});
    motion.addEventListener('change', () => {
      resetGaze(); pip.classList.remove('is-arriving', 'is-blinking', 'is-twitching');
      if (motion.matches && pip.dataset.phase === 'peek') phase('visit');
      if (motion.matches && ['goodbye', 'leaving'].includes(pip.dataset.phase)) phase('away');
      blink(); idle();
    }, {signal});
    window.addEventListener('load', schedule, {signal});
    window.addEventListener('pageshow', schedule, {signal});
    window.addEventListener('focus', schedule, {signal});
    window.addEventListener('pagehide', () => {
      timers.forEach(clearTimeout); timers.clear(); releaseClaim(); resetExpression(); resetGaze(); phase('away');
    }, {signal});
    const visibility = new IntersectionObserver(entries => {
      intersecting = entries.some(entry => entry.isIntersecting);
      if (intersecting) schedule();
    });
    visibility.observe(pip);
    signal.addEventListener('abort', () => {
      timers.forEach(clearTimeout); timers.clear(); visibility.disconnect(); releaseClaim();
      perchResize.disconnect(); cancelAnimationFrame(layoutFrame);
      // Biscuit sits outside the taskbar element, so teardown removes him here.
      pip.remove();
    }, {once:true});
    schedule();
    return {playIdle};
  }
  /* US-TASKBAR-PIP:END */



  /* ── mountTaskbar ───────────────────────────────────────────── */

  function mountTaskbar() {
    // Replace the native iMIS search block in the top-right nav.
    const slot = document.querySelector('.searchfieldplus-dropdown');
    if (!slot || stopped) return;

    // Only show for authenticated users (see iMIS-Authentication.md §2)
    const ctxEl = document.getElementById('__ClientContext');
    let ctx;
    try {
      ctx = JSON.parse((ctxEl && ctxEl.value) || '{}');
    } catch (e) {
      console.warn('[UnionSuiteTaskbar] Invalid client context; retaining native search.');
      return;
    }
    if (!ctxEl || !ctx.loggedInPartyId || ctx.isAnonymous === true || String(ctx.loggedInPartyId) === '1') return;

    if (document.getElementById('injected-taskbar')) return; // avoid duplicates

    // Capture iMIS "Recent items" before we replace the native search block,
    // so we can show them as the default dropdown content.
    const recents = [];
    slot.querySelectorAll('.RecentHistoryList .RecentHistoryItem a').forEach((a) => {
      const href = a.getAttribute('href') || '';
      const txt = (a.textContent || '').trim();
      const id = (href.match(/[?&]ID=(\d+)/i) || [])[1] || '';
      // Names render as "Tony Stark (104038)" — strip the trailing id for our layout.
      const name = txt.replace(/\s*\(\d+\)\s*$/, '').trim() || txt;
      if (name || id) recents.push({ name, id, href });
    });



    /* — bar — */
    const bar = createElement('div', 'us-taskbar');
    bar.id = 'injected-taskbar';
    bar.dataset.taskbar = '';
    const lifecycle = new AbortController();
    let disposed = false;
    let searchRequest = null;
    let searchVersion = 0;

    /* — Search section — */
    const searchWrap = createElement('div', 'tb-search-wrap');
    const searchIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    searchIcon.classList.add('us-taskbar__search-icon');
    searchIcon.setAttribute('viewBox', '0 0 24 24');
    searchIcon.setAttribute('aria-hidden', 'true');
    searchIcon.setAttribute('focusable', 'false');
    const searchGlyph = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    searchGlyph.setAttribute('d', 'M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0');
    searchIcon.appendChild(searchGlyph);

    const searchInput = createElement('input', 'tb-search-input');
    searchInput.type = 'text';
    searchInput.id = 'us-taskbar-search';
    searchInput.dataset.taskbarField = 'search';
    searchInput.setAttribute('aria-label', 'Quick Search');
    searchInput.setAttribute('aria-controls', 'tb-search-dropdown');
    searchInput.setAttribute('aria-expanded', 'false');
    searchInput.placeholder = 'Search by ID, name, email or mobile…';
    searchInput.autocomplete = 'off';

    const dropdown = createElement('div');
    dropdown.id = 'tb-search-dropdown';
    dropdown.className = 'us-taskbar__results';
    dropdown.setAttribute('role', 'region');
    dropdown.setAttribute('aria-label', 'Search results');
    dropdown.hidden = true;

    // Persistent header (mobile-only via CSS) with its own visible search
    // input — the full-screen results panel covers the small nav input, so
    // mobile typing happens here instead. + scrollable body below.
    const resultsHeader = createElement('div', 'tb-dd-header');
    const mobileSearchInput = createElement('input', 'tb-dd-input');
    mobileSearchInput.type = 'text';
    mobileSearchInput.setAttribute('aria-label', 'Quick Search');
    mobileSearchInput.placeholder = 'ID, name, email, mobile…';
    mobileSearchInput.autocomplete = 'off';
    const closeButton = createElement('button', 'tb-dd-close', '✕');
    closeButton.type = 'button';
    closeButton.dataset.taskbarAction = 'close-results';
    closeButton.setAttribute('aria-label', 'Close search results');
    resultsHeader.appendChild(mobileSearchInput);
    resultsHeader.appendChild(closeButton);

    const resultsBody = createElement('div', 'tb-dd-body');

    dropdown.appendChild(resultsHeader);
    dropdown.appendChild(resultsBody);

    /* — search logic — */
    let debounceTimer = null;
    let activeQuery = '';

    const isMobile = () => window.matchMedia('(max-width: 768px)').matches;

    function showDropdown(node) {
      if (disposed) return;
      const wasHidden = dropdown.hidden;
      resultsBody.replaceChildren(node);
      // Use '' (not 'block') so the mobile flex-column layout isn't overridden.
      dropdown.hidden = false;
      searchInput.setAttribute('aria-expanded', 'true');
      syncMobileToggle();
      // On mobile the panel covers the nav input — move focus to the visible
      // in-panel input so the user can see what they're typing.
      if (wasHidden && isMobile() && document.activeElement !== mobileSearchInput) {
        mobileSearchInput.value = searchInput.value;
        mobileSearchInput.focus();
      }
    }

    function hideDropdown() {
      dropdown.hidden = true;
      searchInput.setAttribute('aria-expanded', 'false');
      syncMobileToggle();
      clearTimeout(debounceTimer);
      searchRequest?.abort();
      searchVersion++;
      resultsBody.replaceChildren();
    }

    // Below 768px the header has no search field: Orion's bottom bar search
    // button (#MobileSearchToggle) opens this panel instead of the native
    // search. The capture listener runs before Bootstrap's dropdown and the
    // outside-click close below, and stops both. Closing the panel returns
    // focus to the button that opened it.
    let searchOpener = null;
    function syncMobileToggle() {
      document.getElementById('MobileSearchToggle')?.setAttribute('aria-expanded', String(!dropdown.hidden));
    }

    function returnFocus() {
      if (searchOpener?.isConnected) searchOpener.focus();
      searchOpener = null;
    }

    document.addEventListener('click', event => {
      const toggle = event.target.closest?.('#MobileSearchToggle');
      if (!toggle) return;
      event.preventDefault();
      event.stopPropagation();
      toggle.setAttribute('aria-controls', 'tb-search-dropdown');
      if (!dropdown.hidden) {
        hideDropdown();
        toggle.focus();
        return;
      }
      searchOpener = toggle;
      // Reopens on the last search's results, or on history and recents.
      const term = searchInput.value.trim();
      if (term.length >= settings.minimumSearchLength) {
        activeQuery = term;
        findRecords(term);
      } else {
        showHint();
      }
      mobileSearchInput.focus();
    }, { capture: true, signal: lifecycle.signal });

    closeButton.addEventListener('click', () => {
      hideDropdown();
      searchInput.blur();
      mobileSearchInput.blur();
      returnFocus();
    });

    function createStatusMessage(text) {
      const message = createElement('div', 'tb-dd-msg', text);
      message.setAttribute('role', 'status');
      return message;
    }

    // Show which underlying field matched the term (with the match highlighted),
    // so results that don't visibly contain the term are explicable. `matcher`
    // is wildcard-aware (see buildMatcher), so it finds the same matches the
    // server did.
    function createMatchHighlight(get, matcher) {
      const fields = [
        ['Preferred email', get('PreferredEmail')],
        ['Preferred mobile', get('PreferredMobile')],
        ['Suburb', get('Suburb')],
        ['Postcode', get('Postcode')],
        ['Company', get('COMPANY')],
        ['Name', get('FULL_NAME')]
      ];
      for (const [label, raw] of fields) {
        const value = String(raw || '');

        // Build a space-stripped, lowercased copy that maps back to original indices.
        let stripped = '';
        const map = [];
        for (let c = 0; c < value.length; c++) {
          const ch = value.charAt(c);
          if (ch !== ' ') { stripped += ch.toLowerCase(); map.push(c); }
        }

        const m = matcher(stripped);
        if (!m) continue;

        const startOrig = map[m.start];
        const endOrig = map[m.end - 1] + 1;

        const d = createElement('div', 'tb-dd-match', label + ': ' + value.slice(0, startOrig));
        d.appendChild(createElement('strong', null, value.slice(startOrig, endOrig)));
        d.appendChild(document.createTextNode(value.slice(endOrig)));
        return d;
      }
      return null;
    }

    function findRecords(term) {
      const queryName = encodeURIComponent(settings.queryName);
      const version = ++searchVersion;
      searchRequest?.abort();
      searchRequest = new AbortController();

      const loadingMessage = createStatusMessage('Searching…');
      loadingMessage.classList.add('us-taskbar__search-loading');
      const spinner = createElement('span', 'section-loader-spinning-circles');
      spinner.setAttribute('aria-hidden', 'true');
      loadingMessage.prepend(spinner);
      showDropdown(loadingMessage);

      apiGet('/api/iqa?queryname=' + queryName + '&limit=10&parameter=' + encodeURIComponent(term), searchRequest.signal)
        .then((res) => {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then((data) => {
          if (disposed || version !== searchVersion || term !== activeQuery) return;
          rememberSearch(term);
          const items = (data && data.Items && data.Items.$values) || [];
          if (!items.length) {
            showDropdown(createStatusMessage('No results found.'));
            return;
          }
          const matcher = buildMatcher(normaliseSearchText(term));
          const frag = document.createDocumentFragment();
          items.forEach((item) => {
            const get = createPropertyReader(item);
            const id = String(get('ID') || '');
            const name = (get('COMPANY_RECORD') === true ? get('COMPANY') : get('FULL_NAME')) || id;
            const meta = [get('Member Type'), get('Status')].filter(Boolean).join(' · ');

            const { a, info } = createResultLink(id ? recordUrl(id) : '#', name, id, meta, get('COMPANY_RECORD'));

            // If the visible name doesn't match the term, show what did.
            if (!matcher(normaliseSearchText(name))) {
              const mNode = createMatchHighlight(get, matcher);
              if (mNode) info.appendChild(mNode);
            }
            a.addEventListener('click', () => confirmHistorySearch(term));
            frag.appendChild(a);
          });
          showDropdown(frag);
        })
        .catch((err) => {
          if (disposed || err.name === 'AbortError' || version !== searchVersion || term !== activeQuery) return;
          showDropdown(createStatusMessage('Error: ' + err.message));
        });
    }

    // Default dropdown content: the captured iMIS "Recent items", or a hint.
// US-TASKBAR-HISTORY:START
const historyKey = settings.historyStoragePrefix + String(ctx.loggedInPartyId);
let searchHistory = [];
let historyPersistent = true;
try {
  const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
  if (Array.isArray(saved)) searchHistory = saved.filter(s => typeof s === 'string' && s.trim().length >= settings.minimumSearchLength).slice(0, 5);
} catch { historyPersistent = false; }
function storeSearchHistory() {
  try { localStorage.setItem(historyKey, JSON.stringify(searchHistory)); }
  catch { historyPersistent = false; }
}
let lastHistorySearch = null;
let replacementTerm = null;
let confirmedHistoryTerm = null;
function resetHistoryWindow() {
  lastHistorySearch = null;
  replacementTerm = null;
  confirmedHistoryTerm = null;
}
function editHistoryTerm(value) {
  if (!value.trim()) { resetHistoryWindow(); return; }
  confirmedHistoryTerm = null;
  // Capture eligibility on edit, independently of response latency.
  if (!replacementTerm && lastHistorySearch) {
    if (Date.now() - lastHistorySearch.at <= 2000) replacementTerm = lastHistorySearch.term;
    else lastHistorySearch = null;
  }
}
function rememberSearch(term) {
  term = term.trim();
  if (term.length < settings.minimumSearchLength) return;
  searchHistory = [term, ...searchHistory.filter(s => s.toLowerCase() !== term.toLowerCase() && (!replacementTerm || s.toLowerCase() !== replacementTerm.toLowerCase()))].slice(0, 5);
  replacementTerm = null;
  lastHistorySearch = confirmedHistoryTerm === term ? null : {term, at: Date.now()};
  storeSearchHistory();
}
function confirmHistorySearch(term) {
  rememberSearch(term);
  resetHistoryWindow();
  confirmedHistoryTerm = term.trim();
}
function appendSearchHistory(frag) {
  const heading = createElement('div', 'tb-dd-section');
  heading.classList.add('us-taskbar__history-heading');
  heading.appendChild(createElement('span', '', 'Recent searches'));
  if (searchHistory.length) {
    const clear = createElement('button', '', 'Clear history');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      searchHistory = []; resetHistoryWindow(); storeSearchHistory(); showHint();
      (isMobile() ? mobileSearchInput : searchInput).focus();
    });
    heading.appendChild(clear);
  }
  frag.appendChild(heading);
  if (!searchHistory.length) frag.appendChild(createElement('div', 'tb-dd-msg', 'Completed searches appear here.'));
  searchHistory.forEach(term => {
    const row = createElement('div', 'us-taskbar__history-row');
    const rerun = createElement('a', 'us-taskbar__history-term');
    rerun.href = '#';
    const clock = createElement('span', 'us-taskbar__history-clock');
    clock.setAttribute('aria-hidden', 'true');
    clock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    rerun.append(clock, document.createTextNode(term));
    rerun.addEventListener('click', event => {
      event.preventDefault();
      resetHistoryWindow();
      searchInput.value = mobileSearchInput.value = term;
      (isMobile() ? mobileSearchInput : searchInput).focus(); scheduleSearch(term);
    });
    const remove = createElement('button', 'us-taskbar__history-remove TextButton us-icon-button DangerButton');
    remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove search: ' + term);
    remove.addEventListener('click', () => {
      searchHistory = searchHistory.filter(s => s !== term);
      resetHistoryWindow();
      storeSearchHistory(); showHint(); (isMobile() ? mobileSearchInput : searchInput).focus();
    });
    row.append(rerun, remove); frag.appendChild(row);
  });
  if (!historyPersistent) frag.appendChild(createElement('div', 'tb-dd-msg', 'Browser storage is unavailable; history lasts for this page only.'));
}

// US-TASKBAR-HISTORY:END

    function showHint() {
      const frag = document.createDocumentFragment();
      if (!searchInput.value.trim()) appendSearchHistory(frag);
      if (recents.length) frag.appendChild(createElement('div', 'tb-dd-section', 'Recently viewed records'));
      if (searchInput.value.trim() && !recents.length) frag.appendChild(createStatusMessage('Type at least ' + settings.minimumSearchLength + ' characters to search.'));
      recents.forEach((rec) => {
        const href = rec.href || (rec.id ? recordUrl(rec.id) : '#');
        frag.appendChild(createResultLink(href, rec.name, rec.id).a);
      });
      showDropdown(frag);
    }

    // Shared by both the nav input and the mobile in-panel input.
    function scheduleSearch(term) {
      term = (term || '').trim();
      clearTimeout(debounceTimer);
      searchRequest?.abort();
      searchVersion++;
      if (term.length < settings.minimumSearchLength) { showHint(); activeQuery = ''; return; }
      activeQuery = term;
      debounceTimer = setTimeout(() => findRecords(term), settings.searchDelay);
    }

    // The nav input and the mobile in-panel input mirror each other and both
    // drive the search.
    function bindSearchInput(input, mirror) {
      input.addEventListener('input', () => {
        editHistoryTerm(input.value);
        if (mirror.value !== input.value) mirror.value = input.value;
        scheduleSearch(input.value);
      });
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); if (!e.isComposing) confirmHistorySearch(input.value); }
        if (e.key === 'Escape') { hideDropdown(); input.blur(); }
      });
    }
    bindSearchInput(searchInput, mobileSearchInput);
    bindSearchInput(mobileSearchInput, searchInput);

    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length < settings.minimumSearchLength) showHint();
    });

    document.addEventListener('click', event => {
      // History actions rebuild the clicked row before this event bubbles here.
      // Its original path still identifies that click as inside the dropdown.
      if (!event.composedPath().includes(searchWrap)) hideDropdown();
    }, { signal: lifecycle.signal });
    bar.addEventListener('keydown', event => {
      const links = [...resultsBody.querySelectorAll('a[href]')];
      if (event.key === 'Escape') {
        hideDropdown();
        searchInput.focus();
        // Focusing the input can show recent items; Escape must leave it closed.
        hideDropdown();
        // Below 768px the header field is hidden: back to the bottom bar button.
        if (isMobile()) returnFocus();
      }
      if (!dropdown.hidden && links.length && ['ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        const index = links.indexOf(document.activeElement);
        const next = event.key === 'ArrowDown' ? (index + 1) % links.length : (index <= 0 ? links.length - 1 : index - 1);
        links[next].focus();
      }
    });
    /* — assemble — */
    const searchShell = createElement('div', 'us-taskbar__search-shell');
    searchShell.append(searchIcon, searchInput);
    searchShell.addEventListener('click', () => searchInput.focus());
    const fullSearch = createElement('a', 'TextButton');
    fullSearch.classList.add('us-outline-button', 'us-taskbar__full-search');
    fullSearch.href = websiteUrl(settings.fullSearchUrl, ctx.websiteRoot);
    fullSearch.title = 'Full search';
    fullSearch.setAttribute('aria-label', 'Full search');
    fullSearch.dataset.taskbarAction = 'full-search';
    const fullSearchSpinner = createElement('span', 'us-button-spinner');
    fullSearchSpinner.setAttribute('aria-hidden', 'true');
    let fullSearchTimer = null;
    function resetFullSearch() {
      clearTimeout(fullSearchTimer);
      fullSearchTimer = null;
      fullSearch.removeAttribute('aria-busy');
      fullSearch.setAttribute('aria-label', 'Full search');
      fullSearchSpinner.remove();
    }
    fullSearch.addEventListener('click', event => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (fullSearch.getAttribute('aria-busy') === 'true') { event.preventDefault(); return; }
      fullSearch.setAttribute('aria-busy', 'true');
      fullSearch.setAttribute('aria-label', 'Opening full search');
      fullSearch.appendChild(fullSearchSpinner);
      // Normal anchor navigation remains in control. Recover if navigation is cancelled.
      fullSearchTimer = setTimeout(resetFullSearch, 10000);
    });
    window.addEventListener('pageshow', resetFullSearch, {signal:lifecycle.signal});
    lifecycle.signal.addEventListener('abort', resetFullSearch, {once:true});
    fullSearch.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="10" r="5"/><path d="m13 14 4 4M16 4h5v5M21 4l-5 5"/></svg>';
    searchWrap.append(searchShell, fullSearch, dropdown);

    const quickLinks = createElement('nav', 'us-taskbar__quick-links');
    quickLinks.setAttribute('aria-label', 'Management shortcuts');
    [
      ['Manage IQAs', '/AsiCommon/Controls/IQA/Default.aspx', 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6zM14 3v6h6M8 13h8M8 17h5'],
      ['Manage Content', '/iMIS/ContentManagement/ContentDesigner.aspx', 'M4 4h16v16H4zM4 9h16M9 9v11'],
      ['Manage Themes', '/AsiCommon/Controls/BSA/ObjectBrowser.aspx?DocumentPath=%24%2fContentManagement%2fDefaultSystem%2fThemes&iRootFolder=%24%2fContentManagement%2fDefaultSystem%2fThemes&AllowUpwardNavigation=False&ShowDescription=True&TypeFilter=ATH&DisallowDeletionOfRootFolder=False', 'M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 1.8-4.2 1.8 1.8 0 0 1 1.3-3.1H18a3 3 0 0 0 3-3C21 6.4 17 3 12 3zM7.5 10h.01M10 6.5h.01M14 6.5h.01M17 10h.01'],
      ['About iMIS', '/iMIS/Setup/AboutImis.aspx', 'M3 12a9 9 0 1 0 18 0a9 9 0 1 0-18 0M12 8h.01M11 12h1v4h1']
    ].forEach(([label, href, path]) => {
      const link = createElement('a', 'us-taskbar__quick-link');
      link.href = websiteUrl(href, ctx.websiteRoot);
      link.title = label;
      link.setAttribute('aria-label', label);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      const glyph = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      glyph.setAttribute('d', path);
      svg.appendChild(glyph);
      link.appendChild(svg);
      quickLinks.appendChild(link);
    });
    bar.appendChild(quickLinks);
    const quickDivider = createElement('div', 'us-taskbar__quick-divider');
    quickDivider.setAttribute('aria-hidden', 'true');
    bar.appendChild(quickDivider);
    bar.appendChild(searchWrap);

    // Appearance state belongs to the document, so it survives taskbar teardown.
    // Hide the control until both shared JS and the last-loaded dark CSS exist.
    const themeToggle = createElement('button', 'us-taskbar__theme-toggle');
    themeToggle.type = 'button';
    themeToggle.hidden = true;
    themeToggle.dataset.taskbarAction = 'toggle-dark-mode';
    themeToggle.setAttribute('role', 'switch');
    themeToggle.setAttribute('aria-label', 'Dark mode');
    themeToggle.setAttribute('aria-checked', 'false');
    themeToggle.innerHTML = '<span class="scene-track" aria-hidden="true"><span class="scene-stars"><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i><i class="ti ti-star-filled"></i></span><span class="scene-disc"><span class="scene-craters"><b></b><b></b><b></b></span></span><span class="scene-clouds scene-clouds-back"><i class="ti ti-cloud-filled"></i><i class="ti ti-cloud-filled"></i></span><span class="scene-clouds"><i class="ti ti-cloud-filled"></i><i class="ti ti-cloud-filled"></i></span></span>';
    function syncAppearance() {
      const appearance = window.UnionSuiteAppearance?.getState();
      themeToggle.hidden = !appearance?.enabled;
      const dark = appearance?.scheme === 'dark';
      themeToggle.setAttribute('aria-checked', String(dark));
      themeToggle.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
    }
    themeToggle.addEventListener('click', () => window.UnionSuiteAppearance?.toggle(), {signal:lifecycle.signal});
    window.addEventListener('unionsuite:appearancechange', syncAppearance, {signal:lifecycle.signal});
    bar.appendChild(themeToggle);
    syncAppearance();

    // Keep the native search block in the DOM (other iMIS scripts reference
    // #ctl01_SearchFieldPlus_Shortcuts_RadAjaxPanel1) — it's hidden via CSS.
    // Insert our taskbar in its place instead of replacing it.
    slot.parentNode.insertBefore(bar, slot);
    document.documentElement.classList.add('us-taskbar-mounted');
    const pip = mountPip(bar, ctx.loggedInPartyId, lifecycle.signal);
    currentInstance = { bar, pip, destroy() {
      disposed = true;
      clearTimeout(debounceTimer);
      lifecycle.abort(); searchRequest?.abort();
      bar.remove();
      document.documentElement.classList.remove('us-taskbar-mounted');
    }};
  }

  function refresh() {
    if (stopped) return;
    if (currentInstance && !currentInstance.bar.isConnected) {
      currentInstance.destroy(); currentInstance = null;
    }
    mountTaskbar();
  }

  function destroy() {
    stopped = true;
    observer?.disconnect(); clearTimeout(mountTimer); mountTimer = null;
    document.removeEventListener('DOMContentLoaded', initialiseTaskbar);
    currentInstance?.destroy(); currentInstance = null;
  }

  function initialiseTaskbar() {
    stopped = false;
    refresh();
    if (!observer) observer = new MutationObserver(() => {
      if (mountTimer !== null || currentInstance?.bar.isConnected) return;
      mountTimer = setTimeout(() => { mountTimer = null; refresh(); }, 0);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  window.UnionSuiteTaskbar = Object.freeze({ version: '1.8', initialise: initialiseTaskbar, refresh, destroy,
    playPipIdle: action => currentInstance?.pip?.playIdle(action) || false
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialiseTaskbar, {once:true});
  else initialiseTaskbar();
})();
