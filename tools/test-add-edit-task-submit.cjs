// Runs submit-button.js as formrenderV20 does: new Function("data", script)(answer).
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const script = fs.readFileSync(path.join(__dirname, '../prototypes/wip/add-edit-task-form/submit-button.js'), 'utf8');
function run(answer, {frame = 'rad', delay = 1200} = {}) {
  const button = {disabled: false, attrs: {}, setAttribute(n, v) { this.attrs[n] = v; }};
  let closed = 0, timer = null;
  const win = {close() { closed++; }};
  global.window = frame === 'rad' ? {frameElement: {radWindow: win}} : frame === 'own' ? {radWindow: win} : frame === 'cross' ? {get frameElement() { throw new Error('SecurityError'); }} : {frameElement: null};
  global.document = {getElementById: id => id === 'AddEditTask' ? button : null};
  global.setTimeout = (fn, ms) => { timer = {fn, ms}; };
  new Function('data', script)(answer);
  if (timer) { assert.equal(timer.ms, delay); timer.fn(); }
  return {disabled: button.disabled, aria: button.attrs['aria-disabled'], closed, scheduled: !!timer};
}
const added = {'class-html-Message': "<div class='AsiSuccess AsiSuccessIcon'>Task Added Successfully</div>"};
const updated = {'class-html-Message': "<div class='AsiSuccess AsiSuccessIcon'>Task Updated Successfully</div>"};
const missing = {'class-html-Message': '<div class="AsiError AsiErrorIcon">Required fields are empty :<br>- Task</div>'};
assert.deepEqual(run(added), {disabled: true, aria: 'true', closed: 1, scheduled: true});
assert.deepEqual(run(updated), {disabled: true, aria: 'true', closed: 1, scheduled: true});
assert.deepEqual(run(JSON.stringify(added)), {disabled: true, aria: 'true', closed: 1, scheduled: true}, 'string answer');
assert.deepEqual(run(JSON.stringify(JSON.stringify(added))), {disabled: true, aria: 'true', closed: 1, scheduled: true}, 'double-encoded answer');
assert.deepEqual(run(added, {frame: 'own'}).closed, 1, 'window.radWindow');
assert.deepEqual(run(added, {frame: 'none'}), {disabled: true, aria: 'true', closed: 0, scheduled: true}, 'outside a popup: stays');
assert.deepEqual(run(added, {frame: 'cross'}).closed, 0, 'cross-site frame: stays, no error');
for (const answer of [missing, {}, null, undefined, '', 'not json', 42])
  assert.deepEqual(run(answer), {disabled: false, aria: undefined, closed: 0, scheduled: false}, 'no success: ' + JSON.stringify(answer));
console.log('Add Edit Task submit script: 15 cases pass.');
