/* =============================================================================
 * Object browser: copy path and folder bookmarks — window.UnionSuiteFolderBookmarks
 * -----------------------------------------------------------------------------
 * On the three iMIS document management screens that share the native object
 * browser (objectBrowserClass):
 *   • the IQA browser       /AsiCommon/Controls/IQA/Default.aspx
 *   • the content designer  /ContentManagement/ContentDesigner.aspx
 *   • the document browser  /AsiCommon/Controls/BSA/DocumentBrowser.aspx
 *
 * Each row in the right-hand list gets Copy path at its right end, shown on
 * the selected row (and on hover or focus on wide screens): the theme's shared
 * copy button (US-COPY). It copies the item's full path, such as
 * $/_i4u_/Core/Cases/Case List, and never opens the IQA, page or document.
 *
 * The address row gets the same for the open folder, after Go: Copy path
 * (the address box flashes) and a bookmark star, as a web browser's address
 * bar has. The back, forward and up icons on the left move between folders;
 * these act on the folder that is open, so they sit apart from them.
 *
 * A Bookmarks pane sits above the left folder tree. It lists the bookmarked
 * folders for this screen's tree ($ or @). Choosing one goes there through
 * the page's own address box and Go button.
 *
 * Bookmarks are saved to the user's i4u_UT_UserSettings row (SettingsKey
 * Folder-Bookmarks) as [[key, path], …], so they follow the user. A copy in
 * this browser draws the pane at once while the saved row loads.
 *
 * The core functions need no page; tools/test-object-browser-bookmarks.cjs
 * loads this file in Node.
 * ========================================================================== */
