// Regression: Read more -> Show less at the top -> scroll must condense.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('Theme/UnionSuite/zUnionSuite.js','utf8');
const closeBody=source.split('descriptionClosed: function (surface) {')[1].split('    // Read-only diagnostics')[0].replace(/},\s*$/,'');
const decision=source.slice(source.indexOf('    var compact = state.compact;'),source.indexOf('\n\n    if (pin) {',source.indexOf('    var compact = state.compact;')));
const disclosure={},otherInput={},attributes={};let onBlur,scheduled=0,expanded=true;
const document={activeElement:disclosure,documentElement:{scrollTop:0,scrollHeight:2400}};
const title={getAttribute:key=>attributes[key]??null,setAttribute:(key,value)=>attributes[key]=value,removeAttribute:key=>delete attributes[key],focus:options=>{assert.equal(options.preventScroll,true);document.activeElement=title;},addEventListener:(name,fn)=>onBlur=fn};
const surface={querySelector:selector=>selector==='.us-banner__title'?title:expanded?disclosure:null};
const entry={surface,wrapper:{classList:{contains:()=>true}},folds:[{contains:node=>node===disclosure||node===otherInput}],compact:false,expandedHeight:450};
const context={entry,state:entry,document,window:{scrollY:0,innerHeight:800},collapseAt:60,expandAt:16,pin:true,y:0,schedule:()=>scheduled++};
const close=vm.runInNewContext('(function(surface){'+closeBody+'})',context);
function compact(){return vm.runInNewContext('(function(){'+decision+';return compact;})()',context);}
assert.equal(compact(),false); // Open description.
expanded=false;close(surface);assert.equal(document.activeElement,title);assert.equal(entry.collapseRequested,false);assert.equal(compact(),false);
context.y=context.window.scrollY=400;assert.equal(compact(),true); // The reported regression.
onBlur();assert.equal(attributes.tabindex,undefined);
document.activeElement=disclosure;expanded=true;assert.equal(compact(),false);
expanded=false;close(surface);assert.equal(entry.collapseRequested,true);assert.equal(compact(),true);
entry.collapseRequested=false;document.activeElement=otherInput;assert.equal(compact(),false); // Preserve unrelated focus safeguard.
assert.equal(scheduled,2);
console.log('PASS: close at top then scroll, close while scrolled, open-description hold, focus restoration and unrelated focused-input safeguard.');
