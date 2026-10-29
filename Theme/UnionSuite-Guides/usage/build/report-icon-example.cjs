// Guide-only native fixture. Shared code generates every header action.
exports.documentHtml = ({nativePreviewCss,theme,themeJs,iconCss,branding}) => {
  const runtime=themeJs.split('/* US-BANNER-BEHAVIOUR:START */')[0]+'\n'+themeJs.match(/\/\* US-ACTION-ICONS:START \*\/[\s\S]*?\/\* US-ACTION-ICONS:END \*\//)[0];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Generated report icon actions</title><style>${nativePreviewCss}\n${theme}\n${iconCss}\n${branding}\nhtml{height:auto}body{height:auto;margin:0;padding:20px;background:var(--bg-page)}.icon-demo-status{margin:12px 0 0;color:var(--text-muted);font:13px/1.5 var(--font-ui)}</style><body>
  <div class="ContentItemContainer"><div class="us-action-demo-add-task us-action-demo-find-notes us-action-demo-edit-note"><div class="panel">
    <div class="panel-heading"><h2 class="panel-title">My tasks</h2></div>
    <div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="card QueryTemplateItem"><div class="card-body"><h3 class="us-list__title">Follow up membership enquiry</h3><p class="us-list__meta">Sample task</p></div></div></section></div></div></div>
  </div></div></div>
  <p class="icon-demo-status" role="status" id="icon-demo-status">Try Add task, Find notes or Edit note. These are sample actions.</p>
  <script>${runtime}
  function sampleAction(label){document.getElementById('icon-demo-status').textContent=label+' selected — sample action only.';}
  [['add-task','Add task','plus'],['find-notes','Find notes','ti-search'],['edit-note','Edit note','pencil']].forEach(([suffix,label,icon])=>UnionSuiteActions.define('demo.'+suffix,{
    className:'us-action-demo-'+suffix,owner:'guide',source:'report-icon-example.cjs:'+suffix,
    presentation:{label,icon,default:'icon'},context:{},action:{type:'function',run:()=>sampleAction(label)}
  }));
  </script></body></html>`;
};
