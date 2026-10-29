// Local impact check only. Never writes theme files or runs captured scripts.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const native=read('Theme/UnionSuite/guides/usage/vendor/10-UltraWaveResponsive.css'),orion=read('Theme/UnionSuite/99-Orion.css'),shared=read('Theme/UnionSuite/zUnionSuite.css');
const styles=g=>[native,orion.replace('--bs-gutter-x: 40px;','--bs-gutter-x: '+g+'px;'),shared,read('Theme/UnionSuite-Client/Branding.css'),read('Theme/UnionSuite-Client/Override.css')].join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
const wrap=content=>'<div class="ContentItemContainer"><div class="WebPartZone"><div class="iMIS-WebPart"><div class="ContentItemContainer">'+content+'</div></div></div></div>';
const banner='<div class="us-banner us-banner-collapsible"><header class="us-banner__surface"><div class="us-banner__summary"><div class="us-banner__identity"><h1 class="us-banner__title">Sample member</h1></div></div><div class="us-banner__details">Member details</div></header></div>';
const summary=read('Theme/UnionSuite/guides/usage/templates/List-Templates/Tasks-Query-Template.html').replaceAll('{#query.TaskTitle}','Sample task').replaceAll('{#query.MemberName}','Example member').replaceAll('{#query.DueDate}','18 September 2026');
const row=(id,children,extra='')=>'<div id="'+id+'" class="row '+extra+'">'+children+'</div>';
const column=(size,id,content)=>'<div class="col-sm-'+size+'"><div id="'+id+'" class="audit-content">'+content+'</div></div>';
const fixture=row('balanced',column(8,'main-card',summary)+column(4,'side-card','Bulletin'))+
 row('nested',column(6,'nest-parent',row('nested-child',column(6,'nested-one','Nested 1')+column(6,'nested-two','Nested 2')))+column(6,'peer','Peer'))+
 row('form',column(4,'form-one','<label>Name <input value="Sample"></label>')+column(4,'form-two','<label>Category <select><option>Example category</option></select></label>')+column(4,'form-three','<label>Date <input type="date" value="2026-09-14"></label>'))+
 row('utilities',column(6,'utility-one','Explicit gutter utility')+column(6,'utility-two','Explicit gutter utility'),'gx-3');
const cleanPage=(body,css)=>'<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'\nhtml,body{height:auto}body{margin:0;background:var(--bg-page)}.audit-host{padding:24px 20px}.audit-content{background:white;min-height:50px;min-width:0}.audit-host > .row{margin-bottom:20px}input,select{max-width:100%}</style></head><body>'+body+'</body></html>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),results=[];
 try{
  // Parse the supplied home capture in an inert document; do not execute its
  // scripts, load its frames, preserve credentials, or navigate to its links.
  const parser=await browser.newPage();await parser.route('**/*',r=>r.abort());
  const capture=fs.readFileSync('C:/Users/James/.codex/attachments/f195b4d2-0f7c-47ae-a4db-45224a6ff7ef/pasted-text.txt','utf8');
  const home=await parser.evaluate(raw=>{
   const doc=new DOMParser().parseFromString(raw,'text/html'),layout=doc.querySelector('.main > .ContentPanel > div:has(> .row)');
   const host=doc.createElement('main');host.className='main';
   [...layout.children].filter(n=>n.matches('.row')).slice(0,2).forEach(n=>host.append(n));
   host.querySelectorAll('script,style,link,iframe,object,embed,meta,base,input[type=hidden]').forEach(n=>n.remove());
   host.querySelectorAll('*').forEach(n=>{for(const a of [...n.attributes])if(/^on/i.test(a.name)||['href','src','srcdoc','action','formaction'].includes(a.name))n.removeAttribute(a.name);});
   return host.outerHTML;
  },capture);await parser.close();
  for(const gutter of [40,24]){
   const context=await browser.newContext();await context.route('**/*',r=>r.abort());
   for(const width of [1440,768,767,390]){
    const page=await context.newPage({viewport:{width,height:1000}});await page.setViewportSize({width,height:1000});
    await page.setContent(cleanPage('<div class="audit-host">'+fixture+'</div>',styles(gutter)));
    const geometry=await page.evaluate(()=>{
     const rect=id=>{const r=document.getElementById(id).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width}};
     const gap=(a,b)=>rect(b).left-rect(a).right;
     return {overflow:document.documentElement.scrollWidth-innerWidth,cardGap:gap('main-card','side-card'),cardLeft:rect('main-card').left,sideRight:rect('side-card').right,mainWidth:rect('main-card').width,formWidth:rect('form-one').width,nestedGap:gap('nested-one','nested-two'),utilityGutter:getComputedStyle(document.getElementById('utilities')).getPropertyValue('--bs-gutter-x'),stacked:rect('side-card').top>=rect('main-card').bottom};
    });assert(geometry.overflow<=1,'fixture overflow');results.push({kind:'grid',gutter,width,...geometry});
    await page.setContent(cleanPage(home,styles(gutter)));
    const actual=await page.evaluate(()=>{
     const a=document.querySelector('.us-attention').getBoundingClientRect(), b=document.querySelector('.us-staff-bulletin').getBoundingClientRect(),t=document.querySelector('#ste_container_ciTasks').getBoundingClientRect();
     return {gap:b.left-a.right,attentionLeft:a.left,bulletinRight:b.right,verticalGap:t.top-a.bottom,overflow:document.documentElement.scrollWidth-innerWidth};
    });results.push({kind:'home-capture',gutter,width,...actual});
    if(width===1440)await page.screenshot({path:path.join(__dirname,'gutter-home-'+gutter+'.png')});
    // Use the captured banner wrapper contract with native variable-based grid.
    const bannerDoc='<div id="hd" style="position:fixed;top:0;height:76px;width:100%">Header</div><main class="main" style="margin-top:120px"><div class="ContentPanel"><div>'+row('banner-row','<div class="col-sm-12">'+wrap(banner)+'</div>')+row('banner-cards',column(6,'banner-first','First card')+column(6,'banner-second','Second card'))+'</div></div><div style="height:1500px"></div></main>';
    await page.setContent(cleanPage(bannerDoc,styles(gutter)).replace('<body>','<body class="us-banner-page">'));
    const before=await page.locator('.us-banner__surface').evaluate(n=>{const r=n.getBoundingClientRect();return {left:r.left,width:r.width,inset:parseFloat(getComputedStyle(n).paddingLeft)}});
    await page.addScriptTag({content:read('Theme/UnionSuite/zUnionSuite.js')});await page.evaluate(()=>scrollTo(0,300));
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('.us-banner__surface')).position==='fixed');
    const after=await page.locator('.us-banner__surface').evaluate(n=>{const r=n.getBoundingClientRect(),s=n.closest('.us-banner').getBoundingClientRect();return {left:r.left,width:r.width,slotLeft:s.left,slotWidth:s.width,top:r.top,overflow:document.documentElement.scrollWidth-innerWidth}});
    assert(Math.abs(after.left-after.slotLeft)<1&&Math.abs(after.width-after.slotWidth)<1&&after.top===76&&after.overflow<=1,'banner pin geometry');results.push({kind:'banner',gutter,width,before,after});
    await page.close();
   }await context.close();
  }
  fs.writeFileSync(path.join(__dirname,'gutter-impact-results.json'),JSON.stringify(results,null,2));
  console.log(JSON.stringify(results.filter(r=>r.width===1440||r.width===390),null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
