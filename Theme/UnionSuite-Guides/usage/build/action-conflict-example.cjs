// Offline interaction fixture using the production action APIs and warning UI.
exports.documentHtml = ({nativePreviewCss,theme,themeJs,branding}) => `<!doctype html><html lang="en"><meta charset="utf-8"><title>Action conflict example</title>
<style>${nativePreviewCss}\n${theme}\n${branding}
html,body{height:auto}body{margin:0;padding:20px;min-height:300px;background:var(--bg-page);font:14px/1.5 var(--font-ui)}
.demo-controls{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}.demo-result{color:var(--text-muted)}
</style><body><div class="ContentItemContainer"><div class="us-action-demo-add-example"><div class="panel">
<div class="panel-heading"><h2 class="panel-title">My tasks</h2></div><div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="QueryTemplateItem">Sample task — try the header action</div></section></div></div></div>
</div></div></div>
<div class="demo-controls"><button type="button" class="TextButton" id="demo-repeat">Repeat include</button><button type="button" class="TextButton" id="demo-conflict">Introduce conflict</button><button type="button" class="TextButton" id="demo-resolve">Resolve explicitly</button></div>
<p class="demo-result" id="demo-result" role="status">The action is ready. Introduce a conflict to see its warning.</p>
<script>${themeJs}
const api=UnionSuiteActions;
const initial=()=>({className:'us-action-demo-add-example',owner:'Home tasks',source:'HomeActions.js',presentation:{label:'Add my task',icon:'plus',default:'icon'},context:{},action:{type:'function',run:()=>{document.getElementById('demo-result').textContent='The home task action ran.';}}});
api.define('demo.add-example',initial());
document.getElementById('demo-repeat').onclick=()=>{api.define('demo.add-example',initial());document.getElementById('demo-result').textContent='Repeated include ignored. Status: '+api.getActionStatus('demo.add-example').status;};
document.getElementById('demo-conflict').onclick=()=>{api.define('demo.add-example',{...initial(),owner:'Case tasks',source:'CaseActions.js'});document.getElementById('demo-result').textContent='Two definitions claimed the same action. Use the warning button to read its message.';};
document.getElementById('demo-resolve').onclick=()=>{api.configure('demo.add-example',initial());document.getElementById('demo-result').textContent='Home task definition explicitly selected. Status: '+api.getActionStatus('demo.add-example').status;};
</script></body></html>`;
