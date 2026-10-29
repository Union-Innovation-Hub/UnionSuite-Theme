// Adapter contract tests with element doubles; browser rendering is checked separately.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const listeners = {}, frames = [], observers = [];
function node(name='div') {
  return {name, children:[], attrs:{}, events:{}, isConnected:true, textContent:'', open:false,
    classList:{contains(){return false;}},
    setAttribute(k,v){this.attrs[k]=v;}, getAttribute(k){return this.attrs[k] ?? null;}, removeAttribute(k){delete this.attrs[k];},
    append(...items){items.forEach(item=>{item.parent=this;this.children.push(item);});},
    prepend(item){item.parent=this;this.children.unshift(item);}, replaceChildren(){this.children=[];},
    contains(item){return item===this || this.children.some(child=>child.contains(item));},
    remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.isConnected=false;},
    addEventListener(k,fn){this.events[k]=fn;}, removeEventListener(k){delete this.events[k];},
    closest(){return null;}, focus(){this.focused=true;},
    getBoundingClientRect(){return {left:0,right:100};}, matches(){return false;}
  };
}
const strip=node(), level=node(), list=node();
strip.classList.contains=name=>name==='RadTabStripVertical';
strip.append(level);level.append(list);
strip.querySelector=()=>level;level.querySelector=()=>list;
Object.assign(level,{scrollLeft:0,clientWidth:200,scrollWidth:600});
level.getBoundingClientRect=()=>({left:0,right:200});
function tab(label,selected=false){const t=node('a');t.textContent=label;t.selected=selected;t.unavailable=false;t.clickCount=0;
 t.classList.contains=()=>t.selected;t.matches=()=>t.unavailable;t.click=()=>{t.clickCount++;};
 t.getBoundingClientRect=()=>({left:360,right:450});return t;}
let first=tab('Overview',true), later=tab('Security');list.append(first,later);
list.querySelectorAll=()=>list.children;
let strips=[strip];
const media={matches:true};
const document={body:node('body'),documentElement:node('html'),readyState:'complete',createElement:node,querySelectorAll:()=>strips,
 addEventListener(k,fn){listeners[k]=fn;}};
class Observer {constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
const context=vm.createContext({document,window:{matchMedia:()=>media,addEventListener(){},ResizeObserver:Observer},
 ResizeObserver:Observer,MutationObserver:Observer,requestAnimationFrame:fn=>frames.push(fn)});
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-NATIVE-TABS:START */')[1].split('/* US-NATIVE-TABS:END */')[0];
vm.runInContext(source,context);
const api=context.window.UnionSuiteTabs;
listeners.pointerdown({target:{closest:()=>strip}});
assert.equal(document.documentElement.getAttribute('data-us-tabs-pointer'),'');
listeners.keydown({key:'Shift'});
assert.equal(document.documentElement.getAttribute('data-us-tabs-pointer'),'');
listeners.keydown({key:'Tab'});
assert.equal(document.documentElement.getAttribute('data-us-tabs-pointer'),null,'Keyboard navigation restores focus outlines');
listeners.pointerdown({target:{closest:()=>strip}});
listeners.pointerdown({target:{closest:()=>null}});
assert.equal(document.documentElement.getAttribute('data-us-tabs-pointer'),null);
const picker=strip.children[0],summary=picker.children[0],options=picker.children[1];
assert.equal(strip.children.length,2);
api.refresh(); assert.equal(strip.children.length,2,'refresh must not duplicate the picker');
// Simulate a native handler cancelling selection. The adapter may only invoke it.
picker.open=true; options.children[1].events.click();
assert.equal(later.clickCount,1);assert.equal(first.selected,true);assert.equal(later.selected,false);
assert.equal(picker.open,false);assert.equal(later.focused,true);
// Native completion updates selection; refresh follows it and reveals the tab.
first.selected=false;later.selected=true;api.refresh();
assert.equal(options.children[1].getAttribute('aria-current'),'true');assert.ok(level.scrollLeft>0);
later.unavailable=true;api.refresh();assert.equal(options.children[1].disabled,true);
options.children[1].events.click();assert.equal(later.clickCount,1,'disabled native tabs must not be invoked');
picker.open=true;picker.events.keydown({key:'Escape',preventDefault(){}});assert.equal(picker.open,false);assert.equal(summary.focused,true);
// Simulate an ASP.NET replacement inside a surviving tablist.
const replacement=tab('Updated section',true);list.children=[replacement];api.refresh();
assert.equal(options.children.length,1);assert.equal(options.children[0].textContent,'Updated section');
options.children[0].events.click();assert.equal(replacement.clickCount,1);
// Simulate replacement of the entire native control: old hooks must be removed.
strip.isConnected=false;strips=[];api.refresh();
assert.equal(picker.isConnected,false);assert.equal(level.events.scroll,undefined);assert.ok(observers.some(o=>o.disconnected));
assert.equal(level.getAttribute('data-more-left'),null);
console.log('Native tabs: native cancellation, completion, disabled state, picker focus, replacement and cleanup passed.');
