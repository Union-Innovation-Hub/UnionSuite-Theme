// Node checks for ExpressionCore, the formula language in
// Theme/UnionSuite/Scripts/BO-Enhancements.js (no DOM):
// parser, formatter (round trip) and the preview evaluator.
// Run from the repo root: node tools/test-bo-expression.cjs
'use strict';
const assert = require('assert');
const { parse, format, evaluate, references, FormulaError, signature, callAt, pieces, splitSql, layoutSql, sqlPieces, termAt } = require('../Theme/UnionSuite/Scripts/BO-Enhancements.js').ExpressionCore;

let passed = 0;
const check = (name, fn) => { fn(); passed++; };

const SEARCH = 'Name.ID + Name.EMAIL + Replace(Name.MOBILE_PHONE, " ", "") + Name.CITY + Name.ZIP + ' +
  'If(Name.COMPANY_RECORD = True, Name.COMPANY, Name.FULL_NAME)';

check('the example round-trips', () => {
  assert.strictEqual(format(parse(SEARCH)), SEARCH);
});

check('a run of + nests to the right, as the builder stores it', () => {
  const tree = parse('Name.A + Name.B + Name.C');
  assert.strictEqual(tree.left.name, 'Name.A');
  assert.strictEqual(tree.right.kind, 'calc');
  assert.strictEqual(tree.right.left.name, 'Name.B');
});

check('subtraction groups left to right', () => {
  const tree = parse('Name.A - Name.B - Name.C');
  assert.strictEqual(tree.left.kind, 'calc');
  assert.strictEqual(tree.right.name, 'Name.C');
  assert.strictEqual(format(tree), '(Name.A - Name.B) - Name.C');
});

check('formatting keeps the grouping', () => {
  [
    'Name.A + Name.B * Name.C',
    'Name.A * (Name.B + Name.C)',
    'Name.A - (Name.B - Name.C)',
    '(Name.A + Name.B) + Name.C',
    'Name.A + (Name.B - Name.C)',
    'Upper(Name.A + Name.B) + Left(Name.C, 3)',
    'Substring(Name.A, 2, 5) + \'say "hi"\'',
    'Name.A + "it\'s ""x"""',
    'If(Name.A contains "x", 1, 2.5) + Today',
    'If(Name.A not contains "x", Name.B, If(Name.C >= 3, "big", "small"))'
  ].forEach((source) => {
    const once = format(parse(source));
    assert.strictEqual(once, source);
    assert.deepStrictEqual(parse(once), parse(source));
  });
});

check('quotes and case', () => {
  assert.strictEqual(parse("'it''s'").value, "it's");
  assert.strictEqual(parse('upper(Name.A)').fn.name, 'Upper');
  assert.strictEqual(parse('TRUE').value, 'True');
  assert.strictEqual(parse('-5').value, '-5');
  assert.strictEqual(format(parse('')), '');
});

check('errors say what is wrong and where', () => {
  const fails = (source, pattern) => assert.throws(() => parse(source), (error) => error instanceof FormulaError && pattern.test(error.message));
  fails('Name.A +', /stops too soon/);
  fails('Foo', /Table\.Column/);
  fails('Sum(Name.A)', /not a function/);
  fails('Upper(Trim(Name.A))', /one function/);
  fails('Left(Name.A, "x")', /whole number/);
  fails('Replace(Name.A, 1, 2)', /text in quotes/);
  fails('"abc', /closing quote/);
  fails('If(Name.A, 1, 2)', /comparison/);
  fails('(Name.A + Name.B', /bracket/);
  fails('Name.A Name.B', /Unexpected/);
});

check('references', () => {
  assert.deepStrictEqual(Array.from(references(parse(SEARCH))).sort(),
    ['Name.CITY', 'Name.COMPANY', 'Name.COMPANY_RECORD', 'Name.EMAIL', 'Name.FULL_NAME', 'Name.ID', 'Name.MOBILE_PHONE', 'Name.ZIP']);
});

check('the preview matches the published SearchString', () => {
  // Values from the dev tenant's first row, 11 November 2026.
  const row = { 'Name.ID': '100000', 'Name.EMAIL': 'mmaverick@gmail.com', 'Name.MOBILE_PHONE': '0400 123 456', 'Name.CITY': '',
    'Name.ZIP': '', 'Name.COMPANY_RECORD': false, 'Name.COMPANY': 'Department of Edu Melbourne', 'Name.FULL_NAME': 'Maverick Mitchell' };
  const result = evaluate(parse(SEARCH), (name) => row[name]);
  assert.strictEqual(result, '100000mmaverick@gmail.com0400123456Maverick Mitchell');
  assert.strictEqual(evaluate(parse(SEARCH), (name) => ({ ...row, 'Name.COMPANY_RECORD': true })[name]).endsWith('Department of Edu Melbourne'), true);
});