(function () {
  'use strict';

  /* ===========================================================================
   * Core: paths and the bookmark list (no page needed)
   * ======================================================================== */
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  // $/_i4u_ + Core = $/_i4u_/Core. Underscores and spaces are kept as they are.
  function joinPath(folder, name) {
    const base = String(folder || '').trim().replace(/\/+$/, '');
    const leaf = String(name || '').trim();
    if (!base) return leaf;
    return leaf ? base + '/' + leaf : base;
  }

  const nameOf = path => String(path || '').split('/').pop();
  const parentOf = path => String(path || '').slice(0, Math.max(0, String(path || '').lastIndexOf('/')));
  const rootOf = path => String(path || '').charAt(0);
  const samePath = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();

  // A saved value: [[key, path], …]. Anything else is dropped.
  function parseBookmarks(value) {
    let parsed;
    try {
      parsed = JSON.parse(value || '[]');
    } catch (_) {
      return [];
    }
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    return parsed
      .map(item => Array.isArray(item) ? { k: String(item[0] || '').toLowerCase(), p: String(item[1] || '') } : null)
      .filter(item => item && GUID.test(item.k) && /^[$@]\/?/.test(item.p) && !seen.has(item.k) && seen.add(item.k));
  }

  const serialise = list => JSON.stringify(list.map(item => [item.k, item.p]));

  // Newest first; a second toggle removes it.
  function toggleIn(list, entry) {
    const key = String(entry.k || '').toLowerCase();
    if (list.some(item => item.k === key)) return list.filter(item => item.k !== key);
    return [{ k: key, p: entry.p }].concat(list);
  }

  // A folder seen at a new path (moved or renamed) keeps its bookmark.
  function renameIn(list, key, path) {
    const lower = String(key || '').toLowerCase();
    let changed = false;
    const next = list.map(item => {
      if (item.k !== lower || item.p === path) return item;
      changed = true;
      return { k: item.k, p: path };
    });
    return changed ? next : list;
  }

  const forRoot = (list, root) => list.filter(item => rootOf(item.p) === root);

  const core = Object.freeze({ joinPath, nameOf, parentOf, rootOf, parseBookmarks, serialise, toggleIn, renameIn, forRoot });
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.UnionSuiteFolderBookmarks) return;

  const ON_PAGE = /\/AsiCommon\/Controls\/IQA\/Default\.aspx$|\/ContentManagement\/ContentDesigner\.aspx$|\/AsiCommon\/Controls\/BSA\/DocumentBrowser\.aspx$/i.test(location.pathname);
  if (!ON_PAGE) return;
  const ON_IQA_BROWSER = /\/AsiCommon\/Controls\/IQA\/Default\.aspx$/i.test(location.pathname);

  /* ===========================================================================
   * Small helpers
   * ======================================================================== */
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const MORPH_MS = 220;
  const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function icon(name) {
    const node = element('i', 'ti ' + name);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  function readLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
  }

  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Convenience only. */ }
  }

  function fold(node, open) {
    if (window.UnionSuiteRecordCards?.fold) return window.UnionSuiteRecordCards.fold(node, open);
    node.hidden = !open;
    return Promise.resolve();
  }

  // Redraws a block and slides its height from the old size to the new one.
  function morph(node, draw) {
    const before = node.getBoundingClientRect().height;
    node.getAnimations?.().forEach(animation => animation.cancel());
    draw();
    if (reducedMotion() || !node.animate || node.hidden) return;
    const after = node.getBoundingClientRect().height;
    if (Math.abs(after - before) < 1) return;
    node.style.overflow = 'hidden';
    node.animate([{ height: before + 'px' }, { height: after + 'px' }], { duration: MORPH_MS, easing: EASE })
      .finished.then(() => { node.style.overflow = ''; }, () => {});
  }

  /* ===========================================================================
   * The native object browser
   * ======================================================================== */
  // One object browser per page. Its controls share an id prefix, such as
  // ctl01_TemplateBody_ObjectBrowser1 or ctl01_TemplateBody_ContentItemBrowser.
  function browserPrefix() {
    const go = document.querySelector('input[id$="_AddressGoButton"]');
    return go ? go.id.slice(0, -'_AddressGoButton'.length) : '';
  }

  const byId = suffix => {
    const prefix = browserPrefix();
    return prefix ? document.getElementById(prefix + suffix) : null;
  };

  // The open folder's path: the tree's selected node, else the address box.
  function currentFolder() {
    const tree = byId('_RadTreeView1');
    try {
      let node = tree && window.$find?.(tree.id)?.get_selectedNode();
      const parts = [];
      while (node && typeof node.get_text === 'function') {
        parts.unshift(node.get_text());
        node = node.get_parent();
      }
      if (parts.length && /^[$@]$/.test(parts[0])) return parts.join('/');
    } catch (_) {
      /* Fall back to the address box. */
    }
    return String(byId('_Address')?.value || '').trim().replace(/\/+$/, '');
  }

  // The open folder's document key, from the tree's selected node.
  function currentKey() {
    const tree = byId('_RadTreeView1');
    try {
      const node = tree && window.$find?.(tree.id)?.get_selectedNode();
      const key = String(node?.get_attributes?.()?.getAttribute?.('DocumentVersionKey') || '').toLowerCase();
      return GUID.test(key) ? key : '';
    } catch (_) {
      return '';
    }
  }

  function treeRoot() {
    const folder = currentFolder();
    return /^[$@]/.test(folder) ? folder.charAt(0) : (ON_IQA_BROWSER ? '$' : '');
  }

  // Goes to a folder as typing it in the address box and pressing Go does.
  function goToFolder(path) {
    const address = byId('_Address');
    const go = byId('_AddressGoButton');
    if (!address || !go) return;
    // The native Quick find filter would hide the new folder's rows.
    const quick = byId('_ObjectQuickFindTextBox');
    if (quick && quick.value) {
      quick.value = '';
      if (typeof window.searchTable === 'function') window.searchTable('');
    }
    address.value = path;
    go.click();
  }

  /* ===========================================================================
   * Saved bookmarks: the user's i4u_UT_UserSettings row
   * ======================================================================== */
  const SETTINGS = { entity: 'i4u_UT_UserSettings', key: 'Folder-Bookmarks', valueLimit: 3999 };
  const CACHE_KEY = 'unionsuite:folder-bookmarks';
  const OPEN_KEY = 'unionsuite:folder-bookmarks:open';

  const scalar = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const property = (name, value) => ({ $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value });
  const readProperty = (row, name) => scalar(row?.Properties?.$values?.find(entry => entry?.Name === name)?.Value);

  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch (_) { return {}; }
  }

  const partyId = () => {
    const context = clientContext();
    return context.isAnonymous ? '' : String(context.loggedInPartyId || '');
  };

  function token() {
    const input = document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]');
    return input ? input.value : '';
  }

  async function api(method, path, body) {
    const response = await fetch(location.origin + '/api/' + path, {
      method,
      credentials: 'same-origin',
      headers: Object.assign({ Accept: 'application/json', RequestVerificationToken: token() }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) throw new Error(method + ' ' + path.split('?')[0] + ' answered ' + response.status);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  const state = {
    list: parseBookmarks(JSON.stringify(readLocal(CACHE_KEY, []))),
    ordinal: null,
    loaded: false,
    error: ''
  };
  let saveTimer = 0;

  function setList(list) {
    state.list = list;
    writeLocal(CACHE_KEY, list.map(item => [item.k, item.p]));
  }

  async function load() {
    const id = partyId();
    if (!id) return;
    try {
      const data = await api('GET', SETTINGS.entity + '?ID=' + encodeURIComponent(id) + '&SettingsKey=' + encodeURIComponent(SETTINGS.key) + '&Limit=20');
      const rows = (data?.Items?.$values || [])
        .map(row => ({ ordinal: Number(readProperty(row, 'Ordinal')), value: readProperty(row, 'Value') }))
        .filter(row => Number.isFinite(row.ordinal))
        .sort((a, b) => a.ordinal - b.ordinal);
      state.ordinal = rows.length ? rows[0].ordinal : null;
      setList(rows.length ? parseBookmarks(rows[0].value) : []);
      state.loaded = true;
    } catch (error) {
      state.error = 'Bookmarks couldn’t be loaded.';
      console.error('[UnionSuiteFolderBookmarks] load', error);
    }
    refresh();
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const id = partyId();
      if (!id) return;
      const value = serialise(state.list);
      if (value.length > SETTINGS.valueLimit) {
        state.error = 'Too many bookmarks to save. Remove some first.';
        refresh();
        return;
      }
      const base = {
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: SETTINGS.entity,
        PrimaryParentEntityTypeName: 'Party',
        Properties: {
          $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts',
          $values: [property('ID', id), property('SettingsKey', SETTINGS.key), property('Value', value)]
        }
      };
      try {
        if (state.ordinal == null) {
          const created = await api('POST', SETTINGS.entity, base);
          const ordinal = Number(readProperty(created, 'Ordinal'));
          if (Number.isFinite(ordinal)) state.ordinal = ordinal;
        } else {
          const collection = items => ({ $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: items });
          base.Identity = { $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts', EntityTypeName: SETTINGS.entity, IdentityElements: collection([id, String(state.ordinal)]) };
          base.PrimaryParentIdentity = { $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts', EntityTypeName: 'Party', IdentityElements: collection([id]) };
          // The row key appears in Identity and in Properties.
          base.Properties.$values.push(property('Ordinal', { $type: 'System.Int32', $value: state.ordinal }));
          await api('PUT', SETTINGS.entity + '/' + encodeURIComponent(id) + '/' + encodeURIComponent(state.ordinal), base);
        }
        if (state.error) {
          state.error = '';
          refresh();
        }
      } catch (error) {
        state.error = 'The last change to bookmarks couldn’t be saved.';
        console.error('[UnionSuiteFolderBookmarks] save', error);
        refresh();
      }
    }, 400);
  }

  const isBookmarked = key => state.list.some(item => item.k === String(key || '').toLowerCase());

  function toggle(entry) {
    if (!GUID.test(entry?.k || '') || !/^[$@]/.test(entry.p || '')) return;
    setList(toggleIn(state.list, entry));
    save();
    refresh();
  }

  /* ===========================================================================
   * Copy path on the list rows
   * ======================================================================== */
  function actionGroup(row) {
    const cell = row.cells[0];
    if (!cell) return null;
    let group = cell.querySelector(':scope > .us-ob-actions');
    if (!group) {
      group = element('span', 'us-ob-actions');
      cell.append(group);
    }
    row.classList.add('us-ob-row');
    return group;
  }

  // Keeps the row's own selection, drag, double-click (open) and keys away.
  function shield(button) {
    ['mousedown', 'pointerdown', 'dblclick', 'keydown'].forEach(type => button.addEventListener(type, event => event.stopPropagation()));
  }

  const rowName = row => row.getAttribute('data-documentname') || row.querySelector('.ObjectBrowserContentListName')?.textContent.trim() || '';

  function rowCopyButton(row) {
    const name = rowName(row);
    // The copy flash lands on the name as shown in the row.
    const label = row.querySelector('.ObjectBrowserContentListName > span') || row.querySelector('.ObjectBrowserContentListName');
    if (!label) return null;
    if (!label.id) label.id = 'us-ob-name-' + row.id.toLowerCase();
    const button = element('button', 'us-copy us-ob-copy');
    button.type = 'button';
    button.title = 'Copy path';
    button.setAttribute('aria-label', 'Copy path of ' + name);
    button.setAttribute('data-us-copy-target', label.id);
    shield(button);
    // Worked out at the click, before US-COPY's listener on the document
    // reads it, so it always names the folder now open.
    button.addEventListener('click', () => {
      button.setAttribute('data-us-copy-text', joinPath(currentFolder(), rowName(row)));
    });
    return button;
  }

  function paintRows() {
    document.querySelectorAll('tr.ObjectBrowserContentItem').forEach(row => {
      if (!GUID.test(row.id)) return;
      const group = actionGroup(row);
      if (!group || group.querySelector(':scope > .us-ob-copy')) return;
      const copy = rowCopyButton(row);
      if (copy) group.prepend(copy);
    });
  }

  /* ===========================================================================
   * Copy path and the bookmark star for the open folder, after Go
   * ======================================================================== */
  function addressTools(address) {
    const tools = element('span', 'us-ob-address-tools');

    const copy = element('button', 'us-copy us-ob-address-copy');
    copy.type = 'button';
    copy.title = 'Copy this folder’s path';
    copy.setAttribute('aria-label', 'Copy this folder’s path');
    // The address box flashes; the open folder's path is what is copied,
    // even if something else has been typed in the box.
    copy.setAttribute('data-us-copy-target', address.id);
    copy.addEventListener('click', () => {
      copy.setAttribute('data-us-copy-text', currentFolder() || address.value);
    });

    const star = element('button', 'us-ob-address-star');
    star.type = 'button';
    star.setAttribute('aria-pressed', 'false');
    star.append(icon('ti-star'));
    star.addEventListener('click', () => {
      const key = currentKey();
      const path = currentFolder();
      if (!key || !path) return;
      // A short pop as the star fills; its colour turns by transition.
      star.classList.remove('us-ob-address-star--pop');
      if (!isBookmarked(key)) {
        void star.offsetWidth;
        star.classList.add('us-ob-address-star--pop');
      }
      toggle({ k: key, p: path });
    });
    star.addEventListener('animationend', () => star.classList.remove('us-ob-address-star--pop'));

    tools.append(copy, star);
    return tools;
  }

  // The address box and Go sit in an update panel that partial postbacks
  // redraw, so the tools are put back after Go whenever they are missing.
  function paintAddress() {
    const address = byId('_Address');
    const go = byId('_AddressGoButton');
    if (!address || !go) return;
    let tools = go.nextElementSibling?.classList.contains('us-ob-address-tools') ? go.nextElementSibling : null;
    if (!tools) {
      tools = addressTools(address);
      go.after(tools);
    }
    const star = tools.querySelector('.us-ob-address-star');

    const key = currentKey();
    const path = currentFolder();
    const on = Boolean(key) && isBookmarked(key);
    const name = nameOf(path) || path;
    star.disabled = !key || !path;
    if (star.getAttribute('aria-pressed') !== String(on) || star.dataset.path !== path) {
      star.setAttribute('aria-pressed', String(on));
      star.dataset.path = path;
      star.title = on ? 'Remove this folder from bookmarks' : 'Bookmark this folder';
      star.setAttribute('aria-label', on ? 'Remove ' + name + ' from bookmarks' : 'Bookmark ' + name);
      star.querySelector('i').className = 'ti ' + (on ? 'ti-star-filled' : 'ti-star');
    }

    // A bookmarked folder seen at a new path (moved or renamed) keeps its
    // bookmark. Only trusted when the tree and the address box agree.
    const typed = String(address.value || '').trim().replace(/\/+$/, '');
    if (on && samePath(path, typed)) {
      const healed = renameIn(state.list, key, path);
      if (healed !== state.list) {
        setList(healed);
        save();
      }
    }
  }

  /* ===========================================================================
   * The Bookmarks pane above the folder tree
   * ======================================================================== */
  let pane = null;
  let body = null;
  let toggleButton = null;
  let countBadge = null;

  function bookmarkItem(entry) {
    const item = element('li', 'us-ob-bookmarks__item');
    item.dataset.key = entry.k;
    const go = element('button', 'us-ob-bookmarks__go');
    go.type = 'button';
    go.title = entry.p;
    go.append(
      icon('ti-folder'),
      element('span', 'us-ob-bookmarks__name', nameOf(entry.p)),
      element('span', 'us-ob-bookmarks__path', parentOf(entry.p))
    );
    if (samePath(entry.p, currentFolder())) go.setAttribute('aria-current', 'location');
    go.addEventListener('click', () => goToFolder(entry.p));

    const remove = element('button', 'us-ob-bookmarks__star');
    remove.type = 'button';
    remove.setAttribute('aria-pressed', 'true');
    remove.setAttribute('aria-label', 'Remove ' + nameOf(entry.p) + ' from bookmarks');
    remove.title = 'Remove bookmark';
    remove.append(icon('ti-star-filled'));
    remove.addEventListener('click', () => {
      // The row folds away first; then the list is drawn without it.
      const next = item.nextElementSibling?.querySelector('button') || item.previousElementSibling?.querySelector('button') || toggleButton;
      fold(item, false).then(() => {
        toggle(entry);
        // Focus stays in the pane rather than falling to the page.
        const again = next && next.isConnected ? next : pane?.querySelector('.us-ob-bookmarks__go') || toggleButton;
        again?.focus({ preventScroll: true });
      });
    });

    item.append(go, remove);
    return item;
  }

  function drawBody() {
    const folders = forRoot(state.list, treeRoot());
    const nodes = [];
    if (folders.length) {
      const list = element('ul', 'us-ob-bookmarks__list');
      folders.forEach(entry => list.append(bookmarkItem(entry)));
      nodes.push(list);
    } else {
      const loaded = state.loaded || readLocal(CACHE_KEY, null) !== null;
      nodes.push(element('p', 'us-ob-bookmarks__empty', loaded
        ? 'Open a folder and choose the star beside Go to keep it here.'
        : 'Loading bookmarks…'));
    }
    if (state.error) nodes.push(element('p', 'us-ob-bookmarks__empty us-ob-bookmarks__empty--warning', state.error));
    body.replaceChildren(...nodes);
    countBadge.textContent = String(folders.length);
    countBadge.hidden = !folders.length;
  }

  // What was drawn last, so an unchanged list is not redrawn.
  let drawn = '';

  function renderPane() {
    if (!pane || !body) return;
    const signature = JSON.stringify([forRoot(state.list, treeRoot()), currentFolder(), state.loaded, state.error]);
    if (signature === drawn) return;
    const first = !drawn;
    drawn = signature;
    if (first) drawBody();
    else morph(body, drawBody);
  }

  function mountPane() {
    const host = document.getElementById('RAD_SPLITTER_PANE_CONTENT_' + browserPrefix() + '_RadPaneTree');
    if (!host || (pane && host.contains(pane))) return;

    pane = element('section', 'us-ob-bookmarks');
    pane.setAttribute('aria-label', 'Bookmarks');
    const open = readLocal(OPEN_KEY, true) !== false;

    toggleButton = element('button', 'us-ob-bookmarks__toggle');
    toggleButton.type = 'button';
    toggleButton.setAttribute('aria-expanded', String(open));
    toggleButton.setAttribute('aria-controls', 'us-ob-bookmarks-body');
    countBadge = element('span', 'us-ob-bookmarks__count');
    toggleButton.append(icon('ti-chevron-down us-ob-bookmarks__chevron'), element('span', 'us-ob-bookmarks__title', 'Bookmarks'), countBadge);

    body = element('div', 'us-ob-bookmarks__body');
    body.id = 'us-ob-bookmarks-body';
    body.hidden = !open;

    toggleButton.addEventListener('click', () => {
      const opening = toggleButton.getAttribute('aria-expanded') !== 'true';
      toggleButton.setAttribute('aria-expanded', String(opening));
      writeLocal(OPEN_KEY, opening);
      fold(body, opening);
    });

    pane.append(toggleButton, body);
    // Outside the tree's update panel, so partial postbacks leave it alone.
    host.prepend(pane);
    drawn = '';
    renderPane();
  }

  /* ===========================================================================
   * Lifecycle
   * ======================================================================== */
  function refresh() {
    mountPane();
    paintRows();
    paintAddress();
    renderPane();
  }

  let queued = false;
  function queueRefresh() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh();
    });
  }

  const OWN = '.us-ob-actions, .us-ob-actions *, .us-ob-address-tools, .us-ob-address-tools *, .us-copy-label, .us-copy-announcement';

  function boot() {
    refresh();
    try {
      window.Sys?.WebForms?.PageRequestManager?.getInstance?.()?.add_endRequest(queueRefresh);
    } catch (_) {
      /* No partial postbacks on this page. */
    }
    // The list, tree and address box change through partial updates.
    const watched = [byId('_ContentListUpdatePanel'), byId('_TreeUpdatePanel'), byId('_AddressUpdatePanel')].filter(Boolean);
    const observer = new MutationObserver(records => {
      // Our own icons and pane are not a reason to redraw.
      if (records.every(record => [...record.addedNodes, ...record.removedNodes].every(node => node.nodeType === 1 && node.matches?.(OWN)))) return;
      queueRefresh();
    });
    (watched.length ? watched : [document.body]).forEach(node => observer.observe(node, { childList: true, subtree: true }));
    load();
  }

  window.UnionSuiteFolderBookmarks = Object.freeze(Object.assign({
    version: '1.1',
    list: () => state.list.slice(),
    isBookmarked,
    toggle,
    currentFolder,
    currentKey,
    refresh
  }, core));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
