const fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'../../../..',p),'utf8');
module.exports=()=>{
 const theme=read('Theme/UnionSuite/zUnionSuite.css');
 const adapter=read('Theme/UnionSuite/zUnionSuite.js').split('/* US-TAB-BUSY:START')[1].split('/* US-TAB-BUSY:END */')[0].replace(/^[\s\S]*?\*\//,'');
 return `<!doctype html><html lang="en"><meta charset="utf-8"><style>${theme}
body{margin:16px;font:14px var(--font-ui)}p{margin:16px 0}</style><form>
<div class="RadTabStrip"><div class="rtsLevel"><ul class="rtsUL" role="tablist">${['Overview','Preferences','Instant'].map((label,i)=>`<li class="rtsLI"><a href="#" role="tab" class="rtsLink${i===0?' rtsSelected':''}" aria-selected="${i===0}" aria-controls="sample-tab-panel" data-delay="${i===2?0:850}"><span class="rtsOut"><span class="rtsIn"><span class="rtsTxt">${label}</span></span></span></a></li>`).join('')}</ul></div></div><div class="RadMultiPage" id="sample-tab-panel">Overview example content</div></form><p>Choose Overview or Preferences to simulate a request. Instant switches locally without a spinner. These are fictional examples; no server request is made.</p>
<script>
// Guide-only request simulation. Production observes the native lifecycle.
const manager={add_beginRequest(fn){this.begin=fn;},add_endRequest(fn){this.end=fn;}};
window.Sys={WebForms:{PageRequestManager:{getInstance:()=>manager}}};
</script><script>${adapter}</script><script>
let timer;
document.querySelectorAll('.rtsLink').forEach(tab=>tab.addEventListener('click',event=>{
 event.preventDefault();clearTimeout(timer);manager.end();
 const render=()=>{document.querySelectorAll('.rtsLink').forEach(link=>{link.classList.toggle('rtsSelected',link===tab);link.setAttribute('aria-selected',String(link===tab));});document.querySelector('#sample-tab-panel').textContent=tab.textContent.trim()+' example content';manager.end();};
 if(!Number(tab.dataset.delay)){render();return;}
 manager.begin(null,{get_postBackElement:()=>tab.closest('.RadTabStrip')});timer=setTimeout(render,Number(tab.dataset.delay));
}));
</script></html>`;
};
