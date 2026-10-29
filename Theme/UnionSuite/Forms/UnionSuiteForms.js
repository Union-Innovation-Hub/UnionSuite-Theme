/* UnionSuite forms runtime (UnionSuiteForms 1.0).

   Draws the UnionSuite popup forms (the task form first) into a placeholder
   on an iMIS page, saves them through CloudToolz and closes the popup with
   the popup form contract. Owner, 19 and 20 October 2026.

   A page holds only a placeholder; this file draws the form into it:

     <div data-us-form="task" data-module="case"></div>

   - data-us-form names the form. Its definition is a file beside this one
     (FORM_FILES), loaded the first time a page needs it, which registers
     itself with UnionSuiteForms.define(name, spec).
   - Every other data-* attribute is a page setting the form can read
     (context.options), so the page, not the address, fixes the module, the
     tag filter and the like.
   - The address carries the record: ID (signed-in user, also read from
     iMIS), ModuleID and ModuleOrdinal (the parent record) and Ordinal (the
     item being edited; present means edit).

   Works with or without the UnionSuite theme. The form draws in a shadow
   root with its own stylesheet (UnionSuiteForms.css, fetched once and
   adopted before anything is drawn, so it never shows unstyled) and inline
   SVG icons. Theme tokens reach in as CSS custom properties, so with the
   theme the form takes its colours, font and dark mode; without it, the
   stylesheet's fallbacks apply. Nothing here calls zUnionSuite.js; the
   composer draft (UnionSuiteComposers.received()) is read only when the
   theme is there.

   Loading: the theme loader (index.js) loads this file on pages with a
   [data-us-form] placeholder. A page without the theme includes it directly:
   <script src="/App_Themes/<theme>/Forms/UnionSuiteForms.js?v=<release>">.
   Child files (form files, the stylesheet) resolve beside this file and
   carry its ?v=.

   Offline (the usage guide, previews): set window.UnionSuiteFormsConfig =
   {stylesheet: '<css text>', search: '?ModuleID=…', forms: {task: {…}}}
   before this file and define the form before the placeholder mounts;
   nothing is then fetched from the theme folder. search stands in for the
   page address; forms.<name> is read by that form file (sample IQAs).
   Production pages set none of these.

   The form definition format, field types, payload and close results are
   documented in the usage guide (#popup-forms). Tests:
   node --test tools/test-popup-forms.cjs */
