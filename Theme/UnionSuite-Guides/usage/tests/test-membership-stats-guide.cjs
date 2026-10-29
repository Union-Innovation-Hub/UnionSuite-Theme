const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('../../../../.tmp-iqa-integration/node_modules/playwright');
const {guidePath}=require('../build/guide-output.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1050}});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.route('**/*',route=>route.abort());
  await page.setContent(fs.readFileSync(guidePath('Usage-Guide.html'),'utf8'),{waitUntil:'domcontentloaded',timeout:60000});
  await page.locator('#membership-stats').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
  const frame=page.frameLocator('#membership-stats-demo');
  await page.waitForFunction(()=>document.querySelector('#membership-stats-demo').contentDocument.querySelector('[data-us-membership="summary"]').dataset.usMembershipState==='ready');
  assert.equal(await frame.locator('.us-membership__metric > strong').first().innerText(),'83,084');
  assert.equal(await frame.getByText('Membership history coming soon').count(),1);
  assert.equal(await page.locator('[data-copy-text="us-membership"]').count(),1);
  await page.locator('[data-copy-text="us-membership"]').click();
  assert.match(await page.locator('#copy-status').innerText(),/Copied|Text selected/);
  assert.equal(await page.locator('[data-copy^="code-stats-"]').count(),6);
  const details=page.locator('details').filter({has:page.locator('#code-stats-summary')});
  await details.locator('summary').click();
  const code=await page.locator('#code-stats-summary').innerText();
  assert(code.includes('$/_i4u_/SandBox/CRM Layouts/Home_Page/Stats'));assert(!code.includes('ContentItemContainer'));assert(!code.includes('<script'));
  const download=page.waitForEvent('download');await page.locator('[data-download="code-stats-summary"]').click();
  assert.equal((await download).suggestedFilename(),'Tracker-Bar-Content.html');
  await page.locator('#membership-stats').evaluate(n=>n.scrollIntoView({block:'start',behavior:'instant'}));
  await page.screenshot({path:'.preview/membership-stats-guide.png'});
  const standalone=await browser.newPage({viewport:{width:1440,height:1300}});
  await standalone.route('**/*',route=>route.abort());
  await standalone.setContent(fs.readFileSync('references/Membership-Stats.html','utf8'),{waitUntil:'domcontentloaded'});
  await standalone.waitForFunction(()=>document.querySelectorAll('[data-us-membership-state="ready"]').length===4);
  await standalone.screenshot({path:'.preview/membership-stats-standalone.png',fullPage:true});
  console.log('PASS offline guide: live example, copyable classes, six inner templates, HTML download and standalone preview.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
