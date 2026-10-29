const fs=require('node:fs'),assert=require('node:assert/strict'),example=require('../Theme/UnionSuite-Guides/usage/build/embedded-cco-example.cjs');
const {guidePath}=require('../Theme/UnionSuite-Guides/usage/build/guide-output.cjs');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1280,height:1000}});
  await page.route('**/*',route=>route.abort());
  await page.setContent(example.documentHtml());
  for(const width of [1280,390]){
   await page.setViewportSize({width,height:1000});
   for(const vertical of [false,true]){
    await page.locator('#orientation-toggle').setChecked(vertical);
    for(const kind of ['panel','empty','direct']){
     await page.locator('.iMIS-WebPart').evaluate((n,html)=>n.outerHTML=html,example.fixture('embedded-example',kind,vertical));
     const cco=page.locator('#embedded-example-cco'),strip=cco.locator(':scope > .RadTabStrip,:scope > .RadTabStripVertical'),body=cco.locator(':scope > .RadMultiPage');
     assert.equal(await strip.isVisible(),false,kind+' outer tabs hidden');
     assert(await cco.locator('.nested-panel > .panel-heading').isVisible(),'nested header retained');
     assert(await cco.locator('.nested-cco > .RadTabStrip').isVisible(),'nested tabs retained');
     assert(await cco.locator('.embedded-page-heading').isVisible(),'content heading retained');
     assert.deepEqual(await body.evaluate(n=>{const s=getComputedStyle(n);return [s.paddingTop,s.paddingLeft,s.borderTopWidth,s.backgroundColor]}),['0px','0px','0px','rgba(0, 0, 0, 0)']);
     assert(await body.evaluate(n=>Math.abs(n.getBoundingClientRect().left-n.parentElement.getBoundingClientRect().left)<1),'no empty vertical rail');
     if(kind==='panel'||kind==='empty')assert.equal(await page.locator('.outer-panel > .panel-heading').isVisible(),false);
     await page.locator('#embedded-example').evaluate(n=>n.classList.add('us-report-no-styling'));
     assert(await strip.isVisible(),'opt-out restores tabs');
     await page.locator('#embedded-example').evaluate(n=>n.classList.remove('us-report-no-styling','EmbeddedCCO'));
     assert(await strip.isVisible(),'class removal restores tabs');
     if(kind==='panel'||kind==='empty')assert(await page.locator('.outer-panel > .panel-heading').isVisible(),'class removal restores panel heading');
    }
   }
  }
  // Check the user-facing controls in the generated offline guide.
  await page.setViewportSize({width:1440,height:1050});
  await page.setContent(fs.readFileSync(guidePath('Usage-Guide.html'),'utf8'),{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#embedded-cco').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
  const frame=page.frameLocator('#embedded-cco-demo'),outer=frame.locator('#embedded-example-cco > .RadTabStrip');
  assert.equal(await outer.isVisible(),false);
  await frame.locator('#embedded-toggle').uncheck();assert(await outer.isVisible());
  await frame.locator('#embedded-toggle').check();assert.equal(await outer.isVisible(),false);
  assert.equal(await page.locator('#embedded-cco-class').innerText(),'EmbeddedCCO');
  await page.screenshot({path:'.preview/embedded-cco-guide.png'});
  console.log('PASS EmbeddedCCO: horizontal/vertical, desktop/mobile, direct/wrapped/empty, nested content, opt-out, replacement and guide controls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
