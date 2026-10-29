// Checks for the shared HTML source editor's pure functions: highlighting,
// formatting, tag pairing and field suggestions. Run from the project root:
//   node tools/test-html-source-editor.cjs
const assert = require('node:assert/strict');
const api = require('../Theme/UnionSuite/Scripts/HtmlSourceEditor.js');

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log('ok  ' + name);
};

// The Contact Summary query's template, as it appears in the IQA editor.
const template = `<div class="FullWidth PanelEditorReadOnlyForm">
<div class="row">
  <div class="BreakWord col-md-6"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">Preferred name</span></div><br><div class="PanelFieldValue"><span>{#query.PreferredName}</span></div></div></div>
  <div class="BreakWord col-md-6"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">Birth date</span></div><br><div class="PanelFieldValue"><span>{#query.BirthDate}</span></div></div></div>
  <div class="BreakWord col-md-6"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">Preferred email</span></div><br><div class="PanelFieldValue"><span><a href="mailto:{#query.PreferredEmail}">{#query.PreferredEmail}</a></span></div></div></div>
  <div class="BreakWord col-md-6"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">Preferred mobile</span></div><br><div class="PanelFieldValue"><span>{#query.PreferredMobile}</span></div></div></div>
  <div class="BreakWord col-md-12"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">Residential address</span></div><br><div class="PanelFieldValue"><span>{#query.ResidentialAddress}</span></div></div></div>
</div>
</div>`;

// An excerpt of the RadEditor $create configuration on the live IQA page, with
// a second editor after it to check that each editor finds its own tools.
const fieldItems = ['BirthDate', 'PreferredEmail', 'PreferredMobile', 'PreferredName', 'PreferredPronoun', 'ResidentialAddress']
  .map(name => `["{#query.${name}}","query.${name}"]`).join(',');
const script = `Sys.Application.add_init(function() {
  $create(Telerik.Web.UI.RadEditor, {"toolJSON":[{"tag":"Toolbar5","tools":[{"name":"InsertParagraph"},{"name":"FormatBlock","type":2}]},{"tag":"TemplateDataSources","tools":[{"attributes":{"popupclassname":"InsertFieldBody"},"name":"QueryTemplateInsertField","showText":true,"text":"Insert data source field","type":2,"items":[${fieldItems}]}]}],"useRadContextMenu":true}, null, null, $get("templateEditor"));
});
Sys.Application.add_init(function() {
  $create(Telerik.Web.UI.RadEditor, {"toolJSON":[{"tag":"Fields","tools":[{"name":"MailMergeField","type":2,"items":[["{#party.FirstName}","First name"],["{#party.Email}","Email address"]]}]}]}, null, null, $get("otherEditor"));
});`;

const fields = api.fieldsFrom(api.findTool(api.toolConfigFromScript(script, 'templateEditor'), 'QueryTemplateInsertField'));

/* ---- fields ----------------------------------------------------------- */
test('reads the six fields for the named tool', () => {
  assert.deepEqual(fields.map(field => field.insert), [
    '{#query.BirthDate}', '{#query.PreferredEmail}', '{#query.PreferredMobile}',
    '{#query.PreferredName}', '{#query.PreferredPronoun}', '{#query.ResidentialAddress}']);
  assert.deepEqual(fields[0], {
    insert: '{#query.BirthDate}', path: 'query.BirthDate', namespace: 'query', name: 'BirthDate', label: 'query.BirthDate'
  });
});

test('finds a field tool automatically and keeps its labels', () => {
  const other = api.fieldsFrom(api.findTool(api.toolConfigFromScript(script, 'otherEditor'), 'auto'));
  assert.deepEqual(other.map(field => [field.path, field.label]), [['party.FirstName', 'First name'], ['party.Email', 'Email address']]);
  assert.deepEqual(api.fieldsFrom(api.findTool(api.toolConfigFromScript(script, 'templateEditor'), 'auto')), fields);
});

test('reads the editor named, not the one before or after it', () => {
  assert.equal(api.findTool(api.toolConfigFromScript(script, 'otherEditor'), 'QueryTemplateInsertField'), null);
  assert.equal(api.toolConfigFromScript(script, 'missingEditor'), null);
  assert.equal(api.toolConfigFromScript('var x = 1;'), null);
});

test('keeps only placeholder items as fields', () => {
  assert.deepEqual(api.fieldsFrom([['<b>Bold</b>', 'Bold'], ['{#query.A}'], 'bad', ['{#Plain}', '']]).map(field => field.path),
    ['query.A', 'Plain']);
  assert.equal(api.fieldsFrom([['{#Plain}']])[0].namespace, '');
});

