// Offline guide fixture. Only the native dialog/refresh outcome is simulated.
exports.documentHtml = ({nativePreviewCss,theme,themeJs,branding}) => {
  const runtime=themeJs.split('/* US-BANNER-BEHAVIOUR:START */')[0];
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Popup action example</title>
  <style>${nativePreviewCss}\n${theme}\n${branding}
  html{height:auto}body{height:auto;min-height:310px;margin:0;padding:20px;background:var(--bg-page)}
  dialog{width:min(420px,90%);border:1px solid var(--border);border-radius:12px;background:var(--bg-surface);color:var(--text-base);padding:20px}dialog::backdrop{background:#0005}
  .popup-sample-status{font:13px/1.5 var(--font-ui);color:var(--text-muted)}
  </style><body><div class="ContentItemContainer"><div class="us-action-demo-add-interaction"><div class="panel">
  <div class="panel-heading"><h2 class="panel-title">Recent interactions</h2></div>
  <div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet"><section><div class="QueryTemplateItem">Membership enquiry — sample record</div></section></div></div></div>
  </div></div></div>
  <p class="popup-sample-status" role="status" id="popup-sample-status">Use the plus icon. This is an offline dialog demonstration.</p>
  <dialog aria-labelledby="popup-sample-title"><h3 id="popup-sample-title">Add interaction</h3><p>The live site uses the native iMIS editor. Closing this sample runs the configured onClose callback.</p><button type="button" class="TextButton" id="popup-sample-close">Close sample</button></dialog>
  <script>${runtime}
  window.ShowDialog_NoReturnValue=function(url,args,width,height,title,icon,template,beforeClose,name,commit,preserve,onClose,source){
    var dialog=document.querySelector('dialog');document.getElementById('popup-sample-title').textContent=title;
    dialog.onclose=function(){onClose({result:null},{sample:true});};dialog.showModal();
  };
  document.getElementById('popup-sample-close').onclick=function(){document.querySelector('dialog').close();};
  var closes=0;
  UnionSuiteActions.define('demo.add-interaction',{
    className:'us-action-demo-add-interaction',owner:'guide',source:'popup-action-example.cjs',
    presentation:{label:'Add interaction',icon:'plus',default:'icon'},context:{},
    action:{type:'popup',href:'https://example.invalid/sample-editor',
    popup:{title:'Add interaction',width:'90%',height:'90%'},refresh:{when:'close',run:async function(){
      document.getElementById('popup-sample-status').textContent='Close callback ran '+(++closes)+' time(s). The live callback can refresh this IQA or another component.';
    }}}
  });
  </script></body></html>`;
};
