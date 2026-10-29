const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const adapter=source.split('/* US-THEME-SAVE-BUSY:START')[1].split('/* US-THEME-SAVE-BUSY:END */')[0].replace(/^[\s\S]*?\*\//,'');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent(`<form><input type="button" id="random_DesignShell42_SaveButton" class="PrimaryButton TextButton" value="Save" onclick="SaveButtonRefresh();__doPostBack()"><input type="button" id="unrelated_SaveButton" class="TextButton" value="Other" onclick="__doPostBack()"><input type="button" id="random_DesignShell42_CloseButton" class="TextButton" value="Close" onclick="__doPostBack()"><input type="button" id="unrelated_CloseButton" class="TextButton" value="Other close" onclick="__doPostBack()"></form>`);
  await page.evaluate(()=>{
   window.shown=0;window.cleared=0;window.submitted=0;window.mode='cancel';
   document.querySelector('form').submit=()=>{window.submitted++;return 42;};
   window.SaveButtonRefresh=()=>{};
   window.__doPostBack=()=>{if(mode==='full')document.querySelector('form').submit();else if(mode==='partial')window.begin(null,{get_postBackElement:()=>document.activeElement});};
   window.UnionSuiteBusy={show(button,options){if(options.mode!=='center')throw Error('Wrong ring mode');shown++;return {button,clear(){cleared++;}};}};
   window.Sys={WebForms:{PageRequestManager:{getInstance:()=>({add_beginRequest(fn){window.begin=fn;},add_endRequest(fn){window.end=fn;}})}}};
  });
  await page.addScriptTag({content:adapter});
  const save=page.getByRole('button',{name:'Save',exact:true});
  await save.click();assert.equal(await page.evaluate(()=>shown),0,'Cancelled postback does not show loading');
  for(const mode of ['partial','full']){
   await page.evaluate(value=>window.mode=value,mode);await save.click();
   assert(await save.isDisabled());assert.equal(await save.inputValue(),'Save');
   await page.evaluate(()=>window.end());assert(await save.isEnabled());
  }
  assert.equal(await page.evaluate(()=>shown),2);assert.equal(await page.evaluate(()=>cleared),2);
  assert.equal(await page.evaluate(()=>submitted),1);
  await page.getByRole('button',{name:'Other',exact:true}).click();assert.equal(await page.evaluate(()=>shown),2);
  const close=page.getByRole('button',{name:'Close',exact:true});
  await page.evaluate(()=>window.mode='cancel');await close.click();assert.equal(await page.evaluate(()=>shown),2);
  for(const mode of ['partial','full']){
   await page.evaluate(value=>window.mode=value,mode);await close.click();
   assert(await close.isDisabled());assert.equal(await close.inputValue(),'Close');
   await page.evaluate(()=>window.end());assert(await close.isEnabled());
  }
  assert.equal(await page.evaluate(()=>shown),4);assert.equal(await page.evaluate(()=>cleared),4);
  await page.getByRole('button',{name:'Other close',exact:true}).click();assert.equal(await page.evaluate(()=>shown),4);
  await page.evaluate(()=>{
   const ok=document.createElement('input');
   ok.type='button';ok.value='OK';ok.className='PrimaryButton TextButton Ok';
   ok.setAttribute('data-ajaxupdatedcontrolid','ContentDiv');
   ok.setAttribute('onclick',"ExecuteTask();if(!RunAllValidators(undefined, true)) return false;return CancelEvent();__doPostBack('ctl00$OkButton','')");
   document.querySelector('form').append(ok);
   window.ExecuteTask=()=>window.__doPostBack();
   window.RunAllValidators=()=>window.mode!=='cancel';
   window.CancelEvent=()=>false;
  });
  const ok=page.getByRole('button',{name:'OK',exact:true});
  await page.evaluate(()=>window.mode='cancel');await ok.click();
  assert.equal(await page.evaluate(()=>shown),4,'OK cancellation/validation without a request stays idle');
  for(const mode of ['partial','full']){
   await page.evaluate(value=>window.mode=value,mode);await ok.click();
   assert(await ok.isDisabled());assert.equal(await ok.inputValue(),'OK');
   await page.evaluate(()=>window.end());assert(await ok.isEnabled());
  }
  assert.equal(await page.evaluate(()=>shown),6);assert.equal(await page.evaluate(()=>cleared),6);
  await page.evaluate(()=>{
   const purge=document.createElement('input');
   purge.type='button';purge.value='Purge System Cache';purge.className='TextButton';
   purge.id='randomPrefix_PurgeAllCacheButton';
   purge.setAttribute('onclick','WebForm_DoPostBackWithOptions(new WebForm_PostBackOptions())');
   document.querySelector('form').append(purge);
   window.WebForm_PostBackOptions=function(){};
   window.WebForm_DoPostBackWithOptions=()=>window.__doPostBack();
  });
  const purge=page.getByRole('button',{name:'Purge System Cache',exact:true});
  await page.evaluate(()=>window.mode='cancel');await purge.click();
  assert.equal(await page.evaluate(()=>shown),6,'Cancelled cache purge stays idle');
  for(const mode of ['partial','full']){
   await page.evaluate(value=>window.mode=value,mode);await purge.click();
   assert(await purge.isDisabled());assert.equal(await purge.inputValue(),'Purge System Cache');
   await page.evaluate(()=>window.end());assert(await purge.isEnabled());
  }
  assert.equal(await page.evaluate(()=>shown),8);assert.equal(await page.evaluate(()=>cleared),8);
  await page.evaluate(()=>{
   const hidden=document.createElement('input');hidden.type='submit';
   hidden.id='differentPrefix_ExecuteTaskButton';hidden.hidden=true;
   document.querySelector('form').append(hidden);
   window.ExecuteTask=()=>{
    if(mode==='partial')window.begin(null,{get_postBackElement:()=>hidden});
    if(mode==='submit')document.querySelector('form').dispatchEvent(new SubmitEvent('submit',{bubbles:true,cancelable:true,submitter:hidden}));
   };
  });
  for(const mode of ['partial','submit']){
   await page.evaluate(value=>window.mode=value,mode);await ok.click();
   await page.waitForFunction(()=>document.querySelector('input.Ok').disabled);
   assert.equal(await ok.inputValue(),'OK');
   await page.evaluate(()=>window.end());assert(await ok.isEnabled());
  }
  assert.equal(await page.evaluate(()=>shown),10);
  await page.evaluate(()=>window.begin(null,{get_postBackElement:()=>document.querySelector('[id$="_ExecuteTaskButton"]')}));
  assert.equal(await page.evaluate(()=>shown),10,'Uninitiated hidden requests must not target OK');
  console.log('Passed: hidden ExecuteTaskButton requests map to clicked OK only, including submit events.');
  console.log('Passed: cache purge partial/full requests, cancellation and cleanup with a variable ID prefix.');
  console.log('Passed: IQA Save, Close and task OK partial/full requests, cancellation, cleanup, native values and unrelated button exclusion.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
