/* =============================================================================
 * BO Enhancements - combined script
 * -----------------------------------------------------------------------------
 * Sibling of IQA-Enhancements.js, for the iMIS Business Object designer page.
 * Loaded by the theme loader (Theme/UnionSuite/index.js, module id 'bo'),
 * which must be included in the designer iframe. Dependency-free.
 *
 * STATUS: Database tab in progress, tested by console paste in the designer
 *   iframe. Properties tab: the Expression builder (ExpressionEditor), run on
 *   the dev tenant against a test object, 11 November 2026. Definition and
 *   Preview tabs not yet probed.
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
 *     * ExpressionEditor - Properties tab, Expression builder: a typed
 *                        formula box, Apply to builder, an estimated preview,
 *                        and the builder restyled (flat rows, If card,
 *                        type-to-filter properties, linked Calculated formula)
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
 * Console helpers: BoEnh.probe(), BoEnh.refresh(), BoEnh.mode(true|false),
 *   BoEnh.expression.read() (the builder as a tree), BoEnh.expression.core
 *
 * Node: the file exports { ExpressionCore } (the formula language, no DOM);
 *   node tools/test-bo-expression.cjs
 * ========================================================================== */
(function () {
  'use strict';

  /* ===========================================================================
   * ExpressionCore - the formula language for the Expression builder tab
   * -----------------------------------------------------------------------------
   * No DOM: the catalogue of what the builder offers, a parser (text -> tree),
   * a formatter (tree -> text), an evaluator for the estimated preview, the
   * colouring, and the layout of iMIS's read-only SQL. Defined before the page
   * gate so Node can load it: tools/test-bo-expression.cjs.
   * ======================================================================== */
  const ExpressionCore = (function () {
    const text = (value) => (value === null || value === undefined ? ''
      : value === true ? '1' : value === false ? '0' : String(value));
    const lower = (value) => text(value).toLowerCase();

    /* ---- dates, as the REST API sends them ("2024-07-08T00:00:00") ---- */
    const DATE_PARTS = ['year', 'quarter', 'month', 'dayofyear', 'day', 'week', 'weekday', 'hour', 'minute', 'second',
      'millisecond', 'microsecond', 'nanosecond', 'tzoffset', 'iso_week'];
    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const two = (n) => String(n).padStart(2, '0');

    /* Read by hand so no time zone shifts the day. An empty or year-1 date is no date. */
    function dateOf(value) {
      const m = /^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d)(?::(\d\d)(?:\.(\d+))?)?)?/.exec(text(value));
      if (!m || m[1] === '0001') return null;
      return { y: +m[1], mo: +m[2], d: +m[3], h: +(m[4] || 0), mi: +(m[5] || 0), s: +(m[6] || 0), ms: +((m[7] || '0').padEnd(3, '0').slice(0, 3)) };
    }

    function stamp(value, kind) {
      const t = dateOf(value);
      if (!t) return '';
      const date = t.y + '-' + two(t.mo) + '-' + two(t.d), time = two(t.h) + ':' + two(t.mi) + ':' + two(t.s);
      return kind === 'date' ? date : kind === 'time' ? time : date + ' ' + time;
    }

    function endOfMonth(value) {
      const t = dateOf(value);
      return t ? t.y + '-' + two(t.mo) + '-' + two(new Date(Date.UTC(t.y, t.mo, 0)).getUTCDate()) : '';
    }

    /* SQL Server's DATEPART with its defaults (weeks start on Sunday). */
    function datePart(value, part) {
      const t = dateOf(value);
      if (!t) return '';
      const day = Date.UTC(t.y, t.mo - 1, t.d), newYear = Date.UTC(t.y, 0, 1);
      const dayOfYear = Math.round((day - newYear) / 864e5) + 1;
      switch (part) {
        case 'year': return t.y;
        case 'quarter': return Math.ceil(t.mo / 3);
        case 'month': return t.mo;
        case 'dayofyear': return dayOfYear;
        case 'day': return t.d;
        case 'week': return Math.floor((dayOfYear + new Date(newYear).getUTCDay() - 1) / 7) + 1;
        case 'weekday': return new Date(day).getUTCDay() + 1;
        case 'hour': return t.h;
        case 'minute': return t.mi;
        case 'second': return t.s;
        case 'millisecond': return t.ms;
        case 'microsecond': return t.ms * 1000;
        case 'nanosecond': return t.ms * 1000000;
        case 'tzoffset': return 0;
        case 'iso_week': {
          const thursday = new Date(day);
          thursday.setUTCDate(thursday.getUTCDate() - ((thursday.getUTCDay() + 6) % 7) + 3);
          const firstThursday = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 4));
          return 1 + Math.round(((thursday - firstThursday) / 864e5 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
        }
        default: return '';
      }
    }

    function dateName(value, part) {
      const number = datePart(value, part);
      if (number === '') return '';
      return part === 'month' ? MONTH_NAMES[number - 1] : part === 'weekday' ? DAY_NAMES[number - 1] : String(number);
    }

    const round = (value, places) => { const scale = Math.pow(10, places); return Math.round(Number(value) * scale) / scale; };

    /* `value` is the builder dropdown's option value. `family` is the kind of
     * value iMIS offers the function for: text, date or number (true/false
     * counts as a number). `args` are the builder's controls for the function,
     * in typed order: [control, type, label, extra], where type n = whole number
     * (extra: the largest allowed), s = text in quotes, c = one word from a list
     * (extra: the list). The label is what the hint and the errors call it. */
    const FUNCTION_LIST = [
      { name: 'Trim', value: 'Trim', args: [], run: (s) => text(s).replace(/^ +| +$/g, '') },
      { name: 'Left', value: 'Left', args: [['LengthTextBox', 'n', 'number of characters']], run: (s, n) => text(s).slice(0, Math.max(0, n)) },
      { name: 'Right', value: 'Right', args: [['LengthTextBox', 'n', 'number of characters']], run: (s, n) => (n > 0 ? text(s).slice(-n) : '') },
      { name: 'Length', value: 'Length', args: [], run: (s) => text(s).replace(/ +$/, '').length },
      { name: 'Lower', value: 'Lower', args: [], run: (s) => text(s).toLowerCase() },
      { name: 'Upper', value: 'Upper', args: [], run: (s) => text(s).toUpperCase() },
      { name: 'LTrim', value: 'LTrim', args: [], run: (s) => text(s).replace(/^ +/, '') },
      { name: 'RTrim', value: 'RTrim', args: [], run: (s) => text(s).replace(/ +$/, '') },
      { name: 'Reverse', value: 'Reverse', args: [], run: (s) => Array.from(text(s)).reverse().join('') },
      { name: 'Replicate', value: 'Replicate', args: [['LengthTextBox', 'n', 'number of times']], run: (s, n) => text(s).repeat(Math.max(0, n)) },
      { name: 'CharIndex', value: 'CharIndex', args: [['ExpressionToFindTextbox', 's', 'text to find']],
        run: (s, find) => (find === '' ? 0 : lower(s).indexOf(lower(find)) + 1) },
      { name: 'Replace', value: 'Replace', args: [['ExpressionToFindTextbox', 's', 'expression to replace'], ['ExpressionToReplaceTextbox', 's', 'text to replace with']],
        run: (s, find, put) => (find === '' ? text(s)
          : text(s).replace(new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), () => put)) },
      { name: 'Substring', value: 'Substring', args: [['StartTextBox', 'n', 'start position'], ['LengthTextBox', 'n', 'number of characters']],
        run: (s, start, length) => text(s).slice(Math.max(start - 1, 0), Math.max(start - 1 + length, 0)) },

      /* Dates: a date property, or Today. */
      { name: 'DateTime', value: 'DateTime', family: 'date number', args: [], run: (v) => stamp(v, 'datetime') },
      { name: 'Date', value: 'Date', family: 'date', args: [], run: (v) => stamp(v, 'date') },
      { name: 'Time', value: 'Time', family: 'date', args: [], run: (v) => stamp(v, 'time') },
      { name: 'Day', value: 'Day', family: 'date', args: [], run: (v) => datePart(v, 'day') },
      { name: 'Month', value: 'Month', family: 'date', args: [], run: (v) => datePart(v, 'month') },
      { name: 'Year', value: 'Year', family: 'date', args: [], run: (v) => datePart(v, 'year') },
      { name: 'EndOfMonth', value: 'EOMonth', aliases: ['EOMonth'], family: 'date', args: [], run: endOfMonth },
      { name: 'DatePart', value: 'DatePart', family: 'date', args: [['DatePartDropDownList', 'c', 'date part', DATE_PARTS]], run: datePart },
      { name: 'DateName', value: 'DateName', family: 'date', args: [['DatePartDropDownList', 'c', 'date part', DATE_PARTS]], run: dateName },

      /* Numbers (iMIS offers these for true/false properties too). */
      { name: 'Round', value: 'Round', family: 'number', args: [['NumberOfDecimalPlacesDropDownList', 'n', 'decimal places', 37]], run: round },
      { name: 'Floor', value: 'Floor', family: 'number', args: [], run: (v) => Math.floor(Number(v)) },
      { name: 'Ceiling', value: 'Ceiling', family: 'number', args: [], run: (v) => Math.ceil(Number(v)) },
      { name: 'Abs', value: 'AbsoluteValue', aliases: ['AbsoluteValue'], family: 'number', args: [], run: (v) => Math.abs(Number(v)) }
    ];
    FUNCTION_LIST.forEach((fn) => { if (!fn.family) fn.family = 'text'; });
    const FUNCTIONS = Object.fromEntries(FUNCTION_LIST.flatMap((fn) => [fn.name].concat(fn.aliases || []).map((name) => [name.toLowerCase(), fn])));
    const FUNCTION_BY_VALUE = Object.fromEntries(FUNCTION_LIST.map((fn) => [fn.value, fn]));

    /* What a function expects, part by part: Replace(value, "expression to
     * replace", "text to replace with"). Text arguments are shown in quotes. */
    const IF_PARTS = ['condition', 'value if true', 'value if false'];
    const FAMILY_NOTE = { text: null, date: 'a date property or Today', number: 'a number', 'date number': 'a date or a number' };
    function signatureParts(name) {
      if (name.toLowerCase() === 'if') return { name: 'If', parts: IF_PARTS, notes: [] };
      const fn = FUNCTIONS[name.toLowerCase()];
      if (!fn) return null;
      return {
        name: fn.name,
        parts: ['value'].concat(fn.args.map(([, type, label]) => (type === 's' ? '"' + label + '"' : label))),
        notes: [FAMILY_NOTE[fn.family]].concat(fn.args.map(([, type, , extra]) =>
          (type === 'c' ? 'one of: ' + extra.join(', ') : type === 'n' && extra !== undefined ? 'a whole number from 0 to ' + extra : null)))
      };
    }
    const signature = (name) => { const shape = signatureParts(name); return shape ? shape.name + '(' + shape.parts.join(', ') + ')' : ''; };

    /* The innermost unfinished call in `before` (the text up to the caret):
     * { name, index } where index counts the commas typed so far, or null. */
    function callAt(before) {
      const open = [];
      let quote = null, word = '';
      for (const ch of before) {
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") { quote = ch; word = ''; continue; }
        if (ch === '(') { open.push({ name: word, index: 0 }); word = ''; }
        else if (ch === ')') { open.pop(); word = ''; }
        else if (ch === ',') { if (open.length) open[open.length - 1].index++; word = ''; }
        else if (/[\w.]/.test(ch)) word += ch;
        else if (!/\s/.test(ch)) word = '';
      }
      for (let i = open.length - 1; i >= 0; i--) if (signatureParts(open[i].name)) return open[i];
      return null;
    }

    /* Typed operator -> builder option value. */
    const OPERATORS = { '+': 'Addition', '-': 'Subtraction', '*': 'Multiplication', '/': 'Division', '%': 'Modulo' };
    const PRECEDENCE = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2 };
    const ASSOCIATIVE = { '+': true, '*': true };

    /* Typed condition -> builder option text. Empty, Not Empty, In and Between
     * take different inputs and are not handled yet. */
    const CONDITIONS = {
      '=': 'Equal', '<>': 'Not Equal', '<': 'Less', '<=': 'Less Equal', '>': 'Greater', '>=': 'Greater Equal',
      'contains': 'Contains', 'not contains': 'Not Contains', 'starts with': 'Starts With', 'ends with': 'Ends With'
    };
    const CONDITION_SYMBOL = Object.fromEntries(Object.entries(CONDITIONS).map(([symbol, name]) => [name, symbol]));

    class FormulaError extends Error {
      constructor(message, position) { super(message); this.position = position; }
    }

    /* ---- tokens ---- */
    const TOKEN = /\s*(?:(\d+(?:\.\d+)?)|("(?:[^"]|"")*"|'(?:[^']|'')*')|([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)?)|(<>|!=|<=|>=|[-+*\/%(),=<>]))/y;

    function tokenize(source) {
      const tokens = [];
      let at = 0;
      while (at < source.length) {
        TOKEN.lastIndex = at;
        const match = TOKEN.exec(source);
        if (!match) {
          if (!source.slice(at).trim()) break;
          const bad = at + source.slice(at).search(/\S/);
          throw new FormulaError(source[bad] === '"' || source[bad] === "'" ? 'This text is missing its closing quote' : 'Unexpected "' + source[bad] + '"', bad);
        }
        const position = match.index + match[0].length - match[0].trimStart().length;
        if (match[1] !== undefined) tokens.push({ type: 'number', value: match[1], position });
        else if (match[2] !== undefined) {
          const quote = match[2][0];
          tokens.push({ type: 'string', value: match[2].slice(1, -1).split(quote + quote).join(quote), position });
        } else if (match[3] !== undefined) tokens.push({ type: 'name', value: match[3], position });
        else tokens.push({ type: 'symbol', value: match[4] === '!=' ? '<>' : match[4], position });
        at = TOKEN.lastIndex;
      }
      tokens.push({ type: 'end', value: '', position: source.length });
      return tokens;
    }

    /* ---- parser: text -> tree ----
     * Tree nodes (fn is null or { name, args: [text] }):
     *   { kind: 'prop', name: 'Name.ID', fn }
     *   { kind: 'const', type: 'String' | 'Integer' | 'Decimal' | 'Boolean', value, fn }
     *   { kind: 'today', fn }
     *   { kind: 'calc', op, left, right, fn }
     *   { kind: 'if', branches: [{ when, then }], otherwise, fn }
     *       when is a comparison { left, cond, right } or a group
     *       { op: 'And' | 'Or', left: when, right: when }; more than one
     *       branch is the builder's "else if"
     *   { kind: 'none' }                                   an empty slot
     */
    function parse(source) {
      const tokens = tokenize(source);
      let at = 0;
      const peek = () => tokens[at];
      const next = () => tokens[at++];
      const isSymbol = (value) => peek().type === 'symbol' && peek().value === value;
      const expect = (value, why) => {
        if (!isSymbol(value)) throw new FormulaError(why || 'Expected "' + value + '"', peek().position);
        return next();
      };

      /* A run of one associative operator nests to the right, as the builder
       * stores it; anything else groups left to right, as arithmetic does. */
      function chain(items, ops) {
        const run = ops.every((op) => op === ops[0]) && ASSOCIATIVE[ops[0]];
        if (run) {
          let node = items[items.length - 1];
          for (let i = items.length - 2; i >= 0; i--) node = { kind: 'calc', op: ops[i], left: items[i], right: node, fn: null };
          return node;
        }
        let node = items[0];
        for (let i = 1; i < items.length; i++) node = { kind: 'calc', op: ops[i - 1], left: node, right: items[i], fn: null };
        return node;
      }

      function level(operators, operand) {
        const items = [operand()], ops = [];
        while (peek().type === 'symbol' && operators.includes(peek().value)) { ops.push(next().value); items.push(operand()); }
        return ops.length ? chain(items, ops) : items[0];
      }
      const product = () => level(['*', '/', '%'], primary);
      const expression = () => level(['+', '-'], product);

      function literal(fn, index) {
        const [, type, label, extra] = fn.args[index];
        const token = next();
        if (token.type === 'end') throw new FormulaError(fn.name + ' also needs the ' + label + ': ' + signature(fn.name), token.position);
        if (type === 'c') {
          const word = token.type === 'name' || token.type === 'string' ? token.value.toLowerCase() : '';
          if (!extra.includes(word)) throw new FormulaError(fn.name + ' needs a ' + label + ', one of: ' + extra.join(', '), token.position);
          return word;
        }
        const wrong = type === 'n' ? (token.type !== 'number' || token.value.includes('.')) : token.type !== 'string';
        if (wrong) {
          throw new FormulaError(fn.name + ' needs ' + (type === 'n' ? 'a whole number' : 'text in quotes') + ' for the ' + label +
            ': ' + signature(fn.name), token.position);
        }
        if (type === 'n' && extra !== undefined && Number(token.value) > extra) {
          throw new FormulaError(fn.name + ' allows 0 to ' + extra + ' for the ' + label, token.position);
        }
        return token.value;
      }

      const isWord = (value) => peek().type === 'name' && peek().value.toLowerCase() === value;

      function comparison() {
        const left = expression();
        const token = next();
        let symbol = token.value.toLowerCase();
        if (token.type === 'name' && ['not', 'starts', 'ends'].includes(symbol) && peek().type === 'name') symbol += ' ' + next().value.toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(CONDITIONS, symbol)) {
          throw new FormulaError('Expected a comparison: =, <>, <, <=, >, >=, contains, not contains, starts with or ends with', token.position);
        }
        return { left, cond: CONDITIONS[symbol], right: expression() };
      }

      /* A bracket here opens either a group of conditions or just a value, as
       * in (Name.A + Name.B) = 3. Read it as a group; if that does not work, or
       * the text carries on like a value, go back and read a comparison. */
      function conditionPart() {
        if (isSymbol('(')) {
          const mark = at;
          try {
            next();
            const inner = condition();
            expect(')');
            const after = peek();
            const carriesOn = (after.type === 'symbol' && !['(', ')', ','].includes(after.value))
              || (after.type === 'name' && ['contains', 'not', 'starts', 'ends'].includes(after.value.toLowerCase()));
            if (!carriesOn) return inner;
          } catch (error) { if (!(error instanceof FormulaError)) throw error; }
          at = mark;
        }
        return comparison();
      }

      /* "and" binds tighter than "or"; a run of either groups left to right,
       * which is how the builder nests conditions added one after another. */
      function conditionLevel(word, part) {
        let node = part();
        while (isWord(word)) { next(); node = { op: word === 'and' ? 'And' : 'Or', left: node, right: part() }; }
        return node;
      }
      const conditionAnd = () => conditionLevel('and', conditionPart);
      const condition = () => conditionLevel('or', conditionAnd);

      function primary() {
        const token = next();
        if (token.type === 'symbol' && token.value === '(') {
          const inner = expression();
          expect(')', 'This bracket is not closed');
          return inner;
        }
        if (token.type === 'symbol' && token.value === '-' && peek().type === 'number') {
          const value = '-' + next().value;
          return { kind: 'const', type: value.includes('.') ? 'Decimal' : 'Integer', value, fn: null };
        }
        if (token.type === 'number') return { kind: 'const', type: token.value.includes('.') ? 'Decimal' : 'Integer', value: token.value, fn: null };
        if (token.type === 'string') return { kind: 'const', type: 'String', value: token.value, fn: null };
        if (token.type !== 'name') {
          throw new FormulaError(token.type === 'end' ? 'The formula stops too soon' : 'Unexpected "' + token.value + '"', token.position);
        }

        const word = token.value.toLowerCase();
        if (isSymbol('(')) {
          next();
          if (word === 'if') {
            const shape = 'If needs at least three parts: ' + signature('if');
            const branches = [];
            let otherwise;
            for (;;) {
              const when = condition();
              expect(',', shape);
              const then = expression();
              branches.push({ when, then });
              expect(',', shape);
              /* What follows is another condition and its value (an else-if),
               * or the last value. Look ahead, then read it properly. */
              const mark = at;
              let another = false, lone = null;
              try {
                condition();
                another = isSymbol(',');
                if (!another && isSymbol(')')) lone = peek().position;
              } catch (error) { if (!(error instanceof FormulaError)) throw error; }
              if (lone !== null) throw new FormulaError('This condition needs a value after it, then a last value', lone);
              at = mark;
              if (!another) { otherwise = expression(); break; }
            }
            expect(')', 'If is missing its closing bracket');
            return { kind: 'if', branches, otherwise, fn: null };
          }
          if (word === 'today') { expect(')'); return { kind: 'today', fn: null }; }
          const fn = FUNCTIONS[word];
          if (!fn) throw new FormulaError('"' + token.value + '" is not a function the builder has', token.position);
          const inner = expression();
          if (inner.fn) throw new FormulaError('The builder allows one function on a value; ' + fn.name + ' is wrapped around another', token.position);
          const args = fn.args.map(([, , label], index) => {
            expect(',', fn.name + ' also needs the ' + label + ': ' + signature(fn.name));
            return literal(fn, index);
          });
          expect(')', isSymbol(',') ? fn.name + ' takes ' + (fn.args.length + 1) + ' part' + (fn.args.length ? 's' : '') + ': ' + signature(fn.name)
            : fn.name + ' is missing its closing bracket');
          return { ...inner, fn: { name: fn.name, args } };
        }
        if (word === 'true' || word === 'false') return { kind: 'const', type: 'Boolean', value: word === 'true' ? 'True' : 'False', fn: null };
        if (word === 'today') return { kind: 'today', fn: null };
        if (!token.value.includes('.')) throw new FormulaError('"' + token.value + '" is not known. Write properties as Table.Column', token.position);
        return { kind: 'prop', name: token.value, fn: null };
      }

      if (peek().type === 'end') return { kind: 'none' };
      const tree = expression();
      if (peek().type !== 'end') throw new FormulaError('Unexpected "' + peek().value + '"', peek().position);
      return tree;
    }

    /* ---- formatter: tree -> text ---- */
    const quote = (value) => (value.includes('"') && !value.includes("'")
      ? "'" + value + "'" : '"' + value.split('"').join('""') + '"');

    function format(node) {
      let body;
      if (!node || node.kind === 'none') return '';
      if (node.kind === 'prop') body = node.name;
      else if (node.kind === 'today') body = 'Today';
      else if (node.kind === 'const') body = node.type === 'String' ? quote(node.value) : (node.value || '0');
      else if (node.kind === 'calc') body = operand(node.left, 'left', node.op) + ' ' + node.op + ' ' + operand(node.right, 'right', node.op);
      else if (node.kind === 'if') {
        body = 'If(' + node.branches.map((branch) => formatCondition(branch.when) + ', ' + format(branch.then)).join(', ') +
          ', ' + format(node.otherwise) + ')';
      }
      if (!node.fn) return body;
      const types = FUNCTIONS[node.fn.name.toLowerCase()].args;
      return node.fn.name + '(' + body + node.fn.args.map((arg, i) => ', ' + (types[i][1] === 's' ? quote(arg) : (arg || '0'))).join('') + ')';
    }

    /* A group inside a group gets brackets unless it is the left side of the
     * same word, which is what a plain "a and b and c" means. */
    function formatCondition(when, parentOp, side) {
      if (!when.op) return format(when.left) + ' ' + CONDITION_SYMBOL[when.cond] + ' ' + format(when.right);
      const body = formatCondition(when.left, when.op, 'left') + ' ' + when.op.toLowerCase() + ' ' + formatCondition(when.right, when.op, 'right');
      return !parentOp || (side === 'left' && parentOp === when.op) ? body : '(' + body + ')';
    }

    /* Brackets only where leaving them out would change the grouping. */
    function operand(child, side, parentOp) {
      const body = format(child) || '""';
      if (child.kind !== 'calc' || child.fn) return body;
      const sameRun = side === 'right' && child.op === parentOp && ASSOCIATIVE[parentOp];
      return sameRun || PRECEDENCE[child.op] > PRECEDENCE[parentOp] ? body : '(' + body + ')';
    }

    /* The values directly inside a node: a calculation's two sides, or an If's
     * compared values, branch values and last value. */
    function conditionValues(when, out) {
      if (when.op) { conditionValues(when.left, out); conditionValues(when.right, out); }
      else out.push(when.left, when.right);
      return out;
    }

    function children(node) {
      if (!node) return [];
      const out = [node.left, node.right, node.otherwise];
      (node.branches || []).forEach((branch) => { conditionValues(branch.when, out); out.push(branch.then); });
      return out.filter(Boolean);
    }

    /* Every Table.Column the tree uses. */
    function references(node, out = new Set()) {
      if (!node) return out;
      if (node.kind === 'prop') out.add(node.name);
      children(node).forEach((child) => references(child, out));
      return out;
    }

    /* ---- colouring: the formula as [kind, text] pieces ----
     * Kinds: fn (a function), table and column (the two halves of a field),
     * text, number, word (True, False, Today and comparison words), op, and
     * bad (a function the builder does not have, or a field that
     * `isProperty` rejects). Anything else has kind ''. Works on unfinished
     * formulas: it never throws. */
    const PIECE = new RegExp([
      '("(?:[^"]|"")*"?|\'(?:[^\']|\'\')*\'?)',          // 1 text, closed or not
      '(\\d+(?:\\.\\d+)?)',                             // 2 number
      '([A-Za-z_]\\w*)(?=\\s*\\()',                     // 3 name before a bracket: a function
      '([A-Za-z_]\\w*\\.)([A-Za-z_]\\w*)?',             // 4,5 Table. and Column
      '\\b(true|false|today|contains|not|starts|ends|with|and|or)\\b',   // 6 word
      '(<>|!=|<=|>=|[-+*\\/%=<>])'                          // 7 operator
    ].join('|'), 'gi');

    function pieces(source, isProperty) {
      const out = [];
      let last = 0, match;
      PIECE.lastIndex = 0;
      while ((match = PIECE.exec(source))) {
        if (match.index > last) out.push(['', source.slice(last, match.index)]);
        if (match[1] !== undefined) out.push(['text', match[1]]);
        else if (match[2] !== undefined) out.push(['number', match[2]]);
        else if (match[3] !== undefined) {
          const name = match[3].toLowerCase();
          out.push([name === 'if' || name === 'today' || FUNCTIONS[name] ? 'fn' : 'bad', match[3]]);
        } else if (match[4] !== undefined) {
          const known = !isProperty || !match[5] || isProperty(match[4] + match[5]);
          out.push([known ? 'table' : 'bad', match[4]]);
          if (match[5]) out.push([known ? 'column' : 'bad', match[5]]);
        } else if (match[6] !== undefined) out.push(['word', match[6]]);
        else out.push(['op', match[7]]);
        last = match.index + match[0].length;
      }
      if (last < source.length) out.push(['', source.slice(last)]);
      return out;
    }

    /* ---- the read-only SQL iMIS prints under the builder ----
     * iMIS writes a run of terms as "(A) + ((B) + ((C) + (D)))". */

    /* Index of the bracket that closes the one at `open`, skipping quoted text; -1 if none. */
    function closingBracket(sql, open) {
      let depth = 0, quoted = false;
      for (let i = open; i < sql.length; i++) {
        const ch = sql[i];
        if (ch === "'") quoted = !quoted;                       // a doubled quote flips twice: still quoted
        else if (!quoted && ch === '(') depth++;
        else if (!quoted && ch === ')' && --depth === 0) return i;
      }
      return -1;
    }

    /* Splits the SQL into `count` terms, one per builder row: [{ op, text }],
     * the first with op ''. Null when the SQL is not shaped that way. */
    function splitSql(sql, count) {
      const terms = [];
      let rest = sql.trim(), op = '';
      for (let i = 1; i < count; i++) {
        const endLeft = rest[0] === '(' ? closingBracket(rest, 0) : -1;
        const middle = endLeft < 0 ? null : /^\s*([-+*\/%])\s*/.exec(rest.slice(endLeft + 1));
        if (!middle) return null;
        const startRight = endLeft + 1 + middle[0].length;
        if (rest[startRight] !== '(' || closingBracket(rest, startRight) !== rest.length - 1) return null;
        terms.push({ op, text: rest.slice(1, endLeft) });
        op = middle[1];
        rest = rest.slice(startRight + 1, -1);
      }
      if (rest[0] === '(' && closingBracket(rest, 0) === rest.length - 1) rest = rest.slice(1, -1);
      terms.push({ op, text: rest });
      return terms;
    }

    /* Puts a CASE on several lines: WHEN, THEN and ELSE indented under it.
     * Only the outermost CASE of the term; one nested in brackets is left alone. */
    function layoutSql(term) {
      let out = '', depth = 0, quoted = false, inCase = false;
      for (let i = 0; i < term.length; i++) {
        const ch = term[i];
        if (ch === "'") quoted = !quoted;
        else if (!quoted && ch === '(') depth++;
        else if (!quoted && ch === ')') depth--;
        if (!quoted && depth === 0 && /[A-Za-z]/.test(ch) && !/\w/.test(term[i - 1] || ' ')) {
          const word = /^[A-Za-z]+/.exec(term.slice(i))[0], upper = word.toUpperCase();
          if (upper === 'CASE') inCase = true;
          else if (inCase && (upper === 'WHEN' || upper === 'THEN' || upper === 'ELSE')) out = out.replace(/ +$/, '') + '\n    ';
          else if (inCase && upper === 'END') { out = out.replace(/ +$/, '') + '\n'; inCase = false; }
          out += word; i += word.length - 1;
          continue;
        }
        out += ch;
      }
      return out;
    }

    /* SQL as [kind, text] pieces, with the same kinds as `pieces`. */
    const SQL_PIECE = new RegExp([
      "('(?:[^']|'')*'?)",                                                    // 1 text
      '(\\b\\d+(?:\\.\\d+)?\\b)',                                   // 2 number
      '((?:\\w+\\.)?\\[[^\\]]*\\]?)',                               // 3 Table.[Column]
      '\\b(CASE|WHEN|THEN|ELSE|END|AS|AND|OR|NOT|LIKE|IN|IS|NULL|BETWEEN)\\b',   // 4 keyword
      '((?:\\w+\\.)*\\w+)(?=\\()',                                    // 5 function
      '(<>|!=|<=|>=|[-+*\\/%=<>])'                                          // 6 operator
    ].join('|'), 'gi');

    function sqlPieces(sql) {
      const out = [];
      let last = 0, match;
      SQL_PIECE.lastIndex = 0;
      while ((match = SQL_PIECE.exec(sql))) {
        if (match.index > last) out.push(['', sql.slice(last, match.index)]);
        out.push([match[1] !== undefined ? 'text' : match[2] !== undefined ? 'number' : match[3] !== undefined ? 'column'
          : match[4] !== undefined ? 'word' : match[5] !== undefined ? 'fn' : 'op', match[0]]);
        last = match.index + match[0].length;
      }
      if (last < sql.length) out.push(['', sql.slice(last)]);
      return out;
    }

    /* Which top-level term of a formula the caret is in, and how many there
     * are: { index, count }. Terms are split by operators outside brackets and
     * quotes, which is how a flat run of rows reads as text. */
    function termAt(source, caret) {
      let depth = 0, quote = null, count = 1, index = 0;
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (quote) { if (ch === quote) quote = null; continue; }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '(') depth++;
        else if (ch === ')') depth--;
        else if (depth === 0 && '+-*/%'.includes(ch)) { count++; if (i < caret) index++; }
      }
      return { index, count };
    }

    /* ---- evaluator: an estimate of what SQL would return ---- */
    class UnknownColumn extends Error {}

    function compare(cond, a, b) {
      const bool = (v) => (typeof v === 'boolean' ? v : /^(1|true)$/i.test(text(v)));
      if (typeof a === 'boolean' || typeof b === 'boolean') { a = bool(a); b = bool(b); }
      else if (typeof a === 'number' || typeof b === 'number') { a = Number(a); b = Number(b); }
      else { a = lower(a); b = lower(b); }
      switch (cond) {
        case 'Equal': return a === b;
        case 'Not Equal': return a !== b;
        case 'Less': return a < b;
        case 'Less Equal': return a <= b;
        case 'Greater': return a > b;
        case 'Greater Equal': return a >= b;
        case 'Contains': return text(a).includes(text(b));
        case 'Not Contains': return !text(a).includes(text(b));
        case 'Starts With': return text(a).startsWith(text(b));
        case 'Ends With': return text(a).endsWith(text(b));
        default: return false;
      }
    }

    /* `lookup(name)` returns a column's value or throws UnknownColumn. */
    function evaluate(node, lookup, today) {
      let value;
      if (node.kind === 'prop') value = lookup(node.name);
      else if (node.kind === 'today') value = today || new Date().toISOString().slice(0, 19);
      else if (node.kind === 'const') {
        value = node.type === 'String' ? node.value : node.type === 'Boolean' ? node.value === 'True' : Number(node.value || 0);
      } else if (node.kind === 'calc') {
        const a = evaluate(node.left, lookup, today), b = evaluate(node.right, lookup, today);
        if (node.op === '+') value = typeof a === 'number' && typeof b === 'number' ? a + b : text(a) + text(b);
        else if (node.op === '-') value = Number(a) - Number(b);
        else if (node.op === '*') value = Number(a) * Number(b);
        else if (node.op === '/') value = Number(a) / Number(b);
        else value = Number(a) % Number(b);
      } else if (node.kind === 'if') {
        const holds = (when) => (when.op
          ? (when.op === 'And' ? holds(when.left) && holds(when.right) : holds(when.left) || holds(when.right))
          : compare(when.cond, evaluate(when.left, lookup, today), evaluate(when.right, lookup, today)));
        const branch = node.branches.find((candidate) => holds(candidate.when));
        value = evaluate(branch ? branch.then : node.otherwise, lookup, today);
      } else value = '';
      if (!node.fn) return value;
      const fn = FUNCTIONS[node.fn.name.toLowerCase()];
      return fn.run(value, ...node.fn.args.map((arg, i) => (fn.args[i][1] === 'n' ? Number(arg || 0) : arg)));
    }

    return {
      FUNCTION_LIST, FUNCTIONS, DATE_PARTS, OPERATORS, CONDITIONS, FormulaError, UnknownColumn, parse,
      format, evaluate, references, children, signature, signatureParts, callAt, pieces, splitSql,
      layoutSql, sqlPieces, termAt, text, FUNCTION_BY_VALUE, ASSOCIATIVE, CONDITION_SYMBOL
    };
  })();
  if (typeof module !== 'undefined' && module.exports) { module.exports = { ExpressionCore }; return; }

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
   * Module: ExpressionEditor - Properties tab, a property's Expression builder
   * -----------------------------------------------------------------------------
   * Above the stock builder: a typed formula box limited to what the builder
   * can hold, Apply (sets the builder's own dropdowns and presses its own add
   * and remove buttons, one server round per step, then checks the builder
   * against what was typed), and an estimated preview (published rows over
   * REST, worked out in script; the property-to-column map comes from the
   * object's saved definition).
   *
   * The stock builder is restyled: flat rows for runs of + or *, each value on
   * one line, If / then / else as a card, type-to-filter property boxes as on
   * the IQA Filters tab, the read-only Calculated formula coloured and linked
   * to its rows. The styling only adds classes, labels, buttons of its own and
   * display text; it moves and removes nothing iMIS wrote.
   *
   * Nothing here saves: Save and Publish stay the designer's own buttons.
   * The design record, measurements and what was learnt about the builder are
   * in prototypes/wip/bo-expression-builder/README.md.
   * ======================================================================== */
  const ExpressionEditor = (function (core) {
    const {
      text, FUNCTION_LIST, FUNCTIONS, FUNCTION_BY_VALUE, signatureParts, signature, callAt,
      OPERATORS, ASSOCIATIVE, CONDITION_SYMBOL, FormulaError, parse, format, references, pieces, splitSql,
      layoutSql, sqlPieces, termAt, evaluate
    } = core;

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const prm = () => window.Sys && Sys.WebForms && Sys.WebForms.PageRequestManager.getInstance();
    const builderPage = () => document.querySelector('[id$="PropertiesControl_ExpressionBuilderPage"]');
    const h = (tag, attrs, ...children) => {
      const el = document.createElement(tag);
      for (const [key, value] of Object.entries(attrs || {})) {
        if (key === 'class') el.className = value;
        else if (value !== false && value !== null && value !== undefined) el.setAttribute(key, value === true ? '' : value);
      }
      el.append(...children.filter((child) => child !== null && child !== undefined));
      return el;
    };

    /* ---- builder control names (the ctlNN parts of an id change between loads) ---- */
    const KIND = 'ExpressionBuilderControlContainerDropDownListOptions';
    const FN_SELECT = 'ExpressionBuilderControlContainerFunctionDropDownList';
    const FN_TOP = 'FunctionDefinitionContainerTop_';
    const FN_BOTTOM = 'FunctionDefinitionContainerBottom_';
    const LEFT = 'LeftExpressionControlContainer_';
    const RIGHT = 'RightExpressionControlContainer_';
    const WHEN_THEN = 'WhenThenExpressionControlContainer_';
    /* An If holds one or more branches (the first, then each "else if"). Their
     * controls differ only in a ctlNN after WhenThen…; readIndex turns that
     * into the branch's position: #0, #1, … */
    const branchPath = (path, position) => path + WHEN_THEN + '#' + position + '_';
    const WHEN = 'WhenExpressionControlContainter_';                   // iMIS's spelling
    const THEN = 'ThenExpressionControlContainer_';
    const COND = 'ConditionOptionDropDownList';
    const isGroupWord = (value) => value === 'And' || value === 'Or';
    const ELSE = 'ElseExpressionControlContainer_';
    const KIND_VALUE = { prop: 'Property', const: 'Constant', calc: 'Calculation', if: 'If then else', today: 'Today', none: 'None' };

    /* Everything in the builder, keyed by its path in the tree: `controls` are
     * the selects and text boxes, `actions` the links and image buttons that
     * add or remove a condition or a branch. Two controls with one key means a
     * shape this editor cannot tell apart. */
    function readIndex() {
      const controls = {}, actions = {}, repeated = [], found = [];
      const BRANCH = /WhenThenExpressionControlContainer_ctl(\d+)_/g;
      const numbers = new Map();                              // an If's id so far -> the ctl numbers of its branches
      builderPage().querySelectorAll('select[id], input[type="text"][id], a[id], input[type="image"][id]').forEach((el) => {
        if (el.closest('.bx')) return;
        const raw = el.id.replace(/^.*ExpressionBuilder_ctl\d+_/, '');
        let match;
        BRANCH.lastIndex = 0;
        while ((match = BRANCH.exec(raw))) {
          const owner = raw.slice(0, match.index);
          if (!numbers.has(owner)) numbers.set(owner, new Set());
          numbers.get(owner).add(Number(match[1]));
        }
        found.push([el, raw]);
      });
      const position = (owner, number) => Array.from(numbers.get(owner)).sort((a, b) => a - b).indexOf(number);
      found.forEach(([el, raw]) => {
        const key = raw
          .replace(BRANCH, (all, number, offset) => WHEN_THEN + '#' + position(raw.slice(0, offset), Number(number)) + '_')
          .replace(/ctl\d+_/g, '');
        if (el.tagName === 'A' || el.type === 'image') { actions[key] = el; return; }
        if (controls[key]) repeated.push(key);
        controls[key] = el;
      });
      return { controls, actions, repeated };
    }
    const branchCount = (index, path) => { let count = 0; while (index.controls[branchPath(path, count) + WHEN + COND]) count++; return count; };

    class Unsupported extends Error {}
    const optionText = (select) => (select.options[select.selectedIndex] ? select.options[select.selectedIndex].text.trim() : '');

    /* ---- reader: builder controls -> tree ---- */
    function readFunction(index, path) {
      const select = index.controls[path + FN_SELECT];
      if (!select || select.value === 'NoFunction') return null;
      const fn = FUNCTION_BY_VALUE[select.value];
      if (!fn) throw new Unsupported('the ' + optionText(select) + ' function');
      return { name: fn.name, args: fn.args.map(([key]) => (index.controls[path + key] ? index.controls[path + key].value : '')) };
    }

    function readCondition(index, path) {
      const select = index.controls[path + COND];
      if (!select) throw new Unsupported('a condition this editor cannot find');
      if (isGroupWord(select.value)) return { op: select.value, left: readCondition(index, path + LEFT), right: readCondition(index, path + RIGHT) };
      const cond = optionText(select);
      if (!CONDITION_SYMBOL[cond]) throw new Unsupported('the "' + cond + '" comparison');
      return { left: readNode(index, path + LEFT), cond, right: readNode(index, path + RIGHT) };
    }

    function readNode(index, path) {
      const kindSelect = index.controls[path + KIND];
      if (!kindSelect) throw new Unsupported('a part of the builder this editor cannot find');
      if (index.repeated.some((key) => key.startsWith(path) && !key.slice(path.length).includes('ExpressionControlContain'))) {
        throw new Unsupported('a part of the builder this editor cannot tell apart');
      }
      switch (kindSelect.value) {
        case 'None': return { kind: 'none' };
        case 'Property':
          return { kind: 'prop', name: optionText(index.controls[path + 'PropertiesDropDownList']), fn: readFunction(index, path + FN_BOTTOM) };
        case 'Today': return { kind: 'today', fn: readFunction(index, path + FN_BOTTOM) };
        case 'Constant': {
          const type = index.controls[path + 'ConstantTypeDropDown'].value;
          let value;
          if (type === 'Boolean') value = index.controls[path + 'ConstantBooleanDropDown'].value === '1' ? 'True' : 'False';
          else if (['String', 'Integer', 'Decimal'].includes(type)) value = index.controls[path + 'ConstantTextBox'].value;
          else throw new Unsupported(type + ' constants');
          return { kind: 'const', type, value, fn: readFunction(index, path + FN_BOTTOM) };
        }
        case 'Calculation':
          return { kind: 'calc', op: optionText(index.controls[path + 'CalculationOptionDropDownList']),
            left: readNode(index, path + LEFT), right: readNode(index, path + RIGHT), fn: readFunction(index, path + FN_TOP) };
        case 'If then else': {
          const branches = [];
          for (let i = 0; i < branchCount(index, path); i++) {
            branches.push({ when: readCondition(index, branchPath(path, i) + WHEN), then: readNode(index, branchPath(path, i) + THEN) });
          }
          if (!branches.length) throw new Unsupported('an If this editor cannot find');
          return { kind: 'if', branches, otherwise: readNode(index, path + ELSE), fn: readFunction(index, path + FN_TOP) };
        }
        default: throw new Unsupported('"' + kindSelect.value + '"');
      }
    }

    function readBuilder() {
      try {
        const index = readIndex();
        if (!index.controls[KIND]) return { tree: null, reason: null };
        const tree = readNode(index, '');
        return { tree, reason: null };
      } catch (error) {
        if (error instanceof Unsupported) return { tree: null, reason: error.message };
        throw error;
      }
    }

    /* ---- planner: what to set this round so the builder moves towards `want` ----
     * A kind (or function, or constant type) change makes iMIS draw new controls,
     * so that branch waits for the next round. */
    function plan(want, index) {
      const sets = [];
      /* Adding or removing a condition or a branch is a button, not a value:
       * one press is one round on its own, taken when there is nothing to set. */
      let press = null;
      const pressing = (key, what) => {
        if (press) return;
        if (!index.actions[key]) throw new Error('The builder has no button to ' + what);
        press = index.actions[key];
      };
      const set = (key, value, what) => {
        const el = index.controls[key];
        if (!el) throw new Error('The builder has no control for ' + what);
        if (el.tagName !== 'SELECT') {
          if (el.value !== value) sets.push([el, value]);
          return el.value !== value;
        }
        const option = Array.from(el.options).find((o) => o.value === value)
          || Array.from(el.options).find((o) => o.text.trim().toLowerCase() === String(value).toLowerCase());
        if (!option) throw new Error('"' + value + '" is not available for ' + what);
        if (el.value !== option.value) { sets.push([el, option.value]); return true; }
        return false;
      };

      function planFunction(fn, path, what) {
        if (!index.controls[path + FN_SELECT]) {
          if (fn) throw new Error('A function cannot be used on ' + what);
          return;
        }
        const def = fn && FUNCTIONS[fn.name.toLowerCase()];
        if (set(path + FN_SELECT, def ? def.value : 'NoFunction', 'a function on ' + what) || !def) return;
        def.args.forEach(([key], i) => set(path + key, fn.args[i], def.name));
      }

      function planNode(node, path) {
        const what = format(node).slice(0, 40) || 'an empty value';
        if (set(path + KIND, KIND_VALUE[node.kind], what)) return;
        if (node.kind === 'prop') {
          /* The functions on offer depend on the property's type, so they are
           * only right after iMIS has redrawn for the new property. */
          if (set(path + 'PropertiesDropDownList', node.name, 'a property')) return;
          planFunction(node.fn, path + FN_BOTTOM, what);
        } else if (node.kind === 'today') planFunction(node.fn, path + FN_BOTTOM, what);
        else if (node.kind === 'const') {
          if (set(path + 'ConstantTypeDropDown', node.type, 'a constant')) return;
          if (node.type === 'Boolean') set(path + 'ConstantBooleanDropDown', node.value === 'True' ? '1' : '0', 'True or False');
          else set(path + 'ConstantTextBox', node.value, 'a constant');
          planFunction(node.fn, path + FN_BOTTOM, what);
        } else if (node.kind === 'calc') {
          set(path + 'CalculationOptionDropDownList', OPERATORS[node.op], 'an operator');
          planFunction(node.fn, path + FN_TOP, what);
          planNode(node.left, path + LEFT);
          planNode(node.right, path + RIGHT);
        } else if (node.kind === 'if') {
          planFunction(node.fn, path + FN_TOP, what);
          const have = branchCount(index, path);
          if (have < node.branches.length) pressing(path + 'AddConditionLinkButton', 'add an else-if');
          else if (have > node.branches.length) pressing(branchPath(path, have - 1) + 'RemoveOuterIfThenElseImageButton', 'remove an else-if');
          node.branches.slice(0, have).forEach((branch, i) => {
            planCondition(branch.when, branchPath(path, i) + WHEN);
            planNode(branch.then, branchPath(path, i) + THEN);
          });
          planNode(node.otherwise, path + ELSE);
        }
      }

      /* "Add condition" turns the condition at this spot into a group: what was
       * there becomes its left side and the right side is new and empty.
       * Removing a group keeps its left side. Both were checked on the dev
       * tenant, 11 November 2026. */
      function planCondition(when, path) {
        const select = index.controls[path + COND];
        if (!select) throw new Error('The builder has no control for a condition');
        const grouped = isGroupWord(select.value);
        if (when.op) {
          if (!grouped) { pressing(path + 'GroupConditionLinkButton', 'add a condition'); return; }
          set(path + COND, when.op, 'and / or');
          planCondition(when.left, path + LEFT);
          planCondition(when.right, path + RIGHT);
        } else {
          if (grouped) { pressing(path + 'RemoveConditionImageButton', 'remove a condition'); return; }
          set(path + COND, when.cond, 'a comparison');
          planNode(when.left, path + LEFT);
          planNode(when.right, path + RIGHT);
        }
      }

      planNode(want, '');
      return { sets, press };
    }

    /* ---- postbacks: one request cycle, then wait for iMIS to go quiet ---- */
    const net = { begun: 0, ended: 0, lastEnd: 0, error: null };
    const onBeginRequest = (sender, args) => {
      net.begun++;
      const source = args && args.get_postBackElement && args.get_postBackElement();
      const page = builderPage();
      if (source && page && page.contains(source) && getMode()) setBusy(true);
    };
    const onEndRequest = (sender, args) => {
      net.ended++; net.lastEnd = performance.now();
      const error = args.get_error && args.get_error();
      if (error && state.applying) { net.error = error.message; if (args.set_errorHandled) args.set_errorHandled(true); }
      setBusy(false);
    };

    async function roundTrip(trigger) {
      const begunBefore = net.begun, started = Date.now();
      net.error = null;
      trigger();
      for (;;) {
        await sleep(60);
        const quiet = net.begun > begunBefore && net.ended >= net.begun && !prm().get_isInAsyncPostBack()
          && performance.now() - net.lastEnd > 350;
        if (quiet) break;
        if (Date.now() - started > 30000) throw new Error('iMIS did not answer');
      }
      if (net.error) throw new Error(net.error);
    }
    const postBack = (el) => roundTrip(() => el.dispatchEvent(new Event('change', { bubbles: true })));

    /* iMIS asks "are you sure?" before it removes a condition or a branch.
     * Apply was the go-ahead for the whole formula, and nothing is saved by it,
     * so that question is answered yes for this one press only. */
    const pressBack = (el) => roundTrip(() => {
      const ask = window.confirm;
      window.confirm = () => true;
      try { el.click(); } finally { window.confirm = ask; }
    });

    /* ---- Apply ---- */
    const MAX_ROUNDS = 60;
    async function apply(want) {
      const property = selectedProperty();
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        if (state.cancel) throw new Error('Stopped. The builder is part-way; Reset shows what it holds now.');
        if (selectedProperty() !== property) throw new Error('The selected property changed');
        const { sets, press } = plan(want, readIndex());
        if (!sets.length && !press) return round - 1;
        setStatus('Applying… step ' + round, 'busy');
        if (sets.length) {
          sets.forEach(([el, value]) => { el.value = value; });
          await postBack(sets[sets.length - 1][0]);
        } else await pressBack(press);
      }
      throw new Error('Stopped after ' + MAX_ROUNDS + ' steps without finishing');
    }

    /* ===========================================================================
     * Preview data: the saved definition (property -> source column) and a few
     * published rows, both over REST
     * ======================================================================== */
    const PREVIEW_ROWS = 5;
    let previewData = null;
    function loadPreviewData() {
      if (previewData) return previewData;
      previewData = (async () => {
        const token = document.querySelector('[name="__RequestVerificationToken"]').value;
        const get = async (url) => {
          const response = await fetch(url, { headers: { RequestVerificationToken: token, Accept: 'application/json' }, credentials: 'same-origin' });
          if (!response.ok) throw new Error(response.status + ' from ' + url.split('?')[0]);
          return response.json();
        };
        const documentId = document.querySelector('input[name$="DocumentKeyField"]').value;
        const record = await get('/api/Document/' + documentId);
        const xml = new TextDecoder().decode(Uint8Array.from(atob(record.Data.$value), (c) => c.charCodeAt(0)));
        const dom = new DOMParser().parseFromString(xml, 'application/xml');
        const attribute = (el, name) => { for (const a of el.attributes) if (a.localName === name) return a.value; return ''; };
        const columns = new Map();                           // 'name.city' -> 'Suburb'
        Array.from(dom.getElementsByTagName('*')).forEach((el) => {
          if (el.localName !== 'element' || !attribute(el, 'PropertyKey') || !attribute(el, 'SourceTable')) return;
          const key = (attribute(el, 'SourceTable') + '.' + attribute(el, 'SourceColumn')).toLowerCase();
          if (!columns.has(key)) columns.set(key, el.getAttribute('name'));
        });
        /* One row per request: on the dev tenant a single bad row fails the
         * whole page with a 500, so a failed row is skipped, not fatal. */
        const one = (offset) => get('/api/' + encodeURIComponent(record.Name) + '?limit=1&offset=' + offset)
          .then((data) => data.Items.$values[0] || null, () => null);
        const items = (await Promise.all(Array.from({ length: PREVIEW_ROWS + 3 }, (_, offset) => one(offset))))
          .filter(Boolean).slice(0, PREVIEW_ROWS);
        const rows = items.map((item) => Object.fromEntries(item.Properties.$values.map((p) =>
          [p.Name, p.Value && typeof p.Value === 'object' ? p.Value.$value : p.Value])));
        return { columns, rows, name: record.Name };
      })();
      previewData.catch(() => { previewData = null; });
      return previewData;
    }

    /* ===========================================================================
     * State and panel
     * ======================================================================== */
    const state = {
      property: null,          // the property the text belongs to
      text: '',                // what is in the box
      builderText: '',         // the builder, as a formula
      reason: null,            // why the builder cannot be edited as text
      dirty: false,
      applying: false,
      cancel: false,
      showStructure: false,
      status: null             // { message, tone } kept across redraws
    };

    function selectedProperty() {
      const row = document.querySelector('tr.rgSelectedRow');
      if (!row) return null;
      const cell = Array.from(row.cells).find((c) => c.innerText.trim());
      return cell ? cell.innerText.trim() : null;
    }

    function setStatus(message, tone) {
      state.status = message ? { message, tone: tone || 'info' } : null;
      const el = document.getElementById('bxStatus');
      if (!el) return;
      el.textContent = message || '';
      el.dataset.tone = tone || 'info';
    }

    function panel() {
      let el = document.getElementById('bxPanel');
      if (el) return el;
      el = h('div', { id: 'bxPanel', class: 'bx bx-panel' },
        h('div', { class: 'bx-head' },
          h('h3', { id: 'bxTitle' }),
          h('p', { class: 'bx-legend', 'aria-label': 'Formula colours' },
            h('span', { class: 'bx-t-fn' }, 'Function'), h('span', {}, h('span', { class: 'bx-t-table' }, 'Table.'), h('span', { class: 'bx-t-column' }, 'Field')),
            h('span', { class: 'bx-t-text' }, '"text"'), h('span', { class: 'bx-t-number' }, '123'), h('span', { class: 'bx-t-word' }, 'True')),
          h('span', { id: 'bxBusy', class: 'bx-busy-note', role: 'status' }, 'Updating\u2026'),
          h('label', { class: 'bx-structure', title: 'Show the builder as iMIS draws it, with every level' },
            h('input', { type: 'checkbox', id: 'bxStructure' }), ' Show structure')),
        h('div', { class: 'bx-edit' },
          h('pre', { id: 'bxMirror', class: 'bx-mirror', 'aria-hidden': 'true' }),
          h('textarea', { id: 'bxText', rows: '3', spellcheck: 'false', autocomplete: 'off',
            'aria-label': 'Expression as a formula', 'aria-describedby': 'bxStatus' }),
          h('div', { id: 'bxSuggest', class: 'bx-suggest', role: 'listbox', hidden: true })),
        h('div', { id: 'bxHint', class: 'bx-hint', 'aria-live': 'polite' }),
        h('div', { class: 'bx-actions' },
          h('button', { type: 'button', id: 'bxApply', class: 'TextButton PrimaryButton' }, 'Apply to builder'),
          h('button', { type: 'button', id: 'bxReset', class: 'TextButton' }, 'Reset'),
          h('span', { id: 'bxStatus', role: 'status', 'aria-live': 'polite' })),
        h('div', { id: 'bxPreview', class: 'bx-preview' }));

      const box = el.querySelector('#bxText');
      box.addEventListener('input', () => {
        state.text = box.value; state.dirty = box.value.trim() !== state.builderText; state.status = null;
        paint(); onTextChanged(); suggest(); drawHint();
      });
      box.addEventListener('scroll', paint);
      if (window.ResizeObserver) new ResizeObserver(paint).observe(box);
      ['keyup', 'click', 'focus', 'blur'].forEach((type) => box.addEventListener(type, () => setTimeout(() => { drawHint(); markCaretTerm(); }, 0)));
      box.addEventListener('blur', () => markTerm(null));
      box.addEventListener('keydown', onTextKey);
      box.addEventListener('blur', () => setTimeout(hideSuggest, 150));
      el.querySelector('#bxApply').addEventListener('click', onApply);
      el.querySelector('#bxReset').addEventListener('click', () => {
        if (state.applying) { state.cancel = true; return; }
        state.dirty = false; state.text = state.builderText; state.status = null; draw();
      });
      el.querySelector('#bxStructure').addEventListener('change', (event) => { state.showStructure = event.target.checked; run(); });
      return el;
    }

    /* Gives every property in the tree the builder's own spelling, and refuses a
     * name the builder does not offer: Apply must not start on a formula it
     * cannot finish, because each step it takes replaces part of the builder. */
    function resolveProperties(tree) {
      const names = new Map(propertyNames().map((name) => [name.toLowerCase(), name]));
      if (!names.size) return;
      (function walk(node) {
        if (!node) return;
        if (node.kind === 'prop') {
          const known = names.get(node.name.toLowerCase());
          if (!known) {
            throw new FormulaError('"' + node.name + '" is not a column of this object\'s tables',
              Math.max(0, state.text.toLowerCase().indexOf(node.name.toLowerCase())));
          }
          node.name = known;
        }
        core.children(node).forEach(walk);
      })(tree);
    }

    /* Property types seen in the builder so far ('name.join_date' -> 'DBTimeStamp').
     * iMIS only shows a property's type once it is in the builder, so a type
     * not seen yet is simply not checked here; Apply reports it instead. */
    const seenTypes = new Map();
    const TYPE_FAMILY = { VarChar: 'text', NVarChar: 'text', Text: 'text', DBTimeStamp: 'date', Numeric: 'number', Integer: 'number', Boolean: 'number' };
    const FAMILY_WORDS = { text: 'text', date: 'a date', number: 'a number' };
    function learnTypes(index) {
      Object.entries(index.controls).forEach(([key, el]) => {
        if (!key.endsWith('PropertiesDropDownList')) return;
        const type = index.controls[key.replace('PropertiesDropDownList', 'PropertyTypeDropDownList')];
        if (type) seenTypes.set(optionText(el).toLowerCase(), optionText(type));
      });
    }

    function checkFunctionTypes(tree) {
      (function walk(node) {
        if (!node) return;
        if (node.fn) {
          const fn = core.FUNCTIONS[node.fn.name.toLowerCase()];
          const family = node.kind === 'prop' ? TYPE_FAMILY[seenTypes.get(node.name.toLowerCase())]
            : node.kind === 'today' ? 'date' : node.kind === 'const' && node.type === 'String' ? 'text' : null;
          if (family && !fn.family.split(' ').includes(family)) {
            const what = node.kind === 'prop' ? node.name : node.kind === 'today' ? 'Today' : 'This value';
            const fits = FUNCTION_LIST.filter((other) => other.family.split(' ').includes(family)).map((other) => other.name).join(', ');
            throw new FormulaError(fn.name + ' cannot be used here: ' + what + ' is ' + FAMILY_WORDS[family] + '. For ' + FAMILY_WORDS[family] + ': ' + fits,
              Math.max(0, state.text.toLowerCase().indexOf(fn.name.toLowerCase() + '(')));
          }
        }
        core.children(node).forEach(walk);
      })(tree);
    }

    /* Parses the box and updates Apply, the status line and the preview. */
    function onTextChanged() {
      const applyButton = document.getElementById('bxApply');
      let tree = null;
      try {
        const parsed = parse(state.text);
        resolveProperties(parsed);
        checkFunctionTypes(parsed);
        tree = parsed;
        /* The outcome of an Apply (done or failed) stays until the text changes. */
        const outcome = state.status && (state.status.tone === 'done' || state.status.tone === 'error');
        if (outcome) setStatus(state.status.message, state.status.tone);
        else if (!state.applying) {
          setStatus(state.dirty ? 'Edited. Apply to builder sets the dropdowns below; then Save as usual.' : 'Matches the builder below.', 'info');
        }
      } catch (error) {
        if (!(error instanceof FormulaError)) throw error;
        setStatus(error.message + ' (character ' + (error.position + 1) + ')', 'error');
      }
      if (applyButton) applyButton.disabled = !tree || !state.dirty || state.applying || tree.kind === 'none';
      const resetButton = document.getElementById('bxReset');
      if (resetButton) resetButton.disabled = !state.applying && !state.dirty;
      drawPreview(tree);
      return tree;
    }

    async function onApply() {
      const want = onTextChanged();
      if (!want || state.applying) return;
      state.applying = true; state.cancel = false;
      draw();
      try {
        const rounds = await apply(want);
        state.applying = false;
        const now = readBuilder();
        if (!now.tree || format(now.tree) !== format(want)) throw new Error('The builder does not match what was typed. Reset shows what it holds.');
        state.builderText = state.text = format(now.tree); state.dirty = false;
        setStatus('Applied in ' + rounds + ' step' + (rounds === 1 ? '' : 's') + '. Not saved yet: click Save when ready.', 'done');
      } catch (error) {
        state.applying = false;
        const now = readBuilder();
        state.builderText = now.tree ? format(now.tree) : '';
        state.dirty = state.text.trim() !== state.builderText;
        setStatus(error.message, 'error');
      }
      run();
    }

    function draw() {
      const el = panel();
      const box = el.querySelector('#bxText');
      el.querySelector('#bxTitle').textContent = 'Expression for ' + (state.property || 'this property');
      el.querySelector('#bxStructure').checked = state.showStructure;
      if (box.value !== state.text) box.value = state.text;
      box.disabled = state.applying || !!state.reason;
      paint();
      el.querySelector('#bxReset').textContent = state.applying ? 'Stop' : 'Reset';
      el.querySelector('#bxReset').disabled = !state.applying && !state.dirty;
      el.classList.toggle('bx-readonly', !!state.reason);
      if (state.reason) {
        setStatus('This expression uses ' + state.reason + ', which the formula box cannot edit yet. Use the builder below.', 'info');
        document.getElementById('bxApply').disabled = true;
        drawPreview(null);
      } else if (state.applying) {
        document.getElementById('bxApply').disabled = true;
        if (state.status) setStatus(state.status.message, state.status.tone);
      } else onTextChanged();
    }

    /* ---- colours: the real textarea keeps the caret and the typing but its
     * text is see-through; this paints the same text, coloured, behind it. ---- */
    function paint() {
      const box = document.getElementById('bxText'), mirror = document.getElementById('bxMirror');
      if (!box || !mirror) return;
      const names = new Set(propertyNames().map((name) => name.toLowerCase()));
      const isProperty = names.size ? (name) => names.has(name.toLowerCase()) : null;
      mirror.replaceChildren(...pieces(box.value, isProperty).map(([kind, part]) => (kind ? h('span', { class: 'bx-t-' + kind }, part) : part)), '\n');
      mirror.style.right = (box.offsetWidth - box.clientWidth - 2) + 'px';     // leave room for the box's scrollbar
      mirror.scrollTop = box.scrollTop;
    }

    /* ---- hint: what the function under the caret expects, current part in bold ---- */
    function drawHint() {
      const box = document.getElementById('bxText'), host = document.getElementById('bxHint');
      if (!box || !host) return;
      const call = document.activeElement === box ? callAt(box.value.slice(0, box.selectionStart)) : null;
      const shape = call && signatureParts(call.name);
      if (!shape) { host.replaceChildren(); return; }
      if (shape.name === 'If' && call.index >= 2) {
        const now = call.index % 2 ? 'value if that condition is true' : 'value if nothing matched, or another condition';
        host.replaceChildren(h('span', { class: 'bx-t-fn' }, 'If'), '(condition, value if true, ', call.index > 2 ? '…, ' : '', h('strong', {}, now), ')');
        return;
      }
      const extra = call.index >= shape.parts.length;
      const parts = shape.parts.map((part, i) => (i === call.index ? h('strong', {}, part) : part));
      host.replaceChildren(h('span', { class: 'bx-t-fn' }, shape.name), '(', ...parts.flatMap((part, i) => (i ? [', ', part] : [part])), ')');
      if (shape.notes[call.index]) host.append(h('span', { class: 'bx-hint-note' }, '   ' + shape.notes[call.index]));
      if (extra) host.append(h('em', {}, '  ' + shape.name + ' takes no more parts'));
    }

    /* ---- preview ---- */
    let previewToken = 0;
    async function drawPreview(tree) {
      const host = document.getElementById('bxPreview');
      if (!host) return;
      const token = ++previewToken;
      if (!tree || tree.kind === 'none') { host.replaceChildren(); return; }
      let data;
      try { data = await loadPreviewData(); }
      catch (error) {
        if (token === previewToken) host.replaceChildren(h('p', { class: 'bx-preview-note' }, 'No preview: ' + error.message));
        return;
      }
      if (token !== previewToken) return;
      const missing = Array.from(references(tree)).filter((name) => !data.columns.has(name.toLowerCase()));
      const title = h('p', { class: 'bx-preview-title' }, 'Preview ', h('small', {}, 'estimated from published ' + data.name + ' rows; SQL may differ'));
      if (missing.length) {
        host.replaceChildren(title, h('p', { class: 'bx-preview-note' },
          'No preview: ' + missing.join(', ') + (missing.length === 1 ? ' is' : ' are') + ' not a property of the published object.'));
        return;
      }
      if (!data.rows.length) { host.replaceChildren(title, h('p', { class: 'bx-preview-note' }, 'The published object has no rows.')); return; }
      const first = Object.keys(data.rows[0])[0];
      const list = h('dl', {});
      data.rows.forEach((row) => {
        let result;
        try { result = text(evaluate(tree, (name) => row[data.columns.get(name.toLowerCase())])); }
        catch (error) { result = 'Could not work this out: ' + error.message; }
        list.append(h('dt', {}, text(row[first])), h('dd', {}, result === '' ? h('em', {}, 'empty') : result));
      });
      host.replaceChildren(title, list);
    }

    /* ---- suggestions: properties and functions for the word being typed ---- */
    let suggestions = [], activeSuggestion = 0;
    const hideSuggest = () => { const el = document.getElementById('bxSuggest'); if (el) el.hidden = true; suggestions = []; };

    function propertyNames() {
      const select = builderPage() && builderPage().querySelector('select[id$="PropertiesDropDownList"]');
      return select ? Array.from(select.options).map((o) => o.text.trim()).filter(Boolean) : [];
    }

    function suggest() {
      const box = document.getElementById('bxText'), el = document.getElementById('bxSuggest');
      if (document.activeElement !== box) return hideSuggest();
      const before = box.value.slice(0, box.selectionStart);
      const word = (before.match(/[A-Za-z_][\w.]*$/) || [''])[0];
      const inText = (before.match(/"/g) || []).length % 2 === 1;
      if (word.length < 2 || inText || box.selectionStart !== box.selectionEnd) return hideSuggest();
      const needle = word.toLowerCase();
      const functions = FUNCTION_LIST.map((fn) => fn.name).concat('If')
        .filter((name) => name.toLowerCase().startsWith(needle))
        .map((name) => ({ label: name + '(', detail: signature(name), insert: name + '(' }));
      /* Short words match the start of a table or column; longer ones match anywhere. */
      const matches = (name) => name.startsWith(needle) || name.includes('.' + needle) || (needle.length > 2 && name.includes(needle));
      const properties = propertyNames().filter((name) => matches(name.toLowerCase()))
        .sort((a, b) => (b.toLowerCase().startsWith(needle) - a.toLowerCase().startsWith(needle))
          || (b.toLowerCase().includes('.' + needle) - a.toLowerCase().includes('.' + needle)) || a.localeCompare(b))
        .map((name) => ({ label: name, detail: 'property', insert: name }));
      suggestions = functions.concat(properties).filter((s) => s.insert.toLowerCase() !== needle).slice(0, 10);
      if (!suggestions.length) return hideSuggest();
      activeSuggestion = 0;
      el.replaceChildren(...suggestions.map((s, i) => {
        const option = h('div', { role: 'option', 'aria-selected': String(i === 0) },
          h('span', { class: s.detail === 'property' ? 'bx-t-column' : 'bx-t-fn' }, s.label), h('small', {}, s.detail));
        option.addEventListener('pointerdown', (event) => { event.preventDefault(); activeSuggestion = i; acceptSuggestion(); });
        return option;
      }));
      el.hidden = false;
    }

    function acceptSuggestion() {
      const box = document.getElementById('bxText'), pick = suggestions[activeSuggestion];
      if (!pick) return;
      const before = box.value.slice(0, box.selectionStart);
      const word = (before.match(/[A-Za-z_][\w.]*$/) || [''])[0];
      const rest = box.value.slice(box.selectionStart).match(/^[\w.]*/)[0];
      box.setRangeText(pick.insert, box.selectionStart - word.length, box.selectionStart + rest.length, 'end');
      hideSuggest();
      box.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function onTextKey(event) {
      const open = suggestions.length && !document.getElementById('bxSuggest').hidden;
      if (event.key === 'Escape') { event.stopPropagation(); if (open) { event.preventDefault(); hideSuggest(); } return; }   // keep Esc from closing the popup window
      if (!open) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestion = (activeSuggestion + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
        Array.from(document.getElementById('bxSuggest').children).forEach((el, i) => el.setAttribute('aria-selected', String(i === activeSuggestion)));
      } else if (event.key === 'Tab' || event.key === 'Enter') { event.preventDefault(); acceptSuggestion(); }
    }

    /* ===========================================================================
     * Builder styling: flat rows, quiet controls, searchable properties
     * ======================================================================== */
    const MARKS = ['bx-chain', 'bx-open', 'bx-through', 'bx-term', 'bx-op', 'bx-quiet', 'bx-fn-none', 'bx-root',
      'bx-leaf', 'bx-if', 'bx-if-grid', 'bx-if-through', 'bx-if-label', 'bx-if-when', 'bx-if-cond', 'bx-if-value', 'bx-if-link',
      'bx-cond-group', 'bx-cond-join', 'bx-cond-box', 'bx-cond-node',
      'bx-target', 'bx-doomed', 'bx-native-hidden', 'bx-link-quiet'];
    const NO_FUNCTION_TEXT = '+ Add function';
    /* Short words shown beside a function's boxes in the builder rows. */
    const ARG_WORD = { 'expression to replace': 'find', 'text to replace with': 'with', 'text to find': 'find',
      'number of characters': 'characters', 'number of times': 'times', 'start position': 'from',
      'decimal places': 'decimals', 'date part': 'part' };

    function clearDecoration() {
      const page = builderPage();
      if (!page) return;
      MARKS.forEach((mark) => page.querySelectorAll('.' + mark).forEach((el) => el.classList.remove(mark)));
      page.classList.remove('bx-host');
      page.querySelectorAll('.bx-note, .bx-sql, .bx-word, .bx-trash, .bx-outline').forEach((el) => el.remove());
      page.querySelectorAll('[data-bx-text]').forEach((el) => { el.textContent = el.dataset.bxText; delete el.dataset.bxText; });
      page.querySelectorAll('[data-bx-title]').forEach((el) => { el.title = el.dataset.bxTitle; delete el.dataset.bxTitle; });
      page.querySelectorAll('[data-bx-order]').forEach((el) => { el.style.order = ''; delete el.dataset.bxOrder; });
      page.querySelectorAll('.bx-sql-native, .bx-at, .bx-flash').forEach((el) => el.classList.remove('bx-sql-native', 'bx-at', 'bx-flash'));
      rows = [];
      disposePickers();
    }

    /* The pieces of one Calculation level, or null if the markup is not as expected. */
    function levelParts(index, path) {
      const kind = index.controls[path + KIND], op = index.controls[path + 'CalculationOptionDropDownList'];
      const left = index.controls[path + LEFT + KIND], right = index.controls[path + RIGHT + KIND];
      if (!kind || kind.value !== 'Calculation' || !op || !left || !right) return null;
      const inner = op.parentElement, box = inner.closest('.Expression');
      if (left.parentElement.parentElement !== inner || right.parentElement.parentElement !== inner || !box) return null;
      const fn = index.controls[path + FN_TOP + FN_SELECT];
      return { container: kind.parentElement, kind, op, inner, box, fn,
        leftContainer: left.parentElement, rightContainer: right.parentElement, plain: !fn || fn.value === 'NoFunction' };
    }

    function decorate() {
      clearDecoration();
      const page = builderPage();
      if (!page) return;
      const index = readIndex();

      Object.entries(index.controls).forEach(([key, el]) => {
        if (key.endsWith(FN_SELECT) && el.value === 'NoFunction') el.classList.add('bx-fn-none');
        const wantsNote = /Expression(ToFind|ToReplace)Textbox$/.test(key)
          || (key.endsWith('ConstantTextBox') && (index.controls[key.replace('ConstantTextBox', 'ConstantTypeDropDown')] || {}).value === 'String');
        if (wantsNote && (el.value === '' || /^ +$/.test(el.value))) {
          el.after(h('span', { class: 'bx bx-note' }, el.value === '' ? 'empty' : el.value.length + ' space' + (el.value.length > 1 ? 's' : '')));
        }
        if (key.endsWith('PropertiesDropDownList')) attachPicker(el);

        /* "No function" reads as an invitation. Only the option's text changes;
         * its value, which is what posts back, stays NoFunction. */
        if (key.endsWith(FN_SELECT) && el.value === 'NoFunction' && el.selectedOptions[0]) {
          el.selectedOptions[0].dataset.bxText = el.selectedOptions[0].text;
          el.selectedOptions[0].text = NO_FUNCTION_TEXT;
        }

        /* A word beside each of a function's boxes, unless iMIS already wrote one. */
        const fn = key.endsWith(FN_SELECT) && FUNCTION_BY_VALUE[el.value];
        if (fn) {
          fn.args.forEach(([control, , label]) => {
            const box = index.controls[key.slice(0, -FN_SELECT.length) + control];
            if (!box) return;
            let before = box.previousSibling;
            while (before && ((before.nodeType === 3 && !before.textContent.trim()) || (before.nodeType === 1 && before.classList.contains('bx')))) before = before.previousSibling;
            const worded = before && (before.nodeType === 3 || !/^(SELECT|INPUT)$/.test(before.tagName)) && before.textContent.trim();
            if (!worded) box.before(h('span', { class: 'bx bx-word' }, ARG_WORD[label] || label));
          });
        }

        /* A condition: a comparison reads across on one line; a group (and / or)
         * stacks its two sides with the joining word between them. */
        if (key.endsWith(COND)) {
          const panel = el.closest('div[id$="NestedControlPanel"]');
          if (panel) {
            panel.classList.add(isGroupWord(el.value) ? 'bx-cond-group' : 'bx-if-cond');
            panel.parentElement.classList.add('bx-cond-box');
            panel.parentElement.parentElement.classList.add('bx-cond-node');
            if (isGroupWord(el.value)) el.parentElement.classList.add('bx-cond-join');
          }
        }

        /* A value row (property, constant, Today, empty) lays out on one line. */
        if (key.endsWith(KIND) && ['Property', 'Constant', 'Today', 'None'].includes(el.value)) el.parentElement.classList.add('bx-leaf');
        if (key.endsWith(KIND) && el.value === 'If then else') styleIf(el.parentElement);
      });
      labelActions(index);

      const chain = chainOf(index);
      if (!chain.levels.length) return;
      const top = chain.levels[0];
      top.container.classList.add('bx-root');
      if (top.plain) top.container.classList.add('bx-quiet');
      top.box.classList.add('bx-open');
      top.inner.classList.add('bx-chain');
      chain.levels.slice(1).forEach((level) => [level.container, level.box, level.inner].forEach((el) => el.classList.add('bx-through')));
      chain.levels.forEach((level) => level.op.classList.add('bx-op'));
      chain.terms.forEach((el) => el.classList.add('bx-term'));
    }

    /* If / then / else as one card: a label column (IF, THEN, ELSE) beside the
     * values, the condition on one line. iMIS nests these in several wrappers;
     * the wrappers are told to stand aside (display: contents) and each piece
     * is given its place in the card's grid by order. Marks only: no element
     * is moved, so iMIS's postbacks see the markup it wrote. */
    function styleIf(container) {
      const box = container.querySelector(':scope > .Expression');
      const grid = box && box.querySelector(':scope > div[id$="NestedControlPanel"]');
      if (!grid) return;
      container.classList.add('bx-if');
      grid.classList.add('bx-if-grid');
      let order = 0;
      const place = (el, mark) => { el.classList.add(mark); el.style.order = String(order); el.dataset.bxOrder = '1'; };
      const isLabel = (el) => el.tagName === 'DIV' && !el.id && !!el.querySelector(':scope > strong');
      let wrapLink = null;
      Array.from(grid.children).forEach((child) => {
        if (child.tagName === 'A') {
          if (order === 0) { wrapLink = child; return; }        // first in the markup, but about the whole If: it goes to the foot of the card
          order++; place(child, 'bx-if-link');
        } else if (isLabel(child)) { order++; place(child, 'bx-if-label'); }
        else if (child.classList.contains('ExpressionContainer') && /WhenThenExpressionControlContainer_OutermostContainer$/.test(child.id)) {
          const inner = child.querySelector(':scope > div'), parts = inner && inner.querySelector(':scope > div[id$="NestedControlPanel"]');
          if (!parts) return;
          [child, inner, parts].forEach((el) => el.classList.add('bx-if-through'));
          Array.from(parts.children).forEach((part) => {
            if (isLabel(part)) { order++; place(part, 'bx-if-label'); }
            else if (part.classList.contains('ExpressionContainer') && /WhenExpressionControlContainter_OutermostContainer$/.test(part.id)) {
              place(part, 'bx-if-when');
            } else if (part.classList.contains('ExpressionContainer')) place(part, 'bx-if-value');
          });
        } else if (child.classList.contains('ExpressionContainer')) place(child, 'bx-if-value');
      });
      if (wrapLink) { order++; place(wrapLink, 'bx-if-link'); }
    }

    /* ---- the builder's own add and remove buttons ----
     * iMIS labels three different actions "Add condition" and shows a bare red
     * cross for two different removals. Each gets words for what it does, and
     * pointing at it (or focusing it) outlines exactly what it will act on. */
    const conditionNode = (select) => {
      const panel = select && select.closest('div[id$="NestedControlPanel"]');
      return panel ? panel.parentElement.parentElement : null;
    };

    /* One box around everything the control acts on. Separate outlines on each
     * piece ran into one another, so the box is a single see-through layer
     * sized to cover all the pieces; the pieces are only marked, not styled. */
    function outlineWhile(control, mark, targets) {
      const set = (on) => {
        const pieces = targets().filter((el) => el && el.isConnected);
        pieces.forEach((el) => el.classList.toggle(mark, on));
        showOutline(on ? pieces : [], mark === 'bx-doomed' ? 'remove' : 'add');
      };
      control.addEventListener('pointerenter', () => set(true));
      control.addEventListener('pointerleave', () => set(false));
      control.addEventListener('focus', () => set(true));
      control.addEventListener('blur', () => set(false));
    }

    const OUTLINE_PAD = 4;
    function showOutline(pieces, kind) {
      const page = builderPage();
      if (!page) return;
      let box = page.querySelector(':scope > .bx-outline');
      if (!pieces.length) { if (box) box.classList.remove('is-on'); return; }
      if (!box) { box = h('div', { class: 'bx bx-outline', 'aria-hidden': 'true' }); page.append(box); }
      const host = page.getBoundingClientRect();
      const rects = pieces.map((el) => el.getBoundingClientRect()).filter((rect) => rect.width || rect.height);
      if (!rects.length) return;
      const left = Math.min(...rects.map((rect) => rect.left)), top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right)), bottom = Math.max(...rects.map((rect) => rect.bottom));
      box.style.left = (left - host.left - OUTLINE_PAD) + 'px';
      box.style.top = (top - host.top - OUTLINE_PAD) + 'px';
      box.style.width = (right - left + OUTLINE_PAD * 2) + 'px';
      box.style.height = (bottom - top + OUTLINE_PAD * 2) + 'px';
      box.dataset.kind = kind;
      box.classList.add('is-on');
    }

    function reword(link, words, title) {
      link.dataset.bxText = link.textContent;
      link.dataset.bxTitle = link.title || '';
      link.textContent = words;
      link.title = title;
    }

    /* The theme's trash button stands in for iMIS's image button, which stays
     * in the page, hidden, and still does the work (and still asks first). */
    function trashFor(native, label, doomed) {
      const button = h('button', { type: 'button', class: 'bx bx-trash TextButton us-icon-button DangerButton', 'aria-label': label, title: label },
        h('i', { class: 'ti ti-trash', 'aria-hidden': 'true' }));
      button.addEventListener('click', () => native.click());
      outlineWhile(button, 'bx-doomed', doomed);
      native.classList.add('bx-native-hidden');
      native.after(button);
    }

    function labelActions(index) {
      Object.entries(index.actions).forEach(([key, el]) => {
        if (key.endsWith('GroupConditionLinkButton')) {
          const path = key.slice(0, -'GroupConditionLinkButton'.length);
          const select = index.controls[path + COND];
          if (!select) return;
          const parent = path.replace(/(Left|Right)ExpressionControlContainer_$/, '');
          const inGroup = parent !== path && index.controls[parent + COND] && isGroupWord(index.controls[parent + COND].value);
          if (isGroupWord(select.value)) reword(el, 'Add condition to this group', 'Joins one more condition to everything in this group');
          else if (inGroup) {
            reword(el, 'Nest a condition', 'Makes a bracketed group from this one line and a new condition');
            el.classList.add('bx-link-quiet');
          } else reword(el, 'Add condition', 'Joins a second condition to this one with And or Or');
          outlineWhile(el, 'bx-target', () => [select.closest('div[id$="NestedControlPanel"]')].filter(Boolean));
        } else if (key.endsWith('WrapIntoIfThenElseLinkButton')) {
          reword(el, 'Wrap in a new If', 'Puts this whole If inside a new If, as the value for when its condition is true');
          outlineWhile(el, 'bx-target', () => [el.closest('.bx-if')].filter(Boolean));
        } else if (key.endsWith('AddConditionLinkButton')) {
          el.dataset.bxTitle = el.title || '';
          el.title = 'Adds another condition and value, used when the conditions above are not met';
        } else if (key.endsWith('RemoveConditionImageButton')) {
          /* Removing a group keeps its left side: the right side and the joining word go. */
          const path = key.slice(0, -'RemoveConditionImageButton'.length);
          const right = conditionNode(index.controls[path + RIGHT + COND]);
          trashFor(el, 'Remove the condition below', () => [right, el.parentElement].filter(Boolean));
        } else if (key.endsWith('RemoveOuterIfThenElseImageButton')) {
          const label = el.parentElement, first = /#0_RemoveOuterIfThenElseImageButton$/.test(key);
          const branch = () => {
            const rows = [label];
            let next = label.nextElementSibling;
            /* An else-if goes whole: its condition, THEN and value. The first
             * branch can only be removed when its value is the If this one was
             * wrapped around; that value is what stays. */
            for (let taken = 0; next && taken < (first ? 2 : 3); next = next.nextElementSibling) {
              if (next.classList.contains('bx')) continue;
              rows.push(next); taken++;
            }
            if (first) {
              const grid = label.closest('.bx-if-grid');
              Array.from(grid ? grid.children : []).filter((child) => child.classList.contains('bx-if-label') || child.classList.contains('bx-if-value'))
                .slice(-2).forEach((child) => { if (!child.classList.contains('bx-if-through')) rows.push(child); });
            }
            return rows;
          };
          trashFor(el, first ? 'Remove this outer If and keep its THEN value' : 'Remove this else-if', branch);
        }
      });
    }

    /* The flat run of rows: follow the right-hand side while it is the same
     * associative operator with no function, so the grouping shown is still the
     * grouping iMIS stores. `terms` are the row elements, in order; an
     * expression that is not a calculation is one term. `plain` is false when
     * the whole run sits inside a function, which the SQL then wraps. */
    function chainOf(index) {
      const top = levelParts(index, '');
      if (!top) {
        const root = index.controls[KIND];
        return { levels: [], terms: root ? [root.parentElement] : [], plain: true };
      }
      const levels = [top], terms = [top.leftContainer];
      let level = top, path = '';
      for (;;) {
        const next = levelParts(index, path + RIGHT);
        if (!next || !next.plain || next.op.value !== level.op.value || !ASSOCIATIVE[optionText(level.op)]) break;
        levels.push(next); terms.push(next.leftContainer);
        level = next; path += RIGHT;
      }
      terms.push(level.rightContainer);
      return { levels, terms, plain: top.plain };
    }

    /* ---- the read-only "Calculated formula": one line per row, coloured, and
     * each line shows its row when clicked. iMIS's own span stays, hidden. ---- */
    let rows = [];                                            // builder row elements, in term order
    function drawSql() {
      const page = builderPage();
      const native = page && page.querySelector('span[id$="ExpressionBuilder_SQLString"]');
      page && page.querySelectorAll('.bx-sql').forEach((el) => el.remove());
      rows = [];
      if (!native) return;
      const sql = native.textContent.trim();
      native.classList.toggle('bx-sql-native', !!sql);
      if (!sql) return;
      const chain = chainOf(readIndex());
      const terms = chain.plain ? splitSql(sql, chain.terms.length) : null;
      const block = h('div', { class: 'bx bx-sql', translate: 'no' });
      const coloured = (part) => sqlPieces(part).map(([kind, piece]) => (kind ? h('span', { class: 'bx-t-' + kind }, piece) : piece));
      if (!terms) block.append(h('div', { class: 'bx-sql-line' }, h('span', { class: 'bx-sql-op' }), h('span', {}, ...coloured(sql))));
      else {
        rows = chain.terms;
        terms.forEach((term, i) => {
          const line = h('button', { type: 'button', class: 'bx-sql-line', 'data-term': i, title: 'Show this term above' },
            h('span', { class: 'bx-sql-op bx-t-op' }, term.op), h('span', {}, ...coloured(layoutSql(term.text))));
          line.addEventListener('click', () => showRow(i));
          block.append(line);
        });
      }
      native.after(block);
    }

    function showRow(index) {
      const row = rows[index];
      if (!row || !row.isConnected) return;
      row.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      row.classList.add('bx-flash');
      setTimeout(() => row.classList.remove('bx-flash'), 1400);
    }

    /* One term is "current" at a time: its row and its SQL line are tinted. */
    function markTerm(index) {
      const page = builderPage();
      if (!page) return;
      page.querySelectorAll('.bx-at').forEach((el) => el.classList.remove('bx-at'));
      if (index === null || !rows[index]) return;
      rows[index].classList.add('bx-at');
      const line = page.querySelector('.bx-sql-line[data-term="' + index + '"]');
      if (line) line.classList.add('bx-at');
    }

    /* Pointing at a row or an SQL line marks its term. */
    const onPointerOver = (event) => {
      if (!rows.length || !event.target.closest) return;
      const line = event.target.closest('.bx-sql-line[data-term]');
      const index = line ? Number(line.dataset.term) : rows.findIndex((row) => row.contains(event.target));
      markTerm(index < 0 ? null : index);
    };

    /* The caret in the formula box marks its term, while the box still matches
     * the builder and reads as the same flat run of rows. */
    function markCaretTerm() {
      const box = document.getElementById('bxText');
      if (!box || document.activeElement !== box || state.dirty || !rows.length) { if (document.activeElement === box) markTerm(null); return; }
      const at = termAt(box.value, box.selectionStart);
      markTerm(at.count === rows.length ? at.index : null);
    }

    /* ---- property picker: the same inline type-to-filter box the IQA enhancer
     * puts on Filters and Sort (FilterSortDropdowns in IQA-Enhancements.js).
     * The box shows the current property; typing filters the list under it and
     * marks the match; leaving without choosing puts the current value back.
     * The native select stays in the form, hidden, and posts back as normal. */
    let pickers = [];
    function disposePickers() {
      pickers.forEach((picker) => picker.dispose());
      pickers = [];
    }

    function attachPicker(select) {
      const abort = new AbortController(), on = { signal: abort.signal };
      const id = 'bx-picker-' + Math.random().toString(36).slice(2);
      const input = h('input', { type: 'text', role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false',
        'aria-controls': id, 'aria-label': 'Property', placeholder: 'Select a property', autocomplete: 'off', spellcheck: 'false' });
      const button = h('button', { type: 'button', tabindex: '-1', 'aria-label': 'Show properties' }, '\u25BE');
      const wrap = h('div', { class: 'bx bx-picker' }, input, button);
      const list = h('div', { id, class: 'bx bx-picker-list', role: 'listbox', 'aria-label': 'Property', hidden: true });
      document.body.append(list);
      select.before(wrap);
      select.classList.add('bx-picker-native');

      let options = [], active = -1;
      const sync = () => {
        input.value = optionText(select);
        input.title = input.value;
        input.disabled = button.disabled = select.disabled;
      };
      const close = () => {
        list.hidden = true; active = -1;
        input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant');
        sync();
      };
      const position = () => {
        const box = wrap.getBoundingClientRect(), width = Math.min(Math.max(box.width, 280), innerWidth - 16);
        list.style.width = width + 'px';
        list.style.left = Math.max(8, Math.min(box.left, innerWidth - width - 8)) + 'px';
        const below = innerHeight - box.bottom - 8, above = box.top - 8, upwards = below < 240 && above > below;
        list.style.maxHeight = Math.max(60, Math.min(300, upwards ? above : below)) + 'px';
        list.style.top = upwards ? 'auto' : (box.bottom + 2) + 'px';
        list.style.bottom = upwards ? (innerHeight - box.top + 2) + 'px' : 'auto';
      };
      const choose = (option) => {
        const changed = select.value !== option.value;
        select.value = option.value;
        close();
        if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));     // iMIS posts back, as for a native pick
      };
      const render = (query = '') => {
        if (select.disabled) return;
        const needle = query.trim().toLowerCase();
        options = Array.from(select.options).filter((o) => !o.disabled && o.text.trim() && o.text.toLowerCase().includes(needle));
        list.replaceChildren(); active = -1; input.removeAttribute('aria-activedescendant');
        options.forEach((option, i) => {
          const label = option.text.trim(), at = label.toLowerCase().indexOf(needle);
          const item = h('div', { id: id + '-' + i, role: 'option', 'aria-selected': String(option.value === select.value) });
          if (!needle) item.textContent = label;
          else item.append(label.slice(0, at), h('mark', {}, label.slice(at, at + needle.length)), label.slice(at + needle.length));
          item.addEventListener('mousedown', (event) => event.preventDefault());
          item.addEventListener('click', () => { choose(option); input.focus(); });
          list.append(item);
        });
        if (!options.length) list.append(h('div', { role: 'status' }, 'No matching properties'));
        list.hidden = false; input.setAttribute('aria-expanded', 'true');
        position();
        if (!needle) { const current = list.querySelector('[aria-selected="true"]'); if (current) current.scrollIntoView({ block: 'nearest' }); }
      };
      const setActive = (index) => {
        if (!options.length) return;
        active = (index + options.length) % options.length;
        Array.from(list.children).forEach((item, i) => item.classList.toggle('is-active', i === active));
        input.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({ block: 'nearest' });
      };

      input.addEventListener('focus', () => input.select(), on);
      input.addEventListener('click', () => { if (list.hidden) render(); }, on);
      input.addEventListener('input', () => render(input.value), on);
      input.addEventListener('blur', close, on);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          if (list.hidden) render();
          setActive(active < 0 ? (event.key === 'ArrowDown' ? 0 : options.length - 1) : active + (event.key === 'ArrowDown' ? 1 : -1));
        } else if (event.key === 'Enter') {
          event.preventDefault();                                   // never submit the designer form
          if (!list.hidden && active >= 0) choose(options[active]);
          else if (!list.hidden && options.length === 1) choose(options[0]);
        } else if (event.key === 'Escape') {
          if (!list.hidden) { event.preventDefault(); event.stopPropagation(); }   // keep Esc from closing the popup window
          close();
        } else if (event.key === 'Tab') close();
      }, on);
      button.addEventListener('mousedown', (event) => event.preventDefault(), on);
      button.addEventListener('click', () => { input.focus(); if (list.hidden) render(); else close(); }, on);
      select.addEventListener('change', sync, on);
      document.addEventListener('mousedown', (event) => { if (!wrap.contains(event.target) && !list.contains(event.target) && !list.hidden) close(); }, on);
      window.addEventListener('resize', close, on);
      window.addEventListener('scroll', (event) => { if (!list.hidden && !list.contains(event.target)) close(); }, { capture: true, signal: abort.signal });
      sync();
      pickers.push({ dispose() { abort.abort(); list.remove(); wrap.remove(); select.classList.remove('bx-picker-native'); } });
    }

    /* ===========================================================================
     * Styles. Theme tokens with fallbacks; touch sizes follow the window width.
     * ======================================================================== */
    const CSS = `
      .bx-panel {
        margin: 0 0 var(--space-4, 16px);
        padding: var(--space-3, 12px) var(--space-4, 16px);
        border: 1px solid var(--border, #e2e5e9);
        border-radius: var(--radius, 8px);
        background: var(--bg-subtle, #f8f8f9);
      }

      .bx-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--space-1, 4px) var(--space-3, 12px);
        margin-bottom: var(--space-2, 8px);
      }

      .bx-head h3 {
        margin: 0;
        color: var(--text-strong, #1c2024);
        font-size: var(--fs-md, 16px);
        font-weight: var(--fw-semi, 600);
      }

      body.bx-busy [id$="TemplateFillLoadingPanel"] {
        opacity: 0 !important;
      }

      .bx-busy-note {
        margin-left: auto;
        color: var(--text-muted, #545962);
        font-size: var(--fs-sm, 13px);
        opacity: 0;
        transition: opacity 180ms cubic-bezier(.2, 0, 0, 1);
      }

      body.bx-busy .bx-busy-note {
        opacity: 1;
        transition-delay: 250ms;
      }

      .bx-structure {
        margin: 0;
        color: var(--text-muted, #545962);
        font-size: var(--fs-sm, 13px);
        font-weight: var(--fw-normal, 400);
        cursor: pointer;
      }

      .bx-edit {
        position: relative;
      }

      .bx-edit {
        border-radius: var(--radius-sm, 4px);
        background: var(--bg-surface, #fff);
      }

      .bx-edit:has(#bxText:disabled) {
        background: var(--bg-sunken, #eef0f2);
      }

      #bxText,
      .bx-mirror {
        box-sizing: border-box;
        margin: 0;
        padding: var(--space-2, 8px) var(--space-3, 12px);
        border: 1px solid var(--border-strong, #b9bdc4);
        border-radius: var(--radius-sm, 4px);
        font: 13px/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
        letter-spacing: 0;
        tab-size: 4;
        white-space: pre-wrap;
        overflow-wrap: break-word;
        word-break: normal;
      }

      #bxText {
        position: relative;
        display: block;
        width: 100%;
        max-width: none;
        min-height: 76px;
        background: transparent !important;
        color: transparent !important;
        -webkit-text-fill-color: transparent;
        caret-color: #172b4d;
        resize: vertical;
      }

      #bxText::selection {
        background: color-mix(in srgb, var(--border-focus, #25a0da) 30%, transparent);
      }

      .bx-mirror {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        overflow: hidden;
        border-color: transparent;
        background: transparent;
        color: #172b4d;
        pointer-events: none;
      }

      .bx-edit:has(#bxText:disabled) .bx-mirror {
        opacity: .7;
      }

      /* Formula colours. The values are the IQA SQL editor's (the
         .iqa-sql-keyword, -identifier, -string and -number rules in
         IQA-Enhancements.js), so a formula reads the same in both editors:
         functions and words as keywords, fields as identifiers. */
      .bx-t-fn,
      .bx-t-word {
        color: #7141ac;
      }

      .bx-t-table,
      .bx-t-column {
        color: #005a9c;
      }

      .bx-t-text {
        color: #9c3425;
      }

      .bx-t-number {
        color: #066c91;
      }

      .bx-t-bad {
        text-decoration: underline wavy var(--danger, #b42318);
        text-underline-offset: 3px;
      }

      .bx-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-1, 4px) var(--space-3, 12px);
        margin: 0;
        font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
      }

      .bx-suggest {
        position: absolute;
        z-index: 20;
        top: 100%;
        left: 0;
        min-width: 280px;
        max-width: min(520px, 100%);
        max-height: 260px;
        margin-top: 2px;
        padding: 3px;
        overflow: auto;
        border: 1px solid var(--border-strong, #94a3b8);
        border-radius: var(--radius-sm, 4px);
        background: var(--bg-surface, #fff);
        box-shadow: var(--shadow-md, 0 4px 12px rgba(0, 27, 35, .13));
        font: 13px/1.4 ui-monospace, Consolas, monospace;
      }

      .bx-suggest > div {
        display: flex;
        justify-content: space-between;
        gap: var(--space-4, 16px);
        padding: 5px 8px;
        border-radius: 3px;
        cursor: pointer;
      }

      .bx-suggest > [aria-selected="true"] {
        background: var(--info-bg, #e4f0f4);
      }

      .bx-suggest small {
        color: var(--text-muted, #545962);
        font: 12px/1.4 var(--font-body, "Open Sans", Arial, sans-serif);
      }

      .bx-hint {
        min-height: 20px;
        margin-top: var(--space-1, 4px);
        color: var(--text-muted, #545962);
        font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
      }

      .bx-hint strong {
        color: var(--text-strong, #1c2024);
        font-weight: var(--fw-bold, 700);
        text-decoration: underline;
        text-underline-offset: 3px;
      }

      .bx-hint-note {
        font-family: var(--font-body, "Open Sans", Arial, sans-serif);
        white-space: pre-wrap;
      }

      .bx-hint em {
        color: var(--danger, #b42318);
        font-style: normal;
      }

      .bx-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--space-2, 8px);
        margin-top: var(--space-2, 8px);
      }

      #bxStatus {
        flex: 1 1 240px;
        color: var(--text-muted, #545962);
        font-size: var(--fs-sm, 13px);
        transition: color 180ms cubic-bezier(.2, 0, 0, 1);
      }

      #bxStatus[data-tone="error"] {
        color: var(--danger, #b42318);
      }

      #bxStatus[data-tone="done"] {
        color: var(--success, #18794e);
      }

      .bx-readonly .bx-actions button {
        display: none;
      }

      .bx-preview-title {
        margin: var(--space-3, 12px) 0 var(--space-1, 4px);
        color: var(--text-strong, #1c2024);
        font-size: var(--fs-sm, 13px);
        font-weight: var(--fw-semi, 600);
      }

      .bx-preview-title small,
      .bx-preview-note {
        color: var(--text-muted, #545962);
        font-size: var(--fs-xs, 12px);
        font-weight: var(--fw-normal, 400);
      }

      .bx-preview-note {
        margin: 0;
      }

      .bx-preview dl {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        gap: 2px var(--space-3, 12px);
        margin: 0;
        font: 12px/1.6 ui-monospace, Consolas, monospace;
      }

      .bx-preview dt {
        color: var(--text-muted, #545962);
        font-weight: var(--fw-normal, 400);
      }

      .bx-preview dd {
        margin: 0;
        overflow: hidden;
        color: var(--text-strong, #1c2024);
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* ---- the read-only Calculated formula ---- */
      .bx-sql-native {
        display: none !important;
      }

      .bx-sql {
        margin-top: var(--space-1, 4px);
        color: #172b4d;
        font: 13px/1.6 ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", monospace;
      }

      .bx-sql-line {
        display: grid;
        grid-template-columns: 2ch minmax(0, 1fr);
        gap: 0 1ch;
        width: 100%;
        margin: 0;
        padding: 1px var(--space-2, 8px);
        border: 0;
        border-radius: var(--radius-sm, 4px);
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: left;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        transition: background-color 180ms cubic-bezier(.2, 0, 0, 1);
      }

      button.bx-sql-line {
        cursor: pointer;
      }

      /* The current term: its builder row and its SQL line. */
      .bx-sql-line.bx-at,
      .ExpressionContainer.bx-at,
      .ExpressionContainer.bx-flash {
        background-color: var(--accent-100, #ffe8d6) !important;
      }

      .ExpressionContainer.bx-at,
      .ExpressionContainer.bx-flash {
        border-radius: var(--radius-sm, 4px);
        box-shadow: 0 0 0 4px var(--accent-100, #ffe8d6);
      }

      /* ---- flat rows ---- */
      .bx-on .bx-quiet > select,
      .bx-on .bx-quiet > .d-inline,
      .bx-on .bx-through > select,
      .bx-on .bx-through > .d-inline,
      .bx-on .bx-open > a,
      .bx-on .bx-through > a {
        display: none !important;
      }

      .bx-on .bx-through {
        display: contents !important;
      }

      .bx-on .bx-open {
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
      }

      .bx-on .bx-chain {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        align-items: start;
        gap: var(--space-2, 8px);
      }

      .bx-on .bx-chain .bx-term {
        grid-column: 2;
        min-width: 0;
      }

      .bx-on .bx-chain select.bx-op {
        grid-column: 1;
        display: block !important;
        width: 56px;
        margin: 0;
        font-family: ui-monospace, Consolas, monospace;
        font-weight: var(--fw-semi, 600);
      }

      /* ---- a value row: kind, value, data type and function on one line ---- */
      .bx-on .bx-leaf,
      .bx-on .bx-if {
        display: flex !important;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px var(--space-2, 8px);
        margin: 0;
        border-radius: var(--radius-sm, 4px);
        transition: background-color 180ms cubic-bezier(.2, 0, 0, 1), box-shadow 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-on .bx-leaf > div,
      .bx-on .bx-leaf > div > div[id$="NestedControlPanel"] {
        display: inline-flex !important;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px var(--space-2, 8px);
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
      }

      .bx-on .bx-leaf > .d-inline {
        display: contents !important;
      }

      .bx-on .bx-leaf div:has(> span[id$="SQLString"]),
      .bx-on .bx-if div:has(> span[id$="SQLString"]) {
        display: none !important;
      }

      .bx-on .bx-leaf select,
      .bx-on .bx-leaf input,
      .bx-on .bx-if > select,
      .bx-on .bx-if > .d-inline > select {
        margin: 0;
      }

      .bx-on .bx-leaf > select:first-child,
      .bx-on .bx-if > select:first-child {
        width: 124px;
      }

      .bx-on .bx-leaf input[type="text"] {
        width: 90px;
      }

      .bx-word {
        color: var(--text-muted, #545962);
        font-size: var(--fs-sm, 13px);
      }

      /* ---- If / then / else as a card ---- */
      .bx-on .bx-if > .Expression {
        flex: 1 1 100%;
        margin: 0;
        padding: var(--space-2, 8px) var(--space-3, 12px);
        border: 1px solid var(--border, #e2e5e9);
        border-radius: var(--radius, 8px);
        background: var(--bg-subtle, #f8f8f9);
      }

      .bx-on .bx-if > .Expression > a.FloatRight,
      .bx-on .bx-cond-box > a.FloatRight {
        display: none !important;
      }

      .bx-on .bx-if-through {
        display: contents !important;
      }

      .bx-on .bx-if-grid {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr);
        align-items: center;
        gap: 6px var(--space-3, 12px);
      }

      /* IF, THEN, ELSE IF, ELSE: the word at the left, its trash button (when
         it has one) at the right, both centred on the first line of the value. */
      .bx-on .bx-if-label {
        grid-column: 1;
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2, 8px);
        align-self: start;
        min-height: 33px;
        margin: 0 !important;
        color: #7141ac;
        font-size: var(--fs-xs, 12px);
        letter-spacing: .04em;
        line-height: 1.2;
        text-transform: uppercase;
        white-space: nowrap;
      }

      .bx-on .bx-if-when,
      .bx-on .bx-if-value,
      .bx-on .bx-if-link {
        grid-column: 2;
        min-width: 0;
        margin: 0 !important;
      }

      .bx-on .bx-if-link,
      .bx-on .bx-if-cond > a {
        justify-self: start;
        padding: 0 !important;
        font-size: var(--fs-sm, 13px);
      }

      .bx-on .bx-cond-box {
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
      }

      .bx-on .bx-cond-node {
        margin: 0 !important;
      }

      /* What an add or remove button will act on, shown while it is pointed at
         or focused: one box over all of it. It sits above the controls but lets
         clicks through, and is tinted lightly so the controls stay readable. */
      .bx-host {
        position: relative;
      }

      .bx-outline {
        position: absolute;
        z-index: 5;
        box-sizing: border-box;
        border: 2px solid var(--border-focus, #25a0da);
        border-radius: var(--radius, 8px);
        background: color-mix(in srgb, var(--border-focus, #25a0da) 10%, transparent);
        opacity: 0;
        pointer-events: none;
        transition: opacity 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-outline.is-on {
        opacity: 1;
      }

      .bx-outline[data-kind="remove"] {
        border-color: var(--danger, #b42318);
        background: color-mix(in srgb, var(--danger, #b42318) 10%, transparent);
      }

      .bx-native-hidden {
        display: none !important;
      }

      .bx-on button.bx-trash {
        flex: none;
        width: 28px !important;
        min-width: 28px !important;
        height: 28px !important;
        min-height: 28px !important;
        margin: 0;
        padding: 0 !important;
      }

      /* Nesting from inside a group is the rare one: there, but quieter. */
      .bx-on a.bx-link-quiet {
        opacity: .6;
        transition: opacity 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-on a.bx-link-quiet:hover,
      .bx-on a.bx-link-quiet:focus-visible {
        opacity: 1;
      }

      /* A group of conditions: its two sides stacked, the joining word between. */
      .bx-on .bx-cond-group {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-1, 4px);
      }

      .bx-on .bx-cond-group .bx-cond-group {
        padding-left: var(--space-3, 12px);
        border-left: 2px solid var(--border-strong, #b9bdc4);
      }

      .bx-on .bx-cond-join {
        display: inline-flex !important;
        align-items: center;
        gap: var(--space-2, 8px);
        min-height: 33px;
      }

      .bx-on .bx-cond-join > select {
        width: 76px;
        margin: 0 !important;
      }

      .bx-on .bx-cond-group > a {
        padding: 0 !important;
        font-size: var(--fs-sm, 13px);
      }

      /* The condition reads across: value, comparison, value. */
      .bx-on .bx-if-cond {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px var(--space-2, 8px);
      }

      .bx-on .bx-if-cond > .d-block {
        display: inline-flex !important;
      }

      .bx-on .bx-if-cond > .d-block > select {
        margin: 0;
      }

      .bx-on .bx-if-cond > .bx-leaf,
      .bx-on .bx-if-cond > .bx-if {
        display: inline-flex !important;
      }

      /* ---- quiet controls ---- */
      .bx-on select[id$="PropertyTypeDropDownList"].aspNetDisabled {
        width: auto;
        min-width: 0;
        height: auto;
        padding: 1px 8px;
        field-sizing: content;
        border: 0;
        border-radius: var(--radius-pill, 999px);
        background: var(--bg-sunken, #eef0f2);
        color: var(--text-muted, #545962);
        font-size: var(--fs-xs, 12px);
        opacity: 1;
        appearance: none;
        -webkit-appearance: none;
      }

      .bx-on select.bx-fn-none {
        border-color: transparent;
        background-color: transparent;
        color: var(--text-muted, #545962);
        transition: border-color 180ms cubic-bezier(.2, 0, 0, 1), background-color 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-on select.bx-fn-none:hover,
      .bx-on select.bx-fn-none:focus {
        border-color: var(--border-strong, #b9bdc4);
        background-color: var(--bg-surface, #fff);
      }

      .bx-note {
        margin: 0 var(--space-2, 8px) 0 calc(var(--space-1, 4px) * -1);
        padding: 0 6px;
        border-radius: var(--radius-pill, 999px);
        background: var(--bg-sunken, #eef0f2);
        color: var(--text-muted, #545962);
        font-size: 11px;
        line-height: 1.7;
        white-space: nowrap;
      }

      /* ---- property picker (values match the IQA enhancer's field picker) ---- */
      .bx-on select.bx-picker-native {
        display: none !important;
      }

      .bx-picker {
        display: inline-flex;
        position: relative;
        width: 230px;
        max-width: 100%;
        min-width: 0;
        box-sizing: border-box;
        overflow: hidden;
        border: 1px solid var(--border-strong, #ccc);
        border-radius: var(--radius-sm, 4px);
        background: var(--bg-surface, #fff);
        vertical-align: middle;
        transition: border-color 180ms cubic-bezier(.2, 0, 0, 1), box-shadow 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-picker:focus-within {
        border-color: var(--border-focus, #25a0da);
        box-shadow: 0 0 4px color-mix(in srgb, var(--border-focus, #25a0da) 40%, transparent);
      }

      .bx-on .bx-picker > input[type="text"] {
        flex: 1 1 0;
        width: 0 !important;
        min-width: 0 !important;
        max-width: none !important;
        min-height: 31px;
        margin: 0;
        padding: 4px 10px;
        border: 0 !important;
        border-radius: 0;
        background: transparent;
        box-shadow: none !important;
        color: var(--text-strong, #1c2024);
        font: inherit;
      }

      .bx-picker > button {
        flex: 0 0 32px;
        padding: 0;
        border: 0;
        border-left: 1px solid var(--border, #ddd);
        border-radius: 0;
        background: var(--bg-subtle, #f8f8f8);
        color: var(--text-base, #333);
        cursor: pointer;
        transition: background-color 180ms cubic-bezier(.2, 0, 0, 1), color 180ms cubic-bezier(.2, 0, 0, 1);
      }

      .bx-picker:focus-within > button {
        background: var(--border-focus, #25a0da);
        color: var(--text-inverse, #fff);
      }

      .bx-picker-list {
        position: fixed;
        z-index: 100000;
        box-sizing: border-box;
        padding: 3px 0;
        overflow: auto;
        border: 1px solid var(--border-strong, #ccc);
        background: var(--bg-surface, #fff);
        box-shadow: var(--shadow-md, 0 3px 9px rgba(0, 0, 0, .2));
        color: var(--text-base, #454b54);
        font: var(--fs-base, 14px)/1.4 var(--font-body, "Open Sans", Arial, sans-serif);
      }

      .bx-picker-list[hidden] {
        display: none;
      }

      .bx-picker-list > div {
        padding: 6px 10px;
        overflow-wrap: anywhere;
        cursor: pointer;
      }

      .bx-picker-list > div:hover,
      .bx-picker-list > .is-active {
        background: var(--bg-sunken, #e8e8e8);
      }

      .bx-picker-list > [aria-selected="true"] {
        font-weight: var(--fw-semi, 600);
      }

      .bx-picker-list > [role="status"] {
        color: var(--text-muted, #545962);
        font-style: italic;
        cursor: default;
      }

      .bx-picker-list mark {
        background: var(--accent-100, #ddd);
        color: inherit;
        font-weight: var(--fw-bold, 700);
      }

      @media (max-width: 950px) {
        .bx-actions button,
        button.bx-sql-line,
        .bx-on .bx-picker > input[type="text"],
        .bx-picker-list > div,
        .bx-suggest > div {
          min-height: 44px;
        }

        .bx-picker > button {
          flex-basis: 44px;
        }

        .bx-on button.bx-trash {
          width: 44px !important;
          min-width: 44px !important;
          height: 44px !important;
          min-height: 44px !important;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        #bxStatus,
        .bx-on a.bx-link-quiet,
        .bx-outline,
        .bx-busy-note,
        .bx-sql-line,
        .bx-on .bx-leaf,
        .bx-on .bx-if,
        .bx-picker,
        .bx-picker > button,
        .bx-on select.bx-fn-none {
          transition: none;
        }
      }
    `;

    /* ===========================================================================
     * Shell
     * ======================================================================== */
    function unmount() {
      const el = document.getElementById('bxPanel');
      if (el) el.remove();
      clearDecoration();
      document.body.classList.remove('bx-on');
    }

    /* The builder's first dropdown as it was when last styled. iMIS redraws the
     * builder by replacing its markup, so a different element here means fresh,
     * unstyled markup. */
    let styledRoot = null;
    const builderRoot = () => { const page = builderPage(); return page ? page.querySelector('select[id$="' + KIND + '"]') : null; };

    let running = false;
    function run() {
      if (running) return;
      running = true;
      try {
        const page = builderPage(), property = selectedProperty();
        if (!getMode() || !page || !property || !page.querySelector('select')) {
          if (!state.applying) unmount();
          styledRoot = null;
          return;
        }
        injectStyle('bo-enh-expression-css', CSS);

        /* While Apply is working the formula box keeps what was typed; only the
         * builder's look is kept up. */
        if (!state.applying) {
          learnTypes(readIndex());
          const builder = readBuilder();
          const builderText = builder.tree ? format(builder.tree) : '';
          if (property !== state.property) { state.property = property; state.dirty = false; state.status = null; }
          if (builderText !== state.builderText) state.status = null;      // the builder moved on: an old outcome is stale
          state.builderText = builderText;
          state.reason = builder.reason;
          if (!state.dirty) state.text = builderText;
          else state.dirty = state.text.trim() !== builderText;

          const el = panel();
          if (el.parentElement !== page || page.firstElementChild !== el) page.prepend(el);
          draw();
        }

        document.body.classList.toggle('bx-on', !state.showStructure);
        if (state.showStructure) clearDecoration(); else decorate();
        page.classList.add('bx-host');
        drawSql();
        styledRoot = builderRoot();
      } catch (error) {
        console.error('[BO-Enh] expression editor', error);
      } finally { running = false; }
    }

    /* No flash on a change. iMIS answers a dropdown change by swapping in new
     * markup, twice (the change, then its own refresh). A mutation observer's
     * callback runs after the swap and before the browser paints, so the new
     * markup is styled before it is ever seen. */
    const observer = new MutationObserver(() => {
      if (!running && builderRoot() !== styledRoot) run();
    });

    /* While a change from the builder is with the server, iMIS's full-page
     * loading panel is kept see-through (it still blocks clicks, as iMIS
     * intends) and a quiet "Updating…" shows by the heading instead. */
    let busyTimer = 0;
    function setBusy(on) {
      clearTimeout(busyTimer);
      if (on) document.body.classList.add('bx-busy');
      else busyTimer = setTimeout(() => { if (!prm() || !prm().get_isInAsyncPostBack()) document.body.classList.remove('bx-busy'); }, 350);
    }

    const onTabClick = (event) => { if (event.target.closest && event.target.closest('.rtsLink')) setTimeout(run, 50); };

    function start() {
      const manager = prm();
      if (manager) { manager.add_beginRequest(onBeginRequest); manager.add_endRequest(onEndRequest); }
      document.addEventListener('pointerover', onPointerOver, true);
      document.addEventListener('click', onTabClick, true);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    function stop() {
      unmount();
      removeById('bo-enh-expression-css');
      const manager = prm();
      if (manager) { manager.remove_beginRequest(onBeginRequest); manager.remove_endRequest(onEndRequest); }
      observer.disconnect();
      clearTimeout(busyTimer);
      document.body.classList.remove('bx-busy');
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('click', onTabClick, true);
    }

    return {
      mount: run,
      unmount() { unmount(); removeById('bo-enh-expression-css'); styledRoot = null; },
      start, stop, state, readBuilder
    };
  })(ExpressionCore);

  /* ===========================================================================
   * Shell
   * ======================================================================== */
  /* Filter + Copy are parked until the Properties tab is probed (they assume a grid). */
  const GATED = [Overhaul, Lists, SqlHighlight, ExpressionEditor];

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
      <h3>Properties: Expression builder</h3>
      <ol><li>A <strong>formula box</strong> above the builder shows the expression as text, for example <em>Name.ID + Upper(Name.CITY)</em>. Type to change it: properties are written <em>Table.Column</em>, text goes in quotes, and suggestions appear as you type. The line under the box shows what the function at the cursor expects.</li>
      <li><strong>If</strong> is written <em>If(condition, value, last value)</em>. Join conditions with <em>and</em> / <em>or</em>, use brackets to group them, and add more <em>condition, value</em> pairs for else-if.</li>
      <li><strong>Apply to builder</strong> sets the dropdowns below to match what you typed, a step at a time, then checks the result. It answers the builder's own "are you sure?" when it has to remove a condition or an else-if. <strong>Reset</strong> puts the builder's formula back in the box; while Apply is working it reads <strong>Stop</strong>.</li>
      <li>The <strong>preview</strong> works the formula out for a few published rows. It is an estimate: SQL can differ, and a column the published object does not include cannot be previewed.</li>
      <li>In the builder, a run of + is one row per value, If / then / else is one card, each property is a type-to-filter box, and "No function" reads <em>+ Add function</em>. <strong>Show structure</strong> puts back the standard layout.</li>
      <li>Each add link says what it adds to, and pointing at it outlines that part. The trash buttons outline, in red, exactly what will be removed.</li>
      <li><strong>Calculated formula</strong> is shown one value per line; click a line to find its row.</li></ol>
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
    safe(() => ExpressionEditor.stop());
    delete window.BoEnh;
  }

  window.BoEnh = {
    probe, refresh: run, destroy, mode: (on) => { setMode(on !== false); run(); },
    expression: { core: ExpressionCore, state: ExpressionEditor.state, read: ExpressionEditor.readBuilder }
  };

  const start = () => {
    safe(() => ExpressionEditor.start());
    run();
    safe(() => prm()?.add_endRequest(onEndRequest));
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
