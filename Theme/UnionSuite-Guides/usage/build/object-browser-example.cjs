const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const dir='Theme/UnionSuite-Guides/usage/source/telerik-object-browser';
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
const {appearanceScript}=require('./build-taskbar-dark-mode.cjs');
const sources=['Theme/UnionSuite-Guides/usage/build/object-browser-example.cjs','Theme/UnionSuite-Guides/usage/source/object-browser-example.html','Theme/UnionSuite-Guides/usage/source/object-browser-example.css','Theme/UnionSuite-Guides/usage/source/object-browser-example.js',...fs.readdirSync(path.join(root,dir)).map(file=>dir+'/'+file)];
function asset(file) {
  const name=path.basename(file.replace(/[?#].*/,''));
  const target=path.join(root,dir,name);
  if(!fs.existsSync(target))return null;
  const ext=path.extname(name).slice(1),type=ext==='svg'?'svg+xml':ext;
  return 'data:image/'+type+';base64,'+fs.readFileSync(target).toString('base64');
}
function documentHtml() {
  // Retain real skin CSS. Omit unused checkbox/loading/legacy tree-line assets.
  const skins=['Splitter.css','Splitter.Metro.css','TreeView.css','TreeView.MetroTouch.css','Menu.css','Menu.MetroTouch.css'].map(file=>read(dir+'/'+file).replace(/url\(['"]?([^)'"\s]+)['"]?\)/g,(_,url)=>asset(url)?'url("'+asset(url)+'")':'none')).join('\n');
  const base=(read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css')+'\n'+read('Theme/UnionSuite/99-Orion.css')).replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'').replace(/url\([^)]*\)/g,'none');
  const theme=read('Theme/UnionSuite/zUnionSuite.css');
  const dark=read('Theme/UnionSuite/zzDarkMode.css');
  const preference="window.UnionSuiteAppearanceConfig={storageKey:'union-suite:preview:object-browser:v1'};\n"+appearanceScript();
  const summary=`<!doctype html><html><head><style>${theme}\n${dark}\nbody{margin:0;padding:6px;background:var(--bg-surface);color:var(--text-base);font:13px/1.5 var(--font-ui)}</style><script>${preference}</script></head><body><strong>Folder:</strong> Themes (example)<br><strong>Description:</strong> Offline summary placeholder</body></html>`;
  const escape=s=>s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  const fixture=read('Theme/UnionSuite-Guides/usage/source/object-browser-example.html')
    .replace(/\bsrc="([^"]+)"/g,(_,url)=>'src="'+(asset(url)||'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=')+'"')
    .replace(/url\(([^)]+)\)/g,(_,url)=>asset(url)?'url('+asset(url)+')':'none')
    .replace(/<iframe\b/g,'<iframe srcdoc="'+escape(summary)+'"');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Object Browser dark mode — UnionSuite</title><style>${skins}\n${base}\n${theme}\n${read('Theme/UnionSuite-Client/Branding.css')}\n${read('Theme/UnionSuite-Guides/usage/source/object-browser-example.css')}\n${dark}</style><script>${preference}</script></head><body><div class="object-browser-example__controls"><label for="object-browser-appearance">Appearance</label><select id="object-browser-appearance"><option value="system">Device setting</option><option value="light">Light</option><option value="dark">Dark</option></select><button type="button" class="TextButton us-outline-button" id="object-browser-replace">Replace browser markup</button><p>Captured Object Browser structure with official Telerik 2026.3.812 skins. Try Organize, select a row, or use Quick find. Navigation and commands are simulated; splitter dragging is not simulated.</p></div><div class="object-browser-example__viewport">${fixture}</div><p class="object-browser-example__status" id="object-browser-status" role="status">Preview only. No live requests or file operations.</p><script>${read('Theme/UnionSuite-Guides/usage/source/object-browser-example.js')}</script></body></html>`;
}
function build(check=false) {
  const output=path.join(root,'references/Object-Browser-Dark-Mode.html'),html=documentHtml();
  if(check){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw Error('Object Browser reference is stale.');console.log('Object Browser reference is current.');}
  else{fs.writeFileSync(output,html);console.log('Built references/Object-Browser-Dark-Mode.html.');}
}
module.exports={documentHtml,sources,build};
if(require.main===module)build(process.argv.includes('--check'));