check('functions and arithmetic', () => {
  const run = (source) => evaluate(parse(source), () => 'Hello World ');
  assert.strictEqual(run('Left(Name.A, 5)'), 'Hello');
  assert.strictEqual(run('Right(Name.A, 6)'), 'World ');
  assert.strictEqual(run('Length(Name.A)'), 11);
  assert.strictEqual(run('Trim(Name.A)'), 'Hello World');
  assert.strictEqual(run('Upper(Name.A)'), 'HELLO WORLD ');
  assert.strictEqual(run('Reverse(Name.A)'), ' dlroW olleH');
  assert.strictEqual(run('CharIndex(Name.A, "WORLD")'), 7);
  assert.strictEqual(run('Replace(Name.A, "L", "$&")'), 'He$&$&o Wor$&d ');
  assert.strictEqual(run('Substring(Name.A, 7, 5)'), 'World');
  assert.strictEqual(run('Replicate("ab", 3)'), 'ababab');
  assert.strictEqual(run('2 + 3 * 4'), 14);
  assert.strictEqual(run('(10 - 4) - 3'), 3);
  assert.strictEqual(run('If(Name.A starts with "hello", "y", "n")'), 'y');
  assert.strictEqual(run('If(3 > 2, 1, 0) + 1'), 2);
});

check('signatures and the call under the caret', () => {
  assert.strictEqual(signature('replace'), 'Replace(value, "expression to replace", "text to replace with")');
  assert.strictEqual(signature('Left'), 'Left(value, number of characters)');
  assert.strictEqual(signature('if'), 'If(condition, value if true, value if false)');
  assert.deepStrictEqual(callAt('Name.A + Replace(Name.FULL_NAME, '), { name: 'Replace', index: 1 });
  assert.deepStrictEqual(callAt('Replace(Name.A, "a,(b", '), { name: 'Replace', index: 2 });
  assert.deepStrictEqual(callAt('If(Name.A = 1, Upper(Name.B'), { name: 'Upper', index: 0 });
  assert.deepStrictEqual(callAt('If(Name.A = 1, Upper(Name.B), '), { name: 'If', index: 2 });
  assert.deepStrictEqual(callAt('Left((Name.A + Name.B'), { name: 'Left', index: 0 });
  assert.strictEqual(callAt('Upper(Name.A) + '), null);
  assert.throws(() => parse('Replace(Name.A, Name.B, "x")'), /text in quotes for the expression to replace: Replace\(value, "expression to replace", "text to replace with"\)/);
  assert.throws(() => parse('Replace(Name.A, "x")'), /also needs the text to replace with/);
  assert.throws(() => parse('Left(Name.A, 2, 3)'), /Left takes 2 parts: Left\(value, number of characters\)/);
  assert.throws(() => parse('If(Name.A = 1, 2)'), /If needs at least three parts: If\(condition, value if true, value if false\)/);
});

