/* =============================================================================
 * IQA where used — window.UnionSuiteWhereUsed
 * -----------------------------------------------------------------------------
 * A "Show Usage" button in the IQA designer header opens a drawer listing
 * everything that uses the open IQA: content pages, business object and
 * panel source value lists, communication templates, alerts and Process
 * Automation, other IQAs and the UnionSuite theme's own scripts.
 *
 * The answer comes from one shared index, built by reading every one of
 * those places and stored gzip-compressed in i4u_UT_Configuration.Payload
 * (Module System, Category IQA, Code WhereUsedIndex). Anyone who can save
 * an IQA can rebuild it. A lookup reads the stored index and matches the
 * open IQA's path, its two keys and its folder.
 *
 * Research, decisions and the build plan:
 * prototypes/wip/iqa-where-used/README.md and BUILD-PLAN.md.
 *
 * The extraction and lookup functions below need no page; the test
 * tools/test-where-used.cjs loads this file in Node and uses them.
 * ========================================================================== */
(function () {
  'use strict';

  /* ===========================================================================
   * Core: extraction, index and lookup (no page needed)
   * ======================================================================== */
  const FORMAT = 'unionsuite-where-used';
  const VERSION = 1;
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const NULL_GUID = '00000000-0000-0000-0000-000000000000';

  // The places the index reads, in drawer order.
  const SOURCES = [
    { id: 'CON', name: 'Content pages', icon: 'ti-file-text' },
    { id: 'BOD', name: 'Business object value lists', icon: 'ti-database' },
    { id: 'BOE', name: 'Panel source value lists', icon: 'ti-table' },
    { id: 'COM', name: 'Communication templates', icon: 'ti-mail' },
    { id: 'TASK', name: 'Alerts and Process Automation', icon: 'ti-bolt' },
    { id: 'IQD', name: 'Other IQAs', icon: 'ti-file-search' },
    { id: 'THEME', name: 'UnionSuite theme', icon: 'ti-palette' }
  ];

  // Top-level folders supplied by ASI. Their contents are in the index and
  // shown only when the user includes ASI system content.
  const SYSTEM_FOLDERS = ['$/samples', '$/common', '$/contactmanagement', '$/fundraising', '@/icore', '@/isamples'];

  const normalPath = value => String(value || '').trim().replace(/\/+$/, '').toLowerCase();

  function isSystemPath(path) {
    const lower = normalPath(path);
    return SYSTEM_FOLDERS.some(folder => lower === folder || lower.startsWith(folder + '/'));
  }

  function parentFolder(path) {
    const lower = normalPath(path);
    const cut = lower.lastIndexOf('/');
    return cut > 1 ? lower.slice(0, cut) : '';
  }

  const xmlUnescape = value => String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const localName = tag => String(tag || '').replace(/^[A-Za-z_][\w.-]*:/, '');

  /* ---- candidate values --------------------------------------------------- */

  // $/ paths written inside a longer value: an HTML attribute in Content
  // HTML, a quoted string in a script, a query string, or URL-encoded.
  const QUOTED_PATH = /(["'`])(\$\/[^"'`<>\r\n]{1,300}?)\1/g;
  const QUERY_PATH = /[?&][\w.-]+=(\$\/[^"'`&<>\r\n]{1,300})/g;
  const ENCODED_PATH = /%24%2F[^"'`<>\s&]{1,600}/gi;

  function embeddedPaths(text) {
    const found = new Set();
    let match;
    QUOTED_PATH.lastIndex = 0;
    while ((match = QUOTED_PATH.exec(text))) found.add(normalPath(match[2]));
    QUERY_PATH.lastIndex = 0;
    while ((match = QUERY_PATH.exec(text))) found.add(normalPath(match[1]));
    ENCODED_PATH.lastIndex = 0;
    while ((match = ENCODED_PATH.exec(text))) {
      try {
        const decoded = decodeURIComponent(match[0].replace(/\+/g, ' '));
        if (decoded.startsWith('$/')) found.add(normalPath(decoded));
      } catch (_) {
        /* Not a whole encoded path. */
      }
    }
    return [...found].filter(path => path.length > 2);
  }

  // Calls emit(identifier, isKey) for each reference a value holds. Keys are
  // kept only if they turn out to belong to an IQA (see createIndex).
  function visitValue(value, emit) {
    const text = String(value || '').trim();
    if (!text) return;
    if (/^\$\/\S/.test(text) && !/[\r\n\t<>"]/.test(text) && text.length < 400) {
      emit(normalPath(text), false);
      return;
    }
    if (GUID.test(text)) {
      if (text.toLowerCase() !== NULL_GUID) emit(text.toLowerCase(), true);
      return;
    }
    if (text.length > 4 && (text.includes('$/') || /%24%2f/i.test(text))) {
      embeddedPaths(text).forEach(path => emit(path, false));
    }
  }

  /* ---- XML: content pages, business objects, communication templates ----- */

  const TEXT_ELEMENT = /<(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b[^>]*>([^<]+)<\/(?:[A-Za-z_][\w.-]*:)?\1\s*>/g;
  const OPEN_TAG = /<([A-Za-z_][\w.:-]*)\b([^<>]*?)\/?>/g;
  const ATTRIBUTE = /\s((?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*)\s*=\s*(["'])([^"']*)\2/g;
  const CONTENT_ITEM_OPEN = /<(?:[A-Za-z_][\w.-]*:)?ContentItem\b([^>]*)>/gi;
  // Serialised arrays name their items generically; the parent says what
  // they are (a communication template's Queries/string).
  const GENERIC_ELEMENT = /^(string|anyType|guid|Value|Item)$/i;

  function parentElement(xml, index) {
    const tags = xml.slice(Math.max(0, index - 4000), index).match(/<\/?(?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*\b[^>]*>/g) || [];
    const stack = [];
    for (const tag of tags) {
      if (/\/\s*>$/.test(tag)) continue;
      const name = localName(tag.match(/^<\/?([^\s>/]+)/)[1]);
      if (tag[1] === '/') {
        const open = stack.lastIndexOf(name);
        if (open !== -1) stack.length = open;
      } else {
        stack.push(name);
      }
    }
    return stack.length ? stack[stack.length - 1] : '';
  }

  // Which content item (iPart) a position in a content page belongs to:
  // its name and type, e.g. { name: 'WorkbenchList', type: 'QueryMenu' }.
  function contentItems(xml) {
    let spans = null;
    return index => {
      if (!spans) {
        spans = [];
        let match;
        CONTENT_ITEM_OPEN.lastIndex = 0;
        while ((match = CONTENT_ITEM_OPEN.exec(xml))) {
          if (/\/\s*>$/.test(match[0])) continue;
          const type = (match[1].match(/\btype\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
          spans.push({ start: match.index, type: localName(type) });
        }
        spans.forEach((span, at) => {
          span.end = at + 1 < spans.length ? spans[at + 1].start : xml.length;
          const named = xml.slice(span.start, Math.min(span.end, span.start + 4000)).match(/<(?:[A-Za-z_][\w.-]*:)?ContentItemName\b[^>]*>([^<]*)</i);
          span.name = named ? xmlUnescape(named[1]).trim() : '';
        });
      }
      const span = spans.find(each => index >= each.start && index < each.end);
      return span ? { name: span.name, type: span.type } : { name: '', type: '' };
    };
  }

  // emit(identifier, isKey, property, owner, ownerType)
  function xmlReferences(xml, emit, options = {}) {
    const ownerAt = options.contentItems ? contentItems(xml) : null;
    const skip = new Set((options.skipElements || []).map(name => name.toLowerCase()));
    let match;
    TEXT_ELEMENT.lastIndex = 0;
    while ((match = TEXT_ELEMENT.exec(xml))) {
      const name = localName(match[1]);
      if (skip.has(name.toLowerCase())) continue;
      const index = match.index;
      visitValue(xmlUnescape(match[2]), (identifier, isKey) => {
        const property = GENERIC_ELEMENT.test(name) ? (parentElement(xml, index) || '?') + '/' + name : name;
        const owner = ownerAt ? ownerAt(index) : { name: '', type: '' };
        emit(identifier, isKey, property, owner.name, owner.type);
      });
    }
    OPEN_TAG.lastIndex = 0;
    while ((match = OPEN_TAG.exec(xml))) {
      const attributes = match[2];
      if (!attributes || !/[$%]|[0-9a-f]{8}-/i.test(attributes)) continue;
      const index = match.index;
      // A schema element names the property its attributes describe.
      const elementName = (attributes.match(/\sname\s*=\s*["']([^"']+)["']/) || [])[1] || '';
      let attribute;
      ATTRIBUTE.lastIndex = 0;
      while ((attribute = ATTRIBUTE.exec(attributes))) {
        if (/^xmlns\b/i.test(attribute[1])) continue;
        visitValue(xmlUnescape(attribute[3]), (identifier, isKey) => {
          const owner = ownerAt ? ownerAt(index) : { name: elementName, type: '' };
          emit(identifier, isKey, '@' + attribute[1], owner.name || elementName, owner.type);
        });
      }
    }
  }

  /* ---- JSON: panel sources, tasks ---------------------------------------- */

  // Key paths drop the $values/$value wrappers: DataSources.Query.Criteria.Values
  function jsonReferences(value, emit, path = '', owner = '') {
    if (typeof value === 'string') {
      visitValue(value, (identifier, isKey) => emit(identifier, isKey, path || '(value)', owner, ''));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(item => jsonReferences(item, emit, path, owner));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$type') continue;
      // Embedded blobs are not walked as strings.
      if (child && typeof child === 'object' && /Byte\[\]/.test(String(child.$type || ''))) continue;
      const next = key === '$values' || key === '$value' ? path : (path ? path + '.' + key : key);
      jsonReferences(child, emit, next, owner);
    }
  }

  /* ---- NRBF: IQA definitions --------------------------------------------- */

  // NRBF stores each string as a 7-bit length then UTF-8 bytes. Whole $/
  // paths are read by their length prefix. Keys appear as text inside longer
  // strings (an IQA used as a source is held by its DocumentKey as text), so
  // every GUID in the blob is a candidate; createIndex keeps the IQA ones.
  const GUID_ANYWHERE = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g;

  function utf8(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  }

  function nrbfReferences(binary, emit) {
    let at = binary.indexOf('$/');
    while (at !== -1) {
      // The byte before is a one-byte length, or the second byte of a
      // two-byte one; take whichever reading gives a clean path.
      const lengths = [];
      if (at >= 1 && binary.charCodeAt(at - 1) < 0x80) lengths.push(binary.charCodeAt(at - 1));
      if (at >= 2 && (binary.charCodeAt(at - 2) & 0x80)) lengths.push((binary.charCodeAt(at - 2) & 0x7f) | (binary.charCodeAt(at - 1) << 7));
      for (const length of lengths) {
        if (length <= 2 || length >= 2048 || at + length > binary.length) continue;
        const text = utf8(binary.slice(at, at + length));
        if (/^\$\/\S/.test(text) && !/[\x00-\x1f�]/.test(text)) {
          emit(normalPath(text), false, 'Query', '', '');
          break;
        }
      }
      at = binary.indexOf('$/', at + 2);
    }
    // Paths written inside a longer string: a Query Template's display HTML
    // naming another IQA (data-us-facts-query="$/…", a /api/query link).
    if (binary.includes('$/') || /%24%2f/i.test(binary)) {
      embeddedPaths(utf8(binary)).forEach(path => emit(path, false, 'Template', '', ''));
    }
    const keys = new Set();
    let match;
    GUID_ANYWHERE.lastIndex = 0;
    while ((match = GUID_ANYWHERE.exec(binary))) keys.add(match[0].toLowerCase());
    keys.forEach(key => { if (key !== NULL_GUID) emit(key, true, 'Query', '', ''); });
  }

  /* ---- Theme scripts ------------------------------------------------------- */

  // Quoted $/ paths in a script, named by the nearest section marker
  // (US-NAME:START) or action definition (define('key') above them.
  const SCRIPT_PATH = /(['"`])(\$\/[^'"`\r\n]{2,300})\1/g;
  const SCRIPT_OWNER = /\/\*\s*(US-[A-Z0-9-]+):START|\bdefine\(\s*['"]([a-z][\w.-]*)['"]/g;

  function scriptReferences(source, emit) {
    const owners = [];
    let match;
    SCRIPT_OWNER.lastIndex = 0;
    while ((match = SCRIPT_OWNER.exec(source))) owners.push({ at: match.index, name: match[1] || match[2] });
    SCRIPT_PATH.lastIndex = 0;
    while ((match = SCRIPT_PATH.exec(source))) {
      const path = match[2];
      // Documentation shorthand and assembled paths are not references.
      if (path.includes('…') || path.includes('${')) continue;
      const before = owners.filter(owner => owner.at < match.index);
      const owner = before.length ? before[before.length - 1].name : '';
      emit(normalPath(path), false, 'script', owner, '');
    }
  }

  /* ---- The index ----------------------------------------------------------- */

  // Items are the things that use IQAs: { s: source, n: name, p: path,
  // k: key, y: ASI system content }. Refs tie an item to an identifier:
  // [item, identifier, property, owner, ownerType].
  function createIndex() {
    const items = [];
    const pathRefs = [];
    const keyRefs = [];
    const iqaKeys = new Set();
    const iqaPaths = new Set();
    const selves = [];
    const seen = new Set();

    return {
      item(fields, self = []) {
        items.push({ s: fields.s, n: fields.n || '', p: fields.p || '', k: fields.k || '', y: fields.y ? 1 : 0 });
        selves.push(new Set(self.filter(Boolean).map(value => String(value).toLowerCase())));
        return items.length - 1;
      },
      ref(item, identifier, isKey, property, owner, ownerType) {
        if (selves[item].has(identifier)) return;
        const id = item + '|' + identifier + '|' + property + '|' + owner;
        if (seen.has(id)) return;
        seen.add(id);
        (isKey ? keyRefs : pathRefs).push([item, identifier, property || '', owner || '', ownerType || '']);
      },
      // Every IQA the build reads, so key references can be told from other GUIDs.
      iqa(path, documentKey, versionKey) {
        if (path) iqaPaths.add(normalPath(path));
        [documentKey, versionKey].filter(Boolean).forEach(key => iqaKeys.add(String(key).toLowerCase()));
      },
      // Refs so far for one target, before keys are filtered: a rebuild shows
      // each place's results as soon as it is read.
      partial() {
        return { items, refs: pathRefs.concat(keyRefs) };
      },
      finish(meta) {
        const refs = pathRefs.concat(keyRefs.filter(ref => iqaKeys.has(ref[1])));
        // Keep only items that still hold a reference, renumbered.
        const used = [...new Set(refs.map(ref => ref[0]))].sort((a, b) => a - b);
        const renumber = new Map(used.map((old, index) => [old, index]));
        return Object.assign({
          format: FORMAT,
          version: VERSION,
          iqas: iqaPaths.size,
          items: used.map(old => items[old]),
          refs: refs.map(ref => [renumber.get(ref[0]), ref[1], ref[2], ref[3], ref[4]])
        }, meta);
      }
    };
  }

  /* ---- Lookup -------------------------------------------------------------- */

  // iPart type names as iMIS shows them; others are split at capitals.
  const IPART_NAMES = { ContentHtml: 'Content HTML', QueryMenu: 'Query Menu', IQADatasource: 'IQA Data Source', ProgressTracker: 'Progress Tracker', DynamicContentCollectionOrganizer: 'Content Collection Organizer' };
  const typeLabel = type => IPART_NAMES[type] || String(type || '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

  // One line saying how an item uses the IQA.
  function describe(source, ref, viaFolder) {
    const [, , property, owner, ownerType] = ref;
    if (viaFolder) {
      return source === 'CON' && owner
        ? (typeLabel(ownerType) || 'Content item') + ' "' + owner + '" lists the queries in this folder'
        : 'Uses the folder that contains this query';
    }
    switch (source) {
      case 'CON':
        if (owner) return (typeLabel(ownerType) || 'Content item') + ' "' + owner + '" uses this query';
        return 'Page setting ' + property + ' uses this query';
      case 'BOD':
      case 'BOE':
        return 'Value list for ' + (owner || property);
      case 'TASK':
        if (/^DataSources\b/.test(property)) return 'Reads this query as a data source';
        if (/^Actions\b/.test(property)) return 'An action runs this query';
        return 'Uses this query (' + property + ')';
      case 'IQD':
        return property === 'Template' ? 'Its display template uses this query' : 'Uses this query as a source';
      case 'THEME':
        return owner ? owner + ' uses this query' : 'A theme script uses this query';
      default:
        return 'Uses this query (' + property + ')';
    }
  }

  // target: { path, documentKey, versionKey }. Returns, per source, the items
  // that use the IQA, each with its description lines and whether every match
  // was through the folder.
  function lookup(index, target) {
    const direct = new Set([normalPath(target.path), String(target.documentKey || '').toLowerCase(), String(target.versionKey || '').toLowerCase()].filter(Boolean));
    const folder = parentFolder(target.path);
    const found = new Map();
    for (const ref of index.refs) {
      const isDirect = direct.has(ref[1]);
      const isFolder = !isDirect && folder && ref[1] === folder;
      if (!isDirect && !isFolder) continue;
      const item = index.items[ref[0]];
      if (!item) continue;
      // The IQA itself is not a use of itself.
      if (item.s === 'IQD' && (direct.has(String(item.k).toLowerCase()) || direct.has(normalPath(item.p)))) continue;
      const entry = found.get(ref[0]) || { item, lines: new Set(), direct: false };
      entry.lines.add(describe(item.s, ref, isFolder));
      if (isDirect) entry.direct = true;
      found.set(ref[0], entry);
    }
    return SOURCES.map(source => ({
      source,
      results: [...found.values()].filter(entry => entry.item.s === source.id).map(entry => ({
        item: entry.item,
        how: [...entry.lines].join('; '),
        viaFolder: !entry.direct
      }))
    }));
  }

  const core = Object.freeze({
    FORMAT, VERSION, SOURCES, SYSTEM_FOLDERS,
    normalPath, isSystemPath, parentFolder, embeddedPaths, visitValue,
    xmlReferences, jsonReferences, nrbfReferences, scriptReferences,
    createIndex, lookup, describe
  });

  if (typeof module === 'object' && module.exports) module.exports = core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.UnionSuiteWhereUsed) return;

  // Runs only in the IQA designer, as its loader gate does.
  if (!/\/QueryBuilder\/Design\.aspx$/i.test(location.pathname)) return;

  /* ===========================================================================
   * Requests
   * ======================================================================== */
  const PAGE_SIZE = 100;
  const CONCURRENCY = 4;
  const PARALLEL_SOURCES = 3;

  function webRoot() {
    if (!window.gWebRoot) return '';
    return new URL(String(window.gWebRoot), location.origin).pathname.replace(/\/+$/, '');
  }

  function token() {
    const field = document.getElementById('__RequestVerificationToken') ||
      document.querySelector('input[name="__RequestVerificationToken"]');
    return field ? field.value : '';
  }

  async function api(method, path, body, signal) {
    const response = await fetch(location.origin + webRoot() + '/api/' + path, {
      method,
      credentials: 'same-origin',
      signal,
      headers: Object.assign(
        { Accept: 'application/json', RequestVerificationToken: token() },
        body === undefined ? {} : { 'Content-Type': 'application/json' }
      ),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (!response.ok) throw new Error(method + ' ' + path.split('?')[0] + ' answered ' + response.status);
    return text ? JSON.parse(text) : null;
  }

  function execute(operation, values, typeNames, signal) {
    return api('POST', 'Document/_execute', {
      $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
      OperationName: operation,
      EntityTypeName: 'Document',
      Parameters: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
        $values: values
      },
      ParameterTypeName: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
        $values: typeNames
      },
      UseJson: false
    }, signal);
  }

  // "Not found" is HTTP 200 with Result null.
  function unwrap(data) {
    if (data && 'Result' in data && data.Result == null) return null;
    return data?.Result?.$values ?? data?.Result ?? data?.$values ?? data;
  }

  const asList = value => Array.isArray(value) ? value : value ? [value] : [];
  const published = { $type: 'System.Boolean', $value: true };

  async function pool(items, limit, task) {
    let next = 0;
    async function worker() {
      while (next < items.length) {
        const index = next++;
        await task(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  }

  // A paged collection. BOEntityDefinition reports TotalCount as the page's
  // own size, with HasNext false, even when more follow; a full page whose
  // TotalCount is no larger than itself is followed until a short page.
  async function readPaged(base, onItems, signal) {
    const join = base.includes('?') ? '&' : '?';
    const page = offset => api('GET', base + join + 'Limit=' + PAGE_SIZE + '&Offset=' + offset, undefined, signal);
    const first = await page(0);
    const firstItems = first?.Items?.$values || [];
    const total = first?.TotalCount ?? 0;
    onItems(firstItems);
    if (total <= firstItems.length && (first?.HasNext || firstItems.length >= PAGE_SIZE)) {
      let read = firstItems.length;
      for (;;) {
        const items = (await page(read))?.Items?.$values || [];
        if (!items.length) break;
        read += items.length;
        onItems(items);
        if (items.length < PAGE_SIZE) break;
      }
      return;
    }
    const offsets = [];
    for (let offset = PAGE_SIZE; offset < total; offset += PAGE_SIZE) offsets.push(offset);
    await pool(offsets, CONCURRENCY, async offset => onItems((await page(offset))?.Items?.$values || []));
  }

  /* ---- document fields ---------------------------------------------------- */
  const field = (doc, ...names) => {
    for (const name of names) {
      const value = doc?.[name];
      if (value != null && value !== '') return typeof value === 'object' && '$value' in value ? value.$value : value;
    }
    return '';
  };
  const typeOf = doc => String(field(doc, 'DocumentTypeId', 'DocumentTypeCode')).toUpperCase();
  const nameOf = doc => String(field(doc, 'AlternateName', 'Name', 'DocumentName'));
  const versionKeyOf = doc => String(field(doc, 'DocumentVersionId', 'DocumentVersionKey')).toLowerCase();
  const documentKeyOf = doc => String(field(doc, 'DocumentId', 'DocumentKey')).toLowerCase();
  const blobOf = doc => String(doc?.Data?.$value ?? '').replace(/\s+/g, '');

  // Working documents report a truncated Path (folder and trailing slash).
  function pathOf(doc) {
    const path = String(field(doc, 'Path', 'FullPath'));
    if (path && !path.endsWith('/')) return path;
    const folder = String(field(doc, 'FolderPath') || path).replace(/\/+$/, '');
    const name = String(field(doc, 'Name'));
    return folder && name ? folder + '/' + name : path;
  }

  function decode(base64) {
    try { return base64 ? atob(base64) : ''; } catch (_) { return ''; }
  }

  /* ===========================================================================
   * Building the index
   * ======================================================================== */

  // Documents of one type, folder by folder from the root. Pages outside the
  // content tree (ASI admin pages) are not reached; the drawer says so.
  async function readByFolder(type, rootPath, onDoc, signal) {
    const root = unwrap(await execute('FindByPath', [rootPath], ['System.String'], signal));
    const rootId = field(root, 'DocumentId', 'DocumentVersionId');
    if (!rootId) throw new Error('Could not find ' + rootPath);
    const folderType = type === 'CON' ? 'CFL' : 'FOL';
    const children = asList(unwrap(await execute('FindDocumentsInFolder',
      [rootId, { $type: 'System.String[], mscorlib', $values: [type, folderType] }, published],
      ['System.String', 'System.String[]', 'System.Boolean'], signal)));
    children.filter(doc => typeOf(doc) === type).forEach(onDoc);
    const folders = children.filter(doc => typeOf(doc) === folderType);
    await pool(folders, CONCURRENCY, async folder => {
      const docs = asList(unwrap(await execute('FindDescendantDocumentsInFolder',
        [field(folder, 'DocumentId', 'DocumentVersionId'), type, published],
        ['System.String', 'System.String', 'System.Boolean'], signal)));
      docs.filter(doc => !typeOf(doc) || typeOf(doc) === type).forEach(onDoc);
    });
  }

  // Published documents of one type, in pages (these carry no Path).
  async function readPublished(type, onDoc, signal) {
    await readPaged('Document?DocumentTypeId=' + type + '&DocumentStatusID=40', items => {
      const stray = items.find(doc => typeOf(doc) && typeOf(doc) !== type);
      if (stray) throw new Error('The ' + type + ' filter was not honoured');
      items.forEach(onDoc);
    }, signal);
  }

  // Each reader fills the index and returns how many things it read.
  const READERS = {
    async CON(index, signal) {
      let count = 0;
      const seen = new Set();
      await readByFolder('CON', '@/', doc => {
        const key = versionKeyOf(doc);
        if (seen.has(key)) return;
        seen.add(key);
        count++;
        const binary = decode(blobOf(doc));
        if (!binary.startsWith('<') && !binary.startsWith('ï»¿<')) return;
        const path = pathOf(doc);
        const item = index.item({ s: 'CON', n: nameOf(doc), p: path, k: key, y: isSystemPath(path) }, [key, documentKeyOf(doc)]);
        xmlReferences(utf8(binary), (identifier, isKey, property, owner, ownerType) =>
          index.ref(item, identifier, isKey, property, owner, ownerType), { contentItems: true });
      }, signal);
      return count;
    },

    async IQD(index, signal) {
      let count = 0;
      const seen = new Set();
      await readByFolder('IQD', '$/', doc => {
        const key = versionKeyOf(doc);
        if (seen.has(key)) return;
        seen.add(key);
        count++;
        const path = pathOf(doc);
        index.iqa(path, documentKeyOf(doc), key);
        const binary = decode(blobOf(doc));
        if (!binary) return;
        const item = index.item({ s: 'IQD', n: nameOf(doc), p: path, k: key, y: isSystemPath(path) }, [key, documentKeyOf(doc), normalPath(path)]);
        nrbfReferences(binary, (identifier, isKey, property) => index.ref(item, identifier, isKey, property, '', ''));
      }, signal);
      return count;
    },

    async BOD(index, signal) {
      let count = 0;
      await readPublished('BOD', doc => {
        count++;
        const binary = decode(blobOf(doc));
        if (!binary.startsWith('<') && !binary.startsWith('ï»¿<')) return;
        const key = versionKeyOf(doc);
        const item = index.item({ s: 'BOD', n: nameOf(doc), k: key }, [key, documentKeyOf(doc)]);
        xmlReferences(utf8(binary), (identifier, isKey, property, owner) => index.ref(item, identifier, isKey, property, owner, ''));
      }, signal);
      return count;
    },

    async COM(index, signal) {
      let count = 0;
      await readPublished('COM', doc => {
        count++;
        const binary = decode(blobOf(doc));
        if (!binary.startsWith('<') && !binary.startsWith('ï»¿<')) return;
        const key = versionKeyOf(doc);
        const item = index.item({ s: 'COM', n: nameOf(doc), k: key }, [key, documentKeyOf(doc)]);
        // A template's own Path and FolderPath are not references.
        xmlReferences(utf8(binary), (identifier, isKey, property, owner) => index.ref(item, identifier, isKey, property, owner, ''),
          { skipElements: ['Path', 'FolderPath'] });
      }, signal);
      return count;
    },

    async BOE(index, signal) {
      let count = 0;
      await readPaged('BOEntityDefinition', definitions => definitions.forEach(definition => {
        count++;
        const name = String(field(definition, 'EntityTypeName'));
        const item = index.item({ s: 'BOE', n: name, k: name });
        (definition?.Properties?.$values || []).forEach(property => {
          if (!property?.Rule) return;
          jsonReferences(property.Rule, (identifier, isKey, path) =>
            index.ref(item, identifier, isKey, path, String(property.Name || ''), ''), 'Rule', String(property.Name || ''));
        });
      }), signal);
      return count;
    },

    async TASK(index, signal) {
      let count = 0;
      await readPaged('TaskDefinition', tasks => tasks.forEach(task => {
        count++;
        const id = String(field(task, 'TaskDefinitionId')).toLowerCase();
        const item = index.item({ s: 'TASK', n: String(field(task, 'Name')), k: id, y: field(task, 'IsSystem') === true }, [id]);
        jsonReferences(task, (identifier, isKey, path) => index.ref(item, identifier, isKey, path, '', ''));
      }), signal);
      return count;
    },

    // The theme's own scripts, as the loader lists them (every script,
    // including ones gated to other pages). IQA paths in them are written
    // whole; tools/check-usage-sources.cjs fails a script that assembles one.
    async THEME(index, signal) {
      const loader = window.UnionSuiteLoader;
      const paths = Array.isArray(loader?.modules) ? loader.modules : [];
      if (!loader?.base || !paths.length) throw new Error('The theme loader does not list its scripts');
      let count = 0;
      // This file lists folder names for its own use; they are not references.
      const scripts = paths.filter(path => !/IQA-WhereUsed.js$/i.test(path));
      await pool(scripts, CONCURRENCY, async path => {
        const url = new URL(path, loader.base);
        url.searchParams.set('v', loader.version || '');
        const response = await fetch(url.href, { credentials: 'same-origin', signal });
        if (!response.ok) throw new Error(path + ' answered ' + response.status);
        count++;
        const item = index.item({ s: 'THEME', n: path, p: '' });
        scriptReferences(await response.text(), (identifier, isKey, property, owner) => index.ref(item, identifier, isKey, property, owner, ''));
      });
      return count;
    }
  };

  // Reads every place, three at a time. onProgress(sourceId, state) reports
  // 'reading', 'done' or 'failed'. Resolves with the finished index, or
  // rejects with the failed places listed on the error.
  async function build({ onProgress, signal } = {}) {
    const started = Date.now();
    const index = createIndex();
    const counts = {};
    const failed = [];
    await pool(SOURCES, PARALLEL_SOURCES, async source => {
      onProgress?.(source.id, 'reading', index);
      try {
        counts[source.id] = { items: await READERS[source.id](index, signal) };
        onProgress?.(source.id, 'done', index);
      } catch (error) {
        if (signal?.aborted) throw error;
        console.error('[UnionSuiteWhereUsed] ' + source.name + ' could not be read', error);
        failed.push(source.id);
        onProgress?.(source.id, 'failed', index);
      }
    });
    if (failed.length) {
      const error = new Error('Could not read ' + failed.join(', '));
      error.failedSources = failed;
      throw error;
    }
    return index.finish({ builtAt: new Date().toISOString(), durationMs: Date.now() - started, sources: counts, includesSystem: true });
  }

  /* ===========================================================================
   * Storage: i4u_UT_Configuration (Module System, Category IQA,
   * Code WhereUsedIndex). Proven by configuration-payload-probe.js.
   * ======================================================================== */
  const STORE = { entity: 'i4u_UT_Configuration', module: 'System', category: 'IQA', code: 'WhereUsedIndex' };
  const property = (name, value) => ({ $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value });
  const scalar = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;

  function readProperty(row, name) {
    const values = row?.Properties?.$values;
    const found = Array.isArray(values) ? values.find(entry => entry && entry.Name === name) : null;
    return found ? found.Value : undefined;
  }

  async function gzip(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(base64) {
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  function toBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  }

  // Site time without a zone: iMIS stores LastUpdated as given and drops any
  // offset, so a UTC value would read hours early.
  function localTimestamp(date = new Date()) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, -1);
  }

  const storeQuery = () => STORE.entity + '?Module=' + encodeURIComponent(STORE.module) +
    '&Category=' + encodeURIComponent(STORE.category) + '&Code=' + encodeURIComponent(STORE.code) + '&Limit=10';

  // The stored index, or null when none has been built. The lowest Ordinal
  // wins if more than one row exists, as the taskbar's settings rows do.
  async function readStored() {
    const data = await api('GET', storeQuery());
    const rows = (data?.Items?.$values || [])
      .map(row => ({ row, ordinal: Number(scalar(readProperty(row, 'Ordinal'))) }))
      .filter(entry => Number.isFinite(entry.ordinal))
      .sort((a, b) => a.ordinal - b.ordinal);
    if (!rows.length) return null;
    const { row, ordinal } = rows[0];
    const payload = scalar(readProperty(row, 'Payload'));
    if (typeof payload !== 'string' || !payload) return { ordinal, index: null };
    const index = JSON.parse(await gunzip(payload));
    if (index?.format !== FORMAT || index.version !== VERSION) return { ordinal, index: null };
    return { ordinal, index, updatedBy: String(scalar(readProperty(row, 'UpdatedBy')) || '') };
  }

  async function save(index, ordinal) {
    const bytes = await gzip(JSON.stringify(index));
    const summary = index.refs.length + ' references to IQAs from ' + Object.keys(index.sources).length +
      ' places, built in ' + (Math.round(index.durationMs / 100) / 10) + ' s';
    const values = [
      property('Module', STORE.module),
      property('Category', STORE.category),
      property('Code', STORE.code),
      property('Entity', ''),
      property('Description', 'Where each IQA is used: content pages, business object and panel source value lists, communication templates, alerts and Process Automation, other IQAs and the UnionSuite theme. Rebuilt from the IQA designer.'),
      property('Value', summary),
      property('ValueType', 'String'),
      property('LastUpdated', { $type: 'System.DateTime', $value: localTimestamp() }),
      property('Payload', { $type: 'System.Byte[], mscorlib', $value: toBase64(bytes) })
    ];
    const body = {
      $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
      EntityTypeName: STORE.entity,
      Properties: { $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', $values: values }
    };
    if (ordinal == null) return api('POST', STORE.entity, body);
    // The row key appears in Identity and in Properties.
    body.Identity = {
      $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts',
      EntityTypeName: STORE.entity,
      IdentityElements: { $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: [String(ordinal)] }
    };
    values.push(property('Ordinal', { $type: 'System.Int32', $value: Number(ordinal) }));
    return api('PUT', STORE.entity + '/' + encodeURIComponent(ordinal), body);
  }

  /* ===========================================================================
   * The open IQA
   * ======================================================================== */
  function hints() {
    const params = new Map([...new URLSearchParams(location.search)].map(([name, value]) => [name.toLowerCase(), value]));
    const newQuery = /^(new|add|create)$/i.test(params.get('imode') || '') || /^(new|add|create)$/i.test(params.get('ioperation') || '');
    if (newQuery) return {};
    let key = params.get('iuniformkey') || '';
    // IQA-Enhancements keeps the key across postbacks that drop it from the URL.
    if (!GUID.test(key)) {
      try {
        const storageKey = 'iqa:document-key:v1:' + location.pathname.toLowerCase() + ':session:' + encodeURIComponent((params.get('isession') || '').toLowerCase());
        key = JSON.parse(sessionStorage.getItem(storageKey) || 'null')?.value || '';
      } catch (_) {
        key = '';
      }
    }
    const shown = document.querySelector('span[id$="_QueryPath"]')?.textContent.trim() || '';
    return { key: GUID.test(key) && key.toLowerCase() !== NULL_GUID ? key.toLowerCase() : '', path: shown.startsWith('$/') ? shown : '' };
  }

  const saved = () => Boolean(hints().key || hints().path);

  let targetPromise = null;
  function resolveTarget() {
    if (targetPromise) return targetPromise;
    targetPromise = (async () => {
      const { key, path: shown } = hints();
      let path = shown;
      if (!path && key) {
        const summary = await api('GET', 'DocumentSummary?DocumentVersionId=' + encodeURIComponent(key) + '&Limit=5');
        const row = summary?.Items?.$values?.[0];
        path = row ? pathOf(row) : '';
      }
      if (!path) throw new Error('Save the query first');
      const doc = unwrap(await execute('FindByPath', [path], ['System.String']));
      return {
        path: pathOf(doc) || path,
        name: nameOf(doc) || path.split('/').pop(),
        documentKey: documentKeyOf(doc),
        versionKey: versionKeyOf(doc) || key
      };
    })();
    targetPromise.catch(() => { targetPromise = null; });
    return targetPromise;
  }

  /* ===========================================================================
   * Drawer
   * ======================================================================== */
  const SYSTEM_PREFERENCE = 'unionsuite:where-used:system';
  const fold = (element, open) => window.UnionSuiteRecordCards?.fold
    ? window.UnionSuiteRecordCards.fold(element, open)
    : Promise.resolve(void (element.hidden = !open));

  const state = {
    stored: null,        // { ordinal, index, updatedBy } or null when none exists
    loaded: false,
    loadError: null,
    loading: null,
    target: null,
    targetError: null,
    rebuilding: false,
    progress: {},        // per source during a rebuild
    building: null,      // the index being built, for each place's results
    failedSources: [],
    saveError: null,
    includeSystem: (() => { try { return localStorage.getItem(SYSTEM_PREFERENCE) === 'yes'; } catch (_) { return false; } })()
  };

  let drawer, button, title, subject, summary, meta, body, systemBox, helpToggle, help;
  let pathCount = 0;

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

  function relativeTime(iso) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (!Number.isFinite(minutes)) return '';
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  // Editor URLs, opened in a new tab so the open IQA is never replaced.
  function editorUrl(item) {
    const key = encodeURIComponent(item.k || '');
    if (!item.k) return '';
    switch (item.s) {
      case 'CON': return webRoot() + '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey=' + key;
      case 'BOD': return webRoot() + '/AsiCommon/Controls/BOA/Design.aspx?iUniformKey=' + key;
      case 'COM': return webRoot() + '/CreateCommunication?CommunicationId=' + key;
      case 'TASK': return webRoot() + '/iParts/Common/Tasks/TaskEditDialog.aspx?TaskDefinitionId=' + key + '&ParentTab=1';
      case 'IQD': return webRoot() + '/iMIS/QueryBuilder/Design.aspx?iMode=Edit&iOperation=Edit&iUniformKey=' + key;
      default: return '';
    }
  }

  function createDrawer() {
    drawer = element('aside', 'us-where-used');
    drawer.id = 'us-where-used';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'false');
    drawer.setAttribute('aria-labelledby', 'us-where-used-title');
    drawer.setAttribute('data-closed', '');

    const head = element('div', 'us-where-used__head');
    const heading = element('div', 'us-where-used__heading');
    title = element('h2', 'us-where-used__title', 'Usage');
    title.id = 'us-where-used-title';
    title.tabIndex = -1;
    subject = element('p', 'us-where-used__subject');
    heading.append(title, subject);
    const close = element('button', 'us-where-used__close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.title = 'Close';
    close.append(icon('ti-x'));
    close.addEventListener('click', closeDrawer);
    head.append(heading, close);

    const status = element('div', 'us-where-used__status');
    summary = element('p', 'us-where-used__summary');
    summary.setAttribute('role', 'status');
    meta = element('p', 'us-where-used__meta');
    status.append(summary, meta);

    body = element('div', 'us-where-used__body');

    const foot = element('div', 'us-where-used__foot');
    const option = element('div', 'us-where-used__option');
    const label = element('label');
    systemBox = element('input');
    systemBox.type = 'checkbox';
    systemBox.checked = state.includeSystem;
    systemBox.addEventListener('change', onSystemChange);
    label.append(systemBox, document.createTextNode(' Include ASI system content'));
    helpToggle = element('button', 'us-where-used__help-toggle');
    helpToggle.type = 'button';
    helpToggle.setAttribute('aria-expanded', 'false');
    helpToggle.setAttribute('aria-controls', 'us-where-used-help');
    helpToggle.setAttribute('aria-label', 'What this includes');
    helpToggle.append(icon('ti-info-circle'));
    helpToggle.addEventListener('click', () => {
      const open = helpToggle.getAttribute('aria-expanded') !== 'true';
      helpToggle.setAttribute('aria-expanded', String(open));
      fold(help, open);
    });
    option.append(label, helpToggle);
    help = element('p', 'us-where-used__help',
      'Also shows matches in content and queries supplied by ASI: the iCore and iSamples page folders, the Samples, Common, ContactManagement and Fundraising query folders, and ASI\'s own alerts and tasks. ASI\'s stock pages and queries rarely use your own IQAs, so these are hidden by default.');
    help.id = 'us-where-used-help';
    help.hidden = true;
    foot.append(option, help);

    drawer.append(head, status, body, foot);
    document.body.append(drawer);
  }

  /* ---- rendering ------------------------------------------------------------ */
  const visible = item => state.includeSystem || !item.y;
  const canRebuild = () => {
    const native = document.querySelector('[id$="_DesignShell1_SaveButton"]');
    return Boolean(native && !native.disabled && native.getClientRects().length);
  };

  // The index results shown: the stored index, or, during a rebuild, each
  // place read so far.
  function currentGroups() {
    if (!state.target) return null;
    if (state.rebuilding && state.building) return lookup(state.building.partial(), state.target);
    if (state.stored?.index) return lookup(state.stored.index, state.target);
    return null;
  }

  function renderItem(result) {
    const item = result.item;
    const row = element('li', 'us-where-used__item');
    if (item.y) row.dataset.system = '';
    row.hidden = !visible(item);
    const text = element('div', 'us-where-used__item-text');
    const name = element('span', 'us-where-used__name', item.n || '(unnamed)');
    if (item.y) name.append(element('span', 'us-badge us-where-used__tag', 'ASI'));
    const shownPath = item.s === 'THEME' ? 'Theme script' : item.s === 'TASK' ? 'Process Automation or alert' : item.p;
    const path = element('span', 'us-where-used__path', shownPath || '');
    path.id = 'us-where-used-path-' + (++pathCount);
    text.append(name);
    if (shownPath) text.append(path);
    text.append(element('span', 'us-where-used__how', result.how));
    row.append(text);

    const actions = element('div', 'us-where-used__actions');
    if (/^[$@]\//.test(item.p)) {
      const copy = element('button', 'us-copy');
      copy.type = 'button';
      copy.setAttribute('data-us-copy-target', path.id);
      copy.setAttribute('aria-label', 'Copy path of ' + (item.n || 'this item'));
      copy.title = 'Copy path';
      actions.append(copy);
    }
    const url = editorUrl(item);
    if (url) {
      const open = element('a', 'us-where-used__open-tab');
      open.href = url;
      open.target = '_blank';
      open.rel = 'noopener';
      open.setAttribute('aria-label', 'Open ' + (item.n || 'this item') + ' in a new tab');
      open.title = 'Open in a new tab';
      open.append(icon('ti-external-link'));
      actions.append(open);
    }
    if (actions.childElementCount) row.append(actions);
    return row;
  }

  function renderSection(group, showItems) {
    const section = element('section', 'us-where-used__source');
    section.dataset.source = group.source.id;
    const head = element('h3', 'us-where-used__source-head');
    head.append(icon(group.source.icon), element('span', 'us-where-used__source-name', group.source.name), element('span', 'us-where-used__count'));
    section.append(head);

    const direct = group.results.filter(result => !result.viaFolder);
    const viaFolder = group.results.filter(result => result.viaFolder);
    const list = element('ul', 'us-where-used__items');
    direct.forEach(result => list.append(renderItem(result)));
    const folderGroup = element('div', 'us-where-used__folder-group');
    if (viaFolder.length) {
      const label = element('p', 'us-where-used__group-label', 'Uses the folder ');
      label.append(element('code', '', parentFolderShown()), document.createTextNode(', which contains this query'));
      const folderList = element('ul', 'us-where-used__items');
      viaFolder.forEach(result => folderList.append(renderItem(result)));
      folderGroup.append(label, folderList);
    }
    // A place with nothing to show is one line.
    list.hidden = !showItems || !direct.some(result => visible(result.item));
    folderGroup.hidden = !showItems || !viaFolder.some(result => visible(result.item));
    section.append(list, folderGroup);
    return section;
  }

  function parentFolderShown() {
    const path = state.target?.path || '';
    return path.slice(0, path.lastIndexOf('/'));
  }

  function renderCount(sourceId, groups) {
    const count = body.querySelector('[data-source="' + sourceId + '"] .us-where-used__count');
    if (!count) return;
    const progress = state.progress[sourceId];
    count.replaceChildren();
    if (progress === 'reading') {
      count.dataset.state = 'reading';
      const spinner = element('span', 'us-button-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      count.append(spinner, document.createTextNode('Checking'));
      return;
    }
    if (progress === 'failed' || (!state.rebuilding && state.failedSources.includes(sourceId))) {
      count.dataset.state = 'failed';
      count.textContent = 'Couldn’t check';
      return;
    }
    const group = groups?.find(each => each.source.id === sourceId);
    const found = group ? group.results.filter(result => visible(result.item)).length : 0;
    count.dataset.state = found ? 'found' : 'none';
    count.textContent = found ? String(found) : 'None';
  }

  // A moving line along the bottom of a place while it is checked; it goes
  // as soon as the place is done (owner, 12 October 2026).
  function paintProgress(sourceId) {
    const section = body?.querySelector('[data-source="' + sourceId + '"]');
    if (section) section.toggleAttribute('data-checking', state.progress[sourceId] === 'reading');
  }

  function renderBody() {
    const groups = currentGroups();
    body.replaceChildren();
    if (!state.rebuilding && !state.stored?.index) {
      renderEmpty();
      return;
    }
    SOURCES.forEach(source => {
      const group = groups?.find(each => each.source.id === source.id) || { source, results: [] };
      // During a rebuild only places already read show their results.
      const showItems = !state.rebuilding || state.progress[source.id] === 'done';
      body.append(renderSection(group, showItems));
    });
    const note = element('p', 'us-where-used__note',
      'Not checked: Flowz workflows, and pages outside the page tree such as ASI’s admin pages.');
    body.append(note);
    SOURCES.forEach(source => renderCount(source.id, groups));
    if (state.rebuilding) SOURCES.forEach(source => paintProgress(source.id));
  }

  function renderEmpty() {
    const empty = element('div', 'us-where-used__empty');
    empty.append(icon('ti-sitemap'), element('p', 'us-where-used__empty-title', 'Not checked yet'));
    if (canRebuild()) {
      empty.append(element('p', 'us-where-used__empty-text',
        'Run a check once and everyone can see where their queries are used. It looks through every page, value list, template, task and query, and takes about 15 seconds.'));
      const start = element('button', 'TextButton PrimaryButton', 'Check now');
      start.type = 'button';
      start.addEventListener('click', rebuild);
      empty.append(start);
    } else {
      empty.append(element('p', 'us-where-used__empty-text', 'Someone who can edit queries needs to run the first check.'));
    }
    body.append(empty);
  }

  function rebuildButton(label) {
    const control = element('button', 'TextButton us-outline-button', label);
    control.type = 'button';
    control.addEventListener('click', rebuild);
    return control;
  }

  function renderStatus() {
    summary.removeAttribute('data-tone');
    meta.replaceChildren();
    const stored = state.stored?.index;
    const built = stored ? 'Last checked ' + relativeTime(stored.builtAt) + (state.stored.updatedBy ? ' by ' + state.stored.updatedBy : '') : '';

    if (state.targetError) {
      summary.textContent = state.targetError;
      return;
    }
    if (state.rebuilding) {
      const read = SOURCES.filter(source => ['done', 'failed'].includes(state.progress[source.id])).length;
      summary.textContent = 'Checking · ' + read + ' of ' + SOURCES.length + ' places done';
      meta.append(document.createTextNode('Results appear as each place is checked.'));
      return;
    }
    if (state.failedSources.length) {
      summary.dataset.tone = 'warning';
      const names = state.failedSources.map(id => SOURCES.find(source => source.id === id).name.toLowerCase()).join(', ');
      summary.textContent = stored
        ? 'The check didn’t finish: ' + names + ' couldn’t be checked. Showing the results of the last check.'
        : 'The check didn’t finish: ' + names + ' couldn’t be checked.';
      if (built) meta.append(document.createTextNode(built));
      if (canRebuild()) meta.append(rebuildButton('Try again'));
      return;
    }
    if (state.saveError) {
      summary.dataset.tone = 'warning';
      summary.textContent = 'The check finished, but its results couldn’t be saved. ' + state.saveError;
      if (canRebuild()) meta.append(rebuildButton('Try again'));
      return;
    }
    if (state.loadError) {
      summary.dataset.tone = 'warning';
      summary.textContent = 'The last check’s results couldn’t be loaded. ' + state.loadError;
      const retry = element('button', 'TextButton us-outline-button', 'Try again');
      retry.type = 'button';
      retry.addEventListener('click', () => { state.loaded = false; state.loading = null; openDrawer(true); });
      meta.append(retry);
      return;
    }
    if (!stored) {
      summary.textContent = 'Not checked yet';
      return;
    }
    const groups = currentGroups() || [];
    const total = groups.reduce((sum, group) => sum + group.results.filter(result => visible(result.item)).length, 0);
    summary.textContent = total ? 'Used in ' + total + (total === 1 ? ' place' : ' places') : 'Not used in any of the places checked';
    meta.append(document.createTextNode(built));
    if (canRebuild()) meta.append(rebuildButton('Check again'));
  }

  function render() {
    if (!drawer) return;
    subject.textContent = state.target?.name || '';
    renderBody();
    renderStatus();
  }

  /* ---- loading -------------------------------------------------------------- */
  function load() {
    if (state.loading) return state.loading;
    state.loading = (async () => {
      state.loadError = null;
      state.targetError = null;
      try {
        state.target = await resolveTarget();
      } catch (error) {
        state.targetError = error.message === 'Save the query first'
          ? 'Save the query first to see its usage.'
          : 'This query couldn’t be identified. ' + error.message;
      }
      try {
        if (!state.rebuilding) state.stored = await readStored();
      } catch (error) {
        state.loadError = error.message;
      }
      state.loaded = true;
    })();
    return state.loading;
  }

  /* ---- rebuild -------------------------------------------------------------- */
  async function rebuild() {
    if (state.rebuilding) return;
    if (!drawer) createDrawer();
    state.rebuilding = true;
    state.failedSources = [];
    state.saveError = null;
    state.progress = {};
    SOURCES.forEach(source => { state.progress[source.id] = 'reading'; });
    state.building = createIndex();
    // The old results go at once; each place refills as it is read.
    body.querySelectorAll('.us-where-used__source > .us-where-used__items, .us-where-used__source > .us-where-used__folder-group')
      .forEach(group => { if (!group.hidden) fold(group, false); });
    if (!state.stored?.index) renderBody();
    SOURCES.forEach(source => { renderCount(source.id, null); paintProgress(source.id); });
    renderStatus();

    let index = null;
    try {
      index = await build({
        onProgress(sourceId, progress, building) {
          state.building = building;
          state.progress[sourceId] = progress;
          if (!drawer || drawer.hasAttribute('data-closed')) return;
          paintProgress(sourceId);
          if (progress === 'done') revealSource(sourceId);
          else renderCount(sourceId, null);
          renderStatus();
        }
      });
    } catch (error) {
      state.failedSources = error.failedSources || SOURCES.map(source => source.id);
    }

    if (index) {
      try {
        const ordinal = state.stored?.ordinal ?? null;
        await save(index, ordinal);
        // Read back what everyone else will now see, including iMIS's UpdatedBy.
        state.stored = await readStored().catch(() => ({ ordinal, index }));
      } catch (error) {
        state.saveError = error.message;
      }
    }
    state.rebuilding = false;
    state.building = null;
    state.progress = {};
    if (drawer && !drawer.hasAttribute('data-closed')) render();
  }

  // One place has been read during a rebuild: its new results open.
  function revealSource(sourceId) {
    const groups = currentGroups();
    const group = groups?.find(each => each.source.id === sourceId);
    const section = body.querySelector('[data-source="' + sourceId + '"]');
    if (!group || !section) return;
    const fresh = renderSection(group, false);
    const list = fresh.querySelector(':scope > .us-where-used__items');
    const folderGroup = fresh.querySelector(':scope > .us-where-used__folder-group');
    section.querySelectorAll(':scope > .us-where-used__items, :scope > .us-where-used__folder-group').forEach(node => node.remove());
    section.append(list, folderGroup);
    renderCount(sourceId, groups);
    if (group.results.some(result => !result.viaFolder && visible(result.item))) fold(list, true);
    if (group.results.some(result => result.viaFolder && visible(result.item))) fold(folderGroup, true);
  }

  /* ---- open and close ------------------------------------------------------- */
  async function openDrawer(reload) {
    if (!saved()) return;
    if (!drawer) createDrawer();
    if (!drawer.hasAttribute('data-closed') && !reload) return;
    drawer.removeAttribute('data-closed');
    button?.setAttribute('aria-expanded', 'true');
    if (!reload) title.focus({ preventScroll: true });
    if (state.loaded && !reload) {
      render();
      return;
    }
    // A quick load never flashes a loading line; a slow one says so.
    body.replaceChildren();
    meta.replaceChildren();
    summary.textContent = '';
    const slow = setTimeout(() => { if (!state.loaded) summary.textContent = 'Loading…'; }, 150);
    await load();
    clearTimeout(slow);
    render();
  }

  function closeDrawer() {
    if (!drawer || drawer.hasAttribute('data-closed')) return;
    const hadFocus = drawer.contains(document.activeElement);
    drawer.setAttribute('data-closed', '');
    button?.setAttribute('aria-expanded', 'false');
    // A rebuild carries on while the drawer is closed.
    if (hadFocus) button?.focus({ preventScroll: true });
  }

  function onSystemChange() {
    state.includeSystem = systemBox.checked;
    try { localStorage.setItem(SYSTEM_PREFERENCE, state.includeSystem ? 'yes' : 'no'); } catch (_) { /* Preference only. */ }
    // A filter over the stored index: reveal or hide, no rebuild.
    drawer.querySelectorAll('.us-where-used__item[data-system]').forEach(row => fold(row, state.includeSystem));
    body.querySelectorAll('.us-where-used__items, .us-where-used__folder-group').forEach(group => {
      if (group.closest('.us-where-used__folder-group') && group.classList.contains('us-where-used__items')) return;
      const rows = [...group.querySelectorAll('.us-where-used__item')];
      const section = group.closest('.us-where-used__source');
      const ready = !state.rebuilding || state.progress[section?.dataset.source] === 'done';
      const show = ready && rows.some(row => !row.hasAttribute('data-system') || state.includeSystem);
      if (group.hidden === show) fold(group, show);
    });
    const groups = currentGroups();
    SOURCES.forEach(source => renderCount(source.id, groups));
    renderStatus();
  }

  /* ---- the header button ---------------------------------------------------- */
  function mountButton() {
    // After the Copy Path and Copy Key buttons, before the Enhance switch;
    // without them, at the start of the designer's action group.
    const save = document.querySelector('[id$="_DesignShell1_SaveButton"], [id$="_DesignShell1_SaveAsButton"], [id$="_DesignShell1_CancelButton"], [id$="_DesignShell1_CloseButton"]');
    const group = save?.parentElement;
    if (!group) return;
    if (!button) {
      button = element('button', 'TextButton us-outline-button iqa-header-copy-button us-where-used-button');
      button.type = 'button';
      button.id = 'us-where-used-button';
      button.setAttribute('aria-controls', 'us-where-used');
      button.setAttribute('aria-expanded', 'false');
      // Icon only: the designer header has no room for another label
      // (owner, 12 October 2026). The name is in aria-label and the tooltip.
      button.setAttribute('aria-label', 'Show Usage');
      button.append(icon('ti-sitemap'));
      button.addEventListener('click', () => (drawer && !drawer.hasAttribute('data-closed') ? closeDrawer() : openDrawer()));
    }
    const anchor = document.getElementById('iqaEnhanceToggle');
    if (anchor && anchor.parentElement === group) {
      if (button.nextElementSibling !== anchor) anchor.before(button);
    } else if (button.parentElement !== group) {
      group.prepend(button);
    }
    if (saved()) {
      button.removeAttribute('aria-disabled');
      button.title = 'Show Usage: see where this query is used';
    } else {
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Show Usage: save the query first to see its usage.';
    }
  }

  function boot() {
    mountButton();
    // The designer replaces its header on partial postbacks.
    try {
      window.Sys?.WebForms?.PageRequestManager?.getInstance?.()?.add_endRequest(mountButton);
    } catch (_) {
      /* No partial postbacks on this page. */
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && drawer && !drawer.hasAttribute('data-closed')) {
        event.preventDefault();
        closeDrawer();
      }
    });
    // Fetch the index quietly, so the drawer opens on results.
    const idle = window.requestIdleCallback || (callback => setTimeout(callback, 1500));
    if (saved()) idle(() => load().catch(() => {}));
    // Keep "built 2 hours ago" honest while the drawer stays open.
    setInterval(() => {
      if (drawer && !drawer.hasAttribute('data-closed') && !state.rebuilding && state.loaded) renderStatus();
    }, 30000);
  }

  window.UnionSuiteWhereUsed = Object.freeze(Object.assign({
    version: '1.0',
    open: () => openDrawer(),
    close: closeDrawer,
    rebuild,
    build,
    readStored
  }, core));

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