/* ---- highlighting ----------------------------------------------------- */
test('tokens reproduce the source exactly', () => {
  for (const sample of [template, '<p>a < b &amp; c</p><!-- note --><script>if (a<b) x();</script>', '<div class="x', '{#query.A']) {
    assert.equal(api.tokens(sample).map(token => token.text).join(''), sample);
  }
});

test('tokens mark tags, attributes, values and placeholders', () => {
  const tokens = api.tokens('<a href="mailto:{#query.PreferredEmail}">{#query.PreferredEmail}</a>');
  const of = type => tokens.filter(token => token.type === type).map(token => token.text);
  assert.deepEqual(of('tag'), ['a', 'a']);
  assert.deepEqual(of('attr'), ['href']);
  assert.deepEqual(of('value'), ['"mailto:', '"']);
  assert.deepEqual(of('placeholder'), ['{#query.PreferredEmail}', '{#query.PreferredEmail}']);
});

/* ---- formatting ------------------------------------------------------- */
const formatted = api.format(template);

test('formats the Contact Summary template', () => {
  const lines = formatted.split('\n');
  assert.equal(lines[0], '<div class="FullWidth PanelEditorReadOnlyForm">');
  assert.equal(lines[1], '  <div class="row">');
  assert.ok(lines.includes('        <div class="PanelFieldValue"><span>{#query.PreferredName}</span></div>'));
  assert.ok(lines.includes('        <br>'));
  assert.equal(lines.at(-1), '</div>');
});

test('formatting is idempotent', () => {
  assert.equal(api.format(formatted), formatted);
});

test('formatting keeps every tag, attribute and placeholder', () => {
  const strip = html => html.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();
  assert.equal(strip(formatted), strip(template));
});

test('formatting leaves pre, textarea and script content alone', () => {
  const result = api.format('<div><pre>  a\n    b</pre><script>\n  if (a < b) {\n    go();\n  }\n</script></div>');
  assert.ok(result.includes('<pre>  a\n    b</pre>'));
  assert.ok(result.includes('<script>\n  if (a < b) {\n    go();\n  }\n</script>'));
});

test('formatting does not add missing end tags or collapse attribute values', () => {
  const result = api.format('<ul><li>One<li>Two</ul><span title="a   b">x</span>');
  assert.ok(!result.includes('</li>'));
  assert.ok(result.includes('title="a   b"'));
});

test('formatting keeps inline spacing between inline elements', () => {
  assert.equal(api.format('<div><b>A</b> <i>B</i></div>'), '<div><b>A</b> <i>B</i></div>');
  assert.equal(api.format('<div><b>A</b><i>B</i></div>'), '<div><b>A</b><i>B</i></div>');
});

test('formatting honours indent and width options', () => {
  assert.equal(api.format('<div><p>abc</p></div>', { indent: '\t', width: 5 }), '<div>\n\t<p>\n\t\tabc\n\t</p>\n</div>');
});

// attach() passes its own indent and width through, which are usually unset.
test('formatting treats undefined options as the defaults', () => {
  const source = '<div><section><p>x</p><p>y</p></section></div>';
  assert.equal(api.format(source, { indent: undefined, width: undefined }), api.format(source));
  assert.equal(api.format(source), '<div>\n  <section>\n    <p>x</p>\n    <p>y</p>\n  </section>\n</div>');
});

/* ---- tag pairs -------------------------------------------------------- */
test('pairs every tag in a well-formed template', () => {
  const tags = api.tagPairs(template);
  assert.equal(tags.filter(tag => tag.problem).length, 0);
  for (const [index, tag] of tags.entries()) {
    assert.ok(tag.pair >= 0, tag.name + ' is paired');
    assert.equal(tags[tag.pair].pair, index);
    assert.equal(tags[tag.pair].name, tag.name);
  }
  const first = tags[0];
  assert.equal(template.slice(first.start, first.end), '<div class="FullWidth PanelEditorReadOnlyForm">');
  assert.equal(tags[first.pair].end, template.length);
});

// The row is closed straight away, so the wrapper closes early and the later
// end tags have nothing left to close.
const broken = `<div class="FullWidth PanelEditorReadOnlyForm">
  <div class="row">
</div>
</div>
</div>
    <div class="BreakWord col-md-6">
      <div class="ReadOnly PanelField Top"><span>{#query.PreferredName}</span></div>
    </div>
  </div>
</div>`;

