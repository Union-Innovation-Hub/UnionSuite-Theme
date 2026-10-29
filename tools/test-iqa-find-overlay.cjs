// Isolated lifecycle/geometry tests, using element doubles rather than a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
function node(){return {attrs:new Map(),style:{},children:[],hidden:false,isConnected:true,textContent:'',append(...items){this.children.push(...items);items.forEach(n=>n.parentElement=this);},remove(){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);},getAttribute(k){return this.attrs.has(k)?this.attrs.get(k):null;},setAttribute(k,v){this.attrs.set(k,v);},removeAttribute(k){this.attrs.delete(k);},hasAttribute(k){return this.attrs.has(k);}};}
const body=node(),progress=node(),target=node(),table=node(),owner=node(),grid=node();
target.setAttribute('aria-busy','false');target.parentElement=table;table.parentElement=body;
let rect={left:10,top:100,right:210,bottom:220};target.getBoundingClientRect=()=>rect;
table.getBoundingClientRect=()=>({left:20,top:110,right:200,bottom:190});
owner.closest=()=>null;owner.querySelector=()=>progress;grid.querySelectorAll=()=>[target];
const button={closest:selector=>selector.includes('no-styling')?null:selector.includes('ContentPanel')?owner:grid};
let frame,cancelled=false;
const context=vm.createContext({document:{body,createElement:node},getComputedStyle:()=>({overflowX:'auto',overflowY:'auto'}),innerWidth:500,innerHeight:500,requestAnimationFrame:fn=>{frame=fn;return 1;},cancelAnimationFrame:()=>cancelled=true});
// visibleBox/setBox and showResults precede the row-control helpers in US-IQA-BUSY.
const start=source.indexOf(' // The part of an element left visible');vm.runInContext(source.slice(start,source.indexOf(' // Row expand/collapse (3.3)',start)),context);
const handle=context.showResults(button),overlay=body.children[0];
assert.equal(overlay.style.left,'20px');assert.equal(overlay.style.top,'110px');assert.equal(overlay.style.width,'180px');assert.equal(overlay.style.height,'80px');
assert.equal(target.getAttribute('aria-busy'),'true');assert(progress.hasAttribute('data-us-iqa-progress-replaced'));
rect={left:0,top:0,right:0,bottom:0};frame();assert(overlay.hidden);assert(!progress.hasAttribute('data-us-iqa-progress-replaced'),'Native fallback restored when body is not visible');
handle.clear();assert(cancelled);assert.equal(target.getAttribute('aria-busy'),'false');assert.equal(body.children.length,0);handle.clear();
assert.equal(context.showResults({closest:()=>null}),null,'Missing table owner retains native fallback');
console.log('Passed: results-only clipped overlay, native-message suppression/fallback, aria-busy restoration and idempotent cleanup.');
// Exercise the actual request router: clicks alone never start an overlay.
let click,begin,end,overlays=0,rings=0,clears=0,timer;
const manager={add_beginRequest(fn){begin=fn;},add_endRequest(fn){end=fn;}};
const routing=vm.createContext({window:{Sys:{WebForms:{PageRequestManager:{getInstance:()=>manager}}},addEventListener(){}},document:{addEventListener(name,fn){if(name==='click')click=fn;}},setTimeout(fn){timer=fn;},UnionSuiteBusy:{show(){rings++;return {clear(){clears++;}};}}});
const block=source.slice(source.indexOf('/* US-IQA-BUSY:START'),source.indexOf('/* US-IQA-BUSY:END'));
vm.runInContext(block.replace(/ function showResults\(button\)\{[\s\S]*?(?= \/\/ Row expand\/collapse)/,' function showResults(){return testOverlay();}\n'),Object.assign(routing,{testOverlay(){overlays++;return {clear(){clears++;}};}}));
const gridA={},gridB={};
function control(kind,grid=gridA,optOut=false){return {id:'example_ResultsGrid_control',matches(s){return (s.includes('th.rgHeader')&&kind==='sort')||(s.includes('TextButton')&&kind==='find');},closest(s){if(s.includes('no-styling'))return optOut?{}:null;if(s==='[data-gridid]')return grid;if(s.includes('th.rgHeader'))return kind==='sort'?this:null;return {};}};}
const sort=control('sort'),find=control('find'),other=control('other');
function request(source){begin(null,{get_postBackElement:()=>source});}
request(sort);assert.equal(overlays,1);assert.equal(rings,0);end();assert.equal(clears,1);
request(find);assert.equal(overlays,2);assert.equal(rings,1);end();assert.equal(clears,3);
click({target:sort});assert.equal(overlays,2);request(other);assert.equal(overlays,3);end();
click({target:sort});request(control('other',gridB));assert.equal(overlays,3);
click({target:sort});timer();request(other);assert.equal(overlays,3,'Expired/cancelled sort click is ignored');
request(control('sort',gridA,true));request(other);assert.equal(overlays,3,'Opt-out and unrelated requests are ignored');
console.log('Passed: Find/sort routing, same-grid Telerik source, cancelled clicks, unrelated requests, opt-out and completion cleanup.');
