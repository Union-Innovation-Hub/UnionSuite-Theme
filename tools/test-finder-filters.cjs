const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const css=['Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css'].map(p=>fs.readFileSync(p,'utf8')).join('\n');
const fields=['Name starts with','Product type','Product code'].map((label,i)=>`<div class="col-sm-4 pb-3 pr-0"><div><label for="field${i}">${label}</label><div>${i===1?'<select id="field1"><option>(Any)</option></select>':`<input type="text" id="field${i}">`}</div></div></div>`).join('');
const fixture=`<div class="EmptyMasterContentPanel" style="overflow:auto;height:420px"><div id="ctl00_FinderAdder1_Lister1" data-gridid="sample" style="width:100%"><div class="panel FilterPanelHorizontal"><div><div><div id="generated_ctl02"><div id="sample_Sheet0"><div class="row pr-3">${fields}</div><input type="button" class="TextButton" value="Find"></div></div></div></div></div></div></div>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  await page.setContent(fixture);await page.addStyleTag({content:css});
  for(const width of [1652,600,390]){
   await page.setViewportSize({width,height:600});await page.locator('#field0').focus();
   const result=await page.evaluate(()=>{
    const panel=document.querySelector('.EmptyMasterContentPanel'),r=panel.getBoundingClientRect();
    return {overflow:panel.scrollWidth-panel.clientWidth,fields:[...document.querySelectorAll('input[type=text],select')].map(el=>{
     const f=el.getBoundingClientRect(),l=document.querySelector('label[for="'+el.id+'"]').getBoundingClientRect();
     return {left:f.left-r.left,right:r.right-f.right,labelGap:f.top-l.bottom};
    })};
   });
   assert(result.overflow<=1,`No horizontal overflow at ${width}`);
   for(const field of result.fields){assert(field.left>=4);assert(field.right>=4);assert(field.labelGap>=6);}
  }
  await page.screenshot({path:'.tmp-iqa-integration/finder-filters.png'});
  console.log('Passed: FinderAdder controls and focus clearance stay inside the popup at 1652px, 600px and 390px.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
