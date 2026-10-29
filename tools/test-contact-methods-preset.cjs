// us-contact-methods preset: expands to its marker and action class, renders the Add contact method header button and opens its popup.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
const panel=(id,classes)=>`<div class="ContentItemContainer" id="part-${id}"><div class="${classes}" id="owner-${id}"><div class="panel"><div class="panel-heading"><h2 class="panel-title">Email addresses and phones</h2></div><div class="panel-body-container"><div class="panel-body"><div id="${id}_ContentPanel"><div id="${id}_ListerPanel"><div data-gridid="${id}_ResultsGrid"><div class="RadGrid" id="${id}_ResultsGrid"><table class="rgMasterTable"><tbody><tr><td>Email</td><td>sarah@example.org</td></tr></tbody></table></div><input type="image" id="${id}_ResultsGrid_RefreshButton" data-ajaxupdatedcontrolid="${id}_ResultsGrid"></div></div></div></div></div></div></div></div>`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const html='<form>'+panel('methods','us-tab-panel us-tabset-profile us-tab-contact us-contact-methods')+panel('plain','us-report')+'</form>';
  await page.route('https://theme.test/**',route=>route.fulfill({contentType:'text/html',body:html}));
  await page.goto('https://theme.test/Party.aspx?ID=103885');
  await page.evaluate(()=>{window.nativeCalls=[];window.ShowDialog_NoReturnValue=(...args)=>nativeCalls.push(args);});
  await page.addStyleTag({content:read('Theme/UnionSuite/zUnionSuite.css')});
  await page.addScriptTag({content:read('Theme/UnionSuite/zUnionSuite.js')});
  await page.addScriptTag({content:read('Theme/UnionSuite/Scripts/ActionDefinitions.js')});

  const owner=page.locator('#owner-methods');
  await page.waitForFunction(()=>document.querySelectorAll('[data-us-command-key="member.add-contact-method"]').length===1);
  const classes=(await owner.getAttribute('class')).split(/\s+/);
  for(const name of ['us-tab-panel','us-tabset-profile','us-tab-contact','us-contact-methods','ContactDetailsIQA','us-action-member-add-contact-method']) assert(classes.includes(name),'missing '+name);
  assert.equal(await page.locator('#owner-plain.ContactDetailsIQA').count(),0,'preset stays on its own iPart');

  const button=owner.locator(':scope > .panel > .panel-heading [data-us-command-key="member.add-contact-method"]');
  assert.equal(await button.count(),1,'button sits in this panel heading');
  assert.equal((await button.textContent()).trim(),'Add contact method');
  await button.click();
  await page.waitForFunction(()=>nativeCalls.length===1);
  const url=new URL(await page.evaluate(()=>nativeCalls[0][0]));
  assert.equal(url.pathname,'/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Add-Contact-Method.aspx');
  assert.equal(url.searchParams.get('ID'),'103885');

  // Expansion is idempotent: a second reconcile adds nothing.
  const before=await owner.getAttribute('class');
  await page.evaluate(()=>UnionSuiteIqaFilters.refresh());
  assert.equal(await owner.getAttribute('class'),before);
  assert.deepEqual(errors,[]);
  console.log('PASS us-contact-methods preset: marker and action classes, header button, popup URL and idempotent expansion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
