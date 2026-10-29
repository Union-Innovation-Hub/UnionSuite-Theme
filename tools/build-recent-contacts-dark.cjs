const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const esc=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;');
const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite/zzDarkMode.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
function frame(dark,wrapped){
 const list='<ul class="RecentHistoryList RecentHistoryListHorizontal"><li class="RecentHistoryTitleHorizontal"><span>Recent contacts</span></li>'+['Alex Morgan (104019)','Harbour Services (103841)','Sam Taylor (104038)'].map(name=>'<li class="RecentHistoryItem"><a href="#"><span>'+name+'</span></a></li>').join('')+'<li class="RecentHistoryClear"><a class="sysicon--before sysicon-delete" href="#">Clear</a></li></ul>';
 return `<!doctype html><html lang="en"${dark?' data-us-color-scheme="dark"':''}><meta charset="utf-8"><style>${css}\nbody{padding:20px;margin:0;background:var(--bg-page)}.panel{margin:0}</style><body><div class="iMIS-WebPart"><div class="ContentItemContainer">${wrapped?'<div class="PanelNoPadding pl-1 mb-n4">':''}<div class="panel"><div class="panel-body-container"><div class="panel-body"><div class="RadAjaxPanel">${list}</div></div></div></div>${wrapped?'</div>':''}</div></div><script>document.addEventListener('click',e=>{if(e.target.closest('a'))e.preventDefault()});</script></body></html>`;
}
const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recent contacts colour reference</title><style>body{font:16px/1.5 system-ui;margin:24px}iframe{width:100%;height:180px;border:1px solid #8898a2}</style><h1>Recent contacts</h1><p>Native horizontal list with shared theme styles. Hover and keyboard focus are active; navigation and Clear are disabled in this reference.</p>'+[false,true].map(dark=>'<h2>'+(dark?'Dark — configured class wrapper':'Light — direct panel')+'</h2><iframe title="'+(dark?'Dark':'Light')+' recent contacts" srcdoc="'+esc(frame(dark,dark))+'"></iframe>').join('')+'</html>';
fs.writeFileSync(path.join(root,'references/Recent-Contacts-Dark.html'),html);
console.log('Built references/Recent-Contacts-Dark.html');
