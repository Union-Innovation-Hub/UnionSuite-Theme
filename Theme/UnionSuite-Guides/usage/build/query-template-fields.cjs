// Build-time documentation: validate field coverage and render the same table
// beside every copyable query template. No production CSS/JS is added.
const definitions = require('../source/query-field-definitions.cjs');
const esc = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function validate(key, html) {
  const fields = definitions[key];
  if (!fields) throw Error('Missing query field definitions: '+key);
  const source = html.replace(/<!--[\s\S]*?-->/g,'');
  const tokens = new Set([...source.matchAll(/\{#query\.\w+(?: noencode)?\}|\[[A-Za-z][A-Za-z0-9 ]*\]/g)].map(m=>m[0].replace(' noencode','')));
  const documented = new Set();
  for (const [name, field] of Object.entries(fields)) {
    if (typeof field.required !== 'boolean' || !field.description || typeof field.example !== 'string' || !field.example.trim()) throw Error('Incomplete query field definition: '+key+'.'+name);
    const token = field.token || '{#query.'+name+'}';
    if (!tokens.has(token)) throw Error('Documented field is absent from template: '+key+' '+token);
    documented.add(token);
  }
  for (const token of tokens) if (!documented.has(token)) throw Error('Undocumented template field: '+key+' '+token);
  return fields;
}
function table(key, html) {
  const fields = validate(key, html);
  if (!Object.keys(fields).length) return '<p class="query-fields-note" data-query-fields="'+esc(key)+'"><strong>Query fields:</strong> this supplied HTML has no query substitutions and requires no selected aliases of its own. Its text and links are authored values. If you replace them with query tokens, select every referenced alias in the IQA.</p>';
  const placeholders = Object.values(fields).some(field=>field.token);
  return '<div class="query-field-definitions" data-query-fields="'+esc(key)+'"><p><strong>Field definitions:</strong> Required means a nonempty value for this recipe. Optional values may be blank, but every field referenced in the HTML must still be in the IQA Select/display column list. For unused optional fields, select a custom SQL expression <code>\'\'</code> with the matching alias, or remove every reference, including link and search attributes. '+(placeholders ? 'Square brackets below are author placeholders, not IQA syntax. The aliases are suggested mappings: replace each retained placeholder with <code>{#query.Alias}</code> using your selected output alias, or literal text. Blank banner facts retain their labels unless you remove the whole fact block.' : 'Map these output aliases to your query; examples describe display values, not verified database field names.')+'</p><div class="table-wrap query-fields-wrap" tabindex="0" role="region" aria-label="'+esc(key)+' field definitions"><table class="query-fields-table"><thead><tr><th scope="col">Query output alias'+(placeholders?' / template placeholder':'')+'</th><th scope="col">Value</th><th scope="col">Description / blank behaviour</th><th scope="col">Example</th></tr></thead><tbody>'+Object.entries(fields).map(([name,field])=>'<tr><th scope="row"><code>'+esc(name)+'</code>'+(field.token?'<small>'+esc(field.token)+'</small>':'')+'</th><td>'+(field.required?'Required':'Optional')+'</td><td>'+esc(field.description)+'</td><td><code>'+esc(field.example)+'</code></td></tr>').join('')+'</tbody></table></div></div>';
}
module.exports = {definitions, validate, table, sources:['Theme/UnionSuite-Guides/usage/build/query-template-fields.cjs','Theme/UnionSuite-Guides/usage/source/query-field-definitions.cjs']};
