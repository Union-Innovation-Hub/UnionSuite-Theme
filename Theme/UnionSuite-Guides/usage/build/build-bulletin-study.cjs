// Approved component comparison: all component styling comes from the shared theme.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const records=[
  {title:'Updated Membership Fees',body:'<p>Our membership fees have been updated. Please find the latest fee schedule below.</p><p><a href="#preview-fees">Latest Membership Fees</a></p>',href:'#preview-announcement',label:'View announcement'},
  {title:'New Policy',body:'<p>Starting from today, employees are not to bring pet snakes into the office.</p>',href:'#preview-policy',label:'Read policy'},
  {title:'New Staff',body:'<p>Please welcome our newest staff members!</p><p>Raphael Chambers<br>Heinrich Reimer<br>Milton Chiu</p>'}
];
function panel(proposed,limit=records.length){
  const items=records.slice(0,limit).map((r,i)=>`<section data-item="${proposed?'proposed':'current'}-${i}" class="mb-3"><div class="card QueryTemplateItem"><div class="card-body"><div class="BulletinCard"><h3>${r.title}</h3><em>Peter Williams - 12/05/2025</em><div class="us-list__body">${r.body}</div>${proposed&&r.href?`<a class="us-bulletin__link" href="${r.href}" aria-label="${r.label}: ${r.title}">${r.label}<span aria-hidden="true">→</span></a>`:''}</div></div></div></section>`).join('\n');
  return `<div class="iMIS-WebPart"><div class="ContentItemContainer">${proposed?'<div class="us-staff-bulletin us-action-home-manage-bulletin">':''}<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Staff Bulletin</h2></div><div class="panel-body-container"><div class="panel-body"><span class="template-header">Header</span><div class="QueryTemplateSet simplePaginateList">${items}</div><span class="template-footer">Footer</span></div></div></div>${proposed?'</div>':''}</div></div>`;
}
const native=(read('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css')+'\n'+read('Theme/UnionSuite/99-Orion.css')).replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
const markup=read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.html').replace('{{CURRENT_BULLETIN}}',panel(false)).replace('{{PROPOSED_BULLETIN}}',panel(true));
const sharedJs=read('Theme/UnionSuite/zUnionSuite.js');
const actionScript=sharedJs.split('/* US-BANNER-BEHAVIOUR:START */')[0]+'\n'+read('Theme/UnionSuite/Scripts/ActionDefinitions.js');
const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Staff bulletin — style preview</title><style>${native}\n${read('Theme/UnionSuite/zUnionSuite.css')}\n${read('Theme/UnionSuite-Client/Branding.css')}\n${read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.css')}</style></head><body>${markup}<script>${actionScript}\n${read('Theme/UnionSuite-Guides/usage/templates/List-Templates/Bulletin-Style-Preview.js')}</script></body></html>`;
const output=path.join(root,'references/Bulletin-Cards-Preview.html');
function build(check=false){
  if(check){if(!fs.existsSync(output)||fs.readFileSync(output,'utf8')!==html)throw Error('Bulletin preview is stale.');console.log('Bulletin preview is current.');}
  else{fs.writeFileSync(output,html);console.log('Built references/Bulletin-Cards-Preview.html. Using approved shared theme CSS.');}
}
module.exports=build;
module.exports.panel=panel;
module.exports.actionScript=actionScript;
if(require.main===module)build(process.argv.includes('--check'));
