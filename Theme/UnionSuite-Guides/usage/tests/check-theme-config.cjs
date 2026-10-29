// Dependency-free source/packaging checks; browser checks live in test-theme-config.cjs.
const {guidePath}=require('../build/guide-output.cjs');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..');
const html=fs.readFileSync(guidePath('Theme-Config.html'),'utf8');
const decode=value=>value.replace(/&(amp|lt|gt|quot);/g,(_,key)=>({amp:'&',lt:'<',gt:'>',quot:'"'}[key]));
const data=JSON.parse(html.match(/<script type="application\/json" id="config-data">([\s\S]*?)<\/script>/)[1]);
assert.equal(new Set(data.tokens.map(token=>token.name)).size,data.tokens.length,'Unique token names');
assert.equal(data.tokens.filter(token=>token.name.startsWith('--seed-')).length,5);
const frames=[...html.matchAll(/<iframe\b[^>]*\bsrcdoc="([^"]*)"[^>]*>/g)].map(match=>decode(match[1]));
assert.equal(frames.length,5,'Five curated previews');
const themeJs=fs.readFileSync(path.join(root,'Theme/UnionSuite/zUnionSuite.js'),'utf8').replace(/\r\n/g,'\n');
let scriptCount=0;
for(const [index,document] of [html,...frames].entries()) {
  assert(!/\{\{[A-Z_]+\}\}/.test(document),'No unresolved build placeholders in document '+index);
  for(const match of document.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if(/application\/json/.test(match[1]))continue;
    new vm.Script(match[2],{filename:'config-document-'+index+'.js'});scriptCount++;
  }
  assert(!/<(?:script|link|img)\b[^>]*\s(?:src|href)="(?!data:)[^"]+"/i.test(document),'No external script/style/image dependencies in document '+index);
}
for(const [index,frame] of frames.entries()) {
  assert(frame.includes('<meta name="us-config-preview" content="component">'),'Component preview marker in frame '+index);
  assert(!frame.includes('id="seed-grid"'),'No embedded config editor in frame '+index);
  assert(frame.includes('window.addEventListener(\'auxclick\',previewLink)'),'Navigation guard installed in frame '+index);
  // CCO uses the shared native-tabs block; other frames use the complete runtime.
  if(index!==2)assert(frame.replace(/\r\n/g,'\n').includes(themeJs),'Canonical theme JS is unchanged in frame '+index);
  // Runtime script targets such as new URL('/path', location.origin) load no asset.
  assert(!/(?<!new +)\burl\(\s*["']?(?!data:)[/.]/i.test(frame),'No relative/absolute native CSS asset references in frame '+index);
}
assert(frames[1].includes('URL.createObjectURL('),'Dummy IQA CSV export remains intact');
const editor=fs.readFileSync(path.join(root,'Theme/UnionSuite-Guides/usage/source/theme-config.js'),'utf8');
assert(!/\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest)\b/.test(editor),'Editor has no persistence/network calls');
const names=new Set(data.tokens.map(token=>token.name));
for(const token of data.tokens){assert(data.scopes[token.scope],'Known scope for '+token.name);for(const ref of token.value.matchAll(/var\((--[\w-]+)/g))assert(names.has(ref[1]),'Known default dependency '+ref[1]);}
// The editor validates every token on each edit, so a token whose declared type
// cannot accept its own default would reject unrelated brand colour edits.
const defaults=new Map(data.tokens.map(token=>[token.name,token.value]));
const resolveDefault=name=>defaults.get(name).replace(/var[(] *(--[A-Za-z0-9_-]+)[^()]*[)]/g,(_,key)=>resolveDefault(key));
const shape=value=>/^-?[0-9]+$/.test(value)?'integer'
  :/^-?[0-9]*[.][0-9]+$/.test(value)?'number'
  :/^-?[0-9]*[.]?[0-9]+(?:px|rem|em|ch|vh|vw|%)$/.test(value)?'length'
  :/^-?[0-9]*[.]?[0-9]+m?s$/.test(value)?'time':'other';
// Functional values such as clamp() or color-mix() are unrecognised, not wrong.
const accepts={integer:['integer'],number:['integer','number'],weight:['integer'],lineHeight:['integer','number'],length:['length','integer'],time:['time'],colour:[],shadow:[],font:[],easing:[]};
for(const token of data.tokens) {
  assert(accepts[token.type],'Known editor type for '+token.name);
  const resolved=resolveDefault(token.name);
  assert(shape(resolved)==='other'||accepts[token.type].includes(shape(resolved)),'Default '+resolved+' suits the declared '+token.type+' type of '+token.name);
}
// Exercise fixture navigation independently of a desktop/browser provider.
const navigation=fs.readFileSync(path.join(root,'Theme/UnionSuite-Guides/usage/source/config-preview.js'),'utf8');
const previewWindow=new EventTarget();let scrolled=0;
vm.runInNewContext(navigation,{window:previewWindow,document:{getElementById:id=>id==='sample-note'?{scrollIntoView(){scrolled++;}}:null}});
function linkEvent(href,{type='click',download=false,handled=false,ctrlKey=false}={}) {
  const link={closest(){return this;},getAttribute(){return href;},hasAttribute:name=>name==='download'&&download};
  const event=new Event(type,{cancelable:true});Object.defineProperty(event,'target',{value:link});Object.defineProperty(event,'ctrlKey',{value:ctrlKey});
  if(handled)event.preventDefault();previewWindow.dispatchEvent(event);return event;
}
assert(linkEvent('#sample-note').defaultPrevented,'Fragment does not navigate to containing config file');assert.equal(scrolled,1,'Fragment scrolls locally');
assert(linkEvent('#missing').defaultPrevented,'Missing target still cannot reload parent page in frame');
assert(linkEvent('#sample-note',{ctrlKey:true}).defaultPrevented,'Modified click cannot open another editor');assert.equal(scrolled,1);
assert(linkEvent('#sample-note',{type:'auxclick'}).defaultPrevented,'Middle click stays within fixture');
assert(linkEvent('mailto:jamie.morgan@example.org').defaultPrevented,'Unconnected external example stays local');
assert(linkEvent('#sample-note',{handled:true}).defaultPrevented);assert.equal(scrolled,1,'Handled component events are left alone');
assert(!linkEvent('blob:sample-csv',{download:true}).defaultPrevented,'CSV blob download remains available');
const submit=new Event('submit',{cancelable:true});previewWindow.dispatchEvent(submit);assert(submit.defaultPrevented,'Unconnected form cannot submit the editor into the frame');
console.log(data.tokens.length+' unique tokens, five previews, '+scriptCount+' valid scripts, unchanged shared runtime, intact CSV export and offline packaging passed.');
console.log('Preview navigation regression checks passed: local fragments, missing targets, modified/middle clicks, handled commands, CSV downloads and form submissions.');
