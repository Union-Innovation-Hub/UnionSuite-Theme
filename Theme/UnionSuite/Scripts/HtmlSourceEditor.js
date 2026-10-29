/* =============================================================================
 * UnionSuite HTML source editor — shared helper
 * -----------------------------------------------------------------------------
 * Tools for editing HTML as source text in iMIS: syntax highlighting, a
 * formatter, open/close tag pairing with unpaired-tag warnings, and {#…} field
 * suggestions. Registers window.UnionSuiteHtmlSource; it attaches nothing by
 * itself. Page scripts call attach() or attachRadEditor() where they want it.
 *
 * Styles are in zUnionSuite.css (US-HTML-SOURCE) and dark values in
 * zzDarkMode.css. Deploy the three together.
 *
 *   const api = window.UnionSuiteHtmlSource;
 *
 *   // A RadEditor's HTML view. fieldTool names the insert-field dropdown whose
 *   // items supply suggestions; 'auto' finds any tool whose items are {#…}
 *   // placeholders; null turns suggestions off.
 *   const editor = api.attachRadEditor(radEditorElement, { fieldTool: 'auto' });
 *
 *   // Any other HTML textarea. fields() returns the suggestion list or null.
 *   const source = api.attach(textarea, { fields: () => null });
 *
 *   editor.dispose();      // restores the textarea and removes every addition
 *
 *   api.format(html);      // formatter only, no DOM
 *   api.tagPairs(html);    // pairing and unpaired-tag problems, no DOM
 *
 * The file loads in Node for tests: module.exports is the same API, and none
 * of the pure functions touch the DOM.
 *
 * If the helper loads after a page script that wants it, that script can
 * listen once for the "unionsuite:html-source-ready" document event.
 * ========================================================================== */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
    return;
  }
  if (root.UnionSuiteHtmlSource) return; // One copy per document.
  root.UnionSuiteHtmlSource = api;
  root.document?.dispatchEvent(new CustomEvent('unionsuite:html-source-ready'));
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const VERSION = '1.0.0';

  const VOID = new Set('area base br col embed hr img input keygen link meta param source track wbr'.split(' '));
  const INLINE = new Set(('a abbr acronym b bdi bdo big br button cite code data dfn em font i img input kbd label '
    + 'mark meter output progress q ruby s samp select small span strike strong sub sup time tt u var wbr').split(' '));
  // Content inside these is kept exactly as written.
  const RAW = new Set(['script', 'style', 'pre', 'textarea']);
  // HTML lets these be left open, so an open one is not reported.
  const OPTIONAL_CLOSE = new Set(('body caption colgroup dd dt head html li optgroup option p rp rt tbody td tfoot '
    + 'th thead tr').split(' '));
  const TAG = /<(\/?)([A-Za-z!?][^\s\/>]*)/y;
  const ATTRIBUTE_PART = /(\s+)|("[^"]*"?|'[^']*'?)|(=)|([^\s"'=<>\/]+)|([\s\S])/y;
  const PLACEHOLDER_VALUE = /^\{#([\w.]+)\}$/;

  /* ---- highlighting ------------------------------------------------------ */
  // Placeholders are marked wherever they appear, including inside attribute
  // values such as href="mailto:{#query.PreferredEmail}".
  function splitText(text, type, out) {
    const pattern = type === 'value'
      ? /\{#[\w.]*\}?/g
      : /\{#[\w.]*\}?|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi;
    let at = 0;
    for (const match of text.matchAll(pattern)) {
      if (match.index > at) out.push({ text: text.slice(at, match.index), type });
      out.push({ text: match[0], type: match[0][0] === '&' ? 'entity' : 'placeholder' });
      at = match.index + match[0].length;
    }
    if (at < text.length) out.push({ text: text.slice(at), type });
  }

  // Splits source into typed runs whose texts join back into the source.
  // Types: '' (plain), punct, tag, attr, value, comment, entity, placeholder.
  function tokens(src) {
    const out = [];
    const lower = src.toLowerCase();
    let i = 0;
    while (i < src.length) {
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        const next = end < 0 ? src.length : end + 3;
        out.push({ text: src.slice(i, next), type: 'comment' });
        i = next;
        continue;
      }
      TAG.lastIndex = i;
      const tag = TAG.exec(src);
      if (tag) {
        out.push({ text: '<' + tag[1], type: 'punct' }, { text: tag[2], type: 'tag' });
        i = TAG.lastIndex;
        let afterEquals = false;
        while (i < src.length && src[i] !== '>' && !src.startsWith('/>', i)) {
          ATTRIBUTE_PART.lastIndex = i;
          const [part, space, quoted, equals, word] = ATTRIBUTE_PART.exec(src);
          if (space) out.push({ text: part, type: '' });
          else if (quoted) { splitText(part, 'value', out); afterEquals = false; }
          else if (equals) { out.push({ text: part, type: 'punct' }); afterEquals = true; }
          else if (word) { out.push({ text: part, type: afterEquals ? 'value' : 'attr' }); afterEquals = false; }
          else out.push({ text: part, type: 'punct' });
          i += part.length;
        }
        if (src.startsWith('/>', i)) { out.push({ text: '/>', type: 'punct' }); i += 2; }
        else if (src[i] === '>') { out.push({ text: '>', type: 'punct' }); i++; }
        const name = tag[2].toLowerCase();
        if (!tag[1] && (name === 'script' || name === 'style')) {
          const close = lower.indexOf('</' + name, i);
          const stop = close < 0 ? src.length : close;
          if (stop > i) out.push({ text: src.slice(i, stop), type: '' });
          i = stop;
        }
        continue;
      }
      const next = src.indexOf('<', i + 1);
      const stop = next < 0 ? src.length : next;
      splitText(src.slice(i, stop), '', out);
      i = stop;
    }
    return out;
  }

  /* ---- structure --------------------------------------------------------- */
  function tagEnd(src, i) {
    let quote = '';
    for (let j = i + 1; j < src.length; j++) {
      const c = src[j];
      if (quote) { if (c === quote) quote = ''; }
      else if (c === '"' || c === "'") quote = c;
      else if (c === '>') return j + 1;
    }
    return src.length;
  }

  // Collapses whitespace between attributes; quoted values are untouched.
  function normaliseTag(text) {
    let out = '', quote = '', space = false;
    for (const c of text) {
      if (quote) { out += c; if (c === quote) quote = ''; continue; }
      if (/\s/.test(c)) { space = true; continue; }
      if (space && c !== '>') out += ' ';
      space = false;
      out += c;
      if (c === '"' || c === "'") quote = c;
    }
    return out;
  }

  // Source split into comment, open, close, void, decl, raw and text parts,
  // each with its start and end offsets.
  function parts(src) {
    const out = [];
    const lower = src.toLowerCase();
    let i = 0;
    while (i < src.length) {
      if (src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        const next = end < 0 ? src.length : end + 3;
        out.push({ kind: 'comment', text: src.slice(i, next), start: i, end: next });
        i = next;
        continue;
      }
      TAG.lastIndex = i;
      const tag = TAG.exec(src);
      if (tag) {
        const end = tagEnd(src, i);
        const at = { start: i, end };
        const text = normaliseTag(src.slice(i, end));
        const name = tag[2].toLowerCase();
        if (tag[1]) out.push({ kind: 'close', name, text, ...at });
        else if (/^[!?]/.test(name)) out.push({ kind: 'decl', name, text, ...at });
        else if (VOID.has(name) || text.endsWith('/>')) out.push({ kind: 'void', name, text, ...at });
        else {
          out.push({ kind: 'open', name, text, ...at });
          if (RAW.has(name)) {
            const close = lower.indexOf('</' + name, end);
            const stop = close < 0 ? src.length : close;
            out.push({ kind: 'raw', text: src.slice(end, stop), start: end, end: stop });
            i = stop;
            continue;
          }
        }
        i = end;
        continue;
      }
      const next = src.indexOf('<', i + 1);
      const stop = next < 0 ? src.length : next;
      out.push({ kind: 'text', text: src.slice(i, stop), start: i, end: stop });
      i = stop;
    }
    return out;
  }

  // An end tag closes the nearest open element of the same name, as a browser
  // would. One with no open match is kept where it was.
  function tree(list) {
    const top = { kind: 'root', children: [] };
    const stack = [top];
    for (const part of list) {
      const parent = stack[stack.length - 1];
      if (part.kind === 'open') {
        const node = { ...part, children: [], close: null };
        parent.children.push(node);
        stack.push(node);
      } else if (part.kind === 'close') {
        let depth = stack.length - 1;
        while (depth > 0 && stack[depth].name !== part.name) depth--;
        if (depth > 0) { stack[depth].close = part.text; stack.length = depth; }
        else parent.children.push({ kind: 'stray', name: part.name, text: part.text });
      } else parent.children.push(part);
    }
    return top;
  }

  /* ---- formatting -------------------------------------------------------- */
  /* Re-indents without re-parsing into a DOM: tags and attributes stay as
     written (whitespace between attributes aside), no missing end tags are
     added and nothing is reordered. Only whitespace between elements changes,
     which does not alter how the HTML renders outside RAW elements. */
  function isInline(node) {
    if (node.kind === 'text' || node.kind === 'comment') return true;
    // An unmatched block end tag such as a spare </div> gets its own line,
    // where it is easy to see, instead of joining the text around it.
    if (node.kind === 'void' || node.kind === 'stray') return INLINE.has(node.name);
    return node.kind === 'open' && INLINE.has(node.name) && !RAW.has(node.name) && node.children.every(isInline);
  }

  function inlineText(node) {
    if (node.kind === 'text') return node.text.replace(/\s+/g, ' ');
    if (node.kind === 'open') return node.text + node.children.map(inlineText).join('') + (node.close || '');
    return node.text;
  }

  function renderList(nodes, depth, settings, lines) {
    let run = '';
    const flush = () => {
      const text = run.trim();
      if (text) lines.push(settings.indent.repeat(depth) + text);
      run = '';
    };
    for (const node of nodes) {
      if (isInline(node)) { run += inlineText(node); continue; }
      flush();
      renderBlock(node, depth, settings, lines);
    }
    flush();
  }

  function renderBlock(node, depth, settings, lines) {
    const indent = settings.indent.repeat(depth);
    if (node.kind !== 'open') { lines.push(indent + node.text); return; }
    if (RAW.has(node.name)) {
      lines.push(indent + node.text + node.children.map(child => child.text).join('') + (node.close || ''));
      return;
    }
    if (node.children.every(isInline)) {
      const inner = node.children.map(inlineText).join('').trim();
      const line = indent + node.text + inner + (node.close || '');
      if (!inner || line.length <= settings.width) { lines.push(line); return; }
    }
    lines.push(indent + node.text);
    renderList(node.children, depth + 1, settings, lines);
    if (node.close) lines.push(indent + node.close);
  }

  // options.indent (default two spaces) and options.width (default 120): an
  // element whose content is all inline stays on one line up to that width.
  function format(src, options = {}) {
    // ?? rather than a spread: a caller passing { indent: undefined } still
    // gets the default.
    const settings = { indent: options.indent ?? '  ', width: options.width ?? 120 };
    const lines = [];
    renderList(tree(parts(src)).children, 0, settings, lines);
    return lines.join('\n');
  }

  /* ---- tag pairs --------------------------------------------------------- */
  /* Pairs each end tag with the nearest open element of the same name, as a
     browser does, and reports what that leaves unpaired: an end tag with
     nothing to close, or an element that is never closed (other than one
     whose end tag HTML allows to be left out). Void elements have no pair.
     Offsets are into the source; pair is the index of the partner or -1;
     problem is '', 'unclosed' or 'unopened'. */
  function tagPairs(src) {
    const tags = [];
    const stack = [];
    const unclosed = index => { if (!OPTIONAL_CLOSE.has(tags[index].name)) tags[index].problem = 'unclosed'; };
    for (const part of parts(src)) {
      if (part.kind !== 'open' && part.kind !== 'close') continue;
      const index = tags.push({ kind: part.kind, name: part.name, start: part.start, end: part.end, pair: -1, problem: '' }) - 1;
      if (part.kind === 'open') { stack.push(index); continue; }
      let depth = stack.length - 1;
      while (depth >= 0 && tags[stack[depth]].name !== part.name) depth--;
      if (depth < 0) { tags[index].problem = 'unopened'; continue; }
      stack.splice(depth + 1).forEach(unclosed);
      const open = stack.pop();
      tags[open].pair = index;
      tags[index].pair = open;
    }
    stack.forEach(unclosed);
    return tags;
  }

  const lineOf = (src, index) => src.slice(0, index).split('\n').length;

  function describeProblem(src, tag) {
    const line = lineOf(src, tag.start);
    return tag.problem === 'unclosed'
      ? '<' + tag.name + '> on line ' + line + ' is not closed'
      : '</' + tag.name + '> on line ' + line + ' has no opening tag';
  }

  /* ---- fields ------------------------------------------------------------ */
  /* A field is { insert: '{#query.BirthDate}', path: 'query.BirthDate',
     namespace: 'query', name: 'BirthDate', label }. items are RadEditor
     dropdown items, [value, text] pairs; only values that are a single {#…}
     placeholder become fields. */
  function fieldsFrom(items) {
    if (!Array.isArray(items)) return [];
    return items
      .filter(item => Array.isArray(item) && typeof item[0] === 'string' && PLACEHOLDER_VALUE.test(item[0]))
      .map(([insert, label]) => {
        const path = PLACEHOLDER_VALUE.exec(insert)[1];
        const dot = path.indexOf('.');
        return {
          insert,
          path,
          namespace: dot > 0 ? path.slice(0, dot) : '',
          name: dot > 0 ? path.slice(dot + 1) : path,
          label: typeof label === 'string' && label ? label : path
        };
      });
  }

  const isFieldTool = tool => Array.isArray(tool.items)
    && tool.items.some(item => Array.isArray(item) && typeof item[0] === 'string' && PLACEHOLDER_VALUE.test(item[0]));

  // Finds a tool's items in a RadEditor toolJSON tree. match is a tool name,
  // or 'auto' for the first tool whose items are {#…} placeholders.
  function findTool(value, match = 'auto') {
    if (Array.isArray(value)) {
      for (const entry of value) { const found = findTool(entry, match); if (found) return found; }
    } else if (value && typeof value === 'object') {
      const hit = match === 'auto' ? isFieldTool(value) : value.name === match && Array.isArray(value.items);
      if (hit) return value.items;
      return findTool(value.tools, match);
    }
    return null;
  }

  // Reads a JSON array or object starting at text[start], skipping strings.
  function readJson(text, start) {
    const open = text[start], close = open === '[' ? ']' : '}';
    let depth = 0, quoted = false;
    for (let j = start; j < text.length; j++) {
      const c = text[j];
      if (quoted) { if (c === '\\') j++; else if (c === '"') quoted = false; continue; }
      if (c === '"') quoted = true;
      else if (c === open) depth++;
      else if (c === close && --depth === 0) {
        try { return JSON.parse(text.slice(start, j + 1)); } catch (_) { return null; }
      }
    }
    return null;
  }

  // The toolJSON of a RadEditor from its $create(...) page script. With an
  // editor id, it is the configuration nearest before that editor's $get("…"),
  // since one init script can create several editors.
  function toolConfigFromScript(text, editorId) {
    let limit = text.length;
    if (editorId) {
      limit = text.indexOf('$get("' + editorId + '")');
      if (limit < 0) return null;
    }
    const key = text.lastIndexOf('"toolJSON":', limit);
    if (key < 0) return null;
    const start = text.indexOf('[', key);
    return start < 0 ? null : readJson(text, start);
  }

  function rank(fields, search) {
    const needle = search.toLowerCase();
    const starts = field => field.name.toLowerCase().startsWith(needle) || field.path.toLowerCase().startsWith(needle);
    return fields
      .filter(field => [field.path, field.name, field.label].some(text => text.toLowerCase().includes(needle)))
      .sort((a, b) => starts(b) - starts(a));
  }

  // Suggestions while typing: only after "{#", so ordinary HTML stays quiet.
  function suggest(before, fields) {
    const match = /\{#([\w.]*)$/.exec(before);
    return match ? { start: match.index, options: rank(fields, match[1]) } : null;
  }

  // Ctrl+Space: the same list, or every field matching the word at the caret.
  function listAt(before, fields) {
    const placeholder = suggest(before, fields);
    if (placeholder) return placeholder;
    const word = /[\w]*$/.exec(before)[0];
    return { start: before.length - word.length, options: rank(fields, word) };
  }

  // Placeholders in a namespace the field list covers but not in the list.
  // Case is ignored, so only a missing name is reported.
  function unknownPlaceholders(src, fields) {
    if (!fields || !fields.length) return [];
    const known = new Set(fields.map(field => field.path.toLowerCase()));
    const namespaces = new Set(fields.map(field => field.namespace.toLowerCase()).filter(Boolean));
    const unknown = new Set();
    for (const match of src.matchAll(/\{#([\w.]+)\}/g)) {
      const path = match[1].toLowerCase();
      const namespace = path.includes('.') ? path.slice(0, path.indexOf('.')) : '';
      if (namespaces.has(namespace) && !known.has(path)) unknown.add(match[0]);
    }
    return [...unknown];
  }

  // Fields from a RadEditor insert-field tool, or null when it has none.
  // Reads the live editor's configuration, then the page script that created
  // it, so the list is ready before the tool's own popup is ever opened.
  function radEditorFields(editorEl, tool = 'auto') {
    let items = null;
    try {
      const editor = root.$find?.(editorEl.id);
      const config = editor?.get_toolJSON?.() || editor?._toolJSON;
      if (config) items = findTool(config, tool);
    } catch (_) { /* fall back to the page script */ }
    if (!items && root.document) {
      for (const script of root.document.scripts) {
        if (script.src || !script.text.includes('"toolJSON":')) continue;
        const config = toolConfigFromScript(script.text, editorEl.id);
        if (config) items = findTool(config, tool);
        if (items) break;
      }
    }
    return items ? fieldsFrom(items) : null;
  }

  /* ---- editor ------------------------------------------------------------ */
  const FIELD_ICON = '<svg viewBox="4 0 10 18" aria-hidden="true" focusable="false">'
    + '<rect x="5" y="1.5" width="8" height="15" fill="none" stroke="currentColor"/>'
    + '<rect x="5.5" y="2" width="7" height="3.5" fill="currentColor" opacity=".35"/>'
    + '<path d="M5 5.5h8M5 9.17h8M5 12.83h8" fill="none" stroke="currentColor"/></svg>';

  const DEFAULT_MESSAGES = {
    ready: count => count + (count === 1 ? ' field' : ' fields') + '. Type {# for suggestions, or press Ctrl+Space.',
    idle: 'Shift+Alt+F formats the HTML.',
    noFields: 'No fields were found.',
    unknown: list => 'Not in the field list: ' + list.join(', ') + '.'
  };

  const attached = new Map();

  /* Adds the source tools to an HTML textarea and returns a controller.

     options.fields     () => field[] | null. null or absent: no suggestions.
     options.placeTools (tools) => void. Inserts the Format / status row;
                        defaults to directly after the textarea.
     options.isActive   () => boolean. Whether the textarea is the view in use;
                        defaults to it being displayed.
     options.messages   overrides for DEFAULT_MESSAGES.
     options.indent, options.width   passed to format().

     The textarea stays where it is: a highlighted copy sits behind it in its
     parent, which is made a positioning context if it is not one already. */
  function attach(textarea, options = {}) {
    const document = root.document;
    if (attached.has(textarea)) return attached.get(textarea);
    const content = textarea.parentElement;
    if (!content) throw new Error('UnionSuiteHtmlSource.attach: the textarea must be in the document.');

    const messages = { ...DEFAULT_MESSAGES, ...options.messages };
    const readFields = () => (options.fields ? options.fields() : null);
    const active = options.isActive || (() => textarea.getClientRects().length > 0);
    const abort = new AbortController();
    const on = (target, type, handler, extra = {}) => target?.addEventListener(type, handler, { ...extra, signal: abort.signal });
    const saved = Object.fromEntries(['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls',
      'aria-activedescendant', 'aria-describedby', 'spellcheck'].map(name => [name, textarea.getAttribute(name)]));
    const positioned = getComputedStyle(content).position === 'static';

    const id = 'usHtmlSource-' + Math.random().toString(36).slice(2);
    const pre = document.createElement('pre');
    pre.className = 'us-html-source__highlight';
    pre.setAttribute('aria-hidden', 'true');
    pre.hidden = true;
    content.classList.add('us-html-source');
    if (positioned) content.classList.add('us-html-source--positioned');
    textarea.before(pre);

    const menu = document.createElement('div');
    menu.className = 'us-html-complete';
    menu.id = id + '-list';
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-label', 'Fields');
    menu.hidden = true;
    document.body.appendChild(menu);

    const tools = document.createElement('div');
    tools.className = 'us-html-source__tools';
    tools.hidden = true;
    const button = (label, title) => {
      const element = document.createElement('button');
      element.type = 'button';
      element.className = 'TextButton us-outline-button';
      element.textContent = label;
      element.title = title;
      return element;
    };
    const formatButton = button('Format HTML', 'Format HTML (Shift+Alt+F)');
    formatButton.setAttribute('aria-keyshortcuts', 'Shift+Alt+F');
    const problemButton = button('Go to problem', 'Select the next unpaired tag');
    problemButton.hidden = true;
    const status = document.createElement('span');
    status.className = 'us-html-source__status';
    status.id = id + '-status';
    status.setAttribute('role', 'status');
    tools.append(formatButton, problemButton, status);
    if (options.placeTools) options.placeTools(tools); else textarea.after(tools);

    textarea.spellcheck = false;
    textarea.setAttribute('aria-describedby', [saved['aria-describedby'], status.id].filter(Boolean).join(' '));

    const state = { painted: null, tags: [], tagSpans: [], paired: [], problemAt: -1, timer: 0, fields: null };
    let suggestions = null, current = 0;

    const sync = () => {
      pre.style.top = textarea.offsetTop + 'px';
      pre.style.left = textarea.offsetLeft + 'px';
      pre.style.width = textarea.clientWidth + 'px';
      pre.style.height = textarea.clientHeight + 'px';
      pre.scrollTop = textarea.scrollTop;
      pre.scrollLeft = textarea.scrollLeft;
    };

    const report = message => {
      const fields = state.fields;
      const unknown = unknownPlaceholders(textarea.value, fields);
      const problems = state.tags.filter(tag => tag.problem);
      problemButton.hidden = !problems.length;
      status.dataset.error = String(!message && (unknown.length > 0 || problems.length > 0));
      if (message) { status.textContent = message; return; }
      const notes = [];
      if (problems.length) {
        const shown = problems.slice(0, 3).map(tag => describeProblem(textarea.value, tag));
        notes.push((problems.length === 1 ? 'Unpaired tag: ' : problems.length + ' unpaired tags: ') + shown.join('; ')
          + (problems.length > shown.length ? '; and ' + (problems.length - shown.length) + ' more' : '') + '.');
      }
      if (unknown.length) notes.push(messages.unknown(unknown));
      if (notes.length) status.textContent = notes.join(' ');
      else if (!fields) status.textContent = messages.idle;
      else status.textContent = fields.length ? messages.ready(fields.length) : messages.noFields;
    };

    const showPair = () => {
      state.paired.forEach(span => span.classList.remove('is-paired'));
      state.paired = [];
      if (!active() || textarea.selectionStart !== textarea.selectionEnd) return;
      const caret = textarea.selectionStart;
      const index = state.tags.findIndex(tag => caret > tag.start && caret <= tag.end);
      const tag = state.tags[index];
      if (!tag || tag.pair < 0) return;
      state.paired = [state.tagSpans[index], state.tagSpans[tag.pair]].filter(Boolean);
      state.paired.forEach(span => span.classList.add('is-paired'));
    };

    const paint = () => {
      state.painted = textarea.value;
      state.fields = readFields();
      state.tags = tagPairs(textarea.value);
      state.tagSpans = [];
      state.paired = [];
      const unknown = new Set(unknownPlaceholders(textarea.value, state.fields).map(text => text.toLowerCase()));
      const tagAt = new Map(state.tags.map((tag, index) => [tag.start, index]));
      const fragment = document.createDocumentFragment();
      let offset = 0, pending = -1;
      for (const token of tokens(textarea.value)) {
        const at = offset;
        offset += token.text.length;
        // The "<" or "</" before a name marks where a paired tag starts.
        if (token.type === 'punct' && token.text[0] === '<') pending = tagAt.has(at) ? tagAt.get(at) : -1;
        if (!token.type) { fragment.appendChild(document.createTextNode(token.text)); continue; }
        const span = document.createElement('span');
        span.className = 'us-html-token--' + token.type;
        span.textContent = token.text;
        if (token.type === 'tag' && pending >= 0) {
          state.tagSpans[pending] = span;
          if (state.tags[pending].problem) span.classList.add('is-unmatched');
          pending = -1;
        }
        if (token.type === 'placeholder' && unknown.has(token.text.toLowerCase())) span.classList.add('is-unknown');
        fragment.appendChild(span);
      }
      // A trailing newline keeps the last line's height equal to the textarea's.
      fragment.appendChild(document.createTextNode('\n'));
      pre.replaceChildren(fragment);
      sync();
      report();
      showPair();
    };

    const close = () => {
      menu.hidden = true;
      suggestions = null;
      if (textarea.getAttribute('role') === 'combobox') {
        textarea.setAttribute('aria-expanded', 'false');
        textarea.removeAttribute('aria-activedescendant');
      }
    };

    // The combobox role is only claimed while suggestions are available.
    const claimCombobox = enabled => {
      if (enabled) {
        textarea.setAttribute('role', 'combobox');
        textarea.setAttribute('aria-autocomplete', 'list');
        textarea.setAttribute('aria-controls', menu.id);
        textarea.setAttribute('aria-expanded', String(!menu.hidden));
      } else {
        for (const name of ['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant']) {
          if (saved[name] === null) textarea.removeAttribute(name); else textarea.setAttribute(name, saved[name]);
        }
      }
    };

    const refresh = () => {
      const shown = active();
      textarea.classList.toggle('us-html-source__input', shown);
      pre.hidden = !shown;
      tools.hidden = !shown;
      if (!shown) { close(); return; }
      paint();
      claimCombobox(!!state.fields);
      // An editor can fill the textarea just after showing it.
      requestAnimationFrame(() => { if (active() && textarea.value !== state.painted) paint(); });
    };

    // insertText keeps each change on the textarea's own undo stack.
    const replaceText = (start, end, text) => {
      textarea.focus();
      textarea.setSelectionRange(start, end);
      let done = false;
      try { done = document.execCommand('insertText', false, text); } catch (_) { /* unsupported */ }
      if (!done) {
        textarea.setRangeText(text, start, end, 'end');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    const flash = (message, ms = 2500) => {
      report(message);
      clearTimeout(state.timer);
      state.timer = setTimeout(() => report(), ms);
    };

    const formatNow = () => {
      const next = format(textarea.value, { indent: options.indent, width: options.width });
      if (next === textarea.value) { flash('The HTML is already formatted.'); return; }
      const scroll = textarea.scrollTop;
      replaceText(0, textarea.value.length, next);
      textarea.setSelectionRange(0, 0);
      textarea.scrollTop = scroll;
      sync();
      flash('HTML formatted. Undo with Ctrl+Z.');
    };

    // A hidden copy of the text up to an offset, for measuring where it falls.
    const measure = (index, fixed) => {
      const mirror = document.createElement('div');
      const marker = document.createElement('span');
      const style = getComputedStyle(textarea);
      Object.assign(mirror.style, {
        position: fixed ? 'fixed' : 'absolute', visibility: 'hidden', top: '0', left: '0',
        width: textarea.clientWidth + 'px', boxSizing: 'border-box', font: style.font, padding: style.padding,
        whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: style.tabSize
      });
      mirror.textContent = textarea.value.slice(0, index);
      marker.textContent = '​';
      mirror.appendChild(marker);
      document.body.appendChild(mirror);
      const result = { mirror: mirror.getBoundingClientRect(), marker: marker.getBoundingClientRect(), top: marker.offsetTop };
      mirror.remove();
      return result;
    };

    const scrollToOffset = index => {
      textarea.scrollTop = Math.max(0, measure(index, false).top - textarea.clientHeight / 3);
      sync();
    };

    const nextProblem = () => {
      const problems = state.tags.filter(tag => tag.problem);
      if (!problems.length) return;
      state.problemAt = (state.problemAt + 1) % problems.length;
      const tag = problems[state.problemAt];
      textarea.focus();
      textarea.setSelectionRange(tag.start, tag.end);
      scrollToOffset(tag.start);
      flash('Problem ' + (state.problemAt + 1) + ' of ' + problems.length + ': ' + describeProblem(textarea.value, tag) + '.', 4000);
    };

    const select = () => {
      [...menu.children].forEach((node, index) => node.setAttribute('aria-selected', String(index === current)));
      const node = menu.children[current];
      if (!node) return;
      textarea.setAttribute('aria-activedescendant', node.id);
      if (node.offsetTop < menu.scrollTop) menu.scrollTop = node.offsetTop;
      else if (node.offsetTop + node.offsetHeight > menu.scrollTop + menu.clientHeight) {
        menu.scrollTop = node.offsetTop + node.offsetHeight - menu.clientHeight;
      }
    };

    // Places the list under the caret.
    const position = () => {
      const { mirror, marker } = measure(textarea.selectionStart, true);
      const box = textarea.getBoundingClientRect();
      const left = box.left + marker.left - mirror.left - textarea.scrollLeft;
      const top = box.top + marker.top - mirror.top - textarea.scrollTop + 22;
      menu.style.left = Math.max(8, Math.min(left, root.innerWidth - menu.offsetWidth - 8)) + 'px';
      menu.style.top = Math.max(8, Math.min(top, root.innerHeight - menu.offsetHeight - 8)) + 'px';
    };

    const accept = () => {
      const option = suggestions?.options[current];
      if (!option) return;
      const start = suggestions.start, end = textarea.selectionEnd;
      // Replace the rest of a placeholder being edited rather than doubling it.
      const rest = /^[\w.]*\}?/.exec(textarea.value.slice(end))[0];
      close();
      replaceText(start, end + rest.length, option.insert);
    };

    const openList = requested => {
      const fields = state.fields;
      if (!fields || textarea.selectionStart !== textarea.selectionEnd) return close();
      const before = textarea.value.slice(0, textarea.selectionStart);
      suggestions = requested ? listAt(before, fields) : suggest(before, fields);
      if (!suggestions?.options.length) {
        if (requested && fields.length) flash('No field matches.');
        return close();
      }
      current = 0;
      menu.replaceChildren();
      suggestions.options.forEach((option, index) => {
        const node = document.createElement('div');
        node.id = menu.id + '-' + index;
        node.setAttribute('role', 'option');
        node.setAttribute('aria-label', option.insert + (option.label !== option.path ? ', ' + option.label : ''));
        const icon = document.createElement('span');
        icon.className = 'us-html-complete__icon';
        icon.innerHTML = FIELD_ICON;
        const label = document.createElement('span');
        label.className = 'us-html-complete__label';
        if (option.namespace) {
          const prefix = document.createElement('span');
          prefix.className = 'us-html-complete__namespace';
          prefix.textContent = option.namespace + '.';
          label.append(prefix);
        }
        label.append(option.name);
        node.append(icon, label);
        if (option.label !== option.path) {
          const detail = document.createElement('small');
          detail.className = 'us-html-complete__detail';
          detail.textContent = option.label;
          node.append(detail);
        }
        node.addEventListener('pointerdown', event => { event.preventDefault(); current = index; accept(); });
        menu.appendChild(node);
      });
      menu.hidden = false;
      textarea.setAttribute('aria-expanded', 'true');
      select();
      position();
    };

    on(formatButton, 'click', formatNow);
    on(problemButton, 'click', nextProblem);
    on(textarea, 'input', event => { paint(); if (event.isComposing) close(); else openList(false); });
    on(textarea, 'scroll', () => { sync(); close(); });
    on(textarea, 'focus', () => { if (textarea.value !== state.painted) paint(); });
    on(textarea, 'blur', close);
    on(textarea, 'click', close);
    on(textarea, 'keyup', showPair);
    on(textarea, 'mouseup', showPair);
    on(document, 'selectionchange', () => { if (document.activeElement === textarea) showPair(); });
    on(root, 'resize', close);
    // Captured so a host editor's own Escape/Tab handling does not also run
    // while the list is open.
    on(textarea, 'keydown', event => {
      if (event.isComposing) return;
      if (event.ctrlKey && !event.altKey && !event.metaKey && event.code === 'Space') {
        event.preventDefault();
        openList(true);
        return;
      }
      if (event.shiftKey && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyF') {
        event.preventDefault();
        close();
        formatNow();
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey) return;
      if (menu.hidden) {
        if (event.key === 'Tab' && !event.shiftKey) {
          event.preventDefault();
          replaceText(textarea.selectionStart, textarea.selectionEnd, options.indent || '  ');
        }
        return;
      }
      const handled = () => { event.preventDefault(); event.stopImmediatePropagation(); };
      if (event.key === 'Escape') { handled(); close(); }
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        handled();
        const count = suggestions.options.length;
        current = (current + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
        select();
      } else if (!event.shiftKey && (event.key === 'Enter' || event.key === 'Tab')) { handled(); accept(); }
      else if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) close();
    }, { capture: true });

    // Showing or hiding the textarea, or an ancestor, changes its size, so one
    // observer covers a host editor switching views.
    let observer = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => { if (active() !== !pre.hidden) refresh(); else if (active()) sync(); });
      observer.observe(textarea);
    }

    const controller = {
      textarea,
      refresh,
      format: formatNow,
      dispose() {
        abort.abort();
        observer?.disconnect();
        clearTimeout(state.timer);
        pre.remove();
        menu.remove();
        tools.remove();
        content.classList.remove('us-html-source', 'us-html-source--positioned');
        textarea.classList.remove('us-html-source__input');
        for (const [name, value] of Object.entries(saved)) {
          if (value === null) textarea.removeAttribute(name); else textarea.setAttribute(name, value);
        }
        attached.delete(textarea);
      }
    };
    attached.set(textarea, controller);
    refresh();
    return controller;
  }

  const radEditors = new Map();

  /* A RadEditor's HTML view (textarea.reTextArea): the source tools appear
     only while that view is showing, and the Format / status row sits below
     the editor.

     The textarea is not there to attach to when the page first loads: RadEditor
     builds its content area as it initialises, which can finish after a page
     script has run. The controller therefore watches the editor and attaches
     when the textarea appears, and again if RadEditor replaces it, so it can
     be created as soon as the editor's element exists.

     options.fieldTool  the insert-field tool's name, 'auto' (default) for the
                        first tool whose items are {#…} placeholders, or null
                        for no suggestions. Other options are as for attach(). */
  function attachRadEditor(editorEl, options = {}) {
    if (radEditors.has(editorEl)) return radEditors.get(editorEl);
    const tool = options.fieldTool === undefined ? 'auto' : options.fieldTool;
    let cached = null;
    // Cache only a successful read, so a late editor configuration is retried.
    const fields = tool === null ? null : () => cached || (cached = radEditorFields(editorEl, tool));
    const settings = { placeTools: tools => editorEl.after(tools), ...options, fields: options.fields || fields };

    let inner = null;
    const connect = () => {
      const textarea = editorEl.querySelector('textarea.reTextArea');
      if (textarea === (inner?.textarea || null) && (!inner || textarea.isConnected)) return;
      inner?.dispose();
      inner = textarea ? attach(textarea, settings) : null;
    };

    // Only a change of textarea matters. The highlight inside the editor also
    // mutates on every repaint, which connect() ignores after one lookup.
    const observer = new MutationObserver(connect);
    observer.observe(editorEl, { childList: true, subtree: true });
    // The mode links switch views without resizing anything else observable
    // in some skins, so they refresh directly too.
    const modes = new AbortController();
    editorEl.addEventListener('click', event => {
      if (!event.target.closest?.('.reModes a')) return;
      setTimeout(() => { connect(); inner?.refresh(); });
    }, { signal: modes.signal });

    const controller = {
      radEditor: editorEl,
      get textarea() { return inner?.textarea || null; },
      refresh() { connect(); inner?.refresh(); },
      format() { inner?.format(); },
      dispose() {
        observer.disconnect();
        modes.abort();
        inner?.dispose();
        inner = null;
        radEditors.delete(editorEl);
      }
    };
    radEditors.set(editorEl, controller);
    connect();
    return controller;
  }

  return Object.freeze({
    version: VERSION,
    tokens,
    format,
    tagPairs,
    describeProblem,
    fieldsFrom,
    findTool,
    toolConfigFromScript,
    suggest,
    listAt,
    unknownPlaceholders,
    radEditorFields,
    attach,
    attachRadEditor
  });
});
