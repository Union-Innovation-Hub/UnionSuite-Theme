const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('../.tmp-iqa-integration/node_modules/playwright');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const adapter=source.split('/* US-NATIVE-SAVE-BUSY:START')[1].split('/* US-NATIVE-SAVE-BUSY:END */')[0].replace(/^[\s\S]*?\*\//,'');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  await page.setContent(`<input type="button" value="Save" class="TextButton SaveAndClose PrimaryButton" data-ajaxupdatedcontrolid="ContentDiv" onclick="if(this.disabled)return false;if(!window.valid)return false;this.disabled=true;window.requests++"><input type="button" value="Unrelated" class="TextButton" onclick="this.disabled=true">`);
  await page.evaluate(()=>{
   window.valid=false;window.requests=0;window.shown=0;window.cleared=0;
   window.UnionSuiteBusy={show(button,options){if(options.mode!=='center')throw Error('Expected centred spinner');shown++;return {button,clear(){cleared++;}};}};
   window.Sys={WebForms:{PageRequestManager:{getInstance:()=>({add_endRequest(fn){window.end=fn;}})}}};
  });
  await page.addScriptTag({content:adapter});
  const save=page.getByRole('button',{name:'Save',exact:true});
  await save.click();assert.equal(await page.evaluate(()=>shown),0);assert(await save.isEnabled());
  await page.evaluate(()=>window.valid=true);await save.click();
  await page.waitForFunction(()=>shown===1);assert.equal(await page.evaluate(()=>requests),1);assert.equal(await save.inputValue(),'Save');
  await page.evaluate(()=>window.end());assert.equal(await page.evaluate(()=>cleared),1);assert(await save.isDisabled(),'Adapter does not override native disabled state');
  await save.evaluate(el=>el.disabled=false);await save.click();await page.waitForFunction(()=>shown===2);
  await save.evaluate(el=>el.disabled=false);await page.waitForFunction(()=>cleared===2);
  await save.click();await page.waitForFunction(()=>shown===3);await save.evaluate(el=>el.remove());await page.waitForFunction(()=>cleared===3);
  await page.getByRole('button',{name:'Unrelated'}).click();assert.equal(await page.evaluate(()=>shown),3);
  console.log('Passed: validation rejection, native disable, centred spinner, completion/error cleanup, re-enable/removal and unrelated-button exclusion.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
