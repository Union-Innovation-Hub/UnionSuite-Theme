/* =============================================================================
 * Document finder — window.UnionSuiteDocumentFinder
 * -----------------------------------------------------------------------------
 * Quick find for two of the iMIS document screens built on the native object
 * browser, each set up in SCREENS below:
 *   • the IQA browser (/AsiCommon/Controls/IQA/Default.aspx): queries;
 *   • the content designer (/ContentManagement/ContentDesigner.aspx): content
 *     pages and content folders.
 *
 * The native Quick find box keeps filtering the open folder and also opens a
 * panel:
 *   • typing searches every folder, by name or path;
 *   • with the box empty it shows Favourites, Recently opened and Recent
 *     searches;
 *   • a query or page goes to its folder (selecting it there) or opens in its
 *     editor, and has a star; a folder goes to that folder.
 * Only queries and pages are starred here. Folders are bookmarked with the
 * star after Go (ObjectBrowser-Bookmarks.js), and list rows have no star
 * (owner, 5 November 2026). Favourites are saved to the user's
 * i4u_UT_UserSettings row (SettingsKey IQA-Favourites or Content-Favourites),
 * so they follow the user; recent opens and searches stay in this browser.
 *
 * In each screen's editor (the IQA designer, /QueryBuilder/Design.aspx, and
 * the content editor, /ContentManagement/ContentDesigner/ContentRecordEdit.aspx)
 * it only records the open document as recently opened, however it was
 * opened.
 *
 * Searching runs the screen's search IQA through /api/query with its
 * "Document Path contains" filter set to the longest word typed; the rows
 * that come back are ranked here by every word. Favourites and recent items
 * are named from what searches return, or looked up by key.
 *
 * Renamed from IQA-Finder.js (window.UnionSuiteIqaFinder) on 5 November 2026,
 * when it took on the content designer. The IQA browser keeps its old
 * browser storage keys, so its recent lists carry over.
 *
 * The search functions need no page; tools/test-document-finder.cjs loads
 * this file in Node.
 * ========================================================================== */
