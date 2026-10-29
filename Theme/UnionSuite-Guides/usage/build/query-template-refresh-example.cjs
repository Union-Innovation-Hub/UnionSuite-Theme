// Supported offline simulation; production refresh code comes from the theme.
module.exports = function ({read, css, themeJs}) {
  const template = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Detail-Query-Template.html');
  const footer = read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Tasks-Query-Footer.html');
  const rows = [
    {TaskTitle:'Call Alex about renewal', TaskNote:'Confirm the membership options.', IsCompleted:'false', MemberName:'James Driscoll', MemberId:'104203'},
    {TaskTitle:'Send membership statement', TaskNote:'Statement sent yesterday.', IsCompleted:'true', MemberName:'Jordan Lee', MemberId:'101000'}
  ].map(record => '<section><div class="QueryTemplateItem">' + template.replace(/\{#query\.(\w+)\}/g, (_, key) => record[key] || '') + '</div></section>').join('');
  const content = '<div id="query-refresh-demo-ipart" class="ContentItemContainer"><div class="us-home-tasks"><div class="panel"><div class="panel-heading"><h2 class="panel-title">My tasks</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' + rows + '</div>' + footer + '</div></div></div></div></div>';
  return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>' + css + 'html{height:auto}body{height:auto;min-height:0;padding:16px;margin:0;background:var(--bg-page)}.demo-controls{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}</style><body>' +
    '<input type="hidden" id="__ClientContext" value="{&quot;loggedInPartyId&quot;:&quot;104203&quot;}"><div class="demo-controls"><button type="button" id="demo-refresh" class="TextButton">Refresh results</button><label><input type="checkbox" id="demo-failure"> Simulate failed request</label></div><p id="demo-status" role="status">Try search or Show completed, then refresh. The controls and your choices are retained. Personal Task marks a member ID matching this example’s signed-in user.</p>' + content +
    '<script>window.queryTemplateDemoSource=document.getElementById("query-refresh-demo-ipart").outerHTML;<\/script><script>' + themeJs + '<\/script><script>' +
    read('Theme/UnionSuite-Guides/usage/examples/Query-Template-Refresh.js') + '<\/script></body></html>';
};