(function () {
  'use strict';

  const VERSION = '1.0';

  // Form name → its definition file, beside this one. Every form file is
  // listed here (and in index.js's FORM_FILES, for the IQA where-used scan).
  const FORM_FILES = Object.freeze({
    task: 'TaskForm.js'
  });

  const STYLESHEET = 'UnionSuiteForms.css';
  const QUERY_PAGE = 500;
  const QUERY_MAX_ROWS = 2000;

  /* ── Pure core: context, visibility, values, payload ───────────
     No DOM here, so node tests can exercise it (module.exports). */

  const DIGITS = /^\d+$/;
  const RECORD_ID = /^[A-Za-z0-9_-]+$/;

  // data-tags-module → tagsModule.
  const camel = name => name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  // context: what the form knows about where it is. search is the page's
  // query string, dataset the placeholder's data-* attributes (as an
  // object), client iMIS's __ClientContext.
  function readContext({search = '', dataset = {}, client = {}} = {}) {
    const params = new URLSearchParams(search);
    const get = name => {
      for (const [key, value] of params) {
        if (key.toLowerCase() === name.toLowerCase()) return value.trim();
      }
      return '';
    };
    const options = {};
    Object.entries(dataset).forEach(([key, value]) => { options[camel(key)] = value; });
    const ordinal = get('Ordinal');
    return {
      form: options.usForm || '',
      module: (options.module || '').toLowerCase(),
      userId: client.isAnonymous === true ? '' : String(client.loggedInPartyId ?? '').trim(),
      moduleId: get('ModuleID'),
      moduleOrdinal: get('ModuleOrdinal'),
      ordinal,
      mode: ordinal ? 'edit' : 'add',
      draft: get('usDraft'),
      options
    };
  }

  // Why the form cannot be drawn here, or null. spec.modules lists the
  // modules the form supports; spec.recordModules those that need a parent
  // record (ModuleID and ModuleOrdinal).
  function checkContext(spec, context) {
    if (!context.userId || !DIGITS.test(context.userId)) {
      return 'Sign in to use this form.';
    }
    if (spec.modules && !spec.modules.includes(context.module)) {
      return 'This page\'s placeholder needs data-module set to ' + spec.modules.join(', ') + '.';
    }
    if ((spec.recordModules || []).includes(context.module)) {
      if (!RECORD_ID.test(context.moduleId) || !DIGITS.test(context.moduleOrdinal)) {
        return 'This form needs ModuleID and ModuleOrdinal in its address.';
      }
    }
    if (context.ordinal && !DIGITS.test(context.ordinal)) {
      return 'The Ordinal in this form\'s address is not a number.';
    }
    return null;
  }

  // Whether a field is part of the form for this module and mode.
  function visible(field, context) {
    if (field.modes && !field.modes.includes(context.mode)) return false;
    if (field.modules && !field.modules.includes(context.module)) return false;
    if (typeof field.when === 'function' && !field.when(context)) return false;
    return true;
  }

  // A field's empty value, by type.
  function emptyValue(field) {
    if (field.type === 'select') return [];
    if (field.type === 'check' || field.type === 'toggle') return false;
    if (field.type === 'text' || field.type === 'textarea' || field.type === 'date' || field.type === 'time') return '';
    return undefined;
  }

  // The fields that hold values: the declared fields, plus the extras some
  // types carry (a text field's flag and details, a date field's time).
  function valueFields(spec, context) {
    const list = [];
    spec.fields.filter(field => field.name && field.type !== 'meta' && visible(field, context)).forEach(field => {
      list.push(field);
      if (field.flag?.name) list.push({...field.flag, type: 'toggle', owner: field.name});
      if (field.details?.name) list.push({...field.details, type: 'textarea', owner: field.name});
      if (field.time?.name) list.push({...field.time, type: 'time', owner: field.name});
    });
    return list;
  }

  function emptyValues(spec, context) {
    const values = {};
    valueFields(spec, context).forEach(field => {
      values[field.name] = field.default !== undefined
        ? (typeof field.default === 'function' ? field.default(context) : field.default)
        : emptyValue(field);
    });
    return values;
  }

  // Required fields left empty: [{name, message}].
  function validate(spec, context, values) {
    return valueFields(spec, context)
      .filter(field => field.required)
      .filter(field => {
        const value = values[field.name];
        return Array.isArray(value) ? !value.length : !String(value ?? '').trim();
      })
      .map(field => ({name: field.name, message: typeof field.required === 'string' ? field.required : 'Fill this in.'}));
  }

  // The default payload shape for one field's value.
  function payloadValue(field, value, context, values) {
    if (typeof field.toPayload === 'function') return field.toPayload(value, context, values);
    switch (field.type) {
      case 'select': {
        const items = (value || []).map(option => ({ID: option.id, Name: option.label}));
        return field.single ? (items[0] || null) : items;
      }
      case 'check':
      case 'toggle':
        return Boolean(value);
      case 'date':
        return value || null;
      case 'time':
        // A time means nothing without its date.
        return (value && values[field.owner]) ? value : null;
      default:
        return String(value ?? '').trim();
    }
  }

  // What is sent to CloudToolz: the record fields every form sends, then
  // each field by its name, then the form's own adjustments (spec.payload).
  function buildPayload(spec, context, values) {
    const payload = {
      Type: spec.type,
      ID: context.userId,
      Module: context.module,
      ModuleID: context.moduleId || null,
      ModuleOrdinal: context.moduleOrdinal || null,
      Ordinal: context.mode === 'edit' ? context.ordinal : null
    };
    valueFields(spec, context).forEach(field => {
      if (field.payload === false) return;
      payload[field.name] = payloadValue(field, values[field.name], context, values);
    });
    return typeof spec.payload === 'function' ? spec.payload(payload, context, values) : payload;
  }

  // How the popup closes after a save. saved lists the ordinals saved by
  // "save and add another" before this one.
  function savedResult(ordinal, saved = []) {
    const all = [...saved, ordinal].filter(value => value !== undefined && value !== null && value !== '');
    if (saved.length) return {saved: true, Ordinals: all};
    return all.length ? {saved: true, Ordinal: all[0]} : {saved: true};
  }

  // Cancel after "save and add another" is still a save.
  function cancelResult(saved = []) {
    return saved.length ? {saved: true, Ordinals: [...saved]} : {cancel: true};
  }

  // /api/query rows are flat alias-keyed objects; older endpoints return
  // Name/Value property lists. Read either, ignoring case.
  function column(row, name) {
    const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
    const properties = unwrap(row?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(entry => String(entry.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(row || {}).find(entry => entry.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  // IQA rows → select options, by the source's column names.
  function rowsToOptions(rows, source) {
    const seen = new Set();
    return rows.map(row => {
      const id = String(column(row, source.value) ?? '').trim();
      const option = {id, label: String(column(row, source.label) ?? '').trim()};
      if (source.parent) option.parent = String(column(row, source.parent) ?? '').trim();
      return option;
    }).filter(option => {
      if (!option.id || seen.has(option.id)) return false;
      seen.add(option.id);
      return true;
    });
  }

  // Values an IQA may return for a yes/no column.
  const truthy = value => value === true || /^(true|1|yes|y)$/i.test(String(value ?? '').trim());

  // A date column as yyyy-mm-dd, a time as hh:mm (from "14:30", "14:30:00"
  // or a datetime). Blank or the iMIS empty date gives ''.
  function dateOnly(value) {
    const match = String(value ?? '').match(/^(\d{4}-\d{2}-\d{2})/);
    return match && !match[1].startsWith('0001') ? match[1] : '';
  }

  function timeOnly(value) {
    const match = String(value ?? '').match(/(?:^|T|\s)(\d{2}):(\d{2})/);
    return match ? match[1] + ':' + match[2] : '';
  }

  // "1, 5" or "1|5" or ["1","5"] → ['1', '5'].
  function idList(value) {
    if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
    return String(value ?? '').split(/[,;|]/).map(item => item.replace(/"/g, '').trim()).filter(Boolean);
  }

  const core = {
    VERSION, FORM_FILES, readContext, checkContext, visible, valueFields, emptyValues,
    validate, buildPayload, savedResult, cancelResult, column, rowsToOptions,
    truthy, dateOnly, timeOnly, idList
  };

  if (typeof module === 'object' && module.exports) module.exports = core;
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (window.UnionSuiteForms) return; // One runtime per document.

  /* ── Browser ─────────────────────────────────────────────────── */

  const config = window.UnionSuiteFormsConfig || {};
  const specs = new Map();
  const waiting = new Map();
  const loading = new Map();

  // This file's own address: child files resolve beside it with its ?v=.
  const ownSrc = document.currentScript?.src || [...document.scripts]
    .map(script => script.src)
    .find(src => /\/UnionSuiteForms\.js(?:[?#]|$)/i.test(src || '')) || '';
  const base = ownSrc ? new URL('./', ownSrc) : null;
  const release = ownSrc ? new URL(ownSrc).searchParams.get('v') : null;

  function childUrl(file) {
    const url = new URL(file, base || location.href);
    if (release) url.searchParams.set('v', release);
    return url.href;
  }

  /* Icons: inline SVG paths (Tabler-style strokes), so the form needs no
     icon font. */
  const ICONS = {
    x: 'M18 6 6 18M6 6l12 12',
    chevron: 'm6 9 6 6 6-6',
    check: 'm5 12 5 5L20 7',
    plus: 'M12 5v14M5 12h14',
    flag: 'M5 5a5 5 0 0 1 7 0 5 5 0 0 0 7 0v9a5 5 0 0 1-7 0 5 5 0 0 0-7 0V5zM5 21v-7',
    user: 'M8 7a4 4 0 1 0 8 0 4 4 0 1 0-8 0M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2',
    briefcase: 'M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13a20 20 0 0 0 18 0',
    file: 'M14 3v4a1 1 0 0 0 1 1h4M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zM9 13h6M9 17h6',
    clock: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 3',
    alert: 'M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 8v4M12 16h.01'
  };

  function icon(name, filled = false) {
    return '<svg class="usf-icon' + (filled ? ' usf-icon--filled' : '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' +
      (ICONS[name] || ICONS.file) + '"/></svg>';
  }

  const escape = value => String(value ?? '').replace(/[&<>"']/g, ch =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[ch]);

  // Short ids for label/control pairs, unique per document.
  let idCount = 0;
  const uid = prefix => 'usf-' + prefix + '-' + (++idCount);

  /* ── iMIS and CloudToolz ──────────────────────────────────────── */

  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }

  function token() {
    const value = document.getElementById('__RequestVerificationToken')?.value;
    if (!value) throw new Error('The request verification token is unavailable.');
    return value;
  }

  // Every row of an IQA through /api/query, a page at a time. params are
  // the IQA's named filters.
  async function query(path, params = {}) {
    const rows = [];
    let offset = 0;
    while (rows.length < QUERY_MAX_ROWS) {
      const search = new URLSearchParams({QueryName: path, limit: String(QUERY_PAGE), offset: String(offset)});
      Object.entries(params).forEach(([name, value]) => {
        if (value !== undefined && value !== null && value !== '') search.set(name, String(value));
      });
      const response = await fetch('/api/query?' + search, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {Accept: 'application/json', RequestVerificationToken: token()}
      });
      if (!response.ok) throw new Error('The IQA ' + path + ' failed (HTTP ' + response.status + ').');
      const data = await response.json();
      const page = data?.Items?.$values || [];
      rows.push(...page);
      if (!data?.HasNext || !page.length) break;
      offset = Number(data.NextOffset) || offset + page.length;
    }
    return rows;
  }

  // CloudToolz: the base URL from iMIS, a short-lived ZenToken stored in
  // iMIS for CloudToolz to verify, then the call. The same sequence as
  // ActionDefinitions.js's UnionSuiteAgreements.cloudToolz, kept here so the
  // forms work without the theme.
  let cloudToolzUrl = null;

  async function cloudToolzBase() {
    if (cloudToolzUrl) return cloudToolzUrl;
    const rows = await query('$/ZENTSO/Security/CloudToolzUrl');
    const url = column(rows[0], 'Description');
    if (!url) throw new Error('The CloudToolz URL is not configured in iMIS.');
    cloudToolzUrl = String(url).replace(/\/$/, '');
    return cloudToolzUrl;
  }

  async function storeZenToken(client) {
    const property = (name, value) => ({$type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value});
    const response = await fetch('/api/ZenTokens', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', RequestVerificationToken: token()},
      body: JSON.stringify({
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: 'ZenTokens',
        Properties: {$type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', $values: [
          property('PartyId', client.loggedInPartyId),
          property('ID', client.loggedInPartyId),
          property('SelectedPartyId', client.selectedPartyId),
          property('RequestVerificationToken', token()),
          property('UtcUnixTimeStamp', Date.now())
        ]}
      })
    });
    if (!response.ok) throw new Error('The ZenToken could not be stored (HTTP ' + response.status + ').');
  }

  async function cloudToolz(path, init = {}) {
    const client = clientContext();
    const url = await cloudToolzBase();
    await storeZenToken(client);
    const response = await fetch(url + path, {
      ...init,
      headers: {
        ...(init.body ? {'Content-Type': 'application/json'} : {}),
        RequestVerificationToken: token(),
        SelectedPartyId: client.selectedPartyId,
        LoggedInPartyId: client.loggedInPartyId,
        WebsiteKey: window.gWebsiteKey || ''
      }
    });
    if (!response.ok) throw new Error('CloudToolz ' + path.split('?')[0] + ' failed (HTTP ' + response.status + ').');
    return response;
  }

  /* ── Popup ────────────────────────────────────────────────────── */

  // Closes the iMIS popup with a result (the popup form contract), or the
  // theme dialog. False when the form is not in a popup.
  function closePopup(result) {
    const radWindow = typeof window.GetRadWindow === 'function' ? window.GetRadWindow() : null;
    if (radWindow) {
      radWindow.close(result);
      return true;
    }
    try {
      if (window.parent !== window && window.parent.UnionSuiteDialog) {
        return window.parent.UnionSuiteDialog.close(window, result) !== false;
      }
    } catch (_) {
      // Not opened by a UnionSuite page.
    }
    return false;
  }

  function cancelPopup(result) {
    if (result.cancel && typeof window.CloseAndCancelRadWindow === 'function') {
      window.CloseAndCancelRadWindow();
      return true;
    }
    return closePopup(result);
  }

  /* ── Stylesheet ───────────────────────────────────────────────── */

  let sheetPromise = null;

  function stylesheet() {
    if (!sheetPromise) {
      sheetPromise = (config.stylesheet != null
        ? Promise.resolve(config.stylesheet)
        : fetch(childUrl(STYLESHEET), {credentials: 'same-origin'}).then(response => {
          if (!response.ok) throw new Error('UnionSuiteForms.css could not be loaded (HTTP ' + response.status + ').');
          return response.text();
        })
      ).then(css => {
        if (typeof CSSStyleSheet === 'function' && 'replaceSync' in CSSStyleSheet.prototype) {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          return {sheet};
        }
        return {css};
      });
    }
    return sheetPromise;
  }

  function adopt(shadow, styles) {
    if (styles.sheet) shadow.adoptedStyleSheets = [styles.sheet];
    else shadow.innerHTML = '<style>' + styles.css + '</style>';
  }

  /* ── Form definitions ─────────────────────────────────────────── */

  // A form file calls this. spec is documented in the usage guide
  // (#popup-forms): type, modules, recordModules, record, load, fields,
  // actions, again, submit, payload.
  function define(name, spec) {
    if (!name || !spec || !Array.isArray(spec.fields)) throw new Error('UnionSuiteForms.define(name, spec) needs a name and spec.fields.');
    if (specs.has(name)) {
      console.warn('[UnionSuiteForms] The form "' + name + '" is already defined; the first definition stays.');
      return specs.get(name);
    }
    const frozen = Object.freeze({...spec, name});
    specs.set(name, frozen);
    waiting.get(name)?.forEach(resolve => resolve(frozen));
    waiting.delete(name);
    return frozen;
  }

  // The form's definition, loading its file the first time.
  function formSpec(name) {
    if (specs.has(name)) return Promise.resolve(specs.get(name));
    const file = FORM_FILES[name];
    if (!file) return Promise.reject(new Error('There is no form named "' + name + '".'));
    const promise = new Promise((resolve, reject) => {
      if (!waiting.has(name)) waiting.set(name, []);
      waiting.get(name).push(resolve);
      if (loading.has(name)) return;
      const script = document.createElement('script');
      script.src = childUrl(file);
      script.async = true;
      script.addEventListener('error', () => reject(new Error(file + ' could not be loaded.')));
      script.addEventListener('load', () => {
        if (!specs.has(name)) reject(new Error(file + ' loaded but did not define the form "' + name + '".'));
      });
      loading.set(name, script);
      document.head.append(script);
    });
    return promise;
  }

  /* ── Mounting ─────────────────────────────────────────────────── */

  function datasetOf(element) {
    const data = {};
    [...element.attributes].forEach(attribute => {
      if (attribute.name.startsWith('data-')) data[attribute.name.slice(5)] = attribute.value;
    });
    return data;
  }

  async function mount(placeholder) {
    if (placeholder.hasAttribute('data-us-form-mounted')) return placeholder._usForm || null;
    placeholder.setAttribute('data-us-form-mounted', '');
    const shadow = placeholder.shadowRoot || placeholder.attachShadow({mode: 'open'});
    // config.search stands in for the address on an offline page (the
    // usage guide's examples), which has none of its own.
    const context = readContext({search: config.search ?? location.search, dataset: datasetOf(placeholder), client: clientContext()});

    let styles;
    try {
      styles = await stylesheet();
    } catch (error) {
      console.error('[UnionSuiteForms]', error);
      placeholder.textContent = 'This form could not be loaded. Reload the page to try again.';
      return null;
    }
    adopt(shadow, styles);
    shadow.append(htmlNode('<div class="usf usf--loading" role="status"><span class="usf__spinner" aria-hidden="true"></span>Loading…</div>'));

    try {
      const spec = await formSpec(context.form);
      const problem = checkContext(spec, context);
      if (problem) {
        showProblem(shadow, problem);
        return null;
      }
      const form = new Form(spec, context, shadow);
      placeholder._usForm = form;
      await form.start();
      return form;
    } catch (error) {
      console.error('[UnionSuiteForms]', error);
      showProblem(shadow, error.userMessage || 'This form could not be loaded. Reload the page to try again.');
      return null;
    }
  }

  function showProblem(shadow, message) {
    [...shadow.children].filter(child => child.tagName !== 'STYLE').forEach(child => child.remove());
    shadow.append(htmlNode('<div class="usf usf--problem"><p class="usf__alert" role="alert">' + icon('alert') + '<span>' + escape(message) + '</span></p></div>'));
  }

  function htmlNode(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstElementChild;
  }

  function mountAll(root = document) {
    return Promise.all([...root.querySelectorAll('[data-us-form]:not([data-us-form-mounted])')].map(mount));
  }

  /* ── A form ───────────────────────────────────────────────────── */

  class Form {
    constructor(spec, context, shadow) {
      this.spec = spec;
      this.context = context;
      this.shadow = shadow;
      this.values = emptyValues(spec, context);
      this.options = {};     // select name → options
      this.record = null;    // the row being edited
      this.saved = [];       // ordinals from "save and add another"
      this.busy = false;
      this.selects = {};
    }

    field(name) {
      return valueFields(this.spec, this.context).find(field => field.name === name);
    }

    // Everything the form needs before it is drawn: the record being edited,
    // the option lists, and the record line. Drawn once, all at once.
    async start() {
      const {spec, context} = this;
      if (context.mode === 'edit') {
        if (!spec.load?.query) {
          throw Object.assign(new Error('No load query'), {userMessage: 'Editing is not set up for this form yet.'});
        }
        const rows = await query(spec.load.query, spec.load.params(context));
        if (!rows.length) {
          throw Object.assign(new Error('No record'), {userMessage: 'This item could not be found. It may have been removed.'});
        }
        this.record = rows[0];
      }

      const selects = spec.fields.filter(field => field.type === 'select' && visible(field, context));
      await Promise.all(selects.filter(field => !field.dependsOn).map(field => this.loadOptions(field)));
      if (context.draft && window.UnionSuiteLoader?.ready) await window.UnionSuiteLoader.ready.catch(() => {});

      if (this.record) {
        Object.assign(this.values, spec.load.toValues(this.record, context, this.lookup.bind(this)));
      } else {
        // A default chosen by id (the signed-in user) takes the list's own
        // label once the list is loaded.
        selects.filter(field => !field.dependsOn).forEach(field => {
          this.values[field.name] = (this.values[field.name] || []).map(item =>
            this.options[field.name]?.find(option => option.id === item.id) || item);
        });
        this.applyDraft();
      }

      // Dependent lists follow what the edit filled in.
      await Promise.all(selects.filter(field => field.dependsOn).map(field => this.loadOptions(field)));
      selects.filter(field => field.dependsOn).forEach(field => {
        this.values[field.name] = this.keepKnown(field.name, this.values[field.name]);
      });

      this.recordLine = await this.loadRecordLine();
      this.draw();
    }

    // Options for a select from its IQA. A source with no query (not set
    // up yet) gives an empty list, with one console note.
    async loadOptions(field) {
      const source = typeof field.source === 'function' ? field.source(this.context) : field.source;
      if (!source?.query) {
        if (!field.dependsOn || this.values[field.dependsOn]?.length) {
          console.info('[UnionSuiteForms] ' + this.spec.name + ': "' + field.name + '" has no IQA set yet.');
        }
        this.options[field.name] = [];
        return;
      }
      if (field.dependsOn && !this.values[field.dependsOn]?.length) {
        this.options[field.name] = [];
        return;
      }
      const params = source.params ? source.params(this.context, this.values) : {};
      try {
        const options = rowsToOptions(await query(source.query, params), source);
        if (field.dependsOn) {
          // A child shows its parent's name: "Bargaining › Offer response".
          const parents = this.options[field.dependsOn] || [];
          options.forEach(option => {
            option.parentLabel = parents.find(parent => parent.id === option.parent)?.label || '';
          });
        }
        this.options[field.name] = options;
      } catch (error) {
        console.error('[UnionSuiteForms]', error);
        this.options[field.name] = [];
        this.loadFailed = true;
      }
    }

    // For a form's toValues: options by id from a loaded list, keeping an
    // unknown id as {id, label} (a staff member no longer on the list).
    lookup(name, ids, labels = []) {
      const list = this.options[name] || [];
      return idList(ids).map((id, index) => {
        const found = list.find(option => option.id === id);
        if (found) return found;
        const added = {id, label: labels[index] || id};
        if (!this.field(name)?.dependsOn) list.push(added);
        return added;
      });
    }

    // A dependent select keeps only the chosen items its list still has.
    keepKnown(name, selected) {
      const list = this.options[name] || [];
      return (selected || []).map(item => list.find(option => option.id === item.id)).filter(Boolean);
    }

    // The composer's draft, when the theme handed one over (usDraft): each
    // field's draft name (default its own name) from the draft's values.
    // The theme takes the draft as zUnionSuite.js starts; start() waits for
    // the loader's ready before calling this when the address has usDraft.
    applyDraft() {
      let draft = null;
      try { draft = window.UnionSuiteComposers?.received?.()?.values || null; } catch (_) {}
      if (!draft) return;
      valueFields(this.spec, this.context).forEach(field => {
        const value = draft[field.draft || field.name];
        if (value === undefined || value === null || value === '') return;
        if (field.type === 'text' || field.type === 'textarea') this.values[field.name] = String(value);
        else if (field.type === 'date') this.values[field.name] = dateOnly(value);
        else if (field.type === 'time') this.values[field.name] = timeOnly(value);
        else if (field.type === 'check' || field.type === 'toggle') this.values[field.name] = truthy(value);
      });
    }

    async loadRecordLine() {
      const line = typeof this.spec.record === 'function' ? this.spec.record(this.context) : null;
      if (!line) return null;
      const recordQuery = this.context.options.recordQuery;
      if (recordQuery && this.context.moduleId && !line.detail) {
        try {
          const rows = await query(recordQuery, {ModuleID: this.context.moduleId});
          line.detail = String(column(rows[0], 'Name') ?? '').trim();
        } catch (error) {
          console.error('[UnionSuiteForms]', error);
        }
      }
      return line;
    }

    /* ── Drawing ──────────────────────────────────────────────── */

    // Whether a field is drawn. A hideWhenEmpty list that came back empty
    // can never fill (no task tags set up), so it is left out, and so is a
    // list that depends on one left out.
    drawn(field) {
      if (!visible(field, this.context)) return false;
      if (field.type === 'select' && field.hideWhenEmpty && !field.dependsOn) {
        return (this.options[field.name] || []).length > 0;
      }
      if (field.dependsOn) {
        const parent = this.spec.fields.find(item => item.name === field.dependsOn);
        return parent ? this.drawn(parent) : true;
      }
      return true;
    }

    draw() {
      const {spec, context} = this;
      const fields = spec.fields.filter(field => this.drawn(field));
      const parts = [];
      for (let index = 0; index < fields.length; index++) {
        const field = fields[index];
        if (field.row) {
          const row = [field];
          while (fields[index + 1]?.row === field.row) row.push(fields[++index]);
          parts.push('<div class="usf__row" data-row="' + escape(field.row) + '">' + row.map(item => this.fieldHtml(item)).join('') + '</div>');
        } else {
          parts.push(this.fieldHtml(field));
        }
      }
      const edit = context.mode === 'edit';
      const actions = spec.actions || {};
      const again = !edit && actions.again;
      const html = '<div class="usf" data-form="' + escape(spec.name) + '" data-mode="' + context.mode + '">' +
        '<div class="usf__body">' + parts.join('') +
        '<p class="usf__alert" role="alert" data-alert hidden></p>' +
        (this.loadFailed ? '<p class="usf__alert" role="status">' + icon('alert') + '<span>Some lists could not be loaded. Reload to try again.</span></p>' : '') +
        '</div>' +
        '<footer class="usf__foot">' +
          '<span class="usf__hint" data-hint><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to save</span>' +
          (again ? '<span class="usf__saved" role="status" data-saved hidden>' + icon('check') + '<span></span></span>' : '') +
          '<button type="button" class="usf__button" data-cancel>' + escape(actions.cancel || 'Cancel') + '</button>' +
          (again ? '<button type="button" class="usf__button" data-again>' + escape(actions.again) + '</button>' : '') +
          '<button type="button" class="usf__button usf__button--primary" data-save>' +
            escape((edit ? actions.saveEdit : actions.save) || 'Save') + '</button>' +
        '</footer></div>';
      this.shadow.querySelector('.usf')?.remove();
      this.shadow.append(htmlNode(html));
      this.root = this.shadow.querySelector('.usf');
      this.wire();
    }

    label(field, id, tag = 'label') {
      const marker = field.required
        ? ' <span class="usf__required" aria-hidden="true">*</span>'
        : field.optional ? ' <span class="usf__optional">(optional)</span>' : '';
      const target = tag === 'label' ? ' for="' + id + '"' : ' id="' + id + '-label"';
      return '<' + tag + ' class="usf__label"' + target + '>' + escape(field.label) + marker + '</' + tag + '>';
    }

    fieldHtml(field) {
      const id = uid(field.name || field.type);
      field._id = id;
      switch (field.type) {
        case 'record': return this.recordHtml();
        case 'text': return this.textHtml(field, id);
        case 'textarea': return this.textareaHtml(field, id);
        case 'date': return this.dateHtml(field, id);
        case 'select': return this.selectHtml(field, id);
        case 'check': return this.checkHtml(field, id);
        case 'meta': return '<p class="usf__meta" data-meta="' + escape(field.name || '') + '">' +
          escape(typeof field.text === 'function' ? field.text(this.context, this.record) : field.text || '') + '</p>';
        default:
          console.warn('[UnionSuiteForms] Unknown field type "' + field.type + '".');
          return '';
      }
    }

    recordHtml() {
      const line = this.recordLine;
      if (!line) return '';
      return '<p class="usf__record">' + icon(line.icon || 'file') + '<span class="usf__record-text"><strong>' +
        escape(line.label) + '</strong>' + (line.detail ? ' · ' + escape(line.detail) : '') + '</span></p>';
    }

    errorHtml(field, id) {
      return '<p class="usf__error" id="' + id + '-error" data-error="' + escape(field.name) + '" hidden></p>';
    }

    textHtml(field, id) {
      const flag = field.flag;
      const on = flag && this.values[flag.name];
      return '<div class="usf__field" data-field="' + escape(field.name) + '">' +
        '<div class="usf__head">' + this.label(field, id) +
          (flag?.badge ? '<span class="usf__badge" aria-hidden="true">' + escape(flag.badge) + '</span>' : '') + '</div>' +
        '<div class="usf__title-row">' +
          '<input class="usf__input' + (field.size === 'large' ? ' usf__input--large' : '') + '" id="' + id + '" type="text" autocomplete="off"' +
            ' data-name="' + escape(field.name) + '" placeholder="' + escape(field.placeholder || '') + '"' +
            (field.required ? ' aria-required="true"' : '') + ' aria-describedby="' + id + '-error">' +
          (flag ? '<button type="button" class="usf__flag" aria-pressed="' + Boolean(on) + '" aria-label="' + escape(flag.label) +
            '" title="' + escape(flag.label) + '" data-flag="' + escape(flag.name) + '">' + icon('flag') + icon('flag', true) + '</button>' : '') +
        '</div>' + this.errorHtml(field, id) +
        (field.details ? this.detailsHtml(field.details) : '') +
      '</div>';
    }

    // A textarea behind a link (text field's details), or on its own.
    detailsHtml(details) {
      const id = uid(details.name);
      details._id = id;
      const open = Boolean(String(this.values[details.name] ?? '').trim());
      return '<button type="button" class="usf__link" aria-expanded="' + open + '" aria-controls="' + id + '-wrap" data-reveal-link="' + escape(details.name) + '"' +
        (open ? ' hidden' : '') + '>' + icon('plus') + ' ' + escape(details.link || 'Add details') + '</button>' +
        '<div class="usf__reveal"' + (open ? ' data-settled' : ' data-closed inert') + ' id="' + id + '-wrap" data-reveal="' + escape(details.name) + '"><div>' +
          this.textareaHtml({...details, type: 'textarea'}, id, true) +
        '</div></div>';
    }

    textareaHtml(field, id, inset = false) {
      return '<div class="usf__field' + (inset ? ' usf__field--inset' : '') + '" data-field="' + escape(field.name) + '">' + this.label(field, id) +
        '<textarea class="usf__textarea' + (field.short ? ' usf__textarea--short' : '') + '" id="' + id + '" data-name="' + escape(field.name) + '"' +
          ' placeholder="' + escape(field.placeholder || '') + '" aria-describedby="' + id + '-error"></textarea>' +
        this.errorHtml(field, id) + '</div>';
    }

    dateHtml(field, id) {
      const time = field.time;
      const timeId = time ? uid(time.name) : '';
      const quick = (field.quick || []).map(item =>
        '<button type="button" data-days="' + Number(item.days) + '">' + escape(item.label) + '</button>').join('');
      return '<div class="usf__field" data-field="' + escape(field.name) + '">' + this.label(field, id) +
        '<div class="usf__due">' +
          '<input class="usf__input" id="' + id + '" type="date" data-name="' + escape(field.name) + '" aria-describedby="' + id + '-error">' +
          (time ? '<input class="usf__input usf__time" id="' + timeId + '" type="time" step="' + Number(time.step || 900) + '" data-name="' + escape(time.name) +
            '" aria-label="' + escape(time.label || 'Time') + '" hidden>' : '') +
        '</div>' +
        '<div class="usf__quick" role="group" aria-label="Quick dates" data-quick="' + escape(field.name) + '">' + quick +
          (time ? '<button type="button" class="usf__quiet" data-add-time hidden>' + icon('clock') + ' ' + escape(time.add || 'Add time') + '</button>' : '') +
          '<button type="button" class="usf__quiet" data-clear-date hidden>' + icon('x') + ' ' + escape(field.clear || 'Clear date') + '</button>' +
        '</div>' + this.errorHtml(field, id) + '</div>';
    }

    selectHtml(field, id) {
      const html = '<div class="usf__field" data-field="' + escape(field.name) + '">' + this.label(field, id, 'span') +
        '<div class="usf__select" data-select="' + escape(field.name) + '" aria-labelledby="' + id + '-label"></div>' +
        this.errorHtml(field, id) + '</div>';
      if (!field.hideWhenEmpty) return html;
      // Shown only while its list has options (owner, 20 October 2026: a
      // dependent list fades in when the chosen parents have children).
      const open = (this.options[field.name] || []).length > 0;
      return '<div class="usf__reveal"' + (open ? ' data-settled' : ' data-closed inert') + ' data-reveal="' + escape(field.name) + '"><div>' + html + '</div></div>';
    }

    checkHtml(field, id) {
      return '<label class="usf__check" data-field="' + escape(field.name) + '">' +
        '<input type="checkbox" id="' + id + '" data-name="' + escape(field.name) + '">' +
        '<span class="usf__box" aria-hidden="true">' + icon('check') + '</span>' + escape(field.label) + '</label>';
    }

    /* ── Behaviour ────────────────────────────────────────────── */

    $(selector) {
      return this.root.querySelector(selector);
    }

    wire() {
      const {root} = this;

      // Text, textarea, date, time and checkbox inputs mirror into values.
      root.querySelectorAll('[data-name]').forEach(input => {
        const name = input.dataset.name;
        const value = this.values[name];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = value ?? '';
        input.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => {
          this.values[name] = input.type === 'checkbox' ? input.checked : input.value;
          this.clearError(name);
          this.sync();
        });
      });

      root.querySelectorAll('[data-flag]').forEach(button => {
        button.addEventListener('click', () => {
          const name = button.dataset.flag;
          this.values[name] = !this.values[name];
          this.sync();
        });
      });

      root.querySelectorAll('[data-reveal-link]').forEach(link => {
        link.addEventListener('click', () => {
          const name = link.dataset.revealLink;
          this.reveal(name, true);
          link.hidden = true;
          link.setAttribute('aria-expanded', 'true');
          this.$('[data-name="' + name + '"]')?.focus();
        });
      });

      root.querySelectorAll('[data-quick]').forEach(group => this.wireDate(group));

      this.spec.fields.filter(field => field.type === 'select' && this.drawn(field)).forEach(field => {
        const element = this.$('[data-select="' + field.name + '"]');
        if (element) this.selects[field.name] = new Select(this, field, element);
      });

      this.$('[data-save]').addEventListener('click', () => this.save(false));
      this.$('[data-again]')?.addEventListener('click', () => this.save(true));
      this.$('[data-cancel]').addEventListener('click', () => {
        if (!cancelPopup(cancelResult(this.saved))) this.status('Cancelled. Nothing more was saved.');
      });
      root.addEventListener('keydown', event => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          this.save(false);
        } else if (event.key === 'Enter' && event.target.matches?.('input[type="text"]')) {
          // Enter in a one-line field does nothing: the iMIS page is one
          // form, and the shadow root keeps it from submitting that, but a
          // stray Enter should not save either.
          event.preventDefault();
        }
      });

      this.sync();
      if (this.context.mode === 'add') this.$('[data-name]')?.focus();
    }

    wireDate(group) {
      const name = group.dataset.quick;
      const field = this.field(name);
      const date = this.$('input[data-name="' + name + '"]');
      const time = field.time ? this.$('input[data-name="' + field.time.name + '"]') : null;
      this.timeShown = Boolean(time && this.values[field.time.name]);
      group.addEventListener('click', event => {
        const button = event.target.closest('button');
        if (!button) return;
        if (button.hasAttribute('data-add-time')) {
          this.timeShown = true;
          this.sync();
          time.focus();
          return;
        }
        if (button.hasAttribute('data-clear-date')) {
          this.values[name] = '';
        } else {
          const day = new Date();
          day.setDate(day.getDate() + Number(button.dataset.days));
          const pad = number => String(number).padStart(2, '0');
          this.values[name] = day.getFullYear() + '-' + pad(day.getMonth() + 1) + '-' + pad(day.getDate());
        }
        date.value = this.values[name];
        this.clearError(name);
        this.sync();
      });
      time?.addEventListener('blur', () => {
        if (!time.value) {
          this.timeShown = false;
          this.sync();
        }
      });
    }

    // Keeps every derived state in step with the values: flags, the
    // high-priority badge, completed strike-through, date controls.
    sync() {
      const {root, spec} = this;
      valueFields(spec, this.context).forEach(field => {
        if (field.type === 'toggle') {
          const on = Boolean(this.values[field.name]);
          root.querySelector('[data-flag="' + field.name + '"]')?.setAttribute('aria-pressed', String(on));
          root.toggleAttribute('data-flagged', on);
        }
        if (field.type === 'check' && field.strikes) {
          root.querySelector('[data-field="' + field.strikes + '"]')?.toggleAttribute('data-done', Boolean(this.values[field.name]));
        }
        if (field.type === 'date') {
          const hasDate = Boolean(this.values[field.name]);
          root.querySelector('[data-quick="' + field.name + '"] [data-clear-date]')?.toggleAttribute('hidden', !hasDate);
          if (field.time) {
            if (!hasDate) {
              this.values[field.time.name] = '';
              this.timeShown = false;
            }
            const time = root.querySelector('input[data-name="' + field.time.name + '"]');
            if (time) {
              time.value = this.values[field.time.name] || '';
              time.hidden = !this.timeShown;
            }
            root.querySelector('[data-quick="' + field.name + '"] [data-add-time]')?.toggleAttribute('hidden', !hasDate || this.timeShown);
          }
        }
      });
    }

    // Slides a [data-reveal] section open or shut: clipped while it moves,
    // then free for a dropdown to spill out. Hidden sections are inert.
    reveal(name, open) {
      const section = this.$('[data-reveal="' + name + '"]');
      if (!section) return;
      clearTimeout(section._settle);
      section.toggleAttribute('data-closed', !open);
      section.toggleAttribute('inert', !open);
      if (!open) section.removeAttribute('data-settled');
      else section._settle = setTimeout(() => section.setAttribute('data-settled', ''), 240);
    }

    // A select changed: dependent selects reload and keep what still fits.
    async selectChanged(name) {
      this.clearError(name);
      const dependents = this.spec.fields.filter(field => field.dependsOn === name && visible(field, this.context));
      for (const field of dependents) {
        await this.loadOptions(field);
        this.values[field.name] = this.keepKnown(field.name, this.values[field.name]);
        this.selects[field.name]?.draw();
        if (field.hideWhenEmpty) this.reveal(field.name, this.options[field.name].length > 0);
      }
    }

    showErrors(errors) {
      errors.forEach(({name, message}) => {
        const error = this.$('[data-error="' + name + '"]');
        if (error) {
          error.innerHTML = icon('alert') + '<span>' + escape(message) + '</span>';
          error.hidden = false;
        }
        this.$('[data-field="' + name + '"]')?.setAttribute('data-invalid', '');
        this.$('[data-name="' + name + '"]')?.setAttribute('aria-invalid', 'true');
      });
      const first = errors[0] && (this.$('[data-name="' + errors[0].name + '"]') || this.$('[data-select="' + errors[0].name + '"] button'));
      first?.focus();
    }

    clearError(name) {
      const error = this.$('[data-error="' + name + '"]');
      if (error) error.hidden = true;
      this.$('[data-field="' + name + '"]')?.removeAttribute('data-invalid');
      this.$('[data-name="' + name + '"]')?.removeAttribute('aria-invalid');
    }

    alert(message) {
      const alert = this.$('[data-alert]');
      alert.innerHTML = message ? icon('alert') + '<span>' + escape(message) + '</span>' : '';
      alert.hidden = !message;
    }

    status(message) {
      const saved = this.$('[data-saved]');
      if (!saved) {
        this.alert(message);
        return;
      }
      saved.querySelector('span').textContent = message;
      saved.hidden = false;
      this.$('[data-hint]').hidden = true;
    }

    setBusy(busy, button) {
      this.busy = busy;
      this.root.querySelectorAll('.usf__foot button').forEach(item => { item.disabled = busy; });
      if (button) {
        if (busy) {
          button.dataset.label = button.textContent;
          button.textContent = 'Saving…';
        } else if (button.dataset.label) {
          button.textContent = button.dataset.label;
        }
      }
      this.root.toggleAttribute('data-busy', busy);
    }

    async save(again) {
      if (this.busy) return;
      const {spec, context} = this;
      this.alert('');
      const errors = validate(spec, context, this.values);
      if (errors.length) {
        this.showErrors(errors);
        return;
      }
      const path = spec.submit?.path;
      if (!path) {
        console.info('[UnionSuiteForms] ' + spec.name + ' would send:', buildPayload(spec, context, this.values));
        this.alert('Saving is not set up for this form yet.');
        return;
      }
      const button = this.$(again ? '[data-again]' : '[data-save]');
      this.setBusy(true, button);
      let ordinal = null;
      try {
        const response = await cloudToolz(path, {method: 'POST', body: JSON.stringify(buildPayload(spec, context, this.values))});
        const data = await response.json().catch(() => ({}));
        ordinal = column(data, 'Ordinal') ?? null;
      } catch (error) {
        console.error('[UnionSuiteForms]', error);
        this.setBusy(false, button);
        this.alert(spec.submit.failed || 'This could not be saved. Try again.');
        return;
      }
      this.setBusy(false, button);

      if (again) {
        this.saved.push(ordinal);
        this.startAgain();
        return;
      }
      if (!closePopup(savedResult(ordinal, this.saved))) {
        // Not in a popup: say so and, when adding, start a fresh one.
        this.saved.push(ordinal);
        if (context.mode === 'add') this.startAgain();
        else this.status('Saved.');
      }
    }

    // After "save and add another": clear what spec.again.clear names (by
    // default everything but spec.again.keep), say what saved, focus the
    // first field.
    startAgain() {
      const {spec, context} = this;
      const keep = spec.again?.keep || [];
      const first = valueFields(spec, context)[0];
      const savedText = String(this.values[first?.name] ?? '').trim();
      const fresh = emptyValues(spec, context);
      valueFields(spec, context).forEach(field => {
        if (!keep.includes(field.name) && !keep.includes(field.owner)) this.values[field.name] = fresh[field.name];
      });
      this.root.querySelectorAll('[data-name]').forEach(input => {
        const value = this.values[input.dataset.name];
        if (input.type === 'checkbox') input.checked = Boolean(value);
        else input.value = value ?? '';
      });
      this.root.querySelectorAll('[data-reveal-link]').forEach(link => {
        const name = link.dataset.revealLink;
        if (keep.includes(name)) return;
        this.reveal(name, false);
        link.hidden = false;
        link.setAttribute('aria-expanded', 'false');
      });
      Object.values(this.selects).forEach(select => select.draw());
      this.sync();
      const short = savedText.length > 40 ? savedText.slice(0, 40) + '…' : savedText;
      this.status(short ? 'Saved “' + short + '”. Add the next one.' : 'Saved. Add the next one.');
      this.$('[data-name]')?.focus();
    }
  }

  /* ── Select: chips in the control, a searchable list below ─────── */

  class Select {
    constructor(form, field, element) {
      this.form = form;
      this.field = field;
      this.element = element;
      this.open = false;
      this.listId = uid('list');
      element.addEventListener('click', event => this.click(event));
      element.addEventListener('input', event => {
        if (event.target.matches('.usf__search')) this.drawList(event.target.value);
      });
      element.addEventListener('keydown', event => this.key(event));
      // Close on a click anywhere else, inside the form or out.
      document.addEventListener('click', event => {
        if (this.open && !event.composedPath().includes(element)) this.close(false);
      });
      this.draw();
    }

    get options() {
      return this.form.options[this.field.name] || [];
    }

    get selected() {
      return this.form.values[this.field.name] || [];
    }

    set selected(list) {
      this.form.values[this.field.name] = list;
    }

    optionLabel(option) {
      return (option.parentLabel ? '<span class="usf__option-parent">' + escape(option.parentLabel) + ' ›&nbsp;</span>' : '') + escape(option.label);
    }

    draw() {
      const {field} = this;
      const options = this.options;
      const disabled = !options.length;
      const open = this.open && !disabled;
      const chips = this.selected.map(option =>
        '<span class="usf__chip">' + this.optionLabel(option) +
        '<button type="button" class="usf__chip-remove" data-remove="' + escape(option.id) + '" aria-label="Remove ' + escape(option.label) + '">' + icon('x') + '</button></span>').join('');
      const empty = !this.selected.length;
      const placeholder = disabled ? (field.unavailable || 'None available') : (field.emptyText || 'Choose…');
      this.element.toggleAttribute('data-disabled', disabled);
      this.element.toggleAttribute('data-open', open);
      this.element.innerHTML =
        '<div class="usf__control">' + chips +
          '<button type="button" class="usf__toggle" aria-haspopup="listbox" aria-expanded="' + open + '" aria-controls="' + this.listId + '"' +
            (disabled ? ' disabled' : '') + ' aria-label="' + escape(field.label) + '">' +
            '<span>' + (empty ? escape(placeholder) : '') + '</span>' + icon('chevron') + '</button></div>' +
        (open ? '<div class="usf__panel">' +
          (field.search !== false ? '<input class="usf__search" type="search" placeholder="Search" aria-label="Search ' + escape(field.label) + '" aria-controls="' + this.listId + '">' : '') +
          '<div role="listbox" id="' + this.listId + '"' + (field.single ? '' : ' aria-multiselectable="true"') + ' data-list></div></div>' : '');
      if (open) this.drawList('');
    }

    drawList(text) {
      const list = this.element.querySelector('[data-list]');
      const needle = text.trim().toLowerCase();
      const matches = this.options.filter(option =>
        (option.label + ' ' + (option.parentLabel || '')).toLowerCase().includes(needle));
      const chosen = new Set(this.selected.map(option => option.id));
      list.innerHTML = matches.length ? matches.map(option =>
        '<button type="button" class="usf__option" role="option" data-id="' + escape(option.id) + '" aria-selected="' + chosen.has(option.id) + '">' +
          (this.field.single ? '' : '<span class="usf__box" aria-hidden="true">' + icon('check') + '</span>') +
          '<span>' + this.optionLabel(option) + '</span>' +
          (this.field.single ? '<span class="usf__tick" aria-hidden="true">' + icon('check') + '</span>' : '') +
        '</button>').join('') : '<p class="usf__empty">No matches</p>';
    }

    close(focus) {
      this.open = false;
      this.draw();
      if (focus) this.element.querySelector('.usf__toggle')?.focus();
    }

    changed() {
      this.form.selectChanged(this.field.name);
    }

    click(event) {
      const remove = event.target.closest('[data-remove]');
      const choice = event.target.closest('[data-id]');
      if (remove) {
        this.selected = this.selected.filter(option => option.id !== remove.dataset.remove);
        this.draw();
        this.element.querySelector('.usf__toggle')?.focus();
        this.changed();
        return;
      }
      if (choice) {
        const option = this.options.find(item => item.id === choice.dataset.id);
        if (this.field.single) {
          this.selected = option ? [option] : [];
          this.close(true);
        } else {
          const on = this.selected.some(item => item.id === option.id);
          this.selected = on ? this.selected.filter(item => item.id !== option.id) : [...this.selected, option];
          const search = this.element.querySelector('.usf__search')?.value || '';
          this.draw();
          const box = this.element.querySelector('.usf__search');
          if (box) box.value = search;
          this.drawList(search);
          this.element.querySelector('[data-id="' + CSS.escape(option.id) + '"]')?.focus();
        }
        this.changed();
        return;
      }
      if (event.target.closest('.usf__control') && !this.element.hasAttribute('data-disabled')) {
        this.open = !this.open;
        this.draw();
        (this.element.querySelector('.usf__search') || this.element.querySelector('.usf__option'))?.focus();
      }
    }

    // Down and Up move through the list (from the search box into it),
    // Escape closes it and returns to the control.
    key(event) {
      if (!this.open) {
        // Enter and Space press the toggle button, which opens the list.
        if (event.key === 'ArrowDown' && event.target.matches('.usf__toggle')) {
          event.preventDefault();
          this.open = true;
          this.draw();
          (this.element.querySelector('.usf__search') || this.element.querySelector('.usf__option'))?.focus();
        }
        return;
      }
      const items = [...this.element.querySelectorAll('.usf__option')];
      const index = items.indexOf(event.target);
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        this.close(true);
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        items[Math.min(index + 1, items.length - 1)]?.focus();
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (index <= 0) (this.element.querySelector('.usf__search') || items[0])?.focus();
        else items[index - 1].focus();
      } else if (event.key === 'Enter' && event.target.matches('.usf__search')) {
        event.preventDefault();
        items[0]?.click();
      }
    }
  }

  /* ── Start ────────────────────────────────────────────────────── */

  window.UnionSuiteForms = Object.freeze({
    version: VERSION,
    define,
    mount,
    mountAll,
    // For form files and tests: the pure helpers and the shared calls.
    core,
    query,
    cloudToolz,
    icon
  });

  // Placeholders on the page now, and any added later (a partial refresh).
  const start = () => {
    mountAll();
    new MutationObserver(() => {
      if (document.querySelector('[data-us-form]:not([data-us-form-mounted])')) mountAll();
    }).observe(document.documentElement, {childList: true, subtree: true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