(function () {
  'use strict';

  /* ===========================================================================
   * Core: search (no page needed)
   * ======================================================================== */
  const fold = text => String(text || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');
  const tokens = query => fold(query).split(/[\s/_\-.]+/).filter(Boolean);

  // Every word must appear in the name or the path. Names beat paths, a
  // whole-name match beats a start, a start beats anywhere.
  function score(entry, words, phrase) {
    const name = fold(entry.n), path = fold(entry.p);
    let total = 0;
    for (const word of words) {
      if (name === word) total += 100;
      else if (name.startsWith(word)) total += 60;
      else if (new RegExp('(^|[\\s_\\-.])' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(name)) total += 40;
      else if (name.includes(word)) total += 25;
      else if (path.includes(word)) total += 8;
      else return 0;
    }
    if (phrase && name === phrase) total += 200;
    else if (phrase && name.includes(phrase)) total += 30;
    return total;
  }

  function search(entries, query, limit = 40) {
    const words = tokens(query);
    if (!words.length) return [];
    const phrase = fold(query).trim();
    return entries
      .map(entry => ({ entry, score: score(entry, words, phrase) }))
      .filter(match => match.score > 0)
      .sort((a, b) => b.score - a.score || a.entry.n.localeCompare(b.entry.n) || a.entry.p.localeCompare(b.entry.p))
      .slice(0, limit)
      .map(match => match.entry);
  }

  const folderOf = path => String(path || '').slice(0, String(path || '').lastIndexOf('/'));

  // The word the server filters on: the longest, so the fewest rows come back.
  const serverTerm = query => tokens(query).sort((a, b) => b.length - a.length)[0] || '';

  // A search row's document type: CFL (content folder) and FOL (folder) are
  // folders; Content, CON, IQD and anything else are documents.
  const isFolderType = type => /^(CFL|FOL)$/i.test(String(type || '').trim());

  const core = Object.freeze({ fold, tokens, score, search, folderOf, serverTerm, isFolderType });
  if (typeof module === 'object' && module.exports) module.exports = core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.UnionSuiteDocumentFinder) return;

  /* ===========================================================================
   * Screens
   * ======================================================================== */
  const SCREENS = [
    {
      id: 'iqa',
      browser: /\/AsiCommon\/Controls\/IQA\/Default\.aspx$/i,
      editor: /\/QueryBuilder\/Design\.aspx$/i,
      // Document Type Code IQD, an optional "Document Path contains" filter,
      // and Document Version Key, Document Name, Document Path and Updated
      // On (owner, 12 October 2026).
      query: '$/_i4u_/Core/Admin/Query Search - IQA Document Tree Taskbar',
      // The keys from before the rename, so recent lists carry over.
      storage: 'unionsuite:iqa-finder',
      favouritesKey: 'IQA-Favourites',
      editorUrl: '/iMIS/QueryBuilder/Design.aspx?iMode=Edit&TemplateType=E&iUniformKey={key}&iOperation=Edit&DocumentTypeCode=IQD&IsPopup=true',
      editorTitle: 'Edit IQA',
      // The designer's Summary tab shows the path.
      editorPath: () => document.querySelector('span[id$="_QueryPath"]')?.textContent.trim() || '',
      text: {
        placeholder: 'Quick find, or search all queries',
        region: 'Search all queries',
        go: 'Go to this query in its folder',
        open: 'Open in the designer',
        noMatch: 'No query names or paths match',
        favouritesEmpty: 'Star a query to keep it here.',
        openedEmpty: 'Queries you open in the designer appear here.'
      },
      icon: 'ti-file-search'
    },
    {
      id: 'content',
      browser: /\/ContentManagement\/ContentDesigner\.aspx$/i,
      editor: /\/ContentManagement\/ContentDesigner\/ContentRecordEdit\.aspx$/i,
      // Content pages and content folders, with the same filter and columns
      // as the query search plus DocumentType: Content for a page, CFL for a
      // folder (owner, 5 November 2026).
      query: '$/_i4u_/Core/Admin/Content Search - CON Document Tree Taskbar',
      storage: 'unionsuite:content-finder',
      favouritesKey: 'Content-Favourites',
      // As the taskbar opens a content page.
      editorUrl: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iUniformKey={key}&iOperation=Edit&TemplateType=E&DocumentTypeCode=CON&IsPopup=true',
      editorTitle: 'Edit Content Page',
      editorPath: () => '',
      text: {
        placeholder: 'Quick find, or search all pages',
        region: 'Search all pages and folders',
        go: 'Go to this page in its folder',
        open: 'Open in the content editor',
        noMatch: 'No page or folder names or paths match',
        favouritesEmpty: 'Star a page to keep it here.',
        openedEmpty: 'Pages you open in the content editor appear here.'
      },
      icon: 'ti-file-text'
    }
  ];

  const SCREEN = SCREENS.find(screen => screen.browser.test(location.pathname) || screen.editor.test(location.pathname));
  if (!SCREEN) return;
  const ON_BROWSER = SCREEN.browser.test(location.pathname);
  const TEXT = SCREEN.text;

  /* ===========================================================================
   * Browser storage: recent opens and searches
   * ======================================================================== */
  const OPENED_KEY = SCREEN.storage + ':opened';
  const SEARCHES_KEY = SCREEN.storage + ':searches';
  const NAMES_KEY = SCREEN.storage + ':names';
  const FILTER_KEY = SCREEN.storage + ':filter';
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function readLocal(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch (_) { return fallback; }
  }

  function writeLocal(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) { /* Convenience only. */ }
  }

  function rememberOpened(key) {
    if (!GUID.test(key || '')) return;
    const lower = key.toLowerCase();
    const list = readLocal(OPENED_KEY, []).filter(item => item.k !== lower);
    list.unshift({ k: lower, t: Date.now() });
    writeLocal(OPENED_KEY, list.slice(0, 12));
  }

  function rememberSearch(text) {
    const term = String(text || '').trim();
    if (term.length < 2) return;
    const list = readLocal(SEARCHES_KEY, []).filter(item => item.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    writeLocal(SEARCHES_KEY, list.slice(0, 6));
  }

  // Names, paths and folder flags of documents seen, so favourites and recent
  // items can be shown without asking the server. The 400 most recent are
  // kept, as [name, path, time, folder].
  function rememberNames(entries) {
    const names = readLocal(NAMES_KEY, {});
    entries.forEach(entry => { if (entry?.k && entry.p) names[entry.k] = [entry.n, entry.p, Date.now(), entry.f ? 1 : 0]; });
    writeLocal(NAMES_KEY, Object.fromEntries(Object.entries(names).sort((a, b) => b[1][2] - a[1][2]).slice(0, 400)));
  }

  function knownEntry(key) {
    const known = readLocal(NAMES_KEY, {})[key];
    return known ? { k: key, n: known[0], p: known[1], f: Boolean(known[3]) } : null;
  }

  // An editor only records what is open.
  if (!ON_BROWSER) {
    const params = new Map([...new URLSearchParams(location.search)].map(([name, value]) => [name.toLowerCase(), value]));
    const newDocument = /^(new|add|create)$/i.test(params.get('imode') || '') || /^(new|add|create)$/i.test(params.get('ioperation') || '');
    const key = String(params.get('iuniformkey') || '').toLowerCase();
    if (!newDocument && GUID.test(key)) {
      rememberOpened(key);
      // Name it from the editor's own path when it shows one.
      const name = () => {
        const path = SCREEN.editorPath();
        if (/^[$@]\//.test(path)) rememberNames([{ k: key, n: path.split('/').pop(), p: path }]);
      };
      if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', name, { once: true });
      else name();
    }
    window.UnionSuiteDocumentFinder = Object.freeze(Object.assign({ version: '2.0', screen: SCREEN.id }, core));
    return;
  }

  /* ===========================================================================
   * Requests
   * ======================================================================== */
  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch (_) { return {}; }
  }

  function token() {
    const field = document.getElementById('__RequestVerificationToken') || document.querySelector('input[name="__RequestVerificationToken"]');
    return field ? field.value : '';
  }

  async function api(method, path, body, signal) {
    const response = await fetch(location.origin + '/api/' + path, {
      method,
      credentials: 'same-origin',
      signal,
      headers: Object.assign({ Accept: 'application/json', RequestVerificationToken: token() }, body ? { 'Content-Type': 'application/json' } : {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!response.ok) {
      const error = new Error(method + ' ' + path.split('?')[0] + ' answered ' + response.status);
      error.status = response.status;
      throw error;
    }
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  // Pages under the active website, as the taskbar opens them.
  function websiteUrl(path) {
    try {
      const root = new URL(clientContext().websiteRoot || '/', location.href);
      root.pathname = root.pathname.replace(/\/?$/, '/');
      root.search = '';
      root.hash = '';
      return new URL(path.replace(/^\/+/, ''), root).href;
    } catch (_) {
      return path;
    }
  }

  const scalar = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const field = (row, ...names) => {
    for (const name of names) {
      const value = scalar(row?.[name]);
      if (value != null && value !== '') return value;
    }
    return '';
  };
  const statusText = row => {
    const status = row?.Status;
    return typeof status === 'object' && status ? String(status.Name || status.Description || status.$value || '') : String(status ?? '');
  };

  // Working documents report a truncated Path (folder and trailing slash).
  function pathOf(row) {
    const path = String(field(row, 'Path'));
    if (path && !path.endsWith('/')) return path;
    const folder = String(field(row, 'FolderPath') || path).replace(/\/+$/, '');
    const name = String(field(row, 'Name'));
    return folder && name ? folder + '/' + name : path;
  }

  // The object browser's controls share an id prefix, such as
  // ctl01_TemplateBody_ObjectBrowser1 or ctl01_TemplateBody_ContentItemBrowser.
  const byId = suffix => {
    const go = document.querySelector('input[id$="_AddressGoButton"]');
    return go ? document.getElementById(go.id.slice(0, -'_AddressGoButton'.length) + suffix) : null;
  };

  /* ===========================================================================
   * Searching: the screen's search IQA, on the server
   * ======================================================================== */
  const SERVER_LIMIT = 200;

  // The filter's name for /api/query, from QueryParameterDefinition once:
  // its property name, then its prompt; DocumentPath if that lookup fails.
  // The name that works is remembered.
  let filterNames = null;
  async function filterCandidates() {
    if (filterNames) return filterNames;
    const found = [readLocal(FILTER_KEY, '')];
    try {
      const data = await api('GET', 'QueryParameterDefinition?QueryPath=' + encodeURIComponent(SCREEN.query));
      const prompts = data?.Items?.$values ?? data?.$values ?? (Array.isArray(data?.Items) ? data.Items : []);
      const prompt = prompts.find(each => /path/i.test(String(each?.PropertyName || each?.Prompt || ''))) || prompts[0];
      [prompt?.PropertyName, prompt?.Prompt].filter(Boolean).forEach(name => found.push(String(name), String(name).replace(/\s+/g, '')));
    } catch (_) {
      /* Fall back to the usual name. */
    }
    filterNames = [...new Set(found.concat('DocumentPath').filter(Boolean))];
    return filterNames;
  }

  // /api/query rows are keyed by column name or caption.
  function entryFromRow(row) {
    const key = String(field(row, 'DocumentVersionKey', 'Document Version Key', 'DocumentVersionId')).toLowerCase();
    const path = String(field(row, 'DocumentPath', 'Document Path', 'Path'));
    const name = String(field(row, 'DocumentName', 'Document Name', 'Name') || path.split('/').pop());
    const folder = isFolderType(field(row, 'DocumentType', 'Document Type', 'DocumentTypeCode', 'Document Type Code'));
    return GUID.test(key) && /^[$@]\//.test(path) ? { k: key, n: name, p: path, f: folder } : null;
  }

  async function searchServer(text, signal) {
    const term = serverTerm(text);
    if (!term) return [];
    let lastError = null;
    for (const name of await filterCandidates()) {
      const params = new URLSearchParams({ QueryName: SCREEN.query, limit: String(SERVER_LIMIT) });
      params.set(name, term);
      try {
        const data = await api('GET', 'query?' + params, undefined, signal);
        writeLocal(FILTER_KEY, name);
        filterNames = [name];
        const rows = data?.Items?.$values ?? (Array.isArray(data?.Items) ? data.Items : []);
        const entries = rows.map(entryFromRow).filter(Boolean);
        rememberNames(entries);
        return search(entries, text);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        lastError = error;
        // Only a wrong filter name is worth another try.
        if (error.status !== 400) break;
      }
    }
    throw lastError || new Error('The search query is unavailable');
  }

  // Favourites and recent items not yet named in this browser (starred on
  // another computer, say) are looked up by key, once each.
  const lookups = new Map();
  function resolveMissing(keys) {
    const missing = keys.filter(key => !knownEntry(key) && !lookups.has(key));
    if (!missing.length) return;
    missing.forEach(key => lookups.set(key, api('GET', 'DocumentSummary?DocumentVersionId=' + encodeURIComponent(key) + '&Limit=5')
      .then(data => {
        const row = (data?.Items?.$values || []).find(each => !/archiv|recycl|delet/i.test(statusText(each)));
        if (row) rememberNames([{ k: key, n: String(field(row, 'AlternateName', 'Name')), p: pathOf(row) }]);
      })
      .catch(() => {})));
    Promise.all(missing.map(key => lookups.get(key))).then(() => {
      if (panel && !panel.hidden && !input.value.trim()) renderPanel();
    });
  }

  /* ===========================================================================
   * Favourites: the user's i4u_UT_UserSettings row
   * ======================================================================== */
  const SETTINGS = { entity: 'i4u_UT_UserSettings', key: SCREEN.favouritesKey, valueLimit: 3999 };
  const property = (name, value) => ({ $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value });
  const readProperty = (row, name) => scalar(row?.Properties?.$values?.find(entry => entry?.Name === name)?.Value);
  const partyId = () => {
    const context = clientContext();
    return context.isAnonymous ? '' : String(context.loggedInPartyId || '');
  };

  const favourites = { keys: [], ordinal: null, loaded: false, error: '' };
  let saveTimer = 0;

  async function loadFavourites() {
    const id = partyId();
    if (!id) return;
    try {
      const data = await api('GET', SETTINGS.entity + '?ID=' + encodeURIComponent(id) + '&SettingsKey=' + encodeURIComponent(SETTINGS.key) + '&Limit=20');
      const rows = (data?.Items?.$values || [])
        .map(row => ({ ordinal: Number(readProperty(row, 'Ordinal')), value: readProperty(row, 'Value') }))
        .filter(row => Number.isFinite(row.ordinal))
        .sort((a, b) => a.ordinal - b.ordinal);
      if (rows.length) {
        favourites.ordinal = rows[0].ordinal;
        try {
          const parsed = JSON.parse(rows[0].value || '[]');
          favourites.keys = Array.isArray(parsed) ? parsed.filter(key => GUID.test(key)).map(key => key.toLowerCase()) : [];
        } catch (_) {
          favourites.keys = [];
        }
      }
      favourites.loaded = true;
    } catch (error) {
      favourites.error = 'Favourites couldn’t be loaded.';
      console.error('[UnionSuiteDocumentFinder] favourites', error);
    }
    if (panel && !panel.hidden) renderPanel();
  }

  function saveFavourites() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const id = partyId();
      const value = JSON.stringify(favourites.keys);
      if (!id) return;
      if (value.length > SETTINGS.valueLimit) {
        favourites.error = 'Too many favourites to save. Remove some first.';
        if (panel && !panel.hidden) renderPanel();
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
        if (favourites.ordinal == null) {
          const created = await api('POST', SETTINGS.entity, base);
          const ordinal = Number(readProperty(created, 'Ordinal'));
          if (Number.isFinite(ordinal)) favourites.ordinal = ordinal;
        } else {
          const collection = items => ({ $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: items });
          base.Identity = { $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts', EntityTypeName: SETTINGS.entity, IdentityElements: collection([id, String(favourites.ordinal)]) };
          base.PrimaryParentIdentity = { $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts', EntityTypeName: 'Party', IdentityElements: collection([id]) };
          // The row key appears in Identity and in Properties.
          base.Properties.$values.push(property('Ordinal', { $type: 'System.Int32', $value: favourites.ordinal }));
          await api('PUT', SETTINGS.entity + '/' + encodeURIComponent(id) + '/' + encodeURIComponent(favourites.ordinal), base);
        }
        favourites.error = '';
      } catch (error) {
        favourites.error = 'The last change to favourites couldn’t be saved.';
        console.error('[UnionSuiteDocumentFinder] favourites', error);
      }
      if (panel && !panel.hidden) renderPanel();
    }, 400);
  }

  const isFavourite = key => favourites.keys.includes(String(key || '').toLowerCase());

  function toggleFavourite(key) {
    const lower = String(key || '').toLowerCase();
    if (!GUID.test(lower)) return;
    // Starring from the panel redraws it; the star keeps keyboard focus.
    const refocus = panel && panel.contains(document.activeElement) && document.activeElement.dataset.key === lower;
    favourites.keys = isFavourite(lower) ? favourites.keys.filter(each => each !== lower) : [lower].concat(favourites.keys);
    saveFavourites();
    if (panel && !panel.hidden) renderPanel();
    if (refocus) panel.querySelector('.us-doc-finder__star[data-key="' + lower + '"]')?.focus();
  }

  /* ===========================================================================
   * Actions: go to a document's folder or a folder, open in the editor
   * ======================================================================== */
  let pendingSelect = null;

  function clearQuickFind() {
    // The native Quick find filter would hide the row we are going to.
    if (!input) return;
    input.value = '';
    if (typeof window.searchTable === 'function') window.searchTable('');
  }

  function goTo(entry) {
    if (entry.f) { goToPath(entry.p); return; }
    const address = byId('_Address');
    const go = byId('_AddressGoButton');
    if (!address || !go) return;
    rememberSearch(input?.value);
    clearQuickFind();
    closePanel();
    pendingSelect = entry.k;
    const folder = folderOf(entry.p);
    if (address.value.replace(/\/+$/, '').toLowerCase() === folder.toLowerCase() && selectRow(entry.k)) return;
    address.value = folder;
    go.click();
  }

  // A pasted or typed path: a folder opens as the address box and Go would;
  // a document's own path opens its folder with the document selected.
  function pathTarget(text) {
    const path = String(text || '').trim().replace(/\/+$/, '');
    return /^[$@]\/./.test(path) ? path : '';
  }

  function goToPath(path) {
    const exact = (searchState.results || []).find(entry => !entry.f && entry.p.toLowerCase() === path.toLowerCase());
    if (exact) { goTo(exact); return; }
    const address = byId('_Address');
    const go = byId('_AddressGoButton');
    if (!address || !go) return;
    rememberSearch(input?.value);
    clearQuickFind();
    closePanel();
    address.value = path;
    go.click();
  }

  // Selects a row as a click would, so the summary pane follows.
  function selectRow(key) {
    const row = document.getElementById(key) || [...document.querySelectorAll('tr.ObjectBrowserContentItem')].find(each => each.id.toLowerCase() === key);
    if (!row) return false;
    pendingSelect = null;
    row.scrollIntoView({ block: 'nearest' });
    // The native list starts a drag on mousedown and ends it on mouseup, so
    // a selection made for the user releases at once, at the row.
    const box = row.getBoundingClientRect();
    const at = { bubbles: true, cancelable: true, button: 0, view: window, clientX: box.left + 12, clientY: box.top + box.height / 2 };
    row.dispatchEvent(new MouseEvent('mousedown', { ...at, buttons: 1 }));
    row.dispatchEvent(new MouseEvent('mouseup', { ...at, buttons: 0 }));
    row.focus({ preventScroll: true });
    return true;
  }

  function openInEditor(entry) {
    rememberSearch(input?.value);
    rememberOpened(entry.k);
    closePanel();
    const url = websiteUrl(SCREEN.editorUrl.replace('{key}', encodeURIComponent(entry.k)));
    if (typeof window.ShowDialog_NoReturnValue === 'function') window.ShowDialog_NoReturnValue(url, null, '95%', '95%', SCREEN.editorTitle, null, 'E');
    else window.open(url, '_blank', 'noopener');
  }

  /* ===========================================================================
   * Stars on the panel's results
   * ======================================================================== */
  function starButton(key, name) {
    const on = isFavourite(key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-doc-finder__star';
    button.dataset.key = String(key).toLowerCase();
    button.setAttribute('aria-pressed', String(on));
    button.setAttribute('aria-label', (on ? 'Remove ' : 'Add ') + name + (on ? ' from favourites' : ' to favourites'));
    button.title = on ? 'Remove from favourites' : 'Add to favourites';
    const icon = document.createElement('i');
    icon.className = 'ti ' + (on ? 'ti-star-filled' : 'ti-star');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon);
    button.addEventListener('click', event => {
      event.stopPropagation();
      event.preventDefault();
      toggleFavourite(key);
    });
    return button;
  }

  /* ===========================================================================
   * The panel under Quick find
   * ======================================================================== */
  let input = null;
  let panel = null;
  const searchState = { text: '', results: null, error: '', pending: false };
  let searchTimer = 0;
  let searchAbort = null;
  let searchCount = 0;

  // Typing waits a quarter of a second; a newer search cancels an older one.
  function scheduleSearch() {
    clearTimeout(searchTimer);
    const text = input.value.trim();
    if (!text) {
      searchAbort?.abort();
      Object.assign(searchState, { text: '', results: null, error: '', pending: false });
      renderPanel();
      return;
    }
    searchTimer = setTimeout(() => runSearch(text), 250);
  }

  async function runSearch(text) {
    searchAbort?.abort();
    const abort = new AbortController();
    searchAbort = abort;
    const count = ++searchCount;
    searchState.pending = true;
    searchState.error = '';
    renderPanel();
    try {
      const results = await searchServer(text, abort.signal);
      if (count !== searchCount) return;
      Object.assign(searchState, { text, results, pending: false });
    } catch (error) {
      if (error.name === 'AbortError' || count !== searchCount) return;
      Object.assign(searchState, { text, results: null, error: error.message, pending: false });
    }
    renderPanel();
  }

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

  // A document: go to it in its folder, star it, open it. A folder: go into
  // it (folders are bookmarked with the star after Go).
  function resultItem(entry) {
    const item = element('li', 'us-doc-finder__item');
    const go = element('button', 'us-doc-finder__go');
    go.type = 'button';
    if (entry.f) {
      go.title = 'Go to this folder';
      go.append(icon('ti-folder'), element('span', 'us-doc-finder__name', entry.n), element('span', 'us-doc-finder__path', folderOf(entry.p)));
      go.addEventListener('click', () => goTo(entry));
      item.append(go);
      return item;
    }
    go.title = TEXT.go;
    go.append(icon(SCREEN.icon), element('span', 'us-doc-finder__name', entry.n), element('span', 'us-doc-finder__path', folderOf(entry.p)));
    go.addEventListener('click', () => goTo(entry));
    const open = element('button', 'us-doc-finder__open');
    open.type = 'button';
    open.title = TEXT.open;
    open.setAttribute('aria-label', TEXT.open + ': ' + entry.n);
    open.append(icon('ti-pencil'));
    open.addEventListener('click', () => openInEditor(entry));
    item.append(go, starButton(entry.k, entry.n), open);
    return item;
  }

  function section(title, entries, emptyText) {
    const block = element('section', 'us-doc-finder__section');
    block.append(element('h3', 'us-doc-finder__heading', title));
    if (!entries.length) {
      block.append(element('p', 'us-doc-finder__empty', emptyText));
      return block;
    }
    const list = element('ul', 'us-doc-finder__list');
    entries.forEach(entry => list.append(resultItem(entry)));
    block.append(list);
    return block;
  }

  function locationSection(path) {
    const block = element('section', 'us-doc-finder__section');
    block.append(element('h3', 'us-doc-finder__heading', 'Location'));
    const list = element('ul', 'us-doc-finder__list');
    const item = element('li', 'us-doc-finder__item');
    const go = element('button', 'us-doc-finder__go');
    go.type = 'button';
    go.append(icon('ti-folder'), element('span', 'us-doc-finder__name', 'Go to this location'), element('span', 'us-doc-finder__path', path));
    go.addEventListener('click', () => goToPath(path));
    item.append(go);
    list.append(item);
    block.append(list);
    return block;
  }

  function renderPanel() {
    if (!panel) return;
    const query = input.value.trim();
    const body = element('div', 'us-doc-finder__body');

    if (query) {
      const found = searchState.results;
      const path = pathTarget(query);
      if (path) body.append(locationSection(path));
      if (searchState.pending) {
        // As the taskbar's quick search: the spinning circles in place of
        // the results until the new ones arrive.
        const status = element('p', 'us-doc-finder__status us-doc-finder__loading', 'Searching…');
        status.setAttribute('role', 'status');
        const spinner = element('span', 'section-loader-spinning-circles');
        spinner.setAttribute('aria-hidden', 'true');
        status.prepend(spinner);
        body.append(status);
      } else if (searchState.error) {
        body.append(element('p', 'us-doc-finder__status us-doc-finder__status--warning', 'The search couldn’t run. ' + searchState.error));
      } else if (found) {
        body.append(section(found.length ? 'All folders · ' + found.length + (found.length === 40 ? '+' : '') + ' found' : 'All folders',
          found, TEXT.noMatch + ' “' + searchState.text + '”.'));
      }
    } else {
      const openedKeys = readLocal(OPENED_KEY, []).map(item => item.k);
      resolveMissing(favourites.keys.concat(openedKeys));
      const favouriteEntries = favourites.keys.map(knownEntry).filter(Boolean);
      body.append(section('Favourites', favouriteEntries,
        favourites.loaded ? TEXT.favouritesEmpty : 'Loading favourites…'));
      const opened = openedKeys.map(knownEntry).filter(Boolean).slice(0, 8);
      body.append(section('Recently opened', opened, TEXT.openedEmpty));
      const searches = readLocal(SEARCHES_KEY, []);
      if (searches.length) {
        const block = element('section', 'us-doc-finder__section');
        block.append(element('h3', 'us-doc-finder__heading', 'Recent searches'));
        const list = element('ul', 'us-doc-finder__list');
        searches.forEach(term => {
          const item = element('li', 'us-doc-finder__item');
          const chip = element('button', 'us-doc-finder__search');
          chip.type = 'button';
          chip.append(icon('ti-history'), element('span', 'us-doc-finder__term', term));
          chip.addEventListener('click', () => {
            input.value = term;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof window.searchTable === 'function') window.searchTable(term);
            input.focus();
          });
          item.append(chip);
          list.append(item);
        });
        block.append(list);
        body.append(block);
      }
    }
    if (favourites.error) body.append(element('p', 'us-doc-finder__status us-doc-finder__status--warning', favourites.error));
    panel.replaceChildren(body);
  }

  function openPanel() {
    if (!panel || !panel.hidden) return;
    renderPanel();
    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  // Arrow keys move through the panel's buttons, in order.
  function moveFocus(step) {
    const buttons = [...panel.querySelectorAll('button')];
    if (!buttons.length) return;
    const at = buttons.indexOf(document.activeElement);
    const next = at === -1 ? (step > 0 ? 0 : buttons.length - 1) : at + step;
    if (next < 0) { input.focus(); return; }
    buttons[Math.min(next, buttons.length - 1)].focus();
  }

  function mount() {
    const found = byId('_ObjectQuickFindTextBox') || document.querySelector('[id$="_ObjectQuickFindTextBox"]');
    if (!found || found === input) return;
    input = found;
    const wrapper = input.closest('.QuickFindWrapper') || input.parentElement;
    wrapper.classList.add('us-doc-finder-host');
    input.placeholder = TEXT.placeholder;
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-controls', 'us-doc-finder');
    input.setAttribute('aria-haspopup', 'true');
    panel = element('div', 'us-doc-finder');
    panel.id = 'us-doc-finder';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', TEXT.region);
    panel.hidden = true;
    wrapper.append(panel);

    input.addEventListener('focus', openPanel);
    input.addEventListener('click', openPanel);
    input.addEventListener('input', () => {
      openPanel();
      scheduleSearch();
    });
    input.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); openPanel(); moveFocus(1); }
      else if (event.key === 'Escape') { closePanel(); }
      else if (event.key === 'Enter') {
        // Enter goes to the best match rather than submitting the page.
        event.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        // A path goes to that location; other text to the best match.
        const go = () => {
          if (pathTarget(text)) goToPath(pathTarget(text));
          else if (searchState.text === text && searchState.results?.[0]) goTo(searchState.results[0]);
        };
        if (searchState.text === text && !searchState.pending) go();
        else { clearTimeout(searchTimer); runSearch(text).then(go); }
      }
    });
    panel.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); moveFocus(1); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); moveFocus(-1); }
      else if (event.key === 'Escape') { event.preventDefault(); closePanel(); input.focus(); }
    });
    document.addEventListener('mousedown', event => {
      if (!panel.hidden && !wrapper.contains(event.target)) closePanel();
    });
    document.addEventListener('focusin', event => {
      if (!panel.hidden && !wrapper.contains(event.target)) closePanel();
    });
  }

  function afterPostback() {
    mount();
    if (pendingSelect) selectRow(pendingSelect);
  }

  function boot() {
    mount();
    try {
      window.Sys?.WebForms?.PageRequestManager?.getInstance?.()?.add_endRequest(afterPostback);
    } catch (_) {
      /* No partial postbacks on this page. */
    }
    loadFavourites();
    // Opens recorded in the editor popup show at once.
    window.addEventListener('storage', event => {
      if (event.key === OPENED_KEY && panel && !panel.hidden) renderPanel();
    });
  }

  window.UnionSuiteDocumentFinder = Object.freeze(Object.assign({
    version: '2.0',
    screen: SCREEN.id,
    find: text => searchServer(text),
    favourites: () => favourites.keys.slice()
  }, core));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