test('reports end tags with nothing to close, with line numbers', () => {
  const problems = api.tagPairs(broken).filter(tag => tag.problem);
  assert.deepEqual(problems.map(tag => api.describeProblem(broken, tag)), [
    '</div> on line 5 has no opening tag',
    '</div> on line 9 has no opening tag',
    '</div> on line 10 has no opening tag'
  ]);
});

test('reports elements that are never closed', () => {
  const source = '<div class="a">\n  <div class="b">\n    <span>x</span>\n</div>';
  const problems = api.tagPairs(source).filter(tag => tag.problem);
  assert.deepEqual(problems.map(tag => api.describeProblem(source, tag)), ['<div> on line 1 is not closed']);
});

test('reports mismatched nesting on both sides', () => {
  const problems = api.tagPairs('<div><span></div></span>').filter(tag => tag.problem);
  assert.deepEqual(problems.map(tag => tag.problem + ' ' + tag.name), ['unclosed span', 'unopened span']);
});

test('does not report end tags HTML lets you leave out, or void elements', () => {
  const source = '<ul><li>One<li>Two</ul><p>Para<table><tr><td>A<td>B</table><br><img src="x"><input>';
  assert.deepEqual(api.tagPairs(source).filter(tag => tag.problem), []);
});

test('ignores tags inside comments, scripts and pre blocks', () => {
  const source = '<!-- <div> --><script>var s = "</div>";</script><pre><div></pre>';
  assert.deepEqual(api.tagPairs(source).filter(tag => tag.problem), []);
});

test('formatting puts a spare block end tag on its own line', () => {
  const result = api.format('<div class="a"><span>x</span></div></div><span>y</span>');
  assert.equal(result, '<div class="a"><span>x</span></div>\n</div>\n<span>y</span>');
  assert.equal(api.format(result), result);
  const formattedBroken = api.format(broken);
  assert.equal(api.format(formattedBroken), formattedBroken);
  // Wrapper, spare, BreakWord, spare, spare: the three spares each on a line.
  assert.deepEqual(formattedBroken.split('\n').slice(0, 4),
    ['<div class="FullWidth PanelEditorReadOnlyForm">', '  <div class="row"></div>', '</div>', '</div>']);
  assert.equal(formattedBroken.split('\n').filter(line => line === '</div>').length, 5);
});

/* ---- suggestions ------------------------------------------------------ */
test('suggestions start after {#', () => {
  assert.equal(api.suggest('<span>Pref', fields), null);
  assert.equal(api.suggest('<span>{#', fields).options.length, 6);
  assert.equal(api.suggest('<span>{#que', fields).options.length, 6);
  assert.deepEqual(api.suggest('<span>{#query.pref', fields).options.map(field => field.name),
    ['PreferredEmail', 'PreferredMobile', 'PreferredName', 'PreferredPronoun']);
  assert.deepEqual(api.suggest('x{#mob', fields), { start: 1, options: [fields[2]] });
});

test('prefix matches rank before contains matches', () => {
  const list = api.fieldsFrom([['{#query.HomeAddress}'], ['{#query.Address}']]);
  assert.deepEqual(api.suggest('{#addr', list).options.map(field => field.name), ['Address', 'HomeAddress']);
});

test('suggestions also match a field label', () => {
  const party = api.fieldsFrom([['{#party.Email}', 'Email address'], ['{#party.FirstName}', 'First name']]);
  assert.deepEqual(api.suggest('{#first', party).options.map(field => field.path), ['party.FirstName']);
  assert.deepEqual(api.suggest('{#address', party).options.map(field => field.path), ['party.Email']);
});

test('Ctrl+Space lists fields for the word at the caret', () => {
  assert.deepEqual(api.listAt('<span>Birth', fields), { start: 6, options: [fields[0]] });
  assert.equal(api.listAt('<span>', fields).options.length, 6);
});

test('reports missing fields only in namespaces the list covers', () => {
  assert.deepEqual(api.unknownPlaceholders(template, fields), []);
  assert.deepEqual(api.unknownPlaceholders('{#query.Missing} {#query.birthdate} {#query.Missing}', fields), ['{#query.Missing}']);
  assert.deepEqual(api.unknownPlaceholders('{#party.FirstName} {#Plain}', fields), []);
  assert.deepEqual(api.unknownPlaceholders('{#query.Missing}', []), []);
  assert.deepEqual(api.unknownPlaceholders('{#query.Missing}', null), []);
});

console.log(`\n${passed} checks passed`);