check('date and number functions', () => {
  const on = (source, value) => evaluate(parse(source), () => value);
  const joined = '2024-07-08T14:05:09';                       // a Monday
  assert.strictEqual(on('Date(Name.D)', joined), '2024-07-08');
  assert.strictEqual(on('Time(Name.D)', joined), '14:05:09');
  assert.strictEqual(on('DateTime(Name.D)', joined), '2024-07-08 14:05:09');
  assert.strictEqual(on('Day(Name.D)', joined), 8);
  assert.strictEqual(on('Month(Name.D)', joined), 7);
  assert.strictEqual(on('Year(Name.D)', joined), 2024);
  assert.strictEqual(on('EndOfMonth(Name.D)', '2024-02-10T00:00:00'), '2024-02-29');
  assert.strictEqual(on('EOMonth(Name.D)', '2023-02-10T00:00:00'), '2023-02-28');
  assert.strictEqual(on('DatePart(Name.D, quarter)', joined), 3);
  assert.strictEqual(on('DatePart(Name.D, dayofyear)', joined), 190);
  assert.strictEqual(on('DatePart(Name.D, weekday)', joined), 2);
  assert.strictEqual(on('DatePart(Name.D, week)', joined), 28);
  assert.strictEqual(on('DatePart(Name.D, iso_week)', joined), 28);
  assert.strictEqual(on('DatePart(Name.D, iso_week)', '2021-01-03T00:00:00'), 53);
  assert.strictEqual(on('DatePart(Name.D, minute)', joined), 5);
  assert.strictEqual(on('DateName(Name.D, month)', joined), 'July');
  assert.strictEqual(on('DateName(Name.D, "weekday")', joined), 'Monday');
  assert.strictEqual(on('Year(Name.D)', '0001-01-01T00:00:00'), '');
  assert.strictEqual(on('Round(Name.N, 2)', 3.14159), 3.14);
  assert.strictEqual(on('Round(Name.N, 0)', 2.5), 3);
  assert.strictEqual(on('Floor(Name.N)', 2.9), 2);
  assert.strictEqual(on('Ceiling(Name.N)', 2.1), 3);
  assert.strictEqual(on('Abs(Name.N)', -4), 4);
  assert.strictEqual(typeof on('Year(Today)', null), 'number');

  assert.strictEqual(format(parse('datepart(Name.D, "MONTH") + absolutevalue(Name.N)')), 'DatePart(Name.D, month) + Abs(Name.N)');
  assert.strictEqual(format(parse('Round(Name.N, 2) + EOMonth(Today)')), 'Round(Name.N, 2) + EndOfMonth(Today)');
  assert.strictEqual(signature('datepart'), 'DatePart(value, date part)');
  assert.strictEqual(signature('Round'), 'Round(value, decimal places)');
  assert.throws(() => parse('DatePart(Name.D, fortnight)'), /needs a date part, one of: year, quarter, month/);
  assert.throws(() => parse('DatePart(Name.D)'), /also needs the date part/);
  assert.throws(() => parse('Round(Name.N, 40)'), /allows 0 to 37/);
});

check('colouring splits functions, fields and values', () => {
  const kinds = (source, isProperty) => pieces(source, isProperty).filter(([kind]) => kind).map(([kind, part]) => kind + ':' + part);
  assert.deepStrictEqual(kinds('Upper(Name.ID) + "a b" + 12'), ['fn:Upper', 'table:Name.', 'column:ID', 'op:+', 'text:"a b"', 'op:+', 'number:12']);
  assert.deepStrictEqual(kinds('If(Name.A = True, Today, Nope(1))'),
    ['fn:If', 'table:Name.', 'column:A', 'op:=', 'word:True', 'word:Today', 'bad:Nope', 'number:1']);
  assert.deepStrictEqual(kinds('Name.ID + Name.NOPE', (name) => name === 'Name.ID'), ['table:Name.', 'column:ID', 'op:+', 'bad:Name.', 'bad:NOPE']);
  assert.deepStrictEqual(kinds('Replace(Name.A, "unfinished'), ['fn:Replace', 'table:Name.', 'column:A', 'text:"unfinished']);
  assert.deepStrictEqual(kinds('Name.'), ['table:Name.']);
  const source = 'Left( Name.A ,3)\n + x';
  assert.strictEqual(pieces(source).map(([, part]) => part).join(''), source);
});

check('the read-only SQL splits into one term per row', () => {
  const sql = "(Name.[ID]) + ((Name.[EMAIL]) + ((REPLACE(Name.[MOBILE_PHONE],' ','')) + ((Name.[CITY]) + ((Name.[ZIP]) + " +
    "(CASE WHEN ((Name.[COMPANY_RECORD]) = (CAST('1' AS Bit))) THEN (Name.[COMPANY]) ELSE (Name.[FULL_NAME]) END)))))";
  const terms = splitSql(sql, 6);
  assert.deepStrictEqual(terms.map((term) => term.op), ['', '+', '+', '+', '+', '+']);
  assert.deepStrictEqual(terms.slice(0, 5).map((term) => term.text),
    ['Name.[ID]', 'Name.[EMAIL]', "REPLACE(Name.[MOBILE_PHONE],' ','')", 'Name.[CITY]', 'Name.[ZIP]']);
  assert.strictEqual(layoutSql(terms[5].text),
    "CASE\n    WHEN ((Name.[COMPANY_RECORD]) = (CAST('1' AS Bit)))\n    THEN (Name.[COMPANY])\n    ELSE (Name.[FULL_NAME])\nEND");
  assert.deepStrictEqual(splitSql("(REPLACE(Name.[A],')','(')) + (Name.[B])", 2).map((term) => term.text), ["REPLACE(Name.[A],')','(')", 'Name.[B]']);
  assert.deepStrictEqual(splitSql('Name.[ID]', 1), [{ op: '', text: 'Name.[ID]' }]);
  assert.strictEqual(splitSql('UPPER((Name.[A]) + (Name.[B]))', 2), null);
  assert.strictEqual(splitSql(sql, 9), null);
  assert.strictEqual(layoutSql("(Name.[A]) * (CASE WHEN 1 = 1 THEN 2 ELSE 3 END)"), "(Name.[A]) * (CASE WHEN 1 = 1 THEN 2 ELSE 3 END)");
  const kinds = sqlPieces("CASE WHEN (LEN(Name.[A])) = (CAST('1' AS Bit)) THEN dbo.asi_GetAppDatetime() END").filter(([kind]) => kind).map(([kind, part]) => kind + ':' + part);
  assert.deepStrictEqual(kinds, ['word:CASE', 'word:WHEN', 'fn:LEN', 'column:Name.[A]', 'op:=', 'fn:CAST', "text:'1'", 'word:AS', 'word:THEN', 'fn:dbo.asi_GetAppDatetime', 'word:END']);
});

