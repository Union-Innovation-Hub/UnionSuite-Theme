// Standard definitions: retain the six legacy contracts and verify native add and create-case routes.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Theme/UnionSuite/Scripts/ActionDefinitions.js','utf8'),defs=new Map();
const window={UnionSuiteActions:{define(key,value){assert.equal(value.owner,'UnionSuite');assert.equal(value.source,'ActionDefinitions.js:'+key);defs.set(key,value);}}};
const context=vm.createContext({window,URL,location:{origin:'https://theme.test'}});
(async()=>{
 vm.runInContext(source,context);
 // Fifteen standard definitions, plus the agreement page set (3 October 2026).
 const registered=[...defs.keys()];
 assert.equal(registered.filter(key=>!key.startsWith('agreements.')).length,15);
 assert.equal(registered.filter(key=>key.startsWith('agreements.')).length,28);
 const names=['EmailMemberPopupFn','SMSMemberPopupFn','AddNotePopupFn','CreateQuickCasePopupFn','ResolveDuplicatePopupFn','AssignWorkbenchToStaffFn'];
 const keys=['member.email','member.sms','member.add-note','member.create-quick-case','member.resolve-duplicate','member.assign-workbench'];
 for(let i=0;i<keys.length;i++){
  const def=defs.get(keys[i]);assert.equal(def.action.requires[0],names[i]);assert.equal(def.context.partyId.parameter,'ID');
  let calls=0;const result=Promise.resolve(i);window[names[i]]=function(...args){assert.equal(this,window);assert.deepEqual(args,[]);calls++;return result;};
  assert.equal(def.action.run(),result);assert.equal(calls,1);
 }
 const createCase=defs.get('member.create-case');assert.equal(createCase.className,'us-action-member-create-case');assert.equal(createCase.presentation.label,'Create case');
 assert.equal(createCase.action.type,'navigate');assert.equal(createCase.action.requires,undefined);assert.equal(createCase.action.target,undefined);assert.equal(createCase.context.partyId.parameter,'ID');
 let url=new URL(createCase.action.href({context:{partyId:'00123'}}));assert.equal(url.pathname,'/_i4u_/Core/Cases/Create-Case-Staff.aspx');assert.equal(url.search,'?ID=00123');
 const job=defs.get('member.add-job');assert.equal(job.action.requires,undefined);
 url=new URL(job.action.href({context:{partyId:'00123'}}));assert.equal(url.pathname,'/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Jobs/Select-Workplace.aspx');assert.equal(url.searchParams.get('ID'),'00123');
 const address=defs.get('member.add-address');url=new URL(address.action.href({context:{partyId:'00123'}}));assert.equal(url.searchParams.get('ID'),'00123');assert.equal(url.searchParams.get('CloseWindowOnCommit'),'true');
 const method=defs.get('member.add-contact-method');assert.equal(method.className,'us-action-member-add-contact-method');assert.equal(method.action.type,'popup');
 url=new URL(method.action.href({context:{partyId:'00123'}}));assert.equal(url.pathname,'/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Add-Contact-Method.aspx');assert.equal(url.searchParams.get('ID'),'00123');
 const calls=[];const refresh={originReport:async()=>calls.push('origin'),iqa:async(selector,options)=>calls.push([selector,options.scope,options.match])};
 await job.action.refresh.run({origin:{report:{}},refresh});await address.action.refresh.run({origin:{report:null},refresh});
 await method.action.refresh.run({origin:{report:{}},refresh});await method.action.refresh.run({origin:{report:null},refresh});
 assert.deepEqual(calls,['origin',['.AddressIQA','page','one'],'origin',['.ContactDetailsIQA','page','one']]);
 console.log('PASS fifteen definitions, six retained legacy call/promise contracts, selected-member IDs, Create Case page, Select-Workplace job route, address and contact-method popups and origin/explicit refresh.');
})().catch(e=>{console.error(e);process.exitCode=1;});
