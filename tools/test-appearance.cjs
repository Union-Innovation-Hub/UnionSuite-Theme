// Document preference tests; no browser launch or live iMIS calls.
const assert=require('node:assert/strict'),vm=require('node:vm');
const {appearanceScript}=require('../Theme/UnionSuite-Guides/usage/build/build-taskbar-dark-mode.cjs');
const code=appearanceScript();
class CustomEvent extends Event { constructor(type,options={}) {super(type);this.detail=options.detail;} }
function fixture({saved=null,dark=false,enabled=true,blocked=false,parent=null,key}={}) {
  const values=new Map(saved===null?[]:[[key||'union-suite:appearance:v1',saved]]);
  const store={getItem:k=>{if(blocked)throw Error('denied');return values.get(k)||null;},setItem:(k,v)=>{if(blocked)throw Error('denied');values.set(k,v);},removeItem:k=>{if(blocked)throw Error('denied');values.delete(k);}};
  const attrs=new Map();
  const document=Object.assign(new EventTarget(),{readyState:'loading',documentElement:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)}});
  const media=Object.assign(new EventTarget(),{matches:dark});
  const window=Object.assign(new EventTarget(),{document,matchMedia:()=>media,localStorage:store,location:{origin:'https://example.test'},frames:[],getComputedStyle:()=>({getPropertyValue:()=>enabled?'1':''})});
  window.top=parent?parent.window.top:window;window.parent=parent?parent.window:window;
  if(parent)parent.window.frames.push(window);
  if(key)window.UnionSuiteAppearanceConfig={storageKey:key};
  const context=vm.createContext({window,document,CustomEvent});
  const run=()=>vm.runInContext(code,context);
  run();
  return {window,document,values,attrs,media,run,store,
    api:window.UnionSuiteAppearance,
    system(value){media.matches=value;media.dispatchEvent(new Event('change'));},
    event(type,properties={}){window.dispatchEvent(Object.assign(new Event(type),properties));},
    enable(value){enabled=value;window.UnionSuiteAppearance.refresh();}};
}
const first=fixture({dark:true});
assert.equal(first.attrs.get('data-us-color-scheme'),'dark');
assert.equal(first.values.size,0,'Device default is not persisted');
first.api.toggle();
assert.equal(first.attrs.get('data-us-color-scheme'),'light');
assert.equal(first.values.get('union-suite:appearance:v1'),'light');
first.system(false);first.system(true);
assert.equal(first.api.getState().scheme,'light','Explicit choice wins over device changes');
assert.equal(fixture({saved:'light',dark:true}).api.getState().scheme,'light','Choice survives a new document');
first.api.reset();assert.equal(first.values.size,0);assert.equal(first.api.getState().scheme,'dark');
first.system(false);assert.equal(first.api.getState().scheme,'light');
first.api.setPreference('invalid');assert.equal(first.api.getState().preference,null);
assert.equal(fixture({saved:'invalid',dark:true}).api.getState().scheme,'dark');
first.values.set('union-suite:appearance:v1','dark');
first.event('storage',{key:'irrelevant',storageArea:first.store});assert.equal(first.api.getState().scheme,'light');
first.event('storage',{key:'union-suite:appearance:v1',storageArea:{}});assert.equal(first.api.getState().scheme,'light');
first.event('storage',{key:'union-suite:appearance:v1',storageArea:first.store});assert.equal(first.api.getState().scheme,'dark');
first.values.clear();first.event('storage',{key:null,storageArea:first.store});assert.equal(first.api.getState().scheme,'light');
const noCss=fixture({enabled:false,saved:'dark'});
assert.equal(noCss.api.getState().enabled,false);assert.equal(noCss.attrs.has('data-us-color-scheme'),false);
noCss.enable(true);assert.equal(noCss.attrs.get('data-us-color-scheme'),'dark');
noCss.enable(false);assert.equal(noCss.attrs.has('data-us-color-scheme'),false);
const denied=fixture({blocked:true});denied.api.toggle();
assert.equal(denied.api.getState().scheme,'dark');assert.equal(denied.api.getState().storageAvailable,false);
const child=fixture({blocked:true,parent:denied});
assert.equal(child.api.getState().scheme,'dark','New frames inherit page-only preferences');
const grandchild=fixture({blocked:true,parent:child});
child.api.toggle();
assert.equal(denied.api.getState().scheme,'light');assert.equal(grandchild.api.getState().scheme,'light');
const preview=fixture({parent:denied,key:'preview'});denied.api.toggle();
assert.equal(preview.api.getState().scheme,'light','Preview preference namespaces stay isolated');
denied.window.frames.push(new Proxy({},{get(){throw Error('Cross origin');}}));
assert.doesNotThrow(()=>denied.api.reset());
let changes=0;first.window.addEventListener('unionsuite:appearancechange',()=>changes++);
const original=first.api;first.run();assert.equal(first.window.UnionSuiteAppearance,original);
changes=0;first.system(true);assert.equal(changes,1,'Duplicate includes do not duplicate event handlers');
console.log('Passed appearance: device/default/override/reset, persistence, invalid storage, storage isolation, unavailable CSS/storage, nested frame sync, cross-origin isolation and duplicate includes.');
