// Unit tests using lightweight element doubles; not browser/integration tests.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8'),nodes=[];
function element(tag='button'){
 const n={localName:tag,children:[],parent:null,id:'',attrs:{},listeners:{},textContent:'',classList:{contains:()=>false},
 setAttribute(k,v){this.attrs[k]=v;},appendChild(n){n.parent=this;this.children.push(n);},
 remove(){if(this.parent?.children)this.parent.children=this.parent.children.filter(n=>n!==this);this.parent=null;},
 addEventListener(k,fn){this.listeners[k]=fn;},querySelectorAll(){return this.children.filter(n=>n.attrs['data-us-iqa-action']);}};
 nodes.push(n);return n;
}
const entries=new Map(),stored=new Map();
const ctx=vm.createContext({actionDefinitions:new Map(),entries,states:new Map(),
 document:{createElement:element,getElementById:id=>nodes.find(n=>n.id===id&&n.parent)},
 window:{sessionStorage:{getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)}},storageKey:()=> 'test',belongsTo:()=>true});
function load(start,end){const at=source.indexOf(start);vm.runInContext(source.slice(at,source.indexOf(end,at)),ctx);}
load('  function saveState(entry)','  function hasError(entry)');
const classes=new Set();classes.contains=classes.has;
const wrapper={classList:classes,querySelectorAll:()=>[]};
const entry={wrapper,customActions:element('div'),key:'test',state:{query:'',initialCollapsed:false,collapsed:false}};
ctx.saveState(entry);classes.add('us-filters-collapsed');assert.equal(ctx.getState(wrapper,{}).collapsed,true);
entry.state={collapsed:true};ctx.saveState(entry);classes.delete('us-filters-collapsed');assert.equal(ctx.getState(wrapper,{}).collapsed,false,'Forced state preserves normal saved preference');
entry.state={query:'',initialCollapsed:false,collapsed:true};ctx.saveState(entry);assert.equal(ctx.getState(wrapper,{}).collapsed,true);
const css=fs.readFileSync('Theme/UnionSuite/zUnionSuite.css','utf8'),guard=':not(:where(.us-report-no-styling, .us-report-no-styling *))';
assert(css.includes('[data-gridid] .RadGrid'+guard));assert(css.includes(' > .panel > .panel-heading'+guard));
assert(source.includes('wrapper.removeAttribute("data-us-iqa-native")'));
console.log('Passed: forced/saved filter state and opt-out contracts.');
// Identifier recognition and content-based minimum sizing from production code.
const columns=source.slice(source.indexOf('/* US-IQA-COLUMNS:START'));
const sizing=vm.createContext({canvas:{getContext:()=>({measureText:text=>({width:text.length*7})})},getComputedStyle:cell=>({font:'13px Arial',textTransform:cell.upper?'uppercase':'none',letterSpacing:'0',paddingLeft:'12px',paddingRight:'12px'}),Math});
vm.runInContext(columns.slice(columns.indexOf('  function isId('),columns.indexOf('  function rememberStyle(')),sizing);
vm.runInContext(columns.slice(columns.indexOf('  function minWidth('),columns.indexOf('  function apply(')),sizing);
for(const title of ['ID','Member ID','Legacy ID','Party ID','member_id','External IDs'])assert.equal(sizing.isId(title),true,title);
for(const title of ['Paid','Identity','Member name','Birthday'])assert.equal(sizing.isId(title),false,title);
assert.equal(sizing.minWidth([{textContent:'ID'},{textContent:'100002'}]),70);
assert.equal(sizing.minWidth([{textContent:'Member ID',upper:true},{textContent:'LEGACY-104020'}]),119);
console.log('Passed: ID heading recognition and longest-value minimum width including padding.');
// Exercise the actual attach/apply functions with an interleaved hidden column.
function columnNode(text,width){const n=element();Object.assign(n,{textContent:text,style:{},colSpan:1,rowSpan:1,span:1,getBoundingClientRect:()=>({width}),getAttribute:k=>n.attrs[k]??null});return n;}
const hiddenHeaders=[columnNode('Name',90),columnNode('Internal ID',0),columnNode('Member ID',50)];
const hiddenCells=[columnNode('Example',90),columnNode('Hidden',0),columnNode('LEGACY-104020',50)];
const nativeCols=hiddenHeaders.map((h,i)=>columnNode('',i===1?0:50));
hiddenHeaders[1].style.display='none';hiddenCells[1].style.display='none';nativeCols[1].style.display='none';
const testTable=columnNode('',140);Object.assign(testTable,{id:'hidden-column-table',tHead:{rows:[{cells:hiddenHeaders}]},tBodies:[{rows:[{cells:hiddenCells,matches:()=>true}]}],querySelectorAll:()=>nativeCols});
const testGrid=columnNode('',140);Object.assign(testGrid,{id:'hidden-column-grid',querySelector:()=>null,closest:()=>null});
sizing.entries=new Map();sizing.widths=new Map();sizing.document={createElement:element};
vm.runInContext(columns.slice(columns.indexOf('  function rememberStyle('),columns.indexOf('  function dispose(')),sizing);
vm.runInContext(columns.slice(columns.indexOf('  function apply('),columns.indexOf('  function refresh(')),sizing);
sizing.attach(testTable,testGrid);
const hiddenEntry=sizing.entries.get(testTable);assert(hiddenEntry,'Hidden column must not block initialization');
assert(hiddenEntry.handles[0]);assert(!hiddenEntry.handles[1]);assert(hiddenEntry.handles[2]);
assert.equal(hiddenHeaders[1].style.width,undefined);assert.equal(nativeCols[1].style.width,undefined);assert.equal(hiddenHeaders[1].style.display,'none');
assert.equal(hiddenCells[1].attrs['data-us-iqa-id-cell'],undefined);assert.equal(hiddenCells[2].attrs['data-us-iqa-id-cell'],'');
assert.equal(hiddenHeaders[2].style.width,'119px');assert.equal(nativeCols[2].style.width,'119px');assert.equal(testTable.style.width,'209px');
const hiddenTable=columnNode('',0);Object.assign(hiddenTable,{tHead:{rows:[{cells:[columnNode('ID',0)]}]}});sizing.attach(hiddenTable,testGrid);assert(!sizing.entries.has(hiddenTable));
console.log('Passed: hidden columns preserve native indexes/visibility; visible ID sizing and handles initialize; fully hidden tables defer.');
