// Isolated event/lifecycle tests; browser preview separately checks native CSS.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const code=source.slice(source.indexOf('/* US-UTILITY-NAV:START'),source.indexOf('/* US-UTILITY-NAV:END'));
const clicks=[],windowEvents={},timers=new Map(),frames=new Map(),shown=new Set(),dialogs=[];
const begin=new Set(),end=new Set(),loads=new Set();
let token=0,observer,shows=0;
const manager={add_beginRequest:f=>begin.add(f),remove_beginRequest:f=>begin.delete(f),add_endRequest:f=>end.add(f),remove_endRequest:f=>end.delete(f)};
const win={Sys:{WebForms:{PageRequestManager:{getInstance:()=>manager}},Application:{add_load:f=>loads.add(f),remove_load:f=>loads.delete(f)}},
  UnionSuiteBusy:{show(button){shows++;shown.add(button);const previous=button.busy;button.busy='true';return {clear(){shown.delete(button);button.busy=previous;}};}},
  addEventListener(name,fn){(windowEvents[name]||=[]).push(fn);}};
const ctx=vm.createContext({window:win,document:{body:{},querySelectorAll:()=>dialogs,addEventListener(name,fn){if(name==='click')clicks.push(fn);}},
  getComputedStyle:()=>({visibility:'visible'}),setTimeout(fn,delay){const id=++token;timers.set(id,{fn,delay});return id;},clearTimeout:id=>timers.delete(id),
  requestAnimationFrame(fn){const id=++token;frames.set(id,fn);return id;},cancelAnimationFrame:id=>frames.delete(id),
  MutationObserver:class{constructor(fn){observer=fn;}observe(){}disconnect(){}}});
vm.runInContext(code,ctx);vm.runInContext(code,ctx);
assert.equal(clicks.length,1,'Duplicate includes do not register another listener');
const accountA={},accountB={};
function link(kind,account=accountA){return {kind,account,isConnected:true,visible:true,on:false,disabled:false,target:'',busy:null,
  classList:{contains(name){return name==='on'&&this.owner.on;}},
  matches(s){return s.includes('.navbar-right')?!!kind:s==='.obo-toggle'?kind==='obo':s==='.nav-aux-cart > a'?kind==='cart':false;},
  closest(s){if(s==='.account-menu')return account;if(s.includes('aria-disabled'))return this.disabled?{}:null;return this.matches(s)?this:null;},
  getClientRects(){return this.visible?[{}]:[];},hasAttribute(){return false;}};}
function make(kind,account){const x=link(kind,account);x.classList.owner=x;return x;}
function click(button,extra={}){const e={target:button,button:0,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};clicks[0](e);return e;}
function tick(delay){for(const [id,t] of [...timers])if(t.delay===delay){timers.delete(id);t.fn();}}
function paint(){for(const [id,fn] of [...frames]){frames.delete(id);fn();}}
function request(source){begin.forEach(fn=>fn(manager,{get_postBackElement:()=>source}));}
function finish(){end.forEach(fn=>fn(manager,{}));}
const edit=make('edit'),cart=make('cart'),obo=make('obo');
click(edit);assert(shown.has(edit));assert(click(edit).stopped,'Duplicate click is suppressed before native handling');assert.equal(shows,1);
request(edit);tick(10000);assert(shown.has(edit),'Accepted slow request is not cleared by navigation fallback');finish();assert(!shown.size);assert.equal(edit.busy,null);
click(cart,{ctrlKey:true});click(cart,{button:1});cart.target='_blank';click(cart);cart.target='';cart.disabled=true;click(cart);cart.disabled=false;assert(!shown.size,'Modified/new-tab/unavailable controls are skipped');
const cancelled=click(cart);cancelled.preventDefault();tick(0);assert(!shown.size,'Cancelled cart click clears');
click(cart);windowEvents.pageshow.forEach(fn=>fn());assert(!shown.size,'Back/forward restoration clears');
click(edit);tick(10000);assert(!shown.size,'Cancelled postback recovers without an end event');
click(edit);edit.on=true;observer();paint();assert(!shown.size,'Native state change clears');
click(edit);edit.isConnected=false;observer();paint();assert(!shown.size,'Partial replacement clears removed control');edit.isConnected=true;
const existingDialog={getClientRects:()=>[{}]};dialogs.push(existingDialog);click(obo);paint();assert(shown.has(obo),'Already open unrelated dialog does not clear OBO');
dialogs.push({getClientRects:()=>[{}]});observer();paint();assert(!shown.size,'New visible picker completes opening feedback');dialogs.length=0;
click(obo);request({closest:selector=>selector==='.account-menu'?accountA:null});tick(10000);assert(shown.has(obo),'Delegated OBO clear request remains busy');finish();assert(!shown.size);
click(obo);request({closest:selector=>selector==='.account-menu'?accountB:null});finish();assert(shown.has(obo),'Another account menu cannot end this pending action');tick(10000);assert(!shown.size);
edit.busy='false';click(edit);windowEvents.pagehide.forEach(fn=>fn());assert.equal(edit.busy,'false','Previous busy attribute is restored');
loads.forEach(fn=>fn());assert.equal(begin.size,1);assert.equal(end.size,1);
console.log('Passed utility navigation: duplicate includes/clicks, modified clicks, cancellation, native request ownership, slow requests, errors/completion, picker handoff, state changes, partial replacement and restoration.');
