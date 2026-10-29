const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const theme=fs.readFileSync('Theme/UnionSuite/zUnionSuite.css','utf8');
const foundation=(fs.readFileSync('Theme/UnionSuite-Guides/usage/vendor/10-UltraWaveResponsive.css','utf8')+'\n'+fs.readFileSync('Theme/UnionSuite/99-Orion.css','utf8')).replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'');
const organisation=fs.readFileSync('prototypes/legacy/Data-Panel-Native-organisation.html','utf8');
const script=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-DATA-PANELS:START')[1].split('/* US-DATA-PANELS:END */')[0].replace(/^[\s\S]*?\*\//,'');
const panel=`<div class="panel"><div class="panel-heading Distinguish"><h2 class="panel-title">Membership details</h2><div class="panel-heading-options"><button type="button" class="sysicon-edit" title="Edit information">Edit</button></div></div><div class="panel-body-container"><div class="panel-body"><div class="RadAjaxPanel"><div class="PanelEditorReadOnlyForm"><div class="ReadOnly PanelField Top"><div><span class="Label">Member type</span></div><br><div class="PanelFieldValue"><span>Sample member</span></div></div></div></div></div></div></div>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();await page.route('**/*',route=>route.abort());
  const multiple=panel.replace('class="PanelEditorReadOnlyForm"','id="fixture_multipleInstancePanel"');
  await page.setContent(`<div class="ContentItemContainer" id="direct">${panel}</div><div class="ContentItemContainer"><div class="example-author-class" id="wrapped">${panel}</div></div><div class="ContentItemContainer"><div class="" id="empty-wrapper">${panel}</div></div><div class="ContentItemContainer" id="multi">${multiple}</div><div class="ContentItemContainer" id="outer"><div class="panel"><div class="panel-body-container"><div class="panel-body"><div class="ContentItemContainer" id="nested">${panel}</div></div></div></div></div><div class="ContentItemContainer us-report-no-styling" id="opt-out">${panel}</div><section id="unrelated">${panel}</section>${organisation}`);
  await page.addStyleTag({content:foundation+'\n'+theme});await page.addScriptTag({content:script});
  for(const id of ['direct','wrapped','empty-wrapper','nested']){
   assert.equal(await page.locator('#'+id).getAttribute('data-us-panel'),'single');
   assert.equal(await page.locator('#'+id+' .sysicon-edit').getAttribute('data-us-panel-action'),'edit');
   assert.equal(await page.locator('#'+id+' > .panel > .panel-body-container > .panel-body').evaluate(node=>getComputedStyle(node).padding),'12px 18px 6px');
  }
  assert.equal(await page.locator('#outer').getAttribute('data-us-panel'),null,'Nested panel must not promote its outer owner');
  assert.equal(await page.locator('#multi').getAttribute('data-us-panel'),'multiple');
  assert.equal(await page.locator('#multi > .panel > .panel-body-container > .panel-body').evaluate(node=>getComputedStyle(node).padding),'0px','Multi-instance grids stay flush');
  const org=page.locator('#ste_container_OrganisationDetails > .panel');
  const edges=await org.evaluate(node=>({field:node.querySelector('.PanelField').getBoundingClientRect().left-node.getBoundingClientRect().left,title:node.querySelector('.panel-title').getBoundingClientRect().left-node.getBoundingClientRect().left}));
  assert.equal(Math.round(edges.field),19,'Captured three-column fields have an 18px inset inside the border');
  assert.equal(Math.round(edges.title),Math.round(edges.field),'Field and title left edges align');
  const style=await page.locator('#wrapped > .panel').evaluate(node=>({border:getComputedStyle(node).borderTopWidth,radius:getComputedStyle(node).borderTopLeftRadius}));
  assert.equal(style.border,'1px');assert.equal(style.radius,'12px');
  assert.equal(await page.locator('#opt-out [data-us-panel],#unrelated [data-us-panel]').count(),0);
  assert.equal(await page.locator('#opt-out').getAttribute('data-us-panel'),null);
  await page.evaluate(()=>{const wrapper=document.querySelector('#wrapped');wrapper.removeAttribute('data-us-panel');wrapper.innerHTML=wrapper.innerHTML;});
  await page.waitForFunction(()=>document.querySelector('#wrapped').dataset.usPanel==='single');
  assert.equal(await page.locator('#wrapped .panel-body').evaluate(node=>getComputedStyle(node).padding),'12px 18px 6px');
  await page.locator('#wrapped').screenshot({path:'.tmp-iqa-integration/data-panel-wrapper.png'});
  await page.setViewportSize({width:390,height:844});
  for(const id of ['direct','wrapped','empty-wrapper','nested','ste_container_OrganisationDetails'])assert.equal(await page.locator('#'+id+' > .panel > .panel-body-container > .panel-body').evaluate(node=>getComputedStyle(node).padding),'8px 14px');
  assert.equal(await page.locator('#multi .panel-body').evaluate(node=>getComputedStyle(node).padding),'0px');
  console.log('Passed: direct/classed/empty/nested ownership, desktop/mobile body insets, captured three-column alignment, flush multi-instance grid, native edit action, opt-out and partial replacement.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
