const fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s);
const jsPath='Theme/UnionSuite/zUnionSuite.js';
const status=`
/* Member profile status colours: independent of the scrolling enhancement. */
(function(){
  'use strict';
  if(window.UnionSuiteMemberStatus)return;
  const selector='.us-banner .us-banner__surface--member';
  function luminance(c){const n=c.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return n[0]*.2126+n[1]*.7152+n[2]*.0722;}
  function displayColour(value){
    const input=/^#[0-9a-f]{6}$/i.test((value||'').trim())?value.trim().toUpperCase():'#596579';
    if(1.05/(luminance(input)+.05)>=4.5)return input;
    const rgb=input.slice(1).match(/../g).map(v=>parseInt(v,16));
    const shade=f=>'#'+rgb.map(v=>Math.floor(v*f).toString(16).padStart(2,'0')).join('').toUpperCase();
    let low=0,high=1;for(let i=0;i<24;i++){const mid=(low+high)/2;if(1.05/(luminance(shade(mid))+.05)>=4.5)low=mid;else high=mid;}
    return shade(low);
  }
  function refresh(){
    document.querySelectorAll(selector).forEach(surface=>{
      if(surface.closest('.us-report-no-styling'))return;
      const c=displayColour(surface.getAttribute('data-us-status-colour'));
      surface.style.setProperty('--member-status-colour',c);
      surface.style.setProperty('--member-status-inner-edge',luminance(c)<.14?'rgba(255,255,255,.5)':'transparent');
      surface.querySelectorAll('.us-banner__badge--member-status').forEach(pill=>{if(!pill.textContent.trim())pill.textContent='Status unavailable';});
    });
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
  window.UnionSuiteMemberStatus={refresh:refresh,displayColour:displayColour};
  function start(){refresh();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['data-us-status-colour','class']});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
`;
write(jsPath,read(jsPath).replace('/* US-BANNER-BEHAVIOUR:END */',status+'\n/* US-BANNER-BEHAVIOUR:END */'));
let css=read('prototypes/legacy/banner-status-final.css');
const glass=css.slice(css.indexOf('/* Glass treatment:'),css.indexOf('.status-final .rail.compact'));
const tabs=css.slice(css.indexOf('/* Quiet selected'));
const transform=s=>s.replaceAll(':root .status-final .us-banner .us-banner__surface',':root .us-banner .us-banner__surface.us-banner__surface--member:not(:where(.us-report-no-styling *))').replaceAll('.status-final .us-banner .us-banner__surface','.us-banner .us-banner__surface.us-banner__surface--member:not(:where(.us-report-no-styling *))').replaceAll('var(--status)','var(--member-status-colour)');
const member=`
/* Member profile banner; add the modifier to the inner header, not the iPart wrapper. */
.us-banner .us-banner__surface.us-banner__surface--member:not(:where(.us-report-no-styling *)){
 --member-status-colour:#596579;--member-status-inner-edge:transparent;
 position:relative;border-top:0;border-left:8px solid var(--member-status-colour);box-shadow:var(--shadow-sm);
}
.us-banner .us-banner__surface--member:not(:where(.us-report-no-styling *))::before{content:"";position:absolute;pointer-events:none;top:0;bottom:0;left:-8px;width:8px;box-sizing:border-box;border-right:2px solid var(--member-status-inner-edge);border-radius:inherit}
.us-banner .us-banner__surface--member .us-banner__badge--member-status:not(:where(.us-report-no-styling *)){background:var(--member-status-colour);color:#fff;border:1px solid rgb(255 255 255 / 33%);border-radius:99px;padding:7px 13px;font-size:13px;font-weight:600;line-height:20px}
.us-banner.us-banner--compact .us-banner__surface--member .us-banner__badge--member-status:not(:where(.us-report-no-styling *)){padding-block:3px}
`+transform(glass)+transform(tabs);
const cssPath='Theme/UnionSuite/zUnionSuite.css';
write(cssPath,read(cssPath).replace('/* US-BANNER-COMPONENT:END */',member+'\n/* US-BANNER-COMPONENT:END */'));
let template=read('Theme/UnionSuite/guides/usage/templates/Banner-Contact-Template.html').replace('<header class="us-banner__surface">','<header class="us-banner__surface us-banner__surface--member" data-us-status-colour="{#query.StatusColour}">').replace('<span class="us-banner__badge">[Record status]</span>','<span class="us-banner__badge us-banner__badge--member-status">{#query.StatusDescription}</span>').replace('      <span class="us-banner__badge">[Financial status]</span>\n','');
const actions='<div class="us-banner__actions"><div class="us-actions"><button type="button" class="us-actions__toggle">Quick Actions</button><ul class="us-actions__list"><li class="dropdown-header">Communication</li><li><button type="button" class="us-actions__item" data-us-action="member.email">Email Member</button></li><li><button type="button" class="us-actions__item" data-us-action="member.sms">SMS Member</button></li><li class="divider"></li><li class="dropdown-header">Member records</li><li><button type="button" class="us-actions__item" data-us-action="member.add-note">Add Note</button></li><li><button type="button" class="us-actions__item" data-us-action="member.add-job">Add New Job</button></li></ul></div></div>';
template=template.replace('  <div class="us-banner__details">','  <div class="us-banner__details">'); // summary insertion
template=template.replace('    </div>\n  </div>\n  <div class="us-banner__details">','    </div>\n    '+actions+'\n  </div>\n  <div class="us-banner__details">');
template=template.replace('Optional Actions/tabs blocks are in Banner-Template.html.','Quick Actions requires the site popup functions. Optional tabs are in Banner-Template.html.\n     StatusColour must return #RRGGBB; StatusDescription is plain text. Rename these IQA aliases as needed.');
write('Theme/UnionSuite/guides/usage/templates/Banner-Contact-Template.html',template);
