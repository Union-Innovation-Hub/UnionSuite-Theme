const fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const {appearanceScript}=require('./build-taskbar-dark-mode.cjs');
function documentHtml(){
  let native=(read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css')+'\n'+read('Theme/UnionSuite/99-Orion.css')).replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
  // Offline snapshot of https://uhubemsdev.imiscloud.com/Assets/images/IconSprite.svg.
  // Embed the original groups and definitions; production keeps the native asset URLs.
  const sprite=read('Theme/UnionSuite-Guides/usage/source/imis-IconSprite.svg');
  const svgRoot=sprite.match(/<svg\b[^>]*>/)?.[0],defs=sprite.match(/<defs>[\s\S]*?<\/defs>/)?.[0];
  for(const id of ['cart','easy-edit','obo-toggle']) {
    const group=sprite.match(new RegExp('^    <g id="'+id+'">[\\s\\S]*?^    </g>','m'))?.[0];
    if(!svgRoot||!defs||!group)throw Error('Native icon snapshot structure changed: '+id);
    const icon='data:image/svg+xml,'+encodeURIComponent(svgRoot+defs+group+'</svg>')+'#'+id;
    native=native.replaceAll('../../Assets/images/IconSprite.svg#'+id,icon);
  }
  const js=read('Theme/UnionSuite/zUnionSuite.js');
  const shared=['US-BUSY-PRESENTATION','US-UTILITY-NAV'].map(name=>js.slice(js.indexOf('/* '+name+':START'),js.indexOf('/* '+name+':END'))).join('\n');
  // Exercise the actual client logo selector/dimensions in both OBO states.
  // Only the unavailable hosted bitmap is replaced with a labelled offline asset.
  const logo='data:image/svg+xml,'+encodeURIComponent(read('Theme/UnionSuite-Guides/usage/source/utility-nav-logo.svg'));
  const client=read('Theme/UnionSuite-Client/Override.css').replace('/images/Hub/UHUB_Logo.png',logo);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Union Suite — Utility navigation</title><style>${native}\n${read('Theme/UnionSuite/zUnionSuite.css')}\n${read('Theme/UnionSuite-Client/Branding.css')}\n${client}\n${read('Theme/UnionSuite-Guides/usage/source/utility-nav-example.css')}\n${read('Theme/UnionSuite/zzDarkMode.css')}</style><script>window.UnionSuiteAppearanceConfig={storageKey:'union-suite:preview:utility-appearance:v1'};\n${appearanceScript()}</script></head><body>${read('Theme/UnionSuite-Guides/usage/source/utility-nav-example.html')}<script>${read('Theme/UnionSuite-Guides/usage/source/utility-nav-example.js')}\n${shared}</script></body></html>`;
}
module.exports=documentHtml;
module.exports.build=function(check){
  const output=path.join(root,'references/Utility-Navigation.html'),html=documentHtml();
  if(check){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html){console.error('Utility navigation reference is stale.');process.exitCode=1;}else console.log('Utility navigation reference is current.');}
  else{fs.writeFileSync(output,html);console.log('Built references/Utility-Navigation.html.');}
};
