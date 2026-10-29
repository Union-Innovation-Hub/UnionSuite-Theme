const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const read=p=>fs.readFileSync(p,'utf8');
const script=read('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js');
const clientConfig=read('Theme/UnionSuite-Client/Config.js');
// Use the supplied native header hierarchy, without running copied site handlers.
const header=read('C:/Users/James/.codex/attachments/b5b0a160-c0ae-4956-85b7-f6d9ff1afe92/pasted-text.txt')
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'')
  .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*')/gi,'');
const css=['Theme/UnionSuite/guides/usage/vendor/10-UltraWaveResponsive.css','Theme/UnionSuite/99-Orion.css','Theme/UnionSuite/zUnionSuite.css','Theme/UnionSuite-Client/Branding.css','Theme/UnionSuite-Client/Override.css','Theme/UnionSuite/zzDarkMode.css'].map(read).join('\n').replace(/@import\s+[^;]+;/g,'').replace(/@font-face\s*\{[^}]*\}/g,'').replace('/images/Hub/UHUB_Logo.png','data:image/svg+xml,'+encodeURIComponent(read('Theme/UnionSuite/guides/usage/source/utility-nav-logo.svg')));
const fixture='<!doctype html><html><head><style>'+css+'\nbody{margin:0}main{padding:32px}</style></head><body><div class="wrapper SVG-enabled">'+header+'<main>Header placement check</main></div><input type="hidden" id="__ClientContext"></body></html>';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:560},reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.request().url()==='https://pip-header.example/'?r.fulfill({contentType:'text/html',body:fixture}):r.abort());
  await page.goto('https://pip-header.example/');
  await page.evaluate(()=>{document.getElementById('injected-taskbar').remove();document.getElementById('__ClientContext').value=JSON.stringify({loggedInPartyId:'100',isAnonymous:false});localStorage.clear();});
  await page.addScriptTag({content:clientConfig});
  await page.addScriptTag({content:script});
  const button=page.locator('.us-taskbar__pip-button');
  await button.waitFor({state:'visible'});await button.focus();
  async function aligned(label){
   await page.waitForTimeout(120);
   const geometry=await page.evaluate(()=>{
    const h=document.querySelector('header#hd'),b=document.querySelector('.us-taskbar__pip-button'),slot=document.querySelector('.us-taskbar__pip'),nav=document.querySelector('.us-taskbar__quick-links');
    return {headerBottom:h.getBoundingClientRect().bottom-parseFloat(getComputedStyle(h).borderBottomWidth),pipBottom:b.getBoundingClientRect().bottom,pipRight:b.getBoundingClientRect().right,navLeft:nav.getBoundingClientRect().left,navVisible:!!nav.getClientRects().length,first:slot===slot.parentElement.firstElementChild,dividers:document.querySelectorAll('.us-taskbar__pip-divider').length};
   });
   assert(Math.abs(geometry.pipBottom-geometry.headerBottom)<.6,label+JSON.stringify(geometry));
   if(geometry.navVisible)assert(geometry.pipRight<=geometry.navLeft,label+' must be left of nav icons');
   assert(geometry.first);assert.equal(geometry.dividers,0);
   console.log('PASS:',label,geometry);
  }
  await aligned('pasted native header');
  await page.locator('#hd').screenshot({path:'.preview/pip-captured-header.png'});
  await page.addStyleTag({content:'#hd .logo{height:104px!important}#hd{padding-bottom:19px;border-bottom:3px solid #007ea3}'});
  await aligned('taller logo, padding and border');
  await page.setViewportSize({width:1024,height:560});await aligned('resized header');
  await page.evaluate(()=>document.documentElement.dataset.usColorScheme='dark');
  await page.locator('#hd').screenshot({path:'.preview/pip-captured-header-dark.png'});
  await page.setViewportSize({width:390,height:650});await aligned('mobile header');
  await page.evaluate(()=>document.getElementById('injected-taskbar').remove());
  await page.locator('.us-taskbar__pip').waitFor();
  assert.equal(await page.locator('.us-taskbar__pip').count(),1);
  await page.evaluate(()=>window.UnionSuiteTaskbar.destroy());
  await page.addStyleTag({content:'#hd{padding-bottom:35px}'});
  await page.waitForTimeout(120);
  assert.equal(await page.locator('.us-taskbar__pip').count(),0);
  // A fresh page using the actual editable Config.js set to false mounts no slot.
  await page.goto('https://pip-header.example/');
  await page.evaluate(()=>{document.getElementById('injected-taskbar').remove();document.getElementById('__ClientContext').value=JSON.stringify({loggedInPartyId:'100',isAnonymous:false});});
  await page.addScriptTag({content:clientConfig.replace('pipGreeting: true','pipGreeting: false')});
  await page.addScriptTag({content:script});
  assert.equal(await page.locator('.us-taskbar__pip').count(),0);
  assert.equal(await page.locator('#injected-taskbar > :first-child').getAttribute('class'),'us-taskbar__quick-links');
  assert.deepEqual(errors,[]);
  console.log('PASS: replacement, resize-observer cleanup and client Config.js on/off');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
