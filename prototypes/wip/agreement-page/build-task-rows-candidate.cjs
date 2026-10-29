// Regenerates theme-candidate-task-rows.js from the theme's US-TASK-ROWS block.
// Run from the project root: node prototypes/wip/agreement-page/build-task-rows-candidate.cjs
// Adds only three things to the theme block: defineSaver, the save() lookup
// that uses it, and the celebrate export. Use --check to confirm it is current.
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../../..');
const themeFile = path.join(root, 'Theme/UnionSuite/zUnionSuite.js');
const outputFile = path.join(__dirname, 'theme-candidate-task-rows.js');

const source = fs.readFileSync(themeFile, 'utf8').replace(/\r\n/g, '\n');
const startMarker = '/* US-TASK-ROWS:START';
const endMarker = '/* US-TASK-ROWS:END */';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker);
if (start < 0 || end < 0) throw new Error('US-TASK-ROWS markers not found in zUnionSuite.js.');

let block = source.slice(start, end + endMarker.length);

function swap(from, to) {
  if (!block.includes(from)) throw new Error('Theme block changed; update the generator near: ' + from.slice(0, 70));
  block = block.replace(from, to);
}

swap(
  '/* US-TASK-ROWS:START — local checkbox/animation only; persistence is not connected. */',
  `/* US-TASK-ROWS:START — task checkbox, completion effect and save.
   Candidate 1.1 (agreement page): generated from the theme block by
   prototypes/wip/agreement-page/build-task-rows-candidate.cjs with only
   defineSaver, the save() lookup and the celebrate export added. Load it
   before zUnionSuite.js; the theme copy then steps aside. */`
);

swap(
  `  async function save(root, done) {
    const id=identity(root);`,
  `  // Candidate: a task row names another save target with
  // data-us-task-save="<key>". Each key is registered once with defineSaver;
  // rows without the attribute keep the i4u_UT_Interactions write below.
  const savers=new Map();
  function defineSaver(key, run) {
    if(typeof key!=='string'||!/^[a-z][a-z0-9.-]*$/.test(key))throw new TypeError('Task saver keys use lowercase letters, digits, dots and dashes.');
    if(typeof run!=='function')throw new TypeError('A task saver needs a function.');
    if(savers.has(key))throw new Error('Task saver '+key+' is already registered.');
    savers.set(key,run);
  }
  async function save(root, done) {
    const saverKey=(root.getAttribute('data-us-task-save')||'').trim();
    if(saverKey) {
      const saver=savers.get(saverKey);
      if(!saver) throw new Error('No task saver is registered for '+saverKey+'.');
      return saver({root, done});
    }
    const id=identity(root);`
);

swap(
  '  window.UnionSuiteTaskRows={refresh:schedule};',
  `  // Candidate: the completion effect for other controls, such as a milestone
  // status. Resolves when the effect ends; does nothing under reduced motion.
  // Colours come from the --task-confetti-* properties on the element.
  function celebrateElement(element) {
    if(!(element instanceof Element)||reducedMotion.matches||typeof element.animate!=='function')return Promise.resolve();
    const animations=[],particles=[];
    const duration=celebrate(element,animations,particles);
    return new Promise(resolve=>setTimeout(()=>{particles.forEach(node=>node.remove());resolve();},duration));
  }
  window.UnionSuiteTaskRows={refresh:schedule,defineSaver,celebrate:celebrateElement,version:'1.1-candidate'};`
);

const output = block + '\n';

if (process.argv.includes('--check')) {
  const current = fs.existsSync(outputFile) ? fs.readFileSync(outputFile, 'utf8').replace(/\r\n/g, '\n') : '';
  if (current !== output) {
    console.error('theme-candidate-task-rows.js is out of date. Run the generator.');
    process.exit(1);
  }
  console.log('theme-candidate-task-rows.js is current.');
} else {
  fs.writeFileSync(outputFile, output);
  console.log('Wrote ' + path.relative(root, outputFile));
}
