const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const script = fs.readFileSync('Theme/UnionSuite/Scripts/UnionSuiteTaskbar.js','utf8');
const history = script.split('// US-TASKBAR-HISTORY:START')[1].split('// US-TASKBAR-HISTORY:END')[0];
let now = 0;
const storage = new Map();
function setup(user, fail = false) {
  const context = {ctx:{loggedInPartyId:user},settings:{minimumSearchLength:3,historyStoragePrefix:'test:'},Date:{now:()=>now},localStorage:{getItem:k=>{if(fail)throw Error();return storage.get(k)||null},setItem:(k,v)=>{if(fail)throw Error();storage.set(k,v)}}};
  vm.createContext(context); vm.runInContext(history, context);
  return {run:s=>vm.runInContext(s,context),list:()=>JSON.parse(vm.runInContext('JSON.stringify(searchHistory)',context))};
}
const t=setup('alice');
t.run("rememberSearch('morgn')");now=1000;t.run("editHistoryTerm('morgan')");now=4000;t.run("rememberSearch('morgan')");assert.deepEqual(t.list(),['morgan']);
t.run("editHistoryTerm('');editHistoryTerm('alex');rememberSearch('alex')");assert.deepEqual(t.list(),['alex','morgan']);
now=7001;t.run("editHistoryTerm('alexander');rememberSearch('alexander')");assert.deepEqual(t.list(),['alexander','alex','morgan']);
t.run("confirmHistorySearch('alexander');rememberSearch('alexander');editHistoryTerm('alexanders');rememberSearch('alexanders')");assert.deepEqual(t.list(),['alexanders','alexander','alex','morgan']);
t.run("resetHistoryWindow();rememberSearch('MORGAN')");assert.equal(t.list().filter(x=>x.toLowerCase()==='morgan').length,1);
t.run("for(let i=0;i<10;i++){resetHistoryWindow();rememberSearch('term'+i)}");assert.equal(t.list().length,5);
assert.deepEqual(setup('alice').list(),t.list());assert.deepEqual(setup('bob').list(),[]);
const fallback=setup('alice',true);fallback.run("rememberSearch('test')");assert.deepEqual(fallback.list(),['test']);
assert.equal(fallback.run('historyPersistent'),false);
new vm.Script(script);
assert(script.indexOf('if (disposed || version !== searchVersion || term !== activeQuery) return;') < script.indexOf('rememberSearch(term);'));
assert(!script.includes('lookupRequest'));
console.log('Passed: correction timing, latency, clear reset, confirmation, deduplication, five-item cap, persistence, user isolation and storage fallback.');