check('the term under the caret', () => {
  const source = 'Name.ID + Replace(Name.A, "+", "") + If(Name.B = True, Name.C + Name.D, 1)';
  assert.deepStrictEqual(termAt(source, 3), { index: 0, count: 3 });
  assert.deepStrictEqual(termAt(source, 20), { index: 1, count: 3 });
  assert.deepStrictEqual(termAt(source, source.length), { index: 2, count: 3 });
  assert.deepStrictEqual(termAt('Name.ID', 2), { index: 0, count: 1 });
});

check('grouped conditions and else-if', () => {
  const keeps = (source) => { assert.strictEqual(format(parse(source)), source); assert.deepStrictEqual(parse(format(parse(source))), parse(source)); };
  [
    'If(Name.A = 1 and Name.B = 2, "x", "y")',
    'If(Name.A = 1 and Name.B = 2 and Name.C = 3, "x", "y")',
    'If(Name.A = 1 and (Name.B = 2 and Name.C = 3), "x", "y")',
    'If(Name.A = 1 or (Name.B = 2 and Name.C = 3), "x", "y")',
    'If((Name.A = 1 or Name.B = 2) and Name.C = 3, "x", "y")',
    'If(Name.A = 1, "one", Name.A = 2, "two", "other")',
    'If(Name.A = 1 and Name.B contains "x", "one", Name.A = 2 or Name.A = 3, "two", Name.A > 9, "big", "other")',
    'If((Name.A + Name.B) * 2 = 6, "x", "y")',
    'If(Name.A = 1, If(Name.B = 2, "a", "b"), "c")'
  ].forEach(keeps);

  const left = parse('If(Name.A = 1 and Name.B = 2 and Name.C = 3, "x", "y")').branches[0].when;
  assert.strictEqual(left.op, 'And');
  assert.strictEqual(left.left.op, 'And');                    // ((A and B) and C), as the builder nests them
  assert.strictEqual(left.right.cond, 'Equal');
  assert.strictEqual(format(parse('If(Name.A = 1 or Name.B = 2 and Name.C = 3, "x", "y")')), 'If(Name.A = 1 or (Name.B = 2 and Name.C = 3), "x", "y")');
  assert.strictEqual(format(parse('If((Name.A = 1), "x", "y")')), 'If(Name.A = 1, "x", "y")');
  assert.strictEqual(parse('If(Name.A = 1, "one", Name.A = 2, "two", "other")').branches.length, 2);
  assert.throws(() => parse('If(Name.A = 1, "one", Name.A = 2)'), /needs a value after it/);
  assert.throws(() => parse('If(Name.A = 1 and, "x", "y")'), FormulaError);

  const run = (source, row) => evaluate(parse(source), (name) => row[name]);
  const grade = 'If(Name.A = 1 and Name.B = 2, "both", Name.A = 1 or Name.B = 2, "one", "none")';
  assert.strictEqual(run(grade, { 'Name.A': 1, 'Name.B': 2 }), 'both');
  assert.strictEqual(run(grade, { 'Name.A': 1, 'Name.B': 5 }), 'one');
  assert.strictEqual(run(grade, { 'Name.A': 7, 'Name.B': 5 }), 'none');
  assert.deepStrictEqual(Array.from(references(parse(grade))).sort(), ['Name.A', 'Name.B']);
  assert.deepStrictEqual(pieces('Name.A = 1 and Name.B = 2 or x').filter(([kind]) => kind === 'word').map(([, part]) => part), ['and', 'or']);
  assert.strictEqual(layoutSql("CASE WHEN (1) THEN (2)WHEN (3) THEN (4) ELSE (5) END"),
    'CASE\n    WHEN (1)\n    THEN (2)\n    WHEN (3)\n    THEN (4)\n    ELSE (5)\nEND');
});

console.log(passed + ' checks passed');
