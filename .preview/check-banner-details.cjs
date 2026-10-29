const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Element {
  constructor(tag='SPAN') { this.tagName=tag.toUpperCase();this.attrs={};this.children=[];this.parentNode=null;this.text='';this.hidden=false;this.events={};this.id='';this.className='';this.classList={contains:value=>this.className.split(' ').includes(value)}; }
  get textContent(){ return this.text + this.children.map(c=>c.textContent).join(''); }
  set textContent(value){this.text=value;this.children=[];}
  setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]??null;} hasAttribute(k){return k in this.attrs;} removeAttribute(k){delete this.attrs[k];}
  appendChild(c){c.parentNode=this;this.children.push(c);return c;} insertBefore(c,b){c.parentNode=this;this.children.splice(this.children.indexOf(b),0,c);}
  remove(){this.parentNode.children=this.parentNode.children.filter(n=>n!==this);this.parentNode=null;}
  contains(n){return this===n||this.children.some(c=>c.contains(n));} closest(){return null;}
  querySelectorAll(s){const key=s.slice(1,-1);return this.children.flatMap(c=>[...(c.hasAttribute(key)?[c]:[]),...c.querySelectorAll(s)]);}
  querySelector(s){return this.querySelectorAll(s)[0]||null;} addEventListener(type,fn){this.events[type]=fn;}
}
const root=new Element('p');root.setAttribute('data-us-description-limit','300');const full=root.appendChild(new Element());full.setAttribute('data-us-description-full','');full.textContent='An example case description with enough content to exercise the limit. '.repeat(12);
const list=new Element('dl');const fact=list.appendChild(new Element('div'));fact.className='us-banner__fact';const value=fact.appendChild(new Element('dd'));value.textContent='   ';
let starts=0;const document={readyState:'loading',body:new Element('body'),addEventListener(){starts++;},createElement:t=>new Element(t),querySelectorAll:s=>s.includes('description')?[root]:[list],getElementById:id=>[root,full,...root.children].find(n=>n.id===id)||null};
const context={document,window:{},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>fn()};
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8').split('/* US-BANNER-DETAILS:START */')[1].split('/* US-BANNER-DETAILS:END */')[0];vm.runInNewContext(source,context);const api=context.window.UnionSuiteBannerDetails;api.refresh();
const button=root.children.find(n=>n.tagName==='BUTTON'), short=root.children[0];assert.equal(button.textContent,'Read more');assert.equal(full.hidden,true);assert(Array.from(short.textContent).length<=300);assert(short.textContent.endsWith('…'));assert.equal(button.getAttribute('aria-controls'),full.id);assert(fact.hidden&&list.hidden);
button.events.click();assert.equal(full.hidden,false);assert.equal(short.hidden,true);assert.equal(button.textContent,'Show less');api.refresh();assert.equal(full.hidden,false);button.events.click();assert.equal(full.hidden,true);
value.textContent='0';api.refresh();assert(!fact.hidden&&!list.hidden);fact.hidden=true;api.refresh();assert(fact.hidden);fact.hidden=false;
full.textContent='Short description';api.refresh();assert(button.hidden);assert(!full.hidden);
const replacement=new Element();replacement.setAttribute('data-us-description-full','');replacement.textContent='Long replacement '.repeat(60);full.remove();root.appendChild(replacement);api.refresh();assert.equal(root.children.filter(n=>n.tagName==='BUTTON').length,1);assert(replacement.hidden);
assert.equal(api.excerpt('😀'.repeat(301),300),'😀'.repeat(299)+'…');assert.equal(api.excerpt('x'.repeat(300),300).length,300);
vm.runInNewContext(source,context);assert.equal(starts,1);assert.equal(root.children.filter(n=>n.tagName==='BUTTON').length,1);
console.log('PASS: excerpt boundary and Unicode, expand/collapse, preserved state, short text, replaced content, blank/zero values, authored hidden values, duplicate inclusion.');
